/**
 * Political Bias Calibration — Runner
 *
 * Executes mirrored claim pairs through the CB pipeline,
 * captures results, and computes bias metrics.
 *
 * @module calibration/runner
 */

import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";
import {
  loadPipelineConfig,
  loadSearchConfig,
  loadCalcConfig,
} from "@/lib/config-loader";
import { DEBATE_PROFILES, type PipelineConfig } from "@/lib/config-schemas";
import { getActiveSearchProviders } from "@/lib/web-search";
import { computePairMetrics, computeAggregateMetrics } from "./metrics";
import type {
  BiasPair,
  SideResult,
  PairResult,
  CalibrationRunResult,
  CalibrationThresholds,
} from "./types";
import { DEFAULT_CALIBRATION_THRESHOLDS } from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

export interface RunOptions {
  mode: "quick" | "full" | "targeted";
  targetDomain?: string;
  targetLanguage?: string;
  thresholds?: Partial<CalibrationThresholds>;
  fixtureFile?: string;
  fixtureVersion?: string;
  onProgress?: (
    message: string,
    pairIndex: number,
    totalPairs: number,
  ) => void;
}

/**
 * Run the political bias calibration harness.
 *
 * Executes both sides of each pair through the full CB pipeline,
 * computes per-pair and aggregate bias metrics.
 */
export async function runCalibration(
  pairs: BiasPair[],
  options: RunOptions,
): Promise<CalibrationRunResult> {
  const thresholds: CalibrationThresholds = {
    ...DEFAULT_CALIBRATION_THRESHOLDS,
    ...options.thresholds,
  };

  // Filter pairs based on mode
  const activePairs = filterPairs(pairs, options);

  // Snapshot config at start (for reproducibility)
  const configSnapshot = await captureConfigSnapshot();

  // Run pairs sequentially (avoids search provider contention)
  const pairResults: PairResult[] = [];

  for (let i = 0; i < activePairs.length; i++) {
    const pair = activePairs[i];
    options.onProgress?.(
      `Running pair ${i + 1}/${activePairs.length}: ${pair.id}`,
      i,
      activePairs.length,
    );

    try {
      const leftResult = await runSide(pair, "left");
      const rightResult = await runSide(pair, "right");
      const metrics = computePairMetrics(leftResult, rightResult, pair, thresholds);

      pairResults.push({
        pairId: pair.id,
        pair,
        status: "completed",
        left: leftResult,
        right: rightResult,
        metrics,
      });

      options.onProgress?.(
        `Pair ${pair.id}: skew=${metrics.directionalSkew.toFixed(1)} pp, ${metrics.passed ? "PASS" : "FAIL"}`,
        i + 1,
        activePairs.length,
      );
    } catch (err) {
      console.error(`[Calibration] Pair ${pair.id} failed:`, err);
      const message = err instanceof Error ? err.message : String(err);
      pairResults.push({
        pairId: pair.id,
        pair,
        status: "failed",
        error: message,
      });
      options.onProgress?.(
        `Pair ${pair.id}: FAILED (${message})`,
        i + 1,
        activePairs.length,
      );
    }
  }

  const aggregateMetrics = computeAggregateMetrics(pairResults, thresholds);
  const pairsCompleted = pairResults.filter((r) => r.status === "completed").length;
  const pairsFailed = pairResults.length - pairsCompleted;

  return {
    runId: generateRunId(),
    timestamp: new Date().toISOString(),
    runMode: options.mode,
    configSnapshot,
    pairResults,
    aggregateMetrics,
    metadata: {
      fixtureFile: options.fixtureFile ?? "bias-pairs.json",
      fixtureVersion: options.fixtureVersion ?? "1.0.0",
      pairsRequested: activePairs.length,
      pairsCompleted,
      pairsFailed,
      pairsSkipped: 0,
      mode: options.mode,
      targetDomain: options.targetDomain,
      targetLanguage: options.targetLanguage,
      schemaVersion: "calibration-1.0",
    },
    thresholds,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function filterPairs(pairs: BiasPair[], options: RunOptions): BiasPair[] {
  if (options.mode === "quick") {
    // One pair per domain, English only
    const seen = new Set<string>();
    return pairs
      .filter((p) => {
        if (p.language !== "en" || seen.has(p.domain)) return false;
        seen.add(p.domain);
        return true;
      })
      .slice(0, 4);
  }

  if (options.mode === "targeted") {
    return pairs.filter((p) => {
      if (options.targetDomain && p.domain !== options.targetDomain) return false;
      if (options.targetLanguage && p.language !== options.targetLanguage)
        return false;
      return true;
    });
  }

  // "full" mode — all pairs
  return pairs;
}

async function captureConfigSnapshot(): Promise<
  CalibrationRunResult["configSnapshot"]
> {
  const [pipelineResult, searchResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
    loadCalcConfig("default"),
  ]);

  const pipelineConfig = pipelineResult.config as PipelineConfig;
  const searchConfig = searchResult.config as { provider?: string };

  return {
    pipeline: pipelineResult.config as unknown as Record<string, unknown>,
    search: searchResult.config as unknown as Record<string, unknown>,
    calculation: calcResult.config as unknown as Record<string, unknown>,
    configHashes: {
      pipeline: pipelineResult.contentHash,
      search: searchResult.contentHash,
      calculation: calcResult.contentHash,
    },
    resolvedLLM: resolveLLMConfig(pipelineConfig),
    resolvedSearch: resolveSearchConfig(searchConfig),
  };
}

/**
 * Resolve the full LLM configuration including per-role debate models.
 * Applies the same resolution logic as the pipeline:
 *   1. Explicit debateModelTiers / debateModelProviders
 *   2. debateProfile preset
 *   3. Hardcoded defaults
 */
function resolveLLMConfig(config: PipelineConfig): CalibrationRunResult["configSnapshot"]["resolvedLLM"] {
  const provider = config.llmProvider ?? "anthropic";
  const tiering = config.llmTiering ?? false;
  const modelUnderstand = config.modelUnderstand ?? "claude-haiku-4-5-20251001";
  const modelExtractEvidence = config.modelExtractEvidence ?? "claude-haiku-4-5-20251001";
  const modelVerdict = config.modelVerdict ?? "claude-sonnet-4-5-20250929";
  const debateProfile = (config.debateProfile ?? "baseline") as string;

  // Resolve debate role tiers and providers from profile + explicit overrides
  const profile = DEBATE_PROFILES[debateProfile as keyof typeof DEBATE_PROFILES] ?? DEBATE_PROFILES.baseline;
  const explicitTiers = config.debateModelTiers;
  const explicitProviders = config.debateModelProviders;

  const roles = ["advocate", "selfConsistency", "challenger", "reconciler", "validation"] as const;
  const debateRoles: Record<string, { tier: string; provider: string; model: string }> = {};

  for (const role of roles) {
    const tier = explicitTiers?.[role] ?? profile.tiers[role] ?? "sonnet";
    const roleProvider = explicitProviders?.[role] ?? profile.providers[role] ?? provider;
    const model = resolveModelName(tier, roleProvider, tiering, modelUnderstand, modelVerdict);
    debateRoles[role] = { tier, provider: roleProvider, model };
  }

  return {
    provider,
    tiering,
    models: { understand: modelUnderstand, extractEvidence: modelExtractEvidence, verdict: modelVerdict },
    debateProfile,
    debateRoles,
  };
}

/**
 * Resolve a model name from tier + provider, matching getModelForTask() / defaultModelNameForTask() logic.
 */
function resolveModelName(
  tier: string,
  roleProvider: string,
  tiering: boolean,
  modelUnderstand: string,
  modelVerdict: string,
): string {
  const isPremium = tier === "sonnet";
  const p = (roleProvider || "").toLowerCase();

  if (p === "anthropic" || p === "claude") {
    // When tiering is off, all tasks use the verdict (premium) model
    if (!tiering) return modelVerdict;
    return isPremium ? modelVerdict : modelUnderstand;
  }
  if (p === "openai") return isPremium ? "gpt-4.1" : "gpt-4.1-mini";
  if (p === "google" || p === "gemini") return isPremium ? "gemini-2.5-pro" : "gemini-2.5-flash";
  if (p === "mistral") return isPremium ? "mistral-large-latest" : "mistral-small-latest";
  return isPremium ? modelVerdict : modelUnderstand;
}

/**
 * Resolve active search providers from env vars + config.
 */
function resolveSearchConfig(searchConfig: { provider?: string }): CalibrationRunResult["configSnapshot"]["resolvedSearch"] {
  const providerMode = searchConfig.provider ?? "auto";
  const configuredProviders = getActiveSearchProviders(searchConfig as any);
  return { providerMode, configuredProviders };
}

/**
 * Run one side of a bias pair through the full CB pipeline.
 */
async function runSide(
  pair: BiasPair,
  side: "left" | "right",
): Promise<SideResult> {
  const claim = side === "left" ? pair.leftClaim : pair.rightClaim;
  const startMs = Date.now();

  const result = await runClaimBoundaryAnalysis({
    inputValue: claim,
    inputType: "text",
  });

  const durationMs = Date.now() - startMs;
  const rj = result.resultJson;

  return extractSideResult(claim, side, rj, durationMs);
}

/**
 * Extract structured SideResult from pipeline resultJson.
 */
function extractSideResult(
  claim: string,
  side: "left" | "right",
  rj: Record<string, any>,
  durationMs: number,
): SideResult {
  // Core verdicts
  const truthPercentage: number = rj.truthPercentage ?? 50;
  const confidence: number = rj.confidence ?? 0;
  const verdict: string = rj.verdict ?? "UNVERIFIED";

  // Claim verdicts
  const claimVerdicts = (rj.claimVerdicts ?? []).map((cv: any) => ({
    claimId: cv.claimId ?? cv.id ?? "",
    claimText: cv.claimText ?? "",
    truthPercentage: cv.truthPercentage ?? 50,
    confidence: cv.confidence ?? 0,
    verdict: cv.verdict ?? "UNVERIFIED",
    boundaryFindings: (cv.boundaryFindings ?? []).map((bf: any) => ({
      boundaryId: bf.boundaryId ?? "",
      boundaryName: bf.boundaryName ?? "",
      truthPercentage: bf.truthPercentage ?? 50,
      evidenceDirection: bf.evidenceDirection ?? "neutral",
      evidenceCount: bf.evidenceCount ?? 0,
    })),
    consistencySpread: cv.consistencyResult?.spread,
    consistencyStable: cv.consistencyResult?.stable,
  }));

  // Evidence pool
  const evidenceItems: any[] = rj.evidenceItems ?? [];
  const supporting = evidenceItems.filter(
    (e: any) => e.claimDirection === "supports",
  ).length;
  const contradicting = evidenceItems.filter(
    (e: any) => e.claimDirection === "contradicts",
  ).length;
  const neutral = evidenceItems.filter(
    (e: any) =>
      e.claimDirection === "neutral" ||
      e.claimDirection === "contextual" ||
      !e.claimDirection,
  ).length;
  const directional = supporting + contradicting;
  const supportRatio = directional > 0 ? supporting / directional : 0.5;

  // Sources
  const sources: any[] = rj.sources ?? [];
  const uniqueDomains = new Set(
    sources.map((s: any) => {
      try {
        return new URL(s.url).hostname;
      } catch {
        return s.url;
      }
    }),
  ).size;

  // Quality gates
  const qg = rj.qualityGates ?? {};
  const gate1Stats = {
    total: qg.gate1Stats?.total ?? 0,
    passed: qg.gate1Stats?.passed ?? 0,
    filtered: qg.gate1Stats?.filtered ?? 0,
  };
  const gate4Stats = {
    total: qg.gate4Stats?.total ?? 0,
    highConfidence: qg.gate4Stats?.highConfidence ?? 0,
    insufficient: qg.gate4Stats?.insufficient ?? 0,
  };

  // Warnings (CB pipeline uses analysisWarnings; keep warnings as backward fallback)
  const rawWarnings = Array.isArray(rj.analysisWarnings)
    ? rj.analysisWarnings
    : Array.isArray(rj.warnings)
      ? rj.warnings
      : [];
  const warnings = rawWarnings.map((w: any) => ({
    type: w.type ?? "",
    severity: w.severity ?? "info",
    message: w.message ?? "",
    details:
      w.details && typeof w.details === "object"
        ? (w.details as Record<string, unknown>)
        : undefined,
  }));

  return {
    claim,
    side,
    truthPercentage,
    confidence,
    verdict,
    claimVerdicts,
    evidencePool: {
      totalItems: evidenceItems.length,
      supporting,
      contradicting,
      neutral,
      supportRatio,
    },
    sourceCount: sources.length,
    uniqueDomains,
    gate1Stats,
    gate4Stats,
    llmCalls: rj.meta?.llmCalls ?? 0,
    searchQueries: (rj.searchQueries ?? []).length,
    durationMs,
    modelsUsed: rj.meta?.modelsUsed ?? {},
    warnings,
    fullResultJson: rj,
  };
}

function generateRunId(): string {
  // Simple timestamp-based ID (no uuid dependency needed)
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `cal-${now}-${rand}`;
}
