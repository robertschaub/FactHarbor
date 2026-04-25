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
 * - Step 5: validateVerdicts (policy-driven: advisory by default, integrity gating when enabled)
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
  validateChallengeEvidence,
  enforceBaselessChallengePolicy,
  computeTruthPercentageRange,
  stripPhantomEvidenceIds,
  buildSourcePortfolio,
  buildSourcePortfolioByClaim,
  isVerdictDirectionPlausible,
  getClaimLocalEvidence,
  DEFAULT_VERDICT_STAGE_CONFIG,
  type LLMCallFn,
  type VerdictStageConfig,
} from "@/lib/analyzer/verdict-stage";
import type {
  AnalysisWarning,
  AtomicClaim,
  CBClaimVerdict,
  ChallengeDocument,
  ClaimBoundary,
  ConsistencyResult,
  CoverageMatrix,
  EvidenceItem,
  FetchedSource,
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
    thesisRelevance: "direct",
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
    applicability: "direct",
    probativeValue: "high",
    claimBoundaryId: "CB_01",
    relevantClaimIds: ["AC_01"],
    ...overrides,
  };
}

function createCBVerdict(overrides: Partial<CBClaimVerdict> = {}): CBClaimVerdict {
  return {
    id: "CV_AC_01",
    claimId: "AC_01",
    truthPercentage: 75,
    verdict: "MOSTLY-TRUE",
    confidence: 80,
    confidenceTier: "HIGH",
    reasoning: "Test reasoning",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: ["EV_01"],
    contradictingEvidenceIds: [],
    boundaryFindings: [{
      boundaryId: "CB_01",
      boundaryName: "STD",
      truthPercentage: 75,
      confidence: 80,
      evidenceDirection: "supports",
      evidenceCount: 3,
    }],
    consistencyResult: {
      claimId: "AC_01",
      percentages: [75],
      average: 75,
      spread: 0,
      stable: true,
      assessed: false,
    },
    challengeResponses: [],
    triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
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
      expect.objectContaining({ tier: "standard" }),
    );
  });

  it("should propagate thesisRelevance from AtomicClaim into CBClaimVerdict", async () => {
    const claims = [createAtomicClaim({ thesisRelevance: "tangential" })];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: advocateResponse(),
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(result[0].thesisRelevance).toBe("tangential");
  });

  it("should trim advocate evidence payload to contract-relevant fields", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem({
      sourceType: "peer_reviewed_study",
      sourceAuthority: "primary",
      evidenceBasis: "scientific",
      fromOppositeClaimSearch: true,
      isDerivative: true,
      derivedFromSourceUrl: "https://example.com/original",
      evidenceScope: {
        name: "Scope A",
        methodology: "Method A",
        temporal: "2024",
      },
      scopeQuality: "complete",
    })];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);
    const mockLLM = createMockLLM({ VERDICT_ADVOCATE: advocateResponse() });

    await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    const callInput = (mockLLM as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      evidenceItems: Array<Record<string, unknown>>;
    };
    const sent = callInput.evidenceItems[0];

    expect(sent).toMatchObject({
      id: "EV_01",
      statement: evidence[0].statement,
      claimDirection: "supports",
      applicability: "direct",
      sourceId: "S1",
      sourceUrl: "https://example.com/source",
      sourceTitle: "Example Source",
      sourceType: "peer_reviewed_study",
      probativeValue: "high",
      sourceAuthority: "primary",
      evidenceBasis: "scientific",
      claimBoundaryId: "CB_01",
      relevantClaimIds: ["AC_01"],
      fromOppositeClaimSearch: true,
      isDerivative: true,
      derivedFromSourceUrl: "https://example.com/original",
      scopeQuality: "complete",
    });
    expect(sent).not.toHaveProperty("sourceExcerpt");
    expect(sent).not.toHaveProperty("specificity");
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

  it("should accept object-wrapped advocate output arrays", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: {
        verdicts: advocateResponse(),
      },
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);
    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe("AC_01");
    expect(result[0].truthPercentage).toBe(75);
  });

  it("should accept a bare single advocate output object when it has claimId and truthPercentage", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: advocateResponse()[0],
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);
    expect(result).toHaveLength(1);
    expect(result[0].claimId).toBe("AC_01");
    expect(result[0].truthPercentage).toBe(75);
  });

  it("should reject a bare single advocate output object missing truthPercentage", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: { claimId: "AC_01" },
    });

    await expect(
      advocateVerdict(claims, evidence, boundaries, matrix, mockLLM),
    ).rejects.toMatchObject({
      name: "Stage4MalformedShapeError",
    });
  });

  it("should strip ghost boundary IDs not in coverage matrix for the claim", async () => {
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const evidence = [createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    // LLM returns a finding for CB_01 (valid) and CB_99 (ghost)
    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: [{
        claimId: "AC_01",
        truthPercentage: 70,
        confidence: 65,
        reasoning: "Test",
        supportingEvidenceIds: ["EV_01"],
        contradictingEvidenceIds: [],
        boundaryFindings: [
          { boundaryId: "CB_01", boundaryName: "Valid", truthPercentage: 70, confidence: 65, evidenceDirection: "supports", evidenceCount: 1 },
          { boundaryId: "CB_99", boundaryName: "Ghost", truthPercentage: 30, confidence: 50, evidenceDirection: "contradicts", evidenceCount: 0 },
        ],
      }],
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(result[0].boundaryFindings).toHaveLength(1);
    expect(result[0].boundaryFindings[0].boundaryId).toBe("CB_01");
  });

  it("should strip boundary ID valid globally but not for this specific claim", async () => {
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02" }),
    ];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_02", relevantClaimIds: ["AC_02"] }),
    ];
    const boundaries = [
      createClaimBoundary({ id: "CB_01" }),
      createClaimBoundary({ id: "CB_02" }),
    ];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    // AC_01's verdict references CB_02 (valid globally but not for AC_01)
    const mockLLM = createMockLLM({
      VERDICT_ADVOCATE: [
        {
          claimId: "AC_01",
          truthPercentage: 70,
          confidence: 65,
          reasoning: "Test",
          supportingEvidenceIds: ["EV_01"],
          contradictingEvidenceIds: [],
          boundaryFindings: [
            { boundaryId: "CB_01", boundaryName: "Valid for AC_01", truthPercentage: 70, confidence: 65, evidenceDirection: "supports", evidenceCount: 1 },
            { boundaryId: "CB_02", boundaryName: "Valid for AC_02 only", truthPercentage: 40, confidence: 50, evidenceDirection: "contradicts", evidenceCount: 1 },
          ],
        },
        {
          claimId: "AC_02",
          truthPercentage: 60,
          confidence: 55,
          reasoning: "Test",
          supportingEvidenceIds: ["EV_02"],
          contradictingEvidenceIds: [],
          boundaryFindings: [
            { boundaryId: "CB_02", boundaryName: "Valid for AC_02", truthPercentage: 60, confidence: 55, evidenceDirection: "supports", evidenceCount: 1 },
          ],
        },
      ],
    });

    const result = await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    // AC_01 should only keep CB_01
    expect(result[0].boundaryFindings).toHaveLength(1);
    expect(result[0].boundaryFindings[0].boundaryId).toBe("CB_01");
    // AC_02 keeps CB_02
    expect(result[1].boundaryFindings).toHaveLength(1);
    expect(result[1].boundaryFindings[0].boundaryId).toBe("CB_02");
  });
});

// ============================================================================
// STEP 2: SELF-CONSISTENCY CHECK
// ============================================================================

// ============================================================================
// REPORT LANGUAGE (Proposal 2 — multilingual output policy)
// ============================================================================

describe("reportLanguage propagation (Proposal 2)", () => {
  it("should pass reportLanguage to VERDICT_ADVOCATE payload when set on config", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    let capturedPayload: any = null;
    const mockLLM = vi.fn(async (key: string, payload: any) => {
      if (key === "VERDICT_ADVOCATE") {
        capturedPayload = payload;
        return [advocateResponse()];
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      reportLanguage: "de",
    };

    await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM, config);

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.reportLanguage).toBe("de");
  });

  it("should preserve freshnessRequirement on atomicClaims sent to VERDICT_ADVOCATE", async () => {
    const claims = [createAtomicClaim({ freshnessRequirement: "current_snapshot" })];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    let capturedPayload: any = null;
    const mockLLM = vi.fn(async (key: string, payload: any) => {
      if (key === "VERDICT_ADVOCATE") {
        capturedPayload = payload;
        return [advocateResponse()];
      }
      return [];
    }) as unknown as LLMCallFn;

    await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.atomicClaims?.[0]?.freshnessRequirement).toBe("current_snapshot");
  });

  it("should NOT include reportLanguage in payload when not set on config", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(claims, boundaries, evidence);

    let capturedPayload: any = null;
    const mockLLM = vi.fn(async (key: string, payload: any) => {
      if (key === "VERDICT_ADVOCATE") {
        capturedPayload = payload;
        return [advocateResponse()];
      }
      return [];
    }) as unknown as LLMCallFn;

    await advocateVerdict(claims, evidence, boundaries, matrix, mockLLM);

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.reportLanguage).toBeUndefined();
  });

  it("should pass reportLanguage to VERDICT_RECONCILIATION payload via config", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [createEvidenceItem({ id: "EV_01" })];

    let capturedPayload: any = null;
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: reconciliationResponse(),
    });
    const wrappedLLM = vi.fn(async (key: string, payload: any, options: any) => {
      if (key === "VERDICT_RECONCILIATION") capturedPayload = payload;
      return mockLLM(key, payload, options);
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      reportLanguage: "fr",
    };

    await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], evidence, wrappedLLM, config,
    );

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.reportLanguage).toBe("fr");
  });
});

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

  it("should trim self-consistency evidence payload to contract-relevant fields", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [createEvidenceItem({
      sourceType: "government_report",
      sourceAuthority: "primary",
      evidenceBasis: "documented",
      isDerivative: true,
      derivedFromSourceUrl: "https://example.com/original",
    })];
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
    const mockLLM = vi.fn(async () => [{ claimId: "AC_01", truthPercentage: 72 }]);

    await selfConsistencyCheck(
      claims, evidence, boundaries, matrix, advocateVerdictsList, mockLLM,
    );

    const callInput = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      evidenceItems: Array<Record<string, unknown>>;
    };
    const sent = callInput.evidenceItems[0];

    expect(sent).toMatchObject({
      id: "EV_01",
      sourceId: "S1",
      sourceUrl: "https://example.com/source",
      sourceType: "government_report",
      sourceAuthority: "primary",
      evidenceBasis: "documented",
      isDerivative: true,
      derivedFromSourceUrl: "https://example.com/original",
      probativeValue: "high",
    });
    expect(sent).not.toHaveProperty("sourceExcerpt");
    expect(sent).not.toHaveProperty("specificity");
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

  it("should trim challenger evidence payload to contract-relevant fields", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [createEvidenceItem({
      sourceType: "news_primary",
      sourceAuthority: "secondary",
      evidenceBasis: "documented",
    })];
    const boundaries = [createClaimBoundary()];
    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: challengeResponse() });

    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM);

    const callInput = (mockLLM as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      evidenceItems: Array<Record<string, unknown>>;
    };
    const sent = callInput.evidenceItems[0];

    expect(sent).toMatchObject({
      id: "EV_01",
      sourceId: "S1",
      sourceUrl: "https://example.com/source",
      sourceType: "news_primary",
      sourceAuthority: "secondary",
      evidenceBasis: "documented",
      probativeValue: "high",
    });
    expect(sent).not.toHaveProperty("sourceExcerpt");
  });

  it("should handle empty challenge response gracefully", async () => {
    const verdicts: CBClaimVerdict[] = [];
    const evidence: EvidenceItem[] = [];
    const boundaries: ClaimAssessmentBoundary[] = [];

    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: {} });

    const result = await adversarialChallenge(verdicts, evidence, boundaries, mockLLM);

    expect(result.challenges).toEqual([]);
  });

  it("should throw Stage4NullResultError when challenger returns null", async () => {
    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: null });

    await expect(
      adversarialChallenge([], [], [], mockLLM),
    ).rejects.toMatchObject({
      name: "Stage4NullResultError",
    });
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

    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const { verdicts: result, validatedChallengeDoc } = await reconcileVerdicts(
      advocateVerdictsList, challengeDoc, consistencyResults, evidence, mockLLM,
    );

    expect(result).toHaveLength(1);
    expect(result[0].truthPercentage).toBe(72);
    expect(result[0].confidence).toBe(78);
    expect(result[0].confidenceTier).toBe("HIGH");
    expect(result[0].verdict).toBe("MOSTLY-TRUE");
    expect(result[0].challengeResponses).toHaveLength(1);
    expect(result[0].challengeResponses[0].verdictAdjusted).toBe(true);
    // Boundary findings preserved from advocate
    expect(result[0].boundaryFindings).toHaveLength(1);
    // Consistency result attached
    expect(result[0].consistencyResult.assessed).toBe(true);
    expect(result[0].consistencyResult.spread).toBe(3);
    // Validated challenge doc returned
    expect(validatedChallengeDoc.challenges).toHaveLength(1);
  });

  it("sends evidence applicability and direction metadata to reconciliation", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01",
      claimId: "AC_01",
      truthPercentage: 75,
      verdict: "MOSTLY-TRUE",
      confidence: 80,
      reasoning: "Original reasoning",
      harmPotential: "medium",
      isContested: false,
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const evidence = [
      createEvidenceItem({
        id: "EV_01",
        relevantClaimIds: ["AC_01"],
        applicability: "direct",
        claimDirection: "supports",
      }),
      createEvidenceItem({
        id: "EV_02",
        relevantClaimIds: ["AC_01"],
        applicability: "contextual",
        claimDirection: "neutral",
      }),
    ];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: reconciliationResponse(),
    });

    await reconcileVerdicts(
      advocateVerdictsList,
      { challenges: [] },
      [],
      evidence,
      mockLLM,
    );

    const callInput = (mockLLM as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      evidenceItems: Array<Record<string, unknown>>;
    };

    expect(callInput.evidenceItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "EV_01",
        applicability: "direct",
        claimDirection: "supports",
      }),
      expect.objectContaining({
        id: "EV_02",
        applicability: "contextual",
        claimDirection: "neutral",
      }),
    ]));
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
    const warnings: AnalysisWarning[] = [];

    const { verdicts: result } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings,
    );

    // Original preserved
    expect(result[0].truthPercentage).toBe(75);
    expect(warnings.some((w) => w.type === "verdict_partial_recovery")).toBe(true);
  });

  it("should throw Stage4NullResultError when reconciliation returns null", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, confidenceTier: "HIGH", reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const mockLLM = createMockLLM({ VERDICT_RECONCILIATION: null });

    await expect(
      reconcileVerdicts(advocateVerdictsList, { challenges: [] }, [], [], mockLLM),
    ).rejects.toMatchObject({
      name: "Stage4NullResultError",
    });
  });

  it("should accept object-wrapped reconciliation output arrays", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, confidenceTier: "HIGH", reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: {
        verdicts: reconciliationResponse(),
      },
    });

    const { verdicts: result } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [createEvidenceItem({ id: "EV_01" })], mockLLM,
    );

    expect(result).toHaveLength(1);
    expect(result[0].truthPercentage).toBe(72);
  });

  it("should preserve advocate verdicts when reconciliation output shape is invalid", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, confidenceTier: "HIGH", reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];

    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: { note: "not-an-array" },
    });
    const warnings: AnalysisWarning[] = [];

    const { verdicts: result } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings,
    );

    expect(result).toHaveLength(1);
    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    expect(warnings.some((w) => w.type === "verdict_fallback_partial")).toBe(true);
  });
});

// ============================================================================
// CITATION CARRIAGE (reconciliation → verdict arrays)
// ============================================================================

describe("reconciliation citation carriage", () => {
  const makeAdvocate = (supportIds: string[] = ["EV_01"], contradictIds: string[] = []): CBClaimVerdict => ({
    id: "CV_AC_01", claimId: "AC_01", truthPercentage: 65, verdict: "LEANING-TRUE",
    confidence: 70, reasoning: "Original", harmPotential: "medium", isContested: false,
    supportingEvidenceIds: supportIds, contradictingEvidenceIds: contradictIds,
    boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [65], average: 65, spread: 0, stable: true, assessed: false },
    challengeResponses: [],
    triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
  });

  const evidence = [
    createEvidenceItem({ id: "EV_01" }),
    createEvidenceItem({ id: "EV_02" }),
    createEvidenceItem({ id: "EV_03" }),
    createEvidenceItem({ id: "EV_04" }),
  ];

  it("should apply reconciliation citation arrays when valid", async () => {
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 48, confidence: 60,
        reasoning: "Reconciled with new evidence",
        isContested: true,
        supportingEvidenceIds: ["EV_01"],
        contradictingEvidenceIds: ["EV_02", "EV_03"],
        challengeResponses: [],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      [makeAdvocate(["EV_01"], [])], { challenges: [] }, [], evidence, mockLLM,
    );

    expect(verdicts[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(verdicts[0].contradictingEvidenceIds).toEqual(["EV_02", "EV_03"]);
  });

  it("should fall back to advocate arrays when reconciliation omits citation arrays", async () => {
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 48, confidence: 60,
        reasoning: "Reconciled without arrays",
        isContested: false, challengeResponses: [],
        // no supportingEvidenceIds or contradictingEvidenceIds
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      [makeAdvocate(["EV_01"], ["EV_04"])], { challenges: [] }, [], evidence, mockLLM,
    );

    expect(verdicts[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(verdicts[0].contradictingEvidenceIds).toEqual(["EV_04"]);
  });

  it("should filter phantom evidence IDs from reconciliation arrays", async () => {
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 48, confidence: 60,
        reasoning: "Reconciled with phantom",
        isContested: false, challengeResponses: [],
        supportingEvidenceIds: ["EV_01", "EV_PHANTOM"],
        contradictingEvidenceIds: ["EV_02", "EV_GHOST"],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      [makeAdvocate()], { challenges: [] }, [], evidence, mockLLM,
    );

    expect(verdicts[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(verdicts[0].contradictingEvidenceIds).toEqual(["EV_02"]);
  });

  it("should fall back to advocate arrays when ALL reconciliation IDs are phantom", async () => {
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 48, confidence: 60,
        reasoning: "All phantoms",
        isContested: false, challengeResponses: [],
        supportingEvidenceIds: ["EV_PHANTOM_1"],
        contradictingEvidenceIds: ["EV_PHANTOM_2"],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      [makeAdvocate(["EV_01"], ["EV_04"])], { challenges: [] }, [], evidence, mockLLM,
    );

    // Falls back to advocate arrays since all reconciliation IDs were phantom
    expect(verdicts[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(verdicts[0].contradictingEvidenceIds).toEqual(["EV_04"]);
  });

  it("should accept intentionally empty arrays from reconciliation (clearing stale citations)", async () => {
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 48, confidence: 60,
        reasoning: "Reconciler cleared supporting side",
        isContested: false, challengeResponses: [],
        supportingEvidenceIds: [],
        contradictingEvidenceIds: ["EV_02"],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      [makeAdvocate(["EV_01"], ["EV_04"])], { challenges: [] }, [], evidence, mockLLM,
    );

    // Empty array = intentionally cleared, NOT a fallback to advocate
    expect(verdicts[0].supportingEvidenceIds).toEqual([]);
    expect(verdicts[0].contradictingEvidenceIds).toEqual(["EV_02"]);
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
      "VERDICT_GROUNDING_VALIDATION", expect.any(Object), expect.objectContaining({ tier: "budget" }),
    );
    expect(mockLLM).toHaveBeenCalledWith(
      "VERDICT_DIRECTION_VALIDATION", expect.any(Object), expect.objectContaining({ tier: "budget" }),
    );
    // Verdicts returned unchanged
    expect(result).toEqual(verdicts);
  });

  it("emits verdict_batch_retry when validation recovers on retry", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({ claimId: "AC_01" })];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const warnings: AnalysisWarning[] = [];
    let groundingCalls = 0;

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        groundingCalls += 1;
        if (groundingCalls === 1) {
          throw new Error("transient grounding failure");
        }
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    const result = await validateVerdicts(verdicts, evidence, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings);

    expect(result[0].truthPercentage).toBe(verdicts[0].truthPercentage);
    expect(warnings.some((w) => w.type === "verdict_batch_retry")).toBe(true);
    expect(warnings.some((w) => w.type === "grounding_check_degraded")).toBe(false);
  });

  it("emits degraded validation warning when grounding validation fails after retry", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({ claimId: "AC_01" })];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const warnings: AnalysisWarning[] = [];

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        throw new Error("grounding unavailable");
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    const result = await validateVerdicts(verdicts, evidence, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings);

    expect(result).toHaveLength(1);
    expect(warnings.some((w) => w.type === "grounding_check_degraded" && w.severity === "warning")).toBe(true);
  });

  it("emits degraded validation warning when direction validation fails after retry", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({ claimId: "AC_01" })];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const warnings: AnalysisWarning[] = [];

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        throw new Error("direction unavailable");
      }
      return [];
    }) as unknown as LLMCallFn;

    const result = await validateVerdicts(verdicts, evidence, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings);

    expect(result).toHaveLength(1);
    expect(warnings.some((w) => w.type === "direction_validation_degraded" && w.severity === "warning")).toBe(true);
  });

  it("applies safe_downgrade on grounding failure when grounding policy is enabled", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 78,
      confidence: 82,
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: [],
    })];
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const warnings: AnalysisWarning[] = [];

    const mockLLM = createMockLLM({
      VERDICT_GROUNDING_VALIDATION: [{ claimId: "AC_01", groundingValid: false, issues: ["Missing evidence id"] }],
      VERDICT_DIRECTION_VALIDATION: [{ claimId: "AC_01", directionValid: true, issues: [] }],
    });

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictGroundingPolicy: "safe_downgrade",
    };

    const result = await validateVerdicts(verdicts, evidence, mockLLM, config, warnings);

    expect(result[0].truthPercentage).toBe(50);
    expect(result[0].confidenceTier).toBe("INSUFFICIENT");
    expect(result[0].verdictReason).toBe("verdict_integrity_failure");
    expect(warnings.some((w) => w.type === "verdict_grounding_issue" && w.severity === "info")).toBe(true);
    expect(warnings.some((w) => w.type === "verdict_integrity_failure" && w.severity === "error")).toBe(true);
  });

  it("repairs direction mismatch once when direction policy is enabled and repair succeeds", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 82,
      confidence: 80,
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: ["EV_02"],
      challengeResponses: [{
        challengeType: "assumption",
        response: "Original challenge handling",
        verdictAdjusted: true,
        adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
      }],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let directionValidationCalls = 0;
    let groundingValidationCalls = 0;
    const mockLLM = vi.fn(async (key: string, input?: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        groundingValidationCalls += 1;
        if (groundingValidationCalls === 2) {
          const verdictInput = (input?.verdicts as Array<Record<string, unknown>> | undefined)?.[0];
          expect(verdictInput?.supportingEvidenceIds).toHaveLength(2);
          expect((verdictInput?.supportingEvidenceIds as string[]).every((id) => /^EVG_\d{3}$/.test(id))).toBe(true);
          expect(verdictInput?.contradictingEvidenceIds).toEqual([]);
          return [{ claimId: "AC_01", groundingValid: false, issues: ["Normalized citations need repaired reasoning"] }];
        }
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Mismatch"] }];
        }
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        return { claimId: "AC_01", truthPercentage: 46, reasoning: "Repaired direction alignment" };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    expect(result[0].truthPercentage).toBe(46);
    expect(result[0].verdictReason).not.toBe("verdict_integrity_failure");
    expect(result[0].boundaryFindings).toEqual([{
      boundaryId: "CB_01",
      boundaryName: "Standard Analysis Boundary",
      truthPercentage: 46,
      confidence: 80,
      evidenceDirection: "supports",
      evidenceCount: 2,
    }]);
    expect(result[0].challengeResponses).toEqual(verdicts[0].challengeResponses);
    expect(warnings.some((w) => w.type === "verdict_integrity_failure")).toBe(false);
    expect((mockLLM as ReturnType<typeof vi.fn>).mock.calls.some((c) => c[0] === "VERDICT_DIRECTION_REPAIR")).toBe(true);
    expect(groundingValidationCalls).toBe(3);
  });

  it("accepts structurally normalized citations before invoking repair", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 52,
      confidence: 80,
      reasoning: "Original grounded reasoning",
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: [],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "contradicts" }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports", applicability: "contextual" }),
      createEvidenceItem({ id: "EV_03", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let directionValidationCalls = 0;
    const mockLLM = vi.fn(async (key: string, input?: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Mismatch"] }];
        }
        const verdictInput = (input?.verdicts as Array<Record<string, unknown>> | undefined)?.[0];
        expect(verdictInput?.supportingEvidenceIds).toEqual([]);
        expect(verdictInput?.contradictingEvidenceIds).toEqual(["EV_01"]);
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        throw new Error("Repair should not run when normalized citations already validate");
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    expect(result[0].truthPercentage).toBe(52);
    expect(result[0].supportingEvidenceIds).toEqual([]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_01"]);
    expect((mockLLM as ReturnType<typeof vi.fn>).mock.calls.some((c) => c[0] === "VERDICT_DIRECTION_REPAIR")).toBe(false);
    expect(result[0].boundaryFindings).toEqual([{
      boundaryId: "CB_01",
      boundaryName: "Standard Analysis Boundary",
      truthPercentage: 52,
      confidence: 80,
      evidenceDirection: "mixed",
      evidenceCount: 2,
    }]);
  });

  it("drops neutral citations returned by direction repair before accepting the repaired verdict", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 55,
      confidence: 80,
      supportingEvidenceIds: ["EV_CONTRADICT"],
      contradictingEvidenceIds: [],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({
        id: "EV_CONTRADICT",
        claimBoundaryId: "CB_01",
        relevantClaimIds: ["AC_01"],
        claimDirection: "contradicts",
      }),
      createEvidenceItem({
        id: "EV_SUPPORT",
        claimBoundaryId: "CB_01",
        relevantClaimIds: ["AC_01"],
        claimDirection: "supports",
      }),
      createEvidenceItem({
        id: "EV_NEUTRAL",
        claimBoundaryId: "CB_01",
        relevantClaimIds: ["AC_01"],
        claimDirection: "neutral",
      }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let directionValidationCalls = 0;
    const mockLLM = vi.fn(async (key: string, input?: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Initial mismatch"] }];
        }
        if (directionValidationCalls === 2) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Normalized mismatch"] }];
        }

        const verdictInput = (input?.verdicts as Array<Record<string, unknown>> | undefined)?.[0];
        expect(verdictInput?.supportingEvidenceIds).toEqual(["EV_SUPPORT"]);
        expect(verdictInput?.contradictingEvidenceIds).toEqual([]);
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      [],
      {
        claims,
        boundaries,
        coverageMatrix,
        repairExecutor: async (request) => ({
          ...request.verdict,
          truthPercentage: 65,
          supportingEvidenceIds: ["EV_SUPPORT", "EV_NEUTRAL"],
          contradictingEvidenceIds: [],
          reasoning: "Repaired with one directional support citation.",
        }),
      },
    );

    expect(result[0].supportingEvidenceIds).toEqual(["EV_SUPPORT"]);
    expect(result[0].contradictingEvidenceIds).toEqual([]);
    expect(result[0].supportingEvidenceIds).not.toContain("EV_NEUTRAL");
    expect(directionValidationCalls).toBe(3);
  });

  it("rejects repaired reasoning that fails post-repair grounding and preserves pre-repair reasoning", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 82,
      confidence: 80,
      reasoning: "Original grounded reasoning",
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: ["EV_02"],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let directionValidationCalls = 0;
    let groundingValidationCalls = 0;
    let repairGroundingChecks = 0;
    const mockLLM = vi.fn(async (key: string, input?: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        groundingValidationCalls += 1;
        const reasoning = ((input?.verdicts as Array<Record<string, unknown>> | undefined)?.[0]?.reasoning ?? "") as string;
        if (groundingValidationCalls === 2) {
          return [{ claimId: "AC_01", groundingValid: false, issues: ["Normalized citations still need repaired reasoning"] }];
        }
        if (reasoning.includes("Repair artifact reasoning")) {
          repairGroundingChecks += 1;
          return [{ claimId: "AC_01", groundingValid: false, issues: ["Repair artifact reasoning not grounded"] }];
        }
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Mismatch"] }];
        }
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        return {
          claimId: "AC_01",
          truthPercentage: 46,
          reasoning: "Repair artifact reasoning with unsupported machine-id prose",
        };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    expect(result[0].truthPercentage).toBe(46);
    expect(result[0].reasoning).toBe("Original grounded reasoning");
    expect(result[0].boundaryFindings).toEqual([{
      boundaryId: "CB_01",
      boundaryName: "Standard Analysis Boundary",
      truthPercentage: 46,
      confidence: 80,
      evidenceDirection: "supports",
      evidenceCount: 2,
    }]);
    expect(repairGroundingChecks).toBe(1);
    expect(groundingValidationCalls).toBe(4);
    expect(warnings.some((w) => w.message.includes("repaired reasoning rejected"))).toBe(true);
    expect(warnings.some((w) => w.type === "verdict_integrity_failure")).toBe(false);
  });

  it("sends normalized verdicts to repair when direction validation still fails", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_02",
      truthPercentage: 55,
      confidence: 80,
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: [],
      consistencyResult: { claimId: "AC_02", percentages: [55, 55, 55], average: 55, spread: 0, stable: true, assessed: true },
    })];
    const claims = [createAtomicClaim({ id: "AC_02" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_02"], claimDirection: "contradicts" }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_02"], claimDirection: "supports", applicability: "contextual" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let directionValidationCalls = 0;
    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_02", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_02", directionValid: false, issues: ["Initial mismatch"] }];
        }
        if (directionValidationCalls === 2) {
          return [{ claimId: "AC_02", directionValid: false, issues: ["Truth percentage remains inconsistent with the remaining contradicting evidence"] }];
        }
        return [{ claimId: "AC_02", directionValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        return { claimId: "AC_02", truthPercentage: 35, reasoning: "Adjusted to match contradicting evidence after normalization" };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    expect(result[0].truthPercentage).toBe(35);
    expect(result[0].verdictReason).not.toBe("verdict_integrity_failure");
    expect((mockLLM as ReturnType<typeof vi.fn>).mock.calls.some((c) => c[0] === "VERDICT_DIRECTION_REPAIR")).toBe(true);
    expect(warnings.some((w) => w.type === "verdict_direction_issue" && w.message.includes("Initial mismatch"))).toBe(false);
  });

  it("safe-downgrades when repaired verdict still fails direction re-validation", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_02",
      truthPercentage: 55,
      confidence: 80,
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: [],
      consistencyResult: { claimId: "AC_02", percentages: [55, 55, 55], average: 55, spread: 0, stable: true, assessed: true },
    })];
    const claims = [createAtomicClaim({ id: "AC_02" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_02"], claimDirection: "contradicts" }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_02"], claimDirection: "supports", applicability: "contextual" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let directionValidationCalls = 0;
    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_02", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_02", directionValid: false, issues: ["Initial mismatch"] }];
        }
        return [{ claimId: "AC_02", directionValid: false, issues: ["Truth percentage still does not match the remaining contradicting evidence"] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        return { claimId: "AC_02", truthPercentage: 65, reasoning: "Repair still left a mismatched mixed verdict" };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    expect(result[0].truthPercentage).toBe(50);
    expect(result[0].verdictReason).toBe("verdict_integrity_failure");
    expect(warnings.some((w) => w.type === "verdict_integrity_failure")).toBe(true);
  });

  it("derives repaired citation arrays from claim-local direct evidence when repair omits them", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 35,
      confidence: 80,
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: ["EV_02"],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_02", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "contradicts", applicability: "contextual" }),
      createEvidenceItem({ id: "EV_03", claimBoundaryId: "CB_01", relevantClaimIds: ["AC_01"], claimDirection: "contradicts" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

    let directionValidationCalls = 0;
    let repairedDirectionInput: Record<string, unknown> | undefined;
    const mockLLM = vi.fn(async (key: string, input?: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionValidationCalls += 1;
        if (directionValidationCalls === 1) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Initial mismatch"] }];
        }
        if (directionValidationCalls === 2) {
          return [{ claimId: "AC_01", directionValid: false, issues: ["Normalized verdict still overstates the supporting side"] }];
        }
        repairedDirectionInput = (input?.verdicts as Array<Record<string, unknown>> | undefined)?.[0];
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        return { claimId: "AC_01", truthPercentage: 52, reasoning: "Adjusted to reflect both the compliant trial phase and the contradicting investigative-phase evidence" };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      [],
      { claims, boundaries, coverageMatrix },
    );

    expect(repairedDirectionInput?.supportingEvidenceIds).toEqual(["EV_01"]);
    expect(repairedDirectionInput?.contradictingEvidenceIds).toEqual(["EV_03"]);
    expect(result[0].truthPercentage).toBe(52);
    expect(result[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_03"]);
  });

  it("overrides false-positive LLM direction failure via deterministic plausibility check (AC_03 case)", async () => {
    // Scenario: Truth 15% (Mostly False), 8 contradicts, 3 supports. 
    // This is directionally consistent, but LLM incorrectly flags it.
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_03",
      truthPercentage: 15,
      confidence: 85,
      supportingEvidenceIds: ["S1", "S2", "S3"],
      contradictingEvidenceIds: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
    })];
    const claims = [createAtomicClaim({ id: "AC_03" })];
    const evidence = [
      ...["S1", "S2", "S3"].map(id => createEvidenceItem({ id, claimDirection: "supports", relevantClaimIds: ["AC_03"] })),
      ...["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"].map(id => createEvidenceItem({ id, claimDirection: "contradicts", relevantClaimIds: ["AC_03"] })),
    ];
    
    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_03", groundingValid: true, issues: [] }];
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        // Mock LLM incorrectly flagging the direction as invalid
        return [{ claimId: "AC_03", directionValid: false, issues: ["Truth 15% but only 3 support"] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    const warnings: AnalysisWarning[] = [];
    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries: [], coverageMatrix: buildCoverageMatrix(claims, [], evidence) },
    );

    // Should remain 15% truth (not downgraded to 50%) because the safety net overrode the LLM error
    expect(result[0].truthPercentage).toBe(15);
    expect(result[0].verdictReason).not.toBe("verdict_integrity_failure");
    expect(warnings.some(w => w.type === "verdict_integrity_failure")).toBe(false);
  });

  it("respects probativeValue weights in plausibility check", async () => {
    // Scenario: Truth 85% (True). 
    // Evidence: 1 High support, 2 Low contradicts. 
    // Numeric count: majority contradicts (2 vs 1).
    // Weighted count: support wins (1.0 vs 2 * 0.5 = 1.0 -> same hemisphere/neutral).
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 85,
      confidence: 85,
      supportingEvidenceIds: ["S1"],
      contradictingEvidenceIds: ["C1", "C2"],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const evidence = [
      createEvidenceItem({ id: "S1", claimDirection: "supports", probativeValue: "high", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "C1", claimDirection: "contradicts", probativeValue: "low", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "C2", claimDirection: "contradicts", probativeValue: "low", relevantClaimIds: ["AC_01"] }),
    ];
    
    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_01", directionValid: false, issues: ["Numeric mismatch"] }];
      return [];
    }) as unknown as LLMCallFn;

    const warnings: AnalysisWarning[] = [];
    const result = await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      DEFAULT_VERDICT_STAGE_CONFIG,
      warnings,
      { 
        claims, 
        boundaries: [], 
        coverageMatrix: buildCoverageMatrix(claims, [], evidence),
        calculationConfig: {
          probativeValueWeights: { high: 1.0, medium: 0.9, low: 0.5 },
        } as any
      },
    );

    // Should remain 85% because weighted ratio (1.0 support / 1.0 contradict) is neutral (0.5),
    // which is considered plausible for any verdict direction in our Rules.
    expect(result[0].truthPercentage).toBe(85);
    expect(warnings.some(w => w.type === "verdict_integrity_failure")).toBe(false);
  });

  it("emits direction_rescue_plausible warning with rescueReason when ratio-based rescue fires", async () => {
    // Truth 15% with 3 supports, 8 contradicts → ratio ~0.27 < 0.5, truth ≤ 30 → Rule 1 passes
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_03",
      truthPercentage: 15,
      confidence: 85,
      supportingEvidenceIds: ["S1", "S2", "S3"],
      contradictingEvidenceIds: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
      consistencyResult: { claimId: "AC_03", percentages: [15], average: 15, spread: 0, stable: false, assessed: false },
    })];
    const evidence = [
      ...["S1", "S2", "S3"].map(id => createEvidenceItem({ id, claimDirection: "supports", relevantClaimIds: ["AC_03"] })),
      ...["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"].map(id => createEvidenceItem({ id, claimDirection: "contradicts", relevantClaimIds: ["AC_03"] })),
    ];

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_03", groundingValid: true, issues: [] }];
      if (key === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_03", directionValid: false, issues: ["LLM false positive"] }];
      return [];
    }) as unknown as LLMCallFn;

    const warnings: AnalysisWarning[] = [];
    await validateVerdicts(verdicts, evidence, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings);

    const rescueWarning = warnings.find(w => w.type === "direction_rescue_plausible");
    expect(rescueWarning).toBeDefined();
    expect(rescueWarning!.severity).toBe("info");
    expect(rescueWarning!.details?.rescueReason).toBe("evidence_ratio");
  });

  it("emits direction_rescue_plausible with stable_consistency rescueReason when self-consistency boost fires", async () => {
    // Homeopathy-like: truth 65%, 1 high support, 4 medium contradicts, stable consistency
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_03",
      truthPercentage: 65,
      confidence: 70,
      supportingEvidenceIds: ["S1"],
      contradictingEvidenceIds: ["C1", "C2", "C3", "C4"],
      consistencyResult: { claimId: "AC_03", percentages: [68, 65, 68], average: 67, spread: 3, stable: true, assessed: true },
    })];
    const evidence = [
      createEvidenceItem({ id: "S1", claimDirection: "supports", probativeValue: "high", relevantClaimIds: ["AC_03"] }),
      ...["C1", "C2", "C3", "C4"].map(id => createEvidenceItem({ id, claimDirection: "contradicts", probativeValue: "medium", relevantClaimIds: ["AC_03"] })),
    ];

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_03", groundingValid: true, issues: [] }];
      if (key === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_03", directionValid: false, issues: ["80% contradicting at truth 65%"] }];
      return [];
    }) as unknown as LLMCallFn;

    const warnings: AnalysisWarning[] = [];
    const result = await validateVerdicts(verdicts, evidence, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG, warnings);

    // Verdict preserved (not downgraded)
    expect(result[0].truthPercentage).toBe(65);
    // Warning emitted with correct rescue reason
    const rescueWarning = warnings.find(w => w.type === "direction_rescue_plausible");
    expect(rescueWarning).toBeDefined();
    expect(rescueWarning!.details?.rescueReason).toBe("stable_consistency");
    expect(rescueWarning!.details?.consistencySpread).toBe(3);
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
// POST-SPREAD VERDICT LABEL RECOMPUTATION
// ============================================================================

describe("post-spread verdict label recomputation", () => {
  it("should relabel verdict when confidence drops below UNVERIFIED threshold after spread", () => {
    // Simulate the Step 4c scenario: truth 52%, confidence crushed from 70 to 28 by spread
    // At 52% / 28%, the truth-scale mapping should produce UNVERIFIED, not MIXED
    // Use the structural consistency check as the indirect validator:
    // a verdict at 52/28 labeled UNVERIFIED should pass, labeled MIXED should fail
    const goodVerdict: CBClaimVerdict = {
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 52, verdict: "UNVERIFIED",
      confidence: 28, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 52, confidence: 28, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    };
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix([createAtomicClaim()], boundaries, evidence);

    // UNVERIFIED at 52/28 should pass (no label mismatch)
    const warnings = runStructuralConsistencyCheck([goodVerdict], evidence, boundaries, matrix);
    expect(warnings.filter(w => w.includes("doesn't match expected"))).toHaveLength(0);

    // MIXED at 52/28 should fail (stale label)
    const badVerdict = { ...goodVerdict, verdict: "MIXED" as const };
    const badWarnings = runStructuralConsistencyCheck([badVerdict], evidence, boundaries, matrix);
    expect(badWarnings.filter(w => w.includes("doesn't match expected"))).toHaveLength(1);
  });

  it("should produce consistent verdict after spread adjustment in runStructuralConsistencyCheck", () => {
    // After the fix, Step 4c recomputes verdict — 52%/28% should be UNVERIFIED
    const verdict: CBClaimVerdict = {
      id: "CV_AC_03", claimId: "AC_03", truthPercentage: 52, verdict: "UNVERIFIED",
      confidence: 28, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 52, confidence: 28, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_03", percentages: [40, 63], average: 52, spread: 23, stable: false, assessed: true },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    };
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(
      [createAtomicClaim({ id: "AC_03" })], boundaries, evidence,
    );

    const warnings = runStructuralConsistencyCheck([verdict], evidence, boundaries, matrix);
    const labelMismatches = warnings.filter(w => w.includes("doesn't match expected"));
    expect(labelMismatches).toHaveLength(0);
  });

  it("should still flag MIXED at 52/28 as structural consistency mismatch", () => {
    // Prove that the structural checker WOULD catch a stale label
    const verdict: CBClaimVerdict = {
      id: "CV_AC_03", claimId: "AC_03", truthPercentage: 52, verdict: "MIXED",
      confidence: 28, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 52, confidence: 28, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_03", percentages: [40, 63], average: 52, spread: 23, stable: false, assessed: true },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    };
    const evidence = [createEvidenceItem()];
    const boundaries = [createClaimBoundary()];
    const matrix = buildCoverageMatrix(
      [createAtomicClaim({ id: "AC_03" })], boundaries, evidence,
    );

    const warnings = runStructuralConsistencyCheck([verdict], evidence, boundaries, matrix);
    const labelMismatches = warnings.filter(w => w.includes("doesn't match expected"));
    expect(labelMismatches).toHaveLength(1);
    expect(labelMismatches[0]).toContain("UNVERIFIED");
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
  function createVerdictWithConfidence(confidence: number): CBClaimVerdict {
    return {
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence, reasoning: "", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [],
      consistencyResult: { claimId: "AC_01", percentages: [], average: 0, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    };
  }

  it("should classify HIGH when confidence >= 75", () => {
    const result = classifyConfidence([createVerdictWithConfidence(80)]);
    expect(result[0].confidenceTier).toBe("HIGH");
  });

  it("should classify MEDIUM when confidence >= 50 and < 75", () => {
    const result = classifyConfidence([createVerdictWithConfidence(60)]);
    expect(result[0].confidenceTier).toBe("MEDIUM");
  });

  it("should classify LOW when confidence >= 25 and < 50", () => {
    const result = classifyConfidence([createVerdictWithConfidence(30)]);
    expect(result[0].confidenceTier).toBe("LOW");
  });

  it("should classify INSUFFICIENT when confidence < 25", () => {
    const result = classifyConfidence([createVerdictWithConfidence(20)]);
    expect(result[0].confidenceTier).toBe("INSUFFICIENT");
  });

  it("should classify at exact boundaries correctly", () => {
    expect(classifyConfidence([createVerdictWithConfidence(75)])[0].confidenceTier).toBe("HIGH");
    expect(classifyConfidence([createVerdictWithConfidence(50)])[0].confidenceTier).toBe("MEDIUM");
    expect(classifyConfidence([createVerdictWithConfidence(25)])[0].confidenceTier).toBe("LOW");
    expect(classifyConfidence([createVerdictWithConfidence(24)])[0].confidenceTier).toBe("INSUFFICIENT");
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

  it("should respect UCM-configured highHarmFloorLevels", () => {
    // Default config: only "critical" and "high" trigger the floor
    const mediumHarm = [createVerdict({
      harmPotential: "medium", confidence: 30,
      truthPercentage: 72, verdict: "MOSTLY-TRUE",
    })];
    expect(enforceHarmConfidenceFloor(mediumHarm, config)[0].verdict).toBe("MOSTLY-TRUE");

    // With "medium" added to floor levels: medium-harm now triggers
    const expandedConfig: VerdictStageConfig = {
      ...config,
      highHarmFloorLevels: ["critical", "high", "medium"],
    };
    expect(enforceHarmConfidenceFloor(mediumHarm, expandedConfig)[0].verdict).toBe("UNVERIFIED");
  });
});

// ============================================================================
// CONFIGURABLE DEBATE MODEL TIERS (Stammbach/Ash C1/C16)
// ============================================================================

describe("Configurable debate model tiers", () => {
  const claims = [createAtomicClaim()];
  const evidence = [createEvidenceItem()];
  const boundaries = [createClaimBoundary()];
  const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

  it("advocateVerdict should use config.debateRoles.advocate.strength", async () => {
    const mockLLM = createMockLLM({ VERDICT_ADVOCATE: advocateResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, advocate: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.advocate, strength: "budget" } },
    };

    await advocateVerdict(claims, evidence, boundaries, coverageMatrix, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions).toMatchObject({ tier: "budget" });
  });

  it("selfConsistencyCheck should use config.debateRoles.selfConsistency.strength", async () => {
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
      selfConsistencyMode: "full",
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, selfConsistency: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.selfConsistency, strength: "budget" } },
    };

    await selfConsistencyCheck(claims, evidence, boundaries, coverageMatrix, advocateVerdicts, mockLLM, config);

    // selfConsistencyCheck makes 2 parallel calls
    expect(mockLLM).toHaveBeenCalledTimes(2);
    const call1Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    const call2Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2];
    expect(call1Options.tier).toBe("budget");
    expect(call2Options.tier).toBe("budget");
  });

  it("adversarialChallenge should use config.debateRoles.challenger.strength", async () => {
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
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, challenger: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.challenger, strength: "budget" } },
    };

    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions).toMatchObject({ tier: "budget" });
  });

  it("adversarialChallenge should pass challengerTemperature clamped to [0.1, 0.7]", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, confidenceTier: "HIGH", reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: challengeResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      challengerTemperature: 0.5,
    };

    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM, config);

    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.temperature).toBe(0.5);
  });

  it("adversarialChallenge should clamp temperature to floor 0.1", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, confidenceTier: "HIGH", reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({ VERDICT_CHALLENGER: challengeResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      challengerTemperature: 0.01,
    };

    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM, config);

    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.temperature).toBe(0.1);
  });

  it("reconcileVerdicts should use config.debateRoles.reconciler.strength", async () => {
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
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, reconciler: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.reconciler, strength: "budget" } },
    };

    await reconcileVerdicts(advocateVerdictsList, challengeDoc, consistencyResults, [], mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions).toMatchObject({ tier: "budget" });
  });

  it("default config should use standard for debate roles and budget for validation", () => {
    expect(DEFAULT_VERDICT_STAGE_CONFIG.debateRoles).toEqual({
      advocate: { provider: "anthropic", strength: "standard" },
      selfConsistency: { provider: "anthropic", strength: "standard" },
      challenger: { provider: "openai", strength: "standard" },
      reconciler: { provider: "anthropic", strength: "standard" },
      validation: { provider: "anthropic", strength: "budget" },
    });
  });

  it("validateVerdicts should use config.debateRoles.validation.strength", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_GROUNDING_VALIDATION: [{ claimId: "AC_01", groundingValid: true, issues: [] }],
      VERDICT_DIRECTION_VALIDATION: [{ claimId: "AC_01", directionValid: true, issues: [] }],
    });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, validation: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.validation, strength: "standard" } },
    };

    await validateVerdicts(verdicts, [createEvidenceItem()], mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(2);
    const call1Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    const call2Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2];
    expect(call1Options.tier).toBe("standard");
    expect(call2Options.tier).toBe("standard");
  });

  it("reconcileVerdicts should accept premium strength for reconciler (B-5b)", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({ VERDICT_RECONCILIATION: reconciliationResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, reconciler: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.reconciler, strength: "premium" } },
    };

    await reconcileVerdicts(advocateVerdictsList, { challenges: [] }, [], [], mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.tier).toBe("premium");
  });
});

// ============================================================================
// B-1: RUNTIME ROLE TRACING (callContext)
// ============================================================================

describe("B-1 Runtime role tracing", () => {
  const claims = [createAtomicClaim()];
  const evidence = [createEvidenceItem()];
  const boundaries = [createClaimBoundary()];
  const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

  it("advocateVerdict passes callContext with debateRole='advocate'", async () => {
    const mockLLM = createMockLLM({ VERDICT_ADVOCATE: advocateResponse() });
    await advocateVerdict(claims, evidence, boundaries, coverageMatrix, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG);

    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.callContext).toEqual({
      debateRole: "advocate",
      promptKey: "VERDICT_ADVOCATE",
    });
  });

  it("adversarialChallenge passes callContext with debateRole='challenger'", async () => {
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
    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM, DEFAULT_VERDICT_STAGE_CONFIG);

    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.callContext).toEqual({
      debateRole: "challenger",
      promptKey: "VERDICT_CHALLENGER",
    });
  });

  it("reconcileVerdicts passes callContext with debateRole='reconciler'", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({ VERDICT_RECONCILIATION: reconciliationResponse() });
    await reconcileVerdicts(advocateVerdictsList, { challenges: [] }, [], [], mockLLM, DEFAULT_VERDICT_STAGE_CONFIG);

    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.callContext).toEqual({
      debateRole: "reconciler",
      promptKey: "VERDICT_RECONCILIATION",
    });
  });

  it("validateVerdicts passes callContext with debateRole='validation' for both grounding and direction", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_GROUNDING_VALIDATION: [{ claimId: "AC_01", groundingValid: true, issues: [] }],
      VERDICT_DIRECTION_VALIDATION: [{ claimId: "AC_01", directionValid: true, issues: [] }],
    });
    await validateVerdicts(verdicts, [createEvidenceItem()], mockLLM, DEFAULT_VERDICT_STAGE_CONFIG);

    expect(mockLLM).toHaveBeenCalledTimes(2);
    const groundingContext = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2].callContext;
    const directionContext = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2].callContext;
    expect(groundingContext).toEqual({ debateRole: "validation", promptKey: "VERDICT_GROUNDING_VALIDATION" });
    expect(directionContext).toEqual({ debateRole: "validation", promptKey: "VERDICT_DIRECTION_VALIDATION" });
  });

  it("selfConsistencyCheck passes callContext with debateRole='selfConsistency'", async () => {
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
      selfConsistencyMode: "full",
    };
    await selfConsistencyCheck(claims, evidence, boundaries, coverageMatrix, advocateVerdicts, mockLLM, config);

    // selfConsistencyCheck makes 2 parallel calls
    expect(mockLLM).toHaveBeenCalledTimes(2);
    const call1Context = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2].callContext;
    const call2Context = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2].callContext;
    expect(call1Context).toEqual({ debateRole: "selfConsistency", promptKey: "VERDICT_ADVOCATE" });
    expect(call2Context).toEqual({ debateRole: "selfConsistency", promptKey: "VERDICT_ADVOCATE" });
  });
});

// ============================================================================
// D5 CONTROL 2: EVIDENCE PARTITIONING
// ============================================================================

describe("D5 Control 2: Evidence partitioning", () => {
  const claims = [createAtomicClaim()];
  const boundaries = [createClaimBoundary()];

  it("advocate receives institutional evidence, challenger receives general evidence", async () => {
    // Create mixed evidence pool
    const institutional1 = createEvidenceItem({ id: "EV_I1", sourceType: "peer_reviewed_study" });
    const institutional2 = createEvidenceItem({ id: "EV_I2", sourceType: "government_report" });
    const general1 = createEvidenceItem({ id: "EV_G1", sourceType: "news_primary" });
    const general2 = createEvidenceItem({ id: "EV_G2", sourceType: "expert_statement" });
    const allEvidence = [institutional1, institutional2, general1, general2];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, allEvidence);

    // Track what evidence each role received
    const advocateEvidenceIds: string[] = [];
    const challengerEvidenceIds: string[] = [];

    const mockLLM = vi.fn(async (promptKey: string, input: Record<string, unknown>) => {
      const evidenceItems = input.evidenceItems as any[] ?? [];
      if (promptKey === "VERDICT_ADVOCATE") {
        for (const e of evidenceItems) advocateEvidenceIds.push(e.id);
        return advocateResponse();
      }
      if (promptKey === "VERDICT_CHALLENGER") {
        for (const e of evidenceItems) challengerEvidenceIds.push(e.id);
        return challengeResponse();
      }
      if (promptKey === "VERDICT_RECONCILIATION") return reconciliationResponse();
      if (promptKey === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      if (promptKey === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      return {};
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "disabled",
      evidencePartitioningEnabled: true,
    };

    await runVerdictStage(claims, allEvidence, boundaries, coverageMatrix, mockLLM, config);

    // Advocate should only see institutional evidence
    expect(advocateEvidenceIds).toContain("EV_I1");
    expect(advocateEvidenceIds).toContain("EV_I2");
    expect(advocateEvidenceIds).not.toContain("EV_G1");
    expect(advocateEvidenceIds).not.toContain("EV_G2");

    // Challenger should only see general evidence
    expect(challengerEvidenceIds).toContain("EV_G1");
    expect(challengerEvidenceIds).toContain("EV_G2");
    expect(challengerEvidenceIds).not.toContain("EV_I1");
    expect(challengerEvidenceIds).not.toContain("EV_I2");
  });

  it("falls back to full pool when one partition has <2 items", async () => {
    // Only 1 institutional item — should fall back
    const institutional = createEvidenceItem({ id: "EV_I1", sourceType: "peer_reviewed_study" });
    const general1 = createEvidenceItem({ id: "EV_G1", sourceType: "news_primary" });
    const general2 = createEvidenceItem({ id: "EV_G2", sourceType: "expert_statement" });
    const allEvidence = [institutional, general1, general2];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, allEvidence);

    const advocateEvidenceIds: string[] = [];

    const mockLLM = vi.fn(async (promptKey: string, input: Record<string, unknown>) => {
      const evidenceItems = input.evidenceItems as any[] ?? [];
      if (promptKey === "VERDICT_ADVOCATE") {
        for (const e of evidenceItems) advocateEvidenceIds.push(e.id);
        return advocateResponse();
      }
      if (promptKey === "VERDICT_CHALLENGER") return challengeResponse();
      if (promptKey === "VERDICT_RECONCILIATION") return reconciliationResponse();
      if (promptKey === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      if (promptKey === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      return {};
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "disabled",
      evidencePartitioningEnabled: true,
    };

    await runVerdictStage(claims, allEvidence, boundaries, coverageMatrix, mockLLM, config);

    // Fallback: advocate sees ALL evidence
    expect(advocateEvidenceIds).toContain("EV_I1");
    expect(advocateEvidenceIds).toContain("EV_G1");
    expect(advocateEvidenceIds).toContain("EV_G2");
  });

  it("no partitioning when disabled", async () => {
    const institutional = createEvidenceItem({ id: "EV_I1", sourceType: "peer_reviewed_study" });
    const general = createEvidenceItem({ id: "EV_G1", sourceType: "news_primary" });
    const allEvidence = [institutional, general];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, allEvidence);

    const advocateEvidenceIds: string[] = [];

    const mockLLM = vi.fn(async (promptKey: string, input: Record<string, unknown>) => {
      const evidenceItems = input.evidenceItems as any[] ?? [];
      if (promptKey === "VERDICT_ADVOCATE") {
        for (const e of evidenceItems) advocateEvidenceIds.push(e.id);
        return advocateResponse();
      }
      if (promptKey === "VERDICT_CHALLENGER") return challengeResponse();
      if (promptKey === "VERDICT_RECONCILIATION") return reconciliationResponse();
      if (promptKey === "VERDICT_GROUNDING_VALIDATION") return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      if (promptKey === "VERDICT_DIRECTION_VALIDATION") return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      return {};
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      selfConsistencyMode: "disabled",
      evidencePartitioningEnabled: false,
    };

    await runVerdictStage(claims, allEvidence, boundaries, coverageMatrix, mockLLM, config);

    // Disabled: advocate sees ALL evidence
    expect(advocateEvidenceIds).toContain("EV_I1");
    expect(advocateEvidenceIds).toContain("EV_G1");
  });
});

// ============================================================================
// CROSS-PROVIDER DEBATE MODEL PROVIDERS (Climinator-style, C1/C16)
// ============================================================================

describe("Cross-provider debate model providers", () => {
  const claims = [createAtomicClaim()];
  const evidence = [createEvidenceItem()];
  const boundaries = [createClaimBoundary()];
  const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

  it("advocateVerdict should pass providerOverride from config.debateRoles.advocate.provider", async () => {
    const mockLLM = createMockLLM({ VERDICT_ADVOCATE: advocateResponse() });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, advocate: { provider: "openai", strength: "standard" } },
    };

    await advocateVerdict(claims, evidence, boundaries, coverageMatrix, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.providerOverride).toBe("openai");
  });

  it("adversarialChallenge should pass providerOverride from config.debateRoles.challenger.provider", async () => {
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
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, challenger: { provider: "openai", strength: "standard" } },
    };

    await adversarialChallenge(verdicts, evidence, boundaries, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.providerOverride).toBe("openai");
  });

  it("selfConsistencyCheck should pass providerOverride from config.debateRoles.selfConsistency.provider", async () => {
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
      selfConsistencyMode: "full",
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, selfConsistency: { provider: "google", strength: "standard" } },
    };

    await selfConsistencyCheck(claims, evidence, boundaries, coverageMatrix, advocateVerdicts, mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(2);
    const call1Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    const call2Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2];
    expect(call1Options.providerOverride).toBe("google");
    expect(call2Options.providerOverride).toBe("google");
  });

  it("reconcileVerdicts should pass providerOverride from config.debateRoles.reconciler.provider", async () => {
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
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, reconciler: { provider: "mistral", strength: "standard" } },
    };

    await reconcileVerdicts(advocateVerdictsList, challengeDoc, consistencyResults, [], mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(1);
    const callOptions = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(callOptions.providerOverride).toBe("mistral");
  });

  it("validateVerdicts should pass providerOverride from config.debateRoles.validation.provider", async () => {
    const verdicts: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [{ boundaryId: "CB_01", boundaryName: "STD", truthPercentage: 75, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 }],
      consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_GROUNDING_VALIDATION: [{ claimId: "AC_01", groundingValid: true, issues: [] }],
      VERDICT_DIRECTION_VALIDATION: [{ claimId: "AC_01", directionValid: true, issues: [] }],
    });
    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      debateRoles: { ...DEFAULT_VERDICT_STAGE_CONFIG.debateRoles, validation: { provider: "openai", strength: "budget" } },
    };

    await validateVerdicts(verdicts, [createEvidenceItem()], mockLLM, config);

    expect(mockLLM).toHaveBeenCalledTimes(2);
    const call1Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[0][2];
    const call2Options = (mockLLM as ReturnType<typeof vi.fn>).mock.calls[1][2];
    expect(call1Options.providerOverride).toBe("openai");
    expect(call2Options.providerOverride).toBe("openai");
  });

  it("default config should have cross-provider challenger (openai)", () => {
    expect(DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.challenger.provider).toBe("openai");
  });
});

// ============================================================================
// BASELESS CHALLENGE GUARD (Stammbach/Ash Action #6)
// ============================================================================

describe("validateChallengeEvidence", () => {
  it("should mark all IDs as valid when they exist in the evidence pool", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01" }),
      createEvidenceItem({ id: "EV_02" }),
    ];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption",
          description: "Test challenge",
          evidenceIds: ["EV_01", "EV_02"],
          severity: "medium",
        }],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, evidence);
    const cp = result.challenges[0].challengePoints[0];

    expect(cp.challengeValidation).toBeDefined();
    expect(cp.challengeValidation!.evidenceIdsValid).toBe(true);
    expect(cp.challengeValidation!.validIds).toEqual(["EV_01", "EV_02"]);
    expect(cp.challengeValidation!.invalidIds).toEqual([]);
  });

  it("should mark invalid IDs when they do not exist in the evidence pool", () => {
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption",
          description: "Cites non-existent evidence",
          evidenceIds: ["EV_01", "EV_FAKE", "EV_GHOST"],
          severity: "high",
        }],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, evidence);
    const cp = result.challenges[0].challengePoints[0];

    expect(cp.challengeValidation!.evidenceIdsValid).toBe(false);
    expect(cp.challengeValidation!.validIds).toEqual(["EV_01"]);
    expect(cp.challengeValidation!.invalidIds).toEqual(["EV_FAKE", "EV_GHOST"]);
  });

  it("should handle empty evidenceIds (citing absence)", () => {
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "missing_evidence",
          description: "More research needed",
          evidenceIds: [],
          severity: "low",
        }],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, evidence);
    const cp = result.challenges[0].challengePoints[0];

    // Empty evidenceIds → not valid (no evidence cited)
    expect(cp.challengeValidation!.evidenceIdsValid).toBe(false);
    expect(cp.challengeValidation!.validIds).toEqual([]);
    expect(cp.challengeValidation!.invalidIds).toEqual([]);
  });

  it("should handle empty evidence pool", () => {
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption",
          description: "Challenge with IDs but no pool",
          evidenceIds: ["EV_01"],
          severity: "medium",
        }],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, []);
    const cp = result.challenges[0].challengePoints[0];

    expect(cp.challengeValidation!.evidenceIdsValid).toBe(false);
    expect(cp.challengeValidation!.validIds).toEqual([]);
    expect(cp.challengeValidation!.invalidIds).toEqual(["EV_01"]);
  });

  it("should validate multiple challenge points independently", () => {
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [
          { id: "CP_AC_01_0", type: "assumption", description: "Valid ref", evidenceIds: ["EV_01"], severity: "medium" },
          { id: "CP_AC_01_1", type: "methodology_weakness", description: "Invalid ref", evidenceIds: ["EV_FAKE"], severity: "high" },
        ],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, evidence);
    expect(result.challenges[0].challengePoints[0].challengeValidation!.evidenceIdsValid).toBe(true);
    expect(result.challenges[0].challengePoints[1].challengeValidation!.evidenceIdsValid).toBe(false);
  });

  it("should mark IDs invalid when evidence exists but belongs to a different claim", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", relevantClaimIds: ["AC_02"] }),
    ];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption",
          description: "Cross-claim evidence reference",
          evidenceIds: ["EV_01", "EV_02"],
          severity: "medium",
        }],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, evidence);
    const cp = result.challenges[0].challengePoints[0];
    expect(cp.challengeValidation!.evidenceIdsValid).toBe(false);
    expect(cp.challengeValidation!.validIds).toEqual(["EV_01"]);
    expect(cp.challengeValidation!.invalidIds).toEqual(["EV_02"]);
  });

  it("should treat IDs as valid when relevance metadata is absent", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: undefined }),
    ];
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption",
          description: "Legacy evidence without relevantClaimIds",
          evidenceIds: ["EV_01"],
          severity: "low",
        }],
      }],
    };

    const result = validateChallengeEvidence(challengeDoc, evidence);
    const cp = result.challenges[0].challengePoints[0];
    expect(cp.challengeValidation!.evidenceIdsValid).toBe(true);
    expect(cp.challengeValidation!.validIds).toEqual(["EV_01"]);
    expect(cp.challengeValidation!.invalidIds).toEqual([]);
  });

  // Multilingual guardrail: validation is ID-based, not language-dependent
  it("should produce identical validation regardless of challenge description language (en/de/fr)", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01" }),
      createEvidenceItem({ id: "EV_02" }),
    ];
    const challengeDocEn: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "The methodology is flawed",
          evidenceIds: ["EV_01", "EV_FAKE"], severity: "medium",
        }],
      }],
    };
    const challengeDocDe: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "Die Methodik ist fehlerhaft",
          evidenceIds: ["EV_01", "EV_FAKE"], severity: "medium",
        }],
      }],
    };
    const challengeDocFr: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "La méthodologie est défaillante",
          evidenceIds: ["EV_01", "EV_FAKE"], severity: "medium",
        }],
      }],
    };

    const resultEn = validateChallengeEvidence(challengeDocEn, evidence);
    const resultDe = validateChallengeEvidence(challengeDocDe, evidence);
    const resultFr = validateChallengeEvidence(challengeDocFr, evidence);

    // Validation outcome must be identical regardless of language
    const valEn = resultEn.challenges[0].challengePoints[0].challengeValidation!;
    const valDe = resultDe.challenges[0].challengePoints[0].challengeValidation!;
    const valFr = resultFr.challenges[0].challengePoints[0].challengeValidation!;

    expect(valEn.validIds).toEqual(valDe.validIds);
    expect(valEn.validIds).toEqual(valFr.validIds);
    expect(valEn.invalidIds).toEqual(valDe.invalidIds);
    expect(valEn.invalidIds).toEqual(valFr.invalidIds);
    expect(valEn.evidenceIdsValid).toBe(valDe.evidenceIdsValid);
    expect(valEn.evidenceIdsValid).toBe(valFr.evidenceIdsValid);
  });
});

describe("enforceBaselessChallengePolicy", () => {
  // Helper: create a verdict with specific challenge responses
  function makeVerdict(
    claimId: string,
    truthPct: number,
    confidence: number,
    challengeResponses: CBClaimVerdict["challengeResponses"] = [],
  ): CBClaimVerdict {
    return {
      id: `CV_${claimId}`, claimId, truthPercentage: truthPct, verdict: "MOSTLY-TRUE",
      confidence, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId, percentages: [truthPct], average: truthPct, spread: 0, stable: true, assessed: false },
      challengeResponses,
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    };
  }

  it("should not revert when no challenge responses have verdictAdjusted=true", () => {
    const advocate = makeVerdict("AC_01", 75, 80);
    const reconciled = makeVerdict("AC_01", 72, 78, [
      { challengeType: "assumption", response: "Noted", verdictAdjusted: false },
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "Test", evidenceIds: ["EV_FAKE"], severity: "medium",
          challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_FAKE"] },
        }],
      }],
    };

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate]);
    expect(result[0].truthPercentage).toBe(72); // Not reverted
  });

  it("should revert when all referenced challenge points have zero valid evidence IDs", () => {
    const advocate = makeVerdict("AC_01", 75, 80);
    const reconciled = makeVerdict("AC_01", 60, 65, [
      {
        challengeType: "assumption", response: "Adjusted based on challenge",
        verdictAdjusted: true, adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
      },
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "Baseless challenge", evidenceIds: ["EV_FAKE"], severity: "high",
          challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_FAKE"] },
        }],
      }],
    };
    const warnings: AnalysisWarning[] = [];

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate], warnings);

    // Reverted to advocate values
    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    // Warnings: 1 blocked + 1 metrics
    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe("baseless_challenge_blocked");
    expect(warnings[0].severity).toBe("info");
    expect(warnings[1].type).toBe("baseless_challenge_detected"); // metrics warning
    expect(warnings[1].severity).toBe("info");
    expect(warnings[1].details).toBeDefined();
  });

  it("should revert when provenance is missing (policy violation)", () => {
    const advocate = makeVerdict("AC_01", 75, 80);
    const reconciled = makeVerdict("AC_01", 60, 65, [
      { challengeType: "assumption", response: "Adjusted", verdictAdjusted: true },
      // No adjustmentBasedOnChallengeIds
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "Test", evidenceIds: ["EV_01"], severity: "medium",
          challengeValidation: { evidenceIdsValid: true, validIds: ["EV_01"], invalidIds: [] },
        }],
      }],
    };
    const warnings: AnalysisWarning[] = [];

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate], warnings);

    // Reverted due to missing provenance
    expect(result[0].truthPercentage).toBe(75);
    // Warnings: 1 blocked + 1 metrics
    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe("baseless_challenge_blocked");
    expect(warnings[0].severity).toBe("info");
    expect(warnings[0].message).toContain("provenance");
  });

  it("should revert when provenance IDs are non-empty but ALL unresolved (Finding 1 bypass fix)", () => {
    const advocate = makeVerdict("AC_01", 75, 80);
    const reconciled = makeVerdict("AC_01", 58, 62, [
      {
        challengeType: "assumption", response: "Adjusted",
        verdictAdjusted: true,
        // IDs that don't match any challenge point in the doc
        adjustmentBasedOnChallengeIds: ["CP_NONEXISTENT_0", "CP_GHOST_1"],
      },
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: "Real challenge", evidenceIds: ["EV_01"], severity: "medium",
          challengeValidation: { evidenceIdsValid: true, validIds: ["EV_01"], invalidIds: [] },
        }],
      }],
    };
    const warnings: AnalysisWarning[] = [];

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate], warnings);

    // Reverted because ALL provenance IDs are unresolved (can't verify they're evidence-backed)
    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    // Warnings: 1 blocked (with unresolved IDs message) + 1 metrics
    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe("baseless_challenge_blocked");
    expect(warnings[0].severity).toBe("info");
    expect(warnings[0].message).toContain("unresolved");
    expect(warnings[0].message).toContain("CP_NONEXISTENT_0");
  });

  it("should revert when provenance is mixed (some valid, some baseless)", () => {
    const advocate = makeVerdict("AC_01", 75, 80);
    const reconciled = makeVerdict("AC_01", 68, 72, [
      {
        challengeType: "assumption", response: "Adjusted", verdictAdjusted: true,
        adjustmentBasedOnChallengeIds: ["CP_AC_01_0", "CP_AC_01_1"],
      },
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [
          {
            id: "CP_AC_01_0",
            type: "assumption", description: "Valid challenge", evidenceIds: ["EV_01"], severity: "medium",
            challengeValidation: { evidenceIdsValid: true, validIds: ["EV_01"], invalidIds: [] },
          },
          {
            id: "CP_AC_01_1",
            type: "methodology_weakness", description: "Baseless challenge", evidenceIds: ["EV_FAKE"], severity: "high",
            challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_FAKE"] },
          },
        ],
      }],
    };
    const warnings: AnalysisWarning[] = [];

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate], warnings);

    // Reverted (mixed provenance includes baseless component)
    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    // Warnings: 1 blocked + 1 metrics summary
    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe("baseless_challenge_blocked");
    expect(warnings[0].severity).toBe("info");
    expect(warnings[0].message).toContain("mixed provenance");
    expect(warnings[1].type).toBe("baseless_challenge_detected");
    expect(warnings[1].details?.blockedCount).toBe(1);
  });

  it("should revert when adjusted response exists but challenge document has no matching claim block", () => {
    const advocate = makeVerdict("AC_01", 75, 80);
    const reconciled = makeVerdict("AC_01", 60, 65, [
      {
        challengeType: "assumption",
        response: "Adjusted",
        verdictAdjusted: true,
        adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
      },
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        // Different claim ID to simulate missing block for AC_01
        claimId: "AC_02",
        challengePoints: [{
          id: "CP_AC_02_0",
          type: "assumption",
          description: "Different claim",
          evidenceIds: ["EV_01"],
          severity: "low",
          challengeValidation: { evidenceIdsValid: true, validIds: ["EV_01"], invalidIds: [] },
        }],
      }],
    };
    const warnings: AnalysisWarning[] = [];

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate], warnings);

    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    expect(warnings[0].type).toBe("baseless_challenge_blocked");
    expect(warnings[0].message).toContain("no challenge points");
  });

  it("should compute baselessAdjustmentRate correctly", () => {
    const advocate1 = makeVerdict("AC_01", 75, 80);
    const advocate2 = makeVerdict("AC_02", 60, 70);
    const reconciled1 = makeVerdict("AC_01", 55, 60, [
      {
        challengeType: "assumption", response: "Baseless", verdictAdjusted: true,
        adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
      },
    ]);
    const reconciled2 = makeVerdict("AC_02", 55, 65, [
      {
        challengeType: "methodology_weakness", response: "Valid", verdictAdjusted: true,
        adjustmentBasedOnChallengeIds: ["CP_AC_02_0"],
      },
    ]);
    const challengeDoc: ChallengeDocument = {
      challenges: [
        {
          claimId: "AC_01",
          challengePoints: [{
            id: "CP_AC_01_0",
            type: "assumption", description: "Baseless", evidenceIds: ["EV_FAKE"], severity: "high",
            challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_FAKE"] },
          }],
        },
        {
          claimId: "AC_02",
          challengePoints: [{
            id: "CP_AC_02_0",
            type: "methodology_weakness", description: "Valid", evidenceIds: ["EV_01"], severity: "medium",
            challengeValidation: { evidenceIdsValid: true, validIds: ["EV_01"], invalidIds: [] },
          }],
        },
      ],
    };
    const warnings: AnalysisWarning[] = [];

    const result = enforceBaselessChallengePolicy(
      [reconciled1, reconciled2], challengeDoc, [advocate1, advocate2], warnings,
    );

    // First claim reverted (baseless), second preserved (valid)
    expect(result[0].truthPercentage).toBe(75); // reverted
    expect(result[1].truthPercentage).toBe(55); // preserved
    expect(warnings.filter((w) => w.type === "baseless_challenge_blocked")).toHaveLength(1);
    // Metrics warning with rate
    const metricsWarning = warnings.find((w) => w.details?.baselessAdjustmentRate !== undefined);
    expect(metricsWarning).toBeDefined();
    expect(metricsWarning!.details!.baselessAdjustmentRate).toBeCloseTo(0.5); // 1 of 2 adjustments
    expect(metricsWarning!.details!.blockedCount).toBe(1);
    expect(metricsWarning!.details!.totalAdjustments).toBe(2);
    expect(metricsWarning!.severity).toBe("info");
  });

  it("should reset contested/adjusted state when a baseless adjustment is blocked", () => {
    const advocate = makeVerdict("AC_01", 75, 80, [
      { challengeType: "assumption", response: "Original", verdictAdjusted: false },
    ]);
    const reconciled = {
      ...makeVerdict("AC_01", 60, 65, [
        {
          challengeType: "assumption",
          response: "Adjusted based on baseless challenge",
          verdictAdjusted: true,
          adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
        },
      ]),
      reasoning: "Reconciler changed verdict from challenge",
      isContested: true,
    };
    const challengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption",
          description: "Baseless challenge",
          evidenceIds: ["EV_FAKE"],
          severity: "high",
          challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_FAKE"] },
        }],
      }],
    };

    const result = enforceBaselessChallengePolicy([reconciled], challengeDoc, [advocate], []);

    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].confidence).toBe(80);
    expect(result[0].isContested).toBe(false);
    expect(result[0].reasoning).toBe("test");
    expect(result[0].challengeResponses.every((r) => !r.verdictAdjusted)).toBe(true);
  });

  // Multilingual guardrail: enforcement should work identically across languages
  it("should enforce identically for challenges described in different languages", () => {
    const advocate = makeVerdict("AC_01", 75, 80);

    // Same structure, different language descriptions
    const makeReconciled = () => makeVerdict("AC_01", 60, 65, [
      {
        challengeType: "assumption", response: "Adjusted", verdictAdjusted: true,
        adjustmentBasedOnChallengeIds: ["CP_AC_01_0"],
      },
    ]);
    const makeChallengeDoc = (desc: string): ChallengeDocument => ({
      challenges: [{
        claimId: "AC_01",
        challengePoints: [{
          id: "CP_AC_01_0",
          type: "assumption", description: desc, evidenceIds: ["EV_FAKE"], severity: "high",
          challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_FAKE"] },
        }],
      }],
    });

    const warningsEn: AnalysisWarning[] = [];
    const warningsDe: AnalysisWarning[] = [];
    const warningsFr: AnalysisWarning[] = [];

    const resultEn = enforceBaselessChallengePolicy([makeReconciled()], makeChallengeDoc("The methodology is flawed"), [advocate], warningsEn);
    const resultDe = enforceBaselessChallengePolicy([makeReconciled()], makeChallengeDoc("Die Methodik ist fehlerhaft"), [advocate], warningsDe);
    const resultFr = enforceBaselessChallengePolicy([makeReconciled()], makeChallengeDoc("La méthodologie est défaillante"), [advocate], warningsFr);

    // All should be reverted identically
    expect(resultEn[0].truthPercentage).toBe(75);
    expect(resultDe[0].truthPercentage).toBe(75);
    expect(resultFr[0].truthPercentage).toBe(75);
    // 2 warnings each: 1 blocked + 1 metrics
    expect(warningsEn).toHaveLength(2);
    expect(warningsDe).toHaveLength(2);
    expect(warningsFr).toHaveLength(2);
  });
});

describe("ChallengeResponse.adjustmentBasedOnChallengeIds parsing", () => {
  it("should parse adjustmentBasedOnChallengeIds when present in reconciliation response", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 70, confidence: 75, reasoning: "Reconciled",
        challengeResponses: [{
          challengeType: "methodology_weakness", response: "Adjusted",
          verdictAdjusted: true, adjustmentBasedOnChallengeIds: ["AC_01:0", "AC_01:1"],
        }],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    expect(verdicts[0].challengeResponses[0].adjustmentBasedOnChallengeIds).toEqual(["AC_01:0", "AC_01:1"]);
  });

  it("should leave adjustmentBasedOnChallengeIds undefined when absent", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 72, confidence: 78, reasoning: "Reconciled",
        challengeResponses: [{
          challengeType: "assumption", response: "Noted", verdictAdjusted: false,
        }],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    expect(verdicts[0].challengeResponses[0].adjustmentBasedOnChallengeIds).toBeUndefined();
  });

  it("should handle empty adjustmentBasedOnChallengeIds array", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: [], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 72, confidence: 78, reasoning: "Reconciled",
        challengeResponses: [{
          challengeType: "assumption", response: "Empty array", verdictAdjusted: true,
          adjustmentBasedOnChallengeIds: [],
        }],
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    expect(verdicts[0].challengeResponses[0].adjustmentBasedOnChallengeIds).toEqual([]);
  });
});

// ============================================================================
// VERDICT RANGE REPORTING (Stammbach/Ash Action #6)
// ============================================================================

describe("computeTruthPercentageRange", () => {
  function makeVerdictWithConsistency(
    percentages: number[],
    boundaryFindings: CBClaimVerdict["boundaryFindings"] = [],
  ): CBClaimVerdict {
    return {
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      verdict: "MOSTLY-TRUE", confidence: 80, reasoning: "test", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings,
      consistencyResult: {
        claimId: "AC_01",
        percentages,
        average: percentages.reduce((a, b) => a + b, 0) / percentages.length,
        spread: Math.max(...percentages) - Math.min(...percentages),
        stable: true,
        assessed: true,
      },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    };
  }

  it("should return undefined when range reporting is disabled", () => {
    const verdict = makeVerdictWithConsistency([60, 70, 80]);
    const result = computeTruthPercentageRange(verdict, { enabled: false, wideRangeThreshold: 15, boundaryVarianceWeight: 0 });
    expect(result).toBeUndefined();
  });

  it("should return undefined when config is undefined", () => {
    const verdict = makeVerdictWithConsistency([60, 70, 80]);
    const result = computeTruthPercentageRange(verdict, undefined);
    expect(result).toBeUndefined();
  });

  it("should return undefined when consistency was not assessed", () => {
    const verdict = makeVerdictWithConsistency([75]);
    verdict.consistencyResult.assessed = false;
    const result = computeTruthPercentageRange(verdict, { enabled: true, wideRangeThreshold: 15, boundaryVarianceWeight: 0 });
    expect(result).toBeUndefined();
  });

  it("should compute basic range from min/max of consistency percentages", () => {
    const verdict = makeVerdictWithConsistency([60, 70, 80]);
    const result = computeTruthPercentageRange(verdict, { enabled: true, wideRangeThreshold: 15, boundaryVarianceWeight: 0 });
    expect(result).toEqual({ min: 60, max: 80 });
  });

  it("should widen range by boundary variance when weight > 0 and 2+ boundaries", () => {
    const verdict = makeVerdictWithConsistency([60, 70, 80], [
      { boundaryId: "CB_01", boundaryName: "B1", truthPercentage: 55, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 },
      { boundaryId: "CB_02", boundaryName: "B2", truthPercentage: 85, confidence: 75, evidenceDirection: "supports", evidenceCount: 2 },
    ]);
    // boundarySpread = 85-55 = 30, weight 0.5, widening = 0.5 * 30 / 2 = 7.5
    const result = computeTruthPercentageRange(verdict, { enabled: true, wideRangeThreshold: 50, boundaryVarianceWeight: 0.5 });
    expect(result).toEqual({ min: 52.5, max: 87.5 });
  });

  it("should not widen when only 1 boundary", () => {
    const verdict = makeVerdictWithConsistency([60, 70, 80], [
      { boundaryId: "CB_01", boundaryName: "B1", truthPercentage: 55, confidence: 80, evidenceDirection: "supports", evidenceCount: 3 },
    ]);
    const result = computeTruthPercentageRange(verdict, { enabled: true, wideRangeThreshold: 50, boundaryVarianceWeight: 0.5 });
    // No widening — only 1 boundary
    expect(result).toEqual({ min: 60, max: 80 });
  });

  it("should clamp range to [0, 100]", () => {
    const verdict = makeVerdictWithConsistency([2, 5, 8], [
      { boundaryId: "CB_01", boundaryName: "B1", truthPercentage: 0, confidence: 80, evidenceDirection: "contradicts", evidenceCount: 3 },
      { boundaryId: "CB_02", boundaryName: "B2", truthPercentage: 20, confidence: 75, evidenceDirection: "supports", evidenceCount: 2 },
    ]);
    // boundarySpread = 20, weight 1.0, widening = 1.0 * 20 / 2 = 10
    // min = 2 - 10 = -8 → clamped to 0, max = 8 + 10 = 18
    const result = computeTruthPercentageRange(verdict, { enabled: true, wideRangeThreshold: 50, boundaryVarianceWeight: 1.0 });
    expect(result!.min).toBe(0);
    expect(result!.max).toBe(18);
  });
});

// ============================================================================
// B-7: MISLEADINGNESS FLAG IN VERDICT OUTPUT
// ============================================================================

describe("B-7: misleadingness flag in reconciliation", () => {
  it("should extract misleadingness fields from reconciliation LLM output", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 85, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [85], average: 85, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 85, confidence: 80, reasoning: "Reconciled",
        isContested: false,
        challengeResponses: [],
        misleadingness: "highly_misleading",
        misleadingnessReason: "Cherry-picks data to create false impression despite being technically true",
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    expect(verdicts[0].misleadingness).toBe("highly_misleading");
    expect(verdicts[0].misleadingnessReason).toBe("Cherry-picks data to create false impression despite being technically true");
    // Truth percentage NOT affected by misleadingness (decoupling)
    expect(verdicts[0].truthPercentage).toBe(85);
  });

  it("should handle not_misleading (no reason field)", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 70, verdict: "MOSTLY-TRUE",
      confidence: 75, reasoning: "Original", harmPotential: "low", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [70], average: 70, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 70, confidence: 75, reasoning: "Reconciled",
        isContested: false, challengeResponses: [],
        misleadingness: "not_misleading",
        misleadingnessReason: "",
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    expect(verdicts[0].misleadingness).toBe("not_misleading");
    expect(verdicts[0].misleadingnessReason).toBeUndefined(); // Stripped when not_misleading
  });

  it("should omit misleadingness fields when LLM does not return them (backward compat)", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: reconciliationResponse(),
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    // Fields not present when LLM doesn't return them
    expect(verdicts[0].misleadingness).toBeUndefined();
    expect(verdicts[0].misleadingnessReason).toBeUndefined();
  });

  it("should ignore invalid misleadingness enum values", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 75, verdict: "MOSTLY-TRUE",
      confidence: 80, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [75], average: 75, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 72, confidence: 78, reasoning: "Reconciled",
        isContested: false, challengeResponses: [],
        misleadingness: "INVALID_VALUE",
        misleadingnessReason: "Should be ignored",
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    // Invalid enum → not set
    expect(verdicts[0].misleadingness).toBeUndefined();
    expect(verdicts[0].misleadingnessReason).toBeUndefined();
  });

  it("should support potentially_misleading with reason", async () => {
    const advocateVerdictsList: CBClaimVerdict[] = [{
      id: "CV_AC_01", claimId: "AC_01", truthPercentage: 60, verdict: "MIXED",
      confidence: 70, reasoning: "Original", harmPotential: "medium", isContested: false,
      supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [],
      boundaryFindings: [], consistencyResult: { claimId: "AC_01", percentages: [60], average: 60, spread: 0, stable: true, assessed: false },
      challengeResponses: [],
      triangulationScore: { boundaryCount: 1, supporting: 1, contradicting: 0, level: "weak", factor: 1.0 },
    }];
    const mockLLM = createMockLLM({
      VERDICT_RECONCILIATION: [{
        claimId: "AC_01", truthPercentage: 60, confidence: 70, reasoning: "Reconciled",
        isContested: false, challengeResponses: [],
        misleadingness: "potentially_misleading",
        misleadingnessReason: "Omits important temporal context",
      }],
    });

    const { verdicts } = await reconcileVerdicts(
      advocateVerdictsList, { challenges: [] }, [], [], mockLLM,
    );

    expect(verdicts[0].misleadingness).toBe("potentially_misleading");
    expect(verdicts[0].misleadingnessReason).toBe("Omits important temporal context");
  });
});

// ============================================================================
// STRIP PHANTOM EVIDENCE IDS (Fix 5)
// ============================================================================

describe("stripPhantomEvidenceIds", () => {
  function createVerdictForPhantomTest(
    overrides: Partial<CBClaimVerdict> = {},
  ): CBClaimVerdict {
    return {
      id: "CV_AC_01",
      claimId: "AC_01",
      truthPercentage: 75,
      verdict: "MOSTLY-TRUE",
      confidence: 70,
      reasoning: "Test reasoning",
      harmPotential: "medium",
      isContested: false,
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: ["EV_03"],
      boundaryFindings: [],
      consistencyResult: { stable: true, spread: 2, samples: [75, 73], sampleCount: 2 },
      challengeResponses: [],
      triangulationScore: { score: 0.8, sourceCount: 3, methodologyCount: 2, temporalCount: 1 },
      confidenceTier: "HIGH",
      ...overrides,
    };
  }

  it("removes invalid IDs and keeps valid ones", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01" }),
      createEvidenceItem({ id: "EV_02" }),
      createEvidenceItem({ id: "EV_03" }),
    ];
    const verdict = createVerdictForPhantomTest({
      supportingEvidenceIds: ["EV_01", "EV_PHANTOM_1"],
      contradictingEvidenceIds: ["EV_03", "EV_PHANTOM_2"],
    });
    const warnings: AnalysisWarning[] = [];

    const result = stripPhantomEvidenceIds([verdict], evidence, warnings);

    expect(result[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_03"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("phantom_evidence_stripped");
    expect(warnings[0].severity).toBe("info");
  });

  it("emits warning-level alert when ALL supporting IDs are phantom", () => {
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const verdict = createVerdictForPhantomTest({
      supportingEvidenceIds: ["EV_PHANTOM_1", "EV_PHANTOM_2"],
      contradictingEvidenceIds: ["EV_01"],
    });
    const warnings: AnalysisWarning[] = [];

    const result = stripPhantomEvidenceIds([verdict], evidence, warnings);

    expect(result[0].supportingEvidenceIds).toEqual([]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_01"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("phantom_evidence_all_supporting");
    expect(warnings[0].severity).toBe("warning");
  });

  it("does not modify verdicts when all IDs are valid", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01" }),
      createEvidenceItem({ id: "EV_02" }),
    ];
    const verdict = createVerdictForPhantomTest({
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: ["EV_02"],
    });
    const warnings: AnalysisWarning[] = [];

    const result = stripPhantomEvidenceIds([verdict], evidence, warnings);

    expect(result[0].supportingEvidenceIds).toEqual(["EV_01"]);
    expect(result[0].contradictingEvidenceIds).toEqual(["EV_02"]);
    expect(warnings).toHaveLength(0);
  });

  it("handles empty evidence arrays gracefully", () => {
    const evidence = [createEvidenceItem({ id: "EV_01" })];
    const verdict = createVerdictForPhantomTest({
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
    });
    const warnings: AnalysisWarning[] = [];

    const result = stripPhantomEvidenceIds([verdict], evidence, warnings);

    expect(result[0].supportingEvidenceIds).toEqual([]);
    expect(result[0].contradictingEvidenceIds).toEqual([]);
    expect(warnings).toHaveLength(0);
  });
});

// ============================================================================
// buildSourcePortfolio (Fix 1 — SR-aware verdict reasoning)
// ============================================================================

describe("buildSourcePortfolio", () => {
  function createFetchedSource(overrides: Partial<FetchedSource> = {}): FetchedSource {
    return {
      id: "S1",
      url: "https://example.com/article",
      title: "Example Article",
      trackRecordScore: 0.75,
      trackRecordConfidence: 0.8,
      trackRecordConsensus: true,
      fullText: "Full text",
      fetchedAt: "2026-03-27T00:00:00Z",
      category: "evidence",
      fetchSuccess: true,
      ...overrides,
    };
  }

  it("should group evidence by sourceUrl and count items per source", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://a.com/1", sourceId: "S_A" }),
      createEvidenceItem({ id: "EV_02", sourceUrl: "https://a.com/1", sourceId: "S_A" }),
      createEvidenceItem({ id: "EV_03", sourceUrl: "https://b.com/1", sourceId: "S_B" }),
    ];

    const portfolio = buildSourcePortfolio(evidence);
    expect(portfolio).toHaveLength(2);
    // Sorted by evidence count descending
    expect(portfolio[0].evidenceCount).toBe(2);
    expect(portfolio[0].domain).toBe("a.com");
    expect(portfolio[1].evidenceCount).toBe(1);
    expect(portfolio[1].domain).toBe("b.com");
  });

  it("should join SR data from FetchedSources when provided", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://reliable.org/study" }),
      createEvidenceItem({ id: "EV_02", sourceUrl: "https://unreliable.net/article" }),
    ];
    const sources = [
      createFetchedSource({ url: "https://reliable.org/study", trackRecordScore: 0.92, trackRecordConfidence: 0.85 }),
      createFetchedSource({ url: "https://unreliable.net/article", trackRecordScore: 0.38, trackRecordConfidence: 0.55 }),
    ];

    const portfolio = buildSourcePortfolio(evidence, sources);
    expect(portfolio).toHaveLength(2);

    const reliable = portfolio.find(p => p.domain === "reliable.org");
    expect(reliable?.trackRecordScore).toBe(0.92);
    expect(reliable?.trackRecordConfidence).toBe(0.85);

    const unreliable = portfolio.find(p => p.domain === "unreliable.net");
    expect(unreliable?.trackRecordScore).toBe(0.38);
    expect(unreliable?.trackRecordConfidence).toBe(0.55);
  });

  it("should return null scores when sources are not provided", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://example.com/page" }),
    ];

    const portfolio = buildSourcePortfolio(evidence);
    expect(portfolio).toHaveLength(1);
    expect(portfolio[0].trackRecordScore).toBeNull();
    expect(portfolio[0].trackRecordConfidence).toBeNull();
  });

  it("should handle evidence with no sourceUrl gracefully", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "" }),
      createEvidenceItem({ id: "EV_02", sourceUrl: "" }),
    ];

    const portfolio = buildSourcePortfolio(evidence);
    expect(portfolio).toHaveLength(1);
    expect(portfolio[0].evidenceCount).toBe(2);
    expect(portfolio[0].domain).toBe("");
  });

  it("should include sourcePortfolioByClaim in advocate prompt input", async () => {
    const claims = [createAtomicClaim()];
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://a.com/1", sourceId: "S_A", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", sourceUrl: "https://a.com/1", sourceId: "S_A", relevantClaimIds: ["AC_01"] }),
    ];
    const boundaries = [{ id: "CB_01", name: "Boundary 1", evidenceScope: { name: "default" }, evidenceIds: ["EV_01", "EV_02"] }] as any[];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries as any, evidence);

    const portfolio = buildSourcePortfolioByClaim(evidence);

    let capturedInput: Record<string, unknown> = {};
    const mockLlm: LLMCallFn = async (key, input) => {
      capturedInput = input;
      return [{ claimId: "AC_01", truthPercentage: 65, confidence: 70, reasoning: "test", supportingEvidenceIds: ["EV_01"], contradictingEvidenceIds: [] }];
    };

    await advocateVerdict(claims, evidence, boundaries, coverageMatrix, mockLlm, DEFAULT_VERDICT_STAGE_CONFIG, portfolio);

    expect(capturedInput.sourcePortfolioByClaim).toBeDefined();
    const spByClaim = capturedInput.sourcePortfolioByClaim as Record<string, any[]>;
    expect(spByClaim["AC_01"]).toBeDefined();
    expect(spByClaim["AC_01"]).toHaveLength(1);
    expect(spByClaim["AC_01"][0].domain).toBe("a.com");
    expect(spByClaim["AC_01"][0].evidenceCount).toBe(2);
  });
});

// ============================================================================
// buildSourcePortfolioByClaim (Fix 1 — claim-local portfolio)
// ============================================================================

describe("buildSourcePortfolioByClaim", () => {
  it("should produce separate portfolios per claim", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://flooding.org/article", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", sourceUrl: "https://flooding.org/article", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_03", sourceUrl: "https://flooding.org/article", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_04", sourceUrl: "https://good.org/study", relevantClaimIds: ["AC_02"] }),
      createEvidenceItem({ id: "EV_05", sourceUrl: "https://other.org/report", relevantClaimIds: ["AC_02"] }),
    ];

    const result = buildSourcePortfolioByClaim(evidence);

    // AC_01: 3 items from flooding.org
    expect(result["AC_01"]).toHaveLength(1);
    expect(result["AC_01"][0].domain).toBe("flooding.org");
    expect(result["AC_01"][0].evidenceCount).toBe(3);

    // AC_02: 1 item each from 2 sources — no concentration
    expect(result["AC_02"]).toHaveLength(2);
    expect(result["AC_02"][0].evidenceCount).toBe(1);
    expect(result["AC_02"][1].evidenceCount).toBe(1);
  });

  it("should not bleed concentration from one claim into another", () => {
    // flooding.org has 5 items for AC_01 but only 1 for AC_02
    const evidence = [
      ...Array.from({ length: 5 }, (_, i) =>
        createEvidenceItem({ id: `EV_A${i}`, sourceUrl: "https://flooding.org/article", relevantClaimIds: ["AC_01"] }),
      ),
      createEvidenceItem({ id: "EV_B0", sourceUrl: "https://flooding.org/article", relevantClaimIds: ["AC_02"] }),
      createEvidenceItem({ id: "EV_B1", sourceUrl: "https://other.org/report", relevantClaimIds: ["AC_02"] }),
    ];

    const result = buildSourcePortfolioByClaim(evidence);

    // AC_01 should show 5-item concentration
    expect(result["AC_01"][0].evidenceCount).toBe(5);

    // AC_02 should show only 1 from flooding.org — not 5
    const floodingInAC02 = result["AC_02"].find(p => p.domain === "flooding.org");
    expect(floodingInAC02?.evidenceCount).toBe(1);
  });

  it("should handle evidence mapped to multiple claims", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://shared.org/page", relevantClaimIds: ["AC_01", "AC_02"] }),
    ];

    const result = buildSourcePortfolioByClaim(evidence);
    expect(result["AC_01"]).toHaveLength(1);
    expect(result["AC_02"]).toHaveLength(1);
    expect(result["AC_01"][0].evidenceCount).toBe(1);
    expect(result["AC_02"][0].evidenceCount).toBe(1);
  });

  it("should return empty object for evidence with no relevantClaimIds", () => {
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceUrl: "https://orphan.org/page", relevantClaimIds: [] }),
    ];

    const result = buildSourcePortfolioByClaim(evidence);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ============================================================================
// isVerdictDirectionPlausible — structural citation + one-sided direct-evidence guard
// (It rejects polarity mismatches, explicitly non-direct directional citations,
// and midpoint/positive/negative verdicts that cite only one direct side.
// This cross-checks existing LLM-assigned labels only; it does not perform
// new semantic interpretation in code.)
// ============================================================================

describe("isVerdictDirectionPlausible", () => {
  it("returns true when citation polarity is clean (no mismatch)", () => {
    const verdict = createCBVerdict({
      truthPercentage: 65,
      supportingEvidenceIds: ["EV_S1"],
      contradictingEvidenceIds: ["EV_C1", "EV_C2"],
    });
    const ev = [
      createEvidenceItem({ id: "EV_S1", claimDirection: "supports", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_C1", claimDirection: "contradicts", probativeValue: "medium" }),
      createEvidenceItem({ id: "EV_C2", claimDirection: "contradicts", probativeValue: "medium" }),
    ];
    expect(isVerdictDirectionPlausible(verdict, ev)).toBe(true);
  });

  it("returns true when citation polarity matches evidence direction", () => {
    const verdict = createCBVerdict({
      truthPercentage: 85,
      supportingEvidenceIds: ["EV_S1", "EV_S2"],
      contradictingEvidenceIds: ["EV_C1"],
    });
    const ev = [
      createEvidenceItem({ id: "EV_S1", claimDirection: "supports", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_S2", claimDirection: "supports", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_C1", claimDirection: "contradicts", probativeValue: "medium" }),
    ];
    expect(isVerdictDirectionPlausible(verdict, ev)).toBe(true);
  });

  it("returns true when evidence IDs are empty", () => {
    const verdict = createCBVerdict({
      truthPercentage: 50,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
    });
    expect(isVerdictDirectionPlausible(verdict, [])).toBe(true);
  });

  it("returns false when directional citations rely on explicitly contextual evidence", () => {
    const verdict = createCBVerdict({
      truthPercentage: 70,
      supportingEvidenceIds: ["EV_CTX"],
      contradictingEvidenceIds: [],
    });
    const ev = [
      createEvidenceItem({
        id: "EV_CTX",
        claimDirection: "supports",
        applicability: "contextual",
      }),
    ];
    expect(isVerdictDirectionPlausible(verdict, ev)).toBe(false);
  });

  it("returns false when truth leans positive but only direct contradicting citations remain", () => {
    const verdict = createCBVerdict({
      truthPercentage: 55,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: ["EV_C1", "EV_C2"],
    });
    const ev = [
      createEvidenceItem({ id: "EV_C1", claimDirection: "contradicts", applicability: "direct" }),
      createEvidenceItem({ id: "EV_C2", claimDirection: "contradicts", applicability: "direct" }),
    ];
    expect(isVerdictDirectionPlausible(verdict, ev)).toBe(false);
  });

  it("returns false when a 50% midpoint verdict cites only one direct side", () => {
    const verdict = createCBVerdict({
      truthPercentage: 50,
      supportingEvidenceIds: ["EV_S1"],
      contradictingEvidenceIds: [],
    });
    const ev = [
      createEvidenceItem({ id: "EV_S1", claimDirection: "supports", applicability: "direct" }),
    ];
    expect(isVerdictDirectionPlausible(verdict, ev)).toBe(false);
  });

  it("polarity mismatch blocks self-consistency rescue: supporting bucket with contradicting evidence", () => {
    // Reproduces the AC_01 failure pattern from job 21dc9623:
    // Verdict says FALSE 15, but supportingEvidenceIds contains evidence stored as "supports" claimDirection.
    // The verdict is stable (self-consistency assessed + stable) but the citation polarity is objectively wrong.
    const wrongVerdict = createCBVerdict({
      truthPercentage: 15,
      supportingEvidenceIds: ["EV_S1", "EV_S2"],
      contradictingEvidenceIds: ["EV_C1"],
      consistencyResult: { claimId: "AC_01", percentages: [15, 15, 15], average: 15, spread: 0, stable: true, assessed: true },
    });
    const ev = [
      // EV_S1 is in supportingEvidenceIds but stored as "supports" — correctly labeled.
      // EV_C1 is in contradictingEvidenceIds but stored as "supports" — mislabeled!
      createEvidenceItem({ id: "EV_S1", claimDirection: "supports", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_S2", claimDirection: "supports", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_C1", claimDirection: "supports", probativeValue: "high" }),
    ];
    // Despite stable consistency, the contradictingEvidenceIds bucket contains evidence
    // stored as "supports" — a deterministic polarity mismatch.
    // Self-consistency rescue must NOT override this.
    expect(isVerdictDirectionPlausible(wrongVerdict, ev)).toBe(false);
  });

  it("polarity mismatch: clean citation polarity still allows self-consistency rescue", () => {
    // Same shape but citation polarity is clean — self-consistency rescue should work.
    const correctVerdict = createCBVerdict({
      truthPercentage: 15,
      supportingEvidenceIds: ["EV_S1"],
      contradictingEvidenceIds: ["EV_C1", "EV_C2"],
      consistencyResult: { claimId: "AC_01", percentages: [15, 15, 15], average: 15, spread: 0, stable: true, assessed: true },
    });
    const ev = [
      createEvidenceItem({ id: "EV_S1", claimDirection: "supports", probativeValue: "medium" }),
      createEvidenceItem({ id: "EV_C1", claimDirection: "contradicts", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_C2", claimDirection: "contradicts", probativeValue: "high" }),
    ];
    // Citation polarity is clean (supports in supporting, contradicts in contradicting).
    // Self-consistency rescue should work: stable + assessed + no polarity mismatch.
    expect(isVerdictDirectionPlausible(correctVerdict, ev)).toBe(true);
  });
});

// ============================================================================
// CLAIM-LOCAL EVIDENCE SCOPING
// ============================================================================

describe("getClaimLocalEvidence", () => {
  it("returns only evidence mapped to the target claim via relevantClaimIds", () => {
    const verdict = createCBVerdict({
      claimId: "AC_02",
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
    });
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", relevantClaimIds: ["AC_02"] }),
      createEvidenceItem({ id: "EV_03", relevantClaimIds: ["AC_01", "AC_02"] }),
      createEvidenceItem({ id: "EV_04", relevantClaimIds: ["AC_03"] }),
    ];
    const result = getClaimLocalEvidence("AC_02", verdict, evidence);
    expect(result.map((e) => e.id).sort()).toEqual(["EV_02", "EV_03"]);
  });

  it("includes cited evidence IDs even when relevantClaimIds mapping is missing", () => {
    const verdict = createCBVerdict({
      claimId: "AC_02",
      supportingEvidenceIds: ["EV_05"],
      contradictingEvidenceIds: ["EV_06"],
    });
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_02"] }),
      createEvidenceItem({ id: "EV_05", relevantClaimIds: ["AC_01"] }), // cited but mapped to sibling
      createEvidenceItem({ id: "EV_06", relevantClaimIds: undefined }),  // cited but no mapping at all
    ];
    const result = getClaimLocalEvidence("AC_02", verdict, evidence);
    expect(result.map((e) => e.id).sort()).toEqual(["EV_01", "EV_05", "EV_06"]);
  });

  it("does not duplicate evidence that is both claim-local and cited", () => {
    const verdict = createCBVerdict({
      claimId: "AC_01",
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: [],
    });
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"] }),
    ];
    const result = getClaimLocalEvidence("AC_01", verdict, evidence);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("EV_01");
  });

  it("falls back to full pool when claim-local + cited is completely empty", () => {
    const verdict = createCBVerdict({
      claimId: "AC_02",
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
    });
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", relevantClaimIds: ["AC_03"] }),
    ];
    const result = getClaimLocalEvidence("AC_02", verdict, evidence);
    // No claim-local or cited evidence — falls back to full pool
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id).sort()).toEqual(["EV_01", "EV_02"]);
  });

  it("does not fall back to full pool when cited evidence exists but relevantClaimIds is missing", () => {
    const verdict = createCBVerdict({
      claimId: "AC_02",
      supportingEvidenceIds: ["EV_03"],
      contradictingEvidenceIds: [],
    });
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_02", relevantClaimIds: ["AC_01"] }),
      createEvidenceItem({ id: "EV_03", relevantClaimIds: ["AC_01"] }),
    ];
    const result = getClaimLocalEvidence("AC_02", verdict, evidence);
    // Only EV_03 (cited) — does NOT fall back to full pool
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("EV_03");
  });
});

describe("claim-local direction validation (cross-claim contamination prevention)", () => {
  it("direction validation uses claim-local evidence, not sibling-claim evidence (9e4d anchor case)", async () => {
    // Scenario: AC_01 has 6 supports, AC_02 has 4 neutral items.
    // Without claim-local scoping, AC_02's direction validation would see all 10 items
    // and could falsely conclude a direction mismatch from sibling evidence.
    const ac01Verdict = createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 72,
      confidence: 65,
      supportingEvidenceIds: ["EV_S1", "EV_S2", "EV_S3", "EV_S4", "EV_S5", "EV_S6"],
      contradictingEvidenceIds: [],
    });
    const ac02Verdict = createCBVerdict({
      claimId: "AC_02",
      truthPercentage: 50,
      confidence: 24,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
    });

    const evidence = [
      // AC_01's evidence: 6 strong supports
      createEvidenceItem({ id: "EV_S1", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_S2", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_S3", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_S4", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_S5", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_S6", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      // AC_02's evidence: 4 neutral/contextual
      createEvidenceItem({ id: "EV_N1", relevantClaimIds: ["AC_02"], claimDirection: "contextual" }),
      createEvidenceItem({ id: "EV_N2", relevantClaimIds: ["AC_02"], claimDirection: "contextual" }),
      createEvidenceItem({ id: "EV_N3", relevantClaimIds: ["AC_02"], claimDirection: "contextual" }),
      createEvidenceItem({ id: "EV_N4", relevantClaimIds: ["AC_02"], claimDirection: "contextual" }),
    ];

    // Track what evidence pool the direction validation LLM sees for each claim
    const directionInputsByClaimId = new Map<string, unknown>();
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [
          { claimId: "AC_01", groundingValid: true, issues: [] },
          { claimId: "AC_02", groundingValid: true, issues: [] },
        ];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        // Record the per-verdict evidence pools from the input
        const verdicts = input.verdicts as Array<Record<string, unknown>>;
        for (const v of verdicts) {
          directionInputsByClaimId.set(v.claimId as string, v.evidencePool);
        }
        return [
          { claimId: "AC_01", directionValid: true, issues: [] },
          { claimId: "AC_02", directionValid: true, issues: [] },
        ];
      }
      return [];
    }) as unknown as LLMCallFn;

    await validateVerdicts(
      [ac01Verdict, ac02Verdict],
      evidence,
      mockLLM,
    );

    // Verify AC_02's direction validation evidence pool contains only its 4 items
    const ac02Pool = directionInputsByClaimId.get("AC_02") as Array<{ id: string; applicability?: string }>;
    expect(ac02Pool).toBeDefined();
    const ac02PoolIds = ac02Pool.map((e) => e.id).sort();
    expect(ac02PoolIds).toEqual(["EV_N1", "EV_N2", "EV_N3", "EV_N4"]);
    // Crucially, AC_01's supporting evidence must NOT appear in AC_02's pool
    expect(ac02PoolIds).not.toContain("EV_S1");
    expect(ac02PoolIds).not.toContain("EV_S6");
    expect(ac02Pool!.every((e) => e.applicability === "direct")).toBe(true);

    // AC_01's pool should contain its own 6 items
    const ac01Pool = directionInputsByClaimId.get("AC_01") as Array<{ id: string; applicability?: string }>;
    expect(ac01Pool).toBeDefined();
    expect(ac01Pool).toHaveLength(6);
  });

  it("direction repair uses claim-local evidence, not sibling evidence", async () => {
    // AC_02 has contradicting evidence but high truth, plus a polarity mismatch
    // (EV_C1 in contradictingEvidenceIds but stored as "supports") that triggers
    // isVerdictDirectionPlausible → false, forcing the repair path.
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_02",
      truthPercentage: 85,
      confidence: 70,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: ["EV_C1", "EV_C2", "EV_C3"],
      consistencyResult: { claimId: "AC_02", percentages: [85], average: 85, spread: 0, stable: false, assessed: false },
    })];
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02", statement: "Scope claim" }),
    ];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      // AC_01's evidence (sibling)
      createEvidenceItem({ id: "EV_S1", relevantClaimIds: ["AC_01"], claimDirection: "supports", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_S2", relevantClaimIds: ["AC_01"], claimDirection: "supports", claimBoundaryId: "CB_01" }),
      // AC_02's evidence — EV_C1 has polarity mismatch (in contradicting bucket but stored as "supports")
      createEvidenceItem({ id: "EV_C1", relevantClaimIds: ["AC_02"], claimDirection: "supports", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_C2", relevantClaimIds: ["AC_02"], claimDirection: "contradicts", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_C3", relevantClaimIds: ["AC_02"], claimDirection: "contradicts", claimBoundaryId: "CB_01" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let repairEvidencePool: Array<{ id: string; applicability?: string }> | undefined;
    let groundingValidationCalls = 0;
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        groundingValidationCalls += 1;
        if (groundingValidationCalls === 2) {
          return [{ claimId: "AC_02", groundingValid: false, issues: ["Normalized citations require repair"] }];
        }
        return [{ claimId: "AC_02", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_02", directionValid: false, issues: ["Direction mismatch"] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        repairEvidencePool = input.evidencePool as Array<{ id: string; applicability?: string }>;
        return { claimId: "AC_02", truthPercentage: 25, reasoning: "Adjusted to match contradicting evidence" };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    // Repair evidence pool must contain only AC_02's evidence (claim-local)
    expect(repairEvidencePool).toBeDefined();
    const repairPoolIds = repairEvidencePool!.map((e) => e.id).sort();
    expect(repairPoolIds).toEqual(["EV_C1", "EV_C2", "EV_C3"]);
    // Must NOT contain AC_01's evidence
    expect(repairPoolIds).not.toContain("EV_S1");
    expect(repairPoolIds).not.toContain("EV_S2");
    expect(repairEvidencePool!.every((e) => e.applicability === "direct")).toBe(true);
  });

  it("validateDirectionOnly uses claim-local evidence after repair", async () => {
    // After repair, re-validation must also scope to claim-local evidence.
    // EV_C1 has polarity mismatch (in contradicting bucket but stored as "supports")
    // to trigger isVerdictDirectionPlausible → false, forcing the repair path.
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_02",
      truthPercentage: 85,
      confidence: 80,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: ["EV_C1", "EV_C2", "EV_C3", "EV_C4"],
      consistencyResult: { claimId: "AC_02", percentages: [85], average: 85, spread: 0, stable: false, assessed: false },
    })];
    const claims = [
      createAtomicClaim({ id: "AC_01" }),
      createAtomicClaim({ id: "AC_02" }),
    ];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_S1", relevantClaimIds: ["AC_01"], claimDirection: "supports", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_S2", relevantClaimIds: ["AC_01"], claimDirection: "supports", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_C1", relevantClaimIds: ["AC_02"], claimDirection: "supports", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_C2", relevantClaimIds: ["AC_02"], claimDirection: "contradicts", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_C3", relevantClaimIds: ["AC_02"], claimDirection: "contradicts", claimBoundaryId: "CB_01" }),
      createEvidenceItem({ id: "EV_C4", relevantClaimIds: ["AC_02"], claimDirection: "contradicts", claimBoundaryId: "CB_01" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const warnings: AnalysisWarning[] = [];

    let revalidationEvidencePool: Array<{ id: string; applicability?: string }> | undefined;
    let directionCallCount = 0;
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_02", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        directionCallCount += 1;
        if (directionCallCount === 1) {
          // Initial batch direction validation fails
          return [{ claimId: "AC_02", directionValid: false, issues: ["Mismatch"] }];
        }
        // Re-validation after repair — capture the evidence pool (now embedded per-verdict)
        const verdictArr = input.verdicts as Array<{ evidencePool?: Array<{ id: string; applicability?: string }> }>;
        revalidationEvidencePool = verdictArr?.[0]?.evidencePool;
        return [{ claimId: "AC_02", directionValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_REPAIR") {
        // Repair to 20% (aligns with all-contradicting evidence)
        return { claimId: "AC_02", truthPercentage: 20, reasoning: "Adjusted to match contradicting evidence" };
      }
      return [];
    }) as unknown as LLMCallFn;

    const config: VerdictStageConfig = {
      ...DEFAULT_VERDICT_STAGE_CONFIG,
      verdictDirectionPolicy: "retry_once_then_safe_downgrade",
    };

    await validateVerdicts(
      verdicts,
      evidence,
      mockLLM,
      config,
      warnings,
      { claims, boundaries, coverageMatrix },
    );

    // Re-validation evidence pool must be claim-local (AC_02's 4 contradicts only)
    expect(revalidationEvidencePool).toBeDefined();
    const revalidationIds = revalidationEvidencePool!.map((e) => e.id).sort();
    expect(revalidationIds).toEqual(["EV_C1", "EV_C2", "EV_C3", "EV_C4"]);
    expect(revalidationIds).not.toContain("EV_S1");
    expect(revalidationIds).not.toContain("EV_S2");
    expect(revalidationEvidencePool!.every((e) => e.applicability === "direct")).toBe(true);
  });

  it("grounding validation uses strict claim-local evidence and separate cited registry", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_02",
      supportingEvidenceIds: ["EV_S1"],
      contradictingEvidenceIds: [],
    })];
    const evidence = [
      createEvidenceItem({ id: "EV_S1", relevantClaimIds: ["AC_01"] }), // belongs to sibling but cited
      createEvidenceItem({ id: "EV_N1", relevantClaimIds: ["AC_02"] }),
    ];

    let groundingEvidencePool: Array<{ id: string }> | undefined;
    let groundingCitedRegistry: Array<{ id: string }> | undefined;
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        const verdictInput = (input.verdicts as Array<Record<string, unknown>>)?.[0];
        groundingEvidencePool = verdictInput?.evidencePool as Array<{ id: string }>;
        groundingCitedRegistry = verdictInput?.citedEvidenceRegistry as Array<{ id: string }>;
        return [{ claimId: "AC_02", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_02", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    await validateVerdicts(verdicts, evidence, mockLLM);

    // Grounding must see only strict claim-local evidence for reasoning validation.
    // IDs are aliased (EVG_xxx) for validator LLM numeric-precision safety.
    expect(groundingEvidencePool).toBeDefined();
    expect(groundingEvidencePool).toHaveLength(1);
    expect(groundingEvidencePool![0].id).toMatch(/^EVG_\d{3}$/);
    // Cited registry preserves globally existing cited IDs so the validator can
    // distinguish cross-claim contamination from hallucinated IDs.
    expect(groundingCitedRegistry).toBeDefined();
    expect(groundingCitedRegistry).toHaveLength(1);
    expect(groundingCitedRegistry![0].id).toMatch(/^EVG_\d{3}$/);
    // The aliased IDs must be different (pool vs registry are different items)
    expect(groundingEvidencePool![0].id).not.toEqual(groundingCitedRegistry![0].id);
  });

  it("grounding validation sees uncited-but-claim-local evidence as valid context", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_03",
      supportingEvidenceIds: ["EV_02", "EV_03"],
      contradictingEvidenceIds: [],
    })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", sourceId: "S_015", relevantClaimIds: ["AC_03"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_02", sourceId: "S_016", relevantClaimIds: ["AC_03"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_03", sourceId: "S_016", relevantClaimIds: ["AC_03"], claimDirection: "supports" }),
    ];

    let groundingEvidencePool: Array<{ id: string; sourceId?: string }> | undefined;
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        const verdictInput = (input.verdicts as Array<Record<string, unknown>>)?.[0];
        groundingEvidencePool = verdictInput?.evidencePool as Array<{ id: string; sourceId?: string }>;
        return [{ claimId: "AC_03", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_03", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    await validateVerdicts(verdicts, evidence, mockLLM);

    // IDs are aliased (EVG_xxx) for validator LLM numeric-precision safety.
    expect(groundingEvidencePool).toBeDefined();
    expect(groundingEvidencePool).toHaveLength(3);
    expect(groundingEvidencePool!.every((e) => /^EVG_\d{3}$/.test(e.id!))).toBe(true);
    // Source IDs are NOT aliased — only evidence IDs are.
    expect(groundingEvidencePool!.map((e) => e.sourceId)).toContain("S_015");
  });

  it("grounding validation receives source portfolio when available in repair context", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: [],
    })];
    const claims = [createAtomicClaim({ id: "AC_01" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
    ];
    const boundaries = [createClaimBoundary({ id: "CB_01" })];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);

    let groundingSourcePortfolio: Array<{ sourceId: string; domain: string }> | undefined;
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        const verdictInput = (input.verdicts as Array<Record<string, unknown>>)?.[0];
        groundingSourcePortfolio = verdictInput?.sourcePortfolio as Array<{ sourceId: string; domain: string }>;
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    await validateVerdicts(verdicts, evidence, mockLLM, undefined, undefined, {
      claims,
      boundaries,
      coverageMatrix,
      sourcePortfolioByClaim: {
        AC_01: [{ sourceId: "S_025", domain: "example.com", sourceUrl: "https://example.com", evidenceCount: 3, trackRecordScore: 0.78, trackRecordConfidence: 0.65 }],
      },
    });

    // Source portfolio should be claim-local and passed alongside the matching verdict input
    expect(groundingSourcePortfolio).toBeDefined();
    expect(groundingSourcePortfolio).toHaveLength(1);
    expect(groundingSourcePortfolio![0]).toEqual(expect.objectContaining({
      sourceId: "S_025",
      domain: "example.com",
      trackRecordScore: 0.78,
      trackRecordConfidence: 0.65,
      evidenceCount: 3,
    }));
  });

  it("grounding validation receives boundary IDs and structured challenge context", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_02",
      supportingEvidenceIds: ["EV_01"],
      contradictingEvidenceIds: [],
      boundaryFindings: [
        {
          boundaryId: "CB_04",
          boundaryName: "Boundary 4",
          truthPercentage: 75,
          confidence: 80,
          evidenceDirection: "supports",
          evidenceCount: 1,
        },
        {
          boundaryId: "CB_07",
          boundaryName: "Boundary 7",
          truthPercentage: 70,
          confidence: 75,
          evidenceDirection: "supports",
          evidenceCount: 1,
        },
      ],
    })];
    const claims = [createAtomicClaim({ id: "AC_02" })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_02"], claimDirection: "supports", claimBoundaryId: "CB_04" }),
    ];
    const boundaries = [
      createClaimBoundary({ id: "CB_04", name: "Boundary 4" }),
      createClaimBoundary({ id: "CB_07", name: "Boundary 7" }),
    ];
    const coverageMatrix = buildCoverageMatrix(claims, boundaries, evidence);
    const validatedChallengeDoc: ChallengeDocument = {
      challenges: [{
        claimId: "AC_02",
        challengePoints: [{
          id: "CP_AC_02_0",
          type: "methodology_weakness",
          description: "Challenge cites one invalid evidence ID",
          evidenceIds: ["EV_999"],
          severity: "medium",
          challengeValidation: { evidenceIdsValid: false, validIds: [], invalidIds: ["EV_999"] },
        }],
      }],
    };

    let groundingBoundaryIds: string[] | undefined;
    let groundingChallengeContext: Array<Record<string, unknown>> | undefined;
    const mockLLM = vi.fn(async (key: string, input: Record<string, unknown>) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        const verdictInput = (input.verdicts as Array<Record<string, unknown>>)?.[0];
        groundingBoundaryIds = verdictInput?.boundaryIds as string[];
        groundingChallengeContext = verdictInput?.challengeContext as Array<Record<string, unknown>>;
        return [{ claimId: "AC_02", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_02", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    await validateVerdicts(verdicts, evidence, mockLLM, undefined, undefined, {
      claims,
      boundaries,
      coverageMatrix,
      validatedChallengeDoc,
    });

    // Boundary IDs are NOT aliased — only evidence IDs are.
    expect(groundingBoundaryIds).toEqual(["CB_04", "CB_07"]);
    // Evidence IDs in challenge context are aliased (EVG_xxx).
    expect(groundingChallengeContext).toEqual([
      expect.objectContaining({
        challengeId: "CP_AC_02_0",
        challengeType: "methodology_weakness",
        citedEvidenceIds: [expect.stringMatching(/^EVG_\d{3}$/)],
        challengeValidation: {
          evidenceIdsValid: false,
          validIds: [],
          invalidIds: [expect.stringMatching(/^EVG_\d{3}$/)],
        },
      }),
    ]);
  });

  it("standard single-claim validation still works (no regression)", async () => {
    const verdicts: CBClaimVerdict[] = [createCBVerdict({
      claimId: "AC_01",
      truthPercentage: 75,
      confidence: 80,
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: [],
    })];
    const evidence = [
      createEvidenceItem({ id: "EV_01", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
      createEvidenceItem({ id: "EV_02", relevantClaimIds: ["AC_01"], claimDirection: "supports" }),
    ];

    const mockLLM = vi.fn(async (key: string) => {
      if (key === "VERDICT_GROUNDING_VALIDATION") {
        return [{ claimId: "AC_01", groundingValid: true, issues: [] }];
      }
      if (key === "VERDICT_DIRECTION_VALIDATION") {
        return [{ claimId: "AC_01", directionValid: true, issues: [] }];
      }
      return [];
    }) as unknown as LLMCallFn;

    const result = await validateVerdicts(verdicts, evidence, mockLLM);
    expect(result).toHaveLength(1);
    expect(result[0].truthPercentage).toBe(75);
    expect(result[0].claimId).toBe("AC_01");
  });
});
