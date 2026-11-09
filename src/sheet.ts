/*
 * AI Translate for Telegram — the windows, and what goes in them.
 *
 * Telegram has no settings page or modal to lend a script, so these are ours,
 * in the same shadow root as the notices. They stack as Vencord's modals do:
 * the settings page over the panel's place, Logs over the settings page.
 * Escape, × or a press outside shuts the one on top and leaves the rest.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isRightToLeft, t } from "../ai-translate/core/locales";
import { translateIcon } from "./icons";
import { addStyle, ui } from "./ui";

const CSS = `
.sheet {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, .4);
    z-index: 2147483100;
}

.panel {
    width: min(40rem, calc(100vw - 2rem));
    max-height: min(46rem, calc(100vh - 2rem));
    overflow: auto;
    background: var(--bg);
    color: var(--fg);
    border-radius: 16px;
    box-shadow: var(--shadow);
    padding: 1.2rem 1.4rem 1.6rem;
}
.sheet[data-name="chat"] .panel { width: min(28rem, calc(100vw - 2rem)); }

.head { display: flex; align-items: center; gap: .6rem; margin-bottom: 1rem; color: var(--accent); }
.head h1 { font-size: 1.1rem; margin: 0; flex: 1; color: var(--fg); }

.x { all: unset; cursor: pointer; color: var(--muted); font-size: 1.4rem; line-height: 1; padding: 0 .3rem; }
.x:hover, .x:focus-visible { color: var(--fg); }

.field { margin-bottom: 1rem; }
.field > label, .field-head > label, .slot > label, .label { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .3rem; }
.hint { display: block; font-size: .8rem; color: var(--muted); line-height: 1.4; margin: .3rem 0 0; }
.field > .hint:not(:last-child) { margin: 0 0 .45rem; }
.hint.bad { color: var(--bad); }
.hint:empty { display: none; }

.field input, .field select, .field textarea {
    width: 100%;
    padding: .5rem .65rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--field);
    color: var(--fg);
    font-size: .9rem;
    font-family: inherit;
}
.field textarea { min-height: 5rem; resize: vertical; }
.field label input[type="checkbox"] { width: auto; margin: 0 .5rem 0 0; vertical-align: -1px; accent-color: var(--accent); }
.field label:has(input[type="checkbox"]) { cursor: pointer; }
.field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

.divider { border: 0; border-top: 1px solid var(--line); margin: 0 0 1rem; }

.section { text-align: center; font-size: 1.05rem; font-weight: 600; margin: 1.6rem 0 1rem; }

.button {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    display: inline-block;
    padding: .5rem .9rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--field);
    color: var(--fg);
    font-size: .9rem;
    font-weight: 500;
    text-align: center;
}
.button.primary { background: var(--accent); border-color: var(--accent); color: #ffffff; }
.button.wide { display: block; width: 100%; }
.button:hover:not([disabled]), .button:focus-visible { border-color: var(--accent); }
.button.primary:hover:not([disabled]) { filter: brightness(1.08); }
.button[disabled] { cursor: default; opacity: .5; }
.buttons { display: flex; flex-wrap: wrap; gap: .45rem; margin-top: .8rem; }
.foot { margin-bottom: 1rem; }

.keep { margin: .2rem 0 0; padding-inline-start: 1.2rem; }
.keep li { font-size: .8rem; color: var(--muted); line-height: 1.4; }
.keep li + li { margin-top: .3rem; }
.example {
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(128, 128, 128, .18);
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: .875em;
    white-space: pre-wrap;
}
`;

export interface Sheet {
    /** Where the window's content goes, under its heading. */
    body: HTMLElement;
    /** Draws the window again, heading included: the language may have changed. */
    redraw(): void;
    shut(): void;
}

interface Opening {
    /** Which window this is; opening one of the same name replaces it. */
    name: string;
    title: () => string;
    draw(body: HTMLElement, sheet: Sheet): void;
    /** Buttons beside the title, before ×. */
    links?: () => HTMLElement[];
    onShut?: () => void;
}

/** Keys typed here are ours: the client would take them for typing into the chat, and Escape for leaving it. */
const OURS = ["keydown", "keyup", "keypress", "paste", "copy", "cut"];

export function openSheet(opening: Opening): Sheet {
    addStyle(CSS);
    shutSheet(opening.name);

    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.dataset.name = opening.name;

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    sheet.append(panel);

    const shut = () => {
        if (!sheet.isConnected) return;
        sheet.remove();
        // The one underneath has the keyboard again.
        topSheet()?.querySelector<HTMLElement>(".x")?.focus();
        opening.onShut?.();
    };

    const body = document.createElement("div");
    const made: Sheet = { body, redraw: () => draw(), shut };

    const draw = () => {
        panel.textContent = "";
        panel.dir = isRightToLeft() ? "rtl" : "ltr";

        const head = document.createElement("div");
        head.className = "head";
        const title = document.createElement("h1");
        title.textContent = opening.title();
        const x = document.createElement("button");
        x.type = "button";
        x.className = "x";
        x.textContent = "×";
        x.setAttribute("aria-label", t("message.hide"));
        x.onclick = shut;
        head.append(translateIcon(22), title, ...(opening.links?.() ?? []), x);

        body.textContent = "";
        opening.draw(body, made);
        panel.append(head, body);
        return x;
    };

    sheet.onmousedown = event => {
        if (event.target === sheet) shut();
    };
    for (const type of OURS) sheet.addEventListener(type, event => event.stopPropagation());
    shutters.set(sheet, shut);
    listenForEscape();

    ui().append(sheet);
    draw().focus();
    return made;
}

const shutters = new WeakMap<Element, () => void>();
const topSheet = () => [...ui().querySelectorAll<HTMLElement>(".sheet")].at(-1);

let listening = false;
/** Escape shuts the window on top wherever the keyboard is, and goes no further: Telegram would shut the chat too. */
function listenForEscape() {
    if (listening) return;
    listening = true;
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        const top = topSheet();
        if (!top) return;
        event.preventDefault();
        event.stopPropagation();
        shutters.get(top)?.();
    }, true);
}

/** Shuts the window of that name, if it is open. */
export function shutSheet(name: string) {
    const open = ui().querySelector<HTMLElement>(`.sheet[data-name="${name}"]`);
    if (open) shutters.get(open)?.();
}

export const isOpen = (name: string) => !!ui().querySelector(`.sheet[data-name="${name}"]`);

const listeners = new Set<() => void>();
/** Told when a window changed what the chat bar button shows. */
export const onChange = (listener: () => void) => listeners.add(listener);
export const changed = () => {
    for (const listener of listeners) listener();
};

// --- what goes in them

export function button(label: string, act: () => void, { primary = false, wide = false } = {}) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = ["button", primary && "primary", wide && "wide"].filter(Boolean).join(" ");
    b.textContent = label;
    b.onclick = act;
    return b;
}

export function hint(text = "", bad = false) {
    const line = document.createElement("p");
    line.className = bad ? "hint bad" : "hint";
    line.textContent = text;
    return line;
}

/** The quiet titles that divide the settings page into parts (ui/SectionTitle.tsx). */
export function sectionTitle(key: string) {
    const title = document.createElement("div");
    title.className = "section";
    title.textContent = t(key);
    return title;
}
