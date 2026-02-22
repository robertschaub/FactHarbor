/**
 * ClaimAssessmentBoundary Pipeline — Main Entry Point
 *
 * Replaces the orchestrated pipeline with an evidence-emergent boundary model.
 * Claims drive research, evidence scopes determine boundaries, verdicts use
 * a 5-step LLM debate pattern.
 *
 * Pipeline stages:
 *   Stage 1: EXTRACT CLAIMS — Two-pass evidence-grounded claim extraction
 *   Stage 2: RESEARCH — Claim-driven evidence gathering with mandatory EvidenceScope
 *   Stage 3: CLUSTER BOUNDARIES — Group evidence into ClaimBoundaries by scope congruence
 *   Stage 4: VERDICT — 5-step LLM debate pattern (advocate, consistency, challenge, reconcile, validate)
 *   Stage 5: AGGREGATE — Weighted aggregation with triangulation and narrative
 *
 * @module analyzer/claimboundary-pipeline
 * @since ClaimAssessmentBoundary pipeline v1
 * @see Docs/WIP/ClaimAssessmentBoundary_Pipeline_Architecture_2026-02-15.md
 */

import type {
  AnalysisWarning,
  AtomicClaim,
  ArticleVerdict7Point,
  CBClaimUnderstanding,
  CBClaimVerdict,
  CBResearchState,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  EvidenceScope,
  ExplanationQualityCheck,
  ExplanationRubricScores,
  ExplanationStructuralFindings,
  FetchedSource,
  Gate4Stats,
  OverallAssessment,
  QualityGates,
  Gate1Stats,
  AnalysisInput,
  SourceType,
  TriangulationScore,
  VerdictNarrative,
} from "./types";

// Shared modules — reused from existing codebase (no orchestrated.ts imports)
import { filterByProbativeValue } from "./evidence-filter";
import { prefetchSourceReliability, getTrackRecordScore } from "./source-reliability";
import { percentageToArticleVerdict } from "./truth-scale";

// Verdict stage module (§8.4 — 5-step debate pattern)
import {
  runVerdictStage,
  type LLMCallFn,
  type VerdictStageConfig,
  DEFAULT_VERDICT_STAGE_CONFIG,
} from "./verdict-stage";

// LLM call infrastructure
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

// Config loading
import { loadPipelineConfig, loadSearchConfig, loadCalcConfig } from "@/lib/config-loader";
import { DEBATE_PROFILES } from "@/lib/config-schemas";
import type { PipelineConfig, SearchConfig, CalcConfig, DebateProfile, LLMProviderType } from "@/lib/config-schemas";

// Metrics integration
import {
  initializeMetrics,
  startPhase,
  endPhase,
  recordLLMCall,
  recordGate1Stats,
  recordGate4Stats,
  recordOutputQuality,
  finalizeMetrics,
} from "./metrics-integration";

// Search and retrieval
import { searchWebWithProvider, type SearchProviderErrorInfo } from "@/lib/web-search";
import { extractTextFromUrl } from "@/lib/retrieval";
import { recordFailure as recordSearchFailure } from "@/lib/search-circuit-breaker";

// Job cancellation detection
import { isJobAborted, clearAbortSignal } from "@/lib/job-abort";

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Checks if a job has been aborted via the abort-job endpoint.
 * Throws an error if the job was cancelled.
 * @param jobId - The job ID to check
 * @throws {Error} If the job has been aborted
 */
function checkAbortSignal(jobId: string | undefined): void {
  if (jobId && isJobAborted(jobId)) {
    throw new Error(`Job ${jobId} was cancelled`);
  }
}

/**
 * Run the ClaimAssessmentBoundary analysis pipeline.
 *
 * This is the main entry point that orchestrates all 5 stages sequentially.
 * Each stage is an independently testable function.
 *
 * @param input - The analysis input (text or URL, with optional event callback)
 * @returns The result object with resultJson and reportMarkdown
 */
export async function runClaimBoundaryAnalysis(
  input: AnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  const onEvent = input.onEvent ?? (() => {});

  // Initialize metrics collection for this job
  if (input.jobId) {
    initializeMetrics(input.jobId, "claimboundary");
  }

  // Load configs once at start to capture provider metadata
  const [pipelineResult, searchResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
    loadCalcConfig("default"),
  ]);
  const initialPipelineConfig = pipelineResult.config;
  const initialSearchConfig = searchResult.config;
  const initialCalcConfig = calcResult.config;

  // Log config load status — warn on error fallbacks so admins know UCM config was not applied
  for (const [name, result] of [
    ["pipeline", pipelineResult],
    ["search", searchResult],
    ["calc", calcResult],
  ] as const) {
    if (result.contentHash === "__ERROR_FALLBACK__") {
      console.warn(`[Pipeline] UCM ${name} config load failed — using hardcoded defaults. Admin-configured values were NOT applied.`);
    } else if (result.fromDefault) {
      console.log(`[Pipeline] UCM ${name} config: no stored config, using defaults.`);
    }
  }

  try {
    // Initialize research state
    const state: CBResearchState = {
      originalInput: input.inputValue,
      originalText: "",
      inputType: input.inputType,
      understanding: null,
      evidenceItems: [],
      sources: [],
      searchQueries: [],
      queryBudgetUsageByClaim: {},
      mainIterationsUsed: 0,
      contradictionIterationsReserved: initialPipelineConfig.contradictionReservedIterations ?? 1,
      contradictionIterationsUsed: 0,
      contradictionSourcesFound: 0,
      claimBoundaries: [],
      llmCalls: 0,
      onEvent: input.onEvent, // Thread progress callback through to research stage
      warnings: [],
    };

    // Stage 1: Extract Claims
    checkAbortSignal(input.jobId);
    onEvent("Extracting claims from input...", 10);
    startPhase("understand");
    const understanding = await extractClaims(state);
    state.understanding = understanding;
    endPhase("understand");

    // Record Gate 1 stats after claim extraction
    if (understanding.gate1Stats) {
      recordGate1Stats({
        totalClaims: understanding.gate1Stats.totalClaims,
        passedClaims: understanding.gate1Stats.totalClaims - understanding.gate1Stats.filteredCount,
        filteredReasons: {},
        centralClaimsKept: understanding.atomicClaims.length,
      });
    }

    // Stage 2: Research
    checkAbortSignal(input.jobId);
    onEvent("Researching evidence for claims...", 30);
    startPhase("research");
    await researchEvidence(state, input.jobId);
    endPhase("research");

    // Evidence pool balance check (C13 — detect directional skew before verdict)
    const skewThreshold = initialCalcConfig.evidenceBalanceSkewThreshold ?? 0.8;
    const minDirectional = initialCalcConfig.evidenceBalanceMinDirectional ?? 3;
    const evidenceBalance = assessEvidenceBalance(state.evidenceItems, skewThreshold, minDirectional);
    if (evidenceBalance.isSkewed) {
      const direction = evidenceBalance.balanceRatio > 0.5 ? "supporting" : "contradicting";
      const directional = evidenceBalance.supporting + evidenceBalance.contradicting;
      const majorityCount = direction === "supporting" ? evidenceBalance.supporting : evidenceBalance.contradicting;
      const majorityPct = Math.round(Math.max(evidenceBalance.balanceRatio, 1 - evidenceBalance.balanceRatio) * 100);
      state.warnings.push({
        type: "evidence_pool_imbalance",
        severity: "warning",
        message: `Evidence pool is heavily skewed toward ${direction} evidence (${majorityPct}%, ${majorityCount} of ${directional} directional items). ` +
          `${evidenceBalance.supporting} supporting, ${evidenceBalance.contradicting} contradicting, ${evidenceBalance.neutral} neutral out of ${evidenceBalance.total} total.`,
      });
      console.warn(
        `[Pipeline] Evidence pool imbalance detected: ${evidenceBalance.supporting}S/${evidenceBalance.contradicting}C/${evidenceBalance.neutral}N ` +
        `(${direction}: ${majorityPct}%, ${majorityCount}/${directional} directional, threshold: ${Math.round(skewThreshold * 100)}%)`
      );
    }

    // Stage 3: Cluster Boundaries
    checkAbortSignal(input.jobId);
    onEvent("Clustering evidence into boundaries...", 60);
    startPhase("summary");
    const boundaries = await clusterBoundaries(state);
    state.claimBoundaries = boundaries;
    endPhase("summary");

    // Build coverage matrix (between Stage 3 and 4, per §8.5.1)
    const coverageMatrix = buildCoverageMatrix(
      understanding.atomicClaims,
      boundaries,
      state.evidenceItems
    );

    // Build resolved verdict config early so diversity + credential checks use it
    const resolvedVerdictConfig = buildVerdictStageConfig(initialPipelineConfig, initialCalcConfig);

    // Check for degenerate debate configuration (C1/C16 — all debate roles same tier)
    const debateTierWarning = checkDebateTierDiversity(resolvedVerdictConfig);
    if (debateTierWarning) {
      state.warnings.push(debateTierWarning);
    }

    // Check for missing provider credentials on debate role overrides
    const providerFallbackWarnings = checkDebateProviderCredentials(resolvedVerdictConfig);
    for (const w of providerFallbackWarnings) {
      state.warnings.push(w);
    }

    // Stage 4: Verdict
    checkAbortSignal(input.jobId);
    onEvent("Generating verdicts...", 70);
    startPhase("verdict");
    const claimVerdicts = await generateVerdicts(
      understanding.atomicClaims,
      state.evidenceItems,
      boundaries,
      coverageMatrix,
      undefined, // llmCall — use production default
      state.warnings,
    );
    endPhase("verdict");

    // B-7: Strip misleadingness fields if annotation mode doesn't include them
    if (initialPipelineConfig.claimAnnotationMode !== "verifiability_and_misleadingness") {
      for (const v of claimVerdicts) {
        delete v.misleadingness;
        delete v.misleadingnessReason;
      }
    }

    // Record Gate 4 stats after verdicts
    recordGate4Stats(claimVerdicts);

    // Stage 5: Aggregate
    checkAbortSignal(input.jobId);
    onEvent("Aggregating final assessment...", 90);
    startPhase("report");
    const assessment = await aggregateAssessment(
      claimVerdicts,
      boundaries,
      state.evidenceItems,
      coverageMatrix,
      state
    );
    endPhase("report");

    // B-8: Explanation quality check (after aggregation, before result assembly)
    const explanationQualityMode = initialPipelineConfig.explanationQualityMode ?? "off";
    if (explanationQualityMode !== "off" && assessment.verdictNarrative) {
      const structuralFindings = checkExplanationStructure(assessment.verdictNarrative);
      const qualityCheck: ExplanationQualityCheck = {
        mode: explanationQualityMode === "rubric" ? "rubric" : "structural",
        structuralFindings,
      };
      if (explanationQualityMode === "rubric") {
        try {
          const llmCallFn = createProductionLLMCall(initialPipelineConfig, state.warnings);
          qualityCheck.rubricScores = await evaluateExplanationRubric(
            assessment.verdictNarrative,
            understanding.atomicClaims.length,
            state.evidenceItems.length,
            llmCallFn,
          );
        } catch (rubricError) {
          // M2 fix: rubric failure is non-fatal — degrade to structural-only
          console.warn("[Stage5] B-8 rubric evaluation failed, degrading to structural-only:", rubricError);
          state.warnings.push({
            type: "explanation_quality_rubric_failed",
            severity: "warning",
            message: `Explanation quality rubric evaluation failed: ${rubricError instanceof Error ? rubricError.message : String(rubricError)}. Structural checks still available.`,
          });
        }
      }
      assessment.explanationQualityCheck = qualityCheck;
      console.info(`[Stage5] B-8 explanation quality check (${explanationQualityMode}):`, JSON.stringify(qualityCheck));
    }

    onEvent("Analysis complete.", 100);

    // Collect unique search providers from searchQueries
    const searchProviders = [...new Set(
      state.searchQueries
        .map(sq => sq.searchProvider)
        .filter(Boolean)
    )].join(", ");

    // Get LLM model information for all task tiers
    const verdictModel = getModelForTask("verdict", undefined, initialPipelineConfig);
    const understandModel = getModelForTask("understand", undefined, initialPipelineConfig);
    const extractModel = getModelForTask("extract_evidence", undefined, initialPipelineConfig);

    // Wrap assessment in resultJson structure (no AnalysisContext references)
    const resultJson = {
      _schemaVersion: "3.0.0-cb", // ClaimAssessmentBoundary pipeline schema
      meta: {
        schemaVersion: "3.0.0-cb",
        generatedUtc: new Date().toISOString(),
        pipeline: "claimboundary",
        llmProvider: initialPipelineConfig.llmProvider ?? "anthropic",
        llmModel: verdictModel.modelName,
        modelsUsed: {
          understand: understandModel.modelName,
          extractEvidence: extractModel.modelName,
          verdict: verdictModel.modelName,
        },
        searchProvider: initialSearchConfig.provider,
        searchProviders: searchProviders || undefined, // Aggregate of actually-used providers
        inputType: input.inputType,
        detectedInputType: state.understanding?.detectedInputType ?? input.inputType,
        hasMultipleBoundaries: assessment.hasMultipleBoundaries,
        boundaryCount: boundaries.length,
        claimCount: understanding.atomicClaims.length,
        llmCalls: state.llmCalls,
        mainIterationsUsed: state.mainIterationsUsed,
        contradictionIterationsUsed: state.contradictionIterationsUsed,
        contradictionSourcesFound: state.contradictionSourcesFound,
        evidenceBalance: {
          supporting: evidenceBalance.supporting,
          contradicting: evidenceBalance.contradicting,
          neutral: evidenceBalance.neutral,
          total: evidenceBalance.total,
          balanceRatio: isNaN(evidenceBalance.balanceRatio) ? null : Math.round(evidenceBalance.balanceRatio * 100) / 100,
          isSkewed: evidenceBalance.isSkewed,
        },
      },
      // Core assessment data
      truthPercentage: assessment.truthPercentage,
      verdict: assessment.verdict,
      confidence: assessment.confidence,
      verdictNarrative: assessment.verdictNarrative,

      // ClaimAssessmentBoundary-specific data (replaces analysisContexts)
      claimBoundaries: assessment.claimBoundaries,
      claimVerdicts: assessment.claimVerdicts,
      coverageMatrix: assessment.coverageMatrix,

      // Supporting data
      understanding: state.understanding,
      evidenceItems: state.evidenceItems,
      sources: state.sources.map((s: FetchedSource) => ({
        id: s.id,
        url: s.url,
        title: s.title,
        trackRecordScore: s.trackRecordScore,
        category: s.category,
        fetchSuccess: s.fetchSuccess,
        searchQuery: s.searchQuery,
      })),
      searchQueries: state.searchQueries,

      // Quality gates
      qualityGates: assessment.qualityGates,

      // Analysis quality warnings (surfaced to UI via FallbackReport)
      analysisWarnings: state.warnings,
    };

    // Record output quality metrics
    recordOutputQuality(resultJson);

    // TODO: Generate markdown report (Phase 3 UI work)
    const reportMarkdown = "# ClaimAssessmentBoundary Analysis Report\n\n(Report generation not yet implemented)";

    return { resultJson, reportMarkdown };
  } finally {
    // Always finalize and persist metrics, even on failure
    await finalizeMetrics();

    // Clear abort signal to avoid memory leaks
    if (input.jobId) {
      clearAbortSignal(input.jobId);
    }
  }
}

// ============================================================================
// STAGE 1: EXTRACT CLAIMS (§8.1)
// ============================================================================

// --- Zod schemas for Stage 1 LLM output parsing ---

const Pass1OutputSchema = z.object({
  impliedClaim: z.string(),
  backgroundDetails: z.string(),
  roughClaims: z.array(z.object({
    statement: z.string(),
    searchHint: z.string(),
  })),
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
  keyEntities: z.array(z.string()).catch([]),
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
  sourceType: z.string().optional(),
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
  // Load pipeline + search configs from UCM
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;

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
  const pass2 = await runPass2(
    state.originalInput,
    preliminaryEvidence,
    pipelineConfig,
    currentDate,
    state,
  );
  state.llmCalls++;

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
    pass2.atomicClaims as unknown as AtomicClaim[],
    centralityThreshold,
    effectiveMax,
  );

  // ------------------------------------------------------------------
  // Gate 1: Claim validation (Haiku, batched) — actively filters claims
  // ------------------------------------------------------------------
  state.onEvent?.("Extracting claims: Gate 1 validation...", 26);
  const gate1Result = await runGate1Validation(
    filteredClaims,
    pipelineConfig,
    currentDate,
    state.originalInput,
  );
  state.llmCalls++;

  // ------------------------------------------------------------------
  // Assemble CBClaimUnderstanding
  // ------------------------------------------------------------------
  return {
    detectedInputType: detectInputType(state.originalInput),
    impliedClaim: pass2.impliedClaim,
    backgroundDetails: pass2.backgroundDetails,
    articleThesis: pass2.articleThesis,
    atomicClaims: gate1Result.filteredClaims,
    distinctEvents: pass2.distinctEvents ?? [],
    riskTier: pass2.riskTier ?? "B",
    preliminaryEvidence: preliminaryEvidence.map((pe) => ({
      sourceUrl: pe.sourceUrl,
      snippet: pe.statement,
      claimId: pe.relevantClaimIds?.[0] ?? "",
    })),
    gate1Stats: gate1Result.stats,
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
    temperature: 0.15,
    output: Output.object({ schema: Pass1OutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      pipelineConfig.llmProvider ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 1 Pass 1: LLM returned no structured output");
  }

  return Pass1OutputSchema.parse(parsed);
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
): Promise<PreliminaryEvidenceItem[]> {
  const queriesPerClaim = pipelineConfig.preliminarySearchQueriesPerClaim ?? 2;
  const maxSources = pipelineConfig.preliminaryMaxSources ?? 5;

  const allEvidence: PreliminaryEvidenceItem[] = [];

  // Limit to top 3 rough claims to control cost (§8.1: "impliedClaim and top 2-3 rough claims")
  const claimsToSearch = roughClaims.slice(0, 3);

  for (const claim of claimsToSearch) {
    // Generate search queries from claim + searchHint
    const queries = generateSearchQueries(claim, queriesPerClaim);

    for (const query of queries) {
      try {
        const response = await searchWebWithProvider({
          query,
          maxResults: maxSources,
          config: searchConfig,
        });

        // Track the search query
        state.searchQueries.push({
          query,
          iteration: 0,
          focus: "preliminary",
          resultsCount: response.results.length,
          timestamp: new Date().toISOString(),
          searchProvider: response.providersUsed.join(", "),
        });

        // Report search provider errors to warnings
        if (response.errors && response.errors.length > 0) {
          for (const provErr of response.errors) {
            upsertSearchProviderWarning(state, {
              provider: provErr.provider,
              status: provErr.status,
              message: provErr.message,
              query,
              stage: "preliminary_search",
            });
            state.onEvent?.(`Search provider "${provErr.provider}" error: ${provErr.message}`, 0);
          }
        }

        // Fetch and extract text from top results (limit to 3 per query)
        const sourcesToFetch = response.results.slice(0, 3);
        const fetchedSources: Array<{ url: string; title: string; text: string }> = [];
        const fetchErrorByType: Record<string, number> = {};
        const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
        let fetchFailed = 0;

        for (const searchResult of sourcesToFetch) {
          try {
            const content = await extractTextFromUrl(searchResult.url, {
              timeoutMs: 12000,
              maxLength: 15000,
            });
            if (content.text.length > 100) {
              fetchedSources.push({
                url: searchResult.url,
                title: content.title || searchResult.title,
                text: content.text.slice(0, 8000), // Cap to control prompt size
              });
            }
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
          }
        }

        if (fetchFailed > 0 && sourcesToFetch.length > 0) {
          const failureRatio = fetchFailed / sourcesToFetch.length;
          state.warnings.push({
            type: "source_fetch_failure",
            severity: failureRatio >= 0.5 ? "warning" : "info",
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

        if (fetchedSources.length === 0) continue;

        // Extract evidence from fetched sources using batched LLM call (Haiku)
        const evidence = await extractPreliminaryEvidence(
          claim.statement,
          fetchedSources,
          pipelineConfig,
          currentDate,
        );
        state.llmCalls++;

        allEvidence.push(...evidence);
      } catch (err: any) {
        // Search failures are non-fatal for Stage 1 preliminary search, but should be reported
        console.warn(`[Stage1] Preliminary search failed for query "${query}":`, err);

        // If this was a search provider error (not a general exception), report it
        // The SearchProviderError has provider name, but generic exceptions don't
        if (err?.name === "SearchProviderError" && err?.provider) {
          upsertSearchProviderWarning(state, {
            provider: err.provider,
            message: String(err.message ?? "search provider error"),
            query,
            stage: "preliminary_search",
          });
          state.onEvent?.(`Preliminary search error: ${err.provider} - ${err.message}`, 0);
        }
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

function upsertSearchProviderWarning(
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
    state.warnings.push({
      type: "search_provider_error",
      severity: "error",
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

  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        { role: "user", content: `Extract evidence from these ${sources.length} sources relating to: "${claimStatement}"` },
      ],
      temperature: 0.1,
      output: Output.object({ schema: ExtractEvidenceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        (pipelineConfig.llmProvider) ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return [];

    const validated = ExtractEvidenceOutputSchema.parse(parsed);

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
        relevantClaimIds: ei.relevantClaimIds,
      };
    });
  } catch (err) {
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
        "checkWorthiness", "groundingQuality",
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
  }) ?? renderedWithEvidence;

  const model = getModelForTask("verdict", undefined, pipelineConfig);

  // Retry logic with quality validation and Zod-aware feedback.
  // Schema uses .catch() defaults so AI SDK never throws NoObjectGeneratedError.
  // Quality gate below detects when .catch() masked a real LLM failure.
  // On total refusal (all fields empty — common with politically sensitive inputs),
  // retry uses fact-checking framing to address the model's content-policy caution.
  const maxRetries = 2;
  let lastError: Error | null = null;
  let retryGuidance: string | null = null;
  let wasTotalRefusal = false;
  let retryWithoutPreliminaryEvidence = false;

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
    try {
      // On retry, append guidance to user message (safe: same [system, user] message
      // structure that Output.object() + tool calling expects).
      const userContent = (attempt > 0 && retryGuidance)
        ? `${inputText}\n\n---\n${retryGuidance}`
        : inputText;
      const activeSystemPrompt = retryWithoutPreliminaryEvidence
        ? renderedWithoutEvidence.content
        : renderedWithEvidence.content;

      const result = await generateText({
        model: model.model,
        messages: [
          {
            role: "system" as const,
            content: activeSystemPrompt,
            providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
          },
          { role: "user" as const, content: userContent },
        ],
        temperature: 0.15 + (attempt * 0.05), // Slightly increase temperature on retry
        output: Output.object({ schema: Pass2OutputSchema }),
        providerOptions: getStructuredOutputProviderOptions(
          (pipelineConfig.llmProvider) ?? "anthropic",
        ),
      });

      // Log response metadata for soft-refusal detection
      const finishReason = (result as unknown as Record<string, unknown>).finishReason;
      if (finishReason === "content-filter" || finishReason === "other") {
        console.warn(`[Stage1 Pass2] Possible content-policy soft-refusal: finishReason=${finishReason}`);
      }

      const parsed = extractStructuredOutput(result);
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

      return validated;
    } catch (err) {
      lastError = err as Error;

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
              ? `${inputText}\n\n---\n${retryGuidance}`
              : inputText;
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
              temperature: 0.2,
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
                    severity: "warning",
                    message: `Stage 1 Pass 2 recovered via fallback model (${fallbackModel.modelName}) after primary model soft refusal. Claim extraction quality may be reduced; review claim-level outputs.`,
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

/**
 * Detect whether the input is a statement or a question.
 * Simple heuristic: ends with "?" → question, otherwise statement.
 * Exported for unit testing.
 */
export function detectInputType(input: string): "claim" | "article" {
  const trimmed = input.trim();
  // Short inputs (< 200 chars) are typically claims/questions
  // Long inputs (>= 200 chars) are typically articles
  if (trimmed.length < 200) return "claim";
  return "article";
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
): Promise<{ stats: CBClaimUnderstanding["gate1Stats"]; filteredClaims: AtomicClaim[] }> {
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

  try {
    const result = await generateText({
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
      temperature: 0.1,
      output: Output.object({ schema: Gate1OutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        (pipelineConfig.llmProvider) ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
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
    const keptClaims = claims.filter((claim) => {
      // Remove if claim is not faithful to original input meaning
      if (failedFidelityIds.has(claim.id)) {
        fidelityFiltered++;
        return false;
      }
      // Remove if LLM says both opinion and specificity fail
      if (failedBothIds.has(claim.id)) {
        bothFiltered++;
        return false;
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
    };
  } catch (err) {
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

// ============================================================================
// STAGE 2: RESEARCH (§8.2)
// ============================================================================

// --- Zod schemas for Stage 2 LLM output parsing ---

const GenerateQueriesOutputSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    rationale: z.string(),
    variantType: z.enum(["supporting", "refuting"]).optional(),
  })),
});

const RelevanceClassificationOutputSchema = z.object({
  relevantSources: z.array(z.object({
    url: z.string(),
    relevanceScore: z.number(),
    reasoning: z.string(),
  })),
});

// Full evidence extraction schema (Stage 2 uses same EXTRACT_EVIDENCE prompt as Stage 1)
const Stage2EvidenceItemSchema = z.object({
  statement: z.string(),
  sourceUrl: z.string().optional(), // URL of the source this evidence came from
  category: z.string(),
  claimDirection: z.enum(["supports", "contradicts", "contextual"]),
  evidenceScope: z.object({
    methodology: z.string().optional(),
    temporal: z.string().optional(),
    geographic: z.string().optional(),
    boundaries: z.string().optional(),
    additionalDimensions: z.record(z.string()).optional(),
  }),
  probativeValue: z.enum(["high", "medium", "low"]),
  sourceType: z.string().optional(),
  isDerivative: z.boolean().optional(),
  derivedFromSourceUrl: z.string().nullable().optional(),
  relevantClaimIds: z.array(z.string()),
});

const Stage2ExtractEvidenceOutputSchema = z.object({
  evidenceItems: z.array(Stage2EvidenceItemSchema),
});

/**
 * Stage 2: Gather evidence for each central claim using web search and LLM extraction.
 *
 * Claim-driven iteration: targets the claim with fewest evidence items.
 * Reserved contradiction iterations after main loop.
 * Each evidence item carries a mandatory EvidenceScope.
 *
 * @param state - The mutable research state (evidenceItems and sources populated)
 * @param jobId - Optional job ID for abort signal checking
 */
export async function researchEvidence(
  state: CBResearchState,
  jobId?: string
): Promise<void> {
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadSearchConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;

  // Log config load status for research stage
  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM pipeline config load failed in researchEvidence — using hardcoded defaults.`);
  }
  if (searchResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM search config load failed in researchEvidence — using hardcoded defaults.`);
  }

  const currentDate = new Date().toISOString().split("T")[0];

  const claims = state.understanding?.atomicClaims ?? [];
  if (claims.length === 0) return;

  // ------------------------------------------------------------------
  // Step 1: Seed evidence pool from Stage 1 preliminary search
  // ------------------------------------------------------------------
  seedEvidenceFromPreliminarySearch(state);

  // ------------------------------------------------------------------
  // Step 2: Claim-driven main iteration loop
  // ------------------------------------------------------------------
  const maxIterations = pipelineConfig.maxTotalIterations ?? 10;
  const reservedContradiction = pipelineConfig.contradictionReservedIterations ?? 2;
  const maxMainIterations = maxIterations - reservedContradiction;
  const sufficiencyThreshold = pipelineConfig.claimSufficiencyThreshold ?? 3;
  const maxSourcesPerIteration = searchConfig.maxSourcesPerIteration ?? 8;
  const timeBudgetMs = pipelineConfig.researchTimeBudgetMs ?? 10 * 60 * 1000;
  const zeroYieldBreakThreshold = pipelineConfig.researchZeroYieldBreakThreshold ?? 2;

  const researchStartMs = Date.now();
  let consecutiveZeroYield = 0;
  let budgetExhaustionWarned = false;

  for (let iteration = 0; iteration < maxMainIterations; iteration++) {
    // Abort signal check
    checkAbortSignal(jobId);

    // Time budget check
    const elapsedMs = Date.now() - researchStartMs;
    if (elapsedMs > timeBudgetMs) {
      state.onEvent?.(`Research time budget reached (${Math.round(elapsedMs / 60000)} min), proceeding to analysis...`, 55);
      state.warnings.push({
        type: "budget_exceeded",
        severity: "warning",
        message: `Research time budget reached after ${Math.round(elapsedMs / 60000)} minutes — analysis may have incomplete evidence.`,
        details: { elapsedMs, budgetMs: timeBudgetMs, iterationsCompleted: iteration },
      });
      break;
    }

    // Check if all claims are sufficient
    if (allClaimsSufficient(claims, state.evidenceItems, sufficiencyThreshold)) break;

    // Find claim with fewest evidence items that still has budget remaining.
    const budgetEligibleClaims = claims.filter(
      (claim) => getClaimQueryBudgetRemaining(state, claim.id, pipelineConfig) > 0,
    );
    if (budgetEligibleClaims.length === 0) {
      console.info("[Stage2] Shared per-claim query budgets exhausted for all claims; ending main research loop.");
      if (!budgetExhaustionWarned) {
        budgetExhaustionWarned = true;
        const perClaimBudget = getPerClaimQueryBudget(pipelineConfig);
        state.warnings.push({
          type: "query_budget_exhausted",
          severity: "warning",
          message: `Stage 2 stopped early: all claims exhausted shared per-claim query budget (${perClaimBudget}).`,
          details: {
            stage: "research_budget",
            perClaimQueryBudget: perClaimBudget,
            queryBudgetUsageByClaim: { ...state.queryBudgetUsageByClaim },
            mainIterationsUsed: state.mainIterationsUsed,
            contradictionIterationsUsed: state.contradictionIterationsUsed,
          },
        });
      }
      break;
    }
    const targetClaim = findLeastResearchedClaim(budgetEligibleClaims, state.evidenceItems);
    if (!targetClaim) break;

    // Emit progress update for this iteration (30% → 55%)
    if (state.onEvent) {
      const progress = 30 + Math.round((iteration / maxMainIterations) * 25);
      state.onEvent(`Researching evidence (iteration ${iteration + 1}/${maxMainIterations})...`, progress);
    }

    // Run one research iteration for the target claim
    const beforeCount = state.evidenceItems.length;
    await runResearchIteration(
      targetClaim,
      "main",
      searchConfig,
      pipelineConfig,
      maxSourcesPerIteration,
      currentDate,
      state,
    );

    state.mainIterationsUsed++;

    // Diminishing returns detection
    const newItems = state.evidenceItems.length - beforeCount;
    if (newItems === 0) {
      consecutiveZeroYield++;
      if (consecutiveZeroYield >= zeroYieldBreakThreshold) {
        state.onEvent?.(`No new evidence found in ${consecutiveZeroYield} consecutive iterations, proceeding...`, 55);
        break;
      }
    } else {
      consecutiveZeroYield = 0;
    }
  }

  // ------------------------------------------------------------------
  // Step 3: Contradiction search (reserved iterations)
  // ------------------------------------------------------------------
  for (let cIter = 0; cIter < reservedContradiction; cIter++) {
    // Abort signal check
    checkAbortSignal(jobId);

    // Time budget check (shared with main loop)
    const contradictionElapsedMs = Date.now() - researchStartMs;
    if (contradictionElapsedMs > timeBudgetMs) {
      state.onEvent?.(`Research time budget reached during contradiction search, proceeding...`, 58);
      break;
    }

    // Target: claim with fewest contradicting evidence items that still has budget remaining.
    const budgetEligibleClaims = claims.filter(
      (claim) => getClaimQueryBudgetRemaining(state, claim.id, pipelineConfig) > 0,
    );
    if (budgetEligibleClaims.length === 0) {
      console.info("[Stage2] Shared per-claim query budgets exhausted for all claims; skipping contradiction loop.");
      if (!budgetExhaustionWarned) {
        budgetExhaustionWarned = true;
        const perClaimBudget = getPerClaimQueryBudget(pipelineConfig);
        state.warnings.push({
          type: "query_budget_exhausted",
          severity: "warning",
          message: `Contradiction search skipped: all claims exhausted shared per-claim query budget (${perClaimBudget}).`,
          details: {
            stage: "research_budget",
            perClaimQueryBudget: perClaimBudget,
            queryBudgetUsageByClaim: { ...state.queryBudgetUsageByClaim },
            mainIterationsUsed: state.mainIterationsUsed,
            contradictionIterationsUsed: state.contradictionIterationsUsed,
          },
        });
      }
      break;
    }
    const targetClaim = findLeastContradictedClaim(budgetEligibleClaims, state.evidenceItems);
    if (!targetClaim) break;

    // Emit progress update for contradiction search (55% → 58%)
    if (state.onEvent) {
      const progress = 55 + Math.round((cIter / reservedContradiction) * 3);
      state.onEvent(`Searching for contradicting evidence (${cIter + 1}/${reservedContradiction})...`, progress);
    }

    await runResearchIteration(
      targetClaim,
      "contradiction",
      searchConfig,
      pipelineConfig,
      maxSourcesPerIteration,
      currentDate,
      state,
    );

    state.contradictionIterationsUsed++;
  }

  // ------------------------------------------------------------------
  // Step 4: Batch SR-Eval for all collected sources (deferred from per-iteration)
  // ------------------------------------------------------------------
  const allSourceUrls = state.sources.map((s) => s.url);
  if (allSourceUrls.length > 0) {
    state.onEvent?.("Evaluating source reliability...", 58);
    const srPrefetch = await prefetchSourceReliability(allSourceUrls);
    if (srPrefetch.errorCount > 0) {
      const severity: AnalysisWarning["severity"] =
        srPrefetch.errorCount >= Math.max(3, Math.ceil(srPrefetch.domains.length * 0.3))
          ? "error"
          : "warning";
      state.warnings.push({
        type: "source_reliability_error",
        severity,
        message:
          `Source reliability prefetch had ${srPrefetch.errorCount} error(s) across ` +
          `${srPrefetch.failedDomains.length} domain(s). Reliability scores for those domains default to unknown.`,
        details: {
          stage: "research_sr",
          errorCount: srPrefetch.errorCount,
          errorByType: srPrefetch.errorByType,
          failedDomains: srPrefetch.failedDomains.slice(0, 20),
          noConsensusCount: srPrefetch.noConsensusCount,
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // Step 5: Post-research quality warnings
  // ------------------------------------------------------------------
  const totalSearches = state.searchQueries.length;
  const totalSources = state.sources.length;
  const totalEvidence = state.evidenceItems.length;
  const uniqueSourceUrls = new Set(state.sources.map((s) => s.url)).size;

  if (totalSources === 0) {
    state.warnings.push({
      type: "no_successful_sources",
      severity: "error",
      message: "No sources were successfully fetched during research — verdict is based on zero evidence.",
      details: { searchQueries: totalSearches },
    });
    if (totalSearches >= 3) {
      state.warnings.push({
        type: "source_acquisition_collapse",
        severity: "error",
        message: `${totalSearches} search queries were executed but yielded zero usable sources — search providers may be unavailable.`,
        details: { searchQueries: totalSearches },
      });
    }
  } else {
    if (totalEvidence < 3) {
      state.warnings.push({
        type: "low_evidence_count",
        severity: "warning",
        message: `Only ${totalEvidence} evidence item(s) found from ${totalSources} source(s) — verdict reliability is reduced.`,
        details: { evidenceCount: totalEvidence, sourceCount: totalSources },
      });
    }
    if (uniqueSourceUrls < 2) {
      state.warnings.push({
        type: "low_source_count",
        severity: "warning",
        message: `Evidence comes from only ${uniqueSourceUrls} unique source(s) — limited triangulation possible.`,
        details: { uniqueSources: uniqueSourceUrls },
      });
    }
  }
}

// ============================================================================
// STAGE 2 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Seed the evidence pool from Stage 1 preliminary evidence.
 * Converts lightweight PreliminaryEvidenceItem to full EvidenceItem format.
 */
export function seedEvidenceFromPreliminarySearch(state: CBResearchState): void {
  const preliminary = state.understanding?.preliminaryEvidence ?? [];
  let idCounter = state.evidenceItems.length + 1;

  for (const pe of preliminary) {
    state.evidenceItems.push({
      id: `EV_${String(idCounter++).padStart(3, "0")}`,
      statement: pe.snippet,
      category: "evidence",
      specificity: "medium",
      sourceId: "",
      sourceUrl: pe.sourceUrl,
      sourceTitle: "",
      sourceExcerpt: pe.snippet,
      relevantClaimIds: pe.claimId ? [pe.claimId] : [],
      scopeQuality: "partial", // Preliminary evidence has limited scope data
    });
  }
}

/**
 * Find the claim with the fewest evidence items (for targeting).
 */
export function findLeastResearchedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minCount = Infinity;
  let target: AtomicClaim | null = null;

  for (const claim of claims) {
    const count = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id),
    ).length;
    if (count < minCount) {
      minCount = count;
      target = claim;
    }
  }

  return target;
}

/**
 * Find the claim with the fewest contradicting evidence items.
 */
export function findLeastContradictedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minCount = Infinity;
  let target: AtomicClaim | null = null;

  for (const claim of claims) {
    const contradictionCount = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id) && e.claimDirection === "contradicts",
    ).length;
    if (contradictionCount < minCount) {
      minCount = contradictionCount;
      target = claim;
    }
  }

  return target;
}

/**
 * Check if all claims have reached the sufficiency threshold.
 */
export function allClaimsSufficient(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  threshold: number,
): boolean {
  return claims.every((claim) => {
    const count = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id),
    ).length;
    return count >= threshold;
  });
}

/**
 * Resolve per-claim shared query budget from config (B-4).
 * This budget is shared across all query sources for a claim.
 */
export function getPerClaimQueryBudget(pipelineConfig: PipelineConfig): number {
  return pipelineConfig.perClaimQueryBudget ?? 8;
}

/**
 * Read consumed query budget for a claim.
 */
export function getClaimQueryBudgetUsed(
  state: CBResearchState,
  claimId: string,
): number {
  if (!state.queryBudgetUsageByClaim) {
    state.queryBudgetUsageByClaim = {};
  }
  return state.queryBudgetUsageByClaim[claimId] ?? 0;
}

/**
 * Remaining shared query budget for a claim.
 */
export function getClaimQueryBudgetRemaining(
  state: CBResearchState,
  claimId: string,
  pipelineConfig: PipelineConfig,
): number {
  return Math.max(0, getPerClaimQueryBudget(pipelineConfig) - getClaimQueryBudgetUsed(state, claimId));
}

/**
 * Consume query budget for a claim.
 * Returns false when consumption would exceed the configured budget.
 */
export function consumeClaimQueryBudget(
  state: CBResearchState,
  claimId: string,
  pipelineConfig: PipelineConfig,
  amount = 1,
): boolean {
  if (amount <= 0) return true;
  if (!state.queryBudgetUsageByClaim) {
    state.queryBudgetUsageByClaim = {};
  }
  const used = getClaimQueryBudgetUsed(state, claimId);
  const budget = getPerClaimQueryBudget(pipelineConfig);
  if (used + amount > budget) return false;
  state.queryBudgetUsageByClaim[claimId] = used + amount;
  return true;
}

/**
 * Run a single research iteration for a target claim.
 * Covers: query generation → web search → relevance check → source fetch →
 * reliability prefetch → evidence extraction → scope validation → derivative validation → filter
 */
export async function runResearchIteration(
  targetClaim: AtomicClaim,
  iterationType: "main" | "contradiction",
  searchConfig: SearchConfig,
  pipelineConfig: PipelineConfig,
  maxSourcesPerIteration: number,
  currentDate: string,
  state: CBResearchState,
): Promise<void> {
  const remainingBudget = getClaimQueryBudgetRemaining(state, targetClaim.id, pipelineConfig);
  if (remainingBudget <= 0) {
    console.info(`[Stage2] Query budget exhausted for claim "${targetClaim.id}"; skipping ${iterationType} iteration.`);
    return;
  }

  // 1. Generate search queries via LLM (Haiku)
  const queries = await generateResearchQueries(
    targetClaim,
    iterationType,
    state.evidenceItems,
    pipelineConfig,
    currentDate,
    remainingBudget,
  );
  state.llmCalls++;

  for (const queryObj of queries) {
    if (!consumeClaimQueryBudget(state, targetClaim.id, pipelineConfig, 1)) {
      console.info(`[Stage2] Query budget exhausted for claim "${targetClaim.id}" during ${iterationType} iteration.`);
      break;
    }

    try {
      // 2. Web search
      const response = await searchWebWithProvider({
        query: queryObj.query,
        maxResults: maxSourcesPerIteration,
        config: searchConfig,
      });

      state.searchQueries.push({
        query: queryObj.query,
        iteration: state.mainIterationsUsed + state.contradictionIterationsUsed,
        focus: iterationType,
        resultsCount: response.results.length,
        timestamp: new Date().toISOString(),
        searchProvider: response.providersUsed.join(", "),
      });

      // Capture search provider errors as warnings AND report to circuit breaker
      if (response.errors && response.errors.length > 0) {
        for (const provErr of response.errors) {
          // Record failure to per-provider circuit breaker for operator visibility
          if (provErr.provider) {
            recordSearchFailure(provErr.provider, provErr.message);
          }

          upsertSearchProviderWarning(state, {
            provider: provErr.provider,
            status: provErr.status,
            message: provErr.message,
            query: queryObj.query,
            stage: "research_search",
          });
          // Emit to live events log so the user sees the error during the run
          state.onEvent?.(`Search provider "${provErr.provider}" error: ${provErr.message}`, 0);
        }
      }

      if (response.results.length === 0) continue;

      // 3. Relevance classification via LLM (Haiku, batched)
      const relevantSources = await classifyRelevance(
        targetClaim,
        response.results,
        pipelineConfig,
        currentDate,
      );
      state.llmCalls++;

      if (relevantSources.length === 0) continue;

      // 4. Fetch top sources
      const fetchedSources = await fetchSources(
        relevantSources.slice(0, 5),
        queryObj.query,
        state,
      );

      if (fetchedSources.length === 0) continue;

      // 5. Reliability prefetch — DEFERRED to batch after research loop (perf fix)
      // SR data is only needed in Stage 4 (verdict) and Stage 5 (aggregation),
      // not during research iteration decisions. Deferring saves 15-25s per new domain.

      // 6. Evidence extraction with mandatory EvidenceScope (Haiku, batched)
      const rawEvidence = await extractResearchEvidence(
        targetClaim,
        fetchedSources,
        pipelineConfig,
        currentDate,
      );
      state.llmCalls++;

      // 7. EvidenceScope validation (deterministic)
      for (const item of rawEvidence) {
        item.scopeQuality = assessScopeQuality(item);
      }

      // 8. Derivative validation (§8.2 step 9)
      const allFetchedUrls = new Set(state.sources.map((s) => s.url));
      for (const item of rawEvidence) {
        if (item.isDerivative && item.derivedFromSourceUrl) {
          if (!allFetchedUrls.has(item.derivedFromSourceUrl)) {
            item.derivativeClaimUnverified = true;
          }
        }
      }

      // 9. Evidence filter (deterministic safety net)
      const { kept } = filterByProbativeValue(rawEvidence);

      // 10. Add to state
      state.evidenceItems.push(...kept);

      // Track contradiction sources
      if (iterationType === "contradiction") {
        state.contradictionSourcesFound += fetchedSources.length;
      }
    } catch (err) {
      console.warn(`[Stage2] Research iteration failed for query "${queryObj.query}":`, err);

      // Surface LLM provider errors as warnings (once per error type)
      const errMsg = err instanceof Error ? err.message : String(err);
      // Check status code first (AI SDK and provider error objects expose .status or .statusCode),
      // then fall back to message string matching for providers that surface the code in the message.
      const statusCode = (err as any)?.status ?? (err as any)?.statusCode;
      const isLlmError = (typeof statusCode === "number" && (statusCode === 429 || statusCode === 503 || statusCode === 529)) ||
        errMsg.includes("rate limit") || errMsg.includes("rate_limit") ||
        errMsg.includes("quota") || errMsg.includes("credit") ||
        errMsg.includes("overloaded") ||
        errMsg.includes("status 503") || errMsg.includes("503 Service");
      if (isLlmError) {
        const alreadyWarned = state.warnings.some((w) => w.type === "llm_provider_error");
        if (!alreadyWarned) {
          state.warnings.push({
            type: "llm_provider_error",
            severity: "error",
            message: `LLM provider error during research: ${errMsg.slice(0, 200)}`,
            details: { query: queryObj.query },
          });
        }
      }
    }
  }
}

/**
 * Generate search queries for a claim using LLM (Haiku tier).
 * Uses GENERATE_QUERIES UCM prompt.
 */
export async function generateResearchQueries(
  claim: AtomicClaim,
  iterationType: "main" | "contradiction",
  existingEvidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
  remainingQueryBudget?: number,
): Promise<Array<{ query: string; rationale: string }>> {
  const maxQueries = Math.max(0, Math.min(3, remainingQueryBudget ?? 3));
  if (maxQueries === 0) {
    return [];
  }

  const queryStrategyMode = pipelineConfig.queryStrategyMode ?? "legacy";
  const rendered = await loadAndRenderSection("claimboundary", "GENERATE_QUERIES", {
    currentDate,
    claim: claim.statement,
    expectedEvidenceProfile: JSON.stringify(claim.expectedEvidenceProfile ?? {}),
    iterationType,
    queryStrategyMode,
  });
  if (!rendered) {
    // Fallback: use claim statement directly
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);

  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Generate search queries for this claim: "${claim.statement}"`,
        },
      ],
      temperature: 0.2,
      output: Output.object({ schema: GenerateQueriesOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
    }

    const validated = GenerateQueriesOutputSchema.parse(parsed);
    if (queryStrategyMode !== "pro_con") {
      return validated.queries
        .slice(0, maxQueries)
        .map(({ query, rationale }) => ({ query, rationale }));
    }

    const supportingQueries = validated.queries.filter((query) => query.variantType === "supporting");
    const refutingQueries = validated.queries.filter((query) => query.variantType === "refuting");
    const unlabeledQueries = validated.queries.filter(
      (query) => query.variantType !== "supporting" && query.variantType !== "refuting",
    );

    const merged: Array<{ query: string; rationale: string }> = [];
    const maxVariantLength = Math.max(supportingQueries.length, refutingQueries.length);
    for (let i = 0; i < maxVariantLength; i++) {
      if (supportingQueries[i]) {
        merged.push({
          query: supportingQueries[i].query,
          rationale: supportingQueries[i].rationale,
        });
      }
      if (refutingQueries[i]) {
        merged.push({
          query: refutingQueries[i].query,
          rationale: refutingQueries[i].rationale,
        });
      }
    }

    for (const unlabeled of unlabeledQueries) {
      merged.push({ query: unlabeled.query, rationale: unlabeled.rationale });
    }

    const normalized = merged.length > 0
      ? merged
      : validated.queries.map(({ query, rationale }) => ({ query, rationale }));

    return normalized.slice(0, maxQueries);
  } catch (err) {
    console.warn("[Stage2] Query generation failed, using fallback:", err);
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
  }
}

/**
 * Classify search results for relevance to a claim using LLM (Haiku, batched).
 * Uses RELEVANCE_CLASSIFICATION UCM prompt.
 */
export async function classifyRelevance(
  claim: AtomicClaim,
  searchResults: Array<{ url: string; title: string; snippet?: string | null }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<Array<{ url: string; relevanceScore: number }>> {
  const rendered = await loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", {
    currentDate,
    claim: claim.statement,
    searchResults: JSON.stringify(
      searchResults.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet ?? "" })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // Fallback: accept all results with neutral score
    return searchResults.map((r) => ({ url: r.url, relevanceScore: 0.5 }));
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);

  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Classify the relevance of ${searchResults.length} search results to this claim: "${claim.statement}"`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: RelevanceClassificationOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return searchResults.map((r) => ({ url: r.url, relevanceScore: 0.5 }));

    const validated = RelevanceClassificationOutputSchema.parse(parsed);
    // Filter to minimum relevance score of 0.4
    return validated.relevantSources.filter((s) => s.relevanceScore >= 0.4);
  } catch (err) {
    console.warn("[Stage2] Relevance classification failed, accepting all results:", err);
    return searchResults.map((r) => ({ url: r.url, relevanceScore: 0.5 }));
  }
}

/**
 * Fetch sources and add to state.sources[].
 * Returns successfully fetched sources with their extracted text.
 */
export async function fetchSources(
  relevantSources: Array<{ url: string; relevanceScore?: number }>,
  searchQuery: string,
  state: CBResearchState,
): Promise<Array<{ url: string; title: string; text: string }>> {
  const fetched: Array<{ url: string; title: string; text: string }> = [];
  const fetchErrorByType: Record<string, number> = {};
  const failedUrls: string[] = [];
  const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
  let fetchAttempted = 0;
  let fetchFailed = 0;

  // Filter out already-fetched URLs
  const toFetch = relevantSources.filter(
    (source) => !state.sources.some((s) => s.url === source.url),
  );

  // Parallel fetch with concurrency limit of 3
  const FETCH_CONCURRENCY = 3;
  for (let i = 0; i < toFetch.length; i += FETCH_CONCURRENCY) {
    const batch = toFetch.slice(i, i + FETCH_CONCURRENCY);
    fetchAttempted += batch.length;
    const results = await Promise.all(
      batch.map((source) =>
        extractTextFromUrl(source.url, {
          timeoutMs: 12000,
          maxLength: 15000,
        })
          .then((content) => ({ source, content, ok: true as const }))
          .catch((error: unknown) => ({ source, content: null, ok: false as const, error })),
      ),
    );

    for (const result of results) {
      if (!result.ok || !result.content) {
        fetchFailed++;
        const classified = classifySourceFetchFailure(result.error);
        fetchErrorByType[classified.type] = (fetchErrorByType[classified.type] ?? 0) + 1;
        if (!failedUrls.includes(result.source.url)) {
          failedUrls.push(result.source.url);
        }
        if (fetchErrorSamples.length < 10) {
          fetchErrorSamples.push({
            url: result.source.url,
            type: classified.type,
            status: classified.status,
            message: classified.message.slice(0, 240),
          });
        }
        continue;
      }
      if (result.content.text.length < 100) continue; // Too short to be useful

      const fetchedSource: FetchedSource = {
        id: `S_${String(state.sources.length + 1).padStart(3, "0")}`,
        url: result.source.url,
        title: result.content.title || result.source.url,
        trackRecordScore: getTrackRecordScore(result.source.url),
        fullText: result.content.text,
        fetchedAt: new Date().toISOString(),
        category: result.content.contentType || "text/html",
        fetchSuccess: true,
        searchQuery,
      };
      state.sources.push(fetchedSource);

      fetched.push({
        url: result.source.url,
        title: result.content.title || result.source.url,
        text: result.content.text.slice(0, 8000), // Cap for prompt size
      });
    }
  }

  if (fetchFailed > 0 && fetchAttempted > 0) {
    const failureRatio = fetchFailed / fetchAttempted;
    state.warnings.push({
      type: "source_fetch_failure",
      severity: failureRatio >= 0.5 ? "error" : "warning",
      message:
        `Source fetch failed for ${fetchFailed}/${fetchAttempted} source(s) while researching query "${searchQuery.slice(0, 120)}"`,
      details: {
        stage: "research_fetch",
        query: searchQuery,
        attempted: fetchAttempted,
        failed: fetchFailed,
        failureRatio,
        errorByType: fetchErrorByType,
        failedUrls: failedUrls.slice(0, 20),
        errorSamples: fetchErrorSamples,
        occurrences: fetchFailed,
      },
    });

    if (failureRatio >= 0.4 && fetchAttempted >= 3) {
      state.warnings.push({
        type: "source_fetch_degradation",
        severity: failureRatio >= 0.7 ? "error" : "warning",
        message:
          `Source fetch degradation detected (${Math.round(failureRatio * 100)}% failures, ${fetchFailed}/${fetchAttempted})`,
        details: {
          stage: "research_fetch",
          query: searchQuery,
          attempted: fetchAttempted,
          failed: fetchFailed,
          failureRatio,
          occurrences: 1,
        },
      });
    }
  }

  return fetched;
}

function classifySourceFetchFailure(
  error: unknown,
): { type: string; status?: number; message: string } {
  const fallback = { type: "unknown", message: "Unknown fetch failure" };
  if (!error) return fallback;

  const status =
    typeof (error as any)?.status === "number"
      ? (error as any).status
      : typeof (error as any)?.statusCode === "number"
        ? (error as any).statusCode
        : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if ((error as any)?.name === "AbortError" || normalized.includes("timeout")) {
    return { type: "timeout", status, message };
  }
  if (status === 401 || normalized.includes("http 401")) {
    return { type: "http_401", status: 401, message };
  }
  if (status === 403 || normalized.includes("http 403")) {
    return { type: "http_403", status: 403, message };
  }
  if (status === 404 || normalized.includes("http 404")) {
    return { type: "http_404", status: 404, message };
  }
  if (status === 429 || normalized.includes("http 429")) {
    return { type: "http_429", status: 429, message };
  }
  if ((typeof status === "number" && status >= 500) || normalized.includes("http 5")) {
    return { type: "http_5xx", status, message };
  }
  if (normalized.includes("invalid pdf") || normalized.includes("failed to extract pdf text")) {
    return { type: "pdf_parse_failure", status, message };
  }
  if (normalized.includes("econnrefused")) {
    return { type: "connection_refused", status, message };
  }
  if (
    normalized.includes("enotfound") ||
    normalized.includes("eai_again") ||
    normalized.includes("econnreset") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network")
  ) {
    return { type: "network", status, message };
  }

  return { type: "unknown", status, message };
}

/**
 * Extract evidence from fetched sources for a target claim (Haiku, batched).
 * Uses EXTRACT_EVIDENCE UCM prompt. Returns full EvidenceItem[] with all CB fields.
 */
export async function extractResearchEvidence(
  targetClaim: AtomicClaim,
  sources: Array<{ url: string; title: string; text: string }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<EvidenceItem[]> {
  const rendered = await loadAndRenderSection("claimboundary", "EXTRACT_EVIDENCE", {
    currentDate,
    claim: targetClaim.statement,
    sourceContent: sources.map((s, i) =>
      `[Source ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.text}`
    ).join("\n\n---\n\n"),
    sourceUrl: sources.map((s) => s.url).join(", "),
  });
  if (!rendered) return [];

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);

  try {
    const result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Extract evidence from these ${sources.length} sources relating to claim "${targetClaim.id}": "${targetClaim.statement}"`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: Stage2ExtractEvidenceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) return [];

    const validated = Stage2ExtractEvidenceOutputSchema.parse(parsed);

    // Map to full EvidenceItem format
    let idCounter = Date.now(); // Use timestamp-based IDs to avoid collisions
    return validated.evidenceItems.map((ei) => {
      // Use LLM-attributed sourceUrl when available; fall back to first source.
      const matchedSource = sources.find((s) => s.url === ei.sourceUrl) ?? sources[0];

      return {
        id: `EV_${String(idCounter++)}`,
        statement: ei.statement,
        category: mapCategory(ei.category),
        specificity: ei.probativeValue === "high" ? "high" as const : "medium" as const,
        sourceId: "",
        sourceUrl: matchedSource?.url ?? "",
        sourceTitle: matchedSource?.title ?? "",
        sourceExcerpt: ei.statement,
        claimDirection: ei.claimDirection === "contextual" ? "neutral" as const : ei.claimDirection,
        evidenceScope: {
          name: ei.evidenceScope?.methodology?.slice(0, 30) || "Unspecified",
          methodology: ei.evidenceScope?.methodology,
          temporal: ei.evidenceScope?.temporal,
          geographic: ei.evidenceScope?.geographic,
          boundaries: ei.evidenceScope?.boundaries,
          additionalDimensions: ei.evidenceScope?.additionalDimensions,
        },
        probativeValue: ei.probativeValue,
        sourceType: mapSourceType(ei.sourceType),
        relevantClaimIds: ei.relevantClaimIds.length > 0
          ? ei.relevantClaimIds
          : [targetClaim.id],
        isDerivative: ei.isDerivative ?? false,
        derivedFromSourceUrl: ei.derivedFromSourceUrl ?? undefined,
      } satisfies EvidenceItem;
    });
  } catch (err) {
    console.warn("[Stage2] Evidence extraction failed:", err);
    return [];
  }
}

/**
 * Assess EvidenceScope quality (§8.2 step 8).
 * Deterministic structural check: complete/partial/incomplete.
 */
export function assessScopeQuality(
  item: EvidenceItem,
): "complete" | "partial" | "incomplete" {
  const scope = item.evidenceScope;
  if (!scope) return "incomplete";

  const hasMethodology = !!(scope.methodology && scope.methodology.trim().length > 0);
  const hasTemporal = !!(scope.temporal && scope.temporal.trim().length > 0);

  if (!hasMethodology || !hasTemporal) return "incomplete";

  // Check if fields are meaningful vs vague (language-neutral: length + structural markers only)
  const isVague = (s: string) =>
    s.length < 5 || /^(n\/?a|—|-|\?|\.{1,3}|\*+)$/i.test(s.trim());

  if (isVague(scope.methodology!) || isVague(scope.temporal!)) return "partial";

  return "complete";
}

/**
 * Map LLM category strings to EvidenceItem.category enum values.
 */
function mapCategory(category: string): EvidenceItem["category"] {
  const normalized = category.toLowerCase().replace(/[_\s-]+/g, "_");
  const validCategories: Record<string, EvidenceItem["category"]> = {
    legal_provision: "legal_provision",
    evidence: "evidence",
    direct_evidence: "direct_evidence",
    expert_quote: "expert_quote",
    expert_testimony: "expert_quote",
    statistic: "statistic",
    statistical_data: "statistic",
    event: "event",
    criticism: "criticism",
    case_study: "evidence",
  };
  return validCategories[normalized] ?? "evidence";
}

/**
 * Map LLM sourceType strings to SourceType enum values.
 */
function mapSourceType(sourceType?: string): SourceType | undefined {
  if (!sourceType) return undefined;
  const normalized = sourceType.toLowerCase().replace(/[_\s-]+/g, "_");
  const validTypes: Record<string, SourceType> = {
    peer_reviewed_study: "peer_reviewed_study",
    fact_check_report: "fact_check_report",
    government_report: "government_report",
    legal_document: "legal_document",
    news_primary: "news_primary",
    news_secondary: "news_secondary",
    expert_statement: "expert_statement",
    organization_report: "organization_report",
  };
  return validTypes[normalized] ?? "other";
}

// ============================================================================
// EVIDENCE POOL BALANCE (C13 — Stammbach/Ash bias detection)
// ============================================================================

/**
 * Evidence balance metrics for the evidence pool.
 * Measures the directional skew of evidence items.
 */
export interface EvidenceBalanceMetrics {
  supporting: number;
  contradicting: number;
  neutral: number;
  total: number;
  /** Ratio of supporting / (supporting + contradicting). 0.5 = balanced, >0.8 or <0.2 = skewed. NaN if no directional evidence. */
  balanceRatio: number;
  isSkewed: boolean;
}

/**
 * Assess directional balance of the evidence pool.
 * Returns metrics and whether the pool is skewed beyond the configured threshold.
 *
 * @param evidenceItems - All evidence items from research stage
 * @param skewThreshold - Ratio above which (or below 1-threshold) the pool is considered skewed (default 0.8)
 * @returns EvidenceBalanceMetrics
 */
export function assessEvidenceBalance(
  evidenceItems: EvidenceItem[],
  skewThreshold = 0.8,
  minDirectional = 3,
): EvidenceBalanceMetrics {
  let supporting = 0;
  let contradicting = 0;
  let neutral = 0;

  for (const item of evidenceItems) {
    switch (item.claimDirection) {
      case "supports":
        supporting++;
        break;
      case "contradicts":
        contradicting++;
        break;
      default:
        neutral++;
        break;
    }
  }

  const directional = supporting + contradicting;
  const balanceRatio = directional > 0 ? supporting / directional : NaN;
  // Use max(ratio, 1-ratio) to get majority proportion — avoids floating-point issues with 1-threshold
  const majorityRatio = isNaN(balanceRatio) ? 0 : Math.max(balanceRatio, 1 - balanceRatio);
  // Strict > so that threshold=1.0 disables detection (majorityRatio maxes at 1.0)
  const isSkewed = !isNaN(balanceRatio) && directional >= minDirectional && majorityRatio > skewThreshold;

  return {
    supporting,
    contradicting,
    neutral,
    total: evidenceItems.length,
    balanceRatio,
    isSkewed,
  };
}

/**
 * Check whether all 4 configurable debate roles lack structural independence.
 * Validation tier is excluded — it's a fixed-purpose check, not part of the debate.
 *
 * Accepts a resolved VerdictStageConfig (with profile + explicit overrides already applied)
 * so that warnings are correct regardless of whether config came from a debateProfile,
 * explicit overrides, or hardcoded defaults.
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
  const tiers = verdictConfig.debateModelTiers;

  const debateRoleTiers = [
    tiers.advocate ?? "sonnet",
    tiers.selfConsistency ?? "sonnet",
    tiers.challenger ?? "sonnet",
    tiers.reconciler ?? "sonnet",
  ];
  const allSameTier = debateRoleTiers.every((t) => t === debateRoleTiers[0]);
  if (!allSameTier) return null;

  // Check provider diversity. Uses a sentinel for undefined (= "inherit global")
  // so that two undefined values are treated as equal but distinct from named providers.
  const providers = verdictConfig.debateModelProviders;
  const INHERIT_GLOBAL = "__inherit_global__";
  const roleProviders = [
    providers?.advocate ?? INHERIT_GLOBAL,
    providers?.selfConsistency ?? INHERIT_GLOBAL,
    providers?.challenger ?? INHERIT_GLOBAL,
    providers?.reconciler ?? INHERIT_GLOBAL,
  ];
  const hasProviderDiversity = !roleProviders.every((p) => p === roleProviders[0]);
  if (hasProviderDiversity) return null;

  const tier = debateRoleTiers[0];
  console.warn(
    `[Pipeline] All 4 debate roles configured to same tier "${tier}" — ` +
    `adversarial challenge may not produce structurally independent perspectives (C1/C16)`
  );
  return {
    type: "all_same_debate_tier",
    severity: "warning",
    message: `All 4 debate roles (advocate, selfConsistency, challenger, reconciler) use the same model tier "${tier}". ` +
      `Structurally independent models improve debate quality — consider mixing tiers for challenger or reconciler.`,
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
  const providers = verdictConfig.debateModelProviders;
  if (!providers) return warnings;

  const roleNames: (keyof typeof providers)[] = [
    "advocate", "selfConsistency", "challenger", "reconciler", "validation",
  ];

  for (const role of roleNames) {
    const provider = providers[role];
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

// ============================================================================
// STAGE 3: CLUSTER BOUNDARIES (§8.3)
// ============================================================================

// --- Zod schema for Stage 3 LLM output parsing ---

const BoundaryClusteringOutputSchema = z.object({
  claimBoundaries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    description: z.string(),
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    temporal: z.string().optional(),
    constituentScopeIndices: z.array(z.number()),
    internalCoherence: z.number(),
  })),
  scopeToBoundaryMapping: z.array(z.object({
    scopeIndex: z.number(),
    boundaryId: z.string(),
    rationale: z.string(),
  })),
  congruenceDecisions: z.array(z.object({
    scopeA: z.number(),
    scopeB: z.number(),
    congruent: z.boolean(),
    rationale: z.string(),
  })),
});

/**
 * A unique scope entry with its index for LLM reference.
 */
export interface UniqueScope {
  index: number;
  scope: EvidenceScope;
  originalIndices: number[]; // indices into state.evidenceItems that share this scope
}

/**
 * Stage 3: Organize evidence into ClaimBoundaries by clustering compatible EvidenceScopes.
 *
 * Single Sonnet-tier LLM call groups scopes with compatible methodology,
 * boundaries, geography, and temporal period. Deterministic post-clustering
 * validation ensures structural integrity.
 *
 * @param state - Research state with populated evidenceItems
 * @returns Array of ClaimBoundaries
 */
export async function clusterBoundaries(
  state: CBResearchState
): Promise<ClaimAssessmentBoundary[]> {
  const [pipelineResult] = await Promise.all([
    loadPipelineConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;

  // Log config load status for cluster stage
  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM pipeline config load failed in clusterBoundaries — using hardcoded defaults.`);
  }

  const currentDate = new Date().toISOString().split("T")[0];

  // ------------------------------------------------------------------
  // Step 1: Collect unique EvidenceScopes
  // ------------------------------------------------------------------
  const uniqueScopes = collectUniqueScopes(state.evidenceItems);

  // If 0 or 1 unique scopes, skip LLM — single boundary
  if (uniqueScopes.length <= 1) {
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
    return [boundary];
  }

  // ------------------------------------------------------------------
  // Step 2: LLM clustering (Sonnet tier)
  // ------------------------------------------------------------------
  let boundaries: ClaimAssessmentBoundary[];
  try {
    boundaries = await runLLMClustering(
      uniqueScopes,
      state.evidenceItems,
      state.understanding?.atomicClaims ?? [],
      pipelineConfig,
      currentDate,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage3] LLM clustering failed, using fallback:", err);
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
    return [boundary];
  }

  // ------------------------------------------------------------------
  // Step 3: Coherence assessment — flag low-coherence boundaries
  // ------------------------------------------------------------------
  const coherenceMinimum = pipelineConfig.boundaryCoherenceMinimum ?? 0.3;
  for (const b of boundaries) {
    if (b.internalCoherence < coherenceMinimum) {
      console.warn(
        `[Stage3] Boundary "${b.name}" (${b.id}) has low coherence: ${b.internalCoherence} < ${coherenceMinimum}`,
      );
    }
  }

  // ------------------------------------------------------------------
  // Step 4: Post-clustering validation (deterministic)
  // ------------------------------------------------------------------

  // 4a. Validate no empty or malformed boundaries
  boundaries = boundaries.filter(
    (b) => b.id && b.name && b.constituentScopes.length > 0,
  );

  if (boundaries.length === 0) {
    console.warn("[Stage3] All boundaries invalid after filtering — using fallback");
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
    return [boundary];
  }

  // 4b. Validate no duplicate boundary IDs
  const idSet = new Set<string>();
  for (const b of boundaries) {
    if (idSet.has(b.id)) {
      b.id = `${b.id}_${Date.now()}`;
    }
    idSet.add(b.id);
  }

  // 4c. Completeness check — every unique scope must be in exactly one boundary
  const assignedScopeIndices = new Set<number>();
  for (const b of boundaries) {
    for (const scope of b.constituentScopes) {
      const matchIdx = uniqueScopes.findIndex(
        (us) => scopeFingerprint(us.scope) === scopeFingerprint(scope),
      );
      if (matchIdx >= 0) assignedScopeIndices.add(matchIdx);
    }
  }

  // Find orphaned scopes
  const orphanedScopes = uniqueScopes.filter((_, idx) => !assignedScopeIndices.has(idx));
  if (orphanedScopes.length > 0) {
    // Add orphaned scopes to a "General" fallback boundary
    let generalBoundary = boundaries.find((b) => b.id === "CB_GENERAL");
    if (!generalBoundary) {
      generalBoundary = {
        id: "CB_GENERAL",
        name: "General Evidence",
        shortName: "General",
        description: "Evidence not assigned to a specific methodology boundary",
        constituentScopes: [],
        internalCoherence: 0.5,
        evidenceCount: 0,
      };
      boundaries.push(generalBoundary);
    }
    for (const orphan of orphanedScopes) {
      generalBoundary.constituentScopes.push(orphan.scope);
    }
  }

  // 4d. Cap enforcement — merge if over maxClaimBoundaries
  const maxBoundaries = pipelineConfig.maxClaimBoundaries ?? 6;
  while (boundaries.length > maxBoundaries) {
    boundaries = mergeClosestBoundaries(boundaries);
  }

  // ------------------------------------------------------------------
  // Step 5: Assign evidence items to boundaries
  // ------------------------------------------------------------------
  assignEvidenceToBoundaries(state.evidenceItems, boundaries, uniqueScopes);

  // Update evidenceCount per boundary
  for (const b of boundaries) {
    b.evidenceCount = state.evidenceItems.filter(
      (e) => e.claimBoundaryId === b.id,
    ).length;
  }

  return boundaries;
}

// ============================================================================
// STAGE 3 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Generate a fingerprint for an EvidenceScope for deduplication.
 * Uses methodology + temporal + geographic + boundaries as key fields.
 */
export function scopeFingerprint(scope: EvidenceScope): string {
  return JSON.stringify({
    m: (scope.methodology ?? "").trim().toLowerCase(),
    t: (scope.temporal ?? "").trim().toLowerCase(),
    g: (scope.geographic ?? "").trim().toLowerCase(),
    b: (scope.boundaries ?? "").trim().toLowerCase(),
  });
}

/**
 * Collect unique EvidenceScopes from evidence items, deduplicating by fingerprint.
 * Returns array of UniqueScope entries with indices back to originating evidence items.
 */
export function collectUniqueScopes(evidenceItems: EvidenceItem[]): UniqueScope[] {
  const seen = new Map<string, UniqueScope>();

  for (let i = 0; i < evidenceItems.length; i++) {
    const scope = evidenceItems[i].evidenceScope;
    if (!scope) continue;

    const fp = scopeFingerprint(scope);
    const existing = seen.get(fp);
    if (existing) {
      existing.originalIndices.push(i);
    } else {
      seen.set(fp, {
        index: seen.size,
        scope,
        originalIndices: [i],
      });
    }
  }

  return Array.from(seen.values());
}

/**
 * Run LLM clustering via BOUNDARY_CLUSTERING prompt (Sonnet tier).
 * Returns ClaimAssessmentBoundary[] parsed from LLM output.
 */
export async function runLLMClustering(
  uniqueScopes: UniqueScope[],
  evidenceItems: EvidenceItem[],
  atomicClaims: AtomicClaim[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<ClaimAssessmentBoundary[]> {
  const rendered = await loadAndRenderSection("claimboundary", "BOUNDARY_CLUSTERING", {
    currentDate,
    evidenceScopes: JSON.stringify(
      uniqueScopes.map((us) => ({
        index: us.index,
        ...us.scope,
      })),
      null,
      2,
    ),
    evidenceItems: JSON.stringify(
      evidenceItems.map((ei, idx) => ({
        index: idx,
        statement: ei.statement.slice(0, 100),
        claimDirection: ei.claimDirection,
        scopeFingerprint: ei.evidenceScope ? scopeFingerprint(ei.evidenceScope) : null,
        relevantClaimIds: ei.relevantClaimIds,
      })),
      null,
      2,
    ),
    atomicClaims: JSON.stringify(
      atomicClaims.map((c) => ({
        id: c.id,
        statement: c.statement,
      })),
      null,
      2,
    ),
  });

  if (!rendered) {
    throw new Error("Stage 3: Failed to load BOUNDARY_CLUSTERING prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);

  const result = await generateText({
    model: model.model,
    messages: [
      {
        role: "system",
        content: rendered.content,
        providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
      },
      {
        role: "user",
        content: `Cluster ${uniqueScopes.length} unique EvidenceScopes into ClaimBoundaries based on methodological congruence.`,
      },
    ],
    temperature: 0.15,
    output: Output.object({ schema: BoundaryClusteringOutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      pipelineConfig.llmProvider ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 3: LLM returned no structured output");
  }

  const validated = BoundaryClusteringOutputSchema.parse(parsed);

  if (validated.claimBoundaries.length === 0) {
    throw new Error("Stage 3: LLM returned 0 boundaries");
  }

  // Map LLM output to ClaimAssessmentBoundary[] with constituentScopes
  return validated.claimBoundaries.map((cb) => ({
    id: cb.id,
    name: cb.name,
    shortName: cb.shortName,
    description: cb.description,
    methodology: cb.methodology,
    boundaries: cb.boundaries,
    geographic: cb.geographic,
    temporal: cb.temporal,
    constituentScopes: cb.constituentScopeIndices
      .filter((idx) => idx >= 0 && idx < uniqueScopes.length)
      .map((idx) => uniqueScopes[idx].scope),
    internalCoherence: Math.max(0, Math.min(1, cb.internalCoherence)),
    evidenceCount: 0, // Populated after assignment
  }));
}

/**
 * Create a single fallback "General" boundary containing all scopes.
 */
export function createFallbackBoundary(
  uniqueScopes: UniqueScope[],
  evidenceItems: EvidenceItem[],
): ClaimAssessmentBoundary {
  return {
    id: "CB_GENERAL",
    name: "General Evidence",
    shortName: "General",
    description: "All evidence analyzed together",
    constituentScopes: uniqueScopes.map((us) => us.scope),
    internalCoherence: 0.8,
    evidenceCount: evidenceItems.length,
  };
}

/**
 * Assign each evidence item to a boundary by matching its scope fingerprint
 * to the boundary's constituent scopes.
 */
export function assignEvidenceToBoundaries(
  evidenceItems: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  uniqueScopes: UniqueScope[],
): void {
  // Build scope fingerprint → boundary ID mapping
  const fpToBoundary = new Map<string, string>();
  for (const boundary of boundaries) {
    for (const scope of boundary.constituentScopes) {
      fpToBoundary.set(scopeFingerprint(scope), boundary.id);
    }
  }

  // Assign each evidence item
  for (const item of evidenceItems) {
    if (item.evidenceScope) {
      const fp = scopeFingerprint(item.evidenceScope);
      const boundaryId = fpToBoundary.get(fp);
      if (boundaryId) {
        item.claimBoundaryId = boundaryId;
        continue;
      }
    }
    // Fallback: assign to first boundary (General if exists, otherwise first)
    const fallback = boundaries.find((b) => b.id === "CB_GENERAL") ?? boundaries[0];
    if (fallback) {
      item.claimBoundaryId = fallback.id;
    }
  }
}

/**
 * Compute Jaccard similarity between two boundaries based on scope fingerprints.
 */
export function boundaryJaccardSimilarity(a: ClaimAssessmentBoundary, b: ClaimAssessmentBoundary): number {
  const setA = new Set(a.constituentScopes.map(scopeFingerprint));
  const setB = new Set(b.constituentScopes.map(scopeFingerprint));

  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const fp of setA) {
    if (setB.has(fp)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Merge the two most similar boundaries (highest Jaccard similarity).
 * Returns new array with one fewer boundary.
 */
export function mergeClosestBoundaries(boundaries: ClaimAssessmentBoundary[]): ClaimAssessmentBoundary[] {
  if (boundaries.length <= 1) return boundaries;

  let bestI = 0;
  let bestJ = 1;
  let bestSim = -1;

  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 1; j < boundaries.length; j++) {
      const sim = boundaryJaccardSimilarity(boundaries[i], boundaries[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestI = i;
        bestJ = j;
      }
    }
  }

  const a = boundaries[bestI];
  const b = boundaries[bestJ];

  // Merge b into a
  const merged: ClaimAssessmentBoundary = {
    id: a.id,
    name: `${a.name} + ${b.name}`,
    shortName: a.shortName,
    description: `Merged: ${a.description}; ${b.description}`,
    methodology: a.methodology,
    boundaries: a.boundaries,
    geographic: a.geographic,
    temporal: a.temporal,
    constituentScopes: [
      ...a.constituentScopes,
      ...b.constituentScopes.filter(
        (s) => !a.constituentScopes.some(
          (as) => scopeFingerprint(as) === scopeFingerprint(s),
        ),
      ),
    ],
    internalCoherence: (a.internalCoherence + b.internalCoherence) / 2,
    evidenceCount: a.evidenceCount + b.evidenceCount,
  };

  const result = boundaries.filter((_, idx) => idx !== bestI && idx !== bestJ);
  result.push(merged);
  return result;
}

// ============================================================================
// COVERAGE MATRIX (§8.5.1)
// ============================================================================

/**
 * Build the coverage matrix: claims × boundaries evidence distribution.
 * Computed after Stage 3, used by Stage 4 (verdict) and Stage 5 (aggregation).
 *
 * ~20 lines of deterministic code. Zero LLM cost.
 *
 * @param claims - Atomic claims from Stage 1
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param evidence - All evidence items (boundary-assigned)
 * @returns CoverageMatrix
 */
export function buildCoverageMatrix(
  claims: AtomicClaim[],
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[]
): CoverageMatrix {
  const claimIds = claims.map(c => c.id);
  const boundaryIds = boundaries.map(b => b.id);

  // Initialize counts[claimIdx][boundaryIdx] = 0
  const counts: number[][] = claimIds.map(() =>
    boundaryIds.map(() => 0)
  );

  // Count evidence items per claim × boundary
  // Evidence items carry claimBoundaryId (assigned in Stage 3)
  // and relevantClaimIds (assigned in Stage 2)
  for (const item of evidence) {
    const bIdx = boundaryIds.indexOf(item.claimBoundaryId ?? "");
    if (bIdx === -1) continue;

    // Each evidence item may be relevant to multiple claims
    const relevantClaims = item.relevantClaimIds ?? [];
    for (const claimId of relevantClaims) {
      const cIdx = claimIds.indexOf(claimId);
      if (cIdx !== -1) {
        counts[cIdx][bIdx]++;
      }
    }
  }

  return {
    claims: claimIds,
    boundaries: boundaryIds,
    counts,
    getBoundariesForClaim(claimId: string): string[] {
      const cIdx = claimIds.indexOf(claimId);
      if (cIdx === -1) return [];
      return boundaryIds.filter((_, bIdx) => counts[cIdx][bIdx] > 0);
    },
    getClaimsForBoundary(boundaryId: string): string[] {
      const bIdx = boundaryIds.indexOf(boundaryId);
      if (bIdx === -1) return [];
      return claimIds.filter((_, cIdx) => counts[cIdx][bIdx] > 0);
    },
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
): Promise<CBClaimVerdict[]> {
  // Load UCM configs for verdict stage
  const [pipelineResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadCalcConfig("default"),
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

  // Production LLM call wiring — use injected or create from UCM.
  // Pass warnings collector so runtime fallbacks surface in resultJson.analysisWarnings.
  const llmCallFn = llmCall ?? createProductionLLMCall(pipelineConfig, warnings);

  return runVerdictStage(claims, evidence, boundaries, coverageMatrix, llmCallFn, verdictConfig, warnings);
}

// ============================================================================
// STAGE 4 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Build VerdictStageConfig from UCM pipeline and calculation configs.
 * Maps UCM config field names to VerdictStageConfig structure.
 *
 * Resolution order for tiers and providers:
 *   1. Explicit debateModelTiers / debateModelProviders (per-field overrides)
 *   2. debateProfile preset (named combination)
 *   3. Hardcoded defaults (sonnet for debate, haiku for validation, no provider override)
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

  // Resolve debate profile base (if set)
  const profileName = pipelineConfig.debateProfile as DebateProfile | undefined;
  const profile = profileName ? DEBATE_PROFILES[profileName] : undefined;

  // Tiers: explicit > profile > defaults
  const profileTiers = profile?.tiers;
  const explicitTiers = pipelineConfig.debateModelTiers;

  // Providers: explicit > profile > defaults (empty)
  const profileProviders = profile?.providers;
  const explicitProviders = pipelineConfig.debateModelProviders;

  return {
    selfConsistencyMode: pipelineConfig.selfConsistencyMode ?? "disabled",
    selfConsistencyTemperature:
      pipelineConfig.selfConsistencyTemperature ?? 0.3,
    stableThreshold: spreadThresholds.stable ?? 5,
    moderateThreshold: spreadThresholds.moderate ?? 12,
    unstableThreshold: spreadThresholds.unstable ?? 20,
    spreadMultipliers: DEFAULT_VERDICT_STAGE_CONFIG.spreadMultipliers,
    mixedConfidenceThreshold: calcConfig.mixedConfidenceThreshold ?? 40,
    highHarmMinConfidence: calcConfig.highHarmMinConfidence ?? 50,
    debateModelTiers: {
      advocate: explicitTiers?.advocate ?? profileTiers?.advocate ?? "sonnet",
      selfConsistency: explicitTiers?.selfConsistency ?? profileTiers?.selfConsistency ?? "sonnet",
      challenger: explicitTiers?.challenger ?? profileTiers?.challenger ?? "sonnet",
      reconciler: explicitTiers?.reconciler ?? profileTiers?.reconciler ?? "sonnet",
      validation: explicitTiers?.validation ?? profileTiers?.validation ?? "haiku",
    },
    debateModelProviders: {
      advocate: explicitProviders?.advocate ?? profileProviders?.advocate,
      selfConsistency: explicitProviders?.selfConsistency ?? profileProviders?.selfConsistency,
      challenger: explicitProviders?.challenger ?? profileProviders?.challenger,
      reconciler: explicitProviders?.reconciler ?? profileProviders?.reconciler,
      validation: explicitProviders?.validation ?? profileProviders?.validation,
    },
    highHarmFloorLevels: calcConfig.highHarmFloorLevels ?? ["critical", "high"],
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
  google: ["GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"],
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
): LLMCallFn {
  return async (
    promptKey: string,
    input: Record<string, unknown>,
    options?: { tier?: "sonnet" | "haiku" | "opus"; temperature?: number; providerOverride?: LLMProviderType; modelOverride?: string },
  ): Promise<unknown> => {
    const startTime = Date.now();
    const stage = "stage4_verdict";

    const userContent = typeof input.userMessage === "string"
      ? input.userMessage
      : JSON.stringify(input);

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

    const isOpenAiTpmError = (error: unknown): boolean => {
      const msg = error instanceof Error ? error.message : String(error ?? "");
      const lower = msg.toLowerCase();
      return lower.includes("tokens per min")
        || lower.includes("tpm")
        || lower.includes("request too large");
    };

    // 1. Load UCM prompt section
    const currentDate = new Date().toISOString().split("T")[0];
    const rendered = await loadAndRenderSection("claimboundary", promptKey, {
      ...input,
      currentDate,
    });
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
    const tier = options?.tier ?? "sonnet";
    const isPremium = tier === "sonnet" || tier === "opus";
    const taskKey: ModelTask = isPremium ? "verdict" : "understand";
    // B-5b: For "opus" tier, temporarily override modelVerdict with modelOpus so
    // getModelForTask resolves the correct model ID through the standard path.
    const effectiveConfig = tier === "opus" && pipelineConfig.modelOpus
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
        type: "llm_provider_error",
        severity: "warning",
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
    let result: any;
    const callModel = async (activeModel: typeof model): Promise<any> => {
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
        providerOptions: getStructuredOutputProviderOptions(activeModel.provider),
      });
    };

    let attemptModel = model;
    try {
      result = await callModel(attemptModel);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

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
        timestamp: new Date(),
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
          result = await callModel(attemptModel);
        } catch (retryError) {
          const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
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
            timestamp: new Date(),
          });

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

    // Record successful LLM call with actual resolved provider
    recordLLMCall({
      taskType: 'verdict',
      provider: attemptModel.provider,
      modelName: attemptModel.modelName,
      promptTokens: result.usage?.promptTokens ?? 0,
      completionTokens: result.usage?.completionTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - startTime,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

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

    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }
      throw toError(
        `Stage 4: Failed to parse LLM response as JSON for prompt "${promptKey}"`,
        {
          stage,
          promptKey,
          provider: attemptModel.provider,
          model: attemptModel.modelName,
          tier,
          reason: "json_parse_failure",
        },
        parseError,
      );
    }
  };
}

// ============================================================================
// STAGE 5: AGGREGATE (§8.5)
// ============================================================================

/**
 * Stage 5: Produce the overall assessment by weighted aggregation.
 *
 * Includes triangulation scoring, derivative weight reduction,
 * weighted average computation, and VerdictNarrative generation.
 *
 * @param claimVerdicts - Verdicts from Stage 4
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param evidence - All evidence items
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @param state - Research state for metadata
 * @returns OverallAssessment
 */
export async function aggregateAssessment(
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[],
  coverageMatrix: CoverageMatrix,
  state: CBResearchState
): Promise<OverallAssessment> {
  const [pipelineResult, calcResult] = await Promise.all([
    loadPipelineConfig("default"),
    loadCalcConfig("default"),
  ]);
  const pipelineConfig = pipelineResult.config;
  const calcConfig = calcResult.config;

  // Log config load status for aggregation stage
  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM pipeline config load failed in aggregateAssessment — using hardcoded defaults.`);
  }
  if (calcResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM calc config load failed in aggregateAssessment — using hardcoded defaults.`);
  }

  const claims = state.understanding?.atomicClaims ?? [];

  // ------------------------------------------------------------------
  // Step 1: Triangulation scoring per claim (§8.5.2)
  // ------------------------------------------------------------------
  for (const verdict of claimVerdicts) {
    verdict.triangulationScore = computeTriangulationScore(
      verdict,
      coverageMatrix,
      calcConfig,
    );
  }

  // ------------------------------------------------------------------
  // Step 2: Weighted average computation (§8.5.4)
  // ------------------------------------------------------------------
  const aggregation = calcConfig.aggregation ?? {
    centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
    harmPotentialMultiplier: 1.5,
    derivativeMultiplier: 0.5,
  };
  const harmMultipliers = calcConfig.aggregation?.harmPotentialMultipliers ?? {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 1.0,
  };
  const derivativeMultiplier = aggregation.derivativeMultiplier ?? 0.5;

  const weightsData = claimVerdicts.map((verdict) => {
    const claim = claims.find((c) => c.id === verdict.claimId);

    // Centrality weight
    const centrality = claim?.centrality ?? "low";
    const centralityWeight =
      aggregation.centralityWeights[centrality as keyof typeof aggregation.centralityWeights] ?? 1.0;

    // Harm multiplier (4-level)
    const harmLevel = verdict.harmPotential ?? "medium";
    const harmWeight = harmMultipliers[harmLevel as keyof typeof harmMultipliers] ?? 1.0;

    // Confidence factor (0-100 → 0-1)
    const confidenceFactor = verdict.confidence / 100;

    // Triangulation factor
    const triangulationFactor = verdict.triangulationScore?.factor ?? 0;

    // Derivative factor (§8.5.3)
    const derivativeFactor = computeDerivativeFactor(
      verdict,
      evidence,
      derivativeMultiplier,
    );

    // Final weight (§8.5.4): centrality × harm × confidence × (1 + triangulation) × derivative
    const finalWeight =
      centralityWeight *
      harmWeight *
      confidenceFactor *
      (1 + triangulationFactor) *
      derivativeFactor;

    return {
      truthPercentage: verdict.truthPercentage,
      confidence: verdict.confidence,
      weight: Math.max(0, finalWeight),
    };
  });

  // Compute weighted averages inline (same weights for both)
  const totalWeight = weightsData.reduce((sum, item) => sum + item.weight, 0);
  const weightedTruthPercentage =
    totalWeight > 0
      ? weightsData.reduce(
          (sum, item) => sum + item.truthPercentage * item.weight,
          0,
        ) / totalWeight
      : 50;
  const weightedConfidence =
    totalWeight > 0
      ? weightsData.reduce(
          (sum, item) => sum + item.confidence * item.weight,
          0,
        ) / totalWeight
      : 50;

  // 7-point verdict label
  const mixedConfidenceThreshold = calcConfig.mixedConfidenceThreshold ?? 40;
  const verdictLabel = percentageToArticleVerdict(
    weightedTruthPercentage,
    weightedConfidence,
    undefined,
    mixedConfidenceThreshold,
  );

  // ------------------------------------------------------------------
  // Step 3: VerdictNarrative generation (§8.5.6, Sonnet call)
  // ------------------------------------------------------------------
  let verdictNarrative: VerdictNarrative;
  try {
    verdictNarrative = await generateVerdictNarrative(
      weightedTruthPercentage,
      verdictLabel,
      weightedConfidence,
      claimVerdicts,
      boundaries,
      coverageMatrix,
      evidence,
      pipelineConfig,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage5] VerdictNarrative generation failed, using fallback:", err);
    verdictNarrative = {
      headline: `Analysis yields ${verdictLabel} verdict at ${Math.round(weightedConfidence)}% confidence`,
      evidenceBaseSummary: `${evidence.length} evidence items from ${state.sources.length} sources across ${boundaries.length} perspective${boundaries.length !== 1 ? "s" : ""}`,
      keyFinding: `Weighted analysis of ${claimVerdicts.length} claims produces an overall truth assessment of ${Math.round(weightedTruthPercentage)}%.`,
      limitations: "Automated analysis with limitations inherent to evidence availability and source coverage.",
    };
  }

  // ------------------------------------------------------------------
  // Step 4: Quality gates summary (§8.5.7)
  // ------------------------------------------------------------------
  const qualityGates = buildQualityGates(
    state.understanding?.gate1Stats,
    claimVerdicts,
    evidence,
    state,
  );

  // ------------------------------------------------------------------
  // Step 5: Report assembly
  // ------------------------------------------------------------------

  // Compute overall truth% range from per-claim ranges (weighted min/max)
  let overallRange: { min: number; max: number } | undefined;
  const claimsWithRange = claimVerdicts.filter((v) => v.truthPercentageRange);
  if (claimsWithRange.length > 0) {
    const totalW = weightsData.reduce((sum, item) => sum + item.weight, 0);
    if (totalW > 0) {
      let weightedMin = 0;
      let weightedMax = 0;
      for (let i = 0; i < claimVerdicts.length; i++) {
        const v = claimVerdicts[i];
        const w = weightsData[i]?.weight ?? 0;
        if (v.truthPercentageRange) {
          weightedMin += v.truthPercentageRange.min * w;
          weightedMax += v.truthPercentageRange.max * w;
        } else {
          // No range — use point estimate for both min and max
          weightedMin += v.truthPercentage * w;
          weightedMax += v.truthPercentage * w;
        }
      }
      overallRange = {
        min: Math.round((weightedMin / totalW) * 10) / 10,
        max: Math.round((weightedMax / totalW) * 10) / 10,
      };
    }
  }

  return {
    truthPercentage: Math.round(weightedTruthPercentage * 10) / 10,
    verdict: verdictLabel,
    confidence: Math.round(weightedConfidence * 10) / 10,
    verdictNarrative,
    hasMultipleBoundaries: boundaries.length > 1,
    claimBoundaries: boundaries,
    claimVerdicts,
    coverageMatrix,
    qualityGates,
    truthPercentageRange: overallRange,
  };
}

// ============================================================================
// STAGE 5 HELPERS (exported for unit testing)
// ============================================================================

/**
 * Compute triangulation score for a claim verdict (§8.5.2).
 * Deterministic — no LLM calls.
 */
export function computeTriangulationScore(
  verdict: CBClaimVerdict,
  coverageMatrix: CoverageMatrix,
  calcConfig: CalcConfig,
): TriangulationScore {
  const triangulationConfig = calcConfig.aggregation?.triangulation ?? {
    strongAgreementBoost: 0.15,
    moderateAgreementBoost: 0.05,
    singleBoundaryPenalty: -0.10,
  };

  const boundaryIds = coverageMatrix.getBoundariesForClaim(verdict.claimId);
  const findings = verdict.boundaryFindings ?? [];

  let supporting = 0;
  let contradicting = 0;

  for (const bId of boundaryIds) {
    const finding = findings.find((f) => f.boundaryId === bId);
    if (!finding) continue;
    if (finding.evidenceDirection === "supports") supporting++;
    else if (finding.evidenceDirection === "contradicts") contradicting++;
  }

  const boundaryCount = boundaryIds.length;

  // Classify triangulation level and compute factor
  let level: TriangulationScore["level"];
  let factor: number;

  if (boundaryCount <= 1) {
    level = "weak";
    factor = triangulationConfig.singleBoundaryPenalty ?? -0.10;
  } else if (supporting >= 3) {
    level = "strong";
    factor = triangulationConfig.strongAgreementBoost ?? 0.15;
  } else if (supporting >= 2 && contradicting <= 1) {
    level = "moderate";
    factor = triangulationConfig.moderateAgreementBoost ?? 0.05;
  } else if (supporting > 0 && contradicting > 0 && Math.abs(supporting - contradicting) <= 1) {
    level = "conflicted";
    factor = 0; // No boost/penalty for conflicted
  } else if (supporting > contradicting) {
    level = "moderate";
    factor = triangulationConfig.moderateAgreementBoost ?? 0.05;
  } else {
    level = "weak";
    factor = triangulationConfig.singleBoundaryPenalty ?? -0.10;
  }

  return { boundaryCount, supporting, contradicting, level, factor };
}

/**
 * Compute derivative weight reduction factor for a claim verdict (§8.5.3).
 * derivativeFactor = 1.0 - (derivativeRatio × (1.0 - derivativeMultiplier))
 */
export function computeDerivativeFactor(
  verdict: CBClaimVerdict,
  evidence: EvidenceItem[],
  derivativeMultiplier: number,
): number {
  const supportingIds = verdict.supportingEvidenceIds ?? [];
  if (supportingIds.length === 0) return 1.0;

  const supportingEvidence = supportingIds
    .map((id) => evidence.find((e) => e.id === id))
    .filter(Boolean) as EvidenceItem[];

  if (supportingEvidence.length === 0) return 1.0;

  // Count verified derivatives (isDerivative=true AND derivativeClaimUnverified is NOT true)
  const derivativeCount = supportingEvidence.filter(
    (e) => e.isDerivative === true && e.derivativeClaimUnverified !== true,
  ).length;

  const derivativeRatio = derivativeCount / supportingEvidence.length;
  return 1.0 - derivativeRatio * (1.0 - derivativeMultiplier);
}

/**
 * Zod schema for VerdictNarrative LLM output.
 */
const VerdictNarrativeOutputSchema = z.object({
  headline: z.string(),
  evidenceBaseSummary: z.string(),
  keyFinding: z.string(),
  boundaryDisagreements: z.array(z.string()).optional(),
  limitations: z.string(),
});

/**
 * Generate a VerdictNarrative using Sonnet LLM call (§8.5.6).
 */
export async function generateVerdictNarrative(
  truthPercentage: number,
  verdict: string,
  confidence: number,
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  evidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
): Promise<VerdictNarrative> {
  const currentDate = new Date().toISOString().split("T")[0];

  const rendered = await loadAndRenderSection("claimboundary", "VERDICT_NARRATIVE", {
    currentDate,
    overallVerdict: JSON.stringify({
      truthPercentage: Math.round(truthPercentage),
      verdict,
      confidence: Math.round(confidence),
    }),
    claimVerdicts: JSON.stringify(
      claimVerdicts.slice(0, 7).map((v) => ({
        claimId: v.claimId,
        truthPercentage: v.truthPercentage,
        verdict: v.verdict,
        confidence: v.confidence,
        reasoning: v.reasoning?.slice(0, 200),
        boundaryFindings: v.boundaryFindings?.map((f) => ({
          boundaryId: f.boundaryId,
          boundaryName: f.boundaryName,
          evidenceDirection: f.evidenceDirection,
          evidenceCount: f.evidenceCount,
        })),
      })),
      null,
      2,
    ),
    claimBoundaries: JSON.stringify(
      boundaries.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        evidenceCount: b.evidenceCount,
      })),
      null,
      2,
    ),
    coverageMatrix: JSON.stringify({
      claims: coverageMatrix.claims,
      boundaries: coverageMatrix.boundaries,
      counts: coverageMatrix.counts,
    }),
    evidenceCount: String(evidence.length),
  });

  if (!rendered) {
    throw new Error("Stage 5: Failed to load VERDICT_NARRATIVE prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);

  const result = await generateText({
    model: model.model,
    messages: [
      {
        role: "system",
        content: rendered.content,
        providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
      },
      {
        role: "user",
        content: `Generate a structured narrative for the overall assessment (truth: ${Math.round(truthPercentage)}%, verdict: ${verdict}, confidence: ${Math.round(confidence)}%).`,
      },
    ],
    temperature: 0.2,
    output: Output.object({ schema: VerdictNarrativeOutputSchema }),
    providerOptions: getStructuredOutputProviderOptions(
      pipelineConfig.llmProvider ?? "anthropic",
    ),
  });

  const parsed = extractStructuredOutput(result);
  if (!parsed) {
    throw new Error("Stage 5: LLM returned no structured output for VerdictNarrative");
  }

  return VerdictNarrativeOutputSchema.parse(parsed);
}

/**
 * Build quality gates summary (§8.5.7).
 */
export function buildQualityGates(
  cbGate1Stats: CBClaimUnderstanding["gate1Stats"] | undefined,
  claimVerdicts: CBClaimVerdict[],
  evidence: EvidenceItem[],
  state: CBResearchState,
): QualityGates {
  // Map CB gate1Stats to Gate1Stats shape
  const gate1Stats: Gate1Stats | undefined = cbGate1Stats
    ? {
        total: cbGate1Stats.totalClaims,
        passed: cbGate1Stats.totalClaims - cbGate1Stats.filteredCount,
        filtered: cbGate1Stats.filteredCount,
        centralKept: cbGate1Stats.totalClaims - cbGate1Stats.filteredCount,
      }
    : undefined;

  // Gate 4 stats: classify confidence levels
  const highConfidence = claimVerdicts.filter((v) => v.confidence >= 70).length;
  const mediumConfidence = claimVerdicts.filter(
    (v) => v.confidence >= 40 && v.confidence < 70,
  ).length;
  const lowConfidence = claimVerdicts.filter(
    (v) => v.confidence > 0 && v.confidence < 40,
  ).length;
  const insufficient = claimVerdicts.filter((v) => v.confidence === 0).length;

  const gate4Stats: Gate4Stats = {
    total: claimVerdicts.length,
    publishable: highConfidence + mediumConfidence,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    insufficient,
    centralKept: claimVerdicts.length, // All claims retained in CB pipeline
  };

  return {
    passed: cbGate1Stats?.overallPass !== false && gate4Stats.publishable > 0,
    gate1Stats,
    gate4Stats,
    summary: {
      totalEvidenceItems: evidence.length,
      totalSources: state.sources.length,
      searchesPerformed: state.searchQueries.length,
      contradictionSearchPerformed: state.contradictionIterationsUsed > 0,
    },
  };
}

// ============================================================================
// B-8: EXPLANATION QUALITY CHECK
// ============================================================================

/**
 * B-8 Tier 1: Structural explanation quality check (deterministic).
 * Verifies the VerdictNarrative contains required structural components.
 * No semantic analysis — purely structural plumbing per AGENTS.md.
 */
export function checkExplanationStructure(
  narrative: VerdictNarrative,
): ExplanationStructuralFindings {
  return {
    // Check if narrative references evidence quantities (e.g., "14 items", "9 sources")
    hasCitedEvidence: narrative.evidenceBaseSummary.length > 0
      && /\d+/.test(narrative.evidenceBaseSummary),
    // Check if verdict label or percentage is in headline (language-neutral, Unicode-aware):
    // - ALL-CAPS tokens (TRUE, VRAI, ÜBERWIEGEND) via \p{Lu}
    // - Title-case hyphenated compounds (Mostly-True, Plutôt-Vrai) — both parts capitalized
    // - Percentage pattern (72%)
    hasVerdictCategory: narrative.headline.length > 0
      && (/\p{Lu}[\p{Lu}\-]{2,}/u.test(narrative.headline)
        || /\p{Lu}\p{L}+-\p{Lu}\p{L}+/u.test(narrative.headline)
        || /\d+%/.test(narrative.headline)),
    // Check if confidence/numeric score appears in headline or key finding (language-neutral:
    // match percentage patterns or fraction scores, not bare numbers which cause false positives)
    hasConfidenceStatement: /\d+%/.test(narrative.headline)
      || /\d+\s*\/\s*\d+/.test(narrative.headline + " " + narrative.keyFinding),
    // Check if limitations section has substantive content (>5 chars excludes "None", "N/A", etc.)
    hasLimitations: narrative.limitations.length > 5,
  };
}

/**
 * B-8 Tier 2: Rubric-based explanation quality evaluation (LLM-powered).
 * Calls LLM to evaluate narrative quality on 5 dimensions.
 * Uses Haiku tier for cost efficiency.
 */
export async function evaluateExplanationRubric(
  narrative: VerdictNarrative,
  claimCount: number,
  evidenceCount: number,
  llmCall: LLMCallFn,
): Promise<ExplanationRubricScores> {
  const result = await llmCall("EXPLANATION_QUALITY_RUBRIC", {
    headline: narrative.headline,
    evidenceBaseSummary: narrative.evidenceBaseSummary,
    keyFinding: narrative.keyFinding,
    limitations: narrative.limitations,
    boundaryDisagreements: narrative.boundaryDisagreements ?? [],
    claimCount,
    evidenceCount,
  }, { tier: "haiku" });

  const raw = result as Record<string, unknown>;
  const parseScore = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : 3;
  };

  const clarity = parseScore(raw.clarity);
  const completeness = parseScore(raw.completeness);
  const neutrality = parseScore(raw.neutrality);
  const evidenceSupport = parseScore(raw.evidenceSupport);
  const appropriateHedging = parseScore(raw.appropriateHedging);
  const overallScore = Math.round(
    (clarity + completeness + neutrality + evidenceSupport + appropriateHedging) / 5 * 10
  ) / 10;

  const flags = Array.isArray(raw.flags) ? raw.flags.map(String) : [];

  return { clarity, completeness, neutrality, evidenceSupport, appropriateHedging, overallScore, flags };
}
