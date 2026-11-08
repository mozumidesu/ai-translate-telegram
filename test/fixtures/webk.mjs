/*
 * Web K as the script meets it, reduced to the calls it makes.
 *
 * From morethanwords/tweb aa74832 (8 November 2026): apiManagerProxy.invoke(
 * "manager", { name, method, args, accountNumber }, withAck) is what every
 * manager proxy calls (src/lib/getProxiedManagers.ts); ChatInput's
 * sendMessageWithForward reads a field, or text it is handed, and calls
 * appMessagesManager.sendText({ ...sendTextParams, ...sendingParams, text,
 * entities, richMessage, noWebPage, webPage, webPageOptions, invertMedia });
 * saveEditedMessage calls editMessage(message, text, options); a bot's
 * keyboard calls sendText({ peerId, threadId, text }) straight; the AI
 * Editor's own send goes through sendMessageWithForward with text and no field
 * (src/components/chat/inputState/createAiEditorContext.ts).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const CHANNEL = -1234567890;
export const GROUP = -55;

export function makeWebK() {
    const calls = [];
    const restored = [];

    const peers = {
        [CHANNEL]: { _: "channel", id: 1234567890, title: "Book club" },
        [GROUP]: { _: "chat", id: 55, title: "Family" },
        5001: { _: "user", id: 5001, first_name: "Hoshi" },
        4242: { _: "user", id: 4242, first_name: "Mozumi", pFlags: { self: true } }
    };

    const history = {
        4401: { _: "message", mid: 4401, peerId: CHANNEL, fromId: 5001, message: "кто идёт в субботу?", pFlags: {} },
        4403: { _: "message", mid: 4403, peerId: CHANNEL, fromId: 4242, message: "я", pFlags: { out: true } },
        4402: { _: "messageService", mid: 4402, peerId: CHANNEL, action: {} },
        4404: {
            _: "message", mid: 4404, peerId: CHANNEL, fromId: 5001, message: "смотри это", pFlags: {},
            totalEntities: [{ _: "messageEntityBold", offset: 7, length: 3 }]
        }
    };

    const apiManagerProxy = {
        mirrors: { messages: { [`${CHANNEL}_history`]: history }, peers },
        getPeer: peerId => peers[peerId],
        getMessageByPeer: (peerId, mid) => apiManagerProxy.mirrors.messages[`${peerId}_history`]?.[mid],
        invoke(type, payload, withAck) {
            calls.push({ type, payload, withAck });
            return Promise.resolve(withAck ? { cached: false, result: Promise.resolve("done") } : "done");
        }
    };

    /** createProxy: a manager's method is apiManagerProxy.invoke, read at call time. */
    const manager = name => new Proxy({}, {
        get: (_, method) => (...args) => apiManagerProxy.invoke("manager", { name, method, args, accountNumber: 1 }, false)
    });
    const managers = { appMessagesManager: manager("appMessagesManager") };

    class ChatInput {
        constructor(chat) {
            this.chat = chat;
            this.Class = ChatInput;
            this.messageInputField = { input: { value: "", entities: [] } };
            this.messageInputEditor = {
                isEmpty: () => !this.messageInputField.input.value,
                replaceAllText: (text, entities) => {
                    restored.push({ text, entities });
                    return true;
                }
            };
        }

        static async sendMessageWithForward({ inputField, text, sendingParams, sendTextParams = {} }) {
            const value = inputField ? inputField.input.value : text.text;
            const entities = inputField ? inputField.input.entities : text.entities || [];
            if (inputField) inputField.input.value = "";
            // The real one asks for the config and a payment first.
            await Promise.resolve();
            const richMessage = sendTextParams.richMessage;
            managers.appMessagesManager.sendText({
                ...sendTextParams,
                ...sendingParams,
                text: value,
                entities,
                richMessage,
                noWebPage: richMessage ? true : sendTextParams.noWebPage,
                webPage: undefined,
                webPageOptions: richMessage ? undefined : sendTextParams.webPageOptions,
                invertMedia: undefined
            });
            return { value, messageCount: 1 };
        }

        async sendMessage() {
            if (this.editMsgId) return this.saveEditedMessage();
            return ChatInput.sendMessageWithForward({
                inputField: this.messageInputField,
                sendingParams: { peerId: this.chat.peerId, threadId: undefined },
                sendTextParams: { noWebPage: undefined, webPageOptions: {}, clearDraft: true }
            });
        }

        async saveEditedMessage() {
            await Promise.resolve();
            const { value, entities } = this.messageInputField.input;
            return managers.appMessagesManager.editMessage(this.editMessage, value, {
                entities, richMessage: undefined, noWebPage: false, webPage: undefined, webPageOptions: {}, invertMedia: undefined
            });
        }
    }

    const chat = { peerId: CHANNEL };
    chat.input = new ChatInput(chat);

    return {
        calls, restored, peers, history, apiManagerProxy, managers, ChatInput,
        appImManager: { chat },
        rootScope: { myId: 4242 },
        /** Typing into the chat bar and pressing Enter. */
        type(text, entities = []) {
            chat.input.messageInputField.input = { value: text, entities };
            return chat.input.sendMessage();
        },
        /** The AI Editor's own send button, with the text it wrote. */
        aiEditorSend: (text, entities = []) => ChatInput.sendMessageWithForward({
            text: { text, entities }, sendTextParams: { richMessage: undefined, noWebPage: true }, sendingParams: { peerId: chat.peerId }
        }),
        /** A bot's keyboard button, which sends its label as it is. */
        keyboardButton: label => managers.appMessagesManager.sendText({ peerId: chat.peerId, threadId: undefined, text: label }),
        /** Changing a scheduled message's time from its menu, which edits it with its own text. */
        reschedule: message => managers.appMessagesManager.editMessage(message, message.message, { scheduleDate: 1, entities: [] })
    };
}
