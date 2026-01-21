/**
 * Admin API - Source Reliability Cache
 *
 * Returns cached source reliability data for admin viewing.
 */

import { NextResponse } from "next/server";
import { getCacheStats, getAllCachedScores, cleanupExpired, deleteCachedScore } from "@/lib/source-reliability-cache";

export const runtime = "nodejs";

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

// Check admin auth
function checkAuth(req: Request): boolean {
  const adminKey = getEnv("FH_ADMIN_KEY");
  if (!adminKey) {
    // Allow in development without key
    return process.env.NODE_ENV !== "production";
  }
  const got = req.headers.get("x-admin-key");
  return got === adminKey;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "stats") {
      const stats = await getCacheStats();
      return NextResponse.json(stats);
    }

    if (action === "cleanup") {
      const deleted = await cleanupExpired();
      return NextResponse.json({ deleted });
    }

    // Default: return all cached scores
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const sortBy = url.searchParams.get("sortBy") || "evaluated_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    const data = await getAllCachedScores({ limit, offset, sortBy, sortOrder });
    const stats = await getCacheStats();

    return NextResponse.json({
      ...data,
      stats,
    });
  } catch (err) {
    console.error("[Admin SR] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch source reliability data" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Missing 'domain' parameter" },
        { status: 400 }
      );
    }

    const deleted = await deleteCachedScore(domain);
    
    if (deleted) {
      return NextResponse.json({ success: true, domain });
    } else {
      return NextResponse.json(
        { error: "Domain not found in cache" },
        { status: 404 }
      );
    }
  } catch (err) {
    console.error("[Admin SR] Delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
