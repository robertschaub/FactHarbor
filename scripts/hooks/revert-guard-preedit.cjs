#!/usr/bin/env node
/* revert-guard Step 1 (optional) — before-edit reminder (PreToolUse · Edit/Write).
   If a verifier failed this session and no decision has been logged since, softly remind.
   Never blocks. Inert unless registered in .claude/settings.json. */
const fs = require('fs');
const path = require('path');

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const session = input.session_id || 'nosession';
const flag = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', 'state', `revert-guard-${session}.json`);

let s;
try { s = JSON.parse(fs.readFileSync(flag, 'utf8')); } catch { process.exit(0); }
if (!s || s.classifiedSince) process.exit(0);

const msg =
  `Reminder: last verifier failed (last-known-good ${s.baseline}). Record keep|amend|revert|quarantine|add ` +
  `and log via revert-classify.cjs before/with this edit. Revert and amend are first-class, not fallbacks.`;

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', additionalContext: msg }
}));
process.exit(0);
