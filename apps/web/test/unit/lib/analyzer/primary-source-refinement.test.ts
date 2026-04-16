import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateResearchQueries = vi.fn();
const mockSearchWebWithProvider = vi.fn();
const mockFetchSources = vi.fn();
const mockClassifyRelevance = vi.fn();
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
  reconcileEvidenceSourceIds: vi.fn(() => 0),
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

vi.mock("@/lib/analyzer/claim-extraction-stage", () => ({
  upsertSearchProviderWarning: vi.fn(),
}));

vi.mock("@/lib/search-circuit-breaker", () => ({
  recordFailure: vi.fn(),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: vi.fn(),
  getTrackRecordData: vi.fn(() => null),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(),
  extractStructuredOutput: vi.fn(),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => ({})) },
}));

vi.mock("@/lib/analyzer/debug", () => ({
  debugLog: vi.fn(),
}));

import { runResearchIteration } from "@/lib/analyzer/research-orchestrator";
import type { CBResearchState } from "@/lib/analyzer/types";

function makeState(overrides: Partial<CBResearchState> = {}): CBResearchState {
  return {
    originalInput: "test",
    inputType: "text",
    languageIntent: {
      inputLanguage: "de",
      reportLanguage: "de",
      retrievalLanguages: [{ language: "de", lane: "primary", reason: "detected" }],
      sourceLanguagePolicy: "preserve_original",
    },
    understanding: {
      detectedLanguage: "de",
      inferredGeography: "CH",
      atomicClaims: [],
      distinctEvents: [],
      preliminaryEvidence: [],
      gate1Stats: { totalClaims: 1, passedOpinion: 1, passedSpecificity: 1, filteredCount: 0, overallPass: true },
      impliedClaim: "test",
      backgroundDetails: "",
      articleThesis: "test",
      riskTier: "B",
    } as any,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    claimAcquisitionLedger: {},
    queryBudgetUsageByClaim: {},
    researchedIterationsByClaim: {},
    mainIterationsUsed: 0,
    contradictionIterationsReserved: 1,
    contradictionIterationsUsed: 0,
    contradictionSourcesFound: 0,
    claimBoundaries: [],
    llmCalls: 0,
    warnings: [],
    ...overrides,
  } as any;
}

describe("primary-source refinement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGenerateResearchQueries.mockImplementation((_claim: unknown, iterationType: string) => {
      if (iterationType === "refinement") {
        return Promise.resolve([
          {
            query: "official total current site:example",
            rationale: "refinement",
            retrievalLane: "primary_direct",
            freshnessWindow: "w",
          },
        ]);
      }

      return Promise.resolve([
        {
          query: "broad secondary query",
          rationale: "main",
          retrievalLane: "secondary_context",
          freshnessWindow: "none",
        },
      ]);
    });

    mockSearchWebWithProvider
      .mockResolvedValueOnce({
        results: [{ url: "https://example.com/secondary", title: "Secondary", snippet: "secondary" }],
        providersUsed: ["mock"],
        errors: [],
      })
      .mockResolvedValueOnce({
        results: [{ url: "https://example.com/official", title: "Official", snippet: "official" }],
        providersUsed: ["mock"],
        errors: [],
      });

    mockClassifyRelevance.mockResolvedValue([
      { url: "https://example.com/secondary", relevanceScore: 0.9, originalRank: 0 },
    ]);
    mockFetchSources.mockImplementation((sources: Array<{ url: string }>) => Promise.resolve([
      { url: sources[0].url, title: sources[0].url.includes("official") ? "Official" : "Secondary", text: "body" },
    ]));
    mockExtractResearchEvidence.mockImplementation((_claim: unknown, sources: Array<{ url: string }>) => {
      const source = sources[0];
      const sourceType = source.url.includes("official") ? "government_report" : "news_secondary";
      return Promise.resolve([
        {
          id: `EV_${sourceType}`,
          statement: sourceType,
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: source.url,
          sourceTitle: source.title,
          sourceExcerpt: sourceType,
          claimDirection: "supports",
          probativeValue: sourceType === "government_report" ? "high" : "medium",
          sourceType,
          relevantClaimIds: ["AC_01"],
        },
      ]);
    });
    mockFilterByProbativeValue.mockImplementation((items: unknown[]) => ({ kept: items }));
    mockApplyPerSourceCap.mockImplementation((items: unknown[]) => ({ kept: items, capped: 0, evictedIds: [] }));
  });

  it("runs a one-time refinement pass when only seeded primary-like evidence exists", async () => {
    mockClassifyRelevance
      .mockResolvedValueOnce([
        { url: "https://example.com/secondary", relevanceScore: 0.9, originalRank: 0 },
      ])
      .mockResolvedValueOnce([
        { url: "https://example.com/official", relevanceScore: 0.9, originalRank: 0 },
      ]);

    const claim = {
      id: "AC_01",
      statement: "current total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: ["current total"],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_seeded",
          statement: "seeded official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/seeded",
          sourceTitle: "Seeded",
          sourceExcerpt: "seeded",
          claimDirection: "supports",
          probativeValue: "medium",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: true,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockGenerateResearchQueries.mock.calls[1][1]).toBe("refinement");
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(mockSearchWebWithProvider.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: "official total current site:example",
        dateRestrict: "w",
        cacheTtlDaysOverride: 1,
      }),
    );
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
    expect(state.claimAcquisitionLedger.AC_01.iterations).toHaveLength(2);
    expect(state.claimAcquisitionLedger.AC_01.iterations[0].iterationType).toBe("main");
    expect(state.claimAcquisitionLedger.AC_01.iterations[0].rawEvidenceItems).toBe(1);
    expect(state.claimAcquisitionLedger.AC_01.iterations[1].iterationType).toBe("refinement");
    expect(state.claimAcquisitionLedger.AC_01.iterations[1].rawEvidenceItems).toBe(1);
    expect(state.claimAcquisitionLedger.AC_01.iterations[1].laneReason).toBe(
      "primary_source_refinement:recovered_non_seeded_primary_coverage",
    );
  });

  it("triggers refinement when primary source types are expected even without expected metrics", async () => {
    const claim = {
      id: "AC_01",
      statement: "current official total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: [],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_seeded",
          statement: "seeded official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/seeded",
          sourceTitle: "Seeded",
          sourceExcerpt: "seeded",
          claimDirection: "supports",
          probativeValue: "medium",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: true,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockGenerateResearchQueries.mock.calls[1][1]).toBe("refinement");
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
  });

  it("does not run refinement when non-seeded primary coverage already exists", async () => {
    const claim = {
      id: "AC_01",
      statement: "current total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: ["current total"],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_existing",
          statement: "existing official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/existing",
          sourceTitle: "Existing",
          sourceExcerpt: "existing",
          claimDirection: "supports",
          probativeValue: "high",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: false,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(1);
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(1);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main"]);
  });

  it("still triggers refinement when descriptive source labels mask incomplete quantitative primary coverage", async () => {
    const claim = {
      id: "AC_01",
      statement: "More than 235000 people are currently in the asylum system",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: [
          "total recognized refugees",
          "total provisionally admitted persons",
          "total persons with temporary protection",
          "sum of all persons in the asylum system",
        ],
        expectedSourceTypes: ["official national migration statistics"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_existing",
          statement: "In 2024, 27740 asylum applications were filed.",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/existing-official",
          sourceTitle: "Existing official",
          sourceExcerpt: "existing",
          claimDirection: "contextual",
          probativeValue: "high",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: false,
          evidenceScope: {
            methodology: "official migration statistics",
            temporal: "2024",
          },
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockGenerateResearchQueries.mock.calls[1][1]).toBe("refinement");
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
  });

  it("still triggers refinement when only two of several quantitative primary metrics are covered", async () => {
    const claim = {
      id: "AC_01",
      statement: "More than 235000 people are currently in the asylum system",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: [
          "total persons in the asylum system",
          "total asylum applicants",
          "total recognized refugees",
          "total provisionally admitted persons",
          "total persons with temporary protection",
        ],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_existing_1",
          statement: "In 2024, 27740 asylum applications were filed.",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/official-applications",
          sourceTitle: "Official applications",
          sourceExcerpt: "applications",
          claimDirection: "contextual",
          probativeValue: "high",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: false,
          evidenceScope: {
            methodology: "official migration statistics",
            temporal: "2024",
          },
        },
        {
          id: "EV_existing_2",
          statement: "At the end of 2025, temporary protection status covered 71762 people.",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/official-protection",
          sourceTitle: "Official protection",
          sourceExcerpt: "protection",
          claimDirection: "contextual",
          probativeValue: "high",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: false,
          evidenceScope: {
            methodology: "official migration statistics",
            temporal: "2025",
          },
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockGenerateResearchQueries.mock.calls[1][1]).toBe("refinement");
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
  });

  it("still triggers refinement when three expected primary metrics only have two covered", async () => {
    const claim = {
      id: "AC_01",
      statement: "More than 235000 people are currently in the asylum system",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: [
          "current total persons in the asylum system",
          "status breakdown by asylum category",
          "distribution by canton",
        ],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_existing_1",
          statement: "The official statistics document the current stock in the asylum system.",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/official-stock",
          sourceTitle: "Official stock",
          sourceExcerpt: "stock",
          claimDirection: "contextual",
          probativeValue: "high",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: false,
          evidenceScope: {
            methodology: "official migration statistics",
            temporal: "2024",
          },
        },
        {
          id: "EV_existing_2",
          statement: "The official statistics provide a status breakdown by asylum category at year end 2024.",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/official-status-breakdown",
          sourceTitle: "Official status breakdown",
          sourceExcerpt: "status breakdown",
          claimDirection: "contextual",
          probativeValue: "high",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: false,
          evidenceScope: {
            methodology: "official migration statistics",
            temporal: "2024",
          },
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockGenerateResearchQueries.mock.calls[1][1]).toBe("refinement");
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
  });

  it("does not repeat refinement when the claim already had a prior main iteration", async () => {
    const claim = {
      id: "AC_01",
      statement: "current total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: ["current total"],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      researchedIterationsByClaim: { AC_01: 1 },
      evidenceItems: [
        {
          id: "EV_seeded",
          statement: "seeded official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/seeded",
          sourceTitle: "Seeded",
          sourceExcerpt: "seeded",
          claimDirection: "supports",
          probativeValue: "medium",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: true,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(1);
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(1);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main"]);
  });

  it("still triggers refinement when main queries lack explicit metadata", async () => {
    mockGenerateResearchQueries.mockImplementation((_claim: unknown, iterationType: string) => {
      if (iterationType === "refinement") {
        return Promise.resolve([
          {
            query: "refinement should not run",
            rationale: "refinement",
            retrievalLane: "primary_direct",
            freshnessWindow: "w",
          },
        ]);
      }

      return Promise.resolve([
        {
          query: "metadata omitted main query",
          rationale: "main",
        },
      ]);
    });

    const claim = {
      id: "AC_01",
      statement: "current total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: ["current total"],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_seeded",
          statement: "seeded official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/seeded",
          sourceTitle: "Seeded",
          sourceExcerpt: "seeded",
          claimDirection: "supports",
          probativeValue: "medium",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: true,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockGenerateResearchQueries.mock.calls[1][1]).toBe("refinement");
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
  });

  it("does not trigger refinement when the remaining refinement budget is zero", async () => {
    const claim = {
      id: "AC_01",
      statement: "current total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: ["current total"],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_seeded",
          statement: "seeded official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/seeded",
          sourceTitle: "Seeded",
          sourceExcerpt: "seeded",
          claimDirection: "supports",
          probativeValue: "medium",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: true,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 1,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(1);
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(1);
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main"]);
  });

  it("still executes refinement when all refinement queries are secondary_context", async () => {
    mockGenerateResearchQueries.mockImplementation((_claim: unknown, iterationType: string) => {
      if (iterationType === "refinement") {
        return Promise.resolve([
          {
            query: "broad refinement fallback",
            rationale: "refinement fallback",
            retrievalLane: "secondary_context",
            freshnessWindow: "none",
          },
        ]);
      }

      return Promise.resolve([
        {
          query: "broad secondary query",
          rationale: "main",
          retrievalLane: "secondary_context",
          freshnessWindow: "none",
        },
      ]);
    });

    const claim = {
      id: "AC_01",
      statement: "current total claim",
      expectedEvidenceProfile: {
        methodologies: [],
        expectedMetrics: ["current total"],
        expectedSourceTypes: ["government_report"],
      },
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState({
      evidenceItems: [
        {
          id: "EV_seeded",
          statement: "seeded official",
          category: "statistic",
          specificity: "medium",
          sourceId: "",
          sourceUrl: "https://example.com/seeded",
          sourceTitle: "Seeded",
          sourceExcerpt: "seeded",
          claimDirection: "supports",
          probativeValue: "medium",
          sourceType: "government_report",
          relevantClaimIds: ["AC_01"],
          isSeeded: true,
        },
      ],
    });

    await runResearchIteration(
      claim,
      "main",
      { maxSourcesPerIteration: 5 } as any,
      {
        perClaimQueryBudget: 4,
        relevanceTopNFetch: 5,
        maxEvidenceItemsPerSource: 5,
        primarySourceRefinementEnabled: true,
        primarySourceRefinementMaxQueries: 1,
        freshQueryCacheTtlDays: 1,
      } as any,
      5,
      "2026-04-15",
      state,
    );

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(2);
    expect(mockSearchWebWithProvider).toHaveBeenCalledTimes(2);
    expect(mockSearchWebWithProvider.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: "broad refinement fallback",
      }),
    );
    expect(state.searchQueries.map((query) => query.focus)).toEqual(["main", "refinement"]);
  });
});
