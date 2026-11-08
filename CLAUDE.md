# AI Translate for Telegram

A userscript that runs AI Translate in the official Telegram Web, both
clients: Web A (`web.telegram.org/a/`, Ajaxy/telegram-tt) and Web K
(`web.telegram.org/k/`, morethanwords/tweb). Unofficial. It translates
outgoing messages in the chats switched on, and incoming ones from a
message's menu.

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
- **The script's `@name` is "AI Translate"**, with no Telegram in it and no
  Telegram logo anywhere; "Unofficial" is in the description. Its
  `@namespace` is this repository, so a manager never takes it for the
  Discord userscript. GPL-3.0-or-later.
- **Keys and settings stay in the userscript manager's storage.** No server
  of ours; requests go from the browser to the provider through
  `GM_xmlhttpRequest`.
- **Conversation context is off by default**: it sends other people's
  messages. `test/defaults.mjs` names that difference, and every other
  default must match `ai-translate/settings.ts`.
- **`dist/` is built and committed.** People install and update from
  `dist/` on `main`. The build is deterministic; `test/dist.mjs` fails when
  `npm run build` was forgotten. The version is `package.json`'s, raised when
  a change should reach installed copies.

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

## Running things

```
npm install
npm run build
npm test             # formatted, weba, webk, defaults, strings, dist, page
node test/live.mjs   # needs the internet
tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler \
    --lib es2022,dom,dom.iterable --skipLibCheck src/main.ts
```

esbuild strips types without reading them; the `tsc` line reads them. Only
`ai-translate/core/bridge.ts` may complain there, about Vencord's globals.

`test/page.mjs` needs Playwright's Chromium; without it, it skips unless
`REQUIRE_BROWSER` is set, as CI sets it. A cloud session cannot sign in to
Telegram, so a change is tried for real by the owner, with
`docs/test-plan.md`.

## Style

As in ai-translate: comments short, one line above a non-obvious decision;
no em dashes in interface text; agreed wording kept exactly.
