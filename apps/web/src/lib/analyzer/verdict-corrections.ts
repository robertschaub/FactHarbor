/**
 * Verdict correction utilities (inversion detection, counter-claim detection)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * v2.10: Uses internal pattern set (no external lexicon config).
 *
 * @module analyzer/verdict-corrections
 */

import type { EvidenceItem } from "./types";
import { debugLog } from "./debug";
import { getAggregationPatterns, matchesAnyPattern } from "./lexicon-utils";

// ============================================================================
// PATTERN CONFIGURATION
// ============================================================================

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 */
let _patterns = getAggregationPatterns();

/**
 * Reset verdict correction patterns to defaults.
 */
export function setVerdictCorrectionsLexicon(): void {
  _patterns = getAggregationPatterns();
}

/**
 * Get current patterns (for testing)
 */
export function getVerdictCorrectionsPatternsConfig() {
  return _patterns;
}

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

  // v2.9: Patterns sourced from internal pattern set (verdict correction).
  // Pattern 1: Claim says "X was proportionate/justified/fair" but reasoning says "NOT proportionate/justified/fair"
  // Pattern 2 (v2.8.3): REVERSE inversion - claim asserts NEGATIVE, reasoning shows POSITIVE

  // Check if claim asserts something positive (UCM: verdictCorrection.positiveClaimPatterns)
  const claimAssertsPositive = matchesAnyPattern(claimLower, _patterns.positiveClaimPatterns);

  // Check if reasoning negates it (UCM: verdictCorrection.negativeReasoningPatterns)
  const reasoningNegates = matchesAnyPattern(reasoningLower, _patterns.negativeReasoningPatterns);

  // v2.8.3: Also check for REVERSE inversion - claim asserts NEGATIVE, reasoning shows POSITIVE
  // Example: Claim says "Technology A has lower efficiency" but reasoning shows "Technology A uses 60% efficiently"
  const claimAssertsNegative = matchesAnyPattern(claimLower, _patterns.negativeClaimPatterns);
  const reasoningShowsPositive = matchesAnyPattern(reasoningLower, _patterns.positiveReasoningPatterns);

  // DEBUG: Log pattern matching results
  debugLog("[INVERSION DEBUG] Pattern matching results", {
    claimAssertsPositive,
    reasoningNegates,
    claimAssertsNegative,
    reasoningShowsPositive,
    shouldInvert: (claimAssertsPositive && reasoningNegates && verdictPct >= 50) ||
                  (claimAssertsNegative && reasoningShowsPositive && verdictPct >= 50),
  });

  debugLog("detectAndCorrectVerdictInversion: CHECK", {
    claimText: claimText.slice(0, 80),
    reasoningSnippet: reasoningLower.slice(0, 120),
    verdictPct,
    claimAssertsPositive,
    reasoningNegates,
    claimAssertsNegative,
    reasoningShowsPositive,
  });

  // Invert if: (positive claim + negative reasoning) OR (negative claim + positive reasoning)
  if ((claimAssertsPositive && reasoningNegates && verdictPct >= 50) ||
      (claimAssertsNegative && reasoningShowsPositive && verdictPct >= 50)) {
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
 * CRITICAL: A claim that semantically SUPPORTS the thesis should NEVER be marked as a
 * counter-claim, regardless of evidence directions. Only claims that test the OPPOSITE
 * position (e.g., "was unfair" when thesis says "was fair") are counter-claims.
 *
 * @param claimText - The text of the sub-claim
 * @param userThesis - The user's original thesis/claim (normalized)
 * @param claimEvidenceItems - Evidence items supporting this claim (check if from counter-evidence search)
 * @returns true if this is a counter-claim
 */
export function detectCounterClaim(
  claimText: string,
  userThesis: string,
  claimTruthPercentage?: number,
  claimEvidenceItems?: EvidenceItem[],
): boolean {
  const claimLower = claimText.toLowerCase();
  const thesisLower = userThesis.toLowerCase();

  // =========================================================================
  // EARLY EXIT: Check if claim semantically SUPPORTS the thesis
  // If the claim is thesis-aligned, it cannot be a counter-claim.
  // =========================================================================

  // v2.9: Evaluative term synonyms sourced from internal pattern set.

  // Check if claim and thesis share aligned evaluative framing
  function hasAlignedEvalTerms(claim: string, thesis: string): boolean {
    for (const [, synonyms] of Object.entries(_patterns.evaluativeTermSynonyms)) {
      const claimHasTerm = synonyms.some((s) => claim.includes(s));
      const thesisHasTerm = synonyms.some((s) => thesis.includes(s));
      // If both contain terms from the same synonym group (both positive), they're aligned
      if (claimHasTerm && thesisHasTerm) {
        // Make sure neither is negated
        const claimNegated = synonyms.some((s) => {
          const idx = claim.indexOf(s);
          if (idx === -1) return false;
          const before = claim.slice(Math.max(0, idx - 10), idx);
          return /\bnot\b|\bno\b|\bun|\bin/.test(before);
        });
        const thesisNegated = synonyms.some((s) => {
          const idx = thesis.indexOf(s);
          if (idx === -1) return false;
          const before = thesis.slice(Math.max(0, idx - 10), idx);
          return /\bnot\b|\bno\b|\bun|\bin/.test(before);
        });
        // Both positive (neither negated) = aligned
        if (!claimNegated && !thesisNegated) return true;
        // Both negative = aligned (both saying "not fair")
        if (claimNegated && thesisNegated) return true;
      }
    }
    return false;
  }

  // Check if claim is about a supporting aspect of the thesis
  // e.g., thesis: "trial was fair" → claim: "due process was followed" (supports fairness)
  // v2.9: Patterns sourced from internal pattern set (counter-claim detection).
  function isClaimAboutSupportingAspect(claim: string, thesis: string): boolean {
    // If thesis is about fairness/justice/propriety, and claim is about procedural/evidential
    // aspects that would SUPPORT such a conclusion, they're aligned
    const fairnessThesis =
      /\b(fair|just|equitable|impartial|proper|lawful|legal|constitutional)\b/.test(thesis);
    if (fairnessThesis) {
      // Use UCM patterns for supporting aspect detection
      if (matchesAnyPattern(claim, _patterns.supportingAspectPatterns)) return true;
    }
    return false;
  }

  /**
   * Check if a claim semantically supports/aligns with the thesis.
   * If aligned, the claim cannot be a counter-claim regardless of evidence directions.
   */
  function isClaimAlignedWithThesis(claim: string, thesis: string): boolean {
    // IMPORTANT: Don't treat swapped/reversed comparatives as "aligned" just because they share
    // a positive evaluative adjective (e.g., "efficient"). These are often counter-claims:
    // thesis: "X is more efficient than Y" vs claim: "Y is more efficient than X".
    const thesisFrame = extractComparativeFrame(thesis);
    const claimFrame = extractComparativeFrame(claim);
    if (thesisFrame && claimFrame) {
      const norm = (s: string) =>
        s
          .toLowerCase()
          .replace(/["']/g, "")
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      if (thesisFrame.kind === "than" && claimFrame.kind === "than") {
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

        const sameAdj = thesisFrame.adj === claimFrame.adj;
        const tLeft = norm(thesisFrame.left);
        const tRight = norm(thesisFrame.right);
        const cLeft = norm(claimFrame.left);
        const cRight = norm(claimFrame.right);

        // Opposite direction: swapped subjects OR inverted comparator (with same subjects)
        if (
          sameAdj &&
          ((thesisFrame.comp === claimFrame.comp && tLeft === cRight && tRight === cLeft) ||
            (oppositeComparatives[thesisFrame.comp] === claimFrame.comp &&
              tLeft === cLeft &&
              tRight === cRight))
        ) {
          return false;
        }
      }

      if (thesisFrame.kind === "over" && claimFrame.kind === "over") {
        const tLeft = norm(thesisFrame.left);
        const tRight = norm(thesisFrame.right);
        const cLeft = norm(claimFrame.left);
        const cRight = norm(claimFrame.right);
        if (tLeft === cRight && tRight === cLeft) {
          return false;
        }
      }
    }

    // Check 1: Both use the same positive evaluative framing
    if (hasAlignedEvalTerms(claim, thesis)) {
      debugLog("detectCounterClaim: Thesis-aligned (same eval terms)", {
        claim: claim.slice(0, 80),
        thesis: thesis.slice(0, 80),
      });
      return true;
    }

    // Check 2: Claim is about an aspect that SUPPORTS the thesis conclusion
    if (isClaimAboutSupportingAspect(claim, thesis)) {
      debugLog("detectCounterClaim: Thesis-aligned (supporting aspect)", {
        claim: claim.slice(0, 80),
        thesis: thesis.slice(0, 80),
      });
      return true;
    }

    return false;
  }

  if (isClaimAlignedWithThesis(claimLower, thesisLower)) {
    return false;
  }

  // =========================================================================
  // Text-based detection (preferred): compare claim text vs thesis text
  // =========================================================================

  // v2.9: Stop words sourced from internal pattern set.

  function tokenizePhrase(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t.length > 2 && !_patterns.counterClaimStopwords.has(t));
  }

  function overlapRatio(a: string, b: string): number {
    const aTokens = tokenizePhrase(a);
    const bTokens = tokenizePhrase(b);
    if (aTokens.length === 0 || bTokens.length === 0) return 0;
    const aSet = new Set(aTokens);
    const bSet = new Set(bTokens);
    let inter = 0;
    for (const t of aSet) if (bSet.has(t)) inter++;
    const denom = Math.min(aSet.size, bSet.size);
    return denom > 0 ? inter / denom : 0;
  }

  function phrasesMatch(a: string, b: string): boolean {
    // Containment-style match is more forgiving for short vs expanded phrases
    // (e.g., "Technology A" vs "Technology A-based vehicles")
    return overlapRatio(a, b) >= 0.75;
  }

  type ComparativeFrame =
    | { kind: "than"; left: string; comp: string; adj: string; right: string }
    | { kind: "over"; left: string; right: string }
    | null;

  function extractComparativeFrame(text: string): ComparativeFrame {
    const cleaned = text
      .replace(/["']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Pattern A: "Using X ... is more/less/higher/... <adj> than (using) Y"
    const usingRe =
      /using\s+(.+?)\s+(?:for\s+.+?\s+)?(?:is|are|was|were)\s+(more|less|higher|lower|better|worse|greater|smaller)\s+(\w+)\s+than\s+(?:using\s+)?(.+?)(?:[.?!,;]|$)/i;
    const usingMatch = cleaned.match(usingRe);
    if (usingMatch) {
      const [, left, comp, adj, right] = usingMatch;
      return {
        kind: "than",
        left: left.trim(),
        comp: comp.trim().toLowerCase(),
        adj: adj.trim().toLowerCase(),
        right: right.trim(),
      };
    }

    // Pattern B: General: "X is more/less/... <adj> than Y"
    const thanRe =
      /^(.+?)\s+(?:is|are|was|were)\s+(more|less|higher|lower|better|worse|greater|smaller)\s+(\w+)\s+than\s+(.+?)(?:[.?!,;]|$)/i;
    const thanMatch = cleaned.match(thanRe);
    if (thanMatch) {
      const [, left, comp, adj, right] = thanMatch;
      return {
        kind: "than",
        left: left.trim(),
        comp: comp.trim().toLowerCase(),
        adj: adj.trim().toLowerCase(),
        right: right.trim(),
      };
    }

    // Pattern C: Preference-style: "favor/prefer X over Y"
    const overRe =
      /\b(favor|favour|prefer|prioritize|prioritise)\b\s+(.+?)\s+over\s+(.+?)(?:[.?!,;]|$)/i;
    const overMatch = cleaned.match(overRe);
    if (overMatch) {
      const [, , left, right] = overMatch;
      return { kind: "over", left: left.trim(), right: right.trim() };
    }

    return null;
  }

  // Pattern: Claim is testing the opposite direction of a comparative
  // User thesis: "X is more efficient than Y" → Counter-claim: "Y is more efficient than X"
  const thesisFrame = extractComparativeFrame(thesisLower);
  const claimFrame = extractComparativeFrame(claimLower);
  if (thesisFrame && claimFrame) {
    if (thesisFrame.kind === "than" && claimFrame.kind === "than") {
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

      const sameAdj = thesisFrame.adj === claimFrame.adj;

      // Opposite comparator ("more" vs "less") with same subject ordering
      if (
        sameAdj &&
        oppositeComparatives[thesisFrame.comp] === claimFrame.comp &&
        phrasesMatch(thesisFrame.left, claimFrame.left) &&
        phrasesMatch(thesisFrame.right, claimFrame.right)
      ) {
        return true;
      }

      // Swapped subjects (Y ... than X) with same comparator
      if (
        sameAdj &&
        thesisFrame.comp === claimFrame.comp &&
        phrasesMatch(thesisFrame.left, claimFrame.right) &&
        phrasesMatch(thesisFrame.right, claimFrame.left)
      ) {
        return true;
      }
    }

    if (thesisFrame.kind === "over" && claimFrame.kind === "over") {
      // "favor X over Y" → counter-claim: "favor Y over X"
      if (
        phrasesMatch(thesisFrame.left, claimFrame.right) &&
        phrasesMatch(thesisFrame.right, claimFrame.left)
      ) {
        return true;
      }
    }
  }

  // Pattern: Claim explicitly states the opposite of the thesis
  // Look for negation of key thesis terms
  // Conservative heuristic:
  // Only flag counter-claim when BOTH thesis and claim mention the same evaluative term,
  // but with opposite polarity (e.g., "fair" vs "not fair"/"unfair").
  // v2.9: Terms sourced from internal pattern set (counter-claim detection).

  function getPolarityByTerm(
    text: string,
  ): Partial<Record<string, "positive" | "negative">> {
    const out: Partial<Record<string, "positive" | "negative">> = {};
    const t = text.toLowerCase();

    // Detect explicit negation: "not <term>"
    for (const term of _patterns.coreEvaluativeTerms) {
      const negRe = new RegExp(`\\bnot\\s+${term}\\b`, "i");
      if (negRe.test(t)) {
        out[term] = "negative";
      }
    }

    // Detect negative lexical forms: "unfair", "invalid", etc.
    // (UCM: counterClaimDetection.negativeFormMappings)
    for (const [negWord, posTerm] of Object.entries(_patterns.negativeFormMappings)) {
      const negWordRe = new RegExp(`\\b${negWord}\\b`, "i");
      if (negWordRe.test(t)) {
        out[posTerm] = "negative";
      }
    }

    // Detect positive mentions of the term only if we didn't already mark it negative.
    for (const term of _patterns.coreEvaluativeTerms) {
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
  for (const term of _patterns.coreEvaluativeTerms) {
    const tp = thesisPolarity[term];
    const cp = claimPolarity[term];
    if (!tp || !cp) continue;
    if (tp !== cp) return true;
  }

  // =========================================================================
  // Evidence-based fallback (guarded):
  // Only use evidence direction when the claim itself is clearly true-ish or clearly false-ish.
  //
  // Rationale: `supportingEvidenceIds` for a claim can include refuting evidence.
  // If the user's thesis is false, many refutations will be labeled "contradicts" relative
  // to the thesis, which MUST NOT automatically make same-direction (thesis-aligned) claims
  // look like counter-claims.
  // =========================================================================
  if (claimEvidenceItems && claimEvidenceItems.length > 0 && typeof claimTruthPercentage === "number") {
    const truthPct = claimTruthPercentage;
    // Provenance (fromOppositeClaimSearch) is metadata, not evidence direction.
    const contradictCount = claimEvidenceItems.filter((item) => item.claimDirection === "contradicts").length;
    const supportCount = claimEvidenceItems.filter((item) => item.claimDirection === "supports").length;

    const majorityContradicts = contradictCount > claimEvidenceItems.length / 2;
    const majoritySupports = supportCount > claimEvidenceItems.length / 2;

    // If claim is (leaning) true and its evidence contradicts the user's thesis,
    // it's likely evaluating the opposite position.
    if (truthPct >= 58 && majorityContradicts) return true;

    // If claim is (leaning) false and its evidence supports the user's thesis,
    // it's likely a counter-claim that was refuted.
    if (truthPct <= 42 && majoritySupports) return true;
  }

  return false;
}
