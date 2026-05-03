import type {
  AcsResearchWasteObservability,
  CBResearchState,
  ClaimAcquisitionIterationEntry,
  SelectedClaimResearchCoverage,
  SelectedClaimResearchNotRunReason,
} from "./types";

function createIterationTypeCounts(): Record<ClaimAcquisitionIterationEntry["iterationType"], number> {
  return {
    main: 0,
    contradiction: 0,
    contrarian: 0,
    refinement: 0,
  };
}

function sumIterationDurations(iterations: ClaimAcquisitionIterationEntry[]): number {
  return iterations.reduce((sum, iteration) => sum + Math.max(0, iteration.durationMs ?? 0), 0);
}

function getIterationSearchAttemptCount(iteration: ClaimAcquisitionIterationEntry): number {
  const explicitAttempts = Math.max(0, iteration.searchAttempts ?? 0);
  if (explicitAttempts > 0) return explicitAttempts;

  const hasLegacySearchEvidence =
    iteration.searchResults > 0 ||
    iteration.relevanceAccepted > 0 ||
    iteration.sourcesFetched > 0 ||
    (iteration.losses?.fetchRejected ?? 0) > 0;
  return hasLegacySearchEvidence ? 1 : 0;
}

export function buildAcsResearchWasteObservability(
  state: Pick<
    CBResearchState,
    "understanding" | "claimAcquisitionLedger" | "evidenceItems" | "searchQueries" | "selectedClaimResearchNotRunReasons"
  >,
  claimSufficiencyThreshold: number,
): AcsResearchWasteObservability | undefined {
  const selectedClaims = state.understanding?.atomicClaims ?? [];
  if (selectedClaims.length === 0) return undefined;

  const ledger = state.claimAcquisitionLedger ?? {};
  if (
    Object.keys(ledger).length === 0 &&
    (state.evidenceItems ?? []).length === 0 &&
    (state.searchQueries ?? []).length === 0
  ) {
    return undefined;
  }

  const finalEvidenceByClaim = new Map<string, number>();
  for (const item of state.evidenceItems ?? []) {
    for (const claimId of item.relevantClaimIds ?? []) {
      finalEvidenceByClaim.set(claimId, (finalEvidenceByClaim.get(claimId) ?? 0) + 1);
    }
  }

  const coverage: SelectedClaimResearchCoverage[] = selectedClaims.map((claim) => {
    const ledgerEntry = ledger[claim.id];
    const iterations = ledgerEntry?.iterations ?? [];
    const iterationTypeCounts = createIterationTypeCounts();
    let targetedMainIterations = 0;
    let searchAttemptCount = 0;
    for (const iteration of iterations) {
      iterationTypeCounts[iteration.iterationType]++;
      const iterationSearchAttempts = getIterationSearchAttemptCount(iteration);
      searchAttemptCount += iterationSearchAttempts;
      if (
        iteration.iterationType === "main" &&
        iteration.languageLane === "primary" &&
        iterationSearchAttempts > 0
      ) {
        targetedMainIterations++;
      }
    }

    const finalEvidenceItemCount = finalEvidenceByClaim.get(claim.id) ?? 0;
    const zeroTargetedMainResearch = targetedMainIterations === 0;
    const notRunReason: SelectedClaimResearchNotRunReason | undefined = zeroTargetedMainResearch
      ? state.selectedClaimResearchNotRunReasons?.[claim.id]
        ?? (ledgerEntry
          ? "no_targeted_main_iteration_recorded"
          : "no_claim_acquisition_ledger_entry")
      : undefined;
    const sufficiencyState = notRunReason?.endsWith("_before_search")
      ? "budget_exhausted"
      : finalEvidenceItemCount >= claimSufficiencyThreshold
        ? "sufficient"
        : "insufficient";

    return {
      claimId: claim.id,
      claimStatement: claim.statement,
      isSelected: true,
      targetedMainIterations,
      totalIterations: iterations.length,
      iterationTypeCounts,
      queryCount: iterations.reduce((sum, iteration) => sum + iteration.generatedQueries.length, 0),
      searchAttemptCount,
      fetchAttemptCount: iterations.reduce(
        (sum, iteration) => sum + iteration.sourcesFetched + iteration.losses.fetchRejected,
        0,
      ),
      admittedEvidenceItemCount: iterations.reduce(
        (sum, iteration) => sum + iteration.admittedEvidenceItems,
        0,
      ),
      finalEvidenceItemCount,
      elapsedMs: sumIterationDurations(iterations),
      sufficiencyState,
      zeroTargetedMainResearch,
      ...(notRunReason ? { notRunReason } : {}),
    };
  });

  const zeroTargetedSelectedClaimIds = coverage
    .filter((entry) => entry.zeroTargetedMainResearch)
    .map((entry) => entry.claimId);

  return {
    selectedClaimResearchCoverage: coverage,
    selectedClaimResearch: coverage.map((entry) => ({
      claimId: entry.claimId,
      iterations: entry.totalIterations,
      evidenceItemCount: entry.finalEvidenceItemCount,
      sufficiencyState: entry.sufficiencyState,
    })),
    zeroTargetedSelectedClaimCount: zeroTargetedSelectedClaimIds.length,
    zeroTargetedSelectedClaimIds,
  };
}
