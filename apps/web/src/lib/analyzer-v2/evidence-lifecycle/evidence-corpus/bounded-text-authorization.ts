import { createHash } from "node:crypto";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES,
  SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
  SOURCE_MATERIAL_PAGE_SUMMARY_VERSION,
  sourceMaterialKindIsSupported,
  type SourceMaterialKind,
  type SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import {
  EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
  type EvidenceCorpusSourceMaterialAdmissionDecision,
} from "./source-material-admission";
import {
  EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION,
  type EvidenceCorpusExtractionReadinessDenialDecision,
} from "./evidence-corpus-extraction-readiness-denial";
import {
  EVIDENCE_CORPUS_SHELL_DECISION_VERSION,
  EVIDENCE_CORPUS_SHELL_VERSION,
  type EvidenceCorpusShellDecision,
} from "./evidence-corpus-shell";

export const EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g";
export const EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION =
  "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g";
export const EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES = SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES;
export const EVIDENCE_CORPUS_BOUNDED_TEXT_FAN_IN_MAX_RECORDS = 9;
export const EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES = 16_384;

export type EvidenceCorpusBoundedTextRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

export type EvidenceCorpusBoundedTextAuthorizationStatus =
  | "bounded_corpus_text_sidecar_created_extraction_gate_closed"
  | "blocked_pre_bounded_corpus_text_w3b_not_runtime_owned"
  | "blocked_pre_bounded_corpus_text_w3b_not_completed"
  | "blocked_pre_bounded_corpus_text_record_count_unsupported"
  | "blocked_pre_bounded_corpus_text_kind_unsupported"
  | "blocked_pre_bounded_corpus_text_missing"
  | "blocked_pre_bounded_corpus_text_oversized"
  | "blocked_pre_bounded_corpus_text_hash_mismatch"
  | "blocked_pre_bounded_corpus_text_w4c_not_runtime_owned"
  | "blocked_pre_bounded_corpus_text_w4c_not_positive"
  | "blocked_pre_bounded_corpus_text_w4d_not_runtime_owned"
  | "blocked_pre_bounded_corpus_text_w4d_not_positive"
  | "blocked_pre_bounded_corpus_text_w4e_not_denial"
  | "blocked_pre_bounded_corpus_text_lineage_mismatch"
  | "blocked_pre_bounded_corpus_text_raw_leakage_risk"
  | "blocked_pre_bounded_corpus_text_downstream_execution_not_authorized"
  | "bounded_corpus_text_authorization_damaged_structural";

export type EvidenceCorpusBoundedTextAuthorizationStopReason =
  | "not_stopped"
  | "w3b_not_runtime_owned"
  | "w3b_not_completed"
  | "source_material_record_count_unsupported"
  | "source_material_kind_unsupported"
  | "source_material_text_missing"
  | "source_material_text_oversized"
  | "source_material_hash_mismatch"
  | "w4c_not_runtime_owned"
  | "w4c_not_completed"
  | "w4d_not_runtime_owned"
  | "w4d_shell_not_created"
  | "w4e_denial_not_confirmed"
  | "source_material_lineage_mismatch"
  | "raw_leakage_marker_detected"
  | "downstream_execution_not_authorized"
  | "structural_exception";

export type EvidenceCorpusBoundedTextParentSummary = {
  readonly sourceMaterialVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_VERSION | null;
  readonly sourceMaterialStatus: string | null;
  readonly sourceMaterialStopReason: string | null;
  readonly sourceMaterialRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly admissionDecisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION | null;
  readonly admissionStatus: string | null;
  readonly admissionStopReason: string | null;
  readonly admissionRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly shellDecisionVersion: typeof EVIDENCE_CORPUS_SHELL_DECISION_VERSION | null;
  readonly shellStatus: string | null;
  readonly shellStopReason: string | null;
  readonly shellRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly extractionDenialDecisionVersion:
    typeof EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION | null;
  readonly extractionDenialStatus: string | null;
  readonly extractionDenialStopReason: string | null;
};

export type EvidenceCorpusBoundedTextSidecar = {
  readonly sidecarVersion: typeof EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION;
  readonly boundedTextSidecarId: string;
  readonly kind: "bounded_text_sidecar";
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly linkedEvidenceCorpusId: string;
  readonly linkedEvidenceCorpusShellVersion: typeof EVIDENCE_CORPUS_SHELL_VERSION;
  readonly sourceMaterialRef: string;
  readonly locatorRef: string;
  readonly candidatePreviewId: string;
  readonly providerId: string;
  readonly sourceMaterialEndpointId: string;
  readonly sourceMaterialKind: SourceMaterialKind;
  readonly languageCode: string;
  readonly textKind: "bounded_page_summary_extract_text";
  readonly text: string;
  readonly textHash: string;
  readonly textByteLength: number;
  readonly textCharLength: number;
  readonly maxTextBytes: typeof EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES;
  readonly truncationApplied: boolean;
  readonly sourceMaterialRecordVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION;
  readonly sourceMaterialTextHash: string;
  readonly sourceMaterialTextByteLength: number;
  readonly sourceMaterialTextCharLength: number;
  readonly sourceMaterialRuntimeOwned: true;
  readonly admissionDecisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION;
  readonly shellDecisionVersion: typeof EVIDENCE_CORPUS_SHELL_DECISION_VERSION;
  readonly extractionDenialDecisionVersion:
    typeof EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION;
  readonly extractionDenialStatus: "extraction_denied_shell_only";
  readonly corpusTextAccess: "internal_admin_only_bounded_text_sidecar";
  readonly preservesShellOnlyCorpus: true;
  readonly mutatesShellCorpus: false;
  readonly mutatesExtractionDenial: false;
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly extractionInput: null;
  readonly evidenceItems: readonly [];
  readonly downstreamExecution: EvidenceCorpusBoundedTextClosedExecutionFlags;
};

export type EvidenceCorpusBoundedTextClosedExecutionFlags = {
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly evidenceItemGenerated: false;
  readonly warningGenerated: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type EvidenceCorpusBoundedTextAuthorizationDecision = {
  readonly decisionVersion: typeof EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: EvidenceCorpusBoundedTextAuthorizationStatus;
  readonly stopReason: EvidenceCorpusBoundedTextAuthorizationStopReason;
  readonly parent: EvidenceCorpusBoundedTextParentSummary;
  readonly sourceMaterialRecordCount: number;
  readonly boundedTextSidecarCount: number;
  readonly boundedTextSidecar: EvidenceCorpusBoundedTextSidecar | null;
  readonly boundedTextSidecars: readonly EvidenceCorpusBoundedTextSidecar[];
  readonly evidenceCorpus: null;
  readonly extractionInput: null;
  readonly evidenceItems: readonly [];
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly downstreamGate: "evidence_item_extraction_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly productExecution: {
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
};

type ValidationFailure = {
  readonly status: Exclude<
    EvidenceCorpusBoundedTextAuthorizationStatus,
    "bounded_corpus_text_sidecar_created_extraction_gate_closed"
  >;
  readonly stopReason: Exclude<EvidenceCorpusBoundedTextAuthorizationStopReason, "not_stopped">;
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

function closedExecutionFlags(): EvidenceCorpusBoundedTextClosedExecutionFlags {
  return {
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityCalled: false,
    evidenceItemGenerated: false,
    warningGenerated: false,
    reportGenerated: false,
    verdictGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
  };
}

function parentSummary(params: {
  readonly sourceMaterialPageSummary: unknown;
  readonly sourceMaterialRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly sourceMaterialAdmission: unknown;
  readonly admissionRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly evidenceCorpusShell: unknown;
  readonly shellRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly extractionReadinessDenial: unknown;
}): EvidenceCorpusBoundedTextParentSummary {
  const sourceMaterial = isRecord(params.sourceMaterialPageSummary) ? params.sourceMaterialPageSummary : null;
  const admission = isRecord(params.sourceMaterialAdmission) ? params.sourceMaterialAdmission : null;
  const shell = isRecord(params.evidenceCorpusShell) ? params.evidenceCorpusShell : null;
  const denial = isRecord(params.extractionReadinessDenial) ? params.extractionReadinessDenial : null;

  return {
    sourceMaterialVersion: sourceMaterial?.sourceMaterialVersion === SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
      ? SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
      : null,
    sourceMaterialStatus: readString(sourceMaterial?.status),
    sourceMaterialStopReason: readString(sourceMaterial?.stopReason),
    sourceMaterialRuntimeOwnership: params.sourceMaterialRuntimeOwnership,
    admissionDecisionVersion: admission?.decisionVersion === EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION
      ? EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION
      : null,
    admissionStatus: readString(admission?.status),
    admissionStopReason: readString(admission?.stopReason),
    admissionRuntimeOwnership: params.admissionRuntimeOwnership,
    shellDecisionVersion: shell?.decisionVersion === EVIDENCE_CORPUS_SHELL_DECISION_VERSION
      ? EVIDENCE_CORPUS_SHELL_DECISION_VERSION
      : null,
    shellStatus: readString(shell?.status),
    shellStopReason: readString(shell?.stopReason),
    shellRuntimeOwnership: params.shellRuntimeOwnership,
    extractionDenialDecisionVersion:
      denial?.decisionVersion === EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION
        ? EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION
        : null,
    extractionDenialStatus: readString(denial?.status),
    extractionDenialStopReason: readString(denial?.stopReason),
  };
}

function decision(params: {
  readonly sourceMaterialPageSummary: unknown;
  readonly sourceMaterialRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly sourceMaterialAdmission: unknown;
  readonly admissionRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly evidenceCorpusShell: unknown;
  readonly shellRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly extractionReadinessDenial: unknown;
  readonly status: EvidenceCorpusBoundedTextAuthorizationStatus;
  readonly stopReason: EvidenceCorpusBoundedTextAuthorizationStopReason;
  readonly boundedTextSidecar?: EvidenceCorpusBoundedTextSidecar | null;
  readonly boundedTextSidecars?: readonly EvidenceCorpusBoundedTextSidecar[];
}): EvidenceCorpusBoundedTextAuthorizationDecision {
  const boundedTextSidecars = params.boundedTextSidecars ?? (params.boundedTextSidecar ? [params.boundedTextSidecar] : []);
  const boundedTextSidecar = boundedTextSidecars[0] ?? params.boundedTextSidecar ?? null;
  const sourceMaterial = isRecord(params.sourceMaterialPageSummary) ? params.sourceMaterialPageSummary : null;
  const admission = isRecord(params.sourceMaterialAdmission) ? params.sourceMaterialAdmission : null;
  const shell = isRecord(params.evidenceCorpusShell) ? params.evidenceCorpusShell : null;
  const denial = isRecord(params.extractionReadinessDenial) ? params.extractionReadinessDenial : null;

  return {
    decisionVersion: EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: params.status,
    stopReason: params.stopReason,
    parent: parentSummary(params),
    sourceMaterialRecordCount: boundedCount(sourceMaterial?.sourceMaterialRecordCount),
    boundedTextSidecarCount: boundedTextSidecars.length,
    boundedTextSidecar,
    boundedTextSidecars,
    evidenceCorpus: null,
    extractionInput: null,
    evidenceItems: [],
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedCorpusTextAuthorized: boundedTextSidecar !== null,
      boundedTextSidecarCreated: boundedTextSidecar !== null,
      sourceMaterialRuntimeOwned: params.sourceMaterialRuntimeOwnership === "owned",
      corpusAdmissionObserved: admission?.status === "source_material_admitted_to_corpus_input_gate_closed",
      evidenceCorpusShellObserved: shell?.status === "evidence_corpus_shell_created_extraction_gate_closed",
      extractionReadinessDenialObserved: denial?.status === "extraction_denied_shell_only",
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
    },
  };
}

function failure(
  params: Omit<Parameters<typeof decision>[0], "status" | "stopReason" | "boundedTextSidecar">,
  status: ValidationFailure["status"],
  stopReason: ValidationFailure["stopReason"],
): EvidenceCorpusBoundedTextAuthorizationDecision {
  return decision({ ...params, status, stopReason });
}

function validateSourceMaterialRecord(record: unknown): SourceMaterialPageSummaryRecord | ValidationFailure {
  if (!isRecord(record)) {
    return {
      status: "blocked_pre_bounded_corpus_text_missing",
      stopReason: "source_material_text_missing",
    };
  }
  if (
    record.recordVersion !== SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION
    || !sourceMaterialKindIsSupported(record.sourceMaterialKind)
  ) {
    return {
      status: "blocked_pre_bounded_corpus_text_kind_unsupported",
      stopReason: "source_material_kind_unsupported",
    };
  }
  const text = record.sourceMaterialText;
  if (typeof text !== "string" || text.length === 0) {
    return {
      status: "blocked_pre_bounded_corpus_text_missing",
      stopReason: "source_material_text_missing",
    };
  }
  const textByteLength = utf8ByteLength(text);
  if (
    textByteLength > EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES
    || record.sourceMaterialTextByteLength !== textByteLength
    || record.sourceMaterialTextCharLength !== Array.from(text).length
    || typeof record.truncationApplied !== "boolean"
  ) {
    return {
      status: "blocked_pre_bounded_corpus_text_oversized",
      stopReason: "source_material_text_oversized",
    };
  }
  if (
    record.sourceMaterialTextHash !== sha256Text(text)
    || typeof record.sourceMaterialTextHash !== "string"
    || !/^[a-f0-9]{64}$/.test(record.sourceMaterialTextHash)
  ) {
    return {
      status: "blocked_pre_bounded_corpus_text_hash_mismatch",
      stopReason: "source_material_hash_mismatch",
    };
  }
  if (containsForbiddenTextFragment(text)) {
    return {
      status: "blocked_pre_bounded_corpus_text_raw_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }
  return record as unknown as SourceMaterialPageSummaryRecord;
}

function isValidationFailure(value: SourceMaterialPageSummaryRecord | ValidationFailure):
  value is ValidationFailure {
  return "status" in value;
}

function validateClosedDownstream(params: {
  readonly sourceMaterialAdmission: EvidenceCorpusSourceMaterialAdmissionDecision;
  readonly evidenceCorpusShell: EvidenceCorpusShellDecision;
  readonly extractionReadinessDenial: EvidenceCorpusExtractionReadinessDenialDecision;
}): ValidationFailure | null {
  if (
    params.sourceMaterialAdmission.evidenceCorpus !== null
    || params.sourceMaterialAdmission.extractionInput !== null
    || params.sourceMaterialAdmission.evidenceCorpusBuildAuthorized !== false
    || params.evidenceCorpusShell.extractionInput !== null
    || params.evidenceCorpusShell.semanticExtractionAuthorized !== false
    || params.evidenceCorpusShell.evidenceItemExtractionAuthorized !== false
    || params.extractionReadinessDenial.extractionInput !== null
    || params.extractionReadinessDenial.semanticExtractionAuthorized !== false
    || params.extractionReadinessDenial.evidenceItemExtractionAuthorized !== false
    || params.extractionReadinessDenial.publicCutoverStatus !== "blocked_precutover"
  ) {
    return {
      status: "blocked_pre_bounded_corpus_text_downstream_execution_not_authorized",
      stopReason: "downstream_execution_not_authorized",
    };
  }
  if (
    params.sourceMaterialAdmission.evidenceItems.length !== 0
    || params.evidenceCorpusShell.evidenceItems.length !== 0
    || params.extractionReadinessDenial.evidenceItems.length !== 0
  ) {
    return {
      status: "blocked_pre_bounded_corpus_text_downstream_execution_not_authorized",
      stopReason: "downstream_execution_not_authorized",
    };
  }
  return null;
}

function buildSidecar(params: {
  readonly sourceMaterialRecord: SourceMaterialPageSummaryRecord;
  readonly sourceMaterialAdmission: EvidenceCorpusSourceMaterialAdmissionDecision;
  readonly evidenceCorpusShell: EvidenceCorpusShellDecision;
  readonly extractionReadinessDenial: EvidenceCorpusExtractionReadinessDenialDecision;
}): EvidenceCorpusBoundedTextSidecar | ValidationFailure {
  const corpus = params.evidenceCorpusShell.evidenceCorpus;
  const admissionInputs = Array.isArray(params.sourceMaterialAdmission.corpusAdmissionInputs)
    ? params.sourceMaterialAdmission.corpusAdmissionInputs
    : params.sourceMaterialAdmission.corpusAdmissionInput
      ? [params.sourceMaterialAdmission.corpusAdmissionInput]
      : [];
  const admissionInput = Array.isArray(admissionInputs)
    ? admissionInputs.find((input) => input.sourceMaterialRef === params.sourceMaterialRecord.sourceMaterialId)
    : null;
  if (!corpus || !admissionInput) {
    return {
      status: "blocked_pre_bounded_corpus_text_lineage_mismatch",
      stopReason: "source_material_lineage_mismatch",
    };
  }
  if (
    admissionInput.sourceMaterialRef !== params.sourceMaterialRecord.sourceMaterialId
    || admissionInput.locatorRef !== params.sourceMaterialRecord.locatorRef
    || admissionInput.candidatePreviewId !== params.sourceMaterialRecord.candidatePreviewId
    || admissionInput.providerId !== params.sourceMaterialRecord.providerId
    || admissionInput.sourceMaterialEndpointId !== params.sourceMaterialRecord.sourceMaterialEndpointId
    || admissionInput.sourceMaterialTextHash !== params.sourceMaterialRecord.sourceMaterialTextHash
    || !corpus.sourceMaterialRefs.includes(params.sourceMaterialRecord.sourceMaterialId)
    || !corpus.sourceMaterialTextHashes.includes(params.sourceMaterialRecord.sourceMaterialTextHash)
    || params.extractionReadinessDenial.parent.evidenceCorpusId !== corpus.evidenceCorpusId
  ) {
    return {
      status: "blocked_pre_bounded_corpus_text_lineage_mismatch",
      stopReason: "source_material_lineage_mismatch",
    };
  }

  return {
    sidecarVersion: EVIDENCE_CORPUS_BOUNDED_TEXT_SIDECAR_VERSION,
    boundedTextSidecarId:
      `EVIDENCE_CORPUS_BOUNDED_TEXT_${params.sourceMaterialRecord.sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
    kind: "bounded_text_sidecar",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    linkedEvidenceCorpusId: corpus.evidenceCorpusId,
    linkedEvidenceCorpusShellVersion: EVIDENCE_CORPUS_SHELL_VERSION,
    sourceMaterialRef: params.sourceMaterialRecord.sourceMaterialId,
    locatorRef: params.sourceMaterialRecord.locatorRef,
    candidatePreviewId: params.sourceMaterialRecord.candidatePreviewId,
    providerId: params.sourceMaterialRecord.providerId,
    sourceMaterialEndpointId: params.sourceMaterialRecord.sourceMaterialEndpointId,
    sourceMaterialKind: params.sourceMaterialRecord.sourceMaterialKind,
    languageCode: params.sourceMaterialRecord.languageCode,
    textKind: "bounded_page_summary_extract_text",
    text: params.sourceMaterialRecord.sourceMaterialText,
    textHash: params.sourceMaterialRecord.sourceMaterialTextHash,
    textByteLength: params.sourceMaterialRecord.sourceMaterialTextByteLength,
    textCharLength: params.sourceMaterialRecord.sourceMaterialTextCharLength,
    maxTextBytes: EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES,
    truncationApplied: params.sourceMaterialRecord.truncationApplied,
    sourceMaterialRecordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
    sourceMaterialTextHash: params.sourceMaterialRecord.sourceMaterialTextHash,
    sourceMaterialTextByteLength: params.sourceMaterialRecord.sourceMaterialTextByteLength,
    sourceMaterialTextCharLength: params.sourceMaterialRecord.sourceMaterialTextCharLength,
    sourceMaterialRuntimeOwned: true,
    admissionDecisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
    shellDecisionVersion: EVIDENCE_CORPUS_SHELL_DECISION_VERSION,
    extractionDenialDecisionVersion: EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION,
    extractionDenialStatus: "extraction_denied_shell_only",
    corpusTextAccess: "internal_admin_only_bounded_text_sidecar",
    preservesShellOnlyCorpus: true,
    mutatesShellCorpus: false,
    mutatesExtractionDenial: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    extractionInput: null,
    evidenceItems: [],
    downstreamExecution: closedExecutionFlags(),
  };
}

export function buildEvidenceCorpusBoundedTextAuthorization(params: {
  readonly sourceMaterialPageSummary: unknown;
  readonly sourceMaterialRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly sourceMaterialAdmission: unknown;
  readonly admissionRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly evidenceCorpusShell: unknown;
  readonly shellRuntimeOwnership: EvidenceCorpusBoundedTextRuntimeOwnership;
  readonly extractionReadinessDenial: unknown;
}): EvidenceCorpusBoundedTextAuthorizationDecision {
  try {
    const failureParams = {
      sourceMaterialPageSummary: params.sourceMaterialPageSummary,
      sourceMaterialRuntimeOwnership: params.sourceMaterialRuntimeOwnership,
      sourceMaterialAdmission: params.sourceMaterialAdmission,
      admissionRuntimeOwnership: params.admissionRuntimeOwnership,
      evidenceCorpusShell: params.evidenceCorpusShell,
      shellRuntimeOwnership: params.shellRuntimeOwnership,
      extractionReadinessDenial: params.extractionReadinessDenial,
    };
    if (params.sourceMaterialRuntimeOwnership !== "owned") {
      return failure(
        failureParams,
        "blocked_pre_bounded_corpus_text_w3b_not_runtime_owned",
        "w3b_not_runtime_owned",
      );
    }
    if (!isRecord(params.sourceMaterialPageSummary)) {
      return failure(failureParams, "blocked_pre_bounded_corpus_text_w3b_not_completed", "w3b_not_completed");
    }
    if (
      params.sourceMaterialPageSummary.sourceMaterialVersion !== SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
      || params.sourceMaterialPageSummary.status !== "source_material_page_summary_completed"
      || params.sourceMaterialPageSummary.stopReason !== "not_stopped"
    ) {
      return failure(failureParams, "blocked_pre_bounded_corpus_text_w3b_not_completed", "w3b_not_completed");
    }
    const sourceMaterialRecordCount = boundedCount(params.sourceMaterialPageSummary.sourceMaterialRecordCount);
    if (
      sourceMaterialRecordCount < 1
      || sourceMaterialRecordCount > EVIDENCE_CORPUS_BOUNDED_TEXT_FAN_IN_MAX_RECORDS
      || !Array.isArray(params.sourceMaterialPageSummary.sourceMaterialRecords)
      || params.sourceMaterialPageSummary.sourceMaterialRecords.length !== sourceMaterialRecordCount
    ) {
      return failure(
        failureParams,
        "blocked_pre_bounded_corpus_text_record_count_unsupported",
        "source_material_record_count_unsupported",
      );
    }
    const sourceMaterialRecords: SourceMaterialPageSummaryRecord[] = [];
    const seenHashes = new Set<string>();
    for (const record of params.sourceMaterialPageSummary.sourceMaterialRecords) {
      const sourceMaterialRecord = validateSourceMaterialRecord(record);
      if (isValidationFailure(sourceMaterialRecord)) {
        return failure(failureParams, sourceMaterialRecord.status, sourceMaterialRecord.stopReason);
      }
      if (seenHashes.has(sourceMaterialRecord.sourceMaterialTextHash)) {
        continue;
      }
      seenHashes.add(sourceMaterialRecord.sourceMaterialTextHash);
      sourceMaterialRecords.push(sourceMaterialRecord);
    }
    if (params.admissionRuntimeOwnership !== "owned") {
      return failure(
        failureParams,
        "blocked_pre_bounded_corpus_text_w4c_not_runtime_owned",
        "w4c_not_runtime_owned",
      );
    }
    if (
      !isRecord(params.sourceMaterialAdmission)
      || params.sourceMaterialAdmission.status !== "source_material_admitted_to_corpus_input_gate_closed"
      || params.sourceMaterialAdmission.stopReason !== "not_stopped"
    ) {
      return failure(failureParams, "blocked_pre_bounded_corpus_text_w4c_not_positive", "w4c_not_completed");
    }
    if (params.shellRuntimeOwnership !== "owned") {
      return failure(
        failureParams,
        "blocked_pre_bounded_corpus_text_w4d_not_runtime_owned",
        "w4d_not_runtime_owned",
      );
    }
    if (
      !isRecord(params.evidenceCorpusShell)
      || params.evidenceCorpusShell.status !== "evidence_corpus_shell_created_extraction_gate_closed"
      || params.evidenceCorpusShell.stopReason !== "not_stopped"
      || !isRecord(params.evidenceCorpusShell.evidenceCorpus)
      || params.evidenceCorpusShell.evidenceCorpus.kind !== "shell_only"
      || params.evidenceCorpusShell.evidenceCorpus.corpusTextAccess !== "closed"
    ) {
      return failure(failureParams, "blocked_pre_bounded_corpus_text_w4d_not_positive", "w4d_shell_not_created");
    }
    if (
      !isRecord(params.extractionReadinessDenial)
      || params.extractionReadinessDenial.status !== "extraction_denied_shell_only"
      || params.extractionReadinessDenial.stopReason !== "shell_only_corpus"
      || params.extractionReadinessDenial.extractionInput !== null
      || !Array.isArray(params.extractionReadinessDenial.evidenceItems)
      || params.extractionReadinessDenial.evidenceItems.length !== 0
    ) {
      return failure(failureParams, "blocked_pre_bounded_corpus_text_w4e_not_denial", "w4e_denial_not_confirmed");
    }

    const closedFailure = validateClosedDownstream({
      sourceMaterialAdmission:
        params.sourceMaterialAdmission as unknown as EvidenceCorpusSourceMaterialAdmissionDecision,
      evidenceCorpusShell: params.evidenceCorpusShell as unknown as EvidenceCorpusShellDecision,
      extractionReadinessDenial:
        params.extractionReadinessDenial as unknown as EvidenceCorpusExtractionReadinessDenialDecision,
    });
    if (closedFailure) {
      return failure(failureParams, closedFailure.status, closedFailure.stopReason);
    }

    const boundedTextSidecars: EvidenceCorpusBoundedTextSidecar[] = [];
    for (const sourceMaterialRecord of sourceMaterialRecords) {
      const boundedTextSidecar = buildSidecar({
        sourceMaterialRecord,
        sourceMaterialAdmission:
          params.sourceMaterialAdmission as unknown as EvidenceCorpusSourceMaterialAdmissionDecision,
        evidenceCorpusShell: params.evidenceCorpusShell as unknown as EvidenceCorpusShellDecision,
        extractionReadinessDenial:
          params.extractionReadinessDenial as unknown as EvidenceCorpusExtractionReadinessDenialDecision,
      });
      if ("status" in boundedTextSidecar) {
        return failure(failureParams, boundedTextSidecar.status, boundedTextSidecar.stopReason);
      }
      boundedTextSidecars.push(boundedTextSidecar);
    }
    const aggregateTextByteLength = Buffer.byteLength(
      boundedTextSidecars.map((sidecar) => sidecar.text).join("\n\n"),
      "utf8",
    );
    if (aggregateTextByteLength > EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES) {
      return failure(
        failureParams,
        "blocked_pre_bounded_corpus_text_oversized",
        "source_material_text_oversized",
      );
    }

    return decision({
      ...failureParams,
      status: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
      stopReason: "not_stopped",
      boundedTextSidecars,
    });
  } catch {
    return decision({
      sourceMaterialPageSummary: params.sourceMaterialPageSummary,
      sourceMaterialRuntimeOwnership: params.sourceMaterialRuntimeOwnership,
      sourceMaterialAdmission: params.sourceMaterialAdmission,
      admissionRuntimeOwnership: params.admissionRuntimeOwnership,
      evidenceCorpusShell: params.evidenceCorpusShell,
      shellRuntimeOwnership: params.shellRuntimeOwnership,
      extractionReadinessDenial: params.extractionReadinessDenial,
      status: "bounded_corpus_text_authorization_damaged_structural",
      stopReason: "structural_exception",
    });
  }
}
