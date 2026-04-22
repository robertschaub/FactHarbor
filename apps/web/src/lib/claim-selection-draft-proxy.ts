import { NextResponse } from "next/server";

import { checkAdminKey, getClientIp } from "@/lib/auth";

export type DraftRouteParams = { draftId?: string };
export type DraftRouteContext = { params: Promise<DraftRouteParams> };

export function validateDraftId(draftId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(draftId) && draftId.length > 0 && draftId.length <= 128;
}

export async function resolveDraftId(context: DraftRouteContext): Promise<string | null> {
  const resolvedParams = await context.params;
  const draftId = typeof resolvedParams?.draftId === "string"
    ? resolvedParams.draftId.trim()
    : "";

  if (!validateDraftId(draftId)) {
    return null;
  }

  return draftId;
}

export function getClaimSelectionDraftApiBase(): string | null {
  return process.env.FH_API_BASE_URL ?? null;
}

export function buildClaimSelectionDraftForwardHeaders(
  request: Request,
  options?: {
    includeContentType?: boolean;
    forwardDraftToken?: boolean;
  },
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (options?.includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (checkAdminKey(request)) {
    const adminKey = request.headers.get("x-admin-key");
    if (adminKey) headers["X-Admin-Key"] = adminKey;
  }

  if (options?.forwardDraftToken) {
    const draftToken = request.headers.get("x-draft-token");
    if (draftToken) headers["X-Draft-Token"] = draftToken;
  }

  headers["x-forwarded-for"] = getClientIp(request);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) headers["x-forwarded-proto"] = forwardedProto;

  return headers;
}

export async function forwardTextResponse(upstreamResponse: Response): Promise<NextResponse> {
  const text = await upstreamResponse.text();
  return new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
