import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const report = createRequire(import.meta.url)(join(here, 'live-ab-arm-report.cjs'));

test('config hashes retain one unique hash per type and expose mixed types', () => {
  assert.deepEqual(report.configHashes([
    { config_type: 'pipeline', profile_key: 'default', content_hash: 'a' },
    { config_type: 'pipeline', profile_key: 'default', content_hash: 'a' },
    { config_type: 'search', profile_key: 'default', content_hash: 'b' },
    { config_type: 'search', profile_key: 'default', content_hash: 'c' },
  ]), {
    'pipeline/default': ['a'],
    'search/default': ['b', 'c'],
  });
});

test('pre-narrative confidence reconstructs baseline and guarded adjudication paths', () => {
  assert.equal(report.reconstructPreNarrativeConfidence({
    adjudicationPath: { path: 'baseline_same_direction', baselineAggregate: { confidence: 65 } },
  }), 65);
  assert.equal(report.reconstructPreNarrativeConfidence({
    adjudicationPath: {
      path: 'llm_adjudicated',
      llmAdjudication: { rawConfidence: 90 },
      guardsApplied: { confidenceCeiled: true, integrityDowngraded: true },
    },
    claimVerdicts: [{ confidence: 70 }, { confidence: 55 }],
  }), 24);
});

test('only explicit lost-evaluation markers receive the accepted SR allowance', () => {
  const warnings = [{
    type: 'source_reliability_error',
    details: { errorByType: { timeout: 1, network: 0 } },
  }];
  const metrics = {
    estimatedCostUSD: null,
    costEstimate: { knownSubtotalUSD: 2.25, unpricedCalls: 1 },
    sourceReliabilityPrefetch: { domains: 4, evaluated: 3, errors: 1 },
    llmCalls: [
      { taskType: 'source_reliability', provider: 'unknown', modelName: 'unknown', durationMs: 0, usageAvailable: false, failureKind: 'transport' },
      { taskType: 'source_reliability', usageAvailable: true },
    ],
  };
  const sr = report.sourceReliabilitySummary(metrics, warnings);
  const cost = report.costSummary(metrics, sr);
  assert.equal(sr.lostEvaluationMarkers, 1);
  assert.equal(sr.unresolvedPhysicalCalls, 0);
  assert.equal(sr.errorByType.timeout, 1);
  assert.equal(cost.exactUSD, null);
  assert.equal(cost.knownSubtotalUSD, 2.25);
  assert.equal(cost.boundedUnknownUSD, report.SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD);
  assert.equal(cost.conservativeUpperUSD, 2.25 + report.SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD);
});

test('physical or unrelated unpriced calls leave the conservative cost upper unresolved', () => {
  const physicalMetrics = {
    estimatedCostUSD: null,
    costEstimate: { knownSubtotalUSD: 2, unpricedCalls: 2 },
    llmCalls: [
      { taskType: 'source_reliability', provider: 'unknown', modelName: 'unknown', durationMs: 0, usageAvailable: false, failureKind: 'transport' },
      { taskType: 'source_reliability', provider: 'anthropic', modelName: 'claude-haiku-4-5', durationMs: 90000, usageAvailable: false, failureKind: 'transport' },
    ],
  };
  const sr = report.sourceReliabilitySummary(physicalMetrics, []);
  const cost = report.costSummary(physicalMetrics, sr);
  assert.equal(sr.lostEvaluationMarkers, 1);
  assert.equal(sr.unresolvedPhysicalCalls, 1);
  assert.equal(cost.boundedUnknownUSD, report.SR_BOUND_PER_UNACCOUNTED_EVALUATION_USD);
  assert.equal(cost.unresolvedUnpricedCalls, 1);
  assert.equal(cost.conservativeUpperUSD, null);

  const unrelated = report.costSummary(
    { estimatedCostUSD: null, costEstimate: { knownSubtotalUSD: 2, unpricedCalls: 1 }, llmCalls: [] },
    report.sourceReliabilitySummary({ llmCalls: [] }, []),
  );
  assert.equal(unrelated.boundedUnknownUSD, 0);
  assert.equal(unrelated.unresolvedUnpricedCalls, 1);
  assert.equal(unrelated.conservativeUpperUSD, null);
});

test('the accepted historical allowance is explicit and never inferred for a new job', () => {
  const metrics = { estimatedCostUSD: 1.640532, costEstimate: { knownSubtotalUSD: 1.640532, unpricedCalls: 0 }, llmCalls: [] };
  const sr = report.sourceReliabilitySummary(metrics, []);
  const allowance = report.loadAcceptedHistoricalAllowances().d3de379ceb4c4cb3a4846bf68be5e436;
  assert.equal(allowance.usd, 7.83);
  assert.match(allowance.provenance, /exact-job allowance does not apply to new jobs/);
  const historical = report.costSummary(metrics, sr, allowance);
  assert.equal(historical.conservativeUpperUSD, 9.470532);
  assert.equal(historical.historicalAllowanceProvenance, allowance.provenance);
  const newJob = report.costSummary(metrics, sr);
  assert.equal(newJob.conservativeUpperUSD, 1.640532);

  const missingMetadata = report.costSummary({ estimatedCostUSD: null, llmCalls: [] }, sr);
  assert.equal(missingMetadata.conservativeUpperUSD, null);
});

test('arm cost stays unresolved when any requested job or runner record is missing', () => {
  const finiteJob = { cost: { conservativeUpperUSD: 2.5 } };
  assert.deepEqual(report.armCostSummary([finiteJob], 0), {
    resolved: true, knownPartialUSD: 2.5, finiteAttempts: 1, attempts: 1,
  });
  assert.deepEqual(report.armCostSummary([finiteJob, { missing: true }], 0), {
    resolved: false, knownPartialUSD: 2.5, finiteAttempts: 1, attempts: 2,
  });
  assert.deepEqual(report.armCostSummary([finiteJob], 1), {
    resolved: false, knownPartialUSD: 2.5, finiteAttempts: 1, attempts: 2,
  });
});

test('confirmed header timeouts and 300-second proxies are not conflated', () => {
  const summary = report.timeoutSummary([
    { taskType: 'cluster', durationMs: 300001, errorMessage: '' },
    { taskType: 'verdict', debateRole: 'advocate', durationMs: 2000, errorMessage: 'UND_ERR_HEADERS_TIMEOUT' },
    { taskType: 'understand', durationMs: 1000, errorMessage: 'Headers Timeout Error' },
    { taskType: 'other', durationMs: 300500, errorMessage: '' },
    { taskType: 'aggregate', durationMs: 1000, errorMessage: '' },
  ]);
  assert.deepEqual(summary.confirmed, { 'stage-4': 1, 'stage-1-or-2': 1 });
  assert.deepEqual(summary.proxies, { clustering: 1, 'stage-1-or-calibration': 1 });
});

test('fallback categories use persisted runtime-role and boundary-warning shapes', () => {
  assert.deepEqual(report.fallbackSummary({
    pipelineTelemetry: {
      contractValidation: { retryCount: 1, repairPassCount: 0 },
      challengerModelGuard: { precheckFallbackCount: 0, retryFallbackCount: 1 },
    },
  }, {
    meta: {
      modelsUsed: { verdict: 'claude-sonnet-5' },
      runtimeRoleModels: {
        advocate: { model: 'claude-sonnet-5', callCount: 2, fallbackUsed: true },
        challenger: { model: 'claude-sonnet-5', callCount: 1, fallbackUsed: false },
      },
    },
    adjudicationPath: { path: 'baseline_fallback' },
  }, [{ type: 'boundary_clustering_failed' }]), {
    contractRetries: 1,
    contractRepairs: 0,
    challengerPrecheck: 0,
    challengerRetry: 1,
    rolesWithFallback: 1,
    boundaryClusteringFallback: true,
    articleAdjudicationPath: 'baseline_fallback',
    persistentMarkerCoverage: 'not_exhaustive',
  });
});

test('blind packet includes pinned artifact hashes and excludes narrative and model provenance', () => {

  const packet = report.blindPacket([{
    id: 'job-secret', input: 'Entity A did X', verdict: 'MIXED', truth: 50, confidence: 60,
    result: {
      meta: { modelsUsed: ['secret-model'] },
      verdictNarrative: { headline: 'excluded' },
      understanding: { atomicClaims: [{ id: 'AC_01', statement: 'Entity A did X' }] },
      claimVerdicts: [{ claimId: 'AC_01', verdict: 'MIXED', truthPercentage: 50, confidence: 60, reasoning: 'Evidence differs.', supportingEvidenceIds: ['EV_1'], contradictingEvidenceIds: [] }],
      evidenceItems: [{ id: 'EV_1', statement: 'Record one', claimDirection: 'supports', sourceUrl: 'https://example.org' }],
    },
  }], { artifacts: { 'runner.cjs': 'abc123' } });
  assert.deepEqual(packet.harnessArtifacts, { 'runner.cjs': 'abc123' });
  assert.equal(packet.reports[0].claims[0].statement, 'Entity A did X');
  assert.doesNotMatch(JSON.stringify(packet), /secret-model|excluded|job-secret/);

  const second = { ...packetFixture('job-other'), input: 'Entity B did Y' };
  const first = packetFixture('job-first');
  assert.deepEqual(
    report.blindPacket([first, second]).reports,
    report.blindPacket([second, first]).reports,
    'blinded order must not reveal the caller-provided arm order',
  );
});

function packetFixture(id) {
  return {
    id,
    input: 'Entity A did X',
    verdict: 'MIXED',
    truth: 50,
    confidence: 60,
    result: { understanding: { atomicClaims: [] }, claimVerdicts: [], evidenceItems: [] },
  };
}
