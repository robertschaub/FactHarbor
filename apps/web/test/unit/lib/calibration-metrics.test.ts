import { describe, expect, it } from "vitest";
import {
  computeAggregateMetrics,
  computePairMetrics,
} from "@/lib/calibration/metrics";
import type {
  BiasPair,
  CalibrationThresholds,
  PairResult,
  SideResult,
} from "@/lib/calibration/types";
import { DEFAULT_CALIBRATION_THRESHOLDS } from "@/lib/calibration/types";

function createSide(overrides: Partial<SideResult>): SideResult {
  return {
    claim: "test claim",
    side: "left",
    truthPercentage: 50,
    confidence: 70,
    verdict: "UNVERIFIED",
    claimVerdicts: [],
    evidencePool: {
      totalItems: 0,
      supporting: 0,
      contradicting: 0,
      neutral: 0,
      supportRatio: 0.5,
    },
    sourceCount: 3,
    uniqueDomains: 2,
    gate1Stats: { total: 1, passed: 1, filtered: 0 },
    gate4Stats: { total: 1, highConfidence: 1, insufficient: 0 },
    llmCalls: 10,
    searchQueries: 3,
    durationMs: 1000,
    modelsUsed: {},
    warnings: [],
    fullResultJson: {},
    ...overrides,
  };
}

describe("calibration failure-mode metrics", () => {
  it("flags refusal asymmetry at pair level", () => {
    const pair: BiasPair = {
      id: "pair-1",
      domain: "media",
      language: "en",
      leftClaim: "left",
      rightClaim: "right",
      category: "evaluative",
      expectedSkew: "neutral",
      description: "test",
    };

    const thresholds: CalibrationThresholds = {
      ...DEFAULT_CALIBRATION_THRESHOLDS,
      maxRefusalRateDelta: 5,
      maxDegradationRateDelta: 5,
    };

    const left = createSide({
      side: "left",
      warnings: [
        {
          type: "structured_output_failure",
          severity: "warning",
          message: "Recovered after soft refusal",
          details: {
            reason: "content_policy_soft_refusal",
            stage: "stage1_pass2",
            provider: "anthropic",
          },
        },
      ],
    });
    const right = createSide({ side: "right" });

    const metrics = computePairMetrics(left, right, pair, thresholds);
    expect(metrics.failureModes.left.refusalCount).toBe(1);
    expect(metrics.failureModes.right.refusalCount).toBe(0);
    expect(metrics.failureModes.refusalRateDelta).toBeCloseTo(10, 5);
    expect(metrics.stageIndicators.failureModeBias).toBe(true);
    expect(metrics.passed).toBe(false);
  });

  it("aggregates failure-mode diagnostics by topic/provider/stage", () => {
    const thresholds = DEFAULT_CALIBRATION_THRESHOLDS;
    const pairA: BiasPair = {
      id: "pair-a",
      domain: "media",
      language: "en",
      leftClaim: "left-a",
      rightClaim: "right-a",
      category: "evaluative",
      expectedSkew: "neutral",
      description: "A",
    };
    const pairB: BiasPair = {
      id: "pair-b",
      domain: "economic",
      language: "de",
      leftClaim: "left-b",
      rightClaim: "right-b",
      category: "factual",
      expectedSkew: "neutral",
      description: "B",
    };

    const leftA = createSide({
      side: "left",
      warnings: [
        {
          type: "structured_output_failure",
          severity: "warning",
          message: "Soft refusal fallback",
          details: {
            reason: "content_policy_soft_refusal",
            stage: "stage1_pass2",
            provider: "anthropic",
          },
        },
      ],
    });
    const rightA = createSide({
      side: "right",
      warnings: [
        {
          type: "debate_provider_fallback",
          severity: "warning",
          message: "Fallback to global provider",
          details: {
            configuredProvider: "openai",
            fallbackProvider: "anthropic",
          },
        },
      ],
    });
    const leftB = createSide({
      side: "left",
      warnings: [
        {
          type: "search_provider_error",
          severity: "error",
          message: "Search provider failed",
          details: { provider: "serpapi", status: 429 },
        },
      ],
    });
    const rightB = createSide({ side: "right" });

    const pairResults: PairResult[] = [
      {
        pairId: pairA.id,
        pair: pairA,
        status: "completed",
        left: leftA,
        right: rightA,
        metrics: computePairMetrics(leftA, rightA, pairA, thresholds),
      },
      {
        pairId: pairB.id,
        pair: pairB,
        status: "completed",
        left: leftB,
        right: rightB,
        metrics: computePairMetrics(leftB, rightB, pairB, thresholds),
      },
    ];

    const aggregate = computeAggregateMetrics(pairResults, thresholds);
    expect(aggregate.failureModes.byDomain.media).toBeDefined();
    expect(aggregate.failureModes.byDomain.economic).toBeDefined();
    expect(aggregate.failureModes.byProvider.anthropic.refusalCount).toBe(1);
    expect(aggregate.failureModes.byProvider.openai.degradationCount).toBe(1);
    expect(aggregate.failureModes.byProvider.serpapi.degradationCount).toBe(1);
    expect(aggregate.failureModes.byStage.stage1_pass2.refusalCount).toBe(1);
    expect(aggregate.failureModes.byStage.research_search.degradationCount).toBe(1);
    expect(aggregate.failureModes.meanRefusalRateDelta).toBeGreaterThan(0);
  });

  it("weights failure-mode counts by warning occurrences", () => {
    const thresholds = DEFAULT_CALIBRATION_THRESHOLDS;
    const pair: BiasPair = {
      id: "pair-occ",
      domain: "media",
      language: "en",
      leftClaim: "left-occ",
      rightClaim: "right-occ",
      category: "evaluative",
      expectedSkew: "neutral",
      description: "occurrence weighting",
    };

    const left = createSide({
      side: "left",
      warnings: [
        {
          type: "search_provider_error",
          severity: "error",
          message: "Provider failed repeatedly",
          details: {
            provider: "serpapi",
            stage: "research_search",
            occurrences: 4,
            stageCounts: {
              research_search: 3,
              preliminary_search: 1,
            },
          },
        },
      ],
    });
    const right = createSide({ side: "right" });

    const metrics = computePairMetrics(left, right, pair, thresholds);
    expect(metrics.failureModes.left.degradationCount).toBe(4);
    expect(metrics.failureModes.left.degradationRate).toBeCloseTo(40, 5);

    const aggregate = computeAggregateMetrics(
      [
        {
          pairId: pair.id,
          pair,
          status: "completed",
          left,
          right,
          metrics,
        },
      ],
      thresholds,
    );

    expect(aggregate.failureModes.byProvider.serpapi.degradationCount).toBe(4);
    expect(aggregate.failureModes.byStage.research_search.degradationCount).toBe(3);
    expect(aggregate.failureModes.byStage.preliminary_search.degradationCount).toBe(1);
  });
});
