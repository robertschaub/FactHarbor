import { describe, expect, it } from "vitest";

import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  buildInternalAlphaReportDraftDecision,
  INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-draft";
import {
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";

const RESULT_HASH = "a".repeat(64);
const PAYLOAD_HASH = "b".repeat(64);

function reportResult(overrides: Partial<InternalAlphaReportResultCandidate> = {}): InternalAlphaReportResultCandidate {
  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
    decisionId: "INTERNAL_ALPHA_REPORT_RESULT_TEST",
    kind: "internal_alpha_report_result_candidate",
    status: "internal_alpha_report_result_candidate_created",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "admin_structured_candidate_no_source_text",
    inputLineage: {
      boundedEvidenceExtractionDecisionId: "W5",
      boundedEvidenceExtractionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
      boundedEvidenceExtractionProjectionHash: null,
      evidenceItemHandoffDecisionId: "W5F",
      evidenceItemHandoffVersion: "v2.evidence-lifecycle.evidence-item-handoff.w5f",
      evidenceItemHandoffProjectionHash: null,
      sufficiencyIntakeDecisionId: "W6B",
      sufficiencyIntakeVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
      sufficiencyIntakeProjectionHash: null,
      sufficiencyAssessmentDecisionId: "W6C",
      sufficiencyAssessmentVersion: "v2.evidence-lifecycle.sufficiency-assessment.w6c",
      sufficiencyAssessmentProjectionHash: null,
      boundaryVerdictCandidateDecisionId: "W7A",
      boundaryVerdictCandidateVersion: "v2.evidence-lifecycle.boundary-verdict-candidate.w7a",
      boundaryVerdictCandidateProjectionHash: null,
      internalAlphaReportStopDecisionId: "W8A",
      internalAlphaReportStopVersion: "v2.evidence-lifecycle.internal-alpha-report-stop.w8a",
      internalAlphaReportStopProjectionHash: null,
      boundaryVerdictExecutionDecisionId: "BOUNDARY_VERDICT_EXECUTION_TEST",
      boundaryVerdictExecutionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
      boundaryVerdictExecutionProjectionHash: null,
      boundaryVerdictExecutionInputPacketHash: "c".repeat(64),
      boundaryVerdictExecutionParentIdsExposed: false,
    },
    reportReadiness: {
      publicCutoverStatus: "blocked_precutover",
      publicCutoverStatusOwnership: "mirror_only_not_source_of_truth",
      reportQualityStatus: "internal_alpha_review_candidate_not_public_report",
      reportCompleteness: "internal_candidate_summary_only",
      comparatorReviewReadiness: "ready_for_internal_comparator_review",
      compatibilityProjection: "closed_precutover_report_damaged",
    },
    boundaryVerdictSummary: {
      boundaryVerdictExecutionStatus: "boundary_verdict_candidates_created_internal",
      boundaryCandidateCount: 1,
      verdictCandidateCount: 1,
      resultPayloadHash: RESULT_HASH,
      inputPacketHash: "c".repeat(64),
      inputPacketByteLength: 512,
    },
    evidenceTraceability: {
      traceabilitySource: "post_execution_cited_refs",
      fieldSurfaceLimitation: "w7b2_exposes_post_execution_cited_refs_but_not_full_parent_input_packet",
      evidenceItemCount: 1,
      inputEvidenceItemIdRefHashes: [],
      inputEvidenceItemStatementHashes: [],
      inputEvidenceItemStatementByteLengths: [],
      citedEvidenceItemRefCount: 1,
      citedEvidenceItemRefHashes: [],
      citedEvidenceItemRefsReturned: false,
      evidenceItemTextReturned: false,
    },
    upstreamStopAttribution: {
      attributionVersion: "v2.evidence-lifecycle.internal-alpha-report-result.upstream-stop-attribution.w8e",
      firstIncompleteStage: "none",
      firstIncompleteReason: null,
      parentStatuses: {
        boundedEvidenceExtraction: {
          status: "hidden_evidence_item_extraction_completed",
          extractionResultStatus: "accepted",
          extractionStatus: "evidence_extracted",
          evidenceItemCount: 1,
        },
        evidenceItemHandoff: {
          handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
          admittedEvidenceItemCount: 1,
        },
        sufficiencyIntake: {
          intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
        },
        sufficiencyAssessment: {
          assessmentStatus: "sufficiency_assessment_completed",
          blockedReason: null,
          damagedReason: null,
          sufficiencyResultStatus: "accepted",
          reportStopRecommendation: "caveat_report",
          admittedEvidenceItemCount: 1,
          schemaDiagnostics: null,
        },
        boundaryVerdictCandidate: {
          status: "boundary_verdict_candidate_ready",
          candidatePopulation: "closed_until_llm_task_approved",
        },
        internalAlphaReportStop: {
          status: "alpha_report_stop_created_not_report_ready",
        },
        boundaryVerdictExecution: {
          status: "boundary_verdict_candidates_created_internal",
          runtimeOwnership: "owned",
          boundaryCandidateCount: 1,
          verdictCandidateCount: 1,
          citedEvidenceItemRefCount: 1,
          schemaDiagnostics: null,
        },
      },
      redaction: {
        sourceTextReturned: false,
        evidenceItemTextReturned: false,
        inputTextReturned: false,
        promptTextReturned: false,
        providerPayloadReturned: false,
        hiddenLedgerReferenceReturned: false,
        rawInternalStateReturned: false,
      },
    },
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: "caveated",
      upstreamRecommendedNextAction: "caveat_report",
      boundaryVerdictIntegrityEventCount: 0,
      candidateMaterialUncertaintySignalCount: 1,
    },
    providerAndCostTelemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      durationMs: 100,
      attemptCount: 1,
      schemaRetryCount: 0,
      cacheDecision: "no_store_no_read",
    },
    redaction: {
      evidenceItemTextReturned: false,
      citedEvidenceItemRefsReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      inputPacketReturned: false,
      summaryTextReturned: false,
      providerPayloadReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      reportProseReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
      publicVerdictReturned: false,
      publicTruthPercentageReturned: false,
      publicConfidenceReturned: false,
      publicWarningReturned: false,
    },
    sideEffects: {
      reportProseGenerated: false,
      publicReportGenerated: false,
      verdictPublished: false,
      warningPublished: false,
      confidencePublished: false,
      truthPercentagePublished: false,
      publicSurfaceWritten: false,
      compatibilityProjectionWritten: false,
      promptLoaded: false,
      promptRendered: false,
      modelCalled: false,
      cacheRead: false,
      cacheWrite: false,
      parserExecuted: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
    w8aMergeTrigger: {
      triggerName: "merge_w8a_stop_owner_after_w8b_fail_closed_parity_covered",
      triggerCondition: "accepted_runtime_owned_w7b2_output_supersedes_w8a_non_verdict_stop_candidate",
      parityVerifierName: "internal_alpha_report_result_fail_closed_parity_for_blocked_and_damaged_parents",
      status: "parity_covered",
    },
    approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W8-B_Internal_Alpha_Report_Output_And_Chain_Observability_Review_Package.md",
    ...overrides,
  };
}

function boundaryVerdictExecution(
  overrides: Partial<BoundaryVerdictExecutionDecision> = {},
): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
    decisionId: "BOUNDARY_VERDICT_EXECUTION_TEST",
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
    inputPacketHash: "c".repeat(64),
    inputPacketByteLength: 512,
    evidenceItemCount: 1,
    boundaryCandidateCount: 1,
    verdictCandidateCount: 1,
    citedEvidenceItemRefs: ["EI_1"],
    resultPayloadHash: RESULT_HASH,
    internalReviewPayload: {
      payloadVersion: BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
      source: "validated_boundary_verdict_execution_result",
      boundarySetCandidate: {
        boundaries: [{
          boundaryCandidateId: "B1",
          title: "Efficiency comparison boundary",
          targetAtomicClaimIds: ["AC_1"],
          evidenceItemIds: ["EI_1"],
          evidenceScopeSummary: "Vehicle efficiency evidence.",
          rationale: "The boundary groups efficiency evidence for review.",
        }],
      },
      verdictSetCandidate: {
        verdictCandidates: [{
          verdictCandidateId: "V1",
          boundaryCandidateIds: ["B1"],
          targetAtomicClaimIds: ["AC_1"],
          evidenceItemIds: ["EI_1"],
          internalVerdictLabelCandidate: "MOSTLY-FALSE",
          internalTruthPercentageCandidate: 15,
          internalConfidenceCandidate: 70,
          rationale: "The cited evidence opposes the efficiency claim.",
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
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: "caveated",
      upstreamRecommendedNextAction: "caveat_report",
      boundaryVerdictIntegrityEventCount: 0,
      candidateMaterialUncertaintySignalCount: 1,
    },
    executionTelemetry: {
      gatewayTaskId: "boundary_verdict_execution",
      promptSectionId: "V2_BOUNDARY_VERDICT_EXECUTION",
      promptContentHash: "d".repeat(64),
      renderedPromptHash: "e".repeat(64),
      inputPacketHash: "c".repeat(64),
      inputPacketByteLength: 512,
      outputSchemaVersion: "v2.boundary_verdict_execution.0",
      schemaDiagnostics: null,
      modelPolicyId: "policy",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      attemptCount: 1,
      schemaRetryCount: 0,
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      durationMs: 100,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: null,
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
      internalReviewPayloadReturnedByDefault: false,
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
    combinedCallQualityTrigger: "compare_first_successful_benchmark_family_candidate_against_best_available_boundary_comparator",
    approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md",
    ...overrides,
  };
}

describe("W8-G internal Alpha report draft", () => {
  it("projects W7-B LLM-owned boundary/verdict payload into one hidden internal draft", () => {
    const decision = buildInternalAlphaReportDraftDecision({
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution(),
    });

    expect(decision).toMatchObject({
      decisionVersion: INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION,
      kind: "internal_alpha_report_draft",
      status: "internal_alpha_report_draft_created",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      boundaryDraftCount: 1,
      verdictDraftCount: 1,
      citedEvidenceItemRefCount: 1,
      reportReviewReadiness: "ready_for_internal_alpha_report_review",
    });
    expect(decision.draftMarkdown).toContain("Internal Alpha Report Draft");
    expect(decision.draftMarkdown).toContain("MOSTLY-FALSE");
    expect(decision.draftMarkdown).toContain("EvidenceItem refs: EI_1");
    expect(decision.draftMarkdownHash).toMatch(/^[a-f0-9]{64}$/);
    expect(decision.redaction.draftMarkdownReturnedByDefault).toBe(false);
    expect(decision.sideEffects).toMatchObject({
      reportDraftProjected: true,
      reportProseLlmCalled: false,
      publicReportGenerated: false,
      publicSurfaceWritten: false,
      modelCalled: false,
      cacheRead: false,
      cacheWrite: false,
      parserExecuted: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    });
  });

  it("fails closed when the W7-B review payload is unavailable", () => {
    const decision = buildInternalAlphaReportDraftDecision({
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution({ internalReviewPayload: null }),
    });

    expect(decision.status).toBe("internal_alpha_report_draft_blocked");
    expect(decision.blockedReason).toBe("boundary_verdict_review_payload_missing");
    expect(decision.draftMarkdown).toBeNull();
    expect(decision.sideEffects.reportDraftProjected).toBe(false);
  });

  it("fails closed on W8-B and W7-B lineage drift", () => {
    const decision = buildInternalAlphaReportDraftDecision({
      internalAlphaReportResult: reportResult(),
      boundaryVerdictExecution: boundaryVerdictExecution({ resultPayloadHash: "f".repeat(64) }),
    });

    expect(decision.status).toBe("internal_alpha_report_draft_damaged");
    expect(decision.damagedReason).toBe("lineage_mismatch");
    expect(decision.draftMarkdown).toBeNull();
  });
});
