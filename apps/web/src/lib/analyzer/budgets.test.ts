/**
 * Budget Tracking Test Suite (PR 6: p95 Hardening)
 *
 * Tests resource budgets and caps for multi-scope research operations.
 *
 * @module analyzer/budgets.test
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_BUDGET,
  checkScopeIterationBudget,
  checkTokenBudget,
  createBudgetTracker,
  getBudgetConfig,
  getBudgetStats,
  markBudgetExceeded,
  recordIteration,
  recordLLMCall,
  recordTokens,
} from "./budgets";

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe("Budget Configuration", () => {
  it("returns default budget when no env vars set", () => {
    const budget = getBudgetConfig();

    expect(budget.maxIterationsPerScope).toBe(DEFAULT_BUDGET.maxIterationsPerScope);
    expect(budget.maxTotalIterations).toBe(DEFAULT_BUDGET.maxTotalIterations);
    expect(budget.maxTotalTokens).toBe(DEFAULT_BUDGET.maxTotalTokens);
    expect(budget.maxTokensPerCall).toBe(DEFAULT_BUDGET.maxTokensPerCall);
    expect(budget.enforceHard).toBe(DEFAULT_BUDGET.enforceHard);
  });

  it("creates budget tracker with zero initial values", () => {
    const tracker = createBudgetTracker();

    expect(tracker.tokensUsed).toBe(0);
    expect(tracker.totalIterations).toBe(0);
    expect(tracker.llmCalls).toBe(0);
    expect(tracker.budgetExceeded).toBe(false);
    expect(tracker.iterationsByScope.size).toBe(0);
  });
});

// ============================================================================
// ITERATION BUDGET TESTS
// ============================================================================

describe("Scope Iteration Budget", () => {
  it("allows iterations within per-scope budget", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_A");

    const check = checkScopeIterationBudget(tracker, budget, "SCOPE_A");
    expect(check.allowed).toBe(true);
    expect(tracker.iterationsByScope.get("SCOPE_A")).toBe(2);
    expect(tracker.totalIterations).toBe(2);
  });

  it("blocks iterations exceeding per-scope limit", () => {
    const budget = { ...DEFAULT_BUDGET, maxIterationsPerScope: 2 };
    const tracker = createBudgetTracker();

    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_A");

    const check = checkScopeIterationBudget(tracker, budget, "SCOPE_A");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("reached max iterations");
  });

  it("blocks iterations exceeding total limit", () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalIterations: 2 };
    const tracker = createBudgetTracker();

    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_B");

    const check = checkScopeIterationBudget(tracker, budget, "SCOPE_C");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Total iterations reached max");
  });

  it("tracks iterations per scope independently", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_B");

    expect(tracker.iterationsByScope.get("SCOPE_A")).toBe(2);
    expect(tracker.iterationsByScope.get("SCOPE_B")).toBe(1);
    expect(tracker.totalIterations).toBe(3);
  });
});

// ============================================================================
// TOKEN BUDGET TESTS
// ============================================================================

describe("Token Budget", () => {
  it("allows tokens within budget", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    const check = checkTokenBudget(tracker, budget, 50000);
    expect(check.allowed).toBe(true);
  });

  it("blocks tokens exceeding total budget", () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalTokens: 10000 };
    const tracker = createBudgetTracker();
    recordTokens(tracker, 9000);

    const check = checkTokenBudget(tracker, budget, 2000);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("exceed max tokens");
  });

  it("blocks single call exceeding per-call limit", () => {
    const budget = { ...DEFAULT_BUDGET, maxTokensPerCall: 5000 };
    const tracker = createBudgetTracker();

    const check = checkTokenBudget(tracker, budget, 10000);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Single call exceeds max");
  });

  it("accumulates token usage correctly", () => {
    const tracker = createBudgetTracker();

    recordTokens(tracker, 1000);
    recordTokens(tracker, 2000);
    recordTokens(tracker, 3000);

    expect(tracker.tokensUsed).toBe(6000);
  });
});

// ============================================================================
// LLM CALL RECORDING TESTS
// ============================================================================

describe("LLM Call Recording", () => {
  it("records LLM call and tokens", () => {
    const tracker = createBudgetTracker();

    recordLLMCall(tracker, 5000);

    expect(tracker.llmCalls).toBe(1);
    expect(tracker.tokensUsed).toBe(5000);
  });

  it("accumulates multiple LLM calls", () => {
    const tracker = createBudgetTracker();

    recordLLMCall(tracker, 5000);
    recordLLMCall(tracker, 3000);
    recordLLMCall(tracker, 2000);

    expect(tracker.llmCalls).toBe(3);
    expect(tracker.tokensUsed).toBe(10000);
  });
});

// ============================================================================
// BUDGET EXCEEDED TESTS
// ============================================================================

describe("Budget Exceeded Tracking", () => {
  it("marks budget as exceeded with reason", () => {
    const tracker = createBudgetTracker();

    markBudgetExceeded(tracker, "Token limit exceeded");

    expect(tracker.budgetExceeded).toBe(true);
    expect(tracker.exceedReason).toBe("Token limit exceeded");
  });

  it("preserves first exceeded reason", () => {
    const tracker = createBudgetTracker();

    markBudgetExceeded(tracker, "First reason");
    markBudgetExceeded(tracker, "Second reason");

    expect(tracker.exceedReason).toBe("Second reason"); // Last one wins
  });
});

// ============================================================================
// STATS TESTS
// ============================================================================

describe("Budget Stats", () => {
  it("calculates stats correctly with no usage", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    const stats = getBudgetStats(tracker, budget);

    expect(stats.tokensUsed).toBe(0);
    expect(stats.tokensRemaining).toBe(budget.maxTotalTokens);
    expect(stats.tokensPercent).toBe(0);
    expect(stats.totalIterations).toBe(0);
    expect(stats.iterationsRemaining).toBe(budget.maxTotalIterations);
    expect(stats.iterationsPercent).toBe(0);
    expect(stats.llmCalls).toBe(0);
    expect(stats.budgetExceeded).toBe(false);
  });

  it("calculates stats correctly with partial usage", () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalTokens: 10000, maxTotalIterations: 10 };
    const tracker = createBudgetTracker();

    recordTokens(tracker, 5000);
    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_B");

    const stats = getBudgetStats(tracker, budget);

    expect(stats.tokensUsed).toBe(5000);
    expect(stats.tokensRemaining).toBe(5000);
    expect(stats.tokensPercent).toBe(50);
    expect(stats.totalIterations).toBe(3);
    expect(stats.iterationsRemaining).toBe(7);
    expect(stats.iterationsPercent).toBe(30);
  });

  it("calculates stats correctly at budget limit", () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalTokens: 10000, maxTotalIterations: 5 };
    const tracker = createBudgetTracker();

    recordTokens(tracker, 10000);
    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_A");
    recordIteration(tracker, "SCOPE_B");
    recordIteration(tracker, "SCOPE_B");
    recordIteration(tracker, "SCOPE_C");

    const stats = getBudgetStats(tracker, budget);

    expect(stats.tokensUsed).toBe(10000);
    expect(stats.tokensRemaining).toBe(0);
    expect(stats.tokensPercent).toBe(100);
    expect(stats.totalIterations).toBe(5);
    expect(stats.iterationsRemaining).toBe(0);
    expect(stats.iterationsPercent).toBe(100);
  });

  it("calculates stats correctly when budget exceeded", () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalTokens: 10000 };
    const tracker = createBudgetTracker();

    recordTokens(tracker, 15000); // Exceeded
    markBudgetExceeded(tracker, "Token limit exceeded");

    const stats = getBudgetStats(tracker, budget);

    expect(stats.tokensUsed).toBe(15000);
    expect(stats.tokensRemaining).toBe(0); // Clamped to 0
    expect(stats.tokensPercent).toBe(150);
    expect(stats.budgetExceeded).toBe(true);
  });
});

// ============================================================================
// INTEGRATION SCENARIO TESTS
// ============================================================================

describe("Budget Integration Scenarios", () => {
  it("realistic multi-scope research scenario", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    // Simulate research on 3 scopes, 2-3 iterations each
    for (let i = 0; i < 2; i++) {
      recordIteration(tracker, "SCOPE_A");
      recordLLMCall(tracker, 5000);
    }

    for (let i = 0; i < 3; i++) {
      recordIteration(tracker, "SCOPE_B");
      recordLLMCall(tracker, 4000);
    }

    for (let i = 0; i < 2; i++) {
      recordIteration(tracker, "SCOPE_C");
      recordLLMCall(tracker, 6000);
    }

    const stats = getBudgetStats(tracker, budget);

    expect(stats.totalIterations).toBe(7);
    expect(stats.tokensUsed).toBe(34000);
    expect(stats.llmCalls).toBe(7);
    expect(stats.budgetExceeded).toBe(false);

    // All scopes should still be within budget
    expect(checkScopeIterationBudget(tracker, budget, "SCOPE_A").allowed).toBe(true);
    expect(checkScopeIterationBudget(tracker, budget, "SCOPE_B").allowed).toBe(false); // Hit limit
    expect(checkScopeIterationBudget(tracker, budget, "SCOPE_C").allowed).toBe(true);
  });

  it("budget exhaustion scenario", () => {
    const budget = {
      ...DEFAULT_BUDGET,
      maxTotalIterations: 5,
      maxTotalTokens: 20000,
    };
    const tracker = createBudgetTracker();

    // Simulate exhausting total iterations budget
    for (let i = 0; i < 5; i++) {
      recordIteration(tracker, `SCOPE_${i}`);
      recordLLMCall(tracker, 3000);
    }

    const stats = getBudgetStats(tracker, budget);

    expect(stats.totalIterations).toBe(5);
    expect(stats.tokensUsed).toBe(15000);

    // Next iteration should be blocked
    const check = checkScopeIterationBudget(tracker, budget, "SCOPE_NEW");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Total iterations reached max");
  });
});
