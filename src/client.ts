/*
 * AI Translate for Telegram — what each of the two clients has to answer.
 *
 * Web A (web.telegram.org/a/) and Web K (web.telegram.org/k/) are separate
 * apps that share nothing but the protocol, so each has a file of its own,
 * weba.ts and webk.ts, and everything else asks through this one shape.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Said } from "../ai-translate/core/host";
import type { Entity } from "./formatted";

/** A message someone opened the menu on. */
export interface Shown {
    chatId: string;
    id: string;
    text: string;
    entities: Entity[];
    /** Written by the person using the script. */
    mine: boolean;
    /** The message on the screen, where the answer is put beside it. */
    element: Element;
}

export interface TelegramClient {
    name: "a" | "k";
    /** Hooks that have to be in place before the client's own code runs. */
    install(): void;
    /** The chat that is open, as a Bot API id: users as they are, groups negative, channels -100… */
    openChat(): string | undefined;
    chatTitle(chatId: string): string | undefined;
    /** The chat's messages, oldest first. */
    recent(chatId: string): Said[];
    meId(): string | undefined;
    /** The message under a right click, or nothing when it was not on one. */
    shownAt(target: Element): Shown | undefined;
    /** The person's own messages that are on the screen. */
    ownMessages(): Shown[];
    /** A line of ours under a message's text, inside its bubble. */
    putUnder(element: Element, line: HTMLElement): void;
    /** The client's message menu as it is drawn: where items go, how one looks, how it is shut. */
    menu: {
        itemsIn(added: Element): Element | undefined;
        item(label: string): HTMLElement;
        close(): void;
    };
    /** The button in each chat bar that ours goes in front of. */
    composerAnchors(): Element[];
    /** The chat box of `chatId` holds `text` again, if it is open here and empty. */
    restore(chatId: string, text: string, entities: Entity[]): boolean;
}

let current: TelegramClient | undefined;

/** Which client this page is, set once by main.ts. */
export const useClient = (client: TelegramClient) => {
    current = client;
};
export const theClient = () => current;
