import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
} from "./query-plan-handoff";
import type { SourceAcquisitionStartDecision } from "./types";

export const SOURCE_ACQUISITION_INTAKE_BOUNDARY_VERSION =
  "v2.evidence-lifecycle.source-acquisition-intake-boundary.x7v";

export type SourceAcquisitionIntakeBoundaryBlockedReason =
  | "query_plan_handoff_not_ready"
  | "source_acquisition_request_blocked"
  | "source_acquisition_request_invalid"
  | "selected_claim_ids_mismatch"
  | "query_entries_missing"
  | "source_language_policy_missing";

export type SourceAcquisitionIntakeBoundaryExecution = {
  readonly sourceAcquisitionExecuted: false;
  readonly providerNetworkExecuted: false;
  readonly searchFetchCalled: false;
  readonly contentDereferenceCalled: false;
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly sourceMaterialCreated: false;
  readonly evidenceCorpusCreated: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
};

export type SourceAcquisitionIntakeBoundaryDecision = {
  readonly boundaryVersion: typeof SOURCE_ACQUISITION_INTAKE_BOUNDARY_VERSION;
  readonly visibility: "internal_only";
  readonly status: "intake_ready_not_executable" | "blocked_pre_source_acquisition";
  readonly blockedReason: SourceAcquisitionIntakeBoundaryBlockedReason | null;
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly executionScope: "not_executable" | "not_applicable";
  readonly selectedAtomicClaimCount: number;
  readonly queryEntryCount: number;
  readonly retrievalPolicyCount: number;
  readonly sourceLanguageSignal: "present" | "unavailable";
  readonly executionPosture: {
    readonly sourceExecutionAuthority: "blocked_precutover";
    readonly providerNetworkAuthority: "not_authorized";
    readonly parserAuthority: "not_authorized";
    readonly publicExposure: "forbidden";
  };
  readonly execution: SourceAcquisitionIntakeBoundaryExecution;
};

function noExecution(): SourceAcquisitionIntakeBoundaryExecution {
  return {
    sourceAcquisitionExecuted: false,
    providerNetworkExecuted: false,
    searchFetchCalled: false,
    contentDereferenceCalled: false,
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    sourceReliabilityCalled: false,
    sourceMaterialCreated: false,
    evidenceCorpusCreated: false,
    reportGenerated: false,
    verdictGenerated: false,
  };
}

function blocked(params: {
  readonly reason: SourceAcquisitionIntakeBoundaryBlockedReason;
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly selectedAtomicClaimCount?: number;
  readonly queryEntryCount?: number;
  readonly retrievalPolicyCount?: number;
  readonly sourceLanguageSignal?: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
}): SourceAcquisitionIntakeBoundaryDecision {
  return {
    boundaryVersion: SOURCE_ACQUISITION_INTAKE_BOUNDARY_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_source_acquisition",
    blockedReason: params.reason,
    handoffStatus: params.handoffStatus,
    requestStatus: params.requestStatus,
    executionScope: "not_applicable",
    selectedAtomicClaimCount: params.selectedAtomicClaimCount ?? 0,
    queryEntryCount: params.queryEntryCount ?? 0,
    retrievalPolicyCount: params.retrievalPolicyCount ?? 0,
    sourceLanguageSignal: params.sourceLanguageSignal ?? "unavailable",
    executionPosture: {
      sourceExecutionAuthority: "blocked_precutover",
      providerNetworkAuthority: "not_authorized",
      parserAuthority: "not_authorized",
      publicExposure: "forbidden",
    },
    execution: noExecution(),
  };
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sourceLanguageSignal(
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"] {
  return handoff.sourceLanguagePolicy.primaryLanguage.trim().length > 0
    ? "present"
    : "unavailable";
}

export function buildSourceAcquisitionIntakeBoundaryDecision(params: {
  readonly handoffDecision: QueryPlanSourceAcquisitionHandoffDecision;
  readonly sourceAcquisitionStartDecision: SourceAcquisitionStartDecision;
}): SourceAcquisitionIntakeBoundaryDecision {
  const handoffDecision = params.handoffDecision;
  const sourceAcquisitionStartDecision = params.sourceAcquisitionStartDecision;

  if (handoffDecision.status !== "ready_not_executable") {
    return blocked({
      reason: "query_plan_handoff_not_ready",
      handoffStatus: handoffDecision.status,
      requestStatus: sourceAcquisitionStartDecision.status,
    });
  }

  const handoff = handoffDecision.handoff;
  if (sourceAcquisitionStartDecision.status !== "source_acquisition_ready_not_executable") {
    return blocked({
      reason: "source_acquisition_request_blocked",
      handoffStatus: handoffDecision.status,
      requestStatus: sourceAcquisitionStartDecision.status,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      sourceLanguageSignal: sourceLanguageSignal(handoff),
    });
  }

  const request = sourceAcquisitionStartDecision.request;
  if (
    request.executionScope !== "contract_only_no_provider_execution"
    || request.sourceAcquisitionStatus !== "ready_not_executable"
    || request.visibility !== "internal_only"
  ) {
    return blocked({
      reason: "source_acquisition_request_invalid",
      handoffStatus: handoffDecision.status,
      requestStatus: sourceAcquisitionStartDecision.status,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: sourceLanguageSignal(handoff),
    });
  }

  if (!arraysEqual(handoff.selectedAtomicClaimIds, request.intake.selectedAtomicClaimIds)) {
    return blocked({
      reason: "selected_claim_ids_mismatch",
      handoffStatus: handoffDecision.status,
      requestStatus: sourceAcquisitionStartDecision.status,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: sourceLanguageSignal(handoff),
    });
  }

  if (handoff.queryEntries.length === 0) {
    return blocked({
      reason: "query_entries_missing",
      handoffStatus: handoffDecision.status,
      requestStatus: sourceAcquisitionStartDecision.status,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: sourceLanguageSignal(handoff),
    });
  }

  if (sourceLanguageSignal(handoff) !== "present") {
    return blocked({
      reason: "source_language_policy_missing",
      handoffStatus: handoffDecision.status,
      requestStatus: sourceAcquisitionStartDecision.status,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: "unavailable",
    });
  }

  return {
    boundaryVersion: SOURCE_ACQUISITION_INTAKE_BOUNDARY_VERSION,
    visibility: "internal_only",
    status: "intake_ready_not_executable",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    executionScope: "not_executable",
    selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
    queryEntryCount: handoff.queryEntries.length,
    retrievalPolicyCount: request.retrievalPolicyCatalog.length,
    sourceLanguageSignal: "present",
    executionPosture: {
      sourceExecutionAuthority: "blocked_precutover",
      providerNetworkAuthority: "not_authorized",
      parserAuthority: "not_authorized",
      publicExposure: "forbidden",
    },
    execution: noExecution(),
  };
}
