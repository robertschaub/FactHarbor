import { createHash } from "node:crypto";
import {
  SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT,
  SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES,
  SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
  type SourceMaterialPageSummaryBodyDecision,
} from "./page-summary-source-material";

export const OPENALEX_PROVIDER_ID = "openalex";
export const OPENALEX_WORKS_ENDPOINT_ID = "ep_openalex_works_search";
export const OPENALEX_WORKS_SELECT_FIELDS =
  "id,display_name,abstract_inverted_index,language,publication_year";

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

function sourceRefHash(value: unknown): string {
  return sha256Text(typeof value === "string" && value.trim().length > 0 ? value.trim() : "openalex-work");
}

function readLanguageCode(candidate: Record<string, unknown>): string {
  return typeof candidate.language === "string" && /^[a-z]{2,8}$/i.test(candidate.language.trim())
    ? candidate.language.trim().toLowerCase()
    : "und";
}

function reconstructOpenAlexAbstract(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const positions = new Map<number, string>();
  for (const [word, rawPositions] of Object.entries(value)) {
    const normalizedWord = normalizedSourceText(word);
    if (
      normalizedWord.length === 0
      || normalizedWord.length > 128
      || containsForbiddenSourceTextFragment(normalizedWord)
      || !Array.isArray(rawPositions)
      || rawPositions.length === 0
    ) {
      return null;
    }
    for (const rawPosition of rawPositions) {
      if (!Number.isInteger(rawPosition) || Number(rawPosition) < 0 || Number(rawPosition) > 4095) {
        return null;
      }
      const position = Number(rawPosition);
      if (positions.has(position)) {
        return null;
      }
      positions.set(position, normalizedWord);
    }
  }
  if (positions.size === 0) {
    return null;
  }
  const maxPosition = Math.max(...positions.keys());
  if (maxPosition + 1 !== positions.size) {
    return null;
  }
  const words: string[] = [];
  for (let index = 0; index <= maxPosition; index += 1) {
    const word = positions.get(index);
    if (!word) {
      return null;
    }
    words.push(word);
  }
  return normalizedSourceText(words.join(" "));
}

function failed(): SourceMaterialPageSummaryBodyDecision {
  return {
    status: "failed_structural",
    bodyStatus: "source_material_extract_structural_rejected",
    record: null,
  };
}

export function buildOpenAlexAbstractSourceMaterialRecord(params: {
  readonly candidate: unknown;
  readonly candidatePreviewId: string;
  readonly sourceCandidateRef: string;
  readonly providerAttemptId: string;
  readonly providerRank: number;
  readonly diagnostic: {
    readonly responseStatusCategory: "success_2xx";
    readonly contentTypeCategory: "accepted_json";
    readonly compressedBytes: number;
    readonly decompressedBytes: number;
    readonly durationMs: number;
    readonly timeoutMs: number;
  };
}): SourceMaterialPageSummaryBodyDecision {
  if (!isRecord(params.candidate)) {
    return failed();
  }

  const reconstructed = reconstructOpenAlexAbstract(params.candidate.abstract_inverted_index);
  if (reconstructed === null) {
    return failed();
  }
  const sourceMaterialText = normalizedSourceText(reconstructed);
  if (sourceMaterialText.length === 0) {
    return {
      status: "failed_structural",
      bodyStatus: "source_material_extract_blank",
      record: null,
    };
  }
  const byteLength = utf8ByteLength(sourceMaterialText);
  if (byteLength > SOURCE_MATERIAL_PAGE_SUMMARY_MAX_TEXT_BYTES) {
    return {
      status: "failed_structural",
      bodyStatus: "source_material_extract_oversize",
      record: null,
    };
  }
  if (containsForbiddenSourceTextFragment(sourceMaterialText)) {
    return failed();
  }

  const sourceMaterialTextHash = sha256Text(sourceMaterialText);
  const opaqueSourceHash = sourceRefHash(params.candidate.id ?? params.candidate.display_name);
  return {
    status: "record_created",
    bodyStatus: "source_material_record_created",
    record: {
      recordVersion: SOURCE_MATERIAL_PAGE_SUMMARY_RECORD_VERSION,
      sourceMaterialId: `SOURCE_MATERIAL_OPENALEX_${sourceMaterialTextHash.slice(0, 16).toUpperCase()}`,
      locatorRef: `OPAQUE_OPENALEX_WORK_${opaqueSourceHash.slice(0, 16).toUpperCase()}`,
      candidatePreviewId: params.candidatePreviewId,
      providerId: OPENALEX_PROVIDER_ID,
      sourceMaterialEndpointId: OPENALEX_WORKS_ENDPOINT_ID,
      languageCode: readLanguageCode(params.candidate),
      sourceMaterialKind: SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT,
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
