import { runMonolithicDynamic } from "@/lib/analyzer/monolithic-dynamic";
import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";
import { debugLog } from "@/lib/analyzer/debug";
import { classifyError } from "@/lib/error-classification";
import {
  recordProviderFailure,
  recordProviderSuccess,
  pauseSystem,
  isSystemPaused,
  getHealthState,
} from "@/lib/provider-health";
import { fireWebhook } from "@/lib/provider-webhook";
import { getEnv } from "@/lib/auth";

type PipelineVariant = "claimboundary" | "monolithic_dynamic";

type RunnerQueueState = {
  runningCount: number;
  queue: Array<{ jobId: string; enqueuedAt: number }>;
  runningJobIds: Set<string>;
  isDraining: boolean;
  drainRequested: boolean;
  watchdogTimer: ReturnType<typeof setInterval> | null;
};

function getRunnerQueueState(): RunnerQueueState {
  const g = globalThis as any;
  if (!g.__fhRunnerQueueState) {
    g.__fhRunnerQueueState = {
      runningCount: 0,
      queue: [],
      runningJobIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
      watchdogTimer: null,
    } satisfies RunnerQueueState;
  }
  const st = g.__fhRunnerQueueState as RunnerQueueState;
  if (!(st as any).runningJobIds || typeof (st as any).runningJobIds.has !== "function") {
    (st as any).runningJobIds = new Set<string>();
  }
  if (!Array.isArray((st as any).queue)) {
    (st as any).queue = [];
  }
  if (typeof (st as any).runningCount !== "number") {
    (st as any).runningCount = 0;
  }
  if (typeof (st as any).isDraining !== "boolean") {
    (st as any).isDraining = false;
  }
  if (typeof (st as any).drainRequested !== "boolean") {
    (st as any).drainRequested = false;
  }
  const watchdog = (st as any).watchdogTimer;
  const isIntervalLike = watchdog === null || typeof watchdog === "object";
  if (!isIntervalLike) {
    (st as any).watchdogTimer = null;
  }
  return st;
}

function getApiBaseOrThrow(): string {
  const apiBaseRaw = getEnv("FH_API_BASE_URL");
  if (!apiBaseRaw) throw new Error("FH_API_BASE_URL not set");
  return apiBaseRaw.replace(/\/$/, "");
}

function getAdminKeyOrNull(): string | null {
  return getEnv("FH_ADMIN_KEY");
}

function getMaxConcurrency(): number {
  return Math.max(
    1,
    Number.parseInt(process.env.FH_RUNNER_MAX_CONCURRENCY ?? "3", 10) || 3,
  );
}

/** Max slots for slow pipelines (claimboundary). Reserves capacity for fast jobs. */
function getMaxSlowConcurrency(): number {
  const maxTotal = getMaxConcurrency();
  const raw = Number.parseInt(process.env.FH_RUNNER_MAX_SLOW_CONCURRENCY ?? "", 10);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.min(raw, maxTotal);
  }
  // Default: total - 1 (reserve at least 1 slot for fast jobs), min 1
  return Math.max(1, maxTotal - 1);
}

function getMaxQueueWaitMs(): number {
  const raw = Number.parseInt(process.env.FH_RUNNER_QUEUE_MAX_WAIT_MS ?? "", 10);
  if (Number.isFinite(raw) && raw >= 60_000) {
    return raw;
  }
  return 6 * 60 * 60 * 1000;
}

function getRunnerWatchdogIntervalMs(): number {
  const raw = Number.parseInt(process.env.FH_RUNNER_WATCHDOG_INTERVAL_MS ?? "", 10);
  if (Number.isFinite(raw) && raw >= 5_000) {
    return raw;
  }
  return 30_000;
}

function parseApiUtcTimestampMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const hasTimezone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function ensureQueueWatchdogStarted(): void {
  const qs = getRunnerQueueState();
  if (qs.watchdogTimer) return;

  const intervalMs = getRunnerWatchdogIntervalMs();
  qs.watchdogTimer = setInterval(() => {
    const state = getRunnerQueueState();
    if (state.queue.length === 0 && state.runningJobIds.size === 0) {
      return;
    }
    void drainRunnerQueue();
  }, intervalMs);

  const timer = qs.watchdogTimer as { unref?: () => void };
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

async function apiGet(apiBase: string, path: string) {
  const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API GET failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPutInternal(apiBase: string, adminKey: string | null, path: string, payload: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminKey) headers["X-Admin-Key"] = adminKey;
  const res = await fetch(`${apiBase}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API PUT failed ${res.status}: ${await res.text()}`);
}

async function runJobBackground(jobId: string) {
  const apiBase = getApiBaseOrThrow();
  const adminKey = getAdminKeyOrNull();
  const qs = getRunnerQueueState();
  let acquiredSlot = false;

  const emit = async (level: "info" | "warn" | "error", message: string, progress?: number) => {
    await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
      status: "RUNNING",
      progress,
      level,
      message,
    });
  };

  try {
    acquiredSlot = true;

    await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
      status: "RUNNING",
      progress: 1,
      level: "info",
      message: "Runner started",
    });

    const job = await apiGet(apiBase, `/v1/jobs/${jobId}`);
    const inputType = job.inputType as "text" | "url";
    const inputValue = job.inputValue as string;
    const pipelineVariant = (job.pipelineVariant || "claimboundary") as PipelineVariant;

    await emit("info", `Preparing input (pipeline: ${pipelineVariant})`, 5);

    let result: any;

    if (pipelineVariant === "claimboundary") {
      result = await runClaimBoundaryAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit(p === 0 ? "warn" : "info", m, p > 0 ? p : undefined),
      });
    } else if (pipelineVariant === "monolithic_dynamic") {
      result = await runMonolithicDynamic({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit(p === 0 ? "warn" : "info", m, p > 0 ? p : undefined),
      });
    } else {
      await emit("warn", `Unknown pipeline variant '${pipelineVariant}', using claimboundary`, 5);
      result = await runClaimBoundaryAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit(p === 0 ? "warn" : "info", m, p > 0 ? p : undefined),
      });
    }

    if (result?.resultJson?.meta) {
      result.resultJson.meta.pipelineVariant = pipelineVariant;
    }

    await emit("info", "Storing result", 95);
    await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/result`, result);

    // **P0 FIX**: Guard against late SUCCEEDED overwrite
    // If job was marked FAILED by stale recovery or cancellation, don't overwrite with SUCCEEDED
    try {
      const currentJob = await apiGet(apiBase, `/v1/jobs/${jobId}`);
      const currentStatus = String(currentJob?.status || "").toUpperCase();

      if (currentStatus === "RUNNING") {
        await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
          status: "SUCCEEDED",
          progress: 100,
          level: "info",
          message: "Done",
        });

        // Only record provider success if the pipeline didn't report provider errors.
        // Search 429/quota errors are caught gracefully inside the pipeline (job still "succeeds")
        // but the circuit breaker must NOT be reset when search was actually broken.
        const warnings: any[] = result?.resultJson?.analysisWarnings ?? [];
        const hadSearchErrors = warnings.some((w: any) => w?.type === "search_provider_error");
        const hadLlmErrors = warnings.some((w: any) => w?.type === "llm_provider_error");
        if (!hadSearchErrors) recordProviderSuccess("search");
        if (!hadLlmErrors) recordProviderSuccess("llm");
      } else {
        console.warn(`[Runner] Job ${jobId} is ${currentStatus}, not updating to SUCCEEDED (late completion after ${currentStatus})`);
      }
    } catch (guardErr) {
      console.error(
        `[Runner] Guard check failed for job ${jobId}; leaving status unchanged to avoid unsafe SUCCEEDED overwrite:`,
        guardErr,
      );
    }
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const stack = typeof e?.stack === "string" ? e.stack : null;

    debugLog("runJobBackground: ERROR", {
      jobId,
      message: msg,
      stack: stack ? stack.split("\n").slice(0, 30).join("\n") : undefined,
    });

    const classified = classifyError(e);
    if (classified.shouldCountAsProviderFailure && classified.provider) {
      const { circuitOpened } = recordProviderFailure(classified.provider, msg);
      if (circuitOpened) {
        const reason = `${classified.provider} provider failed ${classified.category}: ${msg.substring(0, 200)}`;
        pauseSystem(reason);
        void fireWebhook({
          type: "system_paused",
          reason,
          provider: classified.provider,
          timestamp: new Date().toISOString(),
          healthState: getHealthState(),
        });
        debugLog("runJobBackground: SYSTEM PAUSED due to provider failure", {
          jobId,
          provider: classified.provider,
          category: classified.category,
        });
      }
    }

    try {
      await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
        status: "FAILED",
        progress: 100,
        level: "error",
        message: msg,
      });

      if (stack) {
        await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
          status: "FAILED",
          progress: 100,
          level: "error",
          message: `Stack (truncated):\n${stack.split("\n").slice(0, 30).join("\n")}`,
        });
      }
    } catch {}
  } finally {
    const qs2 = getRunnerQueueState();
    if (acquiredSlot) {
      qs2.runningCount = Math.max(0, qs2.runningCount - 1);
    }
    qs2.runningJobIds.delete(jobId);
    void drainRunnerQueue();
  }
}

export function enqueueRunnerJob(jobId: string): { alreadyQueued: boolean; alreadyRunning: boolean } {
  const qs = getRunnerQueueState();
  ensureQueueWatchdogStarted();
  const alreadyQueued = qs.queue.some((x) => x.jobId === jobId);
  const alreadyRunning = qs.runningJobIds.has(jobId);
  if (!alreadyQueued && !alreadyRunning) {
    qs.queue.push({ jobId, enqueuedAt: Date.now() });
  }
  return { alreadyQueued, alreadyRunning };
}

export async function drainRunnerQueue() {
  const qs = getRunnerQueueState();
  ensureQueueWatchdogStarted();
  if (qs.isDraining) {
    qs.drainRequested = true;
    return;
  }
  qs.isDraining = true;

  try {
    if (isSystemPaused()) {
      console.warn("[Runner] System is PAUSED — skipping queue drain. Jobs remain QUEUED until admin resumes.");
      return;
    }

    const apiBase = getApiBaseOrThrow();
    const adminKey = getAdminKeyOrNull();
    const maxConcurrency = getMaxConcurrency();

    const now = Date.now();
    let effectiveRunningCount = qs.runningCount;
    let runningSlowCount = 0; // Track slow (claimboundary) jobs for queue partitioning

    // **P0 FIX**: Detect and recover stale RUNNING jobs
    // Note: runningJobIds is process-local; in multi-process/runtime scenarios it cannot be used
    // for immediate orphan failure. We only recover when the job is actually stale.
    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    try {
      // Fetch all RUNNING jobs from DB (paginated API: { jobs, pagination })
      const runningJobs: Array<{ jobId: string; updatedUtc: string; progress?: number; pipelineVariant?: string }> = [];
      const queuedJobsFromDb: Array<{ jobId: string; createdUtc: string }> = [];
      const pageSize = 200;
      let page = 1;
      let totalPages = 1;

      do {
        const payload = await apiGet(apiBase, `/v1/jobs?page=${page}&pageSize=${pageSize}`);
        const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];

        for (const job of jobs) {
          const status = String(job?.status || "").toUpperCase();
          if (status === "RUNNING") {
            runningJobs.push({
              jobId: String(job.jobId),
              updatedUtc: String(job.updatedUtc),
              progress: typeof job.progress === "number" ? job.progress : 0,
              pipelineVariant: String(job.pipelineVariant || "claimboundary"),
            });
          } else if (status === "QUEUED") {
            queuedJobsFromDb.push({
              jobId: String(job.jobId),
              createdUtc: String(job.createdUtc),
            });
          }
        }

        const reportedTotalPages = Number(payload?.pagination?.totalPages);
        totalPages = Number.isFinite(reportedTotalPages) && reportedTotalPages > 0
          ? reportedTotalPages
          : page;
        page++;
      } while (page <= totalPages);

      let nonStaleRunningCount = 0;
      for (const job of runningJobs) {
        const jobId = job.jobId;
        const wasLocallyRunning = qs.runningJobIds.has(jobId);
        const lastUpdateMs = parseApiUtcTimestampMs(job.updatedUtc);
        if (lastUpdateMs === null) {
          console.warn(`[Runner] Skipping stale check for ${jobId}: invalid updatedUtc "${job.updatedUtc}"`);
          nonStaleRunningCount++;
          if (job.pipelineVariant === "claimboundary") runningSlowCount++;
          continue;
        }
        const staleDurationMs = now - lastUpdateMs;
        const isStale = staleDurationMs > STALE_THRESHOLD_MS;

        if (isStale) {
          const reason = !wasLocallyRunning
            ? `Orphaned stale job (no progress update for ${Math.round(staleDurationMs / 60000)} minutes)`
            : `Stale job (no progress update for ${Math.round(staleDurationMs / 60000)} minutes)`;

          console.warn(`[Runner] Recovering job ${jobId}: ${reason}`);

          await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
            status: "FAILED",
            progress: job.progress || 0,
            level: "error",
            message: `Job failed: ${reason}`,
          });

          // Clean up local state only if this process believed the job was running
          if (wasLocallyRunning) {
            qs.runningJobIds.delete(jobId);
          }
        } else {
          nonStaleRunningCount++;
          if (job.pipelineVariant === "claimboundary") runningSlowCount++;
        }
      }
      effectiveRunningCount = nonStaleRunningCount;
      qs.runningCount = nonStaleRunningCount;

      // Recover persisted QUEUED jobs that may be missing from in-memory queue
      // (e.g., process restart between API enqueue trigger and local queue insertion).
      const inMemoryQueuedIds = new Set(qs.queue.map((item) => item.jobId));
      const sortedQueuedJobs = [...queuedJobsFromDb].sort((a, b) => {
        const aMs = parseApiUtcTimestampMs(a.createdUtc) ?? 0;
        const bMs = parseApiUtcTimestampMs(b.createdUtc) ?? 0;
        return aMs - bMs;
      });

      for (const queuedJob of sortedQueuedJobs) {
        if (qs.runningJobIds.has(queuedJob.jobId)) continue;
        if (inMemoryQueuedIds.has(queuedJob.jobId)) continue;
        const enqueuedAt = parseApiUtcTimestampMs(queuedJob.createdUtc) ?? now;
        qs.queue.push({ jobId: queuedJob.jobId, enqueuedAt });
        inMemoryQueuedIds.add(queuedJob.jobId);
      }
    } catch (err) {
      console.error("[Runner] Stale job recovery check failed:", err);
      // Non-fatal - continue with normal queue processing using in-memory count
    }

    const maxQueueWaitMs = getMaxQueueWaitMs();
    const queueWaitLimitMinutes = Math.round(maxQueueWaitMs / 60_000);
    const remaining: Array<{ jobId: string; enqueuedAt: number }> = [];
    for (const item of qs.queue) {
      const waitedMs = now - item.enqueuedAt;
      if (waitedMs > maxQueueWaitMs) {
        try {
          await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${item.jobId}/status`, {
            status: "FAILED",
            progress: 0,
            level: "error",
            message: `Job timed out waiting in queue (exceeded ${queueWaitLimitMinutes} minute limit)`,
          });
        } catch {}
        continue;
      }
      remaining.push(item);
    }
    qs.queue = remaining;

    const maxSlowConcurrency = getMaxSlowConcurrency();
    const skippedSlowJobs: Array<{ jobId: string; enqueuedAt: number }> = [];

    while (effectiveRunningCount < maxConcurrency && qs.queue.length > 0) {
      const next = qs.queue.shift();
      if (!next) break;
      if (qs.runningJobIds.has(next.jobId)) continue;

      let jobVariant: PipelineVariant | null = null;
      try {
        const j = await apiGet(apiBase, `/v1/jobs/${next.jobId}`);
        const st = String(j?.status || "").toUpperCase();
        if (st !== "QUEUED") {
          continue;
        }
        jobVariant = (j.pipelineVariant || "claimboundary") as PipelineVariant;
      } catch {}
      // If we couldn't determine variant, don't classify as slow — avoid starving unknown jobs
      if (!jobVariant) jobVariant = "monolithic_dynamic";

      // Queue partitioning: cap slow (claimboundary) jobs to reserve slots for fast jobs
      const isSlow = jobVariant === "claimboundary";
      if (isSlow && runningSlowCount >= maxSlowConcurrency) {
        skippedSlowJobs.push(next);
        continue;
      }

      effectiveRunningCount++;
      if (isSlow) runningSlowCount++;
      qs.runningCount = effectiveRunningCount;
      qs.runningJobIds.add(next.jobId);
      void runJobBackground(next.jobId);
    }

    // Re-queue skipped slow jobs (they'll be picked up when a CB slot frees)
    if (skippedSlowJobs.length > 0) {
      qs.queue.unshift(...skippedSlowJobs);
    }
  } finally {
    qs.isDraining = false;
    if (qs.drainRequested) {
      qs.drainRequested = false;
      void drainRunnerQueue();
    }
  }
}

// Bootstrap: start watchdog on module load so persisted QUEUED jobs are
// recovered after a process restart without waiting for a new job trigger.
// Short delay lets the server finish initializing before the first drain
// attempts API calls (failures are non-fatal and retry on next watchdog tick).
ensureQueueWatchdogStarted();
setTimeout(() => void drainRunnerQueue(), 5_000);
