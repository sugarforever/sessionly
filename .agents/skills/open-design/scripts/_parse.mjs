// Shared helpers for the four list scripts.
//
// Cross-platform Node.js (16+). No external dependencies.
// All scripts emit TSV to stdout: header line first, one entry per row.
// Missing fields are written as "-" so column counts stay stable.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Gracefully exit when stdout is piped to a tool that closes early (e.g.
// `node list-*.mjs | head`). Without this, Node throws EPIPE and clutters
// the output the agent has to parse.
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const HEX_HOME = os.homedir();

export function resolveRoot() {
  const env = process.env.OPEN_DESIGN_ROOT;
  if (env && env.trim() !== '') {
    return env.startsWith('~')
      ? path.join(HEX_HOME, env.slice(1))
      : env;
  }
  return path.join(HEX_HOME, '.open-design-skill', 'repo');
}

export function failIfMissing(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    const root = resolveRoot();
    process.stderr.write(
      [
        `ERROR: ${label} not found at: ${dir}`,
        `Hint: clone Open Design first, e.g.`,
        `  git clone https://github.com/nexu-io/open-design "${root}"`,
        `Or set OPEN_DESIGN_ROOT to an existing checkout.`,
        ''
      ].join('\n')
    );
    process.exit(1);
  }
}

export function nz(v) {
  return v === undefined || v === null || v === '' ? '-' : v;
}

// Strip a single layer of matching surrounding quotes (single or double).
function unquote(s) {
  const t = s.trim();
  if (t.length >= 2) {
    const a = t.charAt(0);
    const b = t.charAt(t.length - 1);
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1);
    }
  }
  return t;
}

// Collapse tabs/newlines/CRs to single spaces so the TSV stays clean.
function clean(s) {
  return String(s).replace(/[\t\r\n]+/g, ' ').trim();
}

// Parse the YAML frontmatter at the top of a SKILL.md file.
// Returns an object with: name, description (first line of inline or block),
// triggers (string[]), od (object: mode, category, upstream — only the fields
// we care about). Robust to the small set of YAML shapes Open Design uses;
// not a general YAML parser.
export function parseSkillFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  // Find frontmatter boundaries
  if (lines[0] !== '---') {
    return { name: '', description: '', triggers: [], od: {} };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { end = i; break; }
  }
  if (end === -1) return { name: '', description: '', triggers: [], od: {} };

  const out = { name: '', description: '', triggers: [], od: {} };
  let i = 1;
  while (i < end) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === '') { i++; continue; }

    // name: <value>
    const mName = line.match(/^name:\s+(.*)$/);
    if (mName) { out.name = clean(unquote(mName[1])); i++; continue; }

    // description: <value>   (inline)
    // description: |          (block — take first non-empty content line)
    // description: >          (folded — same treatment)
    const mDescInline = line.match(/^description:\s+(.+)$/);
    const mDescBlock = line.match(/^description:\s*[|>]\s*$/);
    if (mDescBlock) {
      i++;
      while (i < end) {
        const cont = lines[i];
        if (!/^\s/.test(cont)) break;
        const stripped = cont.replace(/^\s+/, '');
        if (stripped !== '' && out.description === '') {
          out.description = clean(stripped);
          // Continue to consume the rest of the block but don't overwrite.
        }
        i++;
      }
      continue;
    }
    if (mDescInline) {
      out.description = clean(unquote(mDescInline[1]));
      i++;
      continue;
    }

    // triggers: <list>
    if (/^triggers:\s*$/.test(line)) {
      i++;
      while (i < end) {
        const cont = lines[i];
        const mItem = cont.match(/^\s+-\s+(.*)$/);
        if (!mItem) break;
        out.triggers.push(clean(unquote(mItem[1])));
        i++;
      }
      continue;
    }

    // od: <block>
    if (/^od:\s*$/.test(line)) {
      i++;
      while (i < end) {
        const cont = lines[i];
        // End of od block when a line has no leading whitespace
        if (!/^\s/.test(cont)) break;
        const mKv = cont.match(/^\s+([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (mKv) {
          const k = mKv[1];
          const vRaw = mKv[2];
          if (k === 'mode' || k === 'category' || k === 'upstream') {
            out.od[k] = clean(unquote(vRaw));
          }
        }
        i++;
      }
      continue;
    }

    // Unknown top-level key — skip
    i++;
  }

  return out;
}

// Parse design-systems/<slug>/DESIGN.md for: title, category, description.
// The convention is:
//   # <Title>
//   (blank)
//   > Category: <Category>
//   > <one-line description>
// Falls back gracefully if the header shape differs.
export function parseDesignSystemHeader(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const out = { title: '', category: '', description: '' };

  if (lines.length > 0) {
    const m = lines[0].match(/^#\s*(.+?)\s*$/);
    if (m) out.title = clean(m[1]);
  }
  let seenCategory = false;
  for (let i = 1; i < lines.length && i < 20; i++) {
    const line = lines[i];
    if (/^#/.test(line)) break; // entered the first section
    if (!seenCategory) {
      const mC = line.match(/^>\s*Category:\s*(.+?)\s*$/);
      if (mC) { out.category = clean(mC[1]); seenCategory = true; continue; }
    } else {
      const mD = line.match(/^>\s*(.+?)\s*$/);
      if (mD) { out.description = clean(mD[1]); break; }
    }
  }
  return out;
}

// Parse craft/<slug>.md for: title (line 1), description (first content line).
export function parseCraftHeader(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const out = { title: '', description: '' };
  if (lines.length > 0) {
    const m = lines[0].match(/^#\s*(.+?)\s*$/);
    if (m) out.title = clean(m[1]);
  }
  for (let i = 1; i < lines.length && i < 40; i++) {
    const line = lines[i];
    if (line.trim() === '' || /^#/.test(line)) continue;
    out.description = clean(line);
    break;
  }
  return out;
}

// Walk one level of subdirectories, returning [slug, fullPath].
export function listSubdirs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => [e.name, path.join(dir, e.name)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

// Print one TSV row to stdout.
export function row(cols) {
  process.stdout.write(cols.map((c) => nz(c)).join('\t') + '\n');
}
