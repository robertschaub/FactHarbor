import { createHash } from "node:crypto";
import {
  materializeSourceCandidatePageId,
  materializeSourceCandidatePageKey,
  materializeSourceCandidatePreviewText,
  type SourceCandidatePreviewFieldState,
} from "./locator-materialization";
import {
  OPENALEX_PROVIDER_ID,
  OPENALEX_WORKS_ENDPOINT_ID,
} from "./openalex-abstract-source-material";

export const SOURCE_CANDIDATE_PREVIEW_VERSION =
  "v2.evidence-lifecycle.source-candidate-preview.x7w3a";
export const SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID = "wikimedia_core";
export const SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID = "ep_wikimedia_core_page_search";
export const SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID = "serper_web_search";
export const SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID = "ep_serper_google_search";
export const SOURCE_CANDIDATE_PREVIEW_MAX_RECORDS_PER_RUN = 9;
export const SOURCE_CANDIDATE_PREVIEW_MAX_AGGREGATE_TEXT_BYTES = 8_192;

export type SourceCandidatePreviewProviderId =
  | typeof SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID
  | typeof OPENALEX_PROVIDER_ID
  | typeof SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID;

export type SourceCandidatePreviewEndpointId =
  | typeof SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID
  | typeof OPENALEX_WORKS_ENDPOINT_ID
  | typeof SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID;

export type SourceCandidatePreviewMaterializationStatus =
  | "source_candidate_preview_materialized"
  | "source_candidate_preview_partial"
  | "blocked_invalid_locator"
  | "blocked_provider_mismatch"
  | "blocked_public_or_artifact_input"
  | "blocked_pre_source_candidate_preview"
  | "source_candidate_preview_damaged_structural";

export type SourceCandidatePreviewStopReason =
  | "not_stopped"
  | "provider_mismatch"
  | "candidate_not_plain_record"
  | "locator_invalid"
  | "preview_partial"
  | "preview_not_built_pre_source_candidate_preview"
  | "source_candidate_preview_structural_failure"
  | "aggregate_preview_text_cap_applied";

export type SourceCandidatePreviewProjection = {
  readonly previewVersion: typeof SOURCE_CANDIDATE_PREVIEW_VERSION;
  readonly candidatePreviewId: string;
  readonly sourceCandidateRef: string;
  readonly locatorRef: string | null;
  readonly providerId: SourceCandidatePreviewProviderId;
  readonly endpointId: SourceCandidatePreviewEndpointId;
  readonly providerAttemptOrdinal: number;
  readonly providerRank: number;
  readonly candidateOrdinal: number;
  readonly pageKeyHash: string | null;
  readonly pageIdHash: string | null;
  readonly titlePreviewText: string | null;
  readonly excerptPreviewText: string | null;
  readonly descriptionPreviewText: string | null;
  readonly fieldStates: {
    readonly pageKey: SourceCandidatePreviewFieldState;
    readonly pageId: SourceCandidatePreviewFieldState;
    readonly titlePreviewText: SourceCandidatePreviewFieldState;
    readonly excerptPreviewText: SourceCandidatePreviewFieldState;
    readonly descriptionPreviewText: SourceCandidatePreviewFieldState;
  };
  readonly fieldHashes: {
    readonly titlePreviewText: string | null;
    readonly excerptPreviewText: string | null;
    readonly descriptionPreviewText: string | null;
  };
  readonly fieldByteLengths: {
    readonly titlePreviewText: number;
    readonly excerptPreviewText: number;
    readonly descriptionPreviewText: number;
  };
  readonly fieldCharLengths: {
    readonly titlePreviewText: number;
    readonly excerptPreviewText: number;
    readonly descriptionPreviewText: number;
  };
  readonly truncation: {
    readonly titlePreviewText: boolean;
    readonly excerptPreviewText: boolean;
    readonly descriptionPreviewText: boolean;
  };
  readonly markupStripped: {
    readonly titlePreviewText: boolean;
    readonly excerptPreviewText: boolean;
    readonly descriptionPreviewText: boolean;
  };
  readonly materializationStatus: SourceCandidatePreviewMaterializationStatus;
  readonly stopReason: SourceCandidatePreviewStopReason;
};

export type BuildSourceCandidatePreviewProjectionInput = {
  readonly providerId: string;
  readonly endpointId: string;
  readonly providerAttemptOrdinal: number;
  readonly providerRank: number;
  readonly candidateOrdinal: number;
  readonly sourceCandidateRef: string;
  readonly candidate: unknown;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function boundedOrdinal(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function sourceCandidateRef(input: BuildSourceCandidatePreviewProjectionInput): string {
  return /^OPAQUE_SOURCE_CANDIDATE_[A-Z0-9_]+$/.test(input.sourceCandidateRef)
    ? input.sourceCandidateRef
    : `OPAQUE_SOURCE_CANDIDATE_${boundedOrdinal(input.providerAttemptOrdinal)}_${boundedOrdinal(input.candidateOrdinal)}`;
}

function supportedProviderId(value: string): SourceCandidatePreviewProviderId {
  if (value === OPENALEX_PROVIDER_ID) {
    return OPENALEX_PROVIDER_ID;
  }
  if (value === SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID) {
    return SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID;
  }
  return SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID;
}

function supportedEndpointId(value: string): SourceCandidatePreviewEndpointId {
  if (value === OPENALEX_WORKS_ENDPOINT_ID) {
    return OPENALEX_WORKS_ENDPOINT_ID;
  }
  if (value === SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID) {
    return SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID;
  }
  return SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function materializeOpaqueLocatorHash(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.length > 512) {
    return null;
  }
  const lower = value.toLowerCase();
  if (
    lower.includes("api_key")
    || lower.includes("apikey")
    || lower.includes("secret")
    || lower.includes("token")
    || lower.includes("password")
    || lower.includes("credential")
    || lower.includes("bearer")
    || lower.includes("sk_")
  ) {
    return null;
  }
  return sha256Text(value);
}

function blockedProjection(params: {
  readonly input: BuildSourceCandidatePreviewProjectionInput;
  readonly materializationStatus: SourceCandidatePreviewMaterializationStatus;
  readonly stopReason: SourceCandidatePreviewStopReason;
  readonly pageKeyState?: SourceCandidatePreviewFieldState;
}): SourceCandidatePreviewProjection {
  const providerAttemptOrdinal = boundedOrdinal(params.input.providerAttemptOrdinal);
  const candidateOrdinal = boundedOrdinal(params.input.candidateOrdinal);
  return {
    previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
    candidatePreviewId: `SOURCE_CANDIDATE_PREVIEW_${providerAttemptOrdinal}_${candidateOrdinal}`,
    sourceCandidateRef: sourceCandidateRef(params.input),
    locatorRef: null,
    providerId: supportedProviderId(params.input.providerId),
    endpointId: supportedEndpointId(params.input.endpointId),
    providerAttemptOrdinal,
    providerRank: boundedOrdinal(params.input.providerRank),
    candidateOrdinal,
    pageKeyHash: null,
    pageIdHash: null,
    titlePreviewText: null,
    excerptPreviewText: null,
    descriptionPreviewText: null,
    fieldStates: {
      pageKey: params.pageKeyState ?? "not_materialized_by_policy",
      pageId: "not_materialized_by_policy",
      titlePreviewText: "not_materialized_by_policy",
      excerptPreviewText: "not_materialized_by_policy",
      descriptionPreviewText: "not_materialized_by_policy",
    },
    fieldHashes: {
      titlePreviewText: null,
      excerptPreviewText: null,
      descriptionPreviewText: null,
    },
    fieldByteLengths: {
      titlePreviewText: 0,
      excerptPreviewText: 0,
      descriptionPreviewText: 0,
    },
    fieldCharLengths: {
      titlePreviewText: 0,
      excerptPreviewText: 0,
      descriptionPreviewText: 0,
    },
    truncation: {
      titlePreviewText: false,
      excerptPreviewText: false,
      descriptionPreviewText: false,
    },
    markupStripped: {
      titlePreviewText: false,
      excerptPreviewText: false,
      descriptionPreviewText: false,
    },
    materializationStatus: params.materializationStatus,
    stopReason: params.stopReason,
  };
}

function previewStatus(params: {
  readonly locatorAccepted: boolean;
  readonly titleState: SourceCandidatePreviewFieldState;
  readonly excerptState: SourceCandidatePreviewFieldState;
  readonly descriptionState: SourceCandidatePreviewFieldState;
}): Pick<SourceCandidatePreviewProjection, "materializationStatus" | "stopReason"> {
  if (!params.locatorAccepted) {
    return {
      materializationStatus: "blocked_invalid_locator",
      stopReason: "locator_invalid",
    };
  }
  const states = [params.titleState, params.excerptState, params.descriptionState];
  if (
    states.some((state) => state === "rejected_structural" || state === "truncated_bounded")
    || states.every((state) => state === "missing")
  ) {
    return {
      materializationStatus: "source_candidate_preview_partial",
      stopReason: "preview_partial",
    };
  }
  return {
    materializationStatus: "source_candidate_preview_materialized",
    stopReason: "not_stopped",
  };
}

function readPageId(candidate: Record<string, unknown>): unknown {
  return candidate.id ?? candidate.pageid ?? candidate.pageId;
}

function buildOpenAlexPreviewProjection(
  input: BuildSourceCandidatePreviewProjectionInput,
  candidate: Record<string, unknown>,
): SourceCandidatePreviewProjection {
  const pageKeyHash = materializeOpaqueLocatorHash(candidate.id ?? candidate.display_name);
  if (pageKeyHash === null) {
    return blockedProjection({
      input,
      materializationStatus: "blocked_invalid_locator",
      stopReason: "locator_invalid",
      pageKeyState: "missing",
    });
  }
  const title = materializeSourceCandidatePreviewText(candidate.display_name, {
    maxChars: 160,
    maxBytes: 320,
  });
  const excerpt = materializeSourceCandidatePreviewText(null, {
    maxChars: 512,
    maxBytes: 1_024,
  });
  const description = materializeSourceCandidatePreviewText(candidate.publication_year, {
    maxChars: 80,
    maxBytes: 160,
  });
  const status = previewStatus({
    locatorAccepted: true,
    titleState: title.state,
    excerptState: excerpt.state,
    descriptionState: description.state,
  });
  const providerAttemptOrdinal = boundedOrdinal(input.providerAttemptOrdinal);
  const candidateOrdinal = boundedOrdinal(input.candidateOrdinal);

  return {
    previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
    candidatePreviewId: `SOURCE_CANDIDATE_PREVIEW_${providerAttemptOrdinal}_${candidateOrdinal}`,
    sourceCandidateRef: sourceCandidateRef(input),
    locatorRef: `OPAQUE_OPENALEX_WORK_${providerAttemptOrdinal}_${candidateOrdinal}_${pageKeyHash.slice(0, 12).toUpperCase()}`,
    providerId: OPENALEX_PROVIDER_ID,
    endpointId: OPENALEX_WORKS_ENDPOINT_ID,
    providerAttemptOrdinal,
    providerRank: boundedOrdinal(input.providerRank),
    candidateOrdinal,
    pageKeyHash,
    pageIdHash: pageKeyHash,
    titlePreviewText: title.value,
    excerptPreviewText: excerpt.value,
    descriptionPreviewText: description.value,
    fieldStates: {
      pageKey: "accepted_bounded",
      pageId: "accepted_bounded",
      titlePreviewText: title.state,
      excerptPreviewText: excerpt.state,
      descriptionPreviewText: description.state,
    },
    fieldHashes: {
      titlePreviewText: title.hash,
      excerptPreviewText: excerpt.hash,
      descriptionPreviewText: description.hash,
    },
    fieldByteLengths: {
      titlePreviewText: title.byteLength,
      excerptPreviewText: excerpt.byteLength,
      descriptionPreviewText: description.byteLength,
    },
    fieldCharLengths: {
      titlePreviewText: title.charLength,
      excerptPreviewText: excerpt.charLength,
      descriptionPreviewText: description.charLength,
    },
    truncation: {
      titlePreviewText: title.truncated,
      excerptPreviewText: excerpt.truncated,
      descriptionPreviewText: description.truncated,
    },
    markupStripped: {
      titlePreviewText: title.markupStripped,
      excerptPreviewText: excerpt.markupStripped,
      descriptionPreviewText: description.markupStripped,
    },
    ...status,
  };
}

function buildSerperPreviewProjection(
  input: BuildSourceCandidatePreviewProjectionInput,
  candidate: Record<string, unknown>,
): SourceCandidatePreviewProjection {
  const pageKeyHash = materializeOpaqueLocatorHash(candidate.link);
  if (pageKeyHash === null) {
    return blockedProjection({
      input,
      materializationStatus: "blocked_invalid_locator",
      stopReason: "locator_invalid",
      pageKeyState: "missing",
    });
  }
  const title = materializeSourceCandidatePreviewText(candidate.title, {
    maxChars: 160,
    maxBytes: 320,
  });
  const excerpt = materializeSourceCandidatePreviewText(candidate.snippet, {
    maxChars: 512,
    maxBytes: 1_024,
  });
  const description = materializeSourceCandidatePreviewText(null, {
    maxChars: 80,
    maxBytes: 160,
  });
  const status = previewStatus({
    locatorAccepted: true,
    titleState: title.state,
    excerptState: excerpt.state,
    descriptionState: description.state,
  });
  const providerAttemptOrdinal = boundedOrdinal(input.providerAttemptOrdinal);
  const candidateOrdinal = boundedOrdinal(input.candidateOrdinal);

  return {
    previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
    candidatePreviewId: `SOURCE_CANDIDATE_PREVIEW_${providerAttemptOrdinal}_${candidateOrdinal}`,
    sourceCandidateRef: sourceCandidateRef(input),
    locatorRef: `OPAQUE_SERPER_RESULT_${providerAttemptOrdinal}_${candidateOrdinal}_${pageKeyHash.slice(0, 12).toUpperCase()}`,
    providerId: SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID,
    endpointId: SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID,
    providerAttemptOrdinal,
    providerRank: boundedOrdinal(input.providerRank),
    candidateOrdinal,
    pageKeyHash,
    pageIdHash: pageKeyHash,
    titlePreviewText: title.value,
    excerptPreviewText: excerpt.value,
    descriptionPreviewText: description.value,
    fieldStates: {
      pageKey: "accepted_bounded",
      pageId: "accepted_bounded",
      titlePreviewText: title.state,
      excerptPreviewText: excerpt.state,
      descriptionPreviewText: description.state,
    },
    fieldHashes: {
      titlePreviewText: title.hash,
      excerptPreviewText: excerpt.hash,
      descriptionPreviewText: description.hash,
    },
    fieldByteLengths: {
      titlePreviewText: title.byteLength,
      excerptPreviewText: excerpt.byteLength,
      descriptionPreviewText: description.byteLength,
    },
    fieldCharLengths: {
      titlePreviewText: title.charLength,
      excerptPreviewText: excerpt.charLength,
      descriptionPreviewText: description.charLength,
    },
    truncation: {
      titlePreviewText: title.truncated,
      excerptPreviewText: excerpt.truncated,
      descriptionPreviewText: description.truncated,
    },
    markupStripped: {
      titlePreviewText: title.markupStripped,
      excerptPreviewText: excerpt.markupStripped,
      descriptionPreviewText: description.markupStripped,
    },
    ...status,
  };
}

export function buildSourceCandidatePreviewProjection(
  input: BuildSourceCandidatePreviewProjectionInput,
): SourceCandidatePreviewProjection {
  try {
    const isWikimedia = input.providerId === SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID
      && input.endpointId === SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID;
    const isOpenAlex = input.providerId === OPENALEX_PROVIDER_ID
      && input.endpointId === OPENALEX_WORKS_ENDPOINT_ID;
    const isSerper = input.providerId === SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID
      && input.endpointId === SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID;
    if (!isWikimedia && !isOpenAlex && !isSerper) {
      return blockedProjection({
        input,
        materializationStatus: "blocked_provider_mismatch",
        stopReason: "provider_mismatch",
      });
    }

    if (!isPlainRecord(input.candidate)) {
      return blockedProjection({
        input,
        materializationStatus: "blocked_public_or_artifact_input",
        stopReason: "candidate_not_plain_record",
      });
    }

    if (isOpenAlex) {
      return buildOpenAlexPreviewProjection(input, input.candidate);
    }
    if (isSerper) {
      return buildSerperPreviewProjection(input, input.candidate);
    }

    const locator = materializeSourceCandidatePageKey(input.candidate.key);
    if (locator.status !== "accepted_bounded") {
      return blockedProjection({
        input,
        materializationStatus: "blocked_invalid_locator",
        stopReason: "locator_invalid",
        pageKeyState: locator.status,
      });
    }

    const title = materializeSourceCandidatePreviewText(input.candidate.title, {
      maxChars: 160,
      maxBytes: 320,
    });
    const excerpt = materializeSourceCandidatePreviewText(input.candidate.excerpt, {
      maxChars: 512,
      maxBytes: 1_024,
    });
    const description = materializeSourceCandidatePreviewText(input.candidate.description, {
      maxChars: 280,
      maxBytes: 560,
    });
    const status = previewStatus({
      locatorAccepted: true,
      titleState: title.state,
      excerptState: excerpt.state,
      descriptionState: description.state,
    });
    const providerAttemptOrdinal = boundedOrdinal(input.providerAttemptOrdinal);
    const candidateOrdinal = boundedOrdinal(input.candidateOrdinal);
    const pageIdHash = materializeSourceCandidatePageId(readPageId(input.candidate));

    return {
      previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
      candidatePreviewId: `SOURCE_CANDIDATE_PREVIEW_${providerAttemptOrdinal}_${candidateOrdinal}`,
      sourceCandidateRef: sourceCandidateRef(input),
      locatorRef: `OPAQUE_SOURCE_LOCATOR_${providerAttemptOrdinal}_${candidateOrdinal}_${locator.pageKeyHash.slice(0, 12).toUpperCase()}`,
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal,
      providerRank: boundedOrdinal(input.providerRank),
      candidateOrdinal,
      pageKeyHash: locator.pageKeyHash,
      pageIdHash,
      titlePreviewText: title.value,
      excerptPreviewText: excerpt.value,
      descriptionPreviewText: description.value,
      fieldStates: {
        pageKey: locator.status,
        pageId: pageIdHash === null ? "missing" : "accepted_bounded",
        titlePreviewText: title.state,
        excerptPreviewText: excerpt.state,
        descriptionPreviewText: description.state,
      },
      fieldHashes: {
        titlePreviewText: title.hash,
        excerptPreviewText: excerpt.hash,
        descriptionPreviewText: description.hash,
      },
      fieldByteLengths: {
        titlePreviewText: title.byteLength,
        excerptPreviewText: excerpt.byteLength,
        descriptionPreviewText: description.byteLength,
      },
      fieldCharLengths: {
        titlePreviewText: title.charLength,
        excerptPreviewText: excerpt.charLength,
        descriptionPreviewText: description.charLength,
      },
      truncation: {
        titlePreviewText: title.truncated,
        excerptPreviewText: excerpt.truncated,
        descriptionPreviewText: description.truncated,
      },
      markupStripped: {
        titlePreviewText: title.markupStripped,
        excerptPreviewText: excerpt.markupStripped,
        descriptionPreviewText: description.markupStripped,
      },
      ...status,
    };
  } catch {
    return blockedProjection({
      input,
      materializationStatus: "source_candidate_preview_damaged_structural",
      stopReason: "source_candidate_preview_structural_failure",
    });
  }
}
