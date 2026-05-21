import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleExtractionInputAuthorizationDecision,
} from "./evidence-lifecycle-extraction-input-authorization-owner";
import type {
  BoundedTextExtractionInputPacket,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";

export const EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.extraction-input-artifact.x7w4h";
export const EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_SERIALIZED_BYTES = 32_768;
export const EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleExtractionInputProductExecution = {
  readonly boundedTextSidecarObserved: boolean;
  readonly boundedExtractionInputPacketCreated: boolean;
  readonly providerLineagePreserved: boolean;
  readonly extractionExecutionAuthorized: false;
  readonly llmExtractionCallAuthorized: false;
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

export type EvidenceLifecycleExtractionInputRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_bounded_extraction_input_authorization";
  readonly extractionInputAuthorization: EvidenceLifecycleExtractionInputAuthorizationDecision;
  readonly productExecution: EvidenceLifecycleExtractionInputProductExecution;
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleExtractionInputArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly extractionInputAuthorization: EvidenceLifecycleExtractionInputAuthorizationDecision;
};

export type EvidenceLifecycleExtractionInputArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: EvidenceLifecycleExtractionInputRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: EvidenceLifecycleExtractionInputRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

export type BoundedTextExtractionInputPacketDefaultProjection =
  Omit<BoundedTextExtractionInputPacket, "inputText" | "sourceContentPackets"> & {
    readonly sourceContentPackets: ReadonlyArray<
      Omit<BoundedTextExtractionInputPacket["sourceContentPackets"][number], "contentText"> & {
        readonly textAccess: "redacted_default_hash_length_provenance_only";
        readonly contentTextReturned: false;
      }
    >;
    readonly textAccess: "redacted_default_hash_length_provenance_only";
    readonly inputTextReturned: false;
  };

export type EvidenceLifecycleExtractionInputAuthorizationDefaultProjection =
  Omit<EvidenceLifecycleExtractionInputAuthorizationDecision, "extractionInputPacket"> & {
    readonly extractionInputPacket: BoundedTextExtractionInputPacketDefaultProjection | null;
  };

export type EvidenceLifecycleExtractionInputRuntimeArtifactDefaultProjection =
  Omit<EvidenceLifecycleExtractionInputRuntimeArtifact, "extractionInputAuthorization"> & {
    readonly extractionInputAuthorization: EvidenceLifecycleExtractionInputAuthorizationDefaultProjection;
  };

type EvidenceLifecycleExtractionInputArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleExtractionInputArtifactLedgers?:
    Map<string, EvidenceLifecycleExtractionInputRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceLifecycleExtractionInputRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleExtractionInputArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleExtractionInputArtifactLedgers ??=
    new Map<string, EvidenceLifecycleExtractionInputRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleExtractionInputArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleExtractionInputRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleExtractionInputRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_LEDGER_COUNT) {
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

function serializedByteLength(artifact: EvidenceLifecycleExtractionInputRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleExtractionInputRuntimeArtifact[],
  artifact: EvidenceLifecycleExtractionInputRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneJson(artifact));
}

function productExecution(
  projection: EvidenceLifecycleExtractionInputArtifactProjection,
): EvidenceLifecycleExtractionInputProductExecution {
  return {
    boundedTextSidecarObserved:
      projection.extractionInputAuthorization.productExecution.boundedTextSidecarObserved,
    boundedExtractionInputPacketCreated:
      projection.extractionInputAuthorization.productExecution.boundedExtractionInputPacketCreated,
    providerLineagePreserved:
      projection.extractionInputAuthorization.productExecution.providerLineagePreserved,
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
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

export function buildEvidenceLifecycleExtractionInputRuntimeArtifact(
  projection: EvidenceLifecycleExtractionInputArtifactProjection,
): EvidenceLifecycleExtractionInputRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_bounded_extraction_input_authorization",
    extractionInputAuthorization: cloneJson(projection.extractionInputAuthorization),
    productExecution: productExecution(projection),
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleExtractionInputRuntimeArtifact(
  projection: EvidenceLifecycleExtractionInputArtifactProjection,
): EvidenceLifecycleExtractionInputArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleExtractionInputRuntimeArtifact(projection);
  if (serializedByteLength(artifact) > EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function redactEvidenceLifecycleExtractionInputRuntimeArtifact(
  artifact: EvidenceLifecycleExtractionInputRuntimeArtifact,
): EvidenceLifecycleExtractionInputRuntimeArtifactDefaultProjection {
  const authorization = artifact.extractionInputAuthorization;
  const packet = authorization.extractionInputPacket;
  const redactedPacket: BoundedTextExtractionInputPacketDefaultProjection | null = packet
    ? {
        packetVersion: packet.packetVersion,
        packetId: packet.packetId,
        kind: packet.kind,
        visibility: packet.visibility,
        publicPointerExposure: packet.publicPointerExposure,
        source: packet.source,
        parentDecisionVersion: packet.parentDecisionVersion,
        parentStatus: packet.parentStatus,
        parentSidecarVersion: packet.parentSidecarVersion,
        parentSidecarId: packet.parentSidecarId,
        linkedEvidenceCorpusId: packet.linkedEvidenceCorpusId,
        sourceMaterialRef: packet.sourceMaterialRef,
        sourceMaterialRefs: packet.sourceMaterialRefs,
        locatorRef: packet.locatorRef,
        locatorRefs: packet.locatorRefs,
        candidatePreviewId: packet.candidatePreviewId,
        candidatePreviewIds: packet.candidatePreviewIds,
        providerId: packet.providerId,
        providerIds: packet.providerIds,
        sourceMaterialEndpointId: packet.sourceMaterialEndpointId,
        sourceMaterialEndpointIds: packet.sourceMaterialEndpointIds,
        sourceMaterialKind: packet.sourceMaterialKind,
        sourceMaterialKinds: packet.sourceMaterialKinds,
        languageCode: packet.languageCode,
        languageCodes: packet.languageCodes,
        inputTextHash: packet.inputTextHash,
        inputTextByteLength: packet.inputTextByteLength,
        inputTextCharLength: packet.inputTextCharLength,
        maxInputTextBytes: packet.maxInputTextBytes,
        truncationApplied: packet.truncationApplied,
        sourceMaterialTextHash: packet.sourceMaterialTextHash,
        sourceMaterialTextHashes: packet.sourceMaterialTextHashes,
        sourceMaterialTextByteLength: packet.sourceMaterialTextByteLength,
        sourceMaterialTextByteLengths: packet.sourceMaterialTextByteLengths,
        sourceMaterialTextCharLength: packet.sourceMaterialTextCharLength,
        sourceContentPackets: packet.sourceContentPackets.map((contentPacket) => ({
          sourceRecordId: contentPacket.sourceRecordId,
          contentPacketId: contentPacket.contentPacketId,
          providerId: contentPacket.providerId,
          sourceMaterialEndpointId: contentPacket.sourceMaterialEndpointId,
          sourceMaterialKind: contentPacket.sourceMaterialKind,
          languageCode: contentPacket.languageCode,
          contentTextHash: contentPacket.contentTextHash,
          contentTextByteLength: contentPacket.contentTextByteLength,
          contentTextCharLength: contentPacket.contentTextCharLength,
          maxContentTextBytes: contentPacket.maxContentTextBytes,
          provenance: contentPacket.provenance,
          textAccess: "redacted_default_hash_length_provenance_only",
          contentTextReturned: false,
        })),
        extractionExecutionAuthorized: packet.extractionExecutionAuthorized,
        llmExtractionCallAuthorized: packet.llmExtractionCallAuthorized,
        parserExecuted: packet.parserExecuted,
        semanticExtractionAuthorized: packet.semanticExtractionAuthorized,
        evidenceItemExtractionAuthorized: packet.evidenceItemExtractionAuthorized,
        evidenceItems: packet.evidenceItems,
        publicCutoverStatus: packet.publicCutoverStatus,
        textAccess: "redacted_default_hash_length_provenance_only",
        inputTextReturned: false,
      }
    : null;

  return cloneJson({
    ...artifact,
    extractionInputAuthorization: {
      ...authorization,
      extractionInputPacket: redactedPacket,
    },
  });
}

export function readEvidenceLifecycleExtractionInputRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleExtractionInputRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneJson);
}

export function readEvidenceLifecycleExtractionInputRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly EvidenceLifecycleExtractionInputRuntimeArtifactDefaultProjection[] {
  return readEvidenceLifecycleExtractionInputRuntimeArtifacts(ledgerId)
    .map(redactEvidenceLifecycleExtractionInputRuntimeArtifact);
}

export function clearEvidenceLifecycleExtractionInputRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
