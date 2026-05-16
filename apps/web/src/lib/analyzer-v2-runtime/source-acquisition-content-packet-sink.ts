import { createHash } from "node:crypto";
import { SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION } from "./source-acquisition-content-envelope";

export const SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION =
  "v2.source-acquisition.content-packet-sink.7n3b3-2b";

export type SourceAcquisitionContentPacketLifecycleStatus =
  | "fixture_control_materialized"
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
      readonly packet: SourceAcquisitionContentFixturePacket;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly packet: null;
      readonly blockedReasons: readonly string[];
    };

type MutableFixturePacket = Omit<SourceAcquisitionContentFixturePacket, "lifecycleStatus" | "disposalStatus"> & {
  lifecycleStatus: SourceAcquisitionContentPacketLifecycleStatus;
  disposalStatus: "not_disposed" | "disposed";
};

type PacketSinkAuthorityState = {
  retainedPackets: number;
  retainedBytes: number;
};

type FixturePacketState = {
  authority: SourceAcquisitionContentPacketSinkAuthority;
  bytes: Uint8Array;
  disposed: boolean;
};

const packetSinkAuthorities = new WeakSet<object>();
const packetSinkAuthorityStates = new WeakMap<object, PacketSinkAuthorityState>();
const fixturePackets = new WeakSet<object>();
const fixturePacketStates = new WeakMap<object, FixturePacketState>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
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

function validBytes(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
    && Object.getPrototypeOf(value) === Uint8Array.prototype
    && value.byteLength > 0
    && value.byteLength <= 64 * 1024;
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

export function createSourceAcquisitionContentFixturePacket(params: {
  readonly authority: SourceAcquisitionContentPacketSinkAuthority;
  readonly fixturePacketId: string;
  readonly bytes: Uint8Array;
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
  if (!validBytes(params.bytes)) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_bytes_invalid"] };
  }
  if (!validPolicyId(params.parserPolicyId) || !validPolicyId(params.contentTypePolicyId)) {
    return { status: "rejected", packet: null, blockedReasons: ["policy_id_invalid"] };
  }

  const byteCount = params.bytes.byteLength;
  const byteDigest = sha256Bytes(params.bytes);
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

  const packet: MutableFixturePacket = {
    kind: "source_acquisition_content_fixture_packet_7n3b3_2b",
    source: "fixture_control_only_7n3b3_2b",
    visibility: "internal_only",
    fixturePacketId: params.fixturePacketId,
    packetSinkAuthoritySnapshotHash: params.authority.packetSinkAuthoritySnapshotHash,
    parserPolicyId: params.parserPolicyId,
    contentTypePolicyId: params.contentTypePolicyId,
    byteCount,
    byteDigest,
    lifecycleStatus: "fixture_control_materialized",
    disposalStatus: "not_disposed",
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    publicPayloadIncluded: false,
    evidenceItemIncluded: false,
    sourceRecordIncluded: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  } as MutableFixturePacket;

  fixturePackets.add(packet);
  fixturePacketStates.set(packet, {
    authority: params.authority,
    bytes: new Uint8Array(params.bytes),
    disposed: false,
  });
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
  return isRecord(value)
    && fixturePackets.has(value)
    && packetIsShaped(value as SourceAcquisitionContentFixturePacket);
}

export function disposeSourceAcquisitionContentFixturePacket(
  packet: SourceAcquisitionContentFixturePacket,
): SourceAcquisitionContentPacketSinkOutcome {
  if (!isSourceAcquisitionContentFixturePacket(packet)) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_packet_invalid"] };
  }
  const packetState = fixturePacketStates.get(packet);
  if (!packetState || packetState.disposed) {
    return { status: "rejected", packet: null, blockedReasons: ["fixture_packet_disposed"] };
  }
  const authorityState = packetSinkAuthorityStates.get(packetState.authority);
  if (!authorityState) {
    return { status: "rejected", packet: null, blockedReasons: ["authority_state_missing"] };
  }

  authorityState.retainedPackets = Math.max(0, authorityState.retainedPackets - 1);
  authorityState.retainedBytes = Math.max(0, authorityState.retainedBytes - packet.byteCount);
  packetState.bytes = new Uint8Array();
  packetState.disposed = true;
  (packet as MutableFixturePacket).lifecycleStatus = "disposed";
  (packet as MutableFixturePacket).disposalStatus = "disposed";

  return {
    status: "disposed",
    packet,
    blockedReasons: [],
  };
}
