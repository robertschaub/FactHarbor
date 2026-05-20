import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { BoundaryVerdictExecutionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type { BoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  buildInternalAlphaReportResultCandidate,
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import {
  buildInternalAlphaReportStopCandidate,
  type InternalAlphaReportStopCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";

const STATEMENT = "Battery electric cars use electricity more directly than hydrogen cars.";
const UNSAFE_TEXT = "DIESER_VERSTECKTE_REPORT_TEXT_DARF_NIE_ERSCHEINEN";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function boundedEvidenceExtraction(
  overrides: Partial<BoundedEvidenceExtractionDecision> = {},
): BoundedEvidenceExtractionDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8B_TEST",
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
    ...overrides,
  } as unknown as BoundedEvidenceExtractionDecision;
}

function evidenceItemHandoff(
  overrides: Partial<EvidenceItemHandoffDecision> = {},
): EvidenceItemHandoffDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
    decisionId: "EVIDENCE_ITEM_HANDOFF_W8B_TEST",
    kind: "evidence_item_handoff",
    handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    admittedEvidenceItemCount: 1,
    evidenceItemStatementHashes: [sha256Text(STATEMENT)],
    evidenceItemStatementByteLengths: [byteLength(STATEMENT)],
    sourceMaterialLineageHash: "1".repeat(64),
    w4hPacketHash: "2".repeat(64),
    providerId: "wikimedia_core",
    modelId: "claude-haiku-4-5-20251001",
    sideEffects: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
    ...overrides,
  } as EvidenceItemHandoffDecision;
}

function sufficiencyIntake(
  overrides: Partial<SufficiencyIntakeDecision> = {},
): SufficiencyIntakeDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
    decisionId: "SUFFICIENCY_INTAKE_W8B_TEST",
    kind: "sufficiency_intake",
    intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentEvidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_TEST",
    assessmentExecution: "closed_contract_only",
    sideEffects: {
      sufficiencyLlmCalled: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
      providerCalled: false,
      parserExecuted: false,
    },
    ...overrides,
  } as SufficiencyIntakeDecision;
}

function sufficiencyAssessment(
  overrides: Partial<SufficiencyAssessmentDecision> = {},
): SufficiencyAssessmentDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.sufficiency-assessment.w6c",
    decisionId: "SUFFICIENCY_ASSESSMENT_W8B_TEST",
    kind: "sufficiency_assessment",
    assessmentStatus: "sufficiency_assessment_completed",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentSufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_TEST",
    parentW5DecisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8B_TEST",
    sufficiencyResultStatus: "accepted",
    reportStopRecommendation: "continue_to_boundary_formation",
    sideEffects: {
      sufficiencyLlmCalled: true,
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
    ...overrides,
  } as SufficiencyAssessmentDecision;
}

function closedBoundaryVerdictCandidateSideEffects(): BoundaryVerdictCandidateDecision["sideEffects"] {
  return {
    boundaryLlmCalled: false,
    verdictLlmCalled: false,
    promptLoaded: false,
    promptRendered: false,
    modelCalled: false,
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
  };
}

function boundaryVerdictCandidate(
  overrides: Partial<BoundaryVerdictCandidateDecision> = {},
): BoundaryVerdictCandidateDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.boundary-verdict-candidate.w7a",
    decisionId: "BOUNDARY_VERDICT_CANDIDATE_W8B_TEST",
    kind: "boundary_verdict_candidate_contract",
    status: "boundary_verdict_candidate_ready",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    candidatePopulation: "closed_until_llm_task_approved",
    inputLineage: {
      evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_TEST",
      sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_TEST",
      sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W8B_TEST",
    },
    boundaryCandidates: [],
    verdictCandidate: null,
    sideEffects: closedBoundaryVerdictCandidateSideEffects(),
    ...overrides,
  } as BoundaryVerdictCandidateDecision;
}

function internalAlphaReportStop(
  overrides: Partial<InternalAlphaReportStopCandidate> = {},
): InternalAlphaReportStopCandidate {
  return {
    decisionVersion: "v2.evidence-lifecycle.internal-alpha-report-stop.w8a",
    decisionId: "INTERNAL_ALPHA_REPORT_STOP_W8B_TEST",
    kind: "internal_alpha_report_stop_candidate",
    status: "alpha_report_stop_created_not_report_ready",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    inputLineage: {
      evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_TEST",
      sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_TEST",
      sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W8B_TEST",
      boundaryVerdictCandidateDecisionId: "BOUNDARY_VERDICT_CANDIDATE_W8B_TEST",
    },
    ...overrides,
  } as InternalAlphaReportStopCandidate;
}

function closedBoundaryVerdictSideEffects(): BoundaryVerdictExecutionDecision["sideEffects"] {
  return {
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
  };
}

function boundaryVerdictExecution(
  overrides: Partial<BoundaryVerdictExecutionDecision> = {},
): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.boundary-verdict-execution.w7b",
    decisionId: "BOUNDARY_VERDICT_EXECUTION_W8B_TEST",
    kind: "boundary_verdict_execution",
    status: "boundary_verdict_candidates_created_internal",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
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
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      durationMs: 25,
      attemptCount: 1,
      schemaRetryCount: 0,
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
    sideEffects: closedBoundaryVerdictSideEffects(),
    ...overrides,
  } as BoundaryVerdictExecutionDecision;
}

function build(
  overrides: {
    readonly boundedEvidenceExtraction?: BoundedEvidenceExtractionDecision | null;
    readonly handoff?: EvidenceItemHandoffDecision | null;
    readonly intake?: SufficiencyIntakeDecision | null;
    readonly assessment?: SufficiencyAssessmentDecision | null;
    readonly boundaryVerdict?: BoundaryVerdictCandidateDecision | null;
    readonly stop?: InternalAlphaReportStopCandidate | null;
    readonly execution?: BoundaryVerdictExecutionDecision | null;
    readonly ownership?: "owned" | "not_owned" | "mutated_after_provenance";
  } = {},
) {
  return buildInternalAlphaReportResultCandidate({
    boundedEvidenceExtraction: overrides.boundedEvidenceExtraction === undefined
      ? boundedEvidenceExtraction()
      : overrides.boundedEvidenceExtraction,
    evidenceItemHandoff: overrides.handoff === undefined ? evidenceItemHandoff() : overrides.handoff,
    sufficiencyIntake: overrides.intake === undefined ? sufficiencyIntake() : overrides.intake,
    sufficiencyAssessment: overrides.assessment === undefined ? sufficiencyAssessment() : overrides.assessment,
    boundaryVerdictCandidate: overrides.boundaryVerdict === undefined
      ? boundaryVerdictCandidate()
      : overrides.boundaryVerdict,
    internalAlphaReportStop: overrides.stop === undefined ? internalAlphaReportStop() : overrides.stop,
    boundaryVerdictExecution: overrides.execution === undefined ? boundaryVerdictExecution() : overrides.execution,
    boundaryVerdictExecutionRuntimeOwnership: overrides.ownership ?? "owned",
  });
}

function buildW8aW8bPair(
  overrides: {
    readonly boundedEvidenceExtraction?: BoundedEvidenceExtractionDecision | null;
    readonly handoff?: EvidenceItemHandoffDecision | null;
    readonly intake?: SufficiencyIntakeDecision | null;
    readonly assessment?: SufficiencyAssessmentDecision | null;
    readonly boundaryVerdict?: BoundaryVerdictCandidateDecision | null;
    readonly execution?: BoundaryVerdictExecutionDecision | null;
    readonly ownership?: "owned" | "not_owned" | "mutated_after_provenance";
  } = {},
) {
  const handoff = overrides.handoff === undefined ? evidenceItemHandoff() : overrides.handoff;
  const intake = overrides.intake === undefined ? sufficiencyIntake() : overrides.intake;
  const assessment = overrides.assessment === undefined ? sufficiencyAssessment() : overrides.assessment;
  const boundaryVerdict = overrides.boundaryVerdict === undefined
    ? boundaryVerdictCandidate()
    : overrides.boundaryVerdict;
  const stop = buildInternalAlphaReportStopCandidate({
    evidenceItemHandoff: handoff,
    sufficiencyIntake: intake,
    sufficiencyAssessment: assessment,
    boundaryVerdictCandidate: boundaryVerdict,
  });
  const result = build({
    boundedEvidenceExtraction: overrides.boundedEvidenceExtraction,
    handoff,
    intake,
    assessment,
    boundaryVerdict,
    stop,
    execution: overrides.execution,
    ownership: overrides.ownership,
  });

  return { stop, result };
}

function expectInternalOnlyFailClosed(
  candidate: {
    readonly status: string;
    readonly publicPointerExposure: "forbidden";
    readonly publicCutoverStatus: "blocked_precutover";
    readonly redaction: object;
    readonly sideEffects: object;
  },
): void {
  expect(candidate.status).not.toMatch(/created$/);
  expect(candidate.publicPointerExposure).toBe("forbidden");
  expect(candidate.publicCutoverStatus).toBe("blocked_precutover");
  expect(Object.values(candidate.redaction).every((value) => value === false)).toBe(true);
  expect(Object.values(candidate.sideEffects).every((value) => value === false)).toBe(true);
}

describe("W8-B internal Alpha report-result candidate", () => {
  it("creates an accepted internal report-value candidate from runtime-owned W7-B2 output", () => {
    const decision = build();

    expect(decision).toMatchObject({
      decisionVersion: INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
      kind: "internal_alpha_report_result_candidate",
      status: "internal_alpha_report_result_candidate_created",
      blockedReason: null,
      damagedReason: null,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "admin_structured_candidate_no_source_text",
    });
    expect(decision.reportReadiness).toEqual({
      publicCutoverStatus: "blocked_precutover",
      publicCutoverStatusOwnership: "mirror_only_not_source_of_truth",
      reportQualityStatus: "internal_alpha_review_candidate_not_public_report",
      reportCompleteness: "internal_candidate_summary_only",
      comparatorReviewReadiness: "ready_for_internal_comparator_review",
      compatibilityProjection: "closed_precutover_report_damaged",
    });
    expect(decision.boundaryVerdictSummary).toMatchObject({
      boundaryCandidateCount: 1,
      verdictCandidateCount: 1,
      resultPayloadHash: "4".repeat(64),
      inputPacketHash: "3".repeat(64),
    });
    expect(decision.evidenceTraceability).toMatchObject({
      traceabilitySource: "post_execution_cited_refs",
      fieldSurfaceLimitation:
        "w7b2_exposes_post_execution_cited_refs_but_not_full_parent_input_packet",
      evidenceItemCount: 1,
      citedEvidenceItemRefCount: 1,
      citedEvidenceItemRefsReturned: false,
      evidenceItemTextReturned: false,
    });
    expect(decision.upstreamStopAttribution).toMatchObject({
      attributionVersion: "v2.evidence-lifecycle.internal-alpha-report-result.upstream-stop-attribution.w8e",
      firstIncompleteStage: "none",
      firstIncompleteReason: null,
      parentStatuses: {
        sufficiencyAssessment: {
          assessmentStatus: "sufficiency_assessment_completed",
          blockedReason: null,
          damagedReason: null,
          sufficiencyResultStatus: "accepted",
          reportStopRecommendation: "continue_to_boundary_formation",
        },
        boundaryVerdictExecution: {
          status: "boundary_verdict_candidates_created_internal",
          runtimeOwnership: "owned",
          citedEvidenceItemRefCount: 1,
        },
      },
    });
    expect(Object.values(decision.upstreamStopAttribution.redaction).every((value) => value === false)).toBe(true);
    expect(decision.providerAndCostTelemetry).toMatchObject({
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      totalTokens: 150,
      durationMs: 25,
      attemptCount: 1,
    });
    expect(decision.w8aMergeTrigger).toEqual({
      triggerName: "merge_w8a_stop_owner_after_w8b_fail_closed_parity_covered",
      triggerCondition: "accepted_runtime_owned_w7b2_output_supersedes_w8a_non_verdict_stop_candidate",
      parityVerifierName: "internal_alpha_report_result_fail_closed_parity_for_blocked_and_damaged_parents",
      status: "parity_covered",
    });
  });

  it("proves W8-A and W8-B fail-closed parity for shared missing, blocked, damaged, public-open, side-effect-open, and lineage-mismatched parents", () => {
    const cases = [
      {
        name: "missing handoff",
        overrides: { handoff: null },
        w8aReason: "evidence_item_handoff_missing",
        w8bReason: "evidence_item_handoff_missing",
      },
      {
        name: "blocked handoff",
        overrides: {
          handoff: evidenceItemHandoff({
            handoffStatus: "evidence_item_handoff_blocked",
            blockedReason: "w5_result_not_accepted",
          }),
        },
        w8aReason: "evidence_item_handoff_not_ready",
        w8bReason: "evidence_item_handoff_not_ready",
      },
      {
        name: "public-open handoff contract",
        overrides: {
          handoff: evidenceItemHandoff({
            publicCutoverStatus: "public_open" as EvidenceItemHandoffDecision["publicCutoverStatus"],
          }),
        },
        w8aReason: "parent_contract_invalid",
        w8bReason: "parent_contract_invalid",
      },
      {
        name: "side-effect-open handoff",
        overrides: {
          handoff: evidenceItemHandoff({
            sideEffects: {
              ...evidenceItemHandoff().sideEffects,
              publicSurfaceWritten: true as false,
            },
          }),
        },
        w8aReason: "side_effects_not_closed",
        w8bReason: "internal_alpha_report_stop_not_ready",
      },
      {
        name: "lineage-mismatched sufficiency intake",
        overrides: {
          intake: sufficiencyIntake({
            parentEvidenceItemHandoffDecisionId: "OTHER_HANDOFF",
          }),
        },
        w8aReason: "lineage_mismatch",
        w8bReason: "internal_alpha_report_stop_not_ready",
      },
    ] as const;

    for (const parityCase of cases) {
      const { stop, result } = buildW8aW8bPair(parityCase.overrides);

      expectInternalOnlyFailClosed(stop);
      expectInternalOnlyFailClosed(result);
      expect(stop.blockedReason ?? stop.damagedReason, parityCase.name).toBe(parityCase.w8aReason);
      expect(result.blockedReason ?? result.damagedReason, parityCase.name).toBe(parityCase.w8bReason);
    }
  });

  it("keeps W8-B fail-closed for W7-B2-only rejected states while W8-A remains an internal non-public stop owner", () => {
    const cases = [
      {
        name: "missing bounded extraction",
        overrides: { boundedEvidenceExtraction: null },
        reason: "bounded_evidence_extraction_missing",
      },
      {
        name: "non-runtime-owned boundary verdict execution",
        overrides: { ownership: "not_owned" as const },
        reason: "boundary_verdict_execution_not_runtime_owned",
      },
      {
        name: "public-open boundary verdict execution",
        overrides: {
          execution: boundaryVerdictExecution({
            publicCutoverStatus: "public_open" as BoundaryVerdictExecutionDecision["publicCutoverStatus"],
          }),
        },
        reason: "boundary_verdict_execution_public_cutover_not_blocked",
      },
      {
        name: "side-effect-open boundary verdict execution",
        overrides: {
          execution: boundaryVerdictExecution({
            sideEffects: {
              ...closedBoundaryVerdictSideEffects(),
              publicSurfaceWritten: true as false,
            },
          }),
        },
        reason: "boundary_verdict_execution_side_effects_not_closed",
      },
      {
        name: "lineage-mismatched cited EvidenceItem refs",
        overrides: {
          execution: boundaryVerdictExecution({
            citedEvidenceItemRefs: ["UNKNOWN_EVIDENCE_ITEM"],
          }),
        },
        reason: "cited_evidence_item_ref_mismatch",
      },
    ] as const;

    for (const parityCase of cases) {
      const { stop, result } = buildW8aW8bPair(parityCase.overrides);

      expect(stop).toMatchObject({
        status: "alpha_report_stop_created_not_report_ready",
        publicPointerExposure: "forbidden",
        publicCutoverStatus: "blocked_precutover",
      });
      expectInternalOnlyFailClosed(result);
      expect(result.blockedReason ?? result.damagedReason, parityCase.name).toBe(parityCase.reason);
    }
  });

  it("blocks accepted output when W7-B2 lacks runtime ownership or accepted state", () => {
    expect(build({ ownership: "not_owned" })).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      blockedReason: "boundary_verdict_execution_not_runtime_owned",
    });
    expect(build({
      ownership: "mutated_after_provenance",
    })).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      blockedReason: "boundary_verdict_execution_not_runtime_owned",
    });
    expect(build({
      execution: boundaryVerdictExecution({
        status: "boundary_verdict_execution_blocked",
      }),
    })).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      blockedReason: "boundary_verdict_execution_not_accepted",
    });
  });

  it("attributes W8-D-shaped stop to the non-completed W6-C sufficiency assessment", () => {
    const decision = build({
      assessment: sufficiencyAssessment({
        assessmentStatus: "sufficiency_assessment_blocked",
        blockedReason: "input_contract_invalid",
        sufficiencyResultStatus: null,
        reportStopRecommendation: null,
      }),
      boundaryVerdict: boundaryVerdictCandidate({
        status: "boundary_verdict_candidate_blocked",
      }),
      stop: internalAlphaReportStop({
        status: "alpha_report_stop_blocked",
      }),
      execution: boundaryVerdictExecution({
        status: "boundary_verdict_execution_blocked",
        boundaryCandidateCount: 0,
        verdictCandidateCount: 0,
        citedEvidenceItemRefs: [],
      }),
    });

    expect(decision).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      blockedReason: "sufficiency_assessment_not_completed",
      upstreamStopAttribution: {
        firstIncompleteStage: "sufficiency_assessment",
        firstIncompleteReason: "sufficiency_assessment_not_completed",
        parentStatuses: {
          sufficiencyAssessment: {
            assessmentStatus: "sufficiency_assessment_blocked",
            blockedReason: "input_contract_invalid",
            damagedReason: null,
            sufficiencyResultStatus: null,
            reportStopRecommendation: null,
          },
          boundaryVerdictExecution: {
            status: "boundary_verdict_execution_blocked",
            boundaryCandidateCount: 0,
            verdictCandidateCount: 0,
            citedEvidenceItemRefCount: 0,
          },
        },
      },
    });
  });

  it("attributes post-sufficiency stops to W7-B2 without relaxing readiness", () => {
    const decision = build({
      execution: boundaryVerdictExecution({
        status: "boundary_verdict_execution_blocked",
      }),
    });

    expect(decision).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      blockedReason: "boundary_verdict_execution_not_accepted",
      upstreamStopAttribution: {
        firstIncompleteStage: "boundary_verdict_execution",
        firstIncompleteReason: "boundary_verdict_execution_not_accepted",
        parentStatuses: {
          sufficiencyAssessment: {
            assessmentStatus: "sufficiency_assessment_completed",
            sufficiencyResultStatus: "accepted",
          },
          boundaryVerdictExecution: {
            status: "boundary_verdict_execution_blocked",
            runtimeOwnership: "owned",
          },
        },
      },
    });
  });

  it("damages when post-execution cited EvidenceItem refs do not map to W5 input lineage", () => {
    const decision = build({
      execution: boundaryVerdictExecution({
        citedEvidenceItemRefs: ["UNKNOWN_EVIDENCE_ITEM"],
      }),
    });

    expect(decision.status).toBe("internal_alpha_report_result_damaged");
    expect(decision.damagedReason).toBe("cited_evidence_item_ref_mismatch");
  });

  it("keeps source, prompt, provider payload, public verdict, and report prose text out of the candidate", () => {
    const execution = boundaryVerdictExecution({
      providerPayload: UNSAFE_TEXT,
      renderedPrompt: UNSAFE_TEXT,
      reportMarkdown: UNSAFE_TEXT,
      publicVerdict: UNSAFE_TEXT,
    } as Partial<BoundaryVerdictExecutionDecision>);
    const decision = build({ execution });
    const serialized = JSON.stringify(decision);

    expect(decision.status).toBe("internal_alpha_report_result_candidate_created");
    expect(serialized).not.toContain(UNSAFE_TEXT);
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("\"truthPercentage\":");
    expect(serialized).not.toContain("confidenceTier");
  });
});
