import { NextResponse } from "next/server";
import { getHealthState, resumeSystem, pauseSystem } from "@/lib/provider-health";
import { fireWebhook } from "@/lib/provider-webhook";
import { drainRunnerQueue } from "@/lib/internal-runner-queue";
import { getAllProviderStats } from "@/lib/search-circuit-breaker";
import { getEnv, secureCompare } from "@/lib/auth";

export const runtime = "nodejs";

/** GET — public: return current system health state (for UI banner polling) */
export async function GET() {
  const healthState = getHealthState();

  // Add search provider circuit breaker stats
  const searchProviders = getAllProviderStats();

  // Create extended health state with search providers
  const extendedProviders: Record<string, any> = { ...healthState.providers };

  for (const provider of searchProviders) {
    if (provider.state !== "closed") {
      // Map provider name to lowercase for consistency (e.g., "Google-CSE" → "google_cse")
      const providerKey = provider.provider.toLowerCase().replace("-", "_");

      extendedProviders[providerKey] = {
        state: provider.state,
        consecutiveFailures: provider.consecutiveFailures,
        lastFailureTime: provider.lastFailureTime,
        lastFailureMessage: `${provider.provider} circuit ${provider.state.toUpperCase()}`,
        lastSuccessTime: provider.lastSuccessTime,
      };
    }
  }

  // Always remove the generic "search" provider from the UI response.
  // We now use specific provider tracking (Google-CSE, Brave, SerpAPI) which is more accurate.
  // The generic "search" provider in provider-health.ts is legacy and can have stale state.
  delete extendedProviders.search;

  return NextResponse.json({
    ...healthState,
    providers: extendedProviders,
  });
}

/** POST — admin-only actions: resume or pause the system */
export async function POST(req: Request) {
  // Admin auth required for mutations
  const expectedKey = getEnv("FH_ADMIN_KEY");
  if (expectedKey) {
    const got = req.headers.get("x-admin-key");
    if (!secureCompare(expectedKey, got)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "FH_ADMIN_KEY not configured" }, { status: 503 });
  }

  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "resume") {
    resumeSystem();
    void fireWebhook({
      type: "system_resumed",
      reason: "Admin manually resumed the system",
      timestamp: new Date().toISOString(),
      healthState: getHealthState(),
    });
    void drainRunnerQueue();
    return NextResponse.json({ ok: true, healthState: getHealthState() });
  }

  if (body.action === "pause") {
    const reason = body.reason || "Manually paused by admin";
    pauseSystem(reason);
    void fireWebhook({
      type: "system_paused",
      reason,
      timestamp: new Date().toISOString(),
      healthState: getHealthState(),
    });
    return NextResponse.json({ ok: true, healthState: getHealthState() });
  }

  return NextResponse.json(
    { ok: false, error: `Unknown action: "${body.action}". Valid: resume, pause` },
    { status: 400 },
  );
}
