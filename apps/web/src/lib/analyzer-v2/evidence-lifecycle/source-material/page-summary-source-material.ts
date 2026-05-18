import { createHash } from "node:crypto";
import {
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
} from "./source-candidate-preview";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
  type SourceMaterialPageSummaryFetchLocator,
} from "./page-summary-fetch-locator";

export const SOURCE_MATERIAL_PAGE_SUMMARY_VERSION =
  "v2.evidence-lifecycle.source-material.page-summary.x7w3b";
export const SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION =
  "v2.evidence-lifecycle.source-material.page-summary-record.x7w3b";
export const SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES = 4_096;

export type SourceMaterialPageSummaryResponseStatusCategory =
  | "not_reached"
  | "success_2xx"
  | "redirect_3xx"
  | "rejected";

export type SourceMaterialPageSummaryContentTypeCategory =
  | "not_reached"
  | "accepted_json"
  | "rejected";

export type SourceMaterialPageSummaryBodyStatus =
  | "source_material_record_created"
  | "source_material_extract_missing"
  | "source_material_extract_blank"
  | "source_material_extract_oversize"
  | "source_material_extract_structural_rejected"
  | "source_material_json_not_record";

export type SourceMaterialPageSummaryRecord = {
  readonly recordVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION;
  readonly sourceMaterialId: string;
  readonly locatorRef: string;
  readonly candidatePreviewId: string;
  readonly providerId: typeof SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID;
  readonly sourceMaterialEndpointId: typeof SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID;
  readonly languageCode: string;
  readonly sourceMaterialKind: "wikimedia_page_summary_extract_text";
  readonly sourceMaterialText: string;
  readonly sourceMaterialTextHash: string;
  readonly sourceMaterialTextByteLength: number;
  readonly sourceMaterialTextCharLength: number;
  readonly truncationApplied: false;
  readonly responseStatusCategory: SourceMaterialPageSummaryResponseStatusCategory;
  readonly contentTypeCategory: SourceMaterialPageSummaryContentTypeCategory;
  readonly compressedBytes: number;
  readonly decompressedBytes: number;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly publicPointerExposure: "forbidden";
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly evidenceCorpusCreated: false;
  readonly evidenceItemGenerated: false;
  readonly warningGenerated: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type SourceMaterialPageSummaryBodyDecision =
  | {
      readonly status: "record_created";
      readonly bodyStatus: "source_material_record_created";
      readonly record: SourceMaterialPageSummaryRecord;
    }
  | {
      readonly status: "failed_structural";
      readonly bodyStatus: Exclude<SourceMaterialPageSummaryBodyStatus, "source_material_record_created">;
      readonly record: null;
    };

const FORBIDDEN_SOURCE_TEXT_FRAGMENTS = [
  "://",
  "www.",
  "api_key",
  "apikey",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function normalizedSourceText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function containsForbiddenSourceTextFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_SOURCE_TEXT_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function failed(bodyStatus: Exclude<SourceMaterialPageSummaryBodyStatus, "source_material_record_created">):
  SourceMaterialPageSummaryBodyDecision {
  return {
    status: "failed_structural",
    bodyStatus,
    record: null,
  };
}

export function buildSourceMaterialPageSummaryRecord(params: {
  readonly locator: SourceMaterialPageSummaryFetchLocator;
  readonly responseJson: unknown;
  readonly diagnostic: {
    readonly responseStatusCategory: SourceMaterialPageSummaryResponseStatusCategory;
    readonly contentTypeCategory: SourceMaterialPageSummaryContentTypeCategory;
    readonly compressedBytes: number;
    readonly decompressedBytes: number;
    readonly durationMs: number;
    readonly timeoutMs: number;
  };
}): SourceMaterialPageSummaryBodyDecision {
  if (!isRecord(params.responseJson)) {
    return failed("source_material_json_not_record");
  }
  if (typeof params.responseJson.extract !== "string") {
    return failed("source_material_extract_missing");
  }

  const sourceMaterialText = normalizedSourceText(params.responseJson.extract);
  if (sourceMaterialText.length === 0) {
    return failed("source_material_extract_blank");
  }
  const byteLength = utf8ByteLength(sourceMaterialText);
  if (byteLength > SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES) {
    return failed("source_material_extract_oversize");
  }
  if (containsForbiddenSourceTextFragment(sourceMaterialText)) {
    return failed("source_material_extract_structural_rejected");
  }
  if (!params.locator.locatorRef) {
    return failed("source_material_extract_structural_rejected");
  }

  const sourceMaterialTextHash = sha256Text(sourceMaterialText);
  return {
    status: "record_created",
    bodyStatus: "source_material_record_created",
    record: {
      recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
      sourceMaterialId: `SOURCE_MATERIAL_PAGE_SUMMARY_${sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      locatorRef: params.locator.locatorRef,
      candidatePreviewId: params.locator.candidatePreviewId,
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      sourceMaterialEndpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
      languageCode: params.locator.languageCode,
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      sourceMaterialText,
      sourceMaterialTextHash,
      sourceMaterialTextByteLength: byteLength,
      sourceMaterialTextCharLength: Array.from(sourceMaterialText).length,
      truncationApplied: false,
      responseStatusCategory: params.diagnostic.responseStatusCategory,
      contentTypeCategory: params.diagnostic.contentTypeCategory,
      compressedBytes: params.diagnostic.compressedBytes,
      decompressedBytes: params.diagnostic.decompressedBytes,
      durationMs: params.diagnostic.durationMs,
      timeoutMs: params.diagnostic.timeoutMs,
      publicPointerExposure: "forbidden",
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  };
}
