import { createHash } from "node:crypto";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
  SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES,
  SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
  SOURCE_MATERIAL_PAGE_SUMMARY_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";

export const EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION =
  "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a";

export type EvidenceCorpusSourceMaterialReadinessStatus =
  | "source_material_structurally_admissible_evidence_corpus_gate_closed"
  | "blocked_pre_evidence_corpus_source_material_absent"
  | "blocked_pre_evidence_corpus_parent_not_completed"
  | "blocked_pre_evidence_corpus_source_material_not_runtime_owned"
  | "blocked_pre_evidence_corpus_source_material_contract_invalid"
  | "blocked_pre_evidence_corpus_source_material_oversized"
  | "blocked_pre_evidence_corpus_source_material_leakage_risk"
  | "blocked_pre_evidence_corpus_downstream_gate_closed"
  | "source_material_to_evidence_corpus_readiness_damaged_structural";

export type EvidenceCorpusSourceMaterialReadinessStopReason =
  | "not_stopped"
  | "w3b_not_completed"
  | "source_material_record_missing"
  | "source_material_record_count_unsupported"
  | "runtime_ownership_missing"
  | "visibility_invalid"
  | "public_pointer_exposure_invalid"
  | "source_material_kind_unsupported"
  | "source_material_text_missing"
  | "source_material_text_oversized"
  | "source_material_hash_missing"
  | "fetch_diagnostic_not_success"
  | "raw_leakage_marker_detected"
  | "downstream_execution_not_authorized"
  | "structural_exception";

export type EvidenceCorpusSourceMaterialReadinessParentSummary = {
  readonly w2Status: string | null;
  readonly w3aStatus: string | null;
  readonly w3bStatus: string | null;
  readonly w3bVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_VERSION | null;
  readonly w3bStopReason: string | null;
};

export type EvidenceCorpusSourceMaterialReadinessRecordSummary = {
  readonly sourceMaterialId: string;
  readonly sourceMaterialRef: string;
  readonly locatorRef: string;
  readonly candidatePreviewId: string;
  readonly providerId: string;
  readonly sourceMaterialEndpointId: typeof SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID;
  readonly languageCode: string;
  readonly sourceMaterialKind: "wikimedia_page_summary_extract_text";
  readonly sourceMaterialTextHash: string;
  readonly sourceMaterialTextByteLength: number;
  readonly sourceMaterialTextCharLength: number;
  readonly responseStatusCategory: "success_2xx";
  readonly contentTypeCategory: "accepted_json";
};

export type EvidenceCorpusSourceMaterialReadinessDecision = {
  readonly decisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: EvidenceCorpusSourceMaterialReadinessStatus;
  readonly stopReason: EvidenceCorpusSourceMaterialReadinessStopReason;
  readonly parent: EvidenceCorpusSourceMaterialReadinessParentSummary;
  readonly sourceMaterialRecordCount: number;
  readonly admittedSourceMaterialRecordCount: number;
  readonly rejectedSourceMaterialRecordCount: number;
  readonly sourceMaterialRecord: EvidenceCorpusSourceMaterialReadinessRecordSummary | null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
  readonly evidenceCorpusBuildAuthorized: false;
  readonly evidenceItems: readonly [];
  readonly productExecution: {
    readonly sourceMaterialReadinessObserved: boolean;
    readonly sourceMaterialCreated: boolean;
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
  readonly downstreamGate: "evidence_corpus_build_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
};

type ValidationFailure = {
  readonly status: Exclude<
    EvidenceCorpusSourceMaterialReadinessStatus,
    "source_material_structurally_admissible_evidence_corpus_gate_closed"
  >;
  readonly stopReason: Exclude<EvidenceCorpusSourceMaterialReadinessStopReason, "not_stopped">;
};

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

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function charLength(value: string): number {
  return Array.from(value).length;
}

function boundedCount(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function safeStatus(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9_.-]+$/.test(value) ? value : null;
}

function parentSummary(input: unknown): EvidenceCorpusSourceMaterialReadinessParentSummary {
  if (!isRecord(input)) {
    return {
      w2Status: null,
      w3aStatus: null,
      w3bStatus: null,
      w3bVersion: null,
      w3bStopReason: null,
    };
  }

  return {
    w2Status: safeStatus(input.candidateProviderNetworkStatus),
    w3aStatus: safeStatus(input.sourceCandidatePreviewStatus),
    w3bStatus: safeStatus(input.status),
    w3bVersion: input.sourceMaterialVersion === SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
      ? SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
      : null,
    w3bStopReason: safeStatus(input.stopReason),
  };
}

function decision(
  params: {
    readonly input: unknown;
    readonly status: EvidenceCorpusSourceMaterialReadinessStatus;
    readonly stopReason: EvidenceCorpusSourceMaterialReadinessStopReason;
    readonly record?: EvidenceCorpusSourceMaterialReadinessRecordSummary | null;
  },
): EvidenceCorpusSourceMaterialReadinessDecision {
  const input = isRecord(params.input) ? params.input : null;
  const sourceMaterialRecordCount = boundedCount(input?.sourceMaterialRecordCount);
  const admittedSourceMaterialRecordCount =
    params.record && params.status === "source_material_structurally_admissible_evidence_corpus_gate_closed" ? 1 : 0;

  return {
    decisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: params.status,
    stopReason: params.stopReason,
    parent: parentSummary(params.input),
    sourceMaterialRecordCount,
    admittedSourceMaterialRecordCount,
    rejectedSourceMaterialRecordCount: Math.max(0, sourceMaterialRecordCount - admittedSourceMaterialRecordCount),
    sourceMaterialRecord: params.record ?? null,
    extractionInput: null,
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
    productExecution: {
      sourceMaterialReadinessObserved: true,
      sourceMaterialCreated: sourceMaterialRecordCount > 0,
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
    downstreamGate: "evidence_corpus_build_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function failure(
  input: unknown,
  status: ValidationFailure["status"],
  stopReason: ValidationFailure["stopReason"],
): EvidenceCorpusSourceMaterialReadinessDecision {
  return decision({ input, status, stopReason });
}

function containsForbiddenStructuralMarker(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return FORBIDDEN_STRUCTURAL_MARKERS.some((marker) => lower.includes(marker));
  }
  if (Array.isArray(value)) {
    return value.some(containsForbiddenStructuralMarker);
  }
  if (isRecord(value)) {
    return Object.values(value).some(containsForbiddenStructuralMarker);
  }
  return false;
}

function structuralFieldsForLeakScan(input: Record<string, unknown>): unknown {
  return {
    sourceMaterialVersion: input.sourceMaterialVersion,
    visibility: input.visibility,
    publicPointerExposure: input.publicPointerExposure,
    status: input.status,
    stopReason: input.stopReason,
    candidateProviderNetworkStatus: input.candidateProviderNetworkStatus,
    sourceCandidatePreviewStatus: input.sourceCandidatePreviewStatus,
    sourceMaterialEndpointId: input.sourceMaterialEndpointId,
    locatorVersion: input.locatorVersion,
    downstreamGate: input.downstreamGate,
    publicCutoverStatus: input.publicCutoverStatus,
    sourceMaterialRecords: Array.isArray(input.sourceMaterialRecords)
      ? input.sourceMaterialRecords.map((record) => {
        if (!isRecord(record)) {
          return record;
        }
        const { sourceMaterialText: _sourceMaterialText, ...structuralRecord } = record;
        return structuralRecord;
      })
      : input.sourceMaterialRecords,
    fetchDiagnostics: input.fetchDiagnostics,
  };
}

function downstreamW3BExecutionRemainsClosed(input: Record<string, unknown>): boolean {
  if (input.extractionInput !== null || input.evidenceCorpus !== null) {
    return false;
  }
  if (!Array.isArray(input.evidenceItems) || input.evidenceItems.length !== 0) {
    return false;
  }
  if (input.downstreamGate !== "source_material_to_evidence_corpus_gate_closed") {
    return false;
  }
  if (input.publicCutoverStatus !== "blocked_precutover") {
    return false;
  }
  const productExecution = input.productExecution;
  return isRecord(productExecution)
    && productExecution.candidateProviderNetworkObserved === true
    && productExecution.sourceCandidatePreviewObserved === true
    && productExecution.extraHttpCallMade === true
    && productExecution.contentDereferenceCalled === true
    && productExecution.sourceMaterialCreated === true
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

function validateRecord(record: unknown): EvidenceCorpusSourceMaterialReadinessRecordSummary | ValidationFailure {
  if (!isRecord(record)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "source_material_record_missing",
    };
  }
  if (record.recordVersion !== SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "structural_exception",
    };
  }
  if (record.publicPointerExposure !== "forbidden") {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "public_pointer_exposure_invalid",
    };
  }
  if (
    record.sourceMaterialKind !== "wikimedia_page_summary_extract_text"
    || record.sourceMaterialEndpointId !== SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "source_material_kind_unsupported",
    };
  }
  if (!isNonBlankString(record.sourceMaterialText)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "source_material_text_missing",
    };
  }
  const byteLength = utf8ByteLength(record.sourceMaterialText);
  if (byteLength > SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_oversized",
      stopReason: "source_material_text_oversized",
    };
  }
  if (!isNonBlankString(record.sourceMaterialTextHash)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "source_material_hash_missing",
    };
  }
  if (
    record.sourceMaterialTextHash !== sha256Text(record.sourceMaterialText)
    || record.sourceMaterialTextByteLength !== byteLength
    || record.sourceMaterialTextCharLength !== charLength(record.sourceMaterialText)
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "structural_exception",
    };
  }
  if (record.responseStatusCategory !== "success_2xx" || record.contentTypeCategory !== "accepted_json") {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "fetch_diagnostic_not_success",
    };
  }
  if (
    record.parserExecuted !== false
    || record.cacheRead !== false
    || record.cacheWrite !== false
    || record.storageWrite !== false
    || record.sourceReliabilityCalled !== false
    || record.evidenceCorpusCreated !== false
    || record.evidenceItemGenerated !== false
    || record.warningGenerated !== false
    || record.reportGenerated !== false
    || record.verdictGenerated !== false
    || record.confidenceGenerated !== false
    || record.publicSurfaceWritten !== false
  ) {
    return {
      status: "blocked_pre_evidence_corpus_downstream_gate_closed",
      stopReason: "downstream_execution_not_authorized",
    };
  }
  const sourceMaterialId = record.sourceMaterialId;
  const locatorRef = record.locatorRef;
  const candidatePreviewId = record.candidatePreviewId;
  const providerId = record.providerId;
  const sourceMaterialEndpointId = record.sourceMaterialEndpointId;
  const languageCode = record.languageCode;
  const sourceMaterialTextHash = record.sourceMaterialTextHash;
  if (
    !isNonBlankString(sourceMaterialId)
    || !isNonBlankString(locatorRef)
    || !isNonBlankString(candidatePreviewId)
    || !isNonBlankString(providerId)
    || !isNonBlankString(sourceMaterialEndpointId)
    || !isNonBlankString(languageCode)
    || !isNonBlankString(record.sourceMaterialKind)
    || !isNonBlankString(sourceMaterialTextHash)
    || [
      sourceMaterialId,
      locatorRef,
      candidatePreviewId,
      providerId,
      sourceMaterialEndpointId,
      languageCode,
      record.sourceMaterialKind,
      sourceMaterialTextHash,
    ].some(containsForbiddenStructuralMarker)
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }

  return {
    sourceMaterialId,
    sourceMaterialRef: sourceMaterialId,
    locatorRef,
    candidatePreviewId,
    providerId,
    sourceMaterialEndpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
    languageCode,
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    sourceMaterialTextHash,
    sourceMaterialTextByteLength: byteLength,
    sourceMaterialTextCharLength: charLength(record.sourceMaterialText),
    responseStatusCategory: "success_2xx",
    contentTypeCategory: "accepted_json",
  };
}

function validateDiagnostic(diagnostic: unknown): ValidationFailure | null {
  if (!isRecord(diagnostic)) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "fetch_diagnostic_not_success",
    };
  }
  if (
    diagnostic.status !== "success"
    || diagnostic.stopReason !== "not_stopped"
    || diagnostic.endpointId !== SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID
    || diagnostic.responseStatusCategory !== "success_2xx"
    || diagnostic.contentTypeCategory !== "accepted_json"
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "fetch_diagnostic_not_success",
    };
  }
  if (
    diagnostic.rawPayloadIncluded !== false
    || diagnostic.secretIncluded !== false
    || diagnostic.publicPayloadIncluded !== false
    || diagnostic.errorTraceIncluded !== false
    || diagnostic.cacheRead !== false
    || diagnostic.cacheWrite !== false
    || diagnostic.storageWrite !== false
    || diagnostic.sourceReliabilityTouched !== false
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }
  return null;
}

function validateCompletedW3B(input: Record<string, unknown>):
  EvidenceCorpusSourceMaterialReadinessRecordSummary | ValidationFailure {
  if (
    input.sourceMaterialVersion !== SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
    || input.sourceMaterialEndpointId !== SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID
    || input.locatorVersion !== SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "structural_exception",
    };
  }
  if (input.visibility !== "internal_admin_only") {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "visibility_invalid",
    };
  }
  if (input.publicPointerExposure !== "forbidden") {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "public_pointer_exposure_invalid",
    };
  }
  if (
    input.status !== "source_material_page_summary_completed"
    || input.stopReason !== "not_stopped"
    || input.candidateProviderNetworkStatus !== "candidate_provider_network_completed"
    || (
      input.sourceCandidatePreviewStatus !== "source_candidate_preview_materialized"
      && input.sourceCandidatePreviewStatus !== "source_candidate_preview_partial"
    )
  ) {
    return {
      status: "blocked_pre_evidence_corpus_parent_not_completed",
      stopReason: "w3b_not_completed",
    };
  }
  if (
    input.attemptedFetchCount !== 1
    || input.sourceMaterialRecordCount !== 1
    || input.fetchDiagnosticCount !== 1
  ) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: input.sourceMaterialRecordCount === 0
        ? "source_material_record_missing"
        : "source_material_record_count_unsupported",
    };
  }
  const records = input.sourceMaterialRecords;
  if (!Array.isArray(records) || records.length === 0) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_absent",
      stopReason: "source_material_record_missing",
    };
  }
  if (records.length !== 1) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "source_material_record_count_unsupported",
    };
  }
  const diagnostics = input.fetchDiagnostics;
  if (!Array.isArray(diagnostics) || diagnostics.length !== 1) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_contract_invalid",
      stopReason: "fetch_diagnostic_not_success",
    };
  }
  if (!downstreamW3BExecutionRemainsClosed(input)) {
    return {
      status: "blocked_pre_evidence_corpus_downstream_gate_closed",
      stopReason: "downstream_execution_not_authorized",
    };
  }
  if (containsForbiddenStructuralMarker(structuralFieldsForLeakScan(input))) {
    return {
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
    };
  }
  const diagnosticFailure = validateDiagnostic(diagnostics[0]);
  if (diagnosticFailure) {
    return diagnosticFailure;
  }
  return validateRecord(records[0]);
}

function isValidationFailure(
  value: EvidenceCorpusSourceMaterialReadinessRecordSummary | ValidationFailure,
): value is ValidationFailure {
  return "status" in value;
}

export function buildEvidenceCorpusSourceMaterialReadiness(params: {
  readonly sourceMaterialPageSummary: unknown;
  readonly runtimeOwned: boolean;
}): EvidenceCorpusSourceMaterialReadinessDecision {
  try {
    if (!params.runtimeOwned) {
      return failure(
        params.sourceMaterialPageSummary,
        "blocked_pre_evidence_corpus_source_material_not_runtime_owned",
        "runtime_ownership_missing",
      );
    }
    if (!isRecord(params.sourceMaterialPageSummary)) {
      return failure(
        params.sourceMaterialPageSummary,
        "blocked_pre_evidence_corpus_source_material_absent",
        "source_material_record_missing",
      );
    }

    const validated = validateCompletedW3B(params.sourceMaterialPageSummary);
    if (isValidationFailure(validated)) {
      return failure(params.sourceMaterialPageSummary, validated.status, validated.stopReason);
    }

    return decision({
      input: params.sourceMaterialPageSummary,
      status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      stopReason: "not_stopped",
      record: validated,
    });
  } catch {
    return failure(
      params.sourceMaterialPageSummary,
      "source_material_to_evidence_corpus_readiness_damaged_structural",
      "structural_exception",
    );
  }
}
