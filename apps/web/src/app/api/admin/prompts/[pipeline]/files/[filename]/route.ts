/**
 * API Route: Delete a prompt file
 * DELETE /api/admin/prompts/[pipeline]/files/[filename]
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  deletePromptFile,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";

export const runtime = "nodejs";

export async function DELETE(
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

  const result = await deletePromptFile(pipeline as Pipeline, decodedFilename);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    filename: decodedFilename,
    message: `Deleted ${decodedFilename}`,
  });
}
