import { NextResponse } from "next/server";
import { checkAdminKey } from "@/lib/auth";
import {
  type EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
  EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_ID_LENGTH,
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink";

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
    || ledgerId.length > EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_ID_LENGTH
  ) {
    return null;
  }
  if (!/^[A-Za-z0-9:._-]+$/.test(ledgerId)) {
    return null;
  }
  return ledgerId;
}

type RedactedSourceMaterialRecord = Omit<
  EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact["sourceMaterialPageSummary"]["sourceMaterialRecords"][number],
  "sourceMaterialText"
> & {
  readonly sourceMaterialTextReturned: false;
};

type RedactedSourceMaterialPageSummary = Omit<
  EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact["sourceMaterialPageSummary"],
  "sourceMaterialRecords"
> & {
  readonly sourceMaterialRecords: readonly RedactedSourceMaterialRecord[];
  readonly defaultProjection: "hash_length_provenance_only";
};

type RedactedSourceMaterialPageSummaryRuntimeArtifact = Omit<
  EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
  "sourceMaterialPageSummary"
> & {
  readonly sourceMaterialPageSummary: RedactedSourceMaterialPageSummary;
};

function redactSourceMaterialRecord(
  record: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact["sourceMaterialPageSummary"]["sourceMaterialRecords"][number],
): RedactedSourceMaterialRecord {
  const { sourceMaterialText: _sourceMaterialText, ...redacted } = record;
  void _sourceMaterialText;
  return {
    ...redacted,
    sourceMaterialTextReturned: false,
  };
}

function redactArtifact(
  artifact: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
): RedactedSourceMaterialPageSummaryRuntimeArtifact {
  return {
    ...artifact,
    sourceMaterialPageSummary: {
      ...artifact.sourceMaterialPageSummary,
      defaultProjection: "hash_length_provenance_only",
      sourceMaterialRecords: artifact.sourceMaterialPageSummary.sourceMaterialRecords.map(redactSourceMaterialRecord),
    },
  };
}

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const ledgerId = readLedgerId(req);
  if (!ledgerId) {
    return json({ ok: false, error: "Missing or invalid ledgerId" }, 400);
  }

  const artifacts = readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(ledgerId);
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
    sinkKind: "v2_evidence_lifecycle_source_material_page_summary_artifact_ledger",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    defaultProjection: "hash_length_provenance_only",
    ledgerId,
    artifactCount: artifacts.length,
    artifacts: artifacts.map(redactArtifact),
  }, 200);
}
