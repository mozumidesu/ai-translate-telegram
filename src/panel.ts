/*
 * AI Translate for Telegram — the panel behind the chat bar button.
 *
 * Holds what changes often, as ai-translate/ui/modal.tsx does: the two
 * languages, and the switch for the open chat. Everything else is on the
 * settings page, one button away.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isChannelEnabled, setChannelEnabled } from "../ai-translate/core/chats";
import { config, set } from "../ai-translate/core/host";
import { LANGUAGES } from "../ai-translate/core/languages";
import { t } from "../ai-translate/core/locales";
import { theClient } from "./client";
import { openSettings } from "./settings";
import { button, changed, hint, openSheet } from "./sheet";

function languagePicker(title: string, name: "sentLanguage" | "receivedLanguage") {
    const box = document.createElement("div");
    box.className = "field";

    const label = document.createElement("label");
    label.textContent = title;

    const current = String(config()[name] ?? "");
    const select = document.createElement("select");
    // A language typed by hand, not in the list, stays usable.
    const options = current && !LANGUAGES.some(l => l.value === current)
        ? [{ value: current, label: current }, ...LANGUAGES]
        : LANGUAGES;

    if (!current) {
        const none = document.createElement("option");
        none.value = "";
        none.textContent = t("panel.pickLanguage");
        none.disabled = true;
        select.append(none);
    }
    for (const option of options) {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        select.append(item);
    }
    select.value = current;
    select.onchange = () => set(name, select.value);

    box.append(label, select);
    return box;
}

/** The open chat, switched on or off from here as from the button. */
function chatToggle(chatId: string) {
    const box = document.createElement("div");
    box.className = "field chat";

    const label = document.createElement("label");
    const tick = document.createElement("input");
    tick.type = "checkbox";

    let said: string;
    if (config().mode === "always") {
        label.textContent = t("panel.alwaysOn");
        said = t("panel.alwaysOnHint");
        tick.checked = true;
        tick.disabled = true;
    } else {
        const chat = theClient()?.chatTitle(chatId) || t("panel.thisChat");
        label.textContent = t("panel.toggle", { chat });
        said = t("panel.toggleHint");
        tick.checked = isChannelEnabled(chatId);
        tick.onchange = () => {
            setChannelEnabled(chatId, tick.checked);
            changed();
        };
    }

    label.prepend(tick);
    box.append(label, hint(said));
    return box;
}

export function openPanel() {
    const chatId = theClient()?.openChat();

    openSheet({
        name: "chat",
        title: () => t("panel.title"),
        onShut: changed,
        draw(body, sheet) {
            body.append(
                languagePicker(t("panel.sentLanguage"), "sentLanguage"),
                languagePicker(t("panel.receivedLanguage"), "receivedLanguage")
            );

            if (chatId) {
                const line = document.createElement("hr");
                line.className = "divider";
                body.append(line, chatToggle(chatId));
            }

            body.append(button(t("panel.allSettings"), () => {
                // Settings open in their own window, so this one steps aside.
                sheet.shut();
                openSettings();
            }));
        }
    });
}
