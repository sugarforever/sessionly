# CCLens Technical Architecture

## Overview

CCLens is a macOS desktop app that provides a read-only viewer for Claude Code sessions, plus real-time event notifications when multiple sessions run concurrently. Built with **Tauri 2** (Rust backend + React frontend).

```
 +--------------------+       IPC (invoke)       +--------------------+
 |  React Frontend    | <---------------------> |  Rust Backend       |
 |  (WebView)         |                          |  (Tauri)            |
 |                    |                          |                     |
 |  ProjectList       |  get_projects            |  commands.rs        |
 |  SessionList       |  get_sessions            |    File I/O on      |
 |  SessionView       |  get_messages            |    ~/.claude/       |
 |  NotificationFeed  |  get_recent_events       |                     |
 |  NotificationSettings  clear_events           |  hooks.rs           |
 |                    |  get_hooks_status         |    Hook install/    |
 |                    |  setup_hooks              |    event parsing    |
 |                    |  uninstall_hooks          |    tray menu data   |
 +--------------------+                          +--------------------+
         |                                                |
         v                                                v
   Browser APIs                                    System tray icon
   (date-fns, react-markdown)                      (dynamic menu)
                                                          |
                                                          v
                                              ~/.claude/cclens-events.jsonl
                                              (written by hook script)
```

---

## Project Structure

```
cclens/
├── src/                          # React frontend (Vite + TypeScript)
│   ├── App.tsx                     # Root layout: 3-column + feed
│   ├── index.css                   # Glassmorphism theme (CSS vars)
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── components/
│   │   ├── ProjectList.tsx         # Left sidebar — project browser
│   │   ├── SessionList.tsx         # Middle panel — sessions per project
│   │   ├── SessionView.tsx         # Main panel — message viewer
│   │   ├── NotificationFeed.tsx    # Bottom strip — live event feed
│   │   └── NotificationSettings.tsx # Modal — hook install + toggles
│   └── hooks/
│       ├── useCommand.ts           # Generic Tauri IPC wrapper
│       └── useNotifications.ts     # File watcher + notification logic
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml                  # Dependencies: tauri, chrono, serde, etc.
│   ├── tauri.conf.json             # Window config, bundle settings, CSP
│   ├── capabilities/
│   │   └── default.json            # Permissions: fs, notification, core
│   ├── hooks/
│   │   ├── cclens-hook.sh          # Bash hook script (installed into ~/.claude/)
│   │   └── cclens-hooks-config.json # Hook config merged into settings.json
│   └── src/
│       ├── main.rs                 # Binary entry point
│       ├── lib.rs                  # Tauri setup, tray icon, plugin init
│       ├── commands.rs             # Core IPC: projects, sessions, messages
│       └── hooks.rs                # Hook management, event parsing, tray helpers
├── package.json                  # npm scripts, React/Tauri dependencies
└── vite.config.ts
```

---

## Data Model

### Session Data (read-only)

Claude Code stores sessions in `~/.claude/projects/<project-dir>/<session-id>.jsonl`.

- **Project dir**: Dash-encoded absolute path, e.g. `-Users-wyang14-yahoo-cclens`
- **Session file**: UUID-named `.jsonl`, each line is a JSON message
- **Message types**: `user` and `assistant`, with content blocks (text, tool_use)

```
~/.claude/
└── projects/
    ├── -Users-wyang14-yahoo-cclens/
    │   ├── a1b2c3d4-...-e5f6.jsonl
    │   └── f7g8h9i0-...-j1k2.jsonl
    └── -Users-wyang14-yahoo-sports/
        └── ...
```

### Event Data (written by hooks)

Events are appended to `~/.claude/cclens-events.jsonl` by the hook script:

```jsonc
{
  "event": "Stop",                    // SessionStart | SessionEnd | Stop | Notification
  "sessionId": "a1b2c3d4-...",
  "projectDir": "-Users-wyang14-yahoo-cclens",
  "cwd": "/Users/wyang14/yahoo/cclens",
  "timestamp": "2026-02-19T10:30:00Z",
  // Stop-specific:
  "stopHookActive": true,
  // Notification-specific:
  "notificationType": "permission_prompt",  // idle_prompt | auth_success | elicitation_dialog
  "message": "Claude needs your approval.",
  "title": "Permission Needed"
}
```

Auto-truncated at 1MB (keeps last 500 events).

---

## Backend (Rust)

### `commands.rs` — Core Session Reader

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_projects` | `() -> Vec<Project>` | Scans `~/.claude/projects/` for dirs starting with `-`, counts sessions, returns sorted by last modified |
| `get_sessions` | `(project_dir: String) -> Vec<SessionEntry>` | Lists `.jsonl` files in a project dir, extracts first prompt, message count, git branch |
| `get_messages` | `(project_dir, session_id, offset?, limit?) -> MessagesResponse` | Paginated message reader with content extraction (text + tool_use blocks) |

Key details:
- Uses `BufReader` for line-by-line JSONL parsing (no full-file load)
- Tool use blocks formatted as compact badges: `**Tool: Read** /path/to/file`
- Pagination via `offset`/`limit` params (default 50 per page)

### `hooks.rs` — Event System

| Command/Function | Description |
|------------------|-------------|
| `get_hooks_status()` | Checks if hook script + settings.json config exist |
| `setup_hooks()` | Copies `cclens-hook.sh` to `~/.claude/hooks/cclens/`, merges config into `~/.claude/settings.json` |
| `uninstall_hooks()` | Removes hook dir and cleans `settings.json` |
| `get_recent_events(limit?)` | Reads last N events from `cclens-events.jsonl` (ring-buffer approach) |
| `clear_events()` | Truncates the events file |
| `format_relative_time(ts)` | `"2026-02-19T10:30:00Z"` -> `"5m ago"` (uses `chrono`) |
| `get_recent_events_for_menu(limit)` | Returns `Vec<(label, session_id)>` pre-formatted for tray menu |

The hook script (`cclens-hook.sh`) is embedded at compile time via `include_str!`. It:
1. Reads JSON from stdin (Claude Code hook protocol)
2. Extracts event-specific fields with `jq`
3. Appends a camelCase JSON line to `~/.claude/cclens-events.jsonl`
4. Uses `flock` for concurrent write safety (falls back to direct append)

### `lib.rs` — App Setup & Tray

**Tray Icon Architecture:**

```
TrayState { tray: Mutex<Option<TrayIcon>> }
    │
    ├── Stored in Tauri managed state (.manage())
    │
    ├── Initial menu: [Show CCLens, Quit]
    │
    └── Background thread (every 15s):
          rebuild_tray_menu() reads recent events
          and calls tray.set_menu() with:
            [event_0: "Stop — yahoo/cclens (2m ago)"]
            [event_1: "Idle — yahoo/sports (5m ago)"]
            [───────── separator ─────────]
            [Show CCLens]
            [Quit]
```

**Menu event routing:**
- `"show"` -> show + focus main window
- `"quit"` -> `app.exit(0)`
- `"event_*"` -> show + focus main window

**Window behavior:**
- Close button hides the window (stays in tray)
- Left-click tray icon -> show + focus window

---

## Frontend (React + TypeScript)

### Component Hierarchy

```
App
├── ProjectList          ← useCommand("get_projects")
├── SessionList          ← useCommand("get_sessions", { projectDir })
├── Main Content Panel   ← flex-col layout
│   ├── SessionView      ← useCommand("get_messages", { projectDir, sessionId, offset, limit })
│   └── NotificationFeed ← receives events from useNotifications()
└── NotificationSettings ← modal, receives full useNotifications() return
```

### `useNotifications` Hook

Central hook managing the entire notification lifecycle:

```
useNotifications()
  ├── State
  │   ├── hooksStatus: HooksStatus | null
  │   ├── recentEvents: ClaudeEvent[]
  │   ├── settings: NotificationSettings (persisted in localStorage)
  │   └── notificationPermission: boolean
  │
  ├── File Watcher (tauri-plugin-fs watchImmediate)
  │   ├── Watches ~/.claude/cclens-events.jsonl
  │   ├── On change: invoke("get_recent_events", limit: 5)
  │   ├── Deduplicates via lastEventTimestamp ref
  │   └── Calls handleNewEvent() for each new event
  │
  ├── handleNewEvent(event)
  │   ├── Updates recentEvents state (keeps last 20)
  │   ├── Checks settings to decide notification type
  │   └── Sends macOS notification via tauri-plugin-notification
  │
  └── Actions
      ├── setupHooks / uninstallHooks
      ├── clearEvents
      ├── updateSettings (partial merge)
      └── sendTestNotification
```

### `NotificationFeed` Component

Always-visible strip at the bottom of the main content area.

**Two states:**
- **Expanded** (default): Header with event count + clear button + minimize toggle, scrollable list of last 10 events
- **Minimized**: Single-line summary showing the latest event

**Each event row:** `[icon] [label] [project name] [relative time]`

**Interaction:** Click any row -> `onSelectEvent(cwd, sessionId)` which:
1. Invokes `get_projects` to find the project whose `name` matches the cwd
2. Sets `selectedProject` + `selectedSession` in App state
3. SessionView loads that session's messages

**Animation:** New events enter with `fadeIn` CSS keyframe (0.2s ease-out, translate Y 4px).

Returns `null` when `events.length === 0` (invisible).

### `NotificationSettings` Modal

Accessible via bell icon in sidebar header. Provides:
- Hook install/uninstall toggle
- macOS notification permission grant button
- Test notification sender
- Per-event-type toggles (Stop, Idle, Permission)
- Recent events preview (last 5, reverse chronological)

---

## IPC Commands Summary

| Rust Command | Args | Returns | Called By |
|-------------|------|---------|-----------|
| `get_projects` | none | `Vec<Project>` | ProjectList |
| `get_sessions` | `project_dir` | `Vec<SessionEntry>` | SessionList |
| `get_messages` | `project_dir, session_id, offset?, limit?` | `MessagesResponse` | SessionView |
| `get_hooks_status` | none | `HooksStatus` | useNotifications |
| `setup_hooks` | none | `Result<String>` | NotificationSettings |
| `uninstall_hooks` | none | `Result<String>` | NotificationSettings |
| `get_recent_events` | `limit?` | `Vec<ClaudeEvent>` | useNotifications, tray menu |
| `clear_events` | none | `Result<String>` | NotificationFeed, NotificationSettings |
| `get_events_file_path_cmd` | none | `Option<String>` | (internal) |

---

## Key Dependencies

### Rust (`Cargo.toml`)
| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | 2.10 | App framework, IPC, window management, tray icon |
| `tauri-plugin-notification` | 2.x | macOS native notifications |
| `tauri-plugin-fs` | 2.x | File system access + `watchImmediate` |
| `tauri-plugin-log` | 2.x | Debug logging (dev only) |
| `serde` / `serde_json` | 1.x | JSON serialization for IPC + event parsing |
| `chrono` | 0.4 | Timestamp parsing, relative time formatting |
| `dirs` | 5.0 | Home directory resolution |
| `notify` | 6.1 | File system notifications (transitive via plugin-fs) |

### Frontend (`package.json`)
| Package | Purpose |
|---------|---------|
| `react` 19, `react-dom` 19 | UI framework |
| `@tauri-apps/api` | IPC `invoke()` calls to Rust |
| `@tauri-apps/plugin-fs` | `watchImmediate` for file changes |
| `@tauri-apps/plugin-notification` | `sendNotification`, permission APIs |
| `date-fns` | `formatDistanceToNow` for relative timestamps |
| `react-markdown` + `remark-gfm` | Markdown rendering in SessionView |
| `tailwindcss` 4 + `@tailwindcss/vite` | Utility-first CSS |
| `vite` 7 | Dev server + bundler |

---

## Event Flow: End to End

```
1. Claude Code session emits hook event (Stop, Notification, etc.)
        │
2. ~/.claude/hooks/cclens/cclens-hook.sh receives JSON on stdin
        │
3. Script appends camelCase JSON line to ~/.claude/cclens-events.jsonl
        │
4. tauri-plugin-fs watchImmediate detects file change
        │
5. useNotifications fetches last 5 events via invoke("get_recent_events")
        │
6. handleNewEvent() deduplicates, updates recentEvents state
        │
7. Two outputs:
   ├── NotificationFeed re-renders with new event row (fadeIn animation)
   └── macOS notification sent (if enabled for that event type)
        │
8. Every 15s, background Rust thread calls rebuild_tray_menu()
   └── Reads events via get_recent_events_for_menu(5)
   └── Replaces tray menu items with formatted event labels
```

---

## Styling

- **Theme system**: CSS custom properties in `:root` / `@media (prefers-color-scheme: light)`
- **Glassmorphism**: `backdrop-filter: blur()`, semi-transparent backgrounds, subtle borders
- **Color palette**: Warm stone neutrals (`#1c1917` dark, `#f5f5f4` light), purple accent (`rgb(96, 1, 210)`)
- **Fonts**: Inter (UI), JetBrains Mono (code blocks)
- **Scrollbars**: Custom webkit scrollbar styling (translucent glass)

---

## Tauri Capabilities (`capabilities/default.json`)

```json
{
  "permissions": [
    "core:default",
    "notification:default",
    "notification:allow-is-permission-granted",
    "notification:allow-request-permission",
    "notification:allow-notify",
    "fs:default",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-exists",
    "fs:allow-create",
    "fs:allow-mkdir",
    "fs:allow-watch",
    { "identifier": "fs:scope", "allow": ["$HOME/.claude/**"] }
  ]
}
```

File system access is scoped to `~/.claude/` only.
