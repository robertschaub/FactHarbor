/**
 * Jobs List API Endpoint v2.4.4
 *
 * GET /api/fh/jobs - Returns list of all analysis jobs
 * Proxies to the backend API at FH_API_BASE_URL
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const base = process.env.FH_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  try {
    const upstreamUrl = `${base.replace(/\/$/, "")}/v1/jobs`;
    const res = await fetch(upstreamUrl, { method: "GET", cache: "no-store" });
    const text = await res.text();
    return new NextResponse(text, { 
      status: res.status, 
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } 
    });
  } catch (error: any) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs", message: error.message, jobs: [] },
      { status: 500 }
    );
  }
}
