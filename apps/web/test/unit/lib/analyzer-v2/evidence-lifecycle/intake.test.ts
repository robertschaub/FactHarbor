import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
  type ClaimUnderstandingStageHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  type ClaimContract,
} from "@/lib/analyzer-v2/claim-understanding/types";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";

const directInput = "Using hydrogen for cars is more efficient than using electricity";

function buildContext(): PipelineRunContext {
  const input: ClaimBoundaryV2Ingress = {
    runIdHint: "job-v2-evidence-lifecycle-intake",
    submitted: {
      kind: "text",
      value: directInput,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: [],
  };

  return buildClaimBoundaryV2RunContext(input, {
    now: () => new Date("2026-05-15T10:00:00.000Z"),
  });
}

function claimContract(): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: directInput,
      resolvedInputText: directInput,
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: directInput,
      resolvedInputText: directInput,
      detectedLanguage: "en",
      currentDate: "2026-05-15",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "direct-input-grounding-hash",
    },
    atomicClaims: [
      {
        id: "AC_DIRECT_01",
        statement: directInput,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Claim Understanding accepted the direct input.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedHandoff(contract = claimContract()): Extract<ClaimUnderstandingStageHandoff, { status: "accepted" }> {
  return {
    handoffVersion: CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
    visibility: "internal_only",
    runtimeStageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    runtimeStatus: "runtime_dispatch_completed",
    inputSource: "direct_input",
    selectedAtomicClaimIds: contract.input.selectedAtomicClaimIds,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    cacheEligibility: "runtime_no_store",
    integrityEventSummaries: [],
    status: "accepted",
    claimContract: contract,
    blockedReason: null,
    damagedReason: null,
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "public_cutover_not_approved",
    },
  };
}

function blockedHandoff(): Extract<ClaimUnderstandingStageHandoff, { status: "blocked" }> {
  return {
    ...acceptedHandoff(),
    status: "blocked",
    claimContract: null,
    blockedReason: "no_valid_claim",
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "claim_understanding_blocked",
    },
  };
}

function damagedHandoff(): Extract<ClaimUnderstandingStageHandoff, { status: "damaged" }> {
  return {
    ...acceptedHandoff(),
    status: "damaged",
    claimContract: null,
    blockedReason: null,
    damagedReason: "claim_contract_validation_failed",
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "claim_understanding_damaged",
    },
  };
}

describe("analyzer-v2 Evidence Lifecycle intake", () => {
  it("creates an internal intake from an accepted Claim Understanding handoff", () => {
    const context = buildContext();
    const contract = claimContract();
    const decision = buildEvidenceLifecycleIntake(context, acceptedHandoff(contract));

    expect(decision).toMatchObject({
      decisionVersion: "v2.evidence-lifecycle.intake.0",
      visibility: "internal_only",
      status: "intake_ready",
      blockedReason: null,
      sourceHandoffStatus: "accepted",
    });
    expect(decision.intake?.claimContract).toBe(contract);
    expect(decision.intake).toMatchObject({
      intakeVersion: "v2.evidence-lifecycle.intake.0",
      visibility: "internal_only",
      executionScope: "contract_only_no_provider_execution",
      pipelineRunContext: {
        runId: "job-v2-evidence-lifecycle-intake",
        currentDate: "2026-05-15",
        resolvedInputText: directInput,
        observabilityLedger: {
          ledgerId: "job-v2-evidence-lifecycle-intake:precutover-observability",
        },
      },
      sourceHandoff: {
        handoffVersion: "v2.claim-understanding.stage-handoff.0",
        status: "accepted",
        inputSource: "direct_input",
        selectedAtomicClaimIds: ["AC_DIRECT_01"],
      },
    });
  });

  it("fails closed for a blocked Claim Understanding handoff without fabricating intake", () => {
    const decision = buildEvidenceLifecycleIntake(buildContext(), blockedHandoff());

    expect(decision).toMatchObject({
      status: "blocked",
      intake: null,
      blockedReason: "claim_understanding_blocked",
      sourceHandoffStatus: "blocked",
      sourceBlockedReason: "no_valid_claim",
      sourceDamagedReason: null,
    });
  });

  it("fails closed for a damaged Claim Understanding handoff without fabricating intake", () => {
    const decision = buildEvidenceLifecycleIntake(buildContext(), damagedHandoff());

    expect(decision).toMatchObject({
      status: "blocked",
      intake: null,
      blockedReason: "claim_understanding_damaged",
      sourceHandoffStatus: "damaged",
      sourceBlockedReason: null,
      sourceDamagedReason: "claim_contract_validation_failed",
    });
  });

  it("does not trust an accepted handoff that is missing its ClaimContract", () => {
    const malformedHandoff = {
      ...acceptedHandoff(),
      claimContract: null,
    } as unknown as ClaimUnderstandingStageHandoff;

    const decision = buildEvidenceLifecycleIntake(buildContext(), malformedHandoff);

    expect(decision).toMatchObject({
      status: "blocked",
      intake: null,
      blockedReason: "claim_contract_missing",
      sourceHandoffStatus: "accepted",
    });
  });
});
