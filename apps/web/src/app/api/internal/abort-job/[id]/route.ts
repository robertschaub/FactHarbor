import { NextRequest, NextResponse } from "next/server";
import { checkRunnerKey, validateJobId } from "@/lib/auth";
import { setAbortSignal } from "@/lib/job-abort";

async function resolveJobId(context: { params: Promise<{ id: string }> }): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkRunnerKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await resolveJobId(context);
  if (!validateJobId(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  setAbortSignal(jobId);

  return NextResponse.json({ ok: true, jobId, aborted: true });
}
