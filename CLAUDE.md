# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sessionly is a cross-platform desktop app for browsing, monitoring, and exporting Claude Code CLI session history. It reads sessions directly from `~/.claude/projects/` and surfaces live session activity, search, and Markdown export.

**Tech Stack**: Tauri v2 (Rust backend), React 19, TypeScript 5, Vite 7, Redux Toolkit, Tailwind CSS, shadcn-style UI components.

> **History**: This project was originally an Electron + Drizzle/better-sqlite3 boilerplate and was migrated to Tauri v2 (Feb 2026). If you find references to Electron, IPC `window.electron`, Drizzle, or better-sqlite3 anywhere, they are stale — the current app uses Tauri `invoke` and reads the filesystem directly, with **no internal database**.

**Design Philosophy**: Minimalist black & white theme with the Inter font family, light/dark mode support.

## Repository Layout

The **only active project is the repository root.** Two sibling directories are local-only and **gitignored** (`.gitignore:44-45`) — do not treat them as part of the build:

- `sessionly-tauri/` — stale duplicate of an earlier Tauri scaffold (`version 0.1.0`). Safe to ignore/delete.
- `sessionly-macos/` — a separate, experimental **native macOS (Swift/SwiftPM)** implementation of the same product. Unrelated to the root build.

Other untracked root dirs are build output or scratch: `dist/`, `dist-electron/` (Electron-era leftover), `release/`, `debug/`, `promo-video/`, `node_modules/`.

## Development Commands

Everything runs from the repository root.

```bash
# Install
npm install              # JS deps; Rust/Cargo deps build on first `tauri` run

# Development
npm run tauri dev        # PRIMARY dev loop: Vite dev server (port 1420) + Rust app, hot reload
npm run dev              # Frontend-only in a browser (no native APIs / Tauri commands)

# Build
npm run build            # tsc + vite build (frontend bundle only)
npm run tauri build      # Full native app bundle (installers in src-tauri/target/release/bundle/)

# Quality gates (these mirror CI)
npm run typecheck        # tsc --noEmit
npm run lint             # eslint, --max-warnings 0
npm run format           # prettier --write
npm run format:check     # prettier --check
cd src-tauri && cargo clippy -- -D warnings
```

There is currently **no test runner configured** (the old Vitest setup was removed in the migration).

## Architecture

### Two-process model (Tauri)

1. **Frontend / WebView** (`src/`)
   - React 19 app bundled by Vite, rendered in the OS WebView.
   - Cannot access the filesystem or OS directly — it calls Rust via Tauri `invoke`.
   - Entry: `src/main.tsx` → `src/App.tsx`.

2. **Backend / Core** (`src-tauri/src/`)
   - Rust. Owns all privileged work: filesystem reads, session parsing, hook install, notifications.
   - Entry: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs` (registers plugins + command handlers).

### Frontend ↔ Backend communication

The frontend talks to Rust through a single typed wrapper in `src/types/api.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'

export const api = {
  getVersion: () => invoke<string>('get_version'),
  sessionsGetAll: () => invoke<ProjectGroup[]>('get_projects'),
  sessionsGet: (sessionId, projectEncoded) =>
    invoke<Session>('get_session', { sessionId, projectEncoded }),
  // ...
}
```

**Always add new backend calls to `src/types/api.ts`** rather than calling `invoke` ad hoc — it keeps the surface typed and discoverable.

#### Adding a new backend command

1. **Implement** the command in `src-tauri/src/commands.rs` (or the relevant `*.rs` module):
   ```rust
   #[tauri::command]
   pub fn my_command(arg: String) -> Result<MyType, String> { ... }
   ```
2. **Register** it in the `generate_handler!` macro in `src-tauri/src/lib.rs`.
3. **Grant permission** if it needs a capability (see Capabilities below).
4. **Expose** it via a typed method in `src/types/api.ts`.
5. **Call** it from the frontend through `api.myMethod(...)`.

Note: command arguments are camelCase on the JS side and snake_case in Rust — Tauri converts automatically (`{ sessionId }` ↔ `session_id`).

### Backend modules (`src-tauri/src/`)

- `lib.rs` — app setup: registers plugins and command handlers.
- `commands.rs` — `#[tauri::command]` entry points exposed to the frontend.
- `session_store.rs` — reads `~/.claude/` and `~/.claude/projects/`; lists/parses sessions.
- `session_monitor.rs` — watches session files for live activity.
- `session_types.rs` — Rust data models (serde-serialized to the frontend).
- `markdown_export.rs` — session → Markdown export.
- `hooks.rs` — install/uninstall/status of Claude Code hooks.

Registered commands (`lib.rs`): `get_projects`, `get_session`, `get_version`, `get_native_theme`, `export_session_markdown`, `hooks_get_status`, `hooks_install`, `hooks_uninstall`, `hooks_is_installed`, `send_native_notification`, `search_query`, `search_index_status`, `search_reindex`, `search_get_backend`, `search_set_backend`.

Registered plugins: `opener`, `shell`, `dialog`, `fs`, `process`, `updater`, `notification`.

### Data model — there is no internal database

- **Source of truth is `~/.claude/projects/`** (Claude Code's own session JSONL files), read fresh by the Rust backend. The app stores no sessions of its own.
- **App-owned settings live in browser `localStorage`** only: theme (`ThemeContext.tsx`) and notification prefs (`useNotifications.ts`). These are low-stakes and do not persist across a WebView/runtime change.

This matters for upgrades: because real data lives in `~/.claude`, switching app versions (even Electron→Tauri) loses no session data — only the trivial localStorage prefs reset.

**Exception (search index):** The search feature maintains a derived SQLite index (`search-index.sqlite`) in the app-data dir — FTS5 keyword + `sqlite-vec` vectors. It is a **rebuildable cache** (delete it and it rebuilds from `~/.claude`); it stores no authoritative session data, so the single-source-of-truth model is preserved. API keys for cloud embedding backends are stored in the OS keychain, not localStorage.

### Capabilities / permissions

Tauri gates every native action. Permissions are declared in `src-tauri/capabilities/default.json`. Currently granted: `core:default`, `fs` (read/write/exists + scope), `dialog`, `notification`, `opener`, `process:allow-restart`, `shell:allow-open`, `updater:default`. If a new command hits the filesystem, dialogs, etc., add the matching permission here or it will fail at runtime.

## Frontend structure (`src/`)

- `App.tsx`, `main.tsx` — entry + provider composition.
- `features/` — feature areas (`home/`, `sessions/`) with their own components.
- `pages/` — top-level pages (`AboutPage.tsx`, `SettingsPage.tsx`).
- `components/` — shared components; `components/ui/` holds shadcn-style primitives.
- `contexts/` — `NavigationContext`, `NotificationContext`, `SessionMonitorContext`, `ThemeContext`.
- `store/` — Redux Toolkit store; slices in `store/slices/` (`appSlice.ts`, `sessionsSlice.ts`).
- `config/navigation.tsx` — navigation items (single source for the sidebar).
- `hooks/`, `lib/`, `types/` — hooks, utilities (`cn()` etc.), and shared TS types (incl. `types/api.ts`).

### Navigation

Sidebar-driven navigation via `NavigationContext` + `config/navigation.tsx`. To add a page: create it under `pages/` or `features/`, register it in `config/navigation.tsx`, and wire it into the router/content area. Keep page IDs consistent between the nav config and the router.

### Styling / theme

- Tailwind (`tailwind.config.ts`) with CSS variables; black & white palette, Inter font.
- Light/dark/system handled by `ThemeContext`; `get_native_theme` reports the OS preference.
- Use `cn()` from `src/lib/utils.ts` for conditional classes.

## CI (`.github/workflows/ci.yml`)

On push/PR to `main`, across macOS / Linux / Windows: `typecheck` → `lint` → `format:check` → `cargo clippy -- -D warnings`. No artifacts are produced — it is a gate only. Keep these green; lint runs with `--max-warnings 0`.

## Release & Auto-Update (`.github/workflows/release.yml`)

### Triggering a release

- **Manual** (`workflow_dispatch`, choose patch/minor/major): a `version-bump` job bumps `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` together, commits, and pushes a `v<version>` tag.
- **Tag push** (`v*`): skips the bump and builds directly.

The `build` job runs `tauri-apps/tauri-action` on macOS (universal) / Linux / Windows, code-signs (Apple cert + Tauri minisign key), and publishes a GitHub Release with the installers **and a signed `latest.json` updater manifest**.

**Keep the three version files in sync** (`package.json`, `tauri.conf.json`, `Cargo.toml`) — the bump job does this automatically; if you bump by hand, change all three.

### Auto-update mechanism

- `src/components/UpdateNotification.tsx` calls the Tauri updater `check()` on startup, then offers Download → Restart & Install. Check failures are silently ignored (no release / offline).
- Endpoint: `https://github.com/sugarforever/sessionly/releases/latest/download/latest.json` (`tauri.conf.json` → `plugins.updater.endpoints`).
- Updates are verified against the minisign `pubkey` in `tauri.conf.json`. **`bundle.createUpdaterArtifacts` must be `true`** (it is) or `tauri build` will not emit the signed `latest.json` and auto-update silently breaks.

### Required release secrets (configured in the repo)

`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (updater signing — **back these up; losing the key breaks auto-update for all users**), plus Apple signing: `MAC_CERTIFICATE_P12_BASE64`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.

### Migrating legacy Electron (≤ v1.1.1) users

Releases v1.0.x–v1.1.1 were **Electron** builds (their assets carry `latest.yml`/`.blockmap`, not `latest.json`). The Electron auto-updater and the Tauri auto-updater are incompatible, so **legacy users cannot auto-update into the first Tauri release** — they must download it manually once. Their session data is safe regardless (it lives in `~/.claude`, not in the app). From the first Tauri release (2.0.0) onward, auto-update is seamless.

## Conventions

- **Components**: PascalCase. **Utilities/hooks**: camelCase. **Constants**: UPPER_SNAKE_CASE.
- **Tauri commands**: snake_case in Rust, camelCase args from JS.
- **Prettier**: no semicolons, single quotes, 2-space indent, 100-col width.
- **TS path alias**: `@/*` → `src/*`.

## Security

- Keep the WebView CSP (`tauri.conf.json` → `app.security.csp`) tight; expand only as needed.
- Grant the minimum capability in `capabilities/default.json`.
- Validate all command input in Rust; never trust frontend arguments.
- Open external URLs via the `opener`/`shell` plugins, not raw navigation.
- Never log or hardcode signing keys/secrets.
