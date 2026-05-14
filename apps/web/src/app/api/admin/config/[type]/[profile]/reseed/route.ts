/**
 * Admin API - Config Reseed from File
 *
 * POST /api/admin/config/:type/:profile/reseed - Re-seed config from disk file
 *
 * For prompts: re-seeds from prompt markdown files.
 * For other config types (search, calculation, pipeline, sr): re-seeds from
 * the JSON default file, resetting to system ownership so future file changes
 * are auto-applied on restart.
 *
 * Body:
 * - force: boolean (default: false) - If true, re-seed even if active config exists
 */

import { NextResponse } from "next/server";
import {
  seedPromptFromFile,
  loadDefaultConfigFromFile,
  saveConfigBlob,
  activateConfig,
  updateConfigBlobMetadata,
  isFileSeededPromptProfile,
  VALID_PROMPT_PROFILES,
  type ConfigType,
} from "@/lib/config-storage";
import { isValidConfigType } from "@/lib/config-schemas";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

const NON_PROMPT_CONFIG_TYPES = ["search", "calculation", "pipeline", "sr"] as const;
type NonPromptConfigType = (typeof NON_PROMPT_CONFIG_TYPES)[number];

function isNonPromptConfigType(type: string): type is NonPromptConfigType {
  return (NON_PROMPT_CONFIG_TYPES as readonly string[]).includes(type);
}

interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * POST - Re-seed config from disk file
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

  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = body.force === true;
  } catch {
    // Default to force=false
  }

  if (type === "prompt") {
    return reseedPrompt(profile, force, req);
  }

  if (isNonPromptConfigType(type) && profile === "default") {
    return reseedNonPromptDefault(type, force);
  }

  return NextResponse.json(
    { error: `Reseed not supported for ${type}/${profile}` },
    { status: 400 },
  );
}

async function reseedPrompt(profile: string, force: boolean, req: Request) {
  if (!VALID_PROMPT_PROFILES.includes(profile as any)) {
    return NextResponse.json(
      { error: `Invalid profile: ${profile}. Valid profiles: ${VALID_PROMPT_PROFILES.join(", ")}` },
      { status: 400 },
    );
  }

  if (!isFileSeededPromptProfile(profile)) {
    return NextResponse.json(
      { error: `File reseed is not supported for prompt profile: ${profile}` },
      { status: 400 },
    );
  }

  try {
    const result = await seedPromptFromFile(
      profile,
      force,
      req.headers.get("x-admin-user") || "admin",
    );

    if (result.error) {
      return NextResponse.json(
        { success: false, seeded: false, error: result.error, profile },
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

async function reseedNonPromptDefault(configType: NonPromptConfigType, force: boolean) {
  try {
    const defaultContent = loadDefaultConfigFromFile(configType);
    if (!defaultContent) {
      return NextResponse.json(
        { error: `No default file found for ${configType}` },
        { status: 404 },
      );
    }

    if (!force) {
      return NextResponse.json({
        success: true,
        seeded: false,
        reason: `Use force=true to reset ${configType}/default to file defaults (system ownership).`,
        configType,
      });
    }

    const { blob, isNew } = await saveConfigBlob(
      configType as ConfigType,
      "default",
      defaultContent,
      "Initial default config",
      "system",
    );

    if (!isNew) {
      await updateConfigBlobMetadata(blob.contentHash, "system", "Initial default config");
    }

    await activateConfig(
      configType as ConfigType,
      "default",
      blob.contentHash,
      "system",
      "reseed-from-file",
    );

    return NextResponse.json({
      success: true,
      seeded: true,
      contentHash: blob.contentHash,
      fromFile: `${configType}.default.json`,
      configType,
    });
  } catch (err: unknown) {
    console.error("[Config-API] reseed error:", err);
    return NextResponse.json(
      { error: `Reseed failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
