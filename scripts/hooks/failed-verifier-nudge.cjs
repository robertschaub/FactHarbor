#!/usr/bin/env node
/* revert-guard Step 1 — at-failure firing (PostToolUse · Bash).
   On a FAILED verifier (test/build), record a per-session flag + baseline ref and inject a
   neutral reminder to classify+log the next move. Clear the flag only on a CONFIRMED pass.
   Node-only, no deps (Windows-safe). Inert unless registered in .claude/settings.json.

   HARNESS NOTE: PostToolUse Bash tool_response = { stdout, stderr, interrupted, ... } — there is
   NO exit code (verified live 2026-06-02). Failure/pass are inferred from OUTPUT MARKERS:
   - FAILURE markers -> set flag + nudge.
   - SUCCESS markers (separate regex) -> clear flag.
   - ambiguous (neither) -> leave the flag untouched (never clear on mere absence of failure).
   This bounds false-positive cost to "one extra nudge", never a wrong clear. If a future harness
   adds tool_response.exit_code, it is used preferentially.
   LIMITATION: output is the whole tool call, so a compound command mixing a verifier with other
   commands (`npm test; node x.js`) cannot be perfectly correlated to the verifier segment. */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (!input || input.tool_name !== 'Bash') process.exit(0);

const tr = input.tool_response || {};
if (tr.interrupted) process.exit(0);                 // user-interrupted run, not a verifier failure

const cmd = input.tool_input?.command || '';
// Verifier must START a command segment (string start or after a shell separator ; && || | newline)
// so `echo npm test`, `grep "vitest"`, `git log --grep "dotnet build"` do NOT match.
const VERIFIER = /(?:^|[\n;&|])\s*(?:npm(?:\.cmd)?\s+(?:run\s+)?test\b|npm(?:\.cmd)?\s+(?:-w|--workspace[ =])\s*\S+\s+run\s+(?:test|build)\b|npm(?:\.cmd)?\s+run\s+build\b|(?:npx\s+)?vitest\b|dotnet\s+(?:test|build)\b)/i;
if (!VERIFIER.test(cmd)) process.exit(0);

const session = input.session_id || 'nosession';
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dir = path.join(root, '.claude', 'state');
fs.mkdirSync(dir, { recursive: true });
const flag = path.join(dir, `revert-guard-${session}.json`);
const head = () => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: root }).trim(); }
  catch { return 'unknown'; }
};

const exitCode = typeof tr.exit_code === 'number' ? tr.exit_code : null;
// Strip ANSI color codes so SUMMARY-line anchoring works on real colored vitest/build output.
const out = `${tr.stdout || ''}\n${tr.stderr || ''}`.replace(/\x1B\[[0-9;]*m/g, '');
// Detect from SUMMARY lines / unambiguous build markers — NOT stray "failed"/"FAIL" in test logs.
// (Real fixture: a passing 1951-test run printed "4 failed" inside test output; whole-output
// substring scanning false-positived on every green run. Anchor to the summary instead.)
const FAILURE = new RegExp([
  '^\\s*(?:Test Files|Tests)\\b[^\\n]*\\b[1-9]\\d*\\s+failed\\b', // vitest/jest summary, >=1 failed
  '\\bFAIL\\s+\\S+\\.(?:test|spec)\\.[cm]?[jt]sx?\\b',           // a failing test FILE line
  '^\\s*Failed to compile',                                      // Next.js build
  '\\bType error:',                                              // Next/tsc
  '\\berror TS\\d+',                                             // tsc
  '\\berror CS\\d+',                                             // csc/dotnet
  '^\\s*Build FAILED',                                           // msbuild
  'Failed!\\s+-\\s+Failed:\\s*[1-9]',                            // dotnet test, >=1 failed
  '^\\s*npm (?:ERR!|error)\\b',                                  // npm script error
].join('|'), 'im');
const SUCCESS = new RegExp([
  '^\\s*(?:Test Files|Tests)\\b[^\\n]*\\bpassed\\b',             // vitest/jest summary
  'Compiled successfully',                                       // Next.js build
  '\\bBuild succeeded\\b',                                       // msbuild
  'Test Run Successful',                                         // vstest
  'Passed!\\s+-\\s+Failed:\\s*0\\b',                             // dotnet test, 0 failed
].join('|'), 'im');
const failed = exitCode !== null ? exitCode !== 0 : FAILURE.test(out);
const passed = exitCode !== null ? exitCode === 0 : (!failed && SUCCESS.test(out));

if (passed) { try { fs.rmSync(flag, { force: true }); } catch {} process.exit(0); }  // confirmed pass -> clear
if (!failed) process.exit(0);                                                          // ambiguous -> leave flag untouched

let s = {};
try { s = JSON.parse(fs.readFileSync(flag, 'utf8')); } catch {}
s.failures = (s.failures || 0) + 1;          // event counter (NOT per-symptom; Step 3 must not treat as attempts)
s.baseline = s.baseline || head();           // capture ONCE per failure chain (don't repoint to a poisoned commit)
s.classifiedSince = false;
s.lastCommand = cmd.slice(0, 120);
fs.writeFileSync(flag, JSON.stringify(s));

const safeCmd = cmd.slice(0, 80).replace(/[\r\n`]+/g, ' ');   // sanitize for the model-visible reminder
const msg =
  `Verifier failed: ${safeCmd}. Per AGENTS.md §Failed-Attempt Recovery, ` +
  `before your next edit decide and LOG one of keep|amend|revert|quarantine|add. ` +
  `Last-known-good = ${s.baseline}. Revert = restore those hunks with Edit (never git reset/checkout). ` +
  `Revert and amend are first-class, not fallbacks. Log it:\n` +
  `  node scripts/hooks/revert-classify.cjs --choice <choice> --symptom "<symptom>" --baseline ${s.baseline} --session ${session}`;

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg }
}));
process.exit(0);
