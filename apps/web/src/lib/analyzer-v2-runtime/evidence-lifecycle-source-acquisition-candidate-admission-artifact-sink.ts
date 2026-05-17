import type {
  SourceAcquisitionCandidateRuntimeAdmissionBlockedReason,
  SourceAcquisitionCandidateRuntimeAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-acquisition-candidate-admission-artifact.x7w1a";
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_SERIALIZED_BYTES = 16_384;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_source_acquisition_intake";
  readonly candidateRuntimeAdmission: {
    readonly admissionVersion: SourceAcquisitionCandidateRuntimeAdmissionDecision["admissionVersion"];
    readonly status: SourceAcquisitionCandidateRuntimeAdmissionDecision["status"];
    readonly blockedReason: SourceAcquisitionCandidateRuntimeAdmissionBlockedReason | null;
    readonly handoffStatus: SourceAcquisitionCandidateRuntimeAdmissionDecision["handoffStatus"];
    readonly requestStatus: SourceAcquisitionCandidateRuntimeAdmissionDecision["requestStatus"];
    readonly intakeStatus: SourceAcquisitionCandidateRuntimeAdmissionDecision["intakeStatus"];
    readonly admissionScope: SourceAcquisitionCandidateRuntimeAdmissionDecision["admissionScope"];
    readonly selectedAtomicClaimCount: number;
    readonly queryEntryCount: number;
    readonly retrievalPolicyCount: number;
    readonly sourceLanguageSignal: SourceAcquisitionCandidateRuntimeAdmissionDecision["sourceLanguageSignal"];
    readonly admissionAuthoritySnapshotHash: string | null;
    readonly providerAllowlistSnapshotHash: string | null;
    readonly candidateBudgetSnapshotHash: string | null;
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: true;
    readonly sourceAcquisitionIntakeObserved: true;
    readonly candidateRuntimeAdmissionObserved: true;
    readonly candidateRuntimeExecuted: false;
    readonly candidateProviderInvoked: false;
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
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly publicSurfaceWritten: false;
    readonly providerAttemptCount: 0;
    readonly candidateCount: 0;
    readonly totalCandidateCount: 0;
    readonly bytesRead: 0;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly admissionDecision: SourceAcquisitionCandidateRuntimeAdmissionDecision;
};

export type EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact;
  }
  | {
    readonly status: "skipped_invalid_ledger_id";
    readonly artifact: null;
  };

type EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_COUNT) {
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
  artifact: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact,
): EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactProjection,
): EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact {
  const admission = projection.admissionDecision;
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_source_acquisition_intake",
    candidateRuntimeAdmission: {
      admissionVersion: admission.admissionVersion,
      status: admission.status,
      blockedReason: admission.blockedReason,
      handoffStatus: admission.handoffStatus,
      requestStatus: admission.requestStatus,
      intakeStatus: admission.intakeStatus,
      admissionScope: admission.admissionScope,
      selectedAtomicClaimCount: admission.selectedAtomicClaimCount,
      queryEntryCount: admission.queryEntryCount,
      retrievalPolicyCount: admission.retrievalPolicyCount,
      sourceLanguageSignal: admission.sourceLanguageSignal,
      admissionAuthoritySnapshotHash: admission.admissionAuthoritySnapshotHash,
      providerAllowlistSnapshotHash: admission.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: admission.candidateBudgetSnapshotHash,
    },
    productExecution: {
      queryPlanningRuntimeInvoked: true,
      sourceAcquisitionIntakeObserved: true,
      candidateRuntimeAdmissionObserved: true,
      candidateRuntimeExecuted: false,
      candidateProviderInvoked: false,
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
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
      providerAttemptCount: 0,
      candidateCount: 0,
      totalCandidateCount: 0,
      bytesRead: 0,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactProjection,
): EvidenceLifecycleSourceAcquisitionCandidateAdmissionArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact(projection);
  if (
    serializedByteLength(artifact)
    > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_ADMISSION_ARTIFACT_MAX_SERIALIZED_BYTES
  ) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
