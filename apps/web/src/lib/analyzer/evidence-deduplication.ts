/**
 * Evidence Deduplication Module
 *
 * Handles URL and evidence statement deduplication to prevent duplicate
 * processing and improve evidence quality.
 *
 * @module analyzer/evidence-deduplication
 */

import type { EvidenceItem } from "./types";

/**
 * State interface for tracking processed URLs
 */
export interface DeduplicationState {
  processedUrls: Set<string>;
  urlDeduplicationCount: number;
}

/**
 * Evidence Deduplicator class
 *
 * Provides methods for:
 * - URL normalization and deduplication
 * - Evidence statement similarity detection
 * - LLM-driven semantic similarity checks
 */
export class EvidenceDeduplicator {
  constructor(
    private similarityThreshold: number = 0.85,
    private assessTextSimilarityBatch?: (pairs: Array<{
      id: string;
      textA: string;
      textB: string;
    }>) => Promise<Map<string, number>>
  ) {}

  /**
   * Normalize URL for deduplication by:
   * - Removing tracking parameters (utm_*, ref, source)
   * - Removing hash fragments
   * - Lowercasing and removing www prefix
   */
  normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove common tracking params
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
      for (const param of trackingParams) {
        parsed.searchParams.delete(param);
      }
      // Remove hash fragment
      parsed.hash = "";
      // Normalize hostname: lowercase and remove www prefix
      parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
      return parsed.toString().toLowerCase();
    } catch {
      // If URL parsing fails, return lowercased original
      return url.toLowerCase();
    }
  }

  /**
   * Filter search results to exclude already-processed URLs
   * Returns only new URLs and tracks them in the state
   */
  filterDuplicateUrls<T extends { url: string }>(
    results: T[],
    state: DeduplicationState
  ): T[] {
    const deduplicated: T[] = [];
    for (const result of results) {
      const normalized = this.normalizeUrl(result.url);
      if (state.processedUrls.has(normalized)) {
        state.urlDeduplicationCount++;
        console.log(`[Deduplicator] URL dedup: Skipping already-processed URL: ${result.url}`);
        continue;
      }
      state.processedUrls.add(normalized);
      deduplicated.push(result);
    }
    return deduplicated;
  }

  /**
   * Check if an evidence item is a duplicate or near-duplicate of existing items
   * Returns true if the evidence item should be skipped (is duplicate)
   */
  async isDuplicate(
    newItem: EvidenceItem,
    existingItems: EvidenceItem[],
    threshold?: number
  ): Promise<boolean> {
    const similarityThreshold = threshold ?? this.similarityThreshold;
    const newItemLower = newItem.statement.toLowerCase().trim();

    // First pass: check for exact matches (structural)
    for (const existing of existingItems) {
      if (newItemLower === existing.statement.toLowerCase().trim()) {
        return true;
      }
    }

    // Second pass: batch LLM similarity for near-duplicate detection
    if (existingItems.length === 0) return false;

    // No hidden deterministic semantic fallback.
    if (!this.assessTextSimilarityBatch) {
      console.warn("[Deduplicator] assessTextSimilarityBatch unavailable; skipping near-duplicate semantic check");
      return false;
    }

    const pairs = existingItems.map((existing, i) => ({
      id: `dup-${i}`,
      textA: newItem.statement,
      textB: existing.statement,
    }));

    const scores = await this.assessTextSimilarityBatch(pairs);
    for (let i = 0; i < existingItems.length; i++) {
      if ((scores.get(`dup-${i}`) ?? 0) >= similarityThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filter out duplicate evidence items from a list, keeping the first occurrence
   */
  async deduplicateItems(
    newEvidenceItems: EvidenceItem[],
    existingEvidenceItems: EvidenceItem[],
    threshold?: number
  ): Promise<EvidenceItem[]> {
    const result: EvidenceItem[] = [];

    for (const item of newEvidenceItems) {
      if (
        !await this.isDuplicate(item, existingEvidenceItems, threshold) &&
        !await this.isDuplicate(item, result, threshold)
      ) {
        result.push(item);
      } else {
        // Log deduplication for debugging
        console.log(`[Deduplicator] Skipping near-duplicate evidence item: "${item.statement.substring(0, 60)}..."`);
      }
    }

    return result;
  }
}

/**
 * Legacy export for backward compatibility only.
 * Do not use for analysis decisions.
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  if (words1.size === 0 || words2.size === 0) return 0;
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
