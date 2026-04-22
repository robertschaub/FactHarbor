import { NextResponse } from "next/server";
import {
  enqueueDraftPreparation,
  drainDraftQueue,
} from "@/lib/internal-runner-queue";
import { checkRunnerKey } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

type RunDraftRequest = { draftId: string };

export async function POST(req: Request) {
  if (!checkRunnerKey(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await req.json()) as RunDraftRequest;
  if (!body?.draftId) {
    return NextResponse.json(
      { ok: false, error: "Missing draftId" },
      { status: 400 },
    );
  }

  try {
    enqueueDraftPreparation(body.draftId);
    void drainDraftQueue();
    return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
