import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type { BoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import { BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import {
  BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { EVIDENCE_ITEM_HANDOFF_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION,
  type InternalAlphaReportStopCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { SUFFICIENCY_ASSESSMENT_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { SUFFICIENCY_INTAKE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION =
  "v2.evidence-lifecycle.internal-alpha-report-result.w8b" as const;
export const INTERNAL_ALPHA_REPORT_RESULT_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W8-B_Internal_Alpha_Report_Output_And_Chain_Observability_Review_Package.md" as const;

export type InternalAlphaReportResultStatus =
  | "internal_alpha_report_result_candidate_created"
  | "internal_alpha_report_result_blocked"
  | "internal_alpha_report_result_damaged";

export type InternalAlphaReportResultBlockedReason =
  | "bounded_evidence_extraction_missing"
  | "bounded_evidence_extraction_not_accepted"
  | "evidence_item_handoff_missing"
  | "evidence_item_handoff_not_ready"
  | "sufficiency_intake_missing"
  | "sufficiency_intake_not_ready"
  | "sufficiency_assessment_missing"
  | "sufficiency_assessment_not_completed"
  | "boundary_verdict_candidate_missing"
  | "boundary_verdict_candidate_not_ready"
  | "internal_alpha_report_stop_missing"
  | "internal_alpha_report_stop_not_ready"
  | "boundary_verdict_execution_missing"
  | "boundary_verdict_execution_not_runtime_owned"
  | "boundary_verdict_execution_not_accepted"
  | "boundary_verdict_execution_public_cutover_not_blocked"
  | "boundary_verdict_execution_default_projection_not_hash_length_provenance_only"
  | "boundary_verdict_execution_side_effects_not_closed";

export type InternalAlphaReportResultDamagedReason =
  | "parent_contract_invalid"
  | "lineage_mismatch"
  | "statement_projection_mismatch"
  | "cited_evidence_item_ref_mismatch";

export type BoundaryVerdictExecutionRuntimeOwnershipStatus =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

export type InternalAlphaReportResultReadiness = {
  readonly publicCutoverStatus: "blocked_precutover";
  readonly publicCutoverStatusOwnership: "mirror_only_not_source_of_truth";
  readonly reportQualityStatus: "internal_alpha_review_candidate_not_public_report";
  readonly reportCompleteness: "internal_candidate_summary_only";
  readonly comparatorReviewReadiness: "ready_for_internal_comparator_review";
  readonly compatibilityProjection: "closed_precutover_report_damaged";
};

export type InternalAlphaReportResultInputLineage = {
  readonly boundedEvidenceExtractionDecisionId: string | null;
  readonly boundedEvidenceExtractionVersion: typeof BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION | null;
  readonly boundedEvidenceExtractionProjectionHash: string | null;
  readonly evidenceItemHandoffDecisionId: string | null;
  readonly evidenceItemHandoffVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
  readonly evidenceItemHandoffProjectionHash: string | null;
  readonly sufficiencyIntakeDecisionId: string | null;
  readonly sufficiencyIntakeVersion: typeof SUFFICIENCY_INTAKE_DECISION_VERSION | null;
  readonly sufficiencyIntakeProjectionHash: string | null;
  readonly sufficiencyAssessmentDecisionId: string | null;
  readonly sufficiencyAssessmentVersion: typeof SUFFICIENCY_ASSESSMENT_DECISION_VERSION | null;
  readonly sufficiencyAssessmentProjectionHash: string | null;
  readonly boundaryVerdictCandidateDecisionId: string | null;
  readonly boundaryVerdictCandidateVersion: typeof BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION | null;
  readonly boundaryVerdictCandidateProjectionHash: string | null;
  readonly internalAlphaReportStopDecisionId: string | null;
  readonly internalAlphaReportStopVersion: typeof INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION | null;
  readonly internalAlphaReportStopProjectionHash: string | null;
  readonly boundaryVerdictExecutionDecisionId: string | null;
  readonly boundaryVerdictExecutionVersion: typeof BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION | null;
  readonly boundaryVerdictExecutionProjectionHash: string | null;
  readonly boundaryVerdictExecutionInputPacketHash: string | null;
  readonly boundaryVerdictExecutionParentIdsExposed: false;
};

export type InternalAlphaReportResultEvidenceTraceability = {
  readonly traceabilitySource: "post_execution_cited_refs";
  readonly fieldSurfaceLimitation:
    "w7b2_exposes_post_execution_cited_refs_but_not_full_parent_input_packet";
  readonly evidenceItemCount: number;
  readonly inputEvidenceItemIdRefHashes: readonly string[];
  readonly inputEvidenceItemStatementHashes: readonly string[];
  readonly inputEvidenceItemStatementByteLengths: readonly number[];
  readonly citedEvidenceItemRefCount: number;
  readonly citedEvidenceItemRefHashes: readonly string[];
  readonly citedEvidenceItemRefsReturned: false;
  readonly evidenceItemTextReturned: false;
};

export type InternalAlphaReportResultBoundaryVerdictSummary = {
  readonly boundaryVerdictExecutionStatus: BoundaryVerdictExecutionDecision["status"] | null;
  readonly boundaryCandidateCount: number;
  readonly verdictCandidateCount: number;
  readonly resultPayloadHash: string | null;
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
};

export type InternalAlphaReportResultWarningMaterialityInputs = {
  readonly warningPublication: "closed";
  readonly userVisibleWarningCount: 0;
  readonly upstreamSufficiencyStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly upstreamRecommendedNextAction: SufficiencyAssessmentDecision["reportStopRecommendation"];
  readonly boundaryVerdictIntegrityEventCount: number;
  readonly candidateMaterialUncertaintySignalCount: number;
};

export type InternalAlphaReportResultProviderAndCostTelemetry = {
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
  readonly durationMs: number | null;
  readonly attemptCount: number;
  readonly schemaRetryCount: number;
  readonly cacheDecision: "no_store_no_read";
};

export type InternalAlphaReportResultSideEffects = {
  readonly reportProseGenerated: false;
  readonly publicReportGenerated: false;
  readonly verdictPublished: false;
  readonly warningPublished: false;
  readonly confidencePublished: false;
  readonly truthPercentagePublished: false;
  readonly publicSurfaceWritten: false;
  readonly compatibilityProjectionWritten: false;
  readonly promptLoaded: false;
  readonly promptRendered: false;
  readonly modelCalled: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly parserExecuted: false;
  readonly sourceReliabilityRead: false;
  readonly sourceReliabilityWrite: false;
  readonly storageWrite: false;
};

export type InternalAlphaReportResultCandidate = {
  readonly decisionVersion: typeof INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "internal_alpha_report_result_candidate";
  readonly status: InternalAlphaReportResultStatus;
  readonly blockedReason: InternalAlphaReportResultBlockedReason | null;
  readonly damagedReason: InternalAlphaReportResultDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "admin_structured_candidate_no_source_text";
  readonly inputLineage: InternalAlphaReportResultInputLineage;
  readonly reportReadiness: InternalAlphaReportResultReadiness;
  readonly boundaryVerdictSummary: InternalAlphaReportResultBoundaryVerdictSummary;
  readonly evidenceTraceability: InternalAlphaReportResultEvidenceTraceability;
  readonly warningMaterialityInputs: InternalAlphaReportResultWarningMaterialityInputs;
  readonly providerAndCostTelemetry: InternalAlphaReportResultProviderAndCostTelemetry;
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly citedEvidenceItemRefsReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
    readonly inputPacketReturned: false;
    readonly summaryTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly promptTextReturned: false;
    readonly renderedPromptTextReturned: false;
    readonly reportProseReturned: false;
    readonly hiddenLedgerReferenceReturned: false;
    readonly internalStateReturned: false;
    readonly publicVerdictReturned: false;
    readonly publicTruthPercentageReturned: false;
    readonly publicConfidenceReturned: false;
    readonly publicWarningReturned: false;
  };
  readonly sideEffects: InternalAlphaReportResultSideEffects;
  readonly w8aMergeTrigger: {
    readonly triggerName: "merge_w8a_stop_owner_after_w8b_fail_closed_parity_covered";
    readonly triggerCondition: "accepted_runtime_owned_w7b2_output_supersedes_w8a_non_verdict_stop_candidate";
    readonly parityVerifierName:
      "internal_alpha_report_result_fail_closed_parity_for_blocked_and_damaged_parents";
    readonly status: "pending";
  };
  readonly approvalPointer: typeof INTERNAL_ALPHA_REPORT_RESULT_SOURCE_PACKAGE;
};

type ParentProjection = {
  readonly evidenceItemHandoffDecisionId: string | null;
  readonly evidenceItemHandoffVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
  readonly boundedEvidenceExtractionDecisionId: string | null;
  readonly boundedEvidenceExtractionVersion: typeof BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION | null;
  readonly boundedEvidenceExtractionEvidenceItemIdRefs: readonly string[];
  readonly evidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly sourceMaterialLineageHash: string | null;
  readonly w4hPacketHash: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly sufficiencyIntakeDecisionId: string | null;
  readonly sufficiencyIntakeVersion: typeof SUFFICIENCY_INTAKE_DECISION_VERSION | null;
  readonly sufficiencyIntakeParentEvidenceItemHandoffDecisionId: string | null;
  readonly sufficiencyAssessmentDecisionId: string | null;
  readonly sufficiencyAssessmentVersion: typeof SUFFICIENCY_ASSESSMENT_DECISION_VERSION | null;
  readonly sufficiencyAssessmentParentSufficiencyIntakeDecisionId: string | null;
  readonly sufficiencyAssessmentParentW5DecisionId: string | null;
  readonly sufficiencyResultStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly reportStopRecommendation: SufficiencyAssessmentDecision["reportStopRecommendation"];
  readonly boundaryVerdictCandidateDecisionId: string | null;
  readonly boundaryVerdictCandidateVersion: typeof BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION | null;
  readonly boundaryVerdictCandidateStatus: BoundaryVerdictCandidateDecision["status"] | null;
  readonly boundaryVerdictCandidatePopulation: BoundaryVerdictCandidateDecision["candidatePopulation"] | null;
  readonly boundaryVerdictCandidateParentHandoffDecisionId: string | null;
  readonly boundaryVerdictCandidateParentSufficiencyIntakeDecisionId: string | null;
  readonly boundaryVerdictCandidateParentSufficiencyAssessmentDecisionId: string | null;
  readonly internalAlphaReportStopDecisionId: string | null;
  readonly internalAlphaReportStopVersion: typeof INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION | null;
  readonly internalAlphaReportStopStatus: InternalAlphaReportStopCandidate["status"] | null;
  readonly internalAlphaReportStopParentHandoffDecisionId: string | null;
  readonly internalAlphaReportStopParentSufficiencyIntakeDecisionId: string | null;
  readonly internalAlphaReportStopParentSufficiencyAssessmentDecisionId: string | null;
  readonly internalAlphaReportStopParentBoundaryVerdictCandidateDecisionId: string | null;
  readonly boundaryVerdictExecutionDecisionId: string | null;
  readonly boundaryVerdictExecutionVersion: typeof BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION | null;
  readonly boundaryVerdictExecutionStatus: BoundaryVerdictExecutionDecision["status"] | null;
  readonly boundaryVerdictExecutionRuntimeOwnership: BoundaryVerdictExecutionRuntimeOwnershipStatus;
  readonly boundaryVerdictExecutionPublicCutoverStatus: BoundaryVerdictExecutionDecision["publicCutoverStatus"] | null;
  readonly boundaryVerdictExecutionDefaultProjection: BoundaryVerdictExecutionDecision["defaultProjection"] | null;
  readonly boundaryVerdictExecutionInputPacketHash: string | null;
  readonly boundaryVerdictExecutionInputPacketByteLength: number | null;
  readonly boundaryVerdictExecutionEvidenceItemCount: number;
  readonly boundaryCandidateCount: number;
  readonly verdictCandidateCount: number;
  readonly citedEvidenceItemRefs: readonly string[];
  readonly resultPayloadHash: string | null;
  readonly warningMaterialityInputs: BoundaryVerdictExecutionDecision["warningMaterialityInputs"] | null;
  readonly providerAndCostTelemetry: InternalAlphaReportResultProviderAndCostTelemetry;
};

export function buildInternalAlphaReportResultCandidate(input: {
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null | undefined;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  readonly boundaryVerdictExecutionRuntimeOwnership:
    BoundaryVerdictExecutionRuntimeOwnershipStatus;
}): InternalAlphaReportResultCandidate {
  const projection = projectParents(input);
  const contractDamage = parentContractDamagedReason(input);
  if (contractDamage) {
    return decision(projection, {
      status: "internal_alpha_report_result_damaged",
      blockedReason: null,
      damagedReason: contractDamage,
    });
  }

  const blockedReason = parentBlockedReason(input, projection);
  if (blockedReason) {
    return decision(projection, {
      status: "internal_alpha_report_result_blocked",
      blockedReason,
      damagedReason: null,
    });
  }

  const projectionDamage = parentProjectionDamagedReason(projection);
  if (projectionDamage) {
    return decision(projection, {
      status: "internal_alpha_report_result_damaged",
      blockedReason: null,
      damagedReason: projectionDamage,
    });
  }

  return decision(projection, {
    status: "internal_alpha_report_result_candidate_created",
    blockedReason: null,
    damagedReason: null,
  });
}

function projectParents(input: {
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null | undefined;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  readonly boundaryVerdictExecutionRuntimeOwnership: BoundaryVerdictExecutionRuntimeOwnershipStatus;
}): ParentProjection {
  const w7b2 = input.boundaryVerdictExecution;
  const acceptedW5Items = input.boundedEvidenceExtraction?.extractionResult?.status === "accepted"
    ? input.boundedEvidenceExtraction.extractionResult.evidenceItems
    : [];
  return {
    boundedEvidenceExtractionDecisionId: input.boundedEvidenceExtraction?.decisionId ?? null,
    boundedEvidenceExtractionVersion:
      input.boundedEvidenceExtraction?.decisionVersion === BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION
        ? BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION
        : null,
    boundedEvidenceExtractionEvidenceItemIdRefs: acceptedW5Items.map((item) => item.evidenceItemId),
    evidenceItemHandoffDecisionId: input.evidenceItemHandoff?.decisionId ?? null,
    evidenceItemHandoffVersion: input.evidenceItemHandoff?.decisionVersion === EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      ? EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      : null,
    evidenceItemCount: input.evidenceItemHandoff?.admittedEvidenceItemCount ?? 0,
    evidenceItemStatementHashes: input.evidenceItemHandoff?.evidenceItemStatementHashes.map((hash) => hash) ?? [],
    evidenceItemStatementByteLengths:
      input.evidenceItemHandoff?.evidenceItemStatementByteLengths.map((length) => length) ?? [],
    sourceMaterialLineageHash: input.evidenceItemHandoff?.sourceMaterialLineageHash ?? null,
    w4hPacketHash: input.evidenceItemHandoff?.w4hPacketHash ?? null,
    providerId: input.evidenceItemHandoff?.providerId ?? null,
    modelId: input.evidenceItemHandoff?.modelId ?? null,
    sufficiencyIntakeDecisionId: input.sufficiencyIntake?.decisionId ?? null,
    sufficiencyIntakeVersion: input.sufficiencyIntake?.decisionVersion === SUFFICIENCY_INTAKE_DECISION_VERSION
      ? SUFFICIENCY_INTAKE_DECISION_VERSION
      : null,
    sufficiencyIntakeParentEvidenceItemHandoffDecisionId:
      input.sufficiencyIntake?.parentEvidenceItemHandoffDecisionId ?? null,
    sufficiencyAssessmentDecisionId: input.sufficiencyAssessment?.decisionId ?? null,
    sufficiencyAssessmentVersion:
      input.sufficiencyAssessment?.decisionVersion === SUFFICIENCY_ASSESSMENT_DECISION_VERSION
        ? SUFFICIENCY_ASSESSMENT_DECISION_VERSION
        : null,
    sufficiencyAssessmentParentSufficiencyIntakeDecisionId:
      input.sufficiencyAssessment?.parentSufficiencyIntakeDecisionId ?? null,
    sufficiencyAssessmentParentW5DecisionId: input.sufficiencyAssessment?.parentW5DecisionId ?? null,
    sufficiencyResultStatus: input.sufficiencyAssessment?.sufficiencyResultStatus ?? null,
    reportStopRecommendation: input.sufficiencyAssessment?.reportStopRecommendation ?? null,
    boundaryVerdictCandidateDecisionId: input.boundaryVerdictCandidate?.decisionId ?? null,
    boundaryVerdictCandidateVersion:
      input.boundaryVerdictCandidate?.decisionVersion === BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION
        ? BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION
        : null,
    boundaryVerdictCandidateStatus: input.boundaryVerdictCandidate?.status ?? null,
    boundaryVerdictCandidatePopulation: input.boundaryVerdictCandidate?.candidatePopulation ?? null,
    boundaryVerdictCandidateParentHandoffDecisionId:
      input.boundaryVerdictCandidate?.inputLineage.evidenceItemHandoffDecisionId ?? null,
    boundaryVerdictCandidateParentSufficiencyIntakeDecisionId:
      input.boundaryVerdictCandidate?.inputLineage.sufficiencyIntakeDecisionId ?? null,
    boundaryVerdictCandidateParentSufficiencyAssessmentDecisionId:
      input.boundaryVerdictCandidate?.inputLineage.sufficiencyAssessmentDecisionId ?? null,
    internalAlphaReportStopDecisionId: input.internalAlphaReportStop?.decisionId ?? null,
    internalAlphaReportStopVersion:
      input.internalAlphaReportStop?.decisionVersion === INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION
        ? INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION
        : null,
    internalAlphaReportStopStatus: input.internalAlphaReportStop?.status ?? null,
    internalAlphaReportStopParentHandoffDecisionId:
      input.internalAlphaReportStop?.inputLineage.evidenceItemHandoffDecisionId ?? null,
    internalAlphaReportStopParentSufficiencyIntakeDecisionId:
      input.internalAlphaReportStop?.inputLineage.sufficiencyIntakeDecisionId ?? null,
    internalAlphaReportStopParentSufficiencyAssessmentDecisionId:
      input.internalAlphaReportStop?.inputLineage.sufficiencyAssessmentDecisionId ?? null,
    internalAlphaReportStopParentBoundaryVerdictCandidateDecisionId:
      input.internalAlphaReportStop?.inputLineage.boundaryVerdictCandidateDecisionId ?? null,
    boundaryVerdictExecutionDecisionId: w7b2?.decisionId ?? null,
    boundaryVerdictExecutionVersion: w7b2?.decisionVersion === BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION
      ? BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION
      : null,
    boundaryVerdictExecutionStatus: w7b2?.status ?? null,
    boundaryVerdictExecutionRuntimeOwnership: input.boundaryVerdictExecutionRuntimeOwnership,
    boundaryVerdictExecutionPublicCutoverStatus: w7b2?.publicCutoverStatus ?? null,
    boundaryVerdictExecutionDefaultProjection: w7b2?.defaultProjection ?? null,
    boundaryVerdictExecutionInputPacketHash: w7b2?.inputPacketHash ?? null,
    boundaryVerdictExecutionInputPacketByteLength: w7b2?.inputPacketByteLength ?? null,
    boundaryVerdictExecutionEvidenceItemCount: w7b2?.evidenceItemCount ?? 0,
    boundaryCandidateCount: w7b2?.boundaryCandidateCount ?? 0,
    verdictCandidateCount: w7b2?.verdictCandidateCount ?? 0,
    citedEvidenceItemRefs: w7b2?.citedEvidenceItemRefs.map((ref) => ref) ?? [],
    resultPayloadHash: w7b2?.resultPayloadHash ?? null,
    warningMaterialityInputs: w7b2?.warningMaterialityInputs ?? null,
    providerAndCostTelemetry: providerAndCostTelemetry(w7b2),
  };
}

function parentContractDamagedReason(input: {
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null | undefined;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportResultDamagedReason | null {
  if (
    input.boundedEvidenceExtraction &&
    (
      input.boundedEvidenceExtraction.decisionVersion !== BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION ||
      input.boundedEvidenceExtraction.kind !== "bounded_evidence_extraction_execution" ||
      input.boundedEvidenceExtraction.visibility !== "internal_admin_only" ||
      input.boundedEvidenceExtraction.publicPointerExposure !== "forbidden" ||
      input.boundedEvidenceExtraction.publicCutoverStatus !== "blocked_precutover" ||
      input.boundedEvidenceExtraction.defaultProjection !== "hash_length_provenance_only"
    )
  ) {
    return "parent_contract_invalid";
  }
  if (
    input.evidenceItemHandoff &&
    (
      input.evidenceItemHandoff.decisionVersion !== EVIDENCE_ITEM_HANDOFF_DECISION_VERSION ||
      input.evidenceItemHandoff.kind !== "evidence_item_handoff" ||
      input.evidenceItemHandoff.visibility !== "internal_admin_only" ||
      input.evidenceItemHandoff.publicPointerExposure !== "forbidden" ||
      input.evidenceItemHandoff.publicCutoverStatus !== "blocked_precutover" ||
      input.evidenceItemHandoff.defaultProjection !== "hash_length_provenance_only"
    )
  ) {
    return "parent_contract_invalid";
  }
  if (
    input.sufficiencyIntake &&
    (
      input.sufficiencyIntake.decisionVersion !== SUFFICIENCY_INTAKE_DECISION_VERSION ||
      input.sufficiencyIntake.kind !== "sufficiency_intake" ||
      input.sufficiencyIntake.visibility !== "internal_admin_only" ||
      input.sufficiencyIntake.publicPointerExposure !== "forbidden" ||
      input.sufficiencyIntake.publicCutoverStatus !== "blocked_precutover" ||
      input.sufficiencyIntake.defaultProjection !== "hash_length_provenance_only"
    )
  ) {
    return "parent_contract_invalid";
  }
  if (
    input.sufficiencyAssessment &&
    (
      input.sufficiencyAssessment.decisionVersion !== SUFFICIENCY_ASSESSMENT_DECISION_VERSION ||
      input.sufficiencyAssessment.kind !== "sufficiency_assessment" ||
      input.sufficiencyAssessment.visibility !== "internal_admin_only" ||
      input.sufficiencyAssessment.publicPointerExposure !== "forbidden" ||
      input.sufficiencyAssessment.publicCutoverStatus !== "blocked_precutover" ||
      input.sufficiencyAssessment.defaultProjection !== "hash_length_provenance_only"
    )
  ) {
    return "parent_contract_invalid";
  }
  if (
    input.boundaryVerdictCandidate &&
    (
      input.boundaryVerdictCandidate.decisionVersion !== BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION ||
      input.boundaryVerdictCandidate.kind !== "boundary_verdict_candidate_contract" ||
      input.boundaryVerdictCandidate.visibility !== "internal_admin_only" ||
      input.boundaryVerdictCandidate.publicPointerExposure !== "forbidden" ||
      input.boundaryVerdictCandidate.publicCutoverStatus !== "blocked_precutover" ||
      input.boundaryVerdictCandidate.defaultProjection !== "hash_length_provenance_only"
    )
  ) {
    return "parent_contract_invalid";
  }
  if (
    input.internalAlphaReportStop &&
    (
      input.internalAlphaReportStop.decisionVersion !== INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION ||
      input.internalAlphaReportStop.kind !== "internal_alpha_report_stop_candidate" ||
      input.internalAlphaReportStop.visibility !== "internal_admin_only" ||
      input.internalAlphaReportStop.publicPointerExposure !== "forbidden" ||
      input.internalAlphaReportStop.publicCutoverStatus !== "blocked_precutover" ||
      input.internalAlphaReportStop.defaultProjection !== "hash_length_provenance_only"
    )
  ) {
    return "parent_contract_invalid";
  }
  if (
    input.boundaryVerdictExecution &&
    (
      input.boundaryVerdictExecution.decisionVersion !== BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION ||
      input.boundaryVerdictExecution.kind !== "boundary_verdict_execution" ||
      input.boundaryVerdictExecution.visibility !== "internal_admin_only" ||
      input.boundaryVerdictExecution.publicPointerExposure !== "forbidden"
    )
  ) {
    return "parent_contract_invalid";
  }
  return null;
}

function parentBlockedReason(
  input: {
    readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null | undefined;
    readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
    readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
    readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
    readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
    readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null | undefined;
    readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  },
  projection: ParentProjection,
): InternalAlphaReportResultBlockedReason | null {
  if (!input.boundedEvidenceExtraction) return "bounded_evidence_extraction_missing";
  if (
    input.boundedEvidenceExtraction.status !== "hidden_evidence_item_extraction_completed" ||
    input.boundedEvidenceExtraction.extractionResultStatus !== "accepted" ||
    input.boundedEvidenceExtraction.extractionStatus !== "evidence_extracted" ||
    input.boundedEvidenceExtraction.extractionResult?.status !== "accepted"
  ) {
    return "bounded_evidence_extraction_not_accepted";
  }
  if (!input.evidenceItemHandoff) return "evidence_item_handoff_missing";
  if (input.evidenceItemHandoff.handoffStatus !== "evidence_items_ready_for_downstream_internal_handoff") {
    return "evidence_item_handoff_not_ready";
  }
  if (!input.sufficiencyIntake) return "sufficiency_intake_missing";
  if (input.sufficiencyIntake.intakeStatus !== "sufficiency_intake_ready_for_contract_only_assessment") {
    return "sufficiency_intake_not_ready";
  }
  if (!input.sufficiencyAssessment) return "sufficiency_assessment_missing";
  if (input.sufficiencyAssessment.assessmentStatus !== "sufficiency_assessment_completed") {
    return "sufficiency_assessment_not_completed";
  }
  if (!input.boundaryVerdictCandidate) return "boundary_verdict_candidate_missing";
  if (input.boundaryVerdictCandidate.status !== "boundary_verdict_candidate_ready") {
    return "boundary_verdict_candidate_not_ready";
  }
  if (!input.internalAlphaReportStop) return "internal_alpha_report_stop_missing";
  if (input.internalAlphaReportStop.status !== "alpha_report_stop_created_not_report_ready") {
    return "internal_alpha_report_stop_not_ready";
  }
  if (!input.boundaryVerdictExecution) return "boundary_verdict_execution_missing";
  if (projection.boundaryVerdictExecutionRuntimeOwnership !== "owned") {
    return "boundary_verdict_execution_not_runtime_owned";
  }
  if (input.boundaryVerdictExecution.status !== "boundary_verdict_candidates_created_internal") {
    return "boundary_verdict_execution_not_accepted";
  }
  if (input.boundaryVerdictExecution.publicCutoverStatus !== "blocked_precutover") {
    return "boundary_verdict_execution_public_cutover_not_blocked";
  }
  if (input.boundaryVerdictExecution.defaultProjection !== "hash_length_provenance_only") {
    return "boundary_verdict_execution_default_projection_not_hash_length_provenance_only";
  }
  if (!boundaryVerdictExecutionSideEffectsClosed(input.boundaryVerdictExecution)) {
    return "boundary_verdict_execution_side_effects_not_closed";
  }
  return null;
}

function parentProjectionDamagedReason(
  projection: ParentProjection,
): InternalAlphaReportResultDamagedReason | null {
  if (
    !projection.boundedEvidenceExtractionDecisionId ||
    !projection.boundedEvidenceExtractionVersion ||
    !projection.evidenceItemHandoffDecisionId ||
    !projection.evidenceItemHandoffVersion ||
    !projection.sufficiencyIntakeDecisionId ||
    !projection.sufficiencyIntakeVersion ||
    !projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId ||
    !projection.sufficiencyAssessmentDecisionId ||
    !projection.sufficiencyAssessmentVersion ||
    !projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId ||
    !projection.sufficiencyAssessmentParentW5DecisionId ||
    !projection.boundaryVerdictCandidateDecisionId ||
    !projection.boundaryVerdictCandidateVersion ||
    !projection.boundaryVerdictCandidateParentHandoffDecisionId ||
    !projection.boundaryVerdictCandidateParentSufficiencyIntakeDecisionId ||
    !projection.boundaryVerdictCandidateParentSufficiencyAssessmentDecisionId ||
    !projection.internalAlphaReportStopDecisionId ||
    !projection.internalAlphaReportStopVersion ||
    !projection.internalAlphaReportStopParentHandoffDecisionId ||
    !projection.internalAlphaReportStopParentSufficiencyIntakeDecisionId ||
    !projection.internalAlphaReportStopParentSufficiencyAssessmentDecisionId ||
    !projection.internalAlphaReportStopParentBoundaryVerdictCandidateDecisionId ||
    !projection.boundaryVerdictExecutionDecisionId ||
    !projection.boundaryVerdictExecutionVersion ||
    !projection.boundaryVerdictExecutionInputPacketHash ||
    !projection.resultPayloadHash ||
    !projection.sourceMaterialLineageHash ||
    !projection.w4hPacketHash ||
    !projection.providerId ||
    !projection.modelId
  ) {
    return "lineage_mismatch";
  }
  if (
    projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId !== projection.evidenceItemHandoffDecisionId ||
    projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId !== projection.sufficiencyIntakeDecisionId ||
    projection.sufficiencyAssessmentParentW5DecisionId !== projection.boundedEvidenceExtractionDecisionId ||
    projection.boundaryVerdictCandidateParentHandoffDecisionId !== projection.evidenceItemHandoffDecisionId ||
    projection.boundaryVerdictCandidateParentSufficiencyIntakeDecisionId !== projection.sufficiencyIntakeDecisionId ||
    projection.boundaryVerdictCandidateParentSufficiencyAssessmentDecisionId !==
      projection.sufficiencyAssessmentDecisionId ||
    projection.internalAlphaReportStopParentHandoffDecisionId !== projection.evidenceItemHandoffDecisionId ||
    projection.internalAlphaReportStopParentSufficiencyIntakeDecisionId !== projection.sufficiencyIntakeDecisionId ||
    projection.internalAlphaReportStopParentSufficiencyAssessmentDecisionId !==
      projection.sufficiencyAssessmentDecisionId ||
    projection.internalAlphaReportStopParentBoundaryVerdictCandidateDecisionId !==
      projection.boundaryVerdictCandidateDecisionId
  ) {
    return "lineage_mismatch";
  }
  if (
    projection.evidenceItemCount <= 0 ||
    projection.boundedEvidenceExtractionEvidenceItemIdRefs.length !== projection.evidenceItemCount ||
    projection.evidenceItemStatementHashes.length !== projection.evidenceItemCount ||
    projection.evidenceItemStatementByteLengths.length !== projection.evidenceItemCount ||
    projection.boundaryVerdictExecutionEvidenceItemCount !== projection.evidenceItemCount
  ) {
    return "statement_projection_mismatch";
  }

  const knownRefs = new Set(projection.boundedEvidenceExtractionEvidenceItemIdRefs);
  const unknownRefs = projection.citedEvidenceItemRefs
    .filter((ref) => !knownRefs.has(ref));
  if (projection.citedEvidenceItemRefs.length === 0 || unknownRefs.length > 0) {
    return "cited_evidence_item_ref_mismatch";
  }
  return null;
}

function inputLineage(projection: ParentProjection): InternalAlphaReportResultInputLineage {
  return {
    boundedEvidenceExtractionDecisionId: projection.boundedEvidenceExtractionDecisionId,
    boundedEvidenceExtractionVersion: projection.boundedEvidenceExtractionVersion,
    boundedEvidenceExtractionProjectionHash: projection.boundedEvidenceExtractionDecisionId
      ? projectionHash({
        decisionId: projection.boundedEvidenceExtractionDecisionId,
        decisionVersion: projection.boundedEvidenceExtractionVersion,
        evidenceItemCount: projection.evidenceItemCount,
        evidenceItemIdRefHashes: projection.boundedEvidenceExtractionEvidenceItemIdRefs.map(hashText).sort(),
        evidenceItemStatementHashes: projection.evidenceItemStatementHashes,
        evidenceItemStatementByteLengths: projection.evidenceItemStatementByteLengths,
      })
      : null,
    evidenceItemHandoffDecisionId: projection.evidenceItemHandoffDecisionId,
    evidenceItemHandoffVersion: projection.evidenceItemHandoffVersion,
    evidenceItemHandoffProjectionHash: projection.evidenceItemHandoffDecisionId
      ? projectionHash({
        decisionId: projection.evidenceItemHandoffDecisionId,
        decisionVersion: projection.evidenceItemHandoffVersion,
        evidenceItemCount: projection.evidenceItemCount,
        evidenceItemStatementHashes: projection.evidenceItemStatementHashes,
        evidenceItemStatementByteLengths: projection.evidenceItemStatementByteLengths,
        sourceMaterialLineageHash: projection.sourceMaterialLineageHash,
        w4hPacketHash: projection.w4hPacketHash,
        providerId: projection.providerId,
        modelId: projection.modelId,
      })
      : null,
    sufficiencyIntakeDecisionId: projection.sufficiencyIntakeDecisionId,
    sufficiencyIntakeVersion: projection.sufficiencyIntakeVersion,
    sufficiencyIntakeProjectionHash: projection.sufficiencyIntakeDecisionId
      ? projectionHash({
        decisionId: projection.sufficiencyIntakeDecisionId,
        decisionVersion: projection.sufficiencyIntakeVersion,
        parentEvidenceItemHandoffDecisionId: projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId,
      })
      : null,
    sufficiencyAssessmentDecisionId: projection.sufficiencyAssessmentDecisionId,
    sufficiencyAssessmentVersion: projection.sufficiencyAssessmentVersion,
    sufficiencyAssessmentProjectionHash: projection.sufficiencyAssessmentDecisionId
      ? projectionHash({
        decisionId: projection.sufficiencyAssessmentDecisionId,
        decisionVersion: projection.sufficiencyAssessmentVersion,
        parentSufficiencyIntakeDecisionId: projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId,
        sufficiencyResultStatus: projection.sufficiencyResultStatus,
        reportStopRecommendation: projection.reportStopRecommendation,
      })
      : null,
    boundaryVerdictCandidateDecisionId: projection.boundaryVerdictCandidateDecisionId,
    boundaryVerdictCandidateVersion: projection.boundaryVerdictCandidateVersion,
    boundaryVerdictCandidateProjectionHash: projection.boundaryVerdictCandidateDecisionId
      ? projectionHash({
        decisionId: projection.boundaryVerdictCandidateDecisionId,
        decisionVersion: projection.boundaryVerdictCandidateVersion,
        status: projection.boundaryVerdictCandidateStatus,
        candidatePopulation: projection.boundaryVerdictCandidatePopulation,
      })
      : null,
    internalAlphaReportStopDecisionId: projection.internalAlphaReportStopDecisionId,
    internalAlphaReportStopVersion: projection.internalAlphaReportStopVersion,
    internalAlphaReportStopProjectionHash: projection.internalAlphaReportStopDecisionId
      ? projectionHash({
        decisionId: projection.internalAlphaReportStopDecisionId,
        decisionVersion: projection.internalAlphaReportStopVersion,
        status: projection.internalAlphaReportStopStatus,
      })
      : null,
    boundaryVerdictExecutionDecisionId: projection.boundaryVerdictExecutionDecisionId,
    boundaryVerdictExecutionVersion: projection.boundaryVerdictExecutionVersion,
    boundaryVerdictExecutionProjectionHash: projection.boundaryVerdictExecutionDecisionId
      ? projectionHash({
        decisionId: projection.boundaryVerdictExecutionDecisionId,
        decisionVersion: projection.boundaryVerdictExecutionVersion,
        status: projection.boundaryVerdictExecutionStatus,
        inputPacketHash: projection.boundaryVerdictExecutionInputPacketHash,
        resultPayloadHash: projection.resultPayloadHash,
      })
      : null,
    boundaryVerdictExecutionInputPacketHash: projection.boundaryVerdictExecutionInputPacketHash,
    boundaryVerdictExecutionParentIdsExposed: false,
  };
}

function boundaryVerdictExecutionSideEffectsClosed(decision: BoundaryVerdictExecutionDecision): boolean {
  return decision.sideEffects.cacheRead === false &&
    decision.sideEffects.cacheWrite === false &&
    decision.sideEffects.parserExecuted === false &&
    decision.sideEffects.sourceReliabilityRead === false &&
    decision.sideEffects.sourceReliabilityWrite === false &&
    decision.sideEffects.storageWrite === false &&
    decision.sideEffects.reportGenerated === false &&
    decision.sideEffects.verdictGenerated === false &&
    decision.sideEffects.warningGenerated === false &&
    decision.sideEffects.confidenceGenerated === false &&
    decision.sideEffects.publicSurfaceWritten === false &&
    decision.redaction.evidenceItemTextReturned === false &&
    decision.redaction.sourceTextReturned === false &&
    decision.redaction.inputPacketReturned === false &&
    decision.redaction.promptTextReturned === false &&
    decision.redaction.renderedPromptTextReturned === false &&
    decision.redaction.providerPayloadReturned === false &&
    decision.redaction.hiddenLedgerReferenceReturned === false &&
    decision.redaction.internalStateReturned === false;
}

function providerAndCostTelemetry(
  decision: BoundaryVerdictExecutionDecision | null | undefined,
): InternalAlphaReportResultProviderAndCostTelemetry {
  return {
    providerId: decision?.executionTelemetry?.providerId ?? null,
    modelId: decision?.executionTelemetry?.modelId ?? null,
    inputTokens: decision?.executionTelemetry?.tokenUsage?.inputTokens ?? null,
    outputTokens: decision?.executionTelemetry?.tokenUsage?.outputTokens ?? null,
    totalTokens: decision?.executionTelemetry?.tokenUsage?.totalTokens ?? null,
    durationMs: decision?.executionTelemetry?.durationMs ?? null,
    attemptCount: decision?.executionTelemetry?.attemptCount ?? 0,
    schemaRetryCount: decision?.executionTelemetry?.schemaRetryCount ?? 0,
    cacheDecision: "no_store_no_read",
  };
}

function decision(
  projection: ParentProjection,
  state: {
    readonly status: InternalAlphaReportResultStatus;
    readonly blockedReason: InternalAlphaReportResultBlockedReason | null;
    readonly damagedReason: InternalAlphaReportResultDamagedReason | null;
  },
): InternalAlphaReportResultCandidate {
  const lineage = inputLineage(projection);
  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
    decisionId: `INTERNAL_ALPHA_REPORT_RESULT_${sha256Json({
      status: state.status,
      blockedReason: state.blockedReason,
      damagedReason: state.damagedReason,
      lineage,
      resultPayloadHash: projection.resultPayloadHash,
    }).slice(0, 24).toUpperCase()}`,
    kind: "internal_alpha_report_result_candidate",
    status: state.status,
    blockedReason: state.blockedReason,
    damagedReason: state.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "admin_structured_candidate_no_source_text",
    inputLineage: lineage,
    reportReadiness: {
      publicCutoverStatus: "blocked_precutover",
      publicCutoverStatusOwnership: "mirror_only_not_source_of_truth",
      reportQualityStatus: "internal_alpha_review_candidate_not_public_report",
      reportCompleteness: "internal_candidate_summary_only",
      comparatorReviewReadiness: "ready_for_internal_comparator_review",
      compatibilityProjection: "closed_precutover_report_damaged",
    },
    boundaryVerdictSummary: {
      boundaryVerdictExecutionStatus: projection.boundaryVerdictExecutionStatus,
      boundaryCandidateCount: projection.boundaryCandidateCount,
      verdictCandidateCount: projection.verdictCandidateCount,
      resultPayloadHash: projection.resultPayloadHash,
      inputPacketHash: projection.boundaryVerdictExecutionInputPacketHash,
      inputPacketByteLength: projection.boundaryVerdictExecutionInputPacketByteLength,
    },
    evidenceTraceability: {
      traceabilitySource: "post_execution_cited_refs",
      fieldSurfaceLimitation:
        "w7b2_exposes_post_execution_cited_refs_but_not_full_parent_input_packet",
      evidenceItemCount: projection.evidenceItemCount,
      inputEvidenceItemIdRefHashes: projection.boundedEvidenceExtractionEvidenceItemIdRefs.map(hashText).sort(),
      inputEvidenceItemStatementHashes: projection.evidenceItemStatementHashes,
      inputEvidenceItemStatementByteLengths: projection.evidenceItemStatementByteLengths,
      citedEvidenceItemRefCount: projection.citedEvidenceItemRefs.length,
      citedEvidenceItemRefHashes: projection.citedEvidenceItemRefs.map(hashText).sort(),
      citedEvidenceItemRefsReturned: false,
      evidenceItemTextReturned: false,
    },
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: projection.warningMaterialityInputs?.upstreamSufficiencyStatus ?? null,
      upstreamRecommendedNextAction: projection.warningMaterialityInputs?.upstreamRecommendedNextAction ?? null,
      boundaryVerdictIntegrityEventCount:
        projection.warningMaterialityInputs?.boundaryVerdictIntegrityEventCount ?? 0,
      candidateMaterialUncertaintySignalCount:
        projection.warningMaterialityInputs?.candidateMaterialUncertaintySignalCount ?? 0,
    },
    providerAndCostTelemetry: projection.providerAndCostTelemetry,
    redaction: noRedaction(),
    sideEffects: noSideEffects(),
    w8aMergeTrigger: {
      triggerName: "merge_w8a_stop_owner_after_w8b_fail_closed_parity_covered",
      triggerCondition: "accepted_runtime_owned_w7b2_output_supersedes_w8a_non_verdict_stop_candidate",
      parityVerifierName: "internal_alpha_report_result_fail_closed_parity_for_blocked_and_damaged_parents",
      status: "pending",
    },
    approvalPointer: INTERNAL_ALPHA_REPORT_RESULT_SOURCE_PACKAGE,
  };
}

function hashText(value: string): string {
  return sha256Json({ value });
}

function projectionHash(value: unknown): string {
  return sha256Json(value);
}

function noRedaction(): InternalAlphaReportResultCandidate["redaction"] {
  return {
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
  };
}

function noSideEffects(): InternalAlphaReportResultSideEffects {
  return {
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
  };
}
