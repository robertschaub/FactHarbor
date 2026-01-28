/**
 * API Route: List and select prompt files for a pipeline
 *
 * GET  /api/admin/prompts/[pipeline]/files - List available prompt files
 * POST /api/admin/prompts/[pipeline]/files - Set active prompt file
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  listPromptFiles,
  setActivePromptFile,
  getActivePromptFile,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pipeline: string }> },
) {
  const { pipeline } = await params;

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}` },
      { status: 400 },
    );
  }

  try {
    const result = await listPromptFiles(pipeline as Pipeline);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to list prompt files" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pipeline: string }> },
) {
  const { pipeline } = await params;

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}` },
      { status: 400 },
    );
  }

  let body: { filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filename = body.filename || null;

  // Validate filename if provided
  if (filename) {
    if (!filename.startsWith(pipeline) || !filename.endsWith(".prompt.md")) {
      return NextResponse.json(
        { error: `Invalid filename for pipeline ${pipeline}: ${filename}` },
        { status: 400 },
      );
    }
  }

  try {
    setActivePromptFile(pipeline as Pipeline, filename);
    const activeFile = getActivePromptFile(pipeline as Pipeline);

    return NextResponse.json({
      success: true,
      pipeline,
      activeFile,
      message: filename
        ? `Switched to ${filename}`
        : `Reset to default ${pipeline}.prompt.md`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to set active prompt file" },
      { status: 500 },
    );
  }
}
