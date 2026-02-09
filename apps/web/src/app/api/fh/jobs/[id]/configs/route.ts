/**
 * API - Job Config Usage
 *
 * GET /api/fh/jobs/:id/configs - Get configs used by a job
 *
 * Returns the config versions (search, calculation) that were used for this job,
 * along with any environment variable overrides that were applied.
 */

import { NextResponse } from "next/server";
import { getConfigUsageForJob, getConfigBlob } from "@/lib/config-storage";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  const { id: jobId } = await context.params;

  if (!jobId) {
    return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
  }

  try {
    const usages = await getConfigUsageForJob(jobId);

    // Dedupe to latest per (type, profile) to avoid duplicates and React key collisions
    const latestByTypeProfile = new Map<string, typeof usages[0]>();
    for (const usage of usages) {
      const key = `${usage.configType}:${usage.profileKey}`;
      const existing = latestByTypeProfile.get(key);
      // Keep the one with the latest loadedUtc
      if (!existing || usage.loadedUtc > existing.loadedUtc) {
        latestByTypeProfile.set(key, usage);
      }
    }

    // Fetch additional details for each deduplicated config
    const configs = await Promise.all(
      Array.from(latestByTypeProfile.values()).map(async (usage) => {
        // Handle "default" hash (config from schema defaults, not DB)
        const isDefault = usage.contentHash === "default" || usage.contentHash === "error-fallback";
        const blob = isDefault ? null : await getConfigBlob(usage.contentHash);
        return {
          // Include id for unique React key
          id: usage.id,
          configType: usage.configType,
          profileKey: usage.profileKey,
          contentHash: usage.contentHash,
          versionLabel: isDefault ? "(schema default)" : (blob?.versionLabel || "Unknown"),
          schemaVersion: isDefault ? "default" : (blob?.schemaVersion || "Unknown"),
          loadedUtc: usage.loadedUtc,
          effectiveOverrides: usage.effectiveOverrides,
          hasOverrides: usage.effectiveOverrides && usage.effectiveOverrides.length > 0,
        };
      }),
    );

    return NextResponse.json({
      jobId,
      configs,
      count: configs.length,
      totalRecords: usages.length, // Include for debugging if needed
    });
  } catch (err: unknown) {
    console.error(`[Jobs-Configs-API] Error getting configs for job ${jobId}:`, err);
    return NextResponse.json(
      { error: `Failed to get configs: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
