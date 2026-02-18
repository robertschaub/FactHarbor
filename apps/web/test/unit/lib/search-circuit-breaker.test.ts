/**
 * Tests for search provider circuit breaker.
 *
 * Validates state transitions (CLOSED → OPEN → HALF_OPEN → CLOSED),
 * failure threshold triggering, and recovery logic.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isProviderAvailable,
  recordSuccess,
  recordFailure,
  resetCircuit,
  resetAllCircuits,
  getProviderStats,
  type CircuitBreakerConfig,
} from "@/lib/search-circuit-breaker";

const TEST_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 3,
  resetTimeoutSec: 5, // 5 seconds for faster tests
};

describe("Circuit Breaker", () => {
  beforeEach(() => {
    // Reset ALL circuit state before each test to avoid cross-test pollution
    resetAllCircuits();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should start in CLOSED state (provider available)", () => {
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true);
  });

  it("should transition to OPEN after threshold failures", () => {
    // Record 3 failures (threshold)
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true); // Still CLOSED (2 failures)

    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // Now OPEN (3 failures)
  });

  it("should reset failure count on success", () => {
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    recordSuccess("TestProvider", TEST_CONFIG); // Reset counter

    // Provider should still be available (failures reset)
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true);

    // Need 3 more failures to open
    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    recordFailure("TestProvider", "Error 4", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true); // Still CLOSED (2 consecutive)

    recordFailure("TestProvider", "Error 5", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // Now OPEN
  });

  it("should transition from OPEN to HALF_OPEN after timeout", async () => {
    // Open the circuit
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // OPEN

    // Wait for reset timeout (5 seconds in TEST_CONFIG)
    await new Promise((resolve) => setTimeout(resolve, 5100));

    // Should transition to HALF_OPEN and allow probe
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true); // HALF_OPEN probe allowed
  }, 10000); // 10 second timeout for this async test

  it("should allow exactly one probe in HALF_OPEN state", async () => {
    // Open the circuit
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // OPEN

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 5100));

    // First probe allowed (transitions to HALF_OPEN and sets flag)
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true);

    // Second concurrent probe should be blocked (probe in flight)
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false);
  }, 10000); // 10 second timeout

  it("should transition from HALF_OPEN to CLOSED on success", async () => {
    // Open the circuit
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // OPEN

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 5100));

    // Allow probe
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true); // HALF_OPEN

    // Record success → should transition to CLOSED
    recordSuccess("TestProvider", TEST_CONFIG);

    // Circuit should now be closed
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true);

    // Subsequent calls should also succeed (no probe flag blocking)
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true);
  }, 10000); // 10 second timeout

  it("should transition from HALF_OPEN back to OPEN on failure", async () => {
    // Open the circuit
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // OPEN

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 5100));

    // Allow probe
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true); // HALF_OPEN

    // Record failure → should transition back to OPEN
    recordFailure("TestProvider", "Probe failed", TEST_CONFIG);

    // Circuit should be OPEN again
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false);
  }, 10000); // 10 second timeout

  it("should track separate state per provider", () => {
    recordFailure("Provider1", "Error 1", TEST_CONFIG);
    recordFailure("Provider1", "Error 2", TEST_CONFIG);
    recordFailure("Provider1", "Error 3", TEST_CONFIG);

    expect(isProviderAvailable("Provider1", TEST_CONFIG)).toBe(false); // OPEN
    expect(isProviderAvailable("Provider2", TEST_CONFIG)).toBe(true); // CLOSED (independent state)
  });

  it("should disable circuit breaker when enabled=false", () => {
    const disabledConfig: CircuitBreakerConfig = {
      enabled: false,
      failureThreshold: 3,
      resetTimeoutSec: 5,
    };

    // Record failures
    recordFailure("TestProvider", "Error 1", disabledConfig);
    recordFailure("TestProvider", "Error 2", disabledConfig);
    recordFailure("TestProvider", "Error 3", disabledConfig);

    // Provider should still be available (circuit breaker disabled)
    expect(isProviderAvailable("TestProvider", disabledConfig)).toBe(true);
  });

  it("should return circuit breaker stats", () => {
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordSuccess("TestProvider", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);

    const stats = getProviderStats("TestProvider");
    expect(stats).not.toBeNull();
    expect(stats!.totalRequests).toBe(3);
    expect(stats!.totalFailures).toBe(2);
    expect(stats!.totalSuccesses).toBe(1);
    expect(stats!.state).toBe("closed");
  });

  it("should manually reset circuit", () => {
    // Open the circuit
    recordFailure("TestProvider", "Error 1", TEST_CONFIG);
    recordFailure("TestProvider", "Error 2", TEST_CONFIG);
    recordFailure("TestProvider", "Error 3", TEST_CONFIG);
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(false); // OPEN

    // Manual reset
    resetCircuit("TestProvider");

    // Circuit should be closed now
    expect(isProviderAvailable("TestProvider", TEST_CONFIG)).toBe(true);
  });

  it("should handle different failure thresholds via config", () => {
    const strictConfig: CircuitBreakerConfig = {
      enabled: true,
      failureThreshold: 1, // Open after 1 failure
      resetTimeoutSec: 5,
    };

    recordFailure("TestProvider", "Error 1", strictConfig);
    expect(isProviderAvailable("TestProvider", strictConfig)).toBe(false); // OPEN after 1 failure
  });

  it("should use module-level config when no override provided", () => {
    // Call without passing config (should use module defaults or last set config)
    recordFailure("TestProvider", "Error 1");
    recordFailure("TestProvider", "Error 2");
    recordFailure("TestProvider", "Error 3");

    // Behavior depends on module-level config (default: failureThreshold=3)
    expect(isProviderAvailable("TestProvider")).toBe(false); // OPEN
  });
});
