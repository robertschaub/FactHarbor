import { NextResponse } from "next/server";
import { runFactHarborAnalysis } from "@/lib/analyzer";

export const runtime = "nodejs";

type RunJobRequest = { jobId: string };

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
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
  }
}
