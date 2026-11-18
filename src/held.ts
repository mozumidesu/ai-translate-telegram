/*
 * AI Translate for Telegram — messages held back, until a chat box takes them.
 *
 * A message that could not be translated goes back into the box it was typed
 * in. The box may not take it at once: the next message is being typed, or
 * another chat is open, or the tab is in the background. So it is kept, and
 * offered again every second, here and to the other tabs, until one of them
 * has its chat open with an empty box.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { TelegramClient } from "./client";
import type { Entity } from "./formatted";
import { tellOthers } from "./relay";

interface Kept {
    id: string;
    chatId: string;
    text: string;
    entities: Entity[];
}

const waiting: Kept[] = [];

// Unique across tabs, which answer by it.
const tab = Math.random().toString(36).slice(2);
let next = 0;

/** Puts what was typed back, here or in another tab, now or as soon as a box can take it. */
export function giveBack(client: TelegramClient, chatId: string, text: string, entities: Entity[]) {
    waiting.push({ id: `${tab}-${next++}`, chatId, text, entities });
    offerHeld(client);
}

/** Every message still waiting, offered again: the chat bar's tick calls this. */
export function offerHeld(client: TelegramClient) {
    for (const kept of [...waiting]) {
        if (client.restore(kept.chatId, kept.text, kept.entities)) taken(kept.id);
        else tellOthers({ type: "restore", ...kept });
    }
}

/** Another tab put it into its box. */
export function taken(id: string) {
    const at = waiting.findIndex(kept => kept.id === id);
    if (at !== -1) waiting.splice(at, 1);
}
