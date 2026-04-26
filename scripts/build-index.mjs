#!/usr/bin/env node
/**
 * build-index.mjs — generates agent navigation indexes for FactHarbor.
 *
 * Outputs to Docs/AGENTS/index/ (committed to git).
 *
 * Usage:
 *   node scripts/build-index.mjs           # rebuild all tiers
 *   node scripts/build-index.mjs --tier=1  # stage-manifest.json + stage-map.json
 *   node scripts/build-index.mjs --tier=2  # handoff-index.json
 *
 * Artifacts:
 *   Tier 1a  stage-manifest.json   LLM task → model tier → model ID
 *   Tier 1b  stage-map.json        pipeline stage → file → exported functions
 *   Tier 2   handoff-index.json    all handoffs, searchable by role/topic/files
 */

import {
  readFileSync, writeFileSync, readdirSync,
  mkdirSync, renameSync, unlinkSync, existsSync,
} from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const __dirname = dirname(THIS_FILE);
const REPO      = resolve(__dirname, '..');
const INDEX_DIR = join(REPO, 'Docs/AGENTS/index');
const HANDOFFS  = join(REPO, 'Docs/AGENTS/Handoffs');
const ANALYZER  = join(REPO, 'apps/web/src/lib/analyzer');

const args      = process.argv.slice(2);
const tierArg   = args.find(a => a.startsWith('--tier='));
const tier      = tierArg ? parseInt(tierArg.split('=')[1], 10) : null;

const RUN1 = !tier || tier === 1;
const RUN2 = !tier || tier === 2;
const IS_MAIN = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;

const generatedAt = new Date().toISOString();

// ---------------------------------------------------------------------------
// Atomic write — never leave a corrupt half-written file
// ---------------------------------------------------------------------------
function writeAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  const json = JSON.stringify(data, null, 2);
  writeFileSync(tmp, json, 'utf8');
  try {
    renameSync(tmp, filePath);
  } catch {
    // Windows: rename may fail if target is locked; fall back to direct write
    writeFileSync(filePath, json, 'utf8');
    try { unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Tier 1a — stage-manifest.json
// LLM task key → tier → model IDs per provider
// ---------------------------------------------------------------------------
function buildStageManifest() {
  const src = readFileSync(join(ANALYZER, 'model-tiering.ts'), 'utf8');

  // Extract DEFAULT_TASK_TIER_MAPPING block
  const mappingBlock = src.match(
    /DEFAULT_TASK_TIER_MAPPING[^{]*\{([^}]+)\}/
  )?.[1] ?? '';
  const taskTiers = {};
  for (const [, task, tier] of mappingBlock.matchAll(/(\w+)\s*:\s*'(\w+)'/g)) {
    taskTiers[task] = tier;
  }
  if (Object.keys(taskTiers).length === 0) {
    console.warn('WARN: DEFAULT_TASK_TIER_MAPPING extraction produced no task tiers');
  }

  // Extract model IDs per provider per tier
  const providers = {
    anthropic: 'ANTHROPIC_MODELS',
    openai:    'OPENAI_MODELS',
    google:    'GOOGLE_MODELS',
  };
  const modelIds = {};
  for (const [provider, varName] of Object.entries(providers)) {
    modelIds[provider] = {};
    // Find the block for this provider's model map
    const blockMatch = src.match(
      new RegExp(`export const ${varName}[^=]+=\\s*\\{([\\s\\S]+?)^\\};`, 'm')
    );
    if (!blockMatch) continue;
    for (const tierName of ['budget', 'standard', 'premium']) {
      const idMatch = blockMatch[1].match(
        new RegExp(`${tierName}\\s*:\\s*\\{[\\s\\S]*?modelId\\s*:\\s*'([^']+)'`)
      );
      if (idMatch) modelIds[provider][tierName] = idMatch[1];
    }
    if (Object.keys(modelIds[provider]).length === 0) {
      console.warn(`WARN: ${varName} extraction produced no model IDs for provider ${provider}`);
    }
  }

  const tasks = {};
  for (const [task, tier] of Object.entries(taskTiers)) {
    tasks[task] = {
      tier,
      models: Object.fromEntries(
        Object.entries(modelIds).map(([p, tiers]) => [p, tiers[tier] ?? null])
      ),
    };
  }

  return { generatedAt, tasks };
}

function buildStageManifestSafely() {
  try {
    return buildStageManifest();
  } catch (error) {
    console.warn(`WARN: stage-manifest.json skipped: ${error instanceof Error ? error.message : String(error)}`);
    return { generatedAt, tasks: {} };
  }
}

// ---------------------------------------------------------------------------
// Tier 1b — stage-map.json
// Pipeline stage name → file path → exported function names
// ---------------------------------------------------------------------------
function buildStageMap() {
  const stageFiles = readdirSync(ANALYZER).filter(f => f.endsWith('-stage.ts'));
  const stages = {};

  for (const file of stageFiles) {
    const content = readFileSync(join(ANALYZER, file), 'utf8');
    const functions = [...content.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)]
      .map(m => m[1]);
    const stageName = file.replace(/-stage\.ts$/, '').replace(/-/g, '_');
    stages[stageName] = {
      file: `apps/web/src/lib/analyzer/${file}`,
      functions,
    };
  }

  return { generatedAt, stages };
}

function buildStageMapSafely() {
  try {
    return buildStageMap();
  } catch (error) {
    console.warn(`WARN: stage-map.json skipped: ${error instanceof Error ? error.message : String(error)}`);
    return { generatedAt, stages: {} };
  }
}

// ---------------------------------------------------------------------------
// Tier 2 — handoff-index.json
// Searchable record of every handoff: roles, topics, files_touched, summary
// ---------------------------------------------------------------------------

const KNOWN_ROLES = new Set([
  'lead_architect', 'lead_developer', 'senior_developer', 'llm_expert',
  'code_reviewer', 'product_strategist', 'technical_writer',
  'agents_supervisor', 'investigator', 'devops_expert', 'security_expert',
  'captain', 'unassigned',
]);

const ROLE_ALIASES = new Map([
  ['lead_architect', 'lead_architect'],
  ['senior_architect', 'lead_architect'],
  ['principal_architect', 'lead_architect'],
  ['lead_developer', 'lead_developer'],
  ['senior_developer', 'senior_developer'],
  ['technical_writer', 'technical_writer'],
  ['tech_writer', 'technical_writer'],
  ['xwiki_expert', 'technical_writer'],
  ['xwiki_developer', 'technical_writer'],
  ['llm_expert', 'llm_expert'],
  ['fh_analysis_expert', 'llm_expert'],
  ['ai_consultant', 'llm_expert'],
  ['product_strategist', 'product_strategist'],
  ['product_manager', 'product_strategist'],
  ['product_owner', 'product_strategist'],
  ['sponsor', 'product_strategist'],
  ['code_reviewer', 'code_reviewer'],
  ['security_expert', 'security_expert'],
  ['devops_expert', 'devops_expert'],
  ['git_expert', 'devops_expert'],
  ['github_expert', 'devops_expert'],
  ['agents_supervisor', 'agents_supervisor'],
  ['ai_supervisor', 'agents_supervisor'],
  ['investigator', 'investigator'],
  ['captain', 'captain'],
  ['unassigned', 'unassigned'],
]);

function normalizeRoleToken(role) {
  const normalized = role
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');

  return ROLE_ALIASES.get(normalized) ?? normalized;
}

function parseRoleList(rawRoles) {
  return [...new Set(
    rawRoles
      .split(/\s*(?:\+|\/|,|&)\s*|\s+and\s+/i)
      .map(normalizeRoleToken)
      .filter(Boolean)
  )];
}

const DEBT_GUARD_BLOCK_RE = /```[^\n]*\r?\n\s*(DEBT-GUARD RESULT|DEBT-GUARD COMPACT RESULT|COMPACT DEBT-GUARD)\s*\r?\n([\s\S]*?)```/gi;

function normalizeFieldKey(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseLabelValueFields(blockBody) {
  const fields = {};

  for (const line of blockBody.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:\n]+):\s*(.*)$/);
    if (!match) continue;

    const key = normalizeFieldKey(match[1]);
    if (!key || Object.hasOwn(fields, key)) continue;
    fields[key] = match[2].trim();
  }

  return fields;
}

function parseDebtGuardTelemetry(content) {
  const matches = [...content.matchAll(DEBT_GUARD_BLOCK_RE)];
  if (matches.length === 0) return null;

  const match = matches.sort((a, b) =>
    debtGuardBlockPriority(a[1]) - debtGuardBlockPriority(b[1])
  )[0];
  const blockHeader = match[1].toUpperCase();
  const resultType = blockHeader === 'DEBT-GUARD RESULT'
    ? 'full_result'
    : blockHeader === 'DEBT-GUARD COMPACT RESULT'
      ? 'compact_result'
      : 'compact_pre_edit';

  return {
    present: true,
    result_type: resultType,
    block_header: blockHeader,
    fields: parseLabelValueFields(match[2]),
  };
}

function debtGuardBlockPriority(header) {
  const normalized = header.toUpperCase();
  if (normalized === 'DEBT-GUARD RESULT') return 0;
  if (normalized === 'DEBT-GUARD COMPACT RESULT') return 1;
  return 2;
}

const ROLE_VARIANTS = (() => {
  const variants = new Map();

  for (const role of KNOWN_ROLES) {
    variants.set(role, new Set([role]));
  }

  for (const [alias, canonical] of ROLE_ALIASES) {
    if (!variants.has(canonical)) {
      variants.set(canonical, new Set([canonical]));
    }
    variants.get(canonical).add(alias);
  }

  return new Map(
    [...variants.entries()].map(([role, names]) => [
      role,
      [...names]
        .map(name => name.split('_'))
        .sort((a, b) => b.length - a.length || b.join('_').length - a.join('_').length),
    ])
  );
})();

function countLeadingRoleTokens(tokens, roles) {
  let nextIndex = 0;

  for (const role of roles) {
    const variants = ROLE_VARIANTS.get(role) ?? [[role]];
    let matched = false;

    for (const variant of variants) {
      const candidate = tokens.slice(nextIndex, nextIndex + variant.length)
        .map(token => token.toLowerCase());

      if (candidate.length === variant.length && candidate.every((token, idx) => token === variant[idx])) {
        nextIndex += variant.length;
        matched = true;
        break;
      }
    }

    if (!matched) break;
  }

  return nextIndex;
}

function extractLeadingRoleTokens(tokens) {
  const roles = [];
  let nextIndex = 0;

  while (nextIndex < tokens.length) {
    const two = tokens.slice(nextIndex, nextIndex + 2).join('_').toLowerCase();
    const one = tokens[nextIndex]?.toLowerCase() ?? '';

    if (KNOWN_ROLES.has(two)) {
      roles.push(two);
      nextIndex += 2;
      continue;
    }

    if (KNOWN_ROLES.has(one)) {
      roles.push(one);
      nextIndex += 1;
      continue;
    }

    break;
  }

  return { roles, nextIndex };
}

export function parseHandoff(file, content) {
  const nameNoExt = basename(file, '.md');
  const parts     = nameNoExt.split('_');
  const date      = parts[0]; // YYYY-MM-DD
  const tail      = parts.slice(1); // tokens after YYYY-MM-DD
  const filenameRoleInfo = extractLeadingRoleTokens(tail);

  let roles = [], topics = [], files_touched = [], summary = '';
  let roleSource = 'filename';

  // ── Strategy A: YAML frontmatter (new handoffs) ─────────────────────────
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch && (fmMatch[1].includes('roles:') || fmMatch[1].includes('topics:'))) {
    const yaml = fmMatch[1];

    const rMatch = yaml.match(/^roles:\s*\[([^\]]*)\]/m);
    if (rMatch) {
      roles = rMatch[1].split(',').map(normalizeRoleToken).filter(Boolean);
      if (roles.length > 0) roleSource = 'yaml';
    }

    const tMatch = yaml.match(/^topics:\s*\[([^\]]*)\]/m);
    if (tMatch) topics = tMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '').toLowerCase());

    const ftSection = yaml.match(/^files_touched:\s*\n((?:[ \t]+-[ \t]+.+\n?)*)/m);
    if (ftSection) {
      files_touched = [...ftSection[1].matchAll(/^\s+-\s+(.+)$/gm)].map(m => m[1].trim());
    }
  }

  // ── Strategy B: old `### DATE | Role | Agent | Description` header ───────
  if (roles.length === 0) {
    const headerMatch = content.match(/^###?\s+\d{4}-\d{2}-\d{2}\s*\|\s*([^|]+)\|/m);
    if (headerMatch) {
      // Strip "Review Board:" prefix, then split multi-role labels generically.
      const roleField = headerMatch[1].trim().replace(/^Review Board:\s*/i, '');
      roles = parseRoleList(roleField);
      if (roles.length > 0) roleSource = 'header';
    }
  }

  // ── Strategy C: filename tokens ──────────────────────────────────────────
  if (roles.length === 0) {
    roles = filenameRoleInfo.roles.length > 0
      ? filenameRoleInfo.roles
      : [tail[0]?.toLowerCase() ?? 'unknown'];
    topics = tail.slice(filenameRoleInfo.nextIndex || 1).map(t => t.toLowerCase());
  }

  // Topics fallback from filename when YAML/header provided roles
  if (topics.length === 0) {
    const roleTokenCount = roleSource === 'filename'
      ? (filenameRoleInfo.nextIndex || 1)
      : countLeadingRoleTokens(tail, roles);
    topics = tail.slice(roleTokenCount).map(t => t.toLowerCase());
  }

  // ── files_touched: extract backtick paths from **Files touched:** line ───
  if (files_touched.length === 0) {
    const ftLine = content.match(/\*\*Files touched:\*\*\s*(.+)/i);
    if (ftLine) {
      files_touched = [...ftLine[1].matchAll(/`([^`]+)`/g)].map(m => m[1]);
    }
  }

  // ── summary: "For next agent:" → "Task:" → H1/H2 → topic slug ───────────
  const fnaMatch = content.match(/\*\*For next agent[:\*]*\*?\s*[-–]?\s*(.+)/i)
    ?? content.match(/\*\*Next[:\*]*\*?\s*[-–]?\s*(.+)/i);
  if (fnaMatch) {
    summary = fnaMatch[1].trim().slice(0, 300);
  } else {
    const taskMatch = content.match(/\*\*Task:\*\*\s*(.+)/i);
    if (taskMatch) {
      summary = taskMatch[1].trim().slice(0, 200);
    } else {
      const heading = content.match(/^#{1,2}\s+(.+)/m);
      summary = heading ? heading[1].trim().slice(0, 200) : topics.join(', ');
    }
  }

  const parsed = { file, date, roles, topics, files_touched, summary };
  const debtGuardTelemetry = parseDebtGuardTelemetry(content);
  if (debtGuardTelemetry) {
    parsed.governance = {
      debt_guard: debtGuardTelemetry,
    };
  }

  return parsed;
}

function buildHandoffIndex() {
  if (!existsSync(HANDOFFS)) {
    return { generatedAt, count: 0, entries: [] };
  }

  const files = readdirSync(HANDOFFS)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort();

  const entries = files.map(file => {
    try {
      const content = readFileSync(join(HANDOFFS, file), 'utf8');
      return parseHandoff(file, content);
    } catch (err) {
      // Never abort the whole index run for one bad file
      console.warn(`WARN: skipped ${file} — ${err.message}`);
      return null;
    }
  }).filter(Boolean);

  return { generatedAt, count: entries.length, entries };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  mkdirSync(INDEX_DIR, { recursive: true });

  if (RUN1) {
    const manifest = buildStageManifestSafely();
    writeAtomic(join(INDEX_DIR, 'stage-manifest.json'), manifest);
    console.log(`stage-manifest.json  ${Object.keys(manifest.tasks).length} tasks`);

    const stageMap = buildStageMapSafely();
    writeAtomic(join(INDEX_DIR, 'stage-map.json'), stageMap);
    console.log(`stage-map.json       ${Object.keys(stageMap.stages).length} stages`);
  }

  if (RUN2) {
    const handoffIndex = buildHandoffIndex();
    writeAtomic(join(INDEX_DIR, 'handoff-index.json'), handoffIndex);
    console.log(`handoff-index.json   ${handoffIndex.count} handoffs`);
  }

  console.log(`Done. generatedAt=${generatedAt}`);
}

if (IS_MAIN) {
  main();
}
