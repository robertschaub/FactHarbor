import { WebSearchOptions, WebSearchResult } from "./web-search";

type GoogleCseItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

type GoogleCseResponse = {
  items?: GoogleCseItem[];
};

const GOOGLE_CSE_BASE = "https://www.googleapis.com/customsearch/v1";
const DEFAULT_TIMEOUT_MS = 12_000;

export async function searchGoogleCse(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return [];

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: options.query,
    num: String(Math.min(options.maxResults, 10))
  });

  const url = `${GOOGLE_CSE_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as GoogleCseResponse;
  const results = data.items ?? [];
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
