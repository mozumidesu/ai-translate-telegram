# AI Translate for Telegram

A userscript that runs AI Translate in Telegram Web, in a browser, in both
clients: Web A (`web.telegram.org/a/`, Ajaxy/telegram-tt) and Web K
(`web.telegram.org/k/`, morethanwords/tweb). It translates outgoing messages in
the chats switched on, and incoming ones from a message's menu.

## Hard constraints

- **The core is `ai-translate/`, a submodule pinned to a commit, used
  unchanged.** Never copy `core/` or a prompt rule into this repository. What
  Telegram needs from the core (a dialect, a string, a host member) goes into
  mozumidesu/ai-translate itself, on its `main`, with its checks passing,
  and the pin moves after it. Discord's prompts stay byte for byte what they
  were; ai-translate's `test/prompts.mjs` pins that.
- **No strings of our own.** Every word a person sees is a key of
  `ai-translate/core/locales.ts`, which has all 16 languages. A new string
  means all 16, added there. `test/strings.mjs` fails on a key the core lacks.
- **The project is called AI Translate for Telegram**, in prose and in
  headings, and the name takes nothing after Telegram. **The script's `@name`
  is "AI Translate"**, with no Telegram in it and no Telegram logo anywhere.
  "Unofficial" is in the script's `@description` and in the repository's About,
  and nowhere else: the README carries no disclaimer. The script's `@namespace`
  is this repository, so a manager never takes it for the Discord userscript.
  GPL-3.0-or-later.
- **Keys and settings stay in the userscript manager's storage.** No server of
  ours; requests go from the browser to the provider through
  `GM_xmlhttpRequest`.
- **Conversation context is off by default**: it sends other people's
  messages. `test/defaults.mjs` names that difference, and every other
  default must match `ai-translate/settings.ts`.
- **`dist/` is built and committed.** People install and update from
  `dist/` on `main`. The build is deterministic; `test/dist.mjs` fails
  when `npm run build` was forgotten. Whether a change reaches installed
  copies is the counter's doing, below.
- **The README is English only for now.** The 15 translations
  (`docs/README.<code>.md`, as in ai-translate) follow once the owner has
  approved the English wording, and are not written before.

## The version

There is one, the plugin's: `ai-translate/core/version.ts`, `0.2.1a` today,
read from the submodule when the script is built. It is what a person sees: the
line under Logs, the early-build line of the feedback form, and what Check for
updates takes the installed script to be. Nothing here raises it. It moves when
ai-translate's release does, and the pin follows. `package.json` has no
version.

A userscript manager offers an update only when the header's `@version` has
grown, so the header says `<VERSION>.<counter>`, `0.2.1a.1`. The counter is
`build-counter.json`'s, raised by hand when a change must reach installed
copies, and the file records which VERSION it was raised for. A report's Build
says `<VERSION> (<core commit>-<counter>)`, `0.2.1a (09710da-1)`: the first
seven characters of the commit `git submodule status` shows for `ai-translate`,
a dash, the counter.

- **The counter only goes up.** Not back to 1 when VERSION moves, not ever.
  Violentmonkey reads each dotted part of the numbers as a whole number and
  cannot see the stage letter: to it `0.9.9b.1` is older than `0.9.9a.14`.
  Tampermonkey does see the letter. With a counter that only grows, both read
  every build as newer than the one before, past one digit and past two.
- **Raise it whenever the pinned VERSION moves**, though the numbers alone
  would often do: a move that changes only the letter, `0.9.9a` to `0.9.9b`,
  is no move at all to Violentmonkey. `test/version.mjs` fails when the counter
  was raised for another VERSION than the core says now.
- **A pin that moves to the same VERSION** raises nothing by itself: raise the
  counter when that change must reach installed copies.
- After either, `npm run build` and commit `dist/`. A counter raised and not
  built fails `test/version.mjs` and `test/dist.mjs` both.
- **History.** Copies installed before the counter say `0.2.3a`. To every
  manager that is newer than `0.2.1a.1`, because the third number decides, so
  none of them is offered it: each takes one reinstall by hand from the
  `.user.js` link. No counter makes it otherwise. Do not try.
- `test/version.mjs` holds all of this against Violentmonkey's own comparison,
  copied from its source, and Tampermonkey's published order, which is all of
  Tampermonkey that is public.

## What each file does

| File | Responsible for |
|---|---|
| `src/main.ts` | Starts at document-start, picks the client, installs the hooks |
| `src/weba.ts` | Web A: wraps the GramJS worker's `postMessage`, holds `sendMessage` until it is translated |
| `src/webk.ts` | Web K: wraps `apiManagerProxy.invoke`, marks what was typed into a field through `ChatInput.sendMessageWithForward` |
| `src/client.ts`, `src/page.ts` | What each client has to answer, one shape for both; the page's own window and which client it is |
| `src/outgoing.ts` | Whether a message is translated, and what happens when that fails |
| `src/formatted.ts` | Telegram's entities as the core's marks on the way to the model, and back |
| `src/menu.ts` | The items in a message's menu, and the card with the answer |
| `src/learn.ts`, `src/notes.ts` | AI Learn and its Corrections window, and the line of ours under your own messages: a correction, or what you typed |
| `src/composer.ts`, `src/panel.ts` | The chat bar button and the panel behind it: the languages and this chat |
| `src/settings.ts`, `src/logs.ts`, `src/sheet.ts` | The settings page in the plugin's order, the Logs window with the version under it, and the windows they open in |
| `src/version.ts`, `src/update.ts` | The version and the header's `@version`; Check for updates, and the order it reads two versions in |
| `src/feedback.ts` | The source and support links beside the settings title, and the feedback form |
| `src/host.ts`, `src/storage.ts`, `src/ui.ts`, `src/relay.ts`, `src/icons.ts` | The core's host, settings, the shadow root, word between tabs, the icons |
| `src/meta.js` | The userscript header, with `%version%` for the build to fill in |
| `build.mjs`, `build-counter.json` | The build: header, bundle and counter; the counter and the VERSION it was raised for |
| `dist/` | The built script and its header on their own, which is what a manager reads to decide whether there is an update |
| `test/` | The checks; `fixtures/` are pages shaped like both clients |
| `docs/test-plan.md` | What a person with a real account tries, since a cloud session cannot sign in |

## Where the hooks are

Both clients change often. Read again before relying on any of this:

- **Web A**: `src/api/gramjs/worker/connector.ts` posts
  `{ payloads: [{ type: "callMethod", name, args, messageId }] }` to the GramJS
  worker, created with `new Worker(...)` after the script has wrapped it. The
  local message is built inside the worker, so holding `sendMessage` holds
  everything. The chat bar's sends carry `wasDrafted`; a bot's button does
  not. Other tabs reach the worker through the tab that runs it.
- **Web K**: `src/config/debug.ts` mounts objects on the window;
  `apiManagerProxy.invoke("manager", { name, method, args })` is the one call
  every manager proxy makes (`src/lib/getProxiedManagers.ts`). What was typed
  goes through `ChatInput.sendMessageWithForward` with an `inputField`,
  marked by a symbol in `sendTextParams` that the spread carries into
  `sendText`. The AI Editor sends there with text and no field, and goes as
  written. Edits come from `saveEditedMessage`.

`node test/live.mjs` opens the real sites, without signing in, and says
whether the hooks still go in front of those lines.

## Our own interface

Everything of ours sits in closed shadow roots: the windows and notices in
one, the chat bar button and each line under a message in their own. Seen
from the page, an event inside one has the root's host as its target and a
`composedPath()` that stops there, so whether something happened inside is
asked of the target, never of the path. `test/page.mjs` keeps the roots
closed, as a browser does, and holds a handle on each.

The windows come and go as the client's own do: `windows` in `weba.ts` and
`webk.ts` holds the timings, taken from the client's sources, and what its
animation setting leaves. A window that is shutting stays drawn for 350ms
(Web A) or 250ms (Web K) with `.closing`, and is no longer open, so a test
waits for `settled` before it reads or clicks. Their widths are Discord's.

## Running things

```
npm install
npm run build
npm test             # formatted, weba, webk, defaults, strings, version, dist, page
node test/live.mjs   # needs the internet
tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler \
    --lib es2022,dom,dom.iterable --skipLibCheck src/main.ts
```

esbuild strips types without reading them; the `tsc` line reads them. Only
the core's Vencord side may complain there: `ai-translate/core/bridge.ts`
about Vencord's globals, and `ai-translate/native.ts`, which the bridge takes
its types from, about Node's and Electron's.

`test/page.mjs` needs Playwright's Chromium; without it, it skips unless
`REQUIRE_BROWSER` is set, as CI sets it. A cloud session cannot sign in to
Telegram, so a change is tried for real by the owner, with `docs/test-plan.md`.

## Style

As in ai-translate: comments short, one line above a non-obvious decision;
no em dashes in interface text or in the README; agreed wording kept exactly.
