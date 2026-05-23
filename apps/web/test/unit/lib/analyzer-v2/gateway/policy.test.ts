import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS,
  ANALYZER_V2_GATEWAY_TASKS,
  canExecuteAnalyzerV2GatewayTask,
  getAnalyzerV2GatewayTask,
  isAnalyzerV2GatewayTaskEligibleForExecutableStatus,
} from "@/lib/analyzer-v2/gateway/policy";
import {
  ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
  ANALYZER_V2_HJ78_CAPTAIN_APPROVAL,
  ANALYZER_V2_HJ19_CAPTAIN_APPROVAL,
  ANALYZER_V2_W6_C_CAPTAIN_APPROVAL,
  ANALYZER_V2_W7_B_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL,
} from "@/lib/analyzer-v2/gateway/approval-records";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import { CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type EvidenceLifecycleTaskKey,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
  AGGREGATION_NARRATIVE_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import type { AnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/types";

const APPROVED_EXECUTABLE_TASK_IDS = [
  "claim_understanding_gate1",
  "evidence_query_planning",
  "evidence_applicability",
  "evidence_extraction",
  "evidence_sufficiency",
  "boundary_verdict_execution",
  "aggregation_narrative",
] as const;

function isApprovedExecutableTaskId(taskId: AnalyzerV2GatewayTask["id"]): boolean {
  return APPROVED_EXECUTABLE_TASK_IDS.some((id) => id === taskId);
}

describe("analyzer-v2 gateway policy registry", () => {
  it("declares owned, verified gateway tasks with only the approved hidden tasks executable", () => {
    expect(ANALYZER_V2_GATEWAY_TASKS.length).toBeGreaterThan(0);

    for (const task of ANALYZER_V2_GATEWAY_TASKS) {
      expect(task.id).toBeTruthy();
      expect(task.owner).toBeTruthy();
      expect(task.verifier).toBeTruthy();
      expect(task.outputSchemaVersion).toMatch(/^v2\./);
      expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(isApprovedExecutableTaskId(task.id));
    }
  });

  it("keeps prompt-backed tasks blocked except Captain-approved hidden execution slices", () => {
    const promptBackedTasks = ANALYZER_V2_GATEWAY_TASKS.filter((task) => task.promptPolicy);

    expect(promptBackedTasks.length).toBeGreaterThan(0);
    for (const task of promptBackedTasks) {
      expect(task.promptPolicy?.profile).toBe("claimboundary-v2");
      if (
        task.id === "claim_understanding_gate1" ||
        task.id === "evidence_query_planning" ||
        task.id === "evidence_applicability" ||
        task.id === "evidence_extraction" ||
        task.id === "evidence_sufficiency" ||
        task.id === "boundary_verdict_execution" ||
        task.id === "aggregation_narrative"
      ) {
        expect(task.status).toBe("executable");
        expect(task.promptPolicy?.approval).toMatchObject({
          status: "approved",
          reviewer: "Captain",
        });
        expect(task.modelPolicy?.approval).toMatchObject({
          status: "approved",
          reviewer: "Captain",
        });
        expect(task.cachePolicy?.approval).toMatchObject({
          status: "approved",
          reviewer: "Captain",
        });
      } else {
        expect(task.status).toBe("blockedUntilPromptApproved");
        expect(task.promptPolicy?.approval.status).not.toBe("approved");
        expect(task.modelPolicy?.approval.status).not.toBe("approved");
        expect(task.cachePolicy?.approval.status).not.toBe("approved");
      }
    }
  });

  it("declares approved executable claim-understanding variables and cache policy", () => {
    const task = getAnalyzerV2GatewayTask("claim_understanding_gate1");

    expect(task.status).toBe("executable");
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
    expect(task.promptPolicy?.approval).toBe(ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL);
    expect(task.modelPolicy?.approval).toBe(ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL);
    expect(task.cachePolicy?.approval).toBe(ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL);
    expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(true);
  });

  it("declares concrete approved model-policy metadata for claim understanding", () => {
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
      approval: ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL,
    });
    expect(policy?.approval).toBe(ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL);
  });

  it("aligns Evidence Lifecycle gateway metadata and only enables approved hidden task execution", () => {
    const evidenceTaskKeys: readonly EvidenceLifecycleTaskKey[] = [
      "evidence_query_planning",
      "evidence_applicability",
      "evidence_extraction",
      "evidence_sufficiency",
      "boundary_verdict_execution",
    ];

    for (const taskKey of evidenceTaskKeys) {
      const task = getAnalyzerV2GatewayTask(taskKey);

      expect(task.owner).toBe(
        taskKey === "boundary_verdict_execution" ? "boundary_verdict" : "evidence_lifecycle",
      );
      expect(task.promptPolicy?.sectionId).toBe(EVIDENCE_TASK_PROMPT_SECTION_IDS[taskKey]);
      expect(task.promptPolicy?.outputSchemaVersion).toBe(EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS[taskKey]);
      expect(task.outputSchemaVersion).toBe(EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS[taskKey]);
      if (taskKey === "evidence_query_planning") {
        expect(task.status).toBe("executable");
        expect(task.promptPolicy?.requiredVariables).toEqual([
          "claimContractJson",
          "taskPolicySnapshotJson",
          "retrievalPolicyCatalogJson",
          "sourceAcquisitionTraceJson",
        ]);
        expect(task.modelPolicy?.registryPolicyId).toBe("v2.model.evidence_query_planning.0");
        expect(task.cachePolicy?.policyId).toBe("v2.semantic.evidence-query-planning");
        expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(true);
        expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(true);
      } else if (taskKey === "evidence_applicability") {
        expect(task.status).toBe("executable");
        expect(task.promptPolicy?.requiredVariables).toEqual([
          "claimContractJson",
          "taskPolicySnapshotJson",
          "sourceContentPacketsJson",
          "sourceAcquisitionTraceJson",
        ]);
        expect(task.modelPolicy?.registryPolicyId).toBe("v2.model.evidence_applicability.hj78");
        expect(task.cachePolicy?.policyId).toBe("v2.semantic.evidence-applicability.hj78");
        expect(task.promptPolicy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
        expect(task.modelPolicy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
        expect(task.cachePolicy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
        expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(true);
        expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(true);
      } else {
        if (taskKey === "evidence_extraction") {
          expect(task.status).toBe("executable");
          expect(task.promptPolicy?.requiredVariables).toEqual([
            "claimContractJson",
            "taskPolicySnapshotJson",
            "sourceContentPacketsJson",
            "applicabilityResultJson",
          ]);
          expect(task.modelPolicy?.registryPolicyId).toBe("v2.model.evidence_extraction.x7w5");
          expect(task.cachePolicy?.policyId).toBe("v2.semantic.evidence-extraction.x7w5");
          expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(true);
          expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(true);
          continue;
        }
        if (taskKey === "evidence_sufficiency") {
          expect(task.status).toBe("executable");
          expect(task.promptPolicy?.requiredVariables).toEqual([
            "claimContractJson",
            "taskPolicySnapshotJson",
            "evidenceCorpusJson",
            "sourceAcquisitionTraceJson",
          ]);
          expect(task.modelPolicy?.registryPolicyId).toBe("v2.model.evidence_sufficiency.w6c");
          expect(task.cachePolicy?.policyId).toBe("v2.semantic.evidence-sufficiency.w6c");
          expect(task.promptPolicy?.approval).toBe(ANALYZER_V2_W6_C_CAPTAIN_APPROVAL);
          expect(task.modelPolicy?.approval).toBe(ANALYZER_V2_W6_C_CAPTAIN_APPROVAL);
          expect(task.cachePolicy?.approval).toBe(ANALYZER_V2_W6_C_CAPTAIN_APPROVAL);
          expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(true);
          expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(true);
          continue;
        }
        if (taskKey === "boundary_verdict_execution") {
          expect(task.status).toBe("executable");
          expect(task.promptPolicy?.requiredVariables).toEqual([
            "boundaryVerdictInputPacketJson",
            "taskPolicySnapshotJson",
            "sufficiencyAssessmentProjectionJson",
            "warningMaterialitySeedJson",
          ]);
          expect(task.modelPolicy?.registryPolicyId).toBe("v2.model.boundary_verdict_execution.w7b");
          expect(task.cachePolicy?.policyId).toBe("v2.semantic.boundary-verdict-execution.w7b");
          expect(task.promptPolicy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
          expect(task.modelPolicy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
          expect(task.cachePolicy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
          expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(true);
          expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(true);
          continue;
        }
        expect(task.status).toBe("blockedUntilPromptApproved");
        expect(task.modelPolicy?.registryPolicyId).toBe("unregistered");
        expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(false);
        expect(canExecuteAnalyzerV2GatewayTask(task)).toBe(false);
      }
    }
  });

  it("declares the exact Captain-approved query-planning model policy", () => {
    const policy = getAnalyzerV2TaskModelPolicy("evidence_query_planning");
    const gatewayTask = getAnalyzerV2GatewayTask("evidence_query_planning");

    expect(policy).toMatchObject({
      policyId: "v2.model.evidence_query_planning.0",
      gatewayTaskId: "evidence_query_planning",
      modelTask: "understand",
      modelTier: "standard",
      providerPolicy: "from_config_snapshot",
      temperature: 0.1,
      maxCalls: 1,
      schemaRetryCount: 0,
      timeoutMs: 90000,
      maxOutputTokens: 4000,
      fallbackBehavior: "none_fail_closed",
      escalationBehavior: "surface_provider_failure",
      execution: "blocked_until_prompt_model_cache_approval",
      approval: ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
    });
    expect(policy?.approval).toBe(ANALYZER_V2_7L1_CAPTAIN_APPROVAL);
    expect(gatewayTask.promptPolicy?.approval).toBe(ANALYZER_V2_7L1_CAPTAIN_APPROVAL);
    expect(gatewayTask.modelPolicy?.approval).toBe(ANALYZER_V2_7L1_CAPTAIN_APPROVAL);
    expect(gatewayTask.cachePolicy?.approval).toBe(ANALYZER_V2_7L1_CAPTAIN_APPROVAL);
  });

  it("declares the exact Captain-approved W5 bounded evidence-extraction model policy", () => {
    const policy = getAnalyzerV2TaskModelPolicy("evidence_extraction");
    const gatewayTask = getAnalyzerV2GatewayTask("evidence_extraction");

    expect(policy).toMatchObject({
      policyId: "v2.model.evidence_extraction.x7w5",
      gatewayTaskId: "evidence_extraction",
      modelTask: "extract_evidence",
      modelTier: "standard",
      providerPolicy: "from_config_snapshot",
      temperature: 0.1,
      maxCalls: 1,
      schemaRetryCount: 0,
      timeoutMs: 90000,
      maxOutputTokens: 8000,
      fallbackBehavior: "none_fail_closed",
      escalationBehavior: "surface_provider_failure",
      execution: "blocked_until_prompt_model_cache_approval",
      approval: ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
    });
    expect(policy?.approval).toBe(ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL);
    expect(gatewayTask.promptPolicy?.approval).toBe(ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL);
    expect(gatewayTask.modelPolicy?.approval).toBe(ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL);
    expect(gatewayTask.cachePolicy?.approval).toBe(ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL);
  });

  it("declares the exact Captain-approved HJ78 evidence-applicability model policy", () => {
    const policy = getAnalyzerV2TaskModelPolicy("evidence_applicability");
    const gatewayTask = getAnalyzerV2GatewayTask("evidence_applicability");

    expect(policy).toMatchObject({
      policyId: "v2.model.evidence_applicability.hj78",
      gatewayTaskId: "evidence_applicability",
      modelTask: "extract_evidence",
      modelTier: "standard",
      providerPolicy: "from_config_snapshot",
      temperature: 0.1,
      maxCalls: 1,
      schemaRetryCount: 0,
      timeoutMs: 90000,
      maxOutputTokens: 4000,
      fallbackBehavior: "none_fail_closed",
      escalationBehavior: "surface_provider_failure",
      execution: "blocked_until_prompt_model_cache_approval",
      approval: ANALYZER_V2_HJ78_CAPTAIN_APPROVAL,
    });
    expect(policy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
    expect(gatewayTask.promptPolicy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
    expect(gatewayTask.modelPolicy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
    expect(gatewayTask.cachePolicy?.approval).toBe(ANALYZER_V2_HJ78_CAPTAIN_APPROVAL);
  });

  it("declares the exact Captain-approved W7-B boundary/verdict execution model policy", () => {
    const policy = getAnalyzerV2TaskModelPolicy("boundary_verdict_execution");
    const gatewayTask = getAnalyzerV2GatewayTask("boundary_verdict_execution");

    expect(policy).toMatchObject({
      policyId: "v2.model.boundary_verdict_execution.w7b",
      gatewayTaskId: "boundary_verdict_execution",
      modelTask: "verdict",
      modelTier: "standard",
      providerPolicy: "from_config_snapshot",
      temperature: 0.1,
      maxCalls: 2,
      schemaRetryCount: 1,
      timeoutMs: 90000,
      maxOutputTokens: 4000,
      fallbackBehavior: "none_fail_closed",
      escalationBehavior: "surface_provider_failure",
      execution: "blocked_until_prompt_model_cache_approval",
      approval: ANALYZER_V2_W7_B_CAPTAIN_APPROVAL,
    });
    expect(policy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
    expect(gatewayTask.promptPolicy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
    expect(gatewayTask.modelPolicy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
    expect(gatewayTask.cachePolicy?.approval).toBe(ANALYZER_V2_W7_B_CAPTAIN_APPROVAL);
  });

  it("declares the exact Captain/Steer-Co-approved HJ19 aggregation narrative model policy", () => {
    const policy = getAnalyzerV2TaskModelPolicy("aggregation_narrative");
    const gatewayTask = getAnalyzerV2GatewayTask("aggregation_narrative");

    expect(gatewayTask.status).toBe("executable");
    expect(gatewayTask.promptPolicy?.sectionId).toBe(AGGREGATION_NARRATIVE_PROMPT_SECTION_ID);
    expect(gatewayTask.promptPolicy?.outputSchemaVersion).toBe(AGGREGATION_NARRATIVE_SCHEMA_VERSION);
    expect(gatewayTask.outputSchemaVersion).toBe(AGGREGATION_NARRATIVE_SCHEMA_VERSION);
    expect(gatewayTask.promptPolicy?.requiredVariables).toEqual([
      "aggregationNarrativeInputPacketJson",
      "taskPolicySnapshotJson",
      "reportQualityGuardrailsJson",
    ]);
    expect(gatewayTask.modelPolicy?.registryPolicyId).toBe("v2.model.aggregation_narrative.hj19");
    expect(gatewayTask.cachePolicy?.policyId).toBe("v2.semantic.aggregation-narrative.hj19");
    expect(policy).toMatchObject({
      policyId: "v2.model.aggregation_narrative.hj19",
      gatewayTaskId: "aggregation_narrative",
      modelTask: "report",
      modelTier: "standard",
      providerPolicy: "from_config_snapshot",
      temperature: 0.1,
      maxCalls: 1,
      schemaRetryCount: 0,
      timeoutMs: 90000,
      maxOutputTokens: 8000,
      fallbackBehavior: "none_fail_closed",
      escalationBehavior: "surface_provider_failure",
      execution: "blocked_until_prompt_model_cache_approval",
      approval: ANALYZER_V2_HJ19_CAPTAIN_APPROVAL,
    });
    expect(policy?.approval).toBe(ANALYZER_V2_HJ19_CAPTAIN_APPROVAL);
    expect(gatewayTask.promptPolicy?.approval).toBe(ANALYZER_V2_HJ19_CAPTAIN_APPROVAL);
    expect(gatewayTask.modelPolicy?.approval).toBe(ANALYZER_V2_HJ19_CAPTAIN_APPROVAL);
    expect(gatewayTask.cachePolicy?.approval).toBe(ANALYZER_V2_HJ19_CAPTAIN_APPROVAL);
    expect(canExecuteAnalyzerV2GatewayTask(gatewayTask)).toBe(true);
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

  it("keeps only approved hidden execution slices structurally eligible for execution", () => {
    const approved = {
      status: "approved" as const,
      reviewer: "LLM Expert",
      approvedAt: "2026-05-14T00:00:00.000Z",
    };

    expect(ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS).toEqual(APPROVED_EXECUTABLE_TASK_IDS);

    for (const task of ANALYZER_V2_GATEWAY_TASKS) {
      expect(isAnalyzerV2GatewayTaskEligibleForExecutableStatus(task)).toBe(isApprovedExecutableTaskId(task.id));
    }

    const laterPromptBackedTask = getAnalyzerV2GatewayTask("research_acquisition");
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

    expect(getAnalyzerV2GatewayTask("claim_understanding_gate1").status).toBe("executable");
    expect(getAnalyzerV2GatewayTask("evidence_query_planning").status).toBe("executable");
    expect(getAnalyzerV2GatewayTask("evidence_extraction").status).toBe("executable");
    expect(getAnalyzerV2GatewayTask("evidence_sufficiency").status).toBe("executable");
    expect(getAnalyzerV2GatewayTask("boundary_verdict_execution").status).toBe("executable");
    expect(getAnalyzerV2GatewayTask("aggregation_narrative").status).toBe("executable");
  });
});
