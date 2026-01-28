/**
 * API Route: Rename a prompt file
 * PUT /api/admin/prompts/[pipeline]/files/rename
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  renamePromptFile,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";

export const runtime = "nodejs";

export async function PUT(
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

  let body: { oldFilename?: string; newFilename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { oldFilename, newFilename } = body;

  if (!oldFilename || !newFilename) {
    return NextResponse.json(
      { error: "Both oldFilename and newFilename are required" },
      { status: 400 },
    );
  }

  const result = await renamePromptFile(
    pipeline as Pipeline,
    oldFilename,
    newFilename,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    oldFilename,
    newFilename,
    message: `Renamed ${oldFilename} to ${newFilename}`,
  });
}
