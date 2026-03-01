import { NextRequest, NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";

export const runtime = "nodejs";

function getBaseUrl(): string | null {
  const base = process.env.FH_API_BASE_URL;
  return base ? base.replace(/\/$/, "") : null;
}

function getForwardedAdminKey(req: Request): string {
  return req.headers.get("x-admin-key") ?? "";
}

export async function GET(req: NextRequest) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  try {
    const res = await fetch(`${base}/v1/admin/invites`, {
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
      { error: "Failed to fetch invite codes", message: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Admin key required" }, { status: 401 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${base}/v1/admin/invites`, {
      method: "POST",
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
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create invite code", message: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
