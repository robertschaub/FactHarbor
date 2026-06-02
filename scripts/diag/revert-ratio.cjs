#!/usr/bin/env node
/* revert-guard Step 1 — the payoff reader. Prints the revert:amend:add distribution
   from .claude/revert-telemetry.jsonl. Run: node scripts/diag/revert-ratio.cjs */
const fs = require('fs');
const path = require('path');

const f = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', 'revert-telemetry.jsonl');
let lines = [];
try { lines = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean); } catch {}

const c = {};
for (const l of lines) {
  try { const r = JSON.parse(l); c[r.choice] = (c[r.choice] || 0) + 1; } catch {}
}
const n = lines.length || 1;
console.log(`failed-attempt decisions (n=${lines.length}):`);
for (const k of ['revert', 'amend', 'quarantine', 'add', 'keep']) {
  console.log(`  ${k.padEnd(11)} ${c[k] || 0} (${Math.round((c[k] || 0) / n * 100)}%)`);
}
