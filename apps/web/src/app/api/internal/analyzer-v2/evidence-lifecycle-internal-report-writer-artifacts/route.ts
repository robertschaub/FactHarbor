import { NextResponse } from "next/server";

import { checkAdminKey } from "@/lib/auth";
import {
  INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  readInternalReportWriterRuntimeArtifactDefaultProjections,
  readInternalReportWriterRuntimeArtifactInspectionProjections,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function readQuery(req: Request): { ledgerId: string; inspectReportText: boolean } | null {
  const params = new URL(req.url).searchParams;
  const allowed = new Set(["ledgerId", "inspectReportText"]);
  for (const paramName of params.keys()) {
    if (!allowed.has(paramName) || params.getAll(paramName).length !== 1) {
      return null;
    }
  }

  const ledgerId = params.get("ledgerId") ?? "";
  if (
    ledgerId.length === 0 ||
    ledgerId.trim() !== ledgerId ||
    ledgerId.length > INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_ID_LENGTH ||
    !/^[A-Za-z0-9:._-]+$/.test(ledgerId)
  ) {
    return null;
  }

  const inspectReportTextParam = params.get("inspectReportText");
  if (inspectReportTextParam !== null && inspectReportTextParam !== "true") {
    return null;
  }

  return { ledgerId, inspectReportText: inspectReportTextParam === "true" };
}

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const query = readQuery(req);
  if (!query) {
    return json({ ok: false, error: "Missing or invalid ledgerId" }, 400);
  }

  const artifacts = query.inspectReportText
    ? readInternalReportWriterRuntimeArtifactInspectionProjections(query.ledgerId)
    : readInternalReportWriterRuntimeArtifactDefaultProjections(query.ledgerId);
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
    sinkKind: "v2_evidence_lifecycle_internal_report_writer_artifact_ledger",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    defaultProjection: query.inspectReportText
      ? "explicit_authenticated_admin_report_markdown"
      : "hash_length_provenance_only",
    ledgerIdReturned: false,
    reportMarkdownReturned: query.inspectReportText,
    artifactCount: artifacts.length,
    artifacts,
  }, 200);
}
