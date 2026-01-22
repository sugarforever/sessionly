# Changelog

All notable changes to Sessionly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Performance

- **Faster app startup** - Parallelized session file loading using async I/O for significantly faster startup times. Sessions now load in parallel instead of sequentially.
- **Reduced initial bundle size** - Lazy-load highlight.js on demand (~1MB savings on initial page load)
- **Optimized React rendering** - Split Redux state subscriptions to minimize unnecessary re-renders
- **Smoother scrolling** - Added `content-visibility: auto` CSS for better off-screen message performance in long conversations

### Fixed

- Fixed duplicate yml files appearing in release artifacts

---

## [1.0.9] - 2025-01-22

### Fixed
- Include yml and blockmap files in releases for auto-updater compatibility

## [1.0.8] - 2025-01-21

### Fixed
- Various bug fixes and improvements

## [1.0.7] - 2025-01-20

### Added
- Initial public release
- Browse and view Claude Code CLI session history
- Search and filter sessions by project
- Syntax-highlighted code blocks
- Dark/light theme support
- System tray integration
- Auto-updater support

---

[Unreleased]: https://github.com/sugarforever/sessionly/compare/v1.0.9...HEAD
[1.0.9]: https://github.com/sugarforever/sessionly/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/sugarforever/sessionly/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/sugarforever/sessionly/releases/tag/v1.0.7
