import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_VERSION,
  clearEvidenceLifecycleExtractionInputRuntimeArtifacts,
  readEvidenceLifecycleExtractionInputRuntimeArtifactDefaultProjections,
  readEvidenceLifecycleExtractionInputRuntimeArtifacts,
  recordEvidenceLifecycleExtractionInputRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink";
import type {
  EvidenceLifecycleExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner";

const TEXT = "Hidden extraction input packet text retained only in the runtime artifact sink.";

function context(runId = "job-v2-x7w4h-sink") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T13:15:00.000Z"),
  });
}

function authorization(text = TEXT): EvidenceLifecycleExtractionInputAuthorizationDecision {
  const textByteLength = Buffer.byteLength(text, "utf8");
  return {
    decisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "bounded_extraction_input_packet_created_extraction_execution_closed",
    stopReason: "not_stopped",
    parent: {
      boundedTextDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
      boundedTextStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
      boundedTextStopReason: "not_stopped",
      boundedTextRuntimeOwnership: "owned",
      boundedTextSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      boundedTextSidecarKind: "bounded_text_sidecar",
      boundedTextSidecarId: "EVIDENCE_CORPUS_BOUNDED_TEXT_0123456789ABCDEF",
      linkedEvidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      textHash: "0".repeat(64),
      textByteLength,
      maxTextBytes: 4096,
    },
    boundedTextSidecarCount: 1,
    extractionInputPacketCount: 1,
    extractionInputPacket: {
      packetVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h",
      packetId: "BOUNDED_EXTRACTION_INPUT_0123456789ABCDEF",
      kind: "bounded_text_extraction_input_packet",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      source: "w4g_bounded_text_sidecar",
      parentDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
      parentStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
      parentSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      parentSidecarId: "EVIDENCE_CORPUS_BOUNDED_TEXT_0123456789ABCDEF",
      linkedEvidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      inputText: text,
      inputTextHash: "0".repeat(64),
      inputTextByteLength: textByteLength,
      inputTextCharLength: Array.from(text).length,
      maxInputTextBytes: 4096,
      truncationApplied: false,
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: textByteLength,
      sourceMaterialTextCharLength: Array.from(text).length,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      parserExecuted: false,
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      evidenceItems: [],
      publicCutoverStatus: "blocked_precutover",
    },
    evidenceCorpus: null,
    evidenceItems: [],
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_execution_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedTextSidecarObserved: true,
      boundedExtractionInputPacketCreated: true,
      providerLineagePreserved: true,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
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

afterEach(() => {
  clearEvidenceLifecycleExtractionInputRuntimeArtifacts(context().observabilityLedger.ledgerId);
});

describe("bounded extraction-input runtime artifact sink", () => {
  it("records packet text internally but redacts it from default projections", () => {
    const runContext = context();
    clearEvidenceLifecycleExtractionInputRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const result = recordEvidenceLifecycleExtractionInputRuntimeArtifact({
      context: runContext,
      extractionInputAuthorization: authorization(),
    });

    expect(result.status).toBe("recorded");
    const full = readEvidenceLifecycleExtractionInputRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const redacted = readEvidenceLifecycleExtractionInputRuntimeArtifactDefaultProjections(
      runContext.observabilityLedger.ledgerId,
    );
    expect(full).toHaveLength(1);
    expect(full[0]).toMatchObject({
      artifactVersion: EVIDENCE_LIFECYCLE_EXTRACTION_INPUT_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      productExecution: {
        boundedExtractionInputPacketCreated: true,
        extractionExecutionAuthorized: false,
        evidenceItemGenerated: false,
        publicSurfaceWritten: false,
      },
    });
    expect(full[0].extractionInputAuthorization.extractionInputPacket?.inputText).toBe(TEXT);
    expect(redacted[0].extractionInputAuthorization.extractionInputPacket).toMatchObject({
      inputTextHash: "0".repeat(64),
      inputTextByteLength: Buffer.byteLength(TEXT, "utf8"),
      sourceMaterialTextHash: "0".repeat(64),
      textAccess: "redacted_default_hash_length_provenance_only",
      inputTextReturned: false,
    });
    expect(
      Object.prototype.hasOwnProperty.call(
        redacted[0].extractionInputAuthorization.extractionInputPacket ?? {},
        "inputText",
      ),
    ).toBe(false);
    expect(JSON.stringify(redacted)).not.toContain(TEXT);
  });

  it("fails closed for invalid ledgers and oversized artifacts", () => {
    const invalidContext = {
      ...context(),
      observabilityLedger: { ledgerId: " bad ledger " },
    };
    expect(recordEvidenceLifecycleExtractionInputRuntimeArtifact({
      context: invalidContext,
      extractionInputAuthorization: authorization(),
    }).status).toBe("skipped_invalid_ledger_id");

    const runContext = context("job-v2-x7w4h-sink-oversize");
    const result = recordEvidenceLifecycleExtractionInputRuntimeArtifact({
      context: runContext,
      extractionInputAuthorization: authorization("x".repeat(60_000)),
    });
    expect(result.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleExtractionInputRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )).toEqual([]);
  });
});
