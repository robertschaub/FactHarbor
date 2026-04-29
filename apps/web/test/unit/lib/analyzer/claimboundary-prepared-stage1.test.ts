import { createHash } from "node:crypto";
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
  buildPromptRuntimeFields: vi.fn(() => ({})),
  classifyStructuralRetryCause: vi.fn(() => "unknown"),
  runWithMetrics: vi.fn(async (_jobId: string, _pipeline: string, _pipelineConfig: unknown, _searchConfig: unknown, fn: () => Promise<unknown>) => fn()),
  extractLLMUsageFields: vi.fn((usage: any = {}) => ({
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
  })),
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
  wouldResolveExistingRemap: vi.fn(() => false),
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
import { loadPipelineConfig } from "@/lib/config-loader";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJsonStringify(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashEffectiveConfig(value: unknown): string {
  return sha256Text(stableJsonStringify(value));
}

const PREPARED_STAGE1_PIPELINE_CONFIG_HASH_IGNORED_KEYS = new Set([
  "claimSelectionDefaultMode",
  "claimSelectionIdleAutoProceedMs",
  "claimSelectionCap",
  "claimSelectionBudgetAwarenessEnabled",
  "claimSelectionBudgetFitMode",
  "claimSelectionMinRecommendedClaims",
]);

function omitPreparedStage1PipelineOrchestrationConfig(value: unknown): unknown {
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !PREPARED_STAGE1_PIPELINE_CONFIG_HASH_IGNORED_KEYS.has(key)),
    );
  }
  return value;
}

function hashPreparedStage1PipelineConfig(value: unknown): string {
  return hashEffectiveConfig(omitPreparedStage1PipelineOrchestrationConfig(value));
}

function withPreparationProvenance<T extends { resolvedInputText: string }>(
  preparedStage1: T,
  overrides: Record<string, unknown> = {},
): T & { preparationProvenance: Record<string, unknown> } {
  return {
    ...preparedStage1,
    preparationProvenance: {
      pipelineVariant: "claimboundary",
      sourceInputType: "text",
      resolvedInputSha256: sha256Text(preparedStage1.resolvedInputText),
      executedWebGitCommitHash: "test-web-commit",
      promptContentHash: "test-prompt",
      pipelineConfigHash: hashPreparedStage1PipelineConfig({}),
      searchConfigHash: hashEffectiveConfig({ provider: "mock-search" }),
      calcConfigHash: hashEffectiveConfig({}),
      selectionCap: 5,
      ...overrides,
    },
  };
}

function buildMinimalPreparedStage1(overrides: Record<string, unknown> = {}) {
  return withPreparationProvenance({
    version: 1,
    resolvedInputText: "resolved text",
    preparedUnderstanding: {
      detectedLanguage: "en",
      detectedInputType: "text",
      atomicClaims: [{ id: "AC_A", statement: "Claim A" }],
      preliminaryEvidence: [],
    },
  } as any, overrides);
}

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
    const preparedStage1 = withPreparationProvenance({
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
    } as any, { sourceInputType: "url" });

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

  it("hydrates ACS research-waste metrics before filtering deselected prepared artifacts", async () => {
    const preparedStage1 = withPreparationProvenance({
      version: 1,
      resolvedInputText: "resolved text after preparation",
      preparedUnderstanding: {
        detectedLanguage: "en",
        detectedInputType: "text",
        atomicClaims: [
          { id: "AC_A", statement: "Claim A" },
          { id: "AC_B", statement: "Claim B" },
        ],
        preliminaryEvidence: [
          { claimId: "AC_A", relevantClaimIds: ["AC_A"], sourceUrl: "https://example.com/a" },
          { claimId: "AC_B", relevantClaimIds: ["AC_B"], sourceUrl: "https://example.com/b" },
          { claimId: "", relevantClaimIds: [], sourceUrl: "https://example.com/unmapped" },
        ],
      },
      researchWasteMetrics: {
        preparedCandidateCount: 2,
        selectedClaimCount: 2,
        droppedCandidateCount: 0,
        preliminaryTotals: {
          queryCount: 2,
          fetchAttemptCount: 3,
          successfulFetchCount: 3,
          evidenceItemCount: 3,
          sourceUrlCount: 3,
          sourceTextByteCount: 900,
        },
        preliminaryByOutcome: {
          selected: { queryCount: 0, fetchAttemptCount: 0, successfulFetchCount: 0, evidenceItemCount: 0, sourceUrlCount: 0, sourceTextByteCount: 0 },
          dropped: { queryCount: 0, fetchAttemptCount: 0, successfulFetchCount: 0, evidenceItemCount: 0, sourceUrlCount: 0, sourceTextByteCount: 0 },
          unmapped: { queryCount: 2, fetchAttemptCount: 3, successfulFetchCount: 3, evidenceItemCount: 3, sourceUrlCount: 3, sourceTextByteCount: 900 },
        },
        stage1ToStage2UrlOverlap: {
          stage1UrlCount: 3,
          stage2UrlCount: 0,
          exactOverlapCount: 0,
          documentOverlapCount: 0,
          dataOverlapCount: 0,
          htmlOverlapCount: 0,
          unknownOverlapCount: 0,
          normalizedOverlapUrls: [],
        },
        selectedClaimResearch: [],
        contradictionReachability: {
          started: false,
          remainingMsWhenMainResearchEnded: null,
          iterationsUsed: 0,
          sourcesFound: 0,
        },
      },
    } as any);

    await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "resolved text after preparation",
      preparedStage1,
      selectedClaimIds: ["AC_B"],
    });

    const state = mockResearchEvidence.mock.calls[0][0];
    expect(state.researchWasteMetrics).toMatchObject({
      preparedCandidateCount: 2,
      selectedClaimCount: 1,
      droppedCandidateCount: 1,
      preliminaryTotals: {
        queryCount: 2,
        fetchAttemptCount: 3,
        successfulFetchCount: 3,
        evidenceItemCount: 3,
        sourceUrlCount: 3,
        sourceTextByteCount: 900,
      },
      preliminaryByOutcome: {
        selected: { evidenceItemCount: 1, sourceUrlCount: 1 },
        dropped: { evidenceItemCount: 1, sourceUrlCount: 1 },
        unmapped: {
          queryCount: 2,
          fetchAttemptCount: 3,
          successfulFetchCount: 3,
          evidenceItemCount: 1,
          sourceUrlCount: 1,
          sourceTextByteCount: 900,
        },
      },
    });
  }, 10_000);

  it("fails closed when selected claim ids are missing from the prepared snapshot", async () => {
    await expect(
      runClaimBoundaryAnalysis({
        inputType: "text",
        inputValue: "Captain-defined input placeholder",
        preparedStage1: withPreparationProvenance({
          version: 1,
          resolvedInputText: "resolved text",
          preparedUnderstanding: {
            detectedLanguage: "en",
            detectedInputType: "text",
            atomicClaims: [{ id: "AC_A", statement: "Claim A" }],
            preliminaryEvidence: [],
          },
        } as any),
        selectedClaimIds: ["AC_MISSING"],
      }),
    ).rejects.toThrow(
      "Prepared Stage 1 snapshot is missing selected claim IDs: AC_MISSING",
    );

    expect(mockResearchEvidence).not.toHaveBeenCalled();
    expect(mockExtractClaims).not.toHaveBeenCalled();
  }, 10_000);

  it("preserves unresolved preliminary evidence when all prepared claims are selected", async () => {
    const preparedStage1 = withPreparationProvenance({
      version: 1,
      resolvedInputText: "resolved text",
      preparedUnderstanding: {
        detectedLanguage: "en",
        detectedInputType: "text",
        atomicClaims: [
          { id: "AC_01", statement: "Claim one" },
          { id: "AC_02", statement: "Claim two" },
        ],
        preliminaryEvidence: [
          {
            claimId: "",
            relevantClaimIds: [],
            sourceUrl: "https://example.com/unmapped",
            snippet: "Unmapped preliminary evidence that Stage 2 can remap semantically.",
          },
        ],
      },
    } as any);

    await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "resolved text",
      preparedStage1,
      selectedClaimIds: ["AC_01", "AC_02"],
    });

    const state = mockResearchEvidence.mock.calls[0][0];
    expect(state.understanding.preliminaryEvidence).toEqual([
      {
        claimId: "",
        relevantClaimIds: [],
        sourceUrl: "https://example.com/unmapped",
        snippet: "Unmapped preliminary evidence that Stage 2 can remap semantically.",
      },
    ]);
  }, 10_000);

  it("fails closed before Stage 2 when direct analysis produces more claims than the selection cap", async () => {
    mockExtractClaims.mockResolvedValue({
      detectedLanguage: "en",
      detectedInputType: "text",
      atomicClaims: Array.from({ length: 6 }, (_, index) => ({
        id: `AC_${String(index + 1).padStart(2, "0")}`,
        statement: `Claim ${index + 1}`,
      })),
      preliminaryEvidence: [],
    });

    await expect(
      runClaimBoundaryAnalysis({
        inputType: "text",
        inputValue: "resolved text",
      }),
    ).rejects.toThrow(
      "Direct analysis produced 6 candidate AtomicClaims, exceeding the claim selection cap of 5",
    );

    expect(mockExtractClaims).toHaveBeenCalledTimes(1);
    expect(mockResearchEvidence).not.toHaveBeenCalled();
  }, 10_000);

  it("rejects prepared snapshots without provenance before research starts", async () => {
    await expect(
      runClaimBoundaryAnalysis({
        inputType: "text",
        inputValue: "resolved text",
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
        selectedClaimIds: ["AC_A"],
      }),
    ).rejects.toThrow("missing preparationProvenance");

    expect(mockResearchEvidence).not.toHaveBeenCalled();
    expect(mockExtractClaims).not.toHaveBeenCalled();
  }, 10_000);

  it("rejects stale prepared snapshots when prompt provenance changed", async () => {
    await expect(
      runClaimBoundaryAnalysis({
        inputType: "text",
        inputValue: "resolved text",
        preparedStage1: buildMinimalPreparedStage1({ promptContentHash: "old-prompt" }) as any,
        selectedClaimIds: ["AC_A"],
      }),
    ).rejects.toThrow("promptContentHash changed");

    expect(mockResearchEvidence).not.toHaveBeenCalled();
    expect(mockExtractClaims).not.toHaveBeenCalled();
  }, 10_000);

  it.each([
    ["pipelineConfigHash", { pipelineConfigHash: "old-pipeline" }, "pipelineConfigHash changed"],
    ["searchConfigHash", { searchConfigHash: "old-search" }, "searchConfigHash changed"],
    ["calcConfigHash", { calcConfigHash: "old-calc" }, "calcConfigHash changed"],
    ["selectionCap", { selectionCap: 4 }, "selectionCap changed from 4 to 5"],
    ["resolvedInputSha256", { resolvedInputSha256: "stale-hash" }, "resolvedInputSha256 does not match"],
  ])("rejects prepared snapshots when %s does not match", async (_field, overrides, message) => {
    await expect(
      runClaimBoundaryAnalysis({
        inputType: "text",
        inputValue: "resolved text",
        preparedStage1: buildMinimalPreparedStage1(overrides) as any,
        selectedClaimIds: ["AC_A"],
      }),
    ).rejects.toThrow(message);

    expect(mockResearchEvidence).not.toHaveBeenCalled();
    expect(mockExtractClaims).not.toHaveBeenCalled();
  }, 10_000);

  it("does not reject prepared snapshots when only claim-selection orchestration config changed", async () => {
    vi.mocked(loadPipelineConfig).mockResolvedValueOnce({
      config: {
        claimSelectionDefaultMode: "automatic",
        claimSelectionIdleAutoProceedMs: 0,
        claimSelectionCap: 5,
        claimSelectionBudgetAwarenessEnabled: true,
        claimSelectionBudgetFitMode: "allow_fewer_recommendations",
        claimSelectionMinRecommendedClaims: 1,
      },
      contentHash: "test-pipeline",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    } as any);

    await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "resolved text",
      preparedStage1: buildMinimalPreparedStage1() as any,
      selectedClaimIds: ["AC_A"],
    });

    expect(mockResearchEvidence).toHaveBeenCalledTimes(1);
    expect(mockExtractClaims).not.toHaveBeenCalled();
  }, 10_000);

  it("allows legacy prepared snapshots only when provenance validation is disabled", async () => {
    vi.mocked(loadPipelineConfig).mockResolvedValueOnce({
      config: { provenanceValidationEnabled: false },
      contentHash: "test-pipeline",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    } as any);

    await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "resolved text",
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
      selectedClaimIds: ["AC_A"],
    });

    expect(mockResearchEvidence).toHaveBeenCalledTimes(1);
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
      pipelineConfigHash: hashPreparedStage1PipelineConfig({}),
      searchConfigHash: hashEffectiveConfig({ provider: "mock-search" }),
      calcConfigHash: hashEffectiveConfig({}),
      selectionCap: 5,
    });
    expect(prepared.preparedStage1.preparationProvenance?.resolvedInputSha256).toEqual(expect.any(String));
  });
});
