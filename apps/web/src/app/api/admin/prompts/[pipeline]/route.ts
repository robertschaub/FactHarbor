/**
 * Admin API - Prompt Management
 *
 * GET /api/admin/prompts/:pipeline - Get current prompt content and metadata
 * PUT /api/admin/prompts/:pipeline - Update prompt content (admin auth required)
 */

import { NextResponse } from "next/server";
import {
  loadPromptFile,
  isValidPipeline,
  getPromptFilePath,
  hashContent,
  estimateTokens,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";
import {
  savePromptVersion,
  getActivePromptVersion,
} from "@/lib/prompt-storage";
import { writeFile } from "fs/promises";

export const runtime = "nodejs";

function getAdminKey(): string | null {
  const v = process.env.FH_ADMIN_KEY;
  return v && v.trim() ? v : null;
}

function isAuthorized(req: Request): boolean {
  const adminKey = getAdminKey();
  // In development without a key configured, allow access
  if (!adminKey && process.env.NODE_ENV !== "production") return true;
  const providedKey = req.headers.get("x-admin-key");
  return !!providedKey && providedKey === adminKey;
}

interface RouteParams {
  params: Promise<{ pipeline: string }>;
}

/**
 * GET - Read current prompt file content and metadata
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { pipeline } = await params;

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}. Valid: orchestrated, monolithic-canonical, monolithic-dynamic, source-reliability` },
      { status: 400 },
    );
  }

  const result = await loadPromptFile(pipeline as Pipeline);

  if (!result.success || !result.prompt) {
    return NextResponse.json(
      {
        error: "Failed to load prompt file",
        details: result.errors,
        warnings: result.warnings,
      },
      { status: 500 },
    );
  }

  const { prompt } = result;

  return NextResponse.json({
    pipeline,
    version: prompt.frontmatter.version,
    contentHash: prompt.contentHash,
    tokenEstimate: estimateTokens(prompt.rawContent),
    sectionCount: prompt.sections.length,
    sections: prompt.sections.map((s) => ({
      name: s.name,
      lineCount: s.endLine - s.startLine + 1,
      tokenEstimate: estimateTokens(s.content),
    })),
    variables: prompt.frontmatter.variables,
    content: prompt.rawContent,
    loadedAt: prompt.loadedAt,
    filePath: prompt.filePath,
    warnings: result.warnings,
  });
}

/**
 * PUT - Update prompt content (requires admin authentication)
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const { pipeline } = await params;

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isValidPipeline(pipeline)) {
    return NextResponse.json(
      { error: `Invalid pipeline: ${pipeline}` },
      { status: 400 },
    );
  }

  let body: { content: string; versionLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'content' field" },
      { status: 400 },
    );
  }

  const contentHash = hashContent(body.content);
  const versionLabel = body.versionLabel || `v-${Date.now()}`;

  try {
    // 1. Write to file system (atomic: write to temp then rename)
    const filePath = getPromptFilePath(pipeline as Pipeline);
    const tempPath = `${filePath}.${Date.now()}.tmp`;

    await writeFile(tempPath, body.content, "utf-8");

    // Rename temp to actual (atomic on POSIX; best-effort on Windows)
    const { rename } = await import("fs/promises");
    await rename(tempPath, filePath);

    // 2. Save version to database
    const version = await savePromptVersion(
      pipeline,
      body.content,
      contentHash,
      versionLabel,
    );

    return NextResponse.json({
      success: true,
      pipeline,
      contentHash: version.contentHash,
      versionLabel: version.versionLabel,
      previousHash: version.previousHash,
      tokenEstimate: estimateTokens(body.content),
      createdUtc: version.createdUtc,
    });
  } catch (err: any) {
    console.error("[Prompt-API] PUT error:", err);
    return NextResponse.json(
      { error: `Failed to save prompt: ${err?.message || String(err)}` },
      { status: 500 },
    );
  }
}
