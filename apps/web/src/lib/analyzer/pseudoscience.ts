/**
 * FactHarbor Analyzer - Pseudoscience Detection
 *
 * Detects pseudoscientific claims and escalates verdicts accordingly.
 *
 * @module analyzer/pseudoscience
 */

import type { PseudoscienceAnalysis } from "./types";

// ============================================================================
// PSEUDOSCIENCE PATTERNS
// ============================================================================

/**
 * Patterns that indicate pseudoscientific claims
 * These are mechanisms that contradict established physics/chemistry/biology
 */
export const PSEUDOSCIENCE_PATTERNS: Record<string, RegExp[]> = {
  // Water pseudoscience
  waterMemory: [
    /water\s*memory/i,
    /information\s*water/i,
    /informed\s*water/i,
    /structured\s*water/i,
    /hexagonal\s*water/i,
    /water\s*structur(e|ing)/i,
    /molecular\s*(re)?structur/i,
    /water\s*cluster/i,
    /energi[sz]ed\s*water/i,
    /revitali[sz]ed\s*water/i,
    /living\s*water/i,
    /grander/i,
    /emoto/i,
  ],

  // Energy/vibration pseudoscience
  energyFields: [
    /life\s*force/i,
    /vital\s*energy/i,
    /bio[\s-]*energy/i,
    /subtle\s*energy/i,
    /energy\s*field/i,
    /healing\s*frequencies/i,
    /vibrational\s*(healing|medicine|therapy)/i,
    /frequency\s*(healing|therapy)/i,
    /chakra/i,
    /aura\s*(reading|healing|cleansing)/i,
  ],

  // Quantum misuse
  quantumMisuse: [
    /quantum\s*(healing|medicine|therapy|wellness)/i,
    /quantum\s*consciousness/i,
    /quantum\s*energy/i,
  ],

  // Homeopathy
  homeopathy: [
    /homeopath/i,
    /potenti[sz]ation/i,
    /succussion/i,
    /dilution.*memory/i,
    /like\s*cures\s*like/i,
  ],

  // Detox pseudoscience
  detoxPseudo: [
    /detox\s*(foot|ion|cleanse)/i,
    /toxin\s*removal.*(?:crystal|magnet|ion)/i,
    /ionic\s*cleanse/i,
  ],

  // Other pseudoscience
  other: [
    /crystal\s*(healing|therapy|energy)/i,
    /magnet\s*therapy/i,
    /magnetic\s*healing/i,
    /earthing\s*(therapy|healing)/i,
    /grounding\s*(therapy|healing|mat)/i,
    /orgone/i,
    /scalar\s*(wave|energy)/i,
    /tachyon/i,
    /zero[\s-]*point\s*energy.*healing/i,
  ],
};

/**
 * Known pseudoscience products/brands
 */
export const PSEUDOSCIENCE_BRANDS = [
  /grander/i,
  /pimag/i,
  /kangen/i,
  /enagic/i,
  /alkaline\s*ionizer/i,
  /structured\s*water\s*unit/i,
];

/**
 * Scientific consensus statements that indicate a claim is debunked
 */
export const DEBUNKED_INDICATORS = [
  /no\s*(scientific\s*)?(evidence|proof|basis)/i,
  /not\s*(scientifically\s*)?(proven|supported|verified)/i,
  /lacks?\s*(scientific\s*)?(evidence|proof|basis|foundation)/i,
  /contradict.*(?:physics|chemistry|biology|science)/i,
  /violates?\s*(?:laws?\s*of\s*)?(?:physics|thermodynamics)/i,
  /pseudoscien/i,
  /debunked/i,
  /disproven/i,
  /no\s*plausible\s*mechanism/i,
  /implausible/i,
  /scientifically\s*impossible/i,
];

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
  for (const [category, patterns] of Object.entries(PSEUDOSCIENCE_PATTERNS)) {
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
  for (const brand of PSEUDOSCIENCE_BRANDS) {
    if (brand.test(combinedText)) {
      result.matchedPatterns.push(brand.toString());
      if (!result.categories.includes("knownBrand")) {
        result.categories.push("knownBrand");
      }
    }
  }

  // Check for debunked indicators in sources
  for (const indicator of DEBUNKED_INDICATORS) {
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

    if (result.confidence >= 0.7 || result.debunkIndicatorsFound.length >= 2) {
      result.recommendation = "REFUTED";
    } else if (
      result.confidence >= 0.5 ||
      result.debunkIndicatorsFound.length >= 1
    ) {
      result.recommendation = "REFUTED";
    } else {
      result.recommendation = "UNCERTAIN";
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
  originalVerdict: string,
  originalConfidence: number,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: string; confidence: number; escalationReason?: string } {
  if (!pseudoAnalysis.isPseudoscience) {
    return { verdict: originalVerdict, confidence: originalConfidence };
  }

  const verdictStrength: Record<string, number> = {
    "WELL-SUPPORTED": 4,
    "PARTIALLY-SUPPORTED": 3,
    UNCERTAIN: 2,
    REFUTED: 1,
    FALSE: 0,
  };

  const currentStrength = verdictStrength[originalVerdict] ?? 2;
  let newVerdict = originalVerdict;
  let newConfidence = originalConfidence;
  let escalationReason: string | undefined;

  if (currentStrength >= 2 && pseudoAnalysis.confidence >= 0.5) {
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 2) {
      newVerdict = "REFUTED";
      newConfidence = Math.min(Math.max(originalConfidence, 80), 95);
      escalationReason = `Claim contradicts scientific consensus (${pseudoAnalysis.categories.join(", ")}) - multiple debunk sources found`;
    } else if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      newVerdict = "REFUTED";
      newConfidence = Math.min(Math.max(originalConfidence, 70), 90);
      escalationReason = `Claim based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicts established science`;
    } else if (pseudoAnalysis.confidence >= 0.6) {
      newVerdict = "REFUTED";
      newConfidence = Math.min(Math.max(originalConfidence, 65), 85);
      escalationReason = `Multiple pseudoscience patterns detected (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`;
    }
  }

  if (currentStrength === 3 && pseudoAnalysis.confidence >= 0.4) {
    newVerdict = "UNCERTAIN";
    newConfidence = Math.min(originalConfidence, 40);
    escalationReason = `Claimed mechanism (${pseudoAnalysis.categories.join(", ")}) lacks scientific basis`;
  }

  return { verdict: newVerdict, confidence: newConfidence, escalationReason };
}

// ============================================================================
// ARTICLE-LEVEL VERDICT
// ============================================================================

/**
 * Determine article-level verdict considering pseudoscience
 */
export function calculateArticleVerdictWithPseudoscience(
  claimVerdicts: Array<{
    verdict: string;
    confidence: number;
    isPseudoscience?: boolean;
  }>,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: string; confidence: number; reason?: string } {
  const refutedCount = claimVerdicts.filter(
    (v) => v.verdict === "REFUTED" || v.verdict === "FALSE",
  ).length;
  const uncertainCount = claimVerdicts.filter(
    (v) => v.verdict === "UNCERTAIN",
  ).length;
  const supportedCount = claimVerdicts.filter(
    (v) =>
      v.verdict === "WELL-SUPPORTED" || v.verdict === "PARTIALLY-SUPPORTED",
  ).length;
  const total = claimVerdicts.length;

  // If pseudoscience detected at article level
  if (pseudoAnalysis.isPseudoscience && pseudoAnalysis.confidence >= 0.5) {
    if (
      uncertainCount >= total * 0.5 &&
      pseudoAnalysis.debunkIndicatorsFound.length >= 1
    ) {
      return {
        verdict: "REFUTED",
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
        verdict: "REFUTED",
        confidence: Math.min(avgConfidence, 90),
        reason: `Contains pseudoscientific claims (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`,
      };
    }

    return {
      verdict: "MISLEADING",
      confidence: 70,
      reason: `Claims rely on unproven mechanisms (${pseudoAnalysis.categories.join(", ")})`,
    };
  }

  // Standard verdict calculation
  if (refutedCount >= total * 0.8) {
    return { verdict: "REFUTED", confidence: 85 };
  }
  if (refutedCount >= total * 0.5) {
    return { verdict: "REFUTED", confidence: 80 };
  }
  if (refutedCount > 0 || uncertainCount >= total * 0.5) {
    return { verdict: "MISLEADING", confidence: 70 };
  }
  if (supportedCount >= total * 0.7) {
    return { verdict: "CREDIBLE", confidence: 80 };
  }
  return { verdict: "MOSTLY-CREDIBLE", confidence: 65 };
}
