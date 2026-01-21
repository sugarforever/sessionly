# Sessionly

A desktop application for browsing and managing your Claude Code CLI session history. Review past conversations, explore tool calls, view code changes, and access an integrated terminal - all in a clean, native interface.

## What is Sessionly?

Sessionly reads your Claude Code session files from `~/.claude/projects/` and presents them in a rich, browsable format. It's designed for developers who use Claude Code CLI and want to:

- **Review past sessions** - Browse conversations organized by project
- **Explore tool calls** - See exactly what files Claude read, wrote, and edited
- **Track code changes** - View code blocks with syntax highlighting
- **Understand AI reasoning** - Read Claude's extended thinking blocks
- **Access integrated terminal** - Open a terminal in your project directory

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

### Integrated Terminal
- Toggle terminal panel at the bottom of the session view
- Automatically sets working directory to project path
- Full interactive shell with PTY support

### Desktop Experience
- Native macOS/Windows/Linux app
- System tray integration
- Window state persistence
- Light and dark theme support

## Installation

### From Release (Recommended)

Download the latest release for your platform from the [Releases](https://github.com/sugarforever/sessionly/releases) page.

### From Source

```bash
# Clone the repository
git clone https://github.com/sugarforever/sessionly.git
cd sessionly

# Install dependencies
npm install

# Start development server
npm run dev
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Electron 32+ |
| UI Library | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 5 |
| State Management | Redux Toolkit |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| Terminal | xterm + node-pty |
| Testing | Vitest + React Testing Library |

## Development

### Commands

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build           # Current platform
npm run build:mac       # macOS (.dmg, .zip)
npm run build:win       # Windows (.exe, .zip)
npm run build:linux     # Linux (.AppImage, .deb)

# Testing
npm test                # Run tests
npm run test:ui         # Tests with UI
npm run typecheck       # TypeScript check

# Code quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format with Prettier
```

### Project Structure

```
sessionly/
├── electron/                    # Electron main process
│   ├── main/
│   │   ├── index.ts            # Main entry point
│   │   ├── ipc-handlers.ts     # IPC message handlers
│   │   ├── session-store.ts    # Session file parser
│   │   └── terminal-manager.ts # PTY management
│   ├── preload/                # Context bridge
│   └── shared/                 # Shared types
├── src/                        # React renderer process
│   ├── components/             # React components
│   │   └── ui/                 # shadcn/ui components
│   ├── features/
│   │   └── sessions/          # Session browsing feature
│   ├── pages/                  # Application pages
│   └── store/                  # Redux store
└── package.json
```

## How It Works

Sessionly reads Claude Code session files stored in `~/.claude/projects/`. These files are in JSONL format (one JSON object per line) and contain:

- User and assistant messages
- Tool calls (Read, Write, Edit, Bash, etc.)
- Tool results and outputs
- Extended thinking content
- Subagent delegations

The app parses these files and presents them in a user-friendly interface, making it easy to review what happened in each session.

## Requirements

- Node.js 18+ (for development)
- Claude Code CLI (to generate sessions to view)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
