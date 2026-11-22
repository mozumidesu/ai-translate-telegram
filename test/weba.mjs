/*
 * AI Translate for Telegram — Web A's worker line, against recorded calls.
 *
 * The real watchWorker wraps a fake worker, and the calls in fixtures/weba.mjs
 * are posted to it the way connector.ts posts them. What the worker receives
 * is what Telegram would: the order, the text, the entities, and nothing at
 * all when a message is held back.
 *
 * Run it:  node test/weba.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mock } from "node:test";
import * as A from "./fixtures/weba.mjs";
import { fakeManager, fakeProvider, settle, SETTINGS } from "./fakes.mjs";
import { built, check, done } from "./lib.mjs";

const store = fakeManager();
const provider = fakeProvider();

const { useHost, forgetAnswers, telegramHost, watchWorker, typedIn, readAnswer, webA, fromA, toA } = await built(
    `export { useHost } from "./ai-translate/core/host";\n`
    + `export { forgetAnswers } from "./ai-translate/core/translate";\n`
    + `export { telegramHost } from "./src/host";\n`
    + `export { watchWorker, typedIn, readAnswer, webA, fromA, toA } from "./src/weba";\n`
);

const notices = [];
useHost({ ...telegramHost(webA), notice: (text, kind) => notices.push([kind, text]) });

/** A worker that keeps what it is sent, and what it says back to the page. */
class FakeWorker extends EventTarget {
    sent = [];
    postMessage(message) {
        this.sent.push(structuredClone(message));
    }
}

const restored = [];
const worker = new FakeWorker();
const answered = [];
worker.addEventListener("message", event => answered.push(event.data));
watchWorker(worker, (chatId, text, entities) => restored.push({ chatId, text, entities }), readAnswer);

const sentNames = () => worker.sent.flatMap(m => m.payloads.map(p => p.name ?? p.type));
const reset = () => {
    worker.sent.length = 0;
    answered.length = 0;
    restored.length = 0;
    provider.asked.length = 0;
    notices.length = 0;
    forgetAnswers();
};

// --- which calls carry typed text

check("the chat bar's send carries typed text", typedIn(A.typed("привет", undefined))?.text, "привет");
check("a bot's button does not: it says nothing about a draft", typedIn(A.botButton("Да")), undefined);
check("an edit does not: it goes as typed", typedIn(A.edit("исправил")), undefined);
check("a call with no text does not", typedIn(A.markRead()), undefined);
check("entities are read in Web A's shape", fromA({ type: "MessageEntityTextUrl", offset: 1, length: 2, url: "https://x.org" }),
    { kind: "link", offset: 1, length: 2, url: "https://x.org" });
check("and written back in it", toA({ kind: "mention", offset: 0, length: 4, userId: "5001" }),
    { type: "MessageEntityMentionName", offset: 0, length: 4, userId: "5001" });
check("an entity the script has no use for is left out", fromA({ type: "MessageEntityHashtag", offset: 0, length: 3 }), undefined);

// --- a typed message in a chat that is switched on

reset();
provider.reply = () => "[ru] this is **very** important";
const message = A.typed("это очень важно", [{ type: "MessageEntityBold", offset: 4, length: 5 }]);
const read = A.markRead();
worker.postMessage({ payloads: [message, read] });

check("a call beside it goes at once", sentNames(), ["markMessageListRead"]);
await settle();
check("the message goes once it is translated", sentNames(), ["markMessageListRead", "sendMessage"]);
const out = worker.sent[1].payloads[0];
check("the model was shown the formatting as marks", provider.lastMessage, "это **очень** важно");
check("and the worker is handed the translation", out.args[0].text, "this is very important");
check("with the bold where the bold word is now", out.args[0].entities, [{ type: "MessageEntityBold", offset: 8, length: 4 }]);
check("under the same message id, so the app's promise settles", out.messageId, message.messageId);
check("and everything else as the app wrote it", [out.args[0].chat.id, out.args[0].lastMessageId, out.args[0].wasDrafted],
    [A.chat.id, 4410, false]);

// --- what goes as it is

reset();
worker.postMessage({ payloads: [A.typed("привет", undefined, { into: A.otherChat })] });
check("a chat that is not switched on is not asked about", [sentNames(), provider.asked.length], [["sendMessage"], 0]);

reset();
worker.postMessage({ payloads: [A.botButton("Да")] });
check("a bot's button goes word for word", [sentNames(), provider.asked.length], [["sendMessage"], 0]);

reset();
worker.postMessage({ payloads: [A.typed("/start@helper_bot сегодня")] });
check("so does a command typed to a bot", [worker.sent[0]?.payloads[0].args[0].text, provider.asked.length], ["/start@helper_bot сегодня", 0]);

reset();
worker.postMessage({ payloads: [A.typed("@durov_helper_bot")] });
check("and a message that is only a username", [sentNames(), provider.asked.length], [["sendMessage"], 0]);

reset();
const init = A.initApi();
worker.postMessage({ payloads: [init] });
check("a call that is not a method at all is left alone", worker.sent[0]?.payloads[0], init);

// --- order

reset();
provider.reply = text => (text.includes("отпуска") ? "[ru] holiday photos" : "[ru] second");
const [caption, photo] = A.album();
const typing = A.typing();
worker.postMessage({ payloads: [caption, photo, typing] });
check("typing is said at once", sentNames(), ["sendMessageAction"]);
await settle();
check("the album's next photo waits behind its caption", sentNames(), ["sendMessageAction", "sendMessage", "sendMessage"]);
check("in the order the app sent them", worker.sent.slice(1).map(m => m.payloads[0].messageId), [caption.messageId, photo.messageId]);
check("and the caption is translated", worker.sent[1].payloads[0].args[0].text, "holiday photos");

reset();
provider.reply = text => `[ru] ${text === "первое" ? "first" : "second"}`;
worker.postMessage({ payloads: [A.typed("первое")] });
worker.postMessage({ payloads: [A.typed("второе")] });
await settle();
check("two messages sent quickly arrive in the order they were typed", worker.sent.map(m => m.payloads[0].args[0].text), ["first", "second"]);

// --- a provider that does not answer

// Order is kept within a chat; a slow translation in one holds nothing in another.
mock.timers.enable({ apis: ["setTimeout"] });
reset();
provider.reply = () => null;
const slow = A.typed("ты тут?");
worker.postMessage({ payloads: [slow] });
worker.postMessage({ payloads: [A.typed("привет", undefined, { into: A.otherChat }), A.reaction(A.otherChat), A.forward(A.otherChat)] });
worker.postMessage({ payloads: [A.photo()] });
for (let i = 0; i < 20; i++) await new Promise(next => setImmediate(next));
check("while a message waits for a provider that does not answer, a send, a reaction and a forward in another chat go at once",
    sentNames(), ["sendMessage", "sendReaction", "forwardMessages"]);
worker.sent.length = 0;
mock.timers.tick(60_000);
mock.timers.reset();
await settle();
check("and the message is given up on after a minute, whatever the provider does, and goes back into the box",
    [restored.map(r => r.text), answered.at(-1)?.payloads?.[0].messageId], [["ты тут?"], slow.messageId]);
check("with the reason", notices.at(-1), ["failure", "AI Translate: Network error: timed out"]);
check("and what was waiting behind it in its chat goes then", sentNames(), ["sendMessage"]);

// --- edits and paid messages

// Editing is how a translation is put right, so an edit goes exactly as typed, in a chat that is on as well.
reset();
provider.reply = () => "[ru] fixed it";
worker.postMessage({ payloads: [A.edit("исправил", [{ type: "MessageEntityBold", offset: 0, length: 8 }])] });
check("an edit goes at once, exactly as typed, in a chat that is on",
    [worker.sent[0]?.payloads[0].args[0].text, worker.sent[0]?.payloads[0].args[0].entities, provider.asked.length],
    ["исправил", [{ type: "MessageEntityBold", offset: 0, length: 8 }], 0]);
await settle();
check("and the provider is never asked about it", provider.asked.length, 0);

reset();
provider.reply = () => null;
mock.timers.enable({ apis: ["setTimeout"] });
worker.postMessage({ payloads: [A.typed("ещё одно")] });
worker.postMessage({ payloads: [A.edit("поправка")] });
for (let i = 0; i < 20; i++) await new Promise(next => setImmediate(next));
check("an edit made while a message of its chat is being translated waits behind it, so the two keep their order", sentNames(), []);
mock.timers.tick(60_000);
mock.timers.reset();
await settle();
check("and goes as typed once that message is settled", worker.sent.map(m => [m.payloads[0].name, m.payloads[0].args[0].text]), [["editMessage", "поправка"]]);

reset();
provider.reply = () => "[ru] paid hello";
worker.postMessage({ payloads: [A.paidLocal("платный привет")] });
await settle();
worker.postMessage({ payloads: [A.paidSend("платный привет", { id: 4405 })] });
await settle();
check("a paid message is drawn translated and sent translated", worker.sent.map(m => [m.payloads[0].name, m.payloads[0].args[0].text]),
    [["sendMessageLocal", "paid hello"], ["sendMessage", "paid hello"]]);
check("and the provider is asked once for both", provider.asked.length, 1);

// --- what a translation is remembered by

// The same text within ten minutes is answered from memory, but only when nothing that changes the answer has changed.
reset();
provider.reply = () => "[ru] see you tomorrow";
worker.postMessage({ payloads: [A.typed("до завтра")] });
await settle();
store["ai-translate-settings"].sentLanguage = "Japanese";
provider.reply = () => "[ru] また明日";
worker.postMessage({ payloads: [A.typed("до завтра")] });
await settle();
check("the same text after the language is changed is asked about again, in the new language",
    [provider.asked.length, worker.sent.map(m => m.payloads[0].args[0].text)], [2, ["see you tomorrow", "また明日"]]);
store["ai-translate-settings"].sentLanguage = SETTINGS.sentLanguage;

reset();
provider.reply = text => `[ru] here is [the article](${/\((.*)\)/.exec(text)[1]})`;
const linked = url => A.typed("вот статья", [{ type: "MessageEntityTextUrl", offset: 4, length: 6, url }]);
worker.postMessage({ payloads: [linked("https://example.com/one")] });
await settle();
worker.postMessage({ payloads: [linked("https://example.com/two")] });
await settle();
check("and the same text with its link changed goes with the new link",
    worker.sent.map(m => m.payloads[0].args[0].entities?.[0]?.url), ["https://example.com/one", "https://example.com/two"]);

reset();
provider.reply = text => `[ru] ${text.replace("привет", "hi")}`;
const mention = userId => A.typed("Ваня, привет", [{ type: "MessageEntityMentionName", offset: 0, length: 4, userId }]);
worker.postMessage({ payloads: [mention("5001")] });
await settle();
worker.postMessage({ payloads: [mention("5002")] });
await settle();
check("and a mention of someone else names them",
    worker.sent.map(m => m.payloads[0].args[0].entities?.find(e => e.type === "MessageEntityMentionName")?.userId), ["5001", "5002"]);

// --- a translation that fails

// A refused key, which the core does not ask again about, unlike an overloaded provider.
reset();
provider.reply = () => 401;
const held = A.typed("не переводится");
worker.postMessage({ payloads: [held] });
await settle();
check("held back, nothing reaches the worker", sentNames(), []);
check("the app's own promise is settled with nothing", answered.at(-1)?.payloads?.[0], { type: "methodResponse", messageId: held.messageId });
check("the text goes back into the chat box", restored, [{ chatId: A.chat.id, text: "не переводится", entities: [] }]);
check("and the person is told why", notices.length > 0 && notices[0][0], "failure");

reset();
provider.reply = () => 401;
worker.postMessage({ payloads: [A.paidLocal("платное не переводится")] });
await settle();
check("a paid message held back goes back into the box too: Web A sends nothing on after it", restored.map(r => r.text), ["платное не переводится"]);

// Held once by a busy provider, the same text sent again once it answers goes, translated.
reset();
provider.reply = () => 429;
worker.postMessage({ payloads: [A.typed("привет, как дела сегодня")] });
await settle();
check("a message held by a refusal", sentNames(), []);
reset();
provider.reply = () => "[ru] hi, how are you today";
worker.postMessage({ payloads: [A.typed("привет, как дела сегодня")] });
await settle();
check("is asked about again when it is sent again, and goes once the provider answers",
    [provider.asked.length, worker.sent[0]?.payloads[0].args[0].text], [1, "hi, how are you today"]);

reset();
store["ai-translate-settings"].onError = "sendAsTyped";
provider.reply = () => 401;
worker.postMessage({ payloads: [A.typed("отправь как есть")] });
await settle();
check("with sendAsTyped the original goes instead", worker.sent[0]?.payloads[0].args[0].text, "отправь как есть");
store["ai-translate-settings"].onError = SETTINGS.onError;

// --- AI Learn

reset();
store["ai-translate-settings"].aiLearn = true;
provider.reply = () => "See you on Saturday then.";
worker.postMessage({ payloads: [A.typed("see you at saturday then"), A.markRead()] });
check("AI Learn: a message written in English goes at once, as typed, with what came with it",
    [sentNames(), worker.sent[0]?.payloads[0].args[0].text, provider.asked.length], [["sendMessage", "markMessageListRead"], "see you at saturday then", 0]);
await settle();
check("AI Learn: and a native speaker's version is asked for on the side", provider.lastMessage, "see you at saturday then");

reset();
worker.postMessage({ payloads: [A.paidLocal("one more message for the club"), A.paidSend("one more message for the club")] });
await settle();
check("AI Learn: a paid message, drawn and then sent, is looked at once", provider.asked.length, 1);

reset();
worker.postMessage({ payloads: [A.edit("see you on \\saturday\\ then")] });
await settle();
check("AI Learn: an edit is not looked at, and goes as typed, its backslashes too",
    [worker.sent[0]?.payloads[0].args[0].text, provider.asked.length], ["see you on \\saturday\\ then", 0]);
store["ai-translate-settings"].aiLearn = false;
store["ai-translate-settings"].learnHistory = "";

// --- what the worker answers

readAnswer({ payloads: [A.history, A.updates] });
check("the conversation is read from the worker's answers, oldest first", webA.recent(A.chat.id).map(m => [m.authorName ?? "", m.content]),
    [["Hoshi", "кто идёт в субботу?"], ["Kaii M", "я, но опоздаю"], ["Mozumi", "уже еду"]]);
check("a message without text is not part of it", webA.recent(A.chat.id).some(m => m.id === "4403"), false);
check("the signed-in user comes from the update that names them", webA.meId(), "4242");
check("and their own message is theirs", webA.recent(A.chat.id).at(-1).authorId, "4242");

done();
