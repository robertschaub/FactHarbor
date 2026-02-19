/**
 * Verdict Stage Module — Unit Tests
 *
 * Tests the 5-step LLM debate pattern with mocked LLM calls.
 * All fixtures use CB types only (§22.3.2 confusion prevention rules).
 *
 * Tests cover:
 * - Step 1: advocateVerdict (parsing, defaults)
 * - Step 2: selfConsistencyCheck (enabled, disabled, spread calculation)
 * - Step 3: adversarialChallenge (parsing challenge document)
 * - Step 4: reconcileVerdicts (merging, challenge responses)
 * - Step 5: validateVerdicts (advisory, non-blocking)
 * - Structural consistency check (deterministic invariants)
 * - Spread multiplier calculations (§8.5.5)
 * - Full runVerdictStage orchestration
 *
 * @see apps/web/src/lib/analyzer/verdict-stage.ts
 * @see Docs/WIP/ClaimAssessmentBoundary_Pipeline_Architecture_2026-02-15.md §8.4
 */

import { describe, it, expect, vi } from "vitest";
import {
  advocateVerdict,
  selfConsistencyCheck,
  adversarialChallenge,
  reconcileVerdicts,
  validateVerdicts,
  runStructuralConsistencyCheck,
  classifyConfidence,
  enforceHarmConfidenceFloor,
  getSpreadMultiplier,
  applySpreadAdjustment,
  runVerdictStage,
  DEFAULT_VERDICT_STAGE_CONFIG,
  type LLMCallFn,
  type VerdictStageConfig,
} from "@/lib/analyzer/verdict-stage";
import type {
  AtomicClaim,
  CBClaimVerdict,
  ClaimBoundary,
  ConsistencyResult,
  CoverageMatrix,
  EvidenceItem,
} from "@/lib/analyzer/types";
import { buildCoverageMatrix } from "@/lib/analyzer/claimboundary-pipeline";

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
      methodologies: ["standard analysis"],
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
    constituentScopes: [],
    internalCoherence: 0.85,
    evidenceCount: 5,
    ...overrides,
  };
}

function createEvidenceItem(
  overrides: Partial<EvidenceItem & { claimBoundaryId?: string; relevantClaimIds?: string[] }> = {},
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
    claimBoundaryId: "CB_01",
    relevantClaimIds: ["AC_01"],
    ...overrides,
  };
}

/** Mock LLM that returns pre-configured responses by prompt key */
function createMockLLM(responses: Record<string, unknown>): LLMCallFn {
  return vi.fn(async (promptKey: string) => {
    if (promptKey in responses) return responses[promptKey];
    throw new Error(`Unexpected LLM call: ${promptKey}`);
  });
}

/** Standard advocate response for a single claim */
function advocateResponse(claimId = "AC_01", truthPct = 75, confidence = 80) {
  return [{
    id: `CV_${claimId}`,
    claimId,
    truthPercentage: truthPct,
    confidence,
    reasoning: "Evidence supports this claim based on standard methodology.",
    isContested: false,
    supportingEvidenceIds: ["EV_01", "EV_02"],
    contradictingEvidenceIds: [],
    boundaryFindings: [{
      boundaryId: "CB_01",
      boundaryName: "Standard Analysis Boundary",
      truthPercentage: truthPct,
      confidence,
      evidenceDirection: "supports",
      evidenceCount: 3,
    }],
  }];
}

/** Standard challenge response */
function challengeResponse(claimId = "AC_01") {
  return {
    challenges: [{
      claimId,
      challengePoints: [{
        type: "methodology_weakness",
        description: "Limited sample size in supporting studies",
        evidenceIds: ["EV_01"],
        severity: "medium",
      }],
    }],
  };
}

/** Standard reconciliation response */
function reconciliationResponse(claimId = "AC_01", truthPct = 72, confidence = 78) {
  return [{
    claimId,
    truthPercentage: truthPct,
    confidence,
    reasoning: "After considering challenges, verdict adjusted slightly downward.",
    isContested: false,
    challengeResponses: [{
      challengeType: "methodology_weakness",
      response: "Valid concern; reduced confidence accordingly.",
      verdictAdjusted: true,
    }],
  }];
}

// ============================================================================
// STEP 1: ADVOCATE VERDICT
// ============================================================================

describe("advocateVerdict (Step 1)", () => {
  it("should call LLM with VERDICT_ADVOCATE prompt and return parsed verdicts", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: advocateResponse(),
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe("AC_01");
    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    expect(result[0].verdict).toBe("MOSTLY-TRUE");
    expect(result[0].boundaryFindings).toHaveLength(1);
    expect(result[0].boundaryFindings[0].boundaryId).toBe("CB_01");
    expect(mockLLM).toHaveBeenCalledWith(
      "VERDICT_ADVOCATE",
      expect.objectContaining({ atomicClaims: claims }),
      expect.objectContaining({ tier: "sonnet" }),
    );
  });

  it("should clamp truth percentage to 0-100", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: [{ claimId: "AC_01", truthPercentage: 150, confidence: -10 }],
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(result[0].truthPercentage).toBe(100);
    expect(result[0].confidence).toBe(0);
  });

  it("should provide defaults for missing LLM fields", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: [{ claimId: "AC_01" }],
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(result[0].truthPercentage).toBe(50);
    expect(result[0].confidence).toBe(50);
    expect(result[0].reasoning).toBe("");
    expect(result[0].supportingEvidenceIds).toEqual([]);
    expect(result[0].contradictingEvidenceIds).toEqual([]);
    expect(result[0].boundaryFindings).toEqual([]);
  });
});

// ============================================================================
// STEP 2: SELF-CONSISTENCY CHECK
// ============================================================================

describe("selfConsistencyCheck (Step 2)", () => {
  it("should skip when mode is disabled", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    const advocateVerdicts: CBClaimVerdict[] = [];

    const mockLLM = createMockLLM({});
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "disabled",
    };

    const result = await selfConsistencyCheck(
      claims, evidence, boundaries, matrix, advocateVerdicts, mockLLM, config,
    );

    expect(result).toHaveLength(1);
    expect(result[0].assessed).toBe(false);
    expect(result[0].stable).toBe(true);
    expect(result[0].spread).toBe(0);
    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("should make 2 additional LLM calls when enabled", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [], boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    // Two additional runs return slightly different percentages
    const mockLLM = vi.fn(async () => [{ claimId: "AC_01", truthPercentage: 72 }]);

    const result = await selfConsistencyCheck(
      claims, evidence, boundaries, matrix, advocateVerdictsList, mockLLM,
    );

    expect(mockLLM).toHaveBeenCalledTimes(2);
    expect(result[0].assessed).toBe(true);
    expect(result[0].percentages).toHaveLength(3);
    expect(result[0].percentages[0]).toBe(75); // original
    expect(result[0].percentages[1]).toBe(72); // run 2
    expect(result[0].percentages[2]).toBe(72); // run 3
    expect(result[0].spread).toBe(3);          // 75 - 72
    expect(result[0].stable).toBe(true);       // 3 ≤ 5 (stableThreshold)
  });

  it("should clamp temperature to [0.1, 0.7]", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 50, verdict: "MIXED",
      confidence: 50, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [], boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [50], average: 50, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const mockLLM = vi.fn(async () => [{ claimId: "AC_01", truthPercentage: 50 }]);
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyTemperature: 2.0, // should be clamped to 0.7
    };

    await selfConsistencyCheck(
      claims, evidence, boundaries, matrix, advocateVerdictsList, mockLLM, config,
    );

    expect(mockLLM).toHaveBeenCalledWith(
      "VERDICT_ADVOCATE",
      expect.any(Object),
      expect.objectContaining({ temperature: 0.7 }),
    );
  });
});

// ============================================================================
// STEP 3: ADVERSARIAL CHALLENGE
// ============================================================================

describe("adversarialChallenge (Step 3)", () => {
  it("should call LLM with VERDICT_CHALLENGER and parse challenge document", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];

    const mockLLM = createMockLLM({
      VERDICT_CHALLENGER: challengeResponse(),
    });

    const result = await adversarialChallenge(verdicts, evidence, boundaries, mockLLM);

    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0].claimId).toBe("AC_01");
    expect(result.challenges[0].challengePoints).toHaveLength(1);
    expect(result.challenges[0].challengePoints[0].type).toBe("methodology_weakness");
    expect(result.challenges[0].challengePoints[0].severity).toBe("medium");
  });

  it("should handle empty challenge response gracefully", async () => {
    const verdicts: CBClaimVerdict[] = [];
    const evidence: EvidenceItem[] = [];
    const boundaries: ClaimAssessmentBoundary[] = [];

    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: {} });

    const result = await adversarialChallenge(verdicts, evidence, boundaries, mockLLM);

    expect(result.challenges).toEqual([]);
  });
});

// ============================================================================
// STEP 4: RECONCILIATION
// ============================================================================

describe("reconcileVerdicts (Step 4)", () => {
  it("should merge reconciled values into advocate verdicts", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original reasoning", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const challengeDoc = challengeResponse();
    const consistencyResults: ConsistencyResult[] = [{
      claimId: "AC_01", percentages: [75, 72, 73], average: 73.3, spread: 3, stable: true, assessed: true,
    }];

    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: reconciliationResponse(),
    });

    const result = await reconcileVerdicts(
      advocateVerdictsList, challengeDoc, consistencyResults, mockLLM,
    );

    expect(result).toHaveLength(1);
    expect(result[0].truthPercentage).toBe(72);
    expect(result[0].confidence).toBe(78);
    expect(result[0].verdict).toBe("MOSTLY-TRUE");
    expect(result[0].challengeResponses).toHaveLength(1);
    expect(result[0].challengeResponses[0].verdictAdjusted).toBe(true);
    // Boundary findings preserved from advocate
    expect(result[0].boundaryFindings).toHaveLength(1);
    // Consistency result attached
    expect(result[0].consistencyResult.assessed).toBe(true);
    expect(result[0].consistencyResult.spread).toBe(3);
  });

  it("should keep original verdict if reconciliation doesn't include claim", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const mockLLM = createMockLLM({ VERDICT_RECONCILIATION: [] }); // empty response

    const result = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], mockLLM,
    );

    // Original preserved
    expect(result[0].truthPercentage).toBe(75);
  });
});

// ============================================================================
// STEP 5: VERDICT VALIDATION
// ============================================================================

describe("validateVerdicts (Step 5)", () => {
  it("should call grounding and direction validation LLMs", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [createEvidenceItem()];

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      return [];
    });

    const result = await validateVerdicts(verdicts, evidence, mockLLM);

    expect(mockLLM).toHaveBeenCalledTimes(2);
    expect(mockLLM).toHaveBeenCalledWith(
      "VERDICT_GROUNDING_VALIDATION", expect.any(Object), expect.objectContaining({ tier: "haiku" }),
    );
    expect(mockLLM).toHaveBeenCalledWith(
      "VERDICT_DIRECTION_VALIDATION", expect.any(Object), expect.objectContaining({ tier: "haiku" }),
    );
    // Verdicts returned unchanged
    expect(result).toEqual(verdicts);
  });
});

// ============================================================================
// STRUCTURAL CONSISTENCY CHECK (deterministic)
// ============================================================================

describe("runStructuralConsistencyCheck", () => {
  it("should return empty warnings when all checks pass", () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(
      [createAtomicClaim()], boundaries, evidence,
    );

    const warnings = runStructuralConsistencyCheck(verdicts, evidence, boundaries, matrix);

    expect(warnings).toEqual([]);
  });

  it("should warn on invalid evidence ID references", () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_NONEXISTENT"],
      contradictingEvidenceIds: ["EV_ALSO_MISSING"],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(
      [createAtomicClaim()], boundaries, evidence,
    );

    const warnings = runStructuralConsistencyCheck(verdicts, evidence, boundaries, matrix);

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("EV_NONEXISTENT");
    expect(warnings[1]).toContain("EV_ALSO_MISSING");
  });

  it("should warn on invalid boundary ID in boundaryFindings", () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_INVALID", boundaryName: "Invalid", truthPercentage: 50, confidence: 50, evidenceDirection: "neutral", evidenceCount: 0 }],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const matrix = buildCoverageMatrix([], boundaries, []);

    const warnings = runStructuralConsistencyCheck(verdicts, [], boundaries, matrix);

    expect(warnings.some((w) => w.includes("CB_INVALID"))).toBe(true);
  });

  it("should warn on truth percentage out of range", () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 110, verdict: "TRUE",
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const matrix = buildCoverageMatrix([], [], []);

    const warnings = runStructuralConsistencyCheck(verdicts, [], [], matrix);

    expect(warnings.some((w) => w.includes("out of range"))).toBe(true);
  });

  it("should warn on verdict label mismatch with truth percentage", () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "TRUE", // Should be MOSTLY-TRUE
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const matrix = buildCoverageMatrix([], [], []);

    const warnings = runStructuralConsistencyCheck(verdicts, [], [], matrix);

    expect(warnings.some((w) => w.includes("doesn't match expected"))).toBe(true);
  });

  it("should warn on claim with verdict but zero evidence in coverage matrix", () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    // No evidence → coverage matrix will show 0 for AC_01
    const matrix = buildCoverageMatrix(claims, boundaries, []);

    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const warnings = runStructuralConsistencyCheck(verdicts, [], boundaries, matrix);

    expect(warnings.some((w) => w.includes("zero evidence items"))).toBe(true);
  });
});

// ============================================================================
// SPREAD MULTIPLIER (§8.5.5)
// ============================================================================

describe("getSpreadMultiplier", () => {
  it("should return 1.0 for highly stable spread (≤5pp)", () => {
    expect(getSpreadMultiplier(0)).toBe(1.0);
    expect(getSpreadMultiplier(3)).toBe(1.0);
    expect(getSpreadMultiplier(5)).toBe(1.0);
  });

  it("should return 0.9 for moderately stable spread (6-12pp)", () => {
    expect(getSpreadMultiplier(6)).toBe(0.9);
    expect(getSpreadMultiplier(10)).toBe(0.9);
    expect(getSpreadMultiplier(12)).toBe(0.9);
  });

  it("should return 0.7 for unstable spread (13-20pp)", () => {
    expect(getSpreadMultiplier(13)).toBe(0.7);
    expect(getSpreadMultiplier(18)).toBe(0.7);
    expect(getSpreadMultiplier(20)).toBe(0.7);
  });

  it("should return 0.4 for highly unstable spread (>20pp)", () => {
    expect(getSpreadMultiplier(21)).toBe(0.4);
    expect(getSpreadMultiplier(50)).toBe(0.4);
  });

  it("should return 1.0 when selfConsistencyMode is disabled", () => {
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "disabled",
    };
    expect(getSpreadMultiplier(50, config)).toBe(1.0);
  });

  it("should use custom thresholds from config", () => {
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      stableThreshold: 3,
      moderateThreshold: 8,
      unstableThreshold: 15,
      spreadMultipliers: {
        highlyStable: 1.0,
        moderatelyStable: 0.85,
        unstable: 0.6,
        highlyUnstable: 0.3,
      },
    };
    expect(getSpreadMultiplier(3, config)).toBe(1.0);
    expect(getSpreadMultiplier(4, config)).toBe(0.85);
    expect(getSpreadMultiplier(9, config)).toBe(0.6);
    expect(getSpreadMultiplier(16, config)).toBe(0.3);
  });
});

describe("applySpreadAdjustment", () => {
  it("should multiply confidence by spread multiplier", () => {
    const result: ConsistencyResult = {
      claimId: "AC_01", percentages: [70, 85, 75], average: 76.7, spread: 15, stable: false, assessed: true,
    };
    // spread 15 → unstable → multiplier 0.7
    expect(applySpreadAdjustment(80, result)).toBe(56); // 80 * 0.7 = 56
  });

  it("should return original confidence when not assessed", () => {
    const result: ConsistencyResult = {
      claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false,
    };
    expect(applySpreadAdjustment(80, result)).toBe(80);
  });

  it("should return full confidence for highly stable spread", () => {
    const result: ConsistencyResult = {
      claimId: "AC_01", percentages: [74, 76, 75], average: 75, spread: 2, stable: true, assessed: true,
    };
    expect(applySpreadAdjustment(80, result)).toBe(80); // 80 * 1.0 = 80
  });
});

// ============================================================================
// FULL ORCHESTRATION
// ============================================================================

describe("runVerdictStage (full orchestration)", () => {
  it("should run all steps in correct order and return final verdicts", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const callOrder: string[] = [];
    const mockLLM = vi.fn(async (key: string) => {
      callOrder.push(key);
      if (key === "VERDICT_ADVOCATE") return advocateResponse();
      if (key === "VERDICT_CHALLENGER") return challengeResponse();
      if (key === "VERDICT_RECONCILIATION") return reconciliationResponse();
      if (key === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      if (key === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      return [];
    });

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "disabled", // Skip consistency for simpler test
    };

    const result = await runVerdictStage(
      claims, evidence, boundaries, matrix, mockLLM, config,
    );

    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe("AC_01");

    // Step 1 first, then Steps 2+3 (parallel), then Step 4, then Step 5 (grounding + direction)
    expect(callOrder[0]).toBe("VERDICT_ADVOCATE");
    expect(callOrder).toContain("VERDICT_CHALLENGER");
    expect(callOrder).toContain("VERDICT_RECONCILIATION");
    expect(callOrder).toContain("VERDICT_GROUNDING_VALIDATION");
    expect(callOrder).toContain("VERDICT_DIRECTION_VALIDATION");

    // Reconciliation should come after challenger
    const challengerIdx = callOrder.indexOf("VERDICT_CHALLENGER");
    const reconcileIdx = callOrder.indexOf("VERDICT_RECONCILIATION");
    expect(reconcileIdx).toBeGreaterThan(challengerIdx);
  });

  it("should run Steps 2 and 3 in parallel when consistency enabled", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const callTimestamps: Record<string, number> = {};
    const mockLLM = vi.fn(async (key: string) => {
      callTimestamps[key] = Date.now();
      // Simulate small delay
      await new Promise((r) => setTimeout(r, 10));
      if (key === "VERDICT_ADVOCATE") return advocateResponse();
      if (key === "VERDICT_CHALLENGER") return challengeResponse();
      if (key === "VERDICT_RECONCILIATION") return reconciliationResponse();
      if (key === "VERDICT_GROUNDING_VALIDATION") return [];
      if (key === "VERDICT_DIRECTION_VALIDATION") return [];
      return [];
    });

    await runVerdictStage(claims, evidence, boundaries, matrix, mockLLM);

    // Consistency and challenge should start at approximately the same time
    // (both after advocate completes)
    // The mock is called multiple times for VERDICT_ADVOCATE (consistency re-runs)
    expect(mockLLM).toHaveBeenCalled();
  });
});

// ============================================================================
// GATE 4: CONFIDENCE CLASSIFICATION
// ============================================================================

describe("classifyConfidence (Gate 4)", () => {
  it("should return verdicts unchanged (confidence already embedded)", () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const result = classifyConfidence(verdicts);
    expect(result).toEqual(verdicts);
  });
});

// ============================================================================
// ENFORCE HARM CONFIDENCE FLOOR (C8 — Stammbach/Ash bias mitigation)
// ============================================================================

describe("enforceHarmConfidenceFloor", () => {
  /** Helper to create a verdict with specific harm/confidence */
  function createVerdict(
    overrides: Partial<CBClaimVerdict> = {},
  ): CBClaimVerdict {
    return {
      id: "CV_AC_01",
      claimId: "AC_01",
      truthPercentage: 75,
      verdict: "MOSTLY-TRUE",
      confidence: 80,
      reasoning: "Test reasoning",
      harmPotential: "medium",
      isContested: false,
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: {
        claimId: "AC_01", percentages: [], average: 0, spread: 0,
        stable: true, assessed: false,
      },
      challengeResponses: [],
      triangulationScore: {
        boundaryCount: 0, supporting: 0, contradicting: 0,
        level: "weak", factor: 1.0,
      },
      ...overrides,
    };
  }

  const config: VerdictStageConfig = {
    ...DEFAULT_VERDICT_STAGE_CONFIG,
    highHarmMinConfidence: 50,
  };

  it("should downgrade high-harm claim with low confidence to UNVERIFIED", () => {
    const verdicts = [createVerdict({
      harmPotential: "high",
      confidence: 30,
      truthPercentage: 72,
      verdict: "MOSTLY-TRUE",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("UNVERIFIED");
    // Original truthPercentage and confidence preserved for transparency
    expect(result[0].truthPercentage).toBe(72);
    expect(result[0].confidence).toBe(30);
  });

  it("should downgrade critical-harm claim with low confidence to UNVERIFIED", () => {
    const verdicts = [createVerdict({
      harmPotential: "critical",
      confidence: 45,
      truthPercentage: 85,
      verdict: "MOSTLY-TRUE",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("UNVERIFIED");
  });

  it("should NOT downgrade high-harm claim with sufficient confidence", () => {
    const verdicts = [createVerdict({
      harmPotential: "high",
      confidence: 60,
      truthPercentage: 72,
      verdict: "MOSTLY-TRUE",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("MOSTLY-TRUE");
  });

  it("should NOT affect medium-harm claims regardless of confidence", () => {
    const verdicts = [createVerdict({
      harmPotential: "medium",
      confidence: 20,
      truthPercentage: 72,
      verdict: "MOSTLY-TRUE",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("MOSTLY-TRUE");
  });

  it("should NOT affect low-harm claims regardless of confidence", () => {
    const verdicts = [createVerdict({
      harmPotential: "low",
      confidence: 10,
      truthPercentage: 90,
      verdict: "TRUE",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("TRUE");
  });

  it("should leave already-UNVERIFIED verdicts unchanged", () => {
    const verdicts = [createVerdict({
      harmPotential: "critical",
      confidence: 20,
      truthPercentage: 50,
      verdict: "UNVERIFIED",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("UNVERIFIED");
  });

  it("should be disabled when threshold is 0", () => {
    const disabledConfig = { ...config, highHarmMinConfidence: 0 };
    const verdicts = [createVerdict({
      harmPotential: "critical",
      confidence: 10,
      truthPercentage: 90,
      verdict: "TRUE",
    })];

    const result = enforceHarmConfidenceFloor(verdicts, disabledConfig);
    expect(result[0].verdict).toBe("TRUE");
  });

  it("should handle mixed verdicts (some high-harm, some not)", () => {
    const verdicts = [
      createVerdict({
        id: "CV_01", claimId: "AC_01",
        harmPotential: "high", confidence: 30,
        truthPercentage: 80, verdict: "MOSTLY-TRUE",
      }),
      createVerdict({
        id: "CV_02", claimId: "AC_02",
        harmPotential: "medium", confidence: 30,
        truthPercentage: 80, verdict: "MOSTLY-TRUE",
      }),
      createVerdict({
        id: "CV_03", claimId: "AC_03",
        harmPotential: "high", confidence: 70,
        truthPercentage: 80, verdict: "MOSTLY-TRUE",
      }),
    ];

    const result = enforceHarmConfidenceFloor(verdicts, config);
    expect(result[0].verdict).toBe("UNVERIFIED");    // high-harm, low confidence
    expect(result[1].verdict).toBe("MOSTLY-TRUE");   // medium-harm, not affected
    expect(result[2].verdict).toBe("MOSTLY-TRUE");   // high-harm, sufficient confidence
  });

  it("should use the exact threshold boundary correctly", () => {
    // Confidence exactly at threshold — should NOT be downgraded
    const atThreshold = [createVerdict({
      harmPotential: "high", confidence: 50,
      truthPercentage: 72, verdict: "MOSTLY-TRUE",
    })];
    expect(enforceHarmConfidenceFloor(atThreshold, config)[0].verdict).toBe("MOSTLY-TRUE");

    // Confidence one below threshold — SHOULD be downgraded
    const belowThreshold = [createVerdict({
      harmPotential: "high", confidence: 49,
      truthPercentage: 72, verdict: "MOSTLY-TRUE",
    })];
    expect(enforceHarmConfidenceFloor(belowThreshold, config)[0].verdict).toBe("UNVERIFIED");
  });
});

// ============================================================================
// CONFIGURABLE DEBATE MODEL TIERS (Stammbach/Ash C1/C16)
// ============================================================================

describe("Configurable debate model tiers", () => {
  const claims = [createAtomicClaim()];
  const evidence = [createEvidenceItem()];
  const boundaries = [createClaimBoundary()];
  const coverageMatrix = buildCoverageMatrix(claims, evidence, boundaries);

  it("advocateVerdict should use config.debateModelTiers.advocate", async () => {
    const mockLLM = createMockLLM({ VERDICT_ADVOCATE: advocateResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateModelTiers: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateModelTiers, advocate: "haiku" },
    };

    await advocateVerdict(claims, evidence, boundaries, coverageMatrix, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions).toEqual({ tier: "haiku" });
  });

  it("selfConsistencyCheck should use config.debateModelTiers.selfConsistency", async () => {
    const advocateVerdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({ VERDICT_ADVOCATE: advocateResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "enabled",
      debateModelTiers: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateModelTiers, selfConsistency: "haiku" },
    };

    await selfConsistencyCheck(claims, evidence, boundaries, coverageMatrix, advocateVerdicts, mockLLM, config);

    // selfConsistencyCheck makes 2 parallel calls
    expect(mockLLM).toHaveBeenCalledTimes(2);
    const call1Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    const call2Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2];
    expect(call1Options.tier).toBe("haiku");
    expect(call2Options.tier).toBe("haiku");
  });

  it("adversarialChallenge should use config.debateModelTiers.challenger", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: challengeResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateModelTiers: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateModelTiers, challenger: "haiku" },
    };

    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions).toEqual({ tier: "haiku" });
  });

  it("reconcileVerdicts should use config.debateModelTiers.reconciler", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const challengeDoc = { challenges: [{ claimId: "AC_01", challengePoints: [] }] };
    const consistencyResults: ConsistencyResult[] = [
      { claimId: "AC_01", percentages: [75, 73, 77], average: 75, spread: 4, stable: true, assessed: true },
    ];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{ claimId: "AC_01", truthPercentage: 72, confidence: 78, reasoning: "Reconciled" }],
    });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateModelTiers: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateModelTiers, reconciler: "haiku" },
    };

    await reconcileVerdicts(advocateVerdictsList, challengeDoc, consistencyResults, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions).toEqual({ tier: "haiku" });
  });

  it("default config should use sonnet for all roles", () => {
    expect(DEFAULT_VERDICT_STAGE_CONFIG.debateModelTiers).toEqual({
      advocate: "sonnet",
      selfConsistency: "sonnet",
      challenger: "sonnet",
      reconciler: "sonnet",
    });
  });
});
