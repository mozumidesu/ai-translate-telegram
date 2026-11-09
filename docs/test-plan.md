# Test plan

What a cloud session cannot do: sign in. Everything below needs a real
account, in Chrome with Tampermonkey; repeat the starred steps once in
Violentmonkey and once in Firefox with Tampermonkey. Do it in Web K
(`/k/`) and in Web A (`/a/`).

You need a Groq key, a second Telegram account (a phone is fine), and a bot
with a reply keyboard, any will do.

## 1. Install ★

1. Install Tampermonkey, then open
   `https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js`.
   The manager shows **AI Translate**, "Unofficial." in the description, and
   offers to install. Install.
2. Open `https://web.telegram.org/k/`, sign in. No notice appears, not
   while signing in and not after: wait a minute on the chat list, then
   reload the page and wait again. Nothing is said until you do something.

## 2. Set up ★

1. Open any chat. A translate button is in the chat bar, beside the emoji
   button (Web K) or the attachment button (Web A).
2. Left-click it: the panel opens with, in this order, "Translate my
   messages into", "Translate incoming messages into", a line, the switch
   for this chat, and an *All plugin settings* button. Nothing else. Set
   "Translate my messages into" to English.
3. Press *All plugin settings*: the panel steps aside and the settings page
   opens. It reads, top to bottom, as the Discord plugin's: Provider (with
   the key, the model and the backup provider), then **Behaviour**
   (Auto-translate outgoing messages, If the translation fails, AI Explain),
   **Translation** (grammatical gender, how to address people, recent
   messages as context, translation exceptions, extra style instructions,
   the backslash Help), **Appearance** (Interface language), and Logs at the
   foot. Pick Groq, paste the key, leave the model. Leave the field: no red
   line under the key.
4. Under Logs, one quiet line: "AI Translate · " and the version the
   userscript manager shows for the script (its dashboard, column Version),
   not the Discord plugin's 0.2.1a.
   Press Logs: a window opens over the settings with Copy, Save .txt and
   Clear. Escape shuts it and leaves the settings; Escape again shuts them,
   and the chat stays open.
5. The userscript manager's menu has *All plugin settings*: it opens the same
   page.
6. The manager asks to allow `api.groq.com` on the first request (step 3.2).
   Choose *Always allow domain*.

## 3. Switch a chat on and send ★

1. Right-click the button in a chat with your second account: it turns blue.
   The panel shows "Auto-translate my messages in <name>" ticked.
   Shift-click switches it off and back on the same way, and opens nothing.
2. Send `привет, как дела?`. The message appears after about a second, in
   English. On the phone, the second account sees only the English.
3. Send one with formatting: bold a word, add a link with the link button, a
   custom emoji if the account has Premium, and mention someone without a
   username in a group. All of it is in the right place in the translation;
   the mention notifies that person.
4. Edit the sent message: the edit goes out translated.
5. In a chat that is not switched on, send something: it goes as typed.

## 4. What must go as typed

1. In a switched-on chat with the bot: `/start` goes as typed, and so does a
   press on its keyboard.
2. Web K: write a message, open Telegram's AI Editor from the chat bar,
   rewrite it there and send from the editor's window: it goes as the editor
   wrote it, not translated again.

## 5. Read a message ★

1. Right-click a message from the second account: the menu has
   **AI Translate**. Choose it: the menu shuts, a card beside the message
   shows the translation and "Translated from …".
2. Turn on *Add AI Explain to the right-click menu* on the settings page; the
   menu now has **AI Explain** too, which names the language and explains it.

## 6. When it fails

1. Put a wrong key on the settings page and send in a switched-on chat. Nothing is
   sent, a red notice says why, and the text is back in the chat box.
2. Set "If the translation fails" to send untranslated, send again: it goes
   as typed. Put the right key back.
3. Web A only: open a second tab of `/a/`, send from it. The message is
   translated; with the wrong key, the notice shows in the tab you are in.
4. Empty the key field and send in a switched-on chat: nothing is sent, a
   red notice says no API key is set for Groq, and the text is back in the
   chat box. Right-click a message, AI Translate: the same notice. Put the
   key back.

## 7. Check for updates ★

1. On the settings page, above Logs, press *Check for updates*. The first
   time, the manager asks to allow `raw.githubusercontent.com`: allow it.
   With the newest version installed it says "You have the latest version."
2. To see an update offered, make the installed copy older: in the
   manager's editor for the script, find the line `var VERSION = "…";` and
   put `0.0.1` between the quotes, save, reload Telegram, and press the
   button again: "A new version is available…", and the button reads
   *Update now*.
3. Press *Update now*: a new tab opens where the manager offers the script
   from `main` as an update. Confirm it. Back in Telegram the button reads
   *Reload the page*; press it, open the settings, and the line under Logs
   shows the new version.
4. Offline (the browser's network off, or the address refused in the
   manager): "Could not reach GitHub…", in red.

## 8. Nothing looks different to anyone else

From the second account, open the profile of the account that used the
script, and the chat where it sent: no warning about an unofficial or
third-party app, no "via" line, nothing that was not there before. In
Settings → Devices on the phone, the session reads as Telegram Web, as
before.

## 9. Context, last

Context is off: confirm on the settings page. Switch it on, send a short reply such
as "да" after a question; the translation fits the question. Switch it off
again if you do not want other people's messages sent to the provider.

Write down for each step: client, browser, manager, and pass or what
happened. Logs, at the foot of the settings page, Copy, is what to attach when something fails
without saying why.
