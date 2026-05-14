import { describe, expect, it } from "vitest";
import { runClaimUnderstandingRuntimeStage } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type {
  ClaimUnderstandingProviderCall,
  ClaimUnderstandingProviderCallRequest,
} from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";

const noDispatchSideEffects = {
  promptLoaded: false,
  promptRendered: false,
  adapterCalled: false,
  modelCalled: false,
  cacheDecisionConstructed: false,
  cacheRead: false,
  cacheWrite: false,
  providerCallbackCreated: false,
};

function buildContext(input: ClaimBoundaryV2Ingress) {
  return buildClaimBoundaryV2RunContext(input, {
    now: () => new Date("2026-05-14T12:00:00.000Z"),
  });
}

function directTextRuntimeOptions(providerCall: ClaimUnderstandingProviderCall) {
  return {
    directTextRuntimeDispatch: {
      enabled: true,
      providerBoundary: {
        providerCall,
        provider: "anthropic",
        modelName: "claude-haiku-4-5-20251001",
        configSnapshotHash: "config-snapshot-hash-6b3c4a",
        temperature: 0.15,
      },
    },
  };
}

describe("analyzer-v2 Claim Understanding runtime stage", () => {
  it("migrates a valid ACS snapshot into internal state without dispatch side effects", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-acs",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "de",
            atomicClaims: [
              {
                id: "AC_01",
                statement: "Vorbereitete Aussage",
              },
            ],
            gate1Stats: {
              overallPass: true,
            },
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };

    const state = await runClaimUnderstandingRuntimeStage(input, buildContext(input));

    expect(state).toMatchObject({
      visibility: "internal_only",
      inputSource: "acs_prepared_snapshot",
      status: "accepted",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
    expect(state.result).toMatchObject({
      status: "accepted",
      claimContract: {
        input: {
          detectedLanguage: "de",
          selectedAtomicClaimIds: ["AC_01"],
        },
        inputGroundingSeed: {
          source: "acs_prepared_snapshot",
          acsSnapshotHash: "v2-acs-hash",
          inputGroundingSeedHash: "v2-input-grounding-hash",
        },
      },
    });
  });

  it("blocks direct input at the shipped gateway policy without prompt/cache/provider work", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct",
      submitted: {
        kind: "text",
        value: "Direkter Eingabetext",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const state = await runClaimUnderstandingRuntimeStage(input, buildContext(input));

    expect(state).toEqual({
      stageVersion: "v2.claim-understanding.runtime-stage.0",
      visibility: "internal_only",
      inputSource: "direct_input",
      status: "blocked_by_gateway",
      result: null,
      blockedReason: "gateway_policy_not_executable",
      gatewayTaskId: "claim_understanding_gate1",
      gatewayTaskStatus: "blockedUntilPromptApproved",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
  });

  it("fails ACS migration closed when canonical V2 hashes are missing", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-acs-missing-hash",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "en",
            atomicClaims: [
              {
                id: "AC_01",
                statement: "Prepared statement",
              },
            ],
          },
        },
      },
      selectedAtomicClaimIds: ["AC_01"],
    };

    const state = await runClaimUnderstandingRuntimeStage(input, buildContext(input));

    expect(state).toMatchObject({
      inputSource: "acs_prepared_snapshot",
      status: "blocked",
      blockedReason: "prepared_snapshot_invalid",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
      result: {
        status: "blocked",
        blockedReason: "prepared_snapshot_invalid",
      },
    });
  });

  it("keeps shell-only placeholder IDs blocked at the stage boundary", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-shell-placeholder",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "en",
            atomicClaims: [
              {
                id: "AC_V2_SHELL_01",
                statement: "Shell placeholder statement",
              },
            ],
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_V2_SHELL_01"],
    };

    const state = await runClaimUnderstandingRuntimeStage(input, buildContext(input));

    expect(state).toMatchObject({
      status: "blocked",
      blockedReason: "shell_placeholder_claim_id",
      sideEffects: noDispatchSideEffects,
      result: {
        status: "blocked",
        blockedReason: "shell_placeholder_claim_id",
      },
    });
  });

  it("blocks direct text at the real gateway even when scaffold options are enabled", async () => {
    const submittedText = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct-enabled",
      submitted: {
        kind: "text",
        value: submittedText,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const state = await runClaimUnderstandingRuntimeStage(
      input,
      buildContext(input),
      directTextRuntimeOptions(async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      }),
    );

    expect(state).toEqual({
      stageVersion: "v2.claim-understanding.runtime-stage.0",
      visibility: "internal_only",
      inputSource: "direct_input",
      status: "blocked_by_gateway",
      result: null,
      blockedReason: "gateway_policy_not_executable",
      gatewayTaskId: "claim_understanding_gate1",
      gatewayTaskStatus: "blockedUntilPromptApproved",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
    expect(providerCalls).toEqual([]);
  });

  it("does not let missing-provider scaffold state bypass the blocked gateway", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct-missing-provider",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const state = await runClaimUnderstandingRuntimeStage(input, buildContext(input), {
      directTextRuntimeDispatch: {
        enabled: true,
      },
    });

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "blocked_by_gateway",
      result: null,
      blockedReason: "gateway_policy_not_executable",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
  });

  it("blocks direct URL runtime dispatch before provider, prompt, cache, or adapter work", async () => {
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct-url",
      submitted: {
        kind: "url",
        value: "https://example.test/article",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const state = await runClaimUnderstandingRuntimeStage(
      input,
      buildContext(input),
      directTextRuntimeOptions(async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      }),
    );

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "blocked_by_dispatch_preflight",
      result: null,
      blockedReason: "runtime_dispatch_preflight_blocked",
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: "direct_url_requires_resolved_body",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
    expect(providerCalls).toEqual([]);
  });

  it("keeps ACS input on the migration path even when the direct-text scaffold is enabled", async () => {
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-acs-direct-scaffold-enabled",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "en",
            atomicClaims: [
              {
                id: "AC_01",
                statement: "Prepared statement",
              },
            ],
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };

    const state = await runClaimUnderstandingRuntimeStage(
      input,
      buildContext(input),
      directTextRuntimeOptions(async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      }),
    );

    expect(state).toMatchObject({
      inputSource: "acs_prepared_snapshot",
      status: "accepted",
      sideEffects: noDispatchSideEffects,
    });
    expect(providerCalls).toEqual([]);
  });

  it("blocks provider failure paths before prompt rendering while gateway approval is missing", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct-provider-failure",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };

    const state = await runClaimUnderstandingRuntimeStage(
      input,
      buildContext(input),
      directTextRuntimeOptions(async () => {
        throw new Error("provider unavailable");
      }),
    );

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "blocked_by_gateway",
      result: null,
      blockedReason: "gateway_policy_not_executable",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
  });
});
