//! One version, written two ways.
//!
//! The script's version is package.json's, three numbers and a stage letter:
//! `0.2.3a`. An installer and the updater want semver, where the letter is a
//! pre-release: `0.2.3-a`. They order the same way, 0.2.3a, then 0.2.3b, then
//! 0.2.3, so the app carries the script's number and shows it as the script does.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

/// `0.2.3a` as semver, `0.2.3-a`. None when it is not the script's shape.
pub fn to_semver(version: &str) -> Option<String> {
    let numbers = version.trim_end_matches(|c: char| c.is_ascii_lowercase());
    let stage = &version[numbers.len()..];

    let parts: Vec<&str> = numbers.split('.').collect();
    let numeric = parts.len() == 3 && parts.iter().all(|part| !part.is_empty() && part.len() <= 9 && part.bytes().all(|b| b.is_ascii_digit()));
    if !numeric || stage.len() > 1 {
        return None;
    }

    Some(if stage.is_empty() { numbers.to_owned() } else { format!("{numbers}-{stage}") })
}

/// `0.2.3-a` as the script writes it, `0.2.3a`. Anything else comes back as it is.
pub fn from_semver(version: &str) -> String {
    match version.split_once('-') {
        Some((numbers, stage)) if stage.len() == 1 && stage.bytes().all(|b| b.is_ascii_lowercase()) => format!("{numbers}{stage}"),
        _ => version.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_letter_becomes_a_pre_release() {
        assert_eq!(to_semver("0.2.3a").as_deref(), Some("0.2.3-a"));
        assert_eq!(to_semver("0.10.0b").as_deref(), Some("0.10.0-b"));
        assert_eq!(to_semver("1.0.0").as_deref(), Some("1.0.0"));
    }

    #[test]
    fn and_back() {
        for version in ["0.2.3a", "0.10.0b", "1.0.0"] {
            assert_eq!(from_semver(&to_semver(version).unwrap()), version);
        }
        assert_eq!(from_semver("0.2.3-rc.1"), "0.2.3-rc.1");
    }

    #[test]
    fn what_is_not_a_version_is_none() {
        for version in ["", "0.2", "0.2.3ab", "0.2.3-a", "v0.2.3a", "0.2.x", "0..3a", "0.2.3A"] {
            assert_eq!(to_semver(version), None, "{version}");
        }
    }
}
