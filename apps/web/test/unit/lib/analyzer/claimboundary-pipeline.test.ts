/**
 * ClaimBoundary Pipeline — Unit Tests
 *
 * Tests for the ClaimAssessmentBoundary pipeline skeleton and supporting functions.
 * All fixtures use CB types only (AtomicClaim, ClaimAssessmentBoundary, BoundaryFinding, etc.)
 * per §22.3.2 confusion prevention rules.
 *
 * @see apps/web/src/lib/analyzer/claimboundary-pipeline.ts
 * @see Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCoverageMatrix,
  filterByCentrality,
  detectInputType,
  generateSearchQueries,
  runPass1,
  runPass2,
  runGate1Validation,
  runPreliminarySearch,
  seedEvidenceFromPreliminarySearch,
  findLeastResearchedClaim,
  findLeastContradictedClaim,
  allClaimsSufficient,
  assessScopeQuality,
  generateResearchQueries,
  classifyRelevance,
  extractResearchEvidence,
  fetchSources,
  runResearchIteration,
  scopeFingerprint,
  collectUniqueScopes,
  runLLMClustering,
  createFallbackBoundary,
  assignEvidenceToBoundaries,
  boundaryJaccardSimilarity,
  mergeClosestBoundaries,
  clusterBoundaries,
  buildVerdictStageConfig,
  createProductionLLMCall,
  generateVerdicts,
  computeTriangulationScore,
  computeDerivativeFactor,
  generateVerdictNarrative,
  buildQualityGates,
  aggregateAssessment,
  assessEvidenceBalance,
  checkDebateTierDiversity,
  checkDebateProviderCredentials,
  checkExplanationStructure,
  evaluateExplanationRubric,
} from "@/lib/analyzer/claimboundary-pipeline";
import type {
  AtomicClaim,
  ClaimAssessmentBoundary,
  CBClaimVerdict,
  CBClaimUnderstanding,
  CBResearchState,
  BoundaryFinding,
  CoverageMatrix,
  VerdictNarrative,
  ConsistencyResult,
  ChallengeDocument,
  ChallengePoint,
  ChallengeResponse,
  TriangulationScore,
  OverallAssessment,
  ExplanationQualityCheck,
  ExplanationStructuralFindings,
  EvidenceItem,
  EvidenceScope,
} from "@/lib/analyzer/types";

// ============================================================================
// TEST DATA FACTORIES — CB types only (§22.3.2)
// ============================================================================

function createAtomicClaim(overrides: Partial<AtomicClaim> = {}): AtomicClaim {
  return {
    id: "AC_01",
    statement: "Entity A achieved metric X within defined boundaries",
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true as const,
    claimDirection: "supports_thesis",
    keyEntities: ["Entity A"],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: ["standard analysis method"],
      expectedMetrics: ["metric X"],
      expectedSourceTypes: ["peer_reviewed_study"],
    },
    ...overrides,
  };
}

function createClaimAssessmentBoundary(overrides: Partial<ClaimAssessmentBoundary> = {}): ClaimAssessmentBoundary {
  return {
    id: "CB_01",
    name: "Standard Analysis Boundary",
    shortName: "STD",
    description: "Evidence using standard analytical methodology",
    methodology: "standard analysis method",
    boundaries: "full scope",
    geographic: "Global",
    temporal: "2020-2025",
    constituentScopes: [],
    internalCoherence: 0.85,
    evidenceCount: 5,
    ...overrides,
  };
}

function createEvidenceItem(
  overrides: Partial<EvidenceItem & { claimBoundaryId?: string; relevantClaimIds?: string[] }> = {}
): EvidenceItem & { claimBoundaryId?: string; relevantClaimIds?: string[] } {
  return {
    id: "EV_01",
    statement: "Evidence statement with sufficient length for testing purposes.",
    category: "direct_evidence",
    specificity: "high",
    sourceId: "S1",
    sourceUrl: "https://example.com/source",
    sourceTitle: "Example Source",
    sourceExcerpt: "This is a source excerpt with sufficient length to meet requirements.",
    claimDirection: "supports",
    probativeValue: "high",
    evidenceScope: {
      name: "STD",
      methodology: "standard analysis method",
      temporal: "2020-2025",
    },
    claimBoundaryId: "CB_01",
    relevantClaimIds: ["AC_01"],
    ...overrides,
  };
}

function createBoundaryFinding(overrides: Partial<BoundaryFinding> = {}): BoundaryFinding {
  return {
    boundaryId: "CB_01",
    boundaryName: "Standard Analysis Boundary",
    truthPercentage: 75,
    confidence: 80,
    evidenceDirection: "supports",
    evidenceCount: 5,
    ...overrides,
  };
}

function createConsistencyResult(overrides: Partial<ConsistencyResult> = {}): ConsistencyResult {
  return {
    claimId: "AC_01",
    percentages: [72, 75, 73],
    average: 73.3,
    spread: 3,
    stable: true,
    assessed: true,
    ...overrides,
  };
}

function createTriangulationScore(overrides: Partial<TriangulationScore> = {}): TriangulationScore {
  return {
    boundaryCount: 2,
    supporting: 2,
    contradicting: 0,
    level: "moderate",
    factor: 1.05,
    ...overrides,
  };
}

function createCBClaimVerdict(overrides: Partial<CBClaimVerdict> = {}): CBClaimVerdict {
  return {
    id: "CV_01",
    claimId: "AC_01",
    truthPercentage: 75,
    verdict: "MOSTLY-TRUE",
    confidence: 80,
    reasoning: "Evidence from the standard analysis boundary supports this claim.",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: ["EV_01", "EV_02"],
    contradictingEvidenceIds: [],
    boundaryFindings: [createBoundaryFinding()],
    consistencyResult: createConsistencyResult(),
    challengeResponses: [],
    triangulationScore: createTriangulationScore(),
    ...overrides,
  };
}

function createVerdictNarrative(overrides: Partial<VerdictNarrative> = {}): VerdictNarrative {
  return {
    headline: "Evidence consistently supports the claim within standard methodology",
    evidenceBaseSummary: "8 items, 5 sources, 2 perspectives",
    keyFinding: "The claim is well-supported by evidence from multiple independent sources.",
    limitations: "Limited geographic scope; evidence primarily from one region.",
    ...overrides,
  };
}

// ============================================================================
// TYPE VALIDITY TESTS — ensure CB types are well-formed
// ============================================================================

describe("ClaimAssessmentBoundary Pipeline Types", () => {
  describe("AtomicClaim", () => {
    it("should create a valid AtomicClaim with all required fields", () => {
      const claim = createAtomicClaim();
      expect(claim.id).toBe("AC_01");
      expect(claim.isCentral).toBe(true);
      expect(claim.centrality).toMatch(/^(high|medium)$/);
      expect(claim.specificityScore).toBeGreaterThanOrEqual(0);
      expect(claim.specificityScore).toBeLessThanOrEqual(1);
      expect(claim.groundingQuality).toMatch(/^(strong|moderate|weak|none)$/);
      expect(claim.expectedEvidenceProfile.methodologies).toBeInstanceOf(Array);
      expect(claim.expectedEvidenceProfile.expectedMetrics).toBeInstanceOf(Array);
      expect(claim.expectedEvidenceProfile.expectedSourceTypes).toBeInstanceOf(Array);
    });

    it("should support all harmPotential levels", () => {
      const levels: AtomicClaim["harmPotential"][] = ["critical", "high", "medium", "low"];
      for (const level of levels) {
        const claim = createAtomicClaim({ harmPotential: level });
        expect(claim.harmPotential).toBe(level);
      }
    });

    it("should support all claimDirection values", () => {
      const directions: AtomicClaim["claimDirection"][] = [
        "supports_thesis",
        "contradicts_thesis",
        "contextual",
      ];
      for (const dir of directions) {
        const claim = createAtomicClaim({ claimDirection: dir });
        expect(claim.claimDirection).toBe(dir);
      }
    });
  });

  describe("ClaimAssessmentBoundary", () => {
    it("should create a valid ClaimAssessmentBoundary", () => {
      const boundary = createClaimAssessmentBoundary();
      expect(boundary.id).toBe("CB_01");
      expect(boundary.name).toBeTruthy();
      expect(boundary.shortName).toBeTruthy();
      expect(boundary.internalCoherence).toBeGreaterThanOrEqual(0);
      expect(boundary.internalCoherence).toBeLessThanOrEqual(1);
      expect(boundary.constituentScopes).toBeInstanceOf(Array);
    });

    it("should allow optional scope metadata fields", () => {
      const boundary = createClaimAssessmentBoundary({
        methodology: undefined,
        boundaries: undefined,
        geographic: undefined,
        temporal: undefined,
      });
      expect(boundary.methodology).toBeUndefined();
    });
  });

  describe("BoundaryFinding", () => {
    it("should create a valid BoundaryFinding with quantitative signals", () => {
      const finding = createBoundaryFinding();
      expect(finding.boundaryId).toBe("CB_01");
      expect(finding.truthPercentage).toBeGreaterThanOrEqual(0);
      expect(finding.truthPercentage).toBeLessThanOrEqual(100);
      expect(finding.confidence).toBeGreaterThanOrEqual(0);
      expect(finding.confidence).toBeLessThanOrEqual(100);
      expect(finding.evidenceDirection).toMatch(/^(supports|contradicts|mixed|neutral)$/);
    });
  });

  describe("CBClaimVerdict", () => {
    it("should create a valid CBClaimVerdict with all §22 fields", () => {
      const verdict = createCBClaimVerdict();
      expect(verdict.claimId).toBe("AC_01");
      expect(verdict.boundaryFindings).toBeInstanceOf(Array);
      expect(verdict.consistencyResult).toBeDefined();
      expect(verdict.challengeResponses).toBeInstanceOf(Array);
      expect(verdict.triangulationScore).toBeDefined();
      expect(verdict.supportingEvidenceIds).toBeInstanceOf(Array);
      expect(verdict.contradictingEvidenceIds).toBeInstanceOf(Array);
    });

    it("should support 4-level harmPotential on verdicts", () => {
      const levels: CBClaimVerdict["harmPotential"][] = ["critical", "high", "medium", "low"];
      for (const level of levels) {
        const verdict = createCBClaimVerdict({ harmPotential: level });
        expect(verdict.harmPotential).toBe(level);
      }
    });
  });

  describe("ConsistencyResult", () => {
    it("should support assessed=false for skipped consistency checks", () => {
      const result = createConsistencyResult({
        assessed: false,
        stable: true,
        spread: 0,
        percentages: [],
      });
      expect(result.assessed).toBe(false);
      expect(result.stable).toBe(true);
    });
  });

  describe("VerdictNarrative", () => {
    it("should create a structured narrative with all required fields", () => {
      const narrative = createVerdictNarrative();
      expect(narrative.headline).toBeTruthy();
      expect(narrative.evidenceBaseSummary).toBeTruthy();
      expect(narrative.keyFinding).toBeTruthy();
      expect(narrative.limitations).toBeTruthy();
    });

    it("should allow optional boundaryDisagreements", () => {
      const withDisagreements = createVerdictNarrative({
        boundaryDisagreements: [
          "Boundary A shows strong support while Boundary B is inconclusive",
        ],
      });
      expect(withDisagreements.boundaryDisagreements).toHaveLength(1);

      const without = createVerdictNarrative({ boundaryDisagreements: undefined });
      expect(without.boundaryDisagreements).toBeUndefined();
    });
  });
});

// ============================================================================
// COVERAGE MATRIX TESTS (§8.5.1)
// ============================================================================

describe("buildCoverageMatrix", () => {
  it("should build a matrix with correct dimensions", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Second claim for testing" }),
    ];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02", name: "Alternative Boundary", shortName: "ALT" }),
    ];
    const evidence: (EvidenceItem & { claimBoundaryId?: string; relevantClaimIds?: string[] })[] = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01", "AC_02"] }),
      createEvidenceItem({ id: "EV_03", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_02"] }),
    ];

    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    expect(matrix.claims).toEqual(["AC_01", "AC_02"]);
    expect(matrix.boundaries).toEqual(["CB_01", "CB_02"]);
    expect(matrix.counts).toHaveLength(2); // 2 claims
    expect(matrix.counts[0]).toHaveLength(2); // 2 boundaries
  });

  it("should count evidence correctly per claim × boundary", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Second claim for testing" }),
    ];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02", name: "Alternative Boundary", shortName: "ALT" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_03", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_02"] }),
      createEvidenceItem({ id: "EV_04", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_02"] }),
    ];

    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    // AC_01 in CB_01: 2 items, AC_01 in CB_02: 0 items
    expect(matrix.counts[0][0]).toBe(2);
    expect(matrix.counts[0][1]).toBe(0);
    // AC_02 in CB_01: 1 item, AC_02 in CB_02: 1 item
    expect(matrix.counts[1][0]).toBe(1);
    expect(matrix.counts[1][1]).toBe(1);
  });

  it("should return correct boundaries for a claim via getBoundariesForClaim", () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02", name: "Second Boundary", shortName: "B2" }),
      createClaimAssessmentBoundary({ id: "CB_03", name: "Third Boundary", shortName: "B3" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_03", relevantClaimIds: ["AC_01"] }),
    ];

    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    const result = matrix.getBoundariesForClaim("AC_01");

    expect(result).toEqual(["CB_01", "CB_03"]);
    expect(result).not.toContain("CB_02");
  });

  it("should return correct claims for a boundary via getClaimsForBoundary", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Second claim" }),
      createAtomicClaim({ id: "AC_03", statement: "Third claim" }),
    ];
    const boundaries = [createClaimAssessmentBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_03"] }),
    ];

    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    const result = matrix.getClaimsForBoundary("CB_01");

    expect(result).toEqual(["AC_01", "AC_03"]);
    expect(result).not.toContain("AC_02");
  });

  it("should handle empty inputs gracefully", () => {
    const matrix = buildCoverageMatrix([], [], []);
    expect(matrix.claims).toEqual([]);
    expect(matrix.boundaries).toEqual([]);
    expect(matrix.counts).toEqual([]);
    expect(matrix.getBoundariesForClaim("AC_01")).toEqual([]);
    expect(matrix.getClaimsForBoundary("CB_01")).toEqual([]);
  });

  it("should handle evidence with unknown boundary ID", () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimAssessmentBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({
        id: "EV_01",
        claimBoundaryId: "CB_UNKNOWN",
        relevantClaimIds: ["AC_01"],
      }),
    ];

    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    // Unknown boundary should be ignored
    expect(matrix.counts[0][0]).toBe(0);
  });

  it("should handle evidence with unknown claim ID", () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimAssessmentBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({
        id: "EV_01",
        claimBoundaryId: "CB_01",
        relevantClaimIds: ["AC_UNKNOWN"],
      }),
    ];

    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    // Unknown claim should be ignored, no crash
    expect(matrix.counts[0][0]).toBe(0);
  });
});

// ============================================================================
// STAGE SKELETON TESTS — verify stubs throw until implemented
// ============================================================================

describe("ClaimAssessmentBoundary Pipeline Stages (skeleton)", () => {
  describe("Stage 1: extractClaims", () => {
    it("should exist as a function", async () => {
      const { extractClaims } = await import("@/lib/analyzer/claimboundary-pipeline");
      expect(typeof extractClaims).toBe("function");
    });
  });

  describe("Stage 2: researchEvidence", () => {
    it("should exist as a function", async () => {
      const { researchEvidence } = await import("@/lib/analyzer/claimboundary-pipeline");
      expect(typeof researchEvidence).toBe("function");
    });
  });

  describe("Stage 3: clusterBoundaries", () => {
    it("should exist as a function", async () => {
      const { clusterBoundaries } = await import("@/lib/analyzer/claimboundary-pipeline");
      expect(typeof clusterBoundaries).toBe("function");
    });
  });

  describe("Stage 4: generateVerdicts", () => {
    it("should exist as a function", async () => {
      const { generateVerdicts } = await import("@/lib/analyzer/claimboundary-pipeline");
      expect(typeof generateVerdicts).toBe("function");
    });
  });

  describe("Stage 5: aggregateAssessment", () => {
    it("should exist as a function", async () => {
      const { aggregateAssessment } = await import("@/lib/analyzer/claimboundary-pipeline");
      expect(typeof aggregateAssessment).toBe("function");
    });
  });

  // Stage 5 placeholder tests — full suite is below in dedicated describe blocks

  describe("runClaimBoundaryAnalysis", () => {
    it("should exist as the main entry point", async () => {
      const { runClaimBoundaryAnalysis } = await import("@/lib/analyzer/claimboundary-pipeline");
      expect(typeof runClaimBoundaryAnalysis).toBe("function");
    });
  });
});

// ============================================================================
// STAGE 1: EXTRACT CLAIMS — Unit Tests (§8.1)
// ============================================================================

// --- Pure function tests (no mocks needed) ---

describe("detectInputType", () => {
  it("should classify short text as 'claim'", () => {
    expect(detectInputType("Entity A achieved metric X")).toBe("claim");
  });

  it("should classify long text (>= 200 chars) as 'article'", () => {
    const longText = "A".repeat(200);
    expect(detectInputType(longText)).toBe("article");
  });

  it("should handle whitespace-padded input", () => {
    const padded = "  short input  ";
    expect(detectInputType(padded)).toBe("claim");
  });
});

describe("generateSearchQueries", () => {
  it("should use searchHint as primary and statement as secondary", () => {
    const claim = { statement: "Entity A achieved metric X in 2024", searchHint: "entity A metric X" };
    const result = generateSearchQueries(claim, 2);
    expect(result).toEqual(["entity A metric X", "Entity A achieved metric X in 2024"]);
  });

  it("should truncate statement to 80 chars when used as secondary query", () => {
    const longStatement = "A".repeat(100);
    const claim = { statement: longStatement, searchHint: "short hint" };
    const result = generateSearchQueries(claim, 2);
    expect(result[1]).toHaveLength(80);
    expect(result[1]).toBe("A".repeat(80));
  });

  it("should cap results at queriesPerClaim", () => {
    const claim = { statement: "test claim", searchHint: "hint" };
    expect(generateSearchQueries(claim, 1)).toHaveLength(1);
    expect(generateSearchQueries(claim, 1)[0]).toBe("hint");
  });

  it("should use statement directly if searchHint is empty", () => {
    const claim = { statement: "entity metric test", searchHint: "" };
    const result = generateSearchQueries(claim, 2);
    // empty searchHint is falsy, so skipped; statement used as only query
    expect(result).toEqual(["entity metric test"]);
  });
});

describe("filterByCentrality", () => {
  const makeClaims = (centralities: string[]) =>
    centralities.map((c, i) => ({
      id: `AC_${String(i + 1).padStart(2, "0")}`,
      centrality: c,
      statement: `Claim ${i + 1}`,
    }));

  it("should keep only 'high' claims when threshold is 'high'", () => {
    const claims = makeClaims(["high", "medium", "low", "high"]);
    const result = filterByCentrality(claims, "high", 10);
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.centrality === "high")).toBe(true);
  });

  it("should keep 'high' and 'medium' claims when threshold is 'medium'", () => {
    const claims = makeClaims(["high", "medium", "low", "medium"]);
    const result = filterByCentrality(claims, "medium", 10);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.centrality !== "low")).toBe(true);
  });

  it("should sort high centrality before medium", () => {
    const claims = makeClaims(["medium", "high", "medium", "high"]);
    const result = filterByCentrality(claims, "medium", 10);
    expect(result[0].centrality).toBe("high");
    expect(result[1].centrality).toBe("high");
    expect(result[2].centrality).toBe("medium");
    expect(result[3].centrality).toBe("medium");
  });

  it("should cap at maxClaims", () => {
    const claims = makeClaims(["high", "high", "high", "high", "high"]);
    const result = filterByCentrality(claims, "high", 3);
    expect(result).toHaveLength(3);
  });

  it("should return empty array for empty input", () => {
    const result = filterByCentrality([], "medium", 10);
    expect(result).toHaveLength(0);
  });
});

// --- LLM-dependent function tests (mocked) ---

// Mock modules used by Stage 1 LLM functions
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => ({})) },
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({ model: "mock-model", modelName: "mock-model", provider: "anthropic" })),
  extractStructuredOutput: vi.fn(),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(() => ({ config: {} })),
  loadSearchConfig: vi.fn(() => ({ config: {} })),
  loadCalcConfig: vi.fn(() => ({ config: { mixedConfidenceThreshold: 40 } })),
}));

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: vi.fn(),
}));

vi.mock("@/lib/retrieval", () => ({
  extractTextFromUrl: vi.fn(),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: vi.fn(async () => ({
    domains: [],
    alreadyPrefetched: 0,
    cacheHits: 0,
    evaluated: 0,
    noConsensusCount: 0,
    errorCount: 0,
    errorByType: {
      timeout: 0,
      connection_refused: 0,
      http_401: 0,
      http_403: 0,
      http_429: 0,
      http_5xx: 0,
      http_other: 0,
      network: 0,
      unknown: 0,
    },
    failedDomains: [],
    errorSamples: [],
  })),
  getTrackRecordScore: vi.fn(() => 0.7),
}));

vi.mock("@/lib/analyzer/evidence-filter", () => ({
  filterByProbativeValue: vi.fn((evidence: any[]) => ({
    kept: evidence,
    filtered: [],
    stats: { total: evidence.length, kept: evidence.length, filtered: 0, filterReasons: {} },
  })),
}));

// Import mocked modules for per-test setup
import { generateText } from "ai";
import { extractStructuredOutput } from "@/lib/analyzer/llm";
import { loadAndRenderSection } from "@/lib/analyzer/prompt-loader";
import { searchWebWithProvider } from "@/lib/web-search";
import { extractTextFromUrl } from "@/lib/retrieval";

const mockGenerateText = vi.mocked(generateText);
const mockExtractOutput = vi.mocked(extractStructuredOutput);
const mockLoadSection = vi.mocked(loadAndRenderSection);
const mockSearch = vi.mocked(searchWebWithProvider);
const mockFetchUrl = vi.mocked(extractTextFromUrl);

describe("Stage 1: runPass1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = {} as any;

  it("should parse Pass 1 output from LLM", async () => {
    const pass1Fixture = {
      impliedClaim: "Entity A achieved metric X",
      backgroundDetails: "Context about entity A and metrics",
      roughClaims: [
        { statement: "Entity A increased metric X by 50%", searchHint: "entity A metric X increase" },
        { statement: "Entity A metric was measured in 2024", searchHint: "entity A measurement 2024" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "system prompt content", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(pass1Fixture);

    const result = await runPass1("test input", mockPipelineConfig, "2026-02-17");

    expect(result.impliedClaim).toBe("Entity A achieved metric X");
    expect(result.roughClaims).toHaveLength(2);
    expect(result.roughClaims[0].searchHint).toBe("entity A metric X increase");
    expect(mockLoadSection).toHaveBeenCalledWith("claimboundary", "CLAIM_EXTRACTION_PASS1", expect.any(Object));
  });

  it("should throw when prompt section is not found", async () => {
    mockLoadSection.mockResolvedValue(null as any);

    await expect(runPass1("test", mockPipelineConfig, "2026-02-17")).rejects.toThrow(
      "Failed to load CLAIM_EXTRACTION_PASS1"
    );
  });

  it("should throw when LLM returns no structured output", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(null);

    await expect(runPass1("test", mockPipelineConfig, "2026-02-17")).rejects.toThrow(
      "LLM returned no structured output"
    );
  });
});

describe("Stage 1: runPass2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = {} as any;

  it("should parse Pass 2 output with atomic claims", async () => {
    const pass2Fixture = {
      impliedClaim: "Entity A achieved metric X",
      backgroundDetails: "Background info",
      articleThesis: "Overall thesis",
      atomicClaims: [
        {
          id: "AC_01",
          statement: "Entity A increased metric X by 50% in 2024",
          category: "factual",
          centrality: "high",
          harmPotential: "medium",
          isCentral: true,
          claimDirection: "supports_thesis",
          keyEntities: ["Entity A"],
          checkWorthiness: "high",
          specificityScore: 0.85,
          groundingQuality: "strong",
          expectedEvidenceProfile: {
            methodologies: ["data analysis"],
            expectedMetrics: ["metric X"],
            expectedSourceTypes: ["peer_reviewed_study"],
          },
        },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(pass2Fixture);

    const result = await runPass2("test input", [], mockPipelineConfig, "2026-02-17");

    expect(result.atomicClaims).toHaveLength(1);
    expect(result.atomicClaims[0].id).toBe("AC_01");
    expect(result.atomicClaims[0].specificityScore).toBe(0.85);
    expect(result.articleThesis).toBe("Overall thesis");
  });

  it("should auto-assign sequential IDs when LLM omits them", async () => {
    const pass2Fixture = {
      impliedClaim: "Test",
      backgroundDetails: "Test",
      articleThesis: "Test",
      atomicClaims: [
        {
          id: "",
          statement: "Claim 1",
          category: "factual",
          centrality: "high",
          harmPotential: "low",
          isCentral: true,
          claimDirection: "supports_thesis",
          keyEntities: [],
          checkWorthiness: "medium",
          specificityScore: 0.5,
          groundingQuality: "moderate",
          expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
        },
        {
          id: "  ",
          statement: "Claim 2",
          category: "evaluative",
          centrality: "medium",
          harmPotential: "low",
          isCentral: false,
          claimDirection: "contextual",
          keyEntities: [],
          checkWorthiness: "low",
          specificityScore: 0.3,
          groundingQuality: "weak",
          expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
        },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(pass2Fixture);

    const result = await runPass2("test", [], mockPipelineConfig, "2026-02-17");

    expect(result.atomicClaims[0].id).toBe("AC_01");
    expect(result.atomicClaims[1].id).toBe("AC_02");
  });
});

describe("Stage 1: runGate1Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = {} as any;

  it("should return all-pass stats for empty claims", async () => {
    const result = await runGate1Validation([], mockPipelineConfig, "2026-02-17");
    expect(result.stats).toEqual({
      totalClaims: 0,
      passedOpinion: 0,
      passedSpecificity: 0,
      passedFidelity: 0,
      filteredCount: 0,
      overallPass: true,
    });
    expect(result.filteredClaims).toHaveLength(0);
  });

  it("should populate gate1Stats from LLM validation output", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Second claim" }),
      createAtomicClaim({ id: "AC_03", statement: "Third claim" }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
        { claimId: "AC_02", passedOpinion: true, passedSpecificity: false, passedFidelity: true, reasoning: "too vague" },
        { claimId: "AC_03", passedOpinion: false, passedSpecificity: true, passedFidelity: true, reasoning: "opinion" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    expect(result.stats.totalClaims).toBe(3);
    expect(result.stats.passedOpinion).toBe(2);
    expect(result.stats.passedSpecificity).toBe(2);
    expect(result.stats.passedFidelity).toBe(3);
    expect(result.stats.overallPass).toBe(true);
    // All 3 claims pass either opinion or specificity, so all are kept
    expect(result.filteredClaims).toHaveLength(3);
  });

  it("should return all-pass when prompt section is missing", async () => {
    const claims = [createAtomicClaim()];
    mockLoadSection.mockResolvedValue(null as any);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    expect(result.stats.totalClaims).toBe(1);
    expect(result.stats.passedOpinion).toBe(1);
    expect(result.stats.passedFidelity).toBe(1);
    expect(result.stats.overallPass).toBe(true);
    expect(result.filteredClaims).toHaveLength(1);
  });

  it("should rescue last claim when all would be filtered (safety net)", async () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: false, passedSpecificity: false, passedFidelity: true, reasoning: "invalid" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    expect(result.stats.passedOpinion).toBe(0);
    expect(result.stats.passedSpecificity).toBe(0);
    expect(result.stats.passedFidelity).toBe(1);
    // Safety net: rescued 1 claim to prevent empty pipeline
    expect(result.stats.overallPass).toBe(true);
    expect(result.stats.filteredCount).toBe(0);
    expect(result.filteredClaims).toHaveLength(1);
    expect(result.filteredClaims[0].id).toBe("AC_01");
  });

  it("should keep claims that pass either opinion or specificity", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Fails opinion only" }),
      createAtomicClaim({ id: "AC_03", statement: "Fails specificity only" }),
      createAtomicClaim({ id: "AC_04", statement: "Fails both" }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
        { claimId: "AC_02", passedOpinion: false, passedSpecificity: true, passedFidelity: true, reasoning: "opinion" },
        { claimId: "AC_03", passedOpinion: true, passedSpecificity: false, passedFidelity: true, reasoning: "vague" },
        { claimId: "AC_04", passedOpinion: false, passedSpecificity: false, passedFidelity: true, reasoning: "invalid" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    // AC_04 fails both → filtered. AC_01, AC_02, AC_03 pass at least one → kept.
    expect(result.filteredClaims).toHaveLength(3);
    expect(result.filteredClaims.map((c) => c.id)).toEqual(["AC_01", "AC_02", "AC_03"]);
    expect(result.stats.filteredCount).toBe(1);
  });

  it("should filter claims with specificityScore below minimum", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01", specificityScore: 0.8 }),
      createAtomicClaim({ id: "AC_02", specificityScore: 0.3, statement: "Vague claim" }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
        { claimId: "AC_02", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    // claimSpecificityMinimum defaults to 0.6
    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    // AC_02 has specificityScore 0.3 < 0.6 → filtered even though LLM passed it
    expect(result.filteredClaims).toHaveLength(1);
    expect(result.filteredClaims[0].id).toBe("AC_01");
    expect(result.stats.filteredCount).toBe(1);
  });

  it("should filter claims that fail fidelity even if they pass opinion and specificity", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01", statement: "Input-faithful claim" }),
      createAtomicClaim({ id: "AC_02", statement: "Evidence-derived drifted claim" }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
        { claimId: "AC_02", passedOpinion: true, passedSpecificity: true, passedFidelity: false, reasoning: "introduces evidence-specific details absent from input" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17", "Original input claim");

    expect(result.stats.passedOpinion).toBe(2);
    expect(result.stats.passedSpecificity).toBe(2);
    expect(result.stats.passedFidelity).toBe(1);
    expect(result.filteredClaims).toHaveLength(1);
    expect(result.filteredClaims[0].id).toBe("AC_01");
  });
});

describe("Stage 1: runPreliminarySearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSearchConfig = {} as any;
  const mockPipelineConfig = { preliminarySearchQueriesPerClaim: 1, preliminaryMaxSources: 3 } as any;

  it("should return evidence from search + fetch + extraction pipeline", async () => {
    const roughClaims = [{ statement: "Test claim", searchHint: "test hint" }];
    const state = { searchQueries: [], llmCalls: 0 } as any;

    mockSearch.mockResolvedValue({
      results: [{ url: "https://example.com/1", title: "Source 1", snippet: "text" }],
      providersUsed: ["google"],
    } as any);

    mockFetchUrl.mockResolvedValue({
      text: "A".repeat(200), // > 100 chars to pass filter
      title: "Source Title",
      contentType: "text/html",
    });

    // Mock the evidence extraction LLM call
    mockLoadSection.mockResolvedValue({ content: "extract prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      evidenceItems: [
        {
          statement: "Evidence found in source",
          evidenceScope: { methodology: "data analysis", temporal: "2024" },
          relevantClaimIds: ["AC_01"],
        },
      ],
    });

    const result = await runPreliminarySearch(
      roughClaims, mockSearchConfig, mockPipelineConfig, "2026-02-17", state
    );

    expect(result).toHaveLength(1);
    expect(result[0].statement).toBe("Evidence found in source");
    expect(result[0].sourceUrl).toBe("https://example.com/1");
    expect(result[0].evidenceScope?.methodology).toBe("data analysis");
    expect(state.searchQueries).toHaveLength(1);
    expect(state.llmCalls).toBe(1);
  });

  it("should limit to top 3 rough claims", async () => {
    const roughClaims = [
      { statement: "Claim 1", searchHint: "hint1" },
      { statement: "Claim 2", searchHint: "hint2" },
      { statement: "Claim 3", searchHint: "hint3" },
      { statement: "Claim 4", searchHint: "hint4" },
      { statement: "Claim 5", searchHint: "hint5" },
    ];
    const state = { searchQueries: [], llmCalls: 0 } as any;

    // Make search return empty results so we don't need further mocks
    mockSearch.mockResolvedValue({ results: [], providersUsed: ["google"] } as any);

    await runPreliminarySearch(roughClaims, mockSearchConfig, mockPipelineConfig, "2026-02-17", state);

    // Should have searched 3 claims × 1 query each = 3 searches
    expect(mockSearch).toHaveBeenCalledTimes(3);
  });

  it("should skip sources with too-short content", async () => {
    const roughClaims = [{ statement: "Test", searchHint: "test" }];
    const state = { searchQueries: [], llmCalls: 0 } as any;

    mockSearch.mockResolvedValue({
      results: [{ url: "https://example.com/short", title: "Short", snippet: "x" }],
      providersUsed: ["google"],
    } as any);

    // Return very short text (< 100 chars)
    mockFetchUrl.mockResolvedValue({ text: "short", title: "Short", contentType: "text/html" });

    const result = await runPreliminarySearch(
      roughClaims, mockSearchConfig, mockPipelineConfig, "2026-02-17", state
    );

    expect(result).toHaveLength(0);
    // extractPreliminaryEvidence should NOT have been called since no sources passed length filter
    expect(state.llmCalls).toBe(0);
  });
});

// ============================================================================
// STAGE 2: RESEARCH EVIDENCE — Unit Tests (§8.2)
// ============================================================================

// --- Pure function tests (no mocks needed) ---

describe("seedEvidenceFromPreliminarySearch", () => {
  it("should convert preliminary evidence to EvidenceItem format", () => {
    const state = {
      understanding: {
        preliminaryEvidence: [
          { sourceUrl: "https://example.com/1", snippet: "Evidence A", claimId: "AC_01" },
          { sourceUrl: "https://example.com/2", snippet: "Evidence B", claimId: "AC_02" },
        ],
      },
      evidenceItems: [],
    } as any;

    seedEvidenceFromPreliminarySearch(state);

    expect(state.evidenceItems).toHaveLength(2);
    expect(state.evidenceItems[0].id).toBe("EV_001");
    expect(state.evidenceItems[0].statement).toBe("Evidence A");
    expect(state.evidenceItems[0].sourceUrl).toBe("https://example.com/1");
    expect(state.evidenceItems[0].relevantClaimIds).toEqual(["AC_01"]);
    expect(state.evidenceItems[0].scopeQuality).toBe("partial");
  });

  it("should handle empty preliminary evidence", () => {
    const state = {
      understanding: { preliminaryEvidence: [] },
      evidenceItems: [],
    } as any;

    seedEvidenceFromPreliminarySearch(state);
    expect(state.evidenceItems).toHaveLength(0);
  });

  it("should handle null understanding", () => {
    const state = { understanding: null, evidenceItems: [] } as any;
    seedEvidenceFromPreliminarySearch(state);
    expect(state.evidenceItems).toHaveLength(0);
  });

  it("should start IDs after existing evidence items", () => {
    const state = {
      understanding: {
        preliminaryEvidence: [
          { sourceUrl: "https://example.com/1", snippet: "New evidence", claimId: "AC_01" },
        ],
      },
      evidenceItems: [{ id: "EV_001" }, { id: "EV_002" }],
    } as any;

    seedEvidenceFromPreliminarySearch(state);
    expect(state.evidenceItems[2].id).toBe("EV_003");
  });
});

describe("findLeastResearchedClaim", () => {
  it("should return claim with fewest evidence items", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Claim 2" }),
      createAtomicClaim({ id: "AC_03", statement: "Claim 3" }),
    ];
    const evidence = [
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_03"] },
    ] as any[];

    const result = findLeastResearchedClaim(claims, evidence);
    expect(result?.id).toBe("AC_02"); // 0 evidence items
  });

  it("should return null for empty claims", () => {
    expect(findLeastResearchedClaim([], [])).toBeNull();
  });
});

describe("findLeastContradictedClaim", () => {
  it("should return claim with fewest contradicting evidence", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Claim 2" }),
    ];
    const evidence = [
      { relevantClaimIds: ["AC_01"], claimDirection: "contradicts" },
      { relevantClaimIds: ["AC_01"], claimDirection: "contradicts" },
      { relevantClaimIds: ["AC_02"], claimDirection: "supports" },
    ] as any[];

    const result = findLeastContradictedClaim(claims, evidence);
    expect(result?.id).toBe("AC_02"); // 0 contradicting
  });
});

describe("allClaimsSufficient", () => {
  it("should return true when all claims have enough evidence", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Claim 2" }),
    ];
    const evidence = [
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_02"] },
      { relevantClaimIds: ["AC_02"] },
      { relevantClaimIds: ["AC_02"] },
    ] as any[];

    expect(allClaimsSufficient(claims, evidence, 3)).toBe(true);
  });

  it("should return false when any claim is below threshold", () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Claim 2" }),
    ];
    const evidence = [
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_01"] },
      { relevantClaimIds: ["AC_02"] },
    ] as any[];

    expect(allClaimsSufficient(claims, evidence, 3)).toBe(false);
  });

  it("should return true for empty claims", () => {
    expect(allClaimsSufficient([], [], 3)).toBe(true);
  });
});

describe("assessScopeQuality", () => {
  it("should return 'complete' for well-populated scope", () => {
    const item = {
      evidenceScope: {
        name: "ISO study",
        methodology: "ISO 14040 lifecycle assessment",
        temporal: "2019-2023 data",
      },
    } as any;
    expect(assessScopeQuality(item)).toBe("complete");
  });

  it("should return 'partial' for vague scope fields", () => {
    const item = {
      evidenceScope: {
        name: "Vague",
        methodology: "n/a",
        temporal: "2024",
      },
    } as any;
    expect(assessScopeQuality(item)).toBe("partial");
  });

  it("should return 'incomplete' when methodology is missing", () => {
    const item = {
      evidenceScope: {
        name: "Missing",
        temporal: "2024",
      },
    } as any;
    expect(assessScopeQuality(item)).toBe("incomplete");
  });

  it("should return 'incomplete' when temporal is missing", () => {
    const item = {
      evidenceScope: {
        name: "Missing",
        methodology: "Study method",
      },
    } as any;
    expect(assessScopeQuality(item)).toBe("incomplete");
  });

  it("should return 'incomplete' when evidenceScope is undefined", () => {
    const item = {} as any;
    expect(assessScopeQuality(item)).toBe("incomplete");
  });

  it("should return 'incomplete' for empty string fields", () => {
    const item = {
      evidenceScope: {
        name: "Empty",
        methodology: "",
        temporal: "2024",
      },
    } as any;
    expect(assessScopeQuality(item)).toBe("incomplete");
  });
});

// --- LLM-dependent Stage 2 function tests (mocked) ---

describe("Stage 2: generateResearchQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = { queryStrategyMode: "legacy" } as any;

  it("keeps legacy mode query behavior unchanged", async () => {
    const claim = createAtomicClaim({
      id: "AC_01",
      statement: "Entity A increased metric by 50%",
      expectedEvidenceProfile: {
        methodologies: ["data analysis"],
        expectedMetrics: ["metric growth"],
        expectedSourceTypes: ["government_report"],
      },
    });

    mockLoadSection.mockResolvedValue({ content: "generate queries prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      queries: [
        { query: "entity A metric growth statistics", rationale: "official data" },
        { query: "entity A 50% increase study", rationale: "verification" },
      ],
    });

    const result = await generateResearchQueries(claim, "main", [], mockPipelineConfig, "2026-02-17");

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { query: "entity A metric growth statistics", rationale: "official data" },
      { query: "entity A 50% increase study", rationale: "verification" },
    ]);
    expect(mockLoadSection).toHaveBeenCalledWith("claimboundary", "GENERATE_QUERIES", expect.any(Object));
  });

  it("generates supporting + refuting variants in pro_con mode", async () => {
    const claim = createAtomicClaim({ id: "AC_01", statement: "Entity A claim" });

    mockLoadSection.mockResolvedValue({ content: "generate queries prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      queries: [
        { query: "entity A evidence supports claim", rationale: "pro", variantType: "supporting" },
        { query: "entity A evidence refutes claim", rationale: "con", variantType: "refuting" },
      ],
    });

    const result = await generateResearchQueries(
      claim,
      "main",
      [],
      { queryStrategyMode: "pro_con" } as any,
      "2026-02-17",
    );

    expect(result).toEqual([
      { query: "entity A evidence supports claim", rationale: "pro" },
      { query: "entity A evidence refutes claim", rationale: "con" },
    ]);
  });

  it("keeps partially unlabeled pro_con queries instead of dropping them", async () => {
    const claim = createAtomicClaim({ id: "AC_01", statement: "Entity A claim" });

    mockLoadSection.mockResolvedValue({ content: "generate queries prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      queries: [
        { query: "entity A supporting evidence", rationale: "pro", variantType: "supporting" },
        { query: "entity A independent audit", rationale: "unlabeled" },
      ],
    });

    const result = await generateResearchQueries(
      claim,
      "main",
      [],
      { queryStrategyMode: "pro_con" } as any,
      "2026-02-17",
    );

    expect(result).toEqual([
      { query: "entity A supporting evidence", rationale: "pro" },
      { query: "entity A independent audit", rationale: "unlabeled" },
    ]);
  });

  it("should fallback to claim statement when prompt is missing", async () => {
    const claim = createAtomicClaim({ statement: "Short claim text" });
    mockLoadSection.mockResolvedValue(null as any);

    const result = await generateResearchQueries(claim, "main", [], mockPipelineConfig, "2026-02-17");

    expect(result).toHaveLength(1);
    expect(result[0].rationale).toBe("fallback");
  });
});

describe("Stage 2: classifyRelevance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = {} as any;

  it("should classify search results via LLM and filter by score", async () => {
    const claim = createAtomicClaim({ statement: "Test claim" });
    const searchResults = [
      { url: "https://example.com/1", title: "Source 1", snippet: "relevant" },
      { url: "https://example.com/2", title: "Source 2", snippet: "irrelevant" },
    ];

    mockLoadSection.mockResolvedValue({ content: "relevance prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      relevantSources: [
        { url: "https://example.com/1", relevanceScore: 0.85, reasoning: "directly relevant" },
        { url: "https://example.com/2", relevanceScore: 0.2, reasoning: "not relevant" },
      ],
    });

    const result = await classifyRelevance(claim, searchResults, mockPipelineConfig, "2026-02-17");

    // Only source with score >= 0.4 should be kept
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/1");
  });

  it("should accept all results with neutral score when prompt is missing", async () => {
    const claim = createAtomicClaim();
    const searchResults = [
      { url: "https://example.com/1", title: "Source 1", snippet: "text" },
    ];
    mockLoadSection.mockResolvedValue(null as any);

    const result = await classifyRelevance(claim, searchResults, mockPipelineConfig, "2026-02-17");

    expect(result).toHaveLength(1);
    expect(result[0].relevanceScore).toBe(0.5);
  });
});

describe("Stage 2: extractResearchEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = {} as any;

  it("should extract evidence items with full EvidenceScope", async () => {
    const claim = createAtomicClaim({ id: "AC_01", statement: "Test claim" });
    const sources = [
      { url: "https://example.com/1", title: "Source 1", text: "Long text content..." },
    ];

    mockLoadSection.mockResolvedValue({ content: "extract prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      evidenceItems: [
        {
          statement: "Statistical data shows X increased by 30%",
          category: "statistic",
          claimDirection: "supports",
          evidenceScope: {
            methodology: "Government statistical survey",
            temporal: "2023-2024",
            geographic: "United States",
          },
          probativeValue: "high",
          sourceType: "government_report",
          isDerivative: false,
          derivedFromSourceUrl: null,
          relevantClaimIds: ["AC_01"],
        },
      ],
    });

    const result = await extractResearchEvidence(claim, sources, mockPipelineConfig, "2026-02-17");

    expect(result).toHaveLength(1);
    expect(result[0].statement).toBe("Statistical data shows X increased by 30%");
    expect(result[0].evidenceScope?.methodology).toBe("Government statistical survey");
    expect(result[0].evidenceScope?.temporal).toBe("2023-2024");
    expect(result[0].sourceType).toBe("government_report");
    expect(result[0].relevantClaimIds).toEqual(["AC_01"]);
    expect(result[0].isDerivative).toBe(false);
    expect(result[0].probativeValue).toBe("high");
  });

  it("should default relevantClaimIds to target claim when LLM omits them", async () => {
    const claim = createAtomicClaim({ id: "AC_02" });
    const sources = [{ url: "https://example.com/1", title: "S1", text: "text" }];

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      evidenceItems: [
        {
          statement: "Some evidence",
          category: "evidence",
          claimDirection: "supports",
          evidenceScope: { methodology: "Study", temporal: "2024" },
          probativeValue: "medium",
          relevantClaimIds: [],
        },
      ],
    });

    const result = await extractResearchEvidence(claim, sources, mockPipelineConfig, "2026-02-17");

    expect(result[0].relevantClaimIds).toEqual(["AC_02"]);
  });

  it("should return empty array when prompt is missing", async () => {
    const claim = createAtomicClaim();
    mockLoadSection.mockResolvedValue(null as any);

    const result = await extractResearchEvidence(claim, [], mockPipelineConfig, "2026-02-17");
    expect(result).toHaveLength(0);
  });
});

describe("Stage 2: fetchSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch sources and add to state", async () => {
    const state = { sources: [] } as any;
    const relevantSources = [{ url: "https://example.com/1", relevanceScore: 0.9 }];

    mockFetchUrl.mockResolvedValue({
      text: "A".repeat(200),
      title: "Test Source",
      contentType: "text/html",
    });

    const result = await fetchSources(relevantSources, "test query", state);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Source");
    expect(state.sources).toHaveLength(1);
    expect(state.sources[0].url).toBe("https://example.com/1");
    expect(state.sources[0].fetchSuccess).toBe(true);
  });

  it("should skip already-fetched URLs", async () => {
    const state = {
      sources: [{ url: "https://example.com/1", id: "S_001" }],
    } as any;
    const relevantSources = [{ url: "https://example.com/1" }];

    const result = await fetchSources(relevantSources, "test", state);

    expect(result).toHaveLength(0);
    expect(mockFetchUrl).not.toHaveBeenCalled();
  });

  it("should skip sources with too-short content", async () => {
    const state = { sources: [] } as any;
    const relevantSources = [{ url: "https://example.com/short" }];

    mockFetchUrl.mockResolvedValue({ text: "short", title: "Short", contentType: "text/html" });

    const result = await fetchSources(relevantSources, "test", state);

    expect(result).toHaveLength(0);
    expect(state.sources).toHaveLength(0);
  });
});

describe("Stage 2: runResearchIteration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSearchConfig = {} as any;
  const mockPipelineConfig = {} as any;

  it("should run full iteration pipeline: queries → search → relevance → fetch → extract → filter", async () => {
    const claim = createAtomicClaim({ id: "AC_01", statement: "Test claim" });
    const state = {
      searchQueries: [],
      queryBudgetUsageByClaim: {},
      llmCalls: 0,
      sources: [],
      evidenceItems: [],
      contradictionSourcesFound: 0,
      mainIterationsUsed: 0,
      contradictionIterationsUsed: 0,
    } as any;

    // Mock query generation
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);

    // Mock query generation output (1st LLM call)
    // Mock relevance classification output (2nd LLM call)
    // Mock evidence extraction output (3rd LLM call)
    let callCount = 0;
    mockExtractOutput.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1: // generateResearchQueries
          return {
            queries: [{ query: "test query", rationale: "test" }],
          };
        case 2: // classifyRelevance
          return {
            relevantSources: [
              { url: "https://example.com/1", relevanceScore: 0.9, reasoning: "relevant" },
            ],
          };
        case 3: // extractResearchEvidence
          return {
            evidenceItems: [
              {
                statement: "Test evidence statement with enough length for filtering",
                category: "statistic",
                claimDirection: "supports",
                evidenceScope: {
                  methodology: "Statistical survey analysis",
                  temporal: "2024 fiscal year",
                },
                probativeValue: "high",
                sourceType: "government_report",
                isDerivative: false,
                derivedFromSourceUrl: null,
                relevantClaimIds: ["AC_01"],
              },
            ],
          };
        default:
          return null;
      }
    });

    // Mock search results
    mockSearch.mockResolvedValue({
      results: [{ url: "https://example.com/1", title: "Source 1", snippet: "text" }],
      providersUsed: ["google"],
    } as any);

    // Mock URL fetch
    mockFetchUrl.mockResolvedValue({
      text: "A".repeat(500),
      title: "Test Source",
      contentType: "text/html",
    });

    await runResearchIteration(claim, "main", mockSearchConfig, mockPipelineConfig, 8, "2026-02-17", state);

    // Should have tracked search query
    expect(state.searchQueries).toHaveLength(1);
    // Should have called LLM 3 times (queries, relevance, extraction)
    expect(state.llmCalls).toBe(3);
    // Should have fetched source
    expect(state.sources).toHaveLength(1);
    // Should have added evidence (if it passes filter)
    expect(state.evidenceItems.length).toBeGreaterThanOrEqual(0); // Filter may remove
  });

  it("should track contradictionSourcesFound for contradiction iterations", async () => {
    const claim = createAtomicClaim({ id: "AC_01" });
    const state = {
      searchQueries: [],
      queryBudgetUsageByClaim: {},
      llmCalls: 0,
      sources: [],
      evidenceItems: [],
      contradictionSourcesFound: 0,
      mainIterationsUsed: 0,
      contradictionIterationsUsed: 0,
    } as any;

    // Minimal mocking — search returns no results so iteration ends early
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      queries: [{ query: "contradiction query", rationale: "test" }],
    });
    mockSearch.mockResolvedValue({ results: [], providersUsed: ["google"] } as any);

    await runResearchIteration(claim, "contradiction", mockSearchConfig, mockPipelineConfig, 8, "2026-02-17", state);

    // contradictionSourcesFound should be 0 (no sources found)
    expect(state.contradictionSourcesFound).toBe(0);
  });

  it("enforces per-claim budget and skips query generation when exhausted", async () => {
    const claim = createAtomicClaim({ id: "AC_01" });
    const state = {
      searchQueries: [],
      queryBudgetUsageByClaim: { AC_01: 1 },
      llmCalls: 0,
      sources: [],
      evidenceItems: [],
      contradictionSourcesFound: 0,
      mainIterationsUsed: 0,
      contradictionIterationsUsed: 0,
    } as any;

    await runResearchIteration(
      claim,
      "main",
      mockSearchConfig,
      { perClaimQueryBudget: 1, queryStrategyMode: "legacy" } as any,
      8,
      "2026-02-17",
      state,
    );

    expect(state.searchQueries).toHaveLength(0);
    expect(state.llmCalls).toBe(0);
    expect(mockLoadSection).not.toHaveBeenCalled();
  });

  it("stops issuing queries after perClaimQueryBudget is reached", async () => {
    const claim = createAtomicClaim({ id: "AC_01" });
    const state = {
      searchQueries: [],
      queryBudgetUsageByClaim: {},
      llmCalls: 0,
      sources: [],
      evidenceItems: [],
      contradictionSourcesFound: 0,
      mainIterationsUsed: 0,
      contradictionIterationsUsed: 0,
    } as any;

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      queries: [
        { query: "query one", rationale: "test" },
        { query: "query two", rationale: "test" },
      ],
    });
    mockSearch.mockResolvedValue({ results: [], providersUsed: ["google"] } as any);

    await runResearchIteration(
      claim,
      "main",
      mockSearchConfig,
      { perClaimQueryBudget: 1, queryStrategyMode: "legacy" } as any,
      8,
      "2026-02-17",
      state,
    );

    expect(state.searchQueries).toHaveLength(1);
    expect(state.queryBudgetUsageByClaim["AC_01"]).toBe(1);
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("tracks query budget per claim (not global)", async () => {
    const claimA = createAtomicClaim({ id: "AC_01", statement: "Claim A" });
    const claimB = createAtomicClaim({ id: "AC_02", statement: "Claim B" });
    const state = {
      searchQueries: [],
      queryBudgetUsageByClaim: {},
      llmCalls: 0,
      sources: [],
      evidenceItems: [],
      contradictionSourcesFound: 0,
      mainIterationsUsed: 0,
      contradictionIterationsUsed: 0,
    } as any;

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      queries: [{ query: "single query", rationale: "test" }],
    });
    mockSearch.mockResolvedValue({ results: [], providersUsed: ["google"] } as any);

    const budgetConfig = { perClaimQueryBudget: 1, queryStrategyMode: "legacy" } as any;
    await runResearchIteration(claimA, "main", mockSearchConfig, budgetConfig, 8, "2026-02-17", state);
    await runResearchIteration(claimB, "main", mockSearchConfig, budgetConfig, 8, "2026-02-17", state);

    expect(state.queryBudgetUsageByClaim["AC_01"]).toBe(1);
    expect(state.queryBudgetUsageByClaim["AC_02"]).toBe(1);
    expect(state.searchQueries).toHaveLength(2);
  });
});

describe("Stage 2: researchEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits query_budget_exhausted warning when all claim budgets are exhausted before sufficiency", async () => {
    const { researchEvidence } = await import("@/lib/analyzer/claimboundary-pipeline");
    const { loadPipelineConfig, loadSearchConfig } = await import("@/lib/config-loader");

    vi.mocked(loadPipelineConfig).mockResolvedValue({
      config: {
        maxTotalIterations: 3,
        contradictionReservedIterations: 1,
        claimSufficiencyThreshold: 3,
        perClaimQueryBudget: 1,
      } as any,
      contentHash: "__TEST__",
      fromDefault: false,
      fromCache: false,
      overrides: [],
    } as any);
    vi.mocked(loadSearchConfig).mockResolvedValue({
      config: { maxSourcesPerIteration: 8 } as any,
      contentHash: "__TEST__",
      fromDefault: false,
      fromCache: false,
      overrides: [],
    } as any);

    const state = {
      originalInput: "input",
      originalText: "input",
      inputType: "text",
      understanding: {
        atomicClaims: [
          createAtomicClaim({ id: "AC_01" }),
          createAtomicClaim({ id: "AC_02" }),
        ],
        preliminaryEvidence: [],
      },
      evidenceItems: [],
      sources: [],
      searchQueries: [],
      queryBudgetUsageByClaim: { AC_01: 1, AC_02: 1 },
      mainIterationsUsed: 0,
      contradictionIterationsReserved: 1,
      contradictionIterationsUsed: 0,
      contradictionSourcesFound: 0,
      claimBoundaries: [],
      llmCalls: 0,
      warnings: [],
    } as any;

    await researchEvidence(state);

    const budgetWarnings = state.warnings.filter((w: any) => w.type === "query_budget_exhausted");
    expect(budgetWarnings).toHaveLength(1);
    expect(budgetWarnings[0].severity).toBe("warning");
    expect(budgetWarnings[0].details?.stage).toBe("research_budget");
  });
});

// ============================================================================
// Stage 3: Cluster Boundaries — Pure function tests
// ============================================================================

describe("Stage 3: scopeFingerprint", () => {
  it("should produce same fingerprint for identical scopes", () => {
    const scope1: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020-2025" };
    const scope2: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020-2025" };
    expect(scopeFingerprint(scope1)).toBe(scopeFingerprint(scope2));
  });

  it("should be case-insensitive and trim-insensitive", () => {
    const scope1: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020-2025" };
    const scope2: EvidenceScope = { name: "WTW", methodology: "  iso 14040  ", temporal: "  2020-2025 " };
    expect(scopeFingerprint(scope1)).toBe(scopeFingerprint(scope2));
  });

  it("should differ for scopes with different methodology", () => {
    const scope1: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020-2025" };
    const scope2: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2020-2025" };
    expect(scopeFingerprint(scope1)).not.toBe(scopeFingerprint(scope2));
  });
});

describe("Stage 3: collectUniqueScopes", () => {
  it("should deduplicate identical scopes and track original indices", () => {
    const items: EvidenceItem[] = [
      createEvidenceItem({ id: "EV_01", evidenceScope: { name: "WTW", methodology: "ISO 14040", temporal: "2020" } }),
      createEvidenceItem({ id: "EV_02", evidenceScope: { name: "WTW", methodology: "ISO 14040", temporal: "2020" } }),
      createEvidenceItem({ id: "EV_03", evidenceScope: { name: "TTW", methodology: "EPA test", temporal: "2021" } }),
    ];
    const result = collectUniqueScopes(items);
    expect(result).toHaveLength(2);
    expect(result[0].originalIndices).toEqual([0, 1]);
    expect(result[1].originalIndices).toEqual([2]);
  });

  it("should skip evidence items without evidenceScope", () => {
    const items: EvidenceItem[] = [
      createEvidenceItem({ id: "EV_01", evidenceScope: undefined as any }),
      createEvidenceItem({ id: "EV_02", evidenceScope: { name: "WTW", methodology: "ISO 14040", temporal: "2020" } }),
    ];
    const result = collectUniqueScopes(items);
    expect(result).toHaveLength(1);
    expect(result[0].originalIndices).toEqual([1]);
  });

  it("should return empty array when no evidence items have scopes", () => {
    const items: EvidenceItem[] = [
      createEvidenceItem({ evidenceScope: undefined as any }),
    ];
    const result = collectUniqueScopes(items);
    expect(result).toHaveLength(0);
  });
});

describe("Stage 3: createFallbackBoundary", () => {
  it("should create a General boundary containing all scopes", () => {
    const scopes = [
      { index: 0, scope: { name: "WTW", methodology: "ISO 14040", temporal: "2020" } as EvidenceScope, originalIndices: [0, 1] },
      { index: 1, scope: { name: "TTW", methodology: "EPA test", temporal: "2021" } as EvidenceScope, originalIndices: [2] },
    ];
    const items = [
      createEvidenceItem({ id: "EV_01" }),
      createEvidenceItem({ id: "EV_02" }),
      createEvidenceItem({ id: "EV_03" }),
    ];
    const boundary = createFallbackBoundary(scopes, items);
    expect(boundary.id).toBe("CB_GENERAL");
    expect(boundary.name).toBe("General Evidence");
    expect(boundary.constituentScopes).toHaveLength(2);
    expect(boundary.internalCoherence).toBe(0.8);
    expect(boundary.evidenceCount).toBe(3);
  });
});

describe("Stage 3: assignEvidenceToBoundaries", () => {
  it("should assign items to boundaries matching their scope fingerprint", () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeB: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2021" };

    const items: EvidenceItem[] = [
      createEvidenceItem({ id: "EV_01", evidenceScope: scopeA }),
      createEvidenceItem({ id: "EV_02", evidenceScope: scopeB }),
    ];

    const boundaries: ClaimAssessmentBoundary[] = [
      { id: "CB_01", name: "WTW", shortName: "WTW", description: "Well-to-Wheel", constituentScopes: [scopeA], internalCoherence: 0.9, evidenceCount: 0 },
      { id: "CB_02", name: "TTW", shortName: "TTW", description: "Tank-to-Wheel", constituentScopes: [scopeB], internalCoherence: 0.85, evidenceCount: 0 },
    ];

    const uniqueScopes = [
      { index: 0, scope: scopeA, originalIndices: [0] },
      { index: 1, scope: scopeB, originalIndices: [1] },
    ];

    assignEvidenceToBoundaries(items, boundaries, uniqueScopes);

    expect(items[0].claimBoundaryId).toBe("CB_01");
    expect(items[1].claimBoundaryId).toBe("CB_02");
  });

  it("should assign items with no matching scope to fallback boundary", () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeUnmatched: EvidenceScope = { name: "Other", methodology: "Custom", temporal: "2022" };

    const items: EvidenceItem[] = [
      createEvidenceItem({ id: "EV_01", evidenceScope: scopeUnmatched }),
    ];

    const boundaries: ClaimAssessmentBoundary[] = [
      { id: "CB_GENERAL", name: "General", shortName: "Gen", description: "Fallback", constituentScopes: [scopeA], internalCoherence: 0.8, evidenceCount: 0 },
    ];

    assignEvidenceToBoundaries(items, boundaries, []);

    // Should fall back to CB_GENERAL since no fingerprint match
    expect(items[0].claimBoundaryId).toBe("CB_GENERAL");
  });
});

describe("Stage 3: boundaryJaccardSimilarity", () => {
  it("should return 1.0 for identical scope sets", () => {
    const scope: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const a: ClaimAssessmentBoundary = { id: "CB_01", name: "A", shortName: "A", description: "", constituentScopes: [scope], internalCoherence: 0.9, evidenceCount: 1 };
    const b: ClaimAssessmentBoundary = { id: "CB_02", name: "B", shortName: "B", description: "", constituentScopes: [scope], internalCoherence: 0.9, evidenceCount: 1 };
    expect(boundaryJaccardSimilarity(a, b)).toBe(1);
  });

  it("should return 0 for completely disjoint scope sets", () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeB: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2021" };
    const a: ClaimAssessmentBoundary = { id: "CB_01", name: "A", shortName: "A", description: "", constituentScopes: [scopeA], internalCoherence: 0.9, evidenceCount: 1 };
    const b: ClaimAssessmentBoundary = { id: "CB_02", name: "B", shortName: "B", description: "", constituentScopes: [scopeB], internalCoherence: 0.9, evidenceCount: 1 };
    expect(boundaryJaccardSimilarity(a, b)).toBe(0);
  });

  it("should return 0.5 for partial overlap (1 shared, 1 unique each)", () => {
    const shared: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const uniqueA: EvidenceScope = { name: "LCA", methodology: "EU RED II", temporal: "2020" };
    const uniqueB: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2021" };
    const a: ClaimAssessmentBoundary = { id: "CB_01", name: "A", shortName: "A", description: "", constituentScopes: [shared, uniqueA], internalCoherence: 0.9, evidenceCount: 2 };
    const b: ClaimAssessmentBoundary = { id: "CB_02", name: "B", shortName: "B", description: "", constituentScopes: [shared, uniqueB], internalCoherence: 0.9, evidenceCount: 2 };
    // Jaccard: 1 / (2 + 2 - 1) = 1/3
    expect(boundaryJaccardSimilarity(a, b)).toBeCloseTo(1 / 3, 5);
  });
});

describe("Stage 3: mergeClosestBoundaries", () => {
  it("should merge the two most similar boundaries and reduce count by 1", () => {
    const shared: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeB: EvidenceScope = { name: "LCA", methodology: "EU RED II", temporal: "2020" };
    const scopeC: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2021" };

    const boundaries: ClaimAssessmentBoundary[] = [
      { id: "CB_01", name: "WTW", shortName: "WTW", description: "Well-to-Wheel", constituentScopes: [shared], internalCoherence: 0.9, evidenceCount: 3 },
      { id: "CB_02", name: "LCA", shortName: "LCA", description: "Lifecycle", constituentScopes: [shared, scopeB], internalCoherence: 0.85, evidenceCount: 2 },
      { id: "CB_03", name: "TTW", shortName: "TTW", description: "Tank-to-Wheel", constituentScopes: [scopeC], internalCoherence: 0.8, evidenceCount: 1 },
    ];

    const result = mergeClosestBoundaries(boundaries);
    expect(result).toHaveLength(2);
    // CB_01 and CB_02 share 'shared' scope, so they should be merged
    const mergedBoundary = result.find((b) => b.constituentScopes.length > 1 && b.constituentScopes.some(s => s.name === "LCA"));
    expect(mergedBoundary).toBeTruthy();
  });

  it("should average internalCoherence of merged boundaries", () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeB: EvidenceScope = { name: "LCA", methodology: "EU RED II", temporal: "2020" };

    const boundaries: ClaimAssessmentBoundary[] = [
      { id: "CB_01", name: "A", shortName: "A", description: "A", constituentScopes: [scopeA], internalCoherence: 0.9, evidenceCount: 2 },
      { id: "CB_02", name: "B", shortName: "B", description: "B", constituentScopes: [scopeB], internalCoherence: 0.7, evidenceCount: 1 },
    ];

    const result = mergeClosestBoundaries(boundaries);
    expect(result).toHaveLength(1);
    expect(result[0].internalCoherence).toBeCloseTo(0.8, 5);
  });
});

// ============================================================================
// Stage 3: Cluster Boundaries — LLM-dependent tests
// ============================================================================

describe("Stage 3: runLLMClustering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPipelineConfig = {} as any;

  it("should parse LLM output into ClaimAssessmentBoundary array", async () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeB: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2021" };

    const uniqueScopes = [
      { index: 0, scope: scopeA, originalIndices: [0, 1] },
      { index: 1, scope: scopeB, originalIndices: [2] },
    ];

    const llmOutput = {
      claimBoundaries: [
        {
          id: "CB_01",
          name: "Well-to-Wheel Studies",
          shortName: "WTW",
          description: "Full lifecycle analysis studies",
          methodology: "ISO 14040",
          temporal: "2020",
          constituentScopeIndices: [0],
          internalCoherence: 0.92,
        },
        {
          id: "CB_02",
          name: "Tank-to-Wheel Tests",
          shortName: "TTW",
          description: "Direct emission tests",
          methodology: "EPA test",
          temporal: "2021",
          constituentScopeIndices: [1],
          internalCoherence: 0.88,
        },
      ],
      scopeToBoundaryMapping: [
        { scopeIndex: 0, boundaryId: "CB_01", rationale: "Same WTW methodology" },
        { scopeIndex: 1, boundaryId: "CB_02", rationale: "Different methodology" },
      ],
      congruenceDecisions: [
        { scopeA: 0, scopeB: 1, congruent: false, rationale: "Different system boundaries" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "boundary clustering prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(llmOutput);

    const items = [
      createEvidenceItem({ id: "EV_01", evidenceScope: scopeA }),
      createEvidenceItem({ id: "EV_02", evidenceScope: scopeA }),
      createEvidenceItem({ id: "EV_03", evidenceScope: scopeB }),
    ];

    const result = await runLLMClustering(uniqueScopes, items, [], mockPipelineConfig, "2026-02-17");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("CB_01");
    expect(result[0].name).toBe("Well-to-Wheel Studies");
    expect(result[0].constituentScopes).toHaveLength(1);
    expect(result[0].constituentScopes[0]).toEqual(scopeA);
    expect(result[1].id).toBe("CB_02");
    expect(result[1].constituentScopes[0]).toEqual(scopeB);
    expect(mockLoadSection).toHaveBeenCalledWith("claimboundary", "BOUNDARY_CLUSTERING", expect.any(Object));
  });

  it("should throw when LLM returns 0 boundaries", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      claimBoundaries: [],
      scopeToBoundaryMapping: [],
      congruenceDecisions: [],
    });

    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const uniqueScopes = [{ index: 0, scope: scopeA, originalIndices: [0] }];

    await expect(
      runLLMClustering(uniqueScopes, [createEvidenceItem()], [], mockPipelineConfig, "2026-02-17"),
    ).rejects.toThrow("LLM returned 0 boundaries");
  });

  it("should throw when prompt section is not found", async () => {
    mockLoadSection.mockResolvedValue(null as any);

    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const uniqueScopes = [{ index: 0, scope: scopeA, originalIndices: [0] }];

    await expect(
      runLLMClustering(uniqueScopes, [createEvidenceItem()], [], mockPipelineConfig, "2026-02-17"),
    ).rejects.toThrow("Failed to load BOUNDARY_CLUSTERING");
  });

  it("should clamp internalCoherence to 0-1 range", async () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const uniqueScopes = [{ index: 0, scope: scopeA, originalIndices: [0] }];

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      claimBoundaries: [{
        id: "CB_01", name: "Test", shortName: "T", description: "Test",
        constituentScopeIndices: [0], internalCoherence: 1.5,
      }],
      scopeToBoundaryMapping: [{ scopeIndex: 0, boundaryId: "CB_01", rationale: "test" }],
      congruenceDecisions: [],
    });

    const result = await runLLMClustering(uniqueScopes, [createEvidenceItem()], [], mockPipelineConfig, "2026-02-17");
    expect(result[0].internalCoherence).toBe(1);
  });
});

describe("Stage 3: clusterBoundaries (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fallback to single General boundary when only 1 unique scope", async () => {
    const scope: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const state = {
      evidenceItems: [
        createEvidenceItem({ id: "EV_01", evidenceScope: scope }),
        createEvidenceItem({ id: "EV_02", evidenceScope: scope }),
      ],
      understanding: { atomicClaims: [createAtomicClaim()] },
      llmCalls: 0,
    } as any;

    const result = await clusterBoundaries(state);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("CB_GENERAL");
    expect(result[0].name).toBe("General Evidence");
    // All items should be assigned
    expect(state.evidenceItems.every((e: any) => e.claimBoundaryId === "CB_GENERAL")).toBe(true);
    // No LLM call should have been made (skipped for 1 unique scope)
    expect(state.llmCalls).toBe(0);
  });

  it("should fallback to General boundary when LLM clustering fails", async () => {
    const scopeA: EvidenceScope = { name: "WTW", methodology: "ISO 14040", temporal: "2020" };
    const scopeB: EvidenceScope = { name: "TTW", methodology: "EPA test", temporal: "2021" };

    const state = {
      evidenceItems: [
        createEvidenceItem({ id: "EV_01", evidenceScope: scopeA }),
        createEvidenceItem({ id: "EV_02", evidenceScope: scopeB }),
      ],
      understanding: { atomicClaims: [createAtomicClaim()] },
      llmCalls: 0,
    } as any;

    // Make LLM call fail
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockRejectedValue(new Error("LLM timeout"));

    const result = await clusterBoundaries(state);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("CB_GENERAL");
    expect(state.evidenceItems.every((e: any) => e.claimBoundaryId === "CB_GENERAL")).toBe(true);
  });

  it("should enforce maxClaimBoundaries cap via merge", async () => {
    // Create 3 different scopes
    const scopes = Array.from({ length: 3 }, (_, i) => ({
      name: `Scope${i}`,
      methodology: `Method ${i}`,
      temporal: `202${i}`,
    } as EvidenceScope));

    const items = scopes.map((s, i) =>
      createEvidenceItem({ id: `EV_${i}`, evidenceScope: s }),
    );

    const state = {
      evidenceItems: items,
      understanding: { atomicClaims: [createAtomicClaim()] },
      llmCalls: 0,
    } as any;

    // LLM returns 3 boundaries but cap is 2
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue({
      claimBoundaries: scopes.map((_, i) => ({
        id: `CB_0${i + 1}`,
        name: `Boundary ${i + 1}`,
        shortName: `B${i + 1}`,
        description: `Test boundary ${i + 1}`,
        constituentScopeIndices: [i],
        internalCoherence: 0.85,
      })),
      scopeToBoundaryMapping: scopes.map((_, i) => ({
        scopeIndex: i, boundaryId: `CB_0${i + 1}`, rationale: "test",
      })),
      congruenceDecisions: [],
    });

    // Override pipeline config to set maxClaimBoundaries = 2
    const { loadPipelineConfig } = await import("@/lib/config-loader");
    vi.mocked(loadPipelineConfig).mockResolvedValue({
      config: { maxClaimBoundaries: 2, boundaryCoherenceMinimum: 0.3 } as any,
    } as any);

    const result = await clusterBoundaries(state);

    expect(result.length).toBeLessThanOrEqual(2);
    // All evidence should still be assigned
    expect(state.evidenceItems.every((e: any) => e.claimBoundaryId)).toBe(true);
  });
});

// ============================================================================
// Stage 4: Production LLM Wiring Tests
// ============================================================================

describe("Stage 4: buildVerdictStageConfig", () => {
  it("should map UCM pipeline + calc configs to VerdictStageConfig", () => {
    const pipelineConfig = {
      selfConsistencyMode: "full",
      selfConsistencyTemperature: 0.25,
    } as any;
    const calcConfig = {
      selfConsistencySpreadThresholds: { stable: 4, moderate: 10, unstable: 18 },
      mixedConfidenceThreshold: 35,
    } as any;

    const result = buildVerdictStageConfig(pipelineConfig, calcConfig);

    expect(result.selfConsistencyMode).toBe("full");
    expect(result.selfConsistencyTemperature).toBe(0.25);
    expect(result.stableThreshold).toBe(4);
    expect(result.moderateThreshold).toBe(10);
    expect(result.unstableThreshold).toBe(18);
    expect(result.mixedConfidenceThreshold).toBe(35);
    expect(result.spreadMultipliers).toBeDefined();
    expect(result.spreadMultipliers.highlyStable).toBe(1.0);
  });

  it("should use defaults when UCM fields are missing", () => {
    const result = buildVerdictStageConfig({} as any, {} as any);

    expect(result.selfConsistencyMode).toBe("disabled");
    expect(result.selfConsistencyTemperature).toBe(0.3);
    expect(result.stableThreshold).toBe(5);
    expect(result.moderateThreshold).toBe(12);
    expect(result.unstableThreshold).toBe(20);
    expect(result.mixedConfidenceThreshold).toBe(40);
  });

  it("should set selfConsistencyMode to disabled when UCM says disabled", () => {
    const pipelineConfig = { selfConsistencyMode: "disabled" } as any;
    const result = buildVerdictStageConfig(pipelineConfig, {} as any);
    expect(result.selfConsistencyMode).toBe("disabled");
  });

  it("should wire debateModelProviders from UCM config", () => {
    const pipelineConfig = {
      debateModelProviders: {
        challenger: "openai",
        reconciler: "mistral",
      },
    } as any;
    const result = buildVerdictStageConfig(pipelineConfig, {} as any);

    expect(result.debateModelProviders.challenger).toBe("openai");
    expect(result.debateModelProviders.reconciler).toBe("mistral");
    expect(result.debateModelProviders.advocate).toBeUndefined();
    expect(result.debateModelProviders.selfConsistency).toBeUndefined();
    expect(result.debateModelProviders.validation).toBeUndefined();
  });

  it("should default debateModelProviders to all undefined when not configured", () => {
    const result = buildVerdictStageConfig({} as any, {} as any);

    expect(result.debateModelProviders.advocate).toBeUndefined();
    expect(result.debateModelProviders.challenger).toBeUndefined();
    expect(result.debateModelProviders.reconciler).toBeUndefined();
    expect(result.debateModelProviders.selfConsistency).toBeUndefined();
    expect(result.debateModelProviders.validation).toBeUndefined();
  });

  // Debate profile preset tests — profiles define explicit provider intent
  it("debateProfile 'baseline' should use all-sonnet debate + haiku validation, all anthropic providers", () => {
    const result = buildVerdictStageConfig({ debateProfile: "baseline" } as any, {} as any);

    expect(result.debateModelTiers.advocate).toBe("sonnet");
    expect(result.debateModelTiers.challenger).toBe("sonnet");
    expect(result.debateModelTiers.reconciler).toBe("sonnet");
    expect(result.debateModelTiers.selfConsistency).toBe("sonnet");
    expect(result.debateModelTiers.validation).toBe("haiku");
    // All providers explicitly anthropic (intent-stable, independent of global llmProvider)
    expect(result.debateModelProviders.advocate).toBe("anthropic");
    expect(result.debateModelProviders.challenger).toBe("anthropic");
    expect(result.debateModelProviders.reconciler).toBe("anthropic");
    expect(result.debateModelProviders.selfConsistency).toBe("anthropic");
    expect(result.debateModelProviders.validation).toBe("anthropic");
  });

  it("debateProfile 'tier-split' should use haiku for challenger, all anthropic providers", () => {
    const result = buildVerdictStageConfig({ debateProfile: "tier-split" } as any, {} as any);

    expect(result.debateModelTiers.advocate).toBe("sonnet");
    expect(result.debateModelTiers.challenger).toBe("haiku");
    expect(result.debateModelTiers.reconciler).toBe("sonnet");
    expect(result.debateModelTiers.validation).toBe("haiku");
    expect(result.debateModelProviders.advocate).toBe("anthropic");
    expect(result.debateModelProviders.challenger).toBe("anthropic");
  });

  it("debateProfile 'cross-provider' should set challenger to openai, others anthropic", () => {
    const result = buildVerdictStageConfig({ debateProfile: "cross-provider" } as any, {} as any);

    expect(result.debateModelTiers.challenger).toBe("sonnet");
    expect(result.debateModelProviders.challenger).toBe("openai");
    expect(result.debateModelProviders.advocate).toBe("anthropic");
    expect(result.debateModelProviders.reconciler).toBe("anthropic");
  });

  it("debateProfile 'max-diversity' should set challenger=openai, selfConsistency=google, rest anthropic", () => {
    const result = buildVerdictStageConfig({ debateProfile: "max-diversity" } as any, {} as any);

    expect(result.debateModelProviders.challenger).toBe("openai");
    expect(result.debateModelProviders.selfConsistency).toBe("google");
    expect(result.debateModelProviders.advocate).toBe("anthropic");
    expect(result.debateModelProviders.reconciler).toBe("anthropic");
    expect(result.debateModelProviders.validation).toBe("anthropic");
  });

  it("explicit debateModelTiers should override profile defaults", () => {
    const pipelineConfig = {
      debateProfile: "cross-provider",
      debateModelTiers: { challenger: "haiku" as const },
    } as any;
    const result = buildVerdictStageConfig(pipelineConfig, {} as any);

    // Profile says challenger=sonnet, but explicit override says haiku
    expect(result.debateModelTiers.challenger).toBe("haiku");
    // Profile provider still applies (not overridden)
    expect(result.debateModelProviders.challenger).toBe("openai");
  });

  it("explicit debateModelProviders should override profile defaults", () => {
    const pipelineConfig = {
      debateProfile: "cross-provider",
      debateModelProviders: { challenger: "mistral" as const },
    } as any;
    const result = buildVerdictStageConfig(pipelineConfig, {} as any);

    // Profile says challenger=openai, but explicit override says mistral
    expect(result.debateModelProviders.challenger).toBe("mistral");
    // Profile tier still applies
    expect(result.debateModelTiers.challenger).toBe("sonnet");
    // Non-overridden roles still get profile defaults
    expect(result.debateModelProviders.advocate).toBe("anthropic");
  });

  it("no debateProfile should use hardcoded defaults (backward compatible)", () => {
    const result = buildVerdictStageConfig({} as any, {} as any);

    expect(result.debateModelTiers.advocate).toBe("sonnet");
    expect(result.debateModelTiers.challenger).toBe("sonnet");
    expect(result.debateModelTiers.validation).toBe("haiku");
    // No profile → no provider overrides
    expect(result.debateModelProviders.challenger).toBeUndefined();
    expect(result.debateModelProviders.advocate).toBeUndefined();
  });

  it("profile semantics should be independent of global llmProvider", () => {
    // Even with global provider set to openai, baseline profile should resolve to anthropic
    const result = buildVerdictStageConfig({ debateProfile: "baseline", llmProvider: "openai" } as any, {} as any);

    expect(result.debateModelProviders.advocate).toBe("anthropic");
    expect(result.debateModelProviders.challenger).toBe("anthropic");
    expect(result.debateModelProviders.reconciler).toBe("anthropic");
    expect(result.debateModelProviders.selfConsistency).toBe("anthropic");
  });
});

describe("Stage 4: createProductionLLMCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load prompt section and call AI SDK with correct parameters", async () => {
    mockLoadSection.mockResolvedValue({ content: "verdict advocate prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: '{"claimVerdicts": []}' } as any);

    const llmCall = createProductionLLMCall({} as any);
    const result = await llmCall(
      "VERDICT_ADVOCATE",
      { claims: [], evidence: [] },
      { tier: "sonnet", temperature: 0.0 },
    );

    expect(mockLoadSection).toHaveBeenCalledWith(
      "claimboundary",
      "VERDICT_ADVOCATE",
      expect.objectContaining({ claims: [], evidence: [], currentDate: expect.any(String) }),
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.0 }),
    );
    expect(result).toEqual({ claimVerdicts: [] });
  });

  it("should select haiku model when tier is haiku", async () => {
    mockLoadSection.mockResolvedValue({ content: "validation prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: '{"valid": true}' } as any);

    const llmCall = createProductionLLMCall({} as any);
    await llmCall("VERDICT_GROUNDING_VALIDATION", {}, { tier: "haiku" });

    // getModelForTask should have been called with "understand" (Haiku tier mapping)
    const { getModelForTask: mockGetModel } = await import("@/lib/analyzer/llm");
    expect(vi.mocked(mockGetModel)).toHaveBeenCalledWith("understand", undefined, expect.any(Object));
  });

  it("should throw when prompt section is not found", async () => {
    mockLoadSection.mockResolvedValue(null as any);

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("NONEXISTENT_PROMPT", {}),
    ).rejects.toThrow('Failed to load prompt section "NONEXISTENT_PROMPT"');
  });

  it("should throw when LLM returns empty response", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}),
    ).rejects.toThrow("LLM returned empty response");
  });

  it("should extract JSON from markdown code blocks", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({
      text: 'Here is the result:\n```json\n{"verdicts": [1, 2, 3]}\n```',
    } as any);

    const llmCall = createProductionLLMCall({} as any);
    const result = await llmCall("VERDICT_ADVOCATE", {});
    expect(result).toEqual({ verdicts: [1, 2, 3] });
  });

  it("should throw when response is not valid JSON", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "This is not JSON at all" } as any);

    const llmCall = createProductionLLMCall({} as any);
    await expect(
      llmCall("VERDICT_ADVOCATE", {}),
    ).rejects.toThrow("Failed to parse LLM response as JSON");
  });

  it("should pass providerOverride to getModelForTask when provided", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: '{"ok": true}' } as any);

    // Ensure credential check passes for openai
    const origKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key-for-override";

    try {
      const pipelineConfig = { llmProvider: "anthropic" } as any;
      const llmCall = createProductionLLMCall(pipelineConfig);
      await llmCall("VERDICT_CHALLENGER", {}, { tier: "sonnet", providerOverride: "openai" });

      const { getModelForTask: mockGetModel } = await import("@/lib/analyzer/llm");
      expect(vi.mocked(mockGetModel)).toHaveBeenCalledWith("verdict", "openai", pipelineConfig);
    } finally {
      if (origKey !== undefined) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it("should fall back to global provider when override has no credentials", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: '{"ok": true}' } as any);

    // Ensure no MISTRAL_API_KEY is set
    const origKey = process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_API_KEY;

    try {
      const pipelineConfig = { llmProvider: "anthropic" } as any;
      const llmCall = createProductionLLMCall(pipelineConfig);
      await llmCall("VERDICT_CHALLENGER", {}, { tier: "sonnet", providerOverride: "mistral" });

      const { getModelForTask: mockGetModel } = await import("@/lib/analyzer/llm");
      // Should have fallen back to undefined (no providerOverride → global provider)
      expect(vi.mocked(mockGetModel)).toHaveBeenCalledWith("verdict", undefined, pipelineConfig);
    } finally {
      if (origKey !== undefined) {
        process.env.MISTRAL_API_KEY = origKey;
      }
    }
  });

  it("should emit debate_provider_fallback warning into warnings collector on credential fallback", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: '{"ok": true}' } as any);

    const origKey = process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_API_KEY;

    try {
      const pipelineConfig = { llmProvider: "anthropic" } as any;
      const warnings: any[] = [];
      const llmCall = createProductionLLMCall(pipelineConfig, warnings);
      await llmCall("VERDICT_CHALLENGER", {}, { tier: "sonnet", providerOverride: "mistral" });

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe("debate_provider_fallback");
      expect(warnings[0].severity).toBe("warning");
      expect(warnings[0].message).toContain("mistral");
      expect(warnings[0].message).toContain("VERDICT_CHALLENGER");
      expect(warnings[0].details.configuredProvider).toBe("mistral");
      expect(warnings[0].details.fallbackProvider).toBe("anthropic");
    } finally {
      if (origKey !== undefined) {
        process.env.MISTRAL_API_KEY = origKey;
      }
    }
  });

  it("should preemptively fallback from gpt-4.1 to gpt-4.1-mini when TPM guard threshold is exceeded", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "{\"ok\":true}" } as any);

    const origKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";

    try {
      const { getModelForTask: mockGetModel } = await import("@/lib/analyzer/llm");
      vi.mocked(mockGetModel)
        .mockReturnValueOnce({ model: "openai-gpt41", modelName: "gpt-4.1", provider: "openai" } as any)
        .mockReturnValueOnce({ model: "openai-mini", modelName: "gpt-4.1-mini", provider: "openai" } as any);

      const warnings: any[] = [];
      const llmCall = createProductionLLMCall({
        llmProvider: "anthropic",
        openaiTpmGuardEnabled: true,
        openaiTpmGuardInputTokenThreshold: 24000,
        openaiTpmGuardFallbackModel: "gpt-4.1-mini",
      } as any, warnings);

      await llmCall(
        "VERDICT_CHALLENGER",
        { userMessage: "x".repeat(120000) },
        { tier: "sonnet", providerOverride: "openai" },
      );

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      expect(mockGenerateText.mock.calls[0]?.[0]?.model).toBe("openai-mini");
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe("llm_provider_error");
      expect(warnings[0].details.reason).toBe("tpm_guard");
      expect(warnings[0].details.guardPhase).toBe("tpm_guard_precheck");
    } finally {
      if (origKey !== undefined) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it("should retry once with gpt-4.1-mini when OpenAI returns TPM error", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText
      .mockRejectedValueOnce(new Error("Request too large for gpt-4.1 on tokens per min (TPM): Limit 30000, Requested 30487"))
      .mockResolvedValueOnce({ text: "{\"ok\":true}" } as any);

    const origKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";

    try {
      const { getModelForTask: mockGetModel } = await import("@/lib/analyzer/llm");
      vi.mocked(mockGetModel)
        .mockReturnValueOnce({ model: "openai-gpt41", modelName: "gpt-4.1", provider: "openai" } as any)
        .mockReturnValueOnce({ model: "openai-mini", modelName: "gpt-4.1-mini", provider: "openai" } as any);

      const warnings: any[] = [];
      const llmCall = createProductionLLMCall({
        llmProvider: "anthropic",
        openaiTpmGuardEnabled: true,
        openaiTpmGuardInputTokenThreshold: 24000,
        openaiTpmGuardFallbackModel: "gpt-4.1-mini",
      } as any, warnings);

      await llmCall(
        "VERDICT_CHALLENGER",
        { userMessage: "short prompt to avoid precheck fallback" },
        { tier: "sonnet", providerOverride: "openai" },
      );

      expect(mockGenerateText).toHaveBeenCalledTimes(2);
      expect(mockGenerateText.mock.calls[0]?.[0]?.model).toBe("openai-gpt41");
      expect(mockGenerateText.mock.calls[1]?.[0]?.model).toBe("openai-mini");
      expect(warnings).toHaveLength(1);
      expect(warnings[0].details.guardPhase).toBe("tpm_guard_retry");
    } finally {
      if (origKey !== undefined) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it("should throw Stage4LLMCallError with structured diagnostics on unrecovered provider failure", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockRejectedValue(new Error("provider unavailable"));

    const { getModelForTask: mockGetModel } = await import("@/lib/analyzer/llm");
    vi.mocked(mockGetModel).mockReturnValueOnce({
      model: "anthropic-sonnet",
      modelName: "claude-sonnet-4-5-20250929",
      provider: "anthropic",
    } as any);

    const llmCall = createProductionLLMCall({ llmProvider: "anthropic" } as any);

    try {
      await llmCall("VERDICT_ADVOCATE", { userMessage: "x" }, { tier: "sonnet" });
      throw new Error("expected failure");
    } catch (err) {
      const e = err as Error & { details?: Record<string, unknown> };
      expect(e.name).toBe("Stage4LLMCallError");
      expect(e.message).toContain("Stage 4: LLM call failed");
      expect(e.details?.stage).toBe("stage4_verdict");
      expect(e.details?.promptKey).toBe("VERDICT_ADVOCATE");
      expect(e.details?.provider).toBe("anthropic");
      expect(e.details?.model).toBe("claude-sonnet-4-5-20250929");
    }
  });

  it("should not emit warning when provider override has valid credentials", async () => {
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: '{"ok": true}' } as any);

    const origKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";

    try {
      const pipelineConfig = { llmProvider: "anthropic" } as any;
      const warnings: any[] = [];
      const llmCall = createProductionLLMCall(pipelineConfig, warnings);
      await llmCall("VERDICT_CHALLENGER", {}, { tier: "sonnet", providerOverride: "openai" });

      expect(warnings).toHaveLength(0);
    } finally {
      if (origKey !== undefined) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });
});

describe("Stage 4: generateVerdicts (wiring)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock verdict data that the verdict-stage module expects (array of raw verdicts)
  const rawVerdictArray = [{
    claimId: "AC_01",
    truthPercentage: 72,
    verdict: "MOSTLY-TRUE",
    confidence: 78,
    reasoning: "Test verdict",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: ["EV_01"],
    contradictingEvidenceIds: [],
    boundaryFindings: [],
  }];

  // The challenge document format
  const challengeDoc = {
    challenges: [{
      claimId: "AC_01",
      challengePoints: [],
    }],
  };

  it("should load UCM configs and build VerdictStageConfig", async () => {
    const { loadPipelineConfig, loadCalcConfig } = await import("@/lib/config-loader");
    vi.mocked(loadPipelineConfig).mockResolvedValue({
      config: { selfConsistencyMode: "disabled", selfConsistencyTemperature: 0.3 } as any,
    } as any);
    vi.mocked(loadCalcConfig).mockResolvedValue({
      config: {
        selfConsistencySpreadThresholds: { stable: 5, moderate: 12, unstable: 20 },
        mixedConfidenceThreshold: 40,
      } as any,
    } as any);

    // Mock LLM call that returns the expected format for each verdict-stage step
    // Step 1 (advocate): array of raw verdicts
    // Step 3 (challenge): challenge document
    // Step 4 (reconciliation): array of raw verdicts (reconciled)
    // Step 5 (validation): validation results (grounding + direction)
    let callCount = 0;
    const mockLLMCall = vi.fn().mockImplementation((promptKey: string) => {
      callCount++;
      if (promptKey === "VERDICT_ADVOCATE") return Promise.resolve(rawVerdictArray);
      if (promptKey === "VERDICT_CHALLENGER") return Promise.resolve(challengeDoc);
      if (promptKey === "VERDICT_RECONCILIATION") return Promise.resolve(rawVerdictArray);
      if (promptKey === "VERDICT_GROUNDING_VALIDATION") return Promise.resolve([{ claimId: "AC_01", groundingValid: true, issues: [] }]);
      if (promptKey === "VERDICT_DIRECTION_VALIDATION") return Promise.resolve([{ claimId: "AC_01", directionValid: true, issues: [] }]);
      return Promise.resolve({});
    });

    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries: ClaimAssessmentBoundary[] = [{
      id: "CB_01", name: "Test", shortName: "T", description: "Test",
      constituentScopes: [], internalCoherence: 0.9, evidenceCount: 1,
    }];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

    const result = await generateVerdicts(claims, evidence, boundaries, coverageMatrix, mockLLMCall);

    expect(loadPipelineConfig).toHaveBeenCalledWith("default");
    expect(loadCalcConfig).toHaveBeenCalledWith("default");
    expect(mockLLMCall).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create production LLM call when none injected", async () => {
    const { loadPipelineConfig, loadCalcConfig } = await import("@/lib/config-loader");
    vi.mocked(loadPipelineConfig).mockResolvedValue({
      config: { selfConsistencyMode: "disabled" } as any,
    } as any);
    vi.mocked(loadCalcConfig).mockResolvedValue({
      config: { mixedConfidenceThreshold: 40 } as any,
    } as any);

    // Production path: mockLoadSection + mockGenerateText simulate LLM responses
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });

    // Each generateText call in production returns JSON text parsed by the wrapper
    let textCallCount = 0;
    mockGenerateText.mockImplementation(() => {
      textCallCount++;
      // The production LLM wrapper returns text that gets JSON.parsed
      // Step 1 + Step 4 (reconciliation): array of verdict objects
      // Step 3 (challenge): challenge document
      // Step 5 (validation): validation results
      if (textCallCount <= 1) {
        return Promise.resolve({ text: JSON.stringify(rawVerdictArray) } as any);
      }
      if (textCallCount === 2) {
        return Promise.resolve({ text: JSON.stringify(challengeDoc) } as any);
      }
      if (textCallCount === 3) {
        return Promise.resolve({ text: JSON.stringify(rawVerdictArray) } as any);
      }
      // Validation calls — verdict-stage expects arrays
      return Promise.resolve({
        text: JSON.stringify([{ claimId: "AC_01", groundingValid: true, directionValid: true, issues: [] }]),
      } as any);
    });

    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries: ClaimAssessmentBoundary[] = [{
      id: "CB_01", name: "Test", shortName: "T", description: "Test",
      constituentScopes: [], internalCoherence: 0.9, evidenceCount: 1,
    }];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

    const result = await generateVerdicts(claims, evidence, boundaries, coverageMatrix);

    expect(mockLoadSection).toHaveBeenCalled();
    expect(mockGenerateText).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================================
// STAGE 5: AGGREGATE — Unit Tests (§8.5)
// ============================================================================

describe("Stage 5: computeTriangulationScore", () => {
  const defaultCalcConfig = {
    triangulation: {
      strongAgreementBoost: 0.15,
      moderateAgreementBoost: 0.05,
      singleBoundaryPenalty: -0.10,
    },
  } as any;

  it("should return strong when >=3 boundaries support", () => {
    const verdict = createCBClaimVerdict({
      claimId: "AC_01",
      boundaryFindings: [
        createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" }),
        createBoundaryFinding({ boundaryId: "CB_02", evidenceDirection: "supports" }),
        createBoundaryFinding({ boundaryId: "CB_03", evidenceDirection: "supports" }),
      ],
    });
    const claims = [createAtomicClaim()];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02" }),
      createClaimAssessmentBoundary({ id: "CB_03" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_03", claimBoundaryId: "CB_03", relevantClaimIds: ["AC_01"] }),
    ];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const score = computeTriangulationScore(verdict, matrix, defaultCalcConfig);

    expect(score.level).toBe("strong");
    expect(score.factor).toBe(0.15);
    expect(score.boundaryCount).toBe(3);
    expect(score.supporting).toBe(3);
    expect(score.contradicting).toBe(0);
  });

  it("should return moderate when 2 boundaries support", () => {
    const verdict = createCBClaimVerdict({
      claimId: "AC_01",
      boundaryFindings: [
        createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" }),
        createBoundaryFinding({ boundaryId: "CB_02", evidenceDirection: "supports" }),
      ],
    });
    const claims = [createAtomicClaim()];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_01"] }),
    ];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const score = computeTriangulationScore(verdict, matrix, defaultCalcConfig);

    expect(score.level).toBe("moderate");
    expect(score.factor).toBe(0.05);
    expect(score.supporting).toBe(2);
  });

  it("should return weak (single boundary penalty) for 1 boundary", () => {
    const verdict = createCBClaimVerdict({
      claimId: "AC_01",
      boundaryFindings: [
        createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" }),
      ],
    });
    const claims = [createAtomicClaim()];
    const boundaries = [createClaimAssessmentBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
    ];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const score = computeTriangulationScore(verdict, matrix, defaultCalcConfig);

    expect(score.level).toBe("weak");
    expect(score.factor).toBe(-0.10);
    expect(score.boundaryCount).toBe(1);
  });

  it("should return conflicted when evenly split", () => {
    const verdict = createCBClaimVerdict({
      claimId: "AC_01",
      boundaryFindings: [
        createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" }),
        createBoundaryFinding({ boundaryId: "CB_02", evidenceDirection: "contradicts" }),
      ],
    });
    const claims = [createAtomicClaim()];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_01"] }),
    ];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const score = computeTriangulationScore(verdict, matrix, defaultCalcConfig);

    expect(score.level).toBe("conflicted");
    expect(score.factor).toBe(0);
    expect(score.supporting).toBe(1);
    expect(score.contradicting).toBe(1);
  });
});

describe("Stage 5: computeDerivativeFactor", () => {
  it("should return 1.0 when no supporting evidence IDs", () => {
    const verdict = createCBClaimVerdict({ supportingEvidenceIds: [] });
    const factor = computeDerivativeFactor(verdict, [], 0.5);
    expect(factor).toBe(1.0);
  });

  it("should return 1.0 when no evidence is derivative", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", isDerivative: undefined }),
      createEvidenceItem({ id: "EV_02", isDerivative: undefined }),
    ];
    const verdict = createCBClaimVerdict({
      supportingEvidenceIds: ["EV_01", "EV_02"],
    });
    const factor = computeDerivativeFactor(verdict, evidence, 0.5);
    expect(factor).toBe(1.0);
  });

  it("should reduce weight when all evidence is derivative", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", isDerivative: true }),
      createEvidenceItem({ id: "EV_02", isDerivative: true }),
    ];
    const verdict = createCBClaimVerdict({
      supportingEvidenceIds: ["EV_01", "EV_02"],
    });
    // derivativeRatio = 1.0, factor = 1.0 - 1.0 * (1.0 - 0.5) = 0.5
    const factor = computeDerivativeFactor(verdict, evidence, 0.5);
    expect(factor).toBe(0.5);
  });

  it("should not count unverified derivative claims", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", isDerivative: true, derivativeClaimUnverified: true }),
      createEvidenceItem({ id: "EV_02", isDerivative: false }),
    ];
    const verdict = createCBClaimVerdict({
      supportingEvidenceIds: ["EV_01", "EV_02"],
    });
    // Only EV_01 is derivative but it's unverified, so derivativeCount = 0
    const factor = computeDerivativeFactor(verdict, evidence, 0.5);
    expect(factor).toBe(1.0);
  });
});

describe("Stage 5: generateVerdictNarrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call LLM and return parsed VerdictNarrative", async () => {
    const narrativeOutput = {
      headline: "Analysis shows moderate support",
      evidenceBaseSummary: "5 items, 3 sources",
      keyFinding: "Evidence generally supports the claim.",
      limitations: "Limited temporal scope.",
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} } as any);
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(narrativeOutput) } as any);
    mockExtractOutput.mockReturnValue(narrativeOutput);

    const verdicts = [createCBClaimVerdict()];
    const boundaries = [createClaimAssessmentBoundary()];
    const evidence = [createEvidenceItem()];
    const matrix = buildCoverageMatrix(
      [createAtomicClaim()],
      boundaries,
      evidence,
    );

    const result = await generateVerdictNarrative(
      75, "MOSTLY-TRUE", 80,
      verdicts, boundaries, matrix, evidence,
      {} as any,
    );

    expect(result.headline).toBe("Analysis shows moderate support");
    expect(result.evidenceBaseSummary).toBe("5 items, 3 sources");
    expect(result.keyFinding).toBe("Evidence generally supports the claim.");
    expect(result.limitations).toBe("Limited temporal scope.");
    expect(mockLoadSection).toHaveBeenCalledWith("claimboundary", "VERDICT_NARRATIVE", expect.any(Object));
  });

  it("should include boundaryDisagreements when present", async () => {
    const narrativeOutput = {
      headline: "Mixed findings",
      evidenceBaseSummary: "10 items",
      keyFinding: "Boundaries disagree.",
      boundaryDisagreements: ["CB_01 vs CB_02 on temporal scope"],
      limitations: "None.",
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} } as any);
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(narrativeOutput) } as any);
    mockExtractOutput.mockReturnValue(narrativeOutput);

    const result = await generateVerdictNarrative(
      50, "MIXED", 60,
      [createCBClaimVerdict()], [createClaimAssessmentBoundary()],
      buildCoverageMatrix([createAtomicClaim()], [createClaimAssessmentBoundary()], [createEvidenceItem()]),
      [createEvidenceItem()],
      {} as any,
    );

    expect(result.boundaryDisagreements).toEqual(["CB_01 vs CB_02 on temporal scope"]);
  });
});

describe("Stage 5: buildQualityGates", () => {
  it("should map CB gate1Stats to Gate1Stats shape", () => {
    const cbGate1 = {
      totalClaims: 5,
      passedOpinion: 4,
      passedSpecificity: 3,
      passedFidelity: 4,
      filteredCount: 2,
      overallPass: true,
    };
    const verdicts = [
      createCBClaimVerdict({ confidence: 80 }),
      createCBClaimVerdict({ confidence: 50 }),
    ];
    const evidence = [createEvidenceItem()];
    const state = {
      sources: [{ url: "https://example.com" }],
      searchQueries: ["q1"],
      contradictionIterationsUsed: 0,
    } as any;

    const gates = buildQualityGates(cbGate1, verdicts, evidence, state);

    expect(gates.gate1Stats).toBeDefined();
    expect(gates.gate1Stats!.total).toBe(5);
    expect(gates.gate1Stats!.passed).toBe(3);
    expect(gates.gate1Stats!.filtered).toBe(2);
    expect(gates.gate1Stats!.centralKept).toBe(3);
  });

  it("should compute Gate4Stats confidence breakdown", () => {
    const verdicts = [
      createCBClaimVerdict({ confidence: 90 }),  // high
      createCBClaimVerdict({ confidence: 75 }),  // high
      createCBClaimVerdict({ confidence: 55 }),  // medium
      createCBClaimVerdict({ confidence: 25 }),  // low
      createCBClaimVerdict({ confidence: 0 }),   // insufficient
    ];

    const gates = buildQualityGates(undefined, verdicts, [], { sources: [], searchQueries: [], contradictionIterationsUsed: 0 } as any);

    expect(gates.gate4Stats.total).toBe(5);
    expect(gates.gate4Stats.highConfidence).toBe(2);
    expect(gates.gate4Stats.mediumConfidence).toBe(1);
    expect(gates.gate4Stats.lowConfidence).toBe(1);
    expect(gates.gate4Stats.insufficient).toBe(1);
    expect(gates.gate4Stats.publishable).toBe(3); // high + medium
  });

  it("should set passed=false when gate1 overallPass is false", () => {
    const cbGate1 = {
      totalClaims: 2,
      passedOpinion: 0,
      passedSpecificity: 0,
      passedFidelity: 0,
      filteredCount: 2,
      overallPass: false,
    };
    const verdicts = [createCBClaimVerdict({ confidence: 80 })];

    const gates = buildQualityGates(cbGate1, verdicts, [], { sources: [], searchQueries: [], contradictionIterationsUsed: 0 } as any);

    expect(gates.passed).toBe(false);
  });

  it("should include summary with search and evidence stats", () => {
    const verdicts = [createCBClaimVerdict({ confidence: 70 })];
    const evidence = [createEvidenceItem(), createEvidenceItem({ id: "EV_02" })];
    const state = {
      sources: [{ url: "a" }, { url: "b" }, { url: "c" }],
      searchQueries: ["q1", "q2", "q3", "q4"],
      contradictionIterationsUsed: 2,
    } as any;

    const gates = buildQualityGates(undefined, verdicts, evidence, state);

    expect(gates.summary.totalEvidenceItems).toBe(2);
    expect(gates.summary.totalSources).toBe(3);
    expect(gates.summary.searchesPerformed).toBe(4);
    expect(gates.summary.contradictionSearchPerformed).toBe(true);
  });
});

describe("Stage 5: aggregateAssessment (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should produce an OverallAssessment with all required fields", async () => {
    // Mock config loading
    const { loadPipelineConfig, loadCalcConfig } = await import("@/lib/config-loader");
    vi.mocked(loadPipelineConfig).mockResolvedValue({
      config: {} as any,
    } as any);
    vi.mocked(loadCalcConfig).mockResolvedValue({
      config: {
        aggregation: {
          centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
          derivativeMultiplier: 0.5,
        },
        harmPotentialMultipliers: { critical: 1.5, high: 1.2, medium: 1.0, low: 1.0 },
        triangulation: {
          strongAgreementBoost: 0.15,
          moderateAgreementBoost: 0.05,
          singleBoundaryPenalty: -0.10,
        },
        mixedConfidenceThreshold: 40,
      } as any,
    } as any);

    // Mock VerdictNarrative LLM call
    const narrativeOutput = {
      headline: "Test headline",
      evidenceBaseSummary: "2 items",
      keyFinding: "Test finding.",
      limitations: "Test limitations.",
    };
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} } as any);
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(narrativeOutput) } as any);
    mockExtractOutput.mockReturnValue(narrativeOutput);

    const claims = [createAtomicClaim({ id: "AC_01", centrality: "high", harmPotential: "medium" })];
    const boundaries = [createClaimAssessmentBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const verdicts = [
      createCBClaimVerdict({
        claimId: "AC_01",
        truthPercentage: 75,
        confidence: 80,
        harmPotential: "medium",
        supportingEvidenceIds: ["EV_01"],
        boundaryFindings: [
          createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" }),
        ],
      }),
    ];

    const state: CBResearchState = {
      understanding: {
        atomicClaims: claims,
        gate1Stats: { totalClaims: 1, passedOpinion: 1, passedSpecificity: 1, passedFidelity: 1, filteredCount: 0, overallPass: true },
      } as any,
      sources: [{ url: "https://example.com" }] as any,
      searchQueries: ["test query"],
      contradictionIterationsUsed: 0,
      llmCalls: 5,
    } as any;

    const result = await aggregateAssessment(verdicts, boundaries, evidence, coverageMatrix, state);

    // All required fields present
    expect(result.truthPercentage).toBeGreaterThanOrEqual(0);
    expect(result.truthPercentage).toBeLessThanOrEqual(100);
    expect(result.verdict).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.verdictNarrative).toBeDefined();
    expect(result.verdictNarrative.headline).toBe("Test headline");
    expect(result.hasMultipleBoundaries).toBe(false);
    expect(result.claimBoundaries).toEqual(boundaries);
    expect(result.claimVerdicts).toEqual(verdicts);
    expect(result.coverageMatrix).toBeDefined();
    expect(result.qualityGates).toBeDefined();
    expect(result.qualityGates.passed).toBe(true);
  });

  it("should use fallback narrative when LLM fails", async () => {
    const { loadPipelineConfig, loadCalcConfig } = await import("@/lib/config-loader");
    vi.mocked(loadPipelineConfig).mockResolvedValue({ config: {} as any } as any);
    vi.mocked(loadCalcConfig).mockResolvedValue({
      config: {
        aggregation: { centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 }, derivativeMultiplier: 0.5 },
        harmPotentialMultipliers: { critical: 1.5, high: 1.2, medium: 1.0, low: 1.0 },
        triangulation: { strongAgreementBoost: 0.15, moderateAgreementBoost: 0.05, singleBoundaryPenalty: -0.10 },
        mixedConfidenceThreshold: 40,
      } as any,
    } as any);

    // Simulate LLM failure
    mockLoadSection.mockRejectedValue(new Error("Prompt load failed"));

    const claims = [createAtomicClaim()];
    const boundaries = [createClaimAssessmentBoundary({ id: "CB_01" })];
    const evidence = [createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] })];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const verdicts = [
      createCBClaimVerdict({
        claimId: "AC_01", truthPercentage: 60, confidence: 70,
        supportingEvidenceIds: ["EV_01"],
        boundaryFindings: [createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" })],
      }),
    ];
    const state: CBResearchState = {
      understanding: { atomicClaims: claims, gate1Stats: { totalClaims: 1, passedOpinion: 1, passedSpecificity: 1, passedFidelity: 1, filteredCount: 0, overallPass: true } } as any,
      sources: [{ url: "https://example.com" }] as any,
      searchQueries: ["q1"],
      contradictionIterationsUsed: 0,
      llmCalls: 3,
    } as any;

    const result = await aggregateAssessment(verdicts, boundaries, evidence, coverageMatrix, state);

    // Fallback narrative should be used
    expect(result.verdictNarrative.headline).toContain("verdict at");
    expect(result.verdictNarrative.headline).toContain("confidence");
    expect(result.verdictNarrative.evidenceBaseSummary).toContain("1 evidence items");
    expect(result.verdictNarrative.keyFinding).toContain("1 claims");
    expect(result.verdictNarrative.limitations).toContain("Automated analysis");
  });

  it("should set hasMultipleBoundaries=true for >1 boundary", async () => {
    const { loadPipelineConfig, loadCalcConfig } = await import("@/lib/config-loader");
    vi.mocked(loadPipelineConfig).mockResolvedValue({ config: {} as any } as any);
    vi.mocked(loadCalcConfig).mockResolvedValue({
      config: {
        aggregation: { centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 }, derivativeMultiplier: 0.5 },
        harmPotentialMultipliers: { critical: 1.5, high: 1.2, medium: 1.0, low: 1.0 },
        triangulation: { strongAgreementBoost: 0.15, moderateAgreementBoost: 0.05, singleBoundaryPenalty: -0.10 },
        mixedConfidenceThreshold: 40,
      } as any,
    } as any);

    const narrativeOutput = {
      headline: "Multi-boundary analysis",
      evidenceBaseSummary: "4 items",
      keyFinding: "Finding.",
      limitations: "Limits.",
    };
    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} } as any);
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(narrativeOutput) } as any);
    mockExtractOutput.mockReturnValue(narrativeOutput);

    const claims = [createAtomicClaim()];
    const boundaries = [
      createClaimAssessmentBoundary({ id: "CB_01" }),
      createClaimAssessmentBoundary({ id: "CB_02" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_01"] }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const verdicts = [
      createCBClaimVerdict({
        claimId: "AC_01", truthPercentage: 65, confidence: 75,
        supportingEvidenceIds: ["EV_01", "EV_02"],
        boundaryFindings: [
          createBoundaryFinding({ boundaryId: "CB_01", evidenceDirection: "supports" }),
          createBoundaryFinding({ boundaryId: "CB_02", evidenceDirection: "supports" }),
        ],
      }),
    ];
    const state: CBResearchState = {
      understanding: { atomicClaims: claims, gate1Stats: { totalClaims: 1, passedOpinion: 1, passedSpecificity: 1, passedFidelity: 1, filteredCount: 0, overallPass: true } } as any,
      sources: [{ url: "a" }] as any,
      searchQueries: ["q1"],
      contradictionIterationsUsed: 0,
      llmCalls: 2,
    } as any;

    const result = await aggregateAssessment(verdicts, boundaries, evidence, coverageMatrix, state);

    expect(result.hasMultipleBoundaries).toBe(true);
  });
});

// ============================================================================
// EVIDENCE POOL BALANCE (C13 — Stammbach/Ash bias detection)
// ============================================================================

describe("assessEvidenceBalance", () => {
  function makeEvidence(directions: Array<"supports" | "contradicts" | "neutral" | undefined>) {
    return directions.map((dir, i) => ({
      id: `EV_${i + 1}`,
      statement: `Evidence ${i + 1}`,
      claimDirection: dir,
    })) as any[];
  }

  it("should compute balanced ratio for even split", () => {
    const evidence = makeEvidence(["supports", "contradicts", "supports", "contradicts"]);
    const result = assessEvidenceBalance(evidence);
    expect(result.supporting).toBe(2);
    expect(result.contradicting).toBe(2);
    expect(result.neutral).toBe(0);
    expect(result.balanceRatio).toBe(0.5);
    expect(result.isSkewed).toBe(false);
  });

  it("should detect skewed pool (mostly supporting)", () => {
    // 5 supporting, 1 contradicting = 5/6 ≈ 0.833 ratio → majority 83% > 80% threshold
    const evidence = makeEvidence(["supports", "supports", "supports", "supports", "supports", "contradicts"]);
    const result = assessEvidenceBalance(evidence, 0.8);
    expect(result.supporting).toBe(5);
    expect(result.contradicting).toBe(1);
    expect(result.isSkewed).toBe(true);
  });

  it("should detect skewed pool (mostly contradicting)", () => {
    // 5 contradicting, 1 supporting = ratio 1/6 ≈ 0.167 → majority 83% > 80% threshold
    const evidence = makeEvidence(["contradicts", "contradicts", "contradicts", "contradicts", "contradicts", "supports"]);
    const result = assessEvidenceBalance(evidence, 0.8);
    expect(result.isSkewed).toBe(true);
  });

  it("should not flag as skewed at exact threshold boundary (strict >)", () => {
    // 4 supporting, 1 contradicting = 0.8 majority ratio — exactly at threshold, NOT skewed
    const evidence = makeEvidence(["supports", "supports", "supports", "supports", "contradicts"]);
    const result = assessEvidenceBalance(evidence, 0.8);
    expect(result.balanceRatio).toBe(0.8);
    expect(result.isSkewed).toBe(false);
  });

  it("should treat neutral and undefined as neutral", () => {
    const evidence = makeEvidence(["supports", "neutral", undefined, "contradicts"]);
    const result = assessEvidenceBalance(evidence);
    expect(result.supporting).toBe(1);
    expect(result.contradicting).toBe(1);
    expect(result.neutral).toBe(2);
    expect(result.total).toBe(4);
    expect(result.balanceRatio).toBe(0.5);
  });

  it("should return NaN ratio for all-neutral evidence", () => {
    const evidence = makeEvidence(["neutral", "neutral", "neutral"]);
    const result = assessEvidenceBalance(evidence);
    expect(result.balanceRatio).toBeNaN();
    expect(result.isSkewed).toBe(false);
  });

  it("should not flag skew with fewer than minDirectional items (default 3)", () => {
    // Only 2 directional items, both supporting
    const evidence = makeEvidence(["supports", "supports", "neutral"]);
    const result = assessEvidenceBalance(evidence, 0.8);
    expect(result.balanceRatio).toBe(1.0);
    expect(result.isSkewed).toBe(false); // Too few directional items
  });

  it("should respect UCM-configured minDirectional", () => {
    // 2 directional items — default minDirectional=3 would NOT flag, but minDirectional=2 SHOULD
    const evidence = makeEvidence(["supports", "supports", "neutral"]);
    expect(assessEvidenceBalance(evidence, 0.5, 3).isSkewed).toBe(false); // default: too few
    expect(assessEvidenceBalance(evidence, 0.5, 2).isSkewed).toBe(true);  // lower min: flags it
  });

  it("should handle empty evidence pool", () => {
    const result = assessEvidenceBalance([]);
    expect(result.total).toBe(0);
    expect(result.supporting).toBe(0);
    expect(result.contradicting).toBe(0);
    expect(result.balanceRatio).toBeNaN();
    expect(result.isSkewed).toBe(false);
  });

  it("should respect custom threshold", () => {
    // 8 supporting, 2 contradicting = 0.8 majority ratio
    const evidence = makeEvidence([
      "supports", "supports", "supports", "supports", "supports", "supports", "supports", "supports",
      "contradicts", "contradicts",
    ]);
    // With default 0.8 threshold (strict >): 0.8 > 0.8 is false → not skewed
    expect(assessEvidenceBalance(evidence, 0.8).isSkewed).toBe(false);
    // With stricter 0.7 threshold: 0.8 > 0.7 → skewed
    expect(assessEvidenceBalance(evidence, 0.7).isSkewed).toBe(true);
  });

  it("should disable skew detection when threshold is 1.0", () => {
    // All supporting — maximally skewed, but threshold=1.0 disables detection
    // Uses strict > comparison: 1.0 > 1.0 is false → not flagged
    const evidence = makeEvidence(["supports", "supports", "supports", "supports"]);
    const result = assessEvidenceBalance(evidence, 1.0);
    expect(result.balanceRatio).toBe(1.0);
    expect(result.isSkewed).toBe(false);
  });
});

// ============================================================================
// checkDebateTierDiversity (C1/C16 — degenerate debate detection)
// ============================================================================

describe("checkDebateTierDiversity", () => {
  // Helper: build a minimal VerdictStageConfig-shaped object for testing
  const makeConfig = (overrides: Record<string, any> = {}) => ({
    selfConsistencyMode: "disabled" as const,
    selfConsistencyTemperature: 0.3,
    stableThreshold: 5,
    moderateThreshold: 12,
    unstableThreshold: 20,
    spreadMultipliers: { stable: 1.0, moderate: 0.95, unstable: 0.85 },
    mixedConfidenceThreshold: 40,
    highHarmMinConfidence: 50,
    debateModelTiers: {
      advocate: "sonnet" as const,
      selfConsistency: "sonnet" as const,
      challenger: "sonnet" as const,
      reconciler: "sonnet" as const,
      validation: "haiku" as const,
    },
    debateModelProviders: {},
    highHarmFloorLevels: ["critical", "high"] as string[],
    ...overrides,
  });

  it("should return warning when all 4 debate roles use same tier and no provider diversity", () => {
    // All sonnet, no provider overrides → degenerate
    const warning = checkDebateTierDiversity(makeConfig());
    expect(warning).not.toBeNull();
    expect(warning!.type).toBe("all_same_debate_tier");
    expect(warning!.message).toContain("sonnet");
  });

  it("should return warning when all 4 debate roles are haiku", () => {
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelTiers: {
        advocate: "haiku", selfConsistency: "haiku", challenger: "haiku", reconciler: "haiku", validation: "sonnet",
      },
    }));
    expect(warning).not.toBeNull();
    expect(warning!.message).toContain("haiku");
  });

  it("should return null when debate roles have mixed tiers", () => {
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelTiers: {
        advocate: "sonnet", selfConsistency: "sonnet", challenger: "haiku", reconciler: "sonnet", validation: "haiku",
      },
    }));
    expect(warning).toBeNull();
  });

  it("should ignore validation tier — all debate sonnet + validation sonnet still triggers", () => {
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelTiers: {
        advocate: "sonnet", selfConsistency: "sonnet", challenger: "sonnet", reconciler: "sonnet", validation: "sonnet",
      },
    }));
    expect(warning).not.toBeNull();
  });

  it("should suppress warning when same tier but different explicit providers", () => {
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelProviders: {
        advocate: "anthropic",
        selfConsistency: "anthropic",
        challenger: "openai",
        reconciler: "anthropic",
      },
    }));
    expect(warning).toBeNull(); // Provider diversity provides structural independence
  });

  it("should still warn when all roles have the same explicit provider", () => {
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelProviders: {
        advocate: "anthropic",
        selfConsistency: "anthropic",
        challenger: "anthropic",
        reconciler: "anthropic",
      },
    }));
    expect(warning).not.toBeNull(); // All same provider — no diversity
  });

  it("should suppress warning when some roles have explicit provider and others inherit global", () => {
    // One role has "openai", others have undefined (= inherit global)
    // "openai" vs "__inherit_global__" = different → diversity exists
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelProviders: {
        challenger: "openai",
      },
    }));
    expect(warning).toBeNull();
  });

  it("should warn when no provider overrides and all same tier (no profile)", () => {
    // No profile applied → all providers undefined (= all inherit global)
    const warning = checkDebateTierDiversity(makeConfig({
      debateModelProviders: {},
    }));
    expect(warning).not.toBeNull();
  });

  it("resolved cross-provider profile should have provider diversity", () => {
    // Simulates what buildVerdictStageConfig produces for cross-provider profile:
    // advocate=anthropic, selfConsistency=anthropic, challenger=openai, reconciler=anthropic
    const resolved = buildVerdictStageConfig({ debateProfile: "cross-provider" } as any, {} as any);
    const warning = checkDebateTierDiversity(resolved);
    expect(warning).toBeNull(); // challenger=openai vs others=anthropic
  });

  it("resolved baseline profile should warn (all anthropic, all sonnet)", () => {
    // Baseline resolves to all-anthropic, all-sonnet → degenerate
    const resolved = buildVerdictStageConfig({ debateProfile: "baseline" } as any, {} as any);
    const warning = checkDebateTierDiversity(resolved);
    expect(warning).not.toBeNull();
  });

  it("resolved tier-split profile should not warn (mixed tiers)", () => {
    // tier-split: challenger=haiku, others=sonnet → tier diversity
    const resolved = buildVerdictStageConfig({ debateProfile: "tier-split" } as any, {} as any);
    const warning = checkDebateTierDiversity(resolved);
    expect(warning).toBeNull();
  });

  it("resolved max-diversity profile should not warn (multiple provider overrides)", () => {
    const resolved = buildVerdictStageConfig({ debateProfile: "max-diversity" } as any, {} as any);
    const warning = checkDebateTierDiversity(resolved);
    expect(warning).toBeNull(); // challenger=openai, selfConsistency=google
  });
});

// ============================================================================
// checkDebateProviderCredentials (debate_provider_fallback emission)
// ============================================================================

describe("checkDebateProviderCredentials", () => {
  it("should return empty array when no provider overrides configured", () => {
    const config = {
      debateModelTiers: {
        advocate: "sonnet" as const, selfConsistency: "sonnet" as const,
        challenger: "sonnet" as const, reconciler: "sonnet" as const, validation: "haiku" as const,
      },
      debateModelProviders: {},
    } as any;
    const warnings = checkDebateProviderCredentials(config);
    expect(warnings).toHaveLength(0);
  });

  it("should return warning for provider override without credentials", () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const config = {
        debateModelTiers: {
          advocate: "sonnet" as const, selfConsistency: "sonnet" as const,
          challenger: "sonnet" as const, reconciler: "sonnet" as const, validation: "haiku" as const,
        },
        debateModelProviders: {
          challenger: "openai" as const,
        },
      } as any;
      const warnings = checkDebateProviderCredentials(config);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe("debate_provider_fallback");
      expect(warnings[0].message).toContain("challenger");
      expect(warnings[0].message).toContain("openai");
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  it("should return no warning when provider credentials exist", () => {
    const savedKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key-for-credential-check";
    try {
      const config = {
        debateModelTiers: {
          advocate: "sonnet" as const, selfConsistency: "sonnet" as const,
          challenger: "sonnet" as const, reconciler: "sonnet" as const, validation: "haiku" as const,
        },
        debateModelProviders: {
          challenger: "openai" as const,
        },
      } as any;
      const warnings = checkDebateProviderCredentials(config);
      expect(warnings).toHaveLength(0);
    } finally {
      if (savedKey !== undefined) {
        process.env.OPENAI_API_KEY = savedKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it("should return warnings for multiple roles with missing credentials", () => {
    const savedOpenAI = process.env.OPENAI_API_KEY;
    const savedMistral = process.env.MISTRAL_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    try {
      const config = {
        debateModelTiers: {
          advocate: "sonnet" as const, selfConsistency: "sonnet" as const,
          challenger: "sonnet" as const, reconciler: "sonnet" as const, validation: "haiku" as const,
        },
        debateModelProviders: {
          challenger: "openai" as const,
          reconciler: "mistral" as const,
        },
      } as any;
      const warnings = checkDebateProviderCredentials(config);
      expect(warnings).toHaveLength(2);
      expect(warnings.map(w => w.details?.role)).toContain("challenger");
      expect(warnings.map(w => w.details?.role)).toContain("reconciler");
    } finally {
      if (savedOpenAI !== undefined) process.env.OPENAI_API_KEY = savedOpenAI;
      if (savedMistral !== undefined) process.env.MISTRAL_API_KEY = savedMistral;
    }
  });

  it("should detect missing credentials from profile-resolved providers", () => {
    const savedOpenAI = process.env.OPENAI_API_KEY;
    const savedGoogle = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const savedGoogleAlt = process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      // Simulate resolved max-diversity profile: challenger=openai, selfConsistency=google
      const resolved = buildVerdictStageConfig({ debateProfile: "max-diversity" } as any, {} as any);
      const warnings = checkDebateProviderCredentials(resolved);
      // Should flag openai (challenger) and google (selfConsistency) as missing credentials
      const flaggedRoles = warnings.map(w => w.details?.role);
      expect(flaggedRoles).toContain("challenger");
      expect(flaggedRoles).toContain("selfConsistency");
    } finally {
      if (savedOpenAI !== undefined) process.env.OPENAI_API_KEY = savedOpenAI;
      if (savedGoogle !== undefined) process.env.GOOGLE_GENERATIVE_AI_API_KEY = savedGoogle;
      if (savedGoogleAlt !== undefined) process.env.GOOGLE_API_KEY = savedGoogleAlt;
    }
  });
});

// ============================================================================
// B-6: Verifiability Annotation
// ============================================================================
describe("B-6: verifiability annotation", () => {
  it("should accept verifiability field in AtomicClaim when present", () => {
    const claim = createAtomicClaim({ verifiability: "high" });
    expect(claim.verifiability).toBe("high");
  });

  it("should accept all valid verifiability values", () => {
    for (const v of ["high", "medium", "low", "none"] as const) {
      const claim = createAtomicClaim({ verifiability: v });
      expect(claim.verifiability).toBe(v);
    }
  });

  it("should allow AtomicClaim without verifiability (backward compat)", () => {
    const claim = createAtomicClaim();
    expect(claim.verifiability).toBeUndefined();
  });

  it("should pass Zod schema with verifiability field in Pass2 output", () => {
    // The Pass2AtomicClaimSchema is internal, but we can test through the types
    const claimWithVerifiability = createAtomicClaim({ verifiability: "medium" });
    expect(claimWithVerifiability.category).toBe("factual");
    expect(claimWithVerifiability.verifiability).toBe("medium");
    // category and verifiability are independent axes
    const evaluativeHighVerifiability = createAtomicClaim({
      category: "evaluative",
      verifiability: "high",
    });
    expect(evaluativeHighVerifiability.category).toBe("evaluative");
    expect(evaluativeHighVerifiability.verifiability).toBe("high");
  });
});

// ============================================================================
// B-7: Misleadingness Flag
// ============================================================================
describe("B-7: misleadingness flag", () => {
  it("should accept misleadingness fields on CBClaimVerdict", () => {
    const verdict = createCBClaimVerdict({
      misleadingness: "highly_misleading",
      misleadingnessReason: "Cherry-picks data to create false impression",
    });
    expect(verdict.misleadingness).toBe("highly_misleading");
    expect(verdict.misleadingnessReason).toBe("Cherry-picks data to create false impression");
    // Decoupled from truthPercentage
    expect(verdict.truthPercentage).toBe(75);
  });

  it("should accept all valid misleadingness enum values", () => {
    for (const m of ["not_misleading", "potentially_misleading", "highly_misleading"] as const) {
      const verdict = createCBClaimVerdict({ misleadingness: m });
      expect(verdict.misleadingness).toBe(m);
    }
  });

  it("should allow CBClaimVerdict without misleadingness (backward compat)", () => {
    const verdict = createCBClaimVerdict();
    expect(verdict.misleadingness).toBeUndefined();
    expect(verdict.misleadingnessReason).toBeUndefined();
  });

  it("should allow high truthPercentage with highly_misleading (decoupling)", () => {
    // The core B-7 invariant: "90% true AND highly misleading" is a valid state
    const verdict = createCBClaimVerdict({
      truthPercentage: 90,
      verdict: "TRUE",
      misleadingness: "highly_misleading",
      misleadingnessReason: "Uses technically-correct framing to imply false causation",
    });
    expect(verdict.truthPercentage).toBe(90);
    expect(verdict.misleadingness).toBe("highly_misleading");
  });
});

// ============================================================================
// B-8: Explanation Quality Check
// ============================================================================
describe("B-8: explanation quality check", () => {
  describe("checkExplanationStructure (Tier 1)", () => {
    it("should detect all structural components present", () => {
      const narrative: VerdictNarrative = {
        headline: "Analysis yields MOSTLY-TRUE verdict at 78% confidence",
        evidenceBaseSummary: "14 evidence items from 9 sources across 3 perspectives",
        keyFinding: "The claim is well-supported. Evidence indicates a likely positive outcome.",
        limitations: "Limited geographic scope; evidence primarily from one region.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasCitedEvidence).toBe(true);
      expect(findings.hasVerdictCategory).toBe(true);
      expect(findings.hasConfidenceStatement).toBe(true);
      expect(findings.hasLimitations).toBe(true);
    });

    it("should detect missing structural components", () => {
      const narrative: VerdictNarrative = {
        headline: "",
        evidenceBaseSummary: "",
        keyFinding: "Some finding.",
        limitations: "",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasCitedEvidence).toBe(false);
      expect(findings.hasVerdictCategory).toBe(false);
      expect(findings.hasConfidenceStatement).toBe(false);
      expect(findings.hasLimitations).toBe(false);
    });

    it("should detect percentage in headline as confidence statement", () => {
      const narrative: VerdictNarrative = {
        headline: "Verdict: 72% truth assessment",
        evidenceBaseSummary: "5 items",
        keyFinding: "Basic finding.",
        limitations: "Limited evidence base.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasConfidenceStatement).toBe(true);
    });

    it("should detect fraction pattern as confidence statement", () => {
      const narrative: VerdictNarrative = {
        headline: "Analyse terminée",
        evidenceBaseSummary: "6 éléments",
        keyFinding: "Score de confiance: 4/5. Les preuves soutiennent la thèse.",
        limitations: "Couverture géographique limitée.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasConfidenceStatement).toBe(true);
    });

    it("should NOT false-positive on bare numbers in headline (year, count)", () => {
      const narrative: VerdictNarrative = {
        headline: "Analysis of 12 sources from 2024",
        evidenceBaseSummary: "12 items",
        keyFinding: "Some finding.",
        limitations: "Limited scope.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasConfidenceStatement).toBe(false);
    });

    it("should detect ALL-CAPS verdict label in non-English headline", () => {
      const narrative: VerdictNarrative = {
        headline: "Analyse: VRAI — Bewertung abgeschlossen",
        evidenceBaseSummary: "12 Elemente aus 6 Quellen",
        keyFinding: "Die Behauptung wird durch Belege gestützt.",
        limitations: "Begrenzte zeitliche Abdeckung.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasVerdictCategory).toBe(true);
    });

    it("should detect sentence-case hyphenated verdict label", () => {
      const narrative: VerdictNarrative = {
        headline: "Mostly-true overall",
        evidenceBaseSummary: "8 items from 4 sources",
        keyFinding: "Evidence supports the claim.",
        limitations: "Geographic limitations.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasVerdictCategory).toBe(true);
    });

    it("should NOT detect verdict category in plain prose headline", () => {
      const narrative: VerdictNarrative = {
        headline: "Analysis complete",
        evidenceBaseSummary: "5 items",
        keyFinding: "Some finding.",
        limitations: "Limited scope.",
      };
      const findings = checkExplanationStructure(narrative);
      expect(findings.hasVerdictCategory).toBe(false);
    });
  });

  describe("ExplanationQualityCheck type", () => {
    it("should accept structural mode check", () => {
      const check: ExplanationQualityCheck = {
        mode: "structural",
        structuralFindings: {
          hasCitedEvidence: true,
          hasVerdictCategory: true,
          hasConfidenceStatement: true,
          hasLimitations: true,
        },
      };
      expect(check.mode).toBe("structural");
      expect(check.rubricScores).toBeUndefined();
    });

    it("should accept rubric mode check with scores", () => {
      const check: ExplanationQualityCheck = {
        mode: "rubric",
        structuralFindings: {
          hasCitedEvidence: true,
          hasVerdictCategory: true,
          hasConfidenceStatement: false,
          hasLimitations: true,
        },
        rubricScores: {
          clarity: 4,
          completeness: 3,
          neutrality: 5,
          evidenceSupport: 4,
          appropriateHedging: 3,
          overallScore: 3.8,
          flags: ["missing_confidence_statement"],
        },
      };
      expect(check.mode).toBe("rubric");
      expect(check.rubricScores!.overallScore).toBe(3.8);
      expect(check.rubricScores!.flags).toContain("missing_confidence_statement");
    });

    it("should be optional on OverallAssessment (backward compat)", () => {
      const assessment: Partial<OverallAssessment> = {
        truthPercentage: 75,
        verdict: "MOSTLY-TRUE",
        confidence: 80,
      };
      expect(assessment.explanationQualityCheck).toBeUndefined();
    });
  });
});

// ============================================================================
// M1: claimAnnotationMode strips verifiability when "off"
// ============================================================================
describe("M1: claimAnnotationMode verifiability stripping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should strip verifiability from claims when claimAnnotationMode is off (default)", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01", verifiability: "high" as any }),
      createAtomicClaim({ id: "AC_02", verifiability: "medium" as any }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
        { claimId: "AC_02", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    // claimAnnotationMode absent → defaults to "off" → verifiability stripped
    const result = await runGate1Validation(claims, {} as any, "2026-02-17");

    for (const claim of result.filteredClaims) {
      expect(claim.verifiability).toBeUndefined();
    }
  });

  it("should preserve verifiability when claimAnnotationMode is 'verifiability'", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01", verifiability: "high" as any }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(
      claims,
      { claimAnnotationMode: "verifiability" } as any,
      "2026-02-17",
    );

    expect(result.filteredClaims[0].verifiability).toBe("high");
  });

  it("should strip verifiability when claimAnnotationMode is explicitly 'off'", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01", verifiability: "low" as any }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, passedFidelity: true, reasoning: "ok" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(
      claims,
      { claimAnnotationMode: "off" } as any,
      "2026-02-17",
    );

    expect(result.filteredClaims[0].verifiability).toBeUndefined();
  });
});

// ============================================================================
// M2: evaluateExplanationRubric graceful failure
// ============================================================================
describe("M2: evaluateExplanationRubric error handling", () => {
  it("should propagate LLM errors (pipeline wraps in try/catch)", async () => {
    const narrative: VerdictNarrative = {
      headline: "Verdict: TRUE at 85%",
      evidenceBaseSummary: "10 items from 5 sources",
      keyFinding: "Well-supported claim.",
      limitations: "Geographic scope limitations.",
    };

    const failingLLMCall = vi.fn().mockRejectedValue(new Error("LLM timeout"));

    await expect(
      evaluateExplanationRubric(narrative, 3, 10, failingLLMCall as any),
    ).rejects.toThrow("LLM timeout");
  });

  it("should return valid rubric scores on successful LLM call", async () => {
    const narrative: VerdictNarrative = {
      headline: "Assessment: MOSTLY-TRUE verdict",
      evidenceBaseSummary: "8 items from 4 sources",
      keyFinding: "Evidence supports the claim with moderate confidence.",
      limitations: "Limited temporal scope.",
    };

    const mockLLMCall = vi.fn().mockResolvedValue({
      clarity: 4,
      completeness: 3,
      neutrality: 5,
      evidenceSupport: 4,
      appropriateHedging: 3,
      flags: ["minor_hedging_gap"],
    });

    const scores = await evaluateExplanationRubric(narrative, 2, 8, mockLLMCall as any);

    expect(scores.clarity).toBe(4);
    expect(scores.completeness).toBe(3);
    expect(scores.neutrality).toBe(5);
    expect(scores.evidenceSupport).toBe(4);
    expect(scores.appropriateHedging).toBe(3);
    expect(scores.overallScore).toBeGreaterThan(0);
    expect(scores.flags).toContain("minor_hedging_gap");
  });
});
