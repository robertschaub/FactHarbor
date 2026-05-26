#!/usr/bin/env node
'use strict';

/**
 * Dev-only diagnostic: compare the evidence pools of two or more completed jobs.
 *
 * Purpose: when the same input produces different verdicts across runs, this tells
 * you WHICH kind of non-determinism you are looking at:
 *   - low source-set overlap  => evidence-pool drift (search/fetch returned different sources)
 *   - high source-set overlap + different verdict => sampling/temperature non-determinism
 *
 * Read-only. Touches no pipeline code. Reads persisted ResultJson straight from the
 * SQLite DB via the `sqlite3` CLI (no npm dependency).
 *
 * Usage:
 *   node scripts/diag/compare-evidence-pools.cjs <jobId> <jobId> [<jobId> ...]
 *   node scripts/diag/compare-evidence-pools.cjs --input "Plastic recycling is pointless" [--limit 6]
 *
 * Env:
 *   FH_DB_PATH   override DB path (default: apps/api/factharbor.db under repo root)
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function findRepoRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'FactHarbor.sln'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

const REPO_ROOT = findRepoRoot(process.cwd());
const DB_PATH = process.env.FH_DB_PATH || path.join(REPO_ROOT, 'apps', 'api', 'factharbor.db');

function sqliteJson(query) {
  const out = execFileSync('sqlite3', ['-json', DB_PATH, query], {
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
  });
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : [];
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseArgs(argv) {
  const args = { jobIds: [], input: null, limit: 6 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--limit') args.limit = parseInt(argv[++i], 10) || 6;
    else args.jobIds.push(argv[i]);
  }
  return args;
}

function normalizeUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    return `${u.hostname}${u.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase() || null;
  }
}

function analyzeJob(jobId) {
  const rows = sqliteJson(
    `SELECT JobId AS jobId, Status AS status, substr(InputValue,1,70) AS input, datetime(CreatedUtc) AS created, ResultJson AS resultJson FROM Jobs WHERE JobId=${sqlQuote(jobId)}`,
  );
  if (rows.length === 0) return { jobId, error: 'not found' };
  const row = rows[0];
  if (!row.resultJson) return { jobId, error: `no ResultJson (status ${row.status})` };

  let result;
  try {
    result = JSON.parse(row.resultJson);
  } catch {
    return { jobId, error: 'ResultJson parse failed' };
  }

  const sources = Array.isArray(result.sources) ? result.sources : [];
  const evidence = Array.isArray(result.evidenceItems) ? result.evidenceItems : [];
  const queries = Array.isArray(result.searchQueries) ? result.searchQueries : [];
  const sourceSet = new Set(sources.map((s) => normalizeUrl(s && s.url)).filter(Boolean));

  return {
    jobId,
    status: row.status,
    input: row.input,
    created: row.created,
    verdict: result.verdict ?? null,
    truth: result.truthPercentage ?? null,
    confidence: result.confidence ?? null,
    sourceSet,
    sourceCount: sourceSet.size,
    evidenceCount: evidence.length,
    queryCount: queries.length,
  };
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let jobIds = args.jobIds;
  if (args.input) {
    const found = sqliteJson(
      `SELECT JobId AS jobId FROM Jobs WHERE Status='SUCCEEDED' AND InputValue=${sqlQuote(args.input)} ORDER BY CreatedUtc DESC LIMIT ${args.limit}`,
    );
    jobIds = found.map((r) => r.jobId);
    if (jobIds.length === 0) {
      console.error(`No SUCCEEDED jobs found with exact InputValue: ${args.input}`);
      process.exit(1);
    }
  }

  if (jobIds.length < 2) {
    console.error('Provide at least two jobIds, or --input "<exact input>" matching >=2 jobs.');
    console.error('Usage: node scripts/diag/compare-evidence-pools.cjs <jobId> <jobId> [...]');
    console.error('       node scripts/diag/compare-evidence-pools.cjs --input "..." [--limit N]');
    process.exit(1);
  }

  for (const id of jobIds) {
    if (!/^[A-Za-z0-9-]+$/.test(id)) {
      console.error(`Invalid jobId (expected alphanumeric): ${id}`);
      process.exit(1);
    }
  }

  const jobs = jobIds.map(analyzeJob);

  console.log(`\nDB: ${DB_PATH}`);
  console.log(`Comparing ${jobs.length} jobs\n`);
  console.log('job       verdict        truth  conf  sources  evidence  queries  created');
  console.log('--------  -------------  -----  ----  -------  --------  -------  -------------------');
  for (const j of jobs) {
    if (j.error) {
      console.log(`${j.jobId.slice(0, 8)}  ERROR: ${j.error}`);
      continue;
    }
    console.log(
      `${j.jobId.slice(0, 8)}  ${String(j.verdict ?? '-').padEnd(13)}  ${String(j.truth ?? '-').padStart(5)}  ${String(j.confidence ?? '-').padStart(4)}  ${String(j.sourceCount).padStart(7)}  ${String(j.evidenceCount).padStart(8)}  ${String(j.queryCount).padStart(7)}  ${j.created ?? ''}`,
    );
  }

  const valid = jobs.filter((j) => !j.error);
  if (valid.length >= 2) {
    console.log('\nPairwise source-set overlap (Jaccard) + verdict delta:\n');
    for (let i = 0; i < valid.length; i++) {
      for (let k = i + 1; k < valid.length; k++) {
        const a = valid[i];
        const b = valid[k];
        const jac = jaccard(a.sourceSet, b.sourceSet);
        const truthDeltaRaw = a.truth != null && b.truth != null ? Math.abs(a.truth - b.truth) : null;
        const truthDelta = truthDeltaRaw != null ? Number(truthDeltaRaw.toFixed(1)) : null;
        let hint = '';
        if (truthDelta != null && truthDelta >= 10) {
          hint = jac >= 0.7
            ? '  <= SAMPLING drift (same sources, different verdict)'
            : jac <= 0.4
              ? '  <= EVIDENCE drift (different source pool)'
              : '  <= mixed';
        }
        console.log(
          `${a.jobId.slice(0, 8)} vs ${b.jobId.slice(0, 8)}: Jaccard=${jac.toFixed(2)}  truthΔ=${truthDelta ?? '-'}${hint}`,
        );
      }
    }
  }
  console.log('');
}

main();
