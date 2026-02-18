import { NextResponse } from "next/server";
import { enqueueRunnerJob, drainRunnerQueue } from "@/lib/internal-runner-queue";
import { checkRunnerKey } from "@/lib/auth";

export const runtime = "nodejs";

// Allow longer executions (LLM calls can exceed default limits on some hosts).
// No effect in local dev; helpful if deployed to platforms honoring maxDuration.
export const maxDuration = 300;

type RunJobRequest = { jobId: string };

export async function POST(req: Request) {
  if (!checkRunnerKey(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as RunJobRequest;
  if (!body?.jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });

  const jobId = body.jobId;
  try {
    enqueueRunnerJob(jobId);

    // Kick the background runner (best-effort). Do not await.
    void drainRunnerQueue();

    // ACK immediately so the API trigger does not wait for the full analysis (prevents 300s timeout + retries).
    return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
