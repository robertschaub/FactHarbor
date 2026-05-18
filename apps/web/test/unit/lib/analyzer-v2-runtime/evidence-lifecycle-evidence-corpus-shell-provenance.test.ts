import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusShell,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell";
import {
  buildEvidenceCorpusSourceMaterialAdmission,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";
import {
  buildEvidenceCorpusSourceMaterialReadiness,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";
import {
  inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership,
  isEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
  markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
  readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-provenance";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSourceMaterialPageSummary() {
  const text = "Neutral source material text for shell provenance testing.";
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

function shellDecision() {
  const readiness = buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: validSourceMaterialPageSummary(),
    runtimeOwned: true,
  });
  const admission = buildEvidenceCorpusSourceMaterialAdmission({
    sourceMaterialReadiness: readiness,
    runtimeOwned: true,
  });
  return buildEvidenceCorpusShell({
    sourceMaterialAdmission: admission,
    runtimeOwnership: "owned",
  });
}

describe("Analyzer V2 W4-D shell runtime provenance", () => {
  it("marks and reads only the original W4-D shell decision object", () => {
    const decision = markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(shellDecision());

    expect(readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(decision)).toBe(decision);
    expect(isEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(decision)).toBe(true);
    expect(inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(decision)).toBe("owned");
    expect(readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(null)).toBeNull();
    expect(readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(JSON.parse(JSON.stringify(decision))))
      .toBeNull();
    expect(readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(structuredClone(decision))).toBeNull();
    expect(readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision({ ...decision })).toBeNull();
  });

  it("distinguishes post-mark mutation from never-owned shell decisions", () => {
    const decision = markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(shellDecision());
    (decision as { stopReason: string }).stopReason = "structural_exception";

    expect(inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(decision))
      .toBe("mutated_after_provenance");
    expect(readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(decision)).toBeNull();
    expect(inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(shellDecision())).toBe("not_owned");
  });
});
