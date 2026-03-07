/**
 * Serper API Provider (google.serper.dev)
 *
 * Queries Google's index directly via Serper's API.
 * POST https://google.serper.dev/search with X-API-KEY header.
 */

import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";

type SerperOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerperResponse = {
  organic?: SerperOrganicResult[];
};

const SERPER_BASE = "https://google.serper.dev/search";
const DEFAULT_TIMEOUT_MS = 12_000;

export async function searchSerper(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  console.log(`[Search] Serper: Starting search for query: "${options.query.substring(0, 50)}..."`);

  if (!apiKey) {
    console.error("[Search] Serper: ❌ No API key configured (SERPER_API_KEY not set)");
    return [];
  }
  if (apiKey.includes("PASTE")) {
    const message = "Serper API key contains placeholder text; configure a real SERPER_API_KEY value";
    console.error(`[Search] Serper: ❌ ${message}`);
    throw new SearchProviderError("Serper", undefined, true, message);
  }

  console.log(`[Search] Serper: API key configured (length: ${apiKey.length})`);

  const body: Record<string, unknown> = {
    q: options.query,
    num: Math.min(options.maxResults, 10),
  };

  // Date restriction: Serper uses tbs parameter like Google
  if (options.dateRestrict) {
    const tbsMap: Record<string, string> = { y: "qdr:y", m: "qdr:m", w: "qdr:w" };
    body.tbs = tbsMap[options.dateRestrict];
    console.log(`[Search] Serper: Applying date restriction: ${options.dateRestrict} (tbs=${tbsMap[options.dateRestrict]})`);
  }

  // Geolocation: anchor results to claim's geography/language
  if (options.geography) {
    body.gl = options.geography.toLowerCase();
    console.log(`[Search] Serper: Geography bias: gl=${options.geography.toLowerCase()}`);
  }
  if (options.language) {
    const baseLang = options.language.split("-")[0].toLowerCase();
    body.hl = baseLang;
    console.log(`[Search] Serper: Interface language: hl=${baseLang}`);
  }

  console.log(`[Search] Serper: POST ${SERPER_BASE} with q="${options.query.substring(0, 50)}..."`);

  try {
    const startTime = Date.now();
    const res = await fetch(SERPER_BASE, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Serper: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Serper: ❌ HTTP error: ${res.status} ${res.statusText}`);
      let errorBody = "";
      try {
        errorBody = await res.text();
        console.error(`[Search] Serper: Error response body:`, errorBody.substring(0, 500));
      } catch {
        // Ignore parse errors
      }
      const lowerErrorBody = errorBody.toLowerCase();
      if (res.status >= 500 && res.status < 600) {
        throw new SearchProviderError(
          "Serper",
          res.status,
          false,
          `Serper HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      if (res.status === 429 || res.status === 403 || lowerErrorBody.includes("quota") || lowerErrorBody.includes("limit")) {
        throw new SearchProviderError(
          "Serper",
          res.status,
          true,
          `Serper HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      return [];
    }

    const data = (await res.json()) as SerperResponse;
    const results = data.organic ?? [];
    console.log(`[Search] Serper: ✅ Received ${results.length} organic results`);

    if (results.length === 0) {
      console.warn(`[Search] Serper: ⚠️ No organic results in response. Full response keys: ${Object.keys(data).join(", ")}`);
    }

    const out: WebSearchResult[] = [];

    for (const r of results) {
      if (!r.link || !r.title) continue;
      out.push({
        url: r.link,
        title: r.title,
        snippet: r.snippet ?? null,
      });
    }

    console.log(`[Search] Serper: Returning ${out.length} valid results`);
    return out;
  } catch (error) {
    if (error instanceof SearchProviderError) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] Serper: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] Serper: Request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}
