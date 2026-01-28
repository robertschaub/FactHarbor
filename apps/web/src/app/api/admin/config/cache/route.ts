/**
 * Admin API - Config Cache Control
 *
 * GET /api/admin/config/cache - Get cache status
 * POST /api/admin/config/cache/invalidate - Invalidate cache
 */

import { NextResponse } from "next/server";
import { invalidateConfigCache, getConfigCacheStatus } from "@/lib/config-loader";
import type { ConfigType } from "@/lib/config-storage";

export const runtime = "nodejs";

function getAdminKey(): string | null {
  const v = process.env.FH_ADMIN_KEY;
  return v && v.trim() ? v : null;
}

function isAuthorized(req: Request): boolean {
  const adminKey = getAdminKey();
  if (!adminKey && process.env.NODE_ENV !== "production") return true;
  const providedKey = req.headers.get("x-admin-key");
  return !!providedKey && providedKey === adminKey;
}

/**
 * GET - Get cache status
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getConfigCacheStatus();
  return NextResponse.json({
    ...status,
    hitRate: "N/A", // Would need tracking to calculate
    lastPoll: new Date().toISOString(),
  });
}

/**
 * POST - Invalidate cache
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { configType?: string; profileKey?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is OK - invalidate all
  }

  const invalidated = invalidateConfigCache(
    body.configType as ConfigType | undefined,
    body.profileKey,
  );

  return NextResponse.json({
    success: true,
    invalidated,
    configType: body.configType || "all",
    profileKey: body.profileKey || "all",
  });
}
