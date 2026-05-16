import {
  CLAIMBOUNDARY_V2_PUBLIC_CUTOVER_STATUS_BLOCKED,
  type ClaimBoundaryV2Envelope,
} from "@/lib/analyzer-v2/result-envelope";
import {
  buildCandidateSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/readiness";
import {
  CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
  type CandidateSourceMaterialReadinessTrace,
  type SourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/types";
import type {
  HiddenDirectTextCandidateAcquisitionHarnessResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";

export const ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_MATERIAL_READINESS_HARNESS_VERSION =
  "v2.hidden-direct-text-source-material-readiness-harness.x7a";

export type HiddenDirectTextSourceMaterialReadinessHarnessRequest = {
  readonly x6CandidateAcquisition: HiddenDirectTextCandidateAcquisitionHarnessResult;
};

export type HiddenDirectTextSourceMaterialReadinessHarnessResult = {
  readonly harnessVersion: typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_MATERIAL_READINESS_HARNESS_VERSION;
  readonly visibility: "internal_only";
  readonly status: "completed_contract" | "blocked_contract";
  readonly publicEnvelope: ClaimBoundaryV2Envelope;
  readonly sourceMaterialReadiness: SourceMaterialReadinessDecision;
};

function publicCutoverStatus(
  publicEnvelope: ClaimBoundaryV2Envelope,
): CandidateSourceMaterialReadinessTrace["publicCutoverStatus"] {
  const resultJson = publicEnvelope.resultJson;
  const meta = resultJson.meta;
  if (
    meta
    && typeof meta === "object"
    && !Array.isArray(meta)
    && "publicCutoverStatus" in meta
    && meta.publicCutoverStatus === CLAIMBOUNDARY_V2_PUBLIC_CUTOVER_STATUS_BLOCKED
  ) {
    return "blocked_precutover";
  }
  return "not_blocked_precutover";
}

function sanitizedTraceFromX6(
  x6CandidateAcquisition: HiddenDirectTextCandidateAcquisitionHarnessResult,
): CandidateSourceMaterialReadinessTrace {
  const candidateRuntime = x6CandidateAcquisition.candidateAcquisitionRuntime;
  return {
    traceVersion: CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
    visibility: "internal_only",
    candidateAcquisitionStatus: x6CandidateAcquisition.status === "completed" ? "completed" : "blocked",
    candidateRuntimeStructuralStatus: candidateRuntime?.status ?? "not_available",
    candidateRecordCount: candidateRuntime?.candidates.length ?? 0,
    queryOutcomeCount: candidateRuntime?.queryOutcomes.length ?? 0,
    publicCutoverStatus: publicCutoverStatus(x6CandidateAcquisition.publicEnvelope),
    candidateRecordsAreSourceMaterial: false,
    hiddenLocatorsAreDereferenceable: false,
    candidateCountsAreEvidence: false,
  };
}

export function runHiddenDirectTextSourceMaterialReadinessHarness(
  request: HiddenDirectTextSourceMaterialReadinessHarnessRequest,
): HiddenDirectTextSourceMaterialReadinessHarnessResult {
  const sourceMaterialReadiness = buildCandidateSourceMaterialReadinessDecision(
    sanitizedTraceFromX6(request.x6CandidateAcquisition),
  );

  return {
    harnessVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_MATERIAL_READINESS_HARNESS_VERSION,
    visibility: "internal_only",
    status: sourceMaterialReadiness.status === "not_ready_pre_execution"
      ? "completed_contract"
      : "blocked_contract",
    publicEnvelope: request.x6CandidateAcquisition.publicEnvelope,
    sourceMaterialReadiness,
  };
}
