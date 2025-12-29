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

export async function searchWeb(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const provider = (process.env.FH_SEARCH_PROVIDER ?? "auto").toLowerCase();
  if (provider === "serpapi") {
    const { searchSerpApi } = await import("./search-serpapi");
    return applyWhitelist(searchSerpApi(options), options.domainWhitelist);
  }
  if (provider === "google-cse") {
    const { searchGoogleCse } = await import("./search-google-cse");
    return applyWhitelist(searchGoogleCse(options), options.domainWhitelist);
  }
  if (provider === "auto") {
    const results: WebSearchResult[] = [];
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
      const { searchGoogleCse } = await import("./search-google-cse");
      results.push(...(await searchGoogleCse(options)));
    }
    if (results.length < options.maxResults && process.env.SERPAPI_API_KEY) {
      const { searchSerpApi } = await import("./search-serpapi");
      const remaining = options.maxResults - results.length;
      const more = await searchSerpApi({ ...options, maxResults: remaining });
      results.push(...more);
    }
    return applyWhitelist(Promise.resolve(results), options.domainWhitelist);
  }
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
