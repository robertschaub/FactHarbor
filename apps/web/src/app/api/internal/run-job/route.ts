import { NextResponse } from "next/server";
import { runFactHarborAnalysis } from "@/lib/analyzer";
import { runMonolithicCanonical } from "@/lib/analyzer/monolithic-canonical";
import { runMonolithicDynamic } from "@/lib/analyzer/monolithic-dynamic";

type PipelineVariant = "orchestrated" | "monolithic_canonical" | "monolithic_dynamic";

export const runtime = "nodejs";

// Allow longer executions (LLM calls can exceed default limits on some hosts).
// No effect in local dev; helpful if deployed to platforms honoring maxDuration.
export const maxDuration = 300;

type RunJobRequest = { jobId: string };

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rough event-loop lag estimate; used to avoid starting new heavy work when the server is already unresponsive.
 */
async function measureEventLoopLagMs(sampleDelayMs = 50): Promise<number> {
  const start = Date.now();
  await sleep(sampleDelayMs);
  return Math.max(0, Date.now() - start - sampleDelayMs);
}

type RunnerQueueState = {
  runningCount: number;
  queue: Array<{ jobId: string; enqueuedAt: number }>;
  runningJobIds: Set<string>;
};

function getRunnerQueueState(): RunnerQueueState {
  const g = globalThis as any;
  if (!g.__fhRunnerQueueState) {
    g.__fhRunnerQueueState = { runningCount: 0, queue: [], runningJobIds: new Set<string>() } satisfies RunnerQueueState;
  }
  const st = g.__fhRunnerQueueState as RunnerQueueState;
  // Backward-compat: older in-memory state may exist without new fields.
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

// #region agent log
function fhDebugLog(hypothesisId: string, location: string, message: string, data: Record<string, any>) {
  // Never log secrets (keys/tokens/PII). Job IDs and coarse timings are OK.
  fetch("http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "runner-timeout-investigation",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion agent log

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

/**
 * Run a single job to completion in the background (no HTTP response dependency).
 * This is intentionally not awaited by the HTTP handler; it must be idempotent-ish and guarded.
 */
async function runJobBackground(jobId: string) {
  const startTs = Date.now();
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
    const pipelineVariant = (job.pipelineVariant || "orchestrated") as PipelineVariant;

    await emit("info", `Preparing input (pipeline: ${pipelineVariant})`, 5);

    let result: any;
    let usedFallback = false;
    let fallbackReason: string | undefined;

    if (pipelineVariant === "orchestrated") {
      // Default orchestrated pipeline
      result = await runFactHarborAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit("info", m, p),
      });
    } else if (pipelineVariant === "monolithic_canonical") {
      // Monolithic tool loop with canonical schema output
      try {
        result = await runMonolithicCanonical({
          jobId,
          inputType,
          inputValue,
          onEvent: async (m, p) => emit("info", m, p),
        });
      } catch (monolithicError: any) {
        // Fallback to orchestrated on failure
        await emit("warn", `Monolithic canonical failed, falling back to orchestrated: ${monolithicError?.message}`, 10);
        usedFallback = true;
        fallbackReason = monolithicError?.message || "Unknown error";
        result = await runFactHarborAnalysis({
          jobId,
          inputType,
          inputValue,
          onEvent: async (m, p) => emit("info", m, p),
        });
      }
    } else if (pipelineVariant === "monolithic_dynamic") {
      // Monolithic tool loop with dynamic schema output
      try {
        result = await runMonolithicDynamic({
          jobId,
          inputType,
          inputValue,
          onEvent: async (m, p) => emit("info", m, p),
        });
      } catch (monolithicError: any) {
        // Fallback to orchestrated on failure
        await emit("warn", `Monolithic dynamic failed, falling back to orchestrated: ${monolithicError?.message}`, 10);
        usedFallback = true;
        fallbackReason = monolithicError?.message || "Unknown error";
        result = await runFactHarborAnalysis({
          jobId,
          inputType,
          inputValue,
          onEvent: async (m, p) => emit("info", m, p),
        });
      }
    } else {
      // Unknown variant - fall back to orchestrated
      await emit("warn", `Unknown pipeline variant '${pipelineVariant}', using orchestrated`, 5);
      result = await runFactHarborAnalysis({
        jobId,
        inputType,
        inputValue,
        onEvent: async (m, p) => emit("info", m, p),
      });
    }

    // Record pipeline metadata in result
    if (result?.resultJson?.meta) {
      result.resultJson.meta.pipelineVariant = pipelineVariant;
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
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    // #region agent log
    fhDebugLog("H3", "apps/web/src/app/api/internal/run-job/route.ts:POST:error", "Runner request failed (500)", {
      jobId,
      elapsedMs: Date.now() - startTs,
      error: String(msg).slice(0, 500),
    });
    // #endregion agent log
    try {
      await apiPutInternal(apiBase, adminKey, `/internal/v1/jobs/${jobId}/status`, {
        status: "FAILED",
        progress: 100,
        level: "error",
        message: msg,
      });
    } catch {}
  } finally {
    // Release slot + running marker, then drain queue.
    const qs2 = getRunnerQueueState();
    if (acquiredSlot) {
      qs2.runningCount = Math.max(0, qs2.runningCount - 1);
    }
    qs2.runningJobIds.delete(jobId);
    // Best-effort: kick any queued work forward.
    void drainRunnerQueue();
  }
}

/**
 * Drain the in-process runner queue, starting background jobs up to max concurrency.
 * Avoids holding any HTTP requests open (prevents API trigger timeouts + retries).
 */
async function drainRunnerQueue() {
  const apiBase = getApiBaseOrThrow();
  const adminKey = getAdminKeyOrNull();
  const maxConcurrency = getMaxConcurrency();
  const qs = getRunnerQueueState();

  // Remove stale queued items (best-effort) and mark them failed (queue timeout).
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

    // If already running, skip (shouldn't happen, but safe).
    if (qs.runningJobIds.has(next.jobId)) continue;

    // Double-check API status to avoid clobbering an already-running/succeeded job (e.g., retries).
    try {
      const j = await apiGet(apiBase, `/v1/jobs/${next.jobId}`);
      const st = String(j?.status || "").toUpperCase();
      if (st === "RUNNING" || st === "SUCCEEDED") {
        continue;
      }
    } catch {
      // If we can't check, proceed best-effort.
    }

    qs.runningCount++;
    qs.runningJobIds.add(next.jobId);
    // Fire and forget; completion will call drainRunnerQueue again.
    void runJobBackground(next.jobId);
  }
}

export async function POST(req: Request) {
  const expectedRunnerKey = getEnv("FH_INTERNAL_RUNNER_KEY");
  if (expectedRunnerKey) {
    const got = req.headers.get("x-runner-key");
    if (got !== expectedRunnerKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "FH_INTERNAL_RUNNER_KEY not set" }, { status: 503 });
  }

  const body = (await req.json()) as RunJobRequest;
  if (!body?.jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });

  const jobId = body.jobId;
  try {
    // #region agent log
    fhDebugLog("H1", "apps/web/src/app/api/internal/run-job/route.ts:POST:entry", "Runner request received", {
      jobId,
      maxConcurrency: getMaxConcurrency(),
      rawEnv_FH_RUNNER_MAX_CONCURRENCY: process.env.FH_RUNNER_MAX_CONCURRENCY ?? null,
      provider: process.env.LLM_PROVIDER ?? "anthropic",
    });
    // #endregion agent log

    const qs = getRunnerQueueState();
    // De-dupe: if this job is already running or queued in this process, ACK immediately and do NOT clobber status.
    const alreadyQueued =
      qs.queue.some((x) => x.jobId === jobId);
    const alreadyRunning = qs.runningJobIds.has(jobId);
    if (!alreadyQueued && !alreadyRunning) {
      qs.queue.push({ jobId, enqueuedAt: Date.now() });
    }

    // Kick the background runner (best-effort). Do not await.
    void drainRunnerQueue();

    // ACK immediately so the API trigger does not wait for the full analysis (prevents 300s timeout + retries).
    // #region agent log
    fhDebugLog("H3", "apps/web/src/app/api/internal/run-job/route.ts:POST:ack", "Runner trigger ACK (202), job enqueued", {
      jobId,
      alreadyQueued,
      alreadyRunning,
      queueDepth: qs.queue.length,
      runningCount: qs.runningCount,
    });
    // #endregion agent log

    return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
