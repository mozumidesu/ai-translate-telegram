# AI Translate for Telegram Web

**Unofficial.** Not made, checked or endorsed by Telegram.

A userscript that brings [AI Translate](https://github.com/mozumidesu/ai-translate)
to the official Telegram Web, in both of its clients:
[web.telegram.org/a](https://web.telegram.org/a/) and
[web.telegram.org/k](https://web.telegram.org/k/). It translates your messages
before they are sent, in the chats you switch on, and translates or explains
other people's messages when you ask, using an AI provider of your choice
with your own API key. It is the same translation core as the Discord plugin,
with the same prompts, providers and settings.

There is a [desktop app](#desktop-app) as well, for Windows, macOS and Linux:
Telegram Web in a window of its own, with the script already in it.

## What it does

- **Your messages go out translated.** Switch a chat on and what you type
  there is translated into your chosen language before it is sent. Nothing is
  sent until the translation is in, so the other person only ever sees the
  translation. Edits are translated too.
- **Formatting survives.** Bold, italic, strikethrough, spoilers, links,
  inline code and code blocks, mentions, custom emoji and quotes stay where
  they belong in the translated sentence. Underline is the one thing that is
  dropped.
- **Other people's messages, on request.** Right-click a message and choose
  **AI Translate**. Turn on **AI Explain** in the settings for a second item
  that names the language and explains slang, shorthand and inside jokes.
- **What you typed, under what went.** *Show the original text under sent
  messages* puts a quiet line under your translated message with what you
  actually wrote, which only you see.
- **AI Learn, for the language you are learning.** Switch it on in the
  settings, and what you write yourself in the language you translate into
  goes as you typed it, with a native speaker's version under it, the
  changed words marked, which only you see. *Corrections* keeps the last
  fifty, and **AI Learn** in your own message's menu asks again.
- **If a translation fails**, the message is held back, the reason is shown,
  and your text goes back into the chat box. You can choose to send it
  untranslated instead.
- **Left alone:** commands to bots (`/start`), a bot's keyboard buttons,
  links you share from menus, stickers, and anything Telegram's own AI Editor
  sends from its window, which goes exactly as the editor wrote it.

## Install

1. Install a userscript manager: **Tampermonkey** (Chrome, Edge, Firefox) or
   **Violentmonkey** (Chrome, Edge).
2. Open the script:
   **[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js)**.
   Your manager shows what it is and offers to install it. Confirm.
3. Open [web.telegram.org/a](https://web.telegram.org/a/) or
   [web.telegram.org/k](https://web.telegram.org/k/) and sign in as usual.
4. Open a chat. In the chat bar there is a new **translate button**:
   - **left-click** it for the panel: the two languages, the switch for this
     chat, and *All plugin settings*, where you pick a provider, paste your
     API key and choose a model;
   - **right-click** or **shift-click** it to switch the open chat on or off.
     It takes the accent colour while the chat is on.
5. The first time the script talks to your provider, the manager asks whether
   it may. Allow that address (in Tampermonkey: *Always allow domain*).

The settings are also in your userscript manager's menu, under
*All plugin settings*, laid out as the Discord plugin's are. The manager keeps
the script up to date from this repository by itself; *Check for updates*, at
the foot of the settings, says whether it has and hands it a newer version at
once.

Groq is the recommended provider and has a free tier. Google Gemini, Anthropic
Claude, Z.ai GLM and any OpenAI-compatible API work too, and up to four
backup providers can stand behind the first one.

## Desktop app

**Unofficial**, like the script. The app is called AI Translate. It opens the
official Telegram Web A, `web.telegram.org/a/`, in a window of its own, and
runs this same script in it: no browser, no userscript manager, nothing to
allow address by address. The page is Telegram's own, loaded from Telegram's
server as a browser loads it. None of Telegram's code is in the app, and none
of it is changed.

### Install

Download the file for your system from
[Releases](https://github.com/mozumidesu/ai-translate-telegram/releases/latest).
The builds are **not signed** with a Windows or an Apple certificate, so each
system asks once whether you mean it:

- **Windows**: `AI-Translate_…_windows_x64-setup.exe`. SmartScreen says
  "Windows protected your PC". Press **More info**, then **Run anyway**.
- **macOS**: `AI-Translate_…_macos_universal.dmg`, for Apple silicon and Intel
  alike. Drag the app to Applications, then right-click it and choose
  **Open**, and **Open** again in the window that asks. On macOS 15 and later
  that window has no Open: close it, go to System Settings, Privacy &
  Security, and press **Open Anyway** beside AI Translate.
- **Linux**: `AI-Translate_…_linux_x86_64.AppImage`: make it executable
  (`chmod +x`) and run it. Or `AI-Translate_…_linux_amd64.deb`:
  `sudo apt install ./AI-Translate_…_linux_amd64.deb`.

Sign in as in a browser, by QR code or phone number. Everything under
[What it does](#what-it-does) is the same, and so are the settings.

### What is different from the script in a browser

- **Updates.** When it starts, the app looks for a newer release here on
  GitHub; if there is one, it installs it and starts again. *Check for
  updates*, at the foot of the settings, does the same when you press it. An
  update is checked against the app's own key before it is installed. A copy
  installed from the `.deb` updates only on that press, since it needs your
  password.
- **Notifications** are your system's own. A dot on the tray icon, the count
  on the Dock or a dot on the taskbar button says something is unread.
- **The tray icon** brings the window back, and its menu has *All plugin
  settings*.
- **`tg://` links** open in the app, which registers for them as Telegram's
  own desktop apps do. With one of those installed as well, your system
  decides which opens a link.
- **Links to other sites** open in your browser.
- **Closing the window** leaves the app on Windows and Linux. On a Mac it
  stays in the Dock, as Mac apps do.

### Where the app keeps your data

- **API keys and settings** are one file, `values.json`, which only your user
  can read, in the app's data folder:
  `%APPDATA%\io.github.mozumidesu.aitranslate` on Windows,
  `~/Library/Application Support/io.github.mozumidesu.aitranslate` on macOS,
  `~/.local/share/io.github.mozumidesu.aitranslate` on Linux. Your Telegram
  session is kept by the system's webview, as a browser keeps it.
- **One difference from a browser, said plainly.** A userscript manager keeps
  the script in a world apart from the page. A desktop webview has no such
  world to give, so in the app the script and Telegram's page share one, and
  Telegram's code could ask the app what the script asks. The app is built
  for that: only `web.telegram.org` may ask it anything, a request goes out
  only to the AI providers the script knows, to the address you typed for an
  OpenAI-compatible provider, to this repository's files on GitHub for the
  update check and to the feedback relay, and the stored values are the
  script's own and nothing else on your disk.
- **A message being translated** goes from the app straight to the provider
  you chose, as from a browser, and nowhere else.

## Where your data goes

In a browser, with a userscript manager:

- **API keys and settings** stay in your userscript manager's storage on
  this device. Telegram's page cannot read them.
- **A message being translated** goes from your browser straight to the
  provider you chose, and nowhere else. There is no server of ours in
  between.
- **A feedback report**, written in the form behind the envelope on the
  settings page, goes to the same relay as the Discord plugin's: what you
  wrote, the screenshots you added, your Telegram name and id so a reply can
  reach you, and the script's version. No key and no setting.
- **Other people's messages** are sent to the provider only when you ask for
  a translation or an explanation of one, or when you switch on *Use recent
  messages as context*, which sends the last few messages of the conversation
  with each request. That switch is **off** by default.
- The script talks to Telegram only through the official client it runs in,
  so your account signs in and sends as Telegram Web always does.

## Good to know

- In Web A, every tab of the same account sends through one of them. A
  message typed in another tab is translated by that one, and if it fails,
  the reason shows in the tab you are looking at.
- Messages made with the new rich message editor (blocks, tables) are sent
  as they are.
- The interface follows the language of the settings, in 16 languages.

## For developers

```
git clone --recurse-submodules https://github.com/mozumidesu/ai-translate-telegram
cd ai-translate-telegram
npm install
npm run build        # dist/ai-translate.user.js and its header
npm test             # every check that needs no internet, Chromium included
node test/live.mjs   # the hooks on the real web.telegram.org, without signing in
```

The desktop app is `desktop/`, a [Tauri 2](https://tauri.app) app in Rust. It
needs Rust and, on Linux, WebKitGTK's headers (`libwebkit2gtk-4.1-dev`,
`libayatana-appindicator3-dev`, `librsvg2-dev`):

```
npm run build        # also writes the script as the app runs it, desktop/gen/inject.js
npx tauri build      # the app and its installers, in desktop/target/release/bundle
node test/app.mjs    # Linux: starts the app and loads the real site up to the sign-in screen
```

The translation core is [`ai-translate`](https://github.com/mozumidesu/ai-translate),
a submodule pinned to a commit and used unchanged: what Telegram needs from it
goes into that repository. `src/` is the script itself:

| File | What it does |
|---|---|
| `main.ts` | Starts at document-start, picks the client, installs the hooks |
| `weba.ts` | Web A: wraps the GramJS worker's `postMessage`, holds `sendMessage` until it is translated |
| `webk.ts` | Web K: wraps `apiManagerProxy.invoke`, marks what was typed into a field through `ChatInput.sendMessageWithForward` |
| `outgoing.ts` | Whether a message is translated, and what happens when that fails |
| `formatted.ts` | Telegram's entities as the core's marks on the way to the model, and back |
| `menu.ts` | The items in a message's menu, and the card with the answer |
| `learn.ts`, `notes.ts` | AI Learn and its Corrections window, and the line of ours under your own messages: a correction, or what you typed |
| `composer.ts`, `panel.ts` | The chat bar button and the panel behind it: the languages and this chat |
| `settings.ts`, `logs.ts`, `sheet.ts` | The settings page in the plugin's order, the Logs window with the version under it, and the windows they open in |
| `version.ts`, `update.ts` | This script's own version, the one in its header, and Check for updates |
| `feedback.ts` | The source and support links beside the settings title, and the feedback form |
| `host.ts`, `storage.ts`, `ui.ts`, `relay.ts` | The core's host, settings, the shadow root, word between tabs |

and `desktop/` is the app:

| File | What it does |
|---|---|
| `shim.js`, `assemble.mjs` | What a userscript manager gives the script, given by the app; and the script wrapped in it, as the app runs it |
| `hosts.json`, `bridge/` | The addresses a request may go to, and the Rust that applies the list and keeps the stored values, with its tests |
| `src-tauri/src/window.rs` | The window on `web.telegram.org/a/`, the script in front of the page, other sites sent to the browser |
| `src-tauri/src/gm.rs`, `air.rs` | The commands the script calls, and the ones Telegram's own client asks of a desktop host |
| `src-tauri/src/tray.rs`, `update.rs` | The tray icon and its menu; updates from this repository's releases |
| `src-tauri/capabilities/telegram.json` | Everything the page may call, and that only `web.telegram.org` may |
| `latest.mjs`, `collect.mjs`, `icons/` | What the release workflow uses: the updater's `latest.json`, the installers' names, the icons' sources |

## Licence

GPL-3.0-or-later, the same as AI Translate. See [LICENSE](LICENSE).
