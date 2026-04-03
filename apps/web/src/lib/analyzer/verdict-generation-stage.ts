/**
 * Verdict Generation Stage — Stage 4 entry point and LLM call factory
 *
 * Extracted from claimboundary-pipeline.ts (WS-2).
 * Delegates to verdict-stage.ts for the 5-step LLM debate pattern.
 *
 * Exports:
 *   - generateVerdicts: Stage 4 entry — loads UCM config, wires LLM call, delegates to runVerdictStage
 *   - buildVerdictStageConfig: Maps UCM pipeline + calc configs → VerdictStageConfig
 *   - createProductionLLMCall: Factory for production LLM call function (model selection, provider fallback, TPM guard)
 *   - checkDebateTierDiversity: Pre-flight check for degenerate debate configuration
 *   - checkDebateProviderCredentials: Pre-flight check for missing provider credentials
 *
 * @module analyzer/verdict-generation-stage
 */

import type {
  AnalysisWarning,
  AtomicClaim,
  CBClaimVerdict,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  FetchedSource,
  LLMProviderType,
} from "./types";

import {
  runVerdictStage,
  type LLMCallFn,
  type VerdictStageConfig,
  DEFAULT_VERDICT_STAGE_CONFIG,
} from "./verdict-stage";

import { APICallError, generateText } from "ai";
import {
  getModelForTask,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
  type ModelTask,
} from "./llm";
import { tryParseFirstJsonValue, repairTruncatedJsonValue, tryParseJsonWithInnerQuoteRepair } from "./json";
import { loadAndRenderSection } from "./prompt-loader";
import {
  runWithLlmProviderGuard,
} from "./llm-provider-guard";

import { loadPipelineConfig, loadCalcConfig } from "@/lib/config-loader";
import type { PipelineConfig, CalcConfig } from "@/lib/config-schemas";
import { classifyError } from "@/lib/error-classification";
import {
  recordProviderFailure,
  pauseSystem,
} from "@/lib/provider-health";

import { recordLLMCall } from "./metrics-integration";
import type { ParseFailureArtifact } from "./metrics";

// ============================================================================
// PARSE FAILURE ARTIFACT BUILDER
// ============================================================================

/** Maximum characters captured from the start of a failed response. */
const ARTIFACT_PREFIX_LIMIT = 4096;
/** Maximum characters captured from the end of a failed response. */
const ARTIFACT_SUFFIX_LIMIT = 2048;

/**
 * Classify what a raw LLM response starts with for diagnostic bucketing.
 */
function classifyResponseStart(text: string | undefined): ParseFailureArtifact["startsWithKind"] {
  if (!text || text.length === 0) return "empty";
  const trimmed = text.trimStart();
  if (trimmed.startsWith("```")) return "fence";
  if (trimmed.startsWith("[")) return "bracket";
  if (trimmed.startsWith("{")) return "brace";
  return "prose";
}

/**
 * Build a diagnostic artifact from a failed Stage-4 parse attempt.
 * Captures truncated head/tail slices of the raw response plus metadata.
 * Admin-only — persisted in metrics JSON, never user-facing.
 */
function buildParseFailureArtifact(
  rawText: string | undefined,
  promptKey: string,
  debateRole: string,
  attempt: "initial" | "retry",
  expectedRoot: "array" | "object",
  recoveriesAttempted: string[],
): ParseFailureArtifact {
  const text = rawText ?? "";
  return {
    promptKey,
    debateRole,
    attempt,
    rawLength: text.length,
    rawPrefix: text.substring(0, ARTIFACT_PREFIX_LIMIT),
    rawSuffix: text.length > ARTIFACT_SUFFIX_LIMIT
      ? text.substring(text.length - ARTIFACT_SUFFIX_LIMIT)
      : text,
    startsWithKind: classifyResponseStart(text),
    expectedRoot,
    recoveriesAttempted,
  };
}

// ============================================================================
// STAGE 4: VERDICT (§8.4)
// ============================================================================

/**
 * Stage 4: Generate verdicts using the 5-step LLM debate pattern.
 *
 * Implemented as a separate module (verdict-stage.ts) per §22.
 * This function delegates to that module.
 *
 * Steps:
 *   1. Advocate Verdict (Sonnet)
 *   2. Self-Consistency Check (Sonnet × 2, parallel with Step 3)
 *   3. Adversarial Challenge (Sonnet, parallel with Step 2)
 *   4. Reconciliation (Sonnet)
 *   5. Verdict Validation (Haiku × 2) + Structural Consistency Check
 *   Gate 4: Confidence classification
 *
 * @param claims - Atomic claims from Stage 1
 * @param evidence - All evidence items (boundary-assigned)
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @param llmCall - Optional injectable LLM call (for testing). Production creates one from UCM config.
 * @returns Array of CBClaimVerdicts
 */
export async function generateVerdicts(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  llmCall?: LLMCallFn,
  warnings?: AnalysisWarning[],
  modelUsageRecorder?: (provider: string, modelName: string) => void,
  roleTraceRecorder?: (trace: { debateRole: string; promptKey: string; provider: string; model: string; strength: string; fallbackUsed: boolean }) => void,
  onEvent?: (message: string, progress: number) => void,
  jobId?: string,
  sources?: FetchedSource[],
  reportLanguage?: string,
): Promise<CBClaimVerdict[]> {
  // Load UCM configs for verdict stage
  const [pipelineResult, calcResult] = await Promise.all([
    loadPipelineConfig("default", jobId),
    loadCalcConfig("default", jobId),
  ]);
  const pipelineConfig = pipelineResult.config;
  const calcConfig = calcResult.config;

  // Log config load status for verdict stage
  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM pipeline config load failed in generateVerdicts — using hardcoded defaults.`);
  }
  if (calcResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM calc config load failed in generateVerdicts — using hardcoded defaults.`);
  }

  // Build VerdictStageConfig from UCM parameters
  const verdictConfig = buildVerdictStageConfig(pipelineConfig, calcConfig);
  if (reportLanguage) verdictConfig.reportLanguage = reportLanguage;

  // Production LLM call wiring — use injected or create from UCM.
  // Pass warnings collector so runtime fallbacks surface in resultJson.analysisWarnings.
  const llmCallFn = llmCall ?? createProductionLLMCall(pipelineConfig, warnings, modelUsageRecorder, roleTraceRecorder, onEvent);

  return runVerdictStage(
    claims,
    evidence,
    boundaries,
    coverageMatrix,
    llmCallFn,
    verdictConfig,
    warnings,
    onEvent,
    calcConfig,
    sources,
    reportLanguage,
  );
}

// ============================================================================
// STAGE 4 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Build VerdictStageConfig from UCM pipeline and calculation configs.
 * Maps UCM config field names to VerdictStageConfig structure.
 *
 * Resolution: reads canonical debateRoles from pipelineConfig (already
 * normalized from legacy fields by config-schemas.ts transform).
 */
export function buildVerdictStageConfig(
  pipelineConfig: PipelineConfig,
  calcConfig: CalcConfig,
): VerdictStageConfig {
  const spreadThresholds = calcConfig.selfConsistencySpreadThresholds ?? {
    stable: 5,
    moderate: 12,
    unstable: 20,
  };

  // debateRoles is always populated by config-schemas.ts canonicalization
  const canonicalRoles = pipelineConfig.debateRoles ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles;

  return {
    selfConsistencyMode: pipelineConfig.selfConsistencyMode ?? "full",
    selfConsistencyTemperature:
      pipelineConfig.selfConsistencyTemperature ?? 0.4,
    challengerTemperature:
      pipelineConfig.challengerTemperature ?? 0.3,
    verdictGroundingPolicy:
      pipelineConfig.verdictGroundingPolicy ?? "disabled",
    verdictDirectionPolicy:
      pipelineConfig.verdictDirectionPolicy ?? "disabled",
    stableThreshold: spreadThresholds.stable ?? 5,
    moderateThreshold: spreadThresholds.moderate ?? 12,
    unstableThreshold: spreadThresholds.unstable ?? 20,
    spreadMultipliers: calcConfig.verdictStage?.spreadMultipliers ?? DEFAULT_VERDICT_STAGE_CONFIG.spreadMultipliers,
    institutionalSourceTypes: calcConfig.verdictStage?.institutionalSourceTypes,
    generalSourceTypes: calcConfig.verdictStage?.generalSourceTypes,
    mixedConfidenceThreshold: calcConfig.mixedConfidenceThreshold ?? 45,
    highHarmMinConfidence: calcConfig.highHarmMinConfidence ?? 50,
    debateRoles: {
      advocate: {
        provider: (canonicalRoles.advocate?.provider ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.advocate.provider) as LLMProviderType,
        strength: canonicalRoles.advocate?.strength ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.advocate.strength,
      },
      selfConsistency: {
        provider: (canonicalRoles.selfConsistency?.provider ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.selfConsistency.provider) as LLMProviderType,
        strength: canonicalRoles.selfConsistency?.strength ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.selfConsistency.strength,
      },
      challenger: {
        provider: (canonicalRoles.challenger?.provider ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.challenger.provider) as LLMProviderType,
        strength: canonicalRoles.challenger?.strength ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.challenger.strength,
      },
      reconciler: {
        provider: (canonicalRoles.reconciler?.provider ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.reconciler.provider) as LLMProviderType,
        strength: canonicalRoles.reconciler?.strength ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.reconciler.strength,
      },
      validation: {
        provider: (canonicalRoles.validation?.provider ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.validation.provider) as LLMProviderType,
        strength: canonicalRoles.validation?.strength ?? DEFAULT_VERDICT_STAGE_CONFIG.debateRoles.validation.strength,
      },
    },
    highHarmFloorLevels: calcConfig.highHarmFloorLevels ?? ["critical", "high"],
    evidencePartitioningEnabled: calcConfig.evidencePartitioningEnabled ?? true,
    rangeReporting: calcConfig.rangeReporting
      ? {
          enabled: calcConfig.rangeReporting.enabled,
          wideRangeThreshold: calcConfig.rangeReporting.wideRangeThreshold,
          boundaryVarianceWeight: calcConfig.rangeReporting.boundaryVarianceWeight,
        }
      : undefined,
  };
}

/**
 * Environment variable names per provider for credential pre-check.
 * Used by the fail-open fallback in createProductionLLMCall.
 */
const PROVIDER_API_KEY_ENV: Record<LLMProviderType, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  mistral: ["MISTRAL_API_KEY"],
};

/**
 * Check whether a provider has credentials available in the environment.
 */
function hasProviderCredentials(provider: LLMProviderType): boolean {
  const envKeys = PROVIDER_API_KEY_ENV[provider];
  if (!envKeys) return false;
  return envKeys.some((key) => !!process.env[key]);
}

/**
 * Create a production LLM call function for verdict-stage.
 * Loads prompts from UCM, uses AI SDK for structured output.
 * Each call loads the prompt section, selects the model by tier, and parses the JSON result.
 *
 * Supports per-role provider overrides via options.providerOverride.
 * Fail-open policy: if the overridden provider lacks credentials, falls back to global provider
 * with a console warning and appends a "debate_provider_fallback" AnalysisWarning to the
 * optional warnings collector (flows to resultJson.analysisWarnings).
 *
 * @param pipelineConfig - Pipeline configuration with global provider settings
 * @param warnings - Optional array to collect AnalysisWarning objects. Passed from the
 *   pipeline's state.warnings so fallback events surface in resultJson.analysisWarnings.
 */
export function createProductionLLMCall(
  pipelineConfig: PipelineConfig,
  warnings?: AnalysisWarning[],
  onModelUsed?: (provider: string, modelName: string) => void,
  onRoleTrace?: (trace: { debateRole: string; promptKey: string; provider: string; model: string; strength: string; fallbackUsed: boolean }) => void,
  onEvent?: (message: string, progress: number) => void,
): LLMCallFn {
  return async (
    promptKey: string,
    input: Record<string, unknown>,
    options?: { tier?: string; temperature?: number; providerOverride?: LLMProviderType; modelOverride?: string; callContext?: { debateRole: string; promptKey: string } },
  ): Promise<unknown> => {
    const startTime = Date.now();
    const stage = "stage4_verdict";

    const userContent = typeof input.userMessage === "string"
      ? input.userMessage
      : "Analyze the provided data and return output matching the required JSON schema.";

    const approxTokenCount = (text: string): number => {
      if (!text) return 0;
      // Approximation for routing guards only; not used for analytical decisions.
      return Math.ceil(text.length / 4);
    };

    const toError = (
      message: string,
      details: Record<string, unknown>,
      cause?: unknown,
    ): Error => {
      const err = new Error(message);
      err.name = "Stage4LLMCallError";
      (err as Error & { details?: Record<string, unknown> }).details = details;
      if (cause instanceof Error) {
        err.cause = cause;
      }
      return err;
    };

    const maybeAppendProviderErrorWarning = (
      error: unknown,
      provider: string,
      modelName: string,
      reason: string,
    ) => {
      const classified = classifyError(error);
      if (classified.provider !== "llm") return;

      const apiCallHeaders = APICallError.isInstance(error) ? error.responseHeaders : undefined;
      const apiRequestId =
        apiCallHeaders?.["request-id"] ??
        apiCallHeaders?.["x-request-id"] ??
        null;
      const retryAfter =
        apiCallHeaders?.["retry-after-ms"] ??
        apiCallHeaders?.["retry-after"] ??
        null;

      warnings?.push({
        type: "llm_provider_error",
        severity: "warning",
        message: `Stage 4 LLM provider failure for "${promptKey}" via "${provider}/${modelName}": ${classified.message}`,
        details: {
          stage,
          promptKey,
          provider,
          model: modelName,
          category: classified.category,
          reason,
          statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
          requestId: apiRequestId,
          retryAfter,
          anthropicRequestsRemaining: apiCallHeaders?.["anthropic-ratelimit-requests-remaining"],
          anthropicTokensRemaining: apiCallHeaders?.["anthropic-ratelimit-tokens-remaining"],
          openaiRequestsRemaining: apiCallHeaders?.["x-ratelimit-remaining-requests"],
          openaiTokensRemaining: apiCallHeaders?.["x-ratelimit-remaining-tokens"],
        },
      });
    };

    /** Record a provider failure against the LLM circuit breaker.
     *  If the circuit opens, pause the system so queued jobs are protected. */
    const maybeRecordProviderFailure = (error: unknown): void => {
      const classified = classifyError(error);
      if (classified.shouldCountAsProviderFailure && classified.provider === "llm") {
        const { circuitOpened } = recordProviderFailure("llm", classified.message);
        if (circuitOpened) {
          pauseSystem(`LLM provider failed during Stage 4 verdict: ${classified.category} — ${classified.message.substring(0, 200)}`);
        }
      }
    };

    const isOpenAiTpmError = (error: unknown): boolean => {
      const msg = error instanceof Error ? error.message : String(error ?? "");
      const lower = msg.toLowerCase();
      return lower.includes("tokens per min")
        || lower.includes("tpm")
        || lower.includes("request too large");
    };

    // 1. Load UCM prompt section
    // Serialize all input values to strings for prompt variable substitution.
    // Without this, objects/arrays passed to renderSection() coerce to "[object Object]"
    // via .toString(), leaving the LLM with garbage data in the system prompt.
    const currentDate = new Date().toISOString().split("T")[0];
    const stringifiedVars: Record<string, string> = {};
    for (const [key, value] of Object.entries({ ...input, currentDate })) {
      stringifiedVars[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
    const rendered = await loadAndRenderSection("claimboundary", promptKey, stringifiedVars);
    if (!rendered) {
      throw toError(
        `Stage 4: Failed to load prompt section "${promptKey}"`,
        { stage, promptKey },
      );
    }

    // 2. Resolve provider — apply per-role override with credential pre-check
    let effectiveProviderOverride = options?.providerOverride;
    if (effectiveProviderOverride && !hasProviderCredentials(effectiveProviderOverride)) {
      const globalProvider = pipelineConfig.llmProvider ?? "anthropic";
      console.warn(
        `[Pipeline] Provider override "${effectiveProviderOverride}" for prompt "${promptKey}" ` +
        `has no credentials — falling back to global provider "${globalProvider}"`
      );
      // Emit structured warning into pipeline's warning collector
      warnings?.push({
        type: "debate_provider_fallback",
        severity: "warning",
        message: `Provider override "${effectiveProviderOverride}" for "${promptKey}" lacks credentials. Fell back to global provider "${globalProvider}".`,
        details: { stage, promptKey, configuredProvider: effectiveProviderOverride, fallbackProvider: globalProvider },
      });
      effectiveProviderOverride = undefined;
    }

    // 3. Select model based on tier + resolved provider
    // Accepts both legacy values (haiku/sonnet/opus) and canonical values (budget/standard/premium).
    const tier = options?.tier ?? "standard";
    const isPremium = tier === "sonnet" || tier === "opus" || tier === "standard" || tier === "premium";
    const taskKey: ModelTask = isPremium ? "verdict" : "understand";
    // B-5b: For "opus"/"premium" tier, temporarily override modelVerdict with modelOpus so
    // getModelForTask resolves the correct model ID through the standard path.
    const effectiveConfig = (tier === "opus" || tier === "premium") && pipelineConfig.modelOpus
      ? { ...pipelineConfig, modelVerdict: pipelineConfig.modelOpus }
      : pipelineConfig;
    let model = getModelForTask(taskKey, effectiveProviderOverride, effectiveConfig);

    // A-2b: OpenAI TPM guard/fallback configuration (UCM-backed defaults).
    const tpmGuardEnabled = pipelineConfig.openaiTpmGuardEnabled ?? true;
    const tpmGuardInputTokenThreshold = pipelineConfig.openaiTpmGuardInputTokenThreshold ?? 24000;
    const tpmGuardFallbackModel = pipelineConfig.openaiTpmGuardFallbackModel ?? "gpt-4.1-mini";
    const estimatedInputTokens = approxTokenCount(rendered.content) + approxTokenCount(userContent);

    const resolveOpenAiFallbackModel = () => {
      const fallbackConfig: PipelineConfig = {
        ...pipelineConfig,
        llmTiering: true,
        llmProvider: "openai",
        modelVerdict: tpmGuardFallbackModel,
      };
      return getModelForTask("verdict", "openai", fallbackConfig);
    };

    const maybeWarnTpmGuardFallback = (
      configuredModel: string,
      fallbackModel: string,
      reason: "tpm_guard_precheck" | "tpm_guard_retry",
      originalError?: string,
    ) => {
      warnings?.push({
        type: "llm_tpm_guard_fallback",
        severity: "info",
        message: `Stage 4 TPM guard used fallback model "${fallbackModel}" for "${promptKey}" (configured: "${configuredModel}").`,
        details: {
          stage,
          promptKey,
          provider: "openai",
          configuredModel,
          fallbackModel,
          reason: "tpm_guard",
          guardPhase: reason,
          estimatedInputTokens,
          threshold: tpmGuardInputTokenThreshold,
          ...(originalError ? { originalError } : {}),
        },
      });
    };

    // Pre-call TPM guard based on request-size estimate.
    if (
      tpmGuardEnabled
      && model.provider === "openai"
      && model.modelName === "gpt-4.1"
      && estimatedInputTokens >= tpmGuardInputTokenThreshold
    ) {
      const fallback = resolveOpenAiFallbackModel();
      maybeWarnTpmGuardFallback(model.modelName, fallback.modelName, "tpm_guard_precheck");
      model = fallback;
    }

    // 4. Call AI SDK
    // B-1: Record per-role trace before making the call
    const fallbackUsed = effectiveProviderOverride === undefined && options?.providerOverride !== undefined;
    if (options?.callContext && onRoleTrace) {
      onRoleTrace({
        debateRole: options.callContext.debateRole,
        promptKey: options.callContext.promptKey,
        provider: model.provider,
        model: model.modelName,
        strength: tier,
        fallbackUsed,
      });
    }
    // Emit LLM call event for per-call visibility in the job event log
    if (options?.callContext && onEvent) {
      const rawRole = options.callContext.debateRole;
      const roleLabel = rawRole.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`);
      onEvent(`LLM call: ${roleLabel} — ${model.modelName}`, -1);
    }

    let result: any;
    const callModel = async (activeModel: typeof model): Promise<any> => {
      onModelUsed?.(activeModel.provider, activeModel.modelName);
      return generateText({
        model: activeModel.model,
        messages: [
          {
            role: "system",
            content: rendered.content,
            providerOptions: getPromptCachingOptions(activeModel.provider),
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: options?.temperature ?? 0.0,
        maxOutputTokens: 16384, // Phase 2.3: prevent output truncation on high-evidence verdicts (3 claims × 6 boundaries)
        // Keep provider retries in the AI SDK, which already honors retry-after /
        // retry-after-ms response headers on retryable API call failures.
        maxRetries: 2,
        providerOptions: getStructuredOutputProviderOptions(activeModel.provider),
      });
    };

    const callModelWithGuard = async (activeModel: typeof model): Promise<any> => {
      // Note: verdict-stage.ts already has inner retry loops for self-consistency and
      // validation batches, and the AI SDK adds retry-after-aware retries for
      // retryable APICallError responses. Keep this guard focused on concurrency
      // shaping only; adding another custom retry layer here would multiply attempts.
      return runWithLlmProviderGuard(
        activeModel.provider as LLMProviderType,
        activeModel.modelName,
        () => callModel(activeModel),
      );
    };

    let attemptModel = model;
    try {
      result = await callModelWithGuard(attemptModel);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.name : undefined;

      // Record failed LLM call with actual resolved provider
      recordLLMCall({
        taskType: 'verdict',
        provider: attemptModel.provider,
        modelName: attemptModel.modelName,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now() - startTime,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage,
        errorType,
        timestamp: new Date(),
        debateRole: options?.callContext?.debateRole,
      });

      // Retry once with mini fallback when OpenAI TPM pressure is detected.
      if (
        tpmGuardEnabled
        && attemptModel.provider === "openai"
        && attemptModel.modelName === "gpt-4.1"
        && isOpenAiTpmError(error)
      ) {
        const fallback = resolveOpenAiFallbackModel();
        maybeWarnTpmGuardFallback(attemptModel.modelName, fallback.modelName, "tpm_guard_retry", errorMessage);
        attemptModel = fallback;

        try {
          result = await callModelWithGuard(attemptModel);
        } catch (retryError) {
          const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
          const retryErrorType = retryError instanceof Error ? retryError.name : undefined;
          recordLLMCall({
            taskType: "verdict",
            provider: attemptModel.provider,
            modelName: attemptModel.modelName,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            durationMs: Date.now() - startTime,
            success: false,
            schemaCompliant: false,
            retries: 1,
            errorMessage: retryMessage,
            errorType: retryErrorType,
            timestamp: new Date(),
            debateRole: options?.callContext?.debateRole,
          });

          maybeAppendProviderErrorWarning(
            retryError,
            attemptModel.provider,
            attemptModel.modelName,
            "tpm_guard_retry_failed",
          );
          maybeRecordProviderFailure(retryError);

          throw toError(
            `Stage 4: LLM call failed for "${promptKey}"`,
            {
              stage,
              promptKey,
              provider: attemptModel.provider,
              model: attemptModel.modelName,
              tier,
              reason: "tpm_guard_retry_failed",
            },
            retryError,
          );
        }
      } else {
        maybeAppendProviderErrorWarning(
          error,
          attemptModel.provider,
          attemptModel.modelName,
          "llm_call_failed",
        );
        maybeRecordProviderFailure(error);
        throw toError(
          `Stage 4: LLM call failed for "${promptKey}"`,
          {
            stage,
            promptKey,
            provider: attemptModel.provider,
            model: attemptModel.modelName,
            tier,
            reason: "llm_call_failed",
          },
          error,
        );
      }
    }

    // 5. Parse result as JSON
    const text = result.text?.trim();
    if (!text) {
      throw toError(
        `Stage 4: LLM returned empty response for prompt "${promptKey}"`,
        {
          stage,
          promptKey,
          provider: attemptModel.provider,
          model: attemptModel.modelName,
          tier,
        },
      );
    }

    const expectedRootToken: "{" | "[" = (
      promptKey.includes("ADVOCATE") ||
      promptKey.includes("RECONCILIATION") ||
      promptKey.includes("VALIDATION")
    ) ? "[" : "{";
    const alternateRootToken: "{" | "[" = expectedRootToken === "[" ? "{" : "[";
    const recoveryRoots: Array<"{" | "[" | undefined> = [undefined, expectedRootToken, alternateRootToken]
      .filter((root, index, roots) => roots.indexOf(root) === index);

    // Track which recovery strategies were attempted for diagnostic artifacts
    let lastRecoveriesAttempted: string[] = [];

    const tryParseWithRecovery = (jsonText: string) => {
      const trimmedText = jsonText?.trim();
      if (!trimmedText) { lastRecoveriesAttempted = []; return null; }

      const recoveriesAttempted: string[] = [];
      const tryAcrossRoots = (
        attempt: (root?: "{" | "[") => unknown | null,
      ): unknown | null => {
        for (const root of recoveryRoots) {
          const recovered = attempt(root);
          if (recovered !== null) return recovered;
        }
        return null;
      };

      // a. Direct JSON.parse
      recoveriesAttempted.push("direct_parse");
      try {
        const result = JSON.parse(trimmedText);
        lastRecoveriesAttempted = recoveriesAttempted;
        return result;
      } catch {
        // b. Fenced JSON parse
        recoveriesAttempted.push("fenced_parse");
        const jsonMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch?.[1]) {
          try {
            const result = JSON.parse(jsonMatch[1].trim());
            lastRecoveriesAttempted = recoveriesAttempted;
            return result;
          } catch {
            // continue
          }
        }

        // c. Repair unescaped inner quotes inside JSON strings
        recoveriesAttempted.push("inner_quote_repair");
        const quoteRepairCandidates = [
          jsonMatch?.[1]?.trim(),
          trimmedText.startsWith("{") || trimmedText.startsWith("[") ? trimmedText : null,
        ].filter((candidate, index, candidates): candidate is string => (
          typeof candidate === "string"
          && candidate.length > 0
          && candidates.indexOf(candidate) === index
        ));
        for (const candidate of quoteRepairCandidates) {
          const repaired = tryParseJsonWithInnerQuoteRepair(candidate);
          if (repaired !== null) {
            lastRecoveriesAttempted = recoveriesAttempted;
            return repaired;
          }
        }

        // d. Generic JSON value extraction
        recoveriesAttempted.push("embedded_value_extraction");
        const embeddedValue = tryAcrossRoots((root) => tryParseFirstJsonValue(trimmedText, root));
        if (embeddedValue !== null) { lastRecoveriesAttempted = recoveriesAttempted; return embeddedValue; }

        // e. Truncated JSON value repair
        recoveriesAttempted.push("truncated_repair");
        const repairedValue = tryAcrossRoots((root) => repairTruncatedJsonValue(trimmedText, root));
        if (repairedValue !== null) { lastRecoveriesAttempted = recoveriesAttempted; return repairedValue; }

        lastRecoveriesAttempted = recoveriesAttempted;
        return null;
      }
    };

    let parsed = tryParseWithRecovery(text);
    if (parsed) {
      // Success on first attempt (or its recovery)
      recordLLMCall({
        taskType: 'verdict',
        provider: attemptModel.provider,
        modelName: attemptModel.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - startTime,
        success: true,
        schemaCompliant: true,
        retries: 0,
        timestamp: new Date(),
        debateRole: options?.callContext?.debateRole,
      });
      return parsed;
    }

    // FAILED PARSING - RECORD FIRST ATTEMPT AS SCHEMA NON-COMPLIANT
    const expectedRootKind: "array" | "object" = expectedRootToken === "[" ? "array" : "object";
    const parseFailureMetadata = {
      length: text.length,
      startsWith: text.substring(0, 50).replace(/\n/g, "\\n"),
      startsWithBracket: text.startsWith("["),
      startsWithBrace: text.startsWith("{"),
      hasFence: text.includes("```"),
      expectedRoot: expectedRootKind,
    };

    recordLLMCall({
      taskType: 'verdict',
      provider: attemptModel.provider,
      modelName: attemptModel.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - startTime,
      success: true,
      schemaCompliant: false,
      retries: 0,
      errorMessage: `JSON parse failure: ${JSON.stringify(parseFailureMetadata)}`,
      timestamp: new Date(),
      debateRole: options?.callContext?.debateRole,
      parseFailureArtifact: buildParseFailureArtifact(
        text,
        promptKey,
        options?.callContext?.debateRole ?? "unknown",
        "initial",
        expectedRootKind,
        lastRecoveriesAttempted,
      ),
    });

    // RETRY ONCE ON PARSE FAILURE (SAME MODEL/PROVIDER)
    if (onEvent) onEvent(`Parse failure, retrying ${attemptModel.modelName}...`, -1);

    try {
      const retryResult = await callModelWithGuard(attemptModel);
      const retryText = retryResult.text?.trim();
      parsed = tryParseWithRecovery(retryText);

      if (parsed) {
        // Success on retry
        recordLLMCall({
          taskType: 'verdict',
          provider: attemptModel.provider,
          modelName: attemptModel.modelName,
          promptTokens: retryResult.usage?.inputTokens ?? 0,
          completionTokens: retryResult.usage?.outputTokens ?? 0,
          totalTokens: retryResult.usage?.totalTokens ?? 0,
          durationMs: Date.now() - startTime,
          success: true,
          schemaCompliant: true,
          retries: 1,
          timestamp: new Date(),
          debateRole: options?.callContext?.debateRole,
        });
        return parsed;
      }

      // Retry parsed failed too
      const retryParseFailureMetadata = {
        length: retryText?.length ?? 0,
        startsWith: retryText?.substring(0, 50).replace(/\n/g, "\\n") ?? "",
        startsWithBracket: retryText?.startsWith("["),
        startsWithBrace: retryText?.startsWith("{"),
      };

      recordLLMCall({
        taskType: 'verdict',
        provider: attemptModel.provider,
        modelName: attemptModel.modelName,
        promptTokens: retryResult.usage?.inputTokens ?? 0,
        completionTokens: retryResult.usage?.outputTokens ?? 0,
        totalTokens: retryResult.usage?.totalTokens ?? 0,
        durationMs: Date.now() - startTime,
        success: true,
        schemaCompliant: false,
        retries: 1,
        errorMessage: `JSON parse failure on retry: ${JSON.stringify(retryParseFailureMetadata)}`,
        timestamp: new Date(),
        debateRole: options?.callContext?.debateRole,
        parseFailureArtifact: buildParseFailureArtifact(
          retryText,
          promptKey,
          options?.callContext?.debateRole ?? "unknown",
          "retry",
          expectedRootKind,
          lastRecoveriesAttempted,
        ),
      });
    } catch (retryError) {
      // Retry call itself failed - already handled by recordLLMCall in callModelWithGuard catch block
      // Rethrow to preserve real failure type (provider/network)
      throw retryError;
    }

    throw toError(
      `Stage 4: Failed to parse LLM response as JSON after retry for prompt "${promptKey}"`,
      {
        stage,
        promptKey,
        provider: attemptModel.provider,
        model: attemptModel.modelName,
        tier,
        reason: "json_parse_failure_after_retry",
        metadata: parseFailureMetadata,
      },
    );
  };
}

// ============================================================================
// DEBATE CONFIG VALIDATION HELPERS
// ============================================================================

/**
 * Check whether all 4 configurable debate roles lack structural independence.
 * Validation tier is excluded — it's a fixed-purpose check, not part of the debate.
 *
 * Accepts a resolved VerdictStageConfig (with explicit overrides already applied)
 * so that warnings are correct regardless of whether config came from explicit
 * overrides or hardcoded defaults.
 *
 * Structural independence exists when at least one of:
 *   - Tier diversity: not all 4 debate roles use the same tier
 *   - Provider diversity: not all 4 effective providers are identical
 *
 * Roles without an explicit provider use `undefined`, meaning "inherit global".
 * Two `undefined` values are considered the same provider (both inherit global).
 * An explicit `"anthropic"` is considered different from `undefined` even if the
 * global happens to be anthropic — because the resolved config captures intent,
 * and profiles always set explicit providers when they intend a specific one.
 *
 * Returns an AnalysisWarning if degenerate (all same tier + all same provider), null otherwise.
 */
export function checkDebateTierDiversity(
  verdictConfig: VerdictStageConfig,
): AnalysisWarning | null {
  const roles = verdictConfig.debateRoles;

  const debateRoleStrengths = [
    roles.advocate.strength,
    roles.selfConsistency.strength,
    roles.challenger.strength,
    roles.reconciler.strength,
  ];
  const allSameStrength = debateRoleStrengths.every((s) => s === debateRoleStrengths[0]);
  if (!allSameStrength) return null;

  // Check provider diversity
  const roleProviders = [
    roles.advocate.provider,
    roles.selfConsistency.provider,
    roles.challenger.provider,
    roles.reconciler.provider,
  ];
  const hasProviderDiversity = !roleProviders.every((p) => p === roleProviders[0]);
  if (hasProviderDiversity) return null;

  const strength = debateRoleStrengths[0];
  console.warn(
    `[Pipeline] All 4 debate roles configured to same strength "${strength}" — ` +
    `adversarial challenge may not produce structurally independent perspectives (C1/C16)`
  );
  return {
    type: "all_same_debate_tier",
    severity: "warning",
    message: `All 4 debate roles (advocate, selfConsistency, challenger, reconciler) use the same model strength "${strength}". ` +
      `Structurally independent models improve debate quality — consider mixing strengths for challenger or reconciler.`,
  };
}

/**
 * Pre-flight check for provider credentials on debate role overrides.
 * Returns AnalysisWarning[] for any role whose provider override lacks credentials.
 * Called at the pipeline level so warnings are surfaced in the analysis output.
 */
export function checkDebateProviderCredentials(
  verdictConfig: VerdictStageConfig,
): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];
  const roles = verdictConfig.debateRoles;

  const roleNames = ["advocate", "selfConsistency", "challenger", "reconciler", "validation"] as const;

  for (const role of roleNames) {
    const provider = roles[role].provider;
    if (provider && !hasProviderCredentials(provider)) {
      warnings.push({
        type: "debate_provider_fallback",
        severity: "warning",
        message: `Debate role "${role}" configured for provider "${provider}" but no credentials found. Will fall back to global provider at runtime.`,
        details: { role, configuredProvider: provider },
      });
    }
  }

  return warnings;
}
