/**
 * Admin API - Verify Admin Key
 *
 * Simple endpoint to verify if the provided admin key is valid.
 */

import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  
  return NextResponse.json({ valid: true });
}
