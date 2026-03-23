import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";
import { requireApiKey, extractErrorBody, classifyHttpError, handleFetchError } from "./search-provider-utils";

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
  console.log(`[Search] SerpAPI: Starting search for query: "${options.query.substring(0, 50)}..."`);
  const apiKey = requireApiKey("SerpAPI", "SERPAPI_API_KEY");
  if (!apiKey) return [];

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
      const errorBody = await extractErrorBody("SerpAPI", res);
      classifyHttpError("SerpAPI", res.status, errorBody, ["out of searches", "quota"]);
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
    return handleFetchError("SerpAPI", options.timeoutMs ?? DEFAULT_TIMEOUT_MS, error);
  }
}
