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
  SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION,
  buildSourceAcquisitionParserAdmissionParsedMaterialDenial,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial";

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
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
      byteCount: 30,
      byteDigest: digest("fixture-control-material-alpha"),
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

describe("Analyzer V2 parser-admission parsed-material denial", () => {
  it("keeps runtime-owned admitted parser admission from becoming parsed material", () => {
    const parserAdmission = evaluateSourceAcquisitionParserWorkerAdmission(request());
    const result = buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
      parserAdmission,
    });

    expect(result).toMatchObject({
      denialVersion: SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION,
      visibility: "internal_only",
      admissionProvenanceStatus: "runtime_owned",
      admissionRuntimeOwned: true,
      admissionReference: {
        admissionVersion: "v2.source-acquisition.parser-worker-admission.c0-s1",
        profileId: SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
        isolationLabel: SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
        admittedProvenanceKind: "fixture_control",
        admittedByteCount: 30,
        admittedByteDigest: digest("fixture-control-material-alpha"),
      },
      status: "blocked_no_parsed_material",
      blockedReason: "parser_execution_unapproved",
      parserExecution: false,
      workerSpawned: false,
      bytesConsumed: false,
      transportPacketAccepted: false,
      transportFrameAccepted: false,
      realFetchedBytesAccepted: false,
      fixtureBytesParsed: false,
      syntheticBytesParsed: false,
      productPublicLiveApproved: false,
      evidenceLifecycleConsumptionApproved: false,
      cacheTouched: false,
      sourceReliabilityTouched: false,
      publicExposure: false,
      liveJobs: false,
      parsedMaterialPacket: null,
      parserOutput: null,
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
    });
  });

  it("keeps runtime-owned blocked parser admission denial-only and output-null", () => {
    const parserAdmission = evaluateSourceAcquisitionParserWorkerAdmission(request({
      profileId: "P1_WINDOWS_LOCAL_DENIED_AUTHORITY",
    }));
    const result = buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
      parserAdmission,
    });

    expect(result).toMatchObject({
      admissionProvenanceStatus: "runtime_owned",
      admissionRuntimeOwned: true,
      admissionReference: {
        admissionVersion: "v2.source-acquisition.parser-worker-admission.c0-s1",
        profileId: null,
        isolationLabel: null,
        admittedProvenanceKind: null,
        admittedByteCount: 0,
        admittedByteDigest: null,
      },
      status: "blocked_no_parsed_material",
      blockedReason: "parser_execution_unapproved",
      parsedMaterialPacket: null,
      parserOutput: null,
      sourceMaterial: null,
      extractionInput: null,
      evidenceCorpus: null,
    });
  });

  it("rejects copied, serialized, cloned, and reconstructed admission-shaped objects", () => {
    const parserAdmission = evaluateSourceAcquisitionParserWorkerAdmission(request());

    for (const copiedAdmission of [
      { ...parserAdmission },
      JSON.parse(JSON.stringify(parserAdmission)),
      structuredClone(parserAdmission),
      {
        ...parserAdmission,
        admittedByteDigest: digest("fixture-control-material-alpha"),
      },
    ]) {
      const result = buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
        parserAdmission: copiedAdmission,
      });

      expect(result).toMatchObject({
        admissionProvenanceStatus: "blocked_not_runtime_owned",
        admissionRuntimeOwned: false,
        admissionReference: null,
        status: "blocked_admission_not_runtime_owned",
        blockedReason: "admission_not_runtime_owned",
        parsedMaterialPacket: null,
        parserOutput: null,
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      });
      expect(JSON.stringify(result)).not.toContain("p0_admitted_fixture_or_synthetic_inert");
    }
  });

  it("fails closed on malformed denial requests", () => {
    for (const malformedRequest of [
      null,
      {},
      { parserAdmission: evaluateSourceAcquisitionParserWorkerAdmission(request()), extra: true },
    ]) {
      expect(buildSourceAcquisitionParserAdmissionParsedMaterialDenial(
        malformedRequest as never,
      )).toMatchObject({
        admissionProvenanceStatus: "blocked_not_runtime_owned",
        admissionRuntimeOwned: false,
        admissionReference: null,
        status: "blocked_admission_not_runtime_owned",
        blockedReason: "admission_not_runtime_owned",
        parsedMaterialPacket: null,
        parserOutput: null,
        sourceMaterial: null,
        extractionInput: null,
        evidenceCorpus: null,
      });
    }
  });
});
