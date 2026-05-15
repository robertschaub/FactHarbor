import {
  EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";
import {
  buildEvidenceQueryPlanningInspection,
  type QueryPlanInspectionRequest,
  type QueryPlanInspectionSummary,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import type {
  EvidenceQueryPlan,
  EvidenceQueryPlanEntry,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

export const QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION =
  "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0";

export type QueryPlanSourceAcquisitionHandoffBlockedReason =
  | "inspection_request_invalid"
  | "query_planning_runtime_blocked"
  | "query_planning_not_accepted"
  | "query_plan_missing"
  | "query_entries_empty"
  | "query_entries_exceed_limit"
  | "query_entry_target_ids_empty"
  | "query_entry_target_ids_outside_selected"
  | "selected_atomic_claim_snapshot_invalid"
  | "query_plan_provenance_missing";

export type QueryPlanSourceAcquisitionHandoffQueryEntry = Pick<
  EvidenceQueryPlanEntry,
  "queryId" | "retrievalPolicyKey" | "queryText" | "targetAtomicClaimIds"
>;

export type QueryPlanSourceAcquisitionHandoff = {
  handoffVersion: typeof QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION;
  visibility: "internal_only";
  executionScope: "not_executable";
  sourceAcquisitionStatus: "ready_not_executable";
  selectedAtomicClaimIds: readonly string[];
  queryPlanResultSchemaVersion: string;
  queryPlanningStatus: "accepted";
  inspection: QueryPlanInspectionSummary;
  promptProvenance: NonNullable<QueryPlanInspectionSummary["promptProvenance"]>;
  modelPolicyId: string;
  cacheProvenance: {
    namespace: string;
    reason: string;
    canRead: false;
    canWrite: false;
  };
  sourceLanguagePolicy: EvidenceQueryPlan["sourceLanguagePolicy"];
  structuralCoverage: QueryPlanInspectionSummary["structuralCoverage"];
  queryEntries: readonly QueryPlanSourceAcquisitionHandoffQueryEntry[];
};

export type QueryPlanSourceAcquisitionHandoffDecision =
  | {
    decisionVersion: typeof QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION;
    visibility: "internal_only";
    status: "blocked";
    handoff: null;
    blockedReason: QueryPlanSourceAcquisitionHandoffBlockedReason;
  }
  | {
    decisionVersion: typeof QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION;
    visibility: "internal_only";
    status: "ready_not_executable";
    handoff: QueryPlanSourceAcquisitionHandoff;
    blockedReason: null;
  };

function blocked(
  blockedReason: QueryPlanSourceAcquisitionHandoffBlockedReason,
): QueryPlanSourceAcquisitionHandoffDecision {
  return {
    decisionVersion: QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
    visibility: "internal_only",
    status: "blocked",
    handoff: null,
    blockedReason,
  };
}

function selectedIdsAreValid(selectedAtomicClaimIds: readonly string[]): boolean {
  return selectedAtomicClaimIds.length > 0
    && selectedAtomicClaimIds.every((claimId) => claimId.length > 0 && claimId === claimId.trim())
    && new Set(selectedAtomicClaimIds).size === selectedAtomicClaimIds.length;
}

function queryEntryTargetsAreInSelectedSet(
  queryEntries: readonly EvidenceQueryPlanEntry[],
  selectedAtomicClaimIds: readonly string[],
): boolean {
  const selectedIdSet = new Set(selectedAtomicClaimIds);
  return queryEntries.every((queryEntry) =>
    queryEntry.targetAtomicClaimIds.every((claimId) => selectedIdSet.has(claimId))
  );
}

function hasEmptyQueryEntryTargets(queryEntries: readonly EvidenceQueryPlanEntry[]): boolean {
  return queryEntries.some((queryEntry) => queryEntry.targetAtomicClaimIds.length === 0);
}

function buildQueryEntries(
  queryEntries: readonly EvidenceQueryPlanEntry[],
): readonly QueryPlanSourceAcquisitionHandoffQueryEntry[] {
  return queryEntries.map((queryEntry) => ({
    queryId: queryEntry.queryId,
    retrievalPolicyKey: queryEntry.retrievalPolicyKey,
    queryText: queryEntry.queryText,
    targetAtomicClaimIds: [...queryEntry.targetAtomicClaimIds],
  }));
}

function readRequiredProvenance(inspection: QueryPlanInspectionSummary): {
  promptProvenance: NonNullable<QueryPlanInspectionSummary["promptProvenance"]>;
  modelPolicyId: string;
  cacheProvenance: QueryPlanSourceAcquisitionHandoff["cacheProvenance"];
} | null {
  if (
    inspection.promptProvenance === null
    || inspection.modelPolicyId === null
    || typeof inspection.cacheDecision.namespace !== "string"
    || typeof inspection.cacheDecision.reason !== "string"
    || inspection.cacheDecision.canRead !== false
    || inspection.cacheDecision.canWrite !== false
  ) {
    return null;
  }

  return {
    promptProvenance: inspection.promptProvenance,
    modelPolicyId: inspection.modelPolicyId,
    cacheProvenance: {
      namespace: inspection.cacheDecision.namespace,
      reason: inspection.cacheDecision.reason,
      canRead: false,
      canWrite: false,
    },
  };
}

export function buildQueryPlanSourceAcquisitionHandoff(
  request: QueryPlanInspectionRequest,
): QueryPlanSourceAcquisitionHandoffDecision {
  const inspectionResult = buildEvidenceQueryPlanningInspection(request);
  if (inspectionResult.status === "blocked") {
    return blocked("inspection_request_invalid");
  }

  const inspection = inspectionResult.summary;
  const runtimeResult = request.runtimeResult;
  if (runtimeResult.status !== "completed") {
    return blocked("query_planning_runtime_blocked");
  }

  if (!selectedIdsAreValid(inspection.selectedAtomicClaimIds)) {
    return blocked("selected_atomic_claim_snapshot_invalid");
  }

  if (runtimeResult.result.status !== "accepted") {
    return blocked("query_planning_not_accepted");
  }

  const queryPlan = runtimeResult.result.queryPlan;
  if (!queryPlan) {
    return blocked("query_plan_missing");
  }

  if (queryPlan.queries.length === 0) {
    return blocked("query_entries_empty");
  }

  if (queryPlan.queries.length > EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES) {
    return blocked("query_entries_exceed_limit");
  }

  if (hasEmptyQueryEntryTargets(queryPlan.queries)) {
    return blocked("query_entry_target_ids_empty");
  }

  if (!queryEntryTargetsAreInSelectedSet(queryPlan.queries, inspection.selectedAtomicClaimIds)) {
    return blocked("query_entry_target_ids_outside_selected");
  }

  const provenance = readRequiredProvenance(inspection);
  if (!provenance) {
    return blocked("query_plan_provenance_missing");
  }

  return {
    decisionVersion: QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
    visibility: "internal_only",
    status: "ready_not_executable",
    blockedReason: null,
    handoff: {
      handoffVersion: QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
      visibility: "internal_only",
      executionScope: "not_executable",
      sourceAcquisitionStatus: "ready_not_executable",
      selectedAtomicClaimIds: [...inspection.selectedAtomicClaimIds],
      queryPlanResultSchemaVersion: runtimeResult.result.schemaVersion,
      queryPlanningStatus: "accepted",
      inspection,
      promptProvenance: provenance.promptProvenance,
      modelPolicyId: provenance.modelPolicyId,
      cacheProvenance: provenance.cacheProvenance,
      sourceLanguagePolicy: queryPlan.sourceLanguagePolicy,
      structuralCoverage: inspection.structuralCoverage,
      queryEntries: buildQueryEntries(queryPlan.queries),
    },
  };
}
