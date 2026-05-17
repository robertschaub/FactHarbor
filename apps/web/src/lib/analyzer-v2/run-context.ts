import { ANALYZER_V2_TASK_MODEL_POLICIES } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import { ANALYZER_V2_GATEWAY_TASKS } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2GatewayTaskId,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { isRecord, readAcsResolvedInputText, sha256Json } from "@/lib/analyzer-v2/util";

export const CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_SNAPSHOT_VERSION =
  "v2.claim-understanding.runtime-activation-snapshot.4c3b";
export const CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_PROFILE_ID =
  "v2.claim-understanding.hidden-direct-text.4c3b";
export const CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_ROLLBACK_COMMIT = "fc68915d";
export const CLAIM_UNDERSTANDING_RUNTIME_KILL_SWITCH_CLOSED = "kill_switch_closed";
export const CLAIM_UNDERSTANDING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT = "enabled_hidden_direct_text";
export const QUERY_PLANNING_RUNTIME_ACTIVATION_SNAPSHOT_VERSION =
  "v2.evidence-query-planning.runtime-activation-snapshot.x7s";
export const QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID =
  "v2.evidence-query-planning.hidden-direct-text.x7s";
export const QUERY_PLANNING_RUNTIME_ACTIVATION_ROLLBACK_COMMIT = "68f450cb";
export const QUERY_PLANNING_RUNTIME_KILL_SWITCH_CLOSED = "kill_switch_closed";
export const QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT = "enabled_hidden_direct_text";

export type PipelineRunConfigSnapshot = {
  source: "not_loaded_pre_provider_wiring_gate";
  configSnapshotHash: null;
  pipelineConfigHash: null;
  searchConfigHash: null;
  calcConfigHash: null;
};

export type PipelineRunPromptProfileRef = {
  source: "gateway_policy_snapshot";
  profile: "claimboundary-v2";
  sectionIds: readonly string[];
};

export type PipelineRunModelPolicySnapshot = {
  source: "static_precutover_registry";
  snapshotHash: string;
  gatewayTasks: readonly AnalyzerV2GatewayTask[];
  taskModelPolicies: readonly AnalyzerV2TaskModelPolicy[];
};

export type PipelineRunObservabilityLedgerHandle = {
  ledgerId: string;
  status: "runtime_activation_ready";
};

export type PipelineRunClaimUnderstandingRuntimeActivationSnapshot = {
  snapshotVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_SNAPSHOT_VERSION;
  source: "v2_task_policy_snapshot";
  status: PipelineRunClaimUnderstandingRuntimeActivationStatus;
  activationProfileId: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_PROFILE_ID;
  activationSnapshotHash: string;
  authority: "deputy_approved_temporary_activation_profile";
  suppliedBy: "product_owned_activation_authority";
  freezeLocation: "pipeline_run_context";
  approvalPointer: {
    sourcePackage: "Docs/WIP/2026-05-15_V2_Slice_6B3c4C3b_Hidden_Direct_Text_Wiring_Approval_Package.md";
    confirmedBy: "Captain";
    confirmedAt: "2026-05-15";
  };
  configProfileHash: string;
  rollbackTarget: {
    commit: typeof CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_ROLLBACK_COMMIT;
    behavior: "fail_closed_to_v2_damaged_envelope";
  };
  hiddenArtifactSink: {
    kind: "v2_observability_ledger";
    visibility: "internal_admin_only";
    publicPointerExposure: "forbidden";
  };
  provider: {
    providerId: "anthropic";
    modelId: "claude-haiku-4-5-20251001";
  };
};

export type PipelineRunClaimUnderstandingRuntimeActivationStatus =
  | typeof CLAIM_UNDERSTANDING_RUNTIME_KILL_SWITCH_CLOSED
  | typeof CLAIM_UNDERSTANDING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT;

export type PipelineRunQueryPlanningRuntimeActivationStatus =
  | typeof QUERY_PLANNING_RUNTIME_KILL_SWITCH_CLOSED
  | typeof QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT;

export type PipelineRunQueryPlanningRuntimeActivationSnapshot = {
  snapshotVersion: typeof QUERY_PLANNING_RUNTIME_ACTIVATION_SNAPSHOT_VERSION;
  source: "v2_task_policy_snapshot";
  status: PipelineRunQueryPlanningRuntimeActivationStatus;
  activationProfileId: typeof QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID;
  activationSnapshotHash: string;
  authority: "deputy_approved_temporary_activation_profile";
  suppliedBy: "product_owned_activation_authority";
  freezeLocation: "pipeline_run_context";
  approvalPointer: {
    sourcePackage: "Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md";
    confirmedBy: "Code/package; LLM/semantic; Security/runtime reviewers";
    confirmedAt: "2026-05-17";
  };
  configProfileHash: string;
  rollbackTarget: {
    commit: typeof QUERY_PLANNING_RUNTIME_ACTIVATION_ROLLBACK_COMMIT;
    behavior: "fail_closed_to_x7o_preexecution_observation";
  };
  hiddenArtifactSink: {
    kind: "v2_evidence_query_planning_runtime_artifact_ledger";
    visibility: "internal_admin_only";
    publicPointerExposure: "forbidden";
  };
  provider: {
    providerId: "anthropic";
    modelId: "claude-haiku-4-5-20251001";
  };
};

export type PipelineRunContext = {
  runId: string;
  inputType: ClaimBoundaryV2Ingress["submitted"]["kind"];
  inputValue: string;
  resolvedInputText: string;
  detectedLanguage: string;
  selectedAtomicClaimIds: string[];
  generatedUtc: string;
  currentDate: string;
  configSnapshot: PipelineRunConfigSnapshot;
  promptProfile: PipelineRunPromptProfileRef;
  modelPolicy: PipelineRunModelPolicySnapshot;
  observabilityLedger: PipelineRunObservabilityLedgerHandle;
  claimUnderstandingRuntimeActivation: PipelineRunClaimUnderstandingRuntimeActivationSnapshot;
  queryPlanningRuntimeActivation: PipelineRunQueryPlanningRuntimeActivationSnapshot;
};

export type ClaimBoundaryV2RunContext = PipelineRunContext;

export type BuildClaimBoundaryV2RunContextOptions = {
  now?: () => Date;
  runtimeActivationStatus?: PipelineRunClaimUnderstandingRuntimeActivationStatus;
  queryPlanningRuntimeActivationStatus?: PipelineRunQueryPlanningRuntimeActivationStatus;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildConfigSnapshot(): PipelineRunConfigSnapshot {
  return {
    source: "not_loaded_pre_provider_wiring_gate",
    configSnapshotHash: null,
    pipelineConfigHash: null,
    searchConfigHash: null,
    calcConfigHash: null,
  };
}

function buildModelPolicySnapshot(): PipelineRunModelPolicySnapshot {
  const gatewayTasks = cloneJson(ANALYZER_V2_GATEWAY_TASKS);
  const taskModelPolicies = cloneJson(ANALYZER_V2_TASK_MODEL_POLICIES);

  return {
    source: "static_precutover_registry",
    snapshotHash: sha256Json({ gatewayTasks, taskModelPolicies }),
    gatewayTasks,
    taskModelPolicies,
  };
}

function buildPromptProfileRef(
  modelPolicy: PipelineRunModelPolicySnapshot,
): PipelineRunPromptProfileRef {
  return {
    source: "gateway_policy_snapshot",
    profile: "claimboundary-v2",
    sectionIds: Array.from(new Set(modelPolicy.gatewayTasks
      .map((task) => task.promptPolicy?.sectionId)
      .filter((sectionId): sectionId is string => typeof sectionId === "string" && sectionId.trim().length > 0))),
  };
}

function buildClaimUnderstandingRuntimeActivationSnapshot(
  modelPolicy: PipelineRunModelPolicySnapshot,
  status: PipelineRunClaimUnderstandingRuntimeActivationStatus =
    CLAIM_UNDERSTANDING_RUNTIME_KILL_SWITCH_CLOSED,
): PipelineRunClaimUnderstandingRuntimeActivationSnapshot {
  const configProfileHash = sha256Json({
    activationProfileId: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_PROFILE_ID,
    provider: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    modelPolicySnapshotHash: modelPolicy.snapshotHash,
  });
  const base = {
    snapshotVersion: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_SNAPSHOT_VERSION,
    source: "v2_task_policy_snapshot",
    status,
    activationProfileId: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_PROFILE_ID,
    authority: "deputy_approved_temporary_activation_profile",
    suppliedBy: "product_owned_activation_authority",
    freezeLocation: "pipeline_run_context",
    approvalPointer: {
      sourcePackage: "Docs/WIP/2026-05-15_V2_Slice_6B3c4C3b_Hidden_Direct_Text_Wiring_Approval_Package.md",
      confirmedBy: "Captain",
      confirmedAt: "2026-05-15",
    },
    configProfileHash,
    rollbackTarget: {
      commit: CLAIM_UNDERSTANDING_RUNTIME_ACTIVATION_ROLLBACK_COMMIT,
      behavior: "fail_closed_to_v2_damaged_envelope",
    },
    hiddenArtifactSink: {
      kind: "v2_observability_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    },
    provider: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
    },
  } satisfies Omit<PipelineRunClaimUnderstandingRuntimeActivationSnapshot, "activationSnapshotHash">;

  return {
    ...base,
    activationSnapshotHash: sha256Json(base),
  };
}

function buildQueryPlanningRuntimeActivationSnapshot(
  modelPolicy: PipelineRunModelPolicySnapshot,
  status: PipelineRunQueryPlanningRuntimeActivationStatus =
    QUERY_PLANNING_RUNTIME_KILL_SWITCH_CLOSED,
): PipelineRunQueryPlanningRuntimeActivationSnapshot {
  const configProfileHash = sha256Json({
    activationProfileId: QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
    provider: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    modelPolicySnapshotHash: modelPolicy.snapshotHash,
    sourcePackage: "Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md",
  });
  const base = {
    snapshotVersion: QUERY_PLANNING_RUNTIME_ACTIVATION_SNAPSHOT_VERSION,
    source: "v2_task_policy_snapshot",
    status,
    activationProfileId: QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
    authority: "deputy_approved_temporary_activation_profile",
    suppliedBy: "product_owned_activation_authority",
    freezeLocation: "pipeline_run_context",
    approvalPointer: {
      sourcePackage: "Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md",
      confirmedBy: "Code/package; LLM/semantic; Security/runtime reviewers",
      confirmedAt: "2026-05-17",
    },
    configProfileHash,
    rollbackTarget: {
      commit: QUERY_PLANNING_RUNTIME_ACTIVATION_ROLLBACK_COMMIT,
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
  } satisfies Omit<PipelineRunQueryPlanningRuntimeActivationSnapshot, "activationSnapshotHash">;

  return {
    ...base,
    activationSnapshotHash: sha256Json(base),
  };
}

function normalizeSelectedClaimIds(selectedClaimIds: string[] | undefined): string[] {
  const normalized = (selectedClaimIds ?? [])
    .map((claimId) => claimId.trim())
    .filter((claimId) => claimId.length > 0);
  return Array.from(new Set(normalized));
}

function firstNonBlank(...values: Array<string | null | undefined>): string {
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  if (!value) {
    throw new Error("Analyzer V2 run context requires a non-empty input value.");
  }
  return value;
}

function readAcsDetectedLanguage(input: ClaimBoundaryV2Ingress): string {
  const snapshot = input.preparedSeed?.acsSnapshot;
  const preparedUnderstanding = isRecord(snapshot)
    && isRecord(snapshot.preparedUnderstanding)
    ? snapshot.preparedUnderstanding
    : null;
  const detectedLanguage = preparedUnderstanding?.detectedLanguage;

  return typeof detectedLanguage === "string" && detectedLanguage.trim().length > 0
    ? detectedLanguage
    : "und";
}

export function buildClaimBoundaryV2RunContext(
  input: ClaimBoundaryV2Ingress,
  options: BuildClaimBoundaryV2RunContextOptions = {},
): PipelineRunContext {
  const now = options.now?.() ?? new Date();
  const generatedUtc = now.toISOString();
  const selectedAtomicClaimIds = normalizeSelectedClaimIds(input.selectedAtomicClaimIds);
  const inputValue = firstNonBlank(input.submitted.value);
  const modelPolicy = buildModelPolicySnapshot();
  const resolvedInputText = firstNonBlank(
    readAcsResolvedInputText(input),
    inputValue,
  );
  const runId = input.runIdHint || `v2-shell-${generatedUtc}`;

  return {
    runId,
    inputType: input.submitted.kind,
    inputValue,
    resolvedInputText,
    detectedLanguage: readAcsDetectedLanguage(input),
    selectedAtomicClaimIds,
    generatedUtc,
    currentDate: generatedUtc.slice(0, 10),
    configSnapshot: buildConfigSnapshot(),
    promptProfile: buildPromptProfileRef(modelPolicy),
    modelPolicy,
    observabilityLedger: {
      ledgerId: `${runId}:precutover-observability`,
      status: "runtime_activation_ready",
    },
    claimUnderstandingRuntimeActivation: buildClaimUnderstandingRuntimeActivationSnapshot(
      modelPolicy,
      options.runtimeActivationStatus,
    ),
    queryPlanningRuntimeActivation: buildQueryPlanningRuntimeActivationSnapshot(
      modelPolicy,
      options.queryPlanningRuntimeActivationStatus,
    ),
  };
}

export function getPipelineRunGatewayTask(
  context: PipelineRunContext,
  id: AnalyzerV2GatewayTaskId,
): AnalyzerV2GatewayTask {
  const task = context.modelPolicy.gatewayTasks.find((entry) => entry.id === id);
  if (!task) {
    throw new Error(`Analyzer V2 run context is missing gateway task: ${id}`);
  }
  return task;
}

export function getPipelineRunTaskModelPolicy(
  context: PipelineRunContext,
  gatewayTaskId: AnalyzerV2GatewayTaskId,
): AnalyzerV2TaskModelPolicy | null {
  return context.modelPolicy.taskModelPolicies.find(
    (policy) => policy.gatewayTaskId === gatewayTaskId,
  ) ?? null;
}
