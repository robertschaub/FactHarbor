import { NextRequest, NextResponse } from "next/server";
import { checkRunnerKey } from "@/lib/auth";

async function resolveJobId(context: any): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

// In-memory abort signals (job ID → abort flag)
const abortSignals = new Map<string, boolean>();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkRunnerKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await resolveJobId(context);
  abortSignals.set(jobId, true);

  return NextResponse.json({ ok: true, jobId, aborted: true });
}

// Helper function for pipeline to check abort status
export function isJobAborted(jobId: string): boolean {
  return abortSignals.get(jobId) === true;
}

export function clearAbortSignal(jobId: string): void {
  abortSignals.delete(jobId);
}
