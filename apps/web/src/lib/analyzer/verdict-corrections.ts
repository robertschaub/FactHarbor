/**
 * Verdict correction utilities (inversion detection, counter-claim detection)
 *
 * Counter-claim detection is now LLM-powered via the text-analysis service.
 * All deterministic regex/token-based comparative frame analysis has been removed
 * (AGENTS.md LLM Intelligence Migration compliance).
 *
 * @module analyzer/verdict-corrections
 */

import type { EvidenceItem } from "./types";
import { debugLog } from "./debug";
import { getTextAnalysisService } from "./text-analysis-service";

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
 * Uses LLM-powered detection via the text-analysis service. The LLM evaluates:
 * - Comparative frame reversal (swapped subjects, inverted comparatives)
 * - Evaluative polarity opposition (fair→unfair, safe→dangerous)
 * - Evidence direction signals as secondary confirmation
 *
 * @param claimText - The text of the sub-claim
 * @param userThesis - The user's original thesis/claim (normalized)
 * @param claimTruthPercentage - Truth percentage assigned to the claim
 * @param claimEvidenceItems - Evidence items supporting this claim
 * @param verdictBands - Verdict band thresholds
 * @returns true if this is a counter-claim
 */
export async function detectCounterClaim(
  claimText: string,
  userThesis: string,
  claimTruthPercentage?: number,
  claimEvidenceItems?: EvidenceItem[],
  verdictBands?: { LEANING_TRUE: number; MIXED: number },
): Promise<boolean> {
  // Build evidence direction counts from metadata fields (structural)
  const supporting = claimEvidenceItems?.filter((e) => e.claimDirection === "supports").length ?? 0;
  const contradicting = claimEvidenceItems?.filter((e) => e.claimDirection === "contradicts").length ?? 0;

  try {
    const service = getTextAnalysisService();
    const results = await service.detectCounterClaims({
      thesis: userThesis,
      claims: [
        {
          claimId: "claim",
          claimText,
          truthPercentage: claimTruthPercentage,
          evidenceDirections: { supporting, contradicting },
        },
      ],
      verdictBands,
    });

    const result = results[0]?.isCounterClaim ?? false;
    debugLog("detectCounterClaim: LLM result", {
      claimText: claimText?.slice(0, 80),
      isCounterClaim: result,
      reasoning: results[0]?.reasoning,
    });
    return result;
  } catch (error) {
    debugLog("detectCounterClaim: LLM service failed, defaulting to false", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
