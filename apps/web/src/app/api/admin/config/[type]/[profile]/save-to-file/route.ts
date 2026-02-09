/**
 * Admin API - Save Config to File
 *
 * POST /api/admin/config/:type/:profile/save-to-file
 * GET  /api/admin/config/:type/:profile/save-to-file (capability check)
 */

import { NextResponse } from "next/server";
import {
  getActiveConfig,
  isFileWriteAllowed,
  saveConfigToFile,
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

export async function GET(req: Request, context: RouteParams) {
  if (!isAuthorized(req)) {
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
      fileWriteAllowed: false,
      environment: process.env.NODE_ENV,
      reason: "prompts-not-supported",
    });
  }

  return NextResponse.json({
    fileWriteAllowed: isFileWriteAllowed(),
    environment: process.env.NODE_ENV,
  });
}

export async function POST(req: Request, context: RouteParams) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile } = await context.params;

  if (!isValidConfigType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}. Valid: ${VALID_CONFIG_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (type === "prompt") {
    return NextResponse.json(
      { error: "Prompts cannot be saved via this endpoint" },
      { status: 400 },
    );
  }

  if (!isFileWriteAllowed()) {
    return NextResponse.json(
      { error: "File writes not allowed in this environment" },
      { status: 403 },
    );
  }

  const active = await getActiveConfig(type, profile);
  if (!active) {
    return NextResponse.json(
      { error: `Config ${type}/${profile} not found` },
      { status: 404 },
    );
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = Boolean(body?.dryRun);
  } catch {
    dryRun = false;
  }

  let configObject: Record<string, unknown>;
  try {
    configObject = JSON.parse(active.content);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid JSON content for ${type}/${profile}` },
      { status: 500 },
    );
  }

  try {
    const result = await saveConfigToFile(
      type as Exclude<ConfigType, "prompt">,
      configObject,
      dryRun,
    );

    const updatedBy = req.headers.get("x-admin-user") || "admin";
    console.info(
      `[Config] ${dryRun ? "DRY RUN" : "SAVED"} ${type}/${profile} to file by ${updatedBy}`,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Config] Save to file failed:", message);
    return NextResponse.json(
      { error: message || "Failed to save config to file" },
      { status: 500 },
    );
  }
}
