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
   The manager shows **AI Translate**, "Unofficial." in the description,
   version 0.2.3a, and offers to install. Install. With 0.2.2a already
   installed, the manager's own update check (Tampermonkey: Utilities, Check
   for userscript updates) offers 0.2.3a instead.
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
   line under the key. Typing in any field stays there: Telegram's chat box
   does not take the keys, and Escape shuts only the window.
4. Under Logs, one quiet line: "AI Translate · " and the version the
   userscript manager shows for the script (its dashboard, column Version).
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
   shows the translation and "Translated from …". Select a few words of the
   translation with the mouse and copy them: the card stays open. A click
   anywhere outside it shuts it.
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

## 7. Show the original ★

Both clients, in a switched-on chat that translates into English.

1. On the settings page, under Appearance, turn on *Show the original text
   under sent messages*.
2. Send `до встречи в субботу` with *субботу* in bold. It goes in English.
   Under it, on this screen only: the translate icon, then in italics
   "you wrote: до встречи в субботу", *субботу* in bold. The phone and the
   second account see only the English.
3. Scroll away and back, open another chat and come back: the line is still
   there. React to the message: the reaction and the time stay in place.
4. Turn the switch off: the line goes within a second, and a correction from
   AI Learn under another message stays.

## 8. When it fails

1. Put a wrong key on the settings page and send in a switched-on chat.
   Nothing is sent, a red notice says why, and the text is back in the chat
   box.
2. Set "If the translation fails" to send untranslated, send again: it goes
   as typed. Put the right key back.
3. Web A only: open a second tab of `/a/`, send from it. The message is
   translated; with the wrong key, the notice shows in the tab you are in.
4. Empty the key field and send in a switched-on chat: nothing is sent, a
   red notice says no API key is set for Groq, and the text is back in the
   chat box. Right-click a message, AI Translate: the same notice. Put the
   key back.

## 9. Check for updates ★

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

## 10. Feedback ★

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
   do. Its Telegram field is two lines: the name and id, then the client,
   "Mozumi (123456789)" and "Web K" (or "Web A"). Its Build is this script's
   version and, in brackets, the core it was built with, "0.2.3a (09710da)"
   for example: the first seven characters of the commit that
   `git submodule status` shows for `ai-translate`.
6. *Write on Discord* opens the support server's invite in a new tab.

## 11. Nothing looks different to anyone else

From the second account, open the profile of the account that used the
script, and the chat where it sent: no warning about an unofficial or
third-party app, no "via" line, nothing that was not there before. In
Settings → Devices on the phone, the session reads as Telegram Web, as
before.

## 12. The windows ★

Both clients. One of the client's own windows to compare with: right-click
a chat in the chat list, *Delete*, then *Cancel*.

1. Watch that window come and go. Web K: the screen dims as the window rises
   a little from below, and on *Cancel* it fades where it stands. Web A: the
   window comes down a little from above as the screen dims, and on *Cancel*
   it fades while going on down.
2. Left-click the translate button: the panel comes the same way and as
   fast. × sends it off the same way, and so does a press outside it.
3. Open it again and press *All plugin settings*: the panel goes and the
   settings page comes in its place, both at once, each as the client's
   window does.
4. Press the envelope: *Support and feedback* comes over the settings the
   same way; the settings page under it does not move, it only gets darker.
   Escape: the form goes and the settings page is as it was. The same with
   Logs, and with Corrections (AI Learn on).
5. Turn movement off in the client. Web K: Settings, Power Saving, *Motion
   Effects* off. Web A: Settings, Animations and Performance, *Page
   Transitions* off. Every window of ours now fades in and out where it
   stands, as the client's own do. In Web K turn *Interface Animations* off
   as well: ours are there at once and gone at once. Put both back.
6. Turn on reduced motion in the system (Windows: Settings, Accessibility,
   Visual effects, *Animation effects* off; macOS: System Settings,
   Accessibility, Display, *Reduce motion*) and reload the page: in both
   clients ours fade and do not move. Turn it back.
7. The widths, against Discord. With the browser's developer tools (F12,
   then the element picker on a window of ours), the panel, *Support and
   feedback*, Logs and Corrections are 480 pixels wide, and the settings
   page 680: the same windows in Discord with Vencord (Ctrl+Shift+I there)
   measure the same. Make the browser window narrower than 712 pixels: the
   settings page keeps 16 pixels from each edge; narrower than 512, every
   window does.

## 13. Context, last

Context is off: confirm on the settings page. Switch it on, send a short reply such
as "да" after a question; the translation fits the question. Switch it off
again if you do not want other people's messages sent to the provider.

## 14. The desktop app

The app, not the script in a browser: Windows, macOS and Linux, each once.
What a cloud session did already: it built the Linux app, started it under a
display nobody watches and let it load the real `web.telegram.org/a/` up to
the sign-in screen, with the script's hook in front of the worker
(`node test/app.mjs`). Everything from signing in on is yours.

The installers are in a release's Assets. A tag makes a **draft** release,
which only you see: try from the draft, then publish it.

### 14.1 Install

1. **Windows**: run `AI-Translate_…_windows_x64-setup.exe`. SmartScreen says
   "Windows protected your PC": *More info*, then *Run anyway*. The
   installer asks for no administrator. The Start menu has **AI Translate**,
   with our purple icon, and nothing named Telegram.
2. **macOS**: open `AI-Translate_…_macos_universal.dmg`, drag the app to
   Applications. Right-click it, *Open*, and *Open* again. On macOS 15 or
   later there is no Open in that window: close it, then System Settings,
   Privacy & Security, *Open Anyway*. It must never say the app "is damaged".
   Try it on an Apple silicon Mac and, if you have one, an Intel one.
3. **Linux**: `chmod +x AI-Translate_…_linux_x86_64.AppImage` and run it. On
   another machine or account, `sudo apt install ./AI-Translate_…_linux_amd64.deb`
   and start **AI Translate** from the applications menu.
4. The window opens on Telegram's sign-in screen, titled **AI Translate**. On
   a Mac the three window buttons sit inside Telegram's own header, level
   with it, not over anything.

### 14.2 Sign in and send

1. Sign in by QR code from the phone. Close the app and open it again: you
   are still signed in.
2. A translate button is in the chat bar. Left-click it, *All plugin
   settings*, pick Groq, paste the key. No dialog asks to allow an address,
   as a userscript manager would: the model list loads by itself.
3. Close the app and open it again: the key is still there. The file
   `values.json` is in the data folder (`%APPDATA%\io.github.mozumidesu.aitranslate`,
   `~/Library/Application Support/io.github.mozumidesu.aitranslate`,
   `~/.local/share/io.github.mozumidesu.aitranslate`); on macOS and Linux
   `ls -l` shows it as `-rw-------`.
4. Switch a chat with your second account on and send `привет, как дела?`:
   it goes in English. Sections 3, 5 and 8 of this plan, once each, here.
5. Right-click a message, **AI Translate**: the card shows the translation.
6. In Telegram's own menu, press *Reload* if it offers an update of
   Telegram Web, or sign out and in again: afterwards the key and the chat
   you switched on are still there. (The page starts again with the values
   the window was made with and asks the app for the newer ones; this is the
   step that would show it going wrong.)
7. Type an address under *Any OpenAI-compatible*, such as
   `http://localhost:11434/v1` with Ollama running, or OpenRouter's with its
   key: the model list loads from it.

### 14.3 Notifications and the tray

1. Minimise the window. From the second account, send a message: the
   system's own notification arrives, with the sender's name and the text,
   under the name **AI Translate**. On Windows and macOS allow notifications
   for the app if the system asks. Press the notification: nothing breaks.
2. While that message is unread: the tray icon has a red dot (Windows,
   Linux), the Dock icon a number (macOS), the taskbar button a dot
   (Windows). Read the message: they go.
3. Left-click the tray icon: the window comes to the front. Its menu has
   **AI Translate** and *All plugin settings*, in the language of the
   settings, and the second opens the settings page.
4. Close the window. Windows and Linux: the app is gone, tray icon and all.
   macOS: it stays in the Dock, and a click on the Dock icon brings the
   window back; ⌘Q leaves.
5. Start the app a second time while it is running: no second window, the
   first one comes to the front.

### 14.4 Links

1. Press a link to another site in a chat: it opens in your browser, and the
   app stays on Telegram.
2. Right-click a chat in the list, *Open in new window*: a second window of
   the app opens on that chat. Change a setting in one window and send in a
   switched-on chat from the other: the change is already there.
3. In a browser, open `tg://resolve?domain=telegram` (type it in the address
   bar). The system offers AI Translate, or opens it, and the app shows the
   Telegram channel. With the app not running, the same link starts it and
   it opens there. With Telegram Desktop installed too, note which of the
   two the system chose.
4. Open a bot that has a web app (@DurgerKingBot will do) and press its
   button: the web app opens inside Telegram's own window, as in a browser.
5. A voice message plays. Record one: the system asks for the microphone
   once, naming AI Translate, and it is sent. On Linux from the AppImage,
   note whether sound plays at all.

### 14.5 Update from one release to the next

This needs the secret `TAURI_SIGNING_PRIVATE_KEY` in the repository, and two
releases: publish the first (say `v0.3.0a`), install it everywhere, then
raise the version, tag the second and publish it.

1. Start the first one while the second is the latest release. Within a
   minute it closes and starts again by itself; on Windows a small installer
   window passes by. Settings, the line under Logs: the new version. You are
   still signed in and the key is still there.
2. From the `.deb` nothing happens by itself. Settings, *Check for updates*:
   the button turns to *Update now* with "AI Translate · " and the new
   version beside it. Press it: the system asks for your password, the button
   reads *Updating…*, and the app starts again as the new version.
3. With the newest installed: *Check for updates* says "You have the latest
   version." With the network off: "Could not reach GitHub…", in red.
4. A release published without the secret has no `latest.json`: the first
   app says "You have the latest version." and stays as it is. That is the
   workflow's warning, seen from the other side.

### 14.6 Nothing looks different to anyone else

As in section 11, from the second account: no warning about an unofficial
or third-party app, no "via" line. On the phone, Settings → Devices: the
session reads as Telegram Web, as a browser's does, with the system's
webview as the browser (Edge on Windows, Safari on macOS and Linux).

Write down for each step: client, browser, manager, and pass or what
happened. For section 14: system and its version, and which installer. Logs, at the foot of the settings page, Copy, is what to attach when something fails
without saying why.
