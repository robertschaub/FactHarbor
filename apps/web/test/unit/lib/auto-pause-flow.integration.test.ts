/**
 * Auto-Pause Flow Integration Tests
 *
 * Tests the full pipeline: provider failure → classifyError →
 * recordProviderFailure → circuit opens → pauseSystem → drainRunnerQueue skips.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { classifyError } from "@/lib/error-classification";
import {
  getHealthState,
  recordProviderFailure,
  recordProviderSuccess,
  pauseSystem,
  resumeSystem,
  isSystemPaused,
  isProviderHealthy,
} from "@/lib/provider-health";
import { SearchProviderError } from "@/lib/web-search";

// Reset globalThis state between tests
beforeEach(() => {
  (globalThis as any).__fhProviderHealthState = undefined;
});

describe("auto-pause flow integration", () => {
  describe("search provider failure → auto-pause", () => {
    it("3 consecutive fatal SearchProviderErrors open the circuit and pause the system", () => {
      // Simulate 3 consecutive search provider 429 errors
      for (let i = 1; i <= 3; i++) {
        const err = new SearchProviderError("SerpAPI", 429, true, `Rate limited attempt ${i}`);
        const classified = classifyError(err);

        expect(classified.category).toBe("rate_limit");
        expect(classified.provider).toBe("search");
        expect(classified.shouldCountAsProviderFailure).toBe(true);

        const { circuitOpened } = recordProviderFailure(classified.provider!, classified.message);

        if (i < 3) {
          expect(circuitOpened).toBe(false);
          expect(isSystemPaused()).toBe(false);
        } else {
          // 3rd failure trips the circuit breaker
          expect(circuitOpened).toBe(true);
          // Caller would now pause the system
          pauseSystem(`search provider failed rate_limit: ${classified.message}`);
        }
      }

      expect(isSystemPaused()).toBe(true);
      expect(isProviderHealthy("search")).toBe(false);
      // LLM should be unaffected
      expect(isProviderHealthy("llm")).toBe(true);
    });

    it("non-fatal SearchProviderErrors do NOT count toward circuit breaker", () => {
      for (let i = 0; i < 5; i++) {
        const err = new SearchProviderError("SerpAPI", 500, false, "Transient error");
        const classified = classifyError(err);
        expect(classified.shouldCountAsProviderFailure).toBe(false);
        // Should not record because shouldCountAsProviderFailure is false
      }

      expect(isProviderHealthy("search")).toBe(true);
      expect(isSystemPaused()).toBe(false);
    });

    it("successful search resets the failure counter mid-streak", () => {
      // 2 failures
      for (let i = 0; i < 2; i++) {
        const err = new SearchProviderError("SerpAPI", 429, true, "Rate limited");
        const classified = classifyError(err);
        recordProviderFailure(classified.provider!, classified.message);
      }
      expect(getHealthState().providers.search.consecutiveFailures).toBe(2);

      // Success resets counter
      recordProviderSuccess("search");
      expect(getHealthState().providers.search.consecutiveFailures).toBe(0);

      // Need 3 more failures to trip again
      for (let i = 1; i <= 3; i++) {
        const err = new SearchProviderError("SerpAPI", 429, true, "Rate limited");
        const classified = classifyError(err);
        const { circuitOpened } = recordProviderFailure(classified.provider!, classified.message);
        if (i === 3) {
          expect(circuitOpened).toBe(true);
        }
      }
    });
  });

  describe("LLM provider failure → auto-pause", () => {
    it("3 consecutive LLM 429 errors open the circuit", () => {
      for (let i = 1; i <= 3; i++) {
        const err = Object.assign(new Error("Too many requests"), { status: 429 });
        const classified = classifyError(err);

        expect(classified.category).toBe("rate_limit");
        expect(classified.provider).toBe("llm");
        expect(classified.shouldCountAsProviderFailure).toBe(true);

        const { circuitOpened } = recordProviderFailure(classified.provider!, classified.message);
        if (i === 3) {
          expect(circuitOpened).toBe(true);
          pauseSystem(`llm provider failed rate_limit: ${classified.message}`);
        }
      }

      expect(isSystemPaused()).toBe(true);
      expect(isProviderHealthy("llm")).toBe(false);
      // Search should be unaffected
      expect(isProviderHealthy("search")).toBe(true);
    });

    it("LLM auth error (401) opens the circuit", () => {
      for (let i = 1; i <= 3; i++) {
        const err = Object.assign(new Error("Unauthorized"), { status: 401 });
        const classified = classifyError(err);

        expect(classified.category).toBe("provider_outage");
        expect(classified.provider).toBe("llm");
        expect(classified.shouldCountAsProviderFailure).toBe(true);

        const { circuitOpened } = recordProviderFailure(classified.provider!, classified.message);
        if (i === 3) {
          expect(circuitOpened).toBe(true);
        }
      }
    });
  });

  describe("timeout errors do NOT trigger auto-pause", () => {
    it("timeout errors are not counted as provider failures", () => {
      for (let i = 0; i < 10; i++) {
        const err = new Error("Request timed out after 30000ms");
        err.name = "TimeoutError";
        const classified = classifyError(err);

        expect(classified.category).toBe("timeout");
        expect(classified.shouldCountAsProviderFailure).toBe(false);
      }

      // No provider circuits should be open
      expect(isProviderHealthy("search")).toBe(true);
      expect(isProviderHealthy("llm")).toBe(true);
      expect(isSystemPaused()).toBe(false);
    });
  });

  describe("resume → recovery flow", () => {
    it("resume resets all providers and allows new processing", () => {
      // Trip both circuits
      for (let i = 0; i < 3; i++) {
        recordProviderFailure("search", `search err ${i}`);
        recordProviderFailure("llm", `llm err ${i}`);
      }
      pauseSystem("Both providers down");

      expect(isSystemPaused()).toBe(true);
      expect(isProviderHealthy("search")).toBe(false);
      expect(isProviderHealthy("llm")).toBe(false);

      // Admin resumes
      resumeSystem();

      expect(isSystemPaused()).toBe(false);
      expect(isProviderHealthy("search")).toBe(true);
      expect(isProviderHealthy("llm")).toBe(true);
      expect(getHealthState().providers.search.consecutiveFailures).toBe(0);
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(0);
    });

    it("after resume, new failures start a fresh counter", () => {
      // Trip and pause
      for (let i = 0; i < 3; i++) {
        recordProviderFailure("search", "err");
      }
      pauseSystem("Search down");

      // Resume
      resumeSystem();

      // 1 new failure should not trigger pause
      const { circuitOpened } = recordProviderFailure("search", "new error");
      expect(circuitOpened).toBe(false);
      expect(isSystemPaused()).toBe(false);
      expect(getHealthState().providers.search.consecutiveFailures).toBe(1);
    });
  });

  describe("mixed provider errors", () => {
    it("search failures do not affect LLM circuit", () => {
      for (let i = 0; i < 3; i++) {
        const err = new SearchProviderError("SerpAPI", 429, true, "Rate limited");
        const classified = classifyError(err);
        recordProviderFailure(classified.provider!, classified.message);
      }

      expect(isProviderHealthy("search")).toBe(false);
      expect(isProviderHealthy("llm")).toBe(true);
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(0);
    });

    it("LLM failures do not affect search circuit", () => {
      for (let i = 0; i < 3; i++) {
        const err = Object.assign(new Error("Rate limited"), { status: 429 });
        const classified = classifyError(err);
        recordProviderFailure(classified.provider!, classified.message);
      }

      expect(isProviderHealthy("llm")).toBe(false);
      expect(isProviderHealthy("search")).toBe(true);
      expect(getHealthState().providers.search.consecutiveFailures).toBe(0);
    });

    it("one provider failure + other provider success keeps system running", () => {
      // 2 search failures (not enough to trip)
      recordProviderFailure("search", "err1");
      recordProviderFailure("search", "err2");

      // LLM succeeds
      recordProviderSuccess("llm");

      expect(isSystemPaused()).toBe(false);
      expect(isProviderHealthy("search")).toBe(true); // still closed, threshold not reached
      expect(isProviderHealthy("llm")).toBe(true);
    });
  });

  describe("classifyError → recordProviderFailure end-to-end", () => {
    it("shape-checked SearchProviderError works the same as instanceof", () => {
      // Simulate cross-module boundary issue
      const err = Object.assign(new Error("quota exceeded"), {
        name: "SearchProviderError",
        provider: "SerpAPI",
        status: 429,
        fatal: true,
      });

      const classified = classifyError(err);
      expect(classified.category).toBe("rate_limit");
      expect(classified.provider).toBe("search");
      expect(classified.shouldCountAsProviderFailure).toBe(true);

      const { circuitOpened } = recordProviderFailure(classified.provider!, classified.message);
      expect(circuitOpened).toBe(false); // only 1 failure
      expect(getHealthState().providers.search.consecutiveFailures).toBe(1);
    });

    it("message-based LLM error classification feeds into health tracker", () => {
      const err = new Error("Model is currently overloaded");
      const classified = classifyError(err);

      expect(classified.category).toBe("rate_limit");
      expect(classified.provider).toBe("llm");
      expect(classified.shouldCountAsProviderFailure).toBe(true);

      recordProviderFailure(classified.provider!, classified.message);
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(1);
    });

    it("unknown errors do not feed into health tracker", () => {
      const err = new Error("Something unexpected happened");
      const classified = classifyError(err);

      expect(classified.category).toBe("unknown");
      expect(classified.provider).toBeNull();
      expect(classified.shouldCountAsProviderFailure).toBe(false);

      // No recording happens — all providers stay healthy
      expect(getHealthState().providers.search.consecutiveFailures).toBe(0);
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(0);
    });
  });

  describe("health state snapshot isolation", () => {
    it("getHealthState returns snapshots that do not mutate", () => {
      const before = getHealthState();
      recordProviderFailure("search", "test");
      const after = getHealthState();

      expect(before.providers.search.consecutiveFailures).toBe(0);
      expect(after.providers.search.consecutiveFailures).toBe(1);
    });
  });
});
