import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES,
  buildEvidenceCorpusBoundedTextAuthorization,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

const SOURCE_TEXT = "Bounded source summary text for W4-G corpus sidecar authorization.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sourceMaterialRecord(text = SOURCE_TEXT) {
  const hash = sha256Text(text);
  return {
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
    compressedBytes: 128,
    decompressedBytes: 256,
    durationMs: 25,
    timeoutMs: 3000,
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
  } as const;
}

function sourceMaterialPageSummary(text = SOURCE_TEXT) {
  const record = sourceMaterialRecord(text);
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
    sourceMaterialRecords: [record],
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
  } as const;
}

function admissionDecision(text = SOURCE_TEXT) {
  const record = sourceMaterialRecord(text);
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
      corpusAdmissionInputId: `CORPUS_ADMISSION_INPUT_${record.sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      sourceMaterialRef: record.sourceMaterialId,
      locatorRef: record.locatorRef,
      candidatePreviewId: record.candidatePreviewId,
      providerId: record.providerId,
      sourceMaterialEndpointId: record.sourceMaterialEndpointId,
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: record.languageCode,
      sourceMaterialTextHash: record.sourceMaterialTextHash,
      sourceMaterialTextByteLength: record.sourceMaterialTextByteLength,
      sourceMaterialTextCharLength: record.sourceMaterialTextCharLength,
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

function shellDecision(text = SOURCE_TEXT) {
  const admission = admissionDecision(text);
  const input = admission.corpusAdmissionInput;
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
      evidenceCorpusId: `EVIDENCE_CORPUS_SHELL_${input.sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      kind: "shell_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      sourceMaterialRefs: [input.sourceMaterialRef],
      locatorRefs: [input.locatorRef],
      candidatePreviewIds: [input.candidatePreviewId],
      providerIds: [input.providerId],
      sourceMaterialEndpointIds: [input.sourceMaterialEndpointId],
      languageCodes: [input.languageCode],
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
      sourceMaterialTextHashes: [input.sourceMaterialTextHash],
      aggregateSourceMaterialTextByteLength: input.sourceMaterialTextByteLength,
      aggregateSourceMaterialTextCharLength: input.sourceMaterialTextCharLength,
      admissionLineage: {
        admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
        admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
        admissionStopReason: "not_stopped",
        corpusAdmissionInputId: input.corpusAdmissionInputId,
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

function denialDecision(text = SOURCE_TEXT) {
  const shell = shellDecision(text);
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
      evidenceCorpusId: shell.evidenceCorpus.evidenceCorpusId,
    },
    parentAdmissionLineage: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      corpusAdmissionInputId: shell.evidenceCorpus.admissionLineage.corpusAdmissionInputId,
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

function buildPositive() {
  const pageSummary = sourceMaterialPageSummary();
  const sourceMaterialAdmission = admissionDecision();
  const evidenceCorpusShell = shellDecision();
  const extractionReadinessDenial = denialDecision();
  return buildEvidenceCorpusBoundedTextAuthorization({
    sourceMaterialPageSummary: pageSummary,
    sourceMaterialRuntimeOwnership: "owned",
    sourceMaterialAdmission,
    admissionRuntimeOwnership: "owned",
    evidenceCorpusShell,
    shellRuntimeOwnership: "owned",
    extractionReadinessDenial,
  });
}

describe("EvidenceCorpus bounded-text authorization", () => {
  it("creates one linked hidden sidecar from runtime-owned W3-B text without opening extraction", () => {
    const shell = shellDecision();
    const denial = denialDecision();
    const shellBefore = JSON.stringify(shell);
    const denialBefore = JSON.stringify(denial);

    const decision = buildEvidenceCorpusBoundedTextAuthorization({
      sourceMaterialPageSummary: sourceMaterialPageSummary(),
      sourceMaterialRuntimeOwnership: "owned",
      sourceMaterialAdmission: admissionDecision(),
      admissionRuntimeOwnership: "owned",
      evidenceCorpusShell: shell,
      shellRuntimeOwnership: "owned",
      extractionReadinessDenial: denial,
    });

    expect(decision.status).toBe("bounded_corpus_text_sidecar_created_extraction_gate_closed");
    expect(decision.stopReason).toBe("not_stopped");
    expect(decision.visibility).toBe("internal_admin_only");
    expect(decision.publicPointerExposure).toBe("forbidden");
    expect(decision.boundedTextSidecarCount).toBe(1);
    expect(decision.evidenceCorpus).toBeNull();
    expect(decision.extractionInput).toBeNull();
    expect(decision.evidenceItems).toEqual([]);
    expect(decision.semanticExtractionAuthorized).toBe(false);
    expect(decision.evidenceItemExtractionAuthorized).toBe(false);
    expect(decision.productExecution).toMatchObject({
      boundedCorpusTextAuthorized: true,
      boundedTextSidecarCreated: true,
      sourceTextAuthorized: false,
      extractionInputCreated: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      publicSurfaceWritten: false,
    });
    expect(decision.boundedTextSidecar).toMatchObject({
      kind: "bounded_text_sidecar",
      corpusTextAccess: "internal_admin_only_bounded_text_sidecar",
      text: SOURCE_TEXT,
      textByteLength: Buffer.byteLength(SOURCE_TEXT, "utf8"),
      maxTextBytes: EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES,
      linkedEvidenceCorpusId: shell.evidenceCorpus.evidenceCorpusId,
      preservesShellOnlyCorpus: true,
      mutatesShellCorpus: false,
      mutatesExtractionDenial: false,
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      extractionInput: null,
      evidenceItems: [],
    });
    expect(JSON.stringify(shell)).toBe(shellBefore);
    expect(JSON.stringify(denial)).toBe(denialBefore);
  });

  it("fails closed unless the W3-B source material decision is runtime-owned", () => {
    const decision = buildEvidenceCorpusBoundedTextAuthorization({
      sourceMaterialPageSummary: sourceMaterialPageSummary(),
      sourceMaterialRuntimeOwnership: "not_owned",
      sourceMaterialAdmission: admissionDecision(),
      admissionRuntimeOwnership: "owned",
      evidenceCorpusShell: shellDecision(),
      shellRuntimeOwnership: "owned",
      extractionReadinessDenial: denialDecision(),
    });

    expect(decision.status).toBe("blocked_pre_bounded_corpus_text_w3b_not_runtime_owned");
    expect(decision.boundedTextSidecar).toBeNull();
    expect(decision.productExecution.boundedCorpusTextAuthorized).toBe(false);
  });

  it("rejects material with mismatched text hash or oversized text", () => {
    const badHash = sourceMaterialPageSummary();
    const badRecord = {
      ...badHash.sourceMaterialRecords[0],
      sourceMaterialTextHash: "1".repeat(64),
    };
    const badHashDecision = buildEvidenceCorpusBoundedTextAuthorization({
      sourceMaterialPageSummary: {
        ...badHash,
        sourceMaterialRecords: [badRecord],
      },
      sourceMaterialRuntimeOwnership: "owned",
      sourceMaterialAdmission: admissionDecision(),
      admissionRuntimeOwnership: "owned",
      evidenceCorpusShell: shellDecision(),
      shellRuntimeOwnership: "owned",
      extractionReadinessDenial: denialDecision(),
    });
    expect(badHashDecision.status).toBe("blocked_pre_bounded_corpus_text_hash_mismatch");

    const oversizedText = "x".repeat(EVIDENCE_CORPUS_BOUNDED_TEXT_MAX_BYTES + 1);
    const oversizedDecision = buildEvidenceCorpusBoundedTextAuthorization({
      sourceMaterialPageSummary: sourceMaterialPageSummary(oversizedText),
      sourceMaterialRuntimeOwnership: "owned",
      sourceMaterialAdmission: admissionDecision(oversizedText),
      admissionRuntimeOwnership: "owned",
      evidenceCorpusShell: shellDecision(oversizedText),
      shellRuntimeOwnership: "owned",
      extractionReadinessDenial: denialDecision(oversizedText),
    });
    expect(oversizedDecision.status).toBe("blocked_pre_bounded_corpus_text_oversized");
  });

  it("keeps W4-D shell-only and W4-E extraction denial as required closure evidence", () => {
    const noDenial = {
      ...denialDecision(),
      status: "extraction_denied_extraction_input_absent",
      stopReason: "extraction_input_absent",
    };
    const decision = buildEvidenceCorpusBoundedTextAuthorization({
      sourceMaterialPageSummary: sourceMaterialPageSummary(),
      sourceMaterialRuntimeOwnership: "owned",
      sourceMaterialAdmission: admissionDecision(),
      admissionRuntimeOwnership: "owned",
      evidenceCorpusShell: shellDecision(),
      shellRuntimeOwnership: "owned",
      extractionReadinessDenial: noDenial,
    });

    expect(decision.status).toBe("blocked_pre_bounded_corpus_text_w4e_not_denial");
    expect(buildPositive().boundedTextSidecar?.downstreamExecution).toMatchObject({
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
    });
  });
});
