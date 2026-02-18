import { NextResponse } from "next/server";
import {
  getHealthState,
  resumeSystem,
  pauseSystem,
} from "@/lib/provider-health";
import { fireWebhook } from "@/lib/provider-webhook";
import { drainRunnerQueue } from "@/lib/internal-runner-queue";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

/** GET — return current health state (for UI polling and admin dashboard) */
export async function GET() {
  return NextResponse.json(getHealthState());
}

/** POST — admin actions: resume or pause the system */
export async function POST(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "resume") {
    resumeSystem();

    // Fire webhook notification
    void fireWebhook({
      type: "system_resumed",
      reason: "Admin manually resumed the system",
      timestamp: new Date().toISOString(),
      healthState: getHealthState(),
    });

    // Re-trigger queue drain so queued jobs start processing again
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
