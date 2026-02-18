/**
 * Admin API - Config History
 *
 * GET /api/admin/config/:type/:profile/history - Get version history
 */

import { NextResponse } from "next/server";
import { getConfigHistory, type ConfigType } from "@/lib/config-storage";
import { isValidConfigType } from "@/lib/config-schemas";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";



interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * GET - Get version history for config type/profile
 */
export async function GET(req: Request, context: RouteParams) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile } = await context.params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}` },
      { status: 400 },
    );
  }

  // Parse query params
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const { versions, total } = await getConfigHistory(type, profile, limit, offset);

    return NextResponse.json({
      configType: type,
      profileKey: profile,
      versions: versions.map((v) => ({
        contentHash: v.contentHash,
        schemaVersion: v.schemaVersion,
        versionLabel: v.versionLabel,
        createdUtc: v.createdUtc,
        createdBy: v.createdBy,
        updatedUtc: v.updatedUtc,
        updatedBy: v.updatedBy,
        isActive: v.isActive,
        activatedUtc: v.activatedUtc,
        activatedBy: v.activatedBy,
      })),
      total,
      limit,
      offset,
    });
  } catch (err: unknown) {
    console.error("[Config-API] history error:", err);
    return NextResponse.json(
      { error: `Failed to get history: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
