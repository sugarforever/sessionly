#!/usr/bin/env node
// List Open Design design systems (DESIGN.md brand specifications).
// Output: TSV with header. Columns:
//   slug  title  category  description
//
// Reads from $OPEN_DESIGN_ROOT (default ~/.open-design-skill/repo).

import fs from 'node:fs';
import path from 'node:path';
import { resolveRoot, failIfMissing, listSubdirs, parseDesignSystemHeader, row } from './_parse.mjs';

const dir = path.join(resolveRoot(), 'design-systems');
failIfMissing(dir, 'design-systems');

row(['slug', 'title', 'category', 'description']);

for (const [slug, full] of listSubdirs(dir)) {
  const designPath = path.join(full, 'DESIGN.md');
  if (!fs.existsSync(designPath)) continue;
  const h = parseDesignSystemHeader(designPath);
  row([slug, h.title, h.category, h.description]);
}
