import { NextResponse } from "next/server";

import {
  buildClaimSelectionDraftForwardHeaders,
  DraftRouteContext,
  forwardTextResponse,
  getClaimSelectionDraftApiBase,
  resolveDraftId,
} from "@/lib/claim-selection-draft-proxy";

export const runtime = "nodejs";

export async function POST(request: Request, context: DraftRouteContext) {
  const base = getClaimSelectionDraftApiBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const draftId = await resolveDraftId(context);
  if (!draftId) {
    return NextResponse.json({ ok: false, error: "Invalid draft id" }, { status: 400 });
  }

  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}/cancel`,
    {
      method: "POST",
      headers: buildClaimSelectionDraftForwardHeaders(request, { forwardDraftToken: true }),
    },
  );

  return forwardTextResponse(upstreamResponse);
}
