/**
 * Jobs List API Endpoint
 *
 * GET /api/fh/jobs - Returns list of all analysis jobs
 * Proxies to the backend API at FH_API_BASE_URL
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey, getClientIp } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "50";
    const q = searchParams.get("q");
    const gitHash = searchParams.get("gitHash");

    const upstreamParams = new URLSearchParams({ page, pageSize });
    if (q) upstreamParams.set("q", q);
    // gitHash is admin-only; the backend enforces this, but only forward when admin key present.
    if (gitHash && checkAdminKey(request)) upstreamParams.set("gitHash", gitHash);
    const upstreamUrl = `${base.replace(/\/$/, "")}/v1/jobs?${upstreamParams}`;
    // Always forward client IP so the API can rate-limit by real IP (not proxy IP).
    const upstreamHeaders: Record<string, string> = {};
    upstreamHeaders["x-forwarded-for"] = getClientIp(request);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto) upstreamHeaders["x-forwarded-proto"] = forwardedProto;
    // Forward admin key so the API can include hidden jobs for admins
    if (checkAdminKey(request)) {
      const adminKey = request.headers.get("x-admin-key");
      if (adminKey) upstreamHeaders["X-Admin-Key"] = adminKey;
    }

    const res = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: upstreamHeaders,
    });

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
      });
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs", message: error.message, jobs: [] },
      { status: 500 }
    );
  }
}
