/**
 * Claim Extraction Stage — Stage 1 entry point
 *
 * Extracted from claimboundary-pipeline.ts (WS-2).
 * Two-pass evidence-grounded claim extraction with Gate 1 validation.
 *
 * Exports:
 *   - extractClaims: Stage 1 entry — Pass 1 → preliminary search → Pass 2 → Gate 1
 *   - runPass1: Quick claim scan (Haiku tier)
 *   - runPreliminarySearch: Seed evidence from preliminary sources
 *   - runPass2: Evidence-grounded claim extraction (Sonnet tier)
 *   - runGate1Validation: Opinion/specificity/fidelity gate
 *   - filterByCentrality: Centrality-based claim filtering
 *   - getAtomicityGuidance: Atomicity level → guidance text
 *   - generateSearchQueries: Search query generation from rough claims
 *   - ClaimContractOutputSchema: Zod schema for contract validation
 *   - PreliminaryEvidenceItem: Lightweight evidence type for inter-stage passing
 *
 * @module analyzer/claim-extraction-stage
 */

import type {
  AnalysisWarning,
  AtomicClaim,
  CBClaimUnderstanding,
  CBResearchState,
  ClaimSelectionStage1Observability,
  SourceType,
} from "./types";

import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
  type ModelTask,
} from "./llm";
import { loadAndRenderSection } from "./prompt-loader";
import { classifyRelevance } from "./research-extraction-stage";
import { normalizeExtractedSourceType, detectInputType, classifySourceFetchFailure } from "./pipeline-utils";

import { loadPipelineConfig, loadSearchConfig, loadCalcConfig } from "@/lib/config-loader";
import type { PipelineConfig, SearchConfig, CalcConfig } from "@/lib/config-schemas";

import { recordLLMCall, recordGate1Stats } from "./metrics-integration";

import { searchWebWithProvider, type SearchProviderErrorInfo } from "@/lib/web-search";
import { extractTextFromUrl } from "@/lib/retrieval";

// --- Zod schemas for Stage 1 LLM output parsing ---

const Pass1OutputSchema = z.object({
  impliedClaim: z.string(),
  backgroundDetails: z.string(),
  roughClaims: z.array(z.object({
    statement: z.string(),
    searchHint: z.string(),
  })),
  /** BCP-47 language code detected from input text (e.g., "de", "en", "fr") */
  detectedLanguage: z.string().catch("en"),
  /** ISO 3166-1 alpha-2 country inferred from claim content, or null if not geographically specific */
  inferredGeography: z.string().nullable().catch(null),
});

// Pass2AtomicClaimSchema: Most non-essential fields use .catch(default) to prevent
// "No object generated" errors from the AI SDK when the LLM outputs wrong enum casing,
// missing fields, or type mismatches. The .catch() provides sensible defaults while
// the JSON schema sent to the LLM still shows correct enum values.
// freshnessRequirement is intentionally strict-optional: absence is allowed for
// backward compatibility, but invalid enum values must fail validation so the
// claim-level freshness contract remains auditable.
// See: Docs/WIP/LLM_Expert_Review_Schema_Validation.md
export const Pass2AtomicClaimSchema = z.object({
  id: z.string().catch(""),
  statement: z.string().catch(""),
  category: z.enum(["factual", "evaluative", "procedural"]).catch("factual"),
  verifiability: z.enum(["high", "medium", "low", "none"]).optional().catch(undefined),
  freshnessRequirement: z.enum(["none", "recent", "current_snapshot"]).optional(),
  centrality: z.enum(["high", "medium", "low"]).catch("low"),
  harmPotential: z.enum(["critical", "high", "medium", "low"]).catch("low"),
  isCentral: z.boolean().catch(false),
  claimDirection: z.enum(["supports_thesis", "contradicts_thesis", "contextual"]).catch("contextual"),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).optional().catch(undefined),
  keyEntities: z.array(z.string()).catch([]),
  relevantGeographies: z.array(z.string()).optional().catch([]),
  checkWorthiness: z.enum(["high", "medium", "low"]).catch("medium"),
  specificityScore: z.number().catch(0.5),
  groundingQuality: z.enum(["strong", "moderate", "weak", "none"]).catch("moderate"),
  expectedEvidenceProfile: z.object({
    methodologies: z.array(z.string()).catch([]),
    expectedMetrics: z.array(z.string()).catch([]),
    expectedSourceTypes: z.array(z.string())
      .transform((values) =>
        values
          .map((value) => normalizeExtractedSourceType(value))
          .filter((value): value is SourceType => typeof value === "string"),
      )
      .catch([]),
    primaryMetric: z.string().optional(),
    componentMetrics: z.array(z.string()).optional().catch([]),
    sourceNativeRoutes: z.array(z.string()).optional().catch([]),
  }).catch({ methodologies: [], expectedMetrics: [], expectedSourceTypes: [], componentMetrics: [], sourceNativeRoutes: [] }),
});

// Pass2OutputSchema: All fields use .catch() defaults to prevent AI SDK NoObjectGeneratedError.
// The JSON Schema sent to the LLM is unaffected (.catch() only acts during safeParse).
// Quality-critical fields (.catch("") / .catch([])) are checked explicitly after parsing
// in the quality gate below — empty defaults trigger Zod-aware retry with specific feedback.
const Pass2OutputSchema = z.object({
  // Quality-critical fields — .catch("") prevents SDK throw; quality gate validates content.
  impliedClaim: z.string().catch(""),
  backgroundDetails: z.string().catch(""),
  articleThesis: z.string().catch(""),
  atomicClaims: z.array(Pass2AtomicClaimSchema).catch([]),
  // LLM-classified input type: replaces the char-count heuristic in detectInputType().
  // "claim" = short assertion, "question" = interrogative, "article" = long-form text.
  // Falls back to "claim" if LLM omits (backward-compat with pre-2.2 prompts).
  inputClassification: z.enum([
    "single_atomic_claim",
    "ambiguous_single_claim",
    "multi_assertion_input",
    "question",
    "article",
  ]).catch("single_atomic_claim"),
  // Metadata/structural fields — calling code already nullchecks with ?? fallbacks.
  distinctEvents: z.array(z.object({
    name: z.string(),
    date: z.string(),
    description: z.string(),
  })).nullish(),
  riskTier: z.enum(["A", "B", "C"]).nullish(),
  retainedEvidence: z.array(z.string()).nullish(),
});

// Narrow repair-pass contract: the repair path only needs to return a claim set
// with the anchor fused into an existing thesis-direct claim. Top-level Pass 2
// metadata stays on the pre-repair envelope already held in memory.
const ContractRepairOutputSchema = z.object({
  atomicClaims: z.array(Pass2AtomicClaimSchema).catch([]),
});

// Phase 7 E2: salience commitment stage output schema. Runs between Pass 1 and
// Pass 2. Log-only in this iteration — does NOT yet constrain Pass 2. The
// stage emits a list of distinguishing-meaning-aspect anchors for auditability
// and measurement.
const SalienceAnchorSchema = z.object({
  text: z.string().catch(""),
  inputSpan: z.string().catch(""),
  type: z.enum([
    "agent",
    "action_predicate",
    "temporal",
    "causal",
    "scope",
    "quantification",
    "modal_illocutionary",
    "attribution",
    "other",
  ]).catch("other"),
  rationale: z.string().catch(""),
  truthConditionShiftIfRemoved: z.string().catch(""),
});

const SalienceOutputSchema = z.object({
  anchors: z.array(SalienceAnchorSchema).catch([]),
});

const Gate1OutputSchema = z.object({
  validatedClaims: z.array(z.object({
    claimId: z.string(),
    passedOpinion: z.boolean(),
    passedSpecificity: z.boolean(),
    passedFidelity: z.boolean().catch(true),
    reasoning: z.string(),
  })),
});

const PreliminaryEvidenceItemSchema = z.object({
  statement: z.string(),
  sourceUrl: z.string().optional(), // URL of the source this evidence came from
  category: z.string().optional(),
  claimDirection: z.enum(["supports", "contradicts", "contextual"]).optional(),
  evidenceScope: z.object({
    methodology: z.string().optional(),
    temporal: z.string().optional(),
    geographic: z.string().optional(),
    boundaries: z.string().optional(),
  }).optional(),
  probativeValue: z.enum(["high", "medium", "low"]).optional(),
  sourceType: z.string().optional()
    .transform((value) => normalizeExtractedSourceType(value)),
  isDerivative: z.boolean().optional(),
  derivedFromSourceUrl: z.string().nullable().optional(),
  relevantClaimIds: z.array(z.string()).optional(),
});

const ExtractEvidenceOutputSchema = z.object({
  evidenceItems: z.array(PreliminaryEvidenceItemSchema),
});

// --- Preliminary evidence type (lightweight, for passing between stages) ---

export interface PreliminaryEvidenceItem {
  statement: string;
  sourceUrl: string;
  sourceTitle: string;
  evidenceScope?: {
    methodology?: string;
    temporal?: string;
    geographic?: string;
    boundaries?: string;
  };
  probativeValue?: "high" | "medium" | "low";
  claimDirection?: "supports" | "contradicts" | "contextual";
  sourceType?: string;
  relevantClaimIds?: string[];
}

/**
 * Stage 1: Extract atomic claims from input using two-pass evidence-grounded approach.
 *
 * Pass 1: Quick claim scan + preliminary search (Haiku tier)
 * Pass 2: Evidence-grounded claim extraction (Sonnet tier)
 * Then: Centrality filter + Gate 1 validation
 *
 * @param state - The mutable research state
 * @returns CBClaimUnderstanding with atomic claims
 */
export async function extractClaims(
  state: CBResearchState
): Promise<CBClaimUnderstanding> {
  // Load pipeline + search + calc configs from UCM
  const [pipelineResult, searchResult, calcResult] = await Promise.all([
    loadPipelineConfig("default", state.jobId),
    loadSearchConfig("default", state.jobId),
    loadCalcConfig("default", state.jobId),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;
  const calcConfig = calcResult.config;
  const stage1Observability: ClaimSelectionStage1Observability = {};
  state.stage1Observability = stage1Observability;

  // Log config load status for extract stage
  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM pipeline config load failed in extractClaims — using hardcoded defaults.`);
  }
  if (searchResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM search config load failed in extractClaims — using hardcoded defaults.`);
  }

  const currentDate = new Date().toISOString().split("T")[0];

  // ------------------------------------------------------------------
  // Pass 1: Rapid claim scan (Haiku)
  // ------------------------------------------------------------------
  state.onEvent?.("Extracting claims: Pass 1 (rapid scan)...", 12);
  state.onEvent?.(`LLM call: claim extraction (Pass 1) — ${getModelForTask("understand", undefined, pipelineConfig).modelName}`, -1);
  const pass1 = await runPass1(state.originalInput, pipelineConfig, currentDate);
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Phase 7 E2: salience-commitment stage.
  // Runs after Pass 1 and before preliminary search so the anchors can be
  // referenced during later measurement. Audit mode remains observational;
  // binding mode carries the same anchor set forward into Pass 2 / contract audit.
  // ------------------------------------------------------------------
  const salienceConfig = calcConfig.salienceCommitment ?? { enabled: true, mode: "audit" as const };
  const salienceEnabled = salienceConfig.enabled ?? true;
  let salienceCommitment: NonNullable<CBClaimUnderstanding["salienceCommitment"]>;
  if (salienceEnabled) {
    state.onEvent?.(`Extracting claims: salience commitment (${salienceConfig.mode})...`, 14);
    try {
      salienceCommitment = await runSalienceCommitment(
        state.originalInput,
        pipelineConfig,
        salienceConfig,
        state,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn("[Stage1] Salience commitment leaked a non-fatal error:", errorMessage);
      salienceCommitment = {
        ran: true,
        enabled: true,
        mode: salienceConfig.mode,
        success: false,
        errorMessage,
        anchors: [],
      };
    }
    if (salienceCommitment.ran) {
      state.llmCalls++;
      console.info(
        `[Stage1] E2 salience commitment: ${salienceCommitment.anchors.length} anchor(s) identified.`,
      );
    }
  } else {
    salienceCommitment = {
      ran: false,
      enabled: false,
      mode: salienceConfig.mode,
      success: false,
      anchors: [],
    };
  }

  // ------------------------------------------------------------------
  // Preliminary search: search web for rough claims, fetch sources, extract evidence
  // ------------------------------------------------------------------
  state.onEvent?.("Extracting claims: preliminary web search...", 15);
  const preliminaryEvidence = await runPreliminarySearch(
    pass1.roughClaims,
    searchConfig,
    pipelineConfig,
    currentDate,
    state,
    {
      language: pass1.detectedLanguage,
      geography: pass1.inferredGeography,
    },
  );

  // ------------------------------------------------------------------
  // Pass 2: Evidence-grounded extraction (Sonnet)
  // ------------------------------------------------------------------
  state.onEvent?.("Extracting claims: Pass 2 (evidence-grounded refinement)...", 22);
  state.onEvent?.(`LLM call: claim extraction (Pass 2) — ${getModelForTask("extract_evidence", undefined, pipelineConfig).modelName}`, -1);
  const pass2 = await runPass2(
    state.originalInput,
    preliminaryEvidence,
    pipelineConfig,
    currentDate,
    state,
    undefined,
    pass1.inferredGeography,
    pass1.detectedLanguage,
    undefined,
    salienceCommitment,
  );
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Claim Contract Validation — detect proxy drift before Gate 1
  // Runs after every Pass 2, triggers a single retry if material drift
  // or if validation returns no usable structured result.
  // ------------------------------------------------------------------
  let activePass2 = pass2;
  let stageAttribution: "initial" | "retry" | "repair" = "initial";
  const contractValidationEnabled = calcConfig.claimContractValidation?.enabled ?? true;
  const contractMaxRetries = calcConfig.claimContractValidation?.maxRetries ?? 1;
  // Observability: capture contract validation outcome for stored result
  let contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"] = undefined;
  let lastContractValidatedClaims: AtomicClaim[] | undefined;

  if (contractValidationEnabled) {
    state.onEvent?.("Validating claim contract fidelity...", 24);
    state.onEvent?.(`LLM call: claim contract validation — ${getModelForTask("context_refinement", undefined, pipelineConfig).modelName}`, -1);
    const contractValidationStartedAt = Date.now();

    const {
      result: contractResult,
      attempts: contractValidationAttempts,
    } = await runClaimContractValidationWithRetry(() =>
      validateClaimContract(
        pass2.atomicClaims as unknown as AtomicClaim[],
        state.originalInput,
        pass2.impliedClaim ?? "",
        pass2.articleThesis ?? "",
        pass2.inputClassification ?? "single_atomic_claim",
        pipelineConfig,
        salienceCommitment,
        pass2.distinctEvents ?? [],
      )
    );
    state.llmCalls += contractValidationAttempts;

    if (contractValidationAttempts > 1) {
      console.info(
        contractResult
          ? "[Stage1] Claim contract validation recovered on a second structured-output attempt."
          : "[Stage1] Claim contract validation returned no usable result after two attempts.",
      );
    }

    // Capture observability summary
    let evaluatedContract: EvaluatedClaimContractValidation | undefined;
    let anchorRetryReason: string | undefined;
    let atomicityRetryReason: string | undefined;
    if (contractResult) {
      evaluatedContract = await applyApprovedSingleClaimChallenges(
        pass2.atomicClaims as unknown as AtomicClaim[],
        evaluateClaimContractValidation(
          contractResult,
          pass2.atomicClaims as unknown as AtomicClaim[],
        ),
        state.originalInput,
        pass2.impliedClaim ?? "",
        pass2.articleThesis ?? "",
        pass2.inputClassification ?? "single_atomic_claim",
        pipelineConfig,
        state,
        24,
        salienceCommitment,
        pass2.distinctEvents ?? [],
      );
      lastContractValidatedClaims = pass2.atomicClaims as unknown as AtomicClaim[];
      anchorRetryReason = evaluatedContract.anchorRetryReason;
      atomicityRetryReason = evaluatedContract.atomicityRetryReason;
      contractValidationSummary = evaluatedContract.summary;
      contractValidationSummary.stageAttribution = stageAttribution;

      if (evaluatedContract.effectiveRePromptRequired) {
        if (anchorRetryReason) {
          console.info(`[Stage1] Claim contract validation override: forcing retry — ${anchorRetryReason}`);
        }
        if (atomicityRetryReason) {
          console.info(`[Stage1] Single-claim atomicity override: forcing retry — ${atomicityRetryReason}`);
        }
      }
    } else {
      lastContractValidatedClaims = pass2.atomicClaims as unknown as AtomicClaim[];
      contractValidationSummary = {
        ran: true,
        preservesContract: false,
        rePromptRequired: false,
        failureMode: "validator_unavailable",
        summary: "revalidation_unavailable: initial contract validation LLM call returned no usable result",
        stageAttribution,
      };
    }
    stage1Observability.contractValidationMs = Date.now() - contractValidationStartedAt;

    const shouldRetryAfterValidation =
      contractMaxRetries > 0 && (
        (evaluatedContract?.effectiveRePromptRequired
          ?? contractResult?.inputAssessment.rePromptRequired
          ?? false)
        || !contractResult
      );

    if (shouldRetryAfterValidation) {
      // Build corrective guidance from failing claims + anchor omission
      const failingClaims = (contractResult?.claims ?? [])
        .filter((c) => c.recommendedAction === "retry" || c.proxyDriftSeverity === "material");
      const failingReasons = failingClaims
        .map((c) => `${c.claimId}: ${c.reasoning}`)
        .join("; ");

      // Dynamic anchor-specific guidance when the retry is triggered by anchor omission
      const anchorText = contractResult?.truthConditionAnchor?.anchorText;
      const anchorGuidance = anchorRetryReason && anchorText
        ? ` The extracted claims omitted a truth-condition-bearing modifier from the input: "${anchorText}". This modifier changes the proposition's truth conditions. The primary direct claim must fuse this modifier with the action it modifies; do not externalize it into a supporting sub-claim.`
        : "";
      const atomicityGuidance = atomicityRetryReason
        ? ` The previous extraction kept one bundled claim even though the input ties one act/state to multiple independently verifiable coordinated branches. Split into one thesis-direct claim per coordinated branch, preserve any in-scope truth-condition-bearing modifier in each branch claim, and do NOT keep a bundled whole-claim version.`
        : "";

      const contractGuidance = contractResult
        ? `CLAIM CONTRACT CORRECTION: The previous extraction drifted from the original claim contract. ` +
          `${contractValidationSummary?.summary ?? contractResult.inputAssessment.summary}. ` +
          `Specific issues: ${failingReasons}.${anchorGuidance}${atomicityGuidance} ` +
          `Preserve the original evaluative meaning and use only neutral dimension qualifiers. ` +
          `The primary direct claim must fuse any truth-condition-bearing modifier with the action it modifies, preserving the user's original word(s) for the modifier **verbatim** in the claim's \`statement\` — do not translate, paraphrase, or restate the modifier in different legal or normative terminology, and do not externalize the modifier into a supporting sub-claim. ` +
          `Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate. ` +
          `For factual or procedural claims, preserve the original action/state threshold as well: do not rewrite a decisive act or decision as a discussion, consultation, review, recommendation, or other lower-threshold step, and do not upgrade a preparatory step into a final one. ` +
          `If a shared predicate or modifier applies across multiple actors in one sentence, preserve that same predicate/modifier in the actor-specific decomposition.`
        : `CLAIM CONTRACT CORRECTION: The contract-validation step did not return a usable structured result. Re-extract conservatively from the input only. ` +
          `Preserve the original evaluative meaning and use only neutral dimension qualifiers. ` +
          `The primary direct claim must fuse any truth-condition-bearing modifier with the action it modifies, preserving the user's original word(s) for the modifier **verbatim** in the claim's \`statement\` — do not translate, paraphrase, or restate the modifier in different legal or normative terminology, and do not externalize the modifier into a supporting sub-claim. ` +
          `Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate. ` +
          `For factual or procedural claims, preserve the original action/state threshold as well: do not rewrite a decisive act or decision as a discussion, consultation, review, recommendation, or other lower-threshold step, and do not upgrade a preparatory step into a final one. ` +
          `If a shared predicate or modifier applies across multiple actors in one sentence, preserve that same predicate/modifier in the actor-specific decomposition.`;

      console.info(
        contractResult
          ? `[Stage1] Claim contract validation detected material drift (${failingClaims.length} claim(s)). Retrying Pass 2 with corrective guidance.`
          : `[Stage1] Claim contract validation returned no usable result. Retrying Pass 2 with conservative contract guidance.`
      );

      const { retrySalienceCommitment, anchorEscalation } = buildContractRetrySaliencePlan(
        evaluatedContract,
        salienceCommitment,
      );

      if (anchorEscalation.mode === "binding_merged_anchor") {
        console.info(
          `[Stage1] Claim contract retry will use binding-mode salience with merged validator anchor "${anchorEscalation.anchorText}".`,
        );
      } else if (anchorEscalation.mode === "audit_guidance_only") {
        console.info(
          `[Stage1] Truth-condition anchor "${anchorEscalation.anchorText}" was omitted, but no trustworthy upstream salience inventory is available; retrying in audit mode with corrective guidance only.`,
        );
      }

      try {
        state.onEvent?.("Retrying Pass 2 with claim contract guidance...", 25);
        const retryPass2StartedAt = Date.now();
        let retryPass2;
        try {
          // Contract-correction retries must repair claim-text fidelity without
          // stripping evidence-profile context. The prompt and re-validation
          // guard statements against evidence leakage, while preliminary
          // evidence remains necessary for source-native routes and metrics.
          retryPass2 = await runPass2(
            state.originalInput,
            preliminaryEvidence,
            pipelineConfig,
            currentDate,
            state,
            contractGuidance,
            pass1.inferredGeography,
            pass1.detectedLanguage,
            "context_refinement",
            retrySalienceCommitment,
          );
        } finally {
          stage1Observability.retryPass2Ms = Date.now() - retryPass2StartedAt;
        }
        state.llmCalls++;

        console.info(
          `[Stage1] Claim contract retry produced ${retryPass2.atomicClaims.length} claim(s).`
        );

        let retryContractResult: ClaimContractValidationResult | undefined;
        state.onEvent?.("Validating retry claim contract fidelity...", 26);
        const retryContractValidationStartedAt = Date.now();
        try {
          const {
            result,
            attempts: retryContractValidationAttempts,
          } = await runClaimContractValidationWithRetry(() =>
            validateClaimContract(
              retryPass2.atomicClaims as unknown as AtomicClaim[],
              state.originalInput,
              retryPass2.impliedClaim ?? "",
              retryPass2.articleThesis ?? "",
              retryPass2.inputClassification ?? "single_atomic_claim",
              pipelineConfig,
              retrySalienceCommitment,
              retryPass2.distinctEvents ?? [],
            )
              );
          retryContractResult = result;
          state.llmCalls += retryContractValidationAttempts;

          if (retryContractValidationAttempts > 1) {
            console.info(
              retryContractResult
                ? "[Stage1] Claim contract retry validation recovered on a second structured-output attempt."
                : "[Stage1] Claim contract retry validation returned no usable result after two attempts.",
            );
          }
        } catch {
          // Re-validation failure is non-fatal — keep original Pass 2 output.
        } finally {
          stage1Observability.retryValidationMs = Date.now() - retryContractValidationStartedAt;
        }

        let evaluatedRetryContract = retryContractResult
          ? await applyApprovedSingleClaimChallenges(
            retryPass2.atomicClaims as unknown as AtomicClaim[],
            evaluateClaimContractValidation(
              retryContractResult,
              retryPass2.atomicClaims as unknown as AtomicClaim[],
            ),
            state.originalInput,
            retryPass2.impliedClaim ?? "",
            retryPass2.articleThesis ?? "",
            retryPass2.inputClassification ?? "single_atomic_claim",
            pipelineConfig,
            state,
            26,
            retrySalienceCommitment,
            retryPass2.distinctEvents ?? [],
          )
          : undefined;

        if (evaluatedRetryContract && !evaluatedRetryContract.effectiveRePromptRequired) {
          activePass2 = retryPass2;
          stageAttribution = "retry";
          lastContractValidatedClaims = retryPass2.atomicClaims as unknown as AtomicClaim[];
          contractValidationSummary = evaluatedRetryContract.summary;
          contractValidationSummary.stageAttribution = stageAttribution;
          console.info("[Stage1] Claim contract retry validated cleanly; using retry Pass 2.");
        } else if (!retryContractResult && !contractResult) {
          activePass2 = retryPass2;
          stageAttribution = "retry";
          lastContractValidatedClaims = retryPass2.atomicClaims as unknown as AtomicClaim[];
          console.warn("[Stage1] Claim contract retry could not be re-validated either; using conservative retry output but contract state remains degraded.");
        } else {
          console.info("[Stage1] Claim contract retry did not validate cleanly; keeping original Pass 2.");
        }
      } catch (retryErr) {
        console.warn("[Stage1] Claim contract retry failed (non-fatal):", retryErr);
      }
    } else if (contractResult) {
      console.info(
        `[Stage1] Claim contract validation passed: ${contractResult.inputAssessment.summary}`
      );
    }

    // ------------------------------------------------------------------
    // C11b (Phase 5): anchor-gated targeted repair pass.
    // After retry: if the LLM emitted a truthConditionAnchor whose anchorText
    // is marked present-in-input but does NOT appear as a literal substring
    // in any claim's statement, the retry has a deterministic modifier-omission
    // failure. Fire one narrow-scope LLM call to insert the anchor verbatim
    // into the thesis-direct claim, then let final revalidate authorize the
    // repaired set.
    // ------------------------------------------------------------------
    const repairPassEnabled = calcConfig.claimContractValidation?.repairPassEnabled ?? true;
    if (repairPassEnabled && contractValidationSummary && shouldRunContractRepairPass(contractValidationSummary)) {
      const anchor = contractValidationSummary.truthConditionAnchor;
      const anchorPresentInInput = anchor?.presentInInput === true;
      const currentClaims = activePass2.atomicClaims as unknown as AtomicClaim[];
      const repairAnchorText = selectRepairAnchorText(
        contractValidationSummary,
        currentClaims,
        salienceCommitment,
      );

      const anchorMissing =
        !!repairAnchorText &&
        anchorPresentInInput &&
        !claimSetContainsAnchorText(currentClaims, repairAnchorText);

      if (anchorMissing && repairAnchorText) {
        if (anchor?.anchorText?.trim() && anchor.anchorText.trim() !== repairAnchorText) {
          console.info(
            `[Stage1] Narrowed repair anchor from "${anchor.anchorText.trim()}" to salience-backed span "${repairAnchorText}" before contract repair.`,
          );
        }

        state.onEvent?.(`Repairing claim set to carry anchor "${repairAnchorText}" verbatim...`, 27);
        try {
          const repairPassStartedAt = Date.now();
          let repairedPass2;
          try {
            repairedPass2 = await runContractRepair(
              currentClaims,
              repairAnchorText,
              state.originalInput,
              activePass2.impliedClaim ?? "",
              activePass2.articleThesis ?? "",
              pipelineConfig,
              state,
            );
          } finally {
            stage1Observability.repairPassMs = Date.now() - repairPassStartedAt;
          }
          if (repairedPass2) {
            state.llmCalls++;

            // C17 [BLOCKER FIX]: mandatory re-validation refresh after repair.
            // Decoupled from Gate 1 to ensure structural and semantic correctness.
            state.onEvent?.("Validating repaired claim contract fidelity...", 28);
            const repairValidationStartedAt = Date.now();
            let repairValidationResult: ClaimContractValidationResult | undefined;
            let repairValidationAttempts = 0;
            try {
              ({
                result: repairValidationResult,
                attempts: repairValidationAttempts,
              } = await runClaimContractValidationWithRetry(() =>
                validateClaimContract(
                  repairedPass2.atomicClaims as unknown as AtomicClaim[],
                  state.originalInput,
                  activePass2.impliedClaim ?? "",
                  activePass2.articleThesis ?? "",
                  activePass2.inputClassification ?? "single_atomic_claim",
                  pipelineConfig,
                  salienceCommitment,
                  activePass2.distinctEvents ?? [],
                )
              ));
            } finally {
              stage1Observability.repairValidationMs = Date.now() - repairValidationStartedAt;
            }
            state.llmCalls += repairValidationAttempts;

            if (repairValidationAttempts > 1) {
              console.info(
                repairValidationResult
                  ? "[Stage1] Contract repair validation recovered on a second structured-output attempt."
                  : "[Stage1] Contract repair validation returned no usable result after two attempts.",
              );
            }

            if (repairValidationResult) {
              let evaluatedRepair = await applyApprovedSingleClaimChallenges(
                repairedPass2.atomicClaims as unknown as AtomicClaim[],
                evaluateClaimContractValidation(
                  repairValidationResult,
                  repairedPass2.atomicClaims as unknown as AtomicClaim[],
                ),
                state.originalInput,
                activePass2.impliedClaim ?? "",
                activePass2.articleThesis ?? "",
                activePass2.inputClassification ?? "single_atomic_claim",
                pipelineConfig,
                state,
                28,
                salienceCommitment,
                activePass2.distinctEvents ?? [],
              );
              if (!evaluatedRepair.effectiveRePromptRequired) {
                activePass2 = { ...activePass2, atomicClaims: repairedPass2.atomicClaims };
                stageAttribution = "repair";
                lastContractValidatedClaims = repairedPass2.atomicClaims as unknown as AtomicClaim[];
                contractValidationSummary = evaluatedRepair.summary;
                contractValidationSummary.stageAttribution = stageAttribution;
                console.info(
                  `[Stage1] Contract repair produced ${repairedPass2.atomicClaims.length} claim(s) with anchor "${repairAnchorText}" fused and validated cleanly.`
                );
              } else {
                console.info("[Stage1] Contract repair did not validate cleanly; keeping pre-repair set.");
              }
            } else {
              console.warn("[Stage1] Contract repair could not be re-validated; keeping pre-repair set.");
            }
          } else {
            console.warn("[Stage1] Contract repair returned no usable output; keeping retry Pass 2.");
          }
        } catch (repairErr) {
          console.warn("[Stage1] Contract repair failed (non-fatal):", repairErr);
        }
      }
    } else if (repairPassEnabled && contractValidationSummary) {
      console.info(
        "[Stage1] Skipping contract repair because the current claim set is already contract-approved."
      );
    }
  }

  // ------------------------------------------------------------------
  // Centrality filter — effective max is f(input length)
  // ------------------------------------------------------------------
  const centralityThreshold = pipelineConfig.centralityThreshold ?? "medium";
  const structuralInputType = detectInputType(state.originalInput);
  const maxCap = pipelineConfig.maxAtomicClaims ?? 5;
  const base = pipelineConfig.maxAtomicClaimsBase ?? 3;
  const charsPerClaim = pipelineConfig.atomicClaimsInputCharsPerClaim ?? 500;
  const effectiveMax = Math.min(
    maxCap,
    base + Math.floor(state.originalInput.length / charsPerClaim),
  );

  const protectedAnchorCarrierIds = shouldProtectValidatedAnchorCarriers(contractValidationSummary)
    ? contractValidationSummary?.truthConditionAnchor?.validPreservedIds ?? []
    : [];

  const filteredClaims = filterByCentrality(
    activePass2.atomicClaims as unknown as AtomicClaim[],
    centralityThreshold,
    effectiveMax,
    protectedAnchorCarrierIds,
  );

  const currentSetIsContractApproved =
    contractValidationSummary?.preservesContract === true
    && contractValidationSummary?.rePromptRequired === false;

  const gate1InputClaims = selectClaimsForGate1(
    activePass2.atomicClaims as unknown as AtomicClaim[],
    centralityThreshold,
    effectiveMax,
    contractValidationSummary,
    activePass2.inputClassification,
    structuralInputType,
    state.inputType,
    protectedAnchorCarrierIds,
  );

  if (currentSetIsContractApproved && gate1InputClaims.length !== filteredClaims.length) {
    console.info(
      `[Stage1] Current claim set is contract-approved; preserving all ${gate1InputClaims.length} claims for Gate 1 instead of centrality-truncating to ${filteredClaims.length}.`,
    );
  }

  // ------------------------------------------------------------------
  // Dimension decomposition tagging (structural routing on LLM outputs)
  // This checks LLM-assigned fields (centrality, claimDirection) to route claims —
  // it does NOT interpret text meaning, so it's deterministic plumbing, not analysis.
  // When multiple claims all have high centrality and supports_thesis direction,
  // they are dimension decompositions from an ambiguous_single_claim input.
  // Tagged claims are exempt from Gate 1 fidelity filtering — they represent
  // inherent interpretations of the input's semantic range, not evidence imports.
  // ------------------------------------------------------------------
  // Trust the LLM's explicit inputClassification. Only ambiguous_single_claim
  // outputs are dimension decompositions.
  const isDimensionInput = activePass2.inputClassification === "ambiguous_single_claim";
  if (isDimensionInput) {
    for (const c of filteredClaims) {
      (c as AtomicClaim).isDimensionDecomposition = true;
    }
  }

  // ------------------------------------------------------------------
  // Gate 1: Claim validation (Haiku, batched) — actively filters claims
  // ------------------------------------------------------------------
  state.onEvent?.("Extracting claims: Gate 1 validation...", 29);
  state.onEvent?.(`LLM call: Gate 1 validation — ${getModelForTask("understand", undefined, pipelineConfig).modelName}`, -1);
  let gate1Result = await runGate1Validation(
    gate1InputClaims,
    pipelineConfig,
    currentDate,
    state.originalInput,
  );
  state.llmCalls++;
  gate1Result = pruneGate1FidelityDriftFromContractApprovedSet(
    gate1Result,
    contractValidationSummary,
  );
  let bestPass2 = activePass2;

  // ------------------------------------------------------------------
  // D1 Commit 2: Reprompt loop — retry Pass 2 if post-Gate-1 claim count
  // is below the UCM-configured minimum. Uses fresh LLM calls with a brief
  // guidance note (no prior claim list — avoids anchoring the LLM).
  // ------------------------------------------------------------------
  const minCoreClaims = calcConfig.claimDecomposition?.minCoreClaimsPerContext ?? 2;
  const maxRepromptAttempts = calcConfig.claimDecomposition?.supplementalRepromptMaxAttempts ?? 2;

  // C14 (Phase 6): skip the reprompt loop when the current claim set has
  // already been validated by the contract authority. The reprompt exists to
  // hit an atomicity floor, NOT to recover from a quality problem — and on
  // Phase 6 Run 1 it destroyed a clean 1-claim contract-approved set and
  // produced a replacement that the final revalidator could not re-authorize.
  // A contract-approved claim set is sacred; do not regenerate it to hit a
  // count minimum.
  if (
    gate1Result.filteredClaims.length < minCoreClaims &&
    maxRepromptAttempts > 0 &&
    currentSetIsContractApproved
  ) {
    console.info(
      `[Stage1] Post-Gate-1 claim count (${gate1Result.filteredClaims.length}) < minimum (${minCoreClaims}), ` +
      `but the current claim set is contract-approved (C14). Skipping reprompt loop.`
    );
  } else if (
    gate1Result.filteredClaims.length < minCoreClaims &&
    maxRepromptAttempts > 0
  ) {
    console.info(
      `[Stage1] Post-Gate-1 claim count (${gate1Result.filteredClaims.length}) < minimum (${minCoreClaims}). ` +
      `Starting reprompt loop (max ${maxRepromptAttempts} attempts).`
    );

    // Track best result across attempts (initial + retries)
    let bestPostGate1Count = gate1Result.filteredClaims.length;
    let bestGate1Result = gate1Result;
    let bestAttemptPass2 = activePass2;

    for (let attempt = 1; attempt <= maxRepromptAttempts; attempt++) {
      state.onEvent?.(`Extracting claims: reprompt attempt ${attempt}/${maxRepromptAttempts}...`, 29);

      const guidance =
        `DECOMPOSITION GUIDANCE: Prior extraction produced ${bestPostGate1Count} claim(s), ` +
        `but the input likely contains multiple distinct verifiable dimensions. ` +
        `Attempt deeper dimension analysis — identify at least ${minCoreClaims} independent, ` +
        `verifiable aspects of the input that could be assessed separately.`;

      try {
        // Fresh Pass 2 with guidance (no prior claim list)
        const retryPass2 = await runPass2(
          state.originalInput,
          preliminaryEvidence,
          pipelineConfig,
          currentDate,
          state,
          guidance,
          pass1.inferredGeography,
          pass1.detectedLanguage,
          undefined,
          salienceCommitment,
        );
        state.llmCalls++;

        // Centrality filter
        const retryClaims = filterByCentrality(
          retryPass2.atomicClaims as unknown as AtomicClaim[],
          centralityThreshold,
          effectiveMax,
        );

        // Dimension decomposition tagging (same logic as initial pass)
        const retryIsDimension = retryPass2.inputClassification === "ambiguous_single_claim";
        if (retryIsDimension) {
          for (const c of retryClaims) {
            (c as AtomicClaim).isDimensionDecomposition = true;
          }
        }

        // Gate 1 validation
        const retryGate1 = await runGate1Validation(
          retryClaims,
          pipelineConfig,
          currentDate,
          state.originalInput,
        );
        state.llmCalls++;

        const retryCount = retryGate1.filteredClaims.length;
        console.info(
          `[Stage1] Reprompt attempt ${attempt}: ${retryCount} claims post-Gate-1 ` +
          `(best so far: ${bestPostGate1Count}).`
        );

        // Selection: highest post-Gate-1 count; ties → later attempt
        if (retryCount >= bestPostGate1Count) {
          bestPostGate1Count = retryCount;
          bestGate1Result = retryGate1;
          bestAttemptPass2 = retryPass2;
        }

        // Stop early if minimum reached
        if (bestPostGate1Count >= minCoreClaims) {
          console.info(`[Stage1] Reprompt recovered: ${bestPostGate1Count} claims >= minimum ${minCoreClaims}.`);
          break;
        }
      } catch (repromptErr) {
        // Reprompt failures are non-fatal — keep best result so far
        console.warn(`[Stage1] Reprompt attempt ${attempt} failed (non-fatal):`, repromptErr);
      }
    }

    // Use best result
    gate1Result = bestGate1Result;
    bestPass2 = bestAttemptPass2;

    // Add warning if minimum still not met after all retries
    if (bestPostGate1Count < minCoreClaims) {
      state.warnings.push({
        type: "low_claim_count",
        severity: "info",
        message: `Claim decomposition produced ${bestPostGate1Count} claim(s) after ${maxRepromptAttempts} reprompt attempt(s) ` +
          `(minimum: ${minCoreClaims}). Proceeding with best available decomposition.`,
        details: {
          stage: "stage1_reprompt",
          postGate1Count: bestPostGate1Count,
          minRequired: minCoreClaims,
          attemptsUsed: maxRepromptAttempts,
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // MT-5(C): Multi-event collapse guard — if Stage 1 detected multiple
  // distinct events but we still have only 1 claim after Gate 1 (and any
  // prior reprompts), trigger one targeted reprompt. Contract-approved
  // one-claim sets usually stay sacred; the one safe exception is when we
  // have a trustworthy salience inventory, can retry in binding mode, and
  // require the expanded set to re-authorize cleanly before acceptance.
  // ------------------------------------------------------------------
  const distinctEventCount = (bestPass2.distinctEvents ?? []).length;
  const shouldRunMt5Reprompt = shouldRunMultiEventReprompt(
    distinctEventCount,
    gate1Result.filteredClaims.length,
    maxRepromptAttempts,
    contractValidationSummary,
    salienceCommitment,
  );
  const usingContractApprovedMt5Exception =
    shouldRunMt5Reprompt &&
    currentSetIsContractApproved &&
    salienceCommitment?.success === true &&
    (salienceCommitment.anchors?.length ?? 0) > 0;

  if (
    distinctEventCount >= 2 &&
    gate1Result.filteredClaims.length === 1 &&
    maxRepromptAttempts > 0 &&
    !shouldRunMt5Reprompt
  ) {
    console.info(
      `[Stage1] MT-5(C): ${distinctEventCount} distinct events detected but the surviving ` +
      `1-claim set is contract-approved and no trustworthy salience-backed retry path is available. ` +
      `Skipping multi-event reprompt.`
    );
  } else if (shouldRunMt5Reprompt) {
    console.info(
      `[Stage1] MT-5(C): ${distinctEventCount} distinct events detected but only 1 claim post-Gate-1. ` +
      `Triggering multi-event reprompt.`
    );
    state.onEvent?.("Extracting claims: multi-event reprompt...", 30);

    try {
      const mt5RetrySalienceCommitment = usingContractApprovedMt5Exception
        ? toBindingSalienceCommitment(salienceCommitment) ?? salienceCommitment
        : salienceCommitment;

      const multiEventGuidance = buildMultiEventRepromptGuidance({
        distinctEventCount,
        distinctEvents: bestPass2.distinctEvents ?? [],
        salienceCommitment: mt5RetrySalienceCommitment,
        inputOnly: usingContractApprovedMt5Exception,
      });

      if (usingContractApprovedMt5Exception) {
        console.info(
          "[Stage1] MT-5(C): contract-approved single-claim set will retry under binding salience and must re-validate cleanly before acceptance.",
        );
      }

      const retryPass2 = await runPass2(
        state.originalInput,
        usingContractApprovedMt5Exception ? [] : preliminaryEvidence,
        pipelineConfig,
        currentDate,
        state,
        multiEventGuidance,
        pass1.inferredGeography,
        pass1.detectedLanguage,
        undefined,
        mt5RetrySalienceCommitment,
      );
      state.llmCalls++;

      const retryClaims = filterByCentrality(
        retryPass2.atomicClaims as unknown as AtomicClaim[],
        centralityThreshold,
        effectiveMax,
      );

      // Dimension decomposition tagging (same logic as initial pass)
      const retryIsDimension = retryPass2.inputClassification === "ambiguous_single_claim";
      if (retryIsDimension) {
        for (const c of retryClaims) {
          (c as AtomicClaim).isDimensionDecomposition = true;
        }
      }

      const retryGate1 = await runGate1Validation(
        retryClaims,
        pipelineConfig,
        currentDate,
        state.originalInput,
      );
      state.llmCalls++;

      const retryCount = retryGate1.filteredClaims.length;
      console.info(
        `[Stage1] MT-5(C) reprompt: ${retryCount} claims post-Gate-1 (was 1).`
      );

      // Accept if we got more claims than before. Contract-approved 1-claim
      // sets only switch to the MT-5(C) retry when the expanded set also
      // re-authorizes cleanly under the same contract validator.
      let acceptRetry = retryCount > gate1Result.filteredClaims.length;
      let evaluatedMt5Contract: EvaluatedClaimContractValidation | undefined;
      let acceptedMt5Gate1 = retryGate1;
      let acceptedMt5Pass2 = retryPass2;
      let acceptedMt5Count = retryCount;

      if (acceptRetry && usingContractApprovedMt5Exception) {
        state.onEvent?.("Validating multi-event retry claim contract fidelity...", 31);
        state.onEvent?.(`LLM call: claim contract validation — ${getModelForTask("context_refinement", undefined, pipelineConfig).modelName}`, -1);

        const {
          result: mt5ContractResult,
          attempts: mt5ContractValidationAttempts,
        } = await runClaimContractValidationWithRetry(() =>
          validateClaimContract(
            retryGate1.filteredClaims as AtomicClaim[],
            state.originalInput,
            retryPass2.impliedClaim ?? "",
            retryPass2.articleThesis ?? "",
            retryPass2.inputClassification ?? "single_atomic_claim",
            pipelineConfig,
            mt5RetrySalienceCommitment,
            retryPass2.distinctEvents ?? [],
          )
        );
        state.llmCalls += mt5ContractValidationAttempts;

        if (mt5ContractValidationAttempts > 1) {
          console.info(
            mt5ContractResult
              ? "[Stage1] MT-5(C) retry contract validation recovered on a second structured-output attempt."
              : "[Stage1] MT-5(C) retry contract validation returned no usable result after two attempts.",
          );
        }

        if (mt5ContractResult) {
          evaluatedMt5Contract = await applyApprovedSingleClaimChallenges(
            retryGate1.filteredClaims as AtomicClaim[],
            evaluateClaimContractValidation(
              mt5ContractResult,
              retryGate1.filteredClaims as AtomicClaim[],
            ),
            state.originalInput,
            retryPass2.impliedClaim ?? "",
            retryPass2.articleThesis ?? "",
            retryPass2.inputClassification ?? "single_atomic_claim",
            pipelineConfig,
            state,
            31,
            mt5RetrySalienceCommitment,
            retryPass2.distinctEvents ?? [],
          );
          acceptRetry = !evaluatedMt5Contract.effectiveRePromptRequired;
        } else {
          acceptRetry = false;
        }

        if (!acceptRetry && evaluatedMt5Contract?.effectiveRePromptRequired) {
          console.info(
            "[Stage1] MT-5(C) expanded retry failed contract validation; attempting one corrective decomposition retry before failing closed.",
          );

          const correctiveMt5Guidance =
            `${multiEventGuidance}\n\n` +
            `PREVIOUS EXPANDED CANDIDATE REJECTED BY CONTRACT VALIDATION: ${evaluatedMt5Contract.summary.summary}\n\n` +
            `CORRECTIVE DECOMPOSITION REQUIREMENTS: Return only a clean decomposition of the original input. ` +
            `Do not include one whole-input or near-verbatim bundled claim alongside its component claims. ` +
            `Do not omit explicit independently verifiable branches, proceedings, comparison sides, or decision gates. ` +
            `Preserve priority salience anchors fused with the original main act/state in each split claim where that anchor remains in semantic scope.`;

          // The corrective retry is purely about decomposition fidelity, so it
          // runs input-only to avoid copying details from preliminary evidence.
          const correctivePass2 = await runPass2(
            state.originalInput,
            [],
            pipelineConfig,
            currentDate,
            state,
            correctiveMt5Guidance,
            pass1.inferredGeography,
            pass1.detectedLanguage,
            "context_refinement",
            mt5RetrySalienceCommitment,
          );
          state.llmCalls++;

          const correctiveClaims = filterByCentrality(
            correctivePass2.atomicClaims as unknown as AtomicClaim[],
            centralityThreshold,
            effectiveMax,
          );
          const correctiveIsDimension = correctivePass2.inputClassification === "ambiguous_single_claim";
          if (correctiveIsDimension) {
            for (const c of correctiveClaims) {
              (c as AtomicClaim).isDimensionDecomposition = true;
            }
          }

          const correctiveGate1 = await runGate1Validation(
            correctiveClaims,
            pipelineConfig,
            currentDate,
            state.originalInput,
          );
          state.llmCalls++;

          const correctiveCount = correctiveGate1.filteredClaims.length;
          console.info(
            `[Stage1] MT-5(C) corrective reprompt: ${correctiveCount} claims post-Gate-1 (was 1).`,
          );

          if (correctiveCount > gate1Result.filteredClaims.length) {
            state.onEvent?.("Validating corrective multi-event retry claim contract fidelity...", 31);
            state.onEvent?.(`LLM call: claim contract validation — ${getModelForTask("context_refinement", undefined, pipelineConfig).modelName}`, -1);
            const {
              result: correctiveContractResult,
              attempts: correctiveContractValidationAttempts,
            } = await runClaimContractValidationWithRetry(() =>
              validateClaimContract(
                correctiveGate1.filteredClaims as AtomicClaim[],
                state.originalInput,
                correctivePass2.impliedClaim ?? "",
                correctivePass2.articleThesis ?? "",
                correctivePass2.inputClassification ?? "single_atomic_claim",
                pipelineConfig,
                mt5RetrySalienceCommitment,
                correctivePass2.distinctEvents ?? [],
              )
            );
            state.llmCalls += correctiveContractValidationAttempts;

            if (correctiveContractResult) {
              const evaluatedCorrectiveContract = await applyApprovedSingleClaimChallenges(
                correctiveGate1.filteredClaims as AtomicClaim[],
                evaluateClaimContractValidation(
                  correctiveContractResult,
                  correctiveGate1.filteredClaims as AtomicClaim[],
                ),
                state.originalInput,
                correctivePass2.impliedClaim ?? "",
                correctivePass2.articleThesis ?? "",
                correctivePass2.inputClassification ?? "single_atomic_claim",
                pipelineConfig,
                state,
                31,
                mt5RetrySalienceCommitment,
                correctivePass2.distinctEvents ?? [],
              );
              acceptRetry = !evaluatedCorrectiveContract.effectiveRePromptRequired;
              if (acceptRetry) {
                evaluatedMt5Contract = evaluatedCorrectiveContract;
                acceptedMt5Gate1 = correctiveGate1;
                acceptedMt5Pass2 = correctivePass2;
                acceptedMt5Count = correctiveCount;
              } else {
                evaluatedMt5Contract = evaluatedCorrectiveContract;
              }
            }
          }
        }
      }

      if (acceptRetry) {
        gate1Result = acceptedMt5Gate1;
        bestPass2 = acceptedMt5Pass2;
        if (evaluatedMt5Contract) {
          stageAttribution = "retry";
          lastContractValidatedClaims = acceptedMt5Gate1.filteredClaims as AtomicClaim[];
          contractValidationSummary = evaluatedMt5Contract.summary;
          contractValidationSummary.stageAttribution = stageAttribution;
        }
        console.info(`[Stage1] MT-5(C) recovered: ${acceptedMt5Count} claims.`);
      } else if (usingContractApprovedMt5Exception) {
        if (evaluatedMt5Contract?.effectiveRePromptRequired && retryCount > gate1Result.filteredClaims.length) {
          contractValidationSummary = {
            ...evaluatedMt5Contract.summary,
            preservesContract: false,
            rePromptRequired: true,
            failureMode: "contract_violated",
            stageAttribution: "retry",
            summary: [
              "MT-5(C) detected a likely single-claim collapse. Expanded retry candidates produced more than one claim but failed contract revalidation, so the original one-claim set is not safe to ship.",
              evaluatedMt5Contract.summary.summary,
            ].filter(Boolean).join(" "),
          };
          console.info(
            "[Stage1] MT-5(C) retry did not re-validate cleanly; marking the Stage 1 contract as failed instead of keeping the existing one-claim set.",
          );
        } else {
          console.info(
            "[Stage1] MT-5(C) retry did not produce an expanded clean candidate; keeping the existing contract-approved single-claim set.",
          );
        }
      }
    } catch (repromptErr) {
      console.warn("[Stage1] MT-5(C) reprompt failed (non-fatal):", repromptErr);
    }
  }

  // ------------------------------------------------------------------
  // Emit warnings for thesis-direct claims rescued from the opinion+specificity filter.
  if (gate1Result.rescuedThesisDirect && gate1Result.rescuedThesisDirect.length > 0) {
    for (const claimId of gate1Result.rescuedThesisDirect) {
      const claim = gate1Result.filteredClaims.find((c) => c.id === claimId);
      state.warnings.push({
        type: "gate1_thesis_direct_rescue",
        severity: "info",
        message: `Claim ${claimId} failed both opinion and specificity checks but rescued as thesis-direct claim. Stage 4 will assess with appropriate confidence.`,
        details: { claimId, statement: claim?.statement?.slice(0, 120) },
      });
    }
  }

  const finalAcceptedClaims = gate1Result.filteredClaims as AtomicClaim[];
  if (contractValidationEnabled && !areClaimSetsEquivalent(lastContractValidatedClaims, finalAcceptedClaims)) {
    if (finalAcceptedClaims.length === 0) {
      contractValidationSummary = {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        failureMode: "contract_violated",
        summary: "No claims remained after Gate 1; the final accepted claim set cannot preserve the original claim contract.",
        stageAttribution,
      };
      console.info("[Stage1] Final accepted claims are empty after Gate 1; contract summary refreshed to reflect the final claim set.");
    } else {
      state.onEvent?.("Refreshing claim contract summary for final accepted claims...", 30);
      state.onEvent?.(`LLM call: claim contract validation — ${getModelForTask("context_refinement", undefined, pipelineConfig).modelName}`, -1);
      const previousContractValidationSummary = contractValidationSummary;

      const {
        result: finalContractResult,
        attempts: finalContractValidationAttempts,
      } = await runClaimContractValidationWithRetry(() =>
        validateClaimContract(
          finalAcceptedClaims,
          state.originalInput,
          bestPass2.impliedClaim ?? "",
          bestPass2.articleThesis ?? "",
          bestPass2.inputClassification ?? "single_atomic_claim",
          pipelineConfig,
          salienceCommitment,
          bestPass2.distinctEvents ?? [],
        )
      );
      state.llmCalls += finalContractValidationAttempts;

      if (finalContractValidationAttempts > 1) {
        state.onEvent?.("Retrying final contract revalidation...", 31);
        console.info(
          finalContractResult
            ? "[Stage1] Final contract revalidation recovered on a second structured-output attempt."
            : "[Stage1] Final contract revalidation returned no usable result after two attempts.",
        );
      }

      if (finalContractResult) {
        let evaluatedFinalContract = await applyApprovedSingleClaimChallenges(
          finalAcceptedClaims,
          evaluateClaimContractValidation(
            finalContractResult,
            finalAcceptedClaims,
          ),
          state.originalInput,
          bestPass2.impliedClaim ?? "",
          bestPass2.articleThesis ?? "",
          bestPass2.inputClassification ?? "single_atomic_claim",
          pipelineConfig,
          state,
          30,
          salienceCommitment,
          bestPass2.distinctEvents ?? [],
        );
        contractValidationSummary = evaluatedFinalContract.summary;
        contractValidationSummary.stageAttribution = stageAttribution;
        console.info("[Stage1] Refreshed contract summary for final accepted claims after Gate 1 / reprompt selection.");
      } else if (canCarryForwardValidatedContractApproval(
        previousContractValidationSummary,
        lastContractValidatedClaims,
        finalAcceptedClaims,
      )) {
        contractValidationSummary = {
          ...previousContractValidationSummary!,
          summary: [
            previousContractValidationSummary?.summary ?? "",
            "final_revalidation_unavailable: carried forward the last contract-approved summary because Gate 1 kept only previously validated claims and all validated anchor carriers remained present.",
          ].filter(Boolean).join(" "),
          stageAttribution,
        };
        console.warn(
          "[Stage1] Final accepted claims could not be re-validated; carrying forward prior contract approval because the final set retains only previously validated claims and all validated anchor carriers survived.",
        );
      } else {
        // Fix 3 (2026-04-10): do NOT stamp preservesContract=true on a path
        // that explicitly could not verify success. This branch is only
        // reached when the final accepted claim set differs from the last
        // validated set (see guard above), so the prior summary is stale
        // by construction and cannot be carried forward. Mark the state
        // as degraded/unknown so the Wave 1A safeguard in
        // claimboundary-pipeline.ts can decide how to surface the failure
        // to the user instead of silently shipping an unverified report.
        contractValidationSummary = {
          ran: true,
          preservesContract: false,
          rePromptRequired: false,
          failureMode: "validator_unavailable",
          summary: "revalidation_unavailable: final accepted claim set changed after Gate 1, but the contract re-validation LLM call returned no usable result. State is unknown and treated as degraded.",
          stageAttribution,
        };
        console.warn("[Stage1] Final accepted claims could not be re-validated; marked as degraded (no silent fail-open).");
      }
    }
  }

  stage1Observability.candidateClaimCount = finalAcceptedClaims.length;
  stage1Observability.contractValidationFailureMode = contractValidationSummary?.failureMode;
  stage1Observability.stageAttribution = contractValidationSummary?.stageAttribution;

  // Assemble CBClaimUnderstanding
  // ------------------------------------------------------------------
  return {
    // Use LLM's inputClassification when available (Phase 2.2); fall back to char-count heuristic.
    // The LLM sees semantic content (question marks, article structure) that the heuristic misses.
    detectedInputType: (bestPass2.inputClassification === "question" || bestPass2.inputClassification === "article")
      ? bestPass2.inputClassification
      : detectInputType(state.originalInput),
    impliedClaim: bestPass2.impliedClaim,
    backgroundDetails: bestPass2.backgroundDetails,
    articleThesis: bestPass2.articleThesis,
    atomicClaims: gate1Result.filteredClaims,
    distinctEvents: bestPass2.distinctEvents ?? [],
    riskTier: bestPass2.riskTier ?? "B",
    detectedLanguage: pass1.detectedLanguage,
    inferredGeography: pass1.inferredGeography,
    preliminaryEvidence: preliminaryEvidence.map((pe) => ({
      sourceUrl: pe.sourceUrl,
      sourceTitle: pe.sourceTitle,
      snippet: pe.statement,
      claimId: pe.relevantClaimIds?.[0] ?? "",
      relevantClaimIds: pe.relevantClaimIds ?? [],
      probativeValue: pe.probativeValue,
      claimDirection: pe.claimDirection,
      sourceType: pe.sourceType,
      evidenceScope: pe.evidenceScope,
    })),
    gate1Stats: gate1Result.stats,
    // D2: Audit data — pre-filter claims and Gate 1 reasoning for diagnostics
    preFilterAtomicClaims: (gate1Result as any).preFilterClaims,
    gate1Reasoning: (gate1Result as any).gate1Reasoning,
    // Observability: Stage-1 diagnostics for future investigations
    inputClassification: bestPass2.inputClassification ?? undefined,
    contractValidationSummary,
    // Phase 7 E2 (log-only): upstream salience commitment for recall/precision
    // measurement against the contract validator's post-hoc anchor discovery.
    ...(salienceCommitment ? { salienceCommitment } : {}),
  };
}

// ============================================================================
// STAGE 1 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Map claimAtomicityLevel (1-5) to natural-language guidance for the LLM.
 * Exported for unit testing.
 */
export function getAtomicityGuidance(level: number): string {
  switch (level) {
    case 1:
      return "ATOMICITY: Very relaxed. Prefer broad, composite claims. Merge aggressively — combine related sub-assertions into single high-level claims. Aim for the fewest possible claims that still cover the input's core assertions.";
    case 2:
      return "ATOMICITY: Relaxed. Prefer broader claims when assertions are related. Merge claims that share the same evidence base or subject matter. Only split when assertions are truly independent.";
    case 3:
      return "ATOMICITY: Moderate. Balance granularity and breadth. Merge semantically overlapping assertions, but keep genuinely independent claims separate. Each claim should represent a distinct verifiable proposition.";
    case 4:
      return "ATOMICITY: Strict. Prefer granular claims. Split multi-part assertions into separate claims when each part can be independently verified. Only merge near-duplicates that would require identical evidence.";
    case 5:
      return "ATOMICITY: Very strict. Maximum granularity. Each distinct verifiable sub-assertion should be its own claim. Only merge true duplicates (same assertion, same scope). Compound claims must be decomposed.";
    default:
      return "ATOMICITY: Moderate. Balance granularity and breadth. Merge semantically overlapping assertions, but keep genuinely independent claims separate.";
  }
}

/**
 * Pass 1: Rapid claim scan using Haiku.
 * Extracts impliedClaim, backgroundDetails, and roughClaims from input text.
 */
export async function runPass1(
  inputText: string,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<z.infer<typeof Pass1OutputSchema>> {
  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS1", {
    currentDate,
    analysisInput: inputText,
  });
  if (!rendered) {
    throw new Error("Stage 1 Pass 1: Failed to load CLAIM_EXTRACTION_PASS1 prompt section");
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;
  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        { role: "user", content: inputText },
      ],
      temperature: (pipelineConfig.understandTemperature ?? 0.15),
      output: Output.object({ schema: Pass1OutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      throw new Error("Stage 1 Pass 1: LLM returned no structured output");
    }

    const validated = Pass1OutputSchema.parse(parsed);
    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });
    return validated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    throw error;
  }
}

/**
 * Phase 7 E2: upstream salience-commitment stage.
 *
 * Runs between Pass 1 and Pass 2, after language/geography are known.
 * A dedicated, single-responsibility LLM call that identifies the
 * distinguishing meaning aspects (anchors) of the input via the sibling
 * test. Uses the `understand` tier (Haiku today) — this is an interpretive
 * step, not verdict reasoning.
 *
 * In audit mode, the emitted anchors are written to
 * `understanding.salienceCommitment` for auditability and measurement.
 * In binding mode, the same emitted set becomes the precommitted anchor
 * inventory for downstream Pass 2 / contract-audit prompts.
 *
 * Non-fatal: the stage still returns structured status on any error. The
 * pipeline continues with the existing V5 in-prompt scaffold if this stage
 * is disabled or fails.
 */
export async function runSalienceCommitment(
  inputText: string,
  pipelineConfig: PipelineConfig,
  salienceConfig: { enabled: boolean; mode: "audit" | "binding" },
  state: Pick<CBResearchState, "onEvent"> | undefined,
): Promise<NonNullable<CBClaimUnderstanding["salienceCommitment"]>> {
  const enabled = salienceConfig.enabled !== false;
  const mode = salienceConfig.mode ?? "audit";
  if (!enabled) {
    return {
      ran: false,
      enabled: false,
      mode,
      success: false,
      anchors: [],
    };
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);
  state?.onEvent?.(`LLM call: salience commitment — ${model.modelName}`, -1);

  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_SALIENCE_COMMITMENT", {
    analysisInput: inputText,
  });

  if (!rendered) {
    console.warn("[Stage1] CLAIM_SALIENCE_COMMITMENT prompt section not found; skipping.");
    return {
      ran: true,
      enabled: true,
      mode,
      success: false,
      errorMessage: "CLAIM_SALIENCE_COMMITMENT prompt section not found",
      anchors: [],
    };
  }

  const llmCallStartedAt = Date.now();
  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        { role: "user", content: inputText },
      ],
      temperature: 0,
      output: Output.object({ schema: SalienceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "understand",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Salience commitment returned no structured output",
        timestamp: new Date(),
      });
      return {
        ran: true,
        enabled: true,
        mode,
        success: false,
        errorMessage: "Salience commitment returned no structured output",
        anchors: [],
      };
    }

    const validated = SalienceOutputSchema.parse(parsed);

    // Structural sanity: filter out anchors whose `text` is not actually a
    // substring of the input. Matches the AGENTS.md rules for anchor handling.
    // C17: use case-insensitive check to avoid trivial case-mismatch failures.
    const anchors = (validated.anchors ?? [])
      .filter((a) => typeof a.text === "string" && a.text.length > 0)
      .filter((a) => inputText.toLowerCase().includes(a.text.toLowerCase()))
      .map((a) => ({
        text: a.text,
        inputSpan: a.inputSpan,
        type: a.type,
        rationale: a.rationale,
        truthConditionShiftIfRemoved: a.truthConditionShiftIfRemoved,
      }));

    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return {
      ran: true,
      enabled: true,
      mode,
      success: true,
      anchors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("[Stage1] Salience commitment failed (non-fatal):", errorMessage);
    return {
      ran: true,
      enabled: true,
      mode,
      success: false,
      errorMessage,
      anchors: [],
    };
  }
}

/**
 * Preliminary search: for each rough claim, search the web, fetch sources,
 * and extract brief evidence with EvidenceScope metadata.
 */
export async function runPreliminarySearch(
  roughClaims: Array<{ statement: string; searchHint: string }>,
  searchConfig: SearchConfig,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  state: CBResearchState,
  searchGeo?: { language?: string; geography?: string | null },
): Promise<PreliminaryEvidenceItem[]> {
  const queriesPerClaim = pipelineConfig.preliminarySearchQueriesPerClaim ?? 2;
  const maxSources = pipelineConfig.preliminaryMaxSources ?? 5;
  const fetchTimeoutMs = pipelineConfig.sourceFetchTimeoutMs ?? 20000;

  const allEvidence: PreliminaryEvidenceItem[] = [];
  type SharedFetchResult =
    | {
      ok: true;
      url: string;
      text: string;
      title: string;
      contentType: string;
    }
    | {
      ok: false;
      url: string;
      error?: ReturnType<typeof classifySourceFetchFailure>;
    };
  const sharedFetchPromises = new Map<string, Promise<SharedFetchResult>>();

  const fetchSourceOnce = (searchResult: { url: string; title?: string }) => {
    const existing = sharedFetchPromises.get(searchResult.url);
    if (existing) {
      return existing;
    }

    const fetchPromise: Promise<SharedFetchResult> = (async (): Promise<SharedFetchResult> => {
      try {
        const content = await extractTextFromUrl(searchResult.url, {
          timeoutMs: fetchTimeoutMs,
          maxLength: pipelineConfig?.sourceExtractionMaxLength ?? 15000,
        });
        if (content.text.length > 100) {
          return {
            ok: true,
            url: searchResult.url,
            title: content.title || searchResult.title || "",
            text: content.text,
            contentType: content.contentType,
          };
        }
        return {
          ok: false,
          url: searchResult.url,
        };
      } catch (error: unknown) {
        return {
          ok: false,
          url: searchResult.url,
          error: classifySourceFetchFailure(error),
        };
      }
    })();

    sharedFetchPromises.set(searchResult.url, fetchPromise);
    void fetchPromise.then((result) => {
      if (!result.ok && sharedFetchPromises.get(searchResult.url) === fetchPromise) {
        sharedFetchPromises.delete(searchResult.url);
      }
    });
    return fetchPromise;
  };

  // Limit to top 3 rough claims to control cost (§8.1: "impliedClaim and top 2-3 rough claims")
  const claimsToSearch = roughClaims.slice(0, 3);

  // P1-B: Parallelize across claims. Each claim's queries are independent.
  // Collect results locally per claim to avoid shared-state races on state.sources,
  // then merge deterministically afterward.
  type ProviderErrorInfo = {
    provider?: string;
    status?: number;
    message: string;
    query: string;
  };
  type LocalResult = {
    evidence: PreliminaryEvidenceItem[];
    searchQueries: typeof state.searchQueries;
    sources: typeof state.sources;
    warnings: typeof state.warnings;
    providerErrors: ProviderErrorInfo[];
    llmCalls: number;
  };

  const claimResults = await Promise.all(
    claimsToSearch.map(async (claim): Promise<LocalResult> => {
      const local: LocalResult = {
        evidence: [],
        searchQueries: [],
        sources: [],
        warnings: [],
        providerErrors: [],
        llmCalls: 0,
      };

      // Track URLs fetched within this claim to avoid duplicate LLM extraction
      // when two queries return the same source. (Merge-phase dedup handles
      // cross-claim duplicates in state.sources.)
      const claimFetchedUrls = new Set<string>();

      const queries = generateSearchQueries(claim, queriesPerClaim);

      // Parallelize across queries within this claim
      await Promise.all(
        queries.map(async (query) => {
          try {
            const response = await searchWebWithProvider({
              query,
              maxResults: maxSources,
              config: searchConfig,
              detectedLanguage: searchConfig.searchLanguageOverride ?? searchGeo?.language,
            });

            local.searchQueries.push({
              query,
              iteration: 0,
              focus: "preliminary",
              resultsCount: response.results.length,
              timestamp: new Date().toISOString(),
              searchProvider: response.providersUsed.join(", "),
            });
            if (response.results.length > 0) {
              state.onEvent?.(`Preliminary search: ${response.providersUsed.join(", ")} — ${response.results.length} results`, -1);
            }

            if (response.errors && response.errors.length > 0) {
              for (const provErr of response.errors) {
                local.providerErrors.push({
                  provider: provErr.provider,
                  status: provErr.status,
                  message: provErr.message,
                  query,
                });
                // onEvent is fire-and-forget notification — safe to call from parallel workers
                state.onEvent?.(`Search provider "${provErr.provider}" error: ${provErr.message}`, 0);
              }
            }

            const provisionalClaim = {
              id: "AC_PRELIMINARY",
              statement: claim.statement,
              freshnessRequirement: "none",
            } as AtomicClaim;
            const relevantResults = response.results.length > 0
              ? await classifyRelevance(
                provisionalClaim,
                response.results,
                pipelineConfig,
                currentDate,
                searchGeo?.geography,
                searchGeo?.geography ? [searchGeo.geography] : undefined,
              )
              : [];
            if (response.results.length > 0) {
              local.llmCalls++;
            }

            const relevantByUrl = new Map(
              relevantResults.map((result) => [result.url, result.originalRank]),
            );

            // Fetch sources in parallel (was serial per-source)
            const sourcesToFetch = response.results
              .filter((searchResult) => relevantByUrl.has(searchResult.url))
              .sort((a, b) => (relevantByUrl.get(a.url) ?? 0) - (relevantByUrl.get(b.url) ?? 0))
              .slice(0, 3);
            const fetchErrorByType: Record<string, number> = {};
            const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
            let fetchFailed = 0;

            const fetchResults = await Promise.all(
              sourcesToFetch.map((searchResult) => fetchSourceOnce(searchResult)),
            );

            const fetchedSources: Array<{ url: string; title: string; text: string }> = [];
            for (const result of fetchResults) {
              if (!result.ok) {
                if (result.error) {
                  fetchFailed++;
                  fetchErrorByType[result.error.type] = (fetchErrorByType[result.error.type] ?? 0) + 1;
                  if (fetchErrorSamples.length < 5) {
                    fetchErrorSamples.push({
                      url: result.url,
                      type: result.error.type,
                      status: result.error.status,
                      message: result.error.message.slice(0, 240),
                    });
                  }
                }
                continue;
              }
              // Skip if already fetched by another query for this claim
              if (claimFetchedUrls.has(result.url)) continue;
              claimFetchedUrls.add(result.url);
              local.sources.push({
                id: "", // Placeholder — assigned during merge to avoid ID races
                url: result.url,
                title: result.title,
                trackRecordScore: null,
                fullText: result.text,
                fetchedAt: new Date().toISOString(),
                category: result.contentType || "text/html",
                fetchSuccess: true,
                searchQuery: query,
              });
              fetchedSources.push({
                url: result.url,
                title: result.title,
                text: result.text.slice(0, 8000),
              });
            }

            if (fetchFailed > 0 && sourcesToFetch.length > 0) {
              const failureRatio = fetchFailed / sourcesToFetch.length;
              local.warnings.push({
                type: "source_fetch_failure",
                severity: "info",
                message:
                  `Preliminary source fetch failed for ${fetchFailed}/${sourcesToFetch.length} source(s) on query "${query.slice(0, 120)}"`,
                details: {
                  stage: "preliminary_fetch",
                  query,
                  attempted: sourcesToFetch.length,
                  failed: fetchFailed,
                  failureRatio,
                  errorByType: fetchErrorByType,
                  errorSamples: fetchErrorSamples,
                  occurrences: fetchFailed,
                },
              });
            }

            if (fetchedSources.length === 0) return;

            state.onEvent?.(`LLM call: preliminary evidence — ${getModelForTask("extract_evidence", undefined, pipelineConfig).modelName}`, -1);
            const evidence = await extractPreliminaryEvidence(
              claim.statement,
              fetchedSources,
              pipelineConfig,
              currentDate,
            );
            local.llmCalls++;
            local.evidence.push(...evidence);
          } catch (err: any) {
            console.warn(`[Stage1] Preliminary search failed for query "${query}":`, err);
            if (err?.name === "SearchProviderError" && err?.provider) {
              local.providerErrors.push({
                provider: err.provider,
                message: String(err.message ?? "search provider error"),
                query,
              });
              state.onEvent?.(`Preliminary search error: ${err.provider} - ${err.message}`, 0);
            }
          }
        }),
      );

      return local;
    }),
  );

  // Merge local results into shared state deterministically (single-threaded, no races).
  const seenUrls = new Set(state.sources.map((s) => s.url));
  for (const local of claimResults) {
    state.searchQueries.push(...local.searchQueries);
    state.warnings.push(...local.warnings);
    state.llmCalls += local.llmCalls;
    allEvidence.push(...local.evidence);

    // Reconcile provider errors collected during parallel execution.
    // upsertSearchProviderWarning does find-or-update on state.warnings,
    // so it must run single-threaded in the merge phase, not from parallel workers.
    for (const pe of local.providerErrors) {
      upsertSearchProviderWarning(state, {
        provider: pe.provider,
        status: pe.status,
        message: pe.message,
        query: pe.query,
        stage: "preliminary_search",
      });
    }

    for (const src of local.sources) {
      if (!seenUrls.has(src.url)) {
        seenUrls.add(src.url);
        src.id = `S_${String(state.sources.length + 1).padStart(3, "0")}`;
        state.sources.push(src);
      }
    }
  }

  return allEvidence;
}

function normalizeWarningCounterMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      out[k] = v;
    }
  }
  return out;
}

export function upsertSearchProviderWarning(
  state: CBResearchState,
  params: {
    provider?: string;
    message: string;
    status?: number;
    query?: string;
    stage: "preliminary_search" | "research_search";
  },
): void {
  const provider = params.provider ?? "unknown";
  const statusKey = params.status !== undefined ? String(params.status) : "unknown";
  const existing = state.warnings.find(
    (w) => w.type === "search_provider_error" && w.details?.provider === provider,
  );

  if (!existing) {
    // Search provider failures are routine when fallbacks exist. The pipeline continues
    // with results from other providers. If ALL providers fail, zero results will trigger
    // insufficient_evidence or similar downstream warnings. Info-level for admin visibility.
    state.warnings.push({
      type: "search_provider_error",
      severity: "info",
      message: `Search provider "${provider}" failed: ${params.message}`,
      details: {
        provider,
        status: params.status,
        query: params.query,
        stage: params.stage,
        occurrences: 1,
        statusCounts: { [statusKey]: 1 },
        stageCounts: { [params.stage]: 1 },
      },
    });
    return;
  }

  const details =
    existing.details && typeof existing.details === "object"
      ? (existing.details as Record<string, unknown>)
      : {};
  const previousOccurrences =
    typeof details.occurrences === "number" && Number.isFinite(details.occurrences)
      ? details.occurrences
      : 1;

  details.occurrences = previousOccurrences + 1;
  details.status = params.status;
  details.query = params.query;
  details.stage = params.stage;
  details.lastMessage = params.message;

  const statusCounts = normalizeWarningCounterMap(details.statusCounts);
  statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;
  details.statusCounts = statusCounts;

  const stageCounts = normalizeWarningCounterMap(details.stageCounts);
  stageCounts[params.stage] = (stageCounts[params.stage] ?? 0) + 1;
  details.stageCounts = stageCounts;

  existing.details = details;
  existing.message = `Search provider "${provider}" failed ${details.occurrences} time(s); latest: ${params.message}`;
}

/**
 * Generate search queries from a rough claim and its searchHint.
 */
export function generateSearchQueries(
  claim: { statement: string; searchHint: string },
  queriesPerClaim: number,
): string[] {
  const queries: string[] = [];

  // Primary query: use the searchHint (3-5 words, optimized for search)
  if (claim.searchHint) {
    queries.push(claim.searchHint);
  }

  // Secondary query: use the claim statement directly (truncated for search)
  if (queries.length < queriesPerClaim) {
    const truncated = claim.statement.length > 80
      ? claim.statement.slice(0, 80)
      : claim.statement;
    queries.push(truncated);
  }

  return queries.slice(0, queriesPerClaim);
}

/**
 * Extract preliminary evidence from fetched sources using batched LLM call (Haiku).
 * Batches all sources into a single prompt for efficiency.
 */
async function extractPreliminaryEvidence(
  claimStatement: string,
  sources: Array<{ url: string; title: string; text: string }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<PreliminaryEvidenceItem[]> {
  const rendered = await loadAndRenderSection("claimboundary", "EXTRACT_EVIDENCE", {
    currentDate,
    claim: claimStatement,
    sourceContent: sources.map((s, i) =>
      `[Source ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.text}`
    ).join("\n\n---\n\n"),
    sourceUrl: sources.map((s) => s.url).join(", "),
  });
  if (!rendered) {
    return []; // No prompt available — skip extraction
  }

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        { role: "user", content: `Extract evidence from these ${sources.length} sources relating to: "${claimStatement}"` },
      ],
      temperature: pipelineConfig?.extractEvidenceTemperature ?? 0.1,
      output: Output.object({ schema: ExtractEvidenceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        (pipelineConfig.llmProvider) ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "research",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 1 preliminary evidence extraction returned no structured output",
        timestamp: new Date(),
      });
      return [];
    }

    const validated = ExtractEvidenceOutputSchema.parse(parsed);
    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    // Map to PreliminaryEvidenceItem, assigning source URLs.
    // Use LLM-attributed sourceUrl when available; fall back to first source.
    return validated.evidenceItems.map((ei) => {
      const matchedSource = sources.find((s) => s.url === ei.sourceUrl) ?? sources[0];
      return {
        statement: ei.statement,
        sourceUrl: matchedSource?.url ?? "",
        sourceTitle: matchedSource?.title ?? "",
        evidenceScope: ei.evidenceScope ? {
          methodology: ei.evidenceScope.methodology,
          temporal: ei.evidenceScope.temporal,
          geographic: ei.evidenceScope.geographic,
          boundaries: ei.evidenceScope.boundaries,
        } : undefined,
        probativeValue: ei.probativeValue,
        claimDirection: ei.claimDirection,
        sourceType: ei.sourceType,
        relevantClaimIds: ei.relevantClaimIds,
      };
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    console.warn("[Stage1] Preliminary evidence extraction failed:", err);
    return [];
  }
}

/**
 * Normalize Pass 2 LLM output before Zod validation.
 * Handles case-insensitive enum matching and type coercion for known failure modes.
 * This runs AFTER the AI SDK's internal validation (which uses .catch() defaults)
 * but BEFORE our explicit .parse() call, catching any remaining issues.
 */
function normalizePass2Output(raw: Record<string, unknown>): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return raw;

  // Normalize enum string values in atomicClaims
  if (Array.isArray(raw.atomicClaims)) {
    raw.atomicClaims = raw.atomicClaims.map((claim: Record<string, unknown>) => {
      if (!claim || typeof claim !== "object") return claim;

      const normalized = { ...claim };

      // Lowercase all known enum fields
      const enumFields = [
        "category", "centrality", "harmPotential", "claimDirection",
        "thesisRelevance", "checkWorthiness", "groundingQuality",
        "freshnessRequirement",
      ];
      for (const field of enumFields) {
        if (typeof normalized[field] === "string") {
          normalized[field] = (normalized[field] as string).toLowerCase();
        }
      }

      // Fix common claimDirection variants (e.g., "supports" → "supports_thesis")
      if (typeof normalized.claimDirection === "string") {
        const dir = normalized.claimDirection as string;
        if (dir === "supports") {
          normalized.claimDirection = "supports_thesis";
        } else if (dir === "contradicts") {
          normalized.claimDirection = "contradicts_thesis";
        } else if (dir === "neutral" || dir === "unrelated") {
          normalized.claimDirection = "contextual";
        }
      }

      // Coerce specificityScore from string to number
      if (typeof normalized.specificityScore === "string") {
        const num = parseFloat(normalized.specificityScore as string);
        normalized.specificityScore = isNaN(num) ? 0.5 : num;
      }

      // Ensure keyEntities is an array (might be null)
      if (!Array.isArray(normalized.keyEntities)) {
        normalized.keyEntities = [];
      }

      if (!Array.isArray(normalized.relevantGeographies)) {
        normalized.relevantGeographies = [];
      } else {
        normalized.relevantGeographies = (normalized.relevantGeographies as unknown[])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().toUpperCase())
          .filter((value) => /^[A-Z]{2}$/.test(value));
      }

      // Ensure expectedEvidenceProfile has required arrays
      if (normalized.expectedEvidenceProfile && typeof normalized.expectedEvidenceProfile === "object") {
        const profile = normalized.expectedEvidenceProfile as Record<string, unknown>;
        if (!Array.isArray(profile.methodologies)) profile.methodologies = [];
        if (!Array.isArray(profile.expectedMetrics)) profile.expectedMetrics = [];
        if (typeof profile.primaryMetric !== "string" || profile.primaryMetric.trim().length === 0) {
          delete profile.primaryMetric;
        } else {
          profile.primaryMetric = profile.primaryMetric.trim();
        }
        if (!Array.isArray(profile.componentMetrics)) {
          profile.componentMetrics = [];
        } else {
          profile.componentMetrics = (profile.componentMetrics as unknown[])
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
        }
        if (!Array.isArray(profile.expectedSourceTypes)) {
          profile.expectedSourceTypes = [];
        } else {
          profile.expectedSourceTypes = (profile.expectedSourceTypes as unknown[])
            .map((value) => normalizeExtractedSourceType(typeof value === "string" ? value : undefined))
            .filter((value): value is SourceType => typeof value === "string");
        }
      }

      return normalized;
    });
  }

  return raw;
}

/**
 * C11b (Phase 5): anchor-gated targeted repair pass.
 *
 * Narrow single-instruction LLM call: given a claim set whose retry output
 * already drifted, insert the verbatim anchor modifier into the thesis-direct
 * claim. The prompt is scoped to one job — no decomposition, no enumeration,
 * no evidence integration — because competing priors are what make broadcast
 * retry noisy. Returns the updated Pass2 output on success, undefined otherwise.
 *
 * Uses `context_refinement` tier (same as the contract-failure retry) so the
 * repair runs on the standard tier (Sonnet today) without a new task key.
 */
async function runContractRepair(
  claims: AtomicClaim[],
  anchorText: string,
  inputText: string,
  impliedClaim: string,
  articleThesis: string,
  pipelineConfig: PipelineConfig,
  state: Pick<CBResearchState, "onEvent"> | undefined,
): Promise<z.infer<typeof ContractRepairOutputSchema> | undefined> {
  const model = getModelForTask("context_refinement", undefined, pipelineConfig);
  state?.onEvent?.(`LLM call: contract repair — ${model.modelName}`, -1);

  const llmCallStartedAt = Date.now();
  try {
    const rendered = await loadAndRenderSection("claimboundary", "CLAIM_CONTRACT_REPAIR", {
      analysisInput: inputText,
      anchorText,
      impliedClaim,
      articleThesis,
      atomicClaimsJson: JSON.stringify(claims, null, 2),
    });

    if (!rendered) {
      console.warn("[Stage1] CLAIM_CONTRACT_REPAIR prompt section not found; skipping.");
      return undefined;
    }

    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user" as const,
          content: `Repair the claim set to include the anchor "${anchorText}".`,
        },
      ],
      temperature: 0,
      output: Output.object({ schema: ContractRepairOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return undefined;

    const repaired = ContractRepairOutputSchema.parse(parsed);

    // Structural post-check: anchor must actually be present as substring in
    // at least one claim now. If the LLM ignored the instruction, bail out so
    // we keep the pre-repair state rather than shipping a silent-failure retry.
    // C17 [BLOCKER FIX]: use case-insensitive check to avoid morphology-based false positives.
    const anchorLanded = claimSetContainsAnchorText(repaired.atomicClaims, anchorText);
    if (!anchorLanded) {
      console.warn(`[Stage1] Contract repair output still missing anchor "${anchorText}" (case-insensitive check); discarding.`);
      return undefined;
    }

    recordLLMCall({
      taskType: "other",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return repaired;
  } catch (error) {
    console.warn("[Stage1] Contract repair LLM call failed (non-fatal):", error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

/**
 * Pass 2: Evidence-grounded claim extraction using Sonnet.
 * Uses preliminary evidence to produce specific, research-ready atomic claims.
 * In binding mode, appends a precommitted salience-anchor appendix while
 * leaving audit mode on the unchanged baseline prompt.
 */
export async function runPass2(
  inputText: string,
  preliminaryEvidence: PreliminaryEvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
  state?: Pick<CBResearchState, "warnings" | "onEvent">,
  repromptGuidance?: string,
  inferredGeography?: string | null,
  detectedLanguage?: string,
  modelTaskOverride?: ModelTask,
  salienceBinding?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): Promise<z.infer<typeof Pass2OutputSchema>> {
  const buildPreliminaryEvidencePayload = (items: PreliminaryEvidenceItem[]): string =>
    JSON.stringify(
      items.map((pe) => ({
        // Truncate evidence to topic-level signals only (reduce contamination risk).
        // Full statements give the LLM too much factual detail to import into claims.
        topicSignal: pe.statement.length > 120
          ? pe.statement.slice(0, 120) + "…"
          : pe.statement,
        sourceTitle: pe.sourceTitle,
        evidenceScope: pe.evidenceScope,
      })),
      null,
      2,
    );

  const bindingModeActive = salienceBinding?.mode === "binding";
  const salienceBindingContextJson = buildSalienceBindingContextJson(salienceBinding);

  const renderedWithEvidence = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2", {
    currentDate,
    analysisInput: inputText,
    preliminaryEvidence: buildPreliminaryEvidencePayload(preliminaryEvidence),
    atomicityGuidance: getAtomicityGuidance(pipelineConfig.claimAtomicityLevel ?? 3),
    inferredGeography: inferredGeography ?? "not geographically specific",
  });
  if (!renderedWithEvidence) {
    throw new Error("Stage 1 Pass 2: Failed to load CLAIM_EXTRACTION_PASS2 prompt section");
  }

  // Soft-refusal mitigation: keep a pre-rendered input-only prompt variant for retries.
  // If the model refuses with evidence context, retrying with no preliminary evidence
  // often avoids policy over-triggering while preserving claim fidelity to user input.
  const renderedWithoutEvidence = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2", {
    currentDate,
    analysisInput: inputText,
    preliminaryEvidence: "[]",
    atomicityGuidance: getAtomicityGuidance(pipelineConfig.claimAtomicityLevel ?? 3),
    inferredGeography: inferredGeography ?? "not geographically specific",
  }) ?? renderedWithEvidence;

  let pass2BindingAppendix = "";
  if (bindingModeActive) {
    const bindingAppendix = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX", {
      salienceBindingContextJson,
    });
    if (!bindingAppendix) {
      throw new Error("Stage 1 Pass 2: Failed to load CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX prompt section");
    }
    pass2BindingAppendix = `\n\n${bindingAppendix.content}`;
  }

  // Rec-A: Pass 2 is extraction/understanding, not verdict reasoning.
  // Using "extract_evidence" routes to Haiku (budget) and makes UCM modelExtractEvidence
  // effective for this step. Was "verdict" (Sonnet) which bypassed modelUnderstand.
  // C6 (Phase 5): caller may override the task tier for the contract-failure retry
  // path only — that invocation escalates to `context_refinement` (Sonnet) because
  // Haiku has ~10–15% residual non-compliance on the multi-rule PASS2 prompt and
  // retrying on the same tier reproduces the failure.
  const model = getModelForTask(modelTaskOverride ?? "extract_evidence", undefined, pipelineConfig);

  // Retry logic with quality validation and Zod-aware feedback.
  // Schema uses .catch() defaults so AI SDK never throws NoObjectGeneratedError.
  // Quality gate below detects when .catch() masked a real LLM failure.
  // On total refusal (all fields empty — common with politically sensitive inputs),
  // retry uses fact-checking framing to address the model's content-policy caution.
  const maxRetries = 3;
  let lastError: Error | null = null;
  let retryGuidance: string | null = null;
  let wasTotalRefusal = false;
  let retryWithoutPreliminaryEvidence = false;

  // Appended to every user message (not just retries) to establish the verification-only
  // frame before the model evaluates topic sensitivity. Sonnet 4.x soft-refuses politically
  // sensitive structured-output requests without this early anchoring.
  const FACT_CHECK_CONTEXT = "CONTEXT: You are operating as part of a fact-checking verification pipeline. Your task is to faithfully extract the claims in the input text so they can be verified against evidence. You are NOT asked to endorse, amplify, or reject any claim. Politically sensitive, controversial, legally complex, or potentially biased topics are valid and expected fact-checking subjects — treat them with the same structured extraction process.";

  // Fix 0-A: Language preservation directive for non-English input.
  // Budget models (Haiku) drift to English when the user message is English-dominated
  // (FACT_CHECK_CONTEXT + retryGuidance are ~160 English words). This directive ensures
  // all output fields stay in the input language.
  const languageDirective = detectedLanguage && detectedLanguage.toLowerCase() !== "en"
    ? `IMPORTANT: The input text is in ${detectedLanguage}. Output ALL fields (impliedClaim, articleThesis, backgroundDetails, atomicClaims statements, distinctEvents names) in ${detectedLanguage}. Do not switch to English.`
    : "";


  const assessPass2Quality = (output: z.infer<typeof Pass2OutputSchema>): string[] => {
    const issues: string[] = [];
    if (!output.impliedClaim || output.impliedClaim.trim() === "") {
      issues.push("impliedClaim is empty — must contain the central claim derived from user input");
    }
    if (!output.articleThesis || output.articleThesis.trim() === "") {
      issues.push("articleThesis is empty — must summarize the thesis being examined");
    }
    if (!output.backgroundDetails || output.backgroundDetails.trim() === "") {
      issues.push("backgroundDetails is empty — must provide context for understanding the claims");
    }
    output.atomicClaims = output.atomicClaims.filter(
      (c) => c.statement && c.statement.trim() !== "",
    );
    if (output.atomicClaims.length === 0) {
      issues.push("atomicClaims has no claims with substantive statements — must extract at least one verifiable claim");
    }
    return issues;
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStartedAt = Date.now();
    let attemptResult: any;
    try {
      // Always anchor with fact-checking context; on retry also append schema/quality guidance.
      // Structured as [user input] + [context] + [retry guidance if any] to keep the
      // user's text visually first while ensuring framing precedes the model's compliance decision.
      // Build user message: input text + fact-check framing + optional reprompt/retry guidance
      const guidanceParts: string[] = [inputText, "---", FACT_CHECK_CONTEXT];
      if (repromptGuidance && attempt === 0) {
        guidanceParts.push(repromptGuidance);
      }
      if (attempt > 0 && retryGuidance) {
        guidanceParts.push(retryGuidance);
      }
      if (languageDirective) {
        guidanceParts.push(languageDirective);
      }
      const userContent = guidanceParts.join("\n\n");
      const activeSystemPrompt = retryWithoutPreliminaryEvidence
        ? renderedWithoutEvidence.content + pass2BindingAppendix
        : renderedWithEvidence.content + pass2BindingAppendix;

      attemptResult = await generateText({
        model: model.model,
        messages: [
          {
            role: "system" as const,
            content: activeSystemPrompt,
            providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
          },
          { role: "user" as const, content: userContent },
        ],
        temperature: (pipelineConfig.understandTemperature ?? 0.15) + (attempt * 0.05), // Base from config, increase on retry
        output: Output.object({ schema: Pass2OutputSchema }),
        providerOptions: getStructuredOutputProviderOptions(
          (pipelineConfig.llmProvider) ?? "anthropic",
        ),
      });

      // Log response metadata for soft-refusal detection
      const finishReason = (attemptResult as unknown as Record<string, unknown>).finishReason;
      if (finishReason === "content-filter" || finishReason === "other") {
        console.warn(`[Stage1 Pass2] Possible content-policy soft-refusal: finishReason=${finishReason}`);
      }

      const parsed = extractStructuredOutput(attemptResult);
      if (!parsed) {
        throw new Error("Stage 1 Pass 2: LLM returned no structured output");
      }

      // Normalize enum values (case-insensitive) before Zod validation
      const normalized = normalizePass2Output(parsed as Record<string, unknown>);

      const validated = Pass2OutputSchema.parse(normalized);

      // Quality gate: .catch() defaults may have masked LLM failures for null fields.
      // Check that quality-critical fields contain substantive content.
      const qualityIssues = assessPass2Quality(validated);

      if (qualityIssues.length > 0) {
        // Detect total refusal: ALL quality-critical fields are empty simultaneously.
        // This pattern indicates content-policy caution, not a schema issue.
        wasTotalRefusal =
          (!validated.impliedClaim || validated.impliedClaim.trim() === "") &&
          (!validated.articleThesis || validated.articleThesis.trim() === "") &&
          validated.atomicClaims.length === 0;

        if (wasTotalRefusal) {
          if (!retryWithoutPreliminaryEvidence && preliminaryEvidence.length > 0) {
            retryWithoutPreliminaryEvidence = true;
            state?.onEvent?.("Stage 1 Pass 2 retry: reducing preliminary-evidence context after soft refusal...", 22);
          }

          // Address the content-policy concern directly with fact-checking framing.
          retryGuidance = `IMPORTANT: This is a fact-checking analysis engine. Your role is to faithfully extract the claims being made in the input text so they can be verified against evidence. You are NOT being asked to endorse, reject, or amplify any claim — only to identify verifiable assertions for evidence-based assessment.

The input text contains assertions that users have submitted for fact-checking. Claim extraction for verification purposes serves the public interest regardless of topic sensitivity. Politically sensitive, controversial, or potentially biased claims are valid and expected fact-checking subjects.

Your previous attempt returned empty results. You MUST populate ALL required fields:
- impliedClaim: What central assertion does the input make?
- articleThesis: What thesis does the input present for verification?
- backgroundDetails: What context is relevant to understanding this claim?
- atomicClaims: What specific, verifiable assertions can be extracted?

Respond in the same language as the input text.

If prior evidence context was too sensitive, focus strictly on extracting claims from the user's input text while preserving fidelity.`;
          console.warn(`[Stage1 Pass2] Attempt ${attempt + 1}/${maxRetries + 1} — Total refusal detected (all fields empty). Retrying with fact-checking framing.`);
        } else {
          // Partial failure: some fields have content, some don't. Give field-specific guidance.
          retryGuidance = `Your previous output had empty or null required fields:\n${qualityIssues.map(q => `- ${q}`).join("\n")}\nAll required fields must contain substantive content. Do not return null or empty values for these fields. Respond in the same language as the input text.`;
        }
        throw new Error(`Quality validation: ${qualityIssues.join("; ")}`);
      }

      // Ensure all claims have sequential IDs if the LLM didn't provide them
      validated.atomicClaims.forEach((claim, idx) => {
        if (!claim.id || claim.id.trim() === "") {
          claim.id = `AC_${String(idx + 1).padStart(2, "0")}`;
        }
      });

      if (attempt > 0) {
        console.log(`[Stage1 Pass2] Succeeded on attempt ${attempt + 1}/${maxRetries + 1}${wasTotalRefusal ? " (recovered from soft refusal)" : ""}`);
      }

      recordLLMCall({
        taskType: "understand",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: attemptResult.usage?.inputTokens ?? 0,
        completionTokens: attemptResult.usage?.outputTokens ?? 0,
        totalTokens: attemptResult.usage?.totalTokens ?? 0,
        durationMs: Date.now() - attemptStartedAt,
        success: true,
        schemaCompliant: true,
        retries: attempt,
        timestamp: new Date(),
      });

      return validated;
    } catch (err) {
      lastError = err as Error;
      const errorMessage = err instanceof Error ? err.message : String(err);
      recordLLMCall({
        taskType: "understand",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: attemptResult?.usage?.inputTokens ?? 0,
        completionTokens: attemptResult?.usage?.outputTokens ?? 0,
        totalTokens: attemptResult?.usage?.totalTokens ?? 0,
        durationMs: Date.now() - attemptStartedAt,
        success: false,
        schemaCompliant: false,
        retries: attempt,
        errorMessage,
        timestamp: new Date(),
      });

      // Log detailed Zod validation errors for diagnostics
      if (err instanceof z.ZodError) {
        const fieldErrors = err.issues.map(i => `  ${i.path.join(".")}: ${i.message} (code: ${i.code})`);
        console.error(`[Stage1 Pass2] Attempt ${attempt + 1}/${maxRetries + 1} — Zod validation failed:\n${fieldErrors.join("\n")}`);
        retryGuidance = `Your output had schema validation errors:\n${fieldErrors.join("\n")}\nPlease ensure all required fields are present with correct types. Do not use null for string or array fields.`;
      } else if (!retryGuidance) {
        // Build generic guidance if not already set by quality gate
        const msg = (err as Error).message || "";
        if (msg.includes("No object generated") || msg.includes("did not match schema")) {
          retryGuidance = "Your previous response did not produce valid structured output. Ensure ALL required fields are present with correct types (strings, arrays, enums). Do not use null values.";
        }
      }

      console.warn(`[Stage1 Pass2] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${(err as Error).message}`);

      // If this is the last attempt with the primary model and it's a total refusal,
      // try one more time with the "understand" tier (Haiku) — proven to handle
      // politically sensitive content that Sonnet soft-refuses on.
      if (attempt === maxRetries && wasTotalRefusal) {
        const fallbackModel = getModelForTask("understand", undefined, pipelineConfig);
        if (fallbackModel.modelName !== model.modelName) {
          console.warn(`[Stage1 Pass2] Total refusal after ${maxRetries + 1} attempts with ${model.modelName}. Attempting fallback with ${fallbackModel.modelName}.`);
          try {
            const fallbackUserContent = retryGuidance
              ? `${inputText}\n\n---\n${FACT_CHECK_CONTEXT}\n\n${retryGuidance}${languageDirective ? `\n\n${languageDirective}` : ""}`
              : `${inputText}\n\n---\n${FACT_CHECK_CONTEXT}${languageDirective ? `\n\n${languageDirective}` : ""}`;
            const fallbackResult = await generateText({
              model: fallbackModel.model,
              messages: [
                {
                  role: "system" as const,
                  content: retryWithoutPreliminaryEvidence
                    ? renderedWithoutEvidence.content + pass2BindingAppendix
                    : renderedWithEvidence.content + pass2BindingAppendix,
                  providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
                },
                { role: "user" as const, content: fallbackUserContent },
              ],
              temperature: (pipelineConfig.understandTemperature ?? 0.15) + 0.2, // Base from config + fallback boost
              output: Output.object({ schema: Pass2OutputSchema }),
              providerOptions: getStructuredOutputProviderOptions(
                (pipelineConfig.llmProvider) ?? "anthropic",
              ),
            });

            const fallbackParsed = extractStructuredOutput(fallbackResult);
            if (fallbackParsed) {
              const fallbackNormalized = normalizePass2Output(fallbackParsed as Record<string, unknown>);
              const fallbackValidated = Pass2OutputSchema.parse(fallbackNormalized);

              // Apply the same quality gate to fallback results; do not silently accept weak output.
              const fallbackQualityIssues = assessPass2Quality(fallbackValidated);
              if (fallbackQualityIssues.length === 0) {
                // Fix IDs
                fallbackValidated.atomicClaims.forEach((claim, idx) => {
                  if (!claim.id || claim.id.trim() === "") {
                    claim.id = `AC_${String(idx + 1).padStart(2, "0")}`;
                  }
                });
                console.log(`[Stage1 Pass2] Fallback model ${fallbackModel.modelName} succeeded (recovered from soft refusal).`);
                if (state) {
                  state.warnings.push({
                    type: "structured_output_failure",
                    severity: "info",
                    message: `Stage 1 Pass 2 recovered via fallback model (${fallbackModel.modelName}) after primary model soft refusal.`,
                    details: {
                      stage: "stage1_pass2",
                      reason: "content_policy_soft_refusal",
                      provider: model.provider,
                      configuredProvider: model.provider,
                      fallbackProvider: fallbackModel.provider,
                      primaryModel: model.modelName,
                      fallbackModel: fallbackModel.modelName,
                      degradedPath: true,
                    },
                  });
                  state.onEvent?.(`Stage 1 Pass 2 recovered via fallback model (${fallbackModel.modelName}); review claim quality warnings.`, 23);
                }
                return fallbackValidated;
              }
              console.warn(`[Stage1 Pass2] Fallback model returned low-quality output: ${fallbackQualityIssues.join("; ")}`);
            }
            console.warn(`[Stage1 Pass2] Fallback model also returned empty output.`);
          } catch (fallbackErr) {
            console.warn(`[Stage1 Pass2] Fallback model failed: ${(fallbackErr as Error).message}`);
          }
        }

        const errorMsg = `Stage 1 Pass 2 failed after ${maxRetries + 1} attempts (content-policy soft refusal). Last error: ${lastError.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Non-total-refusal: throw on last attempt
      if (attempt === maxRetries) {
        const errorMsg = `Stage 1 Pass 2 failed after ${maxRetries + 1} attempts. Last error: ${lastError.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Wait before retry (exponential backoff: 1s, 2s)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError || new Error("Stage 1 Pass 2: Unexpected error");
}

/**
 * Filter claims by centrality and cap at max count.
 * Exported for unit testing.
 *
 * @param claims - Raw atomic claims from Pass 2
 * @param threshold - Minimum centrality ("high" or "medium")
 * @param maxClaims - Maximum number of claims to keep
 * @returns Filtered atomic claims
 */
function getCentralityPriority(centrality?: string): number {
  switch (centrality) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
}

export function filterByCentrality(
  claims: AtomicClaim[],
  threshold: "high" | "medium",
  maxClaims: number,
  requiredClaimIds: string[] = [],
): AtomicClaim[] {
  // Filter by centrality threshold
  const allowed = threshold === "high" ? new Set(["high"]) : new Set(["high", "medium"]);
  const requiredClaimIdSet = new Set(requiredClaimIds);
  const compareEntries = (
    left: { claim: AtomicClaim; index: number },
    right: { claim: AtomicClaim; index: number },
  ): number => {
    const priorityDiff = getCentralityPriority(left.claim.centrality) - getCentralityPriority(right.claim.centrality);
    if (priorityDiff !== 0) return priorityDiff;

    const requiredDiff = Number(requiredClaimIdSet.has(right.claim.id)) - Number(requiredClaimIdSet.has(left.claim.id));
    if (requiredDiff !== 0) return requiredDiff;

    return left.index - right.index;
  };
  const filtered = claims
    .map((claim, index) => ({ claim, index }))
    .filter(({ claim }) => allowed.has(claim.centrality) || requiredClaimIdSet.has(claim.id));

  // Sort: high centrality first, then medium
  filtered.sort(compareEntries);

  const selected = filtered.slice(0, maxClaims);

  if (requiredClaimIdSet.size > 0) {
    for (const requiredClaimId of requiredClaimIds) {
      if (selected.some((entry) => entry.claim.id === requiredClaimId)) {
        continue;
      }

      const requiredEntry = filtered.find((entry) => entry.claim.id === requiredClaimId);
      if (!requiredEntry) {
        continue;
      }

      if (selected.length < maxClaims) {
        selected.push(requiredEntry);
        continue;
      }

      let replacementIndex = -1;
      for (let index = selected.length - 1; index >= 0; index--) {
        if (!requiredClaimIdSet.has(selected[index].claim.id)) {
          replacementIndex = index;
          break;
        }
      }

      if (replacementIndex === -1) {
        continue;
      }

      selected[replacementIndex] = requiredEntry;
    }
  }

  const seenClaimIds = new Set<string>();
  return selected
    .sort(compareEntries)
    .filter((entry) => {
      if (seenClaimIds.has(entry.claim.id)) {
        return false;
      }
      seenClaimIds.add(entry.claim.id);
      return true;
    })
    .map((entry) => entry.claim);
}

export function selectClaimsForGate1(
  claims: AtomicClaim[],
  threshold: "high" | "medium",
  maxClaims: number,
  contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"],
  inputClassification?: string,
  structuralInputType?: "claim" | "article",
  sourceInputType?: "text" | "url",
  requiredClaimIds: string[] = [],
): AtomicClaim[] {
  const isArticleLikeMultiAssertion =
    structuralInputType === "article" && inputClassification === "multi_assertion_input";
  const isUrlSourcedArticleLike =
    sourceInputType === "url" && structuralInputType === "article";

  if (
    (inputClassification === "article" || isArticleLikeMultiAssertion || isUrlSourcedArticleLike)
    &&
    contractValidationSummary?.preservesContract === true
    && contractValidationSummary.rePromptRequired === false
  ) {
    return claims;
  }

  return filterByCentrality(claims, threshold, maxClaims, requiredClaimIds);
}

// ============================================================================
// CLAIM CONTRACT VALIDATION — LLM-based check for proxy drift / meaning shift
// ============================================================================

const ClaimContractTruthConditionAnchorSchema = z.object({
  presentInInput: z.boolean(),
  anchorText: z.string().catch(""),
  preservedInClaimIds: z.array(z.string()).catch([]),
  preservedByQuotes: z.array(z.string()).catch([]),
});

const ClaimContractLegacyAntiInferenceSchema = z.object({
  normativeInferenceDetected: z.boolean(),
  inferredClaimIds: z.array(z.string()).catch([]),
  reasoning: z.string().catch(""),
});

const ClaimContractAntiInferenceSchema = z.object({
  normativeClaimInjected: z.boolean(),
  injectedClaimIds: z.array(z.string()).catch([]),
  reasoning: z.string().catch(""),
});

const ClaimContractInputAssessmentSchema = z.object({
  preservesOriginalClaimContract: z.boolean(),
  rePromptRequired: z.boolean(),
  summary: z.string().catch(""),
  truthConditionAnchor: ClaimContractTruthConditionAnchorSchema.optional(),
  antiInferenceCheck: ClaimContractLegacyAntiInferenceSchema.optional(),
});

const ClaimContractClaimSchema = z.object({
  claimId: z.string(),
  preservesEvaluativeMeaning: z.boolean(),
  usesNeutralDimensionQualifier: z.boolean(),
  proxyDriftSeverity: z.enum(["none", "mild", "material"]).catch("none"),
  recommendedAction: z.enum(["keep", "retry"]).catch("keep"),
  reasoning: z.string().catch(""),
});

export const ClaimContractOutputSchema = z.object({
  inputAssessment: ClaimContractInputAssessmentSchema,
  claims: z.array(ClaimContractClaimSchema),
  // Structured anchor preservation check (added for proposition anchoring hardening).
  // The validator prompt identifies truth-condition-bearing modifiers and reports
  // whether they are preserved in the extracted claims with traceable citations.
  truthConditionAnchor: ClaimContractTruthConditionAnchorSchema.optional(),
  antiInferenceCheck: ClaimContractAntiInferenceSchema.optional(),
});

type ClaimContractRawOutput = z.infer<typeof ClaimContractOutputSchema>;

const SingleClaimAtomicityAssessmentSchema = z.object({
  isAtomic: z.boolean(),
  rePromptRequired: z.boolean(),
  summary: z.string().catch(""),
});

const SingleClaimCoordinatedBranchFindingSchema = z.object({
  presentInInput: z.boolean(),
  bundledInSingleClaim: z.boolean(),
  branchLabels: z.array(z.string()).catch([]),
  reasoning: z.string().catch(""),
});

const SingleClaimAtomicityOutputSchema = z.object({
  singleClaimAssessment: SingleClaimAtomicityAssessmentSchema,
  coordinatedBranchFinding: SingleClaimCoordinatedBranchFindingSchema,
});

export interface ClaimContractValidationResult {
  inputAssessment: z.infer<typeof ClaimContractInputAssessmentSchema>;
  claims: Array<z.infer<typeof ClaimContractClaimSchema>>;
  truthConditionAnchor?: z.infer<typeof ClaimContractTruthConditionAnchorSchema>;
  antiInferenceCheck?: z.infer<typeof ClaimContractAntiInferenceSchema>;
}

export interface ClaimContractValidationRetryResult {
  result: ClaimContractValidationResult | undefined;
  attempts: number;
}

export interface SingleClaimAtomicityValidationResult {
  singleClaimAssessment: z.infer<typeof SingleClaimAtomicityAssessmentSchema>;
  coordinatedBranchFinding: z.infer<typeof SingleClaimCoordinatedBranchFindingSchema>;
}

export async function runClaimContractValidationWithRetry(
  runValidation: () => Promise<ClaimContractValidationResult | undefined>,
  maxAttempts = 2,
): Promise<ClaimContractValidationRetryResult> {
  let attempts = 0;
  let result: ClaimContractValidationResult | undefined;

  while (attempts < maxAttempts) {
    attempts += 1;
    result = await runValidation();
    if (result) {
      return { result, attempts };
    }
  }

  return { result: undefined, attempts };
}

type Gate1ValidationResult = {
  stats: CBClaimUnderstanding["gate1Stats"];
  filteredClaims: AtomicClaim[];
  preFilterClaims?: AtomicClaim[];
  gate1Reasoning?: Array<{
    claimId: string;
    passedOpinion: boolean;
    passedSpecificity: boolean;
    passedFidelity: boolean;
    reasoning: string;
  }>;
  rescuedThesisDirect?: string[];
};

type ContractValidationSummary = NonNullable<CBClaimUnderstanding["contractValidationSummary"]>;

export interface EvaluatedClaimContractValidation {
  summary: ContractValidationSummary;
  effectiveRePromptRequired: boolean;
  anchorRetryReason?: string;
  atomicityRetryReason?: string;
}

function pruneGate1FidelityDriftFromContractApprovedSet(
  gate1Result: Gate1ValidationResult,
  contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"],
): Gate1ValidationResult {
  if (!contractValidationSummary?.preservesContract || contractValidationSummary.rePromptRequired) {
    return gate1Result;
  }

  const anchorCarrierIds = contractValidationSummary.truthConditionAnchor?.validPreservedIds ?? [];
  if (anchorCarrierIds.length === 0) {
    return gate1Result;
  }

  const updateGate1Result = (nextFilteredClaims: AtomicClaim[]): Gate1ValidationResult => ({
    ...gate1Result,
    filteredClaims: nextFilteredClaims,
    stats: {
      ...gate1Result.stats,
      filteredCount: gate1Result.stats.totalClaims - nextFilteredClaims.length,
      overallPass: nextFilteredClaims.length > 0,
    },
  });

  let filteredClaims = gate1Result.filteredClaims;

  if (shouldProtectValidatedAnchorCarriers(contractValidationSummary)) {
    const preFilterClaims = gate1Result.preFilterClaims ?? gate1Result.filteredClaims;
    const filteredClaimIdSet = new Set(filteredClaims.map((claim) => claim.id));
    const missingAnchorCarrierIds = anchorCarrierIds.filter((claimId) => !filteredClaimIdSet.has(claimId));

    if (missingAnchorCarrierIds.length > 0 && preFilterClaims.length > 0) {
      const claimById = new Map(preFilterClaims.map((claim) => [claim.id, claim] as const));
      const preFilterOrder = new Map(preFilterClaims.map((claim, index) => [claim.id, index] as const));
      const restoredClaims = missingAnchorCarrierIds
        .map((claimId) => claimById.get(claimId))
        .filter((claim): claim is AtomicClaim => Boolean(claim));

      if (restoredClaims.length > 0) {
        filteredClaims = [...filteredClaims, ...restoredClaims]
          .filter((claim, index, items) => items.findIndex((candidate) => candidate.id === claim.id) === index)
          .sort((left, right) =>
            (preFilterOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER)
            - (preFilterOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
          );

        console.info(
          `[Stage1] Gate 1: restored ${restoredClaims.length} contract-approved anchor carrier claim(s) ` +
          `after structural filtering. restored=[${restoredClaims.map((claim) => claim.id).join(",")}].`,
        );
      }
    }
  }

  if (!gate1Result.gate1Reasoning?.length) {
    return filteredClaims === gate1Result.filteredClaims ? gate1Result : updateGate1Result(filteredClaims);
  }

  const failedFidelityIds = new Set(
    gate1Result.gate1Reasoning
      .filter((claim) => !claim.passedFidelity)
      .map((claim) => claim.claimId),
  );
  if (failedFidelityIds.size === 0) {
    return filteredClaims === gate1Result.filteredClaims ? gate1Result : updateGate1Result(filteredClaims);
  }

  const anchorCarrierIdSet = new Set(anchorCarrierIds);
  const prunedClaimIds = filteredClaims
    .filter((claim) => failedFidelityIds.has(claim.id) && !anchorCarrierIdSet.has(claim.id))
    .map((claim) => claim.id);
  if (prunedClaimIds.length === 0) {
    return filteredClaims === gate1Result.filteredClaims ? gate1Result : updateGate1Result(filteredClaims);
  }

  const prunedClaimIdSet = new Set(prunedClaimIds);
  filteredClaims = filteredClaims.filter((claim) => !prunedClaimIdSet.has(claim.id));
  if (filteredClaims.length === 0) {
    return gate1Result;
  }

  console.info(
    `[Stage1] Gate 1: pruned ${prunedClaimIds.length} fidelity-failed non-anchor claim(s) ` +
    `from contract-approved set. Anchor carriers kept=[${anchorCarrierIds.join(",")}], ` +
    `pruned=[${prunedClaimIds.join(",")}].`,
  );

  return updateGate1Result(filteredClaims);
}

export function shouldProtectValidatedAnchorCarriers(
  contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"],
): boolean {
  return (
    contractValidationSummary?.preservesContract === true
    && contractValidationSummary?.rePromptRequired === false
  );
}

function canSafelyRetryContractApprovedMultiEventSet(
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): boolean {
  return salienceCommitment?.success === true && (salienceCommitment.anchors?.length ?? 0) > 0;
}

export function buildMultiEventRepromptGuidance(params: {
  distinctEventCount: number;
  distinctEvents: CBClaimUnderstanding["distinctEvents"] | undefined;
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>;
  inputOnly?: boolean;
}): string {
  const {
    distinctEventCount,
    distinctEvents,
    salienceCommitment,
    inputOnly = false,
  } = params;

  const guidanceParts = [
    `DECOMPOSITION GUIDANCE: The prior extraction indicated ${distinctEventCount} distinct events, branches, proceedings, comparison sides, or decision gates but the surviving claim set collapsed them into one claim.`,
    "Extract separate atomic claims for each independently verifiable direct event, branch, proceeding, comparison side, or decision gate asserted by the original input.",
    "When the original input says one main act or state occurred before, after, because of, or subject to multiple coordinated decision gates or actor groups, create one thesis-direct claim per gate or branch that preserves the full relation. Do not create one bare claim for the main act and separate bare claims for the gates.",
    "Preserve any priority salience anchor in every split claim whose main act or state remains inside that anchor's semantic scope.",
    "Do not keep a whole-input or near-verbatim bundled claim alongside its component claims.",
    "Do not create claims for evidence-only or background events that are not asserted by the input.",
  ];

  if (inputOnly) {
    guidanceParts.push(
      "For this correction retry, rederive branch labels from the original input and precommitted salience anchors only. Treat the prior distinct-events metadata as a trigger, not as claim text. Do not copy dates, titles, names, or specifics that appeared only in preliminary evidence.",
    );
  } else {
    guidanceParts.push(
      `Input-derived distinct-events inventory: ${JSON.stringify(distinctEvents ?? [])}. Verify every entry against the original input before using it.`,
    );
  }

  if (salienceCommitment?.success && (salienceCommitment.anchors?.length ?? 0) > 0) {
    guidanceParts.push(
      `Precommitted salience anchors: ${JSON.stringify(
        (salienceCommitment.anchors ?? []).map((anchor) => ({
          text: anchor.text,
          type: anchor.type,
          inputSpan: anchor.inputSpan,
        })),
      )}.`,
    );
  }

  return guidanceParts.join(" ");
}

export function shouldRunMultiEventReprompt(
  distinctEventCount: number,
  survivingClaimCount: number,
  maxRepromptAttempts: number,
  contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"],
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): boolean {
  if (distinctEventCount < 2 || survivingClaimCount !== 1 || maxRepromptAttempts <= 0) {
    return false;
  }

  if (!shouldProtectValidatedAnchorCarriers(contractValidationSummary)) {
    return true;
  }

  return canSafelyRetryContractApprovedMultiEventSet(salienceCommitment);
}

function normalizeClaimContractValidationResult(
  raw: ClaimContractRawOutput,
): ClaimContractValidationResult {
  const truthConditionAnchor = raw.truthConditionAnchor ?? raw.inputAssessment.truthConditionAnchor;
  const antiInferenceCheck = raw.antiInferenceCheck ?? (raw.inputAssessment.antiInferenceCheck
    ? {
      normativeClaimInjected: raw.inputAssessment.antiInferenceCheck.normativeInferenceDetected,
      injectedClaimIds: raw.inputAssessment.antiInferenceCheck.inferredClaimIds ?? [],
      reasoning: raw.inputAssessment.antiInferenceCheck.reasoning ?? "",
    }
    : undefined);

  return {
    inputAssessment: {
      preservesOriginalClaimContract: raw.inputAssessment.preservesOriginalClaimContract,
      rePromptRequired: raw.inputAssessment.rePromptRequired,
      summary: raw.inputAssessment.summary ?? "",
      ...(truthConditionAnchor ? { truthConditionAnchor } : {}),
      ...(raw.inputAssessment.antiInferenceCheck ? { antiInferenceCheck: raw.inputAssessment.antiInferenceCheck } : {}),
    },
    claims: raw.claims,
    ...(truthConditionAnchor ? { truthConditionAnchor } : {}),
    ...(antiInferenceCheck ? { antiInferenceCheck } : {}),
  };
}

export function evaluateClaimContractValidation(
  contractResult: ClaimContractValidationResult,
  claims: AtomicClaim[],
): EvaluatedClaimContractValidation {
  const anchor = contractResult.truthConditionAnchor;
  let anchorOverrideRetry = false;
  let anchorRetryReason: string | undefined;
  let validPreservedIds: string[] = [];

  if (anchor?.presentInInput && anchor.anchorText) {
    // Structural provenance checks only — no deterministic semantic matching
    // of the anchor text against claim text. The F4 substring-based anchor
    // check (.toLowerCase().includes(anchor)) was removed in C1 (9ca8c514)
    // because it overrode LLM contract-validator judgments with a heuristic
    // that fails on German morphology and evaluative paraphrasing, causing
    // ~75% false-positive anchorOverrideRetry on rechtskräftig-class inputs.
    //
    // The LLM's own preservedInClaimIds is authoritative for preservation
    // judgment; our job here is only to verify the LLM did not hallucinate
    // that judgment by citing non-existent IDs or fabricated quotes.
    const claimIds = new Set(claims.map((claim) => claim.id));
    // Track 1 (Rev B): structural directness gate. Cited preservation IDs must
    // reference claims marked thesisRelevance="direct". Tangential or contextual
    // claims cannot serve as anchor carriers, even if their text happens to
    // contain modifier-like wording. This is a typed-field check, not a semantic
    // re-check of anchor text. Claims with thesisRelevance undefined default to
    // "direct" (matches the validator payload default in validateClaimContract).
    const directClaimIds = new Set(
      claims
        .filter((claim) => (claim.thesisRelevance ?? "direct") === "direct")
        .map((claim) => claim.id),
    );
    const citedPreservedIds = anchor.preservedInClaimIds ?? [];
    validPreservedIds = citedPreservedIds
      .filter((id) => claimIds.has(id))
      .filter((id) => directClaimIds.has(id));

    // honestQuotes substring check REMOVED: it used
    // claimText.toLowerCase().includes(quote.toLowerCase()) which is the
    // same anti-pattern as the F4 anchor check deleted in C1 (9ca8c514).
    // Fails on German morphology and paraphrasing, causing ~60% false-
    // positive anchorOverrideRetry on R2 rechtskräftig-class inputs even
    // after F4 was fixed. The LLM's preservedByQuotes is trusted as-is;
    // structural validity is checked via validPreservedIds (ID existence +
    // thesis-directness) and the self-consistency check below.

    // LLM self-consistency check (structural, not semantic): if the LLM
    // lists a claim as anchor-preserving in preservedInClaimIds but that
    // same claim is marked as drifted in the per-claim assessment array
    // (recommendedAction=retry, proxyDriftSeverity=material, or
    // preservesEvaluativeMeaning=false), the LLM is internally contradicting
    // itself. This is a pure structural cross-check of LLM output against
    // itself, NOT a deterministic semantic re-check.
    const claimAssessmentById = new Map(
      (contractResult.claims ?? []).map((c) => [c.claimId, c] as const),
    );
    const contradictedPreservedIds = validPreservedIds.filter((claimId) => {
      const assessment = claimAssessmentById.get(claimId);
      if (!assessment) return false;
      return (
        assessment.recommendedAction === "retry" ||
        assessment.proxyDriftSeverity === "material" ||
        assessment.preservesEvaluativeMeaning === false
      );
    });

    // Override the LLM's judgment when the validator actually cites anchor
    // carriers but none survive structural validation, OR when it contradicts
    // itself between preservedInClaimIds and its per-claim assessment.
    // If the validator cites no carrier IDs at all, leave that case to the
    // validator's own top-level assessment: some article-level caveats can be
    // acceptable without a thesis-direct carrier, and forcing a retry here
    // would turn that observational anchor into a false report_damaged.
    const noValidIds = citedPreservedIds.length > 0 && validPreservedIds.length === 0;
    const selfContradicted = contradictedPreservedIds.length > 0;
    if (noValidIds || selfContradicted) {
      anchorOverrideRetry = true;
      const reasons: string[] = [];
      if (noValidIds) {
        const existingCited = citedPreservedIds.filter((id) => claimIds.has(id));
        const tangentialCited = existingCited.filter((id) => !directClaimIds.has(id));
        if (existingCited.length > 0 && tangentialCited.length === existingCited.length) {
          reasons.push(`all cited preservedInClaimIds [${tangentialCited.join(",")}] are tangential/contextual; thesis-direct claim required`);
        } else {
          reasons.push("no valid cited claim IDs after structural check (existence + thesis-direct)");
        }
      }
      if (selfContradicted) reasons.push(`LLM self-contradiction on claim(s) [${contradictedPreservedIds.join(",")}] — listed as anchor-preserving but flagged as drifted in per-claim assessment`);
      anchorRetryReason = `anchor_provenance_failed: "${anchor.anchorText}" — ${reasons.join("; ")}. LLM cited preservedInClaimIds=[${citedPreservedIds.join(",")}], valid IDs=[${validPreservedIds.join(",")}]`;
    }
  }

  const antiInf = contractResult.antiInferenceCheck;
  if (antiInf?.normativeClaimInjected && (antiInf.injectedClaimIds ?? []).length > 0) {
    anchorOverrideRetry = true;
    anchorRetryReason = (anchorRetryReason ? `${anchorRetryReason}; ` : "") +
      `normative_injection: claims [${antiInf.injectedClaimIds.join(",")}] added normative/legal assertion not in input`;
  }

  const effectiveRePromptRequired = contractResult.inputAssessment.rePromptRequired || anchorOverrideRetry;
  const preservesContract = contractResult.inputAssessment.preservesOriginalClaimContract && !anchorOverrideRetry;
  // C9 (Phase 5): validator returned a usable result. Any failure here is a
  // genuine contract violation, not a validator-availability issue.
  const failureMode: "contract_violated" | undefined = !preservesContract || effectiveRePromptRequired
    ? "contract_violated"
    : undefined;

  return {
    summary: {
      ran: true,
      preservesContract,
      rePromptRequired: effectiveRePromptRequired,
      summary: contractResult.inputAssessment.summary ?? "",
      ...(failureMode ? { failureMode } : {}),
      ...(anchorRetryReason ? { anchorRetryReason } : {}),
      ...(anchor ? {
        truthConditionAnchor: {
          presentInInput: anchor.presentInInput,
          anchorText: anchor.anchorText,
          preservedInClaimIds: anchor.preservedInClaimIds ?? [],
          preservedByQuotes: anchor.preservedByQuotes ?? [],
          validPreservedIds,
        },
      } : {}),
    },
    effectiveRePromptRequired,
    ...(anchorRetryReason ? { anchorRetryReason } : {}),
  };
}

export function shouldRunSingleClaimAtomicityValidation(
  claims: AtomicClaim[],
  contractValidation: EvaluatedClaimContractValidation | undefined,
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): boolean {
  return (
    claims.length === 1
    && contractValidation?.summary.preservesContract === true
    && contractValidation.effectiveRePromptRequired === false
    && salienceCommitment?.success === true
    && (salienceCommitment.anchors?.length ?? 0) > 0
  );
}

export interface EvaluatedSingleClaimAtomicityValidation {
  effectiveRePromptRequired: boolean;
  retryReason?: string;
  summaryAppendix?: string;
}

function getDistinctAtomicityBranchLabels(
  atomicityResult: SingleClaimAtomicityValidationResult,
): string[] {
  const branchLabels = atomicityResult.coordinatedBranchFinding.branchLabels ?? [];
  const seen = new Set<string>();
  const distinct: string[] = [];

  for (const branchLabel of branchLabels) {
    const trimmed = branchLabel.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    distinct.push(trimmed);
  }

  return distinct;
}

export function evaluateSingleClaimAtomicityValidation(
  atomicityResult: SingleClaimAtomicityValidationResult,
): EvaluatedSingleClaimAtomicityValidation {
  const branchLabels = getDistinctAtomicityBranchLabels(atomicityResult);
  const explicitMultiBranch = branchLabels.length >= 2;
  const structurallyBundled =
    atomicityResult.coordinatedBranchFinding.bundledInSingleClaim
    || explicitMultiBranch;
  const effectiveRePromptRequired =
    atomicityResult.singleClaimAssessment.rePromptRequired
    || !atomicityResult.singleClaimAssessment.isAtomic
    || structurallyBundled;
  const branchSummary = branchLabels.length > 0
    ? `branchLabels=[${branchLabels.join(", ")}]`
    : undefined;

  if (!effectiveRePromptRequired) {
    return {
      effectiveRePromptRequired: false,
      summaryAppendix: [
        atomicityResult.singleClaimAssessment.summary || atomicityResult.coordinatedBranchFinding.reasoning,
        branchSummary,
      ].filter(Boolean).join("; "),
    };
  }

  const summaryAppendix = [
    atomicityResult.singleClaimAssessment.summary,
    atomicityResult.coordinatedBranchFinding.reasoning,
    branchSummary,
  ].filter(Boolean).join("; ");

  return {
    effectiveRePromptRequired: true,
    retryReason: [
      "single_claim_atomicity_failed",
      atomicityResult.singleClaimAssessment.summary,
      atomicityResult.coordinatedBranchFinding.reasoning,
    ].filter(Boolean).join(": "),
    summaryAppendix,
  };
}

export function selectPreferredSingleClaimAtomicityValidation(
  primary: SingleClaimAtomicityValidationResult | undefined,
  challenger: SingleClaimAtomicityValidationResult | undefined,
): SingleClaimAtomicityValidationResult | undefined {
  if (primary && evaluateSingleClaimAtomicityValidation(primary).effectiveRePromptRequired) {
    return primary;
  }
  if (challenger && evaluateSingleClaimAtomicityValidation(challenger).effectiveRePromptRequired) {
    return challenger;
  }
  return primary ?? challenger;
}

export function getPrioritySalienceAnchorsForAtomicityValidation(
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): NonNullable<CBClaimUnderstanding["salienceCommitment"]>["anchors"] {
  const anchors = salienceCommitment?.anchors ?? [];
  const priorityTypes = new Set(["modal_illocutionary", "action_predicate"]);
  const prioritizedAnchors = anchors.filter((anchor) => priorityTypes.has(anchor.type));
  return prioritizedAnchors.length > 0 ? prioritizedAnchors : anchors;
}

function buildSalienceBindingContextJson(
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): string {
  return JSON.stringify(
    {
      enabled: salienceCommitment?.enabled ?? false,
      mode: salienceCommitment?.mode ?? "audit",
      success: salienceCommitment?.success ?? false,
      anchors: salienceCommitment?.anchors ?? [],
      priorityAnchors: getPrioritySalienceAnchorsForAtomicityValidation(salienceCommitment),
    },
    null,
    2,
  );
}

function buildDistinctEventsContextJson(
  distinctEvents?: CBClaimUnderstanding["distinctEvents"],
): string {
  return JSON.stringify(
    {
      count: distinctEvents?.length ?? 0,
      events: distinctEvents ?? [],
    },
    null,
    2,
  );
}

export function applySingleClaimAtomicityValidation(
  contractValidation: EvaluatedClaimContractValidation,
  atomicityResult: SingleClaimAtomicityValidationResult | undefined,
): EvaluatedClaimContractValidation {
  if (!atomicityResult) {
    return contractValidation;
  }

  const evaluatedAtomicity = evaluateSingleClaimAtomicityValidation(atomicityResult);
  if (!evaluatedAtomicity.effectiveRePromptRequired) {
    return contractValidation;
  }

  return {
    summary: {
      ...contractValidation.summary,
      preservesContract: false,
      rePromptRequired: true,
      failureMode: "contract_violated",
      summary: [
        contractValidation.summary.summary,
        evaluatedAtomicity.summaryAppendix,
      ].filter(Boolean).join("; "),
      ...(evaluatedAtomicity.retryReason ? { atomicityRetryReason: evaluatedAtomicity.retryReason } : {}),
    },
    effectiveRePromptRequired: true,
    ...(contractValidation.anchorRetryReason ? { anchorRetryReason: contractValidation.anchorRetryReason } : {}),
    ...(evaluatedAtomicity.retryReason ? { atomicityRetryReason: evaluatedAtomicity.retryReason } : {}),
  };
}

function getClaimContractSignature(claim: Pick<AtomicClaim, "id" | "statement">): string {
  return `${claim.id}\u0000${claim.statement}`;
}

export function areClaimSetsEquivalent(left: AtomicClaim[] | undefined, right: AtomicClaim[]): boolean {
  if (!left) return false;
  if (left.length !== right.length) return false;

  const leftSignatures = new Set(left.map(getClaimContractSignature));
  const rightSignatures = new Set(right.map(getClaimContractSignature));

  return (
    leftSignatures.size === left.length
    && rightSignatures.size === right.length
    && [...leftSignatures].every((signature) => rightSignatures.has(signature))
  );
}

export function canCarryForwardValidatedContractApproval(
  previousSummary: CBClaimUnderstanding["contractValidationSummary"],
  previousValidatedClaims: AtomicClaim[] | undefined,
  finalAcceptedClaims: AtomicClaim[],
): boolean {
  if (
    !previousSummary?.preservesContract
    || previousSummary.rePromptRequired
    || !previousValidatedClaims
    || finalAcceptedClaims.length === 0
  ) {
    return false;
  }

  const validatedAnchorCarrierIds = previousSummary.truthConditionAnchor?.validPreservedIds ?? [];
  if (validatedAnchorCarrierIds.length === 0) {
    return false;
  }

  const validatedClaimSignatures = new Set(previousValidatedClaims.map(getClaimContractSignature));
  if (!finalAcceptedClaims.every((claim) => validatedClaimSignatures.has(getClaimContractSignature(claim)))) {
    return false;
  }

  const finalAcceptedClaimIds = new Set(finalAcceptedClaims.map((claim) => claim.id));
  if (!validatedAnchorCarrierIds.every((claimId) => finalAcceptedClaimIds.has(claimId))) {
    return false;
  }

  const validatedThesisDirectClaimIds = previousValidatedClaims
    .filter((claim) => (claim.thesisRelevance ?? "direct") === "direct")
    .map((claim) => claim.id);

  return validatedThesisDirectClaimIds.every((claimId) => finalAcceptedClaimIds.has(claimId));
}

function claimSetContainsAnchorText(
  claims: Array<{ statement?: string | null }>,
  anchorText: string,
): boolean {
  const normalizedAnchor = anchorText.trim().toLowerCase();
  if (!normalizedAnchor) return false;

  return claims.some(
    (claim) => typeof claim.statement === "string" && claim.statement.toLowerCase().includes(normalizedAnchor),
  );
}

function toBindingSalienceCommitment(
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): NonNullable<CBClaimUnderstanding["salienceCommitment"]> | undefined {
  if (!salienceCommitment?.success || (salienceCommitment.anchors?.length ?? 0) === 0) {
    return undefined;
  }

  return {
    ...salienceCommitment,
    ran: true,
    enabled: true,
    success: true,
    mode: "binding",
    anchors: salienceCommitment.anchors ?? [],
  };
}

export interface ContractRetryAnchorEscalation {
  mode: "none" | "binding_merged_anchor" | "audit_guidance_only";
  anchorText?: string;
}

export interface ContractRetrySaliencePlan {
  retrySalienceCommitment: NonNullable<CBClaimUnderstanding["salienceCommitment"]> | undefined;
  anchorEscalation: ContractRetryAnchorEscalation;
}

function createMergedRetryAnchor(
  anchorText: string,
): NonNullable<CBClaimUnderstanding["salienceCommitment"]>["anchors"][number] {
  return {
    text: anchorText,
    inputSpan: anchorText,
    type: "action_predicate",
    rationale: "Validator-discovered truth-condition anchor missing from structurally valid claim carriers.",
    truthConditionShiftIfRemoved: "Removing this anchor changes the proposition's truth conditions.",
  };
}

export function buildContractRetrySaliencePlan(
  evaluatedContract: EvaluatedClaimContractValidation | undefined,
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): ContractRetrySaliencePlan {
  const noEscalation: ContractRetrySaliencePlan = {
    retrySalienceCommitment: salienceCommitment,
    anchorEscalation: { mode: "none" },
  };

  if (!evaluatedContract?.effectiveRePromptRequired) {
    return noEscalation;
  }

  const truthConditionAnchor = evaluatedContract.summary.truthConditionAnchor;
  const anchorText = truthConditionAnchor?.anchorText?.trim();
  if (truthConditionAnchor?.presentInInput !== true || !anchorText) {
    return noEscalation;
  }

  if ((truthConditionAnchor.validPreservedIds ?? []).length > 0) {
    return noEscalation;
  }

  const upstreamAnchors = salienceCommitment?.success
    ? salienceCommitment.anchors ?? []
    : [];

  if (upstreamAnchors.length === 0) {
    return {
      retrySalienceCommitment: salienceCommitment,
      anchorEscalation: {
        mode: "audit_guidance_only",
        anchorText,
      },
    };
  }

  const exactMatches = upstreamAnchors.filter(
    (anchor) => anchor.text.trim() === anchorText,
  );
  const mergedAnchors = exactMatches.length > 0
    ? upstreamAnchors
    : [createMergedRetryAnchor(anchorText), ...upstreamAnchors];

  return {
    retrySalienceCommitment: toBindingSalienceCommitment({
      ...salienceCommitment!,
      anchors: mergedAnchors,
    }) ?? salienceCommitment,
    anchorEscalation: {
      mode: "binding_merged_anchor",
      anchorText,
    },
  };
}

export function selectPreferredSingleClaimContractChallenge(
  primary: EvaluatedClaimContractValidation,
  challenger: EvaluatedClaimContractValidation | undefined,
): EvaluatedClaimContractValidation {
  if (challenger?.effectiveRePromptRequired) {
    return challenger;
  }
  return primary;
}

export function selectRepairAnchorText(
  contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"],
  claims: Array<{ statement?: string | null }>,
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
): string | undefined {
  const anchor = contractValidationSummary?.truthConditionAnchor;
  const anchorText = anchor?.anchorText?.trim();

  if (!anchorText || anchor?.presentInInput !== true) {
    return undefined;
  }

  if (claimSetContainsAnchorText(claims, anchorText)) {
    return anchorText;
  }

  const salienceAnchors = salienceCommitment?.success
    ? salienceCommitment.anchors ?? []
    : [];

  if (salienceAnchors.length === 0) {
    return anchorText;
  }

  const normalizedAnchor = anchorText.toLowerCase();
  const safeNarrowingTypes = new Set(["modal_illocutionary", "action_predicate"]);
  const narrowedCandidates = salienceAnchors
    .map((salienceAnchor) => ({
      text: salienceAnchor.text.trim(),
      type: salienceAnchor.type,
    }))
    .filter((candidate) => candidate.text.length > 0)
    .filter((candidate) => candidate.text.toLowerCase() !== normalizedAnchor)
    .filter((candidate) => normalizedAnchor.includes(candidate.text.toLowerCase()))
    .filter((candidate, index, items) =>
      items.findIndex((otherCandidate) => otherCandidate.text.toLowerCase() === candidate.text.toLowerCase()) === index,
    )
    .filter((candidate) => !claimSetContainsAnchorText(claims, candidate.text));

  if (narrowedCandidates.length === 1) {
    const [soleCandidate] = narrowedCandidates;

    // Only narrow to modifier/predicate-like salience spans. If the lone
    // still-missing candidate is a temporal/scope clause, repairing against
    // that sub-span tends to collapse the claim set into a whole-claim plus
    // partial-subclaim shape on Bundesrat-class inputs. In that case, keep
    // the validator's broader anchor so the repair prompt preserves the full
    // proposition instead of chasing one clause in isolation.
    if (safeNarrowingTypes.has(soleCandidate.type)) {
      return soleCandidate.text;
    }
  }

  return anchorText;
}

export function shouldRunContractRepairPass(
  contractValidationSummary: CBClaimUnderstanding["contractValidationSummary"],
): boolean {
  return !(
    contractValidationSummary?.preservesContract === true &&
    contractValidationSummary?.rePromptRequired === false
  );
}

async function runSingleClaimBindingContractChallenge(
  claims: AtomicClaim[],
  originalInput: string,
  impliedClaim: string,
  articleThesis: string,
  inputClassification: string,
  pipelineConfig: PipelineConfig,
  salienceCommitment: NonNullable<CBClaimUnderstanding["salienceCommitment"]> | undefined,
  distinctEvents: CBClaimUnderstanding["distinctEvents"] | undefined,
  state: CBResearchState,
  progressPercent: number,
): Promise<EvaluatedClaimContractValidation | undefined> {
  if (claims.length !== 1 || salienceCommitment?.mode === "binding") {
    return undefined;
  }

  const bindingSalienceCommitment = toBindingSalienceCommitment(salienceCommitment);
  if (!bindingSalienceCommitment) {
    return undefined;
  }

  const modelName = getModelForTask("context_refinement", undefined, pipelineConfig).modelName;
  state.onEvent?.("Re-checking single-claim contract against salience anchors...", progressPercent);
  state.onEvent?.(`LLM call: single-claim binding contract challenge — ${modelName}`, -1);

  const challengerResult = await validateClaimContract(
    claims,
    originalInput,
    impliedClaim,
    articleThesis,
    inputClassification,
    pipelineConfig,
    bindingSalienceCommitment,
    distinctEvents,
  );
  state.llmCalls++;

  return challengerResult
    ? evaluateClaimContractValidation(challengerResult, claims)
    : undefined;
}

async function applyApprovedSingleClaimChallenges(
  claims: AtomicClaim[],
  contractValidation: EvaluatedClaimContractValidation,
  originalInput: string,
  impliedClaim: string,
  articleThesis: string,
  inputClassification: string,
  pipelineConfig: PipelineConfig,
  state: CBResearchState,
  progressPercent: number,
  salienceCommitment: NonNullable<CBClaimUnderstanding["salienceCommitment"]> | undefined,
  distinctEvents?: CBClaimUnderstanding["distinctEvents"],
): Promise<EvaluatedClaimContractValidation> {
  if (!shouldRunSingleClaimAtomicityValidation(claims, contractValidation, salienceCommitment)) {
    return contractValidation;
  }

  const atomicityResult = await runSingleClaimAtomicityValidationWithRecheck(
    claims,
    originalInput,
    impliedClaim,
    articleThesis,
    inputClassification,
    pipelineConfig,
    salienceCommitment,
    distinctEvents,
    state,
    progressPercent,
  );
  const postAtomicityValidation = applySingleClaimAtomicityValidation(
    contractValidation,
    atomicityResult,
  );
  if (postAtomicityValidation.effectiveRePromptRequired) {
    return postAtomicityValidation;
  }

  const bindingChallenge = await runSingleClaimBindingContractChallenge(
    claims,
    originalInput,
    impliedClaim,
    articleThesis,
    inputClassification,
    pipelineConfig,
    salienceCommitment,
    distinctEvents,
    state,
    progressPercent,
  );

  return selectPreferredSingleClaimContractChallenge(
    postAtomicityValidation,
    bindingChallenge,
  );
}

async function runSingleClaimAtomicityValidationWithRecheck(
  claims: AtomicClaim[],
  originalInput: string,
  impliedClaim: string,
  articleThesis: string,
  inputClassification: string,
  pipelineConfig: PipelineConfig,
  salienceCommitment: NonNullable<CBClaimUnderstanding["salienceCommitment"]> | undefined,
  distinctEvents: CBClaimUnderstanding["distinctEvents"] | undefined,
  state: CBResearchState,
  progressPercent: number,
): Promise<SingleClaimAtomicityValidationResult | undefined> {
  if (claims.length !== 1) return undefined;

  const modelName = getModelForTask("context_refinement", undefined, pipelineConfig).modelName;
  state.onEvent?.("Validating single-claim atomicity...", progressPercent);
  state.onEvent?.(`LLM call: single-claim atomicity validation — ${modelName}`, -1);
  const primaryResult = await validateSingleClaimAtomicity(
    claims,
    originalInput,
    impliedClaim,
    articleThesis,
    inputClassification,
    pipelineConfig,
    salienceCommitment,
    distinctEvents,
  );
  state.llmCalls++;

  if (primaryResult && evaluateSingleClaimAtomicityValidation(primaryResult).effectiveRePromptRequired) {
    return primaryResult;
  }

  state.onEvent?.("Re-checking single-claim atomicity...", progressPercent);
  state.onEvent?.(`LLM call: single-claim atomicity re-check — ${modelName}`, -1);
  const challengerResult = await validateSingleClaimAtomicity(
    claims,
    originalInput,
    impliedClaim,
    articleThesis,
    inputClassification,
    pipelineConfig,
    salienceCommitment,
    distinctEvents,
  );
  state.llmCalls++;

  return selectPreferredSingleClaimAtomicityValidation(primaryResult, challengerResult);
}

async function validateSingleClaimAtomicity(
  claims: AtomicClaim[],
  originalInput: string,
  impliedClaim: string,
  articleThesis: string,
  inputClassification: string,
  pipelineConfig: PipelineConfig,
  salienceCommitment?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
  distinctEvents?: CBClaimUnderstanding["distinctEvents"],
): Promise<SingleClaimAtomicityValidationResult | undefined> {
  if (claims.length !== 1) return undefined;

  const model = getModelForTask("context_refinement", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();

  try {
    const rendered = await loadAndRenderSection("claimboundary", "CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION", {
      analysisInput: originalInput,
      inputClassification,
      impliedClaim,
      articleThesis,
      salienceBindingContextJson: buildSalienceBindingContextJson(salienceCommitment),
      distinctEventsContextJson: buildDistinctEventsContextJson(distinctEvents),
      atomicClaimsJson: JSON.stringify(
        claims.map((claim) => ({
          claimId: claim.id,
          statement: claim.statement,
          thesisRelevance: claim.thesisRelevance ?? "direct",
          claimDirection: claim.claimDirection ?? "supports_thesis",
        })),
        null,
        2,
      ),
    });

    if (!rendered) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Single-claim atomicity validation prompt section could not be loaded",
        timestamp: new Date(),
      });
      return undefined;
    }

    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user" as const,
          content: "Assess whether this single extracted claim is still structurally non-atomic.",
        },
      ],
      temperature: pipelineConfig?.claimContractValidationTemperature ?? 0.1,
      output: Output.object({ schema: SingleClaimAtomicityOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Single-claim atomicity validation returned no structured output",
        timestamp: new Date(),
      });
      return undefined;
    }

    const validated = SingleClaimAtomicityOutputSchema.parse(parsed);

    recordLLMCall({
      taskType: "other",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return validated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    recordLLMCall({
      taskType: "other",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage: `Single-claim atomicity validation failed: ${errorMessage}`,
      timestamp: new Date(),
    });
    return undefined;
  }
}

/**
 * Validate extracted claims against the original input's claim contract.
 * Uses an LLM call to detect proxy drift where claims substitute a narrower
 * predicate for the user's original evaluative meaning. In binding mode,
 * the validator audits against the precommitted salience anchor set rather
 * than discovering a fresh anchor inventory.
 *
 * Returns undefined on any failure — the caller may retry once and otherwise
 * treats the contract state as degraded rather than silently fail-open.
 */
async function validateClaimContract(
  claims: AtomicClaim[],
  originalInput: string,
  impliedClaim: string,
  articleThesis: string,
  inputClassification: string,
  pipelineConfig: PipelineConfig,
  salienceBinding?: NonNullable<CBClaimUnderstanding["salienceCommitment"]>,
  distinctEvents?: CBClaimUnderstanding["distinctEvents"],
): Promise<ClaimContractValidationResult | undefined> {
  if (claims.length === 0) return undefined;

  const model = getModelForTask("context_refinement", undefined, pipelineConfig);
  const expectedClaimIds = new Set(claims.map((c) => c.id));
  const llmCallStartedAt = Date.now();
  const bindingModeActive = salienceBinding?.mode === "binding";
  const salienceBindingContextJson = buildSalienceBindingContextJson(salienceBinding);

  try {
    const rendered = await loadAndRenderSection("claimboundary", "CLAIM_CONTRACT_VALIDATION", {
      analysisInput: originalInput,
      inputClassification,
      impliedClaim,
      articleThesis,
      salienceBindingContextJson,
      distinctEventsContextJson: buildDistinctEventsContextJson(distinctEvents),
      atomicClaimsJson: JSON.stringify(
        claims.map((c) => {
          // Track 1 (Rev B): pass directness context so the LLM validator can
          // distinguish thesis-direct anchor carriers from tangential side claims.
          // thesisRelevance is required; claimDirection and isDimensionDecomposition
          // are included when present. This is structural plumbing — the LLM still
          // makes the semantic judgment about anchor preservation.
          const payload: Record<string, unknown> = {
            claimId: c.id,
            statement: c.statement,
            category: c.category,
            thesisRelevance: c.thesisRelevance ?? "direct",
            freshnessRequirement: c.freshnessRequirement ?? "none",
            expectedEvidenceProfile: c.expectedEvidenceProfile ?? {},
          };
          if (c.claimDirection !== undefined) payload.claimDirection = c.claimDirection;
          if (c.isDimensionDecomposition !== undefined) payload.isDimensionDecomposition = c.isDimensionDecomposition;
          return payload;
        }),
        null,
        2,
      ),
    });

    if (!rendered) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Claim contract validation prompt section could not be loaded",
        timestamp: new Date(),
      });
      return undefined;
    }

    let contractBindingAppendix = "";
    if (bindingModeActive) {
      const bindingAppendix = await loadAndRenderSection("claimboundary", "CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX", {
        salienceBindingContextJson,
      });
      if (!bindingAppendix) {
        recordLLMCall({
          taskType: "other",
          provider: model.provider,
          modelName: model.modelName,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          durationMs: Date.now() - llmCallStartedAt,
          success: false,
          schemaCompliant: false,
          retries: 0,
          errorMessage: "Claim contract validation binding appendix could not be loaded",
          timestamp: new Date(),
        });
        return undefined;
      }
      contractBindingAppendix = `\n\n${bindingAppendix.content}`;
    }

    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content + contractBindingAppendix,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user" as const,
          content: `Validate claim contract fidelity for ${claims.length} extracted claim(s).`,
        },
      ],
      temperature: pipelineConfig?.claimContractValidationTemperature ?? 0.1,
      output: Output.object({ schema: ClaimContractOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Claim contract validation returned no structured output",
        timestamp: new Date(),
      });
      return undefined;
    }

    const validated = normalizeClaimContractValidationResult(
      ClaimContractOutputSchema.parse(parsed),
    );

    const returnedClaimIds = new Set(validated.claims.map((c) => c.claimId));
    const contractViolation =
      returnedClaimIds.size !== expectedClaimIds.size ||
      [...expectedClaimIds].some((id) => !returnedClaimIds.has(id));

    if (contractViolation) {
      validated.inputAssessment.preservesOriginalClaimContract = false;
      validated.inputAssessment.rePromptRequired = true;
      validated.inputAssessment.summary = [
        validated.inputAssessment.summary,
        `validator batch contract violated: expected [${[...expectedClaimIds].join(",")}], got [${[...returnedClaimIds].join(",")}]`,
      ].filter(Boolean).join("; ");
      recordLLMCall({
        taskType: "other",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: `Claim contract validation batch contract violated: expected [${[...expectedClaimIds].join(",")}], got [${[...returnedClaimIds].join(",")}]`,
        timestamp: new Date(),
      });
      return validated;
    }

    recordLLMCall({
      taskType: "other",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return validated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    recordLLMCall({
      taskType: "other",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage: `Claim contract validation failed: ${errorMessage}`,
      timestamp: new Date(),
    });
    return undefined;
  }
}

/**
 * Gate 1: Claim validation using batched LLM call (Haiku).
 * Validates all claims in a single LLM call for efficiency.
 *
 * @returns Gate 1 statistics
 */
export async function runGate1Validation(
  claims: AtomicClaim[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
  analysisInput = "",
): Promise<Gate1ValidationResult> {
  if (claims.length === 0) {
    return {
      stats: {
        totalClaims: 0,
        passedOpinion: 0,
        passedSpecificity: 0,
        passedFidelity: 0,
        filteredCount: 0,
        overallPass: true,
      },
      filteredClaims: [],
    };
  }

  const specificityMin = pipelineConfig.claimSpecificityMinimum ?? 0.6;

  const rendered = await loadAndRenderSection("claimboundary", "CLAIM_VALIDATION", {
    currentDate,
    analysisInput,
    atomicClaims: JSON.stringify(
      claims.map((c) => ({ id: c.id, statement: c.statement, category: c.category })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // If prompt not available, pass all claims (non-blocking)
    console.warn("[Stage1] Gate 1: CLAIM_VALIDATION prompt not found — skipping validation");
    return {
      stats: {
        totalClaims: claims.length,
        passedOpinion: claims.length,
        passedSpecificity: claims.length,
        passedFidelity: claims.length,
        filteredCount: 0,
        overallPass: true,
      },
      filteredClaims: claims,
    };
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Validate these ${claims.length} claims:\n${JSON.stringify(
            claims.map((c) => ({ id: c.id, statement: c.statement })),
            null,
            2,
          )}`,
        },
      ],
      temperature: pipelineConfig?.gate1ValidationTemperature ?? 0.1,
      output: Output.object({ schema: Gate1OutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        (pipelineConfig.llmProvider) ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "understand",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Gate 1 validation returned no structured output",
        timestamp: new Date(),
      });
      console.warn("[Stage1] Gate 1: LLM returned no structured output — passing all claims");
      return {
        stats: {
          totalClaims: claims.length,
          passedOpinion: claims.length,
          passedSpecificity: claims.length,
          passedFidelity: claims.length,
          filteredCount: 0,
          overallPass: true,
        },
        filteredClaims: claims,
      };
    }

    const validated = Gate1OutputSchema.parse(parsed);

    const passedOpinion = validated.validatedClaims.filter((v) => v.passedOpinion).length;
    const passedSpecificity = validated.validatedClaims.filter((v) => v.passedSpecificity).length;
    const passedFidelity = validated.validatedClaims.filter((v) => v.passedFidelity).length;

    // Build set of claim IDs that fail BOTH opinion AND specificity
    const failedBothIds = new Set(
      validated.validatedClaims
        .filter((v) => !v.passedOpinion && !v.passedSpecificity)
        .map((v) => v.claimId),
    );
    const failedFidelityIds = new Set(
      validated.validatedClaims
        .filter((v) => !v.passedFidelity)
        .map((v) => v.claimId),
    );

    // Filter claims: remove those that fail both opinion+specificity, or are
    // below specificity threshold when grounded.
    //
    // C13 (Phase 6): Gate 1 NO LONGER filters on fidelity. The
    // CONTRACT_VALIDATION stage is the sole fidelity authority — it has richer
    // input (anchor metadata, thesis, verbatim-preservation rules, structural
    // checks) and its judgment is already captured in
    // `contractValidationSummary`. Running a second, less-informed LLM
    // fidelity judge here produced contradictory rejections on C11b Run 1,
    // destroying a contract-approved claim set and triggering a reprompt
    // loop that lost the anchor. `failedFidelityIds` is still computed from
    // the Gate 1 output for telemetry/logging only.
    let fidelityFiltered = 0;
    let bothFiltered = 0;
    let specificityFiltered = 0;
    const rescuedThesisDirect: string[] = [];
    const keptClaims = claims.filter((claim) => {
      // Remove if LLM says both opinion and specificity fail —
      // EXCEPT thesis-direct claims: the user explicitly asked about this dimension.
      // Stage 4's verdict debate handles evaluative claims with confidence calibration.
      if (failedBothIds.has(claim.id)) {
        if (claim.thesisRelevance === "direct") {
          rescuedThesisDirect.push(claim.id);
        } else {
          bothFiltered++;
          return false;
        }
      }
      // Remove if specificityScore is below UCM-configured minimum —
      // but only when grounding was available (moderate/strong/weak).
      // With groundingQuality "none" (no preliminary evidence), low specificity
      // is expected and should not cause filtering — the claim may become
      // specific once real evidence is found in Stage 2.
      if (claim.groundingQuality !== "none" && claim.specificityScore < specificityMin) {
        specificityFiltered++;
        return false;
      }
      return true;
    });

    // Safety net: never filter ALL claims — an empty pipeline produces a
    // meaningless default verdict which is worse than analyzing a vague claim.
    // If filtering would leave 0, keep the highest-centrality claim.
    // C13: fidelity is no longer a filter; rescue prefers centrality only.
    if (keptClaims.length === 0 && claims.length > 0) {
      const centralityOrder = ["high", "medium", "low"];
      const rescued = [...claims]
        .sort((a, b) =>
          centralityOrder.indexOf(a.centrality ?? "low") - centralityOrder.indexOf(b.centrality ?? "low"),
        )[0];
      keptClaims.push(rescued);
      console.warn(
        `[Stage1] Gate 1: all ${claims.length} claims would be filtered — rescued "${rescued.id}" (centrality: ${rescued.centrality}) to prevent empty pipeline.`,
      );
    }

    const filteredCount = claims.length - keptClaims.length;
    const fidelityTelemetry = failedFidelityIds.size;
    if (filteredCount > 0 || fidelityTelemetry > 0) {
      console.info(
        `[Stage1] Gate 1: filtered ${filteredCount} of ${claims.length} claims (${bothFiltered} failed both opinion+specificity, ${specificityFiltered} below specificity minimum ${specificityMin}; ungrounded claims exempt from specificity filter). C13: Gate 1 fidelity is telemetry-only; ${fidelityTelemetry} claim(s) flagged by Gate 1 fidelity but NOT filtered (CONTRACT_VALIDATION is the sole fidelity authority).`,
      );
    }

    // Check if retry threshold exceeded (v1: warn only, no retry)
    const gate1Threshold = pipelineConfig.gate1GroundingRetryThreshold ?? 0.5;
    const failRate = 1 - (passedSpecificity / claims.length);
    if (failRate > gate1Threshold) {
      console.warn(
        `[Stage1] Gate 1: ${Math.round(failRate * 100)}% of claims failed specificity (threshold: ${Math.round(gate1Threshold * 100)}%). Retry deferred to v1.1.`,
      );
    }

    // B-6: Log verifiability annotations if mode includes it; strip if mode is "off"
    const annotationMode = pipelineConfig.claimAnnotationMode ?? "off";
    if (annotationMode !== "off") {
      const verifiabilityCounts = { high: 0, medium: 0, low: 0, none: 0, missing: 0 };
      for (const claim of keptClaims) {
        const v = claim.verifiability;
        if (v && v in verifiabilityCounts) {
          verifiabilityCounts[v as keyof typeof verifiabilityCounts]++;
        } else {
          verifiabilityCounts.missing++;
        }
      }
      console.info(
        `[Stage1] Gate 1: verifiability annotation — ${JSON.stringify(verifiabilityCounts)} (${keptClaims.length} claims, flag-only)`,
      );
    } else {
      // M1 fix: strip verifiability when claimAnnotationMode is "off"
      for (const claim of keptClaims) {
        delete claim.verifiability;
      }
    }

    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return {
      stats: {
        totalClaims: claims.length,
        passedOpinion,
        passedSpecificity,
        passedFidelity,
        filteredCount,
        overallPass: keptClaims.length > 0,
      },
      filteredClaims: keptClaims,
      // D2: Store pre-filter claims and Gate 1 reasoning for auditability
      preFilterClaims: [...claims],
      gate1Reasoning: validated.validatedClaims.map((v) => ({
        claimId: v.claimId,
        passedOpinion: v.passedOpinion,
        passedSpecificity: v.passedSpecificity,
        passedFidelity: v.passedFidelity,
        reasoning: v.reasoning,
      })),
      rescuedThesisDirect,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    console.warn("[Stage1] Gate 1 validation failed:", err);
    return {
      stats: {
        totalClaims: claims.length,
        passedOpinion: claims.length,
        passedSpecificity: claims.length,
        passedFidelity: claims.length,
        filteredCount: 0,
        overallPass: true,
      },
      filteredClaims: claims,
    };
  }
}
