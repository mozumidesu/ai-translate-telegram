//! Only in a build made with `--features probe`, which no release is.
//!
//! test/app.mjs starts such a build under a display nobody watches and has to
//! learn what happened inside the page. It names three files in the
//! environment: a script to run before the userscript, as the bottom layer
//! (it counts what reaches Telegram's worker), a script to run once the page
//! has loaded, and where to write what that one reports. The report leaves
//! the page as an event, which the capability lets the page emit already.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use tauri::{AppHandle, Listener, WebviewWindow, WebviewWindowBuilder, Wry};

const REPORT: &str = "ai-translate-probe";

fn script(variable: &str) -> Option<String> {
    std::fs::read_to_string(std::env::var_os(variable)?).ok()
}

pub fn attach<'a>(mut builder: WebviewWindowBuilder<'a, Wry, AppHandle>) -> WebviewWindowBuilder<'a, Wry, AppHandle> {
    if let Some(before) = script("AI_TRANSLATE_PROBE_BEFORE") {
        builder = builder.initialization_script(before);
    }
    // A sandbox that reaches the internet through a proxy only.
    if let Some(proxy) = std::env::var("AI_TRANSLATE_PROBE_PROXY").ok().and_then(|proxy| proxy.parse().ok()) {
        builder = builder.proxy_url(proxy);
    }
    builder
}

/// What the page reports, written where the test looks: beside the file first, so it is never read half written.
pub fn listen(app: &AppHandle) {
    app.listen_any(REPORT, |event| {
        let Some(out) = std::env::var_os("AI_TRANSLATE_PROBE_OUT").map(std::path::PathBuf::from) else { return };
        let fresh = out.with_extension("new");
        if std::fs::write(&fresh, event.payload()).is_ok() {
            let _ = std::fs::rename(fresh, out);
        }
    });
}

pub fn loaded(window: &WebviewWindow) {
    if let Some(after) = script("AI_TRANSLATE_PROBE_AFTER") {
        let _ = window.eval(after);
    }
}
