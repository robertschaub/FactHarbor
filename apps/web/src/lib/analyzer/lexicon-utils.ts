/**
 * Lexicon Utilities
 *
 * Helper functions for working with UCM lexicon patterns.
 * Pattern syntax:
 * - "re:<pattern>" - Regex pattern (e.g., "re:some (say|believe)")
 * - "<literal>" - Literal string (case-insensitive match)
 *
 * @module lexicon-utils
 * @since v2.9 (UCM Migration)
 */

import type { EvidenceLexicon, AggregationLexicon } from "../config-schemas";
import { DEFAULT_EVIDENCE_LEXICON, DEFAULT_AGGREGATION_LEXICON } from "../config-schemas";

/**
 * Parse a UCM pattern string into a RegExp.
 * - If prefixed with "re:", treat as regex pattern
 * - Otherwise, treat as literal string (escaped and case-insensitive)
 */
export function parsePattern(pattern: string): RegExp {
  if (pattern.startsWith("re:")) {
    // Regex pattern
    const regexStr = pattern.slice(3);
    return new RegExp(regexStr, "i");
  } else {
    // Literal string - escape special chars and match case-insensitively
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i");
  }
}

/**
 * Compile an array of UCM patterns into RegExp objects.
 * Caches results to avoid recompilation.
 */
const patternCache = new Map<string, RegExp>();

export function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map((pattern) => {
    const cached = patternCache.get(pattern);
    if (cached) return cached;

    const compiled = parsePattern(pattern);
    patternCache.set(pattern, compiled);
    return compiled;
  });
}

/**
 * Test if text matches any of the compiled patterns.
 */
export function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Count how many patterns match in the text.
 */
export function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

/**
 * Get compiled patterns from lexicon, with caching.
 * Falls back to default lexicon if not provided.
 */
export function getEvidencePatterns(
  lexicon?: EvidenceLexicon
): {
  vaguePhrases: RegExp[];
  citationPatterns: RegExp[];
  attributionPatterns: RegExp[];
  opinionMarkers: RegExp[];
  futureMarkers: RegExp[];
  specificityPatterns: RegExp[];
  uncertaintyMarkers: RegExp[];
  stopwords: Set<string>;
  provenanceMinSourceExcerptLength: number;
  provenanceSyntheticContentPatterns: RegExp[];
  provenanceInvalidUrlPatterns: RegExp[];
} {
  const lex = lexicon ?? DEFAULT_EVIDENCE_LEXICON;

  return {
    vaguePhrases: compilePatterns(lex.evidenceFilter.vaguePhrases),
    citationPatterns: compilePatterns(lex.evidenceFilter.citationPatterns),
    attributionPatterns: compilePatterns(lex.evidenceFilter.attributionPatterns),
    opinionMarkers: compilePatterns(lex.gate1.opinionMarkers),
    futureMarkers: compilePatterns(lex.gate1.futureMarkers),
    specificityPatterns: compilePatterns(lex.gate1.specificityPatterns),
    uncertaintyMarkers: compilePatterns(lex.gate4.uncertaintyMarkers),
    stopwords: new Set(lex.gate1.stopwords),
    provenanceMinSourceExcerptLength: lex.provenanceValidation.minSourceExcerptLength,
    provenanceSyntheticContentPatterns: compilePatterns(lex.provenanceValidation.syntheticContentPatterns),
    provenanceInvalidUrlPatterns: compilePatterns(lex.provenanceValidation.invalidUrlPatterns),
  };
}

/**
 * Get compiled aggregation patterns from lexicon, with caching.
 * Falls back to default lexicon if not provided.
 */
export function getAggregationPatterns(
  lexicon?: AggregationLexicon
): {
  documentedEvidenceKeywords: RegExp[];
  causalClaimPatterns: RegExp[];
  methodologyCriticismPatterns: RegExp[];
  harmDeathKeywords: RegExp[];
  harmInjuryKeywords: RegExp[];
  harmSafetyKeywords: RegExp[];
  harmCrimeKeywords: RegExp[];
  positiveClaimPatterns: RegExp[];
  negativeReasoningPatterns: RegExp[];
  negativeClaimPatterns: RegExp[];
  positiveReasoningPatterns: RegExp[];
  supportingAspectPatterns: RegExp[];
  comparativeKeywords: RegExp[];
  compoundIndicators: RegExp[];
  predictiveKeywords: RegExp[];
  evaluativeKeywords: RegExp[];
  productionPhaseKeywords: RegExp[];
  usagePhaseKeywords: RegExp[];
  negativeIndicators: RegExp[];
  positiveIndicators: RegExp[];
  evaluativeTermSynonyms: Record<string, string[]>;
  coreEvaluativeTerms: string[];
  negativeFormMappings: Record<string, string>;
  counterClaimStopwords: Set<string>;
  pseudosciencePatterns: Record<string, RegExp[]>;
  pseudoscienceBrands: RegExp[];
  pseudoscienceDebunkedIndicators: RegExp[];
  scopeComparisonPatterns: RegExp[];
  scopeEfficiencyKeywords: RegExp[];
  scopeLegalFairnessPatterns: RegExp[];
  scopeLegalProcessKeywords: RegExp[];
  scopeInternationalCuePatterns: RegExp[];
  scopeEnvHealthPatterns: RegExp[];
  scopePredicateStarters: RegExp[];
  scopeFillerWords: RegExp[];
  scopeLegalTerms: RegExp[];
  scopeJurisdictionIndicators: RegExp[];
  recencyKeywords: RegExp[];
  newsIndicatorKeywords: RegExp[];
  proceduralKeywords: RegExp[];
  externalReactionPatterns: RegExp[];
} {
  const lex = lexicon ?? DEFAULT_AGGREGATION_LEXICON;
  const pseudosciencePatterns: Record<string, RegExp[]> = {};
  for (const [category, patterns] of Object.entries(lex.pseudoscience.patterns || {})) {
    pseudosciencePatterns[category] = compilePatterns(patterns);
  }

  return {
    documentedEvidenceKeywords: compilePatterns(lex.contestation.documentedEvidenceKeywords),
    causalClaimPatterns: compilePatterns(lex.contestation.causalClaimPatterns),
    methodologyCriticismPatterns: compilePatterns(lex.contestation.methodologyCriticismPatterns),
    harmDeathKeywords: compilePatterns(lex.harmPotential.deathKeywords),
    harmInjuryKeywords: compilePatterns(lex.harmPotential.injuryKeywords),
    harmSafetyKeywords: compilePatterns(lex.harmPotential.safetyKeywords),
    harmCrimeKeywords: compilePatterns(lex.harmPotential.crimeKeywords),
    positiveClaimPatterns: compilePatterns(lex.verdictCorrection.positiveClaimPatterns),
    negativeReasoningPatterns: compilePatterns(lex.verdictCorrection.negativeReasoningPatterns),
    negativeClaimPatterns: compilePatterns(lex.verdictCorrection.negativeClaimPatterns),
    positiveReasoningPatterns: compilePatterns(lex.verdictCorrection.positiveReasoningPatterns),
    supportingAspectPatterns: compilePatterns(lex.counterClaimDetection.supportingAspectPatterns),
    comparativeKeywords: compilePatterns(lex.textAnalysisHeuristic.comparativeKeywords),
    compoundIndicators: compilePatterns(lex.textAnalysisHeuristic.compoundIndicators),
    predictiveKeywords: compilePatterns(lex.textAnalysisHeuristic.predictiveKeywords),
    evaluativeKeywords: compilePatterns(lex.textAnalysisHeuristic.evaluativeKeywords),
    productionPhaseKeywords: compilePatterns(lex.textAnalysisHeuristic.productionPhaseKeywords),
    usagePhaseKeywords: compilePatterns(lex.textAnalysisHeuristic.usagePhaseKeywords),
    negativeIndicators: compilePatterns(lex.textAnalysisHeuristic.negativeIndicators),
    positiveIndicators: compilePatterns(lex.textAnalysisHeuristic.positiveIndicators),
    evaluativeTermSynonyms: lex.counterClaimDetection.evaluativeTermSynonyms,
    coreEvaluativeTerms: lex.counterClaimDetection.coreEvaluativeTerms,
    negativeFormMappings: lex.counterClaimDetection.negativeFormMappings,
    counterClaimStopwords: new Set(lex.counterClaimDetection.stopwords),
    pseudosciencePatterns,
    pseudoscienceBrands: compilePatterns(lex.pseudoscience.brands),
    pseudoscienceDebunkedIndicators: compilePatterns(lex.pseudoscience.debunkedIndicators),
    scopeComparisonPatterns: compilePatterns(lex.scopeHeuristics.comparisonPatterns),
    scopeEfficiencyKeywords: compilePatterns(lex.scopeHeuristics.efficiencyKeywords),
    scopeLegalFairnessPatterns: compilePatterns(lex.scopeHeuristics.legalFairnessPatterns),
    scopeLegalProcessKeywords: compilePatterns(lex.scopeHeuristics.legalProcessKeywords),
    scopeInternationalCuePatterns: compilePatterns(lex.scopeHeuristics.internationalCuePatterns),
    scopeEnvHealthPatterns: compilePatterns(lex.scopeHeuristics.envHealthPatterns),
    scopePredicateStarters: compilePatterns(lex.scopeCanonicalization.predicateStarters),
    scopeFillerWords: compilePatterns(lex.scopeCanonicalization.fillerWords),
    scopeLegalTerms: compilePatterns(lex.scopeCanonicalization.legalTerms),
    scopeJurisdictionIndicators: compilePatterns(lex.scopeCanonicalization.jurisdictionIndicators),
    recencyKeywords: compilePatterns(lex.recencyHeuristics.recentKeywords),
    newsIndicatorKeywords: compilePatterns(lex.recencyHeuristics.newsIndicatorKeywords),
    proceduralKeywords: compilePatterns(lex.proceduralTopicHeuristics.proceduralKeywords),
    externalReactionPatterns: compilePatterns(lex.externalReactionHeuristics.externalReactionPatterns),
  };
}

/**
 * Clear pattern cache (useful for testing or config reload)
 */
export function clearPatternCache(): void {
  patternCache.clear();
}
