/**
 * Heuristic Text Analysis Service
 *
 * Implementation of ITextAnalysisService using existing heuristic functions.
 * This serves as:
 * 1. The fallback when LLM calls fail
 * 2. The baseline for A/B testing
 * 3. The reference implementation for expected behavior
 *
 * @module analyzer/text-analysis-heuristic
 * @version 1.0.0
 */

import {
  ITextAnalysisService,
  InputClassificationRequest,
  InputClassificationResult,
  EvidenceQualityRequest,
  EvidenceQualityResult,
  ScopeSimilarityRequest,
  ScopeSimilarityResult,
  VerdictValidationRequest,
  VerdictValidationResult,
  ClaimType,
  Complexity,
  QualityAssessment,
  PhaseBucket,
} from "./text-analysis-types";

import type { EvidenceLexicon, AggregationLexicon } from "../config-schemas";
import { deriveCandidateClaimTexts, normalizeClaimText } from "./claim-decomposition";
import { detectHarmPotential, detectClaimContestation } from "./aggregation";
import { getEvidencePatterns, getAggregationPatterns, matchesAnyPattern } from "./lexicon-utils";

// ============================================================================
// LEXICON PATTERN CONFIGURATION
// ============================================================================

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 * Can be updated via setTextAnalysisLexicon() for testing or config reload
 */
let _evidencePatterns = getEvidencePatterns();
let _aggregationPatterns = getAggregationPatterns();

/**
 * Set lexicons for heuristic text analysis (useful for testing or config reload)
 */
export function setTextAnalysisLexicon(
  aggregationLexicon?: AggregationLexicon,
  evidenceLexicon?: EvidenceLexicon,
): void {
  _aggregationPatterns = getAggregationPatterns(aggregationLexicon);
  _evidencePatterns = getEvidencePatterns(evidenceLexicon);
}

// ============================================================================
// INTERNAL HEURISTIC FUNCTIONS (from orchestrated.ts)
// ============================================================================

/**
 * Detect if text contains comparative language.
 * Matches existing logic from orchestrated.ts:3216-3226
 */
function isComparativeLikeText(text: string): boolean {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (!t.includes(" than ")) return false;
  const before = t.split(" than ")[0] || "";
  const window = before.split(/\s+/).slice(-6).join(" ");
  // Generic comparative cues
  if (matchesAnyPattern(window, _aggregationPatterns.comparativeKeywords)) return true;
  if (matchesAnyPattern(t, _aggregationPatterns.comparativeKeywords)) return true;
  // Common comparative adjective/adverb form near "than"
  if (/\b[a-z]{3,}er\b/.test(window)) return true;
  return false;
}

/**
 * Detect if text contains compound claim indicators.
 * Matches existing logic from orchestrated.ts:3228-3236
 */
function isCompoundLikeText(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  if (matchesAnyPattern(t, _aggregationPatterns.compoundIndicators)) return true;
  // Enumeration cue: multiple numerals or roman numerals
  if (/\b[ivxlcdm]+\b/.test(t) && t.includes(",")) return true;
  return false;
}

/**
 * Infer claim type from text content.
 */
function inferClaimType(text: string): ClaimType {
  const t = (text || "").toLowerCase();

  // Predictive indicators
  if (matchesAnyPattern(t, _aggregationPatterns.predictiveKeywords)) {
    return "predictive";
  }

  // Evaluative indicators (opinion/judgment)
  if (matchesAnyPattern(t, _aggregationPatterns.evaluativeKeywords)) {
    return "evaluative";
  }

  // Default to factual
  return "factual";
}

/**
 * Infer complexity from claim structure.
 */
function inferComplexity(
  text: string,
  isComparative: boolean,
  isCompound: boolean,
  claimCount: number,
): Complexity {
  if (claimCount > 3 || (isComparative && isCompound)) {
    return "complex";
  }
  if (claimCount > 1 || isComparative || isCompound) {
    return "moderate";
  }
  return "simple";
}

/**
 * Calculate text similarity using Jaccard coefficient.
 * Simplified version of calculateTextSimilarity from orchestrated.ts
 */
function calculateTextSimilarity(a: string, b: string): number {
  const normalize = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const wordsA = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const wordsB = new Set(normalize(b).split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Infer phase bucket from scope name/metadata.
 */
function inferPhaseBucket(scopeName: string, metadata?: Record<string, unknown>): PhaseBucket {
  const text = `${scopeName} ${JSON.stringify(metadata || {})}`.toLowerCase();

  // Production indicators
  if (matchesAnyPattern(text, _aggregationPatterns.productionPhaseKeywords)) {
    return "production";
  }

  // Usage indicators
  if (matchesAnyPattern(text, _aggregationPatterns.usagePhaseKeywords)) {
    return "usage";
  }

  return "other";
}

// ============================================================================
// HEURISTIC TEXT ANALYSIS SERVICE
// ============================================================================

/**
 * Heuristic implementation of ITextAnalysisService.
 * Uses existing regex/heuristic functions for all analysis points.
 */
export class HeuristicTextAnalysisService implements ITextAnalysisService {
  /**
   * Call 1: Classify input and decompose into claims
   */
  async classifyInput(request: InputClassificationRequest): Promise<InputClassificationResult> {
    const { inputText } = request;

    const isComparative = isComparativeLikeText(inputText);
    const isCompound = isCompoundLikeText(inputText);

    // Use existing claim decomposition
    const candidateClaims = deriveCandidateClaimTexts(inputText);

    // Infer claim type and complexity
    const claimType = inferClaimType(inputText);
    const complexity = inferComplexity(inputText, isComparative, isCompound, candidateClaims.length);

    // Build decomposed claims with roles
    const decomposedClaims = candidateClaims.map((text, idx) => ({
      text,
      role: idx === 0 ? ("primary" as const) : ("supporting" as const),
      standalone: text.length >= 25,
    }));

    return {
      isComparative,
      isCompound,
      claimType,
      complexity,
      decomposedClaims,
      decompositionReasoning: `Heuristic: Split on newlines/sentences/semicolons, found ${candidateClaims.length} claims`,
    };
  }

  /**
   * Call 2: Assess evidence quality for filtering
   */
  async assessEvidenceQuality(request: EvidenceQualityRequest): Promise<EvidenceQualityResult[]> {
    const { evidenceItems } = request;

    return evidenceItems.map((item) => {
      const issues: string[] = [];
      let quality: QualityAssessment = "medium";

      const statement = item.statement || "";
      const excerpt = item.excerpt || "";

      // Check for vague phrases
      if (matchesAnyPattern(statement, _evidencePatterns.vaguePhrases)) {
        issues.push("vague_attribution");
        quality = "low";
      }

      // Check for missing excerpt
      if (!excerpt || excerpt.length < 20) {
        issues.push("insufficient_excerpt");
        if (quality === "medium") quality = "low";
      }

      // Check for missing URL
      if (!item.sourceUrl) {
        issues.push("missing_source_url");
      }

      // Check for statistics without numbers
      if (item.category === "statistic" && !/\d/.test(statement)) {
        issues.push("statistic_without_numbers");
        quality = "filter";
      }

      // Check for very short statements
      if (statement.length < 25) {
        issues.push("statement_too_short");
        quality = "filter";
      }

      // Upgrade to high if no issues
      if (issues.length === 0 && excerpt.length >= 50 && item.sourceUrl) {
        quality = "high";
      }

      return {
        evidenceId: item.evidenceId,
        qualityAssessment: quality,
        issues,
        reasoning: `Heuristic: ${issues.length} issues found`,
      };
    });
  }

  /**
   * Call 3: Analyze scope similarity for merging
   */
  async analyzeScopeSimilarity(request: ScopeSimilarityRequest): Promise<ScopeSimilarityResult[]> {
    const { scopePairs } = request;

    return scopePairs.map((pair) => {
      const similarity = calculateTextSimilarity(pair.scopeA, pair.scopeB);
      const phaseBucketA = inferPhaseBucket(pair.scopeA, pair.metadataA);
      const phaseBucketB = inferPhaseBucket(pair.scopeB, pair.metadataB);

      // Merge threshold: 0.85
      const shouldMerge = similarity >= 0.85;

      // Prefer more specific (longer) name as canonical
      const canonicalName = shouldMerge
        ? pair.scopeA.length >= pair.scopeB.length
          ? pair.scopeA
          : pair.scopeB
        : null;

      return {
        scopeA: pair.scopeA,
        scopeB: pair.scopeB,
        similarity,
        phaseBucketA,
        phaseBucketB,
        shouldMerge,
        canonicalName,
        reasoning: `Heuristic: Jaccard similarity ${(similarity * 100).toFixed(1)}%`,
      };
    });
  }

  /**
   * Call 4: Validate verdicts for inversion/harm/contestation
   */
  async validateVerdicts(request: VerdictValidationRequest): Promise<VerdictValidationResult[]> {
    const { claimVerdicts, mode } = request;

    return claimVerdicts.map((claim) => {
      // Always assess harm potential
      const harmPotential = detectHarmPotential(claim.claimText);

      // Always assess contestation
      const contestationResult = detectClaimContestation(claim.claimText, claim.reasoning);
      const contestation = {
        isContested: contestationResult.isContested,
        factualBasis: contestationResult.factualBasis,
      };

      // For harm_potential_only mode, skip inversion/counter-claim detection
      if (mode === "harm_potential_only") {
        return {
          claimId: claim.claimId,
          harmPotential,
          contestation,
          reasoning: "Heuristic: harm_potential_only mode",
        };
      }

      // Full mode: detect inversion and counter-claims
      // Simple heuristic: check if reasoning contradicts verdict
      let isInverted = false;
      let suggestedCorrection: number | null = null;

      if (claim.verdictPct !== undefined && claim.reasoning) {
        const reasoning = claim.reasoning.toLowerCase();
        const isHighVerdict = claim.verdictPct >= 70;
        const isLowVerdict = claim.verdictPct <= 30;

        // Check for contradiction
        if (isHighVerdict && matchesAnyPattern(reasoning, _aggregationPatterns.negativeIndicators)) {
          isInverted = true;
          suggestedCorrection = 100 - claim.verdictPct;
        } else if (isLowVerdict && matchesAnyPattern(reasoning, _aggregationPatterns.positiveIndicators)) {
          isInverted = true;
          suggestedCorrection = 100 - claim.verdictPct;
        }
      }

      // NOTE: Counter-claim detection is handled separately in the understand phase
      // with full context. We intentionally do NOT detect counter-claims here
      // to avoid overriding better earlier detection.
      // isCounterClaim and polarity are left undefined.

      return {
        claimId: claim.claimId,
        isInverted,
        suggestedCorrection,
        // isCounterClaim: intentionally omitted - handled in understand phase
        // polarity: intentionally omitted - handled in understand phase
        harmPotential,
        contestation,
        reasoning: `Heuristic: inversion=${isInverted}, harm=${harmPotential}`,
      };
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Default heuristic service instance */
export const heuristicTextAnalysisService = new HeuristicTextAnalysisService();
