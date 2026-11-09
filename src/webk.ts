/*
 * AI Translate for Telegram — Web K, web.telegram.org/k/.
 *
 * Web K mounts its objects on the window (src/config/debug.ts: MOUNT_CLASS_TO
 * is always the global), and every call from the page to its managers, which
 * run in a shared worker, goes through one function: apiManagerProxy.invoke(
 * "manager", { name, method, args }). A message is drawn by the worker's
 * appMessagesManager.sendText, so holding that call holds the message.
 *
 * sendText is also how a bot's keyboard button, a shared link or a dice is
 * sent, and none of those is anything somebody typed. What was typed into a
 * field, the chat bar, a forward's comment or a story reply, goes through
 * ChatInput.sendMessageWithForward with that field, and only those are marked
 * for translation. Telegram's own AI Editor sends its result there too, with
 * no field; it goes as the editor wrote it, and its request saved for a chat
 * rewrites the chat bar first, which is then translated like anything typed.
 * An edit comes from the chat bar's saveEditedMessage, and is counted there.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Said } from "../ai-translate/core/host";
import type { Shown, TelegramClient } from "./client";
import type { Entity, Kind } from "./formatted";
import { asWritten, Held, planFor, translateOutgoing } from "./outgoing";
import { page } from "./page";

// --- entities, as the layer writes them

const KINDS: Record<string, Kind> = {
    messageEntityBold: "bold",
    messageEntityItalic: "italic",
    messageEntityStrike: "strike",
    messageEntitySpoiler: "spoiler",
    messageEntityUnderline: "underline",
    messageEntityCode: "code",
    messageEntityPre: "pre",
    messageEntityTextUrl: "link",
    messageEntityMentionName: "mention",
    messageEntityCustomEmoji: "emoji",
    messageEntityBlockquote: "quote"
};
const TYPES = Object.fromEntries(Object.entries(KINDS).map(([type, kind]) => [kind, type])) as Record<Kind, string>;

export function fromK(entity: any): Entity | undefined {
    const kind = KINDS[entity?._];
    if (!kind) return undefined;

    const { _, offset, length, url, user_id, document_id, language, ...extra } = entity;
    if (kind === "mention" && !/^\d+$/.test(String(user_id))) return undefined;

    return {
        kind, offset, length,
        ...(url ? { url } : {}),
        ...(kind === "mention" ? { userId: String(user_id) } : {}),
        ...(document_id !== undefined ? { documentId: String(document_id) } : {}),
        ...(language ? { language } : {}),
        // The layer's own fields, a quote's pFlags and the ids as they were typed, go back as they came.
        extra: { ...extra, ...(user_id !== undefined ? { user_id } : {}), ...(document_id !== undefined ? { document_id } : {}) }
    };
}

export function toK(entity: Entity): any {
    const out: any = { ...entity.extra, _: TYPES[entity.kind], offset: entity.offset, length: entity.length };
    if (entity.kind === "link") out.url = entity.url;
    if (entity.kind === "mention") out.user_id ??= Number(entity.userId);
    if (entity.kind === "emoji") out.document_id ??= entity.documentId;
    if (entity.kind === "pre") out.language = entity.language ?? "";
    return out;
}

const entitiesOf = (list: unknown) => (Array.isArray(list) ? list : []).map(fromK).filter((e): e is Entity => !!e);

// --- chats: Web K's peer ids and the Bot API's

const CHANNEL_BASE = 10n ** 12n;

/** Web K writes a group and a channel alike as minus their id; the Bot API sets channels apart by -100. */
export function chatIdOf(peerId: number | string): string {
    const id = Number(peerId);
    if (!(id < 0)) return String(id);

    const peer = page.apiManagerProxy?.getPeer?.(id);
    return peer?._ === "channel" || peer?._ === "channelForbidden"
        ? (-(CHANNEL_BASE + BigInt(-id))).toString()
        : String(id);
}

export function peerIdOf(chatId: string): number {
    const id = BigInt(chatId);
    return Number(id < -CHANNEL_BASE ? id + CHANNEL_BASE : id);
}

function nameOfPeer(peerId: number) {
    const peer = page.apiManagerProxy?.getPeer?.(peerId);
    if (!peer) return undefined;
    return peer.title ?? ([peer.first_name, peer.last_name].filter(Boolean).join(" ") || undefined);
}

// --- the calls

/** What a field marks on the parameters it sends with, carried by the spread into sendText. */
export const TYPED = Symbol("ai-translate typed");

let editing = 0;

interface Found {
    chatId: string;
    text: string;
    entities: Entity[];
    edit: boolean;
}

/** The text a manager call carries, when somebody typed it. */
export function typedIn(payload: any): Found | undefined {
    if (payload?.name !== "appMessagesManager") return undefined;
    const args = payload.args ?? [];

    if (payload.method === "sendText") {
        const options = args[0];
        if (!options?.[TYPED] || options.richMessage || typeof options.text !== "string" || !options.text) return undefined;
        return { chatId: chatIdOf(options.peerId), text: options.text, entities: entitiesOf(options.entities), edit: false };
    }

    if (payload.method === "editMessage" && editing > 0) {
        const [message, text, options] = args;
        if (!message || typeof text !== "string" || !text || options?.richMessage) return undefined;
        return { chatId: chatIdOf(message.peerId), text, entities: entitiesOf(options?.entities), edit: true };
    }

    return undefined;
}

/** The same call, carrying the translation, and without the mark, which is ours. */
function carrying(payload: any, found: Found, text: string, entities: Entity[]) {
    const args = [...payload.args];
    const layer = entities.map(toK);

    if (found.edit) {
        args[1] = text;
        args[2] = { ...args[2], entities: layer };
    } else {
        const { [TYPED]: _, ...options } = args[0];
        args[0] = { ...options, text, entities: layer };
    }

    return { ...payload, args };
}

function unmarked(payload: any) {
    if (!payload?.args?.[0]?.[TYPED]) return payload;
    const { [TYPED]: _, ...options } = payload.args[0];
    return { ...payload, args: [options, ...payload.args.slice(1)] };
}

/** Manager calls that make messages keep their order behind one being translated. */
const ORDERED = /^(send|forward)/;

type Restore = (chatId: string, text: string, entities: Entity[]) => void;

/**
 * Wraps apiManagerProxy.invoke. Everything passes untouched but typed text in a
 * chat that is switched on. `onCall` runs on every call, which is how the chat
 * bar's class is reached in time: opening a chat makes dozens of calls before
 * anything can be typed into it.
 */
export function wrapInvoke(proxy: any, restore: Restore, onCall?: () => void) {
    const invoke = proxy?.invoke;
    if (typeof invoke !== "function" || invoke.aiTranslate) return;

    let tail: Promise<unknown> = Promise.resolve();
    let queued = 0;

    const later = (run: () => Promise<any>) => {
        queued++;
        const done = tail.then(run);
        tail = done.catch(() => undefined).finally(() => queued--);
        return done;
    };

    const wrapped = function (this: any, type: string, payload: any, ...rest: any[]) {
        onCall?.();
        if (type !== "manager") return invoke.call(this, type, payload, ...rest);

        const found = typedIn(payload);
        const plan = found ? planFor(found.chatId, found.text, found.entities) : "typed";
        if (found && plan === "translate") {
            const ready = translateOutgoing(found.chatId, found.text, found.entities).then(
                result => result ? carrying(payload, found, result.text, result.entities) : unmarked(payload),
                e => {
                    if (!(e instanceof Held)) {
                        // A bug of ours is not a reason to swallow somebody's message.
                        console.error("[AI Translate]", e);
                        return unmarked(payload);
                    }
                    // An edit that did not go leaves the message as it was; a new one goes back into the box.
                    if (!found.edit) restore(found.chatId, found.text, found.entities);
                    return undefined;
                }
            );

            const withAck = rest[0] === true;
            return later(async () => {
                const next = await ready;
                if (next) return invoke.call(this, type, next, ...rest);
                // What the caller is told when nothing is sent: nothing, as sendText says when it has no text.
                return withAck ? { cached: false, result: Promise.resolve(undefined) } : undefined;
            });
        }

        let plain = unmarked(payload);
        if (found && plan === "learn") {
            // AI Learn's: at once, as written, with the writer's own markers off.
            const out = asWritten(found.chatId, found.text, found.entities);
            if (out) plain = carrying(payload, found, out.text, out.entities);
        }

        if (queued && plain?.name === "appMessagesManager" && ORDERED.test(plain.method ?? ""))
            return later(() => invoke.call(this, type, plain, ...rest));

        return invoke.call(this, type, plain, ...rest);
    };

    wrapped.aiTranslate = true;
    proxy.invoke = wrapped;
}

/** Marks what a field sends, and counts the chat bar's edits. Once per page: the class is shared. */
export function patchChatInput(ChatInput: any) {
    if (!ChatInput || ChatInput.aiTranslate) return;
    ChatInput.aiTranslate = true;

    const send = ChatInput.sendMessageWithForward;
    if (typeof send === "function")
        ChatInput.sendMessageWithForward = function (this: any, options: any, ...rest: any[]) {
            // Only a field is somebody typing: the AI Editor hands over text of its own, with none.
            const marked = options?.inputField
                ? { ...options, sendTextParams: { ...options.sendTextParams, [TYPED]: true } }
                : options;
            return send.call(this, marked, ...rest);
        };

    const save = ChatInput.prototype?.saveEditedMessage;
    if (typeof save === "function")
        ChatInput.prototype.saveEditedMessage = async function (this: any, ...args: any[]) {
            editing++;
            try {
                return await save.apply(this, args);
            } finally {
                editing--;
            }
        };
}

// --- the page

/** The text of a bubble as it is drawn, for a message the mirrors do not hold. */
function textOnScreen(bubble: Element) {
    const content = bubble.querySelector(".translatable-message") ?? bubble.querySelector(".message");
    if (!content) return "";

    const copy = content.cloneNode(true) as Element;
    copy.querySelectorAll(".time, .reactions, .bubble-name-first, .reply-markup").forEach(part => part.remove());
    copy.querySelectorAll("img[alt]").forEach(image => image.replaceWith(image.getAttribute("alt") ?? ""));
    return (copy.textContent ?? "").trim();
}

let patched = false;

/** The chat bar's class, from the first chat that has one; true once it is marked. */
function patchWhenReachable() {
    if (patched) return true;

    const chats: any[] = [page.appImManager?.chat, ...(page.appImManager?.chats ?? [])];
    for (const chat of chats) {
        const ChatInput = chat?.input?.Class ?? chat?.input?.constructor;
        if (typeof ChatInput?.sendMessageWithForward !== "function") continue;
        patchChatInput(ChatInput);
        patched = true;
        return true;
    }
    return false;
}

/** Calls `found` with the proxy once Web K has mounted it, at once if it already has. */
function whenProxy(found: (proxy: any) => void) {
    if (page.apiManagerProxy) {
        found(page.apiManagerProxy);
        return;
    }

    let held: any;
    try {
        Object.defineProperty(page, "apiManagerProxy", {
            configurable: true,
            enumerable: true,
            get: () => held,
            set(value) {
                held = value;
                found(value);
            }
        });
    } catch {
        const timer = setInterval(() => {
            if (!page.apiManagerProxy) return;
            clearInterval(timer);
            found(page.apiManagerProxy);
        }, 200);
    }
}

let tellRestore: Restore = () => { };
/** How a message held back here reaches the chat box of another tab, set by main.ts. */
export const setRestoreElsewhere = (restore: Restore) => {
    tellRestore = restore;
};

export const webK: TelegramClient = {
    name: "k",

    install() {
        whenProxy(proxy => wrapInvoke(proxy, (chatId, text, entities) => {
            if (!webK.restore(chatId, text, entities)) tellRestore(chatId, text, entities);
        }, patchWhenReachable));

        if (!patchWhenReachable()) {
            const timer = setInterval(() => patchWhenReachable() && clearInterval(timer), 250);
        }
    },

    openChat() {
        const peerId = page.appImManager?.chat?.peerId;
        return peerId ? chatIdOf(peerId) : undefined;
    },

    chatTitle: chatId => nameOfPeer(peerIdOf(chatId)),

    recent(chatId): Said[] {
        const peerId = peerIdOf(chatId);
        const stored = page.apiManagerProxy?.mirrors?.messages?.[`${peerId}_history`] ?? {};
        const me = webK.meId();

        return Object.values<any>(stored)
            .filter(m => m?._ === "message" && typeof m.message === "string" && m.message)
            .sort((a, b) => a.mid - b.mid)
            .map(m => {
                const from = m.fromId ?? peerId;
                const authorId = m.pFlags?.out ? me ?? "me" : chatIdOf(from);
                return { id: String(m.mid), authorId, authorName: nameOfPeer(Number(from)), content: m.message };
            });
    },

    meId() {
        const id = page.rootScope?.myId;
        return id ? String(id) : undefined;
    },

    shownAt(target): Shown | undefined {
        const bubble = target.closest?.(".bubble[data-mid]") as HTMLElement | null;
        if (!bubble?.dataset.peerId) return undefined;

        const peerId = Number(bubble.dataset.peerId);
        const id = bubble.dataset.mid!;
        const chatId = chatIdOf(peerId);
        const message = page.apiManagerProxy?.getMessageByPeer?.(peerId, Number(id));

        if (typeof message?.message === "string" && message.message)
            return {
                chatId, id,
                text: message.message,
                entities: entitiesOf(message.totalEntities ?? message.entities),
                mine: !!message.pFlags?.out,
                element: bubble
            };

        const text = textOnScreen(bubble);
        return text ? { chatId, id, text, entities: [], mine: bubble.classList.contains("is-out"), element: bubble } : undefined;
    },

    ownMessages() {
        return [...document.querySelectorAll(".bubble.is-out[data-mid]")]
            .map(bubble => webK.shownAt(bubble))
            .filter((shown): shown is Shown => !!shown?.mine);
    },

    // The bubble's .message holds the text, then the time; the line goes after both.
    putUnder(element, line) {
        element.querySelector(".message")?.append(line);
    },

    menu: {
        itemsIn(added) {
            if (added.id === "bubble-contextmenu") return added;
            return added.querySelector?.("#bubble-contextmenu") ?? undefined;
        },

        item(label) {
            const item = document.createElement("div");
            item.className = "btn-menu-item rp-overflow ai-translate-item";
            item.setAttribute("role", "menuitem");

            const icon = document.createElement("span");
            // Web K's own icon font: "language", the glyph its translation items use.
            icon.className = "tgico btn-menu-item-icon";
            icon.textContent = "";
            icon.setAttribute("aria-hidden", "true");

            const text = document.createElement("span");
            text.className = "btn-menu-item-text";
            text.textContent = label;

            item.append(icon, text);
            return item;
        },

        // Web K shuts a menu on a click anywhere outside it.
        close() {
            for (const type of ["mousedown", "click"])
                document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
        }
    },

    // As src/scss/partials/popups/_popup.scss, with --popup-transition from base.scss: the overlay fades in .15s,
    // the window rises from 3rem below on the way in and fades where it stands on the way out; destroy() keeps it 250ms.
    windows: {
        css: `
.sheet { opacity: 0; transition: opacity .15s cubic-bezier(.4, 0, .2, 1); }
.sheet.open { opacity: 1; }
.panel { transform: translate3d(0, 3rem, 0); transition: transform .15s cubic-bezier(.4, 0, .2, 1); }
.sheet.open .panel, .sheet.closing .panel { transform: translate3d(0, 0, 0); }
`,
        leavesIn: 250,
        // Levels on <body>: 0 nothing, 1 fades where things stand, 2 movement too.
        motion() {
            const body = document.body.classList;
            if (body.contains("animation-level-0")) return "none";
            return body.contains("animation-level-1") && !body.contains("animation-level-2") ? "fade" : "full";
        }
    },

    composerAnchors() {
        return [...document.querySelectorAll(".chat-input .toggle-emoticons")];
    },

    restore(chatId, text, entities) {
        const chat = page.appImManager?.chat;
        const input = chat?.input;
        if (!input || !chat.peerId || chatIdOf(chat.peerId) !== chatId || document.visibilityState === "hidden") return false;

        const editor = input.messageInputEditor;
        if (editor && !editor.isEmpty?.()) return false;

        try {
            if (typeof editor?.replaceAllText === "function") return editor.replaceAllText(text, entities.map(toK)) !== false;
            input.setInputValue(text);
            return true;
        } catch (e) {
            console.error("[AI Translate]", e);
            return false;
        }
    }
};
