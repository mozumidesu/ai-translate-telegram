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
   the plugin's version with the build counter after it (0.2.1a.1 for the
   first build), and offers to install. Install. With an earlier build
   already installed, the manager's own update check (Tampermonkey:
   Utilities, Check for userscript updates) offers this one instead. A copy
   from before the counter, which says 0.2.3a, was offered nothing before
   0.2.3a.9, and Tampermonkey may still offer it nothing. If so, delete that
   script in the manager and open the link again, once.
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
   foot. Pick Groq, paste the key with a space after it, leave the model.
   Leave the field: the space is gone, there is no red line under the key,
   and Logs has a "key check" line saying the key was accepted. Typing in any field stays there: Telegram's chat box
   does not take the keys, and Escape shuts only the window. With a VPN
   that Groq turns away (a bare 403 "Forbidden"), the same key gets a plain
   line, not a red one, saying the network or region was refused, and the
   line under the model list says the same; a wrong key gets the red line.
   Pick Z.ai GLM and paste any word as its key: the red line says Z.ai GLM did
   not take this for an API key at all, and to copy the whole Standard API Key
   from z.ai. Pick Other, the last in the list: under its address field a
   line says it takes any OpenAI-compatible API, with two examples. Give it
   `https://api.openai.com/v1` and any word as the key: the red line says
   api.openai.com did not accept this key. Pick Groq again; its key is still
   there.
4. Under Logs, one quiet line: "AI Translate · " and the plugin's version,
   without the build counter: 0.2.1a, where the manager's dashboard, column
   Version, shows 0.2.1a.2.
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
4. Edit the sent message, changing a word of the translation: the edit
   goes out exactly as you typed it, not translated again, and the phone
   shows it so. Edit a message in Russian: it goes in Russian.
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
   anywhere outside it shuts it. Open it again and press Escape: the card
   shuts, and the chat stays open behind it. Escape once more, with nothing
   of ours open, does what it does in Telegram.
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
   is still under the message. React to it: the line stays, the time and
   the reaction are where they were. Edit the message as the line says: it
   goes exactly as you typed it, no new correction is asked for, and the
   line goes, since it was about the words before. After a reload a line is
   gone from under its message, and kept in Corrections.
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
5. A message held back is asked about again. With a wrong key, send
   `привет, как дела сегодня`: nothing is sent, and the text is back in the
   box. Put the right key back and press Enter on that same text at once: it
   goes, translated.
6. A provider that does not answer holds up its own chat only, and a minute
   at most. On the settings page choose Other, with Base URL
   `https://10.255.255.1/v1`, an address that never answers, and any key and
   model; allow the address when the manager asks. Send `ты тут?` in a chat
   that is switched on. While it waits, in a chat that is switched off: send
   a message, react to one, and forward one there. Each goes at once. A
   sticker sent meanwhile in the first chat waits. After a minute a red
   notice says "Network error: timed out", `ты тут?` is back in its box, and
   the sticker goes. Web A: once more with a second tab of `/a/` open,
   waiting in one tab and sending in the other.
7. A held message waits for a box that can take it. Still with that
   address, send `первое`, then type `второе` and leave it. When the notice
   comes, nothing is added to the box. Delete `второе`: within a second
   `первое` is in the box. Again, but open another chat right after Enter and
   wait there for the notice: that chat's box stays empty. Go back to the
   first chat: `первое` is in its box within a second. Then in a group with
   topics: send `в теме` in one topic, and open another topic of the same
   group right after Enter. When the notice comes, that topic's box stays
   empty; go back to the first topic: `в теме` is in its box within a
   second. Put Groq and its key back.
8. Web A, Tampermonkey: a script that lands too late. In the script's
   Settings tab in the manager, set Run at to document-idle, save, and reload
   `/a/` with a switched-on chat open. The button is not blue, though the
   chat is on, and its tooltip says "AI Translate isn't working in this tab,
   so messages go as typed. Reload the page." Logs has a line saying no call
   to Telegram's worker has crossed the script's hook. No notice appears.
   Open another chat and come back, or start typing to your second account:
   within a second the button turns blue, and a message sent now goes
   translated. Put Run at back to its default and reload.
9. A held message is left to its own client first. Set the address from 6
   again, and open the same chat in Web A and in Web K, in two tabs. In Web
   A, send `первое` and open another chat right after Enter. When the notice
   comes, `первое` is in Web K's box within two seconds, and Web A's box is
   empty when you go back to the chat. Again, but stay in the chat in Web A:
   `первое` is back in Web A's own box, and never in Web K's. The other way
   round: in Web K, send `второе`, type `третье` into its box and wait for
   the notice, then delete it: `второе` is in Web K's box, and Web A's stays
   empty. Put Groq and its key back.

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
   names the plugin's version as an early build, the envelope and the
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
   "Mozumi (123456789)" and "Web K" (or "Web A"). Its Build is the plugin's
   version and, in brackets, the core it was built with and the build
   counter, "0.2.1a (606d8f3-2)" for example: the first seven characters of
   the commit that `git submodule status` shows for `ai-translate`, a dash,
   and the counter of `build-counter.json`.
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
   Logs, and with Corrections (AI Learn on). Escape again shuts the
   settings, and the chat behind them is still open.
5. Turn movement off in the client. Web K: Settings, Power Saving, *Motion
   Effects* off. Web A: Settings, Animations and Performance, *Page
   Transitions* off. Every window of ours now fades in and out where it
   stands, as the client's own do. In Web K turn *Interface Animations* off
   as well: ours are there at once and gone at once. Put both back.
6. Turn on reduced motion in the system (Windows: Settings, Accessibility,
   Visual effects, *Animation effects* off; macOS: System Settings,
   Accessibility, Display, *Reduce motion*) and reload the page: in both
   clients ours fade and do not move. Turn it back.
7. The keyboard. Open the settings and press Tab again and again: the
   focus goes down the page and, after Logs, back up to the GitHub button
   beside the title, never into Telegram behind the window. Shift+Tab goes
   the other way round. The same in Support and feedback.
8. The widths, against Discord. With the browser's developer tools (F12,
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
