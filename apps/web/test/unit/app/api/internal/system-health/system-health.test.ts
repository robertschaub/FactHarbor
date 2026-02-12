/**
 * System Health API Route Tests
 *
 * Tests the internal system-health endpoints:
 * - GET returns current health state
 * - POST resume clears pause and triggers queue drain
 * - POST pause sets system to paused state
 * - Auth enforcement on POST
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getHealthState,
  recordProviderFailure,
  pauseSystem,
  isSystemPaused,
} from "@/lib/provider-health";

// Mock fireWebhook to avoid real HTTP calls
vi.mock("@/lib/provider-webhook", () => ({
  fireWebhook: vi.fn().mockResolvedValue(undefined),
}));

// Mock drainRunnerQueue to avoid the full run-job dependency chain
vi.mock("@/lib/internal-runner-queue", () => ({
  drainRunnerQueue: vi.fn().mockResolvedValue(undefined),
}));

// Reset globalThis state between tests
beforeEach(() => {
  (globalThis as any).__fhProviderHealthState = undefined;
  vi.clearAllMocks();
});

describe("system-health internal API route", () => {
  // The internal route uses identical logic to the fh/system-health route.
  // We test the core functions + route handler behavior.

  describe("GET /api/internal/system-health", () => {
    it("returns initial healthy state", async () => {
      const { GET } = await import("@/app/api/internal/system-health/route");
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.systemPaused).toBe(false);
      expect(body.pausedAt).toBeNull();
      expect(body.pauseReason).toBeNull();
      expect(body.providers.search.state).toBe("closed");
      expect(body.providers.llm.state).toBe("closed");
    });

    it("returns paused state when system is paused", async () => {
      pauseSystem("SerpAPI down");

      const { GET } = await import("@/app/api/internal/system-health/route");
      const response = await GET();
      const body = await response.json();

      expect(body.systemPaused).toBe(true);
      expect(body.pauseReason).toBe("SerpAPI down");
      expect(body.pausedAt).toBeGreaterThan(0);
    });

    it("reflects provider circuit state", async () => {
      recordProviderFailure("search", "err", 1); // open circuit immediately

      const { GET } = await import("@/app/api/internal/system-health/route");
      const response = await GET();
      const body = await response.json();

      expect(body.providers.search.state).toBe("open");
      expect(body.providers.search.consecutiveFailures).toBe(1);
      expect(body.providers.llm.state).toBe("closed");
    });
  });

  describe("POST /api/internal/system-health — resume", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      // Allow in dev mode (no admin key required)
      delete process.env.FH_ADMIN_KEY;
      process.env.NODE_ENV = "test";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("resumes a paused system", async () => {
      // Set up paused state
      recordProviderFailure("search", "err", 1);
      pauseSystem("Search provider down");
      expect(isSystemPaused()).toBe(true);

      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.healthState.systemPaused).toBe(false);
      expect(body.healthState.providers.search.state).toBe("closed");
      expect(body.healthState.providers.search.consecutiveFailures).toBe(0);

      // Verify system is actually resumed
      expect(isSystemPaused()).toBe(false);
    });

    it("fires webhook on resume", async () => {
      const { fireWebhook } = await import("@/lib/provider-webhook");
      pauseSystem("test");

      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });

      await POST(req);

      expect(fireWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "system_resumed",
          reason: "Admin manually resumed the system",
        }),
      );
    });

    it("triggers drainRunnerQueue on resume", async () => {
      const { drainRunnerQueue } = await import("@/lib/internal-runner-queue");
      pauseSystem("test");

      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });

      await POST(req);

      expect(drainRunnerQueue).toHaveBeenCalled();
    });
  });

  describe("POST /api/internal/system-health — pause", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      delete process.env.FH_ADMIN_KEY;
      process.env.NODE_ENV = "test";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("pauses the system with a reason", async () => {
      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", reason: "Maintenance window" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.healthState.systemPaused).toBe(true);
      expect(body.healthState.pauseReason).toBe("Maintenance window");

      expect(isSystemPaused()).toBe(true);
    });

    it("uses default reason when none provided", async () => {
      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });

      const response = await POST(req);
      const body = await response.json();

      expect(body.healthState.pauseReason).toBe("Manually paused by admin");
    });

    it("fires webhook on pause", async () => {
      const { fireWebhook } = await import("@/lib/provider-webhook");

      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", reason: "Manual pause" }),
      });

      await POST(req);

      expect(fireWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "system_paused",
          reason: "Manual pause",
        }),
      );
    });
  });

  describe("POST /api/internal/system-health — auth enforcement", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("rejects POST without admin key in production mode", async () => {
      process.env.FH_ADMIN_KEY = "secret-key";
      process.env.NODE_ENV = "production";

      // Need fresh import after env change
      vi.resetModules();
      const { POST } = await import("@/app/api/internal/system-health/route");

      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("accepts POST with correct admin key", async () => {
      process.env.FH_ADMIN_KEY = "secret-key";

      vi.resetModules();
      const { POST } = await import("@/app/api/internal/system-health/route");

      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "secret-key",
        },
        body: JSON.stringify({ action: "resume" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
    });

    it("rejects POST with wrong admin key", async () => {
      process.env.FH_ADMIN_KEY = "secret-key";

      vi.resetModules();
      const { POST } = await import("@/app/api/internal/system-health/route");

      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "wrong-key",
        },
        body: JSON.stringify({ action: "resume" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/internal/system-health — error cases", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      delete process.env.FH_ADMIN_KEY;
      process.env.NODE_ENV = "test";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns 400 for invalid JSON", async () => {
      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid JSON");
    });

    it("returns 400 for unknown action", async () => {
      const { POST } = await import("@/app/api/internal/system-health/route");
      const req = new Request("http://localhost/api/internal/system-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Unknown action");
    });
  });
});
