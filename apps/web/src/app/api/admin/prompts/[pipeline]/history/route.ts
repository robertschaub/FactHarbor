/**
 * Admin API - Prompt Version History
 *
 * GET /api/admin/prompts/:pipeline/history - Get version history
 */

import { NextResponse } from "next/server";
import { isValidPipeline } from "@/lib/analyzer/prompt-loader";
import { getPromptVersionHistory } from "@/lib/prompt-storage";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ pipeline: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { pipeline } = await params;

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}` },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const { versions, total } = await getPromptVersionHistory(pipeline, limit, offset);

    return NextResponse.json({
      pipeline,
      versions: versions.map((v) => ({
        contentHash: v.contentHash,
        versionLabel: v.versionLabel,
        isActive: v.isActive,
        usageCount: v.usageCount,
        previousHash: v.previousHash,
        createdUtc: v.createdUtc,
        activatedUtc: v.activatedUtc,
      })),
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error("[Prompt-API] History error:", err);
    return NextResponse.json(
      { error: `Failed to get history: ${err?.message || String(err)}` },
      { status: 500 },
    );
  }
}
