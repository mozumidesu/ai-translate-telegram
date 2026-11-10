//! Which addresses a request from the page may go to.
//!
//! A userscript manager asks its owner before the script talks to a new
//! address. The app has nobody to ask at that moment, so the list is fixed:
//! the providers the core knows (ai-translate/core/providers.ts), the address
//! the person typed for an OpenAI-compatible provider, the script's header on
//! GitHub for the update check, and the feedback relay. `desktop/hosts.json`
//! holds the fixed part, and test/desktop.mjs holds it to the sources.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use std::fmt;

use serde::Deserialize;
use serde_json::Value;
use url::Url;

/// The fixed part of the list, as `desktop/hosts.json` has it.
#[derive(Debug, Deserialize)]
pub struct Hosts {
    providers: Vec<String>,
    update: Under,
    feedback: String,
}

/// A host that serves many people's files, and the folder that is ours.
#[derive(Debug, Deserialize)]
struct Under {
    host: String,
    under: String,
}

/// Why a request was not sent.
#[derive(Debug, PartialEq, Eq)]
pub enum Refusal {
    NotAnAddress,
    NotHttps,
    Credentials,
    NotAllowed(String),
}

impl fmt::Display for Refusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotAnAddress => write!(f, "not an http or https address"),
            Self::NotHttps => write!(f, "only https goes to this host"),
            Self::Credentials => write!(f, "an address with a user name in it is not asked"),
            Self::NotAllowed(host) => write!(f, "{host} is not an address AI Translate talks to"),
        }
    }
}

impl Hosts {
    /// The list the app is built with.
    pub fn built_in() -> Self {
        serde_json::from_str(include_str!("../../hosts.json")).expect("desktop/hosts.json is not what Hosts reads")
    }

    /// The address parsed, when a request may go to it. `values` is what the
    /// storage holds, for the address the person typed themselves.
    pub fn permits(&self, address: &str, values: &Value) -> Result<Url, Refusal> {
        let url = Url::parse(address.trim()).map_err(|_| Refusal::NotAnAddress)?;
        if !matches!(url.scheme(), "http" | "https") {
            return Err(Refusal::NotAnAddress);
        }
        let host = url.host_str().ok_or(Refusal::NotAnAddress)?.to_owned();
        if !url.username().is_empty() || url.password().is_some() {
            return Err(Refusal::Credentials);
        }

        // The person's own address first: it may be http, on this machine.
        if base_urls(values).iter().any(|base| is_under(&url, base)) {
            return Ok(url);
        }

        let ours = self.providers.contains(&host) || host == self.feedback || (host == self.update.host && url.path().starts_with(&self.update.under));
        if !ours {
            return Err(Refusal::NotAllowed(host));
        }
        if url.scheme() != "https" || url.port_or_known_default() != Some(443) {
            return Err(Refusal::NotHttps);
        }

        Ok(url)
    }
}

/// Whether `url` is at `base` or below it: the same scheme, host and port, and a path that starts with the base's.
fn is_under(url: &Url, base: &Url) -> bool {
    if url.scheme() != base.scheme() || url.host() != base.host() || url.port_or_known_default() != base.port_or_known_default() {
        return false;
    }

    let folder = base.path().trim_end_matches('/');
    match url.path().strip_prefix(folder) {
        Some(rest) => rest.is_empty() || rest.starts_with('/'),
        None => false,
    }
}

/// Every OpenAI-compatible address in the settings: the one from before the
/// provider list (`baseUrl`) and each slot's own (`baseUrls`, inside
/// `providerSlots`, which the core keeps as JSON in a string).
pub fn base_urls(values: &Value) -> Vec<Url> {
    let mut found = Vec::new();
    collect(values, &mut found, 0);
    found
}

fn collect(value: &Value, found: &mut Vec<Url>, depth: usize) {
    // Settings are a few levels deep; anything deeper is not settings.
    if depth > 8 {
        return;
    }

    match value {
        Value::Array(items) => items.iter().for_each(|item| collect(item, found, depth + 1)),
        Value::Object(fields) => {
            for (name, field) in fields {
                match (name.as_str(), field) {
                    ("baseUrl", Value::String(address)) => add(address, found),
                    ("baseUrls", Value::Object(addresses)) => addresses.values().filter_map(Value::as_str).for_each(|address| add(address, found)),
                    ("providerSlots", Value::String(json)) => {
                        if let Ok(slots) = serde_json::from_str::<Value>(json) {
                            collect(&slots, found, depth + 1);
                        }
                    }
                    _ => collect(field, found, depth + 1),
                }
            }
        }
        _ => {}
    }
}

fn add(address: &str, found: &mut Vec<Url>) {
    let Ok(url) = Url::parse(address.trim()) else { return };
    let usable = matches!(url.scheme(), "http" | "https") && url.host_str().is_some() && url.username().is_empty() && url.password().is_none();
    if usable && !found.contains(&url) {
        found.push(url);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn none() -> Value {
        json!({})
    }

    fn with_base(base: &str) -> Value {
        json!({ "aiTranslateSettings": { "baseUrl": base } })
    }

    #[test]
    fn the_providers_the_core_knows_are_asked() {
        let hosts = Hosts::built_in();
        for address in [
            "https://api.groq.com/openai/v1/chat/completions",
            "https://api.groq.com/openai/v1/models",
            "https://api.z.ai/api/paas/v4/chat/completions",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models",
            "https://api.anthropic.com/v1/messages",
            "https://api.anthropic.com/v1/models",
        ] {
            assert!(hosts.permits(address, &none()).is_ok(), "{address}");
        }
    }

    #[test]
    fn the_update_check_reads_this_repository_only() {
        let hosts = Hosts::built_in();
        assert!(hosts
            .permits("https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram/main/dist/ai-translate.meta.js?1731240000000", &none())
            .is_ok());
        assert_eq!(
            hosts.permits("https://raw.githubusercontent.com/someone/else/main/file.js", &none()),
            Err(Refusal::NotAllowed("raw.githubusercontent.com".into()))
        );
        assert!(hosts.permits("https://raw.githubusercontent.com/mozumidesu/ai-translate-telegram-evil/main/x", &none()).is_err());
    }

    #[test]
    fn the_feedback_relay_is_asked() {
        assert!(Hosts::built_in().permits("https://ai-translate-feedback.mozumidesu.workers.dev", &none()).is_ok());
    }

    #[test]
    fn nothing_else_is() {
        let hosts = Hosts::built_in();
        for address in [
            "https://example.com/",
            "https://web.telegram.org/a/",
            "https://api.telegram.org/bot123/sendMessage",
            "https://groq.com/",
            "https://evil.api.groq.com/",
            "https://api.groq.com.evil.example/openai/v1/models",
            "https://api.groq.com./openai/v1/models",
            "https://xn--pi-groq-9ya.com/",
            "https://127.0.0.1/",
            "https://localhost:11434/v1/models",
            "https://169.254.169.254/latest/meta-data/",
            "https://mozumidesu.workers.dev/",
        ] {
            assert!(matches!(hosts.permits(address, &none()), Err(Refusal::NotAllowed(_))), "{address}");
        }
    }

    #[test]
    fn a_fixed_host_is_asked_over_https_on_its_own_port() {
        let hosts = Hosts::built_in();
        assert_eq!(hosts.permits("http://api.groq.com/openai/v1/models", &none()), Err(Refusal::NotHttps));
        assert_eq!(hosts.permits("https://api.groq.com:8443/openai/v1/models", &none()), Err(Refusal::NotHttps));
        assert!(hosts.permits("https://api.groq.com:443/openai/v1/models", &none()).is_ok());
    }

    #[test]
    fn what_is_not_an_address_is_not_asked() {
        let hosts = Hosts::built_in();
        for address in ["", "api.groq.com", "file:///etc/passwd", "ftp://api.groq.com/", "javascript:alert(1)", "data:text/plain,hi", "//api.groq.com/"] {
            assert_eq!(hosts.permits(address, &none()), Err(Refusal::NotAnAddress), "{address}");
        }
    }

    #[test]
    fn a_name_in_front_of_the_host_does_not_pass_for_it() {
        let hosts = Hosts::built_in();
        assert_eq!(hosts.permits("https://api.groq.com@evil.example/", &none()), Err(Refusal::Credentials));
        assert_eq!(hosts.permits("https://user:secret@api.groq.com/openai/v1/models", &none()), Err(Refusal::Credentials));
        // A backslash is a slash to a browser and to this parser alike: the host stays Groq's.
        let url = hosts.permits("https://api.groq.com\\@evil.example/", &none()).unwrap();
        assert_eq!(url.host_str(), Some("api.groq.com"));
    }

    #[test]
    fn the_address_the_person_typed_is_asked_at_and_below_it() {
        let hosts = Hosts::built_in();
        let values = with_base("https://openrouter.ai/api/v1/");
        assert!(hosts.permits("https://openrouter.ai/api/v1/chat/completions", &values).is_ok());
        assert!(hosts.permits("https://openrouter.ai/api/v1/models", &values).is_ok());
        assert!(hosts.permits("https://openrouter.ai/api/v1", &values).is_ok());
        assert!(hosts.permits("https://openrouter.ai/api/v10/models", &values).is_err());
        assert!(hosts.permits("https://openrouter.ai/other", &values).is_err());
        assert!(hosts.permits("http://openrouter.ai/api/v1/models", &values).is_err());
        assert!(hosts.permits("https://openrouter.ai:8443/api/v1/models", &values).is_err());
        assert!(hosts.permits("https://sub.openrouter.ai/api/v1/models", &values).is_err());
    }

    #[test]
    fn a_model_on_this_machine_is_asked_over_http() {
        let hosts = Hosts::built_in();
        let values = with_base("http://localhost:11434/v1");
        assert!(hosts.permits("http://localhost:11434/v1/chat/completions", &values).is_ok());
        assert!(hosts.permits("http://localhost:11435/v1/chat/completions", &values).is_err());
        assert!(hosts.permits("http://localhost/v1/chat/completions", &values).is_err());
    }

    #[test]
    fn an_address_with_no_folder_covers_its_host() {
        let hosts = Hosts::built_in();
        let values = with_base("https://llm.example.org");
        assert!(hosts.permits("https://llm.example.org/chat/completions", &values).is_ok());
        assert!(hosts.permits("https://llm.example.org.evil.example/chat/completions", &values).is_err());
    }

    #[test]
    fn every_slot_has_an_address_of_its_own() {
        let slots = json!([
            { "id": "a", "provider": "groq", "keys": { "groq": "k" }, "models": {} },
            { "id": "b", "provider": "openai", "keys": {}, "models": {}, "baseUrls": { "openai": "https://one.example/v1" } },
            { "id": "c", "provider": "openai", "keys": {}, "models": {}, "baseUrls": { "openai": "http://127.0.0.1:1234/v1/" } }
        ]);
        let values = json!({ "aiTranslateSettings": { "baseUrl": "", "providerSlots": slots.to_string() } });

        let found: Vec<String> = base_urls(&values).iter().map(Url::to_string).collect();
        assert_eq!(found, ["https://one.example/v1", "http://127.0.0.1:1234/v1/"]);

        let hosts = Hosts::built_in();
        assert!(hosts.permits("https://one.example/v1/models", &values).is_ok());
        assert!(hosts.permits("http://127.0.0.1:1234/v1/chat/completions", &values).is_ok());
        assert!(hosts.permits("https://two.example/v1/models", &values).is_err());
    }

    #[test]
    fn what_is_typed_elsewhere_in_the_settings_opens_nothing() {
        let values = json!({ "aiTranslateSettings": {
            "extraInstructions": "https://evil.example/",
            "glossary": "https://evil.example/",
            "baseUrl": "not an address",
            "providerSlots": "not json"
        } });
        assert!(base_urls(&values).is_empty());
        assert!(Hosts::built_in().permits("https://evil.example/", &values).is_err());
    }

    #[test]
    fn a_typed_address_with_a_name_in_it_opens_nothing() {
        let values = with_base("https://user:secret@llm.example.org/v1");
        assert!(base_urls(&values).is_empty());
    }

    /// What the core itself saves, written by test/desktop.mjs from core/slots.ts.
    #[test]
    fn the_cores_own_settings_are_read() {
        let values: Value = serde_json::from_str(include_str!("../tests/settings.json")).unwrap();
        let found: Vec<String> = base_urls(&values).iter().map(Url::to_string).collect();
        assert_eq!(found, ["https://openrouter.ai/api/v1", "http://localhost:11434/v1"]);
    }
}
