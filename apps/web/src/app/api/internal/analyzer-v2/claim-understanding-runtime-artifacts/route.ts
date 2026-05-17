import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";
import { readClaimUnderstandingRuntimeArtifacts } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function readLedgerId(req: Request): string | null {
  const ledgerId = new URL(req.url).searchParams.get("ledgerId")?.trim() ?? "";
  return ledgerId.length > 0 && ledgerId.length <= 256 ? ledgerId : null;
}

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const ledgerId = readLedgerId(req);
  if (!ledgerId) {
    return json({ ok: false, error: "Missing ledgerId" }, 400);
  }

  const artifacts = readClaimUnderstandingRuntimeArtifacts(ledgerId);
  return json({
    ok: true,
    sinkKind: "v2_observability_ledger",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId,
    artifactCount: artifacts.length,
    artifacts,
  }, 200);
}
