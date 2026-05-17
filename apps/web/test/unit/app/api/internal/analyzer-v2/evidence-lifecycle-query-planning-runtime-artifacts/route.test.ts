import { afterEach, describe, expect, it } from "vitest";
import {
  clearEvidenceQueryPlanningRuntimeArtifacts,
  recordEvidenceQueryPlanningRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type { EvidenceQueryPlanningRuntimeResult } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import { buildEvidenceQueryPlanningInspection } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import { buildQueryPlanSourceAcquisitionHandoff } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";

const originalEnv = { ...process.env };

function runtimeResult(): EvidenceQueryPlanningRuntimeResult {
  return {
    runtimeVersion: "v2.evidence-query-planning.runtime.0",
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    result: {
      schemaVersion: "v2.evidence_query_planning_result.0",
      taskKey: "evidence_query_planning",
      status: "damaged",
      queryPlan: null,
      integrityEvents: [
        {
          type: "schema_validation_failed",
          severity: "error",
          message: "schema invalid",
          references: ["evidence_query_planning"],
        },
      ],
      blockedReason: null,
      damagedReason: "schema_validation_failed",
    },
    promptProvenance: {
      promptContentHash: "p".repeat(64),
      renderedPromptHash: "r".repeat(64),
      configSnapshotHash: "c".repeat(64),
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
    },
    cacheDecision: {
      namespace: "analyzer-v2:query",
      canRead: false,
      canWrite: false,
      reason: "no_store_runtime_dispatch_safety",
      missingDimensions: [],
      keyParts: [],
    },
    adapterOutcome: {
      executionStatus: "completed",
      blockedReason: null,
      result: {
        schemaVersion: "v2.evidence_query_planning_result.0",
        taskKey: "evidence_query_planning",
        status: "damaged",
        queryPlan: null,
        integrityEvents: [
          {
            type: "schema_validation_failed",
            severity: "error",
            message: "schema invalid",
            references: ["evidence_query_planning"],
          },
        ],
        blockedReason: null,
        damagedReason: "schema_validation_failed",
      },
      attempts: [
        {
          attemptNumber: 1,
          promptContentHash: "p".repeat(64),
          status: "invalid_schema",
          providerTelemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            durationMs: 30,
          },
          failureMessage: "schema invalid",
        },
      ],
      telemetry: {
        adapterVersion: "v2.evidence-query-planning.model-adapter.0",
        promptContentHash: "p".repeat(64),
        configSnapshotHash: "c".repeat(64),
        outputSchemaVersion: "v2.evidence_query_planning_result.0",
        gatewayTaskId: "evidence_query_planning",
        modelPolicyId: "v2.model.evidence_query_planning.0",
        providerId: "anthropic",
        modelId: "claude-haiku-4-5-20251001",
        retryCount: 0,
        tokenUsage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        durationMs: 30,
        cacheDecision: {
          namespace: "analyzer-v2:query",
          canRead: false,
          canWrite: false,
          reason: "no_store_runtime_dispatch_safety",
          missingDimensions: [],
          keyParts: [],
        },
        cacheAccess: {
          readAttempted: false,
          writeAttempted: false,
        },
      },
    },
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
      providerSdkLoaded: false,
      searchFetchCalled: false,
      sourceReliabilityCalled: false,
      publicSurfaceWritten: false,
    },
  };
}

function seedArtifact(runId = "job-v2-x7s-route"): string {
  const runContext = buildClaimBoundaryV2RunContext(
    {
      runIdHint: runId,
      submitted: {
        kind: "text",
        value: "Using hydrogen for cars is more efficient than using electricity",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: ["AC_001"],
    },
    {
      now: () => new Date("2026-05-17T12:30:00.000Z"),
      queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
    },
  );
  const result = runtimeResult();
  const inspection = buildEvidenceQueryPlanningInspection({
    runtimeResult: result,
    selectedAtomicClaimIds: ["AC_001"],
    selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
  });
  const handoff = buildQueryPlanSourceAcquisitionHandoff({
    runtimeResult: result,
    selectedAtomicClaimIds: ["AC_001"],
    selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
  });

  clearEvidenceQueryPlanningRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordEvidenceQueryPlanningRuntimeArtifact({
    context: runContext,
    runtimeResult: result,
    inspection,
    sourceAcquisitionHandoff: handoff,
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Query Planning runtime artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${encodeURIComponent(ledgerId)}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_evidence_query_planning_runtime_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        adapterAttemptDiagnostics: [
          expect.objectContaining({
            attemptNumber: 1,
            status: "invalid_schema",
            failureCategory: "schema_validation",
            issueCount: 1,
            issues: [
              {
                path: "",
                code: "invalid_schema",
                message: "schema invalid",
              },
            ],
          }),
        ],
      }),
    ]);
    expect(serialized).not.toContain("Evidence Query Planning prompt bytes");
    expect(serialized).not.toContain("Using hydrogen");
  });

  it("requires configured admin authentication and rejects incorrect keys", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route"
    );

    for (const request of [
      new Request(artifactUrl("?ledgerId=ledger")),
      new Request(artifactUrl("?ledgerId=ledger"), { headers: { "x-admin-key": "wrong-key" } }),
    ]) {
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(body).toEqual({ ok: false, error: "Unauthorized" });
    }
  });

  it("rejects production requests when FH_ADMIN_KEY is missing", async () => {
    delete process.env.FH_ADMIN_KEY;
    process.env.NODE_ENV = "production";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=ledger"),
      { headers: { "x-admin-key": "anything" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("rejects missing, blank, malformed, overlong, duplicate, and enumerating ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route"
    );
    const headers = { "x-admin-key": "test-admin-key" };
    const urls = [
      artifactUrl(""),
      artifactUrl("?ledgerId=%20"),
      artifactUrl("?ledgerId=%20ledger"),
      artifactUrl("?ledgerId=bad/ledger"),
      artifactUrl(`?ledgerId=${"x".repeat(257)}`),
      artifactUrl("?ledgerId=a&ledgerId=b"),
      artifactUrl("?jobId=job-v2-x7s-route"),
      artifactUrl("?prefix=job"),
    ];

    for (const url of urls) {
      const response = await GET(new Request(url, { headers }));
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Missing or invalid ledgerId" });
    }
  });

  it("returns a bounded not-found response without echoing the requested ledger id", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route"
    );
    const missingLedgerId = "missing-x7s-ledger";

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${missingLedgerId}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain(missingLedgerId);
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
