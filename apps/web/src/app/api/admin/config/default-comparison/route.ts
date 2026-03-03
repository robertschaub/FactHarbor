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
import { DEFAULT_SR_CONFIG, PipelineConfigSchema } from "@/lib/config-schemas";
import { getActiveConfig, loadDefaultConfigFromFile } from "@/lib/config-storage";
import { checkAdminKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

function loadDefaults(configType: "pipeline" | "search" | "calculation" | "sr", fallback: any): any {
  const content = loadDefaultConfigFromFile(configType);
  if (!content) return fallback;
  try {
    const raw = JSON.parse(content);
    // For pipeline, parse through schema to get runtime-effective values (with transforms)
    if (configType === "pipeline") {
      const parsed = PipelineConfigSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    }
    return raw;
  } catch {
    return fallback;
  }
}

/**
 * Parse config through PipelineConfigSchema to get runtime-effective values.
 * Uses safeParse to gracefully handle malformed legacy blobs.
 */
function toEffectivePipelineConfig(input: unknown, fallback: any): any {
  const parsed = PipelineConfigSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  // Fallback keeps endpoint operational for malformed legacy data
  return mergeDefaults(fallback, input);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Merge defaults into active config so missing fields are treated as defaults.
 */
function mergeDefaults<T>(defaults: T, active: unknown): T {
  if (Array.isArray(defaults)) {
    return (Array.isArray(active) ? active : defaults) as T;
  }

  if (isPlainObject(defaults)) {
    const result: Record<string, unknown> = {};
    const activeObj = isPlainObject(active) ? active : {};

    for (const key of Object.keys(defaults)) {
      const defaultValue = defaults[key];
      const activeValue = activeObj[key];
      if (activeValue === undefined) {
        result[key] = defaultValue;
      } else {
        result[key] = mergeDefaults(defaultValue, activeValue);
      }
    }

    for (const key of Object.keys(activeObj)) {
      if (!(key in result)) {
        result[key] = activeObj[key];
      }
    }

    return result as T;
  }

  return (active === undefined ? defaults : active) as T;
}

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
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        defaultConfig = loadDefaults("pipeline", DEFAULT_PIPELINE_CONFIG);
        break;
      }
      case "search": {
        const result = await loadSearchConfig(profileKey);
        activeConfig = result.config;
        defaultConfig = loadDefaults("search", DEFAULT_SEARCH_CONFIG);
        break;
      }
      case "calculation": {
        const result = await loadCalcConfig(profileKey);
        activeConfig = result.config;
        defaultConfig = loadDefaults("calculation", DEFAULT_CALC_CONFIG);
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
        defaultConfig = loadDefaults("sr", DEFAULT_SR_CONFIG);
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

    // Find differences — for pipeline, use schema-aware comparison to reflect
    // actual runtime-effective values (transforms fill missing fields)
    let effectiveDefault = defaultConfig;
    let effectiveActive: any;
    if (configType === "pipeline") {
      effectiveDefault = toEffectivePipelineConfig(defaultConfig, DEFAULT_PIPELINE_CONFIG);
      effectiveActive = toEffectivePipelineConfig(activeConfig, effectiveDefault);
    } else {
      effectiveActive = mergeDefaults(defaultConfig, activeConfig);
    }
    const customizedFields = findDifferences(effectiveDefault, effectiveActive);

    // Count total fields (rough estimate)
    const countFields = (obj: any): number => {
      if (typeof obj !== "object" || obj === null) return 1;
      if (Array.isArray(obj)) return 1;
      return Object.keys(obj).reduce((sum, key) => sum + countFields(obj[key]), 0);
    };

    const totalFields = countFields(effectiveDefault);

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
