import { afterEach, describe, expect, it } from "vitest";
import type {
  SourceAcquisitionIntakeBoundaryDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts,
  recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink";

const originalEnv = { ...process.env };

function intakeBoundary(): SourceAcquisitionIntakeBoundaryDecision {
  return {
    boundaryVersion: "v2.evidence-lifecycle.source-acquisition-intake-boundary.x7v",
    visibility: "internal_only",
    status: "intake_ready_not_executable",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    executionScope: "not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 3,
    retrievalPolicyCount: 5,
    sourceLanguageSignal: "present",
    executionPosture: {
      sourceExecutionAuthority: "blocked_precutover",
      providerNetworkAuthority: "not_authorized",
      parserAuthority: "not_authorized",
      publicExposure: "forbidden",
    },
    execution: {
      sourceAcquisitionExecuted: false,
      providerNetworkExecuted: false,
      searchFetchCalled: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
    },
  };
}

function seedArtifact(runId = "job-v2-x7v-route") {
  const context = buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-17T14:20:00.000Z"),
  });
  clearEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId);
  recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
    context,
    intakeBoundary: intakeBoundary(),
  });
  return context.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Source Acquisition intake artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_source_acquisition_intake_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_INTAKE_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        sourceAcquisitionIntake: expect.objectContaining({
          status: "intake_ready_not_executable",
          queryEntryCount: 3,
          sourceLanguageSignal: "present",
        }),
        productExecution: expect.objectContaining({
          sourceAcquisitionIntakeObserved: true,
          sourceAcquisitionExecuted: false,
          providerNetworkExecuted: false,
          searchFetchCalled: false,
          contentDereferenceCalled: false,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(JSON.stringify(body)).not.toContain("Mehr als 235");
    expect(JSON.stringify(body)).not.toContain("Asylbereich Schweiz Statistik");
  });

  it("accepts the default timestamped V2 ledger id shape", async () => {
    const ledgerId = seedArtifact("job-v2-x7v-route.with.dot");
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route"
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route"
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route"
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route"
    );
    const headers = { "x-admin-key": "test-admin-key" };
    const urls = [
      artifactUrl(""),
      artifactUrl("?ledgerId=%20"),
      artifactUrl("?ledgerId=bad/ledger"),
      artifactUrl(`?ledgerId=${"x".repeat(257)}`),
      artifactUrl("?ledgerId=a&ledgerId=b"),
      artifactUrl("?jobId=job-v2-x7v-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route"
    );
    const missingLedgerId = "missing-x7v-ledger";

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
