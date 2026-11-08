/*
 * Calls as Web A posts them to its GramJS worker, in the shape of
 * src/api/gramjs/worker/connector.ts: { payloads: [{ messageId, type, name,
 * args }] }, batched once a tick.
 *
 * The sendMessage parameters are the ones the sendMessage action builds in
 * src/global/actions/api/messages.ts, keys left undefined included, because
 * the action writes them that way. A bot command is what sendBotCommand in
 * bots.ts sends: no wasDrafted. Read from the sources on 2026-11-08 at
 * Ajaxy/telegram-tt 6002824; a cloud session cannot log in to record them
 * from a running client, so test/live.mjs checks the batches themselves
 * against the live site instead.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const chat = {
    id: "-1001234567890", type: "chatTypeSuperGroup", title: "Book club", accessHash: "8712361872361",
    isCreator: false, membersCount: 12, isForum: false
};
export const otherChat = { id: "777000", type: "chatTypePrivate", title: "Telegram" };

let next = 100;
const id = () => String(next++);

/** What the chat bar sends: sendMessage with every key the action writes. */
export function typed(text, entities, { into = chat, ...more } = {}) {
    return {
        messageId: id(), type: "callMethod", name: "sendMessage",
        args: [{
            chat: into, text, entities, replyInfo: undefined, suggestedPostInfo: undefined, suggestedMedia: undefined,
            noWebPage: false, sendAs: undefined, lastMessageId: 4410, messagePriceInStars: undefined, isStoryReply: false,
            dice: undefined, richMessage: undefined, isPending: undefined, attachment: undefined, wasDrafted: false,
            scheduledAt: undefined, isSilent: false, effectId: undefined, webPageMediaSize: undefined, webPageUrl: undefined,
            ...more
        }]
    };
}

/** A press on a bot's keyboard, or a command from its menu: sendBotCommand. */
export const botButton = text => ({
    messageId: id(), type: "callMethod", name: "sendMessage",
    args: [{ chat, replyInfo: undefined, text, sendAs: undefined, lastMessageId: 4410 }]
});

/** A paid message is drawn first, and sent once the payment is confirmed. */
export const paidLocal = text => ({ ...typed(text, undefined, { messagePriceInStars: 10, isPending: true }), name: "sendMessageLocal" });
export const paidSend = (text, localMessage) => typed(text, undefined, { messagePriceInStars: 10, isPending: true, localMessage });

export const edit = (text, entities) => ({
    messageId: id(), type: "callMethod", name: "editMessage",
    args: [{ chat, message: { id: 4400, chatId: chat.id, content: { text: { text: "старый текст" } } }, text, entities, attachment: undefined }]
});

export const album = () => [
    typed("фото с отпуска", undefined, { attachment: { blobUrl: "blob:1", mimeType: "image/jpeg" }, groupedId: "17311" }),
    { ...typed(undefined), args: [{ chat, attachment: { blobUrl: "blob:2", mimeType: "image/jpeg" }, groupedId: "17311" }] }
];

export const markRead = () => ({ messageId: id(), type: "callMethod", name: "markMessageListRead", args: [{ chat, threadId: -1, maxId: 4410 }] });
export const typing = () => ({ messageId: id(), type: "callMethod", name: "sendMessageAction", args: [{ peer: chat, action: { type: "typing" } }] });
export const initApi = () => ({ messageId: id(), type: "initApi", args: [{ userAgent: "x", platform: "Linux" }, {}] });

/** The worker's answers: history for a chat, and the updates that come with use. */
export const history = {
    type: "methodResponse",
    messageId: "1",
    response: {
        messages: [
            { id: 4401, chatId: chat.id, senderId: "5001", isOutgoing: false, date: 1, content: { text: { text: "кто идёт в субботу?" } } },
            { id: 4402, chatId: chat.id, senderId: "5002", isOutgoing: false, date: 2, content: { text: { text: "я, но опоздаю", entities: [{ type: "MessageEntityItalic", offset: 3, length: 10 }] } } },
            { id: 4403, chatId: chat.id, senderId: "4242", isOutgoing: true, date: 3, content: { sticker: { id: "9" } } }
        ],
        users: [{ id: "5001", firstName: "Hoshi", type: "userTypeRegular" }, { id: "5002", firstName: "Kaii", lastName: "M", type: "userTypeRegular" }],
        chats: [chat]
    }
};

export const updates = {
    type: "updates",
    updates: [
        { "@type": "updateCurrentUser", currentUser: { id: "4242", firstName: "Mozumi" }, currentUserFullInfo: {} },
        { "@type": "newMessage", chatId: chat.id, id: 4404, message: { id: 4404, chatId: chat.id, senderId: "4242", isOutgoing: true, content: { text: { text: "уже еду" } } } }
    ]
};
