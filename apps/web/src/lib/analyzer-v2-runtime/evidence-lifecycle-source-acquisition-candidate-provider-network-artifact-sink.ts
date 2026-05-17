import type {
  SourceAcquisitionCandidateProviderNetworkBlockedReason,
  SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord,
  SourceAcquisitionCandidateProviderNetworkDamagedReason,
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
  SourceAcquisitionCandidateProviderNetworkQuerySummary,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-acquisition-candidate-provider-network-artifact.x7w2";
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_SERIALIZED_BYTES = 24_576;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact = {
  readonly artifactVersion:
    typeof EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_candidate_provider_network_loop";
  readonly candidateProviderNetwork: {
    readonly networkLoopVersion: SourceAcquisitionCandidateProviderNetworkLoopDecision["networkLoopVersion"];
    readonly status: SourceAcquisitionCandidateProviderNetworkLoopDecision["status"];
    readonly blockedReason: SourceAcquisitionCandidateProviderNetworkBlockedReason | null;
    readonly damagedReason: SourceAcquisitionCandidateProviderNetworkDamagedReason | null;
    readonly closedLoopStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["closedLoopStatus"];
    readonly handoffStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["handoffStatus"];
    readonly requestStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["requestStatus"];
    readonly intakeStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["intakeStatus"];
    readonly selectedAtomicClaimCount: number;
    readonly queryEntryCount: number;
    readonly retrievalPolicyCount: number;
    readonly sourceLanguageSignal: SourceAcquisitionCandidateProviderNetworkLoopDecision["sourceLanguageSignal"];
    readonly productNetworkAuthorityHash: string | null;
    readonly runtimeContractAuthorityHash: string | null;
    readonly endpointSnapshotHash: string | null;
    readonly networkBudgetSnapshotHash: string | null;
    readonly providerAllowlistSnapshotHash: string | null;
    readonly candidateBudgetSnapshotHash: string | null;
    readonly runtimeStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["runtimeStatus"];
    readonly queryOutcomeSummaries: readonly SourceAcquisitionCandidateProviderNetworkQuerySummary[];
    readonly downstreamGate: "candidate_to_source_material_gate_closed";
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: true;
    readonly sourceAcquisitionIntakeObserved: true;
    readonly candidateRuntimeAdmissionObserved: true;
    readonly candidateRuntimeClosedLoopObserved: true;
    readonly candidateProviderNetworkObserved: true;
    readonly candidateRuntimeExecuted: boolean;
    readonly candidateProviderBoundaryInvoked: boolean;
    readonly providerNetworkBoundaryInvoked: boolean;
    readonly providerNetworkExecuted: boolean;
    readonly searchFetchCalled: boolean;
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
    readonly networkAttemptCount: number;
    readonly candidateCount: number;
    readonly totalCandidateCount: number;
    readonly structurallyDroppedCandidateCount: number;
    readonly totalDurationMs: number;
    readonly totalCompressedBytes: number;
    readonly totalDecompressedBytes: number;
    readonly totalBytes: number;
    readonly fixedDollarCost: 0;
    readonly costReason: "no_paid_api_no_credentials";
    readonly networkAttempts: readonly SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord[];
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly networkDecision: SourceAcquisitionCandidateProviderNetworkLoopDecision;
};

export type EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact;
  }
  | {
    readonly status: "skipped_invalid_ledger_id";
    readonly artifact: null;
  };

type EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[]>;
};

function runtimeArtifactLedgers():
  Map<string, EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactLedgers;
}

function recordsForLedger(
  ledgerId: string,
): EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_COUNT) {
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
  artifact: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
): EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact):
  number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length
      <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactProjection,
): EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact {
  const decision = projection.networkDecision;
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_candidate_provider_network_loop",
    candidateProviderNetwork: {
      networkLoopVersion: decision.networkLoopVersion,
      status: decision.status,
      blockedReason: decision.blockedReason,
      damagedReason: decision.damagedReason,
      closedLoopStatus: decision.closedLoopStatus,
      handoffStatus: decision.handoffStatus,
      requestStatus: decision.requestStatus,
      intakeStatus: decision.intakeStatus,
      selectedAtomicClaimCount: decision.selectedAtomicClaimCount,
      queryEntryCount: decision.queryEntryCount,
      retrievalPolicyCount: decision.retrievalPolicyCount,
      sourceLanguageSignal: decision.sourceLanguageSignal,
      productNetworkAuthorityHash: decision.productNetworkAuthorityHash,
      runtimeContractAuthorityHash: decision.runtimeContractAuthorityHash,
      endpointSnapshotHash: decision.endpointSnapshotHash,
      networkBudgetSnapshotHash: decision.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: decision.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: decision.candidateBudgetSnapshotHash,
      runtimeStatus: decision.runtimeStatus,
      queryOutcomeSummaries: decision.queryOutcomeSummaries.map((summary) => ({ ...summary })),
      downstreamGate: decision.downstreamGate,
    },
    productExecution: {
      queryPlanningRuntimeInvoked: true,
      sourceAcquisitionIntakeObserved: true,
      candidateRuntimeAdmissionObserved: true,
      candidateRuntimeClosedLoopObserved: true,
      candidateProviderNetworkObserved: true,
      candidateRuntimeExecuted: decision.telemetry.candidateRuntimeExercised,
      candidateProviderBoundaryInvoked: decision.telemetry.candidateProviderBoundaryInvoked,
      providerNetworkBoundaryInvoked: decision.telemetry.providerNetworkBoundaryInvoked,
      providerNetworkExecuted: decision.telemetry.providerNetworkExecuted,
      searchFetchCalled: decision.telemetry.searchFetchCalled,
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
      providerAttemptCount: decision.telemetry.providerAttemptCount,
      networkAttemptCount: decision.telemetry.networkAttemptCount,
      candidateCount: decision.telemetry.candidateCount,
      totalCandidateCount: decision.telemetry.totalCandidateCount,
      structurallyDroppedCandidateCount: decision.telemetry.structurallyDroppedCandidateCount,
      totalDurationMs: decision.telemetry.totalDurationMs,
      totalCompressedBytes: decision.telemetry.totalCompressedBytes,
      totalDecompressedBytes: decision.telemetry.totalDecompressedBytes,
      totalBytes: decision.telemetry.totalBytes,
      fixedDollarCost: 0,
      costReason: "no_paid_api_no_credentials",
      networkAttempts: decision.telemetry.networkAttempts.map((attempt) => ({ ...attempt })),
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactProjection,
): EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact(projection);
  if (
    serializedByteLength(artifact)
    > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_MAX_SERIALIZED_BYTES
  ) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
