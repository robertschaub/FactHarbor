import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/claim-understanding/types";
import {
  ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
  ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
  ANALYZER_V2_EVIDENCE_EXTRACTION_CACHE_POLICY,
  ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY,
  ANALYZER_V2_EVIDENCE_SUFFICIENCY_CACHE_POLICY,
  ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
} from "@/lib/analyzer-v2/gateway/cache-policy-registry";
import {
  ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
  ANALYZER_V2_W6_C_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL,
} from "@/lib/analyzer-v2/gateway/approval-records";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import {
  EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2GatewayTaskId,
  AnalyzerV2GatewayTaskStatus,
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

export const ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS = [
  "claim_understanding_gate1",
  "evidence_query_planning",
  "evidence_extraction",
  "evidence_sufficiency",
] as const satisfies readonly AnalyzerV2GatewayTaskId[];

function blockedPrompt(
  sectionId: string,
  outputSchemaVersion: string,
  requiredVariables: readonly string[] = [],
  approval: AnalyzerV2PolicyApproval = MISSING_APPROVAL,
): AnalyzerV2PromptPolicy {
  return {
    profile: "claimboundary-v2",
    sectionId,
    requiredVariables,
    outputSchemaVersion,
    approval,
  };
}

function blockedModel(
  gatewayTaskId: AnalyzerV2GatewayTaskId,
  task: AnalyzerV2ModelTask,
): AnalyzerV2ModelPolicy {
  const taskModelPolicy = getAnalyzerV2TaskModelPolicy(gatewayTaskId);

  return {
    task,
    registryPolicyId: taskModelPolicy?.policyId ?? "unregistered",
    providerPolicy: "from_config_snapshot",
    temperaturePolicy: "from_model_task_registry",
    tokenBudgetPolicy: "from_model_task_registry",
    timeoutPolicy: "from_model_task_registry",
    retryPolicy: "from_model_task_registry",
    approval: taskModelPolicy?.approval ?? MISSING_APPROVAL,
  };
}

function task(params: {
  id: AnalyzerV2GatewayTaskId;
  owner: string;
  status?: AnalyzerV2GatewayTaskStatus;
  modelTask: AnalyzerV2ModelTask;
  promptSectionId: string;
  outputSchemaVersion: string;
  requiredVariables?: readonly string[];
  promptApproval?: AnalyzerV2PolicyApproval;
  claimUnderstandingCache?: boolean;
  queryPlanningCache?: boolean;
  evidenceExtractionCache?: boolean;
  evidenceSufficiencyCache?: boolean;
  sourceAware?: boolean;
  notes: string;
}): AnalyzerV2GatewayTask {
  return {
    id: params.id,
    owner: params.owner,
    status: params.status ?? "blockedUntilPromptApproved",
    promptPolicy: blockedPrompt(
      params.promptSectionId,
      params.outputSchemaVersion,
      params.requiredVariables,
      params.promptApproval,
    ),
    modelPolicy: blockedModel(params.id, params.modelTask),
    cachePolicy: params.claimUnderstandingCache
      ? ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY
      : params.queryPlanningCache
      ? ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY
      : params.evidenceExtractionCache
      ? ANALYZER_V2_EVIDENCE_EXTRACTION_CACHE_POLICY
      : params.evidenceSufficiencyCache
      ? ANALYZER_V2_EVIDENCE_SUFFICIENCY_CACHE_POLICY
      : params.sourceAware
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
    status: "executable",
    modelTask: "understand",
    promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
    outputSchemaVersion: CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION,
    requiredVariables: [
      "currentDate",
      "analysisInput",
      "acsSnapshotJson",
      "inputGroundingSeedJson",
    ],
    promptApproval: ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL,
    claimUnderstandingCache: true,
    notes: `Owns V2 claim understanding and Gate 1 contracts after explicit prompt/model approval; accepted results carry ${CLAIM_CONTRACT_V2_SCHEMA_VERSION}.`,
  }),
  task({
    id: "evidence_query_planning",
    owner: "evidence_lifecycle",
    status: "executable",
    modelTask: "understand",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_query_planning,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_query_planning,
    requiredVariables: [
      "claimContractJson",
      "taskPolicySnapshotJson",
      "retrievalPolicyCatalogJson",
      "sourceAcquisitionTraceJson",
    ],
    promptApproval: ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
    queryPlanningCache: true,
    notes: "Owns V2 Evidence Lifecycle query planning after prompt/model/cache policy approval.",
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
    id: "evidence_applicability",
    owner: "evidence_lifecycle",
    modelTask: "extract_evidence",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_applicability,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_applicability,
    sourceAware: true,
    notes: "Owns V2 Evidence Lifecycle applicability assessment after prompt/model/cache policy approval.",
  }),
  task({
    id: "evidence_extraction",
    owner: "evidence_lifecycle",
    status: "executable",
    modelTask: "extract_evidence",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_extraction,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_extraction,
    requiredVariables: [
      "claimContractJson",
      "taskPolicySnapshotJson",
      "sourceContentPacketsJson",
      "applicabilityResultJson",
    ],
    promptApproval: ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
    evidenceExtractionCache: true,
    notes: "Owns hidden/internal W5 bounded evidence extraction over one runtime-owned W4-H packet after prompt/model/cache policy approval.",
  }),
  task({
    id: "evidence_sufficiency",
    owner: "evidence_lifecycle",
    status: "executable",
    modelTask: "context_refinement",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency,
    outputSchemaVersion: EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS.evidence_sufficiency,
    requiredVariables: [
      "claimContractJson",
      "taskPolicySnapshotJson",
      "evidenceCorpusJson",
      "sourceAcquisitionTraceJson",
    ],
    promptApproval: ANALYZER_V2_W6_C_CAPTAIN_APPROVAL,
    evidenceSufficiencyCache: true,
    notes: "Owns hidden/internal W6-C sufficiency assessment over W5 EvidenceItem statements after prompt/model/cache policy approval.",
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

export function isAnalyzerV2GatewayTaskEligibleForExecutableStatus(
  taskEntry: AnalyzerV2GatewayTask,
): boolean {
  return ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS.some((id) => id === taskEntry.id);
}

export function getAnalyzerV2GatewayTask(id: AnalyzerV2GatewayTaskId): AnalyzerV2GatewayTask {
  const found = ANALYZER_V2_GATEWAY_TASKS.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Unknown Analyzer V2 gateway task: ${id}`);
  }
  return found;
}

export function canExecuteAnalyzerV2GatewayTask(taskEntry: AnalyzerV2GatewayTask): boolean {
  return isAnalyzerV2GatewayTaskEligibleForExecutableStatus(taskEntry)
    && taskEntry.status === "executable"
    && policyApproved(taskEntry.promptPolicy)
    && policyApproved(taskEntry.modelPolicy)
    && policyApproved(taskEntry.cachePolicy);
}
