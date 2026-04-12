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
  SourceType,
} from "./types";

import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
} from "./llm";
import { loadAndRenderSection } from "./prompt-loader";
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

// Pass2AtomicClaimSchema: All non-essential fields use .catch(default) to prevent
// "No object generated" errors from the AI SDK when the LLM outputs wrong enum casing,
// missing fields, or type mismatches. The .catch() provides sensible defaults while
// the JSON schema sent to the LLM still shows correct enum values.
// See: Docs/WIP/LLM_Expert_Review_Schema_Validation.md
const Pass2AtomicClaimSchema = z.object({
  id: z.string().catch(""),
  statement: z.string().catch(""),
  category: z.enum(["factual", "evaluative", "procedural"]).catch("factual"),
  verifiability: z.enum(["high", "medium", "low", "none"]).optional().catch(undefined),
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
    expectedSourceTypes: z.array(z.string()).catch([]),
  }).catch({ methodologies: [], expectedMetrics: [], expectedSourceTypes: [] }),
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
  // Preliminary search: search web for rough claims, fetch sources, extract evidence
  // ------------------------------------------------------------------
  state.onEvent?.("Extracting claims: preliminary web search...", 15);
  const preliminaryEvidence = await runPreliminarySearch(
    pass1.roughClaims,
    searchConfig,
    pipelineConfig,
    currentDate,
    state,
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
  );
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Claim Contract Validation — detect proxy drift before Gate 1
  // Runs after every Pass 2, triggers a single retry if material drift
  // or if validation returns no usable structured result.
  // ------------------------------------------------------------------
  let activePass2 = pass2;
  const contractValidationEnabled = calcConfig.claimContractValidation?.enabled ?? true;
  const contractMaxRetries = calcConfig.claimContractValidation?.maxRetries ?? 1;
  // Observability: capture contract validation outcome for stored result
  let contractValidationSummary: ContractValidationSummary | undefined;
  let lastContractValidatedClaims: AtomicClaim[] | undefined;

  if (contractValidationEnabled) {
    state.onEvent?.("Validating claim contract fidelity...", 24);
    state.onEvent?.(`LLM call: claim contract validation — ${getModelForTask("context_refinement", undefined, pipelineConfig).modelName}`, -1);

    const contractResult = await validateClaimContract(
      pass2.atomicClaims as unknown as AtomicClaim[],
      state.originalInput,
      pass2.impliedClaim ?? "",
      pass2.articleThesis ?? "",
      pass2.inputClassification ?? "single_atomic_claim",
      pipelineConfig,
    );
    state.llmCalls++;

    // Capture observability summary
    let anchorRetryReason: string | undefined;
    if (contractResult) {
      const evaluatedContract = evaluateClaimContractValidation(
        contractResult,
        pass2.atomicClaims as unknown as AtomicClaim[],
      );
      lastContractValidatedClaims = pass2.atomicClaims as unknown as AtomicClaim[];
      anchorRetryReason = evaluatedContract.anchorRetryReason;
      contractValidationSummary = evaluatedContract.summary;

      // Override the contract result's flag for the retry decision below
      if (evaluatedContract.effectiveRePromptRequired) {
        contractResult.inputAssessment.rePromptRequired = true;
        if (anchorRetryReason) {
          console.info(`[Stage1] Claim contract validation override: forcing retry — ${anchorRetryReason}`);
        }
      }
    } else {
      // Fix 3 extended (2026-04-10): do NOT stamp preservesContract=true on a
      // path that explicitly could not verify success. Prior behavior was a
      // silent fail-open that, when the retry also failed to revalidate,
      // produced an unverified "lottery win" report. Mark as degraded and
      // let the retry path recover if it can; if the retry also fails to
      // revalidate, this summary carries forward and the Wave 1A safeguard
      // terminates the run.
      lastContractValidatedClaims = pass2.atomicClaims as unknown as AtomicClaim[];
      contractValidationSummary = {
        ran: true,
        preservesContract: false,
        rePromptRequired: false,
        summary: "revalidation_unavailable: initial contract validation LLM call returned no usable result",
      };
    }

    const shouldRetryAfterValidation =
      contractMaxRetries > 0 && (
        (contractResult?.inputAssessment.rePromptRequired ?? false)
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

      // Track 1 (Rev B): align validator-unavailable fallback guidance with the
      // fusion-first wording used on the normal anchor-retry path. The previous
      // fallback wording was weaker than contractGuidance below and produced
      // inconsistent retry behavior on the validator-unavailable branch.
      const fallbackGuidance = !contractResult
        ? `CLAIM CONTRACT CORRECTION: The contract-validation step did not return a usable structured result. Re-extract conservatively from the input only. ` +
          `Preserve the original evaluative meaning and use only neutral dimension qualifiers. ` +
          `The primary direct claim must fuse any truth-condition-bearing modifier with the action it modifies; do not externalize the modifier into a supporting sub-claim if it is thesis-defining. ` +
          `Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate. ` +
          `For factual or procedural claims, preserve the original action/state threshold as well: do not rewrite a decisive act or decision as a discussion, consultation, review, recommendation, or other lower-threshold step, and do not upgrade a preparatory step into a final one. ` +
          `If a shared predicate or modifier applies across multiple actors in one sentence, preserve that same predicate/modifier in the actor-specific decomposition.`
        : "";

      const contractGuidance = contractResult
        ? `CLAIM CONTRACT CORRECTION: The previous extraction drifted from the original claim contract. ` +
          `${contractResult.inputAssessment.summary}. ` +
          `Specific issues: ${failingReasons}.${anchorGuidance} ` +
          `Preserve the original evaluative meaning and use only neutral dimension qualifiers. ` +
          `The primary direct claim must fuse any truth-condition-bearing modifier with the action it modifies; do not externalize the modifier into a supporting sub-claim if it is thesis-defining. ` +
          `Do NOT substitute proxy predicates (feasibility, contribution, efficiency) for the user's original predicate. ` +
          `For factual or procedural claims, preserve the original action/state threshold as well: do not rewrite a decisive act or decision as a discussion, consultation, review, recommendation, or other lower-threshold step, and do not upgrade a preparatory step into a final one. ` +
          `If a shared predicate or modifier applies across multiple actors in one sentence, preserve that same predicate/modifier in the actor-specific decomposition.`
        : fallbackGuidance;

      console.info(
        contractResult
          ? `[Stage1] Claim contract validation detected material drift (${failingClaims.length} claim(s)). Retrying Pass 2 with corrective guidance.`
          : `[Stage1] Claim contract validation returned no usable result. Retrying Pass 2 with conservative contract guidance.`
      );

      try {
        state.onEvent?.("Retrying Pass 2 with claim contract guidance...", 24);
        const retryPass2 = await runPass2(
          state.originalInput,
          preliminaryEvidence,
          pipelineConfig,
          currentDate,
          state,
          contractGuidance,
          pass1.inferredGeography,
          pass1.detectedLanguage,
        );
        state.llmCalls++;

        console.info(
          `[Stage1] Claim contract retry produced ${retryPass2.atomicClaims.length} claim(s).`
        );

        let retryContractResult: ClaimContractValidationResult | undefined;
        try {
          retryContractResult = await validateClaimContract(
            retryPass2.atomicClaims as unknown as AtomicClaim[],
            state.originalInput,
            retryPass2.impliedClaim ?? "",
            retryPass2.articleThesis ?? "",
            retryPass2.inputClassification ?? "single_atomic_claim",
            pipelineConfig,
          );
          state.llmCalls++;
        } catch {
          // Re-validation failure is non-fatal — keep original Pass 2 output.
        }

        const evaluatedRetryContract = retryContractResult
          ? evaluateClaimContractValidation(
            retryContractResult,
            retryPass2.atomicClaims as unknown as AtomicClaim[],
          )
          : undefined;

        if (evaluatedRetryContract && !evaluatedRetryContract.effectiveRePromptRequired) {
          activePass2 = retryPass2;
          lastContractValidatedClaims = retryPass2.atomicClaims as unknown as AtomicClaim[];
          contractValidationSummary = evaluatedRetryContract.summary;
          console.info("[Stage1] Claim contract retry validated cleanly; using retry Pass 2.");
        } else if (!retryContractResult && !contractResult) {
          // Both initial and retry contract validation calls returned no
          // usable result. Use the conservative retry output as the active
          // claim set, but the contractValidationSummary from the initial
          // call (set to revalidation_unavailable / preservesContract=false
          // above) is NOT overwritten here. It carries forward and the
          // Wave 1A safeguard terminates the run as damaged.
          activePass2 = retryPass2;
          lastContractValidatedClaims = retryPass2.atomicClaims as unknown as AtomicClaim[];
          console.warn("[Stage1] Claim contract retry could not be re-validated either; using conservative retry output but contract state remains degraded.");
        } else {
          console.info("[Stage1] Claim contract retry did not validate cleanly; keeping original Pass 2.");
        }
      } catch (retryErr) {
        // Retry failure is non-fatal — keep original Pass 2 output
        console.warn("[Stage1] Claim contract retry failed (non-fatal):", retryErr);
      }
    } else if (contractResult) {
      console.info(
        `[Stage1] Claim contract validation passed: ${contractResult.inputAssessment.summary}`
      );
    }
    // If contractResult is undefined AND the retry did not replace it, the
    // contractValidationSummary was marked revalidation_unavailable /
    // preservesContract=false above (see Fix 3 extended at line 294). That
    // state carries forward and the Wave 1A safeguard in
    // claimboundary-pipeline.ts terminates the run as damaged. No silent
    // fail-open path remains here.
  }

  // ------------------------------------------------------------------
  // Centrality filter — effective max is f(input length)
  // ------------------------------------------------------------------
  const centralityThreshold = pipelineConfig.centralityThreshold ?? "medium";
  const maxCap = pipelineConfig.maxAtomicClaims ?? 5;
  const base = pipelineConfig.maxAtomicClaimsBase ?? 3;
  const charsPerClaim = pipelineConfig.atomicClaimsInputCharsPerClaim ?? 500;
  const effectiveMax = Math.min(
    maxCap,
    base + Math.floor(state.originalInput.length / charsPerClaim),
  );

  const filteredClaims = filterByCentrality(
    activePass2.atomicClaims as unknown as AtomicClaim[],
    centralityThreshold,
    effectiveMax,
  );

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
  state.onEvent?.("Extracting claims: Gate 1 validation...", 26);
  state.onEvent?.(`LLM call: Gate 1 validation — ${getModelForTask("understand", undefined, pipelineConfig).modelName}`, -1);
  let gate1Result = await runGate1Validation(
    filteredClaims,
    pipelineConfig,
    currentDate,
    state.originalInput,
  );
  state.llmCalls++;
  let bestPass2 = activePass2;

  // ------------------------------------------------------------------
  // D1 Commit 2: Reprompt loop — retry Pass 2 if post-Gate-1 claim count
  // is below the UCM-configured minimum. Uses fresh LLM calls with a brief
  // guidance note (no prior claim list — avoids anchoring the LLM).
  // ------------------------------------------------------------------
  const minCoreClaims = calcConfig.claimDecomposition?.minCoreClaimsPerContext ?? 2;
  const maxRepromptAttempts = calcConfig.claimDecomposition?.supplementalRepromptMaxAttempts ?? 2;

  if (gate1Result.filteredClaims.length < minCoreClaims && maxRepromptAttempts > 0) {
    console.info(
      `[Stage1] Post-Gate-1 claim count (${gate1Result.filteredClaims.length}) < minimum (${minCoreClaims}). ` +
      `Starting reprompt loop (max ${maxRepromptAttempts} attempts).`
    );

    // Track best result across attempts (initial + retries)
    let bestPostGate1Count = gate1Result.filteredClaims.length;
    let bestGate1Result = gate1Result;
    let bestAttemptPass2 = activePass2;

    for (let attempt = 1; attempt <= maxRepromptAttempts; attempt++) {
      state.onEvent?.(`Extracting claims: reprompt attempt ${attempt}/${maxRepromptAttempts}...`, 24);

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
  // prior reprompts), trigger one targeted reprompt. This is structural
  // plumbing (count check + conditional retry), not text interpretation.
  // ------------------------------------------------------------------
  const distinctEventCount = (bestPass2.distinctEvents ?? []).length;
  if (
    distinctEventCount >= 2 &&
    gate1Result.filteredClaims.length === 1 &&
    maxRepromptAttempts > 0
  ) {
    console.info(
      `[Stage1] MT-5(C): ${distinctEventCount} distinct events detected but only 1 claim post-Gate-1. ` +
      `Triggering multi-event reprompt.`
    );
    state.onEvent?.("Extracting claims: multi-event reprompt...", 25);

    const multiEventGuidance =
      `DECOMPOSITION GUIDANCE: The input references ${distinctEventCount} distinct events or proceedings. ` +
      `Prior extraction collapsed these into a single claim. ` +
      `Extract one atomic claim per distinct event or proceeding mentioned in the input. ` +
      `Each claim should be independently verifiable with distinct evidence.`;

    try {
      const retryPass2 = await runPass2(
        state.originalInput,
        preliminaryEvidence,
        pipelineConfig,
        currentDate,
        state,
        multiEventGuidance,
        pass1.inferredGeography,
        pass1.detectedLanguage,
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

      // Accept if we got more claims than before
      if (retryCount > gate1Result.filteredClaims.length) {
        gate1Result = retryGate1;
        bestPass2 = retryPass2;
        console.info(`[Stage1] MT-5(C) recovered: ${retryCount} claims.`);
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
        summary: "No claims remained after Gate 1; the final accepted claim set cannot preserve the original claim contract.",
      };
      console.info("[Stage1] Final accepted claims are empty after Gate 1; contract summary refreshed to reflect the final claim set.");
    } else {
      state.onEvent?.("Refreshing claim contract summary for final accepted claims...", 26);
      state.onEvent?.(`LLM call: claim contract validation — ${getModelForTask("context_refinement", undefined, pipelineConfig).modelName}`, -1);

      const finalContractResult = await validateClaimContract(
        finalAcceptedClaims,
        state.originalInput,
        bestPass2.impliedClaim ?? "",
        bestPass2.articleThesis ?? "",
        bestPass2.inputClassification ?? "single_atomic_claim",
        pipelineConfig,
      );
      state.llmCalls++;

      if (finalContractResult) {
        const evaluatedFinalContract = evaluateClaimContractValidation(
          finalContractResult,
          finalAcceptedClaims,
        );
        contractValidationSummary = evaluatedFinalContract.summary;
        console.info("[Stage1] Refreshed contract summary for final accepted claims after Gate 1 / reprompt selection.");
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
          summary: "revalidation_unavailable: final accepted claim set changed after Gate 1, but the contract re-validation LLM call returned no usable result. State is unknown and treated as degraded.",
        };
        console.warn("[Stage1] Final accepted claims could not be re-validated; marked as degraded (no silent fail-open).");
      }
    }
  }

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

            // Fetch sources in parallel (was serial per-source)
            const sourcesToFetch = response.results.slice(0, 3);
            const fetchErrorByType: Record<string, number> = {};
            const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
            let fetchFailed = 0;

            const fetchResults = await Promise.all(
              sourcesToFetch.map(async (searchResult) => {
                try {
                  const content = await extractTextFromUrl(searchResult.url, {
                    timeoutMs: fetchTimeoutMs,
                    maxLength: pipelineConfig?.sourceExtractionMaxLength ?? 15000,
                  });
                  if (content.text.length > 100) {
                    return {
                      ok: true as const,
                      url: searchResult.url,
                      title: content.title || searchResult.title,
                      text: content.text,
                      contentType: content.contentType,
                    };
                  }
                  return { ok: false as const, url: searchResult.url };
                } catch (error: unknown) {
                  const classified = classifySourceFetchFailure(error);
                  fetchFailed++;
                  fetchErrorByType[classified.type] = (fetchErrorByType[classified.type] ?? 0) + 1;
                  if (fetchErrorSamples.length < 5) {
                    fetchErrorSamples.push({
                      url: searchResult.url,
                      type: classified.type,
                      status: classified.status,
                      message: classified.message.slice(0, 240),
                    });
                  }
                  return { ok: false as const, url: searchResult.url };
                }
              }),
            );

            const fetchedSources: Array<{ url: string; title: string; text: string }> = [];
            for (const result of fetchResults) {
              if (!result.ok || !("text" in result)) continue;
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
        if (!Array.isArray(profile.expectedSourceTypes)) profile.expectedSourceTypes = [];
      }

      return normalized;
    });
  }

  return raw;
}

/**
 * Pass 2: Evidence-grounded claim extraction using Sonnet.
 * Uses preliminary evidence to produce specific, research-ready atomic claims.
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

  // Rec-A: Pass 2 is extraction/understanding, not verdict reasoning.
  // Using "extract_evidence" routes to Haiku (budget) and makes UCM modelExtractEvidence
  // effective for this step. Was "verdict" (Sonnet) which bypassed modelUnderstand.
  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);

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
        ? renderedWithoutEvidence.content
        : renderedWithEvidence.content;

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
                    ? renderedWithoutEvidence.content
                    : renderedWithEvidence.content,
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
export function filterByCentrality(
  claims: AtomicClaim[],
  threshold: "high" | "medium",
  maxClaims: number,
): AtomicClaim[] {
  // Filter by centrality threshold
  const allowed = threshold === "high" ? ["high"] : ["high", "medium"];
  const filtered = claims.filter((c) => allowed.includes(c.centrality));

  // Sort: high centrality first, then medium
  filtered.sort((a, b) => {
    if (a.centrality === "high" && b.centrality !== "high") return -1;
    if (a.centrality !== "high" && b.centrality === "high") return 1;
    return 0;
  });

  // Cap at max
  return filtered.slice(0, maxClaims);
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

export interface ClaimContractValidationResult {
  inputAssessment: z.infer<typeof ClaimContractInputAssessmentSchema>;
  claims: Array<z.infer<typeof ClaimContractClaimSchema>>;
  truthConditionAnchor?: z.infer<typeof ClaimContractTruthConditionAnchorSchema>;
  antiInferenceCheck?: z.infer<typeof ClaimContractAntiInferenceSchema>;
}

type ContractValidationSummary = NonNullable<CBClaimUnderstanding["contractValidationSummary"]>;

export interface EvaluatedClaimContractValidation {
  summary: ContractValidationSummary;
  effectiveRePromptRequired: boolean;
  anchorRetryReason?: string;
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
    validPreservedIds = (anchor.preservedInClaimIds ?? [])
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

    // Override the LLM's judgment when its citations are structurally
    // invalid (no valid thesis-direct IDs) OR when the LLM contradicts
    // itself between preservedInClaimIds and its per-claim assessment.
    const noValidIds = validPreservedIds.length === 0;
    const selfContradicted = contradictedPreservedIds.length > 0;
    if (noValidIds || selfContradicted) {
      anchorOverrideRetry = true;
      const reasons: string[] = [];
      if (noValidIds) {
        const citedRaw = anchor.preservedInClaimIds ?? [];
        const existingCited = citedRaw.filter((id) => claimIds.has(id));
        const tangentialCited = existingCited.filter((id) => !directClaimIds.has(id));
        if (existingCited.length > 0 && tangentialCited.length === existingCited.length) {
          reasons.push(`all cited preservedInClaimIds [${tangentialCited.join(",")}] are tangential/contextual; thesis-direct claim required`);
        } else {
          reasons.push("no valid cited claim IDs after structural check (existence + thesis-direct)");
        }
      }
      if (selfContradicted) reasons.push(`LLM self-contradiction on claim(s) [${contradictedPreservedIds.join(",")}] — listed as anchor-preserving but flagged as drifted in per-claim assessment`);
      anchorRetryReason = `anchor_provenance_failed: "${anchor.anchorText}" — ${reasons.join("; ")}. LLM cited preservedInClaimIds=[${(anchor.preservedInClaimIds ?? []).join(",")}], valid IDs=[${validPreservedIds.join(",")}]`;
    }
  }

  const antiInf = contractResult.antiInferenceCheck;
  if (antiInf?.normativeClaimInjected && (antiInf.injectedClaimIds ?? []).length > 0) {
    anchorOverrideRetry = true;
    anchorRetryReason = (anchorRetryReason ? `${anchorRetryReason}; ` : "") +
      `normative_injection: claims [${antiInf.injectedClaimIds.join(",")}] added normative/legal assertion not in input`;
  }

  const effectiveRePromptRequired = contractResult.inputAssessment.rePromptRequired || anchorOverrideRetry;

  return {
    summary: {
      ran: true,
      preservesContract: contractResult.inputAssessment.preservesOriginalClaimContract && !anchorOverrideRetry,
      rePromptRequired: effectiveRePromptRequired,
      summary: contractResult.inputAssessment.summary ?? "",
      ...(anchorRetryReason ? { anchorRetryReason } : {}),
      ...(anchor ? {
        truthConditionAnchor: {
          presentInInput: anchor.presentInInput,
          anchorText: anchor.anchorText,
          preservedInClaimIds: anchor.preservedInClaimIds ?? [],
          validPreservedIds,
        },
      } : {}),
    },
    effectiveRePromptRequired,
    ...(anchorRetryReason ? { anchorRetryReason } : {}),
  };
}

function areClaimSetsEquivalent(left: AtomicClaim[] | undefined, right: AtomicClaim[]): boolean {
  if (!left) return false;
  if (left.length !== right.length) return false;

  return left.every((claim, index) => {
    const rightClaim = right[index];
    return rightClaim && claim.id === rightClaim.id && claim.statement === rightClaim.statement;
  });
}

/**
 * Validate extracted claims against the original input's claim contract.
 * Uses an LLM call to detect proxy drift where claims substitute a narrower
 * predicate for the user's original evaluative meaning.
 *
 * Returns undefined on any failure — the caller treats undefined as fail-open (accept claims).
 */
async function validateClaimContract(
  claims: AtomicClaim[],
  originalInput: string,
  impliedClaim: string,
  articleThesis: string,
  inputClassification: string,
  pipelineConfig: PipelineConfig,
): Promise<ClaimContractValidationResult | undefined> {
  if (claims.length === 0) return undefined;

  const model = getModelForTask("context_refinement", undefined, pipelineConfig);
  const expectedClaimIds = new Set(claims.map((c) => c.id));
  const llmCallStartedAt = Date.now();

  try {
    const rendered = await loadAndRenderSection("claimboundary", "CLAIM_CONTRACT_VALIDATION", {
      analysisInput: originalInput,
      inputClassification,
      impliedClaim,
      articleThesis,
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
): Promise<{ stats: CBClaimUnderstanding["gate1Stats"]; filteredClaims: AtomicClaim[]; preFilterClaims?: AtomicClaim[]; gate1Reasoning?: Array<{ claimId: string; passedOpinion: boolean; passedSpecificity: boolean; passedFidelity: boolean; reasoning: string }>; rescuedThesisDirect?: string[] }> {
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

    // Filter claims: remove those that fail fidelity, fail both opinion+specificity,
    // or are below specificity threshold when grounded.
    let fidelityFiltered = 0;
    let bothFiltered = 0;
    let specificityFiltered = 0;
    const rescuedThesisDirect: string[] = [];
    const keptClaims = claims.filter((claim) => {
      // Remove if claim is not faithful to original input meaning
      // BUT exempt dimension-decomposed claims — they are inherent interpretations
      // of the input's semantic range, not evidence imports (D1 Option B)
      if (failedFidelityIds.has(claim.id) && !claim.isDimensionDecomposition) {
        fidelityFiltered++;
        return false;
      }
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
    // If filtering would leave 0, keep the highest-centrality claim that
    // passed fidelity (or the first claim if none passed fidelity).
    if (keptClaims.length === 0 && claims.length > 0) {
      const fidelityPassIds = new Set(
        validated.validatedClaims.filter((v) => v.passedFidelity).map((v) => v.claimId),
      );
      const centralityOrder = ["high", "medium", "low"];
      const rescued = [...claims]
        .sort((a, b) => {
          // Prefer fidelity-passing claims
          const aFid = fidelityPassIds.has(a.id) ? 0 : 1;
          const bFid = fidelityPassIds.has(b.id) ? 0 : 1;
          if (aFid !== bFid) return aFid - bFid;
          // Then by centrality
          return centralityOrder.indexOf(a.centrality ?? "low") - centralityOrder.indexOf(b.centrality ?? "low");
        })[0];
      keptClaims.push(rescued);
      console.warn(
        `[Stage1] Gate 1: all ${claims.length} claims would be filtered — rescued "${rescued.id}" (centrality: ${rescued.centrality}) to prevent empty pipeline.`,
      );
    }

    const filteredCount = claims.length - keptClaims.length;
    if (filteredCount > 0) {
      console.info(
        `[Stage1] Gate 1: filtered ${filteredCount} of ${claims.length} claims (${fidelityFiltered} fidelity failures, ${bothFiltered} failed both checks, ${specificityFiltered} below specificity minimum ${specificityMin}; ungrounded claims exempt from specificity filter).`,
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
