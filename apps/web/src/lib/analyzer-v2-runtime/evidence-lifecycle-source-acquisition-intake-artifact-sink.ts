import type {
  SourceAcquisitionIntakeBoundaryBlockedReason,
  SourceAcquisitionIntakeBoundaryDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-acquisition-intake-artifact.x7v";
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_SERIALIZED_BYTES = 16_384;
export const EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_query_planning_source_acquisition_handoff";
  readonly sourceAcquisitionIntake: {
    readonly boundaryVersion: SourceAcquisitionIntakeBoundaryDecision["boundaryVersion"];
    readonly status: SourceAcquisitionIntakeBoundaryDecision["status"];
    readonly blockedReason: SourceAcquisitionIntakeBoundaryBlockedReason | null;
    readonly handoffStatus: SourceAcquisitionIntakeBoundaryDecision["handoffStatus"];
    readonly requestStatus: SourceAcquisitionIntakeBoundaryDecision["requestStatus"];
    readonly executionScope: SourceAcquisitionIntakeBoundaryDecision["executionScope"];
    readonly selectedAtomicClaimCount: number;
    readonly queryEntryCount: number;
    readonly retrievalPolicyCount: number;
    readonly sourceLanguageSignal: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: true;
    readonly sourceAcquisitionIntakeObserved: true;
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
    readonly publicSurfaceWritten: false;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleSourceAcquisitionIntakeArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly intakeBoundary: SourceAcquisitionIntakeBoundaryDecision;
};

export type EvidenceLifecycleSourceAcquisitionIntakeArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact;
  }
  | {
    readonly status: "skipped_invalid_ledger_id";
    readonly artifact: null;
  };

type EvidenceLifecycleSourceAcquisitionIntakeArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceAcquisitionIntakeArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceAcquisitionIntakeArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionIntakeArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceAcquisitionIntakeArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_COUNT) {
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
  artifact: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
): EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact {
  return freezeDeep(JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact);
}

function serializedByteLength(artifact: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionIntakeArtifactProjection,
): EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact {
  const boundary = projection.intakeBoundary;
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_query_planning_source_acquisition_handoff",
    sourceAcquisitionIntake: {
      boundaryVersion: boundary.boundaryVersion,
      status: boundary.status,
      blockedReason: boundary.blockedReason,
      handoffStatus: boundary.handoffStatus,
      requestStatus: boundary.requestStatus,
      executionScope: boundary.executionScope,
      selectedAtomicClaimCount: boundary.selectedAtomicClaimCount,
      queryEntryCount: boundary.queryEntryCount,
      retrievalPolicyCount: boundary.retrievalPolicyCount,
      sourceLanguageSignal: boundary.sourceLanguageSignal,
    },
    productExecution: {
      queryPlanningRuntimeInvoked: true,
      sourceAcquisitionIntakeObserved: true,
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
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact(
  projection: EvidenceLifecycleSourceAcquisitionIntakeArtifactProjection,
): EvidenceLifecycleSourceAcquisitionIntakeArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact(projection);
  if (serializedByteLength(artifact) > EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
