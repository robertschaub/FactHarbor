/**
 * Admin API - Config Profiles
 *
 * GET /api/admin/config/:type/profiles - List all profile keys for a config type
 */

import { NextResponse } from "next/server";
import { listProfileKeys, type ConfigType } from "@/lib/config-storage";
import { isValidConfigType, VALID_CONFIG_TYPES } from "@/lib/config-schemas";

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

interface RouteParams {
  params: Promise<{ type: string }>;
}

/**
 * GET - List all profile keys for a config type
 */
export async function GET(req: Request, context: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await context.params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}` },
      { status: 400 },
    );
  }

  try {
    const profiles = await listProfileKeys(type);

    // Always include default profiles
    const defaultProfiles =
      type === "prompt"
        ? ["orchestrated", "monolithic-dynamic", "source-reliability"]
        : ["default"];

    // Merge: default profiles first, then any from DB not already in defaults
    const merged = [...defaultProfiles];
    for (const p of profiles) {
      if (!merged.includes(p)) {
        merged.push(p);
      }
    }

    return NextResponse.json({
      configType: type,
      profiles: merged,
    });
  } catch (err: unknown) {
    console.error("[Config-API] profiles error:", err);
    return NextResponse.json(
      { error: `Failed to get profiles: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
