/**
 * FactHarbor Analyzer - Type Definitions
 *
 * This module contains all TypeScript types and interfaces used by the analyzer.
 *
 * @module analyzer/types
 */

// ============================================================================
// BRANDED TYPES FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Validates a truth percentage value.
 *
 * This function enforces that truth percentages are:
 * - Finite numbers (not NaN, not Infinity)
 * - Within the valid [0, 100] range
 *
 * If validation fails, throws an error with diagnostic information.
 * This fail-fast approach helps catch calculation bugs during development
 * rather than silently masking them with fallback values.
 *
 * @param value - The number to validate
 * @param context - Optional context string for error messages (e.g., "claim verdict", "SR adjustment")
 * @returns The validated value
 * @throws Error if value is non-finite or out of range
 */
export function assertValidTruthPercentage(
  value: number,
  context?: string
): number {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid truth percentage${context ? ` (${context})` : ""}: ${value} is not finite (NaN or Infinity)`
    );
  }

  if (value < 0 || value > 100) {
    throw new Error(
      `Invalid truth percentage${context ? ` (${context})` : ""}: ${value} is out of valid range [0, 100]`
    );
  }

  return value;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export type InputType = "claim" | "article";
export type ClaimRole = "attribution" | "source" | "timing" | "core" | "unknown";

// ============================================================================
// 7-POINT TRUTH SCALE TYPES
// ============================================================================

/**
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score | Confidence |
 * |----------|---------------|-------|------------|
 * | 86-100%  | True          | +3    |            |
 * | 72-85%   | Mostly True   | +2    |            |
 * | 58-71%   | Leaning True  | +1    |            |
 * | 43-57%   | Mixed         |  0    | >= 60%     |
 * | 43-57%   | Unverified    |  0    | < 60%      |
 * | 29-42%   | Leaning False | -1    |            |
 * | 15-28%   | Mostly False  | -2    |            |
 * | 0-14%    | False         | -3    |            |
 *
 * Note: MIXED vs UNVERIFIED are distinguished by confidence level:
 * - MIXED: 43-57% truth with HIGH confidence (evidence on both sides)
 * - UNVERIFIED: 43-57% truth with LOW confidence (insufficient evidence)
 */
export type ClaimVerdict7Point =
  | "TRUE"          // 86-100%, Score +3
  | "MOSTLY-TRUE"   // 72-85%,  Score +2
  | "LEANING-TRUE"  // 58-71%,  Score +1
  | "MIXED"      // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED"    // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE"  // 15-28%,  Score -2
  | "FALSE";        // 0-14%,   Score -3

export type ArticleVerdict7Point =
  | "TRUE"          // 86-100%, Score +3
  | "MOSTLY-TRUE"   // 72-85%,  Score +2
  | "LEANING-TRUE"  // 58-71%,  Score +1
  | "MIXED"      // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED"    // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE"  // 15-28%,  Score -2
  | "FALSE";        // 0-14%,   Score -3

// ============================================================================
// QUALITY GATE TYPES
// ============================================================================

/**
 * Gate 1: Claim Validation Result
 * Determines if a claim is factual (verifiable) vs opinion/prediction
 */
export interface ClaimValidationResult {
  claimId: string;
  isFactual: boolean;
  opinionScore: number;        // 0-1 (higher = more opinion-like)
  specificityScore: number;    // 0-1 (higher = more specific/concrete)
  futureOriented: boolean;
  claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;
}

/**
 * Gate 4: Verdict Validation Result
 * Determines if verdict has sufficient evidence confidence to publish
 */
export interface VerdictValidationResult {
  verdictId: string;
  evidenceCount: number;
  averageSourceQuality: number;     // 0-1
  evidenceAgreement: number;        // 0-1 (% supporting vs contradicting)
  uncertaintyFactors: number;       // Count of hedging statements
  confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  publishable: boolean;
  failureReasons?: string[];
  validatedAt: Date;
}

/**
 * Gate 1 Statistics: Claim validation results summary
 * Tracks how many claims passed factual validation vs were filtered
 */
export interface Gate1Stats {
  total: number;          // Total claims evaluated
  passed: number;         // Claims that passed validation
  filtered: number;       // Claims filtered out (opinion, prediction, etc.)
  centralKept: number;    // Central claims kept despite failing validation
}

/**
 * Gate 4 Statistics: Verdict confidence distribution
 * Tracks confidence tiers for all generated verdicts
 */
export interface Gate4Stats {
  total: number;          // Total verdicts generated
  publishable: number;    // Verdicts with HIGH or MEDIUM confidence
  highConfidence: number; // HIGH confidence count
  mediumConfidence: number; // MEDIUM confidence count
  lowConfidence: number;  // LOW confidence count
  insufficient: number;   // INSUFFICIENT evidence count
  centralKept: number;    // Central claims kept despite insufficient confidence
}

/**
 * Quality Gates Summary: High-level analysis metrics
 */
export interface QualityGatesSummary {
  totalEvidenceItems: number;
  totalSources: number;
  searchesPerformed: number;
  contradictionSearchPerformed: boolean;
}

/**
 * QualityGates: Aggregate quality gate status for an analysis
 * Used by QualityGatesPanel component for UI display
 */
export interface QualityGates {
  passed: boolean;              // Overall pass/fail status
  gate1Stats?: Gate1Stats;      // Claim validation stats
  gate4Stats?: Gate4Stats;      // Verdict confidence stats
  summary?: QualityGatesSummary; // High-level metrics
}

// ============================================================================
// ANALYSIS CONTEXT & EVIDENCE SCOPE TYPES
// ============================================================================

/**
 * ============================================================================
 * TERMINOLOGY (CRITICAL - read before modifying this file):
 * ============================================================================
 *
 * "AnalysisContext" (top-level bounded analytical frame)
 *   = A bounded analytical frame that should be analyzed separately.
 *   = Stored in `analysisContexts` field.
 *   = Shown in UI as "Contexts".
 *
 * "Background details"
 *   = Broader frame or topic of the input article.
 *   = Stored in `backgroundDetails` field.
 *
 * "EvidenceScope" (per-evidence source scope)
 *   = Methodology/boundaries defined BY a source document.
 *   = Attached to individual evidence items as `evidenceItem.evidenceScope`.
 *   = Different from AnalysisContext! An evidence item's EvidenceScope describes how
 *     the SOURCE computed its data (e.g., a specific methodology/boundary).
 *
 * SUMMARY:
 *   - Top-level split unit = AnalysisContext (stored in `analysisContexts` plural)
 *   - "EvidenceScope" = per-evidence source methodology/boundaries
 *   - "Background details" = broader topic (stored in `backgroundDetails`)
 * ============================================================================
 */

/**
 * AnalysisContext: A bounded analytical frame requiring separate analysis.
 *
 * Formerly called "Proceeding".
 * This is a GENERIC interface that works across ALL domains (legal, scientific, regulatory, etc.)
 * Domain-specific details are stored in the flexible `metadata` object.
 *
 * Examples:
 * - Legal: Different cases (TSE Electoral vs STF Criminal)
 * - Scientific: Different methodologies (WTW vs TTW analysis)
 * - Regulatory: Different jurisdictions (US EPA vs EU REACH)
 * - Temporal: Different time periods (2020 study vs 2024 study)
 * - Geographic: Different regions (California vs Texas laws)
 *
 * Note: Shown in UI as "Contexts".
 * @see EvidenceScope for per-evidence source-defined scope metadata (different concept!)
 */
export interface AnalysisContext {
  id: string;                    // Stable ID (e.g., "CTX_TSE", "CTX_WTW", "CTX_US")
  name: string;                  // Full name (e.g., "Electoral proceeding (TSE)", "WTW Analysis")
  shortName: string;             // Short label (e.g., "TSE Electoral", "WTW")

  // Generic fields (applicable to ALL domains)
  subject: string;               // What's being analyzed
  temporal: string;              // Time period or date
  status: "concluded" | "ongoing" | "pending" | "unknown";
  outcome: string;               // Result/conclusion/finding
  assessedStatement?: string;    // v2.6.39: What is being assessed in this context (Assessment must summarize this)
  typeLabel?: string;            // LLM-provided category label (e.g., "Electoral", "Scientific", "Regulatory", "General")

  // Flexible metadata (domain-specific details stored as key-value)
  metadata: {
    // Legal domain examples:
    institution?: string;        // e.g., "Superior Electoral Court"
    court?: string;              // Legacy field, use institution instead
    jurisdiction?: string;       // e.g., "Federal", "State"
    charges?: string[];          // e.g., ["Electoral fraud", "Coup attempt"]
    decisionMakers?: Array<{ name: string; role: string; }>;

    // Scientific domain examples:
    methodology?: string;        // e.g., "Well-to-Wheel", "ISO 14040"
    boundaries?: string;         // e.g., "Primary energy to vehicle motion"
    geographic?: string;         // e.g., "European Union", "California"
    dataSource?: string;         // e.g., "GREET model 2024"

    // Regulatory domain examples:
    regulatoryBody?: string;     // e.g., "EPA", "European Commission"
    standardApplied?: string;    // e.g., "EU RED II", "California LCFS"

    // Any other domain-specific fields
    [key: string]: any;
  };
}

/**
 * ContextVerdict: The verdict/answer for a single AnalysisContext, enriched into the report.
 * v2.9.1: Added for report assembly enrichment.
 */
export interface ContextVerdict {
  rating: ClaimVerdict7Point;
  truthPercentage: number;
  confidence: number;
  shortAnswer?: string;
  keyFactors?: KeyFactor[];
}

/**
 * EnrichedAnalysisContext: AnalysisContext with verdict and evidence data joined in.
 * v2.9.1: Added so the report contains self-contained context objects
 * with their verdicts, evidence items, and claim verdicts inline.
 */
export interface EnrichedAnalysisContext extends AnalysisContext {
  verdict?: ContextVerdict;
  evidenceItems?: EvidenceItem[];
  claimVerdicts?: ClaimVerdict[];
}

/**
 * EvidenceScope: Per-evidence source methodology metadata defined BY a source document
 *
 * This is DIFFERENT from AnalysisContext! EvidenceScope describes the methodology,
 * boundaries, geography, and timeframe that a SOURCE DOCUMENT used when producing
 * its evidence. It's attached to individual evidence items as `evidenceItem.evidenceScope`.
 *
 * Critical for comparing apples-to-apples:
 * Example: A study saying "Technology A efficiency is 40%" using full-cycle methodology
 * cannot be directly compared to a partial-cycle study (different calculation boundaries).
 *
 * @see AnalysisContext for top-level analysis contexts (different concept!)
 */
export interface EvidenceScope {
  name: string;           // Short label (e.g., "WTW", "TTW", "EU-LCA", "US jurisdiction")
  methodology?: string;   // Standard referenced (e.g., "ISO 14040", "EU RED II")
  boundaries?: string;    // What's included/excluded (e.g., "Primary energy to wheel")
  // Geographic scope OF THE SOURCE'S DATA (not the analysis jurisdiction)
  // Example: A US court case analyzing European law would have geographic="Europe" here
  geographic?: string;    // e.g., "European Union", "California", "Global"
  // Time period OF THE SOURCE'S DATA (not the analysis timeframe)
  // Example: A 2024 study analyzing 2020-2022 data would have temporal="2020-2022" here
  temporal?: string;      // e.g., "2020-2025", "FY2024", "Q1 2023"
  // NEW v2.8 (Phase 2): Source type classification for better reliability calibration
  // This helps the system weight evidence appropriately based on source characteristics
  sourceType?: SourceType;
}

/**
 * Source type classification for evidence provenance
 *
 * Used in EvidenceScope to indicate what kind of source the evidence comes from.
 * This enables better source reliability calibration and evidence weighting.
 *
 * @since v2.8 (Phase 2)
 */
export type SourceType =
  | "peer_reviewed_study"    // Academic research published in peer-reviewed venues
  | "fact_check_report"      // Professional fact-checking organization report
  | "government_report"      // Official government publication or data
  | "legal_document"         // Court decisions, statutes, legal filings
  | "news_primary"           // Original investigative journalism
  | "news_secondary"         // News aggregation, wire services, reprints
  | "expert_statement"       // Statement from recognized expert (not in formal publication)
  | "organization_report"    // NGO, think tank, or organization publication
  | "other";                 // Other sources not fitting above categories

export interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  /**
   * True ONLY when disputed with DOCUMENTED counter-evidence.
   * Tangential reactions/opinions without grounded evidence = NOT contested.
   * Invariant: factualBasis="opinion" implies isContested should be false
   * (opinion-based doubt keeps full weight in aggregation).
   */
  isContested: boolean;
  contestedBy: string;
  contestationReason: string;
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
}

export interface FactorAnalysis {
  positiveFactors: number;
  negativeFactors: number;
  neutralFactors: number;
  contestedNegatives: number;
  verdictExplanation: string;
}

/**
 * The verdict/answer for a single AnalysisContext (top-level bounded analytical frame)
 *
 */
export interface AnalysisContextAnswer {
  contextId: string;      // AnalysisContext ID
  contextName: string;    // AnalysisContext name
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  keyFactors: KeyFactor[];
  factorAnalysis?: FactorAnalysis;
}

// ============================================================================
// SEARCH & RESEARCH TYPES
// ============================================================================

export interface SearchQuery {
  query: string;
  iteration: number;
  focus: string;
  resultsCount: number;
  timestamp: string;
  searchProvider?: string;
  /** Error message if the search provider returned a fatal error (429, quota exhaustion) */
  error?: string;
}

export interface ResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  evidenceItems: EvidenceItem[];
  sources: FetchedSource[];
  contradictionSearchPerformed: boolean;
  contradictionSourcesFound: number;
  searchQueries: SearchQuery[];
  llmCalls: number;
}

export interface ClaimUnderstanding {
  detectedInputType: InputType;
  impliedClaim: string;

  /**
   * AnalysisContexts: Bounded analytical frames detected from input.
   * Each context is analyzed separately.
   *
   * JSON field name "analysisContexts".
   * @see AnalysisContext
   */
  analysisContexts: AnalysisContext[];
  requiresSeparateAnalysis: boolean;

  /**
   * Background details: Broader frame or topic of the input article.
   */
  backgroundDetails: string;

  articleThesis: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    claimRole: ClaimRole;
    dependsOn: string[];
    keyEntities: string[];
    checkWorthiness: "high" | "medium" | "low";
    harmPotential: "high" | "medium" | "low";
    centrality: "high" | "medium" | "low";
    isCentral: boolean;
    contextId: string;
    approximatePosition: string;
    keyFactorId: string; // empty string if not mapped to any factor
  }>;
  distinctEvents: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  legalFrameworks: string[];
  researchQuestions: string[];
  riskTier: "A" | "B" | "C";
  // NEW: KeyFactors discovered during understanding phase
  keyFactors: Array<{
    id: string;
    question: string;
    factor: string;
    category: "procedural" | "evidential" | "methodological" | "factual" | "evaluative";
  }>;
}

export interface ResearchIteration {
  number: number;
  focus: string;
  queries: string[];
  sourcesFound: number;
  evidenceItemsExtracted: number;
}

/**
 * Evidence item extracted from a source.
 *
 * CRITICAL: This is NOT verified evidence. It is unverified material (statement,
 * statistic, quote, etc.) extracted from a source to be evaluated against claims.
 *
 * The name "EvidenceItem" clarifies this semantic distinction:
 * - "Evidence" = material to be evaluated (correct)
 * - "Fact" = verified truth (incorrect for this entity)
 *
 * IMPORTANT:
 * - The system verifies claims; it does not assume extracted items are true.
 *
 * @since v2.8 (Phase 2 of terminology migration)
 */
export interface EvidenceItem {
  id: string;
  /**
   * The extracted statement text.
   * This represents an unverified evidence statement from a source.
   */
  statement: string;
  category:
    | "legal_provision"
    | "evidence"
    | "direct_evidence"
    | "expert_quote"
    | "statistic"
    | "event"
    | "criticism";
  specificity: "high" | "medium";
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  contextId?: string;
  /** True ONLY when the claim is disputed with DOCUMENTED counter-evidence, not ungrounded reactions. */
  isContestedClaim?: boolean;
  claimSource?: string;
  // Claim direction - does this evidence support or contradict the ORIGINAL user claim?
  // "supports" = evidence supports the user's claim being true
  // "contradicts" = evidence contradicts the user's claim (supports the OPPOSITE)
  // "neutral" = background, doesn't directly support or contradict
  claimDirection?: "supports" | "contradicts" | "neutral";
  // True if this evidence item was found from searching for the OPPOSITE claim
  // (e.g., if user claimed "X > Y", this evidence item came from searching "Y > X")
  fromOppositeClaimSearch?: boolean;
  // EvidenceScope: Captures the methodology/boundaries of the source document
  // (e.g., WTW vs TTW, EU vs US standards, different time periods)
  evidenceScope?: EvidenceScope;
  // NEW: Source authority classification (LLM)
  sourceAuthority?: "primary" | "secondary" | "opinion";
  // NEW: Evidence basis classification (LLM)
  evidenceBasis?: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific";
  // NEW v2.8: Probative value - LLM assessment of evidence quality
  // "high" = concrete, specific, well-sourced
  // "medium" = adequate but less specific or weaker sourcing
  // "low" = vague, poorly sourced, or borderline probative
  probativeValue?: "high" | "medium" | "low";
  // NEW v2.8: Extraction confidence - how confident the LLM is in this extraction (0-100)
  extractionConfidence?: number;
}

export interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
  trackRecordConfidence?: number | null; // v2.6.35: LLM confidence in the score
  trackRecordConsensus?: boolean | null; // v2.6.35: Whether multiple models agreed
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string;
}

// ============================================================================
// VERDICT TYPES
// ============================================================================

export interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  // v2.6.31: Centrality level for weighted verdict aggregation (high=3x, medium=2x, low=1x weight)
  centrality?: "high" | "medium" | "low";
  // v2.7.0: Harm potential - high harm claims (death, injury, safety) get extra weight (1.5x)
  harmPotential?: "high" | "medium" | "low";
  // v2.6.31: Thesis relevance - tangential claims are excluded from verdict aggregation
  thesisRelevance?: "direct" | "tangential" | "irrelevant";
  claimRole?: "attribution" | "source" | "timing" | "core";
  dependsOn?: string[];
  dependencyFailed?: boolean;
  failedDependencies?: string[];
  // Verdict truth percentage (0-100 where 100 = completely true)
  verdict: number;
  confidence: number;
  truthPercentage: number;
  evidenceWeight?: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  /**
   * IDs of supporting evidence items.
   * These point into the analysis `evidenceItems[]` array.
   */
  supportingEvidenceIds: string[];
  keyFactorId?: string;
  contextId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
  isPseudoscience?: boolean;
  escalationReason?: string;
  /** True ONLY when disputed with DOCUMENTED counter-evidence. Opinion/doubt without evidence = not contested. */
  isContested?: boolean;
  contestedBy?: string;
  factualBasis?: "established" | "disputed" | "opinion" | "unknown";
  evidenceQuality?: {
    scientificCount: number;
    documentedCount: number;
    anecdotalCount: number;
    theoreticalCount: number;
    pseudoscientificCount: number;
    weightedQuality: number;
    strongestBasis: "scientific" | "documented" | "theoretical" | "anecdotal" | "pseudoscientific";
    diversity: number;
  };
  // v2.6.31: Counter-claim tracking - true if this claim evaluates the OPPOSITE of the user's thesis
  // When aggregating, counter-claim verdicts should be inverted (TRUE 85% → contributes as FALSE 15%)
  isCounterClaim?: boolean;
  // v2.9.1: 7-point rating label derived from truthPercentage + confidence
  rating?: ClaimVerdict7Point;
}

export interface ArticleAnalysis {
  inputType: InputType;

  /**
   * Multi-context indicator and per-context metadata array.
   */
  hasMultipleContexts: boolean; // true when contexts answer different questions
  analysisContexts?: AnalysisContext[];
  verdictSummary?: any; // v2.6.38: Added for orchestrated pipeline verdict summary

  articleThesis: string;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;

  claimsAverageTruthPercentage: number;
  claimsAverageVerdict: number;

  articleTruthPercentage: number;
  articleVerdict: number;
  articleVerdictReason?: string;
  // v2.6.38: Signal for UI to de-emphasize overall average when multiple distinct contexts exist
  // "high" = single context or contexts answer same question (average is meaningful)
  // "low" = multiple distinct contexts answering different questions (average may not be meaningful)
  articleVerdictReliability?: "high" | "low";

  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
  isPseudoscience?: boolean;
  pseudoscienceCategories?: string[];
}

export interface TwoPanelSummary {
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: number;
      truthPercentage: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: number;
    confidence: number; // v2.6.28: Added missing confidence property
    analysisId: string;
  };
}

// ============================================================================
// PSEUDOSCIENCE TYPES
// ============================================================================

export interface PseudoscienceAnalysis {
  isPseudoscience: boolean;
  confidence: number;
  categories: string[];
  matchedPatterns: string[];
  debunkIndicatorsFound: string[];
  recommendation: number | null;
}

// ============================================================================
// RESEARCH DECISION TYPES
// ============================================================================

export interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
  isContradictionSearch?: boolean;
  /**
   * Target context ID for focused research.
   */
  targetContextId?: string;
}

// ============================================================================
// ANALYSIS INPUT/OUTPUT TYPES
// ============================================================================

export type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};

// ============================================================================
// ANALYSIS WARNINGS TYPES (v3.1)
// ============================================================================

/**
 * Severity levels for analysis warnings.
 * - error: Critical issue that may invalidate results
 * - warning: Significant issue that degrades quality
 * - info: Informational note about processing
 */
export type AnalysisWarningSeverity = "error" | "warning" | "info";

/**
 * Types of analysis warnings.
 */
export type AnalysisWarningType =
  | "verdict_direction_mismatch"    // Verdict percentage contradicts evidence direction
  | "report_damaged"                // Final report integrity degraded by critical failures
  | "llm_provider_error"            // LLM provider failed (quota/credits/auth/rate/service)
  | "structured_output_failure"     // LLM structured output failed, using fallback
  | "evidence_filter_degradation"   // LLM evidence filter failed, using heuristics
  | "search_fallback"               // Grounded search failed, using standard search
  | "search_provider_error"         // Search provider returned fatal error (429, quota exhaustion)
  | "budget_exceeded"               // Analysis terminated early due to budget
  | "classification_fallback"       // Classification fields defaulted due to LLM failure
  | "low_evidence_count"            // Insufficient evidence for reliable verdict
  | "context_without_evidence"      // AnalysisContext has claims but no evidence
  | "recency_evidence_gap"          // Time-sensitive claim lacks recent evidence
  | "confidence_calibration"        // Confidence was adjusted by calibration system
  | "low_source_count"              // Thin evidence base (few unique sources)
  | "no_successful_sources"         // Zero successfully fetched sources after research phase
  | "source_acquisition_collapse"   // Many searches performed but no sources fetched — pipeline stall
  | "grounding_check"               // Verdict reasoning poorly grounded in cited evidence
  | "grounding_check_degraded"      // LLM grounding adjudication failed; ratios are fallback values
  | "direction_validation_degraded" // LLM direction validation failed; verdicts kept unchanged
  | "verdict_fallback_partial"      // v2.9.1: Individual claim got 50/50 fallback (LLM didn't return verdict)
  | "verdict_partial_recovery"      // Partial JSON recovery from truncated LLM output (some claims recovered, rest fallback)
  | "verdict_batch_retry";          // Verdict generation recovered via batch retry (claims split into smaller batches)

/**
 * Analysis warning structure for surfacing quality issues to UI.
 */
export interface AnalysisWarning {
  type: AnalysisWarningType;
  severity: AnalysisWarningSeverity;
  message: string;
  /** Optional details for debugging */
  details?: {
    claimId?: string;
    contextId?: string;
    expectedDirection?: "supports" | "contradicts" | "high" | "low";  // Evidence direction or verdict direction
    actualVerdictPct?: number;
    evidenceSupportPct?: number;
    correctedVerdictPct?: number;
    [key: string]: any;
  };
}

/**
 * Verdict direction mismatch details for P0 validation.
 */
export interface VerdictDirectionMismatch {
  claimId: string;
  claimText: string;
  verdictPct: number;
  evidenceSupportCount: number;
  evidenceContradictCount: number;
  evidenceNeutralCount: number;
  expectedDirection: "high" | "low";  // Based on evidence majority
  actualDirection: "high" | "low";    // Based on verdict percentage
  wasCorrect: boolean;                // True if directions match
  correctedVerdictPct?: number;       // If auto-corrected, new value
}

// ============================================================================
// CLAIMBOUNDARY PIPELINE TYPES (§9.1)
// ============================================================================

/**
 * AtomicClaim: A single verifiable assertion extracted from the input article.
 * Only central claims (high/medium centrality) survive the extraction filter.
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.1 Stage 1: EXTRACT CLAIMS
 */
export interface AtomicClaim {
  id: string;                    // "AC_01", "AC_02", ...
  statement: string;             // The verifiable assertion
  category: "factual" | "evaluative" | "procedural";
  centrality: "high" | "medium"; // Only central claims survive
  harmPotential: "critical" | "high" | "medium" | "low";
  isCentral: true;               // Always true (filtered)
  claimDirection: "supports_thesis" | "contradicts_thesis" | "contextual";
  keyEntities: string[];         // Named entities referenced
  checkWorthiness: "high" | "medium";
  specificityScore: number;      // 0-1, LLM-assessed. ≥0.6 required by Gate 1.
  groundingQuality: "strong" | "moderate" | "weak" | "none";
  expectedEvidenceProfile: {     // What evidence would verify/refute this claim
    methodologies: string[];     // e.g., ["WTW analysis", "vehicle dynamometer testing"]
    expectedMetrics: string[];   // e.g., ["efficiency %", "energy loss kWh/km"]
    expectedSourceTypes: SourceType[]; // e.g., ["peer_reviewed_study", "government_report"]
  };
}

/**
 * ClaimBoundary: A group of compatible EvidenceScopes that define
 * a coherent analytical lens. Created AFTER research by clustering
 * EvidenceScopes — NOT pre-created.
 *
 * Replaces AnalysisContext in the UI (different name to avoid confusion).
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.3 Stage 3: CLUSTER BOUNDARIES
 */
export interface ClaimBoundary {
  id: string;                    // "CB_01", "CB_02", ...
  name: string;                  // Human-readable: "Well-to-Wheel Analyses"
  shortName: string;             // Short label: "WTW"
  description: string;           // What this boundary represents

  // Derived from constituent EvidenceScopes
  methodology?: string;          // Dominant methodology
  boundaries?: string;           // Scope boundaries
  geographic?: string;           // Geographic scope
  temporal?: string;             // Temporal scope

  // Clustering metadata
  constituentScopes: EvidenceScope[]; // The scopes that compose this boundary
  internalCoherence: number;     // 0-1: how consistent evidence within is
  evidenceCount: number;         // Number of evidence items in this boundary
}

/**
 * BoundaryFinding: Per-boundary quantitative signals within a claim verdict.
 * Provides nuance when different methodological boundaries yield
 * different conclusions about the same claim.
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.4 Stage 4: VERDICT
 */
export interface BoundaryFinding {
  boundaryId: string;
  boundaryName: string;
  truthPercentage: number;       // Per-boundary truth assessment (0–100)
  confidence: number;            // Per-boundary confidence (0–100)
  evidenceDirection: "supports" | "contradicts" | "mixed" | "neutral";
  evidenceCount: number;
}

/**
 * CBClaimVerdict: Verdict for a single claim in the ClaimBoundary pipeline.
 * One per claim, not per-boundary. Boundary-specific nuance in boundaryFindings[].
 *
 * Named CBClaimVerdict to avoid conflict with existing ClaimVerdict type.
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.4 Stage 4: VERDICT
 */
export interface CBClaimVerdict {
  id: string;
  claimId: string;               // FK to AtomicClaim
  truthPercentage: number;       // 0-100
  verdict: ClaimVerdict7Point;   // 7-point scale label
  confidence: number;            // 0-100 (adjusted by self-consistency spread)
  reasoning: string;             // LLM-generated explanation (includes challenge responses)
  harmPotential: "critical" | "high" | "medium" | "low";
  isContested: boolean;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  boundaryFindings: BoundaryFinding[]; // Per-boundary quantitative signals
  consistencyResult: ConsistencyResult;
  challengeResponses: ChallengeResponse[];
  triangulationScore: TriangulationScore;
}

/**
 * ConsistencyResult: Output of self-consistency check (§8.4 Step 2).
 * Measures verdict stability across multiple LLM runs with temperature > 0.
 *
 * @since ClaimBoundary pipeline v1
 */
export interface ConsistencyResult {
  claimId: string;
  percentages: number[];         // Truth percentages from each run [v1, v2, v3]
  average: number;
  spread: number;                // max - min
  stable: boolean;               // spread ≤ stableThreshold (UCM)
  assessed: boolean;             // false if skipped (disabled or deterministic mode)
}

/**
 * ChallengeDocument: Output of adversarial challenge (§8.4 Step 3).
 *
 * @since ClaimBoundary pipeline v1
 */
export interface ChallengeDocument {
  challenges: Array<{
    claimId: string;
    challengePoints: ChallengePoint[];
  }>;
}

/**
 * ChallengePoint: A single adversarial challenge against a verdict.
 *
 * @since ClaimBoundary pipeline v1
 */
export interface ChallengePoint {
  type: "assumption" | "missing_evidence" | "methodology_weakness" | "independence_concern";
  description: string;
  evidenceIds: string[];         // Referenced evidence (or empty if citing absence)
  severity: "high" | "medium" | "low";
}

/**
 * ChallengeResponse: How a challenge point was addressed in reconciliation (§8.4 Step 4).
 *
 * @since ClaimBoundary pipeline v1
 */
export interface ChallengeResponse {
  challengeType: ChallengePoint["type"];
  response: string;              // Reconciler's response to the challenge
  verdictAdjusted: boolean;      // Whether the verdict changed because of this challenge
}

/**
 * TriangulationScore: Cross-boundary agreement assessment (§8.5.2).
 *
 * @since ClaimBoundary pipeline v1
 */
export interface TriangulationScore {
  boundaryCount: number;         // Number of boundaries with evidence for this claim
  supporting: number;            // Boundaries with "supports" direction
  contradicting: number;         // Boundaries with "contradicts" direction
  level: "strong" | "moderate" | "weak" | "conflicted";
  factor: number;                // Multiplicative weight adjustment from UCM thresholds
}

/**
 * CoverageMatrix: Claims × boundaries evidence distribution (§8.5.1).
 * Computed after Stage 3, used by triangulation, sufficiency check, and structural validation.
 *
 * @since ClaimBoundary pipeline v1
 */
export interface CoverageMatrix {
  claims: string[];              // Claim IDs (rows)
  boundaries: string[];          // Boundary IDs (columns)
  counts: number[][];            // counts[claimIdx][boundaryIdx] = evidence count
  getBoundariesForClaim(claimId: string): string[];
  getClaimsForBoundary(boundaryId: string): string[];
}

/**
 * VerdictNarrative: Structured narrative for the overall assessment.
 * LLM-generated (Sonnet, 1 call) after weighted aggregation.
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.5.6
 */
export interface VerdictNarrative {
  headline: string;              // Overall finding in one sentence
  evidenceBaseSummary: string;   // Quantitative: "14 items, 9 sources, 3 perspectives"
  keyFinding: string;            // Main synthesis (2–3 sentences) — the "so what"
  boundaryDisagreements?: string[]; // Where and why boundaries diverge (only when relevant)
  limitations: string;           // What the analysis couldn't determine
}

/**
 * CBClaimUnderstanding: Output of Stage 1 in the ClaimBoundary pipeline.
 * Simplified from current ClaimUnderstanding — no analysisContexts, no keyFactors.
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.1 Stage 1: EXTRACT CLAIMS
 */
export interface CBClaimUnderstanding {
  detectedInputType: InputType;
  impliedClaim: string;
  backgroundDetails: string;
  articleThesis: string;
  atomicClaims: AtomicClaim[];   // Replaces subClaims
  distinctEvents: Array<{ name: string; date: string; description: string }>;
  riskTier: "A" | "B" | "C";
}

/**
 * CBResearchState: Accumulating state through CB pipeline analysis.
 *
 * @since ClaimBoundary pipeline v1
 * @see §9.1
 */
export interface CBResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: CBClaimUnderstanding | null;
  evidenceItems: EvidenceItem[];
  sources: FetchedSource[];
  searchQueries: SearchQuery[];
  // Iteration tracking (replaces boolean contradictionSearchPerformed)
  mainIterationsUsed: number;
  contradictionIterationsReserved: number;
  contradictionIterationsUsed: number;
  contradictionSourcesFound: number;
  claimBoundaries: ClaimBoundary[]; // Populated in Stage 3
  llmCalls: number;
}

/**
 * OverallAssessment: Final aggregated result of the ClaimBoundary pipeline.
 *
 * @since ClaimBoundary pipeline v1
 * @see §8.5 Stage 5: AGGREGATE
 */
export interface OverallAssessment {
  truthPercentage: number;       // 0-100 weighted average
  verdict: ArticleVerdict7Point;
  confidence: number;            // 0-100 weighted average
  verdictNarrative: VerdictNarrative;
  hasMultipleBoundaries: boolean;
  claimBoundaries: ClaimBoundary[];
  claimVerdicts: CBClaimVerdict[];
  coverageMatrix: CoverageMatrix;
  qualityGates: QualityGates;
}
