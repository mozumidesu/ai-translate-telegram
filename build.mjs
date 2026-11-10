/*
 * AI Translate for Telegram — builds dist/ai-translate.user.js.
 *
 *   npm install && npm run build       or     node build.mjs
 *
 * One file: the script's own code and the core of ai-translate, the submodule
 * beside this file, pinned to a commit. Nothing from npm goes into it. The
 * build is the same byte for byte from the same sources, because the version
 * comes from package.json and the core's commit from the submodule, never from
 * the clock, so test/dist.mjs can say when dist/ was not rebuilt after a
 * change. Beside the script goes its header on its own, which is what a
 * userscript manager reads to decide whether there is an update.
 *
 * The desktop app is built from the same script: desktop/gen/inject.js is the
 * script as the app runs it (desktop/assemble.mjs), and desktop/version.json
 * is the version as an installer wants it written. With --out, both go there.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, isAbsolute, join } from "path";
import { fileURLToPath } from "url";
import { assemble, toSemver } from "./desktop/assemble.mjs";
import { coreCommit, findEsbuild } from "./test/lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const elsewhere = process.argv.find(a => a.startsWith("--out="))?.slice("--out=".length);
const out = elsewhere ?? join(here, "dist");

const esbuild = await findEsbuild();
const { version } = JSON.parse(await readFile(join(here, "package.json"), "utf8"));
const core = coreCommit();
const header = (await readFile(join(here, "src", "meta.js"), "utf8")).replace("%version%", version);

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
    // The same number as @version, for the line under Logs and for Check for updates; and the core's commit, for a report to name.
    define: { SCRIPT_VERSION: JSON.stringify(version), CORE_COMMIT: JSON.stringify(core) },
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

// The app's two: the script as it runs it, which git does not keep, and its version, which it does.
const shim = await readFile(join(here, "desktop", "shim.js"), "utf8");
const gen = elsewhere ?? join(here, "desktop", "gen");
await mkdir(gen, { recursive: true });
await writeFile(join(gen, "inject.js"), assemble({ shim, script }));
await writeFile(join(elsewhere ?? join(here, "desktop"), "version.json"), JSON.stringify({ version: toSemver(version) }) + "\n");

console.log(`AI Translate for Telegram ${version} (${core}): ${Math.round(script.length / 1024)} KB`);
