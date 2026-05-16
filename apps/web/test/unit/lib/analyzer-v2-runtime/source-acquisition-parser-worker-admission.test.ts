import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_VERSION,
  SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
  evaluateSourceAcquisitionParserWorkerAdmission,
  type SourceAcquisitionParserWorkerAdmissionRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission";
import {
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

describe("Analyzer V2 parser-worker C0/P0 admission", () => {
  it("admits only structural P0 fixture/control metadata without execution", () => {
    const decision = evaluateSourceAcquisitionParserWorkerAdmission(request());
    const serialized = JSON.stringify(decision);

    expect(decision).toMatchObject({
      admissionVersion: SOURCE_ACQUISITION_PARSER_WORKER_ADMISSION_VERSION,
      contractVersion: SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
      visibility: "internal_only",
      status: "p0_admitted_fixture_or_synthetic_inert",
      blockedReason: null,
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
    });
    expect(serialized).not.toContain("fixture-control-material-alpha");
    expect(serialized).not.toContain("payloadBase64");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
    expect(readSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(decision)).toBe(decision);
  });

  it("admits structural synthetic inert metadata without treating P0 as a security boundary", () => {
    const decision = evaluateSourceAcquisitionParserWorkerAdmission(request({
      inputProvenance: {
        kind: "synthetic_inert",
        syntheticInputId: "SYNTHETIC_INERT_001",
        byteCount: 19,
        byteDigest: digest("synthetic inert one"),
        bytesIncluded: false,
        rawPayloadIncluded: false,
        parsedTextIncluded: false,
      },
    }));

    expect(decision).toMatchObject({
      status: "p0_admitted_fixture_or_synthetic_inert",
      isolationLabel: "provisional_local_inert_only_not_security_boundary",
      parserExecution: false,
      workerSpawned: false,
      admittedProvenanceKind: "synthetic_inert",
    });
  });

  it("fails closed for malformed requests, wrong profile, and security-boundary claims", () => {
    expect(evaluateSourceAcquisitionParserWorkerAdmission({
      ...request(),
      callback: () => "not allowed",
    } as unknown as SourceAcquisitionParserWorkerAdmissionRequest)).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "request_malformed",
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      profileId: "P1_WINDOWS_LOCAL_DENIED_AUTHORITY",
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "profile_not_p0",
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      isolationLabel: "production_security_boundary",
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "p0_not_security_boundary",
    });
  });

  it("rejects transport-owned packets, frames, real bytes, and non-P0 deployment claims", () => {
    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      inputProvenance: {
        kind: "source_acquisition_content_transport_owned_packet_7n3b3_2c_a",
      } as unknown as SourceAcquisitionParserWorkerAdmissionRequest["inputProvenance"],
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "transport_packet_rejected",
      transportPacketAccepted: false,
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      inputProvenance: {
        kind: "source_acquisition_content_transport_owned_byte_frame_7n3b3_2c_a",
      } as unknown as SourceAcquisitionParserWorkerAdmissionRequest["inputProvenance"],
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "transport_frame_rejected",
      transportFrameAccepted: false,
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      inputProvenance: {
        kind: "fixture_control",
        fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
        byteCount: 30,
        byteDigest: digest("fixture-control-material-alpha"),
        bytes: new Uint8Array([1, 2, 3]),
        bytesIncluded: false,
        rawPayloadIncluded: false,
        parsedTextIncluded: false,
      } as unknown as SourceAcquisitionParserWorkerAdmissionRequest["inputProvenance"],
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "real_fetched_bytes_rejected",
      realFetchedBytesAccepted: false,
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      profileId: "P2_DEPLOYMENT_CANDIDATE_ISOLATED_WORKER",
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "parser_isolation_not_deployment_candidate",
      deploymentCandidateIsolationAccepted: false,
    });
  });

  it("rejects 2D-C, product/public/live, and Evidence Lifecycle approval claims", () => {
    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      approvalSnapshot: {
        twoDCApproved: true,
        productPublicLiveApproved: false,
        evidenceLifecycleConsumptionApproved: false,
        deploymentCandidateIsolationAccepted: false,
      } as unknown as SourceAcquisitionParserWorkerAdmissionRequest["approvalSnapshot"],
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "two_d_c_not_approved",
      twoDCApproved: false,
    });

    for (const approvalSnapshot of [
      {
        twoDCApproved: false,
        productPublicLiveApproved: true,
        evidenceLifecycleConsumptionApproved: false,
        deploymentCandidateIsolationAccepted: false,
      },
      {
        twoDCApproved: false,
        productPublicLiveApproved: false,
        evidenceLifecycleConsumptionApproved: true,
        deploymentCandidateIsolationAccepted: false,
      },
    ]) {
      expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
        approvalSnapshot: approvalSnapshot as SourceAcquisitionParserWorkerAdmissionRequest["approvalSnapshot"],
      }))).toMatchObject({
        status: "blocked_pre_parser_execution",
        blockedReason: "product_public_live_not_approved",
        productPublicLiveApproved: false,
        evidenceLifecycleConsumptionApproved: false,
      });
    }

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      approvalSnapshot: {
        twoDCApproved: false,
        productPublicLiveApproved: false,
        evidenceLifecycleConsumptionApproved: false,
        deploymentCandidateIsolationAccepted: true,
      } as unknown as SourceAcquisitionParserWorkerAdmissionRequest["approvalSnapshot"],
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "parser_isolation_not_deployment_candidate",
      deploymentCandidateIsolationAccepted: false,
    });
  });

  it("rejects unapproved provenance and oversized metadata without parser execution", () => {
    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      inputProvenance: {
        kind: "network_html",
        byteCount: 10,
        byteDigest: digest("not admitted"),
      } as unknown as SourceAcquisitionParserWorkerAdmissionRequest["inputProvenance"],
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "provenance_not_fixture_control_or_synthetic_inert",
      parserExecution: false,
      workerSpawned: false,
      bytesConsumed: false,
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      inputProvenance: {
        kind: "fixture_control",
        fixturePacketId: "OPAQUE_FIXTURE_PACKET_001",
        byteCount: 30,
        byteDigest: digest("fixture-control-material-alpha"),
        bytesIncluded: false,
        rawPayloadIncluded: false,
        parsedTextIncluded: true,
      },
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "provenance_not_fixture_control_or_synthetic_inert",
      parsedMaterialPacket: null,
      parserOutput: null,
      evidenceCorpus: null,
    });

    expect(evaluateSourceAcquisitionParserWorkerAdmission(request({
      limits: {
        maxInputBytes: 4,
        maxOutputBytes: 16 * 1024,
        timeoutMs: 5_000,
      },
    }))).toMatchObject({
      status: "blocked_pre_parser_execution",
      blockedReason: "request_malformed",
    });
  });
});
