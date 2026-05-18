import { describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner";
import {
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts,
  readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts,
  recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink";

function context(runIdHint = "job-v2-x7w4a-readiness") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-18T13:00:00.000Z"),
  });
}

function readinessDecision(): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
    stopReason: "not_stopped",
    parent: {
      w2Status: "candidate_provider_network_completed",
      w3aStatus: "source_candidate_preview_materialized",
      w3bStatus: "source_material_page_summary_completed",
      w3bVersion: "v2.evidence-lifecycle.source-material.page-summary.x7w3b",
      w3bStopReason: "not_stopped",
    },
    sourceMaterialRecordCount: 1,
    admittedSourceMaterialRecordCount: 1,
    rejectedSourceMaterialRecordCount: 0,
    sourceMaterialRecord: {
      sourceMaterialId: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextByteLength: 90,
      sourceMaterialTextCharLength: 90,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
    },
    extractionInput: null,
    evidenceCorpus: null,
    evidenceCorpusBuildAuthorized: false,
    evidenceItems: [],
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
    downstreamGate: "evidence_corpus_build_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

async function recordFor(runIdHint = "job-v2-x7w4a-readiness") {
  return recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
    context: context(runIdHint),
    readinessDecision: readinessDecision(),
  });
}

describe("Analyzer V2 W4-A Source Material EvidenceCorpus readiness artifact sink", () => {
  it("records bounded admin-only readiness artifacts without Source Material text", async () => {
    const runContext = context();
    clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    const result = recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
      context: runContext,
      readinessDecision: readinessDecision(),
    });
    const artifacts = readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );
    const serialized = JSON.stringify(artifacts);

    expect(result.status).toBe("recorded");
    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        source: "product_v2_orchestrator_after_source_material_evidence_corpus_readiness",
        sourceMaterialEvidenceCorpusReadiness: expect.objectContaining({
          status: "source_material_structurally_admissible_evidence_corpus_gate_closed",
          extractionInput: null,
          evidenceCorpus: null,
          evidenceCorpusBuildAuthorized: false,
          evidenceItems: [],
          downstreamGate: "evidence_corpus_build_gate_closed",
        }),
        productExecution: expect.objectContaining({
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
          reportGenerated: false,
          verdictGenerated: false,
          confidenceGenerated: false,
          publicSurfaceWritten: false,
        }),
        publicCutoverStatus: "blocked_precutover",
      }),
    ]);
    expect(serialized).not.toContain("Hydrogen vehicles store hydrogen");
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("keeps artifacts defensively copied and ledger storage bounded", async () => {
    const runContext = context("job-v2-x7w4a-bounded");
    clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_RECORDS_PER_LEDGER;
      index += 1
    ) {
      await recordFor("job-v2-x7w4a-bounded");
    }
    const records = readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
      runContext.observabilityLedger.ledgerId,
    );

    expect(records).toHaveLength(
      EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_RECORDS_PER_LEDGER,
    );
    expect(Object.isFrozen(records[0]?.sourceMaterialEvidenceCorpusReadiness)).toBe(true);

    const baseRunId = "job-v2-x7w4a-bounded-store";
    for (
      let index = 0;
      index <= EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_COUNT;
      index += 1
    ) {
      await recordFor(`${baseRunId}-${index}`);
    }
    expect(readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
      `${baseRunId}-0:precutover-observability`,
    )).toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
      context: {
        ...context("job-v2-x7w4a-invalid-ledger"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      readinessDecision: readinessDecision(),
    });
    const overlongLedgerId = "x".repeat(
      EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1,
    );
    const overlong = recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
      context: {
        ...context("job-v2-x7w4a-overlong-ledger"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      readinessDecision: readinessDecision(),
    });
    const oversize = recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
      context: {
        ...context("job-v2-x7w4a-oversize"),
        runId: `job-v2-x7w4a-${"x".repeat(25_000)}`,
      },
      readinessDecision: readinessDecision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
