/**
 * Source Reliability Service Interface
 *
 * Defines the contract between FactHarbor analyzer and the SR evaluation system.
 * This interface enables SR modularity - SR can be extracted as a standalone
 * service without breaking FactHarbor's analyzer.
 *
 * Design Principles:
 * 1. Read-only config access (getConfig returns immutable snapshot)
 * 2. Async evaluation methods (support remote SR service in future)
 * 3. No direct imports of SR internals in analyzer
 * 4. Clear separation of concerns
 *
 * Part of UCM v2.9.0 Phase 3: SR Modularity
 *
 * @module analyzer/sr-service-interface
 * @version 1.0.0
 * @date 2026-01-30
 */

// ============================================================================
// INTERFACE TYPES
// ============================================================================

/**
 * Read-only SR configuration snapshot
 * Returned by getConfig() to prevent direct modification
 */
export interface SRConfigReadOnly {
  enabled: boolean;
  confidenceThreshold: number;
  consensusThreshold: number;
  cacheTtlDays: number;
  multiModel: boolean;
  filterEnabled: boolean;
  defaultScore: number;
}

/**
 * Reliability evaluation result for a single domain
 */
export interface SREvaluation {
  domain: string;
  score: number | null;
  confidence: number;
  consensusAchieved: boolean;
  rating: string; // "highly_reliable" | "reliable" | etc.
}

/**
 * Batch prefetch result (matches existing implementation)
 */
export interface SRPrefetchResult {
  domains: string[];
  alreadyPrefetched: number;
  cacheHits: number;
  evaluated: number;
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Source Reliability Service Interface
 *
 * Defines the contract between FactHarbor and SR evaluation system.
 * Implementations must provide:
 * - Configuration access (read-only)
 * - Domain evaluation (async)
 * - Batch prefetch (async)
 * - Enabled/disabled check
 *
 * Future implementations could:
 * - Call remote SR API instead of local evaluation
 * - Use different reliability algorithms
 * - Integrate with external trust databases
 */
export interface ISRService {
  /**
   * Check if SR evaluation is enabled
   * @returns true if SR is enabled
   */
  isEnabled(): boolean;

  /**
   * Get current SR configuration (read-only snapshot)
   * @returns Immutable config object
   */
  getConfig(): SRConfigReadOnly;

  /**
   * Evaluate reliability for a single domain
   * @param url - URL to evaluate (domain will be extracted)
   * @returns Evaluation result or null if domain is skipped
   */
  evaluate(url: string): Promise<SREvaluation | null>;

  /**
   * Prefetch reliability data for multiple URLs (batch optimization)
   * @param urls - Array of URLs to prefetch
   * @returns Prefetch statistics
   */
  prefetch(urls: string[]): Promise<SRPrefetchResult>;

  /**
   * Get track record score for a domain (sync lookup from prefetched data)
   * @param url - URL to look up
   * @returns Score or null if not available
   */
  getTrackRecord(url: string): number | null;

  /**
   * Clear prefetched data (for testing or reset)
   */
  clearCache(): void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * SR service initialization options
 */
export interface SRServiceOptions {
  enabled?: boolean;
  confidenceThreshold?: number;
  consensusThreshold?: number;
  defaultScore?: number;
}

/**
 * SR evaluation statistics (for reporting)
 */
export interface SRStats {
  domainsEvaluated: number;
  cacheHits: number;
  cacheMisses: number;
  averageConfidence: number;
  consensusFailures: number;
}

// ============================================================================
// FACTORY FUNCTION TYPE
// ============================================================================

/**
 * Factory function to create SR service instance
 * Allows dependency injection and testing
 */
export type SRServiceFactory = (options?: SRServiceOptions) => ISRService;
