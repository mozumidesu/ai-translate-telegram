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
import { giveBack, type Typed } from "./held";
import { asWritten, Held, planFor, translateOutgoing } from "./outgoing";
import { page, typingElsewhere } from "./page";

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

/** The calls that carry a new message someone typed. An edit, editMessage, goes as typed: editing is how a translation is put right. */
const CARRIES_TEXT = new Set(["sendMessage", "sendMessageLocal"]);

/** Calls that make or change messages wait behind one being translated in their chat, so messages keep their order. */
const ORDERED = /^(send|forward|edit)/;
const UNORDERED = new Set(["sendMessageAction"]);

/** The chat a call is about, when it names one: for a forward, the one it goes to. */
export function chatOf(payload: any): string | undefined {
    const params = payload?.args?.[0];
    const id = (params?.toChat ?? params?.chat ?? params?.peer)?.id;
    return id === undefined || id === null ? undefined : String(id);
}

/** The text a call carries, when it is one somebody typed. */
export function typedIn(payload: any): Typed | undefined {
    if (payload?.type !== "callMethod" || !CARRIES_TEXT.has(payload.name)) return undefined;

    const params = payload.args?.[0];
    if (!params || typeof params.text !== "string" || !params.text || params.richMessage) return undefined;

    // The chat bar's own sends say whether there was a draft; a bot's button, a
    // bot command from a menu and an invite link are sent without that.
    if (!("wasDrafted" in params)) return undefined;

    const chatId = params.chat?.id;
    if (chatId === undefined) return undefined;

    // A forum's topic is the top a message in it replies to (prepareMessageReplyInfo); the main thread has none.
    const top = params.replyInfo?.replyToTopId;
    return { chatId: String(chatId), text: params.text, entities: entitiesOf(params.entities), thread: top ? String(top) : undefined };
}

/** The call again, carrying the translation. */
function carrying(payload: any, text: string, entities: Entity[]) {
    const [params, ...rest] = payload.args;
    return {
        ...payload,
        args: [{ ...params, text, entities: entities.length ? entities.map(toA) : undefined }, ...rest]
    };
}

type Restore = (typed: Typed) => void;

/**
 * Wraps one worker's postMessage. Every call goes through untouched unless it
 * carries typed text in a chat that is switched on; that one waits for its
 * translation, and every message call in its chat after it waits behind it.
 */
export function watchWorker(worker: Worker, restore: Restore, onAnswer?: (data: any) => void) {
    const send = worker.postMessage.bind(worker);
    // One line per chat: a slow translation in one holds up nothing in another, nor in another tab.
    const queues = new Map<string, { tail: Promise<unknown>; count: number; }>();

    /** The app's own promise for a call that is never sent, settled as if the worker had nothing to say. */
    const answerNothing = (messageId: string) => {
        const Event: typeof MessageEvent = page.MessageEvent ?? MessageEvent;
        worker.dispatchEvent(new Event("message", {
            data: { payloads: [{ type: "methodResponse", messageId, response: undefined }] }
        }));
    };

    const later = (chatId: string, payload: any, ready: Promise<any>) => {
        const queue = queues.get(chatId) ?? { tail: Promise.resolve(), count: 0 };
        queues.set(chatId, queue);
        queue.count++;
        queue.tail = queue.tail
            .then(() => ready)
            .then(final => {
                if (final) send({ payloads: [final] });
                else answerNothing(payload.messageId);
            })
            .catch(e => {
                console.error("[AI Translate]", e);
                answerNothing(payload.messageId);
            })
            .finally(() => {
                if (--queue.count === 0 && queues.get(chatId) === queue) queues.delete(chatId);
            });
    };

    const translated = async (payload: any, found: Typed) => {
        try {
            const result = await translateOutgoing(found.chatId, found.text, found.entities);
            return result ? carrying(payload, result.text, result.entities) : payload;
        } catch (e) {
            if (!(e instanceof Held)) {
                // A bug of ours is not a reason to swallow somebody's message.
                console.error("[AI Translate]", e);
                return payload;
            }

            // It goes back into the box, a paid one drawn first too.
            restore(found);
            return undefined;
        }
    };

    /** AI Learn's: at once, as written, with the writer's own markers off. */
    const learned = (payload: any, found: Typed) => {
        const out = asWritten(found.chatId, found.text, found.entities);
        return out ? carrying(payload, out.text, out.entities) : payload;
    };

    worker.postMessage = function (message: any, ...rest: any[]) {
        const payloads = message?.payloads;
        if (!Array.isArray(payloads)) return send(message, ...(rest as [any]));
        crossed = true;

        const now: any[] = [];
        for (const payload of payloads) {
            const found = typedIn(payload);
            const plan = found ? planFor(found.chatId, found.text, found.entities) : "typed";
            if (plan === "translate") {
                later(found!.chatId, payload, translated(payload, found!));
                continue;
            }

            const going = plan === "learn" ? learned(payload, found!) : payload;
            const chatId = chatOf(going);
            if (chatId !== undefined && queues.has(chatId) && ORDERED.test(going?.name ?? "") && !UNORDERED.has(going.name))
                later(chatId, going, Promise.resolve(going));
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

/** Whether a batch has crossed a worker the script watches: until one has, nothing typed would be caught. */
let crossed = false;
let missing: string | undefined = "Web A: the script has not been installed";

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

/** The forum topic or comment thread that is open, #chatId_thread, or nothing in a chat's main thread (routing.ts). */
export function threadInHash(hash = location.hash) {
    return /^#-?\d+_(-?\d+)(?:_|$)/.exec(hash)?.[1];
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
        if (typeof Native !== "function") {
            missing = "Web A: the page has no Worker to hook";
            return;
        }

        const watched = new WeakSet<Worker>();
        const watch = (worker: Worker) => {
            watched.add(worker);
            try {
                watchWorker(worker, typed => giveBack(webA, typed), readAnswer);
            } catch (e) {
                console.error("[AI Translate]", e);
            }
        };

        page.Worker = new Proxy(Native, {
            construct(target, args, newTarget) {
                const worker = Reflect.construct(target, args, newTarget);
                watch(worker);
                return worker;
            }
        });

        // A script that lands after Web A made its worker still catches that worker's next call, and every one after.
        const native = Native.prototype?.postMessage;
        if (typeof native === "function")
            Native.prototype.postMessage = function (this: Worker, message: any, ...rest: any[]) {
                if (watched.has(this) || !Array.isArray(message?.payloads)) return native.call(this, message, ...rest);
                watch(this);
                return this.postMessage(message, ...rest);
            };

        missing = "Web A: no call to Telegram's worker has crossed the script's hook";
    },

    unhooked: () => (crossed ? undefined : missing),

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

    // As src/components/ui/Modal.scss: the whole window fades in .15s (.opacity-transition), the dialog comes
    // down from 1rem above and leaves 1rem downwards in .2s, and useShowTransition keeps a closing one 350ms.
    windows: {
        css: `
.sheet { opacity: 0; transition: opacity .15s ease; }
.sheet.open { opacity: 1; }
.panel { transform: translate3d(0, -1rem, 0); transition: transform .2s ease; }
.sheet.open .panel { transform: none; }
.sheet.closing .panel { transform: translate3d(0, 1rem, 0); }
`,
        leavesIn: 350,
        // Page transitions off, in its animation settings, stop the dialog moving and keep the fade.
        motion: () => (document.body.classList.contains("no-page-transitions") ? "fade" : "full")
    },

    composerAnchors() {
        return [...document.querySelectorAll(".message-input-wrapper .AttachMenu")];
    },

    restore(chatId, text, _entities, thread) {
        if (chatInHash() !== chatId || (threadInHash() ?? "") !== (thread ?? "") || document.visibilityState === "hidden") return false;

        const box = document.querySelector<HTMLElement>(".messages-layout .Transition_slide-active #editable-message-text")
            ?? document.querySelector<HTMLElement>("#editable-message-text");
        if (!box || (box.textContent ?? "").trim() || typingElsewhere(element => element === box)) return false;

        box.focus();
        // The editor takes typing from the browser's own command, as it would from the keyboard.
        return document.execCommand("insertText", false, text);
    }
};

