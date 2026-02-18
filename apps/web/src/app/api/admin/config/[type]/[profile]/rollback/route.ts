/**
 * Admin API - Config Rollback
 *
 * POST /api/admin/config/:type/:profile/rollback - Rollback to a previous version
 */

import { NextResponse } from "next/server";
import {
  rollbackConfig,
  getActiveConfigHash,
  type ConfigType,
} from "@/lib/config-storage";
import { isValidConfigType } from "@/lib/config-schemas";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";



interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * POST - Rollback to a specific config version
 */
export async function POST(req: Request, context: RouteParams) {
  const { type, profile } = await context.params;

  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}` },
      { status: 400 },
    );
  }

  let body: { contentHash: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.contentHash || typeof body.contentHash !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'contentHash' field" },
      { status: 400 },
    );
  }

  try {
    // Get current active hash before rollback
    const previousHash = await getActiveConfigHash(type, profile);

    const result = await rollbackConfig(
      type,
      profile,
      body.contentHash,
      req.headers.get("x-admin-user") || "admin",
    );

    return NextResponse.json({
      success: true,
      configType: result.configType,
      profileKey: result.profileKey,
      activeHash: result.activeHash,
      previousHash,
      activatedUtc: result.activatedUtc,
      activatedBy: result.activatedBy,
    });
  } catch (err: unknown) {
    console.error("[Config-API] rollback error:", err);
    return NextResponse.json(
      { error: `Failed to rollback: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
