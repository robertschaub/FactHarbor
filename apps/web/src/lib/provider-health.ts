/**
 * Provider Health Tracker
 *
 * Circuit breaker singleton tracking search and LLM provider health.
 * Uses globalThis persistence (same pattern as the runner queue in run-job/route.ts).
 *
 * State machine per provider: CLOSED → OPEN → HALF_OPEN → CLOSED
 * - CLOSED: provider healthy, all calls proceed
 * - OPEN: provider down, calls should be skipped / system paused
 * - HALF_OPEN: next call is a probe — success → CLOSED, failure → OPEN
 *
 * @module provider-health
 */

export type ProviderType = "search" | "llm";
export type CircuitState = "closed" | "open" | "half_open";

export type ProviderHealth = {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastFailureMessage: string | null;
  lastSuccessTime: number | null;
};

export type HealthState = {
  providers: Record<ProviderType, ProviderHealth>;
  systemPaused: boolean;
  pausedAt: number | null;
  pauseReason: string | null;
};

const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 3;

function makeDefaultProviderHealth(): ProviderHealth {
  return {
    state: "closed",
    consecutiveFailures: 0,
    lastFailureTime: null,
    lastFailureMessage: null,
    lastSuccessTime: null,
  };
}

function makeDefaultHealthState(): HealthState {
  return {
    providers: {
      search: makeDefaultProviderHealth(),
      llm: makeDefaultProviderHealth(),
    },
    systemPaused: false,
    pausedAt: null,
    pauseReason: null,
  };
}

function getState(): HealthState {
  const g = globalThis as any;
  if (!g.__fhProviderHealthState) {
    g.__fhProviderHealthState = makeDefaultHealthState();
  }
  const st = g.__fhProviderHealthState as HealthState;
  // Backward-compat: ensure both provider slots exist
  if (!st.providers) {
    st.providers = { search: makeDefaultProviderHealth(), llm: makeDefaultProviderHealth() };
  }
  if (!st.providers.search) st.providers.search = makeDefaultProviderHealth();
  if (!st.providers.llm) st.providers.llm = makeDefaultProviderHealth();
  return st;
}

/** Read current health state (read-only snapshot). */
export function getHealthState(): HealthState {
  return structuredClone(getState());
}

/** Record a successful provider call.  Resets consecutive failure count. */
export function recordProviderSuccess(type: ProviderType): void {
  const st = getState();
  const p = st.providers[type];
  p.consecutiveFailures = 0;
  p.lastSuccessTime = Date.now();
  if (p.state === "half_open") {
    p.state = "closed";
    console.log(`[ProviderHealth] ${type}: HALF_OPEN → CLOSED (probe succeeded)`);
  }
}

/**
 * Record a provider failure.
 *
 * @returns `{ circuitOpened: true }` if this failure just tripped the circuit breaker
 *          from CLOSED → OPEN, signaling the caller to pause the system.
 */
export function recordProviderFailure(
  type: ProviderType,
  message: string,
  threshold: number = DEFAULT_CIRCUIT_BREAKER_THRESHOLD,
): { circuitOpened: boolean } {
  const st = getState();
  const p = st.providers[type];

  p.consecutiveFailures++;
  p.lastFailureTime = Date.now();
  p.lastFailureMessage = message;

  // HALF_OPEN probe failed → back to OPEN
  if (p.state === "half_open") {
    p.state = "open";
    console.error(`[ProviderHealth] ${type}: HALF_OPEN → OPEN (probe failed: ${message})`);
    return { circuitOpened: false }; // was already open-ish, not a *new* opening
  }

  // CLOSED → OPEN when threshold reached
  if (p.state === "closed" && p.consecutiveFailures >= threshold) {
    p.state = "open";
    console.error(
      `[ProviderHealth] ${type}: CLOSED → OPEN after ${p.consecutiveFailures} consecutive failures (threshold: ${threshold}). Last: ${message}`,
    );
    return { circuitOpened: true };
  }

  return { circuitOpened: false };
}

/** Pause the system (called when circuit opens). */
export function pauseSystem(reason: string): void {
  const st = getState();
  if (st.systemPaused) return; // already paused
  st.systemPaused = true;
  st.pausedAt = Date.now();
  st.pauseReason = reason;
  console.warn(`[ProviderHealth] System PAUSED: ${reason}`);
}

/** Resume the system (admin action). Resets all circuits and failure counts. */
export function resumeSystem(): void {
  const st = getState();
  st.systemPaused = false;
  st.pausedAt = null;
  st.pauseReason = null;
  // Reset both providers to closed
  for (const key of Object.keys(st.providers) as ProviderType[]) {
    st.providers[key] = makeDefaultProviderHealth();
  }
  console.log("[ProviderHealth] System RESUMED — all circuits reset to CLOSED");
}

/** Check if the system is paused. */
export function isSystemPaused(): boolean {
  return getState().systemPaused;
}

/** Check if a specific provider's circuit is closed (healthy). */
export function isProviderHealthy(type: ProviderType): boolean {
  return getState().providers[type].state === "closed";
}

/**
 * Transition a provider from OPEN → HALF_OPEN so the next call acts as a probe.
 * Typically called after a cooldown period or when admin wants to test recovery.
 */
export function transitionToHalfOpen(type: ProviderType): void {
  const st = getState();
  const p = st.providers[type];
  if (p.state === "open") {
    p.state = "half_open";
    console.log(`[ProviderHealth] ${type}: OPEN → HALF_OPEN (ready for probe)`);
  }
}
