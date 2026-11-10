/*
 * AI Translate for Telegram — which version this is.
 *
 * One version for the whole plugin: ai-translate/core/version.ts's, which is
 * what a person reads (under Logs, in the feedback form, in a report). Nothing
 * here raises it; it moves when the pinned core's does.
 *
 * A userscript manager offers an update only when the header's @version has
 * grown, so the header says the version with a build counter after it,
 * "0.2.1a.1" (build-counter.json, raised by hand, written by build.mjs). A
 * report names the build by the core's commit and the counter instead:
 * "0.2.1a (09710da-1)". CORE_COMMIT is the first seven characters of the
 * commit the core was built from.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { VERSION } from "../ai-translate/core/version";

declare const BUILD_COUNTER: number;
declare const CORE_COMMIT: string;

export { VERSION };

/** The header's @version, which a manager compares and Check for updates compares the header on main with. */
export const SCRIPT_VERSION = `${VERSION}.${BUILD_COUNTER}`;

/** What a report says under Build. */
export const BUILD_NAME = `${VERSION} (${CORE_COMMIT}-${BUILD_COUNTER})`;
