#!/usr/bin/env node
/**
 * PostToolUse hook — rebuilds agent indexes when relevant files change.
 *
 * Triggered by Claude Code after Write or Edit tool calls.
 * Reads the tool input from stdin (JSON), checks the file path,
 * and runs the appropriate build-index.mjs tier.
 *
 * Tiers:
 *   --tier=1  stage-manifest.json + stage-map.json  (analyzer changes)
 *   --tier=2  handoff-index.json                    (handoff writes)
 *
 * Debounce: skips rebuild if the same tier was rebuilt within DEBOUNCE_MS.
 * Prevents redundant rebuilds during bursts of analyzer edits.
 *
 * Never blocks or errors visibly — index failures must not interrupt agent work.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEBOUNCE_MS = 7000; // 7 seconds — covers typical burst of sequential edits

try {
  // Read stdin via fd 0 — cross-platform (Windows Node lacks /dev/stdin)
  const raw = fs.readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');

  const cwd = path.resolve(__dirname, '../..');
  const indexScript = path.join(cwd, 'scripts/build-index.mjs');

  if (!fs.existsSync(indexScript)) process.exit(0);

  let tier = null;
  if (filePath.includes('Docs/AGENTS/Handoffs')) {
    tier = '2';
  } else if (filePath.includes('apps/web/src/lib/analyzer')) {
    tier = '1';
  }

  if (!tier) process.exit(0);

  // Debounce: skip if this tier was rebuilt recently
  const stampFile = path.join(cwd, `.index-rebuild-stamp-tier${tier}`);
  const now = Date.now();
  try {
    const last = parseInt(fs.readFileSync(stampFile, 'utf8'), 10);
    if (now - last < DEBOUNCE_MS) process.exit(0);
  } catch (_) {
    // No stamp file yet — proceed
  }

  execSync(`node scripts/build-index.mjs --tier=${tier}`, { cwd, stdio: 'pipe' });
  fs.writeFileSync(stampFile, String(now));
} catch (_) {
  // Never block agent work on index errors
}

process.exit(0);
