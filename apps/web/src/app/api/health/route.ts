import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isNonEmpty(s?: string | null) {
  return typeof s === "string" && s.trim().length > 0;
}

export async function GET() {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  const checks = {
    FH_API_BASE_URL_present: isNonEmpty(process.env.FH_API_BASE_URL),
    FH_ADMIN_KEY_present: isNonEmpty(process.env.FH_ADMIN_KEY),
    FH_INTERNAL_RUNNER_KEY_present: isNonEmpty(process.env.FH_INTERNAL_RUNNER_KEY),
    LLM_PROVIDER: provider,
    OPENAI_API_KEY_present: isNonEmpty(process.env.OPENAI_API_KEY),
    ANTHROPIC_API_KEY_present: isNonEmpty(process.env.ANTHROPIC_API_KEY),
  };

  const providerOk =
    provider === "openai"
      ? checks.OPENAI_API_KEY_present
      : provider === "anthropic" || provider === "claude"
        ? checks.ANTHROPIC_API_KEY_present
        : false;

  let apiReachable: boolean | null = null;
  let apiHealthStatus: number | null = null;
  let apiError: string | null = null;

  if (checks.FH_API_BASE_URL_present) {
    try {
      const url = `${process.env.FH_API_BASE_URL!.replace(/\/$/, "")}/health`;
      const res = await fetch(url, { method: "GET" });
      apiReachable = true;
      apiHealthStatus = res.status;
    } catch (e: any) {
      apiReachable = false;
      apiError = e?.message ?? String(e);
    }
  }

  const ok =
    checks.FH_API_BASE_URL_present &&
    checks.FH_ADMIN_KEY_present &&
    checks.FH_INTERNAL_RUNNER_KEY_present &&
    providerOk &&
    (apiReachable !== false);

  return NextResponse.json(
    { ok, checks, api: { reachable: apiReachable, health_status: apiHealthStatus, error: apiError } },
    { status: ok ? 200 : 503 }
  );
}
