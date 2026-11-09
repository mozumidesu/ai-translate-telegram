/*
 * AI Translate for Telegram — which version this is, and which of two is newer.
 *
 * The script's version has the plugin's shape (ai-translate/core/version.ts):
 * three numbers and a letter for the stage, "a" while this is early, "b" once
 * it is a beta, and none from 1.0.0 on. Check for updates compares two of them,
 * so the letter has to count: 0.2.1a, then 0.2.1b, then 0.2.1.
 *
 * Run it:  node test/version.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { built, check, done, version } from "./lib.mjs";

check("the version has the plugin's shape: the stage letter, a or b, while it is below 1.0.0",
    /^(0\.\d+\.\d+[ab]|[1-9]\d*\.\d+\.\d+)$/.test(await version()), true);

const { isNewer } = await built(`export { isNewer } from "./src/update";\n`);

// What was found on main, what is installed, and whether the first is newer.
const CASES = [
    ["0.2.1a", "0.2.1a", false],
    ["0.2.2a", "0.2.1a", true],
    ["0.3.0a", "0.2.9a", true],
    ["0.2.1a", "0.2.0", true],
    ["0.10.0a", "0.9.1a", true],
    ["0.2.0a", "0.2.1a", false],
    ["0.2.1b", "0.2.1a", true],
    ["0.2.1a", "0.2.1b", false],
    ["0.2.1", "0.2.1b", true],
    ["0.2.1", "0.2.1a", true],
    ["0.2.1a", "0.2.1", false],
    ["1.0.0", "0.9.9b", true]
];

for (const [found, mine, newer] of CASES)
    check(`${found} on main, ${mine} installed: ${newer ? "an update" : "nothing to update"}`, isNewer(found, mine), newer);

done();
