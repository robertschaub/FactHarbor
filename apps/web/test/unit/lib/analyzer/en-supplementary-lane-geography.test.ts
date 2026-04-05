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
  searchWebWithProvider: vi.fn().mockResolvedValue({
    results: [{ url: "https://en.example.com/1", title: "EN Result", snippet: "s" }],
    providersUsed: ["mock"],
    errors: [],
  }),
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
  getPromptCachingOptions: vi.fn(() => ({})),
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

import { maybeRunSupplementaryEnglishLane } from "@/lib/analyzer/research-orchestrator";
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
