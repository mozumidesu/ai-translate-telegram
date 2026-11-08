/*
 * AI Translate for Telegram — what every test needs: esbuild, a module built
 * from the sources, and a way to say pass or fail.
 *
 * esbuild is looked for beside the project (npm install), then where ESBUILD
 * points, then in ~/tools, which is where ai-translate's own tests look.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const WHERE = [join(ROOT, "node_modules", "esbuild"), process.env.ESBUILD, "esbuild", `${process.env.HOME}/tools/node_modules/esbuild`]
    .filter(Boolean)
    .flatMap(where => [where, `${where}/lib/main.js`]);

export async function findEsbuild() {
    for (const candidate of WHERE) {
        try {
            return await import(candidate);
        } catch {
            // Try the next one.
        }
    }
    console.error("No esbuild. Run npm install, or point ESBUILD at one.");
    process.exit(2);
}

/** `exports` is a module's worth of `export ... from "./src/..."` lines; what comes back is that module, built. */
export async function built(exports) {
    const esbuild = await findEsbuild();
    const out = await mkdtemp(join(tmpdir(), "ai-translate-telegram-"));
    const file = join(out, "module.mjs");

    await esbuild.build({
        stdin: { contents: exports, resolveDir: ROOT, loader: "ts" },
        bundle: true,
        format: "esm",
        platform: "node",
        outfile: file,
        logLevel: "error"
    });

    return import(file);
}

let passed = 0;
let failed = 0;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** One check: what came out against what had to. */
export function check(name, got, want) {
    const ok = same(got, want);
    ok ? passed++ : failed++;
    console.log(ok ? "PASS" : "FAIL", name);
    if (!ok) console.log("       got: ", JSON.stringify(got), "\n       want:", JSON.stringify(want));
    return ok;
}

export function done() {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}
