import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusSourceMaterialReadiness,
  EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";
import {
  buildEvidenceCorpusSourceMaterialReadinessGuard,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness-guard";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validSourceMaterialText() {
  return "Hydrogen vehicles store hydrogen and power an electric motor.";
}

function validDecision(overrides: Record<string, unknown> = {}) {
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

function readiness(input: unknown, runtimeOwned = true) {
  return buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: input,
    runtimeOwned,
  });
}

describe("Analyzer V2 W4-A Source Material to EvidenceCorpus readiness", () => {
  it("admits completed runtime-owned W3-B Source Material structurally while keeping corpus build closed", () => {
    const result = readiness(validDecision());
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      decisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_READINESS_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
      stopReason: "not_stopped",
      parent: {
        w2Status: "candidate_provider_network_completed",
        w3aStatus: "source_candidate_preview_materialized",
        w3bStatus: "source_material_page_summary_completed",
      },
      sourceMaterialRecordCount: 1,
      admittedSourceMaterialRecordCount: 1,
      rejectedSourceMaterialRecordCount: 0,
      extractionInput: null,
      evidenceCorpus: null,
      evidenceCorpusBuildAuthorized: false,
      evidenceItems: [],
      downstreamGate: "evidence_corpus_build_gate_closed",
      publicCutoverStatus: "blocked_precutover",
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
    });
    expect(result.sourceMaterialRecord).toMatchObject({
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      languageCode: "en",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      sourceMaterialTextHash: sha256Text(validSourceMaterialText()),
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
    });
    expect(serialized).not.toContain(validSourceMaterialText());
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("admits bounded multi-record W3-B fan-in while keeping corpus build closed", () => {
    const base = validDecision();
    const firstRecord = base.sourceMaterialRecords[0] as Record<string, unknown>;
    const secondText = "Second bounded page summary text for fan-in.";
    const secondHash = sha256Text(secondText);
    const secondRecord = {
      ...firstRecord,
      sourceMaterialId: `SOURCE_MATERIAL_PAGE_SUMMARY_${secondHash.slice(0, 16).toUpperCase()}`,
      locatorRef: "OPAQUE_SOURCE_LOCATOR_2_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_2_1",
      sourceMaterialText: secondText,
      sourceMaterialTextHash: secondHash,
      sourceMaterialTextByteLength: Buffer.byteLength(secondText, "utf8"),
      sourceMaterialTextCharLength: Array.from(secondText).length,
    };
    const decision = validDecision({
      attemptedFetchCount: 2,
      sourceMaterialRecordCount: 2,
      fetchDiagnosticCount: 2,
      sourceMaterialRecords: [firstRecord, secondRecord],
      fetchDiagnostics: [
        validDecision().fetchDiagnostics[0],
        { ...(validDecision().fetchDiagnostics[0] as Record<string, unknown>), attemptOrdinal: 2 },
      ],
    });

    const result = readiness(decision);

    expect(result.status).toBe("source_material_structurally_admissible_evidence_corpus_gate_closed");
    expect(result.sourceMaterialRecordCount).toBe(2);
    expect(result.admittedSourceMaterialRecordCount).toBe(2);
    expect(result.rejectedSourceMaterialRecordCount).toBe(0);
    expect(result.sourceMaterialRecords.map((record) => record.sourceMaterialTextHash)).toEqual([
      firstRecord.sourceMaterialTextHash,
      secondHash,
    ]);
    expect(JSON.stringify(result)).not.toContain(secondText);
  });

  it("blocks non-runtime-owned, absent, incomplete, and count-unsupported inputs without fabricating corpus data", () => {
    const cases = [
      [
        readiness(validDecision(), false),
        "blocked_pre_evidence_corpus_source_material_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        readiness(null),
        "blocked_pre_evidence_corpus_source_material_absent",
        "source_material_record_missing",
      ],
      [
        readiness(validDecision({ status: "blocked_pre_source_material_page_summary" })),
        "blocked_pre_evidence_corpus_parent_not_completed",
        "w3b_not_completed",
      ],
      [
        readiness(validDecision({
          sourceMaterialRecordCount: 2,
          sourceMaterialRecords: [validDecision().sourceMaterialRecords[0], validDecision().sourceMaterialRecords[0]],
        })),
        "blocked_pre_evidence_corpus_source_material_contract_invalid",
        "source_material_record_count_unsupported",
      ],
    ];

    for (const [result, status, stopReason] of cases) {
      expect(result).toMatchObject({
        status,
        stopReason,
        extractionInput: null,
        evidenceCorpus: null,
        evidenceCorpusBuildAuthorized: false,
        evidenceItems: [],
      });
    }
  });

  it("rejects invalid Source Material text, hash, kind, diagnostics, and downstream execution flags", () => {
    const text = validSourceMaterialText();
    const badRecord = {
      ...(validDecision().sourceMaterialRecords[0] as Record<string, unknown>),
      sourceMaterialTextHash: sha256Text(`${text} changed`),
    };
    const cases = [
      [
        validDecision({
          sourceMaterialRecords: [{ ...(validDecision().sourceMaterialRecords[0] as Record<string, unknown>), sourceMaterialText: "" }],
        }),
        "source_material_text_missing",
      ],
      [
        validDecision({
          sourceMaterialRecords: [{
            ...(validDecision().sourceMaterialRecords[0] as Record<string, unknown>),
            sourceMaterialText: "x".repeat(4097),
          }],
        }),
        "source_material_text_oversized",
      ],
      [validDecision({ sourceMaterialRecords: [badRecord] }), "structural_exception"],
      [
        validDecision({
          sourceMaterialRecords: [{
            ...(validDecision().sourceMaterialRecords[0] as Record<string, unknown>),
            sourceMaterialKind: "full_html",
          }],
        }),
        "source_material_kind_unsupported",
      ],
      [
        validDecision({
          fetchDiagnostics: [{ ...(validDecision().fetchDiagnostics[0] as Record<string, unknown>), status: "failed" }],
        }),
        "fetch_diagnostic_not_success",
      ],
      [
        validDecision({
          productExecution: { ...validDecision().productExecution, evidenceCorpusCreated: true },
        }),
        "downstream_execution_not_authorized",
      ],
    ];

    for (const [input, stopReason] of cases) {
      const result = readiness(input);
      expect(result.stopReason).toBe(stopReason);
      expect(result.evidenceCorpus).toBeNull();
      expect(result.evidenceCorpusBuildAuthorized).toBe(false);
      expect(result.evidenceItems).toEqual([]);
    }
  });

  it("rejects raw-leakage markers from structural fields and exposes the guard wrapper", () => {
    const leaking = validDecision({
      sourceMaterialRecords: [{
        ...(validDecision().sourceMaterialRecords[0] as Record<string, unknown>),
        locatorRef: "https://example.invalid/raw-title",
      }],
    });

    expect(buildEvidenceCorpusSourceMaterialReadinessGuard({
      sourceMaterialPageSummary: leaking,
      runtimeOwned: true,
    })).toMatchObject({
      status: "blocked_pre_evidence_corpus_source_material_leakage_risk",
      stopReason: "raw_leakage_marker_detected",
      sourceMaterialRecord: null,
    });
  });
});
