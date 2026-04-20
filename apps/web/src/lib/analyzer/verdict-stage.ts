/**
 * ClaimBoundary Pipeline — Verdict Stage Module (§8.4)
 *
 * 5-step LLM debate pattern for generating claim verdicts:
 *   Step 1: Advocate Verdict (standard) — initial verdicts for all claims
 *   Step 2: Self-Consistency Check (standard × 2) — verdict stability measurement
 *   Step 3: Adversarial Challenge (standard) — argue against emerging verdicts
 *   Step 4: Reconciliation (standard) — final verdicts incorporating challenges
 *   Step 5: Verdict Validation (budget × 2) — grounding + direction checks
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

import {
  CONFIDENCE_TIER_MIN,
  INSUFFICIENT_CONFIDENCE_MAX,
  type AnalysisWarning,
  type AtomicClaim,
  type BoundaryFinding,
  type CBClaimVerdict,
  type ChallengeDocument,
  type ChallengePoint,
  type ChallengeResponse,
  type ChallengeValidation,
  type ClaimAssessmentBoundary,
  type ClaimVerdict7Point,
  type ConsistencyResult,
  type CoverageMatrix,
  type EvidenceItem,
  type FetchedSource,
  type LLMProviderType,
  type SourceType,
  type TriangulationScore,
} from "./types";

import { percentageToClaimVerdict } from "./truth-scale";
import type { CalcConfig } from "@/lib/config-schemas";
import { DEFAULT_CALC_CONFIG } from "@/lib/config-schemas";

export type VerdictGroundingPolicy = "disabled" | "safe_downgrade";
export type VerdictDirectionPolicy = "disabled" | "retry_once_then_safe_downgrade";

// ============================================================================
// D5 CONTROL 2: SOURCE TYPE PARTITIONS
// ============================================================================

/**
 * Institutional source types — higher methodological rigor, formal review processes.
 * Routed to advocate + self-consistency roles when partitioning is enabled.
 */
const INSTITUTIONAL_SOURCE_TYPES: ReadonlySet<SourceType> = new Set([
  "peer_reviewed_study",
  "fact_check_report",
  "government_report",
  "legal_document",
  "organization_report",
]);

/**
 * General source types — broader information landscape, journalistic sources.
 * Routed to challenger role when partitioning is enabled.
 */
const GENERAL_SOURCE_TYPES: ReadonlySet<SourceType> = new Set([
  "news_primary",
  "news_secondary",
  "expert_statement",
  "other",
]);

type VerdictPromptEvidenceItem = Pick<
  EvidenceItem,
  | "id"
  | "statement"
  | "category"
  | "claimDirection"
  | "applicability"
  | "sourceId"
  | "sourceUrl"
  | "sourceTitle"
  | "sourceType"
  | "probativeValue"
  | "sourceAuthority"
  | "evidenceBasis"
  | "evidenceScope"
  | "claimBoundaryId"
  | "relevantClaimIds"
  | "fromOppositeClaimSearch"
  | "isDerivative"
  | "derivedFromSourceUrl"
  | "scopeQuality"
>;

/**
 * Build a lean evidence payload for verdict-stage prompts.
 * Keeps fields used by VERDICT_ADVOCATE / VERDICT_CHALLENGER contracts
 * while dropping bulky extraction-only fields (e.g., sourceExcerpt).
 */
function toVerdictPromptEvidenceItems(
  evidence: EvidenceItem[],
): VerdictPromptEvidenceItem[] {
  return evidence.map((item) => ({
    id: item.id,
    statement: item.statement,
    category: item.category,
    claimDirection: item.claimDirection,
    applicability: item.applicability,
    sourceId: item.sourceId,
    sourceUrl: item.sourceUrl,
    sourceTitle: item.sourceTitle,
    sourceType: item.sourceType,
    probativeValue: item.probativeValue,
    sourceAuthority: item.sourceAuthority,
    evidenceBasis: item.evidenceBasis,
    evidenceScope: item.evidenceScope,
    claimBoundaryId: item.claimBoundaryId,
    relevantClaimIds: item.relevantClaimIds,
    fromOppositeClaimSearch: item.fromOppositeClaimSearch,
    isDerivative: item.isDerivative,
    derivedFromSourceUrl: item.derivedFromSourceUrl,
    scopeQuality: item.scopeQuality,
  }));
}

type DirectionValidationEvidencePoolItem = {
  id: string;
  statement: string;
  claimDirection?: EvidenceItem["claimDirection"];
  applicability?: EvidenceItem["applicability"];
};

function toDirectionValidationEvidencePool(
  evidence: EvidenceItem[],
): DirectionValidationEvidencePoolItem[] {
  return evidence.map((item) => ({
    id: item.id,
    statement: item.statement,
    claimDirection: item.claimDirection,
    applicability: item.applicability,
  }));
}

// ============================================================================
// SOURCE PORTFOLIO (Fix 1 — SR-aware verdict reasoning)
// ============================================================================

/**
 * Compact per-source summary for verdict prompt context.
 * Gives the LLM track-record metadata and evidence concentration
 * without repeating SR fields on every evidence item.
 */
export interface SourcePortfolioEntry {
  sourceId: string;
  domain: string;
  sourceUrl: string;
  evidenceCount: number;
  trackRecordScore: number | null;
  trackRecordConfidence: number | null;
}

/**
 * Build a compact source portfolio from evidence items and fetched sources.
 *
 * Groups evidence by sourceUrl, joins with FetchedSource SR data.
 * Sources without SR data get null scores (LLM sees them as "unknown reliability").
 */
export function buildSourcePortfolio(
  evidence: EvidenceItem[],
  sources?: FetchedSource[],
): SourcePortfolioEntry[] {
  // Group evidence items by sourceUrl
  const urlGroups = new Map<string, { count: number; sourceId: string }>();
  for (const item of evidence) {
    const url = item.sourceUrl ?? "";
    const existing = urlGroups.get(url);
    if (existing) {
      existing.count++;
    } else {
      urlGroups.set(url, { count: 1, sourceId: item.sourceId ?? "" });
    }
  }

  // Index sources by URL for O(1) lookup
  const sourceByUrl = new Map<string, FetchedSource>();
  if (sources) {
    for (const s of sources) {
      sourceByUrl.set(s.url, s);
    }
  }

  const portfolio: SourcePortfolioEntry[] = [];
  for (const [url, group] of urlGroups) {
    const src = sourceByUrl.get(url);
    let domain = "";
    try {
      domain = url ? new URL(url).hostname.replace(/^www\./, "") : "";
    } catch { /* invalid URL — leave blank */ }

    portfolio.push({
      sourceId: src?.id ?? group.sourceId,
      domain,
      sourceUrl: url,
      evidenceCount: group.count,
      trackRecordScore: src?.trackRecordScore ?? null,
      trackRecordConfidence: src?.trackRecordConfidence ?? null,
    });
  }

  // Sort: most evidence first (helps LLM spot concentration)
  portfolio.sort((a, b) => b.evidenceCount - a.evidenceCount);
  return portfolio;
}

/**
 * Build claim-local source portfolios.
 *
 * Groups evidence by claim (via `relevantClaimIds`), then builds a
 * per-source portfolio within each claim's evidence subset. This prevents
 * concentration metadata for one claim from bleeding into another.
 *
 * @param evidence - Evidence items (with relevantClaimIds assigned)
 * @param sources - FetchedSources with SR data (optional)
 * @returns Map of claimId → SourcePortfolioEntry[]
 */
export function buildSourcePortfolioByClaim(
  evidence: EvidenceItem[],
  sources?: FetchedSource[],
): Record<string, SourcePortfolioEntry[]> {
  // Group evidence by claim
  const claimEvidence = new Map<string, EvidenceItem[]>();
  for (const item of evidence) {
    const claimIds = item.relevantClaimIds ?? [];
    for (const claimId of claimIds) {
      if (!claimEvidence.has(claimId)) claimEvidence.set(claimId, []);
      claimEvidence.get(claimId)!.push(item);
    }
  }

  const result: Record<string, SourcePortfolioEntry[]> = {};
  for (const [claimId, items] of claimEvidence) {
    result[claimId] = buildSourcePortfolio(items, sources);
  }
  return result;
}

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
  /** Temperature for adversarial challenger (default 0.3, floor 0.1, ceiling 0.7) */
  challengerTemperature: number;
  /** Integrity policy for grounding validation failures. */
  verdictGroundingPolicy: VerdictGroundingPolicy;
  /** Integrity policy for direction validation failures. */
  verdictDirectionPolicy: VerdictDirectionPolicy;

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

  /** Source types routed to advocate role. */
  institutionalSourceTypes?: string[];
  /** Source types routed to challenger role. */
  generalSourceTypes?: string[];

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
   * Per-role LLM configuration for cross-provider debate.
   * Each role specifies a provider (vendor) and strength (capability class).
   *
   * Allows using different model strengths and providers for different debate
   * roles to reduce single-model bias (C1/C16 from Stammbach/Ash political
   * bias analysis). Cross-provider separation follows Climinator's
   * structurally independent advocate pattern.
   *
   * Strength values: "budget" | "standard" | "premium"
   * Provider values: "anthropic" | "openai" | "google" | "mistral"
   * Default: debate roles standard, validation budget; challenger on openai.
   */
  debateRoles: {
    advocate: { provider: LLMProviderType; strength: "budget" | "standard" | "premium" };
    selfConsistency: { provider: LLMProviderType; strength: "budget" | "standard" | "premium" };
    challenger: { provider: LLMProviderType; strength: "budget" | "standard" | "premium" };
    reconciler: { provider: LLMProviderType; strength: "budget" | "standard" | "premium" };
    validation: { provider: LLMProviderType; strength: "budget" | "standard" | "premium" };
  };

  /** Harm levels that trigger the confidence floor. Default: ["critical", "high"]. */
  highHarmFloorLevels: Array<"critical" | "high" | "medium" | "low">;

  /**
   * D5 Control 2: Evidence partitioning — route institutional sources to advocate,
   * general sources to challenger. Reconciler and validator see full pool.
   * Falls back to full pool if either partition has <2 items.
   * Default: true.
   */
  evidencePartitioningEnabled: boolean;

  /** Range reporting configuration (Stammbach/Ash Action #6). */
  rangeReporting?: {
    enabled: boolean;
    /** Range width (pp) above which a contested_verdict_range warning is emitted. */
    wideRangeThreshold: number;
    /** Boundary variance widening weight (0-1). 0.0 = disabled (method A). */
    boundaryVarianceWeight: number;
  };

  /** BCP-47 code for report-authored analytical text (Proposal 2). */
  reportLanguage?: string;
}

/**
 * Default verdict stage configuration.
 */
export const DEFAULT_VERDICT_STAGE_CONFIG: VerdictStageConfig = {
  selfConsistencyMode: "full",
  selfConsistencyTemperature: 0.4,
  challengerTemperature: 0.3,
  verdictGroundingPolicy: "disabled",
  verdictDirectionPolicy: "disabled",
  stableThreshold: 5,
  moderateThreshold: 12,
  unstableThreshold: 20,
  spreadMultipliers: {
    highlyStable: 1.0,
    moderatelyStable: 0.9,
    unstable: 0.7,
    highlyUnstable: 0.4,
  },
  mixedConfidenceThreshold: 45,
  highHarmMinConfidence: 50,
  debateRoles: {
    advocate: { provider: "anthropic", strength: "standard" },
    selfConsistency: { provider: "anthropic", strength: "standard" },
    challenger: { provider: "openai", strength: "standard" },
    reconciler: { provider: "anthropic", strength: "standard" },
    validation: { provider: "anthropic", strength: "budget" },
  },
  highHarmFloorLevels: ["critical", "high"],
  evidencePartitioningEnabled: true,
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
    /** Model strength: budget | standard | premium (also accepts legacy haiku/sonnet/opus). */
    tier?: string;
    temperature?: number;
    /** Override the LLM provider for this call (e.g., "openai" when global is "anthropic"). */
    providerOverride?: LLMProviderType;
    /** Override the specific model name for this call (e.g., "gpt-4.1"). */
    modelOverride?: string;
    /** B-1: Runtime role tracing — identifies which debate role this call serves. */
    callContext?: { debateRole: string; promptKey: string };
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
  onEvent?: (message: string, progress: number) => void,
  calculationConfig?: CalcConfig,
  sources?: FetchedSource[],
  reportLanguage?: string,
): Promise<CBClaimVerdict[]> {
  // D5 Control 2: Evidence partitioning for structural advocate independence
  let advocateEvidence = evidence;
  let challengerEvidence = evidence;

  if (config.evidencePartitioningEnabled) {
    const instTypes = new Set(config.institutionalSourceTypes ?? Array.from(INSTITUTIONAL_SOURCE_TYPES));
    const genTypes = new Set(config.generalSourceTypes ?? Array.from(GENERAL_SOURCE_TYPES));

    const institutional = evidence.filter(e => instTypes.has(e.sourceType as SourceType));
    const general = evidence.filter(e => !e.sourceType || genTypes.has(e.sourceType as SourceType));

    // Fallback: if either partition has <2 items, both roles get full pool
    const partitionActive = institutional.length >= 2 && general.length >= 2;
    if (partitionActive) {
      advocateEvidence = institutional;
      challengerEvidence = general;
    }

    // Emit structured partition stats for quality health monitoring
    warnings?.push({
      type: "evidence_partition_stats",
      severity: "info",
      message: `D5 evidence partitioning ${partitionActive ? "active" : "fallback"}: ` +
        `${institutional.length} institutional, ${general.length} general (of ${evidence.length} total).`,
      details: {
        partitioningActive: partitionActive,
        institutionalCount: institutional.length,
        generalCount: general.length,
        totalEvidence: evidence.length,
      },
    });
  }

  // Fix 1: Build partition-scoped, claim-local source portfolios.
  // Each role sees concentration metadata only for the evidence it actually receives.
  const advocatePortfolio = buildSourcePortfolioByClaim(advocateEvidence, sources);
  const challengerPortfolio = buildSourcePortfolioByClaim(challengerEvidence, sources);
  const fullPortfolio = buildSourcePortfolioByClaim(evidence, sources);

  // Step 1: Advocate Verdict
  onEvent?.(`Verdict debate: advocate — ${claims.length} claims`, -1);
  const advocateVerdicts = await advocateVerdict(
    claims, advocateEvidence, boundaries, coverageMatrix, llmCall, config, advocatePortfolio
  );

  // Steps 2 & 3: Run in parallel
  // Challenger is wrapped in try/catch — malformed LLM output (e.g. OpenAI returning
  // invalid JSON) must not crash the entire analysis. An empty ChallengeDocument means
  // the reconciler proceeds with no challenger input (advocate verdict stands).
  onEvent?.(`Verdict debate: self-consistency check`, -1);
  onEvent?.(`Verdict debate: adversarial challenge`, -1);
  const [consistencyResults, challengeDoc] = await Promise.all([
    selfConsistencyCheck(claims, advocateEvidence, boundaries, coverageMatrix, advocateVerdicts, llmCall, config, warnings, advocatePortfolio),
    adversarialChallenge(advocateVerdicts, challengerEvidence, boundaries, llmCall, config, challengerPortfolio)
      .catch((err): ChallengeDocument => {
        warnings?.push({
          type: "challenger_failure",
          severity: "info",
          message: `Adversarial challenger failed: ${err?.message ?? "unknown error"}. Proceeding without challenger input.`,
          details: { errorName: err?.name, errorMessage: err?.message },
        });
        return { challenges: [] };
      }),
  ]);

  // Step 4: Reconciliation — reconciler sees FULL evidence (needs complete picture)
  onEvent?.(`Verdict debate: reconciliation`, -1);
  const { verdicts: reconciledVerdicts, validatedChallengeDoc } = await reconcileVerdicts(
    advocateVerdicts, challengeDoc, consistencyResults, evidence, llmCall, config, warnings, fullPortfolio,
  );

  // Step 4b: Baseless challenge enforcement (hybrid — revert baseless adjustments)
  const enforcedVerdicts = enforceBaselessChallengePolicy(
    reconciledVerdicts, validatedChallengeDoc, advocateVerdicts, warnings
  );

  // Step 4b-2: Strip phantom evidence IDs (deterministic — Fix 5)
  const cleanedVerdicts = stripPhantomEvidenceIds(enforcedVerdicts, evidence, warnings);

  // Step 4c: Spread adjustment — penalize confidence for unstable verdicts
  // Recompute verdict label after confidence change to prevent stale MIXED
  // when confidence drops below the UNVERIFIED threshold (e.g. 52%/28%).
  const spreadAdjustedVerdicts = cleanedVerdicts.map((v) => {
    const adjustedConfidence = applySpreadAdjustment(v.confidence, v.consistencyResult, config);
    return {
      ...v,
      confidence: adjustedConfidence,
      confidenceTier: confidenceToTier(adjustedConfidence),
      verdict: percentageToClaimVerdict(v.truthPercentage, adjustedConfidence, undefined, config.mixedConfidenceThreshold),
    };
  });

  // Step 5: Verdict Validation
  onEvent?.(`Verdict debate: validation`, -1);
  const validatedVerdicts = await validateVerdicts(
    spreadAdjustedVerdicts,
    evidence,
    llmCall,
    config,
    warnings,
    {
      claims,
      boundaries,
      coverageMatrix,
      calculationConfig,
      sourcePortfolioByClaim: fullPortfolio,
      validatedChallengeDoc,
    },
  );

  // Structural Consistency Check (deterministic)
  const structuralWarnings = runStructuralConsistencyCheck(
    validatedVerdicts, evidence, boundaries, coverageMatrix, config
  );
  if (structuralWarnings.length > 0) {
    console.warn("[VerdictStage] Structural consistency warnings:", structuralWarnings);
    for (const sw of structuralWarnings) {
      warnings?.push({
        type: "structural_consistency",
        severity: "error",
        message: sw,
      });
    }
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
  sourcePortfolioByClaim?: Record<string, SourcePortfolioEntry[]>,
): Promise<CBClaimVerdict[]> {
  const promptEvidenceItems = toVerdictPromptEvidenceItems(evidence);

  const result = await llmCall("VERDICT_ADVOCATE", {
    atomicClaims: claims,
    evidenceItems: promptEvidenceItems,
    claimBoundaries: boundaries,
    coverageMatrix: {
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    },
    ...(sourcePortfolioByClaim && Object.keys(sourcePortfolioByClaim).length > 0 ? { sourcePortfolioByClaim } : {}),
    ...(config.reportLanguage ? { reportLanguage: config.reportLanguage } : {}),
  }, { tier: config.debateRoles.advocate.strength, providerOverride: config.debateRoles.advocate.provider, callContext: { debateRole: "advocate", promptKey: "VERDICT_ADVOCATE" } });

  // Guard against silent null returns from masked LLM errors (W14: three-layer masking chain)
  if (result == null) {
    const err = new Error("Stage 4 VERDICT_ADVOCATE: LLM call returned no result — possible masked AI SDK error");
    err.name = "Stage4NullResultError";
    throw err;
  }

  // Parse LLM result into CBClaimVerdict[].
  // Be tolerant to object-wrapped arrays from LLMs (e.g., { verdicts: [...] }).
  const rawVerdicts = extractRecordArray(result, ["verdicts", "claims", "results", "items"]);
  if (!rawVerdicts) {
    const err = new Error(`Stage 4 VERDICT_ADVOCATE: expected array output but received ${describeJsonShape(result)}`);
    err.name = "Stage4MalformedShapeError";
    throw err;
  }
  const parsed = rawVerdicts.map((raw) => parseAdvocateVerdict(raw, claims, config));

  // Sanitize boundaryFindings: drop entries with boundary IDs that are not valid
  // for this specific claim according to the coverage matrix. This prevents
  // hallucinated ("ghost") boundary IDs from flowing through debate Steps 2-4
  // and into computeTruthPercentageRange() range widening.
  for (const verdict of parsed) {
    const validBoundaryIds = new Set(coverageMatrix.getBoundariesForClaim(verdict.claimId));
    const before = verdict.boundaryFindings.length;
    verdict.boundaryFindings = verdict.boundaryFindings.filter(
      (f) => validBoundaryIds.has(f.boundaryId),
    );
    const dropped = before - verdict.boundaryFindings.length;
    if (dropped > 0) {
      console.debug(
        `[VerdictStage] Sanitized ${dropped} ghost boundary finding(s) from ${verdict.claimId} ` +
        `(valid for claim: [${[...validBoundaryIds].join(", ")}])`,
      );
    }
  }

  return parsed;
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
    // Initial tier from advocate confidence; recomputed in later steps if confidence changes.
    confidenceTier: confidenceToTier(confidence),
    reasoning: String(raw.reasoning ?? ""),
    harmPotential: claim?.harmPotential ?? "medium",
    thesisRelevance: claim?.thesisRelevance,
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
  warnings?: AnalysisWarning[],
  sourcePortfolioByClaim?: Record<string, SourcePortfolioEntry[]>,
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
  const promptEvidenceItems = toVerdictPromptEvidenceItems(evidence);
  const input = {
    atomicClaims: claims,
    evidenceItems: promptEvidenceItems,
    claimBoundaries: boundaries,
    coverageMatrix: {
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    },
    ...(sourcePortfolioByClaim && Object.keys(sourcePortfolioByClaim).length > 0 ? { sourcePortfolioByClaim } : {}),
    ...(config.reportLanguage ? { reportLanguage: config.reportLanguage } : {}),
  };

  const [run2Verdicts, run3Verdicts] = await Promise.all([
    runSelfConsistencyAdvocateOnce("run2", input, llmCall, config, temperature, warnings),
    runSelfConsistencyAdvocateOnce("run3", input, llmCall, config, temperature, warnings),
  ]);

  if (!run2Verdicts || !run3Verdicts) {
    const failedRuns = [!run2Verdicts ? "run2" : null, !run3Verdicts ? "run3" : null].filter(Boolean);
    warnings?.push({
      type: "verdict_partial_recovery",
      severity: "warning",
      message: `Self-consistency degraded: ${failedRuns.join(", ")} unavailable; using advocate-only fallback for affected runs.`,
      details: {
        stage: "self_consistency",
        failedRuns,
      },
    });
    console.warn(
      `[VerdictStage] Self-consistency degraded: ${failedRuns.join(", ")} unavailable. ` +
      "Using advocate-only fallback for affected runs.",
    );
  }

  return claims.map((claim) => {
    const v1 = advocateVerdicts.find((v) => v.claimId === claim.id)?.truthPercentage ?? 50;

    // Collect valid run values; null runs contribute nothing.
    // Claims missing from a valid run are also excluded (no fallback to 50).
    const percentages: number[] = [v1];
    if (run2Verdicts) {
      const found = run2Verdicts.find((v) => String(v.claimId) === claim.id);
      if (found && found.truthPercentage != null) percentages.push(Number(found.truthPercentage));
    }
    if (run3Verdicts) {
      const found = run3Verdicts.find((v) => String(v.claimId) === claim.id);
      if (found && found.truthPercentage != null) percentages.push(Number(found.truthPercentage));
    }

    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const rawSpread = Math.max(...percentages) - Math.min(...percentages);

    // A single data point cannot assess stability — apply a minimum spread floor
    // so degraded runs don't produce artificially high confidence.
    const validRunCount = percentages.length;
    const spread = validRunCount < 2 ? Math.max(rawSpread, 15) : rawSpread;

    return {
      claimId: claim.id,
      percentages,
      average,
      spread,
      stable: validRunCount >= 2 && spread <= config.stableThreshold,
      assessed: true,
    };
  });
}

async function runSelfConsistencyAdvocateOnce(
  runName: "run2" | "run3",
  input: {
    atomicClaims: AtomicClaim[];
    evidenceItems: VerdictPromptEvidenceItem[];
    claimBoundaries: ClaimAssessmentBoundary[];
    coverageMatrix: {
      claims: string[];
      boundaries: string[];
      counts: number[][];
    };
  },
  llmCall: LLMCallFn,
  config: VerdictStageConfig,
  temperature: number,
  warnings?: AnalysisWarning[],
): Promise<Array<Record<string, unknown>> | null> {
  const options = {
    tier: config.debateRoles.selfConsistency.strength,
    temperature,
    providerOverride: config.debateRoles.selfConsistency.provider,
    callContext: { debateRole: "selfConsistency" as const, promptKey: "VERDICT_ADVOCATE" as const },
  };

  let lastErrorMessage = "unknown error";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await llmCall("VERDICT_ADVOCATE", input, options);
      const parsed = extractRecordArray(raw, ["verdicts", "claims", "results", "items"]);
      if (!parsed) {
        throw new Error(`unexpected shape ${describeJsonShape(raw)}`);
      }

      if (attempt === 2) {
        warnings?.push({
          type: "verdict_batch_retry",
          severity: "warning",
          message: `Self-consistency ${runName} recovered on retry after initial failure.`,
          details: {
            stage: "self_consistency",
            run: runName,
          },
        });
      }

      return parsed;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      if (attempt === 1) continue;
    }
  }

  warnings?.push({
    type: "verdict_fallback_partial",
    severity: "warning",
    message: `Self-consistency ${runName} failed after retry; run excluded from spread calculation.`,
    details: {
      stage: "self_consistency",
      run: runName,
      reason: lastErrorMessage.slice(0, 200),
    },
  });
  return null;
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
  sourcePortfolioByClaim?: Record<string, SourcePortfolioEntry[]>,
): Promise<ChallengeDocument> {
  // Temperature clamped to [0.1, 0.7] — same bounds as selfConsistencyTemperature
  const temperature = Math.max(0.1, Math.min(0.7, config.challengerTemperature));
  const promptEvidenceItems = toVerdictPromptEvidenceItems(evidence);

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
    evidenceItems: promptEvidenceItems,
    claimBoundaries: boundaries,
    ...(sourcePortfolioByClaim && Object.keys(sourcePortfolioByClaim).length > 0 ? { sourcePortfolioByClaim } : {}),
  }, { tier: config.debateRoles.challenger.strength, temperature, providerOverride: config.debateRoles.challenger.provider, callContext: { debateRole: "challenger", promptKey: "VERDICT_CHALLENGER" } });

  // Guard against silent null returns from masked LLM errors (W14: three-layer masking chain)
  if (result == null) {
    const err = new Error("Stage 4 VERDICT_CHALLENGER: LLM call returned no result — possible masked AI SDK error");
    err.name = "Stage4NullResultError";
    throw err;
  }

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
  warnings?: AnalysisWarning[],
  sourcePortfolioByClaim?: Record<string, SourcePortfolioEntry[]>,
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
    ...(sourcePortfolioByClaim && Object.keys(sourcePortfolioByClaim).length > 0 ? { sourcePortfolioByClaim } : {}),
    ...(config.reportLanguage ? { reportLanguage: config.reportLanguage } : {}),
  }, { tier: config.debateRoles.reconciler.strength, providerOverride: config.debateRoles.reconciler.provider, callContext: { debateRole: "reconciler", promptKey: "VERDICT_RECONCILIATION" } });

  // Guard against silent null returns from masked LLM errors (W14: three-layer masking chain)
  if (result == null) {
    const err = new Error("Stage 4 VERDICT_RECONCILIATION: LLM call returned no result — possible masked AI SDK error");
    err.name = "Stage4NullResultError";
    throw err;
  }

  // Tolerate object-wrapped arrays (e.g., { verdicts: [...] }).
  // If shape is invalid, degrade gracefully by preserving advocate verdicts.
  const rawReconciled = extractRecordArray(result, ["verdicts", "reconciledVerdicts", "claims", "results", "items"]);
  if (!rawReconciled) {
    console.warn(
      `[VerdictStage] Reconciliation returned unexpected shape (${describeJsonShape(result)}). ` +
      "Using advocate verdicts unchanged."
    );
    warnings?.push({
      type: "verdict_fallback_partial",
      severity: "warning",
      message: `Reconciliation output malformed; preserved advocate verdicts for ${advocateVerdicts.length} claim(s).`,
      details: {
        stage: "reconciliation",
        claimCount: advocateVerdicts.length,
        shape: describeJsonShape(result),
      },
    });
    return { verdicts: advocateVerdicts, validatedChallengeDoc };
  }

  const missingClaimIds = advocateVerdicts
    .filter((v) => !rawReconciled.some((r) => String(r.claimId) === v.claimId))
    .map((v) => v.claimId);
  if (missingClaimIds.length > 0) {
    warnings?.push({
      type: "verdict_partial_recovery",
      severity: "warning",
      message: `Reconciliation returned ${rawReconciled.length}/${advocateVerdicts.length} claims; preserved advocate verdicts for missing claims.`,
      details: {
        stage: "reconciliation",
        missingClaimIds,
        recoveredClaims: rawReconciled.length,
        expectedClaims: advocateVerdicts.length,
      },
    });
  }

  // Build a set of valid evidence IDs for phantom filtering
  const validEvidenceIds = new Set(evidence.map((e) => e.id));

  const verdicts = advocateVerdicts.map((original) => {
    const reconciled = rawReconciled.find((r) => String(r.claimId) === original.claimId);
    if (!reconciled) return original;

    const truthPercentage = clampPercentage(Number(reconciled.truthPercentage ?? original.truthPercentage));
    const confidence = clampPercentage(Number(reconciled.confidence ?? original.confidence));
    const consistency = consistencyResults.find((c) => c.claimId === original.claimId);

    // B-7: Extract misleadingness fields (output-only, not fed back into debate)
    const misleadingness = parseMisleadingness(reconciled.misleadingness);
    const misleadingnessReason = misleadingness && misleadingness !== "not_misleading"
      ? String(reconciled.misleadingnessReason ?? "")
      : undefined;

    // Citation carriage: use reconciliation's arrays if valid, else fall back to advocate arrays.
    // The reconciliation LLM may shift which evidence supports/contradicts the claim as it
    // incorporates challenger arguments. Without this, stale advocate arrays corrupt downstream
    // grounding and direction validation.
    const reconciledSupporting = parseEvidenceIdArray(reconciled.supportingEvidenceIds, validEvidenceIds);
    const reconciledContradicting = parseEvidenceIdArray(reconciled.contradictingEvidenceIds, validEvidenceIds);
    const supportingEvidenceIds = reconciledSupporting ?? original.supportingEvidenceIds;
    const contradictingEvidenceIds = reconciledContradicting ?? original.contradictingEvidenceIds;

    const mergedVerdict: CBClaimVerdict = {
      ...original,
      truthPercentage,
      verdict: percentageToClaimVerdict(truthPercentage, confidence, undefined, config.mixedConfidenceThreshold),
      confidence,
      confidenceTier: confidenceToTier(confidence),
      reasoning: String(reconciled.reasoning ?? original.reasoning),
      isContested: Boolean(reconciled.isContested ?? original.isContested),
      consistencyResult: consistency ?? original.consistencyResult,
      challengeResponses: parseChallengeResponses(reconciled.challengeResponses),
      supportingEvidenceIds,
      contradictingEvidenceIds,
      ...(misleadingness ? { misleadingness } : {}),
      ...(misleadingnessReason ? { misleadingnessReason } : {}),
    };
    return mergedVerdict;
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

export interface VerdictRepairRequest {
  verdict: CBClaimVerdict;
  directionIssues: string[];
  claim?: AtomicClaim;
  boundaryContext: Array<{ boundaryId: string; boundaryName: string }>;
  evidenceDirectionSummary: { supports: number; contradicts: number; mixed: number; neutral: number };
  evidencePool: DirectionValidationEvidencePoolItem[];
}

type IntrinsicDirectionSummary = {
  weightedSupports: number;
  weightedContradicts: number;
  directSupportingCount: number;
  directContradictingCount: number;
  misbucketedSupportingIds: string[];
  misbucketedContradictingIds: string[];
  nonDirectSupportingIds: string[];
  nonDirectContradictingIds: string[];
};

export interface VerdictValidationRepairContext {
  claims: AtomicClaim[];
  boundaries: ClaimAssessmentBoundary[];
  coverageMatrix: CoverageMatrix;
  calculationConfig?: CalcConfig;
  sourcePortfolioByClaim?: Record<string, SourcePortfolioEntry[]>;
  validatedChallengeDoc?: ChallengeDocument;
  repairExecutor?: (
    request: VerdictRepairRequest,
    llmCall: LLMCallFn,
    config: VerdictStageConfig,
  ) => Promise<CBClaimVerdict | null>;
}

interface GroundingChallengeContextEntry {
  challengeId: string;
  challengeType: ChallengePoint["type"];
  citedEvidenceIds: string[];
  challengeValidation?: ChallengeValidation;
}

/**
 * Validator-local evidence ID aliasing for grounding validation.
 *
 * Problem: Evidence IDs use two formats — short sequential (EV_001) from
 * preliminary extraction and long timestamp-based (EV_1775405xxxxxx) from
 * main research extraction. The grounding validator LLM cannot reliably
 * cross-reference 13-digit numeric IDs, producing false-positive failures
 * on IDs that actually exist in the registry.
 *
 * Solution: Build short stable aliases (EVG_001, EVG_002, ...) scoped to
 * each grounding validation call. Canonical IDs remain untouched in the
 * pipeline — only the validator prompt input/output uses aliases.
 */
interface GroundingAliasMap {
  /** Canonical evidence ID → short validator alias */
  toAlias: Map<string, string>;
  /** Short validator alias → canonical evidence ID */
  toCanonical: Map<string, string>;
}

function buildGroundingAliasMap(evidenceIds: string[]): GroundingAliasMap {
  const toAlias = new Map<string, string>();
  const toCanonical = new Map<string, string>();
  const sorted = [...new Set(evidenceIds)].sort();
  for (let i = 0; i < sorted.length; i++) {
    const alias = `EVG_${String(i + 1).padStart(3, "0")}`;
    toAlias.set(sorted[i], alias);
    toCanonical.set(alias, sorted[i]);
  }
  return { toAlias, toCanonical };
}

function aliasId(id: string, map: GroundingAliasMap): string {
  return map.toAlias.get(id) ?? id;
}

function aliasIds(ids: string[], map: GroundingAliasMap): string[] {
  return ids.map((id) => aliasId(id, map));
}

/**
 * Alias evidence IDs appearing in free-text reasoning.
 *
 * The single-citation-channel contract says reasoning SHOULD NOT contain
 * raw machine IDs, but enforcement isn't yet complete. When reasoning does
 * mention canonical evidence IDs, the grounding validator must be able to
 * match them against the aliased evidence pool and registry. Unknown IDs
 * (hallucinated, not in the alias map) pass through unchanged so the
 * validator can still flag them as genuine grounding failures.
 */
function aliasReasoningText(reasoning: string, map: GroundingAliasMap): string {
  if (map.toAlias.size === 0) return reasoning;
  // Replace longer IDs first to avoid partial matches (e.g., EV_17 matching before EV_1775...)
  const sorted = [...map.toAlias.entries()].sort((a, b) => b[0].length - a[0].length);
  let result = reasoning;
  for (const [canonical, alias] of sorted) {
    if (result.includes(canonical)) {
      result = result.replaceAll(canonical, alias);
    }
  }
  return result;
}

/**
 * Restore canonical evidence IDs in grounding validator issue strings.
 * The validator returns issues referencing alias IDs (EVG_xxx); this
 * replaces them with the original canonical IDs for diagnostic output.
 */
function dealiasGroundingIssues(issues: string[], map: GroundingAliasMap): string[] {
  return issues.map((issue) => {
    let result = issue;
    for (const [alias, canonical] of map.toCanonical) {
      if (result.includes(alias)) {
        result = result.replaceAll(alias, canonical);
      }
    }
    return result;
  });
}

/**
 * Step 5: Validate verdicts with two lightweight Haiku checks.
 * Check A (grounding): Are cited IDs and reasoning grounded in claim-local evidence context?
 * Check B (direction): Does truth% align with evidence direction?
 *
 * @returns Verdicts after applying integrity policies (or unchanged when policies are disabled)
 */
export async function validateVerdicts(
  verdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  llmCall: LLMCallFn,
  config: VerdictStageConfig = DEFAULT_VERDICT_STAGE_CONFIG,
  warnings?: AnalysisWarning[],
  repairContext?: VerdictValidationRepairContext,
): Promise<CBClaimVerdict[]> {
  const validationTier = config.debateRoles.validation.strength;
  const validationProvider = config.debateRoles.validation.provider;

  // Build validator-local alias map: collect all evidence IDs across all claims,
  // then assign short sequential aliases (EVG_001, EVG_002, ...) so the grounding
  // validator LLM doesn't need to compare long timestamp-based IDs.
  const allEvidenceIdsForGrounding: string[] = [];
  for (const v of verdicts) {
    const localEv = getGroundingClaimLocalEvidence(v.claimId, evidence);
    for (const e of localEv) allEvidenceIdsForGrounding.push(e.id);
    for (const id of v.supportingEvidenceIds) allEvidenceIdsForGrounding.push(id);
    for (const id of v.contradictingEvidenceIds) allEvidenceIdsForGrounding.push(id);
    const registry = getCitedEvidenceRegistry(v, evidence);
    for (const r of registry) allEvidenceIdsForGrounding.push(r.id);
    const cc = buildClaimChallengeContext(v.claimId, repairContext?.validatedChallengeDoc);
    for (const c of cc) {
      for (const id of c.citedEvidenceIds) allEvidenceIdsForGrounding.push(id);
      if (c.challengeValidation) {
        for (const id of c.challengeValidation.validIds) allEvidenceIdsForGrounding.push(id);
        for (const id of c.challengeValidation.invalidIds) allEvidenceIdsForGrounding.push(id);
      }
    }
  }
  const groundingAliasMap = buildGroundingAliasMap(allEvidenceIdsForGrounding);

  // Check A + B: Grounding and direction validation (parallel — independent checks)
  const [groundingResults, directionResults] = await Promise.all([
    runValidationCheckWithRetry(
      "grounding",
      "VERDICT_GROUNDING_VALIDATION",
      {
        verdicts: verdicts.map((v) => {
          const localEvidence = getGroundingClaimLocalEvidence(v.claimId, evidence);
          const localSourcePortfolio = getClaimLocalSourcePortfolio(
            v.claimId,
            localEvidence,
            repairContext?.sourcePortfolioByClaim,
          );
          const boundaryIds = getClaimBoundaryIdsForValidation(
            v,
            repairContext?.boundaries,
            repairContext?.coverageMatrix,
          );
          const challengeContext = buildClaimChallengeContext(
            v.claimId,
            repairContext?.validatedChallengeDoc,
          );

          return {
            claimId: v.claimId,
            reasoning: aliasReasoningText(v.reasoning, groundingAliasMap),
            supportingEvidenceIds: aliasIds(v.supportingEvidenceIds, groundingAliasMap),
            contradictingEvidenceIds: aliasIds(v.contradictingEvidenceIds, groundingAliasMap),
            boundaryIds,
            challengeContext: challengeContext.map((c) => ({
              ...c,
              citedEvidenceIds: aliasIds(c.citedEvidenceIds, groundingAliasMap),
              ...(c.challengeValidation ? {
                challengeValidation: {
                  evidenceIdsValid: c.challengeValidation.evidenceIdsValid,
                  validIds: aliasIds(c.challengeValidation.validIds, groundingAliasMap),
                  invalidIds: aliasIds(c.challengeValidation.invalidIds, groundingAliasMap),
                },
              } : {}),
            })),
            evidencePool: localEvidence.map((e) => ({
              id: aliasId(e.id, groundingAliasMap),
              statement: e.statement,
              sourceId: e.sourceId,
              sourceUrl: e.sourceUrl,
              claimDirection: e.claimDirection,
            })),
            citedEvidenceRegistry: getCitedEvidenceRegistry(v, evidence).map((r) => ({
              ...r,
              id: aliasId(r.id, groundingAliasMap),
            })),
            ...(localSourcePortfolio.length > 0 ? {
              sourcePortfolio: localSourcePortfolio.map((s) => ({
                sourceId: s.sourceId,
                domain: s.domain,
                sourceUrl: s.sourceUrl,
                trackRecordScore: s.trackRecordScore,
                trackRecordConfidence: s.trackRecordConfidence,
                evidenceCount: s.evidenceCount,
              })),
            } : {}),
          };
        }),
      },
      "groundingValid",
      validationTier,
      validationProvider,
      llmCall,
      warnings,
      "grounding_check_degraded",
    ),
    runValidationCheckWithRetry(
      "direction",
      "VERDICT_DIRECTION_VALIDATION",
      {
        verdicts: verdicts.map((v) => {
          const localEvidence = getClaimLocalEvidence(v.claimId, v, evidence);
          return {
            claimId: v.claimId,
            truthPercentage: v.truthPercentage,
            supportingEvidenceIds: v.supportingEvidenceIds,
            contradictingEvidenceIds: v.contradictingEvidenceIds,
            evidencePool: toDirectionValidationEvidencePool(localEvidence),
          };
        }),
      },
      "directionValid",
      validationTier,
      validationProvider,
      llmCall,
      warnings,
      "direction_validation_degraded",
    ),
  ]);
  // De-alias grounding results: restore canonical evidence IDs in issue strings
  // so that warnings and safe-downgrade decisions reference real pipeline IDs.
  const groundingByClaim = new Map(groundingResults.map((r) => [
    r.claimId,
    {
      ...r,
      issues: r.issues ? dealiasGroundingIssues(r.issues, groundingAliasMap) : r.issues,
    },
  ]));
  const directionByClaim = new Map(directionResults.map((r) => [r.claimId, r]));

  const validated: CBClaimVerdict[] = [];
  for (const verdict of verdicts) {
    let current = verdict;
    const grounding = groundingByClaim.get(verdict.claimId);
    const direction = directionByClaim.get(verdict.claimId);

    if (grounding && grounding.valid === false) {
      console.warn(`[VerdictStage] Grounding issue for claim ${verdict.claimId}:`, grounding.issues);
      warnings?.push({
        type: "verdict_grounding_issue",
        severity: "info",
        message: `Claim ${verdict.claimId}: grounding check found issues: ${joinIssues(grounding.issues)}`,
      });
      if (config.verdictGroundingPolicy === "safe_downgrade") {
        current = safeDowngradeVerdict(
          current,
          "grounding",
          grounding.issues,
          warnings,
          config.mixedConfidenceThreshold,
        );
      }
    }

    const deterministicDirectionIssues = getDeterministicDirectionIssues(
      current,
      evidence,
      repairContext?.calculationConfig,
    );
    const mergedDirectionIssues = Array.from(new Set([
      ...(direction?.valid === false ? direction.issues : []),
      ...deterministicDirectionIssues,
    ]));

    if (mergedDirectionIssues.length > 0) {
      // Deterministic safety net: if the LLM flags a direction issue, check if the
      // truth percentage is actually mathematically plausible given the evidence ratio.
      const isPlausible = isVerdictDirectionPlausible(current, evidence, repairContext?.calculationConfig);

      if (isPlausible) {
        const rescuedByConsistency = current.consistencyResult?.stable === true && current.consistencyResult?.assessed === true;
        const rescueReason = rescuedByConsistency ? "stable_consistency" : "evidence_ratio";
        const rescueDetail = rescuedByConsistency
          ? `stable self-consistency (spread ${current.consistencyResult!.spread}pp)`
          : "evidence ratio";
        console.info(`[VerdictStage] Overriding direction failure for claim ${verdict.claimId} (truth ${current.truthPercentage}%) - determined plausible by ${rescueDetail}.`);
        warnings?.push({
          type: "direction_rescue_plausible",
          severity: "info",
          message: `Claim ${verdict.claimId}: direction issue overridden — ${rescueDetail} (truth ${current.truthPercentage}%).`,
          details: {
            claimId: verdict.claimId,
            truthPercentage: current.truthPercentage,
            rescueReason,
            ...(rescuedByConsistency ? { consistencySpread: current.consistencyResult!.spread } : {}),
          },
        });
      } else {
        console.warn(`[VerdictStage] Direction issue for claim ${verdict.claimId}:`, mergedDirectionIssues);
        warnings?.push({
          type: "verdict_direction_issue",
          severity: "info",
          message: `Claim ${verdict.claimId}: direction check found issues: ${joinIssues(mergedDirectionIssues)}`,
        });

        if (
          config.verdictDirectionPolicy === "retry_once_then_safe_downgrade"
          && current.verdictReason !== "verdict_integrity_failure"
        ) {
          const preRepairVerdict = current;
          const finalizeAcceptedRepair = (candidate: CBClaimVerdict): CBClaimVerdict => {
            if (!repairContext) return candidate;
            return {
              ...candidate,
              boundaryFindings: refreshBoundaryFindingsAfterRepair(
                candidate,
                evidence,
                repairContext.boundaries,
                repairContext.coverageMatrix,
                repairContext.calculationConfig,
              ),
            };
          };
          const acceptGroundedCandidate = async (
            candidate: CBClaimVerdict,
            unavailableMessage?: string,
          ): Promise<{ accepted: CBClaimVerdict | null; grounding: NormalizedValidationEntry }> => {
            const grounding = await validateGroundingOnly(
              candidate,
              evidence,
              llmCall,
              validationTier,
              validationProvider,
              repairContext,
              warnings,
            );
            if (grounding.valid) {
              return { accepted: finalizeAcceptedRepair(candidate), grounding };
            }
            if (grounding.unavailable) {
              if (unavailableMessage) {
                warnings?.push({
                  type: "verdict_grounding_issue",
                  severity: "info",
                  message: unavailableMessage,
                });
              }
              return { accepted: finalizeAcceptedRepair(candidate), grounding };
            }
            return { accepted: null, grounding };
          };
          const emitDirectionRescue = (candidate: CBClaimVerdict, phase: "post_normalization" | "post_repair") => {
            const rescuedByConsistency = candidate.consistencyResult?.stable === true && candidate.consistencyResult?.assessed === true;
            const rescueReason = rescuedByConsistency ? "stable_consistency" : "evidence_ratio";
            const rescueDetail = rescuedByConsistency
              ? `stable self-consistency (spread ${candidate.consistencyResult!.spread}pp)`
              : "evidence ratio";
            warnings?.push({
              type: "direction_rescue_plausible",
              severity: "info",
              message: `Claim ${verdict.claimId}: ${phase === "post_normalization" ? "normalized" : "repaired"} verdict accepted via ${rescueDetail} (truth ${candidate.truthPercentage}%).`,
              details: {
                claimId: verdict.claimId,
                truthPercentage: candidate.truthPercentage,
                rescueReason,
                phase,
                ...(rescuedByConsistency ? { consistencySpread: candidate.consistencyResult!.spread } : {}),
              },
            });
          };

          const repairSeedVerdict = normalizeVerdictCitationDirections(current, evidence);
          const normalizedDirection = await validateDirectionOnly(
            repairSeedVerdict,
            evidence,
            llmCall,
            validationTier,
            validationProvider,
          );
          const normalizedPlausible = normalizedDirection.valid !== false
            || isVerdictDirectionPlausible(repairSeedVerdict, evidence, repairContext?.calculationConfig);

          if (normalizedPlausible) {
            if (normalizedDirection.valid === false) {
              emitDirectionRescue(repairSeedVerdict, "post_normalization");
            }
            const normalizedAccepted = await acceptGroundedCandidate(
              repairSeedVerdict,
              `Claim ${verdict.claimId}: post-normalization grounding check unavailable; accepted structurally normalized citations.`,
            );
            if (normalizedAccepted.accepted) {
              current = normalizedAccepted.accepted;
              validated.push(current);
              continue;
            }
            warnings?.push({
              type: "verdict_grounding_issue",
              severity: "info",
              message: `Claim ${verdict.claimId}: normalized verdict failed grounding check: ${joinIssues(normalizedAccepted.grounding.issues)}`,
            });
          }

          const repaired = await attemptDirectionRepair(
            repairSeedVerdict,
            mergedDirectionIssues,
            evidence,
            llmCall,
            config,
            repairContext,
          );

          if (!repaired) {
            current = safeDowngradeVerdict(
              current,
              "direction",
              mergedDirectionIssues,
              warnings,
              config.mixedConfidenceThreshold,
            );
            validated.push(current);
            continue;
          }

          const normalizedRepaired = normalizeVerdictCitationDirections(repaired, evidence);
          const retryDirection = await validateDirectionOnly(
            normalizedRepaired,
            evidence,
            llmCall,
            validationTier,
            validationProvider,
          );
          const repairedPlausible = retryDirection.valid !== false
            || isVerdictDirectionPlausible(normalizedRepaired, evidence, repairContext?.calculationConfig);

          if (!repairedPlausible) {
            current = safeDowngradeVerdict(
              normalizedRepaired,
              "direction",
              retryDirection.issues,
              warnings,
              config.mixedConfidenceThreshold,
            );
            validated.push(current);
            continue;
          }

          if (retryDirection.valid === false) {
            emitDirectionRescue(normalizedRepaired, "post_repair");
          }

          const repairedAccepted = await acceptGroundedCandidate(normalizedRepaired);
          if (repairedAccepted.accepted) {
            current = repairedAccepted.accepted;
            validated.push(current);
            continue;
          }

          warnings?.push({
            type: "verdict_grounding_issue",
            severity: "info",
            message: `Claim ${verdict.claimId}: repaired verdict failed grounding check: ${joinIssues(repairedAccepted.grounding.issues)}`,
          });
          const fallbackReasoningVerdict: CBClaimVerdict = {
            ...normalizedRepaired,
            reasoning: preRepairVerdict.reasoning,
          };
          const fallbackAccepted = await acceptGroundedCandidate(
            fallbackReasoningVerdict,
            `Claim ${verdict.claimId}: post-repair grounding check unavailable; preserved pre-repair reasoning.`,
          );
          if (fallbackAccepted.accepted) {
            warnings?.push({
              type: "verdict_grounding_issue",
              severity: "info",
              message: `Claim ${verdict.claimId}: repaired reasoning rejected; preserved pre-repair grounded reasoning.`,
            });
            current = fallbackAccepted.accepted;
            validated.push(current);
            continue;
          }

          warnings?.push({
            type: "verdict_grounding_issue",
            severity: "info",
            message: `Claim ${verdict.claimId}: repaired verdict grounding fallback failed: ${joinIssues(fallbackAccepted.grounding.issues)}`,
          });
          current = safeDowngradeVerdict(
            fallbackReasoningVerdict,
            "grounding",
            fallbackAccepted.grounding.issues,
            warnings,
            config.mixedConfidenceThreshold,
          );
        }
      }
    }

    validated.push(current);
  }

  return validated;
}

type NormalizedValidationEntry = {
  claimId: string;
  valid: boolean;
  issues: string[];
  unavailable?: boolean;
};

function normalizeValidationEntries(
  raw: unknown,
  validField: "groundingValid" | "directionValid",
): NormalizedValidationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      claimId: String(item.claimId ?? ""),
      valid: item[validField] !== false,
      issues: Array.isArray(item.issues) ? item.issues.map(String) : [],
    }))
    .filter((item) => item.claimId.length > 0);
}

async function runValidationCheckWithRetry(
  label: "grounding" | "direction",
  promptKey: "VERDICT_GROUNDING_VALIDATION" | "VERDICT_DIRECTION_VALIDATION",
  input: Record<string, unknown>,
  validField: "groundingValid" | "directionValid",
  validationTier: string,
  validationProvider: LLMProviderType | undefined,
  llmCall: LLMCallFn,
  warnings: AnalysisWarning[] | undefined,
  degradedWarningType: "grounding_check_degraded" | "direction_validation_degraded",
): Promise<NormalizedValidationEntry[]> {
  let lastErrorMessage = "unknown error";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await llmCall(
        promptKey,
        input,
        {
          tier: validationTier,
          providerOverride: validationProvider,
          callContext: { debateRole: "validation", promptKey },
        },
      );
      const normalized = normalizeValidationEntries(raw, validField);
      if (normalized.length === 0) {
        throw new Error(`validation returned no entries (${describeJsonShape(raw)})`);
      }

      if (attempt === 2) {
        warnings?.push({
          type: "verdict_batch_retry",
          severity: "warning",
          message: `${label} validation recovered on retry after initial failure.`,
          details: {
            stage: "validation",
            promptKey,
            check: label,
          },
        });
      }

      return normalized;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      if (attempt === 1) continue;
    }
  }

  warnings?.push({
    type: degradedWarningType,
    severity: "warning",
    message: `${label} validation unavailable after retry; continuing without ${label} enforcement.`,
    details: {
      stage: "validation",
      promptKey,
      check: label,
      reason: lastErrorMessage.slice(0, 250),
    },
  });

  return [];
}

async function validateGroundingOnly(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  llmCall: LLMCallFn,
  validationTier: string,
  validationProvider: LLMProviderType | undefined,
  repairContext?: VerdictValidationRepairContext,
  warnings?: AnalysisWarning[],
): Promise<NormalizedValidationEntry> {
  const localEvidence = getGroundingClaimLocalEvidence(verdict.claimId, evidence);
  const citedEvidenceRegistry = getCitedEvidenceRegistry(verdict, evidence);
  const localSourcePortfolio = getClaimLocalSourcePortfolio(
    verdict.claimId,
    localEvidence,
    repairContext?.sourcePortfolioByClaim,
  );
  const boundaryIds = getClaimBoundaryIdsForValidation(
    verdict,
    repairContext?.boundaries,
    repairContext?.coverageMatrix,
  );
  const challengeContext = buildClaimChallengeContext(
    verdict.claimId,
    repairContext?.validatedChallengeDoc,
  );

  const groundingIds: string[] = [
    ...localEvidence.map((item) => item.id),
    ...verdict.supportingEvidenceIds,
    ...verdict.contradictingEvidenceIds,
    ...citedEvidenceRegistry.map((item) => item.id),
  ];
  for (const challenge of challengeContext) {
    groundingIds.push(...challenge.citedEvidenceIds);
    if (challenge.challengeValidation) {
      groundingIds.push(...challenge.challengeValidation.validIds);
      groundingIds.push(...challenge.challengeValidation.invalidIds);
    }
  }

  const groundingAliasMap = buildGroundingAliasMap(groundingIds);
  const normalized = await runValidationCheckWithRetry(
    "grounding",
    "VERDICT_GROUNDING_VALIDATION",
    {
      verdicts: [{
        claimId: verdict.claimId,
        reasoning: aliasReasoningText(verdict.reasoning, groundingAliasMap),
        supportingEvidenceIds: aliasIds(verdict.supportingEvidenceIds, groundingAliasMap),
        contradictingEvidenceIds: aliasIds(verdict.contradictingEvidenceIds, groundingAliasMap),
        boundaryIds,
        challengeContext: challengeContext.map((entry) => ({
          ...entry,
          citedEvidenceIds: aliasIds(entry.citedEvidenceIds, groundingAliasMap),
          ...(entry.challengeValidation ? {
            challengeValidation: {
              evidenceIdsValid: entry.challengeValidation.evidenceIdsValid,
              validIds: aliasIds(entry.challengeValidation.validIds, groundingAliasMap),
              invalidIds: aliasIds(entry.challengeValidation.invalidIds, groundingAliasMap),
            },
          } : {}),
        })),
        evidencePool: localEvidence.map((item) => ({
          id: aliasId(item.id, groundingAliasMap),
          statement: item.statement,
          sourceId: item.sourceId,
          sourceUrl: item.sourceUrl,
          claimDirection: item.claimDirection,
        })),
        citedEvidenceRegistry: citedEvidenceRegistry.map((item) => ({
          ...item,
          id: aliasId(item.id, groundingAliasMap),
        })),
        ...(localSourcePortfolio.length > 0 ? {
          sourcePortfolio: localSourcePortfolio.map((item) => ({
            sourceId: item.sourceId,
            domain: item.domain,
            sourceUrl: item.sourceUrl,
            trackRecordScore: item.trackRecordScore,
            trackRecordConfidence: item.trackRecordConfidence,
            evidenceCount: item.evidenceCount,
          })),
        } : {}),
      }],
    },
    "groundingValid",
    validationTier,
    validationProvider,
    llmCall,
    warnings,
    "grounding_check_degraded",
  );

  if (normalized.length === 0) {
    return {
      claimId: verdict.claimId,
      valid: false,
      issues: ["Grounding validation unavailable after repair"],
      unavailable: true,
    };
  }

  return {
    ...normalized[0],
    issues: dealiasGroundingIssues(normalized[0].issues, groundingAliasMap),
  };
}

function joinIssues(issues: string[]): string {
  return issues.length > 0 ? issues.join("; ") : "unknown";
}

/**
 * Deterministic structural sanity check for verdict direction.
 * Returns false when directional citation arrays contain evidence whose own
 * stored labels make that usage invalid:
 * - polarity mismatch (`supports` cited as contradicting, or vice versa)
 * - explicit non-direct applicability (`contextual` / `foreign_reaction`)
 *
 * This is schema-level validation across existing LLM-assigned fields, not a
 * semantic text interpretation rule.
 */
export function isVerdictDirectionPlausible(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  calcConfig?: CalcConfig,
): boolean {
  const summary = summarizeBucketWeightedEvidenceDirection(verdict, evidence, calcConfig);

  if (
    summary.misbucketedSupportingIds.length > 0
    || summary.misbucketedContradictingIds.length > 0
    || summary.nonDirectSupportingIds.length > 0
    || summary.nonDirectContradictingIds.length > 0
    || (verdict.truthPercentage > 50 && summary.directSupportingCount === 0 && summary.directContradictingCount > 0)
    || (verdict.truthPercentage < 50 && summary.directContradictingCount === 0 && summary.directSupportingCount > 0)
    || (
      verdict.truthPercentage === 50
      && (
        (summary.directSupportingCount === 0 && summary.directContradictingCount > 0)
        || (summary.directContradictingCount === 0 && summary.directSupportingCount > 0)
      )
    )
  ) {
    return false;
  }

  return true;
}

function summarizeBucketWeightedEvidenceDirection(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  calcConfig?: CalcConfig,
): IntrinsicDirectionSummary {
  const evidenceById = new Map(evidence.map((e) => [e.id, e]));
  const weights = calcConfig?.probativeValueWeights ?? DEFAULT_CALC_CONFIG.probativeValueWeights!;
  const supportIds = Array.from(new Set(verdict.supportingEvidenceIds ?? []));
  const contradictIds = Array.from(new Set(verdict.contradictingEvidenceIds ?? []));

  let weightedSupports = 0;
  let weightedContradicts = 0;
  let directSupportingCount = 0;
  let directContradictingCount = 0;
  const misbucketedSupportingIds: string[] = [];
  const misbucketedContradictingIds: string[] = [];
  const nonDirectSupportingIds: string[] = [];
  const nonDirectContradictingIds: string[] = [];

  for (const id of supportIds) {
    const item = evidenceById.get(id);
    const weight = weights[item?.probativeValue ?? "low"] ?? 0.5;
    if (!item?.applicability || item.applicability === "direct") {
      weightedSupports += weight;
      directSupportingCount += 1;
    }
    if (item?.claimDirection === "contradicts") {
      misbucketedSupportingIds.push(id);
    }
    if (item?.applicability && item.applicability !== "direct") {
      nonDirectSupportingIds.push(id);
    }
  }

  for (const id of contradictIds) {
    const item = evidenceById.get(id);
    const weight = weights[item?.probativeValue ?? "low"] ?? 0.5;
    if (!item?.applicability || item.applicability === "direct") {
      weightedContradicts += weight;
      directContradictingCount += 1;
    }
    if (item?.claimDirection === "supports") {
      misbucketedContradictingIds.push(id);
    }
    if (item?.applicability && item.applicability !== "direct") {
      nonDirectContradictingIds.push(id);
    }
  }

  return {
    weightedSupports,
    weightedContradicts,
    directSupportingCount,
    directContradictingCount,
    misbucketedSupportingIds,
    misbucketedContradictingIds,
    nonDirectSupportingIds,
    nonDirectContradictingIds,
  };
}

function getDeterministicDirectionIssues(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  calcConfig?: CalcConfig,
): string[] {
  const summary = summarizeBucketWeightedEvidenceDirection(verdict, evidence, calcConfig);
  const issues: string[] = [];

  if (summary.misbucketedSupportingIds.length > 0) {
    issues.push(
      `Supporting citations are polarity-misaligned: ${summary.misbucketedSupportingIds.length} supportingEvidenceIds point to contradicting evidence in the claim-local pool.`,
    );
  }
  if (summary.misbucketedContradictingIds.length > 0) {
    issues.push(
      `Contradicting citations are polarity-misaligned: ${summary.misbucketedContradictingIds.length} contradictingEvidenceIds point to supporting evidence in the claim-local pool.`,
    );
  }
  if (summary.nonDirectSupportingIds.length > 0) {
    issues.push(
      `Supporting citations include ${summary.nonDirectSupportingIds.length} explicitly non-direct evidence item(s); supportingEvidenceIds may cite only direct evidence.`,
    );
  }
  if (summary.nonDirectContradictingIds.length > 0) {
    issues.push(
      `Contradicting citations include ${summary.nonDirectContradictingIds.length} explicitly non-direct evidence item(s); contradictingEvidenceIds may cite only direct evidence.`,
    );
  }
  if (verdict.truthPercentage > 50 && summary.directSupportingCount === 0 && summary.directContradictingCount > 0) {
    issues.push(
      `Truth percentage ${verdict.truthPercentage}% points above the midpoint, but the direct cited evidence is one-sided toward contradiction (${summary.directContradictingCount} contradicting, 0 supporting).`,
    );
  }
  if (verdict.truthPercentage < 50 && summary.directContradictingCount === 0 && summary.directSupportingCount > 0) {
    issues.push(
      `Truth percentage ${verdict.truthPercentage}% points below the midpoint, but the direct cited evidence is one-sided toward support (${summary.directSupportingCount} supporting, 0 contradicting).`,
    );
  }
  if (
    verdict.truthPercentage === 50
    && summary.directSupportingCount === 0
    && summary.directContradictingCount > 0
  ) {
    issues.push(
      `A 50% midpoint verdict requires mixed direct evidence, but only direct contradicting citations are present (${summary.directContradictingCount} contradicting, 0 supporting).`,
    );
  }
  if (
    verdict.truthPercentage === 50
    && summary.directContradictingCount === 0
    && summary.directSupportingCount > 0
  ) {
    issues.push(
      `A 50% midpoint verdict requires mixed direct evidence, but only direct supporting citations are present (${summary.directSupportingCount} supporting, 0 contradicting).`,
    );
  }

  return issues;
}

function normalizeVerdictCitationDirections(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
): CBClaimVerdict {
  const evidenceById = new Map(evidence.map((e) => [e.id, e]));
  const originalSupporting = new Set(verdict.supportingEvidenceIds);
  const originalContradicting = new Set(verdict.contradictingEvidenceIds);
  const citedIds = Array.from(new Set([
    ...verdict.supportingEvidenceIds,
    ...verdict.contradictingEvidenceIds,
  ]));
  if (citedIds.length === 0) return verdict;

  const supportingEvidenceIds: string[] = [];
  const contradictingEvidenceIds: string[] = [];
  for (const id of citedIds) {
    const item = evidenceById.get(id);
    if (item?.applicability && item.applicability !== "direct") {
      continue;
    }
    const direction = item?.claimDirection;
    if (direction === "supports") supportingEvidenceIds.push(id);
    else if (direction === "contradicts") contradictingEvidenceIds.push(id);
    else if (originalSupporting.has(id)) supportingEvidenceIds.push(id);
    else if (originalContradicting.has(id)) contradictingEvidenceIds.push(id);
  }

  return {
    ...verdict,
    supportingEvidenceIds,
    contradictingEvidenceIds,
  };
}

function safeDowngradeVerdict(
  verdict: CBClaimVerdict,
  reason: "grounding" | "direction",
  issues: string[],
  warnings: AnalysisWarning[] | undefined,
  mixedConfidenceThreshold: number,
): CBClaimVerdict {
  warnings?.push({
    type: "verdict_integrity_failure",
    severity: "error",
    message: `Claim ${verdict.claimId}: ${reason} integrity policy triggered safe downgrade (${joinIssues(issues)}).`,
    details: {
      claimId: verdict.claimId,
      integrityFailureType: reason,
      originalTruthPercentage: verdict.truthPercentage,
      downgradedTruthPercentage: 50,
    },
  });

  const downgradedConfidence = Math.min(verdict.confidence, INSUFFICIENT_CONFIDENCE_MAX);
  return {
    ...verdict,
    truthPercentage: 50,
    verdictReason: "verdict_integrity_failure",
    verdict: percentageToClaimVerdict(50, downgradedConfidence, undefined, mixedConfidenceThreshold),
    confidence: downgradedConfidence,
    confidenceTier: "INSUFFICIENT",
  };
}

// ============================================================================
// CLAIM-LOCAL EVIDENCE SCOPING (prevents cross-claim contamination)
// ============================================================================

/**
 * Build a claim-local evidence subset for direction validation and repair.
 *
 * Priority order:
 * 1. Evidence where `relevantClaimIds` includes the target claim
 * 2. Plus any evidence cited by the verdict (supportingEvidenceIds + contradictingEvidenceIds)
 *    even if `relevantClaimIds` mapping is incomplete
 * 3. Falls back to the full pool ONLY when the claim-local + cited subset is empty
 *
 * This prevents sibling-claim evidence from contaminating direction checks
 * while maintaining fail-open safety when evidence mapping is incomplete.
 */
export function getClaimLocalEvidence(
  claimId: string,
  verdict: CBClaimVerdict,
  allEvidence: EvidenceItem[],
): EvidenceItem[] {
  const citedIds = new Set([
    ...verdict.supportingEvidenceIds,
    ...verdict.contradictingEvidenceIds,
  ]);

  // Collect evidence mapped to this claim via relevantClaimIds
  const claimLocal = allEvidence.filter(
    (e) => e.relevantClaimIds?.includes(claimId),
  );

  // Merge in any cited IDs that weren't already captured (handles incomplete mapping)
  const claimLocalIds = new Set(claimLocal.map((e) => e.id));
  const citedButMissing = allEvidence.filter(
    (e) => citedIds.has(e.id) && !claimLocalIds.has(e.id),
  );

  const localSubset = [...claimLocal, ...citedButMissing];

  // Fallback: if claim-local + cited is completely empty, use full pool
  if (localSubset.length === 0) {
    return allEvidence;
  }

  return localSubset;
}

/**
 * Build a strict claim-local evidence subset for grounding validation.
 *
 * Unlike direction validation, grounding should preserve cross-claim
 * contamination detection. So this helper does NOT auto-merge cited IDs from
 * sibling claims into the local pool. The validator receives those cited IDs
 * separately via `citedEvidenceRegistry`.
 *
 * Fail-open safety remains for legacy/unmapped pools: when the entire evidence
 * set lacks claim mappings, fall back to the broader claim-local helper.
 */
function getGroundingClaimLocalEvidence(
  claimId: string,
  allEvidence: EvidenceItem[],
): EvidenceItem[] {
  const hasAnyClaimMapping = allEvidence.some(
    (e) => Array.isArray(e.relevantClaimIds) && e.relevantClaimIds.length > 0,
  );
  if (!hasAnyClaimMapping) {
    return getClaimLocalEvidence(
      claimId,
      {
        id: `CV_${claimId}`,
        claimId,
        truthPercentage: 50,
        verdict: "MIXED",
        confidence: 50,
        confidenceTier: "INSUFFICIENT",
        reasoning: "",
        harmPotential: "medium",
        isContested: false,
        supportingEvidenceIds: [],
        contradictingEvidenceIds: [],
        boundaryFindings: [],
        consistencyResult: {
          claimId,
          percentages: [],
          average: 0,
          spread: 0,
          stable: true,
          assessed: false,
        },
        challengeResponses: [],
        triangulationScore: {
          boundaryCount: 0,
          supporting: 0,
          contradicting: 0,
          level: "weak",
          factor: 1,
        },
      },
      allEvidence,
    );
  }

  return allEvidence.filter((e) => e.relevantClaimIds?.includes(claimId));
}

function getCitedEvidenceRegistry(
  verdict: CBClaimVerdict,
  allEvidence: EvidenceItem[],
): Array<{
  id: string;
  statement: string;
  sourceId?: string;
  sourceUrl?: string;
  claimDirection?: EvidenceItem["claimDirection"];
}> {
  const citedIds = new Set([
    ...verdict.supportingEvidenceIds,
    ...verdict.contradictingEvidenceIds,
  ]);
  return allEvidence
    .filter((e) => citedIds.has(e.id))
    .map((e) => ({
      id: e.id,
      statement: e.statement,
      sourceId: e.sourceId,
      sourceUrl: e.sourceUrl,
      claimDirection: e.claimDirection,
    }));
}

function getClaimLocalSourcePortfolio(
  claimId: string,
  localEvidence: EvidenceItem[],
  sourcePortfolioByClaim?: Record<string, SourcePortfolioEntry[]>,
): SourcePortfolioEntry[] {
  const scopedPortfolio = sourcePortfolioByClaim?.[claimId];
  if (scopedPortfolio && scopedPortfolio.length > 0) {
    return scopedPortfolio;
  }
  if (localEvidence.length === 0) {
    return [];
  }
  return buildSourcePortfolio(localEvidence);
}

function getClaimBoundaryIdsForValidation(
  verdict: CBClaimVerdict,
  boundaries?: ClaimAssessmentBoundary[],
  coverageMatrix?: CoverageMatrix,
): string[] {
  const fromCoverage = boundaries && coverageMatrix
    ? coverageMatrix.getBoundariesForClaim(verdict.claimId)
    : [];
  const fromVerdict = verdict.boundaryFindings
    .map((finding) => finding.boundaryId)
    .filter((boundaryId) => typeof boundaryId === "string" && boundaryId.length > 0);
  return Array.from(new Set([...(fromCoverage ?? []), ...fromVerdict]));
}

function buildClaimChallengeContext(
  claimId: string,
  challengeDoc?: ChallengeDocument,
): GroundingChallengeContextEntry[] {
  if (!challengeDoc) return [];
  const claimChallenge = challengeDoc.challenges.find((challenge) => challenge.claimId === claimId);
  if (!claimChallenge) return [];
  return claimChallenge.challengePoints.map((challengePoint) => ({
    challengeId: challengePoint.id,
    challengeType: challengePoint.type,
    citedEvidenceIds: challengePoint.evidenceIds,
    ...(challengePoint.challengeValidation ? {
      challengeValidation: {
        evidenceIdsValid: challengePoint.challengeValidation.evidenceIdsValid,
        validIds: challengePoint.challengeValidation.validIds,
        invalidIds: challengePoint.challengeValidation.invalidIds,
      },
    } : {}),
  }));
}

function buildBoundaryContext(
  claimId: string,
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
): Array<{ boundaryId: string; boundaryName: string }> {
  const boundaryIds = coverageMatrix.getBoundariesForClaim(claimId);
  if (boundaryIds.length === 0) return [];
  const byId = new Map(boundaries.map((b) => [b.id, b]));
  return boundaryIds.map((id) => ({
    boundaryId: id,
    boundaryName: byId.get(id)?.name ?? id,
  }));
}

function refreshBoundaryFindingsAfterRepair(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  calcConfig?: CalcConfig,
): BoundaryFinding[] {
  const localEvidence = getClaimLocalEvidence(verdict.claimId, verdict, evidence)
    .filter((item) => !item.applicability || item.applicability === "direct");
  const weights = calcConfig?.probativeValueWeights ?? DEFAULT_CALC_CONFIG.probativeValueWeights!;
  const boundaryById = new Map(boundaries.map((boundary) => [boundary.id, boundary]));

  return coverageMatrix.getBoundariesForClaim(verdict.claimId)
    .map((boundaryId) => {
      const boundaryEvidence = localEvidence.filter((item) => item.claimBoundaryId === boundaryId);
      if (boundaryEvidence.length === 0) return null;

      let weightedSupports = 0;
      let weightedContradicts = 0;
      for (const item of boundaryEvidence) {
        const weight = weights[item.probativeValue ?? "low"] ?? 0.5;
        if (item.claimDirection === "supports") weightedSupports += weight;
        else if (item.claimDirection === "contradicts") weightedContradicts += weight;
      }

      let evidenceDirection: BoundaryFinding["evidenceDirection"] = "neutral";
      if (weightedSupports > weightedContradicts && weightedSupports > 0) evidenceDirection = "supports";
      else if (weightedContradicts > weightedSupports && weightedContradicts > 0) evidenceDirection = "contradicts";
      else if (weightedSupports > 0 && weightedContradicts > 0) evidenceDirection = "mixed";

      return {
        boundaryId,
        boundaryName: boundaryById.get(boundaryId)?.name ?? boundaryId,
        truthPercentage: verdict.truthPercentage,
        confidence: verdict.confidence,
        evidenceDirection,
        evidenceCount: boundaryEvidence.length,
      };
    })
    .filter((finding): finding is BoundaryFinding => Boolean(finding));
}

function deriveDirectionalCitationsFromEvidencePool(
  evidencePool: DirectionValidationEvidencePoolItem[],
): { supportingEvidenceIds: string[]; contradictingEvidenceIds: string[] } | null {
  const supportingEvidenceIds: string[] = [];
  const contradictingEvidenceIds: string[] = [];

  for (const item of evidencePool) {
    if (item.applicability && item.applicability !== "direct") continue;
    if (item.claimDirection === "supports") supportingEvidenceIds.push(item.id);
    if (item.claimDirection === "contradicts") contradictingEvidenceIds.push(item.id);
  }

  if (supportingEvidenceIds.length === 0 && contradictingEvidenceIds.length === 0) {
    return null;
  }

  return {
    supportingEvidenceIds: Array.from(new Set(supportingEvidenceIds)),
    contradictingEvidenceIds: Array.from(new Set(contradictingEvidenceIds)),
  };
}

async function defaultRepairExecutor(
  request: VerdictRepairRequest,
  llmCall: LLMCallFn,
  config: VerdictStageConfig,
): Promise<CBClaimVerdict | null> {
  const validationTier = config.debateRoles.validation.strength;
  const validationProvider = config.debateRoles.validation.provider;
  const repairTemperature = Math.min(config.selfConsistencyTemperature + 0.1, 0.7);
  const repairResult = await llmCall(
    "VERDICT_DIRECTION_REPAIR",
    {
      claimId: request.verdict.claimId,
      claimText: request.claim?.statement ?? "",
      boundaryContext: request.boundaryContext,
      directionIssues: request.directionIssues,
      verdict: {
        claimId: request.verdict.claimId,
        truthPercentage: request.verdict.truthPercentage,
        confidence: request.verdict.confidence,
        reasoning: request.verdict.reasoning,
        supportingEvidenceIds: request.verdict.supportingEvidenceIds,
        contradictingEvidenceIds: request.verdict.contradictingEvidenceIds,
      },
      evidenceDirectionSummary: request.evidenceDirectionSummary,
      evidencePool: request.evidencePool,
    },
    {
      tier: validationTier,
      temperature: repairTemperature,
      providerOverride: validationProvider,
      callContext: { debateRole: "validation", promptKey: "VERDICT_DIRECTION_REPAIR" },
    },
  );

  if (!repairResult || typeof repairResult !== "object") return null;
  const parsed = Array.isArray(repairResult)
    ? (repairResult[0] as Record<string, unknown> | undefined)
    : (repairResult as Record<string, unknown>);
  if (!parsed) return null;

  const repairedClaimId = String(parsed.claimId ?? request.verdict.claimId);
  if (repairedClaimId !== request.verdict.claimId) return null;

  const repairedTruth = clampPercentage(Number(parsed.truthPercentage));
  const repairedReasoning = typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
    ? parsed.reasoning
    : request.verdict.reasoning;
  const validEvidenceIds = new Set(request.evidencePool.map((item) => item.id));
  const repairedSupportingEvidenceIds = parseEvidenceIdArray(parsed.supportingEvidenceIds, validEvidenceIds);
  const repairedContradictingEvidenceIds = parseEvidenceIdArray(parsed.contradictingEvidenceIds, validEvidenceIds);
  const derivedDirectionalCitations = deriveDirectionalCitationsFromEvidencePool(request.evidencePool);
  return {
    ...request.verdict,
    truthPercentage: repairedTruth,
    verdict: percentageToClaimVerdict(
      repairedTruth,
      request.verdict.confidence,
      undefined,
      config.mixedConfidenceThreshold,
    ),
    reasoning: repairedReasoning,
    supportingEvidenceIds: repairedSupportingEvidenceIds
      ?? derivedDirectionalCitations?.supportingEvidenceIds
      ?? request.verdict.supportingEvidenceIds,
    contradictingEvidenceIds: repairedContradictingEvidenceIds
      ?? derivedDirectionalCitations?.contradictingEvidenceIds
      ?? request.verdict.contradictingEvidenceIds,
    boundaryFindings: request.verdict.boundaryFindings,
  };
}

async function attemptDirectionRepair(
  verdict: CBClaimVerdict,
  directionIssues: string[],
  evidence: EvidenceItem[],
  llmCall: LLMCallFn,
  config: VerdictStageConfig,
  repairContext?: VerdictValidationRepairContext,
): Promise<CBClaimVerdict | null> {
  if (!repairContext) return null;

  const claim = repairContext.claims.find((c) => c.id === verdict.claimId);
  const boundaryContext = buildBoundaryContext(
    verdict.claimId,
    repairContext.boundaries,
    repairContext.coverageMatrix,
  );

  // Claim-local evidence scoping: use only evidence relevant to this claim
  const localEvidence = getClaimLocalEvidence(verdict.claimId, verdict, evidence);

  const evidenceById = new Map(localEvidence.map((item) => [item.id, item]));
  const citedIds = new Set([
    ...verdict.supportingEvidenceIds,
    ...verdict.contradictingEvidenceIds,
  ]);
  const summary = { supports: 0, contradicts: 0, mixed: 0, neutral: 0 };
  for (const id of citedIds) {
    const item = evidenceById.get(id);
    if (!item) continue;
    const direction = item.claimDirection ?? "neutral";
    if (direction === "supports") summary.supports += 1;
    else if (direction === "contradicts") summary.contradicts += 1;
    else summary.neutral += 1;
  }

  const request: VerdictRepairRequest = {
    verdict,
    directionIssues,
    claim,
    boundaryContext,
    evidenceDirectionSummary: summary,
    evidencePool: toDirectionValidationEvidencePool(localEvidence),
  };

  const repairExecutor = repairContext.repairExecutor ?? defaultRepairExecutor;
  return repairExecutor(request, llmCall, config);
}

async function validateDirectionOnly(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  llmCall: LLMCallFn,
  validationTier: string,
  validationProvider?: LLMProviderType,
): Promise<NormalizedValidationEntry> {
  // Claim-local evidence scoping: use only evidence relevant to this claim
  const localEvidence = getClaimLocalEvidence(verdict.claimId, verdict, evidence);

  const directionResult = await llmCall(
    "VERDICT_DIRECTION_VALIDATION",
    {
      verdicts: [{
        claimId: verdict.claimId,
        truthPercentage: verdict.truthPercentage,
        supportingEvidenceIds: verdict.supportingEvidenceIds,
        contradictingEvidenceIds: verdict.contradictingEvidenceIds,
        evidencePool: toDirectionValidationEvidencePool(localEvidence),
      }],
    },
    {
      tier: validationTier,
      providerOverride: validationProvider,
      callContext: { debateRole: "validation", promptKey: "VERDICT_DIRECTION_VALIDATION" },
    },
  );

  const normalized = normalizeValidationEntries(directionResult, "directionValid");
  if (normalized.length > 0) return normalized[0];
  return { claimId: verdict.claimId, valid: false, issues: ["Direction validation returned no result"] };
}

// ============================================================================
// STRUCTURAL CONSISTENCY CHECK (§8.4, deterministic)
// ============================================================================

/**
 * Fix 5: Strip phantom evidence IDs from verdict arrays.
 *
 * LLMs occasionally hallucinate evidence IDs that don't exist in the pool.
 * This deterministic filter removes them before the structural consistency check,
 * converting a post-hoc error into a proactive cleanup.
 *
 * When ALL supporting IDs for a verdict are phantom, a warning-level alert is
 * emitted (the verdict now has zero supporting evidence backing).
 */
export function stripPhantomEvidenceIds(
  verdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  warnings?: AnalysisWarning[],
): CBClaimVerdict[] {
  const validIds = new Set(evidence.map((e) => e.id));

  return verdicts.map((v) => {
    const phantomSupporting = v.supportingEvidenceIds.filter((id) => !validIds.has(id));
    const phantomContradicting = v.contradictingEvidenceIds.filter((id) => !validIds.has(id));

    if (phantomSupporting.length === 0 && phantomContradicting.length === 0) {
      return v; // No phantom IDs — no change
    }

    const cleanedSupporting = v.supportingEvidenceIds.filter((id) => validIds.has(id));
    const cleanedContradicting = v.contradictingEvidenceIds.filter((id) => validIds.has(id));
    const allSupportingPhantom = v.supportingEvidenceIds.length > 0 && cleanedSupporting.length === 0;

    if (allSupportingPhantom) {
      warnings?.push({
        type: "phantom_evidence_all_supporting",
        severity: "warning",
        message: `Verdict ${v.claimId}: ALL ${phantomSupporting.length} supporting evidence IDs were phantom (not in evidence pool). Verdict now has zero supporting evidence.`,
        details: { claimId: v.claimId, phantomIds: phantomSupporting },
      });
    } else if (phantomSupporting.length > 0 || phantomContradicting.length > 0) {
      warnings?.push({
        type: "phantom_evidence_stripped",
        severity: "info",
        message: `Verdict ${v.claimId}: stripped ${phantomSupporting.length + phantomContradicting.length} phantom evidence ID(s) not found in evidence pool.`,
        details: {
          claimId: v.claimId,
          strippedSupporting: phantomSupporting,
          strippedContradicting: phantomContradicting,
        },
      });
    }

    return {
      ...v,
      supportingEvidenceIds: cleanedSupporting,
      contradictingEvidenceIds: cleanedContradicting,
    };
  });
}

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
 *
 * Boundaries are hardcoded by design (same rationale as VERDICT_BANDS in truth-scale.ts):
 * they define a fixed structural contract for confidence interpretation across the UI,
 * API responses, and quality gates. Making them tunable would fragment the meaning of
 * confidence tiers across the system. If recalibration is needed, it should be a
 * deliberate code change with synchronized updates to all consumers.
 */
/** Classify a single confidence score into a tier. */
export function confidenceToTier(confidence: number): CBClaimVerdict["confidenceTier"] {
  return confidence >= CONFIDENCE_TIER_MIN.HIGH ? "HIGH"
    : confidence >= CONFIDENCE_TIER_MIN.MEDIUM ? "MEDIUM"
    : confidence >= CONFIDENCE_TIER_MIN.LOW ? "LOW"
    : "INSUFFICIENT";
}

export function classifyConfidence(
  verdicts: CBClaimVerdict[],
): CBClaimVerdict[] {
  // Confidence is already a 0-100 number (adjusted by spread in Step 4c).
  return verdicts.map(v => ({
    ...v,
    confidenceTier: confidenceToTier(v.confidence),
  }));
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

/**
 * Parse an evidence ID array from reconciliation output.
 * Three-state return:
 *   - undefined: field absent or not an array → caller falls back to advocate arrays
 *   - []: field present as empty array → intentionally no citations on this side (accept)
 *   - string[]: field present with valid IDs → use filtered (phantoms removed)
 *             if all IDs were phantom → undefined (fall back to advocate)
 */
function parseEvidenceIdArray(raw: unknown, validIds: Set<string>): string[] | undefined {
  // Field absent or not an array → fall back
  if (raw === undefined || raw === null || !Array.isArray(raw)) return undefined;
  // Intentionally empty array → the reconciler is clearing this side
  if (raw.length === 0) return [];
  // Non-empty array: filter to valid string IDs, then filter phantoms
  const ids = raw.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return undefined; // contained only non-string junk
  const filtered = ids.filter((id) => validIds.has(id));
  // If ALL IDs were phantom, fall back to advocate arrays (LLM hallucinated all IDs)
  if (filtered.length === 0) return undefined;
  return filtered;
}

/** B-7: Parse misleadingness enum from reconciliation output. Returns undefined if not present/invalid. */
function parseMisleadingness(raw: unknown): CBClaimVerdict["misleadingness"] | undefined {
  const valid = ["not_misleading", "potentially_misleading", "highly_misleading"];
  if (raw === undefined || raw === null) return undefined;
  const str = String(raw);
  if (!valid.includes(str)) {
    if (str.length > 0) console.warn(`[VerdictStage] B-7: unexpected misleadingness value "${str}", dropping`);
    return undefined;
  }
  return str as CBClaimVerdict["misleadingness"];
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

function extractRecordArray(
  raw: unknown,
  wrapperKeys: string[],
): Array<Record<string, unknown>> | null {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }

  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  for (const key of wrapperKeys) {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    }
  }

  // Bare single object (not wrapped in array or keyed container) — wrap it
  // only if it looks like a real verdict record, not a truncated partial shape.
  // Require both claimId and truthPercentage so malformed outputs still trigger
  // the existing retry/fallback paths instead of silently defaulting to 50/50.
  if ("claimId" in obj && "truthPercentage" in obj) {
    return [obj];
  }

  return null;
}

function describeJsonShape(raw: unknown): string {
  if (Array.isArray(raw)) return "array";
  if (!raw || typeof raw !== "object") return typeof raw;
  const keys = Object.keys(raw as Record<string, unknown>);
  if (keys.length === 0) return "object(no keys)";
  return `object(keys: ${keys.slice(0, 8).join(", ")})`;
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
  const evidenceById = new Map(evidence.map((e) => [e.id, e]));

  return {
    challenges: challengeDoc.challenges.map((c) => ({
      ...c,
      challengePoints: c.challengePoints.map((cp) => {
        const validIds: string[] = [];
        const invalidIds: string[] = [];
        for (const id of cp.evidenceIds) {
          const item = evidenceById.get(id);
          if (!item) {
            invalidIds.push(id);
            continue;
          }

          // Structural relevance check: when an evidence item is claim-scoped,
          // it must include the challenged claim ID.
          if (
            Array.isArray(item.relevantClaimIds) &&
            item.relevantClaimIds.length > 0 &&
            !item.relevantClaimIds.includes(c.claimId)
          ) {
            invalidIds.push(id);
            continue;
          }

          validIds.push(id);
        }
        const validation: ChallengeValidation = {
          evidenceIdsValid: invalidIds.length === 0 && validIds.length > 0,
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
 * - If mixed (some valid, some baseless/unresolved) → REVERT (cannot isolate baseless influence)
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

  const buildRevertedVerdict = (
    verdict: CBClaimVerdict,
    advocate: CBClaimVerdict,
  ): CBClaimVerdict => ({
    ...verdict,
    // Revert to pre-challenge advocate state: baseless challenge must not alter outcome.
    truthPercentage: advocate.truthPercentage,
    confidence: advocate.confidence,
    verdict: advocate.verdict,
    reasoning: advocate.reasoning,
    isContested: advocate.isContested,
    challengeResponses: verdict.challengeResponses.map((resp) =>
      resp.verdictAdjusted ? { ...resp, verdictAdjusted: false } : resp
    ),
  });

  const enforcedVerdicts = reconciledVerdicts.map((verdict) => {
    const adjustedResponses = verdict.challengeResponses.filter((cr) => cr.verdictAdjusted);
    if (adjustedResponses.length === 0) return verdict;

    totalAdjustments += adjustedResponses.length;

    // Find challenge points for this claim
    const claimChallenges = validatedChallengeDoc.challenges.find(
      (c) => c.claimId === verdict.claimId,
    );
    if (!claimChallenges) {
      baselessCount += adjustedResponses.length;
      const advocate = advocateVerdicts.find((a) => a.claimId === verdict.claimId);
      if (advocate) {
        warnings?.push({
          type: "baseless_challenge_blocked",
          severity: "info",
          message: `Claim ${verdict.claimId}: verdict adjustment reverted — no challenge points were provided for this claim.`,
        });
        return buildRevertedVerdict(verdict, advocate);
      }
      return verdict;
    }

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
            severity: "info",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — all ${unresolvedIds.length} provenance IDs are unresolved (${unresolvedIds.join(", ")}).`,
          });
          return buildRevertedVerdict(verdict, advocate);
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
            severity: "info",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — challenge response lacks adjustmentBasedOnChallengeIds provenance (policy violation).`,
          });
          return buildRevertedVerdict(verdict, advocate);
        }
      } else if (allBaseless) {
        // All referenced challenges are baseless → BLOCK/REVERT
        baselessCount++;
        const advocate = advocateVerdicts.find((a) => a.claimId === verdict.claimId);
        if (advocate) {
          warnings?.push({
            type: "baseless_challenge_blocked",
            severity: "info",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — all ${referencedPoints.length} challenge points cite invalid evidence IDs.`,
          });
          return buildRevertedVerdict(verdict, advocate);
        }
      } else if (someBaseless || unresolvedIds.length > 0) {
        // Mixed provenance (or unresolved IDs alongside valid ones) cannot isolate
        // baseless influence from the final adjustment. Enforce strict policy.
        baselessCount++;
        const detail = unresolvedIds.length > 0
          ? ` (${unresolvedIds.length} unresolved provenance IDs: ${unresolvedIds.join(", ")})`
          : "";
        const advocate = advocateVerdicts.find((a) => a.claimId === verdict.claimId);
        if (advocate) {
          warnings?.push({
            type: "baseless_challenge_blocked",
            severity: "info",
            message: `Claim ${verdict.claimId}: verdict adjustment reverted — mixed provenance includes invalid evidence references.${detail}`,
          });
          return buildRevertedVerdict(verdict, advocate);
        }
      }
    }

    return verdict;
  });

  // Surface enforcement metrics only when something was actually blocked
  if (baselessCount > 0) {
    const rate = baselessCount / totalAdjustments;
    warnings?.push({
      type: "baseless_challenge_detected",
      severity: "info",
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
