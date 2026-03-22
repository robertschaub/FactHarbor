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

// Config loading
import { loadPipelineConfig, loadSearchConfig, loadCalcConfig, loadPromptConfig } from "@/lib/config-loader";
import type { PipelineConfig, SearchConfig, CalcConfig } from "@/lib/config-schemas";
import type { LLMProviderType } from "@/lib/analyzer/types";
import { getConfig } from "@/lib/config-storage";
import { captureConfigSnapshotAsync, getSRConfigSummary } from "@/lib/config-snapshots";

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
  if (input.jobId) {
    await Promise.all([
      loadPromptConfig("claimboundary", input.jobId),
      getConfig("sr", "default", { jobId: input.jobId }),
    ]).then(([, srConfigResult]) => {
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

  // Initialize metrics collection for this job after config load to capture runtime providers
  if (input.jobId) {
    initializeMetrics(input.jobId, "claimboundary", initialPipelineConfig, initialSearchConfig);
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
      );
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
    endPhase("cluster");

    // Build coverage matrix (between Stage 3 and 4, per §8.5.1)
    const coverageMatrix = buildCoverageMatrix(
      understanding.atomicClaims,
      boundaries,
      state.evidenceItems
    );

    // D5 Control 1: Evidence Sufficiency Gate — per-claim evidence check
    const sufficiencyMinItems = initialCalcConfig.evidenceSufficiencyMinItems ?? 3;
    const sufficiencyMinSourceTypes = initialCalcConfig.evidenceSufficiencyMinSourceTypes ?? 2;
    const sufficiencyMinDistinctDomains = initialCalcConfig.evidenceSufficiencyMinDistinctDomains ?? 3;
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
      if (!hasSufficientItems || !hasSufficientSourceDiversity) {
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
    const roleTraceRecorder = (trace: { debateRole: string; promptKey: string; provider: string; model: string; strength: string; fallbackUsed: boolean }) => {
      runtimeRoleTraces.push(trace);
    };

    // D5 Control 1: Only send sufficient claims through verdict stage
    const verdictInputClaims = insufficientClaimIds.size > 0 ? sufficientClaims : understanding.atomicClaims;
    let sufficientVerdicts: CBClaimVerdict[] = [];
    if (verdictInputClaims.length > 0) {
      try {
        sufficientVerdicts = await generateVerdicts(
          verdictInputClaims,
          state.evidenceItems,
          boundaries,
          coverageMatrix,
          undefined, // llmCall — use production default
          state.warnings,
          recordRuntimeModelUsage,
          roleTraceRecorder,
          onEvent,
          input.jobId,
        );
      } catch (verdictError: unknown) {
        const errorMessage = verdictError instanceof Error
          ? verdictError.message
          : String(verdictError);
        if (errorMessage.includes("was cancelled")) {
          throw verdictError;
        }
        const errorFingerprint = createErrorFingerprint(verdictError);
        console.error("[Pipeline] Stage 4 verdict generation failed; returning fallback verdicts:", verdictError);
        state.warnings.push({
          type: "analysis_generation_failed",
          severity: "error",
          message:
            `Verdict generation failed for ${verdictInputClaims.length} claim(s); fallback UNVERIFIED verdicts returned.`,
          details: {
            stage: "verdict",
            claimCount: verdictInputClaims.length,
            errorFingerprint,
            errorName: verdictError instanceof Error ? verdictError.name : "UnknownError",
            errorMessage: errorMessage.slice(0, 300),
          },
        });
        sufficientVerdicts = verdictInputClaims.map((claim) =>
          createUnverifiedFallbackVerdict(
            claim,
            "analysis_generation_failed",
            "Verdict generation failed due to an internal runtime error. Claim marked UNVERIFIED as a fail-open fallback.",
          )
        );
      }
    }

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
    endPhase("verdict");

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

    // Stage 5: Aggregate
    checkAbortSignal(input.jobId);
    onEvent("Aggregating final assessment...", 90);
    startPhase("aggregate");
    const assessment = await aggregateAssessment(
      claimVerdicts,
      boundaries,
      state.evidenceItems,
      coverageMatrix,
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
        trackRecordConfidence: s.trackRecordConfidence,
        trackRecordConsensus: s.trackRecordConsensus,
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

// Stage 1 (claim extraction) extracted to claim-extraction-stage.ts

// ============================================================================
// STAGE 2: RESEARCH (§8.2) — remaining in orchestrator pending future extraction
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
    jurisdictionMatch: z.enum(["direct", "contextual", "foreign_reaction"]).catch("contextual"),
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
    analyticalDimension: z.string().optional().catch(undefined),
    additionalDimensions: z.record(z.string()).optional(),
  }),
  probativeValue: z.enum(["high", "medium", "low"]),
  sourceType: z.string().optional()
    .transform((value) => normalizeExtractedSourceType(value)),
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
  const effectiveJobId = jobId ?? state.jobId;
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default", effectiveJobId),
    loadSearchConfig("default", effectiveJobId),
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
  const reservedContradiction = pipelineConfig.contradictionReservedIterations ?? 1;
  const maxMainIterations = maxIterations - reservedContradiction;
  const sufficiencyThreshold = pipelineConfig.claimSufficiencyThreshold ?? 3;
  // MT-1: minimum main iterations before sufficiency check can fire (default: 1)
  const sufficiencyMinMainIterations = pipelineConfig.sufficiencyMinMainIterations ?? 1;
  const maxSourcesPerIteration = searchConfig.maxSourcesPerIteration ?? 8;
  const timeBudgetMs = pipelineConfig.researchTimeBudgetMs ?? 10 * 60 * 1000;
  const zeroYieldBreakThreshold = pipelineConfig.researchZeroYieldBreakThreshold ?? 2;
  // Fix 4: Reserve query budget for contradiction loop so main loop cannot starve it.
  const contradictionReservedQueries = pipelineConfig.contradictionReservedQueries ?? 2;
  // MT-3: distinct event count for coverage guard
  const distinctEventCount = state.understanding?.distinctEvents?.length ?? 0;

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

    // MT-1 + MT-3: Pass iteration count and distinct event count so sufficiency
    // cannot fire before the minimum required iterations have completed.
    if (allClaimsSufficient(claims, state.evidenceItems, sufficiencyThreshold, state.mainIterationsUsed, sufficiencyMinMainIterations, distinctEventCount)) break;

    // Find claim with fewest evidence items that still has budget remaining.
    // Fix 4: Stop main loop when remaining budget equals contradiction reserve,
    // so the contradiction loop (which checks > 0) can use the reserved queries.
    const budgetEligibleClaims = claims.filter(
      (claim) => getClaimQueryBudgetRemaining(state, claim.id, pipelineConfig) > contradictionReservedQueries,
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
      const failedDomainCount = srPrefetch.failedDomains.length;
      const domainCount = Math.max(1, srPrefetch.domains.length);
      const failedDomainRatio = failedDomainCount / domainCount;

      // SR lookup failures are routine — failed domains default to neutral score
      // (unknownSourceScore from UCM config). Verdict is unaffected. Info-level for admin visibility.
      state.warnings.push({
        type: "source_reliability_error",
        severity: "info",
        message:
          `Source reliability prefetch had ${srPrefetch.errorCount} error(s) across ` +
          `${failedDomainCount}/${domainCount} domain(s). Reliability scores for those domains default to unknown.`,
        details: {
          stage: "research_sr",
          errorCount: srPrefetch.errorCount,
          errorByType: srPrefetch.errorByType,
          failedDomainCount,
          domainCount,
          failedDomainRatio,
          failedDomains: srPrefetch.failedDomains.slice(0, 20),
          noConsensusCount: srPrefetch.noConsensusCount,
        },
      });
    }

    // Backfill SR data onto FetchedSource objects now that the prefetch map is populated.
    // Sources were created during research before the prefetch ran, so scores were null.
    for (const source of state.sources) {
      const srData = getTrackRecordData(source.url);
      if (srData) {
        source.trackRecordScore = srData.score;
        source.trackRecordConfidence = srData.confidence;
        source.trackRecordConsensus = srData.consensusAchieved;
      }
    }

    const reconciledSourceIds = reconcileEvidenceSourceIds(state.evidenceItems, state.sources);
    if (reconciledSourceIds > 0) {
      debugLog(
        `[Stage2] Reconciled sourceId on ${reconciledSourceIds}/${state.evidenceItems.length} evidence items after source fetch`,
      );
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
    const acquisitionFailed = totalSearches > 0;
    state.warnings.push({
      type: "no_successful_sources",
      severity: acquisitionFailed ? "error" : "warning",
      message: acquisitionFailed 
        ? `Search queries were executed but zero sources were successfully fetched — acquisition failed.`
        : "No sources were found for these claims — verdict is based on zero evidence.",
      details: { searchQueries: totalSearches, totalEvidence },
    });

    if (totalSearches >= 3) {
      state.warnings.push({
        type: "source_acquisition_collapse",
        severity: "error",
        message: `${totalSearches} search queries were executed but yielded zero usable sources — research phase collapsed.`,
        details: { searchQueries: totalSearches },
      });
      state.warnings.push({
        type: "report_damaged",
        severity: "error",
        message: "Report integrity is damaged: no usable sources were acquired after repeated searches.",
        details: {
          triggeredWarningTypes: ["no_successful_sources", "source_acquisition_collapse"],
          issues: [
            {
              type: "source_acquisition_collapse",
              severity: "error",
              message: `${totalSearches} searches yielded zero usable sources.`,
            },
          ],
          remediationHints: [
            "Rerun later or with a different provider configuration to restore source acquisition.",
          ],
          recommendedNextStep: "Do not rely on this report; rerun analysis after source acquisition recovers.",
        },
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
  const knownClaimIds = new Set(
    (state.understanding?.atomicClaims ?? []).map((c) => c.id),
  );
  // Default to first claim if only one exists (common case for single-claim inputs)
  const fallbackClaimId = knownClaimIds.size === 1
    ? [...knownClaimIds][0]
    : undefined;
  let idCounter = state.evidenceItems.length + 1;
  let remappedCount = 0;

  for (const pe of preliminary) {
    // Normalize claim IDs: LLM preliminary evidence often uses wrong formats
    // (e.g. "claim_01", "claim_iran_deaths_february" instead of "AC_01")
    let claimIds: string[] = [];
    if (pe.claimId && knownClaimIds.has(pe.claimId)) {
      claimIds = [pe.claimId];
    } else if (fallbackClaimId) {
      // If there is only one atomic claim, ALL preliminary evidence must belong to it.
      claimIds = [fallbackClaimId];
      if (pe.claimId) remappedCount++;
    } else if (pe.claimId && pe.claimId.startsWith("claim_")) {
      // Heuristic: map "claim_01" to "AC_01", etc.
      const num = pe.claimId.replace("claim_", "");
      const mappedId = `AC_${num.padStart(2, "0")}`;
      if (knownClaimIds.has(mappedId)) {
        claimIds = [mappedId];
        remappedCount++;
      }
    }

    state.evidenceItems.push({
      id: `EV_${String(idCounter++).padStart(3, "0")}`,
      statement: pe.snippet,
      category: "evidence",
      specificity: "medium",
      sourceId: "",
      sourceUrl: pe.sourceUrl,
      sourceTitle: pe.sourceTitle ?? "",
      sourceExcerpt: pe.snippet,
      relevantClaimIds: claimIds,
      probativeValue: pe.probativeValue ?? "medium", // Preserve LLM assessment; default "medium" if unavailable
      scopeQuality: "partial", // Preliminary evidence has limited scope data
      // Fix 1.1: Enrich seeded items with metadata from Pass 1 extraction (Option 1A)
      // Without these fields, seeded items (28-70% of all evidence) are invisible to
      // clustering, balance checks, and source-type routing.
      claimDirection: pe.claimDirection === "supports" ? "supports" : pe.claimDirection === "contradicts" ? "contradicts" : "neutral",
      sourceType: mapSourceType(pe.sourceType),
      evidenceScope: pe.evidenceScope ? {
        name: pe.evidenceScope.methodology ?? "Preliminary search result",
        methodology: pe.evidenceScope.methodology,
        temporal: pe.evidenceScope.temporal,
        geographic: pe.evidenceScope.geographic,
        boundaries: pe.evidenceScope.boundaries,
      } : {
        name: "Preliminary search result",
        methodology: "Preliminary search result",
        temporal: "",
        geographic: "",
      },
      isSeeded: true,
    });
  }

  if (remappedCount > 0) {
    const target = fallbackClaimId ?? "matched AC IDs";
    debugLog(`[Stage2] Remapped ${remappedCount}/${preliminary.length} preliminary evidence claim IDs to ${target}`);
  }
}

/**
 * Backfill missing EvidenceItem source metadata by matching sourceUrl against fetched sources.
 * Some evidence items are created before their canonical FetchedSource exists.
 *
 * Returns the number of evidence items updated.
 */
export function reconcileEvidenceSourceIds(
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
): number {
  if (evidenceItems.length === 0 || sources.length === 0) return 0;

  const sourceByUrl = new Map(
    sources.map((source) => [source.url, source] as const),
  );

  let updatedCount = 0;
  for (const item of evidenceItems) {
    const matchedSource = sourceByUrl.get(item.sourceUrl);
    if (!matchedSource) continue;

    let updated = false;
    if (!item.sourceId) {
      item.sourceId = matchedSource.id;
      updated = true;
    }

    if (!item.sourceTitle && matchedSource.title) {
      item.sourceTitle = matchedSource.title;
      updated = true;
    }

    if (updated) updatedCount++;
  }

  return updatedCount;
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
  mainIterationsCompleted: number = 0,
  minMainIterations: number = 1,
  distinctEventCount: number = 0,
): boolean {
  // Empty claims: vacuously sufficient (no research loop runs anyway)
  if (claims.length === 0) return true;

  // MT-1: Require at least one complete main loop iteration before sufficiency
  // can fire. Prevents seeded preliminary evidence from short-circuiting real
  // Stage 2 research (e.g., stored run showing mainIterationsUsed: 0).
  // MT-3 coverage: When multiple distinct events were identified in Stage 1,
  // require proportionally more iterations so each event cluster has research
  // coverage opportunity before we declare the claim sufficient.
  const effectiveMinIterations = distinctEventCount > 1
    ? Math.max(minMainIterations, distinctEventCount - 1)
    : minMainIterations;
  if (mainIterationsCompleted < effectiveMinIterations) return false;

  return claims.every((claim) => {
    const count = evidenceItems.filter(
      // Count only fully-extracted evidence (not seeded/preliminary items).
      // Seeded items have isSeeded=true — they provide coverage baseline
      // but should not satisfy sufficiency to prevent skipping main research.
      (e) => e.relevantClaimIds?.includes(claim.id) && e.evidenceScope && !e.isSeeded,
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
  iterationType: "main" | "contradiction" | "contrarian",
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
  const evidenceCountBeforeIteration = state.evidenceItems.length;

  // 1. Generate search queries via LLM (Haiku)
  state.onEvent?.(`LLM call: query generation — ${getModelForTask("understand", undefined, pipelineConfig).modelName}`, -1);
  const queries = await generateResearchQueries(
    targetClaim,
    iterationType,
    state.evidenceItems,
    pipelineConfig,
    currentDate,
    state.understanding?.distinctEvents ?? [],
    remainingBudget,
    {
      language: searchConfig.searchLanguageOverride ?? state.understanding?.detectedLanguage,
      geography: searchConfig.searchGeographyOverride ?? state.understanding?.inferredGeography,
    },
  );
  state.llmCalls++;
  const generatedQueryCount = queries.length;

  for (const queryObj of queries) {
    if (!consumeClaimQueryBudget(state, targetClaim.id, pipelineConfig, 1)) {
      console.info(`[Stage2] Query budget exhausted for claim "${targetClaim.id}" during ${iterationType} iteration.`);
      break;
    }

    try {
      // 2. Web search — no geo/language params sent to search providers.
      // Query generation prompt handles language; search stays unfiltered.
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
      if (response.results.length > 0) {
        state.onEvent?.(`Search: ${response.providersUsed.join(", ")} — ${response.results.length} results`, -1);
      }

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
      state.onEvent?.(`LLM call: relevance classification — ${getModelForTask("understand", undefined, pipelineConfig).modelName}`, -1);
      const relevantSources = await classifyRelevance(
        targetClaim,
        response.results,
        pipelineConfig,
        currentDate,
        state.understanding?.inferredGeography ?? null,
      );
      state.llmCalls++;

      if (relevantSources.length === 0) continue;

      // 4. Fetch top sources — sorted by relevance score desc, original search rank asc (tie-break)
      const topN = pipelineConfig.relevanceTopNFetch ?? 5;
      const selectedForFetch = selectTopSources(relevantSources, topN);
      debugLog(`[Stage2] Fetching top ${selectedForFetch.length} of ${relevantSources.length} relevant sources (topN=${topN})`, selectedForFetch.map((s) => ({
        url: s.url.slice(0, 100),
        score: s.relevanceScore,
        rank: s.originalRank,
      })));
      const fetchedSources = await fetchSources(
        selectedForFetch,
        queryObj.query,
        state,
        pipelineConfig,
      );

      if (fetchedSources.length === 0) continue;

      // 5. Reliability prefetch — DEFERRED to batch after research loop (perf fix)
      // SR data is only needed in Stage 4 (verdict) and Stage 5 (aggregation),
      // not during research iteration decisions. Deferring saves 15-25s per new domain.

      // 6. Evidence extraction with mandatory EvidenceScope (Haiku, batched)
      state.onEvent?.(`LLM call: evidence extraction — ${getModelForTask("extract_evidence", undefined, pipelineConfig).modelName}`, -1);
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

      // 10. Tag search strategy and add to state
      if (iterationType === "contrarian") {
        for (const item of kept) {
          item.searchStrategy = "contrarian";
        }
      } else if (iterationType === "contradiction") {
        for (const item of kept) {
          item.searchStrategy = "contradiction";
        }
      }
      state.evidenceItems.push(...kept);

      // Track contradiction/contrarian sources
      if (iterationType === "contradiction" || iterationType === "contrarian") {
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

  if (iterationType === "contrarian") {
    const newItems = state.evidenceItems.length - evidenceCountBeforeIteration;
    console.info(
      `[Pipeline] D5 contrarian: claim ${targetClaim.id} -> ${generatedQueryCount} queries generated, ${newItems} new items`,
    );
  }
}

/**
 * Generate search queries for a claim using LLM (Haiku tier).
 * Uses GENERATE_QUERIES UCM prompt.
 */
export async function generateResearchQueries(
  claim: AtomicClaim,
  iterationType: "main" | "contradiction" | "contrarian",
  existingEvidence: EvidenceItem[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
  distinctEvents: CBClaimUnderstanding["distinctEvents"] = [],
  remainingQueryBudget?: number,
  searchGeo?: { language?: string; geography?: string | null },
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
    distinctEvents: JSON.stringify(distinctEvents),
    iterationType,
    queryStrategyMode,
    detectedLanguage: searchGeo?.language ?? "en",
    inferredGeography: searchGeo?.geography ?? "not geographically specific",
  });
  if (!rendered) {
    // Fallback: use claim statement directly
    return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
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
        errorMessage: "Stage 2 query generation returned no structured output",
        timestamp: new Date(),
      });
      return [{ query: claim.statement.slice(0, 80), rationale: "fallback" }].slice(0, maxQueries);
    }

    const validated = GenerateQueriesOutputSchema.parse(parsed);
    let finalQueries: Array<{ query: string; rationale: string }>;
    if (queryStrategyMode !== "pro_con") {
      finalQueries = validated.queries
        .slice(0, maxQueries)
        .map(({ query, rationale }) => ({ query, rationale }));
    } else {
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

      finalQueries = normalized.slice(0, maxQueries);
    }

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

    return finalQueries;
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
  inferredGeography?: string | null,
): Promise<Array<{ url: string; relevanceScore: number; originalRank: number }>> {
  const rendered = await loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", {
    currentDate,
    claim: claim.statement,
    inferredGeography: inferredGeography ?? "null",
    searchResults: JSON.stringify(
      searchResults.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet ?? "" })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // Fallback: accept all results with neutral score
    return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
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
        errorMessage: "Stage 2 relevance classification returned no structured output",
        timestamp: new Date(),
      });
      return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
    }

    const validated = RelevanceClassificationOutputSchema.parse(parsed);

    // Build URL→originalRank map from the search results array order
    const urlToRank = new Map(searchResults.map((r, i) => [r.url, i]));

    // Cap foreign_reaction scores before applying the relevance threshold.
    // This ensures foreign government actions (sanctions, EOs, congressional statements)
    // are filtered out while contextual evidence (academic studies, NGO reports) passes.
    const foreignCap = pipelineConfig.foreignJurisdictionRelevanceCap ?? 0.35;
    const adjustedSources = validated.relevantSources.map((s) => {
      const rawScore = s.relevanceScore;
      const adjusted = s.jurisdictionMatch === "foreign_reaction"
        ? { ...s, relevanceScore: Math.min(s.relevanceScore, foreignCap) }
        : s;
      const originalRank = urlToRank.get(s.url) ?? searchResults.length;
      return { ...adjusted, rawScore, originalRank };
    });

    // Diagnostics: log every classified result (admin-only via debugLog)
    debugLog(`[Stage2] Relevance classification: ${adjustedSources.length} results for "${claim.statement.slice(0, 60)}"`, adjustedSources.map((s) => ({
      rank: s.originalRank,
      url: s.url.slice(0, 80),
      raw: s.rawScore,
      adjusted: s.relevanceScore,
      jurisdiction: s.jurisdictionMatch,
      reasoning: s.reasoning.slice(0, 80),
    })));

    const relevantSources = adjustedSources.filter((s) => s.relevanceScore >= 0.4);

    // Diagnostics: log discard summary
    const discarded = adjustedSources.filter((s) => s.relevanceScore < 0.4);
    if (discarded.length > 0) {
      const cappedCount = discarded.filter((s) => s.jurisdictionMatch === "foreign_reaction").length;
      const belowThreshold = discarded.length - cappedCount;
      debugLog(`[Stage2] Discarded ${discarded.length} items: ${cappedCount} capped (foreign_reaction), ${belowThreshold} below threshold (0.4)`,
        discarded.map((s) => ({ url: s.url.slice(0, 80), raw: s.rawScore, adjusted: s.relevanceScore, jurisdiction: s.jurisdictionMatch })),
      );
    }

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

    // Filter to minimum relevance score of 0.4, return with originalRank for stable sort at call site
    return relevantSources;
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
    console.warn("[Stage2] Relevance classification failed, accepting all results:", err);
    return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
  }
}

// --- Zod schema for applicability assessment output ---
const ApplicabilityAssessmentOutputSchema = z.object({
  assessments: z.array(z.object({
    evidenceIndex: z.number(),
    applicability: z.enum(["direct", "contextual", "foreign_reaction"]).catch("direct"),
    reasoning: z.string(),
  })),
});

/**
 * Fix 3: Post-extraction applicability assessment — safety net for jurisdiction contamination.
 *
 * Batches all evidence items into a single Haiku-tier LLM call to classify each item
 * as "direct", "contextual", or "foreign_reaction". Items classified as "foreign_reaction"
 * are filtered out by the caller.
 *
 * Called between research completion and clusterBoundaries() in the main pipeline.
 *
 * @param claims - The atomic claims being analyzed
 * @param evidenceItems - All gathered evidence items
 * @param inferredGeography - The claim's inferred jurisdiction (null = no filtering)
 * @param pipelineConfig - Pipeline configuration
 * @returns Evidence items with `applicability` field populated
 */
export async function assessEvidenceApplicability(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  inferredGeography: string | null,
  pipelineConfig: PipelineConfig,
): Promise<EvidenceItem[]> {
  // Skip if no geography or disabled
  if (!inferredGeography || !(pipelineConfig.applicabilityFilterEnabled ?? true)) {
    return evidenceItems;
  }

  // Skip if no evidence
  if (evidenceItems.length === 0) {
    return evidenceItems;
  }

  // Prepare compact evidence summaries for LLM (minimize tokens)
  const evidenceSummaries = evidenceItems.map((item, index) => ({
    index,
    statement: item.statement.slice(0, 200),
    sourceUrl: item.sourceUrl ?? "unknown",
    sourceTitle: item.sourceTitle ?? "unknown",
    category: item.category,
  }));

  const rendered = await loadAndRenderSection("claimboundary", "APPLICABILITY_ASSESSMENT", {
    claims: JSON.stringify(claims.map(c => ({ id: c.id, statement: c.statement })), null, 2),
    inferredGeography,
    evidenceItems: JSON.stringify(evidenceSummaries, null, 2),
  });

  if (!rendered) {
    console.warn("[Fix3] APPLICABILITY_ASSESSMENT prompt section not found — skipping applicability filter");
    return evidenceItems;
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
          providerOptions: getPromptCachingOptions(model.provider),
        },
        { role: "user", content: "Classify each evidence item by applicability." },
      ],
      temperature: 0.1,
      output: Output.object({ schema: ApplicabilityAssessmentOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        model.provider,
      ),
    });

    const validated = extractStructuredOutput(result) as z.infer<typeof ApplicabilityAssessmentOutputSchema>;

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

    // Apply classifications to evidence items
    const classificationMap = new Map<number, "direct" | "contextual" | "foreign_reaction">();
    for (const assessment of validated.assessments) {
      classificationMap.set(assessment.evidenceIndex, assessment.applicability);
    }

    // Debug: count by category
    const counts = { direct: 0, contextual: 0, foreign_reaction: 0, unclassified: 0 };
    const foreignDomains: string[] = [];

    const assessed = evidenceItems.map((item, index) => {
      const applicability = classificationMap.get(index) ?? "direct";
      counts[applicability]++;
      if (applicability === "foreign_reaction") {
        const domain = item.sourceUrl?.match(/^https?:\/\/([^/?#]+)/)?.[1] ?? "unknown";
        foreignDomains.push(domain);
      }
      return { ...item, applicability };
    });

    // Count unclassified (items not in LLM response — default to "direct")
    counts.unclassified = evidenceItems.length - classificationMap.size;

    debugLog(
      `[Fix3] Applicability assessment: ${counts.direct} direct, ${counts.contextual} contextual, ` +
      `${counts.foreign_reaction} foreign_reaction, ${counts.unclassified} unclassified (defaulted to direct). ` +
      `Foreign domains: ${foreignDomains.length > 0 ? foreignDomains.join(", ") : "none"}`
    );
    console.info(
      `[Fix3] Applicability: ${counts.direct}D/${counts.contextual}C/${counts.foreign_reaction}F ` +
      `(${evidenceItems.length} total, geography: ${inferredGeography})`
    );

    return assessed;
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
    // Fail-open: if assessment fails, keep all evidence (don't block pipeline)
    console.warn("[Fix3] Applicability assessment failed, keeping all evidence:", err);
    debugLog(`[Fix3] ERROR: Applicability assessment failed: ${errorMessage}`);
    return evidenceItems;
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
  pipelineConfig?: Pick<PipelineConfig, "sourceFetchTimeoutMs" | "parallelExtractionLimit">,
): Promise<Array<{ url: string; title: string; text: string }>> {
  const fetched: Array<{ url: string; title: string; text: string }> = [];
  const fetchErrorByType: Record<string, number> = {};
  const failedUrls: string[] = [];
  const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
  let fetchAttempted = 0;
  let fetchFailed = 0;

  // Configurable timeout — default 20 s (was 12 s). Legal/government sources load slowly.
  const fetchTimeoutMs = pipelineConfig?.sourceFetchTimeoutMs ?? 20000;

  // Filter out already-fetched URLs
  const toFetch = relevantSources.filter(
    (source) => !state.sources.some((s) => s.url === source.url),
  );

  // Parallel fetch with configurable concurrency limit
  const fetchConcurrency = pipelineConfig?.parallelExtractionLimit ?? 3;
  for (let i = 0; i < toFetch.length; i += fetchConcurrency) {
    const batch = toFetch.slice(i, i + fetchConcurrency);
    fetchAttempted += batch.length;
    const results = await Promise.all(
      batch.map(async (source) => {
        // First attempt
        try {
          const content = await extractTextFromUrl(source.url, {
            timeoutMs: fetchTimeoutMs,
            maxLength: 15000,
          });
          return { source, content, ok: true as const };
        } catch (firstError: unknown) {
          // Retry once on transient errors (timeout / network / server-side 5xx).
          // Deterministic failures (401/403/404) are not retried — they won't resolve.
          const classified = classifySourceFetchFailure(firstError);
          if (["timeout", "network", "http_5xx"].includes(classified.type)) {
            await new Promise<void>((r) => setTimeout(r, 2000));
            try {
              const content = await extractTextFromUrl(source.url, {
                // Retry timeout: always >= first attempt, cap at schema max (60 s).
                timeoutMs: Math.max(fetchTimeoutMs, Math.min(Math.round(fetchTimeoutMs * 1.5), 60000)),
                maxLength: 15000,
              });
              return { source, content, ok: true as const };
            } catch (retryError: unknown) {
              return { source, content: null, ok: false as const, error: retryError };
            }
          }
          return { source, content: null, ok: false as const, error: firstError };
        }
      }),
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
        trackRecordScore: null, // Backfilled after SR prefetch (Step 4)
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
    // Per-query fetch failures are routine (paywalls, 403s, 401s). Info-level only.
    // Aggregate degradation is assessed below (source_fetch_degradation).
    state.warnings.push({
      type: "source_fetch_failure",
      severity: "info",
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
      // Analytical reality: real-world sources are inaccessible (paywalls, 404s, timeouts).
      // Nothing the system can do — this is a fact about the world, not a system failure.
      // Info-level for admin visibility. If total evidence is insufficient, downstream
      // warnings (insufficient_evidence) will surface that to the user.
      state.warnings.push({
        type: "source_fetch_degradation",
        severity: "info",
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
        errorMessage: "Stage 2 evidence extraction returned no structured output",
        timestamp: new Date(),
      });
      return [];
    }

    const validated = Stage2ExtractEvidenceOutputSchema.parse(parsed);

    // Map to full EvidenceItem format
    let idCounter = Date.now(); // Use timestamp-based IDs to avoid collisions
    let claimIdMismatchCount = 0;
    const evidenceItems = validated.evidenceItems.map((ei) => {
      // Log when LLM returns mismatched claim IDs (admin diagnostic)
      if (ei.relevantClaimIds.length > 0 && !ei.relevantClaimIds.includes(targetClaim.id)) {
        claimIdMismatchCount++;
      }
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
        // Always use targetClaim.id — extraction targets a single claim,
        // and LLM often returns wrong ID formats (e.g. "claim_01" vs "AC_01")
        relevantClaimIds: [targetClaim.id],
        isDerivative: ei.isDerivative ?? false,
        derivedFromSourceUrl: ei.derivedFromSourceUrl ?? undefined,
      } satisfies EvidenceItem;
    });

    if (claimIdMismatchCount > 0) {
      debugLog(`[Stage2] Corrected ${claimIdMismatchCount}/${evidenceItems.length} evidence items with mismatched claim IDs for ${targetClaim.id}`);
    }

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

    return evidenceItems;
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

// Stage 4 (verdict generation + debate config checks) extracted to verdict-generation-stage.ts

