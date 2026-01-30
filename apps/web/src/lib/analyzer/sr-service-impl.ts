/**
 * Source Reliability Service Implementation
 *
 * Default implementation of ISRService that wraps the existing
 * source-reliability module. This provides the bridge between the
 * interface (which FactHarbor depends on) and the implementation
 * (which can be extracted/replaced).
 *
 * Part of UCM v2.9.0 Phase 3: SR Modularity
 *
 * @module analyzer/sr-service-impl
 * @version 1.0.0
 * @date 2026-01-30
 */

import type {
  ISRService,
  SRConfigReadOnly,
  SREvaluation,
  SRPrefetchResult,
  SRServiceOptions,
} from "./sr-service-interface";
import {
  SR_CONFIG,
  prefetchSourceReliability,
  getTrackRecordScore,
  clearPrefetchedScores,
  extractDomain,
} from "./source-reliability";
import {
  getSRConfig,
  scoreToFactualRating,
  DEFAULT_UNKNOWN_SCORE,
} from "../source-reliability-config";

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Default SR service implementation
 * Wraps existing source-reliability module
 */
export class SRServiceImpl implements ISRService {
  private options: SRServiceOptions;

  constructor(options: SRServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Check if SR evaluation is enabled
   */
  isEnabled(): boolean {
    if (this.options.enabled !== undefined) {
      return this.options.enabled;
    }
    return SR_CONFIG.enabled;
  }

  /**
   * Get current SR configuration (read-only snapshot)
   */
  getConfig(): SRConfigReadOnly {
    const config = getSRConfig();

    return {
      enabled: this.options.enabled ?? config.enabled,
      confidenceThreshold: this.options.confidenceThreshold ?? config.confidenceThreshold,
      consensusThreshold: this.options.consensusThreshold ?? config.consensusThreshold,
      cacheTtlDays: config.cacheTtlDays,
      multiModel: config.multiModel,
      filterEnabled: config.filterEnabled,
      defaultScore: this.options.defaultScore ?? DEFAULT_UNKNOWN_SCORE,
    };
  }

  /**
   * Evaluate reliability for a single domain
   */
  async evaluate(url: string): Promise<SREvaluation | null> {
    const domain = extractDomain(url);
    if (!domain) {
      return null;
    }

    // For now, this is a sync lookup from prefetched data
    // In future, could call remote SR API here
    const score = getTrackRecordScore(url);

    if (score === null) {
      return {
        domain,
        score: null,
        confidence: 0,
        consensusAchieved: false,
        rating: "insufficient_data",
      };
    }

    return {
      domain,
      score,
      confidence: 1.0, // Currently not tracked separately
      consensusAchieved: true, // Currently not tracked separately
      rating: scoreToFactualRating(score),
    };
  }

  /**
   * Prefetch reliability data for multiple URLs
   */
  async prefetch(urls: string[]): Promise<SRPrefetchResult> {
    if (!this.isEnabled()) {
      return {
        domains: [],
        alreadyPrefetched: 0,
        cacheHits: 0,
        evaluated: 0,
      };
    }

    // Delegate to existing implementation
    return await prefetchSourceReliability(urls);
  }

  /**
   * Get track record score for a domain (sync lookup)
   */
  getTrackRecord(url: string): number | null {
    if (!this.isEnabled()) {
      return null;
    }

    return getTrackRecordScore(url);
  }

  /**
   * Clear prefetched data
   */
  clearCache(): void {
    clearPrefetchedScores();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create default SR service instance
 * This is the recommended way to obtain an SR service
 */
export function createSRService(options?: SRServiceOptions): ISRService {
  return new SRServiceImpl(options);
}

// ============================================================================
// SINGLETON (for convenience)
// ============================================================================

/**
 * Default singleton instance
 * Used by analyzer unless a custom instance is provided
 */
let defaultInstance: ISRService | null = null;

/**
 * Get default SR service instance (singleton)
 */
export function getDefaultSRService(): ISRService {
  if (!defaultInstance) {
    defaultInstance = createSRService();
  }
  return defaultInstance;
}

/**
 * Set default SR service instance (for testing/DI)
 */
export function setDefaultSRService(service: ISRService): void {
  defaultInstance = service;
}

/**
 * Reset default SR service instance (for testing)
 */
export function resetDefaultSRService(): void {
  defaultInstance = null;
}
