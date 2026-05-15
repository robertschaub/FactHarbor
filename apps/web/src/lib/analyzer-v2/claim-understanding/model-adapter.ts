import type { AnalyzerV2RenderedClaimUnderstandingPrompt } from "@/lib/analyzer-v2/claim-understanding/prompt-loader";
import { ClaimUnderstandingResultSchema } from "@/lib/analyzer-v2/claim-understanding/schemas";
import {
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import { canExecuteAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2GatewayTask,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_MODEL_ADAPTER_VERSION = "v2.claim-understanding.model-adapter.0";

export type ClaimUnderstandingModelAdapterInputFrame = {
  analysisInput: string;
  resolvedInputText: string;
  detectedLanguage: string;
};

export type ClaimUnderstandingProviderTelemetry = {
  providerId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
};

export type ClaimUnderstandingProviderCallRequest = {
  renderedPrompt: string;
  promptContentHash: string;
  outputSchemaVersion: typeof CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION;
  attemptNumber: number;
  maxAttempts: number;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  inputFrame: ClaimUnderstandingModelAdapterInputFrame;
};

export type ClaimUnderstandingProviderCallResponse = {
  output: unknown;
  telemetry: ClaimUnderstandingProviderTelemetry;
};

export type ClaimUnderstandingProviderCall = (
  request: ClaimUnderstandingProviderCallRequest,
) => Promise<ClaimUnderstandingProviderCallResponse>;

export type ClaimUnderstandingModelAdapterAttempt = {
  attemptNumber: number;
  promptContentHash: string;
  status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  providerTelemetry: ClaimUnderstandingProviderTelemetry | null;
  failureMessage: string | null;
};

export type ClaimUnderstandingModelAdapterTelemetry = {
  adapterVersion: typeof CLAIM_UNDERSTANDING_MODEL_ADAPTER_VERSION;
  promptContentHash: string;
  configSnapshotHash: string;
  outputSchemaVersion: typeof CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION;
  gatewayTaskId: "claim_understanding_gate1";
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

export type ClaimUnderstandingModelAdapterOutcome =
  | {
    executionStatus: "blocked_by_gateway";
    blockedReason: "gateway_policy_not_executable";
    claimUnderstandingResult: null;
    attempts: [];
    telemetry: ClaimUnderstandingModelAdapterTelemetry;
  }
  | {
    executionStatus: "completed";
    blockedReason: null;
    claimUnderstandingResult: ClaimUnderstandingResult;
    attempts: ClaimUnderstandingModelAdapterAttempt[];
    telemetry: ClaimUnderstandingModelAdapterTelemetry;
  };

export type ExecuteClaimUnderstandingModelAdapterRequest = {
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  renderedPrompt: AnalyzerV2RenderedClaimUnderstandingPrompt;
  inputFrame: ClaimUnderstandingModelAdapterInputFrame;
  configSnapshotHash: string;
  cacheDecision: AnalyzerV2CacheDecision;
  providerCall: ClaimUnderstandingProviderCall;
};

const FORBIDDEN_TELEMETRY_VALUES = new Set(["placeholder", "todo", "unknown"]);

function isForbiddenTelemetryValue(value: string): boolean {
  return FORBIDDEN_TELEMETRY_VALUES.has(value.trim().toLowerCase());
}

function assertRequiredTelemetryValue(value: string, fieldName: string): void {
  if (value.trim().length === 0 || isForbiddenTelemetryValue(value)) {
    throw new Error(`Analyzer V2 Claim Understanding adapter requires real ${fieldName}.`);
  }
}

function validateProviderTelemetry(
  telemetry: ClaimUnderstandingProviderTelemetry,
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

function damagedResult(reason: "claim_contract_validation_failed" | "claim_understanding_unavailable"): ClaimUnderstandingResult {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "damaged",
    claimContract: null,
    integrityEvents: [
      {
        type: "claim_contract_validation_failed",
        severity: "error",
        message: reason === "claim_understanding_unavailable"
          ? "Claim Understanding provider was unavailable before a valid contract could be produced."
          : "Claim Understanding result failed ClaimContract validation after the bounded structural retry.",
        claimIds: [],
      },
    ],
    blockedReason: null,
    damagedReason: reason,
  };
}

function buildTelemetry(params: {
  renderedPrompt: AnalyzerV2RenderedClaimUnderstandingPrompt;
  configSnapshotHash: string;
  cacheDecision: AnalyzerV2CacheDecision;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  attempts: ClaimUnderstandingModelAdapterAttempt[];
}): ClaimUnderstandingModelAdapterTelemetry {
  const providerAttempts = params.attempts
    .map((attempt) => attempt.providerTelemetry)
    .filter((telemetry): telemetry is ClaimUnderstandingProviderTelemetry => telemetry !== null);
  const lastProviderTelemetry = providerAttempts.at(-1) ?? null;

  return {
    adapterVersion: CLAIM_UNDERSTANDING_MODEL_ADAPTER_VERSION,
    promptContentHash: params.renderedPrompt.promptContentHash,
    configSnapshotHash: params.configSnapshotHash,
    outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    gatewayTaskId: "claim_understanding_gate1",
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
  request: ExecuteClaimUnderstandingModelAdapterRequest,
  modelPolicy: AnalyzerV2TaskModelPolicy,
  attempts: ClaimUnderstandingModelAdapterAttempt[],
  claimUnderstandingResult: ClaimUnderstandingResult,
): ClaimUnderstandingModelAdapterOutcome {
  return {
    executionStatus: "completed",
    blockedReason: null,
    claimUnderstandingResult,
    attempts,
    telemetry: buildTelemetry({
      renderedPrompt: request.renderedPrompt,
      configSnapshotHash: request.configSnapshotHash,
      cacheDecision: request.cacheDecision,
      modelPolicy,
      attempts,
    }),
  };
}

export async function executeClaimUnderstandingModelAdapter(
  request: ExecuteClaimUnderstandingModelAdapterRequest,
): Promise<ClaimUnderstandingModelAdapterOutcome> {
  assertRequiredTelemetryValue(request.renderedPrompt.promptContentHash, "promptContentHash");
  assertRequiredTelemetryValue(request.configSnapshotHash, "configSnapshotHash");

  const modelPolicy = request.modelPolicy;
  const attempts: ClaimUnderstandingModelAdapterAttempt[] = [];

  if (!canExecuteAnalyzerV2GatewayTask(request.gatewayTask)) {
    return {
      executionStatus: "blocked_by_gateway",
      blockedReason: "gateway_policy_not_executable",
      claimUnderstandingResult: null,
      attempts: [],
      telemetry: buildTelemetry({
        renderedPrompt: request.renderedPrompt,
        configSnapshotHash: request.configSnapshotHash,
        cacheDecision: request.cacheDecision,
        modelPolicy,
        attempts: [],
      }),
    };
  }

  const maxAttempts = maxAttemptsFromPolicy(modelPolicy);
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    let providerResponse: ClaimUnderstandingProviderCallResponse;
    try {
      providerResponse = await request.providerCall({
        renderedPrompt: request.renderedPrompt.renderedPrompt,
        promptContentHash: request.renderedPrompt.promptContentHash,
        outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
        attemptNumber,
        maxAttempts,
        modelPolicy,
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
      return completedOutcome(request, modelPolicy, attempts, damagedResult("claim_understanding_unavailable"));
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
      return completedOutcome(request, modelPolicy, attempts, damagedResult("claim_understanding_unavailable"));
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

    try {
      const parsedResult = ClaimUnderstandingResultSchema.parse(parsedOutput.value) as ClaimUnderstandingResult;
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "accepted",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: null,
      });
      return completedOutcome(request, modelPolicy, attempts, parsedResult);
    } catch (error) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.renderedPrompt.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: error instanceof Error ? error.message : "invalid schema",
      });
    }
  }

  return completedOutcome(request, modelPolicy, attempts, damagedResult("claim_contract_validation_failed"));
}
