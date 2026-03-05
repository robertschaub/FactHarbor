import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { code?: string };
type RouteContext = { params: Promise<RouteParams> };

function getBaseUrl(): string | null {
  const base = process.env.FH_API_BASE_URL;
  return base ? base.replace(/\/$/, "") : null;
}

function getForwardedAdminKey(req: Request): string {
  return req.headers.get("x-admin-key") ?? "";
}

async function resolveCode(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params;
  const code = typeof resolvedParams?.code === "string" ? resolvedParams.code.trim() : "";
  return code.length > 0 ? code : null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const code = await resolveCode(context);
  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  try {
    const res = await fetch(`${base}/v1/admin/invites/${encodeURIComponent(code)}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Admin-Key": getForwardedAdminKey(req),
      },
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[AdminInvites] Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to process invite operation" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const code = await resolveCode(context);
  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  try {
    const body = await req.text();
    const res = await fetch(`${base}/v1/admin/invites/${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": getForwardedAdminKey(req),
      },
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[AdminInvites] Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to process invite operation" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const code = await resolveCode(context);
  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  try {
    const isHardDelete = req.headers.get("x-hard-delete") === "true";
    const apiPath = isHardDelete
      ? `${base}/v1/admin/invites/${encodeURIComponent(code)}/hard`
      : `${base}/v1/admin/invites/${encodeURIComponent(code)}`;
    const res = await fetch(apiPath, {
      method: "DELETE",
      headers: {
        "X-Admin-Key": getForwardedAdminKey(req),
      },
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[AdminInvites] Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to process invite operation" },
      { status: 500 },
    );
  }
}
