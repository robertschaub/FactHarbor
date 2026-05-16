import {
  EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION,
  type EvidenceCorpusSourceMaterialContractSummary,
  type EvidenceCorpusSourceMaterialGuardDecision,
  type EvidenceCorpusSourceMaterialGuardReason,
  type EvidenceCorpusSourceMaterialGuardStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";
import {
  DOWNSTREAM_NO_CORPUS_DENIAL_VERSION,
  type DownstreamNoCorpusDenialBlockedReason,
  type DownstreamNoCorpusDenialDecision,
  type DownstreamNoCorpusDenialStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types";

const SOURCE_MATERIAL_GUARD_KEYS = [
  "blockedReason",
  "decisionVersion",
  "evidenceCorpus",
  "extractionInput",
  "sourceMaterial",
  "sourceMaterialContract",
  "status",
  "visibility",
].sort();

const SOURCE_MATERIAL_CONTRACT_KEYS = [
  "contractVersion",
  "notAvailableReason",
  "readinessStatus",
  "status",
].sort();

const SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION =
  "v2.evidence-lifecycle.source-material-absence-contract.x7b";

const SOURCE_MATERIAL_GUARD_STATUSES = new Set<EvidenceCorpusSourceMaterialGuardStatus>([
  "not_buildable_no_source_material",
  "blocked_source_material_invalid",
  "blocked_source_material_not_accepted",
]);

const SOURCE_MATERIAL_GUARD_REASONS = new Set<EvidenceCorpusSourceMaterialGuardReason>([
  "source_material_not_available_pre_execution",
  "source_material_contract_invalid",
  "source_material_readiness_blocked",
]);

const STATUS_REASON_CONTRACT_MATCHES = {
  not_buildable_no_source_material: {
    blockedReason: "source_material_not_available_pre_execution",
    readinessStatus: "not_ready_pre_execution",
  },
  blocked_source_material_invalid: {
    blockedReason: "source_material_contract_invalid",
    readinessStatus: null,
  },
  blocked_source_material_not_accepted: {
    blockedReason: "source_material_readiness_blocked",
    readinessStatus: "blocked_pre_execution",
  },
} as const satisfies Record<
  EvidenceCorpusSourceMaterialGuardStatus,
  {
    readonly blockedReason: EvidenceCorpusSourceMaterialGuardReason;
    readonly readinessStatus: "not_ready_pre_execution" | "blocked_pre_execution" | null;
  }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length
    && actual.every((key, index) => key === keys[index]);
}

function isSourceMaterialGuardStatus(value: unknown): value is EvidenceCorpusSourceMaterialGuardStatus {
  return typeof value === "string"
    && SOURCE_MATERIAL_GUARD_STATUSES.has(value as EvidenceCorpusSourceMaterialGuardStatus);
}

function isSourceMaterialGuardReason(value: unknown): value is EvidenceCorpusSourceMaterialGuardReason {
  return typeof value === "string"
    && SOURCE_MATERIAL_GUARD_REASONS.has(value as EvidenceCorpusSourceMaterialGuardReason);
}

function isSourceMaterialContractSummary(
  value: unknown,
): value is EvidenceCorpusSourceMaterialContractSummary {
  if (!isRecord(value) || !hasExactKeys(value, SOURCE_MATERIAL_CONTRACT_KEYS)) {
    return false;
  }

  return value.contractVersion === SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION
    && value.status === "not_available_pre_execution"
    && isSourceMaterialGuardReason(value.notAvailableReason)
    && (
      value.readinessStatus === "not_ready_pre_execution"
      || value.readinessStatus === "blocked_pre_execution"
      || value.readinessStatus === null
    );
}

function guardStatusMatchesReasonAndContract(
  status: EvidenceCorpusSourceMaterialGuardStatus,
  blockedReason: EvidenceCorpusSourceMaterialGuardReason,
  sourceMaterialContract: EvidenceCorpusSourceMaterialContractSummary,
): boolean {
  const expected = STATUS_REASON_CONTRACT_MATCHES[status];
  return blockedReason === expected.blockedReason
    && sourceMaterialContract.notAvailableReason === expected.blockedReason
    && sourceMaterialContract.readinessStatus === expected.readinessStatus;
}

function isSourceMaterialGuardDecision(
  value: unknown,
): value is EvidenceCorpusSourceMaterialGuardDecision {
  if (
    !isRecord(value)
    || !hasExactKeys(value, SOURCE_MATERIAL_GUARD_KEYS)
    || value.decisionVersion !== EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION
    || value.visibility !== "internal_only"
    || !isSourceMaterialGuardStatus(value.status)
    || !isSourceMaterialGuardReason(value.blockedReason)
    || !isSourceMaterialContractSummary(value.sourceMaterialContract)
    || value.sourceMaterial !== null
    || value.extractionInput !== null
    || value.evidenceCorpus !== null
  ) {
    return false;
  }

  return guardStatusMatchesReasonAndContract(
    value.status,
    value.blockedReason,
    value.sourceMaterialContract,
  );
}

function downstreamDecision(params: {
  readonly status: DownstreamNoCorpusDenialStatus;
  readonly blockedReason: DownstreamNoCorpusDenialBlockedReason;
  readonly sourceMaterialGuardVersion:
    | typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION
    | null;
  readonly sourceMaterialGuardStatus: EvidenceCorpusSourceMaterialGuardStatus | null;
  readonly sourceMaterialGuardReason: EvidenceCorpusSourceMaterialGuardReason | null;
}): DownstreamNoCorpusDenialDecision {
  return {
    denialVersion: DOWNSTREAM_NO_CORPUS_DENIAL_VERSION,
    visibility: "internal_only",
    status: params.status,
    blockedReason: params.blockedReason,
    sourceMaterialGuardVersion: params.sourceMaterialGuardVersion,
    sourceMaterialGuardStatus: params.sourceMaterialGuardStatus,
    sourceMaterialGuardReason: params.sourceMaterialGuardReason,
    applicabilityInput: null,
    extractionInput: null,
    sufficiencyInput: null,
    boundaryInput: null,
    verdictInput: null,
    evidenceCorpus: null,
    evidenceItems: null,
    warnings: null,
    report: null,
    publicOutput: null,
    liveEligibility: false,
    semanticLlmTasksApproved: false,
    productPublicLiveApproved: false,
    cacheTouched: false,
    sourceReliabilityTouched: false,
  };
}

function invalidInputDecision(): DownstreamNoCorpusDenialDecision {
  return downstreamDecision({
    status: "downstream_blocked_input_invalid",
    blockedReason: "source_material_guard_input_invalid",
    sourceMaterialGuardVersion: null,
    sourceMaterialGuardStatus: null,
    sourceMaterialGuardReason: null,
  });
}

export function buildDownstreamNoCorpusDenial(
  sourceMaterialGuardInput: unknown,
): DownstreamNoCorpusDenialDecision {
  if (!isSourceMaterialGuardDecision(sourceMaterialGuardInput)) {
    return invalidInputDecision();
  }

  if (sourceMaterialGuardInput.status === "not_buildable_no_source_material") {
    return downstreamDecision({
      status: "downstream_blocked_no_evidence_corpus",
      blockedReason: "source_material_guard_no_corpus",
      sourceMaterialGuardVersion: sourceMaterialGuardInput.decisionVersion,
      sourceMaterialGuardStatus: sourceMaterialGuardInput.status,
      sourceMaterialGuardReason: sourceMaterialGuardInput.blockedReason,
    });
  }

  if (sourceMaterialGuardInput.status === "blocked_source_material_invalid") {
    return downstreamDecision({
      status: "downstream_blocked_source_material_invalid",
      blockedReason: "source_material_guard_invalid",
      sourceMaterialGuardVersion: sourceMaterialGuardInput.decisionVersion,
      sourceMaterialGuardStatus: sourceMaterialGuardInput.status,
      sourceMaterialGuardReason: sourceMaterialGuardInput.blockedReason,
    });
  }

  return downstreamDecision({
    status: "downstream_blocked_source_material_not_accepted",
    blockedReason: "source_material_guard_not_accepted",
    sourceMaterialGuardVersion: sourceMaterialGuardInput.decisionVersion,
    sourceMaterialGuardStatus: sourceMaterialGuardInput.status,
    sourceMaterialGuardReason: sourceMaterialGuardInput.blockedReason,
  });
}
