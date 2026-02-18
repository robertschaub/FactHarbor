/**
 * Admin API - Search Cache & Circuit Breaker Stats
 *
 * Returns search cache statistics and circuit breaker status.
 * GET: Retrieve cache stats, circuit breaker status
 * POST: Clear cache, reset circuits, cleanup expired entries
 */

import { NextResponse } from "next/server";
import {
  getCacheStats,
  cleanupExpiredCache,
  clearAllCache,
} from "@/lib/search-cache";
import {
  getAllProviderStats,
  getProviderStats,
  resetCircuit,
  resetAllCircuits,
} from "@/lib/search-circuit-breaker";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get cache statistics
    if (action === "cache-stats") {
      const stats = await getCacheStats();
      return NextResponse.json({ cache: stats });
    }

    // Get circuit breaker statistics
    if (action === "circuit-breaker-stats") {
      const providerStats = getAllProviderStats();
      return NextResponse.json({ circuitBreaker: providerStats });
    }

    // Get specific provider stats
    if (action === "provider-stats") {
      const provider = url.searchParams.get("provider");
      if (!provider) {
        return NextResponse.json({ error: "Missing provider parameter" }, { status: 400 });
      }
      const stats = getProviderStats(provider);
      return NextResponse.json({ provider, stats });
    }

    // Default: return everything
    const cacheStats = await getCacheStats();
    const circuitBreakerStats = getAllProviderStats();

    // Calculate cache hit rate estimate (from provider breakdown vs total)
    const cacheHitRate =
      cacheStats.validEntries > 0
        ? (cacheStats.validEntries / (cacheStats.validEntries + cacheStats.expiredEntries)) * 100
        : 0;

    return NextResponse.json({
      cache: {
        ...cacheStats,
        estimatedHitRate: Math.round(cacheHitRate * 100) / 100, // 2 decimal places
      },
      circuitBreaker: circuitBreakerStats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Admin Search-Stats] GET Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch search stats" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action: string = body.action;

    // Cleanup expired cache entries
    if (action === "cleanup") {
      const deleted = await cleanupExpiredCache();
      return NextResponse.json({
        success: true,
        action: "cleanup",
        deleted,
        message: `Deleted ${deleted} expired cache entries`,
      });
    }

    // Clear all cache
    if (action === "clear-cache") {
      const deleted = await clearAllCache();
      return NextResponse.json({
        success: true,
        action: "clear-cache",
        deleted,
        message: `Cleared ${deleted} cache entries`,
      });
    }

    // Reset specific provider circuit
    if (action === "reset-circuit") {
      const provider: string = body.provider;
      if (!provider) {
        return NextResponse.json({ error: "Missing provider parameter" }, { status: 400 });
      }
      resetCircuit(provider);
      return NextResponse.json({
        success: true,
        action: "reset-circuit",
        provider,
        message: `Reset circuit for ${provider}`,
      });
    }

    // Reset all circuits
    if (action === "reset-all-circuits") {
      resetAllCircuits();
      return NextResponse.json({
        success: true,
        action: "reset-all-circuits",
        message: "Reset all provider circuits",
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[Admin Search-Stats] POST Error:", err);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 },
    );
  }
}
