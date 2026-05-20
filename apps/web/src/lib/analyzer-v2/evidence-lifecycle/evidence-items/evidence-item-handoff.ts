import { sha256Json } from "@/lib/analyzer-v2/util";
import type { BoundedEvidenceExtractionDecision } from "./bounded-evidence-extraction";
import type { BoundedEvidenceItemAdmissionDecision } from "./bounded-evidence-item-admission";

export const EVIDENCE_ITEM_HANDOFF_DECISION_VERSION =
  "v2.evidence-lifecycle.evidence-item-handoff.x7w5f" as const;

export type EvidenceItemHandoffStatus =
  | "evidence_items_ready_for_downstream_internal_handoff"
  | "evidence_item_handoff_blocked"
  | "evidence_item_handoff_damaged";

export type EvidenceItemHandoffBlockedReason =
  | "w5e_admission_not_accepted"
  | "w5_result_not_accepted"
  | "w4i_historical_evidence_missing";

export type EvidenceItemHandoffDamagedReason =
  | "admitted_count_mismatch"
  | "statement_projection_mismatch"
  | "lineage_mismatch";

export type EvidenceItemHandoffDecision = {
  readonly decisionVersion: typeof EVIDENCE_ITEM_HANDOFF_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "evidence_item_handoff";
  readonly handoffStatus: EvidenceItemHandoffStatus;
  readonly blockedReason: EvidenceItemHandoffBlockedReason | null;
  readonly damagedReason: EvidenceItemHandoffDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly parentW5ArtifactId: string;
  readonly w5eAdmissionStatus: BoundedEvidenceItemAdmissionDecision["admissionStatus"];
  readonly admittedEvidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly sourceMaterialLineageHash: string | null;
  readonly w4hPacketHash: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly w4iDisposition:
    | "historical_same_ledger_evidence_merged"
    | "retained_until_next_downstream_owner";
  readonly retiredW4iTrigger: "remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner";
  readonly replacementW4iTrigger: "after_w5f_handoff_route_projection_verified";
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
  };
  readonly sideEffects: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
    readonly parserExecuted: false;
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
  };
};

export function buildEvidenceItemHandoffDecision(input: {
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
  readonly boundedEvidenceItemAdmission: BoundedEvidenceItemAdmissionDecision;
}): EvidenceItemHandoffDecision {
  const { boundedEvidenceExtraction: w5, boundedEvidenceItemAdmission: admission } = input;
  const blockedReason = handoffBlockedReason(w5, admission);
  const damagedReason = blockedReason ? null : handoffDamagedReason(w5, admission);
  const handoffStatus: EvidenceItemHandoffStatus = blockedReason
    ? "evidence_item_handoff_blocked"
    : damagedReason
      ? "evidence_item_handoff_damaged"
      : "evidence_items_ready_for_downstream_internal_handoff";

  return {
    decisionVersion: EVIDENCE_ITEM_HANDOFF_DECISION_VERSION,
    decisionId: `EVIDENCE_ITEM_HANDOFF_${sha256Json({
      parentW5ArtifactId: admission.parentW5ArtifactId,
      admittedEvidenceItemCount: admission.admittedEvidenceItemCount,
      evidenceItemStatementHashes: admission.evidenceItemStatementHashes,
    }).slice(0, 24).toUpperCase()}`,
    kind: "evidence_item_handoff",
    handoffStatus,
    blockedReason,
    damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentW5ArtifactId: admission.parentW5ArtifactId,
    w5eAdmissionStatus: admission.admissionStatus,
    admittedEvidenceItemCount: handoffStatus === "evidence_items_ready_for_downstream_internal_handoff"
      ? admission.admittedEvidenceItemCount
      : 0,
    evidenceItemStatementHashes: handoffStatus === "evidence_items_ready_for_downstream_internal_handoff"
      ? admission.evidenceItemStatementHashes
      : [],
    evidenceItemStatementByteLengths: handoffStatus === "evidence_items_ready_for_downstream_internal_handoff"
      ? admission.evidenceItemStatementByteLengths
      : [],
    sourceMaterialLineageHash: admission.sourceMaterialLineageHash,
    w4hPacketHash: admission.w4hPacketHash,
    providerId: admission.providerId,
    modelId: admission.modelId,
    w4iDisposition: "historical_same_ledger_evidence_merged",
    retiredW4iTrigger: "remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner",
    replacementW4iTrigger: "after_w5f_handoff_route_projection_verified",
    redaction: noRedaction(),
    sideEffects: noSideEffects(),
  };
}

function handoffBlockedReason(
  w5: BoundedEvidenceExtractionDecision,
  admission: BoundedEvidenceItemAdmissionDecision,
): EvidenceItemHandoffBlockedReason | null {
  if (admission.admissionStatus !== "bounded_evidence_items_admitted_internal_consumption_pending") {
    return "w5e_admission_not_accepted";
  }
  if (
    w5.status !== "hidden_evidence_item_extraction_completed" ||
    w5.extractionResultStatus !== "accepted" ||
    w5.extractionStatus !== "evidence_extracted" ||
    w5.evidenceItemCount <= 0
  ) {
    return "w5_result_not_accepted";
  }
  if (w5.parent.w4iPreCallGate !== "merged_by_parity_rechecked_not_deleted") {
    return "w4i_historical_evidence_missing";
  }
  return null;
}

function handoffDamagedReason(
  w5: BoundedEvidenceExtractionDecision,
  admission: BoundedEvidenceItemAdmissionDecision,
): EvidenceItemHandoffDamagedReason | null {
  if (
    admission.admittedEvidenceItemCount !== w5.evidenceItemCount ||
    admission.evidenceItemStatementHashes.length !== admission.admittedEvidenceItemCount ||
    admission.evidenceItemStatementByteLengths.length !== admission.admittedEvidenceItemCount
  ) {
    return "admitted_count_mismatch";
  }
  if (
    admission.evidenceItemStatementHashes.some((hash, index) => hash !== w5.evidenceItemStatementHashes[index]) ||
    admission.evidenceItemStatementByteLengths.some((length, index) => length !== w5.evidenceItemStatementByteLengths[index])
  ) {
    return "statement_projection_mismatch";
  }
  if (
    admission.parentW5ArtifactId !== w5.decisionId ||
    admission.w4hPacketHash !== w5.parent.parentPacketHash ||
    admission.providerId !== w5.parent.parentProviderId
  ) {
    return "lineage_mismatch";
  }
  return null;
}

function noRedaction(): EvidenceItemHandoffDecision["redaction"] {
  return {
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
  };
}

function noSideEffects(): EvidenceItemHandoffDecision["sideEffects"] {
  return {
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
  };
}
