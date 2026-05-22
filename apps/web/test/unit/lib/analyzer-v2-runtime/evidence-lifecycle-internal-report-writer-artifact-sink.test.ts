import { describe, expect, it } from "vitest";

import {
  AGGREGATION_NARRATIVE_SCHEMA_VERSION,
  type AggregationNarrativeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import {
  INTERNAL_REPORT_WRITER_DECISION_VERSION,
  type InternalReportWriterDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_COUNT,
  INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  INTERNAL_REPORT_WRITER_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  INTERNAL_REPORT_WRITER_ARTIFACT_VERSION,
  clearInternalReportWriterRuntimeArtifacts,
  readInternalReportWriterRuntimeArtifactDefaultProjections,
  readInternalReportWriterRuntimeArtifactInspectionProjections,
  readInternalReportWriterRuntimeArtifacts,
  recordInternalReportWriterRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink";

const SECRET_REPORT_MARKDOWN = "# Internal Alpha Report\n\nThis text is returned only by explicit inspection.\n";

function context(runIdHint = "job-v2-hj18-sink") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-22T06:30:00.000Z"),
  });
}

function acceptedResult(): AggregationNarrativeResult {
  return {
    schemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    taskKey: "aggregation_narrative",
    status: "accepted",
    reportTitle: "Internal Alpha Report",
    executiveSummary: "Internal summary.",
    verdictSections: [{
      verdictCandidateId: "V1",
      boundaryCandidateIds: ["B1"],
      evidenceItemIds: ["EI_SECRET_HJ18"],
      verdictLabel: "FALSE",
      truthPercentage: 15,
      confidence: 72,
      narrative: "Internal verdict narrative.",
      caveats: ["Internal only."],
      materialUncertaintySignals: ["Limited corpus."],
    }],
    boundarySections: [{
      boundaryCandidateId: "B1",
      title: "Boundary",
      evidenceItemIds: ["EI_SECRET_HJ18"],
      narrative: "Internal boundary narrative.",
    }],
    limitations: ["Internal only."],
    citationMap: [{
      evidenceItemId: "EI_SECRET_HJ18",
      usedFor: "Internal report citation.",
    }],
    reportMarkdown: SECRET_REPORT_MARKDOWN,
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function decision(overrides: Partial<InternalReportWriterDecision> = {}): InternalReportWriterDecision {
  return {
    decisionVersion: INTERNAL_REPORT_WRITER_DECISION_VERSION,
    decisionId: "INTERNAL_REPORT_WRITER_HJ18_SINK",
    kind: "internal_report_writer",
    status: "internal_report_writer_draft_created",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    taskKey: "aggregation_narrative",
    promptSectionId: "V2_AGGREGATION_NARRATIVE",
    outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    parent: {
      internalAlphaReportResultVersion: "v2.evidence-lifecycle.internal-alpha-report-result.w8b",
      internalAlphaReportResultStatus: "internal_alpha_report_result_candidate_created",
      internalAlphaReportResultDecisionHash: "a".repeat(64),
      boundaryVerdictExecutionStatus: "boundary_verdict_candidates_created_internal",
      boundaryVerdictExecutionDecisionHash: "b".repeat(64),
      boundaryVerdictExecutionResultPayloadHash: "c".repeat(64),
      boundaryVerdictExecutionReviewPayloadHash: "d".repeat(64),
    },
    inputPacketHash: "e".repeat(64),
    inputPacketByteLength: 512,
    aggregationNarrativeResult: acceptedResult(),
    aggregationNarrativeResultHash: "f".repeat(64),
    aggregationNarrativeResultStatus: "accepted",
    reportMarkdown: SECRET_REPORT_MARKDOWN,
    reportMarkdownHash: "1".repeat(64),
    reportMarkdownByteLength: Buffer.byteLength(SECRET_REPORT_MARKDOWN, "utf8"),
    verdictSectionCount: 1,
    boundarySectionCount: 1,
    citedEvidenceItemRefCount: 1,
    citedEvidenceItemRefHashes: ["2".repeat(64)],
    reportReviewReadiness: "ready_for_internal_report_review",
    redaction: {
      reportMarkdownReturnedByDefault: false,
      sourceTextReturned: false,
      evidenceItemTextReturned: false,
      inputTextReturned: false,
      promptTextReturned: false,
      providerPayloadReturned: false,
      hiddenLedgerReferenceReturned: false,
      publicVerdictReturned: false,
      publicTruthPercentageReturned: false,
      publicConfidenceReturned: false,
      publicWarningReturned: false,
    },
    executionTelemetry: {
      gatewayTaskId: "aggregation_narrative",
      promptSectionId: "V2_AGGREGATION_NARRATIVE",
      promptContentHash: "3".repeat(64),
      renderedPromptHash: "4".repeat(64),
      inputPacketHash: "e".repeat(64),
      inputPacketByteLength: 512,
      outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
      schemaDiagnostics: null,
      modelPolicyId: "v2.model.aggregation_narrative.hj18",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      attemptCount: 1,
      schemaRetryCount: 0,
      tokenUsage: { inputTokens: 100, outputTokens: 80, totalTokens: 180 },
      durationMs: 1200,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: "v2.semantic.aggregation-narrative.hj18",
      approvalPointer: "Docs/WIP/2026-05-22_V2_HighJump_HJ18_Internal_Report_Writer.md",
    },
    sideEffects: {
      reportProseLlmCalled: true,
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      parserExecuted: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
      publicReportGenerated: false,
      publicSurfaceWritten: false,
      compatibilityProjectionWritten: false,
      verdictPublished: false,
      warningPublished: false,
      confidencePublished: false,
      truthPercentagePublished: false,
    },
    w8gMergeTrigger:
      "merge_w8g_after_hj18_report_writer_review_accepts_output_shape_and_fail_closed_parity",
    approvalPointer: "Docs/WIP/2026-05-22_V2_HighJump_HJ18_Internal_Report_Writer.md",
    ...overrides,
  };
}

function recordFor(runIdHint = "job-v2-hj18-sink") {
  return recordInternalReportWriterRuntimeArtifact({
    context: context(runIdHint),
    decision: decision(),
  });
}

describe("Analyzer V2 HJ18 internal report writer artifact sink", () => {
  it("records bounded admin-only report-writer artifacts and redacts report markdown by default", () => {
    const runContext = context();
    clearInternalReportWriterRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordFor();
    const artifacts = readInternalReportWriterRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const defaultProjections = readInternalReportWriterRuntimeArtifactDefaultProjections(
      runContext.observabilityLedger.ledgerId,
    );
    const inspectionProjections = readInternalReportWriterRuntimeArtifactInspectionProjections(
      runContext.observabilityLedger.ledgerId,
    );
    const serializedDefaultProjection = JSON.stringify(defaultProjections);

    expect(result.status).toBe("recorded");
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({
      artifactVersion: INTERNAL_REPORT_WRITER_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "hash_length_provenance_only",
      internalReportWriter: {
        status: "internal_report_writer_draft_created",
      },
    });
    expect(defaultProjections[0]).toMatchObject({
      ledgerIdReturned: false,
      runIdReturned: false,
      internalReportWriter: {
        status: "internal_report_writer_draft_created",
        reportMarkdownReturned: false,
        reportMarkdownByteLength: Buffer.byteLength(SECRET_REPORT_MARKDOWN, "utf8"),
        verdictSectionCount: 1,
        boundarySectionCount: 1,
        citedEvidenceItemRefCount: 1,
      },
    });
    expect(inspectionProjections[0]?.internalReportWriter.reportMarkdownReturned).toBe(true);
    expect(inspectionProjections[0]?.internalReportWriter.reportMarkdown).toContain(SECRET_REPORT_MARKDOWN);
    expect(serializedDefaultProjection).not.toContain(runContext.observabilityLedger.ledgerId);
    expect(serializedDefaultProjection).not.toContain(runContext.runId);
    expect(serializedDefaultProjection).not.toContain("INTERNAL_REPORT_WRITER_HJ18_SINK");
    expect(serializedDefaultProjection).not.toContain("EI_SECRET_HJ18");
    expect(serializedDefaultProjection).not.toContain(SECRET_REPORT_MARKDOWN);
    expect(serializedDefaultProjection).not.toContain("\"reportMarkdown\":");
    expect(serializedDefaultProjection).not.toContain("\"truthPercentage\":");
  });

  it("keeps records and ledgers bounded", () => {
    const runContext = context("job-v2-hj18-bounded");
    clearInternalReportWriterRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (let index = 0; index <= INTERNAL_REPORT_WRITER_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      recordInternalReportWriterRuntimeArtifact({
        context: runContext,
        decision: decision({ decisionId: `INTERNAL_REPORT_WRITER_HJ18_${index}` }),
      });
    }
    expect(readInternalReportWriterRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toHaveLength(INTERNAL_REPORT_WRITER_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-hj18-bounded-ledger";
    for (let index = 0; index <= INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      recordFor(`${baseRunId}-${index}`);
    }
    expect(readInternalReportWriterRuntimeArtifacts(`${baseRunId}-0:precutover-observability`))
      .toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordInternalReportWriterRuntimeArtifact({
      context: {
        ...context("job-v2-hj18-invalid"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      decision: decision(),
    });
    const overlongLedgerId = "x".repeat(INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1);
    const overlong = recordInternalReportWriterRuntimeArtifact({
      context: {
        ...context("job-v2-hj18-overlong"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      decision: decision(),
    });
    const oversize = recordInternalReportWriterRuntimeArtifact({
      context: {
        ...context("job-v2-hj18-oversize"),
        runId: `job-v2-hj18-${"x".repeat(70_000)}`,
      },
      decision: decision(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
