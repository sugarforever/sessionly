#!/usr/bin/env node
// List Open Design rendering templates (decks, prototypes, image/video/audio).
// Output: TSV with header. Columns:
//   slug  mode  category  upstream  name  description  triggers
//
// Reads from $OPEN_DESIGN_ROOT (default ~/.open-design-skill/repo).

import fs from 'node:fs';
import path from 'node:path';
import { resolveRoot, failIfMissing, listSubdirs, parseSkillFrontmatter, row } from './_parse.mjs';

const dir = path.join(resolveRoot(), 'design-templates');
failIfMissing(dir, 'design-templates');

row(['slug', 'mode', 'category', 'upstream', 'name', 'description', 'triggers']);

for (const [slug, full] of listSubdirs(dir)) {
  const skillPath = path.join(full, 'SKILL.md');
  if (!fs.existsSync(skillPath)) continue;
  const fm = parseSkillFrontmatter(skillPath);
  row([
    slug,
    fm.od.mode,
    fm.od.category,
    fm.od.upstream,
    fm.name,
    fm.description,
    fm.triggers.length ? fm.triggers.join(', ') : '',
  ]);
}
