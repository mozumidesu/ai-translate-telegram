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

## 6. AI Learn ★

Both clients. A chat with your second account, switched on, "Translate my
messages into" English.

1. On the settings page, under Behaviour, turn on *AI Learn: correct what
   I write myself*. A *Corrections* button appears under it; switched off,
   it goes away again.
2. Write in English yourself, four words or more, with a mistake:
   `shall we meet tomorrow in noon?`. It goes at once, exactly as typed; the
   phone shows exactly that.
3. A moment later, under your message on this screen: a tick, then in
   italics "a native speaker would write: Shall we meet tomorrow at noon",
   with *at* in bold and underlined with dots, and a line saying why. The
   phone shows nothing of it, and neither does the second account.
4. Scroll the chat up and back, open another chat and come back: the line
   is still under the message. Edit the message, react to it: the line
   stays, the time and the reaction are where they were. After a reload it
   is gone from under the message, and kept in Corrections.
5. Write a message that is right, such as `see you tomorrow at noon`:
   nothing appears under it, and no notice.
6. Write `please keep \Book club\ the way it is`: it goes without the
   backslashes.
7. Write in Russian in the same chat: it is translated, as before.
8. Right-click your own message: **AI Learn** is the last item. On a
   message that was right it answers "nothing to correct here" under it.
   Someone else's message has no AI Learn.
9. *Corrections (n)* on the settings page lists each correction: what you
   wrote, the native version with the changes marked, why, and the day.
   *Clear* empties it, and the button goes back to *Corrections*.
10. Put a wrong key in and write in English: the message goes, and nothing
    is said. Put the right key back.

## 7. When it fails

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

## 8. Check for updates ★

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

## 9. Feedback ★

1. On the settings page, beside the title: a GitHub button (*Source code*)
   and an envelope (*Support*). GitHub opens this repository in a new tab.
2. The envelope opens *Support and feedback* over the settings: a line that
   names this script's version as an early build, the envelope and the
   thanks, Subject, Message, Screenshot (optional), Email (optional) with
   "Your Telegram name is attached so I can reply." under it, Send, "Or",
   and *Write on Discord*.
3. Send stays grey until Subject and Message both have something. Type
   `nobody` in Email and click elsewhere: it says that is not an address.
4. Take a screenshot (Win+Shift+S, Cmd+Ctrl+Shift+4) and paste it with the
   cursor in Subject: it appears as a thumbnail, and nothing is attached to
   the chat behind. Drop a second one on the dashed box; *Choose an image*
   adds a third, and then greys out. × on a thumbnail takes it away.
5. Write a real subject and message (say it is a test) and Send. The
   manager asks once to allow `ai-translate-feedback.mozumidesu.workers.dev`.
   It says "Sent. Thank you." The report arrives where the Discord plugin's
   do, with the Telegram name and id, and a build that reads
   "telegram userscript" and the version.
6. *Write on Discord* opens the support server's invite in a new tab.

## 10. Nothing looks different to anyone else

From the second account, open the profile of the account that used the
script, and the chat where it sent: no warning about an unofficial or
third-party app, no "via" line, nothing that was not there before. In
Settings → Devices on the phone, the session reads as Telegram Web, as
before.

## 11. Context, last

Context is off: confirm on the settings page. Switch it on, send a short reply such
as "да" after a question; the translation fits the question. Switch it off
again if you do not want other people's messages sent to the provider.

Write down for each step: client, browser, manager, and pass or what
happened. Logs, at the foot of the settings page, Copy, is what to attach when something fails
without saying why.
