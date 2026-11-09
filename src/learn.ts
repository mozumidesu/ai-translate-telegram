/*
 * AI Translate for Telegram — AI Learn, and the corrections it has kept.
 *
 * A message written in the alphabet of the language you translate into is
 * your own attempt at it: it goes as typed, and how a native speaker would
 * have written it arrives a moment later under it. Unasked, a message that
 * was right says nothing, and neither does a failure: a suggestion that
 * comes by itself must not interrupt a conversation. Asked for from the
 * menu, it always answers. The same as ai-translate/index.tsx, with the
 * judging and the keeping in the core's learn.ts.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { changedWords, type Correction, forgetCorrections, keepCorrection, keptCorrections, sameMessage, splitCorrection } from "../ai-translate/core/learn";
import { currentLocale, t } from "../ai-translate/core/locales";
import { aiTranslate, collectContext, notify } from "../ai-translate/core/translate";
import { noteUnder } from "./notes";
import { button, hint, openSheet } from "./sheet";
import { addStyle } from "./ui";

/** Asked once a message: Web A asks twice for a paid one, once to draw it and once to send it. */
const ASKED_MS = 10 * 60_000;
const asked = new Set<string>();

/**
 * One request for how a native speaker would have written `sent`. Nothing
 * waits on it. `byHand` is the menu's: it always answers, "nothing to
 * correct here" and a failure included.
 */
export async function askForCorrection(chatId: string, sent: string, byHand = false) {
    const key = `${chatId}\n${sent}`;
    if (!byHand) {
        if (asked.has(key)) return;
        asked.add(key);
        setTimeout(() => asked.delete(key), ASKED_MS);
    }

    try {
        const { text } = await aiTranslate("correct", sent, collectContext(chatId));
        if (!text) return;

        const { native, why } = splitCorrection(text);
        if (sameMessage(sent, native)) {
            if (byHand) noteUnder(chatId, sent, { kind: "correction", parts: [], why: "" });
            return;
        }

        noteUnder(chatId, sent, { kind: "correction", parts: changedWords(sent, native), why });
        keepCorrection({ typed: sent, native, why, at: Date.now() });
    } catch (e) {
        if (byHand) notify(e, "failure");
    }
}

// --- the Corrections window (ai-translate/ui/LearnPanel.tsx)

const CSS = `
.kept-list { margin: .5rem 0 1rem; padding: 0; list-style: none; }
.kept { padding: .65rem 0; border-top: 1px solid var(--line); }
.kept p { margin: 0; }
.kept-typed { color: var(--muted); font-size: .85rem; }
.kept .kept-native { margin-top: .15rem; }
.kept .kept-why { margin-top: .25rem; color: var(--muted); font-size: .8rem; }
.kept .kept-when { margin-top: .25rem; color: var(--muted); font-size: .75rem; opacity: .8; }
.kept-native .fixed { font-weight: 600; text-decoration: underline dotted; text-underline-offset: 2px; }
.kept-empty { margin: .3rem 0 1rem; color: var(--muted); }
`;

/** The day it happened, written the way the reader's language writes days. */
function when(at: number) {
    try {
        return new Date(at).toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
    } catch {
        // An unusual locale name is not worth losing the entry over.
        return "";
    }
}

function para(className: string, text = "") {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    return p;
}

function entry(kept: Correction) {
    const item = document.createElement("li");
    item.className = "kept";

    const native = para("kept-native");
    changedWords(kept.typed, kept.native).forEach((part, at) => {
        if (at) native.append(" ");
        if (!part.changed) return native.append(part.text);
        const fixed = document.createElement("span");
        fixed.className = "fixed";
        fixed.textContent = part.text;
        native.append(fixed);
    });

    item.append(para("kept-typed", kept.typed), native);
    if (kept.why) item.append(para("kept-why", kept.why));
    item.append(para("kept-when", when(kept.at)));
    return item;
}

export function openCorrections(onShut?: () => void) {
    addStyle(CSS);

    openSheet({
        name: "corrections",
        title: () => t("learn.title"),
        onShut,
        draw(body, sheet) {
            const kept = keptCorrections();
            body.append(hint(t("learn.panelDesc")));

            if (kept.length) {
                const list = document.createElement("ul");
                list.className = "kept-list";
                list.append(...kept.map(entry));
                body.append(list);
            } else body.append(para("kept-empty", t("learn.empty")));

            const clear = button(t("learn.clear"), () => {
                forgetCorrections();
                sheet.redraw();
            });
            clear.disabled = !kept.length;
            body.append(clear);
        }
    });
}

/** The row on the settings page that opens it, under the AI Learn switch, there only while it is on. */
export function correctionsRow() {
    const box = document.createElement("div");
    box.className = "foot learn";

    const label = () => {
        const kept = keptCorrections().length;
        return kept ? `${t("learn.open")} (${kept})` : t("learn.open");
    };
    const open = button(label(), () => openCorrections(() => {
        open.textContent = label();
    }), { wide: true });

    box.append(open);
    return box;
}
