/**
 * 25-Run Validation Matrix Runner
 * 5 claims x 5 runs = 25 total orchestrated pipeline runs
 *
 * Usage: node scripts/run-validation-matrix.js <session_label> <claims_file>
 * The claims file must be an explicitly reviewed Captain-approved fixture.
 * Output: artifacts/session<label>_orchestrated_matrix.jsonl
 */

const fs = require('fs');
const path = require('path');
const { submitAutomaticValidationJob } = require('../apps/web/scripts/automatic-claim-selection');

const API_URL = process.env.FH_API_URL || 'http://localhost:3000';
const SESSION_LABEL = process.argv[2] || 'current';
const CLAIMS_FILE = process.argv[3];
const OUTPUT_FILE = path.join(__dirname, '..', 'artifacts', `session${SESSION_LABEL}_orchestrated_matrix.jsonl`);

if (!CLAIMS_FILE) {
  console.error('Claims file is required. Use an explicitly reviewed Captain-approved fixture.');
  console.error('Usage: node scripts/run-validation-matrix.js <session_label> <claims_file>');
  process.exit(1);
}

if (!fs.existsSync(CLAIMS_FILE)) {
  console.error(`Claims file not found: ${CLAIMS_FILE}`);
  console.error('Usage: node scripts/run-validation-matrix.js <session_label> <claims_file>');
  process.exit(1);
}
const RAW_CLAIMS = JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf-8'));

const RUNS_PER_CLAIM = 5;

function normalizeClaimFixture(rawClaim, index) {
  const id = rawClaim.id || rawClaim.familyName;
  const text = rawClaim.text || rawClaim.inputValue || rawClaim.input;
  const inputType = rawClaim.inputType || 'text';
  const expectedClaimBoundaries = rawClaim.expectedClaimBoundaries ?? rawClaim.expectedContexts ?? null;

  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`Claim fixture row ${index + 1} is missing id/familyName`);
  }
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`Claim fixture row ${index + 1} (${id}) is missing text/inputValue`);
  }
  if (typeof inputType !== 'string' || inputType.length === 0) {
    throw new Error(`Claim fixture row ${index + 1} (${id}) is missing inputType`);
  }

  return {
    ...rawClaim,
    id,
    text,
    inputType,
    expectedClaimBoundaries,
    varianceTarget: typeof rawClaim.varianceTarget === 'number' ? rawClaim.varianceTarget : null,
    confidenceTarget: typeof rawClaim.confidenceTarget === 'number' ? rawClaim.confidenceTarget : null,
  };
}

const CLAIMS = RAW_CLAIMS.map(normalizeClaimFixture);

function formatTarget(value, prefix = '') {
  return typeof value === 'number' ? `${prefix}${value}` : 'n/a';
}

function formatPass(value) {
  if (value === null) return 'n/a';
  return value ? 'yes' : 'no';
}

async function runMatrix() {
  console.log('============================================================');
  console.log(`Validation Matrix — Session ${SESSION_LABEL}`);
  console.log(`${CLAIMS.length} claims x ${RUNS_PER_CLAIM} runs = ${CLAIMS.length * RUNS_PER_CLAIM} total`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('============================================================\n');

  // Check services
  try {
    const health = await fetch(`${API_URL}/api/health`);
    if (!health.ok) throw new Error('unhealthy');
    console.log('✓ Services healthy\n');
  } catch (e) {
    console.error('✗ Services not running. Start web + api first.');
    process.exit(1);
  }

  // Ensure artifacts dir
  const artifactsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  // Clear output file
  fs.writeFileSync(OUTPUT_FILE, '');

  const allResults = [];
  const startTime = Date.now();
  let totalRuns = 0;
  let failures = 0;
  let searchErrors = 0;

  for (const claim of CLAIMS) {
    console.log(`\n--- ${claim.id} ---`);
    console.log(`"${claim.text}"`);
    console.log(`Expected claim boundaries: ${claim.expectedClaimBoundaries ?? 'n/a'}\n`);

    for (let run = 1; run <= RUNS_PER_CLAIM; run++) {
      totalRuns++;
      const runLabel = `[${totalRuns}/${CLAIMS.length * RUNS_PER_CLAIM}] ${claim.id} run ${run}`;
      process.stdout.write(`${runLabel}: submitting... `);

      try {
        const validation = await submitAutomaticValidationJob({
          apiUrl: API_URL,
          inputType: claim.inputType,
          inputValue: claim.text,
          waitForFinalJob: true,
          timeoutMs: 600000,
          pollIntervalMs: 3000,
          family: {
            familyName: claim.id,
            inputType: claim.inputType,
            inputValue: claim.text,
            historicalDirectReference: claim.historicalDirectReference || null,
          },
        });
        const { draftId, jobId, summary } = validation;

        if (!validation.ok || !summary) {
          const draftLabel = typeof draftId === 'string' ? draftId.slice(0,8) : 'none';
          const jobLabel = typeof jobId === 'string' ? jobId.slice(0,8) : 'none';
          process.stdout.write(`draft=${draftLabel} job=${jobLabel}... `);
          failures++;
          const row = {
            ts: new Date().toISOString(),
            claim_id: claim.id,
            claim: claim.text,
            pipeline: 'orchestrated',
            run,
            draft_id: draftId,
            job_id: jobId,
            status: validation.status,
            error: 'Job failed',
            metadataUnavailable: validation.metadataUnavailable,
            metadataUnavailableReason: validation.metadataUnavailableReason,
            resultUnavailable: validation.resultUnavailable,
            resultUnavailableReason: validation.resultUnavailableReason,
            historical_direct_reference_job_id: claim.historicalDirectReference?.jobId || null,
            historical_direct_reference_quality:
              claim.historicalDirectReference?.referenceQuality || 'missing',
            historical_direct_reference_job_status:
              claim.historicalDirectReference?.status || 'missing',
          };
          fs.appendFileSync(OUTPUT_FILE, JSON.stringify(row) + '\n');
          allResults.push(row);
          console.log(`FAILED (${validation.status})`);
          continue;
        }

        process.stdout.write(`draft=${draftId.slice(0,8)} job=${jobId.slice(0,8)}... `);

        const searchProviderErrors = summary.warnings.byType.search_provider_error || 0;

        if (searchProviderErrors > 0) searchErrors++;

        const row = {
          ts: new Date().toISOString(),
          claim_id: claim.id,
          claim: claim.text,
          pipeline: 'orchestrated',
          run,
          draft_id: draftId,
          job_id: jobId,
          status: 'SUCCEEDED',
          answer: summary.truthPercentage,
          confidence: summary.confidence,
          verdict: summary.verdict,
          claimBoundaries: summary.claimBoundaryCount,
          evidenceCount: summary.evidenceCount,
          sources: summary.sourceCount,
          metadataUnavailable: summary.metadataUnavailable,
          preparedClaimCount: summary.preparedClaimCount,
          selectedClaimCount: summary.selectedClaimCount,
          search_provider_error_count: searchProviderErrors,
          has_search_provider_error: searchProviderErrors > 0,
          system_paused_after_run: false,
          analysis_warnings_count: summary.warnings.total,
          historical_direct_reference_job_id: summary.historicalDirectReferenceJobId,
          historical_direct_reference_quality: summary.historicalDirectReferenceQuality,
          historical_direct_reference_job_status: summary.historicalDirectReferenceJobStatus,
        };

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(row) + '\n');
        allResults.push(row);

        console.log(`score=${summary.truthPercentage} conf=${summary.confidence} boundaries=${summary.claimBoundaryCount} selected=${summary.selectedClaimCount}/${summary.preparedClaimCount}${searchProviderErrors > 0 ? ' SEARCH_ERR' : ''}`);

        // Check for search errors — abort if found
        if (searchProviderErrors > 0) {
          console.error('\n⚠️ SEARCH PROVIDER ERROR DETECTED — results may be invalid!');
          console.error('Consider stopping and investigating before continuing.\n');
        }

      } catch (error) {
        failures++;
        const row = {
          ts: new Date().toISOString(),
          claim_id: claim.id,
          claim: claim.text,
          pipeline: 'orchestrated',
          run,
          status: 'ERROR',
          error: error.message,
          historical_direct_reference_job_id: claim.historicalDirectReference?.jobId || null,
          historical_direct_reference_quality:
            claim.historicalDirectReference?.referenceQuality || 'missing',
          historical_direct_reference_job_status:
            claim.historicalDirectReference?.status || 'missing',
        };
        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(row) + '\n');
        allResults.push(row);
        console.log(`ERROR: ${error.message}`);
      }
    }
  }

  // Compute summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n============================================================');
  console.log('VALIDATION MATRIX SUMMARY');
  console.log('============================================================\n');
  console.log(`Total runs: ${totalRuns}`);
  console.log(`Succeeded: ${totalRuns - failures}`);
  console.log(`Failed: ${failures}`);
  console.log(`Search errors: ${searchErrors}`);
  console.log(`Duration: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s\n`);

  // Per-claim analysis
  console.log('--- Per-Claim Gate Results ---\n');
  console.log('| Claim | Score Var | Target | Pass | Conf Delta | Target | Pass | Boundary Hit | Pass |');
  console.log('|-------|-----------|--------|------|------------|--------|------|-------------|------|');

  let claimsPassing = 0;

  for (const claim of CLAIMS) {
    const runs = allResults.filter(r => r.claim_id === claim.id && r.status === 'SUCCEEDED');
    if (runs.length === 0) {
      console.log(`| ${claim.id} | N/A | | ❌ | N/A | | ❌ | N/A | ❌ |`);
      continue;
    }

    const scores = runs.map(r => r.answer);
    const confs = runs.map(r => r.confidence);
    const boundaryCounts = runs.map(r => r.claimBoundaries);
    const expectedBoundaries = claim.expectedClaimBoundaries;

    const scoreVar = Math.max(...scores) - Math.min(...scores);
    const confDelta = Math.max(...confs) - Math.min(...confs);
    const boundaryHitRate = typeof expectedBoundaries === 'number'
      ? Math.round((boundaryCounts.filter(c => c >= expectedBoundaries).length / runs.length) * 100)
      : null;

    const scorePass = typeof claim.varianceTarget === 'number' ? scoreVar <= claim.varianceTarget : null;
    const confPass = typeof claim.confidenceTarget === 'number' ? confDelta <= claim.confidenceTarget : null;
    const boundaryPass = typeof boundaryHitRate === 'number' ? boundaryHitRate >= 80 : null;

    const allPass = scorePass && confPass && boundaryPass;
    if (allPass) claimsPassing++;

    const shortId = claim.id.replace('claim_', '').replace(/_/g, ' ');
    console.log(
      `| ${shortId} | ${scoreVar} | ${formatTarget(claim.varianceTarget, '<=')} | ${formatPass(scorePass)} | ${confDelta} | ${formatTarget(claim.confidenceTarget, '<=')} | ${formatPass(confPass)} | ${typeof boundaryHitRate === 'number' ? `${boundaryHitRate}% (exp ${expectedBoundaries})` : 'n/a'} | ${formatPass(boundaryPass)} |`
    );
  }

  console.log(`\n**Claims passing all 3 gates: ${claimsPassing}/${CLAIMS.length}**`);
  console.log(`**Pipeline failure rate: ${failures}/${totalRuns} (${Math.round(failures/totalRuns*100)}%)**`);

  if (searchErrors > 0) {
    console.log(`\n⚠️ WARNING: ${searchErrors} runs had search provider errors — results may be contaminated!`);
  }

  // Write overall summary
  const summaryFile = OUTPUT_FILE.replace('_matrix.jsonl', '_summary.json');
  const summary = {
    session: SESSION_LABEL,
    date: new Date().toISOString(),
    totalRuns,
    succeeded: totalRuns - failures,
    failed: failures,
    searchErrors,
    durationSeconds: elapsed,
    claimsPassing,
    claimsTotal: CLAIMS.length,
    perClaim: CLAIMS.map(claim => {
      const runs = allResults.filter(r => r.claim_id === claim.id && r.status === 'SUCCEEDED');
      const scores = runs.map(r => r.answer);
      const confs = runs.map(r => r.confidence);
      const boundaryCounts = runs.map(r => r.claimBoundaries);
      const expectedBoundaries = claim.expectedClaimBoundaries;
      return {
        claim_id: claim.id,
        runs: runs.length,
        scores,
        scoreVariance: scores.length ? Math.max(...scores) - Math.min(...scores) : null,
        confidences: confs,
        confidenceDelta: confs.length ? Math.max(...confs) - Math.min(...confs) : null,
        claimBoundaries: boundaryCounts,
        boundaryHitRate: boundaryCounts.length && typeof expectedBoundaries === 'number'
          ? Math.round((boundaryCounts.filter(c => c >= expectedBoundaries).length / runs.length) * 100)
          : null,
        expectedClaimBoundaries: expectedBoundaries,
        varianceTarget: claim.varianceTarget,
        confidenceTarget: claim.confidenceTarget,
      };
    }),
  };
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\nSummary written to: ${summaryFile}`);
  console.log(`Matrix data: ${OUTPUT_FILE}`);
}

runMatrix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
