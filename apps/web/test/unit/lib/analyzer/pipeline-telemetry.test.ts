import { describe, expect, it } from "vitest";
import {
  buildMetricsTelemetryContext,
  buildPipelineTelemetry,
} from "@/lib/analyzer/metrics-integration";
import type { LLMCallMetric } from "@/lib/analyzer/metrics";

type Warning = { type: string; severity?: string; message?: string; details?: Record<string, unknown> };

function result(opts: {
  warnings?: Warning[];
  runtimeRoleModels?: Record<string, unknown>;
  executedWebGitCommitHash?: string;
}): any {
  return {
    analysisWarnings: opts.warnings ?? [],
    meta: {
      runtimeRoleModels: opts.runtimeRoleModels,
      executedWebGitCommitHash: opts.executedWebGitCommitHash,
    },
  };
}

function challengerCall(overrides: Partial<LLMCallMetric> = {}): LLMCallMetric {
  return {
    taskType: "verdict",
    provider: "openai",
    modelName: "gpt-5.4",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    durationMs: 0,
    success: true,
    schemaCompliant: true,
    retries: 0,
    timestamp: new Date(),
    debateRole: "challenger",
    ...overrides,
  };
}

describe("buildPipelineTelemetry — contractValidation", () => {
  it("counts retry and repair occurrences and sums failingClaimCount", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "contract_validation_retry_triggered", details: { failingClaimCount: 2 } },
          { type: "contract_validation_retry_triggered", details: { failingClaimCount: 3 } },
          { type: "contract_repair_pass_fired", details: {} },
        ],
      }),
      [],
    );
    expect(t.contractValidation.status.available).toBe(true);
    expect(t.contractValidation.status.partial).toBe(false);
    expect(t.contractValidation.retryCount).toBe(2);
    expect(t.contractValidation.repairPassCount).toBe(1);
    expect(t.contractValidation.failingClaimCount).toBe(5);
    expect(t.contractValidation.jobHadRetry).toBe(true);
    expect(t.contractValidation.jobHadRepair).toBe(true);
  });

  it("is available with clean zeros when no contract warnings fired", () => {
    const t = buildPipelineTelemetry(result({ warnings: [] }), []);
    expect(t.contractValidation.status.available).toBe(true);
    expect(t.contractValidation.retryCount).toBe(0);
    expect(t.contractValidation.jobHadRetry).toBe(false);
  });

  it("marks partial when a retry warning lacks a numeric failingClaimCount", () => {
    const t = buildPipelineTelemetry(
      result({ warnings: [{ type: "contract_validation_retry_triggered", details: {} }] }),
      [],
    );
    expect(t.contractValidation.status.partial).toBe(true);
    expect(t.contractValidation.retryCount).toBe(1);
    expect(t.contractValidation.failingClaimCount).toBe(0);
  });
});

describe("buildPipelineTelemetry — verdictDirection", () => {
  it("joins flagged/rescued/downgraded claim-ID sets and derives unresolved", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "verdict_direction_issue", details: { claimId: "AC_01" } },
          { type: "verdict_direction_issue", details: { claimId: "AC_02" } },
          { type: "verdict_direction_issue", details: { claimId: "AC_03" } },
          { type: "direction_rescue_plausible", details: { claimId: "AC_01" } },
          { type: "verdict_integrity_failure", details: { claimId: "AC_02", triggerPolicy: "direction" } },
        ],
      }),
      [],
    );
    expect(t.verdictDirection.status.available).toBe(true);
    expect(t.verdictDirection.status.partial).toBe(false);
    expect(t.verdictDirection.issueCount).toBe(3);
    expect(t.verdictDirection.rescueCount).toBe(1);
    expect(t.verdictDirection.downgradeCount).toBe(1);
    expect(t.verdictDirection.flaggedClaimIds.sort()).toEqual(["AC_01", "AC_02", "AC_03"]);
    expect(t.verdictDirection.unresolvedClaimIds).toEqual(["AC_03"]);
    expect(t.verdictDirection.unresolvedIssueCount).toBe(1);
  });

  it("detects direction downgrades via the legacy integrityFailureType alias", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "verdict_direction_issue", details: { claimId: "AC_01" } },
          { type: "verdict_integrity_failure", details: { claimId: "AC_01", integrityFailureType: "direction" } },
        ],
      }),
      [],
    );
    expect(t.verdictDirection.downgradeCount).toBe(1);
    expect(t.verdictDirection.unresolvedClaimIds).toEqual([]);
  });

  it("ignores grounding-triggered integrity failures (not a direction downgrade)", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "verdict_integrity_failure", details: { claimId: "AC_09", triggerPolicy: "grounding" } },
        ],
      }),
      [],
    );
    expect(t.verdictDirection.downgradeCount).toBe(0);
  });

  it("marks partial when a direction warning lacks a claimId", () => {
    const t = buildPipelineTelemetry(
      result({ warnings: [{ type: "verdict_direction_issue", details: {} }] }),
      [],
    );
    expect(t.verdictDirection.status.partial).toBe(true);
  });

  it("marks partial when a rescued claim was never flagged (join inconsistency)", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "verdict_direction_issue", details: { claimId: "AC_01" } },
          { type: "direction_rescue_plausible", details: { claimId: "AC_99" } },
        ],
      }),
      [],
    );
    expect(t.verdictDirection.status.partial).toBe(true);
    // AC_01 stays unresolved; AC_99 is not subtracted from a set it was never in.
    expect(t.verdictDirection.unresolvedClaimIds).toEqual(["AC_01"]);
  });
});

describe("buildPipelineTelemetry — challengerModelGuard", () => {
  it("counts challenger-scoped precheck/retry TPM fallbacks and computes the physical-call rate", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "llm_tpm_guard_fallback", details: { promptKey: "VERDICT_CHALLENGER", reason: "tpm_guard_precheck" } },
          { type: "llm_tpm_guard_fallback", details: { promptKey: "VERDICT_CHALLENGER", reason: "tpm_guard_retry" } },
        ],
        runtimeRoleModels: { challenger: { callCount: 4 } },
      }),
      [challengerCall(), challengerCall(), challengerCall(), challengerCall()],
    );
    expect(t.challengerModelGuard.status.available).toBe(true);
    expect(t.challengerModelGuard.status.partial).toBe(false);
    expect(t.challengerModelGuard.precheckFallbackCount).toBe(1);
    expect(t.challengerModelGuard.retryFallbackCount).toBe(1);
    expect(t.challengerModelGuard.totalFallbackCount).toBe(2);
    expect(t.challengerModelGuard.challengerRoleInvocationCount).toBe(4);
    expect(t.challengerModelGuard.challengerPhysicalCallCount).toBe(4);
    expect(t.challengerModelGuard.fallbackPhysicalCallRate).toBeCloseTo(0.5);
  });

  it("excludes non-challenger TPM fallbacks (decision #1: challenger-scoped)", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "llm_tpm_guard_fallback", details: { promptKey: "VERDICT_ADVOCATE", reason: "tpm_guard_precheck" } },
          { type: "llm_tpm_guard_fallback", details: { promptKey: "VERDICT_RECONCILER", reason: "tpm_guard_retry" } },
        ],
        runtimeRoleModels: { challenger: { callCount: 1 } },
      }),
      [challengerCall()],
    );
    expect(t.challengerModelGuard.totalFallbackCount).toBe(0);
    expect(t.challengerModelGuard.fallbackPhysicalCallRate).toBe(0);
  });

  it("reports available:false (not zeros) when the challenger role never ran", () => {
    const t = buildPipelineTelemetry(
      result({ warnings: [], runtimeRoleModels: { advocate: { callCount: 2 } } }),
      [],
    );
    expect(t.challengerModelGuard.status.available).toBe(false);
    expect(t.challengerModelGuard.status.partial).toBe(false);
  });

  it("marks partial when fallback warnings exist but no challenger physical-call denominator", () => {
    const t = buildPipelineTelemetry(
      result({
        warnings: [
          { type: "llm_tpm_guard_fallback", details: { promptKey: "VERDICT_CHALLENGER", reason: "tpm_guard_precheck" } },
        ],
        runtimeRoleModels: { challenger: { callCount: 1 } },
      }),
      [], // no physical challenger calls recorded
    );
    expect(t.challengerModelGuard.status.available).toBe(true);
    expect(t.challengerModelGuard.status.partial).toBe(true);
    expect(t.challengerModelGuard.fallbackPhysicalCallRate).toBe(0);
  });
});

describe("buildPipelineTelemetry — top-level status & robustness", () => {
  it("propagates partial to the top-level status", () => {
    const t = buildPipelineTelemetry(
      result({ warnings: [{ type: "verdict_direction_issue", details: {} }] }),
      [],
    );
    expect(t.status.available).toBe(true);
    expect(t.status.partial).toBe(true);
    expect(t.telemetrySchemaVersion).toBe("1.0");
  });

  it("tolerates malformed/missing warning details without throwing", () => {
    const t = buildPipelineTelemetry(
      { analysisWarnings: [{ type: "verdict_direction_issue" }, { type: "contract_validation_retry_triggered" }] } as any,
      [],
    );
    expect(t.status.available).toBe(true);
    expect(t.contractValidation.retryCount).toBe(1);
  });

  it("treats a result with no warnings array as empty, not broken", () => {
    const t = buildPipelineTelemetry({} as any, []);
    expect(t.status.available).toBe(true);
    expect(t.contractValidation.retryCount).toBe(0);
    expect(t.verdictDirection.issueCount).toBe(0);
  });
});

describe("buildMetricsTelemetryContext", () => {
  it("keeps the full dirty commit for grouping and derives a clean short prefix", () => {
    const ctx = buildMetricsTelemetryContext(
      result({ executedWebGitCommitHash: "abcdef1234567890+wt9999" }),
      "claimboundary",
      () => null, // meta value present → resolver must not be consulted
    );
    expect(ctx.pipelineVariant).toBe("claimboundary");
    expect(ctx.pipelineCommitId).toBe("abcdef1234567890+wt9999");
    expect(ctx.pipelineCommitShort).toBe("abcdef123456");
    expect(typeof ctx.telemetryComputedAt).toBe("string");
  });

  it("falls back to the build-hash resolver when meta has no commit yet (timing seam)", () => {
    // The runner sets meta.executedWebGitCommitHash only after the pipeline
    // returns; this builder runs inside the pipeline, so it must resolve the
    // hash itself or provenance is silently lost.
    const ctx = buildMetricsTelemetryContext(
      { meta: {} } as any,
      "claimboundary",
      () => "fedcba9876543210+dirty",
    );
    expect(ctx.pipelineCommitId).toBe("fedcba9876543210+dirty");
    expect(ctx.pipelineCommitShort).toBe("fedcba987654");
  });

  it("leaves commit fields undefined when neither meta nor resolver yields a hash", () => {
    const ctx = buildMetricsTelemetryContext({ meta: {} } as any, "claimboundary", () => null);
    expect(ctx.pipelineCommitId).toBeUndefined();
    expect(ctx.pipelineCommitShort).toBeUndefined();
  });
});
