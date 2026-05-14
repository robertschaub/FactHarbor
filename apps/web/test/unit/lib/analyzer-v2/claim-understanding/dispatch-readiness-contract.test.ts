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
    approvalSource: "runtime_approval_snapshot",
    approvalSnapshotId: "runtime-approval-snapshot-6b3c3a",
    approvalSnapshotVersion: "v2.runtime-approval-snapshot.0",
    approvedBy: "Captain deputy review",
    approvedAt: "2026-05-14T15:30:00.000Z",
    ...overrides,
  };
}

function provenancePacket(
  frame: ClaimUnderstandingDispatchFrame,
  overrides: Partial<ClaimUnderstandingDispatchReadinessProvenancePacket> = {},
): ClaimUnderstandingDispatchReadinessProvenancePacket {
  return {
    provenancePhase: "pre_render",
    submittedKind: "text",
    analysisInput: frame.analysisInput,
    resolvedInputText: frame.resolvedInputText,
    selectedAtomicClaimIds: [...frame.selectedAtomicClaimIds],
    promptProfile: "claimboundary-v2",
    promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
    promptContentHash: null,
    renderedPromptHash: null,
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
  it("accepts only an externally supplied complete direct-text pre-render contract without side effects", () => {
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

  it("blocks fake post-render prompt hashes before rendering is owned", () => {
    const frame = readyFrame({
      runIdHint: "job-readiness-fake-render-hash",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket(frame, {
        promptContentHash: "externally-supplied-prompt-hash" as never,
        renderedPromptHash: "externally-supplied-rendered-hash" as never,
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("pre_render_prompt_hash_forbidden");
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
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

  it("blocks review-package snapshots from satisfying runtime readiness", () => {
    const frame = readyFrame({
      runIdHint: "job-readiness-review-packet-blocked",
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
        approvalSource: "review_packet_snapshot",
        approvalSnapshotId: "",
      }),
      provenancePacket: provenancePacket(frame),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "approval_snapshot_source_not_runtime",
      "approval_snapshot_identity_missing",
    ]));
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });

  it("blocks frame identity mismatches and constructed cache decisions", () => {
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
        resolvedInputText: "Changed text",
        cacheDecisionState: "constructed",
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "provenance_frame_mismatch",
      "cache_decision_must_not_be_constructed",
    ]));
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });

  it("defers ACS pre-render readiness until ACS JSON ownership is defined", () => {
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
        submittedKind: "url",
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("acs_preflight_deferred");
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
      }, {
        submittedKind: "url",
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toContain("dispatch_frame_missing");
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });

  it("blocks a forged direct URL frame even when the frame is structurally complete", () => {
    const forgedFrame: ClaimUnderstandingDispatchFrame = {
      analysisInput: "https://example.test/article",
      resolvedInputText: "https://example.test/article",
      detectedLanguage: "und",
      selectedAtomicClaimIds: [],
      currentDate: "2026-05-14",
      inputSource: "direct_input",
    };

    const result = validateClaimUnderstandingDispatchReadinessContract({
      frame: forgedFrame,
      approvalSnapshot: approvalSnapshot(),
      provenancePacket: provenancePacket(forgedFrame, {
        submittedKind: "url",
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["direct_url_preflight_forbidden"]);
    expect(result.sideEffects).toEqual(noReadinessSideEffects);
  });
});
