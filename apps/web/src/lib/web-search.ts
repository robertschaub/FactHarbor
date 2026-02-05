import { DEFAULT_SEARCH_CONFIG, type SearchConfig } from "./config-schemas";

export type WebSearchResult = {
  url: string;
  title: string;
  snippet: string | null;
};

export type WebSearchOptions = {
  query: string;
  maxResults: number;
  domainWhitelist?: string[];
  domainBlacklist?: string[];
  /** Date restriction: "y" (past year), "m" (past month), "w" (past week), or undefined (no restriction) */
  dateRestrict?: "y" | "m" | "w";
  timeoutMs?: number;
  config?: SearchConfig;
};

export type WebSearchResponse = {
  results: WebSearchResult[];
  providersUsed: string[];
};

/**
 * Get the actual search provider(s) that will be used
 */
export function getActiveSearchProviders(config?: SearchConfig): string[] {
  const provider = (config ?? DEFAULT_SEARCH_CONFIG).provider.toLowerCase();
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
  const provider = (options.config ?? DEFAULT_SEARCH_CONFIG).provider.toLowerCase();
  const providersUsed: string[] = [];
  console.log(`[Search] Provider: ${provider} | Query: "${options.query.substring(0, 60)}..." | Max results: ${options.maxResults}`);

  if (provider === "serpapi") {
    console.log("[Search] Using SerpAPI (explicit)");
    providersUsed.push("SerpAPI");
    const { searchSerpApi } = await import("./search-serpapi");
    const results = await applyDomainFilters(searchSerpApi(options), options);
    console.log(`[Search] Final results from SerpAPI: ${results.length}`);
    return { results, providersUsed };
  }
  if (provider === "google-cse") {
    console.log("[Search] Using Google CSE (explicit)");
    providersUsed.push("Google-CSE");
    const { searchGoogleCse } = await import("./search-google-cse");
    const results = await applyDomainFilters(searchGoogleCse(options), options);
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

    const finalResults = await applyDomainFilters(Promise.resolve(results), options);
    console.log(`[Search] Final results after whitelist: ${finalResults.length}`);
    return { results: finalResults, providersUsed };
  }

  console.error(`[Search] ❌ Unknown provider: "${provider}". Valid options: auto, serpapi, google-cse`);
  return { results: [], providersUsed: ["Unknown"] };
}

function normalizeDomain(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

async function applyDomainFilters(
  resultsPromise: Promise<WebSearchResult[]>,
  options: WebSearchOptions,
): Promise<WebSearchResult[]> {
  const results = await resultsPromise;
  const whitelist = options.domainWhitelist ?? options.config?.domainWhitelist;
  const blacklist = options.domainBlacklist ?? options.config?.domainBlacklist;

  let filtered = results;

  if (whitelist && whitelist.length > 0) {
    const allowed = new Set(whitelist.map((d) => d.toLowerCase()));
    filtered = filtered.filter((r) => {
      try {
        const host = normalizeDomain(new URL(r.url).hostname);
        return allowed.has(host) || [...allowed].some((domain) => host.endsWith(`.${domain}`));
      } catch {
        return false;
      }
    });
  }

  if (blacklist && blacklist.length > 0) {
    const blocked = new Set(blacklist.map((d) => d.toLowerCase()));
    filtered = filtered.filter((r) => {
      try {
        const host = normalizeDomain(new URL(r.url).hostname);
        return !(blocked.has(host) || [...blocked].some((domain) => host.endsWith(`.${domain}`)));
      } catch {
        return false;
      }
    });
  }

  return filtered;
}
