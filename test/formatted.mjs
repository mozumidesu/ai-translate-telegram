/*
 * AI Translate for Telegram — formatting on its way to the model and back.
 *
 * A message's entities become the marks of the core's Telegram dialect, and
 * whatever the model answers is read back into text and entities. The checks
 * say what a model is shown and what Telegram is handed afterwards, including
 * when the model loses half a pair of marks, and when the writer typed a mark
 * of their own that must stay a character.
 *
 * Run it:  node test/formatted.mjs
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { built, check, done } from "./lib.mjs";

const { toMarked } = await built(`export { toMarked } from "./src/formatted";\n`);

/** Each character with what is drawn over it, so a split entity compares equal to a whole one. */
function drawn({ text, entities }) {
    return [...text].map((ch, i) => {
        // Code points, not code units: the emoji below are two units each.
        const at = [...text].slice(0, i).join("").length;
        const over = entities
            .filter(e => e.offset <= at && at < e.offset + e.length)
            .map(e => e.kind + (e.url ? `(${e.url})` : "") + (e.userId ? `(${e.userId})` : "") + (e.documentId ? `(${e.documentId})` : ""))
            .sort();
        return over.length ? `${ch}:${over.join("+")}` : ch;
    }).join("");
}

const e = (kind, offset, length, more = {}) => ({ kind, offset, length, ...more });

// --- what the model is shown

check("plain text goes as it is", toMarked("просто текст", []).marked, "просто текст");
check("bold is written as marks", toMarked("это очень важно", [e("bold", 4, 5)]).marked, "это **очень** важно");
check("a space at the edge stays outside the marks", toMarked("это очень важно", [e("bold", 4, 6)]).marked, "это **очень** важно");
check("every mark the dialect names",
    toMarked("a b c d", [e("bold", 0, 1), e("italic", 2, 1), e("strike", 4, 1), e("spoiler", 6, 1)]).marked,
    "**a** __b__ ~~c~~ ||d||");
check("a link keeps its address", toMarked("вот статья", [e("link", 4, 6, { url: "https://example.com/a?id=1" })]).marked,
    "вот [статья](https://example.com/a?id=1)");
// Fenced, so the core hands it back byte for byte: as a bare link at the start
// of a message it was taken for the language code, and lost.
check("a mention without a username is a fenced link to the person", toMarked("Ваня привет", [e("mention", 0, 4, { userId: "123" })]).marked,
    "\\[Ваня](tg:user?id=123)\\ привет");
check("and only a link where the core would not take the fence", toMarked("привет,Ваня", [e("mention", 7, 4, { userId: "123" })]).marked,
    "привет,[Ваня](tg:user?id=123)");
check("code in backticks", toMarked("run ls -la now", [e("code", 4, 6)]).marked, "run `ls -la` now");
check("a code block with its language", toMarked("look:\nlet a = 1", [e("pre", 6, 9, { language: "js" })]).marked,
    "look:\n```js\nlet a = 1\n```");
check("a mark never runs across a line break", toMarked("раз\nдва", [e("bold", 0, 7)]).marked, "**раз**\n**два**");
check("nested marks nest", toMarked("very bold text", [e("bold", 0, 14), e("italic", 5, 4)]).marked, "**very __bold__ text**");
check("overlapping ones are split so they nest", toMarked("abcdef", [e("bold", 0, 4), e("italic", 2, 4)]).marked,
    "**ab__cd__**__ef__");
check("bold inside a link", toMarked("read the notes", [e("link", 5, 9, { url: "https://x.org" }), e("bold", 5, 3)]).marked,
    "read [**the** notes](https://x.org)");
check("underline has no mark and goes as text", toMarked("под чертой", [e("underline", 0, 3)]).marked, "под чертой");
check("a custom emoji goes as its emoji", toMarked("ок 👍", [e("emoji", 3, 2, { documentId: "5368" })]).marked, "ок 👍");

// The writer's own marks are characters, not formatting.
check("asterisks the writer typed leave bold out", toMarked("2**3 is eight", [e("bold", 8, 5)]).marked, "2**3 is eight");
check("but other marks still go", toMarked("2**3 is eight", [e("italic", 8, 5)]).marked, "2**3 is __eight__");
check("a backtick the writer typed leaves code as text", toMarked("a ` and ls", [e("code", 8, 2)]).marked, "a ` and ls");
check("backticks inside code do not count as the writer's", toMarked("say a**b ok", [e("code", 4, 4), e("bold", 9, 2)]).marked,
    "say `a**b` **ok**");

// --- what Telegram is handed back

const back = (text, entities, answer) => drawn(toMarked(text, entities).back(answer));

check("bold comes back over the translated word", back("это очень важно", [e("bold", 4, 5)], "this is **very** important"),
    drawn({ text: "this is very important", entities: [e("bold", 8, 4)] }));
check("a link comes back over the translated words",
    back("вот статья", [e("link", 4, 6, { url: "https://example.com/a?id=1" })], "here is [the article](https://example.com/a?id=1)"),
    drawn({ text: "here is the article", entities: [e("link", 8, 11, { url: "https://example.com/a?id=1" })] }));
check("an address with brackets of its own",
    back("см. статью", [e("link", 4, 6, { url: "https://en.wikipedia.org/wiki/Foo_(bar)" })], "see [the article](https://en.wikipedia.org/wiki/Foo_(bar))"),
    drawn({ text: "see the article", entities: [e("link", 4, 11, { url: "https://en.wikipedia.org/wiki/Foo_(bar)" })] }));

const mention = toMarked("Ваня привет", [e("mention", 0, 4, { userId: "123", extra: { user_id: 123 } })]).back("[Ваня](tg:user?id=123) hi");
check("a mention comes back as a mention of the same person", mention.entities,
    [{ kind: "mention", offset: 0, length: 4, userId: "123", extra: { user_id: 123 } }]);
check("and the text around it is the model's", mention.text, "Ваня hi");

check("half a pair of marks is dropped, not shown", back("это очень важно", [e("bold", 4, 5)], "this is **very important"),
    "this is very important");
check("the writer's own asterisks stay asterisks", back("2**3 is eight", [e("bold", 8, 5)], "2**3 равно восьми"), "2**3 равно восьми");
check("code comes back verbatim", back("run ls -la now", [e("code", 4, 6)], "запусти `ls -la` сейчас"),
    drawn({ text: "запусти ls -la сейчас", entities: [e("code", 8, 6)] }));
check("a code block keeps its language",
    toMarked("look:\nlet a = 1", [e("pre", 6, 9, { language: "js" })]).back("смотри:\n```js\nlet a = 1\n```").entities,
    [{ kind: "pre", offset: 8, length: 9, language: "js" }]);
check("marks inside code are code", back("say a**b ok", [e("code", 4, 4), e("bold", 9, 2)], "скажи `a**b` **ладно**"),
    drawn({ text: "скажи a**b ладно", entities: [e("code", 6, 4), e("bold", 11, 5)] }));

check("a custom emoji comes back on the same one of its kind",
    back("👍 сначала, потом 👍", [e("emoji", 18, 2, { documentId: "77" })], "👍 first, then 👍"),
    drawn({ text: "👍 first, then 👍", entities: [e("emoji", 15, 2, { documentId: "77" })] }));
check("and is left out when the model dropped it",
    toMarked("ок 👍", [e("emoji", 3, 2, { documentId: "77" })]).back("ok").entities, []);

check("a quote comes back over the same line",
    toMarked("он сказал:\nприходи завтра", [e("quote", 11, 14)]).back("he said:\ncome tomorrow").entities,
    [{ kind: "quote", offset: 9, length: 13 }]);
check("and is left out when the lines no longer match",
    toMarked("он сказал:\nприходи завтра", [e("quote", 11, 14)]).back("he said: come tomorrow").entities, []);

// An answer that is the message itself, as when it was already in the target language.
const everything = {
    text: "Hi Vanya, see the notes ok npm i 👍\nquoted line",
    entities: [
        e("mention", 3, 5, { userId: "42" }),
        e("bold", 14, 3), e("italic", 14, 9), e("link", 10, 13, { url: "https://x.org/n" }),
        e("spoiler", 24, 2), e("code", 27, 5), e("emoji", 33, 2, { documentId: "9" }), e("quote", 36, 11)
    ]
};
const round = toMarked(everything.text, everything.entities);
// The core hands a fenced part back without its backslashes, as it does every \fragment\.
const asTheCoreReturnsIt = round.marked.replace(/\\(\[[^\]\n]*\]\(tg:user\?id=\d+\))\\/g, "$1");
check("a message that comes back unchanged comes back with all its formatting", drawn(round.back(asTheCoreReturnsIt)), drawn(everything));

done();
