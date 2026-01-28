/**
 * API Route: Duplicate a prompt file
 * POST /api/admin/prompts/[pipeline]/files/duplicate
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  duplicatePromptFile,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";

export const runtime = "nodejs";

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

  let body: { sourceFilename?: string; targetFilename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sourceFilename, targetFilename } = body;

  if (!sourceFilename || !targetFilename) {
    return NextResponse.json(
      { error: "Both sourceFilename and targetFilename are required" },
      { status: 400 },
    );
  }

  const result = await duplicatePromptFile(
    pipeline as Pipeline,
    sourceFilename,
    targetFilename,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    sourceFilename,
    targetFilename,
    message: `Duplicated ${sourceFilename} to ${targetFilename}`,
  });
}
