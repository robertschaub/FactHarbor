import {
  EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_MAX_TEXT_BYTES,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS,
  type EvidenceCorpusAdmissionInput,
  type EvidenceCorpusSourceMaterialAdmissionDecision,
  type EvidenceCorpusSourceMaterialAdmissionStatus,
  type EvidenceCorpusSourceMaterialAdmissionStopReason,
} from "./source-material-admission";

export const EVIDENCE_CORPUS_SHELL_DECISION_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d";

export const EVIDENCE_CORPUS_SHELL_VERSION =
  "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d";

export type EvidenceCorpusShellRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

export type EvidenceCorpusShellStatus =
  | "evidence_corpus_shell_created_extraction_gate_closed"
  | "blocked_pre_evidence_corpus_admission_absent"
  | "blocked_pre_evidence_corpus_admission_not_runtime_owned"
  | "blocked_pre_evidence_corpus_admission_mutated_after_provenance"
  | "blocked_pre_evidence_corpus_admission_not_admissible"
  | "blocked_pre_evidence_corpus_readiness_lineage_invalid"
  | "blocked_pre_evidence_corpus_source_material_metadata_incomplete"
  | "blocked_pre_evidence_corpus_source_material_record_count_unsupported"
  | "blocked_pre_evidence_corpus_source_material_hash_invalid"
  | "blocked_pre_evidence_corpus_source_material_oversized"
  | "blocked_pre_evidence_corpus_source_material_leakage_risk"
  | "blocked_pre_evidence_corpus_downstream_execution_not_authorized"
  | "evidence_corpus_shell_damaged_structural";

export type EvidenceCorpusShellStopReason =
  | "not_stopped"
  | "w4c_not_completed"
  | "w4c_admission_not_positive"
  | "runtime_ownership_missing"
  | "admission_post_mark_mutated"
  | "readiness_lineage_inconsistent"
  | "source_material_metadata_incomplete"
  | "source_material_identity_missing"
  | "source_material_hash_missing"
  | "source_material_hash_invalid"
  | "source_material_length_invalid"
  | "source_material_record_count_unsupported"
  | "raw_leakage_marker_detected"
  | "downstream_execution_not_authorized"
  | "structural_exception";

export type EvidenceCorpusShellParentSummary = {
  readonly admissionDecisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION | null;
  readonly admissionStatus: EvidenceCorpusSourceMaterialAdmissionStatus | string | null;
  readonly admissionStopReason: EvidenceCorpusSourceMaterialAdmissionStopReason | string | null;
};

export type EvidenceCorpusShell = {
  readonly shellVersion: typeof EVIDENCE_CORPUS_SHELL_VERSION;
  readonly evidenceCorpusId: string;
  readonly kind: "shell_only";
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly sourceMaterialRefs: readonly string[];
  readonly locatorRefs: readonly string[];
  readonly candidatePreviewIds: readonly string[];
  readonly providerIds: readonly string[];
  readonly sourceMaterialEndpointIds: readonly string[];
  readonly languageCodes: readonly string[];
  readonly sourceMaterialKinds: readonly "wikimedia_page_summary_extract_text"[];
  readonly sourceMaterialTextHashes: readonly string[];
  readonly aggregateSourceMaterialTextByteLength: number;
  readonly aggregateSourceMaterialTextCharLength: number;
  readonly admissionLineage: {
    readonly admissionDecisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION;
    readonly admissionStatus: "source_material_admitted_to_corpus_input_gate_closed";
    readonly admissionStopReason: "not_stopped";
    readonly corpusAdmissionInputId: string;
    readonly corpusAdmissionInputIds: readonly string[];
  };
  readonly readinessLineage: {
    readonly readinessDecisionVersion: string;
    readonly readinessStatus: string;
    readonly readinessStopReason: string;
  };
  readonly corpusTextAccess: "closed";
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly downstreamExecution: EvidenceCorpusShellClosedExecutionFlags;
};

export type EvidenceCorpusShellClosedExecutionFlags = {
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

export type EvidenceCorpusShellDecision = {
  readonly decisionVersion: typeof EVIDENCE_CORPUS_SHELL_DECISION_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: EvidenceCorpusShellStatus;
  readonly stopReason: EvidenceCorpusShellStopReason;
  readonly parent: EvidenceCorpusShellParentSummary;
  readonly sourceMaterialRecordCount: number;
  readonly evidenceCorpus: EvidenceCorpusShell | null;
  readonly evidenceItems: readonly [];
  readonly extractionInput: null;
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly downstreamGate: "evidence_item_extraction_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly productExecution: {
    readonly evidenceCorpusShellCreated: boolean;
    readonly semanticExtractionAuthorized: false;
    readonly evidenceItemExtractionAuthorized: false;
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
};

type ValidationFailure = {
  readonly status: Exclude<EvidenceCorpusShellStatus, "evidence_corpus_shell_created_extraction_gate_closed">;
  readonly stopReason: Exclude<EvidenceCorpusShellStopReason, "not_stopped">;
};

const ADMISSION_DECISION_KEYS = [
  "admittedCorpusAdmissionInputCount",
  "corpusAdmissionInput",
  "corpusAdmissionInputs",
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
  "rejectedCorpusAdmissionInputCount",
  "sourceMaterialRecordCount",
  "status",
  "stopReason",
  "visibility",
].sort();

const CORPUS_ADMISSION_INPUT_KEYS = [
  "candidatePreviewId",
  "contentTypeCategory",
  "corpusAdmissionInputId",
  "downstreamExecution",
  "inputVersion",
  "languageCode",
  "locatorRef",
  "providerId",
  "readinessDecisionVersion",
  "readinessStatus",
  "readinessStopReason",
  "responseStatusCategory",
  "sourceMaterialEndpointId",
  "sourceMaterialKind",
  "sourceMaterialRecordCount",
  "sourceMaterialRef",
  "sourceMaterialTextByteLength",
  "sourceMaterialTextCharLength",
  "sourceMaterialTextHash",
  "truncationApplied",
].sort();

const SOURCE_MATERIAL_READINESS_VERSION =
  "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a";

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

function parentSummary(input: unknown): EvidenceCorpusShellParentSummary {
  if (!isRecord(input)) {
    return {
      admissionDecisionVersion: null,
      admissionStatus: null,
      admissionStopReason: null,
    };
  }

  return {
    admissionDecisionVersion: input.decisionVersion === EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION
      ? EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION
      : null,
    admissionStatus: safeStatus(input.status),
    admissionStopReason: safeStatus(input.stopReason),
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

function closedExecutionFlags(): EvidenceCorpusShellClosedExecutionFlags {
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

function decision(params: {
  readonly input: unknown;
  readonly status: EvidenceCorpusShellStatus;
  readonly stopReason: EvidenceCorpusShellStopReason;
  readonly evidenceCorpus?: EvidenceCorpusShell | null;
}): EvidenceCorpusShellDecision {
  const evidenceCorpus = params.evidenceCorpus ?? null;
  const input = isRecord(params.input) ? params.input : null;

  return {
    decisionVersion: EVIDENCE_CORPUS_SHELL_DECISION_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: params.status,
    stopReason: params.stopReason,
    parent: parentSummary(params.input),
    sourceMaterialRecordCount: boundedCount(input?.sourceMaterialRecordCount),
    evidenceCorpus,
    evidenceItems: [],
    extractionInput: null,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      evidenceCorpusShellCreated: evidenceCorpus !== null,
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
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
    },
  };
}

function failure(
  input: unknown,
  status: ValidationFailure["status"],
  stopReason: ValidationFailure["stopReason"],
): EvidenceCorpusShellDecision {
  return decision({ input, status, stopReason });
}

function downstreamExecutionRemainsClosed(admission: Record<string, unknown>): boolean {
  if (admission.extractionInput !== null || admission.evidenceCorpus !== null) {
    return false;
  }
  if (admission.evidenceCorpusBuildAuthorized !== false) {
    return false;
  }
  if (!Array.isArray(admission.evidenceItems) || admission.evidenceItems.length !== 0) {
    return false;
  }
  if (admission.downstreamGate !== "evidence_corpus_construction_gate_closed") {
    return false;
  }
  if (admission.publicCutoverStatus !== "blocked_precutover") {
    return false;
  }
  const productExecution = admission.productExecution;
  return isRecord(productExecution)
    && productExecution.sourceMaterialReadinessObserved === true
    && productExecution.corpusAdmissionInputCreated === true
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

function validateAdmissionInput(value: unknown): EvidenceCorpusAdmissionInput | ValidationFailure {
  if (!isRecord(value) || !hasExactKeys(value, CORPUS_ADMISSION_INPUT_KEYS)) {
    return {
      status: "blocked_pre_evidence_corpus_admission_not_admissible",
      stopReason: "structural_exception",
    };
  }
  if (value.inputVersion !== EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION) {
    return {
      status: "blocked_pre_evidence_corpus_admission_not_admissible",
      stopReason: "w4c_admission_not_positive",
    };
  }
  if (
    value.readinessDecisionVersion !== SOURCE_MATERIAL_READINESS_VERSION
    || value.readinessStatus !== "source_material_structurally_admissible_evidence_corpus_gate_closed"
    || value.readinessStopReason !== "not_stopped"
  ) {
    return {
      status: "blocked_pre_evidence_corpus_readiness_lineage_invalid",
      stopReason: "readiness_lineage_inconsistent",
    };
  }
  const sourceMaterialRecordCount = value.sourceMaterialRecordCount;
  if (
    !Number.isInteger(sourceMaterialRecordCount)
    || Number(sourceMaterialRecordCount) < 1
    || Number(sourceMaterialRecordCount) > EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_record_count_unsupported",
      stopReason: "source_material_record_count_unsupported",
    };
  }
  const sourceMaterialRef = value.sourceMaterialRef;
  const locatorRef = value.locatorRef;
  const candidatePreviewId = value.candidatePreviewId;
  const providerId = value.providerId;
  const sourceMaterialEndpointId = value.sourceMaterialEndpointId;
  const languageCode = value.languageCode;
  const corpusAdmissionInputId = value.corpusAdmissionInputId;
  if (
    !isNonBlankString(sourceMaterialRef)
    || !isNonBlankString(locatorRef)
    || !isNonBlankString(candidatePreviewId)
    || !isNonBlankString(providerId)
    || !isNonBlankString(sourceMaterialEndpointId)
    || !isNonBlankString(languageCode)
    || !isNonBlankString(corpusAdmissionInputId)
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_metadata_incomplete",
      stopReason: "source_material_metadata_incomplete",
    };
  }
  if (value.sourceMaterialKind !== "wikimedia_page_summary_extract_text") {
    return {
      status: "blocked_pre_evidence_corpus_source_material_metadata_incomplete",
      stopReason: "source_material_identity_missing",
    };
  }
  const sourceMaterialTextHash = value.sourceMaterialTextHash;
  if (!isNonBlankString(sourceMaterialTextHash)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_hash_invalid",
      stopReason: "source_material_hash_missing",
    };
  }
  if (!/^[a-f0-9]{64}$/.test(sourceMaterialTextHash)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_hash_invalid",
      stopReason: "source_material_hash_invalid",
    };
  }
  const sourceMaterialTextByteLength = value.sourceMaterialTextByteLength;
  const sourceMaterialTextCharLength = value.sourceMaterialTextCharLength;
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
  if (
    value.responseStatusCategory !== "success_2xx"
    || value.contentTypeCategory !== "accepted_json"
    || value.truncationApplied !== false
  ) {
    return {
      status: "blocked_pre_evidence_corpus_admission_not_admissible",
      stopReason: "w4c_admission_not_positive",
    };
  }
  const downstreamExecution = value.downstreamExecution;
  if (
    !isRecord(downstreamExecution)
    || downstreamExecution.evidenceCorpusBuildAuthorized !== false
    || downstreamExecution.parserExecuted !== false
    || downstreamExecution.cacheRead !== false
    || downstreamExecution.cacheWrite !== false
    || downstreamExecution.storageWrite !== false
    || downstreamExecution.sourceReliabilityCalled !== false
    || downstreamExecution.evidenceCorpusCreated !== false
    || downstreamExecution.evidenceItemGenerated !== false
    || downstreamExecution.warningGenerated !== false
    || downstreamExecution.reportGenerated !== false
    || downstreamExecution.verdictGenerated !== false
    || downstreamExecution.confidenceGenerated !== false
    || downstreamExecution.publicSurfaceWritten !== false
  ) {
    return {
      status: "blocked_pre_evidence_corpus_downstream_execution_not_authorized",
      stopReason: "downstream_execution_not_authorized",
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
      corpusAdmissionInputId,
      sourceMaterialTextHash,
    ])
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }

  return value as EvidenceCorpusAdmissionInput;
}

function isValidationFailure(value: EvidenceCorpusAdmissionInput | EvidenceCorpusShell | ValidationFailure):
  value is ValidationFailure {
  return "status" in value;
}

function buildCorpusShell(inputs: readonly EvidenceCorpusAdmissionInput[]): EvidenceCorpusShell | ValidationFailure {
  if (inputs.length < 1 || inputs.length > EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_record_count_unsupported",
      stopReason: "source_material_record_count_unsupported",
    };
  }
  const expectedRecordCount = inputs.length;
  const validatedInputs: EvidenceCorpusAdmissionInput[] = [];
  const seenInputIds = new Set<string>();
  const seenHashes = new Set<string>();
  for (const input of inputs) {
    const validated = validateAdmissionInput(input);
    if (isValidationFailure(validated)) {
      return validated;
    }
    if (
      validated.sourceMaterialRecordCount !== expectedRecordCount
      || seenInputIds.has(validated.corpusAdmissionInputId)
      || seenHashes.has(validated.sourceMaterialTextHash)
    ) {
      return {
        status: "blocked_pre_evidence_corpus_source_material_record_count_unsupported",
        stopReason: "source_material_record_count_unsupported",
      };
    }
    seenInputIds.add(validated.corpusAdmissionInputId);
    seenHashes.add(validated.sourceMaterialTextHash);
    validatedInputs.push(validated);
  }

  const aggregateHash = validatedInputs.map((input) => input.sourceMaterialTextHash).join(".");
  return {
    shellVersion: EVIDENCE_CORPUS_SHELL_VERSION,
    evidenceCorpusId: `EVIDENCE_CORPUS_SHELL_${aggregateHash.slice(0, 16).toUpperCase()}`,
    kind: "shell_only",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    sourceMaterialRefs: validatedInputs.map((input) => input.sourceMaterialRef),
    locatorRefs: validatedInputs.map((input) => input.locatorRef),
    candidatePreviewIds: validatedInputs.map((input) => input.candidatePreviewId),
    providerIds: validatedInputs.map((input) => input.providerId),
    sourceMaterialEndpointIds: validatedInputs.map((input) => input.sourceMaterialEndpointId),
    languageCodes: validatedInputs.map((input) => input.languageCode),
    sourceMaterialKinds: validatedInputs.map(() => "wikimedia_page_summary_extract_text"),
    sourceMaterialTextHashes: validatedInputs.map((input) => input.sourceMaterialTextHash),
    aggregateSourceMaterialTextByteLength: validatedInputs.reduce(
      (total, input) => total + input.sourceMaterialTextByteLength,
      0,
    ),
    aggregateSourceMaterialTextCharLength: validatedInputs.reduce(
      (total, input) => total + input.sourceMaterialTextCharLength,
      0,
    ),
    admissionLineage: {
      admissionDecisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      admissionStopReason: "not_stopped",
      corpusAdmissionInputId: validatedInputs[0].corpusAdmissionInputId,
      corpusAdmissionInputIds: validatedInputs.map((input) => input.corpusAdmissionInputId),
    },
    readinessLineage: {
      readinessDecisionVersion: SOURCE_MATERIAL_READINESS_VERSION,
      readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      readinessStopReason: "not_stopped",
    },
    corpusTextAccess: "closed",
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamExecution: closedExecutionFlags(),
  };
}

export function buildEvidenceCorpusShell(params: {
  readonly sourceMaterialAdmission: unknown;
  readonly runtimeOwnership: EvidenceCorpusShellRuntimeOwnership;
}): EvidenceCorpusShellDecision {
  try {
    if (!isRecord(params.sourceMaterialAdmission)) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_absent",
        "w4c_not_completed",
      );
    }
    if (params.sourceMaterialAdmission.decisionVersion !== EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_absent",
        "w4c_not_completed",
      );
    }
    if (params.runtimeOwnership === "mutated_after_provenance") {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_mutated_after_provenance",
        "admission_post_mark_mutated",
      );
    }
    if (params.runtimeOwnership !== "owned") {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_not_runtime_owned",
        "runtime_ownership_missing",
      );
    }
    if (!hasExactKeys(params.sourceMaterialAdmission, ADMISSION_DECISION_KEYS)) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_not_admissible",
        "structural_exception",
      );
    }
    if (
      params.sourceMaterialAdmission.status !== "source_material_admitted_to_corpus_input_gate_closed"
      || params.sourceMaterialAdmission.stopReason !== "not_stopped"
    ) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_not_admissible",
        "w4c_admission_not_positive",
      );
    }
    const sourceMaterialRecordCount = boundedCount(params.sourceMaterialAdmission.sourceMaterialRecordCount);
    if (
      sourceMaterialRecordCount < 1
      || sourceMaterialRecordCount > EVIDENCE_CORPUS_SOURCE_MATERIAL_FAN_IN_MAX_RECORDS
      || params.sourceMaterialAdmission.admittedCorpusAdmissionInputCount !== sourceMaterialRecordCount
      || params.sourceMaterialAdmission.rejectedCorpusAdmissionInputCount !== 0
      || !Array.isArray(params.sourceMaterialAdmission.corpusAdmissionInputs)
      || params.sourceMaterialAdmission.corpusAdmissionInputs.length !== sourceMaterialRecordCount
    ) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_source_material_record_count_unsupported",
        "source_material_record_count_unsupported",
      );
    }
    if (
      isRecord(params.sourceMaterialAdmission.corpusAdmissionInput)
      && isRecord(params.sourceMaterialAdmission.corpusAdmissionInputs[0])
      && params.sourceMaterialAdmission.corpusAdmissionInput.sourceMaterialTextHash !==
        params.sourceMaterialAdmission.corpusAdmissionInputs[0].sourceMaterialTextHash
    ) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_admission_not_admissible",
        "structural_exception",
      );
    }
    if (!downstreamExecutionRemainsClosed(params.sourceMaterialAdmission)) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_downstream_execution_not_authorized",
        "downstream_execution_not_authorized",
      );
    }
    if (containsForbiddenStructuralMarker(params.sourceMaterialAdmission)) {
      return failure(
        params.sourceMaterialAdmission,
        "blocked_pre_evidence_corpus_source_material_leakage_risk",
        "raw_leakage_marker_detected",
      );
    }

    const evidenceCorpus = buildCorpusShell(params.sourceMaterialAdmission.corpusAdmissionInputs);
    if (isValidationFailure(evidenceCorpus)) {
      return failure(params.sourceMaterialAdmission, evidenceCorpus.status, evidenceCorpus.stopReason);
    }

    return decision({
      input: params.sourceMaterialAdmission as EvidenceCorpusSourceMaterialAdmissionDecision,
      status: "evidence_corpus_shell_created_extraction_gate_closed",
      stopReason: "not_stopped",
      evidenceCorpus,
    });
  } catch {
    return failure(
      params.sourceMaterialAdmission,
      "evidence_corpus_shell_damaged_structural",
      "structural_exception",
    );
  }
}

export function isEvidenceCorpusShellExtractionReady(value: unknown): false {
  if (isRecord(value) && value.kind === "shell_only") {
    return false;
  }
  return false;
}
