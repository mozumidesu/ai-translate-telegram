//! What the userscript asks of a userscript manager, answered by the app.
//!
//! desktop/shim.js turns GM_xmlhttpRequest, GM_getValue, GM_setValue and
//! GM_registerMenuCommand into these commands. Telegram's page can call them
//! too, so each does only what the script needs: a request to an address on
//! the list (bridge/src/hosts.rs), the script's own values (bridge/src/store.rs),
//! a line in the tray menu.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use std::collections::HashMap;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager, State, Webview};

use crate::{tray, Bridge};

/// A translation takes seconds. Past this nobody is waiting any more.
const LONGEST: Duration = Duration::from_secs(120);
/// A feedback report carries screenshots; nothing else comes near this.
const LARGEST_SENT: usize = 32 * 1024 * 1024;
const LARGEST_ANSWER: usize = 16 * 1024 * 1024;

/// Every stored value, by name, as GM_getValue reads them.
#[tauri::command]
pub fn gm_values(bridge: State<'_, Bridge>) -> Result<Value, String> {
    Ok(bridge.store.lock().map_err(|e| e.to_string())?.as_value())
}

/// GM_setValue: one value replaced, and every other window told to read again.
#[tauri::command]
pub fn gm_set_value(app: AppHandle, webview: Webview, bridge: State<'_, Bridge>, name: String, value: Value) -> Result<(), String> {
    bridge.store.lock().map_err(|e| e.to_string())?.set(&name, value).map_err(|e| e.to_string())?;

    for (label, other) in app.webview_windows() {
        if label != webview.label() {
            let _ = other.eval("window.__AI_TRANSLATE_APP__&&window.__AI_TRANSLATE_APP__.changed()");
        }
    }
    Ok(())
}

#[derive(Deserialize)]
pub struct Request {
    id: u64,
    url: String,
    method: String,
    #[serde(default)]
    headers: HashMap<String, String>,
    body: Option<String>,
    /// Milliseconds, or 0 for the app's own limit.
    #[serde(default)]
    timeout: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Answer {
    status: u16,
    status_text: String,
    /// One `name: value` a line, as a userscript manager reports them.
    headers: String,
    text: String,
    url: String,
}

/// What a request may not set for itself: where it goes and how it is framed.
fn is_ours_to_set(header: &str) -> bool {
    let header = header.to_ascii_lowercase();
    matches!(header.as_str(), "host" | "content-length" | "connection" | "transfer-encoding" | "upgrade" | "te" | "trailer" | "keep-alive")
        || header.starts_with("proxy-")
}

/// GM_xmlhttpRequest: one request, from here and not from the page, so the
/// page's CORS and CSP do not apply. Fails with "aborted", "timeout", or why.
#[tauri::command]
pub async fn gm_request(webview: Webview, bridge: State<'_, Bridge>, request: Request) -> Result<Answer, String> {
    let values = bridge.store.lock().map_err(|e| e.to_string())?.as_value();
    let url = bridge.hosts.permits(&request.url, &values).map_err(|e| e.to_string())?;

    let method = match request.method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        other => return Err(format!("{other} is not a method the script uses")),
    };
    if request.body.as_ref().is_some_and(|body| body.len() > LARGEST_SENT) {
        return Err("too much to send".into());
    }

    let limit = match request.timeout {
        0 => LONGEST,
        ms => LONGEST.min(Duration::from_millis(ms)),
    };

    let mut ask = bridge.client.request(method, url).timeout(limit);
    for (header, value) in &request.headers {
        if !is_ours_to_set(header) {
            ask = ask.header(header, value);
        }
    }
    if let Some(body) = request.body {
        ask = ask.body(body);
    }

    let key = (webview.label().to_owned(), request.id);
    let (stop, stopped) = tokio::sync::oneshot::channel();
    bridge.pending.lock().map_err(|e| e.to_string())?.insert(key.clone(), stop);

    let outcome = tokio::select! {
        answer = exchange(ask) => answer,
        // Sent by gm_abort, or dropped with the window.
        _ = stopped => Err("aborted".into()),
    };

    if let Ok(mut pending) = bridge.pending.lock() {
        pending.remove(&key);
    }
    outcome
}

async fn exchange(ask: reqwest::RequestBuilder) -> Result<Answer, String> {
    let said = |e: reqwest::Error| if e.is_timeout() { "timeout".to_owned() } else { e.without_url().to_string() };

    let mut response = ask.send().await.map_err(said)?;

    let status = response.status();
    let url = response.url().to_string();
    let headers = response.headers().iter().map(|(name, value)| format!("{}: {}\r\n", name, String::from_utf8_lossy(value.as_bytes()))).collect::<String>();

    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(said)? {
        if bytes.len() + chunk.len() > LARGEST_ANSWER {
            return Err("too large an answer".into());
        }
        bytes.extend_from_slice(&chunk);
    }

    Ok(Answer {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_owned(),
        headers,
        text: String::from_utf8_lossy(&bytes).into_owned(),
        url,
    })
}

/// The handle's abort(): the request, if it is still on its way, ends as "aborted".
#[tauri::command]
pub fn gm_abort(webview: Webview, bridge: State<'_, Bridge>, id: u64) {
    if let Ok(mut pending) = bridge.pending.lock() {
        if let Some(stop) = pending.remove(&(webview.label().to_owned(), id)) {
            let _ = stop.send(());
        }
    }
}

/// GM_registerMenuCommand: the script's line in the tray menu, in the script's own words.
#[tauri::command]
pub fn gm_menu_command(app: AppHandle, webview: Webview, id: u32, name: String) -> Result<(), String> {
    tray::command(&app, webview.label(), id, &name)
}
