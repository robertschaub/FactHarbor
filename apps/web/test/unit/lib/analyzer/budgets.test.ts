/**
 * Budget Tracking Test Suite (PR 6: p95 Hardening)
 *
 * Tests resource budgets and caps for multi-context research operations.
 *
 * @module analyzer/budgets.test
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_BUDGET,
  checkContextIterationBudget,
  checkTokenBudget,
  createBudgetTracker,
  getBudgetConfig,
  getBudgetStats,
  markBudgetExceeded,
  recordIteration,
  recordLLMCall,
  recordTokens,
} from "@/lib/analyzer/budgets";

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe("Budget Configuration", () => {
  it("returns default budget when no env vars set", () => {
    const budget = getBudgetConfig();

    expect(budget.maxIterationsPerContext).toBe(DEFAULT_BUDGET.maxIterationsPerContext);
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
    expect(tracker.iterationsByContext.size).toBe(0);
  });
});

// ============================================================================
// ITERATION BUDGET TESTS
// ============================================================================

describe("Context Iteration Budget", () => {
  it("allows iterations within per-context budget", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_A");

    const check = checkContextIterationBudget(tracker, budget, "CTX_A");
    expect(check.allowed).toBe(true);
    expect(tracker.iterationsByContext.get("CTX_A")).toBe(2);
    expect(tracker.totalIterations).toBe(2);
  });

  it("blocks iterations exceeding per-context limit", () => {
    const budget = { ...DEFAULT_BUDGET, maxIterationsPerContext: 2 };
    const tracker = createBudgetTracker();

    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_A");

    const check = checkContextIterationBudget(tracker, budget, "CTX_A");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("reached max iterations");
  });

  it("blocks iterations exceeding total limit", () => {
    const budget = { ...DEFAULT_BUDGET, maxTotalIterations: 2 };
    const tracker = createBudgetTracker();

    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_B");

    const check = checkContextIterationBudget(tracker, budget, "CTX_C");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Total iterations reached max");
  });

  it("tracks iterations per context independently", () => {
    const budget = DEFAULT_BUDGET;
    const tracker = createBudgetTracker();

    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_B");

    expect(tracker.iterationsByContext.get("CTX_A")).toBe(2);
    expect(tracker.iterationsByContext.get("CTX_B")).toBe(1);
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
    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_B");

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
    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_A");
    recordIteration(tracker, "CTX_B");
    recordIteration(tracker, "CTX_B");
    recordIteration(tracker, "CTX_C");

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
  it("realistic multi-context research scenario", () => {
    // Use explicit budget with per-context limit of 3 to test boundary behavior
    const budget = {
      ...DEFAULT_BUDGET,
      maxIterationsPerContext: 3,
    };
    const tracker = createBudgetTracker();

    // Simulate research on 3 contexts, 2-3 iterations each
    for (let i = 0; i < 2; i++) {
      recordIteration(tracker, "CTX_A");
      recordLLMCall(tracker, 5000);
    }

    for (let i = 0; i < 3; i++) {
      recordIteration(tracker, "CTX_B");
      recordLLMCall(tracker, 4000);
    }

    for (let i = 0; i < 2; i++) {
      recordIteration(tracker, "CTX_C");
      recordLLMCall(tracker, 6000);
    }

    const stats = getBudgetStats(tracker, budget);

    expect(stats.totalIterations).toBe(7);
    expect(stats.tokensUsed).toBe(34000);
    expect(stats.llmCalls).toBe(7);
    expect(stats.budgetExceeded).toBe(false);

    // CTX_A (2) and CTX_C (2) still within limit of 3
    // CTX_B (3) has exactly hit the limit - next iteration blocked
    expect(checkContextIterationBudget(tracker, budget, "CTX_A").allowed).toBe(true);
    expect(checkContextIterationBudget(tracker, budget, "CTX_B").allowed).toBe(false); // Hit limit
    expect(checkContextIterationBudget(tracker, budget, "CTX_C").allowed).toBe(true);
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
      recordIteration(tracker, `CTX_${i}`);
      recordLLMCall(tracker, 3000);
    }

    const stats = getBudgetStats(tracker, budget);

    expect(stats.totalIterations).toBe(5);
    expect(stats.tokensUsed).toBe(15000);

    // Next iteration should be blocked
    const check = checkContextIterationBudget(tracker, budget, "CTX_NEW");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Total iterations reached max");
  });

  it("allows >3 global iterations across multiple contexts (PR-D fix)", () => {
    // This test proves the fix for Blocker D (budget semantics mismatch)
    // BEFORE FIX: Using "GLOBAL_RESEARCH" constant caused 3-iteration cap
    // AFTER FIX: Global limit (12) enforced independently of per-context limit (3)
    const budget = { ...DEFAULT_BUDGET, maxIterationsPerContext: 3, maxTotalIterations: 12 };
    const tracker = createBudgetTracker();

    // Simulate 4 contexts, 3 iterations each = 12 total
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        recordIteration(tracker, `CTX_${i}`);
      }
    }

    expect(tracker.totalIterations).toBe(12);
    expect(tracker.iterationsByContext.get("CTX_0")).toBe(3);
    expect(tracker.iterationsByContext.get("CTX_1")).toBe(3);
    expect(tracker.iterationsByContext.get("CTX_2")).toBe(3);
    expect(tracker.iterationsByContext.get("CTX_3")).toBe(3);

    // All contexts should be at their per-context limit
    for (let i = 0; i < 4; i++) {
      const check = checkContextIterationBudget(tracker, budget, `CTX_${i}`);
      expect(check.allowed).toBe(false); // At per-context limit
      expect(check.reason).toContain("reached max iterations");
    }
  });

  it("enforces global limit even when per-context limits not reached", () => {
    // Prove global limit is independent of per-context limits
    const budget = { ...DEFAULT_BUDGET, maxIterationsPerContext: 10, maxTotalIterations: 5 };
    const tracker = createBudgetTracker();

    // 5 different contexts, 1 iteration each = 5 total (global limit)
    for (let i = 0; i < 5; i++) {
      recordIteration(tracker, `CTX_${i}`);
    }

    expect(tracker.totalIterations).toBe(5);

    // Per-context limits NOT reached (only 1/10 per context)
    expect(tracker.iterationsByContext.get("CTX_0")).toBe(1);

    // But global limit IS reached
    const check = checkContextIterationBudget(tracker, budget, "CTX_5");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Total iterations reached max");
  });
});
