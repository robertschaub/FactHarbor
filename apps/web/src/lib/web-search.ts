export type WebSearchResult = {
  url: string;
  title: string;
  snippet: string | null;
};

export type WebSearchOptions = {
  query: string;
  maxResults: number;
  domainWhitelist?: string[];
};

export type WebSearchResponse = {
  results: WebSearchResult[];
  providersUsed: string[];
};

/**
 * Get the actual search provider(s) that will be used
 */
export function getActiveSearchProviders(): string[] {
  const provider = (process.env.FH_SEARCH_PROVIDER ?? "auto").toLowerCase();
  if (provider === "serpapi") return ["SerpAPI"];
  if (provider === "google-cse") return ["Google-CSE"];
  if (provider === "auto") {
    const providers: string[] = [];
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) providers.push("Google-CSE");
    if (process.env.SERPAPI_API_KEY) providers.push("SerpAPI");
    return providers.length > 0 ? providers : ["None"];
  }
  return ["Unknown"];
}

export async function searchWebWithProvider(options: WebSearchOptions): Promise<WebSearchResponse> {
  const provider = (process.env.FH_SEARCH_PROVIDER ?? "auto").toLowerCase();
  const providersUsed: string[] = [];
  console.log(`[Search] Provider: ${provider} | Query: "${options.query.substring(0, 60)}..." | Max results: ${options.maxResults}`);

  if (provider === "serpapi") {
    console.log("[Search] Using SerpAPI (explicit)");
    providersUsed.push("SerpAPI");
    const { searchSerpApi } = await import("./search-serpapi");
    const results = await applyWhitelist(searchSerpApi(options), options.domainWhitelist);
    console.log(`[Search] Final results from SerpAPI: ${results.length}`);
    return { results, providersUsed };
  }
  if (provider === "google-cse") {
    console.log("[Search] Using Google CSE (explicit)");
    providersUsed.push("Google-CSE");
    const { searchGoogleCse } = await import("./search-google-cse");
    const results = await applyWhitelist(searchGoogleCse(options), options.domainWhitelist);
    console.log(`[Search] Final results from Google CSE: ${results.length}`);
    return { results, providersUsed };
  }
  if (provider === "auto") {
    console.log("[Search] Using AUTO mode - checking available providers...");
    const results: WebSearchResult[] = [];

    const hasGoogleCse = !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID);
    const hasSerpApi = !!process.env.SERPAPI_API_KEY;
    console.log(`[Search] Available providers: Google CSE=${hasGoogleCse}, SerpAPI=${hasSerpApi}`);

    if (hasGoogleCse) {
      console.log("[Search] Trying Google CSE first...");
      providersUsed.push("Google-CSE");
      const { searchGoogleCse } = await import("./search-google-cse");
      const cseResults = await searchGoogleCse(options);
      results.push(...cseResults);
      console.log(`[Search] Google CSE returned ${cseResults.length} results, total now: ${results.length}`);
    }

    if (results.length < options.maxResults && hasSerpApi) {
      const remaining = options.maxResults - results.length;
      console.log(`[Search] Need ${remaining} more results, trying SerpAPI...`);
      providersUsed.push("SerpAPI");
      const { searchSerpApi } = await import("./search-serpapi");
      const more = await searchSerpApi({ ...options, maxResults: remaining });
      results.push(...more);
      console.log(`[Search] SerpAPI returned ${more.length} results, total now: ${results.length}`);
    }

    if (!hasGoogleCse && !hasSerpApi) {
      console.error("[Search] ❌ NO SEARCH PROVIDERS CONFIGURED! Set SERPAPI_API_KEY or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID");
      providersUsed.push("None");
    }

    const finalResults = await applyWhitelist(Promise.resolve(results), options.domainWhitelist);
    console.log(`[Search] Final results after whitelist: ${finalResults.length}`);
    return { results: finalResults, providersUsed };
  }

  console.error(`[Search] ❌ Unknown provider: "${provider}". Valid options: auto, serpapi, google-cse`);
  return { results: [], providersUsed: ["Unknown"] };
}

export async function searchWeb(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const provider = (process.env.FH_SEARCH_PROVIDER ?? "auto").toLowerCase();
  console.log(`[Search] Provider: ${provider} | Query: "${options.query.substring(0, 60)}..." | Max results: ${options.maxResults}`);

  if (provider === "serpapi") {
    console.log("[Search] Using SerpAPI (explicit)");
    const { searchSerpApi } = await import("./search-serpapi");
    const results = await applyWhitelist(searchSerpApi(options), options.domainWhitelist);
    console.log(`[Search] Final results from SerpAPI: ${results.length}`);
    return results;
  }
  if (provider === "google-cse") {
    console.log("[Search] Using Google CSE (explicit)");
    const { searchGoogleCse } = await import("./search-google-cse");
    const results = await applyWhitelist(searchGoogleCse(options), options.domainWhitelist);
    console.log(`[Search] Final results from Google CSE: ${results.length}`);
    return results;
  }
  if (provider === "auto") {
    console.log("[Search] Using AUTO mode - checking available providers...");
    const results: WebSearchResult[] = [];

    const hasGoogleCse = !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID);
    const hasSerpApi = !!process.env.SERPAPI_API_KEY;
    console.log(`[Search] Available providers: Google CSE=${hasGoogleCse}, SerpAPI=${hasSerpApi}`);

    if (hasGoogleCse) {
      console.log("[Search] Trying Google CSE first...");
      const { searchGoogleCse } = await import("./search-google-cse");
      const cseResults = await searchGoogleCse(options);
      results.push(...cseResults);
      console.log(`[Search] Google CSE returned ${cseResults.length} results, total now: ${results.length}`);
    }

    if (results.length < options.maxResults && hasSerpApi) {
      const remaining = options.maxResults - results.length;
      console.log(`[Search] Need ${remaining} more results, trying SerpAPI...`);
      const { searchSerpApi } = await import("./search-serpapi");
      const more = await searchSerpApi({ ...options, maxResults: remaining });
      results.push(...more);
      console.log(`[Search] SerpAPI returned ${more.length} results, total now: ${results.length}`);
    }

    if (!hasGoogleCse && !hasSerpApi) {
      console.error("[Search] ❌ NO SEARCH PROVIDERS CONFIGURED! Set SERPAPI_API_KEY or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID");
    }

    const finalResults = await applyWhitelist(Promise.resolve(results), options.domainWhitelist);
    console.log(`[Search] Final results after whitelist: ${finalResults.length}`);
    return finalResults;
  }

  console.error(`[Search] ❌ Unknown provider: "${provider}". Valid options: auto, serpapi, google-cse`);
  return [];
}

async function applyWhitelist(
  resultsPromise: Promise<WebSearchResult[]>,
  whitelist?: string[]
): Promise<WebSearchResult[]> {
  const results = await resultsPromise;
  if (!whitelist || whitelist.length === 0) return results;
  const allowed = new Set(whitelist.map((d) => d.toLowerCase()));
  return results.filter((r) => {
    try {
      const host = new URL(r.url).hostname.toLowerCase();
      return allowed.has(host) || allowed.has(host.replace(/^www\./, ""));
    } catch {
      return false;
    }
  });
}
