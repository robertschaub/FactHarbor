import { NextRequest, NextResponse } from "next/server";

import { checkAdminKey } from "@/lib/auth";
import {
  buildClaimSelectionDraftForwardHeaders,
  forwardTextResponse,
  getClaimSelectionDraftApiBase,
  validateDraftId,
} from "@/lib/claim-selection-draft-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_DRAFT_ACTIONS = new Set(["cancel", "retry", "hide", "unhide"]);

type AdminDraftActionRouteContext = {
  params: Promise<{
    draftId?: string;
    action?: string;
  }>;
};

export async function POST(request: NextRequest, context: AdminDraftActionRouteContext) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getClaimSelectionDraftApiBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const params = await context.params;
  const draftId = typeof params?.draftId === "string" ? params.draftId.trim() : "";
  if (!validateDraftId(draftId)) {
    return NextResponse.json({ ok: false, error: "Invalid draft id" }, { status: 400 });
  }

  const action = typeof params?.action === "string" ? params.action.trim().toLowerCase() : "";
  if (!ADMIN_DRAFT_ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, error: "Unsupported preparation session action" }, { status: 400 });
  }

  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts/${draftId}/${action}`,
    {
      method: "POST",
      cache: "no-store",
      headers: buildClaimSelectionDraftForwardHeaders(request),
    },
  );

  return forwardTextResponse(upstreamResponse);
}
