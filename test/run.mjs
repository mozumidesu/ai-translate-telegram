/*
 * AI Translate for Telegram — every check that runs without the internet.
 *
 *   npm test        or     node test/run.mjs
 *
 * test/live.mjs is not among them: it opens the real web.telegram.org.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawnSync } from "child_process";
import { join } from "path";
import { ROOT } from "./lib.mjs";

const TESTS = ["formatted", "weba", "webk", "defaults", "strings", "version", "dist", "page"];

const failed = [];
for (const name of TESTS) {
    const run = spawnSync(process.execPath, [join(ROOT, "test", `${name}.mjs`)], { encoding: "utf8" });
    const last = (run.stdout.trim().split("\n").at(-1) ?? "").trim();
    console.log(`${run.status === 0 ? "ok  " : "FAIL"} ${name.padEnd(10)} ${last}`);
    if (run.status !== 0) {
        failed.push(name);
        process.stdout.write(run.stdout.split("\n").filter(line => !line.startsWith("PASS")).join("\n") + run.stderr);
    }
}

process.exit(failed.length ? 1 : 0);
