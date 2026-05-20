import type {
  BoundaryVerdictCandidateDecision,
  BoundaryVerdictCandidateStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import { BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { EVIDENCE_ITEM_HANDOFF_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { SUFFICIENCY_ASSESSMENT_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { SUFFICIENCY_INTAKE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION =
  "v2.evidence-lifecycle.internal-alpha-report-stop.w8a" as const;
export const INTERNAL_ALPHA_REPORT_STOP_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W8-A_Internal_Alpha_Report_Stop_Candidate_Review_Package.md" as const;

export type InternalAlphaReportStopStatus =
  | "alpha_report_stop_created_not_report_ready"
  | "alpha_report_stop_blocked"
  | "alpha_report_stop_damaged";

export type InternalAlphaReportStopBlockedReason =
  | "evidence_item_handoff_missing"
  | "evidence_item_handoff_not_ready"
  | "sufficiency_intake_missing"
  | "sufficiency_intake_not_ready"
  | "sufficiency_assessment_missing"
  | "sufficiency_assessment_not_completed"
  | "boundary_verdict_candidate_missing"
  | "boundary_verdict_candidate_not_ready_or_approved_stop"
  | "side_effects_not_closed";

export type InternalAlphaReportStopDamagedReason =
  | "parent_contract_invalid"
  | "lineage_mismatch"
  | "statement_projection_mismatch"
  | "unexpected_verdict_candidate_present"
  | "unexpected_boundary_candidate_present";

export type InternalAlphaReportReadiness = {
  readonly publicCutoverStatus: "blocked_precutover";
  readonly publicCutoverStatusOwnership: "mirror_only_not_source_of_truth";
  readonly reportQualityStatus: "alpha_candidate_not_report_ready";
  readonly reportCompleteness: "non_verdict_stop_only";
  readonly comparatorReviewReadiness: "not_ready_no_verdict_candidate";
  readonly compatibilityProjection: "ineligible_non_verdict_internal_stop_only";
};

export type InternalAlphaReportInputLineage = {
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
};

export type InternalAlphaReportEvidenceTraceability = {
  readonly evidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly boundaryCandidateCount: number;
  readonly verdictCandidatePresent: boolean;
  readonly evidenceItemTextReturned: false;
};

export type InternalAlphaReportSufficiencyAndStopState = {
  readonly sufficiencyResultStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly recommendedNextAction: SufficiencyAssessmentDecision["reportStopRecommendation"];
  readonly boundaryVerdictCandidateStatus: BoundaryVerdictCandidateStatus | null;
  readonly boundaryVerdictCandidatePopulation: BoundaryVerdictCandidateDecision["candidatePopulation"] | null;
  readonly reportStopReason: "boundary_verdict_execution_closed" | "sufficiency_stop" | "parent_blocked";
};

export type InternalAlphaReportWarningMaterialityInputs = {
  readonly warningPublication: "closed";
  readonly userVisibleWarningCount: 0;
  readonly upstreamSufficiencyStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly upstreamRecommendedNextAction: SufficiencyAssessmentDecision["reportStopRecommendation"];
};

export type InternalAlphaReportStopSideEffects = {
  readonly reportProseGenerated: false;
  readonly boundaryCandidatesGenerated: false;
  readonly verdictCandidateGenerated: false;
  readonly verdictGenerated: false;
  readonly warningGenerated: false;
  readonly confidenceGenerated: false;
  readonly truthPercentageGenerated: false;
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

export type InternalAlphaReportStopCandidate = {
  readonly decisionVersion: typeof INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "internal_alpha_report_stop_candidate";
  readonly status: InternalAlphaReportStopStatus;
  readonly blockedReason: InternalAlphaReportStopBlockedReason | null;
  readonly damagedReason: InternalAlphaReportStopDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly w4iDependency: "none";
  readonly reportReadiness: InternalAlphaReportReadiness;
  readonly inputLineage: InternalAlphaReportInputLineage;
  readonly evidenceTraceability: InternalAlphaReportEvidenceTraceability;
  readonly sufficiencyAndStopState: InternalAlphaReportSufficiencyAndStopState;
  readonly warningMaterialityInputs: InternalAlphaReportWarningMaterialityInputs;
  readonly publicProjection: "closed_precutover_report_damaged";
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
    readonly summaryTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly promptTextReturned: false;
    readonly reportProseReturned: false;
    readonly hiddenLedgerReferenceReturned: false;
    readonly internalStateReturned: false;
  };
  readonly sideEffects: InternalAlphaReportStopSideEffects;
  readonly balancedRiskMitigationDecision: {
    readonly namedRisk: "adapter_side_report_semantics_inference_before_llm_boundary_verdict";
    readonly decisionResult: "add";
    readonly owner: "lead_developer";
    readonly netComplexityImpact: "one_internal_stop_owner_no_route_no_runtime_wiring";
    readonly removalOrMergeTrigger: "merge_into_real_internal_report_result_after_w7b_w8b";
  };
  readonly approvalPointer: typeof INTERNAL_ALPHA_REPORT_STOP_SOURCE_PACKAGE;
};

type ParentProjection = {
  readonly evidenceItemHandoffDecisionId: string | null;
  readonly evidenceItemHandoffVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
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
  readonly boundaryVerdictCandidateDecisionId: string | null;
  readonly boundaryVerdictCandidateVersion: typeof BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION | null;
  readonly boundaryVerdictCandidateStatus: BoundaryVerdictCandidateStatus | null;
  readonly boundaryVerdictCandidateBlockedReason: BoundaryVerdictCandidateDecision["blockedReason"] | null;
  readonly boundaryVerdictCandidatePopulation: BoundaryVerdictCandidateDecision["candidatePopulation"] | null;
  readonly boundaryCandidateCount: number;
  readonly verdictCandidatePresent: boolean;
  readonly sufficiencyResultStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly reportStopRecommendation: SufficiencyAssessmentDecision["reportStopRecommendation"];
};

export function buildInternalAlphaReportStopCandidate(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
}): InternalAlphaReportStopCandidate {
  const projection = projectParents(input);
  const contractDamage = parentContractDamagedReason(input);
  if (contractDamage) {
    return decision(projection, {
      status: "alpha_report_stop_damaged",
      blockedReason: null,
      damagedReason: contractDamage,
    });
  }

  const blockedReason = parentBlockedReason(input);
  if (blockedReason) {
    return decision(projection, {
      status: "alpha_report_stop_blocked",
      blockedReason,
      damagedReason: null,
    });
  }

  const projectionDamage = parentProjectionDamagedReason(projection);
  if (projectionDamage) {
    return decision(projection, {
      status: "alpha_report_stop_damaged",
      blockedReason: null,
      damagedReason: projectionDamage,
    });
  }

  return decision(projection, {
    status: "alpha_report_stop_created_not_report_ready",
    blockedReason: null,
    damagedReason: null,
  });
}

function projectParents(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
}): ParentProjection {
  return {
    evidenceItemHandoffDecisionId: input.evidenceItemHandoff?.decisionId ?? null,
    evidenceItemHandoffVersion: input.evidenceItemHandoff?.decisionVersion === EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      ? EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      : null,
    evidenceItemCount: input.evidenceItemHandoff?.admittedEvidenceItemCount ?? 0,
    evidenceItemStatementHashes: input.evidenceItemHandoff?.evidenceItemStatementHashes.map((hash) => hash) ?? [],
    evidenceItemStatementByteLengths: input.evidenceItemHandoff?.evidenceItemStatementByteLengths.map(
      (length) => length,
    ) ?? [],
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
    sufficiencyAssessmentVersion: input.sufficiencyAssessment?.decisionVersion === SUFFICIENCY_ASSESSMENT_DECISION_VERSION
      ? SUFFICIENCY_ASSESSMENT_DECISION_VERSION
      : null,
    sufficiencyAssessmentParentSufficiencyIntakeDecisionId:
      input.sufficiencyAssessment?.parentSufficiencyIntakeDecisionId ?? null,
    boundaryVerdictCandidateDecisionId: input.boundaryVerdictCandidate?.decisionId ?? null,
    boundaryVerdictCandidateVersion:
      input.boundaryVerdictCandidate?.decisionVersion === BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION
        ? BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION
        : null,
    boundaryVerdictCandidateStatus: input.boundaryVerdictCandidate?.status ?? null,
    boundaryVerdictCandidateBlockedReason: input.boundaryVerdictCandidate?.blockedReason ?? null,
    boundaryVerdictCandidatePopulation: input.boundaryVerdictCandidate?.candidatePopulation ?? null,
    boundaryCandidateCount: input.boundaryVerdictCandidate?.boundaryCandidates.length ?? 0,
    verdictCandidatePresent: input.boundaryVerdictCandidate?.verdictCandidate !== null &&
      input.boundaryVerdictCandidate?.verdictCandidate !== undefined,
    sufficiencyResultStatus: input.sufficiencyAssessment?.sufficiencyResultStatus ?? null,
    reportStopRecommendation: input.sufficiencyAssessment?.reportStopRecommendation ?? null,
  };
}

function parentContractDamagedReason(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
}): InternalAlphaReportStopDamagedReason | null {
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
  return null;
}

function parentBlockedReason(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
}): InternalAlphaReportStopBlockedReason | null {
  const evidenceItemHandoff = input.evidenceItemHandoff;
  const sufficiencyIntake = input.sufficiencyIntake;
  const sufficiencyAssessment = input.sufficiencyAssessment;
  const boundaryVerdictCandidate = input.boundaryVerdictCandidate;

  if (!evidenceItemHandoff) return "evidence_item_handoff_missing";
  if (evidenceItemHandoff.handoffStatus !== "evidence_items_ready_for_downstream_internal_handoff") {
    return "evidence_item_handoff_not_ready";
  }
  if (!sufficiencyIntake) return "sufficiency_intake_missing";
  if (sufficiencyIntake.intakeStatus !== "sufficiency_intake_ready_for_contract_only_assessment") {
    return "sufficiency_intake_not_ready";
  }
  if (!sufficiencyAssessment) return "sufficiency_assessment_missing";
  if (sufficiencyAssessment.assessmentStatus !== "sufficiency_assessment_completed") {
    return "sufficiency_assessment_not_completed";
  }
  if (!boundaryVerdictCandidate) return "boundary_verdict_candidate_missing";
  if (!boundaryVerdictCandidateAcceptedForStop(boundaryVerdictCandidate)) {
    return "boundary_verdict_candidate_not_ready_or_approved_stop";
  }
  if (!parentSideEffectsClosed({ evidenceItemHandoff, sufficiencyIntake, sufficiencyAssessment, boundaryVerdictCandidate })) {
    return "side_effects_not_closed";
  }
  return null;
}

function boundaryVerdictCandidateAcceptedForStop(input: BoundaryVerdictCandidateDecision): boolean {
  if (input.status === "boundary_verdict_candidate_ready") return true;
  return input.status === "boundary_verdict_candidate_blocked" &&
    (input.blockedReason === "sufficiency_stop_refine_retrieval" ||
      input.blockedReason === "sufficiency_stop_damage_report");
}

function parentSideEffectsClosed(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision;
  readonly sufficiencyIntake: SufficiencyIntakeDecision;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision;
}): boolean {
  return input.evidenceItemHandoff.sideEffects.reportGenerated === false &&
    input.evidenceItemHandoff.sideEffects.verdictGenerated === false &&
    input.evidenceItemHandoff.sideEffects.warningGenerated === false &&
    input.evidenceItemHandoff.sideEffects.confidenceGenerated === false &&
    input.evidenceItemHandoff.sideEffects.publicSurfaceWritten === false &&
    input.sufficiencyIntake.sideEffects.reportGenerated === false &&
    input.sufficiencyIntake.sideEffects.verdictGenerated === false &&
    input.sufficiencyIntake.sideEffects.warningGenerated === false &&
    input.sufficiencyIntake.sideEffects.confidenceGenerated === false &&
    input.sufficiencyIntake.sideEffects.publicSurfaceWritten === false &&
    input.sufficiencyAssessment.sideEffects.reportGenerated === false &&
    input.sufficiencyAssessment.sideEffects.verdictGenerated === false &&
    input.sufficiencyAssessment.sideEffects.warningGenerated === false &&
    input.sufficiencyAssessment.sideEffects.confidenceGenerated === false &&
    input.sufficiencyAssessment.sideEffects.publicSurfaceWritten === false &&
    input.boundaryVerdictCandidate.sideEffects.reportGenerated === false &&
    input.boundaryVerdictCandidate.sideEffects.verdictGenerated === false &&
    input.boundaryVerdictCandidate.sideEffects.warningGenerated === false &&
    input.boundaryVerdictCandidate.sideEffects.confidenceGenerated === false &&
    input.boundaryVerdictCandidate.sideEffects.publicSurfaceWritten === false &&
    input.boundaryVerdictCandidate.sideEffects.boundaryLlmCalled === false &&
    input.boundaryVerdictCandidate.sideEffects.verdictLlmCalled === false &&
    input.boundaryVerdictCandidate.sideEffects.modelCalled === false;
}

function parentProjectionDamagedReason(projection: ParentProjection): InternalAlphaReportStopDamagedReason | null {
  if (
    !projection.evidenceItemHandoffDecisionId ||
    !projection.evidenceItemHandoffVersion ||
    !projection.sufficiencyIntakeDecisionId ||
    !projection.sufficiencyIntakeVersion ||
    !projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId ||
    !projection.sufficiencyAssessmentDecisionId ||
    !projection.sufficiencyAssessmentVersion ||
    !projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId ||
    !projection.boundaryVerdictCandidateDecisionId ||
    !projection.boundaryVerdictCandidateVersion ||
    !projection.sourceMaterialLineageHash ||
    !projection.w4hPacketHash ||
    !projection.providerId ||
    !projection.modelId
  ) {
    return "lineage_mismatch";
  }
  if (
    projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId !== projection.evidenceItemHandoffDecisionId ||
    projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId !== projection.sufficiencyIntakeDecisionId
  ) {
    return "lineage_mismatch";
  }
  if (
    projection.evidenceItemCount <= 0 ||
    projection.evidenceItemStatementHashes.length !== projection.evidenceItemCount ||
    projection.evidenceItemStatementByteLengths.length !== projection.evidenceItemCount
  ) {
    return "statement_projection_mismatch";
  }
  if (projection.boundaryCandidateCount > 0) return "unexpected_boundary_candidate_present";
  if (projection.verdictCandidatePresent) return "unexpected_verdict_candidate_present";
  return null;
}

function inputLineage(projection: ParentProjection): InternalAlphaReportInputLineage {
  return {
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
        boundaryCandidateCount: projection.boundaryCandidateCount,
        verdictCandidatePresent: projection.verdictCandidatePresent,
      })
      : null,
  };
}

function reportStopReason(
  projection: ParentProjection,
  state: { readonly status: InternalAlphaReportStopStatus },
): InternalAlphaReportSufficiencyAndStopState["reportStopReason"] {
  if (state.status !== "alpha_report_stop_created_not_report_ready") return "parent_blocked";
  if (projection.boundaryVerdictCandidateBlockedReason) return "sufficiency_stop";
  return "boundary_verdict_execution_closed";
}

function projectionHash(value: unknown): string {
  return sha256Json(value);
}

function decision(
  projection: ParentProjection,
  state: {
    readonly status: InternalAlphaReportStopStatus;
    readonly blockedReason: InternalAlphaReportStopBlockedReason | null;
    readonly damagedReason: InternalAlphaReportStopDamagedReason | null;
  },
): InternalAlphaReportStopCandidate {
  const lineage = inputLineage(projection);

  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION,
    decisionId: `INTERNAL_ALPHA_REPORT_STOP_${sha256Json({
      status: state.status,
      blockedReason: state.blockedReason,
      damagedReason: state.damagedReason,
      lineage,
      reportStopRecommendation: projection.reportStopRecommendation,
    }).slice(0, 24).toUpperCase()}`,
    kind: "internal_alpha_report_stop_candidate",
    status: state.status,
    blockedReason: state.blockedReason,
    damagedReason: state.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    w4iDependency: "none",
    reportReadiness: {
      publicCutoverStatus: "blocked_precutover",
      publicCutoverStatusOwnership: "mirror_only_not_source_of_truth",
      reportQualityStatus: "alpha_candidate_not_report_ready",
      reportCompleteness: "non_verdict_stop_only",
      comparatorReviewReadiness: "not_ready_no_verdict_candidate",
      compatibilityProjection: "ineligible_non_verdict_internal_stop_only",
    },
    inputLineage: lineage,
    evidenceTraceability: {
      evidenceItemCount: projection.evidenceItemCount,
      evidenceItemStatementHashes: projection.evidenceItemStatementHashes,
      evidenceItemStatementByteLengths: projection.evidenceItemStatementByteLengths,
      boundaryCandidateCount: projection.boundaryCandidateCount,
      verdictCandidatePresent: projection.verdictCandidatePresent,
      evidenceItemTextReturned: false,
    },
    sufficiencyAndStopState: {
      sufficiencyResultStatus: projection.sufficiencyResultStatus,
      recommendedNextAction: projection.reportStopRecommendation,
      boundaryVerdictCandidateStatus: projection.boundaryVerdictCandidateStatus,
      boundaryVerdictCandidatePopulation: projection.boundaryVerdictCandidatePopulation,
      reportStopReason: reportStopReason(projection, state),
    },
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: projection.sufficiencyResultStatus,
      upstreamRecommendedNextAction: projection.reportStopRecommendation,
    },
    publicProjection: "closed_precutover_report_damaged",
    redaction: noRedaction(),
    sideEffects: noSideEffects(),
    balancedRiskMitigationDecision: {
      namedRisk: "adapter_side_report_semantics_inference_before_llm_boundary_verdict",
      decisionResult: "add",
      owner: "lead_developer",
      netComplexityImpact: "one_internal_stop_owner_no_route_no_runtime_wiring",
      removalOrMergeTrigger: "merge_into_real_internal_report_result_after_w7b_w8b",
    },
    approvalPointer: INTERNAL_ALPHA_REPORT_STOP_SOURCE_PACKAGE,
  };
}

function noRedaction(): InternalAlphaReportStopCandidate["redaction"] {
  return {
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    summaryTextReturned: false,
    providerPayloadReturned: false,
    promptTextReturned: false,
    reportProseReturned: false,
    hiddenLedgerReferenceReturned: false,
    internalStateReturned: false,
  };
}

function noSideEffects(): InternalAlphaReportStopSideEffects {
  return {
    reportProseGenerated: false,
    boundaryCandidatesGenerated: false,
    verdictCandidateGenerated: false,
    verdictGenerated: false,
    warningGenerated: false,
    confidenceGenerated: false,
    truthPercentageGenerated: false,
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
