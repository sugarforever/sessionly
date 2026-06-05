# Electron → Tauri Bridge Release — Design

**Date:** 2026-06-05
**Status:** Approved (design) — pending spec review
**Author:** Claude + @sugarforever

## Problem

Sessionly migrated from Electron to Tauri v2 (commit `54dd617`, Feb 2026). All published releases up to and including **v1.1.1** are **Electron** builds: their auto-update relies on `electron-updater`, which on startup reads a channel manifest (`latest-mac.yml` / `latest.yml` / `latest-linux.yml`) from the *latest* GitHub release and compares versions.

The upcoming Tauri **v2.0.0** release publishes a `latest.json` manifest (Tauri updater format) and **no** `latest*.yml`. Consequences for existing v1.1.1 users:

- Their `electron-updater` requests `latest*.yml` from the latest release → **404** → the check fails silently → they are **never told 2.0.0 exists** and remain stranded on v1.1.1.
- `electron-updater` reads the manifest only from the *latest* release; it does **not** fall back to older releases. So leaving the old `latest.yml` on the v1.1.1 release does not reach them.
- The Electron and Tauri updaters are mutually incompatible: an Electron app cannot install a Tauri bundle (different package format, signature scheme, and the v1.1.1 build has no Tauri pubkey).

**Goal:** give existing v1.1.1 users an in-app, visible path to migrate to Tauri 2.0.0, while letting them keep using the old app until they choose to migrate. Every retained user is worth the effort.

## Constraints & Non-Goals

- **Old app must remain usable.** The bridge must not block or remove old-app functionality.
- **Migration path must be visible** on every launch (strong nudge) and always available (persistent).
- **Data safety is already guaranteed** and is *not* part of this work: all session data lives in `~/.claude/projects/`, read fresh by both the Electron and Tauri apps. Switching apps loses no session data; only trivial `localStorage` prefs (theme, notification toggles) reset.
- **Non-goal:** continued feature maintenance of the Electron app. The bridge is a one-time (re-runnable) migration aid, not a parallel product.
- **Non-goal:** changing anything on `main` / the Tauri app for this feature.

## Feasibility (verified)

- v1.1.1 was macOS **code-signed (Developer ID) and notarized** (`afterSign: scripts/notarize.js`, `hardenedRuntime: true`), same `appId: app.sessionly`, published to GitHub via `electron-updater`.
- All required secrets still exist in the repo: `MAC_CERTIFICATE_P12_BASE64`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- The legacy Electron source exists at `54dd617~1` and built successfully as recently as Feb 2026 (pinned via `package-lock.json`).

**No hard blocker.** Residual risk: macOS *auto-install* requires the bridge to be signed with the *same* Developer ID as v1.1.1; this can only be confirmed once a build runs. If auto-install ever fails, the user is still **notified** and can download manually — the migration path holds either way.

## Decisions

| Decision | Choice |
|---|---|
| Bridge form | Old app stays fully working + launch dialog (dismissable) + persistent top banner |
| Platforms | macOS, Windows, Linux (matching original v1.1.1) |
| Bridge version | **1.1.2** (semantically "last v1, tells you to upgrade") |
| Download target | `https://github.com/sugarforever/sessionly/releases/latest` |
| Build/publish mechanism | Dedicated `legacy-electron` branch + `bridge-release.yml` workflow that uploads electron assets onto the existing v2.0.0 release |

## Architecture

### Component 1 — `legacy-electron` branch

- Created from `54dd617~1` (last Electron commit at v1.1.1).
- `main` is never touched by this work; it stays pure Tauri.
- This branch is the only place bridge releases are built from. It can be re-used for future bridge re-runs if needed.

### Component 2 — Bridge UI (on `legacy-electron`)

Minimal, low-risk additions to the existing Electron renderer (`src/`):

- **`MigrationNotice` modal** — shown once per app launch. Copy: "Sessionly has moved to a new app — download v2.0.0 to keep getting updates. Your session data is safe." Buttons: **Download v2.0.0** (primary) and **Later** (dismiss).
- **Persistent top banner** — rendered above the app chrome, always visible after the modal is dismissed. Same **Download v2.0.0** action. Not permanently dismissable (it is the always-available path); may collapse to a slim bar.
- **Download action** — calls `shell.openExternal('https://github.com/sugarforever/sessionly/releases/latest')`. Implemented via the app's existing external-open path if one exists; otherwise a small dedicated IPC channel (`app:openExternal`) added in the main process. (Exact wiring determined during implementation by inspecting the branch's existing preload/IPC surface.)
- **Version bump** — `package.json` version → `1.1.2`. (No other version files; the legacy app only versioned `package.json`.)
- Everything else in the old app is unchanged and fully functional.

#### Settling behavior

After a v1.1.1 user installs the 1.1.2 bridge, the bridge itself runs `electron-updater` on startup, reads `latest-mac.yml` (version 1.1.2) from the v2.0.0 release, sees `1.1.2 == current` → "update not available". No re-update loop.

### Component 3 — `bridge-release.yml` workflow (on `legacy-electron`)

Manual `workflow_dispatch` with one input:

- `target_tag` (string, e.g. `v2.0.0`) — the existing GitHub release to attach bridge assets to.

Jobs (mirroring the original Electron release workflow at `54dd617~1`):

- **build-macos** (`macos-latest`): import signing cert into a temp keychain, `npm ci`, set up Python/setuptools for `node-gyp`, run `npm run build:mac` with `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` (electron-builder signs + notarizes via `afterSign`). Produces DMG, zip, `latest-mac.yml`, `.blockmap` at version 1.1.2.
- **build-windows** (`windows-latest`): `npm ci`, `npm run build:win`. Produces NSIS `.exe`, zip, `latest.yml`, `.blockmap`.
- **build-linux** (`ubuntu-22.04`): `npm ci`, `npm run build:linux`. Produces AppImage/deb/rpm, `latest-linux.yml`.

Crucially, builds run **without** `electron-builder --publish` (no auto-created `v1.1.2` release). Each job then attaches its outputs to the existing release:

```
gh release upload <target_tag> release/**/*.yml release/**/*.zip \
  release/**/*.dmg release/**/*.exe release/**/*.AppImage \
  release/**/*.deb release/**/*.rpm release/**/*.blockmap --clobber
```

(`GH_TOKEN` from `secrets.GITHUB_TOKEN`. Minimum required for auto-update per platform: the channel `*.yml` + the artifact it references — mac zip, win exe, linux AppImage. Other artifacts are uploaded for completeness / manual download.)

### Coexistence on the v2.0.0 release

The v2.0.0 release ends up holding both sets of assets with **no collisions**:

- Tauri updater manifest: `latest.json` — Electron manifests: `latest-mac.yml` / `latest.yml` / `latest-linux.yml`. Different names.
- Tauri installers: `Sessionly_2.0.0_*` (underscores) — Electron bridge installers: `Sessionly-1.1.2-*` (hyphens, version 1.1.2). Different names.
- The Tauri updater reads only `latest.json`; the Electron updater reads only `latest*.yml`. Neither sees the other.

## Data Flow (end to end)

1. Maintainer releases Tauri **v2.0.0** (with `createUpdaterArtifacts: true`, already committed on `main`). Release now exists and is "latest", carrying `latest.json` + Tauri installers.
2. Maintainer runs `bridge-release.yml` (on `legacy-electron`) with `target_tag: v2.0.0`. Electron bridge assets (v1.1.2) are uploaded onto that release.
3. A v1.1.1 user launches the old app → its shipped `electron-updater` finds `latest-mac.yml` (v1.1.2) on the latest release → fires `update-available` → the **already-shipped** "Update available → Download → Restart & Install" UI runs → installs the 1.1.2 bridge.
4. The bridge launches → shows `MigrationNotice` modal + persistent banner.
5. User clicks **Download v2.0.0** → browser opens the GitHub latest-release page → user downloads & installs the Tauri 2.0.0 app for their OS. (Or clicks **Later** and keeps using the bridge; the banner remains.)
6. Session data is intact throughout (lives in `~/.claude`).

## Required Ordering (operational, maintainer-run)

1. Land the `createUpdaterArtifacts` fix on `main` (done in commit `e061007`, on branch `fix/tauri-updater-artifacts`).
2. Release Tauri **v2.0.0** (push `v2.0.0` tag). Verify `releases/latest/download/latest.json` → 200.
3. Run `bridge-release.yml` with `target_tag: v2.0.0`.
4. Verify `releases/latest/download/latest-mac.yml` (and `latest.yml`, `latest-linux.yml`) → 200.
5. Announce out-of-band as a backstop (release notes / README) for users whose auto-check is off or who never relaunch.

The bridge **must not** be run before v2.0.0 exists (there would be no latest release to attach to, and attaching to v1.1.1 would not make it "latest").

## Error Handling & Edge Cases

- **macOS signature mismatch / notarization failure:** auto-install may fail, but `update-available` still fires → user is notified and can download manually. Migration path preserved. Detectable from the build logs and from a test install.
- **Windows unsigned NSIS:** original v1.1.1 Windows build was unsigned; SmartScreen may warn but the NSIS installer still runs. No regression.
- **Linux AppImage auto-update** is the least reliable electron-updater path; the banner/manual download is the fallback.
- **`gh release upload` name clash:** guarded by distinct Tauri vs Electron filenames; `--clobber` makes the bridge workflow idempotent (safe re-runs).
- **Nag loop:** avoided — once on 1.1.2, the manifest version equals the installed version.
- **Stale `latest*.yml` on a future release:** when a future Tauri release (e.g. 2.0.1) becomes latest *without* electron manifests, legacy users still on 1.1.1 stop being reachable via electron-updater. Mitigation: run the migration push promptly after 2.0.0; the bridge is primarily a 2.0.0-window tool. (Re-runnable against a later tag if needed.)

## Testing / Verification

- **Build verification:** `bridge-release.yml` completes on all three runners; each uploads its `*.yml` + installer to the target release.
- **Manifest reachability:** `curl -sL -o /dev/null -w "%{http_code}" .../releases/latest/download/latest-mac.yml` (and win/linux) → 200.
- **End-to-end (manual, ideally):** install a real v1.1.1 build, point it at the release, confirm it offers 1.1.2, installs, and shows the migration notice. (Best-effort; depends on having a signed v1.1.1 install and the same cert.)
- No automated unit tests are added; the bridge UI is a static notice with an external link.

## Out of Scope

- Any change to the Tauri app or `main`.
- Continued maintenance/features of the Electron app beyond the migration notice.
- Telemetry on how many users migrate (not currently instrumented).
