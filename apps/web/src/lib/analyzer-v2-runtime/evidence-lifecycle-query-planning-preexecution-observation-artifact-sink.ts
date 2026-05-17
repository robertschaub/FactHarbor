import type {
  EvidenceQueryPlanningPreexecutionObservation,
  EvidenceQueryPlanningPreexecutionObservationBlockedReason,
  EvidenceQueryPlanningPreexecutionObservationStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";

export const EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION =
  "v2.evidence-query-planning.preexecution-observation-artifact.x7o";
export const EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_SERIALIZED_BYTES = 16_384;
export const EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceQueryPlanningPreexecutionObservationArtifactProjection = {
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly observation: EvidenceQueryPlanningPreexecutionObservation;
};

export type EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_evidence_lifecycle_intake";
  readonly preexecutionObservation: {
    readonly observationVersion: EvidenceQueryPlanningPreexecutionObservation["observationVersion"];
    readonly status: EvidenceQueryPlanningPreexecutionObservationStatus;
    readonly blockedReason: EvidenceQueryPlanningPreexecutionObservationBlockedReason | null;
    readonly sourceIntakeStatus: EvidenceQueryPlanningPreexecutionObservation["sourceIntakeStatus"];
    readonly inputScope: EvidenceQueryPlanningPreexecutionObservation["inputScope"];
    readonly selectedAtomicClaimCount: number;
    readonly sourceLanguageSignal: EvidenceQueryPlanningPreexecutionObservation["sourceLanguageSignal"];
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: false;
    readonly promptLoaded: false;
    readonly promptRendered: false;
    readonly modelCalled: false;
    readonly providerCallbackCreated: false;
    readonly providerSearchFetchCalled: false;
    readonly sourceAcquisitionExecuted: false;
    readonly parserExecuted: false;
    readonly evidenceCorpusCreated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceQueryPlanningPreexecutionObservationArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact;
  }
  | {
    readonly status: "skipped_invalid_ledger_id";
    readonly artifact: null;
  };

type EvidenceQueryPlanningPreexecutionObservationArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceQueryPlanningPreexecutionObservationArtifactLedgers?:
    Map<string, EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceQueryPlanningPreexecutionObservationArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceQueryPlanningPreexecutionObservationArtifactLedgers ??=
    new Map<string, EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceQueryPlanningPreexecutionObservationArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_COUNT) {
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
  artifact: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
): EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[],
  artifact: EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact(
  projection: EvidenceQueryPlanningPreexecutionObservationArtifactProjection,
): EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.ledgerId,
    runId: projection.runId,
    createdUtc: projection.createdUtc,
    source: "product_v2_orchestrator_after_evidence_lifecycle_intake",
    preexecutionObservation: {
      observationVersion: projection.observation.observationVersion,
      status: projection.observation.status,
      blockedReason: projection.observation.blockedReason,
      sourceIntakeStatus: projection.observation.sourceIntakeStatus,
      inputScope: projection.observation.inputScope,
      selectedAtomicClaimCount: projection.observation.selectedAtomicClaimCount,
      sourceLanguageSignal: projection.observation.sourceLanguageSignal,
    },
    productExecution: {
      queryPlanningRuntimeInvoked: false,
      promptLoaded: false,
      promptRendered: false,
      modelCalled: false,
      providerCallbackCreated: false,
      providerSearchFetchCalled: false,
      sourceAcquisitionExecuted: false,
      parserExecuted: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact(
  projection: EvidenceQueryPlanningPreexecutionObservationArtifactProjection,
): EvidenceQueryPlanningPreexecutionObservationArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact(projection);
  if (serializedByteLength(artifact) > EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
