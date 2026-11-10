/*
 * AI Translate for Telegram — builds dist/ai-translate.user.js.
 *
 *   npm install && npm run build       or     node build.mjs
 *
 * One file: the script's own code and the core of ai-translate, the submodule
 * beside this file, pinned to a commit. Nothing from npm goes into it. The
 * build is the same byte for byte from the same sources, because the version
 * comes from the core, the build counter from build-counter.json and the
 * core's commit from the submodule, never from the clock, so test/dist.mjs
 * can say when dist/ was not rebuilt after a change. Beside the script goes
 * its header on its own, which is what a userscript manager reads to decide
 * whether there is an update.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, isAbsolute, join } from "path";
import { fileURLToPath } from "url";
import { buildCounter, coreCommit, coreVersion, findEsbuild } from "./test/lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const elsewhere = process.argv.find(a => a.startsWith("--out="))?.slice("--out=".length);
const out = elsewhere ?? join(here, "dist");

const esbuild = await findEsbuild();
const version = coreVersion();
const { counter } = buildCounter();
const core = coreCommit();
// What a manager compares: the plugin's version with the counter after it. The code has the version from the core itself (src/version.ts).
const header = (await readFile(join(here, "src", "meta.js"), "utf8")).replace("%version%", `${version}.${counter}`);

const built = await esbuild.build({
    entryPoints: [join(here, "src", "main.ts")],
    bundle: true,
    // Readable on purpose: a script that holds API keys should be easy to read before it is installed.
    minify: false,
    format: "iife",
    target: ["es2022"],
    platform: "browser",
    charset: "utf8",
    legalComments: "none",
    banner: { js: header },
    // The counter, for the header's number in the code (Check for updates) and a report's Build; and the core's commit, for the report to name.
    define: { BUILD_COUNTER: String(counter), CORE_COMMIT: JSON.stringify(core) },
    write: false,
    metafile: true,
    logLevel: "warning",
    plugins: [{
        name: "no outsiders",
        setup(build) {
            // Everything is the script's own or the core's. A bare import would mean something from npm crept in.
            build.onResolve({ filter: /^[^./]/ }, args => {
                if (!args.importer || isAbsolute(args.path)) return undefined;
                throw new Error(`the userscript reached outside its sources: ${args.path} (from ${args.importer})`);
            });
        }
    }]
});

await mkdir(out, { recursive: true });
const script = built.outputFiles[0].text;
await writeFile(join(out, "ai-translate.user.js"), script);
await writeFile(join(out, "ai-translate.meta.js"), header);

console.log(`AI Translate for Telegram ${version} (${core}-${counter}): ${Math.round(script.length / 1024)} KB`);
