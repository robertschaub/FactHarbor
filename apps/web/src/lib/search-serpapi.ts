import { WebSearchOptions, WebSearchResult } from "./web-search";

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
  if (!apiKey) {
    console.warn("[Search] SerpAPI: No API key configured");
    return [];
  }
  if (apiKey.includes("PASTE")) {
    console.warn("[Search] SerpAPI: API key contains placeholder text - please configure real value");
    return [];
  }

  const params = new URLSearchParams({
    engine: "google",
    q: options.query,
    num: String(Math.min(options.maxResults, 10)),
    api_key: apiKey
  });

  const url = `${SERPAPI_BASE}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });

    if (!res.ok) {
      console.error(`[Search] SerpAPI error: ${res.status} ${res.statusText}`);
      try {
        const errorData = await res.text();
        console.error(`[Search] SerpAPI response:`, errorData.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      return [];
    }

    const data = (await res.json()) as SerpApiResponse;
    const results = data.organic_results ?? [];
    const out: WebSearchResult[] = [];

    for (const r of results) {
      if (!r.link || !r.title) continue;
      out.push({
        url: r.link,
        title: r.title,
        snippet: r.snippet ?? null
      });
    }

    return out;
  } catch (error) {
    console.error(`[Search] SerpAPI fetch failed:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}
