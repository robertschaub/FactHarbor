/**
 * Manual test for budget tracking (PR 6)
 *
 * Run with: npx tsx test-budget.ts
 */

import { runFactHarborAnalysis } from './src/lib/analyzer';

async function testNormalBudget() {
  console.log('\n=== Test 1: Normal Budget ===');
  console.log('Running analysis with default budget limits...\n');

  const result = await runFactHarborAnalysis({
    inputValue: "The merger between Company A and Company B faces regulatory scrutiny from the FTC and European Commission.",
    inputType: "claim"
  });

  const stats = result.resultJson.meta.budgetStats;

  console.log('\n📊 Budget Stats:');
  console.log('  Tokens used:', stats.tokensUsed, `(${stats.tokensPercent}%)`);
  console.log('  Iterations:', stats.totalIterations, `(${stats.iterationsPercent}%)`);
  console.log('  LLM calls:', stats.llmCalls);
  console.log('  Budget exceeded:', stats.budgetExceeded);
  if (stats.exceedReason) {
    console.log('  Reason:', stats.exceedReason);
  }

  console.log('\n✅ Test 1 complete\n');
  return stats;
}

async function testLowBudget() {
  console.log('\n=== Test 2: Low Budget (Force Early Termination) ===');
  console.log('Setting very low iteration limit...\n');

  // Temporarily set low budget
  const originalMax = process.env.FH_MAX_TOTAL_ITERATIONS;
  process.env.FH_MAX_TOTAL_ITERATIONS = '2';

  try {
    const result = await runFactHarborAnalysis({
      inputValue: "The merger between Company A and Company B faces regulatory scrutiny from multiple agencies including the FTC, European Commission, and UK Competition Authority.",
      inputType: "claim"
    });

    const stats = result.resultJson.meta.budgetStats;

    console.log('\n📊 Budget Stats:');
    console.log('  Tokens used:', stats.tokensUsed, `(${stats.tokensPercent}%)`);
    console.log('  Iterations:', stats.totalIterations, `(${stats.iterationsPercent}%)`);
    console.log('  LLM calls:', stats.llmCalls);
    console.log('  Budget exceeded:', stats.budgetExceeded);
    if (stats.exceedReason) {
      console.log('  Reason:', stats.exceedReason);
    }

    if (stats.budgetExceeded && stats.totalIterations <= 2) {
      console.log('\n✅ Test 2 complete - Budget limit enforced correctly!');
    } else {
      console.log('\n⚠️  Test 2 warning - Expected budget to be exceeded');
    }
  } finally {
    // Restore original setting
    if (originalMax !== undefined) {
      process.env.FH_MAX_TOTAL_ITERATIONS = originalMax;
    } else {
      delete process.env.FH_MAX_TOTAL_ITERATIONS;
    }
  }
}

async function main() {
  console.log('🧪 Budget Tracking Manual Tests\n');
  console.log('This will run 2 tests to verify budget tracking is working.\n');

  try {
    // Test 1: Normal budget
    await testNormalBudget();

    // Test 2: Force early termination
    await testLowBudget();

    console.log('\n✅ All tests complete!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
