/**
 * Search Provider Circuit Breaker
 *
 * Tracks provider health and prevents cascading failures.
 * When a provider fails repeatedly, its circuit "opens" and requests skip it temporarily.
 *
 * States:
 * - CLOSED: Normal operation, provider is healthy
 * - OPEN: Provider is failing, skip it temporarily
 * - HALF_OPEN: Testing if provider has recovered
 *
 * @module search-circuit-breaker
 */

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number; // Consecutive failures before opening
  resetTimeoutSec: number; // Seconds before attempting retry
}

interface ProviderCircuitState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  halfOpenProbeInFlight: boolean; // True when a HALF_OPEN probe request is in progress
}

// ============================================================================
// CIRCUIT BREAKER STATE
// ============================================================================

const circuitStates = new Map<string, ProviderCircuitState>();
let config: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 3,
  resetTimeoutSec: 300,
};

/**
 * Initialize or update circuit breaker configuration.
 */
export function setCircuitBreakerConfig(newConfig: CircuitBreakerConfig): void {
  config = { ...newConfig };
}

/**
 * Get current circuit breaker configuration.
 */
export function getCircuitBreakerConfig(): CircuitBreakerConfig {
  return { ...config };
}

/**
 * Get or create circuit state for a provider.
 */
function getCircuitState(provider: string): ProviderCircuitState {
  if (!circuitStates.has(provider)) {
    circuitStates.set(provider, {
      state: "closed",
      failures: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      halfOpenProbeInFlight: false,
    });
  }
  return circuitStates.get(provider)!;
}

// ============================================================================
// CIRCUIT OPERATIONS
// ============================================================================

/**
 * Check if a provider is available (circuit not open).
 * If circuit is half-open, allow one test request.
 *
 * @param provider - Provider name
 * @param cbConfig - Optional circuit breaker config override. If not provided, uses module-level config.
 */
export function isProviderAvailable(
  provider: string,
  cbConfig?: CircuitBreakerConfig,
): boolean {
  const cfg = cbConfig ?? config;
  if (!cfg.enabled) {
    return true; // Circuit breaker disabled, all providers available
  }

  const state = getCircuitState(provider);

  // CLOSED: Provider is healthy
  if (state.state === "closed") {
    return true;
  }

  // HALF_OPEN: Allow exactly one probe request at a time
  if (state.state === "half_open") {
    if (state.halfOpenProbeInFlight) {
      console.log(`[Circuit-Breaker] ${provider}: HALF_OPEN probe already in flight, skipping concurrent request`);
      return false;
    }
    // Mark probe as in-flight
    state.halfOpenProbeInFlight = true;
    return true;
  }

  // OPEN: Check if enough time has passed to transition to HALF_OPEN
  if (state.state === "open") {
    const now = Date.now();
    const timeSinceFailure = state.lastFailureTime ? now - state.lastFailureTime : Infinity;
    const resetTimeoutMs = cfg.resetTimeoutSec * 1000;

    if (timeSinceFailure >= resetTimeoutMs) {
      // Transition to HALF_OPEN and mark probe as in-flight
      state.state = "half_open";
      state.halfOpenProbeInFlight = true;
      console.log(
        `[Circuit-Breaker] ${provider}: OPEN → HALF_OPEN (timeout elapsed, attempting recovery)`,
      );
      return true;
    }

    // Still in cooldown period
    const remainingSec = Math.ceil((resetTimeoutMs - timeSinceFailure) / 1000);
    console.log(
      `[Circuit-Breaker] ${provider}: Circuit OPEN, skipping (retry in ${remainingSec}s)`,
    );
    return false;
  }

  return false;
}

/**
 * Record a successful request to a provider.
 *
 * @param provider - Provider name
 * @param cbConfig - Optional circuit breaker config override. If not provided, uses module-level config.
 */
export function recordSuccess(provider: string, cbConfig?: CircuitBreakerConfig): void {
  const cfg = cbConfig ?? config;
  if (!cfg.enabled) return;

  const state = getCircuitState(provider);
  state.totalRequests++;
  state.totalSuccesses++;
  state.lastSuccessTime = Date.now();
  state.failures = 0; // Reset consecutive failure counter

  // If recovering from HALF_OPEN, close the circuit
  if (state.state === "half_open") {
    state.state = "closed";
    state.halfOpenProbeInFlight = false; // Reset probe flag
    console.log(
      `[Circuit-Breaker] ${provider}: HALF_OPEN → CLOSED (recovery successful, ${state.totalSuccesses}/${state.totalRequests} success rate)`,
    );
  } else if (state.state === "closed") {
    // Normal operation, log periodically
    if (state.totalSuccesses % 10 === 0) {
      console.log(
        `[Circuit-Breaker] ${provider}: Healthy (${state.totalSuccesses}/${state.totalRequests} success)`,
      );
    }
  }
}

/**
 * Record a failed request to a provider.
 *
 * @param provider - Provider name
 * @param error - Optional error message
 * @param cbConfig - Optional circuit breaker config override. If not provided, uses module-level config.
 */
export function recordFailure(provider: string, error?: string, cbConfig?: CircuitBreakerConfig): void {
  const cfg = cbConfig ?? config;
  if (!cfg.enabled) return;

  const state = getCircuitState(provider);
  state.totalRequests++;
  state.totalFailures++;
  state.failures++; // Consecutive failures
  state.lastFailureTime = Date.now();

  console.warn(
    `[Circuit-Breaker] ${provider}: Failure recorded (${state.failures}/${cfg.failureThreshold}, error: ${error || "unknown"})`,
  );

  // If in HALF_OPEN and failed, reopen the circuit
  if (state.state === "half_open") {
    state.state = "open";
    state.halfOpenProbeInFlight = false; // Reset probe flag
    console.error(
      `[Circuit-Breaker] ${provider}: HALF_OPEN → OPEN (recovery failed, circuit reopened)`,
    );
    return;
  }

  // If consecutive failures exceed threshold, open the circuit
  if (state.state === "closed" && state.failures >= cfg.failureThreshold) {
    state.state = "open";
    console.error(
      `[Circuit-Breaker] ${provider}: CLOSED → OPEN (threshold reached: ${state.failures} consecutive failures)`,
    );
  }
}

/**
 * Manually reset a provider's circuit (for testing or admin intervention).
 */
export function resetCircuit(provider: string): void {
  const state = getCircuitState(provider);
  state.state = "closed";
  state.failures = 0;
  state.halfOpenProbeInFlight = false;
  console.log(`[Circuit-Breaker] ${provider}: Circuit manually reset to CLOSED`);
}

/**
 * Reset all circuits (for testing or system restart).
 */
export function resetAllCircuits(): void {
  circuitStates.clear();
  console.log("[Circuit-Breaker] All circuits reset");
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface ProviderStats {
  provider: string;
  state: CircuitState;
  consecutiveFailures: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  successRate: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

/**
 * Get statistics for a specific provider.
 */
export function getProviderStats(provider: string): ProviderStats | null {
  const state = circuitStates.get(provider);
  if (!state) return null;

  return {
    provider,
    state: state.state,
    consecutiveFailures: state.failures,
    totalRequests: state.totalRequests,
    totalFailures: state.totalFailures,
    totalSuccesses: state.totalSuccesses,
    successRate: state.totalRequests > 0 ? state.totalSuccesses / state.totalRequests : 0,
    lastFailureTime: state.lastFailureTime,
    lastSuccessTime: state.lastSuccessTime,
  };
}

/**
 * Get statistics for all providers.
 */
export function getAllProviderStats(): ProviderStats[] {
  const stats: ProviderStats[] = [];
  for (const [provider] of circuitStates) {
    const stat = getProviderStats(provider);
    if (stat) stats.push(stat);
  }
  return stats;
}
