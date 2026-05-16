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
      readonly packet: null;
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "rejected";
      readonly packet: null;
      readonly blockedReasons: readonly string[];
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

type FixturePacketState = {
  authority: SourceAcquisitionContentPacketSinkAuthority;
  bytes: Uint8Array;
  disposed: boolean;
  publicMetadata: FixturePacketPublicMetadata;
};

const packetSinkAuthorities = new WeakSet<object>();
const packetSinkAuthorityStates = new WeakMap<object, PacketSinkAuthorityState>();
const fixturePackets = new WeakSet<object>();
const fixturePacketStates = new WeakMap<object, FixturePacketState>();
const approvedFixtureMaterial = new Map<string, Uint8Array>([
  ["OPAQUE_FIXTURE_PACKET_001", new TextEncoder().encode("fixture-control-material-alpha")],
  ["OPAQUE_FIXTURE_PACKET_002", new TextEncoder().encode("fixture-control-material-beta")],
  ["OPAQUE_FIXTURE_PACKET_003", new TextEncoder().encode("first")],
  ["OPAQUE_FIXTURE_PACKET_004", new TextEncoder().encode("second")],
  ["OPAQUE_FIXTURE_PACKET_005", new TextEncoder().encode("fixture-control-material-over-byte-cap")],
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

function readPacketPublicMetadata(packet: object): FixturePacketPublicMetadata {
  return fixturePacketStates.get(packet)?.publicMetadata ?? disposedPublicMetadata();
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
