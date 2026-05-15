import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";
import { readClaimUnderstandingRuntimeArtifacts } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

export const runtime = "nodejs";

function readLedgerId(req: Request): string | null {
  const ledgerId = new URL(req.url).searchParams.get("ledgerId")?.trim() ?? "";
  return ledgerId.length > 0 && ledgerId.length <= 256 ? ledgerId : null;
}

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ledgerId = readLedgerId(req);
  if (!ledgerId) {
    return NextResponse.json({ ok: false, error: "Missing ledgerId" }, { status: 400 });
  }

  const artifacts = readClaimUnderstandingRuntimeArtifacts(ledgerId);
  return NextResponse.json({
    ok: true,
    sinkKind: "v2_observability_ledger",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId,
    artifactCount: artifacts.length,
    artifacts,
  });
}
