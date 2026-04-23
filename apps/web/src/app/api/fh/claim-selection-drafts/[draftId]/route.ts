import { NextResponse } from "next/server";
import { drainDraftQueue } from "@/lib/internal-runner-queue";

import {
  buildClaimSelectionDraftForwardHeaders,
  clearDraftAccessCookie,
  DraftRouteContext,
  getClaimSelectionDraftApiBase,
  resolveDraftId,
} from "@/lib/claim-selection-draft-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: DraftRouteContext) {
  const base = getClaimSelectionDraftApiBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const draftId = await resolveDraftId(context);
  if (!draftId) {
    return NextResponse.json({ ok: false, error: "Invalid draft id" }, { status: 400 });
  }

  // The background watchdog is not sufficient on its own in the Next dev/runtime path.
  // When a user is actively watching a session, use that read as a best-effort recovery kick.
  void drainDraftQueue();

  const upstreamResponse = await fetch(`${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}`, {
    method: "GET",
    cache: "no-store",
    headers: buildClaimSelectionDraftForwardHeaders(request, { forwardDraftToken: true, draftId }),
  });

  const text = await upstreamResponse.text();
  const response = new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });

  try {
    const payload = JSON.parse(text) as { status?: string; finalJobId?: string | null };
    const shouldClearCookie =
      typeof payload.status === "string" &&
      ["COMPLETED", "CANCELLED", "EXPIRED"].includes(payload.status);

    if (shouldClearCookie || typeof payload.finalJobId === "string") {
      clearDraftAccessCookie(response, draftId);
    }
  } catch {
    // Preserve upstream body without cookie changes when the payload is not JSON.
  }

  return response;
}
