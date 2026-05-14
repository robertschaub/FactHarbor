import { createHash } from "node:crypto";
import { ANALYZER_V2_TASK_MODEL_POLICIES } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import { ANALYZER_V2_GATEWAY_TASKS } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2GatewayTaskId,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { isRecord, readAcsResolvedInputText } from "@/lib/analyzer-v2/util";

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
  status: "not_started_precutover";
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
};

export type ClaimBoundaryV2RunContext = PipelineRunContext;

export type BuildClaimBoundaryV2RunContextOptions = {
  now?: () => Date;
};

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

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
      status: "not_started_precutover",
    },
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
