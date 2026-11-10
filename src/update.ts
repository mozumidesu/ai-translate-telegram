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
 * In the desktop app there is no manager: the script arrives with a release
 * of the app, so the same button asks the app, which looks at its releases
 * on GitHub, puts a newer one in and starts again (desktop/shim.js).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "../ai-translate/core/locales";
import { pickNet, timeoutSignal } from "../ai-translate/core/net";
import { button, hint } from "./sheet";
import { VERSION } from "./version";

/** The desktop app, when the script runs in one: its updater stands where a manager would. */
declare const AI_TRANSLATE_APP: { version: string; newest(): Promise<string | null>; install(): Promise<void>; } | undefined;
const app = typeof AI_TRANSLATE_APP !== "undefined" ? AI_TRANSLATE_APP : undefined;

/** Where the header's @updateURL and @downloadURL point; test/page.mjs holds the two to each other. */
const DIST = "https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram/main/dist";
export const META_URL = `${DIST}/ai-translate.meta.js`;
export const SCRIPT_URL = `${DIST}/ai-translate.user.js`;

/** The numbers of a version and its stage letter: "0.2.1a" is 0, 2, 1 and "a". */
function readVersion(version: string) {
    const [, numbers = "", stage = ""] = /^(\d+(?:\.\d+)*)([a-z]*)/i.exec(version.trim()) ?? [];
    return { numbers: numbers.split(".").map(Number), stage: stage.toLowerCase() };
}

/** Number by number, so 0.10.0 is newer than 0.9.1. With the numbers the same the stage decides: 0.2.1a, then 0.2.1b, then 0.2.1. */
export function isNewer(found: string, mine: string) {
    const a = readVersion(found);
    const b = readVersion(mine);
    for (let i = 0; i < Math.max(a.numbers.length, b.numbers.length); i++)
        if ((a.numbers[i] ?? 0) !== (b.numbers[i] ?? 0)) return (a.numbers[i] ?? 0) > (b.numbers[i] ?? 0);

    if (a.stage === b.stage) return false;
    // No letter is the release itself, which comes after every stage before it.
    if (a.stage === "") return true;
    if (b.stage === "") return false;
    return a.stage > b.stage;
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

type Phase = "idle" | "checking" | "found" | "installing" | "opened" | "current" | "offline";

const LABEL: Record<Phase, () => string> = {
    idle: () => t("update.check"),
    checking: () => t("update.checking"),
    found: () => t("update.browserInstall"),
    installing: () => t("update.installing"),
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
    /** In the app, the release found: named beside the button, as the line under Logs names this one. */
    let found = "";
    const said = hint();

    const draw = () => {
        go.textContent = LABEL[phase]();
        go.disabled = phase === "checking" || phase === "installing";
        said.textContent = app && phase === "found" ? `AI Translate · ${found}` : NOTE[phase]?.() ?? "";
        said.classList.toggle("bad", phase === "offline");
    };

    /** The app's own releases: it puts the newer one in and starts again, so `install` comes back only when it could not. */
    const runInApp = async (app: NonNullable<typeof AI_TRANSLATE_APP>) => {
        const installing = phase === "found";
        phase = installing ? "installing" : "checking";
        draw();
        try {
            if (installing) await app.install();
            found = (await app.newest()) ?? "";
            phase = found ? "found" : "current";
            // Still there after an install that came back: it did not go in.
            if (installing && found) phase = "offline";
        } catch {
            phase = "offline";
        }
        draw();
    };

    const run = async () => {
        if (app) return runInApp(app);

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
            phase = isNewer(await newestVersion(), VERSION) ? "found" : "current";
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
