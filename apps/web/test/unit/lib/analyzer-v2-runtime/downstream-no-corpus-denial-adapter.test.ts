import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_RUNTIME_DOWNSTREAM_NO_CORPUS_DENIAL_ADAPTER_VERSION,
  buildRuntimeDownstreamNoCorpusDenialAdapter,
  type RuntimeDownstreamNoCorpusDenialAdapterResult,
} from "@/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter";
import {
  type HiddenDirectTextSourceAcquisitionExecutionGateResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate";
import {
  markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance";
import {
  SOURCE_ACQUISITION_PARSER_WORKER_CONTRACT_VERSION,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_ISOLATION_LABEL,
  SOURCE_ACQUISITION_PARSER_WORKER_P0_PROFILE_ID,
  evaluateSourceAcquisitionParserWorkerAdmission,
  type SourceAcquisitionParserWorkerAdmissionRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission";
import {
  buildSourceAcquisitionParserAdmissionParsedMaterialDenial,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial";

const FORBIDDEN_STATUS_OR_REASON_FRAGMENTS = [
  "ready",
  "eligible",
  "available",
  "executable",
  "approved",
  "source_acquired",
  "source_material_available",
  "evidence_available",
  "corpus_buildable",
  "live_eligible",
];

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function x7fGate(
  overrides: Partial<HiddenDirectTextSourceAcquisitionExecutionGateResult> = {},
): HiddenDirectTextSourceAcquisitionExecutionGateResult {
  return markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult({
    gateVersion: "v2.hidden-direct-text-source-acquisition-execution-gate.x7f",
    visibility: "internal_only",
    status: "gate_closed_no_io",
    executionStatus: "blocked_no_io",
    closedReason: "research_acquisition_gateway_not_implemented",
    blockedReason: null,
    readinessCompositionVersion: "v2.hidden-direct-text-source-acquisition-readiness-composition.x7d",
    readinessCompositionStatus: "composition_not_executable_pre_live_gate",
    readinessCompositionBlockedReason: null,
    networkExecution: false,
    providerCalls: 0,
    networkCalls: 0,
    bytesRead: 0,
    candidateRecords: 0,
    retries: 0,
    parserRuns: 0,
    cacheTouched: false,
    sourceReliabilityTouched: false,
    publicExposure: false,
    liveJobs: false,
    providerNetworkExecution: null,
    candidateAcquisition: null,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    contentPackets: null,
    parserInput: null,
    parserOutput: null,
    parserAdmissionStatus: "blocked_pending_b2_b3_c0_2d_c",
    ...overrides,
  } as HiddenDirectTextSourceAcquisitionExecutionGateResult);
}

function parserAdmissionRequest(
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
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_X7G2_ADAPTER",
      byteCount: 30,
      byteDigest: digest("fixture-control-material-x7g2-adapter"),
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

function c0s3Denial() {
  return buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
    parserAdmission: evaluateSourceAcquisitionParserWorkerAdmission(parserAdmissionRequest()),
  });
}

function c0s3NotOwnedAdmissionDenial() {
  return buildSourceAcquisitionParserAdmissionParsedMaterialDenial({
    parserAdmission: { reconstructed: true },
  });
}

function expectAdapterOutputsDenied(result: RuntimeDownstreamNoCorpusDenialAdapterResult): void {
  expect(result).toMatchObject({
    adapterVersion: ANALYZER_V2_RUNTIME_DOWNSTREAM_NO_CORPUS_DENIAL_ADAPTER_VERSION,
    visibility: "internal_only",
    sourceMaterial: null,
    parsedMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    evidenceItems: null,
    warnings: null,
    report: null,
    publicOutput: null,
    liveEligibility: false,
    semanticLlmTasksApproved: false,
    productPublicLiveApproved: false,
    cacheTouched: false,
    sourceReliabilityTouched: false,
  });
  expect(result.coreDenial).toMatchObject({
    sourceMaterialGuardVersion: null,
    sourceMaterialGuardStatus: null,
    sourceMaterialGuardReason: null,
    applicabilityInput: null,
    extractionInput: null,
    sufficiencyInput: null,
    boundaryInput: null,
    verdictInput: null,
    evidenceCorpus: null,
    evidenceItems: null,
    warnings: null,
    report: null,
    publicOutput: null,
  });
}

describe("Analyzer V2 runtime downstream no-corpus denial adapter", () => {
  it("maps producer-owned X7-F closed no-IO results to downstream no-corpus denial", () => {
    const result = buildRuntimeDownstreamNoCorpusDenialAdapter(x7fGate());

    expect(result).toMatchObject({
      status: "runtime_downstream_blocked_no_corpus",
      blockedReason: "runtime_source_acquisition_gate_closed",
      upstreamKind: "x7f_source_acquisition_gate",
      coreDenial: {
        status: "downstream_blocked_no_evidence_corpus",
        blockedReason: "runtime_source_acquisition_gate_closed",
      },
    });
    expectAdapterOutputsDenied(result);
  });

  it("maps producer-owned X7-F blocked results only to denied downstream state", () => {
    const result = buildRuntimeDownstreamNoCorpusDenialAdapter(x7fGate({
      status: "blocked_pre_execution",
      closedReason: null,
      blockedReason: "request_malformed",
      readinessCompositionVersion: null,
      readinessCompositionStatus: null,
      readinessCompositionBlockedReason: null,
    }));

    expect(result).toMatchObject({
      status: "runtime_downstream_blocked_no_corpus",
      blockedReason: "runtime_source_acquisition_gate_rejected",
      upstreamKind: "x7f_source_acquisition_gate",
      coreDenial: {
        status: "downstream_blocked_no_evidence_corpus",
        blockedReason: "runtime_source_acquisition_gate_rejected",
      },
    });
    expectAdapterOutputsDenied(result);
  });

  it("maps producer-owned C0-S3 no-parsed-material denial to downstream no-corpus denial", () => {
    const result = buildRuntimeDownstreamNoCorpusDenialAdapter(c0s3Denial());

    expect(result).toMatchObject({
      status: "runtime_downstream_blocked_no_corpus",
      blockedReason: "runtime_parser_denial_no_parsed_material",
      upstreamKind: "c0s3_parsed_material_denial",
      coreDenial: {
        status: "downstream_blocked_no_evidence_corpus",
        blockedReason: "runtime_parser_denial_no_parsed_material",
      },
    });
    expectAdapterOutputsDenied(result);
  });

  it("maps producer-owned C0-S3 non-runtime-owned admission denial to structural rejection", () => {
    const result = buildRuntimeDownstreamNoCorpusDenialAdapter(c0s3NotOwnedAdmissionDenial());

    expect(result).toMatchObject({
      status: "runtime_downstream_blocked_no_corpus",
      blockedReason: "runtime_input_not_owned",
      upstreamKind: "c0s3_parsed_material_denial",
      coreDenial: {
        status: "downstream_blocked_no_evidence_corpus",
        blockedReason: "runtime_input_not_owned",
      },
    });
    expectAdapterOutputsDenied(result);
  });

  it("rejects unowned or positive-looking upstream-shaped input as adapter invalid", () => {
    for (const input of [
      { ...x7fGate() },
      JSON.parse(JSON.stringify(x7fGate())),
      structuredClone(x7fGate()),
      { ...c0s3Denial() },
      JSON.parse(JSON.stringify(c0s3Denial())),
      structuredClone(c0s3Denial()),
      { parserExecution: true, parsedMaterialPacket: { text: "RAW_PARSED_X7G2" } },
      null,
    ]) {
      const result = buildRuntimeDownstreamNoCorpusDenialAdapter(input);

      expect(result).toMatchObject({
        status: "runtime_downstream_blocked_input_invalid",
        blockedReason: "runtime_input_invalid",
        upstreamKind: null,
        coreDenial: {
          status: "downstream_blocked_input_invalid",
        },
      });
      expect(JSON.stringify(result)).not.toContain("RAW_PARSED_X7G2");
      expectAdapterOutputsDenied(result);
    }
  });

  it("keeps adapter-owned status and reason labels denial-only", () => {
    const results = [
      buildRuntimeDownstreamNoCorpusDenialAdapter(x7fGate()),
      buildRuntimeDownstreamNoCorpusDenialAdapter(c0s3Denial()),
      buildRuntimeDownstreamNoCorpusDenialAdapter({}),
    ];

    for (const result of results) {
      for (const value of [result.status, result.blockedReason]) {
        for (const forbidden of FORBIDDEN_STATUS_OR_REASON_FRAGMENTS) {
          expect(value).not.toContain(forbidden);
        }
      }
    }
  });
});
