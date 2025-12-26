import { NextResponse } from "next/server";
import { runFactHarborAnalysis } from "@/lib/analyzer";

export const runtime = "nodejs";

type RunJobRequest = { jobId: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const expectedRunnerKey = requireEnv("FH_INTERNAL_RUNNER_KEY");
  const got = req.headers.get("x-runner-key");
  if (got !== expectedRunnerKey) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as RunJobRequest;
  if (!body?.jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });

  const apiBase = requireEnv("FH_API_BASE_URL").replace(/\/$/, "");
  const adminKey = requireEnv("FH_ADMIN_KEY");

  const jobId = body.jobId;

  const apiGet = async (path: string) => {
    const res = await fetch(`${apiBase}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API GET failed ${res.status}: ${await res.text()}`);
    return res.json();
  };

  const apiPutInternal = async (path: string, payload: any) => {
    const res = await fetch(`${apiBase}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
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
