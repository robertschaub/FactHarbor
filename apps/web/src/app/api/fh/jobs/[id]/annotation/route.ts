import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey, validateJobId } from "@/lib/auth";

async function resolveJobId(context: { params: Promise<{ id: string }> }): Promise<string> {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export async function PUT(
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
  const adminKey = req.headers.get("x-admin-key") ?? "";
  const body = await req.text();

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/jobs/${jobId}/annotation`, {
      method: "PUT",
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        "X-Admin-Key": adminKey,
      },
      body,
    });
    const data = await res.json().catch(() => ({ error: `Upstream error ${res.status}` }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to update annotation" }, { status: 500 });
  }
}
