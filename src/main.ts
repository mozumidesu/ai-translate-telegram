/*
 * AI Translate for Telegram — where the userscript starts.
 *
 * It runs at document-start, before either client's own code, which is the
 * only moment a hook can still go in front of the line every message crosses:
 * the worker Web A is about to create, the proxy Web K is about to mount.
 * The buttons, the menu items and the panel wait for the page.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useHost } from "../ai-translate/core/host";
import { t } from "../ai-translate/core/locales";
import { type TelegramClient, useClient } from "./client";
import { installComposerButton } from "./composer";
import { offered, taken } from "./held";
import { telegramHost } from "./host";
import { installMenu } from "./menu";
import { installNotes } from "./notes";
import { whichClient } from "./page";
import { onWord, seen } from "./relay";
import { openSettings } from "./settings";
import { catchEscape, toast } from "./ui";
import { webA } from "./weba";
import { webK } from "./webk";

declare const GM_registerMenuCommand: ((name: string, run: () => void) => unknown) | undefined;

const which = whichClient();
const client: TelegramClient | undefined = which === "a" ? webA : which === "k" ? webK : undefined;

if (client) {
    // First, before anything asks for a setting.
    useClient(client);
    useHost(telegramHost(client));

    // At once: the client's own code is about to run.
    try {
        client.install();
    } catch (e) {
        console.error("[AI Translate]", e);
    }
    // Before the client's own listeners too, which shut the open chat on Escape.
    catchEscape();

    onWord(word => {
        if (word.type === "notice" && seen()) toast(word.text, word.kind);
        // A message held back in the tab that sends goes back into the box of a tab that can take it.
        if (word.type === "restore") offered(client, word);
        if (word.type === "restored") taken(word.id);
    });

    const start = () => {
        try {
            installMenu(client);
            installComposerButton(client);
            installNotes();
        } catch (e) {
            console.error("[AI Translate]", e);
        }
    };

    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });

    try {
        GM_registerMenuCommand?.(t("panel.allSettings"), openSettings);
    } catch {
        // A manager without menu commands; the chat bar button's panel opens the settings too.
    }

    // Nothing is said by itself, as in Discord: a missing key is named when a
    // message is sent in a chat that is on, or something is read from the menu.
}
