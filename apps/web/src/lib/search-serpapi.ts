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
  if (!apiKey) return [];

  const params = new URLSearchParams({
    engine: "google",
    q: options.query,
    num: String(Math.min(options.maxResults, 10)),
    api_key: apiKey
  });

  const url = `${SERPAPI_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!res.ok) {
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
}
