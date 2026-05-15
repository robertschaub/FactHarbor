import { describe, expect, it, vi } from "vitest";
import {
  buildClaimUnderstandingRuntimeActivation,
  CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import {
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";
import {
  buildClaimBoundaryV2RunContext,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import type { ClaimUnderstandingProviderRuntimeConfigSnapshot } from "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract";

function buildContext(
  overrides: Partial<PipelineRunContext["claimUnderstandingRuntimeActivation"]> = {},
): PipelineRunContext {
  const context = buildClaimBoundaryV2RunContext(
    {
      runIdHint: "job-runtime-activation",
      submitted: {
        kind: "text",
        value: "Plastic recycling is pointless",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    },
    {
      now: () => new Date("2026-05-15T01:00:00.000Z"),
    },
  );

  return {
    ...context,
    claimUnderstandingRuntimeActivation: {
      ...context.claimUnderstandingRuntimeActivation,
      ...overrides,
    },
  };
}

describe("Analyzer V2 Claim Understanding runtime activation owner", () => {
  it("defaults closed without constructing an executable gateway or provider callback", () => {
    const artifactSink = createClaimUnderstandingRuntimeInMemoryArtifactSink("job-runtime-activation:ledger");
    const providerFactoryBuilder = vi.fn();
    const activation = buildClaimUnderstandingRuntimeActivation(buildContext(), {
      artifactSink,
      providerFactoryBuilder,
    });

    expect(activation).toMatchObject({
      activationVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_OWNER_VERSION,
      status: "disabled",
      disabledReason: "kill_switch_closed",
      gatewayTask: null,
      providerBoundary: null,
      sideEffects: {
        executableGatewayConstructed: false,
        providerFactoryInvoked: false,
        providerCallbackCreated: false,
        approvalMutated: false,
        cacheIo: false,
      },
    });
    expect(providerFactoryBuilder).not.toHaveBeenCalled();
  });

  it("builds hidden direct-text activation from a frozen run-context snapshot", async () => {
    const artifactSink = createClaimUnderstandingRuntimeInMemoryArtifactSink("job-runtime-activation:enabled");
    const providerCall = vi.fn(async () => ({
      output: { status: "blocked" },
      telemetry: {
        providerId: "anthropic",
        modelId: "claude-haiku-4-5-20251001",
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        durationMs: 10,
      },
    }));
    const providerFactoryBuilder = vi.fn((snapshot: ClaimUnderstandingProviderRuntimeConfigSnapshot) => ({
      factoryVersion: "v2.claim-understanding.provider-factory.0" as const,
      factorySourcePath: "apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts" as const,
      configSnapshotHash: snapshot.configSnapshotHash,
      providerId: "anthropic" as const,
      modelId: snapshot.modelId,
      providerCall,
    }));
    const context = buildContext({
      status: "enabled_hidden_direct_text",
    });

    const activation = buildClaimUnderstandingRuntimeActivation(context, {
      artifactSink,
      providerFactoryBuilder,
    });

    expect(activation.status).toBe("enabled");
    expect(activation.gatewayTask?.status).toBe("executable");
    expect(activation.gatewayTask?.promptPolicy?.approval.status).toBe("approved");
    expect(activation.runtimeConfigSnapshot).toMatchObject({
      source: "v2_task_policy_snapshot",
      gatewayTaskId: "claim_understanding_gate1",
      executionState: "product_activation_wired_hidden_direct_text",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: context.claimUnderstandingRuntimeActivation.configProfileHash,
      outputContract: {
        cacheIo: "forbidden",
        publicSurface: "internal_only",
      },
    });
    expect(activation.providerBoundary?.providerCall).toBe(providerCall);
    expect(activation.sideEffects).toEqual({
      executableGatewayConstructed: true,
      providerFactoryInvoked: true,
      providerCallbackCreated: true,
      approvalMutated: false,
      cacheIo: false,
    });
    expect(providerFactoryBuilder).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the activation snapshot is invalid or the provider factory is unavailable", () => {
    const invalid = buildClaimUnderstandingRuntimeActivation(buildContext({
      status: "enabled_hidden_direct_text",
      activationSnapshotHash: "",
    }));

    expect(invalid).toMatchObject({
      status: "disabled",
      disabledReason: "activation_snapshot_invalid",
    });

    const factoryFailure = buildClaimUnderstandingRuntimeActivation(buildContext({
      status: "enabled_hidden_direct_text",
    }), {
      providerFactoryBuilder: () => {
        throw new Error("factory unavailable");
      },
    });

    expect(factoryFailure).toMatchObject({
      status: "disabled",
      disabledReason: "provider_factory_unavailable",
      failureMessage: "factory unavailable",
    });
  });
});
