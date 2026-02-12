/**
 * Post-Verdict Grounding Check (M2 from Anti-Hallucination Strategy)
 *
 * Validates that verdict reasoning is grounded in cited evidence items.
 * Grounding adjudication is fully LLM-powered (AGENTS.md compliance):
 * the LLM directly rates how well reasoning traces to cited evidence.
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
  /** True when LLM adjudication failed and ratios are conservative fallback values */
  degraded?: boolean;
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
 * Build formatted evidence text for LLM grounding adjudication.
 * Returns human-readable evidence listing per verdict.
 */
function buildEvidenceText(
  evidenceIds: string[],
  allEvidence: EvidenceItem[],
): string {
  const evidenceMap = new Map(allEvidence.map(e => [e.id, e]));
  const parts: string[] = [];

  for (const id of evidenceIds) {
    const item = evidenceMap.get(id);
    if (item) {
      let text = `- ${id}: ${item.statement}`;
      if (item.sourceExcerpt) {
        text += ` [excerpt: "${item.sourceExcerpt.slice(0, 200)}"]`;
      }
      parts.push(text);
    }
  }

  return parts.join("\n");
}

/**
 * LLM-powered grounding adjudication.
 * For each verdict with cited evidence, asks the LLM to rate
 * how well the reasoning is grounded in the cited evidence.
 * Replaces the previous term-extraction + substring-matching approach.
 *
 * @returns Array of grounding ratios (0-1), one per input
 */
interface AdjudicationBatchResult {
  ratios: number[];
  degraded: boolean;
}

async function adjudicateGroundingBatch(
  inputs: Array<{ reasoning: string; evidenceText: string }>,
): Promise<AdjudicationBatchResult> {
  if (inputs.length === 0) return { ratios: [], degraded: false };

  const modelInfo = getModelForTask("extract_evidence"); // Haiku tier — fast, cheap

  const pairs = inputs
    .map((v, i) => `[${i}] Reasoning: ${v.reasoning.slice(0, 500)}\nEvidence:\n${v.evidenceText}`)
    .join("\n\n");

  try {
    const rendered = await loadAndRenderSection("orchestrated", "GROUNDING_ADJUDICATION_BATCH_USER", {
      VERDICT_EVIDENCE_PAIRS: pairs,
    });
    if (!rendered?.content?.trim()) {
      throw new Error("Missing or empty prompt section: GROUNDING_ADJUDICATION_BATCH_USER");
    }

    const result = await generateText({
      model: modelInfo.model,
      messages: [{ role: "user", content: rendered.content }],
      temperature: 0.1,
    });

    let text = result.text.trim();
    text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed) && parsed.length === inputs.length) {
      return {
        ratios: parsed.map((item: unknown) => {
          if (typeof item === "number") return Math.max(0, Math.min(1, item));
          if (typeof item === "object" && item !== null && "groundingRatio" in item) {
            const ratio = (item as { groundingRatio: unknown }).groundingRatio;
            if (typeof ratio === "number") return Math.max(0, Math.min(1, ratio));
          }
          return 0.5; // Conservative fallback for unparseable individual item
        }),
        degraded: false,
      };
    }
  } catch (err) {
    console.warn("[adjudicateGroundingBatch] LLM adjudication failed; using conservative fallback (0.5)", err);
  }

  // Degraded fallback: conservative 0.5 ratio — caller must surface degradation warning
  return { ratios: inputs.map(() => 0.5), degraded: true };
}

/**
 * Fill missing supportingEvidenceIds by reading structural evidence ID citations
 * from verdict reasoning (e.g., S1-E5). This does not infer semantics.
 */
function hydrateSupportingEvidenceIdsFromReasoning(
  claimVerdicts: ClaimVerdict[],
  allEvidence: EvidenceItem[],
): ClaimVerdict[] {
  if (!claimVerdicts.length || !allEvidence.length) return claimVerdicts;

  const evidenceIdLookup = new Map<string, string>();
  for (const item of allEvidence) {
    evidenceIdLookup.set(item.id.toUpperCase(), item.id);
  }

  return claimVerdicts.map((verdict) => {
    const hasCitations =
      Array.isArray(verdict.supportingEvidenceIds) && verdict.supportingEvidenceIds.length > 0;
    if (hasCitations) return verdict;

    const reasoning = verdict.reasoning || "";
    const cited = reasoning.match(/\bS\d+-E\d+\b/gi) || [];
    if (cited.length === 0) return verdict;

    const hydrated = Array.from(
      new Set(
        cited
          .map((id) => evidenceIdLookup.get(id.toUpperCase()))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (hydrated.length === 0) return verdict;

    return {
      ...verdict,
      supportingEvidenceIds: hydrated,
    };
  });
}

/**
 * Check how well a verdict's reasoning is grounded in its cited evidence.
 *
 * For each claim verdict:
 * 1. Hydrate any missing citations from reasoning text (structural)
 * 2. For verdicts with cited evidence: LLM rates grounding (0-1)
 * 3. For verdicts without evidence: ratio = 0 (ungrounded)
 * 4. For verdicts without reasoning: ratio = 1 (trivially grounded)
 */
export async function checkVerdictGrounding(
  claimVerdicts: ClaimVerdict[],
  allEvidence: EvidenceItem[],
): Promise<GroundingCheckResult> {
  if (!claimVerdicts || claimVerdicts.length === 0) {
    return { groundingRatio: 1, verdictDetails: [], warnings: [] };
  }

  const hydratedClaimVerdicts = hydrateSupportingEvidenceIdsFromReasoning(
    claimVerdicts,
    allEvidence,
  );

  // Categorize verdicts and prepare LLM adjudication inputs
  const adjudicationInputs: Array<{ index: number; reasoning: string; evidenceText: string }> = [];
  const verdictDetails: VerdictGroundingDetail[] = new Array(hydratedClaimVerdicts.length);
  const warnings: string[] = [];

  for (let i = 0; i < hydratedClaimVerdicts.length; i++) {
    const verdict = hydratedClaimVerdicts[i];
    const evidenceIds = verdict.supportingEvidenceIds || [];
    const hasCitedEvidence = evidenceIds.length > 0;
    const reasoning = verdict.reasoning || "";

    if (!reasoning.trim()) {
      // No reasoning — trivially grounded
      verdictDetails[i] = {
        claimId: verdict.claimId,
        groundedTermCount: 0,
        totalTermCount: 0,
        ratio: 1,
        hasCitedEvidence,
      };
      continue;
    }

    if (!hasCitedEvidence) {
      // Has reasoning but no cited evidence — fully ungrounded
      verdictDetails[i] = {
        claimId: verdict.claimId,
        groundedTermCount: 0,
        totalTermCount: 100,
        ratio: 0,
        hasCitedEvidence: false,
      };
      warnings.push(
        `Claim ${verdict.claimId}: reasoning present but no cited evidence`,
      );
      continue;
    }

    // Has both reasoning and evidence — queue for LLM adjudication
    adjudicationInputs.push({
      index: i,
      reasoning,
      evidenceText: buildEvidenceText(evidenceIds, allEvidence),
    });
  }

  // Batch LLM adjudication for all verdicts with evidence (single call)
  const adjudicationResult = adjudicationInputs.length > 0
    ? await adjudicateGroundingBatch(
        adjudicationInputs.map(v => ({ reasoning: v.reasoning, evidenceText: v.evidenceText })),
      )
    : { ratios: [], degraded: false };

  // Fill in adjudicated results
  for (let j = 0; j < adjudicationInputs.length; j++) {
    const { index } = adjudicationInputs[j];
    const verdict = hydratedClaimVerdicts[index];
    const ratio = adjudicationResult.ratios[j] ?? 0.5;

    verdictDetails[index] = {
      claimId: verdict.claimId,
      groundedTermCount: Math.round(ratio * 100),
      totalTermCount: 100,
      ratio,
      hasCitedEvidence: true,
    };

    if (ratio < 0.3) {
      warnings.push(
        `Claim ${verdict.claimId}: low grounding ratio ${(ratio * 100).toFixed(0)}%`,
      );
    }
  }

  // Overall ratio: average across all verdicts with reasoning (non-trivial)
  const nonTrivialDetails = verdictDetails.filter(d => d && d.totalTermCount > 0);
  const overallRatio = nonTrivialDetails.length > 0
    ? nonTrivialDetails.reduce((sum, d) => sum + d.ratio, 0) / nonTrivialDetails.length
    : 1;

  return {
    groundingRatio: overallRatio,
    verdictDetails: verdictDetails.filter(Boolean),
    warnings,
    degraded: adjudicationResult.degraded,
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
