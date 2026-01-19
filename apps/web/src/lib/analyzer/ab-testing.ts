/**
 * A/B Testing Framework for FactHarbor Prompt Optimization
 * 
 * Compares old (inline) prompts vs new (optimized buildPrompt) prompts
 * with real LLM calls to measure actual improvements.
 * 
 * Part of Phase 3: Validate v2.8 Optimizations
 * 
 * @version 1.0.0
 * @date 2026-01-19
 */

import { BASELINE_TEST_CASES, type TestCase } from './test-cases';
import type { AnalysisMetrics } from './metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface ABTestConfig {
  testCases: TestCase[];
  variants: ('inline-prompts' | 'optimized-prompts')[];
  providers: ('anthropic' | 'openai' | 'google' | 'mistral')[];
  runsPerVariant: number; // For statistical significance
}

export interface ABTestRun {
  testCaseId: string;
  variant: 'inline-prompts' | 'optimized-prompts';
  provider: string;
  jobId: string;
  metrics: AnalysisMetrics;
  verdict: {
    truthPercentage: number;
    label: string;
    confidence: number;
  };
  timestamp: Date;
}

export interface ABComparisonResult {
  testCaseId: string;
  provider: string;
  inlinePrompts: {
    avgTruthPercentage: number;
    avgTokens: number;
    avgDuration: number;
    avgCost: number;
    schemaComplianceRate: number;
    runs: ABTestRun[];
  };
  optimizedPrompts: {
    avgTruthPercentage: number;
    avgTokens: number;
    avgDuration: number;
    avgCost: number;
    schemaComplianceRate: number;
    runs: ABTestRun[];
  };
  improvement: {
    verdictAccuracyChange: number; // Percentage points
    tokenReduction: number; // Percentage
    speedImprovement: number; // Percentage
    costReduction: number; // Percentage
    schemaComplianceChange: number; // Percentage points
  };
}

export interface ABTestSummary {
  totalTests: number;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  comparisons: ABComparisonResult[];
  overallStats: {
    avgTokenReduction: number;
    avgSpeedImprovement: number;
    avgCostReduction: number;
    schemaImprovementRate: number; // % of tests with better compliance
    verdictAccuracyMaintained: boolean; // Within ±5%
  };
  timestamp: Date;
}

// ============================================================================
// A/B TEST RUNNER
// ============================================================================

export class ABTestRunner {
  private config: ABTestConfig;
  private runs: ABTestRun[] = [];

  constructor(config: ABTestConfig) {
    this.config = config;
  }

  /**
   * Run full A/B test suite
   */
  async runTests(): Promise<ABTestSummary> {
    console.log('Starting A/B test suite...');
    console.log(`Test cases: ${this.config.testCases.length}`);
    console.log(`Variants: ${this.config.variants.join(', ')}`);
    console.log(`Providers: ${this.config.providers.join(', ')}`);
    console.log(`Runs per variant: ${this.config.runsPerVariant}`);
    
    const totalRuns = 
      this.config.testCases.length *
      this.config.variants.length *
      this.config.providers.length *
      this.config.runsPerVariant;
    
    console.log(`Total planned runs: ${totalRuns}`);
    console.log('');

    let completedRuns = 0;
    let failedRuns = 0;

    // Run tests for each combination
    for (const testCase of this.config.testCases) {
      for (const provider of this.config.providers) {
        for (const variant of this.config.variants) {
          for (let run = 0; run < this.config.runsPerVariant; run++) {
            try {
              console.log(
                `[${completedRuns + failedRuns + 1}/${totalRuns}] Running: ${testCase.id} | ${provider} | ${variant} | run ${run + 1}`
              );

              const result = await this.runSingleTest(testCase, provider, variant);
              this.runs.push(result);
              completedRuns++;

              // Small delay to avoid rate limits
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
              console.error(`Failed: ${testCase.id} | ${provider} | ${variant}:`, error);
              failedRuns++;
            }
          }
        }
      }
    }

    console.log('');
    console.log(`Completed: ${completedRuns}/${totalRuns}`);
    console.log(`Failed: ${failedRuns}/${totalRuns}`);

    // Generate comparisons
    const comparisons = this.generateComparisons();

    // Calculate overall stats
    const overallStats = this.calculateOverallStats(comparisons);

    return {
      totalTests: this.config.testCases.length,
      totalRuns,
      completedRuns,
      failedRuns,
      comparisons,
      overallStats,
      timestamp: new Date(),
    };
  }

  /**
   * Run a single test
   */
  private async runSingleTest(
    testCase: TestCase,
    provider: string,
    variant: 'inline-prompts' | 'optimized-prompts'
  ): Promise<ABTestRun> {
    // Set environment variable to control which prompts to use
    const originalEnvValue = process.env.FH_USE_OPTIMIZED_PROMPTS;
    process.env.FH_USE_OPTIMIZED_PROMPTS = variant === 'optimized-prompts' ? 'true' : 'false';

    try {
      // Submit analysis job
      const response = await fetch('http://localhost:3000/api/fh/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputType: testCase.inputType,
          inputValue: testCase.input,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const { jobId } = await response.json();

      // Wait for job to complete (poll status)
      const result = await this.waitForJob(jobId);

      // Fetch metrics
      const metricsResponse = await fetch(`http://localhost:3000/api/fh/metrics/${jobId}`);
      const metrics: AnalysisMetrics = metricsResponse.ok ? await metricsResponse.json() : null;

      return {
        testCaseId: testCase.id,
        variant,
        provider,
        jobId,
        metrics,
        verdict: {
          truthPercentage: result.articleTruthPercentage || 0,
          label: result.articleVerdict || 'UNKNOWN',
          confidence: result.articleVerdictConfidence || 0,
        },
        timestamp: new Date(),
      };
    } finally {
      // Restore original env value
      if (originalEnvValue !== undefined) {
        process.env.FH_USE_OPTIMIZED_PROMPTS = originalEnvValue;
      } else {
        delete process.env.FH_USE_OPTIMIZED_PROMPTS;
      }
    }
  }

  /**
   * Wait for a job to complete
   */
  private async waitForJob(jobId: string, timeoutMs: number = 300000): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(`http://localhost:3000/api/fh/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const job = await response.json();

      if (job.status === 'SUCCEEDED') {
        return JSON.parse(job.resultJson);
      } else if (job.status === 'FAILED') {
        throw new Error(`Job failed: ${job.error || 'Unknown error'}`);
      }

      // Wait 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Job timed out after ${timeoutMs}ms`);
  }

  /**
   * Generate comparisons between variants
   */
  private generateComparisons(): ABComparisonResult[] {
    const comparisons: ABComparisonResult[] = [];

    // Group runs by test case and provider
    const grouped = new Map<string, Map<string, ABTestRun[]>>();

    for (const run of this.runs) {
      const key = `${run.testCaseId}:${run.provider}`;
      if (!grouped.has(key)) {
        grouped.set(key, new Map());
      }
      const variantMap = grouped.get(key)!;
      if (!variantMap.has(run.variant)) {
        variantMap.set(run.variant, []);
      }
      variantMap.get(run.variant)!.push(run);
    }

    // Generate comparisons
    for (const [key, variantMap] of grouped.entries()) {
      const [testCaseId, provider] = key.split(':');
      const inlineRuns = variantMap.get('inline-prompts') || [];
      const optimizedRuns = variantMap.get('optimized-prompts') || [];

      if (inlineRuns.length === 0 || optimizedRuns.length === 0) {
        continue; // Skip if missing data
      }

      comparisons.push(this.compareVariants(testCaseId, provider, inlineRuns, optimizedRuns));
    }

    return comparisons;
  }

  /**
   * Compare two variants
   */
  private compareVariants(
    testCaseId: string,
    provider: string,
    inlineRuns: ABTestRun[],
    optimizedRuns: ABTestRun[]
  ): ABComparisonResult {
    const inlineStats = this.calculateRunStats(inlineRuns);
    const optimizedStats = this.calculateRunStats(optimizedRuns);

    return {
      testCaseId,
      provider,
      inlinePrompts: {
        ...inlineStats,
        runs: inlineRuns,
      },
      optimizedPrompts: {
        ...optimizedStats,
        runs: optimizedRuns,
      },
      improvement: {
        verdictAccuracyChange: optimizedStats.avgTruthPercentage - inlineStats.avgTruthPercentage,
        tokenReduction: ((inlineStats.avgTokens - optimizedStats.avgTokens) / inlineStats.avgTokens) * 100,
        speedImprovement: ((inlineStats.avgDuration - optimizedStats.avgDuration) / inlineStats.avgDuration) * 100,
        costReduction: ((inlineStats.avgCost - optimizedStats.avgCost) / inlineStats.avgCost) * 100,
        schemaComplianceChange: optimizedStats.schemaComplianceRate - inlineStats.schemaComplianceRate,
      },
    };
  }

  /**
   * Calculate statistics for a set of runs
   */
  private calculateRunStats(runs: ABTestRun[]) {
    const avgTruthPercentage = runs.reduce((sum, r) => sum + r.verdict.truthPercentage, 0) / runs.length;
    const avgTokens = runs.reduce((sum, r) => sum + (r.metrics?.tokenCounts?.totalTokens || 0), 0) / runs.length;
    const avgDuration = runs.reduce((sum, r) => sum + (r.metrics?.totalDurationMs || 0), 0) / runs.length;
    const avgCost = runs.reduce((sum, r) => sum + (r.metrics?.estimatedCostUSD || 0), 0) / runs.length;
    
    const compliantCount = runs.filter(
      (r) =>
        r.metrics?.schemaCompliance?.understand?.success &&
        r.metrics?.schemaCompliance?.verdict?.success
    ).length;
    const schemaComplianceRate = (compliantCount / runs.length) * 100;

    return {
      avgTruthPercentage,
      avgTokens,
      avgDuration,
      avgCost,
      schemaComplianceRate,
    };
  }

  /**
   * Calculate overall statistics across all comparisons
   */
  private calculateOverallStats(comparisons: ABComparisonResult[]) {
    if (comparisons.length === 0) {
      return {
        avgTokenReduction: 0,
        avgSpeedImprovement: 0,
        avgCostReduction: 0,
        schemaImprovementRate: 0,
        verdictAccuracyMaintained: true,
      };
    }

    const avgTokenReduction =
      comparisons.reduce((sum, c) => sum + c.improvement.tokenReduction, 0) / comparisons.length;
    
    const avgSpeedImprovement =
      comparisons.reduce((sum, c) => sum + c.improvement.speedImprovement, 0) / comparisons.length;
    
    const avgCostReduction =
      comparisons.reduce((sum, c) => sum + c.improvement.costReduction, 0) / comparisons.length;
    
    const schemaImprovedCount = comparisons.filter((c) => c.improvement.schemaComplianceChange > 0).length;
    const schemaImprovementRate = (schemaImprovedCount / comparisons.length) * 100;
    
    // Check if verdict accuracy is maintained (within ±5%)
    const accuracyMaintained = comparisons.every((c) => Math.abs(c.improvement.verdictAccuracyChange) <= 5);

    return {
      avgTokenReduction,
      avgSpeedImprovement,
      avgCostReduction,
      schemaImprovementRate,
      verdictAccuracyMaintained: accuracyMaintained,
    };
  }

  /**
   * Export results to JSON file
   */
  exportResults(summary: ABTestSummary, filename: string): void {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(summary, null, 2));
    console.log(`Results exported to ${filename}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Run default A/B test configuration
 */
export async function runDefaultABTest(): Promise<ABTestSummary> {
  const runner = new ABTestRunner({
    testCases: BASELINE_TEST_CASES.slice(0, 10), // First 10 cases for quick test
    variants: ['inline-prompts', 'optimized-prompts'],
    providers: ['anthropic'], // Start with one provider
    runsPerVariant: 2, // 2 runs for variance check
  });

  return await runner.runTests();
}

/**
 * Run full A/B test suite (expensive!)
 */
export async function runFullABTest(): Promise<ABTestSummary> {
  const runner = new ABTestRunner({
    testCases: BASELINE_TEST_CASES,
    variants: ['inline-prompts', 'optimized-prompts'],
    providers: ['anthropic', 'openai', 'google'],
    runsPerVariant: 3, // 3 runs for statistical significance
  });

  return await runner.runTests();
}
