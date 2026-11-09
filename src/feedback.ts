/*
 * AI Translate for Telegram — the two links at the top of the settings page
 * and the window behind the envelope, as ai-translate/ui/Feedback.tsx has them.
 *
 * What is written here goes to the same relay as the Discord plugin's, with
 * the Telegram name in place of the Discord one, and the client it came from
 * on the line after, so a reply can find its way. Nothing else is sent: no
 * key and no setting.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { meId } from "../ai-translate/core/host";
import { currentLocale, t } from "../ai-translate/core/locales";
import { pickNet } from "../ai-translate/core/net";
import { postFeedback } from "../ai-translate/core/providers";
import { theClient } from "./client";
import { button, hint, openSheet } from "./sheet";
import { addStyle, UI_ID } from "./ui";
import { CORE, VERSION } from "./version";

/** This script's own source: what the GitHub link opens. */
export const PROJECT_PAGE = "https://github.com/mozumidesu/ai-translate-telegram";
/** Where AI Translate is supported, whichever app it runs in. */
export const SUPPORT_SERVER = "https://discord.gg/HKRc9FfK43";
/** A relay, not the webhook behind it: anything shipped here is readable. */
const FEEDBACK_ENDPOINT = "https://ai-translate-feedback.mozumidesu.workers.dev";

const SUBJECT_LIMIT = 256;
/** The counter only appears once the room left is worth watching. */
const COUNTER_FROM = 50;
const MESSAGE_LIMIT = 3800;

const CSS = `
.links { display: flex; gap: .45rem; }
.link {
    all: unset;
    cursor: pointer;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    color: var(--muted);
    background: var(--field);
}
.link:hover, .link:focus-visible { color: var(--fg); }

.alpha { margin: 0 0 .8rem; font-size: .8rem; color: var(--muted); line-height: 1.4; }
.feedback-head { display: flex; align-items: center; gap: .9rem; margin: .5rem 0 1.2rem; }
.badge { flex: none; display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 1rem; background: var(--field); }
.quiet { margin: 0; color: var(--muted); line-height: 1.45; }
.field-head { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
.optional { color: var(--muted); font-weight: 400; }
.counter { color: var(--muted); font-size: .75rem; white-space: nowrap; }
.counter.out { color: var(--bad); }
.field input.wrong { border-color: var(--bad); }

.drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .5rem;
    padding: .75rem;
    border: 2px dashed var(--line);
    border-radius: 10px;
    text-align: center;
}
.drop.over { border-color: var(--accent); border-style: solid; }
.drop-text { color: var(--muted); font-size: .8rem; }
.shots { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }
.shot { position: relative; }
.shot img { display: block; width: 96px; height: 72px; object-fit: cover; border-radius: 6px; }
.shot button {
    all: unset;
    position: absolute;
    top: -6px;
    inset-inline-end: -6px;
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border-radius: 50%;
    background: var(--bg);
    color: var(--fg);
    font-size: .85rem;
    line-height: 1;
    box-shadow: var(--shadow);
}

.result { margin-top: .5rem; }
.or { margin: .75rem 0; text-align: center; font-size: .75rem; color: var(--muted); }
.centre { display: flex; justify-content: center; }
.centre .button { min-width: 200px; }
`;

const SVG = "http://www.w3.org/2000/svg";

function icon(d: string, size: number) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", d);
    svg.append(path);
    return svg;
}

const GITHUB = "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";
const MAIL = "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.2-8 5-8-5V6l8 5 8-5v2.2Z";

// --- screenshots

interface Shot {
    name: string;
    type: string;
    /** base64, without the data: prefix: the relay turns it back into a file. */
    data: string;
}

const MAX_IMAGES = 3;
/** The largest single image the window will take. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Everything attached travels as one Discord message, which has a cap; this stays under it. */
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_EDGE_PX = 1920;

const MB = (bytes: number) => Math.round(bytes / (1024 * 1024));

const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
});

/** The file exactly as it was picked, nothing touched. */
async function readImage(file: File): Promise<Shot | null> {
    try {
        return { name: file.name || "screenshot", type: file.type, data: await toBase64(file) };
    } catch {
        return null;
    }
}

/** Scaled to 1920 across and made a JPEG: still readable, and several then fit into one message. */
async function shrinkImage(file: File): Promise<Shot | null> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();

        const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, "image/jpeg", 0.85));
        if (!blob) return null;

        return { name: (file.name || "screenshot").replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", data: await toBase64(blob) };
    } catch {
        return null;
    }
}

/** base64 carries three bytes in every four characters. */
const shotBytes = (shot: Shot) => (shot.data.length * 3) / 4;
const totalBytes = (shots: Shot[]) => shots.reduce((sum, shot) => sum + shotBytes(shot), 0);

/** Deliberately loose: one @, no spaces, and a dot in the domain. Stricter refuses real addresses. */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const emailLooksWrong = (value: string) => value.trim() !== "" && !EMAIL.test(value.trim());

/** Who is writing, as Telegram knows them, so a reply can find its way. */
function author() {
    const id = meId();
    if (!id) return "";
    const name = theClient()?.chatTitle(id);
    return name ? `${name} (${id})` : id;
}

/** What the report says under Telegram: who is writing, then which client they write in, a line each. */
function telegramField() {
    const client = theClient();
    return [author(), client && `Web ${client.name.toUpperCase()}`].filter(Boolean).join("\n");
}

function labelled(text: string, optional = false) {
    const label = document.createElement("label");
    label.textContent = text;
    if (optional) {
        const note = document.createElement("span");
        note.className = "optional";
        note.textContent = ` ${t("feedback.optional")}`;
        label.append(note);
    }
    return label;
}

// --- the window

export function openFeedback() {
    addStyle(CSS);

    let pasting: ((event: ClipboardEvent) => void) | undefined;

    openSheet({
        name: "feedback",
        title: () => t("feedback.title"),
        onShut: () => {
            if (pasting) removeEventListener("paste", pasting, true);
        },
        draw(body) {
            let shots: Shot[] = [];
            let state: "idle" | "sending" | "sent" | "failed" = "idle";
            let answered = 0;

            const alpha = document.createElement("p");
            alpha.className = "alpha";
            alpha.textContent = t("feedback.alpha", { version: VERSION });

            const head = document.createElement("div");
            head.className = "feedback-head";
            const badge = document.createElement("div");
            badge.className = "badge";
            badge.append(icon(MAIL, 30));
            const intro = document.createElement("p");
            intro.className = "quiet";
            intro.textContent = t("feedback.intro");
            head.append(badge, intro);

            // Subject, with what is left once little is.
            const subjectBox = document.createElement("div");
            subjectBox.className = "field";
            const subjectHead = document.createElement("div");
            subjectHead.className = "field-head";
            const counter = document.createElement("span");
            counter.className = "counter";
            subjectHead.append(labelled(t("feedback.subject")), counter);
            const subject = document.createElement("input");
            subject.type = "text";
            subject.name = "subject";
            subject.maxLength = SUBJECT_LIMIT;
            subject.placeholder = t("feedback.subjectHint");
            subjectBox.append(subjectHead, subject);

            const messageBox = document.createElement("div");
            messageBox.className = "field";
            const message = document.createElement("textarea");
            message.name = "message";
            message.maxLength = MESSAGE_LIMIT;
            message.placeholder = t("feedback.messageHint");
            messageBox.append(labelled(t("feedback.message")), message);

            // Screenshots: dropped, pasted or picked.
            const shotBox = document.createElement("div");
            shotBox.className = "field";
            const drop = document.createElement("div");
            drop.className = "drop";
            const thumbs = document.createElement("div");
            thumbs.className = "shots";
            const dropText = document.createElement("div");
            dropText.className = "drop-text";
            dropText.textContent = t("feedback.screenshotHint", { count: MAX_IMAGES });
            const picker = document.createElement("input");
            picker.type = "file";
            picker.accept = "image/*";
            picker.multiple = true;
            picker.hidden = true;
            const pick = button(t("feedback.addImage"), () => picker.click());
            const imageError = hint("", true);
            drop.append(thumbs, dropText, pick, picker);
            shotBox.append(labelled(t("feedback.screenshot"), true), drop, imageError);

            const emailBox = document.createElement("div");
            emailBox.className = "field";
            const email = document.createElement("input");
            email.type = "email";
            email.name = "email";
            email.maxLength = 200;
            email.placeholder = t("feedback.emailHint");
            const emailWrong = hint("", true);
            emailBox.append(labelled(t("feedback.email"), true), email, emailWrong, hint(t("feedback.attachedApp", { app: "Telegram" })));

            const send = button("", () => void sendIt(), { primary: true, wide: true });
            const result = hint();
            result.classList.add("result");

            const or = document.createElement("p");
            or.className = "or";
            or.textContent = t("feedback.or");
            const centre = document.createElement("div");
            centre.className = "centre";
            centre.append(button(t("feedback.discord"), () => void window.open(SUPPORT_SERVER, "_blank")));

            const draw = () => {
                const left = SUBJECT_LIMIT - subject.value.length;
                counter.textContent = left <= COUNTER_FROM ? t("feedback.charsLeft", { left }) : "";
                counter.classList.toggle("out", left <= 0);

                thumbs.textContent = "";
                shots.forEach((shot, at) => {
                    const box = document.createElement("div");
                    box.className = "shot";
                    const img = document.createElement("img");
                    img.src = `data:${shot.type};base64,${shot.data}`;
                    img.alt = shot.name;
                    const remove = document.createElement("button");
                    remove.type = "button";
                    remove.textContent = "×";
                    remove.setAttribute("aria-label", t("feedback.removeImage"));
                    remove.onclick = () => {
                        shots = shots.filter((_, n) => n !== at);
                        draw();
                    };
                    box.append(img, remove);
                    thumbs.append(box);
                });
                pick.disabled = shots.length >= MAX_IMAGES;

                send.textContent = state === "sending" ? t("feedback.sending") : t("feedback.send");
                send.disabled = state === "sending" || state === "sent" || !subject.value.trim() || !message.value.trim();
                result.textContent = state === "sent" ? t("feedback.sentHint")
                    : state === "failed" ? (answered > 0 ? t("feedback.failedCode", { status: answered }) : t("feedback.failed"))
                        : "";
            };

            const addImages = async (files: File[]) => {
                imageError.textContent = "";
                let complaint = "";
                let room = MAX_TOTAL_BYTES - totalBytes(shots);
                let slots = MAX_IMAGES - shots.length;

                for (const file of files) {
                    if (slots <= 0) break;
                    if (!file.type.startsWith("image/")) {
                        complaint = t("feedback.imageBad");
                        continue;
                    }
                    const tooBig = t("feedback.imageTooBig", { size: MB(MAX_IMAGE_BYTES), total: MB(MAX_TOTAL_BYTES) });
                    if (file.size > MAX_IMAGE_BYTES) {
                        complaint = tooBig;
                        continue;
                    }

                    // Full quality while there is room; scaled down only when the batch would not fit.
                    let shot = file.size <= room ? await readImage(file) : await shrinkImage(file);
                    if (shot && shotBytes(shot) > room) shot = await shrinkImage(file);
                    if (!shot || shotBytes(shot) > room) {
                        complaint = tooBig;
                        continue;
                    }

                    shots = [...shots, shot];
                    room -= shotBytes(shot);
                    slots--;
                }

                imageError.textContent = complaint;
                draw();
            };

            const sendIt = async () => {
                // The address is judged when the field is left; Send counts as leaving it.
                if (emailLooksWrong(email.value)) {
                    emailWrong.textContent = t("feedback.emailInvalid");
                    email.classList.add("wrong");
                    return;
                }

                state = "sending";
                draw();

                // Plain fields: the relay decides how they look.
                const { status } = await postFeedback(pickNet(), FEEDBACK_ENDPOINT, {
                    subject: subject.value.slice(0, SUBJECT_LIMIT),
                    message: message.value.slice(0, MESSAGE_LIMIT),
                    replyTo: email.value.trim().slice(0, 200),
                    discord: "",
                    telegram: telegramField(),
                    locale: currentLocale(),
                    images: shots,
                    build: `${VERSION} (${CORE})`
                });

                answered = status;
                state = status >= 200 && status < 300 ? "sent" : "failed";
                draw();
            };

            subject.oninput = draw;
            message.oninput = draw;
            // Checked when the field is left, not while it is typed in.
            email.onblur = () => {
                const wrong = emailLooksWrong(email.value);
                emailWrong.textContent = wrong ? t("feedback.emailInvalid") : "";
                email.classList.toggle("wrong", wrong);
            };
            email.onfocus = () => {
                emailWrong.textContent = "";
                email.classList.remove("wrong");
            };

            drop.ondragover = event => {
                event.preventDefault();
                drop.classList.add("over");
            };
            drop.ondragleave = () => drop.classList.remove("over");
            drop.ondrop = event => {
                event.preventDefault();
                drop.classList.remove("over");
                void addImages([...(event.dataTransfer?.files ?? [])]);
            };
            picker.onchange = () => {
                void addImages([...(picker.files ?? [])]);
                picker.value = "";
            };

            // A pasted screenshot is caught anywhere in this window, and kept from Telegram, which would send it to the chat.
            if (pasting) removeEventListener("paste", pasting, true);
            pasting = event => {
                // Seen from the window, anything typed in our closed root has our root's host as its target.
                if (!(event.target instanceof Element) || event.target.id !== UI_ID) return;
                const files = [...(event.clipboardData?.files ?? [])].filter(f => f.type.startsWith("image/"));
                if (!files.length) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                void addImages(files);
            };
            addEventListener("paste", pasting, true);

            draw();
            body.append(alpha, head, subjectBox, messageBox, shotBox, emailBox, send, result, or, centre);
        }
    });
}

// --- the row of links

function link(label: string, d: string, act: () => void) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "link";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.append(icon(d, 18));
    b.onclick = act;
    return b;
}

/** Source code and support, beside the settings page's title. */
export function headerLinks() {
    addStyle(CSS);
    const row = document.createElement("div");
    row.className = "links";
    row.append(
        link(t("feedback.project"), GITHUB, () => void window.open(PROJECT_PAGE, "_blank")),
        link(t("feedback.support"), MAIL, openFeedback)
    );
    return [row];
}
