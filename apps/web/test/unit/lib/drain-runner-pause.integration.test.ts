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

    it("drainRunnerQueue returns early when system is paused and probe fails", async () => {
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

      // Pause the system
      pauseSystem("Provider down");

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

    it("drainRunnerQueue auto-resumes when probe succeeds", async () => {
      // Mock fetch: probe succeeds (connectivity restored), so system resumes
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("api.anthropic.com")) {
          return new Response("", { status: 401 }); // Auth error = reachable
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

      pauseSystem("Provider down");
      expect(isSystemPaused()).toBe(true);

      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      await drainRunnerQueue();
      await flushMicrotasks();

      // System should have been auto-resumed by the probe
      expect(isSystemPaused()).toBe(false);

      // Should have proceeded to process jobs (more fetches after the probe)
      expect(globalThis.fetch).toHaveBeenCalled();
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

    it("re-queues orphaned RUNNING jobs after restart and picks them up in the same drain cycle", async () => {
      const orphanJobId = "job-orphan-1";
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
              updatedUtc: new Date(Date.now() - 60_000).toISOString(),
              progress: 42,
              pipelineVariant: "claimboundary",
            }],
            pagination: { totalPages: 1 },
          }), { status: 200 });
        }

        if (method === "GET" && url.endsWith(`/v1/jobs/${orphanJobId}`)) {
          return new Response(JSON.stringify({
            jobId: orphanJobId,
            status: "QUEUED",
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
  });
});
