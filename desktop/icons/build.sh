#!/usr/bin/env bash
# AI Translate, the desktop app: every icon in src-tauri/icons/, drawn from the SVGs beside this file.
#
#   desktop/icons/build.sh        needs rsvg-convert (librsvg2-bin) and npm install
#
# icon.svg is the script's own icon, the one in its header. A Mac's is the same
# with the margin the system's icons have, and its menu bar gets the glyph
# alone, black, to tint. The tray's has a twin with a dot, for something unread.
#
# SPDX-License-Identifier: GPL-3.0-or-later
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../src-tauri/icons"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

rsvg-convert -w 1024 -h 1024 "$here/icon.svg" -o "$tmp/icon.png"
rsvg-convert -w 1024 -h 1024 "$here/icon-macos.svg" -o "$tmp/icon-macos.png"
(cd "$here/../.." && npx tauri icon "$tmp/icon.png" -o "$tmp/all" && npx tauri icon "$tmp/icon-macos.png" -o "$tmp/mac") >/dev/null 2>&1

mkdir -p "$out"
cp "$tmp/all/32x32.png" "$tmp/all/128x128.png" "$tmp/all/128x128@2x.png" "$tmp/all/icon.png" "$tmp/all/icon.ico" "$out/"
cp "$tmp/mac/icon.icns" "$out/"

rsvg-convert -w 64 -h 64 "$here/icon.svg" -o "$out/tray.png"
rsvg-convert -w 64 -h 64 "$here/tray-unread.svg" -o "$out/tray-unread.png"
rsvg-convert -w 44 -h 44 "$here/tray-macos.svg" -o "$out/tray-macos.png"
rsvg-convert -w 32 -h 32 "$here/unread.svg" -o "$out/unread.png"
