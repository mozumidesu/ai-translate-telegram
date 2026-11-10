/*
 * AI Translate for Telegram — the desktop app, held to the script and the core.
 *
 * The app's limits are written down in three places that have to agree with
 * what the script really does: the addresses a request may go to
 * (desktop/hosts.json) with the addresses in the core and the script, the
 * commands the page may call (the capability) with the commands there are,
 * and the app's name, version and updater with this repository's. Then the
 * bridge's own tests, in Rust, where the list is applied.
 *
 *   node test/desktop.mjs      the last part needs cargo
 *
 * Without cargo that part says so and is skipped, unless REQUIRE_CARGO is
 * set, as the checks workflow sets it.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawnSync } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import { readHeader, toSemver } from "../desktop/assemble.mjs";
import { fileName, latest } from "../desktop/latest.mjs";
import { built, check, done, ROOT, version } from "./lib.mjs";

const text = (...path) => readFile(join(ROOT, ...path), "utf8");
const json = async (...path) => JSON.parse(await text(...path));

// --- The addresses

const hosts = await json("desktop", "hosts.json");
const hostsIn = source => [...new Set([...source.matchAll(/["'`]https:\/\/([a-z0-9.-]+)[/"'`]/g)].map(match => match[1]))].sort();

check("the app asks the providers the core asks, and no other",
    [...hosts.providers].sort(), hostsIn(await text("ai-translate", "core", "providers.ts")));

// What the core really sends, provider by provider: every address must be one the list covers.
globalThis.GM_getValue = (name, fallback) => fallback;
globalThis.GM_setValue = () => { };
const { listModels, sendChat, DEFAULTS, useHost, writeSlots, META_URL } = await built(`
export { listModels, sendChat } from "./ai-translate/core/providers";
export { useHost } from "./ai-translate/core/host";
export { writeSlots } from "./ai-translate/core/slots";
export { DEFAULTS } from "./src/storage";
export { META_URL } from "./src/update";
`);

const asked = [];
const net = async ({ url }) => {
    asked.push(new URL(url));
    // A refused key: nothing is tried twice.
    return { status: 401, data: "{}", header: () => null };
};
for (const provider of ["groq", "glm", "gemini", "anthropic"]) {
    await listModels(net, JSON.stringify({ provider, apiKey: "k", baseUrl: "" }));
    await sendChat(net, JSON.stringify({ provider, apiKey: "k", model: "m", baseUrl: "", system: "s", text: "t", thinkingLevel: "low" }));
}
check("every address the core asks a provider at is https, on a host of the list",
    asked.filter(url => url.protocol !== "https:" || !hosts.providers.includes(url.hostname)).map(String), []);
check("and each provider of the list was asked, for its models and for a translation",
    [[...new Set(asked.map(url => url.hostname))].sort(), asked.length], [[...hosts.providers].sort(), 8]);

const meta = new URL(META_URL);
check("the update check reads the script's header, in this repository's folder on GitHub",
    [hosts.update.host, meta.pathname.startsWith(hosts.update.under), hosts.update.under], [meta.hostname, true, "/mozumidesu/ai-translate-telegram/"]);
check("the feedback relay is the script's",
    hosts.feedback, new URL((await text("src", "feedback.ts")).match(/const FEEDBACK_ENDPOINT = "([^"]+)"/)[1]).hostname);

// The settings as the core saves them, which the bridge reads the person's own address from.
const saved = { ...DEFAULTS };
useHost({ config: () => saved, set: (name, value) => (saved[name] = value), recent: () => [], meId: () => undefined, notice() { } });
writeSlots([
    { id: "first", provider: "openai", keys: { openai: "sk-or-test" }, models: { openai: "some/model" }, baseUrls: { openai: "https://openrouter.ai/api/v1" } },
    { id: "second", provider: "openai", keys: { openai: "none" }, models: { openai: "llama" }, baseUrls: { openai: "http://localhost:11434/v1" } },
    { id: "third", provider: "groq", keys: { groq: "gsk_test" }, models: { groq: "openai/gpt-oss-120b" } }
]);
check("the settings the bridge's tests read are the settings the core writes (desktop/bridge/tests/settings.json)",
    await json("desktop", "bridge", "tests", "settings.json"), { aiTranslateSettings: saved });

// --- The commands

const capability = await json("desktop", "src-tauri", "capabilities", "telegram.json");
const header = readHeader(await text("dist", "ai-translate.user.js"));
const origins = [...new Set(header.all("match").map(match => new URL(match.replace("*", "")).origin))];

check("the page that may call the app is Telegram's, the origin the header's @match lines are on",
    [capability.remote.urls, capability.local], [origins.map(origin => `${origin}/*`), false]);
check("which is web.telegram.org and nothing else", origins, ["https://web.telegram.org"]);

const named = source => [...source.matchAll(/^\s+"([a-z_]+)",$/gm)].map(match => match[1]);
const buildScript = await text("desktop", "src-tauri", "build.rs");
const commands = named(buildScript.slice(buildScript.indexOf("const COMMANDS"), buildScript.indexOf("];")));
const handled = [...(await text("desktop", "src-tauri", "src", "lib.rs")).match(/generate_handler!\[([\s\S]*?)\]/)[1].matchAll(/::(\w+)/g)].map(match => match[1]);
const allowed = capability.permissions.filter(permission => !permission.includes(":"));

check("every command there is has a permission of its own", commands, handled);
check("and the page is allowed exactly those", allowed, commands.map(command => `allow-${command.replaceAll("_", "-")}`));
check("of the plugins, the page gets what Telegram's client asks a desktop host for, and nothing more",
    capability.permissions.filter(permission => permission.includes(":")), [
        "core:event:default",
        "core:window:allow-is-fullscreen",
        "core:window:allow-start-dragging",
        "notification:allow-is-permission-granted",
        "notification:allow-request-permission",
        "notification:allow-notify",
        "shell:allow-open"
    ]);

const shim = await text("desktop", "shim.js");
const invoked = [...new Set([...shim.matchAll(/invoke\("([a-z_]+)"/g)].map(match => match[1]))];
check("the shim calls only commands of the app", invoked.filter(command => !commands.includes(command)), []);
check("and each of the script's commands is one the shim calls",
    commands.filter(command => /^(gm|app)_/.test(command) && !invoked.includes(command)), []);

// --- The app

const config = await json("desktop", "src-tauri", "tauri.conf.json");
const pack = await json("package.json");

check("the app is called AI Translate", config.productName, "AI Translate");
check("with no Telegram in its name, its id or its window's title",
    [config.productName, config.identifier, (await text("desktop", "src-tauri", "src", "window.rs")).match(/pub const TITLE: &str = "([^"]+)"/)[1]].filter(name => /telegram/i.test(name)), []);
check("and says it is unofficial where it is described",
    [config.bundle.shortDescription, config.bundle.longDescription].map(said => said.startsWith("Unofficial")), [true, true]);
check("under GPL-3.0-or-later", [config.bundle.license, pack.license], ["GPL-3.0-or-later", "GPL-3.0-or-later"]);
check("no em dashes in what a person reads of it", /—/.test(JSON.stringify(config.bundle)), false);
check("its icon is our own, made from the script's (desktop/icons/icon.svg)",
    (await text("desktop", "icons", "icon.svg")).includes(Buffer.from(header.one("icon").split("base64,")[1], "base64").toString().match(/ d="([^"]+)"/)[1]), true);

check("its version is the script's, written as an installer wants it (npm run build writes desktop/version.json)",
    [config.version, (await json("desktop", "version.json")).version], ["../version.json", toSemver(await version())]);
check("it opens Telegram's own Web A and ships none of it",
    [(await text("desktop", "src-tauri", "src", "window.rs")).match(/pub const HOME: &str = "([^"]+)"/)[1], config.build?.frontendDist], ["https://web.telegram.org/a/", undefined]);

check("installers for the three systems: NSIS, .app and .dmg, AppImage and .deb", config.bundle.targets, ["nsis", "app", "dmg", "appimage", "deb"]);
check("a Mac build is signed ad hoc, or an Apple silicon Mac calls it damaged", config.bundle.macOS.signingIdentity, "-");
check("updates come from this repository's latest release", config.plugins.updater.endpoints,
    ["https://github.com/mozumidesu/ai-translate-telegram/releases/latest/download/latest.json"]);
check("checked against the app's own public key, the private one being nowhere here",
    [/^[A-Za-z0-9+/=]{100,}$/.test(config.plugins.updater.pubkey), Buffer.from(config.plugins.updater.pubkey, "base64").toString().includes("minisign public key")], [true, true]);
check("a build signs its update only when asked to, with the key at hand", config.bundle.createUpdaterArtifacts, false);
check("tg:// links are the app's to open", config.plugins["deep-link"].desktop.schemes, ["tg"]);

// What the updater reads from a release: an entry for each system whose installer was signed.
const made = latest("0.3.0a", {
    [fileName("0.3.0a", "appimage")]: "sig-appimage\n",
    [fileName("0.3.0a", "nsis")]: "sig-nsis\n",
    [fileName("0.3.0a", "app")]: "sig-app\n",
    [fileName("0.3.0a", "dmg")]: "a disk image is for a person, not for the updater"
}, new Date(0));
check("latest.json carries the version as the updater compares it, and each signed installer under the updater's names for its system",
    [made.version, Object.keys(made.platforms).sort(), made.platforms["windows-x86_64-nsis"]],
    ["0.3.0-a", ["darwin-aarch64", "darwin-aarch64-app", "darwin-x86_64", "darwin-x86_64-app", "linux-x86_64", "linux-x86_64-appimage", "windows-x86_64", "windows-x86_64-nsis"],
        { signature: "sig-nsis", url: "https://github.com/mozumidesu/ai-translate-telegram/releases/download/v0.3.0a/AI-Translate_0.3.0a_windows_x64-setup.exe" }]);
check("an installer nobody signed is left out of it", made.platforms["linux-x86_64-deb"], undefined);
check("and it is asked for at the address the app was built with",
    config.plugins.updater.endpoints[0].startsWith(made.platforms["linux-x86_64"].url.split("/releases/")[0]), true);

// --- The bridge's own tests

if (spawnSync("cargo", ["--version"], { stdio: "ignore" }).status !== 0) {
    console.log("SKIP: no cargo here, so the bridge's own tests were not run.");
    if (process.env.REQUIRE_CARGO) process.exit(1);
    done();
}

const cargo = spawnSync("cargo", ["test", "--quiet", "--package", "ai-translate-bridge"], { cwd: join(ROOT, "desktop"), encoding: "utf8" });
const result = /test result: (\w+)\. (\d+) passed; (\d+) failed/.exec(cargo.stdout ?? "");
if (!check("the bridge's own tests pass: the list of addresses, the stored values, the version", [cargo.status, result?.[1], result?.[3]], [0, "ok", "0"]))
    console.log((cargo.stdout ?? "") + (cargo.stderr ?? ""));
else console.log(`       ${result[2]} of them`);

done();
