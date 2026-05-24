#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_MODEL = 'claude-opus-4-6';

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'AGENTS.md')) && fs.existsSync(path.join(current, '.claude', 'settings.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error('Could not locate FactHarbor repo root with .claude/settings.json.');
    current = parent;
  }
}

function loadClaudeSettings(repoRoot) {
  const settingsPath = path.join(repoRoot, '.claude', 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  if (!settings.env || typeof settings.env !== 'object') throw new Error('.claude/settings.json has no env object.');
  return { settingsPath, env: settings.env };
}

function hasFlag(args, flag) {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

function withDefaultArgs(args, settingsPath, env) {
  const finalArgs = [...args];
  if (!hasFlag(finalArgs, '--settings')) finalArgs.unshift('--settings', settingsPath);
  if (!hasFlag(finalArgs, '--effort') && env.CLAUDE_CODE_EFFORT_LEVEL) finalArgs.unshift('--effort', String(env.CLAUDE_CODE_EFFORT_LEVEL));
  if (!hasFlag(finalArgs, '--model')) finalArgs.unshift('--model', DEFAULT_MODEL);
  return finalArgs;
}

function main() {
  const repoRoot = findRepoRoot(process.cwd());
  const { settingsPath, env } = loadClaudeSettings(repoRoot);
  const finalArgs = withDefaultArgs(process.argv.slice(2), settingsPath, env);
  const childEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) childEnv[key] = String(value);

  if (process.env.FH_INVOKE_CLAUDE_DRY_RUN === '1') {
    process.stdout.write(`${JSON.stringify({
      command: process.env.FH_CLAUDE_BIN || 'claude',
      args: finalArgs,
      env: Object.fromEntries(Object.keys(env).map((key) => [key, childEnv[key]])),
    }, null, 2)}\n`);
    return;
  }

  const result = spawnSync(process.env.FH_CLAUDE_BIN || 'claude', finalArgs, {
    cwd: repoRoot,
    env: childEnv,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(`Failed to invoke Claude through FactHarbor wrapper: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
