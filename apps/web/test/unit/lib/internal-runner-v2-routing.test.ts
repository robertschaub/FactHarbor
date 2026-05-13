import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";
import { runClaimBoundaryV2Shell } from "@/lib/analyzer-v2/pipeline-shell";

vi.mock("@/lib/analyzer/claimboundary-pipeline", () => ({
  runClaimBoundaryAnalysis: vi.fn(async () => ({
    resultJson: { meta: {}, analysisWarnings: [] },
    reportMarkdown: "V1 fixture report",
  })),
  prepareStage1Snapshot: vi.fn(),
}));

vi.mock("@/lib/analyzer-v2/pipeline-shell", () => ({
  runClaimBoundaryV2Shell: vi.fn(async () => ({
    resultJson: { meta: { pipeline: "claimboundary-v2" }, warnings: [] },
    reportMarkdown: "V2 shell fixture report",
  })),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getEnv: vi.fn((name: string) => {
      if (name === "FH_API_BASE_URL") {
        return "http://localhost:3001";
      }
      const value = process.env[name];
      return value && value.trim() ? value : "";
    }),
  };
});

type RunnerHarnessResult = {
  statusBodies: Array<Record<string, unknown>>;
  resultBodies: Array<Record<string, any>>;
};

async function flushMicrotasks(iterations = 8): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

async function runQueuedJobHarness(params: {
  jobId: string;
  pipelineVariant?: string;
}): Promise<RunnerHarnessResult> {
  const statusBodies: Array<Record<string, unknown>> = [];
  const resultBodies: Array<Record<string, any>> = [];
  let detailReads = 0;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
      return new Response(JSON.stringify({
        jobs: [],
        pagination: { totalPages: 1 },
      }), { status: 200 });
    }

    if (method === "GET" && url.endsWith(`/v1/jobs/${params.jobId}`)) {
      detailReads++;
      if (detailReads === 1) {
        return new Response(JSON.stringify({
          jobId: params.jobId,
          status: "QUEUED",
          pipelineVariant: params.pipelineVariant,
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        jobId: params.jobId,
        status: "RUNNING",
        pipelineVariant: params.pipelineVariant,
        inputType: "text",
        inputValue: "queued report input",
      }), { status: 200 });
    }

    if (method === "POST" && url.endsWith(`/internal/v1/jobs/${params.jobId}/claim-runner`)) {
      return new Response(JSON.stringify({
        claimed: true,
        reason: "claimed",
        status: "RUNNING",
        runningCount: 1,
      }), { status: 200 });
    }

    if (method === "PUT" && url.includes(`/internal/v1/jobs/${params.jobId}/status`)) {
      statusBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (method === "PUT" && url.includes(`/internal/v1/jobs/${params.jobId}/result`)) {
      resultBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, any>);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });

  (globalThis as any).__fhRunnerQueueState = {
    runningCount: 0,
    queue: [{ jobId: params.jobId, enqueuedAt: Date.now() }],
    runningJobIds: new Set<string>(),
    isDraining: false,
    drainRequested: false,
    watchdogTimer: null,
  };

  const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
  await drainRunnerQueue();

  for (let i = 0; i < 20 && resultBodies.length === 0 && !statusBodies.some((body) => body.status === "FAILED"); i++) {
    await flushMicrotasks();
  }

  return { statusBodies, resultBodies };
}

describe("internal runner V2 shell routing", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();
    process.env.FH_API_BASE_URL = "http://localhost:3001";
    delete process.env.FH_ANALYZER_V2_SHELL;
    delete process.env.FH_ANALYZER_PIPELINE;
    (globalThis as any).__fhProviderHealthState = undefined;
    (globalThis as any).__fhRunnerQueueState = undefined;
  });

  afterEach(async () => {
    await flushMicrotasks();
    const qs = (globalThis as any).__fhRunnerQueueState;
    if (qs?.watchdogTimer) {
      clearInterval(qs.watchdogTimer);
      qs.watchdogTimer = null;
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("runs V1 for normal jobs even when the V2 shell flag is enabled", async () => {
    process.env.FH_ANALYZER_V2_SHELL = "enabled";

    const { resultBodies } = await runQueuedJobHarness({
      jobId: "job-v1-flag-only",
      pipelineVariant: "claimboundary",
    });

    expect(runClaimBoundaryAnalysis).toHaveBeenCalledTimes(1);
    expect(runClaimBoundaryV2Shell).not.toHaveBeenCalled();
    expect(resultBodies[0].resultJson.meta.pipelineVariant).toBe("claimboundary");
    expect(resultBodies[0].resultJson.meta.pipelineVariantRequested).toBeUndefined();
  });

  it("falls back to V1 when V2 is requested but disabled", async () => {
    const { resultBodies } = await runQueuedJobHarness({
      jobId: "job-v2-disabled",
      pipelineVariant: "claimboundary-v2",
    });

    expect(runClaimBoundaryAnalysis).toHaveBeenCalledTimes(1);
    expect(runClaimBoundaryV2Shell).not.toHaveBeenCalled();
    expect(resultBodies[0].resultJson.meta).toMatchObject({
      pipelineVariant: "claimboundary",
      pipelineVariantRequested: "claimboundary-v2",
      pipelineVariantFallbackReason: "v2-shell-disabled",
    });
  });

  it("routes to the V2 shell only when both stored variant and env flag are present", async () => {
    process.env.FH_ANALYZER_V2_SHELL = "enabled";

    const { resultBodies } = await runQueuedJobHarness({
      jobId: "job-v2-enabled",
      pipelineVariant: "claimboundary-v2",
    });

    expect(runClaimBoundaryAnalysis).not.toHaveBeenCalled();
    expect(runClaimBoundaryV2Shell).toHaveBeenCalledTimes(1);
    expect(resultBodies[0].resultJson.meta).toMatchObject({
      pipeline: "claimboundary-v2",
      pipelineVariant: "claimboundary-v2",
    });
    expect(resultBodies[0].reportMarkdown).toBe("V2 shell fixture report");
  });

  it("fails the job cleanly when the enabled V2 shell throws", async () => {
    process.env.FH_ANALYZER_V2_SHELL = "enabled";
    vi.mocked(runClaimBoundaryV2Shell).mockRejectedValueOnce(
      new Error("ANALYZER_V2_SHELL_NOT_IMPLEMENTED: test failure"),
    );

    const { statusBodies, resultBodies } = await runQueuedJobHarness({
      jobId: "job-v2-fail-fast",
      pipelineVariant: "claimboundary-v2",
    });

    expect(runClaimBoundaryAnalysis).not.toHaveBeenCalled();
    expect(resultBodies).toHaveLength(0);
    expect(statusBodies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: "FAILED",
        message: expect.stringContaining("ANALYZER_V2_SHELL_NOT_IMPLEMENTED"),
      }),
    ]));
  });
});
