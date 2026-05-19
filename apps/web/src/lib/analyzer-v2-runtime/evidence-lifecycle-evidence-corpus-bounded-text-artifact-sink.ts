import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision,
} from "./evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner";
import type {
  EvidenceCorpusBoundedTextSidecar,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-bounded-text-artifact.x7w4g";
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_SERIALIZED_BYTES = 32_768;
export const EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleEvidenceCorpusBoundedTextProductExecution = {
  readonly boundedCorpusTextAuthorized: boolean;
  readonly boundedTextSidecarCreated: boolean;
  readonly sourceMaterialRuntimeOwned: boolean;
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

export type EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_evidence_corpus_bounded_text_authorization";
  readonly boundedTextAuthorization: EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision;
  readonly productExecution: EvidenceLifecycleEvidenceCorpusBoundedTextProductExecution;
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleEvidenceCorpusBoundedTextArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly boundedTextAuthorization: EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision;
};

export type EvidenceLifecycleEvidenceCorpusBoundedTextArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

export type EvidenceCorpusBoundedTextSidecarDefaultProjection =
  Omit<EvidenceCorpusBoundedTextSidecar, "text"> & {
    readonly textAccess: "redacted_default_hash_length_provenance_only";
    readonly textReturned: false;
  };

export type EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDefaultProjection =
  Omit<EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision, "boundedTextSidecar"> & {
    readonly boundedTextSidecar: EvidenceCorpusBoundedTextSidecarDefaultProjection | null;
  };

export type EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifactDefaultProjection =
  Omit<EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact, "boundedTextAuthorization"> & {
    readonly boundedTextAuthorization: EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDefaultProjection;
  };

type EvidenceLifecycleEvidenceCorpusBoundedTextArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleEvidenceCorpusBoundedTextArtifactLedgers?:
    Map<string, EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[]>;
};

function runtimeArtifactLedgers():
  Map<string, EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleEvidenceCorpusBoundedTextArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleEvidenceCorpusBoundedTextArtifactLedgers ??=
    new Map<string, EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleEvidenceCorpusBoundedTextArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_LEDGER_COUNT) {
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

function serializedByteLength(artifact: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[],
  artifact: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneJson(artifact));
}

function productExecution(
  projection: EvidenceLifecycleEvidenceCorpusBoundedTextArtifactProjection,
): EvidenceLifecycleEvidenceCorpusBoundedTextProductExecution {
  return {
    boundedCorpusTextAuthorized:
      projection.boundedTextAuthorization.productExecution.boundedCorpusTextAuthorized,
    boundedTextSidecarCreated:
      projection.boundedTextAuthorization.productExecution.boundedTextSidecarCreated,
    sourceMaterialRuntimeOwned:
      projection.boundedTextAuthorization.productExecution.sourceMaterialRuntimeOwned,
    corpusAdmissionObserved:
      projection.boundedTextAuthorization.productExecution.corpusAdmissionObserved,
    evidenceCorpusShellObserved:
      projection.boundedTextAuthorization.productExecution.evidenceCorpusShellObserved,
    extractionReadinessDenialObserved:
      projection.boundedTextAuthorization.productExecution.extractionReadinessDenialObserved,
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

export function buildEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact(
  projection: EvidenceLifecycleEvidenceCorpusBoundedTextArtifactProjection,
): EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_evidence_corpus_bounded_text_authorization",
    boundedTextAuthorization: cloneJson(projection.boundedTextAuthorization),
    productExecution: productExecution(projection),
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact(
  projection: EvidenceLifecycleEvidenceCorpusBoundedTextArtifactProjection,
): EvidenceLifecycleEvidenceCorpusBoundedTextArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact(projection);
  if (
    serializedByteLength(artifact) >
    EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_MAX_SERIALIZED_BYTES
  ) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function redactEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact(
  artifact: EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact,
): EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifactDefaultProjection {
  const authorization = artifact.boundedTextAuthorization;
  const sidecar = authorization.boundedTextSidecar;
  const redactedSidecar: EvidenceCorpusBoundedTextSidecarDefaultProjection | null = sidecar
    ? {
        sidecarVersion: sidecar.sidecarVersion,
        boundedTextSidecarId: sidecar.boundedTextSidecarId,
        kind: sidecar.kind,
        visibility: sidecar.visibility,
        publicPointerExposure: sidecar.publicPointerExposure,
        linkedEvidenceCorpusId: sidecar.linkedEvidenceCorpusId,
        linkedEvidenceCorpusShellVersion: sidecar.linkedEvidenceCorpusShellVersion,
        sourceMaterialRef: sidecar.sourceMaterialRef,
        locatorRef: sidecar.locatorRef,
        candidatePreviewId: sidecar.candidatePreviewId,
        providerId: sidecar.providerId,
        sourceMaterialEndpointId: sidecar.sourceMaterialEndpointId,
        sourceMaterialKind: sidecar.sourceMaterialKind,
        languageCode: sidecar.languageCode,
        textKind: sidecar.textKind,
        textHash: sidecar.textHash,
        textByteLength: sidecar.textByteLength,
        textCharLength: sidecar.textCharLength,
        maxTextBytes: sidecar.maxTextBytes,
        truncationApplied: sidecar.truncationApplied,
        sourceMaterialRecordVersion: sidecar.sourceMaterialRecordVersion,
        sourceMaterialTextHash: sidecar.sourceMaterialTextHash,
        sourceMaterialTextByteLength: sidecar.sourceMaterialTextByteLength,
        sourceMaterialTextCharLength: sidecar.sourceMaterialTextCharLength,
        sourceMaterialRuntimeOwned: sidecar.sourceMaterialRuntimeOwned,
        admissionDecisionVersion: sidecar.admissionDecisionVersion,
        shellDecisionVersion: sidecar.shellDecisionVersion,
        extractionDenialDecisionVersion: sidecar.extractionDenialDecisionVersion,
        extractionDenialStatus: sidecar.extractionDenialStatus,
        corpusTextAccess: sidecar.corpusTextAccess,
        preservesShellOnlyCorpus: sidecar.preservesShellOnlyCorpus,
        mutatesShellCorpus: sidecar.mutatesShellCorpus,
        mutatesExtractionDenial: sidecar.mutatesExtractionDenial,
        semanticExtractionAuthorized: sidecar.semanticExtractionAuthorized,
        evidenceItemExtractionAuthorized: sidecar.evidenceItemExtractionAuthorized,
        extractionInput: sidecar.extractionInput,
        evidenceItems: sidecar.evidenceItems,
        downstreamExecution: sidecar.downstreamExecution,
        textAccess: "redacted_default_hash_length_provenance_only",
        textReturned: false,
      }
    : null;

  return cloneJson({
    ...artifact,
    boundedTextAuthorization: {
      ...authorization,
      boundedTextSidecar: redactedSidecar,
    },
  });
}

export function readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneJson);
}

export function readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly EvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifactDefaultProjection[] {
  return readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(ledgerId)
    .map(redactEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact);
}

export function clearEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
