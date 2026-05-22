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
  type SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import type {
  QueryPlanSourceAcquisitionHandoffQueryEntry,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import {
  classifySourceAcquisitionNetworkIpAddress,
} from "./source-acquisition-network-transport";

export const SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN = 5;
export const SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY = 3;
export const SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_QUERY = 1;
export const SERPER_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES = 4_096;
export const SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP = 32_768;
export const SERPER_SEARCH_PREVIEW_TIMEOUT_MS = 3_000;

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
  readonly startingAttemptOrdinal?: number;
  readonly languageCode?: string;
  readonly candidatePreviewProjectionSink?: (projection: SourceCandidatePreviewProjection) => void;
}): Promise<readonly SourceMaterialPageSummaryRecord[]> {
  const apiKey = params.apiKey ?? process.env.SERPER_API_KEY ?? null;
  if (!apiKeyIsUsable(apiKey)) {
    return [];
  }

  const httpClient = params.httpClient ?? defaultSerperSearchPreviewHttpClient;
  const records: SourceMaterialPageSummaryRecord[] = [];
  const seen = new Set<string>();
  let aggregateTextBytes = 0;
  let attemptOrdinal = params.startingAttemptOrdinal ?? 0;

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
      const record = recordDecision.record;
      if (
        seen.has(record.sourceMaterialTextHash)
        || aggregateTextBytes + record.sourceMaterialTextByteLength > SERPER_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES
      ) {
        continue;
      }
      records.push(record);
      seen.add(record.sourceMaterialTextHash);
      aggregateTextBytes += record.sourceMaterialTextByteLength;
      recordsForQuery += 1;
    }
  }

  return records;
}
