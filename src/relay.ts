/*
 * AI Translate for Telegram — word between the tabs.
 *
 * Web A sends every tab's messages from one of them, the one that holds its
 * connection, so a failure is found out there, while the person may be
 * looking at another tab. What that tab has to say goes to all of them, and
 * a tab someone is looking at says it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Entity } from "./formatted";

export type Word =
    | { type: "notice"; text: string; kind: "message" | "failure"; }
    | { type: "restore"; chatId: string; text: string; entities: Entity[]; };

const listeners = new Set<(word: Word) => void>();

const channel = (() => {
    try {
        return typeof BroadcastChannel === "function" ? new BroadcastChannel("ai-translate-telegram") : undefined;
    } catch {
        return undefined;
    }
})();

if (channel) channel.onmessage = event => {
    for (const listener of listeners) listener(event.data as Word);
};

export const onWord = (listener: (word: Word) => void) => {
    listeners.add(listener);
};

/** To every other tab of this browser. */
export function tellOthers(word: Word) {
    try {
        channel?.postMessage(word);
    } catch {
        // A tab on its own has nobody to tell.
    }
}

/** Whether this tab is the one in front of the person. */
export const seen = () => typeof document === "undefined" || document.visibilityState !== "hidden";
