/*
 * AI Translate for Telegram — every word on the screen, in sixteen languages.
 *
 * The script has no strings of its own: each one is a key of the core's
 * core/locales.ts. This reads every t("...") in src/ and asks the core for it
 * in each of its languages; a key it does not know comes back as the key
 * itself, which is what fails here. That the sixteen agree with each other is
 * ai-translate's own test/interface.mjs.
 *
 * It also reads the script's own text for what must not be in it: no em
 * dashes in what a person reads, and no Telegram in the script's name.
 *
 * Run it:  node test/strings.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fakeManager } from "./fakes.mjs";
import { built, check, done, ROOT } from "./lib.mjs";

const store = fakeManager({});
const { useHost, t, LOCALES } = await built(
    `export { useHost } from "./ai-translate/core/host";\nexport { t, LOCALES } from "./ai-translate/core/locales";\n`
);

let locale = "en";
useHost({ config: () => ({ locale }), set() { }, recent: () => [], meId: () => undefined, notice() { } });

const sources = (await readdir(join(ROOT, "src"))).filter(name => name.endsWith(".ts"));
const keys = new Set();
for (const name of sources) {
    const text = await readFile(join(ROOT, "src", name), "utf8");
    for (const match of text.matchAll(/\bt\(\s*"([\w.]+)"/g)) keys.add(match[1]);
    // The ones built from a choice: t(on ? "button.on" : "button.off"), t(explaining ? ... : ...).
    for (const match of text.matchAll(/\bt\(\s*[\w.]+\s*\?\s*"([\w.]+)"\s*:\s*"([\w.]+)"/g)) {
        keys.add(match[1]);
        keys.add(match[2]);
    }
}

check("the script asks the core for its words", keys.size > 40, true);

const languages = LOCALES.map(l => l.value).filter(v => v !== "auto");
check("in sixteen languages", languages.length, 16);

for (const key of [...keys].sort()) {
    const missing = languages.filter(code => {
        locale = code;
        return t(key) === key;
    });
    check(`${key} is there in every language`, missing, []);
}

locale = "en";
check("the language setting names the app it is in", t("locale.autoApp", { app: "Telegram" }), "Same as Telegram");

const meta = await readFile(join(ROOT, "src", "meta.js"), "utf8");
check("the script is called AI Translate, with no Telegram in the name", /^\/\/ @name +AI Translate$/m.test(meta), true);
check("and says it is unofficial", /^\/\/ @description +Unofficial\./m.test(meta), true);
check("under GPL-3.0-or-later", /^\/\/ @license +GPL-3\.0-or-later$/m.test(meta), true);
check("on the two clients only", [...meta.matchAll(/^\/\/ @match +(\S+)$/gm)].map(m => m[1]),
    ["https://web.telegram.org/a/*", "https://web.telegram.org/k/*"]);
check("before either client's own code", /^\/\/ @run-at +document-start$/m.test(meta), true);
check("in a namespace of its own, so a manager never takes it for the Discord script",
    /^\/\/ @namespace +https:\/\/github\.com\/mozumidesu\/ai-translate-telegram$/m.test(meta), true);

void store;
done();
