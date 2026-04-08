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
  ClaimVerdict7Point,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  EvidenceScope,
  ExplanationQualityCheck,
  FetchedSource,
  AnalysisInput,
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
  findLeastContradictedClaim,
  findLeastResearchedClaim,
  getClaimQueryBudgetRemaining,
  getClaimQueryBudgetUsed,
  getPerClaimQueryBudget,
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
  findLeastContradictedClaim,
  findLeastResearchedClaim,
  getClaimQueryBudgetRemaining,
  getClaimQueryBudgetUsed,
  getPerClaimQueryBudget,
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
            for (const claim of understanding.atomicClaims) {
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

    // Fix 3: Post-extraction applicability assessment (safety net for jurisdiction contamination)
    if (initialPipelineConfig.applicabilityFilterEnabled ?? true) {
      checkAbortSignal(input.jobId);
      onEvent("Assessing evidence applicability...", 58);
      onEvent(`LLM call: evidence applicability — ${getModelForTask("understand", undefined, initialPipelineConfig).modelName}`, -1);
      const beforeApplicability = state.evidenceItems.length;
      const assessed = await assessEvidenceApplicability(
        understanding.atomicClaims,
        state.evidenceItems,
        understanding.inferredGeography ?? null,
        initialPipelineConfig,
        getClaimsRelevantGeographies(
          understanding.atomicClaims,
          understanding.inferredGeography ?? null,
        ),
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
    const authoritativeDirectionalMinItems = initialCalcConfig.evidenceSufficiencyAuthoritativeDirectionalMinItems ?? 2;
    const authoritativeDirectionalSourceTypes = new Set(
      initialCalcConfig.evidenceSufficiencyAuthoritativeDirectionalSourceTypes ?? ["government_report", "legal_document"],
    );
    const insufficientClaimIds = new Set<string>();
    for (const claim of understanding.atomicClaims) {
      const claimEvidence = state.evidenceItems.filter(
        e => e.relevantClaimIds?.includes(claim.id)
      );
      const distinctSourceTypes = new Set(
        claimEvidence.map(e => e.sourceType).filter(Boolean)
      );
      const distinctDomains = new Set(
        claimEvidence
          .map((e) => extractDomain(e.sourceUrl))
          .filter((domain): domain is string => Boolean(domain))
      );
      const hasSufficientItems = claimEvidence.length >= sufficiencyMinItems;
      const hasSufficientSourceDiversity =
        distinctSourceTypes.size >= sufficiencyMinSourceTypes ||
        distinctDomains.size >= sufficiencyMinDistinctDomains;
      const directionalEvidence = claimEvidence.filter(
        (e) => e.claimDirection === "supports" || e.claimDirection === "contradicts",
      );
      const hasAuthoritativeDirectionalSufficiency =
        hasSufficientItems &&
        directionalEvidence.length >= authoritativeDirectionalMinItems &&
        directionalEvidence.every((e) => Boolean(e.sourceType) && authoritativeDirectionalSourceTypes.has(e.sourceType!)) &&
        directionalEvidence.every((e) => e.probativeValue !== "low") &&
        new Set(directionalEvidence.map((e) => e.claimDirection)).size === 1;

      if (!hasSufficientItems || (!hasSufficientSourceDiversity && !hasAuthoritativeDirectionalSufficiency)) {
        insufficientClaimIds.add(claim.id);
        state.warnings.push({
          type: "insufficient_evidence",
          severity: "warning",
          message: `Claim ${claim.id} has insufficient evidence for reliable verdict: ` +
            `${claimEvidence.length} items (min ${sufficiencyMinItems}), ` +
            `${distinctSourceTypes.size} source types (min ${sufficiencyMinSourceTypes}), ` +
            `${distinctDomains.size} normalized domains (min ${sufficiencyMinDistinctDomains}). ` +
            `Verdict set to UNVERIFIED.`,
        });
      }
    }
    const sufficientClaims = understanding.atomicClaims.filter(c => !insufficientClaimIds.has(c.id));
    const insufficientClaims = understanding.atomicClaims.filter(c => insufficientClaimIds.has(c.id));

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
    const insufficientVerdicts: CBClaimVerdict[] = insufficientClaims.map((claim) =>
      createUnverifiedFallbackVerdict(
        claim,
        "insufficient_evidence",
        "Insufficient evidence to produce a reliable verdict. " +
          "This claim did not meet the minimum evidence requirements (items plus source-type/domain diversity).",
      )
    );

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
      understanding.atomicClaims.filter((c) => allFinalClaimIds.includes(c.id)),
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
            understanding.atomicClaims.length,
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
    const resultJson = {
      _schemaVersion: "3.2.0-cb", // ClaimAssessmentBoundary pipeline schema
      meta: {
        schemaVersion: "3.2.0-cb",
        generatedUtc: new Date().toISOString(),
        pipeline: "claimboundary",
        llmProvider: initialPipelineConfig.llmProvider ?? "anthropic",
        llmModel: verdictModel.modelName,
        modelsUsed: {
          understand: understandModel.modelName,
          extractEvidence: extractModel.modelName,
          verdict: verdictModel.modelName,
        },
        modelsUsedAll: Array.from(runtimeModelsUsed),
        runtimeRoleModels,
        searchProvider: initialSearchConfig.provider,
        searchProviders: searchProviders || undefined, // Aggregate of actually-used providers
        inputType: input.inputType,
        detectedInputType: state.understanding?.detectedInputType ?? input.inputType,
        sourceUrl: input.inputType === "url" ? input.inputValue : detectedUrl,
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
        promptContentHash,
      },
      // Language contract (Proposal 2)
      languageIntent: state.languageIntent,
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
        trackRecordConfidence: s.trackRecordConfidence,
        trackRecordConsensus: s.trackRecordConsensus,
        category: s.category,
        fetchSuccess: s.fetchSuccess,
        searchQuery: s.searchQuery,
      })),
      searchQueries: state.searchQueries,
      claimAcquisitionLedger: state.claimAcquisitionLedger,

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
