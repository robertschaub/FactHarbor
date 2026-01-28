/**
 * Admin API - Config Activation
 *
 * POST /api/admin/config/:type/:profile/activate - Activate a config version
 */

import { NextResponse } from "next/server";
import { activateConfig, type ConfigType } from "@/lib/config-storage";

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
 * POST - Activate a specific config version
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { type, profile } = await params;

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}` },
      { status: 400 },
    );
  }

  let body: { contentHash: string; reason?: string };
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
    const result = await activateConfig(
      type,
      profile,
      body.contentHash,
      req.headers.get("x-admin-user") || undefined,
      body.reason,
    );

    return NextResponse.json({
      success: true,
      configType: result.configType,
      profileKey: result.profileKey,
      activeHash: result.activeHash,
      activatedUtc: result.activatedUtc,
      activatedBy: result.activatedBy,
      activationReason: result.activationReason,
    });
  } catch (err: unknown) {
    console.error("[Config-API] activate error:", err);
    return NextResponse.json(
      { error: `Failed to activate: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
