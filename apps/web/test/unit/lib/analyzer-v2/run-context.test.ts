import { describe, expect, it } from "vitest";
import {
  buildClaimBoundaryV2RunContext,
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
} from "@/lib/analyzer-v2/run-context";

describe("analyzer-v2 run context", () => {
  it("uses ACS resolved input and detected language without hiding shell-only claim ids", () => {
    const context = buildClaimBoundaryV2RunContext(
      {
        runIdHint: "job-context",
        submitted: {
          kind: "text",
          value: "Submitted text",
        },
        preparedSeed: {
          acsSnapshot: {
            resolvedInputText: "Prepared resolved text",
            preparedUnderstanding: {
              detectedLanguage: "de",
            },
          },
        },
        selectedAtomicClaimIds: ["AC_V2_SHELL_01", "AC_SELECTED_01"],
      },
      {
        now: () => new Date("2026-05-14T01:02:03.000Z"),
      },
    );

    expect(context.resolvedInputText).toBe("Prepared resolved text");
    expect(context.detectedLanguage).toBe("de");
    expect(context.selectedAtomicClaimIds).toEqual(["AC_V2_SHELL_01", "AC_SELECTED_01"]);
    expect(context.configSnapshot).toEqual({
      source: "not_loaded_pre_provider_wiring_gate",
      configSnapshotHash: null,
      pipelineConfigHash: null,
      searchConfigHash: null,
      calcConfigHash: null,
    });
    expect(context.promptProfile).toMatchObject({
      source: "gateway_policy_snapshot",
      profile: "claimboundary-v2",
    });
    expect(context.promptProfile.sectionIds).toContain("V2_CLAIM_UNDERSTANDING_GATE1");
    expect(context.modelPolicy.source).toBe("static_precutover_registry");
    expect(context.modelPolicy.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(getPipelineRunGatewayTask(context, "claim_understanding_gate1").status).toBe("executable");
    expect(getPipelineRunTaskModelPolicy(context, "claim_understanding_gate1")?.policyId).toBe(
      "v2.model.claim_understanding_gate1.0",
    );
    expect(context.observabilityLedger).toEqual({
      ledgerId: "job-context:precutover-observability",
      status: "runtime_activation_ready",
    });
    expect(context.claimUnderstandingRuntimeActivation).toMatchObject({
      source: "v2_task_policy_snapshot",
      status: "kill_switch_closed",
      activationProfileId: "v2.claim-understanding.hidden-direct-text.4c3b",
      authority: "deputy_approved_temporary_activation_profile",
      suppliedBy: "product_owned_activation_authority",
      freezeLocation: "pipeline_run_context",
      rollbackTarget: {
        commit: "fc68915d",
        behavior: "fail_closed_to_v2_damaged_envelope",
      },
      hiddenArtifactSink: {
        kind: "v2_observability_ledger",
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
      },
    });
    expect(context.claimUnderstandingRuntimeActivation.activationSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(context.claimUnderstandingRuntimeActivation.configProfileHash).toMatch(/^[a-f0-9]{64}$/);
    expect(context.queryPlanningRuntimeActivation).toMatchObject({
      source: "v2_task_policy_snapshot",
      status: "kill_switch_closed",
      activationProfileId: "v2.evidence-query-planning.hidden-direct-text.x7s",
      authority: "deputy_approved_temporary_activation_profile",
      suppliedBy: "product_owned_activation_authority",
      freezeLocation: "pipeline_run_context",
      rollbackTarget: {
        commit: "68f450cb",
        behavior: "fail_closed_to_x7o_preexecution_observation",
      },
      hiddenArtifactSink: {
        kind: "v2_evidence_query_planning_runtime_artifact_ledger",
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
      },
      provider: {
        providerId: "anthropic",
        modelId: "claude-haiku-4-5-20251001",
      },
    });
    expect(context.queryPlanningRuntimeActivation.activationSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(context.queryPlanningRuntimeActivation.configProfileHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("freezes product-selected hidden direct-text runtime activation in the run context", () => {
    const closedContext = buildClaimBoundaryV2RunContext({
      runIdHint: "job-context-runtime-closed",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const enabledContext = buildClaimBoundaryV2RunContext(
      {
        runIdHint: "job-context-runtime-enabled",
        submitted: {
          kind: "text",
          value: "Submitted text",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: [],
      },
      {
        runtimeActivationStatus: "enabled_hidden_direct_text",
      },
    );

    expect(closedContext.claimUnderstandingRuntimeActivation.status).toBe("kill_switch_closed");
    expect(enabledContext.claimUnderstandingRuntimeActivation.status).toBe("enabled_hidden_direct_text");
    expect(enabledContext.claimUnderstandingRuntimeActivation.activationSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(enabledContext.claimUnderstandingRuntimeActivation.activationSnapshotHash).not.toBe(
      closedContext.claimUnderstandingRuntimeActivation.activationSnapshotHash,
    );
  });

  it("freezes product-selected Query Planning runtime activation separately from Claim Understanding", () => {
    const closedContext = buildClaimBoundaryV2RunContext({
      runIdHint: "job-context-query-planning-closed",
      submitted: {
        kind: "text",
        value: "Submitted text",
      },
      preparedSeed: null,
      selectedAtomicClaimIds: [],
    });
    const enabledContext = buildClaimBoundaryV2RunContext(
      {
        runIdHint: "job-context-query-planning-enabled",
        submitted: {
          kind: "text",
          value: "Submitted text",
        },
        preparedSeed: null,
        selectedAtomicClaimIds: [],
      },
      {
        queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
      },
    );

    expect(closedContext.queryPlanningRuntimeActivation.status).toBe("kill_switch_closed");
    expect(closedContext.claimUnderstandingRuntimeActivation.status).toBe("kill_switch_closed");
    expect(enabledContext.queryPlanningRuntimeActivation.status).toBe("enabled_hidden_direct_text");
    expect(enabledContext.claimUnderstandingRuntimeActivation.status).toBe("kill_switch_closed");
    expect(enabledContext.queryPlanningRuntimeActivation.activationSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(enabledContext.queryPlanningRuntimeActivation.activationSnapshotHash).not.toBe(
      closedContext.queryPlanningRuntimeActivation.activationSnapshotHash,
    );
  });
});
