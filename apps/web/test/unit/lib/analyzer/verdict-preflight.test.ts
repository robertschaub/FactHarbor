import { beforeEach, describe, expect, it, vi } from "vitest";
import { runVerdictStageWithPreflight } from "@/lib/analyzer/claimboundary-pipeline";
import {
  getHealthState,
  isSystemPaused,
} from "@/lib/provider-health";

describe("runVerdictStageWithPreflight", () => {
  const claim = {
    id: "AC_01",
    statement: "Entity A achieved metric X",
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance: "direct",
    keyEntities: ["Entity A"],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: [],
      expectedMetrics: [],
      expectedSourceTypes: [],
    },
  } as any;

  const verdict = {
    id: "CV_01",
    claimId: "AC_01",
    truthPercentage: 75,
    verdict: "MOSTLY-TRUE",
    confidence: 80,
    reasoning: "Supported by evidence.",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    boundaryFindings: [],
    challengeResponses: [],
  } as any;

  const baseArgs = {
    claims: [claim],
    evidenceItems: [],
    boundaries: [],
    coverageMatrix: {} as any,
    warnings: [] as any[],
    pipelineConfig: { llmProvider: "anthropic" } as any,
    sources: [],
  };

  beforeEach(() => {
    (globalThis as any).__fhProviderHealthState = undefined;
  });

  it("runs Stage 4 normally when the probe succeeds", async () => {
    const probeFn = vi.fn(async () => ({
      reachable: true,
      statusCode: 200,
      durationMs: 12,
    }));
    const generateVerdictsFn = vi.fn(async () => [verdict]);
    const onEvent = vi.fn();

    const result = await runVerdictStageWithPreflight({
      ...baseArgs,
      onEvent,
      probeFn,
      generateVerdictsFn,
    });

    expect(result).toEqual([verdict]);
    expect(probeFn).toHaveBeenCalledWith({ provider: "anthropic" });
    expect(generateVerdictsFn).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith("Generating verdicts...", 70);
  });

  it("skips Stage 4 and throws when the preflight probe fails", async () => {
    const probeFn = vi.fn(async () => ({
      reachable: false,
      error: "getaddrinfo ENOTFOUND api.anthropic.com",
      durationMs: 48,
    }));
    const generateVerdictsFn = vi.fn(async () => [verdict]);

    await expect(
      runVerdictStageWithPreflight({
        ...baseArgs,
        probeFn,
        generateVerdictsFn,
      }),
    ).rejects.toThrow(
      "Stage 4 aborted before verdict generation: anthropic connectivity probe failed",
    );

    expect(generateVerdictsFn).not.toHaveBeenCalled();
  });

  it("fails cleanly instead of fabricating analysis_generation_failed fallback warnings", async () => {
    const warnings: any[] = [];
    const probeFn = vi.fn(async () => ({
      reachable: false,
      error: "connect ECONNREFUSED 104.18.7.46:443",
      durationMs: 25,
    }));

    await expect(
      runVerdictStageWithPreflight({
        ...baseArgs,
        warnings,
        probeFn,
      }),
    ).rejects.toThrow("Stage 4 aborted before verdict generation");

    expect(warnings).toEqual([]);
  });

  it("records repeated network probe failures to the LLM circuit breaker", async () => {
    const probeFn = vi.fn(async () => ({
      reachable: false,
      error: "getaddrinfo ENOTFOUND api.anthropic.com",
      durationMs: 20,
    }));

    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(
        runVerdictStageWithPreflight({
          ...baseArgs,
          probeFn,
        }),
      ).rejects.toThrow("Stage 4 aborted before verdict generation");
    }

    const health = getHealthState();
    expect(health.providers.llm.consecutiveFailures).toBe(3);
    expect(isSystemPaused()).toBe(true);
    expect(health.pauseReason).toContain("LLM connectivity preflight failed before Stage 4 verdict");
  });
});
