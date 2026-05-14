import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS,
  ANALYZER_V2_GATEWAY_TASKS,
  canExecuteAnalyzerV2GatewayTask,
  getAnalyzerV2GatewayTask,
  isAnalyzerV2GatewayTaskEligibleForExecutableStatus,
} from "@/lib/analyzer-v2/gateway/policy";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import { CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/claim-understanding/types";
import type { AnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/types";

describe("analyzer-v2 gateway policy registry", () => {
  it("declares owned, verified, non-executable gateway tasks", () => {
    expect(ANALYZER_V2_GATEWAY_TASKS.length).toBeGreaterThan(0);

    for (const task of ANALYZER_V2_GATEWAY_TASKS) {
      expect(task.id).toBeTruthy();
      expect(task.owner).toBeTruthy();
      expect(task.verifier).toBeTruthy();
      expect(task.outputSchemaVersion).toMatch(/^v2\./);
      expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(false);
    }
  });

  it("keeps all prompt-backed tasks blocked until prompt approval", () => {
    const promptBackedTasks = ANALYZER_V2_GATEWAY_TASKS.filter((task) => task.promptPolicy);

    expect(promptBackedTasks.length).toBeGreaterThan(0);
    for (const task of promptBackedTasks) {
      expect(task.status).toBe("blockedUntilPromptApproved");
      expect(task.promptPolicy?.profile).toBe("claimboundary-v2");
      expect(task.promptPolicy?.approval.status).not.toBe("approved");
      expect(task.modelPolicy?.approval.status).not.toBe("approved");
      expect(task.cachePolicy?.approval.status).not.toBe("approved");
    }
  });

  it("declares claim-understanding variables and cache policy without making it executable", () => {
    const task = getAnalyzerV2GatewayTask("claim_understanding_gate1");

    expect(task.status).toBe("blockedUntilPromptApproved");
    expect(task.promptPolicy?.requiredVariables).toEqual([
      "currentDate",
      "analysisInput",
      "acsSnapshotJson",
      "inputGroundingSeedJson",
    ]);
    expect(task.promptPolicy?.outputSchemaVersion).toBe(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION);
    expect(task.outputSchemaVersion).toBe(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION);
    expect(task.modelPolicy?.registryPolicyId).toBe("v2.model.claim_understanding_gate1.0");
    expect(task.cachePolicy?.policyId).toBe("v2.semantic.claim-understanding");
    expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(false);
  });

  it("declares concrete blocked model-policy metadata for claim understanding", () => {
    const policy = getAnalyzerV2TaskModelPolicy("claim_understanding_gate1");

    expect(policy).toMatchObject({
      policyId: "v2.model.claim_understanding_gate1.0",
      gatewayTaskId: "claim_understanding_gate1",
      modelTask: "understand",
      modelTier: "standard",
      providerPolicy: "from_config_snapshot",
      temperature: 0.15,
      maxCalls: 2,
      schemaRetryCount: 1,
      timeoutMs: 120000,
      maxOutputTokens: 6000,
      fallbackBehavior: "none_fail_closed",
      escalationBehavior: "surface_damaged_claim_understanding",
      execution: "blocked_until_prompt_model_cache_approval",
      approval: {
        status: "missing",
        reviewer: null,
        approvedAt: null,
      },
    });
  });

  it("does not allow executable status without approved prompt, model, and cache policies", () => {
    const base = getAnalyzerV2GatewayTask("claim_understanding_gate1");
    const approved = {
      status: "approved" as const,
      reviewer: "LLM Expert",
      approvedAt: "2026-05-13T00:00:00.000Z",
    };

    expect(canExecuteAnalyzerV2GatewayTask({
      ...base,
      status: "executable",
      promptPolicy: null,
    })).toBe(false);

    expect(canExecuteAnalyzerV2GatewayTask({
      ...base,
      status: "blockedUntilPromptApproved",
      promptPolicy: base.promptPolicy ? { ...base.promptPolicy, approval: approved } : null,
      modelPolicy: base.modelPolicy ? { ...base.modelPolicy, approval: approved } : null,
      cachePolicy: base.cachePolicy ? { ...base.cachePolicy, approval: approved } : null,
    })).toBe(false);

    const executable: AnalyzerV2GatewayTask = {
      ...base,
      status: "executable",
      promptPolicy: base.promptPolicy ? { ...base.promptPolicy, approval: approved } : null,
      modelPolicy: base.modelPolicy ? { ...base.modelPolicy, approval: approved } : null,
      cachePolicy: base.cachePolicy ? { ...base.cachePolicy, approval: approved } : null,
    };
    expect(canExecuteAnalyzerV2GatewayTask(executable)).toBe(true);
  });

  it("keeps only claim_understanding_gate1 structurally eligible for future execution", () => {
    const approved = {
      status: "approved" as const,
      reviewer: "LLM Expert",
      approvedAt: "2026-05-14T00:00:00.000Z",
    };

    expect(ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS).toEqual(["claim_understanding_gate1"]);

    for (const task of ANALYZER_V2_GATEWAY_TASKS) {
      expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(
        task.id === "claim_understanding_gate1",
      );
    }

    const laterPromptBackedTask = getAnalyzerV2GatewayTask("research_query_planning");
    expect(canExecuteAnalyzerV2GatewayTask({
      ...laterPromptBackedTask,
      status: "executable",
      promptPolicy: laterPromptBackedTask.promptPolicy
        ? { ...laterPromptBackedTask.promptPolicy, approval: approved }
        : null,
      modelPolicy: laterPromptBackedTask.modelPolicy
        ? { ...laterPromptBackedTask.modelPolicy, approval: approved }
        : null,
      cachePolicy: laterPromptBackedTask.cachePolicy
        ? { ...laterPromptBackedTask.cachePolicy, approval: approved }
        : null,
    })).toBe(false);

    expect(getAnalyzerV2GatewayTask("claim_understanding_gate1").status).toBe("blockedUntilPromptApproved");
  });
});
