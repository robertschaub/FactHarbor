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
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO      = resolve(__dirname, '..');
const INDEX_DIR = join(REPO, 'Docs/AGENTS/index');
const HANDOFFS  = join(REPO, 'Docs/AGENTS/Handoffs');
const ANALYZER  = join(REPO, 'apps/web/src/lib/analyzer');

const args      = process.argv.slice(2);
const tierArg   = args.find(a => a.startsWith('--tier='));
const tier      = tierArg ? parseInt(tierArg.split('=')[1], 10) : null;

const RUN1 = !tier || tier === 1;
const RUN2 = !tier || tier === 2;

mkdirSync(INDEX_DIR, { recursive: true });

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

function parseHandoff(file, content) {
  const nameNoExt = basename(file, '.md');
  const parts     = nameNoExt.split('_');
  const date      = parts[0]; // YYYY-MM-DD

  let roles = [], topics = [], files_touched = [], summary = '';

  // ── Strategy A: YAML frontmatter (new handoffs) ─────────────────────────
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch && (fmMatch[1].includes('roles:') || fmMatch[1].includes('topics:'))) {
    const yaml = fmMatch[1];

    const rMatch = yaml.match(/^roles:\s*\[([^\]]*)\]/m);
    if (rMatch) roles = rMatch[1].split(',').map(s =>
      s.trim().replace(/^['"]|['"]$/g, '').toLowerCase().replace(/\s+/g, '_'));

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
      // Strip "Review Board:" prefix, then split on ' + ' or ', '
      const roleField = headerMatch[1].trim().replace(/^Review Board:\s*/i, '');
      roles = roleField
        .split(/\s*\+\s*|\s*,\s*/)
        .map(r => r.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean);
    }
  }

  // ── Strategy C: filename tokens ──────────────────────────────────────────
  if (roles.length === 0) {
    const tail = parts.slice(1); // tokens after YYYY-MM-DD
    let roleEndIdx = 1;
    if (tail.length >= 2) {
      const two = tail.slice(0, 2).join('_').toLowerCase();
      if (KNOWN_ROLES.has(two)) { roles = [two]; roleEndIdx = 2; }
    }
    if (roles.length === 0) {
      roles = [tail[0]?.toLowerCase() ?? 'unknown'];
    }
    topics = tail.slice(roleEndIdx).map(t => t.toLowerCase());
  }

  // Topics fallback from filename when YAML/header provided roles
  if (topics.length === 0) {
    const tail = parts.slice(1);
    const roleWordCount = roles[0]?.split(/[\s_]/).length ?? 1;
    topics = tail.slice(roleWordCount).map(t => t.toLowerCase());
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

  return { file, date, roles, topics, files_touched, summary };
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
if (RUN1) {
  const manifest = buildStageManifest();
  writeAtomic(join(INDEX_DIR, 'stage-manifest.json'), manifest);
  console.log(`stage-manifest.json  ${Object.keys(manifest.tasks).length} tasks`);

  const stageMap = buildStageMap();
  writeAtomic(join(INDEX_DIR, 'stage-map.json'), stageMap);
  console.log(`stage-map.json       ${Object.keys(stageMap.stages).length} stages`);
}

if (RUN2) {
  const handoffIndex = buildHandoffIndex();
  writeAtomic(join(INDEX_DIR, 'handoff-index.json'), handoffIndex);
  console.log(`handoff-index.json   ${handoffIndex.count} handoffs`);
}

console.log(`Done. generatedAt=${generatedAt}`);
