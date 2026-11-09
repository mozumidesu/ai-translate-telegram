/*
 * AI Translate for Telegram — a line of ours under your own messages.
 *
 * What a native speaker would have written, from AI Learn, and what you
 * typed before it was translated, while Show the original is on: the line
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

import { config } from "../ai-translate/core/host";
import type { Part } from "../ai-translate/core/learn";
import { t } from "../ai-translate/core/locales";
import { theClient } from "./client";
import type { Entity, Kind } from "./formatted";
import { correctIcon, translateIcon } from "./icons";

export type Note =
    | { kind: "correction"; parts: Part[]; why: string; }
    | { kind: "original"; text: string; entities: Entity[]; };

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
.bold { font-weight: 600; }
/* Inside a line in italics, emphasis is upright. */
.italic { font-style: normal; }
.underline { text-decoration: underline; }
.strike { text-decoration: line-through; }
.underline.strike { text-decoration: underline line-through; }
.code { font-family: ui-monospace, Menlo, Consolas, monospace; font-style: normal; }
`;

/** What the typed text's formatting looks like in the line: its own kinds, as classes. */
const DRAWN: Partial<Record<Kind, string>> = { bold: "bold", italic: "italic", underline: "underline", strike: "strike", code: "code", pre: "code" };

/** The text as it was typed, with the formatting it was typed with. */
function typed(text: string, entities: Entity[]) {
    const drawn = entities.filter(e => DRAWN[e.kind]);
    const cuts = [...new Set([0, text.length, ...drawn.flatMap(e => [e.offset, e.offset + e.length])])]
        .filter(at => at >= 0 && at <= text.length)
        .sort((a, b) => a - b);

    const parts: (string | HTMLElement)[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
        const [from, to] = [cuts[i], cuts[i + 1]];
        const classes = [...new Set(drawn.filter(e => e.offset <= from && e.offset + e.length >= to).map(e => DRAWN[e.kind]!))];
        if (!classes.length) {
            parts.push(text.slice(from, to));
            continue;
        }
        const span = document.createElement("span");
        span.className = classes.join(" ");
        span.textContent = text.slice(from, to);
        parts.push(span);
    }
    return parts;
}

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

    if (note.kind === "original") {
        line.append(translateIcon(16), t("message.youWrote"), " ", ...typed(note.text, note.entities));
        return line;
    }

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

    // Read each time: switched off, what is already drawn goes too.
    const originals = config().showOriginal === true;
    for (const message of client.ownMessages()) {
        const found = notes.get(keyOf(message.chatId, message.text));
        const want = found?.kind === "original" && !originals ? undefined : found;
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
