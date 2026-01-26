/**
 * Admin API - Verify Admin Key
 *
 * Simple endpoint to verify if the provided admin key is valid.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

export async function POST(req: Request) {
  const adminKey = getEnv("FH_ADMIN_KEY");
  
  // In development without a key configured, allow access
  if (!adminKey && process.env.NODE_ENV !== "production") {
    return NextResponse.json({ valid: true, dev: true });
  }
  
  // Check the provided key
  const providedKey = req.headers.get("x-admin-key");
  
  if (!providedKey || providedKey !== adminKey) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  
  return NextResponse.json({ valid: true });
}
