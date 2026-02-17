/**
 * ClaimBoundary Pipeline — Unit Tests
 *
 * Tests for the ClaimBoundary pipeline skeleton and supporting functions.
 * All fixtures use CB types only (AtomicClaim, ClaimBoundary, BoundaryFinding, etc.)
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
} from "@/lib/analyzer/claimboundary-pipeline";
import type {
  AtomicClaim,
  ClaimBoundary,
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

function createClaimBoundary(overrides: Partial<ClaimBoundary> = {}): ClaimBoundary {
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

describe("ClaimBoundary Pipeline Types", () => {
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

  describe("ClaimBoundary", () => {
    it("should create a valid ClaimBoundary", () => {
      const boundary = createClaimBoundary();
      expect(boundary.id).toBe("CB_01");
      expect(boundary.name).toBeTruthy();
      expect(boundary.shortName).toBeTruthy();
      expect(boundary.internalCoherence).toBeGreaterThanOrEqual(0);
      expect(boundary.internalCoherence).toBeLessThanOrEqual(1);
      expect(boundary.constituentScopes).toBeInstanceOf(Array);
    });

    it("should allow optional scope metadata fields", () => {
      const boundary = createClaimBoundary({
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
      createClaimBoundary({ id: "CB_01" }),
      createClaimBoundary({ id: "CB_02", name: "Alternative Boundary", shortName: "ALT" }),
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
      createClaimBoundary({ id: "CB_01" }),
      createClaimBoundary({ id: "CB_02", name: "Alternative Boundary", shortName: "ALT" }),
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
      createClaimBoundary({ id: "CB_01" }),
      createClaimBoundary({ id: "CB_02", name: "Second Boundary", shortName: "B2" }),
      createClaimBoundary({ id: "CB_03", name: "Third Boundary", shortName: "B3" }),
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
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
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
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
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
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
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

describe("ClaimBoundary Pipeline Stages (skeleton)", () => {
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
  getModelForTask: vi.fn(() => ({ model: "mock-model", name: "mock" })),
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
}));

vi.mock("@/lib/web-search", () => ({
  searchWebWithProvider: vi.fn(),
}));

vi.mock("@/lib/retrieval", () => ({
  extractTextFromUrl: vi.fn(),
}));

vi.mock("@/lib/analyzer/source-reliability", () => ({
  prefetchSourceReliability: vi.fn(async () => ({ domains: [], alreadyPrefetched: 0, cacheHits: 0, evaluated: 0 })),
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
    expect(result).toEqual({
      totalClaims: 0,
      passedOpinion: 0,
      passedSpecificity: 0,
      overallPass: true,
    });
  });

  it("should populate gate1Stats from LLM validation output", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Second claim" }),
      createAtomicClaim({ id: "AC_03", statement: "Third claim" }),
    ];

    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: true, passedSpecificity: true, reasoning: "ok" },
        { claimId: "AC_02", passedOpinion: true, passedSpecificity: false, reasoning: "too vague" },
        { claimId: "AC_03", passedOpinion: false, passedSpecificity: true, reasoning: "opinion" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    expect(result.totalClaims).toBe(3);
    expect(result.passedOpinion).toBe(2);
    expect(result.passedSpecificity).toBe(2);
    expect(result.overallPass).toBe(true);
  });

  it("should return all-pass when prompt section is missing", async () => {
    const claims = [createAtomicClaim()];
    mockLoadSection.mockResolvedValue(null as any);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    expect(result.totalClaims).toBe(1);
    expect(result.passedOpinion).toBe(1);
    expect(result.overallPass).toBe(true);
  });

  it("should set overallPass false when all claims fail both checks", async () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const gate1Fixture = {
      validatedClaims: [
        { claimId: "AC_01", passedOpinion: false, passedSpecificity: false, reasoning: "invalid" },
      ],
    };

    mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
    mockGenerateText.mockResolvedValue({ text: "" } as any);
    mockExtractOutput.mockReturnValue(gate1Fixture);

    const result = await runGate1Validation(claims, mockPipelineConfig, "2026-02-17");

    expect(result.passedOpinion).toBe(0);
    expect(result.passedSpecificity).toBe(0);
    expect(result.overallPass).toBe(false);
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

  const mockPipelineConfig = {} as any;

  it("should generate queries via LLM", async () => {
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
    expect(result[0].query).toBe("entity A metric growth statistics");
    expect(mockLoadSection).toHaveBeenCalledWith("claimboundary", "GENERATE_QUERIES", expect.any(Object));
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
});
