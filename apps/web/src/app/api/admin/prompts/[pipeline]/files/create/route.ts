/**
 * API Route: Create a new prompt file
 * POST /api/admin/prompts/[pipeline]/files/create
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  createPromptFile,
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

  let body: { filename?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, content } = body;

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  const result = await createPromptFile(pipeline as Pipeline, filename, content);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    filename,
    message: `Created ${filename}`,
  });
}
