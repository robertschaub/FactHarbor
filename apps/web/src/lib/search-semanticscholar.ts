/**
 * Semantic Scholar Search API Provider
 *
 * https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data/operation/get_graph_get_paper_search
 */

import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";

type SemanticScholarPaper = {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  venue?: string;
  citationCount?: number;
  externalIds?: {
    DOI?: string;
    [key: string]: string | undefined;
  };
};

type SemanticScholarResponse = {
  total: number;
  offset: number;
  next?: number;
  data?: SemanticScholarPaper[];
};

const S2_API_BASE = "https://api.search.semanticscholar.org/graph/v1/paper/search";
const DEFAULT_TIMEOUT_MS = 15_000;

// MSR-M2: Concurrency-safe serialized async queue rate limiter.
// Each call chains onto `pending`, guaranteeing 1.1s gaps even under concurrent invocations.
// First call proceeds immediately (lastCallTime=0 → elapsed is huge → delay=0).
const MIN_INTERVAL_MS = 1100;
let pending: Promise<void> = Promise.resolve();
let lastCallTime = 0;

function acquireSlot(): Promise<void> {
  const slot = pending.then(() => {
    const now = Date.now();
    const elapsed = now - lastCallTime;
    const delay = elapsed >= MIN_INTERVAL_MS ? 0 : MIN_INTERVAL_MS - elapsed;
    return new Promise<void>(resolve => {
      setTimeout(() => {
        lastCallTime = Date.now();
        resolve();
      }, delay);
    });
  });
  pending = slot;
  return slot;
}

export async function searchSemanticScholar(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  console.log(`[Search] Semantic-Scholar: Starting search for query: "${options.query.substring(0, 50)}..."`);

  if (!apiKey || apiKey.includes("PASTE")) {
    console.warn("[Search] Semantic-Scholar: ⚠️ API key not configured. Using shared rate pool (may fail with 429).");
  } else {
    console.log(`[Search] Semantic-Scholar: API key configured (length: ${apiKey.length})`);
  }

  const params = new URLSearchParams({
    query: options.query,
    limit: String(Math.min(options.maxResults, 100)),
    fields: "title,abstract,year,citationCount,venue,externalIds",
  });

  if (options.dateRestrict) {
    const currentYear = new Date().getFullYear();
    // S2 only supports year-level granularity
    const yearRange = options.dateRestrict === "y"
      ? `${currentYear - 1}-${currentYear}` // past year → 2-year range
      : String(currentYear); // past month/week → current year only
    params.set("year", yearRange);
    console.log(`[Search] Semantic-Scholar: Applying date restriction: ${options.dateRestrict} (year=${yearRange})`);
  }

  const urlForLog = `${S2_API_BASE}?${params.toString()}`;
  console.log(`[Search] Semantic-Scholar: Fetching URL: ${urlForLog}`);

  await acquireSlot();

  try {
    const startTime = Date.now();
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (apiKey && !apiKey.includes("PASTE")) {
      headers["x-api-key"] = apiKey;
    }

    const res = await fetch(`${S2_API_BASE}?${params.toString()}`, {
      headers,
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Semantic-Scholar: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Semantic-Scholar: ❌ HTTP error: ${res.status} ${res.statusText}`);
      let errorBody = "";
      try {
        errorBody = await res.text();
        console.error(`[Search] Semantic-Scholar: Error response body:`, errorBody.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      
      if (res.status === 429 || res.status === 403) {
        throw new SearchProviderError(
          "Semantic-Scholar",
          res.status,
          true,
          `Semantic Scholar API HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      return [];
    }

    const data = (await res.json()) as SemanticScholarResponse;
    const results = data.data ?? [];
    console.log(`[Search] Semantic-Scholar: ✅ Received ${results.length} results`);

    if (results.length === 0) {
      console.warn(`[Search] Semantic-Scholar: ⚠️ No results in response`);
    }

    const out: WebSearchResult[] = [];

    for (const r of results) {
      if (!r.title || !r.paperId) continue;

      // Construct title with year and venue
      const meta = [r.year, r.venue].filter(Boolean).join(", ");
      const enrichedTitle = meta ? `${r.title} (${meta})` : r.title;

      // Truncate abstract to 500 chars (academic abstracts are dense — 300 often cuts before findings)
      let snippet = r.abstract ?? null;
      if (snippet && snippet.length > 500) {
        snippet = snippet.substring(0, 497) + "...";
      }

      // Prefer DOI URL, fallback to S2 paper page
      const url = r.externalIds?.DOI 
        ? `https://doi.org/${r.externalIds.DOI}`
        : `https://www.semanticscholar.org/paper/${r.paperId}`;

      out.push({
        url,
        title: enrichedTitle,
        snippet,
      });
    }

    const truncated = out.slice(0, options.maxResults);
    console.log(`[Search] Semantic-Scholar: Returning ${truncated.length} valid results`);
    return truncated;
  } catch (error) {
    if (error instanceof SearchProviderError) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] Semantic-Scholar: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] Semantic-Scholar: Request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}
