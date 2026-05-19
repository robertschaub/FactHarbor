import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_VERSION,
  clearEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts,
  readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifactDefaultProjections,
  readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts,
  recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink";
import type {
  EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner";

const TEXT = "Hidden bounded corpus text retained only in the runtime artifact sink.";

function context(runId = "job-v2-x7w4g-sink") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T10:45:00.000Z"),
  });
}

function authorization(text = TEXT): EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision {
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
    boundedTextSidecar: {
      sidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      boundedTextSidecarId: "EVIDENCE_CORPUS_BOUNDED_TEXT_0123456789ABCDEF",
      kind: "bounded_text_sidecar",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      linkedEvidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      linkedEvidenceCorpusShellVersion: "v2.evidence-lifecycle.evidence-corpus.shell.x7w4d",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      textKind: "bounded_page_summary_extract_text",
      text,
      textHash: "0".repeat(64),
      textByteLength: Buffer.byteLength(text, "utf8"),
      textCharLength: Array.from(text).length,
      maxTextBytes: 4096,
      truncationApplied: false,
      sourceMaterialRecordVersion: "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b",
      sourceMaterialTextHash: "0".repeat(64),
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
    },
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

afterEach(() => {
  clearEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(context().observabilityLedger.ledgerId);
});

describe("EvidenceCorpus bounded-text runtime artifact sink", () => {
  it("records bounded text internally but redacts text from default projections", () => {
    const runContext = context();
    clearEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const result = recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact({
      context: runContext,
      boundedTextAuthorization: authorization(),
    });

    expect(result.status).toBe("recorded");
    const full = readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const redacted = readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifactDefaultProjections(
      runContext.observabilityLedger.ledgerId,
    );
    expect(full).toHaveLength(1);
    expect(full[0]).toMatchObject({
      artifactVersion: EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_BOUNDED_TEXT_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      productExecution: {
        boundedCorpusTextAuthorized: true,
        sourceTextAuthorized: false,
        extractionInputCreated: false,
        evidenceItemGenerated: false,
        publicSurfaceWritten: false,
      },
    });
    expect(full[0].boundedTextAuthorization.boundedTextSidecar?.text).toBe(TEXT);
    expect(redacted[0].boundedTextAuthorization.boundedTextSidecar).toMatchObject({
      textHash: "0".repeat(64),
      textByteLength: Buffer.byteLength(TEXT, "utf8"),
      sourceMaterialTextHash: "0".repeat(64),
      textAccess: "redacted_default_hash_length_provenance_only",
      textReturned: false,
    });
    expect(
      Object.prototype.hasOwnProperty.call(redacted[0].boundedTextAuthorization.boundedTextSidecar ?? {}, "text"),
    ).toBe(false);
    expect(JSON.stringify(redacted)).not.toContain(TEXT);
  });

  it("fails closed for invalid ledgers and oversized artifacts", () => {
    const invalidContext = {
      ...context(),
      observabilityLedger: { ledgerId: " bad ledger " },
    };
    expect(recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact({
      context: invalidContext,
      boundedTextAuthorization: authorization(),
    }).status).toBe("skipped_invalid_ledger_id");

    const runContext = context("job-v2-x7w4g-sink-oversize");
    const result = recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact({
      context: runContext,
      boundedTextAuthorization: authorization("x".repeat(60_000)),
    });
    expect(result.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    )).toEqual([]);
  });
});
