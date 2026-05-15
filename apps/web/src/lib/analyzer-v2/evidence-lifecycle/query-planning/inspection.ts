import type {
  EvidenceQueryPlanningModelAdapterAttempt,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import {
  EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION,
  type EvidenceQueryPlanningRuntimeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import type {
  EvidenceLifecycleTaskEvent,
  EvidenceQueryPlan,
  EvidenceQueryPlanningResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

export const EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION =
  "v2.evidence-query-planning.inspection.0";

export type QueryPlanInspectionRequest = {
  runtimeResult: EvidenceQueryPlanningRuntimeResult;
  selectedAtomicClaimIds: readonly string[];
  selectedAtomicClaimSnapshotSource: "7l1_input_envelope";
};

export type QueryPlanInspectionBlockedReason =
  | "selected_atomic_claim_snapshot_missing"
  | "selected_atomic_claim_snapshot_invalid"
  | "selected_atomic_claim_snapshot_wrong_source";

export type QueryPlanInspectionIntegrityEventSummary = {
  type: EvidenceLifecycleTaskEvent["type"];
  severity: EvidenceLifecycleTaskEvent["severity"];
  referenceCount: number;
};

export type QueryPlanInspectionAdapterAttemptSummary = {
  attemptCount: number;
  statuses: readonly EvidenceQueryPlanningModelAdapterAttempt["status"][];
  providerTelemetryAttemptCount: number;
  failureMessageAttemptCount: number;
};

export type QueryPlanInspectionCoverage = {
  selectedAtomicClaimCount: number;
  coveredSelectedAtomicClaimIds: readonly string[];
  uncoveredSelectedAtomicClaimIds: readonly string[];
  partialCoverage: boolean;
  coverageJudgment: "structural_only_not_quality_assessment";
};

export type QueryPlanInspectionSummary = {
  inspectionVersion: typeof EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION;
  visibility: "internal_only";
  sourceRuntimeVersion: typeof EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION;
  runtimeStatus: EvidenceQueryPlanningRuntimeResult["status"];
  resultStatus: EvidenceQueryPlanningResult["status"];
  runtimeBlockedReason: EvidenceQueryPlanningRuntimeResult["blockedReason"];
  resultBlockedReason: EvidenceQueryPlanningResult["blockedReason"];
  resultDamagedReason: EvidenceQueryPlanningResult["damagedReason"];
  selectedAtomicClaimIds: readonly string[];
  queryEntryCount: number;
  queryEntryTargetAtomicClaimIds: readonly string[];
  structuralCoverage: QueryPlanInspectionCoverage;
  sourceLanguagePolicy: EvidenceQueryPlan["sourceLanguagePolicy"] | null;
  promptProvenance: EvidenceQueryPlanningRuntimeResult["promptProvenance"];
  modelPolicyId: string | null;
  cacheDecision: {
    namespace: string | null;
    reason: string | null;
    canRead: boolean | null;
    canWrite: boolean | null;
  };
  integrityEventSummaries: readonly QueryPlanInspectionIntegrityEventSummary[];
  adapterAttemptSummary: QueryPlanInspectionAdapterAttemptSummary;
};

export type QueryPlanInspectionResult =
  | {
    inspectionVersion: typeof EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION;
    visibility: "internal_only";
    status: "blocked";
    summary: null;
    blockedReason: QueryPlanInspectionBlockedReason;
  }
  | {
    inspectionVersion: typeof EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION;
    visibility: "internal_only";
    status: "inspected";
    summary: QueryPlanInspectionSummary;
    blockedReason: null;
  };

function blocked(blockedReason: QueryPlanInspectionBlockedReason): QueryPlanInspectionResult {
  return {
    inspectionVersion: EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION,
    visibility: "internal_only",
    status: "blocked",
    summary: null,
    blockedReason,
  };
}

function normalizeSelectedAtomicClaimIds(
  selectedAtomicClaimIds: readonly string[],
): readonly string[] | null {
  if (selectedAtomicClaimIds.length === 0) {
    return null;
  }

  for (const claimId of selectedAtomicClaimIds) {
    if (claimId.length === 0 || claimId !== claimId.trim()) {
      return null;
    }
  }

  if (new Set(selectedAtomicClaimIds).size !== selectedAtomicClaimIds.length) {
    return null;
  }

  return [...selectedAtomicClaimIds];
}

function summarizeIntegrityEvents(
  events: readonly EvidenceLifecycleTaskEvent[],
): readonly QueryPlanInspectionIntegrityEventSummary[] {
  return events.map((integrityEvent) => ({
    type: integrityEvent.type,
    severity: integrityEvent.severity,
    referenceCount: integrityEvent.references.length,
  }));
}

function summarizeAdapterAttempts(
  runtimeResult: EvidenceQueryPlanningRuntimeResult,
): QueryPlanInspectionAdapterAttemptSummary {
  if (runtimeResult.adapterOutcome === null) {
    return {
      attemptCount: 0,
      statuses: [],
      providerTelemetryAttemptCount: 0,
      failureMessageAttemptCount: 0,
    };
  }

  const attempts = runtimeResult.adapterOutcome.attempts;
  return {
    attemptCount: attempts.length,
    statuses: attempts.map((attempt) => attempt.status),
    providerTelemetryAttemptCount: attempts.filter((attempt) => attempt.providerTelemetry !== null).length,
    failureMessageAttemptCount: attempts.filter((attempt) => attempt.failureMessage !== null).length,
  };
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function buildCoverage(
  selectedAtomicClaimIds: readonly string[],
  targetAtomicClaimIds: readonly string[],
): QueryPlanInspectionCoverage {
  const targetIdSet = new Set(targetAtomicClaimIds);
  const covered = selectedAtomicClaimIds.filter((claimId) => targetIdSet.has(claimId));
  const uncovered = selectedAtomicClaimIds.filter((claimId) => !targetIdSet.has(claimId));

  return {
    selectedAtomicClaimCount: selectedAtomicClaimIds.length,
    coveredSelectedAtomicClaimIds: covered,
    uncoveredSelectedAtomicClaimIds: uncovered,
    partialCoverage: uncovered.length > 0,
    coverageJudgment: "structural_only_not_quality_assessment",
  };
}

function readQueryEntryTargetIds(result: EvidenceQueryPlanningResult): readonly string[] {
  if (result.status !== "accepted") {
    return [];
  }

  return uniqueSorted(result.queryPlan.queries.flatMap((query) => query.targetAtomicClaimIds));
}

export function buildEvidenceQueryPlanningInspection(
  request: QueryPlanInspectionRequest,
): QueryPlanInspectionResult {
  if (request.selectedAtomicClaimSnapshotSource !== "7l1_input_envelope") {
    return blocked("selected_atomic_claim_snapshot_wrong_source");
  }

  const selectedAtomicClaimIds = normalizeSelectedAtomicClaimIds(request.selectedAtomicClaimIds);
  if (!selectedAtomicClaimIds) {
    return blocked(
      request.selectedAtomicClaimIds.length === 0
        ? "selected_atomic_claim_snapshot_missing"
        : "selected_atomic_claim_snapshot_invalid",
    );
  }

  const result = request.runtimeResult.result;
  const queryEntryTargetAtomicClaimIds = readQueryEntryTargetIds(result);
  const promptProvenance = request.runtimeResult.promptProvenance;
  const cacheDecision = request.runtimeResult.cacheDecision;
  const modelPolicyId = request.runtimeResult.adapterOutcome?.telemetry.modelPolicyId ?? null;

  return {
    inspectionVersion: EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION,
    visibility: "internal_only",
    status: "inspected",
    blockedReason: null,
    summary: {
      inspectionVersion: EVIDENCE_QUERY_PLANNING_INSPECTION_VERSION,
      visibility: "internal_only",
      sourceRuntimeVersion: EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION,
      runtimeStatus: request.runtimeResult.status,
      resultStatus: result.status,
      runtimeBlockedReason: request.runtimeResult.blockedReason,
      resultBlockedReason: result.blockedReason,
      resultDamagedReason: result.damagedReason,
      selectedAtomicClaimIds,
      queryEntryCount: result.status === "accepted" ? result.queryPlan.queries.length : 0,
      queryEntryTargetAtomicClaimIds,
      structuralCoverage: buildCoverage(selectedAtomicClaimIds, queryEntryTargetAtomicClaimIds),
      sourceLanguagePolicy: result.status === "accepted" ? result.queryPlan.sourceLanguagePolicy : null,
      promptProvenance,
      modelPolicyId,
      cacheDecision: {
        namespace: cacheDecision?.namespace ?? null,
        reason: cacheDecision?.reason ?? null,
        canRead: cacheDecision?.canRead ?? null,
        canWrite: cacheDecision?.canWrite ?? null,
      },
      integrityEventSummaries: summarizeIntegrityEvents(result.integrityEvents),
      adapterAttemptSummary: summarizeAdapterAttempts(request.runtimeResult),
    },
  };
}
