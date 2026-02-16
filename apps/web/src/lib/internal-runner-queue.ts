import { runFactHarborAnalysis } from "@/lib/analyzer";
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

type PipelineVariant = "claimboundary" | "orchestrated" | "monolithic_dynamic";

type RunnerQueueState = {
  runningCount: number;
  queue: Array<{ jobId: string; enqueuedAt: number }>;
  runningJobIds: Set<string>;
};

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

function getRunnerQueueState(): RunnerQueueState {
  const g = globalThis as any;
  if (!g.__fhRunnerQueueState) {
    g.__fhRunnerQueueState = { runningCount: 0, queue: [], runningJobIds: new Set<string>() } satisfies RunnerQueueState;
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
    let usedFallback = false;
    let fallbackReason: string | undefined;

    if (pipelineVariant === "claimboundary") {
      result = await runClaimBoundaryAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit("info", m, p),
      });
    } else if (pipelineVariant === "orchestrated") {
      result = await runFactHarborAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit("info", m, p),
      });
    } else if (pipelineVariant === "monolithic_dynamic") {
      try {
        result = await runMonolithicDynamic({
          jobId,
          inputType,
          inputValue,
          onEvent: async (m, p) => emit("info", m, p),
        });
      } catch (monolithicError: any) {
        await emit("warn", `Monolithic dynamic failed, falling back to claimboundary: ${monolithicError?.message}`, 10);
        usedFallback = true;
        fallbackReason = monolithicError?.message || "Unknown error";
        result = await runClaimBoundaryAnalysis({
          jobId,
          inputType,
          inputValue,
          onEvent: async (m, p) => emit("info", m, p),
        });
      }
    } else {
      await emit("warn", `Unknown pipeline variant '${pipelineVariant}', using claimboundary`, 5);
      result = await runClaimBoundaryAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit("info", m, p),
      });
    }

    if (result?.resultJson?.meta) {
      result.resultJson.meta.pipelineVariantRequested = pipelineVariant;
      result.resultJson.meta.pipelineVariant = usedFallback ? "orchestrated" : pipelineVariant;
      result.resultJson.meta.pipelineFallback = usedFallback;
      if (fallbackReason) {
        result.resultJson.meta.fallbackReason = fallbackReason;
      }
    }

    await emit("info", "Storing result", 95);
    await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/result`, result);

    await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
      status: "SUCCEEDED",
      progress: 100,
      level: "info",
      message: "Done",
    });

    recordProviderSuccess("search");
    recordProviderSuccess("llm");
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
  const alreadyQueued = qs.queue.some((x) => x.jobId === jobId);
  const alreadyRunning = qs.runningJobIds.has(jobId);
  if (!alreadyQueued && !alreadyRunning) {
    qs.queue.push({ jobId, enqueuedAt: Date.now() });
  }
  return { alreadyQueued, alreadyRunning };
}

export async function drainRunnerQueue() {
  if (isSystemPaused()) {
    console.warn("[Runner] System is PAUSED — skipping queue drain. Jobs remain QUEUED until admin resumes.");
    return;
  }

  const apiBase = getApiBaseOrThrow();
  const adminKey = getAdminKeyOrNull();
  const maxConcurrency = getMaxConcurrency();
  const qs = getRunnerQueueState();

  const now = Date.now();
  const maxQueueWaitMs = 5 * 60 * 1000;
  const remaining: Array<{ jobId: string; enqueuedAt: number }> = [];
  for (const item of qs.queue) {
    const waitedMs = now - item.enqueuedAt;
    if (waitedMs > maxQueueWaitMs) {
      try {
        await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${item.jobId}/status`, {
          status: "FAILED",
          progress: 0,
          level: "error",
          message: "Job timed out waiting in queue (exceeded 5 minute limit)",
        });
      } catch {}
      continue;
    }
    remaining.push(item);
  }
  qs.queue = remaining;

  while (qs.runningCount < maxConcurrency && qs.queue.length > 0) {
    const next = qs.queue.shift();
    if (!next) break;
    if (qs.runningJobIds.has(next.jobId)) continue;

    try {
      const j = await apiGet(apiBase, `/v1/jobs/${next.jobId}`);
      const st = String(j?.status || "").toUpperCase();
      if (st === "RUNNING" || st === "SUCCEEDED") {
        continue;
      }
    } catch {}

    qs.runningCount++;
    qs.runningJobIds.add(next.jobId);
    void runJobBackground(next.jobId);
  }
}
