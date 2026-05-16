import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_CONTENT_PARSER_VERSION,
  parseSourceAcquisitionContentFixturePacket,
  type SourceAcquisitionContentParserRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-parser";
import {
  createSourceAcquisitionContentFixturePacket,
  createSourceAcquisitionContentPacketSinkAuthority,
  disposeSourceAcquisitionContentFixturePacket,
  isSourceAcquisitionContentFixturePacket,
  type SourceAcquisitionContentFixturePacket,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink";

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureSpec(fixturePacketId = "OPAQUE_FIXTURE_PACKET_001") {
  const materialById: Record<string, string> = {
    OPAQUE_FIXTURE_PACKET_001: "fixture-control-material-alpha",
    OPAQUE_FIXTURE_PACKET_002: "fixture-control-material-beta",
    OPAQUE_FIXTURE_PACKET_003: "first",
    OPAQUE_FIXTURE_PACKET_004: "second",
    OPAQUE_FIXTURE_PACKET_005: "fixture-control-material-over-byte-cap",
    OPAQUE_FIXTURE_PACKET_STALL: "fixture-control-stall",
    OPAQUE_FIXTURE_PACKET_UNICODE: "pruefung-multilingual-control",
  };
  const currentBytes = bytes(materialById[fixturePacketId] ?? "");
  return {
    fixturePacketId,
    expectedByteCount: currentBytes.byteLength,
    expectedByteDigest: digest(currentBytes),
  };
}

function packet(fixturePacketId = "OPAQUE_FIXTURE_PACKET_001"): SourceAcquisitionContentFixturePacket {
  const outcome = createSourceAcquisitionContentFixturePacket({
    authority: createSourceAcquisitionContentPacketSinkAuthority(),
    ...fixtureSpec(fixturePacketId),
    parserPolicyId: "POLICY_PARSER_FIXTURE_001",
    contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
  });
  if (outcome.status !== "accepted") {
    throw new Error("test fixture packet rejected");
  }
  return outcome.packet;
}

function request(
  overrides: Partial<SourceAcquisitionContentParserRequest> = {},
): SourceAcquisitionContentParserRequest {
  return {
    packet: packet(),
    parserAttemptId: "PARSER_ATT_001",
    parserPolicyId: "POLICY_PARSER_FIXTURE_001",
    contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    startedAtMs: 100,
    nowMs: 110,
    timeoutMs: 5_000,
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition content parser", () => {
  it("parses only structural metadata from a branded fixture packet through the runner and disposes it", async () => {
    const currentPacket = packet("OPAQUE_FIXTURE_PACKET_002");
    const outcome = await parseSourceAcquisitionContentFixturePacket(request({ packet: currentPacket }));
    const serialized = JSON.stringify(outcome);

    expect(outcome).toMatchObject({
      version: SOURCE_ACQUISITION_CONTENT_PARSER_VERSION,
      visibility: "internal_only",
      status: "success",
      structuralStatus: "parsed_structural",
      fixturePacketId: null,
      packetLifecycleStatus: "disposed",
      disposalStatus: "disposed",
      observedByteCount: bytes("fixture-control-material-beta").byteLength,
      decodedTextLength: "fixture-control-material-beta".length,
      parserOutputByteCount: 0,
      rawPayloadIncluded: false,
      extractedTextIncluded: false,
      publicPayloadIncluded: false,
      evidenceItemIncluded: false,
      sourceRecordIncluded: false,
      applicabilityIncluded: false,
      probativeValueIncluded: false,
      sourceReliabilityTouched: false,
      warningIncluded: false,
      verdictIncluded: false,
      reportProseIncluded: false,
    });
    expect(isSourceAcquisitionContentFixturePacket(currentPacket)).toBe(false);
    expect(serialized).not.toContain("fixture-control-material-beta");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("source.example");
  });

  it("rejects arbitrary bytes, copied packets, and JSON-round-tripped packets", async () => {
    const currentPacket = packet();
    const arbitraryBytes = bytes("not a packet") as unknown as SourceAcquisitionContentFixturePacket;
    const copiedPacket = { ...currentPacket } as SourceAcquisitionContentFixturePacket;
    const roundTripped = JSON.parse(JSON.stringify(currentPacket)) as SourceAcquisitionContentFixturePacket;

    for (const invalidPacket of [arbitraryBytes, copiedPacket, roundTripped]) {
      await expect(parseSourceAcquisitionContentFixturePacket(request({
        packet: invalidPacket,
      }))).resolves.toMatchObject({
        status: "blocked",
        structuralStatus: "fixture_packet_invalid",
        fixturePacketId: null,
        observedByteCount: 0,
      });
    }
  });

  it("blocks disposed packets and policy mismatches without material reuse", async () => {
    const disposedPacket = packet();
    expect(disposeSourceAcquisitionContentFixturePacket(disposedPacket).status).toBe("disposed");
    expect(isSourceAcquisitionContentFixturePacket(disposedPacket)).toBe(false);
    await expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: disposedPacket,
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "fixture_packet_invalid",
      disposalStatus: "not_applicable",
    });

    const mismatchPacket = packet();
    await expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: mismatchPacket,
      parserPolicyId: "POLICY_PARSER_OTHER_001",
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "policy_mismatch",
      disposalStatus: "disposed",
      parserOutputByteCount: 0,
    });
    expect(isSourceAcquisitionContentFixturePacket(mismatchPacket)).toBe(false);
  });

  it("disposes valid packets on timeout and cancellation before reporting structural outcomes", async () => {
    const controller = new AbortController();
    controller.abort();
    const timeoutPacket = packet();
    const cancelledPacket = packet("OPAQUE_FIXTURE_PACKET_002");

    await expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: timeoutPacket,
      nowMs: 250,
      timeoutMs: 100,
    }))).resolves.toMatchObject({
      status: "timed_out",
      structuralStatus: "timed_out",
      fixturePacketId: null,
      packetLifecycleStatus: "disposed",
      disposalStatus: "disposed",
      observedByteCount: 0,
    });
    expect(isSourceAcquisitionContentFixturePacket(timeoutPacket)).toBe(false);

    await expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: cancelledPacket,
      signal: controller.signal,
    }))).resolves.toMatchObject({
      status: "cancelled",
      structuralStatus: "cancelled",
      fixturePacketId: null,
      packetLifecycleStatus: "disposed",
      disposalStatus: "disposed",
      observedByteCount: 0,
    });
    expect(isSourceAcquisitionContentFixturePacket(cancelledPacket)).toBe(false);
  });

  it("passes only remaining timeout budget into the child runner", async () => {
    const almostExpiredPacket = packet("OPAQUE_FIXTURE_PACKET_STALL");
    const parsed = await parseSourceAcquisitionContentFixturePacket(request({
      packet: almostExpiredPacket,
      startedAtMs: 100,
      nowMs: 149,
      timeoutMs: 50,
    }));

    expect(parsed).toMatchObject({
      status: "timed_out",
      structuralStatus: "timed_out",
      fixturePacketId: null,
      packetLifecycleStatus: "disposed",
      disposalStatus: "disposed",
      observedByteCount: 0,
    });
    expect(isSourceAcquisitionContentFixturePacket(almostExpiredPacket)).toBe(false);
  });

  it("sanitizes invalid request ids and disposes valid packet material on request failure", async () => {
    const currentPacket = packet();
    const parsed = await parseSourceAcquisitionContentFixturePacket(request({
      packet: currentPacket,
      parserAttemptId: "https://source.example/sk_secret",
    }));

    expect(parsed).toMatchObject({
      status: "blocked",
      structuralStatus: "request_invalid",
      parserAttemptId: "PARSER_ATT_REDACTED",
      fixturePacketId: null,
      packetLifecycleStatus: "disposed",
      disposalStatus: "disposed",
    });
    expect(isSourceAcquisitionContentFixturePacket(currentPacket)).toBe(false);
  });
});
