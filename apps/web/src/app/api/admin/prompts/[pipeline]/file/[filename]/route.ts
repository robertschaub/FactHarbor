/**
 * API Route: Get content of a specific prompt file
 * GET /api/admin/prompts/[pipeline]/file/[filename]
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  loadPromptFileByName,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pipeline: string; filename: string }> },
) {
  const { pipeline, filename } = await params;

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}` },
      { status: 400 },
    );
  }

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  // Decode the filename in case it was URL-encoded
  const decodedFilename = decodeURIComponent(filename);

  const result = await loadPromptFileByName(pipeline as Pipeline, decodedFilename);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    filename: decodedFilename,
    content: result.content,
    version: result.version,
    description: result.description,
    tokenEstimate: result.tokenEstimate,
  });
}
