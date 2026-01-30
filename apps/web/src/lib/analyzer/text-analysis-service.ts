/**
 * Text Analysis Service
 *
 * Main entry point for text analysis functionality.
 * Provides factory function to get the appropriate service implementation
 * based on feature flags and configuration.
 *
 * @module analyzer/text-analysis-service
 * @version 1.0.0
 */

import {
  ITextAnalysisService,
  AnalysisPoint,
  TextAnalysisMetrics,
  DEFAULT_PARSE_CONFIG,
  ParseConfig,
} from "./text-analysis-types";
import { HeuristicTextAnalysisService, heuristicTextAnalysisService } from "./text-analysis-heuristic";
import { LLMTextAnalysisService, llmTextAnalysisService } from "./text-analysis-llm";
import { HybridTextAnalysisService, hybridTextAnalysisService } from "./text-analysis-hybrid";

// Re-export types for convenience
export * from "./text-analysis-types";
export { HeuristicTextAnalysisService, heuristicTextAnalysisService } from "./text-analysis-heuristic";
export { LLMTextAnalysisService, llmTextAnalysisService } from "./text-analysis-llm";
export { HybridTextAnalysisService, hybridTextAnalysisService } from "./text-analysis-hybrid";

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/** Feature flag environment variables
 * Default: true (LLM enabled) - set to "false" to disable
 * v2.8.3: Changed defaults from false to true after prompt-code alignment
 */
const FEATURE_FLAGS = {
  inputClassification: process.env.FH_LLM_INPUT_CLASSIFICATION !== "false",
  evidenceQuality: process.env.FH_LLM_EVIDENCE_QUALITY !== "false",
  scopeSimilarity: process.env.FH_LLM_SCOPE_SIMILARITY !== "false",
  verdictValidation: process.env.FH_LLM_VERDICT_VALIDATION !== "false",
} as const;

/** Check if LLM is enabled for a specific analysis point */
export function isLLMEnabled(analysisPoint: AnalysisPoint): boolean {
  switch (analysisPoint) {
    case "input":
      return FEATURE_FLAGS.inputClassification;
    case "evidence":
      return FEATURE_FLAGS.evidenceQuality;
    case "scope":
      return FEATURE_FLAGS.scopeSimilarity;
    case "verdict":
      return FEATURE_FLAGS.verdictValidation;
    default:
      return false;
  }
}

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

/** Service implementation type */
export type ServiceImplementation = "heuristic" | "llm" | "hybrid";

/** Service registry for dependency injection */
const serviceRegistry: {
  heuristic: ITextAnalysisService;
  llm: ITextAnalysisService;
  hybrid: ITextAnalysisService;
} = {
  heuristic: heuristicTextAnalysisService,
  llm: llmTextAnalysisService,
  hybrid: hybridTextAnalysisService,
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
 * Priority:
 * 1. If any LLM feature flag is enabled, use hybrid (LLM with heuristic fallback)
 * 2. Otherwise, use pure heuristic
 *
 * The hybrid service checks per-analysis-point feature flags internally,
 * so it will use heuristics for disabled points and LLM for enabled ones.
 */
export function getTextAnalysisService(): ITextAnalysisService {
  const anyLLMEnabled = Object.values(FEATURE_FLAGS).some(Boolean);

  if (anyLLMEnabled) {
    // Use hybrid service - it handles per-point feature flag checks
    return serviceRegistry.hybrid;
  }

  // No LLM enabled - use pure heuristic for best performance
  return serviceRegistry.heuristic;
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
