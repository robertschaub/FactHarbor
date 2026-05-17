import {
  EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION,
  type EvidenceCorpusSourceMaterialContractSummary,
  type EvidenceCorpusSourceMaterialGuardDecision,
  type EvidenceCorpusSourceMaterialGuardReason,
  type EvidenceCorpusSourceMaterialGuardStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";
import {
  DOWNSTREAM_NO_CORPUS_DENIAL_VERSION,
  DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION,
  type DownstreamNoCorpusDenialBlockedReason,
  type DownstreamNoCorpusDenialDecision,
  type DownstreamNoCorpusDenialStatus,
  type DownstreamNoCorpusStructuralBlockedReason,
  type DownstreamNoCorpusStructuralInput,
  type DownstreamNoCorpusStructuralSource,
  type DownstreamNoCorpusStructuralStatus,
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

const STRUCTURAL_INPUT_KEYS = [
  "blockedReason",
  "evidenceCorpus",
  "extractionInput",
  "inputVersion",
  "parsedMaterial",
  "sourceMaterial",
  "status",
  "structuralSource",
  "visibility",
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

const STRUCTURAL_SOURCES = new Set<DownstreamNoCorpusStructuralSource>([
  "x7b_source_material_guard",
  "x7f_source_acquisition_gate",
  "c0s3_parsed_material_denial",
]);

const STRUCTURAL_STATUSES = new Set<DownstreamNoCorpusStructuralStatus>([
  "structural_no_evidence_corpus",
  "structural_source_acquisition_closed",
  "structural_no_parsed_material",
  "structural_input_rejected",
]);

const STRUCTURAL_BLOCKED_REASONS = new Set<DownstreamNoCorpusStructuralBlockedReason>([
  "source_material_guard_no_corpus",
  "runtime_source_acquisition_gate_closed",
  "runtime_source_acquisition_gate_rejected",
  "runtime_parser_denial_no_parsed_material",
  "runtime_input_not_owned",
  "runtime_input_invalid",
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

const STRUCTURAL_MATCHES: ReadonlyArray<{
  readonly structuralSource: DownstreamNoCorpusStructuralSource;
  readonly status: DownstreamNoCorpusStructuralStatus;
  readonly blockedReason: DownstreamNoCorpusStructuralBlockedReason;
}> = [
  {
    structuralSource: "x7b_source_material_guard",
    status: "structural_no_evidence_corpus",
    blockedReason: "source_material_guard_no_corpus",
  },
  {
    structuralSource: "x7f_source_acquisition_gate",
    status: "structural_source_acquisition_closed",
    blockedReason: "runtime_source_acquisition_gate_closed",
  },
  {
    structuralSource: "x7f_source_acquisition_gate",
    status: "structural_input_rejected",
    blockedReason: "runtime_source_acquisition_gate_rejected",
  },
  {
    structuralSource: "c0s3_parsed_material_denial",
    status: "structural_no_parsed_material",
    blockedReason: "runtime_parser_denial_no_parsed_material",
  },
  {
    structuralSource: "c0s3_parsed_material_denial",
    status: "structural_input_rejected",
    blockedReason: "runtime_input_not_owned",
  },
];

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

function isStructuralSource(value: unknown): value is DownstreamNoCorpusStructuralSource {
  return typeof value === "string"
    && STRUCTURAL_SOURCES.has(value as DownstreamNoCorpusStructuralSource);
}

function isStructuralStatus(value: unknown): value is DownstreamNoCorpusStructuralStatus {
  return typeof value === "string"
    && STRUCTURAL_STATUSES.has(value as DownstreamNoCorpusStructuralStatus);
}

function isStructuralBlockedReason(value: unknown): value is DownstreamNoCorpusStructuralBlockedReason {
  return typeof value === "string"
    && STRUCTURAL_BLOCKED_REASONS.has(value as DownstreamNoCorpusStructuralBlockedReason);
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

function structuralInputMatches(
  structuralSource: DownstreamNoCorpusStructuralSource,
  status: DownstreamNoCorpusStructuralStatus,
  blockedReason: DownstreamNoCorpusStructuralBlockedReason,
): boolean {
  return STRUCTURAL_MATCHES.some((match) =>
    match.structuralSource === structuralSource
    && match.status === status
    && match.blockedReason === blockedReason
  );
}

function isDownstreamNoCorpusStructuralInput(value: unknown): value is DownstreamNoCorpusStructuralInput {
  if (
    !isRecord(value)
    || !hasExactKeys(value, STRUCTURAL_INPUT_KEYS)
    || value.inputVersion !== DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION
    || value.visibility !== "internal_only"
    || !isStructuralSource(value.structuralSource)
    || !isStructuralStatus(value.status)
    || !isStructuralBlockedReason(value.blockedReason)
    || value.sourceMaterial !== null
    || value.parsedMaterial !== null
    || value.extractionInput !== null
    || value.evidenceCorpus !== null
  ) {
    return false;
  }

  return structuralInputMatches(
    value.structuralSource,
    value.status,
    value.blockedReason,
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

function structuralInputDecision(
  structuralInput: DownstreamNoCorpusStructuralInput,
): DownstreamNoCorpusDenialDecision {
  return downstreamDecision({
    status: structuralInput.blockedReason === "runtime_input_invalid"
      ? "downstream_blocked_input_invalid"
      : "downstream_blocked_no_evidence_corpus",
    blockedReason: structuralInput.blockedReason,
    sourceMaterialGuardVersion: null,
    sourceMaterialGuardStatus: null,
    sourceMaterialGuardReason: null,
  });
}

export function buildDownstreamNoCorpusDenial(
  sourceMaterialGuardInput: unknown,
): DownstreamNoCorpusDenialDecision {
  if (isDownstreamNoCorpusStructuralInput(sourceMaterialGuardInput)) {
    return structuralInputDecision(sourceMaterialGuardInput);
  }

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
