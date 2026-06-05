# Electron → Tauri Bridge Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a signed Electron **1.1.2 "bridge" release** that re-engages legacy v1.1.1 users (including those who dismissed the existing migration banner) with an in-app path to download Tauri **v2.0.0**, while keeping the old app fully usable.

**Architecture:** All work happens on a dedicated `legacy-electron` branch created from the last Electron commit (`d95f169`, v1.1.1). We add a launch modal, make the existing (permanently-dismissable) migration banner session-only so it returns each launch, bump the version to 1.1.2, and add a `bridge-release.yml` workflow that builds signed/notarized artifacts on all three OSes and uploads the electron-updater manifests + installers **onto the existing v2.0.0 GitHub release** (so `electron-updater` sees them as "latest"). `main` is never touched.

**Tech Stack:** Electron + electron-builder + electron-updater, React 18 + TypeScript, Vitest + React Testing Library, GitHub Actions, `gh` CLI.

---

## Context the implementer must know

- **You will work on a separate branch with a *different* working tree.** The repo root currently holds the Tauri app. After `git checkout legacy-electron` the tree becomes the old Electron app (has `electron/`, `src/components/Layout.tsx`, etc.). Run `npm ci` after checkout to install the old deps.
- **The migration banner already exists** at `src/components/MigrationBanner.tsx` and is already rendered by `src/components/Layout.tsx`. It already has a working "Download v2" button calling `window.electron.openExternal('https://github.com/sugarforever/sessionly/releases/latest')`. Its only problem: it is **permanently dismissable** via `localStorage['migration-banner-dismissed']` — once dismissed it never returns. Task 3 changes that.
- **`window.electron.openExternal(url)`** is already exposed (preload → `shell:openExternal` IPC handler). No new IPC is needed.
- **Test harness:** Vitest (jsdom). `src/test/setup.ts` already mocks `global.window.electron` including `openExternal: async () => ({ success: true, data: undefined })`. Tests live under `src/test/`. Path alias `@` → `src`. Run a single file with `npx vitest run <path>`.
- **Prerequisite for go-live (NOT part of coding):** Tauri **v2.0.0** must already be released (the `createUpdaterArtifacts` fix is committed on `main` in `e061007`). The bridge workflow uploads onto that release; do not run it before v2.0.0 exists.

## File Structure

On the `legacy-electron` branch:

- **Create** `src/components/MigrationNotice.tsx` — the launch modal (session-only, dismissable). Single responsibility: present the migration call-to-action over the app on launch.
- **Create** `src/test/components/MigrationNotice.test.tsx` — tests for the modal.
- **Create** `src/test/components/MigrationBanner.test.tsx` — tests for the (now session-only) banner.
- **Modify** `src/components/MigrationBanner.tsx` — remove permanent localStorage dismiss; make it session-only; add `aria-label` to the dismiss button.
- **Modify** `src/components/Layout.tsx` — mount `<MigrationNotice />` alongside `<MigrationBanner />`.
- **Modify** `package.json` — version `1.1.1` → `1.1.2`.
- **Create** `.github/workflows/bridge-release.yml` — the build + upload-to-existing-release workflow.

Shared constant: both `MigrationNotice` and `MigrationBanner` use the URL `https://github.com/sugarforever/sessionly/releases/latest`. Each defines it locally (a one-line const); do not over-engineer a shared module for one string.

---

### Task 1: Create the `legacy-electron` branch and install deps

**Files:** none (branch + environment setup)

- [ ] **Step 1: Create the branch from the last Electron commit**

Run from the repo root:
```bash
git branch legacy-electron d95f169
git checkout legacy-electron
```
Expected: working tree now shows the old Electron app (e.g. `ls electron/` succeeds, `src/components/MigrationBanner.tsx` exists).

- [ ] **Step 2: Verify you are on the right code**

Run:
```bash
git rev-parse HEAD            # should print d95f16981e3168d6bedd07a2425de959bc20a089
node -p "require('./package.json').version"   # 1.1.1
test -f src/components/MigrationBanner.tsx && echo "banner present"
```
Expected: hash matches, version `1.1.1`, "banner present".

- [ ] **Step 3: Install dependencies**

Run:
```bash
npm ci
```
Expected: completes; `postinstall`/electron-rebuild runs for native modules. If `npm ci` fails on lockfile mismatch, use `npm install` and note it in the commit.

- [ ] **Step 4: Confirm the test runner works before changing anything**

Run:
```bash
npx vitest run src/test/contexts/ThemeContext.test.tsx
```
Expected: PASS (sanity check that the harness runs).

No commit for this task (branch creation only).

---

### Task 2: Add the `MigrationNotice` launch modal

**Files:**
- Create: `src/components/MigrationNotice.tsx`
- Test: `src/test/components/MigrationNotice.test.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/components/MigrationNotice.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MigrationNotice } from '@/components/MigrationNotice'

describe('MigrationNotice', () => {
  it('renders the migration heading and download button on mount', () => {
    render(<MigrationNotice />)
    expect(screen.getByText('Sessionly has moved to a new app')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download v2\.0\.0/i })).toBeInTheDocument()
  })

  it('hides when Later is clicked', async () => {
    const user = userEvent.setup()
    render(<MigrationNotice />)
    await user.click(screen.getByRole('button', { name: /later/i }))
    expect(screen.queryByText('Sessionly has moved to a new app')).not.toBeInTheDocument()
  })

  it('opens the releases page when Download is clicked', async () => {
    const user = userEvent.setup()
    const openExternal = vi.spyOn(window.electron, 'openExternal')
    render(<MigrationNotice />)
    await user.click(screen.getByRole('button', { name: /download v2\.0\.0/i }))
    expect(openExternal).toHaveBeenCalledWith(
      'https://github.com/sugarforever/sessionly/releases/latest'
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/test/components/MigrationNotice.test.tsx
```
Expected: FAIL — cannot resolve `@/components/MigrationNotice` (module does not exist yet).

- [ ] **Step 3: Implement the component**

Create `src/components/MigrationNotice.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

const RELEASES_URL = 'https://github.com/sugarforever/sessionly/releases/latest'

export function MigrationNotice() {
  // Session-only: shows once per launch. Dismissing reveals the app (still
  // fully usable); the persistent MigrationBanner keeps the path visible.
  const [open, setOpen] = useState(true)

  if (!open) return null

  const handleDownload = () => {
    window.electron.openExternal(RELEASES_URL)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Sessionly has moved to a new app</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve rebuilt Sessionly with Tauri for a smaller, faster experience. Download
          v2.0.0 to keep getting updates. Your session data is safe — it stays in your
          <code className="mx-1">~/.claude</code> folder.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Later
          </Button>
          <Button className="gap-1" onClick={handleDownload}>
            <ExternalLink className="h-4 w-4" />
            Download v2.0.0
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/test/components/MigrationNotice.test.tsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Mount the modal in Layout**

In `src/components/Layout.tsx`, add the import near the other component imports:
```tsx
import { MigrationNotice } from './MigrationNotice'
```
Then render it inside the outer `LayoutContext.Provider`, immediately before `<MigrationBanner />`:
```tsx
    <LayoutContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <MigrationNotice />
        <MigrationBanner />
```

- [ ] **Step 6: Typecheck and commit**

Run:
```bash
npm run typecheck
npx vitest run src/test/components/MigrationNotice.test.tsx
```
Expected: typecheck clean; tests PASS. Then:
```bash
git add src/components/MigrationNotice.tsx src/test/components/MigrationNotice.test.tsx src/components/Layout.tsx
git commit -m "feat: add launch-time migration notice modal"
```

---

### Task 3: Make the migration banner session-only (persistent across launches)

**Files:**
- Modify: `src/components/MigrationBanner.tsx`
- Test: `src/test/components/MigrationBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/components/MigrationBanner.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MigrationBanner } from '@/components/MigrationBanner'

describe('MigrationBanner', () => {
  it('is visible on mount', () => {
    render(<MigrationBanner />)
    expect(screen.getByText('Sessionly v2 is here')).toBeInTheDocument()
  })

  it('dismiss is session-only: hides now, no persistence, returns on a fresh mount', async () => {
    const user = userEvent.setup()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    render(<MigrationBanner />)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText('Sessionly v2 is here')).not.toBeInTheDocument()
    expect(setItem).not.toHaveBeenCalledWith('migration-banner-dismissed', 'true')

    cleanup()
    render(<MigrationBanner />)
    expect(screen.getByText('Sessionly v2 is here')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/test/components/MigrationBanner.test.tsx
```
Expected: FAIL — the second test fails because the current component reads/writes `localStorage['migration-banner-dismissed']` (so it persists the dismiss and the dismiss button has no accessible name `dismiss`).

- [ ] **Step 3: Rewrite the component to be session-only**

Replace the entire contents of `src/components/MigrationBanner.tsx` with:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, X } from 'lucide-react'

const RELEASES_URL = 'https://github.com/sugarforever/sessionly/releases/latest'

export function MigrationBanner() {
  // Session-only dismiss: the banner returns on every app launch so the
  // migration path stays visible. Intentionally no persistent storage.
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDownload = () => {
    window.electron.openExternal(RELEASES_URL)
  }

  return (
    <div className="relative z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/15 px-4 py-2">
      <p className="text-sm text-amber-900 dark:text-amber-200">
        <span className="font-semibold">Sessionly v2 is here</span> — rebuilt with Tauri for a
        smaller, faster experience.
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleDownload}>
          <ExternalLink className="h-3 w-3" />
          Download v2
        </Button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/test/components/MigrationBanner.test.tsx
```
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck and commit**

Run:
```bash
npm run typecheck
```
Expected: clean. Then:
```bash
git add src/components/MigrationBanner.tsx src/test/components/MigrationBanner.test.tsx
git commit -m "feat: make migration banner session-only so it persists across launches"
```

---

### Task 4: Bump version to 1.1.2

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit the version**

In `package.json`, change:
```json
  "version": "1.1.1",
```
to:
```json
  "version": "1.1.2",
```

- [ ] **Step 2: Verify**

Run:
```bash
node -p "require('./package.json').version"
```
Expected: `1.1.2`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump bridge version to 1.1.2"
```

---

### Task 5: Add the `bridge-release.yml` workflow

**Files:**
- Create: `.github/workflows/bridge-release.yml`

This workflow builds the 1.1.2 bridge on all three OSes (reusing the legacy signing/notarization setup) and uploads the electron-updater manifests + installers onto an **existing** release identified by the `target_tag` input. It deliberately does **not** create a `v1.1.2` release.

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/bridge-release.yml`:
```yaml
name: Bridge Release (Electron 1.1.2)

# Builds the legacy Electron 1.1.2 "bridge" and attaches its electron-updater
# manifests + installers to an EXISTING release (e.g. the Tauri v2.0.0 release),
# so legacy v1.1.1 users get notified and can migrate. Run only AFTER that
# release exists. Runs from the `legacy-electron` branch.

on:
  workflow_dispatch:
    inputs:
      target_tag:
        description: 'Existing release tag to attach bridge assets to (e.g. v2.0.0)'
        required: true
        type: string

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install setuptools (for node-gyp)
        run: pip install setuptools

      - name: Install dependencies
        run: npm ci

      - name: Import Code Signing Certificate
        env:
          CERTIFICATE_P12_BASE64: ${{ secrets.MAC_CERTIFICATE_P12_BASE64 }}
          CERTIFICATE_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ github.run_id }}
        run: |
          if [ -z "$CERTIFICATE_P12_BASE64" ]; then
            echo "No certificate provided, skipping code signing setup"
            exit 0
          fi
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db
          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          echo "$CERTIFICATE_P12_BASE64" | base64 --decode > $RUNNER_TEMP/certificate.p12
          security import $RUNNER_TEMP/certificate.p12 -P "$CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH
          security find-identity -v -p codesigning $KEYCHAIN_PATH
          rm $RUNNER_TEMP/certificate.p12

      - name: Build for macOS (signed + notarized)
        run: npm run build:mac
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: bridge-macos
          path: |
            release/**/*.zip
            release/**/*.yml
            release/**/*.blockmap
          if-no-files-found: warn

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install setuptools (for node-gyp)
        run: pip install setuptools

      - name: Install dependencies
        run: npm ci

      - name: Build for Windows
        run: npm run build:win

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: bridge-windows
          path: |
            release/**/*.exe
            release/**/*.yml
            release/**/*.blockmap
          if-no-files-found: warn

  build-linux:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for Linux
        run: npm run build:linux

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: bridge-linux
          path: |
            release/**/*.AppImage
            release/**/*.yml
            release/**/*.blockmap
          if-no-files-found: warn

  attach-to-release:
    needs: [build-macos, build-windows, build-linux]
    runs-on: ubuntu-22.04
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Download all build artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Drop non-channel yml files
        run: |
          find artifacts -name 'builder-debug.yml' -delete || true
          find artifacts -name 'app-update.yml' -delete || true
          echo "Files to upload:"
          find artifacts -type f \( -name '*.yml' -o -name '*.zip' -o -name '*.exe' -o -name '*.AppImage' -o -name '*.blockmap' \)

      - name: Upload bridge assets to existing release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          find artifacts -type f \( -name '*.yml' -o -name '*.zip' -o -name '*.exe' -o -name '*.AppImage' -o -name '*.blockmap' \) -print0 \
          | while IFS= read -r -d '' f; do
              echo "Uploading: $f"
              gh release upload "${{ inputs.target_tag }}" "$f" --clobber
            done
```

- [ ] **Step 2: Sanity-check the YAML**

Run (best-effort; if `actionlint` is not installed, fall back to the python check):
```bash
actionlint .github/workflows/bridge-release.yml 2>/dev/null \
  || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/bridge-release.yml')); print('YAML OK')"
```
Expected: no errors / "YAML OK".

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/bridge-release.yml
git commit -m "ci: add bridge-release workflow to attach Electron 1.1.2 assets to a release"
```

---

### Task 6: Push the branch and document the go-live runbook

**Files:**
- Create: `docs/superpowers/plans/BRIDGE-RUNBOOK.md` (operational steps for the maintainer)

- [ ] **Step 1: Push the branch**

Run:
```bash
git push -u origin legacy-electron
```
Expected: branch published. (Do NOT open a PR into `main` — this branch is intentionally separate.)

- [ ] **Step 2: Write the runbook**

Create `docs/superpowers/plans/BRIDGE-RUNBOOK.md`:
```markdown
# Bridge Release Runbook

Run these IN ORDER. The bridge attaches assets to an existing release, so the
Tauri release must exist first.

1. Ensure the `createUpdaterArtifacts` fix is on `main` (commit e061007) and
   release **Tauri v2.0.0** (push the `v2.0.0` tag). Wait for the release job
   to finish.
2. Verify the Tauri updater manifest is live:
   `curl -sL -o /dev/null -w "%{http_code}\n" https://github.com/sugarforever/sessionly/releases/latest/download/latest.json`  → 200
3. Trigger the bridge: GitHub → Actions → "Bridge Release (Electron 1.1.2)" →
   Run workflow → branch `legacy-electron`, input `target_tag = v2.0.0`.
4. After it succeeds, verify the electron-updater manifests are live on the
   v2.0.0 release:
   - `.../releases/latest/download/latest-mac.yml`   → 200
   - `.../releases/latest/download/latest.yml`        → 200 (Windows)
   - `.../releases/latest/download/latest-linux.yml`  → 200
5. Smoke test if possible: launch a real v1.1.1 install; it should offer the
   1.1.2 update, install it, and on next launch show the migration notice.
6. Backstop: add a note to the v2.0.0 release notes / README telling v1.x users
   this is a one-time manual download and their ~/.claude data is preserved.

Notes:
- The macOS auto-INSTALL requires the bridge to be signed with the same
  Developer ID as v1.1.1. If install fails, users are still NOTIFIED and can
  download manually via the modal/banner.
- Re-running the workflow is safe (uploads use --clobber).
- Do not let a later Tauri release (2.0.1+) become "latest" without re-running
  the bridge if you still need to reach users on 1.1.1.
```

- [ ] **Step 3: Commit the runbook**

```bash
git add docs/superpowers/plans/BRIDGE-RUNBOOK.md
git commit -m "docs: add bridge release runbook"
```

---

## Self-Review

**Spec coverage:**
- Bridge form (working app + launch modal + persistent banner) → Tasks 2 (modal), 3 (persistent banner). ✓
- Platforms mac/win/linux → Task 5 (three build jobs). ✓
- Bridge version 1.1.2 → Task 4. ✓
- Download target = GitHub latest release → constant `RELEASES_URL` in Tasks 2 & 3. ✓
- `legacy-electron` branch, `main` untouched → Tasks 1 & 6. ✓
- Upload electron manifests onto the existing v2.0.0 release, no separate v1.1.2 release → Task 5 (`gh release upload <target_tag>`, no `--publish`). ✓
- Coexistence / no filename collision (Tauri `latest.json` + `Sessionly_2.0.0_*` vs Electron `latest*.yml` + `Sessionly-1.1.2-*`) → handled by distinct names; manifests uploaded as-is. ✓
- Required ordering + verification → Task 6 runbook. ✓
- Settling behavior (no nag loop) → covered by version 1.1.2 == manifest version (Task 4 + design); no code needed. ✓

**Placeholder scan:** No TBD/TODO; all component and workflow code is complete and inline. ✓

**Type/name consistency:** `RELEASES_URL` constant identical in both components; `openExternal` matches the mocked signature in `src/test/setup.ts`; dismiss button `aria-label="Dismiss"` matches the test's `name: /dismiss/i`; `target_tag` input name matches the `${{ inputs.target_tag }}` references. ✓

**Note on the macOS signing residual risk:** cannot be eliminated at plan time; the design degrades gracefully (notify-then-manual) and the runbook calls for a smoke test. Acceptable per the approved spec.
