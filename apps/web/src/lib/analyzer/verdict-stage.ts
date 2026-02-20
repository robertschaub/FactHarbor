/**
 * ClaimBoundary Pipeline — Verdict Stage Module (§8.4)
 *
 * 5-step LLM debate pattern for generating claim verdicts:
 *   Step 1: Advocate Verdict (Sonnet) — initial verdicts for all claims
 *   Step 2: Self-Consistency Check (Sonnet × 2) — verdict stability measurement
 *   Step 3: Adversarial Challenge (Sonnet) — argue against emerging verdicts
 *   Step 4: Reconciliation (Sonnet) — final verdicts incorporating challenges
 *   Step 5: Verdict Validation (Haiku × 2) — grounding + direction checks
 *   THEN: Structural Consistency Check (deterministic) — invariant validation
 *   Gate 4: Confidence classification
 *
 * Steps 2 and 3 run in parallel (both need only Step 1 output).
 * Step 4 waits for both Steps 2 and 3.
 *
 * Each step is an independently testable function.
 * Prompts are UCM-managed (see §22.2 UCM Prompt Registry).
 *
 * @module analyzer/verdict-stage
 * @since ClaimAssessmentBoundary pipeline v1
 * @see Docs/WIP/ClaimAssessmentBoundary_Pipeline_Architecture_2026-02-15.md §8.4
 */

import type {
  AnalysisWarning,
  AtomicClaim,
  BoundaryFinding,
  CBClaimVerdict,
  ChallengeDocument,
  ChallengePoint,
  ChallengeResponse,
  ChallengeValidation,
  ClaimAssessmentBoundary,
  ClaimVerdict7Point,
  ConsistencyResult,
  CoverageMatrix,
  EvidenceItem,
  TriangulationScore,
} from "./types";

import { percentageToClaimVerdict } from "./truth-scale";
import type { LLMProviderType } from "@/lib/config-schemas";

// ============================================================================
// CONFIGURATION (UCM-configurable thresholds)
// ============================================================================

/**
 * Verdict stage configuration. All thresholds are UCM-configurable.
 */
export interface VerdictStageConfig {
  /** Self-consistency mode: "full" | "disabled" (mirrors UCM PipelineConfigSchema) */
  selfConsistencyMode: "full" | "disabled";
  /** Temperature for self-consistency re-runs (default 0.3, floor 0.1, ceiling 0.7) */
  selfConsistencyTemperature: number;

  /** Spread thresholds for confidence adjustment (§8.5.5) */
  stableThreshold: number;       // default 5pp — highly stable
  moderateThreshold: number;     // default 12pp — moderately stable
  unstableThreshold: number;     // default 20pp — unstable

  /** Spread multipliers for confidence adjustment (§8.5.5) */
  spreadMultipliers: {
    highlyStable: number;        // default 1.0
    moderatelyStable: number;    // default 0.9
    unstable: number;            // default 0.7
    highlyUnstable: number;      // default 0.4
  };

  /** Mixed/Unverified confidence threshold (UCM, default 40) */
  mixedConfidenceThreshold: number;

  /**
   * Minimum confidence required for high-harm claims (harmPotential "critical" or "high")
   * before a definitive verdict is issued. Claims below this threshold are downgraded
   * to UNVERIFIED regardless of truth percentage.
   *
   * Addresses C8 (advisory-only validation) from Stammbach/Ash political bias analysis.
   * Default 50. Set to 0 to disable.
   */
  highHarmMinConfidence: number;

  /**
   * Per-role model tier for the verdict debate pattern.
   * Allows using different models for different debate roles to reduce
   * single-model bias (C1/C16 from Stammbach/Ash political bias analysis).
   *
   * The Climinator paper (Ash group) shows structurally independent advocates
   * surface genuine controversy. Using different models for challenger vs
   * advocate tests whether "performative adversarialism" is a real concern.
   *
   * Default: debate roles "sonnet", validation "haiku".
   */
  debateModelTiers: {
    advocate: "haiku" | "sonnet";
    selfConsistency: "haiku" | "sonnet";
    challenger: "haiku" | "sonnet";
    reconciler: "haiku" | "sonnet";
    validation: "haiku" | "sonnet";
  };

  /**
   * Per-role LLM provider overrides for cross-provider debate.
   * Enables structurally independent debate by routing different roles
   * to different providers (e.g., advocate on Anthropic, challenger on OpenAI).
   *
   * Addresses C1/C16 from Stammbach/Ash: same-model debate can become
   * performative adversarialism. Cross-provider separation follows
   * Climinator's structurally independent advocate pattern.
   *
   * Default: all undefined (inherit global llmProvider).
   */
  debateModelProviders: {
    advocate?: LLMProviderType;
    selfConsistency?: LLMProviderType;
    challenger?: LLMProviderType;
    reconciler?: LLMProviderType;
    validation?: LLMProviderType;
  };

  /** Harm levels that trigger the confidence floor. Default: ["critical", "high"]. */
  highHarmFloorLevels: Array<"critical" | "high" | "medium" | "low">;

  /** Range reporting configuration (Stammbach/Ash Action #6). */
  rangeReporting?: {
    enabled: boolean;
    /** Range width (pp) above which a contested_verdict_range warning is emitted. */
    wideRangeThreshold: number;
    /** Boundary variance widening weight (0-1). 0.0 = disabled (method A). */
    boundaryVarianceWeight: number;
  };
}

/**
 * Default verdict stage configuration.
 */
export const DEFAULT_VERDICT_STAGE_CONFIG: VerdictStageConfig = {
  selfConsistencyMode: "full",
  selfConsistencyTemperature: 0.3,
  stableThreshold: 5,
  moderateThreshold: 12,
  unstableThreshold: 20,
  spreadMultipliers: {
    highlyStable: 1.0,
    moderatelyStable: 0.9,
    unstable: 0.7,
    highlyUnstable: 0.4,
  },
  mixedConfidenceThreshold: 40,
  highHarmMinConfidence: 50,
  debateModelTiers: {
    advocate: "sonnet",
    selfConsistency: "sonnet",
    challenger: "sonnet",
    reconciler: "sonnet",
    validation: "haiku",
  },
  debateModelProviders: {},
  highHarmFloorLevels: ["critical", "high"],
};

// ============================================================================
// LLM CALL ABSTRACTION (injectable for testing)
// ============================================================================

/**
 * LLM call function signature. Injected for testability.
 * In production, this wraps AI SDK generateText with UCM prompt + Zod schema.
 *
 * @param promptKey - UCM prompt registry key (e.g., "VERDICT_ADVOCATE")
 * @param input - Structured input data for the prompt
 * @param options - Model tier, temperature, etc.
 * @returns Parsed structured output
 */
export type LLMCallFn = (
  promptKey: string,
  input: Record<string, unknown>,
  options?: {
    tier?: "sonnet" | "haiku";
    temperature?: number;
    /** Override the LLM provider for this call (e.g., "openai" when global is "anthropic"). */
    providerOverride?: LLMProviderType;
    /** Override the specific model name for this call (e.g., "gpt-4.1"). */
    modelOverride?: string;
  }
) => Promise<unknown>;

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Run the full verdict stage (Steps 1-5 + structural check + Gate 4).
 *
 * Critical path: Step 1 → max(Step 2, Step 3) → Step 4 → Step 5 → Gate 4
 *
 * @param claims - Atomic claims from Stage 1
 * @param evidence - All evidence items (boundary-assigned)
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @param llmCall - Injectable LLM call function
 * @param config - Verdict stage configuration (UCM)
 * @returns Final CBClaimVerdicts with all debate data attached
 */
export async function runVerdictStage(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
  warnings?: AnalysisWarning[],
): Promise<CBClaimVerdict[]> {
  // Step 1: Advocate Verdict
  const advocateVerdicts = await advocateVerdict(
    claims, evidence, boundaries, coverageMatrix, llmCall, config
  );

  // Steps 2 & 3: Run in parallel
  const [consistencyResults, challengeDoc] = await Promise.all([
    selfConsistencyCheck(claims, evidence, boundaries, coverageMatrix, advocateVerdicts, llmCall, config),
    adversarialChallenge(advocateVerdicts, evidence, boundaries, llmCall, config),
  ]);

  // Step 4: Reconciliation (with evidence for challenge validation)
  const { verdicts: reconciledVerdicts, validatedChallengeDoc } = await reconcileVerdicts(
    advocateVerdicts, challengeDoc, consistencyResults, evidence, llmCall, config
  );

  // Step 4b: Baseless challenge enforcement (hybrid — revert baseless adjustments)
  const enforcedVerdicts = enforceBaselessChallengePolicy(
    reconciledVerdicts, validatedChallengeDoc, advocateVerdicts, warnings
  );

  // Step 5: Verdict Validation
  const validatedVerdicts = await validateVerdicts(enforcedVerdicts, evidence, llmCall, config);

  // Structural Consistency Check (deterministic)
  const structuralWarnings = runStructuralConsistencyCheck(
    validatedVerdicts, evidence, boundaries, coverageMatrix, config
  );
  if (structuralWarnings.length > 0) {
    console.warn("[VerdictStage] Structural consistency warnings:", structuralWarnings);
  }

  // Step 5b: High-harm confidence floor (C8 — Stammbach/Ash bias mitigation)
  const harmEnforcedVerdicts = enforceHarmConfidenceFloor(validatedVerdicts, config);

  // Gate 4: Confidence classification
  const finalVerdicts = classifyConfidence(harmEnforcedVerdicts);

  // Range reporting: compute truthPercentageRange for each verdict
  if (config.rangeReporting?.enabled) {
    for (const v of finalVerdicts) {
      v.truthPercentageRange = computeTruthPercentageRange(v, config.rangeReporting);
      // Emit warning if range is wider than threshold
      if (v.truthPercentageRange) {
        const width = v.truthPercentageRange.max - v.truthPercentageRange.min;
        if (width > config.rangeReporting.wideRangeThreshold) {
          warnings?.push({
            type: "contested_verdict_range",
            severity: "info",
            message: `Claim ${v.claimId}: truth% range ${v.truthPercentageRange.min}–${v.truthPercentageRange.max} (width ${width.toFixed(1)} pp) exceeds threshold ${config.rangeReporting.wideRangeThreshold} pp.`,
          });
        }
      }
    }
  }

  return finalVerdicts;
}

// ============================================================================
// STEP 1: ADVOCATE VERDICT (§8.4 Step 1)
// ============================================================================

/**
 * Step 1: Generate initial verdicts for all claims.
 * Single Sonnet-tier LLM call with evidence organized by boundary.
 *
 * @param claims - Atomic claims
 * @param evidence - Evidence items (boundary-assigned)
 * @param boundaries - ClaimBoundaries
 * @param coverageMatrix - Coverage matrix
 * @param llmCall - LLM call function
 * @returns Initial CBClaimVerdicts with per-boundary findings
 */
export async function advocateVerdict(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): Promise<CBClaimVerdict[]> {
  const result = await llmCall("VERDICT_ADVOCATE", {
    atomicClaims: claims,
    evidenceItems: evidence,
    claimBoundaries: boundaries,
    coverageMatrix: {
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    },
  }, { tier: config.debateModelTiers.advocate, providerOverride: config.debateModelProviders.advocate });

  // Parse LLM result into CBClaimVerdict[]
  const rawVerdicts = result as Array<Record<string, unknown>>;
  return rawVerdicts.map((raw) => parseAdvocateVerdict(raw, claims, config));
}

/**
 * Parse a raw LLM advocate verdict into a CBClaimVerdict.
 * Provides defaults for missing fields to ensure structural validity.
 */
function parseAdvocateVerdict(
  raw: Record<string, unknown>,
  claims: AtomicClaim[],
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): CBClaimVerdict {
  const claimId = String(raw.claimId ?? "");
  const claim = claims.find((c) => c.id === claimId);
  const truthPercentage = clampPercentage(Number(raw.truthPercentage ?? 50));
  const confidence = clampPercentage(Number(raw.confidence ?? 50));

  return {
    id: String(raw.id ?? `CV_${claimId}`),
    claimId,
    truthPercentage,
    verdict: percentageToClaimVerdict(truthPercentage, confidence, undefined, config.mixedConfidenceThreshold),
    confidence,
    reasoning: String(raw.reasoning ?? ""),
    harmPotential: claim?.harmPotential ?? "medium",
    isContested: Boolean(raw.isContested ?? false),
    supportingEvidenceIds: asStringArray(raw.supportingEvidenceIds),
    contradictingEvidenceIds: asStringArray(raw.contradictingEvidenceIds),
    boundaryFindings: parseBoundaryFindings(raw.boundaryFindings),
    // Populated in later steps
    consistencyResult: { claimId, percentages: [truthPercentage], average: truthPercentage, spread: 0, stable: true, assessed: false },
    challengeResponses: [],
    triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak", factor: 1.0 },
  };
}

// ============================================================================
// STEP 2: SELF-CONSISTENCY CHECK (§8.4 Step 2)
// ============================================================================

/**
 * Step 2: Measure verdict stability by re-running advocate prompt at elevated temperature.
 * 0 or 2 additional Sonnet calls, parallel with Step 3.
 *
 * Skip conditions: selfConsistencyMode = "disabled" → return assessed: false for all.
 *
 * @returns ConsistencyResult per claim
 */
export async function selfConsistencyCheck(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  advocateVerdicts: CBClaimVerdict[],
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): Promise<ConsistencyResult[]> {
  // Skip if disabled
  if (config.selfConsistencyMode === "disabled") {
    return claims.map((c) => ({
      claimId: c.id,
      percentages: [],
      average: 0,
      spread: 0,
      stable: true,
      assessed: false,
    }));
  }

  // Temperature clamped to [0.1, 0.7]
  const temperature = Math.max(0.1, Math.min(0.7, config.selfConsistencyTemperature));

  // Re-run advocate prompt 2 times at elevated temperature
  const input = {
    atomicClaims: claims,
    evidenceItems: evidence,
    claimBoundaries: boundaries,
    coverageMatrix: {
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    },
  };

  const [run2, run3] = await Promise.all([
    llmCall("VERDICT_ADVOCATE", input, { tier: config.debateModelTiers.selfConsistency, temperature, providerOverride: config.debateModelProviders.selfConsistency }),
    llmCall("VERDICT_ADVOCATE", input, { tier: config.debateModelTiers.selfConsistency, temperature, providerOverride: config.debateModelProviders.selfConsistency }),
  ]);

  const run2Verdicts = run2 as Array<Record<string, unknown>>;
  const run3Verdicts = run3 as Array<Record<string, unknown>>;

  return claims.map((claim) => {
    const v1 = advocateVerdicts.find((v) => v.claimId === claim.id)?.truthPercentage ?? 50;
    const v2 = Number(run2Verdicts.find((v) => String(v.claimId) === claim.id)?.truthPercentage ?? 50);
    const v3 = Number(run3Verdicts.find((v) => String(v.claimId) === claim.id)?.truthPercentage ?? 50);

    const percentages = [v1, v2, v3];
    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const spread = Math.max(...percentages) - Math.min(...percentages);

    return {
      claimId: claim.id,
      percentages,
      average,
      spread,
      stable: spread <= config.stableThreshold,
      assessed: true,
    };
  });
}

// ============================================================================
// STEP 3: ADVERSARIAL CHALLENGE (§8.4 Step 3)
// ============================================================================

/**
 * Step 3: Generate adversarial challenges against the advocate verdicts.
 * Single Sonnet call, parallel with Step 2.
 *
 * @returns ChallengeDocument with per-claim challenges
 */
export async function adversarialChallenge(
  advocateVerdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): Promise<ChallengeDocument> {
  const result = await llmCall("VERDICT_CHALLENGER", {
    claimVerdicts: advocateVerdicts.map((v) => ({
      claimId: v.claimId,
      truthPercentage: v.truthPercentage,
      confidence: v.confidence,
      reasoning: v.reasoning,
      supportingEvidenceIds: v.supportingEvidenceIds,
      contradictingEvidenceIds: v.contradictingEvidenceIds,
      boundaryFindings: v.boundaryFindings,
    })),
    evidenceItems: evidence,
    claimBoundaries: boundaries,
  }, { tier: config.debateModelTiers.challenger, providerOverride: config.debateModelProviders.challenger });

  return parseChallengeDocument(result);
}

// ============================================================================
// STEP 4: RECONCILIATION (§8.4 Step 4)
// ============================================================================

/**
 * Step 4: Produce final verdicts incorporating challenges and consistency data.
 * Single Sonnet call.
 *
 * @returns Final CBClaimVerdicts with revised truth%, confidence, and challenge responses
 */
export interface ReconcileVerdictsResult {
  verdicts: CBClaimVerdict[];
  validatedChallengeDoc: ChallengeDocument;
}

export async function reconcileVerdicts(
  advocateVerdicts: CBClaimVerdict[],
  challengeDoc: ChallengeDocument,
  consistencyResults: ConsistencyResult[],
  evidence: EvidenceItem[],
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): Promise<ReconcileVerdictsResult> {
  // Validate challenge evidence IDs before reconciliation
  const validatedChallengeDoc = validateChallengeEvidence(challengeDoc, evidence);

  const result = await llmCall("VERDICT_RECONCILIATION", {
    advocateVerdicts: advocateVerdicts.map((v) => ({
      claimId: v.claimId,
      truthPercentage: v.truthPercentage,
      confidence: v.confidence,
      reasoning: v.reasoning,
      supportingEvidenceIds: v.supportingEvidenceIds,
      contradictingEvidenceIds: v.contradictingEvidenceIds,
      boundaryFindings: v.boundaryFindings,
    })),
    challenges: validatedChallengeDoc.challenges,
    consistencyResults,
  }, { tier: config.debateModelTiers.reconciler, providerOverride: config.debateModelProviders.reconciler });

  const rawReconciled = result as Array<Record<string, unknown>>;

  const verdicts = advocateVerdicts.map((original) => {
    const reconciled = rawReconciled.find((r) => String(r.claimId) === original.claimId);
    if (!reconciled) return original;

    const truthPercentage = clampPercentage(Number(reconciled.truthPercentage ?? original.truthPercentage));
    const confidence = clampPercentage(Number(reconciled.confidence ?? original.confidence));
    const consistency = consistencyResults.find((c) => c.claimId === original.claimId);

    return {
      ...original,
      truthPercentage,
      verdict: percentageToClaimVerdict(truthPercentage, confidence, undefined, config.mixedConfidenceThreshold),
      confidence,
      reasoning: String(reconciled.reasoning ?? original.reasoning),
      isContested: Boolean(reconciled.isContested ?? original.isContested),
      consistencyResult: consistency ?? original.consistencyResult,
      challengeResponses: parseChallengeResponses(reconciled.challengeResponses),
    };
  });

  return { verdicts, validatedChallengeDoc };
}

// ============================================================================
// STEP 5: VERDICT VALIDATION (§8.4 Step 5)
// ============================================================================

/**
 * Validation result for a single verdict.
 */
export interface VerdictValidation {
  claimId: string;
  groundingValid: boolean;
  directionValid: boolean;
  issues: string[];
}

/**
 * Step 5: Validate verdicts with two lightweight Haiku checks.
 * Check A (grounding): Do evidence IDs exist?
 * Check B (direction): Does truth% align with evidence direction?
 *
 * @returns Verdicts (unchanged if valid; issues logged as warnings)
 */
export async function validateVerdicts(
  verdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): Promise<CBClaimVerdict[]> {
  const validationTier = config.debateModelTiers.validation;
  const validationProvider = config.debateModelProviders.validation;

  // Check A + B: Grounding and direction validation (parallel — independent checks)
  const [groundingResult, directionResult] = await Promise.all([
    llmCall("VERDICT_GROUNDING_VALIDATION", {
      verdicts: verdicts.map((v) => ({
        claimId: v.claimId,
        reasoning: v.reasoning,
        supportingEvidenceIds: v.supportingEvidenceIds,
        contradictingEvidenceIds: v.contradictingEvidenceIds,
      })),
      evidencePool: evidence.map((e) => ({ id: e.id, statement: e.statement })),
    }, { tier: validationTier, providerOverride: validationProvider }),
    llmCall("VERDICT_DIRECTION_VALIDATION", {
      verdicts: verdicts.map((v) => ({
        claimId: v.claimId,
        truthPercentage: v.truthPercentage,
        supportingEvidenceIds: v.supportingEvidenceIds,
        contradictingEvidenceIds: v.contradictingEvidenceIds,
      })),
      evidencePool: evidence.map((e) => ({
        id: e.id,
        statement: e.statement,
        claimDirection: e.claimDirection,
      })),
    }, { tier: validationTier, providerOverride: validationProvider }),
  ]);

  // Parse validation results and log issues (non-blocking per §8.4)
  const groundingResults = groundingResult as Array<Record<string, unknown>> ?? [];
  const directionResults = directionResult as Array<Record<string, unknown>> ?? [];

  for (const gr of groundingResults) {
    if (gr.groundingValid === false) {
      console.warn(`[VerdictStage] Grounding issue for claim ${gr.claimId}:`, gr.issues);
    }
  }

  for (const dr of directionResults) {
    if (dr.directionValid === false) {
      console.warn(`[VerdictStage] Direction issue for claim ${dr.claimId}:`, dr.issues);
    }
  }

  // Verdicts are returned unchanged — validation is advisory
  return verdicts;
}

// ============================================================================
// STRUCTURAL CONSISTENCY CHECK (§8.4, deterministic)
// ============================================================================

/**
 * Structural consistency check — deterministic invariant validation.
 * Runs after LLM validation. Logs warnings but does NOT block the pipeline.
 *
 * Checks (structural invariants only, per AGENTS.md — no semantic interpretation):
 * - All evidence IDs in verdicts exist in evidence pool
 * - All boundary IDs in boundaryFindings are valid
 * - Truth percentage within 0–100
 * - Verdict label matches truth percentage band
 * - Coverage matrix completeness (every claim has ≥1 evidence or flagged)
 *
 * @returns Array of warning messages (empty = all checks pass)
 */
export function runStructuralConsistencyCheck(
  verdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): string[] {
  const warnings: string[] = [];
  const evidenceIds = new Set(evidence.map((e) => e.id));
  const boundaryIds = new Set(boundaries.map((b) => b.id));

  for (const verdict of verdicts) {
    // Check: All referenced evidence IDs exist
    for (const eid of verdict.supportingEvidenceIds) {
      if (!evidenceIds.has(eid)) {
        warnings.push(`Verdict ${verdict.claimId}: supporting evidence ID "${eid}" not in evidence pool`);
      }
    }
    for (const eid of verdict.contradictingEvidenceIds) {
      if (!evidenceIds.has(eid)) {
        warnings.push(`Verdict ${verdict.claimId}: contradicting evidence ID "${eid}" not in evidence pool`);
      }
    }

    // Check: All boundary IDs in boundaryFindings are valid
    for (const finding of verdict.boundaryFindings) {
      if (!boundaryIds.has(finding.boundaryId)) {
        warnings.push(`Verdict ${verdict.claimId}: boundary ID "${finding.boundaryId}" not in boundaries`);
      }
    }

    // Check: Truth percentage within 0–100
    if (verdict.truthPercentage < 0 || verdict.truthPercentage > 100) {
      warnings.push(`Verdict ${verdict.claimId}: truthPercentage ${verdict.truthPercentage} out of range [0, 100]`);
    }

    // Check: Verdict label matches truth percentage band
    const expectedVerdict = percentageToClaimVerdict(verdict.truthPercentage, verdict.confidence, undefined, config.mixedConfidenceThreshold);
    if (verdict.verdict !== expectedVerdict) {
      warnings.push(
        `Verdict ${verdict.claimId}: label "${verdict.verdict}" doesn't match expected "${expectedVerdict}" for truth=${verdict.truthPercentage}%, confidence=${verdict.confidence}%`
      );
    }
  }

  // Check: Coverage matrix completeness
  for (const claimId of coverageMatrix.claims) {
    const claimBoundaries = coverageMatrix.getBoundariesForClaim(claimId);
    if (claimBoundaries.length === 0) {
      const hasVerdict = verdicts.some((v) => v.claimId === claimId);
      if (hasVerdict) {
        warnings.push(`Claim ${claimId}: has verdict but zero evidence items in coverage matrix`);
      }
    }
  }

  return warnings;
}

// ============================================================================
// HIGH-HARM CONFIDENCE FLOOR (C8 — Stammbach/Ash bias mitigation)
// ============================================================================

/**
 * Enforce minimum confidence for high-harm claims.
 *
 * Claims with harmPotential "critical" or "high" that fall below the
 * configured minimum confidence are downgraded to UNVERIFIED. This prevents
 * low-evidence definitive verdicts on potentially harmful topics.
 *
 * Rationale: A claim like "Treatment X cures disease Y" scored at 72%
 * (MOSTLY-TRUE) with only 25% confidence is epistemically dangerous —
 * it gives a definitive-sounding verdict without sufficient evidentiary
 * backing. For high-harm claims, insufficient confidence should yield
 * UNVERIFIED rather than a misleading directional verdict.
 *
 * @param verdicts - Verdicts from the debate pipeline
 * @param config - Verdict stage configuration (highHarmMinConfidence threshold)
 * @returns Verdicts with high-harm low-confidence claims downgraded to UNVERIFIED
 */
export function enforceHarmConfidenceFloor(
  verdicts: CBClaimVerdict[],
  config: VerdictStageConfig,
): CBClaimVerdict[] {
  const threshold = config.highHarmMinConfidence ?? 50;
  if (threshold <= 0) return verdicts; // Disabled

  const floorLevels = config.highHarmFloorLevels ?? ["critical", "high"];

  return verdicts.map((v) => {
    const isHighHarm = (floorLevels as ReadonlyArray<string>).includes(v.harmPotential);
    if (!isHighHarm || v.confidence >= threshold) return v;

    // Already UNVERIFIED — no change needed
    if (v.verdict === "UNVERIFIED") return v;

    console.warn(
      `[VerdictStage] High-harm claim ${v.claimId} (harmPotential=${v.harmPotential}) ` +
      `has confidence ${v.confidence}% < threshold ${threshold}% — downgrading to UNVERIFIED`
    );

    return {
      ...v,
      verdict: "UNVERIFIED" as ClaimVerdict7Point,
    };
  });
}

// ============================================================================
// GATE 4: CONFIDENCE CLASSIFICATION (§8.4)
// ============================================================================

/**
 * Gate 4: Classify each verdict's confidence tier.
 * Returns verdicts unchanged — classification is informational.
 *
 * Tiers: HIGH (≥75), MEDIUM (≥50), LOW (≥25), INSUFFICIENT (<25)
 */
export function classifyConfidence(
  verdicts: CBClaimVerdict[],
): CBClaimVerdict[] {
  // Confidence is already a 0-100 number on each verdict.
  // Gate 4 in the CB pipeline uses the existing confidence value
  // (already adjusted by self-consistency spread in reconciliation).
  // The classification is attached for downstream consumption.
  return verdicts;
}

// ============================================================================
// VERDICT RANGE REPORTING (Stammbach/Ash Action #6)
// ============================================================================

import type { TruthPercentageRange } from "./types";

/**
 * Compute a plausible truth percentage range for a verdict.
 *
 * Base range: min/max of self-consistency percentages.
 * Optional widening: when 2+ boundary findings exist and boundaryVarianceWeight > 0,
 * expand symmetrically by (weight × boundarySpread / 2).
 * Clamp to [0, 100].
 *
 * Returns undefined if consistency was not assessed or range reporting is disabled.
 */
export function computeTruthPercentageRange(
  verdict: CBClaimVerdict,
  rangeConfig?: VerdictStageConfig["rangeReporting"],
): TruthPercentageRange | undefined {
  if (!rangeConfig?.enabled) return undefined;
  if (!verdict.consistencyResult.assessed) return undefined;

  const percentages = verdict.consistencyResult.percentages;
  if (percentages.length === 0) return undefined;

  // Base range from consistency spread
  let min = Math.min(...percentages);
  let max = Math.max(...percentages);

  // Boundary variance widening (method B, weight-controlled)
  const weight = rangeConfig.boundaryVarianceWeight ?? 0;
  if (weight > 0 && verdict.boundaryFindings.length >= 2) {
    const boundaryTruthValues = verdict.boundaryFindings.map((bf) => bf.truthPercentage);
    const boundaryMin = Math.min(...boundaryTruthValues);
    const boundaryMax = Math.max(...boundaryTruthValues);
    const boundarySpread = boundaryMax - boundaryMin;
    const widening = (weight * boundarySpread) / 2;
    min -= widening;
    max += widening;
  }

  // Clamp to [0, 100]
  return {
    min: Math.max(0, Math.round(min * 10) / 10),
    max: Math.min(100, Math.round(max * 10) / 10),
  };
}

// ============================================================================
// SPREAD MULTIPLIER (§8.5.5)
// ============================================================================

/**
 * Calculate the spread multiplier for confidence adjustment based on
 * self-consistency spread. Per §8.5.5:
 *
 * | Spread (max - min) | Multiplier | Band              |
 * |--------------------|-----------|-------------------|
 * | ≤ stableThreshold  | 1.0       | Highly stable     |
 * | ≤ moderateThreshold| 0.9       | Moderately stable |
 * | ≤ unstableThreshold| 0.7       | Unstable          |
 * | > unstableThreshold| 0.4       | Highly unstable   |
 *
 * If selfConsistencyMode = "disabled", returns 1.0.
 *
 * @param spread - max - min across consistency runs
 * @param config - Verdict stage configuration
 * @returns Multiplier (0-1) to apply to confidence
 */
export function getSpreadMultiplier(
  spread: number,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): number {
  if (config.selfConsistencyMode === "disabled") return 1.0;

  if (spread <= config.stableThreshold) return config.spreadMultipliers.highlyStable;
  if (spread <= config.moderateThreshold) return config.spreadMultipliers.moderatelyStable;
  if (spread <= config.unstableThreshold) return config.spreadMultipliers.unstable;
  return config.spreadMultipliers.highlyUnstable;
}

/**
 * Apply spread multiplier to adjust confidence for a single verdict.
 *
 * adjustedConfidence = confidence × spreadMultiplier
 */
export function applySpreadAdjustment(
  confidence: number,
  consistencyResult: ConsistencyResult,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
): number {
  if (!consistencyResult.assessed) return confidence;
  const multiplier = getSpreadMultiplier(consistencyResult.spread, config);
  return Math.round(confidence * multiplier);
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

function parseBoundaryFindings(raw: unknown): BoundaryFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: Record<string, unknown>) => ({
    boundaryId: String(f.boundaryId ?? ""),
    boundaryName: String(f.boundaryName ?? ""),
    truthPercentage: clampPercentage(Number(f.truthPercentage ?? 50)),
    confidence: clampPercentage(Number(f.confidence ?? 50)),
    evidenceDirection: parseEvidenceDirection(f.evidenceDirection),
    evidenceCount: Math.max(0, Math.round(Number(f.evidenceCount ?? 0))),
  }));
}

function parseChallengeDocument(raw: unknown): ChallengeDocument {
  if (!raw || typeof raw !== "object") return { challenges: [] };
  const obj = raw as Record<string, unknown>;
  const challenges = Array.isArray(obj.challenges) ? obj.challenges : [];
  return {
    challenges: challenges.map((c: Record<string, unknown>) => {
      const claimId = String(c.claimId ?? "");
      return {
        claimId,
        challengePoints: Array.isArray(c.challengePoints)
          ? c.challengePoints.map((cp: Record<string, unknown>, idx: number) => ({
              id: String(cp.id ?? `CP_${claimId}_${idx}`),
              type: parseChallengeType(cp.type),
              description: String(cp.description ?? ""),
              evidenceIds: asStringArray(cp.evidenceIds),
              severity: parseSeverity(cp.severity),
            }))
          : [],
      };
    }),
  };
}

function parseChallengeResponses(raw: unknown): ChallengeResponse[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => {
    const result: ChallengeResponse = {
      challengeType: parseChallengeType(r.challengeType),
      response: String(r.response ?? ""),
      verdictAdjusted: Boolean(r.verdictAdjusted ?? false),
    };
    // Explicit provenance: which challenge point IDs drove this adjustment
    if (Array.isArray(r.adjustmentBasedOnChallengeIds)) {
      result.adjustmentBasedOnChallengeIds = r.adjustmentBasedOnChallengeIds.map(String);
    }
    return result;
  });
}

function parseChallengeType(raw: unknown): ChallengeResponse["challengeType"] {
  const valid = ["assumption", "missing_evidence", "methodology_weakness", "independence_concern"];
  return valid.includes(String(raw)) ? String(raw) as ChallengeResponse["challengeType"] : "assumption";
}

function parseSeverity(raw: unknown): "high" | "medium" | "low" {
  const valid = ["high", "medium", "low"];
  return valid.includes(String(raw)) ? String(raw) as "high" | "medium" | "low" : "medium";
}

function parseEvidenceDirection(raw: unknown): BoundaryFinding["evidenceDirection"] {
  const valid = ["supports", "contradicts", "mixed", "neutral"];
  return valid.includes(String(raw)) ? String(raw) as BoundaryFinding["evidenceDirection"] : "neutral";
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String);
}

// ============================================================================
// BASELESS CHALLENGE GUARD (Stammbach/Ash Action #6)
// ============================================================================

/**
 * Validate challenge evidence IDs against the evidence pool.
 * Annotates each ChallengePoint with a `challengeValidation` object.
 * This is a deterministic structural check (ID existence), not semantic analysis.
 *
 * Called BEFORE reconciler sees challenges — enriches prompt input with validation metadata.
 */
export function validateChallengeEvidence(
  challengeDoc: ChallengeDocument,
  evidence: EvidenceItem[],
): ChallengeDocument {
  const evidenceIdSet = new Set(evidence.map((e) => e.id));

  return {
    challenges: challengeDoc.challenges.map((c) => ({
      ...c,
      challengePoints: c.challengePoints.map((cp) => {
        const validIds = cp.evidenceIds.filter((id) => evidenceIdSet.has(id));
        const invalidIds = cp.evidenceIds.filter((id) => !evidenceIdSet.has(id));
        const validation: ChallengeValidation = {
          evidenceIdsValid: invalidIds.length === 0 && cp.evidenceIds.length > 0,
          validIds,
          invalidIds,
        };
        return { ...cp, challengeValidation: validation };
      }),
    })),
  };
}

export interface BaselessEnforcementResult {
  blockedCount: number;
  baselessAdjustmentRate: number;
}

/**
 * Hybrid enforcement: revert verdict adjustments based entirely on baseless challenges.
 *
 * Post-reconciliation check:
 * - If verdictAdjusted=true AND all referenced challenge points have zero valid evidence IDs → REVERT
 * - If verdictAdjusted=true AND provenance missing/ambiguous → REVERT (policy violation)
 * - If mixed (some valid, some baseless) → advisory warning only, no revert
 *
 * Satisfies AGENTS.md: "Evidence-weighted contestation — baseless challenges MUST NOT reduce truth% or confidence."
 */
export function enforceBaselessChallengePolicy(
  reconciledVerdicts: CBClaimVerdict[],
  validatedChallengeDoc: ChallengeDocument,
  advocateVerdicts: CBClaimVerdict[],
  warnings?: AnalysisWarning[],
): CBClaimVerdict[] {
  // Build a flat map of all challenge points by explicit ID for provenance lookup
  const challengePointMap = new Map<string, ChallengePoint>();
  for (const c of validatedChallengeDoc.challenges) {
    for (const cp of c.challengePoints) {
      challengePointMap.set(cp.id, cp);
    }
  }

  let totalAdjustments = 0;
  let baselessCount = 0;

  const enforcedVerdicts = reconciledVerdicts.map((verdict) => {
    const adjustedResponses = verdict.challengeResponses.filter((cr) => cr.verdictAdjusted);
    if (adjustedResponses.length === 0) return verdict;

    totalAdjustments += adjustedResponses.length;

    // Find challenge points for this claim
    const claimChallenges = validatedChallengeDoc.challenges.find(
      (c) => c.claimId === verdict.claimId,
    );
    if (!claimChallenges) return verdict;

    for (const cr of adjustedResponses) {
      // Determine which challenge points drove this adjustment
      const referencedPoints: ChallengePoint[] = [];
      let unresolvedIds: string[] = [];

      if (cr.adjustmentBasedOnChallengeIds && cr.adjustmentBasedOnChallengeIds.length > 0) {
        // Explicit provenance — look up by ID
        for (const cpId of cr.adjustmentBasedOnChallengeIds) {
          const point = challengePointMap.get(cpId);
          if (point) {
            referencedPoints.push(point);
          } else {
            unresolvedIds.push(cpId);
          }
        }
      } else {
        // No provenance — match by challengeType (ambiguous fallback)
        const matchingPoints = claimChallenges.challengePoints.filter(
          (cp) => cp.type === cr.challengeType,
        );
        referencedPoints.push(...matchingPoints);
      }

      const hasProvenance = cr.adjustmentBasedOnChallengeIds && cr.adjustmentBasedOnChallengeIds.length > 0;

      // Finding 1 fix: non-empty provenance IDs that ALL failed to resolve → treat as policy violation
      if (hasProvenance && referencedPoints.length === 0) {
        baselessCount++;
        const advocate = advocateVerdicts.find((a) => a.claimId === verdict.claimId);
        if (advocate) {
          warnings?.push({
            type: "baseless_challenge_blocked",
            severity: "warning",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — all ${unresolvedIds.length} provenance IDs are unresolved (${unresolvedIds.join(", ")}).`,
          });
          return {
            ...verdict,
            truthPercentage: advocate.truthPercentage,
            confidence: advocate.confidence,
            verdict: advocate.verdict,
          };
        }
      }

      // Check if ALL referenced points are baseless (zero valid evidence IDs)
      const allBaseless = referencedPoints.length > 0 && referencedPoints.every(
        (cp) => cp.challengeValidation && cp.challengeValidation.validIds.length === 0,
      );
      const someBaseless = referencedPoints.some(
        (cp) => cp.challengeValidation && cp.challengeValidation.validIds.length === 0,
      );

      if (!hasProvenance && cr.verdictAdjusted) {
        // Missing provenance — policy violation → revert
        baselessCount++;
        const advocate = advocateVerdicts.find((a) => a.claimId === verdict.claimId);
        if (advocate) {
          warnings?.push({
            type: "baseless_challenge_blocked",
            severity: "warning",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — challenge response lacks adjustmentBasedOnChallengeIds provenance (policy violation).`,
          });
          return {
            ...verdict,
            truthPercentage: advocate.truthPercentage,
            confidence: advocate.confidence,
            verdict: advocate.verdict,
          };
        }
      } else if (allBaseless) {
        // All referenced challenges are baseless → BLOCK/REVERT
        baselessCount++;
        const advocate = advocateVerdicts.find((a) => a.claimId === verdict.claimId);
        if (advocate) {
          warnings?.push({
            type: "baseless_challenge_blocked",
            severity: "warning",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — all ${referencedPoints.length} challenge points cite non-existent evidence IDs.`,
          });
          return {
            ...verdict,
            truthPercentage: advocate.truthPercentage,
            confidence: advocate.confidence,
            verdict: advocate.verdict,
          };
        }
      } else if (someBaseless || unresolvedIds.length > 0) {
        // Mixed provenance (or some unresolved IDs alongside valid ones) — advisory warning only
        const detail = unresolvedIds.length > 0
          ? ` (${unresolvedIds.length} unresolved provenance IDs: ${unresolvedIds.join(", ")})`
          : "";
        warnings?.push({
          type: "baseless_challenge_detected",
          severity: "info",
          message: `Claim ${verdict.claimId}: some challenge points cite non-existent evidence IDs (mixed provenance — not reverted).${detail}`,
        });
      }
    }

    return verdict;
  });

  // Surface enforcement metrics as structured warning (Finding 2 fix)
  if (totalAdjustments > 0) {
    const rate = baselessCount / totalAdjustments;
    warnings?.push({
      type: "baseless_challenge_detected",
      severity: baselessCount > 0 ? "warning" : "info",
      message: `Baseless challenge enforcement: ${baselessCount}/${totalAdjustments} adjustments blocked (rate: ${(rate * 100).toFixed(1)}%).`,
      details: { baselessAdjustmentRate: rate, blockedCount: baselessCount, totalAdjustments },
    });
  }

  return enforcedVerdicts;
}

// ============================================================================
// INTERNAL PARSING HELPERS
// ============================================================================

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}
