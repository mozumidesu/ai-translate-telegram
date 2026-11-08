/*
 * AI Translate for Telegram — the button in the chat bar.
 *
 * The same button as the Discord plugin's: a left click opens the panel, a
 * right click switches the open chat on or off, and it is coloured while the
 * chat is on. It lives in a shadow root of its own beside the client's
 * buttons, takes their size and colour, and is put back whenever the client
 * redraws its chat bar without it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isChannelEnabled, toggleChannel } from "../ai-translate/core/chats";
import { t } from "../ai-translate/core/locales";
import type { TelegramClient } from "./client";
import { translateIcon } from "./icons";
import { onBusy } from "./outgoing";
import { onChange, openPanel } from "./panel";

const CSS = `
:host { all: initial; display: inline-flex; align-self: flex-end; flex: none; }
button {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: inherit;
    opacity: .85;
    transition: color .15s, background-color .15s, opacity .15s;
}
button:hover, button:focus-visible { opacity: 1; background: rgba(127, 127, 127, .12); }
button.on { color: var(--color-primary, var(--primary-color, #3390ec)); opacity: 1; }
button.busy svg { animation: pulse 1s infinite ease-in-out; }
@keyframes pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { button.busy svg { animation: none; } }
`;

const MARK = "ai-translate-button";

export function installComposerButton(client: TelegramClient) {
    const buttons = new Set<{ host: HTMLElement; button: HTMLButtonElement; anchor: Element; }>();
    let busy = false;

    const show = () => {
        const chatId = client.openChat();
        const on = !!chatId && isChannelEnabled(chatId);

        for (const placed of buttons) {
            const { host, button, anchor } = placed;
            if (!host.isConnected) {
                buttons.delete(placed);
                continue;
            }
            button.classList.toggle("on", on);
            button.classList.toggle("busy", busy);
            button.title = `${t(on ? "button.on" : "button.off")} — ${t("button.hint")}`;
            button.setAttribute("aria-pressed", String(on));
            button.setAttribute("aria-label", t("panel.title"));
            // The client's own buttons say what grey is in this theme.
            host.style.color = getComputedStyle(anchor).color;
        }
    };

    const make = (anchor: Element) => {
        const host = document.createElement("span");
        host.className = MARK;
        const root = host.attachShadow({ mode: "closed" });

        const style = document.createElement("style");
        style.textContent = CSS;

        const button = document.createElement("button");
        button.type = "button";
        const size = Math.round((anchor as HTMLElement).offsetHeight || 40);
        button.style.width = `${size}px`;
        button.style.height = `${size}px`;
        button.append(translateIcon(Math.round(size * 0.55)));

        button.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            openPanel();
        };
        button.oncontextmenu = event => {
            event.preventDefault();
            event.stopPropagation();
            const chatId = client.openChat();
            if (!chatId) return;
            toggleChannel(chatId);
            show();
        };
        // The chat box keeps its focus when the button is pressed.
        button.onmousedown = event => event.preventDefault();

        root.append(style, button);
        anchor.before(host);
        buttons.add({ host, button, anchor });
    };

    const place = () => {
        for (const anchor of client.composerAnchors())
            if (!anchor.previousElementSibling?.classList.contains(MARK)) make(anchor);
        show();
    };

    onBusy(now => {
        busy = now;
        show();
    });
    onChange(show);

    place();
    // A chat opened, a chat bar redrawn, a theme changed: all of it is caught within a second.
    setInterval(place, 1000);
}
