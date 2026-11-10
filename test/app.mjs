/*
 * AI Translate for Telegram — the desktop app, started for real.
 *
 * Builds the app with its `probe` feature, starts it under a display nobody
 * watches, and lets it load the real web.telegram.org/a/ up to the sign-in
 * screen. Then, from inside that page, as Telegram's own code could: is the
 * script's hook in front of the worker, does the client know its host, does
 * the app answer the script's commands, and does it refuse everything else,
 * an address off its list and a command off its capability alike.
 *
 *   node test/app.mjs      Linux, with cargo, WebKitGTK's headers and Xvfb; needs the internet
 *
 * Elsewhere it says so and passes, unless REQUIRE_APP is set, which is how
 * the desktop workflow runs it. It is not among `npm test`: it takes minutes
 * and opens the real site. Signing in is the owner's, with docs/test-plan.md.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFileSync, spawn, spawnSync } from "child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { check, done, ROOT } from "./lib.mjs";

const has = command => spawnSync("sh", ["-c", `command -v ${command}`], { stdio: "ignore" }).status === 0;

const missing = process.platform !== "linux" ? "this is not Linux"
    : !has("cargo") ? "there is no cargo"
        : !process.env.DISPLAY && !has("xvfb-run") ? "there is no display and no xvfb-run"
            : spawnSync("pkg-config", ["--exists", "webkit2gtk-4.1"]).status !== 0 ? "WebKitGTK's headers are not installed"
                : undefined;
if (missing) {
    console.log(`SKIP: ${missing}. The app is started for real on Linux only.`);
    process.exit(process.env.REQUIRE_APP ? 1 : 0);
}

const IDENTIFIER = JSON.parse(await readFile(join(ROOT, "desktop", "src-tauri", "tauri.conf.json"), "utf8")).identifier;

execFileSync(process.execPath, [join(ROOT, "build.mjs")], { stdio: "pipe" });
execFileSync("cargo", ["build", "--quiet", "--package", "ai-translate-desktop", "--features", "probe"], { cwd: join(ROOT, "desktop"), stdio: "inherit" });

const work = await mkdtemp(join(tmpdir(), "ai-translate-telegram-app-"));
const data = join(work, "data", IDENTIFIER);
const out = join(work, "report.json");

// What the app finds in its data folder: settings from an earlier run, a key among them.
const SAVED = { aiTranslateSettings: { provider: "groq", groqApiKey: "probe-key", sentLanguage: "English", locale: "en" } };
await mkdir(data, { recursive: true });
await writeFile(join(data, "values.json"), JSON.stringify(SAVED));

// Under the script: a note of what reaches each worker, as test/live.mjs keeps.
const BEFORE = `
window.__seen = { workers: 0, batches: 0, kinds: {}, said: [] };
for (const level of ["error", "warn"]) {
    const native = console[level].bind(console);
    console[level] = (...what) => {
        __seen.said.push(what.map(String).join(" ").slice(0, 300));
        native(...what);
    };
}
const NativeWorker = window.Worker;
window.Worker = function (...args) {
    const worker = new NativeWorker(...args);
    __seen.workers++;
    const post = worker.postMessage.bind(worker);
    worker.postMessage = message => {
        if (Array.isArray(message?.payloads)) {
            __seen.batches++;
            for (const p of message.payloads) __seen.kinds[p.type] = (__seen.kinds[p.type] ?? 0) + 1;
        }
        return post(message);
    };
    return worker;
};
window.Worker.prototype = NativeWorker.prototype;
window.__bottomWorker = window.Worker;
`;

const SIGN_IN = "#auth-qr-form, #auth-phone-number-form, .auth-form, #auth-pages";

// Once the page has loaded: what the page can see, and what the app answers when the page asks.
const AFTER = `
(async () => {
    if (window.__probing) return;
    window.__probing = true;

    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const invoke = (command, args) => window.__TAURI_INTERNALS__.invoke(command, args);
    const tried = promise => promise.then(value => ({ ok: true, value }), error => ({ ok: false, error: String(error?.message ?? error) }));
    const get = (id, url) => tried(invoke("gm_request", { request: { id, url, method: "GET", headers: {} } }));

    for (let i = 0; i < 120 && !document.querySelector(${JSON.stringify(SIGN_IN)}); i++) await wait(500);
    await wait(3000);

    const header = await get(9003, "https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram/main/dist/ai-translate.meta.js");
    const report = {
        href: location.href,
        isTauri: window.isTauri === true,
        clientKnows: document.body.classList.contains("is-tauri"),
        signIn: !!document.querySelector(${JSON.stringify(SIGN_IN)}),
        ours: !!document.getElementById("ai-translate-telegram"),
        seen: window.__seen,
        hooked: window.Worker !== window.__bottomWorker,
        shim: typeof window.__AI_TRANSLATE_APP__?.changed === "function",
        noGlobals: typeof window.GM_getValue === "undefined" && typeof window.GM_xmlhttpRequest === "undefined",
        notification: typeof window.Notification === "function" ? String(window.Notification.permission) : "none",
        notificationIs: String(window.Notification).slice(0, 80),
        granted: await tried(invoke("plugin:notification|is_permission_granted")),
        values: await tried(invoke("gm_values")),
        set: await tried(invoke("gm_set_value", { name: "probe", value: { at: "the sign-in screen" } })),
        path: await tried(invoke("gm_set_value", { name: "../probe", value: 1 })),
        elsewhere: await get(9001, "https://example.com/"),
        telegram: await get(9002, "https://web.telegram.org/a/"),
        header: header.ok ? { ok: true, status: header.value.status, version: /@version/.test(header.value.text) } : header,
        put: await tried(invoke("gm_request", { request: { id: 9004, url: "https://api.groq.com/openai/v1/models", method: "DELETE", headers: {} } })),
        updater: await tried(invoke("plugin:updater|check")),
        shell: await tried(invoke("plugin:shell|execute", { program: "sh", args: [], options: {} })),
        unknown: await tried(invoke("no_such_command"))
    };
    await invoke("plugin:event|emit", { event: "ai-translate-probe", payload: report });
})();
`;

await writeFile(join(work, "before.js"), BEFORE);
await writeFile(join(work, "after.js"), AFTER);

const binary = join(ROOT, "desktop", "target", "debug", "ai-translate");
const [command, args] = process.env.DISPLAY ? [binary, []] : ["xvfb-run", ["-a", "-s", "-screen 0 1280x800x24", binary]];
const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;

const app = spawn(command, args, {
    // Its own process group, so the display it started under goes with it.
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
        ...process.env,
        XDG_DATA_HOME: join(work, "data"),
        XDG_CONFIG_HOME: join(work, "config"),
        XDG_CACHE_HOME: join(work, "cache"),
        AI_TRANSLATE_NO_UPDATE: "1",
        AI_TRANSLATE_PROBE_BEFORE: join(work, "before.js"),
        AI_TRANSLATE_PROBE_AFTER: join(work, "after.js"),
        AI_TRANSLATE_PROBE_OUT: out,
        ...(proxy ? { AI_TRANSLATE_PROBE_PROXY: proxy } : {}),
        // A runner has no GPU and lets nobody make a sandbox; neither is what is being tried here.
        WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS: "1",
        WEBKIT_DISABLE_DMABUF_RENDERER: "1",
        WEBKIT_DISABLE_COMPOSITING_MODE: "1"
    }
});

let said = "";
app.stdout.on("data", chunk => (said += chunk));
app.stderr.on("data", chunk => (said += chunk));
let exited;
app.on("exit", code => (exited = code));

let report;
for (let waited = 0; waited < 180 && exited === undefined && !report; waited++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Read while it is being written, it is half a report: the next look has all of it.
    report = await readFile(out, "utf8").then(text => JSON.parse(text)).catch(() => undefined);
}

const stored = await readFile(join(data, "values.json"), "utf8").then(JSON.parse, () => undefined);
const mode = await stat(join(data, "values.json")).then(s => s.mode & 0o777, () => 0);

try {
    process.kill(-app.pid, "SIGTERM");
} catch {
    // Gone already.
}

if (process.env.SHOW_REPORT) console.log(JSON.stringify(report, null, 2));

if (!check("the app started, loaded the page and said what it saw", !!report, true)) {
    console.log(exited === undefined ? "       it was still running after three minutes" : `       it ended with ${exited}`);
    console.log(said.split("\n").slice(-25).map(line => `       ${line}`).join("\n"));
    done();
}

const refused = (answer, why) => answer?.ok === false && why.test(answer.error);

check("the window is at Telegram's own Web A", report.href.startsWith("https://web.telegram.org/a/"), true);
check("the sign-in screen is drawn with the script in place", report.signIn, true);
check("with nothing asked of it, the script draws nothing there", report.ours, false);

check("Telegram's worker was made through the script's hook", report.hooked && report.seen.workers > 0, true);
check("and is talked to in { payloads } batches, as the script expects", report.seen.batches > 0, true);
check("of the kinds the script reads", Object.keys(report.seen.kinds).some(kind => kind === "callMethod" || kind === "initApi"), true);

check("the shim is in the page, and its GM_ functions are not the page's globals", [report.shim, report.noGlobals], [true, true]);
check("the client knows it has a desktop host", [report.isTauri, report.clientKnows], [true, true]);
check("and has a Notification to show a message with, already allowed", report.notification, "granted");

check("the values kept from the last run are read", report.values.ok && report.values.value.aiTranslateSettings?.groqApiKey, "probe-key");
check("a value set from the page is in the file, beside the ones that were there",
    [report.set.ok, stored?.probe, stored?.aiTranslateSettings?.groqApiKey], [true, { at: "the sign-in screen" }, "probe-key"]);
check("which only this user can read", mode, 0o600);
check("a value's name is never a path", refused(report.path, /name/), true);

check("a request to an address off the list is not sent", refused(report.elsewhere, /example\.com is not an address AI Translate talks to/), true);
check("Telegram's own address is not on the list either", refused(report.telegram, /not an address AI Translate talks to/), true);
check("a request to one on the list comes back: the script's header, from GitHub", report.header, { ok: true, status: 200, version: true });
check("with a method the script does not use, nothing is sent", refused(report.put, /DELETE is not a method/), true);

check("the app's updater is not the page's to call", refused(report.updater, /not allowed|not found/i), true);
check("nor is a program on this computer", refused(report.shell, /not allowed|not found/i), true);
check("a command that does not exist is refused, not ignored", refused(report.unknown, /not allowed|not found/i), true);

done();
