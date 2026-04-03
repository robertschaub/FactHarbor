/**
 * Wikipedia Search API Provider
 *
 * https://www.mediawiki.org/wiki/API:Search
 */

import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";
import { handleFetchError } from "./search-provider-utils";

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{
      title: string;
      snippet: string;
    }>;
  };
};

const DEFAULT_TIMEOUT_MS = 10_000;

export async function searchWikipedia(options: WebSearchOptions): Promise<WebSearchResult[]> {
  console.log(`[Search] Wikipedia: Starting search for query: "${options.query.substring(0, 50)}..."`);

  // Language priority: detected claim language > UCM configured language > "en"
  const language = options.detectedLanguage
    || options.config?.providers?.wikipedia?.language
    || "en";
  const apiUrl = `https://${language}.wikipedia.org/w/api.php`;

  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: options.query,
    srlimit: String(Math.min(options.maxResults, 50)), // Wikipedia supports up to 50
    format: "json",
    origin: "*",
  });

  const urlForLog = `${apiUrl}?${params.toString()}`;
  console.log(`[Search] Wikipedia: Fetching URL: ${urlForLog}`);

  try {
    const startTime = Date.now();
    const res = await fetch(`${apiUrl}?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "FactHarbor/1.0 (contact@factharbor.com)",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Wikipedia: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Wikipedia: ❌ HTTP error: ${res.status} ${res.statusText}`);
      // MSR-M1: Throw SearchProviderError for rate limits and server errors
      // so circuit breaker can track Wikipedia health in AUTO mode
      if (res.status === 429) {
        throw new SearchProviderError(
          "Wikipedia",
          429,
          true,
          `Wikipedia API HTTP 429: Rate limited`,
        );
      }
      if (res.status >= 500) {
        throw new SearchProviderError(
          "Wikipedia",
          res.status,
          true,
          `Wikipedia API HTTP ${res.status}: ${res.statusText}`,
        );
      }
      // 4xx (not 429) — return empty + log warning
      console.warn(`[Search] Wikipedia: ⚠️ Client error ${res.status}, returning empty`);
      return [];
    }

    const data = (await res.json()) as WikipediaSearchResponse;
    const results = data.query?.search ?? [];
    console.log(`[Search] Wikipedia: ✅ Received ${results.length} results`);

    if (results.length === 0) {
      console.warn(`[Search] Wikipedia: ⚠️ No results in response`);
    }

    const out: WebSearchResult[] = [];

    for (const r of results) {
      if (!r.title) continue;
      
      // Strip HTML tags from snippet (e.g., <span class="searchmatch">)
      const cleanSnippet = r.snippet ? r.snippet.replace(/<[^>]*>/g, '') : null;
      
      // Construct Wikipedia article URL
      const articleUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`;

      out.push({
        url: articleUrl,
        title: r.title,
        snippet: cleanSnippet,
      });
    }

    const truncated = out.slice(0, options.maxResults);
    console.log(`[Search] Wikipedia: Returning ${truncated.length} valid results`);
    return truncated;
  } catch (error) {
    return handleFetchError("Wikipedia", options.timeoutMs ?? DEFAULT_TIMEOUT_MS, error);
  }
}
