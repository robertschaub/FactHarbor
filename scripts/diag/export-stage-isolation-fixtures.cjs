#!/usr/bin/env node
'use strict';

/*
 * Export compact stage-isolation fixtures from stored Captain benchmark jobs.
 *
 * Read-only against SQLite: no DB writes, no LLM calls, no live jobs.
 * Optional filesystem write only when --out is provided.
 *
 * Usage:
 *   node scripts/diag/export-stage-isolation-fixtures.cjs --job <jobId> --job <jobId> --out apps/web/test/fixtures/analysis-quality/current.json
 *   node scripts/diag/export-stage-isolation-fixtures.cjs --build 0396ea47 --latest-per-family
 */

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function repoRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'FactHarbor.sln'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const ROOT = repoRoot(process.cwd());
let DB = process.env.FH_DB_PATH || path.join(ROOT, 'apps', 'api', 'factharbor.db');

function usage(exitCode) {
  const out = [
    'Export stored-job stage isolation fixtures (read-only DB access)',
    '',
    'Usage:',
    '  node scripts/diag/export-stage-isolation-fixtures.cjs [options]',
    '',
    'Options:',
    '  --job <jobId>          Export one stored job; repeatable',
    '  --build <prefix>       Export stored benchmark jobs from an executed/git build prefix',
    '  --family <slug>        Restrict --build export to one benchmark family; repeatable',
    '  --latest-per-family    Keep only the newest matching job per family for --build export',
    '  --limit <n>            Cap selected rows after filtering',
    '  --out <path>           Write fixture JSON to path instead of stdout',
    '  --force                Allow overwriting --out',
    '  --db <path>            SQLite DB path override',
    '  --help                 Show this help',
    '',
    'Only jobs whose InputValue exactly matches Docs/AGENTS/benchmark-expectations.json are exported.',
  ].join('\n');
  (exitCode === 0 ? console.log : console.error)(out);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    jobIds: [],
    build: null,
    families: [],
    latestPerFamily: false,
    limit: null,
    out: null,
    force: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--job') args.jobIds.push(requireValue(argv, ++i, '--job'));
    else if (arg === '--build') args.build = requireValue(argv, ++i, '--build');
    else if (arg === '--family') args.families.push(requireValue(argv, ++i, '--family'));
    else if (arg === '--latest-per-family') args.latestPerFamily = true;
    else if (arg === '--limit') args.limit = parsePositiveInt(requireValue(argv, ++i, '--limit'), '--limit');
    else if (arg === '--out') args.out = path.resolve(requireValue(argv, ++i, '--out'));
    else if (arg === '--force') args.force = true;
    else if (arg === '--db') DB = path.resolve(requireValue(argv, ++i, '--db'));
    else {
      console.error(`Unknown argument: ${arg}`);
      usage(2);
    }
  }

  if (args.jobIds.length > 0 && (args.build || args.families.length > 0 || args.latestPerFamily || args.limit)) {
    console.error('--job cannot be combined with --build, --family, --latest-per-family, or --limit');
    usage(2);
  }
  if (args.jobIds.length === 0 && !args.build) {
    console.error('Provide either --job or --build');
    usage(2);
  }

  return args;
}

function requireValue(argv, index, flag) {
  if (index >= argv.length || String(argv[index]).startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    usage(2);
  }
  return argv[index];
}

function parsePositiveInt(raw, flag) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`${flag} must be a positive integer`);
    usage(2);
  }
  return n;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqliteJson(query) {
  const out = execFileSync('sqlite3', ['-readonly', '-cmd', '.timeout 10000', '-json', DB, query], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : [];
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const child = stableValue(value[key]);
    if (child !== undefined) out[key] = child;
  }
  return out;
}

function pruneUndefined(value) {
  if (Array.isArray(value)) return value.map(pruneUndefined);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const next = pruneUndefined(child);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

function parseJsonField(row, field) {
  if (!row[field]) return null;
  try {
    return JSON.parse(row[field]);
  } catch (error) {
    throw new Error(`Job ${row.jobId} has invalid ${field}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function shortBuild(build) {
  if (!build) return 'unknown';
  const s = String(build);
  const plus = s.indexOf('+');
  const clean = plus >= 0 ? s.slice(0, plus) : s;
  const suffix = plus >= 0 ? `+${s.slice(plus + 1, plus + 7)}` : '';
  return `${clean.slice(0, 8)}${suffix}`;
}

function buildKey(row, result) {
  return row.executedWebGitCommitHash
    || row.gitCommitHash
    || result?.meta?.executedWebGitCommitHash
    || result?.meta?.gitCommitHash
    || 'unknown';
}

function loadBenchmarkFamilies(args) {
  const benchmark = readJson(path.join('Docs', 'AGENTS', 'benchmark-expectations.json'));
  const families = Array.isArray(benchmark.families) ? benchmark.families : [];
  const selectedFamilies = args.families.length === 0
    ? families
    : families.filter((family) => args.families.includes(family.slug));
  const missing = args.families.filter((slug) => !families.some((family) => family.slug === slug));
  if (missing.length > 0) {
    throw new Error(`Unknown benchmark family slug(s): ${missing.join(', ')}`);
  }
  return {
    benchmark,
    families: selectedFamilies,
    familyByInput: new Map(families.map((family) => [family.inputValue, family])),
  };
}

function queryRowsByJobIds(jobIds) {
  const inList = [...new Set(jobIds)].map(sqlQuote).join(',');
  return sqliteJson(`
    SELECT
      j.JobId AS jobId,
      j.Status AS status,
      j.Progress AS progress,
      j.CreatedUtc AS createdUtc,
      j.UpdatedUtc AS updatedUtc,
      j.InputType AS inputType,
      j.InputValue AS inputValue,
      j.PipelineVariant AS pipelineVariant,
      j.ParentJobId AS parentJobId,
      j.RetryCount AS retryCount,
      j.RetryReason AS retryReason,
      j.PromptContentHash AS promptContentHash,
      j.PromptLoadedUtc AS promptLoadedUtc,
      j.VerdictLabel AS verdictLabel,
      j.TruthPercentage AS truthPercentage,
      j.Confidence AS confidence,
      j.GitCommitHash AS gitCommitHash,
      j.ExecutedWebGitCommitHash AS executedWebGitCommitHash,
      j.ResultJson AS resultJson,
      (
        SELECT m.MetricsJson
        FROM AnalysisMetrics m
        WHERE m.JobId = j.JobId
        ORDER BY m.CreatedUtc DESC
        LIMIT 1
      ) AS metricsJson
    FROM Jobs j
    WHERE j.JobId IN (${inList})
      AND j.ResultJson IS NOT NULL
    ORDER BY j.CreatedUtc DESC
  `);
}

function queryRowsByBuild(args, families) {
  const inputs = families.map((family) => family.inputValue);
  if (inputs.length === 0) return [];
  const inList = inputs.map(sqlQuote).join(',');
  const buildPrefix = String(args.build).replace(/[%_]/g, '');
  let rows = sqliteJson(`
    SELECT
      j.JobId AS jobId,
      j.Status AS status,
      j.Progress AS progress,
      j.CreatedUtc AS createdUtc,
      j.UpdatedUtc AS updatedUtc,
      j.InputType AS inputType,
      j.InputValue AS inputValue,
      j.PipelineVariant AS pipelineVariant,
      j.ParentJobId AS parentJobId,
      j.RetryCount AS retryCount,
      j.RetryReason AS retryReason,
      j.PromptContentHash AS promptContentHash,
      j.PromptLoadedUtc AS promptLoadedUtc,
      j.VerdictLabel AS verdictLabel,
      j.TruthPercentage AS truthPercentage,
      j.Confidence AS confidence,
      j.GitCommitHash AS gitCommitHash,
      j.ExecutedWebGitCommitHash AS executedWebGitCommitHash,
      j.ResultJson AS resultJson,
      (
        SELECT m.MetricsJson
        FROM AnalysisMetrics m
        WHERE m.JobId = j.JobId
        ORDER BY m.CreatedUtc DESC
        LIMIT 1
      ) AS metricsJson
    FROM Jobs j
    WHERE j.InputValue IN (${inList})
      AND j.ResultJson IS NOT NULL
      AND (
        j.ExecutedWebGitCommitHash LIKE ${sqlQuote(`${buildPrefix}%`)}
        OR j.GitCommitHash LIKE ${sqlQuote(`${buildPrefix}%`)}
      )
    ORDER BY j.CreatedUtc DESC
  `);

  if (args.latestPerFamily) {
    const seen = new Set();
    rows = rows.filter((row) => {
      if (seen.has(row.inputValue)) return false;
      seen.add(row.inputValue);
      return true;
    });
  }
  if (args.limit) rows = rows.slice(0, args.limit);
  return rows;
}

function compactResult(result) {
  return pruneUndefined({
    schemaVersion: result?._schemaVersion,
    meta: result?.meta,
    languageIntent: result?.languageIntent || result?.meta?.languageIntent,
    topVerdict: {
      verdict: result?.verdict,
      truthPercentage: result?.truthPercentage,
      confidence: result?.confidence,
      adjudicationPath: result?.adjudicationPath,
    },
    claimBoundaries: result?.claimBoundaries,
    claimVerdicts: result?.claimVerdicts,
    coverageMatrix: result?.coverageMatrix,
    understanding: result?.understanding,
    claimSelection: result?.claimSelection,
    evidenceItems: result?.evidenceItems,
    sources: result?.sources,
    searchQueries: result?.searchQueries,
    claimAcquisitionLedger: result?.claimAcquisitionLedger,
    qualityGates: result?.qualityGates,
    analysisWarnings: result?.analysisWarnings,
  });
}

function compactMetrics(metrics) {
  if (!metrics) return null;
  return pruneUndefined({
    schemaVersion: metrics.schemaVersion,
    timestamp: metrics.timestamp,
    llmCalls: metrics.llmCalls,
    searchQueries: metrics.searchQueries,
    failureModes: metrics.failureModes,
    gate1Stats: metrics.gate1Stats,
    gate4Stats: metrics.gate4Stats,
    outputQuality: metrics.outputQuality,
    qualityHealth: metrics.qualityHealth,
    pipelineTelemetry: metrics.pipelineTelemetry,
    telemetryContext: metrics.telemetryContext,
    totalDurationMs: metrics.totalDurationMs,
    tokenCounts: metrics.tokenCounts,
    estimatedCostUSD: metrics.estimatedCostUSD,
  });
}

function stageContentForHash(body) {
  return pruneUndefined({
    inputValue: body.job?.inputValue,
    benchmarkFamilySlug: body.benchmarkFamily?.slug,
    result: body.result,
    metrics: body.metrics ? {
      searchQueries: body.metrics.searchQueries,
      failureModes: body.metrics.failureModes,
      gate1Stats: body.metrics.gate1Stats,
      gate4Stats: body.metrics.gate4Stats,
      outputQuality: body.metrics.outputQuality,
      qualityHealth: body.metrics.qualityHealth,
      pipelineTelemetry: body.metrics.pipelineTelemetry,
      telemetryContext: body.metrics.telemetryContext,
    } : null,
  });
}

function fixtureFromRow(row, family, benchmark) {
  const result = parseJsonField(row, 'resultJson');
  const metrics = parseJsonField(row, 'metricsJson');
  const build = buildKey(row, result);
  const resultSha = sha256(row.resultJson);
  const metricsSha = row.metricsJson ? sha256(row.metricsJson) : null;
  const body = pruneUndefined({
    job: {
      jobId: row.jobId,
      status: row.status,
      progress: row.progress,
      createdUtc: row.createdUtc,
      updatedUtc: row.updatedUtc,
      inputType: row.inputType,
      inputValue: row.inputValue,
      pipelineVariant: row.pipelineVariant,
      parentJobId: row.parentJobId,
      retryCount: row.retryCount,
      retryReason: row.retryReason,
      promptContentHash: result?.meta?.promptContentHash || row.promptContentHash,
      promptLoadedUtc: row.promptLoadedUtc,
      verdictLabel: row.verdictLabel,
      truthPercentage: row.truthPercentage,
      confidence: row.confidence,
      gitCommitHash: row.gitCommitHash,
      executedWebGitCommitHash: row.executedWebGitCommitHash,
      build,
      buildShort: shortBuild(build),
    },
    benchmarkFamily: {
      slug: family.slug,
      inputValue: family.inputValue,
      expectedVerdictLabels: family.expectedVerdictLabels,
      expectedTruthBand: family.expectedTruthBand,
      expectedConfidenceBand: family.expectedConfidenceBand,
      latestVerifiedJobId: family.latestVerifiedJobId,
      priority: family.priority,
      notes: family.notes,
    },
    benchmarkPolicy: {
      source: 'Docs/AGENTS/benchmark-expectations.json',
      noiseTolerancePct: benchmark.noiseTolerancePct,
    },
    result: compactResult(result),
    metrics: compactMetrics(metrics),
    sourceHashes: {
      resultJsonSha256: resultSha,
      metricsJsonSha256: metricsSha,
    },
  });
  return {
    ...body,
    stageContentSha256: sha256(stableStringify(stageContentForHash(body))),
    fixtureSha256: sha256(stableStringify(body)),
  };
}

function buildPayload(rows, benchmarkContext) {
  const fixtures = rows.map((row) => {
    const family = benchmarkContext.familyByInput.get(row.inputValue);
    if (!family) {
      throw new Error(`Job ${row.jobId} input is not Captain-defined in Docs/AGENTS/benchmark-expectations.json`);
    }
    return fixtureFromRow(row, family, benchmarkContext.benchmark);
  });
  const base = {
    schemaVersion: 'analysis-stage-isolation-fixtures.v1',
    constructionRule: [
      'Fixtures are exact stored Jobs rows whose InputValue is Captain-defined in Docs/AGENTS/benchmark-expectations.json.',
      'No input paraphrasing, translation, synthetic evidence, or hand curation is applied.',
      'ResultJson and latest AnalysisMetrics.MetricsJson are compacted to stage-facing structures, with source JSON hashes retained.',
      'Fixture hashes are deterministic and exclude wall-clock export time.',
    ],
    source: {
      database: path.relative(ROOT, DB).replace(/\\/g, '/'),
      benchmarkExpectations: 'Docs/AGENTS/benchmark-expectations.json',
      sqliteMode: 'readonly',
    },
    fixtures,
  };
  return {
    ...base,
    fixtureSetSha256: sha256(stableStringify(base)),
  };
}

function writeOrPrint(payload, outPath, force) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (!outPath) {
    process.stdout.write(json);
    return;
  }
  if (fs.existsSync(outPath) && !force) {
    throw new Error(`Output already exists: ${outPath}. Use --force to overwrite.`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, outPath).replace(/\\/g, '/')}`);
  console.log(`fixtures=${payload.fixtures.length} fixtureSetSha256=${payload.fixtureSetSha256}`);
  for (const fixture of payload.fixtures) {
    console.log([
      `- ${fixture.benchmarkFamily.slug}`,
      fixture.job.jobId,
      fixture.job.buildShort,
      `prompt=${String(fixture.job.promptContentHash || '').slice(0, 8) || 'n/a'}`,
      `verdict=${fixture.job.verdictLabel || fixture.result?.topVerdict?.verdict || 'n/a'}`,
      `evidence=${Array.isArray(fixture.result?.evidenceItems) ? fixture.result.evidenceItems.length : 0}`,
      `sources=${Array.isArray(fixture.result?.sources) ? fixture.result.sources.length : 0}`,
      `hash=${fixture.fixtureSha256.slice(0, 12)}`,
      `stage=${fixture.stageContentSha256.slice(0, 12)}`,
    ].join(' '));
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const benchmarkContext = loadBenchmarkFamilies(args);
    const rows = args.jobIds.length > 0
      ? queryRowsByJobIds(args.jobIds)
      : queryRowsByBuild(args, benchmarkContext.families);

    const foundIds = new Set(rows.map((row) => row.jobId));
    const missingIds = args.jobIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) throw new Error(`No ResultJson row found for job(s): ${missingIds.join(', ')}`);
    if (rows.length === 0) throw new Error('No matching stored jobs found.');

    const payload = buildPayload(rows, benchmarkContext);
    writeOrPrint(payload, args.out, args.force);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
