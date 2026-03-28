import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config-storage";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";
import { getActiveSearchProviders } from "@/lib/web-search";
import { checkAdminKey } from "@/lib/auth";
import { getWebGitCommitHash } from "@/lib/build-info";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const isAdmin = checkAdminKey(req);
  // GIT_COMMIT is the canonical env var set by deploy.sh (matches AppBuildInfo.cs on the API side).
  // VERCEL_GIT_COMMIT_SHA / GIT_SHA / SOURCE_VERSION are platform-specific fallbacks.
  const gitSha = getWebGitCommitHash({ useCache: true });

  const baseResponse: any = {
    service: "factharbor-web",
    node_env: process.env.NODE_ENV ?? null,
    git_sha: gitSha,
    now_utc: new Date().toISOString()
  };

  // Only include config info for authenticated admin requests
  if (isAdmin) {
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

    baseResponse.llm_provider = llmProvider;
    baseResponse.search_providers = searchProviders;
  }

  return NextResponse.json(baseResponse, { status: 200 });
}
