/**
 * Serper API Provider (google.serper.dev)
 *
 * Queries Google's index directly via Serper's API.
 * POST https://google.serper.dev/search with X-API-KEY header.
 */

import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";
import { requireApiKey, extractErrorBody, classifyHttpError, handleFetchError } from "./search-provider-utils";

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
  console.log(`[Search] Serper: Starting search for query: "${options.query.substring(0, 50)}..."`);
  const apiKey = requireApiKey("Serper", "SERPER_API_KEY", { throwOnPlaceholder: true });
  if (!apiKey) return [];

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
      const errorBody = await extractErrorBody("Serper", res);
      // Serper-specific: throw non-fatal for 5xx server errors
      if (res.status >= 500 && res.status < 600) {
        throw new SearchProviderError(
          "Serper",
          res.status,
          false,
          `Serper HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      classifyHttpError("Serper", res.status, errorBody, ["quota", "limit"]);
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
    return handleFetchError("Serper", options.timeoutMs ?? DEFAULT_TIMEOUT_MS, error);
  }
}
