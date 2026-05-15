export type AnalyzerV2GatewayTaskId =
  | "claim_understanding_gate1"
  | "research_acquisition"
  | "evidence_query_planning"
  | "evidence_applicability"
  | "evidence_extraction"
  | "evidence_sufficiency"
  | "boundary_clustering"
  | "verdict_debate"
  | "verdict_validation"
  | "aggregation_narrative";

export type AnalyzerV2GatewayTaskStatus =
  | "notImplemented"
  | "blockedUntilPromptApproved"
  | "executable";

export type AnalyzerV2ModelTask =
  | "understand"
  | "extract_evidence"
  | "context_refinement"
  | "verdict"
  | "report";

export type AnalyzerV2ModelTier = "budget" | "standard" | "premium";

export type AnalyzerV2ModelFallbackBehavior =
  | "none_fail_closed"
  | "provider_unavailable_damaged_result";

export type AnalyzerV2ModelEscalationBehavior =
  | "surface_provider_failure"
  | "surface_damaged_claim_understanding";

export type AnalyzerV2PolicyApproval = {
  status: "missing" | "pending" | "approved";
  reviewer: string | null;
  approvedAt: string | null;
};

export type AnalyzerV2PromptPolicy = {
  profile: "claimboundary-v2";
  sectionId: string;
  requiredVariables: readonly string[];
  outputSchemaVersion: string;
  approval: AnalyzerV2PolicyApproval;
};

export type AnalyzerV2ModelPolicy = {
  task: AnalyzerV2ModelTask;
  registryPolicyId: string;
  providerPolicy: "from_config_snapshot";
  temperaturePolicy: "from_model_task_registry";
  tokenBudgetPolicy: "from_model_task_registry";
  timeoutPolicy: "from_model_task_registry";
  retryPolicy: "from_model_task_registry";
  approval: AnalyzerV2PolicyApproval;
};

export type AnalyzerV2TaskModelPolicy = {
  policyId: string;
  gatewayTaskId: AnalyzerV2GatewayTaskId;
  modelTask: AnalyzerV2ModelTask;
  modelTier: AnalyzerV2ModelTier;
  providerPolicy: "from_config_snapshot";
  temperature: number;
  maxCalls: number;
  schemaRetryCount: number;
  timeoutMs: number;
  maxOutputTokens: number;
  fallbackBehavior: AnalyzerV2ModelFallbackBehavior;
  escalationBehavior: AnalyzerV2ModelEscalationBehavior;
  execution: "blocked_until_prompt_model_cache_approval";
  approval: AnalyzerV2PolicyApproval;
};

export type AnalyzerV2CacheDimension =
  | "promptProfile"
  | "promptSectionId"
  | "promptContentHash"
  | "modelTask"
  | "provider"
  | "modelName"
  | "temperature"
  | "outputSchemaVersion"
  | "configSnapshotHash"
  | "resultSchemaVersion"
  | "inputIdentityHash"
  | "claimUnderstandingInputSource"
  | "acsSnapshotHash"
  | "inputGroundingSeedHash"
  | "sourceIdentityHash"
  | "languageContextHash"
  | "searchContextHash"
  | "currentDateBucket"
  | "adapterVersion";

export type AnalyzerV2CachePolicy = {
  policyId: string;
  requiredDimensions: readonly AnalyzerV2CacheDimension[];
  optionalDimensions: readonly AnalyzerV2CacheDimension[];
  approval: AnalyzerV2PolicyApproval;
};

export type AnalyzerV2CacheDecisionReason =
  | "dimensions_complete_and_execution_approved"
  | "no_store_due_to_acs_snapshot_hash_mismatch"
  | "no_store_due_to_incomplete_dimensions"
  | "no_store_runtime_dispatch_safety"
  | "no_store_until_execution_approved";

export type AnalyzerV2CacheDecision = {
  namespace: string;
  canRead: boolean;
  canWrite: boolean;
  reason: AnalyzerV2CacheDecisionReason;
  missingDimensions: readonly AnalyzerV2CacheDimension[];
  keyParts: readonly { dimension: AnalyzerV2CacheDimension; value: string }[];
};

export type AnalyzerV2GatewayTask = {
  id: AnalyzerV2GatewayTaskId;
  owner: string;
  status: AnalyzerV2GatewayTaskStatus;
  promptPolicy: AnalyzerV2PromptPolicy | null;
  modelPolicy: AnalyzerV2ModelPolicy | null;
  cachePolicy: AnalyzerV2CachePolicy | null;
  verifier: string;
  outputSchemaVersion: string;
  notes: string;
};

export type AnalyzerV2SurfaceClassification =
  | "preserve_v1"
  | "owned_for_v2"
  | "quarantine_candidate"
  | "dead_candidate"
  | "defer";
