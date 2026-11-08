// ==UserScript==
// @name            AI Translate
// @description     Unofficial. Translates your messages on Telegram Web before they are sent, and other people's when you ask, with an AI provider and your own API key
// @version         %version%
// @author          mozumidesu
// @namespace       https://github.com/mozumidesu/ai-translate-telegram
// @homepageURL     https://github.com/mozumidesu/ai-translate-telegram
// @supportURL      https://github.com/mozumidesu/ai-translate-telegram/issues
// @icon            data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgOTYgOTYwIDk2MCI+PHJlY3QgeD0iMCIgeT0iOTYiIHdpZHRoPSI5NjAiIGhlaWdodD0iOTYwIiByeD0iMjAwIiBmaWxsPSIjOEIyQkZGIi8+PHBhdGggdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTYgOTYpIHNjYWxlKC44KSIgZmlsbD0iI2ZmZiIgZD0ibTQ3NSA5NzYgMTgxLTQ4MGg4MmwxODYgNDgwaC04N2wtNDEtMTI2SDYwNGwtNDcgMTI2aC04MlptMTUxLTE5NmgxNDJsLTcwLTE5NGgtMmwtNzAgMTk0Wm0tNDY2IDc2LTU1LTU1IDIwNC0yMDRxLTM4LTQ0LTY3LjUtODguNVQxOTAgNDE2aDg3cTE3IDMzIDM3LjUgNjIuNVQzNjEgNTM5cTQ1LTQ3IDc1LTk3LjVUNDg3IDMzNkg0MHYtODBoMjgwdi04MGg4MHY4MGgyODB2ODBINTY3cS0yMiA2OS01OC41IDEzNS41VDQxOSA1OThsOTggOTktMzAgODEtMTI3LTEyMi0yMDAgMjAwWiIvPjwvc3ZnPg==
// @updateURL       https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram/main/dist/ai-translate.meta.js
// @downloadURL     https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram/main/dist/ai-translate.user.js
// @license         GPL-3.0-or-later
// @match           https://web.telegram.org/a/*
// @match           https://web.telegram.org/k/*
// @grant           GM_xmlhttpRequest
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addValueChangeListener
// @grant           GM_registerMenuCommand
// @grant           unsafeWindow
// @run-at          document-start
// @noframes
// @compatible      chrome Chrome + Tampermonkey or Violentmonkey
// @compatible      firefox Firefox + Tampermonkey
// @compatible      edge Edge + Tampermonkey or Violentmonkey
// ==/UserScript==

// AI Translate for Telegram Web: web.telegram.org/a/ and web.telegram.org/k/.
// Unofficial: not made, checked or endorsed by Telegram. Keys and settings
// stay in your userscript manager's storage; requests go straight from your
// browser to the AI provider you chose, and nowhere else.
//
// Source, in full, and the licence: https://github.com/mozumidesu/ai-translate-telegram
