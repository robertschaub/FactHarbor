import type {
  SourceAcquisitionCandidateBudgetSnapshot,
  SourceAcquisitionCandidateProviderAllowlistSnapshot,
  SourceAcquisitionCandidateProviderAttemptRequest,
  SourceAcquisitionCandidateProviderAttemptResult,
  SourceAcquisitionCandidateProviderBoundary,
  SourceAcquisitionCandidateRuntimeDecision,
  SourceAcquisitionCandidateRunRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
  executeSourceAcquisitionCandidateRuntime,
  readSourceAcquisitionCandidateRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import {
  createSourceAcquisitionRuntimeAuthority,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  buildSourceAcquisitionCandidateBudgetSnapshot,
  buildSourceAcquisitionCandidateProviderAllowlistSnapshot,
  buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot,
  type SourceAcquisitionCandidateRuntimeAdmissionDecision,
} from "./candidate-runtime-admission";
import type {
  SourceAcquisitionIntakeBoundaryDecision,
} from "./intake-boundary";
import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
} from "./query-plan-handoff";
import type {
  SourceAcquisitionRequest,
  SourceAcquisitionStartDecision,
} from "./types";

export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION =
  "v2.evidence-lifecycle.source-acquisition-candidate-runtime-closed-loop.x7w1b";
export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W1B_Product_Internal_Closed_Candidate_Runtime_Loop_Source_Package.md";
export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_PACKAGE_COMMIT = "a0783c0b";

const SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION_LITERAL = "v2.source-acquisition.runtime-authority.7n3a";
const SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH_LITERAL =
  "Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md";

export type SourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot = {
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION;
  readonly status: "approved_x7w1b_product_closed_candidate_runtime_loop";
  readonly approvedBy: "captain_deputy_review_team";
  readonly sourcePackage: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_SOURCE_PACKAGE;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_PACKAGE_COMMIT;
  readonly approvedScope: "product_internal_closed_runtime_loop_no_source_io";
  readonly visibility: "internal_only";
  readonly closedProviderBoundary: "approved_local_no_io_zero_candidate_boundary";
  readonly realProviderNetworkExecution: "forbidden";
  readonly sourceMaterialCreation: "forbidden";
  readonly evidenceCorpusCreation: "forbidden";
  readonly publicExposure: "forbidden";
  readonly liveJobs: "forbidden";
  readonly authoritySnapshotHash: string;
};

export type SourceAcquisitionCandidateRuntimeClosedLoopBlockedReason =
  | "candidate_runtime_admission_not_ready"
  | "query_plan_handoff_not_ready"
  | "source_acquisition_request_not_ready"
  | "source_acquisition_intake_not_ready"
  | "closed_loop_authority_invalid"
  | "provider_allowlist_invalid"
  | "candidate_budget_invalid"
  | "runtime_contract_authority_invalid"
  | "candidate_runtime_blocked"
  | "closed_provider_boundary_invalid";

export type SourceAcquisitionCandidateRuntimeClosedLoopDamagedReason =
  | "candidate_runtime_damaged"
  | "candidate_runtime_unexpected_success"
  | "candidate_runtime_query_coverage_invalid"
  | "candidate_runtime_threw";

export type SourceAcquisitionCandidateRuntimeClosedLoopQuerySummary = {
  readonly ordinal: number;
  readonly closedLoopQueryRef: string;
  readonly status: "failed" | "timed_out" | "cancelled" | "blocked" | "skipped_with_structural_reason";
  readonly structuralReason: string;
  readonly providerAttemptObserved: boolean;
  readonly candidateCount: 0;
};

export type SourceAcquisitionCandidateRuntimeClosedLoopTelemetry = {
  readonly candidateRuntimeExercised: boolean;
  readonly closedProviderBoundaryInvoked: boolean;
  readonly providerAttemptCount: number;
  readonly candidateCount: 0;
  readonly totalCandidateCount: 0;
  readonly bytesRead: 0;
  readonly providerNetworkExecuted: false;
  readonly searchFetchCalled: false;
  readonly contentDereferenceCalled: false;
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly sourceMaterialCreated: false;
  readonly evidenceCorpusCreated: false;
  readonly evidenceItemGenerated: false;
  readonly warningGenerated: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type SourceAcquisitionCandidateRuntimeClosedLoopDecision = {
  readonly closedLoopVersion: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION;
  readonly visibility: "internal_only";
  readonly status:
    | "closed_loop_completed_no_source_candidates"
    | "blocked_pre_closed_candidate_runtime_loop"
    | "closed_loop_damaged_structural";
  readonly blockedReason: SourceAcquisitionCandidateRuntimeClosedLoopBlockedReason | null;
  readonly damagedReason: SourceAcquisitionCandidateRuntimeClosedLoopDamagedReason | null;
  readonly admissionStatus: SourceAcquisitionCandidateRuntimeAdmissionDecision["status"];
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount: number;
  readonly queryEntryCount: number;
  readonly retrievalPolicyCount: number;
  readonly sourceLanguageSignal: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly productClosedLoopAuthorityHash: string | null;
  readonly runtimeContractAuthorityHash: string | null;
  readonly providerAllowlistSnapshotHash: string | null;
  readonly candidateBudgetSnapshotHash: string | null;
  readonly runtimeStatus: SourceAcquisitionCandidateRuntimeDecision["status"] | null;
  readonly queryOutcomeSummaries: readonly SourceAcquisitionCandidateRuntimeClosedLoopQuerySummary[];
  readonly telemetry: SourceAcquisitionCandidateRuntimeClosedLoopTelemetry;
  readonly publicCutoverStatus: "blocked_precutover";
};

function noIoTelemetry(params: {
  readonly runtimeExercised?: boolean;
  readonly boundaryInvoked?: boolean;
  readonly providerAttemptCount?: number;
} = {}): SourceAcquisitionCandidateRuntimeClosedLoopTelemetry {
  return {
    candidateRuntimeExercised: params.runtimeExercised ?? false,
    closedProviderBoundaryInvoked: params.boundaryInvoked ?? false,
    providerAttemptCount: params.providerAttemptCount ?? 0,
    candidateCount: 0,
    totalCandidateCount: 0,
    bytesRead: 0,
    providerNetworkExecuted: false,
    searchFetchCalled: false,
    contentDereferenceCalled: false,
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityCalled: false,
    sourceMaterialCreated: false,
    evidenceCorpusCreated: false,
    evidenceItemGenerated: false,
    warningGenerated: false,
    reportGenerated: false,
    verdictGenerated: false,
    publicSurfaceWritten: false,
  };
}

function hashWithoutKey(value: object, key: string): string {
  const clone = { ...(value as Record<string, unknown>) };
  delete clone[key];
  return sha256Json(clone);
}

function authoritySnapshotIsValid(
  snapshot: SourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot,
): boolean {
  const requiredKeys = [
    "approvedBy",
    "approvedScope",
    "authoritySnapshotHash",
    "authorityVersion",
    "closedProviderBoundary",
    "evidenceCorpusCreation",
    "liveJobs",
    "packageCommit",
    "publicExposure",
    "realProviderNetworkExecution",
    "sourceMaterialCreation",
    "sourcePackage",
    "status",
    "visibility",
  ];
  const expected = buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot();
  return Object.keys(snapshot).sort().join("|") === requiredKeys.sort().join("|")
    && snapshot.authorityVersion === expected.authorityVersion
    && snapshot.status === expected.status
    && snapshot.approvedBy === expected.approvedBy
    && snapshot.sourcePackage === expected.sourcePackage
    && snapshot.packageCommit === expected.packageCommit
    && snapshot.approvedScope === expected.approvedScope
    && snapshot.visibility === "internal_only"
    && snapshot.closedProviderBoundary === "approved_local_no_io_zero_candidate_boundary"
    && snapshot.realProviderNetworkExecution === "forbidden"
    && snapshot.sourceMaterialCreation === "forbidden"
    && snapshot.evidenceCorpusCreation === "forbidden"
    && snapshot.publicExposure === "forbidden"
    && snapshot.liveJobs === "forbidden"
    && snapshot.authoritySnapshotHash === hashWithoutKey(snapshot, "authoritySnapshotHash");
}

function blocked(params: {
  readonly reason: SourceAcquisitionCandidateRuntimeClosedLoopBlockedReason;
  readonly admissionStatus: SourceAcquisitionCandidateRuntimeAdmissionDecision["status"];
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount?: number;
  readonly queryEntryCount?: number;
  readonly retrievalPolicyCount?: number;
  readonly sourceLanguageSignal?: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly productClosedLoopAuthorityHash?: string | null;
  readonly providerAllowlistSnapshotHash?: string | null;
  readonly candidateBudgetSnapshotHash?: string | null;
}): SourceAcquisitionCandidateRuntimeClosedLoopDecision {
  return {
    closedLoopVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_closed_candidate_runtime_loop",
    blockedReason: params.reason,
    damagedReason: null,
    admissionStatus: params.admissionStatus,
    handoffStatus: params.handoffStatus,
    requestStatus: params.requestStatus,
    intakeStatus: params.intakeStatus,
    selectedAtomicClaimCount: params.selectedAtomicClaimCount ?? 0,
    queryEntryCount: params.queryEntryCount ?? 0,
    retrievalPolicyCount: params.retrievalPolicyCount ?? 0,
    sourceLanguageSignal: params.sourceLanguageSignal ?? "unavailable",
    productClosedLoopAuthorityHash: params.productClosedLoopAuthorityHash ?? null,
    runtimeContractAuthorityHash: null,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash ?? null,
    candidateBudgetSnapshotHash: params.candidateBudgetSnapshotHash ?? null,
    runtimeStatus: null,
    queryOutcomeSummaries: [],
    telemetry: noIoTelemetry(),
    publicCutoverStatus: "blocked_precutover",
  };
}

function damaged(params: {
  readonly reason: SourceAcquisitionCandidateRuntimeClosedLoopDamagedReason;
  readonly admissionStatus: SourceAcquisitionCandidateRuntimeAdmissionDecision["status"];
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount: number;
  readonly queryEntryCount: number;
  readonly retrievalPolicyCount: number;
  readonly sourceLanguageSignal: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly productClosedLoopAuthorityHash: string;
  readonly runtimeContractAuthorityHash: string | null;
  readonly providerAllowlistSnapshotHash: string;
  readonly candidateBudgetSnapshotHash: string;
  readonly runtimeStatus: SourceAcquisitionCandidateRuntimeDecision["status"] | null;
  readonly queryOutcomeSummaries?: readonly SourceAcquisitionCandidateRuntimeClosedLoopQuerySummary[];
  readonly providerAttemptCount?: number;
}): SourceAcquisitionCandidateRuntimeClosedLoopDecision {
  return {
    closedLoopVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION,
    visibility: "internal_only",
    status: "closed_loop_damaged_structural",
    blockedReason: null,
    damagedReason: params.reason,
    admissionStatus: params.admissionStatus,
    handoffStatus: params.handoffStatus,
    requestStatus: params.requestStatus,
    intakeStatus: params.intakeStatus,
    selectedAtomicClaimCount: params.selectedAtomicClaimCount,
    queryEntryCount: params.queryEntryCount,
    retrievalPolicyCount: params.retrievalPolicyCount,
    sourceLanguageSignal: params.sourceLanguageSignal,
    productClosedLoopAuthorityHash: params.productClosedLoopAuthorityHash,
    runtimeContractAuthorityHash: params.runtimeContractAuthorityHash,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: params.candidateBudgetSnapshotHash,
    runtimeStatus: params.runtimeStatus,
    queryOutcomeSummaries: params.queryOutcomeSummaries ?? [],
    telemetry: noIoTelemetry({
      runtimeExercised: true,
      boundaryInvoked: (params.providerAttemptCount ?? 0) > 0,
      providerAttemptCount: params.providerAttemptCount,
    }),
    publicCutoverStatus: "blocked_precutover",
  };
}

export function buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot():
  SourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot {
  const base = {
    authorityVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION,
    status: "approved_x7w1b_product_closed_candidate_runtime_loop",
    approvedBy: "captain_deputy_review_team",
    sourcePackage: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_SOURCE_PACKAGE,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_PACKAGE_COMMIT,
    approvedScope: "product_internal_closed_runtime_loop_no_source_io",
    visibility: "internal_only",
    closedProviderBoundary: "approved_local_no_io_zero_candidate_boundary",
    realProviderNetworkExecution: "forbidden",
    sourceMaterialCreation: "forbidden",
    evidenceCorpusCreation: "forbidden",
    publicExposure: "forbidden",
    liveJobs: "forbidden",
  } as const;

  return {
    ...base,
    authoritySnapshotHash: sha256Json(base),
  };
}

function readyHandoff(
  decision: QueryPlanSourceAcquisitionHandoffDecision,
): QueryPlanSourceAcquisitionHandoff | null {
  return decision.status === "ready_not_executable" ? decision.handoff : null;
}

function readyRequest(
  decision: SourceAcquisitionStartDecision,
): SourceAcquisitionRequest | null {
  return decision.status === "source_acquisition_ready_not_executable" ? decision.request : null;
}

function buildParentAuthoritySnapshot(params: {
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly budget: SourceAcquisitionCandidateBudgetSnapshot;
}): SourceAcquisitionRuntimeAuthoritySnapshot {
  return {
    kind: "source_acquisition_runtime_authority_7n3a",
    source: "v2_7n3a_source_io_authority_boundary_package",
    authorityVersion: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION_LITERAL,
    packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH_LITERAL,
    approval: {
      status: "approved_7n3a_authority_contract_only",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH_LITERAL,
      packageCommit: "8b4035cc",
      approvedScope: "authority_boundary_contracts_only",
    },
    visibility: "internal_only",
    configSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "runtime_owner_contract",
      configSnapshotHash: params.providerAllowlist.configSnapshotHash,
      providerAllowlistSnapshotHash: params.providerAllowlist.providerAllowlistSnapshotHash,
      budgetSnapshotHash: params.budget.budgetSnapshotHash,
      executionState: "not_executable_authority_contract_only",
    },
    capabilityScope: {
      concreteProviderIo: false,
      providerSdk: false,
      searchFetch: false,
      network: false,
      parser: false,
      urlDereference: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      evidenceCorpusPopulation: false,
      semanticInterpretation: false,
    },
    futureGate: "requires_7n3b_concrete_io_gate",
  };
}

function buildRuntimeContractAuthorityHash(params: {
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly budget: SourceAcquisitionCandidateBudgetSnapshot;
}): { readonly authority: unknown; readonly hash: string } {
  const parentAuthority = createSourceAcquisitionRuntimeAuthority(buildParentAuthoritySnapshot(params));
  const authority = createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority,
    configSnapshotHash: params.providerAllowlist.configSnapshotHash,
    providerAllowlistSnapshotHash: params.providerAllowlist.providerAllowlistSnapshotHash,
    budgetSnapshotHash: params.budget.budgetSnapshotHash,
  });
  return {
    authority,
    hash: sha256Json(readSourceAcquisitionCandidateRuntimeAuthoritySnapshot(authority)),
  };
}

function closedLoopQueryRef(index: number): string {
  return `CLQ_${String(index + 1).padStart(3, "0")}`;
}

function buildClosedProviderBoundary(params: {
  readonly providerId: string;
  readonly attempts: SourceAcquisitionCandidateProviderAttemptRequest[];
}): SourceAcquisitionCandidateProviderBoundary {
  return {
    acquireCandidates: (request) => {
      params.attempts.push(request);
      return {
        queryId: request.queryId,
        providerId: params.providerId,
        providerAttemptId: `ATT_${params.attempts.length}`,
        structuralStatus: "provider_failure",
        durationMs: 0,
        candidates: [],
        sanitizedProviderTelemetry: {
          rawPayloadIncluded: false,
          secretIncluded: false,
          publicPayloadIncluded: false,
        },
      } satisfies SourceAcquisitionCandidateProviderAttemptResult;
    },
  };
}

function summarizeRuntimeDecision(
  decision: SourceAcquisitionCandidateRuntimeDecision,
): readonly SourceAcquisitionCandidateRuntimeClosedLoopQuerySummary[] {
  return decision.queryOutcomes.map((outcome, index) => ({
    ordinal: index + 1,
    closedLoopQueryRef: closedLoopQueryRef(index),
    status: outcome.status === "attempted" ? "failed" : outcome.status,
    structuralReason: outcome.structuralReason,
    providerAttemptObserved: outcome.providerAttemptId !== null,
    candidateCount: 0,
  }));
}

function runtimeDecisionIsClosedNoCandidateCompletion(
  decision: SourceAcquisitionCandidateRuntimeDecision,
): boolean {
  return decision.status === "completed_structural"
    && decision.candidates.length === 0
    && decision.queryOutcomes.length > 0
    && decision.queryOutcomes.every((outcome) =>
      outcome.status === "failed"
      && outcome.structuralReason === "provider_failure"
      && outcome.providerAttemptId !== null
      && outcome.candidateCount === 0
    );
}

export async function runSourceAcquisitionCandidateRuntimeClosedLoop(params: {
  readonly handoffDecision: QueryPlanSourceAcquisitionHandoffDecision;
  readonly sourceAcquisitionStartDecision: SourceAcquisitionStartDecision;
  readonly sourceAcquisitionIntakeBoundary: SourceAcquisitionIntakeBoundaryDecision;
  readonly candidateRuntimeAdmission: SourceAcquisitionCandidateRuntimeAdmissionDecision;
  readonly closedLoopAuthoritySnapshot?: SourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot;
}): Promise<SourceAcquisitionCandidateRuntimeClosedLoopDecision> {
  const admissionStatus = params.candidateRuntimeAdmission.status;
  const handoffStatus = params.handoffDecision.status;
  const requestStatus = params.sourceAcquisitionStartDecision.status;
  const intakeStatus = params.sourceAcquisitionIntakeBoundary.status;

  if (admissionStatus !== "admission_ready_no_runtime_execution") {
    return blocked({
      reason: "candidate_runtime_admission_not_ready",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
    });
  }

  const handoff = readyHandoff(params.handoffDecision);
  if (!handoff) {
    return blocked({
      reason: "query_plan_handoff_not_ready",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
    });
  }

  const request = readyRequest(params.sourceAcquisitionStartDecision);
  if (!request) {
    return blocked({
      reason: "source_acquisition_request_not_ready",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
    });
  }

  if (intakeStatus !== "intake_ready_not_executable") {
    return blocked({
      reason: "source_acquisition_intake_not_ready",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  const authoritySnapshot = params.closedLoopAuthoritySnapshot
    ?? buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot();
  const productClosedLoopAuthorityHash = authoritySnapshot.authoritySnapshotHash;
  if (!authoritySnapshotIsValid(authoritySnapshot)) {
    return blocked({
      reason: "closed_loop_authority_invalid",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
    });
  }

  const expectedAdmissionAuthority = buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot();
  if (
    params.candidateRuntimeAdmission.admissionAuthoritySnapshotHash !== expectedAdmissionAuthority.authoritySnapshotHash
  ) {
    return blocked({
      reason: "candidate_runtime_admission_not_ready",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
    });
  }

  const providerAllowlist = buildSourceAcquisitionCandidateProviderAllowlistSnapshot({
    queryEntryCount: handoff.queryEntries.length,
    admissionAuthoritySnapshotHash: expectedAdmissionAuthority.authoritySnapshotHash,
  });
  if (
    params.candidateRuntimeAdmission.providerAllowlistSnapshotHash !== providerAllowlist.providerAllowlistSnapshotHash
  ) {
    return blocked({
      reason: "provider_allowlist_invalid",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
    });
  }

  const budget = buildSourceAcquisitionCandidateBudgetSnapshot({ handoff, request });
  if (params.candidateRuntimeAdmission.candidateBudgetSnapshotHash !== budget.budgetSnapshotHash) {
    return blocked({
      reason: "candidate_budget_invalid",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
    });
  }

  let runtimeContract: { readonly authority: unknown; readonly hash: string };
  try {
    runtimeContract = buildRuntimeContractAuthorityHash({ providerAllowlist, budget });
  } catch {
    return blocked({
      reason: "runtime_contract_authority_invalid",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
    });
  }

  const attempts: SourceAcquisitionCandidateProviderAttemptRequest[] = [];
  const providerId = providerAllowlist.allowedProviders[0]?.providerId;
  if (!providerId) {
    return blocked({
      reason: "provider_allowlist_invalid",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
    });
  }

  let runtimeDecision: SourceAcquisitionCandidateRuntimeDecision;
  try {
    const runRequest: SourceAcquisitionCandidateRunRequest = {
      candidateRunId: `X7W1B_CLOSED_${sha256Json({
        productClosedLoopAuthorityHash,
        budgetSnapshotHash: budget.budgetSnapshotHash,
      }).slice(0, 16).toUpperCase()}`,
      visibility: "internal_only",
      authority: runtimeContract.authority,
      handoffDecision: params.handoffDecision,
      sourceAcquisitionStartDecision: params.sourceAcquisitionStartDecision,
      providerAllowlist,
      budget,
      providerBoundary: buildClosedProviderBoundary({ providerId, attempts }),
    };
    runtimeDecision = await executeSourceAcquisitionCandidateRuntime(runRequest);
  } catch {
    return damaged({
      reason: "candidate_runtime_threw",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
      runtimeStatus: null,
      providerAttemptCount: attempts.length,
    });
  }

  const queryOutcomeSummaries = summarizeRuntimeDecision(runtimeDecision);
  if (runtimeDecision.status === "blocked") {
    return blocked({
      reason: "candidate_runtime_blocked",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
    });
  }

  if (runtimeDecision.status === "damaged_structural") {
    return damaged({
      reason: "candidate_runtime_damaged",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
      runtimeStatus: runtimeDecision.status,
      queryOutcomeSummaries,
      providerAttemptCount: attempts.length,
    });
  }

  if (!runtimeDecisionIsClosedNoCandidateCompletion(runtimeDecision)) {
    return damaged({
      reason: runtimeDecision.candidates.length > 0
        ? "candidate_runtime_unexpected_success"
        : "candidate_runtime_query_coverage_invalid",
      admissionStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productClosedLoopAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
      runtimeStatus: runtimeDecision.status,
      queryOutcomeSummaries,
      providerAttemptCount: attempts.length,
    });
  }

  return {
    closedLoopVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_CLOSED_LOOP_VERSION,
    visibility: "internal_only",
    status: "closed_loop_completed_no_source_candidates",
    blockedReason: null,
    damagedReason: null,
    admissionStatus,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
    queryEntryCount: handoff.queryEntries.length,
    retrievalPolicyCount: request.retrievalPolicyCatalog.length,
    sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    productClosedLoopAuthorityHash,
    runtimeContractAuthorityHash: runtimeContract.hash,
    providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: budget.budgetSnapshotHash,
    runtimeStatus: runtimeDecision.status,
    queryOutcomeSummaries,
    telemetry: noIoTelemetry({
      runtimeExercised: true,
      boundaryInvoked: attempts.length > 0,
      providerAttemptCount: attempts.length,
    }),
    publicCutoverStatus: "blocked_precutover",
  };
}
