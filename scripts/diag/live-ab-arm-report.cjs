#!/usr/bin/env node
'use strict';

/*
 * Read-only report for the controlled FactHarbor live A/B pilot.
 * Reads SQLite with `-readonly`; it never submits jobs or changes configuration.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const API_DB = process.env.FH_DB_PATH || path.join(ROOT, 'apps', 'api', 'factharbor.db');
const CONFIG_DB = process.env.FH_CONFIG_DB_PATH || path.join(ROOT, 'apps', 'web', 'config.db');
const HARD = ['report_damaged', 'analysis_generation_failed', 'llm_provider_error'];
const SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD = 7.83 / 8;
const EXPECTED_CONFIG_KEYS = [
  'calculation/default',
  'pipeline/default',
  'prompt/claimboundary',
  'search/default',
  'sr/default',
];

const sqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;
const parse = (value) => { try { return typeof value === 'string' ? JSON.parse(value) : value || null; } catch { return null; } };
const short = (value, n = 10) => value ? String(value).slice(0, n) : '-';
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const fmt = (value, digits = 0) => finite(value) ? value.toFixed(digits) : '-';
const mean = (values) => { const xs = values.filter(finite); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
const hashText = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

function sql(db, query) {
  const output = execFileSync('sqlite3', ['-readonly', '-json', db, query], { encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
  return output ? JSON.parse(output) : [];
}

function configHashes(rows) {
  const grouped = {};
  for (const row of rows) {
    const key = `${row.config_type}/${row.profile_key}`;
    if (!grouped[key]) grouped[key] = new Set();
    grouped[key].add(row.content_hash);
  }
  return Object.fromEntries(Object.entries(grouped).map(([key, values]) => [key, [...values].sort()]));
}

function reconstructPreNarrativeConfidence(result) {
  const audit = result?.adjudicationPath;
  if (!audit) return null;
  if (audit.path !== 'llm_adjudicated') return finite(audit.baselineAggregate?.confidence) ? audit.baselineAggregate.confidence : null;
  let value = audit.llmAdjudication?.rawConfidence;
  if (!finite(value)) return null;
  value = Math.max(0, Math.min(100, value));
  if (audit.guardsApplied?.confidenceCeiled) {
    const claimConfidences = (result.claimVerdicts || []).map((claim) => claim.confidence).filter(finite);
    if (!claimConfidences.length) return null;
    value = Math.min(value, Math.max(...claimConfidences));
  }
  if (audit.guardsApplied?.integrityDowngraded) value = Math.min(value, 24);
  return value;
}

function sourceReliabilitySummary(metrics, warnings) {
  const prefetch = metrics?.sourceReliabilityPrefetch || {};
  const warning = (warnings || []).find((entry) => entry?.type === 'source_reliability_error');
  const errorByType = warning?.details?.errorByType || {};
  const calls = Array.isArray(metrics?.llmCalls) ? metrics.llmCalls : [];
  const unknownUsageTransport = calls.filter((call) =>
    call?.taskType === 'source_reliability' && call?.usageAvailable === false && call?.failureKind === 'transport'
  );
  const isLostEvaluationMarker = (call) =>
    call?.provider === 'unknown' && call?.modelName === 'unknown' && call?.durationMs === 0;
  const lostEvaluationMarkers = unknownUsageTransport.filter(isLostEvaluationMarker).length;
  const unresolvedPhysicalCalls = unknownUsageTransport.filter((call) => !isLostEvaluationMarker(call)).length;
  return {
    domains: prefetch.domains ?? null,
    alreadyPrefetched: prefetch.alreadyPrefetched ?? null,
    cacheHits: prefetch.cacheHits ?? null,
    evaluated: prefetch.evaluated ?? null,
    noConsensus: prefetch.noConsensus ?? null,
    errors: prefetch.errors ?? null,
    errorByType,
    unknownUsageTransportCalls: unknownUsageTransport.length,
    lostEvaluationMarkers,
    unresolvedPhysicalCalls,
    boundedUnknownUSD: lostEvaluationMarkers * SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD,
  };
}

function callGroup(call) {
  if (call?.taskType === 'cluster') return 'clustering';
  if (call?.taskType === 'source_reliability') return 'source-reliability';
  if (call?.taskType === 'claim_selection') return 'stage-1';
  if (call?.taskType === 'understand') return 'stage-1-or-2';
  if (call?.taskType === 'other') return 'stage-1-or-calibration';
  if (call?.taskType === 'aggregate') return 'stage-5';
  if (call?.taskType === 'verdict' && call?.debateRole) return 'stage-4';
  if (call?.taskType === 'verdict') return 'stage-4-or-5';
  return call?.taskType || 'unknown';
}

function timeoutSummary(calls) {
  const confirmed = {};
  const proxies = {};
  for (const call of calls || []) {
    const group = callGroup(call);
    if (/UND_ERR_HEADERS_TIMEOUT|Headers Timeout Error/i.test(String(call.errorMessage || ''))) {
      confirmed[group] = (confirmed[group] || 0) + 1;
    }
    if (finite(call.durationMs) && call.durationMs >= 300000) proxies[group] = (proxies[group] || 0) + 1;
  }
  return { confirmed, proxies };
}

function fallbackSummary(metrics, result, warnings = []) {
  const telemetry = metrics?.pipelineTelemetry || {};
  const rolesWithFallback = Object.values(result?.meta?.runtimeRoleModels || {}).filter((entry) => entry?.fallbackUsed === true).length;
  return {
    contractRetries: telemetry.contractValidation?.retryCount ?? null,
    contractRepairs: telemetry.contractValidation?.repairPassCount ?? null,
    challengerPrecheck: telemetry.challengerModelGuard?.precheckFallbackCount ?? null,
    challengerRetry: telemetry.challengerModelGuard?.retryFallbackCount ?? null,
    rolesWithFallback,
    boundaryClusteringFallback: warnings.some((warning) => warning?.type === 'boundary_clustering_failed'),
    articleAdjudicationPath: result?.adjudicationPath?.path ?? null,
    persistentMarkerCoverage: 'not_exhaustive',
  };
}

function costSummary(metrics, sr, historicalAllowance = null) {
  const hasKnownSubtotal = finite(metrics?.costEstimate?.knownSubtotalUSD);
  const knownSubtotalUSD = hasKnownSubtotal
    ? metrics.costEstimate.knownSubtotalUSD
    : (finite(metrics?.estimatedCostUSD) ? metrics.estimatedCostUSD : null);
  const recordedUnpricedCalls = Number.isInteger(metrics?.costEstimate?.unpricedCalls) && metrics.costEstimate.unpricedCalls >= 0
    ? metrics.costEstimate.unpricedCalls
    : null;
  const metadataConsistent = hasKnownSubtotal
    && recordedUnpricedCalls !== null
    && recordedUnpricedCalls >= sr.unknownUsageTransportCalls;
  const unresolvedUnpricedCalls = !metadataConsistent
    ? null
    : Math.max(sr.unresolvedPhysicalCalls, recordedUnpricedCalls - sr.lostEvaluationMarkers);
  const historicalAllowanceUSD = finite(historicalAllowance?.usd) ? historicalAllowance.usd : 0;
  const boundedUnknownUSD = sr.boundedUnknownUSD + historicalAllowanceUSD;
  const upperResolved = metadataConsistent && unresolvedUnpricedCalls === 0;
  return {
    exactUSD: finite(metrics?.estimatedCostUSD) ? metrics.estimatedCostUSD : null,
    knownSubtotalUSD,
    recordedUnpricedCalls,
    unresolvedUnpricedCalls,
    boundedUnknownUSD,
    historicalAllowanceUSD,
    historicalAllowanceProvenance: historicalAllowance?.provenance || null,
    conservativeUpperUSD: upperResolved ? knownSubtotalUSD + boundedUnknownUSD : null,
  };
}

function loadAcceptedHistoricalAllowances() {
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'diag', 'model-upgrade-pilot', 'conditional-pilot-plan.json'), 'utf8'));
  return plan.acceptedHistoricalCostAllowances || {};
}

function armCostSummary(jobs, lost = 0) {
  const bounds = jobs.map((job) => job.missing ? null : job.cost?.conservativeUpperUSD);
  const finiteBounds = bounds.filter(finite);
  const attempts = jobs.length + lost;
  return {
    resolved: attempts > 0 && lost === 0 && bounds.length === finiteBounds.length,
    knownPartialUSD: finiteBounds.reduce((a, b) => a + b, 0),
    finiteAttempts: finiteBounds.length,
    attempts,
  };
}

function parseArms(argv) {
  const arms = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--arm') continue;
    const [name, value] = String(argv[++i] || '').split(/=(.*)/s);
    if (!name || !value) throw new Error('use --arm <name>=<runs.jsonl | jobId,jobId>');
    let ids = [];
    let lost = 0;
    if (fs.existsSync(value)) {
      for (const line of fs.readFileSync(value, 'utf8').split(/\r?\n/).filter(Boolean)) {
        const record = parse(line);
        if (record?.jobId) ids.push(record.jobId); else lost++;
      }
    } else {
      ids = value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    arms.push({ name, ids: [...new Set(ids)], lost });
  }
  if (!arms.length) throw new Error('need at least one --arm');
  return arms;
}

function loadManifest(argv) {
  const index = argv.indexOf('--manifest');
  if (index < 0) return null;
  return JSON.parse(fs.readFileSync(argv[index + 1], 'utf8'));
}

function loadJob(id, benchmark, manifest, armName, historicalAllowances) {
  const row = sql(API_DB, `SELECT JobId, Status, CreatedUtc, InputValue, ExecutedWebGitCommitHash, GitCommitHash, PromptContentHash, VerdictLabel, TruthPercentage, Confidence, ResultJson FROM Jobs WHERE JobId=${sqlLiteral(id)}`)[0];
  if (!row) return { id, missing: true };
  const result = parse(row.ResultJson) || {};
  const metrics = parse((sql(API_DB, `SELECT MetricsJson FROM AnalysisMetrics WHERE JobId=${sqlLiteral(id)} ORDER BY CreatedUtc DESC LIMIT 1`)[0] || {}).MetricsJson) || {};
  const usage = configHashes(sql(CONFIG_DB, `SELECT config_type, profile_key, content_hash FROM config_usage WHERE job_id=${sqlLiteral(id)} ORDER BY loaded_utc`));
  const warnings = Array.isArray(result.analysisWarnings) ? result.analysisWarnings : [];
  const calls = Array.isArray(metrics.llmCalls) ? metrics.llmCalls : [];
  const searches = Array.isArray(metrics.searchQueries) ? metrics.searchQueries : [];
  const sr = sourceReliabilitySummary(metrics, warnings);
  const cost = costSummary(metrics, sr, historicalAllowances[row.JobId] || null);
  const family = (benchmark.families || []).find((entry) => entry.inputValue === row.InputValue);
  const verdict = row.VerdictLabel || result.verdict || null;
  const truth = finite(result.truthPercentage) ? result.truthPercentage : row.TruthPercentage;
  const confidence = finite(result.confidence) ? result.confidence : row.Confidence;
  let band = family ? null : 'NOT-APPROVED';
  if (family && row.Status === 'SUCCEEDED') {
    const tolerance = benchmark.noiseTolerancePct || 0;
    const labelOk = family.expectedVerdictLabels.includes(verdict);
    const truthOk = truth >= family.truthPercentageBand.min - tolerance && truth <= family.truthPercentageBand.max + tolerance;
    const confidenceOk = confidence >= family.confidenceBand.min && confidence <= family.confidenceBand.max;
    band = `${labelOk && truthOk && confidenceOk ? 'IN' : 'OUT'} (L${labelOk ? 'Y' : 'N'} T${truthOk ? 'Y' : 'N'} C${confidenceOk ? 'Y' : 'N'})`;
  }
  const approvedCommit = manifest?.approvedCommit || null;
  const expectedConfigs = manifest?.arms?.[armName]?.activeConfigs || {};
  const configFlags = [];
  for (const key of EXPECTED_CONFIG_KEYS) {
    const hashes = usage[key] || [];
    if (hashes.length !== 1) configFlags.push(`${key}:${hashes.length ? 'mixed' : 'missing'}`);
    else if (expectedConfigs[key] && hashes[0] !== expectedConfigs[key]) configFlags.push(`${key}:unexpected`);
  }
  return {
    id,
    status: row.Status,
    input: row.InputValue,
    inputId: family?.slug || 'NOT-APPROVED',
    approvedCommit,
    startCommit: row.ExecutedWebGitCommitHash || result.meta?.executedWebGitCommitHash || null,
    completionCommit: metrics.telemetryContext?.pipelineCommitId || null,
    createdCommit: row.GitCommitHash || null,
    promptHash: row.PromptContentHash || result.meta?.promptContentHash || null,
    configHashes: usage,
    configFlags,
    verdict,
    truth,
    confidence,
    preNarrativeConfidence: reconstructPreNarrativeConfidence(result),
    narrativeRequestedConfidence: result.verdictNarrative?.adjustedConfidence ?? null,
    band,
    claims: (result.claimVerdicts || []).length,
    boundaries: (result.claimBoundaries || []).length,
    evidence: (result.evidenceItems || []).length,
    hard: warnings.filter((warning) => HARD.includes(warning?.type)).map((warning) => warning.type),
    failedCalls: calls.filter((call) => call?.success === false).length,
    sr,
    cost,
    searches: { total: searches.length, cached: searches.filter((query) => query?.cached === true).length },
    timeouts: timeoutSummary(calls),
    fallbacks: fallbackSummary(metrics, result, warnings),
    result,
  };
}

function blindPacket(jobs, manifest = null) {
  // Hash-order the packet so the caller's A/B argument order is not preserved.
  // The packet deliberately emits no reverse map; the run owner keeps provenance
  // separate until the claim-level review is complete.
  const blindedOrder = [...jobs].sort((left, right) => hashText(left.id).localeCompare(hashText(right.id)));
  const reports = blindedOrder.map((job, index) => {
    const statements = new Map((job.result?.understanding?.atomicClaims || []).map((claim) => [claim.id, claim.statement]));
    const evidenceById = new Map((job.result?.evidenceItems || []).map((item) => [item.id, item]));
    return {
      anonymousId: `report-${index + 1}-${hashText(job.id).slice(0, 8)}`,
      input: job.input,
      article: { verdict: job.verdict, truthPercentage: job.truth, confidence: job.confidence },
      claims: (job.result?.claimVerdicts || []).map((claim) => {
        const evidenceIds = [...new Set([...(claim.supportingEvidenceIds || []), ...(claim.contradictingEvidenceIds || [])])];
        return {
          claimId: claim.claimId,
          statement: statements.get(claim.claimId) || null,
          verdict: claim.verdict,
          truthPercentage: claim.truthPercentage,
          confidence: claim.confidence,
          reasoning: claim.reasoning,
          supportingEvidenceIds: claim.supportingEvidenceIds || [],
          contradictingEvidenceIds: claim.contradictingEvidenceIds || [],
          evidence: evidenceIds.map((id) => {
            const item = evidenceById.get(id) || {};
            return { id, statement: item.statement, claimDirection: item.claimDirection, sourceUrl: item.sourceUrl || item.url || null };
          }),
        };
      }),
    };
  });
  return { harnessArtifacts: manifest?.artifacts || {}, reports };
}

function main() {
  const argv = process.argv.slice(2);
  const arms = parseArms(argv);
  const manifest = loadManifest(argv);
  const historicalAllowances = loadAcceptedHistoricalAllowances();
  const benchmark = JSON.parse(fs.readFileSync(path.join(ROOT, 'Docs', 'AGENTS', 'benchmark-expectations.json'), 'utf8'));
  const output = [];
  const flags = [];
  const print = (line = '') => output.push(line);
  const allJobs = [];
  print('# Live A/B pilot report (read-only)');
  print(`Generated ${new Date().toISOString()} · SR bounded-unknown rate $${SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD.toFixed(5)} per explicit lost-evaluation marker`);
  if (manifest?.artifacts) {
    print('\n## Pinned harness artifacts');
    for (const [file, hash] of Object.entries(manifest.artifacts).sort(([a], [b]) => a.localeCompare(b))) print(`- ${file}: ${hash}`);
  }
  for (const arm of arms) {
    const jobs = arm.ids.map((id) => loadJob(id, benchmark, manifest, arm.name, historicalAllowances));
    allJobs.push(...jobs.filter((job) => !job.missing));
    print(`\n## Arm ${arm.name}`);
    print('| job | input | status | approved/start/end commit | verdict | truth/conf | pre(recorded/rounded)->final conf | band | claims/bnd/ev | known+bounded=upper $ | searches cached/total | SR d/p/c/e/n/err | hard |');
    print('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const job of jobs) {
      if (job.missing) { print(`| ${short(job.id, 8)} | missing | | | | | | | | | | | |`); flags.push(`${arm.name}: missing job ${job.id}`); continue; }
      print(`| ${short(job.id, 8)} | ${job.inputId} | ${job.status} | ${short(job.approvedCommit, 8)}/${short(job.startCommit, 8)}/${short(job.completionCommit, 8)} | ${job.verdict || '-'} | ${fmt(job.truth, 1)}/${fmt(job.confidence)} | ${fmt(job.preNarrativeConfidence)}->${fmt(job.confidence)} | ${job.band || '-'} | ${job.claims}/${job.boundaries}/${job.evidence} | ${fmt(job.cost.knownSubtotalUSD, 3)}+${fmt(job.cost.boundedUnknownUSD, 3)}=${fmt(job.cost.conservativeUpperUSD, 3)} | ${job.searches.cached}/${job.searches.total} | ${job.sr.domains ?? '-'}/${job.sr.alreadyPrefetched ?? '-'}/${job.sr.cacheHits ?? '-'}/${job.sr.evaluated ?? '-'}/${job.sr.noConsensus ?? '-'}/${job.sr.errors ?? '-'} | ${job.hard.join(',') || '-'} |`);
      if (job.approvedCommit && (job.startCommit !== job.approvedCommit || job.completionCommit !== job.approvedCommit)) flags.push(`${arm.name}/${short(job.id, 8)}: commit provenance mismatch`);
      if (job.configFlags.length) flags.push(`${arm.name}/${short(job.id, 8)}: config ${job.configFlags.join(', ')}`);
      if (job.failedCalls) flags.push(`${arm.name}/${short(job.id, 8)}: ${job.failedCalls} failed recorded LLM call(s)`);
      if (job.hard.length) flags.push(`${arm.name}/${short(job.id, 8)}: hard outcome ${job.hard.join(',')}; retain as assigned-arm outcome`);
      if (!finite(job.cost.conservativeUpperUSD)) flags.push(`${arm.name}/${short(job.id, 8)}: cost upper unresolved (${job.cost.unresolvedUnpricedCalls ?? 'unknown'} unpriced call(s)); do not submit another pilot job`);
      print(`\n- ${short(job.id, 8)} config hashes: ${EXPECTED_CONFIG_KEYS.map((key) => `${key}=${(job.configHashes[key] || []).map((hash) => short(hash, 12)).join('+') || 'missing'}`).join('; ')}`);
      print(`- ${short(job.id, 8)} SR error types: ${JSON.stringify(job.sr.errorByType)}; lost-evaluation markers=${job.sr.lostEvaluationMarkers}; unresolved physical calls=${job.sr.unresolvedPhysicalCalls}`);
      if (job.cost.historicalAllowanceUSD) print(`- ${short(job.id, 8)} accepted historical allowance: $${fmt(job.cost.historicalAllowanceUSD, 3)} — ${job.cost.historicalAllowanceProvenance}`);
      print(`- ${short(job.id, 8)} timeout evidence: confirmed=${JSON.stringify(job.timeouts.confirmed)}; duration>=300s proxies=${JSON.stringify(job.timeouts.proxies)}`);
      print(`- ${short(job.id, 8)} structured retry/fallback fields (not additive): ${JSON.stringify(job.fallbacks)}`);
    }
    if (arm.lost) flags.push(`${arm.name}: ${arm.lost} runner record(s) lacked jobId`);
    const armCost = armCostSummary(jobs, arm.lost);
    print(armCost.resolved
      ? `\nArm conservative operational total: $${fmt(armCost.knownPartialUSD, 3)} across ${armCost.attempts}/${armCost.attempts} recorded attempt(s).`
      : `\nArm conservative operational total: UNRESOLVED (known partial $${fmt(armCost.knownPartialUSD, 3)}; ${armCost.finiteAttempts}/${armCost.attempts} recorded attempt(s) have a finite upper bound).`);
  }
  print('\n## Flags');
  if (!flags.length) print('- none');
  for (const flag of [...new Set(flags)]) print(`- ${flag}`);
  print('\nConfirmed timeout counts require a recorded Headers Timeout marker. >=300 s is only a duration proxy. Bounded-unknown cost applies only to explicit lost-evaluation markers or the source-reconciled historical allowance; other unpriced calls or missing/mismatched cost metadata leave the upper bound unresolved. The allowance is operational, not an invoice bound. Fallback fields count roles, not physical attempts, and are not exhaustive because some recovery paths lack persistent markers; exact SDK retry accounting and the separately identified two unrecorded Haiku calls remain deferred. baseline_fallback can mean adjudication was disabled or not attempted. Narrative prose and claim-count/anchor checks are excluded from pilot quality scoring.');
  const text = `${output.join('\n')}\n`;
  process.stdout.write(text);
  const mdIndex = argv.indexOf('--md');
  if (mdIndex >= 0) fs.writeFileSync(argv[mdIndex + 1], text, 'utf8');
  const blindIndex = argv.indexOf('--blind-json');
  if (blindIndex >= 0) fs.writeFileSync(argv[blindIndex + 1], `${JSON.stringify(blindPacket(allJobs, manifest), null, 2)}\n`, 'utf8');
}

module.exports = {
  SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD,
  configHashes,
  reconstructPreNarrativeConfidence,
  sourceReliabilitySummary,
  timeoutSummary,
  fallbackSummary,
  costSummary,
  loadAcceptedHistoricalAllowances,
  armCostSummary,
  blindPacket,
};

if (require.main === module) {
  try { main(); } catch (error) { console.error(`live-ab-arm-report: ${error.message}`); process.exit(1); }
}
