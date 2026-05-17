#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { evaluateCommand } = require('./hooks/fh-safety-policy.cjs');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assertAllowed(command) {
  assert.equal(evaluateCommand(command).allowed, true, command);
}

function assertBlocked(command, id) {
  const decision = evaluateCommand(command);
  assert.equal(decision.allowed, false, command);
  assert.equal(decision.id, id, command);
}

assertAllowed('git status --short');
assertAllowed('git push origin main --force-with-lease');
assertAllowed('node scripts/agents/invoke-claude.cjs --print hello');
assertBlocked('git reset --hard', 'git-reset-hard');
assertBlocked('git push origin main --force', 'git-push-force');
assertBlocked('git clean -fdx', 'git-clean-force');
assertBlocked('git checkout -- .', 'checkout-all');
assertBlocked('Remove-Item apps/api/factharbor.db', 'factharbor-db-delete');
assertBlocked('sqlite3 apps/api/factharbor.db .schema', 'factharbor-db-sqlite');
assertBlocked('npm -w apps/web run test:expensive', 'expensive-npm-test');
assertBlocked('npx vitest run test/unit/llm-integration.test.ts', 'expensive-vitest');
assertBlocked('claude --print hello', 'bare-claude');
assertBlocked('C:\\Users\\rober\\.local\\bin\\claude.exe --print hello', 'bare-claude');

function runHookScript(scriptPath, payload) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

const allowedPayload = { tool_name: 'Bash', tool_input: { command: 'git status --short' } };
const blockedPayload = { tool_name: 'Bash', tool_input: { command: 'git reset --hard' } };

const claudeAllowed = runHookScript('scripts/hooks/claude-pre-tool-use.cjs', allowedPayload);
assert.equal(claudeAllowed.status, 0, claudeAllowed.stderr);
const claudeBlocked = runHookScript('scripts/hooks/claude-pre-tool-use.cjs', blockedPayload);
assert.equal(claudeBlocked.status, 2);
assert.match(claudeBlocked.stderr, /git-reset-hard/);

const codexAllowed = runHookScript('scripts/hooks/codex-pre-tool-use.cjs', allowedPayload);
assert.equal(codexAllowed.status, 0, codexAllowed.stderr);
assert.equal(codexAllowed.stdout, '');
const codexBlocked = runHookScript('scripts/hooks/codex-pre-tool-use.cjs', blockedPayload);
assert.equal(codexBlocked.status, 0, codexBlocked.stderr);
const codexBlockOutput = JSON.parse(codexBlocked.stdout);
assert.equal(codexBlockOutput.hookSpecificOutput.hookEventName, 'PreToolUse');
assert.equal(codexBlockOutput.hookSpecificOutput.permissionDecision, 'deny');
assert.match(codexBlockOutput.hookSpecificOutput.permissionDecisionReason, /git-reset-hard/);

const dryRun = spawnSync(process.execPath, ['scripts/agents/invoke-claude.cjs', '--print', 'hello'], {
  cwd: repoRoot,
  env: { ...process.env, FH_INVOKE_CLAUDE_DRY_RUN: '1' },
  encoding: 'utf8',
});
assert.equal(dryRun.status, 0, dryRun.stderr);
const wrapperOutput = JSON.parse(dryRun.stdout);
assert.equal(wrapperOutput.command, 'claude');
assert.deepEqual(wrapperOutput.args.slice(0, 6), ['--model', 'claude-opus-4-6', '--effort', 'max', '--settings', path.join(repoRoot, '.claude', 'settings.json')]);
assert.equal(wrapperOutput.env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING, '1');
assert.equal(wrapperOutput.env.CLAUDE_CODE_EFFORT_LEVEL, 'max');
assert.equal(wrapperOutput.env.MAX_THINKING_TOKENS, '63999');

const codexHooks = JSON.parse(fs.readFileSync(path.join(repoRoot, '.codex', 'hooks.json'), 'utf8'));
const codexPreCommand = codexHooks.hooks.PreToolUse[0].hooks[0].command;
const codexHookFromSubdir = spawnSync(codexPreCommand, {
  cwd: path.join(repoRoot, 'apps', 'web'),
  input: JSON.stringify(blockedPayload),
  encoding: 'utf8',
  shell: true,
});
assert.equal(codexHookFromSubdir.status, 0, codexHookFromSubdir.stderr);
assert.equal(JSON.parse(codexHookFromSubdir.stdout).hookSpecificOutput.permissionDecision, 'deny');

console.log('agent hook smoke tests passed');
