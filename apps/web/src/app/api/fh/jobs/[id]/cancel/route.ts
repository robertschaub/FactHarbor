import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey, validateJobId } from "@/lib/auth";

async function resolveJobId(context: any): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = await resolveJobId(context);
  if (!validateJobId(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }
  const baseUrl = process.env.FH_API_BASE_URL || "http://localhost:5000";

  const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/v1/jobs/${jobId}/cancel`;

  try {
    const res = await fetch(upstreamUrl, { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
