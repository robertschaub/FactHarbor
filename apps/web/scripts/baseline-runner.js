/**
 * Baseline Test Runner
 * Execute via: npm run test:baseline
 */

const { submitAutomaticValidationJob } = require('./automatic-claim-selection');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../../baseline-results-' + new Date().toISOString().split('T')[0] + '.json');
const API_URL = process.env.FH_API_URL || 'http://localhost:3000';
const DEFAULT_CASES_FILE = path.join(__dirname, '../../../scripts/validation/captain-approved-families.json');
const CASES_FILE = process.env.FH_BASELINE_INPUTS_FILE || DEFAULT_CASES_FILE;

function loadValidationCases() {
  const rawCases = JSON.parse(fs.readFileSync(CASES_FILE, 'utf-8'));
  return rawCases.map((testCase) => ({
    id: testCase.id || testCase.familyName,
    category: testCase.category || 'captain-approved',
    difficulty: testCase.difficulty || null,
    inputType: testCase.inputType,
    input: testCase.input || testCase.inputValue,
    expectedVerdict: testCase.expectedVerdict || null,
    historicalDirectReference: testCase.historicalDirectReference || null,
  }));
}

async function runBaseline() {
  const validationCases = loadValidationCases();

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
  console.log(`WARNING: This will make ${validationCases.length} real LLM API calls`);
  console.log('Estimated cost: $20-50\n');
  
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < validationCases.length; i++) {
    const testCase = validationCases[i];
    console.log(`[${i + 1}/${validationCases.length}] ${testCase.id} (${testCase.category})`);

    try {
      // Submit analysis through ACS automatic mode so non-interactive runs use
      // the configured recommended AtomicClaim subset instead of the legacy all-claims path.
      const validation = await submitAutomaticValidationJob({
        apiUrl: API_URL,
        inputType: testCase.inputType,
        inputValue: testCase.input,
        waitForFinalJob: true,
        family: {
          familyName: testCase.id,
          inputType: testCase.inputType,
          inputValue: testCase.input,
          historicalDirectReference: testCase.historicalDirectReference,
        },
      });
      const { draftId, jobId, summary } = validation;

      if (!validation.ok || !summary) {
        throw new Error(`Job failed: ${validation.status}`);
      }

      results.push({
        testCase: {
          id: testCase.id,
          category: testCase.category,
          difficulty: testCase.difficulty,
          input: testCase.input,
          expectedVerdict: testCase.expectedVerdict,
        },
        draftId,
        jobId,
        result: {
          verdict: summary.verdict,
          truthPercentage: summary.truthPercentage,
          confidence: summary.confidence,
          claimVerdictCount: summary.claimVerdictCount,
          claimBoundaryCount: summary.claimBoundaryCount,
          evidenceCount: summary.evidenceCount,
          sourceCount: summary.sourceCount,
          metadataUnavailable: summary.metadataUnavailable,
          preparedClaimCount: summary.preparedClaimCount,
          selectedClaimCount: summary.selectedClaimCount,
          historicalDirectReference: summary.historicalDirectReference,
          historicalDirectReferenceJobId: summary.historicalDirectReferenceJobId,
          historicalDirectReferenceQuality: summary.historicalDirectReferenceQuality,
          historicalDirectReferenceJobStatus: summary.historicalDirectReferenceJobStatus,
        },
        success: true,
      });

      console.log(`  ok ${summary.verdict} (${summary.truthPercentage}%) selected=${summary.selectedClaimCount}/${summary.preparedClaimCount}\n`);

    } catch (error) {
      console.error(`  ✗ ${error.message}\n`);
      results.push({
        testCase: { id: testCase.id, category: testCase.category },
        error: error.message,
        historicalDirectReference: testCase.historicalDirectReference,
        historicalDirectReferenceJobId: testCase.historicalDirectReference?.jobId || null,
        historicalDirectReferenceQuality:
          testCase.historicalDirectReference?.referenceQuality || 'missing',
        historicalDirectReferenceJobStatus:
          testCase.historicalDirectReference?.status || 'missing',
        success: false,
      });
    }
  }

  const duration = Date.now() - startTime;
  const completed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const summary = {
    timestamp: new Date().toISOString(),
    totalCases: validationCases.length,
    casesFile: CASES_FILE,
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

runBaseline().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
