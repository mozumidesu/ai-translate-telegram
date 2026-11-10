//! What Telegram's own client asks of a desktop host.
//!
//! Web A sees that it runs in a Tauri window (`window.isTauri`, which Tauri
//! sets and nothing can unset) and behaves as it does in Telegram's own shell,
//! Telegram Air: it shows notifications through the notification plugin,
//! opens links through the shell plugin, listens for `deeplink`, and calls
//! the commands below, by these names (Ajaxy/telegram-tt,
//! src/util/tauri/initTauriApi.ts). They are answered so the client works as
//! it expects to; a command it calls that is not here is refused and logged
//! by the client, nothing more. Its update check (`plugin:updater|check`) is
//! refused on purpose: the app's updates are not Telegram's to offer.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use tauri::{AppHandle, WebviewWindow};

use crate::{tray, window};

/// Where the three window buttons sit in the client's header on a Mac: Telegram Air's own numbers.
#[cfg(target_os = "macos")]
pub fn traffic_lights() -> tauri::LogicalPosition<f64> {
    // macOS 26 draws the buttons larger.
    let tall = matches!(os_info::get().version(), os_info::Version::Semantic(major, _, _) if *major >= 26);
    tauri::LogicalPosition::new(26.0, if tall { 50.0 } else { 46.0 })
}

/// The client's header reaching the top of the window, or a plain title bar: it asks for the second during a call.
#[tauri::command]
pub fn mark_title_bar_overlay(window: WebviewWindow, is_overlay: bool, is_mobile: Option<bool>) {
    let _ = (&window, is_overlay, is_mobile);

    #[cfg(target_os = "macos")]
    {
        let style = if is_overlay { tauri::TitleBarStyle::Overlay } else { tauri::TitleBarStyle::Visible };
        let _ = window.set_title_bar_style(style);
    }
}

/// How many chats have something unread, for the tray icon, the Dock and the taskbar.
#[tauri::command]
pub fn set_notifications_count(app: AppHandle, amount: i32, is_muted: bool) {
    tray::unread(&app, amount, is_muted);
}

/// The client's titles name Telegram, and this window is AI Translate's: taken, and not shown.
#[tauri::command]
pub fn set_window_title(title: String) {
    let _ = title;
}

/// "Open in new window" in a chat's menu. Only Telegram's own pages open here.
#[tauri::command]
pub async fn open_new_window_cmd(app: AppHandle, url: String) -> bool {
    window::open(&app, Some(&url), None).is_ok()
}
