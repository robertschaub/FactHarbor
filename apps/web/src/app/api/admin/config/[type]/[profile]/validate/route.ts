/**
 * Admin API - Config Validation
 *
 * POST /api/admin/config/:type/:profile/validate - Validate config without saving
 */

import { NextResponse } from "next/server";
import { validateConfigContent, type ConfigType } from "@/lib/config-storage";

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
 * POST - Validate config content without saving
 */
export async function POST(req: Request, { params }: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}` },
      { status: 400 },
    );
  }

  let body: { content: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'content' field" },
      { status: 400 },
    );
  }

  try {
    const result = await validateConfigContent(type, body.content);

    return NextResponse.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      canonicalizedHash: result.canonicalizedHash,
    });
  } catch (err: unknown) {
    console.error("[Config-API] validate error:", err);
    return NextResponse.json(
      { error: `Validation error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
