import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSearchWebWithProvider = vi.fn();
const mockExtractTextFromUrl = vi.fn();
const mockClassifyRelevance = vi.fn();
const mockLoadAndRenderSection = vi.fn();
const mockGenerateText = vi.fn();
const mockExtractStructuredOutput = vi.fn();
const mockRecordLLMCall = vi.fn();

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: (...args: unknown[]) => mockSearchWebWithProvider(...args),
}));

vi.mock("@/lib/retrieval", () => ({
  extractTextFromUrl: (...args: unknown[]) => mockExtractTextFromUrl(...args),
}));

vi.mock("@/lib/analyzer/research-extraction-stage", () => ({
  classifyRelevance: (...args: unknown[]) => mockClassifyRelevance(...args),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: (...args: unknown[]) => mockLoadAndRenderSection(...args),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: (...args: unknown[]) => mockRecordLLMCall(...args),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: { id: "mock-model" },
    modelName: "mock-model",
    provider: "anthropic",
  })),
  extractStructuredOutput: (...args: unknown[]) => mockExtractStructuredOutput(...args),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  Output: {
    object: vi.fn(() => ({})),
  },
}));

import { runPreliminarySearch } from "@/lib/analyzer/claim-extraction-stage";

describe("runPreliminarySearch exact URL fetch reuse", () => {
  const mockSearchConfig = {} as any;
  const mockPipelineConfig = {
    preliminarySearchQueriesPerClaim: 2,
    preliminaryMaxSources: 3,
    sourceFetchTimeoutMs: 12345,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAndRenderSection.mockResolvedValue({
      content: "extract prompt",
      contentHash: "mock",
      loadedAt: new Date().toISOString(),
      warnings: [],
    });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractTextFromUrl.mockResolvedValue({
      text: "A".repeat(200),
      title: "Fetched title",
      contentType: "text/html",
    });
    mockClassifyRelevance.mockResolvedValue([
      {
        url: "https://example.com/shared",
        originalRank: 1,
        relevanceScore: 0.92,
        jurisdictionMatch: "direct",
        reasoning: "direct match",
      },
    ]);
  });

  it("fetches a shared URL only once when duplicate search queries return it for the same claim", async () => {
    mockSearchWebWithProvider.mockResolvedValue({
      results: [
        { url: "https://example.com/shared", title: "Shared source", snippet: "snippet" },
      ],
      providersUsed: ["google"],
      errors: [],
    });
    mockExtractStructuredOutput.mockReturnValue({
      evidenceItems: [
        {
          statement: "Evidence found in source",
          evidenceScope: { methodology: "analysis", temporal: "2026" },
          relevantClaimIds: ["AC_01"],
        },
      ],
    });

    const state = { searchQueries: [], llmCalls: 0, sources: [], warnings: [] } as any;
    const result = await runPreliminarySearch(
      [{ statement: "Test claim", searchHint: "duplicate result" }],
      mockSearchConfig,
      mockPipelineConfig,
      "2026-04-24",
      state,
    );

    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(mockClassifyRelevance).toHaveBeenCalledTimes(2);
    expect(mockExtractTextFromUrl).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(state.sources).toHaveLength(1);
    expect(state.searchQueries).toHaveLength(2);
    expect(state.llmCalls).toBe(3);
  });

  it("reuses the fetch across claims while still extracting evidence separately per claim", async () => {
    mockSearchWebWithProvider.mockResolvedValue({
      results: [
        { url: "https://example.com/shared", title: "Shared source", snippet: "snippet" },
      ],
      providersUsed: ["google"],
      errors: [],
    });
    mockExtractStructuredOutput.mockImplementation(() => ({
      evidenceItems: [
        {
          statement: "Evidence found in source",
          evidenceScope: { methodology: "analysis", temporal: "2026" },
          relevantClaimIds: ["AC_01"],
        },
      ],
    }));

    const state = { searchQueries: [], llmCalls: 0, sources: [], warnings: [] } as any;
    const result = await runPreliminarySearch(
      [
        { statement: "Claim 1", searchHint: "claim one" },
        { statement: "Claim 2", searchHint: "claim two" },
      ],
      mockSearchConfig,
      { ...mockPipelineConfig, preliminarySearchQueriesPerClaim: 1 },
      "2026-04-24",
      state,
    );

    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(mockClassifyRelevance).toHaveBeenCalledTimes(2);
    expect(mockExtractTextFromUrl).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(state.sources).toHaveLength(1);
    expect(state.llmCalls).toBe(4);
  });

  it("retries a later duplicate after an earlier shared fetch fails", async () => {
    const sharedResults = {
      results: [
        { url: "https://example.com/shared", title: "Shared source", snippet: "snippet" },
      ],
      providersUsed: ["google"],
      errors: [],
    };

    mockSearchWebWithProvider
      .mockResolvedValueOnce(sharedResults)
      .mockImplementationOnce(
        async () =>
          await new Promise((resolve) => {
            setTimeout(() => resolve(sharedResults), 10);
          }),
      );
    mockExtractTextFromUrl
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        text: "B".repeat(200),
        title: "Recovered title",
        contentType: "text/html",
      });
    mockExtractStructuredOutput.mockReturnValue({
      evidenceItems: [
        {
          statement: "Recovered evidence",
          evidenceScope: { methodology: "analysis", temporal: "2026" },
          relevantClaimIds: ["AC_01"],
        },
      ],
    });

    const state = { searchQueries: [], llmCalls: 0, sources: [], warnings: [] } as any;
    const result = await runPreliminarySearch(
      [{ statement: "Retry claim", searchHint: "duplicate result" }],
      mockSearchConfig,
      mockPipelineConfig,
      "2026-04-24",
      state,
    );

    expect(mockExtractTextFromUrl).toHaveBeenCalledTimes(2);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].statement).toBe("Recovered evidence");
    expect(state.sources).toHaveLength(1);
    expect(state.llmCalls).toBe(3);
  });

  it("retries a later duplicate after an earlier shared fetch returns underlength content", async () => {
    const sharedResults = {
      results: [
        { url: "https://example.com/shared", title: "Shared source", snippet: "snippet" },
      ],
      providersUsed: ["google"],
      errors: [],
    };

    mockSearchWebWithProvider
      .mockResolvedValueOnce(sharedResults)
      .mockImplementationOnce(
        async () =>
          await new Promise((resolve) => {
            setTimeout(() => resolve(sharedResults), 10);
          }),
      );
    mockExtractTextFromUrl
      .mockResolvedValueOnce({
        text: "short",
        title: "Short title",
        contentType: "text/html",
      })
      .mockResolvedValueOnce({
        text: "C".repeat(200),
        title: "Recovered title",
        contentType: "text/html",
      });
    mockExtractStructuredOutput.mockReturnValue({
      evidenceItems: [
        {
          statement: "Recovered after short body",
          evidenceScope: { methodology: "analysis", temporal: "2026" },
          relevantClaimIds: ["AC_01"],
        },
      ],
    });

    const state = { searchQueries: [], llmCalls: 0, sources: [], warnings: [] } as any;
    const result = await runPreliminarySearch(
      [{ statement: "Retry short-body claim", searchHint: "duplicate result" }],
      mockSearchConfig,
      mockPipelineConfig,
      "2026-04-24",
      state,
    );

    expect(mockExtractTextFromUrl).toHaveBeenCalledTimes(2);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].statement).toBe("Recovered after short body");
    expect(state.sources).toHaveLength(1);
    expect(state.llmCalls).toBe(3);
  });
});
