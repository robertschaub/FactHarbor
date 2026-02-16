/**
 * Budget limits for research operations (PR 6: p95 Hardening)
 *
 * Prevents runaway costs on complex multi-context inputs by tracking and limiting:
 * - Iterations per context (prevent infinite loops)
 * - Total iterations across all contexts
 * - Total token usage (cost control)
 * - Tokens per LLM call (prevent single runaway calls)
 *
 * @module analyzer/budgets
 */

import type { PipelineConfig } from "../config-schemas";

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchBudget {
  /** Maximum research iterations per context */
  maxIterationsPerContext: number;

  /** Maximum total research iterations across all contexts */
  maxTotalIterations: number;

  /** Maximum total tokens (input + output) for entire analysis */
  maxTotalTokens: number;

  /** Maximum tokens per LLM call */
  maxTokensPerCall: number;

  /** Whether to enforce budgets (false = warn only) */
  enforceHard: boolean;
}

export interface BudgetTracker {
  /** Tokens used so far */
  tokensUsed: number;

  // DELETED: iterationsByContext field (Phase 4 cleanup - orchestrated pipeline only)

  /** Total iterations across all contexts */
  totalIterations: number;

  /** LLM calls made */
  llmCalls: number;

  /** Whether budget has been exceeded */
  budgetExceeded: boolean;

  /** Reason for budget exceeded (if applicable) */
  exceedReason?: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default budgets calibrated for p95 coverage:
 * - 95% of analyses complete within these limits
 * - 5% may hit budgets and terminate early with partial results
 * 
 * v2.8.2: Increased limits to address quality degradation.
 * Previous limits (3 per context, 12 total) were causing premature
 * termination with fewer searches and lower quality.
 */
export const DEFAULT_BUDGET: ResearchBudget = {
  maxIterationsPerContext: 3, // v2.11.1: was 5 (v2.8.2: was 3) - reduced for cost optimization
  maxTotalIterations: 10, // v2.11.1: was 20 (v2.8.2: was 12) - reduced for cost optimization
  maxTotalTokens: 500_000, // v2.11.1: was 750_000 (v2.8.2: was 500_000) - ~$1.50 max cost at Claude rates
  maxTokensPerCall: 100_000, // Prevent single runaway calls
  enforceHard: false, // v2.8.2: was true - warn but don't hard-stop
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get budget configuration from pipeline config, environment, or defaults
 *
 * Resolution order:
 * 1. Pipeline config (if provided)
 * 2. Environment variables
 * 3. Default values
 *
 * @param config - Optional pipeline config from unified config system
 */
export function getBudgetConfig(config?: PipelineConfig): ResearchBudget {
  if (config) {
    return {
      maxIterationsPerContext: config.maxIterationsPerContext ?? DEFAULT_BUDGET.maxIterationsPerContext,
      maxTotalIterations: config.maxTotalIterations,
      maxTotalTokens: config.maxTotalTokens,
      maxTokensPerCall: config.maxTokensPerCall ?? DEFAULT_BUDGET.maxTokensPerCall,
      enforceHard: config.enforceBudgets,
    };
  }

  return { ...DEFAULT_BUDGET };
}

// ============================================================================
// TRACKER INITIALIZATION
// ============================================================================

/**
 * Create a new budget tracker
 */
export function createBudgetTracker(): BudgetTracker {
  return {
    tokensUsed: 0,
    // DELETED: iterationsByContext Map (Phase 4 cleanup - orchestrated pipeline only)
    totalIterations: 0,
    llmCalls: 0,
    budgetExceeded: false,
  };
}

// ============================================================================
// BUDGET CHECKS
// ============================================================================

/**
 * Check if adding tokens would exceed budget
 */
export function checkTokenBudget(
  tracker: BudgetTracker,
  budget: ResearchBudget,
  tokensToAdd: number
): { allowed: boolean; reason?: string } {
  const newTotal = tracker.tokensUsed + tokensToAdd;

  if (newTotal > budget.maxTotalTokens) {
    return {
      allowed: false,
      reason: `Would exceed max tokens: ${newTotal} > ${budget.maxTotalTokens}`,
    };
  }

  if (tokensToAdd > budget.maxTokensPerCall) {
    return {
      allowed: false,
      reason: `Single call exceeds max: ${tokensToAdd} > ${budget.maxTokensPerCall}`,
    };
  }

  return { allowed: true };
}

// DELETED: checkContextIterationBudget function (Phase 4 cleanup - orchestrated pipeline only)

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

// DELETED: recordIteration function (Phase 4 cleanup - orchestrated pipeline only)

/**
 * Record token usage
 */
export function recordTokens(tracker: BudgetTracker, tokens: number): void {
  tracker.tokensUsed += tokens;
}

/**
 * Record LLM call
 */
export function recordLLMCall(tracker: BudgetTracker, tokens: number): void {
  tracker.llmCalls++;
  recordTokens(tracker, tokens);
}

/**
 * Mark budget as exceeded
 */
export function markBudgetExceeded(tracker: BudgetTracker, reason: string): void {
  tracker.budgetExceeded = true;
  tracker.exceedReason = reason;
}

// ============================================================================
// STATS
// ============================================================================

/**
 * Get budget usage stats for logging
 */
export function getBudgetStats(
  tracker: BudgetTracker,
  budget: ResearchBudget
): {
  tokensUsed: number;
  tokensRemaining: number;
  tokensPercent: number;
  totalIterations: number;
  iterationsRemaining: number;
  iterationsPercent: number;
  llmCalls: number;
  budgetExceeded: boolean;
} {
  const tokensRemaining = Math.max(0, budget.maxTotalTokens - tracker.tokensUsed);
  const tokensPercent = (tracker.tokensUsed / budget.maxTotalTokens) * 100;

  const iterationsRemaining = Math.max(0, budget.maxTotalIterations - tracker.totalIterations);
  const iterationsPercent = (tracker.totalIterations / budget.maxTotalIterations) * 100;

  return {
    tokensUsed: tracker.tokensUsed,
    tokensRemaining,
    tokensPercent: Math.round(tokensPercent),
    totalIterations: tracker.totalIterations,
    iterationsRemaining,
    iterationsPercent: Math.round(iterationsPercent),
    llmCalls: tracker.llmCalls,
    budgetExceeded: tracker.budgetExceeded,
  };
}
