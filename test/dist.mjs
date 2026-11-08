/*
 * AI Translate for Telegram — is dist/ what the sources build?
 *
 * People install the script from dist/ on main, and their userscript manager
 * updates it from there, so a change to src/ without a rebuild reaches nobody,
 * and a dist/ edited by hand reaches everybody unreviewed. The build is the
 * same byte for byte from the same sources; this builds afresh and compares.
 *
 * Run it:  node test/dist.mjs      (npm run build fixes what it finds)
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFileSync } from "child_process";
import { mkdtemp, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { check, done, ROOT } from "./lib.mjs";

const out = await mkdtemp(join(tmpdir(), "ai-translate-telegram-dist-"));
execFileSync(process.execPath, [join(ROOT, "build.mjs"), `--out=${out}`], { stdio: "pipe" });

for (const name of ["ai-translate.user.js", "ai-translate.meta.js"]) {
    const fresh = await readFile(join(out, name), "utf8");
    const committed = await readFile(join(ROOT, "dist", name), "utf8").catch(() => "");
    check(`dist/${name} is what the sources build`, fresh === committed, true);
}

const header = await readFile(join(ROOT, "dist", "ai-translate.meta.js"), "utf8");
const script = await readFile(join(ROOT, "dist", "ai-translate.user.js"), "utf8");
check("the script starts with the header a manager updates it from", script.startsWith(header), true);

done();
