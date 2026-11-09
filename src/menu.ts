/*
 * AI Translate for Telegram — a message read on request.
 *
 * The client's own menu, opened on a message, gets AI Translate, AI Explain
 * when it is switched on in the settings, and on your own messages AI Learn
 * while that is on, whose answer goes under the message (notes.ts). The answer is shown beside
 * the message in a card of ours, rather than inside the message: the client
 * redraws its messages as it pleases, and anything put in one would vanish
 * or be drawn over.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config } from "../ai-translate/core/host";
import { LANGUAGES } from "../ai-translate/core/languages";
import { currentLocale, shapeLanguageName, t } from "../ai-translate/core/locales";
import { aiTranslate, collectContext, isJustAName, notify } from "../ai-translate/core/translate";
import type { Shown, TelegramClient } from "./client";
import { toMarked } from "./formatted";
import { explainIcon, translateIcon } from "./icons";
import { askForCorrection } from "./learn";
import { addStyle, ui } from "./ui";

const CSS = `
.card {
    position: fixed;
    z-index: 2147482500;
    width: min(26rem, calc(100vw - 32px));
    max-height: min(22rem, calc(100vh - 32px));
    overflow: auto;
    padding: 10px 14px 12px;
    border-radius: 14px;
    background: var(--bg);
    color: var(--fg);
    box-shadow: var(--shadow);
    border: 1px solid var(--line);
    line-height: 1.45;
}
.card .head { display: flex; align-items: center; gap: 6px; color: var(--accent); font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.card .head span { flex: 1; }
.card .shut { all: unset; cursor: pointer; color: var(--muted); font-size: 18px; line-height: 1; padding: 0 2px; }
.card .shut:hover, .card .shut:focus-visible { color: var(--fg); }
.card .text { white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
.card .note { margin-top: 6px; font-size: 12px; color: var(--muted); }
.card .wait { display: inline-flex; gap: 4px; padding: 6px 0; }
.card .wait i { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); animation: blink 1s infinite ease-in-out; }
.card .wait i:nth-child(2) { animation-delay: .15s; }
.card .wait i:nth-child(3) { animation-delay: .3s; }
@keyframes blink { 50% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .card .wait i { animation: none; } }
`;

/** A language as the person reading it calls it, "арабский" in a Russian interface. */
function languageName(reported: string) {
    const said = reported.trim();
    const known = LANGUAGES.find(l => l.code.toLowerCase() === said.toLowerCase() || l.value.toLowerCase() === said.toLowerCase());
    const code = known?.code ?? said;

    try {
        const display = new Intl.DisplayNames([currentLocale()], { type: "language" }).of(code);
        if (display && display.toLowerCase() !== code.toLowerCase()) return shapeLanguageName(display);
    } catch {
        // An unknown code, or a browser without the name tables.
    }

    return shapeLanguageName(known?.value ?? said);
}

let open: { card: HTMLElement; shut(): void; } | undefined;

/** The card beside a message, held to it while the chat scrolls, shut by Escape, a press outside or ×. */
function cardFor(shown: Shown, explaining: boolean) {
    addStyle(CSS);
    open?.shut();

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "dialog");

    const head = document.createElement("div");
    head.className = "head";
    const title = document.createElement("span");
    title.textContent = t(explaining ? "message.explain" : "message.translate");
    const shutButton = document.createElement("button");
    shutButton.className = "shut";
    shutButton.textContent = "×";
    shutButton.title = t("message.hide");
    shutButton.setAttribute("aria-label", t("message.hide"));
    head.append(explaining ? explainIcon(16) : translateIcon(16), title, shutButton);

    const body = document.createElement("div");
    body.className = "text";
    const wait = document.createElement("span");
    wait.className = "wait";
    wait.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    body.append(wait);
    card.setAttribute("aria-busy", "true");

    card.append(head, body);
    ui().append(card);

    const place = () => {
        if (!shown.element.isConnected) return shut();

        const at = shown.element.getBoundingClientRect();
        const size = card.getBoundingClientRect();
        const below = at.bottom + 6;
        const top = below + size.height <= innerHeight - 8 ? below : Math.max(8, at.top - size.height - 6);
        const left = shown.mine ? at.right - size.width : at.left;

        card.style.top = `${Math.round(top)}px`;
        card.style.left = `${Math.round(Math.min(Math.max(8, left), innerWidth - size.width - 8))}px`;
    };

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && shut();
    const onPress = (e: MouseEvent) => !e.composedPath().includes(card) && shut();

    function shut() {
        card.remove();
        document.removeEventListener("scroll", place, true);
        removeEventListener("resize", place);
        document.removeEventListener("keydown", onKey, true);
        document.removeEventListener("mousedown", onPress, true);
        if (open?.card === card) open = undefined;
    }

    shutButton.onclick = shut;
    document.addEventListener("scroll", place, true);
    addEventListener("resize", place);
    document.addEventListener("keydown", onKey, true);
    // After the press that opened the menu has finished, or it would shut at once.
    setTimeout(() => document.addEventListener("mousedown", onPress, true), 0);

    place();
    open = { card, shut };

    return {
        show(text: string, note?: string) {
            if (!card.isConnected) return;
            body.textContent = text;
            card.removeAttribute("aria-busy");
            if (note) {
                const line = document.createElement("div");
                line.className = "note";
                line.textContent = note;
                card.append(line);
            }
            place();
        },
        shut
    };
}

/** Translation or explanation of one message, into the card. */
export async function readMessage(shown: Shown, explaining: boolean) {
    const card = cardFor(shown, explaining);

    try {
        // Code stays fenced, so the core keeps it; nothing else is marked, since nothing is sent.
        const marked = toMarked(shown.text, shown.entities, { readOnly: true });

        // Someone's name on its own: the translation of a name is the name.
        if (!explaining && isJustAName(marked.marked, shown.chatId)) {
            card.show(shown.text);
            return;
        }

        const context = collectContext(shown.chatId, shown.id);
        const result = explaining
            ? await aiTranslate("explain", shown.text, context)
            : await aiTranslate("received", marked.marked, context, shown.mine);

        const text = explaining ? result.text : marked.back(result.text).text;
        card.show(text, !explaining && result.sourceLanguage
            ? t("message.translatedFrom", { language: languageName(result.sourceLanguage) })
            : undefined);
    } catch (e) {
        card.shut();
        notify(e, "failure");
    }
}

/** Puts the items into the client's menu each time it is drawn for a message. */
export function installMenu(client: TelegramClient) {
    let target: Element | undefined;

    // Capturing, so this runs before the client's own handler draws the menu.
    document.addEventListener("contextmenu", e => {
        target = e.target instanceof Element ? e.target : undefined;
    }, true);

    const fill = (items: Element) => {
        if (items.querySelector(".ai-translate-item") || !target) return;

        const shown = client.shownAt(target);
        if (!shown?.text.trim()) return;

        const add = (label: string, explaining: boolean) => {
            const item = client.menu.item(label);
            item.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                client.menu.close();
                // The message the menu is open on now: a menu kept and drawn again for another one is about that one.
                const now = (target && client.shownAt(target)) || shown;
                void readMessage(now, explaining);
            });
            items.append(item);
        };

        add(t("message.translate"), false);
        if (config().explain) add(t("message.explain"), true);

        // Your own message only: a correction of somebody else's writing is not
        // something to hand them. This asks again for one that went by, or at
        // all when the message was too short to be caught; it always answers.
        if (config().aiLearn && shown.mine) {
            const item = client.menu.item(t("message.correct"));
            item.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                client.menu.close();
                const now = (target && client.shownAt(target)) || shown;
                void askForCorrection(now.chatId, now.text, true);
            });
            items.append(item);
        }
    };

    const watch = (root: Element, subtree: boolean) => new MutationObserver(records => {
        for (const record of records)
            for (const node of record.addedNodes) {
                if (!(node instanceof Element)) continue;
                const items = client.menu.itemsIn(node);
                if (items) fill(items);
            }
    }).observe(root, { childList: true, subtree });

    // Web K puts its menu straight into the body; Web A into #portals, a level or two down.
    if (client.name === "k") {
        watch(document.body, false);
        return;
    }

    const portals = () => document.getElementById("portals");
    const found = portals();
    if (found) {
        watch(found, true);
        return;
    }
    const timer = setInterval(() => {
        const later = portals();
        if (!later) return;
        clearInterval(timer);
        watch(later, true);
    }, 500);
}
