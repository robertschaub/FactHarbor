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
  if (!apiKey || !cx) {
    console.warn("[Search] Google CSE: API key or Search Engine ID not configured");
    return [];
  }
  if (apiKey.includes("PASTE") || cx.includes("PASTE")) {
    console.warn("[Search] Google CSE: API key or CSE ID contains placeholder text - please configure real values");
    return [];
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: options.query,
    num: String(Math.min(options.maxResults, 10))
  });

  const url = `${GOOGLE_CSE_BASE}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });

    if (!res.ok) {
      console.error(`[Search] Google CSE error: ${res.status} ${res.statusText}`);
      try {
        const errorData = await res.text();
        console.error(`[Search] Google CSE response:`, errorData.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
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
  } catch (error) {
    console.error(`[Search] Google CSE fetch failed:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}
