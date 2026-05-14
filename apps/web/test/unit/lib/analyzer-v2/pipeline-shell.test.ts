import { describe, expect, it, vi } from "vitest";
import { runClaimBoundaryV2Shell } from "@/lib/analyzer-v2/pipeline-shell";
import { toResultCompatibilityView } from "@/lib/analyzer-v2/compatibility-view";

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }
  return [];
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
});
