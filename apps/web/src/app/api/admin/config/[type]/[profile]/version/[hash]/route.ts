/**
 * Admin API - Get Specific Config Version
 *
 * GET /api/admin/config/:type/:profile/version/:hash - Get config by content hash
 */

import { NextResponse } from "next/server";
import { getConfigBlob, type ConfigType } from "@/lib/config-storage";
import { isValidConfigType } from "@/lib/config-schemas";

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
  params: Promise<{ type: string; profile: string; hash: string }>;
}

/**
 * GET - Get a specific config version by content hash
 */
export async function GET(req: Request, { params }: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile, hash } = await params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}` },
      { status: 400 },
    );
  }

  try {
    const blob = await getConfigBlob(hash);

    if (!blob) {
      return NextResponse.json(
        { error: `Config version not found: ${hash}` },
        { status: 404 },
      );
    }

    // Verify it matches the requested type/profile
    if (blob.configType !== type || blob.profileKey !== profile) {
      return NextResponse.json(
        {
          error: `Config version ${hash} does not belong to ${type}/${profile}`,
          actualType: blob.configType,
          actualProfile: blob.profileKey,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      contentHash: blob.contentHash,
      configType: blob.configType,
      profileKey: blob.profileKey,
      schemaVersion: blob.schemaVersion,
      versionLabel: blob.versionLabel,
      content: blob.content,
      createdUtc: blob.createdUtc,
      createdBy: blob.createdBy,
    });
  } catch (err: unknown) {
    console.error("[Config-API] version error:", err);
    return NextResponse.json(
      { error: `Failed to get version: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
