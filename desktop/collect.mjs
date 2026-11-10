/*
 * AI Translate for Telegram — the installers a build made, under the names a release gives them.
 *
 * Tauri names its bundles after the product, space and all, and puts them in a
 * folder per kind. A release wants one flat list with no spaces, the script's
 * own version in each name, and the signature beside the file it signs:
 *
 *   node desktop/collect.mjs <folder>      after `npx tauri build`, on any of the three systems
 *
 * It copies what this system builds into the folder, prints each file's size
 * and SHA-256, and fails when one that should be there is not.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash } from "crypto";
import { copyFile, mkdir, readdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { fileName } from "./latest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) {
    console.error("node desktop/collect.mjs <folder>");
    process.exit(2);
}

const { version } = JSON.parse(await readFile(join(here, "..", "package.json"), "utf8"));

/** Which bundle is which, by how Tauri ends its name; and which of them each system must have made. */
const ENDINGS = { appimage: ".AppImage", deb: ".deb", nsis: "-setup.exe", app: ".app.tar.gz", dmg: ".dmg" };
const EXPECTED = { linux: ["appimage", "deb"], win32: ["nsis"], darwin: ["dmg"] }[process.platform] ?? [];

async function filesUnder(folder) {
    const found = [];
    for (const entry of await readdir(folder, { withFileTypes: true }).catch(() => [])) {
        const path = join(folder, entry.name);
        // An .app is a folder of its own, and nothing inside it is an installer.
        if (entry.isDirectory() && !entry.name.endsWith(".app")) found.push(...await filesUnder(path));
        else if (entry.isFile()) found.push(path);
    }
    return found;
}

// target/release/bundle, or target/<triple>/release/bundle when a target was named.
const bundles = (await filesUnder(join(here, "target"))).filter(path => /[\\/]release[\\/]bundle[\\/]/.test(path));

await mkdir(out, { recursive: true });
const made = [];
for (const [kind, ending] of Object.entries(ENDINGS)) {
    const file = bundles.find(path => path.endsWith(ending));
    if (!file) continue;

    const name = fileName(version, kind);
    await copyFile(file, join(out, name));
    made.push(kind);

    const bytes = await readFile(file);
    const signed = bundles.includes(`${file}.sig`);
    if (signed) await copyFile(`${file}.sig`, join(out, `${name}.sig`));
    console.log(`${name}  ${(bytes.length / 1024 / 1024).toFixed(1)} MB  sha256 ${createHash("sha256").update(bytes).digest("hex")}${signed ? "  signed for the updater" : ""}`);
}

const missing = EXPECTED.filter(kind => !made.includes(kind));
if (missing.length) {
    console.error(`Not built: ${missing.join(", ")}.`);
    process.exit(1);
}
