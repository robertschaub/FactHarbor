import { describe, expect, it, vi } from "vitest";
import {
  CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT,
  CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
  clearClaimUnderstandingRuntimeArtifacts,
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
  readClaimUnderstandingRuntimeArtifacts,
  type ClaimUnderstandingRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

function artifact(
  ledgerId: string,
  artifactId: string,
): ClaimUnderstandingRuntimeArtifact {
  return {
    artifactVersion: CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
    artifactId,
    ledgerId,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    runId: artifactId,
    inputSource: "direct_input",
    executionStatus: "blocked",
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "not_constructed",
    activationSnapshotHash: "activation-hash",
    configSnapshotHash: null,
    promptContentHash: null,
    renderedPromptHash: null,
    providerTelemetry: null,
    schemaOutcome: {
      status: "not_attempted",
      blockedReason: null,
      damagedReason: null,
    },
    failureState: {
      blockedReason: "runtime_activation_disabled",
      failureMessage: null,
    },
    adapterAttemptDiagnostics: [],
    cacheDecision: null,
    warningMateriality: "admin_only_internal",
  };
}

describe("Analyzer V2 Claim Understanding runtime artifact sink", () => {
  it("records hidden runtime artifacts in an internal observability ledger without public pointers", async () => {
    const ledgerId = "job-artifact:precutover-observability";
    clearClaimUnderstandingRuntimeArtifacts(ledgerId);
    const sink = createClaimUnderstandingRuntimeInMemoryArtifactSink(ledgerId);

    await sink.record(artifact(ledgerId, "artifact-1"));

    expect(sink).toMatchObject({
      sinkKind: "v2_observability_ledger",
      ledgerId,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
    expect(readClaimUnderstandingRuntimeArtifacts(ledgerId)).toEqual([
      expect.objectContaining({
        artifactVersion: CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        warningMateriality: "admin_only_internal",
      }),
    ]);
  });

  it("keeps the internal ledger visible across module reloads in the same process", async () => {
    const ledgerId = "job-artifact:module-reload";
    clearClaimUnderstandingRuntimeArtifacts(ledgerId);
    const sink = createClaimUnderstandingRuntimeInMemoryArtifactSink(ledgerId);

    await sink.record(artifact(ledgerId, "artifact-reloaded"));
    vi.resetModules();
    const reloaded = await import("@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink");

    expect(reloaded.readClaimUnderstandingRuntimeArtifacts(ledgerId)).toEqual([
      expect.objectContaining({
        artifactId: "artifact-reloaded",
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
      }),
    ]);
    reloaded.clearClaimUnderstandingRuntimeArtifacts(ledgerId);
  });

  it("keeps the temporary in-memory ledger store bounded", async () => {
    const ledgerId = "job-artifact:bounded-ledger";
    clearClaimUnderstandingRuntimeArtifacts(ledgerId);
    const sink = createClaimUnderstandingRuntimeInMemoryArtifactSink(ledgerId);

    for (let index = 0; index <= CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      await sink.record(artifact(ledgerId, `artifact-${index}`));
    }

    expect(readClaimUnderstandingRuntimeArtifacts(ledgerId)).toHaveLength(
      CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER,
    );
    expect(readClaimUnderstandingRuntimeArtifacts(ledgerId)[0]?.artifactId).toBe("artifact-1");
  });

  it("evicts the oldest retained ledger instead of growing unbounded across runs", async () => {
    const baseLedgerId = "job-artifact:bounded-store";

    for (let index = 0; index <= CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      const ledgerId = `${baseLedgerId}:${index}`;
      clearClaimUnderstandingRuntimeArtifacts(ledgerId);
      const sink = createClaimUnderstandingRuntimeInMemoryArtifactSink(ledgerId);
      await sink.record(artifact(ledgerId, `artifact-${index}`));
    }

    expect(readClaimUnderstandingRuntimeArtifacts(`${baseLedgerId}:0`)).toEqual([]);
    expect(readClaimUnderstandingRuntimeArtifacts(
      `${baseLedgerId}:${CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT}`,
    )).toEqual([
      expect.objectContaining({
        artifactId: `artifact-${CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT}`,
      }),
    ]);
  });
});
