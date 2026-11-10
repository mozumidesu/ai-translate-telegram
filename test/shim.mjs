/*
 * AI Translate for Telegram — the desktop app standing in for a userscript manager.
 *
 * desktop/shim.js gives the script what its header was granted, over the
 * app's commands. Here the commands are faked and the shim is the real one:
 * where it runs, what GM_getValue reads after a reload, in what order values
 * are written and requests sent, how a request ends, and that the core's own
 * gmNet reads its answers. Then the script as the app runs it
 * (desktop/assemble.mjs), in a page shaped like Web A in a real browser: the
 * settings from the tray menu, and Check for updates asking the app.
 *
 *   node test/shim.mjs      the second half needs Playwright and its Chromium
 *
 * Without Playwright that half says so and is skipped, unless REQUIRE_BROWSER
 * is set, as the checks workflow sets it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFileSync } from "child_process";
import { mkdtemp, readFile } from "fs/promises";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { APP, assemble, GIVEN, readHeader, toSemver } from "../desktop/assemble.mjs";
import { built, check, done, ROOT, version } from "./lib.mjs";

const shimText = await readFile(join(ROOT, "desktop", "shim.js"), "utf8");
const makeShim = new Function(`${shimText}\nreturn aiTranslateShim;`)();

const MATCHES = ["https://web.telegram.org/a/*", "https://web.telegram.org/k/*"];
const settle = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms));

/** The app, as far as the shim asks it: every command noted, values kept, a request answered when the test says. */
function fakeApp(stored = {}) {
    const app = {
        stored: structuredClone(stored),
        calls: [],
        /** Each command's answer can be held back: `app.hold.gm_values = defer()`. */
        hold: {},
        requests: [],
        async invoke(command, args) {
            app.calls.push([command, structuredClone(args)]);
            await app.hold[command]?.promise;
            switch (command) {
                case "gm_values": return structuredClone(app.stored);
                case "gm_set_value": app.stored[args.name] = structuredClone(args.value); return null;
                case "gm_menu_command": return null;
                case "gm_abort": app.requests.find(r => r.id === args.id)?.reject("aborted"); return null;
                case "gm_request": return new Promise((resolve, reject) => app.requests.push({ ...args.request, resolve, reject }));
                default: throw `${command} not allowed`;
            }
        },
        names: () => app.calls.map(([command]) => command)
    };
    return app;
}

const defer = () => {
    const deferred = {};
    deferred.promise = new Promise(resolve => (deferred.resolve = resolve));
    return deferred;
};

function fakePage(app, address = "https://web.telegram.org/a/") {
    const page = { location: new URL(address), errors: [], warnings: [] };
    page.top = page;
    page.console = { error: (...what) => page.errors.push(what.map(String).join(" ")), warn: (...what) => page.warnings.push(what.map(String).join(" ")) };
    if (app) page.__TAURI_INTERNALS__ = { invoke: app.invoke };
    return page;
}

const start = (stored, boot = stored, address) => {
    const app = fakeApp(stored);
    const page = fakePage(app, address);
    const gm = makeShim({ values: structuredClone(boot), version: "0.2.3a", matches: MATCHES }, page);
    return { app, page, gm };
};

// --- Where it runs

const runsAt = address => !!start({}, {}, address).gm;
check("the script runs on Web A and on Web K, whatever follows in the address",
    ["https://web.telegram.org/a/", "https://web.telegram.org/a/?account=2", "https://web.telegram.org/a/#-1001234567890", "https://web.telegram.org/k/"].map(runsAt),
    [true, true, true, true]);
check("and on no other page, Telegram's or not",
    ["https://web.telegram.org/", "https://web.telegram.org/ab/", "https://web.telegram.org/z/", "https://example.com/a/",
        "https://web.telegram.org.evil.example/a/", "http://web.telegram.org/a/", "https://evil.example/?https://web.telegram.org/a/"].map(runsAt),
    [false, false, false, false, false, false, false]);

{
    const page = fakePage(fakeApp());
    page.top = {};
    check("never in a frame, as @noframes says", makeShim({ values: {}, version: "0", matches: MATCHES }, page), undefined);
    check("and not where there is no app to ask", makeShim({ values: {}, version: "0", matches: MATCHES }, fakePage(undefined)), undefined);
}

// --- Values

{
    const saved = { aiTranslateSettings: { groqApiKey: "gsk_test", enabledChannels: "1" } };
    const { app, page, gm } = start(saved);

    check("the shim gives what the header was granted, and the app itself", Object.keys(gm).sort(), [...GIVEN, APP].sort());
    check("unsafeWindow is the page's own window", gm.unsafeWindow === page, true);

    check("GM_getValue reads what the app knew as the window was made, at once", gm.GM_getValue("aiTranslateSettings", {}), saved.aiTranslateSettings);
    check("and the fallback for a name nothing was kept under", gm.GM_getValue("nothing", "fallback"), "fallback");
    check("not a name every object has", gm.GM_getValue("toString", "fallback"), "fallback");

    const read = gm.GM_getValue("aiTranslateSettings", {});
    read.groqApiKey = "changed in the script's hands";
    check("what was read is the script's copy: changing it changes nothing kept", gm.GM_getValue("aiTranslateSettings", {}).groqApiKey, "gsk_test");

    await settle();
    check("as it starts, the shim asks the app what the file holds now", app.names(), ["gm_values"]);
    check("and says nothing went wrong", page.errors, []);
}

{
    // The page was loaded again: the window's values are from when it was made, and the file has moved on.
    const { gm } = start({ aiTranslateSettings: { groqApiKey: "new" } }, { aiTranslateSettings: { groqApiKey: "old" } });
    const heard = [];
    gm.GM_addValueChangeListener("aiTranslateSettings", (...told) => heard.push(told));

    check("after a reload, the first read is what the window was made with", gm.GM_getValue("aiTranslateSettings").groqApiKey, "old");
    await settle();
    check("then what the file holds", gm.GM_getValue("aiTranslateSettings").groqApiKey, "new");
    check("and the script is told, as of another tab's change",
        heard, [["aiTranslateSettings", { groqApiKey: "old" }, { groqApiKey: "new" }, true]]);
}

{
    const { app, gm } = start({ aiTranslateSettings: { a: 1 } });
    await settle();
    app.calls.length = 0;

    const heard = [];
    gm.GM_addValueChangeListener("aiTranslateSettings", (name, before, after, remote) => heard.push(remote));
    gm.GM_addValueChangeListener("another", () => heard.push("another"));

    const mine = { a: 2 };
    app.hold.gm_set_value = defer();
    gm.GM_setValue("aiTranslateSettings", mine);
    mine.a = "changed after it was set";
    gm.GM_setValue("aiTranslateSettings", { a: 3 });

    check("GM_setValue is read back at once", gm.GM_getValue("aiTranslateSettings"), { a: 3 });
    check("the script's own change is not another tab's", heard, [false, false]);

    await settle();
    check("one write at a time: the second waits for the first", app.names(), ["gm_set_value"]);
    app.hold.gm_set_value.resolve();
    delete app.hold.gm_set_value;
    await settle();
    check("in the order they were made, each a copy of what was set then",
        app.calls, [["gm_set_value", { name: "aiTranslateSettings", value: { a: 2 } }], ["gm_set_value", { name: "aiTranslateSettings", value: { a: 3 } }]]);
    check("and the file holds the last", app.stored, { aiTranslateSettings: { a: 3 } });
}

{
    // A setting changed while the first answer was still on its way.
    const app = fakeApp({ aiTranslateSettings: { a: "file" } });
    app.hold.gm_values = defer();
    const gm = makeShim({ values: { aiTranslateSettings: { a: "file" } }, version: "0", matches: MATCHES }, fakePage(app));

    await settle();
    gm.GM_setValue("aiTranslateSettings", { a: "typed" });
    app.hold.gm_values.resolve();
    delete app.hold.gm_values;
    await settle(20);
    check("an answer asked for before a change does not undo it", gm.GM_getValue("aiTranslateSettings"), { a: "typed" });
    check("the shim asks again instead, after the write", app.names(), ["gm_values", "gm_set_value", "gm_values"]);
}

{
    const { app, page, gm } = start({ aiTranslateSettings: { a: 1 } });
    await settle();
    const heard = [];
    gm.GM_addValueChangeListener("aiTranslateSettings", (name, before, after, remote) => heard.push([after, remote]));

    // Another window of the app wrote, and the app says so.
    app.stored.aiTranslateSettings = { a: "from the other window" };
    page.__AI_TRANSLATE_APP__.changed();
    await settle();
    check("another window's change is read and told as remote", heard, [[{ a: "from the other window" }, true]]);
    check("what the app can say to the page is two things, and neither can be replaced",
        [Object.keys(page.__AI_TRANSLATE_APP__).sort(), Object.isFrozen(page.__AI_TRANSLATE_APP__)], [["changed", "menu"], true]);
}

{
    const app = fakeApp();
    app.invoke = async command => {
        throw `${command} not allowed`;
    };
    const page = fakePage(app);
    const gm = makeShim({ values: { kept: 1 }, version: "0", matches: MATCHES }, page);
    gm.GM_setValue("kept", 2);
    await settle();
    check("an app that refuses is said in the console, and the script goes on with what it has",
        [gm.GM_getValue("kept"), page.errors.length > 0, page.errors.every(line => line.startsWith("[AI Translate]"))], [2, true, true]);
}

// --- The menu

{
    const { app, page, gm } = start({});
    await settle();
    let opened = 0;
    const id = gm.GM_registerMenuCommand("All plugin settings", () => opened++);
    await settle();
    check("the script's menu command goes to the app, in the script's words", app.calls.at(-1), ["gm_menu_command", { id: 1, name: "All plugin settings" }]);
    page.__AI_TRANSLATE_APP__.menu(id);
    page.__AI_TRANSLATE_APP__.menu(99);
    check("and a press in the tray menu runs it", opened, 1);
}

// --- Requests

{
    const { app, gm } = start({});
    await settle();
    app.calls.length = 0;

    const ends = [];
    const ask = details => gm.GM_xmlhttpRequest({
        ...details,
        onload: r => ends.push(["load", r.status, r.responseText]),
        onerror: r => ends.push(["error", r.error]),
        ontimeout: () => ends.push(["timeout"]),
        onabort: () => ends.push(["abort"])
    });

    app.hold.gm_set_value = defer();
    gm.GM_setValue("aiTranslateSettings", { baseUrl: "https://llm.example/v1" });
    ask({ url: "https://llm.example/v1/models", headers: { Authorization: "Bearer k", "X-Number": 5 } });
    await settle();
    check("a request waits for a setting on its way: the address just typed decides where it may go", app.names(), ["gm_set_value"]);
    app.hold.gm_set_value.resolve();
    delete app.hold.gm_set_value;
    await settle();
    check("then goes to the app, method and headers spelled out",
        app.calls.at(-1), ["gm_request", { request: { id: 1, url: "https://llm.example/v1/models", method: "GET", headers: { Authorization: "Bearer k", "X-Number": "5" }, body: null, timeout: 0 } }]);

    app.requests[0].resolve({ status: 200, statusText: "OK", headers: "content-type: application/json\r\n", text: "{\"data\":[]}", url: "https://llm.example/v1/models" });
    await settle();
    check("an answer ends it as loaded", ends, [["load", 200, "{\"data\":[]}"]]);

    ends.length = 0;
    ask({ url: "https://api.groq.com/openai/v1/chat/completions", method: "post", data: "{}", timeout: 30000 });
    await settle();
    check("a POST carries its text and its time limit", [app.requests[1].method, app.requests[1].body, app.requests[1].timeout], ["POST", "{}", 30000]);
    app.requests[1].reject("timeout");
    await settle();
    check("one the app gave up on ends as timed out", ends, [["timeout"]]);

    ends.length = 0;
    const page = fakePage(app);
    const other = makeShim({ values: {}, version: "0", matches: MATCHES }, page);
    await settle();
    other.GM_xmlhttpRequest({ url: "https://example.com/?secret=1", onerror: r => ends.push(["error", r.error]) });
    await settle();
    app.requests.at(-1).reject("example.com is not an address AI Translate talks to");
    await settle();
    check("one the app refused ends as an error", ends, [["error", "example.com is not an address AI Translate talks to"]]);
    check("and the console says why, without the address's query", page.warnings, ["[AI Translate] https://example.com/ example.com is not an address AI Translate talks to"]);

    ends.length = 0;
    const handle = ask({ url: "https://api.groq.com/openai/v1/models" });
    await settle();
    handle.abort();
    await settle();
    check("abort() gives a request on its way up, by its number", [app.calls.at(-1), ends], [["gm_abort", { id: 3 }], [["abort"]]]);
    handle.abort();
    await settle();
    check("and once is enough", app.names().filter(name => name === "gm_abort").length, 1);

    ends.length = 0;
    const sent = app.requests.length;
    app.hold.gm_set_value = defer();
    gm.GM_setValue("x", 1);
    ask({ url: "https://api.groq.com/openai/v1/models" }).abort();
    app.hold.gm_set_value.resolve();
    delete app.hold.gm_set_value;
    await settle();
    check("one given up before it left never leaves", [app.requests.length, ends], [sent, [["abort"]]]);

    ends.length = 0;
    ask({ url: "https://api.groq.com/openai/v1/models", method: "POST", data: new Uint8Array(4) });
    await settle();
    check("only text is sent", ends, [["error", "only text is sent"]]);
}

{
    // The core's own way out through a userscript manager, over the shim.
    const { app, gm } = start({});
    await settle();
    globalThis.GM_xmlhttpRequest = gm.GM_xmlhttpRequest;
    const { gmNet } = await built(`export { gmNet } from "./ai-translate/core/net";\n`);

    const asked = gmNet({ url: "https://api.groq.com/openai/v1/chat/completions", method: "POST", headers: { Authorization: "Bearer k" }, body: "{\"model\":\"m\"}" });
    await settle();
    app.requests[0].resolve({ status: 429, statusText: "Too Many Requests", headers: "Retry-After: 7\r\nx-ratelimit-remaining-tokens: 0\r\n", text: "{\"error\":{}}", url: "" });
    const answer = await asked;
    check("the core's gmNet reads the app's answer: status, text, and a header by any case",
        [answer.status, answer.data, answer.header("retry-after"), answer.header("X-RateLimit-Remaining-Tokens"), answer.header("absent")],
        [429, "{\"error\":{}}", "7", "0", null]);

    const stop = new AbortController();
    const dropped = gmNet({ url: "https://api.groq.com/openai/v1/models", signal: stop.signal });
    await settle();
    stop.abort();
    check("and a deadline that runs out gives the request up", await dropped.then(r => [r.status, r.data]), [-1, "aborted"]);
    delete globalThis.GM_xmlhttpRequest;
}

// --- The script as the app runs it

const out = await mkdtemp(join(tmpdir(), "ai-translate-telegram-shim-"));
execFileSync(process.execPath, [join(ROOT, "build.mjs"), `--out=${out}`], { stdio: "pipe" });
const script = await readFile(join(out, "ai-translate.user.js"), "utf8");
const inject = await readFile(join(out, "inject.js"), "utf8");

const header = readHeader(script);
check("the shim gives everything the header asks for", header.all("grant").filter(grant => !GIVEN.includes(grant)), []);
check("and nothing the header does not", GIVEN.filter(given => !header.all("grant").includes(given)), []);
check("the app's script is the built one, unchanged, inside it", inject.includes(`\n${script}\n`), true);
check("with the shim in front", inject.indexOf(shimText) > 0 && inject.indexOf(shimText) < inject.indexOf(script), true);
check("and is one function, which the app calls with the values", typeof new Function(`return ${inject}`)(), "function");

const fakeScript = grants => `// ==UserScript==\n// @version 1.2.3a\n// @match https://web.telegram.org/a/*\n${grants}// ==/UserScript==\nGM_setValue("ran", [typeof ${APP}.newest, ${APP}.version]);`;
const small = assemble({ shim: shimText, script: fakeScript("// @grant GM_setValue\n// @run-at document-start\n// @noframes\n") });
{
    const app = fakeApp();
    const window = fakePage(app);
    new Function("window", "console", `(${small})({ values: {} })`)(window, window.console);
    await settle();
    check("a script is handed its grants and the app, and the version its header carries",
        [app.stored.ran, window.errors], [["function", "1.2.3a"], []]);

    const elsewhere = fakePage(app, "https://example.com/");
    new Function("window", "console", `(${small})({ values: {} })`)(elsewhere, elsewhere.console);
    check("and is not run on a page its header does not match", app.names().filter(name => name === "gm_set_value").length, 1);
}

const refusal = make => {
    try {
        make();
        return "assembled";
    } catch (e) {
        return e.message;
    }
};
check("a header that asks for what the app does not give is not assembled",
    refusal(() => assemble({ shim: shimText, script: fakeScript("// @grant GM_download\n// @run-at document-start\n// @noframes\n") })),
    "the header asks for GM_download, which the app does not give");
check("nor one that would start after the page's own code",
    refusal(() => assemble({ shim: shimText, script: fakeScript("// @run-at document-idle\n// @noframes\n") })),
    "the app runs the script at document-start, and the header says otherwise");
check("nor one meant for frames too",
    refusal(() => assemble({ shim: shimText, script: fakeScript("// @run-at document-start\n") })),
    "the app runs the script in the page itself, never in a frame, and the header says otherwise");

check("the app's version is the script's, written as an installer wants it",
    [toSemver("0.2.3a"), toSemver("0.10.0b"), toSemver("1.0.0"), JSON.parse(await readFile(join(out, "version.json"), "utf8")).version],
    ["0.2.3-a", "0.10.0-b", "1.0.0", toSemver(await version())]);

// --- In a real browser

let chromium;
try {
    ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
    console.log("SKIP: no Playwright here, so the script was not run in a page as the app runs it.");
    if (process.env.REQUIRE_BROWSER) process.exit(1);
    done();
}

/** The app's side of the bridge, in the page, and a handle on our closed roots, as test/page.mjs keeps one. */
const APP_IN_PAGE = `
window.__app = { calls: [], stored: {}, newest: null, installs: 0, lands: true };
Object.defineProperty(window, "isTauri", { value: true });
Object.defineProperty(window, "__TAURI_INTERNALS__", { value: { invoke(command, args) {
    __app.calls.push([command, args]);
    switch (command) {
        case "gm_values": return Promise.resolve(JSON.parse(JSON.stringify(__app.stored)));
        case "gm_set_value": __app.stored[args.name] = args.value; return Promise.resolve(null);
        case "gm_menu_command": __app.menu = args; return Promise.resolve(null);
        case "app_update_check": return __app.newest === "offline" ? Promise.reject("no network") : Promise.resolve(__app.newest);
        // An install that goes in starts the app again and never answers.
        case "app_update_install": __app.installs++; return __app.lands ? new Promise(() => {}) : Promise.resolve(null);
        default: return Promise.reject(command + " not allowed");
    }
} } });
const roots = new WeakMap();
const attach = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
    const root = attach.call(this, init);
    roots.set(this, root);
    return root;
};
window.__ours = () => roots.get(document.getElementById("ai-translate-telegram"));
`;

const SAVED = { aiTranslateSettings: { provider: "groq", groqApiKey: "test-key", groqModel: "openai/gpt-oss-120b", locale: "en", enabledChannels: "-1001234567890" } };

const browser = await chromium.launch();
const context = await browser.newContext();
await context.route("https://web.telegram.org/**", async route => {
    if (new URL(route.request().url()).pathname !== "/a/") return route.fulfill({ status: 404, body: "" });
    await route.fulfill({ status: 200, contentType: "text/html", body: await readFile(join(ROOT, "test", "fixtures", "weba.html")) });
});
// As the app does: the values as they are, handed to the one function.
await context.addInitScript({ content: `${APP_IN_PAGE}\n__app.stored = ${JSON.stringify(SAVED)};\n${inject}(${JSON.stringify({ values: SAVED })});` });

const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", message => message.type() === "error" && errors.push(message.text()));
await page.goto("https://web.telegram.org/a/");
await page.waitForFunction(() => window.__app.menu);

check("in a page: the script starts, and nothing of its manager is the page's to call",
    await page.evaluate(() => [typeof window.GM_getValue, typeof window.GM_xmlhttpRequest, typeof window.AI_TRANSLATE_APP, typeof window.__AI_TRANSLATE_APP__.menu]),
    ["undefined", "undefined", "undefined", "function"]);
check("in a page: its settings line reaches the tray menu, in the language of the settings", await page.evaluate(() => __app.menu), { id: 1, name: "All plugin settings" });

const settled = () => page.waitForFunction(() => [...(__ours()?.querySelectorAll(".sheet") ?? [])].every(e => !e.matches(".sheet:not(.open)") && !e.getAnimations().length));
const updateSays = () => page.evaluate(() => {
    const row = __ours().querySelector(".update");
    const button = row.querySelector(".button");
    return [button.textContent, row.querySelector(".hint").textContent, row.querySelector(".hint").classList.contains("bad"), button.disabled];
});
const press = async () => {
    await page.evaluate(() => __ours().querySelector(".update .button").click());
    await page.waitForFunction(() => __ours().querySelector(".update .button").textContent !== "Checking…");
};

await page.evaluate(() => window.__AI_TRANSLATE_APP__.menu(1));
await settled();
check("in a page: a press on it opens the settings", await page.evaluate(() => !!__ours().querySelector('.sheet[data-name="settings"].open')), true);
check("in a page: which show the key the app kept", await page.evaluate(() => [...__ours().querySelectorAll("input")].some(input => input.value === "test-key")), true);

await page.evaluate(() => __ours().querySelector('[data-setting="explain"] input').click());
await page.waitForFunction(() => __app.stored.aiTranslateSettings.explain === true);
check("in a page: a switch flipped there is written through the app, the key still beside it",
    await page.evaluate(() => [__app.stored.aiTranslateSettings.explain, __app.stored.aiTranslateSettings.groqApiKey]), [true, "test-key"]);

check("in a page: Check for updates, before it is pressed, says nothing", await updateSays(), ["Check for updates", "", false, false]);
await press();
check("in a page: it asks the app, not GitHub's copy of the script", await page.evaluate(() => __app.calls.at(-1)[0]), "app_update_check");
check("in a page: with no newer release, this is the latest", await updateSays(), ["Check for updates", "You have the latest version.", false, false]);

await page.evaluate(() => (__app.newest = "0.9.0a"));
await press();
check("in a page: a newer release is named and offered", await updateSays(), ["Update now", "AI Translate · 0.9.0a", false, false]);

await page.evaluate(() => (__app.lands = false));
await press();
check("in a page: one that would not go in is said, and can be tried again",
    [await updateSays(), await page.evaluate(() => __app.installs)], [["Check for updates", "Could not reach GitHub. Check your connection and try again.", true, false], 1]);

await page.evaluate(() => (__app.lands = true));
await press();
await page.evaluate(() => __ours().querySelector(".update .button").click());
await page.waitForFunction(() => __app.installs === 2);
check("in a page: Update now hands it to the app and waits for the app to start again", await updateSays(), ["Updating…", "", false, true]);
check("in a page: and the script's header on GitHub, which a manager updates from, was never asked",
    await page.evaluate(() => __app.calls.some(([command, args]) => command === "gm_request" && args.request.url.includes("githubusercontent"))), false);

await page.reload();
await page.waitForFunction(() => window.__app.menu);
await page.evaluate(() => (__app.newest = "offline"));
await page.evaluate(() => window.__AI_TRANSLATE_APP__.menu(1));
await settled();
await press();
check("in a page: with no answer, it says GitHub could not be reached", await updateSays(), ["Check for updates", "Could not reach GitHub. Check your connection and try again.", true, false]);

check("in a page: and nothing was thrown or refused on the way", errors, []);

await browser.close();
done();
