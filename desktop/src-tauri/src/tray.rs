//! The tray icon: the app's own, a dot on it while something is unread, and a
//! menu with the app's name and whatever the script registered.
//!
//! No word here is the app's own. The first line is the product's name, and
//! the script's lines arrive already in the language of its settings
//! (GM_registerMenuCommand), so the menu has no "Quit": closing the window
//! leaves the app, except on a Mac, where the system's own menu does.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use std::sync::Mutex;

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::window;

const ID: &str = "ai-translate";
const SHOW: &str = "show";

#[cfg(not(target_os = "macos"))]
const PLAIN: &[u8] = include_bytes!("../icons/tray.png");
#[cfg(not(target_os = "macos"))]
const UNREAD: &[u8] = include_bytes!("../icons/tray-unread.png");
/// Black on clear, which the menu bar tints for itself.
#[cfg(target_os = "macos")]
const PLAIN: &[u8] = include_bytes!("../icons/tray-macos.png");
/// The dot Windows draws over the taskbar button.
#[cfg(windows)]
const DOT: &[u8] = include_bytes!("../icons/unread.png");

/// The script registers one line; a page that asks for more is not the script.
const MOST_COMMANDS: u32 = 8;
const LONGEST_NAME: usize = 80;

#[derive(Default)]
pub struct Tray {
    commands: Mutex<Vec<Command>>,
    unread: Mutex<bool>,
}

struct Command {
    window: String,
    id: u32,
    name: String,
}

fn menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    menu.append(&MenuItem::with_id(app, SHOW, window::TITLE, true, None::<&str>)?)?;

    if let Ok(commands) = app.state::<Tray>().commands.lock() {
        for command in commands.iter() {
            menu.append(&MenuItem::with_id(app, format!("command:{}:{}", command.id, command.window), &command.name, true, None::<&str>)?)?;
        }
    }
    Ok(menu)
}

fn redraw(app: &AppHandle) {
    if let (Some(tray), Ok(menu)) = (app.tray_by_id(ID), menu(app)) {
        let _ = tray.set_menu(Some(menu));
    }
}

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let tray = TrayIconBuilder::with_id(ID)
        .icon(Image::from_bytes(PLAIN)?)
        .tooltip(window::TITLE)
        .menu(&menu(app)?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| pressed(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                window::show(tray.app_handle());
            }
        });

    #[cfg(target_os = "macos")]
    let tray = tray.icon_as_template(true);

    tray.build(app)?;
    Ok(())
}

fn pressed(app: &AppHandle, id: &str) {
    if id == SHOW {
        window::show(app);
        return;
    }

    // "command:<number>:<window>", as menu() names them.
    let Some((number, label)) = id.strip_prefix("command:").and_then(|rest| rest.split_once(':')) else { return };
    let Ok(number) = number.parse::<u32>() else { return };
    let Some(window) = app.get_webview_window(label) else { return };

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
    let _ = window.eval(format!("window.__AI_TRANSLATE_APP__&&window.__AI_TRANSLATE_APP__.menu({number})"));
}

/// A line the script asked for, or the same line with new words.
pub fn command(app: &AppHandle, window: &str, id: u32, name: &str) -> Result<(), String> {
    let name = name.trim();
    let fits = (1..=MOST_COMMANDS).contains(&id) && !name.is_empty() && name.chars().count() <= LONGEST_NAME && !name.chars().any(char::is_control);
    if !fits {
        return Err("not a line for the menu".into());
    }

    {
        let tray = app.state::<Tray>();
        let mut commands = tray.commands.lock().map_err(|e| e.to_string())?;
        match commands.iter_mut().find(|command| command.window == window && command.id == id) {
            Some(command) => command.name = name.to_owned(),
            None => commands.push(Command { window: window.to_owned(), id, name: name.to_owned() }),
        }
    }

    redraw(app);
    Ok(())
}

/// The lines of a window that closed, or of a page that was left.
pub fn forget(app: &AppHandle, window: &str) {
    let Some(tray) = app.try_state::<Tray>() else { return };

    let changed = match tray.commands.lock() {
        Ok(mut commands) => {
            let before = commands.len();
            commands.retain(|command| command.window != window);
            commands.len() != before
        }
        Err(_) => false,
    };
    if changed {
        redraw(app);
    }
}

/// Something unread that is not muted: a dot on the tray icon, the count on the Dock, a dot on the taskbar button.
pub fn unread(app: &AppHandle, amount: i32, muted: bool) {
    let some = amount > 0 && !muted;

    #[cfg(target_os = "macos")]
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_badge_count(some.then_some(i64::from(amount)));
    }

    let tray = app.state::<Tray>();
    let Ok(mut shown) = tray.unread.lock() else { return };
    if *shown == some {
        return;
    }
    *shown = some;

    #[cfg(not(target_os = "macos"))]
    if let Some(icon) = app.tray_by_id(ID) {
        let _ = icon.set_icon(Image::from_bytes(if some { UNREAD } else { PLAIN }).ok());
    }

    #[cfg(windows)]
    for window in app.webview_windows().values() {
        let _ = window.set_overlay_icon(if some { Image::from_bytes(DOT).ok() } else { None });
    }
}
