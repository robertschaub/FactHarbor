import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareStage1Snapshot, runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";

vi.mock("@/lib/analyzer/claimboundary-pipeline", () => ({
  runClaimBoundaryAnalysis: vi.fn(() => new Promise(() => {})),
  prepareStage1Snapshot: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/lib/analyzer/claim-selection-recommendation", () => ({
  generateClaimSelectionRecommendation: vi.fn(async () => ({
    rankedClaimIds: [],
    recommendedClaimIds: [],
    assessments: [],
    rationale: "",
  })),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(async () => ({
    config: {
      claimSelectionCap: 5,
      claimSelectionIdleAutoProceedMs: 180000,
    },
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

async function flushMicrotasks(iterations = 8): Promise<void> {
  for (let i = 0; i < iterations; i++) {
    await Promise.resolve();
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("runner concurrency split", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();

    process.env.FH_API_BASE_URL = "http://localhost:3001";
    process.env.FH_RUNNER_MAX_CONCURRENCY = "1";
    process.env.FH_RUNNER_JOB_MAX_CONCURRENCY = "1";
    process.env.FH_RUNNER_PREP_MAX_CONCURRENCY = "1";

    (globalThis as any).__fhProviderHealthState = undefined;
    (globalThis as any).__fhRunnerQueueState = undefined;
    (globalThis as any).__fhDraftQueueState = undefined;
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

  it("starts draft preparation even when the job lane is already full", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/recoverable")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/idle-auto-proceed-due")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/claim-selection-drafts/draft-1")) {
        return new Response(JSON.stringify({
          draftId: "draft-1",
          status: "QUEUED",
          activeInputType: "text",
          activeInputValue: "queued session input",
          selectionMode: "interactive",
        }), { status: 200 });
      }

      if (method === "PUT" && url.includes("/internal/v1/claim-selection-drafts/draft-1/status")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    (globalThis as any).__fhRunnerQueueState = {
      runningCount: 1,
      queue: [],
      runningJobIds: new Set<string>(["job-full"]),
      isDraining: false,
      drainRequested: false,
      watchdogTimer: null,
    };
    (globalThis as any).__fhDraftQueueState = {
      runningCount: 0,
      queue: [{ draftId: "draft-1", enqueuedAt: Date.now() }],
      runningDraftIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
    };

    const { drainDraftQueue } = await import("@/lib/internal-runner-queue");
    await drainDraftQueue();
    await flushMicrotasks();

    const qs = (globalThis as any).__fhRunnerQueueState;
    const ds = (globalThis as any).__fhDraftQueueState;

    expect(qs.runningCount).toBe(1);
    expect(ds.runningCount).toBe(1);
    expect(ds.runningDraftIds.has("draft-1")).toBe(true);
  });

  it("starts a report job even when the prep lane is already busy", async () => {
    let jobDetailReads = 0;
    const analysis = createDeferred<any>();
    vi.mocked(runClaimBoundaryAnalysis).mockImplementation(() => analysis.promise);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
        return new Response(JSON.stringify({
          jobs: [],
          pagination: { totalPages: 1 },
        }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/jobs/job-1")) {
        jobDetailReads++;
        if (jobDetailReads === 1) {
          return new Response(JSON.stringify({
            jobId: "job-1",
            status: "QUEUED",
            pipelineVariant: "claimboundary",
          }), { status: 200 });
        }

        return new Response(JSON.stringify({
          jobId: "job-1",
          status: "RUNNING",
          pipelineVariant: "claimboundary",
          inputType: "text",
          inputValue: "queued report input",
        }), { status: 200 });
      }

      if (method === "POST" && url.endsWith("/internal/v1/jobs/job-1/claim-runner")) {
        return new Response(JSON.stringify({
          claimed: true,
          reason: "claimed",
          status: "RUNNING",
          runningCount: 1,
        }), { status: 200 });
      }

      if (method === "PUT" && url.includes("/internal/v1/jobs/job-1/status")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    (globalThis as any).__fhRunnerQueueState = {
      runningCount: 0,
      queue: [{ jobId: "job-1", enqueuedAt: Date.now() }],
      runningJobIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
      watchdogTimer: null,
    };
    (globalThis as any).__fhDraftQueueState = {
      runningCount: 1,
      queue: [],
      runningDraftIds: new Set<string>(["draft-busy"]),
      isDraining: false,
      drainRequested: false,
    };

    const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
    await drainRunnerQueue();
    await flushMicrotasks();

    const qs = (globalThis as any).__fhRunnerQueueState;
    const ds = (globalThis as any).__fhDraftQueueState;

    expect(qs.runningCount).toBe(1);
    expect(qs.runningJobIds.has("job-1")).toBe(true);
    expect(ds.runningCount).toBe(1);

    analysis.resolve({ resultJson: { meta: {} } });
    await flushMicrotasks();
  });

  it("emits a heartbeat when a report job has no recent stage event", async () => {
    process.env.FH_RUNNER_HEARTBEAT_INTERVAL_MS = "15000";
    let jobDetailReads = 0;
    const statusBodies: any[] = [];
    const analysis = createDeferred<any>();
    vi.mocked(runClaimBoundaryAnalysis).mockImplementation(() => analysis.promise);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
        return new Response(JSON.stringify({
          jobs: [],
          pagination: { totalPages: 1 },
        }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/jobs/job-heartbeat")) {
        jobDetailReads++;
        if (jobDetailReads === 1) {
          return new Response(JSON.stringify({
            jobId: "job-heartbeat",
            status: "QUEUED",
            pipelineVariant: "claimboundary",
          }), { status: 200 });
        }

        return new Response(JSON.stringify({
          jobId: "job-heartbeat",
          status: "RUNNING",
          pipelineVariant: "claimboundary",
          inputType: "text",
          inputValue: "queued report input",
        }), { status: 200 });
      }

      if (method === "POST" && url.endsWith("/internal/v1/jobs/job-heartbeat/claim-runner")) {
        return new Response(JSON.stringify({
          claimed: true,
          reason: "claimed",
          status: "RUNNING",
          runningCount: 1,
        }), { status: 200 });
      }

      if (method === "PUT" && url.includes("/internal/v1/jobs/job-heartbeat/status")) {
        statusBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (method === "PUT" && url.includes("/internal/v1/jobs/job-heartbeat/result")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    (globalThis as any).__fhRunnerQueueState = {
      runningCount: 0,
      queue: [{ jobId: "job-heartbeat", enqueuedAt: Date.now() }],
      runningJobIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
      watchdogTimer: null,
    };
    (globalThis as any).__fhDraftQueueState = {
      runningCount: 0,
      queue: [],
      runningDraftIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
    };

    const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
    await drainRunnerQueue();
    await flushMicrotasks();

    expect(statusBodies).toContainEqual(expect.objectContaining({
      status: "RUNNING",
      progress: 5,
      message: "Preparing input (pipeline: claimboundary)",
    }));

    await vi.advanceTimersByTimeAsync(15_000);
    await flushMicrotasks(12);

    expect(statusBodies).toContainEqual(expect.objectContaining({
      status: "RUNNING",
      progress: 5,
      message: expect.stringContaining("Still running"),
    }));

    analysis.resolve({ resultJson: { meta: {} } });
    await flushMicrotasks(20);
  });

  it("fails a locally tracked stale draft preparation", async () => {
    vi.setSystemTime(new Date("2026-04-27T08:00:00.000Z"));
    const failedBodies: any[] = [];
    let liveDraftReads = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/recoverable")) {
        return new Response(JSON.stringify({
          drafts: [{
            draftId: "draft-stale",
            status: "PREPARING",
            createdUtc: "2026-04-27T07:00:00.000Z",
            updatedUtc: "2026-04-27T07:40:00.000Z",
          }],
        }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/claim-selection-drafts/draft-stale")) {
        liveDraftReads++;
        return new Response(JSON.stringify({
          draftId: "draft-stale",
          status: "PREPARING",
          createdUtc: "2026-04-27T07:00:00.000Z",
          updatedUtc: "2026-04-27T07:40:00.000Z",
        }), { status: 200 });
      }

      if (method === "PUT" && url.endsWith("/internal/v1/claim-selection-drafts/draft-stale/failed")) {
        failedBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/idle-auto-proceed-due")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    (globalThis as any).__fhDraftQueueState = {
      runningCount: 1,
      queue: [],
      runningDraftIds: new Set<string>(["draft-stale"]),
      isDraining: false,
      drainRequested: false,
    };

    const { drainDraftQueue } = await import("@/lib/internal-runner-queue");
    await drainDraftQueue();
    await flushMicrotasks();

    const ds = (globalThis as any).__fhDraftQueueState;

    expect(failedBodies).toEqual([
      expect.objectContaining({
        errorCode: "stage1_failed",
        errorMessage: expect.stringContaining("Stale draft preparation"),
      }),
    ]);
    expect(liveDraftReads).toBe(1);
    expect(ds.runningCount).toBe(0);
    expect(ds.runningDraftIds.has("draft-stale")).toBe(false);
  });

  it("skips stale draft failure when the live draft changed after the recovery snapshot", async () => {
    vi.setSystemTime(new Date("2026-04-27T08:00:00.000Z"));
    const failedBodies: any[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/recoverable")) {
        return new Response(JSON.stringify({
          drafts: [{
            draftId: "draft-active",
            status: "PREPARING",
            createdUtc: "2026-04-27T07:00:00.000Z",
            updatedUtc: "2026-04-27T07:40:00.000Z",
          }],
        }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/claim-selection-drafts/draft-active")) {
        return new Response(JSON.stringify({
          draftId: "draft-active",
          status: "PREPARING",
          createdUtc: "2026-04-27T07:00:00.000Z",
          updatedUtc: "2026-04-27T07:59:00.000Z",
        }), { status: 200 });
      }

      if (method === "PUT" && url.endsWith("/internal/v1/claim-selection-drafts/draft-active/failed")) {
        failedBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/idle-auto-proceed-due")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.spyOn(console, "info").mockImplementation(() => {});

    (globalThis as any).__fhDraftQueueState = {
      runningCount: 1,
      queue: [],
      runningDraftIds: new Set<string>(["draft-active"]),
      isDraining: false,
      drainRequested: false,
    };

    const { drainDraftQueue } = await import("@/lib/internal-runner-queue");
    await drainDraftQueue();
    await flushMicrotasks();

    const ds = (globalThis as any).__fhDraftQueueState;

    expect(failedBodies).toEqual([]);
    expect(ds.runningCount).toBe(1);
    expect(ds.runningDraftIds.has("draft-active")).toBe(true);
  });

  it("does not reset an orphaned preparing draft when the live draft changed after the recovery snapshot", async () => {
    vi.setSystemTime(new Date("2026-04-27T08:00:00.000Z"));
    const statusBodies: any[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/recoverable")) {
        return new Response(JSON.stringify({
          drafts: [{
            draftId: "draft-orphan",
            status: "PREPARING",
            createdUtc: "2026-04-27T07:00:00.000Z",
            updatedUtc: "2026-04-27T07:40:00.000Z",
          }],
        }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/claim-selection-drafts/draft-orphan")) {
        return new Response(JSON.stringify({
          draftId: "draft-orphan",
          status: "PREPARING",
          createdUtc: "2026-04-27T07:00:00.000Z",
          updatedUtc: "2026-04-27T07:59:00.000Z",
        }), { status: 200 });
      }

      if (method === "PUT" && url.endsWith("/internal/v1/claim-selection-drafts/draft-orphan/status")) {
        statusBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/idle-auto-proceed-due")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.spyOn(console, "info").mockImplementation(() => {});

    (globalThis as any).__fhDraftQueueState = {
      runningCount: 0,
      queue: [],
      runningDraftIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
    };

    const { drainDraftQueue } = await import("@/lib/internal-runner-queue");
    await drainDraftQueue();
    await flushMicrotasks();

    const ds = (globalThis as any).__fhDraftQueueState;

    expect(statusBodies).toEqual([]);
    expect(ds.queue).toEqual([]);
  });

  it("emits a heartbeat when draft preparation has no recent preparation event", async () => {
    process.env.FH_RUNNER_HEARTBEAT_INTERVAL_MS = "15000";
    const statusBodies: any[] = [];
    vi.mocked(prepareStage1Snapshot).mockImplementation(() => new Promise(() => {}));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/recoverable")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/internal/v1/claim-selection-drafts/idle-auto-proceed-due")) {
        return new Response(JSON.stringify({ drafts: [] }), { status: 200 });
      }

      if (method === "GET" && url.endsWith("/v1/claim-selection-drafts/draft-heartbeat")) {
        return new Response(JSON.stringify({
          draftId: "draft-heartbeat",
          status: "QUEUED",
          activeInputType: "text",
          activeInputValue: "queued session input",
          selectionMode: "interactive",
        }), { status: 200 });
      }

      if (method === "PUT" && url.includes("/internal/v1/claim-selection-drafts/draft-heartbeat/status")) {
        statusBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    (globalThis as any).__fhDraftQueueState = {
      runningCount: 0,
      queue: [{ draftId: "draft-heartbeat", enqueuedAt: Date.now() }],
      runningDraftIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
    };

    const { drainDraftQueue } = await import("@/lib/internal-runner-queue");
    await drainDraftQueue();
    await flushMicrotasks();

    expect(statusBodies).toContainEqual(expect.objectContaining({
      status: "PREPARING",
      progress: 5,
      eventMessage: "Draft preparation started",
    }));

    await vi.advanceTimersByTimeAsync(15_000);
    await flushMicrotasks(12);

    expect(statusBodies).toContainEqual(expect.objectContaining({
      status: "PREPARING",
      progress: 5,
      eventMessage: expect.stringContaining("Still preparing"),
    }));
  });
});
