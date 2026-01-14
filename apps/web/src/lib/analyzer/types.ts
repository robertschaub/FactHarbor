/**
 * FactHarbor Analyzer - Type Definitions
 *
 * This module contains all TypeScript types and interfaces used by the analyzer.
 *
 * @module analyzer/types
 */

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
 *   = Formerly called "Proceeding" in the codebase.
 *   = Stored in `distinctProceedings` field (name kept for backward compatibility).
 *   = Shown in UI as "Contexts".
 *
 * "ArticleFrame"
 *   = Narrative/background framing of the input article.
 *   = NOT a reason to split into separate AnalysisContexts.
 *   = Stored in `proceedingContext` field (name kept for backward compatibility).
 *
 * "EvidenceScope" (per-fact source scope)
 *   = Methodology/boundaries defined BY a source document.
 *   = Attached to individual facts as `fact.evidenceScope`.
 *   = Different from AnalysisContext! A fact's EvidenceScope describes how
 *     the SOURCE computed its data (e.g., a specific methodology/boundary).
 *
 * SUMMARY:
 *   - Top-level split unit = AnalysisContext
 *   - "EvidenceScope" in code = per-fact source methodology/boundaries
 *   - "ArticleFrame" = narrative background (not a reason to split)
 *
 * JSON field names like `distinctProceedings`, `proceedingContext`, `relatedProceedingId`
 * MUST NOT be renamed (backward compatibility with persisted data).
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
 * @see EvidenceScope for per-fact source-defined scope metadata (different concept!)
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
 * EvidenceScope: The analytical frame/scope defined BY a source document
 *
 * This is DIFFERENT from AnalysisContext! EvidenceScope describes the methodology,
 * boundaries, geography, and timeframe that a SOURCE DOCUMENT used when producing
 * its evidence. It's attached to individual facts as `fact.evidenceScope`.
 *
 * Critical for comparing apples-to-apples:
 * Example: A study saying "hydrogen car efficiency is 40%" using WTW methodology
 * cannot be directly compared to a TTW study (different calculation boundaries).
 *
 * @see AnalysisContext for top-level analysis contexts (different concept!)
 */
export interface EvidenceScope {
  name: string;           // Short label (e.g., "WTW", "TTW", "EU-LCA", "US jurisdiction")
  methodology?: string;   // Standard referenced (e.g., "ISO 14040", "EU RED II")
  boundaries?: string;    // What's included/excluded (e.g., "Primary energy to wheel")
  geographic?: string;    // Geographic scope (e.g., "European Union", "California")
  temporal?: string;      // Time period (e.g., "2020-2025", "FY2024")
}

/**
 * @deprecated Use AnalysisContext instead
 * Kept for backward compatibility only
 */
export type DistinctProceeding = AnalysisContext;

export interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested: boolean;
  contestedBy: string;
  contestationReason: string;
  factualBasis: "established" | "disputed" | "alleged" | "opinion" | "unknown";
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
 * Note: Field names `proceedingId` and `proceedingName` are kept for
 * backward compatibility with persisted JSON data.
 */
export interface ContextAnswer {
  proceedingId: string;      // Context ID (field name kept for backward compat)
  proceedingName: string;    // Context name (field name kept for backward compat)
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  keyFactors: KeyFactor[];
  factorAnalysis?: FactorAnalysis;
}

/**
 * @deprecated Use ContextAnswer instead
 */
export type ProceedingAnswer = ContextAnswer;

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
}

export interface ResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  facts: ExtractedFact[];
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
   * JSON field name "distinctProceedings" kept for backward compatibility.
   * @see AnalysisContext
   */
  distinctProceedings: AnalysisContext[];
  requiresSeparateAnalysis: boolean;

  /**
   * ArticleFrame: Narrative/background framing of the input.
   * This is NOT an AnalysisContext - it's just background information.
   * NOT a reason to split into separate analysis contexts.
   *
   * JSON field name "proceedingContext" kept for backward compatibility.
   */
  proceedingContext: string;

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
    relatedProceedingId: string;
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
  factsExtracted: number;
}

export interface ExtractedFact {
  id: string;
  fact: string;
  category:
    | "legal_provision"
    | "evidence"
    | "expert_quote"
    | "statistic"
    | "event"
    | "criticism";
  specificity: "high" | "medium";
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  relatedProceedingId?: string;
  isContestedClaim?: boolean;
  claimSource?: string;
  // NEW v2.6.29: Claim direction - does this fact support or contradict the ORIGINAL user claim?
  // "supports" = fact supports the user's claim being true
  // "contradicts" = fact contradicts the user's claim (supports the OPPOSITE)
  // "neutral" = fact is contextual/background, doesn't directly support or contradict
  claimDirection?: "supports" | "contradicts" | "neutral";
  // NEW v2.6.29: True if this fact was found from searching for the OPPOSITE claim
  // (e.g., if user claimed "X > Y", this fact came from searching "Y > X")
  fromOppositeClaimSearch?: boolean;
  // EvidenceScope: Captures the methodology/boundaries of the source document
  // (e.g., WTW vs TTW, EU vs US standards, different time periods)
  evidenceScope?: EvidenceScope;
}

export interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
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
  supportingFactIds: string[];
  keyFactorId?: string;
  relatedProceedingId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
  isPseudoscience?: boolean;
  escalationReason?: string;
  isContested?: boolean;
  contestedBy?: string;
  factualBasis?: "established" | "disputed" | "alleged" | "opinion" | "unknown";
  // v2.6.31: Counter-claim tracking - true if this claim evaluates the OPPOSITE of the user's thesis
  // When aggregating, counter-claim verdicts should be inverted (TRUE 85% → contributes as FALSE 15%)
  isCounterClaim?: boolean;
}

export interface ArticleAnalysis {
  inputType: InputType;

  /**
   * Multi-context indicator and per-context metadata array.
   * JSON field names kept for backward compatibility.
   */
  hasMultipleProceedings: boolean;
  proceedings?: AnalysisContext[];  // AnalysisContexts (field name kept for backward compat)

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
   * JSON field name "targetProceedingId" kept for backward compatibility.
   */
  targetProceedingId?: string;
}

// ============================================================================
// ANALYSIS INPUT/OUTPUT TYPES
// ============================================================================

export type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};
