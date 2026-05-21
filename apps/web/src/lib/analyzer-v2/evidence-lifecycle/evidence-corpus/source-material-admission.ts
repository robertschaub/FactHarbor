import {
  EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS,
  type EvidenceCorpusSourceMaterialReadinessDecision,
  type EvidenceCorpusSourceMaterialReadinessStatus,
  type EvidenceCorpusSourceMaterialReadinessStopReason,
} from "./source-material-readiness";

export const EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c";

export const EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-admission-input.x7w4c";

export const EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_MAX_TEXT_BYTES = 4096;

export type EvidenceCorpusSourceMaterialAdmissionStatus =
  | "source_material_admitted_to_corpus_input_gate_closed"
  | "blocked_pre_evidence_corpus_readiness_absent"
  | "blocked_pre_evidence_corpus_readiness_not_runtime_owned"
  | "blocked_pre_evidence_corpus_readiness_not_admissible"
  | "blocked_pre_evidence_corpus_source_material_kind_unsupported"
  | "blocked_pre_evidence_corpus_source_material_hash_invalid"
  | "blocked_pre_evidence_corpus_source_material_oversized"
  | "blocked_pre_evidence_corpus_source_material_leakage_risk"
  | "blocked_pre_evidence_corpus_downstream_execution_not_authorized"
  | "evidence_corpus_source_material_admission_damaged_structural";

export type EvidenceCorpusSourceMaterialAdmissionStopReason =
  | "not_stopped"
  | "w4a_not_completed"
  | "runtime_ownership_missing"
  | "source_material_kind_unsupported"
  | "source_material_identity_missing"
  | "source_material_hash_missing"
  | "source_material_length_invalid"
  | "source_material_record_count_unsupported"
  | "raw_leakage_marker_detected"
  | "downstream_execution_not_authorized"
  | "structural_exception";

export type EvidenceCorpusSourceMaterialAdmissionParentSummary = {
  readonly readinessDecisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION | null;
  readonly readinessStatus: EvidenceCorpusSourceMaterialReadinessStatus | string | null;
  readonly readinessStopReason: EvidenceCorpusSourceMaterialReadinessStopReason | string | null;
};

export type EvidenceCorpusAdmissionInput = {
  readonly inputVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION;
  readonly corpusAdmissionInputId: string;
  readonly sourceMaterialRef: string;
  readonly locatorRef: string;
  readonly candidatePreviewId: string;
  readonly providerId: string;
  readonly sourceMaterialEndpointId: string;
  readonly sourceMaterialKind: "wikimedia_page_summary_extract_text";
  readonly languageCode: string;
  readonly sourceMaterialTextHash: string;
  readonly sourceMaterialTextByteLength: number;
  readonly sourceMaterialTextCharLength: number;
  readonly responseStatusCategory: "success_2xx";
  readonly contentTypeCategory: "accepted_json";
  readonly truncationApplied: false;
  readonly sourceMaterialRecordCount: number;
  readonly readinessDecisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION;
  readonly readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed";
  readonly readinessStopReason: "not_stopped";
  readonly downstreamExecution: {
    readonly evidenceCorpusBuildAuthorized: false;
    readonly parserExecuted: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly storageWrite: false;
    readonly sourceReliabilityCalled: false;
    readonly evidenceCorpusCreated: false;
    readonly evidenceItemGenerated: false;
    readonly warningGenerated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicSurfaceWritten: false;
  };
};

export type EvidenceCorpusSourceMaterialAdmissionDecision = {
  readonly decisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: EvidenceCorpusSourceMaterialAdmissionStatus;
  readonly stopReason: EvidenceCorpusSourceMaterialAdmissionStopReason;
  readonly parent: EvidenceCorpusSourceMaterialAdmissionParentSummary;
  readonly sourceMaterialRecordCount: number;
  readonly admittedCorpusAdmissionInputCount: number;
  readonly rejectedCorpusAdmissionInputCount: number;
  readonly corpusAdmissionInput: EvidenceCorpusAdmissionInput | null;
  readonly corpusAdmissionInputs: readonly EvidenceCorpusAdmissionInput[];
  readonly evidenceCorpus: null;
  readonly evidenceCorpusBuildAuthorized: false;
  readonly evidenceItems: readonly [];
  readonly extractionInput: null;
  readonly downstreamGate: "evidence_corpus_construction_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly productExecution: {
    readonly sourceMaterialReadinessObserved: boolean;
    readonly corpusAdmissionInputCreated: boolean;
    readonly evidenceCorpusBuildAuthorized: false;
    readonly parserExecuted: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly storageWrite: false;
    readonly sourceReliabilityCalled: false;
    readonly evidenceCorpusCreated: false;
    readonly evidenceItemGenerated: false;
    readonly warningGenerated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicSurfaceWritten: false;
  };
};

type ValidationFailure = {
  readonly status: Exclude<
    EvidenceCorpusSourceMaterialAdmissionStatus,
    "source_material_admitted_to_corpus_input_gate_closed"
  >;
  readonly stopReason: Exclude<EvidenceCorpusSourceMaterialAdmissionStopReason, "not_stopped">;
};

const READINESS_DECISION_KEYS = [
  "admittedSourceMaterialRecordCount",
  "decisionVersion",
  "downstreamGate",
  "evidenceCorpus",
  "evidenceCorpusBuildAuthorized",
  "evidenceItems",
  "extractionInput",
  "parent",
  "productExecution",
  "publicCutoverStatus",
  "publicPointerExposure",
  "rejectedSourceMaterialRecordCount",
  "sourceMaterialRecord",
  "sourceMaterialRecords",
  "sourceMaterialRecordCount",
  "status",
  "stopReason",
  "visibility",
].sort();

const SOURCE_MATERIAL_RECORD_KEYS = [
  "candidatePreviewId",
  "contentTypeCategory",
  "languageCode",
  "locatorRef",
  "providerId",
  "responseStatusCategory",
  "sourceMaterialEndpointId",
  "sourceMaterialId",
  "sourceMaterialKind",
  "sourceMaterialRef",
  "sourceMaterialTextByteLength",
  "sourceMaterialTextCharLength",
  "sourceMaterialTextHash",
].sort();

const FORBIDDEN_STRUCTURAL_MARKERS = [
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
  "raw_title",
  "raw_page_key",
  "raw_url",
  "raw_header",
  "raw_error",
  "source_material_text",
  "sourceMaterialText",
  "reportmarkdown",
  "truthpercentage",
  "confidence:",
  "verdict",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function boundedCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function safeStatus(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9_.-]+$/.test(value) ? value : null;
}

function parentSummary(input: unknown): EvidenceCorpusSourceMaterialAdmissionParentSummary {
  if (!isRecord(input)) {
    return {
      readinessDecisionVersion: null,
      readinessStatus: null,
      readinessStopReason: null,
    };
  }

  return {
    readinessDecisionVersion: input.decisionVersion === EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION
      ? EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION
      : null,
    readinessStatus: safeStatus(input.status),
    readinessStopReason: safeStatus(input.stopReason),
  };
}

function containsForbiddenStructuralMarker(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return FORBIDDEN_STRUCTURAL_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
  }
  if (Array.isArray(value)) {
    return value.some(containsForbiddenStructuralMarker);
  }
  if (isRecord(value)) {
    return Object.values(value).some(containsForbiddenStructuralMarker);
  }
  return false;
}

function decision(params: {
  readonly input: unknown;
  readonly status: EvidenceCorpusSourceMaterialAdmissionStatus;
  readonly stopReason: EvidenceCorpusSourceMaterialAdmissionStopReason;
  readonly corpusAdmissionInput?: EvidenceCorpusAdmissionInput | null;
  readonly corpusAdmissionInputs?: readonly EvidenceCorpusAdmissionInput[];
}): EvidenceCorpusSourceMaterialAdmissionDecision {
  const corpusAdmissionInputs = params.corpusAdmissionInputs ?? (params.corpusAdmissionInput ? [params.corpusAdmissionInput] : []);
  const corpusAdmissionInput = corpusAdmissionInputs[0] ?? params.corpusAdmissionInput ?? null;
  const input = isRecord(params.input) ? params.input : null;
  const sourceMaterialRecordCount = boundedCount(input?.sourceMaterialRecordCount);
  const admittedCorpusAdmissionInputCount =
    params.status === "source_material_admitted_to_corpus_input_gate_closed" ? corpusAdmissionInputs.length : 0;

  return {
    decisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: params.status,
    stopReason: params.stopReason,
    parent: parentSummary(params.input),
    sourceMaterialRecordCount,
    admittedCorpusAdmissionInputCount,
    rejectedCorpusAdmissionInputCount: Math.max(0, sourceMaterialRecordCount - admittedCorpusAdmissionInputCount),
    corpusAdmissionInput,
    corpusAdmissionInputs,
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
    extractionInput: null,
    downstreamGate: "evidence_corpus_construction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      sourceMaterialReadinessObserved: input !== null,
      corpusAdmissionInputCreated: corpusAdmissionInput !== null,
      evidenceCorpusBuildAuthorized: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  };
}

function failure(
  input: unknown,
  status: ValidationFailure["status"],
  stopReason: ValidationFailure["stopReason"],
): EvidenceCorpusSourceMaterialAdmissionDecision {
  return decision({ input, status, stopReason });
}

function downstreamExecutionRemainsClosed(readiness: Record<string, unknown>): boolean {
  if (readiness.extractionInput !== null || readiness.evidenceCorpus !== null) {
    return false;
  }
  if (readiness.evidenceCorpusBuildAuthorized !== false) {
    return false;
  }
  if (!Array.isArray(readiness.evidenceItems) || readiness.evidenceItems.length !== 0) {
    return false;
  }
  if (readiness.downstreamGate !== "evidence_corpus_build_gate_closed") {
    return false;
  }
  if (readiness.publicCutoverStatus !== "blocked_precutover") {
    return false;
  }
  const productExecution = readiness.productExecution;
  return isRecord(productExecution)
    && productExecution.sourceMaterialReadinessObserved === true
    && productExecution.sourceMaterialCreated === true
    && productExecution.evidenceCorpusBuildAuthorized === false
    && productExecution.parserExecuted === false
    && productExecution.cacheRead === false
    && productExecution.cacheWrite === false
    && productExecution.storageWrite === false
    && productExecution.sourceReliabilityCalled === false
    && productExecution.evidenceCorpusCreated === false
    && productExecution.evidenceItemGenerated === false
    && productExecution.warningGenerated === false
    && productExecution.reportGenerated === false
    && productExecution.verdictGenerated === false
    && productExecution.confidenceGenerated === false
    && productExecution.publicSurfaceWritten === false;
}

function validateRecord(
  record: unknown,
  sourceMaterialRecordCount: number,
): EvidenceCorpusAdmissionInput | ValidationFailure {
  if (!isRecord(record) || !hasExactKeys(record, SOURCE_MATERIAL_RECORD_KEYS)) {
    return {
      status: "blocked_pre_evidence_corpus_readiness_not_admissible",
      stopReason: "structural_exception",
    };
  }
  if (record.sourceMaterialKind !== "wikimedia_page_summary_extract_text") {
    return {
      status: "blocked_pre_evidence_corpus_source_material_kind_unsupported",
      stopReason: "source_material_kind_unsupported",
    };
  }

  const sourceMaterialRef = record.sourceMaterialRef;
  const locatorRef = record.locatorRef;
  const candidatePreviewId = record.candidatePreviewId;
  const providerId = record.providerId;
  const sourceMaterialEndpointId = record.sourceMaterialEndpointId;
  const languageCode = record.languageCode;
  if (
    !isNonBlankString(sourceMaterialRef)
    || !isNonBlankString(locatorRef)
    || !isNonBlankString(candidatePreviewId)
    || !isNonBlankString(providerId)
    || !isNonBlankString(sourceMaterialEndpointId)
    || !isNonBlankString(languageCode)
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "source_material_identity_missing",
    };
  }

  const sourceMaterialTextHash = record.sourceMaterialTextHash;
  if (!isNonBlankString(sourceMaterialTextHash) || !/^[a-f0-9]{64}$/.test(sourceMaterialTextHash)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_hash_invalid",
      stopReason: "source_material_hash_missing",
    };
  }

  const sourceMaterialTextByteLength = record.sourceMaterialTextByteLength;
  const sourceMaterialTextCharLength = record.sourceMaterialTextCharLength;
  if (
    !Number.isInteger(sourceMaterialTextByteLength)
    || Number(sourceMaterialTextByteLength) <= 0
    || !Number.isInteger(sourceMaterialTextCharLength)
    || Number(sourceMaterialTextCharLength) <= 0
    || Number(sourceMaterialTextCharLength) > Number(sourceMaterialTextByteLength)
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_oversized",
      stopReason: "source_material_length_invalid",
    };
  }
  if (Number(sourceMaterialTextByteLength) > EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_MAX_TEXT_BYTES) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_oversized",
      stopReason: "source_material_length_invalid",
    };
  }
  if (record.responseStatusCategory !== "success_2xx" || record.contentTypeCategory !== "accepted_json") {
    return {
      status: "blocked_pre_evidence_corpus_readiness_not_admissible",
      stopReason: "w4a_not_completed",
    };
  }
  if (
    containsForbiddenStructuralMarker([
      sourceMaterialRef,
      locatorRef,
      candidatePreviewId,
      providerId,
      sourceMaterialEndpointId,
      languageCode,
      sourceMaterialTextHash,
    ])
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }

  return {
    inputVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION,
    corpusAdmissionInputId: `CORPUS_ADMISSION_INPUT_${sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
    sourceMaterialRef,
    locatorRef,
    candidatePreviewId,
    providerId,
    sourceMaterialEndpointId,
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    languageCode,
    sourceMaterialTextHash,
    sourceMaterialTextByteLength: Number(sourceMaterialTextByteLength),
    sourceMaterialTextCharLength: Number(sourceMaterialTextCharLength),
    responseStatusCategory: "success_2xx",
    contentTypeCategory: "accepted_json",
    truncationApplied: false,
    sourceMaterialRecordCount,
    readinessDecisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
    readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
    readinessStopReason: "not_stopped",
    downstreamExecution: {
      evidenceCorpusBuildAuthorized: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  };
}

function isValidationFailure(value: EvidenceCorpusAdmissionInput | ValidationFailure): value is ValidationFailure {
  return "status" in value;
}

export function buildEvidenceCorpusSourceMaterialAdmission(params: {
  readonly sourceMaterialReadiness: unknown;
  readonly runtimeOwned: boolean;
}): EvidenceCorpusSourceMaterialAdmissionDecision {
  try {
    if (!isRecord(params.sourceMaterialReadiness)) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_absent",
        "w4a_not_completed",
      );
    }
    if (params.sourceMaterialReadiness.decisionVersion !== EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_absent",
        "w4a_not_completed",
      );
    }
    if (!params.runtimeOwned) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_not_runtime_owned",
        "runtime_ownership_missing",
      );
    }
    if (!hasExactKeys(params.sourceMaterialReadiness, READINESS_DECISION_KEYS)) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_not_admissible",
        "structural_exception",
      );
    }
    if (
      params.sourceMaterialReadiness.status !== "source_material_structurally_admissible_evidence_corpus_gate_closed"
      || params.sourceMaterialReadiness.stopReason !== "not_stopped"
    ) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_not_admissible",
        "w4a_not_completed",
      );
    }
    const sourceMaterialRecordCount = boundedCount(params.sourceMaterialReadiness.sourceMaterialRecordCount);
    if (
      sourceMaterialRecordCount < 1
      || sourceMaterialRecordCount > EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS
      || params.sourceMaterialReadiness.admittedSourceMaterialRecordCount !== sourceMaterialRecordCount
      || params.sourceMaterialReadiness.rejectedSourceMaterialRecordCount !== 0
      || !Array.isArray(params.sourceMaterialReadiness.sourceMaterialRecords)
      || params.sourceMaterialReadiness.sourceMaterialRecords.length !== sourceMaterialRecordCount
    ) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_not_admissible",
        "source_material_record_count_unsupported",
      );
    }
    if (
      isRecord(params.sourceMaterialReadiness.sourceMaterialRecord)
      && isRecord(params.sourceMaterialReadiness.sourceMaterialRecords[0])
      && params.sourceMaterialReadiness.sourceMaterialRecord.sourceMaterialTextHash !==
        params.sourceMaterialReadiness.sourceMaterialRecords[0].sourceMaterialTextHash
    ) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_readiness_not_admissible",
        "structural_exception",
      );
    }
    if (!downstreamExecutionRemainsClosed(params.sourceMaterialReadiness)) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_downstream_execution_not_authorized",
        "downstream_execution_not_authorized",
      );
    }
    if (containsForbiddenStructuralMarker(params.sourceMaterialReadiness)) {
      return failure(
        params.sourceMaterialReadiness,
        "blocked_pre_evidence_corpus_source_material_leakage_risk",
        "raw_leakage_marker_detected",
      );
    }

    const corpusAdmissionInputs: EvidenceCorpusAdmissionInput[] = [];
    const seenInputIds = new Set<string>();
    for (const record of params.sourceMaterialReadiness.sourceMaterialRecords) {
      const corpusAdmissionInput = validateRecord(record, sourceMaterialRecordCount);
      if (isValidationFailure(corpusAdmissionInput)) {
        return failure(params.sourceMaterialReadiness, corpusAdmissionInput.status, corpusAdmissionInput.stopReason);
      }
      if (seenInputIds.has(corpusAdmissionInput.corpusAdmissionInputId)) {
        return failure(
          params.sourceMaterialReadiness,
          "blocked_pre_evidence_corpus_readiness_not_admissible",
          "source_material_record_count_unsupported",
        );
      }
      seenInputIds.add(corpusAdmissionInput.corpusAdmissionInputId);
      corpusAdmissionInputs.push(corpusAdmissionInput);
    }

    return decision({
      input: params.sourceMaterialReadiness as EvidenceCorpusSourceMaterialReadinessDecision,
      status: "source_material_admitted_to_corpus_input_gate_closed",
      stopReason: "not_stopped",
      corpusAdmissionInputs,
    });
  } catch {
    return failure(
      params.sourceMaterialReadiness,
      "evidence_corpus_source_material_admission_damaged_structural",
      "structural_exception",
    );
  }
}
