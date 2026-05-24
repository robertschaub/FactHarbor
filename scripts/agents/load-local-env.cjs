#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const LOCAL_ENV_PATHS = [
  path.join('apps', 'web', '.env.local'),
  '.env.local',
  '.env',
];

function stripInlineComment(value) {
  const marker = value.search(/\s+#/);
  return marker === -1 ? value : value.slice(0, marker).trimEnd();
}

function unquoteValue(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return stripInlineComment(trimmed);

  const quote = trimmed[0];
  if ((quote !== '"' && quote !== "'") || trimmed[trimmed.length - 1] !== quote) {
    return stripInlineComment(trimmed);
  }

  const body = trimmed.slice(1, -1);
  if (quote === "'") return body;

  return body
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function parseEnvFile(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice('export '.length).trimStart();

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    values[key] = unquoteValue(line.slice(eqIndex + 1));
  }
  return values;
}

function loadLocalEnv(repoRoot, keys, targetEnv = process.env) {
  const remaining = new Set(keys.filter((key) => !targetEnv[key]));
  const loaded = {};
  if (remaining.size === 0) return loaded;

  for (const relativePath of LOCAL_ENV_PATHS) {
    if (remaining.size === 0) break;

    const envPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(envPath)) continue;

    const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    for (const key of Array.from(remaining)) {
      if (!parsed[key]) continue;
      targetEnv[key] = parsed[key];
      loaded[key] = envPath;
      remaining.delete(key);
    }
  }

  return loaded;
}

module.exports = {
  LOCAL_ENV_PATHS,
  loadLocalEnv,
  parseEnvFile,
};
