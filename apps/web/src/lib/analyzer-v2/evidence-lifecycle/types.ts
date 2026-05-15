import type { ClaimUnderstandingStageHandoff } from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_INTAKE_VERSION = "v2.evidence-lifecycle.intake.0";

export type EvidenceLifecycleRunContext = Pick<
  PipelineRunContext,
  | "runId"
  | "inputType"
  | "inputValue"
  | "resolvedInputText"
  | "detectedLanguage"
  | "selectedAtomicClaimIds"
  | "generatedUtc"
  | "currentDate"
  | "configSnapshot"
  | "promptProfile"
  | "modelPolicy"
  | "observabilityLedger"
>;

export type EvidenceLifecycleIntake = {
  intakeVersion: typeof EVIDENCE_LIFECYCLE_INTAKE_VERSION;
  visibility: "internal_only";
  executionScope: "contract_only_no_provider_execution";
  pipelineRunContext: EvidenceLifecycleRunContext;
  sourceHandoff: {
    handoffVersion: ClaimUnderstandingStageHandoff["handoffVersion"];
    status: "accepted";
    inputSource: ClaimUnderstandingStageHandoff["inputSource"];
    runtimeStageVersion: ClaimUnderstandingStageHandoff["runtimeStageVersion"];
    selectedAtomicClaimIds: readonly string[];
    integrityEventSummaries: ClaimUnderstandingStageHandoff["integrityEventSummaries"];
  };
  claimContract: ClaimContract;
};

export type EvidenceLifecycleStartBlockedReason =
  | "claim_understanding_blocked"
  | "claim_understanding_damaged"
  | "claim_contract_missing";

export type EvidenceLifecycleStartDecision =
  | {
    decisionVersion: typeof EVIDENCE_LIFECYCLE_INTAKE_VERSION;
    visibility: "internal_only";
    status: "intake_ready";
    intake: EvidenceLifecycleIntake;
    blockedReason: null;
    sourceHandoffStatus: "accepted";
  }
  | {
    decisionVersion: typeof EVIDENCE_LIFECYCLE_INTAKE_VERSION;
    visibility: "internal_only";
    status: "blocked";
    intake: null;
    blockedReason: EvidenceLifecycleStartBlockedReason;
    sourceHandoffStatus: ClaimUnderstandingStageHandoff["status"];
    sourceBlockedReason: ClaimUnderstandingStageHandoff["blockedReason"];
    sourceDamagedReason: ClaimUnderstandingStageHandoff["damagedReason"];
  };
