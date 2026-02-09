import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteParams = { id?: string };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

async function resolveJobId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  return id.length > 0 ? id : null;
}

export async function GET(_: Request, context: RouteContext) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  const jobId = await resolveJobId(context);
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing job id" }, { status: 400 });
  }

  const upstreamUrl = `${base.replace(/\/$/, "")}/v1/jobs/${jobId}`;
  const res = await fetch(upstreamUrl, { method: "GET", cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}
