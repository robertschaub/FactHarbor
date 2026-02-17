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
  // DELETED: checkContextIterationBudget, recordIteration (Phase 4 cleanup - orchestrated pipeline only)
  checkTokenBudget,
  createBudgetTracker,
  getBudgetConfig,
  getBudgetStats,
  markBudgetExceeded,
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
    // DELETED: iterationsByContext check (Phase 4 cleanup - orchestrated pipeline only)
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
    // DELETED: recordIteration calls (Phase 4 cleanup - orchestrated pipeline only)
    // Manually increment totalIterations instead
    tracker.totalIterations = 3;

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
    // DELETED: recordIteration calls (Phase 4 cleanup - orchestrated pipeline only)
    // Manually increment totalIterations instead
    tracker.totalIterations = 5;

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

// DELETED: Budget Integration Scenarios tests (Phase 4 cleanup - orchestrated pipeline only)
// All 4 tests removed - they tested checkContextIterationBudget() and recordIteration()
// which were removed when orchestrated pipeline was deleted. ClaimAssessmentBoundary pipeline
// does not use per-context iteration budgets.
