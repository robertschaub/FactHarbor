import type {
  CBClaimUnderstanding,
  CBResearchState,
  FetchedSource,
  SelectedClaimResearchCoverage,
  ResearchWasteByOutcome,
  ResearchWasteCounterSet,
  ResearchWasteMetrics,
  ResearchWasteOutcome,
  ResearchWasteUrlOverlap,
} from "./types";
import {
  classifyStructuralSourceFamily,
  normalizeUrlForEvidence,
  type StructuralSourceFamily,
} from "./url-normalization";

export function createResearchWasteCounterSet(): ResearchWasteCounterSet {
  return {
    queryCount: 0,
    fetchAttemptCount: 0,
    successfulFetchCount: 0,
    evidenceItemCount: 0,
    sourceUrlCount: 0,
    sourceTextByteCount: 0,
  };
}

function createResearchWasteByOutcome(): ResearchWasteByOutcome {
  return {
    selected: createResearchWasteCounterSet(),
    dropped: createResearchWasteCounterSet(),
    unmapped: createResearchWasteCounterSet(),
  };
}

function createUrlOverlap(): ResearchWasteUrlOverlap {
  return {
    stage1UrlCount: 0,
    stage2UrlCount: 0,
    exactOverlapCount: 0,
    documentOverlapCount: 0,
    dataOverlapCount: 0,
    htmlOverlapCount: 0,
    unknownOverlapCount: 0,
    normalizedOverlapUrls: [],
  };
}

export function createResearchWasteMetrics(): ResearchWasteMetrics {
  return {
    preparedCandidateCount: 0,
    selectedClaimCount: 0,
    droppedCandidateCount: 0,
    preliminaryTotals: createResearchWasteCounterSet(),
    preliminaryByOutcome: createResearchWasteByOutcome(),
    stage1ToStage2UrlOverlap: createUrlOverlap(),
    selectedClaimResearchCoverage: [],
    selectedClaimResearch: [],
    contradictionReachability: {
      started: false,
      remainingMsWhenMainResearchEnded: null,
      iterationsUsed: 0,
      sourcesFound: 0,
    },
  };
}

export function cloneResearchWasteMetrics(
  input?: ResearchWasteMetrics,
): ResearchWasteMetrics {
  if (!input) return createResearchWasteMetrics();
  return {
    preparedCandidateCount: finiteCount(input.preparedCandidateCount),
    selectedClaimCount: finiteCount(input.selectedClaimCount),
    droppedCandidateCount: finiteCount(input.droppedCandidateCount),
    preliminaryTotals: cloneCounterSet(input.preliminaryTotals),
    preliminaryByOutcome: {
      selected: cloneCounterSet(input.preliminaryByOutcome?.selected),
      dropped: cloneCounterSet(input.preliminaryByOutcome?.dropped),
      unmapped: cloneCounterSet(input.preliminaryByOutcome?.unmapped),
    },
    stage1ToStage2UrlOverlap: {
      ...createUrlOverlap(),
      ...input.stage1ToStage2UrlOverlap,
      normalizedOverlapUrls: Array.isArray(input.stage1ToStage2UrlOverlap?.normalizedOverlapUrls)
        ? input.stage1ToStage2UrlOverlap.normalizedOverlapUrls.filter((url): url is string => typeof url === "string")
        : [],
    },
    selectedClaimResearchCoverage: Array.isArray(input.selectedClaimResearchCoverage)
      ? input.selectedClaimResearchCoverage.map((entry) => ({
          claimId: entry.claimId,
          targetedMainIterations: finiteCount(entry.targetedMainIterations),
          totalIterations: finiteCount(entry.totalIterations),
          iterationTypeCounts: cloneIterationTypeCounts(entry.iterationTypeCounts),
          queryCount: finiteCount(entry.queryCount),
          fetchAttemptCount: finiteCount(entry.fetchAttemptCount),
          admittedEvidenceItemCount: finiteCount(entry.admittedEvidenceItemCount),
          finalEvidenceItemCount: finiteCount(entry.finalEvidenceItemCount),
          elapsedMs: finiteCount(entry.elapsedMs),
          sufficiencyState: entry.sufficiencyState ?? "unknown",
          zeroTargetedMainResearch: entry.zeroTargetedMainResearch === true,
          ...(entry.notRunReason ? { notRunReason: entry.notRunReason } : {}),
        }))
      : [],
    selectedClaimResearch: Array.isArray(input.selectedClaimResearch)
      ? input.selectedClaimResearch.map((entry) => ({
          claimId: entry.claimId,
          iterations: finiteCount(entry.iterations),
          queryCount: finiteCount(entry.queryCount),
          fetchAttemptCount: finiteCount(entry.fetchAttemptCount),
          evidenceItemCount: finiteCount(entry.evidenceItemCount),
          elapsedMs: finiteCount(entry.elapsedMs),
          sufficiencyState: entry.sufficiencyState ?? "unknown",
        }))
      : [],
    contradictionReachability: {
      started: input.contradictionReachability?.started === true,
      remainingMsWhenMainResearchEnded:
        typeof input.contradictionReachability?.remainingMsWhenMainResearchEnded === "number"
          ? input.contradictionReachability.remainingMsWhenMainResearchEnded
          : null,
      iterationsUsed: finiteCount(input.contradictionReachability?.iterationsUsed),
      sourcesFound: finiteCount(input.contradictionReachability?.sourcesFound),
      notRunReason: input.contradictionReachability?.notRunReason,
    },
  };
}

export function ensureResearchWasteMetrics(state: CBResearchState): ResearchWasteMetrics {
  if (!state.researchWasteMetrics) {
    state.researchWasteMetrics = createResearchWasteMetrics();
  }
  return state.researchWasteMetrics;
}

export function recordPreliminaryQueryMetric(state: CBResearchState, count = 1): void {
  const metrics = ensureResearchWasteMetrics(state);
  addCounter(metrics.preliminaryTotals, { queryCount: count });
  addCounter(metrics.preliminaryByOutcome.unmapped, { queryCount: count });
}

export function recordPreliminaryFetchAttemptMetric(state: CBResearchState, count = 1): void {
  const metrics = ensureResearchWasteMetrics(state);
  addCounter(metrics.preliminaryTotals, { fetchAttemptCount: count });
  addCounter(metrics.preliminaryByOutcome.unmapped, { fetchAttemptCount: count });
}

export function recordPreliminaryFetchSuccessMetric(
  state: CBResearchState,
  params: { url: string; sourceTextByteCount: number },
): void {
  const metrics = ensureResearchWasteMetrics(state);
  addCounter(metrics.preliminaryTotals, {
    successfulFetchCount: 1,
    sourceUrlCount: 1,
    sourceTextByteCount: params.sourceTextByteCount,
  });
  addCounter(metrics.preliminaryByOutcome.unmapped, {
    successfulFetchCount: 1,
    sourceUrlCount: 1,
    sourceTextByteCount: params.sourceTextByteCount,
  });
}

export function recordPreliminaryEvidenceMetric(state: CBResearchState, count: number): void {
  if (count <= 0) return;
  const metrics = ensureResearchWasteMetrics(state);
  addCounter(metrics.preliminaryTotals, { evidenceItemCount: count });
  addCounter(metrics.preliminaryByOutcome.unmapped, { evidenceItemCount: count });
}

export function finalizeStage1ResearchWasteMetrics(state: CBResearchState): ResearchWasteMetrics {
  const metrics = ensureResearchWasteMetrics(state);
  const candidateClaimCount =
    state.stage1Observability?.candidateClaimCount
    ?? state.understanding?.atomicClaims?.length
    ?? metrics.preparedCandidateCount;

  metrics.preparedCandidateCount = finiteCount(candidateClaimCount);
  metrics.selectedClaimCount = metrics.preparedCandidateCount;
  metrics.droppedCandidateCount = 0;

  const preliminaryEvidence = state.understanding?.preliminaryEvidence ?? [];
  const preliminaryUrls = collectNormalizedPreliminaryUrls(preliminaryEvidence);
  metrics.preliminaryTotals.evidenceItemCount = Math.max(
    metrics.preliminaryTotals.evidenceItemCount,
    preliminaryEvidence.length,
  );
  metrics.preliminaryTotals.sourceUrlCount = Math.max(
    metrics.preliminaryTotals.sourceUrlCount,
    preliminaryUrls.size,
  );
  metrics.stage1ToStage2UrlOverlap.stage1UrlCount = Math.max(
    metrics.stage1ToStage2UrlOverlap.stage1UrlCount,
    metrics.preliminaryTotals.sourceUrlCount,
  );

  return metrics;
}

export function hydratePreparedResearchWasteMetrics(params: {
  state: CBResearchState;
  preparedUnderstanding: CBClaimUnderstanding;
  selectedClaimIds?: string[];
  preparedMetrics?: ResearchWasteMetrics;
}): ResearchWasteMetrics {
  const metrics = cloneResearchWasteMetrics(params.preparedMetrics);
  const allCandidateIds = new Set(
    (params.preparedUnderstanding.atomicClaims ?? []).map((claim) => claim.id),
  );
  const selectedClaimIds = params.selectedClaimIds && params.selectedClaimIds.length > 0
    ? params.selectedClaimIds
    : Array.from(allCandidateIds);
  const selectedIds = new Set(selectedClaimIds);

  metrics.preparedCandidateCount = allCandidateIds.size;
  metrics.selectedClaimCount = selectedIds.size;
  metrics.droppedCandidateCount = Math.max(0, allCandidateIds.size - selectedIds.size);
  metrics.preliminaryByOutcome = buildPreliminaryByOutcome(
    params.preparedUnderstanding.preliminaryEvidence ?? [],
    selectedIds,
    allCandidateIds,
    metrics.preliminaryTotals,
  );

  const preliminaryUrls = collectNormalizedPreliminaryUrls(
    params.preparedUnderstanding.preliminaryEvidence ?? [],
  );
  metrics.preliminaryTotals.evidenceItemCount = Math.max(
    metrics.preliminaryTotals.evidenceItemCount,
    params.preparedUnderstanding.preliminaryEvidence?.length ?? 0,
  );
  metrics.preliminaryTotals.sourceUrlCount = Math.max(
    metrics.preliminaryTotals.sourceUrlCount,
    preliminaryUrls.size,
  );
  metrics.stage1ToStage2UrlOverlap.stage1UrlCount = Math.max(
    metrics.stage1ToStage2UrlOverlap.stage1UrlCount,
    metrics.preliminaryTotals.sourceUrlCount,
  );

  params.state.researchWasteMetrics = metrics;
  return metrics;
}

export function markContradictionMainResearchEnded(
  state: CBResearchState,
  remainingMsWhenMainResearchEnded: number,
): void {
  const metrics = ensureResearchWasteMetrics(state);
  metrics.contradictionReachability.remainingMsWhenMainResearchEnded =
    Math.max(0, Math.round(remainingMsWhenMainResearchEnded));
}

export function markContradictionStarted(state: CBResearchState): void {
  ensureResearchWasteMetrics(state).contradictionReachability.started = true;
}

export function markContradictionNotRun(
  state: CBResearchState,
  reason: NonNullable<ResearchWasteMetrics["contradictionReachability"]["notRunReason"]>,
): void {
  const metrics = ensureResearchWasteMetrics(state);
  if (!metrics.contradictionReachability.started) {
    metrics.contradictionReachability.notRunReason = reason;
  }
}

export function updateContradictionReachability(state: CBResearchState): void {
  const metrics = ensureResearchWasteMetrics(state);
  metrics.contradictionReachability.started ||= state.contradictionIterationsUsed > 0;
  metrics.contradictionReachability.iterationsUsed = state.contradictionIterationsUsed;
  metrics.contradictionReachability.sourcesFound = state.contradictionSourcesFound;
  if (state.contradictionIterationsUsed > 0) {
    delete metrics.contradictionReachability.notRunReason;
  }
}

export function finalizeResearchWasteMetrics(
  state: CBResearchState,
  params: {
    claimSufficiencyThreshold: number;
    researchStartMs: number;
  },
): ResearchWasteMetrics {
  const metrics = ensureResearchWasteMetrics(state);
  const claims = state.understanding?.atomicClaims ?? [];
  metrics.selectedClaimCount = claims.length;
  if (metrics.preparedCandidateCount < claims.length) {
    metrics.preparedCandidateCount = claims.length;
  }
  metrics.droppedCandidateCount = Math.max(
    0,
    metrics.preparedCandidateCount - metrics.selectedClaimCount,
  );
  metrics.stage1ToStage2UrlOverlap = buildUrlOverlap(state, metrics);
  metrics.selectedClaimResearchCoverage = claims.map((claim) =>
    buildSelectedClaimResearchCoverage(state, claim.id, params.claimSufficiencyThreshold),
  );
  metrics.selectedClaimResearch = metrics.selectedClaimResearchCoverage.map((entry) => ({
    claimId: entry.claimId,
    iterations: entry.totalIterations,
    queryCount: entry.queryCount,
    fetchAttemptCount: entry.fetchAttemptCount,
    evidenceItemCount: entry.finalEvidenceItemCount,
    elapsedMs: entry.elapsedMs,
    sufficiencyState: entry.sufficiencyState,
  }));
  updateContradictionReachability(state);
  return metrics;
}

export function sanitizeResearchWasteMetrics(
  metrics?: ResearchWasteMetrics,
): ResearchWasteMetrics | undefined {
  return metrics ? cloneResearchWasteMetrics(metrics) : undefined;
}

function buildPreliminaryByOutcome(
  preliminaryEvidence: NonNullable<CBClaimUnderstanding["preliminaryEvidence"]>,
  selectedIds: Set<string>,
  allCandidateIds: Set<string>,
  preliminaryTotals: ResearchWasteCounterSet,
): ResearchWasteByOutcome {
  const byOutcome = createResearchWasteByOutcome();
  byOutcome.unmapped.queryCount = preliminaryTotals.queryCount;
  byOutcome.unmapped.fetchAttemptCount = preliminaryTotals.fetchAttemptCount;
  byOutcome.unmapped.successfulFetchCount = preliminaryTotals.successfulFetchCount;
  byOutcome.unmapped.sourceTextByteCount = preliminaryTotals.sourceTextByteCount;

  const sourceUrlsByOutcome: Record<ResearchWasteOutcome, Set<string>> = {
    selected: new Set(),
    dropped: new Set(),
    unmapped: new Set(),
  };

  for (const entry of preliminaryEvidence) {
    const outcomes = classifyPreliminaryOutcomes(entry, selectedIds, allCandidateIds);
    const normalizedUrl = normalizeOptionalUrl(entry.sourceUrl);
    for (const outcome of outcomes) {
      byOutcome[outcome].evidenceItemCount++;
      if (normalizedUrl) sourceUrlsByOutcome[outcome].add(normalizedUrl);
    }
  }

  byOutcome.selected.sourceUrlCount = sourceUrlsByOutcome.selected.size;
  byOutcome.dropped.sourceUrlCount = sourceUrlsByOutcome.dropped.size;
  byOutcome.unmapped.sourceUrlCount = Math.max(
    byOutcome.unmapped.sourceUrlCount,
    sourceUrlsByOutcome.unmapped.size,
  );
  return byOutcome;
}

function classifyPreliminaryOutcomes(
  entry: NonNullable<CBClaimUnderstanding["preliminaryEvidence"]>[number],
  selectedIds: Set<string>,
  allCandidateIds: Set<string>,
): ResearchWasteOutcome[] {
  const ids = new Set<string>();
  if (typeof entry.claimId === "string" && entry.claimId.trim().length > 0) {
    ids.add(entry.claimId.trim());
  }
  for (const claimId of entry.relevantClaimIds ?? []) {
    if (typeof claimId === "string" && claimId.trim().length > 0) {
      ids.add(claimId.trim());
    }
  }

  if (ids.size === 0) return ["unmapped"];

  const outcomes = new Set<ResearchWasteOutcome>();
  for (const claimId of ids) {
    if (selectedIds.has(claimId)) {
      outcomes.add("selected");
    } else if (allCandidateIds.has(claimId)) {
      outcomes.add("dropped");
    }
  }

  return outcomes.size > 0 ? Array.from(outcomes) : ["unmapped"];
}

function buildUrlOverlap(
  state: CBResearchState,
  metrics: ResearchWasteMetrics,
): ResearchWasteUrlOverlap {
  const stage1Urls = collectNormalizedPreliminaryUrls(
    state.understanding?.preliminaryEvidence ?? [],
  );
  const preliminaryQueryTexts = new Set(
    state.searchQueries
      .filter((query) => query.focus === "preliminary")
      .map((query) => query.query),
  );
  const stage2Sources = state.sources.filter(
    (source) => !source.searchQuery || !preliminaryQueryTexts.has(source.searchQuery),
  );
  const stage2Urls = new Map<string, FetchedSource>();
  for (const source of stage2Sources) {
    const normalized = normalizeOptionalUrl(source.url);
    if (normalized && !stage2Urls.has(normalized)) {
      stage2Urls.set(normalized, source);
    }
  }

  const overlapUrls = Array.from(stage1Urls)
    .filter((url) => stage2Urls.has(url))
    .sort();
  const familyCounts: Record<StructuralSourceFamily, number> = {
    document: 0,
    data: 0,
    html: 0,
    unknown: 0,
  };
  for (const url of overlapUrls) {
    const source = stage2Urls.get(url);
    const family = classifyStructuralSourceFamily({
      url: source?.url ?? url,
      category: source?.category,
    });
    familyCounts[family]++;
  }

  return {
    stage1UrlCount: Math.max(
      metrics.stage1ToStage2UrlOverlap.stage1UrlCount,
      metrics.preliminaryTotals.sourceUrlCount,
      stage1Urls.size,
    ),
    stage2UrlCount: stage2Urls.size,
    exactOverlapCount: overlapUrls.length,
    documentOverlapCount: familyCounts.document,
    dataOverlapCount: familyCounts.data,
    htmlOverlapCount: familyCounts.html,
    unknownOverlapCount: familyCounts.unknown,
    normalizedOverlapUrls: overlapUrls,
  };
}

function collectNormalizedPreliminaryUrls(
  preliminaryEvidence: NonNullable<CBClaimUnderstanding["preliminaryEvidence"]>,
): Set<string> {
  const urls = new Set<string>();
  for (const entry of preliminaryEvidence) {
    const normalized = normalizeOptionalUrl(entry.sourceUrl);
    if (normalized) urls.add(normalized);
  }
  return urls;
}

function addCounter(
  target: ResearchWasteCounterSet,
  delta: Partial<ResearchWasteCounterSet>,
): void {
  target.queryCount += finiteCount(delta.queryCount);
  target.fetchAttemptCount += finiteCount(delta.fetchAttemptCount);
  target.successfulFetchCount += finiteCount(delta.successfulFetchCount);
  target.evidenceItemCount += finiteCount(delta.evidenceItemCount);
  target.sourceUrlCount += finiteCount(delta.sourceUrlCount);
  target.sourceTextByteCount += finiteCount(delta.sourceTextByteCount);
}

function cloneCounterSet(input?: ResearchWasteCounterSet): ResearchWasteCounterSet {
  return {
    queryCount: finiteCount(input?.queryCount),
    fetchAttemptCount: finiteCount(input?.fetchAttemptCount),
    successfulFetchCount: finiteCount(input?.successfulFetchCount),
    evidenceItemCount: finiteCount(input?.evidenceItemCount),
    sourceUrlCount: finiteCount(input?.sourceUrlCount),
    sourceTextByteCount: finiteCount(input?.sourceTextByteCount),
  };
}

function cloneIterationTypeCounts(
  input?: Partial<SelectedClaimResearchCoverage["iterationTypeCounts"]>,
): SelectedClaimResearchCoverage["iterationTypeCounts"] {
  return {
    main: finiteCount(input?.main),
    contradiction: finiteCount(input?.contradiction),
    contrarian: finiteCount(input?.contrarian),
    refinement: finiteCount(input?.refinement),
  };
}

function buildSelectedClaimResearchCoverage(
  state: CBResearchState,
  claimId: string,
  claimSufficiencyThreshold: number,
): SelectedClaimResearchCoverage {
  const entry = state.claimAcquisitionLedger?.[claimId];
  const iterations = entry?.iterations ?? [];
  const iterationTypeCounts = cloneIterationTypeCounts();
  for (const iteration of iterations) {
    iterationTypeCounts[iteration.iterationType]++;
  }

  // Final count is post-pipeline result evidence; admitted count below is
  // summed from iterations before later dedupe/filter/cap steps.
  const finalEvidenceItemCount = state.evidenceItems.filter(
    (item) => item.relevantClaimIds?.includes(claimId),
  ).length;
  const zeroTargetedMainResearch = iterationTypeCounts.main === 0;
  const notRunReason = !zeroTargetedMainResearch
    ? undefined
    : entry
      ? "no_targeted_main_iteration_recorded" as const
      : "no_claim_acquisition_ledger_entry" as const;

  return {
    claimId,
    targetedMainIterations: iterationTypeCounts.main,
    totalIterations: iterations.length,
    iterationTypeCounts,
    queryCount: iterations.reduce((sum, iteration) => sum + iteration.generatedQueries.length, 0),
    fetchAttemptCount: iterations.reduce(
      (sum, iteration) => sum + iteration.sourcesFetched + iteration.losses.fetchRejected,
      0,
    ),
    admittedEvidenceItemCount: iterations.reduce(
      (sum, iteration) => sum + iteration.admittedEvidenceItems,
      0,
    ),
    finalEvidenceItemCount,
    elapsedMs: iterations.reduce((sum, iteration) => sum + (iteration.durationMs ?? 0), 0),
    sufficiencyState: finalEvidenceItemCount >= claimSufficiencyThreshold
      ? "sufficient"
      : "insufficient",
    zeroTargetedMainResearch,
    ...(notRunReason ? { notRunReason } : {}),
  };
}

function finiteCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;
}

function normalizeOptionalUrl(url: unknown): string | null {
  if (typeof url !== "string" || url.trim().length === 0) return null;
  return normalizeUrlForEvidence(url);
}
