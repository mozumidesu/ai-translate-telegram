/*
 * AI Translate for Telegram — the desktop app standing in for a userscript manager.
 *
 * The app runs dist/ai-translate.user.js unchanged, before the page's own code,
 * and this gives it what a manager would: GM_xmlhttpRequest, GM_getValue,
 * GM_setValue, GM_addValueChangeListener, GM_registerMenuCommand and
 * unsafeWindow, the grants in the script's header. Behind each is a command of
 * the app (desktop/src-tauri/src/gm.rs): a request goes out from Rust, to an
 * address on the app's list and nowhere else, and the values are a file in the
 * app's data folder.
 *
 * A manager gives the script a world of its own. A webview has none to give,
 * so Telegram's code shares this page and can call the same commands. That is
 * why the limits are in the app and not here: nothing below is a secret.
 *
 * `boot` is what the app knows as the page starts: the values as they were
 * when the window was made, the script's version, and the header's @match
 * lines. Returns what the script is given, or nothing on any other page.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function aiTranslateShim(boot, page) {
    "use strict";

    // A header's @match: * is anything, the rest is itself. The hash is not part of what is matched.
    const matches = (pattern, address) =>
        new RegExp(`^${pattern.split("*").map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`).test(address);

    const { location } = page;
    const here = location.origin + location.pathname + location.search;
    // @noframes, and only the pages the header names.
    if (page.top !== page || !boot.matches.some(pattern => matches(pattern, here))) return undefined;

    const internals = page.__TAURI_INTERNALS__;
    if (!internals || typeof internals.invoke !== "function") return undefined;
    const invoke = (command, args) => internals.invoke(command, args);

    const complain = (...what) => page.console.error("[AI Translate]", ...what);
    // As a manager does: what is read or kept is a copy, never the script's own object.
    const copy = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    let values = { ...boot.values };
    const has = name => Object.prototype.hasOwnProperty.call(values, name);

    /** Every GM_setValue this page has made, so an answer asked for before one is not taken for news. */
    let edits = 0;
    /** One write at a time, in the order they were made. */
    let writes = Promise.resolve();

    const listeners = new Map();
    let listenerIds = 0;

    function tell(name, before, after, remote) {
        for (const listener of listeners.values()) {
            if (listener.name !== name) continue;
            try {
                listener.run(name, copy(before), copy(after), remote);
            } catch (e) {
                complain(e);
            }
        }
    }

    /**
     * What the file holds now. The values in `boot` are from when the window
     * was made, and the page may have been loaded again since, or another
     * window may have changed a setting; the script hears of either as a
     * manager would tell it of another tab's change.
     */
    function refresh() {
        const asked = edits;
        return writes
            .then(() => invoke("gm_values"))
            .then(fresh => {
                if (!fresh || typeof fresh !== "object") return undefined;
                // Changed here while the answer was on its way: ask again, for what is there now.
                if (asked !== edits) return refresh();

                const old = values;
                values = { ...fresh };
                for (const name of new Set([...Object.keys(old), ...Object.keys(values)]))
                    if (!same(old[name], values[name])) tell(name, old[name], values[name], true);
                return undefined;
            })
            .catch(complain);
    }

    function GM_getValue(name, fallback) {
        return has(name) ? copy(values[name]) : fallback;
    }

    function GM_setValue(name, value) {
        name = String(name);
        const before = values[name];
        const after = copy(value) ?? null;

        values[name] = after;
        edits++;
        writes = writes.then(() => invoke("gm_set_value", { name, value: after })).catch(complain);
        tell(name, before, after, false);
    }

    function GM_addValueChangeListener(name, run) {
        listeners.set(++listenerIds, { name: String(name), run });
        return listenerIds;
    }

    const commands = new Map();

    /** The script's entry in a manager's menu; the app puts it in its tray menu. */
    function GM_registerMenuCommand(name, run) {
        const id = commands.size + 1;
        commands.set(id, run);
        invoke("gm_menu_command", { id, name: String(name) }).catch(complain);
        return id;
    }

    let requests = 0;

    /** As much of GM_xmlhttpRequest as the core's gmNet asks for: text out, text back. */
    function GM_xmlhttpRequest(details) {
        const id = ++requests;
        let over = false;
        let sent = false;
        let aborted = false;

        const end = (handler, response) => {
            if (over) return;
            over = true;
            try {
                details[handler]?.(response);
            } catch (e) {
                complain(e);
            }
        };
        const failed = why => ({ status: 0, statusText: "", readyState: 4, responseText: "", response: "", responseHeaders: "", finalUrl: String(details.url), error: why });

        if (details.data != null && typeof details.data !== "string") {
            Promise.resolve().then(() => end("onerror", failed("only text is sent")));
            return { abort() { } };
        }

        const request = {
            id,
            url: String(details.url),
            method: String(details.method ?? "GET").toUpperCase(),
            headers: Object.fromEntries(Object.entries(details.headers ?? {}).map(([header, value]) => [header, String(value)])),
            body: details.data ?? null,
            timeout: Number(details.timeout) > 0 ? Number(details.timeout) : 0
        };

        // An address typed a moment ago decides where a request may go: the setting lands first.
        writes
            .then(() => {
                if (aborted) throw "aborted";
                sent = true;
                return invoke("gm_request", { request });
            })
            .then(
                answer => end("onload", {
                    status: answer.status,
                    statusText: answer.statusText,
                    readyState: 4,
                    responseText: answer.text,
                    response: answer.text,
                    responseHeaders: answer.headers,
                    finalUrl: answer.url
                }),
                why => {
                    const said = String(why?.message ?? why);
                    if (said === "aborted") return end("onabort", failed(said));
                    if (said === "timeout") return end("ontimeout", failed(said));
                    // A refused address is said here, since the core calls every failure a network error.
                    page.console.warn("[AI Translate]", request.url.split("?")[0], said);
                    return end("onerror", failed(said));
                }
            );

        return {
            abort() {
                if (over || aborted) return;
                aborted = true;
                if (sent) invoke("gm_abort", { id }).catch(() => { });
            }
        };
    }

    /**
     * The app itself, for the script's Check for updates: in the app the
     * script arrives with a release, so the app's updater takes the manager's
     * place. `newest` answers the version of a newer release, written as the
     * script writes versions, or null; `install` puts it in and starts the
     * app again, and does not come back.
     */
    const app = Object.freeze({
        version: boot.version,
        newest: () => invoke("app_update_check"),
        install: () => invoke("app_update_install")
    });

    // What the app says to the page: another window changed a value, or the tray menu was pressed.
    Object.defineProperty(page, "__AI_TRANSLATE_APP__", {
        value: Object.freeze({
            changed() {
                void refresh();
            },
            menu(id) {
                try {
                    commands.get(Number(id))?.();
                } catch (e) {
                    complain(e);
                }
            }
        })
    });

    void refresh();

    return {
        GM_xmlhttpRequest,
        GM_getValue,
        GM_setValue,
        GM_addValueChangeListener,
        GM_registerMenuCommand,
        unsafeWindow: page,
        AI_TRANSLATE_APP: app
    };
}
