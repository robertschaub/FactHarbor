export const SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION =
  "v2.source-acquisition.parser-worker-admission-provenance.c0-s2";

export type SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision =
  Readonly<Record<string, unknown>>;

export type SourceAcquisitionParserWorkerAdmissionProvenanceInspection =
  | {
      readonly provenanceVersion: typeof SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION;
      readonly status: "runtime_owned";
      readonly blockedReason: null;
      readonly decision: SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision;
    }
  | {
      readonly provenanceVersion: typeof SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION;
      readonly status: "blocked_not_runtime_owned";
      readonly blockedReason: "admission_not_runtime_owned";
      readonly decision: null;
    };

const ADMISSION_VERSION = "v2.source-acquisition.parser-worker-admission.c0-s1";
const CONTRACT_VERSION = "v2.source-acquisition.parser-worker-contract.c0";
const P0_PROFILE_ID = "P0_PROVISIONAL_LOCAL_INERT";
const P0_ISOLATION_LABEL = "provisional_local_inert_only_not_security_boundary";

const DECISION_KEYS = [
  "admissionVersion",
  "admittedByteCount",
  "admittedByteDigest",
  "admittedProvenanceKind",
  "blockedReason",
  "bytesConsumed",
  "cacheTouched",
  "contractVersion",
  "deploymentCandidateIsolationAccepted",
  "evidenceCorpus",
  "evidenceLifecycleConsumptionApproved",
  "executionStatus",
  "isolationLabel",
  "liveJobs",
  "parsedMaterialPacket",
  "parserExecution",
  "parserOutput",
  "productPublicLiveApproved",
  "profileId",
  "publicExposure",
  "realFetchedBytesAccepted",
  "sourceReliabilityTouched",
  "status",
  "transportFrameAccepted",
  "transportPacketAccepted",
  "twoDCApproved",
  "visibility",
  "workerSpawned",
].sort();

const BLOCKED_REASONS = new Set([
  "request_malformed",
  "profile_not_p0",
  "p0_not_security_boundary",
  "real_fetched_bytes_rejected",
  "transport_packet_rejected",
  "transport_frame_rejected",
  "provenance_not_fixture_control_or_synthetic_inert",
  "parser_isolation_not_deployment_candidate",
  "two_d_c_not_approved",
  "product_public_live_not_approved",
]);

const runtimeOwnedAdmissionSnapshots = new WeakMap<object, string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length
    && actual.every((key, index) => key === keys[index]);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function hasNoExecutionOrOutput(value: Record<string, unknown>): boolean {
  return value.executionStatus === "blocked_no_parser_execution"
    && value.parserExecution === false
    && value.workerSpawned === false
    && value.bytesConsumed === false
    && value.transportPacketAccepted === false
    && value.transportFrameAccepted === false
    && value.realFetchedBytesAccepted === false
    && value.twoDCApproved === false
    && value.productPublicLiveApproved === false
    && value.evidenceLifecycleConsumptionApproved === false
    && value.deploymentCandidateIsolationAccepted === false
    && value.cacheTouched === false
    && value.sourceReliabilityTouched === false
    && value.publicExposure === false
    && value.liveJobs === false
    && value.parsedMaterialPacket === null
    && value.parserOutput === null
    && value.evidenceCorpus === null;
}

function hasValidAdmissionPayload(value: Record<string, unknown>): boolean {
  if (value.status === "p0_admitted_fixture_or_synthetic_inert") {
    return value.blockedReason === null
      && value.profileId === P0_PROFILE_ID
      && value.isolationLabel === P0_ISOLATION_LABEL
      && (
        value.admittedProvenanceKind === "fixture_control"
        || value.admittedProvenanceKind === "synthetic_inert"
      )
      && typeof value.admittedByteCount === "number"
      && Number.isInteger(value.admittedByteCount)
      && value.admittedByteCount > 0
      && value.admittedByteCount <= 64 * 1024
      && isDigest(value.admittedByteDigest);
  }
  if (value.status === "blocked_pre_parser_execution") {
    return typeof value.blockedReason === "string"
      && BLOCKED_REASONS.has(value.blockedReason)
      && value.profileId === null
      && value.isolationLabel === null
      && value.admittedProvenanceKind === null
      && value.admittedByteCount === 0
      && value.admittedByteDigest === null;
  }
  return false;
}

function buildAdmissionIntegritySnapshot(value: unknown): string | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, DECISION_KEYS)
    || value.admissionVersion !== ADMISSION_VERSION
    || value.contractVersion !== CONTRACT_VERSION
    || value.visibility !== "internal_only"
    || !hasNoExecutionOrOutput(value)
    || !hasValidAdmissionPayload(value)
  ) {
    return null;
  }

  return JSON.stringify(DECISION_KEYS.map((key) => [key, value[key]]));
}

export function markSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision<
  TDecision extends SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
>(decision: TDecision): TDecision {
  const snapshot = buildAdmissionIntegritySnapshot(decision);
  if (snapshot !== null) {
    runtimeOwnedAdmissionSnapshots.set(decision, snapshot);
  }
  return decision;
}

export function readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(
  value: unknown,
): SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision | null {
  if (!isRecord(value)) {
    return null;
  }

  const expectedSnapshot = runtimeOwnedAdmissionSnapshots.get(value);
  if (expectedSnapshot === undefined) {
    return null;
  }

  const currentSnapshot = buildAdmissionIntegritySnapshot(value);
  if (currentSnapshot === null || currentSnapshot !== expectedSnapshot) {
    runtimeOwnedAdmissionSnapshots.delete(value);
    return null;
  }

  return value;
}

export function inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(
  value: unknown,
): SourceAcquisitionParserWorkerAdmissionProvenanceInspection {
  const decision = readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(value);
  if (decision !== null) {
    return {
      provenanceVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION,
      status: "runtime_owned",
      blockedReason: null,
      decision,
    };
  }

  return {
    provenanceVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION,
    status: "blocked_not_runtime_owned",
    blockedReason: "admission_not_runtime_owned",
    decision: null,
  };
}

export function isSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(
  value: unknown,
): value is SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision {
  return readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(value) !== null;
}
