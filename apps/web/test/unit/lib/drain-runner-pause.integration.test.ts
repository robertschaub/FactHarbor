/**
 * drainRunnerQueue Pause-Check Integration Tests
 *
 * Tests that drainRunnerQueue respects the system paused state and
 * does not process queued jobs when the system is paused.
 *
 * Since drainRunnerQueue has side effects (HTTP calls, starting background jobs),
 * we test the module's behavior by verifying the pause guard at the top of
 * the function via the provider-health integration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  pauseSystem,
  resumeSystem,
  isSystemPaused,
  recordProviderFailure,
} from "@/lib/provider-health";
import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";
import { isJobAborted } from "@/lib/job-abort";

vi.mock("@/lib/analyzer/claimboundary-pipeline", () => ({
  runClaimBoundaryAnalysis: vi.fn(async () => ({ resultJson: { meta: {} } })),
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

// Reset globalThis state between tests
beforeEach(() => {
  (globalThis as any).__fhProviderHealthState = undefined;
  (globalThis as any).__fhRunnerQueueState = undefined;
});

describe("drainRunnerQueue pause integration", () => {
  describe("isSystemPaused guard", () => {
    it("isSystemPaused returns true after pauseSystem()", () => {
      expect(isSystemPaused()).toBe(false);
      pauseSystem("Provider down");
      expect(isSystemPaused()).toBe(true);
    });

    it("isSystemPaused returns false after resumeSystem()", () => {
      pauseSystem("Provider down");
      expect(isSystemPaused()).toBe(true);
      resumeSystem();
      expect(isSystemPaused()).toBe(false);
    });

    it("auto-pause via circuit breaker leaves isSystemPaused true", () => {
      // Simulate the exact flow in runJobBackground's catch block
      const { circuitOpened } = recordProviderFailure("search", "HTTP 429", 1);
      expect(circuitOpened).toBe(true);
      pauseSystem("search provider failed: HTTP 429");

      expect(isSystemPaused()).toBe(true);
    });
  });

  describe("queue state preservation during pause", () => {
    it("queued jobs remain in the queue when system is paused", () => {
      // Simulate the runner queue having pending items
      const qs = {
        runningCount: 0,
        queue: [
          { jobId: "job-1", enqueuedAt: Date.now() },
          { jobId: "job-2", enqueuedAt: Date.now() },
        ],
        runningJobIds: new Set<string>(),
      };
      (globalThis as any).__fhRunnerQueueState = qs;

      // Pause the system
      pauseSystem("Provider down");

      // Queue should be untouched
      expect(qs.queue).toHaveLength(2);
      expect(qs.queue[0].jobId).toBe("job-1");
      expect(qs.queue[1].jobId).toBe("job-2");
      expect(qs.runningCount).toBe(0);
    });

    it("queued jobs are still available after resume", () => {
      const qs = {
        runningCount: 0,
        queue: [
          { jobId: "job-1", enqueuedAt: Date.now() },
          { jobId: "job-2", enqueuedAt: Date.now() },
        ],
        runningJobIds: new Set<string>(),
      };
      (globalThis as any).__fhRunnerQueueState = qs;

      pauseSystem("Provider down");
      resumeSystem();

      // Queue should still have both jobs
      expect(qs.queue).toHaveLength(2);
      expect(isSystemPaused()).toBe(false);
    });
  });

  describe("drainRunnerQueue function behavior with pause", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      vi.useFakeTimers();
      // Set up required env vars for drainRunnerQueue
      process.env.FH_API_BASE_URL = "http://localhost:3001";
      vi.mocked(runClaimBoundaryAnalysis).mockClear();
      vi.resetModules();
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

    it("drainRunnerQueue returns early when system is paused (network) and probe fails", async () => {
      // Mock fetch: the auto-resume probe (HEAD to anthropic) should fail (still offline),
      // so the system stays paused and no job-processing API calls are made.
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("api.anthropic.com")) {
          throw new Error("getaddrinfo ENOTFOUND api.anthropic.com");
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      // Add items to the queue
      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId: "job-1", enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
      };

      // Pause with a network-error reason (triggers auto-resume probe)
      pauseSystem("LLM provider failed during Stage 4 verdict: provider_outage — getaddrinfo ENOTFOUND api.anthropic.com");

      // Import and call drainRunnerQueue
      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await drainRunnerQueue();

      // Probe fetch was called (once for the connectivity check), but no job-processing fetches
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("api.anthropic.com"),
        expect.objectContaining({ method: "HEAD" }),
      );

      // Should have logged the pause warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("System is PAUSED"),
      );

      // Queue should still have the job
      const qs = (globalThis as any).__fhRunnerQueueState;
      expect(qs.queue).toHaveLength(1);
      expect(qs.queue[0].jobId).toBe("job-1");

      // System should still be paused
      expect(isSystemPaused()).toBe(true);

      consoleSpy.mockRestore();
    });

    it("drainRunnerQueue auto-resumes when network probe succeeds", async () => {
      // Mock fetch: probe succeeds (connectivity restored), so system resumes
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("api.anthropic.com")) {
          return new Response("", { status: 404 }); // Any HTTP response = reachable
        }
        return new Response(JSON.stringify({ status: "QUEUED" }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId: "job-1", enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
      };

      // Pause with a network-error reason
      pauseSystem("LLM provider failed during Stage 4 verdict: provider_outage — fetch failed");
      expect(isSystemPaused()).toBe(true);

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      // System should have been auto-resumed by the probe
      expect(isSystemPaused()).toBe(false);

      // Should have proceeded to process jobs (more fetches after the probe)
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("drainRunnerQueue does NOT auto-resume for non-network pauses (auth/rate-limit)", async () => {
      // Even if Anthropic is reachable, an auth/rate-limit pause should NOT auto-clear
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status: 200 }),
      );

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId: "job-1", enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
      };

      // Pause with a rate-limit reason (NOT a network error)
      pauseSystem("llm provider failed rate_limit: Too many requests");
      expect(isSystemPaused()).toBe(true);

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();

      // Probe should NOT have been called (non-network pause)
      expect(fetchSpy).not.toHaveBeenCalled();

      // System should still be paused
      expect(isSystemPaused()).toBe(true);

      consoleSpy.mockRestore();
    });

    it("drainRunnerQueue processes jobs when system is NOT paused", async () => {
      // Mock fetch — return a unique response for each call.
      // drainRunnerQueue calls fetch for the job status check, then
      // runJobBackground fires in the background and also calls fetch.
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        new Response(JSON.stringify({ status: "QUEUED" }), { status: 200 }),
      );
      // Suppress console output from background job activity
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      // Add items to the queue
      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId: "job-1", enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
      };

      // System is NOT paused
      expect(isSystemPaused()).toBe(false);

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      // Should have made API calls (job processing started — past the pause check)
      expect(globalThis.fetch).toHaveBeenCalled();

      // Should NOT have logged the pause warning
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining("System is PAUSED"),
      );
    });

    it("drainRunnerQueue resumes processing after system is un-paused", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        new Response(JSON.stringify({ status: "QUEUED" }), { status: 200 }),
      );
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId: "job-1", enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
      };

      // Pause and then resume
      pauseSystem("Provider down");
      resumeSystem();

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      // Should process jobs (not paused anymore)
      expect(globalThis.fetch).toHaveBeenCalled();

      // Should NOT have logged the pause warning
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining("System is PAUSED"),
      );
    });

    it("uses the admin key for internal job reads so hidden queued jobs can run", async () => {
      process.env.FH_ADMIN_KEY = "admin-secret";
      const hiddenJobId = "hidden-job-1";
      const getJobReads: Array<{ url: string; adminHeader: string | null }> = [];
      const putPayloads: Array<{ url: string; body: Record<string, unknown> }> = [];
      let detailReadCount = 0;

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        const headers = new Headers(init?.headers as HeadersInit | undefined);
        const adminHeader = headers.get("x-admin-key");

        if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
          getJobReads.push({ url, adminHeader });
          if (adminHeader !== "admin-secret") {
            return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
          }
          return new Response(JSON.stringify({
            jobs: [],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${hiddenJobId}`)) {
          getJobReads.push({ url, adminHeader });
          if (adminHeader !== "admin-secret") {
            return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
          }

          detailReadCount++;
          return new Response(JSON.stringify({
            jobId: hiddenJobId,
            status: detailReadCount === 1 ? "QUEUED" : "RUNNING",
            updatedUtc: new Date().toISOString(),
            pipelineVariant: "claimboundary",
            inputType: "text",
            inputValue: "hidden job input",
          }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${hiddenJobId}/status`)) {
          putPayloads.push({
            url,
            body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${hiddenJobId}/result`)) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId: hiddenJobId, enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
        isDraining: false,
        drainRequested: false,
        watchdogTimer: null,
      };

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      // Enough turns for the runner's awaited status writes (and their JSON bodies) before the pipeline starts.
      await flushMicrotasks(60);

      expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: hiddenJobId }),
      );
      expect(putPayloads.some((p) => p.body.status === "RUNNING")).toBe(true);
      expect(getJobReads.length).toBeGreaterThan(0);
      for (const read of getJobReads) {
        expect(read.adminHeader).toBe("admin-secret");
      }
    });

    it("re-queues orphaned RUNNING jobs after restart and picks them up in the same drain cycle", async () => {
      const orphanJobId = "job-orphan-1";
      const snapshotUpdatedUtc = new Date(Date.now() - 60_000).toISOString();
      let jobDetailReads = 0;
      vi.mocked(runClaimBoundaryAnalysis).mockImplementation(
        () => new Promise(() => {}),
      );

      const putPayloads: Array<{ url: string; body: Record<string, unknown> }> = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
          return new Response(JSON.stringify({
            jobs: [{
              jobId: orphanJobId,
              status: "RUNNING",
              updatedUtc: snapshotUpdatedUtc,
              progress: 42,
              pipelineVariant: "claimboundary",
            }],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${orphanJobId}`)) {
          jobDetailReads++;
          if (jobDetailReads === 1) {
            return new Response(JSON.stringify({
              jobId: orphanJobId,
              status: "RUNNING",
              updatedUtc: snapshotUpdatedUtc,
              pipelineVariant: "claimboundary",
            }), { status: 200 });
          }
          return new Response(JSON.stringify({
            jobId: orphanJobId,
            status: "QUEUED",
            updatedUtc: snapshotUpdatedUtc,
            pipelineVariant: "claimboundary",
            inputType: "text",
            inputValue: "test input",
          }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${orphanJobId}/status`)) {
          putPayloads.push({
            url,
            body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [],
        runningJobIds: new Set<string>(),
        isDraining: false,
        drainRequested: false,
        watchdogTimer: null,
      };

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      const qs = (globalThis as any).__fhRunnerQueueState;
      expect(putPayloads.some((p) => p.body.status === "QUEUED")).toBe(true);
      expect(putPayloads.some((p) => p.body.status === "FAILED")).toBe(false);
      expect(qs.runningJobIds.has(orphanJobId)).toBe(true);
      expect(qs.runningCount).toBe(1);
      expect(qs.queue).toHaveLength(0);
    });

    it("does not re-queue a RUNNING snapshot when the live job already completed", async () => {
      const jobId = "job-finished-1";
      const snapshotUpdatedUtc = new Date(Date.now() - 60_000).toISOString();
      const putPayloads: Array<{ url: string; body: Record<string, unknown> }> = [];

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
          return new Response(JSON.stringify({
            jobs: [{
              jobId,
              status: "RUNNING",
              updatedUtc: snapshotUpdatedUtc,
              progress: 90,
              pipelineVariant: "claimboundary",
            }],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${jobId}`)) {
          return new Response(JSON.stringify({
            jobId,
            status: "SUCCEEDED",
            updatedUtc: new Date().toISOString(),
            pipelineVariant: "claimboundary",
          }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${jobId}/status`)) {
          putPayloads.push({
            url,
            body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "info").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [],
        runningJobIds: new Set<string>(),
        isDraining: false,
        drainRequested: false,
        watchdogTimer: null,
      };

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      const qs = (globalThis as any).__fhRunnerQueueState;
      expect(putPayloads).toHaveLength(0);
      expect(vi.mocked(runClaimBoundaryAnalysis)).not.toHaveBeenCalled();
      expect(qs.runningJobIds.has(jobId)).toBe(false);
      expect(qs.runningCount).toBe(0);
      expect(qs.queue).toHaveLength(0);
    });

    it("does not re-queue a RUNNING snapshot when live updatedUtc has advanced", async () => {
      const jobId = "job-progressed-1";
      const snapshotUpdatedUtc = new Date(Date.now() - 60_000).toISOString();
      const liveUpdatedUtc = new Date().toISOString();
      const putPayloads: Array<{ url: string; body: Record<string, unknown> }> = [];

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
          return new Response(JSON.stringify({
            jobs: [{
              jobId,
              status: "RUNNING",
              updatedUtc: snapshotUpdatedUtc,
              progress: 45,
              pipelineVariant: "claimboundary",
            }],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${jobId}`)) {
          return new Response(JSON.stringify({
            jobId,
            status: "RUNNING",
            updatedUtc: liveUpdatedUtc,
            pipelineVariant: "claimboundary",
            inputType: "text",
            inputValue: "still running elsewhere",
          }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${jobId}/status`)) {
          putPayloads.push({
            url,
            body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "info").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [],
        runningJobIds: new Set<string>(),
        isDraining: false,
        drainRequested: false,
        watchdogTimer: null,
      };

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      const qs = (globalThis as any).__fhRunnerQueueState;
      expect(putPayloads).toHaveLength(0);
      expect(vi.mocked(runClaimBoundaryAnalysis)).not.toHaveBeenCalled();
      expect(qs.runningJobIds.has(jobId)).toBe(false);
      expect(qs.runningCount).toBe(1);
      expect(qs.queue).toHaveLength(0);
    });

    describe("stale-job recovery and slot accounting", () => {
      type ListedJob = { jobId: string; status: string; updatedUtc: string; progress?: number };

      const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

      // A queued job that the drain would start as soon as a slot is free.
      const startableJob = (jobId: string) => ({
        jobId,
        status: "QUEUED",
        updatedUtc: minutesAgo(0),
        pipelineVariant: "claimboundary",
        inputType: "text",
        inputValue: "input",
      });

      // Serves the paginated job list and per-job live reads (both read live on every call, so
      // tests can change them mid-test); records status PUTs and answers them like the API.
      function mockApi(
        listedJobs: ListedJob[],
        liveJobs: Record<string, Record<string, unknown>>,
        statusPutResponse: (body: Record<string, unknown>) => Record<string, unknown> = () => ({ ok: true, applied: true }),
      ) {
        const statusPuts: Array<{ jobId: string; body: Record<string, unknown> }> = [];
        vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
          const url = String(input);
          const method = init?.method ?? "GET";
          if (method === "GET" && url.includes("/v1/jobs?page=")) {
            return new Response(JSON.stringify({ jobs: listedJobs, pagination: { totalPages: 1 } }), { status: 200 });
          }
          const detail = /\/v1\/jobs\/([^/?]+)$/.exec(url);
          if (method === "GET" && detail) {
            return new Response(JSON.stringify(liveJobs[detail[1]] ?? {}), { status: 200 });
          }
          const statusPut = /\/internal\/v1\/jobs\/([^/]+)\/status$/.exec(url);
          if (method === "PUT" && statusPut) {
            const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
            statusPuts.push({ jobId: statusPut[1], body });
            return new Response(JSON.stringify(statusPutResponse(body)), { status: 200 });
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        });
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "info").mockImplementation(() => {});
        return statusPuts;
      }

      function seedQueueState(runningJobIds: string[], queuedJobIds: string[] = []) {
        (globalThis as any).__fhRunnerQueueState = {
          runningCount: runningJobIds.length,
          queue: queuedJobIds.map((jobId) => ({ jobId, enqueuedAt: Date.now() })),
          runningJobIds: new Set<string>(runningJobIds),
          isDraining: false,
          drainRequested: false,
          watchdogTimer: null,
        };
      }

      async function drainOnce() {
        const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
        await drainRunnerQueue();
        await flushMicrotasks(40);
        return (globalThis as any).__fhRunnerQueueState;
      }

      beforeEach(() => {
        (globalThis as any).__fhAbortSignals = undefined;
        process.env.FH_RUNNER_MAX_CONCURRENCY = "1";
      });

      it("fails a stale local job, aborts its pipeline and keeps its slot until the pipeline exits", async () => {
        const staleJobId = "job-stale-1";
        const queuedJobId = "job-queued-1";
        const updatedUtc = minutesAgo(31);
        const statusPuts = mockApi(
          [{ jobId: staleJobId, status: "RUNNING", updatedUtc, progress: 60 }],
          {
            [staleJobId]: { jobId: staleJobId, status: "RUNNING", updatedUtc },
            [queuedJobId]: startableJob(queuedJobId),
          },
        );
        seedQueueState([staleJobId], [queuedJobId]);

        const qs = await drainOnce();

        expect(statusPuts).toEqual([
          {
            jobId: staleJobId,
            body: expect.objectContaining({
              status: "FAILED",
              progress: 60,
              message: expect.stringContaining("Stale job (no progress update for 31 minutes)"),
            }),
          },
        ]);
        expect(isJobAborted(staleJobId)).toBe(true);
        expect(qs.runningJobIds.has(staleJobId)).toBe(true);
        expect(qs.runningCount).toBe(1);
        // The stale pipeline still occupies the only slot, so the queued job must wait.
        expect(vi.mocked(runClaimBoundaryAnalysis)).not.toHaveBeenCalled();
        expect(qs.queue.map((item: { jobId: string }) => item.jobId)).toEqual([queuedJobId]);
      });

      it("does not fail a stale-looking local job whose live record advanced after the list snapshot", async () => {
        const jobId = "job-progressed-local-1";
        const statusPuts = mockApi(
          [{ jobId, status: "RUNNING", updatedUtc: minutesAgo(31), progress: 60 }],
          { [jobId]: { jobId, status: "RUNNING", updatedUtc: minutesAgo(0) } },
        );
        seedQueueState([jobId]);

        const qs = await drainOnce();

        expect(statusPuts).toHaveLength(0);
        expect(isJobAborted(jobId)).toBe(false);
        expect(qs.runningJobIds.has(jobId)).toBe(true);
        expect(qs.runningCount).toBe(1);
      });

      it("leaves a local job alone while its silence is below the stale threshold", async () => {
        // A single slow LLM call has kept live pipelines silent for ~15 minutes.
        const jobId = "job-slow-llm-call-1";
        const updatedUtc = minutesAgo(20);
        const statusPuts = mockApi(
          [{ jobId, status: "RUNNING", updatedUtc, progress: 60 }],
          { [jobId]: { jobId, status: "RUNNING", updatedUtc } },
        );
        seedQueueState([jobId]);

        const qs = await drainOnce();

        expect(statusPuts).toHaveLength(0);
        expect(isJobAborted(jobId)).toBe(false);
        expect(qs.runningCount).toBe(1);
      });

      it("keeps the slot of a local job that is already terminal in the DB while its pipeline still runs", async () => {
        // A user cancel sets CANCELLED immediately; the pipeline stops only at its next checkpoint.
        const cancelledJobId = "job-cancelled-1";
        const queuedJobId = "job-queued-2";
        const statusPuts = mockApi(
          [{ jobId: cancelledJobId, status: "CANCELLED", updatedUtc: minutesAgo(1), progress: 40 }],
          { [queuedJobId]: startableJob(queuedJobId) },
        );
        seedQueueState([cancelledJobId], [queuedJobId]);

        const qs = await drainOnce();

        expect(statusPuts).toHaveLength(0);
        expect(qs.runningCount).toBe(1);
        expect(vi.mocked(runClaimBoundaryAnalysis)).not.toHaveBeenCalled();
        expect(qs.queue.map((item: { jobId: string }) => item.jobId)).toEqual([queuedJobId]);
      });

      it("releases the slot of a pipeline still running a full threshold after its job became terminal", async () => {
        // The abort only lands at a stage checkpoint; an await that never settles must not
        // hold the slot until the next restart.
        const hungJobId = "job-hung-after-cancel-1";
        const queuedJobId = "job-queued-3";
        mockApi(
          [{ jobId: hungJobId, status: "CANCELLED", updatedUtc: minutesAgo(31), progress: 40 }],
          { [queuedJobId]: startableJob(queuedJobId) },
        );
        seedQueueState([hungJobId], [queuedJobId]);

        const qs = await drainOnce();

        expect(qs.runningJobIds.has(hungJobId)).toBe(false);
        expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledWith(
          expect.objectContaining({ jobId: queuedJobId }),
        );
      });

      it("does not re-queue a stale-failed job whose pipeline flips it back to RUNNING", async () => {
        // Regression: the watchdog used to untrack the job, so its next RUNNING write made it look
        // orphaned; it was re-queued and run again in parallel (one job started five times).
        // The flip is simulated here, as an API without the terminal-status guard would allow it.
        const jobId = "job-stale-rerun-1";
        const silentSince = minutesAgo(31);
        const listedJobs: ListedJob[] = [{ jobId, status: "RUNNING", updatedUtc: silentSince, progress: 60 }];
        const liveJobs: Record<string, Record<string, unknown>> = {
          [jobId]: { jobId, status: "RUNNING", updatedUtc: silentSince },
        };
        const statusPuts = mockApi(listedJobs, liveJobs);
        seedQueueState([jobId]);
        await drainOnce();
        expect(isJobAborted(jobId)).toBe(true);

        const flippedBackAt = minutesAgo(0);
        listedJobs[0] = { jobId, status: "RUNNING", updatedUtc: flippedBackAt, progress: 65 };
        liveJobs[jobId] = { ...liveJobs[jobId], updatedUtc: flippedBackAt };
        const qs = await drainOnce();

        expect(statusPuts.filter((p) => p.body.status === "QUEUED")).toHaveLength(0);
        expect(qs.runningJobIds.has(jobId)).toBe(true);
      });

      it("hands the slot to the next job once the aborted pipeline exits, keeping the stale reason", async () => {
        const staleJobId = "job-stale-cycle-1";
        const nextJobId = "job-next-1";
        const listedJobs: ListedJob[] = [];
        const liveJobs: Record<string, Record<string, unknown>> = {
          [staleJobId]: startableJob(staleJobId),
          [nextJobId]: startableJob(nextJobId),
        };
        const statusPuts = mockApi(listedJobs, liveJobs);
        let reachAbortCheckpoint!: (error: Error) => void;
        vi.mocked(runClaimBoundaryAnalysis)
          .mockImplementationOnce(() => new Promise<never>((_, reject) => { reachAbortCheckpoint = reject; }))
          .mockImplementationOnce(() => new Promise<never>(() => {}));
        seedQueueState([], [staleJobId]);

        // The job starts and occupies the only slot.
        await drainOnce();
        expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(1);

        // It then goes silent past the threshold while another job waits.
        const silentSince = minutesAgo(31);
        listedJobs.push({ jobId: staleJobId, status: "RUNNING", updatedUtc: silentSince, progress: 60 });
        liveJobs[staleJobId] = { ...liveJobs[staleJobId], status: "RUNNING", updatedUtc: silentSince };
        (globalThis as any).__fhRunnerQueueState.queue.push({ jobId: nextJobId, enqueuedAt: Date.now() });
        await drainOnce();
        expect(isJobAborted(staleJobId)).toBe(true);
        expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(1);

        // The pipeline reaches its abort checkpoint; the API now has the job FAILED.
        listedJobs.length = 0;
        liveJobs[staleJobId] = { ...liveJobs[staleJobId], status: "FAILED" };
        reachAbortCheckpoint(new Error(`Job ${staleJobId} was cancelled`));
        await flushMicrotasks(60);

        const failedWrites = statusPuts.filter((p) => p.jobId === staleJobId && p.body.status === "FAILED");
        expect(failedWrites).toEqual([
          { jobId: staleJobId, body: expect.objectContaining({ message: expect.stringContaining("Stale job") }) },
        ]);
        expect(isJobAborted(staleJobId)).toBe(false);
        expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenCalledTimes(2);
        expect(vi.mocked(runClaimBoundaryAnalysis)).toHaveBeenLastCalledWith(
          expect.objectContaining({ jobId: nextJobId }),
        );
      });

      it("aborts its own pipeline once the API refuses a progress update, then stops reporting", async () => {
        // Covers a cancel whose best-effort abort request never reached this process.
        const jobId = "job-cancelled-elsewhere-1";
        let refuseProgress = false;
        const statusPuts = mockApi([], { [jobId]: startableJob(jobId) }, (body) =>
          refuseProgress && body.status === "RUNNING" ? { ok: true, applied: false } : { ok: true, applied: true },
        );
        let reportProgress!: (message: string) => unknown;
        vi.mocked(runClaimBoundaryAnalysis).mockImplementationOnce((input) => {
          reportProgress = (message) => input.onEvent?.(message, 50);
          return new Promise<never>(() => {});
        });
        seedQueueState([], [jobId]);
        await drainOnce();

        refuseProgress = true;
        await reportProgress("Researching evidence...");
        expect(isJobAborted(jobId)).toBe(true);

        const putsBefore = statusPuts.length;
        await reportProgress("Clustering evidence...");
        expect(statusPuts).toHaveLength(putsBefore);
      });

      describe("late completion", () => {
        // The pipeline finishes; what the job's status is at that moment decides the outcome.
        async function completeJobWhileStatusIs(statusAtCompletion: string) {
          const jobId = `job-completes-while-${statusAtCompletion.toLowerCase()}`;
          const liveJobs: Record<string, Record<string, unknown>> = { [jobId]: startableJob(jobId) };
          const statusPuts = mockApi([], liveJobs);
          let finishPipeline!: () => void;
          vi.mocked(runClaimBoundaryAnalysis).mockImplementationOnce(
            () => new Promise<{ resultJson: any; reportMarkdown: string }>((resolve) => {
              finishPipeline = () => resolve({ resultJson: { meta: {} }, reportMarkdown: "" });
            }),
          );
          seedQueueState([], [jobId]);
          await drainOnce();

          liveJobs[jobId] = { ...liveJobs[jobId], status: statusAtCompletion };
          finishPipeline();
          await flushMicrotasks(60);
          return statusPuts.filter((p) => p.jobId === jobId).map((p) => p.body.status);
        }

        it("completes a job that the API marked INTERRUPTED while its pipeline kept running", async () => {
          expect(await completeJobWhileStatusIs("INTERRUPTED")).toContain("SUCCEEDED");
        });

        it("does not complete a job that was cancelled while its pipeline finished", async () => {
          expect(await completeJobWhileStatusIs("CANCELLED")).not.toContain("SUCCEEDED");
        });

        it("still records a genuine pipeline failure of an active job with its stack trace", async () => {
          const jobId = "job-genuine-failure-1";
          const statusPuts = mockApi([], { [jobId]: startableJob(jobId) });
          vi.mocked(runClaimBoundaryAnalysis).mockImplementationOnce(async () => {
            throw new Error("Stage 3 exploded");
          });
          seedQueueState([], [jobId]);

          await drainOnce();
          await flushMicrotasks(60);

          const failedWrites = statusPuts.filter((p) => p.jobId === jobId && p.body.status === "FAILED");
          expect(failedWrites.map((p) => p.body.message)).toEqual([
            "Stage 3 exploded",
            expect.stringContaining("Stack (truncated):"),
          ]);
        });
      });

      it("does not start the pipeline when the API refuses the start", async () => {
        // The job was cancelled between the drain's QUEUED check and the runner's first write.
        const jobId = "job-cancelled-before-start-1";
        mockApi([], { [jobId]: startableJob(jobId) }, (body) =>
          body.message === "Runner started" ? { ok: true, applied: false } : { ok: true, applied: true },
        );
        seedQueueState([], [jobId]);

        const qs = await drainOnce();

        expect(vi.mocked(runClaimBoundaryAnalysis)).not.toHaveBeenCalled();
        expect(qs.runningJobIds.has(jobId)).toBe(false);
        expect(qs.runningCount).toBe(0);
      });
    });
  });
});
