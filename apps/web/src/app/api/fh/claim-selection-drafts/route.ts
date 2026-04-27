import { NextResponse } from "next/server";

import {
  buildClaimSelectionDraftForwardHeaders,
  persistDraftAccessCookie,
  getClaimSelectionDraftApiBase,
} from "@/lib/claim-selection-draft-proxy";
import { checkAdminKey } from "@/lib/auth";
import { normalizeClaimSelectionMode } from "@/lib/claim-selection-flow";
import { loadPipelineConfig } from "@/lib/config-loader";
import { evaluateInputPolicy } from "@/lib/input-policy-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_DRAFT_QUERY_KEYS = new Set([
  "scope",
  "hidden",
  "linked",
  "selectionMode",
  "page",
  "pageSize",
  "q",
  "status",
]);
const ADMIN_DRAFT_SCOPES = new Set(["active", "terminal", "all"]);
const ADMIN_DRAFT_HIDDEN_FILTERS = new Set(["include", "exclude", "only"]);
const ADMIN_DRAFT_LINKED_FILTERS = new Set(["any", "withFinalJob", "withoutFinalJob"]);
const ADMIN_DRAFT_SELECTION_MODES = new Set(["interactive", "automatic"]);
const ADMIN_DRAFT_STATUSES = new Set([
  "QUEUED",
  "PREPARING",
  "AWAITING_CLAIM_SELECTION",
  "FAILED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);
const ADMIN_DRAFT_MAX_Q_LENGTH = 120;

function readPositiveInteger(value: string | null, key: string): { value: string | null; error: string | null } {
  if (value === null || value.trim() === "") {
    return { value: null, error: null };
  }

  const trimmed = value.trim();
  if (!/^[1-9][0-9]*$/.test(trimmed)) {
    return { value: null, error: `${key} must be a positive integer` };
  }

  return { value: trimmed, error: null };
}

function buildAdminDraftListParams(request: Request): { params: URLSearchParams | null; error: string | null } {
  const input = new URL(request.url).searchParams;
  for (const key of input.keys()) {
    if (!ADMIN_DRAFT_QUERY_KEYS.has(key)) {
      return { params: null, error: `Unsupported query parameter: ${key}` };
    }
  }

  const output = new URLSearchParams();
  const scope = input.get("scope")?.trim();
  if (scope) {
    if (!ADMIN_DRAFT_SCOPES.has(scope)) return { params: null, error: `Unsupported scope filter: ${scope}` };
    output.set("scope", scope);
  }

  const hidden = input.get("hidden")?.trim();
  if (hidden) {
    if (!ADMIN_DRAFT_HIDDEN_FILTERS.has(hidden)) return { params: null, error: `Unsupported hidden filter: ${hidden}` };
    output.set("hidden", hidden);
  }

  const linked = input.get("linked")?.trim();
  if (linked) {
    if (!ADMIN_DRAFT_LINKED_FILTERS.has(linked)) return { params: null, error: `Unsupported linked filter: ${linked}` };
    output.set("linked", linked);
  }

  const selectionMode = input.get("selectionMode")?.trim();
  if (selectionMode) {
    if (!ADMIN_DRAFT_SELECTION_MODES.has(selectionMode)) {
      return { params: null, error: `Unsupported selectionMode filter: ${selectionMode}` };
    }
    output.set("selectionMode", selectionMode);
  }

  for (const key of ["page", "pageSize"]) {
    const parsed = readPositiveInteger(input.get(key), key);
    if (parsed.error) return { params: null, error: parsed.error };
    if (parsed.value) output.set(key, parsed.value);
  }

  const q = input.get("q")?.trim();
  if (q) {
    if (q.length > ADMIN_DRAFT_MAX_Q_LENGTH) {
      return { params: null, error: `q must be ${ADMIN_DRAFT_MAX_Q_LENGTH} characters or fewer` };
    }
    output.set("q", q);
  }

  const statuses = input
    .getAll("status")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  for (const status of [...new Set(statuses)]) {
    if (!ADMIN_DRAFT_STATUSES.has(status)) {
      return { params: null, error: `Unsupported status filter: ${status}` };
    }
    output.append("status", status);
  }

  return { params: output, error: null };
}

export async function GET(request: Request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getClaimSelectionDraftApiBase();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const { params, error } = buildAdminDraftListParams(request);
  if (params === null) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const query = params.toString();
  const upstreamResponse = await fetch(
    `${base.replace(/\/$/, "")}/v1/claim-selection-drafts${query ? `?${query}` : ""}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Admin-Key": request.headers.get("x-admin-key") ?? "",
      },
    },
  );

  const text = await upstreamResponse.text();
  return new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}

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
