/**
 * Metrics Summary Proxy — GET /api/fh/metrics/summary
 *
 * Proxies the summary stats request to the .NET API so the browser
 * never makes cross-origin calls to port 5000.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const apiBaseUrl = getEnv("FH_API_BASE_URL") || "http://localhost:5000";
    const adminKey = getEnv("FH_ADMIN_KEY");
    const qs = request.nextUrl.searchParams.toString();

    const response = await fetch(
      `${apiBaseUrl}/api/fh/metrics/summary${qs ? `?${qs}` : ""}`,
      {
        headers: {
          "X-Admin-Key": adminKey,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API returned ${response.status}: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Metrics/Summary] Proxy error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch summary stats" },
      { status: 502 },
    );
  }
}
