import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";
import { prepareStage1Snapshot } from "@/lib/analyzer/claimboundary-pipeline";
import { generateClaimSelectionRecommendation } from "@/lib/analyzer/claim-selection-recommendation";
import { debugLog, runWithDebugLogContext } from "@/lib/analyzer/debug";
import { probeLLMConnectivity } from "@/lib/connectivity-probe";
import { classifyError, isNetworkConnectivityFailureText } from "@/lib/error-classification";
import {
  recordProviderFailure,
  recordProviderSuccess,
  pauseSystem,
  resumeSystem,
  isSystemPaused,
  getHealthState,
} from "@/lib/provider-health";
import { fireWebhook } from "@/lib/provider-webhook";
import { getEnv } from "@/lib/auth";
import { getWebGitCommitHash } from "@/lib/build-info";
import {
  getClaimSelectionCap,
  normalizeClaimSelectionCap,
  normalizeClaimSelectionIdleAutoProceedMs,
  shouldAutoContinueWithoutSelection,
} from "@/lib/claim-selection-flow";
import { loadPipelineConfig } from "@/lib/config-loader";
import type {
  ClaimSelectionDraftObservability,
  ClaimSelectionMetadata,
  ClaimSelectionDraftState,
  ClaimSelectionStage1Observability,
  PreparedStage1Snapshot,
} from "@/lib/analyzer/types";

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

function parsePositiveConcurrency(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return parsed;
  }
  return fallback;
}

export function resolveRunnerConcurrencyBudget(env: NodeJS.ProcessEnv = process.env): {
  jobMaxConcurrency: number;
  draftPreparationMaxConcurrency: number;
} {
  const legacySharedMaxConcurrency = parsePositiveConcurrency(env.FH_RUNNER_MAX_CONCURRENCY, 3);
  return {
    jobMaxConcurrency: parsePositiveConcurrency(
      env.FH_RUNNER_JOB_MAX_CONCURRENCY,
      legacySharedMaxConcurrency,
    ),
    draftPreparationMaxConcurrency: parsePositiveConcurrency(
      env.FH_RUNNER_PREP_MAX_CONCURRENCY,
      1,
    ),
  };
}

function getJobMaxConcurrency(): number {
  return resolveRunnerConcurrencyBudget().jobMaxConcurrency;
}

function getDraftPreparationMaxConcurrency(): number {
  return resolveRunnerConcurrencyBudget().draftPreparationMaxConcurrency;
}

function getMaxQueueWaitMs(): number {
  const raw = Number.parseInt(process.env.FH_RUNNER_QUEUE_MAX_WAIT_MS ?? "", 10);
  if (Number.isFinite(raw) && raw >= 60_000) {
    return raw;
  }
  return 6 * 60 * 60 * 1000;
}

const STALE_RUNNING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check whether the current system pause was caused by a network-connectivity failure
 * (DNS, TCP refused, fetch layer) rather than a provider-side issue (auth, rate limit,
 * capacity). Only network-caused pauses should auto-resume on connectivity recovery —
 * auth/rate-limit pauses require the root cause to be resolved first.
 */
function isPausedDueToNetwork(): boolean {
  const health = getHealthState();
  if (!health.systemPaused) return false;
  // Check pause reason
  const reason = health.pauseReason ?? "";
  if (isNetworkConnectivityFailureText(reason)) return true;
  // Check last LLM failure message (covers cases where pause reason is generic)
  const llmLastMsg = health.providers.llm?.lastFailureMessage ?? "";
  if (isNetworkConnectivityFailureText(llmLastMsg)) return true;
  return false;
}

/**
 * Lightweight probe to check if LLM providers are reachable again.
 * Only runs when the pause was caused by a network-connectivity failure.
 * If reachable, auto-resumes the system and returns true.
 * Any transport failure returns false without side effects.
 */
async function probeAndMaybeResume(): Promise<boolean> {
  // Guard: only auto-resume for network-caused pauses.
  // Auth failures, rate limits, and provider-side outages should not auto-clear
  // just because the server is reachable — the root cause persists.
  if (!isPausedDueToNetwork()) {
    return false;
  }

  const probe = await probeLLMConnectivity({ provider: "anthropic" });
  if (!probe.reachable) {
    return false;
  }

  console.log(
    `[Runner] Auto-resume probe succeeded (HTTP ${probe.statusCode ?? "unknown"}). Network connectivity restored — resuming system.`,
  );
  resumeSystem();
  return true;
}

function getRunnerWatchdogIntervalMs(): number {
  const raw = Number.parseInt(process.env.FH_RUNNER_WATCHDOG_INTERVAL_MS ?? "", 10);
  if (Number.isFinite(raw) && raw >= 5_000) {
    return raw;
  }
  return 30_000;
}

export function getRunnerHeartbeatIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number.parseInt(env.FH_RUNNER_HEARTBEAT_INTERVAL_MS ?? "", 10);
  if (Number.isFinite(raw) && raw >= 15_000) {
    return raw;
  }
  return 60_000;
}

function parseApiUtcTimestampMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const hasTimezone = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

type DraftRecoverySnapshot = {
  draftId: string;
  status: string;
  createdUtc: string;
  updatedUtc: string;
};

function normalizeDraftRecoverySnapshot(draft: any): DraftRecoverySnapshot | null {
  const draftId = String(draft?.draftId || "");
  if (!draftId) return null;

  return {
    draftId,
    status: String(draft?.status || "").toUpperCase(),
    createdUtc: String(draft?.createdUtc || ""),
    updatedUtc: String(draft?.updatedUtc || ""),
  };
}

function ensureQueueWatchdogStarted(): void {
  const qs = getRunnerQueueState();
  if (qs.watchdogTimer) return;

  const intervalMs = getRunnerWatchdogIntervalMs();
  qs.watchdogTimer = setInterval(() => {
    void drainRunnerQueue();
    void drainDraftQueue();
  }, intervalMs);

  const timer = qs.watchdogTimer as { unref?: () => void };
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

function buildAdminHeaders(adminKey: string | null): Record<string, string> | undefined {
  if (!adminKey) return undefined;
  return { "X-Admin-Key": adminKey };
}

async function apiGet(apiBase: string, adminKey: string | null, path: string) {
  const res = await fetch(`${apiBase}${path}`, {
    cache: "no-store",
    headers: buildAdminHeaders(adminKey),
  });
  if (!res.ok) throw new Error(`API GET failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPutInternal(apiBase: string, adminKey: string | null, path: string, payload: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(buildAdminHeaders(adminKey) ?? {}),
  };
  const res = await fetch(`${apiBase}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API PUT failed ${res.status}: ${await res.text()}`);
}

async function apiPost(apiBase: string, adminKey: string | null, path: string, payload: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(buildAdminHeaders(adminKey) ?? {}),
  };
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API POST failed ${res.status}: ${await res.text()}`);
  return res.json();
}

type RunnerSlotClaimResult = {
  claimed: boolean;
  reason: string;
  status?: string | null;
  runningCount?: number;
};

async function claimRunnerSlot(
  apiBase: string,
  adminKey: string | null,
  jobId: string,
  maxConcurrency: number,
  executedWebGitCommitHash: string | null,
): Promise<RunnerSlotClaimResult> {
  const payload = await apiPost(apiBase, adminKey, `/internal/v1/jobs/${jobId}/claim-runner`, {
    maxConcurrency,
    executedWebGitCommitHash,
  });

  return {
    claimed: payload?.claimed === true,
    reason: typeof payload?.reason === "string" ? payload.reason : "unknown",
    status: typeof payload?.status === "string" ? payload.status : null,
    runningCount: typeof payload?.runningCount === "number" ? payload.runningCount : undefined,
  };
}

export function normalizeRunningProgress(progress?: number): number | undefined {
  if (typeof progress !== "number") return progress;
  return progress >= 100 ? 99 : progress;
}

export function normalizeDraftPreparationProgress(progress?: number): number | undefined {
  const normalized = normalizeRunningProgress(progress);
  if (typeof normalized !== "number") return normalized;
  return normalized > 0 ? normalized : undefined;
}

export function getAutomaticRecommendationSelection(
  selectionMode: string,
  recommendedClaimIds: string[],
  selectionCap?: number,
): string[] | undefined {
  if (selectionMode !== "automatic") return undefined;

  const uniqueRecommendedClaimIds = Array.from(
    new Set(
      recommendedClaimIds.filter(
        (claimId): claimId is string => typeof claimId === "string" && claimId.trim().length > 0,
      ),
    ),
  );
  if (uniqueRecommendedClaimIds.length === 0) return undefined;

  return uniqueRecommendedClaimIds.slice(0, normalizeClaimSelectionCap(selectionCap));
}

async function runJobBackground(jobId: string) {
  return runWithDebugLogContext(`[job:${jobId}|analysis]`, async () => {
    const apiBase = getApiBaseOrThrow();
    const adminKey = getAdminKeyOrNull();
    const qs = getRunnerQueueState();
    const executedWebGitCommitHash = getWebGitCommitHash();
    let lastStageEventAt = Date.now();
    let lastStageMessage = "Starting analysis";
    let lastStageProgress: number | undefined;
    let heartbeatStopped = false;
    let heartbeatInFlight: Promise<void> | null = null;
    const heartbeatIntervalMs = getRunnerHeartbeatIntervalMs();

    const sendRunnerHeartbeat = async () => {
      if (heartbeatStopped || heartbeatInFlight) return;
      const staleForMs = Date.now() - lastStageEventAt;
      if (staleForMs < heartbeatIntervalMs) return;

      heartbeatInFlight = (async () => {
        try {
          if (heartbeatStopped) return;
          const staleForSeconds = Math.max(1, Math.round(staleForMs / 1000));
          await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
            status: "RUNNING",
            progress: normalizeRunningProgress(lastStageProgress),
            level: "info",
            message: `Still running (${staleForSeconds}s since last stage event): ${lastStageMessage}`,
          });
        } catch (err) {
          console.warn(`[Runner] Heartbeat update failed for job ${jobId}:`, err);
        } finally {
          heartbeatInFlight = null;
        }
      })();

      await heartbeatInFlight;
    };

    const heartbeatTimer = setInterval(() => {
      void sendRunnerHeartbeat();
    }, heartbeatIntervalMs);
    const heartbeatTimerHandle = heartbeatTimer as { unref?: () => void };
    if (typeof heartbeatTimerHandle.unref === "function") {
      heartbeatTimerHandle.unref();
    }

    const stopRunnerHeartbeat = async () => {
      heartbeatStopped = true;
      clearInterval(heartbeatTimer);
      if (heartbeatInFlight) {
        await heartbeatInFlight;
      }
    };

    const emit = async (level: "info" | "warn" | "error", message: string, progress?: number) => {
      lastStageEventAt = Date.now();
      lastStageMessage = message;
      if (typeof progress === "number" && progress > 0) {
        lastStageProgress = progress;
      }
      await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
        status: "RUNNING",
        progress: normalizeRunningProgress(progress),
        level,
        message,
      });
    };

    try {
    const job = await apiGet(apiBase, adminKey, `/v1/jobs/${jobId}`);
    const inputType = job.inputType as "text" | "url";
    const inputValue = job.inputValue as string;
    const requestedVariant = (job.pipelineVariant || "claimboundary") as string;
    const hasPreparedStage1Json =
      typeof job.preparedStage1Json === "string" && job.preparedStage1Json.trim().length > 0;
    const hasClaimSelectionJson =
      typeof job.claimSelectionJson === "string" && job.claimSelectionJson.trim().length > 0;
    const preparedStage1 = parseOptionalJson<PreparedStage1Snapshot>(job.preparedStage1Json);
    const claimSelection = parseOptionalJson<ClaimSelectionMetadata>(job.claimSelectionJson);
    const selectedClaimIds = Array.isArray(claimSelection?.selectedClaimIds)
      ? claimSelection.selectedClaimIds
      : undefined;

    if (hasPreparedStage1Json && !preparedStage1) {
      throw new Error("Job contains PreparedStage1Json but it could not be parsed");
    }

    if (hasPreparedStage1Json) {
      if (!hasClaimSelectionJson || !claimSelection || !selectedClaimIds || selectedClaimIds.length === 0) {
        throw new Error("Draft-backed job is missing valid claim-selection metadata");
      }
      if (new Set(selectedClaimIds).size !== selectedClaimIds.length) {
        throw new Error("Draft-backed job contains duplicate selected claim IDs");
      }
      const candidateClaimIds = new Set(
        Array.isArray(preparedStage1?.preparedUnderstanding?.atomicClaims)
          ? preparedStage1.preparedUnderstanding.atomicClaims.map((claim) => claim.id)
          : [],
      );
      if (candidateClaimIds.size === 0) {
        throw new Error("Draft-backed job is missing prepared candidate claims");
      }
      const invalidSelectedClaimIds = selectedClaimIds.filter((claimId) => !candidateClaimIds.has(claimId));
      if (invalidSelectedClaimIds.length > 0) {
        throw new Error(
          `Draft-backed job contains selected claim IDs outside the prepared candidate set: ${invalidSelectedClaimIds.join(", ")}`,
        );
      }
    }

    await emit("info", "Preparing input (pipeline: claimboundary)", 5);

    let result: any;

    result = await runClaimBoundaryAnalysis({
      jobId,
      inputType,
      inputValue,
      preparedStage1,
      selectedClaimIds,
      onEvent: async (m, p) => emit(p === 0 ? "warn" : "info", m, p > 0 ? p : undefined),
    });

    if (result?.resultJson?.meta) {
      result.resultJson.meta.pipelineVariant = "claimboundary";
      result.resultJson.meta.executedWebGitCommitHash = executedWebGitCommitHash;
      if (requestedVariant !== "claimboundary") {
        result.resultJson.meta.pipelineVariantRequested = requestedVariant;
      }
    }

    await stopRunnerHeartbeat();
    await emit("info", "Storing result", 95);
    await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/result`, result);

    // **P0 FIX**: Guard against late SUCCEEDED overwrite
    // If job was marked FAILED by stale recovery or cancellation, don't overwrite with SUCCEEDED
    try {
      const currentJob = await apiGet(apiBase, adminKey, `/v1/jobs/${jobId}`);
      const currentStatus = String(currentJob?.status || "").toUpperCase();

      if (currentStatus === "RUNNING") {
        await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
          status: "SUCCEEDED",
          progress: 100,
          level: "info",
          message: "Done",
          executedWebGitCommitHash,
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
      await stopRunnerHeartbeat();
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
          executedWebGitCommitHash,
        });

        if (stack) {
          await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
            status: "FAILED",
            progress: 100,
            level: "error",
            message: `Stack (truncated):\n${stack.split("\n").slice(0, 30).join("\n")}`,
            executedWebGitCommitHash,
          });
        }
      } catch {}
    } finally {
      await stopRunnerHeartbeat();
      const qs2 = getRunnerQueueState();
      qs2.runningCount = Math.max(0, qs2.runningCount - 1);
      qs2.runningJobIds.delete(jobId);
      void drainRunnerQueue();
    }
  });
}

function parseOptionalJson<T>(value: unknown): T | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
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
      // Auto-resume probe: if the system was paused by the circuit breaker (e.g., internet outage),
      // try a lightweight connectivity check. If the LLM provider is reachable again, auto-resume.
      if (qs.queue.length > 0) {
        const recovered = await probeAndMaybeResume();
        if (!recovered) {
          console.warn("[Runner] System is PAUSED — skipping queue drain. Jobs remain QUEUED until connectivity recovers or admin resumes.");
          return;
        }
        // System resumed — fall through to normal drain logic
      } else {
        console.warn("[Runner] System is PAUSED — no queued jobs. Skipping drain.");
        return;
      }
    }

    const apiBase = getApiBaseOrThrow();
    const adminKey = getAdminKeyOrNull();
    const maxConcurrency = getJobMaxConcurrency();

    const now = Date.now();
    let effectiveRunningCount = qs.runningCount;

    // Detect and recover orphaned/stale RUNNING jobs.
    // runningJobIds is process-local — after a restart it's empty. Any job that the DB says
    // is RUNNING but isn't in our local set was orphaned by the restart. These are immediately
    // re-queued (not failed) so they run again from scratch. Jobs that ARE locally tracked but
    // haven't updated in 15 minutes are genuinely stale and get failed.
    try {
      // Fetch all RUNNING jobs from DB (paginated API: { jobs, pagination })
      const runningJobs: Array<{ jobId: string; updatedUtc: string; progress?: number; pipelineVariant?: string }> = [];
      const queuedJobsFromDb: Array<{ jobId: string; createdUtc: string }> = [];
      const interruptedJobIds = new Set<string>();
      const pageSize = 200;
      let page = 1;
      let totalPages = 1;

      do {
        const payload = await apiGet(apiBase, adminKey, `/v1/jobs?page=${page}&pageSize=${pageSize}`);
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
          } else if (status === "INTERRUPTED") {
            // INTERRUPTED jobs were RUNNING when the API restarted. The API marks
            // them INTERRUPTED on startup. Re-queue them so they run again from scratch.
            const jid = String(job.jobId);
            queuedJobsFromDb.push({ jobId: jid, createdUtc: String(job.createdUtc) });
            interruptedJobIds.add(jid);
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
        const isStale = staleDurationMs > STALE_RUNNING_THRESHOLD_MS;

        if (!wasLocallyRunning) {
          let liveJob: any;
          try {
            liveJob = await apiGet(apiBase, adminKey, `/v1/jobs/${jobId}`);
          } catch (err) {
            console.warn(`[Runner] Skipping orphan recovery for ${jobId}: failed to refresh live status`, err);
            nonStaleRunningCount++;
            continue;
          }

          const liveStatus = String(liveJob?.status || "").toUpperCase();
          const liveUpdatedUtc = String(liveJob?.updatedUtc || "");
          const snapshotStillCurrent = liveUpdatedUtc === job.updatedUtc;
          if (liveStatus !== "RUNNING" || !snapshotStillCurrent) {
            console.info(
              `[Runner] Skipping orphan recovery for ${jobId}: snapshot stale or job no longer RUNNING ` +
              `(snapshot updatedUtc=${job.updatedUtc}, live status=${liveStatus || "unknown"}, live updatedUtc=${liveUpdatedUtc || "missing"})`,
            );
            if (liveStatus === "RUNNING") {
              nonStaleRunningCount++;
            }
            continue;
          }

          // Job is still RUNNING in DB with the same updatedUtc but is not tracked by this
          // process. Treat it as orphaned by a restart and re-queue it immediately instead
          // of waiting for the 15-minute stale threshold.
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

      // Recover persisted QUEUED and INTERRUPTED jobs that may be missing from in-memory queue.
      // QUEUED: lost between API trigger and local queue insertion (process restart).
      // INTERRUPTED: were RUNNING when API restarted; API marked them INTERRUPTED on startup.
      // Both are re-queued to run from scratch.
      const inMemoryQueuedIds = new Set(qs.queue.map((item) => item.jobId));
      const sortedQueuedJobs = [...queuedJobsFromDb].sort((a, b) => {
        const aMs = parseApiUtcTimestampMs(a.createdUtc) ?? 0;
        const bMs = parseApiUtcTimestampMs(b.createdUtc) ?? 0;
        return aMs - bMs;
      });

      for (const queuedJob of sortedQueuedJobs) {
        if (qs.runningJobIds.has(queuedJob.jobId)) continue;
        if (inMemoryQueuedIds.has(queuedJob.jobId)) continue;

        // INTERRUPTED jobs need their DB status reset to QUEUED so the drain loop accepts them.
        if (interruptedJobIds.has(queuedJob.jobId)) {
          try {
            console.info(`[Runner] Re-queuing INTERRUPTED job ${queuedJob.jobId} for fresh execution`);
            await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${queuedJob.jobId}/status`, {
              status: "QUEUED",
              progress: 0,
              level: "info",
              message: "Re-queued after application restart (previous execution interrupted)",
            });
          } catch (err) {
            console.warn(`[Runner] Failed to reset INTERRUPTED job ${queuedJob.jobId} to QUEUED:`, err);
          }
        }

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
        const j = await apiGet(apiBase, adminKey, `/v1/jobs/${next.jobId}`);
        const st = String(j?.status || "").toUpperCase();
        if (st !== "QUEUED") {
          continue;
        }
        jobVariant = (j.pipelineVariant || "claimboundary") as PipelineVariant;
      } catch {}
      // All jobs are claimboundary now — no queue partitioning needed
      if (!jobVariant) jobVariant = "claimboundary";

      let claim: RunnerSlotClaimResult;
      try {
        claim = await claimRunnerSlot(
          apiBase,
          adminKey,
          next.jobId,
          maxConcurrency,
          getWebGitCommitHash(),
        );
      } catch (err) {
        console.warn(`[Runner] Failed to claim runner slot for ${next.jobId}:`, err);
        qs.queue.unshift(next);
        break;
      }

      if (!claim.claimed) {
        if (claim.reason === "capacity_full") {
          if (typeof claim.runningCount === "number") {
            effectiveRunningCount = claim.runningCount;
            qs.runningCount = claim.runningCount;
          }
          qs.queue.unshift(next);
          break;
        }
        console.info(
          `[Runner] Skipping ${next.jobId}: runner slot was not claimed ` +
          `(reason=${claim.reason}, status=${claim.status ?? "unknown"})`,
        );
        continue;
      }

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

// ---------------------------------------------------------------------------
// DRAFT PREPARATION QUEUE (ACS-1)
// Uses its own preparation lane so Stage 1 work is not starved by long-running report jobs.
// ---------------------------------------------------------------------------

type DraftQueueState = {
  runningCount: number;
  queue: Array<{ draftId: string; enqueuedAt: number }>;
  runningDraftIds: Set<string>;
  isDraining: boolean;
  drainRequested: boolean;
};

function getDraftQueueState(): DraftQueueState {
  const g = globalThis as any;
  if (!g.__fhDraftQueueState) {
    g.__fhDraftQueueState = {
      runningCount: 0,
      queue: [],
      runningDraftIds: new Set<string>(),
      isDraining: false,
      drainRequested: false,
    } satisfies DraftQueueState;
  }
  const st = g.__fhDraftQueueState as DraftQueueState;
  if (!(st as any).runningDraftIds || typeof (st as any).runningDraftIds.has !== "function") {
    (st as any).runningDraftIds = new Set<string>();
  }
  if (typeof (st as any).runningCount !== "number") {
    (st as any).runningCount = 0;
  }
  if (!Array.isArray((st as any).queue)) {
    (st as any).queue = [];
  }
  return st;
}

export function enqueueDraftPreparation(draftId: string): { alreadyQueued: boolean; alreadyRunning: boolean } {
  const ds = getDraftQueueState();
  ensureQueueWatchdogStarted();
  const alreadyQueued = ds.queue.some((x) => x.draftId === draftId);
  const alreadyRunning = ds.runningDraftIds.has(draftId);
  if (!alreadyQueued && !alreadyRunning) {
    ds.queue.push({ draftId, enqueuedAt: Date.now() });
  }
  return { alreadyQueued, alreadyRunning };
}

export async function drainDraftQueue() {
  const ds = getDraftQueueState();
  ensureQueueWatchdogStarted();

  if (ds.isDraining) {
    ds.drainRequested = true;
    return;
  }
  ds.isDraining = true;

  try {
    if (isSystemPaused()) {
      if (ds.queue.length > 0) {
        const recovered = await probeAndMaybeResume();
        if (!recovered) return;
      } else {
        return;
      }
    }

    const maxConcurrency = getDraftPreparationMaxConcurrency();
    const apiBase = getApiBaseOrThrow();
    const adminKey = getAdminKeyOrNull();
    const now = Date.now();

    try {
      const payload = await apiGet(apiBase, adminKey, `/internal/v1/claim-selection-drafts/recoverable`);
      const recoverableDrafts = Array.isArray(payload?.drafts) ? payload.drafts : [];
      const inMemoryQueuedIds = new Set(ds.queue.map((item) => item.draftId));
      const sortedDrafts = [...recoverableDrafts].sort((a, b) => {
        const aMs = parseApiUtcTimestampMs(a?.createdUtc) ?? 0;
        const bMs = parseApiUtcTimestampMs(b?.createdUtc) ?? 0;
        return aMs - bMs;
      });

      for (const draft of sortedDrafts) {
        const snapshot = normalizeDraftRecoverySnapshot(draft);
        if (!snapshot) continue;

        const draftId = snapshot.draftId;
        let status = snapshot.status;
        if (ds.runningDraftIds.has(draftId)) {
          if (status === "PREPARING") {
            const lastUpdateMs = parseApiUtcTimestampMs(snapshot.updatedUtc);
            if (lastUpdateMs === null) {
              console.warn(`[Runner] Skipping stale draft check for ${draftId}: invalid updatedUtc "${snapshot.updatedUtc}"`);
              continue;
            }

            const staleDurationMs = now - lastUpdateMs;
            if (staleDurationMs > STALE_RUNNING_THRESHOLD_MS) {
              let liveDraft: DraftRecoverySnapshot | null = null;
              try {
                liveDraft = normalizeDraftRecoverySnapshot(
                  await apiGet(apiBase, adminKey, `/v1/claim-selection-drafts/${draftId}`),
                );
              } catch (err) {
                console.warn(`[Runner] Skipping stale draft failure for ${draftId}: failed to refresh live status`, err);
                continue;
              }

              if (!liveDraft) {
                console.warn(`[Runner] Skipping stale draft failure for ${draftId}: live draft response was invalid`);
                continue;
              }

              const snapshotStillCurrent = liveDraft.updatedUtc === snapshot.updatedUtc;
              if (liveDraft.status !== "PREPARING" || !snapshotStillCurrent) {
                console.info(
                  `[Runner] Skipping stale draft failure for ${draftId}: snapshot stale or draft no longer PREPARING ` +
                  `(snapshot updatedUtc=${snapshot.updatedUtc}, live status=${liveDraft.status || "unknown"}, live updatedUtc=${liveDraft.updatedUtc || "missing"})`,
                );
                if (liveDraft.status !== "PREPARING") {
                  ds.runningDraftIds.delete(draftId);
                  ds.runningCount = Math.max(0, ds.runningCount - 1);
                }
                continue;
              }

              const liveLastUpdateMs = parseApiUtcTimestampMs(liveDraft.updatedUtc);
              if (liveLastUpdateMs === null) {
                console.warn(`[Runner] Skipping stale draft failure for ${draftId}: invalid live updatedUtc "${liveDraft.updatedUtc}"`);
                continue;
              }

              const liveStaleDurationMs = now - liveLastUpdateMs;
              if (liveStaleDurationMs <= STALE_RUNNING_THRESHOLD_MS) {
                continue;
              }

              const reason = `Stale draft preparation (no progress update for ${Math.round(liveStaleDurationMs / 60000)} minutes)`;
              console.warn(`[Runner] Failing stale draft preparation ${draftId}: ${reason}`);
              await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/failed`, {
                errorCode: "stage1_failed",
                errorMessage: reason,
              });
              ds.runningDraftIds.delete(draftId);
              ds.runningCount = Math.max(0, ds.runningCount - 1);
            }
          }
          continue;
        }
        if (inMemoryQueuedIds.has(draftId)) continue;

        if (status === "PREPARING") {
          let liveDraft: DraftRecoverySnapshot | null = null;
          try {
            liveDraft = normalizeDraftRecoverySnapshot(
              await apiGet(apiBase, adminKey, `/v1/claim-selection-drafts/${draftId}`),
            );
          } catch (err) {
            console.warn(`[Runner] Skipping PREPARING draft reset for ${draftId}: failed to refresh live status`, err);
            continue;
          }

          if (!liveDraft) {
            console.warn(`[Runner] Skipping PREPARING draft reset for ${draftId}: live draft response was invalid`);
            continue;
          }

          const snapshotStillCurrent = liveDraft.updatedUtc === snapshot.updatedUtc;
          if (liveDraft.status !== "PREPARING") {
            if (liveDraft.status === "QUEUED") {
              status = "QUEUED";
            } else {
              console.info(
                `[Runner] Skipping PREPARING draft reset for ${draftId}: live status is ${liveDraft.status || "unknown"}`,
              );
              continue;
            }
          } else if (!snapshotStillCurrent) {
            console.info(
              `[Runner] Skipping PREPARING draft reset for ${draftId}: snapshot stale ` +
              `(snapshot updatedUtc=${snapshot.updatedUtc}, live updatedUtc=${liveDraft.updatedUtc || "missing"})`,
            );
            continue;
          }

          try {
            await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/status`, {
              status: "QUEUED",
              progress: 0,
              eventMessage: "Re-queued after application restart (previous draft preparation lost)",
            });
          } catch (err) {
            console.warn(`[Runner] Failed to reset PREPARING draft ${draftId} to QUEUED:`, err);
            continue;
          }
          status = "QUEUED";
        }

        const enqueuedAt =
          parseApiUtcTimestampMs(status === "PREPARING" ? snapshot.updatedUtc : snapshot.createdUtc) ?? Date.now();
        ds.queue.push({ draftId, enqueuedAt });
        inMemoryQueuedIds.add(draftId);
      }
    } catch (err) {
      console.error("[Runner] Draft recovery check failed:", err);
    }

    try {
      const payload = await apiGet(apiBase, adminKey, `/internal/v1/claim-selection-drafts/idle-auto-proceed-due`);
      const dueDrafts = Array.isArray(payload?.drafts) ? payload.drafts : [];

      for (const draft of dueDrafts) {
        const draftId = typeof draft?.draftId === "string" ? draft.draftId : "";
        const draftStateJson = typeof draft?.draftStateJson === "string" ? draft.draftStateJson : "";
        const selectedClaimIds = Array.isArray(draft?.selectedClaimIds)
          ? draft.selectedClaimIds.filter(
            (claimId: unknown): claimId is string => typeof claimId === "string" && claimId.trim().length > 0,
          )
          : [];

        if (!draftId || !draftStateJson || selectedClaimIds.length === 0) {
          continue;
        }

        try {
          await apiPost(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/auto-confirm`, {
            draftStateJson,
            selectedClaimIds,
          });
        } catch (err) {
          console.warn(
            `[Runner] Idle auto-proceed failed for claim-selection draft ${draftId}:`,
            err,
          );
        }
      }
    } catch (err) {
      console.error("[Runner] Idle auto-proceed sweep failed:", err);
    }

    while (ds.runningCount < maxConcurrency && ds.queue.length > 0) {
      const next = ds.queue.shift();
      if (!next) break;
      if (ds.runningDraftIds.has(next.draftId)) continue;

      ds.runningCount++;
      ds.runningDraftIds.add(next.draftId);
      void runDraftPreparationBackground(next.draftId);
    }
  } finally {
    ds.isDraining = false;
    if (ds.drainRequested) {
      ds.drainRequested = false;
      void drainDraftQueue();
    }
  }
}

async function runDraftPreparationBackground(draftId: string) {
  return runWithDebugLogContext(`[draft:${draftId}|prep]`, async () => {
    const apiBase = getApiBaseOrThrow();
    const adminKey = getAdminKeyOrNull();
    let preparedPersisted = false;
    let failureCode: "stage1_failed" | "recommendation_failed" | "no_candidate_claims" = "stage1_failed";
    let failureDraftState: ClaimSelectionDraftState | null = null;
    let preparedStage1: PreparedStage1Snapshot | undefined;
    let stage1Observability: ClaimSelectionStage1Observability | undefined;
    let stage1Ms: number | undefined;
    let recommendationMs: number | undefined;
    let preparationStartedAt: number | undefined;
    let lastPreparationEventMessage = "Draft preparation started";
    let lastPreparationEventAt = Date.now();
    let lastPreparationProgress: number | undefined;
    let heartbeatStopped = false;
    let heartbeatInFlight: Promise<void> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    const heartbeatIntervalMs = getRunnerHeartbeatIntervalMs();
    let configuredSelectionCap = normalizeClaimSelectionCap(undefined);
    let configuredIdleAutoProceedMs = normalizeClaimSelectionIdleAutoProceedMs(undefined);

    const sendDraftHeartbeat = async () => {
      if (heartbeatStopped || heartbeatInFlight) return;
      const staleForMs = Date.now() - lastPreparationEventAt;
      if (staleForMs < heartbeatIntervalMs) return;

      heartbeatInFlight = (async () => {
        try {
          if (heartbeatStopped) return;
          const staleForSeconds = Math.max(1, Math.round(staleForMs / 1000));
          await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/status`, {
            status: "PREPARING",
            progress: normalizeDraftPreparationProgress(lastPreparationProgress),
            eventMessage: `Still preparing (${staleForSeconds}s since last preparation event): ${lastPreparationEventMessage}`,
          });
        } catch (err) {
          console.warn(`[Runner] Draft preparation heartbeat update failed for ${draftId}:`, err);
        } finally {
          heartbeatInFlight = null;
        }
      })();

      await heartbeatInFlight;
    };

    const startDraftHeartbeat = () => {
      if (heartbeatTimer) return;
      heartbeatTimer = setInterval(() => {
        void sendDraftHeartbeat();
      }, heartbeatIntervalMs);
      const heartbeatTimerHandle = heartbeatTimer as { unref?: () => void };
      if (typeof heartbeatTimerHandle.unref === "function") {
        heartbeatTimerHandle.unref();
      }
    };

    const stopDraftHeartbeat = async () => {
      heartbeatStopped = true;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (heartbeatInFlight) {
        await heartbeatInFlight;
      }
    };

    const emitDraftStatus = async (message: string, progress?: number) => {
      lastPreparationEventAt = Date.now();
      lastPreparationEventMessage = message;
      if (typeof progress === "number" && progress > 0) {
        lastPreparationProgress = progress;
      }
      await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/status`, {
        status: "PREPARING",
        progress: normalizeDraftPreparationProgress(progress),
        eventMessage: message,
      });
    };

    const buildObservability = (params: {
      phaseCode: ClaimSelectionDraftObservability["phaseCode"];
      phaseLabel: string;
      branch: ClaimSelectionDraftObservability["branch"];
      eventMessage?: string;
      candidateClaimCount?: number;
    }): ClaimSelectionDraftObservability => {
      const stage1Snapshot =
        stage1Observability && Object.keys(stage1Observability).length > 0
          ? { ...stage1Observability }
          : undefined;

      return {
        phaseCode: params.phaseCode,
        phaseLabel: params.phaseLabel,
        eventMessage: params.eventMessage ?? lastPreparationEventMessage,
        branch: params.branch,
        totalPrepMs: typeof preparationStartedAt === "number" ? Date.now() - preparationStartedAt : undefined,
        stage1Ms,
        recommendationMs,
        candidateClaimCount: params.candidateClaimCount ?? stage1Snapshot?.candidateClaimCount,
        stage1: stage1Snapshot,
      };
    };

    const buildDraftState = (params: {
      rankedClaimIds: string[];
      recommendedClaimIds: string[];
      selectedClaimIds: string[];
      lastSelectionInteractionUtc?: string;
      recommendationRationale?: string;
      assessments?: ClaimSelectionDraftState["assessments"];
      observability: ClaimSelectionDraftObservability;
    }): ClaimSelectionDraftState => ({
      version: 1,
      ...(preparedStage1 ? { preparedStage1 } : {}),
      selectionCap: configuredSelectionCap,
      selectionIdleAutoProceedMs: configuredIdleAutoProceedMs,
      rankedClaimIds: params.rankedClaimIds,
      recommendedClaimIds: params.recommendedClaimIds,
      selectedClaimIds: params.selectedClaimIds,
      lastSelectionInteractionUtc: params.lastSelectionInteractionUtc,
      recommendationRationale: params.recommendationRationale,
      assessments: params.assessments ?? [],
      observability: params.observability,
    });

    try {
    const draft = await apiGet(apiBase, adminKey, `/v1/claim-selection-drafts/${draftId}`);
    const status = String(draft.status || "").toUpperCase();
    if (status !== "QUEUED") {
      console.info(`[Runner] Skipping draft ${draftId}: current status is ${status}, not QUEUED.`);
      return;
    }

    const inputType = draft.activeInputType as "text" | "url";
    const inputValue = draft.activeInputValue as string | null;
    const selectionMode = String(draft.selectionMode || "interactive");

    if (!inputValue) {
      throw new Error("Draft is missing active input value for preparation");
    }

    const { config: pipelineConfig } = await loadPipelineConfig("default");
    configuredSelectionCap = normalizeClaimSelectionCap(pipelineConfig.claimSelectionCap);
    configuredIdleAutoProceedMs = normalizeClaimSelectionIdleAutoProceedMs(
      pipelineConfig.claimSelectionIdleAutoProceedMs,
    );
    preparationStartedAt = Date.now();

    await emitDraftStatus(lastPreparationEventMessage, 5);
    startDraftHeartbeat();

    let stage1Snapshot;
    const stage1StartedAt = Date.now();
    try {
      stage1Snapshot = await prepareStage1Snapshot(
        {
          inputType,
          inputValue,
          onEvent: async (message, progress) => {
            await emitDraftStatus(message, progress);
          },
        },
        pipelineConfig,
      );
    } finally {
      stage1Ms = Date.now() - stage1StartedAt;
    }

    preparedStage1 = stage1Snapshot.preparedStage1;
    stage1Observability = stage1Snapshot.state.stage1Observability
      ? { ...stage1Snapshot.state.stage1Observability }
      : undefined;

    if (preparedStage1.preparedUnderstanding.contractValidationSummary?.preservesContract === false) {
      const errorMessage = "Stage 1 preparation failed contract preservation and cannot continue.";
      failureCode = "stage1_failed";
      failureDraftState = buildDraftState({
        rankedClaimIds: [],
        recommendedClaimIds: [],
        selectedClaimIds: [],
        assessments: [],
        observability: buildObservability({
          phaseCode: "failed_stage1",
          phaseLabel: "Stage 1 failed",
          branch: "failed_stage1",
          eventMessage: errorMessage,
          candidateClaimCount: preparedStage1.preparedUnderstanding.atomicClaims.length,
        }),
      });
      await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/failed`, {
        errorCode: failureCode,
        errorMessage,
        draftStateJson: JSON.stringify(failureDraftState),
      });
      return;
    }

    const candidateIds = preparedStage1.preparedUnderstanding.atomicClaims.map((claim) => claim.id);
    if (candidateIds.length === 0) {
      const errorMessage = "Stage 1 produced no selectable atomic claims for this draft.";
      failureCode = "no_candidate_claims";
      failureDraftState = buildDraftState({
        rankedClaimIds: [],
        recommendedClaimIds: [],
        selectedClaimIds: [],
        assessments: [],
        observability: buildObservability({
          phaseCode: "failed_stage1",
          phaseLabel: "Stage 1 failed",
          branch: "failed_stage1",
          eventMessage: errorMessage,
          candidateClaimCount: 0,
        }),
      });
      await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/failed`, {
        errorCode: failureCode,
        errorMessage,
        draftStateJson: JSON.stringify(failureDraftState),
      });
      return;
    }

    if (shouldAutoContinueWithoutSelection(candidateIds.length, configuredSelectionCap)) {
      const autoContinueClaimIds = candidateIds.slice(
        0,
        getClaimSelectionCap(candidateIds.length, configuredSelectionCap),
      );
      lastPreparationEventMessage =
        `Stage 1 produced ${candidateIds.length} candidate claim(s); draft will auto-continue without manual selection.`;
      const draftState = buildDraftState({
        rankedClaimIds: [...candidateIds],
        recommendedClaimIds: [...autoContinueClaimIds],
        selectedClaimIds: [...autoContinueClaimIds],
        assessments: [],
        observability: buildObservability({
          phaseCode: "auto_continue",
          phaseLabel: "Draft auto-continued",
          branch: "auto_continue",
          candidateClaimCount: candidateIds.length,
        }),
      });
      failureDraftState = draftState;

      const autoContinueResult = await apiPost(
        apiBase,
        adminKey,
        `/internal/v1/claim-selection-drafts/${draftId}/auto-confirm`,
        {
          draftStateJson: JSON.stringify(draftState),
          selectedClaimIds: autoContinueClaimIds,
        },
      );

      if (typeof autoContinueResult?.finalJobId !== "string" || autoContinueResult.finalJobId.length === 0) {
        throw new Error("Automatic continuation did not return a job id");
      }
      return;
    }

    failureCode = "recommendation_failed";
    lastPreparationEventMessage = "Generating claim-selection recommendations";
    failureDraftState = buildDraftState({
      rankedClaimIds: [],
      recommendedClaimIds: [],
      selectedClaimIds: [],
      assessments: [],
      observability: buildObservability({
        phaseCode: "recommendation",
        phaseLabel: "Generating recommendations",
        branch: "in_progress",
        candidateClaimCount: candidateIds.length,
      }),
    });

    await emitDraftStatus(lastPreparationEventMessage, 32);

    let recommendation;
    const recommendationStartedAt = Date.now();
    try {
      recommendation = await generateClaimSelectionRecommendation({
        originalInput: preparedStage1.resolvedInputText,
        impliedClaim: preparedStage1.preparedUnderstanding.impliedClaim,
        articleThesis: preparedStage1.preparedUnderstanding.articleThesis,
        atomicClaims: preparedStage1.preparedUnderstanding.atomicClaims,
        selectionCap: configuredSelectionCap,
        pipelineConfig,
      });
    } finally {
      recommendationMs = Date.now() - recommendationStartedAt;
    }

    const automaticRecommendedClaimIds = getAutomaticRecommendationSelection(
      selectionMode,
      recommendation.recommendedClaimIds,
      configuredSelectionCap,
    );

    if (automaticRecommendedClaimIds && automaticRecommendedClaimIds.length > 0) {
      lastPreparationEventMessage =
        `Prepared ${candidateIds.length} candidate claim(s) and auto-selected ${automaticRecommendedClaimIds.length} recommended claim(s). Continuing analysis automatically.`;
      const draftState = buildDraftState({
        rankedClaimIds: recommendation.rankedClaimIds,
        recommendedClaimIds: automaticRecommendedClaimIds,
        selectedClaimIds: automaticRecommendedClaimIds,
        recommendationRationale: recommendation.rationale,
        assessments: recommendation.assessments,
        observability: buildObservability({
          phaseCode: "auto_continue",
          phaseLabel: "Draft auto-continued",
          branch: "auto_continue",
          candidateClaimCount: candidateIds.length,
        }),
      });
      failureDraftState = draftState;

      const autoContinueResult = await apiPost(
        apiBase,
        adminKey,
        `/internal/v1/claim-selection-drafts/${draftId}/auto-confirm`,
        {
          draftStateJson: JSON.stringify(draftState),
          selectedClaimIds: automaticRecommendedClaimIds,
        },
      );

      if (typeof autoContinueResult?.finalJobId !== "string" || autoContinueResult.finalJobId.length === 0) {
        throw new Error("Automatic continuation did not return a job id");
      }
      return;
    }

    lastPreparationEventMessage =
      `Prepared ${candidateIds.length} candidate claim(s) and ${recommendation.recommendedClaimIds.length} recommendation(s). Awaiting user selection.`;
    const draftState = buildDraftState({
      rankedClaimIds: recommendation.rankedClaimIds,
      recommendedClaimIds: recommendation.recommendedClaimIds,
      selectedClaimIds: recommendation.recommendedClaimIds,
      recommendationRationale: recommendation.rationale,
      assessments: recommendation.assessments,
      observability: buildObservability({
        phaseCode: "awaiting_claim_selection",
        phaseLabel: "Awaiting claim selection",
        branch: "awaiting_claim_selection",
        candidateClaimCount: candidateIds.length,
      }),
    });
    failureDraftState = draftState;

    await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/prepared`, {
      draftStateJson: JSON.stringify(draftState),
    });
    preparedPersisted = true;

    if (selectionMode === "automatic") {
      console.info(
        `[Runner] Draft ${draftId} produced ${candidateIds.length} candidate claims but no safe automatic recommendation, so manual claim selection is required before analysis continues.`,
      );
    }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      debugLog("runDraftPreparationBackground: ERROR", { draftId, message: msg });
      if (preparedPersisted) {
        console.warn(
          `[Runner] Automatic continuation failed after draft ${draftId} was prepared. Leaving the prepared draft available for recovery: ${msg}`,
        );
        return;
      }
      const failureObservability = buildObservability({
        phaseCode: failureCode === "recommendation_failed" ? "failed_recommendation" : "failed_stage1",
        phaseLabel: failureCode === "recommendation_failed" ? "Recommendation failed" : "Stage 1 failed",
        branch: failureCode === "recommendation_failed" ? "failed_recommendation" : "failed_stage1",
        eventMessage: msg,
      });
      const resolvedFailureDraftState =
        preparedStage1 || failureDraftState
          ? {
            version: 1 as const,
            ...(preparedStage1 ? { preparedStage1 } : {}),
            selectionCap: configuredSelectionCap,
            selectionIdleAutoProceedMs: configuredIdleAutoProceedMs,
            rankedClaimIds: failureDraftState?.rankedClaimIds ?? [],
            recommendedClaimIds: failureDraftState?.recommendedClaimIds ?? [],
            selectedClaimIds: failureDraftState?.selectedClaimIds ?? [],
            lastSelectionInteractionUtc: failureDraftState?.lastSelectionInteractionUtc,
            recommendationRationale: failureDraftState?.recommendationRationale,
            assessments: failureDraftState?.assessments ?? [],
            observability: failureObservability,
          }
          : null;
      await apiPutInternal(apiBase, adminKey, `/internal/v1/claim-selection-drafts/${draftId}/failed`, {
        errorCode: failureCode,
        errorMessage: msg,
        draftStateJson: resolvedFailureDraftState ? JSON.stringify(resolvedFailureDraftState) : undefined,
      }).catch(() => {});
    } finally {
      await stopDraftHeartbeat();
      const ds2 = getDraftQueueState();
      ds2.runningCount = Math.max(0, ds2.runningCount - 1);
      ds2.runningDraftIds.delete(draftId);
      void drainDraftQueue();
      void drainRunnerQueue();
    }
  });
}

// Bootstrap: start watchdog on module load so persisted QUEUED jobs are
// recovered after a process restart without waiting for a new job trigger.
// Short delay lets the server finish initializing before the first drain
// attempts API calls (failures are non-fatal and retry on next watchdog tick).
ensureQueueWatchdogStarted();
setTimeout(() => void drainRunnerQueue(), 5_000);
setTimeout(() => void drainDraftQueue(), 5_000);
