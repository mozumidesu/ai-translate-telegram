//! AI Translate, the desktop app.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

// No console window behind the app on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ai_translate_desktop::run();
}
