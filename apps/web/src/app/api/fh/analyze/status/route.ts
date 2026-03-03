import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth";

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
    // Always forward client IP so the API can rate-limit by real IP (not proxy IP).
    const upstreamHeaders: Record<string, string> = { "X-Invite-Code": code.trim() };
    upstreamHeaders["x-forwarded-for"] = getClientIp(request);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto) upstreamHeaders["x-forwarded-proto"] = forwardedProto;

    const res = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: upstreamHeaders,
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
