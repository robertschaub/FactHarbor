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

    it("sends X-Admin-Key on runner-owned job list and detail reads", async () => {
      const jobId = "job-hidden-queued-1";
      const observedHeaders: Array<{ url: string; adminKey: string | null }> = [];
      let detailReads = 0;
      process.env.FH_ADMIN_KEY = "runner-admin-key";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        const headers = new Headers(init?.headers as HeadersInit | undefined);

        if (method === "GET" && url.includes("/v1/jobs")) {
          observedHeaders.push({
            url,
            adminKey: headers.get("X-Admin-Key"),
          });
        }

        if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
          return new Response(JSON.stringify({
            jobs: [],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${jobId}`)) {
          detailReads++;
          if (detailReads === 1) {
            return new Response(JSON.stringify({
              jobId,
              status: "QUEUED",
              pipelineVariant: "claimboundary",
            }), { status: 200 });
          }

          if (detailReads === 2) {
            return new Response(JSON.stringify({
              jobId,
              status: "RUNNING",
              pipelineVariant: "claimboundary",
              inputType: "text",
              inputValue: "hidden job payload",
            }), { status: 200 });
          }

          return new Response(JSON.stringify({
            jobId,
            status: "RUNNING",
            pipelineVariant: "claimboundary",
          }), { status: 200 });
        }

        if (method === "POST" && url.endsWith(`/internal/v1/jobs/${jobId}/claim-runner`)) {
          return new Response(JSON.stringify({
            claimed: true,
            reason: "claimed",
            status: "RUNNING",
            runningCount: 1,
          }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${jobId}/status`)) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (method === "PUT" && url.includes(`/internal/v1/jobs/${jobId}/result`)) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId, enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
        isDraining: false,
        drainRequested: false,
        watchdogTimer: null,
      };

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      expect(observedHeaders.length).toBeGreaterThanOrEqual(3);
      expect(observedHeaders.every((entry) => entry.adminKey === "runner-admin-key")).toBe(true);
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

        if (method === "POST" && url.endsWith(`/internal/v1/jobs/${orphanJobId}/claim-runner`)) {
          return new Response(JSON.stringify({
            claimed: true,
            reason: "claimed",
            status: "RUNNING",
            runningCount: 1,
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

    it("keeps a queued job pending when the API runner claim reports full capacity", async () => {
      const jobId = "job-capacity-full-1";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/v1/jobs?page=1&pageSize=200")) {
          return new Response(JSON.stringify({
            jobs: [],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${jobId}`)) {
          return new Response(JSON.stringify({
            jobId,
            status: "QUEUED",
            pipelineVariant: "claimboundary",
          }), { status: 200 });
        }

        if (method === "POST" && url.endsWith(`/internal/v1/jobs/${jobId}/claim-runner`)) {
          return new Response(JSON.stringify({
            claimed: false,
            reason: "capacity_full",
            status: "QUEUED",
            runningCount: 1,
          }), { status: 200 });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      (globalThis as any).__fhRunnerQueueState = {
        runningCount: 0,
        queue: [{ jobId, enqueuedAt: Date.now() }],
        runningJobIds: new Set<string>(),
        isDraining: false,
        drainRequested: false,
        watchdogTimer: null,
      };

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      const qs = (globalThis as any).__fhRunnerQueueState;
      expect(vi.mocked(runClaimBoundaryAnalysis)).not.toHaveBeenCalled();
      expect(qs.runningJobIds.has(jobId)).toBe(false);
      expect(qs.runningCount).toBe(1);
      expect(qs.queue).toEqual([{ jobId, enqueuedAt: expect.any(Number) }]);
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
  });
});
