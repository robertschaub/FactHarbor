/**
 * Analyzer Metrics Integration Helper
 *
 * This file provides integration points for adding metrics collection
 * to the existing analyzer.ts without major refactoring.
 *
 * Usage: Import this helper and add calls at key points in analyzer.ts
 */

import { createMetricsCollector, persistMetrics, type MetricsCollector } from './metrics';
import type { LLMCallMetric, SearchQueryMetric } from './metrics';
import type { PipelineConfig } from '../config-schemas';

// Global metrics collector (set by initializeMetrics)
let currentMetrics: MetricsCollector | null = null;

/**
 * Initialize metrics collection for an analysis job
 * Call at the START of runAnalysis()
 *
 * @param config - Optional pipeline config from unified config system
 */
export function initializeMetrics(
  jobId: string,
  pipelineVariant: 'orchestrated' | 'monolithic-canonical' | 'monolithic-dynamic',
  config?: PipelineConfig,
): void {
  currentMetrics = createMetricsCollector(jobId, pipelineVariant);

  // Set config - use pipeline config if provided, otherwise fall back to defaults
  currentMetrics.setConfig({
    llmProvider: process.env.LLM_PROVIDER || 'anthropic',
    searchProvider: process.env.FH_SEARCH_PROVIDER || 'google-cse',
    allowModelKnowledge: config
      ? config.allowModelKnowledge
      : false,
    isLLMTiering: config
      ? config.llmTiering
      : false,
    isDeterministic: config
      ? config.deterministic
      : true,
  });
}

/**
 * Start timing a phase
 * Call at the START of each major phase
 */
export function startPhase(phase: 'understand' | 'research' | 'verdict' | 'summary' | 'report'): void {
  if (currentMetrics) {
    currentMetrics.startPhase(phase);
  }
}

/**
 * End timing a phase
 * Call at the END of each major phase
 */
export function endPhase(phase: 'understand' | 'research' | 'verdict' | 'summary' | 'report'): void {
  if (currentMetrics) {
    currentMetrics.endPhase(phase);
  }
}

/**
 * Record an LLM call
 * Call AFTER each LLM generation completes
 */
export function recordLLMCall(call: LLMCallMetric): void {
  if (currentMetrics) {
    currentMetrics.recordLLMCall(call);
  }
}

/**
 * Record a search query
 * Call AFTER each search completes
 */
export function recordSearchQuery(query: SearchQueryMetric): void {
  if (currentMetrics) {
    currentMetrics.recordSearchQuery(query);
  }
}

/**
 * Record Gate 1 statistics
 * Call AFTER claim filtering completes
 */
export function recordGate1Stats(stats: {
  totalClaims: number;
  passedClaims: number;
  filteredReasons: Record<string, number>;
  centralClaimsKept: number;
}): void {
  if (currentMetrics) {
    currentMetrics.setGate1Stats({
      ...stats,
      filteredClaims: stats.totalClaims - stats.passedClaims,
    });
  }
}

/**
 * Record Gate 4 statistics
 * Call AFTER verdict confidence assessment
 */
export function recordGate4Stats(verdicts: any[]): void {
  if (!currentMetrics) return;

  const stats = {
    totalVerdicts: verdicts.length,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    insufficient: 0,
    unpublishable: 0,
  };

  for (const verdict of verdicts) {
    const conf = verdict.verdictConfidence || verdict.confidence || 0;
    if (conf >= 80) {
      stats.highConfidence++;
    } else if (conf >= 50) {
      stats.mediumConfidence++;
    } else if (conf >= 30) {
      stats.lowConfidence++;
    } else if (conf > 0) {
      stats.insufficient++;
    } else {
      stats.unpublishable++;
    }
  }

  currentMetrics.setGate4Stats(stats);
}

/**
 * Record schema compliance
 * Call AFTER major LLM generations
 */
export function recordSchemaCompliance(compliance: {
  understand?: { success: boolean; retries: number; errorType?: string };
  extractFacts?: Array<{ sourceId: string; success: boolean; retries: number; errorType?: string }>;
  verdict?: { success: boolean; retries: number; errorType?: string };
}): void {
  if (!currentMetrics) return;

  currentMetrics.setSchemaCompliance({
    understand: compliance.understand || { success: true, retries: 0 },
    extractFacts: compliance.extractFacts || [],
    verdict: compliance.verdict || { success: true, retries: 0 },
  });
}

/**
 * Record output quality metrics
 * Call AFTER analysis completes
 */
export function recordOutputQuality(result: any): void {
  if (!currentMetrics) return;

  const claims = result.claims || [];
  const contexts = result.analysisContexts || [];
  const sources = result.sources || [];

  const claimsWithVerdicts = claims.filter((c: any) => c.verdict && c.verdict !== 'UNVERIFIED').length;
  const totalFacts = claims.reduce((sum: number, c: any) => sum + (c.evidence?.length || 0), 0);
  const avgConfidence = claims.length > 0
    ? claims.reduce((sum: number, c: any) => sum + (c.verdictConfidence || 0), 0) / claims.length
    : 0;

  currentMetrics.setOutputQuality({
    claimsExtracted: claims.length,
    claimsWithVerdicts,
    scopesDetected: contexts.length,
    sourcesFound: sources.length,
    factsExtracted: totalFacts,
    averageConfidence: avgConfidence,
  });
}

/**
 * Finalize and persist metrics
 * Call at the END of runAnalysis() (in finally block)
 */
export async function finalizeMetrics(): Promise<void> {
  if (!currentMetrics) return;

  try {
    const finalMetrics = currentMetrics.finalize();
    await persistMetrics(finalMetrics);
  } catch (error) {
    console.error('Failed to persist metrics:', error);
    // Don't throw - metrics should never break analysis
  } finally {
    currentMetrics = null;
  }
}

/**
 * Helper to wrap AI SDK calls with automatic metrics recording
 */
export async function withMetrics<T>(
  taskType: LLMCallMetric['taskType'],
  provider: string,
  modelName: string,
  generateFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let schemaCompliant = false;
  let retries = 0;
  let errorMessage: string | undefined;

  try {
    const result = await generateFn();
    success = true;
    schemaCompliant = true; // Assume true if no error
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;

    recordLLMCall({
      taskType,
      provider,
      modelName,
      promptTokens: 0, // Would need to extract from result
      completionTokens: 0,
      totalTokens: 0,
      durationMs,
      success,
      schemaCompliant,
      retries,
      errorMessage,
      timestamp: new Date(),
    });
  }
}

// ============================================================================
// INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example of how to integrate into analyzer.ts:
 *
 * ```typescript
 * // At the top of analyzer.ts
 * import {
 *   initializeMetrics,
 *   startPhase,
 *   endPhase,
 *   recordLLMCall,
 *   recordGate1Stats,
 *   recordGate4Stats,
 *   recordOutputQuality,
 *   finalizeMetrics,
 * } from './analyzer/metrics-integration';
 *
 * // At start of runAnalysis()
 * initializeMetrics(jobId, 'orchestrated');
 *
 * try {
 *   // Phase 1: Understand
 *   startPhase('understand');
 *   const understanding = await understandClaim(...);
 *   endPhase('understand');
 *
 *   // Phase 2: Research
 *   startPhase('research');
 *   const sources = await findSources(...);
 *   endPhase('research');
 *
 *   // Phase 3: Verdict
 *   startPhase('verdict');
 *   const verdicts = await generateVerdicts(...);
 *   endPhase('verdict');
 *
 *   // Record quality gates
 *   recordGate1Stats({
 *     totalClaims: allClaims.length,
 *     passedClaims: filteredClaims.length,
 *     filteredReasons: { 'opinion': 2, 'prediction': 1 },
 *     centralClaimsKept: 3,
 *   });
 *
 *   recordGate4Stats(verdicts);
 *
 *   // Record final quality
 *   recordOutputQuality(result);
 *
 *   return result;
 *
 * } finally {
 *   await finalizeMetrics();
 * }
 * ```
 */
