# AI Translate for Telegram

A userscript that runs AI Translate in the official Telegram Web, both
clients: Web A (`web.telegram.org/a/`, Ajaxy/telegram-tt) and Web K
(`web.telegram.org/k/`, morethanwords/tweb). Unofficial. It translates
outgoing messages in the chats switched on, and incoming ones from a
message's menu.

The same script, unchanged, is also a desktop app, `desktop/`: Web A in a
Tauri 2 window for Windows, macOS and Linux. See "The desktop app" below.

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
  `GM_xmlhttpRequest`. In the desktop app the storage is a file in the app's
  data folder and the request leaves from Rust, with the same rule.
- **Conversation context is off by default**: it sends other people's
  messages. `test/defaults.mjs` names that difference, and every other
  default must match `ai-translate/settings.ts`.
- **`dist/` is built and committed.** People install and update from
  `dist/` on `main`. The build is deterministic; `test/dist.mjs` fails when
  `npm run build` was forgotten. The version is `package.json`'s, raised when
  a change should reach installed copies. It has the plugin's shape, three
  numbers and a stage letter, `a` while this is early (`0.2.3a`), which
  `test/version.mjs` holds it to. Edit it by hand: `npm version` turns the
  letter into `-a`.

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

## The desktop app

`desktop/` is the app, called AI Translate: the hosted `web.telegram.org/a/`
in a Tauri 2 window, with `dist/ai-translate.user.js` run in it as a
userscript manager would run it. Telegram does the same with its own Telegram
Air (Ajaxy/telegram-tt, `tauri/`), which is where the window, the tray, the
`tg://` links and the notifications were read from.

- **Telegram's code is loaded, never shipped and never changed.** Nothing of
  telegram-tt is in this repository. The app has no name, icon or wording of
  Telegram's: the window's title is `AI Translate` whatever the client asks.
- **The script and the page share one world.** A webview has no separate one
  to give, so every command the script calls, Telegram's page can call. A
  limit therefore lives in Rust, never in `shim.js`: `bridge/src/hosts.rs`
  decides where a request may go (`hosts.json`: the core's providers, the
  person's own OpenAI-compatible address at and below it, this repository's
  folder on raw.githubusercontent.com, the feedback relay; redirects are not
  followed), `bridge/src/store.rs` keeps the values and takes a name, never a
  path. A new command needs a line in three places, which `test/desktop.mjs`
  holds to each other: `COMMANDS` in `src-tauri/build.rs`,
  `generate_handler!` in `src/lib.rs`, and `capabilities/telegram.json`.
  `build.rs` naming the commands is what makes Tauri refuse the rest.
- **Web A knows it is in Tauri.** Tauri sets `window.isTauri` on every page
  and nothing can unset it, so the client behaves as in Telegram Air: it
  shows notifications through the notification plugin's own `Notification`
  (which is how they work in all three webviews), opens links through the
  shell plugin, listens for `deeplink`, hides "Switch to K", and calls
  `set_window_title`, `set_notifications_count`, `mark_title_bar_overlay`
  and `open_new_window_cmd`, which `src/air.rs` answers. Its
  `plugin:updater|check` is refused on purpose. When the client asks for
  something new, it is refused and logged, and `air.rs` is where to add it.
- **The capability grants the origin, not `/a/`.** A call that arrives over
  Tauri's own protocol is judged by its `Origin`, which has no path: with
  `https://web.telegram.org/a/*` the first calls of every page were refused.
  Where the script runs is the header's `@match`, applied in `shim.js`.
- **The values in the page are from when the window was made.** An
  initialization script cannot change afterwards and GM_getValue cannot
  wait, so the shim starts from those, asks the app at once (`gm_values`)
  and tells the script of any difference as a manager tells of another
  tab's change. Do not read a setting once at startup and keep it.
- **`on_navigation` sees frames too** on macOS and Linux, and a bot's web
  app is a frame, so it lets any web page load. The window itself is kept on
  Telegram by `on_page_load`, which the main page alone reaches.
- **One version.** The app's is `package.json`'s; `npm run build` writes it
  as semver into `desktop/version.json` (`0.2.3a` is `0.2.3-a`), which
  `tauri.conf.json` reads. `desktop/gen/inject.js`, the script as the app
  runs it, is built too and not committed: build before `cargo` or `tauri`.
- **No strings of our own, here too.** The tray menu is the app's name and
  what the script registered. That is why it has no "Quit" and closing the
  window leaves the app on Windows and Linux: staying in the tray needs that
  word, in sixteen languages, in the core. The one exception is
  `src-tauri/Info.plist`, two sentences macOS shows before the microphone or
  the camera is used, which it will not take from the page.

### Releases

`.github/workflows/desktop.yml` builds on a push that touches `desktop/` and
on demand, and on a tag `v<package.json's version>` attaches the installers
to a **draft** release with `latest.json` (`desktop/latest.mjs`). Publishing
the draft is the owner's act; from then on installed apps update to it. The
installers are not code-signed. Updates are signed with the updater's own
key: its public half is in `tauri.conf.json`, the private one is the
repository secret `TAURI_SIGNING_PRIVATE_KEY` and is nowhere in the
repository. A new pair (`npx tauri signer generate`) orphans every installed
copy, which would refuse what the new key signs.

The identifier, `io.github.mozumidesu.aitranslate`, names the data folder on
every system. Changing it loses everyone's settings and sign-in.

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
npm test             # formatted, weba, webk, defaults, strings, version, dist, shim, desktop, page
node test/live.mjs   # needs the internet
node test/app.mjs    # the desktop app started for real: Linux, cargo, WebKitGTK, Xvfb, the internet
npx tauri build      # the app and its installers; npm run build first
desktop/icons/build.sh   # the icons again, after an SVG in desktop/icons/ changed
tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler \
    --lib es2022,dom,dom.iterable --skipLibCheck src/main.ts
```

esbuild strips types without reading them; the `tsc` line reads them. Only
the core's Vencord side may complain there: `ai-translate/core/bridge.ts`
about Vencord's globals, and `ai-translate/native.ts`, which the bridge takes
its types from, about Node's and Electron's.

`test/page.mjs` and the second half of `test/shim.mjs` need Playwright's
Chromium; without it they skip unless `REQUIRE_BROWSER` is set, as CI sets
it. `test/desktop.mjs` runs the bridge's Rust tests when there is a `cargo`
(`REQUIRE_CARGO`). `test/app.mjs` builds the app with its `probe` feature,
which no release has: it lets the test put a layer under the script and hear
what the page saw. On Linux the app needs `libwebkit2gtk-4.1-dev`,
`libayatana-appindicator3-dev` and `librsvg2-dev`; Windows and macOS builds
are only ever made by the workflow. A cloud session cannot sign in to
Telegram, so a change is tried for real by the owner, with
`docs/test-plan.md`.

## Style

As in ai-translate: comments short, one line above a non-obvious decision;
no em dashes in interface text; agreed wording kept exactly.
