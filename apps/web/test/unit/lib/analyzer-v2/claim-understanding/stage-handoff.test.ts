import { describe, expect, it } from "vitest";
import {
  buildClaimUnderstandingStageHandoff,
  claimPreparationEnvelopeDiagnosticsFromHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import {
  CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
  runClaimUnderstandingRuntimeStage,
  type ClaimUnderstandingRuntimeState,
} from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";

const dispatchSideEffects = {
  promptLoaded: true,
  promptRendered: true,
  adapterCalled: true,
  modelCalled: true,
  cacheDecisionConstructed: true,
  cacheRead: false,
  cacheWrite: false,
  providerCallbackCreated: false,
} as const;

function buildContext(input: ClaimBoundaryV2Ingress): PipelineRunContext {
  return buildClaimBoundaryV2RunContext(input, {
    now: () => new Date("2026-05-15T08:00:00.000Z"),
  });
}

function directTextInput(value = "Plastic recycling is pointless"): ClaimBoundaryV2Ingress {
  return {
    runIdHint: "job-v2-stage-handoff-direct",
    submitted: {
      kind: "text",
      value,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: [],
  };
}

function acceptedDirectResult(input: string): Extract<ClaimUnderstandingResult, { status: "accepted" }> {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "accepted",
    claimContract: {
      schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
      input: {
        inputType: "text",
        inputValue: input,
        resolvedInputText: input,
        detectedLanguage: "und",
        selectedAtomicClaimIds: ["AC_DIRECT_01"],
      },
      inputGroundingSeed: {
        source: "direct_input",
        inputType: "text",
        inputValue: input,
        resolvedInputText: input,
        detectedLanguage: "und",
        currentDate: "2026-05-15",
        acsSnapshotHash: null,
        inputGroundingSeedHash: "direct-input-grounding-hash",
      },
      atomicClaims: [
        {
          id: "AC_DIRECT_01",
          statement: input,
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
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function damagedDirectResult(): Extract<ClaimUnderstandingResult, { status: "damaged" }> {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "damaged",
    claimContract: null,
    integrityEvents: [
      {
        type: "claim_contract_validation_failed",
        severity: "error",
        message: "Provider output failed the ClaimContract schema.",
        claimIds: ["AC_DIRECT_01"],
      },
    ],
    blockedReason: null,
    damagedReason: "claim_contract_validation_failed",
  };
}

function directRuntimeState(result: ClaimUnderstandingResult): ClaimUnderstandingRuntimeState {
  return {
    stageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    visibility: "internal_only",
    inputSource: "direct_input",
    status: "runtime_dispatch_completed",
    result,
    blockedReason: null,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    runtimeDispatchStatus: "completed",
    runtimeDispatchBlockedReason: null,
    cacheEligibility: "runtime_no_store",
    sideEffects: dispatchSideEffects,
  };
}

describe("analyzer-v2 Claim Understanding stage handoff", () => {
  it("turns accepted ACS migration into an internal accepted handoff", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-v2-stage-handoff-acs",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "de",
            atomicClaims: [
              {
                id: "AC_01",
                statement: "Vorbereitete Aussage",
              },
            ],
            gate1Stats: {
              overallPass: true,
            },
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };
    const context = buildContext(input);
    const state = await runClaimUnderstandingRuntimeStage(input, context);

    const handoff = buildClaimUnderstandingStageHandoff(context, state);

    expect(handoff).toMatchObject({
      handoffVersion: "v2.claim-understanding.stage-handoff.0",
      visibility: "internal_only",
      inputSource: "acs_prepared_snapshot",
      status: "accepted",
      selectedAtomicClaimIds: ["AC_01"],
      blockedReason: null,
      damagedReason: null,
      downstreamStart: {
        evidenceLifecycleStatus: "blocked_precutover",
        reason: "public_cutover_not_approved",
      },
    });
    expect(handoff.claimContract).toMatchObject({
      input: {
        detectedLanguage: "de",
        selectedAtomicClaimIds: ["AC_01"],
      },
      acsMigration: {
        status: "accepted",
      },
    });
    expect(claimPreparationEnvelopeDiagnosticsFromHandoff(handoff)).toEqual([
      {
        inputSource: "acs_prepared_snapshot",
        preparationStatus: "accepted",
        eventType: "acs_snapshot_consumed",
        eventSeverity: "info",
        claimIds: ["AC_01"],
        acsMigrationStatus: "accepted",
        blockCategory: "none",
      },
    ]);
  });

  it("turns accepted hidden direct-text runtime output into an internal accepted handoff", () => {
    const input = directTextInput();
    const context = buildContext(input);
    const state = directRuntimeState(acceptedDirectResult(input.submitted.value));

    const handoff = buildClaimUnderstandingStageHandoff(context, state);

    expect(handoff).toMatchObject({
      inputSource: "direct_input",
      runtimeStatus: "runtime_dispatch_completed",
      status: "accepted",
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
      blockedReason: null,
      damagedReason: null,
      downstreamStart: {
        evidenceLifecycleStatus: "blocked_precutover",
        reason: "public_cutover_not_approved",
      },
    });
    expect(handoff.claimContract.input).toMatchObject({
      resolvedInputText: input.submitted.value,
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    });
    expect(claimPreparationEnvelopeDiagnosticsFromHandoff(handoff)).toEqual([]);
  });

  it("turns blocked runtime state into a blocked handoff without fabricating a claim contract", async () => {
    const input = directTextInput("Using hydrogen for cars is more efficient than using electricity");
    const context = buildContext(input);
    const state = await runClaimUnderstandingRuntimeStage(input, context);

    const handoff = buildClaimUnderstandingStageHandoff(context, state);

    expect(handoff).toMatchObject({
      inputSource: "direct_input",
      status: "blocked",
      claimContract: null,
      blockedReason: "runtime_dispatch_not_enabled",
      damagedReason: null,
      downstreamStart: {
        evidenceLifecycleStatus: "blocked_precutover",
        reason: "claim_understanding_blocked",
      },
    });
    expect(claimPreparationEnvelopeDiagnosticsFromHandoff(handoff)).toEqual([]);
  });

  it("turns damaged runtime state into a damaged handoff without fabricating a claim contract", () => {
    const input = directTextInput("Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz");
    const context = buildContext(input);
    const state = directRuntimeState(damagedDirectResult());

    const handoff = buildClaimUnderstandingStageHandoff(context, state);
    const diagnostics = claimPreparationEnvelopeDiagnosticsFromHandoff(handoff);

    expect(handoff).toMatchObject({
      inputSource: "direct_input",
      status: "damaged",
      claimContract: null,
      blockedReason: null,
      damagedReason: "claim_contract_validation_failed",
      downstreamStart: {
        evidenceLifecycleStatus: "blocked_precutover",
        reason: "claim_understanding_damaged",
      },
    });
    expect(diagnostics).toEqual([
      {
        inputSource: "direct_input",
        preparationStatus: "damaged",
        eventType: "claim_contract_validation_failed",
        eventSeverity: "error",
        claimIds: ["AC_DIRECT_01"],
        acsMigrationStatus: null,
        blockCategory: "stage_scope",
      },
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain("providerTelemetry");
    expect(JSON.stringify(diagnostics)).not.toContain("activationSnapshotHash");
    expect(JSON.stringify(diagnostics)).not.toContain("renderedPromptHash");
    expect(JSON.stringify(diagnostics)).not.toContain("cacheDecision");
    expect(JSON.stringify(diagnostics)).not.toContain("artifactId");
  });

  it("keeps accepted handoff data out of the public damaged pre-cutover envelope", async () => {
    const input: ClaimBoundaryV2Ingress = {
      runIdHint: "job-v2-stage-handoff-public-envelope",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: {
        acsSnapshot: {
          resolvedInputText: "Prepared resolved text",
          preparedUnderstanding: {
            detectedInputType: "text",
            detectedLanguage: "en",
            atomicClaims: [
              {
                id: "AC_01",
                statement: "Prepared statement",
              },
            ],
          },
        },
        acsSnapshotHash: "v2-acs-hash",
        inputGroundingSeedHash: "v2-input-grounding-hash",
      },
      selectedAtomicClaimIds: ["AC_01"],
    };
    const context = buildContext(input);
    const state = await runClaimUnderstandingRuntimeStage(input, context);
    const handoff = buildClaimUnderstandingStageHandoff(context, state);

    const envelope = buildDamagedClaimBoundaryV2Envelope(
      context,
      claimPreparationEnvelopeDiagnosticsFromHandoff(handoff),
    );
    const serialized = JSON.stringify(envelope.resultJson);

    expect(envelope.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      verdict: {
        label: "UNVERIFIED",
        confidenceTier: "none",
      },
      qualityGates: {
        damagedReport: true,
      },
    });
    expect(serialized).not.toContain("claimContract");
    expect(serialized).not.toContain("public_cutover_not_approved");
    expect(serialized).not.toContain("runtime_dispatch_completed");
    expect(serialized).not.toContain("v2.claim-understanding.stage-handoff.0");
  });
});
