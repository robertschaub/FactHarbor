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

    // Check which domains already exist in cache (if not forcing re-evaluation).
    // Only the requested domains are checked here; root domain cache is checked in Phase 2.
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
      resolvedDomain?: string; // Set when the root domain was used as fallback
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

    // Helper: call the internal evaluate-source endpoint for one domain.
    const internalBase = process.env.FH_INTERNAL_API_URL || "http://localhost:3000";
    const evalUrl = new URL("/api/internal/evaluate-source", internalBase);

    const callEvaluateSource = async (targetDomain: string) => {
      const resp = await fetch(evalUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(runnerKey ? { "x-runner-key": runnerKey } : {}),
        },
        body: JSON.stringify({ domain: targetDomain, multiModel, confidenceThreshold, consensusThreshold }),
      });
      return resp;
    };

    // Evaluate each domain using a two-phase approach consistent with prefetchSourceReliability:
    //   Phase 1 — evaluate the requested domain directly; store its result.
    //   Phase 2 — if Phase 1 returned null score and domain is a subdomain, evaluate the root
    //             domain and store that result too; return the root's score to the caller.
    for (const domain of domains) {
      try {
        const rootDomain = getFamilyDomain(domain);
        const hasRootFallback = rootDomain !== domain;

        // ── Cache check (Phase 1 domain) ─────────────────────────────────────
        const cachedDomain = existingDomains.get(domain);
        if (cachedDomain && cachedDomain.score !== null) {
          results.push({
            domain,
            success: true,
            cached: true,
            score: cachedDomain.score,
            confidence: cachedDomain.confidence,
            consensus: cachedDomain.consensusAchieved,
            fallbackUsed: cachedDomain.fallbackUsed || false,
            fallbackReason: cachedDomain.fallbackReason || null,
            identifiedEntity: cachedDomain.identifiedEntity || null,
            models: "(cached)",
          });
          continue;
        }

        // ── Phase 1: evaluate the requested domain directly ───────────────────
        const evalResponse = await callEvaluateSource(domain);

        if (!evalResponse.ok) {
          if (evalResponse.status === 429) {
            // Cooldown — return whatever is in cache (null-score included as info)
            const cachedFallback = await batchGetCachedData([domain]).then(m => m.get(domain));
            results.push({
              domain,
              success: true,
              cached: true,
              score: cachedFallback?.score,
              confidence: cachedFallback?.confidence,
              consensus: cachedFallback?.consensusAchieved,
              fallbackUsed: cachedFallback?.fallbackUsed || false,
              fallbackReason: cachedFallback?.fallbackReason || null,
              identifiedEntity: cachedFallback?.identifiedEntity || null,
              models: cachedFallback ? "(cached - cooldown active)" : "(cooldown active — no cached result yet)",
            });
            continue;
          }
          const errData = await evalResponse.json().catch(() => ({}));
          results.push({ domain, success: false, error: errData.details || errData.error || `HTTP ${evalResponse.status}` });
          continue;
        }

        const evalData = await evalResponse.json();
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
          evalData.evidenceCited,
          evalData.evidencePack,
          evalData.fallbackUsed || false,
          evalData.fallbackReason || null,
          evalData.identifiedEntity || null,
          evalData.sourceType || null,
        );

        // If Phase 1 yielded a valid score, we're done
        if (evalData.score !== null || !hasRootFallback) {
          results.push({
            domain,
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
          continue;
        }

        // ── Phase 2: subdomain had null score — evaluate the root domain ──────
        const rootEvalResponse = await callEvaluateSource(rootDomain);

        if (!rootEvalResponse.ok) {
          if (rootEvalResponse.status === 429) {
            const cachedRoot = await batchGetCachedData([rootDomain]).then(m => m.get(rootDomain));
            if (cachedRoot && cachedRoot.score !== null) {
              results.push({
                domain,
                resolvedDomain: rootDomain,
                success: true,
                cached: true,
                score: cachedRoot.score,
                confidence: cachedRoot.confidence,
                consensus: cachedRoot.consensusAchieved,
                fallbackUsed: cachedRoot.fallbackUsed || false,
                fallbackReason: cachedRoot.fallbackReason || null,
                identifiedEntity: cachedRoot.identifiedEntity || null,
                models: "(cached - cooldown active)",
              });
            } else {
              // Root on cooldown and no cache — return the null Phase 1 result
              results.push({
                domain,
                success: true,
                cached: false,
                score: evalData.score,
                confidence: evalData.confidence,
                consensus: evalData.consensusAchieved,
                models: evalData.modelPrimary,
              });
            }
            continue;
          }
          // Root evaluation failed — return null Phase 1 result
          results.push({
            domain,
            success: true,
            cached: false,
            score: evalData.score,
            confidence: evalData.confidence,
            consensus: evalData.consensusAchieved,
            models: evalData.modelPrimary,
          });
          continue;
        }

        const rootEvalData = await rootEvalResponse.json();
        await setCachedScore(
          rootDomain,
          rootEvalData.score,
          rootEvalData.confidence,
          rootEvalData.modelPrimary,
          rootEvalData.modelSecondary,
          rootEvalData.consensusAchieved,
          rootEvalData.reasoning,
          rootEvalData.category,
          rootEvalData.biasIndicator,
          rootEvalData.evidenceCited,
          rootEvalData.evidencePack,
          rootEvalData.fallbackUsed || false,
          rootEvalData.fallbackReason || null,
          rootEvalData.identifiedEntity || null,
          rootEvalData.sourceType || null,
        );

        results.push({
          domain,
          resolvedDomain: rootDomain,
          success: true,
          cached: false,
          score: rootEvalData.score,
          confidence: rootEvalData.confidence,
          consensus: rootEvalData.consensusAchieved,
          fallbackUsed: rootEvalData.fallbackUsed || false,
          fallbackReason: rootEvalData.fallbackReason || null,
          identifiedEntity: rootEvalData.identifiedEntity || null,
          models: rootEvalData.modelSecondary
            ? `${rootEvalData.modelPrimary} + ${rootEvalData.modelSecondary}`
            : rootEvalData.modelPrimary,
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
