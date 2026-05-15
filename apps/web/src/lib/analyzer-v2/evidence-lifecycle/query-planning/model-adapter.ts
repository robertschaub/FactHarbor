import type { RenderedEvidenceQueryPlanningPrompt } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader";
import { EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";
import { EvidenceQueryPlanningResultSchema } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";
import {
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  type EvidenceLifecycleTaskEvent,
  type EvidenceQueryPlanningResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { canExecuteAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2GatewayTask,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";

export const EVIDENCE_QUERY_PLANNING_MODEL_ADAPTER_VERSION =
  "v2.evidence-query-planning.model-adapter.0";

export type EvidenceQueryPlanningModelAdapterInputFrame = {
  sourceLanguage: string;
  selectedAtomicClaimIds: readonly string[];
  currentDate: string;
};

export type EvidenceQueryPlanningProviderTelemetry = {
  providerId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
};

export type EvidenceQueryPlanningProviderCallRequest = {
  renderedPrompt: string;
  promptContentHash: string;
  outputSchemaVersion: typeof EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION;
  attemptNumber: number;
  maxAttempts: number;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  inputFrame: EvidenceQueryPlanningModelAdapterInputFrame;
};

export type EvidenceQueryPlanningProviderCallResponse = {
  output: unknown;
  telemetry: EvidenceQueryPlanningProviderTelemetry;
};

export type EvidenceQueryPlanningProviderCall = (
  request: EvidenceQueryPlanningProviderCallRequest,
) => Promise<EvidenceQueryPlanningProviderCallResponse>;

export type EvidenceQueryPlanningModelAdapterAttempt = {
  attemptNumber: number;
  promptContentHash: string;
  status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  providerTelemetry: EvidenceQueryPlanningProviderTelemetry | null;
  failureMessage: string | null;
};

export type EvidenceQueryPlanningModelAdapterTelemetry = {
  adapterVersion: typeof EVIDENCE_QUERY_PLANNING_MODEL_ADAPTER_VERSION;
  promptContentHash: string;
  configSnapshotHash: string;
  outputSchemaVersion: typeof EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION;
  gatewayTaskId: "evidence_query_planning";
  modelPolicyId: string;
  providerId: string | null;
  modelId: string | null;
  retryCount: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  durationMs: number;
  cacheDecision: AnalyzerV2CacheDecision;
  cacheAccess: {
    readAttempted: false;
    writeAttempted: false;
  };
};

export type EvidenceQueryPlanningModelAdapterOutcome =
  | {
    executionStatus: "blocked_by_gateway";
    blockedReason: "gateway_policy_not_executable";
    result: null;
    attempts: [];
    telemetry: EvidenceQueryPlanningModelAdapterTelemetry;
  }
  | {
    executionStatus: "completed";
    blockedReason: null;
    result: EvidenceQueryPlanningResult;
    attempts: EvidenceQueryPlanningModelAdapterAttempt[];
    telemetry: EvidenceQueryPlanningModelAdapterTelemetry;
  };

export type ExecuteEvidenceQueryPlanningModelAdapterRequest = {
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  renderedPrompt: RenderedEvidenceQueryPlanningPrompt;
  inputFrame: EvidenceQueryPlanningModelAdapterInputFrame;
  configSnapshotHash: string;
  cacheDecision: AnalyzerV2CacheDecision;
  providerCall: EvidenceQueryPlanningProviderCall;
};

const FORBIDDEN_TELEMETRY_VALUES = new Set(["placeholder", "todo", "unknown"]);

function isForbiddenTelemetryValue(value: string): boolean {
  return FORBIDDEN_TELEMETRY_VALUES.has(value.trim().toLowerCase());
}

function assertRequiredTelemetryValue(value: string, fieldName: string): void {
  if (value.trim().length === 0 || isForbiddenTelemetryValue(value)) {
    throw new Error(`Analyzer V2 Evidence Query Planning adapter requires real ${fieldName}.`);
  }
}

function event(
  type: EvidenceLifecycleTaskEvent["type"],
  severity: EvidenceLifecycleTaskEvent["severity"],
  message: string,
  references: string[],
): EvidenceLifecycleTaskEvent {
  return { type, severity, message, references };
}

function damagedResult(
  damagedReason: "schema_validation_failed" | "provider_unavailable" | "task_contract_validation_failed",
  message: string,
): EvidenceQueryPlanningResult {
  return {
    schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_query_planning",
    status: "damaged",
    queryPlan: null,
    integrityEvents: [
      event(
        damagedReason === "provider_unavailable" ? "provider_unavailable" : "schema_validation_failed",
        "error",
        message,
        ["evidence_query_planning"],
      ),
    ],
    blockedReason: null,
    damagedReason,
  };
}

function validateProviderTelemetry(
  telemetry: EvidenceQueryPlanningProviderTelemetry,
): string | null {
  for (const [fieldName, value] of [
    ["providerId", telemetry.providerId],
    ["modelId", telemetry.modelId],
  ] as const) {
    if (typeof value !== "string" || value.trim().length === 0 || isForbiddenTelemetryValue(value)) {
      return `invalid ${fieldName}`;
    }
  }

  for (const [fieldName, value] of [
    ["inputTokens", telemetry.inputTokens],
    ["outputTokens", telemetry.outputTokens],
    ["totalTokens", telemetry.totalTokens],
    ["durationMs", telemetry.durationMs],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      return `invalid ${fieldName}`;
    }
  }

  return null;
}

function maxAttemptsFromPolicy(policy: AnalyzerV2TaskModelPolicy): number {
  return Math.max(1, Math.min(policy.maxCalls, policy.schemaRetryCount + 1));
}

function parseProviderOutputText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (directParseError) {
    const trimmed = text.trim();
    const fencedJson = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
    if (!fencedJson) {
      throw directParseError;
    }
    return JSON.parse(fencedJson[1]);
  }
}

function coerceProviderOutput(output: unknown): { status: "parsed"; value: unknown } | { status: "parse_failure"; message: string } {
  if (typeof output !== "string") {
    return {
      status: "parsed",
      value: output,
    };
  }

  try {
    return {
      status: "parsed",
      value: parseProviderOutputText(output),
    };
  } catch (error) {
    return {
      status: "parse_failure",
      message: error instanceof Error ? `JSON parse error: ${error.message}` : "JSON parse error",
    };
  }
}

function validateAcceptedResultContent(
  result: EvidenceQueryPlanningResult,
  inputFrame: EvidenceQueryPlanningModelAdapterInputFrame,
): string | null {
  if (result.status !== "accepted") {
    return null;
  }

  if (result.queryPlan.queries.length > EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES) {
    return `query count exceeds ${EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES}`;
  }

  if (result.queryPlan.sourceLanguagePolicy.primaryLanguage !== inputFrame.sourceLanguage) {
    return "primary language does not match the approved source-language signal";
  }

  const selectedIdSet = new Set(inputFrame.selectedAtomicClaimIds);
  for (const query of result.queryPlan.queries) {
    for (const claimId of query.targetAtomicClaimIds) {
      if (!selectedIdSet.has(claimId)) {
        return `query targets unselected AtomicClaim id: ${claimId}`;
      }
    }
  }

  return null;
}

function buildTelemetry(params: {
  renderedPrompt: RenderedEvidenceQueryPlanningPrompt;
  configSnapshotHash: string;
  cacheDecision: AnalyzerV2CacheDecision;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  attempts: EvidenceQueryPlanningModelAdapterAttempt[];
}): EvidenceQueryPlanningModelAdapterTelemetry {
  const providerAttempts = params.attempts
    .map((attempt) => attempt.providerTelemetry)
    .filter((telemetry): telemetry is EvidenceQueryPlanningProviderTelemetry => telemetry !== null);
  const lastProviderTelemetry = providerAttempts.at(-1) ?? null;

  return {
    adapterVersion: EVIDENCE_QUERY_PLANNING_MODEL_ADAPTER_VERSION,
    promptContentHash: params.renderedPrompt.promptContentHash,
    configSnapshotHash: params.configSnapshotHash,
    outputSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    gatewayTaskId: "evidence_query_planning",
    modelPolicyId: params.modelPolicy.policyId,
    providerId: lastProviderTelemetry?.providerId ?? null,
    modelId: lastProviderTelemetry?.modelId ?? null,
    retryCount: Math.max(0, params.attempts.length - 1),
    tokenUsage: {
      inputTokens: providerAttempts.reduce((total, telemetry) => total + telemetry.inputTokens, 0),
      outputTokens: providerAttempts.reduce((total, telemetry) => total + telemetry.outputTokens, 0),
      totalTokens: providerAttempts.reduce((total, telemetry) => total + telemetry.totalTokens, 0),
    },
    durationMs: providerAttempts.reduce((total, telemetry) => total + telemetry.durationMs, 0),
    cacheDecision: params.cacheDecision,
    cacheAccess: {
      readAttempted: false,
      writeAttempted: false,
    },
  };
}

function completedOutcome(
  request: ExecuteEvidenceQueryPlanningModelAdapterRequest,
  attempts: EvidenceQueryPlanningModelAdapterAttempt[],
  result: EvidenceQueryPlanningResult,
): EvidenceQueryPlanningModelAdapterOutcome {
  return {
    executionStatus: "completed",
    blockedReason: null,
    result,
    attempts,
    telemetry: buildTelemetry({
      renderedPrompt: request.renderedPrompt,
      configSnapshotHash: request.configSnapshotHash,
      cacheDecision: request.cacheDecision,
      modelPolicy: request.modelPolicy,
      attempts,
    }),
  };
}

export async function executeEvidenceQueryPlanningModelAdapter(
  request: ExecuteEvidenceQueryPlanningModelAdapterRequest,
): Promise<EvidenceQueryPlanningModelAdapterOutcome> {
  assertRequiredTelemetryValue(request.renderedPrompt.promptContentHash, "promptContentHash");
  assertRequiredTelemetryValue(request.configSnapshotHash, "configSnapshotHash");

  const attempts: EvidenceQueryPlanningModelAdapterAttempt[] = [];

  if (!canExecuteAnalyzerV2GatewayTask(request.gatewayTask)) {
    return {
      executionStatus: "blocked_by_gateway",
      blockedReason: "gateway_policy_not_executable",
      result: null,
      attempts: [],
      telemetry: buildTelemetry({
        renderedPrompt: request.renderedPrompt,
        configSnapshotHash: request.configSnapshotHash,
        cacheDecision: request.cacheDecision,
        modelPolicy: request.modelPolicy,
        attempts: [],
      }),
    };
  }

  const maxAttempts = maxAttemptsFromPolicy(request.modelPolicy);
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    let providerResponse: EvidenceQueryPlanningProviderCallResponse;
    try {
      providerResponse = await request.providerCall({
        renderedPrompt: request.renderedPrompt.renderedPrompt,
        promptContentHash: request.renderedPrompt.promptContentHash,
        outputSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
        attemptNumber,
        maxAttempts,
        modelPolicy: request.modelPolicy,
        inputFrame: request.inputFrame,
      });
    } catch (error) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "provider_failure",
        providerTelemetry: null,
        failureMessage: error instanceof Error ? error.message : "provider failure",
      });
      return completedOutcome(
        request,
        attempts,
        damagedResult("provider_unavailable", "Evidence query-planning provider was unavailable."),
      );
    }

    const telemetryError = validateProviderTelemetry(providerResponse.telemetry);
    if (telemetryError) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "provider_failure",
        providerTelemetry: null,
        failureMessage: telemetryError,
      });
      return completedOutcome(request, attempts, damagedResult("provider_unavailable", telemetryError));
    }

    const parsedOutput = coerceProviderOutput(providerResponse.output);
    if (parsedOutput.status === "parse_failure") {
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "parse_failure",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: parsedOutput.message,
      });
      continue;
    }

    const parsedResult = EvidenceQueryPlanningResultSchema.safeParse(parsedOutput.value);
    if (!parsedResult.success) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: parsedResult.error.message,
      });
      continue;
    }

    const result = parsedResult.data as EvidenceQueryPlanningResult;
    const contentError = validateAcceptedResultContent(result, request.inputFrame);
    if (contentError) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: contentError,
      });
      continue;
    }

    attempts.push({
      attemptNumber,
      promptContentHash: request.renderedPrompt.promptContentHash,
      status: "accepted",
      providerTelemetry: providerResponse.telemetry,
      failureMessage: null,
    });
    return completedOutcome(request, attempts, result);
  }

  const lastFailure = attempts.at(-1)?.failureMessage ?? "Evidence query-planning output failed validation.";
  return completedOutcome(request, attempts, damagedResult("schema_validation_failed", lastFailure));
}
