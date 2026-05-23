import { createHash } from "node:crypto";

import {
  BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES,
  BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION,
  BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES,
  BOUNDED_EXTRACTION_INPUT_PACKET_VERSION,
  type BoundedExtractionInputAuthorizationDecision,
  type BoundedTextExtractionInputPacket,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";

export const EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION =
  "v2.evidence-lifecycle.execution-readiness-denial.x7w4i" as const;

export const EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.execution-readiness-denial-artifact.x7w4i" as const;

export const EVIDENCE_LIFECYCLE_EXECUTION_READINESS_INPUT_MAX_TEXT_BYTES =
  BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES;

export type EvidenceLifecycleExecutionReadinessDenialStatus =
  | "extraction_input_structurally_eligible_execution_denied"
  | "blocked_pre_execution_readiness_w4h_not_runtime_owned"
  | "blocked_pre_execution_readiness_w4h_not_positive"
  | "blocked_pre_execution_readiness_packet_missing"
  | "blocked_pre_execution_readiness_packet_count_unsupported"
  | "blocked_pre_execution_readiness_packet_kind_unsupported"
  | "blocked_pre_execution_readiness_packet_visibility_invalid"
  | "blocked_pre_execution_readiness_packet_text_missing"
  | "blocked_pre_execution_readiness_packet_text_oversized"
  | "blocked_pre_execution_readiness_packet_text_hash_mismatch"
  | "blocked_pre_execution_readiness_source_material_hash_mismatch"
  | "blocked_pre_execution_readiness_provider_id_mismatch"
  | "blocked_pre_execution_readiness_lineage_missing_or_invalid"
  | "blocked_pre_execution_readiness_w4h_downstream_flags_open"
  | "blocked_pre_execution_readiness_public_cutover_not_blocked"
  | "blocked_pre_execution_readiness_raw_leakage_risk";

export type EvidenceLifecycleExecutionReadinessStopCondition =
  | "extraction_execution_not_authorized_in_x7w4i"
  | "w4h_runtime_ownership_missing"
  | "w4h_packet_not_structurally_positive"
  | "packet_contract_invalid"
  | "packet_text_contract_invalid"
  | "packet_lineage_contract_invalid"
  | "w4h_downstream_gate_opened"
  | "public_or_default_text_exposure_risk";

export interface EvidenceLifecycleExecutionReadinessDenialInput {
  readonly extractionInputAuthorization: BoundedExtractionInputAuthorizationDecision | null;
  readonly extractionInputRuntimeOwnership: "owned" | "not_owned" | "mutated_after_provenance";
}

export interface EvidenceLifecycleExecutionReadinessDenialDecision {
  readonly decisionVersion: typeof EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "evidence_lifecycle_execution_readiness_denial";
  readonly status: EvidenceLifecycleExecutionReadinessDenialStatus;
  readonly stopCondition: EvidenceLifecycleExecutionReadinessStopCondition;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly adminDefaultProjection: "hash_length_provenance_only";
  readonly inputTextReturnedByDefault: false;
  readonly structuralEligibility:
    | "eligible_but_execution_denied"
    | "ineligible_execution_denied";
  readonly executionGateStatus: "closed_pre_execution";
  readonly deniedAuthority: "x7w4i_no_extraction_execution_authority";
  readonly parent: {
    readonly authorizationDecisionVersion: string | null;
    readonly authorizationStatus: string | null;
    readonly authorizationDecisionId: string | null;
    readonly authorizationVisibility: string | null;
    readonly packetVersion: string | null;
    readonly packetKind: string | null;
    readonly packetId: string | null;
    readonly providerId: string | null;
    readonly sourceMaterialRef: string | null;
    readonly sidecarHash: string | null;
    readonly sidecarByteLength: number | null;
    readonly runtimeOwnership: "owned" | "not_owned" | "mutated_after_provenance";
  };
  readonly packetObservation: {
    readonly packetCount: number;
    readonly inputTextHash: string | null;
    readonly inputTextByteLength: number | null;
    readonly inputTextCharLength: number | null;
    readonly maxInputTextBytes: typeof EVIDENCE_LIFECYCLE_EXECUTION_READINESS_INPUT_MAX_TEXT_BYTES;
    readonly sourceMaterialTextHash: string | null;
    readonly sourceMaterialTextByteLength: number | null;
    readonly sourceMaterialEndpointId: string | null;
    readonly languageCode: string | null;
    readonly locatorRef: string | null;
    readonly candidatePreviewId: string | null;
  };
  readonly productExecution: {
    readonly w4hPacketObserved: boolean;
    readonly executionReadinessDecisionCreated: boolean;
    readonly extractionExecutionAuthorized: false;
    readonly llmExtractionCallAuthorized: false;
    readonly evidenceItemGenerated: false;
    readonly parserExecuted: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly warningGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicProjectionWritten: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly sourceReliabilityRead: false;
    readonly sourceReliabilityWrite: false;
  };
  readonly evidenceItems: readonly [];
  readonly parserOutput: null;
  readonly reportOutput: null;
}

export function buildEvidenceLifecycleExecutionReadinessDenial(
  input: EvidenceLifecycleExecutionReadinessDenialInput,
): EvidenceLifecycleExecutionReadinessDenialDecision {
  const decision = input.extractionInputAuthorization;
  const runtimeOwnership = input.extractionInputRuntimeOwnership;

  if (runtimeOwnership !== "owned") {
    return buildBlockedDecision({
      status: "blocked_pre_execution_readiness_w4h_not_runtime_owned",
      stopCondition: "w4h_runtime_ownership_missing",
      runtimeOwnership,
      decision,
      packet: null,
    });
  }

  if (!isPositiveW4hDecision(decision)) {
    return buildBlockedDecision({
      status: "blocked_pre_execution_readiness_w4h_not_positive",
      stopCondition: "w4h_packet_not_structurally_positive",
      runtimeOwnership,
      decision,
      packet: firstPacket(decision),
    });
  }

  if (decision.publicCutoverStatus !== "blocked_precutover") {
    return buildBlockedDecision({
      status: "blocked_pre_execution_readiness_public_cutover_not_blocked",
      stopCondition: "public_or_default_text_exposure_risk",
      runtimeOwnership,
      decision,
      packet: firstPacket(decision),
    });
  }

  if (decision.extractionInputPacketCount !== 1 || decision.extractionInputPacket === null) {
    return buildBlockedDecision({
      status: "blocked_pre_execution_readiness_packet_count_unsupported",
      stopCondition: "packet_contract_invalid",
      runtimeOwnership,
      decision,
      packet: firstPacket(decision),
    });
  }

  const packet = decision.extractionInputPacket;
  if (!packet) {
    return buildBlockedDecision({
      status: "blocked_pre_execution_readiness_packet_missing",
      stopCondition: "packet_contract_invalid",
      runtimeOwnership,
      decision,
      packet: null,
    });
  }

  const packetKindStatus = validatePacketKind(packet);
  if (packetKindStatus) {
    return buildBlockedDecision({
      status: packetKindStatus,
      stopCondition: "packet_contract_invalid",
      runtimeOwnership,
      decision,
      packet,
    });
  }

  const textStatus = validatePacketText(packet);
  if (textStatus) {
    return buildBlockedDecision({
      status: textStatus,
      stopCondition: "packet_text_contract_invalid",
      runtimeOwnership,
      decision,
      packet,
    });
  }

  const lineageStatus = validatePacketLineage(decision, packet);
  if (lineageStatus) {
    return buildBlockedDecision({
      status: lineageStatus,
      stopCondition: "packet_lineage_contract_invalid",
      runtimeOwnership,
      decision,
      packet,
    });
  }

  if (!allDownstreamExecutionFlagsClosed(decision, packet)) {
    return buildBlockedDecision({
      status: "blocked_pre_execution_readiness_w4h_downstream_flags_open",
      stopCondition: "w4h_downstream_gate_opened",
      runtimeOwnership,
      decision,
      packet,
    });
  }

  return buildDecision({
    status: "extraction_input_structurally_eligible_execution_denied",
    stopCondition: "extraction_execution_not_authorized_in_x7w4i",
    structuralEligibility: "eligible_but_execution_denied",
    runtimeOwnership,
    decision,
    packet,
  });
}

function buildBlockedDecision(input: {
  readonly status: EvidenceLifecycleExecutionReadinessDenialStatus;
  readonly stopCondition: EvidenceLifecycleExecutionReadinessStopCondition;
  readonly runtimeOwnership: "owned" | "not_owned" | "mutated_after_provenance";
  readonly decision: BoundedExtractionInputAuthorizationDecision | null;
  readonly packet: BoundedTextExtractionInputPacket | null;
}): EvidenceLifecycleExecutionReadinessDenialDecision {
  return buildDecision({
    ...input,
    structuralEligibility: "ineligible_execution_denied",
  });
}

function buildDecision(input: {
  readonly status: EvidenceLifecycleExecutionReadinessDenialStatus;
  readonly stopCondition: EvidenceLifecycleExecutionReadinessStopCondition;
  readonly structuralEligibility:
    | "eligible_but_execution_denied"
    | "ineligible_execution_denied";
  readonly runtimeOwnership: "owned" | "not_owned" | "mutated_after_provenance";
  readonly decision: BoundedExtractionInputAuthorizationDecision | null;
  readonly packet: BoundedTextExtractionInputPacket | null;
}): EvidenceLifecycleExecutionReadinessDenialDecision {
  const packetObservation = buildPacketObservation(input.packet);
  const decisionId = buildDecisionId(input.decision, input.packet, input.status);

  return {
    decisionVersion: EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION,
    decisionId,
    kind: "evidence_lifecycle_execution_readiness_denial",
    status: input.status,
    stopCondition: input.stopCondition,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    adminDefaultProjection: "hash_length_provenance_only",
    inputTextReturnedByDefault: false,
    structuralEligibility: input.structuralEligibility,
    executionGateStatus: "closed_pre_execution",
    deniedAuthority: "x7w4i_no_extraction_execution_authority",
    parent: buildParent(input.decision, input.packet, input.runtimeOwnership),
    packetObservation,
    productExecution: {
      w4hPacketObserved: Boolean(input.packet),
      executionReadinessDecisionCreated: true,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicProjectionWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
    },
    evidenceItems: [],
    parserOutput: null,
    reportOutput: null,
  };
}

function buildParent(
  decision: BoundedExtractionInputAuthorizationDecision | null,
  packet: BoundedTextExtractionInputPacket | null,
  runtimeOwnership: "owned" | "not_owned" | "mutated_after_provenance",
): EvidenceLifecycleExecutionReadinessDenialDecision["parent"] {
  return {
    authorizationDecisionVersion: decision?.decisionVersion ?? null,
    authorizationStatus: decision?.status ?? null,
    authorizationDecisionId: null,
    authorizationVisibility: decision?.visibility ?? null,
    packetVersion: packet?.packetVersion ?? null,
    packetKind: packet?.kind ?? null,
    packetId: packet?.packetId ?? null,
    providerId: packet?.providerId ?? decision?.parent.providerId ?? null,
    sourceMaterialRef: packet?.sourceMaterialRef ?? null,
    sidecarHash: decision?.parent.textHash ?? null,
    sidecarByteLength: decision?.parent.textByteLength ?? null,
    runtimeOwnership,
  };
}

function buildPacketObservation(
  packet: BoundedTextExtractionInputPacket | null,
): EvidenceLifecycleExecutionReadinessDenialDecision["packetObservation"] {
  return {
    packetCount: packet ? 1 : 0,
    inputTextHash: packet?.inputTextHash ?? null,
    inputTextByteLength: packet?.inputTextByteLength ?? null,
    inputTextCharLength: packet?.inputTextCharLength ?? null,
    maxInputTextBytes: EVIDENCE_LIFECYCLE_EXECUTION_READINESS_INPUT_MAX_TEXT_BYTES,
    sourceMaterialTextHash: packet?.sourceMaterialTextHash ?? null,
    sourceMaterialTextByteLength: packet?.sourceMaterialTextByteLength ?? null,
    sourceMaterialEndpointId: packet?.sourceMaterialEndpointId ?? null,
    languageCode: packet?.languageCode ?? null,
    locatorRef: packet?.locatorRef ?? null,
    candidatePreviewId: packet?.candidatePreviewId ?? null,
  };
}

function buildDecisionId(
  decision: BoundedExtractionInputAuthorizationDecision | null,
  packet: BoundedTextExtractionInputPacket | null,
  status: EvidenceLifecycleExecutionReadinessDenialStatus,
): string {
  const seed = JSON.stringify({
    status,
    authorizationDecisionVersion: decision?.decisionVersion ?? null,
    authorizationStatus: decision?.status ?? null,
    packetId: packet?.packetId ?? null,
    inputTextHash: packet?.inputTextHash ?? null,
  });
  return `EXECUTION_READINESS_DENIAL_${sha256(seed).slice(0, 24)}`;
}

function isPositiveW4hDecision(
  decision: BoundedExtractionInputAuthorizationDecision | null,
): decision is BoundedExtractionInputAuthorizationDecision {
  return (
    Boolean(decision) &&
    decision?.decisionVersion ===
      BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION &&
    decision.status === "bounded_extraction_input_packet_created_extraction_execution_closed" &&
    decision.visibility === "internal_admin_only" &&
    decision.publicPointerExposure === "forbidden"
  );
}

function firstPacket(
  decision: BoundedExtractionInputAuthorizationDecision | null,
): BoundedTextExtractionInputPacket | null {
  return decision?.extractionInputPacket ?? null;
}

function validatePacketKind(
  packet: BoundedTextExtractionInputPacket,
): EvidenceLifecycleExecutionReadinessDenialStatus | null {
  if (
    packet.packetVersion !== BOUNDED_EXTRACTION_INPUT_PACKET_VERSION ||
    packet.kind !== "bounded_text_extraction_input_packet"
  ) {
    return "blocked_pre_execution_readiness_packet_kind_unsupported";
  }
  if (
    packet.visibility !== "internal_admin_only" ||
    packet.publicPointerExposure !== "forbidden"
  ) {
    return "blocked_pre_execution_readiness_packet_visibility_invalid";
  }
  return null;
}

function validatePacketText(
  packet: BoundedTextExtractionInputPacket,
): EvidenceLifecycleExecutionReadinessDenialStatus | null {
  if (packet.inputText.length === 0 || packet.inputTextByteLength <= 0) {
    return "blocked_pre_execution_readiness_packet_text_missing";
  }
  if (
    packet.inputTextByteLength > EVIDENCE_LIFECYCLE_EXECUTION_READINESS_INPUT_MAX_TEXT_BYTES ||
    Buffer.byteLength(packet.inputText, "utf8") !== packet.inputTextByteLength ||
    packet.inputTextCharLength !== Array.from(packet.inputText).length
  ) {
    return "blocked_pre_execution_readiness_packet_text_oversized";
  }
  if (sha256(packet.inputText) !== packet.inputTextHash) {
    return "blocked_pre_execution_readiness_packet_text_hash_mismatch";
  }
  if (
    packet.sourceMaterialTextHash !== packet.inputTextHash ||
    packet.sourceMaterialTextByteLength !== packet.inputTextByteLength
  ) {
    return "blocked_pre_execution_readiness_source_material_hash_mismatch";
  }
  return null;
}

function validatePacketLineage(
  decision: BoundedExtractionInputAuthorizationDecision,
  packet: BoundedTextExtractionInputPacket,
): EvidenceLifecycleExecutionReadinessDenialStatus | null {
  if (packet.providerId !== decision.parent.providerId) {
    return "blocked_pre_execution_readiness_provider_id_mismatch";
  }
  if (
    packet.providerIds.length !== packet.sourceContentPackets.length ||
    packet.providerIds.some((providerId, index) =>
      !isNonBlankString(providerId) || providerId !== packet.sourceContentPackets[index]?.providerId
    )
  ) {
    return "blocked_pre_execution_readiness_provider_id_mismatch";
  }
  const fields = [
    packet.packetId,
    packet.parentSidecarId,
    packet.linkedEvidenceCorpusId,
    packet.sourceMaterialRef,
    packet.locatorRef,
    packet.candidatePreviewId,
    packet.providerId,
    packet.sourceMaterialEndpointId,
  ];
  if (!fields.every(isNonBlankString)) {
    return "blocked_pre_execution_readiness_lineage_missing_or_invalid";
  }
  return null;
}

function allDownstreamExecutionFlagsClosed(
  decision: BoundedExtractionInputAuthorizationDecision,
  packet: BoundedTextExtractionInputPacket,
): boolean {
  return (
    decision.downstreamGate === "evidence_item_extraction_execution_gate_closed" &&
    decision.productExecution.boundedExtractionInputPacketCreated === true &&
    decision.productExecution.extractionExecutionAuthorized === false &&
    decision.productExecution.evidenceItemGenerated === false &&
    decision.productExecution.llmExtractionCallAuthorized === false &&
    decision.productExecution.parserExecuted === false &&
    decision.productExecution.cacheRead === false &&
    decision.productExecution.cacheWrite === false &&
    decision.productExecution.storageWrite === false &&
    decision.productExecution.sourceReliabilityCalled === false &&
    decision.productExecution.reportGenerated === false &&
    decision.productExecution.verdictGenerated === false &&
    decision.productExecution.warningGenerated === false &&
    decision.productExecution.confidenceGenerated === false &&
    decision.productExecution.publicSurfaceWritten === false &&
    packet.extractionExecutionAuthorized === false &&
    packet.llmExtractionCallAuthorized === false &&
    packet.parserExecuted === false &&
    packet.semanticExtractionAuthorized === false &&
    packet.evidenceItemExtractionAuthorized === false &&
    Array.isArray(packet.evidenceItems) &&
    packet.evidenceItems.length === 0 &&
    packet.publicCutoverStatus === "blocked_precutover"
  );
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
