/**
 * FactChecker Service
 * 
 * Provides fact-checker information by language and country.
 * Currently uses static configuration; designed to be replaced with
 * a web-based service that fetches fact-checkers dynamically.
 * 
 * Future service endpoint: GET /api/fact-checkers?language={lang}&country={country}
 */

import regionalFactCheckersConfig from "@/config/regional-fact-checkers.json";

// ============================================================================
// TYPES
// ============================================================================

export interface FactChecker {
  /** Fact-checker name */
  name: string;
  /** Website URL */
  url: string;
  /** Domain for site: searches */
  domain: string;
  /** Reliability score (0.0-1.0, null if unknown) */
  reliability: number | null;
  /** Brief description */
  description: string | null;
  /** IFCN signatory status */
  ifcnSignatory: boolean;
  /** Languages covered */
  languages: string[];
  /** Countries covered (ISO 3166-1 alpha-2) */
  countries: string[];
}

export interface FactCheckerQuery {
  /** Language (e.g., "German", "French") */
  language?: string;
  /** Country code (ISO 3166-1 alpha-2, e.g., "DE", "FR") */
  country?: string;
  /** Include IFCN signatories only */
  ifcnOnly?: boolean;
  /** Minimum reliability score */
  minReliability?: number;
}

export interface FactCheckerResponse {
  /** List of matching fact-checkers */
  factCheckers: FactChecker[];
  /** Source of data (static_config | web_service) */
  source: "static_config" | "web_service";
  /** Cache timestamp (ISO 8601) */
  cachedAt: string | null;
  /** Query that was executed */
  query: FactCheckerQuery;
}

export interface RegionalFactCheckerConfig {
  sites: string[];
  keywords: string[];
}

// ============================================================================
// STATIC CONFIGURATION (Current Implementation)
// ============================================================================

// Parse the static config file
const staticConfig = (regionalFactCheckersConfig as {
  version: string;
  lastUpdated: string;
  global: RegionalFactCheckerConfig;
  languages: Record<string, RegionalFactCheckerConfig>;
});

/**
 * Get all fact-checker domains (global + all regional).
 * Used for relevance filtering in source reliability evaluation.
 */
export function getAllFactCheckerDomains(): Set<string> {
  const domains = new Set<string>();
  
  // Add global fact-checker domains
  if (staticConfig.global?.sites) {
    for (const site of staticConfig.global.sites) {
      const domain = site.split("/")[0];
      domains.add(domain);
    }
  }
  
  // Add all regional fact-checker domains
  for (const langConfig of Object.values(staticConfig.languages)) {
    for (const site of langConfig.sites) {
      const domain = site.split("/")[0];
      domains.add(domain);
    }
  }
  
  return domains;
}

/**
 * Get global fact-checker sites (not language-specific).
 */
export function getGlobalFactCheckerSites(): string[] {
  return staticConfig.global?.sites || [];
}

/**
 * Get global fact-checker keywords.
 */
export function getGlobalFactCheckerKeywords(): string[] {
  return staticConfig.global?.keywords || [];
}

/**
 * Country to languages mapping from config.
 * Supports multi-language countries (e.g., CH -> [German, French, Italian]).
 * 
 * NOTE: This is used for FactChecker service queries (e.g., "fact-checkers for country X"),
 * NOT for source reliability language detection. SR uses actual site content detection
 * via detectSourceLanguage() in route.ts.
 */
const COUNTRY_TO_LANGUAGES: Record<string, string[]> = 
  (staticConfig as { countryMappings?: Record<string, string[]> }).countryMappings || {};

/**
 * Build language to countries mapping (inverse of countryMappings).
 */
function buildLanguageToCountries(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const [country, languages] of Object.entries(COUNTRY_TO_LANGUAGES)) {
    for (const lang of languages) {
      if (!result[lang]) {
        result[lang] = [];
      }
      if (!result[lang].includes(country)) {
        result[lang].push(country);
      }
    }
  }
  
  return result;
}

const LANGUAGE_TO_COUNTRIES = buildLanguageToCountries();

/**
 * Get all languages for a country (supports multi-language countries).
 */
export function getLanguagesForCountry(countryCode: string): string[] {
  return COUNTRY_TO_LANGUAGES[countryCode.toUpperCase()] || [];
}

/**
 * Get primary language for a country (first in the list).
 */
export function getPrimaryLanguageForCountry(countryCode: string): string | null {
  const languages = getLanguagesForCountry(countryCode);
  return languages.length > 0 ? languages[0] : null;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Get fact-checkers for a given language/country.
 * 
 * Current: Uses static configuration
 * Future: Will call web service endpoint
 */
export async function getFactCheckers(query: FactCheckerQuery): Promise<FactCheckerResponse> {
  // TODO: Replace with web service call when available
  // const response = await fetch(`/api/fact-checkers?language=${query.language}&country=${query.country}`);
  // return response.json();

  return getFactCheckersFromStaticConfig(query);
}

/**
 * Get fact-checkers from static configuration.
 * This is the current implementation; will be replaced by web service.
 */
function getFactCheckersFromStaticConfig(query: FactCheckerQuery): FactCheckerResponse {
  const factCheckers: FactChecker[] = [];
  
  // Determine which language(s) to search
  let targetLanguages: string[] = [];
  
  if (query.language) {
    targetLanguages.push(query.language);
  }
  
  if (query.country && COUNTRY_TO_LANGUAGES[query.country]) {
    const countryLangs = COUNTRY_TO_LANGUAGES[query.country];
    for (const lang of countryLangs) {
      if (!targetLanguages.includes(lang)) {
        targetLanguages.push(lang);
      }
    }
  }
  
  // If no specific filter, return all
  if (targetLanguages.length === 0) {
    targetLanguages = Object.keys(staticConfig.languages);
  }
  
  // Build fact-checker list from static config
  for (const lang of targetLanguages) {
    const config = staticConfig.languages[lang];
    if (!config) continue;
    
    const countries = LANGUAGE_TO_COUNTRIES[lang] || [];
    
    // Convert sites to fact-checkers
    for (const site of config.sites) {
      // Extract domain and name from site
      const domain = site.split("/")[0];
      const name = extractFactCheckerName(site, config.keywords);
      
      factCheckers.push({
        name,
        url: `https://${site}`,
        domain,
        reliability: null, // Unknown in static config
        description: null,
        ifcnSignatory: false, // Unknown in static config
        languages: [lang],
        countries,
      });
    }
  }
  
  // Apply filters
  let filtered = factCheckers;
  
  if (query.ifcnOnly) {
    filtered = filtered.filter(fc => fc.ifcnSignatory);
  }
  
  if (query.minReliability !== undefined) {
    filtered = filtered.filter(fc => 
      fc.reliability !== null && fc.reliability >= query.minReliability!
    );
  }
  
  return {
    factCheckers: filtered,
    source: "static_config",
    cachedAt: staticConfig.lastUpdated,
    query,
  };
}

/**
 * Extract a human-readable name from a fact-checker site URL.
 */
function extractFactCheckerName(site: string, keywords: string[]): string {
  const domain = site.split("/")[0];
  
  // Try to match a keyword that looks like a name
  for (const keyword of keywords) {
    // Skip generic terms
    if (keyword.length < 4) continue;
    if (/^[a-z]/.test(keyword)) continue; // Skip lowercase generic terms
    
    // Check if keyword appears in domain
    const keywordLower = keyword.toLowerCase().replace(/\s+/g, "");
    if (domain.includes(keywordLower)) {
      return keyword;
    }
  }
  
  // Fall back to domain name
  return domain
    .replace(/\.(org|com|net|info|de|fr|es|it|nl|pl|se|no|dk|fi|cz|hu|tr|jp|kr|tw)$/, "")
    .replace(/\./g, " ")
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ============================================================================
// SEARCH QUERY HELPERS
// ============================================================================

/**
 * Get search queries for regional fact-checkers.
 * Used by the source reliability evaluation.
 */
export function getRegionalFactCheckerQueries(
  brand: string,
  language: string | null
): string[] {
  if (!language || !staticConfig.languages[language]) {
    return [];
  }

  const config = staticConfig.languages[language];
  const queries: string[] = [];

  // Site-specific query (search fact-checker sites directly)
  // Keep full path (e.g., tagesschau.de/faktenfinder) to target specific sections
  if (config.sites.length > 0) {
    const siteQuery = config.sites.slice(0, 3).map(s => `site:${s}`).join(" OR ");
    queries.push(`"${brand}" ${siteQuery}`);
  }

  // Keyword query (search for fact-checker organization mentions)
  if (config.keywords.length > 0) {
    const keywordQuery = config.keywords.slice(0, 3).join(" OR ");
    queries.push(`"${brand}" ${keywordQuery}`);
  }

  return queries;
}

/**
 * Get all fact-checker keywords for a language.
 */
export function getFactCheckerKeywords(language: string): string[] {
  return staticConfig.languages[language]?.keywords || [];
}

/**
 * Get all fact-checker sites for a language.
 */
export function getFactCheckerSites(language: string): string[] {
  return staticConfig.languages[language]?.sites || [];
}

/**
 * Check if a language has regional fact-checker configuration.
 */
export function hasRegionalFactCheckers(language: string): boolean {
  return !!staticConfig.languages[language];
}

/**
 * Get the config version and last updated date.
 */
export function getFactCheckerConfigInfo(): { version: string; lastUpdated: string } {
  return {
    version: staticConfig.version,
    lastUpdated: staticConfig.lastUpdated,
  };
}
