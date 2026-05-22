import { describe, expect, it } from "vitest";

import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_COUNT,
  INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION,
  clearInternalAlphaReportDraftRuntimeArtifacts,
  readInternalAlphaReportDraftRuntimeArtifactDefaultProjections,
  readInternalAlphaReportDraftRuntimeArtifactInspectionProjections,
  readInternalAlphaReportDraftRuntimeArtifacts,
  recordInternalAlphaReportDraftRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink";

const RESULT_HASH = "a".repeat(64);
const PAYLOAD_HASH = "b".repeat(64);
const SECRET_DRAFT_TEXT = "The cited evidence opposes the efficiency claim.";

function context(runIdHint = "job-v2-w8g-sink") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-22T00:30:00.000Z"),
  });
}

function reportResult(
  overrides: Partial<InternalAlphaReportResultCandidate> = {},
): InternalAlphaReportResultCandidate {
  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
    decisionId: "INTERNAL_ALPHA_REPORT_RESULT_W8G_SINK",
    status: "internal_alpha_report_result_candidate_created",
    inputLineage: {
      boundaryVerdictExecutionDecisionId: "BOUNDARY_VERDICT_EXECUTION_W8G_SINK",
    },
    boundaryVerdictSummary: {
      resultPayloadHash: RESULT_HASH,
    },
    ...overrides,
  } as InternalAlphaReportResultCandidate;
}

function boundaryVerdictExecution(
  overrides: Partial<BoundaryVerdictExecutionDecision> = {},
): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
    decisionId: "BOUNDARY_VERDICT_EXECUTION_W8G_SINK",
    status: "boundary_verdict_candidates_created_internal",
    resultPayloadHash: RESULT_HASH,
    internalReviewPayload: {
      payloadVersion: BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
      source: "validated_boundary_verdict_execution_result",
      boundarySetCandidate: {
        boundaries: [{
          boundaryCandidateId: "B1",
          title: "Efficiency comparison boundary",
          targetAtomicClaimIds: ["AC_001"],
          evidenceItemIds: ["EI_SECRET_W8G"],
          evidenceScopeSummary: "Vehicle efficiency evidence.",
          rationale: "The boundary groups the efficiency evidence for internal review.",
        }],
      },
      verdictSetCandidate: {
        verdictCandidates: [{
          verdictCandidateId: "V1",
          boundaryCandidateIds: ["B1"],
          targetAtomicClaimIds: ["AC_001"],
          evidenceItemIds: ["EI_SECRET_W8G"],
          internalVerdictLabelCandidate: "MOSTLY-FALSE",
          internalTruthPercentageCandidate: 15,
          internalConfidenceCandidate: 70,
          rationale: SECRET_DRAFT_TEXT,
          caveats: ["Internal Alpha draft; not public."],
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
    ...overrides,
  } as BoundaryVerdictExecutionDecision;
}

function recordFor(runIdHint = "job-v2-w8g-sink") {
  return recordInternalAlphaReportDraftRuntimeArtifact({
    context: context(runIdHint),
    internalAlphaReportResult: reportResult(),
    boundaryVerdictExecution: boundaryVerdictExecution(),
  });
}

describe("Analyzer V2 W8-G internal Alpha report draft artifact sink", () => {
  it("records bounded admin-only draft artifacts and redacts draft text by default", () => {
    const runContext = context();
    clearInternalAlphaReportDraftRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordFor();
    const artifacts = readInternalAlphaReportDraftRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const defaultProjections = readInternalAlphaReportDraftRuntimeArtifactDefaultProjections(
      runContext.observabilityLedger.ledgerId,
    );
    const inspectionProjections = readInternalAlphaReportDraftRuntimeArtifactInspectionProjections(
      runContext.observabilityLedger.ledgerId,
    );
    const serializedDefaultProjection = JSON.stringify(defaultProjections);

    expect(result.status).toBe("recorded");
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({
      artifactVersion: INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "hash_length_provenance_only",
      internalAlphaReportDraft: {
        status: "internal_alpha_report_draft_created",
      },
    });
    expect(defaultProjections[0]).toMatchObject({
      ledgerIdReturned: false,
      runIdReturned: false,
      internalAlphaReportDraft: {
        status: "internal_alpha_report_draft_created",
        draftMarkdownReturned: false,
        boundaryDraftCount: 1,
        verdictDraftCount: 1,
        citedEvidenceItemRefCount: 1,
      },
    });
    expect(inspectionProjections[0]?.internalAlphaReportDraft.draftMarkdownReturned).toBe(true);
    expect(inspectionProjections[0]?.internalAlphaReportDraft.draftMarkdown).toContain(SECRET_DRAFT_TEXT);
    expect(serializedDefaultProjection).not.toContain(runContext.observabilityLedger.ledgerId);
    expect(serializedDefaultProjection).not.toContain(runContext.runId);
    expect(serializedDefaultProjection).not.toContain("BOUNDARY_VERDICT_EXECUTION_W8G_SINK");
    expect(serializedDefaultProjection).not.toContain("EI_SECRET_W8G");
    expect(serializedDefaultProjection).not.toContain(SECRET_DRAFT_TEXT);
    expect(serializedDefaultProjection).not.toContain("\"draftMarkdown\":");
    expect(serializedDefaultProjection).not.toContain("\"truthPercentage\":");
  });

  it("keeps records and ledgers bounded", () => {
    const runContext = context("job-v2-w8g-bounded");
    clearInternalAlphaReportDraftRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (let index = 0; index <= INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      recordInternalAlphaReportDraftRuntimeArtifact({
        context: runContext,
        internalAlphaReportResult: reportResult({
          decisionId: `INTERNAL_ALPHA_REPORT_RESULT_W8G_${index}`,
        }),
        boundaryVerdictExecution: boundaryVerdictExecution(),
      });
    }
    expect(readInternalAlphaReportDraftRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toHaveLength(INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-w8g-bounded-ledger";
    for (let index = 0; index <= INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      recordFor(`${baseRunId}-${index}`);
    }
    expect(readInternalAlphaReportDraftRuntimeArtifacts(`${baseRunId}-0:precutover-observability`))
      .toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordInternalAlphaReportDraftRuntimeArtifact({
      context: {
        ...context("job-v2-w8g-invalid"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
    });
    const overlongLedgerId = "x".repeat(INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1);
    const overlong = recordInternalAlphaReportDraftRuntimeArtifact({
      context: {
        ...context("job-v2-w8g-overlong"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
    });
    const oversize = recordInternalAlphaReportDraftRuntimeArtifact({
      context: {
        ...context("job-v2-w8g-oversize"),
        runId: `job-v2-w8g-${"x".repeat(70_000)}`,
      },
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
