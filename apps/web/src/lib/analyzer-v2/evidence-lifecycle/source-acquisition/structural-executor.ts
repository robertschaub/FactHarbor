import { isNonBlankString, isRecord } from "@/lib/analyzer-v2/util";
import {
  readStaticSourceAcquisitionStructuralOutcomeKinds,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract";
import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
  QueryPlanSourceAcquisitionHandoffQueryEntry,
} from "./query-plan-handoff";
import {
  SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY,
  SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION,
  type OpaqueSourceContentPacketPointer,
  type SourceAcquisitionControlledHarnessAuthority,
  type SourceAcquisitionExecutionAttempt,
  type SourceAcquisitionExecutionBudgetSnapshot,
  type SourceAcquisitionExecutionDecision,
  type SourceAcquisitionExecutionRequest,
  type SourceAcquisitionExecutorStopReason,
  type SourceAcquisitionHandoffIdentitySnapshot,
  type SourceAcquisitionPortAttemptRequest,
  type SourceAcquisitionPortAttemptResult,
} from "./execution-contract";
import type { SourceAcquisitionRequest, SourceAcquisitionStartDecision } from "./types";

type BlockedStopReason = Exclude<SourceAcquisitionExecutorStopReason, "not_stopped">;

function blocked(executorStopReason: BlockedStopReason): SourceAcquisitionExecutionDecision {
  return {
    version: SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION,
    visibility: "internal_only",
    status: "blocked",
    executorStopReason,
    attempts: [],
  };
}

function damaged(
  executorStopReason: BlockedStopReason,
  attempts: readonly SourceAcquisitionExecutionAttempt[] = [],
): SourceAcquisitionExecutionDecision {
  return {
    version: SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION,
    visibility: "internal_only",
    status: "damaged_structural",
    executorStopReason,
    attempts,
  };
}

function completed(
  attempts: readonly SourceAcquisitionExecutionAttempt[],
): SourceAcquisitionExecutionDecision {
  return {
    version: SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION,
    visibility: "internal_only",
    status: "completed_structural",
    executorStopReason: "not_stopped",
    attempts,
  };
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stringListIsClean(values: readonly string[]): boolean {
  return values.length > 0
    && values.every((value) => isNonBlankString(value) && value === value.trim())
    && new Set(values).size === values.length;
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

function promptProvenanceIsPresent(
  promptProvenance: QueryPlanSourceAcquisitionHandoff["promptProvenance"],
): boolean {
  return isRecord(promptProvenance)
    && isNonBlankString(promptProvenance.promptContentHash)
    && isNonBlankString(promptProvenance.renderedPromptHash);
}

function readReadyHandoff(
  decision: QueryPlanSourceAcquisitionHandoffDecision,
): QueryPlanSourceAcquisitionHandoff | BlockedStopReason {
  if (
    !isRecord(decision)
    || decision.visibility !== "internal_only"
    || decision.status !== "ready_not_executable"
    || !isRecord(decision.handoff)
  ) {
    return "handoff_not_ready";
  }

  const handoff = decision.handoff as QueryPlanSourceAcquisitionHandoff;
  if (
    handoff.visibility !== "internal_only"
    || handoff.executionScope !== "not_executable"
    || handoff.sourceAcquisitionStatus !== "ready_not_executable"
    || !stringListIsClean(handoff.selectedAtomicClaimIds)
    || !queryEntriesAreClean(handoff)
  ) {
    return "handoff_not_ready";
  }

  if (!promptProvenanceIsPresent(handoff.promptProvenance) || !isNonBlankString(handoff.modelPolicyId)) {
    return "provenance_missing";
  }

  if (!cacheProvenanceIsNoStoreNoRead(handoff.cacheProvenance)) {
    return "cache_provenance_invalid";
  }

  return handoff;
}

function readReadySourceRequest(
  decision: SourceAcquisitionStartDecision,
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionRequest | BlockedStopReason {
  if (
    !isRecord(decision)
    || decision.visibility !== "internal_only"
    || decision.status !== "source_acquisition_ready_not_executable"
    || !isRecord(decision.request)
  ) {
    return "source_request_invalid";
  }

  const request = decision.request as SourceAcquisitionRequest;
  if (
    request.visibility !== "internal_only"
    || request.executionScope !== "contract_only_no_provider_execution"
    || request.sourceAcquisitionStatus !== "ready_not_executable"
    || !isRecord(request.intake)
    || !arraysEqual(request.intake.selectedAtomicClaimIds, handoff.selectedAtomicClaimIds)
  ) {
    return "source_request_invalid";
  }

  return request;
}

export function buildSourceAcquisitionHandoffIdentitySnapshot(
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionHandoffIdentitySnapshot {
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

export function buildSourceAcquisitionStructuralExecutionBudget(
  handoff: QueryPlanSourceAcquisitionHandoff,
  overrides: Partial<SourceAcquisitionExecutionBudgetSnapshot> = {},
): SourceAcquisitionExecutionBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION,
    source: "static_7n2_controlled_harness",
    handoffVersion: handoff.handoffVersion,
    handoffIdentity: buildSourceAcquisitionHandoffIdentitySnapshot(handoff),
    maxQueryEntries: handoff.queryEntries.length,
    maxAttemptsPerQuery: 1,
    maxCandidateRecordsPerQuery: 10,
    timeoutMs: 30000,
    retryPolicy: "none",
    cancellationState: "not_requested",
    maxContentPacketPointersPerQuery: 10,
    ...overrides,
  };
}

function budgetIsValid(
  budget: SourceAcquisitionExecutionBudgetSnapshot,
  handoff: QueryPlanSourceAcquisitionHandoff,
): BlockedStopReason | null {
  if (
    !isRecord(budget)
    || budget.version !== SOURCE_ACQUISITION_STRUCTURAL_EXECUTION_VERSION
    || budget.source !== "static_7n2_controlled_harness"
    || budget.handoffVersion !== handoff.handoffVersion
    || !isRecord(budget.handoffIdentity)
    || !Number.isInteger(budget.maxQueryEntries)
    || !Number.isInteger(budget.maxAttemptsPerQuery)
    || !Number.isInteger(budget.maxCandidateRecordsPerQuery)
    || !Number.isInteger(budget.timeoutMs)
    || !Number.isInteger(budget.maxContentPacketPointersPerQuery)
    || budget.maxQueryEntries < handoff.queryEntries.length
    || budget.maxAttemptsPerQuery !== 1
    || budget.maxCandidateRecordsPerQuery < 0
    || budget.timeoutMs <= 0
    || budget.retryPolicy !== "none"
    || budget.maxContentPacketPointersPerQuery < 0
  ) {
    return "budget_invalid";
  }

  if (budget.cancellationState === "requested") {
    return "budget_cancelled";
  }

  if (budget.cancellationState !== "not_requested") {
    return "budget_invalid";
  }

  if (!sameJson(budget.handoffIdentity, buildSourceAcquisitionHandoffIdentitySnapshot(handoff))) {
    return "budget_stale";
  }

  return null;
}

function authorityIsControlledHarness(
  authority: SourceAcquisitionControlledHarnessAuthority,
): boolean {
  return sameJson(authority, SOURCE_ACQUISITION_CONTROLLED_HARNESS_AUTHORITY);
}

function contentPacketPointerIsOpaque(pointer: OpaqueSourceContentPacketPointer): boolean {
  return isRecord(pointer)
    && isNonBlankString(pointer.contentPacketPointerId)
    && pointer.contentPacketPointerId === pointer.contentPacketPointerId.trim()
    && pointer.nonDurable === true
    && pointer.dereferenceableByStructuralCore === false
    && pointer.rawContentIncluded === false
    && !("rawContent" in pointer)
    && !("content" in pointer)
    && !("text" in pointer)
    && !("url" in pointer)
    && !("domain" in pointer)
    && !("title" in pointer)
    && !("locator" in pointer)
    && !("storageAuthority" in pointer);
}

function portResultIsStructurallyValid(
  result: SourceAcquisitionPortAttemptResult,
): boolean {
  const approvedOutcomeKinds = new Set(readStaticSourceAcquisitionStructuralOutcomeKinds());
  return isRecord(result)
    && isNonBlankString(result.attemptId)
    && result.attemptId === result.attemptId.trim()
    && approvedOutcomeKinds.has(result.outcomeKind)
    && Number.isInteger(result.durationMs)
    && result.durationMs >= 0
    && Array.isArray(result.candidateIds)
    && result.candidateIds.every((candidateId) =>
      isNonBlankString(candidateId) && candidateId === candidateId.trim()
    )
    && Array.isArray(result.contentPacketPointers)
    && result.contentPacketPointers.every(contentPacketPointerIsOpaque);
}

function buildPortRequest(params: {
  executionId: string;
  handoff: QueryPlanSourceAcquisitionHandoff;
  queryEntry: QueryPlanSourceAcquisitionHandoffQueryEntry;
  budget: SourceAcquisitionExecutionBudgetSnapshot;
}): SourceAcquisitionPortAttemptRequest {
  return {
    executionId: params.executionId,
    queryId: params.queryEntry.queryId,
    retrievalPolicyKey: params.queryEntry.retrievalPolicyKey,
    queryText: params.queryEntry.queryText,
    targetAtomicClaimIds: [...params.queryEntry.targetAtomicClaimIds],
    timeoutMs: params.budget.timeoutMs,
    maxCandidateRecords: params.budget.maxCandidateRecordsPerQuery,
    maxContentPacketPointers: params.budget.maxContentPacketPointersPerQuery,
    sourceLanguagePolicy: params.handoff.sourceLanguagePolicy,
    supplementaryLanguageRationale: params.handoff.sourceLanguagePolicy.rationale,
  };
}

function buildAttempt(params: {
  executionId: string;
  queryEntry: QueryPlanSourceAcquisitionHandoffQueryEntry;
  result: SourceAcquisitionPortAttemptResult;
  executorStopReason: SourceAcquisitionExecutorStopReason;
}): SourceAcquisitionExecutionAttempt {
  return {
    executionId: params.executionId,
    queryId: params.queryEntry.queryId,
    retrievalPolicyKey: params.queryEntry.retrievalPolicyKey,
    targetAtomicClaimIds: [...params.queryEntry.targetAtomicClaimIds],
    attemptId: params.result.attemptId,
    outcomeKind: params.result.outcomeKind,
    executorStopReason: params.executorStopReason,
    durationMs: params.result.durationMs,
    candidateCount: params.result.candidateIds.length,
    contentPacketPointerCount: params.result.contentPacketPointers.length,
    opaqueCandidateIds: [...params.result.candidateIds],
    opaqueContentPacketPointers: [...params.result.contentPacketPointers],
    structuralSuccessIsAcquisitionStatusOnly: true,
  };
}

export async function executeSourceAcquisitionStructuralExecutor(
  request: SourceAcquisitionExecutionRequest,
): Promise<SourceAcquisitionExecutionDecision> {
  if (!isRecord(request) || request.visibility !== "internal_only" || !isNonBlankString(request.executionId)) {
    return blocked("handoff_not_ready");
  }

  const handoff = readReadyHandoff(request.handoffDecision);
  if (typeof handoff === "string") {
    return blocked(handoff);
  }

  const sourceRequest = readReadySourceRequest(request.sourceAcquisitionStartDecision, handoff);
  if (typeof sourceRequest === "string") {
    return blocked(sourceRequest);
  }
  void sourceRequest;

  const budgetProblem = budgetIsValid(request.budget, handoff);
  if (budgetProblem) {
    return blocked(budgetProblem);
  }

  if (
    !isRecord(request.port)
    || !isRecord(request.port.authority)
    || !authorityIsControlledHarness(request.port.authority)
  ) {
    return blocked("controlled_harness_authority_invalid");
  }

  const attempts: SourceAcquisitionExecutionAttempt[] = [];
  for (const queryEntry of handoff.queryEntries) {
    let portResult: SourceAcquisitionPortAttemptResult;
    try {
      portResult = await request.port.acquire(
        buildPortRequest({
          executionId: request.executionId,
          handoff,
          queryEntry,
          budget: request.budget,
        }),
      );
    } catch {
      return damaged("partial_execution", attempts);
    }

    if (!portResultIsStructurallyValid(portResult)) {
      return damaged("port_result_invalid", attempts);
    }

    if (portResult.durationMs > request.budget.timeoutMs) {
      return damaged("port_timeout", attempts);
    }

    if (portResult.candidateIds.length > request.budget.maxCandidateRecordsPerQuery) {
      return damaged("port_candidate_cap_exceeded", attempts);
    }

    if (portResult.contentPacketPointers.length > request.budget.maxContentPacketPointersPerQuery) {
      return damaged("port_content_packet_cap_exceeded", attempts);
    }

    attempts.push(buildAttempt({
      executionId: request.executionId,
      queryEntry,
      result: portResult,
      executorStopReason: "not_stopped",
    }));
  }

  return completed(attempts);
}
