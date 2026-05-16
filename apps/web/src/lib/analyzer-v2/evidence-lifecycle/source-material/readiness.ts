import {
  CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
  SOURCE_MATERIAL_READINESS_DECISION_VERSION,
  type CandidateSourceMaterialReadinessTrace,
  type SourceMaterialReadinessBlockedReason,
  type SourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/types";

const TRACE_KEYS = [
  "candidateAcquisitionStatus",
  "candidateCountsAreEvidence",
  "candidateRecordCount",
  "candidateRecordsAreSourceMaterial",
  "candidateRuntimeStructuralStatus",
  "hiddenLocatorsAreDereferenceable",
  "publicCutoverStatus",
  "queryOutcomeCount",
  "traceVersion",
  "visibility",
].sort();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactTraceKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).sort().join("|") === TRACE_KEYS.join("|");
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function blocked(
  blockedReason: SourceMaterialReadinessBlockedReason,
): SourceMaterialReadinessDecision {
  return {
    decisionVersion: SOURCE_MATERIAL_READINESS_DECISION_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_execution",
    blockedReason,
    sourceMaterialStatus: "blocked_no_source_material",
    extractionInputStatus: "blocked_source_material_unavailable",
    evidenceCorpusStatus: "not_buildable_no_source_material",
    candidateTrace: null,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}

function traceHasValidShape(value: Record<string, unknown>): value is CandidateSourceMaterialReadinessTrace {
  return value.traceVersion === CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION
    && value.visibility === "internal_only"
    && (value.candidateAcquisitionStatus === "completed" || value.candidateAcquisitionStatus === "blocked")
    && (
      value.candidateRuntimeStructuralStatus === "completed_structural"
      || value.candidateRuntimeStructuralStatus === "blocked"
      || value.candidateRuntimeStructuralStatus === "damaged_structural"
      || value.candidateRuntimeStructuralStatus === "not_available"
    )
    && isNonNegativeInteger(value.candidateRecordCount)
    && isNonNegativeInteger(value.queryOutcomeCount)
    && (
      value.publicCutoverStatus === "blocked_precutover"
      || value.publicCutoverStatus === "not_blocked_precutover"
    )
    && typeof value.candidateRecordsAreSourceMaterial === "boolean"
    && typeof value.hiddenLocatorsAreDereferenceable === "boolean"
    && typeof value.candidateCountsAreEvidence === "boolean";
}

export function buildCandidateSourceMaterialReadinessDecision(
  candidateTrace: unknown,
): SourceMaterialReadinessDecision {
  if (!isRecord(candidateTrace) || !hasExactTraceKeys(candidateTrace)) {
    return blocked("candidate_trace_invalid");
  }

  if (candidateTrace.candidateRecordsAreSourceMaterial !== false) {
    return blocked(
      candidateTrace.candidateRecordsAreSourceMaterial === true
        ? "candidate_trace_contains_source_material"
        : "candidate_trace_invalid",
    );
  }

  if (candidateTrace.hiddenLocatorsAreDereferenceable !== false) {
    return blocked(
      candidateTrace.hiddenLocatorsAreDereferenceable === true
        ? "candidate_trace_contains_dereferenceable_locator"
        : "candidate_trace_invalid",
    );
  }

  if (candidateTrace.candidateCountsAreEvidence !== false) {
    return blocked(
      candidateTrace.candidateCountsAreEvidence === true
        ? "candidate_trace_treats_candidate_count_as_evidence"
        : "candidate_trace_invalid",
    );
  }

  if (!traceHasValidShape(candidateTrace)) {
    return blocked("candidate_trace_invalid");
  }

  if (candidateTrace.candidateAcquisitionStatus !== "completed") {
    return blocked("candidate_acquisition_not_completed");
  }

  if (candidateTrace.candidateRuntimeStructuralStatus !== "completed_structural") {
    return blocked("candidate_runtime_not_completed");
  }

  if (candidateTrace.publicCutoverStatus !== "blocked_precutover") {
    return blocked("public_cutover_not_blocked_precutover");
  }

  return {
    decisionVersion: SOURCE_MATERIAL_READINESS_DECISION_VERSION,
    visibility: "internal_only",
    status: "not_ready_pre_execution",
    blockedReason: null,
    sourceMaterialStatus: "candidate_only_not_source_material",
    extractionInputStatus: "blocked_source_material_unavailable",
    evidenceCorpusStatus: "not_buildable_no_source_material",
    candidateTrace,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}
