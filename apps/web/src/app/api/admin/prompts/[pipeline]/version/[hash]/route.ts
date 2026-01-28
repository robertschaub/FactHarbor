/**
 * Admin API - Get specific prompt version content
 *
 * GET /api/admin/prompts/:pipeline/version/:hash - Get content of a specific version
 */

import { NextResponse } from "next/server";
import { isValidPipeline } from "@/lib/analyzer/prompt-loader";
import { getPromptVersionByHash } from "@/lib/prompt-storage";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ pipeline: string; hash: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { pipeline, hash } = await params;

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}` },
      { status: 400 },
    );
  }

  if (!hash || hash.length < 8) {
    return NextResponse.json(
      { error: "Invalid content hash" },
      { status: 400 },
    );
  }

  try {
    const version = await getPromptVersionByHash(hash);

    if (!version) {
      return NextResponse.json(
        { error: `Version not found: ${hash}` },
        { status: 404 },
      );
    }

    // Verify it belongs to the requested pipeline
    if (version.pipeline !== pipeline) {
      return NextResponse.json(
        { error: `Version ${hash} does not belong to pipeline ${pipeline}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      pipeline: version.pipeline,
      contentHash: version.contentHash,
      versionLabel: version.versionLabel,
      content: version.content,
      createdUtc: version.createdUtc,
      isActive: version.isActive,
    });
  } catch (err: any) {
    console.error("[Prompt-API] Get version error:", err);
    return NextResponse.json(
      { error: `Failed to get version: ${err?.message || String(err)}` },
      { status: 500 },
    );
  }
}
