/**
 * Text Analysis Service
 *
 * Main entry point for text analysis functionality.
 * Provides factory function to get the LLM-only implementation.
 *
 * @module analyzer/text-analysis-service
 * @version 1.0.0
 */

import { ITextAnalysisService, AnalysisPoint, TextAnalysisMetrics } from "./text-analysis-types";
import { LLMTextAnalysisService, llmTextAnalysisService } from "./text-analysis-llm";

// Re-export types for convenience
export * from "./text-analysis-types";
export { LLMTextAnalysisService, llmTextAnalysisService } from "./text-analysis-llm";

// ============================================================================
// CONFIG SURFACE
// ============================================================================

/**
 * Pipeline config subset for text analysis configuration.
 * Retained for compatibility with existing callers.
 */
export interface TextAnalysisConfig {
  // Placeholder for future per-point tuning (all points are LLM-only).
  // This interface remains to avoid breaking callers until pipeline.v2 lands.
}

/**
 * Check if LLM is enabled for a specific analysis point.
 *
 * @param analysisPoint - The analysis point to check
 * @param config - Optional pipeline config (UCM Phase 1)
 */
export function isLLMEnabled(
  analysisPoint: AnalysisPoint,
  _config?: TextAnalysisConfig,
): boolean {
  void analysisPoint;
  return true;
}

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

/** Service implementation type */
export type ServiceImplementation = "llm";

/** Service registry for dependency injection */
const serviceRegistry: {
  llm: ITextAnalysisService;
} = {
  llm: llmTextAnalysisService,
};

/**
 * Register a service implementation.
 * Used for dependency injection and testing.
 */
export function registerService(
  type: ServiceImplementation,
  service: ITextAnalysisService,
): void {
  serviceRegistry[type] = service;
}

/**
 * Get the text analysis service based on configuration.
 *
 * @param config - Optional pipeline config (UCM Phase 1)
 */
export function getTextAnalysisService(config?: TextAnalysisConfig): ITextAnalysisService {
  void config;
  return serviceRegistry.llm;
}

/**
 * Get a specific service implementation (for testing/debugging).
 */
export function getServiceByType(type: ServiceImplementation): ITextAnalysisService {
  return serviceRegistry[type];
}

// ============================================================================
// TELEMETRY
// ============================================================================

/** Metrics collection for text analysis operations */
const metricsBuffer: TextAnalysisMetrics[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Record metrics for a text analysis operation.
 */
export function recordMetrics(metrics: TextAnalysisMetrics): void {
  metricsBuffer.push(metrics);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift(); // Remove oldest
  }
}

/**
 * Get recent metrics for monitoring.
 */
export function getRecentMetrics(count: number = 100): TextAnalysisMetrics[] {
  return metricsBuffer.slice(-count);
}

/**
 * Calculate aggregate metrics.
 */
export function getAggregateMetrics(): {
  totalCalls: number;
  successRate: number;
  fallbackRate: number;
  avgLatencyMs: number;
  byAnalysisPoint: Record<AnalysisPoint, { calls: number; successRate: number }>;
} {
  if (metricsBuffer.length === 0) {
    return {
      totalCalls: 0,
      successRate: 0,
      fallbackRate: 0,
      avgLatencyMs: 0,
      byAnalysisPoint: {
        input: { calls: 0, successRate: 0 },
        evidence: { calls: 0, successRate: 0 },
        scope: { calls: 0, successRate: 0 },
        verdict: { calls: 0, successRate: 0 },
      },
    };
  }

  const totalCalls = metricsBuffer.length;
  const successCount = metricsBuffer.filter((m) => m.success).length;
  const fallbackCount = metricsBuffer.filter((m) => m.usedFallback).length;
  const totalLatency = metricsBuffer.reduce((sum, m) => sum + m.latencyMs, 0);

  const byPoint: Record<AnalysisPoint, { calls: number; successes: number }> = {
    input: { calls: 0, successes: 0 },
    evidence: { calls: 0, successes: 0 },
    scope: { calls: 0, successes: 0 },
    verdict: { calls: 0, successes: 0 },
  };

  for (const m of metricsBuffer) {
    byPoint[m.analysisPoint].calls++;
    if (m.success) byPoint[m.analysisPoint].successes++;
  }

  return {
    totalCalls,
    successRate: successCount / totalCalls,
    fallbackRate: fallbackCount / totalCalls,
    avgLatencyMs: totalLatency / totalCalls,
    byAnalysisPoint: {
      input: {
        calls: byPoint.input.calls,
        successRate: byPoint.input.calls > 0 ? byPoint.input.successes / byPoint.input.calls : 0,
      },
      evidence: {
        calls: byPoint.evidence.calls,
        successRate: byPoint.evidence.calls > 0 ? byPoint.evidence.successes / byPoint.evidence.calls : 0,
      },
      scope: {
        calls: byPoint.scope.calls,
        successRate: byPoint.scope.calls > 0 ? byPoint.scope.successes / byPoint.scope.calls : 0,
      },
      verdict: {
        calls: byPoint.verdict.calls,
        successRate: byPoint.verdict.calls > 0 ? byPoint.verdict.successes / byPoint.verdict.calls : 0,
      },
    },
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

/** Default service instance */
export default getTextAnalysisService();
