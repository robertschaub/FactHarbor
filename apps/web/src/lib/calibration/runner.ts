/**
 * Framing Symmetry Calibration — Runner
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
import type { PipelineConfig } from "@/lib/config-schemas";
import {
  isModelTier,
  normalizeLLMProvider,
  normalizeToStrength,
  resolveModel,
  type ModelStrength,
} from "@/lib/analyzer/model-resolver";
import type { LLMProviderType } from "@/lib/analyzer/types";
import { getActiveSearchProviders } from "@/lib/web-search";
import { computePairMetrics, computeAggregateMetrics } from "./metrics";
import type {
  BiasPair,
  CalibrationWarning,
  SideResult,
  PairResult,
  CalibrationRunResult,
  CalibrationThresholds,
  PairFailureDiagnostics,
} from "./types";
import { DEFAULT_CALIBRATION_THRESHOLDS } from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

export interface RunOptions {
  mode: "quick" | "full" | "targeted";
  runIntent: "gate" | "smoke";
  /** Stop execution if cumulative cost exceeds this budget (USD). Default $5.00 */
  maxBudgetUSD?: number;
  /** Stop the run after the first failed pair. Default false (continue-on-failure). */
  stopOnFirstFailure?: boolean;
  targetDomain?: string;
  targetLanguage?: string;
  /** Run only a single pair by ID (overrides mode filtering). */
  targetPairId?: string;
  thresholds?: Partial<CalibrationThresholds>;
  fixtureFile?: string;
  fixtureVersion?: string;
  onProgress?: (
    message: string,
    pairIndex: number,
    totalPairs: number,
  ) => void;
  /**
   * Optional checkpoint callback invoked after each pair (success or failure).
   * Used by long-running lanes to persist partial artifacts.
   */
  onCheckpoint?: (partialResult: CalibrationRunResult) => void | Promise<void>;
}

/**
 * Run the Framing Symmetry Calibration harness.
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
  const runId = generateRunId();

  // Run pairs sequentially (avoids search provider contention)
  const pairResults: PairResult[] = [];
  let cumulativeCostUSD = 0;
  const maxBudget = options.maxBudgetUSD ?? 5.0;

  for (let i = 0; i < activePairs.length; i++) {
    const pair = activePairs[i];
    let shouldStopAfterCheckpoint = false;

    // Pre-check budget
    if (cumulativeCostUSD >= maxBudget) {
      options.onProgress?.(
        `Budget EXHAUSTED ($${cumulativeCostUSD.toFixed(2)} >= $${maxBudget.toFixed(2)}). Aborting remaining ${activePairs.length - i} pairs.`,
        i,
        activePairs.length,
      );
      break;
    }

    options.onProgress?.(
      `Running pair ${i + 1}/${activePairs.length}: ${pair.id} (Current cost: $${cumulativeCostUSD.toFixed(2)})`,
      i,
      activePairs.length,
    );

    try {
      const leftResult = await runSide(pair, "left");
      cumulativeCostUSD += leftResult.estimatedCostUSD;

      if (cumulativeCostUSD >= maxBudget) {
        options.onProgress?.(
          `Budget threshold reached during pair ${pair.id} after left side ($${cumulativeCostUSD.toFixed(2)} >= $${maxBudget.toFixed(2)}). Aborting remaining runs cleanly.`,
          i + 1,
          activePairs.length,
        );
        break;
      }

      const rightResult = await runSide(pair, "right");
      cumulativeCostUSD += rightResult.estimatedCostUSD;

      const metrics = computePairMetrics(leftResult, rightResult, pair, thresholds);

      // Task 6: emit inverse_consistency_error when a strict inverse pair exceeds the CE threshold.
      // This is a calibration-level cross-side warning. Attached to leftResult.warnings for
      // JSON serialization visibility (not a production pipeline warning).
      if (pair.isStrictInverse && metrics.inverseConsistencyDiagnostic) {
        const diag = metrics.inverseConsistencyDiagnostic;
        const inverseWarning: CalibrationWarning = {
          type: "inverse_consistency_error",
          severity: "error",
          message: diag.reasoning,
          details: {
            complementarityError: diag.complementarityError,
            rootCauseTags: diag.rootCauseTags,
            leftTruthPct: leftResult.truthPercentage,
            rightTruthPct: rightResult.truthPercentage,
          },
        };
        leftResult.warnings = [...leftResult.warnings, inverseWarning];
      }

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
      const diagnostics = buildPairFailureDiagnostics(err);
      pairResults.push({
        pairId: pair.id,
        pair,
        status: "failed",
        error: diagnostics.message,
        diagnostics,
      });
      options.onProgress?.(
        `Pair ${pair.id}: FAILED (${diagnostics.message})`,
        i + 1,
        activePairs.length,
      );
      if (options.stopOnFirstFailure) {
        options.onProgress?.(
          `stopOnFirstFailure enabled. Aborting after failed pair ${pair.id}.`,
          i + 1,
          activePairs.length,
        );
        shouldStopAfterCheckpoint = true;
      }
    }

    if (options.onCheckpoint) {
      const partialResult = buildRunResult(
        runId,
        new Date().toISOString(),
        options,
        activePairs,
        configSnapshot,
        pairResults,
        thresholds,
      );
      try {
        await options.onCheckpoint(partialResult);
      } catch (checkpointError) {
        console.warn(
          "[Calibration] Checkpoint callback failed:",
          checkpointError,
        );
      }
    }

    if (shouldStopAfterCheckpoint) {
      break;
    }
  }

  return buildRunResult(
    runId,
    new Date().toISOString(),
    options,
    activePairs,
    configSnapshot,
    pairResults,
    thresholds,
  );
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function filterPairs(pairs: BiasPair[], options: RunOptions): BiasPair[] {
  // targetPairId overrides mode filtering — return exactly one pair
  if (options.targetPairId) {
    const target = pairs.find((p) => p.id === options.targetPairId);
    if (!target) {
      throw new Error(
        `Target pair "${options.targetPairId}" not found in fixture. ` +
        `Available: ${pairs.map((p) => p.id).join(", ")}`,
      );
    }
    return [target];
  }

  if (options.mode === "quick") {
    // One pair per domain, English only
    const seen = new Set<string>();
    const domainPairs = pairs
      .filter((p) => {
        if (p.language !== "en" || seen.has(p.domain) || p.isStrictInverse) return false;
        seen.add(p.domain);
        return true;
      })
      .slice(0, 3); // Reduced from 4 to 3 to make room for the inverse pair

    // Add exactly one strict inverse pair for symmetry hardening.
    // Select the first strict inverse pair in English — generic, survives fixture changes.
    const inversePair = pairs.find((p) => p.isStrictInverse && p.language === "en");
    return inversePair ? [...domainPairs, inversePair] : domainPairs;
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

function buildRunResult(
  runId: string,
  timestamp: string,
  options: RunOptions,
  activePairs: BiasPair[],
  configSnapshot: CalibrationRunResult["configSnapshot"],
  pairResults: PairResult[],
  thresholds: CalibrationThresholds,
): CalibrationRunResult {
  const inverseGateAction = (
    configSnapshot.pipeline["calibrationInverseGateAction"] as "warn" | "fail" | undefined
  ) ?? "warn";
  const aggregateMetrics = computeAggregateMetrics(pairResults, thresholds, inverseGateAction);
  const pairsCompleted = pairResults.filter((r) => r.status === "completed").length;
  const pairsFailed = pairResults.length - pairsCompleted;

  return {
    runId,
    timestamp,
    runMode: options.mode,
    configSnapshot,
    pairResults: [...pairResults],
    aggregateMetrics,
    metadata: {
      runIntent: options.runIntent,
      fixtureFile: options.fixtureFile ?? "framing-symmetry-pairs.json",
      fixtureVersion: options.fixtureVersion ?? "unknown",
      pairsRequested: activePairs.length,
      pairsCompleted,
      pairsFailed,
      pairsSkipped: Math.max(0, activePairs.length - pairResults.length),
      mode: options.mode,
      targetDomain: options.targetDomain,
      targetLanguage: options.targetLanguage,
      schemaVersion: "calibration-1.0",
    },
    thresholds,
  };
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
 * Reads canonical debateRoles from config (already normalized from
 * legacy fields by config-schemas.ts transform).
 *
 * Exported for use by the backfill script.
 */
export function resolveLLMConfig(config: PipelineConfig): CalibrationRunResult["configSnapshot"]["resolvedLLM"] {
  const provider = config.llmProvider ?? "anthropic";
  const tiering = config.llmTiering ?? false;
  const modelUnderstand = config.modelUnderstand ?? "haiku";
  const modelExtractEvidence = config.modelExtractEvidence ?? "haiku";
  const modelVerdict = config.modelVerdict ?? "sonnet";
  const modelOpus = config.modelOpus ?? modelVerdict; // B-5b: fallback to modelVerdict

  const canonicalRoles = config.debateRoles;

  const roles = ["advocate", "selfConsistency", "challenger", "reconciler", "validation"] as const;
  const defaultStrengths: Record<string, string> = {
    advocate: "standard", selfConsistency: "standard", challenger: "standard", reconciler: "standard", validation: "budget",
  };
  const defaultProviders: Record<string, string> = {
    advocate: provider, selfConsistency: provider, challenger: "openai", reconciler: provider, validation: provider,
  };
  const debateRoles: Record<string, { tier: string; provider: string; model: string }> = {};

  for (const role of roles) {
    const strength = canonicalRoles?.[role]?.strength ?? defaultStrengths[role];
    const roleProvider = canonicalRoles?.[role]?.provider ?? defaultProviders[role];
    const model = resolveModelName(strength, roleProvider, tiering, modelUnderstand, modelVerdict, modelOpus);
    debateRoles[role] = { tier: strength, provider: roleProvider, model };
  }

  return {
    provider,
    tiering,
    models: { understand: modelUnderstand, extractEvidence: modelExtractEvidence, verdict: modelVerdict },
    debateRoles,
  };
}

/**
 * Resolve a model name from debate tier + provider.
 *
 * Uses UCM model overrides when the configured model is compatible with the
 * target provider. If the configured model appears to belong to a different
 * provider, falls back to canonical tier resolution for the target provider.
 */
function resolveModelName(
  tier: string,
  roleProvider: string,
  tiering: boolean,
  modelUnderstand: string,
  modelVerdict: string,
  modelOpus?: string,
): string {
  const provider = normalizeLLMProvider(roleProvider);
  // Normalize strength: accepts both legacy (haiku/sonnet/opus) and canonical (budget/standard/premium)
  const normalizedStrength = normalizeToStrength(tier);

  const detectProviderFromModelName = (
    modelName: string,
  ): LLMProviderType | null => {
    const normalized = modelName.toLowerCase();
    if (normalized.includes("claude")) return "anthropic";
    if (normalized.includes("gpt")) return "openai";
    if (normalized.includes("gemini")) return "google";
    if (normalized.includes("mistral")) return "mistral";
    return null;
  };

  const resolveConfiguredModel = (
    configuredValue: string | undefined,
    fallbackStrength: ModelStrength,
    targetProvider: LLMProviderType,
  ): string => {
    if (!configuredValue || configuredValue.trim().length === 0) {
      return resolveModel(fallbackStrength, targetProvider).modelName;
    }

    const trimmed = configuredValue.trim();
    if (isModelTier(trimmed)) {
      return resolveModel(trimmed, targetProvider).modelName;
    }

    const inferredProvider = detectProviderFromModelName(trimmed);
    if (inferredProvider && inferredProvider !== targetProvider) {
      return resolveModel(fallbackStrength, targetProvider).modelName;
    }

    return trimmed;
  };

  if (provider === "anthropic") {
    if (!tiering) {
      return resolveConfiguredModel(modelVerdict, "standard", "anthropic");
    }

    if (normalizedStrength === "budget") {
      return resolveConfiguredModel(modelUnderstand, "budget", "anthropic");
    }
    if (normalizedStrength === "premium") {
      return resolveConfiguredModel(modelOpus ?? modelVerdict, "premium", "anthropic");
    }
    return resolveConfiguredModel(modelVerdict, "standard", "anthropic");
  }

  if (provider === "openai" || provider === "google" || provider === "mistral") {
    if (!tiering) {
      return resolveConfiguredModel(modelVerdict, "standard", provider);
    }
    if (normalizedStrength === "budget") {
      return resolveConfiguredModel(modelUnderstand, "budget", provider);
    }
    if (normalizedStrength === "premium") {
      return resolveConfiguredModel(modelOpus ?? modelVerdict, "premium", provider);
    }
    return resolveConfiguredModel(modelVerdict, "standard", provider);
  }

  // Unknown provider fallback: preserve Anthropic UCM overrides.
  if (normalizedStrength === "budget") {
    return resolveConfiguredModel(modelUnderstand, "budget", "anthropic");
  }
  if (normalizedStrength === "premium") {
    return resolveConfiguredModel(modelOpus ?? modelVerdict, "premium", "anthropic");
  }
  return resolveConfiguredModel(modelVerdict, "standard", "anthropic");
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
  let result: Awaited<ReturnType<typeof runClaimBoundaryAnalysis>> | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await runClaimBoundaryAnalysis({
        inputValue: claim,
        inputType: "text",
      });
      break;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isValueReadCrash =
        message.includes("Cannot read properties of undefined")
        && message.includes("reading 'value'");

      if (attempt === 0 && isValueReadCrash) {
        console.warn(
          `[Calibration] Side ${side} hit transient value-read crash; retrying once.`,
        );
        continue;
      }

      throw annotateSideOnError(err, side);
    }
  }

  if (!result) {
    throw annotateSideOnError(lastError ?? new Error("Unknown side execution error"), side);
  }

  const durationMs = Date.now() - startMs;
  const rj = result.resultJson;

  return extractSideResult(claim, side, rj, durationMs);
}

function annotateSideOnError(
  err: unknown,
  side: "left" | "right",
): Error {
  const wrapped = err instanceof Error ? err : new Error(String(err));
  const details =
    (wrapped as Error & { details?: Record<string, unknown> }).details ?? {};

  (wrapped as Error & { details?: Record<string, unknown> }).details = {
    ...details,
    side,
  };

  return wrapped;
}

function buildPairFailureDiagnostics(err: unknown): PairFailureDiagnostics {
  const fallbackMessage = err instanceof Error ? err.message : String(err);
  const e = err as (Error & { details?: Record<string, unknown> }) | undefined;
  const details = e?.details;

  const stackTruncated =
    typeof e?.stack === "string"
      ? e.stack.split("\n").slice(0, 12).join("\n")
      : undefined;

  const asString = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0 ? value : undefined;

  const sideValue = details?.side;
  const side =
    sideValue === "left" || sideValue === "right" ? sideValue : undefined;

  return {
    errorClass: asString(e?.name) ?? "Error",
    message: asString(e?.message) ?? fallbackMessage,
    stackTruncated,
    stage: asString(details?.stage),
    promptKey: asString(details?.promptKey),
    provider: asString(details?.provider),
    model: asString(details?.model),
    side,
  };
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
    estimatedCostUSD: rj.meta?.estimatedCostUSD ?? 0,
    modelsUsed: rj.meta?.modelsUsed ?? {},
    runtimeRoleModels: rj.meta?.runtimeRoleModels ?? undefined,
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
