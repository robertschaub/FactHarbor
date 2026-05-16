export const CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION =
  "v2.evidence-lifecycle.source-material.candidate-trace.0";

export const SOURCE_MATERIAL_READINESS_DECISION_VERSION =
  "v2.evidence-lifecycle.source-material-readiness.0";

export type CandidateSourceMaterialReadinessTrace = {
  readonly traceVersion: typeof CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION;
  readonly visibility: "internal_only";
  readonly candidateAcquisitionStatus: "completed" | "blocked";
  readonly candidateRuntimeStructuralStatus:
    | "completed_structural"
    | "blocked"
    | "damaged_structural"
    | "not_available";
  readonly candidateRecordCount: number;
  readonly queryOutcomeCount: number;
  readonly publicCutoverStatus: "blocked_precutover" | "not_blocked_precutover";
  readonly candidateRecordsAreSourceMaterial: false;
  readonly hiddenLocatorsAreDereferenceable: false;
  readonly candidateCountsAreEvidence: false;
};

export type SourceMaterialReadinessBlockedReason =
  | "candidate_trace_invalid"
  | "candidate_trace_contains_source_material"
  | "candidate_trace_contains_dereferenceable_locator"
  | "candidate_trace_treats_candidate_count_as_evidence"
  | "candidate_acquisition_not_completed"
  | "candidate_runtime_not_completed"
  | "public_cutover_not_blocked_precutover";

export type SourceMaterialReadinessDecision =
  | {
      readonly decisionVersion: typeof SOURCE_MATERIAL_READINESS_DECISION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "not_ready_pre_execution";
      readonly blockedReason: null;
      readonly sourceMaterialStatus: "candidate_only_not_source_material";
      readonly extractionInputStatus: "blocked_source_material_unavailable";
      readonly evidenceCorpusStatus: "not_buildable_no_source_material";
      readonly candidateTrace: CandidateSourceMaterialReadinessTrace;
      readonly sourceMaterial: null;
      readonly extractionInput: null;
      readonly evidenceCorpus: null;
    }
  | {
      readonly decisionVersion: typeof SOURCE_MATERIAL_READINESS_DECISION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "blocked_pre_execution";
      readonly blockedReason: SourceMaterialReadinessBlockedReason;
      readonly sourceMaterialStatus: "blocked_no_source_material";
      readonly extractionInputStatus: "blocked_source_material_unavailable";
      readonly evidenceCorpusStatus: "not_buildable_no_source_material";
      readonly candidateTrace: null;
      readonly sourceMaterial: null;
      readonly extractionInput: null;
      readonly evidenceCorpus: null;
    };
