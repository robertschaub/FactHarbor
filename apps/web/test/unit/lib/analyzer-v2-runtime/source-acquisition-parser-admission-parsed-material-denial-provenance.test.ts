import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
  evaluateSourceAcquisitionParserWorkerAdmission,
  type SourceAcquisitionParserWorkerAdmissionRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission";
import {
  buildSourceAcquisitionParserAdmissionParsedMaterialDenial,
  type SourceAcquisitionParserAdmissionParsedMaterialDenialResult,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial";
import {
  SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_PROVENANCE_VERSION,
  markSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult,
  readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance";

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function request(
  overrides: Partial<SourceAcquisitionParserWorkerAdmissionRequest> = {},
): SourceAcquisitionParserWorkerAdmissionRequest {
  return {
    contractVersion: SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
    profileId: SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
    isolationLabel: SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
    parserPolicyId: "POLICY_PARSER_P0_001",
    contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    inputProvenance: {
      kind: "fixture_control",
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_X7G2",
      byteCount: 30,
      byteDigest: digest("fixture-control-material-x7g2"),
      bytesIncluded: false,
      rawPayloadIncluded: false,
      parsedTextIncluded: false,
    },
    limits: {
      maxInputBytes: 64 * 1024,
      maxOutputBytes: 16 * 1024,
      timeoutMs: 5_000,
    },
    approvalSnapshot: {
      twoDCApproved: false,
      productPublicLiveApproved: false,
      evidenceLifecycleConsumptionApproved: false,
      deploymentCandidateIsolationAccepted: false,
    },
    ...overrides,
  };
}

function producedDenial(): SourceAcquisitionParserAdmissionParsedMaterialDenialResult {
  return buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
    parserAdmission: evaluateSourceAcquisitionParserWorkerAdmission(request()),
  });
}

function forgedPositiveDenial(): SourceAcquisitionParserAdmissionParsedMaterialDenialResult {
  return {
    ...producedDenial(),
    parserExecution: true,
    bytesConsumed: true,
    parsedMaterialPacket: { packetId: "FORGED_PARSED_X7G2" },
  } as unknown as SourceAcquisitionParserAdmissionParsedMaterialDenialResult;
}

describe("Analyzer V2 C0-S3 parsed-material denial result provenance", () => {
  it("marks producer-created C0-S3 denial results without changing their serialized shape", () => {
    const result = producedDenial();

    expect(readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(result)).toBe(result);
    expect(JSON.stringify(result)).not.toContain("producerOwned");
    expect(JSON.stringify(result)).not.toContain(
      SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_PROVENANCE_VERSION,
    );
  });

  it("keeps producer-created non-runtime-owned-admission denials owned as denial results", () => {
    const result = buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
      parserAdmission: { reconstructed: true },
    });

    expect(result).toMatchObject({
      status: "blocked_admission_not_runtime_owned",
      blockedReason: "admission_not_runtime_owned",
      admissionRuntimeOwned: false,
      admissionReference: null,
    });
    expect(readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(result)).toBe(result);
  });

  it("rejects copied, serialized, cloned, and reconstructed C0-S3-shaped results", () => {
    const result = producedDenial();

    for (const copy of [
      { ...result },
      JSON.parse(JSON.stringify(result)),
      structuredClone(result),
      Object.fromEntries(Object.entries(result)),
    ]) {
      expect(readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(copy)).toBeNull();
    }
  });

  it("fails closed permanently when producer-owned C0-S3 fields are mutated after marking", () => {
    const result = producedDenial();
    const mutableResult = result as unknown as Record<string, unknown>;

    mutableResult.parserExecution = true;
    expect(readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(result)).toBeNull();

    mutableResult.parserExecution = false;
    expect(readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(result)).toBeNull();
  });

  it("does not let the owner marker bless positive-looking C0-S3 results", () => {
    const forged = forgedPositiveDenial();
    const marked = markSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(forged);

    expect(marked).toBe(forged);
    expect(readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(marked)).toBeNull();
  });
});
