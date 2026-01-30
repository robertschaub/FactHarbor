/**
 * Default Comparison API
 *
 * Compares active config with default config to identify customized fields.
 *
 * GET /api/admin/config/default-comparison?type=[type]&profile=[profile]
 *
 * Part of UCM Pre-Validation Sprint - Day 5 (Default Value Indicators)
 */

import { NextRequest, NextResponse } from "next/server";
import { loadPipelineConfig, loadSearchConfig, loadCalcConfig } from "@/lib/config-loader";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SEARCH_CONFIG, DEFAULT_CALC_CONFIG } from "@/lib/config-loader";
import { DEFAULT_SR_CONFIG } from "@/lib/config-schemas";
import { getActiveConfig } from "@/lib/config-storage";

/**
 * Recursively compare objects and return paths of fields that differ
 */
function findDifferences(
  obj1: any,
  obj2: any,
  path: string = ""
): string[] {
  const differences: string[] = [];

  if (typeof obj1 !== typeof obj2) {
    return [path];
  }

  if (typeof obj1 !== "object" || obj1 === null || obj2 === null) {
    if (obj1 !== obj2) {
      return [path];
    }
    return [];
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
      return [path];
    }
    return [];
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  for (const key of allKeys) {
    const fieldPath = path ? `${path}.${key}` : key;

    if (!(key in obj1) || !(key in obj2)) {
      differences.push(fieldPath);
    } else {
      differences.push(...findDifferences(obj1[key], obj2[key], fieldPath));
    }
  }

  return differences;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configType = searchParams.get("type");
    const profileKey = searchParams.get("profile") || "default";

    if (!configType) {
      return NextResponse.json(
        { error: "Missing type parameter" },
        { status: 400 }
      );
    }

    // Load active config and default config
    let activeConfig: any;
    let defaultConfig: any;

    switch (configType) {
      case "pipeline": {
        const result = await loadPipelineConfig(profileKey);
        activeConfig = result.config;
        defaultConfig = DEFAULT_PIPELINE_CONFIG;
        break;
      }
      case "search": {
        const result = await loadSearchConfig(profileKey);
        activeConfig = result.config;
        defaultConfig = DEFAULT_SEARCH_CONFIG;
        break;
      }
      case "calculation": {
        const result = await loadCalcConfig(profileKey);
        activeConfig = result.config;
        defaultConfig = DEFAULT_CALC_CONFIG;
        break;
      }
      case "sr": {
        // SR config doesn't have a dedicated loader, load from storage directly
        const activeData = await getActiveConfig("sr", profileKey);
        if (!activeData) {
          return NextResponse.json({
            success: true,
            hasDefaults: true,
            customizedFields: [],
            totalFields: 0,
            customizedCount: 0,
          });
        }
        activeConfig = JSON.parse(activeData.content);
        defaultConfig = DEFAULT_SR_CONFIG;
        break;
      }
      case "prompt": {
        // Prompts don't have defaults to compare
        return NextResponse.json({
          success: true,
          hasDefaults: false,
          customizedFields: [],
          totalFields: 0,
          customizedCount: 0,
        });
      }
      default:
        return NextResponse.json(
          { error: `Unknown config type: ${configType}` },
          { status: 400 }
        );
    }

    // Find differences
    const customizedFields = findDifferences(defaultConfig, activeConfig);

    // Count total fields (rough estimate)
    const countFields = (obj: any): number => {
      if (typeof obj !== "object" || obj === null) return 1;
      if (Array.isArray(obj)) return 1;
      return Object.keys(obj).reduce((sum, key) => sum + countFields(obj[key]), 0);
    };

    const totalFields = countFields(defaultConfig);

    return NextResponse.json({
      success: true,
      hasDefaults: true,
      customizedFields,
      totalFields,
      customizedCount: customizedFields.length,
      percentageCustomized: totalFields > 0 ? Math.round((customizedFields.length / totalFields) * 100) : 0,
    });
  } catch (error) {
    console.error("[DefaultComparison] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compare with defaults" },
      { status: 500 }
    );
  }
}
