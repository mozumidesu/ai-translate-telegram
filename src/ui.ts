/*
 * AI Translate for Telegram — the shadow root everything of ours lives in.
 *
 * Telegram's styles cannot reach into it and ours cannot leak out. Its colours
 * follow the client's light or dark theme, and the accent is the client's own:
 * custom properties are the one thing that crosses a shadow boundary.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isRightToLeft } from "../ai-translate/core/locales";

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }

.root {
    --bg: #ffffff;
    --fg: #000000;
    --muted: #707579;
    --line: rgba(0, 0, 0, .12);
    --field: #f4f4f5;
    --accent: var(--color-primary, var(--primary-color, #3390ec));
    --bad: #e53935;
    --shadow: 0 8px 28px rgba(0, 0, 0, .18);
    color: var(--fg);
    font-size: 14px;
}

.root.dark {
    --bg: #212121;
    --fg: #ffffff;
    --muted: #aaaaaa;
    --line: rgba(255, 255, 255, .12);
    --field: #2c2c2c;
    --shadow: 0 8px 28px rgba(0, 0, 0, .5);
}

.toasts {
    position: fixed;
    left: 50%;
    bottom: 96px;
    transform: translateX(-50%);
    display: grid;
    gap: 8px;
    z-index: 2147483000;
    pointer-events: none;
    width: max-content;
    max-width: calc(100vw - 32px);
}

.toast {
    max-width: 32rem;
    padding: 10px 16px;
    border-radius: 12px;
    background: rgba(0, 0, 0, .84);
    color: #ffffff;
    line-height: 1.45;
    box-shadow: var(--shadow);
    animation: rise .16s ease-out;
}

.toast.bad { background: #b3261e; }

@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
`;

/** The element our closed root hangs from, which is what the page sees as the target of anything inside. */
export const UI_ID = "ai-translate-telegram";

let shadow: ShadowRoot | undefined;
let box: HTMLElement | undefined;

/** Web A marks its dark theme on <html> as theme-dark, Web K as night. */
const isDark = () => {
    const html = document.documentElement.classList;
    return html.contains("theme-dark") || html.contains("night");
};

/** The one root for the notices, the panel and the answers. */
export function ui(): HTMLElement {
    if (box) return box;

    const mount = document.createElement("div");
    mount.id = UI_ID;
    // Closed: nothing on the page can reach in.
    shadow = mount.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = STYLE;

    box = document.createElement("div");
    box.className = "root";
    shadow.append(style, box);
    (document.body ?? document.documentElement).append(mount);

    const follow = () => {
        box!.classList.toggle("dark", isDark());
        box!.dir = isRightToLeft() ? "rtl" : "ltr";
    };
    follow();
    new MutationObserver(follow).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return box;
}

/** Rules of a part of ours, added once, in the same root. */
const added = new Set<string>();
export function addStyle(css: string) {
    if (added.has(css)) return;
    added.add(css);

    ui();
    const style = document.createElement("style");
    style.textContent = css;
    shadow!.append(style);
}

const SHOWN_MS = 7000;

export function toast(text: string, kind: "message" | "failure" = "message") {
    const root = ui();

    let shelf = root.querySelector(".toasts");
    if (!shelf) {
        shelf = document.createElement("div");
        shelf.className = "toasts";
        shelf.setAttribute("role", "status");
        root.append(shelf);
    }

    const note = document.createElement("div");
    note.className = kind === "failure" ? "toast bad" : "toast";
    note.textContent = text;
    shelf.append(note);

    setTimeout(() => note.remove(), SHOWN_MS);
}
