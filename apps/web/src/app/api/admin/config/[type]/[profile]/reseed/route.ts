/**
 * Admin API - Prompt Reseed from File
 *
 * POST /api/admin/config/prompt/:profile/reseed - Re-seed prompt from disk file
 *
 * Useful for development workflow: edit file on disk, then sync to database.
 *
 * Body:
 * - force: boolean (default: false) - If true, re-seed even if active config exists
 */

import { NextResponse } from "next/server";
import {
  seedPromptFromFile,
  VALID_PROMPT_PROFILES,
  type ConfigType,
} from "@/lib/config-storage";
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
  params: Promise<{ type: string; profile: string }>;
}

/**
 * POST - Re-seed prompt from disk file
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { type, profile } = await params;

  // 1. Auth check
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Only prompts can be reseeded
  if (!isValidConfigType(type) || type !== "prompt") {
    return NextResponse.json(
      { error: "Reseed only available for prompt configs" },
      { status: 400 },
    );
  }

  // 3. Validate profile against known profiles
  if (!VALID_PROMPT_PROFILES.includes(profile as any)) {
    return NextResponse.json(
      { error: `Invalid profile: ${profile}. Valid profiles: ${VALID_PROMPT_PROFILES.join(", ")}` },
      { status: 400 },
    );
  }

  // 4. Parse body for force flag
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = body.force === true;
  } catch {
    // Default to force=false if body parsing fails
  }

  // 5. Reseed from file
  try {
    const result = await seedPromptFromFile(profile, force);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          seeded: false,
          error: result.error,
          profile,
        },
        { status: 500 },
      );
    }

    if (!result.seeded) {
      return NextResponse.json({
        success: true,
        seeded: false,
        reason: `Active config already exists for ${profile}. Use force=true to override.`,
        contentHash: result.contentHash,
        profile,
      });
    }

    return NextResponse.json({
      success: true,
      seeded: true,
      contentHash: result.contentHash,
      fromFile: `${profile}.prompt.md`,
      profile,
    });
  } catch (err: unknown) {
    console.error("[Config-API] reseed error:", err);
    return NextResponse.json(
      { error: `Reseed failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
