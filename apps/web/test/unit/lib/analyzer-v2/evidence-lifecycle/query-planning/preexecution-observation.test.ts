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
import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import {
  buildEvidenceQueryPlanningPreexecutionObservation,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

const directInput = "Using hydrogen for cars is more efficient than using electricity";
const claimText = "Using hydrogen for cars is more efficient than using electricity";
const languageValue = "x7o-language-sentinel";

function context() {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-x7o-observation",
    submitted: {
      kind: "text",
      value: directInput,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: [],
  }, {
    now: () => new Date("2026-05-17T02:00:00.000Z"),
  });
}

function claimContract(overrides: Partial<ClaimContract> = {}): ClaimContract {
  const base: ClaimContract = {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: directInput,
      resolvedInputText: directInput,
      detectedLanguage: languageValue,
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: directInput,
      resolvedInputText: directInput,
      detectedLanguage: languageValue,
      currentDate: "2026-05-17",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "direct-input-grounding-hash",
    },
    atomicClaims: [
      {
        id: "AC_DIRECT_01",
        statement: claimText,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Accepted structurally.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };

  return { ...base, ...overrides };
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

function intakeDecision(contract = claimContract()): EvidenceLifecycleStartDecision {
  return buildEvidenceLifecycleIntake(context(), acceptedHandoff(contract));
}

describe("Analyzer V2 Query Planning pre-execution observation", () => {
  it("observes structural prerequisites for accepted direct-text intake without execution", () => {
    const observation = buildEvidenceQueryPlanningPreexecutionObservation(intakeDecision());

    expect(observation).toMatchObject({
      observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o",
      visibility: "internal_only",
      status: "structural_prerequisites_observed_not_executed_precutover",
      blockedReason: null,
      sourceIntakeStatus: "intake_ready",
      inputScope: "direct_text_claim_contract",
      selectedAtomicClaimCount: 1,
      sourceLanguageSignal: "present",
      taskPolicy: {
        queryPlanningPolicySignal: "hidden_task_policy_observed_not_invoked",
        productExecutionAuthority: "product_invocation_blocked_precutover",
      },
      execution: {
        queryPlanningExecuted: false,
        promptLoaded: false,
        promptRendered: false,
        modelCalled: false,
        providerCallbackCreated: false,
        providerSearchFetchCalled: false,
        cacheRead: false,
        cacheWrite: false,
        sourceReliabilityCalled: false,
      },
    });
    expect(JSON.stringify(observation)).not.toContain(languageValue);
    expect(JSON.stringify(observation)).not.toContain("AC_DIRECT_01");
    expect(JSON.stringify(observation)).not.toContain(claimText);
  });

  it("blocks when Evidence Lifecycle intake is blocked", () => {
    const observation = buildEvidenceQueryPlanningPreexecutionObservation(
      buildEvidenceLifecycleIntake(context(), blockedHandoff()),
    );

    expect(observation).toMatchObject({
      status: "blocked_pre_query_planning",
      blockedReason: "evidence_lifecycle_intake_blocked",
      sourceIntakeStatus: "blocked",
      inputScope: "not_applicable",
      selectedAtomicClaimCount: 0,
      sourceLanguageSignal: "unavailable",
    });
  });

  it("blocks unsupported ACS prepared-snapshot ClaimContract scope", () => {
    const preparedContract = claimContract({
      inputGroundingSeed: {
        ...claimContract().inputGroundingSeed,
        source: "acs_prepared_snapshot",
        acsSnapshotHash: "acs-snapshot-hash",
      },
      acsMigration: {
        sourceSchemaVersion: "prepared-stage1-v1",
        status: "accepted",
        selectedClaimFinalityPreserved: true,
      },
    });

    const observation = buildEvidenceQueryPlanningPreexecutionObservation(intakeDecision(preparedContract));

    expect(observation).toMatchObject({
      status: "blocked_pre_query_planning",
      blockedReason: "direct_text_claim_contract_required",
      sourceIntakeStatus: "intake_ready",
      inputScope: "unsupported_claim_contract_scope",
      selectedAtomicClaimCount: 1,
      sourceLanguageSignal: "present",
    });
  });

  it("blocks invalid or missing selected AtomicClaim ids without exposing them", () => {
    const duplicateContract = claimContract({
      input: {
        ...claimContract().input,
        selectedAtomicClaimIds: ["AC_DIRECT_01", "AC_DIRECT_01"],
      },
    });

    const observation = buildEvidenceQueryPlanningPreexecutionObservation(intakeDecision(duplicateContract));

    expect(observation).toMatchObject({
      status: "blocked_pre_query_planning",
      blockedReason: "selected_claim_ids_invalid",
      inputScope: "direct_text_claim_contract",
      selectedAtomicClaimCount: 2,
    });
    expect(JSON.stringify(observation)).not.toContain("AC_DIRECT_01");
  });

  it("blocks unavailable language signal as missing metadata only", () => {
    const languageMissingContract = claimContract({
      input: {
        ...claimContract().input,
        detectedLanguage: "und",
      },
      inputGroundingSeed: {
        ...claimContract().inputGroundingSeed,
        detectedLanguage: "und",
      },
    });

    const observation = buildEvidenceQueryPlanningPreexecutionObservation(intakeDecision(languageMissingContract));

    expect(observation).toMatchObject({
      status: "blocked_pre_query_planning",
      blockedReason: "language_signal_unavailable",
      inputScope: "direct_text_claim_contract",
      sourceLanguageSignal: "unavailable",
    });
    expect(JSON.stringify(observation)).not.toContain("und");
    expect(JSON.stringify(observation)).not.toContain("translation");
    expect(JSON.stringify(observation)).not.toContain("source_quality");
    expect(JSON.stringify(observation)).not.toContain("insufficient_evidence");
  });

  it("blocks malformed accepted intake as invalid ClaimContract", () => {
    const decision = intakeDecision();
    const malformedDecision = {
      ...decision,
      intake: {
        ...decision.intake,
        claimContract: {
          ...claimContract(),
          input: {
            ...claimContract().input,
            selectedAtomicClaimIds: [],
          },
        },
      },
    } as unknown as EvidenceLifecycleStartDecision;

    const observation = buildEvidenceQueryPlanningPreexecutionObservation(malformedDecision);

    expect(observation).toMatchObject({
      status: "blocked_pre_query_planning",
      blockedReason: "claim_contract_invalid",
      selectedAtomicClaimCount: 0,
    });
  });

  it("does not construct Query Planning execution-preparation fields", () => {
    const observation = buildEvidenceQueryPlanningPreexecutionObservation(intakeDecision());
    const serialized = JSON.stringify(observation);

    for (const forbidden of [
      "EvidenceQueryPlanningInputEnvelope",
      "promptPackets",
      "claimContractHash",
      "batchInputEnvelope",
      "retrievalPolicyCatalogJson",
      "sourceAcquisitionTraceJson",
      "promptProvenance",
      "cacheDecision",
      "queryPlanInspection",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
