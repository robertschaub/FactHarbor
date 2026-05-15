import type {
  AnalyzerV2GatewayTaskId,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import { ANALYZER_V2_7L1_CAPTAIN_APPROVAL } from "@/lib/analyzer-v2/gateway/approval-records";

const MISSING_APPROVAL = {
  status: "missing",
  reviewer: null,
  approvedAt: null,
} as const;

export const ANALYZER_V2_TASK_MODEL_POLICIES = [
  {
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
    approval: MISSING_APPROVAL,
  },
  {
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
  },
] as const satisfies readonly AnalyzerV2TaskModelPolicy[];

export function getAnalyzerV2TaskModelPolicy(
  gatewayTaskId: AnalyzerV2GatewayTaskId,
): AnalyzerV2TaskModelPolicy | null {
  return ANALYZER_V2_TASK_MODEL_POLICIES.find(
    (policy) => policy.gatewayTaskId === gatewayTaskId,
  ) ?? null;
}
