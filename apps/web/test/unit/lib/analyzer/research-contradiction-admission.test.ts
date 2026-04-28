import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadPipelineConfig = vi.fn();
const mockLoadSearchConfig = vi.fn();
const mockLoadCalcConfig = vi.fn();
const mockGetConfig = vi.fn();
const mockGenerateResearchQueries = vi.fn();
const mockSearchWebWithProvider = vi.fn();

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: (...args: unknown[]) => mockLoadPipelineConfig(...args),
  loadSearchConfig: (...args: unknown[]) => mockLoadSearchConfig(...args),
  loadCalcConfig: (...args: unknown[]) => mockLoadCalcConfig(...args),
}));

vi.mock("@/lib/config-storage", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

vi.mock("@/lib/analyzer/research-query-stage", () => ({
  generateResearchQueries: (...args: unknown[]) => mockGenerateResearchQueries(...args),
}));

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: (...args: unknown[]) => mockSearchWebWithProvider(...args),
}));

vi.mock("@/lib/analyzer/research-acquisition-stage", () => ({
  fetchSources: vi.fn(async () => []),
  reconcileEvidenceSourceIds: vi.fn(() => 0),
}));

vi.mock("@/lib/analyzer/research-extraction-stage", () => ({
  classifyRelevance: vi.fn(async () => []),
  extractResearchEvidence: vi.fn(async () => []),
  assessEvidenceApplicability: vi.fn(),
  assessScopeQuality: vi.fn(() => "complete"),
  assessEvidenceBalance: vi.fn(),
  applyPerSourceCap: vi.fn((items: unknown[]) => ({ kept: items, capped: 0, evictedIds: [] })),
}));

vi.mock("@/lib/analyzer/evidence-filter", () => ({
  filterByProbativeValue: vi.fn((items: unknown[]) => ({ kept: items, filtered: [] })),
}));

vi.mock("@/lib/analyzer/claim-extraction-stage", () => ({
  upsertSearchProviderWarning: vi.fn(),
}));

vi.mock("@/lib/search-circuit-breaker", () => ({
  recordFailure: vi.fn(),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: vi.fn(async () => ({
    domains: [],
    evaluated: 0,
    cacheHits: 0,
    skippedDueToLimit: 0,
    skippedDueToBudget: 0,
    errorCount: 0,
    failedDomains: [],
    noConsensusCount: 0,
    errorByType: {},
  })),
  getTrackRecordData: vi.fn(() => null),
}));

vi.mock("@/lib/analyzer/jurisdiction-context", () => ({
  getClaimRelevantGeographies: vi.fn(() => []),
}));

vi.mock("@/lib/analyzer/debug", () => ({
  debugLog: vi.fn(),
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

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => ({})) },
}));

import { researchEvidence } from "@/lib/analyzer/research-orchestrator";
import type { CBResearchState } from "@/lib/analyzer/types";

function makeState(overrides: Partial<CBResearchState> = {}): CBResearchState {
  return {
    originalInput: "test",
    inputType: "text",
    languageIntent: null,
    understanding: {
      atomicClaims: [
        {
          id: "AC_01",
          statement: "Entity A made measurable claim B.",
          freshnessRequirement: "none",
        },
      ],
      preliminaryEvidence: [],
      distinctEvents: [],
      detectedLanguage: "en",
    } as any,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    relevanceClassificationCache: {},
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
  } as CBResearchState;
}

function mockConfigs(configOverrides: Record<string, unknown>) {
  mockLoadPipelineConfig.mockResolvedValue({
    config: {
      maxTotalIterations: 5,
      contradictionReservedIterations: 1,
      contradictionReservedQueries: 0,
      contradictionAdmissionEnabled: true,
      contradictionProtectedTimeMs: 120000,
      researchTimeBudgetMs: 1000,
      claimSufficiencyThreshold: 99,
      sufficiencyMinMainIterations: 1,
      sufficiencyMinResearchedIterationsPerClaim: 1,
      perClaimQueryBudget: 4,
      primarySourceRefinementEnabled: false,
      preliminaryEvidenceLlmRemapEnabled: false,
      ...configOverrides,
    },
    contentHash: "__TEST__",
    fromDefault: false,
    fromCache: false,
    overrides: [],
  });
  mockLoadSearchConfig.mockResolvedValue({
    config: { maxSourcesPerIteration: 5 },
    contentHash: "__TEST__",
    fromDefault: false,
    fromCache: false,
    overrides: [],
  });
  mockLoadCalcConfig.mockResolvedValue({
    config: {},
    contentHash: "__TEST__",
    fromDefault: false,
    fromCache: false,
    overrides: [],
  });
  mockGetConfig.mockResolvedValue({ config: {} });
}

describe("researchEvidence contradiction admission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    mockGenerateResearchQueries.mockResolvedValue([
      { query: "contradiction evidence query", rationale: "test" },
    ]);
    mockSearchWebWithProvider.mockResolvedValue({
      results: [],
      providersUsed: ["mock-search"],
      errors: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("transitions to contradiction instead of admitting another main iteration when protected time would be consumed", async () => {
    mockConfigs({});
    const state = makeState();

    await researchEvidence(state);

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(1);
    expect(mockGenerateResearchQueries.mock.calls[0][1]).toBe("contradiction");
    expect(state.mainIterationsUsed).toBe(0);
    expect(state.contradictionIterationsUsed).toBe(1);
    expect(state.researchWasteMetrics?.contradictionReachability).toMatchObject({
      started: true,
      remainingMsWhenMainResearchEnded: 1000,
      iterationsUsed: 1,
    });
    expect(state.warnings.some((warning) => warning.type === "unverified_research_incomplete")).toBe(false);
  });

  it("keeps the existing contradiction loop when only admission protection is disabled", async () => {
    mockConfigs({ contradictionAdmissionEnabled: false });
    const state = makeState();

    await researchEvidence(state);

    expect(mockGenerateResearchQueries).toHaveBeenCalledTimes(3);
    expect(mockGenerateResearchQueries.mock.calls[0][1]).toBe("main");
    expect(mockGenerateResearchQueries.mock.calls[2][1]).toBe("contradiction");
    expect(state.mainIterationsUsed).toBe(2);
    expect(state.contradictionIterationsUsed).toBe(1);
    expect(state.researchWasteMetrics?.contradictionReachability).toMatchObject({
      started: true,
      iterationsUsed: 1,
    });
    expect(state.warnings.some((warning) => warning.type === "unverified_research_incomplete")).toBe(false);
  });

  it("emits the registered degrading signal when contradiction cannot be attempted", async () => {
    mockConfigs({ perClaimQueryBudget: 1 });
    const state = makeState({ queryBudgetUsageByClaim: { AC_01: 1 } });

    await researchEvidence(state);

    expect(mockGenerateResearchQueries).not.toHaveBeenCalled();
    const warning = state.warnings.find(
      (entry) =>
        entry.type === "unverified_research_incomplete"
        && entry.details?.stage === "research_contradiction_admission",
    );
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe("warning");
    expect(warning?.details).toMatchObject({
      notRunReason: "query_budget_exhausted",
      contradictionIterationsUsed: 0,
    });
    expect(state.researchWasteMetrics?.contradictionReachability).toMatchObject({
      started: false,
      notRunReason: "query_budget_exhausted",
      iterationsUsed: 0,
    });
  });

  it("limits generated queries with the configured per-iteration cap", async () => {
    mockConfigs({
      contradictionAdmissionEnabled: false,
      perClaimQueryBudget: 8,
      researchMaxQueriesPerIteration: 2,
      researchZeroYieldBreakThreshold: 1,
    });
    mockGenerateResearchQueries.mockImplementation(async () => [
      { query: "main query 1", rationale: "test" },
      { query: "main query 2", rationale: "test" },
      { query: "main query 3", rationale: "test" },
      { query: "main query 4", rationale: "test" },
    ]);
    const state = makeState();

    await researchEvidence(state);

    expect(mockGenerateResearchQueries.mock.calls[0][1]).toBe("main");
    expect(mockGenerateResearchQueries.mock.calls[0][6]).toBe(2);
    expect(state.searchQueries.filter((query) => query.focus === "main")).toHaveLength(2);
  });

  it("stops main query spending mid-iteration when protected contradiction time is reached", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mockConfigs({
      contradictionProtectedTimeMs: 200,
      researchTimeBudgetMs: 1000,
      perClaimQueryBudget: 8,
      researchMaxQueriesPerIteration: 4,
      researchZeroYieldBreakThreshold: 2,
    });
    mockGenerateResearchQueries.mockImplementation(async (_claim, iterationType, _evidence, _config, _date, _events, maxQueries) =>
      Array.from({ length: maxQueries as number }, (_unused, index) => ({
        query: `${iterationType} query ${index + 1}`,
        rationale: "test",
      })),
    );
    mockSearchWebWithProvider.mockImplementation(async (request) => {
      if (String(request.query).startsWith("main query")) {
        now = 1_000_850;
      }
      return {
        results: [],
        providersUsed: ["mock-search"],
        errors: [],
      };
    });
    const events: string[] = [];
    const state = makeState({
      onEvent: (message) => {
        events.push(message);
      },
    });

    await researchEvidence(state);

    expect(state.searchQueries.filter((query) => query.focus === "main")).toHaveLength(1);
    expect(mockGenerateResearchQueries.mock.calls.some((call) => call[1] === "contradiction")).toBe(true);
    expect(state.contradictionIterationsUsed).toBe(1);
    expect(events.some((message) => message.includes("Protected contradiction research window reached"))).toBe(true);
  });

  it("continues to other claims after one claim reaches the zero-yield threshold", async () => {
    mockConfigs({
      contradictionAdmissionEnabled: false,
      maxTotalIterations: 5,
      researchZeroYieldBreakThreshold: 1,
      perClaimQueryBudget: 4,
    });
    const state = makeState({
      understanding: {
        atomicClaims: [
          { id: "AC_01", statement: "Entity A made measurable claim one.", freshnessRequirement: "none" },
          { id: "AC_02", statement: "Entity A made measurable claim two.", freshnessRequirement: "none" },
          { id: "AC_03", statement: "Entity A made measurable claim three.", freshnessRequirement: "none" },
        ],
        preliminaryEvidence: [],
        distinctEvents: [],
        detectedLanguage: "en",
      } as any,
    });

    await researchEvidence(state);

    const mainClaimIds = mockGenerateResearchQueries.mock.calls
      .filter((call) => call[1] === "main")
      .map((call) => call[0].id);
    expect(mainClaimIds).toEqual(["AC_01", "AC_02", "AC_03"]);
    expect(state.searchQueries.filter((query) => query.focus === "main")).toHaveLength(3);
  });
});
