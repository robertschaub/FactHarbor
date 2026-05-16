import {
  CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION,
  SOURCE_MATERIAL_READINESS_DECISION_VERSION,
  type CandidateSourceMaterialReadinessTrace,
  type SourceMaterialReadinessBlockedReason,
  type SourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/types";

export const SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION =
  "v2.evidence-lifecycle.source-material-absence-contract.x7b";

export type SourceMaterialAbsenceContractReason =
  | "source_material_not_available_pre_execution"
  | "source_material_readiness_blocked"
  | "source_material_contract_invalid";

export type SourceMaterialAbsenceContractReadiness = {
  readonly decisionVersion: typeof SOURCE_MATERIAL_READINESS_DECISION_VERSION;
  readonly status: SourceMaterialReadinessDecision["status"];
  readonly blockedReason: SourceMaterialReadinessDecision["blockedReason"];
  readonly sourceMaterialStatus: SourceMaterialReadinessDecision["sourceMaterialStatus"];
  readonly extractionInputStatus: SourceMaterialReadinessDecision["extractionInputStatus"];
  readonly evidenceCorpusStatus: SourceMaterialReadinessDecision["evidenceCorpusStatus"];
};

export type SourceMaterialAbsenceContract = {
  readonly contractVersion: typeof SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION;
  readonly visibility: "internal_only";
  readonly status: "not_available_pre_execution";
  readonly notAvailableReason: SourceMaterialAbsenceContractReason;
  readonly sourceMaterialReadiness: SourceMaterialAbsenceContractReadiness | null;
  readonly sourceMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpusInput: null;
};

const READINESS_KEYS = [
  "blockedReason",
  "candidateTrace",
  "decisionVersion",
  "evidenceCorpus",
  "evidenceCorpusStatus",
  "extractionInput",
  "extractionInputStatus",
  "sourceMaterial",
  "sourceMaterialStatus",
  "status",
  "visibility",
].sort();

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

const absenceContracts = new WeakSet<object>();

const READINESS_BLOCKED_REASONS: ReadonlySet<SourceMaterialReadinessBlockedReason> = new Set([
  "candidate_trace_invalid",
  "candidate_trace_contains_source_material",
  "candidate_trace_contains_dereferenceable_locator",
  "candidate_trace_treats_candidate_count_as_evidence",
  "candidate_acquisition_not_completed",
  "candidate_runtime_not_completed",
  "public_cutover_not_blocked_precutover",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join("|") === keys.join("|");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isCandidateTrace(value: unknown): value is CandidateSourceMaterialReadinessTrace {
  return isRecord(value)
    && hasExactKeys(value, TRACE_KEYS)
    && value.traceVersion === CANDIDATE_SOURCE_MATERIAL_READINESS_TRACE_VERSION
    && value.visibility === "internal_only"
    && value.candidateAcquisitionStatus === "completed"
    && value.candidateRuntimeStructuralStatus === "completed_structural"
    && isNonNegativeInteger(value.candidateRecordCount)
    && isNonNegativeInteger(value.queryOutcomeCount)
    && value.publicCutoverStatus === "blocked_precutover"
    && value.candidateRecordsAreSourceMaterial === false
    && value.hiddenLocatorsAreDereferenceable === false
    && value.candidateCountsAreEvidence === false;
}

function makeContract(
  notAvailableReason: SourceMaterialAbsenceContractReason,
  sourceMaterialReadiness: SourceMaterialAbsenceContractReadiness | null,
): SourceMaterialAbsenceContract {
  const contract: SourceMaterialAbsenceContract = Object.freeze({
    contractVersion: SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION,
    visibility: "internal_only",
    status: "not_available_pre_execution",
    notAvailableReason,
    sourceMaterialReadiness,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpusInput: null,
  });
  absenceContracts.add(contract);
  return contract;
}

function isReadinessBlockedReason(value: unknown): value is SourceMaterialReadinessBlockedReason {
  return typeof value === "string" && READINESS_BLOCKED_REASONS.has(value as SourceMaterialReadinessBlockedReason);
}

function sanitizeReadiness(
  decision: SourceMaterialReadinessDecision,
): SourceMaterialAbsenceContractReadiness {
  return {
    decisionVersion: decision.decisionVersion,
    status: decision.status,
    blockedReason: decision.blockedReason,
    sourceMaterialStatus: decision.sourceMaterialStatus,
    extractionInputStatus: decision.extractionInputStatus,
    evidenceCorpusStatus: decision.evidenceCorpusStatus,
  };
}

function coerceReadinessDecision(value: unknown): SourceMaterialReadinessDecision | null {
  if (!isRecord(value) || !hasExactKeys(value, READINESS_KEYS)) {
    return null;
  }

  if (
    value.decisionVersion !== SOURCE_MATERIAL_READINESS_DECISION_VERSION
    || value.visibility !== "internal_only"
    || value.sourceMaterial !== null
    || value.extractionInput !== null
    || value.evidenceCorpus !== null
    || value.extractionInputStatus !== "blocked_source_material_unavailable"
    || value.evidenceCorpusStatus !== "not_buildable_no_source_material"
  ) {
    return null;
  }

  if (value.status === "not_ready_pre_execution") {
    if (
      value.blockedReason !== null
      || value.sourceMaterialStatus !== "candidate_only_not_source_material"
      || !isCandidateTrace(value.candidateTrace)
    ) {
      return null;
    }
    return value as unknown as SourceMaterialReadinessDecision;
  }

  if (value.status === "blocked_pre_execution") {
    if (
      !isReadinessBlockedReason(value.blockedReason)
      || value.sourceMaterialStatus !== "blocked_no_source_material"
      || value.candidateTrace !== null
    ) {
      return null;
    }
    return value as unknown as SourceMaterialReadinessDecision;
  }

  return null;
}

export function buildSourceMaterialAbsenceContract(
  readinessDecision: unknown,
): SourceMaterialAbsenceContract {
  const decision = coerceReadinessDecision(readinessDecision);
  if (!decision) {
    return makeContract("source_material_contract_invalid", null);
  }

  if (decision.status === "blocked_pre_execution") {
    return makeContract("source_material_readiness_blocked", sanitizeReadiness(decision));
  }

  return makeContract("source_material_not_available_pre_execution", sanitizeReadiness(decision));
}

export function isSourceMaterialAbsenceContract(
  value: unknown,
): value is SourceMaterialAbsenceContract {
  return isRecord(value) && absenceContracts.has(value);
}
