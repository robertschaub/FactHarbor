/**
 * Admin API - Config Drift Detection
 *
 * GET /api/admin/config/:type/drift
 * Returns: Whether DB config differs from file default
 */

import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";
import {
  getActiveConfig,
  loadDefaultConfigFromFile,
  type ConfigType,
} from "@/lib/config-storage";
import {
  canonicalizeContent,
  isValidConfigType,
  SCHEMA_VERSIONS,
  VALID_CONFIG_TYPES,
} from "@/lib/config-schemas";

export const runtime = "nodejs";



interface RouteParams {
  params: Promise<{ type: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await context.params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}. Valid: ${VALID_CONFIG_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (type === "prompt") {
    return NextResponse.json({
      hasDrift: false,
      reason: "Prompt configs are not file-backed",
    });
  }

  try {
    const dbConfig = await getActiveConfig(type as ConfigType, "default");

    const fileConfig = loadDefaultConfigFromFile(
      type as Exclude<ConfigType, "prompt">,
    );

    if (!fileConfig) {
      return NextResponse.json({
        hasDrift: false,
        reason: "No file config found (using code constants)",
        dbConfigUpdated: dbConfig?.updatedUtc ?? null,
        dbConfigUpdatedBy: dbConfig?.updatedBy ?? null,
      });
    }

    if (!dbConfig) {
      return NextResponse.json({
        hasDrift: false,
        reason: "No active DB config (defaults in effect)",
        fileSchemaVersion: SCHEMA_VERSIONS[type as Exclude<ConfigType, "prompt">],
        message: "DB config matches file default",
      });
    }

    const dbCanonical = canonicalizeContent(type as ConfigType, dbConfig.content);
    const fileCanonical = fileConfig;
    const hasDrift = dbCanonical !== fileCanonical;

    const fileSchemaVersion =
      SCHEMA_VERSIONS[type as Exclude<ConfigType, "prompt">];

    return NextResponse.json({
      hasDrift,
      dbConfigUpdated: dbConfig.updatedUtc,
      dbConfigUpdatedBy: dbConfig.updatedBy,
      fileSchemaVersion,
      message: hasDrift
        ? "DB config differs from file default. Consider Reset to Default if file was updated."
        : "DB config matches file default",
    });
  } catch (err) {
    console.error(`[Config] Drift check failed for ${type}:`, err);
    return NextResponse.json(
      { error: "Failed to check drift", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
