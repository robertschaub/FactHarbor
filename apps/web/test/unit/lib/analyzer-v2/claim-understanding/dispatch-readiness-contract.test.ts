import { describe, expect, it } from "vitest";
import {
  buildClaimUnderstandingDispatchFrame,
  type ClaimUnderstandingDispatchFrame,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-frame";
import {
  CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION,
  validateClaimUnderstandingDispatchReadinessContract,
  type ClaimUnderstandingDispatchReadinessApprovalSnapshot,
  type ClaimUnderstandingDispatchReadinessProvenancePacket,
  type ClaimUnderstandingDispatchReadinessSideEffects,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

const noReadinessSideEffects = {
  promptLoaded: false,
  promptRendered: false,
  adapterImported: false,
  adapterCalled: false,
  modelCalled: false,
  promptHashConstructed: false,
  configHashConstructed: false,
  inputIdentityHashConstructed: false,
  cacheDecisionConstructed: false,
  cacheRead: false,
  cacheWrite: false,
  providerCallbackCreated: false,
  providerSdkLoaded: false,
  approvalMutated: false,
  productDispatchWired: false,
} satisfies ClaimUnderstandingDispatchReadinessSideEffects;

function buildContext(input: ClaimBoundaryV2Ingress) {
  return buildClaimBoundaryV2RunContext(input, {
    now: () => new Date("2026-05-14T12:34:56.000Z"),
  });
}

function readyFrame(input: ClaimBoundaryV2Ingress): ClaimUnderstandingDispatchFrame {
  const result = buildClaimUnderstandingDispatchFrame(input, buildContext(input));
  expect(result.status).toBe("ready");
  if (result.status !== "ready") {
    throw new Error(`Expected dispatch frame to be ready, got ${result.blockedReason}`);
  }
  return result.frame;
}

function approvalSnapshot(
  overrides: Partial<ClaimUnderstandingDispatchReadinessApprovalSnapshot> = {},
): ClaimUnderstandingDispatchReadinessApprovalSnapshot {
  return {
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    promptApprovalStatus: "approved",
    modelApprovalStatus: "approved",
    cacheApprovalStatus: "approved",
    approvalSource: "review_packet_snapshot",
    ...overrides,
  };
}

function provenancePacket(
  frame: ClaimUnderstandingDispatchFrame,
  overrides: Partial<ClaimUnderstandingDispatchReadinessProvenancePacket> = {},
): ClaimUnderstandingDispatchReadinessProvenancePacket {
  return {
    promptProfile: "claimboundary-v2",
    promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
    promptContentHash: "prompt-content-hash-6b3c2",
    renderedPromptHash: "rendered-prompt-hash-6b3c2",
    configSnapshotHash: "config-snapshot-hash-6b3c2",
    modelTask: "understand",
    provider: "anthropic",
    modelName: "claude-haiku-4-5-20251001",
    temperature: 0.15,
    outputSchemaVersion: "v2.claim_understanding_result.0",
    resultSchemaVersion: "4.0.0-cb-precutover",
    inputSource: frame.inputSource,
    inputIdentityHash: "input-identity-hash-6b3c2",
    acsSnapshotHash: frame.inputSource === "acs_prepared_snapshot" ? "v2-acs-hash" : null,
    inputGroundingSeedHash: "input-grounding-seed-hash-6b3c2",
    currentDateBucket: frame.currentDate,
    cacheDecisionState: "not_constructed",
    ...overrides,
  };
}

describe("Analyzer V2 Claim Understanding dispatch readiness contract", () => {
  it("accepts only an externally supplied complete direct-text contract without side effects", () => {
    const submittedText = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    const frame = readyFrame({
      runIdHint: "job-readiness-direct-text",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket(frame),
    });

    expect(result).toEqual({
      status: "contract_satisfied",
      contractVersion: CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION,
      frame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket(frame),
      blockedReasons: [],
      sideEffects: noReadinessSideEffects,
    });
    expect(result.frame.analysisInput).toBe(submittedText);
    expect(result.frame.resolvedInputText).toBe(submittedText);
  });

  it("blocks when the approval snapshot is not executable and approved", () => {
    const frame = readyFrame({
      runIdHint: "job-readiness-approval-blocked",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: approvalSnapshot({
        gatewayTaskStatus: "blockedUntilPromptApproved",
        modelApprovalStatus: "pending",
      }),
      provenancePacket: provenancePacket(frame),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "approval_snapshot_incomplete",
      "approval_snapshot_not_executable",
    ]));
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });

  it("blocks incomplete provenance and constructed cache decisions", () => {
    const frame = readyFrame({
      runIdHint: "job-readiness-provenance-blocked",
      submitted: {
        kind: "text",
        value: "Using hydrogen for cars is more efficient than using electricity",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket(frame, {
        promptContentHash: "",
        cacheDecisionState: "constructed",
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "provenance_packet_incomplete",
      "cache_decision_must_not_be_constructed",
    ]));
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });

  it("requires ACS provenance when the frame came from a prepared snapshot", () => {
    const frame = readyFrame({
      runIdHint: "job-readiness-acs-provenance",
      submitted: {
        kind: "url",
        value: "https://example.test/source",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Plastic recycling is pointless",
          preparedUnderstanding: {
            detectedInputType: "url",
            detectedLanguage: "en",
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "input-grounding-seed-hash-6b3c2",
      },
      selectedAtomicClaimIds: ["AC_01"],
    });

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket(frame, {
        acsSnapshotHash: null,
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["acs_provenance_missing"]);
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });

  it("cannot turn an unresolved direct URL into a readiness contract", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-readiness-direct-url",
      submitted: {
        kind: "url",
        value: "https://example.test/article",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };
    const frameResult = buildClaimUnderstandingDispatchFrame(input, buildContext(input));

    expect(frameResult).toMatchObject({
      status: "blocked",
      frame: null,
      blockedReason: "direct_url_requires_resolved_body",
    });

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame: frameResult.frame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket({
        analysisInput: "https://example.test/article",
        resolvedInputText: "https://example.test/article",
        detectedLanguage: "und",
        selectedAtomicClaimIds: [],
        currentDate: "2026-05-14",
        inputSource: "direct_input",
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("dispatch_frame_missing");
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });
});
