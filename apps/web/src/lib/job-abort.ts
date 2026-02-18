/**
 * Job abortion signal management.
 * Using globalThis to survive Next.js HMR reloads.
 */

function getAbortSignals(): Map<string, boolean> {
  const g = globalThis as any;
  if (!g.__fhAbortSignals) {
    g.__fhAbortSignals = new Map<string, boolean>();
  }
  return g.__fhAbortSignals;
}

/**
 * Check if a job has been aborted.
 */
export function isJobAborted(jobId: string): boolean {
  return getAbortSignals().get(jobId) === true;
}

/**
 * Clear the abort signal for a job (called after job completion).
 */
export function clearAbortSignal(jobId: string): void {
  getAbortSignals().delete(jobId);
}

/**
 * Set the abort signal for a job.
 */
export function setAbortSignal(jobId: string): void {
  getAbortSignals().set(jobId, true);
}
