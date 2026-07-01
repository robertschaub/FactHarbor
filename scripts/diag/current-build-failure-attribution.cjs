#!/usr/bin/env node
'use strict';

/*
 * Current-build failure attribution for Captain benchmark inputs.
 * Read-only: no DB writes, no LLM calls, no live jobs.
 *
 * Purpose:
 * - Put Phase 1 "what failed, where, and how confidently?" into one table.
 * - Use stored Jobs.ResultJson plus optional AnalysisMetrics.MetricsJson.
 * - Stay structural: warning codes, schema fields, evidence linkage, bands.
 *
 * Usage:
 *   node scripts/diag/current-build-failure-attribution.cjs --build 0396ea47
 *   node scripts/diag/current-build-failure-attribution.cjs --build 6b9c562f --json
 *   node scripts/diag/current-build-failure-attribution.cjs --latest-per-family
 *   node scripts/diag/current-build-failure-attribution.cjs --latest-verified
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HARD_FAILURE_WARNINGS = new Set([
  'analysis_generation_failed',
  'llm_provider_error',
  'report_damaged',
]);

const SOURCE_ACQUISITION_WARNINGS = new Set([
  'source_fetch_failure',
  'source_fetch_degradation',
  'no_successful_sources',
  'source_acquisition_collapse',
  'search_provider_error',
]);

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
    'Current-build failure attribution (read-only)',
    '',
    'Usage:',
    '  node scripts/diag/current-build-failure-attribution.cjs [options]',
    '',
    'Options:',
    '  --build <prefix>        Restrict to an executed/git build prefix',
    '  --family <slug>         Restrict to one benchmark family',
    '  --latest-verified       Keep only each family latestVerifiedJobId from benchmark-expectations.json',
    '  --latest-per-family     Keep only the latest matching job per family',
    '  --per-family-limit <n>  Limit rows per family after ordering newest-first (default 20 without --build, unlimited with --build)',
    '  --json                  Emit JSON instead of text',
    '  --db <path>             SQLite DB path override',
    '  --help                  Show this help',
    '',
    'No live jobs, LLM calls, or DB writes are made.',
  ].join('\n');
  (exitCode === 0 ? console.log : console.error)(out);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    build: null,
    family: null,
    latestVerified: false,
    latestPerFamily: false,
    perFamilyLimit: null,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--build') args.build = requireValue(argv, ++i, '--build');
    else if (arg === '--family') args.family = requireValue(argv, ++i, '--family');
    else if (arg === '--latest-verified') args.latestVerified = true;
    else if (arg === '--latest-per-family') args.latestPerFamily = true;
    else if (arg === '--per-family-limit') args.perFamilyLimit = parsePositiveInt(requireValue(argv, ++i, '--per-family-limit'), '--per-family-limit');
    else if (arg === '--json') args.json = true;
    else if (arg === '--db') DB = path.resolve(requireValue(argv, ++i, '--db'));
    else {
      console.error(`Unknown argument: ${arg}`);
      usage(2);
    }
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

function normalizeVerdict(label) {
  if (label == null) return null;
  return String(label).trim().toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function shortBuild(build) {
  if (!build) return 'unknown';
  const s = String(build);
  const plus = s.indexOf('+');
  const clean = plus >= 0 ? s.slice(0, plus) : s;
  const suffix = plus >= 0 ? `+${s.slice(plus + 1, plus + 7)}` : '';
  return `${clean.slice(0, 8)}${suffix}`;
}

function shortHash(hash) {
  if (!hash) return 'n/a';
  return String(hash).slice(0, 8);
}

function buildKey(row, result) {
  return row.executedWebGitCommitHash
    || row.gitCommitHash
    || result?.meta?.executedWebGitCommitHash
    || result?.meta?.gitCommitHash
    || 'unknown';
}

function buildMatches(build, prefix) {
  if (!prefix) return true;
  return String(build || '').toLowerCase().startsWith(String(prefix).toLowerCase());
}

function inBand(value, band, noise = 0) {
  const n = finiteNumber(value);
  if (n == null || !band) return false;
  return n >= band.min - noise && n <= band.max + noise;
}

function warningList(result) {
  return Array.isArray(result?.analysisWarnings) ? result.analysisWarnings.filter(Boolean) : [];
}

function warningTypes(result) {
  return warningList(result).map((w) => w.type).filter(Boolean);
}

function countWarnings(result, types) {
  const set = types instanceof Set ? types : new Set(types);
  return warningTypes(result).filter((type) => set.has(type)).length;
}

function parseResult(row) {
  try {
    return { result: JSON.parse(row.resultJson), parseError: null };
  } catch (error) {
    return { result: null, parseError: error instanceof Error ? error.message : String(error) };
  }
}

function parseMetrics(row) {
  if (!row.metricsJson) return null;
  try {
    return JSON.parse(row.metricsJson);
  } catch {
    return null;
  }
}

function qhf1(row, result, parseError) {
  const hardWarnings = result ? warningTypes(result).filter((type) => HARD_FAILURE_WARNINGS.has(type)) : [];
  const verdict = normalizeVerdict(result?.verdict || row.verdictLabel);
  const truth = finiteNumber(result?.truthPercentage ?? row.truthPercentage);
  const confidence = finiteNumber(result?.confidence ?? row.confidence);
  const missingVerdict = !verdict || truth == null || confidence == null;
  const passed = row.status === 'SUCCEEDED' && !parseError && hardWarnings.length === 0 && !missingVerdict;
  return {
    passed,
    hardWarnings,
    missingVerdict,
    parseError,
  };
}

function qbe(row, result, family, noise) {
  const verdict = normalizeVerdict(result?.verdict || row.verdictLabel);
  const truth = finiteNumber(result?.truthPercentage ?? row.truthPercentage);
  const confidence = finiteNumber(result?.confidence ?? row.confidence);
  const expectedLabels = new Set((family.expectedVerdictLabels || []).map(normalizeVerdict));
  return {
    verdict,
    truth,
    confidence,
    labelOk: verdict != null && expectedLabels.has(verdict),
    truthOk: inBand(truth, family.truthPercentageBand, noise),
    confidenceOk: inBand(confidence, family.confidenceBand, 0),
    truthDistance: bandDistance(truth, family.truthPercentageBand, noise),
    confidenceDistance: bandDistance(confidence, family.confidenceBand, 0),
  };
}

function bandDistance(value, band, noise) {
  const n = finiteNumber(value);
  if (n == null || !band) return null;
  const min = band.min - noise;
  const max = band.max + noise;
  if (n >= min && n <= max) return 0;
  return n < min ? min - n : n - max;
}

function linkedEvidenceForClaim(result, claimId) {
  const evidence = Array.isArray(result?.evidenceItems) ? result.evidenceItems : [];
  return evidence.filter((item) => {
    if (!item) return false;
    if (Array.isArray(item.relevantClaimIds) && item.relevantClaimIds.includes(claimId)) return true;
    return false;
  });
}

function qev6(result) {
  const verdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const sources = new Map((Array.isArray(result?.sources) ? result.sources : [])
    .filter((source) => source?.id)
    .map((source) => [source.id, source]));

  const claimRows = verdicts.map((verdict) => {
    const claimId = verdict?.claimId || '(unknown)';
    const linked = linkedEvidenceForClaim(result, claimId);
    const citedIds = new Set([
      ...(Array.isArray(verdict?.supportingEvidenceIds) ? verdict.supportingEvidenceIds : []),
      ...(Array.isArray(verdict?.contradictingEvidenceIds) ? verdict.contradictingEvidenceIds : []),
    ]);
    const cited = (Array.isArray(result?.evidenceItems) ? result.evidenceItems : [])
      .filter((item) => citedIds.has(item?.id));
    const all = uniqueById([...linked, ...cited]);
    const researched = all.filter((item) => {
      const source = sources.get(item?.sourceId);
      return Boolean(source?.searchQuery);
    });
    return {
      claimId,
      linkedEvidence: linked.length,
      citedEvidence: cited.length,
      researchedEvidence: researched.length,
      verdict: verdict?.verdict || null,
      verdictReason: verdict?.verdictReason || null,
    };
  });

  const failedClaims = claimRows.filter((row) => row.researchedEvidence === 0).map((row) => row.claimId);
  return {
    status: verdicts.length > 0 ? 'available' : 'partial',
    passed: verdicts.length > 0 && failedClaims.length === 0,
    failedClaims,
    claims: claimRows,
  };
}

function uniqueById(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const id = item?.id || JSON.stringify(item);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function qevLanguage(result) {
  const languageIntent = result?.languageIntent || result?.meta?.languageIntent || null;
  const evidence = Array.isArray(result?.evidenceItems) ? result.evidenceItems : [];
  const sourceLanguages = evidence.map((item) => item?.sourceLanguage).filter(Boolean);
  const primaryLane = Array.isArray(languageIntent?.retrievalLanguages)
    ? languageIntent.retrievalLanguages.find((lane) => lane?.lane === 'primary')
    : null;
  const primaryLanguage = primaryLane?.language || null;
  const foreignCount = primaryLanguage
    ? sourceLanguages.filter((lang) => lang !== primaryLanguage).length
    : 0;
  return {
    status: sourceLanguages.length > 0 ? 'available' : 'partial',
    inputLanguage: languageIntent?.inputLanguage || null,
    primaryLanguage,
    retrievalLanguages: Array.isArray(languageIntent?.retrievalLanguages) ? languageIntent.retrievalLanguages : [],
    sourceLanguageCount: sourceLanguages.length,
    foreignEvidenceRatio: sourceLanguages.length > 0 ? foreignCount / sourceLanguages.length : null,
    note: sourceLanguages.length > 0 ? null : 'sourceLanguage not persisted on evidence items',
  };
}

function d5Metrics(result, metrics) {
  const warnings = warningList(result);
  const warningInsufficient = warnings.filter((w) => w.type === 'insufficient_evidence' || w.type === 'insufficient_direct_evidence');
  const fromMetrics = metrics?.qualityHealth?.d5 || null;
  const claimDiagnostics = Array.isArray(fromMetrics?.claimDiagnostics)
    ? fromMetrics.claimDiagnostics
    : warningInsufficient.map((w) => ({
      claimId: w.details?.claimId || '(unknown)',
      sufficiencyStatus: w.type,
      directApplicabilityRequired: w.details?.directApplicabilityRequired === true,
      totalDirectionalCount: finiteNumber(w.details?.totalDirectionalCount) ?? 0,
      directDirectionalCount: finiteNumber(w.details?.directDirectionalCount) ?? 0,
      nonDirectDirectionalCount: finiteNumber(w.details?.nonDirectDirectionalCount) ?? 0,
    }));

  return {
    available: Boolean(fromMetrics) || warningInsufficient.length > 0,
    insufficientEvidenceClaims: fromMetrics?.insufficientEvidenceClaims ?? warningInsufficient.filter((w) => w.type === 'insufficient_evidence').length,
    insufficientDirectEvidenceClaims: fromMetrics?.insufficientDirectEvidenceClaims ?? warningInsufficient.filter((w) => w.type === 'insufficient_direct_evidence').length,
    applicabilityAssessmentDegradedEvents: fromMetrics?.applicabilityAssessmentDegradedEvents ?? warnings.filter((w) => w.type === 'evidence_applicability_assessment_degraded').length,
    totalDirectionalEvidenceTotal: fromMetrics?.totalDirectionalEvidenceTotal ?? sum(claimDiagnostics.map((d) => d.totalDirectionalCount)),
    directDirectionalEvidenceTotal: fromMetrics?.directDirectionalEvidenceTotal ?? sum(claimDiagnostics.map((d) => d.directDirectionalCount)),
    claimDiagnostics,
  };
}

function sourceAcquisition(result, metrics) {
  const warnings = warningList(result);
  const searchQueries = Array.isArray(metrics?.searchQueries) ? metrics.searchQueries : [];
  const fetchWarnings = warnings.filter((w) => SOURCE_ACQUISITION_WARNINGS.has(w.type));
  const attempted = sum(fetchWarnings.map((w) => finiteNumber(w.details?.attempted) ?? 0));
  const failed = sum(fetchWarnings.map((w) => finiteNumber(w.details?.failed) ?? 0));
  return {
    warningCount: fetchWarnings.length,
    warningTypes: tally(fetchWarnings.map((w) => w.type)),
    attempted,
    failed,
    failureRatio: attempted > 0 ? failed / attempted : null,
    queryBudgetExhausted: warnings.some((w) => w.type === 'query_budget_exhausted'),
    searchQueries: searchQueries.length,
    failedSearchQueries: searchQueries.filter((q) => q?.success === false).length,
    sourceCount: Array.isArray(result?.sources) ? result.sources.length : 0,
    evidenceCount: Array.isArray(result?.evidenceItems) ? result.evidenceItems.length : 0,
  };
}

function verdictIntegrity(result, metrics) {
  const warnings = warningList(result);
  const verdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const warningCount = warnings.filter((w) => w.type === 'verdict_integrity_failure').length;
  const downgradedClaims = verdicts
    .filter((verdict) => verdict?.verdictReason === 'verdict_integrity_failure')
    .map((verdict) => verdict.claimId || '(unknown)');
  return {
    warningCount,
    downgradedClaims,
    telemetry: metrics?.pipelineTelemetry?.verdictDirection || null,
  };
}

function cost(result, metrics) {
  const tokenCounts = metrics?.tokenCounts || {};
  return {
    llmCalls: finiteNumber(result?.meta?.llmCalls) ?? (Array.isArray(metrics?.llmCalls) ? metrics.llmCalls.length : null),
    metricLlmCalls: Array.isArray(metrics?.llmCalls) ? metrics.llmCalls.length : null,
    estimatedCostUSD: finiteNumber(metrics?.estimatedCostUSD),
    totalTokens: finiteNumber(tokenCounts.totalTokens),
    cacheReadInputTokens: finiteNumber(tokenCounts.cacheReadInputTokens),
  };
}

function attribution(row, result, metrics, checks) {
  if (!checks.qhf1.passed) {
    return {
      owner: 'runtime_integrity',
      confidence: checks.qhf1.hardWarnings.length > 0 || checks.qhf1.parseError ? 'high' : 'medium',
      reason: checks.qhf1.hardWarnings.join('|') || checks.qhf1.parseError || 'missing verdict/status',
    };
  }

  const verdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const topUnverified = checks.qbe.verdict === 'UNVERIFIED';
  const claimUnverified = verdicts.filter((v) => v?.verdict === 'UNVERIFIED').length;
  const allClaimsUnverified = verdicts.length > 0 && claimUnverified === verdicts.length;

  if (checks.integrity.warningCount > 0 || checks.integrity.downgradedClaims.length > 0) {
    return { owner: 'stage4_verdict_integrity', confidence: 'high', reason: 'verdict_integrity_failure present' };
  }

  const qbeFailed = !checks.qbe.labelOk || !checks.qbe.truthOk || !checks.qbe.confidenceOk;
  if (topUnverified || allClaimsUnverified || (qbeFailed && claimUnverified > 0)) {
    if (checks.d5.insufficientEvidenceClaims > 0 || checks.d5.insufficientDirectEvidenceClaims > 0) {
      if (checks.d5.totalDirectionalEvidenceTotal === 0) {
        return { owner: 'research_extraction_or_relevance', confidence: 'medium', reason: 'D5 saw zero directional evidence' };
      }
      if (checks.d5.insufficientDirectEvidenceClaims > 0 || checks.d5.directDirectionalEvidenceTotal === 0) {
        return { owner: 'd5_directness', confidence: 'high', reason: 'D5 direct evidence requirement not met' };
      }
      if (checks.source.queryBudgetExhausted) {
        return { owner: 'research_budget_or_d5_sufficiency', confidence: 'medium', reason: 'query budget exhausted before sufficiency' };
      }
      return { owner: 'd5_sufficiency', confidence: 'medium', reason: 'D5 insufficient evidence warning present' };
    }

    if (checks.source.evidenceCount === 0 || checks.qev6.failedClaims.length > 0) {
      return { owner: 'research_completeness', confidence: checks.qev6.status === 'available' ? 'high' : 'medium', reason: 'claim has zero researched evidence' };
    }

    if (checks.source.warningCount > 0 || checks.source.queryBudgetExhausted) {
      return { owner: 'source_acquisition_or_budget', confidence: 'medium', reason: 'source/fetch/budget warnings present' };
    }
  }

  if (!checks.qbe.labelOk || !checks.qbe.truthOk || !checks.qbe.confidenceOk) {
    return { owner: 'benchmark_expectation_alignment', confidence: 'low', reason: 'Q-BE out of band without sharper structural owner' };
  }

  return { owner: 'none_detected', confidence: 'medium', reason: 'no structural failure owner detected' };
}

function confidenceForCell(items) {
  if (items.length >= 5) return 'high';
  if (items.length >= 2) return 'medium';
  if (items.length === 1) return 'low';
  return 'none';
}

function sum(values) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function tally(values) {
  const out = {};
  for (const value of values.filter(Boolean)) out[value] = (out[value] || 0) + 1;
  return out;
}

function pct(value, total) {
  return total > 0 ? value / total : null;
}

function fmtPct(value) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function fmtBool(value) {
  return value ? 'yes' : 'no';
}

function compactStatus(value) {
  if (value === true) return 'pass';
  if (value === false) return 'fail';
  return 'n/a';
}

function queryRows(families) {
  const inputs = families.map((family) => family.inputValue);
  const inList = inputs.map(sqlQuote).join(',');
  return sqliteJson(`
    SELECT
      j.JobId AS jobId,
      j.Status AS status,
      j.CreatedUtc AS createdUtc,
      j.InputValue AS inputValue,
      j.VerdictLabel AS verdictLabel,
      j.TruthPercentage AS truthPercentage,
      j.Confidence AS confidence,
      j.GitCommitHash AS gitCommitHash,
      j.ExecutedWebGitCommitHash AS executedWebGitCommitHash,
      j.PromptContentHash AS promptContentHash,
      j.ResultJson AS resultJson,
      m.MetricsJson AS metricsJson
    FROM Jobs j
    LEFT JOIN AnalysisMetrics m ON m.JobId = j.JobId
    WHERE j.InputValue IN (${inList})
      AND j.ResultJson IS NOT NULL
    ORDER BY j.CreatedUtc DESC
  `);
}

function applyFilters(items, args, families) {
  let out = items.filter((item) => buildMatches(item.build, args.build));
  if (args.latestVerified) {
    const latestIds = new Set(families.map((family) => family.latestVerifiedJobId).filter(Boolean));
    out = out.filter((item) => latestIds.has(item.jobId));
  }
  if (args.latestPerFamily) {
    const seen = new Set();
    out = out.filter((item) => {
      if (seen.has(item.familySlug)) return false;
      seen.add(item.familySlug);
      return true;
    });
  }
  const limit = args.perFamilyLimit ?? (args.build ? null : 20);
  if (limit) {
    const counts = new Map();
    out = out.filter((item) => {
      const count = counts.get(item.familySlug) || 0;
      if (count >= limit) return false;
      counts.set(item.familySlug, count + 1);
      return true;
    });
  }
  return out;
}

function buildSummaries(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.familySlug}|${item.build}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return [...groups.entries()].map(([key, rows]) => {
    const [familySlug, build] = key.split('|');
    const qhf1Fail = rows.filter((row) => !row.qhf1.passed).length;
    const qbeFail = rows.filter((row) => !(row.qbe.labelOk && row.qbe.truthOk && row.qbe.confidenceOk)).length;
    const topUnverified = rows.filter((row) => row.qbe.verdict === 'UNVERIFIED').length;
    const claimUnverified = sum(rows.map((row) => row.claimVerdictSummary.unverified));
    const claimTotal = sum(rows.map((row) => row.claimVerdictSummary.total));
    const lowConfidenceBlockers = rows.filter((row) => row.cellConfidence === 'low' || row.attribution.confidence === 'low').length;
    const promptHashes = [...new Set(rows.map((row) => row.promptContentHash).filter(Boolean))];
    return {
      familySlug,
      build,
      buildShort: shortBuild(build),
      promptShort: promptHashes.length === 0 ? 'n/a' : promptHashes.length === 1 ? shortHash(promptHashes[0]) : 'mixed',
      n: rows.length,
      cellConfidence: confidenceForCell(rows),
      latestCreatedUtc: rows[0]?.createdUtc || null,
      qhf1Fail,
      qbeFail,
      topUnverified,
      claimUnverified,
      claimUnverifiedRate: pct(claimUnverified, claimTotal),
      owners: tally(rows.map((row) => row.attribution.owner)),
      lowConfidenceBlockers,
      behaviorEditBlocked: confidenceForCell(rows) === 'low' || lowConfidenceBlockers > 0,
    };
  }).sort((a, b) => (b.latestCreatedUtc || '').localeCompare(a.latestCreatedUtc || ''));
}

function toItem(row, family, noise) {
  const { result, parseError } = parseResult(row);
  const metrics = parseMetrics(row);
  const build = buildKey(row, result);
  const qhf1Check = qhf1(row, result, parseError);
  const qbeCheck = result ? qbe(row, result, family, noise) : {
    verdict: normalizeVerdict(row.verdictLabel),
    truth: finiteNumber(row.truthPercentage),
    confidence: finiteNumber(row.confidence),
    labelOk: false,
    truthOk: false,
    confidenceOk: false,
  };
  const qev6Check = result ? qev6(result) : { status: 'unavailable', passed: false, failedClaims: [], claims: [] };
  const qevLanguageCheck = result ? qevLanguage(result) : { status: 'unavailable' };
  const d5Check = result ? d5Metrics(result, metrics) : { available: false, insufficientEvidenceClaims: 0, insufficientDirectEvidenceClaims: 0, totalDirectionalEvidenceTotal: 0, directDirectionalEvidenceTotal: 0, claimDiagnostics: [] };
  const sourceCheck = result ? sourceAcquisition(result, metrics) : { warningCount: 0, queryBudgetExhausted: false, sourceCount: 0, evidenceCount: 0 };
  const integrityCheck = result ? verdictIntegrity(result, metrics) : { warningCount: 0, downgradedClaims: [] };
  const verdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const claimSummary = {
    total: verdicts.length,
    unverified: verdicts.filter((v) => v?.verdict === 'UNVERIFIED').length,
  };
  const checks = {
    qhf1: qhf1Check,
    qbe: qbeCheck,
    qev6: qev6Check,
    qevLanguage: qevLanguageCheck,
    d5: d5Check,
    source: sourceCheck,
    integrity: integrityCheck,
  };
  const attr = result ? attribution(row, result, metrics, checks) : { owner: 'result_parse', confidence: 'high', reason: parseError || 'parse error' };
  return {
    familySlug: family.slug,
    jobId: row.jobId,
    status: row.status,
    createdUtc: row.createdUtc,
    build,
    buildShort: shortBuild(build),
    promptContentHash: result?.meta?.promptContentHash || row.promptContentHash || null,
    verdict: qbeCheck.verdict,
    truth: qbeCheck.truth,
    confidence: qbeCheck.confidence,
    qhf1: qhf1Check,
    qbe: qbeCheck,
    qev6: qev6Check,
    qevLanguage: qevLanguageCheck,
    d5: d5Check,
    source: sourceCheck,
    integrity: integrityCheck,
    cost: result ? cost(result, metrics) : {},
    claimVerdictSummary: claimSummary,
    attribution: attr,
    cellConfidence: 'pending',
  };
}

function attachCellConfidence(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.familySlug}|${item.build}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const rows of groups.values()) {
    const confidence = confidenceForCell(rows);
    for (const row of rows) row.cellConfidence = confidence;
  }
  return items;
}

function textReport(payload) {
  console.log('# CURRENT-BUILD FAILURE ATTRIBUTION (read-only)');
  console.log(`DB: ${DB}`);
  console.log(`Rows: ${payload.items.length}; build filter: ${payload.args.build || 'none'}; family filter: ${payload.args.family || 'none'}; latestVerified: ${fmtBool(payload.args.latestVerified)}`);
  console.log(`Noise policy: truthPercentage +/-${payload.noiseTolerancePct} points; confidence strict.`);
  console.log('Minimum-N policy: n>=5 high, n>=2 medium, n=1 low. Low-confidence rows block downstream behavior edits.\n');

  if (payload.latestVerifiedMissing.length > 0) {
    console.log('## Missing latest-verified comparators in this DB');
    for (const item of payload.latestVerifiedMissing) {
      console.log(`  - ${item.familySlug}: ${item.jobId}`);
    }
    console.log('');
  }

  console.log('## Family/build summary');
  if (payload.summaries.length === 0) {
    console.log('  n/a');
  } else {
    console.log('family                    build               prompt    n  conf    QHF1  QBE  topUnv  claimUnv  blocked  owner');
    console.log('------------------------  ------------------  --------  -  ------  ----  ---  ------  --------  -------  ----------------------------');
    for (const row of payload.summaries) {
      const owner = Object.entries(row.owners).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
      console.log([
        row.familySlug.padEnd(24),
        row.buildShort.padEnd(18),
        row.promptShort.padEnd(8),
        String(row.n).padStart(1),
        row.cellConfidence.padEnd(6),
        String(row.qhf1Fail).padStart(4),
        String(row.qbeFail).padStart(3),
        String(row.topUnverified).padStart(6),
        fmtPct(row.claimUnverifiedRate).padStart(8),
        fmtBool(row.behaviorEditBlocked).padStart(7),
        owner,
      ].join('  '));
    }
  }

  console.log('\n## Job details');
  if (payload.items.length === 0) {
    console.log('  n/a');
    return;
  }
  console.log('family                    jobId                             prompt    verdict        QHF1  QBE  EV6  D5(insuff/direct/dir)  source(fetch/budget/ev)  owner(conf)');
  console.log('------------------------  --------------------------------  --------  -------------  ----  ---  ---  ---------------------  -----------------------  ------------------------------');
  for (const item of payload.items) {
    const qbePass = item.qbe.labelOk && item.qbe.truthOk && item.qbe.confidenceOk;
    const d5 = `${item.d5.insufficientEvidenceClaims}/${item.d5.insufficientDirectEvidenceClaims}/${item.d5.totalDirectionalEvidenceTotal}`;
    const src = `${item.source.warningCount}/${fmtBool(item.source.queryBudgetExhausted)}/${item.source.evidenceCount}`;
    console.log([
      item.familySlug.padEnd(24),
      item.jobId.padEnd(32),
      shortHash(item.promptContentHash).padEnd(8),
      String(item.verdict || 'n/a').padEnd(13),
      compactStatus(item.qhf1.passed).padEnd(4),
      compactStatus(qbePass).padEnd(3),
      compactStatus(item.qev6.passed).padEnd(3),
      d5.padEnd(21),
      src.padEnd(23),
      `${item.attribution.owner}(${item.attribution.confidence})`,
    ].join('  '));
  }

  console.log('\n## Notes');
  console.log('  - Q-EV6 is structural/partial: researched evidence means stored linked/cited evidence with a source searchQuery.');
  console.log('  - Q-EV_LANGUAGE is partial when sourceLanguage is not persisted; retrieval language lanes are still reported in JSON.');
  console.log('  - Attribution owners are structural routing hints, not proof of semantic root cause.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const benchmark = readJson(path.join('Docs', 'AGENTS', 'benchmark-expectations.json'));
  const noiseTolerancePct = finiteNumber(benchmark.noiseTolerancePct) ?? 8;
  let families = Array.isArray(benchmark.families) ? benchmark.families : [];
  if (args.family) {
    families = families.filter((family) => family.slug === args.family);
    if (families.length === 0) {
      console.error(`No benchmark family with slug: ${args.family}`);
      process.exit(1);
    }
  }

  const familyByInput = new Map(families.map((family) => [family.inputValue, family]));
  const rows = queryRows(families);
  let items = rows
    .map((row) => {
      const family = familyByInput.get(row.inputValue);
      return family ? toItem(row, family, noiseTolerancePct) : null;
    })
    .filter(Boolean);
  items = applyFilters(items, args, families);
  items = attachCellConfidence(items);
  const payload = {
    args,
    dbPath: DB,
    noiseTolerancePct,
    families: families.map((family) => family.slug),
    items,
    summaries: buildSummaries(items),
    latestVerifiedMissing: latestVerifiedMissing(args, families, items),
    policy: {
      scorerNoiseFloorTruthPct: noiseTolerancePct,
      confidenceBandStrict: true,
      minimumN: { high: 5, medium: 2, low: 1 },
      lowConfidenceBlocksBehaviorEdits: true,
    },
  };

  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else textReport(payload);
}

function latestVerifiedMissing(args, families, items) {
  if (!args.latestVerified) return [];
  const present = new Set(items.map((item) => item.jobId));
  return families
    .map((family) => ({ familySlug: family.slug, jobId: family.latestVerifiedJobId || null }))
    .filter((item) => item.jobId && !present.has(item.jobId));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
