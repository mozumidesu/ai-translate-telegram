/*
 * AI Translate for Telegram — the built userscript in a real browser.
 *
 * dist/ai-translate.user.js, built afresh from the sources, is put into pages
 * shaped like Web A and Web K (fixtures/weba.html, fixtures/webk.html) at
 * document-start, the way a userscript manager runs it, with the manager's
 * storage and request faked. Then what a person does: the button in the chat
 * bar, a chat switched on, a message sent, a message read from its menu, a
 * translation that fails and gives the text back.
 *
 *   node test/page.mjs        needs Playwright and its Chromium
 *
 * Without Playwright it says so and passes, unless REQUIRE_BROWSER is set,
 * which is how the checks workflow runs it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFileSync } from "child_process";
import { mkdtemp, readFile } from "fs/promises";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { check, done, ROOT } from "./lib.mjs";

let chromium;
try {
    ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
    console.log("SKIP: no Playwright here. npm i playwright && npx playwright install chromium");
    process.exit(process.env.REQUIRE_BROWSER ? 1 : 0);
}

const out = await mkdtemp(join(tmpdir(), "ai-translate-telegram-dist-"));
execFileSync(process.execPath, [join(ROOT, "build.mjs"), `--out=${out}`], { stdio: "pipe" });
const script = await readFile(join(out, "ai-translate.user.js"), "utf8");

/** The settings a page starts from: Groq with a key, the Book club chat switched on. */
const SETTINGS = {
    provider: "groq", groqApiKey: "test-key", groqModel: "openai/gpt-oss-120b",
    sentLanguage: "English", receivedLanguage: "English", mode: "perChannel", enabledChannels: "-1001234567890", onError: "hold"
};

/**
 * The userscript manager, as far as the script uses it, and shadow roots a
 * test can look into. Every notice ever drawn is noted in __gm.toasts, so one
 * that came and went between two looks is still seen.
 */
const manager = saved => `
window.__gm = {
    store: { aiTranslateSettings: ${JSON.stringify(saved)} },
    asked: [],
    listeners: [],
    toasts: [],
    reply: () => "[ru] translated",
    change(name, value) {
        this.store.aiTranslateSettings[name] = value;
        for (const listener of this.listeners) listener("aiTranslateSettings", null, null, true);
    }
};
var unsafeWindow = window;
function GM_getValue(name, fallback) { return name in __gm.store ? JSON.parse(JSON.stringify(__gm.store[name])) : fallback; }
function GM_setValue(name, value) { __gm.store[name] = JSON.parse(JSON.stringify(value)); }
function GM_addValueChangeListener(name, listener) { __gm.listeners.push(listener); }
function GM_registerMenuCommand(name, run) { __gm.menu = { name, run }; }
function GM_xmlhttpRequest(options) {
    const body = JSON.parse(options.data);
    __gm.asked.push(body.messages.at(-1).content);
    const answer = __gm.reply(body.messages.at(-1).content);
    setTimeout(() => options.onload(typeof answer === "number"
        ? { status: answer, responseText: "{}", responseHeaders: "" }
        : { status: 200, responseText: JSON.stringify({ choices: [{ message: { content: answer }, finish_reason: "stop" }] }), responseHeaders: "" }), 5);
    return { abort() {} };
}
const attach = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
    const root = attach.call(this, { ...init, mode: "open" });
    new MutationObserver(records => {
        for (const record of records)
            for (const node of record.addedNodes)
                if (node.classList?.contains("toast")) __gm.toasts.push(node.textContent);
    }).observe(root, { childList: true, subtree: true });
    return root;
};
`;

const FILES = {
    "/k/": ["fixtures/webk.html", "text/html"],
    "/k/webk-fixture.mjs": ["fixtures/webk.mjs", "text/javascript"],
    "/a/": ["fixtures/weba.html", "text/html"]
};

const browser = await chromium.launch();
const context = await browser.newContext();
await context.route("https://web.telegram.org/**", async route => {
    const file = FILES[new URL(route.request().url()).pathname];
    if (!file) return route.fulfill({ status: 404, body: "" });
    await route.fulfill({ status: 200, contentType: file[1], body: await readFile(join(ROOT, "test", file[0])) });
});
await context.addInitScript({ content: `${manager(SETTINGS)}\n${script}` });

/** What our shadow root holds, read through the open root the test asked for. */
const ours = (page, selector) => page.evaluate(selector => {
    const root = document.getElementById("ai-translate-telegram")?.shadowRoot;
    return [...(root?.querySelectorAll(selector) ?? [])].map(e => e.textContent);
}, selector);

const waitOurs = (page, selector, text) => page.waitForFunction(([selector, text]) => {
    const root = document.getElementById("ai-translate-telegram")?.shadowRoot;
    return [...(root?.querySelectorAll(selector) ?? [])].some(e => (text ? e.textContent === text : true));
}, [selector, text], { timeout: 5000 }).then(() => true, () => false);

// --- Web K

const k = await context.newPage();
await k.goto("https://web.telegram.org/k/");
await k.waitForFunction(() => window.__k);

check("Web K: the button is in the chat bar, before the emoji button",
    await k.waitForSelector(".chat-input .ai-translate-button", { timeout: 5000 }).then(() =>
        k.evaluate(() => document.querySelector(".toggle-emoticons").previousElementSibling.className)), "ai-translate-button");

await k.evaluate(() => {
    __gm.reply = () => "[ru] look at **this**";
    return __k.type("смотри это", [{ _: "messageEntityBold", offset: 7, length: 3 }]);
});
await k.waitForFunction(() => __k.calls.some(c => c.payload.method === "sendText"));
check("Web K: a message typed in a chat that is on goes translated, its bold kept",
    await k.evaluate(() => {
        const { args } = __k.calls.find(c => c.payload.method === "sendText").payload;
        return [args[0].text, args[0].entities];
    }), ["look at this", [{ _: "messageEntityBold", offset: 8, length: 4 }]]);

await k.evaluate(() => {
    __gm.reply = () => "[ru] look at this";
});
await k.click(".bubble[data-mid='4404']", { button: "right" });
await k.waitForSelector("#bubble-contextmenu .ai-translate-item", { timeout: 5000 });
check("Web K: the message menu has AI Translate, and no AI Explain while it is off",
    await k.evaluate(() => [...document.querySelectorAll("#bubble-contextmenu .btn-menu-item-text")].map(e => e.textContent)),
    ["Reply", "AI Translate"]);
await k.click("#bubble-contextmenu .ai-translate-item");
check("Web K: and choosing it shuts the menu", await k.evaluate(() => !document.getElementById("bubble-contextmenu")), true);
check("Web K: the translation is shown beside the message", await waitOurs(k, ".card .text", "look at this"), true);
check("Web K: with the language it came from", (await ours(k, ".card .note"))[0], "Translated from Russian");
check("Web K: the text came from Web K's own copy of the message", await k.evaluate(() => __gm.asked.at(-1)), "смотри это");

await k.keyboard.press("Escape");
await k.click(".bubble[data-mid='4999']", { button: "right" });
await k.waitForSelector("#bubble-contextmenu .ai-translate-item", { timeout: 5000 });
await k.click("#bubble-contextmenu .ai-translate-item");
await waitOurs(k, ".card .text", "look at this");
check("Web K: a message Web K's copy lacks is read off the screen", await k.evaluate(() => __gm.asked.at(-1)), "только на экране");

await k.evaluate(() => __gm.change("explain", true));
await k.keyboard.press("Escape");
await k.click(".bubble[data-mid='4404']", { button: "right" });
await k.waitForSelector("#bubble-contextmenu .ai-translate-item", { timeout: 5000 });
check("Web K: AI Explain is there once it is switched on",
    await k.evaluate(() => [...document.querySelectorAll("#bubble-contextmenu .ai-translate-item .btn-menu-item-text")].map(e => e.textContent)),
    ["AI Translate", "AI Explain"]);
await k.mouse.click(5, 5);

await k.evaluate(() => {
    __gm.reply = () => 401;
    __k.calls.length = 0;
    return __k.type("не переводится");
});
await k.waitForFunction(() => __k.restored.length > 0, null, { timeout: 5000 }).catch(() => { });
check("Web K: a message that could not be translated is not sent", await k.evaluate(() => __k.calls.filter(c => c.payload.method === "sendText").length), 0);
check("Web K: and is back in the chat box", await k.evaluate(() => __k.restored.map(r => r.text)), ["не переводится"]);
check("Web K: and the reason is shown", await waitOurs(k, ".toast.bad"), true);

await k.click(".ai-translate-button");
check("Web K: a left click on the button opens the panel, with the open chat at the top",
    await waitOurs(k, ".panel .chat label", "Auto-translate my messages in Book club"), true);
check("Web K: the language setting names Telegram, not Discord",
    (await ours(k, ".panel select option")).includes("Same as Telegram"), true);
await k.keyboard.press("Escape");

await k.click(".ai-translate-button", { button: "right" });
check("Web K: a right click switches the open chat off", await k.evaluate(() => __gm.store.aiTranslateSettings.enabledChannels), "");
await k.click(".ai-translate-button", { button: "right" });
check("Web K: and on again", await k.evaluate(() => __gm.store.aiTranslateSettings.enabledChannels), "-1001234567890");

check("Web K: the userscript manager's menu offers the settings too", await k.evaluate(() => __gm.menu?.name), "All plugin settings");

// --- Web A

const a = await context.newPage();
await a.goto("https://web.telegram.org/a/");
await a.waitForFunction(() => window.__a);

check("Web A: the button is in the chat bar, before the attachment button",
    await a.waitForSelector(".message-input-wrapper .ai-translate-button", { timeout: 5000 }).then(() =>
        a.evaluate(() => document.querySelector(".AttachMenu").previousElementSibling.className)), "ai-translate-button");

await a.evaluate(() => {
    __gm.reply = () => "[ru] see you on **saturday**";
    __a.worker.postMessage({
        payloads: [{
            messageId: "m1", type: "callMethod", name: "sendMessage",
            args: [{ chat: { id: "-1001234567890" }, text: "до субботы", entities: [{ type: "MessageEntityBold", offset: 3, length: 7 }], wasDrafted: false }]
        }, { messageId: "m2", type: "callMethod", name: "markMessageListRead", args: [{ chat: { id: "-1001234567890" } }] }]
    });
});
await a.waitForFunction(() => __a.echoes.length >= 2, null, { timeout: 5000 }).catch(() => { });
check("Web A: the real worker gets the other call at once and the message once it is translated",
    await a.evaluate(() => __a.echoes.map(e => e.payloads.map(p => p.name).join())), ["markMessageListRead", "sendMessage"]);
check("Web A: with the translation and its bold, under the same message id",
    await a.evaluate(() => {
        const [payload] = __a.echoes[1].payloads;
        return [payload.messageId, payload.args[0].text, payload.args[0].entities];
    }), ["m1", "see you on saturday", [{ type: "MessageEntityBold", offset: 11, length: 8 }]]);

await a.evaluate(() => {
    __a.echoes.length = 0;
    __a.worker.postMessage({
        payloads: [{ messageId: "m3", type: "callMethod", name: "sendMessage", args: [{ chat: { id: "777000" }, text: "привет", wasDrafted: false }] }]
    });
});
await a.waitForFunction(() => __a.echoes.length >= 1, null, { timeout: 5000 }).catch(() => { });
check("Web A: a chat that is not on gets the message as typed", await a.evaluate(() => __a.echoes[0]?.payloads[0].args[0].text), "привет");

// What the worker says about the chat, which the script keeps for the menu.
await a.evaluate(() => __a.worker.postMessage({
    feed: {
        payloads: [{
            type: "methodResponse", messageId: "h1",
            response: { messages: [{ id: 4401, chatId: "-1001234567890", senderId: "5001", isOutgoing: false, content: { text: { text: "кто идёт в субботу?" } } }] }
        }]
    }
}));
await a.evaluate(() => {
    __gm.reply = () => "[ru] who is coming on saturday?";
});
await a.click(".Message[data-message-id='4401']", { button: "right" });
await a.waitForSelector("#portals .MessageContextMenu_items .ai-translate-item", { timeout: 5000 });
check("Web A: the message menu has AI Translate, after the client's own items",
    await a.evaluate(() => [...document.querySelectorAll("#portals .MenuItem")].map(e => e.textContent)), ["Reply", "AI Translate"]);
await a.click("#portals .ai-translate-item");
check("Web A: choosing it shuts the menu", await a.evaluate(() => !document.querySelector("#portals .MessageContextMenu")), true);
check("Web A: the translation is shown beside the message", await waitOurs(a, ".card .text", "who is coming on saturday?"), true);
check("Web A: the text came from what the worker said", await a.evaluate(() => __gm.asked.at(-1)), "кто идёт в субботу?");

await a.keyboard.press("Escape");
await a.click(".Message[data-message-id='4998']", { button: "right" });
await a.waitForSelector("#portals .ai-translate-item", { timeout: 5000 });
await a.click("#portals .ai-translate-item");
await waitOurs(a, ".card .text");
check("Web A: a message from the client's own cache is read off the screen, without its time",
    await a.evaluate(() => __gm.asked.at(-1)), "из кэша самого клиента");

await a.evaluate(() => {
    __gm.reply = () => 401;
    __a.echoes.length = 0;
    __a.answers.length = 0;
    __a.worker.postMessage({
        payloads: [{ messageId: "m9", type: "callMethod", name: "sendMessage", args: [{ chat: { id: "-1001234567890" }, text: "не переводится", wasDrafted: false }] }]
    });
});
await a.waitForFunction(() => document.getElementById("editable-message-text").textContent, null, { timeout: 5000 }).catch(() => { });
check("Web A: a message that could not be translated never reaches the worker", await a.evaluate(() => __a.echoes.length), 0);
check("Web A: the app is told the call is over", await a.evaluate(() => __a.answers.some(d => d.payloads?.[0]?.messageId === "m9")), true);
check("Web A: and the text is back in the chat box", await a.evaluate(() => document.getElementById("editable-message-text").textContent), "не переводится");

// --- a fresh install, with no key yet

const bare = await browser.newContext();
await bare.route("https://web.telegram.org/**", async route => {
    const file = FILES[new URL(route.request().url()).pathname];
    if (!file) return route.fulfill({ status: 404, body: "" });
    await route.fulfill({ status: 200, contentType: file[1], body: await readFile(join(ROOT, "test", file[0])) });
});
// Before the script, or its timers would be the real ones.
await bare.clock.install();
await bare.addInitScript({ content: `${manager({ ...SETTINGS, groqApiKey: "" })}\n${script}` });

for (const [name, path, ready] of [["Web K", "/k/", "__k"], ["Web A", "/a/", "__a"]]) {
    const page = await bare.newPage();
    await page.goto(`https://web.telegram.org${path}`);
    await page.waitForFunction(ready => window[ready], ready);
    await bare.clock.runFor(120_000);
    check(`${name}: a page loaded with no key shows no notice, even after its timers have run`, await page.evaluate(() => __gm.toasts), []);
    await page.close();
}

const noKey = await bare.newPage();
await noKey.goto("https://web.telegram.org/k/");
await noKey.waitForFunction(() => window.__k);
await noKey.evaluate(() => __k.type("привет"));
await bare.clock.runFor(1000);
check("Web K: with no key, sending in a chat that is on is what says so",
    await waitOurs(noKey, ".toast.bad", "AI Translate: No API key set for Groq. Open the plugin settings"), true);
await bare.close();

await browser.close();
done();
