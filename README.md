# Sessionly

A cross-platform desktop app for browsing, monitoring, and exporting your Claude Code CLI session history. Review past conversations, explore tool calls, view code changes, and get notified when long-running sessions finish — all in a clean, native interface.

## What is Sessionly?

Sessionly reads your Claude Code session files directly from `~/.claude/projects/` and presents them in a rich, browsable format. There is **no internal database** — your sessions are always read fresh from disk, so nothing to sync or import. It's designed for developers who use Claude Code CLI and want to:

- **Review past sessions** - Browse conversations organized by project
- **Explore tool calls** - See exactly what files Claude read, wrote, and edited
- **Track code changes** - View code blocks with syntax highlighting
- **Understand AI reasoning** - Read Claude's extended thinking blocks
- **Stay informed** - Get a native notification when a session completes or errors

## Features

### Session Browser
- Browse all sessions grouped by project
- View session metadata: message count, timestamps, git branch, AI model
- Hide/unhide projects and sessions to declutter your view
- Quick session preview with first message

### Rich Message Display
- Full conversation history with user and assistant messages
- Syntax-highlighted code blocks
- Extended thinking blocks (when available)
- Tool call details with expandable results
- Subagent conversations (Task tool delegations)

### Live Monitoring & Notifications
- Watches session files for live activity as Claude works
- Native desktop notifications when a session **completes** or **errors**
- Per-event toggles (complete / error) and cooldown de-duplication to avoid notification storms
- Optional Claude Code hooks install/uninstall, managed from Settings

### Export
- Export any session to Markdown from the session header

### Desktop Experience
- Native macOS / Windows / Linux app built on Tauri
- System tray icon
- Light / dark / system theme with the Inter font family
- Automatic updates (signed release manifest)

## Installation

### From Release (Recommended)

Download the latest release for your platform from the [Releases](https://github.com/sugarforever/sessionly/releases) page.

> **Note for legacy (≤ v1.1.1) users:** releases up to v1.1.1 were Electron builds. The first Tauri release (v2.0.0) cannot be reached via the old auto-updater — download it manually once. Your session data is unaffected (it lives in `~/.claude`, not in the app).

### From Source

Requires [Node.js](https://nodejs.org/) 18+ and the [Rust toolchain](https://www.rust-lang.org/tools/install) plus your platform's [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
# Clone the repository
git clone https://github.com/sugarforever/sessionly.git
cd sessionly

# Install JS dependencies (Rust/Cargo deps build on first `tauri` run)
npm install

# Run the full app (Vite dev server + Rust backend, hot reload)
npm run tauri dev
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Tauri v2 (Rust backend) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Build Tool | Vite 7 |
| State Management | Redux Toolkit |
| UI Components | shadcn-style + Radix UI |
| Styling | Tailwind CSS |

## Development

All commands run from the repository root.

```bash
# Development
npm run tauri dev       # Primary dev loop: Vite dev server + Rust app, hot reload
npm run dev             # Frontend-only in a browser (no native APIs / Tauri commands)

# Build
npm run build           # tsc + vite build (frontend bundle only)
npm run tauri build     # Full native app bundle (installers under src-tauri/target/release/bundle/)

# Quality gates (these mirror CI)
npm run typecheck       # tsc --noEmit
npm run lint            # eslint, --max-warnings 0
npm run format          # prettier --write
npm run format:check    # prettier --check
cd src-tauri && cargo clippy -- -D warnings
```

> There is currently no test runner configured.

### Project Structure

```
sessionly/
├── src/                        # React renderer (WebView)
│   ├── App.tsx, main.tsx       # Entry + provider composition
│   ├── components/             # Shared components
│   │   └── ui/                 # shadcn-style primitives
│   ├── features/               # Feature areas (home/, sessions/)
│   ├── pages/                  # Top-level pages (About, Settings)
│   ├── contexts/               # React contexts (theme, navigation, monitor…)
│   ├── store/                  # Redux Toolkit store + slices
│   └── types/api.ts            # Typed wrapper over Tauri `invoke`
├── src-tauri/                  # Rust backend / core
│   ├── src/
│   │   ├── lib.rs              # App setup: plugins + command handlers
│   │   ├── commands.rs         # #[tauri::command] entry points
│   │   ├── session_store.rs    # Reads & parses ~/.claude/projects/
│   │   ├── session_monitor.rs  # Watches session files for live activity
│   │   ├── session_types.rs    # Rust data models
│   │   ├── markdown_export.rs  # Session → Markdown export
│   │   └── hooks.rs            # Claude Code hooks install/uninstall
│   ├── capabilities/           # Tauri permission grants
│   └── tauri.conf.json         # App / bundle / updater config
└── package.json
```

## How It Works

Sessionly reads Claude Code session files stored in `~/.claude/projects/`. These files are in JSONL format (one JSON object per line) and contain:

- User and assistant messages
- Tool calls (Read, Write, Edit, Bash, etc.)
- Tool results and outputs
- Extended thinking content
- Subagent delegations

The Rust backend owns all privileged work (filesystem reads, session parsing, live monitoring, notifications, hook install) and exposes it to the React frontend through typed Tauri commands. The frontend renders everything in the OS WebView. App-owned preferences (theme, notification settings) live in `localStorage`; there is no internal session database.

## Requirements

- Node.js 18+ and the Rust toolchain (for building from source)
- Claude Code CLI (to generate sessions to view)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
