import { createHash, createHmac, randomBytes } from "node:crypto";
import { SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION } from "./source-acquisition-content-envelope";

export const SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION =
  "v2.source-acquisition.content-packet-sink.7n3b3-2b";
export const SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION =
  "v2.source-acquisition.content-packet-sink.7n3b3-2c-a";

export type SourceAcquisitionContentPacketLifecycleStatus =
  | "fixture_control_materialized"
  | "transport_owned_materialized"
  | "disposed";

export type SourceAcquisitionContentPacketSinkAuthoritySnapshot = {
  readonly kind: "source_acquisition_content_packet_sink_authority_7n3b3_2b";
  readonly source: "v2_7n3b3_2b_fixture_control_packet_sink";
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION;
  readonly contentRuntimeVersion: typeof SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION;
  readonly visibility: "internal_only";
  readonly packetSinkAuthorityId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly maxRetainedPackets: number;
  readonly maxRetainedBytes: number;
  readonly capabilityScope: {
    readonly fixtureControlOnly: true;
    readonly realTransportBytes: false;
    readonly productRuntime: false;
    readonly publicExposure: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly durableStorage: false;
    readonly sourceReliability: false;
    readonly semanticInterpretation: false;
  };
};

declare const sourceAcquisitionContentPacketSinkAuthorityBrand: unique symbol;
declare const sourceAcquisitionContentFixturePacketBrand: unique symbol;
declare const sourceAcquisitionContentTransportPacketSinkAuthorityBrand: unique symbol;
declare const sourceAcquisitionContentTransportOwnedByteFrameBrand: unique symbol;
declare const sourceAcquisitionContentTransportOwnedPacketBrand: unique symbol;

export type SourceAcquisitionContentPacketSinkAuthority =
  Readonly<SourceAcquisitionContentPacketSinkAuthoritySnapshot> & {
    readonly [sourceAcquisitionContentPacketSinkAuthorityBrand]: "source_acquisition_content_packet_sink_authority";
  };

export type SourceAcquisitionContentFixturePacket = {
  readonly kind: "source_acquisition_content_fixture_packet_7n3b3_2b";
  readonly source: "fixture_control_only_7n3b3_2b";
  readonly visibility: "internal_only";
  readonly fixturePacketId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly byteCount: number;
  readonly byteDigest: string;
  readonly lifecycleStatus: SourceAcquisitionContentPacketLifecycleStatus;
  readonly disposalStatus: "not_disposed" | "disposed";
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
  readonly [sourceAcquisitionContentFixturePacketBrand]: "source_acquisition_content_fixture_packet";
};

export type SourceAcquisitionContentPacketSinkOutcome =
  | {
      readonly status: "accepted";
      readonly packet: SourceAcquisitionContentFixturePacket;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "disposed";
      readonly packet: null;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly packet: null;
      readonly blockedReasons: readonly string[];
    };

const SOURCE_ACQUISITION_CONTENT_FIXTURE_PARSER_RUNNER_PROTOCOL_VERSION =
  "v2.source-acquisition.content-parser-runner-protocol.7n3b3-2d-a";
const fixtureParserRunnerBlockedReasons = new Set([
  "request_invalid",
  "request_too_large",
  "signal_aborted",
  "worker_unavailable",
  "runner_start_failed",
  "runner_timed_out",
  "runner_cancelled",
  "runner_stdout_oversized",
  "runner_stderr_output",
  "runner_stderr_oversized",
  "runner_response_malformed",
  "runner_failed",
]);

type SourceAcquisitionContentFixtureParserRunnerStructuralStatus =
  | "parsed_structural"
  | "request_invalid"
  | "runner_unavailable"
  | "runner_start_failed"
  | "runner_timed_out"
  | "runner_cancelled"
  | "runner_stdout_oversized"
  | "runner_stderr_output"
  | "runner_stderr_oversized"
  | "runner_response_malformed"
  | "runner_failed";

type SourceAcquisitionContentFixtureParserRunnerBlockedReason =
  typeof fixtureParserRunnerBlockedReasons extends Set<infer Reason> ? Reason : never;

type SourceAcquisitionContentFixtureParserRunnerMaterial = {
  readonly bytes: readonly number[];
  readonly fixturePacketId: string;
  readonly parserAttemptId: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly byteCount: number;
  readonly byteDigest: string;
};

type SourceAcquisitionContentFixtureParserRunnerCallbackOutcome = {
  readonly status: "success" | "blocked" | "timed_out" | "cancelled";
  readonly structuralStatus: SourceAcquisitionContentFixtureParserRunnerStructuralStatus;
  readonly parserAttemptId: string;
  readonly runnerVersion: typeof SOURCE_ACQUISITION_CONTENT_FIXTURE_PARSER_RUNNER_PROTOCOL_VERSION | null;
  readonly observedByteCount: number;
  readonly decodedTextLength: number;
  readonly blockedReasons: readonly SourceAcquisitionContentFixtureParserRunnerBlockedReason[];
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly applicabilityIncluded: false;
  readonly probativeValueIncluded: false;
  readonly sourceReliabilityTouched: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
};

type SourceAcquisitionContentFixtureParserRunnerConsumptionOutcome =
  | {
      readonly status: "completed";
      readonly outcome: SourceAcquisitionContentFixtureParserRunnerCallbackOutcome;
      readonly disposalStatus: "disposed";
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly outcome: null;
      readonly disposalStatus: "disposed" | "not_applicable" | "not_disposed";
      readonly blockedReasons: readonly string[];
    };

export type SourceAcquisitionContentTransportPacketSinkAuthoritySnapshot = {
  readonly kind: "source_acquisition_content_transport_packet_sink_authority_7n3b3_2c_a";
  readonly source: "v2_7n3b3_2c_a_transport_packet_sink";
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION;
  readonly contentRuntimeVersion: typeof SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION;
  readonly visibility: "internal_only";
  readonly packetSinkAuthorityId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly hmacAlgorithm: "hmac_sha256";
  readonly hmacKeyId: string;
  readonly maxRetainedPackets: number;
  readonly maxRetainedBytes: number;
  readonly capabilityScope: {
    readonly fixtureControlOnly: false;
    readonly realTransportBytes: true;
    readonly productRuntime: false;
    readonly publicExposure: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly durableStorage: false;
    readonly sourceReliability: false;
    readonly semanticInterpretation: false;
  };
};

export type SourceAcquisitionContentTransportPacketSinkAuthority =
  Readonly<SourceAcquisitionContentTransportPacketSinkAuthoritySnapshot> & {
    readonly [sourceAcquisitionContentTransportPacketSinkAuthorityBrand]:
      "source_acquisition_content_transport_packet_sink_authority";
  };

export type SourceAcquisitionContentTransportOwnedByteFrame = {
  readonly kind: "source_acquisition_content_transport_owned_byte_frame_7n3b3_2c_a";
  readonly source: "transport_owner_success_path_7n3b3_2c_a";
  readonly visibility: "internal_only";
  readonly packageId: "source_acquisition_content_transport_packet_handoff_7n3b3_2c_a";
  readonly versionId: typeof SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION;
  readonly contentAuthoritySnapshotHash: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly contentBudgetSnapshotHash: string;
  readonly fetchAttemptId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly parserAuthorizationStatus: "not_authorized";
  readonly parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED";
  readonly contentTypePolicyId: string;
  readonly contentTypeState: "accepted";
  readonly byteCount: number;
  readonly byteDigest: string;
  readonly hmacAlgorithm: "hmac_sha256";
  readonly hmacKeyId: string;
  readonly hmacValue: string;
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
  readonly [sourceAcquisitionContentTransportOwnedByteFrameBrand]:
    "source_acquisition_content_transport_owned_byte_frame";
};

export type SourceAcquisitionContentTransportPacketSealingOutcome =
  | {
      readonly status: "accepted";
      readonly frame: SourceAcquisitionContentTransportOwnedByteFrame;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly frame: null;
      readonly blockedReasons: readonly string[];
    };

type SourceAcquisitionContentTransportOwnedPacket = {
  readonly kind: "source_acquisition_content_transport_owned_packet_7n3b3_2c_a";
  readonly source: "transport_owner_success_path_7n3b3_2c_a";
  readonly visibility: "internal_only";
  readonly packetId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly parserAuthorizationStatus: "not_authorized";
  readonly parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED";
  readonly contentTypePolicyId: string;
  readonly byteCount: number;
  readonly byteDigest: string;
  readonly lifecycleStatus: SourceAcquisitionContentPacketLifecycleStatus;
  readonly disposalStatus: "not_disposed" | "disposed";
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
  readonly [sourceAcquisitionContentTransportOwnedPacketBrand]:
    "source_acquisition_content_transport_owned_packet";
};

export type SourceAcquisitionContentTransportPacketMaterializationOutcome =
  | {
      readonly status: "accepted";
      readonly packet: SourceAcquisitionContentTransportOwnedPacket;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "disposed";
      readonly packet: null;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly packet: null;
      readonly blockedReasons: readonly string[];
    };

export type SourceAcquisitionContentTransportPacketDisposalOutcome =
  | {
      readonly status: "disposed";
      readonly packet: null;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly packet: null;
      readonly blockedReasons: readonly string[];
    };

type SourceAcquisitionContentTransportByteState = {
  readonly kind: "source_acquisition_content_transport_success_byte_state_7n3b3_2c_a";
  readonly bytes: Uint8Array;
  readonly contentTypePolicyId: string;
  readonly contentTypeState: "accepted";
};

type SourceAcquisitionContentTransportSealingProvenance = {
  readonly contentAuthoritySnapshotHash: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly contentBudgetSnapshotHash: string;
  readonly fetchAttemptId: string;
  readonly executionTargetCanonicalHostnameReference: string;
  readonly executionTargetFixedPathReference: string;
  readonly executionTargetQueryReference: string;
};

type MutableFixturePacket = {
  -readonly [Key in keyof SourceAcquisitionContentFixturePacket]: SourceAcquisitionContentFixturePacket[Key];
};

type FixturePacketPublicMetadata = Pick<
  SourceAcquisitionContentFixturePacket,
  | "fixturePacketId"
  | "packetSinkAuthoritySnapshotHash"
  | "parserPolicyId"
  | "contentTypePolicyId"
  | "byteCount"
  | "byteDigest"
  | "lifecycleStatus"
  | "disposalStatus"
>;

type PacketSinkAuthorityState = {
  retainedPackets: number;
  retainedBytes: number;
};

type TransportPacketSinkAuthorityState = {
  retainedPackets: number;
  retainedBytes: number;
  hmacKeyMaterial: Buffer;
};

type FixturePacketState = {
  authority: SourceAcquisitionContentPacketSinkAuthority;
  bytes: Uint8Array;
  disposed: boolean;
  publicMetadata: FixturePacketPublicMetadata;
};

type TransportByteFrameState = {
  authority: SourceAcquisitionContentTransportPacketSinkAuthority;
  bytes: Uint8Array;
  disposed: boolean;
  canonicalPayload: string;
  retainedBytes: number;
  retentionCharged: boolean;
};

type TransportPacketPublicMetadata = Pick<
  SourceAcquisitionContentTransportOwnedPacket,
  | "packetId"
  | "packetSinkAuthoritySnapshotHash"
  | "parserAuthorizationStatus"
  | "parserPolicyId"
  | "contentTypePolicyId"
  | "byteCount"
  | "byteDigest"
  | "lifecycleStatus"
  | "disposalStatus"
>;

type TransportPacketState = {
  authority: SourceAcquisitionContentTransportPacketSinkAuthority;
  bytes: Uint8Array;
  disposed: boolean;
  publicMetadata: TransportPacketPublicMetadata;
};

const packetSinkAuthorities = new WeakSet<object>();
const packetSinkAuthorityStates = new WeakMap<object, PacketSinkAuthorityState>();
const fixturePackets = new WeakSet<object>();
const fixturePacketStates = new WeakMap<object, FixturePacketState>();
const transportPacketSinkAuthorities = new WeakSet<object>();
const transportPacketSinkAuthorityStates = new WeakMap<object, TransportPacketSinkAuthorityState>();
const transportOwnedByteFrames = new WeakSet<object>();
const transportOwnedByteFrameStates = new WeakMap<object, TransportByteFrameState>();
const transportOwnedPackets = new WeakSet<object>();
const transportOwnedPacketStates = new WeakMap<object, TransportPacketState>();
const approvedFixtureMaterial = new Map<string, Uint8Array>([
  ["OPAQUE_FIXTURE_PACKET_001", new TextEncoder().encode("fixture-control-material-alpha")],
  ["OPAQUE_FIXTURE_PACKET_002", new TextEncoder().encode("fixture-control-material-beta")],
  ["OPAQUE_FIXTURE_PACKET_003", new TextEncoder().encode("first")],
  ["OPAQUE_FIXTURE_PACKET_004", new TextEncoder().encode("second")],
  ["OPAQUE_FIXTURE_PACKET_005", new TextEncoder().encode("fixture-control-material-over-byte-cap")],
  ["OPAQUE_FIXTURE_PACKET_STDERR", new TextEncoder().encode("fixture-control-stderr")],
  ["OPAQUE_FIXTURE_PACKET_NONZERO", new TextEncoder().encode("fixture-control-nonzero")],
  ["OPAQUE_FIXTURE_PACKET_MALFORMED", new TextEncoder().encode("fixture-control-malformed")],
  ["OPAQUE_FIXTURE_PACKET_OVERSIZED_STDOUT", new TextEncoder().encode("fixture-control-oversized-stdout")],
  ["OPAQUE_FIXTURE_PACKET_OVERSIZED_STDERR", new TextEncoder().encode("fixture-control-oversized-stderr")],
  ["OPAQUE_FIXTURE_PACKET_STALL", new TextEncoder().encode("fixture-control-stall")],
  ["OPAQUE_FIXTURE_PACKET_UNICODE", new TextEncoder().encode("pruefung-multilingual-control")],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hmacSha256Hex(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex").toUpperCase();
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

function validFetchAttemptId(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith("ATT_")
    && /^[A-Z0-9_]{5,96}$/.test(value)
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

function validHmacValue(value: unknown): value is string {
  return typeof value === "string" && /^[A-F0-9]{64}$/.test(value);
}

function parserRunnerOutcomeIsValid(
  value: unknown,
): value is SourceAcquisitionContentFixtureParserRunnerCallbackOutcome {
  if (!isRecord(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "applicabilityIncluded",
    "blockedReasons",
    "decodedTextLength",
    "evidenceItemIncluded",
    "extractedTextIncluded",
    "observedByteCount",
    "parserAttemptId",
    "probativeValueIncluded",
    "publicPayloadIncluded",
    "rawPayloadIncluded",
    "reportProseIncluded",
    "runnerVersion",
    "sourceRecordIncluded",
    "sourceReliabilityTouched",
    "status",
    "structuralStatus",
    "verdictIncluded",
    "warningIncluded",
  ].sort();
  const observedByteCount = value.observedByteCount;
  const decodedTextLength = value.decodedTextLength;
  return keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index])
    && ["success", "blocked", "timed_out", "cancelled"].includes(value.status as string)
    && [
      "parsed_structural",
      "request_invalid",
      "runner_unavailable",
      "runner_start_failed",
      "runner_timed_out",
      "runner_cancelled",
      "runner_stdout_oversized",
      "runner_stderr_output",
      "runner_stderr_oversized",
      "runner_response_malformed",
      "runner_failed",
    ].includes(value.structuralStatus as string)
    && validOpaqueId(value.parserAttemptId, "PARSER_ATT_")
    && (
      value.runnerVersion === null
      || value.runnerVersion === SOURCE_ACQUISITION_CONTENT_FIXTURE_PARSER_RUNNER_PROTOCOL_VERSION
    )
    && typeof observedByteCount === "number"
    && Number.isInteger(observedByteCount)
    && observedByteCount >= 0
    && typeof decodedTextLength === "number"
    && Number.isInteger(decodedTextLength)
    && decodedTextLength >= 0
    && Array.isArray(value.blockedReasons)
    && value.blockedReasons.every((reason) =>
      typeof reason === "string" && fixtureParserRunnerBlockedReasons.has(reason)
    )
    && value.rawPayloadIncluded === false
    && value.extractedTextIncluded === false
    && value.publicPayloadIncluded === false
    && value.evidenceItemIncluded === false
    && value.sourceRecordIncluded === false
    && value.applicabilityIncluded === false
    && value.probativeValueIncluded === false
    && value.sourceReliabilityTouched === false
    && value.warningIncluded === false
    && value.verdictIncluded === false
    && value.reportProseIncluded === false;
}

function authoritySnapshotSeed(params: {
  readonly packetSinkAuthorityId: string;
  readonly maxRetainedPackets: number;
  readonly maxRetainedBytes: number;
}) {
  return {
    kind: "source_acquisition_content_packet_sink_authority_7n3b3_2b",
    source: "v2_7n3b3_2b_fixture_control_packet_sink",
    authorityVersion: SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION,
    contentRuntimeVersion: SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
    visibility: "internal_only",
    packetSinkAuthorityId: params.packetSinkAuthorityId,
    maxRetainedPackets: params.maxRetainedPackets,
    maxRetainedBytes: params.maxRetainedBytes,
    capabilityScope: {
      fixtureControlOnly: true,
      realTransportBytes: false,
      productRuntime: false,
      publicExposure: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      semanticInterpretation: false,
    },
  } as const;
}

function transportAuthoritySnapshotSeed(params: {
  readonly packetSinkAuthorityId: string;
  readonly hmacKeyId: string;
  readonly maxRetainedPackets: number;
  readonly maxRetainedBytes: number;
}) {
  return {
    kind: "source_acquisition_content_transport_packet_sink_authority_7n3b3_2c_a",
    source: "v2_7n3b3_2c_a_transport_packet_sink",
    authorityVersion: SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION,
    contentRuntimeVersion: SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION,
    visibility: "internal_only",
    packetSinkAuthorityId: params.packetSinkAuthorityId,
    hmacAlgorithm: "hmac_sha256",
    hmacKeyId: params.hmacKeyId,
    maxRetainedPackets: params.maxRetainedPackets,
    maxRetainedBytes: params.maxRetainedBytes,
    capabilityScope: {
      fixtureControlOnly: false,
      realTransportBytes: true,
      productRuntime: false,
      publicExposure: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      semanticInterpretation: false,
    },
  } as const;
}

function packetIsShaped(value: SourceAcquisitionContentFixturePacket): boolean {
  return value.kind === "source_acquisition_content_fixture_packet_7n3b3_2b"
    && value.source === "fixture_control_only_7n3b3_2b"
    && value.visibility === "internal_only"
    && validOpaqueId(value.fixturePacketId, "OPAQUE_FIXTURE_PACKET_")
    && validSha256(value.packetSinkAuthoritySnapshotHash)
    && validPolicyId(value.parserPolicyId)
    && validPolicyId(value.contentTypePolicyId)
    && Number.isInteger(value.byteCount)
    && value.byteCount > 0
    && value.byteCount <= 64 * 1024
    && validSha256(value.byteDigest)
    && ["fixture_control_materialized", "disposed"].includes(value.lifecycleStatus)
    && ["not_disposed", "disposed"].includes(value.disposalStatus)
    && value.rawPayloadIncluded === false
    && value.extractedTextIncluded === false
    && value.publicPayloadIncluded === false
    && value.evidenceItemIncluded === false
    && value.sourceRecordIncluded === false
    && value.warningIncluded === false
    && value.verdictIncluded === false
    && value.reportProseIncluded === false;
}

function transportFrameIsShaped(value: SourceAcquisitionContentTransportOwnedByteFrame): boolean {
  return value.kind === "source_acquisition_content_transport_owned_byte_frame_7n3b3_2c_a"
    && value.source === "transport_owner_success_path_7n3b3_2c_a"
    && value.visibility === "internal_only"
    && value.packageId === "source_acquisition_content_transport_packet_handoff_7n3b3_2c_a"
    && value.versionId === SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION
    && validSha256(value.contentAuthoritySnapshotHash)
    && validSha256(value.providerNetworkAuthoritySnapshotHash)
    && validSha256(value.contentTargetSnapshotHash)
    && validSha256(value.contentBudgetSnapshotHash)
    && validFetchAttemptId(value.fetchAttemptId)
    && validSha256(value.packetSinkAuthoritySnapshotHash)
    && value.parserAuthorizationStatus === "not_authorized"
    && value.parserPolicyId === "POLICY_PARSER_NOT_AUTHORIZED"
    && validPolicyId(value.contentTypePolicyId)
    && value.contentTypeState === "accepted"
    && Number.isInteger(value.byteCount)
    && value.byteCount > 0
    && value.byteCount <= 1024 * 1024
    && validSha256(value.byteDigest)
    && value.hmacAlgorithm === "hmac_sha256"
    && validOpaqueId(value.hmacKeyId, "OPAQUE_TRANSPORT_PACKET_HMAC_KEY_")
    && validHmacValue(value.hmacValue)
    && value.rawPayloadIncluded === false
    && value.extractedTextIncluded === false
    && value.publicPayloadIncluded === false
    && value.evidenceItemIncluded === false
    && value.sourceRecordIncluded === false
    && value.warningIncluded === false
    && value.verdictIncluded === false
    && value.reportProseIncluded === false;
}

function fixtureBytesFor(fixturePacketId: string): Uint8Array | null {
  const approved = approvedFixtureMaterial.get(fixturePacketId);
  return approved ? new Uint8Array(approved) : null;
}

function disposedPublicMetadata(): FixturePacketPublicMetadata {
  return {
    fixturePacketId: "OPAQUE_FIXTURE_PACKET_DISPOSED",
    packetSinkAuthoritySnapshotHash: "0".repeat(64),
    parserPolicyId: "POLICY_DISPOSED",
    contentTypePolicyId: "POLICY_DISPOSED",
    byteCount: 0,
    byteDigest: "0".repeat(64),
    lifecycleStatus: "disposed",
    disposalStatus: "disposed",
  };
}

function disposedTransportPacketPublicMetadata(): TransportPacketPublicMetadata {
  return {
    packetId: "OPAQUE_TRANSPORT_PACKET_DISPOSED",
    packetSinkAuthoritySnapshotHash: "0".repeat(64),
    parserAuthorizationStatus: "not_authorized",
    parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED",
    contentTypePolicyId: "POLICY_DISPOSED",
    byteCount: 0,
    byteDigest: "0".repeat(64),
    lifecycleStatus: "disposed",
    disposalStatus: "disposed",
  };
}

function activePublicMetadata(params: {
  readonly fixturePacketId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly byteCount: number;
  readonly byteDigest: string;
}): FixturePacketPublicMetadata {
  return {
    fixturePacketId: params.fixturePacketId,
    packetSinkAuthoritySnapshotHash: params.packetSinkAuthoritySnapshotHash,
    parserPolicyId: params.parserPolicyId,
    contentTypePolicyId: params.contentTypePolicyId,
    byteCount: params.byteCount,
    byteDigest: params.byteDigest,
    lifecycleStatus: "fixture_control_materialized",
    disposalStatus: "not_disposed",
  };
}

function activeTransportPacketPublicMetadata(params: {
  readonly packetId: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly contentTypePolicyId: string;
  readonly byteCount: number;
  readonly byteDigest: string;
}): TransportPacketPublicMetadata {
  return {
    packetId: params.packetId,
    packetSinkAuthoritySnapshotHash: params.packetSinkAuthoritySnapshotHash,
    parserAuthorizationStatus: "not_authorized",
    parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED",
    contentTypePolicyId: params.contentTypePolicyId,
    byteCount: params.byteCount,
    byteDigest: params.byteDigest,
    lifecycleStatus: "transport_owned_materialized",
    disposalStatus: "not_disposed",
  };
}

function readPacketPublicMetadata(packet: object): FixturePacketPublicMetadata {
  return fixturePacketStates.get(packet)?.publicMetadata ?? disposedPublicMetadata();
}

function readTransportPacketPublicMetadata(packet: object): TransportPacketPublicMetadata {
  return transportOwnedPacketStates.get(packet)?.publicMetadata ?? disposedTransportPacketPublicMetadata();
}

function defineFixturePacketProperties(packet: MutableFixturePacket): void {
  Object.defineProperties(packet, {
    kind: { enumerable: true, value: "source_acquisition_content_fixture_packet_7n3b3_2b" },
    source: { enumerable: true, value: "fixture_control_only_7n3b3_2b" },
    visibility: { enumerable: true, value: "internal_only" },
    fixturePacketId: { enumerable: true, get: () => readPacketPublicMetadata(packet).fixturePacketId },
    packetSinkAuthoritySnapshotHash: {
      enumerable: true,
      get: () => readPacketPublicMetadata(packet).packetSinkAuthoritySnapshotHash,
    },
    parserPolicyId: { enumerable: true, get: () => readPacketPublicMetadata(packet).parserPolicyId },
    contentTypePolicyId: { enumerable: true, get: () => readPacketPublicMetadata(packet).contentTypePolicyId },
    byteCount: { enumerable: true, get: () => readPacketPublicMetadata(packet).byteCount },
    byteDigest: { enumerable: true, get: () => readPacketPublicMetadata(packet).byteDigest },
    lifecycleStatus: { enumerable: true, get: () => readPacketPublicMetadata(packet).lifecycleStatus },
    disposalStatus: { enumerable: true, get: () => readPacketPublicMetadata(packet).disposalStatus },
    rawPayloadIncluded: { enumerable: true, value: false },
    extractedTextIncluded: { enumerable: true, value: false },
    publicPayloadIncluded: { enumerable: true, value: false },
    evidenceItemIncluded: { enumerable: true, value: false },
    sourceRecordIncluded: { enumerable: true, value: false },
    warningIncluded: { enumerable: true, value: false },
    verdictIncluded: { enumerable: true, value: false },
    reportProseIncluded: { enumerable: true, value: false },
  });
}

function defineTransportOwnedPacketProperties(packet: SourceAcquisitionContentTransportOwnedPacket): void {
  Object.defineProperties(packet, {
    kind: { enumerable: true, value: "source_acquisition_content_transport_owned_packet_7n3b3_2c_a" },
    source: { enumerable: true, value: "transport_owner_success_path_7n3b3_2c_a" },
    visibility: { enumerable: true, value: "internal_only" },
    packetId: { enumerable: true, get: () => readTransportPacketPublicMetadata(packet).packetId },
    packetSinkAuthoritySnapshotHash: {
      enumerable: true,
      get: () => readTransportPacketPublicMetadata(packet).packetSinkAuthoritySnapshotHash,
    },
    parserAuthorizationStatus: {
      enumerable: true,
      get: () => readTransportPacketPublicMetadata(packet).parserAuthorizationStatus,
    },
    parserPolicyId: { enumerable: true, get: () => readTransportPacketPublicMetadata(packet).parserPolicyId },
    contentTypePolicyId: {
      enumerable: true,
      get: () => readTransportPacketPublicMetadata(packet).contentTypePolicyId,
    },
    byteCount: { enumerable: true, get: () => readTransportPacketPublicMetadata(packet).byteCount },
    byteDigest: { enumerable: true, get: () => readTransportPacketPublicMetadata(packet).byteDigest },
    lifecycleStatus: { enumerable: true, get: () => readTransportPacketPublicMetadata(packet).lifecycleStatus },
    disposalStatus: { enumerable: true, get: () => readTransportPacketPublicMetadata(packet).disposalStatus },
    rawPayloadIncluded: { enumerable: true, value: false },
    extractedTextIncluded: { enumerable: true, value: false },
    publicPayloadIncluded: { enumerable: true, value: false },
    evidenceItemIncluded: { enumerable: true, value: false },
    sourceRecordIncluded: { enumerable: true, value: false },
    warningIncluded: { enumerable: true, value: false },
    verdictIncluded: { enumerable: true, value: false },
    reportProseIncluded: { enumerable: true, value: false },
  });
}

function canonicalTransportFramePayload(fields: {
  readonly packageId: string;
  readonly versionId: string;
  readonly contentAuthoritySnapshotHash: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly contentBudgetSnapshotHash: string;
  readonly fetchAttemptId: string;
  readonly executionTargetCanonicalHostnameReference: string;
  readonly executionTargetFixedPathReference: string;
  readonly executionTargetQueryReference: string;
  readonly packetSinkAuthoritySnapshotHash: string;
  readonly parserAuthorizationStatus: "not_authorized";
  readonly parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED";
  readonly contentTypePolicyId: string;
  readonly contentTypeState: "accepted";
  readonly byteCount: number;
  readonly byteDigest: string;
  readonly hmacAlgorithm: "hmac_sha256";
  readonly hmacKeyId: string;
}): string {
  return [
    ["packageId", fields.packageId],
    ["versionId", fields.versionId],
    ["contentAuthoritySnapshotHash", fields.contentAuthoritySnapshotHash],
    ["providerNetworkAuthoritySnapshotHash", fields.providerNetworkAuthoritySnapshotHash],
    ["contentTargetSnapshotHash", fields.contentTargetSnapshotHash],
    ["contentBudgetSnapshotHash", fields.contentBudgetSnapshotHash],
    ["fetchAttemptId", fields.fetchAttemptId],
    ["executionTargetCanonicalHostnameReference", fields.executionTargetCanonicalHostnameReference],
    ["executionTargetFixedPathReference", fields.executionTargetFixedPathReference],
    ["executionTargetQueryReference", fields.executionTargetQueryReference],
    ["packetSinkAuthoritySnapshotHash", fields.packetSinkAuthoritySnapshotHash],
    ["parserAuthorizationStatus", fields.parserAuthorizationStatus],
    ["parserPolicyId", fields.parserPolicyId],
    ["contentTypePolicyId", fields.contentTypePolicyId],
    ["contentTypeState", fields.contentTypeState],
    ["byteCount", fields.byteCount],
    ["byteDigest", fields.byteDigest],
    ["hmacAlgorithm", fields.hmacAlgorithm],
    ["hmacKeyId", fields.hmacKeyId],
  ].map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n");
}

function rejectTransportPacket(reason: string): SourceAcquisitionContentTransportPacketMaterializationOutcome {
  return { status: "rejected", packet: null, blockedReasons: [reason] };
}

export function createSourceAcquisitionContentPacketSinkAuthority(params: {
  readonly packetSinkAuthorityId?: string;
  readonly maxRetainedPackets?: number;
  readonly maxRetainedBytes?: number;
} = {}): SourceAcquisitionContentPacketSinkAuthority {
  const maxRetainedPackets = params.maxRetainedPackets ?? 8;
  const maxRetainedBytes = params.maxRetainedBytes ?? 256 * 1024;
  const packetSinkAuthorityId = params.packetSinkAuthorityId ?? "OPAQUE_PACKET_SINK_AUTHORITY_001";

  if (
    !validOpaqueId(packetSinkAuthorityId, "OPAQUE_PACKET_SINK_AUTHORITY_")
    || !Number.isInteger(maxRetainedPackets)
    || maxRetainedPackets <= 0
    || maxRetainedPackets > 32
    || !Number.isInteger(maxRetainedBytes)
    || maxRetainedBytes <= 0
    || maxRetainedBytes > 1024 * 1024
  ) {
    throw new Error("Invalid V2 source-acquisition content packet sink authority.");
  }

  const seed = authoritySnapshotSeed({
    packetSinkAuthorityId,
    maxRetainedPackets,
    maxRetainedBytes,
  });
  const authority = {
    ...seed,
    packetSinkAuthoritySnapshotHash: sha256Json(seed),
    capabilityScope: Object.freeze({ ...seed.capabilityScope }),
  };

  Object.freeze(authority);
  packetSinkAuthorities.add(authority);
  packetSinkAuthorityStates.set(authority, {
    retainedPackets: 0,
    retainedBytes: 0,
  });
  return authority as SourceAcquisitionContentPacketSinkAuthority;
}

export function isSourceAcquisitionContentPacketSinkAuthority(
  value: unknown,
): value is SourceAcquisitionContentPacketSinkAuthority {
  return isRecord(value)
    && packetSinkAuthorities.has(value)
    && value.packetSinkAuthoritySnapshotHash === sha256Json(authoritySnapshotSeed({
      packetSinkAuthorityId: value.packetSinkAuthorityId as string,
      maxRetainedPackets: value.maxRetainedPackets as number,
      maxRetainedBytes: value.maxRetainedBytes as number,
    }));
}

export function readSourceAcquisitionContentPacketSinkAuthoritySnapshot(
  authority: SourceAcquisitionContentPacketSinkAuthority,
): SourceAcquisitionContentPacketSinkAuthoritySnapshot {
  if (!isSourceAcquisitionContentPacketSinkAuthority(authority)) {
    throw new Error("Source-acquisition content packet sink authority was not created by the runtime owner.");
  }

  return {
    kind: authority.kind,
    source: authority.source,
    authorityVersion: authority.authorityVersion,
    contentRuntimeVersion: authority.contentRuntimeVersion,
    visibility: authority.visibility,
    packetSinkAuthorityId: authority.packetSinkAuthorityId,
    packetSinkAuthoritySnapshotHash: authority.packetSinkAuthoritySnapshotHash,
    maxRetainedPackets: authority.maxRetainedPackets,
    maxRetainedBytes: authority.maxRetainedBytes,
    capabilityScope: { ...authority.capabilityScope },
  };
}

export function createSourceAcquisitionContentTransportPacketSinkAuthority(params: {
  readonly packetSinkAuthorityId?: string;
  readonly hmacKeyId?: string;
  readonly maxRetainedPackets?: number;
  readonly maxRetainedBytes?: number;
} = {}): SourceAcquisitionContentTransportPacketSinkAuthority {
  const maxRetainedPackets = params.maxRetainedPackets ?? 8;
  const maxRetainedBytes = params.maxRetainedBytes ?? 256 * 1024;
  const packetSinkAuthorityId = params.packetSinkAuthorityId ?? "OPAQUE_TRANSPORT_PACKET_SINK_AUTHORITY_001";
  const hmacKeyId = params.hmacKeyId ?? "OPAQUE_TRANSPORT_PACKET_HMAC_KEY_001";

  if (
    !validOpaqueId(packetSinkAuthorityId, "OPAQUE_TRANSPORT_PACKET_SINK_AUTHORITY_")
    || !validOpaqueId(hmacKeyId, "OPAQUE_TRANSPORT_PACKET_HMAC_KEY_")
    || !Number.isInteger(maxRetainedPackets)
    || maxRetainedPackets <= 0
    || maxRetainedPackets > 32
    || !Number.isInteger(maxRetainedBytes)
    || maxRetainedBytes <= 0
    || maxRetainedBytes > 1024 * 1024
  ) {
    throw new Error("Invalid V2 source-acquisition content transport packet sink authority.");
  }

  const seed = transportAuthoritySnapshotSeed({
    packetSinkAuthorityId,
    hmacKeyId,
    maxRetainedPackets,
    maxRetainedBytes,
  });
  const authority = {
    ...seed,
    packetSinkAuthoritySnapshotHash: sha256Json(seed),
    capabilityScope: Object.freeze({ ...seed.capabilityScope }),
  };

  Object.freeze(authority);
  transportPacketSinkAuthorities.add(authority);
  transportPacketSinkAuthorityStates.set(authority, {
    retainedPackets: 0,
    retainedBytes: 0,
    hmacKeyMaterial: randomBytes(32),
  });
  return authority as SourceAcquisitionContentTransportPacketSinkAuthority;
}

function isSourceAcquisitionContentTransportPacketSinkAuthority(
  value: unknown,
): value is SourceAcquisitionContentTransportPacketSinkAuthority {
  return isRecord(value)
    && transportPacketSinkAuthorities.has(value)
    && value.packetSinkAuthoritySnapshotHash === sha256Json(transportAuthoritySnapshotSeed({
      packetSinkAuthorityId: value.packetSinkAuthorityId as string,
      hmacKeyId: value.hmacKeyId as string,
      maxRetainedPackets: value.maxRetainedPackets as number,
      maxRetainedBytes: value.maxRetainedBytes as number,
    }));
}

function transportByteStateIsValid(value: unknown): value is SourceAcquisitionContentTransportByteState {
  return isRecord(value)
    && value.kind === "source_acquisition_content_transport_success_byte_state_7n3b3_2c_a"
    && value.bytes instanceof Uint8Array
    && value.bytes.byteLength > 0
    && value.bytes.byteLength <= 1024 * 1024
    && validPolicyId(value.contentTypePolicyId)
    && value.contentTypeState === "accepted"
    && false;
}

function transportSealingProvenanceIsValid(
  value: unknown,
): value is SourceAcquisitionContentTransportSealingProvenance {
  return isRecord(value)
    && validSha256(value.contentAuthoritySnapshotHash)
    && validSha256(value.providerNetworkAuthoritySnapshotHash)
    && validSha256(value.contentTargetSnapshotHash)
    && validSha256(value.contentBudgetSnapshotHash)
    && validFetchAttemptId(value.fetchAttemptId)
    && typeof value.executionTargetCanonicalHostnameReference === "string"
    && value.executionTargetCanonicalHostnameReference.startsWith("keyed_hmac:")
    && typeof value.executionTargetFixedPathReference === "string"
    && value.executionTargetFixedPathReference.startsWith("keyed_hmac:")
    && typeof value.executionTargetQueryReference === "string"
    && value.executionTargetQueryReference.startsWith("keyed_hmac:");
}

function transportOwnedBytesAreValid(params: {
  readonly transportBytes: Uint8Array;
  readonly contentTypePolicyId: string;
  readonly contentTypeState: "accepted";
}): boolean {
  return params.transportBytes instanceof Uint8Array
    && params.transportBytes.byteLength > 0
    && params.transportBytes.byteLength <= 1024 * 1024
    && validPolicyId(params.contentTypePolicyId)
    && params.contentTypeState === "accepted";
}

function sealValidatedSourceAcquisitionContentTransportOwnedByteFrame(params: {
  readonly authority: SourceAcquisitionContentTransportPacketSinkAuthority;
  readonly provenance: SourceAcquisitionContentTransportSealingProvenance;
  readonly transportBytes: Uint8Array;
  readonly contentTypePolicyId: string;
  readonly contentTypeState: "accepted";
}): SourceAcquisitionContentTransportPacketSealingOutcome {
  const bytes = new Uint8Array(params.transportBytes);
  const byteCount = bytes.byteLength;
  const byteDigest = sha256Bytes(bytes);
  const state = transportPacketSinkAuthorityStates.get(params.authority);
  if (!state) {
    return { status: "rejected", frame: null, blockedReasons: ["authority_state_missing"] };
  }
  if (state.retainedPackets + 1 > params.authority.maxRetainedPackets) {
    return { status: "rejected", frame: null, blockedReasons: ["packet_count_cap_exceeded"] };
  }
  if (state.retainedBytes + byteCount > params.authority.maxRetainedBytes) {
    return { status: "rejected", frame: null, blockedReasons: ["retained_byte_cap_exceeded"] };
  }

  const canonicalPayload = canonicalTransportFramePayload({
    packageId: "source_acquisition_content_transport_packet_handoff_7n3b3_2c_a",
    versionId: SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION,
    contentAuthoritySnapshotHash: params.provenance.contentAuthoritySnapshotHash,
    providerNetworkAuthoritySnapshotHash: params.provenance.providerNetworkAuthoritySnapshotHash,
    contentTargetSnapshotHash: params.provenance.contentTargetSnapshotHash,
    contentBudgetSnapshotHash: params.provenance.contentBudgetSnapshotHash,
    fetchAttemptId: params.provenance.fetchAttemptId,
    executionTargetCanonicalHostnameReference: params.provenance.executionTargetCanonicalHostnameReference,
    executionTargetFixedPathReference: params.provenance.executionTargetFixedPathReference,
    executionTargetQueryReference: params.provenance.executionTargetQueryReference,
    packetSinkAuthoritySnapshotHash: params.authority.packetSinkAuthoritySnapshotHash,
    parserAuthorizationStatus: "not_authorized",
    parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED",
    contentTypePolicyId: params.contentTypePolicyId,
    contentTypeState: params.contentTypeState,
    byteCount,
    byteDigest,
    hmacAlgorithm: params.authority.hmacAlgorithm,
    hmacKeyId: params.authority.hmacKeyId,
  });
  const hmacValue = hmacSha256Hex(state.hmacKeyMaterial, canonicalPayload);
  const frame = Object.freeze({
    kind: "source_acquisition_content_transport_owned_byte_frame_7n3b3_2c_a",
    source: "transport_owner_success_path_7n3b3_2c_a",
    visibility: "internal_only",
    packageId: "source_acquisition_content_transport_packet_handoff_7n3b3_2c_a",
    versionId: SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION,
    contentAuthoritySnapshotHash: params.provenance.contentAuthoritySnapshotHash,
    providerNetworkAuthoritySnapshotHash: params.provenance.providerNetworkAuthoritySnapshotHash,
    contentTargetSnapshotHash: params.provenance.contentTargetSnapshotHash,
    contentBudgetSnapshotHash: params.provenance.contentBudgetSnapshotHash,
    fetchAttemptId: params.provenance.fetchAttemptId,
    packetSinkAuthoritySnapshotHash: params.authority.packetSinkAuthoritySnapshotHash,
    parserAuthorizationStatus: "not_authorized",
    parserPolicyId: "POLICY_PARSER_NOT_AUTHORIZED",
    contentTypePolicyId: params.contentTypePolicyId,
    contentTypeState: params.contentTypeState,
    byteCount,
    byteDigest,
    hmacAlgorithm: params.authority.hmacAlgorithm,
    hmacKeyId: params.authority.hmacKeyId,
    hmacValue,
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    publicPayloadIncluded: false,
    evidenceItemIncluded: false,
    sourceRecordIncluded: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  }) as SourceAcquisitionContentTransportOwnedByteFrame;

  transportOwnedByteFrames.add(frame);
  transportOwnedByteFrameStates.set(frame, {
    authority: params.authority,
    bytes,
    disposed: false,
    canonicalPayload,
    retainedBytes: byteCount,
    retentionCharged: true,
  });
  state.retainedPackets += 1;
  state.retainedBytes += byteCount;

  return {
    status: "accepted",
    frame,
    blockedReasons: [],
  };
}

export function sealSourceAcquisitionContentTransportOwnedByteFrame(params: {
  readonly authority: SourceAcquisitionContentTransportPacketSinkAuthority;
  readonly provenance: SourceAcquisitionContentTransportSealingProvenance;
  readonly transportByteState: SourceAcquisitionContentTransportByteState;
}): SourceAcquisitionContentTransportPacketSealingOutcome {
  if (!isSourceAcquisitionContentTransportPacketSinkAuthority(params.authority)) {
    return { status: "rejected", frame: null, blockedReasons: ["authority_invalid"] };
  }
  if (!transportSealingProvenanceIsValid(params.provenance)) {
    return { status: "rejected", frame: null, blockedReasons: ["provenance_invalid"] };
  }
  if (!transportByteStateIsValid(params.transportByteState)) {
    return { status: "rejected", frame: null, blockedReasons: ["transport_byte_state_invalid"] };
  }

  return sealValidatedSourceAcquisitionContentTransportOwnedByteFrame({
    authority: params.authority,
    provenance: params.provenance,
    transportBytes: params.transportByteState.bytes,
    contentTypePolicyId: params.transportByteState.contentTypePolicyId,
    contentTypeState: params.transportByteState.contentTypeState,
  });
}

export function sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess(params: {
  readonly authority: SourceAcquisitionContentTransportPacketSinkAuthority;
  readonly provenance: SourceAcquisitionContentTransportSealingProvenance;
  readonly transportBytes: Uint8Array;
  readonly contentTypePolicyId: string;
  readonly contentTypeState: "accepted";
}): SourceAcquisitionContentTransportPacketSealingOutcome {
  if (!isSourceAcquisitionContentTransportPacketSinkAuthority(params.authority)) {
    return { status: "rejected", frame: null, blockedReasons: ["authority_invalid"] };
  }
  if (!transportSealingProvenanceIsValid(params.provenance)) {
    return { status: "rejected", frame: null, blockedReasons: ["provenance_invalid"] };
  }
  if (!transportOwnedBytesAreValid(params)) {
    return { status: "rejected", frame: null, blockedReasons: ["transport_owned_bytes_invalid"] };
  }

  return sealValidatedSourceAcquisitionContentTransportOwnedByteFrame(params);
}

function disposeTransportOwnedByteFrame(
  frame: SourceAcquisitionContentTransportOwnedByteFrame,
  releaseRetention: boolean,
): void {
  const frameState = transportOwnedByteFrameStates.get(frame);
  if (frameState) {
    if (releaseRetention && frameState.retentionCharged) {
      const authorityState = transportPacketSinkAuthorityStates.get(frameState.authority);
      if (authorityState) {
        authorityState.retainedPackets = Math.max(0, authorityState.retainedPackets - 1);
        authorityState.retainedBytes = Math.max(0, authorityState.retainedBytes - frameState.retainedBytes);
      }
      frameState.retentionCharged = false;
    }
    frameState.bytes = new Uint8Array();
    frameState.disposed = true;
  }
  transportOwnedByteFrames.delete(frame);
}

export function materializeSourceAcquisitionContentTransportOwnedPacket(params: {
  readonly authority: SourceAcquisitionContentTransportPacketSinkAuthority;
  readonly frame: SourceAcquisitionContentTransportOwnedByteFrame;
}): SourceAcquisitionContentTransportPacketMaterializationOutcome {
  if (!isSourceAcquisitionContentTransportPacketSinkAuthority(params.authority)) {
    return rejectTransportPacket("authority_invalid");
  }
  const frameState = isRecord(params.frame) ? transportOwnedByteFrameStates.get(params.frame) : undefined;
  if (
    !isRecord(params.frame)
    || !transportOwnedByteFrames.has(params.frame)
    || !frameState
    || frameState.disposed
    || !transportFrameIsShaped(params.frame)
  ) {
    return rejectTransportPacket("frame_invalid");
  }
  if (frameState.authority !== params.authority) {
    disposeTransportOwnedByteFrame(params.frame, true);
    return rejectTransportPacket("authority_mismatch");
  }
  const authorityState = transportPacketSinkAuthorityStates.get(params.authority);
  if (!authorityState) {
    disposeTransportOwnedByteFrame(params.frame, true);
    return rejectTransportPacket("authority_state_missing");
  }
  if (params.frame.hmacValue !== hmacSha256Hex(authorityState.hmacKeyMaterial, frameState.canonicalPayload)) {
    disposeTransportOwnedByteFrame(params.frame, true);
    return rejectTransportPacket("hmac_mismatch");
  }
  if (params.frame.byteCount !== frameState.bytes.byteLength || params.frame.byteDigest !== sha256Bytes(frameState.bytes)) {
    disposeTransportOwnedByteFrame(params.frame, true);
    return rejectTransportPacket("byte_binding_mismatch");
  }

  const packetId = `OPAQUE_TRANSPORT_PACKET_${params.frame.byteDigest.slice(0, 16).toUpperCase()}`;
  const packet = {} as SourceAcquisitionContentTransportOwnedPacket;
  defineTransportOwnedPacketProperties(packet);
  transportOwnedPackets.add(packet);
  transportOwnedPacketStates.set(packet, {
    authority: params.authority,
    bytes: new Uint8Array(frameState.bytes),
    disposed: false,
    publicMetadata: activeTransportPacketPublicMetadata({
      packetId,
      packetSinkAuthoritySnapshotHash: params.authority.packetSinkAuthoritySnapshotHash,
      contentTypePolicyId: params.frame.contentTypePolicyId,
      byteCount: params.frame.byteCount,
      byteDigest: params.frame.byteDigest,
    }),
  });
  Object.freeze(packet);
  frameState.retentionCharged = false;
  disposeTransportOwnedByteFrame(params.frame, false);

  return {
    status: "accepted",
    packet,
    blockedReasons: [],
  };
}

export function disposeSourceAcquisitionContentTransportOwnedPacket(
  packet: SourceAcquisitionContentTransportOwnedPacket,
): SourceAcquisitionContentTransportPacketDisposalOutcome {
  const packetState = isRecord(packet) ? transportOwnedPacketStates.get(packet) : undefined;
  if (!packetState) {
    return { status: "rejected", packet: null, blockedReasons: ["transport_packet_invalid"] };
  }
  if (packetState.disposed) {
    return { status: "rejected", packet: null, blockedReasons: ["transport_packet_disposed"] };
  }
  const authorityState = transportPacketSinkAuthorityStates.get(packetState.authority);
  if (!authorityState) {
    return { status: "rejected", packet: null, blockedReasons: ["authority_state_missing"] };
  }

  authorityState.retainedPackets = Math.max(0, authorityState.retainedPackets - 1);
  authorityState.retainedBytes = Math.max(0, authorityState.retainedBytes - packetState.bytes.byteLength);
  packetState.bytes = new Uint8Array();
  packetState.disposed = true;
  packetState.publicMetadata = disposedTransportPacketPublicMetadata();
  transportOwnedPackets.delete(packet);

  return {
    status: "disposed",
    packet: null,
    blockedReasons: [],
  };
}

export function createSourceAcquisitionContentFixturePacket(params: {
  readonly authority: SourceAcquisitionContentPacketSinkAuthority;
  readonly fixturePacketId: string;
  readonly expectedByteCount: number;
  readonly expectedByteDigest: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
}): SourceAcquisitionContentPacketSinkOutcome {
  if (!isSourceAcquisitionContentPacketSinkAuthority(params.authority)) {
    return { status: "rejected", packet: null, blockedReasons: ["authority_invalid"] };
  }
  if (!validOpaqueId(params.fixturePacketId, "OPAQUE_FIXTURE_PACKET_")) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_packet_id_invalid"] };
  }
  if ("bytes" in params || "rawBytes" in params || "payload" in params) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_bytes_unapproved"] };
  }
  if (!validPolicyId(params.parserPolicyId) || !validPolicyId(params.contentTypePolicyId)) {
    return { status: "rejected", packet: null, blockedReasons: ["policy_id_invalid"] };
  }

  const bytes = fixtureBytesFor(params.fixturePacketId);
  if (!bytes) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_packet_id_unapproved"] };
  }

  const byteCount = bytes.byteLength;
  const byteDigest = sha256Bytes(bytes);
  if (params.expectedByteCount !== byteCount || params.expectedByteDigest !== byteDigest) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_byte_binding_mismatch"] };
  }

  const state = packetSinkAuthorityStates.get(params.authority);
  if (!state) {
    return { status: "rejected", packet: null, blockedReasons: ["authority_state_missing"] };
  }
  if (state.retainedPackets + 1 > params.authority.maxRetainedPackets) {
    return { status: "rejected", packet: null, blockedReasons: ["packet_count_cap_exceeded"] };
  }
  if (state.retainedBytes + byteCount > params.authority.maxRetainedBytes) {
    return { status: "rejected", packet: null, blockedReasons: ["retained_byte_cap_exceeded"] };
  }

  const packet = {} as MutableFixturePacket;
  defineFixturePacketProperties(packet);

  fixturePackets.add(packet);
  fixturePacketStates.set(packet, {
    authority: params.authority,
    bytes,
    disposed: false,
    publicMetadata: activePublicMetadata({
      fixturePacketId: params.fixturePacketId,
      packetSinkAuthoritySnapshotHash: params.authority.packetSinkAuthoritySnapshotHash,
      parserPolicyId: params.parserPolicyId,
      contentTypePolicyId: params.contentTypePolicyId,
      byteCount,
      byteDigest,
    }),
  });
  Object.freeze(packet);
  state.retainedPackets += 1;
  state.retainedBytes += byteCount;
  return {
    status: "accepted",
    packet: packet as SourceAcquisitionContentFixturePacket,
    blockedReasons: [],
  };
}

export function isSourceAcquisitionContentFixturePacket(
  value: unknown,
): value is SourceAcquisitionContentFixturePacket {
  const state = isRecord(value) ? fixturePacketStates.get(value) : undefined;
  return isRecord(value)
    && fixturePackets.has(value)
    && state?.disposed === false
    && packetIsShaped(value as SourceAcquisitionContentFixturePacket);
}

export function disposeSourceAcquisitionContentFixturePacket(
  packet: SourceAcquisitionContentFixturePacket,
): SourceAcquisitionContentPacketSinkOutcome {
  const packetState = isRecord(packet) ? fixturePacketStates.get(packet) : undefined;
  if (!packetState) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_packet_invalid"] };
  }
  if (packetState?.disposed) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_packet_disposed"] };
  }
  const authorityState = packetSinkAuthorityStates.get(packetState.authority);
  if (!authorityState) {
    return { status: "rejected", packet: null, blockedReasons: ["authority_state_missing"] };
  }

  authorityState.retainedPackets = Math.max(0, authorityState.retainedPackets - 1);
  authorityState.retainedBytes = Math.max(0, authorityState.retainedBytes - packetState.bytes.byteLength);
  packetState.bytes = new Uint8Array();
  packetState.disposed = true;
  packetState.publicMetadata = disposedPublicMetadata();
  fixturePackets.delete(packet);

  return {
    status: "disposed",
    packet: null,
    blockedReasons: [],
  };
}

export async function consumeSourceAcquisitionContentFixturePacketForParserRunner(params: {
  readonly packet: SourceAcquisitionContentFixturePacket;
  readonly parserAttemptId: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly consume: (
    material: SourceAcquisitionContentFixtureParserRunnerMaterial,
  ) =>
    | SourceAcquisitionContentFixtureParserRunnerCallbackOutcome
    | Promise<SourceAcquisitionContentFixtureParserRunnerCallbackOutcome>;
}): Promise<SourceAcquisitionContentFixtureParserRunnerConsumptionOutcome> {
  if (
    !validOpaqueId(params.parserAttemptId, "PARSER_ATT_")
    || !validPolicyId(params.parserPolicyId)
    || !validPolicyId(params.contentTypePolicyId)
    || typeof params.consume !== "function"
  ) {
    const disposalStatus = isSourceAcquisitionContentFixturePacket(params.packet)
      ? disposeSourceAcquisitionContentFixturePacket(params.packet).status === "disposed" ? "disposed" : "not_disposed"
      : "not_applicable";
    return {
      status: "rejected",
      outcome: null,
      disposalStatus,
      blockedReasons: ["runner_consumption_request_invalid"],
    };
  }

  if (!isSourceAcquisitionContentFixturePacket(params.packet)) {
    return {
      status: "rejected",
      outcome: null,
      disposalStatus: "not_applicable",
      blockedReasons: ["fixture_packet_invalid"],
    };
  }

  if (
    params.packet.parserPolicyId !== params.parserPolicyId
    || params.packet.contentTypePolicyId !== params.contentTypePolicyId
  ) {
    const disposed = disposeSourceAcquisitionContentFixturePacket(params.packet);
    return {
      status: "rejected",
      outcome: null,
      disposalStatus: disposed.status === "disposed" ? "disposed" : "not_disposed",
      blockedReasons: ["policy_mismatch"],
    };
  }

  const packetState = fixturePacketStates.get(params.packet);
  if (!packetState || packetState.disposed) {
    return {
      status: "rejected",
      outcome: null,
      disposalStatus: "not_applicable",
      blockedReasons: ["fixture_packet_state_missing"],
    };
  }

  const material: SourceAcquisitionContentFixtureParserRunnerMaterial = {
    bytes: Object.freeze(Array.from(packetState.bytes)),
    fixturePacketId: params.packet.fixturePacketId,
    parserAttemptId: params.parserAttemptId,
    parserPolicyId: params.parserPolicyId,
    contentTypePolicyId: params.contentTypePolicyId,
    byteCount: params.packet.byteCount,
    byteDigest: params.packet.byteDigest,
  };

  try {
    const callbackOutcome = await params.consume(Object.freeze(material));
    const disposed = disposeSourceAcquisitionContentFixturePacket(params.packet);
    if (!parserRunnerOutcomeIsValid(callbackOutcome)) {
      return {
        status: "rejected",
        outcome: null,
        disposalStatus: disposed.status === "disposed" ? "disposed" : "not_disposed",
        blockedReasons: ["runner_callback_outcome_invalid"],
      };
    }
    return {
      status: "completed",
      outcome: callbackOutcome,
      disposalStatus: "disposed",
      blockedReasons: [],
    };
  } catch {
    const disposed = disposeSourceAcquisitionContentFixturePacket(params.packet);
    return {
      status: "rejected",
      outcome: null,
      disposalStatus: disposed.status === "disposed" ? "disposed" : "not_disposed",
      blockedReasons: ["runner_callback_exception"],
    };
  }
}
