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

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  let parsedBody: { selectedClaimIds?: unknown; interactionUtc?: unknown } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(parsedBody.selectedClaimIds)) {
    return NextResponse.json(
      { error: "selectedClaimIds must be an array of strings" },
      { status: 400 },
    );
  }

  const selectedClaimIds = parsedBody.selectedClaimIds.map((claimId) =>
    typeof claimId === "string" ? claimId.trim() : "",
  );

  if (selectedClaimIds.some((claimId) => claimId.length === 0)) {
    return NextResponse.json(
      { error: "selectedClaimIds must contain only non-empty strings" },
      { status: 400 },
    );
  }

  if (new Set(selectedClaimIds).size !== selectedClaimIds.length) {
    return NextResponse.json(
      { error: "selectedClaimIds must not contain duplicates" },
      { status: 400 },
    );
  }

  const interactionUtc =
    typeof parsedBody.interactionUtc === "string" && parsedBody.interactionUtc.trim().length > 0
      ? parsedBody.interactionUtc
      : new Date().toISOString();

  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}/selection-state`,
    {
      method: "POST",
      headers: buildClaimSelectionDraftForwardHeaders(request, {
        includeContentType: true,
        forwardDraftToken: true,
      }),
      body: JSON.stringify({
        selectedClaimIds,
        interactionUtc,
      }),
    },
  );

  return forwardTextResponse(upstreamResponse);
}
