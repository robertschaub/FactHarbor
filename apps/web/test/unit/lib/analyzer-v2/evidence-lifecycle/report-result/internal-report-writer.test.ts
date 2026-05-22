import { describe, expect, it } from "vitest";

import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  AGGREGATION_NARRATIVE_SCHEMA_VERSION,
  type AggregationNarrativeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import {
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import {
  INTERNAL_REPORT_WRITER_DECISION_VERSION,
  runInternalReportWriterRuntime,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

const RESULT_HASH = "a".repeat(64);
const PAYLOAD_HASH = "b".repeat(64);

function context() {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-hj18-core",
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-22T06:00:00.000Z"),
    runtimeActivationStatus: "enabled_hidden_direct_text",
    queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
  });
}

function reportResult(): InternalAlphaReportResultCandidate {
  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
    decisionId: "INTERNAL_ALPHA_REPORT_RESULT_HJ18_TEST",
    status: "internal_alpha_report_result_candidate_created",
    inputLineage: {
      boundaryVerdictExecutionDecisionId: "BOUNDARY_VERDICT_EXECUTION_HJ18_TEST",
    },
    boundaryVerdictSummary: {
      resultPayloadHash: RESULT_HASH,
    },
    reportReadiness: {
      reportQualityStatus: "internal_alpha_review_candidate_not_public_report",
    },
  } as InternalAlphaReportResultCandidate;
}

function boundaryVerdictExecution(): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
    decisionId: "BOUNDARY_VERDICT_EXECUTION_HJ18_TEST",
    status: "boundary_verdict_candidates_created_internal",
    resultPayloadHash: RESULT_HASH,
    internalReviewPayload: {
      payloadVersion: BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
      source: "validated_boundary_verdict_execution_result",
      boundarySetCandidate: {
        boundaries: [{
          boundaryCandidateId: "B1",
          title: "Whole-path efficiency comparison",
          targetAtomicClaimIds: ["AC_001"],
          evidenceItemIds: ["EI_1"],
          evidenceScopeSummary: "Direct whole-path efficiency evidence.",
          rationale: "This boundary compares the relevant efficiency frame.",
        }],
      },
      verdictSetCandidate: {
        verdictCandidates: [{
          verdictCandidateId: "V1",
          boundaryCandidateIds: ["B1"],
          targetAtomicClaimIds: ["AC_001"],
          evidenceItemIds: ["EI_1"],
          internalVerdictLabelCandidate: "FALSE",
          internalTruthPercentageCandidate: 15,
          internalConfidenceCandidate: 72,
          rationale: "The cited evidence says the claim direction is not supported.",
          caveats: ["Internal Alpha report; not public."],
          materialUncertaintySignals: ["Evidence portfolio remains limited."],
        }],
      },
      warningMaterialityInputs: {
        upstreamSufficiencyStatus: "caveated",
        upstreamRecommendedNextAction: "caveat_report",
        boundaryVerdictIntegrityEventCount: 0,
        candidateMaterialUncertaintySignalCount: 1,
        userVisibleWarningPublication: "closed",
      },
      integrityEventCount: 0,
      payloadByteLength: 1024,
      payloadHash: PAYLOAD_HASH,
      defaultProjectionReturned: false,
      sourceTextReturned: false,
      evidenceItemTextReturned: false,
      promptTextReturned: false,
      providerPayloadReturned: false,
    },
  } as BoundaryVerdictExecutionDecision;
}

function acceptedOutput(
  overrides: Partial<Extract<AggregationNarrativeResult, { status: "accepted" }>> = {},
): AggregationNarrativeResult {
  return {
    schemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    taskKey: "aggregation_narrative",
    status: "accepted",
    reportTitle: "Internal Alpha Report",
    executiveSummary: "The internal verdict candidate rejects the claim in the relevant efficiency frame.",
    verdictSections: [{
      verdictCandidateId: "V1",
      boundaryCandidateIds: ["B1"],
      evidenceItemIds: ["EI_1"],
      verdictLabel: "FALSE",
      truthPercentage: 15,
      confidence: 72,
      narrative: "The accepted internal verdict candidate is false-side and cites EI_1.",
      caveats: ["Internal Alpha report; not public."],
      materialUncertaintySignals: ["Evidence portfolio remains limited."],
    }],
    boundarySections: [{
      boundaryCandidateId: "B1",
      title: "Whole-path efficiency comparison",
      evidenceItemIds: ["EI_1"],
      narrative: "The boundary is the whole-path efficiency comparison.",
    }],
    limitations: ["Public projection is closed."],
    citationMap: [{
      evidenceItemId: "EI_1",
      usedFor: "Top verdict section",
    }],
    reportMarkdown: "# Internal Alpha Report\n\nThe internal verdict candidate is FALSE and cites EI_1.\n",
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
    ...overrides,
  };
}

function acceptedVerdictSection(): Extract<AggregationNarrativeResult, { status: "accepted" }>["verdictSections"][number] {
  const output = acceptedOutput();
  if (output.status !== "accepted") {
    throw new Error("Expected accepted output.");
  }
  return output.verdictSections[0];
}

describe("HJ18 internal report writer runtime", () => {
  it("creates one hidden internal report-writer draft while preserving verdict values and citations", async () => {
    const decision = await runInternalReportWriterRuntime({
      context: context(),
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
      renderedPrompt: "rendered prompt",
      promptContentHash: "c".repeat(64),
      configSnapshotHash: "d".repeat(64),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      providerCall: async () => ({
        output: acceptedOutput(),
        telemetry: {
          providerId: "anthropic",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 100,
          outputTokens: 80,
          totalTokens: 180,
          durationMs: 1200,
        },
      }),
    });

    expect(decision).toMatchObject({
      decisionVersion: INTERNAL_REPORT_WRITER_DECISION_VERSION,
      kind: "internal_report_writer",
      status: "internal_report_writer_draft_created",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      aggregationNarrativeResultStatus: "accepted",
      reportMarkdownByteLength: expect.any(Number),
      verdictSectionCount: 1,
      boundarySectionCount: 1,
      citedEvidenceItemRefCount: 1,
      reportReviewReadiness: "ready_for_internal_report_review",
    });
    expect(decision.reportMarkdown).toContain("FALSE");
    expect(decision.reportMarkdownHash).toMatch(/^[a-f0-9]{64}$/);
    expect(decision.sideEffects).toMatchObject({
      reportProseLlmCalled: true,
      promptLoaded: true,
      promptRendered: true,
      modelCalled: true,
      publicReportGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      parserExecuted: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    });
    expect(decision.redaction.reportMarkdownReturnedByDefault).toBe(false);
    expect(decision.redaction.publicVerdictReturned).toBe(false);
  });

  it("fails closed when the report writer mutates a verdict value", async () => {
    const decision = await runInternalReportWriterRuntime({
      context: context(),
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
      renderedPrompt: "rendered prompt",
      promptContentHash: "c".repeat(64),
      configSnapshotHash: "d".repeat(64),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      providerCall: async () => ({
        output: acceptedOutput({
          verdictSections: [{
            ...acceptedVerdictSection(),
            verdictLabel: "TRUE",
          }],
        }),
        telemetry: {
          providerId: "anthropic",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 100,
          outputTokens: 80,
          totalTokens: 180,
          durationMs: 1200,
        },
      }),
    });

    expect(decision.status).toBe("internal_report_writer_damaged");
    expect(decision.damagedReason).toBe("verdict_value_mismatch");
    expect(decision.reportMarkdown).toBeNull();
  });

  it("fails closed when the report writer invents a citation id", async () => {
    const decision = await runInternalReportWriterRuntime({
      context: context(),
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
      renderedPrompt: "rendered prompt",
      promptContentHash: "c".repeat(64),
      configSnapshotHash: "d".repeat(64),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      providerCall: async () => ({
        output: acceptedOutput({
          citationMap: [{ evidenceItemId: "EI_UNKNOWN", usedFor: "Invented citation" }],
        }),
        telemetry: {
          providerId: "anthropic",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 100,
          outputTokens: 80,
          totalTokens: 180,
          durationMs: 1200,
        },
      }),
    });

    expect(decision.status).toBe("internal_report_writer_damaged");
    expect(decision.damagedReason).toBe("unsupported_citation_id");
    expect(decision.reportMarkdown).toBeNull();
  });

  it("blocks before execution when W8-B has not created an internal report result", async () => {
    const decision = await runInternalReportWriterRuntime({
      context: context(),
      internalAlphaReportResult: null,
      boundaryVerdictExecution: boundaryVerdictExecution(),
      renderedPrompt: "",
      promptContentHash: "",
      configSnapshotHash: "d".repeat(64),
      providerCall: async () => {
        throw new Error("provider should not be called");
      },
    });

    expect(decision.status).toBe("internal_report_writer_blocked");
    expect(decision.blockedReason).toBe("internal_alpha_report_result_missing");
    expect(decision.sideEffects.modelCalled).toBe(false);
  });
});
