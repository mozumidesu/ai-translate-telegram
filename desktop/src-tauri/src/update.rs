//! Updates: a newer release from this repository's GitHub releases, checked
//! against the app's own signing key before it is put in.
//!
//! The Tauri updater reads `latest.json` from the latest release
//! (tauri.conf.json has the address and the public key; the private one is a
//! repository secret the release workflow signs with). The app looks once as
//! it starts, and the script's Check for updates asks through the two
//! commands here, in place of a userscript manager.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use std::sync::atomic::{AtomicBool, Ordering};

use ai_translate_bridge::version::from_semver;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

/// One install at a time, whoever asked.
static INSTALLING: AtomicBool = AtomicBool::new(false);

async fn newer(app: &AppHandle) -> Result<Option<Update>, String> {
    app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())
}

async fn install(app: &AppHandle, update: Update) -> Result<(), String> {
    if INSTALLING.swap(true, Ordering::SeqCst) {
        return Err("an update is being installed already".into());
    }

    let done = update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string());
    INSTALLING.store(false, Ordering::SeqCst);
    done?;

    // On Windows the installer has ended the app by now and starts it again itself.
    app.restart()
}

/// The version of a newer release, written as the script writes versions, or nothing.
#[tauri::command]
pub async fn app_update_check(app: AppHandle) -> Result<Option<String>, String> {
    Ok(newer(&app).await?.map(|update| from_semver(&update.version)))
}

/// Puts the newer release in and starts the app again. Comes back only when there was nothing to install, or it failed.
#[tauri::command]
pub async fn app_update_install(app: AppHandle) -> Result<(), String> {
    match newer(&app).await? {
        Some(update) => install(&app, update).await,
        None => Ok(()),
    }
}

/// Once, as the app starts: a newer release is installed and the app starts again as it.
pub fn at_start(app: &AppHandle) {
    // A development copy is not a release, and a test says so with the variable.
    if cfg!(debug_assertions) || std::env::var_os("AI_TRANSLATE_NO_UPDATE").is_some() {
        return;
    }
    // A .deb is installed with the system's password: asked for on a press of Update now, never unasked.
    #[cfg(target_os = "linux")]
    if matches!(tauri::utils::platform::bundle_type(), Some(tauri::utils::config::BundleType::Deb | tauri::utils::config::BundleType::Rpm)) {
        return;
    }

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let Ok(Some(update)) = newer(&app).await else { return };

        // A release that would not install is not tried again at every start: Check for updates still offers it.
        if let Ok(folder) = app.path().app_data_dir() {
            let tried = folder.join("update-tried");
            if std::fs::read_to_string(&tried).is_ok_and(|version| version == update.version) {
                return;
            }
            let _ = std::fs::create_dir_all(&folder);
            let _ = std::fs::write(&tried, &update.version);
        }

        if let Err(e) = install(&app, update).await {
            log::warn!("the update was not installed: {e}");
        }
    });
}
