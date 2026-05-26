/**
 * Process-global minimum-interval throttle for search providers.
 *
 * Google-CSE enforces a "Queries per minute per user" cap. With runner concurrency 3,
 * parallel research searches burst past that cap and return HTTP 429, which forces the
 * pipeline to fall back to other providers mid-run. Because the fallback changes which
 * sources a run sees, this is a measured driver of verdict variance (same input ->
 * different evidence pool). Spacing CSE calls a fixed minimum apart smooths the bursts.
 */

export function createMinIntervalThrottle(intervalMs: number): () => Promise<void> {
  let gate: Promise<unknown> = Promise.resolve();
  let lastStart = 0;

  return function acquire(): Promise<void> {
    const run = gate.then(async () => {
      if (intervalMs <= 0) {
        lastStart = Date.now();
        return;
      }
      const now = Date.now();
      const wait = Math.max(0, lastStart + intervalMs - now);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      lastStart = Date.now();
    });
    // Keep the gate chain alive even if a waiter is cancelled/rejected upstream.
    gate = run.catch(() => {});
    return run;
  };
}

// Shared instance for Google-CSE. Default 700ms (~85 req/min) stays under the
// typical per-minute-per-user cap with margin. Set GOOGLE_CSE_MIN_INTERVAL_MS=0 to disable.
const GOOGLE_CSE_MIN_INTERVAL_MS = Number(process.env.GOOGLE_CSE_MIN_INTERVAL_MS) || 700;

export const acquireGoogleCseSlot = createMinIntervalThrottle(GOOGLE_CSE_MIN_INTERVAL_MS);
