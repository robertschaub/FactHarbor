/**
 * Active Config Summary API
 *
 * Returns a summary of all active configurations for dashboard display.
 *
 * GET /api/admin/config/active-summary
 *
 * Part of UCM Pre-Validation Sprint - Day 2 (Active Config Dashboard)
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/config-storage";

export async function GET() {
  try {
    const db = await getDb();

    // Query all active configs with blob metadata
    const activeConfigs = await db.all<
      Array<{
        config_type: string;
        profile_key: string;
        active_hash: string;
        activated_utc: string;
        activated_by: string | null;
        version_label: string;
        created_utc: string;
      }>
    >(`
      SELECT
        a.config_type,
        a.profile_key,
        a.active_hash,
        a.activated_utc,
        a.activated_by,
        b.version_label,
        b.created_utc
      FROM config_active a
      LEFT JOIN config_blobs b ON a.active_hash = b.content_hash
      ORDER BY a.config_type, a.profile_key
    `);

    // Group by config type for easier rendering
    const grouped: Record<
      string,
      Array<{
        profileKey: string;
        hash: string;
        versionLabel: string;
        activatedUtc: string;
        activatedBy: string | null;
        createdUtc: string;
      }>
    > = {};

    for (const config of activeConfigs) {
      if (!grouped[config.config_type]) {
        grouped[config.config_type] = [];
      }

      grouped[config.config_type].push({
        profileKey: config.profile_key,
        hash: config.active_hash,
        versionLabel: config.version_label,
        activatedUtc: config.activated_utc,
        activatedBy: config.activated_by,
        createdUtc: config.created_utc,
      });
    }

    return NextResponse.json({
      success: true,
      activeConfigs: grouped,
      totalCount: activeConfigs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ActiveSummary] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch active configs" },
      { status: 500 }
    );
  }
}
