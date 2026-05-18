import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision,
} from "./evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner";
import type {
  EvidenceLifecycleEvidenceCorpusShellDecision,
} from "./evidence-lifecycle-evidence-corpus-shell-owner";
import type {
  EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision,
} from "./evidence-lifecycle-evidence-corpus-source-material-admission-owner";

export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-observability-artifact.x7w4f";
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_SERIALIZED_BYTES = 49_152;
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleEvidenceCorpusObservabilityProductExecution = {
  readonly sourceMaterialReadinessObserved: boolean;
  readonly corpusAdmissionObserved: boolean;
  readonly evidenceCorpusShellObserved: boolean;
  readonly extractionReadinessDenialObserved: boolean;
  readonly sourceTextAuthorized: false;
  readonly extractionInputCreated: false;
  readonly evidenceItemGenerated: false;
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly warningGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_evidence_corpus_extraction_readiness_denial";
  readonly evidenceCorpusSourceMaterialAdmission:
    EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision;
  readonly evidenceCorpusShell: EvidenceLifecycleEvidenceCorpusShellDecision;
  readonly evidenceCorpusExtractionReadinessDenial:
    EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision;
  readonly productExecution: EvidenceLifecycleEvidenceCorpusObservabilityProductExecution;
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleEvidenceCorpusObservabilityArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly sourceMaterialAdmission: EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision;
  readonly evidenceCorpusShell: EvidenceLifecycleEvidenceCorpusShellDecision;
  readonly extractionReadinessDenial: EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision;
};

export type EvidenceLifecycleEvidenceCorpusObservabilityArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type EvidenceLifecycleEvidenceCorpusObservabilityArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleEvidenceCorpusObservabilityArtifactLedgers?:
    Map<string, EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[]>;
};

function runtimeArtifactLedgers():
  Map<string, EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleEvidenceCorpusObservabilityArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleEvidenceCorpusObservabilityArtifactLedgers ??=
    new Map<string, EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleEvidenceCorpusObservabilityArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_COUNT) {
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

function cloneJson<T>(value: T): T {
  return freezeDeep(JSON.parse(JSON.stringify(value)) as T);
}

function serializedByteLength(artifact: EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[],
  artifact: EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneJson(artifact));
}

function productExecution(
  projection: EvidenceLifecycleEvidenceCorpusObservabilityArtifactProjection,
): EvidenceLifecycleEvidenceCorpusObservabilityProductExecution {
  return {
    sourceMaterialReadinessObserved:
      projection.sourceMaterialAdmission.productExecution.sourceMaterialReadinessObserved,
    corpusAdmissionObserved:
      projection.sourceMaterialAdmission.status === "source_material_admitted_to_corpus_input_gate_closed",
    evidenceCorpusShellObserved:
      projection.evidenceCorpusShell.status === "evidence_corpus_shell_created_extraction_gate_closed",
    extractionReadinessDenialObserved:
      projection.extractionReadinessDenial.status === "extraction_denied_shell_only",
    sourceTextAuthorized: false,
    extractionInputCreated: false,
    evidenceItemGenerated: false,
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityCalled: false,
    reportGenerated: false,
    verdictGenerated: false,
    warningGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
  };
}

export function buildEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact(
  projection: EvidenceLifecycleEvidenceCorpusObservabilityArtifactProjection,
): EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_evidence_corpus_extraction_readiness_denial",
    evidenceCorpusSourceMaterialAdmission: cloneJson(projection.sourceMaterialAdmission),
    evidenceCorpusShell: cloneJson(projection.evidenceCorpusShell),
    evidenceCorpusExtractionReadinessDenial: cloneJson(projection.extractionReadinessDenial),
    productExecution: productExecution(projection),
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact(
  projection: EvidenceLifecycleEvidenceCorpusObservabilityArtifactProjection,
): EvidenceLifecycleEvidenceCorpusObservabilityArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact(projection);
  if (
    serializedByteLength(artifact) >
    EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_SERIALIZED_BYTES
  ) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneJson);
}

export function clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
