import { afterEach, describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
  clearClaimUnderstandingRuntimeArtifacts,
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
  type ClaimUnderstandingRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

const originalEnv = { ...process.env };

function artifact(ledgerId: string): ClaimUnderstandingRuntimeArtifact {
  return {
    artifactVersion: CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION,
    artifactId: "artifact-route-test",
    ledgerId,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    runId: "job-route-test",
    inputSource: "direct_input",
    executionStatus: "completed",
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    activationSnapshotHash: "activation-hash",
    configSnapshotHash: "config-hash",
    promptContentHash: "prompt-hash",
    renderedPromptHash: "rendered-hash",
    providerTelemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      durationMs: 250,
    },
    schemaOutcome: {
      status: "accepted",
      blockedReason: null,
      damagedReason: null,
    },
    failureState: {
      blockedReason: null,
      failureMessage: null,
    },
    cacheDecision: {
      reason: "runtime_no_store",
      canRead: false,
      canWrite: false,
    },
    warningMateriality: "admin_only_internal",
  };
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Claim Understanding runtime artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = "job-route-test:precutover-observability";
    clearClaimUnderstandingRuntimeArtifacts(ledgerId);
    const sink = createClaimUnderstandingRuntimeInMemoryArtifactSink(ledgerId);
    await sink.record(artifact(ledgerId));

    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route");
    const response = await GET(new Request(
      `http://localhost/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=${encodeURIComponent(ledgerId)}`,
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_observability_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        warningMateriality: "admin_only_internal",
        cacheDecision: {
          reason: "runtime_no_store",
          canRead: false,
          canWrite: false,
        },
      }),
    ]);
  });

  it("requires admin authentication", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route");
    const response = await GET(new Request(
      "http://localhost/api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=ledger",
    ));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("requires a ledger id", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route");
    const response = await GET(new Request(
      "http://localhost/api/internal/analyzer-v2/claim-understanding-runtime-artifacts",
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: "Missing ledgerId" });
  });
});
