import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusSourceMaterialReadiness,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";
import {
  isEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision,
  markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision,
  readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-provenance";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSourceMaterialPageSummary() {
  const text = "Neutral source material text for readiness provenance testing.";
  const hash = sha256Text(text);
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
    fetchDiagnosticCount: 1,
    sourceMaterialRecords: [
      {
        recordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
        sourceMaterialId: `SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`,
        locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
        candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
        providerId: "wikimedia_core",
        sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
        languageCode: "en",
        sourceMaterialKind: "wikimedia_page_summary_extract_text",
        sourceMaterialText: text,
        sourceMaterialTextHash: hash,
        sourceMaterialTextByteLength: Buffer.byteLength(text, "utf8"),
        sourceMaterialTextCharLength: Array.from(text).length,
        truncationApplied: false,
        responseStatusCategory: "success_2xx",
        contentTypeCategory: "accepted_json",
        compressedBytes: 90,
        decompressedBytes: 90,
        durationMs: 11,
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
    fetchDiagnostics: [
      {
        diagnosticVersion: "v2.evidence-lifecycle.source-material.page-summary-transport.x7w3b",
        visibility: "internal_admin_only",
        attemptOrdinal: 1,
        locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
        sourceMaterialRef: null,
        providerId: "wikimedia_core",
        endpointId: "ep_wikimedia_project_page_summary",
        status: "success",
        stopReason: "not_stopped",
        durationMs: 11,
        timeoutMs: 1500,
        dnsAddressCount: 1,
        selectedAddressFamily: "ipv4",
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCategory: "success_2xx",
        contentTypeCategory: "accepted_json",
        compressedBytes: 90,
        decompressedBytes: 90,
        byteCapState: "within_cap",
        truncationApplied: false,
        rawPayloadIncluded: false,
        secretIncluded: false,
        publicPayloadIncluded: false,
        errorTraceIncluded: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityTouched: false,
      },
    ],
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

function readiness() {
  return buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: validSourceMaterialPageSummary(),
    runtimeOwned: true,
  });
}

describe("Analyzer V2 W4-A readiness runtime provenance", () => {
  it("marks and reads only the original W4-A readiness decision object", () => {
    const decision = markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(readiness());

    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(decision)).toBe(decision);
    expect(isEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(decision)).toBe(true);
    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(null)).toBeNull();
    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(JSON.parse(JSON.stringify(decision))))
      .toBeNull();
    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(structuredClone(decision)))
      .toBeNull();
    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision({ ...decision })).toBeNull();
  });

  it("rejects post-mark mutation and malformed readiness-shaped objects", () => {
    const decision = markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(readiness());
    (decision as { stopReason: string }).stopReason = "structural_exception";

    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(decision)).toBeNull();

    const malformed = markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(readiness());
    (malformed as unknown as Record<string, unknown>).extra = "not_allowed";
    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(malformed)).toBeNull();
  });
});
