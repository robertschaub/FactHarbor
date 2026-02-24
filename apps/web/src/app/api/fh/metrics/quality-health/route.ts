/**
 * Quality Health Proxy — GET /api/fh/metrics/quality-health
 *
 * Proxies the quality health time-series request to the .NET API so
 * the browser never makes cross-origin calls to port 5000.
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
      `${apiBaseUrl}/api/fh/metrics/quality-health${qs ? `?${qs}` : ""}`,
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
    console.error("[Metrics/QualityHealth] Proxy error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quality health data" },
      { status: 502 },
    );
  }
}
