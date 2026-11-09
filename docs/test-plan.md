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
2. Left-click it: the panel opens. Pick Groq, paste the key, leave the model.
   Leave the field: no red line under the key. Set "Translate my messages
   into" to English.
3. The manager asks to allow `api.groq.com` on the first request (step 3.2).
   Choose *Always allow domain*.

## 3. Switch a chat on and send ★

1. Right-click the button in a chat with your second account: it turns blue.
   The panel shows "Auto-translate my messages in <name>" ticked.
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
2. Turn on *Add AI Explain to the right-click menu* in the panel; the menu
   now has **AI Explain** too, which names the language and explains it.

## 6. When it fails

1. Put a wrong key in the panel and send in a switched-on chat. Nothing is
   sent, a red notice says why, and the text is back in the chat box.
2. Set "If the translation fails" to send untranslated, send again: it goes
   as typed. Put the right key back.
3. Web A only: open a second tab of `/a/`, send from it. The message is
   translated; with the wrong key, the notice shows in the tab you are in.
4. Empty the key field and send in a switched-on chat: nothing is sent, a
   red notice says no API key is set for Groq, and the text is back in the
   chat box. Right-click a message, AI Translate: the same notice. Put the
   key back.

## 7. Nothing looks different to anyone else

From the second account, open the profile of the account that used the
script, and the chat where it sent: no warning about an unofficial or
third-party app, no "via" line, nothing that was not there before. In
Settings → Devices on the phone, the session reads as Telegram Web, as
before.

## 8. Context, last

Context is off: confirm in the panel. Switch it on, send a short reply such
as "да" after a question; the translation fits the question. Switch it off
again if you do not want other people's messages sent to the provider.

Write down for each step: client, browser, manager, and pass or what
happened. The panel's Logs, Copy, is what to attach when something fails
without saying why.
