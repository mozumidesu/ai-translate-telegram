/*
 * AI Translate for Telegram — the userscript as the desktop app runs it.
 *
 * A userscript manager reads the script's header, runs the script on the
 * pages it matches, before the page's own code, and hands it what the header
 * was granted. The app does the same with one piece of text, made here: the
 * shim (shim.js), then dist/ai-translate.user.js, unchanged, inside a function
 * whose arguments are the header's grants. The app adds what it knows as the
 * window is made, the stored values, and gives the whole to the webview as an
 * initialization script (src-tauri/src/window.rs).
 *
 * build.mjs writes the result to desktop/gen/inject.js, which the app is
 * compiled with. Nothing here is the app's own code path alone: test/shim.mjs
 * and test/page.mjs run the very same text.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** What the shim gives. A grant in the header that is not here is a script the app cannot run. */
export const GIVEN = ["GM_xmlhttpRequest", "GM_getValue", "GM_setValue", "GM_addValueChangeListener", "GM_registerMenuCommand", "unsafeWindow"];

/** Beside the header's grants: the app itself, for Check for updates. */
export const APP = "AI_TRANSLATE_APP";

/** The lines of a script's header, by name: `all("match")` is every @match. */
export function readHeader(script) {
    const block = /\/\/ ==UserScript==\n([\s\S]*?)\/\/ ==\/UserScript==/.exec(script)?.[1];
    if (block === undefined) throw new Error("the script has no header");

    const lines = [...block.matchAll(/^\/\/ @(\S+)(?:[ \t]+(.*))?$/gm)].map(([, name, value]) => [name, (value ?? "").trim()]);
    const all = name => lines.filter(([n]) => n === name).map(([, value]) => value);
    return { all, one: name => all(name)[0], has: name => all(name).length > 0 };
}

/** `0.2.3a` as an installer and the updater want it, `0.2.3-a`: bridge/src/version.rs does the same in Rust. */
export function toSemver(version) {
    const found = /^(\d+\.\d+\.\d+)([a-z]?)$/.exec(version);
    if (!found) throw new Error(`${version} is not a version of the script's shape`);
    return found[2] ? `${found[1]}-${found[2]}` : found[1];
}

/**
 * A function, as text, that takes what the app knows as the page starts,
 * `{ values }`, and runs the script as its header says.
 */
export function assemble({ shim, script }) {
    const header = readHeader(script);

    const grants = header.all("grant");
    const unknown = grants.filter(grant => !GIVEN.includes(grant));
    if (unknown.length) throw new Error(`the header asks for ${unknown.join(", ")}, which the app does not give`);
    // The Web A hook wraps the Worker the page is about to make; any later is too late.
    if (header.one("run-at") !== "document-start") throw new Error("the app runs the script at document-start, and the header says otherwise");
    if (!header.has("noframes")) throw new Error("the app runs the script in the page itself, never in a frame, and the header says otherwise");

    const boot = { version: header.one("version"), matches: header.all("match") };
    const names = [...grants, APP];

    return `(function (given) {
try {
${shim}
const boot = Object.assign(${JSON.stringify(boot)}, { values: (given && given.values) || {} });
const gm = aiTranslateShim(boot, window);
if (!gm) return;
(function (${names.join(", ")}) {
${script}
}).call(window, ${names.map(name => `gm.${name}`).join(", ")});
} catch (e) {
console.error("[AI Translate]", e);
}
})`;
}
