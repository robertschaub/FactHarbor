/**
 * Regression Test: Bolsonaro Quality Degradation
 * Documents the quality decline between Jan 13-19, 2026
 */

const API_URL = process.env.FH_API_URL || 'http://localhost:3000';

// Test cases from user's evidence
const REGRESSION_TEST_CASES = [
  {
    id: 'bolsonaro-statement',
    input: 'The Bolsonaro judgment (trial) was fair and based on Brazil\'s law',
    inputType: 'text',
    baseline: {
      jobId: '077b5b24e2424c139a68c1b11e6dd153',
      date: '2026-01-13',
      confidence: 77,
      searches: 16,
      claims: 12,
      verdict: 'Mostly True',
      truthPercentage: 73,
    },
    regression: {
      jobId: '1a88dbcd47914abcbb4cd78c01e41872',
      date: '2026-01-19',
      confidence: 50,
      searches: 9,
      claims: 7,
      verdict: 'Mostly True',
      truthPercentage: 73,
    },
  },
  {
    id: 'bolsonaro-question',
    input: 'Was the Bolsonaro judgment (trial) fair and based on Brazil\'s law?',
    inputType: 'text',
    baseline: {
      jobId: '077b5b24e2424c139a68c1b11e6dd153',
      date: '2026-01-13',
      confidence: 77,
      searches: 16,
      claims: 12,
      verdict: 'Mostly True',
      truthPercentage: 73,
    },
    regression: {
      jobId: 'b9c9b19f50ff47ada888c8d65f528c11',
      date: '2026-01-19',
      confidence: 78,
      searches: 9,
      claims: 9, // estimated
      verdict: 'Leaning True',
      truthPercentage: 71,
    },
  },
];

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

function extractMetrics(result) {
  const claims = result.claims || [];
  const contexts = result.analysisContexts || [];
  
  return {
    verdict: result.articleVerdict,
    truthPercentage: result.articleTruthPercentage,
    confidence: result.articleVerdictConfidence,
    claimsCount: claims.length,
    contextsCount: contexts.length,
    // Note: search count not available in result, would need debug logs
  };
}

function compareToBaseline(current, baseline, testCase) {
  const issues = [];
  
  // Confidence drop
  const confidenceDiff = current.confidence - baseline.confidence;
  if (Math.abs(confidenceDiff) > 10) {
    issues.push({
      type: 'confidence',
      severity: Math.abs(confidenceDiff) > 20 ? 'HIGH' : 'MEDIUM',
      message: `Confidence ${confidenceDiff > 0 ? 'increased' : 'dropped'} by ${Math.abs(confidenceDiff)}% (${baseline.confidence}% → ${current.confidence}%)`,
      expected: baseline.confidence,
      actual: current.confidence,
      difference: confidenceDiff,
    });
  }
  
  // Claims reduction
  const claimsDiff = current.claimsCount - baseline.claims;
  if (claimsDiff < -2) {
    issues.push({
      type: 'claims',
      severity: Math.abs(claimsDiff) > 5 ? 'HIGH' : 'MEDIUM',
      message: `Claims reduced by ${Math.abs(claimsDiff)} (${baseline.claims} → ${current.claimsCount})`,
      expected: baseline.claims,
      actual: current.claimsCount,
      difference: claimsDiff,
    });
  }
  
  // Verdict change
  if (current.verdict !== baseline.verdict) {
    issues.push({
      type: 'verdict',
      severity: 'MEDIUM',
      message: `Verdict changed from ${baseline.verdict} to ${current.verdict}`,
      expected: baseline.verdict,
      actual: current.verdict,
    });
  }
  
  // Truth percentage change
  const truthDiff = current.truthPercentage - baseline.truthPercentage;
  if (Math.abs(truthDiff) > 5) {
    issues.push({
      type: 'truth-percentage',
      severity: 'LOW',
      message: `Truth percentage changed by ${truthDiff}% (${baseline.truthPercentage}% → ${current.truthPercentage}%)`,
      expected: baseline.truthPercentage,
      actual: current.truthPercentage,
      difference: truthDiff,
    });
  }
  
  return issues;
}

async function runRegressionTest() {
  console.log('========================================');
  console.log('Regression Test: Bolsonaro Quality Issue');
  console.log('========================================\n');
  
  const results = [];
  
  for (const testCase of REGRESSION_TEST_CASES) {
    console.log(`\n[${testCase.id}]`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Baseline (${testCase.baseline.date}): ${testCase.baseline.confidence}% confidence, ${testCase.baseline.claims} claims, ${testCase.baseline.searches} searches`);
    console.log(`Regression (${testCase.regression.date}): ${testCase.regression.confidence}% confidence, ${testCase.regression.claims} claims, ${testCase.regression.searches} searches`);
    console.log('');
    
    try {
      // Submit new analysis
      console.log('Running current analysis...');
      const response = await fetch(`${API_URL}/api/fh/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: testCase.inputType,
          inputValue: testCase.input,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      const { jobId } = await response.json();
      console.log(`Job ID: ${jobId}`);
      
      // Wait for completion
      const job = await waitForJob(jobId);
      
      if (job.status !== 'SUCCEEDED') {
        throw new Error(`Job failed: ${job.status}`);
      }
      
      const result = JSON.parse(job.resultJson);
      const current = extractMetrics(result);
      
      console.log(`\nCurrent Results:`);
      console.log(`  Verdict: ${current.verdict} (${current.truthPercentage}%)`);
      console.log(`  Confidence: ${current.confidence}%`);
      console.log(`  Claims: ${current.claimsCount}`);
      console.log(`  Contexts: ${current.contextsCount}`);
      
      // Compare to baseline
      const issues = compareToBaseline(current, testCase.baseline, testCase);
      
      if (issues.length > 0) {
        console.log(`\n⚠️ Quality Issues Detected (${issues.length}):`);
        for (const issue of issues) {
          console.log(`  [${issue.severity}] ${issue.type}: ${issue.message}`);
        }
      } else {
        console.log(`\n✓ No significant quality degradation detected`);
      }
      
      results.push({
        testCase,
        jobId,
        current,
        issues,
        success: issues.length === 0,
      });
      
    } catch (error) {
      console.error(`✗ Test failed: ${error.message}`);
      results.push({
        testCase,
        error: error.message,
        success: false,
      });
    }
  }
  
  // Summary
  console.log('\n========================================');
  console.log('Regression Test Summary');
  console.log('========================================');
  
  const totalIssues = results.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
  const highSeverity = results.reduce((sum, r) => 
    sum + (r.issues?.filter(i => i.severity === 'HIGH').length || 0), 0);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Issues found: ${totalIssues}`);
  console.log(`High severity: ${highSeverity}`);
  console.log('');
  
  if (totalIssues > 0) {
    console.log('⚠️ REGRESSION CONFIRMED');
    console.log('Quality has degraded compared to baseline (Jan 13)');
    console.log('');
    console.log('Recommended actions:');
    console.log('1. Run git bisect to find breaking commit');
    console.log('2. Enable metrics collection for detailed analysis');
    console.log('3. Review v2.8 prompt changes');
    console.log('4. Check Gate 1 filtering behavior');
  } else {
    console.log('✓ No regression detected');
    console.log('Current quality matches baseline');
  }
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  runRegressionTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runRegressionTest, REGRESSION_TEST_CASES };
