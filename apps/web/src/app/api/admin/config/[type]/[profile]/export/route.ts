/**
 * Admin API - Prompt Export
 *
 * GET /api/admin/config/prompt/:profile/export - Download prompt as .prompt.md file
 *
 * Security:
 * - Requires admin auth (x-admin-key)
 * - Profile validated against known pipelines (prevents header injection)
 */

import { NextResponse } from "next/server";
import { getPromptForExport } from "@/lib/config-storage";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

const VALID_PROFILES = [
  "claimboundary",
  "monolithic-dynamic",
  "source-reliability",
  "text-analysis-input",
  "text-analysis-evidence",
  "text-analysis-context",
  "text-analysis-verdict",
];



interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * GET - Download prompt as file
 */
export async function GET(req: Request, context: RouteParams) {
  // Enforce admin auth
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile } = await context.params;

  // Only prompts can be exported
  if (type !== "prompt") {
    return NextResponse.json(
      { error: "Export only available for prompt configs" },
      { status: 400 },
    );
  }

  // Validate profile against known pipelines (prevents header injection)
  if (!VALID_PROFILES.includes(profile)) {
    return NextResponse.json(
      { error: `Invalid profile: ${profile}. Valid profiles: ${VALID_PROFILES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const result = await getPromptForExport(profile);

    if (!result) {
      return NextResponse.json(
        { error: `No active prompt config found for profile: ${profile}` },
        { status: 404 },
      );
    }

    // Return as file download
    return new Response(result.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Content-Hash": result.contentHash,
      },
    });
  } catch (err: unknown) {
    console.error("[Config-API] export error:", err);
    return NextResponse.json(
      { error: `Export failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
