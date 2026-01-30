/**
 * Admin API - Unified Config Management
 *
 * GET /api/admin/config/:type/:profile - Get active config content and metadata
 * PUT /api/admin/config/:type/:profile - Save new config version (does not activate)
 *
 * @module api/admin/config/[type]/[profile]
 */

import { NextResponse } from "next/server";
import {
  getActiveConfig,
  saveConfigBlob,
  validateConfigContent,
  type ConfigType,
} from "@/lib/config-storage";
import { isValidConfigType, VALID_CONFIG_TYPES } from "@/lib/config-schemas";

export const runtime = "nodejs";

function getAdminKey(): string | null {
  const v = process.env.FH_ADMIN_KEY;
  return v && v.trim() ? v : null;
}

function isAuthorized(req: Request): boolean {
  const adminKey = getAdminKey();
  // In development without a key configured, allow access
  if (!adminKey && process.env.NODE_ENV !== "production") return true;
  const providedKey = req.headers.get("x-admin-key");
  return !!providedKey && providedKey === adminKey;
}

interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * GET - Get active config for type/profile
 */
export async function GET(req: Request, { params }: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile } = await params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      {
        error: `Invalid config type: ${type}. Valid: ${VALID_CONFIG_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const config = await getActiveConfig(type, profile);

    if (!config) {
      return NextResponse.json(
        {
          error: `No active config found for ${type}/${profile}`,
          configType: type,
          profileKey: profile,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      configType: config.configType,
      profileKey: config.profileKey,
      contentHash: config.contentHash,
      schemaVersion: config.schemaVersion,
      versionLabel: config.versionLabel,
      content: config.content,
      createdUtc: config.createdUtc,
      createdBy: config.createdBy,
      activatedUtc: config.activatedUtc,
      activatedBy: config.activatedBy,
      isActive: config.isActive,
    });
  } catch (err: unknown) {
    console.error("[Config-API] GET error:", err);
    return NextResponse.json(
      { error: `Failed to get config: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}

/**
 * PUT - Save new config version (validates but does not activate)
 */
export async function PUT(req: Request, { params }: RouteParams) {
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

  let body: { content: string; versionLabel?: string };
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
    const versionLabel = body.versionLabel || `v-${Date.now()}`;

    const { blob, isNew, validation } = await saveConfigBlob(
      type,
      profile,
      body.content,
      versionLabel,
      req.headers.get("x-admin-user") || undefined,
    );

    return NextResponse.json({
      success: true,
      configType: type,
      profileKey: profile,
      contentHash: blob.contentHash,
      schemaVersion: blob.schemaVersion,
      versionLabel: blob.versionLabel,
      isNew,
      valid: validation.valid,
      warnings: validation.warnings,
      createdUtc: blob.createdUtc,
    });
  } catch (err: unknown) {
    console.error("[Config-API] PUT error:", err);
    const message = err instanceof Error ? err.message : String(err);

    // Check if it's a validation error
    if (message.startsWith("Validation failed:")) {
      return NextResponse.json(
        { error: message, valid: false },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: `Failed to save config: ${message}` },
      { status: 500 },
    );
  }
}
