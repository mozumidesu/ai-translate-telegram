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
import { check, coreCommit, done, ROOT, version } from "./lib.mjs";

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
    requests: [],
    routes: {},
    opened: [],
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
// A provider in OpenAI's shape for the chat, and __gm.routes, by address, for anything else.
function GM_xmlhttpRequest(options) {
    __gm.requests.push({ url: options.url, method: options.method ?? "GET", data: options.data });
    const route = Object.keys(__gm.routes).find(prefix => options.url.startsWith(prefix));
    let status = 404, text = "";
    if (route) [status, text] = __gm.routes[route](options);
    else if (options.data && options.url.endsWith("/chat/completions")) {
        const body = JSON.parse(options.data);
        __gm.asked.push(body.messages.at(-1).content);
        const answer = __gm.reply(body.messages.at(-1).content);
        [status, text] = typeof answer === "number" ? [answer, "{}"]
            : [200, JSON.stringify({ choices: [{ message: { content: answer }, finish_reason: "stop" }] })];
    }
    setTimeout(() => status === -1 ? options.onerror() : options.onload({ status, responseText: text, responseHeaders: "" }), 5);
    return { abort() {} };
}
window.open = url => {
    __gm.opened.push(url);
    return {};
};
// Closed roots stay closed, so the page and its events see what they would see in a real browser; the test keeps a handle.
const roots = new WeakMap();
const attach = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
    const root = attach.call(this, init);
    roots.set(this, root);
    new MutationObserver(records => {
        for (const record of records)
            for (const node of record.addedNodes)
                if (node.classList?.contains("toast")) __gm.toasts.push(node.textContent);
    }).observe(root, { childList: true, subtree: true });
    return root;
};
window.__shadow = element => (element ? roots.get(element) : undefined);
window.__ours = () => __shadow(document.getElementById("ai-translate-telegram"));
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

/** What our shadow root holds, read through the handle the test kept on it. */
const ours = (page, selector) => page.evaluate(selector => {
    const root = __ours();
    return [...(root?.querySelectorAll(selector) ?? [])].map(e => e.textContent);
}, selector);

/** A click on something of ours, which the page itself cannot reach through the closed root. */
const clickOurs = (page, selector) => page.evaluate(selector => {
    __ours().querySelector(selector).click();
}, selector);

/** Typing into a field of ours. */
const fillOurs = (page, selector, value) => page.evaluate(([selector, value]) => {
    const field = __ours().querySelector(selector);
    field.focus();
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
}, [selector, value]);

/** The settings page as a list: each section title, setting and piece of upkeep, in the order they are drawn. */
const settingsOrder = page => page.evaluate(() => {
    const sheet = __ours().querySelector('.sheet[data-name="settings"]');
    return [...(sheet?.querySelectorAll(".section, [data-setting], .providers, .keep-help, .foot") ?? [])].map(e =>
        (e.classList.contains("section") ? `# ${e.textContent}`
            : e.dataset.setting ?? (e.classList.contains("providers") ? "providers" : e.classList.contains("keep-help") ? "keep" : e.classList[1]))
        + (e.hidden ? " (hidden)" : ""));
});

const waitOurs = (page, selector, text) => page.waitForFunction(([selector, text]) => {
    const root = __ours();
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
const onCard = await k.evaluate(() => {
    const at = __ours().querySelector(".card .text").getBoundingClientRect();
    return [at.x + 10, at.y + at.height / 2];
});
await k.mouse.click(...onCard);
check("Web K: a press on the card's own text leaves it open, so the translation can be selected", await ours(k, ".card .text"), ["look at this"]);
await k.mouse.click(600, 700);
check("Web K: a press outside it shuts it", await ours(k, ".card"), []);

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
check("Web K: a left click on the button opens the panel: the two languages, then the open chat",
    await waitOurs(k, ".panel .chat label", "Auto-translate my messages in Book club")
        ? await ours(k, '.sheet[data-name="chat"] .field > label') : [],
    ["Translate my messages into", "Translate incoming messages into", "Auto-translate my messages in Book club"]);
check("Web K: and a way to all the settings, and nothing else", await ours(k, '.sheet[data-name="chat"] .button'), ["All plugin settings"]);

await clickOurs(k, '.sheet[data-name="chat"] .button');
check("Web K: which steps aside for the settings page", await ours(k, ".sheet .head h1"), ["AI Translate"]);
check("Web K: in the plugin's order, under its section titles", await settingsOrder(k), [
    "providers",
    "# Behaviour", "mode", "onError", "explain", "aiLearn", "learn (hidden)",
    "# Translation", "gender", "formality", "useContext", "glossary", "extraInstructions", "keep",
    "# Appearance", "locale", "showOriginal",
    "update", "logs"
]);
check("Web K: the language setting names Telegram, not Discord",
    (await ours(k, '.sheet[data-name="settings"] select option')).includes("Same as Telegram"), true);
check("Web K: the backslashes explained, with their examples",
    await ours(k, ".keep .example"), ["\\carpe diem\\", "\\This line stays as it is"]);

check("Web K: under Logs, the version: this script's, as its header gives it to the manager",
    await ours(k, ".logs .hint"), [`AI Translate · ${await version()}`]);
check("Web K: which is the header's @version", script.match(/^\/\/ @version +(\S+)$/m)?.[1], await version());

// Check for updates: the header on main, asked through the manager.
const header = name => script.match(new RegExp(`^// @${name} +(\\S+)$`, "m"))?.[1];
const RAW = "https://raw.githubusercontent.com/";
const updateSays = () => k.evaluate(() => {
    const row = __ours().querySelector(".update");
    return [row.querySelector(".button").textContent, row.querySelector(".hint").textContent, row.querySelector(".hint").classList.contains("bad")];
});
const press = async () => {
    await clickOurs(k, ".update .button");
    await k.waitForFunction(() => __ours().querySelector(".update .button").textContent !== "Checking…");
};

check("Web K: Check for updates, before it is pressed, says nothing", await updateSays(), ["Check for updates", "", false]);
await k.evaluate(([raw, mine]) => {
    __gm.routes[raw] = () => [200, `// ==UserScript==\n// @name            AI Translate\n// @version         ${mine}\n// ==/UserScript==\n`];
}, [RAW, await version()]);
await press();
check("Web K: the same version on main is the latest", await updateSays(), ["Check for updates", "You have the latest version.", false]);
check("Web K: asked of the header's own @updateURL, through the manager",
    await k.evaluate(() => __gm.requests.at(-1).url.split("?")[0]), header("updateURL"));

await k.evaluate(raw => {
    __gm.routes[raw] = () => [200, "// ==UserScript==\n// @version         9.10.0\n// ==/UserScript==\n"];
}, RAW);
await press();
check("Web K: a newer one is offered", await updateSays(),
    ["Update now", "A new version is available. Your userscript manager updates it by itself on its own schedule. To do it now, press the button.", false]);
await clickOurs(k, ".update .button");
check("Web K: and pressing it hands the header's @downloadURL to the manager, from the click", await k.evaluate(() => __gm.opened), [header("downloadURL")]);
check("Web K: then says to confirm it there and reload", await updateSays(),
    ["Reload the page", "The update is open in a new tab. Confirm it there in your userscript manager, then reload this page.", false]);

await k.evaluate(raw => {
    __gm.routes[raw] = () => [-1, ""];
}, RAW);
await k.keyboard.press("Escape");
await k.evaluate(() => __gm.menu.run());
await press();
check("Web K: with no answer, it says GitHub could not be reached", await updateSays(),
    ["Check for updates", "Could not reach GitHub. Check your connection and try again.", true]);

// The two links beside the title, and the window behind the envelope.
check("Web K: beside the title, the source code and support, as on the plugin's page",
    await k.evaluate(() => [...__ours()
        .querySelectorAll('.sheet[data-name="settings"] .head .link')].map(b => b.getAttribute("aria-label"))), ["Source code", "Support"]);
await clickOurs(k, '.sheet[data-name="settings"] .head .link');
check("Web K: the source is this script's, its header's @homepageURL", await k.evaluate(() => __gm.opened.at(-1)), header("homepageURL"));

await clickOurs(k, '.sheet[data-name="settings"] .head .link:last-child');
const form = '.sheet[data-name="feedback"]';
check("Web K: the envelope opens the feedback form, over the settings", await ours(k, ".sheet .head h1"), ["AI Translate", "Support and feedback"]);
check("Web K: the early-build line names this script's version",
    (await ours(k, `${form} .alpha`))[0], `This is ${await version()}, an early build. Rough edges are expected, and what you write here is what gets them fixed.`);
check("Web K: and says the Telegram name goes with it, not the Discord one",
    (await ours(k, `${form} .hint`)).includes("Your Telegram name is attached so I can reply."), true);
const sendable = () => k.evaluate(form => !__ours().querySelector(`${form} .button.primary`).disabled, form);
check("Web K: Send waits for a subject and a message", await sendable(), false);

await fillOurs(k, `${form} input[name="subject"]`, "Ошибка в Web K");
await fillOurs(k, `${form} textarea[name="message"]`, "Перевод не пришёл");
check("Web K: and then can be pressed", await sendable(), true);
await fillOurs(k, `${form} input[name="email"]`, "not an address");
await k.evaluate(form => __ours().querySelector(`${form} input[name="email"]`).dispatchEvent(new Event("blur")), form);
check("Web K: an address that cannot be one is said so when the field is left",
    (await ours(k, `${form} .hint.bad`)).includes("That does not look like an email address."), true);
await fillOurs(k, `${form} input[name="email"]`, "reader@example.org");
await k.evaluate(form => {
    const input = __ours().querySelector(`${form} input[name="subject"]`);
    const pixel = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), c => c.charCodeAt(0));
    const files = new DataTransfer();
    files.items.add(new File([pixel], "shot.png", { type: "image/png" }));
    __gm.pasteReachedPage = false;
    document.addEventListener("paste", () => { __gm.pasteReachedPage = true; }, { once: true });
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: files, bubbles: true, composed: true, cancelable: true }));
}, form);
await k.waitForFunction(form => __ours().querySelector(`${form} .shot img`), form, { timeout: 5000 }).catch(() => { });
check("Web K: a pasted screenshot joins the form", (await ours(k, `${form} .shot`)).length, 1);
check("Web K: and never reaches Telegram, which would send it to the chat", await k.evaluate(() => __gm.pasteReachedPage), false);

const RELAY = "https://ai-translate-feedback.mozumidesu.workers.dev";
await k.evaluate(relay => {
    __gm.routes[relay] = options => {
        __gm.relayed = JSON.parse(options.data);
        return [500, "{}"];
    };
}, RELAY);
await clickOurs(k, `${form} .button.primary`);
check("Web K: a refusal from the relay is said with its code",
    await waitOurs(k, `${form} .result`, "Could not send: the service answered with an error (500). Please write on Discord instead."), true);
await k.evaluate(relay => {
    __gm.routes[relay] = options => {
        __gm.relayed = JSON.parse(options.data);
        return [200, ""];
    };
}, RELAY);
await clickOurs(k, `${form} .button.primary`);
check("Web K: sent, it says so", await waitOurs(k, `${form} .result`, "Sent. Thank you."), true);
check("Web K: and Send cannot be pressed twice", await sendable(), false);
check("Web K: what reaches the relay: the form, the Telegram name and the client, this script's version and its core, and no key", await k.evaluate(async version => {
    const { images, ...rest } = __gm.relayed;
    return [rest, images.map(i => [i.name, i.type, i.data.length > 0]), JSON.stringify(__gm.relayed).includes("test-key")];
}), [{
    subject: "Ошибка в Web K", message: "Перевод не пришёл", replyTo: "reader@example.org", discord: "", telegram: "Mozumi (4242)\nWeb K",
    locale: "en", build: `${await version()} (${coreCommit()})`
}, [["shot.png", "image/png", true]], false]);
await clickOurs(k, `${form} .centre .button`);
check("Web K: or, Write on Discord opens the support server", await k.evaluate(() => __gm.opened.at(-1)), "https://discord.gg/HKRc9FfK43");
await k.keyboard.press("Escape");

// Nobody signed in: there is no name to attach, and the client is all the report says of Telegram.
await k.evaluate(() => { __k.rootScope.myId = 0; });
await clickOurs(k, '.sheet[data-name="settings"] .head .link:last-child');
await fillOurs(k, `${form} input[name="subject"]`, "Без входа");
await fillOurs(k, `${form} textarea[name="message"]`, "Проверка");
await clickOurs(k, `${form} .button.primary`);
await waitOurs(k, `${form} .result`, "Sent. Thank you.");
check("Web K: with nobody signed in, the report names only the client", await k.evaluate(() => __gm.relayed.telegram), "Web K");
await k.evaluate(() => { __k.rootScope.myId = 4242; });
await k.keyboard.press("Escape");

await clickOurs(k, ".logs .button");
check("Web K: Logs opens over the settings, with Copy, Save .txt and Clear",
    await ours(k, '.sheet[data-name="logs"] .button'), ["Copy", "Save .txt", "Clear"]);
await k.keyboard.press("Escape");
check("Web K: Escape shuts Logs and leaves the settings", await ours(k, ".sheet .head h1"), ["AI Translate"]);
await k.keyboard.press("Escape");
check("Web K: and then the settings", await ours(k, ".sheet"), []);

await k.click(".ai-translate-button", { modifiers: ["Shift"] });
check("Web K: a shift-click switches the open chat off, as in Discord", await k.evaluate(() => __gm.store.aiTranslateSettings.enabledChannels), "");
check("Web K: and opens nothing", await ours(k, ".sheet"), []);
await k.click(".ai-translate-button", { modifiers: ["Shift"] });

await k.click(".ai-translate-button", { button: "right" });
check("Web K: a right click switches the open chat off", await k.evaluate(() => __gm.store.aiTranslateSettings.enabledChannels), "");
await k.click(".ai-translate-button", { button: "right" });
check("Web K: and on again", await k.evaluate(() => __gm.store.aiTranslateSettings.enabledChannels), "-1001234567890");

check("Web K: the userscript manager's menu offers the settings too", await k.evaluate(() => __gm.menu?.name), "All plugin settings");
await k.evaluate(() => __gm.menu.run());
check("Web K: and opens the settings page", (await settingsOrder(k))[0], "providers");
await k.keyboard.press("Escape");

// --- AI Learn, in Web K

/** The line of ours under a message, as its parts: the words, the ones a correction changed, and why. */
const noteUnder = (page, selector) => page.evaluate(selector => {
    const note = __shadow(document.querySelector(`${selector} ai-translate-note`))?.querySelector(".note");
    if (!note) return undefined;
    const why = note.querySelector(".why")?.textContent ?? "";
    return [note.textContent.slice(0, note.textContent.length - why.length), [...note.querySelectorAll(".fixed")].map(f => f.textContent), why];
}, selector);
const waitNote = (page, selector) => page.waitForFunction(selector => __shadow(document.querySelector(`${selector} ai-translate-note`))?.querySelector(".note"),
    selector, { timeout: 5000 }).then(() => true, () => false);

await k.evaluate(() => __gm.menu.run());
await clickOurs(k, '[data-setting="aiLearn"] input');
check("Web K: switching AI Learn on brings Corrections up under it", (await settingsOrder(k)).slice(5, 7), ["aiLearn", "learn"]);
await k.keyboard.press("Escape");

await k.evaluate(() => {
    __gm.reply = () => 'Shall we meet tomorrow at noon?\nwhy: "at noon", not "in noon"';
    __k.calls.length = 0;
    return __k.type("shall we meet tomorrow in noon?");
});
check("Web K: AI Learn: English typed in a chat that translates into English goes at once, as typed",
    await k.evaluate(() => __k.calls.filter(c => c.payload.method === "sendText").map(c => c.payload.args[0].text)), ["shall we meet tomorrow in noon?"]);
const learnt = await k.evaluate(() => __k.drawSent());
const learntAt = `.bubble[data-mid="${learnt}"]`;
await waitNote(k, learntAt);
check("Web K: AI Learn: under it, only here, what a native speaker would have written, the changed word marked",
    await noteUnder(k, learntAt), ["a native speaker would write: Shall we meet tomorrow at noon", ["at"], '"at noon", not "in noon"']);
check("Web K: inside the bubble, after the text and its time",
    await k.evaluate(s => document.querySelector(`${s} .message`).lastElementChild.tagName, learntAt), "AI-TRANSLATE-NOTE");
await k.evaluate(mid => __k.redraw(mid), learnt);
check("Web K: the client draws the bubble again without it", await k.evaluate(s => !document.querySelector(`${s} ai-translate-note`), learntAt), true);
check("Web K: and it is back within a moment", await waitNote(k, learntAt), true);

await k.click(".bubble[data-mid='4404']", { button: "right" });
await k.waitForSelector("#bubble-contextmenu .ai-translate-item", { timeout: 5000 });
check("Web K: somebody else's message has no AI Learn in its menu",
    await k.evaluate(() => [...document.querySelectorAll("#bubble-contextmenu .ai-translate-item .btn-menu-item-text")].map(e => e.textContent)), ["AI Translate", "AI Explain"]);
await k.mouse.click(5, 5);

await k.evaluate(() => {
    __gm.reply = text => text;
});
await k.click(".bubble[data-mid='4999']", { button: "right" });
await k.waitForSelector("#bubble-contextmenu .ai-translate-item", { timeout: 5000 });
check("Web K: your own has it, last",
    await k.evaluate(() => [...document.querySelectorAll("#bubble-contextmenu .btn-menu-item-text")].map(e => e.textContent)), ["Reply", "AI Translate", "AI Explain", "AI Learn"]);
await k.click("#bubble-contextmenu .ai-translate-item:last-child");
await waitNote(k, ".bubble[data-mid='4999']");
check("Web K: asked by hand, it answers even when there is nothing to correct",
    await noteUnder(k, ".bubble[data-mid='4999']"), ["nothing to correct here", [], ""]);

await k.evaluate(() => __gm.menu.run());
check("Web K: Corrections counts what was kept", await ours(k, ".learn .button"), ["Corrections (1)"]);
await clickOurs(k, ".learn .button");
check("Web K: and lists it: what you wrote, the native version with the change marked, and why",
    await k.evaluate(() => {
        const entry = __ours().querySelector('.sheet[data-name="corrections"] .kept');
        return [...entry.querySelectorAll("p")].slice(0, 3).map(p => p.textContent).concat([[...entry.querySelectorAll(".fixed")].map(f => f.textContent)]);
    }), ["shall we meet tomorrow in noon?", "Shall we meet tomorrow at noon", '"at noon", not "in noon"', ["at"]]);
await clickOurs(k, '.sheet[data-name="corrections"] .button');
check("Web K: Clear empties it", await ours(k, '.sheet[data-name="corrections"] .kept-empty'), ["Nothing yet."]);
await k.keyboard.press("Escape");
check("Web K: and the count goes with them", await ours(k, ".learn .button"), ["Corrections"]);
await k.keyboard.press("Escape");

// --- Show the original, in Web K

await k.evaluate(() => __gm.menu.run());
await clickOurs(k, '[data-setting="showOriginal"] input');
check("Web K: Show the original is switched on from Appearance", await k.evaluate(() => __gm.store.aiTranslateSettings.showOriginal), true);
await k.keyboard.press("Escape");

await k.evaluate(() => {
    __gm.reply = () => "[ru] see you on **saturday**";
    __k.calls.length = 0;
    return __k.type("до встречи в субботу", [{ _: "messageEntityBold", offset: 13, length: 7 }]);
});
await k.waitForFunction(() => __k.calls.some(c => c.payload.method === "sendText"));
const shownOver = await k.evaluate(() => __k.drawSent());
const shownAt = `.bubble[data-mid="${shownOver}"]`;
check("Web K: the message went translated", await k.evaluate(s => document.querySelector(`${s} .translatable-message`).textContent, shownAt), "see you on saturday");
await waitNote(k, shownAt);
check("Web K: and under it, only here, what you typed",
    await noteUnder(k, shownAt), ["you wrote: до встречи в субботу", [], ""]);
check("Web K: in bold where you made it bold",
    await k.evaluate(s => [...__shadow(document.querySelector(`${s} ai-translate-note`)).querySelectorAll(".bold")].map(b => b.textContent), shownAt), ["субботу"]);

await k.evaluate(() => __gm.change("showOriginal", false));
check("Web K: switched off, the line goes", await k.waitForFunction(s => !document.querySelector(`${s} ai-translate-note`), shownAt, { timeout: 3000 }).then(() => true, () => false), true);
check("Web K: and AI Learn's stays", await noteUnder(k, learntAt).then(n => n?.[0]), "a native speaker would write: Shall we meet tomorrow at noon");

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

// AI Learn, in Web A: the message goes as typed, and the line is under it once the client draws it.
await a.evaluate(() => {
    __gm.change("aiLearn", true);
    __gm.reply = () => "See you on Saturday then.";
    __a.echoes.length = 0;
    __a.worker.postMessage({
        payloads: [{ messageId: "m20", type: "callMethod", name: "sendMessage", args: [{ chat: { id: "-1001234567890" }, text: "see you at saturday then", wasDrafted: false }] }]
    });
});
await a.waitForFunction(() => __a.echoes.length >= 1, null, { timeout: 5000 }).catch(() => { });
check("Web A: AI Learn: written in English, it goes at once, as typed", await a.evaluate(() => __a.echoes[0]?.payloads[0].args[0].text), "see you at saturday then");
await a.evaluate(() => {
    __a.worker.postMessage({
        feed: {
            payloads: [{
                type: "updates", updates: [{
                    "@type": "newMessage", chatId: "-1001234567890", id: 4420,
                    message: { id: 4420, chatId: "-1001234567890", senderId: "4242", isOutgoing: true, content: { text: { text: "see you at saturday then" } } }
                }]
            }]
        }
    });
    __a.drawOwn(4420, "see you at saturday then");
});
await waitNote(a, ".Message[data-message-id='4420']");
check("Web A: AI Learn: under it, what a native speaker would have written",
    await noteUnder(a, ".Message[data-message-id='4420']"), ["a native speaker would write: See you on Saturday then", ["on"], ""]);
check("Web A: right after the text and its time",
    await a.evaluate(() => document.querySelector(".Message[data-message-id='4420'] .text-content").nextElementSibling?.tagName), "AI-TRANSLATE-NOTE");
await a.evaluate(() => __gm.change("aiLearn", false));

// Show the original, in Web A.
await a.evaluate(() => {
    __gm.change("showOriginal", true);
    __gm.reply = () => "[ru] until tonight";
    __a.echoes.length = 0;
    __a.worker.postMessage({
        payloads: [{ messageId: "m21", type: "callMethod", name: "sendMessage", args: [{ chat: { id: "-1001234567890" }, text: "до вечера", wasDrafted: false }] }]
    });
});
await a.waitForFunction(() => __a.echoes.length >= 1, null, { timeout: 5000 }).catch(() => { });
check("Web A: a translated message", await a.evaluate(() => __a.echoes[0]?.payloads[0].args[0].text), "until tonight");
await a.evaluate(() => {
    __a.worker.postMessage({
        feed: {
            payloads: [{
                type: "updates", updates: [{
                    "@type": "newMessage", chatId: "-1001234567890", id: 4421,
                    message: { id: 4421, chatId: "-1001234567890", senderId: "4242", isOutgoing: true, content: { text: { text: "until tonight" } } }
                }]
            }]
        }
    });
    __a.drawOwn(4421, "until tonight");
});
await waitNote(a, ".Message[data-message-id='4421']");
check("Web A: has what you typed under it, with Show the original on",
    await noteUnder(a, ".Message[data-message-id='4421']"), ["you wrote: до вечера", [], ""]);
await a.evaluate(() => __gm.change("showOriginal", false));

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

// The report from Web A, once the worker has said who the person is.
await a.evaluate(relay => {
    __a.worker.postMessage({
        feed: { payloads: [{ type: "updates", updates: [{ "@type": "updateCurrentUser", currentUser: { id: "4242", firstName: "Mozumi" }, currentUserFullInfo: {} }] }] }
    });
    __gm.routes[relay] = options => {
        __gm.relayed = JSON.parse(options.data);
        return [200, ""];
    };
}, RELAY);
await a.evaluate(() => __gm.menu.run());
await clickOurs(a, '.sheet[data-name="settings"] .head .link:last-child');
await fillOurs(a, `${form} input[name="subject"]`, "Ошибка в Web A");
await fillOurs(a, `${form} textarea[name="message"]`, "Перевод не пришёл");
await clickOurs(a, `${form} .button.primary`);
await waitOurs(a, `${form} .result`, "Sent. Thank you.");
check("Web A: the report names the Telegram user and the client, then this script's version and its core",
    await a.evaluate(() => [__gm.relayed.telegram, __gm.relayed.build]), ["Mozumi (4242)\nWeb A", `${await version()} (${coreCommit()})`]);

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
