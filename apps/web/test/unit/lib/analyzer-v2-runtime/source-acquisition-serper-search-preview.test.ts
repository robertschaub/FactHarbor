import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY,
  SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP,
  collectSerperSearchPreviewSourceMaterialRecords,
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Analyzer V2 Serper search-preview Source Material collector", () => {
  it("collects bounded hidden Source Material records without exposing raw result URLs", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const requests: SerperSearchPreviewHttpRequest[] = [];
    const previews: unknown[] = [];
    const client: SerperSearchPreviewHttpClient = async (request) => {
      requests.push(request);
      return response({
        organic: [
          {
            title: "Brazil Supreme Court proceedings",
            snippet: "The court heard procedural objections and issued decisions.",
            link: "https://news.example.test/brazil-court",
          },
          {
            title: "Fair trial standards overview",
            snippet: "International standards focus on impartiality, defense rights, and appeal.",
            link: "https://law.example.test/fair-trial",
          },
          {
            title: "Decision chronology",
            snippet: "The trial record included motions, votes, and sentencing stages.",
            link: "https://analysis.example.test/chronology",
          },
        ],
      });
    };

    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1), queryEntry(2)],
      apiKey: "test-serper-key",
      httpClient: client,
      startingAttemptOrdinal: 10,
      languageCode: "en",
      candidatePreviewProjectionSink: (projection) => previews.push(projection),
    });
    const serialized = JSON.stringify({ records, previews });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.hostname).toBe("google.serper.dev");
    expect(requests[0]?.path).toBe("/search");
    expect(requests[0]?.body).toEqual({
      q: "bounded provider query 1",
      num: SERPER_SEARCH_PREVIEW_MAX_CANDIDATES_PER_QUERY,
    });
    expect(records).toHaveLength(3);
    expect(records.map((record) => record.providerId)).toEqual([
      "serper_web_search",
      "serper_web_search",
      "serper_web_search",
    ]);
    expect(records.map((record) => record.sourceMaterialKind)).toEqual([
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
      "provider_search_result_preview_text",
    ]);
    expect(previews).toHaveLength(3);
    expect(serialized).toContain("Brazil Supreme Court proceedings");
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
    })).resolves.toEqual([]);
    expect(client).not.toHaveBeenCalled();

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async () => response(
        { organic: [{ title: "raw", snippet: "raw", link: "https://example.test" }] },
        { statusCode: 302, headers: { "content-type": "application/json", location: "https://redirect.test" } },
      ),
    })).resolves.toEqual([]);

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async () => response("x".repeat(SERPER_SEARCH_PREVIEW_RESPONSE_BYTE_CAP + 1)),
    })).resolves.toEqual([]);

    await expect(collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1)],
      apiKey: "test-serper-key",
      httpClient: async () => response("{not json"),
    })).resolves.toEqual([]);
  });

  it("drops unsafe or duplicate candidates while preserving the bounded query loop", async () => {
    const requests: SerperSearchPreviewHttpRequest[] = [];
    const records = await collectSerperSearchPreviewSourceMaterialRecords({
      queryEntries: [queryEntry(1), queryEntry(2)],
      apiKey: "test-serper-key",
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
});
