import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteParams = { id?: string };
type RouteContext = { params: Promise<RouteParams> };

async function resolveJobId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  return id.length > 0 ? id : null;
}

export async function GET(request: Request, context: RouteContext) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  const jobId = await resolveJobId(context);
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing job id" }, { status: 400 });
  }

  const upstreamUrl = `${base.replace(/\/$/, "")}/v1/jobs/${jobId}/events`;
  // Forward client IP/proto for API rate limiting.
  // TRUST ASSUMPTION: same-host deployment; API trusts only 127.0.0.1/::1 as proxies.
  const upstreamHeaders: Record<string, string> = {};
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedFor) upstreamHeaders["x-forwarded-for"] = forwardedFor;
  if (forwardedProto) upstreamHeaders["x-forwarded-proto"] = forwardedProto;

  const res = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: upstreamHeaders,
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
