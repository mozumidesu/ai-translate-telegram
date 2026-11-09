/*
 * AI Translate for Telegram — the settings page.
 *
 * In the order of the plugin's own (ai-translate/settings.ts), which reads
 * top to bottom in the order someone meets it: what to connect to, how it
 * behaves, how the translation reads, what it looks like, and the upkeep.
 * The languages and the open chat are on the panel behind the chat bar
 * button, as they are in Discord, and not repeated here.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Bridge } from "../ai-translate/core/bridge";
import { config, set } from "../ai-translate/core/host";
import { LOCALES, t } from "../ai-translate/core/locales";
import {
    baseUrlOf, canRemove, emptySlot, keyHeading, keyOf, modelOf, MOST_SLOTS, NONE, PROVIDERS, providerLabel, providerName,
    readSlots, type Slot, writeSlots
} from "../ai-translate/core/slots";
import { logsRow } from "./logs";
import { changed, hint, openSheet, sectionTitle, type Sheet } from "./sheet";
import { addStyle } from "./ui";
import { updateRow } from "./update";

type Option = { value: string; label: string; };

type Field =
    | { kind: "select"; name: string; label: () => string; hint?: () => string; options: () => Option[]; }
    | { kind: "switch" | "text" | "area"; name: string; label: () => string; hint?: () => string; };

type Item =
    | Field
    | { kind: "title"; key: string; }
    | { kind: "providers" | "keep" | "update" | "logs"; };

const APP = { app: "Telegram" };

const ITEMS: Item[] = [
    // What it talks to: first on the page, so nothing announces it.
    { kind: "providers" },

    { kind: "title", key: "section.behaviour" },
    {
        kind: "select", name: "mode", label: () => t("mode.name"), hint: () => t("mode.desc"),
        options: () => [{ value: "perChannel", label: t("mode.perChannel") }, { value: "always", label: t("mode.always") }]
    },
    {
        kind: "select", name: "onError", label: () => t("onError.name"), hint: () => t("onError.desc"),
        options: () => [{ value: "hold", label: t("onError.hold") }, { value: "sendAsTyped", label: t("onError.send") }]
    },
    { kind: "switch", name: "explain", label: () => t("explain.name"), hint: () => t("explain.desc") },

    { kind: "title", key: "section.translation" },
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
    { kind: "switch", name: "useContext", label: () => t("context.name"), hint: () => t("context.desc") },
    { kind: "text", name: "glossary", label: () => t("glossary.name"), hint: () => t("glossary.desc") },
    { kind: "area", name: "extraInstructions", label: () => t("extra.name"), hint: () => t("extra.desc") },
    // Nothing to set: how to keep part of a message untranslated.
    { kind: "keep" },

    { kind: "title", key: "section.look" },
    {
        kind: "select", name: "locale",
        label: () => t("locale.name"), hint: () => t("locale.descApp", APP),
        options: () => LOCALES.map(l => ({ value: l.value, label: l.value === "auto" ? t("locale.autoApp", APP) : l.label }))
    },

    // Upkeep, at the foot, with no heading.
    { kind: "update" },
    { kind: "logs" }
];

const CSS = `
.slot + .slot { margin-top: .9rem; padding-top: .9rem; border-top: 1px solid var(--line); }
.slot > label { margin-top: .55rem; }
.slot > label:first-child { margin-top: 0; }

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
`;

function row(field: Field, sheet: Sheet): HTMLElement {
    const name = field.name;
    const value = config()[name];

    const box = document.createElement("div");
    box.className = "field";
    box.dataset.setting = name;

    const label = document.createElement("label");
    label.textContent = field.label();
    box.append(label);

    const said = field.hint ? hint(field.hint()) : undefined;

    if (field.kind === "switch") {
        const tick = document.createElement("input");
        tick.type = "checkbox";
        tick.checked = value === true;
        tick.onchange = () => set(name, tick.checked);
        // Inside the label, so the words switch it too.
        label.prepend(tick);
        if (said) box.append(said);
        return box;
    }

    if (said) box.append(said);

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
            // The interface language decides every word here; the mode, what the chat bar button shows.
            if (name === "locale") sheet.redraw();
            if (name === "mode") changed();
        };
        box.append(select);
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

/** The providers, in order: one to ask and up to four behind it (ai-translate/ui/Providers.tsx). */
function providers() {
    const list = document.createElement("div");
    list.className = "field providers";

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

            if (at <= 1) block.append(hint(first ? t("provider.desc") : t("fallback.desc")));

            if (slot.provider !== NONE) {
                const keyLabel = document.createElement("label");
                keyLabel.textContent = keyHeading(slot.provider);
                block.append(keyLabel);

                const keyRow = document.createElement("div");
                keyRow.className = "keyrow";

                const key = document.createElement("input");
                key.type = "password";
                key.value = keyOf(slot);
                key.placeholder = t("apiKey.desc");
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

                const refused = hint("", true);
                block.append(refused);

                if (slot.provider === "openai") {
                    const urlLabel = document.createElement("label");
                    urlLabel.textContent = t("baseUrl.name");
                    block.append(urlLabel);

                    const url = document.createElement("input");
                    url.type = "text";
                    url.value = baseUrlOf(slot);
                    url.placeholder = t("baseUrl.desc");
                    url.spellcheck = false;
                    url.onchange = () => change(at, s => ({ ...s, baseUrls: { ...s.baseUrls, [s.provider]: url.value } }));
                    block.append(url);
                }

                const modelLabel = document.createElement("label");
                modelLabel.textContent = t("model.name");
                block.append(modelLabel);

                const model = document.createElement("input");
                model.type = "text";
                model.value = modelOf(slot);
                model.placeholder = t("model.pick");
                model.spellcheck = false;
                model.onchange = () => change(at, s => ({ ...s, models: { ...s.models, [s.provider]: model.value } }));

                // Typed freely, with whatever the provider offers as suggestions.
                const suggestions = document.createElement("datalist");
                suggestions.id = `ai-translate-models-${slot.id}`;
                model.setAttribute("list", suggestions.id);
                block.append(suggestions, model);
                void offerModels(slot, suggestions, refused);
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
async function offerModels(slot: Slot, list: HTMLDataListElement, refused: HTMLElement) {
    const apiKey = keyOf(slot);
    if (!apiKey) return;

    try {
        const { status, models } = await Bridge.listAiModels(JSON.stringify({ provider: slot.provider, apiKey, baseUrl: baseUrlOf(slot) }));

        if (status === 401 || status === 403) {
            refused.textContent = t("apiKey.bad", { provider: providerName(slot.provider) });
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

/** "{example}" in a sentence becomes the example itself, set as code. */
function withExample(key: string, example: string) {
    const line = document.createElement("li");
    const [before, after = ""] = t(key).split("{example}");
    const code = document.createElement("code");
    code.className = "example";
    // "auto", so an Arabic example still starts at its own right-hand edge.
    code.dir = "auto";
    code.textContent = example;
    line.append(before, code, after);
    return line;
}

/** How to keep part of a message untranslated: there to be read, as a short list (ai-translate/ui/KeepHelp.tsx). */
function keepHelp() {
    const box = document.createElement("div");
    box.className = "field keep-help";

    const label = document.createElement("label");
    label.textContent = t("keep.name");

    const list = document.createElement("ul");
    list.className = "keep";
    const code = document.createElement("li");
    code.textContent = t("keep.code");
    list.append(withExample("keep.pair", "\\carpe diem\\"), withExample("keep.line", "\\" + t("keep.lineExample")), code);

    box.append(label, list);
    return box;
}

function render(item: Item, sheet: Sheet): HTMLElement {
    switch (item.kind) {
        case "title": return sectionTitle(item.key);
        case "providers": return providers();
        case "keep": return keepHelp();
        case "update": return updateRow();
        case "logs": return logsRow();
        default: return row(item, sheet);
    }
}

export function openSettings() {
    addStyle(CSS);

    openSheet({
        name: "settings",
        title: () => t("panel.title"),
        onShut: changed,
        draw(body, sheet) {
            for (const item of ITEMS) body.append(render(item, sheet));
        }
    });
}
