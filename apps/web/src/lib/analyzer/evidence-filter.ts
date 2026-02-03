/**
 * Evidence Quality Filter (Phase 1.5 Layer 2)
 *
 * Deterministic post-process filter to remove low-quality evidence items
 * that slip through the LLM extraction layer.
 *
 * Two-layer enforcement strategy:
 * - Layer 1 (prompts): extract-facts-base.ts instructs LLM not to extract low-quality items
 * - Layer 2 (this file): Deterministic filter catches anything that slips through
 *
 * v2.10: Uses internal pattern set (no external lexicon config).
 *
 * @module evidence-filter
 * @since v2.8 (Phase 1.5)
 */

import type { EvidenceItem } from "./types";
import { getEvidencePatterns, countPatternMatches, matchesAnyPattern } from "./lexicon-utils";

/**
 * Configuration for probative value filtering
 */
export interface ProbativeFilterConfig {
  // Statement quality
  minStatementLength: number;        // Default: 20 characters
  maxVaguePhraseCount: number;       // Default: 2 (allow some vague phrases, but not excessive)

  // Source linkage
  requireSourceExcerpt: boolean;     // Default: true
  minExcerptLength: number;          // Default: 30 characters
  requireSourceUrl: boolean;         // Default: true

  // Deduplication (similarity threshold)
  deduplicationThreshold: number;    // Default: 0.85 (0-1, higher = more similar required to dedupe)

  // Category-specific rules
  categoryRules: {
    statistic: { requireNumber: boolean; minExcerptLength: number };
    expert_quote: { requireAttribution: boolean };
    event: { requireTemporalAnchor: boolean };
    legal_provision: { requireCitation: boolean };
  };

  // Pattern matching uses internal defaults (no external lexicon config)
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
  deduplicationThreshold: 0.85,
  categoryRules: {
    statistic: { requireNumber: true, minExcerptLength: 50 },
    expert_quote: { requireAttribution: true },
    event: { requireTemporalAnchor: true },
    legal_provision: { requireCitation: true },
  },
};

/**
 * Count vague phrases in a statement using lexicon patterns
 */
function countVaguePhrases(statement: string, patterns: RegExp[]): number {
  return countPatternMatches(statement, patterns);
}

/**
 * Check if a statement contains a number (for statistics category)
 */
function containsNumber(text: string): boolean {
  return /\d/.test(text);
}

/**
 * Check if text contains a temporal anchor (date, year, time period)
 */
function hasTemporalAnchor(text: string): boolean {
  // Year patterns
  const yearPattern = /\b(19|20)\d{2}\b/;
  // Month names
  const monthPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
  // Date patterns
  const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
  // Relative time
  const relativePattern = /\b(last|this|next)\s+(year|month|week|decade|century)\b/i;

  return yearPattern.test(text) || monthPattern.test(text) || datePattern.test(text) || relativePattern.test(text);
}

/**
 * Check if text contains citation-like patterns (for legal provisions)
 */
function hasCitation(text: string, patterns: RegExp[]): boolean {
  return matchesAnyPattern(text, patterns);
}

/**
 * Check if text contains attribution to a named person/expert
 */
function hasAttribution(text: string, patterns: RegExp[]): boolean {
  return matchesAnyPattern(text, patterns);
}

/**
 * Calculate simple text similarity (Jaccard similarity on word sets)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Filter evidence items by probative value
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

  // Compile patterns (cached)
  const patterns = getEvidencePatterns();

  const kept: EvidenceItem[] = [];
  const filtered: EvidenceItem[] = [];
  const filterReasons: Record<string, number> = {};

  const addFilterReason = (reason: string) => {
    filterReasons[reason] = (filterReasons[reason] || 0) + 1;
  };

  // First pass: Apply individual filters
  for (const item of evidence) {
    let shouldFilter = false;
    let filterReason = "";

    // 1. Minimum statement length
    if (item.fact.length < cfg.minStatementLength) {
      shouldFilter = true;
      filterReason = "statement_too_short";
    }

    // 2. Vague phrase count
    else if (countVaguePhrases(item.fact, patterns.vaguePhrases) > cfg.maxVaguePhraseCount) {
      shouldFilter = true;
      filterReason = "excessive_vague_phrases";
    }

    // 3. Source excerpt requirement
    else if (cfg.requireSourceExcerpt && (!item.sourceExcerpt || item.sourceExcerpt.length < cfg.minExcerptLength)) {
      shouldFilter = true;
      filterReason = "missing_or_short_excerpt";
    }

    // 4. Source URL requirement
    else if (cfg.requireSourceUrl && !item.sourceUrl) {
      shouldFilter = true;
      filterReason = "missing_source_url";
    }

    // 5. Category-specific rules
    // Note: Use (item.sourceExcerpt ?? "") to handle undefined when requireSourceExcerpt is false
    else if (item.category === "statistic" && cfg.categoryRules.statistic.requireNumber) {
      const excerpt = item.sourceExcerpt ?? "";
      if (!containsNumber(item.fact) && !containsNumber(excerpt)) {
        shouldFilter = true;
        filterReason = "statistic_without_number";
      } else if (excerpt.length < cfg.categoryRules.statistic.minExcerptLength) {
        shouldFilter = true;
        filterReason = "statistic_excerpt_too_short";
      }
    }

    else if (item.category === "expert_quote" && cfg.categoryRules.expert_quote.requireAttribution) {
      const excerpt = item.sourceExcerpt ?? "";
      if (!hasAttribution(item.fact, patterns.attributionPatterns) && !hasAttribution(excerpt, patterns.attributionPatterns)) {
        shouldFilter = true;
        filterReason = "expert_quote_without_attribution";
      }
    }

    else if (item.category === "event" && cfg.categoryRules.event.requireTemporalAnchor) {
      const excerpt = item.sourceExcerpt ?? "";
      if (!hasTemporalAnchor(item.fact) && !hasTemporalAnchor(excerpt)) {
        shouldFilter = true;
        filterReason = "event_without_temporal_anchor";
      }
    }

    else if (item.category === "legal_provision" && cfg.categoryRules.legal_provision.requireCitation) {
      const excerpt = item.sourceExcerpt ?? "";
      if (!hasCitation(item.fact, patterns.citationPatterns) && !hasCitation(excerpt, patterns.citationPatterns)) {
        shouldFilter = true;
        filterReason = "legal_provision_without_citation";
      }
    }

    if (shouldFilter) {
      filtered.push(item);
      addFilterReason(filterReason);
    } else {
      kept.push(item);
    }
  }

  // Second pass: Deduplication on kept items
  const dedupedKept: EvidenceItem[] = [];
  const duplicates: EvidenceItem[] = [];

  for (let i = 0; i < kept.length; i++) {
    const item = kept[i];
    let isDuplicate = false;

    // Check against already-kept items
    for (const keptItem of dedupedKept) {
      const similarity = calculateSimilarity(item.fact, keptItem.fact);
      if (similarity >= cfg.deduplicationThreshold) {
        isDuplicate = true;
        duplicates.push(item);
        addFilterReason("duplicate_or_near_duplicate");
        break;
      }
    }

    if (!isDuplicate) {
      dedupedKept.push(item);
    }
  }

  const allFiltered = [...filtered, ...duplicates];

  const stats: FilterStats = {
    total: evidence.length,
    kept: dedupedKept.length,
    filtered: allFiltered.length,
    filterReasons,
  };

  return { kept: dedupedKept, filtered: allFiltered, stats };
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
