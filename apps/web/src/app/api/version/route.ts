import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config-storage";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_SHA ||
    process.env.SOURCE_VERSION ||
    null;
  let llmProvider = DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic";
  try {
    const pipelineConfig = await getConfig("pipeline", "default");
    llmProvider = pipelineConfig.config.llmProvider ?? llmProvider;
  } catch {
    // Fall back to default provider if config load fails.
  }

  return NextResponse.json(
    {
      service: "factharbor-web",
      node_env: process.env.NODE_ENV ?? null,
      llm_provider: llmProvider,
      git_sha: gitSha,
      now_utc: new Date().toISOString()
    },
    { status: 200 }
  );
}
