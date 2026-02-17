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
