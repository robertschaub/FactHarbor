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
import { recordSearchQuery } from "./analyzer/metrics-integration";

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
  /** BCP-47 language code to bias search results (e.g., "de", "en", "fr"). Detected from claim input. */
  language?: string;
  /** ISO 3166-1 alpha-2 country code to bias search results (e.g., "CH", "US"). Inferred from claim content. */
  geography?: string;
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

const SEARCH_PROVIDER_NAMES = {
  serpapi: "SerpAPI",
  "google-cse": "Google-CSE",
  brave: "Brave",
  serper: "Serper",
  wikipedia: "Wikipedia",
  "semantic-scholar": "Semantic-Scholar",
  "google-factcheck": "Google-FactCheck",
} as const;

type SearchProviderKey = keyof typeof SEARCH_PROVIDER_NAMES;
type SearchProviderName = (typeof SEARCH_PROVIDER_NAMES)[SearchProviderKey];
type SearchProviderExecutor = (options: WebSearchOptions) => Promise<WebSearchResult[]>;

type SearchProviderDefinition = {
  key: SearchProviderKey;
  name: SearchProviderName;
  explicitLabel: string;
  execute: SearchProviderExecutor;
};

type AutoProviderCandidate = {
  providerKey: SearchProviderKey;
  isEnabled: (config: SearchConfig) => boolean;
  getPriority: (config: SearchConfig) => number;
  hasCredentials: () => boolean;
};

const SEARCH_PROVIDER_DEFINITIONS: Record<SearchProviderKey, SearchProviderDefinition> = {
  serpapi: {
    key: "serpapi",
    name: SEARCH_PROVIDER_NAMES.serpapi,
    explicitLabel: "SerpAPI",
    execute: async (options) => {
      const { searchSerpApi } = await import("./search-serpapi");
      return searchSerpApi(options);
    },
  },
  "google-cse": {
    key: "google-cse",
    name: SEARCH_PROVIDER_NAMES["google-cse"],
    explicitLabel: "Google CSE",
    execute: async (options) => {
      const { searchGoogleCse } = await import("./search-google-cse");
      return searchGoogleCse(options);
    },
  },
  brave: {
    key: "brave",
    name: SEARCH_PROVIDER_NAMES.brave,
    explicitLabel: "Brave",
    execute: async (options) => {
      const { searchBrave } = await import("./search-brave");
      return searchBrave(options);
    },
  },
  serper: {
    key: "serper",
    name: SEARCH_PROVIDER_NAMES.serper,
    explicitLabel: "Serper",
    execute: async (options) => {
      const { searchSerper } = await import("./search-serper");
      return searchSerper(options);
    },
  },
  wikipedia: {
    key: "wikipedia",
    name: SEARCH_PROVIDER_NAMES.wikipedia,
    explicitLabel: "Wikipedia",
    execute: async (options) => {
      const { searchWikipedia } = await import("./search-wikipedia");
      return searchWikipedia(options);
    },
  },
  "semantic-scholar": {
    key: "semantic-scholar",
    name: SEARCH_PROVIDER_NAMES["semantic-scholar"],
    explicitLabel: "Semantic Scholar",
    execute: async (options) => {
      const { searchSemanticScholar } = await import("./search-semanticscholar");
      return searchSemanticScholar(options);
    },
  },
  "google-factcheck": {
    key: "google-factcheck",
    name: SEARCH_PROVIDER_NAMES["google-factcheck"],
    explicitLabel: "Google Fact Check",
    execute: async (options) => {
      const { searchGoogleFactCheck } = await import("./search-factcheck-api");
      return searchGoogleFactCheck(options);
    },
  },
};

const AUTO_PROVIDER_CANDIDATES: AutoProviderCandidate[] = [
  {
    providerKey: "google-cse",
    isEnabled: (config) => config.providers?.googleCse?.enabled ?? true,
    getPriority: (config) => config.providers?.googleCse?.priority ?? 1,
    hasCredentials: () => !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID),
  },
  {
    providerKey: "serpapi",
    isEnabled: (config) => config.providers?.serpapi?.enabled ?? true,
    getPriority: (config) => config.providers?.serpapi?.priority ?? 2,
    hasCredentials: () => !!process.env.SERPAPI_API_KEY,
  },
  {
    providerKey: "serper",
    isEnabled: (config) => config.providers?.serper?.enabled ?? false,
    getPriority: (config) => config.providers?.serper?.priority ?? 2,
    hasCredentials: () => !!process.env.SERPER_API_KEY,
  },
  {
    providerKey: "brave",
    isEnabled: (config) => config.providers?.brave?.enabled ?? true,
    getPriority: (config) => config.providers?.brave?.priority ?? 2,
    hasCredentials: () => !!process.env.BRAVE_API_KEY,
  },
  {
    providerKey: "wikipedia",
    isEnabled: (config) => !!config.providers?.wikipedia?.enabled,
    getPriority: (config) => config.providers?.wikipedia?.priority ?? 3,
    hasCredentials: () => true, // No API key required
  },
  {
    providerKey: "semantic-scholar",
    isEnabled: (config) => !!config.providers?.semanticScholar?.enabled,
    getPriority: (config) => config.providers?.semanticScholar?.priority ?? 3,
    hasCredentials: () => true, // Works without API key
  },
  {
    providerKey: "google-factcheck",
    isEnabled: (config) => !!config.providers?.googleFactCheck?.enabled,
    getPriority: (config) => config.providers?.googleFactCheck?.priority ?? 4,
    hasCredentials: () => !!process.env.GOOGLE_FACTCHECK_API_KEY,
  },
];

function isSearchProviderKey(value: string): value is SearchProviderKey {
  return value in SEARCH_PROVIDER_DEFINITIONS;
}

/**
 * Get the actual search provider(s) that will be used
 */
export function getActiveSearchProviders(config?: SearchConfig): string[] {
  const c = config ?? DEFAULT_SEARCH_CONFIG;
  const provider = c.provider.toLowerCase();
  if (isSearchProviderKey(provider)) {
    return [SEARCH_PROVIDER_DEFINITIONS[provider].name];
  }
  if (provider === "auto") {
    const providers = AUTO_PROVIDER_CANDIDATES
      .filter((candidate) => candidate.hasCredentials() && candidate.isEnabled(c))
      .map((candidate) => SEARCH_PROVIDER_DEFINITIONS[candidate.providerKey].name);
    return providers.length > 0 ? providers : ["None"];
  }
  return ["Unknown"];
}

export async function searchWebWithProvider(options: WebSearchOptions): Promise<WebSearchResponse> {
  const config = options.config ?? DEFAULT_SEARCH_CONFIG;
  const primaryProviderKey = config.provider.toLowerCase();
  const results: WebSearchResult[] = [];
  const providersUsed: string[] = [];
  const errors: SearchProviderErrorInfo[] = [];
  const startTime = Date.now();

  // Extract configs for threading (no global mutation)
  const cacheConfig = config.cache ? { enabled: config.cache.enabled, ttlDays: config.cache.ttlDays } : undefined;
  const cbConfig = config.circuitBreaker;

  console.log(`[Search] Primary Provider: ${primaryProviderKey} | Query: "${options.query.substring(0, 60)}..." | Max results: ${options.maxResults}`);

  // 1. Check cache first (if enabled)
  const cached = await getCachedSearchResults(options, cacheConfig);
  if (cached) {
    console.log(`[Search] 🎯 Cache HIT - returning ${cached.results.length} cached results from ${cached.provider}`);
    
    // Record cached search
    recordSearchQuery({
      query: options.query,
      provider: cached.provider,
      resultsCount: cached.results.length,
      durationMs: Date.now() - startTime,
      cached: true,
      success: true,
      timestamp: new Date(),
    });

    return {
      results: cached.results,
      providersUsed: [`${cached.provider} (cached)`],
    };
  }
  console.log(`[Search] Cache MISS - proceeding with provider search`);

  // 2. Execute Primary Search
  // ... (existing search logic) ...
  // (Adding recording at the end of the function)
  const response = await (async () => {
    if (isSearchProviderKey(primaryProviderKey) && !isSupplementaryProvider(primaryProviderKey)) {
      const primaryResponse = await runExplicitProviderSearch({
        provider: SEARCH_PROVIDER_DEFINITIONS[primaryProviderKey],
        options,
        providersUsed: [], // Collect separately to avoid duplicates
        errors,
        cacheConfig,
        cbConfig,
      });
      results.push(...primaryResponse.results);
      providersUsed.push(...primaryResponse.providersUsed);
    } else if (primaryProviderKey === "auto") {
      console.log("[Search] Using AUTO mode for primary providers...");
      
      // Filter to only primary providers for the auto-loop
      const primaryCandidates = buildAutoProviderInfos(config, cbConfig)
        .filter(p => !isSupplementaryProvider(p.provider.key));

      // Sort by priority
      primaryCandidates.sort((a, b) => a.priority - b.priority || a.provider.name.localeCompare(b.provider.name));

      for (const providerInfo of primaryCandidates) {
        if (results.length >= options.maxResults) break;
        if (!providerInfo.available) {
          providersUsed.push(`${providerInfo.provider.name} (circuit-open)`);
          continue;
        }

        const remaining = options.maxResults - results.length;
        console.log(`[Search] Trying primary ${providerInfo.provider.name} (need ${remaining} results)...`);
        providersUsed.push(providerInfo.provider.name);

        try {
          const providerResults = await providerInfo.provider.execute({ ...options, maxResults: remaining });
          results.push(...providerResults);
          // 0 results is a valid response (not a failure); reset consecutive failures
          recordSuccess(providerInfo.provider.name, cbConfig);
          if (results.length >= options.maxResults) break;
        } catch (err) {
          if (err instanceof SearchProviderError) {
            recordFailure(providerInfo.provider.name, err.message, cbConfig);
            errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
          } else throw err;
        }
      }
    }

    // 3. Execute Supplementary Providers (Always run if enabled, regardless of primary results)
    const supplementaryKeys: SearchProviderKey[] = ["wikipedia", "semantic-scholar", "google-factcheck"];
    for (const suppKey of supplementaryKeys) {
      const def = SEARCH_PROVIDER_DEFINITIONS[suppKey];
      const cand = AUTO_PROVIDER_CANDIDATES.find(c => c.providerKey === suppKey);
      
      if (cand && cand.isEnabled(config) && cand.hasCredentials()) {
        if (!isProviderAvailable(def.name, cbConfig)) {
          providersUsed.push(`${def.name} (circuit-open)`);
          continue;
        }

        console.log(`[Search] Executing supplementary provider: ${def.explicitLabel}`);
        providersUsed.push(def.name);
        try {
          // Supplementary providers get a smaller, fixed quota to avoid overwhelming the result set
          // but ensure they always contribute if enabled.
          const suppResults = await def.execute({ ...options, maxResults: 3 }); 
          results.push(...suppResults);
          recordSuccess(def.name, cbConfig);
        } catch (err) {
          if (err instanceof SearchProviderError) {
            recordFailure(def.name, err.message, cbConfig);
            errors.push({ provider: err.provider, status: err.status, message: err.message, fatal: err.fatal });
          } else {
            console.error(`[Search] Supplementary provider ${def.name} failed:`, err);
          }
        }
      }
    }

    if (providersUsed.length === 0) {
      console.error("[Search] ❌ No search providers executed! Check configuration and API keys.");
      providersUsed.push("None");
    }

    // Apply domain filters and cache final results
    const finalResults = await applyDomainFilters(Promise.resolve(results), options);
    console.log(`[Search] Final results after domain filtering: ${finalResults.length}`);

    if (finalResults.length > 0 && providersUsed.some(p => !p.includes("circuit-open"))) {
      const primaryProvider = providersUsed.find((p) => !p.includes("circuit-open")) || providersUsed[0];
      await cacheSearchResults(options, finalResults, primaryProvider, cacheConfig);
    }

    // Record Search Query Metric
    recordSearchQuery({
      query: options.query,
      provider: primaryProviderKey === "auto" ? "auto" : (providersUsed[0] || primaryProviderKey),
      resultsCount: finalResults.length,
      durationMs: Date.now() - startTime,
      cached: false,
      success: true, // Successfully executed the search pipeline
      timestamp: new Date(),
    });

    return { results: finalResults, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
  })();

  return response;
}

/**
 * Helper to identify supplementary providers
 */
function isSupplementaryProvider(key: string): boolean {
  return ["wikipedia", "semantic-scholar", "google-factcheck"].includes(key);
}

type SearchCacheSettings = {
  enabled: boolean;
  ttlDays: number;
} | undefined;

type AutoProviderInfo = {
  provider: SearchProviderDefinition;
  priority: number;
  available: boolean;
};

async function runExplicitProviderSearch(params: {
  provider: SearchProviderDefinition;
  options: WebSearchOptions;
  providersUsed: string[];
  errors: SearchProviderErrorInfo[];
  cacheConfig: SearchCacheSettings;
  cbConfig: SearchConfig["circuitBreaker"] | undefined;
}): Promise<WebSearchResponse> {
  const { provider, options, providersUsed, errors, cacheConfig, cbConfig } = params;
  console.log(`[Search] Using ${provider.explicitLabel} (explicit)`);

  if (!isProviderAvailable(provider.name, cbConfig)) {
    errors.push({ provider: provider.name, message: "Circuit breaker OPEN", fatal: true });
    return { results: [], providersUsed: [`${provider.name} (circuit-open)`], errors };
  }

  providersUsed.push(provider.name);
  try {
    const results = await applyDomainFilters(provider.execute(options), options);
    console.log(`[Search] Final results from ${provider.explicitLabel}: ${results.length}`);

    // Valid response (even with 0 results) counts as success for circuit breaker health
    recordSuccess(provider.name, cbConfig);
    
    await cacheSearchResults(options, results, provider.name, cacheConfig);

    return { results, providersUsed, ...(errors.length > 0 ? { errors } : {}) };
  } catch (err) {
    if (err instanceof SearchProviderError) {
      recordFailure(provider.name, err.message, cbConfig);
      errors.push({
        provider: err.provider,
        status: err.status,
        message: err.message,
        fatal: err.fatal,
      });
      return { results: [], providersUsed, errors };
    }
    throw err;
  }
}

function buildAutoProviderInfos(
  config: SearchConfig,
  cbConfig: SearchConfig["circuitBreaker"] | undefined,
): AutoProviderInfo[] {
  return AUTO_PROVIDER_CANDIDATES
    .filter((candidate) => candidate.hasCredentials() && candidate.isEnabled(config))
    .map((candidate) => {
      const provider = SEARCH_PROVIDER_DEFINITIONS[candidate.providerKey];
      return {
        provider,
        priority: candidate.getPriority(config),
        available: isProviderAvailable(provider.name, cbConfig),
      };
    });
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
