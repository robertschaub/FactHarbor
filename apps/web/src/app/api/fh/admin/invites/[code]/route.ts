import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

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
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch invite code", message: error?.message ?? "Unknown error" },
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
    const res = await fetch(`${base}/v1/admin/invites/${encodeURIComponent(code)}`, {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to deactivate invite code", message: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
