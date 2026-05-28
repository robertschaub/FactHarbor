import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AtomicClaim,
  CBClaimUnderstanding,
  CBResearchState,
  ClaimSelectionRecommendation,
  EvidenceItem,
  FetchedSource,
  SearchQuery,
} from "@/lib/analyzer/types";

const mocks = vi.hoisted(() => ({
  extractClaims: vi.fn(),
  generateClaimSelectionRecommendation: vi.fn(),
  researchEvidence: vi.fn(),
  assessEvidenceApplicability: vi.fn(),
  assessEvidenceBalance: vi.fn(),
  clusterBoundaries: vi.fn(),
  generateVerdicts: vi.fn(),
  aggregateAssessment: vi.fn(),
  loadPipelineConfig: vi.fn(),
  loadSearchConfig: vi.fn(),
  loadCalcConfig: vi.fn(),
  loadPromptConfig: vi.fn(),
  getConfig: vi.fn(),
  captureConfigSnapshotAsync: vi.fn(),
  getSRConfigSummary: vi.fn(),
  prefetchSourceReliability: vi.fn(),
  getTrackRecordData: vi.fn(),
  applyEvidenceWeighting: vi.fn(),
  finalizeClaimAcquisitionTelemetry: vi.fn(),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: mocks.loadPipelineConfig,
  loadSearchConfig: mocks.loadSearchConfig,
  loadCalcConfig: mocks.loadCalcConfig,
  loadPromptConfig: mocks.loadPromptConfig,
}));

vi.mock("@/lib/config-storage", () => ({
  getConfig: mocks.getConfig,
}));

vi.mock("@/lib/config-snapshots", () => ({
  captureConfigSnapshotAsync: mocks.captureConfigSnapshotAsync,
  getSRConfigSummary: mocks.getSRConfigSummary,
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  runWithMetrics: vi.fn(async (_jobId, _variant, _pipeline, _search, fn) => fn()),
  startPhase: vi.fn(),
  endPhase: vi.fn(),
  recordLLMCall: vi.fn(),
  recordGate1Stats: vi.fn(),
  recordGate4Stats: vi.fn(),
  recordOutputQuality: vi.fn(),
  finalizeMetrics: vi.fn(async () => {}),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn((task: string) => ({
    provider: "anthropic",
    modelName: `mock-${task}`,
    model: {},
  })),
  extractStructuredOutput: vi.fn(),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/claim-selection-recommendation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analyzer/claim-selection-recommendation")>();
  return {
    ...actual,
    generateClaimSelectionRecommendation: mocks.generateClaimSelectionRecommendation,
  };
});

vi.mock("@/lib/analyzer/claim-extraction-stage", () => ({
  extractClaims: mocks.extractClaims,
  runPass1: vi.fn(),
  runPass2: vi.fn(),
  runPreliminarySearch: vi.fn(),
  runGate1Validation: vi.fn(),
  filterByCentrality: vi.fn(),
  shouldProtectValidatedAnchorCarriers: vi.fn(() => false),
  getProtectedContractCarrierIds: vi.fn((summary: CBClaimUnderstanding["contractValidationSummary"]) =>
    summary?.contractCarrierClaimIds ?? summary?.truthConditionAnchor?.validPreservedIds ?? [],
  ),
  getAtomicityGuidance: vi.fn(() => ""),
  generateSearchQueries: vi.fn(),
  upsertSearchProviderWarning: vi.fn(),
  ClaimContractOutputSchema: {},
}));

vi.mock("@/lib/analyzer/research-orchestrator", () => ({
  finalizeClaimAcquisitionTelemetry: mocks.finalizeClaimAcquisitionTelemetry,
  recordApplicabilityRemovalTelemetry: vi.fn(),
  researchEvidence: mocks.researchEvidence,
  runResearchIteration: vi.fn(),
  allClaimsSufficient: vi.fn(),
  consumeClaimQueryBudget: vi.fn(),
  findLeastContradictedClaim: vi.fn(),
  findLeastResearchedClaim: vi.fn(),
  getClaimQueryBudgetRemaining: vi.fn(() => 0),
  getClaimQueryBudgetUsed: vi.fn(() => 0),
  getPerClaimQueryBudget: vi.fn(() => 0),
}));

vi.mock("@/lib/analyzer/research-extraction-stage", () => ({
  classifyRelevance: vi.fn(),
  extractResearchEvidence: vi.fn(),
  assessEvidenceApplicability: mocks.assessEvidenceApplicability,
  assessScopeQuality: vi.fn(),
  assessEvidenceBalance: mocks.assessEvidenceBalance,
}));

vi.mock("@/lib/analyzer/boundary-clustering-stage", () => ({
  buildCoverageMatrix: (claims: AtomicClaim[], boundaries: any[], evidence: EvidenceItem[]) => {
    const claimIds = claims.map((claim) => claim.id);
    const boundaryIds = boundaries.map((boundary) => boundary.id);
    const counts = claimIds.map((claimId) =>
      boundaryIds.map((boundaryId) =>
        evidence.filter((item) =>
          item.claimBoundaryId === boundaryId &&
          Array.isArray(item.relevantClaimIds) &&
          item.relevantClaimIds.includes(claimId),
        ).length,
      ),
    );
    return {
      claims: claimIds,
      boundaries: boundaryIds,
      counts,
      getBoundariesForClaim: (claimId: string) =>
        boundaryIds.filter((_, index) => counts[claimIds.indexOf(claimId)]?.[index] > 0),
      getClaimsForBoundary: (boundaryId: string) =>
        claimIds.filter((_, index) => counts[index]?.[boundaryIds.indexOf(boundaryId)] > 0),
    };
  },
  clusterBoundaries: mocks.clusterBoundaries,
}));

vi.mock("@/lib/analyzer/verdict-generation-stage", () => ({
  generateVerdicts: mocks.generateVerdicts,
  buildVerdictStageConfig: vi.fn(() => ({})),
  createProductionLLMCall: vi.fn(() => vi.fn()),
  checkDebateTierDiversity: vi.fn(() => null),
  checkDebateProviderCredentials: vi.fn(() => []),
}));

vi.mock("@/lib/analyzer/aggregation-stage", () => ({
  aggregateAssessment: mocks.aggregateAssessment,
  checkExplanationStructure: vi.fn(() => ({
    hasCitedEvidence: true,
    hasVerdictCategory: true,
    hasConfidenceStatement: true,
    hasLimitations: true,
  })),
  evaluateExplanationRubric: vi.fn(),
  evaluateTigerScore: vi.fn(),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: mocks.prefetchSourceReliability,
  getTrackRecordData: mocks.getTrackRecordData,
  applyEvidenceWeighting: mocks.applyEvidenceWeighting,
}));

vi.mock("@/lib/analyzer/source-reliability-calibration", () => ({
  applySourceReliabilityCalibrationResults: vi.fn((items) => items),
  buildSourceReliabilityCalibrationInput: vi.fn(() => null),
  callSRCalibrationLLM: vi.fn(),
}));

vi.mock("@/lib/analyzer/evidence-filter", () => ({
  filterByProbativeValue: vi.fn((evidence: EvidenceItem[]) => ({
    kept: evidence,
    filtered: [],
    stats: { total: evidence.length, kept: evidence.length, filtered: 0, filterReasons: {} },
  })),
}));

vi.mock("@/lib/analyzer/research-acquisition-stage", () => ({
  fetchSources: vi.fn(),
  reconcileEvidenceSourceIds: vi.fn((items) => items),
}));

vi.mock("@/lib/analyzer/research-query-stage", () => ({
  generateResearchQueries: vi.fn(),
}));

vi.mock("@/lib/analyzer/jurisdiction-context", () => ({
  getClaimsRelevantGeographies: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/pipeline-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analyzer/pipeline-utils")>();
  return {
    ...actual,
    checkAbortSignal: vi.fn(),
  };
});

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: vi.fn(),
}));

vi.mock("@/lib/retrieval", () => ({
  extractTextFromUrl: vi.fn(),
}));

vi.mock("@/lib/provider-health", () => ({
  isSystemPaused: vi.fn(() => false),
  pauseSystem: vi.fn(),
  recordProviderFailure: vi.fn(() => ({ circuitOpened: false })),
}));

vi.mock("@/lib/connectivity-probe", () => ({
  probeLLMConnectivity: vi.fn(async () => ({ reachable: true, statusCode: 200, durationMs: 1 })),
}));

vi.mock("@/lib/job-abort", () => ({
  clearAbortSignal: vi.fn(),
}));

vi.mock("@/lib/error-classification", () => ({
  classifyError: vi.fn(() => ({ category: "unknown" })),
}));

function claim(id: string): AtomicClaim {
  return {
    id,
    statement: `${id} statement`,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance: "direct",
    keyEntities: [],
    checkWorthiness: "high",
    specificityScore: 0.9,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: [],
      expectedMetrics: [],
      expectedSourceTypes: [],
    },
  };
}

function understanding(): CBClaimUnderstanding {
  return {
    detectedInputType: "text",
    impliedClaim: "Input claim",
    backgroundDetails: "",
    articleThesis: "Article thesis",
    atomicClaims: [claim("AC_01"), claim("AC_02"), claim("AC_03")],
    distinctEvents: [],
    riskTier: "B",
    preliminaryEvidence: [
      { sourceUrl: "https://example.test/1", snippet: "one", claimId: "AC_01", relevantClaimIds: ["AC_01"] },
      { sourceUrl: "https://example.test/2", snippet: "two", claimId: "AC_02", relevantClaimIds: ["AC_02"] },
      { sourceUrl: "https://example.test/3", snippet: "three", claimId: "AC_03", relevantClaimIds: ["AC_03"] },
    ],
    gate1Stats: {
      totalClaims: 3,
      passedOpinion: 3,
      passedSpecificity: 3,
      passedFidelity: 3,
      filteredCount: 0,
      overallPass: true,
    },
    preFilterAtomicClaims: [claim("AC_01"), claim("AC_02"), claim("AC_03")],
    gate1Reasoning: [
      { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "one" },
      { claimId: "AC_02", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "two" },
      { claimId: "AC_03", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "three" },
    ],
  };
}

function recommendation(selectedIds: string[]): ClaimSelectionRecommendation {
  const rankedClaimIds = ["AC_03", "AC_01", "AC_02"];
  return {
    rankedClaimIds,
    recommendedClaimIds: selectedIds,
    assessments: rankedClaimIds.map((id) => ({
      claimId: id,
      triageLabel: selectedIds.includes(id) ? "fact_check_worthy" : "fact_non_check_worthy",
      thesisDirectness: selectedIds.includes(id) ? "high" : "medium",
      expectedEvidenceYield: selectedIds.includes(id) ? "high" : "low",
      coversDistinctRelevantDimension: selectedIds.includes(id) ? "high" : "low",
      redundancyWithClaimIds: selectedIds.includes(id) ? [] : ["AC_03"],
      recommendationRationale: `${id} rationale`,
    })),
    rationale: "Ranked by check-worthiness.",
  };
}

function makeEvidence(claimIds: string[]): EvidenceItem[] {
  return claimIds.map((claimId, index) => ({
    id: `EV_${String(index + 1).padStart(3, "0")}`,
    statement: `${claimId} evidence`,
    category: "statistical" as const,
    claimDirection: "supports" as const,
    probativeValue: "high" as const,
    sourceUrl: `https://source.test/${claimId}`,
    sourceTitle: `${claimId} source`,
    sourceType: "government_report" as const,
    evidenceScope: {},
    relevantClaimIds: [claimId],
    claimBoundaryId: "CB_01",
  }));
}

function makeSources(claimIds: string[]): FetchedSource[] {
  return claimIds.map((claimId, index) => ({
    id: `SRC_${index + 1}`,
    url: `https://source.test/${claimId}`,
    title: `${claimId} source`,
    domain: "source.test",
    content: "",
    fetchSuccess: true,
    searchQuery: `${claimId} query`,
  }));
}

function makeQueries(claimIds: string[]): SearchQuery[] {
  return claimIds.map((claimId) => ({
    claimId,
    query: `${claimId} query`,
    purpose: "initial" as const,
    searchProvider: "mock",
  }));
}

function configurePipeline(enabled: boolean, overrides: Record<string, unknown> = {}): void {
  mocks.loadPipelineConfig.mockResolvedValue({
    config: {
      claimAutoSelectionEnabled: enabled,
      claimAutoSelectionCap: 5,
      claimAutoSelectionCandidateCap: 12,
      applicabilityFilterEnabled: true,
      sourceReliabilityCalibrationMode: "off",
      evidenceWeightingEnabled: false,
      explanationQualityMode: "off",
      tigerScoreMode: "off",
      contradictionReservedIterations: 1,
      ...overrides,
    },
    contentHash: "__PIPELINE__",
    fromDefault: false,
    fromCache: false,
    overrides: [],
  });
  mocks.loadSearchConfig.mockResolvedValue({
    config: { provider: "mock" },
    contentHash: "__SEARCH__",
    fromDefault: false,
    fromCache: false,
    overrides: [],
  });
  mocks.loadCalcConfig.mockResolvedValue({
    config: {
      mixedConfidenceThreshold: 40,
      evidenceBalanceSkewThreshold: 0.8,
      evidenceBalanceMinDirectional: 3,
      evidenceSufficiencyMinItems: 0,
      evidenceSufficiencyMinSourceTypes: 0,
      evidenceSufficiencyMinDistinctDomains: 0,
      evidenceSufficiencyAuthoritativeDirectionalMinItems: 0,
      evidenceSufficiencyAuthoritativeDirectionalSourceTypes: [],
      sourceReliability: { defaultScore: 0.5 },
    },
    contentHash: "__CALC__",
    fromDefault: false,
    fromCache: false,
    overrides: [],
  });
}

function configureSuccessfulDownstream(): void {
  mocks.researchEvidence.mockImplementation(async (state: CBResearchState) => {
    const claimIds = state.understanding?.atomicClaims.map((claim) => claim.id) ?? [];
    state.evidenceItems = makeEvidence(claimIds);
    state.sources = makeSources(claimIds);
    state.searchQueries = makeQueries(claimIds);
  });
  mocks.assessEvidenceApplicability.mockImplementation(async (_claims, evidence) => evidence);
  mocks.assessEvidenceBalance.mockReturnValue({
    supporting: 1,
    contradicting: 0,
    neutral: 0,
    total: 1,
    balanceRatio: 1,
    isSkewed: false,
  });
  mocks.clusterBoundaries.mockResolvedValue([
    {
      id: "CB_01",
      name: "General",
      shortName: "General",
      description: "General boundary",
      constituentScopes: [],
      internalCoherence: 1,
      evidenceCount: 1,
    },
  ]);
  mocks.generateVerdicts.mockImplementation(async (claims: AtomicClaim[]) =>
    claims.map((claim) => ({
      claimId: claim.id,
      truthPercentage: 70,
      confidence: 80,
      verdict: "MOSTLY-TRUE",
      reasoning: `${claim.id} verdict`,
      supportingEvidenceIds: [`EV_${claim.id}`],
      contradictingEvidenceIds: [],
      boundaryFindings: [],
    })),
  );
  mocks.aggregateAssessment.mockImplementation(async (claimVerdicts, boundaries, evidenceItems, coverageMatrix) => ({
    truthPercentage: 70,
    verdict: "MOSTLY-TRUE",
    confidence: 80,
    verdictNarrative: {
      headline: "Mock headline",
      evidenceBaseSummary: `${evidenceItems.length} evidence items`,
      keyFinding: "Mock finding",
      limitations: "Mock limitations",
    },
    hasMultipleBoundaries: false,
    claimBoundaries: boundaries,
    claimVerdicts,
    coverageMatrix,
    qualityGates: {
      passed: true,
      gate1Stats: { total: claimVerdicts.length, passed: claimVerdicts.length, filtered: 0, centralKept: claimVerdicts.length },
      gate4Stats: { total: claimVerdicts.length, publishable: claimVerdicts.length, highConfidence: claimVerdicts.length, mediumConfidence: 0, lowConfidence: 0, insufficient: 0, centralKept: claimVerdicts.length },
      summary: { totalEvidenceItems: evidenceItems.length, totalSources: evidenceItems.length, searchesPerformed: evidenceItems.length, contradictionSearchPerformed: false },
    },
  }));
}

describe("Stage 1.5 automatic claim selection pipeline integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractClaims.mockResolvedValue(understanding());
    mocks.loadPromptConfig.mockResolvedValue({
      content: "prompt",
      contentHash: "__PROMPT__",
      fromCache: false,
      seededFromFile: false,
    });
    mocks.getConfig.mockResolvedValue({
      config: { enabled: true, confidenceThreshold: 0.8 },
      contentHash: "__SR__",
      fromCache: false,
      fromDefault: false,
      overrides: [],
    });
    mocks.getSRConfigSummary.mockReturnValue({ enabled: true, defaultScore: 0.5, confidenceThreshold: 0.8 });
    mocks.prefetchSourceReliability.mockResolvedValue({
      domains: [],
      alreadyPrefetched: 0,
      cacheHits: 0,
      evaluated: 0,
      noConsensusCount: 0,
      errorCount: 0,
      errorByType: {},
      failedDomains: [],
      errorSamples: [],
    });
    mocks.getTrackRecordData.mockReturnValue({ score: 0.7, confidence: 0.9, consensusAchieved: true });
    mocks.applyEvidenceWeighting.mockImplementation((verdicts) => verdicts);
    configureSuccessfulDownstream();
  });

  it("keeps flag-off behavior on the full post-Gate-1 claim set", async () => {
    configurePipeline(false);
    const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");

    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "Input claim",
    });

    expect(mocks.generateClaimSelectionRecommendation).not.toHaveBeenCalled();
    expect(mocks.researchEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        understanding: expect.objectContaining({
          atomicClaims: expect.arrayContaining([
            expect.objectContaining({ id: "AC_01" }),
            expect.objectContaining({ id: "AC_02" }),
            expect.objectContaining({ id: "AC_03" }),
          ]),
        }),
      }),
      undefined,
    );
    expect(result.resultJson.claimSelection).toBeUndefined();
    expect(result.resultJson.understanding.atomicClaims.map((c: AtomicClaim) => c.id)).toEqual(["AC_01", "AC_02", "AC_03"]);
  }, 15_000);

  it("routes only selector-ranked selected claims into Stage 2 and result verdicts", async () => {
    configurePipeline(true);
    const selectorRecommendation = recommendation(["AC_03", "AC_01"]);
    selectorRecommendation.assessments = selectorRecommendation.assessments.map((assessment) => {
      const { recommendationRationale: _recommendationRationale, ...rest } = assessment;
      return rest;
    });
    mocks.generateClaimSelectionRecommendation.mockResolvedValue(selectorRecommendation);
    const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");

    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "Input claim",
    });

    const researchedState = mocks.researchEvidence.mock.calls[0][0] as CBResearchState;
    expect(researchedState.understanding?.atomicClaims.map((claim) => claim.id)).toEqual(["AC_03", "AC_01"]);
    expect(result.resultJson.understanding.atomicClaims.map((claim: AtomicClaim) => claim.id)).toEqual(["AC_03", "AC_01"]);
    expect(result.resultJson.claimVerdicts.map((verdict: any) => verdict.claimId)).toEqual(["AC_03", "AC_01"]);
    expect(result.resultJson.coverageMatrix.claims).toEqual(["AC_03", "AC_01"]);
    expect(result.resultJson.claimSelection.selectedClaimIds).toEqual(["AC_03", "AC_01"]);
    expect(result.resultJson.claimSelection.droppedClaims).toEqual([
      expect.objectContaining({ id: "AC_02", reasonType: "selector_dropped" }),
    ]);
    expect(result.resultJson.claimSelection.droppedClaims[0].rationale).toContain("Selector");
  });

  it("keeps validated contract carriers in automatic selection even beyond the candidate cap", async () => {
    configurePipeline(true, {
      claimAutoSelectionCap: 2,
      claimAutoSelectionCandidateCap: 1,
    });
    const contractProtectedUnderstanding = understanding();
    contractProtectedUnderstanding.contractValidationSummary = {
      ran: true,
      preservesContract: true,
      rePromptRequired: false,
      summary: "completion preserved the contract",
      stageAttribution: "completion",
      contractCarrierClaimIds: ["AC_03"],
    };
    mocks.extractClaims.mockResolvedValue(contractProtectedUnderstanding);
    mocks.generateClaimSelectionRecommendation.mockResolvedValue(recommendation(["AC_01"]));
    const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");

    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "Input claim",
    });

    expect(mocks.generateClaimSelectionRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        atomicClaims: [
          expect.objectContaining({ id: "AC_01" }),
          expect.objectContaining({ id: "AC_03" }),
        ],
      }),
    );
    const researchedState = mocks.researchEvidence.mock.calls[0][0] as CBResearchState;
    expect(researchedState.understanding?.atomicClaims.map((claim) => claim.id)).toEqual(["AC_01", "AC_03"]);
    expect(result.resultJson.claimSelection.selectedClaimIds).toEqual(["AC_01", "AC_03"]);
    expect(result.resultJson.understanding.contractValidationSummary.contractCarrierClaimIds).toEqual(["AC_03"]);
  });

  it("keeps contract carriers within the automatic selection cap by dropping non-carriers", async () => {
    configurePipeline(true, {
      claimAutoSelectionCap: 1,
      claimAutoSelectionCandidateCap: 3,
    });
    const contractProtectedUnderstanding = understanding();
    contractProtectedUnderstanding.contractValidationSummary = {
      ran: true,
      preservesContract: true,
      rePromptRequired: false,
      summary: "completion preserved the contract",
      stageAttribution: "completion",
      contractCarrierClaimIds: ["AC_03"],
    };
    mocks.extractClaims.mockResolvedValue(contractProtectedUnderstanding);
    mocks.generateClaimSelectionRecommendation.mockResolvedValue(recommendation(["AC_01"]));
    const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");

    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "Input claim",
    });

    const researchedState = mocks.researchEvidence.mock.calls[0][0] as CBResearchState;
    expect(researchedState.understanding?.atomicClaims.map((claim) => claim.id)).toEqual(["AC_03"]);
    expect(result.resultJson.claimSelection.selectedClaimIds).toEqual(["AC_03"]);
    expect(result.resultJson.claimSelection.droppedClaims).toEqual([
      expect.objectContaining({ id: "AC_01", reasonType: "selector_dropped" }),
      expect.objectContaining({ id: "AC_02", reasonType: "selector_dropped" }),
    ]);
  });

  it("returns a non-damaged terminal result when the selector selects zero claims", async () => {
    configurePipeline(true);
    mocks.generateClaimSelectionRecommendation.mockResolvedValue(recommendation([]));
    const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");

    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "Input claim",
    });

    expect(mocks.researchEvidence).not.toHaveBeenCalled();
    expect(result.resultJson.verdict).toBe("UNVERIFIED");
    expect(result.resultJson.claimVerdicts).toEqual([]);
    expect(result.resultJson.understanding.atomicClaims).toEqual([]);
    expect(result.resultJson.claimSelection.selectedClaimIds).toEqual([]);
    expect(result.resultJson.claimSelection.droppedClaims).toHaveLength(3);
    expect(result.resultJson.analysisWarnings).toEqual([
      expect.objectContaining({ type: "no_checkworthy_claims", severity: "warning" }),
    ]);
    expect(result.resultJson.analysisWarnings.some((warning: any) => warning.type === "report_damaged")).toBe(false);
  });

  it("fails closed with selector_failed dropped reasons when selection crashes", async () => {
    configurePipeline(true);
    mocks.generateClaimSelectionRecommendation.mockRejectedValue(new Error("selector crashed"));
    const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");

    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "Input claim",
    });

    expect(mocks.researchEvidence).not.toHaveBeenCalled();
    expect(result.resultJson.verdict).toBe("UNVERIFIED");
    expect(result.resultJson.claimSelection.selectedClaimIds).toEqual([]);
    expect(result.resultJson.claimSelection.droppedClaims).toEqual([
      expect.objectContaining({ id: "AC_01", reasonType: "selector_failed" }),
      expect.objectContaining({ id: "AC_02", reasonType: "selector_failed" }),
      expect.objectContaining({ id: "AC_03", reasonType: "selector_failed" }),
    ]);
    expect(result.resultJson.analysisWarnings).toEqual([
      expect.objectContaining({
        type: "report_damaged",
        severity: "error",
        details: expect.not.objectContaining({ error: expect.anything() }),
      }),
    ]);
    expect(result.resultJson.analysisWarnings[0].details).toMatchObject({ errorType: "Error" });
  });
});
