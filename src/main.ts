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
import type { TelegramClient } from "./client";
import { installComposerButton } from "./composer";
import { telegramHost } from "./host";
import { installMenu } from "./menu";
import { whichClient } from "./page";
import { openPanel, usePanelClient } from "./panel";
import { onWord, seen, tellOthers } from "./relay";
import { toast } from "./ui";
import { setRestoreElsewhere as restoreFromA, webA } from "./weba";
import { setRestoreElsewhere as restoreFromK, webK } from "./webk";

declare const GM_registerMenuCommand: ((name: string, run: () => void) => unknown) | undefined;

const which = whichClient();
const client: TelegramClient | undefined = which === "a" ? webA : which === "k" ? webK : undefined;

if (client) {
    // First, before anything asks for a setting.
    useHost(telegramHost(client));

    // At once: the client's own code is about to run.
    try {
        client.install();
    } catch (e) {
        console.error("[AI Translate]", e);
    }

    // A message held back in the tab that sends goes back into the box of the tab it was typed in.
    const elsewhere = (chatId: string, text: string, entities: any[]) => tellOthers({ type: "restore", chatId, text, entities });
    restoreFromA(elsewhere);
    restoreFromK(elsewhere);

    onWord(word => {
        if (word.type === "notice" && seen()) toast(word.text, word.kind);
        if (word.type === "restore") client.restore(word.chatId, word.text, word.entities);
    });

    const start = () => {
        try {
            usePanelClient(client);
            installMenu(client);
            installComposerButton(client);
        } catch (e) {
            console.error("[AI Translate]", e);
        }
    };

    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });

    try {
        GM_registerMenuCommand?.(t("panel.allSettings"), openPanel);
    } catch {
        // A manager without menu commands; the chat bar button opens the panel too.
    }

    // Nothing is said by itself, as in Discord: a missing key is named when a
    // message is sent in a chat that is on, or something is read from the menu.
}
