/**
 * Config Hash Search API
 *
 * Searches for config versions by full or partial hash.
 *
 * GET /api/admin/config/search-hash?q=[query]
 *
 * Part of UCM Pre-Validation Sprint - Day 5 (Config Search by Hash)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/config-storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 4) {
      return NextResponse.json(
        { error: "Query must be at least 4 characters" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Search for blobs matching the hash pattern
    const results = await db.all<
      Array<{
        content_hash: string;
        config_type: string;
        profile_key: string;
        schema_version: string;
        version_label: string;
        content: string;
        created_utc: string;
        created_by: string | null;
      }>
    >(
      `
      SELECT
        content_hash,
        config_type,
        profile_key,
        schema_version,
        version_label,
        content,
        created_utc,
        created_by
      FROM config_blobs
      WHERE content_hash LIKE ?
      ORDER BY created_utc DESC
      LIMIT 50
      `,
      [`%${query}%`]
    );

    // For each result, check if it's active
    const enrichedResults = await Promise.all(
      results.map(async (r) => {
        const activeRecord = await db.get<{
          active_hash: string;
          activated_utc: string;
          activated_by: string | null;
        }>(
          "SELECT active_hash, activated_utc, activated_by FROM config_active WHERE config_type = ? AND profile_key = ?",
          [r.config_type, r.profile_key]
        );

        const isActive = activeRecord?.active_hash === r.content_hash;

        return {
          contentHash: r.content_hash,
          configType: r.config_type,
          profileKey: r.profile_key,
          schemaVersion: r.schema_version,
          versionLabel: r.version_label,
          content: r.content,
          createdUtc: r.created_utc,
          createdBy: r.created_by,
          isActive,
          activatedUtc: isActive ? activeRecord.activated_utc : null,
          activatedBy: isActive ? activeRecord.activated_by : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      query,
      results: enrichedResults,
      totalResults: enrichedResults.length,
    });
  } catch (error) {
    console.error("[HashSearch] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Hash search failed" },
      { status: 500 }
    );
  }
}
