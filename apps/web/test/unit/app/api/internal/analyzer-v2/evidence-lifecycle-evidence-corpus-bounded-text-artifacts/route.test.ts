import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts,
  recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink";
import type {
  EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner";

const originalEnv = { ...process.env };
const TEXT = "Route-visible bounded corpus text must not appear in the default route projection.";

function context(runId = "job-v2-x7w4g-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T11:05:00.000Z"),
  });
}

function authorization(): EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision {
  const textByteLength = Buffer.byteLength(TEXT, "utf8");
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
    stopReason: "not_stopped",
    parent: {
      sourceMaterialVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
      sourceMaterialStatus: "source_material_page_summary_completed",
      sourceMaterialStopReason: "not_stopped",
      sourceMaterialRuntimeOwnership: "owned",
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      admissionStopReason: "not_stopped",
      admissionRuntimeOwnership: "owned",
      shellDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
      shellStatus: "evidence_corpus_shell_created_extraction_gate_closed",
      shellStopReason: "not_stopped",
      shellRuntimeOwnership: "owned",
      extractionDenialDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e",
      extractionDenialStatus: "extraction_denied_shell_only",
      extractionDenialStopReason: "shell_only_corpus",
    },
    sourceMaterialRecordCount: 1,
    boundedTextSidecarCount: 1,
    boundedTextSidecar: {
      sidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      boundedTextSidecarId: "EVIDENCE_CORPUS_BOUNDED_TEXT_0123456789ABCDEF",
      kind: "bounded_text_sidecar",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      linkedEvidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      linkedEvidenceCorpusShellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      textKind: "bounded_page_summary_extract_text",
      text: TEXT,
      textHash: "0".repeat(64),
      textByteLength,
      textCharLength: Array.from(TEXT).length,
      maxTextBytes: 4096,
      truncationApplied: false,
      sourceMaterialRecordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: textByteLength,
      sourceMaterialTextCharLength: Array.from(TEXT).length,
      sourceMaterialRuntimeOwned: true,
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      shellDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
      extractionDenialDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e",
      extractionDenialStatus: "extraction_denied_shell_only",
      corpusTextAccess: "internal_admin_only_bounded_text_sidecar",
      preservesShellOnlyCorpus: true,
      mutatesShellCorpus: false,
      mutatesExtractionDenial: false,
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      extractionInput: null,
      evidenceItems: [],
      downstreamExecution: {
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityCalled: false,
        evidenceItemGenerated: false,
        warningGenerated: false,
        reportGenerated: false,
        verdictGenerated: false,
        confidenceGenerated: false,
        publicSurfaceWritten: false,
      },
    },
    evidenceCorpus: null,
    extractionInput: null,
    evidenceItems: [],
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedCorpusTextAuthorized: true,
      boundedTextSidecarCreated: true,
      sourceMaterialRuntimeOwned: true,
      corpusAdmissionObserved: true,
      evidenceCorpusShellObserved: true,
      extractionReadinessDenialObserved: true,
      sourceTextAuthorized: false,
      extractionInputCreated: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  };
}

function seedArtifact(runId = "job-v2-x7w4g-route") {
  const runContext = context(runId);
  clearEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact({
    context: runContext,
    boundedTextAuthorization: authorization(),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal EvidenceCorpus bounded-text artifact route", () => {
  it("returns hash/length/provenance-only default artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_evidence_corpus_bounded_text_artifact_ledger",
      defaultProjection: "hash_length_provenance_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    const sidecar = body.artifacts[0].boundedTextAuthorization.boundedTextSidecar;
    expect(sidecar).toMatchObject({
      textHash: "0".repeat(64),
      textByteLength: Buffer.byteLength(TEXT, "utf8"),
      sourceMaterialTextHash: "0".repeat(64),
      textAccess: "redacted_default_hash_length_provenance_only",
      textReturned: false,
      mutatesShellCorpus: false,
      mutatesExtractionDenial: false,
    });
    expect(Object.prototype.hasOwnProperty.call(sidecar, "text")).toBe(false);
    expect(serialized).not.toContain(TEXT);
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("requires admin authentication and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route"
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
      artifactUrl("?ledgerId=ledger&includeText=true"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=missing-x7w4g-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-x7w4g-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
