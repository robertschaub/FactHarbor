import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { EVIDENCE_ITEM_HANDOFF_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { SUFFICIENCY_ASSESSMENT_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { SUFFICIENCY_INTAKE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION =
  "v2.evidence-lifecycle.boundary-verdict-candidate.w7a" as const;
export const BOUNDARY_VERDICT_CANDIDATE_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W7-A_Boundary_Verdict_Candidate_Contract_Review_Package.md" as const;

export type BoundaryVerdictCandidateStatus =
  | "boundary_verdict_candidate_ready"
  | "boundary_verdict_candidate_blocked"
  | "boundary_verdict_candidate_damaged";

export type BoundaryVerdictCandidateBlockedReason =
  | "evidence_item_handoff_missing"
  | "evidence_item_handoff_not_ready"
  | "sufficiency_intake_missing"
  | "sufficiency_intake_not_ready"
  | "sufficiency_assessment_missing"
  | "sufficiency_assessment_not_completed"
  | "sufficiency_stop_refine_retrieval"
  | "sufficiency_stop_damage_report"
  | "lineage_mismatch"
  | "side_effects_not_closed";

export type BoundaryVerdictCandidateDamagedReason =
  | "parent_contract_invalid"
  | "statement_projection_mismatch"
  | "lineage_projection_mismatch";

export type BoundaryVerdictContractMode = "contract_only_non_semantic";

export type BoundaryVerdictInputLineage = {
  readonly evidenceItemHandoffDecisionId: string | null;
  readonly evidenceItemHandoffVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
  readonly evidenceItemHandoffProjectionHash: string | null;
  readonly sufficiencyIntakeDecisionId: string | null;
  readonly sufficiencyIntakeVersion: typeof SUFFICIENCY_INTAKE_DECISION_VERSION | null;
  readonly sufficiencyIntakeLineageHash: string | null;
  readonly sufficiencyIntakeProjectionHash: string | null;
  readonly sufficiencyAssessmentDecisionId: string | null;
  readonly sufficiencyAssessmentVersion: typeof SUFFICIENCY_ASSESSMENT_DECISION_VERSION | null;
  readonly sufficiencyAssessmentProjectionHash: string | null;
};

export type BoundaryVerdictSufficiencyGate = {
  readonly sufficiencyResultStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly recommendedNextAction: SufficiencyAssessmentDecision["reportStopRecommendation"];
  readonly stopReason: BoundaryVerdictCandidateBlockedReason | null;
  readonly nonVerdictStopArtifact: boolean;
};

export type BoundaryCandidateContract = {
  readonly boundaryCandidateId: string;
  readonly targetAtomicClaimIds: readonly string[];
  readonly evidenceItemIds: readonly string[];
};

export type VerdictCandidateContract = {
  readonly verdictCandidateId: string;
  readonly boundaryCandidateIds: readonly string[];
  readonly evidenceItemIds: readonly string[];
};

export type BoundaryVerdictCandidateSideEffects = {
  readonly boundaryLlmCalled: false;
  readonly verdictLlmCalled: false;
  readonly promptLoaded: false;
  readonly promptRendered: false;
  readonly modelCalled: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly parserExecuted: false;
  readonly sourceReliabilityRead: false;
  readonly sourceReliabilityWrite: false;
  readonly storageWrite: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly warningGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type BoundaryVerdictCandidateDecision = {
  readonly decisionVersion: typeof BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "boundary_verdict_candidate_contract";
  readonly contractMode: BoundaryVerdictContractMode;
  readonly status: BoundaryVerdictCandidateStatus;
  readonly blockedReason: BoundaryVerdictCandidateBlockedReason | null;
  readonly damagedReason: BoundaryVerdictCandidateDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly inputLineage: BoundaryVerdictInputLineage;
  readonly sufficiencyGate: BoundaryVerdictSufficiencyGate;
  readonly boundaryCandidates: readonly BoundaryCandidateContract[];
  readonly verdictCandidate: VerdictCandidateContract | null;
  readonly candidatePopulation: "closed_until_llm_task_approved";
  readonly w4iDependency: "none";
  readonly w8aReadiness: "ready_for_internal_alpha_report_contract" | "blocked_before_report_contract";
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
    readonly summaryTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly promptTextReturned: false;
    readonly hiddenLedgerReferenceReturned: false;
    readonly internalStateReturned: false;
  };
  readonly sideEffects: BoundaryVerdictCandidateSideEffects;
  readonly approvalPointer: typeof BOUNDARY_VERDICT_CANDIDATE_SOURCE_PACKAGE;
};

type ParentProjection = {
  readonly evidenceItemHandoffDecisionId: string | null;
  readonly evidenceItemHandoffVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
  readonly evidenceItemHandoffParentW5ArtifactId: string | null;
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
  readonly sufficiencyIntakeLineageHash: string | null;
  readonly sufficiencyAssessmentDecisionId: string | null;
  readonly sufficiencyAssessmentVersion: typeof SUFFICIENCY_ASSESSMENT_DECISION_VERSION | null;
  readonly sufficiencyAssessmentParentSufficiencyIntakeDecisionId: string | null;
  readonly sufficiencyAssessmentParentW5DecisionId: string | null;
  readonly sufficiencyResultStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
  readonly reportStopRecommendation: SufficiencyAssessmentDecision["reportStopRecommendation"];
};

export function buildBoundaryVerdictCandidateDecision(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
}): BoundaryVerdictCandidateDecision {
  const projection = projectParents(input);
  const contractDamage = parentContractDamagedReason(input);
  if (contractDamage) {
    return decision(projection, {
      status: "boundary_verdict_candidate_damaged",
      blockedReason: null,
      damagedReason: contractDamage,
    });
  }

  const blockedReason = parentBlockedReason(input);
  if (blockedReason) {
    return decision(projection, {
      status: "boundary_verdict_candidate_blocked",
      blockedReason,
      damagedReason: null,
    });
  }

  const projectionDamage = parentProjectionDamagedReason(projection);
  if (projectionDamage) {
    return decision(projection, {
      status: "boundary_verdict_candidate_damaged",
      blockedReason: null,
      damagedReason: projectionDamage,
    });
  }

  const stopReason = sufficiencyStopReason(projection.reportStopRecommendation);
  if (stopReason) {
    return decision(projection, {
      status: "boundary_verdict_candidate_blocked",
      blockedReason: stopReason,
      damagedReason: null,
    });
  }

  return decision(projection, {
    status: "boundary_verdict_candidate_ready",
    blockedReason: null,
    damagedReason: null,
  });
}

function projectParents(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
}): ParentProjection {
  return {
    evidenceItemHandoffDecisionId: input.evidenceItemHandoff?.decisionId ?? null,
    evidenceItemHandoffVersion: input.evidenceItemHandoff?.decisionVersion === EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      ? EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      : null,
    evidenceItemHandoffParentW5ArtifactId: input.evidenceItemHandoff?.parentW5ArtifactId ?? null,
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
    sufficiencyIntakeLineageHash: input.sufficiencyIntake?.lineageHash ?? null,
    sufficiencyAssessmentDecisionId: input.sufficiencyAssessment?.decisionId ?? null,
    sufficiencyAssessmentVersion: input.sufficiencyAssessment?.decisionVersion === SUFFICIENCY_ASSESSMENT_DECISION_VERSION
      ? SUFFICIENCY_ASSESSMENT_DECISION_VERSION
      : null,
    sufficiencyAssessmentParentSufficiencyIntakeDecisionId:
      input.sufficiencyAssessment?.parentSufficiencyIntakeDecisionId ?? null,
    sufficiencyAssessmentParentW5DecisionId: input.sufficiencyAssessment?.parentW5DecisionId ?? null,
    sufficiencyResultStatus: input.sufficiencyAssessment?.sufficiencyResultStatus ?? null,
    reportStopRecommendation: input.sufficiencyAssessment?.reportStopRecommendation ?? null,
  };
}

function parentContractDamagedReason(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
}): BoundaryVerdictCandidateDamagedReason | null {
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
      input.sufficiencyIntake.defaultProjection !== "hash_length_provenance_only" ||
      input.sufficiencyIntake.assessmentExecution !== "closed_contract_only"
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
  return null;
}

function parentBlockedReason(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
}): BoundaryVerdictCandidateBlockedReason | null {
  const evidenceItemHandoff = input.evidenceItemHandoff;
  const sufficiencyIntake = input.sufficiencyIntake;
  const sufficiencyAssessment = input.sufficiencyAssessment;

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
  if (!parentSideEffectsClosed({ evidenceItemHandoff, sufficiencyIntake, sufficiencyAssessment })) {
    return "side_effects_not_closed";
  }
  return null;
}

function parentSideEffectsClosed(input: {
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision;
  readonly sufficiencyIntake: SufficiencyIntakeDecision;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision;
}): boolean {
  return input.evidenceItemHandoff.sideEffects.reportGenerated === false &&
    input.evidenceItemHandoff.sideEffects.verdictGenerated === false &&
    input.evidenceItemHandoff.sideEffects.warningGenerated === false &&
    input.evidenceItemHandoff.sideEffects.confidenceGenerated === false &&
    input.evidenceItemHandoff.sideEffects.publicSurfaceWritten === false &&
    input.evidenceItemHandoff.sideEffects.cacheRead === false &&
    input.evidenceItemHandoff.sideEffects.cacheWrite === false &&
    input.evidenceItemHandoff.sideEffects.sourceReliabilityRead === false &&
    input.evidenceItemHandoff.sideEffects.sourceReliabilityWrite === false &&
    input.evidenceItemHandoff.sideEffects.storageWrite === false &&
    input.evidenceItemHandoff.sideEffects.parserExecuted === false &&
    input.sufficiencyIntake.sideEffects.reportGenerated === false &&
    input.sufficiencyIntake.sideEffects.verdictGenerated === false &&
    input.sufficiencyIntake.sideEffects.warningGenerated === false &&
    input.sufficiencyIntake.sideEffects.confidenceGenerated === false &&
    input.sufficiencyIntake.sideEffects.publicSurfaceWritten === false &&
    input.sufficiencyIntake.sideEffects.cacheRead === false &&
    input.sufficiencyIntake.sideEffects.cacheWrite === false &&
    input.sufficiencyIntake.sideEffects.sourceReliabilityRead === false &&
    input.sufficiencyIntake.sideEffects.sourceReliabilityWrite === false &&
    input.sufficiencyIntake.sideEffects.storageWrite === false &&
    input.sufficiencyIntake.sideEffects.parserExecuted === false &&
    input.sufficiencyAssessment.sideEffects.reportGenerated === false &&
    input.sufficiencyAssessment.sideEffects.verdictGenerated === false &&
    input.sufficiencyAssessment.sideEffects.warningGenerated === false &&
    input.sufficiencyAssessment.sideEffects.confidenceGenerated === false &&
    input.sufficiencyAssessment.sideEffects.publicSurfaceWritten === false &&
    input.sufficiencyAssessment.sideEffects.cacheRead === false &&
    input.sufficiencyAssessment.sideEffects.cacheWrite === false &&
    input.sufficiencyAssessment.sideEffects.sourceReliabilityRead === false &&
    input.sufficiencyAssessment.sideEffects.sourceReliabilityWrite === false &&
    input.sufficiencyAssessment.sideEffects.storageWrite === false &&
    input.sufficiencyAssessment.sideEffects.parserExecuted === false;
}

function parentProjectionDamagedReason(
  projection: ParentProjection,
): BoundaryVerdictCandidateDamagedReason | null {
  if (
    !projection.evidenceItemHandoffDecisionId ||
    !projection.evidenceItemHandoffVersion ||
    !projection.evidenceItemHandoffParentW5ArtifactId ||
    !projection.sufficiencyIntakeDecisionId ||
    !projection.sufficiencyIntakeVersion ||
    !projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId ||
    !projection.sufficiencyIntakeLineageHash ||
    !projection.sufficiencyAssessmentDecisionId ||
    !projection.sufficiencyAssessmentVersion ||
    !projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId ||
    !projection.sufficiencyAssessmentParentW5DecisionId ||
    !projection.sourceMaterialLineageHash ||
    !projection.w4hPacketHash ||
    !projection.providerId ||
    !projection.modelId
  ) {
    return "lineage_projection_mismatch";
  }
  if (
    projection.sufficiencyIntakeParentEvidenceItemHandoffDecisionId !== projection.evidenceItemHandoffDecisionId ||
    projection.sufficiencyAssessmentParentSufficiencyIntakeDecisionId !== projection.sufficiencyIntakeDecisionId ||
    projection.sufficiencyAssessmentParentW5DecisionId !== projection.evidenceItemHandoffParentW5ArtifactId
  ) {
    return "lineage_projection_mismatch";
  }
  if (
    projection.evidenceItemCount <= 0 ||
    projection.evidenceItemStatementHashes.length !== projection.evidenceItemCount ||
    projection.evidenceItemStatementByteLengths.length !== projection.evidenceItemCount
  ) {
    return "statement_projection_mismatch";
  }
  return null;
}

function sufficiencyStopReason(
  recommendation: SufficiencyAssessmentDecision["reportStopRecommendation"],
): BoundaryVerdictCandidateBlockedReason | null {
  if (recommendation === "refine_retrieval") return "sufficiency_stop_refine_retrieval";
  if (recommendation === "damage_report") return "sufficiency_stop_damage_report";
  return null;
}

function projectionHash(input: unknown): string {
  return sha256Json(input);
}

function inputLineage(projection: ParentProjection): BoundaryVerdictInputLineage {
  return {
    evidenceItemHandoffDecisionId: projection.evidenceItemHandoffDecisionId,
    evidenceItemHandoffVersion: projection.evidenceItemHandoffVersion,
    evidenceItemHandoffProjectionHash: projection.evidenceItemHandoffDecisionId
      ? projectionHash({
        decisionId: projection.evidenceItemHandoffDecisionId,
        decisionVersion: projection.evidenceItemHandoffVersion,
        parentW5ArtifactId: projection.evidenceItemHandoffParentW5ArtifactId,
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
    sufficiencyIntakeLineageHash: projection.sufficiencyIntakeLineageHash,
    sufficiencyIntakeProjectionHash: projection.sufficiencyIntakeDecisionId
      ? projectionHash({
        decisionId: projection.sufficiencyIntakeDecisionId,
        decisionVersion: projection.sufficiencyIntakeVersion,
        lineageHash: projection.sufficiencyIntakeLineageHash,
        parentEvidenceItemHandoffDecisionId: projection.evidenceItemHandoffDecisionId,
      })
      : null,
    sufficiencyAssessmentDecisionId: projection.sufficiencyAssessmentDecisionId,
    sufficiencyAssessmentVersion: projection.sufficiencyAssessmentVersion,
    sufficiencyAssessmentProjectionHash: projection.sufficiencyAssessmentDecisionId
      ? projectionHash({
        decisionId: projection.sufficiencyAssessmentDecisionId,
        decisionVersion: projection.sufficiencyAssessmentVersion,
        parentSufficiencyIntakeDecisionId: projection.sufficiencyIntakeDecisionId,
        parentW5DecisionId: projection.evidenceItemHandoffParentW5ArtifactId,
        sufficiencyResultStatus: projection.sufficiencyResultStatus,
        reportStopRecommendation: projection.reportStopRecommendation,
      })
      : null,
  };
}

function decision(
  projection: ParentProjection,
  state: {
    readonly status: BoundaryVerdictCandidateStatus;
    readonly blockedReason: BoundaryVerdictCandidateBlockedReason | null;
    readonly damagedReason: BoundaryVerdictCandidateDamagedReason | null;
  },
): BoundaryVerdictCandidateDecision {
  const stopReason = state.blockedReason === "sufficiency_stop_refine_retrieval" ||
    state.blockedReason === "sufficiency_stop_damage_report"
    ? state.blockedReason
    : null;
  const lineage = inputLineage(projection);

  return {
    decisionVersion: BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION,
    decisionId: `BOUNDARY_VERDICT_CANDIDATE_${sha256Json({
      status: state.status,
      blockedReason: state.blockedReason,
      damagedReason: state.damagedReason,
      inputLineage: lineage,
      sufficiencyResultStatus: projection.sufficiencyResultStatus,
      reportStopRecommendation: projection.reportStopRecommendation,
    }).slice(0, 24).toUpperCase()}`,
    kind: "boundary_verdict_candidate_contract",
    contractMode: "contract_only_non_semantic",
    status: state.status,
    blockedReason: state.blockedReason,
    damagedReason: state.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    inputLineage: lineage,
    sufficiencyGate: {
      sufficiencyResultStatus: projection.sufficiencyResultStatus,
      recommendedNextAction: projection.reportStopRecommendation,
      stopReason,
      nonVerdictStopArtifact: stopReason !== null,
    },
    boundaryCandidates: [],
    verdictCandidate: null,
    candidatePopulation: "closed_until_llm_task_approved",
    w4iDependency: "none",
    w8aReadiness: state.status === "boundary_verdict_candidate_ready"
      ? "ready_for_internal_alpha_report_contract"
      : "blocked_before_report_contract",
    redaction: noRedaction(),
    sideEffects: noSideEffects(),
    approvalPointer: BOUNDARY_VERDICT_CANDIDATE_SOURCE_PACKAGE,
  };
}

function noRedaction(): BoundaryVerdictCandidateDecision["redaction"] {
  return {
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    summaryTextReturned: false,
    providerPayloadReturned: false,
    promptTextReturned: false,
    hiddenLedgerReferenceReturned: false,
    internalStateReturned: false,
  };
}

function noSideEffects(): BoundaryVerdictCandidateSideEffects {
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
