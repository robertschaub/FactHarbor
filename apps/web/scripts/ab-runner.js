/**
 * A/B Test Runner
 * Execute via: npm run test:ab or npm run test:ab:quick
 */

const { runDefaultABTest, runFullABTest } = require('../src/lib/analyzer/ab-testing');
const fs = require('fs');
const path = require('path');

const isQuick = process.argv.includes('--quick');
const OUTPUT_FILE = path.join(
  __dirname,
  '../../ab-results-' + new Date().toISOString().split('T')[0] + '.json'
);

async function runABTest() {
  console.log('========================================');
  console.log('FactHarbor A/B Test Execution');
  console.log('========================================\n');

  const mode = isQuick ? 'Quick' : 'Full';
  const estimatedCost = isQuick ? '$10-20' : '$100-200';

  console.log(`Mode: ${mode}`);
  console.log(`Estimated cost: ${estimatedCost}`);
  console.log(`\nWARNING: This will make many real LLM API calls\n`);

  try {
    let summary;
    if (isQuick) {
      console.log('Running quick A/B test (10 cases, 1 provider, 2 runs)...\n');
      summary = await runDefaultABTest();
    } else {
      console.log('Running full A/B test (30 cases, 3 providers, 3 runs)...\n');
      summary = await runFullABTest();
    }

    // Save results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2));

    console.log('\n========================================');
    console.log('A/B Test Complete');
    console.log('========================================');
    console.log(`Total tests: ${summary.totalTests}`);
    console.log(`Total runs: ${summary.totalRuns}`);
    console.log(`Completed: ${summary.completedRuns}`);
    console.log(`Failed: ${summary.failedRuns}`);
    console.log(`\nOverall Results:`);
    console.log(`  Token reduction: ${summary.overallStats.avgTokenReduction.toFixed(1)}%`);
    console.log(`  Speed improvement: ${summary.overallStats.avgSpeedImprovement.toFixed(1)}%`);
    console.log(`  Cost reduction: ${summary.overallStats.avgCostReduction.toFixed(1)}%`);
    console.log(`  Schema improvement rate: ${summary.overallStats.schemaImprovementRate.toFixed(1)}%`);
    console.log(`  Verdict accuracy maintained: ${summary.overallStats.verdictAccuracyMaintained ? '✓ YES' : '✗ NO'}`);
    console.log(`\nOutput: ${OUTPUT_FILE}\n`);

    // Recommendation
    const recommendation = summary.overallStats.avgTokenReduction >= 30 &&
                          summary.overallStats.verdictAccuracyMaintained;
    
    if (recommendation) {
      console.log('✓ RECOMMENDATION: APPROVE optimized prompts');
      console.log('  - Significant token reduction achieved');
      console.log('  - Quality maintained or improved');
    } else {
      console.log('⚠ RECOMMENDATION: REVIEW before approval');
      console.log('  - Token reduction may be insufficient');
      console.log('  - Or quality impact needs investigation');
    }

  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  }
}

runABTest();
