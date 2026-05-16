import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
  evaluateSourceAcquisitionParserWorkerAdmission,
  type SourceAcquisitionParserWorkerAdmissionDecision,
  type SourceAcquisitionParserWorkerAdmissionRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission";
import {
  SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION,
  inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
  isSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
  markSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
  readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance";

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

function forgedAdmissionDecision(): SourceAcquisitionParserWorkerAdmissionDecision {
  return {
    admissionVersion: "v2.source-acquisition.parser-worker-admission.c0-s1",
    contractVersion: SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
    visibility: "internal_only",
    profileId: SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
    isolationLabel: SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
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
    admittedProvenanceKind: "fixture_control",
    admittedByteCount: 30,
    admittedByteDigest: digest("fixture-control-material-alpha"),
    parsedMaterialPacket: null,
    parserOutput: null,
    evidenceCorpus: null,
    status: "p0_admitted_fixture_or_synthetic_inert",
    blockedReason: null,
  };
}

describe("Analyzer V2 parser-worker admission provenance", () => {
  it("marks C0-S1 admission decisions as runtime-owned without changing their public shape", () => {
    const decision = evaluateSourceAcquisitionParserWorkerAdmission(request());

    expect(isSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toBe(true);
    expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toBe(decision);
    expect(inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toEqual({
      provenanceVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION,
      status: "runtime_owned",
      blockedReason: null,
      decision,
    });
    expect(Object.keys(decision).sort()).toEqual([
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
    ]);
    expect(JSON.stringify(decision)).not.toContain("runtimeOwned");
    expect(JSON.stringify(decision)).not.toContain("provenanceVersion");
  });

  it("keeps blocked C0-S1 decisions runtime-owned but still non-executing", () => {
    const decision = evaluateSourceAcquisitionParserWorkerAdmission(request({
      profileId: "P1_WINDOWS_LOCAL_DENIED_AUTHORITY",
    }));

    expect(decision).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "profile_not_p0",
      parserExecution: false,
      workerSpawned: false,
      bytesConsumed: false,
      parsedMaterialPacket: null,
      parserOutput: null,
      evidenceCorpus: null,
    });
    expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toBe(decision);
  });

  it("rejects copied, serialized, cloned, and reconstructed admission-shaped objects", () => {
    const decision = evaluateSourceAcquisitionParserWorkerAdmission(request());

    for (const copy of [
      { ...decision },
      JSON.parse(JSON.stringify(decision)),
      structuredClone(decision),
      forgedAdmissionDecision(),
    ]) {
      expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(copy)).toBeNull();
      expect(inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(copy)).toEqual({
        provenanceVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION,
        status: "blocked_not_runtime_owned",
        blockedReason: "admission_not_runtime_owned",
        decision: null,
      });
      expect(JSON.stringify(inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(copy)))
        .not.toContain("p0_admitted_fixture_or_synthetic_inert");
    }
  });

  it("fails closed permanently when runtime-owned admission decision contract fields are mutated after marking", () => {
    const mutationCases: ReadonlyArray<{
      readonly field: keyof SourceAcquisitionParserWorkerAdmissionDecision;
      readonly mutatedValue: unknown;
      readonly restoredValue: unknown;
    }> = [
      { field: "status", mutatedValue: "blocked_pre_parser_execution", restoredValue: "p0_admitted_fixture_or_synthetic_inert" },
      { field: "blockedReason", mutatedValue: "two_d_c_not_approved", restoredValue: null },
      { field: "profileId", mutatedValue: "P1_WINDOWS_LOCAL_DENIED_AUTHORITY", restoredValue: SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID },
      { field: "isolationLabel", mutatedValue: "windows_local_denied_authority_not_production", restoredValue: SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL },
      { field: "twoDCApproved", mutatedValue: true, restoredValue: false },
      { field: "productPublicLiveApproved", mutatedValue: true, restoredValue: false },
      { field: "parserExecution", mutatedValue: true, restoredValue: false },
      { field: "bytesConsumed", mutatedValue: true, restoredValue: false },
      { field: "parsedMaterialPacket", mutatedValue: { packetId: "FORGED_PARSED_PACKET" }, restoredValue: null },
      { field: "parserOutput", mutatedValue: { text: "FORGED_OUTPUT" }, restoredValue: null },
      { field: "evidenceCorpus", mutatedValue: { evidenceItems: [] }, restoredValue: null },
    ];

    for (const { field, mutatedValue, restoredValue } of mutationCases) {
      const decision = evaluateSourceAcquisitionParserWorkerAdmission(request());
      const mutableDecision = decision as unknown as Record<string, unknown>;

      mutableDecision[field] = mutatedValue;

      expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toBeNull();
      expect(inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toMatchObject({
        status: "blocked_not_runtime_owned",
        blockedReason: "admission_not_runtime_owned",
        decision: null,
      });

      mutableDecision[field] = restoredValue;
      expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toBeNull();
    }
  });

  it("does not let the owner-only marker bless malformed or execution-like decisions", () => {
    const forged = forgedAdmissionDecision() as unknown as Record<string, unknown>;
    forged.workerSpawned = true;

    const marked = markSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(forged);

    expect(marked).toBe(forged);
    expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(marked)).toBeNull();
    expect(inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(marked)).toEqual({
      provenanceVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_PROVENANCE_VERSION,
      status: "blocked_not_runtime_owned",
      blockedReason: "admission_not_runtime_owned",
      decision: null,
    });
  });
});
