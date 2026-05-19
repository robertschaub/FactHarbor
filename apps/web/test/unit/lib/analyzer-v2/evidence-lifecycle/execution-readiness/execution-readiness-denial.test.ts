import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildBoundedExtractionInputAuthorization } from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import type {
  BoundedExtractionInputAuthorizationDecision,
  BoundedTextExtractionInputPacket,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import {
  buildEvidenceLifecycleExecutionReadinessDenial,
  EVIDENCE_LIFECYCLE_EXECUTION_READINESS_INPUT_MAX_TEXT_BYTES,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import type {
  EvidenceCorpusBoundedTextAuthorizationDecision,
  EvidenceCorpusBoundedTextSidecar,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

const TEXT = "Bounded W4-G source material text retained for W4-I execution-readiness denial.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sidecar(text = TEXT): EvidenceCorpusBoundedTextSidecar {
  const hash = sha256Text(text);
  return {
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
    text,
    textHash: hash,
    textByteLength: Buffer.byteLength(text, "utf8"),
    textCharLength: text.length,
    maxTextBytes: 4096,
    truncationApplied: false,
    sourceMaterialRecordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
    sourceMaterialTextHash: hash,
    sourceMaterialTextByteLength: Buffer.byteLength(text, "utf8"),
    sourceMaterialTextCharLength: text.length,
    sourceMaterialRuntimeOwned: true,
    admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
    shellDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d",
    extractionDenialDecisionVersion:
      "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e",
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
  };
}

function boundedTextAuthorization(): EvidenceCorpusBoundedTextAuthorizationDecision {
  const boundedTextSidecar = sidecar();
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
      extractionDenialDecisionVersion:
        "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e",
      extractionDenialStatus: "extraction_denied_shell_only",
      extractionDenialStopReason: "shell_only_corpus",
    },
    sourceMaterialRecordCount: 1,
    boundedTextSidecarCount: 1,
    boundedTextSidecar,
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

function extractionInputAuthorization(): BoundedExtractionInputAuthorizationDecision {
  return buildBoundedExtractionInputAuthorization({
    boundedTextAuthorization: boundedTextAuthorization(),
    boundedTextRuntimeOwnership: "owned",
  });
}

function withPacket(
  decision: BoundedExtractionInputAuthorizationDecision,
  packet: BoundedTextExtractionInputPacket,
): BoundedExtractionInputAuthorizationDecision {
  return {
    ...decision,
    extractionInputPacket: packet,
  };
}

describe("evidence lifecycle execution-readiness denial", () => {
  it("accepts exactly one runtime-owned W4-H packet and keeps extraction execution denied", () => {
    const parent = extractionInputAuthorization();
    const decision = buildEvidenceLifecycleExecutionReadinessDenial({
      extractionInputAuthorization: parent,
      extractionInputRuntimeOwnership: "owned",
    });

    expect(decision.status).toBe("extraction_input_structurally_eligible_execution_denied");
    expect(decision.stopCondition).toBe("extraction_execution_not_authorized_in_x7w4i");
    expect(decision.visibility).toBe("internal_admin_only");
    expect(decision.publicPointerExposure).toBe("forbidden");
    expect(decision.publicCutoverStatus).toBe("blocked_precutover");
    expect(decision.adminDefaultProjection).toBe("hash_length_provenance_only");
    expect(decision.inputTextReturnedByDefault).toBe(false);
    expect(decision.packetObservation).toMatchObject({
      packetCount: 1,
      inputTextByteLength: Buffer.byteLength(TEXT, "utf8"),
      inputTextHash: parent.extractionInputPacket?.inputTextHash,
      maxInputTextBytes: EVIDENCE_LIFECYCLE_EXECUTION_READINESS_INPUT_MAX_TEXT_BYTES,
    });
    expect(decision.parent.providerId).toBe("wikimedia_core");
    expect(decision.productExecution).toMatchObject({
      w4hPacketObserved: true,
      executionReadinessDecisionCreated: true,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      reportGenerated: false,
      publicProjectionWritten: false,
    });
    expect(decision.evidenceItems).toEqual([]);
    expect(decision.parserOutput).toBeNull();
    expect(decision.reportOutput).toBeNull();
  });

  it("fails closed when the W4-H decision is not runtime-owned", () => {
    const decision = buildEvidenceLifecycleExecutionReadinessDenial({
      extractionInputAuthorization: extractionInputAuthorization(),
      extractionInputRuntimeOwnership: "not_owned",
    });

    expect(decision.status).toBe("blocked_pre_execution_readiness_w4h_not_runtime_owned");
    expect(decision.stopCondition).toBe("w4h_runtime_ownership_missing");
    expect(decision.productExecution.extractionExecutionAuthorized).toBe(false);
  });

  it("fails closed on provider lineage drift and text-hash drift", () => {
    const parent = extractionInputAuthorization();
    const packet = parent.extractionInputPacket;
    expect(packet).not.toBeNull();
    if (!packet) {
      return;
    }

    const providerDrift = buildEvidenceLifecycleExecutionReadinessDenial({
      extractionInputAuthorization: withPacket(parent, {
        ...packet,
        providerId: "wikimedia",
      }),
      extractionInputRuntimeOwnership: "owned",
    });
    const hashDrift = buildEvidenceLifecycleExecutionReadinessDenial({
      extractionInputAuthorization: withPacket(parent, {
        ...packet,
        inputTextHash: sha256Text("different text"),
      }),
      extractionInputRuntimeOwnership: "owned",
    });

    expect(providerDrift.status).toBe("blocked_pre_execution_readiness_provider_id_mismatch");
    expect(hashDrift.status).toBe("blocked_pre_execution_readiness_packet_text_hash_mismatch");
    expect(providerDrift.productExecution.extractionExecutionAuthorized).toBe(false);
    expect(hashDrift.productExecution.llmExtractionCallAuthorized).toBe(false);
  });
});
