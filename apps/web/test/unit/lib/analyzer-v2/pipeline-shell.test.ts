import { describe, expect, it, vi } from "vitest";
import { runClaimBoundaryV2Shell } from "@/lib/analyzer-v2/pipeline-shell";
import { toResultCompatibilityView } from "@/lib/analyzer-v2/compatibility-view";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimUnderstandingProviderCallRequest } from "@/lib/analyzer-v2/claim-understanding/model-adapter";

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }
  return [];
}

function acceptedClaimUnderstandingResult(input: string): ClaimUnderstandingResult {
  return {
    schemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
    status: "accepted",
    claimContract: {
      schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
      input: {
        inputType: "text",
        inputValue: input,
        resolvedInputText: input,
        detectedLanguage: "und",
        selectedAtomicClaimIds: ["AC_DIRECT_01"],
      },
      inputGroundingSeed: {
        source: "direct_input",
        inputType: "text",
        inputValue: input,
        resolvedInputText: input,
        detectedLanguage: "und",
        currentDate: "2026-05-14",
        acsSnapshotHash: null,
        inputGroundingSeedHash: "direct-shell-seed-hash",
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
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

describe("analyzer-v2 shell", () => {
  it("returns an explicitly damaged V2 pre-cutover envelope without running analysis", async () => {
    const onEvent = vi.fn();

    const result = await runClaimBoundaryV2Shell({
      jobId: "job-v2-shell",
      inputType: "text",
      inputValue: "Structural shell test input",
      onEvent,
    });

    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        pipeline: "claimboundary-v2",
        runId: "job-v2-shell",
      },
      verdict: {
        label: "UNVERIFIED",
        truthPercentage: 50,
        confidence: 0,
        confidenceTier: "none",
      },
      qualityGates: {
        damagedReport: true,
      },
    });
    expect(result.resultJson.warnings).toEqual([
      expect.objectContaining({
        type: "report_damaged",
        primaryIssueEligible: true,
        damagedReportRelation: "report_damaged",
      }),
    ]);
    expect(result.reportMarkdown).toContain("No claim understanding");
    expect(onEvent).toHaveBeenCalledWith("Analyzer V2 orchestrator initialized.", 8);
    expect(onEvent).toHaveBeenCalledWith("Analyzer V2 damaged structural envelope generated.", 90);
  });

  it("exposes the damaged envelope through the compatibility view", async () => {
    const result = await runClaimBoundaryV2Shell({
      inputType: "text",
      inputValue: "Structural shell test input",
    });

    const view = toResultCompatibilityView(result.resultJson);

    expect(view).toMatchObject({
      schemaKind: "v2",
      schemaVersion: "4.0.0-cb-precutover",
      pipeline: "claimboundary-v2",
      verdictLabel: "UNVERIFIED",
      truthPercentage: 50,
      confidence: 0,
      confidenceTier: "none",
      primaryIssue: {
        code: "report_damaged",
      },
    });
    expect(view.claims).toEqual([
      expect.objectContaining({
        id: "AC_V2_SHELL_01",
        selected: true,
      }),
    ]);
    expect(view.qualityGates).toMatchObject({
      gate4Stats: {
        insufficient: 1,
      },
      summary: {
        damagedReport: true,
      },
    });
  });

  it("does not expose internal Claim Understanding runtime state in the public result JSON", async () => {
    const result = await runClaimBoundaryV2Shell({
      inputType: "text",
      inputValue: "Structural shell test input",
    });
    const keys = collectKeys(result.resultJson);
    const serialized = JSON.stringify(result.resultJson);

    expect(keys).not.toEqual(expect.arrayContaining([
      "claimUnderstanding",
      "claimUnderstandingResult",
      "claimUnderstandingState",
      "providerTelemetry",
      "cacheDecision",
      "keyParts",
      "renderedPrompt",
      "sideEffects",
    ]));
    expect(serialized).not.toContain("V2_CLAIM_UNDERSTANDING_GATE1");
    expect(serialized).not.toContain("v2.claim-understanding.runtime-stage.0");
    expect(serialized).not.toContain("gateway_policy_not_executable");
  });

  it("keeps the public result damaged and free of runtime internals even when the direct-text scaffold runs", async () => {
    const inputValue = "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben";
    const providerCalls: ClaimUnderstandingProviderCallRequest[] = [];

    const result = await runClaimBoundaryV2Shell(
      {
        jobId: "job-v2-shell-runtime-scaffold",
        inputType: "text",
        inputValue,
      },
      {
        now: () => new Date("2026-05-14T12:00:00.000Z"),
        claimUnderstandingRuntime: {
          directTextRuntimeDispatch: {
            enabled: true,
            providerBoundary: {
              provider: "anthropic",
              modelName: "claude-haiku-4-5-20251001",
              configSnapshotHash: "config-snapshot-hash-6b3c4a",
              temperature: 0.15,
              providerCall: async (request) => {
                providerCalls.push(request);
                return {
                  output: acceptedClaimUnderstandingResult(inputValue),
                  telemetry: {
                    providerId: "anthropic",
                    modelId: "claude-haiku-4-5-20251001",
                    inputTokens: 120,
                    outputTokens: 80,
                    totalTokens: 200,
                    durationMs: 345,
                  },
                };
              },
            },
          },
        },
      },
    );

    const keys = collectKeys(result.resultJson);
    const serialized = JSON.stringify(result.resultJson);

    expect(providerCalls).toHaveLength(1);
    expect(result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      qualityGates: {
        damagedReport: true,
      },
      verdict: {
        label: "UNVERIFIED",
        confidenceTier: "none",
      },
    });
    expect(result.reportMarkdown).toContain("No claim understanding");
    expect(keys).not.toEqual(expect.arrayContaining([
      "claimUnderstanding",
      "claimUnderstandingResult",
      "claimUnderstandingState",
      "providerTelemetry",
      "cacheDecision",
      "keyParts",
      "renderedPrompt",
      "renderedPromptHash",
      "sideEffects",
      "runtimeDispatchStatus",
      "runtimeDispatchBlockedReason",
      "ownerContract",
    ]));
    expect(serialized).not.toContain("providerTelemetry");
    expect(serialized).not.toContain("no_store_runtime_dispatch_safety");
    expect(serialized).not.toContain("v2.claim-understanding.runtime-stage.0");
    expect(serialized).not.toContain("runtime_dispatch_completed");
  });
});
