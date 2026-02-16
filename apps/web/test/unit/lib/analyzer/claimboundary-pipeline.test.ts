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

import { describe, it, expect } from "vitest";
import { buildCoverageMatrix } from "@/lib/analyzer/claimboundary-pipeline";
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
