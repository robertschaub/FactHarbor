import type { CBClaimUnderstanding } from "./types";

type PreliminaryEvidenceEntry = CBClaimUnderstanding["preliminaryEvidence"][number];

function orderSelectedIds(selectedClaimIds: string[], availableIds: Set<string>): string[] {
  return selectedClaimIds.filter((id, index) => availableIds.has(id) && selectedClaimIds.indexOf(id) === index);
}

function sortBySelectedOrder<T extends { id?: string; claimId?: string }>(
  items: T[],
  selectedOrder: Map<string, number>,
): T[] {
  return [...items].sort((a, b) => {
    const aId = a.id ?? a.claimId ?? "";
    const bId = b.id ?? b.claimId ?? "";
    return (selectedOrder.get(aId) ?? Number.MAX_SAFE_INTEGER)
      - (selectedOrder.get(bId) ?? Number.MAX_SAFE_INTEGER);
  });
}

function filterAndSortIds(ids: string[], selectedSet: Set<string>, selectedOrder: Map<string, number>): string[] {
  return ids
    .filter((id, index) => selectedSet.has(id) && ids.indexOf(id) === index)
    .sort((a, b) => (selectedOrder.get(a) ?? 0) - (selectedOrder.get(b) ?? 0));
}

function uniqueIds(ids: string[]): string[] {
  return ids.filter((id, index) => Boolean(id) && ids.indexOf(id) === index);
}

function getValidatedContractCarrierIds(
  summary: CBClaimUnderstanding["contractValidationSummary"],
): string[] {
  if (!summary?.preservesContract || summary.rePromptRequired) {
    return [];
  }

  return uniqueIds([
    ...(summary.contractCarrierClaimIds ?? []),
    ...(summary.truthConditionAnchor?.validPreservedIds ?? []),
  ]);
}

function withRelevantClaimIds(
  evidence: PreliminaryEvidenceEntry,
  relevantClaimIds: string[] | undefined,
): PreliminaryEvidenceEntry {
  if (relevantClaimIds && relevantClaimIds.length > 0) {
    return {
      ...evidence,
      relevantClaimIds,
    };
  }
  const { relevantClaimIds: _removed, ...withoutRelevantClaimIds } = evidence;
  return withoutRelevantClaimIds;
}

export function filterClaimUnderstandingForSelectedClaims(
  understanding: CBClaimUnderstanding,
  selectedClaimIds: string[],
): CBClaimUnderstanding {
  const availableIds = new Set(understanding.atomicClaims.map((claim) => claim.id));
  const orderedSelectedIds = orderSelectedIds(selectedClaimIds, availableIds);
  const selectedSet = new Set(orderedSelectedIds);
  const selectedOrder = new Map(orderedSelectedIds.map((id, index) => [id, index] as const));

  const atomicClaims = sortBySelectedOrder(
    understanding.atomicClaims.filter((claim) => selectedSet.has(claim.id)),
    selectedOrder,
  );

  const preFilterAtomicClaims = understanding.preFilterAtomicClaims
    ? sortBySelectedOrder(
      understanding.preFilterAtomicClaims.filter((claim) => selectedSet.has(claim.id)),
      selectedOrder,
    )
    : undefined;

  const gate1Reasoning = understanding.gate1Reasoning
    ? sortBySelectedOrder(
      understanding.gate1Reasoning.filter((reasoning) => selectedSet.has(reasoning.claimId)),
      selectedOrder,
    )
    : undefined;

  const preliminaryEvidence = understanding.preliminaryEvidence
    .map((evidence): PreliminaryEvidenceEntry | null => {
      const relevantClaimIds = Array.isArray(evidence.relevantClaimIds)
        ? filterAndSortIds(evidence.relevantClaimIds, selectedSet, selectedOrder)
        : undefined;

      if (selectedSet.has(evidence.claimId)) {
        return withRelevantClaimIds(evidence, relevantClaimIds);
      }

      if (relevantClaimIds && relevantClaimIds.length > 0) {
        return {
          ...evidence,
          claimId: relevantClaimIds[0],
          relevantClaimIds,
        };
      }

      return null;
    })
    .filter((evidence): evidence is PreliminaryEvidenceEntry => evidence !== null);

  const originalContractCarrierIds = getValidatedContractCarrierIds(understanding.contractValidationSummary);
  const removedContractCarrierIds = originalContractCarrierIds.filter((claimId) => !selectedSet.has(claimId));

  const contractValidationSummary = understanding.contractValidationSummary
    ? (() => {
      const filteredSummary: NonNullable<CBClaimUnderstanding["contractValidationSummary"]> = {
        ...understanding.contractValidationSummary,
        contractCarrierClaimIds: filterAndSortIds(
          understanding.contractValidationSummary.contractCarrierClaimIds ?? [],
          selectedSet,
          selectedOrder,
        ),
        truthConditionAnchor: understanding.contractValidationSummary.truthConditionAnchor
          ? {
            ...understanding.contractValidationSummary.truthConditionAnchor,
            preservedInClaimIds: filterAndSortIds(
              understanding.contractValidationSummary.truthConditionAnchor.preservedInClaimIds,
              selectedSet,
              selectedOrder,
            ),
            validPreservedIds: filterAndSortIds(
              understanding.contractValidationSummary.truthConditionAnchor.validPreservedIds,
              selectedSet,
              selectedOrder,
            ),
          }
          : undefined,
      };

      if (removedContractCarrierIds.length === 0) {
        return filteredSummary;
      }

      return {
        ...filteredSummary,
        preservesContract: false,
        rePromptRequired: true,
        failureMode: "contract_violated" as const,
        summary: `Selected claim subset removed validated contract carrier claim(s) [${removedContractCarrierIds.join(",")}]; previous contract approval no longer applies.`,
      };
    })()
    : undefined;

  return {
    ...understanding,
    atomicClaims,
    preliminaryEvidence,
    preFilterAtomicClaims,
    gate1Reasoning,
    contractValidationSummary,
  };
}
