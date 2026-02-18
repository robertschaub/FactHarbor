/**
 * Admin API - Effective Config
 *
 * GET /api/admin/config/:type/:profile/effective - Get resolved config with overrides
 */

import { NextResponse } from "next/server";
import { getEffectiveConfig } from "@/lib/config-loader";
import type { ConfigType } from "@/lib/config-storage";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

// Effective config endpoint only supports non-prompt configs
const VALID_EFFECTIVE_TYPES = ["search", "calculation", "pipeline", "sr"] as const;
type EffectiveConfigType = (typeof VALID_EFFECTIVE_TYPES)[number];

function isValidEffectiveType(type: string): type is EffectiveConfigType {
  return VALID_EFFECTIVE_TYPES.includes(type as EffectiveConfigType);
}



interface RouteParams {
  params: Promise<{ type: string; profile: string }>;
}

/**
 * GET - Get effective config (base + overrides applied)
 */
export async function GET(req: Request, context: RouteParams) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, profile } = await context.params;

  if (!isValidEffectiveType(type)) {
    return NextResponse.json(
      { error: `Invalid config type: ${type}. Only 'search', 'calculation', 'pipeline', 'sr' supported for effective config.` },
      { status: 400 },
    );
  }

  try {
    const result = await getEffectiveConfig(type as ConfigType, profile);

    if (!result) {
      return NextResponse.json(
        { error: `Failed to load effective config for ${type}/${profile}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      configType: type,
      profileKey: profile,
      base: result.base,
      overrides: result.overrides,
      effective: result.effective,
    });
  } catch (err: unknown) {
    console.error("[Config-API] effective error:", err);
    return NextResponse.json(
      { error: `Failed to get effective config: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
