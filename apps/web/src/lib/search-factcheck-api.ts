/**
 * Google Fact Check Tools API Provider
 *
 * https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search
 */

import { WebSearchOptions, WebSearchResult, SearchProviderError } from "./web-search";

export type FactCheckReview = {
  publisher: {
    name: string;
    site: string;
  };
  url: string;
  title: string;
  textualRating: string;
  languageCode: string;
  reviewDate?: string;
};

export type FactCheckClaim = {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview: FactCheckReview[];
};

export type FactCheckApiResult = {
  claims?: FactCheckClaim[];
  nextPageToken?: string;
};

const FACTCHECK_API_BASE = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const DEFAULT_TIMEOUT_MS = 15_000;

// Standard provider contract (for web-search.ts AUTO mode)
export async function searchGoogleFactCheck(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const apiKey = process.env.GOOGLE_FACTCHECK_API_KEY;
  console.log(`[Search] Google-FactCheck: Starting search for query: "${options.query.substring(0, 50)}..."`);

  if (!apiKey || apiKey.includes("PASTE")) {
    console.error("[Search] Google-FactCheck: ❌ API key not configured");
    return [];
  }

  // API key in query string (required by Google Fact Check API).
  // Never log full params.toString() — use urlForLog pattern below.
  const params = new URLSearchParams({
    query: options.query,
    pageSize: String(Math.min(options.maxResults, 100)),
    key: apiKey,
  });

  // Pass languageCode from provider config to filter reviews by language
  const languageCode = options.config?.providers?.googleFactCheck?.languageCode;
  if (languageCode) {
    params.set("languageCode", languageCode);
    console.log(`[Search] Google-FactCheck: Filtering by language: ${languageCode}`);
  }

  if (options.dateRestrict) {
    const maxAgeMap: Record<string, string> = {
      y: "365",
      m: "30",
      w: "7",
    };
    const mapped = maxAgeMap[options.dateRestrict];
    if (mapped) {
      params.set("maxAgeDays", mapped);
      console.log(`[Search] Google-FactCheck: Applying date restriction: ${options.dateRestrict} (maxAgeDays=${mapped})`);
    }
  }

  const urlForLog = `${FACTCHECK_API_BASE}?query=${encodeURIComponent(options.query)}&pageSize=${Math.min(options.maxResults, 100)}`;
  console.log(`[Search] Google-FactCheck: Fetching URL: ${urlForLog}`);

  try {
    const startTime = Date.now();
    const res = await fetch(`${FACTCHECK_API_BASE}?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const elapsed = Date.now() - startTime;

    console.log(`[Search] Google-FactCheck: Response received in ${elapsed}ms - Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.error(`[Search] Google-FactCheck: ❌ HTTP error: ${res.status} ${res.statusText}`);
      let errorBody = "";
      try {
        errorBody = await res.text();
        console.error(`[Search] Google-FactCheck: Error response body:`, errorBody.substring(0, 500));
      } catch (e) {
        // Ignore parse errors
      }
      
      if (res.status === 429 || res.status === 403) {
        throw new SearchProviderError(
          "Google-FactCheck",
          res.status,
          true,
          `Google Fact Check API HTTP ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`,
        );
      }
      if (res.status === 400) {
        // Bad query, just return empty
        return [];
      }
      return [];
    }

    const data = (await res.json()) as FactCheckApiResult;
    const claims = data.claims ?? [];
    console.log(`[Search] Google-FactCheck: ✅ Received ${claims.length} claims`);

    if (claims.length === 0) {
      console.warn(`[Search] Google-FactCheck: ⚠️ No results in response`);
    }

    const out: WebSearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const claim of claims) {
      if (!claim.claimReview || claim.claimReview.length === 0) continue;
      
      for (const review of claim.claimReview) {
        if (!review.url || !review.title) continue;
        if (seenUrls.has(review.url)) continue;
        
        seenUrls.add(review.url);
        
        const snippet = `[${review.publisher.name}] ${review.textualRating}: ${claim.text}`;
        
        out.push({
          url: review.url,
          title: review.title,
          snippet,
        });
      }
    }

    const truncated = out.slice(0, options.maxResults);
    console.log(`[Search] Google-FactCheck: Returning ${truncated.length} valid results`);
    return truncated;
  } catch (error) {
    if (error instanceof SearchProviderError) {
      throw error;
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Search] Google-FactCheck: ❌ Fetch failed: ${errorMsg}`);
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error(`[Search] Google-FactCheck: Request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
    }
    return [];
  }
}

export type FactCheckQueryOptions = {
  maxResults?: number;
  maxAgeDays?: number;
  languageCode?: string;
  timeoutMs?: number;
};

// Rich structured data (for pipeline direct seeding)
export async function queryFactCheckApi(query: string, options: FactCheckQueryOptions = {}): Promise<FactCheckApiResult> {
  const apiKey = process.env.GOOGLE_FACTCHECK_API_KEY;
  
  if (!apiKey || apiKey.includes("PASTE")) {
    return { claims: [] };
  }

  // API key in query string (required by Google Fact Check API).
  // Never log full params.toString() — use urlForLog pattern if adding request logging.
  const params = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (options.maxResults) {
    params.set("pageSize", String(Math.min(options.maxResults, 100)));
  }
  if (options.maxAgeDays) {
    params.set("maxAgeDays", String(options.maxAgeDays));
  }
  if (options.languageCode) {
    params.set("languageCode", options.languageCode);
  }

  try {
    const res = await fetch(`${FACTCHECK_API_BASE}?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 403) {
        throw new SearchProviderError(
          "Google-FactCheck",
          res.status,
          true,
          `Google Fact Check API HTTP ${res.status}`,
        );
      }
      return { claims: [] };
    }

    return (await res.json()) as FactCheckApiResult;
  } catch (error) {
    if (error instanceof SearchProviderError) {
      throw error;
    }
    return { claims: [] };
  }
}
