import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceCorpusExtractionReadinessDenial,
  EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-extraction-readiness-denial";
import {
  buildEvidenceCorpusShell,
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

function validSourceMaterialPageSummary(overrides: Record<string, unknown> = {}) {
  const text = "Neutral source material text for extraction readiness denial testing.";
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

function validShellDecision() {
  return buildEvidenceCorpusShell({
    sourceMaterialAdmission: validAdmission(),
    runtimeOwnership: "owned",
  });
}

describe("Analyzer V2 W4-E EvidenceCorpus extraction-readiness denial core", () => {
  it("maps a positive W4-D shell to denial-only extraction readiness", () => {
    const shell = validShellDecision();
    const result = buildEvidenceCorpusExtractionReadinessDenial({
      evidenceCorpusShellDecision: shell,
      runtimeOwnership: "owned",
    });
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      decisionVersion: EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      status: "extraction_denied_shell_only",
      stopReason: "shell_only_corpus",
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
    });
    expect(serialized).not.toContain("Neutral source material text");
    expect(serialized).not.toContain("truthPercentage");
    expect(serialized).not.toContain("reportMarkdown");
  });

  it("rejects non-owned, copied, mutated, and blocked W4-D shell decisions", () => {
    const shell = validShellDecision();
    const blockedShell = buildEvidenceCorpusShell({
      sourceMaterialAdmission: null,
      runtimeOwnership: "owned",
    });
    const cases = [
      [
        shell,
        "not_owned",
        "extraction_denied_corpus_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        JSON.parse(JSON.stringify(shell)),
        "not_owned",
        "extraction_denied_corpus_not_runtime_owned",
        "runtime_ownership_missing",
      ],
      [
        shell,
        "mutated_after_provenance",
        "extraction_denied_corpus_post_mark_mutated",
        "corpus_post_mark_mutated",
      ],
      [
        blockedShell,
        "owned",
        "extraction_denied_corpus_status_not_positive",
        "w4d_shell_not_created",
      ],
    ] as const;

    for (const [evidenceCorpusShellDecision, runtimeOwnership, status, stopReason] of cases) {
      expect(buildEvidenceCorpusExtractionReadinessDenial({
        evidenceCorpusShellDecision,
        runtimeOwnership,
      })).toMatchObject({
        status,
        stopReason,
        extractionInput: null,
        evidenceItems: [],
      });
    }
  });

  it("fails closed for forged corpus kind, source-text fields, and downstream execution flips", () => {
    const shell = validShellDecision();
    const forgedKind = structuredClone(shell) as {
      evidenceCorpus: { kind: string };
    };
    forgedKind.evidenceCorpus.kind = "ready";
    const sourceTextLeak = structuredClone(shell) as {
      evidenceCorpus: { sourceMaterialText: string };
    };
    sourceTextLeak.evidenceCorpus.sourceMaterialText = "leaked source text";
    const executionFlip = structuredClone(shell) as {
      productExecution: { evidenceItemGenerated: boolean };
    };
    executionFlip.productExecution.evidenceItemGenerated = true;

    expect(buildEvidenceCorpusExtractionReadinessDenial({
      evidenceCorpusShellDecision: forgedKind,
      runtimeOwnership: "owned",
    })).toMatchObject({
      status: "extraction_denied_corpus_kind_unsupported",
      stopReason: "unsupported_corpus_kind",
    });
    expect(buildEvidenceCorpusExtractionReadinessDenial({
      evidenceCorpusShellDecision: sourceTextLeak,
      runtimeOwnership: "owned",
    })).toMatchObject({
      status: "extraction_denied_structural",
      stopReason: "structural_exception",
    });
    expect(buildEvidenceCorpusExtractionReadinessDenial({
      evidenceCorpusShellDecision: executionFlip,
      runtimeOwnership: "owned",
    })).toMatchObject({
      status: "extraction_denied_structural",
      stopReason: "structural_exception",
    });
  });
});
