/**
 * Core evaluation engine for Source Reliability Evaluation.
 *
 * Contains model evaluation, refinement, post-processing, and the
 * main evaluateSourceWithConsensus orchestrator.
 *
 * @module source-reliability/sr-eval-engine
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { getDeterministicTemperature } from "@/lib/analyzer/config";
import { debugLog } from "@/lib/analyzer/debug";
import { getPromptCachingOptions } from "@/lib/analyzer/llm";
import { ANTHROPIC_MODELS } from "@/lib/analyzer/model-tiering";
import { formatEvidenceForEvaluationPrompt } from "@/lib/source-reliability/evidence-quality-assessment";
import {
  computeRefinementConfidenceBoost,
  countUniqueEvidenceIds,
  extractEvidenceIdsFromText,
  getLanguageDetectionCaveat,
} from "@/lib/source-reliability-eval-helpers";
import {
  SOURCE_TYPE_EXPECTED_CAPS,
  scoreToFactualRating,
  meetsConfidenceRequirement,
  MIN_EVIDENCE_IDS_FOR_SCORE,
  MIN_FOUNDEDNESS_FOR_HIGH_SCORES,
} from "@/lib/source-reliability-config";
import {
  withTimeout,
  EvaluationResultSchema,
  RefinementResultSchema,
  type EvaluationResult,
  type EvidencePack,
  type ResponsePayload,
  type EvaluationError,
  type SrEvalConfig,
} from "./sr-eval-types";
import { getEvaluationPrompt, getRefinementPrompt } from "./sr-eval-prompts";
import { buildEvidencePack } from "./sr-eval-evidence-pack";
import {
  enrichEvidencePackWithQualityAssessment,
  getRemainingBudgetMs,
  getMinimumCoreEvaluationBudgetMs,
  resolveEvidenceQualityAssessmentModel,
  SR_PRIMARY_EVALUATION_TIMEOUT_MS,
  SR_REFINEMENT_TIMEOUT_MS,
} from "./sr-eval-enrichment";

// ============================================================================
// POST-PROCESSING & VALIDATION
// ============================================================================

/**
 * Compute foundedness score based on evidence grounding.
 */
function computeFoundednessScore(result: EvaluationResult, evidencePack: EvidencePack): number {
  const cited = result.evidenceCited ?? [];
  if (cited.length === 0) return 0;

  if (evidencePack.enabled && evidencePack.items.length > 0) {
    const ids = new Set(evidencePack.items.map((i) => i.id));
    const urls = new Set(evidencePack.items.map((i) => i.url));

    let totalRefs = 0;
    const uniqueRefs = new Set<string>();
    let recencyCount = 0;

    for (const item of cited) {
      if (item.recency && item.recency.trim()) recencyCount++;

      if (item.evidenceId && ids.has(item.evidenceId)) {
        totalRefs++;
        uniqueRefs.add(item.evidenceId);
      }

      const extracted = extractEvidenceIdsFromText(item.basis || "");
      for (const id of extracted) {
        if (ids.has(id)) {
          totalRefs++;
          uniqueRefs.add(id);
        }
      }

      if (item.url && urls.has(item.url)) {
        totalRefs++;
        uniqueRefs.add(item.url);
      }
    }

    const independentBonus = result.evidenceQuality?.independentAssessmentsCount
      ? Math.min(2, Math.max(0, result.evidenceQuality.independentAssessmentsCount) / 5)
      : 0;

    return totalRefs * 2 + uniqueRefs.size * 1 + recencyCount * 0.25 + independentBonus;
  }

  const recencyCount = cited.filter((c) => (c.recency ?? "").trim().length > 0).length;
  return cited.length + recencyCount * 0.25;
}

/**
 * Apply deterministic post-processing to enforce consistency and caps.
 *
 * 1. Enforce source type caps
 * 2. Align factualRating with score
 * 3. Add caveats when caps are applied
 */
function applyPostProcessing(result: EvaluationResult, evidencePack: EvidencePack): EvaluationResult {
  // Make a mutable copy
  const processed = { ...result, caveats: [...(result.caveats ?? [])] };

  // Skip if score is null (insufficient_data)
  if (processed.score === null) {
    processed.factualRating = "insufficient_data";
    return processed;
  }

  // 1. Flag missing sourceType classification
  const sourceType = processed.sourceType ?? "unknown";
  if (sourceType === "unknown") {
    debugLog(`[SR-Eval] sourceType is "unknown" — LLM did not classify the source type`, { domain: processed.domain });
    processed.caveats.push(`sourceType not classified by LLM — source type caps could not be applied.`);
  }

  // 2. Enforce source type caps (deterministic quality gate)
  const expectedCap = SOURCE_TYPE_EXPECTED_CAPS[sourceType];

  if (expectedCap !== undefined && processed.score > expectedCap) {
    const originalScore = processed.score;
    processed.score = expectedCap;
    debugLog(`[SR-Eval] Source type cap enforced: ${sourceType} score ${originalScore.toFixed(2)} → ${expectedCap.toFixed(2)}`, { sourceType, originalScore, expectedCap });
    processed.caveats.push(
      `Score capped from ${(originalScore * 100).toFixed(0)}% to ${(expectedCap * 100).toFixed(0)}% due to sourceType="${sourceType}".`
    );
  }

  // 3. Align factualRating with (potentially capped) score
  const expectedRating = scoreToFactualRating(processed.score);
  if (processed.factualRating !== expectedRating) {
    debugLog(`[SR-Eval] Aligning factualRating: ${processed.factualRating} → ${expectedRating}`);
    processed.factualRating = expectedRating;
  }

  // 4. Check grounding for high scores (asymmetric skepticism)
  const foundedness = computeFoundednessScore(processed, evidencePack);
  const uniqueEvidence = countUniqueEvidenceIds(processed, evidencePack);

  if (processed.score >= 0.72 && foundedness < MIN_FOUNDEDNESS_FOR_HIGH_SCORES) {
    // High score with weak grounding - add caveat
    processed.caveats.push(
      `High reliability score (${(processed.score * 100).toFixed(0)}%) with limited evidence grounding (foundedness: ${foundedness.toFixed(1)}).`
    );
  }

  if (processed.score !== null && uniqueEvidence < MIN_EVIDENCE_IDS_FOR_SCORE) {
    // Score without minimum evidence citations
    processed.caveats.push(
      `Score issued with only ${uniqueEvidence} unique evidence citations.`
    );
  }

  return processed;
}

function shouldSkipRefinementForSparseEvidence(
  result: EvaluationResult,
  evidencePack: EvidencePack,
): boolean {
  if (result.factualRating !== "insufficient_data" && result.score !== null) {
    return false;
  }

  if (!evidencePack.enabled || evidencePack.items.length === 0) {
    return true;
  }

  const groundedEvidenceCount = countUniqueEvidenceIds(result, evidencePack);
  return evidencePack.items.length === 1 && groundedEvidenceCount === 0;
}

// ============================================================================
// MODEL EVALUATION
// ============================================================================

function extractBiasIndicator(
  bias?: EvaluationResult["bias"],
): ResponsePayload["biasIndicator"] {
  if (!bias) return null;
  const spectrum = bias.politicalBias;
  if (spectrum === "not_applicable") return null;
  return spectrum;
}

function buildResponsePayload(
  result: EvaluationResult,
  modelPrimary: string,
  modelSecondary: string | null,
  consensusAchieved: boolean,
  evidencePack: EvidencePack,
  overrideScore?: number | null,
  overrideConfidence?: number
): ResponsePayload {
  return {
    score: overrideScore !== undefined ? overrideScore : result.score,
    confidence: overrideConfidence !== undefined ? overrideConfidence : result.confidence,
    modelPrimary,
    modelSecondary,
    consensusAchieved,
    reasoning: result.reasoning,
    category: result.factualRating,
    sourceType: result.sourceType || "unknown",
    evidencePack: {
      providersUsed: evidencePack.providersUsed,
      queries: evidencePack.queries,
      items: evidencePack.items,
      qualityAssessment: evidencePack.qualityAssessment,
    },
    biasIndicator: extractBiasIndicator(result.bias),
    bias: result.bias,
    evidenceCited: result.evidenceCited,
    caveats: result.caveats,
  };
}

function applyLanguageDetectionCaveat(payload: ResponsePayload, domain: string): void {
  const caveat = getLanguageDetectionCaveat(domain);
  if (!caveat) return;
  payload.caveats = [...(payload.caveats ?? []), caveat];
}

function applyEvidenceQualityAssessmentCaveat(
  payload: ResponsePayload,
  evidencePack: EvidencePack,
): void {
  const qa = evidencePack.qualityAssessment;
  if (!qa || qa.status !== "failed") return;
  payload.caveats = [
    ...(payload.caveats ?? []),
    "⚠️ Evidence quality assessment failed; fallback to flat evidence weighting was used.",
  ];
}

async function evaluateWithModel(
  domain: string,
  modelProvider: "anthropic" | "openai",
  evidencePack: EvidencePack,
  config: SrEvalConfig,
): Promise<{ result: EvaluationResult; modelName: string } | null> {
  const apiKeyEnvVar = modelProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  const apiKey = process.env[apiKeyEnvVar];

  if (!apiKey) {
    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: ${apiKeyEnvVar} not set in environment`);
    return null;
  }

  if (apiKey.startsWith("PASTE_") || apiKey === "sk-...") {
    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: ${apiKeyEnvVar} appears to be a placeholder value`);
    return null;
  }

  const prompt = getEvaluationPrompt(domain, evidencePack);
  const temperature = getDeterministicTemperature(0.3);

  const modelName = modelProvider === "anthropic"
    ? ANTHROPIC_MODELS.budget.modelId
    : config.openaiModel;

  debugLog(`[SR-Eval] Calling ${modelProvider} (${modelName}) for ${domain}...`);

  const model = modelProvider === "anthropic"
    ? anthropic(modelName)
    : openai(modelName);

  try {
    const response = await withTimeout(
      "SR primary evaluation",
      SR_PRIMARY_EVALUATION_TIMEOUT_MS,
      () =>
        generateText({
          model,
          messages: [
            {
              role: "system",
              content: `You are a media reliability analyst using EVIDENCE-ONLY methodology. CRITICAL RULES:
(1) Evaluate sources based solely on PROVIDED EVIDENCE - cite evidence pack items (E1, E2, etc.) for every claim.
(2) Apply SOURCE TYPE CAPS: propaganda_outlet/known_disinformation → ≤14%, state_controlled_media/platform_ugc → ≤42%. collaborative_reference has NO cap.
(3) Apply negative evidence caps: fabrication/disinformation → ≤14%, 3+ failures → ≤42%, 1-2 failures → ≤57%.
(4) Never use pretrained knowledge about sources.
(5) Self-published pages (source's own website) do NOT count as independent assessments.
(6) Default to insufficient_data when evidence is sparse (confidence < 0.50), unless source type is clearly identifiable (then score by source type).
(7) Separate political bias from accuracy - bias alone does not reduce score.
Always respond with valid JSON only.`,
              providerOptions: getPromptCachingOptions(modelProvider),
            },
            { role: "user", content: prompt },
          ],
          temperature,
        }),
    );

    const text = response.text?.trim() || "";
    if (!text) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Empty response`);
      return null;
    }

    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Invalid JSON`);
      console.error(`  - Raw response: ${text.slice(0, 200)}...`);
      return null;
    }

    let result = EvaluationResultSchema.parse(parsed);

    // Apply post-processing (caps, alignment)
    result = applyPostProcessing(result, evidencePack);

    const scoreStr = result.score !== null ? result.score.toFixed(2) : "null";
    debugLog(`[SR-Eval] ${modelProvider.toUpperCase()} SUCCESS: score=${scoreStr}, confidence=${result.confidence.toFixed(2)}, rating=${result.factualRating}, type=${result.sourceType || "unknown"}`, { domain, result });
    return { result, modelName };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const errorCode = err?.code || err?.status || "unknown";

    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED for ${domain}:`);
    console.error(`  - Error code: ${errorCode}`);
    console.error(`  - Message: ${errorMessage}`);

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("invalid_api_key")) {
      console.error(`  - DIAGNOSIS: API key is invalid or expired. Check ${apiKeyEnvVar}`);
    } else if (errorMessage.includes("429") || errorMessage.includes("rate_limit")) {
      console.error(`  - DIAGNOSIS: Rate limit exceeded. Wait and retry.`);
    } else if (errorMessage.includes("500") || errorMessage.includes("503")) {
      console.error(`  - DIAGNOSIS: Provider service error. Try again later.`);
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      console.error(`  - DIAGNOSIS: Request timed out. Network issue or slow response.`);
    }

    return null;
  }
}

// ============================================================================
// SEQUENTIAL REFINEMENT
// ============================================================================

/**
 * Call the secondary model to cross-check and refine the primary evaluation.
 * This implements the sequential refinement pattern where LLM2 reviews LLM1's work.
 */
async function refineEvaluation(
  domain: string,
  evidencePack: EvidencePack,
  initialResult: EvaluationResult,
  initialModelName: string,
  config: SrEvalConfig,
): Promise<{
  refinedResult: EvaluationResult;
  refinementApplied: boolean;
  refinementNotes: string;
  originalScore: number | null;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.startsWith("PASTE_") || apiKey === "sk-...") {
    debugLog(`[SR-Eval] Refinement skipped: OpenAI API key not configured`);
    return null;
  }

  // Build evidence section for the refinement prompt
  const evidenceSection = evidencePack.enabled && evidencePack.items.length > 0
    ? formatEvidenceForEvaluationPrompt(evidencePack.items)
    : "(No evidence items available)";

  const prompt = getRefinementPrompt(domain, evidenceSection, initialResult, initialModelName);
  const temperature = getDeterministicTemperature(0.3);
  const modelName = config.openaiModel;

  debugLog(`[SR-Eval] Starting refinement pass with ${modelName} for ${domain}...`);

  try {
    const { text } = await withTimeout(
      "SR refinement",
      SR_REFINEMENT_TIMEOUT_MS,
      () =>
        generateText({
          model: openai(modelName),
          prompt,
          temperature,
          maxOutputTokens: 2000,
        }),
    );

    // Parse JSON response
    const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      debugLog(`[SR-Eval] Refinement failed: Invalid JSON response`, { domain, response: text.slice(0, 500) });
      return null;
    }

    const validated = RefinementResultSchema.safeParse(parsed);
    if (!validated.success) {
      debugLog(`[SR-Eval] Refinement failed: Schema validation error`, { domain, errors: validated.error.issues });
      return null;
    }

    const refinement = validated.data;
    const originalScore = initialResult.score;
    const refinedScore = refinement.scoreAdjustment.refinedScore;
    const scoreChanged = refinedScore !== originalScore;

    // Build refined result
    const refinedResult: EvaluationResult = {
      ...initialResult,
      score: refinedScore,
      confidence: refinement.refinedConfidence,
      factualRating: refinement.refinedRating,
      reasoning: refinement.combinedReasoning,
      identifiedEntity: refinement.entityRefinement.identifiedEntity ?? initialResult.identifiedEntity,
      caveats: [
        ...(initialResult.caveats ?? []),
        ...(scoreChanged ? [`Score refined from ${originalScore !== null ? (originalScore * 100).toFixed(0) + '%' : 'null'} to ${refinedScore !== null ? (refinedScore * 100).toFixed(0) + '%' : 'null'}: ${refinement.scoreAdjustment.adjustmentReason}`] : []),
      ],
    };

    // Apply post-processing to ensure caps and rating alignment
    const processedResult = applyPostProcessing(refinedResult, evidencePack);

    const refinementNotes = [
      `Cross-check findings: ${refinement.crossCheckFindings}`,
      `Entity: ${refinement.entityRefinement.identifiedEntity ?? 'Not identified'} (${refinement.entityRefinement.organizationType})`,
      `Well-known: ${refinement.entityRefinement.isWellKnown ? 'Yes' : 'No'}`,
      scoreChanged ? `Score adjusted: ${refinement.scoreAdjustment.adjustmentReason}` : 'Score confirmed as appropriate',
    ].join(' | ');

    debugLog(`[SR-Eval] Refinement complete for ${domain}: ${scoreChanged ? 'score adjusted' : 'score confirmed'}`, {
      domain,
      originalScore,
      refinedScore: processedResult.score,
      refinementApplied: scoreChanged,
    });

    return {
      refinedResult: processedResult,
      refinementApplied: scoreChanged,
      refinementNotes,
      originalScore,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    debugLog(`[SR-Eval] Refinement failed with error: ${errorMessage}`, { domain });
    return null;
  }
}

// ============================================================================
// SEQUENTIAL REFINEMENT EVALUATION
// ============================================================================
//
// Architecture: LLM1 (Initial Evaluation) → LLM2 (Cross-check and Refine) → Final Result
//
// Benefits over parallel consensus:
// - LLM2 can catch what LLM1 missed (especially entity-level evaluation)
// - LLM2 explicitly cross-checks entity identification
// - LLM2 can apply baseline adjustments for known organization types
// - Better reasoning transparency (shows refinement logic)
// ============================================================================

export async function evaluateSourceWithConsensus(
  domain: string,
  multiModel: boolean,
  confidenceThreshold: number,
  config: SrEvalConfig,
): Promise<{ success: true; data: ResponsePayload } | { success: false; error: EvaluationError }> {
  const initialEvidencePack = await buildEvidencePack(domain, config);
  if (initialEvidencePack.enabled) {
    debugLog(
      `[SR-Eval] Evidence pack for ${domain}: ${initialEvidencePack.items.length} items`,
      { domain, itemCount: initialEvidencePack.items.length, providers: initialEvidencePack.providersUsed },
    );
  }

  // Budget note: per-domain prefetch timeout in analyzer defaults to 90s (`SR_CONFIG.evalTimeoutMs`).
  // Guard enrichment up front so core evaluation budget stays available.
  const remainingBudgetBeforeEnrichmentMs = getRemainingBudgetMs(
    config.requestStartedAtMs,
    config.requestBudgetMs,
  );
  const minimumBudgetForCoreEvaluationMs = getMinimumCoreEvaluationBudgetMs(multiModel);
  const minimumBudgetToAttemptEnrichmentMs =
    minimumBudgetForCoreEvaluationMs +
    Math.max(0, config.evidenceQualityAssessment.minRemainingBudgetMs);

  let evidencePack: EvidencePack;
  if (
    remainingBudgetBeforeEnrichmentMs !== null &&
    remainingBudgetBeforeEnrichmentMs < minimumBudgetToAttemptEnrichmentMs
  ) {
    const modelName = resolveEvidenceQualityAssessmentModel(
      config.evidenceQualityAssessment.model,
    ).modelName;
    debugLog(
      "[SR-Eval] Skipping evidence quality assessment due to tight request budget",
      {
        domain,
        remainingBudgetMs: remainingBudgetBeforeEnrichmentMs,
        minimumBudgetToAttemptEnrichmentMs,
        minimumBudgetForCoreEvaluationMs,
        multiModel,
      },
    );
    evidencePack = {
      ...initialEvidencePack,
      qualityAssessment: {
        status: "skipped",
        model: modelName,
        skippedReason: "budget_guard",
      },
    };
  } else {
    evidencePack = await enrichEvidencePackWithQualityAssessment(
      domain,
      initialEvidencePack,
      config.evidenceQualityAssessment,
      config.requestStartedAtMs,
      config.requestBudgetMs,
    );
  }

  return evaluateSourceWithPinnedEvidencePack(
    domain,
    evidencePack,
    multiModel,
    confidenceThreshold,
    config,
  );
}

/**
 * Run the LLM evaluation + refinement pipeline against an already-built,
 * already-quality-assessed evidence pack.
 *
 * This is the same STEP 1–4 logic used inside `evaluateSourceWithConsensus`,
 * exposed so controlled-replay harnesses can pin both the evidence pack AND
 * its quality assessment — isolating LLM / prompt / normalization changes
 * from live search-acquisition variance.
 *
 * Callers are responsible for:
 *   - Building / freezing the `EvidencePack` (including `qualityAssessment`).
 *   - Isolating any caches (e.g. `FH_SR_CACHE_PATH`) so replay does not
 *     contaminate or read from the production SR cache.
 */
export async function evaluateSourceWithPinnedEvidencePack(
  domain: string,
  evidencePack: EvidencePack,
  multiModel: boolean,
  confidenceThreshold: number,
  config: SrEvalConfig,
): Promise<{ success: true; data: ResponsePayload } | { success: false; error: EvaluationError }> {
  // ============================================================================
  // STEP 1: Primary evaluation (Anthropic Claude)
  // ============================================================================
  const primary = await evaluateWithModel(domain, "anthropic", evidencePack, config);
  if (!primary) {
    debugLog(`[SR-Eval] Primary evaluation failed for ${domain}`);
    return {
      success: false,
      error: {
        reason: "primary_model_failed",
        details: "Claude evaluation failed. Check API key or service availability.",
      },
    };
  }

  // Handle insufficient-data cases with clearly weak grounding.
  // If the primary pass already returns null / insufficient_data and the evidence
  // pack is effectively sparse (empty, a single item, or no grounded citations),
  // a refinement pass is unlikely to add signal and just burns latency.
  if (shouldSkipRefinementForSparseEvidence(primary.result, evidencePack)) {
    debugLog(`[SR-Eval] Skipping refinement for sparse insufficient-data case`, {
      domain,
      evidenceItemCount: evidencePack.items.length,
      groundedEvidenceCount: countUniqueEvidenceIds(primary.result, evidencePack),
    });
    const payload = buildResponsePayload(primary.result, primary.modelName, null, true, evidencePack);
    applyLanguageDetectionCaveat(payload, domain);
    applyEvidenceQualityAssessmentCaveat(payload, evidencePack);
    return {
      success: true,
      data: payload,
    };
  }

  // ============================================================================
  // STEP 2: Single-model mode - skip refinement
  // ============================================================================
  if (!multiModel) {
    debugLog(`[SR-Eval] Single-model mode: Using primary only for ${domain}`);
    const payload = buildResponsePayload(
      primary.result,
      primary.modelName,
      null,
      true, // consensusAchieved = true in single-model mode
      evidencePack
    );
    applyLanguageDetectionCaveat(payload, domain);
    applyEvidenceQualityAssessmentCaveat(payload, evidencePack);
    return {
      success: true,
      data: payload,
    };
  }

  // ============================================================================
  // STEP 3: Sequential Refinement (GPT-5 mini cross-checks Claude's work)
  // ============================================================================
  debugLog(`[SR-Eval] Starting sequential refinement for ${domain}...`);

  const refinement = await refineEvaluation(
    domain,
    evidencePack,
    primary.result,
    primary.modelName,
    config,
  );

  // If refinement fails, fall back to primary result
  if (!refinement) {
    debugLog(`[SR-Eval] Refinement failed for ${domain}, using primary result`);
    const payload = buildResponsePayload(
      primary.result,
      primary.modelName,
      config.openaiModel, // Attempted but failed
      false, // consensusAchieved = false (refinement failed)
      evidencePack,
      primary.result.score,
      primary.result.confidence * 0.9 // Slight confidence reduction when refinement fails
    );
    applyLanguageDetectionCaveat(payload, domain);
    applyEvidenceQualityAssessmentCaveat(payload, evidencePack);
    payload.identifiedEntity = primary.result.identifiedEntity;
    payload.caveats = [
      ...(payload.caveats ?? []),
      "⚠️ Refinement pass failed; using initial evaluation only."
    ];
    return {
      success: true,
      data: payload,
    };
  }

  // ============================================================================
  // STEP 4: Build final response with refinement data
  // ============================================================================
  const { refinedResult, refinementApplied, refinementNotes, originalScore } = refinement;

  // Apply confidence boost based on refinement substance (score delta + new evidence)
  const { boost: confidenceBoost } = computeRefinementConfidenceBoost(
    primary.result,
    refinedResult,
    evidencePack,
    refinementApplied
  );

  const boostedConfidence = Math.min(0.95, refinedResult.confidence + confidenceBoost);

  const finalRating = scoreToFactualRating(refinedResult.score);

  // Check confidence requirements (informational only, no blocking)
  const meetsConfReq = meetsConfidenceRequirement(finalRating, boostedConfidence);
  if (!meetsConfReq) {
    debugLog(`[SR-Eval] Note: confidence ${boostedConfidence.toFixed(2)} is below typical threshold for "${finalRating}" - proceeding anyway`, { domain, finalRating, boostedConfidence });
  }

  if (boostedConfidence < confidenceThreshold) {
    debugLog(`[SR-Eval] Note: confidence ${boostedConfidence.toFixed(2)} is below threshold ${confidenceThreshold} - proceeding with score anyway`, { domain, confidenceThreshold });
  }

  debugLog(
    `[SR-Eval] Sequential refinement complete for ${domain}: score=${refinedResult.score?.toFixed(2)}, conf=${boostedConfidence.toFixed(2)}, refined=${refinementApplied}`,
    { domain, finalScore: refinedResult.score, boostedConfidence, refinementApplied, originalScore }
  );

  // Build final payload
  const payload = buildResponsePayload(
    refinedResult,
    primary.modelName,
    config.openaiModel,
    true, // consensusAchieved = true (sequential refinement completed)
    evidencePack,
    refinedResult.score,
    boostedConfidence
  );
  applyLanguageDetectionCaveat(payload, domain);
  applyEvidenceQualityAssessmentCaveat(payload, evidencePack);

  payload.category = finalRating;
  payload.identifiedEntity = refinedResult.identifiedEntity;
  payload.refinementApplied = refinementApplied;
  payload.refinementNotes = refinementNotes;
  payload.originalScore = originalScore;

  if (refinementApplied) {
    payload.caveats = [
      ...(payload.caveats ?? []),
      `✓ Score refined by cross-check: ${originalScore !== null ? (originalScore * 100).toFixed(0) + '%' : 'null'} → ${refinedResult.score !== null ? (refinedResult.score * 100).toFixed(0) + '%' : 'null'}`
    ];
  }

  return {
    success: true,
    data: payload,
  };
}
