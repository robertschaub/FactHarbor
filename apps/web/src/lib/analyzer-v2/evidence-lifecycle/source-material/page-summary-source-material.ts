import { createHash } from "node:crypto";
import {
  SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID,
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  type SourceCandidatePreviewProjection,
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
export const SOURCE_MATERIAL_KIND_WIKIMEDIA_PAGE_SUMMARY_EXTRACT =
  "wikimedia_page_summary_extract_text";
export const SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT =
  "openalex_work_abstract_text";
export const SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PREVIEW =
  "provider_search_result_preview_text";
export const SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PAGE_TEXT =
  "provider_search_result_page_text_bounded";
export const SOURCE_MATERIAL_SERPER_LINKED_PAGE_ENDPOINT_ID =
  "ep_serper_linked_page_fetch";

export type SourceMaterialKind =
  | typeof SOURCE_MATERIAL_KIND_WIKIMEDIA_PAGE_SUMMARY_EXTRACT
  | typeof SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT
  | typeof SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PREVIEW
  | typeof SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PAGE_TEXT;

export function sourceMaterialKindIsSupported(value: unknown): value is SourceMaterialKind {
  return value === SOURCE_MATERIAL_KIND_WIKIMEDIA_PAGE_SUMMARY_EXTRACT
    || value === SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT
    || value === SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PREVIEW
    || value === SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PAGE_TEXT;
}

export type SourceMaterialPageSummaryResponseStatusCategory =
  | "not_reached"
  | "success_2xx"
  | "redirect_3xx"
  | "rejected";

export type SourceMaterialPageSummaryContentTypeCategory =
  | "not_reached"
  | "accepted_json"
  | "accepted_text"
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
  readonly providerId: string;
  readonly sourceMaterialEndpointId: string;
  readonly languageCode: string;
  readonly sourceMaterialKind: SourceMaterialKind;
  readonly sourceMaterialText: string;
  readonly sourceMaterialTextHash: string;
  readonly sourceMaterialTextByteLength: number;
  readonly sourceMaterialTextCharLength: number;
  readonly truncationApplied: boolean;
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

function truncateUtf8(value: string, maxBytes: number): { readonly value: string; readonly truncated: boolean } {
  if (utf8ByteLength(value) <= maxBytes) {
    return { value, truncated: false };
  }
  let selected = "";
  for (const char of value) {
    const next = selected + char;
    if (utf8ByteLength(next) > maxBytes) {
      break;
    }
    selected = next;
  }
  return { value: selected.trim(), truncated: true };
}

function containsForbiddenSourceTextFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_SOURCE_TEXT_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function distinctPreviewTextParts(
  previewRecord: SourceCandidatePreviewProjection,
): readonly string[] {
  const parts = [
    previewRecord.titlePreviewText,
    previewRecord.descriptionPreviewText,
    previewRecord.excerptPreviewText,
  ];
  const seen = new Set<string>();
  const selected: string[] = [];
  for (const part of parts) {
    const text = typeof part === "string" ? normalizedSourceText(part) : "";
    if (text.length === 0 || seen.has(text)) {
      continue;
    }
    seen.add(text);
    selected.push(text);
  }
  return selected;
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
      sourceMaterialKind: SOURCE_MATERIAL_KIND_WIKIMEDIA_PAGE_SUMMARY_EXTRACT,
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

export function buildSourceMaterialSearchPreviewRecord(params: {
  readonly previewRecord: SourceCandidatePreviewProjection;
  readonly languageCode: string;
  readonly diagnostic?: {
    readonly compressedBytes: number;
    readonly decompressedBytes: number;
    readonly durationMs: number;
    readonly timeoutMs: number;
  };
}): SourceMaterialPageSummaryBodyDecision {
  const sourceMaterialText = normalizedSourceText(distinctPreviewTextParts(params.previewRecord).join("\n\n"));
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
  if (!params.previewRecord.locatorRef) {
    return failed("source_material_extract_structural_rejected");
  }

  const sourceMaterialTextHash = sha256Text(sourceMaterialText);
  return {
    status: "record_created",
    bodyStatus: "source_material_record_created",
    record: {
      recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
      sourceMaterialId: `SOURCE_MATERIAL_SEARCH_PREVIEW_${sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      locatorRef: params.previewRecord.locatorRef,
      candidatePreviewId: params.previewRecord.candidatePreviewId,
      providerId: params.previewRecord.providerId,
      sourceMaterialEndpointId: params.previewRecord.endpointId,
      languageCode: params.languageCode,
      sourceMaterialKind: SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PREVIEW,
      sourceMaterialText,
      sourceMaterialTextHash,
      sourceMaterialTextByteLength: byteLength,
      sourceMaterialTextCharLength: Array.from(sourceMaterialText).length,
      truncationApplied: false,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_json",
      compressedBytes: params.diagnostic?.compressedBytes ?? byteLength,
      decompressedBytes: params.diagnostic?.decompressedBytes ?? byteLength,
      durationMs: params.diagnostic?.durationMs ?? 0,
      timeoutMs: params.diagnostic?.timeoutMs ?? 0,
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

export function buildSourceMaterialSerperLinkedPageTextRecord(params: {
  readonly previewRecord: SourceCandidatePreviewProjection;
  readonly languageCode: string;
  readonly sourceText: string;
  readonly diagnostic: {
    readonly compressedBytes: number;
    readonly decompressedBytes: number;
    readonly durationMs: number;
    readonly timeoutMs: number;
    readonly truncationApplied: boolean;
  };
}): SourceMaterialPageSummaryBodyDecision {
  if (
    params.previewRecord.providerId !== SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID
    || params.previewRecord.endpointId !== SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID
  ) {
    return failed("source_material_extract_structural_rejected");
  }
  const bounded = truncateUtf8(
    normalizedSourceText(params.sourceText),
    SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES,
  );
  const sourceMaterialText = bounded.value;
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
  if (!params.previewRecord.locatorRef) {
    return failed("source_material_extract_structural_rejected");
  }

  const sourceMaterialTextHash = sha256Text(sourceMaterialText);
  return {
    status: "record_created",
    bodyStatus: "source_material_record_created",
    record: {
      recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
      sourceMaterialId: `SOURCE_MATERIAL_LINKED_PAGE_${sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      locatorRef: params.previewRecord.locatorRef,
      candidatePreviewId: params.previewRecord.candidatePreviewId,
      providerId: params.previewRecord.providerId,
      sourceMaterialEndpointId: SOURCE_MATERIAL_SERPER_LINKED_PAGE_ENDPOINT_ID,
      languageCode: params.languageCode,
      sourceMaterialKind: SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PAGE_TEXT,
      sourceMaterialText,
      sourceMaterialTextHash,
      sourceMaterialTextByteLength: byteLength,
      sourceMaterialTextCharLength: Array.from(sourceMaterialText).length,
      truncationApplied: params.diagnostic.truncationApplied || bounded.truncated,
      responseStatusCategory: "success_2xx",
      contentTypeCategory: "accepted_text",
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
