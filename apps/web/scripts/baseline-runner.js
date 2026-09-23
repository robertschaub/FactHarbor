/**
 * Baseline Test Runner
 * Execute via: npm run test:baseline
 */

const { BASELINE_TEST_CASES } = require('../src/lib/analyzer/test-cases');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../../baseline-results-' + new Date().toISOString().split('T')[0] + '.json');
const API_URL = process.env.FH_API_URL || 'http://localhost:3000';

async function runBaseline() {
  console.log('========================================');
  console.log('FactHarbor Baseline Test Execution');
  console.log('========================================\n');

  // Check services
  console.log('Checking services...');
  try {
    const healthCheck = await fetch(`${API_URL}/api/health`);
    if (!healthCheck.ok) throw new Error('Health check failed');
    console.log('✓ Services running\n');
  } catch (error) {
    console.error('✗ Services not running. Please start:');
    console.error('  - npm run dev (in apps/web)');
    console.error('  - dotnet run (in apps/api)');
    process.exit(1);
  }

  // Confirm execution
  console.log(`WARNING: This will make ${BASELINE_TEST_CASES.length} real LLM API calls`);
  console.log('Estimated cost: $20-50\n');
  
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < BASELINE_TEST_CASES.length; i++) {
    const testCase = BASELINE_TEST_CASES[i];
    console.log(`[${i + 1}/${BASELINE_TEST_CASES.length}] ${testCase.id} (${testCase.category})`);

    try {
      // Submit analysis
      const response = await fetch(`${API_URL}/api/fh/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: testCase.inputType,
          inputValue: testCase.input,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const { jobId } = await response.json();

      // Wait for completion
      let job = await waitForJob(jobId);

      if (job.status !== 'SUCCEEDED') {
        throw new Error(`Job failed: ${job.status}`);
      }

      const result = JSON.parse(job.resultJson);

      // Fetch metrics if available
      let metrics = null;
      try {
        const metricsRes = await fetch(`${API_URL}/api/fh/metrics/${jobId}`);
        if (metricsRes.ok) {
          metrics = await metricsRes.json();
        }
      } catch (e) {
        // Metrics not available
      }

      results.push({
        testCase: {
          id: testCase.id,
          category: testCase.category,
          difficulty: testCase.difficulty,
          input: testCase.input,
          expectedVerdict: testCase.expectedVerdict,
        },
        jobId,
        result: {
          verdict: result.articleVerdict,
          truthPercentage: result.articleTruthPercentage,
          confidence: result.articleVerdictConfidence,
          claimsCount: result.claims?.length || 0,
          scopesCount: result.analysisContexts?.length || 0,
        },
        metrics,
        success: true,
      });

      console.log(`  ✓ ${result.articleVerdict} (${result.articleTruthPercentage}%)\n`);

    } catch (error) {
      console.error(`  ✗ ${error.message}\n`);
      results.push({
        testCase: { id: testCase.id, category: testCase.category },
        error: error.message,
        success: false,
      });
    }
  }

  const duration = Date.now() - startTime;
  const completed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const summary = {
    timestamp: new Date().toISOString(),
    totalCases: BASELINE_TEST_CASES.length,
    completed,
    failed,
    durationMs: duration,
    results,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2));

  console.log('========================================');
  console.log('Baseline Test Complete');
  console.log('========================================');
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Output: ${OUTPUT_FILE}\n`);

  if (completed > 0) {
    console.log('Next steps:');
    console.log('1. Review results in output file');
    console.log('2. Analyze metrics and identify issues');
    console.log('3. Run A/B test to validate improvements');
  }
}

async function waitForJob(jobId, timeoutMs = 300000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${API_URL}/api/fh/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.statusText}`);
    }
    const job = await response.json();
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED') {
      return job;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Job timed out');
}

runBaseline().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
