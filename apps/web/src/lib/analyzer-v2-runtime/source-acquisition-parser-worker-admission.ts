export const SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION =
  "v2.source-acquisition.parser-worker-contract.c0";
export const SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_VERSION =
  "v2.source-acquisition.parser-worker-admission.c0-s1";
export const SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID =
  "P0_PROVISIONAL_LOCAL_INERT";
export const SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL =
  "provisional_local_inert_only_not_security_boundary";

type SourceAcquisitionParserWorkerAdmissionBlockedReason =
  | "request_malformed"
  | "profile_not_p0"
  | "p0_not_security_boundary"
  | "real_fetched_bytes_rejected"
  | "transport_packet_rejected"
  | "transport_frame_rejected"
  | "provenance_not_fixture_control_or_synthetic_inert"
  | "parser_isolation_not_deployment_candidate"
  | "two_d_c_not_approved"
  | "product_public_live_not_approved";

type SourceAcquisitionParserWorkerP0InputProvenance =
  | {
      readonly kind: "fixture_control";
      readonly fixturePacketId: string;
      readonly byteCount: number;
      readonly byteDigest: string;
      readonly bytesIncluded: false;
      readonly rawPayloadIncluded: false;
      readonly parsedTextIncluded: false;
    }
  | {
      readonly kind: "synthetic_inert";
      readonly syntheticInputId: string;
      readonly byteCount: number;
      readonly byteDigest: string;
      readonly bytesIncluded: false;
      readonly rawPayloadIncluded: false;
      readonly parsedTextIncluded: false;
    };

export type SourceAcquisitionParserWorkerAdmissionRequest = {
  readonly contractVersion: typeof SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION;
  readonly profileId: string;
  readonly isolationLabel: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly inputProvenance: SourceAcquisitionParserWorkerP0InputProvenance;
  readonly limits: {
    readonly maxInputBytes: number;
    readonly maxOutputBytes: number;
    readonly timeoutMs: number;
  };
  readonly approvalSnapshot: {
    readonly twoDCApproved: false;
    readonly productPublicLiveApproved: false;
    readonly evidenceLifecycleConsumptionApproved: false;
    readonly deploymentCandidateIsolationAccepted: false;
  };
};

type SourceAcquisitionParserWorkerAdmissionNoExecutionProof = {
  readonly admissionVersion: typeof SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_VERSION;
  readonly contractVersion: typeof SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION;
  readonly visibility: "internal_only";
  readonly profileId: typeof SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID | null;
  readonly isolationLabel:
    | typeof SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL
    | null;
  readonly executionStatus: "blocked_no_parser_execution";
  readonly parserExecution: false;
  readonly workerSpawned: false;
  readonly bytesConsumed: false;
  readonly transportPacketAccepted: false;
  readonly transportFrameAccepted: false;
  readonly realFetchedBytesAccepted: false;
  readonly twoDCApproved: false;
  readonly productPublicLiveApproved: false;
  readonly evidenceLifecycleConsumptionApproved: false;
  readonly deploymentCandidateIsolationAccepted: false;
  readonly cacheTouched: false;
  readonly sourceReliabilityTouched: false;
  readonly publicExposure: false;
  readonly liveJobs: false;
  readonly admittedProvenanceKind: "fixture_control" | "synthetic_inert" | null;
  readonly admittedByteCount: number;
  readonly admittedByteDigest: string | null;
  readonly parsedMaterialPacket: null;
  readonly parserOutput: null;
  readonly evidenceCorpus: null;
};

export type SourceAcquisitionParserWorkerAdmissionDecision =
  SourceAcquisitionParserWorkerAdmissionNoExecutionProof & (
    | {
        readonly status: "p0_admitted_fixture_or_synthetic_inert";
        readonly blockedReason: null;
      }
    | {
        readonly status: "blocked_pre_parser_execution";
        readonly blockedReason: SourceAcquisitionParserWorkerAdmissionBlockedReason;
      }
  );

const REQUEST_KEYS = [
  "approvalSnapshot",
  "contentTypePolicyId",
  "contractVersion",
  "inputProvenance",
  "isolationLabel",
  "limits",
  "parserPolicyId",
  "profileId",
].sort();
const LIMIT_KEYS = ["maxInputBytes", "maxOutputBytes", "timeoutMs"].sort();
const APPROVAL_KEYS = [
  "deploymentCandidateIsolationAccepted",
  "evidenceLifecycleConsumptionApproved",
  "productPublicLiveApproved",
  "twoDCApproved",
].sort();
const FIXTURE_PROVENANCE_KEYS = [
  "byteCount",
  "byteDigest",
  "bytesIncluded",
  "fixturePacketId",
  "kind",
  "parsedTextIncluded",
  "rawPayloadIncluded",
].sort();
const SYNTHETIC_PROVENANCE_KEYS = [
  "byteCount",
  "byteDigest",
  "bytesIncluded",
  "kind",
  "parsedTextIncluded",
  "rawPayloadIncluded",
  "syntheticInputId",
].sort();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function validOpaqueId(value: unknown, prefix: string): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith(prefix)
    && /^[A-Z0-9_]{12,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function validPolicyId(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith("POLICY_")
    && /^[A-Z0-9_]{8,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function validSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function validPositiveInteger(value: unknown, maxInclusive: number): value is number {
  return typeof value === "number"
    && Number.isInteger(value)
    && value > 0
    && value <= maxInclusive;
}

function baseDecision(params: {
  readonly profileId?: typeof SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID | null;
  readonly isolationLabel?: typeof SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL | null;
  readonly admittedProvenanceKind?: "fixture_control" | "synthetic_inert" | null;
  readonly admittedByteCount?: number;
  readonly admittedByteDigest?: string | null;
} = {}): SourceAcquisitionParserWorkerAdmissionNoExecutionProof {
  return {
    admissionVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_VERSION,
    contractVersion: SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
    visibility: "internal_only",
    profileId: params.profileId ?? null,
    isolationLabel: params.isolationLabel ?? null,
    executionStatus: "blocked_no_parser_execution",
    parserExecution: false,
    workerSpawned: false,
    bytesConsumed: false,
    transportPacketAccepted: false,
    transportFrameAccepted: false,
    realFetchedBytesAccepted: false,
    twoDCApproved: false,
    productPublicLiveApproved: false,
    evidenceLifecycleConsumptionApproved: false,
    deploymentCandidateIsolationAccepted: false,
    cacheTouched: false,
    sourceReliabilityTouched: false,
    publicExposure: false,
    liveJobs: false,
    admittedProvenanceKind: params.admittedProvenanceKind ?? null,
    admittedByteCount: params.admittedByteCount ?? 0,
    admittedByteDigest: params.admittedByteDigest ?? null,
    parsedMaterialPacket: null,
    parserOutput: null,
    evidenceCorpus: null,
  };
}

function blocked(
  blockedReason: SourceAcquisitionParserWorkerAdmissionBlockedReason,
): SourceAcquisitionParserWorkerAdmissionDecision {
  return {
    status: "blocked_pre_parser_execution",
    blockedReason,
    ...baseDecision(),
  };
}

function admitted(
  inputProvenance: SourceAcquisitionParserWorkerP0InputProvenance,
): SourceAcquisitionParserWorkerAdmissionDecision {
  return {
    status: "p0_admitted_fixture_or_synthetic_inert",
    blockedReason: null,
    ...baseDecision({
      profileId: SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
      isolationLabel: SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
      admittedProvenanceKind: inputProvenance.kind,
      admittedByteCount: inputProvenance.byteCount,
      admittedByteDigest: inputProvenance.byteDigest,
    }),
  };
}

function limitsAreValid(value: unknown): value is SourceAcquisitionParserWorkerAdmissionRequest["limits"] {
  return isRecord(value)
    && hasExactKeys(value, LIMIT_KEYS)
    && validPositiveInteger(value.maxInputBytes, 64 * 1024)
    && validPositiveInteger(value.maxOutputBytes, 16 * 1024)
    && validPositiveInteger(value.timeoutMs, 30_000);
}

function approvalSnapshotIsValid(
  value: unknown,
): value is SourceAcquisitionParserWorkerAdmissionRequest["approvalSnapshot"] {
  return isRecord(value)
    && hasExactKeys(value, APPROVAL_KEYS)
    && value.twoDCApproved === false
    && value.productPublicLiveApproved === false
    && value.evidenceLifecycleConsumptionApproved === false
    && value.deploymentCandidateIsolationAccepted === false;
}

function approvalBlockedReason(
  value: unknown,
): SourceAcquisitionParserWorkerAdmissionBlockedReason | null {
  if (!isRecord(value) || !hasExactKeys(value, APPROVAL_KEYS)) {
    return "request_malformed";
  }
  if (value.twoDCApproved !== false) {
    return "two_d_c_not_approved";
  }
  if (
    value.productPublicLiveApproved !== false
    || value.evidenceLifecycleConsumptionApproved !== false
  ) {
    return "product_public_live_not_approved";
  }
  if (value.deploymentCandidateIsolationAccepted !== false) {
    return "parser_isolation_not_deployment_candidate";
  }
  return null;
}

function hasBytePayloadField(value: Record<string, unknown>): boolean {
  return "bytes" in value
    || "rawBytes" in value
    || "payload" in value
    || "payloadBase64" in value
    || "body" in value;
}

function inputProvenanceBlockedReason(
  value: unknown,
): SourceAcquisitionParserWorkerAdmissionBlockedReason | null {
  if (!isRecord(value)) {
    return "provenance_not_fixture_control_or_synthetic_inert";
  }
  if (hasBytePayloadField(value)) {
    return "real_fetched_bytes_rejected";
  }
  if (
    value.kind === "source_acquisition_content_transport_owned_packet_7n3b3_2c_a"
    || value.kind === "transport_owned_packet"
  ) {
    return "transport_packet_rejected";
  }
  if (
    value.kind === "source_acquisition_content_transport_owned_byte_frame_7n3b3_2c_a"
    || value.kind === "transport_owned_frame"
  ) {
    return "transport_frame_rejected";
  }
  if (value.kind === "real_fetched_bytes") {
    return "real_fetched_bytes_rejected";
  }
  if (value.kind !== "fixture_control" && value.kind !== "synthetic_inert") {
    return "provenance_not_fixture_control_or_synthetic_inert";
  }
  return null;
}

function fixtureProvenanceIsValid(
  value: Record<string, unknown>,
): value is Extract<SourceAcquisitionParserWorkerP0InputProvenance, { kind: "fixture_control" }> {
  return hasExactKeys(value, FIXTURE_PROVENANCE_KEYS)
    && value.kind === "fixture_control"
    && validOpaqueId(value.fixturePacketId, "OPAQUE_FIXTURE_PACKET_")
    && validPositiveInteger(value.byteCount, 64 * 1024)
    && validSha256(value.byteDigest)
    && value.bytesIncluded === false
    && value.rawPayloadIncluded === false
    && value.parsedTextIncluded === false;
}

function syntheticProvenanceIsValid(
  value: Record<string, unknown>,
): value is Extract<SourceAcquisitionParserWorkerP0InputProvenance, { kind: "synthetic_inert" }> {
  return hasExactKeys(value, SYNTHETIC_PROVENANCE_KEYS)
    && value.kind === "synthetic_inert"
    && validOpaqueId(value.syntheticInputId, "SYNTHETIC_INERT_")
    && validPositiveInteger(value.byteCount, 64 * 1024)
    && validSha256(value.byteDigest)
    && value.bytesIncluded === false
    && value.rawPayloadIncluded === false
    && value.parsedTextIncluded === false;
}

function validatedP0Provenance(
  value: unknown,
): SourceAcquisitionParserWorkerP0InputProvenance | null {
  if (!isRecord(value)) {
    return null;
  }
  if (fixtureProvenanceIsValid(value)) {
    return value;
  }
  if (syntheticProvenanceIsValid(value)) {
    return value;
  }
  return null;
}

export function evaluateSourceAcquisitionParserWorkerAdmission(
  request: SourceAcquisitionParserWorkerAdmissionRequest,
): SourceAcquisitionParserWorkerAdmissionDecision {
  if (!isRecord(request) || !hasExactKeys(request, REQUEST_KEYS)) {
    return blocked("request_malformed");
  }
  if (request.contractVersion !== SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION) {
    return blocked("request_malformed");
  }
  if (request.profileId === "P2_DEPLOYMENT_CANDIDATE_ISOLATED_WORKER") {
    return blocked("parser_isolation_not_deployment_candidate");
  }
  if (request.profileId !== SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID) {
    return blocked("profile_not_p0");
  }
  if (request.isolationLabel !== SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL) {
    return blocked("p0_not_security_boundary");
  }
  if (!validPolicyId(request.parserPolicyId) || !validPolicyId(request.contentTypePolicyId)) {
    return blocked("request_malformed");
  }
  if (!limitsAreValid(request.limits)) {
    return blocked("request_malformed");
  }

  const approvalReason = approvalBlockedReason(request.approvalSnapshot);
  if (approvalReason) {
    return blocked(approvalReason);
  }
  if (!approvalSnapshotIsValid(request.approvalSnapshot)) {
    return blocked("request_malformed");
  }

  const provenanceReason = inputProvenanceBlockedReason(request.inputProvenance);
  if (provenanceReason) {
    return blocked(provenanceReason);
  }

  const inputProvenance = validatedP0Provenance(request.inputProvenance);
  if (!inputProvenance) {
    return blocked("provenance_not_fixture_control_or_synthetic_inert");
  }
  if (inputProvenance.byteCount > request.limits.maxInputBytes) {
    return blocked("request_malformed");
  }

  return admitted(inputProvenance);
}
