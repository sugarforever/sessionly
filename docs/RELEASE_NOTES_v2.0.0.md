# Sessionly v2.0.0

Sessionly has been **rebuilt from the ground up on [Tauri v2](https://tauri.app)** (previously Electron) — a smaller, faster, fully native app with the same session-browsing experience you know.

## ⚠️ Upgrading from v1.x — one-time manual download

This is a major platform change, so **v1.x users need to download v2.0.0 manually this one time** — the old Electron auto-updater can't cross over to the new build. Your data is completely safe: Sessionly reads your sessions directly from `~/.claude`, so **nothing is lost** in the switch. From v2.0.0 onward, auto-updates are seamless again.

> Already on v1.x? You'll also see an in-app prompt with a download link.

## ✨ Highlights

- **Rebuilt on Tauri v2** — dramatically smaller download and memory footprint, faster startup, native performance.
- **Working auto-updates** — signed, automatic updates so you stay current without manual downloads (this fixes the "Failed to check for updates" error).
- **Redesigned home screen** — a live session-monitoring dashboard showing active vs. quiet projects at a glance.
- **Cross-platform notifications** — native desktop notifications when sessions complete or error, with per-event settings and smart cooldown de-duplication so you're never spammed.
- **Claude Code hooks integration** — opt-in hooks that notify you the moment a session stops, plus in-app setup documentation.
- **Refreshed dark app icon.**

## 🛠 Under the hood

- Reads sessions directly from `~/.claude/projects/` (no internal database) — your data stays yours.
- Two-process Tauri architecture (Rust backend + React 19 / Vite frontend).
- Signed & notarized macOS builds; Windows and Linux packages included.

## 📦 Downloads

- **macOS** — `.dmg` (Apple Silicon + Intel universal)
- **Windows** — `.exe` installer
- **Linux** — `.AppImage`, `.deb`, `.rpm`
