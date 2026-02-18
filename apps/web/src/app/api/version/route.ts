import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config-storage";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";
import { getActiveSearchProviders } from "@/lib/web-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_SHA ||
    process.env.SOURCE_VERSION ||
    null;
  let llmProvider = DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic";
  let searchConfig;
  try {
    const pipelineConfig = await getConfig("pipeline", "default");
    llmProvider = pipelineConfig.config.llmProvider ?? llmProvider;
    searchConfig = (await getConfig("search", "default")).config;
  } catch {
    // Fall back to defaults if config load fails.
  }

  // Get active search providers (includes fallbacks if in auto mode)
  const searchProviders = getActiveSearchProviders(searchConfig);

  return NextResponse.json(
    {
      service: "factharbor-web",
      node_env: process.env.NODE_ENV ?? null,
      llm_provider: llmProvider,
      search_providers: searchProviders, // Array of active providers
      git_sha: gitSha,
      now_utc: new Date().toISOString()
    },
    { status: 200 }
  );
}
