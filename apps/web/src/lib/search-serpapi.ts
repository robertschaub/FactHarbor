import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";

type SerpApiResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiResult[];
};

const SERPAPI_BASE = "https://serpapi.com/search.json";
const DEFAULT_TIMEOUT_MS = 12_000;

export async function searchSerpApi(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  console.log(`[Search] SerpAPI: Starting search for query: "${options.query.substring(0, 50)}..."`);

  if (!apiKey) {
    console.error("[Search] SerpAPI: ❌ No API key configured (SERPAPI_API_KEY not set)");
    return [];
  }
  if (apiKey.includes("PASTE")) {
    console.error("[Search] SerpAPI: ❌ API key contains placeholder text - please configure real value");
    return [];
  }

  console.log(`[Search] SerpAPI: API key configured (length: ${apiKey.length})`);

  const params = new URLSearchParams({
    engine: "google",
    q: options.query,
    num: String(Math.min(options.maxResults, 10)),
    api_key: apiKey
  });

  // Add date restriction if specified (SerpAPI uses tbs parameter)
  // tbs=qdr:y = past year, qdr:m = past month, qdr:w = past week
  if (options.dateRestrict) {
    const tbsMap: Record<string, string> = { y: "qdr:y", m: "qdr:m", w: "qdr:w" };
    params.set("tbs", tbsMap[options.dateRestrict]);
    console.log(`[Search] SerpAPI: Applying date restriction: ${options.dateRestrict} (tbs=${tbsMap[options.dateRestrict]})`);
  }

  const url = `${SERPAPI_BASE}?${params.toString().replace(apiKey, "***")}`;
  console.log(`[Search] SerpAPI: Fetching URL: ${url}`);

  try {
    const startTime = Date.now();
    const res = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] SerpAPI: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] SerpAPI: ❌ HTTP error: ${res.status} ${res.statusText}`);
      let errorBody = "";
      try {
        errorBody = await res.text();
        console.error(`[Search] SerpAPI: Error response body:`, errorBody.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      // Throw fatal error for rate limits and quota exhaustion so callers can detect it
      if (res.status === 429 || res.status === 403 || errorBody.includes("out of searches") || errorBody.includes("quota")) {
        throw new SearchProviderError(
          "SerpAPI",
          res.status,
          true,
          `SerpAPI HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      return [];
    }

    const data = (await res.json()) as SerpApiResponse;
    const results = data.organic_results ?? [];
    console.log(`[Search] SerpAPI: ✅ Received ${results.length} organic results`);

    // Check for API-level errors in the response body (can occur with 200 status)
    const apiError = (data as any).error;
    if (apiError) {
      const errorStr = typeof apiError === "string" ? apiError : JSON.stringify(apiError);
      console.error(`[Search] SerpAPI: API error:`, errorStr);
      if (errorStr.includes("out of searches") || errorStr.includes("quota") || errorStr.includes("limit")) {
        throw new SearchProviderError("SerpAPI", 200, true, `SerpAPI API error: ${errorStr.substring(0, 200)}`);
      }
    }

    if (results.length === 0) {
      console.warn(`[Search] SerpAPI: ⚠️ No organic_results in response. Full response keys: ${Object.keys(data).join(", ")}`);
      // Log search metadata if available
      if ((data as any).search_metadata) {
        console.log(`[Search] SerpAPI: Search metadata:`, JSON.stringify((data as any).search_metadata, null, 2));
      }
    }

    const out: WebSearchResult[] = [];

    for (const r of results) {
      if (!r.link || !r.title) continue;
      out.push({
        url: r.link,
        title: r.title,
        snippet: r.snippet ?? null
      });
    }

    console.log(`[Search] SerpAPI: Returning ${out.length} valid results`);
    return out;
  } catch (error) {
    // Re-throw SearchProviderError so callers can detect fatal provider failures
    if (error instanceof SearchProviderError) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] SerpAPI: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] SerpAPI: Request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}
