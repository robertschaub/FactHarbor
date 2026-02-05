/**
 * Verdict correction utilities (inversion detection, counter-claim detection)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/verdict-corrections
 */

import type { EvidenceItem } from "./types";
import { debugLog } from "./debug";

/**
 * Detect and correct inverted verdicts.
 * The LLM sometimes rates "how correct is my analysis" (high) instead of "is the claim true" (low).
 *
 * Note: Pattern-based inversion detection has been removed. Verdict direction validation
 * is now handled by validateVerdictDirections() in orchestrated.ts which uses evidence
 * direction counts for more accurate detection.
 *
 * @returns corrected truth percentage, or original if no inversion detected
 */
export function detectAndCorrectVerdictInversion(
  claimText: string,
  reasoning: string,
  verdictPct: number,
): { correctedPct: number; wasInverted: boolean; inversionReason?: string } {
  // Verdict inversion is now handled by validateVerdictDirections() in orchestrated.ts
  // which uses evidence direction counts rather than pattern matching
  debugLog("detectAndCorrectVerdictInversion: No-op (handled by validateVerdictDirections)", {
    claimText: claimText?.slice(0, 80),
    verdictPct,
  });

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

  /**
   * Check if a claim semantically supports/aligns with the thesis.
   * If aligned, the claim cannot be a counter-claim regardless of evidence directions.
   *
   * Uses comparative frame analysis to detect swapped/reversed comparatives.
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

    // If we can't detect explicit opposition, assume aligned
    return true;
  }

  if (isClaimAlignedWithThesis(claimLower, thesisLower)) {
    return false;
  }

  // =========================================================================
  // Text-based detection (preferred): compare claim text vs thesis text
  // =========================================================================

  const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for",
    "with", "at", "by", "from", "as", "into", "than", "over", "under",
    "using", "use", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those", "it", "its", "has", "have", "had",
  ]);

  function tokenizePhrase(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
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
