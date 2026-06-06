#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_PROFILE = 'opus-4.8-1m-max';
const PROFILES = {
  'opus-4.8-1m-max': {
    // Claude Code currently exposes Opus as an alias and effort as the
    // supported lane selector; the 1M context entitlement is account/CLI
    // resolved rather than a separate documented wrapper flag.
    model: 'opus',
    effort: 'max',
    contextWindow: '1m',
    contextResolution: 'account_or_cli_entitlement',
  },
};

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

function getFlagValue(args, flag) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === flag && i + 1 < args.length) {
      return args[i + 1];
    }
    if (arg.startsWith(`${flag}=`)) {
      return arg.slice(flag.length + 1);
    }
  }
  return null;
}

function extractProfile(args) {
  const finalArgs = [];
  let profile = DEFAULT_PROFILE;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--profile') {
      profile = args[++i];
      continue;
    }
    if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length);
      continue;
    }
    finalArgs.push(arg);
  }
  if (!PROFILES[profile]) {
    throw new Error(`Unknown Claude invocation profile: ${profile}. Known profiles: ${Object.keys(PROFILES).join(', ')}`);
  }
  return { profile, args: finalArgs };
}

function withDefaultArgs(args, settingsPath, env) {
  const selected = extractProfile(args);
  const finalArgs = [...selected.args];
  const defaults = PROFILES[selected.profile];
  if (!hasFlag(finalArgs, '--settings')) finalArgs.unshift('--settings', settingsPath);
  if (!hasFlag(finalArgs, '--effort')) finalArgs.unshift('--effort', defaults.effort || String(env.CLAUDE_CODE_EFFORT_LEVEL || 'xhigh'));
  if (!hasFlag(finalArgs, '--model')) finalArgs.unshift('--model', defaults.model);
  const effectiveEffort = getFlagValue(finalArgs, '--effort') || defaults.effort || null;
  return {
    profile: selected.profile,
    profileContract: {
      model: defaults.model,
      effort: defaults.effort,
      contextWindow: defaults.contextWindow,
      contextResolution: defaults.contextResolution,
    },
    envOverrides: effectiveEffort ? { CLAUDE_CODE_EFFORT_LEVEL: effectiveEffort } : {},
    args: finalArgs,
  };
}

function main() {
  const repoRoot = findRepoRoot(process.cwd());
  const { settingsPath, env } = loadClaudeSettings(repoRoot);
  const invocation = withDefaultArgs(process.argv.slice(2), settingsPath, env);
  const finalArgs = invocation.args;
  const childEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) childEnv[key] = String(value);
  for (const [key, value] of Object.entries(invocation.envOverrides)) childEnv[key] = String(value);

  if (process.env.FH_INVOKE_CLAUDE_DRY_RUN === '1') {
    process.stdout.write(`${JSON.stringify({
      command: process.env.FH_CLAUDE_BIN || 'claude',
      profile: invocation.profile,
      profileContract: invocation.profileContract,
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
