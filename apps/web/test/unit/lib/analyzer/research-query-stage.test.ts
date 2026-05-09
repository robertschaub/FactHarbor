import { generateText, Output } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { extractStructuredOutput } from "@/lib/analyzer/llm";
import { loadAndRenderSection } from "@/lib/analyzer/prompt-loader";
import { generateResearchQueries } from "@/lib/analyzer/research-query-stage";
import type { AtomicClaim } from "@/lib/analyzer/types";
import type { PipelineConfig } from "@/lib/config-schemas";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((definition) => definition),
  },
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: "mock-model",
    modelName: "mock-model",
    provider: "mock-provider",
  })),
  getPromptCachingOptions: vi.fn(() => undefined),
  getStructuredOutputProviderOptions: vi.fn(() => undefined),
  extractStructuredOutput: vi.fn(),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: vi.fn(),
}));

const mockGenerateText = vi.mocked(generateText);
const mockExtractStructuredOutput = vi.mocked(extractStructuredOutput);
const mockLoadAndRenderSection = vi.mocked(loadAndRenderSection);

const mockPipelineConfig = {
  queryStrategyMode: "legacy",
  researchMaxQueriesPerIteration: 3,
} as PipelineConfig;

function createAtomicClaim(overrides: Partial<AtomicClaim> = {}): AtomicClaim {
  return {
    id: "AC_01",
    statement: "Entity A currently reports metric X",
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
    freshnessRequirement: "current_snapshot",
    expectedEvidenceProfile: {
      primaryMetric: "current metric X",
      expectedSourceTypes: ["government_report"],
      sourceNativeRoutes: ["official statistics archive"],
    },
    ...overrides,
  };
}

describe("generateResearchQueries freshness metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAndRenderSection.mockResolvedValue({
      content: "generate queries prompt",
      variables: {},
    });
    mockGenerateText.mockResolvedValue({ text: "", usage: {} } as any);
  });

  it("preserves explicit no-date-filter metadata for current source-native routes", async () => {
    mockExtractStructuredOutput.mockReturnValue({
      queries: [
        {
          query: "entity A official statistics archive",
          rationale: "latest complete source-native artifact",
          retrievalLane: "primary_direct",
          freshnessWindow: "none",
        },
      ],
    });

    const result = await generateResearchQueries(
      createAtomicClaim(),
      "main",
      [],
      mockPipelineConfig,
      "2026-05-09",
    );

    expect(result).toEqual([
      {
        query: "entity A official statistics archive",
        rationale: "latest complete source-native artifact",
        retrievalLane: "primary_direct",
        freshnessWindow: "none",
      },
    ]);
    expect(Output.object).toHaveBeenCalled();
  });

  it("still adds freshness metadata when current source-native metadata is omitted", async () => {
    mockExtractStructuredOutput.mockReturnValue({
      queries: [
        {
          query: "entity A current update",
          rationale: "current route",
        },
      ],
    });

    const result = await generateResearchQueries(
      createAtomicClaim(),
      "main",
      [],
      mockPipelineConfig,
      "2026-05-09",
    );

    expect(result).toEqual([
      {
        query: "entity A current update",
        rationale: "current route",
        retrievalLane: "navigational",
        freshnessWindow: "w",
      },
    ]);
  });
});
