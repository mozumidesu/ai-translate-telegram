/*
 * AI Translate for Telegram — settings, kept by the userscript manager.
 *
 * Keys, models and every other setting stay on this device, in the manager's
 * own storage, which survives a reload and an update of the script, and is
 * not the page's: Telegram's code cannot read it. Both clients share it.
 *
 * The defaults are the Vencord settings page's (ai-translate/settings.ts),
 * written out, with one difference: conversation context is off until it is
 * switched on, because it sends other people's messages to the provider.
 * test/defaults.mjs compares the two and names any other drift.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Config } from "../ai-translate/core/host";

declare const GM_getValue: (<T>(name: string, fallback: T) => T) | undefined;
declare const GM_setValue: ((name: string, value: unknown) => void) | undefined;
declare const GM_addValueChangeListener:
    ((name: string, listener: (name: string, before: unknown, after: unknown, remote: boolean) => void) => unknown) | undefined;

const KEY = "aiTranslateSettings";

export const DEFAULTS: Config = {
    locale: "auto",
    providerSlots: "",
    provider: "groq",
    geminiApiKey: "",
    groqApiKey: "",
    anthropicApiKey: "",
    glmApiKey: "",
    openaiApiKey: "",
    geminiModel: "gemini-3.8-flash",
    groqModel: "openai/gpt-oss-120b",
    anthropicModel: "",
    glmModel: "glm-4.5-flash",
    openaiModel: "",
    baseUrl: "",
    fallbackProvider: "none",
    sentLanguage: "English",
    receivedLanguage: "English",
    mode: "perChannel",
    enabledChannels: "",
    onError: "hold",
    gender: "unset",
    explain: false,
    aiLearn: false,
    learnHistory: "",
    // Other people's messages would go to the provider with every request.
    useContext: false,
    formality: "match",
    glossary: "",
    extraInstructions: ""
};

/** Read once, then kept: the core asks for settings many times a translation. */
let held: Config | undefined;

function read(): Config {
    let saved: Partial<Config> = {};
    try {
        saved = (typeof GM_getValue === "function" ? GM_getValue<Partial<Config>>(KEY, {}) : {}) ?? {};
    } catch {
        // A manager without storage, or storage refused: defaults it is.
    }

    // A setting added in a later version appears with its default, not as undefined.
    return { ...DEFAULTS, ...saved };
}

export const settings = () => (held ??= read());

/**
 * Settings as they are now, written by any tab. Web A sends every tab's
 * messages from one of them, so that tab asks again before each message
 * rather than trusting what it read when it loaded.
 */
export function fresh() {
    held = read();
    return held;
}

export function save(name: string, value: unknown) {
    const all = settings() as Record<string, unknown>;
    all[name] = value;

    try {
        GM_setValue?.(KEY, all);
    } catch {
        // The change still holds for this tab.
    }
}

try {
    // Another tab's change, as soon as it is made, where the manager can say so.
    GM_addValueChangeListener?.(KEY, (_name, _before, _after, remote) => {
        if (remote) held = undefined;
    });
} catch {
    // fresh() covers it.
}
