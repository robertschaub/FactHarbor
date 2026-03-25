/**
 * Analyzer Metrics Integration Helper
 *
 * This file provides integration points for adding metrics collection
 * to the existing analyzer.ts without major refactoring.
 *
 * Usage: Import this helper and add calls at key points in analyzer.ts
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { createMetricsCollector, persistMetrics, type MetricsCollector } from './metrics';
import type { FailureModeMetrics, LLMCallMetric, QualityHealthMetrics, SearchQueryMetric } from './metrics';
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SEARCH_CONFIG, type PipelineConfig, type SearchConfig } from '../config-schemas';

/**
 * Per-job metrics isolation using AsyncLocalStorage.
 * Each concurrent analysis job gets its own MetricsCollector instance
 * scoped to its async context — overlapping jobs cannot corrupt each other's metrics.
 */
const metricsStorage = new AsyncLocalStorage<MetricsCollector>();

/** Get the MetricsCollector for the current async context (job), or null if none. */
function getJobMetrics(): MetricsCollector | null {
  return metricsStorage.getStore() ?? null;
}

/**
 * Run an analysis function with per-job metrics isolation.
 * Creates a MetricsCollector, binds it to the async context, and runs the function.
 * All metrics calls (startPhase, recordLLMCall, etc.) within the function and any
 * async callees will automatically use this job's collector.
 *
 * Replaces the old initializeMetrics() + global pattern.
 */
export async function runWithMetrics<T>(
  jobId: string,
  pipelineVariant: string,
  config: PipelineConfig | undefined,
  searchConfig: SearchConfig | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const collector = createMetricsCollector(jobId, pipelineVariant);

  const pipeline = config ?? DEFAULT_PIPELINE_CONFIG;
  const search = searchConfig ?? DEFAULT_SEARCH_CONFIG;

  collector.setConfig({
    llmProvider: pipeline.llmProvider ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic",
    searchProvider: search.provider || DEFAULT_SEARCH_CONFIG.provider,
    allowModelKnowledge: pipeline.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
    isLLMTiering: pipeline.llmTiering ?? DEFAULT_PIPELINE_CONFIG.llmTiering,
    isDeterministic: pipeline.deterministic ?? DEFAULT_PIPELINE_CONFIG.deterministic,
  });

  return metricsStorage.run(collector, fn);
}

/**
 * Start timing a phase
 * Call at the START of each major phase
 */
export function startPhase(phase: 'understand' | 'research' | 'cluster' | 'verdict' | 'aggregate'): void {
  getJobMetrics()?.startPhase(phase);
}

/**
 * End timing a phase
 * Call at the END of each major phase
 */
export function endPhase(phase: 'understand' | 'research' | 'cluster' | 'verdict' | 'aggregate'): void {
  getJobMetrics()?.endPhase(phase);
}

/**
 * Record an LLM call
 * Call AFTER each LLM generation completes
 */
export function recordLLMCall(call: LLMCallMetric): void {
  getJobMetrics()?.recordLLMCall(call);
}

/**
 * Record a search query
 * Call AFTER each search completes
 */
export function recordSearchQuery(query: SearchQueryMetric): void {
  getJobMetrics()?.recordSearchQuery(query);
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
  getJobMetrics()?.setGate1Stats({
    ...stats,
    filteredClaims: stats.totalClaims - stats.passedClaims,
  });
}

/**
 * Record Gate 4 statistics
 * Call AFTER verdict confidence assessment
 */
export function recordGate4Stats(verdicts: any[]): void {
  const currentMetrics = getJobMetrics();
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
  extractEvidence?: Array<{ sourceId: string; success: boolean; retries: number; errorType?: string }>;
  verdict?: { success: boolean; retries: number; errorType?: string };
}): void {
  const currentMetrics = getJobMetrics();
  if (!currentMetrics) return;

  currentMetrics.setSchemaCompliance({
    understand: compliance.understand || { success: true, retries: 0 },
    extractEvidence: compliance.extractEvidence || [],
    verdict: compliance.verdict || { success: true, retries: 0 },
  });
}

/**
 * Record output quality metrics
 * Call AFTER analysis completes
 */
export function recordOutputQuality(result: any): void {
  const currentMetrics = getJobMetrics();
  if (!currentMetrics) return;

  const claims = result.claims || result.claimVerdicts || [];
  // DELETED: analysisContexts handling (Phase 4 cleanup - orchestrated pipeline only)
  const sources = result.sources || [];

  const claimsWithVerdicts = claims.filter((c: any) => c.verdict && c.verdict !== 'UNVERIFIED').length;
  const totalEvidenceItems = result.evidenceItems
    ? result.evidenceItems.length
    : claims.reduce((sum: number, c: any) => sum + (c.evidence?.length || 0), 0);
  const avgConfidence = claims.length > 0
    ? claims.reduce((sum: number, c: any) => sum + (c.verdictConfidence || c.confidence || 0), 0) / claims.length
    : 0;

  currentMetrics.setOutputQuality({
    claimsExtracted: claims.length,
    claimsWithVerdicts,
    scopesDetected: 0, // DELETED: was contexts.length - orchestrated pipeline only
    sourcesFound: sources.length,
    evidenceItemsExtracted: totalEvidenceItems,
    averageConfidence: avgConfidence,
  });

  currentMetrics.setFailureModes(buildFailureModeMetrics(result));

  // Quality health metrics (F4/F5/F6 monitoring)
  currentMetrics.setQualityHealth(buildQualityHealthMetrics(result));
}

const DEGRADATION_WARNING_TYPES = new Set<string>([
  "structured_output_failure",
  "evidence_filter_degradation",
  "search_provider_error",
  "llm_provider_error",
  "grounding_check_degraded",
  "direction_validation_degraded",
  "verdict_fallback_partial",
  "verdict_partial_recovery",
  "verdict_batch_retry",
  "analysis_generation_failed",
  "debate_provider_fallback",
]);

interface WarningShape {
  type?: string;
  severity?: string;
  details?: Record<string, unknown>;
}

export function buildFailureModeMetrics(result: any): FailureModeMetrics {
  const warnings: WarningShape[] = Array.isArray(result?.analysisWarnings)
    ? result.analysisWarnings
    : Array.isArray(result?.warnings)
      ? result.warnings
      : [];

  const byProvider: FailureModeMetrics["byProvider"] = {};
  const byStage: FailureModeMetrics["byStage"] = {};
  const byTopic: FailureModeMetrics["byTopic"] = {};
  const topic = derivePrimaryTopic(result);

  let refusalEvents = 0;
  let degradationEvents = 0;

  for (const warning of warnings) {
    const warningType = warning?.type ?? "";
    const warningSeverity = normalizeWarningSeverity(warning?.severity);
    const details = warning?.details ?? {};
    const refusal = isRefusalWarning(warningType, details);
    const degradation = refusal || isDegradationWarning(warningType, warningSeverity);
    if (!refusal && !degradation) continue;

    const provider = extractProvider(details);
    const stage = extractStage(warningType, details);

    if (refusal) refusalEvents++;
    if (degradation) degradationEvents++;
    incrementCounter(byProvider, provider, refusal, degradation);
    incrementCounter(byStage, stage, refusal, degradation);
    incrementCounter(byTopic, topic, refusal, degradation);
  }

  const llmCalls = Math.max(result?.meta?.llmCalls ?? 0, 1);

  return {
    totalWarnings: warnings.length,
    refusalEvents,
    degradationEvents,
    refusalRatePer100LlmCalls: (refusalEvents / llmCalls) * 100,
    degradationRatePer100LlmCalls: (degradationEvents / llmCalls) * 100,
    byProvider,
    byStage,
    byTopic,
  };
}

function normalizeWarningSeverity(raw: unknown): "error" | "warning" | "info" | "unknown" {
  if (raw === "error" || raw === "warning" || raw === "info") return raw;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "error" || normalized === "warning" || normalized === "info") {
      return normalized;
    }
  }
  return "unknown";
}

function isDegradationWarning(
  warningType: string,
  severity: "error" | "warning" | "info" | "unknown",
): boolean {
  if (severity === "error" || severity === "warning") return true;
  if (isFallbackWarningType(warningType)) return true;
  return DEGRADATION_WARNING_TYPES.has(warningType);
}

function isFallbackWarningType(warningType: string): boolean {
  return warningType.includes("fallback");
}

function incrementCounter(
  counters: Record<string, { refusalCount: number; degradationCount: number; totalEvents: number }>,
  key: string,
  refusal: boolean,
  degradation: boolean,
): void {
  if (!counters[key]) {
    counters[key] = {
      refusalCount: 0,
      degradationCount: 0,
      totalEvents: 0,
    };
  }

  if (refusal) counters[key].refusalCount++;
  if (degradation) counters[key].degradationCount++;
  counters[key].totalEvents++;
}

export function buildQualityHealthMetrics(result: any): QualityHealthMetrics {
  const warnings: WarningShape[] = Array.isArray(result?.analysisWarnings)
    ? result.analysisWarnings
    : Array.isArray(result?.warnings)
      ? result.warnings
      : [];
  const meta = result?.meta || {};

  // F4: Evidence sufficiency gate
  const f4Warnings = warnings.filter(w => w.type === "insufficient_evidence");
  const totalClaims = meta.claimCount || 0;

  // F5: Baseless challenge enforcement
  const f5PerClaim = warnings.filter(w => w.type === "baseless_challenge_blocked");
  const f5Aggregate = warnings.find(w => w.type === "baseless_challenge_detected");
  const f5TotalAdj = (f5Aggregate?.details as any)?.totalAdjustments || 0;

  // F6: Evidence partition stats + pool imbalance
  const partitionStats = warnings.find(w => w.type === "evidence_partition_stats");
  const poolImbalance = warnings.some(w => w.type === "evidence_pool_imbalance");
  const balanceRatio = meta.evidenceBalance?.balanceRatio ?? null;

  return {
    f4_insufficientClaims: f4Warnings.length,
    f4_totalClaims: totalClaims,
    f4_rejectionRate: totalClaims > 0 ? f4Warnings.length / totalClaims : 0,
    f5_baselessBlocked: f5PerClaim.length,
    f5_totalAdjustments: f5TotalAdj,
    f5_blockRate: f5TotalAdj > 0 ? f5PerClaim.length / f5TotalAdj : 0,
    f6_partitioningActive: (partitionStats?.details as any)?.partitioningActive ?? false,
    f6_institutionalCount: (partitionStats?.details as any)?.institutionalCount ?? 0,
    f6_generalCount: (partitionStats?.details as any)?.generalCount ?? 0,
    f6_poolImbalanceDetected: poolImbalance,
    f6_balanceRatio: balanceRatio,
  };
}

function isRefusalWarning(type: string, details: Record<string, unknown>): boolean {
  if (type !== "structured_output_failure") return false;
  const reason = typeof details.reason === "string"
    ? details.reason.toLowerCase()
    : "";
  return reason.includes("refusal");
}

function extractProvider(details: Record<string, unknown>): string {
  const candidates = [
    details.provider,
    details.configuredProvider,
    details.fallbackProvider,
    details.searchProvider,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return "unknown";
}

function extractStage(type: string, details: Record<string, unknown>): string {
  const explicit = details.stage;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }

  switch (type) {
    case "structured_output_failure":
      return "stage1_pass2";
    case "search_provider_error":
      return "research_search";
    case "source_fetch_failure":
    case "source_fetch_degradation":
    case "no_successful_sources":
    case "source_acquisition_collapse":
      return "research_fetch";
    case "query_budget_exhausted":
      return "research_budget";
    case "budget_exceeded":
      return "analysis_budget";
    case "source_reliability_error":
      return "research_sr";
    case "llm_provider_error":
      return "research_llm";
    case "report_damaged":
      return "report";
    case "debate_provider_fallback":
    case "all_same_debate_tier":
    case "grounding_check_degraded":
    case "direction_validation_degraded":
    case "verdict_fallback_partial":
    case "verdict_partial_recovery":
    case "verdict_batch_retry":
    case "explanation_quality_rubric_failed":
    case "contested_verdict_range":
      return "verdict";
    default:
      return "unknown";
  }
}

function derivePrimaryTopic(result: any): string {
  if (Array.isArray(result?.claimBoundaries) && result.claimBoundaries.length > 0) {
    const first = result.claimBoundaries[0];
    const raw = first?.shortName ?? first?.name;
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 60);
    }
  }
  return "unknown";
}

/**
 * Finalize and persist metrics
 * Call at the END of runAnalysis() (in finally block)
 */
export async function finalizeMetrics(): Promise<void> {
  const currentMetrics = getJobMetrics();
  if (!currentMetrics) return;

  try {
    const finalMetrics = currentMetrics.finalize();
    await persistMetrics(finalMetrics);
  } catch (error) {
    console.error('Failed to persist metrics:', error);
    // Don't throw - metrics should never break analysis
  }
  // No need to null-out — the AsyncLocalStorage context ends when runWithMetrics() returns.
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
 * Example of how to integrate metrics into a pipeline:
 *
 * ```typescript
 * import { runWithMetrics, startPhase, endPhase, finalizeMetrics } from './metrics-integration';
 *
 * return runWithMetrics(jobId, 'claimboundary', config, searchConfig, async () => {
 *   try {
 *     startPhase('understand');
 *     // ... analysis work ...
 *     endPhase('understand');
 *     return result;
 *   } finally {
 *     await finalizeMetrics();
 *   }
 * });
 * ```
 *
 * All metrics functions (startPhase, recordLLMCall, etc.) automatically use
 * the per-job collector from AsyncLocalStorage — no jobId threading needed.
 */
