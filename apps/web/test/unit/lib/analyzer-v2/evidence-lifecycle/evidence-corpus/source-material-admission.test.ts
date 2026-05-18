import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusSourceMaterialAdmission,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";
import {
  buildEvidenceCorpusSourceMaterialReadiness,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
  type EvidenceCorpusSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSourceMaterialText() {
  return "Neutral source material text for structural admission testing.";
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

function validReadiness(): EvidenceCorpusSourceMaterialReadinessDecision {
  return buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: validSourceMaterialPageSummary(),
    runtimeOwned: true,
  });
}

function admission(sourceMaterialReadiness: unknown, runtimeOwned = true) {
  return buildEvidenceCorpusSourceMaterialAdmission({ sourceMaterialReadiness, runtimeOwned });
}

function withReadinessRecord(
  readiness: EvidenceCorpusSourceMaterialReadinessDecision,
  recordOverrides: Record<string, unknown>,
) {
  return {
    ...readiness,
    sourceMaterialRecord: {
      ...(readiness.sourceMaterialRecord as Record<string, unknown>),
      ...recordOverrides,
    },
  };
}

describe("Analyzer V2 W4-C Source Material corpus admission core", () => {
  it("admits only text-free W4-A readiness into a corpus-admission input while keeping corpus construction closed", () => {
    const readiness = validReadiness();
    const result = admission(readiness);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      decisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      status: "source_material_admitted_to_corpus_input_gate_closed",
      stopReason: "not_stopped",
      parent: {
        readinessDecisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
        readinessStatus: "source_material_structurally_admissible_evidence_corpus_gate_closed",
        readinessStopReason: "not_stopped",
      },
      sourceMaterialRecordCount: 1,
      admittedCorpusAdmissionInputCount: 1,
      rejectedCorpusAdmissionInputCount: 0,
      evidenceCorpus: null,
      evidenceCorpusBuildAuthorized: false,
      evidenceItems: [],
      extractionInput: null,
      downstreamGate: "evidence_corpus_construction_gate_closed",
      publicCutoverStatus: "blocked_precutover",
      productExecution: {
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
    });
    expect(result.corpusAdmissionInput).toMatchObject({
      inputVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_ADMISSION_INPUT_VERSION,
      sourceMaterialRef: readiness.sourceMaterialRecord?.sourceMaterialRef,
      locatorRef: readiness.sourceMaterialRecord?.locatorRef,
      candidatePreviewId: readiness.sourceMaterialRecord?.candidatePreviewId,
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      sourceMaterialTextHash: readiness.sourceMaterialRecord?.sourceMaterialTextHash,
      sourceMaterialRecordCount: 1,
      readinessDecisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
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
    });
    expect(serialized).not.toContain(validSourceMaterialText());
    expect(serialized).not.toContain("sourceMaterialText\":\"");
    expect(serialized).not.toContain("raw_url");
    expect(serialized).not.toContain("truthPercentage");
    expect(serialized).not.toContain("reportMarkdown");
  });

  it("blocks absent, non-W4-A, and copied W4-A inputs before corpus admission", () => {
    const readiness = validReadiness();
    const cases = [
      [admission(null), "blocked_pre_evidence_corpus_readiness_absent", "w4a_not_completed"],
      [
        admission(validSourceMaterialPageSummary(), false),
        "blocked_pre_evidence_corpus_readiness_absent",
        "w4a_not_completed",
      ],
      [
        admission(JSON.parse(JSON.stringify(readiness)), false),
        "blocked_pre_evidence_corpus_readiness_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        admission(structuredClone(readiness), false),
        "blocked_pre_evidence_corpus_readiness_not_runtime_owned",
        "runtime_ownership_missing",
      ],
    ];

    for (const [result, status, stopReason] of cases) {
      expect(result).toMatchObject({
        status,
        stopReason,
        corpusAdmissionInput: null,
        evidenceCorpus: null,
        evidenceCorpusBuildAuthorized: false,
        evidenceItems: [],
        extractionInput: null,
      });
    }
  });

  it("blocks unsupported kind, missing metadata, invalid hash, oversized length, leakage, and downstream execution", () => {
    const readiness = validReadiness();
    const cases = [
      [
        withReadinessRecord(readiness, { sourceMaterialKind: "full_html" }),
        "blocked_pre_evidence_corpus_source_material_kind_unsupported",
        "source_material_kind_unsupported",
      ],
      [
        withReadinessRecord(readiness, { providerId: "" }),
        "blocked_pre_evidence_corpus_source_material_leakage_risk",
        "source_material_identity_missing",
      ],
      [
        withReadinessRecord(readiness, { languageCode: "" }),
        "blocked_pre_evidence_corpus_source_material_leakage_risk",
        "source_material_identity_missing",
      ],
      [
        withReadinessRecord(readiness, { sourceMaterialTextHash: "not-a-hash" }),
        "blocked_pre_evidence_corpus_source_material_hash_invalid",
        "source_material_hash_missing",
      ],
      [
        withReadinessRecord(readiness, { sourceMaterialTextByteLength: 4097 }),
        "blocked_pre_evidence_corpus_source_material_oversized",
        "source_material_length_invalid",
      ],
      [
        withReadinessRecord(readiness, { locatorRef: "raw_url" }),
        "blocked_pre_evidence_corpus_source_material_leakage_risk",
        "raw_leakage_marker_detected",
      ],
      [
        {
          ...readiness,
          productExecution: {
            ...readiness.productExecution,
            evidenceItemGenerated: true,
          },
        },
        "blocked_pre_evidence_corpus_downstream_execution_not_authorized",
        "downstream_execution_not_authorized",
      ],
    ];

    for (const [input, status, stopReason] of cases) {
      const result = admission(input);
      expect(result).toMatchObject({
        status,
        stopReason,
        corpusAdmissionInput: null,
        evidenceCorpus: null,
        evidenceCorpusBuildAuthorized: false,
        evidenceItems: [],
        extractionInput: null,
      });
    }
  });
});
