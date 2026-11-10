# AI Translate for Telegram

A userscript for Telegram that translates your messages with an AI model of
your choice, and does it without flattening the way you write.

Messages you send are translated before they go out, in the chats you switch
on. Messages you receive are translated when you ask for them, from the
message's menu. It uses the translation core of the
[AI Translate plugin for Discord](https://github.com/mozumidesu/ai-translate),
with the same providers.

## Why another translator

Machine translation is built for prose. Chat is not prose. It is lower case and
unfinished, it runs on kaomoji, and a missing full stop is doing work. Most
translators quietly tidy all of that away, and what arrives on the other side
reads like a form letter written by someone else.

This one is built around leaving it alone. It will not add punctuation you did
not write, it will not capitalise what you left in lower case, it keeps your
line breaks where you put them, and it knows an emoticon is a face rather than
a word to be rendered.

## What it can do

Auto-translation is set per chat, so the conversations you actually need it in
are the only ones it touches. Left-click the translate button in the chat bar
to open the panel; right-click it, or shift-click it, to switch the current
chat on or off. The button takes the accent colour while the chat is on.

What you type waits until its translation is in, so the other person only ever
sees the translation. Edits are translated too. Bold, italic, strikethrough,
spoilers, links, mentions, custom emoji, quotes, code and code blocks stay where
they belong in the translated message. Underline is the one thing that is
dropped. If a translation fails, the message is held back, the reason is shown,
and your text goes back into the chat box; in the settings you can choose to
send it untranslated instead.

Anything you receive can be translated from the right-click menu on the
message, and the answer appears in a card beside it. When even a translation
leaves you none the wiser, because of chat shorthand, a word only used in one
country or a joke between two people, **AI Explain** in the same menu names the
language, spells the abbreviations out and says what was meant. That one is off
until you switch it on in the settings.

Switch on **Use recent messages as context** and the last few messages of the
conversation travel with each request, so a bare "yes", or "it won't paste",
lands the way it was meant. It is off until you switch it on, because it sends
other people's messages to your provider. You can pin your own vocabulary too:
words that must never be translated, terms tied to one fixed translation, the
grammatical gender to use for yourself, and whether people are addressed
formally or not.

A single message can keep part of itself as well. Put a word or phrase between
two backslashes, `\carpe diem\`, and it goes out exactly as you typed it, with
the backslashes taken off; a backslash at the start of a line keeps that whole
line. Code is never translated, whether it is written between backticks or
formatted as code.

**AI Learn** is for the language you are learning. Switch it on in the
settings, and in a chat you have switched on, what you write in the alphabet of
the language you translate into goes as you typed it, with the version a native
speaker would have written under it, the changed words marked. Only you see that
line. **Corrections**, in the settings, keeps the last fifty, and **AI Learn**
in the menu of your own message asks again.

Your own sent messages can keep the original underneath them, visible only to
you, so you can see what you actually typed; that one is off until you switch it
on. Bot commands such as `/start`, and what a bot's buttons send, go out exactly
as they are. The interface speaks 16 languages and follows Telegram's own unless
you tell it otherwise.

## Providers

You bring your own API key, and it stays yours. The script has no translation
server of its own and never sees anyone else's key.

| Provider | Free tier |
|---|---|
| Groq | yes |
| Google Gemini | yes |
| Z.ai GLM | yes, and reachable where the other two are blocked |
| Anthropic Claude | no |
| Any OpenAI-compatible | depends on the provider |

Up to four backup providers can stand behind the first one. When the first one
is overloaded, out of quota or refuses the request, the translation goes
through the next one by itself, and a short notice says which one answered.

Your key stays in your userscript manager's storage, and requests go out
through the manager, not from the page. Other people's messages reach your
provider only when you ask for one to be translated or explained, or while
**Use recent messages as context** is on.

## Install

AI Translate for Telegram runs in Telegram Web, in a browser, and nowhere else:
the Telegram apps cannot be extended. Both of Telegram Web's clients work, Web A
and Web K.

Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript
manager, then open
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Your userscript manager offers to install it, and keeps it up to date from
there afterwards. Open [web.telegram.org](https://web.telegram.org/) and reload
the page.

Then click the translate button in the chat bar and press **All plugin
settings**, or find the same entry in your userscript manager's menu, choose a
provider and paste your key. The first time the script reaches your provider,
your manager may ask whether it can: allow that address, in Tampermonkey with
**Always allow domain**. Then switch a chat on, and you are done.

## Updates

Your userscript manager looks for a new version on its own schedule, from the
`main` branch of this repository. **Check for updates**, at the bottom of the
settings, asks at once, and when there is something new it opens the new script
in your manager: confirm it there and reload the page.

## Uninstall

Delete the script in your userscript manager. Nothing else was installed, so
nothing else needs removing.

## Reporting something

The envelope at the top of the settings page opens a window for bug reports and
requests, screenshots included. The support server is linked in the same
window. A report carries what you wrote, the screenshots you added, your Telegram
name and id so a reply can reach you, and the build you run. It never carries a
key or a setting. You can also
[open an issue](https://github.com/mozumidesu/ai-translate-telegram/issues) on
GitHub.

## Licence

GPL-3.0-or-later, the same as AI Translate. See [LICENSE](LICENSE).
