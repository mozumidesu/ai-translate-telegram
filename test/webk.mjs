/*
 * AI Translate for Telegram — Web K's manager line, against its own calls.
 *
 * The real install() is run against a page shaped like Web K's
 * (fixtures/webk.mjs): the proxy is mounted after the script, as it is on the
 * real page, and the calls are made the way the chat bar, the AI Editor, a
 * bot's keyboard and the edit path make them.
 *
 * Run it:  node test/webk.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CHANNEL, GROUP, makeWebK } from "./fixtures/webk.mjs";
import { fakeManager, fakeProvider, settle } from "./fakes.mjs";
import { built, check, done } from "./lib.mjs";

const store = fakeManager();
const provider = fakeProvider();
// What restore() reads of the page.
globalThis.document = { visibilityState: "visible" };

const K = makeWebK();
globalThis.appImManager = K.appImManager;
globalThis.rootScope = K.rootScope;

const { useHost, forgetAnswers, telegramHost, webK, chatIdOf, peerIdOf, fromK, toK, TYPED } = await built(
    `export { useHost } from "./ai-translate/core/host";\n`
    + `export { forgetAnswers } from "./ai-translate/core/translate";\n`
    + `export { telegramHost } from "./src/host";\n`
    + `export { webK, chatIdOf, peerIdOf, fromK, toK, TYPED } from "./src/webk";\n`
);

const notices = [];
useHost({ ...telegramHost(webK), notice: (text, kind) => notices.push([kind, text]) });

// Before Web K's own code: the proxy is not there yet.
webK.install();
check("the script waits for the proxy rather than missing it", typeof globalThis.apiManagerProxy, "undefined");
globalThis.apiManagerProxy = K.apiManagerProxy;
check("and wraps its invoke the moment it is mounted", K.apiManagerProxy.invoke.aiTranslate, true);
check("the chat bar's class is marked once it can be reached", K.ChatInput.aiTranslate, true);

const sent = () => K.calls.filter(c => c.payload.name === "appMessagesManager").map(c => c.payload);
const reset = () => {
    K.calls.length = 0;
    K.restored.length = 0;
    provider.asked.length = 0;
    notices.length = 0;
    forgetAnswers();
};

// --- chats

check("a channel is -100 and its id, as the Bot API and Web A write it", chatIdOf(CHANNEL), "-1001234567890");
check("a basic group stays minus its id", chatIdOf(GROUP), "-55");
check("a user is their id", chatIdOf(5001), "5001");
check("and back to Web K's peer id", [peerIdOf("-1001234567890"), peerIdOf("-55"), peerIdOf("5001")], [CHANNEL, GROUP, 5001]);
check("the open chat in the same terms", webK.openChat(), "-1001234567890");

// --- entities

check("entities are read in the layer's shape", fromK({ _: "messageEntityCustomEmoji", offset: 0, length: 2, document_id: "5368" }),
    { kind: "emoji", offset: 0, length: 2, documentId: "5368", extra: { document_id: "5368" } });
check("and written back with what they carried", toK(fromK({ _: "messageEntityBlockquote", offset: 0, length: 5, pFlags: { collapsed: true } })),
    { pFlags: { collapsed: true }, _: "messageEntityBlockquote", offset: 0, length: 5 });

// --- the chat bar

reset();
provider.reply = () => "[ru] this is **very** important";
await K.type("это очень важно", [{ _: "messageEntityBold", offset: 4, length: 5 }]);
await settle();
const [typed] = sent();
check("what was typed is sent translated", typed?.args[0].text, "this is very important");
check("with the bold over the translated word, in the layer's shape", typed?.args[0].entities, [{ _: "messageEntityBold", offset: 8, length: 4 }]);
check("the model was shown the marks", provider.lastMessage, "это **очень** важно");
check("the script's own mark does not travel on", Object.getOwnPropertySymbols(typed?.args[0] ?? {}).length, 0);
check("and what the chat bar sent with it does", [typed?.args[0].peerId, typed?.args[0].clearDraft], [CHANNEL, true]);

reset();
K.appImManager.chat.peerId = GROUP;
await K.type("привет");
await settle();
check("a chat that is not switched on is not asked about", [sent()[0]?.args[0].text, provider.asked.length], ["привет", 0]);
K.appImManager.chat.peerId = CHANNEL;

// --- what nobody typed

reset();
await K.keyboardButton("Да");
await settle();
check("a bot's keyboard button goes word for word", [sent()[0]?.args[0].text, provider.asked.length], ["Да", 0]);

reset();
await K.aiEditorSend("Hello, everyone");
await settle();
check("the AI Editor's own send goes as it wrote it", [sent()[0]?.args[0].text, provider.asked.length], ["Hello, everyone", 0]);

reset();
await K.type("/start");
await settle();
check("a command to a bot goes as typed", [sent()[0]?.args[0].text, provider.asked.length], ["/start", 0]);

// --- edits

reset();
provider.reply = () => "[ru] fixed it";
K.appImManager.chat.input.editMsgId = 4403;
K.appImManager.chat.input.editMessage = K.history[4403];
await K.type("исправил");
await settle();
check("an edit from the chat bar is translated", [sent()[0]?.method, sent()[0]?.args[1]], ["editMessage", "fixed it"]);
K.appImManager.chat.input.editMsgId = undefined;

reset();
await K.reschedule(K.history[4403]);
await settle();
check("an edit nobody typed, a new time for a scheduled message, goes as it is", [sent()[0]?.args[1], provider.asked.length], ["я", 0]);

// --- order

reset();
provider.reply = text => `[ru] ${text === "первое" ? "first" : "second"}`;
await K.type("первое");
await K.type("второе");
const sticker = K.managers.appMessagesManager.sendOther({ peerId: CHANNEL, inputMedia: { _: "inputMediaDocument" } });
check("a sticker sent meanwhile waits too", sent().length, 0);
await sticker;
await settle();
check("and everything arrives in the order it was sent", sent().map(p => p.method + ":" + (p.args[0].text ?? "sticker")),
    ["sendText:first", "sendText:second", "sendOther:sticker"]);

// --- a translation that fails

reset();
provider.reply = () => 401;
const answer = await K.type("не переводится").then(() => settle());
check("held back, nothing is sent", sent().length, 0);
check("the text goes back into the chat bar", K.restored, [{ text: "не переводится", entities: [] }]);
check("and the person is told why", notices[0]?.[0], "failure");
void answer;

reset();
store.aiTranslateSettings.onError = "sendAsTyped";
await K.type("отправь как есть");
await settle();
check("with sendAsTyped the original goes", sent()[0]?.args[0].text, "отправь как есть");
store.aiTranslateSettings.onError = "hold";

// --- what is shown

check("the conversation comes from the mirrors, oldest first, without service messages",
    webK.recent("-1001234567890").map(m => [m.authorName, m.content]),
    [["Hoshi", "кто идёт в субботу?"], ["Mozumi", "я"], ["Hoshi", "смотри это"]]);
check("the person's own message is theirs", webK.recent("-1001234567890")[1].authorId, "4242");
check("the chat's name, for the panel", webK.chatTitle("-1001234567890"), "Book club");

done();
