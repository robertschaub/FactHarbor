import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner";
import {
  markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-provenance";
import type {
  EvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";
import {
  markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance";
import type {
  EvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";
import {
  markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-provenance";
import type {
  EvidenceCorpusShellDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell";
import type {
  EvidenceCorpusExtractionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-extraction-readiness-denial";

const TEXT = "Runtime-owned bounded source material text for W4-G owner verification.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function record() {
  const hash = sha256Text(TEXT);
  return {
    recordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
    sourceMaterialId: `SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`,
    locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
    candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
    providerId: "wikimedia_core",
    sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
    languageCode: "en",
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    sourceMaterialText: TEXT,
    sourceMaterialTextHash: hash,
    sourceMaterialTextByteLength: Buffer.byteLength(TEXT, "utf8"),
    sourceMaterialTextCharLength: Array.from(TEXT).length,
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

function sourceMaterialPageSummary() {
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
    sourceMaterialRecords: [record()],
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
  } as unknown as EvidenceLifecycleSourceMaterialPageSummaryDecision;
}

function admissionDecision() {
  const source = record();
  const corpusAdmissionInput = {
    inputVersion: "v2.evidence-lifecycle.evidence-corpus-admission-input.x7w4c",
    corpusAdmissionInputId: `CORPUS_ADMISSION_INPUT_${source.sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
    sourceMaterialRef: source.sourceMaterialId,
    locatorRef: source.locatorRef,
    candidatePreviewId: source.candidatePreviewId,
    providerId: source.providerId,
    sourceMaterialEndpointId: source.sourceMaterialEndpointId,
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    languageCode: source.languageCode,
    sourceMaterialTextHash: source.sourceMaterialTextHash,
    sourceMaterialTextByteLength: source.sourceMaterialTextByteLength,
    sourceMaterialTextCharLength: source.sourceMaterialTextCharLength,
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
  } as const;
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
    corpusAdmissionInput,
    corpusAdmissionInputs: [corpusAdmissionInput],
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
  } as unknown as EvidenceCorpusSourceMaterialAdmissionDecision;
}

function shellDecision() {
  const source = record();
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
      evidenceCorpusId: `EVIDENCE_CORPUS_SHELL_${source.sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      kind: "shell_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      sourceMaterialRefs: [source.sourceMaterialId],
      locatorRefs: [source.locatorRef],
      candidatePreviewIds: [source.candidatePreviewId],
      providerIds: [source.providerId],
      sourceMaterialEndpointIds: [source.sourceMaterialEndpointId],
      languageCodes: [source.languageCode],
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
      sourceMaterialTextHashes: [source.sourceMaterialTextHash],
      aggregateSourceMaterialTextByteLength: source.sourceMaterialTextByteLength,
      aggregateSourceMaterialTextCharLength: source.sourceMaterialTextCharLength,
      admissionLineage: {
        admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
        admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
        admissionStopReason: "not_stopped",
        corpusAdmissionInputId: `CORPUS_ADMISSION_INPUT_${source.sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
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
  } as unknown as EvidenceCorpusShellDecision;
}

function denialDecision() {
  const shell = shellDecision();
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
      evidenceCorpusId: shell.evidenceCorpus?.evidenceCorpusId ?? null,
    },
    parentAdmissionLineage: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      corpusAdmissionInputId: `CORPUS_ADMISSION_INPUT_${record().sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
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
  } as unknown as EvidenceCorpusExtractionReadinessDenialDecision;
}

describe("EvidenceCorpus bounded-text authorization owner", () => {
  it("builds a positive runtime-owned W4-G decision from W3-B/W4-C/W4-D plus W4-E closure", () => {
    const decision = buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision({
      sourceMaterialPageSummary: markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(
        sourceMaterialPageSummary(),
      ),
      sourceMaterialAdmission: markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(
        admissionDecision(),
      ),
      evidenceCorpusShell: markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(shellDecision()),
      extractionReadinessDenial: denialDecision(),
    });

    expect(decision.status).toBe("bounded_corpus_text_sidecar_created_extraction_gate_closed");
    expect(decision.boundedTextSidecar?.text).toBe(TEXT);
    expect(decision.parent).toMatchObject({
      sourceMaterialRuntimeOwnership: "owned",
      admissionRuntimeOwnership: "owned",
      shellRuntimeOwnership: "owned",
      extractionDenialStatus: "extraction_denied_shell_only",
    });
    expect(decision.productExecution).toMatchObject({
      boundedCorpusTextAuthorized: true,
      extractionInputCreated: false,
      evidenceItemGenerated: false,
      publicSurfaceWritten: false,
    });
  });

  it("fails closed for copied runtime decisions and post-mark mutations", () => {
    const copiedSourceMaterial = JSON.parse(JSON.stringify(
      markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(sourceMaterialPageSummary()),
    ));
    const mutatedAdmission = markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(
      admissionDecision(),
    );
    mutatedAdmission.status = "evidence_corpus_source_material_admission_damaged_structural";

    const copiedDecision = buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision({
      sourceMaterialPageSummary: copiedSourceMaterial,
      sourceMaterialAdmission: markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(
        admissionDecision(),
      ),
      evidenceCorpusShell: markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(shellDecision()),
      extractionReadinessDenial: denialDecision(),
    });
    const mutatedDecision = buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision({
      sourceMaterialPageSummary: markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(
        sourceMaterialPageSummary(),
      ),
      sourceMaterialAdmission: mutatedAdmission,
      evidenceCorpusShell: markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(shellDecision()),
      extractionReadinessDenial: denialDecision(),
    });

    expect(copiedDecision.status).toBe("blocked_pre_bounded_corpus_text_w3b_not_runtime_owned");
    expect(mutatedDecision.status).toBe("blocked_pre_bounded_corpus_text_w4c_not_runtime_owned");
    expect(mutatedDecision.parent.admissionRuntimeOwnership).toBe("mutated_after_provenance");
  });
});
