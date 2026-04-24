import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExtractClaims = vi.fn();
const mockResearchEvidence = vi.fn();
const mockAggregateAssessment = vi.fn();

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(async () => ({ config: {}, contentHash: "test-pipeline", fromDefault: false })),
  loadSearchConfig: vi.fn(async () => ({ config: { provider: "mock-search" }, contentHash: "test-search", fromDefault: false })),
  loadCalcConfig: vi.fn(async () => ({ config: {}, contentHash: "test-calc", fromDefault: false })),
  loadPromptConfig: vi.fn(async () => ({ contentHash: "test-prompt" })),
}));

vi.mock("@/lib/config-storage", () => ({
  getConfig: vi.fn(async () => ({ config: {} })),
}));

vi.mock("@/lib/build-info", () => ({
  getWebGitCommitHash: vi.fn(() => "test-web-commit"),
}));

vi.mock("@/lib/config-snapshots", () => ({
  captureConfigSnapshotAsync: vi.fn(async () => {}),
  getSRConfigSummary: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  runWithMetrics: vi.fn(async (_jobId: string, _pipeline: string, _pipelineConfig: unknown, _searchConfig: unknown, fn: () => Promise<unknown>) => fn()),
  startPhase: vi.fn(),
  endPhase: vi.fn(),
  recordLLMCall: vi.fn(),
  recordGate1Stats: vi.fn(),
  recordGate4Stats: vi.fn(),
  recordOutputQuality: vi.fn(),
  finalizeMetrics: vi.fn(async () => {}),
}));

vi.mock("@/lib/analyzer/pipeline-utils", () => ({
  checkAbortSignal: vi.fn(),
  classifySourceFetchFailure: vi.fn(),
  createErrorFingerprint: vi.fn(() => "fingerprint"),
  createUnverifiedFallbackVerdict: vi.fn((claim: { id: string }, reason: string, explanation: string) => ({
    id: `CV_${claim.id}`,
    claimId: claim.id,
    truthPercentage: null,
    verdict: "UNVERIFIED",
    confidence: 0,
    reasoning: explanation,
    fallbackReason: reason,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    boundaryFindings: [],
    challengeResponses: [],
  })),
  detectInputType: vi.fn(() => "text"),
  extractDomain: vi.fn((url?: string) => {
    if (!url) return undefined;
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }),
  mapCategory: vi.fn((value: unknown) => value),
  mapSourceType: vi.fn((value: unknown) => value),
  normalizeExtractedSourceType: vi.fn((value: unknown) => value),
  selectTopSources: vi.fn((sources: unknown[]) => sources),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: vi.fn(async () => {}),
  getTrackRecordData: vi.fn(() => null),
  applyEvidenceWeighting: vi.fn((verdicts: unknown[]) => verdicts),
}));

vi.mock("@/lib/analyzer/source-reliability-calibration", () => ({
  applySourceReliabilityCalibrationResults: vi.fn((verdicts: unknown[]) => ({ verdicts, warnings: [] })),
  buildSourceReliabilityCalibrationInput: vi.fn(() => ({})),
  callSRCalibrationLLM: vi.fn(async () => null),
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
  extractStructuredOutput: vi.fn((value: unknown) => value),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(async () => ({
    content: "mock",
    contentHash: "mock",
    loadedAt: new Date().toISOString(),
    warnings: [],
  })),
}));

vi.mock("@/lib/analyzer/jurisdiction-context", () => ({
  getClaimsRelevantGeographies: vi.fn(() => []),
}));

vi.mock("@/lib/error-classification", () => ({
  classifyError: vi.fn(() => ({
    shouldCountAsProviderFailure: false,
    provider: "llm",
    message: "mock",
    category: "network",
  })),
}));

vi.mock("@/lib/provider-health", () => ({
  isSystemPaused: vi.fn(() => false),
  pauseSystem: vi.fn(),
  recordProviderFailure: vi.fn(() => ({ circuitOpened: false })),
}));

vi.mock("@/lib/connectivity-probe", () => ({
  probeLLMConnectivity: vi.fn(async () => ({ reachable: true, durationMs: 1 })),
}));

vi.mock("@/lib/analyzer/claim-extraction-stage", () => ({
  extractClaims: (...args: unknown[]) => mockExtractClaims(...args),
  runPass1: vi.fn(),
  runPass2: vi.fn(),
  runPreliminarySearch: vi.fn(),
  runGate1Validation: vi.fn(),
  filterByCentrality: vi.fn(),
  shouldProtectValidatedAnchorCarriers: vi.fn(() => false),
  getAtomicityGuidance: vi.fn(() => null),
  generateSearchQueries: vi.fn(async () => []),
  upsertSearchProviderWarning: vi.fn(),
  ClaimContractOutputSchema: {},
}));

vi.mock("@/lib/analyzer/research-orchestrator", () => ({
  finalizeClaimAcquisitionTelemetry: vi.fn(),
  recordApplicabilityRemovalTelemetry: vi.fn(),
  researchEvidence: (...args: unknown[]) => mockResearchEvidence(...args),
  runResearchIteration: vi.fn(async () => {}),
  allClaimsSufficient: vi.fn(() => true),
  consumeClaimQueryBudget: vi.fn(),
  findLeastContradictedClaim: vi.fn(() => null),
  findLeastResearchedClaim: vi.fn(() => null),
  getClaimQueryBudgetRemaining: vi.fn(() => 0),
  getClaimQueryBudgetUsed: vi.fn(() => 0),
  getPerClaimQueryBudget: vi.fn(() => 0),
}));

vi.mock("@/lib/analyzer/research-extraction-stage", () => ({
  classifyRelevance: vi.fn(),
  extractResearchEvidence: vi.fn(),
  assessEvidenceApplicability: vi.fn(async (_claims: unknown[], evidenceItems: unknown[]) => evidenceItems),
  assessScopeQuality: vi.fn(() => "complete"),
  assessEvidenceBalance: vi.fn(() => ({
    supporting: 0,
    contradicting: 0,
    neutral: 0,
    total: 0,
    balanceRatio: NaN,
    isSkewed: false,
  })),
}));

vi.mock("@/lib/analyzer/research-acquisition-stage", () => ({
  fetchSources: vi.fn(async () => []),
  reconcileEvidenceSourceIds: vi.fn(() => 0),
}));

vi.mock("@/lib/analyzer/research-query-stage", () => ({
  generateResearchQueries: vi.fn(async () => []),
}));

vi.mock("@/lib/analyzer/boundary-clustering-stage", () => ({
  buildCoverageMatrix: vi.fn(() => ({ rows: [], columns: [] })),
  clusterBoundaries: vi.fn(async () => []),
}));

vi.mock("@/lib/analyzer/aggregation-stage", () => ({
  aggregateAssessment: (...args: unknown[]) => mockAggregateAssessment(...args),
  checkExplanationStructure: vi.fn(() => []),
  evaluateExplanationRubric: vi.fn(async () => null),
  evaluateTigerScore: vi.fn(async () => null),
}));

vi.mock("@/lib/analyzer/verdict-generation-stage", () => ({
  generateVerdicts: vi.fn(async () => []),
  buildVerdictStageConfig: vi.fn(() => ({})),
  createProductionLLMCall: vi.fn(() => vi.fn()),
  checkDebateTierDiversity: vi.fn(() => null),
  checkDebateProviderCredentials: vi.fn(() => []),
}));

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: vi.fn(async () => ({ results: [], providersUsed: ["mock-search"], errors: [] })),
}));

vi.mock("@/lib/retrieval", () => ({
  extractTextFromUrl: vi.fn(async () => ({ text: "fetched text", contentType: "text/plain" })),
}));

vi.mock("@/lib/search-circuit-breaker", () => ({
  recordFailure: vi.fn(),
}));

vi.mock("@/lib/job-abort", () => ({
  clearAbortSignal: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => ({})) },
}));

import {
  prepareStage1Snapshot,
  runClaimBoundaryAnalysis,
} from "@/lib/analyzer/claimboundary-pipeline";

describe("runClaimBoundaryAnalysis prepared Stage 1 reuse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResearchEvidence.mockResolvedValue(undefined);
    mockAggregateAssessment.mockImplementation(
      async (claimVerdicts: unknown[], claimBoundaries: unknown[], _evidenceItems: unknown[], coverageMatrix: unknown) => ({
        hasMultipleBoundaries: false,
        truthPercentage: 0,
        verdict: "UNVERIFIED",
        confidence: 0,
        truthPercentageRange: null,
        verdictNarrative: "Mock narrative",
        articleAdjudication: null,
        adjudicationPath: "single_boundary",
        claimBoundaries,
        claimVerdicts,
        coverageMatrix,
      }),
    );
  });

  it("reuses resolved input text, skips cold-start Stage 1, and strips deselected artifacts before research", async () => {
    const preparedStage1 = {
      version: 1,
      resolvedInputText: "resolved text after URL fetch",
      preparedUnderstanding: {
        detectedLanguage: "en",
        detectedInputType: "url",
        atomicClaims: [
          { id: "AC_A", statement: "Claim A" },
          { id: "AC_B", statement: "Claim B" },
        ],
        preFilterAtomicClaims: [
          { id: "AC_A", statement: "Claim A" },
          { id: "AC_B", statement: "Claim B" },
        ],
        gate1Reasoning: [
          { claimId: "AC_A", decision: "pass" },
          { claimId: "AC_B", decision: "pass" },
        ],
        preliminaryEvidence: [
          {
            claimId: "AC_A",
            relevantClaimIds: ["AC_A", "AC_B"],
            sourceUrl: "https://example.com/a",
          },
          {
            claimId: "AC_A",
            relevantClaimIds: ["AC_A"],
            sourceUrl: "https://example.com/a-only",
          },
          {
            claimId: "AC_B",
            relevantClaimIds: ["AC_B"],
            sourceUrl: "https://example.com/b-only",
          },
        ],
        contractValidationSummary: {
          preservesContract: true,
          truthConditionAnchor: {
            preservedInClaimIds: ["AC_A", "AC_B"],
            validPreservedIds: ["AC_B", "AC_A"],
          },
        },
      },
    } as any;

    await runClaimBoundaryAnalysis({
      inputType: "url",
      inputValue: "https://example.com/original",
      preparedStage1,
      selectedClaimIds: ["AC_B"],
    });

    expect(mockExtractClaims).not.toHaveBeenCalled();
    expect(mockResearchEvidence).toHaveBeenCalledTimes(1);

    const state = mockResearchEvidence.mock.calls[0][0];
    expect(state.originalInput).toBe("resolved text after URL fetch");
    expect(state.understanding.atomicClaims.map((claim: { id: string }) => claim.id)).toEqual(["AC_B"]);
    expect(state.understanding.preFilterAtomicClaims.map((claim: { id: string }) => claim.id)).toEqual(["AC_B"]);
    expect(state.understanding.gate1Reasoning).toEqual([
      { claimId: "AC_B", decision: "pass" },
    ]);
    expect(state.understanding.preliminaryEvidence).toEqual([
      {
        claimId: "AC_B",
        relevantClaimIds: ["AC_B"],
        sourceUrl: "https://example.com/a",
      },
      {
        claimId: "AC_B",
        relevantClaimIds: ["AC_B"],
        sourceUrl: "https://example.com/b-only",
      },
    ]);
    expect(state.understanding.contractValidationSummary.truthConditionAnchor).toEqual({
      preservedInClaimIds: ["AC_B"],
      validPreservedIds: ["AC_B"],
    });
  }, 10_000);

  it("fails closed when selected claim ids are missing from the prepared snapshot", async () => {
    await expect(
      runClaimBoundaryAnalysis({
        inputType: "text",
        inputValue: "Captain-defined input placeholder",
        preparedStage1: {
          version: 1,
          resolvedInputText: "resolved text",
          preparedUnderstanding: {
            detectedLanguage: "en",
            detectedInputType: "text",
            atomicClaims: [{ id: "AC_A", statement: "Claim A" }],
            preliminaryEvidence: [],
          },
        } as any,
        selectedClaimIds: ["AC_MISSING"],
      }),
    ).rejects.toThrow(
      "Prepared Stage 1 snapshot is missing selected claim IDs: AC_MISSING",
    );

    expect(mockResearchEvidence).not.toHaveBeenCalled();
    expect(mockExtractClaims).not.toHaveBeenCalled();
  }, 10_000);
});

describe("prepareStage1Snapshot provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractClaims.mockResolvedValue({
      detectedLanguage: "en",
      detectedInputType: "url",
      impliedClaim: "Implied claim",
      articleThesis: "Article thesis",
      atomicClaims: [{ id: "AC_A", statement: "Claim A" }],
      preliminaryEvidence: [],
    });
  });

  it("captures forward-only preparation provenance for future exact reuse decisions", async () => {
    const prepared = await prepareStage1Snapshot({
      inputType: "url",
      inputValue: "https://example.com/article.pdf",
      onEvent: async () => {},
    });

    expect(prepared.preparedStage1.preparationProvenance).toMatchObject({
      pipelineVariant: "claimboundary",
      sourceInputType: "url",
      executedWebGitCommitHash: "test-web-commit",
      promptContentHash: "test-prompt",
      pipelineConfigHash: "test-pipeline",
      searchConfigHash: "test-search",
      calcConfigHash: "test-calc",
      selectionCap: 5,
    });
    expect(prepared.preparedStage1.preparationProvenance?.resolvedInputSha256).toEqual(expect.any(String));
  });
});
