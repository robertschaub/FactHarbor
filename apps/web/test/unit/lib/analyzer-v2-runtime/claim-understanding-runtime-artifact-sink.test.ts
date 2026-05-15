import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
  clearClaimUnderstandingRuntimeArtifacts,
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
  readClaimUnderstandingRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

describe("Analyzer V2 Claim Understanding runtime artifact sink", () => {
  it("records hidden runtime artifacts in an internal observability ledger without public pointers", async () => {
    const ledgerId = "job-artifact:precutover-observability";
    clearClaimUnderstandingRuntimeArtifacts(ledgerId);
    const sink = createClaimUnderstandingRuntimeInMemoryArtifactSink(ledgerId);

    await sink.record({
      artifactVersion: CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
      artifactId: "artifact-1",
      ledgerId,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      runId: "job-artifact",
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
      cacheDecision: null,
      warningMateriality: "admin_only_internal",
    });

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
});
