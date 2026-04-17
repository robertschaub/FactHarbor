#!/usr/bin/env node
/**
 * install-hooks.mjs — cross-platform installer for the repo's git hooks.
 *
 * Copies scripts/git-hooks/* into .git/hooks/ and marks them executable
 * where the platform supports it (POSIX chmod; no-op on Windows).
 */

import { copyFileSync, chmodSync, existsSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const SRC  = join(REPO, 'scripts/git-hooks');
const DST  = join(REPO, '.git/hooks');

if (!existsSync(DST)) {
  console.error(`No .git/hooks directory at ${DST} — is this a git clone?`);
  process.exit(1);
}

const hooks = readdirSync(SRC).filter(f => !f.startsWith('.'));
for (const name of hooks) {
  const from = join(SRC, name);
  const to   = join(DST, name);

  if (existsSync(to)) {
    const existing = readFileSync(to, 'utf8');
    const incoming = readFileSync(from, 'utf8');
    if (existing !== incoming) {
      const backupPath = `${to}.pre-factharbor-${Date.now()}.bak`;
      renameSync(to, backupPath);
      console.warn(`backed up  ${name} -> ${backupPath}`);
    }
  }

  copyFileSync(from, to);
  try { chmodSync(to, 0o755); } catch { /* Windows — chmod not meaningful */ }
  console.log(`installed  ${name}`);
}

console.log(`${hooks.length} hook(s) installed into ${DST}`);
