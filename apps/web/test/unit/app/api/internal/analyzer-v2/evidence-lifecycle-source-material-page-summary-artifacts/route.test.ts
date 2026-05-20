import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";
import {
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts,
  recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink";

const originalEnv = { ...process.env };

function context(runId = "job-v2-x7w3b-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T11:30:00.000Z"),
  });
}

function decision(): EvidenceLifecycleSourceMaterialPageSummaryDecision {
  const sourceMaterialText = "Hydrogen vehicles use hydrogen to power an electric motor.";
  return {
    sourceMaterialVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_page_summary_completed",
    stopReason: "not_stopped",
    candidateProviderNetworkStatus: "candidate_provider_network_completed",
    sourceCandidatePreviewStatus: "source_candidate_preview_materialized",
    sourceCandidatePreviewRecordCount: 1,
    materializedPreviewRecordCount: 1,
    attemptedFetchCount: 1,
    sourceMaterialRecordCount: 1,
    fetchDiagnosticCount: 0,
    sourceMaterialRecords: [
      {
        recordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
        sourceMaterialId: "SOURCE_MATERIAL_PAGE_SUMMARY_TEST",
        locatorRef: "OPAQUE_SOURCE_LOCATOR_TEST",
        candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_TEST",
        providerId: "wikimedia_core",
        sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
        languageCode: "en",
        sourceMaterialKind: "wikimedia_page_summary_extract_text",
        sourceMaterialText,
        sourceMaterialTextHash: "0".repeat(64),
        sourceMaterialTextByteLength: Buffer.byteLength(sourceMaterialText, "utf8"),
        sourceMaterialTextCharLength: Array.from(sourceMaterialText).length,
        truncationApplied: false,
        responseStatusCategory: "success_2xx",
        contentTypeCategory: "accepted_json",
        compressedBytes: 120,
        decompressedBytes: 120,
        durationMs: 40,
        timeoutMs: 1500,
        publicPointerExposure: "forbidden",
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
    ],
    fetchDiagnostics: [],
    sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
    locatorVersion: "v2.evidence-lifecycle.source-material.page-summary-fetch-locator.x7w3b",
    extractionInput: null,
    evidenceCorpus: null,
    evidenceItems: [],
    productExecution: {
      candidateProviderNetworkObserved: true,
      sourceCandidatePreviewObserved: true,
      extraHttpCallMade: true,
      contentDereferenceCalled: true,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: true,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    downstreamGate: "source_material_to_evidence_corpus_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function seedArtifact(runId = "job-v2-x7w3b-route") {
  const runContext = context(runId);
  clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
    context: runContext,
    decision: decision(),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal page-summary Source Material artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_source_material_page_summary_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "hash_length_provenance_only",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION,
        sourceMaterialPageSummary: expect.objectContaining({
          status: "source_material_page_summary_completed",
          evidenceCorpus: null,
        }),
        productExecution: expect.objectContaining({
          extraHttpCallMade: true,
          contentDereferenceCalled: true,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(serialized).not.toContain("sourceMaterialText\":\"");
    expect(serialized).not.toContain("Hydrogen vehicles use hydrogen");
    expect(body.artifacts[0].sourceMaterialPageSummary.sourceMaterialRecords[0]).toMatchObject({
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 58,
      sourceMaterialTextCharLength: 58,
      sourceMaterialTextReturned: false,
    });
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("cacheKey");
  });

  it("requires configured admin authentication and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route"
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
      artifactUrl("?jobId=job-v2-x7w3b-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=missing-x7w3b-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-x7w3b-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
