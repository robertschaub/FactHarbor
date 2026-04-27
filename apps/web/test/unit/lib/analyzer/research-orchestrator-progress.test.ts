import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtomicClaim, CBResearchState, EvidenceItem, FetchedSource } from "@/lib/analyzer/types";

const mockGenerateResearchQueries = vi.fn();
const mockSearchWebWithProvider = vi.fn();
const mockClassifyRelevance = vi.fn();
const mockFetchSources = vi.fn();
const mockExtractResearchEvidence = vi.fn();
const mockApplyPerSourceCap = vi.fn();
const mockFilterByProbativeValue = vi.fn();

vi.mock("@/lib/analyzer/research-query-stage", () => ({
  generateResearchQueries: (...args: unknown[]) => mockGenerateResearchQueries(...args),
}));

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: (...args: unknown[]) => mockSearchWebWithProvider(...args),
}));

vi.mock("@/lib/analyzer/research-acquisition-stage", () => ({
  fetchSources: (...args: unknown[]) => mockFetchSources(...args),
  reconcileEvidenceSourceIds: vi.fn(),
}));

vi.mock("@/lib/analyzer/research-extraction-stage", () => ({
  classifyRelevance: (...args: unknown[]) => mockClassifyRelevance(...args),
  extractResearchEvidence: (...args: unknown[]) => mockExtractResearchEvidence(...args),
  assessEvidenceApplicability: vi.fn(),
  assessScopeQuality: vi.fn(() => "complete"),
  assessEvidenceBalance: vi.fn(),
  applyPerSourceCap: (...args: unknown[]) => mockApplyPerSourceCap(...args),
}));

vi.mock("@/lib/analyzer/evidence-filter", () => ({
  filterByProbativeValue: (...args: unknown[]) => mockFilterByProbativeValue(...args),
}));

vi.mock("@/lib/analyzer/jurisdiction-context", () => ({
  getClaimRelevantGeographies: vi.fn(() => []),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: { id: "mock-model" },
    modelName: "mock-model",
    provider: "anthropic",
  })),
  extractStructuredOutput: vi.fn(),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn(() => ({})),
  },
}));

import { runResearchIteration } from "@/lib/analyzer/research-orchestrator";

function createResearchState(onEvent: CBResearchState["onEvent"]): CBResearchState {
  return {
    originalInput: "test",
    inputType: "text",
    languageIntent: null,
    understanding: {
      atomicClaims: [
        {
          id: "AC_01",
          statement: "Entity A reported metric B.",
          freshnessRequirement: "current_snapshot",
        },
      ],
      distinctEvents: [],
    } as any,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    claimAcquisitionLedger: {},
    queryBudgetUsageByClaim: {},
    mainIterationsUsed: 0,
    contradictionIterationsReserved: 0,
    contradictionIterationsUsed: 0,
    contradictionSourcesFound: 0,
    claimBoundaries: [],
    llmCalls: 0,
    warnings: [],
    onEvent,
  };
}

describe("runResearchIteration progress events", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateResearchQueries.mockResolvedValue([
      {
        query: "official source metric b",
        freshnessWindow: "none",
        retrievalLane: "primary_direct",
      },
    ]);
    mockSearchWebWithProvider.mockResolvedValue({
      results: [
        {
          url: "https://example.test/source",
          title: "Source",
          snippet: "Metric B",
        },
      ],
      providersUsed: ["TestProvider"],
      errors: [],
    });
    mockClassifyRelevance.mockResolvedValue([
      {
        url: "https://example.test/source",
        title: "Source",
        snippet: "Metric B",
        relevanceScore: 0.92,
        originalRank: 1,
      },
    ]);
    mockFetchSources.mockResolvedValue([
      {
        id: "SRC_01",
        url: "https://example.test/source",
        title: "Source",
        trackRecordScore: null,
        fullText: "Metric B is reported.",
        fetchedAt: "2026-04-27T00:00:00.000Z",
        category: "official",
        fetchSuccess: true,
        searchQuery: "official source metric b",
        relevanceScore: 0.92,
      } satisfies FetchedSource,
    ]);
    const evidence = [
      {
        id: "EV_01",
        statement: "Metric B is reported.",
        category: "statistic",
        specificity: "high",
        sourceId: "SRC_01",
        sourceUrl: "https://example.test/source",
        sourceTitle: "Source",
        sourceExcerpt: "Metric B is reported.",
        claimDirection: "supports",
        relevantClaimIds: ["AC_01"],
        probativeValue: "high",
      } satisfies EvidenceItem,
    ];
    mockExtractResearchEvidence.mockResolvedValue(evidence);
    mockFilterByProbativeValue.mockImplementation((items: EvidenceItem[]) => ({ kept: items }));
    mockApplyPerSourceCap.mockImplementation((items: EvidenceItem[]) => ({
      kept: items,
      capped: 0,
      evictedIds: [],
    }));
  });

  it("emits heartbeats before long research substeps without changing progress", async () => {
    const onEvent = vi.fn();
    const state = createResearchState(onEvent);
    const claim = state.understanding!.atomicClaims[0] as AtomicClaim;

    await runResearchIteration(
      claim,
      "main",
      {} as any,
      {
        contradictionReservedQueries: 0,
        maxEvidenceItemsPerSource: 5,
        perClaimQueryBudget: 4,
        primarySourceRefinementEnabled: false,
        relevanceFloor: 0.4,
      } as any,
      2,
      "2026-04-27",
      state,
    );

    expect(onEvent.mock.calls).toEqual(expect.arrayContaining([
      ["Generating main research queries for AC_01...", -1],
      ["Generated 1 main research query item(s) for AC_01.", -1],
      ["Searching main source candidates for AC_01...", -1],
      ["Classifying 1 search result(s) for AC_01...", -1],
      ["Fetching 1 relevant source(s) for AC_01...", -1],
      ["Extracting evidence from 1 fetched source(s) for AC_01...", -1],
      ["Admitted 1 evidence item(s) for AC_01.", -1],
    ]));
    expect(state.evidenceItems).toHaveLength(1);
  });
});
