/*
 * AI Translate for Telegram — the script on the real web.telegram.org.
 *
 * Without signing in: the sign-in screen is enough for both clients to start
 * the machinery the script hooks into. Web A creates its GramJS worker and
 * talks to it in { payloads } batches; Web K mounts apiManagerProxy and calls
 * its managers through invoke. This says whether the hooks went in front of
 * those in today's production builds, whether the client still drew its
 * sign-in screen with them in place, and whether the script kept quiet there.
 *
 * It reaches the internet and depends on a site that changes, so it is not
 * part of npm test. Run it by hand after either client changes:
 *
 *   node test/live.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFileSync } from "child_process";
import { mkdtemp, readFile } from "fs/promises";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { check, done, ROOT } from "./lib.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");

const out = await mkdtemp(join(tmpdir(), "ai-translate-telegram-live-"));
execFileSync(process.execPath, [join(ROOT, "build.mjs"), `--out=${out}`], { stdio: "pipe" });
const script = await readFile(join(out, "ai-translate.user.js"), "utf8");

// A manager with nothing in it, and, underneath the script, a note of what reaches each worker.
const MANAGER = `
var unsafeWindow = window;
function GM_getValue(name, fallback) { return fallback; }
function GM_setValue() {}
function GM_xmlhttpRequest() { throw new Error("no requests in the live check"); }
window.__seen = { workers: 0, batches: 0, kinds: {}, names: {} };
const NativeWorker = window.Worker;
window.Worker = function (...args) {
    const worker = new NativeWorker(...args);
    __seen.workers++;
    const post = worker.postMessage.bind(worker);
    worker.postMessage = message => {
        if (Array.isArray(message?.payloads)) {
            __seen.batches++;
            for (const p of message.payloads) {
                __seen.kinds[p.type] = (__seen.kinds[p.type] ?? 0) + 1;
                if (p.name) __seen.names[p.name] = true;
            }
        }
        return post(message);
    };
    return worker;
};
window.Worker.prototype = NativeWorker.prototype;
`;

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "en-US" });
await context.addInitScript({ content: `${MANAGER}\n${script}` });

// --- Web A

const a = await context.newPage();
const errorsA = [];
a.on("pageerror", e => errorsA.push(e.message));
await a.goto("https://web.telegram.org/a/", { waitUntil: "domcontentloaded" });
await a.waitForTimeout(15000);

const seenA = await a.evaluate(() => window.__seen);
check("Web A: its worker was created through the script's hook", seenA.workers > 0, true);
check("Web A: and is talked to in { payloads } batches, as the script expects", seenA.batches > 0, true);
check("Web A: of the kinds the script reads", Object.keys(seenA.kinds).some(k => k === "callMethod" || k === "initApi"), true);
check("Web A: the sign-in screen is drawn with the script in place",
    await a.evaluate(() => !!document.querySelector("#auth-qr-form, #auth-phone-number-form, .auth-form, #auth-pages")), true);
// The root of ours is made the first time something is drawn; no key and nothing asked means nothing drawn.
check("Web A: with no key, the sign-in screen shows nothing of ours, no notice either",
    await a.evaluate(() => !document.getElementById("ai-translate-telegram")), true);
console.log("       Web A calls seen:", Object.keys(seenA.names).slice(0, 12).join(", ") || "(none)");
if (errorsA.length) console.log("       Web A page errors:", errorsA.slice(0, 3));

// --- Web K

const k = await context.newPage();
const errorsK = [];
k.on("pageerror", e => errorsK.push(e.message));
await k.goto("https://web.telegram.org/k/", { waitUntil: "domcontentloaded" });
await k.waitForTimeout(15000);

check("Web K: apiManagerProxy is on the window, and its invoke is the script's",
    await k.evaluate(() => window.apiManagerProxy?.invoke?.aiTranslate === true), true);
const managerCalls = await k.evaluate(async () => {
    const proxy = window.apiManagerProxy;
    const invoke = proxy.invoke;
    let calls = 0;
    proxy.invoke = function (type, ...rest) {
        if (type === "manager") calls++;
        return invoke.call(this, type, ...rest);
    };
    await new Promise(done => setTimeout(done, 5000));
    proxy.invoke = invoke;
    return calls;
});
console.log(`       Web K manager calls in 5 s on the sign-in screen: ${managerCalls}`);
check("Web K: the sign-in screen is drawn with the script in place",
    await k.evaluate(() => !!document.querySelector("#auth-pages, .page-signQR, .page-sign, .auth-image")), true);
check("Web K: with no key, the sign-in screen shows nothing of ours, no notice either",
    await k.evaluate(() => !document.getElementById("ai-translate-telegram")), true);
if (errorsK.length) console.log("       Web K page errors:", errorsK.slice(0, 3));

await browser.close();
done();
