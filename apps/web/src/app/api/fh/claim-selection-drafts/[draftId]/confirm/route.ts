import { NextResponse } from "next/server";

import {
  buildClaimSelectionDraftForwardHeaders,
  clearDraftAccessCookie,
  DraftRouteContext,
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

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  let parsedBody: { selectedClaimIds?: unknown } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(parsedBody.selectedClaimIds)) {
    return NextResponse.json(
      { error: "selectedClaimIds must contain one or more non-empty strings" },
      { status: 400 },
    );
  }

  const selectedClaimIds = parsedBody.selectedClaimIds.map((claimId) =>
    typeof claimId === "string" ? claimId.trim() : "",
  );

  if (
    selectedClaimIds.length < 1 ||
    selectedClaimIds.some((claimId) => claimId.length === 0)
  ) {
    return NextResponse.json(
      { error: "selectedClaimIds must contain one or more non-empty strings" },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}/confirm`,
    {
      method: "POST",
      headers: buildClaimSelectionDraftForwardHeaders(request, {
        includeContentType: true,
        forwardDraftToken: true,
        draftId,
      }),
      body: JSON.stringify({ selectedClaimIds }),
    },
  );

  const text = await upstreamResponse.text();
  const response = new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });

  if (upstreamResponse.ok) {
    clearDraftAccessCookie(response, draftId);
  }

  return response;
}
