import { 
  AtomicClaim, 
  CBResearchState, 
  EvidenceItem, 
  FetchedSource,
  EvidenceScope,
} from "./types";
import { 
  loadPipelineConfig, 
  loadSearchConfig 
} from "@/lib/config-loader";
import { 
  PipelineConfig, 
  SearchConfig 
} from "@/lib/config-schemas";
import { 
  checkAbortSignal, 
  mapSourceType,
  classifySourceFetchFailure,
} from "./pipeline-utils";
import { debugLog } from "./debug";
import { 
  prefetchSourceReliability, 
  getTrackRecordData 
} from "./source-reliability";
import { 
  searchWebWithProvider 
} from "@/lib/web-search";
import { 
  recordFailure as recordSearchFailure 
} from "@/lib/search-circuit-breaker";
import { getModelForTask } from "./llm";
import { filterByProbativeValue } from "./evidence-filter";

// Import sibling stage modules
import { generateResearchQueries } from "./research-query-stage";
import { fetchSources, reconcileEvidenceSourceIds } from "./research-acquisition-stage";
import { 
  classifyRelevance, 
  extractResearchEvidence, 
  assessEvidenceApplicability, 
  assessScopeQuality,
  assessEvidenceBalance,
} from "./research-extraction-stage";
import { upsertSearchProviderWarning } from "./claim-extraction-stage";

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

    const reconciledSourceIdsCount = reconcileEvidenceSourceIds(state.evidenceItems, state.sources);
    if (reconciledSourceIdsCount > 0) {
      debugLog(
        `[Stage2] Reconciled sourceId on ${reconciledSourceIdsCount}/${state.evidenceItems.length} evidence items after source fetch`,
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
    // Normalize claim IDs: prefer full relevantClaimIds array, fall back to legacy single claimId.
    // LLM preliminary evidence often uses wrong formats (e.g. "claim_01" instead of "AC_01").
    let claimIds: string[] = [];

    // 1. Prefer relevantClaimIds[] when present (multi-claim attribution)
    if (pe.relevantClaimIds && pe.relevantClaimIds.length > 0) {
      claimIds = pe.relevantClaimIds.filter((id) => knownClaimIds.has(id));
    }

    // 2. Fall back to legacy single claimId
    if (claimIds.length === 0 && pe.claimId && knownClaimIds.has(pe.claimId)) {
      claimIds = [pe.claimId];
    }

    // 3. Single-claim input fallback: all evidence belongs to the sole claim
    if (claimIds.length === 0 && fallbackClaimId) {
      claimIds = [fallbackClaimId];
      if (pe.claimId || (pe.relevantClaimIds && pe.relevantClaimIds.length > 0)) remappedCount++;
    }

    // 4. Heuristic remap: "claim_01" → "AC_01", etc.
    if (claimIds.length === 0) {
      const rawIds = pe.relevantClaimIds ?? (pe.claimId ? [pe.claimId] : []);
      for (const rawId of rawIds) {
        if (rawId.startsWith("claim_")) {
          const num = rawId.replace("claim_", "");
          const mappedId = `AC_${num.padStart(2, "0")}`;
          if (knownClaimIds.has(mappedId)) {
            claimIds.push(mappedId);
            remappedCount++;
          }
        }
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
      const { selectTopSources } = await import("./pipeline-utils");
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

// ============================================================================
// STATE HELPERS
// ============================================================================

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
