/**
 * Job Prompt Usage API
 *
 * GET /api/fh/jobs/:id/prompts - Get prompt(s) used for a specific analysis job
 */

import { NextResponse } from "next/server";
import {
  getPromptUsageForJob,
  getPromptContentForJob,
} from "@/lib/prompt-storage";

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
    if (pipeline && includeContent) {
      // Get full content for a specific pipeline
      const promptData = await getPromptContentForJob(jobId, pipeline);
      if (!promptData) {
        return NextResponse.json(
          { error: "No prompt usage found for this job and pipeline" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        jobId,
        pipeline,
        contentHash: promptData.contentHash,
        loadedUtc: promptData.loadedUtc,
        content: promptData.content,
      });
    }

    // Get usage records (without full content)
    const usage = await getPromptUsageForJob(jobId);

    return NextResponse.json({
      jobId,
      prompts: usage.map((u) => ({
        pipeline: u.pipeline,
        contentHash: u.contentHash,
        loadedUtc: u.loadedUtc,
      })),
    });
  } catch (err: any) {
    console.error("[Prompt-API] Job prompts error:", err);
    return NextResponse.json(
      { error: `Failed to get prompt usage: ${err?.message || String(err)}` },
      { status: 500 },
    );
  }
}
