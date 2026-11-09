/*
 * AI Translate for Telegram — which version this is.
 *
 * This script's own number: package.json's, which build.mjs writes into the
 * header as @version, the one a userscript manager compares, and into the
 * code as SCRIPT_VERSION. ai-translate/core/version.ts is the Discord
 * plugin's number, not this script's.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare const SCRIPT_VERSION: string;

export const VERSION = SCRIPT_VERSION;
