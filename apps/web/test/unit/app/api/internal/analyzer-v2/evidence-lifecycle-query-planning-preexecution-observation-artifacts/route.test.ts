import { afterEach, describe, expect, it } from "vitest";
import {
  EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION,
  clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts,
  recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink";
import type {
  EvidenceQueryPlanningPreexecutionObservation,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";

const originalEnv = { ...process.env };

function observation(): EvidenceQueryPlanningPreexecutionObservation {
  return {
    observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o",
    visibility: "internal_only",
    status: "structural_prerequisites_observed_not_executed_precutover",
    blockedReason: null,
    sourceIntakeStatus: "intake_ready",
    inputScope: "direct_text_claim_contract",
    selectedAtomicClaimCount: 1,
    sourceLanguageSignal: "present",
    taskPolicy: {
      queryPlanningPolicySignal: "hidden_task_policy_observed_not_invoked",
      productExecutionAuthority: "product_invocation_blocked_precutover",
    },
    execution: {
      queryPlanningExecuted: false,
      promptLoaded: false,
      promptRendered: false,
      modelCalled: false,
      providerCallbackCreated: false,
      providerSearchFetchCalled: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityCalled: false,
    },
  };
}

function seedArtifact(runId?: string) {
  const ledgerId = `${runId ?? "job-v2-x7o-route"}:precutover-observability`;
  clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId);
  recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact({
    ledgerId,
    runId: runId ?? "job-v2-x7o-route",
    createdUtc: "2026-05-17T03:30:00.000Z",
    observation: observation(),
  });
  return ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Query Planning pre-execution observation artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact("job-v2-x7o-route");
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${encodeURIComponent(ledgerId)}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_evidence_query_planning_preexecution_observation_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        preexecutionObservation: expect.objectContaining({
          status: "structural_prerequisites_observed_not_executed_precutover",
          sourceLanguageSignal: "present",
        }),
        productExecution: expect.objectContaining({
          queryPlanningRuntimeInvoked: false,
          modelCalled: false,
          sourceAcquisitionExecuted: false,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
        }),
      }),
    ]);
    expect(JSON.stringify(body)).not.toContain("route claim text");
    expect(JSON.stringify(body)).not.toContain("x7o-language-sentinel");
  });

  it("accepts the default timestamped V2 ledger id shape", async () => {
    const ledgerId = seedArtifact("job-v2-x7o-route.with.dot");
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${encodeURIComponent(ledgerId)}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(ledgerId).toContain(".");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      ledgerId,
      artifactCount: 1,
    });
  });

  it("requires configured admin authentication and rejects incorrect keys", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route"
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route"
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route"
    );
    const headers = { "x-admin-key": "test-admin-key" };
    const urls = [
      artifactUrl(""),
      artifactUrl("?ledgerId=%20"),
      artifactUrl("?ledgerId=bad/ledger"),
      artifactUrl(`?ledgerId=${"x".repeat(257)}`),
      artifactUrl("?ledgerId=a&ledgerId=b"),
      artifactUrl("?jobId=job-v2-x7o-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route"
    );
    const missingLedgerId = "missing-x7o-ledger";

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
