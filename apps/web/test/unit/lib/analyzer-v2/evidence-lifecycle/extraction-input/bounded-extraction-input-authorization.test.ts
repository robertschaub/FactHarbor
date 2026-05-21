import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES,
  buildBoundedExtractionInputAuthorization,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import type {
  EvidenceCorpusBoundedTextAuthorizationDecision,
  EvidenceCorpusBoundedTextSidecar,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

const TEXT = "Bounded corpus sidecar text for W4-H extraction input packet authorization.";
type SidecarOverrides = Partial<
  Pick<
    EvidenceCorpusBoundedTextSidecar,
    | "providerId"
    | "sourceMaterialEndpointId"
    | "sourceMaterialKind"
    | "sourceMaterialRecordVersion"
    | "sourceMaterialRef"
    | "locatorRef"
    | "candidatePreviewId"
    | "languageCode"
  >
>;

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sidecar(text = TEXT, overrides: SidecarOverrides = {}): EvidenceCorpusBoundedTextSidecar {
  const hash = sha256Text(text);
  return {
    sidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
    boundedTextSidecarId: `EVIDENCE_CORPUS_BOUNDED_TEXT_${hash.slice(0, 16).toUpperCase()}`,
    kind: "bounded_text_sidecar",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    linkedEvidenceCorpusId: `EVIDENCE_CORPUS_SHELL_${hash.slice(0, 16).toUpperCase()}`,
    linkedEvidenceCorpusShellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
    sourceMaterialRef: overrides.sourceMaterialRef ?? `SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`,
    locatorRef: overrides.locatorRef ?? `OPAQUE_SOURCE_LOCATOR_${hash.slice(0, 8).toUpperCase()}`,
    candidatePreviewId: overrides.candidatePreviewId ?? `SOURCE_CANDIDATE_PREVIEW_${hash.slice(0, 8).toUpperCase()}`,
    providerId: overrides.providerId ?? "wikimedia_core",
    sourceMaterialEndpointId: overrides.sourceMaterialEndpointId ?? "ep_wikimedia_project_page_summary",
    sourceMaterialKind: overrides.sourceMaterialKind ?? "wikimedia_page_summary_extract_text",
    languageCode: overrides.languageCode ?? "en",
    textKind: "bounded_page_summary_extract_text",
    text,
    textHash: hash,
    textByteLength: Buffer.byteLength(text, "utf8"),
    textCharLength: Array.from(text).length,
    maxTextBytes: 4096,
    truncationApplied: false,
    sourceMaterialRecordVersion: overrides.sourceMaterialRecordVersion
      ?? "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
    sourceMaterialTextHash: hash,
    sourceMaterialTextByteLength: Buffer.byteLength(text, "utf8"),
    sourceMaterialTextCharLength: Array.from(text).length,
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
  };
}

function boundedTextAuthorization(
  overrides: Partial<EvidenceCorpusBoundedTextAuthorizationDecision> = {},
): EvidenceCorpusBoundedTextAuthorizationDecision {
  const boundedTextSidecar = overrides.boundedTextSidecar ?? sidecar();
  const boundedTextSidecars = overrides.boundedTextSidecars
    ?? (boundedTextSidecar ? [boundedTextSidecar] : []);
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
    sourceMaterialRecordCount: boundedTextSidecars.length,
    boundedTextSidecarCount: boundedTextSidecars.length,
    boundedTextSidecar: boundedTextSidecars[0] ?? null,
    boundedTextSidecars,
    evidenceCorpus: null,
    extractionInput: null,
    evidenceItems: [],
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedCorpusTextAuthorized: boundedTextSidecar !== null,
      boundedTextSidecarCreated: boundedTextSidecar !== null,
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
    ...overrides,
  };
}

describe("bounded extraction-input authorization", () => {
  it("creates one hidden extraction-input packet from a runtime-owned W4-G sidecar", () => {
    const parent = boundedTextAuthorization();
    const decision = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: parent,
      boundedTextRuntimeOwnership: "owned",
    });

    expect(decision.status).toBe("bounded_extraction_input_packet_created_extraction_execution_closed");
    expect(decision.stopReason).toBe("not_stopped");
    expect(decision.extractionInputPacketCount).toBe(1);
    expect(decision.evidenceItems).toEqual([]);
    expect(decision.extractionExecutionAuthorized).toBe(false);
    expect(decision.llmExtractionCallAuthorized).toBe(false);
    expect(decision.productExecution).toMatchObject({
      boundedTextSidecarObserved: true,
      boundedExtractionInputPacketCreated: true,
      providerLineagePreserved: true,
      extractionExecutionAuthorized: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      publicSurfaceWritten: false,
    });
    expect(decision.extractionInputPacket).toMatchObject({
      packetVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h",
      kind: "bounded_text_extraction_input_packet",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      source: "w4g_bounded_text_sidecar",
      providerId: parent.boundedTextSidecar?.providerId,
      providerIds: [parent.boundedTextSidecar?.providerId],
      inputText: TEXT,
      inputTextHash: parent.boundedTextSidecar?.textHash,
      inputTextByteLength: Buffer.byteLength(TEXT, "utf8"),
      maxInputTextBytes: BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      publicCutoverStatus: "blocked_precutover",
    });
  });

  it("creates one aggregate extraction-input packet from bounded W4-G fan-in sidecars", () => {
    const firstText = "First bounded page-summary text.";
    const secondText = "Second bounded page-summary text.";
    const sidecars = [sidecar(firstText), sidecar(secondText)];
    const decision = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        boundedTextSidecars: sidecars,
      }),
      boundedTextRuntimeOwnership: "owned",
    });
    const expectedAggregateText = [firstText, secondText].join("\n\n");

    expect(decision.status).toBe("bounded_extraction_input_packet_created_extraction_execution_closed");
    expect(decision.boundedTextSidecarCount).toBe(2);
    expect(decision.extractionInputPacketCount).toBe(1);
    expect(decision.extractionInputPacket).toMatchObject({
      sourceMaterialRef: `AGGREGATE_SOURCE_MATERIAL_${sha256Text(expectedAggregateText).slice(0, 16).toUpperCase()}`,
      sourceMaterialRefs: sidecars.map((entry) => entry.sourceMaterialRef),
      providerIds: sidecars.map((entry) => entry.providerId),
      sourceMaterialKinds: sidecars.map((entry) => entry.sourceMaterialKind),
      inputText: expectedAggregateText,
      inputTextHash: sha256Text(expectedAggregateText),
      inputTextByteLength: Buffer.byteLength(expectedAggregateText, "utf8"),
      sourceMaterialTextHashes: sidecars.map((entry) => entry.sourceMaterialTextHash),
      sourceMaterialTextByteLengths: sidecars.map((entry) => entry.sourceMaterialTextByteLength),
    });
    expect(decision.extractionInputPacket?.sourceContentPackets).toHaveLength(2);
    expect(decision.extractionInputPacket?.sourceContentPackets.map((packet) => packet.contentText)).toEqual([
      firstText,
      secondText,
    ]);
  });

  it("creates one aggregate extraction-input packet from mixed OpenAlex and Wikimedia sidecars", () => {
    const openAlexText = "OpenAlex bounded abstract text.";
    const wikimediaText = "Wikimedia bounded page-summary text.";
    const sidecars = [
      sidecar(openAlexText, {
        providerId: "openalex",
        sourceMaterialEndpointId: "ep_openalex_works_search",
        sourceMaterialKind: "openalex_work_abstract_text",
        sourceMaterialRef: "SOURCE_MATERIAL_OPENALEX_0123456789ABCDEF",
        locatorRef: "OPAQUE_OPENALEX_WORK_0123456789ABCDEF",
        candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_5_3",
      }),
      sidecar(wikimediaText),
    ];
    const decision = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        boundedTextSidecars: sidecars,
      }),
      boundedTextRuntimeOwnership: "owned",
    });

    expect(decision.status).toBe("bounded_extraction_input_packet_created_extraction_execution_closed");
    expect(decision.productExecution.providerLineagePreserved).toBe(true);
    expect(decision.extractionInputPacket).toMatchObject({
      providerId: "openalex",
      providerIds: ["openalex", "wikimedia_core"],
      sourceMaterialKind: "openalex_work_abstract_text",
      sourceMaterialKinds: ["openalex_work_abstract_text", "wikimedia_page_summary_extract_text"],
      sourceMaterialRefs: sidecars.map((entry) => entry.sourceMaterialRef),
    });
    expect(decision.extractionInputPacket?.sourceContentPackets.map((packet) => ({
      sourceRecordId: packet.sourceRecordId,
      providerId: packet.providerId,
      sourceMaterialKind: packet.sourceMaterialKind,
      contentText: packet.contentText,
    }))).toEqual([
      {
        sourceRecordId: "SOURCE_MATERIAL_OPENALEX_0123456789ABCDEF",
        providerId: "openalex",
        sourceMaterialKind: "openalex_work_abstract_text",
        contentText: openAlexText,
      },
      {
        sourceRecordId: sidecars[1].sourceMaterialRef,
        providerId: "wikimedia_core",
        sourceMaterialKind: "wikimedia_page_summary_extract_text",
        contentText: wikimediaText,
      },
    ]);
  });

  it("fails closed when W4-G is not runtime-owned or not positive", () => {
    const notOwned = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization(),
      boundedTextRuntimeOwnership: "not_owned",
    });
    const notPositive = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        status: "blocked_pre_bounded_corpus_text_w3b_not_runtime_owned",
        stopReason: "w3b_not_runtime_owned",
        boundedTextSidecarCount: 0,
        boundedTextSidecar: null,
      }),
      boundedTextRuntimeOwnership: "owned",
    });

    expect(notOwned.status).toBe("blocked_pre_extraction_input_w4g_not_runtime_owned");
    expect(notOwned.extractionInputPacket).toBeNull();
    expect(notPositive.status).toBe("blocked_pre_extraction_input_w4g_not_positive");
    expect(notPositive.extractionInputPacket).toBeNull();
  });

  it("fails closed for provider-id drift from current W4-G lineage", () => {
    const mutatedProviderSidecar = {
      ...sidecar(),
      providerId: "wikimedia",
    };
    const decision = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        boundedTextSidecar: mutatedProviderSidecar,
      }),
      boundedTextRuntimeOwnership: "owned",
    });

    expect(decision.status).toBe("blocked_pre_extraction_input_provider_id_mismatch");
    expect(decision.stopReason).toBe("provider_id_mismatch");
    expect(decision.extractionInputPacket).toBeNull();
  });

  it("fails closed for text hash, length, and downstream execution drift", () => {
    const badHash = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        boundedTextSidecar: {
          ...sidecar(),
          textHash: "1".repeat(64),
        },
      }),
      boundedTextRuntimeOwnership: "owned",
    });
    expect(badHash.status).toBe("blocked_pre_extraction_input_text_hash_mismatch");

    const oversizedText = "x".repeat(BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES + 1);
    const oversized = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        boundedTextSidecar: sidecar(oversizedText),
      }),
      boundedTextRuntimeOwnership: "owned",
    });
    expect(oversized.status).toBe("blocked_pre_extraction_input_text_oversized");

    const executionOpen = buildBoundedExtractionInputAuthorization({
      boundedTextAuthorization: boundedTextAuthorization({
        productExecution: {
          ...boundedTextAuthorization().productExecution,
          extractionInputCreated: true,
        },
      }),
      boundedTextRuntimeOwnership: "owned",
    });
    expect(executionOpen.status).toBe("blocked_pre_extraction_input_w4g_downstream_flags_open");
  });
});
