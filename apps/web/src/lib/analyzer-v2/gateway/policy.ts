import {
  ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
  ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
} from "@/lib/analyzer-v2/gateway/cache-governance";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2GatewayTaskId,
  AnalyzerV2ModelPolicy,
  AnalyzerV2ModelTask,
  AnalyzerV2PolicyApproval,
  AnalyzerV2PromptPolicy,
} from "@/lib/analyzer-v2/gateway/types";

const MISSING_APPROVAL: AnalyzerV2PolicyApproval = {
  status: "missing",
  reviewer: null,
  approvedAt: null,
};

function blockedPrompt(sectionId: string, outputSchemaVersion: string): AnalyzerV2PromptPolicy {
  return {
    profile: "claimboundary-v2",
    sectionId,
    requiredVariables: [],
    outputSchemaVersion,
    approval: MISSING_APPROVAL,
  };
}

function blockedModel(task: AnalyzerV2ModelTask): AnalyzerV2ModelPolicy {
  return {
    task,
    providerPolicy: "from_config_snapshot",
    temperaturePolicy: "from_model_task_registry",
    tokenBudgetPolicy: "from_model_task_registry",
    timeoutPolicy: "from_model_task_registry",
    retryPolicy: "from_model_task_registry",
    approval: MISSING_APPROVAL,
  };
}

function task(params: {
  id: AnalyzerV2GatewayTaskId;
  owner: string;
  modelTask: AnalyzerV2ModelTask;
  promptSectionId: string;
  outputSchemaVersion: string;
  sourceAware?: boolean;
  notes: string;
}): AnalyzerV2GatewayTask {
  return {
    id: params.id,
    owner: params.owner,
    status: "blockedUntilPromptApproved",
    promptPolicy: blockedPrompt(params.promptSectionId, params.outputSchemaVersion),
    modelPolicy: blockedModel(params.modelTask),
    cachePolicy: params.sourceAware
      ? ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY
      : ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
    verifier: "target-spec Section 13 plus current V1 prompt/model callsite inventory",
    outputSchemaVersion: params.outputSchemaVersion,
    notes: params.notes,
  };
}

export const ANALYZER_V2_GATEWAY_TASKS = [
  task({
    id: "claim_understanding_gate1",
    owner: "claim_understanding",
    modelTask: "understand",
    promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
    outputSchemaVersion: "v2.claim_understanding_gate1.0",
    notes: "Owns V2 claim understanding and Gate 1 contracts after explicit prompt approval.",
  }),
  task({
    id: "research_query_planning",
    owner: "research_planning",
    modelTask: "understand",
    promptSectionId: "V2_RESEARCH_QUERY_PLANNING",
    outputSchemaVersion: "v2.research_query_planning.0",
    notes: "Owns V2 query planning after prompt/model/cache policy approval.",
  }),
  {
    id: "research_acquisition",
    owner: "source_acquisition",
    status: "notImplemented",
    promptPolicy: null,
    modelPolicy: null,
    cachePolicy: null,
    verifier: "target-spec Section 5 external adapter boundary",
    outputSchemaVersion: "v2.research_acquisition.0",
    notes: "Structural acquisition adapter boundary; no LLM prompt policy is expected for fetching.",
  },
  task({
    id: "evidence_extraction",
    owner: "evidence_lifecycle",
    modelTask: "extract_evidence",
    promptSectionId: "V2_EVIDENCE_EXTRACTION",
    outputSchemaVersion: "v2.evidence_extraction.0",
    sourceAware: true,
    notes: "Owns relevance, applicability, evidence extraction, and evidence-source identity cache requirements.",
  }),
  task({
    id: "boundary_clustering",
    owner: "boundary_clustering",
    modelTask: "context_refinement",
    promptSectionId: "V2_BOUNDARY_CLUSTERING",
    outputSchemaVersion: "v2.boundary_clustering.0",
    sourceAware: true,
    notes: "Owns ClaimAssessmentBoundary clustering once V2 evidence contracts exist.",
  }),
  task({
    id: "verdict_debate",
    owner: "verdict_generation",
    modelTask: "verdict",
    promptSectionId: "V2_VERDICT_DEBATE",
    outputSchemaVersion: "v2.verdict_debate.0",
    sourceAware: true,
    notes: "Owns advocate/challenger/reconciler debate prompts after LLM Expert approval.",
  }),
  task({
    id: "verdict_validation",
    owner: "verdict_validation",
    modelTask: "verdict",
    promptSectionId: "V2_VERDICT_VALIDATION",
    outputSchemaVersion: "v2.verdict_validation.0",
    sourceAware: true,
    notes: "Owns grounding, direction, citation-direction, and repair validation prompts.",
  }),
  task({
    id: "aggregation_narrative",
    owner: "aggregation",
    modelTask: "report",
    promptSectionId: "V2_AGGREGATION_NARRATIVE",
    outputSchemaVersion: "v2.aggregation_narrative.0",
    sourceAware: true,
    notes: "Owns verdict aggregation, narrative, and article adjudication report contracts.",
  }),
] as const satisfies readonly AnalyzerV2GatewayTask[];

function policyApproved(policy: { approval: AnalyzerV2PolicyApproval } | null): boolean {
  return policy?.approval.status === "approved";
}

export function getAnalyzerV2GatewayTask(id: AnalyzerV2GatewayTaskId): AnalyzerV2GatewayTask {
  const found = ANALYZER_V2_GATEWAY_TASKS.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Unknown Analyzer V2 gateway task: ${id}`);
  }
  return found;
}

export function canExecuteAnalyzerV2GatewayTask(taskEntry: AnalyzerV2GatewayTask): boolean {
  return taskEntry.status === "executable"
    && policyApproved(taskEntry.promptPolicy)
    && policyApproved(taskEntry.modelPolicy)
    && policyApproved(taskEntry.cachePolicy);
}
