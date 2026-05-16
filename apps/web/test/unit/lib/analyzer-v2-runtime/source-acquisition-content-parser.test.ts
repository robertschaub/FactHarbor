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
  type SourceAcquisitionContentFixturePacket,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink";

function bytes(value = "fixture parser material"): Uint8Array {
  return new TextEncoder().encode(value);
}

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function packet(currentBytes = bytes()): SourceAcquisitionContentFixturePacket {
  const outcome = createSourceAcquisitionContentFixturePacket({
    authority: createSourceAcquisitionContentPacketSinkAuthority(),
    fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
    bytes: currentBytes,
    expectedByteCount: currentBytes.byteLength,
    expectedByteDigest: digest(currentBytes),
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
    timeoutMs: 100,
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition content parser", () => {
  it("parses only structural metadata from a branded fixture packet", () => {
    const currentBytes = bytes("Strukturelles Material ohne Semantik");
    const currentPacket = packet(currentBytes);
    const outcome = parseSourceAcquisitionContentFixturePacket(request({ packet: currentPacket }));
    const serialized = JSON.stringify(outcome);

    expect(outcome).toMatchObject({
      version: SOURCE_ACQUISITION_CONTENT_PARSER_VERSION,
      visibility: "internal_only",
      status: "success",
      structuralStatus: "parsed_structural",
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
      observedByteCount: currentBytes.byteLength,
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
    expect(serialized).not.toContain("Strukturelles");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("source.example");
  });

  it("rejects arbitrary bytes, copied packets, and JSON-round-tripped packets", () => {
    const currentPacket = packet();
    const arbitraryBytes = bytes("not a packet") as unknown as SourceAcquisitionContentFixturePacket;
    const copiedPacket = { ...currentPacket } as SourceAcquisitionContentFixturePacket;
    const roundTripped = JSON.parse(JSON.stringify(currentPacket)) as SourceAcquisitionContentFixturePacket;

    for (const invalidPacket of [arbitraryBytes, copiedPacket, roundTripped]) {
      expect(parseSourceAcquisitionContentFixturePacket(request({
        packet: invalidPacket,
      }))).toMatchObject({
        status: "blocked",
        structuralStatus: "fixture_packet_invalid",
        fixturePacketId: null,
        observedByteCount: 0,
      });
    }
  });

  it("blocks disposed packets and policy mismatches without material reuse", () => {
    const disposedPacket = packet();
    expect(disposeSourceAcquisitionContentFixturePacket(disposedPacket).status).toBe("disposed");
    expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: disposedPacket,
    }))).toMatchObject({
      status: "blocked",
      structuralStatus: "fixture_packet_disposed",
      disposalStatus: "disposed",
    });

    expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: packet(),
      parserPolicyId: "POLICY_PARSER_OTHER_001",
    }))).toMatchObject({
      status: "blocked",
      structuralStatus: "policy_mismatch",
      parserOutputByteCount: 0,
    });
  });

  it("returns minimal structural timeout and cancellation outcomes before reading packet material", () => {
    const controller = new AbortController();
    controller.abort();

    expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: bytes("not read when timed out") as unknown as SourceAcquisitionContentFixturePacket,
      nowMs: 250,
      timeoutMs: 100,
    }))).toMatchObject({
      status: "timed_out",
      structuralStatus: "timed_out",
      fixturePacketId: null,
      observedByteCount: 0,
    });

    expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: bytes("not read when cancelled") as unknown as SourceAcquisitionContentFixturePacket,
      signal: controller.signal,
    }))).toMatchObject({
      status: "cancelled",
      structuralStatus: "cancelled",
      fixturePacketId: null,
      observedByteCount: 0,
    });
  });

  it("sanitizes invalid request ids and can dispose after structural parsing", () => {
    const currentPacket = packet();
    const parsed = parseSourceAcquisitionContentFixturePacket(request({
      packet: currentPacket,
      parserAttemptId: "https://source.example/sk_secret",
      disposeAfterParse: true,
    }));

    expect(parsed).toMatchObject({
      status: "blocked",
      structuralStatus: "request_invalid",
      parserAttemptId: "PARSER_ATT_REDACTED",
      fixturePacketId: null,
    });

    const validDispose = parseSourceAcquisitionContentFixturePacket(request({
      packet: currentPacket,
      disposeAfterParse: true,
    }));
    expect(validDispose).toMatchObject({
      status: "success",
      structuralStatus: "parsed_structural",
      disposalStatus: "disposed",
    });
    expect(parseSourceAcquisitionContentFixturePacket(request({
      packet: currentPacket,
    })).structuralStatus).toBe("fixture_packet_disposed");
  });
});
