<p align="center">
  <b>🇩🇪&nbsp;Deutsch</b> ·
  <a href="../README.md">🇬🇧&nbsp;English</a> ·
  <a href="README.es.md">🇪🇸&nbsp;Español</a> ·
  <a href="README.fr.md">🇫🇷&nbsp;Français</a> ·
  <a href="README.id.md">🇮🇩&nbsp;Bahasa Indonesia</a> ·
  <a href="README.pt.md">🇧🇷&nbsp;Português</a> ·
  <a href="README.ro.md">🇷🇴&nbsp;Română</a> ·
  <a href="README.ru.md">🇷🇺&nbsp;Русский</a> ·
  <a href="README.uk.md">🇺🇦&nbsp;Українська</a> ·
  <a href="README.tr.md">🇹🇷&nbsp;Türkçe</a> ·
  <a href="README.vi.md">🇻🇳&nbsp;Tiếng Việt</a> ·
  <a href="README.ar.md">🇸🇦&nbsp;العربية</a> ·
  <a href="README.th.md">🇹🇭&nbsp;ไทย</a> ·
  <a href="README.ja.md">🇯🇵&nbsp;日本語</a> ·
  <a href="README.ko.md">🇰🇷&nbsp;한국어</a> ·
  <a href="README.zh.md">🇨🇳&nbsp;中文</a>
</p>

# AI Translate for Telegram

Ein Userscript für Telegram, das deine Nachrichten mit einem KI-Modell deiner
Wahl übersetzt und dabei nicht glattbügelt, wie du schreibst.

Nachrichten, die du sendest, werden vor dem Absenden übersetzt, in den Chats,
die du einschaltest. Nachrichten, die du bekommst, werden übersetzt, wenn du
darum bittest, über das Menü der Nachricht. Es nutzt den Übersetzungskern des
[AI-Translate-Plugins für Discord](https://github.com/mozumidesu/ai-translate),
mit denselben Anbietern.

## Warum noch ein Übersetzer

Maschinelle Übersetzung ist für Prosa gemacht. Chat ist keine Prosa. Er läuft in
Kleinschreibung und halben Sätzen, lebt von Kaomoji, und ein fehlender Punkt
sagt etwas. Die meisten Übersetzer räumen das alles stillschweigend auf, und auf
der anderen Seite kommt ein Formbrief an, den jemand anders geschrieben hat.

Dieser ist darum gebaut, es in Ruhe zu lassen. Er setzt keine Satzzeichen, die
du nicht geschrieben hast, macht nichts groß, was du klein gelassen hast, behält
deine Zeilenumbrüche da, wo du sie gesetzt hast, und weiß, dass ein Emoticon ein
Gesicht ist und kein Wort, das übersetzt gehört.

## Was es kann

Die automatische Übersetzung wird pro Chat eingeschaltet, also arbeitet sie nur
dort, wo du sie wirklich brauchst. Linksklick auf den Übersetzen-Knopf in der
Eingabezeile öffnet das Panel; Rechtsklick oder Umschalt-Klick schaltet den
aktuellen Chat ein oder aus. Solange der Chat eingeschaltet ist, trägt der Knopf
die Akzentfarbe.

Was du tippst, wartet, bis seine Übersetzung da ist, sodass dein Gegenüber immer
nur die Übersetzung sieht. Eine Bearbeitung geht genau so raus, wie du sie
tippst, damit sich eine Übersetzung von Hand richtigstellen lässt. Fett, kursiv,
durchgestrichen, Spoiler, Links, Erwähnungen, eigene Emoji, Zitate, Code und
Codeblöcke bleiben in der übersetzten Nachricht da, wo sie hingehören. Nur
Unterstreichungen fallen weg. Schlägt eine Übersetzung fehl, wird die Nachricht
zurückgehalten, der Grund wird angezeigt, und dein Text kommt zurück ins
Eingabefeld; in den Einstellungen kannst du stattdessen wählen, sie unübersetzt
zu senden.

Alles, was du bekommst, lässt sich über das Rechtsklickmenü der Nachricht
übersetzen, und die Antwort erscheint in einer Karte daneben. Wenn selbst die
Übersetzung nicht weiterhilft, wegen Abkürzungen, eines Wortes, das nur in einem
Land benutzt wird, oder eines Witzes zwischen zwei Leuten, nennt **Erklären** im
selben Menü die Sprache, schreibt die Abkürzungen aus und sagt, was gemeint war.
Das ist aus, bis du es in den Einstellungen einschaltest.

Schalte **Letzte Nachrichten als Zusammenhang nutzen** ein, und die letzten
Nachrichten des Gesprächs gehen mit jeder Anfrage mit, damit ein bloßes „ja“
oder „es fügt sich nicht ein“ so ankommt, wie es gemeint war. Das ist aus, bis
du es einschaltest, weil es die Nachrichten anderer Leute an deinen Anbieter
schickt. Du kannst auch dein eigenes Vokabular festlegen: Wörter, die nie
übersetzt werden dürfen, Begriffe mit einer festen Übersetzung, das grammatische
Geschlecht für dich selbst und ob dein Gegenüber geduzt oder gesiezt wird.

Auch eine einzelne Nachricht kann einen Teil von sich behalten. Setze ein Wort
oder eine Wendung zwischen zwei Backslashes, `\carpe diem\`, und sie geht genau
so raus, wie du sie getippt hast, ohne die Backslashes; ein Backslash am
Zeilenanfang behält die ganze Zeile. Code wird nie übersetzt, ob er zwischen
Backticks steht oder als Code formatiert ist.

**AI Learn** ist für die Sprache, die du lernst. Schalte es in den Einstellungen
ein, und in einem eingeschalteten Chat geht, was du im Alphabet der Sprache
schreibst, in die du übersetzt, so raus, wie du es getippt hast, und darunter
steht die Fassung, die ein Muttersprachler geschrieben hätte, mit den geänderten
Wörtern markiert. Nur du siehst diese Zeile. **Korrekturen** in den
Einstellungen behält die letzten fünfzig, und **Korrigieren** im Menü deiner
eigenen Nachricht fragt noch einmal nach.

Unter deinen gesendeten Nachrichten kann das Original stehen bleiben, nur für
dich sichtbar, damit du siehst, was du tatsächlich getippt hast; das ist aus,
bis du es einschaltest. Bot-Befehle wie `/start` und das, was die Knöpfe eines
Bots senden, gehen genau so raus, wie sie sind. Die Oberfläche spricht 16
Sprachen und folgt der von Telegram, solange du nichts anderes sagst.

## Anbieter

Den API-Schlüssel bringst du selbst mit, und er bleibt deiner. Das Skript hat
keinen eigenen Übersetzungsserver und sieht nie den Schlüssel von jemand
anderem.

| Anbieter | Kostenloses Kontingent |
|---|---|
| Groq | ja |
| Google Gemini | ja |
| Z.ai GLM | ja, und erreichbar, wo die anderen beiden gesperrt sind |
| Anthropic Claude | nein |
| Anderer Anbieter (jede OpenAI-kompatible API) | hängt vom Anbieter ab |

Bis zu vier Anbieter lassen sich als Reserve hinter dem ersten eintragen. Wenn
der erste überlastet ist, sein Kontingent aufgebraucht hat oder die Anfrage
ablehnt, läuft die Übersetzung von selbst über den nächsten, und eine kurze
Benachrichtigung sagt, warum der erste übergangen wurde, einmal und nicht bei
jeder Nachricht.

Dein Schlüssel bleibt im Speicher deines Userscript-Managers, und die Anfragen
laufen über den Manager, nicht von der Seite aus. Die Nachrichten anderer Leute
erreichen deinen Anbieter nur, wenn du eine davon übersetzen oder erklären
lässt, oder solange **Letzte Nachrichten als Zusammenhang nutzen** eingeschaltet
ist.

## Installation

AI Translate for Telegram läuft in Telegram Web, im Browser, und nirgends sonst:
die Telegram-Apps lassen sich nicht erweitern. Beide Clients von Telegram Web
funktionieren, Web A und Web K.

Installiere [Tampermonkey](https://www.tampermonkey.net/) oder einen anderen
Userscript-Manager und öffne dann
[ai-translate.user.js](https://github.com/mozumidesu/ai-translate-telegram/raw/main/dist/ai-translate.user.js).
Dein Userscript-Manager bietet die Installation an und hält es danach von dort
aus aktuell. Öffne [web.telegram.org](https://web.telegram.org/) und lade die
Seite neu.

Klicke dann auf den Übersetzen-Knopf in der Eingabezeile und drücke **Alle
Plugin-Einstellungen**, oder finde denselben Eintrag im Menü deines
Userscript-Managers, wähle einen Anbieter und füge deinen Schlüssel ein. Wenn
das Skript deinen Anbieter zum ersten Mal erreicht, fragt dein Manager
vielleicht, ob es das darf: erlaube diese Adresse, in Tampermonkey mit **Always
allow domain**. Schalte dann einen Chat ein, und du bist fertig.

## Updates

Dein Userscript-Manager sucht nach seinem eigenen Zeitplan nach einer neuen
Version, im Branch `main` dieses Repositorys. **Nach Updates suchen** unten in
den Einstellungen fragt sofort nach und öffnet, wenn es etwas Neues gibt, das
neue Skript in deinem Manager: bestätige es dort und lade die Seite neu.

## Deinstallation

Lösche das Skript in deinem Userscript-Manager. Sonst wurde nichts installiert,
also muss auch sonst nichts entfernt werden.

## Etwas melden

Der Umschlag oben auf der Einstellungsseite öffnet ein Fenster für
Fehlerberichte und Wünsche, Screenshots inklusive. Der Support-Server ist im
selben Fenster verlinkt. Ein Bericht enthält, was du geschrieben hast, die
Screenshots, die du angehängt hast, deinen Telegram-Namen und deine ID, damit
dich eine Antwort erreichen kann, und den Build, den du nutzt. Er enthält nie
einen Schlüssel oder eine Einstellung. Du kannst auch auf GitHub [ein Issue
eröffnen](https://github.com/mozumidesu/ai-translate-telegram/issues).

## Lizenz

GPL-3.0-or-later, wie AI Translate. Siehe [LICENSE](../LICENSE).
