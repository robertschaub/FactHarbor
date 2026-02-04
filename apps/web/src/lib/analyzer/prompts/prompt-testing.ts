/**
 * Prompt Testing Utilities - A/B Testing and Quality Metrics
 *
 * This module provides utilities for:
 * - Comparing old vs new prompt effectiveness
 * - Tracking schema compliance rates
 * - Measuring verdict accuracy
 * - Provider consistency tracking
 *
 * @version 2.8.0 - New module for prompt optimization validation
 */

import { buildPrompt, type PromptContext, type TaskType, type ProviderType } from './prompt-builder';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptTestCase {
  id: string;
  input: string;
  expectedOutput?: Record<string, unknown>;
  expectedVerdictRange?: { min: number; max: number };
  description: string;
}

export interface PromptTestResult {
  testCaseId: string;
  provider: ProviderType;
  task: TaskType;
  schemaValid: boolean;
  schemaErrors: string[];
  outputMatched: boolean;
  verdictInRange: boolean | null;
  tokenCount: number;
  responseTimeMs: number;
  rawOutput: unknown;
}

export interface PromptComparisonResult {
  testCaseId: string;
  provider: ProviderType;
  task: TaskType;
  oldPromptResult: PromptTestResult;
  newPromptResult: PromptTestResult;
  improvement: {
    schemaCompliance: number; // -1 to 1 (-1 = worse, 0 = same, 1 = better)
    verdictAccuracy: number | null;
    tokenReduction: number; // percentage
    speedImprovement: number; // percentage
  };
}

export interface PromptQualityMetrics {
  provider: ProviderType;
  task: TaskType;
  totalTests: number;
  schemaComplianceRate: number; // 0-100%
  verdictAccuracyRate: number | null; // 0-100% or null if N/A
  avgTokenCount: number;
  avgResponseTimeMs: number;
  commonErrors: Array<{ error: string; count: number }>;
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Standard test cases for prompt A/B testing
 */
export const STANDARD_TEST_CASES: PromptTestCase[] = [
  {
    id: 'attribution-separation',
    input: 'Person A claims Product X is unsafe',
    description: 'Tests separation of attribution from content claims',
    expectedOutput: {
      subClaimsCount: 2, // Should produce attribution + core claim
      hasAttributionClaim: true,
      hasCoreClaim: true,
    },
  },
  {
    id: 'multi-context-detection',
    input: 'Institution A ruled X was ineligible, while Institution B ruled differently on eligibility',
    description: 'Tests detection of multiple distinct institutional contexts',
    expectedOutput: {
      contextCount: 2,
      requiresSeparateAnalysis: true,
    },
  },
  {
    id: 'methodology-context',
    input: 'Method A analysis shows System A is 40% efficient, while Method B shows 60%',
    description: 'Tests detection of methodology-based contexts',
    expectedOutput: {
      contextCount: 2,
    },
  },
  {
    id: 'rating-direction',
    input: 'Hydrogen cars are more efficient than electric cars',
    description: 'Tests rating direction (claim vs evidence)',
    expectedVerdictRange: { min: 0, max: 35 }, // Should be FALSE/MOSTLY FALSE given typical evidence
  },
  {
    id: 'simple-factual',
    input: 'The Earth is approximately 4.5 billion years old',
    description: 'Tests simple factual claim handling',
    expectedVerdictRange: { min: 85, max: 100 }, // Should be TRUE
  },
];

// ============================================================================
// METRICS COLLECTION
// ============================================================================

/**
 * Metrics storage for tracking prompt performance over time
 */
export class PromptMetricsCollector {
  private results: PromptTestResult[] = [];
  private comparisons: PromptComparisonResult[] = [];

  /**
   * Record a test result
   */
  recordResult(result: PromptTestResult): void {
    this.results.push(result);
  }

  /**
   * Record a comparison between old and new prompts
   */
  recordComparison(comparison: PromptComparisonResult): void {
    this.comparisons.push(comparison);
  }

  /**
   * Get quality metrics by provider and task
   */
  getMetrics(provider: ProviderType, task: TaskType): PromptQualityMetrics {
    const filtered = this.results.filter(
      (r) => r.provider === provider && r.task === task
    );

    if (filtered.length === 0) {
      return {
        provider,
        task,
        totalTests: 0,
        schemaComplianceRate: 0,
        verdictAccuracyRate: null,
        avgTokenCount: 0,
        avgResponseTimeMs: 0,
        commonErrors: [],
      };
    }

    // Calculate metrics
    const schemaValidCount = filtered.filter((r) => r.schemaValid).length;
    const verdictResults = filtered.filter((r) => r.verdictInRange !== null);
    const verdictCorrect = verdictResults.filter((r) => r.verdictInRange).length;

    // Collect common errors
    const errorMap = new Map<string, number>();
    for (const result of filtered) {
      for (const error of result.schemaErrors) {
        errorMap.set(error, (errorMap.get(error) || 0) + 1);
      }
    }
    const commonErrors = Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      provider,
      task,
      totalTests: filtered.length,
      schemaComplianceRate: (schemaValidCount / filtered.length) * 100,
      verdictAccuracyRate: verdictResults.length > 0
        ? (verdictCorrect / verdictResults.length) * 100
        : null,
      avgTokenCount: filtered.reduce((sum, r) => sum + r.tokenCount, 0) / filtered.length,
      avgResponseTimeMs: filtered.reduce((sum, r) => sum + r.responseTimeMs, 0) / filtered.length,
      commonErrors,
    };
  }

  /**
   * Get comparison summary across all tests
   */
  getComparisonSummary(): {
    totalComparisons: number;
    schemaImprovementRate: number;
    avgTokenReduction: number;
    avgSpeedImprovement: number;
  } {
    if (this.comparisons.length === 0) {
      return {
        totalComparisons: 0,
        schemaImprovementRate: 0,
        avgTokenReduction: 0,
        avgSpeedImprovement: 0,
      };
    }

    const improvements = this.comparisons.map((c) => c.improvement);

    return {
      totalComparisons: this.comparisons.length,
      schemaImprovementRate:
        (improvements.filter((i) => i.schemaCompliance > 0).length / improvements.length) * 100,
      avgTokenReduction:
        improvements.reduce((sum, i) => sum + i.tokenReduction, 0) / improvements.length,
      avgSpeedImprovement:
        improvements.reduce((sum, i) => sum + i.speedImprovement, 0) / improvements.length,
    };
  }

  /**
   * Export metrics to JSON for analysis
   */
  exportToJson(): string {
    return JSON.stringify({
      results: this.results,
      comparisons: this.comparisons,
      summary: {
        byProviderTask: this.getAllMetrics(),
        comparison: this.getComparisonSummary(),
      },
    }, null, 2);
  }

  /**
   * Get all metrics for all provider/task combinations
   */
  private getAllMetrics(): PromptQualityMetrics[] {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'mistral'];
    const tasks: TaskType[] = ['understand', 'extract_facts', 'verdict', 'scope_refinement'];

    const metrics: PromptQualityMetrics[] = [];
    for (const provider of providers) {
      for (const task of tasks) {
        const m = this.getMetrics(provider, task);
        if (m.totalTests > 0) {
          metrics.push(m);
        }
      }
    }
    return metrics;
  }

  /**
   * Clear all collected data
   */
  clear(): void {
    this.results = [];
    this.comparisons = [];
  }
}

// ============================================================================
// PROMPT GENERATION HELPERS
// ============================================================================

/**
 * Generate a prompt for testing purposes
 */
export function generateTestPrompt(
  task: TaskType,
  provider: ProviderType,
  options: {
    isBudgetModel?: boolean;
    isLLMTiering?: boolean;
    allowModelKnowledge?: boolean;
    variables?: Record<string, unknown>;
  } = {}
): string {
  const context: PromptContext = {
    task,
    provider,
    modelName: getTestModelName(provider, options.isBudgetModel),
    config: {
      allowModelKnowledge: options.allowModelKnowledge ?? false,
      isLLMTiering: options.isLLMTiering ?? false,
      isBudgetModel: options.isBudgetModel ?? false,
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      currentDateReadable: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      ...options.variables,
    },
  };

  return buildPrompt(context);
}

/**
 * Get test model name for a provider
 */
function getTestModelName(provider: ProviderType, isBudget?: boolean): string {
  const models = {
    anthropic: isBudget ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-20250514',
    openai: isBudget ? 'gpt-4o-mini' : 'gpt-4o',
    google: isBudget ? 'gemini-1.5-flash' : 'gemini-1.5-pro',
    mistral: isBudget ? 'mistral-small-latest' : 'mistral-large-latest',
  };
  return models[provider];
}

/**
 * Count tokens in a prompt (rough estimate)
 */
export function estimateTokenCount(prompt: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(prompt.length / 4);
}

/**
 * Compare token counts between two prompts
 */
export function compareTokenCounts(oldPrompt: string, newPrompt: string): {
  oldTokens: number;
  newTokens: number;
  reduction: number; // percentage
} {
  const oldTokens = estimateTokenCount(oldPrompt);
  const newTokens = estimateTokenCount(newPrompt);
  const reduction = ((oldTokens - newTokens) / oldTokens) * 100;

  return { oldTokens, newTokens, reduction };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate output against expected values
 */
export function validateOutput(
  output: unknown,
  expected: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: ['Output is not an object'] };
  }

  const obj = output as Record<string, unknown>;

  for (const [key, value] of Object.entries(expected)) {
    if (key === 'subClaimsCount') {
      const subClaims = obj.subClaims as unknown[];
      if (!Array.isArray(subClaims) || subClaims.length < (value as number)) {
        errors.push(`Expected at least ${value} subClaims, got ${subClaims?.length || 0}`);
      }
    } else if (key === 'contextCount') {
      // NOTE: Support both analysisContexts (newer outputs) and detectedScopes (legacy understand schema).
      // Do not remove detectedScopes until backward compatibility is intentionally broken.
      const contexts = (obj.analysisContexts || obj.detectedScopes) as unknown[];
      if (!Array.isArray(contexts) || contexts.length !== value) {
        errors.push(`Expected ${value} contexts, got ${contexts?.length || 0}`);
      }
    } else if (key === 'requiresSeparateAnalysis') {
      if (obj.requiresSeparateAnalysis !== value) {
        errors.push(`Expected requiresSeparateAnalysis=${value}, got ${obj.requiresSeparateAnalysis}`);
      }
    } else if (key === 'hasAttributionClaim') {
      const subClaims = obj.subClaims as Array<{ claimRole?: string }>;
      const hasAttribution = subClaims?.some((c) => c.claimRole === 'attribution');
      if (hasAttribution !== value) {
        errors.push(`Expected hasAttributionClaim=${value}, got ${hasAttribution}`);
      }
    } else if (key === 'hasCoreClaim') {
      const subClaims = obj.subClaims as Array<{ claimRole?: string }>;
      const hasCore = subClaims?.some((c) => c.claimRole === 'core');
      if (hasCore !== value) {
        errors.push(`Expected hasCoreClaim=${value}, got ${hasCore}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if verdict is in expected range
 */
export function isVerdictInRange(
  verdictOutput: unknown,
  range: { min: number; max: number }
): boolean {
  if (!verdictOutput || typeof verdictOutput !== 'object') return false;

  const obj = verdictOutput as Record<string, unknown>;
  const answer = obj.answer as number;

  if (typeof answer !== 'number') return false;

  return answer >= range.min && answer <= range.max;
}

// ============================================================================
// SINGLETON COLLECTOR
// ============================================================================

/**
 * Global metrics collector instance
 */
export const promptMetrics = new PromptMetricsCollector();
