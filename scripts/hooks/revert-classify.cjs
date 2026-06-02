#!/usr/bin/env node
/* revert-guard Step 1 — inline telemetry. The agent runs this to record a failed-attempt decision.
   Appends one JSON line to .claude/revert-telemetry.jsonl and clears the session failure flag.
   Usage: node scripts/hooks/revert-classify.cjs --choice revert --symptom "..." --baseline <ref> --session <id> */
const fs = require('fs');
const path = require('path');

const a = process.argv.slice(2);
const opt = (n) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };

const choice = (opt('choice') || '').toLowerCase();
const VALID = ['keep', 'amend', 'revert', 'quarantine', 'add'];
if (!VALID.includes(choice)) {
  console.error(`--choice must be one of ${VALID.join('|')}`);
  process.exit(1);
}

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// Session: explicit --session (baked into the nudge's command from stdin session_id) is
// authoritative; then the real harness env var, then the legacy name, then fallback. This MUST
// match the key the nudge/preedit hooks use (stdin session_id) or the flag never clears.
const session = opt('session') || process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_SESSION_ID || 'nosession';
const symptom = opt('symptom') || '';
const baseline = opt('baseline') || '';
if (!symptom) console.error('warning: --symptom empty; recording as "unspecified" (AGENTS.md asks for a real symptom)');

const rec = {
  ts: new Date().toISOString(),
  session,
  choice,
  symptom: symptom || 'unspecified',
  baseline: baseline || 'unknown',
};
const claudeDir = path.join(root, '.claude');
fs.mkdirSync(claudeDir, { recursive: true });
fs.appendFileSync(path.join(claudeDir, 'revert-telemetry.jsonl'), JSON.stringify(rec) + '\n');

// mark the session's failure flag as "decided" so the before-edit reminder stops
try {
  const f = path.join(claudeDir, 'state', `revert-guard-${session}.json`);
  if (fs.existsSync(f)) {
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    s.classifiedSince = true;
    fs.writeFileSync(f, JSON.stringify(s));
  }
} catch {}

console.log(`logged: ${choice} (session ${String(session).slice(0, 8)}, baseline ${rec.baseline})`);
