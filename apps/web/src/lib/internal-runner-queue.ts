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

type PipelineVariant = "claimboundary";

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
    const requestedVariant = (job.pipelineVariant || "claimboundary") as string;

    await emit("info", "Preparing input (pipeline: claimboundary)", 5);

    let result: any;

    result = await runClaimBoundaryAnalysis({
      jobId,
      inputType,
      inputValue,
      onEvent: async (m, p) => emit(p === 0 ? "warn" : "info", m, p > 0 ? p : undefined),
    });

    if (result?.resultJson?.meta) {
      result.resultJson.meta.pipelineVariant = "claimboundary";
      if (requestedVariant !== "claimboundary") {
        result.resultJson.meta.pipelineVariantRequested = requestedVariant;
      }
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

    // Detect and recover orphaned/stale RUNNING jobs.
    // runningJobIds is process-local — after a restart it's empty. Any job that the DB says
    // is RUNNING but isn't in our local set was orphaned by the restart. These are immediately
    // re-queued (not failed) so they run again from scratch. Jobs that ARE locally tracked but
    // haven't updated in 15 minutes are genuinely stale and get failed.
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
          continue;
        }
        const staleDurationMs = now - lastUpdateMs;
        const isStale = staleDurationMs > STALE_THRESHOLD_MS;

        if (!wasLocallyRunning) {
          // Job is RUNNING in DB but not tracked by this process — orphaned by a restart.
          // Re-queue immediately instead of waiting for the 15-minute stale threshold.
          // The job will start from scratch (no intermediate state is persisted).
          console.warn(`[Runner] Re-queuing orphaned job ${jobId} (was RUNNING but not tracked by this process)`);
          await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
            status: "QUEUED",
            progress: 0,
            level: "info",
            message: "Re-queued after application restart (previous execution lost)",
          });
          // Add to the QUEUED recovery list so it gets picked up below
          queuedJobsFromDb.push({ jobId, createdUtc: job.updatedUtc });
        } else if (isStale) {
          const reason = `Stale job (no progress update for ${Math.round(staleDurationMs / 60000)} minutes)`;

          console.warn(`[Runner] Failing stale job ${jobId}: ${reason}`);

          await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
            status: "FAILED",
            progress: job.progress || 0,
            level: "error",
            message: `Job failed: ${reason}`,
          });

          qs.runningJobIds.delete(jobId);
        } else {
          nonStaleRunningCount++;
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
      // All jobs are claimboundary now — no queue partitioning needed
      if (!jobVariant) jobVariant = "claimboundary";

      effectiveRunningCount++;
      qs.runningCount = effectiveRunningCount;
      qs.runningJobIds.add(next.jobId);
      void runJobBackground(next.jobId);
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
