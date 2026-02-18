/**
 * Brave Search API Provider
 *
 * https://brave.com/search/api/
 */

import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
};

type BraveSearchResponse = {
  web?: {
    results?: BraveWebResult[];
  };
};

const BRAVE_API_BASE = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_TIMEOUT_MS = 12_000;

export async function searchBrave(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  console.log(`[Search] Brave: Starting search for query: "${options.query.substring(0, 50)}..."`);

  if (!apiKey) {
    console.error("[Search] Brave: ❌ API key not configured");
    console.error("[Search] Brave: BRAVE_API_KEY=NOT SET");
    return [];
  }
  if (apiKey.includes("PASTE")) {
    console.error("[Search] Brave: ❌ API key contains placeholder text - please configure real value");
    return [];
  }

  console.log(`[Search] Brave: API key configured (length: ${apiKey.length})`);

  const params = new URLSearchParams({
    q: options.query,
    count: String(Math.min(options.maxResults, 20)), // Brave supports up to 20 results per request
  });

  // Add freshness filter if date restriction specified
  // Brave uses: pd (past day), pw (past week), pm (past month), py (past year)
  if (options.dateRestrict) {
    const dateRestrictMap: Record<string, string> = {
      y: "py", // past year
      m: "pm", // past month
      w: "pw", // past week
    };
    const mapped = dateRestrictMap[options.dateRestrict];
    if (mapped) {
      params.set("freshness", mapped);
      console.log(`[Search] Brave: Applying date restriction: ${options.dateRestrict} (freshness=${mapped})`);
    }
  }

  const urlForLog = `${BRAVE_API_BASE}?q=${encodeURIComponent(options.query)}&count=${Math.min(options.maxResults, 20)}`;
  console.log(`[Search] Brave: Fetching URL: ${urlForLog}`);

  try {
    const startTime = Date.now();
    const res = await fetch(`${BRAVE_API_BASE}?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Brave: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Brave: ❌ HTTP error: ${res.status} ${res.statusText}`);
      let errorBody = "";
      try {
        errorBody = await res.text();
        console.error(`[Search] Brave: Error response body:`, errorBody.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      // Throw fatal error for rate limits and quota exhaustion
      if (res.status === 429 || res.status === 403 || errorBody.includes("quota") || errorBody.includes("rate limit")) {
        throw new SearchProviderError(
          "Brave",
          res.status,
          true,
          `Brave Search API HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      return [];
    }

    const data = (await res.json()) as BraveSearchResponse;
    const results = data.web?.results ?? [];
    console.log(`[Search] Brave: ✅ Received ${results.length} results`);

    if (results.length === 0) {
      console.warn(`[Search] Brave: ⚠️ No results in response`);
    }

    const out: WebSearchResult[] = [];

    for (const r of results) {
      if (!r.url || !r.title) continue;
      out.push({
        url: r.url,
        title: r.title,
        snippet: r.description ?? null,
      });
    }

    // Ensure we never return more than requested (defensive client-side truncation)
    const truncated = out.slice(0, options.maxResults);
    console.log(`[Search] Brave: Returning ${truncated.length} valid results`);
    return truncated;
  } catch (error) {
    // Re-throw SearchProviderError so callers can detect fatal provider failures
    if (error instanceof SearchProviderError) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] Brave: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] Brave: Request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}
