/**
 * Config Diff API
 *
 * Compares two config versions and returns structured diff data.
 *
 * GET /api/admin/config/diff?hash1=[hash1]&hash2=[hash2]
 *
 * Part of UCM Pre-Validation Sprint - Day 3-4 (Config Diff View)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/config-storage";

export const dynamic = "force-dynamic";

/**
 * Simple recursive diff function for JSON objects
 * Returns an array of changes with path, oldValue, and newValue
 */
function diffObjects(
  obj1: any,
  obj2: any,
  path: string = ""
): Array<{ path: string; oldValue: any; newValue: any; type: "added" | "removed" | "modified" }> {
  const changes: Array<{ path: string; oldValue: any; newValue: any; type: "added" | "removed" | "modified" }> = [];

  // Handle primitive types
  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      changes.push({
        path,
        oldValue: obj1,
        newValue: obj2,
        type: "modified",
      });
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= obj1.length) {
        changes.push({ path: itemPath, oldValue: undefined, newValue: obj2[i], type: "added" });
      } else if (i >= obj2.length) {
        changes.push({ path: itemPath, oldValue: obj1[i], newValue: undefined, type: "removed" });
      } else {
        changes.push(...diffObjects(obj1[i], obj2[i], itemPath));
      }
    }
    return changes;
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  for (const key of allKeys) {
    const fieldPath = path ? `${path}.${key}` : key;
    if (!(key in obj1)) {
      changes.push({ path: fieldPath, oldValue: undefined, newValue: obj2[key], type: "added" });
    } else if (!(key in obj2)) {
      changes.push({ path: fieldPath, oldValue: obj1[key], newValue: undefined, type: "removed" });
    } else {
      changes.push(...diffObjects(obj1[key], obj2[key], fieldPath));
    }
  }

  return changes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash1 = searchParams.get("hash1");
    const hash2 = searchParams.get("hash2");

    if (!hash1 || !hash2) {
      return NextResponse.json(
        { error: "Missing hash1 or hash2 query parameters" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch both versions
    const [version1, version2] = await Promise.all([
      db.get<{
        content_hash: string;
        version_label: string;
        content: string;
        created_utc: string;
        config_type: string;
        profile_key: string;
      }>(
        "SELECT content_hash, version_label, content, created_utc, config_type, profile_key FROM config_blobs WHERE content_hash = ?",
        [hash1]
      ),
      db.get<{
        content_hash: string;
        version_label: string;
        content: string;
        created_utc: string;
        config_type: string;
        profile_key: string;
      }>(
        "SELECT content_hash, version_label, content, created_utc, config_type, profile_key FROM config_blobs WHERE content_hash = ?",
        [hash2]
      ),
    ]);

    if (!version1 || !version2) {
      return NextResponse.json(
        { error: "One or both config versions not found" },
        { status: 404 }
      );
    }

    // Parse content (handle both JSON and plain text like prompts)
    let parsed1: any;
    let parsed2: any;
    let contentType: "json" | "text";

    try {
      parsed1 = JSON.parse(version1.content);
      parsed2 = JSON.parse(version2.content);
      contentType = "json";
    } catch {
      // Plain text content (e.g., prompts)
      parsed1 = version1.content;
      parsed2 = version2.content;
      contentType = "text";
    }

    // Calculate diff
    let diff: any;
    if (contentType === "json") {
      const changes = diffObjects(parsed1, parsed2);
      diff = {
        type: "json",
        changes,
        totalChanges: changes.length,
      };
    } else {
      // For text content, do simple line-by-line comparison
      const lines1 = (parsed1 as string).split("\n");
      const lines2 = (parsed2 as string).split("\n");
      diff = {
        type: "text",
        lines1,
        lines2,
        totalLines1: lines1.length,
        totalLines2: lines2.length,
      };
    }

    return NextResponse.json({
      success: true,
      version1: {
        hash: version1.content_hash,
        versionLabel: version1.version_label,
        createdUtc: version1.created_utc,
        configType: version1.config_type,
        profileKey: version1.profile_key,
        content: parsed1,
      },
      version2: {
        hash: version2.content_hash,
        versionLabel: version2.version_label,
        createdUtc: version2.created_utc,
        configType: version2.config_type,
        profileKey: version2.profile_key,
        content: parsed2,
      },
      diff,
    });
  } catch (error) {
    console.error("[ConfigDiff] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate diff" },
      { status: 500 }
    );
  }
}
