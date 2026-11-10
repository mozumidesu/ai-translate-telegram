//! The window: Telegram's own page, and the userscript in front of it.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use std::sync::atomic::{AtomicU32, Ordering};

use serde_json::json;
use tauri::webview::{DownloadEvent, NewWindowResponse, PageLoadEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Window, WindowEvent};
use tauri_plugin_shell::ShellExt;
use url::Url;

use crate::{tray, Bridge};

/// The official client, on Telegram's own server. Nothing of it is in this repository.
pub const HOME: &str = "https://web.telegram.org/a/";

/// The window's name is the app's. The client's own titles name Telegram, and this is not Telegram's app.
pub const TITLE: &str = "AI Translate";

/// The userscript as the app runs it, a function that takes what the app knows: desktop/assemble.mjs.
const INJECT: &str = include_str!("../../gen/inject.js");

/// The first window is `main`; one the client opens beside it is numbered.
static OPENED: AtomicU32 = AtomicU32::new(0);
const MOST: usize = 8;

pub fn is_telegram(url: &Url) -> bool {
    url.scheme() == "https" && url.host_str() == Some("web.telegram.org") && url.port_or_known_default() == Some(443)
}

/// A page elsewhere belongs in the person's browser, not in this window.
fn open_elsewhere(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "http" | "https" | "mailto" | "tel") {
        #[allow(deprecated)]
        let _ = app.shell().open(url.as_str(), None);
    }
}

/// Opens a window at `address`, which must be Telegram's, or at the client's
/// start. `link` is a `tg://` link the client reads as it starts.
pub fn open(app: &AppHandle, address: Option<&str>, link: Option<&Url>) -> Result<WebviewWindow, String> {
    let home = Url::parse(HOME).map_err(|e| e.to_string())?;
    let mut url = match address {
        Some(address) => home.join(address).map_err(|e| e.to_string())?,
        None => home,
    };
    if !is_telegram(&url) {
        return Err(format!("{url} is not Telegram's"));
    }
    if let Some(link) = link {
        // As t.me hands a link to the web client: in the hash, as tgaddr.
        url.set_fragment(Some(&format!("?tgaddr={}", url::form_urlencoded::byte_serialize(link.as_str().as_bytes()).collect::<String>())));
    }

    // "Open in new window" is pressed by a person, a few times. A page that asks without end is not answered.
    if app.webview_windows().len() >= MOST {
        return Err("as many windows as there may be are open".into());
    }

    let label = match OPENED.fetch_add(1, Ordering::Relaxed) {
        0 => "main".to_owned(),
        n => format!("window-{n}"),
    };

    // The values as they are now; the shim asks again once the page is up, since a reload gets these same ones.
    let values = app.state::<Bridge>().store.lock().map_err(|e| e.to_string())?.as_value();
    let script = format!("{INJECT}({});", json!({ "values": values }));

    let navigating = app.clone();
    let loading = app.clone();
    let asking = app.clone();

    let builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url)).title(TITLE).inner_size(1088.0, 700.0).min_inner_size(360.0, 200.0);

    // A test's own layer goes under the script's, so it is added first.
    #[cfg(feature = "probe")]
    let builder = crate::probe::attach(builder);

    let builder = builder
        // Before the page's own code, in the page itself and never in a frame.
        .initialization_script(script)
        // WebView2's own defaults, which giving any argument drops, and sound for a message that arrives unasked.
        .additional_browser_args("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required")
        // Otherwise a file dropped on a chat never reaches the page on Windows.
        .disable_drag_drop_handler()
        .on_navigation(move |url| {
            // Frames pass through here too on macOS and Linux, and a bot's web app is a frame: any web page may load.
            if matches!(url.scheme(), "http" | "https" | "about" | "blob" | "data") {
                return true;
            }
            open_elsewhere(&navigating, url);
            false
        })
        .on_page_load(move |window, payload| {
            if payload.event() != PageLoadEvent::Started {
                #[cfg(feature = "probe")]
                crate::probe::loaded(&window);
                return;
            }
            // Whatever the page before had put in the tray menu went with it.
            tray::forget(&loading, window.label());

            // The window itself is for Telegram: anything else goes to the browser, and the window goes home.
            let url = payload.url();
            if matches!(url.scheme(), "http" | "https") && !is_telegram(url) {
                open_elsewhere(&loading, url);
                if let Ok(home) = Url::parse(HOME) {
                    let _ = window.navigate(home);
                }
            }
        })
        .on_new_window(move |url, _features| {
            let app = asking.clone();
            // Not from inside this callback: making a window here deadlocks on Windows.
            tauri::async_runtime::spawn(async move {
                if is_telegram(&url) {
                    let _ = open(&app, Some(url.as_str()), None);
                } else {
                    open_elsewhere(&app, &url);
                }
            });
            NewWindowResponse::Deny
        })
        .on_download(|webview, event| {
            match event {
                #[allow(unused_variables)]
                DownloadEvent::Requested { destination, .. } => {
                    // WKWebView does not choose a place for a download by itself.
                    #[cfg(target_os = "macos")]
                    if let (Some(name), Ok(downloads)) = (destination.file_name(), webview.app_handle().path().download_dir()) {
                        *destination = downloads.join(name);
                    }
                }
                // The client waits for this to say a download failed.
                DownloadEvent::Finished { url, success, .. } => {
                    let _ = webview.emit_to(webview.label(), "download-finished", json!({ "url": url.to_string(), "success": success }));
                }
                _ => {}
            }
            true
        });

    // The client draws its header up to the top of the window on a Mac, and leaves room for the three buttons.
    #[cfg(target_os = "macos")]
    let builder = builder.title_bar_style(tauri::TitleBarStyle::Overlay).hidden_title(true).traffic_light_position(crate::air::traffic_lights());

    builder.build().map_err(|e| e.to_string())
}

/// The window in front of the person: shown, restored, focused. The first one there is, `main` before any other.
pub fn show(app: &AppHandle) -> Option<WebviewWindow> {
    let windows = app.webview_windows();
    let window = windows.get("main").or_else(|| windows.values().next())?.clone();

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
    Some(window)
}

pub fn on_event(window: &Window, event: &WindowEvent) {
    match event {
        // A Mac app stays when its last window is closed, and its Dock icon brings the window back.
        #[cfg(target_os = "macos")]
        WindowEvent::CloseRequested { api, .. } => {
            if window.app_handle().webview_windows().len() == 1 {
                let _ = window.app_handle().hide();
                api.prevent_close();
            }
        }
        WindowEvent::Destroyed => {
            let app = window.app_handle();
            tray::forget(app, window.label());
            if let Ok(mut pending) = app.state::<Bridge>().pending.lock() {
                // Dropping the sender gives each request up.
                pending.retain(|(label, _), _| label != window.label());
            }
        }
        _ => {}
    }
}
