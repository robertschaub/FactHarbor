/**
 * 25-Run Validation Matrix Runner
 * 5 claims x 5 runs = 25 total orchestrated pipeline runs
 *
 * Usage: node scripts/run-validation-matrix.js [session_label] [claims_file]
 * Claims default to scripts/validation-claims.json
 * Output: artifacts/session<label>_orchestrated_matrix.jsonl
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.FH_API_URL || 'http://localhost:3000';
const SESSION_LABEL = process.argv[2] || 'current';
const CLAIMS_FILE = process.argv[3] || path.join(__dirname, 'validation-claims.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'artifacts', `session${SESSION_LABEL}_orchestrated_matrix.jsonl`);

if (!fs.existsSync(CLAIMS_FILE)) {
  console.error(`Claims file not found: ${CLAIMS_FILE}`);
  console.error('Usage: node scripts/run-validation-matrix.js [session_label] [claims_file]');
  process.exit(1);
}
const CLAIMS = JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf-8'));

const RUNS_PER_CLAIM = 5;

async function waitForJob(jobId, timeoutMs = 600000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${API_URL}/api/fh/jobs/${jobId}`);
    if (!response.ok) throw new Error(`Failed to fetch job: ${response.statusText}`);
    const job = await response.json();
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED') return job;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  throw new Error('Job timed out after ' + (timeoutMs / 1000) + 's');
}

function extractMetrics(result) {
  // Result structure: result.verdictSummary.{answer, confidence, truthPercentage}
  const vs = result.verdictSummary || {};
  const sources = result.sources || [];
  return {
    answer: vs.truthPercentage ?? vs.answer,
    confidence: vs.confidence,
    contexts: (result.analysisContexts || []).length,
    sources: sources.length,
    fetchedSources: sources.filter(s => s.fetchSuccess).length,
    domains: [...new Set(sources.filter(s => s.fetchSuccess).map(s => {
      try { return new URL(s.url).hostname; } catch { return s.url; }
    }))],
    verdict: vs.displayText,
    analysisWarnings: result.analysisWarnings || [],
  };
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
    console.log(`Expected contexts: ${claim.expectedContexts}\n`);

    for (let run = 1; run <= RUNS_PER_CLAIM; run++) {
      totalRuns++;
      const runLabel = `[${totalRuns}/${CLAIMS.length * RUNS_PER_CLAIM}] ${claim.id} run ${run}`;
      process.stdout.write(`${runLabel}: submitting... `);

      try {
        const response = await fetch(`${API_URL}/api/fh/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputType: 'text', inputValue: claim.text }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { jobId } = await response.json();
        process.stdout.write(`job=${jobId.slice(0,8)}... `);

        const job = await waitForJob(jobId);
        if (job.status !== 'SUCCEEDED') {
          failures++;
          const row = {
            ts: new Date().toISOString(),
            claim_id: claim.id,
            claim: claim.text,
            pipeline: 'orchestrated',
            run,
            job_id: jobId,
            status: job.status,
            error: 'Job failed',
          };
          fs.appendFileSync(OUTPUT_FILE, JSON.stringify(row) + '\n');
          allResults.push(row);
          console.log(`FAILED (${job.status})`);
          continue;
        }

        const result = typeof job.resultJson === 'string' ? JSON.parse(job.resultJson) : job.resultJson;
        const metrics = extractMetrics(result);

        const searchProviderErrors = metrics.analysisWarnings.filter(
          w => w.type === 'search_provider_error'
        ).length;

        if (searchProviderErrors > 0) searchErrors++;

        const row = {
          ts: new Date().toISOString(),
          claim_id: claim.id,
          claim: claim.text,
          pipeline: 'orchestrated',
          run,
          job_id: jobId,
          status: 'SUCCEEDED',
          answer: metrics.answer,
          confidence: metrics.confidence,
          contexts: metrics.contexts,
          sources: metrics.sources,
          fetchedSources: metrics.fetchedSources,
          domains: metrics.domains,
          search_provider_error_count: searchProviderErrors,
          has_search_provider_error: searchProviderErrors > 0,
          system_paused_after_run: false,
          analysis_warnings_count: metrics.analysisWarnings.length,
        };

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(row) + '\n');
        allResults.push(row);

        console.log(`score=${metrics.answer} conf=${metrics.confidence} ctx=${metrics.contexts} src=${metrics.sources}${searchProviderErrors > 0 ? ' ⚠SEARCH_ERR' : ''}`);

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
  console.log('| Claim | Score Var | Target | Pass | Conf Delta | Target | Pass | Context Hit | Pass |');
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
    const ctxCounts = runs.map(r => r.contexts);

    const scoreVar = Math.max(...scores) - Math.min(...scores);
    const confDelta = Math.max(...confs) - Math.min(...confs);
    const contextHitRate = Math.round(
      (ctxCounts.filter(c => c >= claim.expectedContexts).length / runs.length) * 100
    );

    const scorePass = scoreVar <= claim.varianceTarget;
    const confPass = confDelta <= claim.confidenceTarget;
    const ctxPass = contextHitRate >= 80;

    const allPass = scorePass && confPass && ctxPass;
    if (allPass) claimsPassing++;

    const shortId = claim.id.replace('claim_', '').replace(/_/g, ' ');
    console.log(
      `| ${shortId} | ${scoreVar} | <=${claim.varianceTarget} | ${scorePass ? '✅' : '❌'} | ${confDelta} | <=15 | ${confPass ? '✅' : '❌'} | ${contextHitRate}% (exp ${claim.expectedContexts}) | ${ctxPass ? '✅' : '❌'} |`
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
      const ctxCounts = runs.map(r => r.contexts);
      return {
        claim_id: claim.id,
        runs: runs.length,
        scores,
        scoreVariance: scores.length ? Math.max(...scores) - Math.min(...scores) : null,
        confidences: confs,
        confidenceDelta: confs.length ? Math.max(...confs) - Math.min(...confs) : null,
        contexts: ctxCounts,
        contextHitRate: ctxCounts.length
          ? Math.round((ctxCounts.filter(c => c >= claim.expectedContexts).length / runs.length) * 100)
          : null,
        expectedContexts: claim.expectedContexts,
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
