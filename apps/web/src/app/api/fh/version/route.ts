import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.FH_API_BASE_URL;
  if (!base) return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });

  const upstreamUrl = `${base.replace(/\/$/, "")}/version`;
  const res = await fetch(upstreamUrl, { method: "GET", cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}
