# Electron Boilerplate

A modern, production-ready Electron boilerplate with React, Vite, TypeScript, Redux Toolkit, Drizzle ORM, and shadcn/ui. Perfect for quickly bootstrapping new desktop applications with a beautiful minimalist design.

## Features

- **Electron + Vite** - Lightning-fast HMR for both main and renderer processes
- **React 18 + TypeScript** - Modern React with full type safety
- **Redux Toolkit** - Efficient, type-safe state management
- **shadcn/ui + Radix UI** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS with a minimalist black & white theme
- **Drizzle ORM + better-sqlite3** - Lightweight, type-safe database ORM with SQLite
- **Type-Safe IPC** - Fully typed communication between main and renderer processes
- **System Tray** - Pre-configured system tray with customizable menu
- **Window State Management** - Automatically persists window size and position
- **Native Notifications** - Built-in support for system notifications
- **Vercel AI SDK** - Integrated AI capabilities with OpenAI support
- **Navigation System** - Extensible page-based navigation with sidebar
- **Vitest** - Fast unit testing with React Testing Library
- **ESLint + Prettier** - Code quality and formatting
- **Auto Native Module Rebuild** - Automatic rebuilding of native modules for Electron

## Design

- **Font**: Inter - Modern, highly readable UI font
- **Theme**: Minimalist black & white design with clean lines
- **Font Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Responsive**: Fluid typography and spacing

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Electron 32+ |
| UI Library | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 5 |
| State Management | Redux Toolkit |
| UI Components | Radix UI + shadcn/ui |
| Styling | Tailwind CSS |
| Database | Drizzle ORM + better-sqlite3 |
| AI Integration | Vercel AI SDK + OpenAI |
| Testing | Vitest + React Testing Library |
| Code Quality | ESLint + Prettier |

## Quick Start

### Running This Boilerplate

**Everything is already set up!** Just run:

```bash
npm run dev
```

The app will start with:
- Hot module replacement for renderer process
- Auto-reload for main process changes
- DevTools opened automatically
- Window at http://localhost:5173 (development) or packaged app (production)

### Using This as a Template for a New Project

When you want to create a new desktop app based on this boilerplate:

#### 1. Copy to New Project

```bash
# From the parent directory
cp -r electron-boilerplate my-new-app
cd my-new-app

# Remove git history (start fresh)
rm -rf .git
git init

# Install dependencies
npm install
```

#### 2. Customize for Your App

Update `package.json`:
```json
{
  "name": "my-app-name",
  "author": "Your Name",
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "Your App Name"
  }
}
```

#### 3. Replace Icons

- Replace `public/icon.svg` and `public/icon.png` with your app icons
- For production builds, add icons in various sizes (see electron-builder docs)

#### 4. Start Development

```bash
npm run dev
```

### Prerequisites

- Node.js 18+ and npm
- Git (optional, for version control)

### Building for Production

#### Build for macOS

```bash
npm run build:mac
```

**Outputs** (in `release/{version}/`):
- `.dmg` - Disk image installer (recommended for distribution)
- `.zip` - Compressed app bundle

**Requirements:**
- Must be run on macOS
- For distribution: Apple Developer certificate needed for code signing

**Note:** On first build, you may see warnings about code signing. For development, you can ignore these. For distribution, set up code signing in `package.json`:

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

#### Build for Windows

```bash
npm run build:win
```

**Outputs** (in `release/{version}/`):
- `.exe` - NSIS installer (recommended for distribution)
- `.zip` - Portable version (no installation required)

**Requirements:**
- Can be run on macOS, Windows, or Linux (uses Wine on non-Windows)
- For distribution: Code signing certificate recommended

**Cross-platform build on macOS:**
```bash
# Install Wine (one time setup)
brew install --cask wine-stable

# Build for Windows
npm run build:win
```

#### Build for Linux

```bash
npm run build:linux
```

**Outputs** (in `release/{version}/`):
- `.AppImage` - Universal Linux package (works on most distros)
- `.deb` - Debian/Ubuntu package

#### Build for All Platforms

```bash
npm run build
```

This builds for your current platform only. To build for multiple platforms in CI/CD, use separate commands.

**Build Output Location:**
All builds are saved to `release/{version}/` (e.g., `release/1.0.0/`)

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Type checking
npm run typecheck
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Project Structure

```
electron-boilerplate/
├── electron/                   # Electron main process
│   ├── main/                  # Main process code
│   │   ├── index.ts          # Main entry point
│   │   ├── ipc-handlers.ts   # IPC message handlers
│   │   ├── schema.ts         # Drizzle ORM schema
│   │   ├── database.ts       # Database initialization & repositories
│   │   ├── system-tray.ts    # System tray configuration
│   │   └── window-state-manager.ts  # Window state persistence
│   ├── preload/               # Preload scripts
│   │   └── index.ts          # Context bridge setup
│   └── shared/                # Shared types
│       └── types.ts          # IPC type definitions
├── src/                       # React renderer process
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── Layout.tsx       # Main layout with sidebar
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   └── PageRouter.tsx   # Page routing component
│   ├── config/              # Configuration
│   │   └── navigation.tsx  # Navigation menu config
│   ├── contexts/           # React contexts
│   │   └── NavigationContext.tsx  # Navigation state
│   ├── lib/                # Utilities
│   │   └── utils.ts       # Helper functions
│   ├── pages/             # Application pages
│   ├── store/            # Redux store
│   │   ├── index.ts     # Store configuration
│   │   ├── hooks.ts     # Typed hooks
│   │   └── slices/      # Redux slices
│   ├── test/            # Test files
│   ├── App.tsx          # Root component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── drizzle/             # Database migrations
├── data/                # Local database files (dev)
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

## Configuration

### Database

The boilerplate uses Drizzle ORM with SQLite (better-sqlite3). To modify the schema:

1. Edit `electron/main/schema.ts`
2. Run `npm run db:generate` to generate migrations
3. Migrations run automatically on next app start

To view/edit the database:

```bash
npm run db:studio
```

**Development vs Production:**
- **Development**: Database stored in `data/dev.db`
- **Production**: Database stored in user data directory (app.getPath('userData'))

**Quick Schema Push (Development Only):**
```bash
npm run db:push  # Push schema changes directly without migrations
```

### Adding UI Components

This project uses shadcn/ui. To add new components:

```bash
# Example: Add a dialog component
npx shadcn@latest add dialog

# Example: Add a select component
npx shadcn@latest add select
```

Components will be added to `src/components/ui/`.

### System Tray

Customize the system tray menu in `electron/main/system-tray.ts`. Replace the icon at `public/icon.png` with your own (16x16 or 32x32 recommended).

### IPC Communication

Add new IPC handlers in `electron/main/ipc-handlers.ts`:

```typescript
// Main process
ipcMain.handle('your-channel', async (_event, arg) => {
  return { success: true, data: result }
})
```

Add types in `electron/shared/types.ts`:

```typescript
export interface ElectronAPI {
  yourMethod: (arg: string) => Promise<IpcResponse<ReturnType>>
}
```

Expose in preload (`electron/preload/index.ts`):

```typescript
const electronAPI: ElectronAPI = {
  yourMethod: (arg) => ipcRenderer.invoke('your-channel', arg),
}
```

Use in renderer:

```typescript
const result = await window.electron.yourMethod('test')
```

## Customization

### Theme

Edit theme colors in `src/index.css` under the `:root` and `.dark` selectors. The boilerplate includes both light and dark theme definitions.

### Fonts

Change the font in `tailwind.config.ts`:

```typescript
fontFamily: {
  sans: ['Your Font', 'system-ui', 'sans-serif'],
}
```

Update the Google Fonts import in `src/index.css`.

### Window Settings

Modify window options in `electron/main/index.ts`:

```typescript
const mainWindow = new BrowserWindow({
  minWidth: 800,
  minHeight: 600,
  // Add more options...
})
```

## Deployment

### macOS

```bash
npm run build
```

Outputs:
- `.dmg` - Disk image installer
- `.zip` - Compressed app

### Windows

```bash
npm run build
```

Outputs:
- `.exe` - NSIS installer
- `.zip` - Portable version

### Linux

```bash
npm run build
```

Outputs:
- `.AppImage` - Universal Linux package
- `.deb` - Debian/Ubuntu package

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (current platform) |
| `npm run build:mac` | Build for macOS (.dmg, .zip) |
| `npm run build:win` | Build for Windows (.exe, .zip) |
| `npm run build:linux` | Build for Linux (.AppImage, .deb) |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm test` | Run tests with Vitest |
| `npm run test:ui` | Run tests with UI |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:push` | Push schema to database (dev only) |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run rebuild` | Rebuild native modules for Electron |

## Best Practices

1. **Security**: Context isolation is enabled by default. Never disable it.
2. **IPC**: Always validate data from the renderer process in IPC handlers.
3. **State**: Use Redux Toolkit for complex state, React state for local UI state.
4. **Database**: Use Drizzle migrations (`npm run db:generate`) for all schema changes.
5. **Testing**: Write tests for critical business logic and complex components.
6. **Types**: Leverage TypeScript's type system - avoid `any` types.
7. **Native Modules**: The postinstall script automatically rebuilds native modules.

## Learn More

- [Electron Documentation](https://www.electronjs.org/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

MIT

## Contributing

This is a boilerplate template. Feel free to modify it for your needs!
