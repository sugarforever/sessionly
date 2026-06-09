#!/usr/bin/env node
// List Open Design craft references — universal brand-agnostic rules
// (typography, color, anti-ai-slop, accessibility-baseline, etc.) that a
// chosen template/skill opts into via `od.craft.requires`.
//
// Output: TSV with header. Columns:
//   slug  title  description
//
// Reads from $OPEN_DESIGN_ROOT (default ~/.open-design-skill/repo).

import fs from 'node:fs';
import path from 'node:path';
import { resolveRoot, failIfMissing, parseCraftHeader, row } from './_parse.mjs';

const dir = path.join(resolveRoot(), 'craft');
failIfMissing(dir, 'craft');

row(['slug', 'title', 'description']);

const entries = fs.readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.md'))
  .map((e) => e.name)
  .filter((n) => n.toUpperCase() !== 'README.MD' && !n.startsWith('_'))
  .sort();

for (const name of entries) {
  const slug = name.replace(/\.md$/, '');
  const h = parseCraftHeader(path.join(dir, name));
  row([slug, h.title, h.description]);
}
