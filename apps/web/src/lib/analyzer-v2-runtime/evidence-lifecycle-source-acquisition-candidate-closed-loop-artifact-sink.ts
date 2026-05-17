import type {
  SourceAcquisitionCandidateRuntimeClosedLoopBlockedReason,
  SourceAcquisitionCandidateRuntimeClosedLoopDamagedReason,
  SourceAcquisitionCandidateRuntimeClosedLoopDecision,
  SourceAcquisitionCandidateRuntimeClosedLoopQuerySummary,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-acquisition-candidate-closed-loop-artifact.x7w1b";
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_SERIALIZED_BYTES = 16_384;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_candidate_runtime_admission";
  readonly candidateRuntimeClosedLoop: {
    readonly closedLoopVersion: SourceAcquisitionCandidateRuntimeClosedLoopDecision["closedLoopVersion"];
    readonly status: SourceAcquisitionCandidateRuntimeClosedLoopDecision["status"];
    readonly blockedReason: SourceAcquisitionCandidateRuntimeClosedLoopBlockedReason | null;
    readonly damagedReason: SourceAcquisitionCandidateRuntimeClosedLoopDamagedReason | null;
    readonly admissionStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["admissionStatus"];
    readonly handoffStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["handoffStatus"];
    readonly requestStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["requestStatus"];
    readonly intakeStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["intakeStatus"];
    readonly selectedAtomicClaimCount: number;
    readonly queryEntryCount: number;
    readonly retrievalPolicyCount: number;
    readonly sourceLanguageSignal: SourceAcquisitionCandidateRuntimeClosedLoopDecision["sourceLanguageSignal"];
    readonly productClosedLoopAuthorityHash: string | null;
    readonly runtimeContractAuthorityHash: string | null;
    readonly providerAllowlistSnapshotHash: string | null;
    readonly candidateBudgetSnapshotHash: string | null;
    readonly runtimeStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["runtimeStatus"];
    readonly queryOutcomeSummaries: readonly SourceAcquisitionCandidateRuntimeClosedLoopQuerySummary[];
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: true;
    readonly sourceAcquisitionIntakeObserved: true;
    readonly candidateRuntimeAdmissionObserved: true;
    readonly candidateRuntimeClosedLoopObserved: true;
    readonly candidateRuntimeExecuted: boolean;
    readonly closedProviderBoundaryInvoked: boolean;
    readonly sourceAcquisitionExecuted: false;
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
    readonly providerAttemptCount: number;
    readonly candidateCount: 0;
    readonly totalCandidateCount: 0;
    readonly bytesRead: 0;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly closedLoopDecision: SourceAcquisitionCandidateRuntimeClosedLoopDecision;
};

export type EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact;
  }
  | {
    readonly status: "skipped_invalid_ledger_id";
    readonly artifact: null;
  };

type EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = ledgers.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    ledgers.delete(oldestLedgerId);
  }

  return records;
}

function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

function cloneArtifact(
  artifact: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact,
): EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactProjection,
): EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact {
  const closedLoop = projection.closedLoopDecision;
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_candidate_runtime_admission",
    candidateRuntimeClosedLoop: {
      closedLoopVersion: closedLoop.closedLoopVersion,
      status: closedLoop.status,
      blockedReason: closedLoop.blockedReason,
      damagedReason: closedLoop.damagedReason,
      admissionStatus: closedLoop.admissionStatus,
      handoffStatus: closedLoop.handoffStatus,
      requestStatus: closedLoop.requestStatus,
      intakeStatus: closedLoop.intakeStatus,
      selectedAtomicClaimCount: closedLoop.selectedAtomicClaimCount,
      queryEntryCount: closedLoop.queryEntryCount,
      retrievalPolicyCount: closedLoop.retrievalPolicyCount,
      sourceLanguageSignal: closedLoop.sourceLanguageSignal,
      productClosedLoopAuthorityHash: closedLoop.productClosedLoopAuthorityHash,
      runtimeContractAuthorityHash: closedLoop.runtimeContractAuthorityHash,
      providerAllowlistSnapshotHash: closedLoop.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: closedLoop.candidateBudgetSnapshotHash,
      runtimeStatus: closedLoop.runtimeStatus,
      queryOutcomeSummaries: closedLoop.queryOutcomeSummaries.map((summary) => ({ ...summary })),
    },
    productExecution: {
      queryPlanningRuntimeInvoked: true,
      sourceAcquisitionIntakeObserved: true,
      candidateRuntimeAdmissionObserved: true,
      candidateRuntimeClosedLoopObserved: true,
      candidateRuntimeExecuted: closedLoop.telemetry.candidateRuntimeExercised,
      closedProviderBoundaryInvoked: closedLoop.telemetry.closedProviderBoundaryInvoked,
      sourceAcquisitionExecuted: false,
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
      providerAttemptCount: closedLoop.telemetry.providerAttemptCount,
      candidateCount: 0,
      totalCandidateCount: 0,
      bytesRead: 0,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactProjection,
): EvidenceLifecycleSourceAcquisitionCandidateClosedLoopArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact(projection);
  if (
    serializedByteLength(artifact)
    > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_CLOSED_LOOP_ARTIFACT_MAX_SERIALIZED_BYTES
  ) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
