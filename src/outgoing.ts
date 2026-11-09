/*
 * AI Translate for Telegram — a message on its way out.
 *
 * Both clients hand over the same thing, a chat, a text and its entities, and
 * get back either a translation, or nothing when the message goes as typed,
 * or Held when it must not go at all. Which messages are translated is the
 * same rule as everywhere else: the chats switched on, or every chat.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isChannelEnabled } from "../ai-translate/core/chats";
import { config } from "../ai-translate/core/host";
import { keepPieces } from "../ai-translate/core/keep";
import { looksLikeOwnAttempt } from "../ai-translate/core/learn";
import { aiTranslate, collectContext, isJustAName, isNotWorthTranslating, notify, scriptShare } from "../ai-translate/core/translate";
import { type Entity, type Formatted, toMarked } from "./formatted";
import { askForCorrection } from "./learn";
import { noteUnder } from "./notes";
import { fresh } from "./storage";

/** The message must not go: the translation failed and the settings say to hold it. */
export class Held extends Error { }

/** A message to a bot's command is for the bot, word for word. */
const BOT_COMMAND = /^\/[A-Za-z0-9_]{1,32}(?:@[A-Za-z]\w{3,31})?(?:\s|$)/;

/**
 * What a message was translated into, a while longer than it takes to send
 * it: a paid message is drawn first and sent after the payment is confirmed,
 * and both ask for the same text.
 */
const REMEMBER_MS = 10 * 60_000;
const remembered = new Map<string, Formatted | "held">();
const inFlight = new Map<string, Promise<Formatted | undefined>>();

const remember = (key: string, what: Formatted | "held") => {
    remembered.set(key, what);
    setTimeout(() => remembered.delete(key), REMEMBER_MS);
};

/** How many translations are under way, for the chat bar button to show. */
let working = 0;
const watchers = new Set<(busy: boolean) => void>();
export const onBusy = (watcher: (busy: boolean) => void) => watchers.add(watcher);
const busy = (by: number) => {
    working += by;
    for (const watcher of watchers) watcher(working > 0);
};

/**
 * What becomes of a message, before anything is asked: it goes as typed, or
 * AI Learn takes it as the writer's own attempt, or it is translated.
 */
export function planFor(chatId: string, text: string, entities: Entity[]): "typed" | "learn" | "translate" {
    if (!text.trim() || BOT_COMMAND.test(text)) return "typed";

    // Another tab may have switched the chat on: Web A sends every tab's messages from one.
    fresh();
    if (!isChannelEnabled(chatId)) return "typed";

    const { marked } = toMarked(text, entities);
    // "\:)\" has nothing to translate, but its backslashes still have to go.
    if (isNotWorthTranslating(marked) && !keepPieces(marked, true).pieces.length) return "typed";
    if (isJustAName(marked, chatId)) return "typed";

    // Written in the alphabet of the language it would be translated into: the writer having a go at it themselves.
    if (config().aiLearn && looksLikeOwnAttempt(text, scriptShare(text, String(config().sentLanguage)))) return "learn";
    return "translate";
}

/** Whether this message would be translated at all, before anything is asked. */
export const wouldTranslate = (chatId: string, text: string, entities: Entity[]) => planFor(chatId, text, entities) === "translate";

/**
 * A message AI Learn takes goes at once, as typed but for the writer's own
 * \markers\, which come off as they would in a translation; the chat waits
 * on nothing, and the correction is asked for on the side. Undefined when
 * what goes is exactly what was typed.
 */
export function asWritten(chatId: string, text: string, entities: Entity[]): Formatted | undefined {
    const marked = toMarked(text, entities);
    const kept = keepPieces(marked.marked, true);

    let out: Formatted | undefined;
    if (kept.pieces.length) {
        const restored = kept.restore(kept.masked);
        const back = restored == null ? undefined : marked.back(restored);
        if (back && back.text !== text) out = back;
    }

    void askForCorrection(chatId, out?.text ?? text);
    return out;
}

/**
 * The message as it should go: translated, or undefined to send it as typed.
 * Throws Held when it must not go.
 */
export async function translateOutgoing(chatId: string, text: string, entities: Entity[]): Promise<Formatted | undefined> {
    if (!wouldTranslate(chatId, text, entities)) return undefined;

    const key = `${chatId}\n${text}\n${JSON.stringify(entities.map(e => [e.kind, e.offset, e.length]))}`;
    const known = remembered.get(key);
    if (known === "held") throw new Held("held back a moment ago");
    if (known) return known;

    let waiting = inFlight.get(key);
    if (!waiting) {
        waiting = (async () => {
            const marked = toMarked(text, entities);
            busy(1);
            try {
                const result = await aiTranslate("sent", marked.marked, collectContext(chatId));
                const back = marked.back(result.text);
                remember(key, back);
                // What was typed, for the line under the sent message while Show the original is on.
                noteUnder(chatId, back.text, { kind: "original", text, entities });
                return back;
            } catch (e) {
                notify(e, "failure");
                // Sending the untranslated text would quietly defeat the point of the script.
                if (config().onError === "sendAsTyped") return undefined;
                remember(key, "held");
                throw new Held(e instanceof Error ? e.message : String(e));
            } finally {
                busy(-1);
            }
        })();

        inFlight.set(key, waiting);
        // Awaited below; this only tidies up, and swallows nothing anyone waits for.
        void waiting.catch(() => undefined).finally(() => inFlight.delete(key));
    }

    return waiting;
}
