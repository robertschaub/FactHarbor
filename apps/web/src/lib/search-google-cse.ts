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
  console.log(`[Search] Google CSE: Starting search for query: "${options.query.substring(0, 50)}..."`);

  if (!apiKey || !cx) {
    console.error("[Search] Google CSE: ❌ API key or Search Engine ID not configured");
    console.error(`[Search] Google CSE: GOOGLE_CSE_API_KEY=${apiKey ? "set" : "NOT SET"}, GOOGLE_CSE_ID=${cx ? "set" : "NOT SET"}`);
    return [];
  }
  if (apiKey.includes("PASTE") || cx.includes("PASTE")) {
    console.error("[Search] Google CSE: ❌ API key or CSE ID contains placeholder text - please configure real values");
    return [];
  }

  console.log(`[Search] Google CSE: API key configured (length: ${apiKey.length}), CSE ID: ${cx.substring(0, 10)}...`);

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: options.query,
    num: String(Math.min(options.maxResults, 10))
  });

  const urlForLog = `${GOOGLE_CSE_BASE}?key=***&cx=${cx}&q=${encodeURIComponent(options.query)}&num=${Math.min(options.maxResults, 10)}`;
  console.log(`[Search] Google CSE: Fetching URL: ${urlForLog}`);

  try {
    const startTime = Date.now();
    const res = await fetch(`${GOOGLE_CSE_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Google CSE: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Google CSE: ❌ HTTP error: ${res.status} ${res.statusText}`);
      try {
        const errorData = await res.text();
        console.error(`[Search] Google CSE: Error response body:`, errorData.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      return [];
    }

    const data = (await res.json()) as GoogleCseResponse;
    const results = data.items ?? [];
    console.log(`[Search] Google CSE: ✅ Received ${results.length} results`);

    if (results.length === 0) {
      console.warn(`[Search] Google CSE: ⚠️ No items in response. Full response keys: ${Object.keys(data).join(", ")}`);
      // Log search information if available
      if ((data as any).searchInformation) {
        console.log(`[Search] Google CSE: Search info:`, JSON.stringify((data as any).searchInformation, null, 2));
      }
      if ((data as any).error) {
        console.error(`[Search] Google CSE: API error:`, JSON.stringify((data as any).error, null, 2));
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

    console.log(`[Search] Google CSE: Returning ${out.length} valid results`);
    return out;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] Google CSE: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] Google CSE: Request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}
