/**
 * Admin API - Config History
 *
 * GET /api/admin/config/:type/:profile/history - Get version history
 */

import { NextResponse } from "next/server";
import { getConfigHistory, type ConfigType } from "@/lib/config-storage";

export const runtime = "nodejs";

const VALID_CONFIG_TYPES = ["prompt", "search", "calculation"] as const;

function isValidConfigType(type: string): type is ConfigType {
  return VALID_CONFIG_TYPES.includes(type as ConfigType);
}

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

interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * GET - Get version history for config type/profile
 */
export async function GET(req: Request, { params }: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile } = await params;

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
