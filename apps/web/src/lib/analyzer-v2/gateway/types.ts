export type AnalyzerV2GatewayTaskId =
  | "claim_understanding_gate1"
  | "research_query_planning"
  | "research_acquisition"
  | "evidence_extraction"
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
  providerPolicy: "from_config_snapshot";
  temperaturePolicy: "from_model_task_registry";
  tokenBudgetPolicy: "from_model_task_registry";
  timeoutPolicy: "from_model_task_registry";
  retryPolicy: "from_model_task_registry";
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
