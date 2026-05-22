import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import {
  SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID,
  buildSourceCandidatePreviewProjection,
  type SourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialSearchPreviewRecord,
  buildSourceMaterialSerperLinkedPageTextRecord,
  buildSourceMaterialSerperLinkedXlsxTextRecord,
  type SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import type {
  QueryPlanSourceAcquisitionHandoffQueryEntry,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import {
  classifySourceAcquisitionNetworkIpAddress,
} from "./source-acquisition-network-transport";
import {
  SERPER_XLSX_ATTACHMENT_FETCH_RESPONSE_BYTE_CAP,
  SERPER_XLSX_ATTACHMENT_MAX_EXPANSION_HTML_LINKS_PER_PAGE,
  SERPER_XLSX_ATTACHMENT_MAX_LINKS_PER_PAGE,
  discoverSameHostHtmlExpansionUrls,
  discoverSameHostXlsxAttachmentUrls,
  extractBoundedTextFromXlsxAttachmentBuffer,
  responseLooksLikeXlsxAttachment,
} from "./source-acquisition-xlsx-attachment-source-material";

export const SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN = 9;
export const SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY = 3;
export const SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_QUERY = 3;
export const SERPER_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES = 24_576;
export const SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP = 32_768;
export const SERPER_SEARCH_PREVIEW_TIMEOUT_MS = 3_000;
export const SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS = 5_000;
export const SERPER_LINKED_PAGE_FETCH_RESPONSE_BYTE_CAP = 131_072;
export const SERPER_XLSX_ATTACHMENT_MAX_EXPANSION_PAGE_FETCHES_PER_RUN = 4;

const SERPER_HOSTNAME = "google.serper.dev";
const SERPER_PATH = "/search";
const SERPER_USER_AGENT = "FactHarbor-V2-Internal";

type SerperSearchPreviewResult = {
  readonly title?: unknown;
  readonly snippet?: unknown;
  readonly link?: unknown;
};

type SerperSearchPreviewResponseJson = {
  readonly organic?: unknown;
};

type XlsxExpansionBudget = {
  remainingPageFetches: number;
};

export type SerperSearchPreviewHttpRequest = {
  readonly hostname: typeof SERPER_HOSTNAME;
  readonly path: typeof SERPER_PATH;
  readonly apiKey: string;
  readonly timeoutMs: typeof SERPER_SEARCH_PREVIEW_TIMEOUT_MS;
  readonly maxResponseBytes: typeof SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP;
  readonly body: {
    readonly q: string;
    readonly num: typeof SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY;
  };
};

export type SerperSearchPreviewHttpResponse = {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly remoteAddress: string;
  readonly body: Uint8Array;
  readonly durationMs: number;
};

export type SerperSearchPreviewHttpClient = (
  request: SerperSearchPreviewHttpRequest,
) => Promise<SerperSearchPreviewHttpResponse>;

export type SerperLinkedPageFetchRequest = {
  readonly url: string;
  readonly timeoutMs: typeof SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS;
  readonly maxResponseBytes: number;
};

export type SerperLinkedPageFetchResponse = {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly remoteAddress: string;
  readonly body: Uint8Array;
  readonly durationMs: number;
  readonly truncated: boolean;
};

export type SerperLinkedPageFetchHttpClient = (
  request: SerperLinkedPageFetchRequest,
) => Promise<SerperLinkedPageFetchResponse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function apiKeyIsUsable(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value || value.length < 8) {
    return false;
  }
  const lower = value.toLowerCase();
  return ![
    "placeholder",
    "paste",
    "todo",
    "example",
    "changeme",
    "sk_",
  ].some((fragment) => lower.includes(fragment));
}

function headerValue(
  headers: Readonly<Record<string, string | readonly string[] | undefined>>,
  key: string,
): string | null {
  const value = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" ? value : null;
}

function responseHasJsonContentType(response: SerperSearchPreviewHttpResponse): boolean {
  const contentType = headerValue(response.headers, "content-type")?.toLowerCase() ?? "";
  return contentType === "application/json" || contentType.startsWith("application/json;");
}

function responseHasLinkedPageTextContentType(response: SerperLinkedPageFetchResponse): boolean {
  const contentType = headerValue(response.headers, "content-type")?.toLowerCase() ?? "";
  return contentType === "text/html"
    || contentType.startsWith("text/html;")
    || contentType === "text/plain"
    || contentType.startsWith("text/plain;")
    || contentType === "application/xhtml+xml"
    || contentType.startsWith("application/xhtml+xml;");
}

function responseContentType(response: SerperLinkedPageFetchResponse): string | null {
  return headerValue(response.headers, "content-type");
}

function responseIsSuccessfulWithoutRedirect(response: SerperLinkedPageFetchResponse): boolean {
  return response.statusCode >= 200
    && response.statusCode <= 299
    && headerValue(response.headers, "location") === null
    && response.body.byteLength > 0;
}

function resolvedPublicAddressesAreValid(resolved: readonly { readonly address: string; readonly family: number }[]):
  resolved is readonly { readonly address: string; readonly family: 4 | 6 }[] {
  return resolved.length > 0
    && resolved.every((address) =>
      (address.family === 4 || address.family === 6)
      && classifySourceAcquisitionNetworkIpAddress(address.address) === "public"
    );
}

function responseRemoteAddressIsValid(
  remoteAddress: string,
  resolved: readonly { readonly address: string; readonly family: 4 | 6 }[],
): boolean {
  return resolved.some((address) => address.address === remoteAddress)
    && classifySourceAcquisitionNetworkIpAddress(remoteAddress) === "public";
}

function safeLinkedPageUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.length > 2_048) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:"
    || url.username.length > 0
    || url.password.length > 0
    || url.hostname.length === 0
    || url.hash.length > 0
  ) {
    return null;
  }
  return url;
}

async function defaultSerperSearchPreviewHttpClient(
  request: SerperSearchPreviewHttpRequest,
): Promise<SerperSearchPreviewHttpResponse> {
  const startedAt = Date.now();
  const resolved = await lookup(request.hostname, { all: true });
  if (!resolvedPublicAddressesAreValid(resolved)) {
    throw new Error("dns_address_blocked");
  }

  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(request.body), "utf8");
    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    let settled = false;
    const req = httpsRequest({
      protocol: "https:",
      hostname: request.hostname,
      servername: request.hostname,
      port: 443,
      method: "POST",
      path: request.path,
      agent: false,
      timeout: request.timeoutMs,
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "content-length": String(body.byteLength),
        "user-agent": SERPER_USER_AGENT,
        "x-api-key": request.apiKey,
      },
    }, (response) => {
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.byteLength;
        if (receivedBytes > request.maxResponseBytes) {
          req.destroy(new Error("response_byte_cap_exceeded"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        if (settled) {
          return;
        }
        settled = true;
        const remoteAddress = response.socket.remoteAddress ?? "";
        if (!responseRemoteAddressIsValid(remoteAddress, resolved)) {
          reject(new Error("final_address_mismatch"));
          return;
        }
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          remoteAddress,
          body: Buffer.concat(chunks),
          durationMs: Math.max(0, Date.now() - startedAt),
        });
      });
    });

    req.on("timeout", () => req.destroy(new Error("timed_out")));
    req.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
    req.write(body);
    req.end();
  });
}

async function defaultSerperLinkedPageFetchHttpClient(
  request: SerperLinkedPageFetchRequest,
): Promise<SerperLinkedPageFetchResponse> {
  const url = safeLinkedPageUrl(request.url);
  if (!url) {
    throw new Error("linked_page_url_rejected");
  }
  const startedAt = Date.now();
  const resolved = await lookup(url.hostname, { all: true });
  if (!resolvedPublicAddressesAreValid(resolved)) {
    throw new Error("dns_address_blocked");
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    let truncated = false;
    let settled = false;
    const req = httpsRequest({
      protocol: "https:",
      hostname: url.hostname,
      servername: url.hostname,
      port: 443,
      method: "GET",
      path: `${url.pathname}${url.search}`,
      agent: false,
      timeout: request.timeoutMs,
      headers: {
        "accept": "text/html,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;q=0.9,*/*;q=0.1",
        "user-agent": SERPER_USER_AGENT,
      },
    }, (response) => {
      response.on("data", (chunk: Buffer | string) => {
        if (settled) {
          return;
        }
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.byteLength;
        if (receivedBytes > request.maxResponseBytes) {
          const allowedBytes = Math.max(0, buffer.byteLength - (receivedBytes - request.maxResponseBytes));
          if (allowedBytes > 0) {
            chunks.push(buffer.subarray(0, allowedBytes));
          }
          truncated = true;
          return;
        }
        if (!truncated) {
          chunks.push(buffer);
        }
      });
      response.on("end", () => {
        if (settled) {
          return;
        }
        settled = true;
        const remoteAddress = response.socket.remoteAddress ?? "";
        if (!responseRemoteAddressIsValid(remoteAddress, resolved)) {
          reject(new Error("final_address_mismatch"));
          return;
        }
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          remoteAddress,
          body: Buffer.concat(chunks),
          durationMs: Math.max(0, Date.now() - startedAt),
          truncated,
        });
      });
    });

    req.on("timeout", () => req.destroy(new Error("timed_out")));
    req.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
    req.end();
  });
}

function readOrganicResults(json: unknown): readonly SerperSearchPreviewResult[] {
  if (!isRecord(json)) {
    return [];
  }
  const response = json as SerperSearchPreviewResponseJson;
  if (!Array.isArray(response.organic)) {
    return [];
  }
  return response.organic.filter(isRecord).slice(0, SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY);
}

function parseJsonResponse(response: SerperSearchPreviewHttpResponse): SerperSearchPreviewResponseJson | null {
  if (
    response.statusCode < 200
    || response.statusCode > 299
    || headerValue(response.headers, "location") !== null
    || !responseHasJsonContentType(response)
    || response.body.byteLength === 0
    || response.body.byteLength > SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(response.body).toString("utf8")) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, " ")
    .replace(/&gt;/gi, " ")
    .replace(/&#(\d{1,6});/g, (_match, code: string) => {
      const parsed = Number(code);
      return Number.isInteger(parsed) && parsed > 0 ? String.fromCodePoint(parsed) : " ";
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (_match, code: string) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isInteger(parsed) && parsed > 0 ? String.fromCodePoint(parsed) : " ";
    });
}

function linkedPageVisibleText(response: SerperLinkedPageFetchResponse): string | null {
  if (
    response.statusCode < 200
    || response.statusCode > 299
    || headerValue(response.headers, "location") !== null
    || !responseHasLinkedPageTextContentType(response)
    || response.body.byteLength === 0
  ) {
    return null;
  }
  const bodyText = Buffer.from(response.body).toString("utf8");
  const withoutHiddenBlocks = bodyText
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  const withoutTags = withoutHiddenBlocks.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutTags)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\bwww\.\S+/gi, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function combinePreviewAndLinkedPageText(params: {
  readonly previewText: string;
  readonly linkedPageText: string;
  readonly queryText: string;
}): string {
  const queryText = params.queryText.trim().toLowerCase();
  const previewText = params.previewText.toLowerCase().includes(queryText) ? "" : params.previewText;
  return [previewText, params.linkedPageText]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function buildLinkedXlsxSourceMaterialRecords(params: {
  readonly previewRecord: SourceCandidatePreviewProjection;
  readonly languageCode: string;
  readonly response: SerperLinkedPageFetchResponse;
}): readonly SourceMaterialPageSummaryRecord[] {
  if (!responseIsSuccessfulWithoutRedirect(params.response) || params.response.truncated) {
    return [];
  }
  const extracted = extractBoundedTextFromXlsxAttachmentBuffer(Buffer.from(params.response.body));
  if (extracted.status !== "success") {
    return [];
  }
  const recordDecision = buildSourceMaterialSerperLinkedXlsxTextRecord({
    previewRecord: params.previewRecord,
    languageCode: params.languageCode,
    sourceText: extracted.text,
    diagnostic: {
      compressedBytes: params.response.body.byteLength,
      decompressedBytes: extracted.byteLength,
      durationMs: params.response.durationMs,
      timeoutMs: SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
      truncationApplied: extracted.truncated,
    },
  });
  return recordDecision.status === "record_created" ? [recordDecision.record] : [];
}

async function collectLinkedPageXlsxRecords(params: {
  readonly pageUrl: URL;
  readonly linkedPage: SerperLinkedPageFetchResponse;
  readonly linkedPageHttpClient: SerperLinkedPageFetchHttpClient;
  readonly previewRecord: SourceCandidatePreviewProjection;
  readonly languageCode: string;
  readonly expansionBudget: XlsxExpansionBudget;
}): Promise<readonly SourceMaterialPageSummaryRecord[]> {
  const contentType = responseContentType(params.linkedPage);
  if (!responseIsSuccessfulWithoutRedirect(params.linkedPage)) {
    return [];
  }
  if (responseLooksLikeXlsxAttachment({ url: params.pageUrl, contentType })) {
    return buildLinkedXlsxSourceMaterialRecords({
      previewRecord: params.previewRecord,
      languageCode: params.languageCode,
      response: params.linkedPage,
    });
  }
  if (!responseHasLinkedPageTextContentType(params.linkedPage)) {
    return [];
  }
  const htmlText = Buffer.from(params.linkedPage.body).toString("utf8");
  const records = await collectSameHostXlsxAttachmentRecordsFromHtml({
    htmlText,
    pageUrl: params.pageUrl,
    linkedPageHttpClient: params.linkedPageHttpClient,
    previewRecord: params.previewRecord,
    languageCode: params.languageCode,
  });
  if (records.length > 0 || params.expansionBudget.remainingPageFetches <= 0) {
    return records;
  }

  const expansionUrls = discoverSameHostHtmlExpansionUrls({
    htmlText,
    pageUrl: params.pageUrl,
    maxLinks: Math.min(
      SERPER_XLSX_ATTACHMENT_MAX_EXPANSION_HTML_LINKS_PER_PAGE,
      params.expansionBudget.remainingPageFetches,
    ),
  });
  const expandedRecords: SourceMaterialPageSummaryRecord[] = [];
  for (const expansionUrl of expansionUrls) {
    if (params.expansionBudget.remainingPageFetches <= 0) {
      break;
    }
    params.expansionBudget.remainingPageFetches -= 1;
    try {
      const expandedPage = await params.linkedPageHttpClient({
        url: expansionUrl.toString(),
        timeoutMs: SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
        maxResponseBytes: SERPER_LINKED_PAGE_FETCH_RESPONSE_BYTE_CAP,
      });
      if (
        !responseIsSuccessfulWithoutRedirect(expandedPage)
        || expandedPage.truncated
        || !responseHasLinkedPageTextContentType(expandedPage)
      ) {
        continue;
      }
      expandedRecords.push(...await collectSameHostXlsxAttachmentRecordsFromHtml({
        htmlText: Buffer.from(expandedPage.body).toString("utf8"),
        pageUrl: expansionUrl,
        linkedPageHttpClient: params.linkedPageHttpClient,
        previewRecord: params.previewRecord,
        languageCode: params.languageCode,
      }));
    } catch {
      // One-hop expansion is optional; keep the linked-page/preview record.
    }
  }
  return expandedRecords;
}

async function collectSameHostXlsxAttachmentRecordsFromHtml(params: {
  readonly htmlText: string;
  readonly pageUrl: URL;
  readonly linkedPageHttpClient: SerperLinkedPageFetchHttpClient;
  readonly previewRecord: SourceCandidatePreviewProjection;
  readonly languageCode: string;
}): Promise<readonly SourceMaterialPageSummaryRecord[]> {
  const attachmentUrls = discoverSameHostXlsxAttachmentUrls({
    htmlText: params.htmlText,
    pageUrl: params.pageUrl,
    maxLinks: SERPER_XLSX_ATTACHMENT_MAX_LINKS_PER_PAGE,
  });
  const records: SourceMaterialPageSummaryRecord[] = [];
  for (const attachmentUrl of attachmentUrls) {
    try {
      const attachment = await params.linkedPageHttpClient({
        url: attachmentUrl.toString(),
        timeoutMs: SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
        maxResponseBytes: SERPER_XLSX_ATTACHMENT_FETCH_RESPONSE_BYTE_CAP,
      });
      if (!responseLooksLikeXlsxAttachment({
        url: attachmentUrl,
        contentType: responseContentType(attachment),
      })) {
        continue;
      }
      records.push(...buildLinkedXlsxSourceMaterialRecords({
        previewRecord: params.previewRecord,
        languageCode: params.languageCode,
        response: attachment,
      }));
    } catch {
      // Attachment materialization is optional; keep the linked-page/preview record.
    }
  }
  return records;
}

function languageCode(value: unknown): string {
  return typeof value === "string" && /^[a-z]{2,8}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : "und";
}

function emitPreview(
  sink: ((projection: SourceCandidatePreviewProjection) => void) | undefined,
  projection: SourceCandidatePreviewProjection,
): void {
  if (!sink) {
    return;
  }
  try {
    sink(projection);
  } catch {
    // Preview artifacts are observational only.
  }
}

export async function collectSerperSearchPreviewSourceMaterialRecords(params: {
  readonly queryEntries: readonly QueryPlanSourceAcquisitionHandoffQueryEntry[];
  readonly apiKey?: string | null;
  readonly httpClient?: SerperSearchPreviewHttpClient;
  readonly linkedPageHttpClient?: SerperLinkedPageFetchHttpClient | null;
  readonly startingAttemptOrdinal?: number;
  readonly languageCode?: string;
  readonly candidatePreviewProjectionSink?: (projection: SourceCandidatePreviewProjection) => void;
}): Promise<readonly SourceMaterialPageSummaryRecord[]> {
  const apiKey = params.apiKey ?? process.env.SERPER_API_KEY ?? null;
  if (!apiKeyIsUsable(apiKey)) {
    return [];
  }

  const httpClient = params.httpClient ?? defaultSerperSearchPreviewHttpClient;
  const linkedPageHttpClient = params.linkedPageHttpClient === null
    ? null
    : params.linkedPageHttpClient ?? defaultSerperLinkedPageFetchHttpClient;
  const records: SourceMaterialPageSummaryRecord[] = [];
  const seen = new Set<string>();
  let aggregateTextBytes = 0;
  let attemptOrdinal = params.startingAttemptOrdinal ?? 0;
  const expansionBudget: XlsxExpansionBudget = {
    remainingPageFetches: SERPER_XLSX_ATTACHMENT_MAX_EXPANSION_PAGE_FETCHES_PER_RUN,
  };

  for (const queryEntry of params.queryEntries) {
    if (records.length >= SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN) {
      break;
    }
    if (typeof queryEntry.queryText !== "string" || queryEntry.queryText.trim().length === 0) {
      continue;
    }
    attemptOrdinal += 1;
    let response: SerperSearchPreviewHttpResponse;
    try {
      response = await httpClient({
        hostname: SERPER_HOSTNAME,
        path: SERPER_PATH,
        apiKey,
        timeoutMs: SERPER_SEARCH_PREVIEW_TIMEOUT_MS,
        maxResponseBytes: SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP,
        body: {
          q: queryEntry.queryText,
          num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY,
        },
      });
    } catch {
      continue;
    }

    const parsed = parseJsonResponse(response);
    if (parsed === null) {
      continue;
    }

    let recordsForQuery = 0;
    for (const [index, candidate] of readOrganicResults(parsed).entries()) {
      if (records.length >= SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN) {
        break;
      }
      if (recordsForQuery >= SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_QUERY) {
        break;
      }
      const candidateOrdinal = index + 1;
      const projection = buildSourceCandidatePreviewProjection({
        providerId: SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID,
        endpointId: SOURCE_CANDIDATE_PREVIEW_SERPER_ENDPOINT_ID,
        providerAttemptOrdinal: attemptOrdinal,
        providerRank: candidateOrdinal,
        candidateOrdinal,
        sourceCandidateRef: `OPAQUE_SOURCE_CANDIDATE_SERPER_${attemptOrdinal}_${candidateOrdinal}`,
        candidate,
      });
      emitPreview(params.candidatePreviewProjectionSink, projection);
      if (projection.materializationStatus !== "source_candidate_preview_materialized") {
        continue;
      }
      const recordDecision = buildSourceMaterialSearchPreviewRecord({
        previewRecord: projection,
        languageCode: languageCode(params.languageCode),
        diagnostic: {
          compressedBytes: response.body.byteLength,
          decompressedBytes: response.body.byteLength,
          durationMs: response.durationMs,
          timeoutMs: SERPER_SEARCH_PREVIEW_TIMEOUT_MS,
        },
      });
      if (recordDecision.status !== "record_created") {
        continue;
      }
      let record = recordDecision.record;
      let preferredRecords: readonly SourceMaterialPageSummaryRecord[] = [record];
      if (linkedPageHttpClient) {
        const url = safeLinkedPageUrl(candidate.link);
        if (url) {
          try {
            const linkedPage = await linkedPageHttpClient({
              url: url.toString(),
              timeoutMs: SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
              maxResponseBytes: SERPER_LINKED_PAGE_FETCH_RESPONSE_BYTE_CAP,
            });
            const visibleText = linkedPageVisibleText(linkedPage);
            if (visibleText !== null) {
              const linkedPageRecord = buildSourceMaterialSerperLinkedPageTextRecord({
                previewRecord: projection,
                languageCode: languageCode(params.languageCode),
                sourceText: combinePreviewAndLinkedPageText({
                  previewText: record.sourceMaterialText,
                  linkedPageText: visibleText,
                  queryText: queryEntry.queryText,
                }),
                diagnostic: {
                  compressedBytes: linkedPage.body.byteLength,
                  decompressedBytes: linkedPage.body.byteLength,
                  durationMs: linkedPage.durationMs,
                  timeoutMs: SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
                  truncationApplied: linkedPage.truncated,
                },
              });
              if (linkedPageRecord.status === "record_created") {
                record = linkedPageRecord.record;
              }
            }
            const xlsxRecords = await collectLinkedPageXlsxRecords({
              pageUrl: url,
              linkedPage,
              linkedPageHttpClient,
              previewRecord: projection,
              languageCode: languageCode(params.languageCode),
              expansionBudget,
            });
            preferredRecords = xlsxRecords.length > 0 ? xlsxRecords : [record];
          } catch {
            // Fall back to the bounded search-result preview record.
          }
        }
      }
      for (const preferredRecord of preferredRecords) {
        if (
          records.length >= SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN
          || recordsForQuery >= SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_QUERY
        ) {
          break;
        }
        if (
          seen.has(preferredRecord.sourceMaterialTextHash)
          || aggregateTextBytes + preferredRecord.sourceMaterialTextByteLength >
            SERPER_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES
        ) {
          continue;
        }
        records.push(preferredRecord);
        seen.add(preferredRecord.sourceMaterialTextHash);
        aggregateTextBytes += preferredRecord.sourceMaterialTextByteLength;
        recordsForQuery += 1;
      }
    }
  }

  return records;
}
