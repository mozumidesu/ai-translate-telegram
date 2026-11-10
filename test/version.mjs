/*
 * AI Translate for Telegram — one version, and which build a manager takes for newer.
 *
 * What a person reads is ai-translate's core/version.ts, "0.2.1a": the
 * plugin's shape, three numbers and a letter for the stage, "a" while this is
 * early, "b" once it is a beta and none from 1.0.0 on. Nothing here raises it.
 *
 * A userscript manager offers an update only when the header's @version is
 * newer than the installed copy's, so that has to grow with every published
 * build. It is the plugin's version with a build counter after it,
 * "0.2.1a.1": build-counter.json's, raised by hand when a change must reach
 * installed copies, and never lowered.
 *
 * Which of two such strings a manager takes for newer is not ours to decide,
 * so this reads what each one does.
 *
 *   Violentmonkey is open source: its own comparison is copied below, from
 *   release 2.50.0 (the same as its main branch on 10 November 2026). It
 *   reads each part of the numbers as a whole number and so cannot see a
 *   stage letter: 0.9.9a and 0.9.9b are one version to it. A later build is
 *   newer to it by its numbers or by its counter, and a build that moves only
 *   the letter is newer only by the counter. That is why the counter goes up
 *   with every move of the plugin's version, and never goes back to 1.
 *
 *   Tampermonkey is not open source, and its code is not taken apart here.
 *   What it publishes is an order, tampermonkey.net/documentation.php?q=version,
 *   copied below as data as it stood on 10 November 2026. Held against it is
 *   Check for updates' own comparison (src/update.ts, isNewer), on every pair
 *   of that list it can read. A stage letter followed by a counter, 0.2.1a.1,
 *   is not in the list. It is read part by part, as the entries that carry
 *   something after a non-number are: 1.11.0-alpha below 1.11.0-alpha.1,
 *   1.12+1.0 below 1.12+1.1.
 *
 * Run it:  node test/version.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { buildCounter, built, check, coreCommit, coreVersion, done, headerVersion, ROOT } from "./lib.mjs";

const { isNewer, SCRIPT_VERSION, BUILD_NAME, VERSION } = await built(
    `export { isNewer } from "./src/update";\nexport { BUILD_NAME, SCRIPT_VERSION, VERSION } from "./src/version";\n`
);

// --- One version

check("the plugin's version has its shape: three numbers, and the stage letter, a or b, while it is below 1.0.0",
    /^(0\.\d+\.\d+[ab]|[1-9]\d*\.\d+\.\d+)$/.test(coreVersion()), true);
check("what the script shows is the core's own, as the core says it", VERSION, coreVersion());

const { counter, version: raisedFor } = buildCounter();
check(`the counter, ${counter}, was raised for the plugin's version the core says now: when that moves, raise the counter and say so in build-counter.json`,
    raisedFor, coreVersion());

check("the header's @version, which a manager compares, is that version and the counter after it", SCRIPT_VERSION, headerVersion());
check("and a report's Build names the version, the core's commit and the counter", BUILD_NAME, `${coreVersion()} (${coreCommit()}-${counter})`);

const template = await readFile(join(ROOT, "src", "meta.js"), "utf8");
check("the header's @version is written by the build, from those two", template.match(/^\/\/ @version +(\S+)$/m)?.[1], "%version%");

const committed = (await readFile(join(ROOT, "dist", "ai-translate.meta.js"), "utf8")).match(/^\/\/ @version +(\S+)$/m)?.[1];
check("dist/ carries it: when it does not, npm run build was forgotten", committed, headerVersion());

const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
check("package.json has no version of its own: there is one", "version" in pkg, false);

// --- Violentmonkey, as it is written

/*
 * Violentmonkey 2.50.0, src/common/util.js: https://github.com/violentmonkey/violentmonkey
 * MIT License, Copyright (c) 2017 Gerald. Copied as it is, with `export` taken off.
 */
const VERSION_RE = /^(.*?)-([-.0-9a-z]+)|$/i;
const DIGITS_RE = /^\d+$/; // using regexp to avoid +'1e2' being parsed as 100

/** @return -1 | 0 | 1 */
function compareVersion(ver1, ver2) {
  // Used in safe context
  // eslint-disable-next-line no-restricted-syntax
  const [, main1 = ver1 || '', pre1] = VERSION_RE.exec(ver1);
  // eslint-disable-next-line no-restricted-syntax
  const [, main2 = ver2 || '', pre2] = VERSION_RE.exec(ver2);
  const delta = compareVersionChunk(main1, main2)
    || !pre1 - !pre2 // 1.2.3-pre-release is less than 1.2.3
    || pre1 && compareVersionChunk(pre1, pre2, true); // if pre1 is present, pre2 is too
  return delta < 0 ? -1 : +!!delta;
}

function compareVersionChunk(ver1, ver2, isSemverMode) {
  const parts1 = ver1.split('.');
  const parts2 = ver2.split('.');
  const len1 = parts1.length;
  const len2 = parts2.length;
  const len = (isSemverMode ? Math.min : Math.max)(len1, len2);
  let delta;
  for (let i = 0; !delta && i < len; i += 1) {
    const a = parts1[i];
    const b = parts2[i];
    if (isSemverMode) {
      delta = DIGITS_RE.test(a) && DIGITS_RE.test(b)
        ? a - b
        : a > b || a < b && -1;
    } else {
      delta = (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
    }
  }
  return delta || isSemverMode && (len1 - len2);
}

const violentmonkey = (later, earlier) => compareVersion(later, earlier);

// --- Tampermonkey, as it is published

/**
 * Its documentation's own list, in its order: "the next entry is considered
 * to be a higher version number". Entries of one step are equal.
 */
const TAMPERMONKEY = [
    ["Alpha-v1"],
    ["Alpha-v2"],
    ["Alpha-v10"],
    ["Beta"],
    ["0.5pre3"],
    ["0.5prelimiary"],
    ["0.6pre4"],
    ["0.6pre5"],
    ["0.7pre4"],
    ["0.7pre10"],
    ["1.-1"],
    ["1", "1.", "1.0", "1.0.0"],
    ["1.1a"],
    ["1.1aa"],
    ["1.1ab"],
    ["1.1b"],
    ["1.1c"],
    ["1.1.-1"],
    ["1.1", "1.1.0", "1.1.00"],
    ["1.1.1.1.1"],
    ["1.1.1.1.2"],
    ["1.1.1.1"],
    ["1.10.0-alpha"],
    ["1.10", "1.10.0"],
    ["1.11.0-0.3.7"],
    ["1.11.0-alpha"],
    ["1.11.0-alpha.1"],
    ["1.11.0-alpha+1"],
    ["1.12+1", "1.12+1.0"],
    ["1.12+1.1", "1.12+1.1.0"],
    ["1.12+2"],
    ["1.12+2.1"],
    ["1.12+3"],
    ["1.12+4"],
    ["1.12"],
    ["2.0"],
    ["16.4", "16.04"],
    ["2023-08-17.alpha"],
    ["2023-08-17"],
    ["2023-08-17_14-04", "2023-08-17_14-04.0"],
    ["2023-08-17+alpha"],
    ["2023-09-11_14-0"]
];

/** Numbers and dots, then a stage letter or none: what isNewer reads. A hyphen, a plus or a digit after a letter is something else. */
const readable = version => /^\d+(?:\.\d+)*\.?[a-z]*$/.test(version);

const apart = [];
let compared = 0;
TAMPERMONKEY.forEach((step, i) => {
    // Equal to each other.
    for (const a of step) for (const b of step)
        if (a !== b && readable(a) && readable(b)) {
            compared++;
            if (isNewer(a, b)) apart.push(`${a} == ${b}`);
        }

    // Lower than the next step.
    for (const a of step) for (const b of TAMPERMONKEY[i + 1] ?? [])
        if (readable(a) && readable(b)) {
            compared++;
            if (!isNewer(b, a) || isNewer(a, b)) apart.push(`${a} < ${b}`);
        }
});

check("Check for updates agrees with every pair of Tampermonkey's published order that it can read, but one, 1.1.1.1.2 below 1.1.1.1: a version that runs on past a shorter one is lower there",
    apart, ["1.1.1.1.2 < 1.1.1.1"]);
check("and that is a good part of the list, not a few", compared >= 30, true);

// --- The builds

/** One run of builds, as they would be published, each a change that had to reach installed copies. */
const BUILDS = [
    "0.2.1a.1",
    "0.2.1a.2",
    "0.2.1a.9",
    "0.2.1a.10",
    "0.2.2a.11",
    "0.3.0a.12",
    "0.9.9a.13",
    // Only the stage letter moves here, which Violentmonkey cannot see: the counter has to.
    "0.9.9b.14",
    "1.0.0.15",
    "1.0.0.99",
    "1.0.0.100",
    "1.0.1.101",
    "1.1.0.102"
];

check("every build is the plugin's version and a counter, four parts, so that one order of Tampermonkey's, a longer version below a shorter, never applies to two of them",
    BUILDS.filter(build => !/^\d+\.\d+\.\d+[ab]?\.\d+$/.test(build)), []);

const wrong = (newer, older) => BUILDS.flatMap((a, i) => BUILDS.slice(i + 1).flatMap(b => newer(b, a) === true && older(a, b) === true ? [] : [`${b} after ${a}`]));

check("Violentmonkey takes every build for newer than each one before it, and for older than each one after it",
    wrong((b, a) => violentmonkey(b, a) === 1, (a, b) => violentmonkey(a, b) === -1), []);
check("and Check for updates does, which follows Tampermonkey's order", wrong((b, a) => isNewer(b, a), (a, b) => !isNewer(a, b)), []);

check("Violentmonkey: a higher counter is newer, and past one digit and past two",
    [["0.2.1a.2", "0.2.1a.1"], ["0.2.1a.10", "0.2.1a.9"], ["0.2.1a.100", "0.2.1a.99"]].map(([later, earlier]) => violentmonkey(later, earlier)), [1, 1, 1]);
check("Violentmonkey: a later version is newer by its numbers, with the counter kept or going up",
    [["0.2.2a.1", "0.2.1a.1"], ["0.3.0a.1", "0.2.9a.1"], ["1.0.0.1", "0.9.9b.1"], ["0.2.2a.12", "0.2.1a.11"]].map(([later, earlier]) => violentmonkey(later, earlier)), [1, 1, 1, 1]);
check("Violentmonkey does not see a stage letter: 0.9.9b.14 and 0.9.9a.14 are one version to it",
    violentmonkey("0.9.9b.14", "0.9.9a.14"), 0);
check("so with the counter back at 1, the beta is older than the alpha before it: the counter never goes down, and goes up with every move of the version",
    violentmonkey("0.9.9b.1", "0.9.9a.14"), -1);

// What Check for updates itself reads, one pair at a time; the cases without a counter are the order of the numbers and the stage alone.
const CASES = [
    // What was found on main, what is installed, and whether the first is newer.
    ["0.2.1a.1", "0.2.1a.1", false],
    ["0.2.1a.2", "0.2.1a.1", true],
    ["0.2.1a.1", "0.2.1a.2", false],
    ["0.2.1a.10", "0.2.1a.9", true],
    ["0.2.1a.9", "0.2.1a.10", false],
    ["0.2.2a.1", "0.2.1a.7", true],
    ["0.2.1a.7", "0.2.2a.1", false],
    ["0.9.9b.14", "0.9.9a.13", true],
    ["1.0.0.15", "0.9.9b.14", true],
    ["1.0.0.8", "1.0.0.7", true],
    ["1.0.0.7", "1.0.0.7", false],
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
