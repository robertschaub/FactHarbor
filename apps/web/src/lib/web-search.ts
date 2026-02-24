import { DEFAULT_SEARCH_CONFIG, type SearchConfig } from "./config-schemas";
import {
  getCachedSearchResults,
  cacheSearchResults,
} from "./search-cache";
import {
  isProviderAvailable,
  recordSuccess,
  recordFailure,
} from "./search-circuit-breaker";

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

export type SearchProviderErrorInfo = {
  provider: string;
  status?: number;
  message: string;
  fatal: boolean;
};

export type WebSearchResponse = {
  results: WebSearchResult[];
  providersUsed: string[];
  errors?: SearchProviderErrorInfo[];
};

/**
 * Error thrown by search providers for fatal/quota errors (HTTP 429, quota exhaustion).
 * Distinguishes recoverable "no results" from provider-level failures.
 */
export class SearchProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly status: number | undefined,
    public readonly fatal: boolean,
    message: string,
  ) {
    super(message);
    this.name = "SearchProviderError";
  }
}

/**
 * Get the actual search provider(s) that will be used
 */
export function getActiveSearchProviders(config?: SearchConfig): string[] {
  const c = config ?? DEFAULT_SEARCH_CONFIG;
  const provider = c.provider.toLowerCase();
  if (provider === "serpapi") return ["SerpAPI"];
  if (provider === "google-cse") return ["Google-CSE"];
  if (provider === "brave") return ["Brave"];
  if (provider === "wikipedia") return ["Wikipedia"];
  if (provider === "semantic-scholar") return ["Semantic-Scholar"];
  if (provider === "google-factcheck") return ["Google-FactCheck"];
  if (provider === "auto") {
    const providers: string[] = [];
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) providers.push("Google-CSE");
    if (process.env.SERPAPI_API_KEY) providers.push("SerpAPI");
    if (process.env.BRAVE_API_KEY) providers.push("Brave");
    // Wikipedia has no API key — enabled via config only
    if (c.providers?.wikipedia?.enabled) providers.push("Wikipedia");
    if (c.providers?.semanticScholar?.enabled) providers.push("Semantic-Scholar");
    if (process.env.GOOGLE_FACTCHECK_API_KEY && c.providers?.googleFactCheck?.enabled) providers.push("Google-FactCheck");
    return providers.length > 0 ? providers : ["None"];
  }
  return ["Unknown"];
}

export async function searchWebWithProvider(options: WebSearchOptions): Promise<WebSearchResponse> {
  const config = options.config ?? DEFAULT_SEARCH_CONFIG;
  const provider = config.provider.toLowerCase();
  const providersUsed: string[] = [];
  const errors: SearchProviderErrorInfo[] = [];

  // Extract configs for threading (no global mutation)
  const cacheConfig = config.cache ? { enabled: config.cache.enabled, ttlDays: config.cache.ttlDays } : undefined;
  const cbConfig = config.circuitBreaker;

  console.log(`[Search] Provider: ${provider} | Query: "${options.query.substring(0, 60)}..." | Max results: ${options.maxResults}`);

  // 1. Check cache first (if enabled)
  const cached = await getCachedSearchResults(options, cacheConfig);
  if (cached) {
    console.log(`[Search] 🎯 Cache HIT - returning ${cached.results.length} cached results from ${cached.provider}`);
    return {
      results: cached.results,
      providersUsed: [`${cached.provider} (cached)`],
    };
  }
  console.log(`[Search] Cache MISS - proceeding with provider search`);

  if (provider === "serpapi") {
    console.log("[Search] Using SerpAPI (explicit)");

    // Check circuit breaker
    if (!isProviderAvailable("SerpAPI", cbConfig)) {
      errors.push({ provider: "SerpAPI", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["SerpAPI (circuit-open)"], errors };
    }

    providersUsed.push("SerpAPI");
    try {
      const { searchSerpApi } = await import("./search-serpapi");
      const results = await applyDomainFilters(searchSerpApi(options), options);
      console.log(`[Search] Final results from SerpAPI: ${results.length}`);

      // Record success and cache results (only if results exist)
      if (results.length > 0) {
        recordSuccess("SerpAPI", cbConfig);
      }
      await cacheSearchResults(options, results, "SerpAPI", cacheConfig);

      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("SerpAPI", err.message, cbConfig);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "google-cse") {
    console.log("[Search] Using Google CSE (explicit)");

    // Check circuit breaker
    if (!isProviderAvailable("Google-CSE", cbConfig)) {
      errors.push({ provider: "Google-CSE", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Google-CSE (circuit-open)"], errors };
    }

    providersUsed.push("Google-CSE");
    try {
      const { searchGoogleCse } = await import("./search-google-cse");
      const results = await applyDomainFilters(searchGoogleCse(options), options);
      console.log(`[Search] Final results from Google CSE: ${results.length}`);

      // Record success and cache results (only if results exist)
      if (results.length > 0) {
        recordSuccess("Google-CSE", cbConfig);
      }
      await cacheSearchResults(options, results, "Google-CSE", cacheConfig);

      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Google-CSE", err.message, cbConfig);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "brave") {
    console.log("[Search] Using Brave (explicit)");

    // Check circuit breaker
    if (!isProviderAvailable("Brave", cbConfig)) {
      errors.push({ provider: "Brave", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Brave (circuit-open)"], errors };
    }

    providersUsed.push("Brave");
    try {
      const { searchBrave } = await import("./search-brave");
      const results = await applyDomainFilters(searchBrave(options), options);
      console.log(`[Search] Final results from Brave: ${results.length}`);

      // Record success and cache results (only if results exist)
      if (results.length > 0) {
        recordSuccess("Brave", cbConfig);
      }
      await cacheSearchResults(options, results, "Brave", cacheConfig);

      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Brave", err.message, cbConfig);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "wikipedia") {
    console.log("[Search] Using Wikipedia (explicit)");

    if (!isProviderAvailable("Wikipedia", cbConfig)) {
      errors.push({ provider: "Wikipedia", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Wikipedia (circuit-open)"], errors };
    }

    providersUsed.push("Wikipedia");
    try {
      const { searchWikipedia } = await import("./search-wikipedia");
      const results = await applyDomainFilters(searchWikipedia(options), options);
      console.log(`[Search] Final results from Wikipedia: ${results.length}`);
      if (results.length > 0) {
        recordSuccess("Wikipedia", cbConfig);
      }
      await cacheSearchResults(options, results, "Wikipedia", cacheConfig);
      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Wikipedia", err.message, cbConfig);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "semantic-scholar") {
    console.log("[Search] Using Semantic Scholar (explicit)");

    if (!isProviderAvailable("Semantic-Scholar", cbConfig)) {
      errors.push({ provider: "Semantic-Scholar", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Semantic-Scholar (circuit-open)"], errors };
    }

    providersUsed.push("Semantic-Scholar");
    try {
      const { searchSemanticScholar } = await import("./search-semanticscholar");
      const results = await applyDomainFilters(searchSemanticScholar(options), options);
      console.log(`[Search] Final results from Semantic Scholar: ${results.length}`);
      if (results.length > 0) {
        recordSuccess("Semantic-Scholar", cbConfig);
      }
      await cacheSearchResults(options, results, "Semantic-Scholar", cacheConfig);
      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Semantic-Scholar", err.message, cbConfig);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "google-factcheck") {
    console.log("[Search] Using Google Fact Check (explicit)");

    if (!isProviderAvailable("Google-FactCheck", cbConfig)) {
      errors.push({ provider: "Google-FactCheck", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Google-FactCheck (circuit-open)"], errors };
    }

    providersUsed.push("Google-FactCheck");
    try {
      const { searchGoogleFactCheck } = await import("./search-factcheck-api");
      const results = await applyDomainFilters(searchGoogleFactCheck(options), options);
      console.log(`[Search] Final results from Google Fact Check: ${results.length}`);
      if (results.length > 0) {
        recordSuccess("Google-FactCheck", cbConfig);
      }
      await cacheSearchResults(options, results, "Google-FactCheck", cacheConfig);
      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Google-FactCheck", err.message, cbConfig);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "auto") {
    console.log("[Search] Using AUTO mode with multi-provider fallback + circuit breaker...");
    const results: WebSearchResult[] = [];

    // Build provider list with priorities (respecting circuit breaker and configuration)
    type ProviderInfo = { name: string; priority: number; available: boolean };
    const providers: ProviderInfo[] = [];

    const hasGoogleCse = !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID);
    const hasSerpApi = !!process.env.SERPAPI_API_KEY;
    const hasBrave = !!process.env.BRAVE_API_KEY;

    if (hasGoogleCse && (config.providers?.googleCse?.enabled ?? true)) {
      providers.push({
        name: "Google-CSE",
        priority: config.providers?.googleCse?.priority ?? 1,
        available: isProviderAvailable("Google-CSE", cbConfig),
      });
    }
    if (hasSerpApi && (config.providers?.serpapi?.enabled ?? true)) {
      providers.push({
        name: "SerpAPI",
        priority: config.providers?.serpapi?.priority ?? 2,
        available: isProviderAvailable("SerpAPI", cbConfig),
      });
    }
    if (hasBrave && (config.providers?.brave?.enabled ?? true)) {
      providers.push({
        name: "Brave",
        priority: config.providers?.brave?.priority ?? 2,
        available: isProviderAvailable("Brave", cbConfig),
      });
    }
    // Wikipedia: no API key needed, enabled via config only (default: disabled)
    if (config.providers?.wikipedia?.enabled) {
      providers.push({
        name: "Wikipedia",
        priority: config.providers?.wikipedia?.priority ?? 3,
        available: isProviderAvailable("Wikipedia", cbConfig),
      });
    }
    // Semantic Scholar: works without API key at shared pool rate
    if (config.providers?.semanticScholar?.enabled) {
      providers.push({
        name: "Semantic-Scholar",
        priority: config.providers?.semanticScholar?.priority ?? 3,
        available: isProviderAvailable("Semantic-Scholar", cbConfig),
      });
    }
    // Google Fact Check: requires API key
    const hasGoogleFactCheck = !!process.env.GOOGLE_FACTCHECK_API_KEY;
    if (hasGoogleFactCheck && config.providers?.googleFactCheck?.enabled) {
      providers.push({
        name: "Google-FactCheck",
        priority: config.providers?.googleFactCheck?.priority ?? 4,
        available: isProviderAvailable("Google-FactCheck", cbConfig),
      });
    }

    // Sort by priority (lower number = higher priority), then by name for stability
    providers.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

    console.log(
      `[Search] Available providers (by priority): ${providers.map((p) => `${p.name}[${p.priority}]${p.available ? "" : "(circuit-open)"}`).join(", ")}`,
    );

    // Try providers in priority order until we have enough results
    for (const providerInfo of providers) {
      if (results.length >= options.maxResults) {
        break; // We have enough results
      }

      if (!providerInfo.available) {
        console.log(`[Search] Skipping ${providerInfo.name} (circuit breaker OPEN)`);
        providersUsed.push(`${providerInfo.name} (circuit-open)`);
        continue;
      }

      const remaining = options.maxResults - results.length;
      console.log(`[Search] Trying ${providerInfo.name} (need ${remaining} results)...`);
      providersUsed.push(providerInfo.name);

      try {
        let providerResults: WebSearchResult[] = [];

        if (providerInfo.name === "Google-CSE") {
          const { searchGoogleCse } = await import("./search-google-cse");
          providerResults = await searchGoogleCse({ ...options, maxResults: remaining });
        } else if (providerInfo.name === "SerpAPI") {
          const { searchSerpApi } = await import("./search-serpapi");
          providerResults = await searchSerpApi({ ...options, maxResults: remaining });
        } else if (providerInfo.name === "Brave") {
          const { searchBrave } = await import("./search-brave");
          providerResults = await searchBrave({ ...options, maxResults: remaining });
        } else if (providerInfo.name === "Wikipedia") {
          const { searchWikipedia } = await import("./search-wikipedia");
          providerResults = await searchWikipedia({ ...options, maxResults: remaining });
        } else if (providerInfo.name === "Semantic-Scholar") {
          const { searchSemanticScholar } = await import("./search-semanticscholar");
          providerResults = await searchSemanticScholar({ ...options, maxResults: remaining });
        } else if (providerInfo.name === "Google-FactCheck") {
          const { searchGoogleFactCheck } = await import("./search-factcheck-api");
          providerResults = await searchGoogleFactCheck({ ...options, maxResults: remaining });
        }

        results.push(...providerResults);

        // Only record success if provider returned results
        if (providerResults.length > 0) {
          recordSuccess(providerInfo.name, cbConfig);
        }
        console.log(
          `[Search] ${providerInfo.name} returned ${providerResults.length} results, total now: ${results.length}`,
        );

        // If this provider gave us enough results, stop searching
        if (results.length >= options.maxResults) {
          break;
        }
      } catch (err) {
        if (err instanceof SearchProviderError) {
          recordFailure(providerInfo.name, err.message, cbConfig);
          errors.push({
            provider: err.provider,
            status: err.status,
            message: err.message,
            fatal: err.fatal,
          });
          console.error(`[Search] ${providerInfo.name} provider error: ${err.message}`);
        } else {
          throw err;
        }
      }
    }

    if (providers.length === 0) {
      console.error(
        "[Search] ❌ NO SEARCH PROVIDERS CONFIGURED! Set SERPAPI_API_KEY, GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID, or BRAVE_API_KEY",
      );
      providersUsed.push("None");
    }

    // Apply domain filters and cache final results
    const finalResults = await applyDomainFilters(Promise.resolve(results), options);
    console.log(`[Search] Final results after domain filtering: ${finalResults.length}`);

    if (finalResults.length > 0 && providersUsed.length > 0) {
      const primaryProvider = providersUsed.find((p) => !p.includes("circuit-open")) || providersUsed[0];
      await cacheSearchResults(options, finalResults, primaryProvider, cacheConfig);
    }

    return { results: finalResults, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
  }

  console.error(`[Search] ❌ Unknown provider: "${provider}". Valid options: auto, serpapi, google-cse, brave, wikipedia, semantic-scholar, google-factcheck`);
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
