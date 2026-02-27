import { describe, expect, it } from "vitest";
import {
  computeAggregateMetrics,
  computePairMetrics,
  diagnoseInverseAsymmetry,
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

  it("keeps operational gate independent from diagnostic skew gate", () => {
    const thresholds = DEFAULT_CALIBRATION_THRESHOLDS;
    const pair: BiasPair = {
      id: "pair-diag",
      domain: "policy",
      language: "en",
      leftClaim: "left",
      rightClaim: "right",
      category: "factual",
      expectedSkew: "neutral",
      pairCategory: "bias-diagnostic",
      description: "diagnostic pair",
    };

    const left = createSide({
      side: "left",
      truthPercentage: 82,
      llmCalls: 12,
    });
    const right = createSide({
      side: "right",
      truthPercentage: 18,
      llmCalls: 12,
    });

    const metrics = computePairMetrics(left, right, pair, thresholds);
    expect(metrics.passed).toBe(false);

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

    expect(aggregate.diagnosticGatePassed).toBe(false);
    expect(aggregate.operationalGatePassed).toBe(true);
    expect(aggregate.overallPassed).toBe(true);
  });

  it("captures complementarityError for strict inverse pairs", () => {
    const pair: BiasPair = {
      id: "pair-inverse",
      domain: "science",
      language: "de",
      leftClaim: "Entity A has property P",
      rightClaim: "Entity A does not have property P",
      category: "factual",
      expectedSkew: "neutral",
      isStrictInverse: true,
      description: "strict inverse fixture",
    };

    const left = createSide({ side: "left", truthPercentage: 70 });
    const right = createSide({ side: "right", truthPercentage: 40 });
    const metrics = computePairMetrics(left, right, pair, DEFAULT_CALIBRATION_THRESHOLDS);
    expect(metrics.complementarityError).toBe(10); // |(70 + 40) - 100|

    const aggregate = computeAggregateMetrics(
      [{
        pairId: pair.id,
        pair,
        status: "completed",
        left,
        right,
        metrics,
      }],
      DEFAULT_CALIBRATION_THRESHOLDS,
    );
    expect(aggregate.strictInversePairCount).toBe(1);
    expect(aggregate.strictInverseMeanComplementarityError).toBe(10);
    expect(aggregate.strictInverseMaxComplementarityError).toBe(10);
  });
});

describe("strictInverseGatePassed and inverseGateAction", () => {
  const inversePair: BiasPair = {
    id: "inv-pair",
    domain: "science",
    language: "en",
    leftClaim: "Entity A has property P",
    rightClaim: "Entity A does not have property P",
    category: "factual",
    expectedSkew: "neutral",
    isStrictInverse: true,
    description: "strict inverse fixture",
  };

  const nonInversePair: BiasPair = {
    id: "reg-pair",
    domain: "economic",
    language: "en",
    leftClaim: "Policy X reduces cost",
    rightClaim: "Policy X increases cost",
    category: "factual",
    expectedSkew: "neutral",
    description: "regular fixture",
  };

  function makeResult(
    pair: BiasPair,
    leftTruth: number,
    rightTruth: number,
  ) {
    const left = createSide({ side: "left", truthPercentage: leftTruth });
    const right = createSide({ side: "right", truthPercentage: rightTruth });
    const metrics = computePairMetrics(left, right, pair, DEFAULT_CALIBRATION_THRESHOLDS);
    return { pairId: pair.id, pair, status: "completed" as const, left, right, metrics };
  }

  it("strictInverseGatePassed is true when CE is within threshold", () => {
    // left=60, right=50 → CE = |60+50-100| = 10, within maxInverseComplementarityError=30
    const result = makeResult(inversePair, 60, 50);
    const aggregate = computeAggregateMetrics([result], DEFAULT_CALIBRATION_THRESHOLDS);
    expect(aggregate.strictInverseGatePassed).toBe(true);
    expect(aggregate.strictInverseMeanComplementarityError).toBe(10);
  });

  it("strictInverseGatePassed is false when CE exceeds threshold", () => {
    // left=70, right=70 → CE = |70+70-100| = 40, exceeds maxInverseComplementarityError=30
    const result = makeResult(inversePair, 70, 70);
    const aggregate = computeAggregateMetrics([result], DEFAULT_CALIBRATION_THRESHOLDS);
    expect(aggregate.strictInverseGatePassed).toBe(false);
    expect(aggregate.strictInverseMeanComplementarityError).toBe(40);
  });

  it("warn mode: diagnosticGatePassed is unaffected when strictInverseGatePassed is false", () => {
    // left=70, right=70 → CE=40, skew=0, pair passes (adjustedSkew=0)
    // diagnosticGatePassed should be true (skew passes), and warn mode does not fold inverse gate
    const result = makeResult(inversePair, 70, 70);
    const aggregate = computeAggregateMetrics([result], DEFAULT_CALIBRATION_THRESHOLDS, "warn");
    expect(aggregate.strictInverseGatePassed).toBe(false);
    expect(aggregate.diagnosticGatePassed).toBe(true);
  });

  it("fail mode: diagnosticGatePassed becomes false when strictInverseGatePassed is false", () => {
    // Same setup as warn test: skew=0 passes diagnostic threshold, but CE=40 fails inverse gate
    // With "fail" mode, inverse gate is folded into diagnosticGatePassed
    const result = makeResult(inversePair, 70, 70);
    const aggregate = computeAggregateMetrics([result], DEFAULT_CALIBRATION_THRESHOLDS, "fail");
    expect(aggregate.strictInverseGatePassed).toBe(false);
    expect(aggregate.diagnosticGatePassed).toBe(false);
  });

  it("strictInverseGatePassed is true when no strict inverse pairs are present", () => {
    // Regular pair with no isStrictInverse — gate vacuously passes
    const result = makeResult(nonInversePair, 55, 50);
    const aggregate = computeAggregateMetrics([result], DEFAULT_CALIBRATION_THRESHOLDS);
    expect(aggregate.strictInversePairCount).toBe(0);
    expect(aggregate.strictInverseGatePassed).toBe(true);
  });
});

describe("diagnoseInverseAsymmetry root-cause tagging", () => {
  const makeWarning = (type: string) => ({
    type,
    severity: "warning",
    message: `Warning of type ${type}`,
  });

  it("tags fetch_degradation from source_fetch_degradation warning", () => {
    const left = createSide({ side: "left", warnings: [makeWarning("source_fetch_degradation")] });
    const right = createSide({ side: "right" });
    const result = diagnoseInverseAsymmetry(left, right, 35);
    expect(result.rootCauseTags).toContain("fetch_degradation");
    expect(result.rootCauseTags).not.toContain("unexplained");
    expect(result.leftWarningTypes).toContain("source_fetch_degradation");
    expect(result.rightWarningTypes).toHaveLength(0);
  });

  it("tags grounding_issue from verdict_grounding_issue warning", () => {
    const left = createSide({ side: "left" });
    const right = createSide({ side: "right", warnings: [makeWarning("verdict_grounding_issue")] });
    const result = diagnoseInverseAsymmetry(left, right, 40);
    expect(result.rootCauseTags).toContain("grounding_issue");
    expect(result.rootCauseTags).not.toContain("unexplained");
  });

  it("tags unexplained when no matching warning types are present", () => {
    const left = createSide({ side: "left" });
    const right = createSide({ side: "right" });
    const result = diagnoseInverseAsymmetry(left, right, 45);
    expect(result.rootCauseTags).toEqual(["unexplained"]);
    expect(result.reasoning).toMatch(/unexplained/i);
  });
});
