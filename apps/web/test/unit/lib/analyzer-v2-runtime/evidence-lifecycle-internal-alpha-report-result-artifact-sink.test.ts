import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { BoundaryVerdictExecutionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type { BoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import type { InternalAlphaReportStopCandidate } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  markBoundaryVerdictExecutionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance";
import {
  INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_COUNT,
  INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION,
  clearInternalAlphaReportResultRuntimeArtifacts,
  readInternalAlphaReportResultRuntimeArtifactDefaultProjections,
  readInternalAlphaReportResultRuntimeArtifacts,
  recordInternalAlphaReportResultRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink";

const STATEMENT = "Battery electric cars use electricity more directly than hydrogen cars.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function context(runIdHint = "job-v2-w8b-sink") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-20T21:00:00.000Z"),
  });
}

function parentSet() {
  return {
    boundedEvidenceExtraction: {
      decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
      decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8B_SINK",
      kind: "bounded_evidence_extraction_execution",
      status: "hidden_evidence_item_extraction_completed",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      extractionResultStatus: "accepted",
      extractionStatus: "evidence_extracted",
      extractionResult: {
        status: "accepted",
        evidenceItems: [{
          evidenceItemId: "EI_W8B_001",
          statement: STATEMENT,
        }],
      },
    } as unknown as BoundedEvidenceExtractionDecision,
    evidenceItemHandoff: {
      decisionVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
      decisionId: "EVIDENCE_ITEM_HANDOFF_W8B_SINK",
      kind: "evidence_item_handoff",
      handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      admittedEvidenceItemCount: 1,
      evidenceItemStatementHashes: [sha256Text(STATEMENT)],
      evidenceItemStatementByteLengths: [Buffer.byteLength(STATEMENT, "utf8")],
      sourceMaterialLineageHash: "1".repeat(64),
      w4hPacketHash: "2".repeat(64),
      providerId: "wikimedia_core",
      modelId: "claude-haiku-4-5-20251001",
    } as EvidenceItemHandoffDecision,
    sufficiencyIntake: {
      decisionVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
      decisionId: "SUFFICIENCY_INTAKE_W8B_SINK",
      kind: "sufficiency_intake",
      intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      parentEvidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_SINK",
    } as SufficiencyIntakeDecision,
    sufficiencyAssessment: {
      decisionVersion: "v2.evidence-lifecycle.sufficiency-assessment.w6c",
      decisionId: "SUFFICIENCY_ASSESSMENT_W8B_SINK",
      kind: "sufficiency_assessment",
      assessmentStatus: "sufficiency_assessment_completed",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      parentSufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_SINK",
      parentW5DecisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8B_SINK",
      sufficiencyResultStatus: "accepted",
      reportStopRecommendation: "continue_to_boundary_formation",
      missingEvidenceDimensionProjections: [],
    } as SufficiencyAssessmentDecision,
    boundaryVerdictCandidate: {
      decisionVersion: "v2.evidence-lifecycle.boundary-verdict-candidate.w7a",
      decisionId: "BOUNDARY_VERDICT_CANDIDATE_W8B_SINK",
      kind: "boundary_verdict_candidate_contract",
      status: "boundary_verdict_candidate_ready",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      candidatePopulation: "closed_until_llm_task_approved",
      inputLineage: {
        evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_SINK",
        sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_SINK",
        sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W8B_SINK",
      },
    } as BoundaryVerdictCandidateDecision,
    internalAlphaReportStop: {
      decisionVersion: "v2.evidence-lifecycle.internal-alpha-report-stop.w8a",
      decisionId: "INTERNAL_ALPHA_REPORT_STOP_W8B_SINK",
      kind: "internal_alpha_report_stop_candidate",
      status: "alpha_report_stop_created_not_report_ready",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      inputLineage: {
        evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_SINK",
        sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_SINK",
        sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W8B_SINK",
        boundaryVerdictCandidateDecisionId: "BOUNDARY_VERDICT_CANDIDATE_W8B_SINK",
      },
    } as InternalAlphaReportStopCandidate,
  };
}

function boundaryVerdictExecution(
  overrides: Partial<BoundaryVerdictExecutionDecision> = {},
): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.boundary-verdict-execution.w7b",
    decisionId: "BOUNDARY_VERDICT_EXECUTION_W8B_SINK",
    kind: "boundary_verdict_execution",
    status: "boundary_verdict_candidates_created_internal",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    taskKey: "boundary_verdict_execution",
    promptSectionId: "V2_BOUNDARY_VERDICT_EXECUTION",
    outputSchemaVersion: "v2.boundary_verdict_execution.0",
    inputPacketHash: "3".repeat(64),
    inputPacketByteLength: 1024,
    evidenceItemCount: 1,
    boundaryCandidateCount: 1,
    verdictCandidateCount: 1,
    citedEvidenceItemRefs: ["EI_W8B_001"],
    resultPayloadHash: "4".repeat(64),
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: "accepted",
      upstreamRecommendedNextAction: "continue_to_boundary_formation",
      boundaryVerdictIntegrityEventCount: 1,
      candidateMaterialUncertaintySignalCount: 0,
    },
    executionTelemetry: {
      gatewayTaskId: "boundary_verdict_execution",
      promptSectionId: "V2_BOUNDARY_VERDICT_EXECUTION",
      promptContentHash: "5".repeat(64),
      renderedPromptHash: "6".repeat(64),
      inputPacketHash: "3".repeat(64),
      inputPacketByteLength: 1024,
      outputSchemaVersion: "v2.boundary_verdict_execution.0",
      modelPolicyId: "v2.model.boundary_verdict_execution.w7b",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      attemptCount: 1,
      schemaRetryCount: 0,
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      durationMs: 25,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: "v2.semantic.boundary-verdict-execution.w7b",
      approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md",
    },
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      boundaryCandidateTextReturned: false,
      verdictCandidateTextReturned: false,
      warningMaterialityTextReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
    },
    sideEffects: {
      boundaryVerdictLlmCalled: true,
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
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    w7aMergeTrigger: "merge_w7a_after_w7b_verifier_stable_and_fail_closed_parity_covered",
    combinedCallQualityTrigger:
      "compare_first_successful_benchmark_family_candidate_against_best_available_boundary_comparator",
    approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md",
    ...overrides,
  } as BoundaryVerdictExecutionDecision;
}

function recordFor(runIdHint = "job-v2-w8b-sink", execution = boundaryVerdictExecution()) {
  return recordInternalAlphaReportResultRuntimeArtifact({
    context: context(runIdHint),
    ...parentSet(),
    boundaryVerdictExecution: execution,
  });
}

describe("Analyzer V2 W8-B internal Alpha report-result artifact sink", () => {
  it("records bounded admin-only report-result artifacts and default projections without raw ids or text", () => {
    const runContext = context();
    clearInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordFor(
      "job-v2-w8b-sink",
      markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution()),
    );
    const artifacts = readInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
    const projections = readInternalAlphaReportResultRuntimeArtifactDefaultProjections(
      runContext.observabilityLedger.ledgerId,
    );
    const serializedProjection = JSON.stringify(projections);

    expect(result.status).toBe("recorded");
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({
      artifactVersion: INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "admin_structured_candidate_no_source_text",
      internalAlphaReportResult: {
        status: "internal_alpha_report_result_candidate_created",
      },
    });
    expect(projections[0]).toMatchObject({
      ledgerIdReturned: false,
      runIdReturned: false,
      internalAlphaReportResult: {
        decisionIdReturned: false,
        status: "internal_alpha_report_result_candidate_created",
        evidenceTraceability: {
          citedEvidenceItemRefsReturned: false,
          citedEvidenceItemRefCount: 1,
        },
      },
    });
    expect(serializedProjection).not.toContain(runContext.observabilityLedger.ledgerId);
    expect(serializedProjection).not.toContain(runContext.runId);
    expect(serializedProjection).not.toContain("BOUNDARY_VERDICT_EXECUTION_W8B_SINK");
    expect(serializedProjection).not.toContain("EI_W8B_001");
    expect(serializedProjection).not.toContain(STATEMENT);
    expect(serializedProjection).not.toContain("reportMarkdown");
    expect(serializedProjection).not.toContain("\"truthPercentage\":");
  });

  it("records a blocked candidate when W7-B2 runtime provenance is absent", () => {
    const runContext = context("job-v2-w8b-unowned");
    clearInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    const result = recordFor("job-v2-w8b-unowned", boundaryVerdictExecution());
    const artifacts = readInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    expect(result.status).toBe("recorded");
    expect(artifacts[0]?.internalAlphaReportResult).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      blockedReason: "boundary_verdict_execution_not_runtime_owned",
    });
  });

  it("keeps records and ledgers bounded", () => {
    const runContext = context("job-v2-w8b-bounded");
    clearInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId);

    for (let index = 0; index <= INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      recordFor(
        "job-v2-w8b-bounded",
        markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution({
          decisionId: `BOUNDARY_VERDICT_EXECUTION_W8B_${index}`,
        })),
      );
    }
    expect(readInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId))
      .toHaveLength(INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_RECORDS_PER_LEDGER);

    const baseRunId = "job-v2-w8b-bounded-ledger";
    for (let index = 0; index <= INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      recordFor(
        `${baseRunId}-${index}`,
        markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution()),
      );
    }
    expect(readInternalAlphaReportResultRuntimeArtifacts(`${baseRunId}-0:precutover-observability`))
      .toEqual([]);
  });

  it("rejects invalid ledger ids and skips oversize artifacts", () => {
    const invalid = recordInternalAlphaReportResultRuntimeArtifact({
      context: {
        ...context("job-v2-w8b-invalid"),
        observabilityLedger: {
          ledgerId: " invalid-ledger ",
          status: "runtime_activation_ready",
        },
      },
      ...parentSet(),
      boundaryVerdictExecution: markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution()),
    });
    const overlongLedgerId = "x".repeat(INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_ID_LENGTH + 1);
    const overlong = recordInternalAlphaReportResultRuntimeArtifact({
      context: {
        ...context("job-v2-w8b-overlong"),
        observabilityLedger: {
          ledgerId: overlongLedgerId,
          status: "runtime_activation_ready",
        },
      },
      ...parentSet(),
      boundaryVerdictExecution: markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution()),
    });
    const oversize = recordInternalAlphaReportResultRuntimeArtifact({
      context: {
        ...context("job-v2-w8b-oversize"),
        runId: `job-v2-w8b-${"x".repeat(50_000)}`,
      },
      ...parentSet(),
      boundaryVerdictExecution: markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution()),
    });

    expect(invalid).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(overlong).toEqual({ status: "skipped_invalid_ledger_id", artifact: null });
    expect(oversize.status).toBe("skipped_artifact_oversize");
  });
});
