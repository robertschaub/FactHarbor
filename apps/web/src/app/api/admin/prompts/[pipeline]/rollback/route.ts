/**
 * Admin API - Prompt Rollback
 *
 * POST /api/admin/prompts/:pipeline/rollback - Rollback to a previous version
 */

import { NextResponse } from "next/server";
import {
  isValidPipeline,
  getPromptFilePath,
  clearPromptCache,
  type Pipeline,
} from "@/lib/analyzer/prompt-loader";
import { rollbackToVersion, getPromptVersionByHash } from "@/lib/prompt-storage";
import { writeFile, rename } from "fs/promises";

export const runtime = "nodejs";

function getAdminKey(): string | null {
  const v = process.env.FH_ADMIN_KEY;
  return v && v.trim() ? v : null;
}

function isAuthorized(req: Request): boolean {
  const adminKey = getAdminKey();
  if (!adminKey && process.env.NODE_ENV !== "production") return true;
  const providedKey = req.headers.get("x-admin-key");
  return !!providedKey && providedKey === adminKey;
}

interface RouteParams {
  params: Promise<{ pipeline: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
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

  let body: { contentHash: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.contentHash || typeof body.contentHash !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'contentHash' field" },
      { status: 400 },
    );
  }

  try {
    // Get the version content to restore
    const targetVersion = await getPromptVersionByHash(body.contentHash);
    if (!targetVersion) {
      return NextResponse.json(
        { error: `Version not found: ${body.contentHash}` },
        { status: 404 },
      );
    }

    // 1. Write content back to file
    const filePath = getPromptFilePath(pipeline as Pipeline);
    const tempPath = `${filePath}.${Date.now()}.tmp`;
    await writeFile(tempPath, targetVersion.content, "utf-8");
    await rename(tempPath, filePath);

    // 2. Activate version in database
    const rolledBack = await rollbackToVersion(pipeline, body.contentHash);
    if (!rolledBack) {
      return NextResponse.json(
        { error: "Rollback failed" },
        { status: 500 },
      );
    }

    // 3. Clear file cache so next load picks up restored content
    clearPromptCache();

    return NextResponse.json({
      success: true,
      pipeline,
      contentHash: rolledBack.contentHash,
      versionLabel: rolledBack.versionLabel,
      activatedUtc: rolledBack.activatedUtc,
    });
  } catch (err: any) {
    console.error("[Prompt-API] Rollback error:", err);
    return NextResponse.json(
      { error: `Rollback failed: ${err?.message || String(err)}` },
      { status: 500 },
    );
  }
}
