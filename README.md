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
the script up to date from this repository by itself.

Groq is the recommended provider and has a free tier. Google Gemini, Anthropic
Claude, Z.ai GLM and any OpenAI-compatible API work too, and up to four
backup providers can stand behind the first one.

## Where your data goes

- **API keys and settings** stay in your userscript manager's storage on
  this device. Telegram's page cannot read them.
- **A message being translated** goes from your browser straight to the
  provider you chose, and nowhere else. There is no server of ours in
  between.
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
| `composer.ts`, `panel.ts` | The chat bar button and the panel behind it: the languages and this chat |
| `settings.ts`, `logs.ts`, `sheet.ts` | The settings page in the plugin's order, the Logs window, and the windows they open in |
| `host.ts`, `storage.ts`, `ui.ts`, `relay.ts` | The core's host, settings, the shadow root, word between tabs |

## Licence

GPL-3.0-or-later, the same as AI Translate. See [LICENSE](LICENSE).
