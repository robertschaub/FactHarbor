/**
 * Evidence Quality Filter — Structural Safety Net
 *
 * Deterministic STRUCTURAL filters only. All semantic quality assessment
 * (vague phrases, attribution, citations, temporal anchors, dedup) is handled
 * by the LLM evidence quality service (assessEvidenceQuality) which runs
 * before this filter in the pipeline.
 *
 * This filter catches structural issues the LLM cannot assess:
 * - Opinion sources (metadata field check)
 * - Low probativeValue (LLM-assigned field check)
 * - Statement/excerpt length (character count)
 * - Missing source URL (presence check)
 * - Statistics without numbers (digit presence check)
 *
 * @module evidence-filter
 * @since v2.8 (Phase 1.5), migrated v3.0 (LLM Intelligence Migration Phase 1)
 */

import type { EvidenceItem } from "./types";

/**
 * Configuration for probative value filtering.
 *
 * Note: `maxVaguePhraseCount` and category-specific semantic rules
 * (expert_quote attribution, event temporal, legal_provision citation)
 * are retained for config backward compatibility but no longer consumed
 * by the deterministic filter — these checks are now handled by the
 * LLM evidence quality service (assessEvidenceQuality).
 */
export interface ProbativeFilterConfig {
  // Statement quality
  minStatementLength: number;        // Default: 20 characters
  maxVaguePhraseCount: number;       // Retained for config compat; handled by LLM

  // Source linkage
  requireSourceExcerpt: boolean;     // Default: true
  minExcerptLength: number;          // Default: 30 characters
  requireSourceUrl: boolean;         // Default: true

  // Deduplication (similarity threshold)
  deduplicationThreshold: number;    // Retained for config compat; dedup handled by LLM

  // Category-specific rules
  categoryRules: {
    statistic: { requireNumber: boolean; minExcerptLength: number };
    expert_quote: { requireAttribution: boolean };  // Handled by LLM
    event: { requireTemporalAnchor: boolean };      // Handled by LLM
    legal_provision: { requireCitation: boolean };   // Handled by LLM
  };
}

/**
 * Statistics returned by the filter
 */
export interface FilterStats {
  total: number;
  kept: number;
  filtered: number;
  filterReasons: Record<string, number>;  // Count by reason
}

/**
 * Default filter configuration
 */
export const DEFAULT_FILTER_CONFIG: ProbativeFilterConfig = {
  minStatementLength: 20,
  maxVaguePhraseCount: 2,
  requireSourceExcerpt: true,
  minExcerptLength: 30,
  requireSourceUrl: true,
  deduplicationThreshold: 0.75,
  categoryRules: {
    statistic: { requireNumber: true, minExcerptLength: 50 },
    expert_quote: { requireAttribution: true },
    event: { requireTemporalAnchor: true },
    legal_provision: { requireCitation: true },
  },
};

/**
 * Check if a statement contains a number (for statistics category).
 * This is a structural format check (digit presence), not semantic interpretation.
 */
function containsNumber(text: string): boolean {
  return /\d/.test(text);
}

/**
 * Filter evidence items by structural quality criteria.
 *
 * Semantic quality assessment (vague phrases, attribution, citations,
 * temporal anchors, near-duplicate detection) is handled by the LLM
 * evidence quality service (assessEvidenceQuality) which runs before
 * this filter in the pipeline.
 *
 * @param evidence - Array of evidence items to filter
 * @param config - Filter configuration (uses defaults if not provided)
 * @returns Object with kept items, filtered items, and statistics
 */
export function filterByProbativeValue(
  evidence: EvidenceItem[],
  config: Partial<ProbativeFilterConfig> = {}
): { kept: EvidenceItem[]; filtered: EvidenceItem[]; stats: FilterStats } {
  const cfg: ProbativeFilterConfig = {
    ...DEFAULT_FILTER_CONFIG,
    ...config,
    categoryRules: {
      ...DEFAULT_FILTER_CONFIG.categoryRules,
      ...(config.categoryRules ?? {}),
    },
  };

  const kept: EvidenceItem[] = [];
  const filtered: EvidenceItem[] = [];
  const filterReasons: Record<string, number> = {};

  const addFilterReason = (reason: string) => {
    filterReasons[reason] = (filterReasons[reason] || 0) + 1;
  };

  for (const item of evidence) {
    let shouldFilter = false;
    let filterReason = "";

    // 0. Filter opinion sources (metadata field check — structural)
    if (item.sourceAuthority === "opinion") {
      shouldFilter = true;
      filterReason = "opinion_source";
    }

    // 1. Filter low probativeValue (LLM-assigned field check — structural)
    else if (item.probativeValue === "low") {
      shouldFilter = true;
      filterReason = "low_probative_value";
    }

    // 2. Minimum statement length (character count — structural)
    else if (item.statement.length < cfg.minStatementLength) {
      shouldFilter = true;
      filterReason = "statement_too_short";
    }

    // 3. Source excerpt requirement (presence + length — structural)
    else if (cfg.requireSourceExcerpt && (!item.sourceExcerpt || item.sourceExcerpt.length < cfg.minExcerptLength)) {
      shouldFilter = true;
      filterReason = "missing_or_short_excerpt";
    }

    // 4. Source URL requirement (presence — structural)
    else if (cfg.requireSourceUrl && !item.sourceUrl) {
      shouldFilter = true;
      filterReason = "missing_source_url";
    }

    // 5. Statistics: must contain numbers (digit presence — structural)
    else if (item.category === "statistic" && cfg.categoryRules.statistic.requireNumber) {
      const excerpt = item.sourceExcerpt ?? "";
      if (!containsNumber(item.statement) && !containsNumber(excerpt)) {
        shouldFilter = true;
        filterReason = "statistic_without_number";
      } else if (excerpt.length < cfg.categoryRules.statistic.minExcerptLength) {
        shouldFilter = true;
        filterReason = "statistic_excerpt_too_short";
      }
    }

    // Semantic checks (vague phrases, attribution, citations, temporal anchors)
    // and near-duplicate detection are handled by the LLM evidence quality
    // service (assessEvidenceQuality) which runs before this filter.

    if (shouldFilter) {
      filtered.push(item);
      addFilterReason(filterReason);
    } else {
      kept.push(item);
    }
  }

  const stats: FilterStats = {
    total: evidence.length,
    kept: kept.length,
    filtered: filtered.length,
    filterReasons,
  };

  return { kept, filtered, stats };
}

/**
 * Calculate false positive rate by checking how many "high" probativeValue items were filtered
 *
 * @param filtered - Filtered evidence items
 * @returns False positive rate (0-1)
 */
export function calculateFalsePositiveRate(filtered: EvidenceItem[]): number {
  if (filtered.length === 0) return 0;

  const highProbativeFiltered = filtered.filter((item) => item.probativeValue === "high");

  return highProbativeFiltered.length / filtered.length;
}
