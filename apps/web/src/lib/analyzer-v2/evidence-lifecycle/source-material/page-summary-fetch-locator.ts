import {
  SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  type SourceCandidatePreviewProjection,
} from "./source-candidate-preview";
import { materializeSourceCandidatePageSummaryTitle } from "./locator-materialization";

export const SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION =
  "v2.evidence-lifecycle.source-material.page-summary-fetch-locator.x7w3b";
export const SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID = "ep_wikimedia_project_page_summary";
export const SOURCE_MATERIAL_PAGE_SUMMARY_PROJECT_ID = "wikipedia";
export const SOURCE_MATERIAL_PAGE_SUMMARY_DEFAULT_LANGUAGE_CODE = "en";
export const SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN = 3;

export type SourceMaterialPageSummaryFetchLocatorEligibility =
  | "eligible_for_w3b_fetch"
  | "blocked_provider_mismatch"
  | "blocked_preview_not_materialized"
  | "blocked_candidate_not_plain_record"
  | "blocked_locator_invalid"
  | "blocked_language_invalid"
  | "blocked_path_segment_invalid";

export type SourceMaterialPageSummaryFetchLocator = {
  readonly locatorVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION;
  readonly providerId: typeof SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID;
  readonly searchEndpointId: typeof SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID;
  readonly sourceMaterialEndpointId: typeof SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID;
  readonly locatorRef: string | null;
  readonly candidatePreviewId: string;
  readonly projectId: typeof SOURCE_MATERIAL_PAGE_SUMMARY_PROJECT_ID;
  readonly languageCode: string;
  readonly encodedTitlePathSegment: string | null;
  readonly pageKeyHash: string | null;
  readonly materializationStatus: SourceCandidatePreviewProjection["materializationStatus"];
  readonly eligibility: SourceMaterialPageSummaryFetchLocatorEligibility;
};

export type BuildSourceMaterialPageSummaryFetchLocatorInput = {
  readonly projection: SourceCandidatePreviewProjection;
  readonly candidate: unknown;
  readonly languageCode?: string;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

export function normalizeWikimediaPageSummaryLanguageCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length === 0
    || normalized.length > 32
    || normalized !== value
    || normalized.startsWith("-")
    || normalized.endsWith("-")
    || !/^[a-z0-9-]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function blockedLocator(
  input: BuildSourceMaterialPageSummaryFetchLocatorInput,
  eligibility: SourceMaterialPageSummaryFetchLocatorEligibility,
  languageCode = SOURCE_MATERIAL_PAGE_SUMMARY_DEFAULT_LANGUAGE_CODE,
): SourceMaterialPageSummaryFetchLocator {
  return {
    locatorVersion: SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
    providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
    searchEndpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
    sourceMaterialEndpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
    locatorRef: input.projection.locatorRef,
    candidatePreviewId: input.projection.candidatePreviewId,
    projectId: SOURCE_MATERIAL_PAGE_SUMMARY_PROJECT_ID,
    languageCode,
    encodedTitlePathSegment: null,
    pageKeyHash: null,
    materializationStatus: input.projection.materializationStatus,
    eligibility,
  };
}

export function buildSourceMaterialPageSummaryFetchLocator(
  input: BuildSourceMaterialPageSummaryFetchLocatorInput,
): SourceMaterialPageSummaryFetchLocator {
  const languageCode = normalizeWikimediaPageSummaryLanguageCode(
    input.languageCode ?? SOURCE_MATERIAL_PAGE_SUMMARY_DEFAULT_LANGUAGE_CODE,
  );
  if (!languageCode) {
    return blockedLocator(input, "blocked_language_invalid");
  }

  if (
    input.projection.providerId !== SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID
    || input.projection.endpointId !== SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID
  ) {
    return blockedLocator(input, "blocked_provider_mismatch", languageCode);
  }

  if (input.projection.materializationStatus !== "source_candidate_preview_materialized") {
    return blockedLocator(input, "blocked_preview_not_materialized", languageCode);
  }

  if (!isPlainRecord(input.candidate)) {
    return blockedLocator(input, "blocked_candidate_not_plain_record", languageCode);
  }

  const title = materializeSourceCandidatePageSummaryTitle(input.candidate.key);
  if (title.status !== "accepted_bounded") {
    return blockedLocator(input, "blocked_locator_invalid", languageCode);
  }

  if (title.encodedPathSegment === null || title.encodedPathSegment.length === 0) {
    return blockedLocator(input, "blocked_path_segment_invalid", languageCode);
  }

  return {
    locatorVersion: SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
    providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
    searchEndpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
    sourceMaterialEndpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
    locatorRef: input.projection.locatorRef,
    candidatePreviewId: input.projection.candidatePreviewId,
    projectId: SOURCE_MATERIAL_PAGE_SUMMARY_PROJECT_ID,
    languageCode,
    encodedTitlePathSegment: title.encodedPathSegment,
    pageKeyHash: title.pageKeyHash,
    materializationStatus: input.projection.materializationStatus,
    eligibility: "eligible_for_w3b_fetch",
  };
}
