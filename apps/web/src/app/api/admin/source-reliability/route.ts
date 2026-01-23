/**
 * Admin API - Source Reliability Cache
 *
 * Returns cached source reliability data for admin viewing.
 * POST: Evaluate domains and add to cache.
 */

import { NextResponse } from "next/server";
import { getCacheStats, getAllCachedScores, cleanupExpired, deleteCachedScore, setCachedScore, batchGetCachedData } from "@/lib/source-reliability-cache";

export const runtime = "nodejs";

// Get effective weight calculation config (read from env, matching source-reliability.ts)
function getConfig() {
  return {
    blendCenter: 0.5, // Fixed: mathematical neutral
    defaultScore: parseFloat(process.env.FH_SR_DEFAULT_SCORE || "0.5"),
  };
}

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

// Check admin auth
function checkAuth(req: Request): boolean {
  const adminKey = getEnv("FH_ADMIN_KEY");
  if (!adminKey) {
    // Allow in development without key
    return process.env.NODE_ENV !== "production";
  }
  const got = req.headers.get("x-admin-key");
  return got === adminKey;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "stats") {
      const stats = await getCacheStats();
      return NextResponse.json(stats);
    }

    if (action === "cleanup") {
      const deleted = await cleanupExpired();
      return NextResponse.json({ deleted });
    }

    // Default: return all cached scores
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const sortBy = url.searchParams.get("sortBy") || "evaluated_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    const data = await getAllCachedScores({ limit, offset, sortBy, sortOrder });
    const stats = await getCacheStats();
    const config = getConfig();

    return NextResponse.json({
      ...data,
      stats,
      config,
    });
  } catch (err) {
    console.error("[Admin SR] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch source reliability data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const domainsInput: string = body.domains || "";
    const forceReevaluate: boolean = body.forceReevaluate ?? false;
    
    // Parse domains from input (comma-separated, newline-separated, or space-separated)
    const domains = domainsInput
      .split(/[,\n\s]+/)
      .map((d: string) => d.trim().toLowerCase())
      .filter((d: string) => d.length > 0 && d.includes("."));

    if (domains.length === 0) {
      return NextResponse.json(
        { error: "No valid domains provided" },
        { status: 400 }
      );
    }

    // Limit batch size
    if (domains.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 domains per request" },
        { status: 400 }
      );
    }

    // Check which domains already exist in cache (if not forcing re-evaluation)
    let existingDomains = new Map<string, { score: number | null; confidence: number; consensusAchieved: boolean }>();
    if (!forceReevaluate) {
      existingDomains = await batchGetCachedData(domains);
    }

    // Get config for evaluation
    const multiModel = process.env.FH_SR_MULTI_MODEL !== "false";
    const confidenceThreshold = parseFloat(process.env.FH_SR_CONFIDENCE_THRESHOLD || "0.65");
    const consensusThreshold = parseFloat(process.env.FH_SR_CONSENSUS_THRESHOLD || "0.15");
    const runnerKey = getEnv("FH_INTERNAL_RUNNER_KEY");

    const results: Array<{
      domain: string;
      success: boolean;
      cached?: boolean;
      score?: number | null;
      confidence?: number;
      consensus?: boolean;
      models?: string;
      error?: string;
    }> = [];

    // Evaluate each domain
    for (const domain of domains) {
      try {
        // Check if already cached (and not forcing re-evaluation)
        const existingData = existingDomains.get(domain);
        if (existingData) {
          results.push({
            domain,
            success: true,
            cached: true,
            score: existingData.score,
            confidence: existingData.confidence,
            consensus: existingData.consensusAchieved,
            models: "(cached)",
          });
          continue;
        }

        // Call internal evaluate endpoint
        const evalUrl = new URL("/api/internal/evaluate-source", req.url);
        const evalResponse = await fetch(evalUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(runnerKey ? { "x-runner-key": runnerKey } : {}),
          },
          body: JSON.stringify({
            domain,
            multiModel,
            confidenceThreshold,
            consensusThreshold,
          }),
        });

        if (!evalResponse.ok) {
          const errData = await evalResponse.json().catch(() => ({}));
          results.push({
            domain,
            success: false,
            error: errData.details || errData.error || `HTTP ${evalResponse.status}`,
          });
          continue;
        }

        const evalData = await evalResponse.json();
        
        // Save to cache
        await setCachedScore(
          domain,
          evalData.score,
          evalData.confidence,
          evalData.modelPrimary,
          evalData.modelSecondary,
          evalData.consensusAchieved,
          evalData.reasoning,
          evalData.category,
          evalData.biasIndicator,
          evalData.evidenceCited
        );

        results.push({
          domain,
          success: true,
          cached: false,
          score: evalData.score,
          confidence: evalData.confidence,
          consensus: evalData.consensusAchieved,
          models: evalData.modelSecondary 
            ? `${evalData.modelPrimary} + ${evalData.modelSecondary}`
            : evalData.modelPrimary,
        });
      } catch (err) {
        results.push({
          domain,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const cached = results.filter(r => r.success && r.cached).length;
    const newlyEvaluated = results.filter(r => r.success && !r.cached).length;

    return NextResponse.json({
      success: true,
      total: domains.length,
      successful,
      failed,
      cached,
      newlyEvaluated,
      results,
    });
  } catch (err) {
    console.error("[Admin SR] Evaluate error:", err);
    return NextResponse.json(
      { error: "Failed to evaluate domains" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain");

    // Single domain deletion via query param
    if (domain) {
      const deleted = await deleteCachedScore(domain);
      
      if (deleted) {
        return NextResponse.json({ success: true, domain });
      } else {
        return NextResponse.json(
          { error: "Domain not found in cache" },
          { status: 404 }
        );
      }
    }

    // Batch deletion via JSON body
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await req.json();
      const domains: string[] = body.domains;

      if (!Array.isArray(domains) || domains.length === 0) {
        return NextResponse.json(
          { error: "Missing 'domains' array in request body" },
          { status: 400 }
        );
      }

      // Limit batch size for safety
      if (domains.length > 500) {
        return NextResponse.json(
          { error: "Batch size exceeds limit of 500" },
          { status: 400 }
        );
      }

      let deletedCount = 0;
      for (const d of domains) {
        if (typeof d === "string" && d.trim()) {
          const deleted = await deleteCachedScore(d.trim());
          if (deleted) deletedCount++;
        }
      }

      return NextResponse.json({ 
        success: true, 
        deleted: deletedCount, 
        requested: domains.length 
      });
    }

    return NextResponse.json(
      { error: "Missing 'domain' parameter or JSON body with 'domains' array" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[Admin SR] Delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
