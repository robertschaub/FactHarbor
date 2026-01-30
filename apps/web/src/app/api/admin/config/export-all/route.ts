/**
 * Export All Configs API
 *
 * Returns all active configurations as a single JSON file for backup/disaster recovery.
 *
 * GET /api/admin/config/export-all
 *
 * Part of UCM Pre-Validation Sprint - Day 1 (Export All Configs)
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/config-storage";

export async function GET() {
  try {
    const db = await getDb();

    // Query all active configs
    const activeConfigs = await db.all<
      Array<{
        config_type: string;
        profile_key: string;
        active_hash: string;
        activated_utc: string;
        activated_by: string | null;
      }>
    >("SELECT * FROM config_active");

    // For each active config, fetch the full content
    const configs: Record<
      string,
      Record<string, { versionLabel: string; content: any; activatedUtc: string }>
    > = {};

    for (const active of activeConfigs) {
      const blob = await db.get<{
        content_hash: string;
        version_label: string;
        content: string;
      }>("SELECT content_hash, version_label, content FROM config_blobs WHERE content_hash = ?", [
        active.active_hash,
      ]);

      if (blob) {
        if (!configs[active.config_type]) {
          configs[active.config_type] = {};
        }

        // Parse content based on type
        let parsedContent: any;
        try {
          parsedContent = JSON.parse(blob.content);
        } catch {
          // If not JSON, keep as string (e.g., prompt markdown)
          parsedContent = blob.content;
        }

        configs[active.config_type][active.profile_key] = {
          versionLabel: blob.version_label,
          content: parsedContent,
          activatedUtc: active.activated_utc,
        };
      }
    }

    // Build export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      analyzerVersion: "2.9.0",
      schemaVersion: "1.0",
      configs,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("[ExportAll] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
