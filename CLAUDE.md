# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron boilerplate designed to bootstrap new desktop applications quickly. It uses modern technologies and follows best practices for production-ready Electron apps.

**Tech Stack**: Electron 32+, React 18, TypeScript 5, Vite 5, Redux Toolkit, Drizzle ORM + better-sqlite3, shadcn/ui, Tailwind CSS

**Design Philosophy**: Minimalist black & white theme with the Inter font family, emphasizing clarity and modern aesthetics.

## Development Commands

### Essential Commands

```bash
# Development
npm run dev              # Start dev server with hot reload (both main & renderer)

# Building
npm run build            # Build production app

# Testing
npm test                 # Run tests
npm run test:ui          # Run tests with UI
npm run typecheck        # TypeScript type checking

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database (Drizzle ORM)
npm run db:generate      # Generate migration from schema.ts
npm run db:push          # Push schema directly to database (dev only)
npm run db:studio        # Open Drizzle Studio (database GUI)

# Native Modules
npm run rebuild          # Rebuild native modules for Electron (runs automatically after npm install)
```

### Single Test Execution

```bash
# Run a specific test file
npx vitest src/test/App.test.tsx

# Run tests in watch mode for a specific file
npx vitest src/test/App.test.tsx --watch
```

## Architecture

### Three-Process Model

Electron uses a multi-process architecture with three distinct processes:

1. **Main Process** (`electron/main/`)
   - Entry point: `electron/main/index.ts`
   - Manages application lifecycle, native APIs, and system integration
   - Creates and controls BrowserWindows
   - Handles IPC requests from renderer
   - **Cannot** directly access DOM or run React code

2. **Preload Process** (`electron/preload/`)
   - Entry point: `electron/preload/index.ts`
   - Bridge between main and renderer with `contextBridge`
   - Runs before renderer in an isolated context
   - Exposes safe APIs to renderer via `window.electron`

3. **Renderer Process** (`src/`)
   - Entry point: `src/main.tsx`
   - Standard React app with Vite
   - Runs in Chromium with context isolation
   - **Cannot** directly access Node.js or Electron APIs
   - Communicates with main via exposed preload APIs

### Inter-Process Communication (IPC)

The boilerplate implements **type-safe IPC** through a structured pattern:

#### Adding New IPC Channels

1. **Define Types** (`electron/shared/types.ts`):
```typescript
export interface ElectronAPI {
  yourNewMethod: (params: ParamType) => Promise<IpcResponse<ReturnType>>
}
```

2. **Add Handler** (`electron/main/ipc-handlers.ts`):
```typescript
ipcMain.handle('channel:name', async (_event, params: ParamType): Promise<IpcResponse<ReturnType>> => {
  try {
    const result = await yourLogic(params)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```

3. **Expose in Preload** (`electron/preload/index.ts`):
```typescript
const electronAPI: ElectronAPI = {
  yourNewMethod: (params) => ipcRenderer.invoke('channel:name', params)
}
```

4. **Use in Renderer**:
```typescript
const response = await window.electron.yourNewMethod(params)
if (response.success) {
  // Handle response.data
}
```

**Important**: Always return `IpcResponse<T>` for consistent error handling.

### State Management

**Redux Toolkit** is used for global application state:

- **Store**: `src/store/index.ts` - Configure store with slices
- **Slices**: `src/store/slices/` - Feature-based state modules
- **Hooks**: `src/store/hooks.ts` - Type-safe `useAppDispatch` and `useAppSelector`

**When to use Redux**:
- Global state shared across multiple components
- Complex state logic requiring middleware
- State that needs persistence

**When to use React state**:
- Local component state
- UI state (modals, dropdowns, form inputs)
- Derived state from props

#### Adding a New Redux Slice

1. Create file in `src/store/slices/yourFeature.ts`
2. Use `createSlice` from `@reduxjs/toolkit`
3. Export actions and reducer
4. Add reducer to store in `src/store/index.ts`

### Database with Drizzle ORM

**Schema File**: `electron/main/schema.ts`
**Database Module**: `electron/main/database.ts`
**Config**: `drizzle.config.ts`

**Why Drizzle ORM?**
- **Type-Safe**: Schema in TypeScript, types auto-generated
- **No Manual SQL**: Define models once, migrations auto-generated
- **Mac App Store Compatible**: Uses better-sqlite3 (no external binaries)
- **Lightweight**: ~50KB vs Prisma's 5MB+ query engine
- **Developer Confidence**: No SQL typos, compile-time type checking
- **Production-Ready**: Automatic migrations on app updates

**Database Locations**:
- **Development**: `data/dev.db` (project directory)
- **Production**: `app.getPath('userData')/database.db` (user data directory)

---

### Workflow: Adding New Tables/Columns

#### **Step 1: Define Schema** (`electron/main/schema.ts`)

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Define your table schema
export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`)
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    // Define indexes for performance
    userIdIdx: index('idx_posts_user_id').on(table.userId),
  })
)

// Auto-generated types
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
```

#### **Step 2: Generate Migration**

```bash
npm run db:generate
```

This creates SQL migration file in `drizzle/` folder:

```
drizzle/
  0001_brave_avengers.sql  # Auto-generated SQL
  meta/                     # Migration metadata
```

**No manual SQL writing required!** Drizzle generates perfectly formatted SQL from your schema.

#### **Step 3: Migration Auto-Applies**

Next time you run the app:
```bash
npm run dev
```

Output:
```
Initializing database...
Running migrations from: /path/to/drizzle
BEGIN
CREATE TABLE `posts` (...)
INSERT INTO "__drizzle_migrations" (...)
COMMIT
✓ Migrations complete
```

**That's it!** Your database is updated automatically.

---

### Using the Database

#### **1. Create Repository** (`electron/main/database.ts`)

```typescript
import { eq, desc } from 'drizzle-orm'
import { posts, type Post, type NewPost } from './schema'

export const postRepository = {
  getAll(): Post[] {
    return getDatabase()
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .all()
  },

  getById(id: number): Post | undefined {
    return getDatabase()
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .get()
  },

  create(data: NewPost): Post {
    return getDatabase()
      .insert(posts)
      .values(data)
      .returning()
      .get()
  },

  delete(id: number): boolean {
    const result = getDatabase()
      .delete(posts)
      .where(eq(posts.id, id))
      .run()
    return result.changes > 0
  },
}
```

**Benefits**:
- ✅ Fully type-safe (TypeScript autocomplete)
- ✅ No SQL injection vulnerabilities
- ✅ Catches errors at compile time
- ✅ IDE autocomplete for all operations

#### **2. Add IPC Handler** (`electron/main/ipc-handlers.ts`)

```typescript
ipcMain.handle('db:posts:getAll', async (): Promise<IpcResponse<Post[]>> => {
  try {
    const { postRepository } = await import('./database')
    const posts = postRepository.getAll()
    return { success: true, data: posts }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get posts',
    }
  }
})
```

#### **3. Add Types** (`electron/shared/types.ts`)

```typescript
import type { Post as DrizzlePost } from '../main/schema'

export type Post = DrizzlePost  // Auto-generated from schema

export interface ElectronAPI {
  // ... existing methods
  dbPostsGetAll: () => Promise<IpcResponse<Post[]>>
}
```

#### **4. Expose in Preload** (`electron/preload/index.ts`)

```typescript
const electronAPI: ElectronAPI = {
  // ... existing methods
  dbPostsGetAll: () => ipcRenderer.invoke('db:posts:getAll'),
}
```

#### **5. Use in Renderer**

```typescript
import { useEffect, useState } from 'react'
import type { Post } from '@/../electron/shared/types'

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    async function fetchPosts() {
      const response = await window.electron.dbPostsGetAll()
      if (response.success) {
        setPosts(response.data) // Fully typed!
      }
    }
    fetchPosts()
  }, [])

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### Advanced Patterns

#### **Relationships (Joins)**

```typescript
// Get posts with author information
const postsWithAuthors = getDatabase()
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .leftJoin(users, eq(posts.userId, users.id))
  .all()
```

#### **Filters and Conditions**

```typescript
import { and, or, like, gt } from 'drizzle-orm'

// Complex query
const recentPosts = getDatabase()
  .select()
  .from(posts)
  .where(
    and(
      like(posts.title, '%Electron%'),
      gt(posts.createdAt, '2025-01-01')
    )
  )
  .all()
```

#### **Transactions**

```typescript
const db = getDatabase()

db.transaction((tx) => {
  const user = tx.insert(users).values({ email: 'test@example.com' }).returning().get()
  tx.insert(posts).values({ userId: user.id, title: 'First Post' }).run()
})
```

---

### Production Deployment

When users update your app from v1.0 to v2.0:

**User's Machine:**
1. User downloads update from Mac App Store
2. Launches app
3. App initializes: `initializeDatabase()`
4. Drizzle reads migration history from `__drizzle_migrations`
5. Runs pending migrations (e.g., migration 0001)
6. Updates database schema
7. App continues normally

**User experience**: Seamless, automatic, invisible ✨

**Data Safety**:
- ✅ Migrations run in transaction (all-or-nothing)
- ✅ User's existing data preserved
- ✅ Schema updated automatically
- ✅ No manual steps required

---

### Development Tools

#### **Drizzle Studio** (Database GUI)

```bash
npm run db:studio
```

Opens a web-based database viewer at `https://local.drizzle.studio`:
- Browse tables visually
- Edit data directly
- See relationships
- No SQL required

#### **Push Schema** (Development Only)

```bash
npm run db:push
```

Pushes schema changes directly to database without creating migration files. **Only use in development!**

---

### App Store Considerations

✅ **Mac App Store Compatible**:
- Uses `app.getPath('userData')` for sandbox compliance
- No external binaries to code-sign
- WAL mode enabled for performance
- Foreign keys enforced
- Lightweight (~550KB total)

✅ **Type Safety**:
- Schema is source of truth
- Compile-time error checking
- Auto-generated types
- No runtime schema mismatches

✅ **Developer Confidence**:
- Can't ship broken migrations (TypeScript catches errors)
- Auto-generated SQL is always valid
- Schema changes are trackable in git
- Clear migration history

### UI Components (shadcn/ui)

**Component Location**: `src/components/ui/`

**Adding Components**:
```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

Components are copied into your project (not npm installed) for full customization.

**Styling**:
- Uses Tailwind CSS with CSS variables for theming
- Theme defined in `src/index.css` under `:root` and `.dark`
- Utility function: `cn()` in `src/lib/utils.ts` for conditional classes

**Design System**:
- **Colors**: Black (`hsl(0 0% 10%)`) and white (`hsl(0 0% 100%)`) based
- **Font**: Inter with weights 300, 400, 500, 600, 700
- **Radius**: `--radius` variable (default: 0.5rem)
- **Spacing**: Tailwind's default scale (4px base)

### System Tray

**Implementation**: `electron/main/system-tray.ts`

Features:
- Persistent icon in system tray
- Context menu with custom actions
- Click to show/hide window
- Minimize to tray instead of closing

**Customization**:
- Replace icon at `public/icon.png` (16x16 or 32x32)
- Modify menu in `createSystemTray()` function
- Menu supports: labels, separators, roles, submenus, click handlers

### Window State Management

**Implementation**: `electron/main/window-state-manager.ts`

**Automatic Features**:
- Saves window size and position on resize/move
- Restores state on app restart
- Validates saved position is on-screen (handles disconnected monitors)
- Tracks maximized state

**Storage**: Uses `electron-store` (JSON file in user data directory)

**Customization**:
- Change default size in `DEFAULT_WIDTH` and `DEFAULT_HEIGHT` constants
- Add additional properties to `WindowState` interface
- Extend tracking in `track()` method

### Native Notifications

**Usage** (from renderer):
```typescript
await window.electron.showNotification({
  title: 'Notification Title',
  body: 'Notification body text'
})
```

**Handler**: `electron/main/ipc-handlers.ts` - `notification:show`

Uses Electron's `Notification` API. Notifications follow OS-native styling and behavior.

## Navigation System

The boilerplate includes a fully-featured, extensible navigation system following desktop app best practices (similar to VS Code, Slack, Discord).

### Architecture

**Components:**
- **Sidebar** (`src/components/Sidebar.tsx`) - Renders navigation menu with icons
- **Layout** (`src/components/Layout.tsx`) - Wraps sidebar + content area
- **PageRouter** (`src/components/PageRouter.tsx`) - Maps page IDs to components
- **Navigation Context** (`src/contexts/NavigationContext.tsx`) - Manages current page state
- **Navigation Config** (`src/config/navigation.tsx`) - Single source of truth for nav items

**Flow:**
1. User clicks sidebar item → triggers `navigateTo(pageId)`
2. Context updates `currentPage` state
3. PageRouter renders corresponding page component
4. Sidebar highlights active page

### Adding a New Page

**3-Step Process:**

#### 1. Create Page Component

```bash
# Create new page file
touch src/pages/MyFeaturePage.tsx
```

```typescript
// src/pages/MyFeaturePage.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function MyFeaturePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">My Feature</h1>
        <p className="text-lg text-muted-foreground">Description of my feature</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>Your feature content</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Your feature UI */}
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 2. Register in Navigation Config

```typescript
// src/config/navigation.tsx
import { MyIcon } from 'lucide-react'

export const navigationItems: NavigationItem[] = [
  // ... existing items
  {
    id: 'my-feature',  // Must match PageRouter key
    label: 'My Feature',
    icon: MyIcon,
    // Optional properties:
    badge: '3',        // Show badge with number/text
    disabled: false,   // Disable navigation item
    divider: true,     // Show separator after this item
  },
]
```

#### 3. Add to PageRouter

```typescript
// src/components/PageRouter.tsx
import { MyFeaturePage } from '@/pages/MyFeaturePage'

const pageComponents: Record<PageId, () => JSX.Element> = {
  // ... existing pages
  'my-feature': MyFeaturePage,  // ID matches navigation config
}
```

**That's it!** The page will automatically appear in the sidebar and be navigable.

### Navigation Configuration Options

**NavigationItem Properties:**

```typescript
interface NavigationItem {
  id: string          // Unique identifier (used in routing)
  label: string       // Display name in sidebar
  icon: LucideIcon    // Icon component from lucide-react
  badge?: string | number  // Optional badge (e.g., notification count)
  disabled?: boolean  // Disable navigation (grayed out)
  divider?: boolean   // Add visual separator after item
}
```

**Icon Library:**

All icons come from [lucide-react](https://lucide.dev/icons). Common choices:
- `Home`, `Settings`, `Info`, `User`, `FileText`
- `Code`, `Database`, `Bell`, `Search`, `HelpCircle`
- `Zap`, `Shield`, `Lock`, `Mail`, `Calendar`

### Customization Examples

**Add Badge (Notification Count):**
```typescript
{
  id: 'messages',
  label: 'Messages',
  icon: Mail,
  badge: unreadCount > 0 ? unreadCount : undefined,  // Dynamic badge
}
```

**Conditional Rendering:**
```typescript
// Filter items based on user role or feature flags
export const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  ...(user.isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
]
```

**Nested/Grouped Navigation:**
```typescript
// Use dividers to create visual groups
export const navigationItems: NavigationItem[] = [
  // Main features
  { id: 'home', label: 'Home', icon: Home },
  { id: 'features', label: 'Features', icon: Code, divider: true },

  // Settings group
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'about', label: 'About', icon: Info },
]
```

### Programmatic Navigation

**From any component:**

```typescript
import { useNavigation } from '@/contexts/NavigationContext'

function MyComponent() {
  const { currentPage, navigateTo } = useNavigation()

  return (
    <button onClick={() => navigateTo('settings')}>
      Go to Settings
    </button>
  )
}
```

**Via IPC (from main process):**

```typescript
// Main process
mainWindow.webContents.send('navigate-to', 'settings')

// Already wired up - see electron/preload/index.ts
```

### Page Structure Best Practices

**Consistent Layout:**

```typescript
export function YourPage() {
  return (
    <div className="space-y-8">
      {/* Header - ALWAYS include */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Page Title</h1>
        <p className="text-lg text-muted-foreground">Page description</p>
      </div>

      {/* Content - Use Cards for sections */}
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
          <CardDescription>Section description</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Section content */}
        </CardContent>
      </Card>

      {/* Multiple sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>{/* Card 1 */}</Card>
        <Card>{/* Card 2 */}</Card>
      </div>
    </div>
  )
}
```

**Responsive Grids:**
- Single column: `<div className="space-y-8">`
- Two columns: `<div className="grid gap-6 md:grid-cols-2">`
- Three columns: `<div className="grid gap-6 md:grid-cols-3">`

### Removing a Page

1. Remove item from `src/config/navigation.tsx`
2. Remove page from `src/components/PageRouter.tsx`
3. Delete page file from `src/pages/`

The navigation system is fully type-safe - TypeScript will error if page IDs don't match.

### Advanced: Multi-Level Navigation

For complex apps needing sub-navigation:

1. **Option A**: Use tabs within a page (shadcn/ui Tabs component)
2. **Option B**: Create nested context with sub-routes
3. **Option C**: Use state-based views within a single page

**Example with Tabs:**

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SettingsPage() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="general">{/* General settings */}</TabsContent>
      <TabsContent value="appearance">{/* Appearance settings */}</TabsContent>
      <TabsContent value="advanced">{/* Advanced settings */}</TabsContent>
    </Tabs>
  )
}
```

## Testing Strategy

**Framework**: Vitest + React Testing Library

**Test Location**: `src/test/`

**Setup**: `src/test/setup.ts` - Global test configuration and mocks

**Running Tests**:
- `npm test` - Run all tests
- `npm run test:ui` - Visual test runner
- `npx vitest path/to/test.tsx` - Run specific test

**Mocking Electron APIs**:
```typescript
global.window.electron = {
  yourMethod: async () => ({ success: true, data: mockData })
}
```

**Best Practices**:
- Test user interactions, not implementation details
- Mock IPC calls in tests
- Use `screen.getByRole` over `getByTestId`
- Test error states and loading states

## Code Quality

### ESLint Configuration

**Config**: `.eslintrc.json`

**Rules**:
- React hooks rules enforced
- TypeScript recommended rules
- No unused variables (warn)
- Compatible with Prettier

**Custom Rules**:
- `react/react-in-jsx-scope`: off (React 18 auto-import)
- Unused vars with `_` prefix are allowed

### Prettier Configuration

**Config**: `.prettierrc`

**Format**:
- No semicolons
- Single quotes
- 2 space indentation
- 100 character line width
- ES5 trailing commas

### TypeScript

**Config**: `tsconfig.json`

**Path Aliases**:
- `@/*` → `src/*`
- `@main/*` → `electron/main/*`
- `@preload/*` → `electron/preload/*`

**Strict Mode**: Enabled for maximum type safety

**When adding new paths**: Update `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`

## File Organization

### When Creating New Features

1. **Pages**: `src/pages/FeatureNamePage.tsx` (see Navigation System section)
2. **Navigation**: Add to `src/config/navigation.tsx` and `src/components/PageRouter.tsx`
3. **React Components**: `src/components/[feature]/ComponentName.tsx`
4. **UI Components**: `src/components/ui/` (via shadcn CLI)
5. **Redux Slices**: `src/store/slices/featureName.ts`
6. **IPC Handlers**: Add to `electron/main/ipc-handlers.ts` or create feature-specific file
7. **Types**: `electron/shared/types.ts` for IPC, inline for component-specific
8. **Tests**: `src/test/[feature]/ComponentName.test.tsx`
9. **Database Schema**: Define in `electron/main/schema.ts`, generate migrations with `npm run db:generate`

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **IPC Channels**: `category:action` (`db:getUsers`, `app:quit`)
- **Redux Actions**: `feature/actionName` (auto-generated by createSlice)

## Common Patterns

### Loading States with Redux

```typescript
const [loading, setLoading] = useState(false)
const response = await window.electron.fetchData()
if (response.success) {
  dispatch(setData(response.data))
}
```

### Error Handling

```typescript
const response = await window.electron.riskyOperation()
if (!response.success) {
  console.error(response.error)
  // Show user-friendly error
  toast({ title: 'Error', description: response.error })
}
```

### Environment-Specific Code

```typescript
// Development only
if (VITE_DEV_SERVER_URL) {
  mainWindow.webContents.openDevTools()
}

// Production only
if (!VITE_DEV_SERVER_URL) {
  // Production-specific logic
}
```

### Accessing Main Process from Renderer

**Never** try to `require('electron')` in renderer. Always use the exposed API:

```typescript
// ❌ Wrong
const { ipcRenderer } = require('electron')

// ✅ Correct
const result = await window.electron.yourMethod()
```

## Security Considerations

1. **Context Isolation**: Always enabled - don't disable it
2. **Node Integration**: Disabled in renderer - don't enable it
3. **IPC Validation**: Always validate renderer input in main process handlers
4. **External URLs**: Use `shell.openExternal()`, not `window.open()`
5. **Content Security Policy**: Consider adding CSP headers for production
6. **Sensitive Data**: Never log sensitive data; store securely using OS keychain

## Build & Distribution

### Build Process

1. TypeScript compiles to JavaScript
2. Vite bundles renderer process
3. electron-builder packages app with native modules
4. Output in `release/{version}/`

### Platform-Specific Builds

- **macOS**: .dmg (installer), .zip (portable)
- **Windows**: .exe (NSIS installer), .zip (portable)
- **Linux**: .AppImage (universal), .deb (Debian/Ubuntu)

### Auto-Updater

**Not included** in boilerplate. To add:
1. Install `electron-updater`
2. Configure in `electron/main/index.ts`
3. Set up update server or use GitHub releases
4. Add update checks in app lifecycle

## Troubleshooting

### Hot Reload Not Working

- Check Vite dev server is running on port 5173
- Restart dev server: `npm run dev`
- Clear dist folders: `rm -rf dist dist-electron`

### IPC Not Working

- Check channel name matches in handler, preload, and types
- Verify handler is registered in `setupIPC()`
- Check preload script is loaded: `console.log(window.electron)`
- Ensure context isolation is enabled

### Database Errors

- **Migration fails**: Check `drizzle/` folder for generated SQL, ensure schema.ts is valid
- **Schema mismatch**: Run `npm run db:generate` to create new migration
- **Reset database**: Delete `data/dev.db*` and restart app (migrations will recreate schema)
- **Production database location**: `app.getPath('userData')/database.db`
- **View database**: Run `npm run db:studio` to open Drizzle Studio GUI

### Build Errors

- Clear caches: `rm -rf dist dist-electron node_modules/.vite`
- Reinstall: `rm -rf node_modules && npm install`
- Check native module compatibility with Electron version

### Native Module Errors

If you encounter errors related to native modules (like `better-sqlite3`), especially after upgrading Electron:

- **Automatic rebuild**: The `postinstall` script automatically rebuilds native modules after `npm install`
- **Manual rebuild**: Run `npm run rebuild` to rebuild native modules for your current Electron version
- **Fresh install**: If problems persist, delete `node_modules` and run `npm install` again

**Note**: This boilerplate includes `@electron/rebuild` which automatically handles native module compatibility across different Electron versions.

### Window Not Appearing

- Check `windowStateManager.getState()` returns valid bounds
- Verify display is connected if using saved position
- Check console for errors in main process

## Deployment Checklist

Before deploying new versions based on this boilerplate:

1. Update version in `package.json`
2. Update app name and ID in `package.json` build config
3. Replace placeholder icons with your app icons
4. Remove example code from `App.tsx`
5. Update database schema for your needs
6. Configure production database connection
7. Add error tracking (Sentry, etc.)
8. Test build on all target platforms
9. Set up code signing for macOS and Windows
10. Configure auto-updater if needed

## Additional Resources

- Check README.md for user-facing documentation
- See inline code comments for implementation details
- Refer to official docs for Electron, React, Vite, Redux, Prisma
