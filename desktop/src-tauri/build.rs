//! AI Translate, the desktop app: the commands the page may call, by name.
//!
//! Naming them here gives each a permission of its own, and from then on a
//! command the capability (capabilities/telegram.json) does not list is
//! refused. Without this, Tauri lets any page in the window call them all.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

/// The same names as in `generate_handler!` in src/lib.rs; test/desktop.mjs holds the two to each other.
const COMMANDS: &[&str] = &[
    "gm_values",
    "gm_set_value",
    "gm_request",
    "gm_abort",
    "gm_menu_command",
    "app_update_check",
    "app_update_install",
    "mark_title_bar_overlay",
    "set_notifications_count",
    "set_window_title",
    "open_new_window_cmd",
];

fn main() {
    println!("cargo:rerun-if-changed=../gen/inject.js");
    println!("cargo:rerun-if-changed=../version.json");
    if !std::path::Path::new("../gen/inject.js").exists() {
        panic!("desktop/gen/inject.js is not there: run `npm run build` in the repository first");
    }

    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)))
        .expect("the Tauri application could not be built");
}
