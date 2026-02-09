/**
 * Provider Health Tracker Tests
 *
 * Tests circuit breaker state transitions, system pause/resume,
 * and provider failure/success recording.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getHealthState,
  recordProviderSuccess,
  recordProviderFailure,
  pauseSystem,
  resumeSystem,
  isSystemPaused,
  isProviderHealthy,
  transitionToHalfOpen,
} from "@/lib/provider-health";

// Reset globalThis state between tests
beforeEach(() => {
  (globalThis as any).__fhProviderHealthState = undefined;
});

describe("provider-health", () => {
  describe("initial state", () => {
    it("starts with all providers closed and system not paused", () => {
      const state = getHealthState();
      expect(state.systemPaused).toBe(false);
      expect(state.pausedAt).toBeNull();
      expect(state.pauseReason).toBeNull();
      expect(state.providers.search.state).toBe("closed");
      expect(state.providers.search.consecutiveFailures).toBe(0);
      expect(state.providers.llm.state).toBe("closed");
      expect(state.providers.llm.consecutiveFailures).toBe(0);
    });

    it("returns a snapshot (not a reference)", () => {
      const s1 = getHealthState();
      recordProviderFailure("search", "test");
      const s2 = getHealthState();
      expect(s1.providers.search.consecutiveFailures).toBe(0);
      expect(s2.providers.search.consecutiveFailures).toBe(1);
    });
  });

  describe("recordProviderSuccess", () => {
    it("updates lastSuccessTime", () => {
      const before = Date.now();
      recordProviderSuccess("search");
      const state = getHealthState();
      expect(state.providers.search.lastSuccessTime).toBeGreaterThanOrEqual(before);
    });

    it("resets consecutive failures", () => {
      recordProviderFailure("llm", "err1");
      recordProviderFailure("llm", "err2");
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(2);

      recordProviderSuccess("llm");
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(0);
    });

    it("transitions HALF_OPEN → CLOSED on success", () => {
      // Force to open then half_open
      recordProviderFailure("search", "err", 1); // threshold=1 → opens
      transitionToHalfOpen("search");
      expect(getHealthState().providers.search.state).toBe("half_open");

      recordProviderSuccess("search");
      expect(getHealthState().providers.search.state).toBe("closed");
    });
  });

  describe("recordProviderFailure", () => {
    it("increments consecutive failures", () => {
      recordProviderFailure("search", "err1");
      recordProviderFailure("search", "err2");
      const state = getHealthState();
      expect(state.providers.search.consecutiveFailures).toBe(2);
      expect(state.providers.search.lastFailureMessage).toBe("err2");
    });

    it("opens circuit at threshold (default 3)", () => {
      const r1 = recordProviderFailure("search", "err1");
      expect(r1.circuitOpened).toBe(false);
      const r2 = recordProviderFailure("search", "err2");
      expect(r2.circuitOpened).toBe(false);
      const r3 = recordProviderFailure("search", "err3");
      expect(r3.circuitOpened).toBe(true);
      expect(getHealthState().providers.search.state).toBe("open");
    });

    it("opens circuit at custom threshold", () => {
      const r1 = recordProviderFailure("llm", "err", 2);
      expect(r1.circuitOpened).toBe(false);
      const r2 = recordProviderFailure("llm", "err", 2);
      expect(r2.circuitOpened).toBe(true);
      expect(getHealthState().providers.llm.state).toBe("open");
    });

    it("does not re-open when already open", () => {
      recordProviderFailure("search", "err", 1); // opens
      const r2 = recordProviderFailure("search", "err", 1);
      expect(r2.circuitOpened).toBe(false); // already open
    });

    it("transitions HALF_OPEN → OPEN on failure", () => {
      recordProviderFailure("search", "err", 1); // opens
      transitionToHalfOpen("search");
      expect(getHealthState().providers.search.state).toBe("half_open");

      const r = recordProviderFailure("search", "probe failed");
      expect(r.circuitOpened).toBe(false); // not a new opening
      expect(getHealthState().providers.search.state).toBe("open");
    });

    it("records failure time", () => {
      const before = Date.now();
      recordProviderFailure("llm", "err");
      const state = getHealthState();
      expect(state.providers.llm.lastFailureTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe("pauseSystem / resumeSystem", () => {
    it("pauses the system", () => {
      pauseSystem("SerpAPI down");
      expect(isSystemPaused()).toBe(true);
      const state = getHealthState();
      expect(state.systemPaused).toBe(true);
      expect(state.pauseReason).toBe("SerpAPI down");
      expect(state.pausedAt).toBeGreaterThan(0);
    });

    it("does not double-pause", () => {
      pauseSystem("first");
      const t1 = getHealthState().pausedAt;
      pauseSystem("second");
      expect(getHealthState().pauseReason).toBe("first");
      expect(getHealthState().pausedAt).toBe(t1);
    });

    it("resumes the system and resets all circuits", () => {
      recordProviderFailure("search", "err", 1); // open circuit
      pauseSystem("test");
      expect(isSystemPaused()).toBe(true);
      expect(getHealthState().providers.search.state).toBe("open");

      resumeSystem();
      expect(isSystemPaused()).toBe(false);
      expect(getHealthState().pauseReason).toBeNull();
      expect(getHealthState().pausedAt).toBeNull();
      expect(getHealthState().providers.search.state).toBe("closed");
      expect(getHealthState().providers.search.consecutiveFailures).toBe(0);
      expect(getHealthState().providers.llm.state).toBe("closed");
    });
  });

  describe("isProviderHealthy", () => {
    it("returns true when closed", () => {
      expect(isProviderHealthy("search")).toBe(true);
      expect(isProviderHealthy("llm")).toBe(true);
    });

    it("returns false when open", () => {
      recordProviderFailure("search", "err", 1);
      expect(isProviderHealthy("search")).toBe(false);
    });

    it("returns false when half_open", () => {
      recordProviderFailure("llm", "err", 1);
      transitionToHalfOpen("llm");
      expect(isProviderHealthy("llm")).toBe(false);
    });
  });

  describe("transitionToHalfOpen", () => {
    it("transitions OPEN → HALF_OPEN", () => {
      recordProviderFailure("search", "err", 1);
      expect(getHealthState().providers.search.state).toBe("open");

      transitionToHalfOpen("search");
      expect(getHealthState().providers.search.state).toBe("half_open");
    });

    it("no-ops when CLOSED", () => {
      transitionToHalfOpen("search");
      expect(getHealthState().providers.search.state).toBe("closed");
    });
  });

  describe("isolation between providers", () => {
    it("search failures do not affect llm", () => {
      recordProviderFailure("search", "err", 1);
      expect(getHealthState().providers.search.state).toBe("open");
      expect(getHealthState().providers.llm.state).toBe("closed");
      expect(getHealthState().providers.llm.consecutiveFailures).toBe(0);
    });
  });
});
