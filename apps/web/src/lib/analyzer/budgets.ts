/**
 * Budget limits for research operations (PR 6: p95 Hardening)
 *
 * Prevents runaway costs on complex multi-scope inputs by tracking and limiting:
 * - Iterations per scope (prevent infinite loops)
 * - Total iterations across all scopes
 * - Total token usage (cost control)
 * - Tokens per LLM call (prevent single runaway calls)
 *
 * @module analyzer/budgets
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchBudget {
  /** Maximum research iterations per scope */
  maxIterationsPerScope: number;

  /** Maximum total research iterations across all scopes */
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

  /** Iterations per scope */
  iterationsByScope: Map<string, number>;

  /** Total iterations across all scopes */
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
 * Previous limits (3 per scope, 12 total) were causing premature
 * termination with fewer searches and lower quality.
 */
export const DEFAULT_BUDGET: ResearchBudget = {
  maxIterationsPerScope: 5, // v2.8.2: was 3 - increased for better research depth
  maxTotalIterations: 20, // v2.8.2: was 12 - increased for multi-scope analyses
  maxTotalTokens: 750_000, // v2.8.2: was 500_000 - ~$2.25 max cost at Claude rates
  maxTokensPerCall: 100_000, // Prevent single runaway calls
  enforceHard: false, // v2.8.2: was true - warn but don't hard-stop
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get budget configuration from environment or defaults
 */
export function getBudgetConfig(): ResearchBudget {
  return {
    maxIterationsPerScope: parseInt(
      process.env.FH_MAX_ITERATIONS_PER_SCOPE || String(DEFAULT_BUDGET.maxIterationsPerScope),
      10
    ),
    maxTotalIterations: parseInt(
      process.env.FH_MAX_TOTAL_ITERATIONS || String(DEFAULT_BUDGET.maxTotalIterations),
      10
    ),
    maxTotalTokens: parseInt(
      process.env.FH_MAX_TOTAL_TOKENS || String(DEFAULT_BUDGET.maxTotalTokens),
      10
    ),
    maxTokensPerCall: parseInt(
      process.env.FH_MAX_TOKENS_PER_CALL || String(DEFAULT_BUDGET.maxTokensPerCall),
      10
    ),
    enforceHard: process.env.FH_ENFORCE_BUDGETS !== "false",
  };
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
    iterationsByScope: new Map(),
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

/**
 * Check if scope can perform another iteration
 */
export function checkScopeIterationBudget(
  tracker: BudgetTracker,
  budget: ResearchBudget,
  scopeId: string
): { allowed: boolean; reason?: string } {
  const scopeIterations = tracker.iterationsByScope.get(scopeId) || 0;

  if (scopeIterations >= budget.maxIterationsPerScope) {
    return {
      allowed: false,
      reason: `Scope ${scopeId} reached max iterations: ${scopeIterations} >= ${budget.maxIterationsPerScope}`,
    };
  }

  if (tracker.totalIterations >= budget.maxTotalIterations) {
    return {
      allowed: false,
      reason: `Total iterations reached max: ${tracker.totalIterations} >= ${budget.maxTotalIterations}`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

/**
 * Record an iteration for a scope
 */
export function recordIteration(tracker: BudgetTracker, scopeId: string): void {
  const current = tracker.iterationsByScope.get(scopeId) || 0;
  tracker.iterationsByScope.set(scopeId, current + 1);
  tracker.totalIterations++;
}

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
