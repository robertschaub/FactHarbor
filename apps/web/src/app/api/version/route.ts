import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_SHA ||
    process.env.SOURCE_VERSION ||
    null;

  return NextResponse.json(
    {
      service: "factharbor-web",
      node_env: process.env.NODE_ENV ?? null,
      llm_provider: process.env.LLM_PROVIDER ?? "openai",
      git_sha: gitSha,
      now_utc: new Date().toISOString()
    },
    { status: 200 }
  );
}
