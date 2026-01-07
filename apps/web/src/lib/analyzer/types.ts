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

export type InputType = "question" | "claim" | "article";
export type QuestionIntent = "verification" | "exploration" | "comparison" | "none";
export type ClaimRole = "attribution" | "source" | "timing" | "core" | "unknown";

// ============================================================================
// 7-POINT TRUTH SCALE TYPES
// ============================================================================

/**
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score |
 * |----------|---------------|-------|
 * | 86-100%  | True          | +3    |
 * | 72-85%   | Mostly True   | +2    |
 * | 58-71%   | Leaning True  | +1    |
 * | 43-57%   | Unverified    |  0    |
 * | 29-42%   | Leaning False | -1    |
 * | 15-28%   | Mostly False  | -2    |
 * | 0-14%    | False         | -3    |
 */
export type ClaimVerdict7Point =
  | "TRUE"          // 86-100%, Score +3
  | "MOSTLY-TRUE"   // 72-85%,  Score +2
  | "LEANING-TRUE"  // 58-71%,  Score +1
  | "UNVERIFIED"    // 43-57%,  Score  0
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE"  // 15-28%,  Score -2
  | "FALSE";        // 0-14%,   Score -3

export type QuestionAnswer7Point =
  | "YES"           // 86-100%, Score +3
  | "MOSTLY-YES"    // 72-85%,  Score +2
  | "LEANING-YES"   // 58-71%,  Score +1
  | "UNVERIFIED"    // 43-57%,  Score  0
  | "LEANING-NO"    // 29-42%,  Score -1
  | "MOSTLY-NO"     // 15-28%,  Score -2
  | "NO";           // 0-14%,   Score -3

export type ArticleVerdict7Point =
  | "TRUE"          // 86-100%, Score +3
  | "MOSTLY-TRUE"   // 72-85%,  Score +2
  | "LEANING-TRUE"  // 58-71%,  Score +1
  | "UNVERIFIED"    // 43-57%,  Score  0
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
// PROCEEDING & FACTOR TYPES
// ============================================================================

export interface DistinctProceeding {
  id: string;
  name: string;
  shortName: string;
  court: string;
  jurisdiction: string;
  date: string;
  subject: string;
  charges: string[];
  outcome: string;
  status: "concluded" | "ongoing" | "pending" | "unknown";
}

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

export interface ProceedingAnswer {
  proceedingId: string;
  proceedingName: string;
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
  questionIntent: QuestionIntent;
  questionBeingAsked: string;
  impliedClaim: string;

  distinctProceedings: DistinctProceeding[];
  requiresSeparateAnalysis: boolean;
  proceedingContext: string;

  mainQuestion: string;
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
}

export interface QuestionAnswer {
  question: string;
  // Answer truth percentage (0-100)
  answer: number;
  confidence: number;
  truthPercentage: number;
  shortAnswer: string;
  nuancedAnswer: string;
  keyFactors: KeyFactor[];

  hasMultipleProceedings: boolean;
  proceedingAnswers?: ProceedingAnswer[];
  proceedingSummary?: string;
  calibrationNote?: string;
  hasContestedFactors?: boolean;
}

export interface ArticleAnalysis {
  inputType: InputType;
  isQuestion: boolean;
  questionAnswer?: QuestionAnswer;

  hasMultipleProceedings: boolean;
  proceedings?: DistinctProceeding[];

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
    overallVerdict: string;
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
