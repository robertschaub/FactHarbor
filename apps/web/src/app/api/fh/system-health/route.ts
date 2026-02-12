import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getHealthState, resumeSystem, pauseSystem } from "@/lib/provider-health";
import { fireWebhook } from "@/lib/provider-webhook";
import { drainRunnerQueue } from "@/lib/internal-runner-queue";

export const runtime = "nodejs";

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

function secureCompare(expected: string, provided: string | null): boolean {
  if (provided === null) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  const maxLength = Math.max(expectedBuffer.length, providedBuffer.length);
  const expectedPadded = Buffer.alloc(maxLength);
  const providedPadded = Buffer.alloc(maxLength);
  expectedBuffer.copy(expectedPadded);
  providedBuffer.copy(providedPadded);
  const matched = timingSafeEqual(expectedPadded, providedPadded);
  return matched && expectedBuffer.length === providedBuffer.length;
}

/** GET — public: return current system health state (for UI banner polling) */
export async function GET() {
  return NextResponse.json(getHealthState());
}

/** POST — admin-only actions: resume or pause the system */
export async function POST(req: Request) {
  // Admin auth required for mutations
  const expectedKey = getEnv("FH_ADMIN_KEY");
  if (expectedKey) {
    const got = req.headers.get("x-admin-key");
    if (!secureCompare(expectedKey, got)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "FH_ADMIN_KEY not configured" }, { status: 503 });
  }

  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "resume") {
    resumeSystem();
    void fireWebhook({
      type: "system_resumed",
      reason: "Admin manually resumed the system",
      timestamp: new Date().toISOString(),
      healthState: getHealthState(),
    });
    void drainRunnerQueue();
    return NextResponse.json({ ok: true, healthState: getHealthState() });
  }

  if (body.action === "pause") {
    const reason = body.reason || "Manually paused by admin";
    pauseSystem(reason);
    void fireWebhook({
      type: "system_paused",
      reason,
      timestamp: new Date().toISOString(),
      healthState: getHealthState(),
    });
    return NextResponse.json({ ok: true, healthState: getHealthState() });
  }

  return NextResponse.json(
    { ok: false, error: `Unknown action: "${body.action}". Valid: resume, pause` },
    { status: 400 },
  );
}
