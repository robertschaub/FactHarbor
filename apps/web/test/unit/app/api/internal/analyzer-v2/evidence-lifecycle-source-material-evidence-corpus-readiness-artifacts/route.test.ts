import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner";
import {
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts,
  recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink";

const originalEnv = { ...process.env };

function context(runId = "job-v2-x7w4a-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T13:30:00.000Z"),
  });
}

function readinessDecision(): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
    stopReason: "not_stopped",
    parent: {
      w2Status: "candidate_provider_network_completed",
      w3aStatus: "source_candidate_preview_materialized",
      w3bStatus: "source_material_page_summary_completed",
      w3bVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
      w3bStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    admittedSourceMaterialRecordCount: 1,
    rejectedSourceMaterialRecordCount: 0,
    sourceMaterialRecord: {
      sourceMaterialId: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 90,
      sourceMaterialTextCharLength: 90,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
    },
    extractionInput: null,
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
    productExecution: {
      sourceMaterialReadinessObserved: true,
      sourceMaterialCreated: true,
      evidenceCorpusBuildAuthorized: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    downstreamGate: "evidence_corpus_build_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function seedArtifact(runId = "job-v2-x7w4a-route") {
  const runContext = context(runId);
  clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
    runContext.observabilityLedger.ledgerId,
  );
  recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
    context: runContext,
    readinessDecision: readinessDecision(),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Source Material EvidenceCorpus readiness artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_source_material_evidence_corpus_readiness_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION,
        sourceMaterialEvidenceCorpusReadiness: expect.objectContaining({
          status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
          evidenceCorpus: null,
          evidenceCorpusBuildAuthorized: false,
        }),
        productExecution: expect.objectContaining({
          sourceMaterialReadinessObserved: true,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("requires configured admin authentication and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts/route"
    );

    for (const request of [
      new Request(artifactUrl("?ledgerId=ledger")),
      new Request(artifactUrl("?ledgerId=ledger"), { headers: { "x-admin-key": "wrong-key" } }),
    ]) {
      const response = await GET(request);
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    }

    const headers = { "x-admin-key": "test-admin-key" };
    for (const url of [
      artifactUrl(""),
      artifactUrl("?ledgerId=%20"),
      artifactUrl("?ledgerId=bad/ledger"),
      artifactUrl(`?ledgerId=${"x".repeat(257)}`),
      artifactUrl("?ledgerId=a&ledgerId=b"),
      artifactUrl("?jobId=job-v2-x7w4a-route"),
    ]) {
      const response = await GET(new Request(url, { headers }));
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Missing or invalid ledgerId" });
    }
  });

  it("returns bounded not-found without echoing the requested ledger id", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-evidence-corpus-readiness-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=missing-x7w4a-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-x7w4a-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
