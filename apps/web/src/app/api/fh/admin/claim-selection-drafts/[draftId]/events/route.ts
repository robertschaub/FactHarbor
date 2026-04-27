import { NextRequest, NextResponse } from "next/server";

import { checkAdminKey } from "@/lib/auth";
import {
  DraftRouteContext,
  forwardTextResponse,
  getClaimSelectionDraftApiBase,
  resolveDraftId,
} from "@/lib/claim-selection-draft-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: DraftRouteContext) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getClaimSelectionDraftApiBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const draftId = await resolveDraftId(context);
  if (!draftId) {
    return NextResponse.json({ ok: false, error: "Invalid draft id" }, { status: 400 });
  }

  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}/events`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Admin-Key": request.headers.get("x-admin-key") ?? "",
      },
    },
  );

  return forwardTextResponse(upstreamResponse);
}
