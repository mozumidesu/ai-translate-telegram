//! What GM_getValue and GM_setValue keep: one file in the app's data folder.
//!
//! A userscript manager keeps a script's values in its own storage. Here they
//! are a JSON file, `values.json`, readable by this user only. The API keys
//! are in it, among the settings, so the page is given no way to it but the
//! script's own: every value by name, and one value replaced. No path ever
//! comes from the page.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

use std::fmt;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};

/// The script keeps one value today. Room for a few more, and no more than that.
pub const MOST_NAMES: usize = 16;
pub const LONGEST_NAME: usize = 64;
/// Settings and fifty corrections are some kilobytes. This is the whole file.
pub const LARGEST: usize = 2 * 1024 * 1024;

#[derive(Debug)]
pub enum Refused {
    Name,
    TooMany,
    TooLarge,
    Disk(io::Error),
}

impl fmt::Display for Refused {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Name => write!(f, "a value's name is up to {LONGEST_NAME} letters, digits, dots, dashes and underscores"),
            Self::TooMany => write!(f, "no more than {MOST_NAMES} values are kept"),
            Self::TooLarge => write!(f, "the values would not fit in {LARGEST} bytes"),
            Self::Disk(e) => write!(f, "the values could not be written: {e}"),
        }
    }
}

pub struct Store {
    path: PathBuf,
    values: Map<String, Value>,
}

impl Store {
    /// What the file holds. A missing one is empty; one that cannot be read is
    /// put aside as `values.json.bad`, never written over, since the keys are in it.
    pub fn open(path: impl Into<PathBuf>) -> Self {
        let path = path.into();
        let values = match fs::read(&path) {
            Ok(bytes) => match serde_json::from_slice::<Map<String, Value>>(&bytes) {
                Ok(values) => values,
                Err(_) => {
                    let _ = fs::rename(&path, aside(&path, "bad"));
                    Map::new()
                }
            },
            Err(_) => Map::new(),
        };

        Self { path, values }
    }

    pub fn values(&self) -> &Map<String, Value> {
        &self.values
    }

    /// Every value as one JSON object, for the page and for `Hosts::permits`.
    pub fn as_value(&self) -> Value {
        Value::Object(self.values.clone())
    }

    /// Replaces one value and writes the file. Nothing changes when it is refused.
    pub fn set(&mut self, name: &str, value: Value) -> Result<(), Refused> {
        let named = !name.is_empty() && name.len() <= LONGEST_NAME && name.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'));
        if !named {
            return Err(Refused::Name);
        }
        if !self.values.contains_key(name) && self.values.len() >= MOST_NAMES {
            return Err(Refused::TooMany);
        }

        let mut next = self.values.clone();
        next.insert(name.to_owned(), value);

        let bytes = serde_json::to_vec_pretty(&next).map_err(|e| Refused::Disk(e.into()))?;
        if bytes.len() > LARGEST {
            return Err(Refused::TooLarge);
        }

        write(&self.path, &bytes).map_err(Refused::Disk)?;
        self.values = next;
        Ok(())
    }
}

fn aside(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.file_name().unwrap_or_default().to_os_string();
    name.push(".");
    name.push(suffix);
    path.with_file_name(name)
}

/// Written beside the file and moved over it, so a crash halfway leaves the old one whole.
fn write(path: &Path, bytes: &[u8]) -> io::Result<()> {
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder)?;
    }

    let fresh = aside(path, "new");
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        // The keys are in it: this user's eyes only.
        options.mode(0o600);
    }

    let mut file = options.open(&fresh)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    drop(file);

    fs::rename(&fresh, path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn folder(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("ai-translate-bridge-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        path
    }

    #[test]
    fn nothing_saved_is_nothing() {
        let store = Store::open(folder("empty").join("values.json"));
        assert!(store.values().is_empty());
        assert_eq!(store.as_value(), json!({}));
    }

    #[test]
    fn a_value_set_is_there_after_the_app_starts_again() {
        let path = folder("kept").join("deeper").join("values.json");
        let mut store = Store::open(&path);
        store.set("aiTranslateSettings", json!({ "groqApiKey": "gsk_test", "sentLanguage": "English" })).unwrap();
        store.set("aiTranslateSettings", json!({ "groqApiKey": "gsk_test", "sentLanguage": "Spanish" })).unwrap();

        let again = Store::open(&path);
        assert_eq!(again.as_value(), json!({ "aiTranslateSettings": { "groqApiKey": "gsk_test", "sentLanguage": "Spanish" } }));
        assert!(!aside(&path, "new").exists());
    }

    #[cfg(unix)]
    #[test]
    fn the_file_is_this_users_only() {
        use std::os::unix::fs::PermissionsExt;
        let path = folder("mode").join("values.json");
        Store::open(&path).set("aiTranslateSettings", json!({})).unwrap();
        assert_eq!(fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o600);
    }

    #[test]
    fn a_name_is_never_a_path() {
        let path = folder("names").join("values.json");
        let mut store = Store::open(&path);
        for name in ["", "../values", "a/b", "a\\b", "C:evil", "name with space", "ключ", &"x".repeat(LONGEST_NAME + 1)] {
            assert!(matches!(store.set(name, json!(1)), Err(Refused::Name)), "{name}");
        }
        assert!(store.values().is_empty());
        assert!(!path.exists());
    }

    #[test]
    fn only_so_many_values_and_only_so_large() {
        let path = folder("limits").join("values.json");
        let mut store = Store::open(&path);
        for n in 0..MOST_NAMES {
            store.set(&format!("value{n}"), json!(n)).unwrap();
        }
        assert!(matches!(store.set("one-more", json!(1)), Err(Refused::TooMany)));
        // One that is there already can still change.
        store.set("value0", json!("changed")).unwrap();

        assert!(matches!(store.set("value1", json!("x".repeat(LARGEST))), Err(Refused::TooLarge)));
        assert_eq!(Store::open(&path).values()["value1"], json!(1));
    }

    #[test]
    fn a_file_that_cannot_be_read_is_put_aside_not_written_over() {
        let path = folder("bad").join("values.json");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"{ \"aiTranslateSettings\": { \"groqApiKey\": \"gsk_").unwrap();

        let mut store = Store::open(&path);
        assert!(store.values().is_empty());
        store.set("aiTranslateSettings", json!({})).unwrap();

        let kept = fs::read_to_string(aside(&path, "bad")).unwrap();
        assert!(kept.contains("gsk_"));
    }
}
