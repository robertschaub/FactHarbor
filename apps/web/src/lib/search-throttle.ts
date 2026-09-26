/**
 * Process-global minimum-interval throttle for search providers.
 *
 * Google-CSE enforces a "Queries per minute per user" cap. With runner concurrency 3,
 * parallel research searches burst past that cap and return HTTP 429, which forces the
 * pipeline to fall back to other providers mid-run. Because the fallback changes which
 * sources a run sees, this is a measured driver of verdict variance (same input ->
 * different evidence pool). Spacing CSE calls a fixed minimum apart smooths the bursts.
 */

export function createMinIntervalThrottle(intervalMs: number): (abortSignal?: AbortSignal) => Promise<void> {
  let gate: Promise<unknown> = Promise.resolve();
  let lastStart = 0;

  return function acquire(abortSignal?: AbortSignal): Promise<void> {
    if (abortSignal?.aborted) return Promise.reject(abortSignal.reason);
    // Each waiter owns its listener; native composition avoids listener growth on
    // one request signal when several provider queries share the queue.
    const signal = abortSignal ? AbortSignal.any([abortSignal]) : undefined;
    let cancelWait: (() => void) | undefined;
    const run = gate.then(async () => {
      signal?.throwIfAborted();
      const now = Date.now();
      const wait = intervalMs <= 0 ? 0 : Math.max(0, lastStart + intervalMs - now);
      if (wait > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { cancelWait = undefined; resolve(); }, wait);
          cancelWait = () => {
            clearTimeout(timer);
            cancelWait = undefined;
            reject(signal!.reason);
          };
        });
      }
      signal?.throwIfAborted();
      lastStart = Date.now();
    });
    // Cancelled entries skip their slot without consuming the interval or
    // poisoning the existing queue. Active cancellation also clears its timer.
    gate = run.catch(() => {});
    if (!signal) return run;
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => signal.removeEventListener("abort", onAbort);
      const onAbort = () => { cancelWait?.(); cleanup(); reject(signal.reason); };
      signal.addEventListener("abort", onAbort, { once: true });
      void run.then(() => { cleanup(); resolve(); }, error => { cleanup(); reject(error); });
      if (signal.aborted) onAbort();
    });
  };
}

// Shared instance for Google-CSE. Default 700ms (~85 req/min) stays under the
// typical per-minute-per-user cap with margin. Set GOOGLE_CSE_MIN_INTERVAL_MS=0 to disable.
const GOOGLE_CSE_MIN_INTERVAL_MS = Number(process.env.GOOGLE_CSE_MIN_INTERVAL_MS) || 700;

export const acquireGoogleCseSlot = createMinIntervalThrottle(GOOGLE_CSE_MIN_INTERVAL_MS);
