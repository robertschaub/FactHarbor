import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code || !code.trim()) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const upstreamParams = new URLSearchParams({ code: code.trim() });
  const upstreamUrl = `${base.replace(/\/$/, "")}/v1/analyze/status?${upstreamParams}`;

  try {
    const res = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
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
