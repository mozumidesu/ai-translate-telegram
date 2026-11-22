/*
 * AI Translate for Telegram — where the userscript manager keeps the settings.
 *
 * Under "ai-translate-settings", the name the project goes by. Builds before
 * the rename kept them under "aiTranslateSettings": the first read copies
 * them over, keys and switched-on chats included, and leaves the old key as
 * it was, so an older build put back still finds what it had.
 *
 * Run it:  node test/storage.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { built, check, done } from "./lib.mjs";

/** A manager holding `saved`, which notes every name it is asked to write. */
function manager(saved) {
    const store = structuredClone(saved);
    const written = [];
    globalThis.GM_getValue = (name, fallback) => (name in store ? structuredClone(store[name]) : fallback);
    globalThis.GM_setValue = (name, value) => {
        written.push(name);
        store[name] = structuredClone(value);
    };
    return { store, written };
}

/** The module afresh, as a page load has it: nothing read yet. */
const load = () => built(`export { settings, save, fresh, KEY, OLD_KEY } from "./src/storage";\n`);

const BEFORE = { groqApiKey: "gsk_old key​", enabledChannels: "-1001234567890", sentLanguage: "Japanese", useContext: true };

// --- a copy updated from a build that used the old key

let m = manager({ aiTranslateSettings: BEFORE });
let storage = await load();
check("the names: the new key, and the old one it is carried over from", [storage.KEY, storage.OLD_KEY], ["ai-translate-settings", "aiTranslateSettings"]);

const read = storage.settings();
check("settings kept under the old key are found the first time",
    [read.groqApiKey, read.enabledChannels, read.sentLanguage, read.useContext], ["gsk_oldkey", "-1001234567890", "Japanese", true]);
check("and a setting the old copy never had comes with its default", read.onError, "hold");
check("they are copied under the new key, once", m.written, ["ai-translate-settings"]);
check("as they were saved", m.store["ai-translate-settings"], BEFORE);
check("and the old key is left as it was, for an older build put back", m.store.aiTranslateSettings, BEFORE);

storage.fresh();
check("read again, they come from the new key, with nothing copied a second time", m.written, ["ai-translate-settings"]);

storage.save("enabledChannels", "-1001234567890,777000");
check("a change is saved under the new key", m.store["ai-translate-settings"].enabledChannels, "-1001234567890,777000");
check("and never under the old one", m.store.aiTranslateSettings.enabledChannels, "-1001234567890");

// --- once both are there, the new key is what counts

m = manager({ aiTranslateSettings: BEFORE, "ai-translate-settings": { ...BEFORE, sentLanguage: "German" } });
storage = await load();
check("with both keys there, the new one is read", storage.settings().sentLanguage, "German");
check("and nothing is copied over it", m.written, []);

// --- a fresh install

m = manager({});
storage = await load();
const none = storage.settings();
check("with nothing saved anywhere, the defaults, context off", [none.sentLanguage, none.useContext, none.groqApiKey], ["English", false, ""]);
check("and nothing is written until something is changed", m.written, []);
storage.save("groqApiKey", "gsk_new");
check("then under the new key", Object.keys(m.store), ["ai-translate-settings"]);

done();
