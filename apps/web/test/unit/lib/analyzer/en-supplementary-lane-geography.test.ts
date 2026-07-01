/**
 * Focused test: EN supplementary lane passes claim-relevant geographies
 * to classifyRelevance (Fix 1 — geography omission bug).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCKS — must be declared before imports
// ============================================================================

const mockClassifyRelevance = vi.fn().mockResolvedValue([]);
const mockExtractResearchEvidence = vi.fn().mockResolvedValue([]);
const mockSearchWebWithProvider = vi.fn().mockResolvedValue({
  results: [{ url: "https://en.example.com/1", title: "EN Result", snippet: "s" }],
  providersUsed: ["mock"],
  errors: [],
});

vi.mock("@/lib/analyzer/research-extraction-stage", () => ({
  classifyRelevance: (...args: unknown[]) => mockClassifyRelevance(...args),
  extractResearchEvidence: (...args: unknown[]) => mockExtractResearchEvidence(...args),
  assessEvidenceApplicability: vi.fn().mockResolvedValue([]),
  assessScopeQuality: vi.fn(() => "complete"),
  assessEvidenceBalance: vi.fn(() => ({ supporting: 0, contradicting: 0, neutral: 0, total: 0, balanceRatio: NaN, isSkewed: false })),
  applyPerSourceCap: vi.fn((_new: unknown[], _existing: unknown[]) => ({ kept: [], capped: 0, evictedIds: [] })),
}));

vi.mock("@/lib/analyzer/research-query-stage", () => ({
  generateResearchQueries: vi.fn().mockResolvedValue([{ query: "test EN query", focus: "main" }]),
}));

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: (...args: unknown[]) => mockSearchWebWithProvider(...args),
}));

vi.mock("@/lib/analyzer/research-acquisition-stage", () => ({
  fetchSources: vi.fn().mockResolvedValue([]),
  reconcileEvidenceSourceIds: vi.fn(() => 0),
}));

vi.mock("@/lib/analyzer/evidence-filter", () => ({
  filterByProbativeValue: vi.fn((items: unknown[]) => ({ kept: items, filtered: 0 })),
}));

vi.mock("@/lib/analyzer/pipeline-utils", () => ({
  checkAbortSignal: vi.fn(),
  extractDomain: vi.fn((url: string) => url),
  mapSourceType: vi.fn((s: string) => s),
  classifySourceFetchFailure: vi.fn(),
  debugLog: vi.fn(),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(async () => ({ config: {}, contentHash: "test" })),
  loadSearchConfig: vi.fn(async () => ({ config: {}, contentHash: "test" })),
  loadCalcConfig: vi.fn(async () => ({ config: {}, contentHash: "test" })),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({ model: { id: "mock" }, modelName: "mock", provider: "anthropic" })),
  extractStructuredOutput: vi.fn((r: unknown) => r),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => undefined),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(async () => ({ content: "mock", contentHash: "abc", loadedAt: new Date().toISOString(), warnings: [] })),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: vi.fn(),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: vi.fn(),
  getTrackRecordData: vi.fn(() => null),
}));

vi.mock("@/lib/search-circuit-breaker", () => ({
  recordFailure: vi.fn(),
}));

vi.mock("@/lib/analyzer/claim-extraction-stage", () => ({
  upsertSearchProviderWarning: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => ({})) },
}));

vi.mock("@/lib/analyzer/debug", () => ({
  debugLog: vi.fn(),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import {
  maybeRunSupplementaryEnglishLane,
  maybeRunSourceNativeSupplementaryLane,
} from "@/lib/analyzer/research-orchestrator";
import type { CBResearchState } from "@/lib/analyzer/types";

// ============================================================================
// HELPERS
// ============================================================================

function makeState(overrides: Partial<CBResearchState> = {}): CBResearchState {
  return {
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    mainIterationsUsed: 0,
    contradictionIterationsUsed: 0,
    contrarian: { enabled: false, queriesUsed: 0, maxQueries: 0 },
    llmCalls: 0,
    understanding: {
      detectedLanguage: "fr",
      inferredGeography: "FR",
      distinctEvents: [],
    },
    languageIntent: {
      inputLanguage: "fr",
      retrievalLanguages: [{ language: "fr", lane: "primary", reason: "detected" }],
    },
    warnings: [],
    claimQueryBudgets: new Map(),
    ...overrides,
  } as any;
}

function makeSearchConfig(overrides: Record<string, unknown> = {}) {
  return {
    supplementaryEnglishLane: {
      enabled: true,
      applyInIterationTypes: ["main"],
      minPrimaryEvidenceItems: 2,
      maxAdditionalQueriesPerClaim: 1,
    },
    maxSourcesPerIteration: 5,
    ...overrides,
  } as any;
}

function makePipelineConfig(overrides: Record<string, unknown> = {}) {
  return {
    maxQueriesPerClaim: 10,
    ...overrides,
  } as any;
}

// ============================================================================
// TESTS
// ============================================================================

describe("EN supplementary lane — geography argument (Fix 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes claim-relevant geographies to classifyRelevance", async () => {
    const claim = {
      id: "AC_01",
      statement: "La Suisse a voté contre l'initiative",
      relevantGeographies: ["CH"],
    } as any;

    const state = makeState();
    const searchConfig = makeSearchConfig();
    const pipelineConfig = makePipelineConfig();

    await maybeRunSupplementaryEnglishLane(
      claim, "main", searchConfig, pipelineConfig, "2026-04-05",
      state, 1, 0, // low primary counts trigger the lane
    );

    // classifyRelevance should have been called (EN lane fired)
    expect(mockClassifyRelevance).toHaveBeenCalledTimes(1);

    // Verify the 6th argument (relevantGeographies) is present and correct
    const callArgs = mockClassifyRelevance.mock.calls[0];
    expect(callArgs).toHaveLength(6);
    expect(callArgs[5]).toEqual(["CH"]);
  });

  it("uses inferredGeography as fallback when claim has no relevantGeographies", async () => {
    const claim = {
      id: "AC_01",
      statement: "Test claim without explicit geographies",
      // no relevantGeographies
    } as any;

    const state = makeState({
      understanding: {
        detectedLanguage: "de",
        inferredGeography: "DE",
        distinctEvents: [],
      } as any,
    });
    const searchConfig = makeSearchConfig();
    const pipelineConfig = makePipelineConfig();

    await maybeRunSupplementaryEnglishLane(
      claim, "main", searchConfig, pipelineConfig, "2026-04-05",
      state, 1, 0,
    );

    expect(mockClassifyRelevance).toHaveBeenCalledTimes(1);

    const callArgs = mockClassifyRelevance.mock.calls[0];
    expect(callArgs).toHaveLength(6);
    // Falls back to inferredGeography "DE"
    expect(callArgs[5]).toEqual(["DE"]);
  });
});

describe("source-native supplementary lane scaffold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts source_native as a typed retrieval lane", () => {
    const query: import("@/lib/analyzer/types").SearchQuery = {
      query: "source native query",
      iteration: 1,
      focus: "main",
      resultsCount: 0,
      timestamp: new Date().toISOString(),
      language: "pt",
      languageLane: "source_native",
      laneReason: "source_native:planner_unavailable",
    };

    const iteration: import("@/lib/analyzer/types").ClaimAcquisitionIterationEntry = {
      iteration: 1,
      iterationType: "main",
      languageLane: "source_native",
      generatedQueries: [],
      searchResults: 0,
      relevanceAccepted: 0,
      sourcesFetched: 0,
      rawEvidenceItems: 0,
      admittedEvidenceItems: 0,
      directionCounts: { supports: 0, contradicts: 0, neutral: 0 },
      losses: {
        relevanceRejected: 0,
        fetchRejected: 0,
        sourcesWithoutEvidence: 0,
        probativeFilteredOut: 0,
        perSourceCapDroppedNew: 0,
        perSourceCapEvictedExisting: 0,
      },
      laneReason: "source_native:planner_unavailable",
    };

    expect(query.languageLane).toBe("source_native");
    expect(iteration.languageLane).toBe("source_native");
  });

  it("does nothing while source-native lane is disabled by default", async () => {
    const claim = {
      id: "AC_01",
      statement: "A claim needing more evidence",
      relevantGeographies: ["BR"],
    } as any;
    const state = makeState();

    await maybeRunSourceNativeSupplementaryLane(
      claim,
      "main",
      { maxSourcesPerIteration: 5, sourceNativeSupplementaryLane: { enabled: false } } as any,
      makePipelineConfig(),
      "2026-04-05",
      state,
      0,
      0,
    );

    expect(mockSearchWebWithProvider).not.toHaveBeenCalled();
    expect(state.searchQueries).toHaveLength(0);
    expect(state.claimAcquisitionLedger?.AC_01?.iterations ?? []).toHaveLength(0);
  });

  it("records an explicit no-op telemetry entry when enabled before planner exists", async () => {
    const claim = {
      id: "AC_01",
      statement: "A claim needing source-native evidence",
      relevantGeographies: ["BR"],
    } as any;
    const state = makeState();
    const llmCallsBefore = state.llmCalls;
    const queryBudgetBefore = JSON.stringify(state.queryBudgetUsageByClaim ?? {});

    await maybeRunSourceNativeSupplementaryLane(
      claim,
      "main",
      {
        maxSourcesPerIteration: 5,
        sourceNativeSupplementaryLane: {
          enabled: true,
          applyInIterationTypes: ["main"],
          minPrimaryEvidenceItems: 2,
          maxAdditionalQueriesPerClaim: 1,
        },
      } as any,
      makePipelineConfig(),
      "2026-04-05",
      state,
      1,
      0,
    );

    expect(mockSearchWebWithProvider).not.toHaveBeenCalled();
    expect(state.searchQueries).toHaveLength(0);
    expect(state.llmCalls).toBe(llmCallsBefore);
    expect(JSON.stringify(state.queryBudgetUsageByClaim ?? {})).toBe(queryBudgetBefore);
    const iterations = state.claimAcquisitionLedger.AC_01.iterations;
    expect(iterations).toHaveLength(1);
    expect(iterations[0]).toEqual(
      expect.objectContaining({
        languageLane: "source_native",
        generatedQueries: [],
        searchResults: 0,
        admittedEvidenceItems: 0,
      }),
    );
    expect(iterations[0].laneReason).toContain("source_native:planner_unavailable");
  });

  it("round-trips source_native and legacy missing languageLane through report JSON", () => {
    const reportFragment = {
      searchQueries: [
        {
          query: "legacy query",
          iteration: 0,
          focus: "main",
          resultsCount: 0,
          timestamp: "2026-04-05T00:00:00.000Z",
        },
        {
          query: "source-native query",
          iteration: 1,
          focus: "main",
          resultsCount: 0,
          timestamp: "2026-04-05T00:00:00.000Z",
          language: "pt",
          languageLane: "source_native",
          laneReason: "source_native:planner_unavailable",
        },
      ],
      claimAcquisitionLedger: {
        AC_01: {
          iterations: [
            {
              iteration: 1,
              iterationType: "main",
              languageLane: "source_native",
              generatedQueries: [],
              searchResults: 0,
              relevanceAccepted: 0,
              sourcesFetched: 0,
              rawEvidenceItems: 0,
              admittedEvidenceItems: 0,
              directionCounts: { supports: 0, contradicts: 0, neutral: 0 },
              losses: {
                relevanceRejected: 0,
                fetchRejected: 0,
                sourcesWithoutEvidence: 0,
                probativeFilteredOut: 0,
                perSourceCapDroppedNew: 0,
                perSourceCapEvictedExisting: 0,
              },
              laneReason: "source_native:planner_unavailable",
            },
          ],
        },
      },
    };

    const parsed = JSON.parse(JSON.stringify(reportFragment));
    expect(parsed.searchQueries[0].languageLane).toBeUndefined();
    expect(parsed.searchQueries[1].languageLane).toBe("source_native");
    expect(parsed.claimAcquisitionLedger.AC_01.iterations[0].languageLane).toBe("source_native");
  });
});
