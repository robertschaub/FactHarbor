import { NextResponse } from "next/server";
import { evaluateInputPolicy } from "@/lib/input-policy-gate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const base = process.env.FH_API_BASE_URL;
  if (!base) return NextResponse.json({ ok: false, error: "FH_API_BASE_URL not set" }, { status: 503 });

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // Parse body to extract input for policy gate evaluation
  let parsedBody: { inputValue?: unknown; inputType?: unknown } = {};
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Semantic input gate: LLM-based policy classification (fail-open on errors)
  const inputValue = typeof parsedBody?.inputValue === "string" ? parsedBody.inputValue : "";
  const inputType = parsedBody?.inputType === "url" ? "url" : "text";

  if (inputValue) {
    const gateResult = await evaluateInputPolicy(inputValue, inputType);
    if (gateResult.decision === "reject") {
      return NextResponse.json(
        { error: "Submission did not pass input policy review", messageKey: gateResult.messageKey },
        { status: 422 },
      );
    }
    // "allow" and "review" both continue — review is logged by evaluateInputPolicy
  }

  const upstreamUrl = `${base.replace(/\/$/, "")}/v1/analyze`;

  const forwardedBody = JSON.stringify(parsedBody);

  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: forwardedBody,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
