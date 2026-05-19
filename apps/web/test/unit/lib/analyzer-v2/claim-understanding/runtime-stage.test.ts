import { describe, expect, it } from "vitest";
import { runClaimUnderstandingRuntimeStage } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type {
  ClaimUnderstandingProviderCall,
  ClaimUnderstandingProviderCallRequest,
} from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildClaimUnderstandingRuntimeActivation } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import {
  clearClaimUnderstandingRuntimeArtifacts,
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
  readClaimUnderstandingRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";
import type { ClaimUnderstandingProviderRuntimeConfigSnapshot } from "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract";

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

function buildEnabledContext(input: ClaimBoundaryV2Ingress) {
  const context = buildContext(input);
  return {
    ...context,
    claimUnderstandingRuntimeActivation: {
      ...context.claimUnderstandingRuntimeActivation,
      status: "enabled_hidden_direct_text" as const,
    },
  };
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

function acceptedResult(input: string, language = "en"): ClaimUnderstandingResult {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "accepted",
    claimContract: {
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
        inputGroundingSeedHash: "direct-input-grounding-hash",
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
            summary: "Claim Understanding accepted the direct input.",
            reasons: [],
          },
          integrityEvents: [],
        },
      ],
      integrityEvents: [],
      acsMigration: null,
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function activationFor(params: {
  input: ClaimBoundaryV2Ingress;
  ledgerId: string;
  providerCall: ClaimUnderstandingProviderCall;
}) {
  const context = buildEnabledContext(params.input);
  clearClaimUnderstandingRuntimeArtifacts(params.ledgerId);
  const artifactSink = createClaimUnderstandingRuntimeInMemoryArtifactSink(params.ledgerId);

  return {
    context,
    artifactSink,
    activation: buildClaimUnderstandingRuntimeActivation(context, {
      artifactSink,
      providerFactoryBuilder: (snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot) => ({
        factoryVersion: "v2.claim-understanding.provider-factory.0",
        factorySourcePath: "apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts",
        configSnapshotHash: snapshot.configSnapshotHash,
        providerId: "anthropic",
        modelId: snapshot.modelId,
        providerCall: params.providerCall,
      }),
    }),
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

  it("keeps direct input blocked at stage scope without product-owned activation", async () => {
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
      status: "blocked_by_stage_scope",
      result: null,
      blockedReason: "runtime_dispatch_not_enabled",
      gatewayTaskId: "claim_understanding_gate1",
      gatewayTaskStatus: "executable",
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

  it("blocks legacy direct-text scaffold options after gateway approval", async () => {
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
      status: "blocked_by_stage_scope",
      result: null,
      blockedReason: "runtime_dispatch_not_enabled",
      gatewayTaskId: "claim_understanding_gate1",
      gatewayTaskStatus: "executable",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
    expect(providerCalls).toEqual([]);
  });

  it("does not let missing-provider scaffold state bypass product-owned activation", async () => {
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
      status: "blocked_by_stage_scope",
      result: null,
      blockedReason: "runtime_dispatch_not_enabled",
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

    const { context, activation } = activationFor({
      input,
      ledgerId: "job-runtime-direct-url:ledger",
      providerCall: async (request) => {
        providerCalls.push(request);
        throw new Error("should not be called");
      },
    });

    const state = await runClaimUnderstandingRuntimeStage(input, context, { activation });

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "blocked_by_runtime_activation",
      result: null,
      blockedReason: "runtime_activation_disabled",
      runtimeDispatchStatus: "not_attempted",
      runtimeDispatchBlockedReason: "unsupported_input_source",
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

  it("blocks legacy provider failure paths before prompt rendering without product activation", async () => {
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
      status: "blocked_by_stage_scope",
      result: null,
      blockedReason: "runtime_dispatch_not_enabled",
      cacheEligibility: "not_evaluated",
      sideEffects: noDispatchSideEffects,
    });
  });

  it("runs hidden direct-text Claim Understanding with product-owned activation and records an internal artifact", async () => {
    const inputValue = "Plastic recycling is pointless";
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct-hidden",
      submitted: {
        kind: "text",
        value: inputValue,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };
    const ledgerId = "job-runtime-direct-hidden:ledger";
    const { context, activation } = activationFor({
      input,
      ledgerId,
      providerCall: async (request) => {
        providerCalls.push(request);
        return {
          output: acceptedResult(inputValue),
          telemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 101,
            outputTokens: 49,
            totalTokens: 150,
            durationMs: 250,
          },
        };
      },
    });

    const state = await runClaimUnderstandingRuntimeStage(input, context, { activation });

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "runtime_dispatch_completed",
      blockedReason: null,
      runtimeDispatchStatus: "completed",
      cacheEligibility: "runtime_no_store",
      sideEffects: {
        promptLoaded: true,
        promptRendered: true,
        adapterCalled: true,
        modelCalled: true,
        cacheDecisionConstructed: true,
        cacheRead: false,
        cacheWrite: false,
        providerCallbackCreated: false,
      },
    });
    expect(state.result?.status).toBe("accepted");
    expect(providerCalls).toHaveLength(1);
    expect(providerCalls[0].inputFrame).toEqual({
      analysisInput: inputValue,
      resolvedInputText: inputValue,
      detectedLanguage: "und",
    });
    expect(readClaimUnderstandingRuntimeArtifacts(ledgerId)).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        executionStatus: "completed",
        gatewayTaskStatus: "executable",
        providerTelemetry: {
          providerId: "anthropic",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 101,
          outputTokens: 49,
          totalTokens: 150,
          durationMs: 250,
        },
        schemaOutcome: {
          status: "accepted",
          blockedReason: null,
          damagedReason: null,
        },
        warningMateriality: "admin_only_internal",
      }),
    ]);
  });

  it("records hidden adapter attempt diagnostics when direct-text schema validation fails", async () => {
    const inputValue = "Plastic recycling is pointless";
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-direct-hidden-invalid-schema",
      submitted: {
        kind: "text",
        value: inputValue,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };
    const ledgerId = "job-runtime-direct-hidden-invalid-schema:ledger";
    const { context, activation } = activationFor({
      input,
      ledgerId,
      providerCall: async () => ({
        output: {
          schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
          status: "accepted",
          claimContract: {
            legacyContext: "not allowed",
          },
          integrityEvents: [],
          blockedReason: null,
          damagedReason: null,
        },
        telemetry: {
          providerId: "anthropic",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 101,
          outputTokens: 49,
          totalTokens: 150,
          durationMs: 250,
        },
      }),
    });

    const state = await runClaimUnderstandingRuntimeStage(input, context, { activation });
    const artifact = readClaimUnderstandingRuntimeArtifacts(ledgerId)[0];

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "runtime_dispatch_completed",
      result: {
        status: "damaged",
        damagedReason: "claim_contract_validation_failed",
      },
    });
    expect(artifact).toMatchObject({
      executionStatus: "completed",
      schemaOutcome: {
        status: "damaged",
        damagedReason: "claim_contract_validation_failed",
      },
      adapterAttemptDiagnostics: [
        {
          attemptNumber: 1,
          status: "invalid_schema",
          promptContentHash: expect.any(String),
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
          },
          failureMessage: expect.stringContaining("claimContract"),
        },
        {
          attemptNumber: 2,
          status: "invalid_schema",
          promptContentHash: expect.any(String),
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
          },
          failureMessage: expect.stringContaining("claimContract"),
        },
      ],
    });
    expect(JSON.stringify(artifact.adapterAttemptDiagnostics)).not.toContain(inputValue);
    expect(JSON.stringify(artifact.adapterAttemptDiagnostics)).not.toContain("renderedPrompt");
  });

  it("fails hidden direct-text activation closed when the provider reports invalid telemetry", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-runtime-invalid-telemetry",
      submitted: {
        kind: "text",
        value: "Using hydrogen for cars is more efficient than using electricity",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    };
    const ledgerId = "job-runtime-invalid-telemetry:ledger";
    const { context, activation } = activationFor({
      input,
      ledgerId,
      providerCall: async () => ({
        output: acceptedResult(input.submitted.value),
        telemetry: {
          providerId: "unknown",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
          durationMs: 1,
        },
      }),
    });

    const state = await runClaimUnderstandingRuntimeStage(input, context, { activation });

    expect(state).toMatchObject({
      inputSource: "direct_input",
      status: "runtime_dispatch_completed",
      result: {
        status: "damaged",
        damagedReason: "claim_understanding_unavailable",
      },
      cacheEligibility: "runtime_no_store",
    });
    expect(readClaimUnderstandingRuntimeArtifacts(ledgerId)[0]).toMatchObject({
      executionStatus: "completed",
      providerTelemetry: null,
      schemaOutcome: {
        status: "damaged",
        damagedReason: "claim_understanding_unavailable",
      },
    });
  });
});
