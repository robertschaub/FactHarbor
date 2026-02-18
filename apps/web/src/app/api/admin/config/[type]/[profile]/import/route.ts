/**
 * Admin API - Prompt Import
 *
 * POST /api/admin/config/prompt/:profile/import - Import prompt from uploaded file
 *
 * Accepts multipart/form-data with:
 * - file: The .prompt.md file (required)
 * - versionLabel: Optional version label
 * - activateImmediately: "true" | "false" (default: "false")
 */

import { NextResponse } from "next/server";
import {
  importPromptContent,
  VALID_PROMPT_PROFILES,
  type ConfigType,
} from "@/lib/config-storage";
import { isValidConfigType } from "@/lib/config-schemas";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB



interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * POST - Import prompt from uploaded file
 */
export async function POST(req: Request, context: RouteParams) {
  const { type, profile } = await context.params;

  // 1. Auth check
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Only prompts can be imported via file upload
  if (!isValidConfigType(type) || type !== "prompt") {
    return NextResponse.json(
      { error: "Import only available for prompt configs" },
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

  // 4. Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse form data. Expected multipart/form-data." },
      { status: 400 },
    );
  }

  // 5. Extract file
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Expected 'file' field with .prompt.md file." },
      { status: 400 },
    );
  }

  // 6. Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size ${file.size} exceeds limit of ${MAX_FILE_SIZE} bytes (1MB)` },
      { status: 400 },
    );
  }

  // 7. Validate file type
  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".md") && !filename.endsWith(".prompt.md")) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.name}. Expected .md or .prompt.md file.` },
      { status: 400 },
    );
  }

  // 8. Read file content
  let content: string;
  try {
    content = await file.text();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read file content" },
      { status: 400 },
    );
  }

  // 9. Extract options from form data
  const versionLabel = formData.get("versionLabel");
  const activateImmediately = formData.get("activateImmediately") === "true";

  // 10. Import the prompt
  try {
    const result = await importPromptContent(profile, content, {
      versionLabel: typeof versionLabel === "string" ? versionLabel : undefined,
      activateImmediately,
      importedBy: req.headers.get("x-admin-user") || "admin",
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Validation failed",
          valid: false,
          errors: result.validation.errors,
          warnings: result.validation.warnings,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      configType: "prompt",
      profileKey: profile,
      contentHash: result.blob?.contentHash,
      schemaVersion: result.blob?.schemaVersion,
      versionLabel: result.blob?.versionLabel,
      isNew: result.isNew,
      activated: result.activated,
      valid: result.validation.valid,
      warnings: result.validation.warnings,
      createdUtc: result.blob?.createdUtc,
    });
  } catch (err: unknown) {
    console.error("[Config-API] import error:", err);
    return NextResponse.json(
      { error: `Import failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
