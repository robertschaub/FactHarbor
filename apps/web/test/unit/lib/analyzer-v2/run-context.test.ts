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
    expect(getPipelineRunGatewayTask(context, "claim_understanding_gate1").status).toBe("blockedUntilPromptApproved");
    expect(getPipelineRunTaskModelPolicy(context, "claim_understanding_gate1")?.policyId).toBe(
      "v2.model.claim_understanding_gate1.0",
    );
    expect(context.observabilityLedger).toEqual({
      ledgerId: "job-context:precutover-observability",
      status: "not_started_precutover",
    });
  });
});
