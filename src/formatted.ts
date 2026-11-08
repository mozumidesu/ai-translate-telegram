/*
 * AI Translate for Telegram — a formatted message, as the model reads it.
 *
 * Telegram keeps formatting beside the text, as entities with an offset and a
 * length, and a translation moves every word. So on its way to the model a
 * message is written the way the core's Telegram dialect describes it: marks
 * around bold, italic, struck and spoiler text, a link as [text](url), code in
 * backticks. The answer is read back into text and entities.
 *
 * A mention of someone without a username is a link to them, fenced off with
 * backslashes the way a writer keeps a phrase as typed: the core then hands it
 * back byte for byte, or does not answer. A link that opened the message was
 * otherwise taken for the language code an answer starts with, and lost.
 *
 * What has no marks is put back another way: a custom emoji by which of its
 * kind it was, a quote by its lines. Underline has neither and is left out.
 * A mark the writer typed as a character of their own would be read back as
 * formatting, so a kind of mark that already occurs in the text is not used.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Kind =
    | "bold" | "italic" | "strike" | "spoiler" | "underline"
    | "code" | "pre" | "link" | "mention" | "emoji" | "quote";

/** One entity, whichever client it came from. */
export interface Entity {
    kind: Kind;
    offset: number;
    length: number;
    /** A link's address. */
    url?: string;
    /** Whom a mention without a username points at. */
    userId?: string;
    /** A custom emoji's document. */
    documentId?: string;
    /** A code block's language. */
    language?: string;
    /** Whatever else the client's own entity carried, handed back as it was. */
    extra?: Record<string, unknown>;
}

export interface Formatted {
    text: string;
    entities: Entity[];
}

export interface Marked {
    /** The message as the model is to see it. */
    marked: string;
    /** The model's answer read back into text and entities. */
    back(answer: string): Formatted;
}

const WRAPS: [Kind, string][] = [["bold", "**"], ["italic", "__"], ["strike", "~~"], ["spoiler", "||"]];
const WRAPPED = new Set<Kind>(WRAPS.map(([kind]) => kind));

/** Which marks can be read back, because the writer typed none of them. */
interface Safe {
    wraps: [Kind, string][];
    link: boolean;
    code: boolean;
}

// No slash in it: the core reads a backslash, a few marks and a slash as a drawn face.
const MENTION = /^tg:user\?id=(\d+)$/;

/** Where the core takes a backslash to open a fence of the writer's own, as core/keep.ts reads it. */
const FENCE_BEFORE = /[\s([{"'«„“‘‹（「『【]/;

/** Entity ranges with the spaces at their edges left outside. */
function trimmed(text: string, entity: Entity): Entity | undefined {
    let start = Math.max(0, entity.offset);
    let end = Math.min(text.length, entity.offset + entity.length);

    if (WRAPPED.has(entity.kind) || entity.kind === "link" || entity.kind === "mention") {
        while (start < end && /\s/.test(text[start])) start++;
        while (end > start && /\s/.test(text[end - 1])) end--;
    }

    return end > start ? { ...entity, offset: start, length: end - start } : undefined;
}

/** How many times `part` occurs in `text` before `at`. */
function occurrence(text: string, part: string, at: number) {
    let count = 0;
    for (let i = text.indexOf(part); i !== -1 && i < at; i = text.indexOf(part, i + part.length)) count++;
    return count;
}

/** Where the `n`th occurrence of `part` starts, counting from zero. */
function nth(text: string, part: string, n: number) {
    let at = text.indexOf(part);
    for (let i = 0; i < n && at !== -1; i++) at = text.indexOf(part, at + part.length);
    return at;
}

const lineOf = (text: string, at: number) => occurrence(text, "\n", at);

/** Where each line of `text` starts and ends. */
function lines(text: string) {
    const found: [number, number][] = [];
    let start = 0;

    for (const line of text.split("\n")) {
        found.push([start, start + line.length]);
        start += line.length + 1;
    }

    return found;
}

/** Code as backticks, or nothing when its text would close them early. */
function fencedCode(body: string) {
    if (!body.includes("`")) return "`" + body + "`";
    if (!body.includes("``") && !body.startsWith("`") && !body.endsWith("`")) return "``" + body + "``";
    return undefined;
}

function fencedBlock(body: string, language?: string) {
    if (body.includes("```")) return undefined;
    return "```" + (language && /^[\w+#.-]{1,32}$/.test(language) ? language : "") + "\n" + body + "\n```";
}

/**
 * `readOnly` is for a message that is only read: code stays fenced, so the core
 * keeps it, and nothing else is marked, because nothing goes back to Telegram.
 */
export function toMarked(text: string, given: Entity[], { readOnly = false } = {}): Marked {
    const entities = given
        .map(entity => trimmed(text, entity))
        .filter((entity): entity is Entity => !!entity)
        .sort((a, b) => a.offset - b.offset || b.length - a.length);

    const blocks = entities.filter(e => e.kind === "code" || e.kind === "pre");

    // Backticks the writer typed would read back as code, so then code goes as plain text.
    const outsideCode = (() => {
        let plain = text;
        for (const block of blocks)
            plain = plain.slice(0, block.offset) + " ".repeat(block.length) + plain.slice(block.offset + block.length);
        return plain;
    })();

    const codeSafe = !outsideCode.includes("`");
    const plain = codeSafe ? outsideCode : text;

    const safe: Safe = {
        wraps: WRAPS.filter(([, mark]) => !plain.includes(mark)),
        link: !plain.includes("]("),
        code: codeSafe
    };

    const marks = new Map(safe.wraps);

    // Code is written whole, and nothing else is open across it.
    const atoms = codeSafe ? blocks.filter((block, i) => !blocks.slice(0, i).some(b => block.offset < b.offset + b.length)) : [];

    const spans = readOnly ? [] : entities.filter(e =>
        (marks.has(e.kind) || ((e.kind === "link" || e.kind === "mention") && safe.link))
        && !atoms.some(a => e.offset >= a.offset && e.offset + e.length <= a.offset + a.length));

    // Every place where what is open changes, and every line break: a mark never runs past one.
    const cuts = new Set<number>([0, text.length]);
    for (const e of [...spans, ...atoms]) {
        cuts.add(e.offset);
        cuts.add(e.offset + e.length);
    }
    for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) {
        cuts.add(i);
        cuts.add(i + 1);
    }
    const points = [...cuts].sort((a, b) => a - b);

    const open: Entity[] = [];
    let marked = "";

    const opening = (e: Entity) => (e.kind === "link" || e.kind === "mention" ? "[" : marks.get(e.kind)!);
    const closing = (e: Entity) => e.kind === "link" ? `](${e.url})`
        : e.kind === "mention" ? `](tg:user?id=${e.userId})`
            : marks.get(e.kind)!;

    // A mention goes whole and fenced, where the core will take the fence for one.
    const fenced = new Set(spans.filter(e => {
        if (e.kind !== "mention") return false;
        const before = e.offset === 0 ? "" : text[e.offset - 1];
        const after = text[e.offset + e.length] ?? "";
        const name = text.slice(e.offset, e.offset + e.length);
        return (!before || FENCE_BEFORE.test(before)) && !/[\p{L}\p{N}]/u.test(after) && !/[\\\n]/.test(name);
    }));

    const shut = (keep: number) => {
        while (open.length > keep) marked += closing(open.pop()!);
    };

    for (let p = 0; p < points.length - 1; p++) {
        const from = points[p];
        const to = points[p + 1];
        const piece = text.slice(from, to);

        const mention = [...fenced].find(m => m.offset === from);
        if (mention) {
            shut(0);
            const end = mention.offset + mention.length;
            marked += `\\[${text.slice(from, end)}](tg:user?id=${mention.userId})\\`;
            while (p < points.length - 1 && points[p + 1] <= end) p++;
            p--;
            continue;
        }
        if ([...fenced].some(m => from > m.offset && from < m.offset + m.length)) continue;

        const atom = atoms.find(a => a.offset === from);
        if (atom) {
            shut(0);
            marked += (atom.kind === "pre" ? fencedBlock(piece, atom.language) : fencedCode(piece)) ?? piece;
            continue;
        }
        if (atoms.some(a => from > a.offset && from < a.offset + a.length)) continue;

        const wanted = piece === "\n" ? [] : spans.filter(e => e.offset <= from && e.offset + e.length >= to);

        let same = 0;
        while (same < open.length && same < wanted.length && open[same] === wanted[same]) same++;
        shut(same);

        for (const e of wanted.slice(same)) {
            marked += opening(e);
            open.push(e);
        }

        marked += piece;
    }
    shut(0);

    const emoji = entities
        .filter(e => e.kind === "emoji")
        .map(e => {
            const part = text.slice(e.offset, e.offset + e.length);
            return { entity: e, part, n: occurrence(text, part, e.offset) };
        });

    const quotes = entities
        .filter(e => e.kind === "quote")
        .map(e => {
            const end = e.offset + e.length;
            const startsLine = e.offset === 0 || text[e.offset - 1] === "\n";
            const endsLine = end === text.length || text[end] === "\n" || text[end - 1] === "\n";
            const last = text[end - 1] === "\n" ? end - 2 : end - 1;
            return startsLine && endsLine ? { entity: e, from: lineOf(text, e.offset), to: lineOf(text, last + 1) } : undefined;
        })
        .filter(<T>(q: T | undefined): q is T => !!q);

    const lineCount = text.split("\n").length;
    const extras = new Map(entities.filter(e => e.kind === "mention").map(e => [e.userId, e.extra]));

    return {
        marked,

        back(answer: string): Formatted {
            const read = readMarks(answer, safe);

            for (const e of read.entities)
                if (e.kind === "mention" && extras.get(e.userId)) e.extra = extras.get(e.userId);

            for (const { entity, part, n } of emoji) {
                const at = nth(read.text, part, n);
                if (at !== -1) read.entities.push({ ...entity, offset: at, length: part.length });
            }

            const answerLines = lines(read.text);
            if (answerLines.length === lineCount)
                for (const { entity, from, to } of quotes) {
                    const start = answerLines[from][0];
                    const end = answerLines[to][1];
                    if (end > start) read.entities.push({ ...entity, offset: start, length: end - start });
                }

            read.entities.sort((a, b) => a.offset - b.offset || b.length - a.length);
            return read;
        }
    };
}

/** Where a mark that opens at `from` closes on the same line, stepping over code; -1 when it does not. */
function closeOf(s: string, from: number, mark: string, safe: Safe) {
    for (let i = from; i < s.length && s[i] !== "\n"; i++) {
        if (safe.code && s[i] === "`") {
            const fence = s.startsWith("``", i) ? "``" : "`";
            const end = s.indexOf(fence, i + fence.length);
            if (end !== -1 && !s.slice(i, end).includes("\n")) {
                i = end + fence.length - 1;
                continue;
            }
        }
        if (s.startsWith(mark, i)) return i;
    }
    return -1;
}

/** A link at `at`: its text, its address and where it ends. Brackets in the address are counted. */
function linkAt(s: string, at: number) {
    const middle = s.indexOf("](", at + 1);
    if (middle === -1 || s.slice(at + 1, middle).includes("\n")) return undefined;

    let depth = 1;
    for (let i = middle + 2; i < s.length; i++) {
        const ch = s[i];
        if (/\s/.test(ch)) return undefined;
        if (ch === "(") depth++;
        if (ch === ")" && --depth === 0) {
            const url = s.slice(middle + 2, i);
            return url ? { text: s.slice(at + 1, middle), url, end: i + 1 } : undefined;
        }
    }
    return undefined;
}

/** Marks read back into text and entities. A mark left without its other half is dropped. */
export function readMarks(s: string, safe: Safe): Formatted {
    const entities: Entity[] = [];
    let text = "";

    const take = (inner: Formatted) => {
        for (const e of inner.entities) entities.push({ ...e, offset: e.offset + text.length });
        const start = text.length;
        text += inner.text;
        return start;
    };

    let i = 0;
    while (i < s.length) {
        if (safe.code && s.startsWith("```", i)) {
            const end = s.indexOf("```", i + 3);
            if (end !== -1) {
                let body = s.slice(i + 3, end);
                const head = /^([\w+#.-]{1,32})\n/.exec(body);
                const language = head?.[1];
                if (head) body = body.slice(head[0].length);
                else if (body.startsWith("\n")) body = body.slice(1);
                if (body.endsWith("\n")) body = body.slice(0, -1);

                entities.push({ kind: "pre", offset: text.length, length: body.length, ...(language ? { language } : {}) });
                text += body;
                i = end + 3;
                continue;
            }
        }

        if (safe.code && s[i] === "`") {
            const fence = s.startsWith("``", i) ? "``" : "`";
            const end = s.indexOf(fence, i + fence.length);
            const body = end === -1 ? "" : s.slice(i + fence.length, end);

            if (body && !body.includes("\n")) {
                entities.push({ kind: "code", offset: text.length, length: body.length });
                text += body;
                i = end + fence.length;
                continue;
            }

            i += fence.length;
            continue;
        }

        if (safe.link && s[i] === "[") {
            const link = linkAt(s, i);
            if (link) {
                const start = take(readMarks(link.text, safe));
                const length = text.length - start;
                const user = MENTION.exec(link.url);

                if (length)
                    entities.push(user
                        ? { kind: "mention", offset: start, length, userId: user[1] }
                        : { kind: "link", offset: start, length, url: link.url });

                i = link.end;
                continue;
            }
        }

        const wrap = safe.wraps.find(([, mark]) => s.startsWith(mark, i));
        if (wrap) {
            const [kind, mark] = wrap;
            const end = closeOf(s, i + mark.length, mark, safe);

            if (end > i + mark.length) {
                const start = take(readMarks(s.slice(i + mark.length, end), safe));
                if (text.length > start) entities.push({ kind, offset: start, length: text.length - start });
                i = end + mark.length;
                continue;
            }

            i += mark.length;
            continue;
        }

        text += s[i];
        i++;
    }

    return { text, entities };
}
