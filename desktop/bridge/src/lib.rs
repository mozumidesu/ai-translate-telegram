//! AI Translate, the desktop app: what the page may ask of it.
//!
//! The app shows the official Telegram Web in a window and runs the userscript
//! in it. The script and Telegram's own code share that page, so every command
//! the script can call, the page can call too. What is decided here is decided
//! for both: which addresses a request may go to, and what the storage keeps.
//! Nothing in this crate knows about a window, so its tests run anywhere.
//!
//! SPDX-License-Identifier: GPL-3.0-or-later

pub mod hosts;
pub mod store;
pub mod version;
