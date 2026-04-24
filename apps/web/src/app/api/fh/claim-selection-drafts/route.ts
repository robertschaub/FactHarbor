import { NextResponse } from "next/server";

import {
  buildClaimSelectionDraftForwardHeaders,
  persistDraftAccessCookie,
  getClaimSelectionDraftApiBase,
} from "@/lib/claim-selection-draft-proxy";
import { normalizeClaimSelectionMode } from "@/lib/claim-selection-flow";
import { loadPipelineConfig } from "@/lib/config-loader";
import { evaluateInputPolicy } from "@/lib/input-policy-gate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const base = getClaimSelectionDraftApiBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  let parsedBody: {
    inputType?: unknown;
    inputValue?: unknown;
    selectionMode?: unknown;
    inviteCode?: unknown;
  } = {};

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

  const explicitSelectionMode =
    parsedBody.selectionMode === "interactive" || parsedBody.selectionMode === "automatic"
      ? parsedBody.selectionMode
      : null;

  let effectiveSelectionMode = normalizeClaimSelectionMode(explicitSelectionMode);
  if (!explicitSelectionMode) {
    try {
      const { config } = await loadPipelineConfig("default");
      effectiveSelectionMode = normalizeClaimSelectionMode(config.claimSelectionDefaultMode);
    } catch {
      effectiveSelectionMode = normalizeClaimSelectionMode(undefined);
    }
  }

  const upstreamResponse = await fetch(`${base.replace(/\/$/, "")}/v1/claim-selection-drafts`, {
    method: "POST",
    headers: buildClaimSelectionDraftForwardHeaders(request, { includeContentType: true }),
    body: JSON.stringify({
      inputType,
      inputValue,
      selectionMode: effectiveSelectionMode,
      inviteCode: parsedBody.inviteCode,
    }),
  });

  const text = await upstreamResponse.text();
  let payload: Record<string, unknown> | null = null;

  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return new NextResponse(text, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const responsePayload = payload
    ? {
      ...payload,
      selectionMode: effectiveSelectionMode,
    }
    : payload;

  const response = NextResponse.json(responsePayload, { status: upstreamResponse.status });

  if (
    upstreamResponse.ok &&
    typeof payload.draftId === "string" &&
    typeof payload.draftAccessToken === "string"
  ) {
    persistDraftAccessCookie(
      response,
      payload.draftId,
      payload.draftAccessToken,
      typeof payload.expiresUtc === "string" ? payload.expiresUtc : null,
    );
  }

  return response;
}
