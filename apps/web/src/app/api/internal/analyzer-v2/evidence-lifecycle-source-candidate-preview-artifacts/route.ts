import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";
import {
  EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function readLedgerId(req: Request): string | null {
  const params = new URL(req.url).searchParams;
  const paramNames = Array.from(params.keys());
  if (paramNames.length !== 1 || paramNames[0] !== "ledgerId" || params.getAll("ledgerId").length !== 1) {
    return null;
  }

  const ledgerId = params.get("ledgerId") ?? "";
  if (
    ledgerId.length === 0
    || ledgerId.trim() !== ledgerId
    || ledgerId.length > EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_ID_LENGTH
  ) {
    return null;
  }
  if (!/^[A-Za-z0-9:._-]+$/.test(ledgerId)) {
    return null;
  }
  return ledgerId;
}

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const ledgerId = readLedgerId(req);
  if (!ledgerId) {
    return json({ ok: false, error: "Missing or invalid ledgerId" }, 400);
  }

  const artifacts = readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId);
  if (artifacts.length === 0) {
    return json({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    }, 404);
  }

  return json({
    ok: true,
    sinkKind: "v2_evidence_lifecycle_source_candidate_preview_artifact_ledger",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId,
    artifactCount: artifacts.length,
    artifacts,
  }, 200);
}
