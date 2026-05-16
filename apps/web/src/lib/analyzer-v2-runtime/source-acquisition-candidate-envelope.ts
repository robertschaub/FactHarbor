export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION =
  "v2.source-acquisition.candidate-runtime.7n3b1";
export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B1_Candidate_Acquisition_Runtime_Source_Package.md";
export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT = "0fbbb71c";

export type SourceAcquisitionCandidateRuntimeApproval = {
  readonly status: "approved_7n3b1_candidate_runtime";
  readonly approvedBy: "deputy_review_team";
  readonly packagePath: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT;
  readonly approvedScope: "hidden_candidate_runtime_shell_only";
};

export type SourceAcquisitionCandidateProviderId = string;
export type SourceAcquisitionCandidateProviderEndpointKind =
  | "test_injected_candidate_boundary"
  | "candidate_search_api_future";

type CandidateProviderCredentialsState =
  | "not_required_for_test_boundary"
  | "present_without_secret";

type SourceAcquisitionCandidateProviderEntry = {
  readonly providerId: SourceAcquisitionCandidateProviderId;
  readonly endpointKind: SourceAcquisitionCandidateProviderEndpointKind;
  readonly maxQueries: number;
  readonly timeoutMs: number;
  readonly credentialsState: CandidateProviderCredentialsState;
};

type SourceAcquisitionCandidateDisabledProviderEntry = {
  readonly providerId: SourceAcquisitionCandidateProviderId;
  readonly disabledReason: "credentials_missing" | "disabled_by_policy" | "not_approved_for_7n3b1";
};

export type SourceAcquisitionCandidateProviderAllowlistSnapshot = {
  readonly version: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION;
  readonly approval: SourceAcquisitionCandidateRuntimeApproval;
  readonly providerAllowlistSnapshotHash: string;
  readonly configSnapshotHash: string;
  readonly allowedProviders: readonly SourceAcquisitionCandidateProviderEntry[];
  readonly disabledProviders: readonly SourceAcquisitionCandidateDisabledProviderEntry[];
  readonly noCache: true;
  readonly noStorage: true;
  readonly noSourceReliability: true;
  readonly noProduct: true;
  readonly noPublic: true;
};

export type SourceAcquisitionCandidateBudgetSnapshot = {
  readonly version: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION;
  readonly source: "v2_7n3b1_candidate_runtime";
  readonly approval: SourceAcquisitionCandidateRuntimeApproval;
  readonly budgetSnapshotHash: string;
  readonly handoffIdentity: {
    readonly handoffVersion: string;
    readonly selectedAtomicClaimIds: readonly string[];
    readonly queryIds: readonly string[];
    readonly queryEntryCount: number;
    readonly promptContentHash: string;
    readonly renderedPromptHash: string;
    readonly modelPolicyId: string;
    readonly cacheNamespace: string;
    readonly cacheReason: string;
    readonly cacheCanRead: false;
    readonly cacheCanWrite: false;
    readonly sourceLanguagePolicy: unknown;
  };
  readonly sourceRequestIdentity: {
    readonly requestVersion: string;
    readonly selectedAtomicClaimIds: readonly string[];
    readonly runId: string;
    readonly currentDate: string;
    readonly detectedLanguage: string;
  };
  readonly queryEntryCount: number;
  readonly maxAttemptsPerQuery: 1;
  readonly maxCandidateRecordsPerQuery: number;
  readonly providerTimeoutMs: number;
  readonly totalCandidateAcquisitionTimeoutMs: number;
  readonly cancellationState: "not_requested" | "requested";
  readonly retryPolicy: "none";
  readonly partialExecutionSemantics: "structural_query_outcome_per_query";
};

export type SourceAcquisitionCandidateRunRequest = {
  readonly candidateRunId: string;
  readonly visibility: "internal_only";
  readonly authority: unknown;
  readonly handoffDecision: unknown;
  readonly sourceAcquisitionStartDecision: unknown;
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly budget: SourceAcquisitionCandidateBudgetSnapshot;
  readonly providerBoundary: SourceAcquisitionCandidateProviderBoundary;
};

export type SourceAcquisitionCandidateProviderBoundary = {
  readonly acquireCandidates: (
    request: SourceAcquisitionCandidateProviderAttemptRequest,
  ) =>
    | SourceAcquisitionCandidateProviderAttemptResult
    | Promise<SourceAcquisitionCandidateProviderAttemptResult>;
};

export type SourceAcquisitionCandidateProviderAttemptRequest = {
  readonly candidateRunId: string;
  readonly queryId: string;
  readonly retrievalPolicyKey: string;
  readonly queryText: string;
  readonly targetAtomicClaimIds: readonly string[];
  readonly sourceLanguagePolicy: unknown;
  readonly allowedProviderIds: readonly SourceAcquisitionCandidateProviderId[];
  readonly timeoutMs: number;
  readonly maxCandidateRecords: number;
};

export type SourceAcquisitionCandidateProviderAttemptResult = {
  readonly queryId: string;
  readonly providerId: SourceAcquisitionCandidateProviderId;
  readonly providerAttemptId: string;
  readonly structuralStatus:
    | "success"
    | "provider_failure"
    | "search_failure"
    | "rate_limited"
    | "timed_out"
    | "cancelled";
  readonly durationMs: number;
  readonly candidates: readonly SourceAcquisitionHiddenCandidateRecord[];
  readonly sanitizedProviderTelemetry: {
    readonly rawPayloadIncluded: false;
    readonly secretIncluded: false;
    readonly publicPayloadIncluded: false;
  };
};

export type SourceAcquisitionHiddenCandidateRecord = {
  readonly candidateId: string;
  readonly queryId: string;
  readonly retrievalPolicyKey: string;
  readonly providerId: SourceAcquisitionCandidateProviderId;
  readonly providerAttemptId: string;
  readonly providerRank: number;
  readonly hiddenLocatorId: string;
  readonly hiddenMetadata: {
    readonly semanticUse: "not_semantic_evidence";
    readonly titleState: "not_collected";
    readonly snippetState: "not_collected";
    readonly domainState: "not_collected";
    readonly languageState: "not_collected";
  };
  readonly candidateStructuralStatus: "candidate_acquired";
};

export type SourceAcquisitionCandidateQueryOutcome = {
  readonly queryId: string;
  readonly status:
    | "attempted"
    | "blocked"
    | "failed"
    | "timed_out"
    | "cancelled"
    | "skipped_with_structural_reason";
  readonly structuralReason: SourceAcquisitionCandidateRuntimeStopReason;
  readonly providerAttemptId: string | null;
  readonly candidateCount: number;
};

export type SourceAcquisitionCandidateRuntimeDecision =
  | {
      readonly version: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION;
      readonly visibility: "internal_only";
      readonly status: "blocked";
      readonly stopReason: Exclude<SourceAcquisitionCandidateRuntimeStopReason, "not_stopped">;
      readonly queryOutcomes: readonly SourceAcquisitionCandidateQueryOutcome[];
      readonly candidates: readonly [];
    }
  | {
      readonly version: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION;
      readonly visibility: "internal_only";
      readonly status: "completed_structural";
      readonly stopReason: "not_stopped";
      readonly queryOutcomes: readonly SourceAcquisitionCandidateQueryOutcome[];
      readonly candidates: readonly SourceAcquisitionHiddenCandidateRecord[];
    }
  | {
      readonly version: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION;
      readonly visibility: "internal_only";
      readonly status: "damaged_structural";
      readonly stopReason: Exclude<SourceAcquisitionCandidateRuntimeStopReason, "not_stopped">;
      readonly queryOutcomes: readonly SourceAcquisitionCandidateQueryOutcome[];
      readonly candidates: readonly SourceAcquisitionHiddenCandidateRecord[];
    };

export type SourceAcquisitionCandidateRuntimeStopReason =
  | "not_stopped"
  | "run_request_invalid"
  | "handoff_not_ready"
  | "source_request_invalid"
  | "authority_invalid"
  | "provider_allowlist_invalid"
  | "budget_invalid"
  | "budget_stale"
  | "cancellation_requested"
  | "provider_result_invalid"
  | "provider_failure"
  | "provider_timeout"
  | "provider_cancelled"
  | "provider_candidate_cap_exceeded"
  | "partial_execution";

export type SourceAcquisitionCandidateValidationResult =
  | {
      readonly status: "valid";
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "blocked";
      readonly blockedReasons: readonly string[];
    };

const forbiddenPlaceholderValues = new Set(["", "placeholder", "todo", "unknown"]);
const forbiddenProviderIdFragments = [
  "://",
  "/",
  "\\",
  "?",
  "#",
  ".",
  "key",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCanonicalProviderId(value: unknown): value is SourceAcquisitionCandidateProviderId {
  if (!isNonBlankString(value) || value !== value.trim()) {
    return false;
  }

  const normalized = value.toLowerCase();
  return value === normalized
    && /^[a-z][a-z0-9_]{0,63}$/.test(value)
    && !forbiddenPlaceholderValues.has(value)
    && !forbiddenProviderIdFragments.some((fragment) => value.includes(fragment));
}

function approvalIsValid(approval: SourceAcquisitionCandidateRuntimeApproval): boolean {
  return isRecord(approval)
    && approval.status === "approved_7n3b1_candidate_runtime"
    && approval.approvedBy === "deputy_review_team"
    && approval.packagePath === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH
    && approval.packageCommit === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT
    && approval.approvedScope === "hidden_candidate_runtime_shell_only";
}

function valuesAreUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function stringListIsClean(values: readonly string[]): boolean {
  return values.length > 0
    && values.every((value) => isNonBlankString(value) && value === value.trim())
    && valuesAreUnique(values);
}

export function validateSourceAcquisitionCandidateProviderAllowlistSnapshot(
  snapshot: SourceAcquisitionCandidateProviderAllowlistSnapshot,
): SourceAcquisitionCandidateValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(snapshot)) {
    return { status: "blocked", blockedReasons: ["snapshot_not_record"] };
  }

  if (snapshot.version !== SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION) {
    blockedReasons.push("version_invalid");
  }

  if (!approvalIsValid(snapshot.approval)) {
    blockedReasons.push("approval_invalid");
  }

  if (!isNonBlankString(snapshot.providerAllowlistSnapshotHash) || !isNonBlankString(snapshot.configSnapshotHash)) {
    blockedReasons.push("snapshot_hash_invalid");
  }

  if (!Array.isArray(snapshot.allowedProviders) || snapshot.allowedProviders.length === 0) {
    blockedReasons.push("allowed_provider_empty");
  }

  const allowedProviderIds = Array.isArray(snapshot.allowedProviders)
    ? snapshot.allowedProviders.map((entry) => entry.providerId)
    : [];
  const disabledProviderIds = Array.isArray(snapshot.disabledProviders)
    ? snapshot.disabledProviders.map((entry) => entry.providerId)
    : [];
  if (!valuesAreUnique([...allowedProviderIds, ...disabledProviderIds])) {
    blockedReasons.push("provider_id_duplicate");
  }

  for (const entry of Array.isArray(snapshot.allowedProviders) ? snapshot.allowedProviders : []) {
    if (
      !isRecord(entry)
      || !isCanonicalProviderId(entry.providerId)
      || typeof entry.endpointKind !== "string"
      || !["test_injected_candidate_boundary", "candidate_search_api_future"].includes(entry.endpointKind)
      || !positiveInteger(entry.maxQueries)
      || !positiveInteger(entry.timeoutMs)
      || typeof entry.credentialsState !== "string"
      || !["not_required_for_test_boundary", "present_without_secret"].includes(entry.credentialsState)
    ) {
      blockedReasons.push("allowed_provider_invalid");
      break;
    }
  }

  for (const entry of Array.isArray(snapshot.disabledProviders) ? snapshot.disabledProviders : []) {
    if (
      !isRecord(entry)
      || !isCanonicalProviderId(entry.providerId)
      || typeof entry.disabledReason !== "string"
      || !["credentials_missing", "disabled_by_policy", "not_approved_for_7n3b1"].includes(entry.disabledReason)
    ) {
      blockedReasons.push("disabled_provider_invalid");
      break;
    }
  }

  if (
    snapshot.noCache !== true
    || snapshot.noStorage !== true
    || snapshot.noSourceReliability !== true
    || snapshot.noProduct !== true
    || snapshot.noPublic !== true
  ) {
    blockedReasons.push("boundary_flags_invalid");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function validateSourceAcquisitionCandidateBudgetSnapshot(
  snapshot: SourceAcquisitionCandidateBudgetSnapshot,
): SourceAcquisitionCandidateValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(snapshot)) {
    return { status: "blocked", blockedReasons: ["snapshot_not_record"] };
  }

  if (snapshot.version !== SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION || snapshot.source !== "v2_7n3b1_candidate_runtime") {
    blockedReasons.push("version_or_source_invalid");
  }

  if (!approvalIsValid(snapshot.approval)) {
    blockedReasons.push("approval_invalid");
  }

  if (!isNonBlankString(snapshot.budgetSnapshotHash)) {
    blockedReasons.push("budget_hash_invalid");
  }

  if (
    !isRecord(snapshot.handoffIdentity)
    || !stringListIsClean(snapshot.handoffIdentity.selectedAtomicClaimIds)
    || !stringListIsClean(snapshot.handoffIdentity.queryIds)
    || snapshot.handoffIdentity.queryEntryCount !== snapshot.handoffIdentity.queryIds.length
    || !isNonBlankString(snapshot.handoffIdentity.promptContentHash)
    || !isNonBlankString(snapshot.handoffIdentity.renderedPromptHash)
    || !isNonBlankString(snapshot.handoffIdentity.modelPolicyId)
    || !isNonBlankString(snapshot.handoffIdentity.cacheNamespace)
    || !isNonBlankString(snapshot.handoffIdentity.cacheReason)
    || snapshot.handoffIdentity.cacheCanRead !== false
    || snapshot.handoffIdentity.cacheCanWrite !== false
  ) {
    blockedReasons.push("handoff_identity_invalid");
  }

  if (
    !isRecord(snapshot.sourceRequestIdentity)
    || !stringListIsClean(snapshot.sourceRequestIdentity.selectedAtomicClaimIds)
    || !isNonBlankString(snapshot.sourceRequestIdentity.requestVersion)
    || !isNonBlankString(snapshot.sourceRequestIdentity.runId)
    || !isNonBlankString(snapshot.sourceRequestIdentity.currentDate)
    || !isNonBlankString(snapshot.sourceRequestIdentity.detectedLanguage)
  ) {
    blockedReasons.push("source_request_identity_invalid");
  }

  if (
    !positiveInteger(snapshot.queryEntryCount)
    || snapshot.queryEntryCount !== snapshot.handoffIdentity?.queryEntryCount
    || snapshot.maxAttemptsPerQuery !== 1
    || !nonNegativeInteger(snapshot.maxCandidateRecordsPerQuery)
    || !positiveInteger(snapshot.providerTimeoutMs)
    || !positiveInteger(snapshot.totalCandidateAcquisitionTimeoutMs)
    || snapshot.retryPolicy !== "none"
    || snapshot.partialExecutionSemantics !== "structural_query_outcome_per_query"
  ) {
    blockedReasons.push("budget_limits_invalid");
  }

  if (!["not_requested", "requested"].includes(snapshot.cancellationState)) {
    blockedReasons.push("cancellation_state_invalid");
  }
  if (snapshot.cancellationState === "requested") {
    blockedReasons.push("cancellation_requested");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

function candidateIdIsOpaque(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value.startsWith("OPAQUE_SOURCE_CANDIDATE_")
    && /^[A-Z0-9_]+$/.test(value);
}

function hiddenLocatorIdIsOpaque(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value.startsWith("HIDDEN_SOURCE_LOCATOR_")
    && /^[A-Z0-9_]+$/.test(value);
}

function providerAttemptIdIsOpaque(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && /^ATT_[0-9]+$/.test(value);
}

function metadataIsStructural(value: unknown): value is SourceAcquisitionHiddenCandidateRecord["hiddenMetadata"] {
  return isRecord(value)
    && Object.keys(value).length === 5
    && value.semanticUse === "not_semantic_evidence"
    && value.titleState === "not_collected"
    && value.snippetState === "not_collected"
    && value.domainState === "not_collected"
    && value.languageState === "not_collected";
}

function candidateRecordIsValid(
  candidate: SourceAcquisitionHiddenCandidateRecord,
  expected: {
    queryId: string;
    retrievalPolicyKey: string;
    providerId: string;
    providerAttemptId: string;
  },
): boolean {
  return isRecord(candidate)
    && Object.keys(candidate).sort().join("|") === [
      "candidateId",
      "candidateStructuralStatus",
      "hiddenLocatorId",
      "hiddenMetadata",
      "providerAttemptId",
      "providerId",
      "providerRank",
      "queryId",
      "retrievalPolicyKey",
    ].sort().join("|")
    && candidateIdIsOpaque(candidate.candidateId)
    && candidate.queryId === expected.queryId
    && candidate.retrievalPolicyKey === expected.retrievalPolicyKey
    && candidate.providerId === expected.providerId
    && providerAttemptIdIsOpaque(candidate.providerAttemptId)
    && candidate.providerAttemptId === expected.providerAttemptId
    && Number.isInteger(candidate.providerRank)
    && candidate.providerRank >= 1
    && hiddenLocatorIdIsOpaque(candidate.hiddenLocatorId)
    && metadataIsStructural(candidate.hiddenMetadata)
    && candidate.candidateStructuralStatus === "candidate_acquired";
}

export function sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage(
  decision: SourceAcquisitionCandidateRuntimeDecision,
  expectedQueryIds: readonly string[],
): boolean {
  const actualQueryIds = decision.queryOutcomes.map((outcome) => outcome.queryId);
  return actualQueryIds.length === expectedQueryIds.length
    && actualQueryIds.every((queryId, index) => queryId === expectedQueryIds[index])
    && valuesAreUnique(actualQueryIds);
}

export function validateSourceAcquisitionCandidateProviderAttemptResult(
  result: SourceAcquisitionCandidateProviderAttemptResult,
  expected: {
    readonly queryId: string;
    readonly retrievalPolicyKey: string;
    readonly allowedProviderIds: readonly string[];
    readonly maxCandidateRecords: number;
  },
): SourceAcquisitionCandidateValidationResult {
  const blockedReasons: string[] = [];

  if (
    !isRecord(result)
    || Object.keys(result).sort().join("|") !== [
      "candidates",
      "durationMs",
      "providerAttemptId",
      "providerId",
      "queryId",
      "sanitizedProviderTelemetry",
      "structuralStatus",
    ].sort().join("|")
  ) {
    return { status: "blocked", blockedReasons: ["provider_result_shape_invalid"] };
  }

  if (
    result.queryId !== expected.queryId
    || !isCanonicalProviderId(result.providerId)
    || !expected.allowedProviderIds.includes(result.providerId)
    || !providerAttemptIdIsOpaque(result.providerAttemptId)
  ) {
    blockedReasons.push("provider_identity_invalid");
  }

  if (
    !["success", "provider_failure", "search_failure", "rate_limited", "timed_out", "cancelled"].includes(
      result.structuralStatus,
    )
    || !nonNegativeInteger(result.durationMs)
  ) {
    blockedReasons.push("provider_status_invalid");
  }

  if (
    !isRecord(result.sanitizedProviderTelemetry)
    || Object.keys(result.sanitizedProviderTelemetry).sort().join("|") !== [
      "publicPayloadIncluded",
      "rawPayloadIncluded",
      "secretIncluded",
    ].join("|")
    || result.sanitizedProviderTelemetry.rawPayloadIncluded !== false
    || result.sanitizedProviderTelemetry.secretIncluded !== false
    || result.sanitizedProviderTelemetry.publicPayloadIncluded !== false
  ) {
    blockedReasons.push("provider_telemetry_invalid");
  }

  if (!Array.isArray(result.candidates) || result.candidates.length > expected.maxCandidateRecords) {
    blockedReasons.push("candidate_count_invalid");
  }
  if (result.structuralStatus !== "success" && Array.isArray(result.candidates) && result.candidates.length > 0) {
    blockedReasons.push("non_success_candidates_invalid");
  }

  for (const candidate of Array.isArray(result.candidates) ? result.candidates : []) {
    if (
      !candidateRecordIsValid(candidate, {
        queryId: expected.queryId,
        retrievalPolicyKey: expected.retrievalPolicyKey,
        providerId: result.providerId,
        providerAttemptId: result.providerAttemptId,
      })
    ) {
      blockedReasons.push("candidate_record_invalid");
      break;
    }
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}
