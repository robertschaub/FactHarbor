import { describe, expect, it } from "vitest";
import {
  CLAIMBOUNDARY_V2_PROMPT_FILE,
  CLAIMBOUNDARY_V2_PROMPT_PROFILE,
  CLAIM_UNDERSTANDING_GATE1_SECTION_ID,
  CLAIM_UNDERSTANDING_GATE1_VARIABLES,
  type AnalyzerV2RenderedClaimUnderstandingPrompt,
} from "@/lib/analyzer-v2/claim-understanding/prompt-loader";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimContract,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import {
  CLAIM_UNDERSTANDING_MODEL_ADAPTER_VERSION,
  executeClaimUnderstandingModelAdapter,
  type ClaimUnderstandingModelAdapterInputFrame,
  type ClaimUnderstandingProviderCallRequest,
  type ClaimUnderstandingProviderCallResponse,
  type ClaimUnderstandingProviderTelemetry,
} from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import { buildAnalyzerV2ClaimUnderstandingCacheDecision } from "@/lib/analyzer-v2/gateway/cache-governance";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import { getAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2GatewayTask,
  AnalyzerV2PolicyApproval,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";

const APPROVED: AnalyzerV2PolicyApproval = {
  status: "approved",
  reviewer: "LLM Expert",
  approvedAt: "2026-05-14T00:00:00.000Z",
};

const DEFAULT_INPUT = "Plastic recycling is pointless";
const GERMAN_INPUT = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";

function executableClaimUnderstandingTask(): AnalyzerV2GatewayTask {
  const base = getAnalyzerV2GatewayTask("claim_understanding_gate1");
  return {
    ...base,
    status: "executable",
    promptPolicy: base.promptPolicy ? { ...base.promptPolicy, approval: APPROVED } : null,
    modelPolicy: base.modelPolicy ? { ...base.modelPolicy, approval: APPROVED } : null,
    cachePolicy: base.cachePolicy ? { ...base.cachePolicy, approval: APPROVED } : null,
  };
}

function claimUnderstandingModelPolicy(
  overrides: Partial<AnalyzerV2TaskModelPolicy> = {},
): AnalyzerV2TaskModelPolicy {
  const policy = getAnalyzerV2TaskModelPolicy("claim_understanding_gate1");
  if (!policy) {
    throw new Error("Expected claim_understanding_gate1 model policy in test.");
  }
  return {
    ...policy,
    ...overrides,
  };
}

function renderedPrompt(renderedPromptText = `Claim Understanding\n${DEFAULT_INPUT}`): AnalyzerV2RenderedClaimUnderstandingPrompt {
  return {
    profile: CLAIMBOUNDARY_V2_PROMPT_PROFILE,
    sectionId: CLAIM_UNDERSTANDING_GATE1_SECTION_ID,
    promptFilePath: `C:/DEV/FactHarbor/apps/web/prompts/${CLAIMBOUNDARY_V2_PROMPT_FILE}`,
    promptContentHash: "prompt-content-hash-6b3b",
    requiredVariables: CLAIM_UNDERSTANDING_GATE1_VARIABLES,
    renderedPrompt: renderedPromptText,
  };
}

function inputFrame(input = DEFAULT_INPUT, language = "en"): ClaimUnderstandingModelAdapterInputFrame {
  return {
    analysisInput: input,
    resolvedInputText: input,
    detectedLanguage: language,
  };
}

function claimContract(input = DEFAULT_INPUT, language = "en"): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: input,
      resolvedInputText: input,
      detectedLanguage: language,
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: input,
      resolvedInputText: input,
      detectedLanguage: language,
      currentDate: "2026-05-14",
      acsSnapshotHash: null,
      inputGroundingSeedHash: `seed-hash-${language}`,
    },
    atomicClaims: [
      {
        id: "AC_DIRECT_01",
        statement: input,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Claim Understanding accepted the selected direct-input AtomicClaim.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedResult(input = DEFAULT_INPUT, language = "en"): ClaimUnderstandingResult {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "accepted",
    claimContract: claimContract(input, language),
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function providerTelemetry(overrides: Partial<ClaimUnderstandingProviderTelemetry> = {}): ClaimUnderstandingProviderTelemetry {
  return {
    providerId: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    inputTokens: 120,
    outputTokens: 80,
    totalTokens: 200,
    durationMs: 345,
    ...overrides,
  };
}

function noStoreCacheDecision() {
  return buildAnalyzerV2ClaimUnderstandingCacheDecision({
    promptProfile: CLAIMBOUNDARY_V2_PROMPT_PROFILE,
    promptSectionId: CLAIM_UNDERSTANDING_GATE1_SECTION_ID,
    promptContentHash: "prompt-content-hash-6b3b",
    modelTask: "understand",
    provider: "anthropic",
    modelName: "claude-haiku-4-5-20251001",
    temperature: 0.15,
    outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    configSnapshotHash: "config-snapshot-hash-6b3b",
    resultSchemaVersion: "4.0.0-cb-precutover",
    inputIdentityHash: "input-identity-hash-6b3b",
    currentDateBucket: "2026-05-14",
    claimUnderstandingInputSource: "direct_input",
    inputGroundingSeedHash: "seed-hash-en",
  });
}

function baseRequest(providerCall: () => Promise<ClaimUnderstandingProviderCallResponse>) {
  return {
    gatewayTask: executableClaimUnderstandingTask(),
    modelPolicy: claimUnderstandingModelPolicy(),
    renderedPrompt: renderedPrompt(),
    inputFrame: inputFrame(),
    configSnapshotHash: "config-snapshot-hash-6b3b",
    cacheDecision: noStoreCacheDecision(),
    providerCall,
  };
}

describe("Analyzer V2 Claim Understanding model adapter", () => {
  it("fails closed before provider dispatch when the gateway task is not executable", async () => {
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];
    const outcome = await executeClaimUnderstandingModelAdapter({
      ...baseRequest(async (request) => {
        providerCalls.push(request);
        return { output: acceptedResult(), telemetry: providerTelemetry() };
      }),
      gatewayTask: getAnalyzerV2GatewayTask("claim_understanding_gate1"),
    });

    expect(outcome.executionStatus).toBe("blocked_by_gateway");
    expect(outcome.blockedReason).toBe("gateway_policy_not_executable");
    expect(outcome.claimUnderstandingResult).toBeNull();
    expect(outcome.attempts).toEqual([]);
    expect(providerCalls).toEqual([]);
    expect(outcome.telemetry.cacheAccess).toEqual({ readAttempted: false, writeAttempted: false });
  });

  it("accepts a valid ClaimUnderstandingResult and records typed telemetry without cache IO", async () => {
    const outcome = await executeClaimUnderstandingModelAdapter(baseRequest(async () => ({
      output: acceptedResult(),
      telemetry: providerTelemetry(),
    })));

    expect(outcome.executionStatus).toBe("completed");
    expect(outcome.claimUnderstandingResult?.status).toBe("accepted");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.telemetry).toMatchObject({
      adapterVersion: CLAIM_UNDERSTANDING_MODEL_ADAPTER_VERSION,
      promptContentHash: "prompt-content-hash-6b3b",
      configSnapshotHash: "config-snapshot-hash-6b3b",
      outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
      gatewayTaskId: "claim_understanding_gate1",
      modelPolicyId: "v2.model.claim_understanding_gate1.0",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      retryCount: 0,
      tokenUsage: {
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
      },
      durationMs: 345,
      cacheAccess: {
        readAttempted: false,
        writeAttempted: false,
      },
    });
    expect(outcome.telemetry.cacheDecision.reason).toBe("no_store_until_execution_approved");
  });

  it("accepts a whole-response fenced JSON object as structural provider output", async () => {
    const calls: ClaimUnderstandingProviderCallRequest[] = [];
    const outcome = await executeClaimUnderstandingModelAdapter(baseRequest(async (request) => {
      calls.push(request);
      return {
        output: `\`\`\`json\n${JSON.stringify(acceptedResult())}\n\`\`\``,
        telemetry: providerTelemetry(),
      };
    }));

    expect(calls).toHaveLength(1);
    expect(outcome.executionStatus).toBe("completed");
    expect(outcome.claimUnderstandingResult?.status).toBe("accepted");
    expect(outcome.attempts.map((attempt) => attempt.status)).toEqual(["accepted"]);
  });

  it("accepts an unlabeled whole-response fenced JSON object as structural provider output", async () => {
    const outcome = await executeClaimUnderstandingModelAdapter(baseRequest(async () => ({
      output: `\`\`\`\n${JSON.stringify(acceptedResult())}\n\`\`\``,
      telemetry: providerTelemetry(),
    })));

    expect(outcome.claimUnderstandingResult?.status).toBe("accepted");
    expect(outcome.attempts.map((attempt) => attempt.status)).toEqual(["accepted"]);
  });

  it("uses only structural retry with identical prompt bytes and prompt hash", async () => {
    const calls: ClaimUnderstandingProviderCallRequest[] = [];
    const prompt = renderedPrompt(`Claim Understanding\n${GERMAN_INPUT}`);
    const frame = inputFrame(GERMAN_INPUT, "de");
    const outcome = await executeClaimUnderstandingModelAdapter({
      ...baseRequest(async (request) => {
        calls.push(request);
        return {
          output: calls.length === 1 ? { status: "accepted", claimContract: { extra: true } } : acceptedResult(GERMAN_INPUT, "de"),
          telemetry: providerTelemetry({ inputTokens: 100 + calls.length, outputTokens: 50, totalTokens: 150 + calls.length }),
        };
      }),
      renderedPrompt: prompt,
      inputFrame: frame,
    });

    expect(outcome.executionStatus).toBe("completed");
    expect(outcome.claimUnderstandingResult?.status).toBe("accepted");
    expect(outcome.telemetry.retryCount).toBe(1);
    expect(calls).toHaveLength(2);
    expect(calls[0].renderedPrompt).toBe(prompt.renderedPrompt);
    expect(calls[1].renderedPrompt).toBe(prompt.renderedPrompt);
    expect(calls[0].promptContentHash).toBe(prompt.promptContentHash);
    expect(calls[1].promptContentHash).toBe(prompt.promptContentHash);
    expect(calls[0].modelPolicy.schemaRetryCount).toBe(1);
    expect(calls[0].modelPolicy.maxCalls).toBe(2);
    expect(calls[0].inputFrame).toEqual(frame);
    expect(calls[1].inputFrame).toEqual(frame);
  });

  it("uses the supplied run-context model policy snapshot for structural retry budget", async () => {
    const calls: ClaimUnderstandingProviderCallRequest[] = [];
    const outcome = await executeClaimUnderstandingModelAdapter({
      ...baseRequest(async (request) => {
        calls.push(request);
        return {
          output: "not json",
          telemetry: providerTelemetry(),
        };
      }),
      modelPolicy: claimUnderstandingModelPolicy({
        policyId: "v2.model.claim_understanding_gate1.single-call-test",
        maxCalls: 1,
        schemaRetryCount: 0,
      }),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].modelPolicy.policyId).toBe("v2.model.claim_understanding_gate1.single-call-test");
    expect(outcome.telemetry.modelPolicyId).toBe("v2.model.claim_understanding_gate1.single-call-test");
    expect(outcome.claimUnderstandingResult?.status).toBe("damaged");
  });

  it("returns damaged after malformed JSON output exhausts the schema retry with parse telemetry", async () => {
    const calls: ClaimUnderstandingProviderCallRequest[] = [];
    const outcome = await executeClaimUnderstandingModelAdapter(baseRequest(async (request) => {
      calls.push(request);
      return {
        output: "not json",
        telemetry: providerTelemetry(),
      };
    }));

    expect(calls).toHaveLength(2);
    expect(outcome.executionStatus).toBe("completed");
    expect(outcome.claimUnderstandingResult?.status).toBe("damaged");
    expect(outcome.claimUnderstandingResult?.damagedReason).toBe("claim_contract_validation_failed");
    expect(outcome.attempts.map((attempt) => attempt.status)).toEqual(["parse_failure", "parse_failure"]);
    expect(outcome.attempts.map((attempt) => attempt.failureMessage)).toEqual([
      expect.stringContaining("JSON parse error"),
      expect.stringContaining("JSON parse error"),
    ]);
  });

  it.each([
    [
      "prose-wrapped fenced JSON",
      `Here is the result:\n\`\`\`json\n${JSON.stringify(acceptedResult())}\n\`\`\``,
    ],
    [
      "multiple fenced JSON blocks",
      `\`\`\`json\n${JSON.stringify(acceptedResult())}\n\`\`\`\n\`\`\`json\n${JSON.stringify(acceptedResult())}\n\`\`\``,
    ],
    [
      "malformed fenced JSON",
      "```json\n{\"schemaVersion\":\n```",
    ],
  ])("keeps %s as parse failure instead of broad JSON extraction", async (_label, output) => {
    const calls: ClaimUnderstandingProviderCallRequest[] = [];
    const outcome = await executeClaimUnderstandingModelAdapter(baseRequest(async (request) => {
      calls.push(request);
      return {
        output,
        telemetry: providerTelemetry(),
      };
    }));

    expect(calls).toHaveLength(2);
    expect(outcome.claimUnderstandingResult?.status).toBe("damaged");
    expect(outcome.claimUnderstandingResult?.damagedReason).toBe("claim_contract_validation_failed");
    expect(outcome.attempts.map((attempt) => attempt.status)).toEqual(["parse_failure", "parse_failure"]);
  });

  it("rejects malformed enums and extra keys through the production schema before returning accepted output", async () => {
    const calls: ClaimUnderstandingProviderCallRequest[] = [];
    const invalidOutput = {
      ...acceptedResult(),
      status: "accepted_with_warning",
      legacyContext: "not allowed",
    };
    const outcome = await executeClaimUnderstandingModelAdapter(baseRequest(async (request) => {
      calls.push(request);
      return {
        output: calls.length === 1 ? invalidOutput : acceptedResult(),
        telemetry: providerTelemetry(),
      };
    }));

    expect(calls).toHaveLength(2);
    expect(outcome.claimUnderstandingResult?.status).toBe("accepted");
    expect(outcome.attempts.map((attempt) => attempt.status)).toEqual(["invalid_schema", "accepted"]);
  });

  it("returns damaged unavailable when the provider call fails or telemetry is not real", async () => {
    const providerFailure = await executeClaimUnderstandingModelAdapter(baseRequest(async () => {
      throw new Error("provider unavailable");
    }));

    expect(providerFailure.claimUnderstandingResult?.status).toBe("damaged");
    expect(providerFailure.claimUnderstandingResult?.damagedReason).toBe("claim_understanding_unavailable");
    expect(providerFailure.attempts).toHaveLength(1);
    expect(providerFailure.attempts[0].status).toBe("provider_failure");

    const telemetryFailure = await executeClaimUnderstandingModelAdapter(baseRequest(async () => ({
      output: acceptedResult(),
      telemetry: providerTelemetry({ providerId: "unknown" }),
    })));

    expect(telemetryFailure.claimUnderstandingResult?.status).toBe("damaged");
    expect(telemetryFailure.claimUnderstandingResult?.damagedReason).toBe("claim_understanding_unavailable");
    expect(JSON.stringify(telemetryFailure.telemetry)).not.toMatch(/placeholder|todo|unknown/i);
  });
});
