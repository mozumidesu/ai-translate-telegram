//! AI Translate, the desktop app: the official Telegram Web A in a window,
//! with this repository's userscript in it. Unofficial.
//!
//! The page is Telegram's own, loaded from web.telegram.org and never changed
//! or shipped here, as Telegram's Telegram Air loads it (Ajaxy/telegram-tt,
//! tauri/). Inside a Tauri window that client knows it has a desktop host and
//! asks it for a few things; `air` answers those. The userscript asks for what
//! a userscript manager gives; `gm` answers those, through the bridge crate,
//! which decides what may be asked. `capabilities/telegram.json` is the whole
//! list of what the page may call.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

mod air;
mod gm;
#[cfg(feature = "probe")]
mod probe;
mod tray;
mod update;
mod window;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use ai_translate_bridge::{hosts::Hosts, store::Store};
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

/// What the commands share: the list of addresses, the stored values, one HTTP client.
pub struct Bridge {
    pub hosts: Hosts,
    pub store: Mutex<Store>,
    pub client: reqwest::Client,
    /// Requests on their way, by window and the script's own number, so one can be given up.
    pub pending: Mutex<HashMap<(String, u64), tokio::sync::oneshot::Sender<()>>>,
}

/// A `tg://` link goes to the client, which reads it as it reads one pressed in a chat.
fn open_link(app: &tauri::AppHandle, link: &url::Url) {
    if link.scheme() != "tg" {
        return;
    }
    if let Some(window) = window::show(app) {
        let _ = window.emit("deeplink", link.as_str());
    }
}

pub fn run() {
    // reqwest is built without a TLS provider of its own; the updater brings the same one.
    let _ = rustls::crypto::ring::default_provider().install_default();

    let app = tauri::Builder::default()
        // First, so a second start hands its link to the app that is running and goes away.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            window::show(app);
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // A window hidden when the app was left must not come back hidden.
                .with_state_flags(tauri_plugin_window_state::StateFlags::all() & !tauri_plugin_window_state::StateFlags::VISIBLE)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            gm::gm_values,
            gm::gm_set_value,
            gm::gm_request,
            gm::gm_abort,
            gm::gm_menu_command,
            update::app_update_check,
            update::app_update_install,
            air::mark_title_bar_overlay,
            air::set_notifications_count,
            air::set_window_title,
            air::open_new_window_cmd,
        ])
        .on_window_event(window::on_event)
        .setup(|app| {
            let data = app.path().app_data_dir()?;
            let version = ai_translate_bridge::version::from_semver(&app.package_info().version.to_string());

            app.manage(Bridge {
                hosts: Hosts::built_in(),
                store: Mutex::new(Store::open(data.join("values.json"))),
                client: reqwest::Client::builder()
                    // An allowed host must not pass a request on to one that is not.
                    .redirect(reqwest::redirect::Policy::none())
                    .connect_timeout(Duration::from_secs(20))
                    .user_agent(format!("AI-Translate/{version} (desktop)"))
                    .build()?,
                pending: Mutex::default(),
            });
            app.manage(tray::Tray::default());

            if let Err(e) = tray::build(app.handle()) {
                // A desktop with no tray is still a desktop: the window is enough.
                log::warn!("no tray icon: {e}");
            }

            // Started by a tg:// link: the client reads it from the address it is opened at.
            let started_by = app.deep_link().get_current().ok().flatten().and_then(|links| links.into_iter().find(|link| link.scheme() == "tg"));
            window::open(app.handle(), None, started_by.as_ref()).map_err(std::io::Error::other)?;

            // An AppImage and a development copy have no installer to register tg:// for them.
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            let _ = app.deep_link().register_all();

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for link in event.urls() {
                    open_link(&handle, &link);
                }
            });

            #[cfg(feature = "probe")]
            probe::listen(app.handle());

            update::at_start(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("AI Translate could not start");

    app.run(|_app, _event| {
        // A click on the Dock icon brings back the window that closing it hid.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = _event {
            window::show(_app);
        }
    });
}
