import { DEFAULT_SEARCH_CONFIG, type SearchConfig } from "./config-schemas";
import {
  getCachedSearchResults,
  cacheSearchResults,
  setSearchCacheEnabled,
  setSearchCacheTtlDays,
} from "./search-cache";
import {
  isProviderAvailable,
  recordSuccess,
  recordFailure,
  setCircuitBreakerConfig,
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
  const provider = (config ?? DEFAULT_SEARCH_CONFIG).provider.toLowerCase();
  if (provider === "serpapi") return ["SerpAPI"];
  if (provider === "google-cse") return ["Google-CSE"];
  if (provider === "brave") return ["Brave"];
  if (provider === "auto") {
    const providers: string[] = [];
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) providers.push("Google-CSE");
    if (process.env.SERPAPI_API_KEY) providers.push("SerpAPI");
    if (process.env.BRAVE_API_KEY) providers.push("Brave");
    return providers.length > 0 ? providers : ["None"];
  }
  return ["Unknown"];
}

export async function searchWebWithProvider(options: WebSearchOptions): Promise<WebSearchResponse> {
  const config = options.config ?? DEFAULT_SEARCH_CONFIG;
  const provider = config.provider.toLowerCase();
  const providersUsed: string[] = [];
  const errors: SearchProviderErrorInfo[] = [];

  // Apply configuration to cache and circuit breaker
  if (config.cache) {
    setSearchCacheEnabled(config.cache.enabled);
    setSearchCacheTtlDays(config.cache.ttlDays);
  }
  if (config.circuitBreaker) {
    setCircuitBreakerConfig(config.circuitBreaker);
  }

  console.log(`[Search] Provider: ${provider} | Query: "${options.query.substring(0, 60)}..." | Max results: ${options.maxResults}`);

  // 1. Check cache first (if enabled)
  const cached = await getCachedSearchResults(options);
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
    if (!isProviderAvailable("SerpAPI")) {
      errors.push({ provider: "SerpAPI", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["SerpAPI (circuit-open)"], errors };
    }

    providersUsed.push("SerpAPI");
    try {
      const { searchSerpApi } = await import("./search-serpapi");
      const results = await applyDomainFilters(searchSerpApi(options), options);
      console.log(`[Search] Final results from SerpAPI: ${results.length}`);

      // Record success and cache results
      recordSuccess("SerpAPI");
      await cacheSearchResults(options, results, "SerpAPI");

      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("SerpAPI", err.message);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "google-cse") {
    console.log("[Search] Using Google CSE (explicit)");

    // Check circuit breaker
    if (!isProviderAvailable("Google-CSE")) {
      errors.push({ provider: "Google-CSE", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Google-CSE (circuit-open)"], errors };
    }

    providersUsed.push("Google-CSE");
    try {
      const { searchGoogleCse } = await import("./search-google-cse");
      const results = await applyDomainFilters(searchGoogleCse(options), options);
      console.log(`[Search] Final results from Google CSE: ${results.length}`);

      // Record success and cache results
      recordSuccess("Google-CSE");
      await cacheSearchResults(options, results, "Google-CSE");

      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Google-CSE", err.message);
        errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
        return { results: [], providersUsed, errors };
      }
      throw err;
    }
  }
  if (provider === "brave") {
    console.log("[Search] Using Brave (explicit)");

    // Check circuit breaker
    if (!isProviderAvailable("Brave")) {
      errors.push({ provider: "Brave", message: "Circuit breaker OPEN", fatal: true });
      return { results: [], providersUsed: ["Brave (circuit-open)"], errors };
    }

    providersUsed.push("Brave");
    try {
      const { searchBrave } = await import("./search-brave");
      const results = await applyDomainFilters(searchBrave(options), options);
      console.log(`[Search] Final results from Brave: ${results.length}`);

      // Record success and cache results
      recordSuccess("Brave");
      await cacheSearchResults(options, results, "Brave");

      return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
    } catch (err) {
      if (err instanceof SearchProviderError) {
        recordFailure("Brave", err.message);
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
        available: isProviderAvailable("Google-CSE"),
      });
    }
    if (hasSerpApi && (config.providers?.serpapi?.enabled ?? true)) {
      providers.push({
        name: "SerpAPI",
        priority: config.providers?.serpapi?.priority ?? 2,
        available: isProviderAvailable("SerpAPI"),
      });
    }
    if (hasBrave && (config.providers?.brave?.enabled ?? true)) {
      providers.push({
        name: "Brave",
        priority: config.providers?.brave?.priority ?? 2,
        available: isProviderAvailable("Brave"),
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
          recordSuccess("Google-CSE");
        } else if (providerInfo.name === "SerpAPI") {
          const { searchSerpApi } = await import("./search-serpapi");
          providerResults = await searchSerpApi({ ...options, maxResults: remaining });
          recordSuccess("SerpAPI");
        } else if (providerInfo.name === "Brave") {
          const { searchBrave } = await import("./search-brave");
          providerResults = await searchBrave({ ...options, maxResults: remaining });
          recordSuccess("Brave");
        }

        results.push(...providerResults);
        console.log(
          `[Search] ${providerInfo.name} returned ${providerResults.length} results, total now: ${results.length}`,
        );

        // If this provider gave us enough results, cache them and return
        if (results.length >= options.maxResults) {
          await cacheSearchResults(options, results, providerInfo.name);
          break;
        }
      } catch (err) {
        if (err instanceof SearchProviderError) {
          recordFailure(providerInfo.name, err.message);
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
      await cacheSearchResults(options, finalResults, primaryProvider);
    }

    return { results: finalResults, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
  }

  console.error(`[Search] ❌ Unknown provider: "${provider}". Valid options: auto, serpapi, google-cse, brave`);
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
