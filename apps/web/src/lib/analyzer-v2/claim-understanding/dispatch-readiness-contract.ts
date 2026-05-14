import type {
  ClaimUnderstandingDispatchFrame,
  ClaimUnderstandingDispatchFrameInputSource,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-frame";

export const CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION =
  "v2.claim-understanding.dispatch-readiness.0";

export type ClaimUnderstandingDispatchReadinessApprovalStatus =
  | "missing"
  | "pending"
  | "approved"
  | "rejected";

export type ClaimUnderstandingDispatchReadinessGatewayStatus =
  | "notImplemented"
  | "blockedUntilPromptApproved"
  | "executable";

export type ClaimUnderstandingDispatchReadinessApprovalSnapshot = {
  gatewayTaskId: "claim_understanding_gate1";
  gatewayTaskStatus: ClaimUnderstandingDispatchReadinessGatewayStatus;
  promptApprovalStatus: ClaimUnderstandingDispatchReadinessApprovalStatus;
  modelApprovalStatus: ClaimUnderstandingDispatchReadinessApprovalStatus;
  cacheApprovalStatus: ClaimUnderstandingDispatchReadinessApprovalStatus;
  approvalSource: "review_packet_snapshot" | "runtime_approval_snapshot";
  approvalSnapshotId: string;
  approvalSnapshotVersion: string;
  approvedBy: string;
  approvedAt: string;
};

export type ClaimUnderstandingDispatchReadinessCacheDecisionState =
  | "not_constructed"
  | "constructed"
  | "read_or_write_enabled";

export type ClaimUnderstandingDispatchReadinessProvenancePacket = {
  provenancePhase: "pre_render";
  submittedKind: "text" | "url";
  analysisInput: string;
  resolvedInputText: string;
  selectedAtomicClaimIds: string[];
  promptProfile: string;
  promptSectionId: string;
  promptContentHash: null;
  renderedPromptHash: null;
  configSnapshotHash: string;
  modelTask: string;
  provider: string;
  modelName: string;
  temperature: number;
  outputSchemaVersion: string;
  resultSchemaVersion: string;
  inputSource: ClaimUnderstandingDispatchFrameInputSource;
  inputIdentityHash: string;
  acsSnapshotHash: string | null;
  inputGroundingSeedHash: string;
  currentDateBucket: string;
  cacheDecisionState: ClaimUnderstandingDispatchReadinessCacheDecisionState;
};

export type ClaimUnderstandingDispatchReadinessSideEffects = {
  promptLoaded: false;
  promptRendered: false;
  adapterImported: false;
  adapterCalled: false;
  modelCalled: false;
  promptHashConstructed: false;
  configHashConstructed: false;
  inputIdentityHashConstructed: false;
  cacheDecisionConstructed: false;
  cacheRead: false;
  cacheWrite: false;
  providerCallbackCreated: false;
  providerSdkLoaded: false;
  approvalMutated: false;
  productDispatchWired: false;
};

export type ClaimUnderstandingDispatchReadinessBlockedReason =
  | "dispatch_frame_missing"
  | "dispatch_frame_incomplete"
  | "approval_snapshot_incomplete"
  | "approval_snapshot_not_executable"
  | "approval_snapshot_source_not_runtime"
  | "approval_snapshot_identity_missing"
  | "provenance_packet_incomplete"
  | "provenance_frame_mismatch"
  | "pre_render_prompt_hash_forbidden"
  | "direct_url_preflight_forbidden"
  | "acs_preflight_deferred"
  | "acs_provenance_missing"
  | "direct_input_acs_provenance_forbidden"
  | "cache_decision_must_not_be_constructed";

export type ClaimUnderstandingDispatchReadinessResult =
  | {
    status: "contract_satisfied";
    contractVersion: typeof CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION;
    frame: ClaimUnderstandingDispatchFrame;
    approvalSnapshot: ClaimUnderstandingDispatchReadinessApprovalSnapshot;
    provenancePacket: ClaimUnderstandingDispatchReadinessProvenancePacket;
    blockedReasons: [];
    sideEffects: ClaimUnderstandingDispatchReadinessSideEffects;
  }
  | {
    status: "blocked";
    contractVersion: typeof CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION;
    frame: ClaimUnderstandingDispatchFrame | null;
    approvalSnapshot: ClaimUnderstandingDispatchReadinessApprovalSnapshot;
    provenancePacket: ClaimUnderstandingDispatchReadinessProvenancePacket;
    blockedReasons: ClaimUnderstandingDispatchReadinessBlockedReason[];
    sideEffects: ClaimUnderstandingDispatchReadinessSideEffects;
  };

export type ClaimUnderstandingDispatchReadinessInput = {
  frame: ClaimUnderstandingDispatchFrame | null;
  approvalSnapshot: ClaimUnderstandingDispatchReadinessApprovalSnapshot;
  provenancePacket: ClaimUnderstandingDispatchReadinessProvenancePacket;
};

const FORBIDDEN_CONTRACT_VALUES = new Set(["placeholder", "todo", "unknown"]);

function noDispatchReadinessSideEffects(): ClaimUnderstandingDispatchReadinessSideEffects {
  return {
    promptLoaded: false,
    promptRendered: false,
    adapterImported: false,
    adapterCalled: false,
    modelCalled: false,
    promptHashConstructed: false,
    configHashConstructed: false,
    inputIdentityHashConstructed: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
    providerSdkLoaded: false,
    approvalMutated: false,
    productDispatchWired: false,
  };
}

function isRealContractString(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && !FORBIDDEN_CONTRACT_VALUES.has(value.trim().toLowerCase());
}

function addReason(
  reasons: ClaimUnderstandingDispatchReadinessBlockedReason[],
  reason: ClaimUnderstandingDispatchReadinessBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function collectFrameReasons(
  frame: ClaimUnderstandingDispatchFrame | null,
): ClaimUnderstandingDispatchReadinessBlockedReason[] {
  const reasons: ClaimUnderstandingDispatchReadinessBlockedReason[] = [];
  if (!frame) {
    return ["dispatch_frame_missing"];
  }

  if (
    !isRealContractString(frame.analysisInput)
    || !isRealContractString(frame.resolvedInputText)
    || !isRealContractString(frame.detectedLanguage)
    || !isRealContractString(frame.currentDate)
    || frame.selectedAtomicClaimIds.some((claimId) => !isRealContractString(claimId))
  ) {
    addReason(reasons, "dispatch_frame_incomplete");
  }

  return reasons;
}

function collectApprovalReasons(
  approvalSnapshot: ClaimUnderstandingDispatchReadinessApprovalSnapshot,
): ClaimUnderstandingDispatchReadinessBlockedReason[] {
  const reasons: ClaimUnderstandingDispatchReadinessBlockedReason[] = [];

  if (
    approvalSnapshot.gatewayTaskId !== "claim_understanding_gate1"
    || approvalSnapshot.promptApprovalStatus !== "approved"
    || approvalSnapshot.modelApprovalStatus !== "approved"
    || approvalSnapshot.cacheApprovalStatus !== "approved"
  ) {
    addReason(reasons, "approval_snapshot_incomplete");
  }

  if (approvalSnapshot.approvalSource !== "runtime_approval_snapshot") {
    addReason(reasons, "approval_snapshot_source_not_runtime");
  }

  if (
    !isRealContractString(approvalSnapshot.approvalSnapshotId)
    || !isRealContractString(approvalSnapshot.approvalSnapshotVersion)
    || !isRealContractString(approvalSnapshot.approvedBy)
    || !isRealContractString(approvalSnapshot.approvedAt)
  ) {
    addReason(reasons, "approval_snapshot_identity_missing");
  }

  if (approvalSnapshot.gatewayTaskStatus !== "executable") {
    addReason(reasons, "approval_snapshot_not_executable");
  }

  return reasons;
}

function collectProvenanceReasons(
  frame: ClaimUnderstandingDispatchFrame | null,
  provenancePacket: ClaimUnderstandingDispatchReadinessProvenancePacket,
): ClaimUnderstandingDispatchReadinessBlockedReason[] {
  const reasons: ClaimUnderstandingDispatchReadinessBlockedReason[] = [];
  const requiredStrings = [
    provenancePacket.analysisInput,
    provenancePacket.resolvedInputText,
    provenancePacket.promptProfile,
    provenancePacket.promptSectionId,
    provenancePacket.configSnapshotHash,
    provenancePacket.modelTask,
    provenancePacket.provider,
    provenancePacket.modelName,
    provenancePacket.outputSchemaVersion,
    provenancePacket.resultSchemaVersion,
    provenancePacket.inputIdentityHash,
    provenancePacket.inputGroundingSeedHash,
    provenancePacket.currentDateBucket,
  ];

  if (
    requiredStrings.some((value) => !isRealContractString(value))
    || provenancePacket.selectedAtomicClaimIds.some((claimId) => !isRealContractString(claimId))
    || !Number.isFinite(provenancePacket.temperature)
  ) {
    addReason(reasons, "provenance_packet_incomplete");
  }

  if (
    provenancePacket.provenancePhase !== "pre_render"
    || provenancePacket.promptContentHash !== null
    || provenancePacket.renderedPromptHash !== null
  ) {
    addReason(reasons, "pre_render_prompt_hash_forbidden");
  }

  if (provenancePacket.cacheDecisionState !== "not_constructed") {
    addReason(reasons, "cache_decision_must_not_be_constructed");
  }

  if (!frame) {
    return reasons;
  }

  if (
    provenancePacket.inputSource !== frame.inputSource
    || provenancePacket.currentDateBucket !== frame.currentDate
    || provenancePacket.analysisInput !== frame.analysisInput
    || provenancePacket.resolvedInputText !== frame.resolvedInputText
    || provenancePacket.selectedAtomicClaimIds.length !== frame.selectedAtomicClaimIds.length
    || provenancePacket.selectedAtomicClaimIds.some(
      (claimId, index) => claimId !== frame.selectedAtomicClaimIds[index],
    )
  ) {
    addReason(reasons, "provenance_frame_mismatch");
  }

  if (frame.inputSource === "direct_input" && provenancePacket.submittedKind !== "text") {
    addReason(reasons, "direct_url_preflight_forbidden");
  }

  if (frame.inputSource === "acs_prepared_snapshot") {
    addReason(reasons, "acs_preflight_deferred");
    if (!isRealContractString(provenancePacket.acsSnapshotHash)) {
      addReason(reasons, "acs_provenance_missing");
    }
  } else if (provenancePacket.acsSnapshotHash !== null) {
    addReason(reasons, "direct_input_acs_provenance_forbidden");
  }

  return reasons;
}

export function validateClaimUnderstandingDispatchReadinessContract(
  input: ClaimUnderstandingDispatchReadinessInput,
): ClaimUnderstandingDispatchReadinessResult {
  const reasons = [
    ...collectFrameReasons(input.frame),
    ...collectApprovalReasons(input.approvalSnapshot),
    ...collectProvenanceReasons(input.frame, input.provenancePacket),
  ];

  if (reasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION,
      frame: input.frame,
      approvalSnapshot: input.approvalSnapshot,
      provenancePacket: input.provenancePacket,
      blockedReasons: [...new Set(reasons)],
      sideEffects: noDispatchReadinessSideEffects(),
    };
  }

  const frame = input.frame;
  if (!frame) {
    throw new Error("Analyzer V2 dispatch readiness contract reached an impossible missing-frame state.");
  }

  return {
    status: "contract_satisfied",
    contractVersion: CLAIM_UNDERSTANDING_DISPATCH_READINESS_CONTRACT_VERSION,
    frame,
    approvalSnapshot: input.approvalSnapshot,
    provenancePacket: input.provenancePacket,
    blockedReasons: [],
    sideEffects: noDispatchReadinessSideEffects(),
  };
}
