/*
 * AI Translate for Telegram — Web A, web.telegram.org/a/.
 *
 * Web A talks to Telegram from a worker, and every call it makes crosses one
 * line, src/api/gramjs/worker/connector.ts: worker.postMessage({ payloads:
 * [{ type: "callMethod", name, args, messageId }] }), batched once a tick.
 * The message the chat shows is built inside that worker too, so a call held
 * here holds everything: nothing is drawn and nothing is sent until the
 * translation is in, and the untranslated text never reaches the worker.
 * Other tabs reach the worker through the tab that runs it, over a
 * BroadcastChannel, so their messages cross the same line.
 *
 * The worker's answers, read on their way back, are where the text of a
 * message comes from when its menu is opened, and the conversation above it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Said } from "../ai-translate/core/host";
import type { Shown, TelegramClient } from "./client";
import type { Entity, Kind } from "./formatted";
import { asWritten, Held, planFor, translateOutgoing } from "./outgoing";
import { page } from "./page";

// --- entities, as Web A writes them (src/api/types/messages.ts)

const KINDS: Record<string, Kind> = {
    MessageEntityBold: "bold",
    MessageEntityItalic: "italic",
    MessageEntityStrike: "strike",
    MessageEntitySpoiler: "spoiler",
    MessageEntityUnderline: "underline",
    MessageEntityCode: "code",
    MessageEntityPre: "pre",
    MessageEntityTextUrl: "link",
    MessageEntityMentionName: "mention",
    MessageEntityCustomEmoji: "emoji",
    MessageEntityBlockquote: "quote"
};
const TYPES = Object.fromEntries(Object.entries(KINDS).map(([type, kind]) => [kind, type])) as Record<Kind, string>;

export function fromA(entity: any): Entity | undefined {
    const kind = KINDS[entity?.type];
    if (!kind) return undefined;

    const { type, offset, length, url, userId, documentId, language, ...extra } = entity;
    return {
        kind, offset, length,
        ...(url ? { url } : {}), ...(userId ? { userId: String(userId) } : {}),
        ...(documentId ? { documentId: String(documentId) } : {}), ...(language ? { language } : {}),
        ...(Object.keys(extra).length ? { extra } : {})
    };
}

export function toA(entity: Entity): any {
    return {
        ...entity.extra,
        type: TYPES[entity.kind],
        offset: entity.offset,
        length: entity.length,
        ...(entity.kind === "link" ? { url: entity.url } : {}),
        ...(entity.kind === "mention" ? { userId: entity.userId } : {}),
        ...(entity.kind === "emoji" ? { documentId: entity.documentId } : {}),
        ...(entity.kind === "pre" && entity.language ? { language: entity.language } : {})
    };
}

const entitiesOf = (list: unknown) => (Array.isArray(list) ? list : []).map(fromA).filter((e): e is Entity => !!e);

// --- what the worker is asked

/** The calls that carry a message someone typed. */
const CARRIES_TEXT = new Set(["sendMessage", "sendMessageLocal", "editMessage"]);

/** Calls that make or change messages wait behind one being translated, so messages keep their order. */
const ORDERED = /^(send|forward|edit)/;
const UNORDERED = new Set(["sendMessageAction"]);

interface Found {
    chatId: string;
    text: string;
    entities: Entity[];
    edit: boolean;
}

/** The text a call carries, when it is one somebody typed. */
export function typedIn(payload: any): Found | undefined {
    if (payload?.type !== "callMethod" || !CARRIES_TEXT.has(payload.name)) return undefined;

    const params = payload.args?.[0];
    if (!params || typeof params.text !== "string" || !params.text || params.richMessage) return undefined;

    // The chat bar's own sends say whether there was a draft; a bot's button, a
    // bot command from a menu and an invite link are sent without that.
    const edit = payload.name === "editMessage";
    if (!edit && !("wasDrafted" in params)) return undefined;

    const chatId = params.chat?.id;
    if (chatId === undefined) return undefined;

    return { chatId: String(chatId), text: params.text, entities: entitiesOf(params.entities), edit };
}

/** The call again, carrying the translation. */
function carrying(payload: any, text: string, entities: Entity[]) {
    const [params, ...rest] = payload.args;
    return {
        ...payload,
        args: [{ ...params, text, entities: entities.length ? entities.map(toA) : undefined }, ...rest]
    };
}

type Restore = (chatId: string, text: string, entities: Entity[]) => void;

/**
 * Wraps one worker's postMessage. Every call goes through untouched unless it
 * carries typed text in a chat that is switched on; that one waits for its
 * translation, and every message call after it waits behind it.
 */
export function watchWorker(worker: Worker, restore: Restore, onAnswer?: (data: any) => void) {
    const send = worker.postMessage.bind(worker);
    let tail: Promise<unknown> = Promise.resolve();
    let queued = 0;

    /** The app's own promise for a call that is never sent, settled as if the worker had nothing to say. */
    const answerNothing = (messageId: string) => {
        const Event: typeof MessageEvent = page.MessageEvent ?? MessageEvent;
        worker.dispatchEvent(new Event("message", {
            data: { payloads: [{ type: "methodResponse", messageId, response: undefined }] }
        }));
    };

    const later = (payload: any, ready: Promise<any>) => {
        queued++;
        tail = tail
            .then(() => ready)
            .then(final => {
                if (final) send({ payloads: [final] });
                else answerNothing(payload.messageId);
            })
            .catch(e => {
                console.error("[AI Translate]", e);
                answerNothing(payload.messageId);
            })
            .finally(() => queued--);
    };

    const translated = async (payload: any, found: Found) => {
        try {
            const result = await translateOutgoing(found.chatId, found.text, found.entities);
            return result ? carrying(payload, result.text, result.entities) : payload;
        } catch (e) {
            if (!(e instanceof Held)) {
                // A bug of ours is not a reason to swallow somebody's message.
                console.error("[AI Translate]", e);
                return payload;
            }

            // An edit that did not go leaves the message as it was; a new one goes back into the box.
            if (!found.edit && payload.name === "sendMessage") restore(found.chatId, found.text, found.entities);
            return undefined;
        }
    };

    /** AI Learn's: at once, as written, with the writer's own markers off. */
    const learned = (payload: any, found: Found) => {
        const out = asWritten(found.chatId, found.text, found.entities);
        return out ? carrying(payload, out.text, out.entities) : payload;
    };

    worker.postMessage = function (message: any, ...rest: any[]) {
        const payloads = message?.payloads;
        if (!Array.isArray(payloads)) return send(message, ...(rest as [any]));

        const now: any[] = [];
        for (const payload of payloads) {
            const found = typedIn(payload);
            const plan = found ? planFor(found.chatId, found.text, found.entities) : "typed";
            if (plan === "translate") {
                later(payload, translated(payload, found!));
                continue;
            }

            const going = plan === "learn" ? learned(payload, found!) : payload;
            if (queued && ORDERED.test(going?.name ?? "") && !UNORDERED.has(going.name)) later(going, Promise.resolve(going));
            else now.push(going);
        }

        if (now.length === payloads.length && now.every((payload, at) => payload === payloads[at])) return send(message, ...(rest as [any]));
        if (now.length) send({ ...message, payloads: now }, ...(rest as [any]));
    };

    if (onAnswer) worker.addEventListener("message", event => {
        try {
            onAnswer(event.data);
        } catch (e) {
            console.error("[AI Translate]", e);
        }
    });
}

// --- what the worker answers: messages and names

interface Kept {
    id: number;
    senderId?: string;
    text: string;
    entities: Entity[];
    mine: boolean;
}

const PER_CHAT = 200;
const messages = new Map<string, Map<number, Kept>>();
const names = new Map<string, string>();
let me: string | undefined;

function keep(message: any) {
    const chatId = message?.chatId;
    const id = Number(message?.id);
    if (chatId === undefined || !Number.isFinite(id)) return;

    const text = message.content?.text?.text;
    const chat = messages.get(String(chatId)) ?? new Map<number, Kept>();
    if (typeof text !== "string") {
        // An edit can take the text away; an update without content says nothing about it.
        if (message.content && chat.has(id)) chat.delete(id);
        return;
    }

    chat.set(id, {
        id,
        senderId: message.senderId === undefined ? undefined : String(message.senderId),
        text,
        entities: entitiesOf(message.content.text.entities),
        mine: !!message.isOutgoing
    });

    if (chat.size > PER_CHAT) chat.delete(Math.min(...chat.keys()));
    messages.set(String(chatId), chat);
}

function nameOf(peer: any) {
    const id = peer?.id;
    if (id === undefined) return;
    const name = peer.title ?? [peer.firstName, peer.lastName].filter(Boolean).join(" ");
    if (name) names.set(String(id), name);
}

/** Everything a worker answer holds that the script has a use for. */
export function readAnswer(data: any) {
    for (const payload of data?.payloads ?? []) {
        if (payload?.type === "updates") {
            for (const update of payload.updates ?? []) {
                const type = update?.["@type"];
                if (type === "newMessage" || type === "updateMessage")
                    keep({ ...update.message, chatId: update.chatId, id: update.id });
                else if (type === "updateCurrentUser") {
                    me = update.currentUser?.id === undefined ? me : String(update.currentUser.id);
                    nameOf(update.currentUser);
                } else if (type === "updateUser") nameOf({ ...update.user, id: update.id });
                else if (type === "updateChat") nameOf({ ...update.chat, id: update.id });
                else if (type === "deleteMessages" && update.chatId !== undefined)
                    for (const id of update.ids ?? []) messages.get(String(update.chatId))?.delete(Number(id));
            }
        } else if (payload?.type === "methodResponse") {
            const response = payload.response;
            if (!response || typeof response !== "object") continue;
            for (const message of Array.isArray(response.messages) ? response.messages : []) keep(message);
            if (response.message) keep(response.message);
            for (const user of Array.isArray(response.users) ? response.users : []) nameOf(user);
            for (const chat of Array.isArray(response.chats) ? response.chats : []) nameOf(chat);
        }
    }
}

// --- the page

/** What a message says on the screen, for one that came from Web A's own cache and never crossed the worker. */
function textOnScreen(element: Element) {
    const content = element.querySelector(".text-content");
    if (!content) return "";

    const copy = content.cloneNode(true) as Element;
    copy.querySelectorAll(".MessageMeta, .Reactions, .message-reactions, .reply-markup").forEach(part => part.remove());
    copy.querySelectorAll("img[alt]").forEach(image => image.replaceWith(image.getAttribute("alt") ?? ""));
    return (copy.textContent ?? "").trim();
}

/** The chat that is open: the address says it, #chatId or #chatId_thread. */
export function chatInHash(hash = location.hash) {
    return /^#(-?\d+)(?:_|$)/.exec(hash)?.[1];
}

function storedMe() {
    try {
        const saved = JSON.parse(localStorage.getItem("user_auth") ?? "null");
        return saved?.id === undefined ? undefined : String(saved.id);
    } catch {
        return undefined;
    }
}

export const webA: TelegramClient = {
    name: "a",

    install() {
        const Native = page.Worker;
        if (typeof Native !== "function") return;

        page.Worker = new Proxy(Native, {
            construct(target, args, newTarget) {
                const worker = Reflect.construct(target, args, newTarget);
                try {
                    watchWorker(worker, (chatId, text, entities) => webA.restore(chatId, text, entities) || tellRestore(chatId, text, entities), readAnswer);
                } catch (e) {
                    console.error("[AI Translate]", e);
                }
                return worker;
            }
        });
    },

    openChat: () => chatInHash(),

    chatTitle(chatId) {
        return names.get(chatId)
            ?? (chatId === chatInHash() ? document.querySelector(".MiddleHeader .fullName")?.textContent?.trim() : undefined)
            ?? undefined;
    },

    recent(chatId): Said[] {
        const mine = webA.meId();
        return [...(messages.get(chatId)?.values() ?? [])]
            .sort((a, b) => a.id - b.id)
            .map(m => {
                const authorId = m.mine ? mine ?? "me" : m.senderId ?? chatId;
                return { id: String(m.id), authorId, authorName: names.get(authorId), content: m.text };
            });
    },

    meId: () => me ?? storedMe(),

    shownAt(target): Shown | undefined {
        const element = target.closest?.(".Message[data-message-id]");
        const chatId = chatInHash();
        if (!element || !chatId) return undefined;

        const id = element.getAttribute("data-message-id")!;
        const kept = messages.get(chatId)?.get(Number(id));
        if (kept) return { chatId, id, text: kept.text, entities: kept.entities, mine: kept.mine, element };

        const text = textOnScreen(element);
        return text ? { chatId, id, text, entities: [], mine: element.classList.contains("own"), element } : undefined;
    },

    ownMessages() {
        return [...document.querySelectorAll(".Message.own[data-message-id]")]
            .map(element => webA.shownAt(element))
            .filter((shown): shown is Shown => !!shown?.mine);
    },

    // After the text and its time, before whatever else the bubble holds.
    putUnder(element, line) {
        element.querySelector(".text-content")?.after(line);
    },

    menu: {
        // Anything drawn in or as the menu: Teact may draw its items after the menu itself.
        itemsIn(added) {
            const menu = added.closest?.(".MessageContextMenu") ?? added.querySelector?.(".MessageContextMenu");
            return menu?.querySelector(".MessageContextMenu_items") ?? menu?.querySelector(".menu-container") ?? undefined;
        },

        item(label) {
            const item = document.createElement("div");
            item.setAttribute("role", "menuitem");
            item.tabIndex = 0;
            item.className = "MenuItem compact ai-translate-item";
            const icon = document.createElement("i");
            icon.className = "icon icon-language";
            icon.setAttribute("aria-hidden", "true");
            item.append(icon, label);
            return item;
        },

        // Web A shuts a menu on a press anywhere outside it.
        close() {
            document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        }
    },

    composerAnchors() {
        return [...document.querySelectorAll(".message-input-wrapper .AttachMenu")];
    },

    restore(chatId, text) {
        if (chatInHash() !== chatId || document.visibilityState === "hidden") return false;

        const box = document.querySelector<HTMLElement>(".messages-layout .Transition_slide-active #editable-message-text")
            ?? document.querySelector<HTMLElement>("#editable-message-text");
        if (!box || (box.textContent ?? "").trim()) return false;

        box.focus();
        // The editor takes typing from the browser's own command, as it would from the keyboard.
        return document.execCommand("insertText", false, text);
    }
};

let tellRestore: Restore = () => { };
/** How a message held back here reaches the chat box of another tab, set by main.ts. */
export const setRestoreElsewhere = (restore: Restore) => {
    tellRestore = restore;
};
