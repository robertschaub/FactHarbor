import {
  isSourceAcquisitionRuntimeAuthority,
  readSourceAcquisitionRuntimeAuthoritySnapshot,
  type SourceAcquisitionRuntimeAuthority,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import {
  QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION,
  type QueryPlanSourceAcquisitionHandoff,
  type QueryPlanSourceAcquisitionHandoffDecision,
  type QueryPlanSourceAcquisitionHandoffQueryEntry,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import {
  SOURCE_ACQUISITION_REQUEST_VERSION,
  type SourceAcquisitionRequest,
  type SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import {
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
  sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage,
  validateSourceAcquisitionCandidateBudgetSnapshot,
  validateSourceAcquisitionCandidateProviderAllowlistSnapshot,
  validateSourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionCandidateBudgetSnapshot,
  type SourceAcquisitionCandidateProviderAllowlistSnapshot,
  type SourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionCandidateQueryOutcome,
  type SourceAcquisitionCandidateRunRequest,
  type SourceAcquisitionCandidateRuntimeApproval,
  type SourceAcquisitionCandidateRuntimeDecision,
  type SourceAcquisitionCandidateRuntimeStopReason,
  type SourceAcquisitionHiddenCandidateRecord,
} from "./source-acquisition-candidate-envelope";

export const SOURCE_ACQUISITION_CANDIDATE_RUNTIME_AUTHORITY_VERSION =
  "v2.source-acquisition.candidate-runtime-authority.7n3b1";

export type SourceAcquisitionCandidateRuntimeAuthoritySnapshot = {
  readonly kind: "source_acquisition_candidate_runtime_authority_7n3b1";
  readonly source: "v2_7n3b1_candidate_runtime_source_package";
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_AUTHORITY_VERSION;
  readonly packagePath: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT;
  readonly approval: SourceAcquisitionCandidateRuntimeApproval;
  readonly visibility: "internal_only";
  readonly parentAuthoritySnapshot: SourceAcquisitionRuntimeAuthoritySnapshot;
  readonly configSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly budgetSnapshotHash: string;
  readonly executionState: "hidden_candidate_runtime_shell_only";
  readonly capabilityScope: {
    readonly candidateProviderBoundary: "injected_boundary_only";
    readonly concreteProviderIo: false;
    readonly providerSdk: false;
    readonly directNetwork: false;
    readonly contentDereference: false;
    readonly parser: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly durableStorage: false;
    readonly sourceReliability: false;
    readonly productRuntime: false;
    readonly publicExposure: false;
    readonly liveJobs: false;
    readonly acsPreparedSnapshot: false;
    readonly directUrl: false;
    readonly semanticInterpretation: false;
  };
};

declare const sourceAcquisitionCandidateRuntimeAuthorityBrand: unique symbol;

export type SourceAcquisitionCandidateRuntimeAuthority =
  Readonly<SourceAcquisitionCandidateRuntimeAuthoritySnapshot> & {
    readonly [sourceAcquisitionCandidateRuntimeAuthorityBrand]:
      "source_acquisition_candidate_runtime_authority";
  };

const candidateRuntimeAuthorities = new WeakSet<object>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function stringListIsClean(values: readonly string[]): boolean {
  return values.length > 0
    && values.every((value) => isNonBlankString(value) && value === value.trim())
    && new Set(values).size === values.length;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function approval(): SourceAcquisitionCandidateRuntimeApproval {
  return {
    status: "approved_7n3b1_candidate_runtime",
    approvedBy: "deputy_review_team",
    packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
    approvedScope: "hidden_candidate_runtime_shell_only",
  };
}

function approvalIsValid(value: SourceAcquisitionCandidateRuntimeApproval): boolean {
  return isRecord(value)
    && hasExactKeys(value, [
      "approvedBy",
      "approvedScope",
      "packageCommit",
      "packagePath",
      "status",
    ])
    && value.status === "approved_7n3b1_candidate_runtime"
    && value.approvedBy === "deputy_review_team"
    && value.packagePath === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH
    && value.packageCommit === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT
    && value.approvedScope === "hidden_candidate_runtime_shell_only";
}

function hashValueIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && !["placeholder", "todo", "unknown"].includes(value.trim().toLowerCase());
}

function capabilityScopeIsValid(
  value: SourceAcquisitionCandidateRuntimeAuthoritySnapshot["capabilityScope"],
): boolean {
  return isRecord(value)
    && hasExactKeys(value, [
      "acsPreparedSnapshot",
      "cacheRead",
      "cacheWrite",
      "candidateProviderBoundary",
      "concreteProviderIo",
      "contentDereference",
      "directNetwork",
      "directUrl",
      "durableStorage",
      "liveJobs",
      "parser",
      "productRuntime",
      "providerSdk",
      "publicExposure",
      "semanticInterpretation",
      "sourceReliability",
    ])
    && value.candidateProviderBoundary === "injected_boundary_only"
    && value.concreteProviderIo === false
    && value.providerSdk === false
    && value.directNetwork === false
    && value.contentDereference === false
    && value.parser === false
    && value.cacheRead === false
    && value.cacheWrite === false
    && value.durableStorage === false
    && value.sourceReliability === false
    && value.productRuntime === false
    && value.publicExposure === false
    && value.liveJobs === false
    && value.acsPreparedSnapshot === false
    && value.directUrl === false
    && value.semanticInterpretation === false;
}

function candidateAuthoritySnapshotIsValid(
  snapshot: SourceAcquisitionCandidateRuntimeAuthoritySnapshot,
): boolean {
  return isRecord(snapshot)
    && hasExactKeys(snapshot, [
      "approval",
      "authorityVersion",
      "budgetSnapshotHash",
      "capabilityScope",
      "configSnapshotHash",
      "executionState",
      "kind",
      "packageCommit",
      "packagePath",
      "parentAuthoritySnapshot",
      "providerAllowlistSnapshotHash",
      "source",
      "visibility",
    ])
    && snapshot.kind === "source_acquisition_candidate_runtime_authority_7n3b1"
    && snapshot.source === "v2_7n3b1_candidate_runtime_source_package"
    && snapshot.authorityVersion === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_AUTHORITY_VERSION
    && snapshot.packagePath === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH
    && snapshot.packageCommit === SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT
    && approvalIsValid(snapshot.approval)
    && snapshot.visibility === "internal_only"
    && isRecord(snapshot.parentAuthoritySnapshot)
    && snapshot.parentAuthoritySnapshot.kind === "source_acquisition_runtime_authority_7n3a"
    && snapshot.parentAuthoritySnapshot.futureGate === "requires_7n3b_concrete_io_gate"
    && hashValueIsValid(snapshot.configSnapshotHash)
    && hashValueIsValid(snapshot.providerAllowlistSnapshotHash)
    && hashValueIsValid(snapshot.budgetSnapshotHash)
    && snapshot.executionState === "hidden_candidate_runtime_shell_only"
    && capabilityScopeIsValid(snapshot.capabilityScope);
}

export function createSourceAcquisitionCandidateRuntimeAuthority(params: {
  readonly parentAuthority: SourceAcquisitionRuntimeAuthority;
  readonly configSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly budgetSnapshotHash: string;
}): SourceAcquisitionCandidateRuntimeAuthority {
  if (!isSourceAcquisitionRuntimeAuthority(params.parentAuthority)) {
    throw new Error("Invalid V2 source-acquisition parent runtime authority.");
  }

  const parentAuthoritySnapshot = readSourceAcquisitionRuntimeAuthoritySnapshot(params.parentAuthority);
  const snapshot: SourceAcquisitionCandidateRuntimeAuthoritySnapshot = {
    kind: "source_acquisition_candidate_runtime_authority_7n3b1",
    source: "v2_7n3b1_candidate_runtime_source_package",
    authorityVersion: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_AUTHORITY_VERSION,
    packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
    approval: approval(),
    visibility: "internal_only",
    parentAuthoritySnapshot,
    configSnapshotHash: params.configSnapshotHash,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash,
    budgetSnapshotHash: params.budgetSnapshotHash,
    executionState: "hidden_candidate_runtime_shell_only",
    capabilityScope: {
      candidateProviderBoundary: "injected_boundary_only",
      concreteProviderIo: false,
      providerSdk: false,
      directNetwork: false,
      contentDereference: false,
      parser: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      semanticInterpretation: false,
    },
  };

  if (!candidateAuthoritySnapshotIsValid(snapshot)) {
    throw new Error("Invalid V2 source-acquisition candidate runtime authority snapshot.");
  }

  const authority = {
    ...snapshot,
    approval: Object.freeze({ ...snapshot.approval }),
    parentAuthoritySnapshot: Object.freeze({
      ...snapshot.parentAuthoritySnapshot,
      approval: Object.freeze({ ...snapshot.parentAuthoritySnapshot.approval }),
      configSnapshot: Object.freeze({ ...snapshot.parentAuthoritySnapshot.configSnapshot }),
      capabilityScope: Object.freeze({ ...snapshot.parentAuthoritySnapshot.capabilityScope }),
    }),
    capabilityScope: Object.freeze({ ...snapshot.capabilityScope }),
  };

  Object.freeze(authority);
  candidateRuntimeAuthorities.add(authority);
  return authority as SourceAcquisitionCandidateRuntimeAuthority;
}

export function isSourceAcquisitionCandidateRuntimeAuthority(
  value: unknown,
): value is SourceAcquisitionCandidateRuntimeAuthority {
  return isRecord(value)
    && candidateRuntimeAuthorities.has(value)
    && candidateAuthoritySnapshotIsValid(value as SourceAcquisitionCandidateRuntimeAuthoritySnapshot);
}

export function readSourceAcquisitionCandidateRuntimeAuthoritySnapshot(
  authority: SourceAcquisitionCandidateRuntimeAuthority,
): SourceAcquisitionCandidateRuntimeAuthoritySnapshot {
  if (!isSourceAcquisitionCandidateRuntimeAuthority(authority)) {
    throw new Error("Source-acquisition candidate runtime authority was not created by the runtime owner.");
  }

  return {
    kind: authority.kind,
    source: authority.source,
    authorityVersion: authority.authorityVersion,
    packagePath: authority.packagePath,
    packageCommit: authority.packageCommit,
    approval: { ...authority.approval },
    visibility: authority.visibility,
    parentAuthoritySnapshot: {
      ...authority.parentAuthoritySnapshot,
      approval: { ...authority.parentAuthoritySnapshot.approval },
      configSnapshot: { ...authority.parentAuthoritySnapshot.configSnapshot },
      capabilityScope: { ...authority.parentAuthoritySnapshot.capabilityScope },
    },
    configSnapshotHash: authority.configSnapshotHash,
    providerAllowlistSnapshotHash: authority.providerAllowlistSnapshotHash,
    budgetSnapshotHash: authority.budgetSnapshotHash,
    executionState: authority.executionState,
    capabilityScope: { ...authority.capabilityScope },
  };
}

type BlockedStopReason = Exclude<SourceAcquisitionCandidateRuntimeStopReason, "not_stopped">;

function blocked(
  stopReason: BlockedStopReason,
  queryOutcomes: readonly SourceAcquisitionCandidateQueryOutcome[] = [],
): SourceAcquisitionCandidateRuntimeDecision {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    visibility: "internal_only",
    status: "blocked",
    stopReason,
    queryOutcomes,
    candidates: [],
  };
}

function damaged(params: {
  readonly stopReason: BlockedStopReason;
  readonly queryOutcomes: readonly SourceAcquisitionCandidateQueryOutcome[];
  readonly candidates: readonly SourceAcquisitionHiddenCandidateRecord[];
}): SourceAcquisitionCandidateRuntimeDecision {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    visibility: "internal_only",
    status: "damaged_structural",
    stopReason: params.stopReason,
    queryOutcomes: params.queryOutcomes,
    candidates: params.candidates,
  };
}

function completed(params: {
  readonly queryOutcomes: readonly SourceAcquisitionCandidateQueryOutcome[];
  readonly candidates: readonly SourceAcquisitionHiddenCandidateRecord[];
}): SourceAcquisitionCandidateRuntimeDecision {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    visibility: "internal_only",
    status: "completed_structural",
    stopReason: "not_stopped",
    queryOutcomes: params.queryOutcomes,
    candidates: params.candidates,
  };
}

function blockedOutcomes(
  handoff: QueryPlanSourceAcquisitionHandoff,
  stopReason: BlockedStopReason,
  status: SourceAcquisitionCandidateQueryOutcome["status"] = "blocked",
): SourceAcquisitionCandidateQueryOutcome[] {
  return handoff.queryEntries.map((queryEntry) => ({
    queryId: queryEntry.queryId,
    status,
    structuralReason: stopReason,
    providerAttemptId: null,
    candidateCount: 0,
  }));
}

function skippedOutcomes(
  queryEntries: readonly QueryPlanSourceAcquisitionHandoffQueryEntry[],
  stopReason: BlockedStopReason,
): SourceAcquisitionCandidateQueryOutcome[] {
  return queryEntries.map((queryEntry) => ({
    queryId: queryEntry.queryId,
    status: "skipped_with_structural_reason",
    structuralReason: stopReason,
    providerAttemptId: null,
    candidateCount: 0,
  }));
}

function selectedSetContainsTargets(
  selectedAtomicClaimIds: readonly string[],
  targetAtomicClaimIds: readonly string[],
): boolean {
  const selectedIds = new Set(selectedAtomicClaimIds);
  return targetAtomicClaimIds.length > 0
    && targetAtomicClaimIds.every((claimId) => selectedIds.has(claimId));
}

function queryEntriesAreClean(
  handoff: QueryPlanSourceAcquisitionHandoff,
): boolean {
  const queryIds = handoff.queryEntries.map((queryEntry) => queryEntry.queryId);
  return handoff.queryEntries.length > 0
    && stringListIsClean(queryIds)
    && handoff.queryEntries.every((queryEntry) =>
      isNonBlankString(queryEntry.queryId)
      && queryEntry.queryId === queryEntry.queryId.trim()
      && isNonBlankString(queryEntry.retrievalPolicyKey)
      && queryEntry.retrievalPolicyKey === queryEntry.retrievalPolicyKey.trim()
      && isNonBlankString(queryEntry.queryText)
      && selectedSetContainsTargets(
        handoff.selectedAtomicClaimIds,
        queryEntry.targetAtomicClaimIds,
      )
    );
}

function sourceLanguagePolicyIsStructural(
  value: QueryPlanSourceAcquisitionHandoff["sourceLanguagePolicy"],
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const decision = value.supplementaryLanguageDecision;
  return isNonBlankString(value.primaryLanguage)
    && isNonBlankString(value.rationale)
    && (
      decision === "not_needed"
      || decision === "needed"
      || decision === "deferred"
      || decision === "blocked_not_executable"
    );
}

function cacheProvenanceIsNoStoreNoRead(
  cacheProvenance: QueryPlanSourceAcquisitionHandoff["cacheProvenance"],
): boolean {
  return isRecord(cacheProvenance)
    && isNonBlankString(cacheProvenance.namespace)
    && isNonBlankString(cacheProvenance.reason)
    && cacheProvenance.canRead === false
    && cacheProvenance.canWrite === false
    && !("keyParts" in cacheProvenance)
    && !("cacheKey" in cacheProvenance)
    && !("storageAuthority" in cacheProvenance);
}

function readReadyHandoff(
  decision: QueryPlanSourceAcquisitionHandoffDecision,
): QueryPlanSourceAcquisitionHandoff | "handoff_not_ready" {
  if (
    !isRecord(decision)
    || decision.decisionVersion !== QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION
    || decision.visibility !== "internal_only"
    || decision.status !== "ready_not_executable"
    || !isRecord(decision.handoff)
  ) {
    return "handoff_not_ready";
  }

  const handoff = decision.handoff as QueryPlanSourceAcquisitionHandoff;
  if (
    handoff.handoffVersion !== QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION
    || handoff.visibility !== "internal_only"
    || handoff.executionScope !== "not_executable"
    || handoff.sourceAcquisitionStatus !== "ready_not_executable"
    || !stringListIsClean(handoff.selectedAtomicClaimIds)
    || !queryEntriesAreClean(handoff)
    || !sourceLanguagePolicyIsStructural(handoff.sourceLanguagePolicy)
    || !isRecord(handoff.promptProvenance)
    || !isNonBlankString(handoff.promptProvenance.promptContentHash)
    || !isNonBlankString(handoff.promptProvenance.renderedPromptHash)
    || !isNonBlankString(handoff.modelPolicyId)
    || !cacheProvenanceIsNoStoreNoRead(handoff.cacheProvenance)
  ) {
    return "handoff_not_ready";
  }

  return handoff;
}

function readReadySourceRequest(
  decision: SourceAcquisitionStartDecision,
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionRequest | "source_request_invalid" {
  if (
    !isRecord(decision)
    || decision.decisionVersion !== SOURCE_ACQUISITION_REQUEST_VERSION
    || decision.visibility !== "internal_only"
    || decision.status !== "source_acquisition_ready_not_executable"
    || !isRecord(decision.request)
  ) {
    return "source_request_invalid";
  }

  const request = decision.request as SourceAcquisitionRequest;
  if (
    request.requestVersion !== SOURCE_ACQUISITION_REQUEST_VERSION
    || request.visibility !== "internal_only"
    || request.executionScope !== "contract_only_no_provider_execution"
    || request.sourceAcquisitionStatus !== "ready_not_executable"
    || !isRecord(request.intake)
    || !sameJson(request.intake.selectedAtomicClaimIds, handoff.selectedAtomicClaimIds)
  ) {
    return "source_request_invalid";
  }

  return request;
}

function buildHandoffIdentity(
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionCandidateBudgetSnapshot["handoffIdentity"] {
  return {
    handoffVersion: handoff.handoffVersion,
    selectedAtomicClaimIds: [...handoff.selectedAtomicClaimIds],
    queryIds: handoff.queryEntries.map((queryEntry) => queryEntry.queryId),
    queryEntryCount: handoff.queryEntries.length,
    promptContentHash: handoff.promptProvenance.promptContentHash,
    renderedPromptHash: handoff.promptProvenance.renderedPromptHash,
    modelPolicyId: handoff.modelPolicyId,
    cacheNamespace: handoff.cacheProvenance.namespace,
    cacheReason: handoff.cacheProvenance.reason,
    cacheCanRead: false,
    cacheCanWrite: false,
    sourceLanguagePolicy: handoff.sourceLanguagePolicy,
  };
}

function buildSourceRequestIdentity(
  request: SourceAcquisitionRequest,
): SourceAcquisitionCandidateBudgetSnapshot["sourceRequestIdentity"] {
  return {
    requestVersion: request.requestVersion,
    selectedAtomicClaimIds: [...request.intake.selectedAtomicClaimIds],
    runId: request.intake.runId,
    currentDate: request.intake.currentDate,
    detectedLanguage: request.intake.detectedLanguage,
  };
}

function readValidAuthority(
  authority: unknown,
  providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot,
  budget: SourceAcquisitionCandidateBudgetSnapshot,
): SourceAcquisitionCandidateRuntimeAuthority | null {
  if (!isSourceAcquisitionCandidateRuntimeAuthority(authority)) {
    return null;
  }

  const snapshot = readSourceAcquisitionCandidateRuntimeAuthoritySnapshot(authority);
  return snapshot.configSnapshotHash === providerAllowlist.configSnapshotHash
    && snapshot.providerAllowlistSnapshotHash === providerAllowlist.providerAllowlistSnapshotHash
    && snapshot.budgetSnapshotHash === budget.budgetSnapshotHash
    ? authority
    : null;
}

function budgetMatches(
  budget: SourceAcquisitionCandidateBudgetSnapshot,
  handoff: QueryPlanSourceAcquisitionHandoff,
  sourceRequest: SourceAcquisitionRequest,
): "ok" | "budget_invalid" | "budget_stale" | "cancellation_requested" {
  if (isRecord(budget) && budget.cancellationState === "requested") {
    return "cancellation_requested";
  }

  const validation = validateSourceAcquisitionCandidateBudgetSnapshot(budget);
  if (validation.status !== "valid") {
    return "budget_invalid";
  }

  if (
    !sameJson(budget.handoffIdentity, buildHandoffIdentity(handoff))
    || !sameJson(budget.sourceRequestIdentity, buildSourceRequestIdentity(sourceRequest))
    || budget.queryEntryCount !== handoff.queryEntries.length
  ) {
    return "budget_stale";
  }

  if (budget.providerTimeoutMs * budget.queryEntryCount > budget.totalCandidateAcquisitionTimeoutMs) {
    return "budget_invalid";
  }

  return "ok";
}

function allowlistSupportsBudget(
  providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot,
  budget: SourceAcquisitionCandidateBudgetSnapshot,
): boolean {
  return providerAllowlist.allowedProviders.every((provider) =>
    provider.maxQueries >= budget.queryEntryCount
    && provider.timeoutMs >= budget.providerTimeoutMs
  );
}

function attemptRequest(params: {
  readonly candidateRunId: string;
  readonly queryEntry: QueryPlanSourceAcquisitionHandoffQueryEntry;
  readonly handoff: QueryPlanSourceAcquisitionHandoff;
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly budget: SourceAcquisitionCandidateBudgetSnapshot;
}): Parameters<SourceAcquisitionCandidateRunRequest["providerBoundary"]["acquireCandidates"]>[0] {
  return {
    candidateRunId: params.candidateRunId,
    queryId: params.queryEntry.queryId,
    retrievalPolicyKey: params.queryEntry.retrievalPolicyKey,
    queryText: params.queryEntry.queryText,
    targetAtomicClaimIds: [...params.queryEntry.targetAtomicClaimIds],
    sourceLanguagePolicy: params.handoff.sourceLanguagePolicy,
    allowedProviderIds: params.providerAllowlist.allowedProviders.map((provider) => provider.providerId),
    timeoutMs: params.budget.providerTimeoutMs,
    maxCandidateRecords: params.budget.maxCandidateRecordsPerQuery,
  };
}

function outcomeFromProviderResult(
  result: SourceAcquisitionCandidateProviderAttemptResult,
): Pick<SourceAcquisitionCandidateQueryOutcome, "status" | "structuralReason"> {
  switch (result.structuralStatus) {
    case "success":
      return { status: "attempted", structuralReason: "not_stopped" };
    case "timed_out":
      return { status: "timed_out", structuralReason: "provider_timeout" };
    case "cancelled":
      return { status: "cancelled", structuralReason: "provider_cancelled" };
    case "provider_failure":
    case "search_failure":
    case "rate_limited":
      return { status: "failed", structuralReason: "provider_failure" };
  }
}

export async function executeSourceAcquisitionCandidateRuntime(
  request: SourceAcquisitionCandidateRunRequest,
): Promise<SourceAcquisitionCandidateRuntimeDecision> {
  if (
    !isRecord(request)
    || request.visibility !== "internal_only"
    || !isNonBlankString(request.candidateRunId)
    || !isRecord(request.providerBoundary)
    || typeof request.providerBoundary.acquireCandidates !== "function"
  ) {
    return blocked("run_request_invalid");
  }

  const handoff = readReadyHandoff(request.handoffDecision as QueryPlanSourceAcquisitionHandoffDecision);
  if (handoff === "handoff_not_ready") {
    return blocked("handoff_not_ready");
  }

  const sourceRequest = readReadySourceRequest(
    request.sourceAcquisitionStartDecision as SourceAcquisitionStartDecision,
    handoff,
  );
  if (sourceRequest === "source_request_invalid") {
    return blocked("source_request_invalid", blockedOutcomes(handoff, "source_request_invalid"));
  }

  const allowlistValidation = validateSourceAcquisitionCandidateProviderAllowlistSnapshot(request.providerAllowlist);
  if (allowlistValidation.status !== "valid") {
    return blocked("provider_allowlist_invalid", blockedOutcomes(handoff, "provider_allowlist_invalid"));
  }

  const budgetState = budgetMatches(request.budget, handoff, sourceRequest);
  if (budgetState !== "ok") {
    const outcomeStatus = budgetState === "cancellation_requested" ? "cancelled" : "blocked";
    return blocked(budgetState, blockedOutcomes(handoff, budgetState, outcomeStatus));
  }

  if (!allowlistSupportsBudget(request.providerAllowlist, request.budget)) {
    return blocked("provider_allowlist_invalid", blockedOutcomes(handoff, "provider_allowlist_invalid"));
  }

  const authority = readValidAuthority(request.authority, request.providerAllowlist, request.budget);
  if (!authority) {
    return blocked("authority_invalid", blockedOutcomes(handoff, "authority_invalid"));
  }
  void authority;

  const queryOutcomes: SourceAcquisitionCandidateQueryOutcome[] = [];
  const candidates: SourceAcquisitionHiddenCandidateRecord[] = [];

  for (const queryEntry of handoff.queryEntries) {
    let providerResult: SourceAcquisitionCandidateProviderAttemptResult;
    try {
      providerResult = await request.providerBoundary.acquireCandidates(
        attemptRequest({
          candidateRunId: request.candidateRunId,
          queryEntry,
          handoff,
          providerAllowlist: request.providerAllowlist,
          budget: request.budget,
        }),
      );
    } catch {
      queryOutcomes.push({
        queryId: queryEntry.queryId,
        status: "failed",
        structuralReason: "provider_failure",
        providerAttemptId: null,
        candidateCount: 0,
      });
      continue;
    }

    const validation = validateSourceAcquisitionCandidateProviderAttemptResult(providerResult, {
      queryId: queryEntry.queryId,
      retrievalPolicyKey: queryEntry.retrievalPolicyKey,
      allowedProviderIds: request.providerAllowlist.allowedProviders.map((provider) => provider.providerId),
      maxCandidateRecords: request.budget.maxCandidateRecordsPerQuery,
    });
    if (validation.status !== "valid") {
      const partialOutcomes = [
        ...queryOutcomes,
        {
          queryId: queryEntry.queryId,
          status: "failed" as const,
          structuralReason: "provider_result_invalid" as const,
          providerAttemptId: null,
          candidateCount: 0,
        },
        ...skippedOutcomes(
          handoff.queryEntries.slice(queryOutcomes.length + 1),
          "provider_result_invalid",
        ),
      ];
      return damaged({
        stopReason: "provider_result_invalid",
        queryOutcomes: partialOutcomes,
        candidates,
      });
    }

    if (providerResult.durationMs > request.budget.providerTimeoutMs) {
      queryOutcomes.push({
        queryId: queryEntry.queryId,
        status: "timed_out",
        structuralReason: "provider_timeout",
        providerAttemptId: providerResult.providerAttemptId,
        candidateCount: 0,
      });
      continue;
    }

    const outcomeState = outcomeFromProviderResult(providerResult);
    queryOutcomes.push({
      queryId: queryEntry.queryId,
      status: outcomeState.status,
      structuralReason: outcomeState.structuralReason,
      providerAttemptId: providerResult.providerAttemptId,
      candidateCount: providerResult.candidates.length,
    });
    candidates.push(...providerResult.candidates);
  }

  const decision = completed({ queryOutcomes, candidates });
  if (!sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage(
    decision,
    handoff.queryEntries.map((queryEntry) => queryEntry.queryId),
  )) {
    return damaged({
      stopReason: "partial_execution",
      queryOutcomes: [
        ...queryOutcomes,
        ...skippedOutcomes(
          handoff.queryEntries.slice(queryOutcomes.length),
          "partial_execution",
        ),
      ],
      candidates,
    });
  }

  return decision;
}
