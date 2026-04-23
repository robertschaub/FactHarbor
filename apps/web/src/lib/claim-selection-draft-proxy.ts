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

export function getDraftAccessCookieName(draftId: string): string {
  return `fh_claim_selection_draft_${draftId}`;
}

export function getDraftAccessCookiePath(draftId: string): string {
  return `/api/fh/claim-selection-drafts/${draftId}`;
}

function tryGetDraftTokenFromCookieHeader(cookieHeader: string | null, draftId: string): string | null {
  if (!cookieHeader) return null;

  const cookieName = getDraftAccessCookieName(draftId);
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${cookieName}=`)) continue;
    const encodedValue = trimmed.slice(cookieName.length + 1);
    if (!encodedValue) return null;

    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return encodedValue;
    }
  }

  return null;
}

export function buildClaimSelectionDraftForwardHeaders(
  request: Request,
  options?: {
    includeContentType?: boolean;
    forwardDraftToken?: boolean;
    draftId?: string;
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
    const draftToken = request.headers.get("x-draft-token")
      ?? (options.draftId ? tryGetDraftTokenFromCookieHeader(request.headers.get("cookie"), options.draftId) : null);
    if (draftToken) headers["X-Draft-Token"] = draftToken;
  }

  headers["x-forwarded-for"] = getClientIp(request);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) headers["x-forwarded-proto"] = forwardedProto;

  return headers;
}

export function persistDraftAccessCookie(response: NextResponse, draftId: string, token: string, expiresUtc?: string | null) {
  const expiresAt = expiresUtc ? new Date(expiresUtc) : undefined;
  response.cookies.set({
    name: getDraftAccessCookieName(draftId),
    value: encodeURIComponent(token),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: getDraftAccessCookiePath(draftId),
    expires: expiresAt,
  });
}

export function clearDraftAccessCookie(response: NextResponse, draftId: string) {
  response.cookies.set({
    name: getDraftAccessCookieName(draftId),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: getDraftAccessCookiePath(draftId),
    expires: new Date(0),
  });
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
