import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_GATEWAY_TASKS,
  canExecuteAnalyzerV2GatewayTask,
  getAnalyzerV2GatewayTask,
} from "@/lib/analyzer-v2/gateway/policy";
import { CLAIM_CONTRACT_V2_SCHEMA_VERSION } from "@/lib/analyzer-v2/claim-understanding/types";
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
    expect(task.promptPolicy?.outputSchemaVersion).toBe(CLAIM_CONTRACT_V2_SCHEMA_VERSION);
    expect(task.outputSchemaVersion).toBe(CLAIM_CONTRACT_V2_SCHEMA_VERSION);
    expect(task.cachePolicy?.policyId).toBe("v2.semantic.claim-understanding");
    expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(false);
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
});
