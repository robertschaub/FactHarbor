import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusShell,
  EVIDENCE_CORPUS_SHELL_DECISION_VERSION,
  EVIDENCE_CORPUS_SHELL_VERSION,
  isEvidenceCorpusShellExtractionReady,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell";
import {
  buildEvidenceCorpusSourceMaterialAdmission,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";
import {
  buildEvidenceCorpusSourceMaterialReadiness,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSourceMaterialText() {
  return "Neutral source material text for shell testing.";
}

function validSourceMaterialPageSummary(overrides: Record<string, unknown> = {}) {
  const text = validSourceMaterialText();
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
    ...overrides,
  };
}

function validAdmission() {
  const readiness = buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: validSourceMaterialPageSummary(),
    runtimeOwned: true,
  });
  return buildEvidenceCorpusSourceMaterialAdmission({
    sourceMaterialReadiness: readiness,
    runtimeOwned: true,
  });
}

function shell(sourceMaterialAdmission: unknown, runtimeOwnership: "owned" | "not_owned" | "mutated_after_provenance" = "owned") {
  return buildEvidenceCorpusShell({ sourceMaterialAdmission, runtimeOwnership });
}

function withAdmissionInput(admission: ReturnType<typeof validAdmission>, inputOverrides: Record<string, unknown>) {
  return {
    ...admission,
    corpusAdmissionInput: {
      ...(admission.corpusAdmissionInput as Record<string, unknown>),
      ...inputOverrides,
    },
  };
}

describe("Analyzer V2 W4-D EvidenceCorpus shell core", () => {
  it("creates a text-free shell from W4-C admission while keeping extraction closed", () => {
    const admission = validAdmission();
    const result = shell(admission);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      decisionVersion: EVIDENCE_CORPUS_SHELL_DECISION_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      status: "evidence_corpus_shell_created_extraction_gate_closed",
      stopReason: "not_stopped",
      sourceMaterialRecordCount: 1,
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
    });
    expect(result.evidenceCorpus).toMatchObject({
      shellVersion: EVIDENCE_CORPUS_SHELL_VERSION,
      kind: "shell_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      sourceMaterialRefs: [admission.corpusAdmissionInput?.sourceMaterialRef],
      locatorRefs: [admission.corpusAdmissionInput?.locatorRef],
      providerIds: ["wikimedia_core"],
      languageCodes: ["en"],
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
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
    });
    expect(isEvidenceCorpusShellExtractionReady(result.evidenceCorpus)).toBe(false);
    expect(serialized).not.toContain(validSourceMaterialText());
    expect(serialized).not.toContain("sourceMaterialText\":\"");
    expect(serialized).not.toContain("truthPercentage");
    expect(serialized).not.toContain("reportMarkdown");
  });

  it("blocks absent, non-W4-C, non-owned, and post-mark-mutated admissions", () => {
    const admission = validAdmission();
    const cases = [
      [shell(null), "blocked_pre_evidence_corpus_admission_absent", "w4c_not_completed"],
      [shell(validSourceMaterialPageSummary()), "blocked_pre_evidence_corpus_admission_absent", "w4c_not_completed"],
      [
        shell(JSON.parse(JSON.stringify(admission)), "not_owned"),
        "blocked_pre_evidence_corpus_admission_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        shell(admission, "mutated_after_provenance"),
        "blocked_pre_evidence_corpus_admission_mutated_after_provenance",
        "admission_post_mark_mutated",
      ],
    ];

    for (const [result, status, stopReason] of cases) {
      expect(result).toMatchObject({
        status,
        stopReason,
        evidenceCorpus: null,
        evidenceItems: [],
        extractionInput: null,
        evidenceItemExtractionAuthorized: false,
      });
    }
  });

  it("blocks invalid admission status, lineage, metadata, hash, length, leakage, and downstream execution", () => {
    const admission = validAdmission();
    const cases = [
      [
        { ...admission, status: "blocked_pre_evidence_corpus_readiness_absent" },
        "blocked_pre_evidence_corpus_admission_not_admissible",
        "w4c_admission_not_positive",
      ],
      [
        { ...admission, sourceMaterialRecordCount: 2 },
        "blocked_pre_evidence_corpus_source_material_record_count_unsupported",
        "source_material_record_count_unsupported",
      ],
      [
        withAdmissionInput(admission, { readinessStatus: "blocked" }),
        "blocked_pre_evidence_corpus_readiness_lineage_invalid",
        "readiness_lineage_inconsistent",
      ],
      [
        withAdmissionInput(admission, { providerId: "" }),
        "blocked_pre_evidence_corpus_source_material_metadata_incomplete",
        "source_material_metadata_incomplete",
      ],
      [
        withAdmissionInput(admission, { sourceMaterialTextHash: "" }),
        "blocked_pre_evidence_corpus_source_material_hash_invalid",
        "source_material_hash_missing",
      ],
      [
        withAdmissionInput(admission, { sourceMaterialTextHash: "not-a-hash" }),
        "blocked_pre_evidence_corpus_source_material_hash_invalid",
        "source_material_hash_invalid",
      ],
      [
        withAdmissionInput(admission, { sourceMaterialTextByteLength: 4097 }),
        "blocked_pre_evidence_corpus_source_material_oversized",
        "source_material_length_invalid",
      ],
      [
        withAdmissionInput(admission, { locatorRef: "raw_url" }),
        "blocked_pre_evidence_corpus_source_material_leakage_risk",
        "raw_leakage_marker_detected",
      ],
      [
        {
          ...admission,
          productExecution: {
            ...admission.productExecution,
            evidenceItemGenerated: true,
          },
        },
        "blocked_pre_evidence_corpus_downstream_execution_not_authorized",
        "downstream_execution_not_authorized",
      ],
    ];

    for (const [input, status, stopReason] of cases) {
      expect(shell(input)).toMatchObject({
        status,
        stopReason,
        evidenceCorpus: null,
        evidenceItems: [],
        extractionInput: null,
        evidenceItemExtractionAuthorized: false,
      });
    }
  });
});
