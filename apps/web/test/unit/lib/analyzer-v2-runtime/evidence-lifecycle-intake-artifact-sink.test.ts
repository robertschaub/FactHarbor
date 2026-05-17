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
import {
  EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION,
  buildEvidenceLifecycleIntakeRuntimeArtifact,
  clearEvidenceLifecycleIntakeRuntimeArtifacts,
  readEvidenceLifecycleIntakeRuntimeArtifacts,
  recordEvidenceLifecycleIntakeRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink";

const directInput = "Plastic recycling is pointless";
const claimText = "The exact claim text must not enter the artifact";

function buildContext(runId = "job-v2-x7j-artifact"): PipelineRunContext {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: directInput,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: [],
  }, {
    now: () => new Date("2026-05-17T01:00:00.000Z"),
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
    damagedReason: null,
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

function recordFor(
  context: PipelineRunContext,
  handoff: ClaimUnderstandingStageHandoff,
) {
  return recordEvidenceLifecycleIntakeRuntimeArtifact({
    context,
    claimUnderstandingHandoff: handoff,
    evidenceLifecycleIntake: buildEvidenceLifecycleIntake(context, handoff),
  });
}

describe("Analyzer V2 Evidence Lifecycle intake artifact sink", () => {
  it("projects accepted intake state into a sanitized internal-only artifact", () => {
    const context = buildContext();
    clearEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId);

    const result = recordFor(context, acceptedHandoff());
    const artifact = readEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId)[0];
    const serialized = JSON.stringify(artifact);

    expect(result.status).toBe("recorded");
    expect(artifact).toMatchObject({
      artifactVersion: EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId: context.observabilityLedger.ledgerId,
      runId: context.runId,
      claimUnderstanding: {
        handoffStatus: "accepted",
        blockedReason: null,
        damagedReason: null,
        selectedAtomicClaimCount: 1,
        integrityEventCount: 0,
      },
      evidenceLifecycleIntake: {
        observationStatus: "contract_observed_preexecution",
        status: "intake_ready",
        blockedReason: null,
        executionScope: "contract_only_no_provider_execution",
        claimContractPresent: true,
        executionEligibility: "not_executable_precutover",
      },
      publicCutoverStatus: "blocked_precutover",
      downstreamExecution: {
        queryPlanningExecuted: false,
        sourceAcquisitionExecuted: false,
        providerNetworkExecuted: false,
        parserExecuted: false,
        evidenceCorpusCreated: false,
        reportGenerated: false,
        verdictGenerated: false,
      },
    });
    expect(serialized).not.toContain(directInput);
    expect(serialized).not.toContain(claimText);
    expect(serialized).not.toContain("providerTelemetry");
    expect(serialized).not.toContain("prompt");
    expect(serialized).not.toContain("https://");
  });

  it("records blocked and damaged Claim Understanding states as pre-execution blocked artifacts", () => {
    const blockedContext = buildContext("job-v2-x7j-blocked");
    const damagedContext = buildContext("job-v2-x7j-damaged");
    clearEvidenceLifecycleIntakeRuntimeArtifacts(blockedContext.observabilityLedger.ledgerId);
    clearEvidenceLifecycleIntakeRuntimeArtifacts(damagedContext.observabilityLedger.ledgerId);

    recordFor(blockedContext, blockedHandoff());
    recordFor(damagedContext, damagedHandoff());

    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(blockedContext.observabilityLedger.ledgerId)[0])
      .toMatchObject({
        claimUnderstanding: {
          handoffStatus: "blocked",
          blockedReason: "no_valid_claim",
        },
        evidenceLifecycleIntake: {
          observationStatus: "blocked_preexecution",
          status: "blocked",
          blockedReason: "claim_understanding_blocked",
          executionEligibility: "not_executable_precutover",
        },
      });
    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(damagedContext.observabilityLedger.ledgerId)[0])
      .toMatchObject({
        claimUnderstanding: {
          handoffStatus: "damaged",
          damagedReason: "claim_contract_validation_failed",
        },
        evidenceLifecycleIntake: {
          observationStatus: "blocked_preexecution",
          status: "blocked",
          blockedReason: "claim_understanding_damaged",
          executionEligibility: "not_executable_precutover",
        },
      });
  });

  it("records missing ClaimContract as structural pre-execution block", () => {
    const context = buildContext("job-v2-x7j-missing-contract");
    const malformedHandoff = {
      ...acceptedHandoff(),
      claimContract: null,
    } as unknown as ClaimUnderstandingStageHandoff;
    clearEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId);

    recordFor(context, malformedHandoff);

    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId)[0])
      .toMatchObject({
        claimUnderstanding: {
          handoffStatus: "accepted",
        },
        evidenceLifecycleIntake: {
          observationStatus: "blocked_preexecution",
          status: "blocked",
          blockedReason: "claim_contract_missing",
          claimContractPresent: false,
        },
      });
  });

  it("defensively copies artifacts on write and read", () => {
    const context = buildContext("job-v2-x7j-defensive-copy");
    clearEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId);

    const result = recordFor(context, acceptedHandoff());
    if (result.status !== "recorded") {
      throw new Error("expected artifact to be recorded");
    }
    (result.artifact.claimUnderstanding as { selectedAtomicClaimCount: number }).selectedAtomicClaimCount = 99;
    const firstRead = readEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId)[0];

    expect(Object.isFrozen(firstRead.claimUnderstanding)).toBe(true);
    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId)[0]
      ?.claimUnderstanding.selectedAtomicClaimCount).toBe(1);
  });

  it("keeps records per ledger and global ledgers bounded", () => {
    const ledgerContext = buildContext("job-v2-x7j-bounded-ledger");
    clearEvidenceLifecycleIntakeRuntimeArtifacts(ledgerContext.observabilityLedger.ledgerId);

    for (let index = 0; index <= EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      recordFor(ledgerContext, acceptedHandoff());
    }

    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(ledgerContext.observabilityLedger.ledgerId)).toHaveLength(
      EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER,
    );

    const baseRunId = "job-v2-x7j-bounded-store";
    for (let index = 0; index <= EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      const context = buildContext(`${baseRunId}-${index}`);
      clearEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId);
      recordFor(context, acceptedHandoff());
    }

    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(`${baseRunId}-0:precutover-observability`)).toEqual([]);
    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(
      `${baseRunId}-${EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_LEDGER_COUNT}:precutover-observability`,
    )).toHaveLength(1);
  });

  it("skips oversize artifacts without storing them", () => {
    const runId = `job-v2-x7j-${"x".repeat(17_000)}`;
    const context = buildContext(runId);

    const result = recordFor(context, acceptedHandoff());

    expect(result.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId)).toEqual([]);
  });

  it("builds artifacts by allow-list projection from explicit fields", () => {
    const context = buildContext("job-v2-x7j-allow-list");
    const artifact = buildEvidenceLifecycleIntakeRuntimeArtifact({
      context,
      claimUnderstandingHandoff: acceptedHandoff(),
      evidenceLifecycleIntake: buildEvidenceLifecycleIntake(context, acceptedHandoff()),
    });

    expect(Object.keys(artifact).sort()).toEqual([
      "artifactVersion",
      "claimUnderstanding",
      "createdUtc",
      "downstreamExecution",
      "evidenceLifecycleIntake",
      "ledgerId",
      "publicCutoverStatus",
      "publicPointerExposure",
      "runId",
      "source",
      "visibility",
    ]);
  });
});
