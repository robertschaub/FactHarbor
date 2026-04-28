import {
  AtomicClaim,
  CBResearchState,
  ClaimFreshnessRequirement,
  ClaimAcquisitionDirectionCounts,
  ClaimAcquisitionIterationEntry,
  ClaimAcquisitionLedgerEntry,
  EvidenceItem,
  FetchedSource,
  EvidenceScope,
} from "./types";
import {
  loadPipelineConfig,
  loadSearchConfig,
  loadCalcConfig,
} from "@/lib/config-loader";
import {
  PipelineConfig,
  SearchConfig,
  SourceReliabilityConfig,
} from "@/lib/config-schemas";
import { getConfig } from "@/lib/config-storage";
import {
  checkAbortSignal,
  extractDomain,
  isJobAbortError,
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
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
} from "./llm";
import { filterByProbativeValue } from "./evidence-filter";
import { generateText, Output } from "ai";
import { z } from "zod";
import { loadAndRenderSection } from "./prompt-loader";
import { getClaimRelevantGeographies } from "./jurisdiction-context";

// Import sibling stage modules
import { generateResearchQueries, type GeneratedResearchQuery } from "./research-query-stage";
import { fetchSources, reconcileEvidenceSourceIds } from "./research-acquisition-stage";
import {
  classifyRelevance,
  extractResearchEvidence,
  assessEvidenceApplicability,
  assessScopeQuality,
  assessEvidenceBalance,
  applyPerSourceCap,
} from "./research-extraction-stage";
import { upsertSearchProviderWarning } from "./claim-extraction-stage";
import {
  markContradictionMainResearchEnded,
  markContradictionNotRun,
  markContradictionStarted,
  updateContradictionReachability,
} from "./research-waste-metrics";

function createEmptyDirectionCounts(): ClaimAcquisitionDirectionCounts {
  return {
    supports: 0,
    contradicts: 0,
    neutral: 0,
  };
}

function cloneDirectionCounts(
  counts: ClaimAcquisitionDirectionCounts,
): ClaimAcquisitionDirectionCounts {
  return {
    supports: counts.supports,
    contradicts: counts.contradicts,
    neutral: counts.neutral,
  };
}

function incrementDirectionCounts(
  counts: ClaimAcquisitionDirectionCounts,
  direction?: EvidenceItem["claimDirection"],
): void {
  if (direction === "supports") {
    counts.supports++;
  } else if (direction === "contradicts") {
    counts.contradicts++;
  } else {
    counts.neutral++;
  }
}

const QUERY_LANE_PRIORITY: Record<NonNullable<GeneratedResearchQuery["retrievalLane"]>, number> = {
  primary_direct: 0,
  navigational: 1,
  secondary_context: 2,
};

const PRIMARY_SOURCE_REFINEMENT_TYPES = new Set<NonNullable<EvidenceItem["sourceType"]>>([
  "government_report",
  "legal_document",
  "peer_reviewed_study",
  "fact_check_report",
  "organization_report",
]);

type ResearchIterationTimingGuard = {
  enabled: boolean;
  researchStartMs: number;
  timeBudgetMs: number;
  protectedTimeMs: number;
};

export type RelevanceSearchResult = {
  url: string;
  title: string;
  snippet?: string | null;
};

export type RelevanceClassificationResult = {
  url: string;
  relevanceScore: number;
  originalRank: number;
};

function buildRelevanceClassificationCacheKey(params: {
  claim: AtomicClaim;
  searchResults: RelevanceSearchResult[];
  currentDate: string;
  inferredGeography?: string | null;
  relevantGeographies?: string[] | null;
  pipelineConfig: PipelineConfig;
}): string {
  const relevantGeographies = Array.from(
    new Set((params.relevantGeographies ?? []).filter((value): value is string => !!value)),
  ).sort();
  const relevanceModel = getModelForTask("understand", undefined, params.pipelineConfig);

  return JSON.stringify({
    claimId: params.claim.id,
    claimStatement: params.claim.statement,
    relevanceProvider: relevanceModel.provider,
    relevanceModel: relevanceModel.modelName,
    freshnessRequirement: params.claim.freshnessRequirement ?? "none",
    currentDate: params.currentDate,
    inferredGeography: params.inferredGeography ?? null,
    relevantGeographies,
    relevanceFloor: params.pipelineConfig.relevanceFloor ?? 0.4,
    foreignJurisdictionRelevanceCap: params.pipelineConfig.foreignJurisdictionRelevanceCap ?? 0.35,
    searchResults: params.searchResults.map((result) => ({
      url: result.url,
      title: result.title,
      snippet: result.snippet ?? "",
    })),
  });
}

export async function classifyRelevanceWithJobCache(params: {
  state: CBResearchState;
  claim: AtomicClaim;
  searchResults: RelevanceSearchResult[];
  pipelineConfig: PipelineConfig;
  currentDate: string;
  inferredGeography?: string | null;
  relevantGeographies?: string[] | null;
  classifier?: typeof classifyRelevance;
}): Promise<{ relevantSources: RelevanceClassificationResult[]; cacheHit: boolean }> {
  const cacheKey = buildRelevanceClassificationCacheKey(params);
  const cache = params.state.relevanceClassificationCache ??= {};
  const cached = cache[cacheKey];
  if (cached) {
    debugLog(
      `[Stage2] Reusing exact relevance classification for ${cached.length} source(s) on claim ${params.claim.id}`,
    );
    return {
      relevantSources: cached.map((source) => ({ ...source })),
      cacheHit: true,
    };
  }

  const classifier = params.classifier ?? classifyRelevance;
  const relevantSources = await classifier(
    params.claim,
    params.searchResults,
    params.pipelineConfig,
    params.currentDate,
    params.inferredGeography,
    params.relevantGeographies,
  );
  cache[cacheKey] = relevantSources.map((source) => ({ ...source }));
  return { relevantSources, cacheHit: false };
}

function sortGeneratedResearchQueries(
  queries: GeneratedResearchQuery[],
): GeneratedResearchQuery[] {
  return [...queries].sort(
    (left, right) =>
      QUERY_LANE_PRIORITY[left.retrievalLane ?? "secondary_context"]
      - QUERY_LANE_PRIORITY[right.retrievalLane ?? "secondary_context"],
  );
}

function hasExplicitRetrievalMetadata(query: GeneratedResearchQuery): boolean {
  return query.retrievalLane !== undefined || query.freshnessWindow !== undefined;
}

function createClaimIterationTelemetryEntry(
  iteration: number,
  iterationType: ClaimAcquisitionIterationEntry["iterationType"],
  generatedQueries: string[],
  freshnessRequirement?: ClaimFreshnessRequirement,
  laneReason?: string,
): ClaimAcquisitionIterationEntry {
  return {
    iteration,
    iterationType,
    languageLane: "primary",
    freshnessRequirement,
    generatedQueries,
    searchResults: 0,
    relevanceAccepted: 0,
    sourcesFetched: 0,
    rawEvidenceItems: 0,
    admittedEvidenceItems: 0,
    directionCounts: createEmptyDirectionCounts(),
    losses: {
      relevanceRejected: 0,
      fetchRejected: 0,
      sourcesWithoutEvidence: 0,
      probativeFilteredOut: 0,
      perSourceCapDroppedNew: 0,
      perSourceCapEvictedExisting: 0,
    },
    laneReason,
  };
}

function getPrimarySourceRefinementTargetTypes(
  claim: AtomicClaim,
): Set<NonNullable<EvidenceItem["sourceType"]>> {
  return new Set(
    (claim.expectedEvidenceProfile?.expectedSourceTypes ?? [])
      .map((sourceType) => mapSourceType(sourceType))
      .filter((sourceType) => PRIMARY_SOURCE_REFINEMENT_TYPES.has(sourceType)),
  );
}

function hasExplicitNumericSignal(text?: string): boolean {
  return typeof text === "string" && /\d/.test(text);
}

function normalizeMetricText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeMetricText(text: string): string[] {
  return normalizeMetricText(text)
    .split(" ")
    .filter((token) => token.length >= 4);
}

function buildEvidenceMetricText(item: EvidenceItem): string {
  return [
    item.statement,
    item.evidenceScope?.analyticalDimension,
    item.evidenceScope?.methodology,
    item.evidenceScope?.boundaries,
    item.evidenceScope?.temporal,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
}

function countCoveredExpectedMetrics(
  expectedMetrics: string[],
  evidenceTexts: string[],
): number {
  return expectedMetrics.filter((metric) => {
    const metricTokens = Array.from(new Set(tokenizeMetricText(metric)));
    if (metricTokens.length === 0) return false;

    const minimumOverlap = Math.min(2, metricTokens.length);
    return evidenceTexts.some((text) => {
      const normalizedEvidence = normalizeMetricText(text);
      const overlap = metricTokens.filter((token) => normalizedEvidence.includes(token)).length;
      return overlap >= minimumOverlap;
    });
  }).length;
}

function hasConcreteMetricCoverage(
  claim: AtomicClaim,
  evidenceItems: EvidenceItem[],
  expectedMetrics: string[],
): boolean {
  const candidateTypes = getPrimarySourceRefinementTargetTypes(claim);
  if (candidateTypes.size === 0 || expectedMetrics.length === 0) return false;

  const evidenceTexts = evidenceItems
    .filter((item) =>
      !item.isSeeded
      && item.relevantClaimIds?.includes(claim.id)
      && !!item.sourceType
      && candidateTypes.has(item.sourceType),
    )
    .map((item) => buildEvidenceMetricText(item))
    .filter((text) => hasExplicitNumericSignal(text));

  if (evidenceTexts.length === 0) return false;

  const coveredMetrics = countCoveredExpectedMetrics(expectedMetrics, evidenceTexts);
  const requiredCoverage = Math.min(expectedMetrics.length, 1);
  return coveredMetrics >= requiredCoverage;
}

function getRequiredPrimaryMetricCoverage(expectedMetrics: string[]): number {
  return Math.min(expectedMetrics.length, 3);
}

function hasConcretePrimaryMetricCoverage(
  claim: AtomicClaim,
  evidenceItems: EvidenceItem[],
): boolean {
  const expectedMetrics = claim.expectedEvidenceProfile?.expectedMetrics ?? [];
  if (expectedMetrics.length === 0) return false;

  const candidateTypes = getPrimarySourceRefinementTargetTypes(claim);
  if (candidateTypes.size === 0) return false;

  const evidenceTexts = evidenceItems
    .filter((item) =>
      !item.isSeeded
      && item.relevantClaimIds?.includes(claim.id)
      && !!item.sourceType
      && candidateTypes.has(item.sourceType),
    )
    .map((item) => buildEvidenceMetricText(item))
    .filter((text) => hasExplicitNumericSignal(text));

  if (evidenceTexts.length === 0) return false;

  const coveredMetrics = countCoveredExpectedMetrics(expectedMetrics, evidenceTexts);
  const requiredCoverage = getRequiredPrimaryMetricCoverage(expectedMetrics);
  return coveredMetrics >= requiredCoverage;
}

function hasConcreteCurrentPrimaryMetricCoverage(
  claim: AtomicClaim,
  evidenceItems: EvidenceItem[],
): boolean {
  const primaryMetric = claim.expectedEvidenceProfile?.primaryMetric?.trim();
  if (!primaryMetric) return false;

  return hasConcreteMetricCoverage(claim, evidenceItems, [primaryMetric]);
}

function hasNonSeededPrimarySourceCoverage(
  claim: AtomicClaim,
  evidenceItems: EvidenceItem[],
): boolean {
  const candidateTypes = getPrimarySourceRefinementTargetTypes(claim);
  if (candidateTypes.size === 0) return false;

  return evidenceItems.some((item) =>
    !item.isSeeded
    && item.relevantClaimIds?.includes(claim.id)
    && !!item.sourceType
    && candidateTypes.has(item.sourceType),
  );
}

function hasCurrentAggregateMetricRefinementContract(claim: AtomicClaim): boolean {
  const profile = claim.expectedEvidenceProfile;
  return claim.freshnessRequirement === "current_snapshot"
    && typeof profile?.primaryMetric === "string"
    && profile.primaryMetric.trim().length > 0
    && Array.isArray(profile.componentMetrics)
    && profile.componentMetrics.some(
      (metric) => typeof metric === "string" && metric.trim().length > 0,
    );
}

function claimNeedsPrimarySourceRefinement(
  claim: AtomicClaim,
  evidenceItems: EvidenceItem[],
): boolean {
  const expectedMetrics = claim.expectedEvidenceProfile?.expectedMetrics ?? [];
  const candidateTypes = getPrimarySourceRefinementTargetTypes(claim);

  if (hasCurrentAggregateMetricRefinementContract(claim)) {
    // Stage 1 explicitly identified a decisive current aggregate metric plus
    // secondary component metrics. Spend one bounded refinement pass on the
    // direct aggregate route only when the direct metric is still missing, so
    // component-rich official evidence cannot silently stand in for the
    // umbrella artifact.
    return !hasConcreteCurrentPrimaryMetricCoverage(claim, evidenceItems);
  }

  if (expectedMetrics.length === 0 || candidateTypes.size === 0) {
    return false;
  }

  if (!hasNonSeededPrimarySourceCoverage(claim, evidenceItems)) {
    return true;
  }

  if (hasExplicitNumericSignal(claim.statement)) {
    return !hasConcretePrimaryMetricCoverage(claim, evidenceItems);
  }

  return false;
}

export function countClaimLocalDirections(
  evidenceItems: EvidenceItem[],
  claimId: string,
): ClaimAcquisitionDirectionCounts {
  const counts = createEmptyDirectionCounts();
  for (const item of evidenceItems) {
    if (!item.relevantClaimIds?.includes(claimId)) continue;
    incrementDirectionCounts(counts, item.claimDirection);
  }
  return counts;
}

export function ensureClaimAcquisitionLedgerEntry(
  state: CBResearchState,
  claimId: string,
): ClaimAcquisitionLedgerEntry {
  state.claimAcquisitionLedger ??= {};
  if (!state.claimAcquisitionLedger[claimId]) {
    state.claimAcquisitionLedger[claimId] = {
      seededEvidenceItems: 0,
      iterations: [],
      postResearchApplicabilityRemoved: 0,
      finalEvidenceItems: 0,
      finalDirectionCounts: createEmptyDirectionCounts(),
      finalBoundaryCount: 0,
      maxBoundaryShare: 0,
      boundaryDistribution: [],
    };
  }
  return state.claimAcquisitionLedger[claimId];
}

export function recordSeededEvidenceTelemetry(
  state: CBResearchState,
  seededItems: EvidenceItem[],
): void {
  for (const item of seededItems) {
    for (const claimId of item.relevantClaimIds ?? []) {
      ensureClaimAcquisitionLedgerEntry(state, claimId).seededEvidenceItems++;
    }
  }
}

export function recordClaimIterationTelemetry(
  state: CBResearchState,
  claimId: string,
  entry: ClaimAcquisitionIterationEntry,
): void {
  ensureClaimAcquisitionLedgerEntry(state, claimId).iterations.push({
    ...entry,
    generatedQueries: [...entry.generatedQueries],
    directionCounts: cloneDirectionCounts(entry.directionCounts),
    losses: { ...entry.losses },
  });
}

export function recordApplicabilityRemovalTelemetry(
  state: CBResearchState,
  removedItems: EvidenceItem[],
): void {
  for (const item of removedItems) {
    for (const claimId of item.relevantClaimIds ?? []) {
      ensureClaimAcquisitionLedgerEntry(state, claimId).postResearchApplicabilityRemoved++;
    }
  }
}

export function finalizeClaimAcquisitionTelemetry(state: CBResearchState): void {
  const knownClaimIds = new Set(
    (state.understanding?.atomicClaims ?? []).map((claim) => claim.id),
  );

  for (const evidenceItem of state.evidenceItems) {
    for (const claimId of evidenceItem.relevantClaimIds ?? []) {
      knownClaimIds.add(claimId);
    }
  }

  for (const claimId of knownClaimIds) {
    const entry = ensureClaimAcquisitionLedgerEntry(state, claimId);
    const claimLocalEvidence = state.evidenceItems.filter(
      (item) => item.relevantClaimIds?.includes(claimId),
    );
    const boundaryCounts = new Map<string, number>();

    for (const item of claimLocalEvidence) {
      const boundaryId = item.claimBoundaryId ?? "UNASSIGNED";
      boundaryCounts.set(boundaryId, (boundaryCounts.get(boundaryId) ?? 0) + 1);
    }

    const boundaryDistribution = Array.from(boundaryCounts.entries())
      .map(([claimBoundaryId, evidenceCount]) => ({ claimBoundaryId, evidenceCount }))
      .sort((a, b) => b.evidenceCount - a.evidenceCount || a.claimBoundaryId.localeCompare(b.claimBoundaryId));
    const maxBoundaryEvidence = boundaryDistribution[0]?.evidenceCount ?? 0;
    entry.finalEvidenceItems = claimLocalEvidence.length;
    entry.finalDirectionCounts = countClaimLocalDirections(claimLocalEvidence, claimId);
    entry.finalBoundaryCount = boundaryDistribution.length;
    entry.maxBoundaryShare = claimLocalEvidence.length > 0
      ? maxBoundaryEvidence / claimLocalEvidence.length
      : 0;
    entry.boundaryDistribution = boundaryDistribution;
  }
}

export function collectSourceReliabilityUrls(
  state: Pick<CBResearchState, "evidenceItems" | "sources">,
): string[] {
  const sourceUrlById = new Map(state.sources.map((source) => [source.id, source.url]));
  const evidenceReferencesByUrl = new Map<string, number>();

  for (const item of state.evidenceItems) {
    const urls = new Set<string>();
    if (item.sourceId) {
      const sourceUrl = sourceUrlById.get(item.sourceId);
      if (sourceUrl) urls.add(sourceUrl);
    }
    if (item.sourceUrl) urls.add(item.sourceUrl);

    for (const url of urls) {
      evidenceReferencesByUrl.set(url, (evidenceReferencesByUrl.get(url) ?? 0) + 1);
    }
  }

  return Array.from(evidenceReferencesByUrl.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([url]) => url);
}

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
  state.researchedIterationsByClaim ??= {};
  const effectiveJobId = jobId ?? state.jobId;
  const [pipelineResult, searchResult, calcResult, srResult] = await Promise.all([
    loadPipelineConfig("default", effectiveJobId),
    loadSearchConfig("default", effectiveJobId),
    loadCalcConfig("default", effectiveJobId),
    getConfig("sr", "default", { jobId: effectiveJobId }),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;
  const calcConfig = calcResult.config;
  const srConfig = srResult.config as SourceReliabilityConfig;

  // Log config load status for research stage
  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM pipeline config load failed in researchEvidence — using hardcoded defaults.`);
  }
  if (searchResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM search config load failed in researchEvidence — using hardcoded defaults.`);
  }
  if (calcResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM calc config load failed in researchEvidence — using hardcoded defaults.`);
  }
  if (srResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn(`[Pipeline] UCM source reliability config load failed in researchEvidence — using hardcoded defaults.`);
  }

  const currentDate = new Date().toISOString().split("T")[0];

  const claims = state.understanding?.atomicClaims ?? [];
  if (claims.length === 0) return;

  // ------------------------------------------------------------------
  // Step 0: LLM remap for unresolved seeded preliminary evidence (Option C)
  // Runs before seeding so that updated relevantClaimIds are picked up.
  // ------------------------------------------------------------------
  const remapResult = await remapUnresolvedSeededEvidence(state, pipelineConfig);
  if (remapResult.remappedCount > 0) {
    state.onEvent?.(
      `Preliminary evidence remap: ${remapResult.remappedCount}/${remapResult.totalUnresolved} items resolved`,
      -1,
    );
  }

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
  // Per-claim floor: each claim must receive at least this many targeted research
  // iterations before seeded evidence can make it sufficient (default: 1).
  const sufficiencyMinResearchedIterationsPerClaim = pipelineConfig.sufficiencyMinResearchedIterationsPerClaim ?? 1;
  const maxSourcesPerIteration = searchConfig.maxSourcesPerIteration ?? 8;
  const timeBudgetMs = pipelineConfig.researchTimeBudgetMs ?? 10 * 60 * 1000;
  const zeroYieldBreakThreshold = pipelineConfig.researchZeroYieldBreakThreshold ?? 2;
  // Fix 4: Reserve query budget for contradiction loop so main loop cannot starve it.
  const contradictionReservedQueries = pipelineConfig.contradictionReservedQueries ?? 2;
  const contradictionAdmissionEnabled = pipelineConfig.contradictionAdmissionEnabled ?? true;
  const contradictionProtectedTimeMs = Math.max(
    0,
    pipelineConfig.contradictionProtectedTimeMs ?? 2 * 60 * 1000,
  );
  // MT-3: distinct event count for coverage guard
  const distinctEventCount = state.understanding?.distinctEvents?.length ?? 0;

  // Diversity-aware sufficiency: when enabled, Stage 2 also requires D5-level
  // source-type/domain diversity before declaring a claim sufficient.
  const diversityAware = pipelineConfig.diversityAwareSufficiency ?? false;
  const diversityConfig: DiversitySufficiencyConfig | undefined = diversityAware
    ? {
        minSourceTypes: calcConfig.evidenceSufficiencyMinSourceTypes ?? 2,
        minDistinctDomains: calcConfig.evidenceSufficiencyMinDistinctDomains ?? 3,
        minItems: calcConfig.evidenceSufficiencyMinItems ?? 3,
        includeSeeded: true, // D5 alignment: count all claim-mapped evidence
      }
    : undefined;

  const researchStartMs = Date.now();
  const consecutiveZeroYieldByClaim: Record<string, number> = {};
  const zeroYieldExhaustedClaimIds = new Set<string>();
  let budgetExhaustionWarned = false;
  let timeBudgetWarned = false;

  for (let iteration = 0; iteration < maxMainIterations; iteration++) {
    // Abort signal check
    checkAbortSignal(jobId);

    // Time budget check
    const elapsedMs = Date.now() - researchStartMs;
    if (elapsedMs > timeBudgetMs) {
      state.onEvent?.(`Research time budget reached (${Math.round(elapsedMs / 60000)} min), proceeding to analysis...`, 55);
      timeBudgetWarned = true;
      state.warnings.push({
        type: "budget_exceeded",
        severity: "warning",
        message: `Research time budget reached after ${Math.round(elapsedMs / 60000)} minutes - analysis may have incomplete evidence.`,
        details: { elapsedMs, budgetMs: timeBudgetMs, iterationsCompleted: iteration },
      });
      break;
    }

    if (
      contradictionAdmissionEnabled
      && reservedContradiction > 0
      && contradictionProtectedTimeMs > 0
      && elapsedMs + contradictionProtectedTimeMs > timeBudgetMs
    ) {
      const remainingMs = Math.max(0, timeBudgetMs - elapsedMs);
      markContradictionMainResearchEnded(state, remainingMs);
      state.onEvent?.(
        `Protected contradiction research window reached (${Math.round(remainingMs / 1000)}s remaining), transitioning...`,
        55,
      );
      break;
    }

    // MT-1 + MT-3: Pass iteration count and distinct event count so sufficiency
    // cannot fire before the minimum required iterations have completed.
    // When diversityConfig is set, also requires D5-level source-type/domain diversity.
    // Per-claim floor: each claim must have received at least N targeted research
    // iterations before seeded evidence can make it sufficient.
    if (allClaimsSufficient(claims, state.evidenceItems, sufficiencyThreshold, {
      mainIterationsCompleted: state.mainIterationsUsed,
      minMainIterations: sufficiencyMinMainIterations,
      distinctEventCount,
      diversityConfig,
      researchedIterationsByClaim: state.researchedIterationsByClaim,
      minResearchedIterationsPerClaim: sufficiencyMinResearchedIterationsPerClaim,
    })) break;

    // Find claim with fewest evidence items that still has budget remaining.
    // Fix 4: Stop main loop when remaining budget equals contradiction reserve,
    // so the contradiction loop (which checks > 0) can use the reserved queries.
    const queryBudgetEligibleClaims = claims.filter(
      (claim) => getClaimQueryBudgetRemaining(state, claim.id, pipelineConfig) > contradictionReservedQueries,
    );
    if (queryBudgetEligibleClaims.length === 0) {
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
    const budgetEligibleClaims = queryBudgetEligibleClaims.filter(
      (claim) => !zeroYieldExhaustedClaimIds.has(claim.id),
    );
    if (budgetEligibleClaims.length === 0) {
      state.onEvent?.(
        `No new evidence found after ${zeroYieldBreakThreshold} zero-yield iteration(s) for each remaining claim, proceeding...`,
        55,
      );
      break;
    }
    const targetingPool = sufficiencyMinResearchedIterationsPerClaim > 0
      ? budgetEligibleClaims.filter(
          (claim) =>
            (state.researchedIterationsByClaim?.[claim.id] ?? 0)
            < sufficiencyMinResearchedIterationsPerClaim,
        )
      : [];
    const targetClaim = findLeastResearchedClaim(
      targetingPool.length > 0 ? targetingPool : budgetEligibleClaims,
      state.evidenceItems,
      diversityConfig,
      sufficiencyThreshold,
    );
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
      {
        enabled: contradictionAdmissionEnabled && reservedContradiction > 0,
        researchStartMs,
        timeBudgetMs,
        protectedTimeMs: contradictionProtectedTimeMs,
      },
    );

    state.mainIterationsUsed++;
    // Track per-claim researched iterations for the sufficiency per-claim floor.
    state.researchedIterationsByClaim[targetClaim.id] = (state.researchedIterationsByClaim[targetClaim.id] ?? 0) + 1;

    // Diminishing returns detection
    const newItems = state.evidenceItems.length - beforeCount;
    if (newItems === 0) {
      const zeroYieldCount = (consecutiveZeroYieldByClaim[targetClaim.id] ?? 0) + 1;
      consecutiveZeroYieldByClaim[targetClaim.id] = zeroYieldCount;
      if (zeroYieldCount >= zeroYieldBreakThreshold) {
        zeroYieldExhaustedClaimIds.add(targetClaim.id);
        state.onEvent?.(
          `No new evidence found for ${targetClaim.id} in ${zeroYieldCount} consecutive iteration(s), trying other claims...`,
          -1,
        );
      }
    } else {
      consecutiveZeroYieldByClaim[targetClaim.id] = 0;
    }
  }

  const elapsedAfterMainMs = Date.now() - researchStartMs;
  markContradictionMainResearchEnded(state, Math.max(0, timeBudgetMs - elapsedAfterMainMs));

  if (reservedContradiction <= 0) {
    markContradictionNotRun(state, "no_reserved_iterations");
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
      if (state.contradictionIterationsUsed === 0) {
        markContradictionNotRun(state, "time_budget_exhausted");
      }
      if (!timeBudgetWarned) {
        timeBudgetWarned = true;
        state.warnings.push({
          type: "budget_exceeded",
          severity: "warning",
          message: `Research time budget reached during contradiction search after ${Math.round(contradictionElapsedMs / 60000)} minutes - contradiction evidence may be incomplete.`,
          details: {
            stage: "research_budget",
            elapsedMs: contradictionElapsedMs,
            budgetMs: timeBudgetMs,
            mainIterationsCompleted: state.mainIterationsUsed,
            contradictionIterationsCompleted: state.contradictionIterationsUsed,
          },
        });
      }
      break;
    }

    // Target: claim with fewest contradicting evidence items that still has budget remaining.
    const budgetEligibleClaims = claims.filter(
      (claim) => getClaimQueryBudgetRemaining(state, claim.id, pipelineConfig) > 0,
    );
    if (budgetEligibleClaims.length === 0) {
      console.info("[Stage2] Shared per-claim query budgets exhausted for all claims; skipping contradiction loop.");
      if (state.contradictionIterationsUsed === 0) {
        markContradictionNotRun(state, "query_budget_exhausted");
      }
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
    if (!targetClaim) {
      if (state.contradictionIterationsUsed === 0) {
        markContradictionNotRun(state, "no_target_claim");
      }
      break;
    }

    // Emit progress update for contradiction search (55% → 58%)
    if (state.onEvent) {
      const progress = 55 + Math.round((cIter / reservedContradiction) * 3);
      state.onEvent(`Searching for contradicting evidence (${cIter + 1}/${reservedContradiction})...`, progress);
    }

    markContradictionStarted(state);
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
    updateContradictionReachability(state);
  }
  updateContradictionReachability(state);
  if (
    reservedContradiction > 0
    && claims.length > 0
    && state.contradictionIterationsUsed === 0
  ) {
    markContradictionNotRun(state, state.researchWasteMetrics?.contradictionReachability.notRunReason ?? "not_reached");
    const reachability = state.researchWasteMetrics?.contradictionReachability;
    const alreadyWarned = state.warnings.some(
      (warning) =>
        warning.type === "unverified_research_incomplete"
        && warning.details?.stage === "research_contradiction_admission",
    );
    if (!alreadyWarned) {
      state.warnings.push({
        type: "unverified_research_incomplete",
        severity: "warning",
        message: "Contradiction research was not attempted before Stage 2 ended; verdict reliability may be reduced.",
        details: {
          stage: "research_contradiction_admission",
          notRunReason: reachability?.notRunReason ?? "not_reached",
          remainingMsWhenMainResearchEnded: reachability?.remainingMsWhenMainResearchEnded ?? null,
          mainIterationsUsed: state.mainIterationsUsed,
          contradictionIterationsUsed: state.contradictionIterationsUsed,
          contradictionSourcesFound: state.contradictionSourcesFound,
        },
      });
    }
  }

  // ------------------------------------------------------------------
  // Step 4: Batch SR-Eval for all collected sources (deferred from per-iteration)
  // ------------------------------------------------------------------
  const sourceReliabilityUrls = collectSourceReliabilityUrls(state);
  if (sourceReliabilityUrls.length > 0) {
    state.onEvent?.(
      `Evaluating source reliability for ${sourceReliabilityUrls.length}/${state.sources.length} evidence-linked source(s)...`,
      58,
    );
    const srPrefetch = await prefetchSourceReliability(sourceReliabilityUrls, {
      config: srConfig,
      maxLiveEvaluations: srConfig.maxLiveEvaluationsPerRun,
      budgetMs: srConfig.runtimeBudgetMs,
      minEvaluationBudgetMs: srConfig.minLiveEvaluationBudgetMs,
    });
    if (srPrefetch.skippedDueToLimit > 0 || srPrefetch.skippedDueToBudget > 0) {
      state.onEvent?.(
        `Source reliability limited: ${srPrefetch.evaluated} evaluated, ${srPrefetch.cacheHits} cache hit(s), ${srPrefetch.skippedDueToLimit + srPrefetch.skippedDueToBudget} skipped.`,
        -1,
      );
      state.warnings.push({
        type: "source_reliability_budget_limited",
        severity: "info",
        message:
          `Source reliability live evaluation skipped ${srPrefetch.skippedDueToLimit + srPrefetch.skippedDueToBudget} domain(s) ` +
          `because the per-run limit or runtime budget was exhausted. Those domains use unknown reliability defaults.`,
        details: {
          stage: "research_sr",
          skippedDueToLimit: srPrefetch.skippedDueToLimit,
          skippedDueToBudget: srPrefetch.skippedDueToBudget,
          liveEvaluationLimit: srPrefetch.liveEvaluationLimit,
          liveEvaluationBudgetMs: srPrefetch.liveEvaluationBudgetMs,
          evaluated: srPrefetch.evaluated,
          cacheHits: srPrefetch.cacheHits,
        },
      });
    }
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
          skippedDueToLimit: srPrefetch.skippedDueToLimit,
          skippedDueToBudget: srPrefetch.skippedDueToBudget,
          liveEvaluationLimit: srPrefetch.liveEvaluationLimit,
          liveEvaluationBudgetMs: srPrefetch.liveEvaluationBudgetMs,
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

// --- LLM Remap Zod schema (compact output) ---

const RemapOutputSchema = z.object({
  mappings: z.array(z.object({
    index: z.number(),
    relevantClaimIds: z.array(z.string()),
  })),
});

/**
 * Check if a preliminary evidence item would be resolved by the existing
 * deterministic remap heuristics in seedEvidenceFromPreliminarySearch.
 *
 * Replicates the logic of steps 1-4 without mutating state.
 * Single-claim fallback (step 3) is handled by the caller — this function
 * is only called when knownClaimIds.size > 1.
 */
export function wouldResolveExistingRemap(
  pe: { claimId?: string; relevantClaimIds?: string[] },
  knownClaimIds: Set<string>,
): boolean {
  // Step 1: relevantClaimIds contain a known AC_* ID
  if (pe.relevantClaimIds && pe.relevantClaimIds.length > 0) {
    if (pe.relevantClaimIds.some((id) => knownClaimIds.has(id))) return true;
  }

  // Step 2: legacy single claimId matches
  if (pe.claimId && knownClaimIds.has(pe.claimId)) return true;

  // Step 3: single-claim fallback — not applicable (>1 claims)

  // Step 4: numeric heuristic  claim_01 → AC_01
  const rawIds = pe.relevantClaimIds ?? (pe.claimId ? [pe.claimId] : []);
  for (const rawId of rawIds) {
    if (rawId.startsWith("claim_")) {
      const num = rawId.replace("claim_", "");
      const mappedId = `AC_${num.padStart(2, "0")}`;
      if (knownClaimIds.has(mappedId)) return true;
    }
  }

  return false;
}

/**
 * LLM remap for unresolved seeded preliminary evidence (Option C).
 *
 * After Pass 2 has produced final AC_* claims, some preliminary evidence
 * items have semantic slug IDs (e.g., "claim_bolsonaro_proceedings") that
 * don't match any final claim. This function sends those unresolved items
 * to a single batched Haiku call to determine their correct claim mappings.
 *
 * Only fires when:
 * - preliminaryEvidenceLlmRemapEnabled is true in pipeline config
 * - There are >1 final claims (single-claim inputs use the existing fallback)
 * - There are unresolved items after the existing heuristic check
 *
 * Fail-open: if the LLM call fails or returns invalid output, items remain
 * unmapped (same as current baseline behavior).
 *
 * Mutates: state.understanding.preliminaryEvidence[].relevantClaimIds
 */
export async function remapUnresolvedSeededEvidence(
  state: CBResearchState,
  pipelineConfig: PipelineConfig,
): Promise<{ remappedCount: number; totalUnresolved: number }> {
  const preliminary = state.understanding?.preliminaryEvidence ?? [];
  const claims = state.understanding?.atomicClaims ?? [];
  const knownClaimIds = new Set(claims.map((c) => c.id));

  // Guard: disabled, single-claim, or no preliminary evidence
  if (!pipelineConfig.preliminaryEvidenceLlmRemapEnabled) {
    return { remappedCount: 0, totalUnresolved: 0 };
  }
  if (knownClaimIds.size <= 1 || preliminary.length === 0) {
    return { remappedCount: 0, totalUnresolved: 0 };
  }

  // Identify items that would fail all existing remap heuristics
  const unresolvedIndices: number[] = [];
  for (let i = 0; i < preliminary.length; i++) {
    if (!wouldResolveExistingRemap(preliminary[i], knownClaimIds)) {
      unresolvedIndices.push(i);
    }
  }

  if (unresolvedIndices.length === 0) {
    return { remappedCount: 0, totalUnresolved: 0 };
  }

  debugLog(
    `[Stage2] LLM remap: ${unresolvedIndices.length}/${preliminary.length} ` +
    `preliminary items unresolved — sending to Haiku.`,
  );

  // Build compact LLM input
  const claimsForPrompt = claims.map((c) => ({ id: c.id, statement: c.statement }));
  const unmappedForPrompt = unresolvedIndices.map((idx, promptIdx) => ({
    index: promptIdx,
    statement: preliminary[idx].snippet,
    sourceTitle: preliminary[idx].sourceTitle ?? "",
  }));

  try {
    const rendered = await loadAndRenderSection("claimboundary", "REMAP_SEEDED_EVIDENCE", {
      atomicClaimsJson: JSON.stringify(claimsForPrompt, null, 2),
      unmappedEvidenceJson: JSON.stringify(unmappedForPrompt, null, 2),
    });
    if (!rendered) {
      console.warn("[Stage2] Failed to load REMAP_SEEDED_EVIDENCE prompt — skipping remap.");
      return { remappedCount: 0, totalUnresolved: unresolvedIndices.length };
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
        {
          role: "user",
          content:
            `Map ${unmappedForPrompt.length} evidence items to the ${claimsForPrompt.length} atomic claims listed in the system prompt.`,
        },
      ],
      temperature: 0.1,
      output: Output.object({ schema: RemapOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    state.llmCalls++;

    const raw = extractStructuredOutput(result);
    if (!raw) {
      console.warn("[Stage2] LLM remap returned empty or unparseable result — skipping.");
      return { remappedCount: 0, totalUnresolved: unresolvedIndices.length };
    }
    const parseResult = RemapOutputSchema.safeParse(raw);
    if (!parseResult.success) {
      console.warn("[Stage2] LLM remap output failed schema validation — skipping.", parseResult.error.message);
      return { remappedCount: 0, totalUnresolved: unresolvedIndices.length };
    }
    const parsed = parseResult.data;

    // Apply mappings — filter to known claim IDs only
    let remappedCount = 0;
    for (const mapping of parsed.mappings) {
      if (mapping.index < 0 || mapping.index >= unresolvedIndices.length) continue;
      const originalIdx = unresolvedIndices[mapping.index];
      const validIds = mapping.relevantClaimIds.filter((id) => knownClaimIds.has(id));
      if (validIds.length > 0) {
        preliminary[originalIdx].relevantClaimIds = validIds;
        remappedCount++;
      }
    }

    if (remappedCount > 0) {
      debugLog(
        `[Stage2] LLM remap: resolved ${remappedCount}/${unresolvedIndices.length} unresolved seeded items.`,
      );
    } else {
      debugLog(
        `[Stage2] LLM remap: 0/${unresolvedIndices.length} items resolved (LLM returned no valid mappings).`,
      );
    }

    return { remappedCount, totalUnresolved: unresolvedIndices.length };
  } catch (err) {
    console.warn("[Stage2] LLM remap failed (fail-open):", err);
    return { remappedCount: 0, totalUnresolved: unresolvedIndices.length };
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
  const seededItems: EvidenceItem[] = [];

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

    const seededItem: EvidenceItem = {
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
    };
    state.evidenceItems.push(seededItem);
    seededItems.push(seededItem);
  }

  if (seededItems.length > 0) {
    recordSeededEvidenceTelemetry(state, seededItems);
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
  timingGuard?: ResearchIterationTimingGuard,
): Promise<void> {
  const checkResearchAbort = () => checkAbortSignal(state.jobId);
  checkResearchAbort();

  const remainingBudget = getClaimQueryBudgetRemaining(state, targetClaim.id, pipelineConfig);
  if (remainingBudget <= 0) {
    console.info(`[Stage2] Query budget exhausted for claim "${targetClaim.id}"; skipping ${iterationType} iteration.`);
    return;
  }
  const contradictionReservedQueries = pipelineConfig.contradictionReservedQueries ?? 2;
  const availableQueryBudget = iterationType === "main"
    ? Math.max(0, remainingBudget - contradictionReservedQueries)
    : remainingBudget;
  if (availableQueryBudget <= 0) {
    console.info(
      `[Stage2] Query budget reserved for claim "${targetClaim.id}"; skipping ${iterationType} iteration.`,
    );
    return;
  }
  const maxQueriesThisIteration = Math.min(
    availableQueryBudget,
    Math.max(1, pipelineConfig.researchMaxQueriesPerIteration ?? 4),
  );
  const iterationStartedAt = Date.now();
  state.researchedIterationsByClaim ??= {};
  const priorMainIterationsForClaim = state.researchedIterationsByClaim[targetClaim.id] ?? 0;
  const evidenceCountBeforeIteration = state.evidenceItems.length;
  const searchQueryCountBeforeIteration = state.searchQueries.length;
  const iterationIndex = state.mainIterationsUsed + state.contradictionIterationsUsed;
  const claimRelevantGeographies = getClaimRelevantGeographies(
    targetClaim,
    searchConfig.searchGeographyOverride ?? state.understanding?.inferredGeography ?? null,
  );

  checkResearchAbort();
  state.onEvent?.(`Generating ${iterationType} research queries for ${targetClaim.id}...`, -1);

  // 1. Generate search queries via LLM (Haiku)
  const queries = sortGeneratedResearchQueries(await generateResearchQueries(
    targetClaim,
    iterationType,
    state.evidenceItems,
    pipelineConfig,
    currentDate,
    state.understanding?.distinctEvents ?? [],
    maxQueriesThisIteration,
    {
      language: searchConfig.searchLanguageOverride ?? state.understanding?.detectedLanguage,
      geography: searchConfig.searchGeographyOverride ?? state.understanding?.inferredGeography,
      geographies: claimRelevantGeographies,
    },
  )).slice(0, maxQueriesThisIteration);
  state.llmCalls++;
  checkResearchAbort();
  const generatedQueryCount = queries.length;
  if (generatedQueryCount === 0) {
    state.onEvent?.(`No ${iterationType} research queries generated for ${targetClaim.id}.`, -1);
  } else {
    state.onEvent?.(`Generated ${generatedQueryCount} ${iterationType} research query item(s) for ${targetClaim.id}.`, -1);
  }
  const iterationTelemetry = createClaimIterationTelemetryEntry(
    iterationIndex,
    iterationType,
    queries.map((query) => query.query),
    targetClaim.freshnessRequirement,
  );

  let protectedTimeEventEmitted = false;
  const isProtectedContradictionWindowReached = (): boolean => {
    if (iterationType !== "main") return false;
    if (!timingGuard?.enabled || timingGuard.protectedTimeMs <= 0) return false;
    const elapsedMs = Date.now() - timingGuard.researchStartMs;
    return elapsedMs + timingGuard.protectedTimeMs > timingGuard.timeBudgetMs;
  };
  const shouldStopForProtectedTime = (
    focus: "main" | "contradiction" | "contrarian" | "refinement" | "supplementary",
  ): boolean => {
    if (!isProtectedContradictionWindowReached()) return false;
    if (!protectedTimeEventEmitted) {
      const elapsedMs = Date.now() - timingGuard!.researchStartMs;
      const remainingMs = Math.max(0, timingGuard!.timeBudgetMs - elapsedMs);
      state.onEvent?.(
        `Protected contradiction research window reached during ${focus} research for ${targetClaim.id} (${Math.round(remainingMs / 1000)}s remaining), stopping main query spending...`,
        -1,
      );
      protectedTimeEventEmitted = true;
    }
    return true;
  };

  const executeGeneratedQueries = async (
    generatedQueries: GeneratedResearchQuery[],
    focus: "main" | "contradiction" | "contrarian" | "refinement",
    telemetry: ClaimAcquisitionIterationEntry,
  ): Promise<void> => {
    for (const queryObj of generatedQueries) {
      checkResearchAbort();

      if (shouldStopForProtectedTime(focus)) {
        break;
      }

      if (!consumeClaimQueryBudget(state, targetClaim.id, pipelineConfig, 1)) {
        console.info(`[Stage2] Query budget exhausted for claim "${targetClaim.id}" during ${focus} iteration.`);
        break;
      }

      try {
        const dateRestrict = queryObj.freshnessWindow && queryObj.freshnessWindow !== "none"
          ? queryObj.freshnessWindow
          : undefined;
        const cacheTtlDaysOverride = dateRestrict
          ? (pipelineConfig.freshQueryCacheTtlDays ?? 1)
          : undefined;

        // 2. Web search — no geo/language params sent to search providers.
        // Query generation prompt handles language; search stays unfiltered.
        // detectedLanguage is threaded for language-aware supplementary providers (Wikipedia).
        state.onEvent?.(`Searching ${focus} source candidates for ${targetClaim.id}...`, -1);
        const response = await searchWebWithProvider({
          query: queryObj.query,
          maxResults: maxSourcesPerIteration,
          config: searchConfig,
          detectedLanguage: searchConfig.searchLanguageOverride ?? state.understanding?.detectedLanguage,
          claimFreshnessRequirement: targetClaim.freshnessRequirement,
          dateRestrict,
          cacheTtlDaysOverride,
        });
        checkResearchAbort();

        state.searchQueries.push({
          query: queryObj.query,
          iteration: iterationIndex,
          focus,
          resultsCount: response.results.length,
          timestamp: new Date().toISOString(),
          searchProvider: response.providersUsed.join(", "),
          language: state.languageIntent?.inputLanguage ?? state.understanding?.detectedLanguage,
          languageLane: "primary",
        });
        if (response.results.length > 0) {
          const eventPrefix = focus === "refinement" ? "Refinement search" : "Search";
          state.onEvent?.(`${eventPrefix}: ${response.providersUsed.join(", ")} — ${response.results.length} results`, -1);
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
        telemetry.searchResults += response.results.length;

        // 3. Relevance classification via LLM (Haiku, batched)
        state.onEvent?.(`Classifying ${response.results.length} search result(s) for ${targetClaim.id}...`, -1);
        const {
          relevantSources,
          cacheHit: relevanceCacheHit,
        } = await classifyRelevanceWithJobCache({
          state,
          claim: targetClaim,
          searchResults: response.results,
          pipelineConfig,
          currentDate,
          inferredGeography: state.understanding?.inferredGeography ?? null,
          relevantGeographies: claimRelevantGeographies,
        });
        if (!relevanceCacheHit) state.llmCalls++;
        checkResearchAbort();
        telemetry.relevanceAccepted += relevantSources.length;
        telemetry.losses.relevanceRejected += Math.max(
          response.results.length - relevantSources.length,
          0,
        );

        if (relevantSources.length === 0) continue;

        // 4. Fetch top sources — sorted by relevance score desc, original search rank asc (tie-break)
        const { selectTopSources } = await import("./pipeline-utils");
        const topN = pipelineConfig.relevanceTopNFetch ?? 5;
        const selectedForFetch = selectTopSources(relevantSources, topN);
        state.onEvent?.(`Fetching ${selectedForFetch.length} relevant source(s) for ${targetClaim.id}...`, -1);
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
          {
            classifyDiscoveredSources: async (discoveredSources) => {
              const {
                relevantSources: discoveredRelevant,
                cacheHit: discoveredRelevanceCacheHit,
              } = await classifyRelevanceWithJobCache({
                state,
                claim: targetClaim,
                searchResults: discoveredSources,
                pipelineConfig,
                currentDate,
                inferredGeography: state.understanding?.inferredGeography ?? null,
                relevantGeographies: claimRelevantGeographies,
              });
              if (!discoveredRelevanceCacheHit) state.llmCalls++;
              return discoveredRelevant;
            },
          },
        );
        checkResearchAbort();
        telemetry.sourcesFetched += fetchedSources.length;
        telemetry.losses.fetchRejected += Math.max(
          relevantSources.length - fetchedSources.length,
          0,
        );

        if (fetchedSources.length === 0) continue;

        // 5. Reliability prefetch — DEFERRED to batch after research loop (perf fix)
        // SR data is only needed in Stage 4 (verdict) and Stage 5 (aggregation),
        // not during research iteration decisions. Deferring saves 15-25s per new domain.

        // 6. Evidence extraction with mandatory EvidenceScope (Haiku, batched)
        state.onEvent?.(`Extracting evidence from ${fetchedSources.length} fetched source(s) for ${targetClaim.id}...`, -1);
        const rawEvidence = await extractResearchEvidence(
          targetClaim,
          fetchedSources,
          pipelineConfig,
          currentDate,
          state.understanding?.atomicClaims ?? [targetClaim],
        );
        state.llmCalls++;
        checkResearchAbort();
        telemetry.rawEvidenceItems += rawEvidence.length;
        const extractedSourceUrls = new Set(
          rawEvidence
            .map((item) => item.sourceUrl)
            .filter((url): url is string => Boolean(url)),
        );
        telemetry.losses.sourcesWithoutEvidence += fetchedSources.filter(
          (source) => !extractedSourceUrls.has(source.url),
        ).length;

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
        telemetry.losses.probativeFilteredOut += Math.max(
          rawEvidence.length - kept.length,
          0,
        );

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

        // 11. Per-source evidence cap (Fix 2 — single-source flooding mitigation)
        // Reselects best-N across existing+new by probativeValue, evicting weaker
        // existing items when a stronger new item arrives from the same source.
        const maxPerSource = pipelineConfig.maxEvidenceItemsPerSource ?? 5;
        const { kept: cappedItems, capped: cappedCount, evictedIds } = applyPerSourceCap(
          kept, state.evidenceItems, maxPerSource,
        );
        if (cappedCount > 0 || evictedIds.length > 0) {
          debugLog(
            `[Stage2] Per-source cap: kept ${cappedItems.length}/${kept.length} new, ` +
            `dropped ${cappedCount} new, evicted ${evictedIds.length} existing (max ${maxPerSource}/source).`,
          );
          state.warnings?.push({
            type: "per_source_evidence_cap",
            severity: "info",
            message: `Per-source cap (max ${maxPerSource}): kept ${cappedItems.length}/${kept.length} new, ` +
              `dropped ${cappedCount}, evicted ${evictedIds.length} existing.`,
            details: { maxPerSource, keptNew: cappedItems.length, totalNew: kept.length, droppedNew: cappedCount, evictedExisting: evictedIds.length },
          });
        }
        telemetry.losses.perSourceCapDroppedNew += cappedCount;
        telemetry.losses.perSourceCapEvictedExisting += evictedIds.length;
        if (evictedIds.length > 0) {
          const evictedSet = new Set(evictedIds);
          state.evidenceItems = state.evidenceItems.filter((e) => !evictedSet.has(e.id));
        }
        state.evidenceItems.push(...cappedItems);
        const claimLocalCappedItems = cappedItems.filter(
          (item) => item.relevantClaimIds?.includes(targetClaim.id),
        );
        telemetry.admittedEvidenceItems += claimLocalCappedItems.length;
        for (const item of claimLocalCappedItems) {
          incrementDirectionCounts(telemetry.directionCounts, item.claimDirection);
        }
        state.onEvent?.(`Admitted ${claimLocalCappedItems.length} evidence item(s) for ${targetClaim.id}.`, -1);

        // Track contradiction/contrarian sources
        if (iterationType === "contradiction" || iterationType === "contrarian") {
          state.contradictionSourcesFound += fetchedSources.length;
        }
      } catch (err) {
        if (isJobAbortError(err)) {
          throw err;
        }

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
  };

  await executeGeneratedQueries(queries, iterationType, iterationTelemetry);
  iterationTelemetry.durationMs = Date.now() - iterationStartedAt;
  recordClaimIterationTelemetry(state, targetClaim.id, iterationTelemetry);

  const remainingBudgetAfterMainQueries = getClaimQueryBudgetRemaining(state, targetClaim.id, pipelineConfig);
  const availableRefinementBudget = Math.max(0, remainingBudgetAfterMainQueries - contradictionReservedQueries);
  const refinementBudget = Math.min(
    pipelineConfig.primarySourceRefinementMaxQueries ?? 1,
    availableRefinementBudget,
  );
  const refinementNeeded = claimNeedsPrimarySourceRefinement(targetClaim, state.evidenceItems);
  const hasMainQueryMetadata = queries.some(hasExplicitRetrievalMetadata);
  checkResearchAbort();
  if (
    iterationType === "main"
    && priorMainIterationsForClaim === 0
    && (pipelineConfig.primarySourceRefinementEnabled ?? true)
    && refinementBudget > 0
    && refinementNeeded
    && !shouldStopForProtectedTime("refinement")
  ) {
    if (!hasMainQueryMetadata) {
      console.warn(
        `[Stage2] Main queries for claim "${targetClaim.id}" lacked retrieval metadata; ` +
        `attempting primary-source refinement anyway using refinement-plan metadata and fallback ordering.`,
      );
    }
    checkResearchAbort();
    state.onEvent?.(`Generating direct-source refinement queries for ${targetClaim.id}...`, -1);
    const refinementPlan = sortGeneratedResearchQueries(await generateResearchQueries(
      targetClaim,
      "refinement",
      state.evidenceItems,
      pipelineConfig,
      currentDate,
      state.understanding?.distinctEvents ?? [],
      refinementBudget,
      {
        language: searchConfig.searchLanguageOverride ?? state.understanding?.detectedLanguage,
        geography: searchConfig.searchGeographyOverride ?? state.understanding?.inferredGeography,
        geographies: claimRelevantGeographies,
      },
    ));
    state.llmCalls++;
    checkResearchAbort();

    if (!refinementPlan.some(hasExplicitRetrievalMetadata)) {
      console.warn(
        `[Stage2] Refinement queries for claim "${targetClaim.id}" also lacked retrieval metadata; ` +
        `continuing with fallback ordering because skipping the refinement pass can hide recoverable primary sources.`,
      );
    }

    const prioritizedRefinementQueries = refinementPlan.filter(
      (query) => query.retrievalLane !== "secondary_context",
    );
    const selectedRefinementQueries = (
      prioritizedRefinementQueries.length > 0
        ? prioritizedRefinementQueries
        : refinementPlan
    ).slice(0, refinementBudget);

    if (selectedRefinementQueries.length > 0) {
      const refinementStartedAt = Date.now();
      const refinementTelemetry = createClaimIterationTelemetryEntry(
        iterationIndex,
        "refinement",
        selectedRefinementQueries.map((query) => query.query),
        targetClaim.freshnessRequirement,
        "primary_source_refinement:triggered",
      );
      await executeGeneratedQueries(selectedRefinementQueries, "refinement", refinementTelemetry);
      const recoveredPrimaryCoverage = hasNonSeededPrimarySourceCoverage(targetClaim, state.evidenceItems);
      refinementTelemetry.laneReason = recoveredPrimaryCoverage
        ? "primary_source_refinement:recovered_non_seeded_primary_coverage"
        : "primary_source_refinement:no_new_primary_coverage";
      refinementTelemetry.durationMs = Date.now() - refinementStartedAt;
      recordClaimIterationTelemetry(state, targetClaim.id, refinementTelemetry);
      debugLog(
        `[Stage2] Primary-source refinement ${recoveredPrimaryCoverage ? "recovered" : "did not recover"} ` +
        `non-seeded primary coverage for claim ${targetClaim.id}.`,
      );
    }
  }

  if (iterationType === "contrarian") {
    const newItems = state.evidenceItems.length - evidenceCountBeforeIteration;
    console.info(
      `[Pipeline] D5 contrarian: claim ${targetClaim.id} -> ${generatedQueryCount} queries generated, ${newItems} new items`,
    );
  }

  // Supplementary English lane: check if THIS iteration's primary-language yield is below scarcity thresholds
  const thisIterationQueries = state.searchQueries.slice(searchQueryCountBeforeIteration);
  const totalResultsThisIteration = thisIterationQueries
    .filter((q) => q.languageLane === "primary" || !q.languageLane)
    .reduce((sum, q) => sum + q.resultsCount, 0);
  const newEvidenceThisIteration = state.evidenceItems.length - evidenceCountBeforeIteration;
  if (!shouldStopForProtectedTime("supplementary")) {
    await maybeRunSupplementaryEnglishLane(
      targetClaim, iterationType, searchConfig, pipelineConfig, currentDate, state,
      totalResultsThisIteration, newEvidenceThisIteration,
    );
  }

  // Late-stage additions (contrarian iterations and supplementary EN lane) can
  // append evidence after the batch Stage-2 reconciliation pass. Reconcile
  // source links at the end of every iteration so final evidence items retain
  // canonical sourceId/sourceTitle before clustering and verdict validation.
  const reconciledSourceIdsCount = reconcileEvidenceSourceIds(state.evidenceItems, state.sources);
  if (reconciledSourceIdsCount > 0) {
    debugLog(
      `[Stage2] Iteration-level source reconciliation updated ${reconciledSourceIdsCount}/${state.evidenceItems.length} evidence items after late additions`,
    );
  }
}

// ============================================================================
// SUPPLEMENTARY ENGLISH LANE (Proposal 2)
// ============================================================================

/**
 * Check if the supplementary English lane should fire after a primary-language
 * research iteration, and if so, run one English query for coverage expansion.
 *
 * Triggers only when: enabled + non-English input + iteration type allowed +
 * primary yield below scarcity thresholds.
 *
 * NEVER used as a contrarian-balancing proxy. Language lane is independent
 * from evidential direction.
 */
export async function maybeRunSupplementaryEnglishLane(
  targetClaim: AtomicClaim,
  iterationType: string,
  searchConfig: SearchConfig,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  state: CBResearchState,
  primaryResultsCount: number,
  primaryNewEvidenceCount: number,
): Promise<void> {
  const enLane = searchConfig.supplementaryEnglishLane;
  if (!enLane?.enabled) return;

  const inputLang = state.languageIntent?.inputLanguage ?? state.understanding?.detectedLanguage;
  if (!inputLang || inputLang === "en") return; // Already English — no supplementary needed

  const allowedTypes = enLane.applyInIterationTypes ?? ["main"];
  if (!allowedTypes.includes(iterationType as any)) return;

  // Gate on evidence items (the meaningful yield that drives D5 downstream), not raw result counts.
  // Raw results include paywalled/empty pages that produce zero evidence — they are not "relevant".
  const minEvidence = enLane.minPrimaryEvidenceItems ?? 2;
  if (primaryNewEvidenceCount >= minEvidence) return;

  const maxQueries = enLane.maxAdditionalQueriesPerClaim ?? 1;
  if (maxQueries <= 0) return;

  // Budget check
  if (!consumeClaimQueryBudget(state, targetClaim.id, pipelineConfig, 1)) return;

  console.info(
    `[Stage2] EN supplementary lane: claim ${targetClaim.id} (primary: ${primaryNewEvidenceCount} evidence < min ${minEvidence}). Generating 1 English query.`,
  );
  const iterationIndex = state.mainIterationsUsed + state.contradictionIterationsUsed;
  const laneReason = `native_scarcity: ${primaryResultsCount} results / ${primaryNewEvidenceCount} evidence below thresholds`;

  // Generate one English query via the standard query generation path
  state.onEvent?.(`Generating English supplementary query for ${targetClaim.id}...`, -1);
  const enQueries = await generateResearchQueries(
    targetClaim,
    iterationType as "main" | "contradiction" | "contrarian",
    state.evidenceItems,
    pipelineConfig,
    currentDate,
    state.understanding?.distinctEvents ?? [],
    1, // max 1 query
    { language: "en", geography: null }, // Force English
  );
  state.llmCalls++;

  if (enQueries.length === 0) return;
  const enIterationStartedAt = Date.now();
  const enTelemetry: ClaimAcquisitionIterationEntry = {
    iteration: iterationIndex,
    iterationType: iterationType as "main" | "contradiction" | "contrarian",
    languageLane: "supplementary_en",
    freshnessRequirement: targetClaim.freshnessRequirement,
    generatedQueries: enQueries.map((query) => query.query),
    searchResults: 0,
    relevanceAccepted: 0,
    sourcesFetched: 0,
    rawEvidenceItems: 0,
    admittedEvidenceItems: 0,
    directionCounts: createEmptyDirectionCounts(),
    losses: {
      relevanceRejected: 0,
      fetchRejected: 0,
      sourcesWithoutEvidence: 0,
      probativeFilteredOut: 0,
      perSourceCapDroppedNew: 0,
      perSourceCapEvictedExisting: 0,
    },
    laneReason,
  };

  const enQuery = enQueries[0];
  try {
    state.onEvent?.(`Searching English supplementary source candidates for ${targetClaim.id}...`, -1);
    const response = await searchWebWithProvider({
      query: enQuery.query,
      maxResults: searchConfig.maxSourcesPerIteration ?? 5,
      config: searchConfig,
      detectedLanguage: "en", // EN lane forces English for language-aware supplementary providers
      claimFreshnessRequirement: targetClaim.freshnessRequirement,
    });

    state.searchQueries.push({
      query: enQuery.query,
      iteration: iterationIndex,
      focus: iterationType,
      resultsCount: response.results.length,
      timestamp: new Date().toISOString(),
      searchProvider: response.providersUsed.join(", "),
      language: "en",
      languageLane: "supplementary_en",
      laneReason,
    });
    enTelemetry.searchResults += response.results.length;

    if (response.results.length > 0) {
      state.onEvent?.(`EN supplementary: ${response.providersUsed.join(", ")} — ${response.results.length} results`, -1);
    }

    // Update retrieval languages if not already present
    if (state.languageIntent && !state.languageIntent.retrievalLanguages.some((l) => l.lane === "supplementary_en")) {
      state.languageIntent.retrievalLanguages.push({
        language: "en",
        lane: "supplementary_en",
        reason: `native_scarcity for claim ${targetClaim.id}`,
      });
    }

    // Report EN-lane provider errors through the same warning + circuit-breaker path as primary lane
    if (response.errors && response.errors.length > 0) {
      for (const provErr of response.errors) {
        if (provErr.provider) {
          recordSearchFailure(provErr.provider, provErr.message);
        }
        upsertSearchProviderWarning(state, {
          provider: provErr.provider, status: provErr.status, message: provErr.message,
          query: enQuery.query, stage: "research_search",
        });
      }
    }

    // Classify relevance through the same LLM path as primary lane (no fixed relevanceScore bypass)
    state.onEvent?.(`Classifying ${response.results.length} English supplementary result(s) for ${targetClaim.id}...`, -1);
    const enLaneRelevantGeographies = getClaimRelevantGeographies(
      targetClaim,
      searchConfig.searchGeographyOverride ?? state.understanding?.inferredGeography ?? null,
    );
    const {
      relevantSources,
      cacheHit: relevanceCacheHit,
    } = await classifyRelevanceWithJobCache({
      state,
      claim: targetClaim,
      searchResults: response.results,
      pipelineConfig,
      currentDate,
      inferredGeography: state.understanding?.inferredGeography ?? null,
      relevantGeographies: enLaneRelevantGeographies,
    });
    if (!relevanceCacheHit) state.llmCalls++;
    enTelemetry.relevanceAccepted += relevantSources.length;
    enTelemetry.losses.relevanceRejected += Math.max(
      response.results.length - relevantSources.length,
      0,
    );

    state.onEvent?.(`Fetching ${relevantSources.length} English supplementary source(s) for ${targetClaim.id}...`, -1);
    const fetchedSources = await fetchSources(
      relevantSources,
      enQuery.query,
      state,
      pipelineConfig,
      {
        classifyDiscoveredSources: async (discoveredSources) => {
          const {
            relevantSources: discoveredRelevant,
            cacheHit: discoveredRelevanceCacheHit,
          } = await classifyRelevanceWithJobCache({
            state,
            claim: targetClaim,
            searchResults: discoveredSources,
            pipelineConfig,
            currentDate,
            inferredGeography: state.understanding?.inferredGeography ?? null,
            relevantGeographies: enLaneRelevantGeographies,
          });
          if (!discoveredRelevanceCacheHit) state.llmCalls++;
          return discoveredRelevant;
        },
      },
    );
    enTelemetry.sourcesFetched += fetchedSources.length;
    enTelemetry.losses.fetchRejected += Math.max(
      relevantSources.length - fetchedSources.length,
      0,
    );
    if (fetchedSources.length === 0) {
      enTelemetry.durationMs = Date.now() - enIterationStartedAt;
      recordClaimIterationTelemetry(state, targetClaim.id, enTelemetry);
      return;
    }

    state.onEvent?.(`Extracting English supplementary evidence from ${fetchedSources.length} source(s) for ${targetClaim.id}...`, -1);
    const rawEvidence = await extractResearchEvidence(
      targetClaim, fetchedSources, pipelineConfig, currentDate, state.understanding?.atomicClaims ?? [targetClaim],
    );
    state.llmCalls++;
    enTelemetry.rawEvidenceItems += rawEvidence.length;
    const extractedSourceUrls = new Set(
      rawEvidence
        .map((item) => item.sourceUrl)
        .filter((url): url is string => Boolean(url)),
    );
    enTelemetry.losses.sourcesWithoutEvidence += fetchedSources.filter(
      (source) => !extractedSourceUrls.has(source.url),
    ).length;

    // EN lane evidence is traceable via searchQuery.languageLane="supplementary_en"
    // and the source's searchQuery field — no separate tag needed on evidence items.

    const { kept } = filterByProbativeValue(rawEvidence);
    enTelemetry.losses.probativeFilteredOut += Math.max(
      rawEvidence.length - kept.length,
      0,
    );
    const maxPerSource = pipelineConfig.maxEvidenceItemsPerSource ?? 5;
    const {
      kept: cappedItems,
      capped: cappedCount,
      evictedIds,
    } = applyPerSourceCap(kept, state.evidenceItems, maxPerSource);
    enTelemetry.losses.perSourceCapDroppedNew += cappedCount;
    enTelemetry.losses.perSourceCapEvictedExisting += evictedIds.length;
    if (evictedIds.length > 0) {
      const evictedSet = new Set(evictedIds);
      state.evidenceItems = state.evidenceItems.filter((e) => !evictedSet.has(e.id));
    }
    state.evidenceItems.push(...cappedItems);
    const claimLocalCappedItems = cappedItems.filter(
      (item) => item.relevantClaimIds?.includes(targetClaim.id),
    );
    enTelemetry.admittedEvidenceItems += claimLocalCappedItems.length;
    for (const item of claimLocalCappedItems) {
      incrementDirectionCounts(enTelemetry.directionCounts, item.claimDirection);
    }
    state.onEvent?.(`Admitted ${claimLocalCappedItems.length} English supplementary evidence item(s) for ${targetClaim.id}.`, -1);
    enTelemetry.durationMs = Date.now() - enIterationStartedAt;
    recordClaimIterationTelemetry(state, targetClaim.id, enTelemetry);
  } catch (err) {
    console.warn(`[Stage2] EN supplementary query failed for "${enQuery.query}":`, err);
    enTelemetry.incomplete = true;
    enTelemetry.durationMs = Date.now() - enIterationStartedAt;
    recordClaimIterationTelemetry(state, targetClaim.id, enTelemetry);
  }
}

// ============================================================================
// STATE HELPERS
// ============================================================================

/**
 * Find the claim with the fewest evidence items (for targeting).
 *
 * When `diversityConfig` is provided, claims that have enough items but
 * fail the diversity threshold are prioritized over claims that simply have
 * fewer items but already meet diversity. This ensures the research loop
 * targets the gap that D5 will later penalize.
 */
export function findLeastResearchedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  diversityConfig?: DiversitySufficiencyConfig,
  countThreshold?: number,
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minScore = Infinity;
  let target: AtomicClaim | null = null;

  const includeSeeded = diversityConfig?.includeSeeded ?? false;
  const effectiveThreshold = diversityConfig?.minItems ?? countThreshold;

  for (const claim of claims) {
    const claimEvidence = evidenceItems.filter((e) => {
      if (!e.relevantClaimIds?.includes(claim.id)) return false;
      if (!includeSeeded && e.isSeeded) return false;
      return true;
    });
    const count = claimEvidence.length;

    let score = count;

    // When diversity-aware: claims that meet count threshold but fail diversity
    // get a large negative score so they are targeted first.
    if (diversityConfig && effectiveThreshold && count >= effectiveThreshold) {
      const distinctSourceTypes = new Set(
        claimEvidence.map(e => e.sourceType).filter(Boolean),
      );
      const distinctDomains = new Set(
        claimEvidence
          .map(e => extractDomain(e.sourceUrl))
          .filter((d): d is string => Boolean(d)),
      );
      const meetsDiversity =
        distinctSourceTypes.size >= diversityConfig.minSourceTypes ||
        distinctDomains.size >= diversityConfig.minDistinctDomains;
      if (!meetsDiversity) {
        // Prioritize diversity-starved claims over count-starved claims
        score = count - 10000;
      }
    }

    if (score < minScore) {
      minScore = score;
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
 * Optional diversity thresholds for Stage 2 sufficiency.
 * When provided, sufficiency requires BOTH item count AND diversity.
 * Mirrors the D5 Control 1 gate in claimboundary-pipeline.ts so
 * Stage 2 can proactively gather diverse evidence instead of letting
 * D5 penalize claims post-hoc.
 */
export interface DiversitySufficiencyConfig {
  /** Minimum distinct source types (e.g., 2). Pass via CalcConfig.evidenceSufficiencyMinSourceTypes. */
  minSourceTypes: number;
  /** Minimum distinct normalized domains (e.g., 3). Pass via CalcConfig.evidenceSufficiencyMinDistinctDomains. */
  minDistinctDomains: number;
  /** D5-aligned item-count threshold. Overrides the pipeline `claimSufficiencyThreshold` when set. */
  minItems: number;
  /** When true, count seeded evidence toward sufficiency (matching D5 behavior). */
  includeSeeded: boolean;
}

/**
 * Check if all claims have reached the sufficiency threshold.
 *
 * When `diversityConfig` is provided (diversityAwareSufficiency=true),
 * a claim is only sufficient if it also meets EITHER the source-type OR
 * domain diversity threshold — matching D5 Control 1's disjunctive OR gate.
 */
/** Options for the optional parameters of allClaimsSufficient. */
export interface SufficiencyOptions {
  mainIterationsCompleted?: number;
  minMainIterations?: number;
  distinctEventCount?: number;
  diversityConfig?: DiversitySufficiencyConfig;
  researchedIterationsByClaim?: Record<string, number>;
  minResearchedIterationsPerClaim?: number;
}

export function allClaimsSufficient(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  threshold: number,
  mainIterationsCompletedOrOpts: number | SufficiencyOptions = 0,
  minMainIterations: number = 1,
  distinctEventCount: number = 0,
  diversityConfig?: DiversitySufficiencyConfig,
  researchedIterationsByClaim?: Record<string, number>,
  minResearchedIterationsPerClaim: number = 1,
): boolean {
  // Support both positional (backward compat) and options-object calling conventions.
  // Options-object form: allClaimsSufficient(claims, evidence, threshold, { ... })
  if (typeof mainIterationsCompletedOrOpts === "object") {
    const opts = mainIterationsCompletedOrOpts;
    return allClaimsSufficient(
      claims, evidenceItems, threshold,
      opts.mainIterationsCompleted ?? 0,
      opts.minMainIterations ?? 1,
      opts.distinctEventCount ?? 0,
      opts.diversityConfig,
      opts.researchedIterationsByClaim,
      opts.minResearchedIterationsPerClaim ?? 1,
    );
  }
  const mainIterationsCompleted = mainIterationsCompletedOrOpts;
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
    // When diversity-aware, use D5-aligned item count and seeded-evidence policy.
    // Default path: exclude seeded evidence and use pipeline sufficiency threshold.
    const effectiveThreshold = diversityConfig ? diversityConfig.minItems : threshold;
    const includeSeeded = diversityConfig?.includeSeeded ?? false;

    // Per-claim researched-iteration floor: when seeded evidence is counted
    // toward sufficiency, require at least N targeted research iterations
    // per claim before seeded items can make that claim "sufficient."
    // This prevents heavily-seeded claims from exiting Stage 2 with zero
    // targeted research (observed: Plastik AC_01 had 41 seeded, 0 researched).
    if (includeSeeded && minResearchedIterationsPerClaim > 0 && researchedIterationsByClaim) {
      const claimResearchedIterations = researchedIterationsByClaim[claim.id] ?? 0;
      if (claimResearchedIterations < minResearchedIterationsPerClaim) return false;
    }

    const claimEvidence = evidenceItems.filter((e) => {
      if (!e.relevantClaimIds?.includes(claim.id)) return false;
      if (!e.evidenceScope) return false;
      // Default path: exclude seeded to prevent skipping main research.
      // D5-aligned path: include seeded (D5 counts all claim-mapped evidence).
      if (!includeSeeded && e.isSeeded) return false;
      return true;
    });
    if (claimEvidence.length < effectiveThreshold) return false;

    // Diversity check (mirrors D5 Control 1 disjunctive OR gate)
    if (diversityConfig) {
      const distinctSourceTypes = new Set(
        claimEvidence.map(e => e.sourceType).filter(Boolean),
      );
      const distinctDomains = new Set(
        claimEvidence
          .map(e => extractDomain(e.sourceUrl))
          .filter((d): d is string => Boolean(d)),
      );
      const hasSufficientDiversity =
        distinctSourceTypes.size >= diversityConfig.minSourceTypes ||
        distinctDomains.size >= diversityConfig.minDistinctDomains;
      if (!hasSufficientDiversity) return false;
    }

    return true;
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
