import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";

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

  // Add date restriction if specified (Google CSE uses dateRestrict parameter)
  // dateRestrict=y[1] = past year, m[1] = past month, w[1] = past week
  if (options.dateRestrict) {
    const dateRestrictMap: Record<string, string> = { y: "y[1]", m: "m[1]", w: "w[1]" };
    params.set("dateRestrict", dateRestrictMap[options.dateRestrict]);
    console.log(`[Search] Google CSE: Applying date restriction: ${options.dateRestrict} (dateRestrict=${dateRestrictMap[options.dateRestrict]})`);
  }

  const urlForLog = `${GOOGLE_CSE_BASE}?key=***&cx=${cx}&q=${encodeURIComponent(options.query)}&num=${Math.min(options.maxResults, 10)}`;
  console.log(`[Search] Google CSE: Fetching URL: ${urlForLog}`);

  try {
    const startTime = Date.now();
    const res = await fetch(`${GOOGLE_CSE_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Google CSE: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Google CSE: ❌ HTTP error: ${res.status} ${res.statusText}`);
      let errorBody = "";
      try {
        errorBody = await res.text();
        console.error(`[Search] Google CSE: Error response body:`, errorBody.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      // Throw fatal error for rate limits and quota exhaustion so callers can detect it
      if (res.status === 429 || res.status === 403 || errorBody.includes("quota") || errorBody.includes("limit exceeded")) {
        throw new SearchProviderError(
          "Google-CSE",
          res.status,
          true,
          `Google CSE HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      return [];
    }

    const data = (await res.json()) as GoogleCseResponse;
    const results = data.items ?? [];
    console.log(`[Search] Google CSE: ✅ Received ${results.length} results`);

    // Check for API-level errors in the response body (can occur with 200 status)
    const apiError = (data as any).error;
    if (apiError) {
      const errorStr = typeof apiError === "string" ? apiError : JSON.stringify(apiError);
      console.error(`[Search] Google CSE: API error:`, errorStr);
      if (errorStr.includes("quota") || errorStr.includes("limit") || errorStr.includes("billing")) {
        throw new SearchProviderError("Google-CSE", 200, true, `Google CSE API error: ${errorStr.substring(0, 200)}`);
      }
    }

    if (results.length === 0) {
      console.warn(`[Search] Google CSE: ⚠️ No items in response. Full response keys: ${Object.keys(data).join(", ")}`);
      // Log search information if available
      if ((data as any).searchInformation) {
        console.log(`[Search] Google CSE: Search info:`, JSON.stringify((data as any).searchInformation, null, 2));
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
    // Re-throw SearchProviderError so callers can detect fatal provider failures
    if (error instanceof SearchProviderError) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] Google CSE: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] Google CSE: Request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}
