import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION,
  clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts,
  recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink";

const originalEnv = { ...process.env };

function context(runId = "job-v2-x7w4f-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T18:20:00.000Z"),
  });
}

function admissionDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_admitted_to_corpus_input_gate_closed",
    stopReason: "not_stopped",
    parent: {
      readinessDecisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
      readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      readinessStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    admittedCorpusAdmissionInputCount: 1,
    rejectedCorpusAdmissionInputCount: 0,
    corpusAdmissionInput: {
      inputVersion: "v2.evidence-lifecycle.evidence-corpus-admission-input.x7w4c",
      corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 90,
      sourceMaterialTextCharLength: 90,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
      truncationApplied: false,
      sourceMaterialRecordCount: 1,
      readinessDecisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
      readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      readinessStopReason: "not_stopped",
      downstreamExecution: {
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
    },
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
    extractionInput: null,
    downstreamGate: "evidence_corpus_construction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      sourceMaterialReadinessObserved: true,
      corpusAdmissionInputCreated: true,
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
  } as const;
}

function shellDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "evidence_corpus_shell_created_extraction_gate_closed",
    stopReason: "not_stopped",
    parent: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      admissionStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    evidenceCorpus: {
      shellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
      evidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      kind: "shell_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      sourceMaterialRefs: ["SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF"],
      locatorRefs: ["OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456"],
      candidatePreviewIds: ["SOURCE_CANDIDATE_PREVIEW_1_1"],
      providerIds: ["wikimedia_core"],
      sourceMaterialEndpointIds: ["ep_wikimedia_project_page_summary"],
      languageCodes: ["en"],
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
      sourceMaterialTextHashes: ["0".repeat(64)],
      aggregateSourceMaterialTextByteLength: 90,
      aggregateSourceMaterialTextCharLength: 90,
      admissionLineage: {
        admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
        admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
        admissionStopReason: "not_stopped",
        corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
      },
      readinessLineage: {
        readinessDecisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
        readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
        readinessStopReason: "not_stopped",
      },
      corpusTextAccess: "closed",
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
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
    evidenceItems: [],
    extractionInput: null,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      evidenceCorpusShellCreated: true,
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
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
  } as const;
}

function denialDecision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "extraction_denied_shell_only",
    stopReason: "shell_only_corpus",
    parent: {
      shellDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
      shellStatus: "evidence_corpus_shell_created_extraction_gate_closed",
      shellStopReason: "not_stopped",
      shellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
      evidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
    },
    parentAdmissionLineage: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
    },
    evidenceCorpusKind: "shell_only",
    corpusTextAccess: "closed",
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    extractionInput: null,
    evidenceItems: [],
    downstreamGate: "evidence_item_extraction_denied_shell_only",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      extractionReadinessDenied: true,
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
  } as const;
}

function seedArtifact(runId = "job-v2-x7w4f-route") {
  const runContext = context(runId);
  clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact({
    context: runContext,
    sourceMaterialAdmission: admissionDecision(),
    evidenceCorpusShell: shellDecision(),
    extractionReadinessDenial: denialDecision(),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal EvidenceCorpus observability artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_evidence_corpus_observability_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION,
        evidenceCorpusSourceMaterialAdmission: expect.objectContaining({
          status: "source_material_admitted_to_corpus_input_gate_closed",
          extractionInput: null,
          evidenceItems: [],
        }),
        evidenceCorpusShell: expect.objectContaining({
          status: "evidence_corpus_shell_created_extraction_gate_closed",
          evidenceCorpus: expect.objectContaining({
            kind: "shell_only",
            corpusTextAccess: "closed",
          }),
        }),
        evidenceCorpusExtractionReadinessDenial: expect.objectContaining({
          status: "extraction_denied_shell_only",
          extractionInput: null,
          evidenceItems: [],
        }),
        productExecution: expect.objectContaining({
          sourceTextAuthorized: false,
          extractionInputCreated: false,
          evidenceItemGenerated: false,
          parserExecuted: false,
          publicSurfaceWritten: false,
        }),
      }),
    ]);
    expect(serialized).not.toContain("Neutral source material text");
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("requires configured admin authentication and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route"
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
      artifactUrl("?jobId=job-v2-x7w4f-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=missing-x7w4f-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-x7w4f-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
