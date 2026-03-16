/**
 * Source Reliability Cache API
 *
 * GET: Returns cached source reliability data for read-only viewing.
 * POST: Evaluate domains and add to cache.
 */

import { NextResponse } from "next/server";
import { getCacheStats, getAllCachedScores, cleanupExpired, deleteCachedScore, setCachedScore, batchGetCachedData } from "@/lib/source-reliability-cache";
import { getConfig } from "@/lib/config-storage";
import { checkAdminKey, getEnv } from "@/lib/auth";
import { getFamilyDomain } from "@/lib/domain-utils";

export const runtime = "nodejs";

// Get effective weight calculation config (using shared config)
async function getWeightConfig() {
  const calcConfigResult = await getConfig("calculation", "default");
  const calcConfig = calcConfigResult.config;
  return {
    blendCenter: 0.5, // Fixed: mathematical neutral
    // Consumer-owned fallback when SR returns null for unknown sources.
    defaultScore: calcConfig.sourceReliability.defaultScore,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "stats") {
      const stats = await getCacheStats();
      return NextResponse.json(stats);
    }

    if (action === "cleanup") {
      if (!checkAdminKey(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const deleted = await cleanupExpired();
      return NextResponse.json({ deleted });
    }

    // Default: return all cached scores
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const sortBy = url.searchParams.get("sortBy") || "evaluated_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const search = url.searchParams.get("search") || undefined;

    const data = await getAllCachedScores({ limit, offset, sortBy, sortOrder, search });
    const stats = await getCacheStats();
    const config = await getWeightConfig();

    return NextResponse.json({
      ...data,
      entries: data.entries.map((entry) => ({
        ...entry,
        familyDomain: getFamilyDomain(entry.domain),
      })),
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
  if (!checkAdminKey(req)) {
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
    let existingDomains = new Map<string, { score: number | null; confidence: number; consensusAchieved: boolean; fallbackUsed?: boolean; fallbackReason?: string | null; identifiedEntity?: string | null }>();
    if (!forceReevaluate) {
      existingDomains = await batchGetCachedData(domains);
    }

    // Get config for evaluation (using unified defaults)
    const srConfigResult = await getConfig("sr", "default");
    const srConfig = srConfigResult.config;
    const multiModel = srConfig.multiModel;
    const confidenceThreshold = srConfig.confidenceThreshold; // Unified default: 0.8
    const consensusThreshold = srConfig.consensusThreshold;
    const runnerKey = getEnv("FH_INTERNAL_RUNNER_KEY");

    const results: Array<{
      domain: string;
      resolvedDomain?: string; // Set when input was a subdomain redirected to the root domain
      success: boolean;
      cached?: boolean;
      score?: number | null;
      confidence?: number;
      consensus?: boolean;
      fallbackUsed?: boolean;
      fallbackReason?: string | null;
      identifiedEntity?: string | null;
      models?: string;
      error?: string;
    }> = [];

    // Evaluate each domain
    for (const domain of domains) {
      try {
        // Apply root-domain fallback: evaluate the root domain instead of a subdomain.
        // Consistent with prefetchSourceReliability behaviour.
        const rootDomain = getFamilyDomain(domain);
        const evalTarget = rootDomain !== domain ? rootDomain : domain;

        // Check if already cached (and not forcing re-evaluation)
        const existingData = existingDomains.get(evalTarget) ?? existingDomains.get(domain);
        if (existingData) {
          results.push({
            domain,
            ...(evalTarget !== domain ? { resolvedDomain: evalTarget } : {}),
            success: true,
            cached: true,
            score: existingData.score,
            confidence: existingData.confidence,
            consensus: existingData.consensusAchieved,
            fallbackUsed: existingData.fallbackUsed || false,
            fallbackReason: existingData.fallbackReason || null,
            identifiedEntity: existingData.identifiedEntity || null,
            models: "(cached)",
          });
          continue;
        }

        // Call internal evaluate endpoint — must use localhost (not req.url which may be the public HTTPS hostname)
        const internalBase = process.env.FH_INTERNAL_API_URL || "http://localhost:3000";
        const evalUrl = new URL("/api/internal/evaluate-source", internalBase);
        const evalResponse = await fetch(evalUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(runnerKey ? { "x-runner-key": runnerKey } : {}),
          },
          body: JSON.stringify({
            domain: evalTarget,
            multiModel,
            confidenceThreshold,
            consensusThreshold,
          }),
        });

        if (!evalResponse.ok) {
          // On domain cooldown (429), return cached result if available — not a real error
          if (evalResponse.status === 429) {
            const cachedFallback = await batchGetCachedData([evalTarget]).then(m => m.get(evalTarget));
            if (cachedFallback) {
              results.push({
                domain,
                ...(evalTarget !== domain ? { resolvedDomain: evalTarget } : {}),
                success: true,
                cached: true,
                score: cachedFallback.score,
                confidence: cachedFallback.confidence,
                consensus: cachedFallback.consensusAchieved,
                fallbackUsed: cachedFallback.fallbackUsed || false,
                fallbackReason: cachedFallback.fallbackReason || null,
                identifiedEntity: cachedFallback.identifiedEntity || null,
                models: "(cached - cooldown active)",
              });
            } else {
              results.push({
                domain,
                ...(evalTarget !== domain ? { resolvedDomain: evalTarget } : {}),
                success: true,
                cached: true,
                models: "(cooldown active — no cached result yet)",
              });
            }
            continue;
          }
          const errData = await evalResponse.json().catch(() => ({}));
          results.push({
            domain,
            success: false,
            error: errData.details || errData.error || `HTTP ${evalResponse.status}`,
          });
          continue;
        }

        const evalData = await evalResponse.json();
        
        // Save to cache under evalTarget (root domain when subdomain was submitted)
        await setCachedScore(
          evalTarget,
          evalData.score,
          evalData.confidence,
          evalData.modelPrimary,
          evalData.modelSecondary,
          evalData.consensusAchieved,
          evalData.reasoning,
          evalData.category,
          evalData.biasIndicator,
          evalData.evidenceCited,
          evalData.evidencePack,
          evalData.fallbackUsed || false,
          evalData.fallbackReason || null,
          evalData.identifiedEntity || null,
          evalData.sourceType || null
        );

        results.push({
          domain,
          ...(evalTarget !== domain ? { resolvedDomain: evalTarget } : {}),
          success: true,
          cached: false,
          score: evalData.score,
          confidence: evalData.confidence,
          consensus: evalData.consensusAchieved,
          fallbackUsed: evalData.fallbackUsed || false,
          fallbackReason: evalData.fallbackReason || null,
          identifiedEntity: evalData.identifiedEntity || null,
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
  if (!checkAdminKey(req)) {
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
