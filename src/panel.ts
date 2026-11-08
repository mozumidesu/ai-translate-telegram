/*
 * AI Translate for Telegram — the settings panel.
 *
 * Telegram has no settings page to lend a script, so this is ours, in the same
 * shadow root as the notices, built from one list of fields. It is the web/
 * build's panel (ai-translate/web/panel.ts) with Telegram's chat at the top,
 * and every word in it is the plugin's own, in all sixteen languages.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Bridge } from "../ai-translate/core/bridge";
import { isChannelEnabled, setChannelEnabled } from "../ai-translate/core/chats";
import { config, set } from "../ai-translate/core/host";
import { LANGUAGES } from "../ai-translate/core/languages";
import { LOCALES, t } from "../ai-translate/core/locales";
import { asText, clear as clearLog } from "../ai-translate/core/log";
import {
    baseUrlOf, canRemove, emptySlot, keyHeading, keyOf, modelOf, MOST_SLOTS, NONE, PROVIDERS, providerLabel, providerName,
    readSlots, type Slot, writeSlots
} from "../ai-translate/core/slots";
import type { TelegramClient } from "./client";
import { translateIcon } from "./icons";
import { addStyle, ui } from "./ui";

type Option = { value: string; label: string; };

type Field =
    | { kind: "select"; name: string; label: () => string; hint?: () => string; options: () => Option[]; }
    | { kind: "switch"; name: string; label: () => string; hint?: () => string; }
    | { kind: "text" | "area"; name: string; label: () => string; hint?: () => string; }
    | { kind: "slots"; name: string; label: () => string; hint?: () => string; };

const APP = { app: "Telegram" };

const FIELDS: Field[] = [
    {
        kind: "select", name: "locale",
        label: () => t("locale.name"), hint: () => t("locale.descApp", APP),
        options: () => LOCALES.map(l => ({ value: l.value, label: l.value === "auto" ? t("locale.autoApp", APP) : l.label }))
    },
    { kind: "slots", name: "providerSlots", label: () => t("provider.name"), hint: () => t("provider.desc") },
    {
        kind: "select", name: "sentLanguage", label: () => t("panel.sentLanguage"),
        options: () => LANGUAGES.map(l => ({ value: l.value, label: l.label }))
    },
    {
        kind: "select", name: "receivedLanguage", label: () => t("panel.receivedLanguage"),
        options: () => LANGUAGES.map(l => ({ value: l.value, label: l.label }))
    },
    {
        kind: "select", name: "mode", label: () => t("mode.name"), hint: () => t("mode.desc"),
        options: () => [{ value: "perChannel", label: t("mode.perChannel") }, { value: "always", label: t("mode.always") }]
    },
    {
        kind: "select", name: "onError", label: () => t("onError.name"), hint: () => t("onError.desc"),
        options: () => [{ value: "hold", label: t("onError.hold") }, { value: "sendAsTyped", label: t("onError.send") }]
    },
    {
        kind: "select", name: "gender", label: () => t("gender.name"), hint: () => t("gender.desc"),
        options: () => [
            { value: "unset", label: t("gender.unset") },
            { value: "male", label: t("gender.male") },
            { value: "female", label: t("gender.female") }
        ]
    },
    {
        kind: "select", name: "formality", label: () => t("formality.name"), hint: () => t("formality.desc"),
        options: () => [
            { value: "match", label: t("formality.match") },
            { value: "informal", label: t("formality.informal") },
            { value: "formal", label: t("formality.formal") }
        ]
    },
    { kind: "switch", name: "explain", label: () => t("explain.name"), hint: () => t("explain.desc") },
    { kind: "switch", name: "useContext", label: () => t("context.name"), hint: () => t("context.desc") },
    { kind: "text", name: "glossary", label: () => t("glossary.name"), hint: () => t("glossary.desc") },
    { kind: "area", name: "extraInstructions", label: () => t("extra.name"), hint: () => t("extra.desc") }
];

const CSS = `
.sheet {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, .4);
    z-index: 2147483100;
}

.panel {
    width: min(40rem, calc(100vw - 2rem));
    max-height: min(46rem, calc(100vh - 2rem));
    overflow: auto;
    background: var(--bg);
    color: var(--fg);
    border-radius: 16px;
    box-shadow: var(--shadow);
    padding: 1.2rem 1.4rem 1.6rem;
}

.head { display: flex; align-items: center; gap: .6rem; margin-bottom: 1rem; color: var(--accent); }
.head h1 { font-size: 1.1rem; margin: 0; flex: 1; color: var(--fg); }

.x { all: unset; cursor: pointer; color: var(--muted); font-size: 1.4rem; line-height: 1; padding: 0 .3rem; }
.x:hover, .x:focus-visible { color: var(--fg); }

.field { margin-bottom: 1rem; }
.field > label, .slot > label { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .3rem; }
.field .hint { display: block; font-size: .8rem; color: var(--muted); line-height: 1.4; margin-bottom: .45rem; }

.field input, .field select, .field textarea {
    width: 100%;
    padding: .5rem .65rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--field);
    color: var(--fg);
    font-size: .9rem;
    font-family: inherit;
}
.field textarea { min-height: 5rem; resize: vertical; }
.field label input[type="checkbox"] { width: auto; margin: 0 .5rem 0 0; vertical-align: -1px; accent-color: var(--accent); }
.field label:has(input[type="checkbox"]) { cursor: pointer; }
.field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

.chat { padding: .8rem; border-radius: 12px; background: var(--field); }

.slot + .slot { margin-top: .9rem; padding-top: .9rem; border-top: 1px solid var(--line); }
.slot > label { margin-top: .55rem; }
.slot > label:first-child { margin-top: 0; }
.slot .hint.bad { color: var(--bad); margin: .3rem 0 0; }
.slot .hint.bad:empty { display: none; }

.keyrow { display: flex; gap: .45rem; align-items: center; }
.keyrow input { flex: 1; min-width: 0; }
.signs { display: flex; gap: .45rem; margin-top: .55rem; }

.sign {
    all: unset;
    cursor: pointer;
    min-width: 2rem;
    height: 2rem;
    padding: 0 .5rem;
    display: inline-grid;
    place-items: center;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--field);
    color: var(--fg);
    font-size: .9rem;
}
.sign:hover, .sign:focus-visible { border-color: var(--accent); }

.log { width: 100%; min-height: 8rem; margin-bottom: .2rem; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .75rem; white-space: pre; }
`;

let client: TelegramClient | undefined;
export const usePanelClient = (given: TelegramClient) => {
    client = given;
};

function row(field: Field): HTMLElement {
    const name = field.name;
    const value = config()[name];

    const box = document.createElement("div");
    box.className = "field";

    const label = document.createElement("label");
    label.textContent = field.label();
    box.append(label);

    if (field.hint) {
        const hint = document.createElement("span");
        hint.className = "hint";
        hint.textContent = field.hint();
        box.append(hint);
    }

    if (field.kind === "select") {
        const select = document.createElement("select");
        for (const option of field.options()) {
            const item = document.createElement("option");
            item.value = option.value;
            item.textContent = option.label;
            select.append(item);
        }
        select.value = String(value ?? "");
        select.onchange = () => {
            set(name, select.value);
            // The interface language decides every word here, and the mode whether the chat's switch means anything.
            if (name === "locale" || name === "mode") redraw();
        };
        box.append(select);
        return box;
    }

    if (field.kind === "switch") {
        const tick = document.createElement("input");
        tick.type = "checkbox";
        tick.checked = value === true;
        tick.onchange = () => set(name, tick.checked);
        // Inside the label, so the words switch it too.
        label.prepend(tick);
        return box;
    }

    if (field.kind === "slots") {
        box.append(slotList());
        return box;
    }

    const input = field.kind === "area" ? document.createElement("textarea") : document.createElement("input");
    if (input instanceof HTMLInputElement) input.type = "text";
    input.value = String(value ?? "");
    input.spellcheck = false;
    input.onchange = () => set(name, input.value);
    box.append(input);
    return box;
}

/** The open chat, switched on or off from here as from the button. */
function chatRow(): HTMLElement | undefined {
    const chatId = client?.openChat();
    if (!chatId) return undefined;

    const box = document.createElement("div");
    box.className = "field chat";

    const label = document.createElement("label");
    const hint = document.createElement("span");
    hint.className = "hint";

    const tick = document.createElement("input");
    tick.type = "checkbox";

    if (config().mode === "always") {
        label.textContent = t("panel.alwaysOn");
        hint.textContent = t("panel.alwaysOnHint");
        tick.checked = true;
        tick.disabled = true;
    } else {
        const chat = client?.chatTitle(chatId) || t("panel.thisChat");
        label.textContent = t("panel.toggle", { chat });
        hint.textContent = t("panel.toggleHint");
        tick.checked = isChannelEnabled(chatId);
        tick.onchange = () => {
            setChannelEnabled(chatId, tick.checked);
            changed();
        };
    }

    label.prepend(tick);
    box.append(label, hint);
    return box;
}

/** The eye beside a key, crossed through while the key is shown. */
function eye(shown: boolean) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("aria-hidden", "true");

    const open = document.createElementNS("http://www.w3.org/2000/svg", "path");
    open.setAttribute("fill", "currentColor");
    open.setAttribute("d", "M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z");
    svg.append(open);

    if (shown) {
        const slash = document.createElementNS("http://www.w3.org/2000/svg", "path");
        slash.setAttribute("stroke", "currentColor");
        slash.setAttribute("stroke-width", "2");
        slash.setAttribute("stroke-linecap", "round");
        slash.setAttribute("d", "M4 4 20 20");
        svg.append(slash);
    }

    return svg;
}

/** The providers, in order: one to ask and up to four behind it. */
function slotList() {
    const list = document.createElement("div");

    const draw = () => {
        const slots = readSlots();
        list.textContent = "";

        const save = (next: Slot[]) => {
            writeSlots(next);
            draw();
        };
        const change = (at: number, make: (slot: Slot) => Slot) => save(slots.map((slot, i) => (i === at ? make(slot) : slot)));

        slots.forEach((slot, at) => {
            const first = at === 0;
            const block = document.createElement("div");
            block.className = "slot";

            const heading = document.createElement("label");
            heading.textContent = first ? t("provider.name")
                : slots.length > 2 ? t("fallback.numbered", { number: at })
                    : t("fallback.name");
            block.append(heading);

            const choose = document.createElement("select");
            const options = [
                ...(first ? [] : [{ value: NONE, label: t("fallback.none") }]),
                ...PROVIDERS.map(id => ({ value: id, label: providerLabel(id, first) }))
            ];
            for (const option of options) {
                const item = document.createElement("option");
                item.value = option.value;
                item.textContent = option.label;
                choose.append(item);
            }
            choose.value = slot.provider;
            choose.onchange = () => change(at, s => ({ ...s, provider: choose.value }));
            block.append(choose);

            if (slot.provider !== NONE) {
                const keyLabel = document.createElement("label");
                keyLabel.textContent = keyHeading(slot.provider);
                block.append(keyLabel);

                const keyRow = document.createElement("div");
                keyRow.className = "keyrow";

                const key = document.createElement("input");
                key.type = "password";
                key.value = keyOf(slot);
                key.spellcheck = false;
                key.autocomplete = "off";
                // Committed when the field is left, which is also when the provider is asked about it.
                key.onchange = () => change(at, s => ({ ...s, keys: { ...s.keys, [s.provider]: key.value } }));

                const show = document.createElement("button");
                show.type = "button";
                show.className = "sign";
                show.title = t("apiKey.show");
                show.append(eye(false));
                show.onclick = () => {
                    const hidden = key.type === "password";
                    key.type = hidden ? "text" : "password";
                    show.title = t(hidden ? "apiKey.hide" : "apiKey.show");
                    show.textContent = "";
                    show.append(eye(hidden));
                };

                keyRow.append(key, show);
                block.append(keyRow);

                const said = document.createElement("span");
                said.className = "hint bad";
                block.append(said);

                const modelLabel = document.createElement("label");
                modelLabel.textContent = t("model.name");
                block.append(modelLabel);

                const model = document.createElement("input");
                model.type = "text";
                model.value = modelOf(slot);
                model.spellcheck = false;
                model.onchange = () => change(at, s => ({ ...s, models: { ...s.models, [s.provider]: model.value } }));

                // Typed freely, with whatever the provider offers as suggestions.
                const suggestions = document.createElement("datalist");
                suggestions.id = `ai-translate-models-${slot.id}`;
                model.setAttribute("list", suggestions.id);
                block.append(suggestions, model);
                void offerModels(slot, suggestions, said);

                if (slot.provider === "openai") {
                    const urlLabel = document.createElement("label");
                    urlLabel.textContent = t("baseUrl.name");
                    block.append(urlLabel);

                    const url = document.createElement("input");
                    url.type = "text";
                    url.value = baseUrlOf(slot);
                    url.spellcheck = false;
                    url.onchange = () => change(at, s => ({ ...s, baseUrls: { ...s.baseUrls, [s.provider]: url.value } }));
                    block.append(url);
                }
            }

            const buttons = document.createElement("div");
            buttons.className = "signs";

            if (canRemove(slots.length, at)) {
                const less = document.createElement("button");
                less.type = "button";
                less.className = "sign";
                less.textContent = "−";
                less.title = t("fallback.remove");
                less.onclick = () => save(slots.filter((_, i) => i !== at));
                buttons.append(less);
            }

            if (at === slots.length - 1 && slots.length < MOST_SLOTS) {
                const more = document.createElement("button");
                more.type = "button";
                more.className = "sign";
                more.textContent = "+";
                more.title = t("fallback.add");
                more.onclick = () => save([...slots, emptySlot(NONE)]);
                buttons.append(more);
            }

            if (buttons.childElementCount) block.append(buttons);
            list.append(block);
        });
    };

    draw();
    return list;
}

/** The provider's own list of models, and its verdict on the key: only a 401 or 403 is the key's fault. */
async function offerModels(slot: Slot, list: HTMLDataListElement, said: HTMLElement) {
    const apiKey = keyOf(slot);
    if (!apiKey) return;

    try {
        const { status, models } = await Bridge.listAiModels(JSON.stringify({ provider: slot.provider, apiKey, baseUrl: baseUrlOf(slot) }));

        if (status === 401 || status === 403) {
            said.textContent = t("apiKey.bad", { provider: providerName(slot.provider) });
            return;
        }

        for (const model of models) {
            const item = document.createElement("option");
            item.value = model;
            list.append(item);
        }
    } catch {
        // Suggestions are a convenience; the field works without them.
    }
}

/** The last things that happened, for a support report. */
function logRow() {
    const box = document.createElement("div");
    box.className = "field";

    const label = document.createElement("label");
    label.textContent = t("logs.title");
    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = t("logs.desc");

    const text = document.createElement("textarea");
    text.className = "log";
    text.readOnly = true;

    const said = document.createElement("span");
    said.className = "hint";

    const buttons = document.createElement("div");
    buttons.className = "signs";

    const button = (name: string, act: () => void) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sign";
        b.textContent = t(name);
        b.onclick = act;
        buttons.append(b);
        return b;
    };

    const fill = () => {
        text.value = asText() || t("logs.empty");
    };

    button("logs.copy", async () => {
        fill();
        try {
            await navigator.clipboard.writeText(text.value);
            said.textContent = t("logs.copied");
        } catch {
            said.textContent = t("logs.copyFailed");
        }
    });
    button("logs.clear", () => {
        clearLog();
        fill();
    });

    fill();
    box.append(label, hint, text, buttons, said);
    return box;
}

const listeners = new Set<() => void>();
/** Something on the panel changed what the button shows. */
export const onChange = (listener: () => void) => listeners.add(listener);
const changed = () => {
    for (const listener of listeners) listener();
};

export function closePanel() {
    ui().querySelector(".sheet")?.remove();
    changed();
}

function redraw() {
    ui().querySelector(".sheet")?.remove();
    openPanel();
}

export function openPanel() {
    addStyle(CSS);
    ui().querySelector(".sheet")?.remove();

    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.onmousedown = event => {
        if (event.target === sheet) closePanel();
    };
    sheet.onkeydown = event => {
        if (event.key === "Escape") closePanel();
    };

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "head";
    const title = document.createElement("h1");
    title.textContent = t("panel.title");
    const shut = document.createElement("button");
    shut.className = "x";
    shut.textContent = "×";
    shut.setAttribute("aria-label", t("message.hide"));
    shut.onclick = closePanel;
    head.append(translateIcon(22), title, shut);
    panel.append(head);

    const chat = chatRow();
    if (chat) panel.append(chat);
    for (const field of FIELDS) panel.append(row(field));
    panel.append(logRow());

    sheet.append(panel);
    ui().append(sheet);
    shut.focus();
}
