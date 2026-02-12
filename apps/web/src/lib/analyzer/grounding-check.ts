/**
 * Post-Verdict Grounding Check (M2 from Anti-Hallucination Strategy)
 *
 * Validates that verdict reasoning is grounded in cited evidence items.
 * Key term extraction from reasoning is now LLM-powered (AGENTS.md compliance).
 * Term matching against evidence corpus remains structural.
 *
 * Returns a groundingRatio (0-1) used by confidence calibration (Layer 5).
 *
 * @module analyzer/grounding-check
 */

import { generateText } from "ai";
import type { ClaimVerdict, EvidenceItem } from "./types";
import { getModelForTask } from "./llm";
import { loadAndRenderSection } from "./prompt-loader";

// ============================================================================
// TYPES
// ============================================================================

export interface GroundingCheckResult {
  /** Overall ratio of grounded claims across all verdicts (0-1) */
  groundingRatio: number;
  /** Per-verdict grounding details */
  verdictDetails: VerdictGroundingDetail[];
  /** Warning messages for ungrounded verdicts */
  warnings: string[];
}

export interface VerdictGroundingDetail {
  claimId: string;
  /** Number of key terms from reasoning found in cited evidence */
  groundedTermCount: number;
  /** Total number of key terms extracted from reasoning */
  totalTermCount: number;
  /** Per-verdict grounding ratio (0-1) */
  ratio: number;
  /** Whether this verdict has any cited evidence at all */
  hasCitedEvidence: boolean;
}

export interface GroundingPenaltyConfig {
  enabled: boolean;
  /** Grounding ratio below this triggers a penalty (default 0.5) */
  threshold: number;
  /** How aggressively to reduce confidence (default 0.3) */
  reductionFactor: number;
  /** Minimum grounding ratio before maximum penalty applies (default 0.1) */
  floorRatio: number;
}

export const DEFAULT_GROUNDING_PENALTY_CONFIG: GroundingPenaltyConfig = {
  enabled: true,
  threshold: 0.5,
  reductionFactor: 0.3,
  floorRatio: 0.1,
};

// ============================================================================
// LLM-POWERED TERM EXTRACTION
// ============================================================================

/**
 * Extract meaningful key terms from multiple reasoning texts using LLM.
 * Batches all reasonings into a single call for efficiency.
 *
 * @returns Array of term arrays, one per reasoning text
 */
async function extractKeyTermsBatch(reasonings: string[]): Promise<string[][]> {
  if (reasonings.length === 0) return [];

  const modelInfo = getModelForTask("extract_evidence"); // Haiku tier — fast, cheap

  const numberedReasonings = reasonings
    .map((r, i) => `[${i}]: ${r.slice(0, 500)}`)
    .join("\n");

  try {
    const rendered = await loadAndRenderSection("orchestrated", "GROUNDING_KEY_TERMS_BATCH_USER", {
      NUMBERED_REASONINGS: numberedReasonings,
    });
    if (!rendered?.content?.trim()) {
      throw new Error("Missing or empty orchestrated prompt section: GROUNDING_KEY_TERMS_BATCH_USER");
    }
    const prompt = rendered.content;

    const result = await generateText({
      model: modelInfo.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    // Parse JSON response
    let text = result.text.trim();
    text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed) && parsed.length === reasonings.length) {
      return parsed.map((terms: unknown) =>
        Array.isArray(terms) ? terms.filter((t): t is string => typeof t === "string") : []
      );
    }
  } catch (err) {
    console.warn("[extractKeyTermsBatch] LLM extraction failed; returning empty term sets", err);
  }

  // No hidden deterministic fallback.
  return reasonings.map(() => []);
}

/**
 * Extract meaningful key terms from reasoning text.
 * Uses LLM for intelligent term extraction.
 * Exported for backward compatibility with tests.
 */
export async function extractKeyTerms(reasoning: string): Promise<string[]> {
  if (!reasoning || reasoning.trim().length === 0) return [];
  const results = await extractKeyTermsBatch([reasoning]);
  return results[0] ?? [];
}

// ============================================================================
// GROUNDING CHECK
// ============================================================================

/**
 * Build a searchable text corpus from the cited evidence items.
 */
function buildEvidenceCorpus(
  evidenceIds: string[],
  allEvidence: EvidenceItem[],
): string {
  const evidenceMap = new Map(allEvidence.map(e => [e.id, e]));
  const parts: string[] = [];

  for (const id of evidenceIds) {
    const item = evidenceMap.get(id);
    if (item) {
      parts.push(item.statement);
      if (item.sourceExcerpt) parts.push(item.sourceExcerpt);
    }
  }

  return parts.join(" ").toLowerCase();
}

/**
 * Check how well a verdict's reasoning is grounded in its cited evidence.
 *
 * For each claim verdict:
 * 1. Extract key terms from the reasoning text (LLM-powered)
 * 2. Build a corpus from the cited supportingEvidenceIds
 * 3. Count how many key terms appear in the evidence corpus
 * 4. Return ratio of grounded terms / total terms
 */
export async function checkVerdictGrounding(
  claimVerdicts: ClaimVerdict[],
  allEvidence: EvidenceItem[],
): Promise<GroundingCheckResult> {
  if (!claimVerdicts || claimVerdicts.length === 0) {
    return { groundingRatio: 1, verdictDetails: [], warnings: [] };
  }

  // Batch extract key terms from all verdict reasonings in one LLM call
  const reasonings = claimVerdicts.map((v) => v.reasoning || "");
  const allKeyTerms = await extractKeyTermsBatch(reasonings);

  const verdictDetails: VerdictGroundingDetail[] = [];
  const warnings: string[] = [];
  let totalGroundedTerms = 0;
  let totalTerms = 0;

  for (let i = 0; i < claimVerdicts.length; i++) {
    const verdict = claimVerdicts[i];
    const evidenceIds = verdict.supportingEvidenceIds || [];
    const hasCitedEvidence = evidenceIds.length > 0;
    const keyTerms = allKeyTerms[i] ?? [];

    if (keyTerms.length === 0) {
      // No meaningful terms to check — consider fully grounded (trivial reasoning)
      verdictDetails.push({
        claimId: verdict.claimId,
        groundedTermCount: 0,
        totalTermCount: 0,
        ratio: 1,
        hasCitedEvidence,
      });
      continue;
    }

    if (!hasCitedEvidence) {
      // No cited evidence but has reasoning — fully ungrounded
      verdictDetails.push({
        claimId: verdict.claimId,
        groundedTermCount: 0,
        totalTermCount: keyTerms.length,
        ratio: 0,
        hasCitedEvidence: false,
      });
      totalTerms += keyTerms.length;
      warnings.push(
        `Claim ${verdict.claimId}: reasoning has ${keyTerms.length} key terms but no cited evidence`,
      );
      continue;
    }

    // Build evidence corpus and check term presence (structural)
    const corpus = buildEvidenceCorpus(evidenceIds, allEvidence);
    let groundedCount = 0;

    for (const term of keyTerms) {
      if (corpus.includes(term.toLowerCase())) {
        groundedCount++;
      }
    }

    const ratio = keyTerms.length > 0 ? groundedCount / keyTerms.length : 1;

    verdictDetails.push({
      claimId: verdict.claimId,
      groundedTermCount: groundedCount,
      totalTermCount: keyTerms.length,
      ratio,
      hasCitedEvidence: true,
    });

    totalGroundedTerms += groundedCount;
    totalTerms += keyTerms.length;

    if (ratio < 0.3) {
      warnings.push(
        `Claim ${verdict.claimId}: low grounding ratio ${(ratio * 100).toFixed(0)}% ` +
        `(${groundedCount}/${keyTerms.length} terms found in cited evidence)`,
      );
    }
  }

  const overallRatio = totalTerms > 0 ? totalGroundedTerms / totalTerms : 1;

  return {
    groundingRatio: overallRatio,
    verdictDetails,
    warnings,
  };
}

// ============================================================================
// LAYER 5: GROUNDING PENALTY (for confidence calibration)
// ============================================================================

/**
 * Apply grounding penalty to confidence.
 * If grounding ratio is below threshold, reduce confidence proportionally.
 *
 * Formula: penalty = (threshold - ratio) / (threshold - floorRatio) * reductionFactor * 100
 * The penalty is capped at reductionFactor * 100 percentage points.
 */
export function applyGroundingPenalty(
  confidence: number,
  groundingRatio: number,
  config: GroundingPenaltyConfig = DEFAULT_GROUNDING_PENALTY_CONFIG,
): { adjustedConfidence: number; penalty: number; applied: boolean } {
  if (!config.enabled || groundingRatio >= config.threshold) {
    return { adjustedConfidence: confidence, penalty: 0, applied: false };
  }

  const effectiveRatio = Math.max(config.floorRatio, groundingRatio);
  const shortfall = config.threshold - effectiveRatio;
  const range = config.threshold - config.floorRatio;
  const normalizedShortfall = range > 0 ? shortfall / range : 1;
  const penalty = Math.round(normalizedShortfall * config.reductionFactor * 100);
  const adjusted = Math.max(5, confidence - penalty);

  return { adjustedConfidence: adjusted, penalty, applied: true };
}
