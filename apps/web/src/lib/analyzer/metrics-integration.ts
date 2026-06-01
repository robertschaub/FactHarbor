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
import type {
  FailureModeMetrics,
  LLMCallMetric,
  MetricsTelemetryContext,
  PipelineTelemetry,
  QualityHealthD5Metrics,
  QualityHealthMetrics,
  SearchQueryMetric,
  TelemetrySectionStatus,
} from './metrics';
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SEARCH_CONFIG, type PipelineConfig, type SearchConfig } from '../config-schemas';
import { getWebGitCommitHash } from '../build-info';

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

  // Neutral control-flow telemetry (post-analysis, additive). buildPipelineTelemetry
  // self-guards, but this call site sits in the analysis hot path with no outer
  // try/catch (review finding #4), so wrap defensively here too — telemetry must
  // never break analysis.
  try {
    const llmCalls = currentMetrics.getLLMCallsSnapshot();
    const telemetry = buildPipelineTelemetry(result, llmCalls);
    const context = buildMetricsTelemetryContext(result, currentMetrics.getPipelineVariant());
    currentMetrics.setPipelineTelemetry(telemetry, context);
  } catch (error) {
    console.error('[Metrics] Failed to build pipeline telemetry:', error);
  }
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
  "evidence_applicability_assessment_degraded",
  "no_checkworthy_claims",
  "claim_selection_truncated",
  "debate_provider_fallback",
]);

interface WarningShape {
  type?: string;
  severity?: string;
  details?: Record<string, unknown>;
}

export function buildFailureModeMetrics(result: any): FailureModeMetrics {
  const warnings = extractWarnings(result);

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
  const warnings = extractWarnings(result);
  const meta = result?.meta || {};

  // F4: Evidence sufficiency gate
  const f4Warnings = warnings.filter(
    w => w.type === "insufficient_evidence" || w.type === "insufficient_direct_evidence",
  );
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
    d5: buildD5QualityHealthTelemetry(warnings, totalClaims),
  };
}

/**
 * Build the D5 direct-publishability split from existing warnings. Post-analysis
 * only; no pipeline touch. Self-guarding so it can never break metrics finalization.
 */
function buildD5QualityHealthTelemetry(
  warnings: WarningShape[],
  totalClaims: number,
): QualityHealthD5Metrics {
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  try {
    const insufficientEvidenceWarnings = warnings.filter(w => w?.type === "insufficient_evidence");
    const insufficientDirectWarnings = warnings.filter(w => w?.type === "insufficient_direct_evidence");
    const degradedWarnings = warnings.filter(w => w?.type === "evidence_applicability_assessment_degraded");

    let partial = false;
    let directDirectionalEvidenceTotal = 0;
    let nonDirectDirectionalEvidenceTotal = 0;
    let totalDirectionalEvidenceTotal = 0;
    const claimDiagnostics: QualityHealthD5Metrics["claimDiagnostics"] = [];

    const addDiagnostics = (
      ws: WarningShape[],
      sufficiencyStatus: "insufficient_evidence" | "insufficient_direct_evidence",
    ) => {
      for (const w of ws) {
        const d = (w.details as Record<string, unknown> | undefined) ?? {};
        const claimId = typeof d.claimId === "string" && d.claimId.length > 0 ? d.claimId : undefined;
        const total = numOrNull(d.totalDirectionalCount);
        const direct = numOrNull(d.directDirectionalCount);
        const nonDirect = numOrNull(d.nonDirectDirectionalCount);
        if (!claimId || total === null || direct === null || nonDirect === null) {
          // Missing expected per-claim detail — don't treat absent as a clean zero.
          partial = true;
        }
        totalDirectionalEvidenceTotal += total ?? 0;
        directDirectionalEvidenceTotal += direct ?? 0;
        nonDirectDirectionalEvidenceTotal += nonDirect ?? 0;
        claimDiagnostics.push({
          claimId: claimId ?? "(unknown)",
          directApplicabilityRequired: d.directApplicabilityRequired === true,
          sufficiencyStatus,
          totalDirectionalCount: total ?? 0,
          directDirectionalCount: direct ?? 0,
          nonDirectDirectionalCount: nonDirect ?? 0,
        });
      }
    };
    addDiagnostics(insufficientEvidenceWarnings, "insufficient_evidence");
    addDiagnostics(insufficientDirectWarnings, "insufficient_direct_evidence");

    // Applicability-degraded warnings are batch-level: details carry `claimIds` (plural array).
    const degradedClaimIds = new Set<string>();
    for (const w of degradedWarnings) {
      const ids = (w.details as Record<string, unknown> | undefined)?.claimIds;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === "string" && id.length > 0) degradedClaimIds.add(id);
        }
      } else {
        partial = true;
      }
    }

    return {
      status: { available: true, partial },
      totalClaims,
      insufficientEvidenceClaims: insufficientEvidenceWarnings.length,
      insufficientDirectEvidenceClaims: insufficientDirectWarnings.length,
      applicabilityAssessmentDegradedClaims: degradedClaimIds.size,
      applicabilityAssessmentDegradedEvents: degradedWarnings.length,
      directDirectionalEvidenceTotal,
      nonDirectDirectionalEvidenceTotal,
      totalDirectionalEvidenceTotal,
      claimDiagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: { available: false, partial: false, error: message },
      totalClaims,
      insufficientEvidenceClaims: 0,
      insufficientDirectEvidenceClaims: 0,
      applicabilityAssessmentDegradedClaims: 0,
      applicabilityAssessmentDegradedEvents: 0,
      directDirectionalEvidenceTotal: 0,
      nonDirectDirectionalEvidenceTotal: 0,
      totalDirectionalEvidenceTotal: 0,
      claimDiagnostics: [],
    };
  }
}

// ============================================================================
// PIPELINE TELEMETRY BUILDER
// ============================================================================
//
// See Docs/WIP/2026-05-28_Pipeline_Telemetry_Concept_and_Plan.md and the type
// docs in metrics.ts. Pure functions over already-collected structured outputs:
// no LLM calls, no behavior change, no severity change.

const TELEMETRY_SCHEMA_VERSION = "1.0";
const CHALLENGER_DEBATE_ROLE = "challenger";
/** Stage 4 challenger invocations use this prompt key; TPM warnings carry it in details. */
const CHALLENGER_PROMPT_KEY = "VERDICT_CHALLENGER";

function sectionStatus(available: boolean, partial = false, error?: string): TelemetrySectionStatus {
  return error ? { available, partial, error } : { available, partial };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function extractWarnings(result: any): WarningShape[] {
  return Array.isArray(result?.analysisWarnings)
    ? result.analysisWarnings
    : Array.isArray(result?.warnings)
      ? result.warnings
      : [];
}

function buildContractValidationTelemetry(
  warnings: WarningShape[],
): PipelineTelemetry["contractValidation"] {
  // Occurrence-derived: neither warning carries an aggregate counter.
  const retryWarnings = warnings.filter(w => w?.type === "contract_validation_retry_triggered");
  const repairWarnings = warnings.filter(w => w?.type === "contract_repair_pass_fired");

  let failingClaimCount = 0;
  let partial = false;
  for (const w of retryWarnings) {
    const raw = (w.details as Record<string, unknown> | undefined)?.failingClaimCount;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      failingClaimCount += raw;
    } else {
      // Retry warning present but lacks a numeric failingClaimCount — do not
      // silently treat as zero (review finding #3 + "missing ≠ zero").
      partial = true;
    }
  }

  return {
    status: sectionStatus(true, partial),
    retryCount: retryWarnings.length,
    repairPassCount: repairWarnings.length,
    failingClaimCount,
    jobHadRetry: retryWarnings.length > 0,
    jobHadRepair: repairWarnings.length > 0,
  };
}

function buildVerdictDirectionTelemetry(
  warnings: WarningShape[],
): PipelineTelemetry["verdictDirection"] {
  const issueWarnings = warnings.filter(w => w?.type === "verdict_direction_issue");
  const rescueWarnings = warnings.filter(w => w?.type === "direction_rescue_plausible");
  const downgradeWarnings = warnings.filter(w => {
    if (w?.type !== "verdict_integrity_failure") return false;
    const details = (w.details as Record<string, unknown> | undefined) ?? {};
    // Prefer triggerPolicy; fall back to the legacy integrityFailureType alias.
    return details.triggerPolicy === "direction" || details.integrityFailureType === "direction";
  });

  let partial = false;
  const collectClaimIds = (ws: WarningShape[]): string[] => {
    const ids: string[] = [];
    for (const w of ws) {
      const id = (w.details as Record<string, unknown> | undefined)?.claimId;
      if (typeof id === "string" && id.length > 0) {
        ids.push(id);
      } else {
        // Cannot join sets reliably without claim IDs — section is not
        // decision-ready (review finding + plan §6).
        partial = true;
      }
    }
    return ids;
  };

  const flaggedClaimIds = uniqueStrings(collectClaimIds(issueWarnings));
  const rescuedClaimIds = uniqueStrings(collectClaimIds(rescueWarnings));
  const downgradedClaimIds = uniqueStrings(collectClaimIds(downgradeWarnings));

  const flaggedSet = new Set(flaggedClaimIds);
  const resolvedSet = new Set([...rescuedClaimIds, ...downgradedClaimIds]);
  // Review finding #5: a rescued/downgraded claim that was never flagged is a
  // join inconsistency. Mark partial so unresolved math isn't trusted blindly.
  for (const id of resolvedSet) {
    if (!flaggedSet.has(id)) {
      partial = true;
      break;
    }
  }
  const unresolvedClaimIds = flaggedClaimIds.filter(id => !resolvedSet.has(id));

  return {
    status: sectionStatus(true, partial),
    issueCount: issueWarnings.length,
    rescueCount: rescueWarnings.length,
    downgradeCount: downgradeWarnings.length,
    flaggedClaimIds,
    rescuedClaimIds,
    downgradedClaimIds,
    unresolvedClaimIds,
    unresolvedIssueCount: unresolvedClaimIds.length,
  };
}

function buildChallengerModelGuardTelemetry(
  warnings: WarningShape[],
  llmCalls: LLMCallMetric[],
  meta: Record<string, unknown>,
): PipelineTelemetry["challengerModelGuard"] {
  const challengerPhysicalCallCount = Array.isArray(llmCalls)
    ? llmCalls.filter(c => c?.debateRole === CHALLENGER_DEBATE_ROLE).length
    : 0;

  const roleModels = meta?.runtimeRoleModels as Record<string, unknown> | undefined;
  const challengerRole = roleModels && typeof roleModels === "object"
    ? (roleModels[CHALLENGER_DEBATE_ROLE] as { callCount?: unknown } | undefined)
    : undefined;
  const challengerRoleInvocationCount =
    challengerRole && typeof challengerRole.callCount === "number"
      ? challengerRole.callCount
      : 0;

  // Challenger-scoped TPM fallback warnings only (review decision #1).
  const tpmWarnings = warnings.filter(w =>
    w?.type === "llm_tpm_guard_fallback"
    && (w.details as Record<string, unknown> | undefined)?.promptKey === CHALLENGER_PROMPT_KEY,
  );
  const precheckFallbackCount = tpmWarnings.filter(
    w => (w.details as Record<string, unknown>)?.reason === "tpm_guard_precheck",
  ).length;
  const retryFallbackCount = tpmWarnings.filter(
    w => (w.details as Record<string, unknown>)?.reason === "tpm_guard_retry",
  ).length;
  const totalFallbackCount = tpmWarnings.length;

  const challengerRan = challengerPhysicalCallCount > 0 || challengerRoleInvocationCount > 0 || !!challengerRole;
  if (!challengerRan) {
    // Challenger role was not part of this job (e.g. disabled by config or never
    // reached). Absent ≠ zero-success (review finding #6).
    return {
      status: sectionStatus(false, false),
      precheckFallbackCount: 0,
      retryFallbackCount: 0,
      totalFallbackCount: 0,
      challengerRoleInvocationCount: 0,
      challengerPhysicalCallCount: 0,
      fallbackPhysicalCallRate: 0,
    };
  }

  // Fallback warnings exist but no physical-call denominator to contextualize
  // them — rate would be meaningless, so flag partial rather than emit a bogus 0.
  const partial = totalFallbackCount > 0 && challengerPhysicalCallCount === 0;
  const fallbackPhysicalCallRate =
    challengerPhysicalCallCount > 0 ? totalFallbackCount / challengerPhysicalCallCount : 0;

  return {
    status: sectionStatus(true, partial),
    precheckFallbackCount,
    retryFallbackCount,
    totalFallbackCount,
    challengerRoleInvocationCount,
    challengerPhysicalCallCount,
    fallbackPhysicalCallRate,
  };
}

/**
 * Build neutral control-flow telemetry from already-collected structured outputs.
 * Self-guarding: on any internal error it returns explicit unavailable status
 * for every section rather than throwing, because the caller runs in the
 * analysis hot path (review finding #4).
 */
export function buildPipelineTelemetry(result: any, llmCalls: LLMCallMetric[]): PipelineTelemetry {
  try {
    const warnings = extractWarnings(result);
    const meta = (result?.meta as Record<string, unknown> | undefined) ?? {};

    const contractValidation = buildContractValidationTelemetry(warnings);
    const verdictDirection = buildVerdictDirectionTelemetry(warnings);
    const challengerModelGuard = buildChallengerModelGuardTelemetry(warnings, llmCalls, meta);

    const anyPartial =
      contractValidation.status.partial
      || verdictDirection.status.partial
      || challengerModelGuard.status.partial;

    return {
      telemetrySchemaVersion: TELEMETRY_SCHEMA_VERSION,
      status: sectionStatus(true, anyPartial),
      contractValidation,
      verdictDirection,
      challengerModelGuard,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = sectionStatus(false, false, message);
    return {
      telemetrySchemaVersion: TELEMETRY_SCHEMA_VERSION,
      status: failed,
      contractValidation: {
        status: failed,
        retryCount: 0,
        repairPassCount: 0,
        failingClaimCount: 0,
        jobHadRetry: false,
        jobHadRepair: false,
      },
      verdictDirection: {
        status: failed,
        issueCount: 0,
        rescueCount: 0,
        downgradeCount: 0,
        flaggedClaimIds: [],
        rescuedClaimIds: [],
        downgradedClaimIds: [],
        unresolvedClaimIds: [],
        unresolvedIssueCount: 0,
      },
      challengerModelGuard: {
        status: failed,
        precheckFallbackCount: 0,
        retryFallbackCount: 0,
        totalFallbackCount: 0,
        challengerRoleInvocationCount: 0,
        challengerPhysicalCallCount: 0,
        fallbackPhysicalCallRate: 0,
      },
    };
  }
}

/**
 * Build cross-cutting telemetry provenance. Keeps the full
 * executedWebGitCommitHash (incl. dirty suffix) for grouping and derives a clean
 * short prefix for display / clean-commit rollups (review finding #8).
 *
 * Provenance timing seam: the web runner sets `meta.executedWebGitCommitHash`
 * AFTER `runClaimBoundaryAnalysis` returns (internal-runner-queue.ts), but this
 * builder runs INSIDE the pipeline (via recordOutputQuality). So `meta` is
 * usually empty here. We prefer the meta value when present (forward-compatible)
 * and otherwise resolve the same build hash directly from build-info — same
 * process, same source of truth the runner uses. `resolveCommit` is injectable
 * for tests. Without this fallback the persisted commit would always be empty
 * and the deploy-comparison need would be silently dead.
 */
export function buildMetricsTelemetryContext(
  result: any,
  pipelineVariant: string,
  resolveCommit: () => string | null = () => getWebGitCommitHash({ useCache: true }),
): MetricsTelemetryContext {
  const metaCommit = result?.meta?.executedWebGitCommitHash;
  const rawCommit = typeof metaCommit === "string" && metaCommit.length > 0
    ? metaCommit
    : (resolveCommit() ?? undefined);
  const commitId = typeof rawCommit === "string" && rawCommit.length > 0 ? rawCommit : undefined;
  const commitShort = commitId ? commitId.split("+")[0].slice(0, 12) : undefined;
  return {
    pipelineVariant,
    pipelineCommitId: commitId,
    pipelineCommitShort: commitShort,
    telemetryComputedAt: new Date().toISOString(),
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
    case "evidence_filter_degradation":
      return "research_filter";
    case "no_checkworthy_claims":
    case "claim_selection_truncated":
      return "claim_selection";
    case "analysis_generation_failed":
      return "report";
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
