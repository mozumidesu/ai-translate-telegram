/*
 * AI Translate for Telegram — the Logs button and its window, as
 * ai-translate/ui/Logs.tsx has them.
 *
 * What the script has been doing, for the cases a notice cannot carry: an
 * error that says nothing, or a dozen of them in a row. Copy hands the lot to
 * a support report; Save writes the same text to a file. The log itself is
 * the core's (core/log.ts), which keeps secrets out of it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "../ai-translate/core/locales";
import { asText, clear, howMany } from "../ai-translate/core/log";
import { button, hint, openSheet } from "./sheet";
import { addStyle } from "./ui";
import { VERSION } from "./version";

const CSS = `
.log {
    margin: .8rem 0 0;
    padding: .6rem .7rem;
    max-height: 22rem;
    overflow: auto;
    border-radius: 10px;
    background: var(--field);
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: .75rem;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
}
`;

/** A file name nobody has to rename: the script, then when it was taken. */
const fileName = () => `ai-translate-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.txt`;

/** The clipboard, with the old way behind it for browsers that refuse the new one. */
async function toClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fall through to the way that works without a permission.
    }

    try {
        const box = document.createElement("textarea");
        box.value = text;
        box.style.position = "fixed";
        box.style.opacity = "0";
        document.body.append(box);
        box.select();
        const ok = document.execCommand("copy");
        box.remove();
        return ok;
    } catch {
        return false;
    }
}

/** Hands the text to the browser as a file, which it saves with the downloads. */
function toFile(text: string) {
    try {
        const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName();
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return true;
    } catch {
        return false;
    }
}

export function openLogs(onShut?: () => void) {
    addStyle(CSS);

    openSheet({
        name: "logs",
        title: () => t("logs.title"),
        onShut,
        draw(body) {
            const text = asText();

            const log = document.createElement("pre");
            log.className = "log";
            log.dir = "ltr";
            log.textContent = text || t("logs.empty");

            const said = hint();
            let quiet: ReturnType<typeof setTimeout> | undefined;
            const report = (key: string) => {
                said.textContent = t(key);
                clearTimeout(quiet);
                quiet = setTimeout(() => {
                    said.textContent = "";
                }, 2000);
            };

            const copy = button(t("logs.copy"), async () => report(await toClipboard(text) ? "logs.copied" : "logs.copyFailed"), { primary: true });
            const save = button(t("logs.save"), () => report(toFile(text) ? "logs.saved" : "logs.saveFailed"));
            const empty = button(t("logs.clear"), () => {
                clear();
                log.textContent = t("logs.empty");
                for (const b of [copy, save, empty]) b.disabled = true;
            });
            for (const b of [copy, save, empty]) b.disabled = !text;

            const buttons = document.createElement("div");
            buttons.className = "buttons";
            buttons.append(copy, save, empty);

            body.append(hint(t("logs.desc")), log, buttons, said);
        }
    });
}

/** The row at the foot of the settings page that opens it. */
export function logsRow() {
    const box = document.createElement("div");
    box.className = "foot logs";

    const label = () => {
        const kept = howMany();
        return kept ? `${t("logs.open")} (${kept})` : t("logs.open");
    };
    // Counted again once the window shuts: it may have been cleared there.
    const open = button(label(), () => openLogs(() => {
        open.textContent = label();
    }), { wide: true });

    // The one place a person can read which version they run: the plugin's, with no build counter.
    box.append(open, hint(`AI Translate · ${VERSION}`));
    return box;
}
