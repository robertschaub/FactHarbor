/**
 * FactHarbor Analyzer - Pseudoscience Detection
 *
 * Detects pseudoscientific claims and escalates verdicts accordingly.
 *
 * @module analyzer/pseudoscience
 */

import type { PseudoscienceAnalysis } from "./types";
import type { AggregationLexicon } from "../config-schemas";
import { getAggregationPatterns } from "./lexicon-utils";

// ============================================================================
// PSEUDOSCIENCE PATTERNS (UCM-Configurable)
// ============================================================================

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 * Can be updated via setPseudoscienceLexicon() for testing or config reload
 */
let _patterns = getAggregationPatterns();

/**
 * Set the lexicon for pseudoscience detection (useful for testing or config reload)
 */
export function setPseudoscienceLexicon(lexicon?: AggregationLexicon): void {
  _patterns = getAggregationPatterns(lexicon);
}

/**
 * Get current patterns (for testing)
 */
export function getPseudosciencePatternsConfig() {
  return _patterns;
}

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function truthFromBand(
  band: "strong" | "partial" | "uncertain" | "refuted",
  confidence: number,
): number {
  const conf = normalizePercentage(confidence) / 100;
  switch (band) {
    case "strong":
      return Math.round(72 + 28 * conf);
    case "partial":
      return Math.round(50 + 35 * conf);
    case "uncertain":
      return Math.round(35 + 30 * conf);
    case "refuted":
      return Math.round(28 * (1 - conf));
  }
}

// ============================================================================
// DETECTION FUNCTION
// ============================================================================

/**
 * Analyze text for pseudoscience patterns
 */
export function detectPseudoscience(
  text: string,
  claimText?: string,
): PseudoscienceAnalysis {
  const result: PseudoscienceAnalysis = {
    isPseudoscience: false,
    confidence: 0,
    categories: [],
    matchedPatterns: [],
    debunkIndicatorsFound: [],
    recommendation: null,
  };

  const combinedText = `${text} ${claimText || ""}`.toLowerCase();

  // Check each pseudoscience category
  for (const [category, patterns] of Object.entries(_patterns.pseudosciencePatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        if (!result.categories.includes(category)) {
          result.categories.push(category);
        }
        result.matchedPatterns.push(pattern.toString());
      }
    }
  }

  // Check for known pseudoscience brands
  for (const brand of _patterns.pseudoscienceBrands) {
    if (brand.test(combinedText)) {
      result.matchedPatterns.push(brand.toString());
      if (!result.categories.includes("knownBrand")) {
        result.categories.push("knownBrand");
      }
    }
  }

  // Check for debunked indicators in sources
  for (const indicator of _patterns.pseudoscienceDebunkedIndicators) {
    if (indicator.test(combinedText)) {
      result.debunkIndicatorsFound.push(indicator.toString());
    }
  }

  // Calculate confidence
  const patternScore = Math.min(result.matchedPatterns.length * 0.15, 0.6);
  const categoryScore = Math.min(result.categories.length * 0.2, 0.4);
  const debunkScore = Math.min(result.debunkIndicatorsFound.length * 0.2, 0.4);

  result.confidence = Math.min(patternScore + categoryScore + debunkScore, 1.0);

  // Determine if it's pseudoscience
  if (result.categories.length >= 1 && result.confidence >= 0.3) {
    result.isPseudoscience = true;

    const refutedRecommendation = 10;
    const uncertainRecommendation = 50;

    if (result.confidence >= 0.7 || result.debunkIndicatorsFound.length >= 2) {
      result.recommendation = refutedRecommendation;
    } else if (
      result.confidence >= 0.5 ||
      result.debunkIndicatorsFound.length >= 1
    ) {
      result.recommendation = refutedRecommendation;
    } else {
      result.recommendation = uncertainRecommendation;
    }
  }

  return result;
}

// ============================================================================
// VERDICT ESCALATION
// ============================================================================

/**
 * Escalate verdict when pseudoscience is detected
 */
export function escalatePseudoscienceVerdict(
  originalTruthPercentage: number,
  originalConfidence: number,
  pseudoAnalysis: PseudoscienceAnalysis,
): { truthPercentage: number; confidence: number; escalationReason?: string } {
  const normalizedTruth = normalizePercentage(originalTruthPercentage);
  const normalizedConfidence = normalizePercentage(originalConfidence);

  if (!pseudoAnalysis.isPseudoscience) {
    return { truthPercentage: normalizedTruth, confidence: normalizedConfidence };
  }

  const currentStrength =
    normalizedTruth >= 72 ? 4 : normalizedTruth >= 50 ? 3 : normalizedTruth >= 35 ? 2 : 1;
  let newTruth = normalizedTruth;
  let newConfidence = normalizedConfidence;
  let escalationReason: string | undefined;

  if (currentStrength >= 2 && pseudoAnalysis.confidence >= 0.5) {
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 2) {
      newConfidence = Math.min(Math.max(newConfidence, 80), 95);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Claim contradicts scientific consensus (${pseudoAnalysis.categories.join(", ")}) - multiple debunk sources found`;
    } else if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      newConfidence = Math.min(Math.max(newConfidence, 70), 90);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Claim based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicts established science`;
    } else if (pseudoAnalysis.confidence >= 0.6) {
      newConfidence = Math.min(Math.max(newConfidence, 65), 85);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Multiple pseudoscience patterns detected (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`;
    }
  }

  if (currentStrength === 3 && pseudoAnalysis.confidence >= 0.4) {
    newConfidence = Math.min(newConfidence, 40);
    newTruth = truthFromBand("uncertain", newConfidence);
    escalationReason = `Claimed mechanism (${pseudoAnalysis.categories.join(", ")}) lacks scientific basis`;
  }

  return { truthPercentage: newTruth, confidence: newConfidence, escalationReason };
}

// ============================================================================
// ARTICLE-LEVEL VERDICT
// ============================================================================

/**
 * Determine article-level verdict considering pseudoscience
 */
export function calculateArticleVerdictWithPseudoscience(
  claimVerdicts: Array<{
    verdict: number;
    confidence: number;
    isPseudoscience?: boolean;
  }>,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: number; confidence: number; reason?: string } {
  const refutedCount = claimVerdicts.filter((v) => v.verdict < 43).length;
  const uncertainCount = claimVerdicts.filter(
    (v) => v.verdict >= 43 && v.verdict < 72,
  ).length;
  const supportedCount = claimVerdicts.filter((v) => v.verdict >= 72).length;
  const total = claimVerdicts.length;

  // If pseudoscience detected at article level
  if (pseudoAnalysis.isPseudoscience && pseudoAnalysis.confidence >= 0.5) {
    if (
      uncertainCount >= total * 0.5 &&
      pseudoAnalysis.debunkIndicatorsFound.length >= 1
    ) {
      return {
        verdict: truthFromBand(
          "refuted",
          Math.min(
          85,
          70 + pseudoAnalysis.debunkIndicatorsFound.length * 5,
        )),
        confidence: Math.min(
          85,
          70 + pseudoAnalysis.debunkIndicatorsFound.length * 5,
        ),
        reason: `Claims based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicted by scientific consensus`,
      };
    }

    if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      const avgConfidence =
        claimVerdicts.reduce((sum, v) => sum + v.confidence, 0) / total;
      return {
        verdict: truthFromBand("refuted", Math.min(avgConfidence, 90)),
        confidence: Math.min(avgConfidence, 90),
        reason: `Contains pseudoscientific claims (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`,
      };
    }

    return {
      verdict: Math.round(35),
      confidence: 70,
      reason: `Claims rely on unproven mechanisms (${pseudoAnalysis.categories.join(", ")})`,
    };
  }

  // Standard verdict calculation
  if (refutedCount >= total * 0.8) {
    const confidence = 85;
    return { verdict: truthFromBand("refuted", confidence), confidence };
  }
  if (refutedCount >= total * 0.5) {
    const confidence = 80;
    return { verdict: truthFromBand("refuted", confidence), confidence };
  }
  if (refutedCount > 0 || uncertainCount >= total * 0.5) {
    return { verdict: Math.round(35), confidence: 70 };
  }
  if (supportedCount >= total * 0.7) {
    const confidence = 80;
    return { verdict: truthFromBand("strong", confidence), confidence };
  }
  const confidence = 65;
  return { verdict: truthFromBand("partial", confidence), confidence };
}
