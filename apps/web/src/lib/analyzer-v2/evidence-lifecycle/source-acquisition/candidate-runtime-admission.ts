import type {
  SourceAcquisitionCandidateBudgetSnapshot,
  SourceAcquisitionCandidateProviderAllowlistSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  validateSourceAcquisitionCandidateBudgetSnapshot,
  validateSourceAcquisitionCandidateProviderAllowlistSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import { sha256Json } from "@/lib/analyzer-v2/util";
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

export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_VERSION =
  "v2.evidence-lifecycle.source-acquisition-candidate-runtime-admission.x7w1a";
export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W1A_Product_Internal_Candidate_Runtime_Admission_Source_Package.md";
export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_PACKAGE_COMMIT = "14b930f6";

const CANDIDATE_RUNTIME_SHAPE_VERSION = "v2.source-acquisition.candidate-runtime.7n3b1";
const CANDIDATE_RUNTIME_SHAPE_PACKAGE_PATH =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B1_Candidate_Acquisition_Runtime_Source_Package.md";
const CANDIDATE_RUNTIME_SHAPE_PACKAGE_COMMIT = "0fbbb71c";
const CANDIDATE_RUNTIME_SHAPE_APPROVAL = {
  status: "approved_7n3b1_candidate_runtime",
  approvedBy: "deputy_review_team",
  packagePath: CANDIDATE_RUNTIME_SHAPE_PACKAGE_PATH,
  packageCommit: CANDIDATE_RUNTIME_SHAPE_PACKAGE_COMMIT,
  approvedScope: "hidden_candidate_runtime_shell_only",
} as const;

export type SourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot = {
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_VERSION;
  readonly status: "approved_x7w1a_product_candidate_runtime_admission";
  readonly approvedBy: "captain_deputy_review_team";
  readonly sourcePackage: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_SOURCE_PACKAGE;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_PACKAGE_COMMIT;
  readonly approvedScope: "product_internal_admission_only_no_runtime_execution";
  readonly visibility: "internal_only";
  readonly publicExposure: "forbidden";
  readonly candidateRuntimeExecution: "forbidden";
  readonly candidateProviderInvocation: "forbidden";
  readonly providerNetworkExecution: "forbidden";
  readonly sourceMaterialCreation: "forbidden";
  readonly evidenceCorpusCreation: "forbidden";
  readonly authoritySnapshotHash: string;
};

export type SourceAcquisitionCandidateRuntimeAdmissionBlockedReason =
  | "query_plan_handoff_not_ready"
  | "source_acquisition_request_not_ready"
  | "source_acquisition_intake_not_ready"
  | "selected_claim_ids_invalid"
  | "query_entries_invalid"
  | "retrieval_policies_invalid"
  | "source_language_signal_unavailable"
  | "admission_authority_invalid"
  | "provider_allowlist_invalid"
  | "candidate_budget_invalid";

export type SourceAcquisitionCandidateRuntimeAdmissionTelemetry = {
  readonly admittedQueryCount: number;
  readonly providerAttemptCount: 0;
  readonly candidateCount: 0;
  readonly totalCandidateCount: 0;
  readonly bytesRead: 0;
  readonly candidateRuntimeExecuted: false;
  readonly candidateProviderInvoked: false;
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
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type SourceAcquisitionCandidateRuntimeAdmissionDecision = {
  readonly admissionVersion: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_VERSION;
  readonly visibility: "internal_only";
  readonly status: "admission_ready_no_runtime_execution" | "blocked_pre_candidate_runtime_admission";
  readonly blockedReason: SourceAcquisitionCandidateRuntimeAdmissionBlockedReason | null;
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly admissionScope: "admission_only_no_runtime_execution" | "not_applicable";
  readonly selectedAtomicClaimCount: number;
  readonly queryEntryCount: number;
  readonly retrievalPolicyCount: number;
  readonly sourceLanguageSignal: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly admissionAuthoritySnapshotHash: string | null;
  readonly providerAllowlistSnapshotHash: string | null;
  readonly candidateBudgetSnapshotHash: string | null;
  readonly candidateRuntimePosture: {
    readonly productAdmissionAuthority: "approved_x7w1a_admission_only";
    readonly candidateRuntimeAuthority: "not_authorized";
    readonly candidateProviderAuthority: "not_authorized";
    readonly sourceExecutionAuthority: "blocked_precutover";
    readonly publicExposure: "forbidden";
  };
  readonly telemetry: SourceAcquisitionCandidateRuntimeAdmissionTelemetry;
  readonly publicCutoverStatus: "blocked_precutover";
};

function noExecutionTelemetry(admittedQueryCount = 0): SourceAcquisitionCandidateRuntimeAdmissionTelemetry {
  return {
    admittedQueryCount,
    providerAttemptCount: 0,
    candidateCount: 0,
    totalCandidateCount: 0,
    bytesRead: 0,
    candidateRuntimeExecuted: false,
    candidateProviderInvoked: false,
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

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function cleanUniqueStrings(values: readonly string[]): boolean {
  return values.length > 0
    && values.every((value) => value.trim().length > 0 && value === value.trim())
    && new Set(values).size === values.length;
}

function queryIdsAreValid(handoff: QueryPlanSourceAcquisitionHandoff): boolean {
  return cleanUniqueStrings(handoff.queryEntries.map((entry) => entry.queryId));
}

function blocked(params: {
  readonly reason: SourceAcquisitionCandidateRuntimeAdmissionBlockedReason;
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount?: number;
  readonly queryEntryCount?: number;
  readonly retrievalPolicyCount?: number;
  readonly sourceLanguageSignal?: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly admissionAuthoritySnapshotHash?: string | null;
  readonly providerAllowlistSnapshotHash?: string | null;
  readonly candidateBudgetSnapshotHash?: string | null;
}): SourceAcquisitionCandidateRuntimeAdmissionDecision {
  return {
    admissionVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_candidate_runtime_admission",
    blockedReason: params.reason,
    handoffStatus: params.handoffStatus,
    requestStatus: params.requestStatus,
    intakeStatus: params.intakeStatus,
    admissionScope: "not_applicable",
    selectedAtomicClaimCount: params.selectedAtomicClaimCount ?? 0,
    queryEntryCount: params.queryEntryCount ?? 0,
    retrievalPolicyCount: params.retrievalPolicyCount ?? 0,
    sourceLanguageSignal: params.sourceLanguageSignal ?? "unavailable",
    admissionAuthoritySnapshotHash: params.admissionAuthoritySnapshotHash ?? null,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash ?? null,
    candidateBudgetSnapshotHash: params.candidateBudgetSnapshotHash ?? null,
    candidateRuntimePosture: {
      productAdmissionAuthority: "approved_x7w1a_admission_only",
      candidateRuntimeAuthority: "not_authorized",
      candidateProviderAuthority: "not_authorized",
      sourceExecutionAuthority: "blocked_precutover",
      publicExposure: "forbidden",
    },
    telemetry: noExecutionTelemetry(),
    publicCutoverStatus: "blocked_precutover",
  };
}

export function buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot():
  SourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot {
  const base = {
    authorityVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_VERSION,
    status: "approved_x7w1a_product_candidate_runtime_admission",
    approvedBy: "captain_deputy_review_team",
    sourcePackage: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_SOURCE_PACKAGE,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_PACKAGE_COMMIT,
    approvedScope: "product_internal_admission_only_no_runtime_execution",
    visibility: "internal_only",
    publicExposure: "forbidden",
    candidateRuntimeExecution: "forbidden",
    candidateProviderInvocation: "forbidden",
    providerNetworkExecution: "forbidden",
    sourceMaterialCreation: "forbidden",
    evidenceCorpusCreation: "forbidden",
  } as const;

  return {
    ...base,
    authoritySnapshotHash: sha256Json(base),
  };
}

function authoritySnapshotIsValid(
  snapshot: SourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot,
): boolean {
  const requiredKeys = [
    "approvedBy",
    "approvedScope",
    "authoritySnapshotHash",
    "authorityVersion",
    "candidateRuntimeExecution",
    "evidenceCorpusCreation",
    "packageCommit",
    "candidateProviderInvocation",
    "providerNetworkExecution",
    "publicExposure",
    "sourceMaterialCreation",
    "sourcePackage",
    "status",
    "visibility",
  ];
  const expected = buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot();
  return Object.keys(snapshot).sort().join("|") === requiredKeys.sort().join("|")
    && snapshot.authorityVersion === expected.authorityVersion
    && snapshot.status === expected.status
    && snapshot.approvedBy === expected.approvedBy
    && snapshot.sourcePackage === expected.sourcePackage
    && snapshot.packageCommit === expected.packageCommit
    && snapshot.approvedScope === expected.approvedScope
    && snapshot.visibility === "internal_only"
    && snapshot.publicExposure === "forbidden"
    && snapshot.candidateRuntimeExecution === "forbidden"
    && snapshot.candidateProviderInvocation === "forbidden"
    && snapshot.providerNetworkExecution === "forbidden"
    && snapshot.sourceMaterialCreation === "forbidden"
    && snapshot.evidenceCorpusCreation === "forbidden"
    && snapshot.authoritySnapshotHash === hashWithoutKey(snapshot, "authoritySnapshotHash");
}

export function buildSourceAcquisitionCandidateProviderAllowlistSnapshot(params: {
  readonly queryEntryCount: number;
  readonly admissionAuthoritySnapshotHash: string;
}): SourceAcquisitionCandidateProviderAllowlistSnapshot {
  const base = {
    version: CANDIDATE_RUNTIME_SHAPE_VERSION,
    approval: CANDIDATE_RUNTIME_SHAPE_APPROVAL,
    configSnapshotHash: sha256Json({
      sourcePackage: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_SOURCE_PACKAGE,
      admissionAuthoritySnapshotHash: params.admissionAuthoritySnapshotHash,
      noRuntimeExecution: true,
      noProviderInvocation: true,
    }),
    allowedProviders: [
      {
        providerId: "x7w1a_closed",
        endpointKind: "candidate_search_api_future",
        maxQueries: params.queryEntryCount,
        timeoutMs: 1,
        credentialsState: "present_without_secret",
      },
    ],
    disabledProviders: [],
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
  } as const;

  return {
    ...base,
    providerAllowlistSnapshotHash: sha256Json(base),
  };
}

function providerAllowlistSnapshotIsValid(
  snapshot: SourceAcquisitionCandidateProviderAllowlistSnapshot,
): boolean {
  return validateSourceAcquisitionCandidateProviderAllowlistSnapshot(snapshot).status === "valid"
    && snapshot.providerAllowlistSnapshotHash === hashWithoutKey(snapshot, "providerAllowlistSnapshotHash");
}

export function buildSourceAcquisitionCandidateBudgetSnapshot(params: {
  readonly handoff: QueryPlanSourceAcquisitionHandoff;
  readonly request: SourceAcquisitionRequest;
}): SourceAcquisitionCandidateBudgetSnapshot {
  const queryIds = params.handoff.queryEntries.map((entry) => entry.queryId);
  const base = {
    version: CANDIDATE_RUNTIME_SHAPE_VERSION,
    source: "v2_7n3b1_candidate_runtime",
    approval: CANDIDATE_RUNTIME_SHAPE_APPROVAL,
    handoffIdentity: {
      handoffVersion: params.handoff.handoffVersion,
      selectedAtomicClaimIds: [...params.handoff.selectedAtomicClaimIds],
      queryIds,
      queryEntryCount: queryIds.length,
      promptContentHash: params.handoff.promptProvenance.promptContentHash,
      renderedPromptHash: params.handoff.promptProvenance.renderedPromptHash,
      modelPolicyId: params.handoff.modelPolicyId,
      cacheNamespace: params.handoff.cacheProvenance.namespace,
      cacheReason: params.handoff.cacheProvenance.reason,
      cacheCanRead: false,
      cacheCanWrite: false,
      sourceLanguagePolicy: params.handoff.sourceLanguagePolicy,
    },
    sourceRequestIdentity: {
      requestVersion: params.request.requestVersion,
      selectedAtomicClaimIds: [...params.request.intake.selectedAtomicClaimIds],
      runId: params.request.intake.runId,
      currentDate: params.request.intake.currentDate,
      detectedLanguage: params.request.intake.detectedLanguage,
    },
    queryEntryCount: queryIds.length,
    maxAttemptsPerQuery: 1,
    maxCandidateRecordsPerQuery: 0,
    providerTimeoutMs: 1,
    totalCandidateAcquisitionTimeoutMs: Math.max(1, queryIds.length),
    cancellationState: "not_requested",
    retryPolicy: "none",
    partialExecutionSemantics: "structural_query_outcome_per_query",
  } as const;

  return {
    ...base,
    budgetSnapshotHash: sha256Json(base),
  };
}

function candidateBudgetSnapshotIsValid(snapshot: SourceAcquisitionCandidateBudgetSnapshot): boolean {
  return validateSourceAcquisitionCandidateBudgetSnapshot(snapshot).status === "valid"
    && snapshot.budgetSnapshotHash === hashWithoutKey(snapshot, "budgetSnapshotHash");
}

export function buildSourceAcquisitionCandidateRuntimeAdmissionDecision(params: {
  readonly handoffDecision: QueryPlanSourceAcquisitionHandoffDecision;
  readonly sourceAcquisitionStartDecision: SourceAcquisitionStartDecision;
  readonly sourceAcquisitionIntakeBoundary: SourceAcquisitionIntakeBoundaryDecision;
  readonly admissionAuthoritySnapshot?: SourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot;
  readonly providerAllowlistSnapshot?: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly candidateBudgetSnapshot?: SourceAcquisitionCandidateBudgetSnapshot;
}): SourceAcquisitionCandidateRuntimeAdmissionDecision {
  const handoffStatus = params.handoffDecision.status;
  const requestStatus = params.sourceAcquisitionStartDecision.status;
  const intakeStatus = params.sourceAcquisitionIntakeBoundary.status;

  if (handoffStatus !== "ready_not_executable") {
    return blocked({
      reason: "query_plan_handoff_not_ready",
      handoffStatus,
      requestStatus,
      intakeStatus,
    });
  }
  const handoff = params.handoffDecision.handoff;

  if (requestStatus !== "source_acquisition_ready_not_executable") {
    return blocked({
      reason: "source_acquisition_request_not_ready",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }
  const request = params.sourceAcquisitionStartDecision.request;

  if (intakeStatus !== "intake_ready_not_executable") {
    return blocked({
      reason: "source_acquisition_intake_not_ready",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  if (
    !cleanUniqueStrings(handoff.selectedAtomicClaimIds)
    || !arraysEqual(handoff.selectedAtomicClaimIds, request.intake.selectedAtomicClaimIds)
    || params.sourceAcquisitionIntakeBoundary.selectedAtomicClaimCount !== handoff.selectedAtomicClaimIds.length
  ) {
    return blocked({
      reason: "selected_claim_ids_invalid",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  if (
    handoff.queryEntries.length === 0
    || params.sourceAcquisitionIntakeBoundary.queryEntryCount !== handoff.queryEntries.length
    || !queryIdsAreValid(handoff)
  ) {
    return blocked({
      reason: "query_entries_invalid",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  if (
    request.retrievalPolicyCatalog.length === 0
    || params.sourceAcquisitionIntakeBoundary.retrievalPolicyCount !== request.retrievalPolicyCatalog.length
  ) {
    return blocked({
      reason: "retrieval_policies_invalid",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  if (params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal !== "present") {
    return blocked({
      reason: "source_language_signal_unavailable",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: "unavailable",
    });
  }

  const authoritySnapshot = params.admissionAuthoritySnapshot
    ?? buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot();
  const authorityHash = authoritySnapshot.authoritySnapshotHash;
  if (!authoritySnapshotIsValid(authoritySnapshot)) {
    return blocked({
      reason: "admission_authority_invalid",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: "present",
      admissionAuthoritySnapshotHash: authorityHash,
    });
  }

  const providerAllowlistSnapshot = params.providerAllowlistSnapshot
    ?? buildSourceAcquisitionCandidateProviderAllowlistSnapshot({
      queryEntryCount: handoff.queryEntries.length,
      admissionAuthoritySnapshotHash: authorityHash,
    });
  if (!providerAllowlistSnapshotIsValid(providerAllowlistSnapshot)) {
    return blocked({
      reason: "provider_allowlist_invalid",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: "present",
      admissionAuthoritySnapshotHash: authorityHash,
      providerAllowlistSnapshotHash: providerAllowlistSnapshot.providerAllowlistSnapshotHash,
    });
  }

  const candidateBudgetSnapshot = params.candidateBudgetSnapshot
    ?? buildSourceAcquisitionCandidateBudgetSnapshot({ handoff, request });
  if (!candidateBudgetSnapshotIsValid(candidateBudgetSnapshot)) {
    return blocked({
      reason: "candidate_budget_invalid",
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: "present",
      admissionAuthoritySnapshotHash: authorityHash,
      providerAllowlistSnapshotHash: providerAllowlistSnapshot.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudgetSnapshot.budgetSnapshotHash,
    });
  }

  return {
    admissionVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_ADMISSION_VERSION,
    visibility: "internal_only",
    status: "admission_ready_no_runtime_execution",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    admissionScope: "admission_only_no_runtime_execution",
    selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
    queryEntryCount: handoff.queryEntries.length,
    retrievalPolicyCount: request.retrievalPolicyCatalog.length,
    sourceLanguageSignal: "present",
    admissionAuthoritySnapshotHash: authorityHash,
    providerAllowlistSnapshotHash: providerAllowlistSnapshot.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: candidateBudgetSnapshot.budgetSnapshotHash,
    candidateRuntimePosture: {
      productAdmissionAuthority: "approved_x7w1a_admission_only",
      candidateRuntimeAuthority: "not_authorized",
      candidateProviderAuthority: "not_authorized",
      sourceExecutionAuthority: "blocked_precutover",
      publicExposure: "forbidden",
    },
    telemetry: noExecutionTelemetry(handoff.queryEntries.length),
    publicCutoverStatus: "blocked_precutover",
  };
}
