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

vi.mock("@/lib/analyzer", () => ({
  runFactHarborAnalysis: vi.fn(async () => ({ resultJson: { meta: {} } })),
}));

vi.mock("@/lib/analyzer/monolithic-dynamic", () => ({
  runMonolithicDynamic: vi.fn(async () => ({ resultJson: { meta: {} } })),
}));

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
      // Set up required env vars for drainRunnerQueue
      process.env.FH_API_BASE_URL = "http://localhost:3001";
      vi.resetModules();
    });

    afterEach(async () => {
      // Allow background fire-and-forget promises from runJobBackground to settle.
      // drainRunnerQueue spawns `void runJobBackground(...)` which eventually
      // calls drainRunnerQueue again in its finally block. Give it time to fail
      // gracefully before we tear down env vars.
      await new Promise((r) => setTimeout(r, 100));
      process.env = originalEnv;
      vi.restoreAllMocks();
    });

    it("drainRunnerQueue returns early when system is paused", async () => {
      // Mock fetch to track any API calls
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

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

      // Should NOT have made any API calls (no job processing)
      expect(fetchSpy).not.toHaveBeenCalled();

      // Should have logged the pause warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("System is PAUSED"),
      );

      // Queue should still have the job
      const qs = (globalThis as any).__fhRunnerQueueState;
      expect(qs.queue).toHaveLength(1);
      expect(qs.queue[0].jobId).toBe("job-1");

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

      // Should process jobs (not paused anymore)
      expect(globalThis.fetch).toHaveBeenCalled();

      // Should NOT have logged the pause warning
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining("System is PAUSED"),
      );
    });
  });
});
