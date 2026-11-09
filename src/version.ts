/*
 * AI Translate for Telegram — which version this is.
 *
 * This script's own number: package.json's, which build.mjs writes into the
 * header as @version, the one a userscript manager compares, and into the
 * code as SCRIPT_VERSION. ai-translate/core/version.ts is the Discord
 * plugin's number, not this script's. Beside it, CORE_COMMIT: the first seven
 * characters of the commit the core was built from, which a report names.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare const SCRIPT_VERSION: string;
declare const CORE_COMMIT: string;

export const VERSION = SCRIPT_VERSION;
export const CORE = CORE_COMMIT;
