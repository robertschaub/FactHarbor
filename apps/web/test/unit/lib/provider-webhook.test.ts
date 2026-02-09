/**
 * Provider Webhook Tests
 *
 * Tests webhook notification firing, HMAC signature, and env var handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { HealthState } from "@/lib/provider-health";

const mockHealthState: HealthState = {
  providers: {
    search: { state: "open", consecutiveFailures: 3, lastFailureTime: Date.now(), lastFailureMessage: "HTTP 429", lastSuccessTime: null },
    llm: { state: "closed", consecutiveFailures: 0, lastFailureTime: null, lastFailureMessage: null, lastSuccessTime: Date.now() },
  },
  systemPaused: true,
  pausedAt: Date.now(),
  pauseReason: "Search provider down",
};

describe("provider-webhook", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("does nothing when FH_WEBHOOK_URL is not set", async () => {
    delete process.env.FH_WEBHOOK_URL;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { fireWebhook } = await import("@/lib/provider-webhook");
    await fireWebhook({
      type: "system_paused",
      reason: "test",
      timestamp: new Date().toISOString(),
      healthState: mockHealthState,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends POST to FH_WEBHOOK_URL", async () => {
    process.env.FH_WEBHOOK_URL = "https://hooks.example.com/test";
    delete process.env.FH_WEBHOOK_SECRET;

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("OK", { status: 200 }),
    );

    const { fireWebhook } = await import("@/lib/provider-webhook");
    await fireWebhook({
      type: "system_paused",
      reason: "SerpAPI rate limited",
      provider: "search",
      timestamp: "2026-02-08T15:30:00Z",
      healthState: mockHealthState,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/test");
    expect(options?.method).toBe("POST");

    const body = JSON.parse(options?.body as string);
    expect(body.type).toBe("system_paused");
    expect(body.reason).toBe("SerpAPI rate limited");
    expect(body.provider).toBe("search");
    expect(body.healthState).toBeDefined();
  });

  it("includes HMAC signature when FH_WEBHOOK_SECRET is set", async () => {
    process.env.FH_WEBHOOK_URL = "https://hooks.example.com/test";
    process.env.FH_WEBHOOK_SECRET = "my-secret-key";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("OK", { status: 200 }),
    );

    const { fireWebhook } = await import("@/lib/provider-webhook");
    await fireWebhook({
      type: "system_resumed",
      reason: "Admin resumed",
      timestamp: "2026-02-08T16:00:00Z",
      healthState: mockHealthState,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers["X-Webhook-Signature"]).toBeDefined();
    expect(headers["X-Webhook-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);

    // Verify signature is deterministic
    const crypto = await import("crypto");
    const body = options?.body as string;
    const expected = crypto.createHmac("sha256", "my-secret-key").update(body).digest("hex");
    expect(headers["X-Webhook-Signature"]).toBe(`sha256=${expected}`);
  });

  it("catches fetch errors and does not throw", async () => {
    process.env.FH_WEBHOOK_URL = "https://hooks.example.com/test";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { fireWebhook } = await import("@/lib/provider-webhook");

    // Should not throw
    await expect(
      fireWebhook({
        type: "system_paused",
        reason: "test",
        timestamp: new Date().toISOString(),
        healthState: mockHealthState,
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Webhook] Failed to send system_paused notification"),
    );
  });

  it("logs warning on non-OK response", async () => {
    process.env.FH_WEBHOOK_URL = "https://hooks.example.com/test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Bad Request", { status: 400, statusText: "Bad Request" }),
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { fireWebhook } = await import("@/lib/provider-webhook");
    await fireWebhook({
      type: "provider_failure",
      reason: "test",
      timestamp: new Date().toISOString(),
      healthState: mockHealthState,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed: HTTP 400"),
    );
  });
});
