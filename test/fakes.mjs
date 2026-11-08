/*
 * AI Translate for Telegram — what a test puts in place of the browser.
 *
 * The userscript manager's storage and request, a provider that answers what
 * it is told to, and the page's window, which in Node is the global object.
 * Installed before the module under test is imported, as a manager would.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** The settings a test starts from: Groq with a key, the Book club chat switched on. */
export const SETTINGS = {
    provider: "groq", groqApiKey: "test-key", groqModel: "openai/gpt-oss-120b",
    sentLanguage: "English", receivedLanguage: "Russian",
    mode: "perChannel", enabledChannels: "-1001234567890", onError: "hold"
};

export function fakeManager(saved = SETTINGS) {
    const store = { aiTranslateSettings: structuredClone(saved) };
    globalThis.GM_getValue = (name, fallback) => (name in store ? structuredClone(store[name]) : fallback);
    globalThis.GM_setValue = (name, value) => {
        store[name] = structuredClone(value);
    };
    globalThis.unsafeWindow = globalThis;
    return store;
}

/**
 * A provider in OpenAI's shape, which is Groq's. `reply` is handed the
 * message it was sent and gives back the answer, or a number for an HTTP
 * failure with that status.
 */
export function fakeProvider() {
    const provider = {
        asked: [],
        reply: () => "[ru] translated",
        /** What the model was asked to translate, the last time. */
        get lastMessage() {
            const body = provider.asked.at(-1);
            return body?.messages?.at(-1)?.content;
        }
    };

    globalThis.GM_xmlhttpRequest = options => {
        const body = JSON.parse(options.data);
        provider.asked.push(body);
        const answer = provider.reply(body.messages?.at(-1)?.content ?? "", body);

        setTimeout(() => options.onload(typeof answer === "number"
            ? { status: answer, responseText: JSON.stringify({ error: { message: "refused for the test" } }), responseHeaders: "" }
            : {
                status: 200,
                responseText: JSON.stringify({ choices: [{ message: { content: answer }, finish_reason: "stop" }] }),
                responseHeaders: ""
            }), 0);

        return { abort() { } };
    };

    return provider;
}

/** Lets every promise and timer that is ready run. */
export const settle = (ms = 30) => new Promise(done => setTimeout(done, ms));
