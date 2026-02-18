/**
 * Metrics Persistence Proxy
 *
 * Forwards metrics from the Next.js analysis pipeline to the API for storage.
 * The AnalysisMetrics table lives in the API database (apps/api/factharbor.db),
 * so we proxy the request to the API service.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json();

    // Forward to API
    const apiBaseUrl = getEnv("FH_API_BASE_URL") || "http://localhost:5000";
    const adminKey = getEnv("FH_ADMIN_KEY");

    const response = await fetch(`${apiBaseUrl}/api/fh/metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify(metrics),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Metrics] API returned ${response.status}: ${errorText}`);
      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Metrics] Error forwarding metrics to API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to persist metrics" },
      { status: 500 }
    );
  }
}
