import { NextResponse } from "next/server";

import {
  buildClaimSelectionDraftForwardHeaders,
  DraftRouteContext,
  forwardTextResponse,
  getClaimSelectionDraftApiBase,
  resolveDraftId,
} from "@/lib/claim-selection-draft-proxy";
import { evaluateInputPolicy } from "@/lib/input-policy-gate";

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

  let parsedBody: { inputType?: unknown; inputValue?: unknown } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inputValue = typeof parsedBody.inputValue === "string" ? parsedBody.inputValue.trim() : "";
  const inputType = parsedBody.inputType === "url" ? "url" : "text";

  if (!inputValue) {
    return NextResponse.json({ error: "inputValue must be a non-empty string" }, { status: 400 });
  }

  const gateResult = await evaluateInputPolicy(inputValue, inputType);
  if (gateResult.decision === "reject") {
    return NextResponse.json(
      {
        error: "Submission did not pass input policy review",
        messageKey: gateResult.messageKey,
      },
      { status: 422 },
    );
  }

  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}/restart`,
    {
      method: "POST",
      headers: buildClaimSelectionDraftForwardHeaders(request, {
        includeContentType: true,
        forwardDraftToken: true,
      }),
      body: JSON.stringify({
        inputType,
        inputValue,
      }),
    },
  );

  return forwardTextResponse(upstreamResponse);
}
