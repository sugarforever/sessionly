# Open Design Skill

A community SKILL.md companion to [Open Design](https://github.com/nexu-io/open-design):
a thin wrapper that brings Open Design's curated catalogue into any agent
session following the SKILL.md convention (Claude Code, Codex, Cursor,
Gemini CLI, OpenCode, …) — **without** running Open Design's local
daemon.

## What's in the catalogue

- **150+ brand DESIGN.md files** (Airbnb, Apple, BMW, Bugatti, Claude,
  Cursor, Discord, Figma, Framer, Stripe, …).
- **110+ rendering templates** for decks, prototypes, dashboards, landing
  pages, posters, image/video/audio.
- **130+ functional skills** (briefs, audits, copywriting, critique, …).
- **11 craft references** — universal brand-agnostic rules (typography,
  color, anti-AI-slop, accessibility, animation, RTL, …).

What this skill does, in one sentence: lets the agent pick a design system
plus a template/skill once per project, layer in the craft rules that
template opts into, and follow the resulting composed workflow — the same
prompt composition Open Design's daemon does, without needing the daemon
to be running.

## Install

### Via Vercel's `skills` CLI (recommended)

```bash
npx skills add sugarforever/open-design-skill
```

The CLI auto-discovers the `SKILL.md` at the repo root and copies / symlinks
it into your agent's skills directory (e.g.
`~/.claude/skills/open-design/`, `~/.codex/skills/open-design/`, etc.).
Works with Claude Code, Codex, Cursor Agent, OpenCode, Gemini CLI, and
others that follow the SKILL.md convention.

### Manual install (Claude Code)

```bash
git clone https://github.com/sugarforever/open-design-skill \
  ~/.claude/skills/open-design
```

## Prerequisite: clone the Open Design content repo

This skill is a thin wrapper. The actual content (design systems, templates,
craft rules) lives in the Open Design repo and must be cloned locally. The
skill will offer to do this on first use, but you can do it manually:

```bash
git clone https://github.com/nexu-io/open-design ~/.open-design-skill/repo
```

Or, if you already have an Open Design checkout elsewhere, set the env var:

```bash
export OPEN_DESIGN_ROOT=/path/to/your/open-design
```

`OPEN_DESIGN_ROOT` takes precedence over the default `~/.open-design-skill/repo`.

## Usage

Once installed, invoke implicitly by asking your agent to do design work:

> "Make me a pitch deck for my seed round."
>
> "Build a SaaS landing page with the Stripe design system."
>
> "Apply the BMW brand to my homepage."
>
> "Set up a design system for my project."

Or invoke explicitly:

> "Use Open Design to build a dashboard."

The agent will:

1. Check that the Open Design content is cloned locally (offer to clone if
   not).
2. Look for `.open-design.json` in your project (the per-project binding).
3. If absent: offer to `git pull` the content first, then walk you through
   picking one design system and one template/skill via `AskUserQuestion`.
   Save the choice to `.open-design.json`.
4. If present: skip directly to following the bound workflow.
5. Compose the chosen DESIGN.md + opted-in craft rules + the template's
   SKILL.md body, and execute the workflow — writing artifacts (HTML, JSX,
   markdown, etc.) into your project directory.

## How it differs from running Open Design itself

This skill is `Stage 1` of bringing Open Design to existing projects. It
proxies **content** (design systems, templates, craft) into the agent's
session. It does **not** include:

- The in-browser iframe preview surface.
- Comment-mode surgical edits on the rendered artifact.
- Slider parameters that re-prompt the agent on change.
- `od.mode` routing into different render surfaces.

Those features live in Open Design's local daemon. For preview and
debugging while iterating on the artifact in your project, use your
agent's standard tools — start a dev server, use the chrome-devtools MCP
or playwright to inspect.

## Per-project binding (`.open-design.json`)

After the first pick flow completes, the skill writes a small JSON file at
the root of your project:

```json
{
  "version": 1,
  "designSystem": {
    "slug": "bmw",
    "path": "design-systems/bmw"
  },
  "skill": {
    "slug": "html-ppt-pitch-deck",
    "path": "design-templates/html-ppt-pitch-deck",
    "kind": "design-template",
    "mode": "deck"
  },
  "boundAt": "2026-05-20T13:22:00Z"
}
```

This is the same role as Open Design's `project.skillId` +
`project.designSystemId` columns — a per-project record of "we picked X
and Y." Subsequent agent turns short-circuit the pick flow and read these
two files directly. To re-pick, delete the file or tell the agent to
"switch design system" / "re-pick template".

Commit this file to git if you want design choices to persist across
collaborators. Add to `.gitignore` if you'd rather each developer make
their own pick.

## Cross-platform support

The four list scripts are Node.js (`.mjs`) with no external dependencies.
Works on macOS, Linux, and Windows (no bash, no awk, no shell-specific
syntax). Requires Node 16+ and `git` on PATH.

## Layout

```
open-design-skill/
├── SKILL.md          ← skill entry: workflow runbook the agent follows
├── README.md         ← this file
├── LICENSE
├── .gitattributes    ← enforces LF line endings cross-platform
└── scripts/
    ├── _parse.mjs                   ← shared frontmatter + helpers
    ├── list-design-systems.mjs      ← lists OD design systems (TSV)
    ├── list-design-templates.mjs    ← lists OD rendering templates (TSV)
    ├── list-skills.mjs              ← lists OD functional skills (TSV)
    └── list-craft.mjs               ← lists OD craft references (TSV)
```

The scripts all read from `$OPEN_DESIGN_ROOT` (default
`~/.open-design-skill/repo`) and emit tab-separated values to stdout with a
header row. You can run them yourself to inspect what's available:

```bash
node scripts/list-design-systems.mjs | column -t -s $'\t' | less
node scripts/list-design-templates.mjs | grep -P '\tdeck\t'
node scripts/list-skills.mjs | awk -F'\t' '$4 != "-"'   # stubs only
node scripts/list-craft.mjs
```

## License

MIT — see [LICENSE](LICENSE).

Open Design itself is maintained at https://github.com/nexu-io/open-design
under its own license.
