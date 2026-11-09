/*
 * AI Translate for Telegram — the icons, the same as the Discord plugin's.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const SVG = "http://www.w3.org/2000/svg";

function icon(viewBox: string, d: string, size: number) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS(SVG, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", d);
    svg.append(path);
    return svg;
}

export const translateIcon = (size = 20) => icon(
    "0 96 960 960",
    "m475 976 181-480h82l186 480h-87l-41-126H604l-47 126h-82Zm151-196h142l-70-194h-2l-70 194Zm-466 76-55-55 204-204q-38-44-67.5-88.5T190 416h87q17 33 37.5 62.5T361 539q45-47 75-97.5T487 336H40v-80h280v-80h80v80h280v80H567q-22 69-58.5 135.5T419 598l98 99-30 81-127-122-200 200Z",
    size
);

export const explainIcon = (size = 20) => icon(
    "0 0 24 24",
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 17h-2v-2h2v2Zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26A2 2 0 1 0 10 9H8a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25Z",
    size
);

/* Nothing was translated and nothing was explained: a message that has been looked over. */
export const correctIcon = (size = 20) => icon(
    "0 0 24 24",
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9Z",
    size
);
