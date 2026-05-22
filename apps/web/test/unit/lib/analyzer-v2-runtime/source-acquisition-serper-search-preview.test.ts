import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY,
  SERPER_LINKED_PAGE_FETCH_RESPONSE_BYTE_CAP,
  SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
  SERPER_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES,
  SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN,
  SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP,
  collectSerperSearchPreviewSourceMaterialRecords,
  type SerperLinkedPageFetchHttpClient,
  type SerperLinkedPageFetchRequest,
  type SerperSearchPreviewHttpClient,
  type SerperSearchPreviewHttpRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview";

function queryEntry(index: number) {
  return {
    queryId: `EQ_${index}`,
    retrievalPolicyKey: "baseline_research",
    queryText: `bounded provider query ${index}`,
    targetAtomicClaimIds: ["AC_001"],
  };
}

function response(body: unknown, overrides: {
  readonly statusCode?: number;
  readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly durationMs?: number;
} = {}) {
  return {
    statusCode: overrides.statusCode ?? 200,
    headers: overrides.headers ?? { "content-type": "application/json" },
    remoteAddress: "93.184.216.34",
    body: Buffer.from(typeof body === "string" ? body : JSON.stringify(body), "utf8"),
    durationMs: overrides.durationMs ?? 42,
  };
}

function linkedPageResponse(body: string, overrides: {
  readonly statusCode?: number;
  readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly durationMs?: number;
  readonly truncated?: boolean;
} = {}) {
  return {
    statusCode: overrides.statusCode ?? 200,
    headers: overrides.headers ?? { "content-type": "text/html; charset=utf-8" },
    remoteAddress: "93.184.216.34",
    body: Buffer.from(body, "utf8"),
    durationMs: overrides.durationMs ?? 84,
    truncated: overrides.truncated ?? false,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Analyzer V2 Serper search-preview Source Material collector", () => {
  it("collects bounded hidden Source Material records across the query plan without exposing raw result URLs", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const requests: SerperSearchPreviewHttpRequest[] = [];
    const previews: unknown[] = [];
    const client: SerperSearchPreviewHttpClient = async (request) => {
      requests.push(request);
      const ordinal = requests.length;
      return response({
        organic: [
          {
            title: `Search lane ${ordinal} first result`,
            snippet: `Distinct bounded preview text ${ordinal}.`,
            link: "https://news.example.test/brazil-court",
          },
          {
            title: `Search lane ${ordinal} second result`,
            snippet: "This fallback should stay unused while the first result is materializable.",
            link: "https://law.example.test/fair-trial",
          },
          {
            title: `Search lane ${ordinal} third result`,
            snippet: "This fallback should also stay unused.",
            link: "https://analysis.example.test/chronology",
          },
        ],
      });
    };

    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [
        queryEntry(1),
        queryEntry(2),
        queryEntry(3),
        queryEntry(4),
        queryEntry(5),
        queryEntry(6),
      ],
      apiKey: "test-serper-key",
      httpClient: client,
      linkedPageHttpClient: null,
      startingAttemptOrdinal: 10,
      languageCode: "en",
      candidatePreviewProjectionSink: (projection) => previews.push(projection),
    });
    const serialized = JSON.stringify({ records, previews });

    expect(requests).toHaveLength(SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN);
    expect(requests.map((request) => request.hostname)).toEqual([
      "google.serper.dev",
      "google.serper.dev",
      "google.serper.dev",
      "google.serper.dev",
      "google.serper.dev",
    ]);
    expect(requests.map((request) => request.path)).toEqual([
      "/search",
      "/search",
      "/search",
      "/search",
      "/search",
    ]);
    expect(requests.map((request) => request.body)).toEqual([
      { q: "bounded provider query 1", num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY },
      { q: "bounded provider query 2", num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY },
      { q: "bounded provider query 3", num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY },
      { q: "bounded provider query 4", num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY },
      { q: "bounded provider query 5", num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY },
    ]);
    expect(records).toHaveLength(SERPER_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN);
    expect(records.map((record) => record.providerId)).toEqual([
      "serper_web_search",
      "serper_web_search",
      "serper_web_search",
      "serper_web_search",
      "serper_web_search",
    ]);
    expect(records.map((record) => record.sourceMaterialKind)).toEqual([
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
    ]);
    expect(records.map((record) => record.sourceMaterialText)).toEqual([
      "Search lane 1 first result Distinct bounded preview text 1.",
      "Search lane 2 first result Distinct bounded preview text 2.",
      "Search lane 3 first result Distinct bounded preview text 3.",
      "Search lane 4 first result Distinct bounded preview text 4.",
      "Search lane 5 first result Distinct bounded preview text 5.",
    ]);
    expect(previews).toHaveLength(5);
    expect(serialized).toContain("Search lane 5 first result");
    expect(serialized).not.toContain("Search lane 6 first result");
    expect(serialized).not.toContain("fallback should stay unused");
    expect(serialized).not.toContain("https://news.example.test");
    expect(serialized).not.toContain("https://law.example.test");
    expect(serialized).not.toContain("bounded provider query");
    expect(serialized).not.toContain("test-serper-key");
    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("fails closed without a usable API key or when the response violates bounds", async () => {
    const client = vi.fn<SerperSearchPreviewHttpClient>();

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: null,
      httpClient: client,
      linkedPageHttpClient: null,
    })).resolves.toEqual([]);
    expect(client).not.toHaveBeenCalled();

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async () => response(
        { organic: [{ title: "raw", snippet: "raw", link: "https://example.test" }] },
        { statusCode: 302, headers: { "content-type": "application/json", location: "https://redirect.test" } },
      ),
      linkedPageHttpClient: null,
    })).resolves.toEqual([]);

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async () => response("x".repeat(SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP + 1)),
      linkedPageHttpClient: null,
    })).resolves.toEqual([]);

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async () => response("{not json"),
      linkedPageHttpClient: null,
    })).resolves.toEqual([]);
  });

  it("drops unsafe or duplicate candidates while preserving the bounded query loop", async () => {
    const requests: SerperSearchPreviewHttpRequest[] = [];
    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1), queryEntry(2)],
      apiKey: "test-serper-key",
      linkedPageHttpClient: null,
      httpClient: async (request) => {
        requests.push(request);
        if (requests.length === 1) {
          return response({
            organic: [
              {
                title: "Unsafe locator",
                snippet: "Valid looking text",
                link: "https://example.test/path?api_key=sk_test",
              },
              {
                title: "Duplicate evidence title",
                snippet: "Duplicate snippet",
                link: "https://example.test/duplicate-a",
              },
              {
                title: "Duplicate evidence title",
                snippet: "Duplicate snippet",
                link: "https://example.test/duplicate-b",
              },
            ],
          });
        }
        return response({
          organic: [
            {
              title: "Second query material",
              snippet: "Additional bounded preview text.",
              link: "https://example.test/second",
            },
          ],
        });
      },
    });

    expect(requests).toHaveLength(2);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.sourceMaterialText)).toEqual([
      "Duplicate evidence title Duplicate snippet",
      "Second query material Additional bounded preview text.",
    ]);
  });

  it("prefers bounded linked page text when a Serper result can be fetched safely", async () => {
    const searchRequests: SerperSearchPreviewHttpRequest[] = [];
    const linkedRequests: SerperLinkedPageFetchRequest[] = [];
    const linkedPageHttpClient: SerperLinkedPageFetchHttpClient = async (request) => {
      linkedRequests.push(request);
      return linkedPageResponse(`
        <html>
          <head><script>secret()</script><style>.hidden{}</style></head>
          <body>
            <main>
              Official source page text states a bounded current aggregate and qualifying date.
              The content is plain source material for extraction.
            </main>
          </body>
        </html>
      `);
    };

    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async (request) => {
        searchRequests.push(request);
        return response({
          organic: [{
            title: "Official statistics",
            snippet: "A short provider preview.",
            link: "https://official.example.test/statistics",
          }],
        });
      },
      linkedPageHttpClient,
      languageCode: "de",
    });
    const serialized = JSON.stringify(records);

    expect(searchRequests).toHaveLength(1);
    expect(linkedRequests).toEqual([{
      url: "https://official.example.test/statistics",
      timeoutMs: SERPER_LINKED_PAGE_FETCH_TIMEOUT_MS,
      maxResponseBytes: SERPER_LINKED_PAGE_FETCH_RESPONSE_BYTE_CAP,
    }]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      providerId: "serper_web_search",
      sourceMaterialEndpointId: "ep_serper_linked_page_fetch",
      sourceMaterialKind: "provider_search_result_page_text_bounded",
      languageCode: "de",
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      publicSurfaceWritten: false,
    });
    expect(records[0]?.sourceMaterialText).toContain("Official source page text");
    expect(records[0]?.sourceMaterialText).not.toContain("secret()");
    expect(serialized).not.toContain("https://official.example.test");
  });

  it("admits multiple bounded linked page records across queries within the aggregate cap", async () => {
    const linkedRequests: SerperLinkedPageFetchRequest[] = [];
    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1), queryEntry(2), queryEntry(3), queryEntry(4)],
      apiKey: "test-serper-key",
      httpClient: async (request) => response({
        organic: [{
          title: `Official statistics ${request.body.q}`,
          snippet: "A short provider preview.",
          link: `https://official.example.test/${encodeURIComponent(request.body.q)}`,
        }],
      }),
      linkedPageHttpClient: async (request) => {
        linkedRequests.push(request);
        const uniqueText = `Source text ordinal ${linkedRequests.length}. `;
        return linkedPageResponse(`${uniqueText}${"A".repeat(4_096)}`, {
          truncated: true,
        });
      },
      languageCode: "de",
    });
    const serialized = JSON.stringify(records);

    expect(linkedRequests).toHaveLength(4);
    expect(records).toHaveLength(3);
    expect(records.map((record) => record.sourceMaterialKind)).toEqual([
      "provider_search_result_page_text_bounded",
      "provider_search_result_page_text_bounded",
      "provider_search_result_page_text_bounded",
    ]);
    expect(records.map((record) => record.sourceMaterialTextByteLength))
      .toEqual([4_096, 4_096, 4_096]);
    expect(records.every((record) => record.truncationApplied)).toBe(true);
    expect(records.reduce((sum, record) => sum + record.sourceMaterialTextByteLength, 0))
      .toBe(SERPER_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES);
    expect(serialized).not.toContain("https://official.example.test");
    expect(serialized).not.toContain("bounded provider query");
  });

  it("falls back to bounded preview text when linked page fetch is unavailable or unsafe", async () => {
    const linkedPageHttpClient = vi.fn<SerperLinkedPageFetchHttpClient>(async () => {
      throw new Error("transport_failure");
    });
    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1), queryEntry(2)],
      apiKey: "test-serper-key",
      httpClient: async (request) => response({
        organic: [{
          title: `Preview ${request.body.q}`,
          snippet: "Fallback preview remains bounded.",
          link: request.body.q.endsWith("1")
            ? "http://official.example.test/blocked"
            : "https://official.example.test/unavailable",
        }],
      }),
      linkedPageHttpClient,
    });

    expect(linkedPageHttpClient).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.sourceMaterialKind)).toEqual([
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
    ]);
  });
});
