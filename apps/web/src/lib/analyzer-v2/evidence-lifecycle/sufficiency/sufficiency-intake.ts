import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { EVIDENCE_ITEM_HANDOFF_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const SUFFICIENCY_INTAKE_DECISION_VERSION =
  "v2.evidence-lifecycle.sufficiency-intake.w6b" as const;

export type SufficiencyIntakeStatus =
  | "sufficiency_intake_ready_for_contract_only_assessment"
  | "sufficiency_intake_blocked"
  | "sufficiency_intake_damaged";

export type SufficiencyIntakeBlockedReason =
  | "evidence_item_handoff_missing"
  | "evidence_item_handoff_not_ready"
  | "evidence_item_handoff_blocked"
  | "evidence_item_handoff_damaged"
  | "evidence_item_handoff_lineage_missing"
  | "evidence_item_handoff_side_effects_not_closed";

export type SufficiencyIntakeDamagedReason =
  | "admitted_count_projection_mismatch"
  | "statement_projection_mismatch"
  | "lineage_projection_mismatch"
  | "non_contract_only_parent"
  | "parent_projection_contains_forbidden_text";

export type SufficiencyIntakeDecision = {
  readonly decisionVersion: typeof SUFFICIENCY_INTAKE_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "sufficiency_intake";
  readonly intakeStatus: SufficiencyIntakeStatus;
  readonly blockedReason: SufficiencyIntakeBlockedReason | null;
  readonly damagedReason: SufficiencyIntakeDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly parentEvidenceItemHandoffDecisionId: string | null;
  readonly parentEvidenceItemHandoffVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
  readonly admittedEvidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly sourceMaterialLineageHash: string | null;
  readonly w4hPacketHash: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly lineageHash: string | null;
  readonly assessmentExecution: "closed_contract_only";
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
    readonly summaryTextReturned: false;
    readonly providerPayloadReturned: false;
  };
  readonly sideEffects: {
    readonly sufficiencyLlmCalled: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly warningGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicSurfaceWritten: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly sourceReliabilityRead: false;
    readonly sourceReliabilityWrite: false;
    readonly storageWrite: false;
    readonly providerCalled: false;
    readonly parserExecuted: false;
  };
};

type ParentProjection = {
  readonly decisionId: string | null;
  readonly decisionVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION | null;
  readonly admittedEvidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly sourceMaterialLineageHash: string | null;
  readonly w4hPacketHash: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
};

export function buildSufficiencyIntakeDecision(
  evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined,
): SufficiencyIntakeDecision {
  if (!evidenceItemHandoff) {
    return decision(emptyProjection(), {
      status: "sufficiency_intake_blocked",
      blockedReason: "evidence_item_handoff_missing",
      damagedReason: null,
    });
  }

  const projection = projectParent(evidenceItemHandoff);
  const contractDamagedReason = parentContractDamagedReason(evidenceItemHandoff);
  if (contractDamagedReason) {
    return decision(projection, {
      status: "sufficiency_intake_damaged",
      blockedReason: null,
      damagedReason: contractDamagedReason,
    });
  }

  const blockedReason = parentBlockedReason(evidenceItemHandoff, projection);
  if (blockedReason) {
    return decision(projection, {
      status: "sufficiency_intake_blocked",
      blockedReason,
      damagedReason: null,
    });
  }

  const projectionDamagedReason = parentProjectionDamagedReason(evidenceItemHandoff, projection);
  if (projectionDamagedReason) {
    return decision(projection, {
      status: "sufficiency_intake_damaged",
      blockedReason: null,
      damagedReason: projectionDamagedReason,
    });
  }

  return decision(projection, {
    status: "sufficiency_intake_ready_for_contract_only_assessment",
    blockedReason: null,
    damagedReason: null,
  });
}

function projectParent(parent: EvidenceItemHandoffDecision): ParentProjection {
  const count = typeof parent.admittedEvidenceItemCount === "number"
    ? parent.admittedEvidenceItemCount
    : 0;

  return {
    decisionId: typeof parent.decisionId === "string" ? parent.decisionId : null,
    decisionVersion: parent.decisionVersion === EVIDENCE_ITEM_HANDOFF_DECISION_VERSION
      ? parent.decisionVersion
      : null,
    admittedEvidenceItemCount: count,
    evidenceItemStatementHashes: Array.isArray(parent.evidenceItemStatementHashes)
      ? parent.evidenceItemStatementHashes.map((hash) => hash)
      : [],
    evidenceItemStatementByteLengths: Array.isArray(parent.evidenceItemStatementByteLengths)
      ? parent.evidenceItemStatementByteLengths.map((length) => length)
      : [],
    sourceMaterialLineageHash: typeof parent.sourceMaterialLineageHash === "string"
      ? parent.sourceMaterialLineageHash
      : null,
    w4hPacketHash: typeof parent.w4hPacketHash === "string" ? parent.w4hPacketHash : null,
    providerId: typeof parent.providerId === "string" ? parent.providerId : null,
    modelId: typeof parent.modelId === "string" ? parent.modelId : null,
  };
}

function parentContractDamagedReason(parent: EvidenceItemHandoffDecision): SufficiencyIntakeDamagedReason | null {
  if (
    parent.decisionVersion !== EVIDENCE_ITEM_HANDOFF_DECISION_VERSION ||
    parent.kind !== "evidence_item_handoff" ||
    parent.visibility !== "internal_admin_only" ||
    parent.publicPointerExposure !== "forbidden" ||
    parent.publicCutoverStatus !== "blocked_precutover" ||
    parent.defaultProjection !== "hash_length_provenance_only" ||
    parent.redaction?.evidenceItemTextReturned !== false ||
    parent.redaction?.sourceTextReturned !== false ||
    parent.redaction?.inputTextReturned !== false
  ) {
    return "non_contract_only_parent";
  }

  if (
    parent.handoffStatus === "evidence_items_ready_for_downstream_internal_handoff" &&
    (parent.blockedReason !== null || parent.damagedReason !== null)
  ) {
    return "non_contract_only_parent";
  }
  if (parent.handoffStatus === "evidence_item_handoff_blocked" && parent.blockedReason === null) {
    return "non_contract_only_parent";
  }
  if (parent.handoffStatus === "evidence_item_handoff_damaged" && parent.damagedReason === null) {
    return "non_contract_only_parent";
  }

  return null;
}

function parentProjectionDamagedReason(
  parent: EvidenceItemHandoffDecision,
  projection: ParentProjection,
): SufficiencyIntakeDamagedReason | null {
  if (
    !Number.isInteger(projection.admittedEvidenceItemCount) ||
    projection.admittedEvidenceItemCount <= 0
  ) {
    return "admitted_count_projection_mismatch";
  }

  if (
    projection.evidenceItemStatementHashes.length !== projection.admittedEvidenceItemCount ||
    projection.evidenceItemStatementByteLengths.length !== projection.admittedEvidenceItemCount ||
    projection.evidenceItemStatementHashes.some((hash) => typeof hash !== "string" || hash.length === 0) ||
    projection.evidenceItemStatementByteLengths.some((length) => (
      !Number.isInteger(length) || length <= 0
    ))
  ) {
    return "statement_projection_mismatch";
  }

  if (
    parent.w4iDisposition !== "historical_same_ledger_evidence_merged" ||
    parent.replacementW4iTrigger !== "after_w5f_handoff_route_projection_verified"
  ) {
    return "lineage_projection_mismatch";
  }

  return null;
}

function parentBlockedReason(
  parent: EvidenceItemHandoffDecision,
  projection: ParentProjection,
): SufficiencyIntakeBlockedReason | null {
  if (parent.handoffStatus === "evidence_item_handoff_blocked") {
    return "evidence_item_handoff_blocked";
  }
  if (parent.handoffStatus === "evidence_item_handoff_damaged") {
    return "evidence_item_handoff_damaged";
  }
  if (parent.handoffStatus !== "evidence_items_ready_for_downstream_internal_handoff") {
    return "evidence_item_handoff_not_ready";
  }
  if (
    !projection.decisionId ||
    !projection.decisionVersion ||
    !projection.sourceMaterialLineageHash ||
    !projection.w4hPacketHash ||
    !projection.providerId ||
    !projection.modelId
  ) {
    return "evidence_item_handoff_lineage_missing";
  }
  if (!parentSideEffectsClosed(parent)) {
    return "evidence_item_handoff_side_effects_not_closed";
  }
  return null;
}

function parentSideEffectsClosed(parent: EvidenceItemHandoffDecision): boolean {
  return (
    parent.sideEffects?.evidenceItemTextReturned === false &&
    parent.sideEffects?.sourceTextReturned === false &&
    parent.sideEffects?.inputTextReturned === false &&
    parent.sideEffects?.parserExecuted === false &&
    parent.sideEffects?.reportGenerated === false &&
    parent.sideEffects?.verdictGenerated === false &&
    parent.sideEffects?.warningGenerated === false &&
    parent.sideEffects?.confidenceGenerated === false &&
    parent.sideEffects?.publicSurfaceWritten === false &&
    parent.sideEffects?.cacheRead === false &&
    parent.sideEffects?.cacheWrite === false &&
    parent.sideEffects?.sourceReliabilityRead === false &&
    parent.sideEffects?.sourceReliabilityWrite === false &&
    parent.sideEffects?.storageWrite === false
  );
}

function decision(
  projection: ParentProjection,
  state: {
    readonly status: SufficiencyIntakeStatus;
    readonly blockedReason: SufficiencyIntakeBlockedReason | null;
    readonly damagedReason: SufficiencyIntakeDamagedReason | null;
  },
): SufficiencyIntakeDecision {
  const lineageHash = projection.decisionId
    ? sha256Json({
      parentEvidenceItemHandoffDecisionId: projection.decisionId,
      parentEvidenceItemHandoffVersion: projection.decisionVersion,
      admittedEvidenceItemCount: projection.admittedEvidenceItemCount,
      evidenceItemStatementHashes: projection.evidenceItemStatementHashes,
      evidenceItemStatementByteLengths: projection.evidenceItemStatementByteLengths,
      sourceMaterialLineageHash: projection.sourceMaterialLineageHash,
      w4hPacketHash: projection.w4hPacketHash,
      providerId: projection.providerId,
      modelId: projection.modelId,
    })
    : null;

  return {
    decisionVersion: SUFFICIENCY_INTAKE_DECISION_VERSION,
    decisionId: `SUFFICIENCY_INTAKE_${sha256Json({
      parentEvidenceItemHandoffDecisionId: projection.decisionId,
      parentEvidenceItemHandoffVersion: projection.decisionVersion,
      intakeStatus: state.status,
      blockedReason: state.blockedReason,
      damagedReason: state.damagedReason,
      lineageHash,
    }).slice(0, 24).toUpperCase()}`,
    kind: "sufficiency_intake",
    intakeStatus: state.status,
    blockedReason: state.blockedReason,
    damagedReason: state.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentEvidenceItemHandoffDecisionId: projection.decisionId,
    parentEvidenceItemHandoffVersion: projection.decisionVersion,
    admittedEvidenceItemCount: state.status === "sufficiency_intake_ready_for_contract_only_assessment"
      ? projection.admittedEvidenceItemCount
      : 0,
    evidenceItemStatementHashes: state.status === "sufficiency_intake_ready_for_contract_only_assessment"
      ? projection.evidenceItemStatementHashes
      : [],
    evidenceItemStatementByteLengths: state.status === "sufficiency_intake_ready_for_contract_only_assessment"
      ? projection.evidenceItemStatementByteLengths
      : [],
    sourceMaterialLineageHash: projection.sourceMaterialLineageHash,
    w4hPacketHash: projection.w4hPacketHash,
    providerId: projection.providerId,
    modelId: projection.modelId,
    lineageHash,
    assessmentExecution: "closed_contract_only",
    redaction: noRedaction(),
    sideEffects: noSideEffects(),
  };
}

function emptyProjection(): ParentProjection {
  return {
    decisionId: null,
    decisionVersion: null,
    admittedEvidenceItemCount: 0,
    evidenceItemStatementHashes: [],
    evidenceItemStatementByteLengths: [],
    sourceMaterialLineageHash: null,
    w4hPacketHash: null,
    providerId: null,
    modelId: null,
  };
}

function noRedaction(): SufficiencyIntakeDecision["redaction"] {
  return {
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    summaryTextReturned: false,
    providerPayloadReturned: false,
  };
}

function noSideEffects(): SufficiencyIntakeDecision["sideEffects"] {
  return {
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
  };
}
