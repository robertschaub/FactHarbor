import { describe, expect, it } from "vitest";
import {
  buildClaimUnderstandingDispatchFrame,
  type ClaimUnderstandingDispatchFrame,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-frame";
import {
  validateClaimUnderstandingDispatchReadinessContract,
  type ClaimUnderstandingDispatchReadinessApprovalSnapshot,
  type ClaimUnderstandingDispatchReadinessProvenancePacket,
  type ClaimUnderstandingDispatchReadinessResult,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract";
import {
  CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION,
  executeClaimUnderstandingRuntimeDispatch,
  validateClaimUnderstandingRuntimeDispatchOwnerContract,
  type ClaimUnderstandingRuntimeDispatchOwnerContract,
  type ClaimUnderstandingRuntimeDispatchOwnerSideEffects,
} from "@/lib/analyzer-v2/claim-understanding/runtime-dispatch";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimContract,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimUnderstandingProviderCallRequest } from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

const noRuntimeDispatchSideEffects = {
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
} satisfies ClaimUnderstandingRuntimeDispatchOwnerSideEffects;

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

function runtimeApprovalSnapshot(
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
    configSnapshotHash: "config-snapshot-hash-6b3c3a",
    modelTask: "understand",
    provider: "anthropic",
    modelName: "claude-haiku-4-5-20251001",
    temperature: 0.15,
    outputSchemaVersion: "v2.claim_understanding_result.0",
    resultSchemaVersion: "4.0.0-cb-precutover",
    inputSource: frame.inputSource,
    inputIdentityHash: "input-identity-hash-6b3c3a",
    acsSnapshotHash: frame.inputSource === "acs_prepared_snapshot" ? "v2-acs-hash" : null,
    inputGroundingSeedHash: "input-grounding-seed-hash-6b3c3a",
    currentDateBucket: frame.currentDate,
    cacheDecisionState: "not_constructed",
    ...overrides,
  };
}

function readiness(frame: ClaimUnderstandingDispatchFrame): ClaimUnderstandingDispatchReadinessResult {
  return validateClaimUnderstandingDispatchReadinessContract({
    frame,
    approvalSnapshot: runtimeApprovalSnapshot(),
    provenancePacket: provenancePacket(frame),
  });
}

function ownerContract(
  ready: ClaimUnderstandingDispatchReadinessResult,
  overrides: Partial<ClaimUnderstandingRuntimeDispatchOwnerContract> = {},
): ClaimUnderstandingRuntimeDispatchOwnerContract {
  return {
    ownerId: "claim_understanding_runtime_dispatch_owner",
    ownerModule: "claim_understanding_runtime_dispatch",
    runtimeMode: "contract_only",
    readiness: ready,
    productReachability: "not_wired",
    promptRenderingState: "not_rendered",
    cachePosture: {
      cacheDecisionState: "not_constructed",
      canRead: false,
      canWrite: false,
      cacheIoImported: false,
    },
    providerBoundary: {
      providerCallbackState: "not_created",
      providerSdkState: "not_imported",
    },
    publicSurfaceState: "internal_only",
    directUrlDispatchState: "blocked_by_dispatch_frame",
    ...overrides,
  };
}

function claimContract(input: string, language: string): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: input,
      resolvedInputText: input,
      detectedLanguage: language,
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: input,
      resolvedInputText: input,
      detectedLanguage: language,
      currentDate: "2026-05-14",
      acsSnapshotHash: null,
      inputGroundingSeedHash: `seed-hash-${language}`,
    },
    atomicClaims: [
      {
        id: "AC_DIRECT_01",
        statement: input,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Claim Understanding accepted the selected direct-input AtomicClaim.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedResult(input: string, language: string): ClaimUnderstandingResult {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "accepted",
    claimContract: claimContract(input, language),
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

describe("Analyzer V2 Claim Understanding runtime dispatch owner contract", () => {
  it("satisfies only the inert owner contract for direct text without dispatch side effects", () => {
    const submittedText = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-owner-direct",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const ready = readiness(frame);
    const result = validateClaimUnderstandingRuntimeDispatchOwnerContract(ownerContract(ready));

    expect(ready.status).toBe("contract_satisfied");
    expect(result).toEqual({
      status: "owner_contract_satisfied",
      contractVersion: CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION,
      ownerContract: ownerContract(ready),
      blockedReasons: [],
      sideEffects: noRuntimeDispatchSideEffects,
    });
    expect(result.ownerContract.readiness.frame?.analysisInput).toBe(submittedText);
  });

  it("blocks review-package approval snapshots before owner activation can pass", () => {
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-owner-review-packet",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const blockedReadiness = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: runtimeApprovalSnapshot({
        approvalSource: "review_packet_snapshot",
      }),
      provenancePacket: provenancePacket(frame),
    });
    const result = validateClaimUnderstandingRuntimeDispatchOwnerContract(ownerContract(blockedReadiness));

    expect(blockedReadiness.status).toBe("blocked");
    expect(blockedReadiness.blockedReasons).toContain("approval_snapshot_source_not_runtime");
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["readiness_contract_not_satisfied"]);
    expect(result.sideEffects).toEqual(noRuntimeDispatchSideEffects);
  });

  it("blocks product wiring, prompt rendering, provider setup, cache IO, and public exposure", () => {
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-owner-unsafe",
      submitted: {
        kind: "text",
        value: "Using hydrogen for cars is more efficient than using electricity",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const result = validateClaimUnderstandingRuntimeDispatchOwnerContract(ownerContract(readiness(frame), {
      productReachability: "wired_to_product",
      promptRenderingState: "rendered",
      cachePosture: {
        cacheDecisionState: "constructed",
        canRead: true,
        canWrite: false,
        cacheIoImported: true,
      },
      providerBoundary: {
        providerCallbackState: "created",
        providerSdkState: "imported",
      },
      publicSurfaceState: "public_exposed",
      directUrlDispatchState: "allowed",
    }));

    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(expect.arrayContaining([
      "product_reachability_enabled",
      "prompt_rendering_not_deferred",
      "cache_posture_not_no_io",
      "provider_boundary_not_deferred",
      "public_surface_exposed",
      "direct_url_dispatch_not_blocked",
    ]));
    expect(result.sideEffects).toEqual(noRuntimeDispatchSideEffects);
  });

  it("cannot convert an unresolved direct URL into owner activation", () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-dispatch-owner-direct-url",
      submitted: {
        kind: "url",
        value: "https://example.test/article",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };
    const frameResult = buildClaimUnderstandingDispatchFrame(input, buildContext(input));
    expect(frameResult.status).toBe("blocked");

    const blockedReadiness = validateClaimUnderstandingDispatchReadinessContract({
      frame: frameResult.frame,
      approvalSnapshot: runtimeApprovalSnapshot(),
      provenancePacket: provenancePacket({
        analysisInput: "https://example.test/article",
        resolvedInputText: "https://example.test/article",
        detectedLanguage: "und",
        selectedAtomicClaimIds: [],
        currentDate: "2026-05-14",
        inputSource: "direct_input",
      }),
    });
    const result = validateClaimUnderstandingRuntimeDispatchOwnerContract(ownerContract(blockedReadiness));

    expect(blockedReadiness.status).toBe("blocked");
    expect(blockedReadiness.blockedReasons).toContain("dispatch_frame_missing");
    expect(result.status).toBe("blocked");
    expect(result.blockedReasons).toEqual(["readiness_contract_not_satisfied"]);
    expect(result.sideEffects).toEqual(noRuntimeDispatchSideEffects);
  });

  it("renders direct-text prompt and calls the adapter through the injected provider only", async () => {
    const submittedText = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-direct-owner",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const ready = readiness(frame);
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: ready,
      providerCall: async (request) => {
        providerCalls.push(request);
        return {
          output: acceptedResult(submittedText, "und"),
          telemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 120,
            outputTokens: 80,
            totalTokens: 200,
            durationMs: 345,
          },
        };
      },
    });

    expect(ready.status).toBe("contract_satisfied");
    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error(`Expected completed runtime dispatch, got ${result.blockedReason}`);
    }
    expect(providerCalls).toHaveLength(1);
    expect(providerCalls[0].renderedPrompt).toContain(submittedText);
    expect(providerCalls[0].renderedPrompt).toContain("null");
    expect(providerCalls[0].inputFrame).toEqual({
      analysisInput: submittedText,
      resolvedInputText: submittedText,
      detectedLanguage: "und",
    });
    expect(result.cacheDecision).toMatchObject({
      canRead: false,
      canWrite: false,
      reason: "no_store_runtime_dispatch_safety",
    });
    expect(result.adapterOutcome.executionStatus).toBe("completed");
    expect(result.adapterOutcome.claimUnderstandingResult?.status).toBe("accepted");
    expect(result.promptProvenance.promptContentHash).toHaveLength(64);
    expect(result.promptProvenance.renderedPromptHash).toHaveLength(64);
    expect(result.sideEffects).toMatchObject({
      promptRendered: true,
      cacheDecisionConstructed: true,
      adapterCalled: true,
      modelCalled: true,
      providerCallbackCreated: false,
      cacheRead: false,
      cacheWrite: false,
      productDispatchWired: false,
    });
  });

  it("blocks failed readiness before prompt rendering or provider calls", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-dispatch-blocked-readiness",
      submitted: {
        kind: "url",
        value: "https://example.test/article",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };
    const frameResult = buildClaimUnderstandingDispatchFrame(input, buildContext(input));
    const blockedReadiness = validateClaimUnderstandingDispatchReadinessContract({
      frame: frameResult.frame,
      approvalSnapshot: runtimeApprovalSnapshot(),
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
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: blockedReadiness,
      providerCall: async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("readiness_contract_not_satisfied");
    expect(providerCalls).toEqual([]);
    expect(result.sideEffects).toMatchObject({
      promptRendered: false,
      cacheDecisionConstructed: false,
      adapterCalled: false,
      modelCalled: false,
      cacheRead: false,
      cacheWrite: false,
    });
  });

  it("keeps ACS readiness deferred before prompt rendering or provider calls", async () => {
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-acs-deferred",
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
    const blockedReadiness = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: runtimeApprovalSnapshot(),
      provenancePacket: provenancePacket(frame, {
        submittedKind: "url",
      }),
    });
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: blockedReadiness,
      providerCall: async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      },
    });

    expect(blockedReadiness.status).toBe("blocked");
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("readiness_contract_not_satisfied");
    expect(providerCalls).toEqual([]);
    expect(result.sideEffects.promptRendered).toBe(false);
  });

  it("fails closed after prompt-render rejection without adapter or provider calls", async () => {
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-prompt-render-blocked",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const readyWithRejectedSection = validateClaimUnderstandingDispatchReadinessContract({
      frame,
      approvalSnapshot: runtimeApprovalSnapshot(),
      provenancePacket: provenancePacket(frame, {
        promptSectionId: "V1_LEGACY_SECTION" as never,
      }),
    });
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: readyWithRejectedSection,
      providerCall: async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      },
    });

    expect(readyWithRejectedSection.status).toBe("contract_satisfied");
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("prompt_render_failed");
    expect(result.failureMessage).toContain("rejects prompt section");
    expect(providerCalls).toEqual([]);
    expect(result.sideEffects).toMatchObject({
      promptRendered: false,
      cacheDecisionConstructed: false,
      adapterCalled: false,
      cacheRead: false,
      cacheWrite: false,
    });
  });

  it("returns damaged adapter output for provider failure without cache IO", async () => {
    const submittedText = "Plastic recycling is pointless";
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-provider-failure",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: readiness(frame),
      providerCall: async () => {
        throw new Error("provider unavailable");
      },
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error(`Expected completed runtime dispatch, got ${result.blockedReason}`);
    }
    expect(result.adapterOutcome.claimUnderstandingResult?.status).toBe("damaged");
    expect(result.adapterOutcome.claimUnderstandingResult?.damagedReason).toBe("claim_understanding_unavailable");
    expect(result.sideEffects).toMatchObject({
      adapterCalled: true,
      modelCalled: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
    });
  });

  it("returns damaged adapter output for invalid telemetry without cache IO", async () => {
    const submittedText = "Plastic recycling is pointless";
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-invalid-telemetry",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: readiness(frame),
      providerCall: async () => ({
        output: acceptedResult(submittedText, "und"),
        telemetry: {
          providerId: "unknown",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 120,
          outputTokens: 80,
          totalTokens: 200,
          durationMs: 345,
        },
      }),
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error(`Expected completed runtime dispatch, got ${result.blockedReason}`);
    }
    expect(result.adapterOutcome.claimUnderstandingResult?.status).toBe("damaged");
    expect(result.adapterOutcome.claimUnderstandingResult?.damagedReason).toBe("claim_understanding_unavailable");
    expect(result.sideEffects.cacheRead).toBe(false);
    expect(result.sideEffects.cacheWrite).toBe(false);
  });

  it("returns damaged adapter output after invalid schema retry without cache IO", async () => {
    const submittedText = "Plastic recycling is pointless";
    const frame = readyFrame({
      runIdHint: "job-runtime-dispatch-invalid-schema",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];

    const result = await executeClaimUnderstandingRuntimeDispatch({
      readiness: readiness(frame),
      providerCall: async (request) => {
        providerCalls.push(request);
        return {
          output: { status: "accepted", claimContract: { extra: true } },
          telemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 120,
            outputTokens: 80,
            totalTokens: 200,
            durationMs: 345,
          },
        };
      },
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error(`Expected completed runtime dispatch, got ${result.blockedReason}`);
    }
    expect(providerCalls).toHaveLength(2);
    expect(result.adapterOutcome.claimUnderstandingResult?.status).toBe("damaged");
    expect(result.adapterOutcome.claimUnderstandingResult?.damagedReason).toBe("claim_contract_validation_failed");
    expect(result.sideEffects.cacheRead).toBe(false);
    expect(result.sideEffects.cacheWrite).toBe(false);
  });
});
