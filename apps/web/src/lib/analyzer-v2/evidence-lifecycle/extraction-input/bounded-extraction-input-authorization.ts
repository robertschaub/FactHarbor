import { createHash } from "node:crypto";
import {
  EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION,
  EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES,
  EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION,
  type EvidenceCorpusBoundedTextAuthorizationDecision,
  type EvidenceCorpusBoundedTextSidecar,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

export const BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION =
  "v2.evidence-lifecycle.extraction-input-authorization.x7w4h";
export const BOUNDED_EXTRACTION_INPUT_PACKET_VERSION =
  "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h";
export const BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES = EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES;
export const BOUNDED_EXTRACTION_INPUT_APPROVED_PROVIDER_ID = "wikimedia_core";
export const BOUNDED_EXTRACTION_INPUT_FAN_IN_MAX_SIDECARS = 3;

export type BoundedExtractionInputRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

export type BoundedExtractionInputAuthorizationStatus =
  | "bounded_extraction_input_packet_created_extraction_execution_closed"
  | "blocked_pre_extraction_input_w4g_not_runtime_owned"
  | "blocked_pre_extraction_input_w4g_not_positive"
  | "blocked_pre_extraction_input_sidecar_missing"
  | "blocked_pre_extraction_input_sidecar_count_unsupported"
  | "blocked_pre_extraction_input_sidecar_kind_unsupported"
  | "blocked_pre_extraction_input_sidecar_visibility_invalid"
  | "blocked_pre_extraction_input_text_missing"
  | "blocked_pre_extraction_input_text_oversized"
  | "blocked_pre_extraction_input_text_hash_mismatch"
  | "blocked_pre_extraction_input_source_material_hash_mismatch"
  | "blocked_pre_extraction_input_lineage_missing_or_invalid"
  | "blocked_pre_extraction_input_provider_id_mismatch"
  | "blocked_pre_extraction_input_corpus_text_access_invalid"
  | "blocked_pre_extraction_input_w4g_downstream_flags_open"
  | "blocked_pre_extraction_input_public_cutover_not_blocked"
  | "blocked_pre_extraction_input_raw_leakage_risk"
  | "bounded_extraction_input_authorization_damaged_structural";

export type BoundedExtractionInputAuthorizationStopReason =
  | "not_stopped"
  | "w4g_not_runtime_owned"
  | "w4g_not_positive"
  | "w4g_sidecar_missing"
  | "w4g_sidecar_count_unsupported"
  | "w4g_sidecar_kind_unsupported"
  | "w4g_sidecar_visibility_invalid"
  | "w4g_sidecar_text_missing"
  | "w4g_sidecar_text_oversized"
  | "w4g_sidecar_text_hash_mismatch"
  | "source_material_hash_mismatch"
  | "source_material_length_mismatch"
  | "lineage_missing_or_invalid"
  | "provider_id_mismatch"
  | "corpus_text_access_invalid"
  | "w4g_downstream_flags_open"
  | "public_cutover_not_blocked"
  | "raw_leakage_marker_detected"
  | "structural_exception";

export type BoundedExtractionInputParentSummary = {
  readonly boundedTextDecisionVersion:
    typeof EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION | null;
  readonly boundedTextStatus: string | null;
  readonly boundedTextStopReason: string | null;
  readonly boundedTextRuntimeOwnership: BoundedExtractionInputRuntimeOwnership;
  readonly boundedTextSidecarVersion: typeof EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION | null;
  readonly boundedTextSidecarKind: string | null;
  readonly boundedTextSidecarId: string | null;
  readonly linkedEvidenceCorpusId: string | null;
  readonly sourceMaterialRef: string | null;
  readonly locatorRef: string | null;
  readonly candidatePreviewId: string | null;
  readonly providerId: string | null;
  readonly sourceMaterialEndpointId: string | null;
  readonly sourceMaterialKind: string | null;
  readonly languageCode: string | null;
  readonly textHash: string | null;
  readonly textByteLength: number | null;
  readonly maxTextBytes: number | null;
};

export type BoundedTextExtractionInputPacket = {
  readonly packetVersion: typeof BOUNDED_EXTRACTION_INPUT_PACKET_VERSION;
  readonly packetId: string;
  readonly kind: "bounded_text_extraction_input_packet";
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly source: "w4g_bounded_text_sidecar";
  readonly parentDecisionVersion: typeof EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION;
  readonly parentStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed";
  readonly parentSidecarVersion: typeof EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION;
  readonly parentSidecarId: string;
  readonly linkedEvidenceCorpusId: string;
  readonly sourceMaterialRef: string;
  readonly sourceMaterialRefs: readonly string[];
  readonly locatorRef: string;
  readonly locatorRefs: readonly string[];
  readonly candidatePreviewId: string;
  readonly candidatePreviewIds: readonly string[];
  readonly providerId: string;
  readonly sourceMaterialEndpointId: string;
  readonly sourceMaterialKind: "wikimedia_page_summary_extract_text";
  readonly languageCode: string;
  readonly inputText: string;
  readonly inputTextHash: string;
  readonly inputTextByteLength: number;
  readonly inputTextCharLength: number;
  readonly maxInputTextBytes: typeof BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES;
  readonly truncationApplied: false;
  readonly sourceMaterialTextHash: string;
  readonly sourceMaterialTextHashes: readonly string[];
  readonly sourceMaterialTextByteLength: number;
  readonly sourceMaterialTextByteLengths: readonly number[];
  readonly sourceMaterialTextCharLength: number;
  readonly extractionExecutionAuthorized: false;
  readonly llmExtractionCallAuthorized: false;
  readonly parserExecuted: false;
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly evidenceItems: readonly [];
  readonly publicCutoverStatus: "blocked_precutover";
};

export type BoundedExtractionInputAuthorizationDecision = {
  readonly decisionVersion: typeof BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: BoundedExtractionInputAuthorizationStatus;
  readonly stopReason: BoundedExtractionInputAuthorizationStopReason;
  readonly parent: BoundedExtractionInputParentSummary;
  readonly boundedTextSidecarCount: number;
  readonly extractionInputPacketCount: number;
  readonly extractionInputPacket: BoundedTextExtractionInputPacket | null;
  readonly evidenceCorpus: null;
  readonly evidenceItems: readonly [];
  readonly extractionExecutionAuthorized: false;
  readonly llmExtractionCallAuthorized: false;
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly downstreamGate: "evidence_item_extraction_execution_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly productExecution: {
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
};

type ValidationFailure = {
  readonly status: Exclude<
    BoundedExtractionInputAuthorizationStatus,
    "bounded_extraction_input_packet_created_extraction_execution_closed"
  >;
  readonly stopReason: Exclude<BoundedExtractionInputAuthorizationStopReason, "not_stopped">;
};

const FORBIDDEN_TEXT_FRAGMENTS = [
  "://",
  "www.",
  "api_key",
  "apikey",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function boundedCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function containsForbiddenTextFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_TEXT_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function parentSummary(params: {
  readonly boundedTextAuthorization: unknown;
  readonly boundedTextRuntimeOwnership: BoundedExtractionInputRuntimeOwnership;
}): BoundedExtractionInputParentSummary {
  const authorization = isRecord(params.boundedTextAuthorization) ? params.boundedTextAuthorization : null;
  const sidecar = isRecord(authorization?.boundedTextSidecar) ? authorization.boundedTextSidecar : null;
  return {
    boundedTextDecisionVersion:
      authorization?.decisionVersion === EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION
        ? EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION
        : null,
    boundedTextStatus: readString(authorization?.status),
    boundedTextStopReason: readString(authorization?.stopReason),
    boundedTextRuntimeOwnership: params.boundedTextRuntimeOwnership,
    boundedTextSidecarVersion: sidecar?.sidecarVersion === EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION
      ? EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION
      : null,
    boundedTextSidecarKind: readString(sidecar?.kind),
    boundedTextSidecarId: readString(sidecar?.boundedTextSidecarId),
    linkedEvidenceCorpusId: readString(sidecar?.linkedEvidenceCorpusId),
    sourceMaterialRef: readString(sidecar?.sourceMaterialRef),
    locatorRef: readString(sidecar?.locatorRef),
    candidatePreviewId: readString(sidecar?.candidatePreviewId),
    providerId: readString(sidecar?.providerId),
    sourceMaterialEndpointId: readString(sidecar?.sourceMaterialEndpointId),
    sourceMaterialKind: readString(sidecar?.sourceMaterialKind),
    languageCode: readString(sidecar?.languageCode),
    textHash: readString(sidecar?.textHash),
    textByteLength: readNumber(sidecar?.textByteLength),
    maxTextBytes: readNumber(sidecar?.maxTextBytes),
  };
}

function decision(params: {
  readonly boundedTextAuthorization: unknown;
  readonly boundedTextRuntimeOwnership: BoundedExtractionInputRuntimeOwnership;
  readonly status: BoundedExtractionInputAuthorizationStatus;
  readonly stopReason: BoundedExtractionInputAuthorizationStopReason;
  readonly extractionInputPacket?: BoundedTextExtractionInputPacket | null;
}): BoundedExtractionInputAuthorizationDecision {
  const extractionInputPacket = params.extractionInputPacket ?? null;
  const boundedTextAuthorization = isRecord(params.boundedTextAuthorization)
    ? params.boundedTextAuthorization
    : null;
  const providerLineagePreserved =
    extractionInputPacket !== null
    && isRecord(boundedTextAuthorization?.boundedTextSidecar)
    && extractionInputPacket.providerId === boundedTextAuthorization.boundedTextSidecar.providerId;

  return {
    decisionVersion: BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: params.status,
    stopReason: params.stopReason,
    parent: parentSummary(params),
    boundedTextSidecarCount: boundedCount(boundedTextAuthorization?.boundedTextSidecarCount),
    extractionInputPacketCount: extractionInputPacket ? 1 : 0,
    extractionInputPacket,
    evidenceCorpus: null,
    evidenceItems: [],
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_execution_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedTextSidecarObserved: isRecord(boundedTextAuthorization?.boundedTextSidecar),
      boundedExtractionInputPacketCreated: extractionInputPacket !== null,
      providerLineagePreserved,
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
    },
  };
}

function failure(
  params: Omit<Parameters<typeof decision>[0], "status" | "stopReason" | "extractionInputPacket">,
  status: ValidationFailure["status"],
  stopReason: ValidationFailure["stopReason"],
): BoundedExtractionInputAuthorizationDecision {
  return decision({ ...params, status, stopReason });
}

function validateSidecarShape(sidecar: EvidenceCorpusBoundedTextSidecar): ValidationFailure | null {
  if (
    sidecar.sidecarVersion !== EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION
    || sidecar.kind !== "bounded_text_sidecar"
  ) {
    return {
      status: "blocked_pre_extraction_input_sidecar_kind_unsupported",
      stopReason: "w4g_sidecar_kind_unsupported",
    };
  }
  if (
    sidecar.visibility !== "internal_admin_only"
    || sidecar.publicPointerExposure !== "forbidden"
  ) {
    return {
      status: "blocked_pre_extraction_input_sidecar_visibility_invalid",
      stopReason: "w4g_sidecar_visibility_invalid",
    };
  }
  if (sidecar.corpusTextAccess !== "internal_admin_only_bounded_text_sidecar") {
    return {
      status: "blocked_pre_extraction_input_corpus_text_access_invalid",
      stopReason: "corpus_text_access_invalid",
    };
  }
  return null;
}

function validateSidecarText(sidecar: EvidenceCorpusBoundedTextSidecar): ValidationFailure | null {
  if (typeof sidecar.text !== "string" || sidecar.text.length === 0) {
    return {
      status: "blocked_pre_extraction_input_text_missing",
      stopReason: "w4g_sidecar_text_missing",
    };
  }
  const byteLength = utf8ByteLength(sidecar.text);
  if (
    byteLength > BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES
    || sidecar.textByteLength !== byteLength
    || sidecar.textCharLength !== Array.from(sidecar.text).length
    || sidecar.maxTextBytes !== BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES
    || sidecar.truncationApplied !== false
  ) {
    return {
      status: "blocked_pre_extraction_input_text_oversized",
      stopReason: "w4g_sidecar_text_oversized",
    };
  }
  if (
    sidecar.textHash !== sha256Text(sidecar.text)
    || typeof sidecar.textHash !== "string"
    || !/^[a-f0-9]{64}$/.test(sidecar.textHash)
  ) {
    return {
      status: "blocked_pre_extraction_input_text_hash_mismatch",
      stopReason: "w4g_sidecar_text_hash_mismatch",
    };
  }
  if (containsForbiddenTextFragment(sidecar.text)) {
    return {
      status: "blocked_pre_extraction_input_raw_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }
  if (
    sidecar.sourceMaterialTextHash !== sidecar.textHash
    || sidecar.sourceMaterialTextByteLength !== sidecar.textByteLength
    || sidecar.sourceMaterialTextCharLength !== sidecar.textCharLength
  ) {
    return {
      status: "blocked_pre_extraction_input_source_material_hash_mismatch",
      stopReason: sidecar.sourceMaterialTextHash !== sidecar.textHash
        ? "source_material_hash_mismatch"
        : "source_material_length_mismatch",
    };
  }
  return null;
}

function validateLineage(sidecar: EvidenceCorpusBoundedTextSidecar): ValidationFailure | null {
  for (const value of [
    sidecar.boundedTextSidecarId,
    sidecar.linkedEvidenceCorpusId,
    sidecar.sourceMaterialRef,
    sidecar.locatorRef,
    sidecar.candidatePreviewId,
    sidecar.providerId,
    sidecar.sourceMaterialEndpointId,
    sidecar.languageCode,
  ]) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return {
        status: "blocked_pre_extraction_input_lineage_missing_or_invalid",
        stopReason: "lineage_missing_or_invalid",
      };
    }
  }
  if (sidecar.sourceMaterialKind !== "wikimedia_page_summary_extract_text") {
    return {
      status: "blocked_pre_extraction_input_lineage_missing_or_invalid",
      stopReason: "lineage_missing_or_invalid",
    };
  }
  if (sidecar.providerId !== BOUNDED_EXTRACTION_INPUT_APPROVED_PROVIDER_ID) {
    return {
      status: "blocked_pre_extraction_input_provider_id_mismatch",
      stopReason: "provider_id_mismatch",
    };
  }
  return null;
}

function validateClosedDownstream(
  boundedTextAuthorization: EvidenceCorpusBoundedTextAuthorizationDecision,
  sidecar: EvidenceCorpusBoundedTextSidecar,
): ValidationFailure | null {
  if (
    boundedTextAuthorization.evidenceCorpus !== null
    || boundedTextAuthorization.extractionInput !== null
    || boundedTextAuthorization.semanticExtractionAuthorized !== false
    || boundedTextAuthorization.evidenceItemExtractionAuthorized !== false
    || boundedTextAuthorization.publicCutoverStatus !== "blocked_precutover"
    || sidecar.extractionInput !== null
    || sidecar.semanticExtractionAuthorized !== false
    || sidecar.evidenceItemExtractionAuthorized !== false
    || sidecar.preservesShellOnlyCorpus !== true
    || sidecar.mutatesShellCorpus !== false
    || sidecar.mutatesExtractionDenial !== false
  ) {
    return {
      status: "blocked_pre_extraction_input_w4g_downstream_flags_open",
      stopReason: "w4g_downstream_flags_open",
    };
  }
  if (
    boundedTextAuthorization.evidenceItems.length !== 0
    || sidecar.evidenceItems.length !== 0
    || sidecar.downstreamExecution.parserExecuted !== false
    || sidecar.downstreamExecution.cacheRead !== false
    || sidecar.downstreamExecution.cacheWrite !== false
    || sidecar.downstreamExecution.storageWrite !== false
    || sidecar.downstreamExecution.sourceReliabilityCalled !== false
    || sidecar.downstreamExecution.evidenceItemGenerated !== false
    || sidecar.downstreamExecution.reportGenerated !== false
    || sidecar.downstreamExecution.verdictGenerated !== false
    || sidecar.downstreamExecution.warningGenerated !== false
    || sidecar.downstreamExecution.confidenceGenerated !== false
    || sidecar.downstreamExecution.publicSurfaceWritten !== false
  ) {
    return {
      status: "blocked_pre_extraction_input_w4g_downstream_flags_open",
      stopReason: "w4g_downstream_flags_open",
    };
  }
  if (
    boundedTextAuthorization.productExecution.sourceTextAuthorized !== false
    || boundedTextAuthorization.productExecution.extractionInputCreated !== false
    || boundedTextAuthorization.productExecution.evidenceItemGenerated !== false
    || boundedTextAuthorization.productExecution.parserExecuted !== false
    || boundedTextAuthorization.productExecution.cacheRead !== false
    || boundedTextAuthorization.productExecution.cacheWrite !== false
    || boundedTextAuthorization.productExecution.storageWrite !== false
    || boundedTextAuthorization.productExecution.sourceReliabilityCalled !== false
    || boundedTextAuthorization.productExecution.reportGenerated !== false
    || boundedTextAuthorization.productExecution.verdictGenerated !== false
    || boundedTextAuthorization.productExecution.warningGenerated !== false
    || boundedTextAuthorization.productExecution.confidenceGenerated !== false
    || boundedTextAuthorization.productExecution.publicSurfaceWritten !== false
  ) {
    return {
      status: "blocked_pre_extraction_input_w4g_downstream_flags_open",
      stopReason: "w4g_downstream_flags_open",
    };
  }
  return null;
}

function buildPacket(sidecars: readonly EvidenceCorpusBoundedTextSidecar[]): BoundedTextExtractionInputPacket | ValidationFailure {
  if (sidecars.length < 1 || sidecars.length > BOUNDED_EXTRACTION_INPUT_FAN_IN_MAX_SIDECARS) {
    return {
      status: "blocked_pre_extraction_input_sidecar_count_unsupported",
      stopReason: "w4g_sidecar_count_unsupported",
    };
  }
  const [firstSidecar] = sidecars;
  const providerIds = new Set(sidecars.map((sidecar) => sidecar.providerId));
  if (providerIds.size !== 1) {
    return {
      status: "blocked_pre_extraction_input_provider_id_mismatch",
      stopReason: "provider_id_mismatch",
    };
  }
  const aggregateText = sidecars.map((sidecar) => sidecar.text).join("\n\n");
  const aggregateTextHash = sha256Text(aggregateText);
  const aggregateByteLength = utf8ByteLength(aggregateText);
  const aggregateCharLength = Array.from(aggregateText).length;
  if (aggregateByteLength > BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES) {
    return {
      status: "blocked_pre_extraction_input_text_oversized",
      stopReason: "w4g_sidecar_text_oversized",
    };
  }
  const packet: BoundedTextExtractionInputPacket = {
    packetVersion: BOUNDED_EXTRACTION_INPUT_PACKET_VERSION,
    packetId: `BOUNDED_EXTRACTION_INPUT_${aggregateTextHash.slice(0, 16).toUpperCase()}`,
    kind: "bounded_text_extraction_input_packet",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    source: "w4g_bounded_text_sidecar",
    parentDecisionVersion: EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION,
    parentStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
    parentSidecarVersion: EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION,
    parentSidecarId: firstSidecar.boundedTextSidecarId,
    linkedEvidenceCorpusId: firstSidecar.linkedEvidenceCorpusId,
    sourceMaterialRef: sidecars.length === 1 ? firstSidecar.sourceMaterialRef : `AGGREGATE_SOURCE_MATERIAL_${aggregateTextHash.slice(0, 16).toUpperCase()}`,
    sourceMaterialRefs: sidecars.map((sidecar) => sidecar.sourceMaterialRef),
    locatorRef: firstSidecar.locatorRef,
    locatorRefs: sidecars.map((sidecar) => sidecar.locatorRef),
    candidatePreviewId: firstSidecar.candidatePreviewId,
    candidatePreviewIds: sidecars.map((sidecar) => sidecar.candidatePreviewId),
    providerId: firstSidecar.providerId,
    sourceMaterialEndpointId: firstSidecar.sourceMaterialEndpointId,
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    languageCode: firstSidecar.languageCode,
    inputText: aggregateText,
    inputTextHash: aggregateTextHash,
    inputTextByteLength: aggregateByteLength,
    inputTextCharLength: aggregateCharLength,
    maxInputTextBytes: BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES,
    truncationApplied: false,
    sourceMaterialTextHash: aggregateTextHash,
    sourceMaterialTextHashes: sidecars.map((sidecar) => sidecar.sourceMaterialTextHash),
    sourceMaterialTextByteLength: aggregateByteLength,
    sourceMaterialTextByteLengths: sidecars.map((sidecar) => sidecar.sourceMaterialTextByteLength),
    sourceMaterialTextCharLength: aggregateCharLength,
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    parserExecuted: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    evidenceItems: [],
    publicCutoverStatus: "blocked_precutover",
  };

  if (packet.providerId !== firstSidecar.providerId) {
    return {
      status: "blocked_pre_extraction_input_provider_id_mismatch",
      stopReason: "provider_id_mismatch",
    };
  }
  return packet;
}

export function buildBoundedExtractionInputAuthorization(params: {
  readonly boundedTextAuthorization: unknown;
  readonly boundedTextRuntimeOwnership: BoundedExtractionInputRuntimeOwnership;
}): BoundedExtractionInputAuthorizationDecision {
  try {
    const failureParams = {
      boundedTextAuthorization: params.boundedTextAuthorization,
      boundedTextRuntimeOwnership: params.boundedTextRuntimeOwnership,
    };
    if (params.boundedTextRuntimeOwnership !== "owned") {
      return failure(
        failureParams,
        "blocked_pre_extraction_input_w4g_not_runtime_owned",
        "w4g_not_runtime_owned",
      );
    }
    if (!isRecord(params.boundedTextAuthorization)) {
      return failure(failureParams, "blocked_pre_extraction_input_w4g_not_positive", "w4g_not_positive");
    }
    const boundedTextAuthorization =
      params.boundedTextAuthorization as unknown as EvidenceCorpusBoundedTextAuthorizationDecision;
    if (
      boundedTextAuthorization.decisionVersion !== EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION
      || boundedTextAuthorization.status !== "bounded_corpus_text_sidecar_created_extraction_gate_closed"
      || boundedTextAuthorization.stopReason !== "not_stopped"
      || boundedTextAuthorization.visibility !== "internal_admin_only"
      || boundedTextAuthorization.publicPointerExposure !== "forbidden"
    ) {
      return failure(failureParams, "blocked_pre_extraction_input_w4g_not_positive", "w4g_not_positive");
    }
    if (boundedTextAuthorization.publicCutoverStatus !== "blocked_precutover") {
      return failure(
        failureParams,
        "blocked_pre_extraction_input_public_cutover_not_blocked",
        "public_cutover_not_blocked",
      );
    }
    const boundedTextSidecars = Array.isArray(boundedTextAuthorization.boundedTextSidecars)
      ? boundedTextAuthorization.boundedTextSidecars
      : boundedTextAuthorization.boundedTextSidecar
        ? [boundedTextAuthorization.boundedTextSidecar]
        : [];
    if (
      boundedTextAuthorization.boundedTextSidecarCount < 1
      || boundedTextAuthorization.boundedTextSidecarCount > BOUNDED_EXTRACTION_INPUT_FAN_IN_MAX_SIDECARS
      || boundedTextSidecars.length !== boundedTextAuthorization.boundedTextSidecarCount
    ) {
      return failure(
        failureParams,
        "blocked_pre_extraction_input_sidecar_count_unsupported",
        "w4g_sidecar_count_unsupported",
      );
    }
    if (!isRecord(boundedTextAuthorization.boundedTextSidecar)) {
      return failure(
        failureParams,
        "blocked_pre_extraction_input_sidecar_missing",
        "w4g_sidecar_missing",
      );
    }
    const sidecars = boundedTextSidecars as unknown as EvidenceCorpusBoundedTextSidecar[];
    for (const sidecar of sidecars) {
      const validationFailures = [
        validateSidecarShape(sidecar),
        validateSidecarText(sidecar),
        validateLineage(sidecar),
        validateClosedDownstream(boundedTextAuthorization, sidecar),
      ];
      const firstFailure = validationFailures.find((failureResult): failureResult is ValidationFailure =>
        failureResult !== null
      );
      if (firstFailure) {
        return failure(failureParams, firstFailure.status, firstFailure.stopReason);
      }
    }

    const packet = buildPacket(sidecars);
    if ("status" in packet) {
      return failure(failureParams, packet.status, packet.stopReason);
    }

    return decision({
      ...failureParams,
      status: "bounded_extraction_input_packet_created_extraction_execution_closed",
      stopReason: "not_stopped",
      extractionInputPacket: packet,
    });
  } catch {
    return decision({
      boundedTextAuthorization: params.boundedTextAuthorization,
      boundedTextRuntimeOwnership: params.boundedTextRuntimeOwnership,
      status: "bounded_extraction_input_authorization_damaged_structural",
      stopReason: "structural_exception",
    });
  }
}
