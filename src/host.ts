/*
 * AI Translate for Telegram — Telegram as the core's host.
 *
 * Settings come from the userscript manager, the conversation and the signed
 * in user from whichever client this is, and the chat is named as Telegram
 * and written in the core's Telegram dialect, which is what the prompts say.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Host } from "../ai-translate/core/host";
import type { TelegramClient } from "./client";
import { seen, tellOthers } from "./relay";
import { save, settings } from "./storage";
import { toast } from "./ui";

export function telegramHost(client: TelegramClient): Host {
    return {
        config: settings,
        set: save,
        recent: chatId => client.recent(chatId),
        meId: () => client.meId(),
        notice(text, kind) {
            if (seen()) toast(text, kind);
            // The tab that sent it may not be the one in front.
            tellOthers({ type: "notice", text, kind });
        },
        appName: () => "Telegram",
        dialect: () => "telegram",
        // Both clients write the language they are shown in on <html>.
        appLocale: () => document.documentElement.lang || navigator.language || "en"
    };
}
