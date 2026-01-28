/**
 * Job Prompt Usage API
 *
 * GET /api/fh/jobs/:id/prompts - Get prompt(s) used for a specific analysis job
 *
 * UNIFIED: Now reads from config_usage where config_type='prompt'
 */

import { NextResponse } from "next/server";
import { getConfigUsageForJob, getConfigBlob } from "@/lib/config-storage";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
  }

  const url = new URL(req.url);
  const pipeline = url.searchParams.get("pipeline");
  const includeContent = url.searchParams.get("content") === "true";

  try {
    // Get all config usage for this job
    const allUsage = await getConfigUsageForJob(jobId);

    // Filter to prompt configs only
    const promptUsage = allUsage.filter((u) => u.configType === "prompt");

    if (pipeline && includeContent) {
      // Get full content for a specific pipeline
      const usage = promptUsage.find((u) => u.profileKey === pipeline);
      if (!usage) {
        return NextResponse.json(
          { error: "No prompt usage found for this job and pipeline" },
          { status: 404 },
        );
      }

      // Fetch the actual content
      const blob = await getConfigBlob(usage.contentHash);
      if (!blob) {
        return NextResponse.json(
          { error: "Prompt content not found (blob missing)" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        jobId,
        pipeline: usage.profileKey,
        contentHash: usage.contentHash,
        loadedUtc: usage.loadedUtc,
        content: blob.content,
      });
    }

    // Get usage records (without full content)
    return NextResponse.json({
      jobId,
      prompts: promptUsage.map((u) => ({
        pipeline: u.profileKey,
        contentHash: u.contentHash,
        loadedUtc: u.loadedUtc,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Prompt-API] Job prompts error:", message);
    return NextResponse.json(
      { error: `Failed to get prompt usage: ${message}` },
      { status: 500 },
    );
  }
}
