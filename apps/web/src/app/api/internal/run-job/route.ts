import { NextResponse } from "next/server";
import { runFactHarborAnalysis } from "@/lib/analyzer";

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
};

function getRunnerQueueState(): RunnerQueueState {
  const g = globalThis as any;
  if (!g.__fhRunnerQueueState) {
    g.__fhRunnerQueueState = { runningCount: 0, queue: [] } satisfies RunnerQueueState;
  }
  return g.__fhRunnerQueueState as RunnerQueueState;
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

  const apiBaseRaw = getEnv("FH_API_BASE_URL");
  if (!apiBaseRaw) return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  const apiBase = apiBaseRaw.replace(/\/$/, "");

  // In dev, allow the API to run without an admin key (API will accept it if configured similarly).
  const adminKey = getEnv("FH_ADMIN_KEY");

  const jobId = body.jobId;
  const maxConcurrency = Math.max(
    1,
    Number.parseInt(process.env.FH_RUNNER_MAX_CONCURRENCY ?? "3", 10) || 3,
  );
  let acquiredSlot = false;

  const apiGet = async (path: string) => {
    const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API GET failed ${res.status}: ${await res.text()}`);
    return res.json();
  };

  const apiPutInternal = async (path: string, payload: any) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminKey) headers["X-Admin-Key"] = adminKey;
    const res = await fetch(`${apiBase}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`API PUT failed ${res.status}: ${await res.text()}`);
  };

  const emit = async (level: "info" | "warn" | "error", message: string, progress?: number) => {
    await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, { status: "RUNNING", progress, level, message });
  };

  try {
    // Runner queue (POC): keep web UI responsive by limiting concurrent analyses per Next server process.
    const qs = getRunnerQueueState();
    const alreadyQueuedOrRunning =
      qs.queue.some((x) => x.jobId === jobId);
    if (!alreadyQueuedOrRunning) {
      qs.queue.push({ jobId, enqueuedAt: Date.now() });
    }

    // Wait until we're at the front of the queue and a runner slot is available.
    const maxQueueWaitMs = 5 * 60 * 1000; // 5 minutes max wait
    const queueStartTime = Date.now();
    while (
      qs.queue[0]?.jobId !== jobId ||
      qs.runningCount >= maxConcurrency
    ) {
      // Timeout check: if we've been waiting too long, fail the job
      if (Date.now() - queueStartTime > maxQueueWaitMs) {
        await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, {
          status: "FAILED",
          progress: 0,
          level: "error",
          message: "Job timed out waiting in queue (exceeded 5 minute limit)",
        });
        return NextResponse.json({ ok: false, error: "Queue timeout" }, { status: 408 });
      }

      // Cleanup: remove any jobs from queue that have been there too long (likely stuck)
      const now = Date.now();
      const staleThreshold = 10 * 60 * 1000; // 10 minutes
      qs.queue = qs.queue.filter((x) => {
        const age = now - x.enqueuedAt;
        if (age > staleThreshold && x.jobId !== jobId) {
          console.warn(`[Runner] Removing stale job ${x.jobId} from queue (age: ${Math.round(age / 1000)}s)`);
          return false;
        }
        return true;
      });

      // Check if job ahead has failed (by checking API status)
      if (qs.queue[0]?.jobId !== jobId && qs.queue.length > 0) {
        try {
          const aheadJob = await apiGet(`/v1/jobs/${qs.queue[0].jobId}`);
          if (aheadJob.status === "FAILED" || aheadJob.status === "SUCCEEDED") {
            // Job ahead is done, remove it from queue
            console.log(`[Runner] Job ${qs.queue[0].jobId} ahead is ${aheadJob.status}, removing from queue`);
            qs.queue.shift();
            continue;
          }
        } catch (e) {
          // If we can't check, assume it's still running and continue waiting
        }
      }

      const position = Math.max(1, qs.queue.findIndex((x) => x.jobId === jobId) + 1);
      await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, {
        status: "QUEUED",
        progress: 0,
        level: "info",
        message: `Waiting for runner capacity (queue position ${position}, running ${qs.runningCount}/${maxConcurrency})`,
      });
      await sleep(750);
    }

    // Responsiveness guard: if event loop is lagging badly, keep queued a bit longer.
    // This helps prevent the UI (and other requests) from becoming unresponsive under load.
    while (true) {
      const lag = await measureEventLoopLagMs(50);
      if (lag < 150) break;
      await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, {
        status: "QUEUED",
        progress: 0,
        level: "info",
        message: `Waiting for server responsiveness (event loop lag ~${lag}ms)`,
      });
      await sleep(500);
    }

    // Acquire runner slot.
    // Remove from queue head, increment runningCount, then proceed.
    qs.queue.shift();
    qs.runningCount++;
    acquiredSlot = true;
    await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, { status: "RUNNING", progress: 1, level: "info", message: "Runner started" });

    const job = await apiGet(`/v1/jobs/${jobId}`);
    const inputType = job.inputType as "text" | "url";
    const inputValue = job.inputValue as string;

    await emit("info", "Preparing input", 5);

    const result = await runFactHarborAnalysis({ inputType, inputValue, onEvent: async (m, p) => emit("info", m, p) });

    await emit("info", "Storing result", 95);
    await apiPutInternal(`/internal/v1/jobs/${jobId}/result`, result);

    await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, { status: "SUCCEEDED", progress: 100, level: "info", message: "Done" });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    try {
      await apiPutInternal(`/internal/v1/jobs/${jobId}/status`, { status: "FAILED", progress: 100, level: "error", message: msg });
    } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    const qs = getRunnerQueueState();
    // Best-effort cleanup: remove this job from the queue and release our slot (if acquired).
    qs.queue = qs.queue.filter((x) => x.jobId !== jobId);
    if (acquiredSlot) {
      qs.runningCount = Math.max(0, qs.runningCount - 1);
    }
  }
}
