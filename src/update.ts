/*
 * AI Translate for Telegram — Check for updates, at the foot of the settings.
 *
 * The userscript manager keeps the script current by itself, from the
 * addresses in its header and on its own schedule. This button says whether
 * that has happened yet and hurries it, as ai-translate/ui/UpdatePanel.tsx
 * does for the Discord userscript: the header on main is asked for its
 * @version, and a newer script is handed to the manager from the click,
 * which offers it as an update. There is one channel, so there is no line
 * for switching it.
 *
 * What is compared is the header's @version, the plugin's version with the
 * build counter after it ("0.2.1a.1", src/version.ts), and not the version a
 * person reads, which has no counter.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "../ai-translate/core/locales";
import { pickNet, timeoutSignal } from "../ai-translate/core/net";
import { button, hint } from "./sheet";
import { SCRIPT_VERSION } from "./version";

/** Where the header's @updateURL and @downloadURL point; test/page.mjs holds the two to each other. */
const DIST = "https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram/main/dist";
export const META_URL = `${DIST}/ai-translate.meta.js`;
export const SCRIPT_URL = `${DIST}/ai-translate.user.js`;

/**
 * "0.2.1a.1" is the numbers 0, 2 and 1, the stage "a" and the counter 1. A
 * version with no stage, "1.0.0.7", has the counter as its fourth number.
 */
function readVersion(version: string) {
    const [, numbers = "", stage = "", rest = ""] = /^(\d+(?:\.\d+)*)([a-z]*)((?:\.\d+)*)/i.exec(version.trim()) ?? [];
    const all = numbers.split(".").map(Number);
    return {
        main: all.slice(0, 3),
        stage: stage.toLowerCase(),
        counter: [...all.slice(3), ...rest.split(".").filter(Boolean).map(Number)]
    };
}

/** Number by number, so 0.10.0 is newer than 0.9.1 and a counter of 10 is newer than 9. */
function order(a: number[], b: number[]) {
    for (let i = 0; i < Math.max(a.length, b.length); i++)
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0) ? 1 : -1;
    return 0;
}

/** No letter is the release itself, which comes after every stage before it: 0.2.1a, then 0.2.1b, then 0.2.1. */
function stageOrder(a: string, b: string) {
    if (a === b) return 0;
    if (a === "") return 1;
    if (b === "") return -1;
    return a > b ? 1 : -1;
}

/**
 * The three numbers, then the stage letter, then the counter, which is the
 * order Tampermonkey documents. Violentmonkey does not see the letter, and the
 * two agree on every pair of builds while the counter only grows, which is
 * what test/version.mjs holds.
 */
export function isNewer(found: string, mine: string) {
    const a = readVersion(found);
    const b = readVersion(mine);
    return (order(a.main, b.main) || stageOrder(a.stage, b.stage) || order(a.counter, b.counter)) > 0;
}

/** The @version of the header on main. Throws when it cannot be found out. */
export async function newestVersion() {
    const res = await pickNet()({
        // Past the five minutes GitHub keeps a raw file for.
        url: `${META_URL}?${Date.now()}`,
        headers: { "Cache-Control": "no-cache" },
        // The manager may be waiting for its owner to allow this address.
        signal: timeoutSignal(30_000)
    });
    if (res.status !== 200) throw new Error(res.status === -1 ? res.data : `HTTP ${res.status}`);

    const found = /^\/\/\s*@version\s+(\S+)/m.exec(res.data)?.[1];
    if (!found) throw new Error("no @version in the header");
    return found;
}

type Phase = "idle" | "checking" | "found" | "opened" | "current" | "offline";

const LABEL: Record<Phase, () => string> = {
    idle: () => t("update.check"),
    checking: () => t("update.checking"),
    found: () => t("update.browserInstall"),
    opened: () => t("update.reload"),
    current: () => t("update.check"),
    offline: () => t("update.check")
};

/** Nothing is said until there is an answer to report. */
const NOTE: Partial<Record<Phase, () => string>> = {
    found: () => t("update.browserFound"),
    opened: () => t("update.browserOpened"),
    current: () => t("update.current"),
    offline: () => t("update.offline")
};

export function updateRow() {
    const box = document.createElement("div");
    box.className = "foot update";

    let phase: Phase = "idle";
    const said = hint();

    const draw = () => {
        go.textContent = LABEL[phase]();
        go.disabled = phase === "checking";
        said.textContent = NOTE[phase]?.() ?? "";
        said.classList.toggle("bad", phase === "offline");
    };

    const run = async () => {
        // The manager has put the new script under the page; the click asks for the page again.
        if (phase === "opened") return location.reload();

        // Nothing is awaited before this: the new tab has to open from the click
        // itself, or a pop-up blocker takes it for an advertisement.
        if (phase === "found") {
            if (!window.open(SCRIPT_URL, "_blank")) location.assign(SCRIPT_URL);
            phase = "opened";
            return draw();
        }

        phase = "checking";
        draw();
        try {
            phase = isNewer(await newestVersion(), SCRIPT_VERSION) ? "found" : "current";
        } catch {
            phase = "offline";
        }
        draw();
    };

    const go = button("", () => void run(), { primary: true, wide: true });
    draw();
    box.append(go, said);
    return box;
}
