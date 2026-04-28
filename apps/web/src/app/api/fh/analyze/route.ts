import { NextResponse } from "next/server";
import { evaluateInputPolicy } from "@/lib/input-policy-gate";
import { getClientIp } from "@/lib/auth";
import { normalizeClaimSelectionMode } from "@/lib/claim-selection-flow";
import { loadPipelineConfig } from "@/lib/config-loader";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // Parse body to extract input for policy gate evaluation
  let parsedBody: { inputValue?: unknown; inputType?: unknown; selectionMode?: unknown } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const explicitSelectionMode =
    parsedBody.selectionMode === "interactive" || parsedBody.selectionMode === "automatic"
      ? parsedBody.selectionMode
      : null;

  let effectiveSelectionMode = normalizeClaimSelectionMode(explicitSelectionMode);
  if (!explicitSelectionMode) {
    try {
      const pipelineConfigResult = await loadPipelineConfig("default");
      if (
        pipelineConfigResult.contentHash === "__ERROR_FALLBACK__" ||
        (pipelineConfigResult.fromDefault === true && pipelineConfigResult.contentHash !== "__DEFAULT__")
      ) {
        return NextResponse.json(
          { error: "Unable to determine claim-selection mode; direct analysis was not started" },
          { status: 503 },
        );
      }
      const { config } = pipelineConfigResult;
      effectiveSelectionMode = normalizeClaimSelectionMode(config.claimSelectionDefaultMode);
    } catch {
      return NextResponse.json(
        { error: "Unable to determine claim-selection mode; direct analysis was not started" },
        { status: 503 },
      );
    }
  }

  if (effectiveSelectionMode === "automatic") {
    return NextResponse.json(
      {
        error: "Automatic claim selection requires the claim-selection draft endpoint",
        claimSelectionDraftEndpoint: "/api/fh/claim-selection-drafts",
      },
      { status: 409 },
    );
  }

  // Semantic input gate: LLM-based policy classification (fail-open on errors)
  const inputValue = typeof parsedBody?.inputValue === "string" ? parsedBody.inputValue : "";
  const inputType = parsedBody?.inputType === "url" ? "url" : "text";

  if (inputValue) {
    const gateResult = await evaluateInputPolicy(inputValue, inputType);
    if (gateResult.decision === "reject") {
      return NextResponse.json(
        { error: "Submission did not pass input policy review", messageKey: gateResult.messageKey },
        { status: 422 },
      );
    }
    // "allow" and "review" both continue — review is logged by evaluateInputPolicy
  }

  const upstreamUrl = `${base.replace(/\/$/, "")}/v1/analyze`;

  const forwardedBody = JSON.stringify({
    inputType: parsedBody.inputType,
    inputValue: parsedBody.inputValue,
    pipelineVariant: (parsedBody as any).pipelineVariant,
    inviteCode: (parsedBody as any).inviteCode,
  });

  const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey) {
    upstreamHeaders["x-admin-key"] = adminKey;
  }
  // Always forward client IP so the API can rate-limit by real IP (not proxy IP).
  upstreamHeaders["x-forwarded-for"] = getClientIp(req);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto) upstreamHeaders["x-forwarded-proto"] = forwardedProto;

  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers: upstreamHeaders,
    body: forwardedBody,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
