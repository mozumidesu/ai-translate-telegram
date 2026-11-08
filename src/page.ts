/*
 * AI Translate for Telegram — the page's own window, and which client it is.
 *
 * A userscript manager may hand the script a window of its own; the client's
 * code lives on the page's, so that is the one every hook goes on. Vencord's
 * userscript does the same, and for the same reason.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare const unsafeWindow: Window | undefined;

/** What the client's own code sees as its window. */
export const page: any = typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : window;

/** Web A lives under /a/, Web K under /k/; anything else is neither. */
export type Client = "a" | "k";

export function whichClient(path = location.pathname): Client | undefined {
    if (/^\/a(\/|$)/.test(path)) return "a";
    if (/^\/k(\/|$)/.test(path)) return "k";
    return undefined;
}
