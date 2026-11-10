/*
 * AI Translate for Telegram — latest.json, which the app's updater reads.
 *
 * The Tauri updater asks the latest release for this file, finds its own
 * system in it, downloads what the entry names and checks it against the
 * signature beside it. The release workflow signs each installer as it builds
 * it (a `.sig` beside the file) and calls this once all three systems are in:
 *
 *   node desktop/latest.mjs <tag> <folder with the .sig files>     prints latest.json
 *
 * An installer with no signature is left out, so an app never tries an
 * update it would refuse. With none at all there is nothing to print, and
 * the exit code says so.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { toSemver } from "./assemble.mjs";

const REPOSITORY = "https://github.com/mozumidesu/ai-translate-telegram";

/** What an installer is called in a release: the app, the script's version, the system, no spaces. */
export const fileName = (version, kind) => `AI-Translate_${version}_${KINDS[kind].suffix}`;

/** Each installer the workflow makes, and the updater's names for who it is for. */
export const KINDS = {
    appimage: { suffix: "linux_x86_64.AppImage", targets: ["linux-x86_64-appimage", "linux-x86_64"] },
    deb: { suffix: "linux_amd64.deb", targets: ["linux-x86_64-deb"] },
    nsis: { suffix: "windows_x64-setup.exe", targets: ["windows-x86_64-nsis", "windows-x86_64"] },
    // One file for both kinds of Mac.
    app: { suffix: "macos_universal.app.tar.gz", targets: ["darwin-aarch64-app", "darwin-x86_64-app", "darwin-aarch64", "darwin-x86_64"] },
    // What a person downloads for a Mac; the updater takes the .app above.
    dmg: { suffix: "macos_universal.dmg", targets: [] }
};

/** `signatures` is file name to the text of its `.sig`. */
export function latest(version, signatures, date = new Date()) {
    const platforms = {};
    for (const kind of Object.keys(KINDS)) {
        const file = fileName(version, kind);
        const signature = signatures[file]?.trim();
        if (!signature) continue;
        for (const target of KINDS[kind].targets) platforms[target] = { signature, url: `${REPOSITORY}/releases/download/v${version}/${file}` };
    }

    return { version: toSemver(version), notes: `${REPOSITORY}/releases/tag/v${version}`, pub_date: date.toISOString(), platforms };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [tag, folder] = process.argv.slice(2);
    if (!tag?.startsWith("v") || !folder) {
        console.error("node desktop/latest.mjs <tag> <folder with the .sig files>");
        process.exit(2);
    }

    const signatures = {};
    for (const name of await readdir(folder))
        if (name.endsWith(".sig")) signatures[name.slice(0, -".sig".length)] = await readFile(join(folder, name), "utf8");

    const made = latest(tag.slice(1), signatures);
    if (!Object.keys(made.platforms).length) {
        console.error("No signed installer: nothing for an updater to read.");
        process.exit(1);
    }
    console.log(JSON.stringify(made, null, 2));
}
