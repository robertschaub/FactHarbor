import { describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner";
import type {
  EvidenceLifecycleEvidenceCorpusShellDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner";
import type {
  EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner";
import {
  EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION,
  clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts,
  readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts,
  recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink";

function context(runIdHint = "job-v2-x7w4f-observability") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T18:10:00.000Z"),
  });
}

function admissionDecision(): EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision {
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
      corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 90,
      sourceMaterialTextCharLength: 90,
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
  };
}

function shellDecision(): EvidenceLifecycleEvidenceCorpusShellDecision {
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
      evidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      kind: "shell_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      sourceMaterialRefs: ["SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF"],
      locatorRefs: ["OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456"],
      candidatePreviewIds: ["SOURCE_CANDIDATE_PREVIEW_1_1"],
      providerIds: ["wikimedia_core"],
      sourceMaterialEndpointIds: ["ep_wikimedia_project_page_summary"],
      languageCodes: ["en"],
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
      sourceMaterialTextHashes: ["0".repeat(64)],
      aggregateSourceMaterialTextByteLength: 90,
      aggregateSourceMaterialTextCharLength: 90,
      admissionLineage: {
        admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
        admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
        admissionStopReason: "not_stopped",
        corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
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
  };
}

function denialDecision(): EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision {
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
      evidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
    },
    parentAdmissionLineage: {
      admissionDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c",
      admissionStatus: "source_material_admitted_to_corpus_input_gate_closed",
      corpusAdmissionInputId: "CORPUS_ADMISSION_INPUT_0123456789ABCDEF",
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
  };
}

function recordFor(runIdHint = "job-v2-x7w4f-observability") {
  return recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact({
    context: context(runIdHint),
    sourceMaterialAdmission: admissionDecision(),
    evidenceCorpusShell: shellDecision(),
    extractionReadinessDenial: denialDecision(),
  });
}

describe("Analyzer V2 W4-F EvidenceCorpus observability artifact sink", () => {
  it("records bounded admin-only W4-C/W4-D/W4-E chain artifacts without source text", () => {
    const runContext = context();
    clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordFor();
    const artifacts = readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_evidence_corpus_extraction_readiness_denial",
        evidenceCorpusSourceMaterialAdmission: expect.objectContaining({
          status: "source_material_admitted_to_corpus_input_gate_closed",
          evidenceCorpus: null,
          extractionInput: null,
          evidenceItems: [],
        }),
        evidenceCorpusShell: expect.objectContaining({
          status: "evidence_corpus_shell_created_extraction_gate_closed",
          evidenceItems: [],
          extractionInput: null,
          evidenceCorpus: expect.objectContaining({
            kind: "shell_only",
            corpusTextAccess: "closed",
          }),
        }),
        evidenceCorpusExtractionReadinessDenial: expect.objectContaining({
          status: "extraction_denied_shell_only",
          stopReason: "shell_only_corpus",
          extractionInput: null,
          evidenceItems: [],
        }),
        productExecution: {
          sourceMaterialReadinessObserved: true,
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
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    expect(serialized).not.toContain("Neutral source material text");
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("rawProviderJson");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("keeps artifacts defensively copied and ledger storage bounded", () => {
    const runContext = context("job-v2-x7w4f-bounded");
    clearEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      recordFor("job-v2-x7w4f-bounded");
    }
    const records = readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    expect(records).toHaveLength(EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_RECORDS_PER_LEDGER);
    expect(Object.isFrozen(records[0]?.evidenceCorpusSourceMaterialAdmission)).toBe(true);
    expect(Object.isFrozen(records[0]?.evidenceCorpusShell)).toBe(true);
    expect(Object.isFrozen(records[0]?.evidenceCorpusExtractionReadinessDenial)).toBe(true);

    const baseRunId = "job-v2-x7w4f-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      recordFor(`${baseRunId}-${index}`);
    }
    expect(readEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact({
      context: {
        ...context("job-v2-x7w4f-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      sourceMaterialAdmission: admissionDecision(),
      evidenceCorpusShell: shellDecision(),
      extractionReadinessDenial: denialDecision(),
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_EVIDENCE_CORPUS_OBSERVABILITY_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact({
      context: {
        ...context("job-v2-x7w4f-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      sourceMaterialAdmission: admissionDecision(),
      evidenceCorpusShell: shellDecision(),
      extractionReadinessDenial: denialDecision(),
    });
    const oversize = recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact({
      context: {
        ...context("job-v2-x7w4f-oversize"),
        runId: `job-v2-x7w4f-${"x".repeat(50_000)}`,
      },
      sourceMaterialAdmission: admissionDecision(),
      evidenceCorpusShell: shellDecision(),
      extractionReadinessDenial: denialDecision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
