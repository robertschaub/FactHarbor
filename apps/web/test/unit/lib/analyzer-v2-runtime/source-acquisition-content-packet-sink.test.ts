import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION,
  createSourceAcquisitionContentFixturePacket,
  createSourceAcquisitionContentPacketSinkAuthority,
  disposeSourceAcquisitionContentFixturePacket,
  isSourceAcquisitionContentFixturePacket,
  isSourceAcquisitionContentPacketSinkAuthority,
  readSourceAcquisitionContentPacketSinkAuthoritySnapshot,
  type SourceAcquisitionContentFixturePacket,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink";

function bytes(value = "fixture control material"): Uint8Array {
  return new TextEncoder().encode(value);
}

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function createPacket(currentBytes = bytes()) {
  return createSourceAcquisitionContentFixturePacket({
    authority: createSourceAcquisitionContentPacketSinkAuthority(),
    fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
    bytes: currentBytes,
    expectedByteCount: currentBytes.byteLength,
    expectedByteDigest: digest(currentBytes),
    parserPolicyId: "POLICY_PARSER_FIXTURE_001",
    contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
  });
}

describe("Analyzer V2 source-acquisition content packet sink", () => {
  it("creates an owner-branded packet sink authority with hidden-only capabilities", () => {
    const authority = createSourceAcquisitionContentPacketSinkAuthority({
      packetSinkAuthorityId: "OPAQUE_PACKET_SINK_AUTHORITY_002",
      maxRetainedPackets: 2,
      maxRetainedBytes: 128,
    });
    const snapshot = readSourceAcquisitionContentPacketSinkAuthoritySnapshot(authority);

    expect(isSourceAcquisitionContentPacketSinkAuthority(authority)).toBe(true);
    expect(isSourceAcquisitionContentPacketSinkAuthority({ ...authority })).toBe(false);
    expect(isSourceAcquisitionContentPacketSinkAuthority(JSON.parse(JSON.stringify(authority)))).toBe(false);
    expect(snapshot).toMatchObject({
      authorityVersion: SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION,
      visibility: "internal_only",
      maxRetainedPackets: 2,
      maxRetainedBytes: 128,
      capabilityScope: {
        fixtureControlOnly: true,
        realTransportBytes: false,
        publicExposure: false,
        cacheRead: false,
        cacheWrite: false,
        durableStorage: false,
        sourceReliability: false,
        semanticInterpretation: false,
      },
    });
  });

  it("materializes only digest-bound fixture/control packets without serializing payload", () => {
    const currentBytes = bytes("Mehrsprachiges Strukturmaterial");
    const outcome = createPacket(currentBytes);

    expect(outcome.status).toBe("accepted");
    expect(outcome.packet).not.toBeNull();
    const packet = outcome.packet as SourceAcquisitionContentFixturePacket;
    const serialized = JSON.stringify(packet);

    expect(isSourceAcquisitionContentFixturePacket(packet)).toBe(true);
    expect(isSourceAcquisitionContentFixturePacket({ ...packet })).toBe(false);
    expect(isSourceAcquisitionContentFixturePacket(JSON.parse(serialized))).toBe(false);
    expect(packet.source).toBe("fixture_control_only_7n3b3_2b");
    expect(packet.byteCount).toBe(currentBytes.byteLength);
    expect(packet.byteDigest).toBe(digest(currentBytes));
    expect(packet.rawPayloadIncluded).toBe(false);
    expect(packet.extractedTextIncluded).toBe(false);
    expect(packet.evidenceItemIncluded).toBe(false);
    expect(packet.warningIncluded).toBe(false);
    expect(packet.verdictIncluded).toBe(false);
    expect(packet.reportProseIncluded).toBe(false);
    expect(serialized).not.toContain("Mehrsprachiges");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("source.example");
  });

  it("rejects arbitrary byte-like, copied, and mismatched fixture material", () => {
    const authority = createSourceAcquisitionContentPacketSinkAuthority();
    const currentBytes = bytes();
    const valid = {
      authority,
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
      bytes: currentBytes,
      expectedByteCount: currentBytes.byteLength,
      expectedByteDigest: digest(currentBytes),
      parserPolicyId: "POLICY_PARSER_FIXTURE_001",
      contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    };

    expect(createSourceAcquisitionContentFixturePacket({
      ...valid,
      bytes: Buffer.from("buffer is not approved fixture bytes") as unknown as Uint8Array,
      expectedByteCount: 36,
      expectedByteDigest: digest(new Uint8Array(Buffer.from("buffer is not approved fixture bytes"))),
    }).status).toBe("rejected");
    expect(createSourceAcquisitionContentFixturePacket({
      ...valid,
      bytes: [1, 2, 3] as unknown as Uint8Array,
      expectedByteCount: 3,
    }).status).toBe("rejected");
    expect(createSourceAcquisitionContentFixturePacket({
      ...valid,
      expectedByteCount: currentBytes.byteLength + 1,
    }).status).toBe("rejected");
    expect(createSourceAcquisitionContentFixturePacket({
      ...valid,
      expectedByteDigest: "0".repeat(64),
    }).status).toBe("rejected");
    expect(createSourceAcquisitionContentFixturePacket({
      ...valid,
      fixturePacketId: "https://source.example/item",
    }).status).toBe("rejected");
  });

  it("enforces retained packet and byte caps and releases capacity after disposal", () => {
    const authority = createSourceAcquisitionContentPacketSinkAuthority({
      maxRetainedPackets: 1,
      maxRetainedBytes: 16,
    });
    const firstBytes = bytes("first");
    const secondBytes = bytes("second");
    const first = createSourceAcquisitionContentFixturePacket({
      authority,
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
      bytes: firstBytes,
      expectedByteCount: firstBytes.byteLength,
      expectedByteDigest: digest(firstBytes),
      parserPolicyId: "POLICY_PARSER_FIXTURE_001",
      contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    });
    const secondBlocked = createSourceAcquisitionContentFixturePacket({
      authority,
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_002",
      bytes: secondBytes,
      expectedByteCount: secondBytes.byteLength,
      expectedByteDigest: digest(secondBytes),
      parserPolicyId: "POLICY_PARSER_FIXTURE_001",
      contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    });

    expect(first.status).toBe("accepted");
    expect(secondBlocked).toMatchObject({
      status: "rejected",
      blockedReasons: ["packet_count_cap_exceeded"],
    });
    expect(disposeSourceAcquisitionContentFixturePacket(first.packet as SourceAcquisitionContentFixturePacket).status)
      .toBe("disposed");

    const secondAccepted = createSourceAcquisitionContentFixturePacket({
      authority,
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_002",
      bytes: secondBytes,
      expectedByteCount: secondBytes.byteLength,
      expectedByteDigest: digest(secondBytes),
      parserPolicyId: "POLICY_PARSER_FIXTURE_001",
      contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    });
    expect(secondAccepted.status).toBe("accepted");

    const oversizedBytes = bytes("this material exceeds cap");
    expect(createSourceAcquisitionContentFixturePacket({
      authority: createSourceAcquisitionContentPacketSinkAuthority({ maxRetainedBytes: 8 }),
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_003",
      bytes: oversizedBytes,
      expectedByteCount: oversizedBytes.byteLength,
      expectedByteDigest: digest(oversizedBytes),
      parserPolicyId: "POLICY_PARSER_FIXTURE_001",
      contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    })).toMatchObject({
      status: "rejected",
      blockedReasons: ["retained_byte_cap_exceeded"],
    });
  });

  it("makes disposed fixture packet references permanently invalid for material reuse", () => {
    const outcome = createPacket();
    const packet = outcome.packet as SourceAcquisitionContentFixturePacket;

    expect(disposeSourceAcquisitionContentFixturePacket(packet)).toMatchObject({
      status: "disposed",
      packet: {
        lifecycleStatus: "disposed",
        disposalStatus: "disposed",
      },
    });
    expect(disposeSourceAcquisitionContentFixturePacket(packet)).toMatchObject({
      status: "rejected",
      blockedReasons: ["fixture_packet_disposed"],
    });
    expect(isSourceAcquisitionContentFixturePacket(packet)).toBe(true);
    expect(JSON.stringify(packet)).not.toContain("fixture control material");
  });
});
