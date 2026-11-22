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

import { mock } from "node:test";
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
check("and says until then that it is not in front of the sending", webK.unhooked(), "Web K: apiManagerProxy.invoke has not been reached");
globalThis.apiManagerProxy = K.apiManagerProxy;
check("and wraps its invoke the moment it is mounted", K.apiManagerProxy.invoke["ai-translate"], true);
check("the chat bar's class is marked once it can be reached", K.ChatInput["ai-translate"], true);
check("and then the hooks are in", webK.unhooked(), undefined);

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

// Editing is how a translation is put right, so an edit goes exactly as typed, in a chat that is on as well.
reset();
provider.reply = () => "[ru] fixed it";
K.appImManager.chat.input.editMsgId = 4403;
K.appImManager.chat.input.editMessage = K.history[4403];
await K.type("исправил", [{ _: "messageEntityBold", offset: 0, length: 8 }]);
await settle();
check("an edit from the chat bar goes exactly as typed, in a chat that is on",
    [sent()[0]?.method, sent()[0]?.args[1], sent()[0]?.args[2].entities, provider.asked.length],
    ["editMessage", "исправил", [{ _: "messageEntityBold", offset: 0, length: 8 }], 0]);
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

// --- a provider that does not answer

// Order is kept within a chat; a slow translation in one holds nothing in another.
reset();
provider.reply = () => null;
mock.timers.enable({ apis: ["setTimeout"] });
await K.type("ты тут?");
const elsewhere = [
    K.managers.appMessagesManager.sendOther({ peerId: GROUP, inputMedia: { _: "inputMediaDocument" } }),
    K.managers.appMessagesManager.forwardMessages({ peerId: GROUP, fromPeerId: CHANNEL, mids: [4401] }),
    K.managers.appMessagesManager.sendScheduledMessages(GROUP, [7])
];
void K.managers.appMessagesManager.sendOther({ peerId: CHANNEL, inputMedia: { _: "inputMediaDocument" } });
// Timers are the test's now; what is ready runs on the next turns.
const turns = async () => {
    for (let i = 0; i < 20; i++) await new Promise(next => setImmediate(next));
};
void elsewhere;
await turns();
check("while a message waits for a provider that does not answer, a sticker, a forward and a scheduled send in another chat go at once",
    sent().map(p => p.method), ["sendOther", "forwardMessages", "sendScheduledMessages"]);
K.calls.length = 0;
mock.timers.tick(60_000);
mock.timers.reset();
await settle();
check("and the message is given up on after a minute, whatever the provider does, and goes back into the box",
    K.restored.map(r => r.text), ["ты тут?"]);
check("with the reason", notices.at(-1), ["failure", "AI Translate: Network error: timed out"]);
check("and what was waiting behind it in its chat goes then", sent().map(p => p.method), ["sendOther"]);

// --- a translation that fails

reset();
provider.reply = () => 401;
const answer = await K.type("не переводится").then(() => settle());
check("held back, nothing is sent", sent().length, 0);
check("the text goes back into the chat bar", K.restored, [{ text: "не переводится", entities: [] }]);
check("and the person is told why", notices[0]?.[0], "failure");
void answer;

// Held once by a busy provider, the same text sent again once it answers goes, translated.
reset();
provider.reply = () => 429;
await K.type("привет, как дела сегодня");
await settle();
check("a message held by a refusal", sent().length, 0);
reset();
provider.reply = () => "[ru] hi, how are you today";
await K.type("привет, как дела сегодня");
await settle();
check("is asked about again when it is sent again, and goes once the provider answers",
    [provider.asked.length, sent()[0]?.args[0].text], [1, "hi, how are you today"]);

reset();
store["ai-translate-settings"].onError = "sendAsTyped";
provider.reply = () => 401;
await K.type("отправь как есть");
await settle();
check("with sendAsTyped the original goes", sent()[0]?.args[0].text, "отправь как есть");
store["ai-translate-settings"].onError = "hold";

// --- AI Learn

reset();
store["ai-translate-settings"].aiLearn = true;
provider.reply = () => "Shall we meet tomorrow at noon?\nwhy: \"at noon\", not \"in noon\"";
await K.type("shall we meet tomorrow in noon?");
// Before the provider could have answered: the chat waits on nothing.
check("AI Learn: a message in the alphabet it would be translated into goes at once, as typed",
    sent().map(p => p.args[0].text), ["shall we meet tomorrow in noon?"]);
check("AI Learn: without the script's own mark", Object.getOwnPropertySymbols(sent()[0]?.args[0] ?? {}).length, 0);
await settle();
check("AI Learn: and a native speaker's version is asked for on the side", provider.lastMessage, "shall we meet tomorrow in noon?");
check("AI Learn: with the prompt that asks for one", provider.asked.at(-1)?.messages[0].content.includes("Give the version a native speaker of English would have written"), true);
check("AI Learn: the correction is kept, for Corrections", JSON.parse(store["ai-translate-settings"].learnHistory)
    .map(c => [c.typed, c.native, c.why]), [["shall we meet tomorrow in noon?", "Shall we meet tomorrow at noon?", "\"at noon\", not \"in noon\""]]);

reset();
await K.type("please keep \\Book club\\ the way it is");
await settle();
check("AI Learn: the writer's own backslashes come off, as they would in a translation",
    [sent()[0]?.args[0].text, provider.lastMessage], ["please keep Book club the way it is", "please keep Book club the way it is"]);

reset();
K.appImManager.chat.input.editMsgId = 4403;
K.appImManager.chat.input.editMessage = K.history[4403];
await K.type("see you on \\saturday\\ then");
await settle();
check("AI Learn: an edit is not looked at, and goes as typed, its backslashes too",
    [sent()[0]?.args[1], provider.asked.length], ["see you on \\saturday\\ then", 0]);
K.appImManager.chat.input.editMsgId = undefined;

reset();
provider.reply = () => 401;
await K.type("this one will not be looked at");
await settle();
check("AI Learn: a correction nobody asked for fails without a word", [sent().length, notices], [1, []]);

reset();
provider.reply = () => "[ru] I am on my way";
await K.type("я уже в пути, скоро буду");
await settle();
check("AI Learn: a message in another alphabet is still translated", sent()[0]?.args[0].text, "I am on my way");
store["ai-translate-settings"].aiLearn = false;
store["ai-translate-settings"].learnHistory = "";

// --- what is shown

check("the conversation comes from the mirrors, oldest first, without service messages",
    webK.recent("-1001234567890").map(m => [m.authorName, m.content]),
    [["Hoshi", "кто идёт в субботу?"], ["Mozumi", "я"], ["Hoshi", "смотри это"]]);
check("the person's own message is theirs", webK.recent("-1001234567890")[1].authorId, "4242");
check("the chat's name, for the panel", webK.chatTitle("-1001234567890"), "Book club");

done();
