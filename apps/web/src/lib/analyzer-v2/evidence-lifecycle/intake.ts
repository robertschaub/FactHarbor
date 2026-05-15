import type { ClaimUnderstandingStageHandoff } from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_INTAKE_VERSION,
  type EvidenceLifecycleIntake,
  type EvidenceLifecycleRunContext,
  type EvidenceLifecycleStartBlockedReason,
  type EvidenceLifecycleStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/types";

function evidenceLifecycleRunContext(context: PipelineRunContext): EvidenceLifecycleRunContext {
  return {
    runId: context.runId,
    inputType: context.inputType,
    inputValue: context.inputValue,
    resolvedInputText: context.resolvedInputText,
    detectedLanguage: context.detectedLanguage,
    selectedAtomicClaimIds: [...context.selectedAtomicClaimIds],
    generatedUtc: context.generatedUtc,
    currentDate: context.currentDate,
    configSnapshot: context.configSnapshot,
    promptProfile: context.promptProfile,
    modelPolicy: context.modelPolicy,
    observabilityLedger: context.observabilityLedger,
  };
}

function blockedDecision(
  handoff: ClaimUnderstandingStageHandoff,
  blockedReason: EvidenceLifecycleStartBlockedReason,
): EvidenceLifecycleStartDecision {
  return {
    decisionVersion: EVIDENCE_LIFECYCLE_INTAKE_VERSION,
    visibility: "internal_only",
    status: "blocked",
    intake: null,
    blockedReason,
    sourceHandoffStatus: handoff.status,
    sourceBlockedReason: handoff.blockedReason,
    sourceDamagedReason: handoff.damagedReason,
  };
}

function buildIntake(
  context: PipelineRunContext,
  handoff: Extract<ClaimUnderstandingStageHandoff, { status: "accepted" }>,
): EvidenceLifecycleIntake {
  return {
    intakeVersion: EVIDENCE_LIFECYCLE_INTAKE_VERSION,
    visibility: "internal_only",
    executionScope: "contract_only_no_provider_execution",
    pipelineRunContext: evidenceLifecycleRunContext(context),
    sourceHandoff: {
      handoffVersion: handoff.handoffVersion,
      status: "accepted",
      inputSource: handoff.inputSource,
      runtimeStageVersion: handoff.runtimeStageVersion,
      selectedAtomicClaimIds: [...handoff.selectedAtomicClaimIds],
      integrityEventSummaries: handoff.integrityEventSummaries.map((event) => ({
        type: event.type,
        severity: event.severity,
        claimIds: [...event.claimIds],
      })),
    },
    claimContract: handoff.claimContract,
  };
}

export function buildEvidenceLifecycleIntake(
  context: PipelineRunContext,
  handoff: ClaimUnderstandingStageHandoff,
): EvidenceLifecycleStartDecision {
  if (handoff.status === "blocked") {
    return blockedDecision(handoff, "claim_understanding_blocked");
  }

  if (handoff.status === "damaged") {
    return blockedDecision(handoff, "claim_understanding_damaged");
  }

  if (!handoff.claimContract) {
    return blockedDecision(handoff, "claim_contract_missing");
  }

  return {
    decisionVersion: EVIDENCE_LIFECYCLE_INTAKE_VERSION,
    visibility: "internal_only",
    status: "intake_ready",
    intake: buildIntake(context, handoff),
    blockedReason: null,
    sourceHandoffStatus: "accepted",
  };
}
