/*
 * AI Translate for Telegram — a line of ours under your own messages.
 *
 * What a native speaker would have written, from AI Learn: the line
 * ai-translate/index.tsx draws under a message, seen only by the person
 * using the script, since it is drawn in their browser and sent nowhere.
 *
 * It is known before the message is drawn, which has no id yet, so it is
 * kept by chat and text, as the plugin keeps it by text. The clients redraw
 * their messages as they please and take anything of ours with them, so the
 * line is put back whenever a message on the screen lacks it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Part } from "../ai-translate/core/learn";
import { t } from "../ai-translate/core/locales";
import { theClient } from "./client";
import { correctIcon } from "./icons";

export type Note = { kind: "correction"; parts: Part[]; why: string; };

/** Its own element: no rule of the client's is written for a name like this. */
export const TAG = "ai-translate-note";

const CSS = `
:host { display: block; }
.note {
    display: block;
    margin-top: .35em;
    font-style: italic;
    font-size: .92em;
    line-height: 1.35;
    opacity: .75;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
}
svg { vertical-align: text-bottom; margin-inline-end: .25em; }
.fixed { font-weight: 600; text-decoration: underline dotted; text-underline-offset: 2px; }
.why { display: block; opacity: .85; }
`;

const KEPT = 200;
const notes = new Map<string, Note>();

// Spaces as the screen gives them back are not always the ones that were sent.
const keyOf = (chatId: string, text: string) => `${chatId}\n${text.replace(/\s+/g, "")}`;

/** What goes under the message `text` in `chatId`, once it is on the screen. */
export function noteUnder(chatId: string, text: string, note: Note) {
    if (notes.size >= KEPT) notes.delete(notes.keys().next().value!);
    notes.set(keyOf(chatId, text), note);
    draw();
}

function render(note: Note) {
    const line = document.createElement("span");
    line.className = "note";

    line.append(correctIcon(16));
    if (!note.parts.length) {
        line.append(t("message.fine"));
        return line;
    }

    line.append(t("message.native"), " ");
    note.parts.forEach((part, at) => {
        if (at) line.append(" ");
        if (!part.changed) return line.append(part.text);
        const fixed = document.createElement("span");
        fixed.className = "fixed";
        fixed.textContent = part.text;
        line.append(fixed);
    });
    if (note.why) {
        const why = document.createElement("span");
        why.className = "why";
        why.textContent = note.why;
        line.append(why);
    }
    return line;
}

const placed = new WeakMap<Element, Note>();

function make(note: Note) {
    const host = document.createElement(TAG);
    // Closed, like everything else of ours: nothing on the page can reach in.
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root.append(style, render(note));
    placed.set(host, note);
    return host;
}

/** Every own message on the screen gets the line it should have, and loses one it should not. */
export function draw() {
    const client = theClient();
    if (!client || (!notes.size && !document.querySelector(TAG))) return;

    for (const message of client.ownMessages()) {
        const want = notes.get(keyOf(message.chatId, message.text));
        const there = message.element.querySelector(TAG);
        if (there && placed.get(there) === want) continue;

        there?.remove();
        if (want) client.putUnder(message.element, make(want));
    }
}

let watching = false;
/** A chat opened, a message drawn or redrawn: all of it is caught within half a second. */
export function installNotes() {
    if (watching) return;
    watching = true;
    setInterval(() => {
        try {
            draw();
        } catch (e) {
            console.error("[AI Translate]", e);
        }
    }, 500);
}
