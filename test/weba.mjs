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
check("an edit does", typedIn(A.edit("исправил"))?.text, "исправил");
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

// --- edits and paid messages

reset();
provider.reply = () => "[ru] fixed it";
worker.postMessage({ payloads: [A.edit("исправил")] });
await settle();
check("an edit is translated too, as on Discord", worker.sent[0]?.payloads[0].args[0].text, "fixed it");

reset();
provider.reply = () => "[ru] paid hello";
worker.postMessage({ payloads: [A.paidLocal("платный привет")] });
await settle();
worker.postMessage({ payloads: [A.paidSend("платный привет", { id: 4405 })] });
await settle();
check("a paid message is drawn translated and sent translated", worker.sent.map(m => [m.payloads[0].name, m.payloads[0].args[0].text]),
    [["sendMessageLocal", "paid hello"], ["sendMessage", "paid hello"]]);
check("and the provider is asked once for both", provider.asked.length, 1);

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
store.aiTranslateSettings.onError = "sendAsTyped";
provider.reply = () => 401;
worker.postMessage({ payloads: [A.typed("отправь как есть")] });
await settle();
check("with sendAsTyped the original goes instead", worker.sent[0]?.payloads[0].args[0].text, "отправь как есть");
store.aiTranslateSettings.onError = SETTINGS.onError;

// --- what the worker answers

readAnswer({ payloads: [A.history, A.updates] });
check("the conversation is read from the worker's answers, oldest first", webA.recent(A.chat.id).map(m => [m.authorName ?? "", m.content]),
    [["Hoshi", "кто идёт в субботу?"], ["Kaii M", "я, но опоздаю"], ["Mozumi", "уже еду"]]);
check("a message without text is not part of it", webA.recent(A.chat.id).some(m => m.id === "4403"), false);
check("the signed-in user comes from the update that names them", webA.meId(), "4242");
check("and their own message is theirs", webA.recent(A.chat.id).at(-1).authorId, "4242");

done();
