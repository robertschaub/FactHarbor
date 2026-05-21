import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildEvidenceLifecycleExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner";
import {
  markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance";
import type {
  EvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

const TEXT = "Runtime-owned W4-G sidecar text for W4-H packet owner verification.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function boundedTextAuthorization(): EvidenceCorpusBoundedTextAuthorizationDecision {
  const hash = sha256Text(TEXT);
  const boundedTextSidecar = {
    sidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
    boundedTextSidecarId: `EVIDENCE_CORPUS_BOUNDED_TEXT_${hash.slice(0, 16).toUpperCase()}`,
    kind: "bounded_text_sidecar",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    linkedEvidenceCorpusId: `EVIDENCE_CORPUS_SHELL_${hash.slice(0, 16).toUpperCase()}`,
    linkedEvidenceCorpusShellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
    sourceMaterialRef: `SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`,
    locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
    candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
    providerId: "wikimedia_core",
    sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    languageCode: "en",
    textKind: "bounded_page_summary_extract_text",
    text: TEXT,
    textHash: hash,
    textByteLength: Buffer.byteLength(TEXT, "utf8"),
    textCharLength: Array.from(TEXT).length,
    maxTextBytes: 4096,
    truncationApplied: false,
    sourceMaterialRecordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
    sourceMaterialTextHash: hash,
    sourceMaterialTextByteLength: Buffer.byteLength(TEXT, "utf8"),
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
  } as const;
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
    boundedTextSidecar,
    boundedTextSidecars: [boundedTextSidecar],
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

describe("bounded extraction-input authorization owner", () => {
  it("builds a positive runtime-owned W4-H packet from runtime-owned W4-G sidecar state", () => {
    const decision = buildEvidenceLifecycleExtractionInputAuthorizationDecision({
      boundedTextAuthorization: markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(
        boundedTextAuthorization(),
      ),
    });

    expect(decision.status).toBe("bounded_extraction_input_packet_created_extraction_execution_closed");
    expect(decision.parent.boundedTextRuntimeOwnership).toBe("owned");
    expect(decision.extractionInputPacket).toMatchObject({
      kind: "bounded_text_extraction_input_packet",
      providerId: "wikimedia_core",
      inputText: TEXT,
      extractionExecutionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
    });
  });

  it("fails closed for copied W4-G decisions and post-mark mutations", () => {
    const copiedW4g = JSON.parse(JSON.stringify(
      markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(boundedTextAuthorization()),
    ));
    const mutatedW4g = markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(
      boundedTextAuthorization(),
    );
    mutatedW4g.status = "bounded_corpus_text_authorization_damaged_structural";

    const copiedDecision = buildEvidenceLifecycleExtractionInputAuthorizationDecision({
      boundedTextAuthorization: copiedW4g,
    });
    const mutatedDecision = buildEvidenceLifecycleExtractionInputAuthorizationDecision({
      boundedTextAuthorization: mutatedW4g,
    });

    expect(copiedDecision.status).toBe("blocked_pre_extraction_input_w4g_not_runtime_owned");
    expect(mutatedDecision.status).toBe("blocked_pre_extraction_input_w4g_not_runtime_owned");
    expect(mutatedDecision.parent.boundedTextRuntimeOwnership).toBe("mutated_after_provenance");
  });
});
