import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const code = request.headers.get("x-invite-code");
  if (!code || !code.trim()) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const upstreamUrl = `${base.replace(/\/$/, "")}/v1/analyze/status`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: { "X-Invite-Code": code.trim() },
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
      { error: "Failed to fetch invite code status", message: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
