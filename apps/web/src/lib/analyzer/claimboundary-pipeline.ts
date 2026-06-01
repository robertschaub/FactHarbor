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
  ClaimAutoSelectionMetadata,
  ClaimSelectionRecommendationAssessment,
  ClaimVerdict7Point,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  EvidenceScope,
  ExplanationQualityCheck,
  FetchedSource,
  AnalysisInput,
  OverallAssessment,
  SourceType,
} from "./types";

// Shared modules — reused from existing codebase (no orchestrated.ts imports)
import { filterByProbativeValue } from "./evidence-filter";
import { prefetchSourceReliability, getTrackRecordData, applyEvidenceWeighting } from "./source-reliability";
import {
  applySourceReliabilityCalibrationResults,
  buildSourceReliabilityCalibrationInput,
  callSRCalibrationLLM,
} from "./source-reliability-calibration";
import { debugLog } from "./debug";

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
import { tryParseFirstJsonObject, repairTruncatedJson } from "./json";
import { loadAndRenderSection } from "./prompt-loader";
import { getClaimsRelevantGeographies } from "./jurisdiction-context";
import { classifyError } from "@/lib/error-classification";
import {
  isSystemPaused,
  pauseSystem,
  recordProviderFailure,
} from "@/lib/provider-health";
import { probeLLMConnectivity } from "@/lib/connectivity-probe";
import {
  checkAbortSignal,
  classifySourceFetchFailure,
  createErrorFingerprint,
  createUnverifiedFallbackVerdict,
  detectInputType,
  extractDomain,
  mapCategory,
  mapSourceType,
  normalizeExtractedSourceType,
  selectTopSources,
} from "./pipeline-utils";
import {
  buildCoverageMatrix,
  clusterBoundaries,
} from "./boundary-clustering-stage";
import {
  aggregateAssessment,
  checkExplanationStructure,
  evaluateExplanationRubric,
  evaluateTigerScore,
} from "./aggregation-stage";
import {
  generateVerdicts,
  buildVerdictStageConfig,
  createProductionLLMCall,
  checkDebateTierDiversity,
  checkDebateProviderCredentials,
} from "./verdict-generation-stage";
import {
  extractClaims,
  runPass1,
  runPass2,
  runPreliminarySearch,
  runGate1Validation,
  filterByCentrality,
  shouldProtectValidatedAnchorCarriers,
  getProtectedContractCarrierIds,
  getAtomicityGuidance,
  generateSearchQueries,
  upsertSearchProviderWarning,
  type PreliminaryEvidenceItem,
  ClaimContractOutputSchema,
} from "./claim-extraction-stage";
import {
  finalizeClaimAcquisitionTelemetry,
  recordApplicabilityRemovalTelemetry,
  researchEvidence,
  runResearchIteration,
  allClaimsSufficient,
  consumeClaimQueryBudget,
  claimNeedsMoreResearchForSufficiency,
  evaluateEvidenceSufficiency,
  findLeastContradictedClaim,
  findLeastResearchedClaim,
  getClaimQueryBudgetRemaining,
  getClaimQueryBudgetUsed,
  getPerClaimQueryBudget,
  resolveDirectApplicabilityRequirement,
} from "./research-orchestrator";
import {
  classifyRelevance,
  extractResearchEvidence,
  assessEvidenceApplicability,
  assessScopeQuality,
  assessEvidenceBalance,
  type EvidenceBalanceMetrics,
} from "./research-extraction-stage";
import {
  fetchSources,
  reconcileEvidenceSourceIds,
} from "./research-acquisition-stage";
import {
  generateResearchQueries,
} from "./research-query-stage";
import {
  generateClaimSelectionRecommendation,
  getClaimAutoSelectionCap,
  normalizeClaimAutoSelectionCandidateCap,
} from "./claim-selection-recommendation";
import { filterClaimUnderstandingForSelectedClaims } from "./claim-selection-filter";

// Config loading
import { loadPipelineConfig, loadSearchConfig, loadCalcConfig, loadPromptConfig } from "@/lib/config-loader";
import type { PipelineConfig } from "@/lib/config-schemas";
import type { LLMProviderType } from "@/lib/analyzer/types";
import { getConfig } from "@/lib/config-storage";
import { captureConfigSnapshotAsync, getSRConfigSummary } from "@/lib/config-snapshots";

// Metrics integration
import {
  runWithMetrics,
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
import { clearAbortSignal } from "@/lib/job-abort";

export { detectInputType, extractDomain, selectTopSources } from "./pipeline-utils";
export * from "./boundary-clustering-stage";
export {
  aggregateAssessment,
  computeTriangulationScore,
  computeDerivativeFactor,
  generateVerdictNarrative,
  buildQualityGates,
  checkExplanationStructure,
  evaluateExplanationRubric,
} from "./aggregation-stage";
export {
  generateVerdicts,
  buildVerdictStageConfig,
  createProductionLLMCall,
  checkDebateTierDiversity,
  checkDebateProviderCredentials,
} from "./verdict-generation-stage";
export {
  extractClaims,
  runPass1,
  runPass2,
  runPreliminarySearch,
  runGate1Validation,
  filterByCentrality,
  selectClaimsForGate1,
  shouldProtectValidatedAnchorCarriers,
  getProtectedContractCarrierIds,
  getAtomicityGuidance,
  generateSearchQueries,
  type PreliminaryEvidenceItem,
  ClaimContractOutputSchema,
} from "./claim-extraction-stage";
export {
  finalizeClaimAcquisitionTelemetry,
  researchEvidence,
  recordApplicabilityRemovalTelemetry,
  runResearchIteration,
  seedEvidenceFromPreliminarySearch,
  remapUnresolvedSeededEvidence,
  wouldResolveExistingRemap,
  allClaimsSufficient,
  consumeClaimQueryBudget,
  claimNeedsMoreResearchForSufficiency,
  evaluateEvidenceSufficiency,
  findLeastContradictedClaim,
  findLeastResearchedClaim,
  getClaimQueryBudgetRemaining,
  getClaimQueryBudgetUsed,
  getPerClaimQueryBudget,
  resolveDirectApplicabilityRequirement,
  type DiversitySufficiencyConfig,
} from "./research-orchestrator";
export {
  classifyRelevance,
  extractResearchEvidence,
  assessEvidenceApplicability,
  assessScopeQuality,
  assessEvidenceBalance,
} from "./research-extraction-stage";
export {
  fetchSources,
  reconcileEvidenceSourceIds,
} from "./research-acquisition-stage";
export {
  generateResearchQueries,
} from "./research-query-stage";

type RuntimeRoleModels = Record<string, {
  provider: string;
  model: string;
  strength: string;
  callCount: number;
  fallbackUsed: boolean;
}>;

export function buildClaimBoundaryResultJson(params: {
  assessment: OverallAssessment;
  input: Pick<AnalysisInput, "inputType" | "inputValue">;
  state: Pick<
    CBResearchState,
    | "languageIntent"
    | "understanding"
    | "claimSelection"
    | "evidenceItems"
    | "sources"
    | "searchQueries"
    | "claimAcquisitionLedger"
    | "warnings"
    | "llmCalls"
    | "mainIterationsUsed"
    | "contradictionIterationsUsed"
    | "contradictionSourcesFound"
  >;
  detectedUrl?: string;
  llmProvider?: string;
  verdictModelName: string;
  understandModelName: string;
  extractModelName: string;
  runtimeModelsUsed: Set<string>;
  runtimeRoleModels: RuntimeRoleModels;
  searchProvider?: string;
  searchProviders?: string;
  evidenceBalance: EvidenceBalanceMetrics;
  promptContentHash?: string | null;
  boundaryCount: number;
}) {
  const {
    assessment,
    input,
    state,
    detectedUrl,
    llmProvider,
    verdictModelName,
    understandModelName,
    extractModelName,
    runtimeModelsUsed,
    runtimeRoleModels,
    searchProvider,
    searchProviders,
    evidenceBalance,
    promptContentHash,
    boundaryCount,
  } = params;

  return {
    _schemaVersion: "3.2.0-cb",
    meta: {
      schemaVersion: "3.2.0-cb",
      generatedUtc: new Date().toISOString(),
      pipeline: "claimboundary",
      llmProvider: llmProvider ?? "anthropic",
      llmModel: verdictModelName,
      modelsUsed: {
        understand: understandModelName,
        extractEvidence: extractModelName,
        verdict: verdictModelName,
      },
      modelsUsedAll: Array.from(runtimeModelsUsed),
      runtimeRoleModels,
      searchProvider,
      searchProviders: searchProviders || undefined,
      inputType: input.inputType,
      detectedInputType: state.understanding?.detectedInputType ?? input.inputType,
      sourceUrl: input.inputType === "url" ? input.inputValue : detectedUrl,
      hasMultipleBoundaries: assessment.hasMultipleBoundaries,
      boundaryCount,
      claimCount: state.understanding?.atomicClaims.length ?? 0,
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
      promptContentHash,
    },
    languageIntent: state.languageIntent,
    truthPercentage: assessment.truthPercentage,
    verdict: assessment.verdict,
    confidence: assessment.confidence,
    truthPercentageRange: assessment.truthPercentageRange,
    verdictNarrative: assessment.verdictNarrative,
    articleAdjudication: assessment.articleAdjudication,
    adjudicationPath: assessment.adjudicationPath,
    claimBoundaries: assessment.claimBoundaries,
    claimVerdicts: assessment.claimVerdicts,
    coverageMatrix: assessment.coverageMatrix,
    understanding: state.understanding,
    claimSelection: state.claimSelection,
    evidenceItems: state.evidenceItems,
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      trackRecordScore: s.trackRecordScore,
      trackRecordConfidence: s.trackRecordConfidence,
      trackRecordConsensus: s.trackRecordConsensus,
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery,
    })),
    searchQueries: state.searchQueries,
    claimAcquisitionLedger: state.claimAcquisitionLedger,
    qualityGates: assessment.qualityGates,
    analysisWarnings: state.warnings,
  };
}

const CANDIDATE_CAP_EXCLUDED_RATIONALE =
  "Not evaluated because the candidate set exceeded the configured claim auto-selection candidate cap.";

function includeRequiredClaimsForEvaluation(
  candidateClaims: AtomicClaim[],
  candidateCap: number,
  requiredClaimIds: string[],
): AtomicClaim[] {
  const evaluatedClaims = candidateClaims.slice(0, candidateCap);
  const includedClaimIds = new Set(evaluatedClaims.map((claim) => claim.id));
  const claimById = new Map(candidateClaims.map((claim) => [claim.id, claim] as const));

  for (const claimId of requiredClaimIds) {
    if (includedClaimIds.has(claimId)) continue;
    const claim = claimById.get(claimId);
    if (!claim) continue;
    evaluatedClaims.push(claim);
    includedClaimIds.add(claimId);
  }

  return evaluatedClaims;
}

function mergeSelectedClaimIdsWithRequired(
  selectedClaimIds: string[],
  requiredClaimIds: string[],
  candidateClaims: AtomicClaim[],
  maxSelectedIds = Number.MAX_SAFE_INTEGER,
): string[] {
  const candidateOrder = new Map(candidateClaims.map((claim, index) => [claim.id, index] as const));
  const availableIds = new Set(candidateClaims.map((claim) => claim.id));
  const requiredIds = requiredClaimIds
    .filter((claimId, index) => availableIds.has(claimId) && requiredClaimIds.indexOf(claimId) === index)
    .sort((left, right) =>
      (candidateOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
      - (candidateOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
    );
  const requiredIdSet = new Set(requiredIds);
  const maxNonRequiredIds = Math.max(0, maxSelectedIds - requiredIds.length);
  const selectedNonRequiredIds: string[] = [];
  const seen = new Set<string>();

  for (const claimId of selectedClaimIds) {
    if (!availableIds.has(claimId) || seen.has(claimId) || requiredIdSet.has(claimId)) continue;
    if (selectedNonRequiredIds.length >= maxNonRequiredIds) continue;
    selectedNonRequiredIds.push(claimId);
    seen.add(claimId);
  }

  const keptNonRequiredIdSet = new Set(selectedNonRequiredIds);
  const merged: string[] = [];
  const mergedIdSet = new Set<string>();

  for (const claimId of selectedClaimIds) {
    if (!availableIds.has(claimId) || mergedIdSet.has(claimId)) continue;
    if (!requiredIdSet.has(claimId) && !keptNonRequiredIdSet.has(claimId)) continue;
    merged.push(claimId);
    mergedIdSet.add(claimId);
  }

  for (const claimId of requiredIds) {
    if (mergedIdSet.has(claimId)) continue;
    merged.push(claimId);
    mergedIdSet.add(claimId);
  }

  return merged;
}

function buildDroppedClaimRationale(
  assessment: ClaimSelectionRecommendationAssessment | undefined,
  rankedClaimIds: string[],
): string {
  if (assessment?.recommendationRationale?.trim()) {
    return assessment.recommendationRationale.trim();
  }
  const rank = assessment ? rankedClaimIds.indexOf(assessment.claimId) + 1 : 0;
  const rankText = rank > 0 ? ` ranked #${rank}` : "";
  const redundancyText = assessment?.redundancyWithClaimIds.length
    ? ` Covered by stronger candidate IDs: ${assessment.redundancyWithClaimIds.join(", ")}.`
    : "";

  switch (assessment?.triageLabel) {
    case "fact_check_worthy":
      return `Selector${rankText} this as fact-check-worthy, but selected higher-priority candidates for this run.${redundancyText}`;
    case "fact_non_check_worthy":
      return `Selector${rankText} this as lower priority for fact-checking in this run.${redundancyText}`;
    case "opinion_or_subjective":
      return `Selector classified this as not evidence-resolvable enough for research in this run.${redundancyText}`;
    case "unclear":
      return `Selector classified this as too unclear after extraction for research in this run.${redundancyText}`;
    default:
      return "The selector did not choose this claim for research in this run.";
  }
}

function buildClaimSelectionMetadata(args: {
  understanding: CBClaimUnderstanding;
  selectionCap: number;
  candidateCap: number;
  evaluatedClaims: AtomicClaim[];
  selectedClaimIds: string[];
  rankedClaimIds: string[];
  rationale: string;
  assessments: ClaimSelectionRecommendationAssessment[];
}): ClaimAutoSelectionMetadata {
  const candidateClaimIds = args.understanding.atomicClaims.map((claim) => claim.id);
  const evaluatedCandidateClaimIds = args.evaluatedClaims.map((claim) => claim.id);
  const selectedSet = new Set(args.selectedClaimIds);
  const assessmentById = new Map(
    args.assessments.map((assessment) => [assessment.claimId, assessment] as const),
  );

  const droppedClaims: ClaimAutoSelectionMetadata["droppedClaims"] = [];
  for (const claim of args.evaluatedClaims) {
    if (selectedSet.has(claim.id)) continue;
    const assessment = assessmentById.get(claim.id);
    droppedClaims.push({
      id: claim.id,
      statement: claim.statement,
      reasonType: "selector_dropped",
      triageLabel: assessment?.triageLabel,
      rationale: buildDroppedClaimRationale(assessment, args.rankedClaimIds),
    });
  }

  const evaluatedSet = new Set(evaluatedCandidateClaimIds);
  for (const claim of args.understanding.atomicClaims) {
    if (evaluatedSet.has(claim.id)) continue;
    droppedClaims.push({
      id: claim.id,
      statement: claim.statement,
      reasonType: "candidate_cap_excluded",
      rationale: CANDIDATE_CAP_EXCLUDED_RATIONALE,
    });
  }

  return {
    enabled: true,
    mode: "automatic",
    selectionCap: args.selectionCap,
    candidateCap: args.candidateCap,
    candidateClaimIds,
    evaluatedCandidateClaimIds,
    selectedClaimIds: args.selectedClaimIds,
    droppedClaims,
    rankedClaimIds: args.rankedClaimIds,
    rationale: args.rationale,
  };
}

function buildClaimSelectionFailureMetadata(args: {
  understanding: CBClaimUnderstanding;
  selectionCap: number;
  candidateCap: number;
  evaluatedClaims: AtomicClaim[];
  rationale: string;
}): ClaimAutoSelectionMetadata {
  return {
    enabled: true,
    mode: "automatic",
    selectionCap: args.selectionCap,
    candidateCap: args.candidateCap,
    candidateClaimIds: args.understanding.atomicClaims.map((claim) => claim.id),
    evaluatedCandidateClaimIds: args.evaluatedClaims.map((claim) => claim.id),
    selectedClaimIds: [],
    droppedClaims: args.understanding.atomicClaims.map((claim) => ({
      id: claim.id,
      statement: claim.statement,
      reasonType: args.evaluatedClaims.some((evaluated) => evaluated.id === claim.id)
        ? "selector_failed"
        : "candidate_cap_excluded",
      rationale: args.evaluatedClaims.some((evaluated) => evaluated.id === claim.id)
        ? args.rationale
        : CANDIDATE_CAP_EXCLUDED_RATIONALE,
    })),
    rankedClaimIds: args.evaluatedClaims.map((claim) => claim.id),
    rationale: args.rationale,
  };
}

function buildNoResearchAssessment(args: {
  understanding: CBClaimUnderstanding;
  headline: string;
  keyFinding: string;
  limitations: string;
}): OverallAssessment {
  return {
    truthPercentage: 50,
    verdict: "UNVERIFIED",
    confidence: 0,
    verdictNarrative: {
      headline: args.headline,
      evidenceBaseSummary: "No evidence was gathered because no atomic claims were selected for research.",
      keyFinding: args.keyFinding,
      limitations: args.limitations,
    },
    hasMultipleBoundaries: false,
    claimBoundaries: [],
    claimVerdicts: [],
    coverageMatrix: buildCoverageMatrix(args.understanding.atomicClaims, [], []),
    qualityGates: {
      passed: false,
      gate1Stats: {
        total: args.understanding.gate1Stats?.totalClaims ?? args.understanding.atomicClaims.length,
        passed: args.understanding.gate1Stats
          ? args.understanding.gate1Stats.totalClaims - args.understanding.gate1Stats.filteredCount
          : args.understanding.atomicClaims.length,
        filtered: args.understanding.gate1Stats?.filteredCount ?? 0,
        centralKept: args.understanding.atomicClaims.length,
      },
      gate4Stats: {
        total: 0,
        publishable: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        insufficient: 0,
        centralKept: 0,
      },
      summary: {
        totalEvidenceItems: 0,
        totalSources: 0,
        searchesPerformed: 0,
        contradictionSearchPerformed: false,
      },
    },
  };
}

function buildClaimSelectionTerminalMarkdown(args: {
  damaged: boolean;
  message: string;
  droppedCount: number;
}): string {
  const title = args.damaged
    ? "# ClaimAssessmentBoundary Analysis Report (Damaged)\n\n"
    : "# ClaimAssessmentBoundary Analysis Report\n\n";
  return title
    + args.message
    + "\n\nNo research or verdict stages were run. "
    + `${args.droppedCount} atomic claim${args.droppedCount === 1 ? "" : "s"} `
    + "were recorded under \"Not analyzed in this run\" for later resubmission.";
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

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

  // Load configs once at start to capture provider metadata
  const [pipelineResult, searchResult, calcResult] = await Promise.all([
    loadPipelineConfig("default", input.jobId),
    loadSearchConfig("default", input.jobId),
    loadCalcConfig("default", input.jobId),
  ]);
  const initialPipelineConfig = pipelineResult.config;
  const initialSearchConfig = searchResult.config;
  const initialCalcConfig = calcResult.config;

  // Record prompt + SR usage once at startup and persist a full resolved snapshot
  // for the job. This restores per-job provenance without changing analysis logic.
  let promptContentHash: string | null = null;
  if (input.jobId) {
    await Promise.all([
      loadPromptConfig("claimboundary", input.jobId),
      getConfig("sr", "default", { jobId: input.jobId }),
    ]).then(([promptResult, srConfigResult]) => {
      promptContentHash = promptResult?.contentHash ?? null;
      void captureConfigSnapshotAsync(
        input.jobId!,
        initialPipelineConfig,
        initialSearchConfig,
        getSRConfigSummary(srConfigResult.config, initialCalcConfig),
      );
    }).catch((err) => {
      console.warn(`[Pipeline] Failed to capture startup config provenance for job ${input.jobId}:`, err);
    });
  }

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

  // Run the analysis inside a per-job metrics context. AsyncLocalStorage ensures
  // overlapping concurrent jobs each get their own isolated MetricsCollector.
  return runWithMetrics(
    input.jobId ?? "unknown",
    "claimboundary",
    initialPipelineConfig,
    initialSearchConfig,
    async () => {

  try {
    // --- URL content pre-fetch (restored from v2.x pipeline) ---
    let analysisText = input.inputValue;
    let detectedUrl: string | undefined; // populated when auto-fetch fires on a URL-looking text input
    if (input.inputType === "url") {
      onEvent("Fetching URL content...", 3);
      let fetched: { text: string; title: string; contentType: string };
      try {
        fetched = await extractTextFromUrl(input.inputValue, {
          pdfParseTimeoutMs: initialPipelineConfig.pdfParseTimeoutMs ?? 60000,
        });
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(`Failed to fetch URL content: ${msg}`);
      }
      if (!fetched.text || fetched.text.trim().length === 0) {
        throw new Error("URL returned no extractable text content");
      }
      analysisText = fetched.text;
      console.log(`[Pipeline] URL content fetched: ${analysisText.length} chars, type: ${fetched.contentType}`);
    }

    // Guard: bare URL submitted as text type — auto-fetch so PDFs and web pages are analysed
    // correctly instead of sending the raw URL string to Stage 1 where impliedClaim would be empty.
    // Structural format check (not semantic analysis) — allowed per AGENTS.md.
    if (input.inputType !== "url" && /^https?:\/\/\S+$/.test(analysisText.trim())) {
      detectedUrl = analysisText.trim();
      onEvent("Detected URL input — fetching content...", 3);
      try {
        const fetched = await extractTextFromUrl(detectedUrl, {
          pdfParseTimeoutMs: initialPipelineConfig.pdfParseTimeoutMs ?? 60000,
        });
        if (!fetched.text || fetched.text.trim().length === 0) {
          throw new Error("URL returned no extractable text content");
        }
        analysisText = fetched.text;
        console.log(`[Pipeline] Auto-fetched URL (text input): ${analysisText.length} chars, type: ${fetched.contentType}`);
      } catch (fetchError) {
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(`Failed to fetch URL content: ${msg}`);
      }
    }

    // Initialize research state
    const state: CBResearchState = {
      jobId: input.jobId,
      originalInput: analysisText,
      inputType: input.inputType,
      pipelineStartMs: Date.now(),
      languageIntent: null,
      understanding: null,
      evidenceItems: [],
      sources: [],
      searchQueries: [],
      claimAcquisitionLedger: {},
      queryBudgetUsageByClaim: {},
      researchedIterationsByClaim: {},
      mainIterationsUsed: 0,
      contradictionIterationsReserved: initialPipelineConfig.contradictionReservedIterations ?? 1,
      contradictionIterationsUsed: 0,
      contradictionSourcesFound: 0,
      claimBoundaries: [],
      llmCalls: 0,
      onEvent: input.onEvent, // Thread progress callback through to research stage
      warnings: [],
      nextEvidenceId: 1, // Per-analysis monotonic counter; see types.ts CBResearchState.
    };
    const runtimeModelsUsed = new Set<string>();
    const recordRuntimeModelUsage = (provider?: string, modelName?: string): void => {
      if (!modelName) return;
      const p = provider?.trim();
      runtimeModelsUsed.add(p ? `${p}:${modelName}` : modelName);
    };

    // B-1: Per-role runtime tracing — captures what actually ran for each debate role
    const runtimeRoleTraces: Array<{ debateRole: string; promptKey: string; provider: string; model: string; strength: string; fallbackUsed: boolean }> = [];

    // Emit LLM model info before any analysis so users can see which models will run.
    // Progress -1 = info with no progress-bar update.
    {
      const previewUnderstand = getModelForTask("understand", undefined, initialPipelineConfig);
      const previewExtract   = getModelForTask("extract_evidence", undefined, initialPipelineConfig);
      const previewVerdict   = getModelForTask("verdict", undefined, initialPipelineConfig);
      const extractName = previewUnderstand.modelName === previewExtract.modelName
        ? previewUnderstand.modelName
        : `${previewUnderstand.modelName} / ${previewExtract.modelName}`;
      onEvent(`LLM: ${extractName} — extraction & research`, -1);
      if (previewVerdict.modelName !== previewUnderstand.modelName || previewVerdict.provider !== previewUnderstand.provider) {
        onEvent(`LLM: ${previewVerdict.modelName} — verdict`, -1);
      }
    }

    // Stage 1: Extract Claims
    checkAbortSignal(input.jobId);
    onEvent("Extracting claims from input...", 10);
    startPhase("understand");
    const understanding = await extractClaims(state);
    state.understanding = understanding;
    const inputLanguage = understanding.detectedLanguage ?? "en";
    state.languageIntent = {
      inputLanguage,
      reportLanguage: inputLanguage,
      retrievalLanguages: [{ language: inputLanguage, lane: "primary" as const }],
      sourceLanguagePolicy: "preserve_original" as const,
    };

    endPhase("understand");

    // Wave 1A: Early termination for claim contract failure
    // If Pass 2 extraction repeatedly fails to preserve the user's original claim contract
    // (e.g. by omitting truth-condition anchors), the report is considered "damaged"
    // and analysis terminates early to avoid wasting budget on incorrect claims.
    if (understanding.contractValidationSummary?.preservesContract === false) {
      console.warn(`[Pipeline] Claim contract preservation failed. Terminating early with damaged report.`);
      state.warnings.push({
        type: "report_damaged",
        severity: "error",
        message: "The analysis engine could not faithfully extract the original claim's meaning after multiple attempts. The resulting report may be inaccurate or misleading. Research and verdict stages have been aborted to prevent further drift.",
        details: {
          contractValidationSummary: understanding.contractValidationSummary,
        },
      });

      // Generate fallback UNVERIFIED verdicts for all extracted claims
      let claimVerdicts = understanding.atomicClaims.map((claim) =>
        createUnverifiedFallbackVerdict(
          claim,
          "report_damaged",
          "This claim was marked UNVERIFIED because the extraction process failed to preserve the original input's truth conditions. Analysis was terminated early to prevent misleading results.",
        )
      );

      // Aggregate final assessment immediately with zero evidence
      startPhase("aggregate");
      const boundaries: ClaimAssessmentBoundary[] = [];
      const reportCoverageMatrix = buildCoverageMatrix(
        understanding.atomicClaims,
        boundaries,
        [],
      );
      const assessment = await aggregateAssessment(
        claimVerdicts,
        boundaries,
        [], // Empty evidence pool
        reportCoverageMatrix,
        state,
      );
      endPhase("aggregate");

      const resultJson = buildClaimBoundaryResultJson({
        assessment,
        input,
        state,
        detectedUrl,
        llmProvider: initialPipelineConfig.llmProvider,
        verdictModelName: getModelForTask("verdict", undefined, initialPipelineConfig).modelName,
        understandModelName: getModelForTask("understand", undefined, initialPipelineConfig).modelName,
        extractModelName: getModelForTask("extract_evidence", undefined, initialPipelineConfig).modelName,
        runtimeModelsUsed: new Set<string>(),
        runtimeRoleModels: {},
        searchProvider: initialSearchConfig.provider,
        evidenceBalance: { supporting: 0, contradicting: 0, neutral: 0, total: 0, balanceRatio: 0, isSkewed: false },
        boundaryCount: 0,
      });

      recordOutputQuality(resultJson);

      // Surface contract diagnostic to the user (LLM Expert R2): the user must
      // see WHY the report is damaged, not just THAT it is. The structured
      // contractValidationSummary fields are the primary diagnostic channel.
      const cvs = understanding.contractValidationSummary;
      const summaryLine = cvs?.summary ?? "(no contract summary available)";
      const anchorReason = cvs?.anchorRetryReason;
      const anchorText = cvs?.truthConditionAnchor?.anchorText;
      const reportMarkdown =
        "# ClaimAssessmentBoundary Analysis Report (Damaged)\n\n" +
        "The analysis engine could not faithfully preserve the meaning of your input " +
        "after multiple extraction attempts. Research and verdict stages were skipped " +
        "to prevent a misleading report.\n\n" +
        "**Reason:** " + summaryLine + "\n\n" +
        (anchorText ? "**Truth-condition anchor in input:** `" + anchorText + "`\n\n" : "") +
        (anchorReason ? "**Diagnostic:** " + anchorReason + "\n\n" : "") +
        "Please rephrase your input or contact support if this persists.";
      return { resultJson, reportMarkdown };
    }

    // Record Gate 1 stats after claim extraction
    if (understanding.gate1Stats) {
      recordGate1Stats({
        totalClaims: understanding.gate1Stats.totalClaims,
        passedClaims: understanding.gate1Stats.totalClaims - understanding.gate1Stats.filteredCount,
        filteredReasons: {},
        centralClaimsKept: understanding.atomicClaims.length,
      });
    }

    // Stage 1.5: Automatic check-worthy claim selection when enabled in UCM.
    // When enabled, only selected claims proceed to research;
    // dropped claims stay transparent in resultJson.claimSelection.
    if (initialPipelineConfig.claimAutoSelectionEnabled) {
      checkAbortSignal(input.jobId);
      const candidateCap = normalizeClaimAutoSelectionCandidateCap(initialPipelineConfig.claimAutoSelectionCandidateCap);
      const candidateClaims = understanding.atomicClaims;
      const protectedContractCarrierIds = getProtectedContractCarrierIds(understanding.contractValidationSummary);
      const evaluatedClaims = includeRequiredClaimsForEvaluation(
        candidateClaims,
        candidateCap,
        protectedContractCarrierIds,
      );
      const baseSelectionCap = getClaimAutoSelectionCap(
        evaluatedClaims.length,
        initialPipelineConfig.claimAutoSelectionCap,
      );
      const selectionCap = Math.max(baseSelectionCap, protectedContractCarrierIds.length);

      if (candidateClaims.length > evaluatedClaims.length) {
        state.warnings.push({
          type: "claim_selection_truncated",
          severity: "warning",
          message: `Automatic claim selection evaluated ${evaluatedClaims.length} of ${candidateClaims.length} candidate claims because the configured candidate cap is ${candidateCap}; validated contract carriers are always included.`,
          details: {
            candidateClaimCount: candidateClaims.length,
            evaluatedCandidateClaimCount: evaluatedClaims.length,
            candidateCap,
            protectedContractCarrierIds,
          },
        });
      }

      const buildTerminalReturn = (assessment: OverallAssessment, damaged: boolean, message: string) => {
        const resultJson = buildClaimBoundaryResultJson({
          assessment,
          input,
          state,
          detectedUrl,
          llmProvider: initialPipelineConfig.llmProvider,
          verdictModelName: getModelForTask("verdict", undefined, initialPipelineConfig).modelName,
          understandModelName: getModelForTask("understand", undefined, initialPipelineConfig).modelName,
          extractModelName: getModelForTask("extract_evidence", undefined, initialPipelineConfig).modelName,
          runtimeModelsUsed,
          runtimeRoleModels: {},
          searchProvider: initialSearchConfig.provider,
          evidenceBalance: { supporting: 0, contradicting: 0, neutral: 0, total: 0, balanceRatio: 0, isSkewed: false },
          boundaryCount: 0,
        });
        recordOutputQuality(resultJson);
        return {
          resultJson,
          reportMarkdown: buildClaimSelectionTerminalMarkdown({
            damaged,
            message,
            droppedCount: state.claimSelection?.droppedClaims.length ?? 0,
          }),
        };
      };

      if (evaluatedClaims.length === 0) {
        state.claimSelection = {
          enabled: true,
          mode: "automatic",
          selectionCap,
          candidateCap,
          candidateClaimIds: [],
          evaluatedCandidateClaimIds: [],
          selectedClaimIds: [],
          droppedClaims: [],
          rankedClaimIds: [],
          rationale: "No post-Gate-1 candidate claims were available for automatic selection.",
        };
        state.warnings.push({
          type: "no_checkworthy_claims",
          severity: "warning",
          message: "Automatic claim selection found no candidate claims to research.",
        });
        state.understanding = filterClaimUnderstandingForSelectedClaims(understanding, []);
        startPhase("aggregate");
        const assessment = buildNoResearchAssessment({
          understanding: state.understanding,
          headline: "No check-worthy claims were selected for research.",
          keyFinding: "The analysis stopped before research because no post-Gate-1 atomic claims were available for selection.",
          limitations: "No evidence was gathered and no verdict was generated.",
        });
        endPhase("aggregate");
        return buildTerminalReturn(
          assessment,
          false,
          "Automatic claim selection found no candidate claims worth researching in this run.",
        );
      }

      try {
        onEvent("Selecting check-worthy claims for research...", 20);
        const selectorModel = getModelForTask("context_refinement", undefined, initialPipelineConfig);
        recordRuntimeModelUsage(selectorModel.provider, selectorModel.modelName);
        onEvent(`LLM: ${selectorModel.modelName} — claim selection`, -1);

        const recommendation = await generateClaimSelectionRecommendation({
          originalInput: analysisText,
          impliedClaim: understanding.impliedClaim,
          articleThesis: understanding.articleThesis,
          atomicClaims: evaluatedClaims,
          selectionCap,
          pipelineConfig: initialPipelineConfig,
        });
        const selectedClaimIds = mergeSelectedClaimIdsWithRequired(
          recommendation.recommendedClaimIds,
          protectedContractCarrierIds,
          candidateClaims,
          selectionCap,
        );
        const rankedClaimIds = mergeSelectedClaimIdsWithRequired(
          recommendation.rankedClaimIds,
          protectedContractCarrierIds,
          candidateClaims,
        );

        state.claimSelection = buildClaimSelectionMetadata({
          understanding,
          selectionCap,
          candidateCap,
          evaluatedClaims,
          selectedClaimIds,
          rankedClaimIds,
          rationale: recommendation.rationale,
          assessments: recommendation.assessments,
        });

        state.understanding = filterClaimUnderstandingForSelectedClaims(
          understanding,
          selectedClaimIds,
        );

        if (selectedClaimIds.length === 0) {
          state.warnings.push({
            type: "no_checkworthy_claims",
            severity: "warning",
            message: "Automatic claim selection did not select any claims for research.",
            details: {
              candidateClaimCount: candidateClaims.length,
              evaluatedCandidateClaimCount: evaluatedClaims.length,
              candidateCap,
              selectionCap,
              protectedContractCarrierIds,
            },
          });
          startPhase("aggregate");
          const assessment = buildNoResearchAssessment({
            understanding: state.understanding,
            headline: "No check-worthy claims were selected for research.",
            keyFinding: "The analysis stopped before research because automatic claim selection did not select any atomic claims.",
            limitations: "Dropped atomic claims were not researched and did not affect the verdict.",
          });
          endPhase("aggregate");
          return buildTerminalReturn(
            assessment,
            false,
            "Automatic claim selection did not select any claims for research.",
          );
        }

        onEvent(
          `Selected ${selectedClaimIds.length} of ${candidateClaims.length} claims for research.`,
          25,
        );
      } catch (error) {
        const errorType = error instanceof Error ? error.name : typeof error;
        console.error("[Pipeline] Automatic claim selection failed:", errorType);
        state.warnings.push({
          type: "report_damaged",
          severity: "error",
          message: "Automatic claim selection failed before research. Research and verdict stages were skipped to avoid analyzing an unsafe claim set.",
          details: {
            errorType,
            candidateClaimCount: candidateClaims.length,
            evaluatedCandidateClaimCount: evaluatedClaims.length,
            candidateCap,
            selectionCap,
          },
        });
        state.claimSelection = buildClaimSelectionFailureMetadata({
          understanding,
          selectionCap,
          candidateCap,
          evaluatedClaims,
          rationale: "Automatic claim selection failed before research; this claim was not researched.",
        });
        state.understanding = filterClaimUnderstandingForSelectedClaims(understanding, []);
        startPhase("aggregate");
        const assessment = buildNoResearchAssessment({
          understanding: state.understanding,
          headline: "Automatic claim selection failed.",
          keyFinding: "The analysis stopped before research because the selector did not return a valid claim set.",
          limitations: "No evidence was gathered and no verdict was generated. Dropped atomic claims were preserved for possible separate resubmission.",
        });
        endPhase("aggregate");
        return buildTerminalReturn(
          assessment,
          true,
          "Automatic claim selection failed before research. Research and verdict stages were skipped to avoid analyzing an unsafe claim set.",
        );
      }
    }

    const researchUnderstanding = state.understanding ?? understanding;

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
        severity: "info",
        message: `Evidence pool is heavily skewed toward ${direction} evidence (${majorityPct}%, ${majorityCount} of ${directional} directional items). ` +
          `${evidenceBalance.supporting} supporting, ${evidenceBalance.contradicting} contradicting, ${evidenceBalance.neutral} neutral out of ${evidenceBalance.total} total.`,
      });
      console.warn(
        `[Pipeline] Evidence pool imbalance detected: ${evidenceBalance.supporting}S/${evidenceBalance.contradicting}C/${evidenceBalance.neutral}N ` +
        `(${direction}: ${majorityPct}%, ${majorityCount}/${directional} directional, threshold: ${Math.round(skewThreshold * 100)}%)`
      );

      // D5 Control 3: Contrarian Retrieval — seek underrepresented evidence
      const contrarianEnabled = initialCalcConfig.contrarianRetrievalEnabled ?? true;
      const contrarianMaxQueries = initialCalcConfig.contrarianMaxQueriesPerClaim ?? 2;
      if (contrarianEnabled && contrarianMaxQueries > 0) {
        const contrarianStartMs = Date.now();
        const contrarianCeilingPct = initialCalcConfig.contrarianRuntimeCeilingPct ?? 15;
        const pipelineElapsedMs = contrarianStartMs - (state.pipelineStartMs ?? contrarianStartMs);
        const timeBudgetMs = initialPipelineConfig.researchTimeBudgetMs ?? 10 * 60 * 1000;
        const ceilingMs = timeBudgetMs * (contrarianCeilingPct / 100);
        const withinBudget = isNaN(pipelineElapsedMs) || pipelineElapsedMs < (timeBudgetMs - ceilingMs);

        if (withinBudget) {
          onEvent("Running contrarian evidence search...", 58);
          console.info(`[Pipeline] D5 Control 3: Starting contrarian retrieval (max ${contrarianMaxQueries} queries/claim)`);

          const beforeCount = state.evidenceItems.length;
          try {
            // Run contrarian iteration for each claim (limited by contrarianMaxQueries per claim)
            for (const claim of researchUnderstanding.atomicClaims) {
              await runResearchIteration(
                claim,
                "contrarian",
                initialSearchConfig,
                initialPipelineConfig,
                contrarianMaxQueries,
                new Date().toISOString().split("T")[0],
                state,
              );
            }
          } catch (contrarianError) {
            // Fail-open: contrarian retrieval errors are non-fatal
            console.warn("[Pipeline] D5 contrarian retrieval failed (non-fatal):", contrarianError);
            state.warnings.push({
              type: "evidence_pool_imbalance" as const,
              severity: "info" as const,
              message: `Contrarian retrieval failed: ${contrarianError instanceof Error ? contrarianError.message : String(contrarianError)}. Continuing with existing evidence pool.`,
            });
          }

          const newItems = state.evidenceItems.length - beforeCount;
          const contrarianDurationMs = Date.now() - contrarianStartMs;
          console.info(
            `[Pipeline] D5 contrarian retrieval complete: ${newItems} new items in ${Math.round(contrarianDurationMs / 1000)}s`
          );

          // Re-assess evidence balance after contrarian pass
          if (newItems > 0) {
            const rebalanced = assessEvidenceBalance(state.evidenceItems, skewThreshold, minDirectional);
            console.info(
              `[Pipeline] Post-contrarian balance: ${rebalanced.supporting}S/${rebalanced.contradicting}C/${rebalanced.neutral}N ` +
              `(skewed: ${rebalanced.isSkewed})`
            );
          }
        } else {
          console.info("[Pipeline] D5 contrarian retrieval skipped: approaching runtime ceiling");
        }
      }
    }

    const applicabilityRelevantGeographies = getClaimsRelevantGeographies(
      researchUnderstanding.atomicClaims,
      researchUnderstanding.inferredGeography ?? null,
    );
    let directApplicabilityRequiredForD5 =
      (initialPipelineConfig.applicabilityFilterEnabled ?? true)
      && applicabilityRelevantGeographies.length > 0
      && state.evidenceItems.length > 0;

    // Fix 3: Post-extraction applicability assessment (safety net for jurisdiction contamination)
    if (initialPipelineConfig.applicabilityFilterEnabled ?? true) {
      checkAbortSignal(input.jobId);
      onEvent("Assessing evidence applicability...", 58);
      onEvent(`LLM call: evidence applicability — ${getModelForTask("understand", undefined, initialPipelineConfig).modelName}`, -1);
      const beforeApplicability = state.evidenceItems.length;
      const assessed = await assessEvidenceApplicability(
        researchUnderstanding.atomicClaims,
        state.evidenceItems,
        researchUnderstanding.inferredGeography ?? null,
        initialPipelineConfig,
        applicabilityRelevantGeographies,
        state.warnings,
      );
      const removedItems = assessed.filter(
        (item) => item.applicability === "foreign_reaction"
      );
      recordApplicabilityRemovalTelemetry(state, removedItems);
      state.evidenceItems = assessed.filter(
        (item) => item.applicability !== "foreign_reaction"
      );
      const removedCount = beforeApplicability - state.evidenceItems.length;
      if (removedCount > 0) {
        console.info(
          `[Fix3] Removed ${removedCount} foreign_reaction evidence items (${beforeApplicability} → ${state.evidenceItems.length})`
        );
        state.warnings.push({
          type: "evidence_applicability_filter" as const,
          severity: "info" as const,
          message: `Applicability filter removed ${removedCount} foreign-jurisdiction evidence items.`,
          details: { removedCount, beforeCount: beforeApplicability, afterCount: state.evidenceItems.length },
        });
      }
    }

    // Direct-applicability is required for D5 only when the applicability classifier
    // actually ran; on infra degradation (no surviving item assessed) it must not be
    // required — otherwise an infra failure collapses verdicts (fail-closed
    // regression). See resolveDirectApplicabilityRequirement.
    directApplicabilityRequiredForD5 = resolveDirectApplicabilityRequirement(
      directApplicabilityRequiredForD5,
      state.evidenceItems,
    );

    // Stage 3: Cluster Boundaries
    checkAbortSignal(input.jobId);
    onEvent("Clustering evidence into boundaries...", 60);
    startPhase("cluster");
    const boundaries = await clusterBoundaries(state);
    state.claimBoundaries = boundaries;
    finalizeClaimAcquisitionTelemetry(state);
    endPhase("cluster");

    // D5 Control 1: Evidence Sufficiency Gate — per-claim evidence check
    const sufficiencyMinItems = initialCalcConfig.evidenceSufficiencyMinItems ?? 3;
    const sufficiencyMinSourceTypes = initialCalcConfig.evidenceSufficiencyMinSourceTypes ?? 2;
    const sufficiencyMinDistinctDomains = initialCalcConfig.evidenceSufficiencyMinDistinctDomains ?? 3;
    const sufficiencyMinDirectionalItems = initialCalcConfig.evidenceSufficiencyMinDirectionalItems ?? 1;
    const authoritativeDirectionalMinItems = initialCalcConfig.evidenceSufficiencyAuthoritativeDirectionalMinItems ?? 2;
    const authoritativeDirectionalSourceTypes =
      initialCalcConfig.evidenceSufficiencyAuthoritativeDirectionalSourceTypes ?? [];
    const insufficientClaimIds = new Set<string>();
    const insufficientClaimReasons = new Map<string, "insufficient_evidence" | "insufficient_direct_evidence">();
    for (const claim of researchUnderstanding.atomicClaims) {
      const claimEvidence = state.evidenceItems.filter(
        e => e.relevantClaimIds?.includes(claim.id)
      );
      const sufficiency = evaluateEvidenceSufficiency(claimEvidence, {
        minItems: sufficiencyMinItems,
        minSourceTypes: sufficiencyMinSourceTypes,
        minDistinctDomains: sufficiencyMinDistinctDomains,
        minDirectionalItems: sufficiencyMinDirectionalItems,
        authoritativeDirectionalMinItems,
        authoritativeDirectionalSourceTypes,
        includeSeeded: true,
        requireDirectApplicability: directApplicabilityRequiredForD5,
      });

      if (!sufficiency.sufficient) {
        const lacksDirectDirectionalEvidence =
          directApplicabilityRequiredForD5
          && sufficiencyMinDirectionalItems > 0
          && sufficiency.hasSufficientItems
          && sufficiency.totalDirectionalCount >= sufficiencyMinDirectionalItems
          && !sufficiency.hasMinimumDirectionalEvidence;
        const warningType = lacksDirectDirectionalEvidence
          ? "insufficient_direct_evidence"
          : "insufficient_evidence";
        const directionalLabel = directApplicabilityRequiredForD5
          ? "direct directional items"
          : "directional items";
        insufficientClaimIds.add(claim.id);
        insufficientClaimReasons.set(claim.id, warningType);
        state.warnings.push({
          type: warningType,
          severity: "warning",
          message: `Claim ${claim.id} has insufficient evidence for reliable verdict: ` +
            `${sufficiency.itemCount} items (min ${sufficiencyMinItems}), ` +
            `${sufficiency.directionalCount} ${directionalLabel} (min ${sufficiencyMinDirectionalItems}), ` +
            `${sufficiency.distinctSourceTypeCount} source types (min ${sufficiencyMinSourceTypes}), ` +
            `${sufficiency.distinctDomainCount} normalized domains (min ${sufficiencyMinDistinctDomains}). ` +
            `Verdict set to UNVERIFIED.`,
          details: {
            claimId: claim.id,
            totalDirectionalCount: sufficiency.totalDirectionalCount,
            directDirectionalCount: sufficiency.directionalCount,
            nonDirectDirectionalCount: sufficiency.nonDirectDirectionalCount,
            directApplicabilityRequired: directApplicabilityRequiredForD5,
          },
        });
      }
    }
    const sufficientClaims = researchUnderstanding.atomicClaims.filter(c => !insufficientClaimIds.has(c.id));
    const insufficientClaims = researchUnderstanding.atomicClaims.filter(c => insufficientClaimIds.has(c.id));

    // Explicit assessable-claims path: only D5-sufficient claims proceed to Stage 4.
    // Insufficient claims receive D5 fallback verdicts (UNVERIFIED) without entering
    // the debate. No "better something than nothing" fallback that re-sends D5-rejected
    // claims into Stage 4 — that caused duplicate verdicts in the 2705/e407 failure class.
    const assessableClaims = sufficientClaims;

    // Build Stage-4 coverage matrix from assessable claims only (used during debate).
    const stage4CoverageMatrix = buildCoverageMatrix(
      assessableClaims,
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
    const roleTraceRecorder = (trace: { debateRole: string; promptKey: string; provider: string; model: string; strength: string; fallbackUsed: boolean }) => {
      runtimeRoleTraces.push(trace);
    };
    const sufficientVerdicts = await runVerdictStageWithPreflight({
      claims: assessableClaims,
      evidenceItems: state.evidenceItems,
      boundaries,
      coverageMatrix: stage4CoverageMatrix,
      warnings: state.warnings,
      pipelineConfig: initialPipelineConfig,
      sources: state.sources,
      onEvent,
      jobId: input.jobId,
      recordRuntimeModelUsage,
      roleTraceRecorder,
      reportLanguage: state.languageIntent?.reportLanguage,
    });

    // D5 Control 1: Create UNVERIFIED verdicts for insufficient claims
    const insufficientVerdicts: CBClaimVerdict[] = insufficientClaims.map((claim) => {
      const verdictReason = insufficientClaimReasons.get(claim.id) ?? "insufficient_evidence";
      const reasoning = verdictReason === "insufficient_direct_evidence"
        ? "Insufficient direct evidence to produce a reliable verdict. " +
          "This claim did not have enough claim-local, explicitly direct supporting or contradicting evidence for a publishable verdict."
        : "Insufficient evidence to produce a reliable verdict. " +
          "This claim did not meet the minimum evidence requirements (items plus source-type/domain diversity).";
      return createUnverifiedFallbackVerdict(claim, verdictReason, reasoning);
    });

    let claimVerdicts = [...sufficientVerdicts, ...insufficientVerdicts];

    // Verdict uniqueness invariant: each claimId must appear at most once.
    // Duplicates indicate a pipeline state corruption (e.g., D5 fallback + Stage 4
    // both producing verdicts for the same claim). Fail the job immediately rather
    // than allowing corrupted data to propagate to aggregation and the report.
    const claimIdCounts = new Map<string, number>();
    for (const v of claimVerdicts) {
      claimIdCounts.set(v.claimId, (claimIdCounts.get(v.claimId) ?? 0) + 1);
    }
    const duplicateIds = [...claimIdCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
    if (duplicateIds.length > 0) {
      const msg = `PIPELINE INVARIANT VIOLATION: Duplicate claim verdicts detected for claimId(s): ${duplicateIds.join(", ")}. ` +
        `This indicates a pipeline state corruption — D5 fallback and Stage 4 both produced verdicts for the same claim(s).`;
      state.warnings.push({
        type: "verdict_integrity_failure" as any,
        severity: "error",
        message: msg,
        details: { duplicateClaimIds: duplicateIds, totalVerdicts: claimVerdicts.length },
      });
      throw new Error(msg);
    }

    // B-7: Strip misleadingness fields if annotation mode doesn't include them
    if (initialPipelineConfig.claimAnnotationMode !== "verifiability_and_misleadingness") {
      for (const v of claimVerdicts) {
        delete v.misleadingness;
        delete v.misleadingnessReason;
      }
    }

    // Record Gate 4 stats after verdicts (before SR weighting — captures raw confidence)
    recordGate4Stats(claimVerdicts);

    const srCalibrationMode = initialPipelineConfig.sourceReliabilityCalibrationMode ?? "off";
    const srCalibrationEnabled =
      (initialPipelineConfig.sourceReliabilityCalibrationEnabled ?? false) &&
      srCalibrationMode !== "off";

    if (srCalibrationEnabled) {
      // Stage 4.5: LLM-backed source-reliability calibration.
      // Calls the LLM to assess source portfolios, then applies bounded confidence adjustments.
      // On LLM failure, gracefully degrades to metadata-only (no adjustment, skipped warning).
      onEvent("Calibrating source reliability...", 82);
      const calibrationRequest = buildSourceReliabilityCalibrationInput(
        claimVerdicts,
        state.evidenceItems,
        state.sources,
        initialCalcConfig,
        initialPipelineConfig,
      );
      const srResults = await callSRCalibrationLLM(
        calibrationRequest,
        initialCalcConfig,
        initialPipelineConfig,
      );
      const calibration = applySourceReliabilityCalibrationResults(
        claimVerdicts,
        calibrationRequest,
        initialCalcConfig,
        srResults,
      );
      if (!srResults) {
        calibration.warnings.push({
          type: "source_reliability_calibration_skipped",
          severity: "info",
          message: "Source-reliability calibration is enabled but no calibration result is available yet. Legacy SR weighting is intentionally skipped while Stage 4.5 is enabled.",
          details: { mode: calibrationRequest.mode },
        });
      }
      claimVerdicts = calibration.verdicts;
      state.warnings.push(...calibration.warnings);
    } else if ((initialPipelineConfig.evidenceWeightingEnabled ?? true) &&
        state.sources.some((s) => s.trackRecordScore !== null)) {
      // Legacy SR weighting path: preserved as fallback until Stage 4.5 prompt-backed
      // calibration is implemented and validated.
      const unknownSourceScore = initialCalcConfig.sourceReliability?.defaultScore ?? null;
      claimVerdicts = applyEvidenceWeighting(
        claimVerdicts,
        state.evidenceItems,
        state.sources,
        { unknownSourceScore }
      );
    }

    // Build the report coverage matrix from ALL final claim verdicts (assessable + UNVERIFIED).
    // This is what the user sees — UNVERIFIED claims get columns with zero evidence counts,
    // honestly representing the assessment coverage gap.
    const allFinalClaimIds = claimVerdicts.map((v) => v.claimId);
    const reportCoverageMatrix = buildCoverageMatrix(
      researchUnderstanding.atomicClaims.filter((c) => allFinalClaimIds.includes(c.id)),
      boundaries,
      state.evidenceItems,
    );

    // Stage 5: Aggregate
    checkAbortSignal(input.jobId);
    onEvent("Aggregating final assessment...", 90);
    startPhase("aggregate");
    const assessment = await aggregateAssessment(
      claimVerdicts,
      boundaries,
      state.evidenceItems,
      reportCoverageMatrix,
      state
    );
    endPhase("aggregate");

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
          const llmCallFn = createProductionLLMCall(
            initialPipelineConfig,
            state.warnings,
            recordRuntimeModelUsage,
            roleTraceRecorder,
          );
          qualityCheck.rubricScores = await evaluateExplanationRubric(
            assessment.verdictNarrative,
            researchUnderstanding.atomicClaims.length,
            state.evidenceItems.length,
            llmCallFn,
          );
        } catch (rubricError) {
          // M2 fix: rubric failure is non-fatal — degrade to structural-only
          console.warn("[Stage5] B-8 rubric evaluation failed, degrading to structural-only:", rubricError);
          state.warnings.push({
            type: "explanation_quality_rubric_failed",
            severity: "info",
            message: `Explanation quality rubric evaluation failed: ${rubricError instanceof Error ? rubricError.message : String(rubricError)}. Structural checks still available.`,
          });
        }
      }
      assessment.explanationQualityCheck = qualityCheck;
      console.info(`[Stage5] B-8 explanation quality check (${explanationQualityMode}):`, JSON.stringify(qualityCheck));
    }

    // Stage 6: Holistic TIGERScore evaluation (Beta)
    if (initialPipelineConfig.tigerScoreMode === "on") {
      onEvent("Performing holistic TIGERScore quality evaluation...", 95);
      try {
        const llmCallFn = createProductionLLMCall(
          initialPipelineConfig,
          state.warnings,
          recordRuntimeModelUsage,
          roleTraceRecorder,
        );
        assessment.tigerScore = await evaluateTigerScore(
          state.originalInput,
          assessment,
          state.evidenceItems.length,
          state.sources.length,
          llmCallFn,
          initialPipelineConfig
        );
        console.info("[Stage 6] TIGERScore evaluation complete:", JSON.stringify(assessment.tigerScore));
      } catch (tigerError) {
        console.warn("[Stage 6] TIGERScore evaluation failed:", tigerError);
        state.warnings.push({
          type: "tiger_score_failed",
          severity: "info",
          message: `Holistic TIGERScore evaluation failed: ${tigerError instanceof Error ? tigerError.message : String(tigerError)}`,
        });
      }
    }

    onEvent("Analysis complete.", 100);

    // Collect unique search providers from searchQueries
    const searchProviders = [...new Set(
      state.searchQueries
        .map(sq => sq.searchProvider)
        .filter(Boolean)
    )].join(", ");

    // Get LLM model information for all task tiers (for result metadata)
    const verdictModel = getModelForTask("verdict", undefined, initialPipelineConfig);
    const understandModel = getModelForTask("understand", undefined, initialPipelineConfig);
    const extractModel = getModelForTask("extract_evidence", undefined, initialPipelineConfig);
    recordRuntimeModelUsage(understandModel.provider, understandModel.modelName);
    recordRuntimeModelUsage(extractModel.provider, extractModel.modelName);
    recordRuntimeModelUsage(verdictModel.provider, verdictModel.modelName);

    // B-1: Aggregate runtime role traces into per-role summary
    const runtimeRoleModels: Record<string, { provider: string; model: string; strength: string; callCount: number; fallbackUsed: boolean }> = {};
    for (const trace of runtimeRoleTraces) {
      const existing = runtimeRoleModels[trace.debateRole];
      if (existing) {
        existing.callCount++;
        if (trace.fallbackUsed) existing.fallbackUsed = true;
      } else {
        runtimeRoleModels[trace.debateRole] = {
          provider: trace.provider,
          model: trace.model,
          strength: trace.strength,
          callCount: 1,
          fallbackUsed: trace.fallbackUsed,
        };
      }
    }

    // Wrap assessment in resultJson structure (no AnalysisContext references)
    const resultJson = buildClaimBoundaryResultJson({
      assessment,
      input,
      state,
      detectedUrl,
      llmProvider: initialPipelineConfig.llmProvider,
      verdictModelName: verdictModel.modelName,
      understandModelName: understandModel.modelName,
      extractModelName: extractModel.modelName,
      runtimeModelsUsed,
      runtimeRoleModels,
      searchProvider: initialSearchConfig.provider,
      searchProviders,
      evidenceBalance,
      promptContentHash,
      boundaryCount: boundaries.length,
    });

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

  }); // end runWithMetrics
}

type RunVerdictStageWithPreflightArgs = {
  claims: AtomicClaim[];
  evidenceItems: EvidenceItem[];
  boundaries: ClaimAssessmentBoundary[];
  coverageMatrix: CoverageMatrix;
  warnings: AnalysisWarning[];
  pipelineConfig: PipelineConfig;
  sources: FetchedSource[];
  onEvent?: (message: string, progress: number) => void;
  jobId?: string;
  recordRuntimeModelUsage?: (provider?: string, modelName?: string) => void;
  roleTraceRecorder?: (trace: { debateRole: string; promptKey: string; provider: string; model: string; strength: string; fallbackUsed: boolean }) => void;
  probeFn?: typeof probeLLMConnectivity;
  generateVerdictsFn?: typeof generateVerdicts;
  isSystemPausedFn?: typeof isSystemPaused;
  reportLanguage?: string;
};

/**
 * Run Stage 4 with a lightweight connectivity preflight.
 *
 * The preflight closes the first-outage-hit gap: if the configured primary LLM
 * provider is clearly unreachable before verdict generation starts, the job
 * fails fast instead of fabricating fallback UNVERIFIED verdicts.
 */
export async function runVerdictStageWithPreflight({
  claims,
  evidenceItems,
  boundaries,
  coverageMatrix,
  warnings,
  pipelineConfig,
  sources,
  onEvent,
  jobId,
  recordRuntimeModelUsage,
  roleTraceRecorder,
  probeFn = probeLLMConnectivity,
  generateVerdictsFn = generateVerdicts,
  isSystemPausedFn = isSystemPaused,
  reportLanguage,
}: RunVerdictStageWithPreflightArgs): Promise<CBClaimVerdict[]> {
  if (claims.length === 0) {
    return [];
  }

  checkAbortSignal(jobId);
  const provider = pipelineConfig.llmProvider ?? "anthropic";
  const probe = await probeFn({ provider });
  if (!probe.reachable) {
    const errorMessage = probe.error ?? "connectivity probe failed";
    const classified = classifyError(new Error(errorMessage));
    if (classified.shouldCountAsProviderFailure && classified.provider === "llm") {
      const { circuitOpened } = recordProviderFailure("llm", classified.message);
      if (circuitOpened) {
        pauseSystem(
          `LLM connectivity preflight failed before Stage 4 verdict: ${classified.category} — ${classified.message.substring(0, 200)}`,
        );
      }
    }
    console.error(
      `[Pipeline] Pre-Stage-4 connectivity probe failed for ${provider} (${probe.durationMs}ms): ${errorMessage}`,
    );
    throw new Error(
      `Stage 4 aborted before verdict generation: ${provider} connectivity probe failed (${errorMessage})`,
    );
  }

  onEvent?.("Generating verdicts...", 70);
  startPhase("verdict");
  try {
    return await generateVerdictsFn(
      claims,
      evidenceItems,
      boundaries,
      coverageMatrix,
      undefined, // llmCall — use production default
      warnings,
      recordRuntimeModelUsage,
      roleTraceRecorder,
      onEvent,
      jobId,
      sources,
      reportLanguage,
    );
  } catch (verdictError: unknown) {
    const errorMessage = verdictError instanceof Error
      ? verdictError.message
      : String(verdictError);
    if (errorMessage.includes("was cancelled")) {
      throw verdictError;
    }
    if (isSystemPausedFn()) {
      console.error("[Pipeline] Stage 4 failed and system is PAUSED — aborting job instead of producing damaged results.");
      throw verdictError;
    }
    const errorFingerprint = createErrorFingerprint(verdictError);
    console.error("[Pipeline] Stage 4 verdict generation failed; returning fallback verdicts:", verdictError);
    warnings.push({
      type: "analysis_generation_failed",
      severity: "error",
      message:
        `Verdict generation failed for ${claims.length} claim(s); fallback UNVERIFIED verdicts returned.`,
      details: {
        stage: "verdict",
        claimCount: claims.length,
        errorFingerprint,
        errorName: verdictError instanceof Error ? verdictError.name : "UnknownError",
        errorMessage: errorMessage.slice(0, 300),
      },
    });
    return claims.map((claim) =>
      createUnverifiedFallbackVerdict(
        claim,
        "analysis_generation_failed",
        "Verdict generation failed due to an internal runtime error. Claim marked UNVERIFIED as a fail-open fallback.",
      )
    );
  } finally {
    endPhase("verdict");
  }
}

// Stage 1 (claim extraction) extracted to claim-extraction-stage.ts

// ============================================================================
// STAGE 2: RESEARCH (§8.2) — remaining in orchestrator pending future extraction
// ============================================================================

// Stage 2 query generation logic and schemas extracted to research-query-stage.ts

// Stages 1, 3, 4, 5 and parts of Stage 2 extracted to modular files.
// Orchestrator keeps Stage 2 research loop (query generation and source acquisition) for now.

// Stage 2 research orchestration (researchEvidence, runResearchIteration, seedEvidenceFromPreliminarySearch) moved to research-orchestrator.ts

// generateResearchQueries extracted to research-query-stage.ts

// Helper functions like classifyRelevance, extractResearchEvidence, etc. extracted to research-extraction-stage.ts

// fetchSources extracted to research-acquisition-stage.ts

// extractResearchEvidence extracted to research-extraction-stage.ts

// assessScopeQuality and assessEvidenceBalance extracted to research-extraction-stage.ts

// Stage 4 (verdict generation + debate config checks) extracted to verdict-generation-stage.ts
