/**
 * Verdict correction utilities (inversion detection, counter-claim detection)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/verdict-corrections
 */

import type { ExtractedFact } from "./types";
import { debugLog } from "./debug";

/**
 * Detect and correct inverted verdicts.
 * The LLM sometimes rates "how correct is my analysis" (high) instead of "is the claim true" (low).
 * This function detects when reasoning contradicts the verdict and corrects it.
 *
 * @returns corrected truth percentage, or original if no inversion detected
 */
export function detectAndCorrectVerdictInversion(
  claimText: string,
  reasoning: string,
  verdictPct: number,
): { correctedPct: number; wasInverted: boolean; inversionReason?: string } {
  // Only check verdicts that are in the "true" range (>=50%)
  if (verdictPct < 50) {
    return { correctedPct: verdictPct, wasInverted: false };
  }

  // DEBUG: Log inputs to debug file
  debugLog("[INVERSION DEBUG] Input values", {
    claimText: claimText?.slice(0, 100),
    reasoning: reasoning?.slice(0, 150),
    verdictPct,
  });

  const claimLower = claimText.toLowerCase();
  const reasoningLower = reasoning.toLowerCase();

  // Pattern 1: Claim says "X was proportionate/justified/fair" but reasoning says "NOT proportionate/justified/fair"
  // Allow optional articles/words between verb and adjective: "were a proportionate", "was not a fair"
  const positiveClaimPatterns = [
    /\b(was|were|is|are)\s+(a\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\b/i,
    /\b(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\s+(response|action|decision|measure|and\s+justified)\b/i,
    // Additional positive assertion patterns
    // Comparative positive assertions
    /\b(more|higher|better|superior|greater)\s+(efficient|effective|accurate|reliable)\b/i,
    // Positive state assertions
    /\b(has|have|had)\s+(sufficient|adequate|strong|solid)\s+(evidence|basis|support)\b/i,
    /\b(supports?|justifies?|warrants?|establishes?)\s+(the\s+)?(claim|assertion|conclusion)\b/i,
  ];

  const negativeReasoningPatterns = [
    // "were NOT proportionate", "was NOT a fair response"
    /\b(was|were|is|are)\s+not\s+(a\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\b/i,
    // "NOT proportionate to", "not a proportionate response"
    /\bnot\s+(a\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)/i,
    // Negative adjectives
    /\b(disproportionate|unjustified|unfair|inappropriate|unreasonable|invalid|incorrect|improper)\b/i,
    // Legal/ethical violations
    /\bviolates?\s+(principles?|norms?|standards?|law|rights?)\b/i,
    /\blacks?\s+(factual\s+)?basis\b/i,
    /\brepresents?\s+(economic\s+)?retaliation\b/i,
    /\b(inappropriate|improper)\s+(interference|intervention)\b/i,
    // Interference patterns
    /\binterfere\s+with\b/i,
    /\bmaking\s+them\s+(disproportionate|inappropriate)\b/i,
    // Excessive patterns
    /\b(excessive|unwarranted|undue)\s+(economic\s+)?(punishment|pressure|retaliation)\b/i,
    // Additional denial patterns
    // Insufficiency patterns
    /\b(lacks?|lacking)\s+(sufficient\s+)?(evidence|basis|support|justification)\b/i,
    /\b(insufficient|inadequate)\s+(evidence|basis|support|justification)\b/i,
    /\bdoes\s+not\s+(support|justify|warrant|establish)\b/i,
    /\bfails?\s+to\s+(support|justify|demonstrate|establish|show)\b/i,
    // Contradiction patterns
    /\b(contradicts?|contradicted|contradicting)\s+(the\s+)?(claim|assertion|thesis)\b/i,
    /\bevidence\s+(shows?|indicates?|suggests?|demonstrates?)\s+(the\s+)?opposite\b/i,
    /\b(contrary|opposite)\s+to\s+(what|the\s+claim)\b/i,
    // Falsification patterns
    /\b(refutes?|refuted|disproves?|disproved|negates?|negated)\b/i,
    /\b(false|untrue|inaccurate|incorrect|wrong|erroneous)\s+(based\s+on|according\s+to)?\s*(the\s+)?evidence\b/i,
    // Efficiency/comparison denial for comparative claims
    /\b(less|lower|worse|inferior|reduced)\s+(efficient|effective|productive|performance)\b/i,
    /\bnot\s+(more|higher|better|superior)\s+(efficient|effective)\b/i,
  ];

  // Check if claim asserts something positive
  const claimAssertsPositive = positiveClaimPatterns.some((p) =>
    p.test(claimLower),
  );

  // Check if reasoning negates it
  const reasoningNegates = negativeReasoningPatterns.some((p) =>
    p.test(reasoningLower),
  );

  // DEBUG: Log pattern matching results
  debugLog("[INVERSION DEBUG] Pattern matching results", {
    claimAssertsPositive,
    reasoningNegates,
    shouldInvert: claimAssertsPositive && reasoningNegates && verdictPct >= 50,
  });

  debugLog("detectAndCorrectVerdictInversion: CHECK", {
    claimText: claimText.slice(0, 80),
    reasoningSnippet: reasoningLower.slice(0, 120),
    verdictPct,
    claimAssertsPositive,
    reasoningNegates,
  });

  if (claimAssertsPositive && reasoningNegates && verdictPct >= 50) {
    // Invert the verdict: 72% → 28%, 85% → 15%, etc.
    const correctedPct = 100 - verdictPct;
    debugLog("detectAndCorrectVerdictInversion: INVERTED", {
      claimText: claimText.slice(0, 100),
      originalPct: verdictPct,
      correctedPct,
      reason: "Reasoning contradicts claim assertion",
    });
    return {
      correctedPct,
      wasInverted: true,
      inversionReason:
        "Reasoning indicates claim is false but verdict was high - inverted",
    };
  }

  return { correctedPct: verdictPct, wasInverted: false };
}

/**
 * Detect if a sub-claim is a counter-claim (evaluates the opposite of the user's thesis).
 * Counter-claims are generated when the LLM creates sub-claims that test opposing positions,
 * or when claims are derived from counter-evidence search results.
 *
 * @param claimText - The text of the sub-claim
 * @param userThesis - The user's original thesis/claim (normalized)
 * @param claimFacts - Facts supporting this claim (check if from counter-evidence search)
 * @returns true if this is a counter-claim
 */
export function detectCounterClaim(
  claimText: string,
  userThesis: string,
  claimFacts?: ExtractedFact[],
): boolean {
  // Check if claim is primarily supported by counter-evidence facts
  if (claimFacts && claimFacts.length > 0) {
    const counterEvidenceFacts = claimFacts.filter(
      (f) => f.claimDirection === "contradicts" || f.fromOppositeClaimSearch,
    );
    // If majority of supporting facts are counter-evidence, this is likely a counter-claim
    if (counterEvidenceFacts.length > claimFacts.length / 2) {
      return true;
    }
  }

  // Check for linguistic indicators of opposing position
  const claimLower = claimText.toLowerCase();
  const thesisLower = userThesis.toLowerCase();

  // Pattern: Claim is testing the opposite direction of a comparative
  // User thesis: "X is more efficient than Y" → Counter-claim: "Y is more efficient than X"
  const comparativePattern =
    /\b(more|less|higher|lower|better|worse|greater|smaller)\s+(\w+)\s+than\b/i;
  const thesisMatch = thesisLower.match(comparativePattern);
  const claimMatch = claimLower.match(comparativePattern);

  if (thesisMatch && claimMatch) {
    // If both have comparatives but in opposite directions
    const oppositeComparatives: Record<string, string> = {
      more: "less",
      less: "more",
      higher: "lower",
      lower: "higher",
      better: "worse",
      worse: "better",
      greater: "smaller",
      smaller: "greater",
    };
    if (
      oppositeComparatives[thesisMatch[1].toLowerCase()] ===
      claimMatch[1].toLowerCase()
    ) {
      return true;
    }
  }

  // Pattern: Claim explicitly states the opposite of the thesis
  // Look for negation of key thesis terms
  // Conservative heuristic:
  // Only flag counter-claim when BOTH thesis and claim mention the same evaluative term,
  // but with opposite polarity (e.g., "fair" vs "not fair"/"unfair").
  const EVAL_TERMS = [
    "proportionate",
    "justified",
    "fair",
    "efficient",
    "effective",
    "true",
    "valid",
  ] as const;
  type EvalTerm = (typeof EVAL_TERMS)[number];

  const NEGATIVE_TO_POSITIVE: Record<string, EvalTerm> = {
    disproportionate: "proportionate",
    unjustified: "justified",
    unfair: "fair",
    inefficient: "efficient",
    ineffective: "effective",
    false: "true",
    untrue: "true",
    invalid: "valid",
  };

  function getPolarityByTerm(
    text: string,
  ): Partial<Record<EvalTerm, "positive" | "negative">> {
    const out: Partial<Record<EvalTerm, "positive" | "negative">> = {};
    const t = text.toLowerCase();

    // Detect explicit negation: "not <term>"
    for (const term of EVAL_TERMS) {
      const negRe = new RegExp(`\\bnot\\s+${term}\\b`, "i");
      if (negRe.test(t)) {
        out[term] = "negative";
      }
    }

    // Detect negative lexical forms: "unfair", "invalid", etc.
    for (const [negWord, posTerm] of Object.entries(NEGATIVE_TO_POSITIVE)) {
      const negWordRe = new RegExp(`\\b${negWord}\\b`, "i");
      if (negWordRe.test(t)) {
        out[posTerm] = "negative";
      }
    }

    // Detect positive mentions of the term only if we didn't already mark it negative.
    for (const term of EVAL_TERMS) {
      if (out[term]) continue;
      const posRe = new RegExp(`\\b${term}\\b`, "i");
      if (posRe.test(t)) {
        out[term] = "positive";
      }
    }

    return out;
  }

  const thesisPolarity = getPolarityByTerm(thesisLower);
  const claimPolarity = getPolarityByTerm(claimLower);
  for (const term of EVAL_TERMS) {
    const tp = thesisPolarity[term];
    const cp = claimPolarity[term];
    if (!tp || !cp) continue;
    if (tp !== cp) return true;
  }

  return false;
}

