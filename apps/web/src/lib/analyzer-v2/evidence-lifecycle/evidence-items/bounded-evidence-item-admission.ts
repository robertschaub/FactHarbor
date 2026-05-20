import { createHash } from "node:crypto";

import {
  BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
  BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";

export const BOUNDED_EVIDENCE_ITEM_ADMISSION_DECISION_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-item-admission.x7w5e" as const;
export const BOUNDED_EVIDENCE_ITEM_ADMISSION_DEFAULT_PROJECTION_MAX_TOP_LEVEL_FIELDS = 18 as const;

export type BoundedEvidenceItemAdmissionStatus =
  | "bounded_evidence_items_admitted_internal_consumption_pending"
  | "evidence_item_admission_blocked"
  | "evidence_item_admission_damaged";

export type BoundedEvidenceItemAdmissionBlockedReason =
  | "w5_result_not_accepted"
  | "evidence_item_count_not_positive"
  | "lineage_mismatch"
  | "w4h_parent_not_closed_packet"
  | "w4i_parent_not_eligible_denial";

export type BoundedEvidenceItemAdmissionDamagedReason =
  | "malformed_w5_decision"
  | "missing_evidence_item_provenance"
  | "projection_redaction_violation";

export type BoundedEvidenceItemAdmissionSideEffects = {
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

export type BoundedEvidenceItemAdmissionDecision = {
  readonly ledgerIdHash: string;
  readonly parentW5ArtifactId: string;
  readonly admittedEvidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly sourceMaterialLineageHash: string | null;
  readonly w4hPacketHash: string | null;
  readonly w4iEligibilityStatus: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly promptProfileId: typeof BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE;
  readonly schemaVersion: typeof BOUNDED_EVIDENCE_ITEM_ADMISSION_DECISION_VERSION;
  readonly admissionStatus: BoundedEvidenceItemAdmissionStatus;
  readonly blockedReason: BoundedEvidenceItemAdmissionBlockedReason | null;
  readonly damagedReason: BoundedEvidenceItemAdmissionDamagedReason | null;
  readonly sideEffects: BoundedEvidenceItemAdmissionSideEffects;
  readonly defaultProjection: "hash_length_provenance_only";
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputTextReturned: false;
  };
};

export function buildBoundedEvidenceItemAdmissionDecision(input: {
  readonly ledgerId: string;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
}): BoundedEvidenceItemAdmissionDecision {
  const w5 = input.boundedEvidenceExtraction;
  const malformedReason = validateW5DecisionShape(w5);
  if (malformedReason) {
    return decision(input.ledgerId, w5, {
      status: "evidence_item_admission_damaged",
      blockedReason: null,
      damagedReason: malformedReason,
      admittedEvidenceItemCount: 0,
    });
  }

  const blockedReason = blockedReasonFor(w5);
  if (blockedReason) {
    return decision(input.ledgerId, w5, {
      status: "evidence_item_admission_blocked",
      blockedReason,
      damagedReason: null,
      admittedEvidenceItemCount: 0,
    });
  }

  return decision(input.ledgerId, w5, {
    status: "bounded_evidence_items_admitted_internal_consumption_pending",
    blockedReason: null,
    damagedReason: null,
    admittedEvidenceItemCount: w5.evidenceItemCount,
  });
}

function decision(
  ledgerId: string,
  w5: BoundedEvidenceExtractionDecision,
  state: {
    readonly status: BoundedEvidenceItemAdmissionStatus;
    readonly blockedReason: BoundedEvidenceItemAdmissionBlockedReason | null;
    readonly damagedReason: BoundedEvidenceItemAdmissionDamagedReason | null;
    readonly admittedEvidenceItemCount: number;
  },
): BoundedEvidenceItemAdmissionDecision {
  return {
    ledgerIdHash: sha256Text(ledgerId),
    parentW5ArtifactId: w5.decisionId,
    admittedEvidenceItemCount: state.admittedEvidenceItemCount,
    evidenceItemStatementHashes: state.admittedEvidenceItemCount > 0
      ? w5.evidenceItemStatementHashes
      : [],
    evidenceItemStatementByteLengths: state.admittedEvidenceItemCount > 0
      ? w5.evidenceItemStatementByteLengths
      : [],
    sourceMaterialLineageHash: w5.parent.sourceMaterialRef
      ? sha256Text(w5.parent.sourceMaterialRef)
      : null,
    w4hPacketHash: w5.parent.parentPacketHash,
    w4iEligibilityStatus: w5.parent.w4iStatus,
    providerId: w5.parent.parentProviderId,
    modelId: w5.executionTelemetry.modelId,
    promptProfileId: BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE,
    schemaVersion: BOUNDED_EVIDENCE_ITEM_ADMISSION_DECISION_VERSION,
    admissionStatus: state.status,
    blockedReason: state.blockedReason,
    damagedReason: state.damagedReason,
    sideEffects: noSideEffects(),
    defaultProjection: "hash_length_provenance_only",
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
    },
  };
}

function validateW5DecisionShape(
  w5: BoundedEvidenceExtractionDecision,
): BoundedEvidenceItemAdmissionDamagedReason | null {
  if (
    w5.decisionVersion !== BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION ||
    w5.kind !== "bounded_evidence_extraction_execution" ||
    w5.visibility !== "internal_admin_only" ||
    w5.publicPointerExposure !== "forbidden" ||
    w5.publicCutoverStatus !== "blocked_precutover" ||
    w5.defaultProjection !== "hash_length_provenance_only" ||
    w5.evidenceItemTextReturnedByDefault !== false ||
    w5.sourceTextReturnedByDefault !== false ||
    w5.sideEffects.parserExecuted !== false ||
    w5.sideEffects.cacheRead !== false ||
    w5.sideEffects.cacheWrite !== false ||
    w5.sideEffects.reportGenerated !== false ||
    w5.sideEffects.verdictGenerated !== false ||
    w5.sideEffects.warningGenerated !== false ||
    w5.sideEffects.confidenceGenerated !== false ||
    w5.sideEffects.publicSurfaceWritten !== false
  ) {
    return "malformed_w5_decision";
  }

  if (
    w5.productExecution.parserExecuted !== false ||
    w5.productExecution.reportGenerated !== false ||
    w5.productExecution.verdictGenerated !== false ||
    w5.productExecution.warningGenerated !== false ||
    w5.productExecution.confidenceGenerated !== false ||
    w5.productExecution.publicProjectionWritten !== false ||
    w5.productExecution.cacheRead !== false ||
    w5.productExecution.cacheWrite !== false ||
    w5.productExecution.sourceReliabilityRead !== false ||
    w5.productExecution.sourceReliabilityWrite !== false ||
    w5.productExecution.storageWrite !== false
  ) {
    return "malformed_w5_decision";
  }

  const result = w5.extractionResult;
  if (result?.status === "accepted") {
    for (const item of result.evidenceItems) {
      if (
        item.provenance.locator.trim().length === 0 ||
        item.provenance.rationale.trim().length === 0 ||
        !w5.evidenceItemStatementProjections.some(
          (projection) => projection.evidenceItemId === item.evidenceItemId,
        )
      ) {
        return "missing_evidence_item_provenance";
      }
    }
  }

  return null;
}

function blockedReasonFor(
  w5: BoundedEvidenceExtractionDecision,
): BoundedEvidenceItemAdmissionBlockedReason | null {
  if (
    w5.status !== "hidden_evidence_item_extraction_completed" ||
    w5.extractionResultStatus !== "accepted" ||
    w5.extractionStatus !== "evidence_extracted" ||
    w5.extractionResult?.status !== "accepted" ||
    w5.executionTelemetry.schemaDiagnostics !== null ||
    w5.executionTelemetry.retryCount !== 0
  ) {
    return "w5_result_not_accepted";
  }

  if (w5.evidenceItemCount <= 0 || w5.extractionResult.evidenceItems.length <= 0) {
    return "evidence_item_count_not_positive";
  }

  if (w5.parent.w4hStatus !== "bounded_extraction_input_packet_created_extraction_execution_closed") {
    return "w4h_parent_not_closed_packet";
  }

  if (w5.parent.w4iStatus !== "extraction_input_structurally_eligible_execution_denied") {
    return "w4i_parent_not_eligible_denial";
  }

  if (
    w5.parent.w4hRuntimeOwnership !== "owned" ||
    w5.parent.w4iRuntimeOwnership !== "owned" ||
    !w5.parent.parentPacketHash ||
    !w5.parent.parentProviderId ||
    !w5.parent.sourceMaterialRef ||
    !w5.parent.contentPacketId
  ) {
    return "lineage_mismatch";
  }

  if (
    w5.extractionResult.evidenceItems.some(
      (item) =>
        item.sourceRecordId !== w5.parent.sourceMaterialRef ||
        item.contentPacketId !== w5.parent.contentPacketId,
    ) ||
    w5.evidenceItemStatementProjections.some(
      (projection) =>
        projection.sourceRecordId !== w5.parent.sourceMaterialRef ||
        projection.contentPacketId !== w5.parent.contentPacketId,
    )
  ) {
    return "lineage_mismatch";
  }

  return null;
}

function noSideEffects(): BoundedEvidenceItemAdmissionSideEffects {
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

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
