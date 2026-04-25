import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateText = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((modelName: string) => ({ provider: "anthropic", modelName })),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((modelName: string) => ({ provider: "openai", modelName })),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getPromptCachingOptions: vi.fn(() => undefined),
}));

vi.mock("@/lib/source-reliability/sr-eval-prompts", () => ({
  getEvaluationPrompt: vi.fn(() => "evaluation prompt"),
  getRefinementPrompt: vi.fn(() => "refinement prompt"),
}));

import type { EvidencePack, SrEvalConfig } from "@/lib/source-reliability/sr-eval-types";
import { evaluateSourceWithPinnedEvidencePack } from "@/lib/source-reliability/sr-eval-engine";

function makeConfig(): SrEvalConfig {
  return {
    openaiModel: "gpt-5-mini",
    searchConfig: {} as SrEvalConfig["searchConfig"],
    evalUseSearch: false,
    evalMaxResultsPerQuery: 5,
    evalMaxEvidenceItems: 5,
    evalDateRestrict: null,
    rateLimitPerIp: 5,
    domainCooldownSec: 0,
    evidenceQualityAssessment: {
      enabled: false,
      model: "haiku",
      timeoutMs: 5_000,
      maxItemsPerAssessment: 5,
      minRemainingBudgetMs: 0,
    },
    requestStartedAtMs: Date.now(),
    requestBudgetMs: null,
    minPrimaryRemainingBudgetMs: 15000,
    minRefinementRemainingBudgetMs: 20000,
  };
}

function makeEvidencePack(itemIds: string[]): EvidencePack {
  return {
    enabled: true,
    providersUsed: ["test"],
    queries: ["test query"],
    items: itemIds.map((id) => ({
      id,
      url: `https://example.com/${id.toLowerCase()}`,
    })) as EvidencePack["items"],
  };
}

describe("evaluateSourceWithPinnedEvidencePack sparse insufficient-data fast path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips refinement when the primary result is insufficient_data with effectively ungrounded sparse evidence", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        domain: "example.com",
        sourceType: "unknown",
        score: null,
        confidence: 0.26,
        reasoning: "Not enough evidence to score reliably.",
        factualRating: "insufficient_data",
        evidenceCited: [],
        caveats: [],
      }),
    });

    const result = await evaluateSourceWithPinnedEvidencePack(
      "example.com",
      makeEvidencePack(["E1"]),
      true,
      0.8,
      makeConfig(),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.score).toBeNull();
    expect(result.data.modelSecondary).toBeNull();
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("still runs refinement when insufficient_data is backed by multiple grounded evidence references", async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          domain: "example.com",
          sourceType: "unknown",
          score: null,
          confidence: 0.41,
          reasoning: "Evidence remains mixed and insufficient.",
          factualRating: "insufficient_data",
          evidenceCited: [
            {
              claim: "Mixed evidence",
              basis: "See E1 and E2",
              evidenceId: "E1",
            },
          ],
          caveats: [],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          crossCheckFindings: "The evidence is still insufficient after review.",
          entityRefinement: {
            identifiedEntity: null,
            organizationType: "unknown",
            isWellKnown: false,
            notes: "No reliable entity resolution.",
          },
          scoreAdjustment: {
            originalScore: null,
            refinedScore: null,
            adjustmentReason: "The evidence remains too sparse for a score.",
          },
          refinedRating: "insufficient_data",
          refinedConfidence: 0.38,
          combinedReasoning: "Refinement confirms insufficient data.",
        }),
      });

    const result = await evaluateSourceWithPinnedEvidencePack(
      "example.com",
      makeEvidencePack(["E1", "E2"]),
      true,
      0.8,
      makeConfig(),
    );

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("still runs refinement for multi-item packs even when the primary pass cites nothing", async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: JSON.stringify({
          domain: "example.com",
          sourceType: "unknown",
          score: null,
          confidence: 0.33,
          reasoning: "Primary pass found no grounded basis.",
          factualRating: "insufficient_data",
          evidenceCited: [],
          caveats: [],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          crossCheckFindings: "Refinement reviewed the broader pack.",
          entityRefinement: {
            identifiedEntity: null,
            organizationType: "unknown",
            isWellKnown: false,
            notes: "No reliable entity resolution.",
          },
          scoreAdjustment: {
            originalScore: null,
            refinedScore: null,
            adjustmentReason: "Still insufficient after reviewing the richer pack.",
          },
          refinedRating: "insufficient_data",
          refinedConfidence: 0.35,
          combinedReasoning: "Refinement still found insufficient data.",
        }),
      });

    const result = await evaluateSourceWithPinnedEvidencePack(
      "example.com",
      makeEvidencePack(["E1", "E2"]),
      true,
      0.8,
      makeConfig(),
    );

    expect(result.success).toBe(true);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("skips primary evaluation when the per-domain budget is already exhausted", async () => {
    const config = makeConfig();
    config.requestStartedAtMs = Date.now() - 10_000;
    config.requestBudgetMs = 10_000;

    const result = await evaluateSourceWithPinnedEvidencePack(
      "example.com",
      makeEvidencePack(["E1", "E2"]),
      true,
      0.8,
      config,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.transient).toBe(true);
    expect(result.data.modelPrimary).toBe("budget_guard");
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("skips refinement when the remaining per-domain budget is below the refinement guard", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        domain: "example.com",
        sourceType: "unknown",
        score: 0.5,
        confidence: 0.6,
        reasoning: "Primary pass completed.",
        factualRating: "mixed",
        evidenceCited: [
          {
            claim: "Evidence exists",
            basis: "See E1",
            evidenceId: "E1",
          },
        ],
        caveats: [],
      }),
    });

    const config = makeConfig();
    config.requestStartedAtMs = Date.now();
    config.requestBudgetMs = 25_000;
    config.minRefinementRemainingBudgetMs = 30_000;

    const result = await evaluateSourceWithPinnedEvidencePack(
      "example.com",
      makeEvidencePack(["E1", "E2"]),
      true,
      0.8,
      config,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.modelSecondary).toBe("gpt-5-mini");
    expect(result.data.refinementApplied).toBe(false);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});
