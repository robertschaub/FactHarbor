/**
 * Evidence pack building for Source Reliability Evaluation.
 *
 * Handles brand variant generation, language detection, search term translation,
 * and adaptive evidence pack construction with multi-phase search queries.
 *
 * @module source-reliability/sr-eval-evidence-pack
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { debugLog } from "@/lib/analyzer/debug";
import { getActiveSearchProviders, searchWebWithProvider, type WebSearchResult } from "@/lib/web-search";
import { getGlobalFactCheckerSites, getRegionalFactCheckerQueries } from "@/lib/fact-checker-service";
import { ANTHROPIC_MODELS } from "@/lib/analyzer/model-tiering";
import { languageDetectionStatus } from "@/lib/source-reliability-eval-helpers";
import { withTimeout, type SrEvalConfig, type EvidencePack, type EvidencePackItem } from "./sr-eval-types";

// ============================================================================
// TIMEOUT CONSTANT
// ============================================================================

const SR_TRANSLATION_TIMEOUT_MS = 30_000;

// ============================================================================
// BRAND VARIANT GENERATION (for improved relevance matching)
// ============================================================================

/**
 * Generate brand variants for more flexible relevance matching.
 * Handles hyphen/space/concatenation variants and common suffixes.
 *
 * Examples:
 * - "my-brand" → ["my-brand", "my brand", "mybrand"]
 * - "dailynews" → ["dailynews", "daily news", "daily"]
 * - "medianet" → ["medianet", "media"]
 */
export function generateBrandVariants(brand: string): string[] {
  const variants = new Set<string>();
  const b = (brand ?? "").toLowerCase().trim();
  if (!b || b.length < 3) return [];

  variants.add(b);

  // Hyphen variants: split on hyphens
  if (b.includes("-")) {
    const parts = b.split("-").filter(Boolean);
    if (parts.length >= 2) {
      variants.add(parts.join(" ")); // "anti spiegel"
      variants.add(parts.join("")); // "antispiegel"
      // Add individual parts if long enough
      for (const p of parts) {
        if (p.length >= 4) variants.add(p);
      }
    }
  }

  // CamelCase-like detection: split before uppercase letters or at transitions
  // e.g., "DailyNews" → "Daily News" → "daily news"
  const camelSplit = b.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  if (camelSplit !== b && camelSplit.includes(" ")) {
    variants.add(camelSplit);
    variants.add(camelSplit.replace(/\s+/g, ""));
  }

  // Common suffix stripping: *news, *net, *media, *times, *post
  const suffixes = ["news", "net", "media", "times", "post", "daily", "tribune", "herald"];
  for (const suffix of suffixes) {
    if (b.endsWith(suffix) && b.length > suffix.length + 2) {
      const base = b.slice(0, -suffix.length);
      if (base.length >= 3) {
        variants.add(base);
        variants.add(`${base} ${suffix}`);
      }
    }
  }

  // Filter out too-short or stopword-like variants
  const stopwords = new Set(["the", "and", "for", "www", "com", "org", "net"]);
  return [...variants].filter((v) => v.length >= 3 && !stopwords.has(v));
}

export function deriveBrandToken(domain: string): string {
  const labels = String(domain || "")
    .toLowerCase()
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  if (labels.length === 0) return "";

  // Special case: known media abbreviations or short brands
  // e.g., srf.ch -> srf, bbc.co.uk -> bbc
  if (labels.length >= 2) {
    const first = labels[0];
    if (first.length >= 2 && first.length <= 4) {
      // Likely an abbreviation like SRF, BBC, NZZ, CNN
      return first;
    }
  }

  if (labels.length === 1) return labels[0];

  const registryLike = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);

  for (let i = labels.length - 2; i >= 0; i--) {
    const candidate = labels[i];
    if (registryLike.has(candidate)) continue;
    if (candidate === "www") continue;
    return candidate;
  }

  return labels[0];
}

export function isUsableBrandToken(token: string): boolean {
  const t = (token ?? "").trim().toLowerCase();
  if (t.length < 2) return false; // Allow 2-char tokens for brands like AP
  if (t === "www") return false;
  return true;
}

/**
 * Check if a search result is FROM the source being evaluated.
 * Results FROM the source are not useful for reliability assessment.
 */
export function isResultFromSourceDomain(r: WebSearchResult, domain: string): boolean {
  if (!r.url || !domain) return false;

  try {
    const resultHost = new URL(r.url).hostname.toLowerCase().replace(/^www\./, "");
    const d = domain.toLowerCase().replace(/^www\./, "");
    // Result is FROM the source if the URL is on the source's domain
    return resultHost === d || resultHost.endsWith(`.${d}`);
  } catch {
    return false;
  }
}

/**
 * Structural pre-filter: does a search result mention the source being evaluated?
 * Does NOT interpret text meaning — only checks for domain/brand name presence.
 * Relevance assessment (is this result ABOUT reliability?) is delegated to the
 * LLM evidence quality assessment call.
 */
export function resultMentionsSource(
  r: WebSearchResult,
  domain: string,
  brandVariants: string[],
): boolean {
  const url = (r.url ?? "").toLowerCase();
  const title = (r.title ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const blob = `${title} ${snippet} ${url}`;
  const blobNoSpaces = blob.replace(/\s+/g, "");
  const brandVariantsNoSpaces = brandVariants.map((v) => v.replace(/\s+/g, ""));

  const d = String(domain || "").toLowerCase();
  if (!d) return true;

  return blob.includes(d) ||
    blob.includes(`www.${d}`) ||
    brandVariants.some(v => v.length >= 3 && blob.includes(v)) ||
    brandVariantsNoSpaces.some(v => v.length >= 5 && blobNoSpaces.includes(v));
}

export function isSearchEnabledForSrEval(config: SrEvalConfig): { enabled: boolean; providersUsed: string[] } {
  const searchEnabled = config.searchConfig.enabled;
  if (!config.evalUseSearch || !searchEnabled) return { enabled: false, providersUsed: [] };

  const providersUsed = getActiveSearchProviders(config.searchConfig);
  const hasProvider = providersUsed.some((p) => p && p !== "None" && p !== "Unknown");
  return { enabled: hasProvider, providersUsed };
}

// ============================================================================
// MULTI-LANGUAGE SUPPORT
// ============================================================================

/**
 * Cache for detected languages per domain.
 */
const languageDetectionCache = new Map<string, string | null>();

/**
 * Supported languages for fact-checker searches.
 */
const SUPPORTED_LANGUAGES = new Set([
  "German", "French", "Spanish", "Portuguese", "Italian", "Dutch",
  "Polish", "Russian", "Swedish", "Norwegian", "Danish", "Finnish",
  "Czech", "Hungarian", "Turkish", "Japanese", "Chinese", "Korean", "Arabic"
]);

/**
 * Normalize language names from various formats to our standard names.
 */
export function normalizeLanguageName(lang: string): string | null {
  const normalized = lang.toLowerCase().trim();

  const mapping: Record<string, string> = {
    // ISO codes
    "de": "German", "deu": "German", "ger": "German",
    "fr": "French", "fra": "French", "fre": "French",
    "es": "Spanish", "spa": "Spanish",
    "pt": "Portuguese", "por": "Portuguese",
    "it": "Italian", "ita": "Italian",
    "nl": "Dutch", "nld": "Dutch", "dut": "Dutch",
    "pl": "Polish", "pol": "Polish",
    "ru": "Russian", "rus": "Russian",
    "sv": "Swedish", "swe": "Swedish",
    "no": "Norwegian", "nor": "Norwegian", "nb": "Norwegian", "nn": "Norwegian",
    "da": "Danish", "dan": "Danish",
    "fi": "Finnish", "fin": "Finnish",
    "cs": "Czech", "ces": "Czech", "cze": "Czech",
    "hu": "Hungarian", "hun": "Hungarian",
    "tr": "Turkish", "tur": "Turkish",
    "ja": "Japanese", "jpn": "Japanese",
    "zh": "Chinese", "zho": "Chinese", "chi": "Chinese",
    "ko": "Korean", "kor": "Korean",
    "ar": "Arabic", "ara": "Arabic",
    "en": "English", "eng": "English",
    // Full names (lowercase)
    "german": "German", "deutsch": "German",
    "french": "French", "français": "French", "francais": "French",
    "spanish": "Spanish", "español": "Spanish", "espanol": "Spanish",
    "portuguese": "Portuguese", "português": "Portuguese", "portugues": "Portuguese",
    "italian": "Italian", "italiano": "Italian",
    "dutch": "Dutch", "nederlands": "Dutch",
    "polish": "Polish", "polski": "Polish",
    "russian": "Russian", "русский": "Russian",
    "swedish": "Swedish", "svenska": "Swedish",
    "norwegian": "Norwegian", "norsk": "Norwegian",
    "danish": "Danish", "dansk": "Danish",
    "finnish": "Finnish", "suomi": "Finnish",
    "czech": "Czech", "čeština": "Czech", "cestina": "Czech",
    "hungarian": "Hungarian", "magyar": "Hungarian",
    "turkish": "Turkish", "türkçe": "Turkish", "turkce": "Turkish",
    "japanese": "Japanese", "日本語": "Japanese",
    "chinese": "Chinese", "中文": "Chinese",
    "korean": "Korean", "한국어": "Korean",
    "arabic": "Arabic", "العربية": "Arabic",
    "english": "English",
  };

  return mapping[normalized] || null;
}

/**
 * Detect the publication language of a source by fetching its homepage.
 * This is the PRIMARY language detection method for source reliability evaluation.
 *
 * Strategy (in order):
 * 1. <html lang="..."> attribute
 * 2. <meta http-equiv="content-language"> tag
 * 3. og:locale meta tag
 * 4. LLM-based text analysis (fallback)
 *
 * NOTE: This detects actual site content language, NOT country-based inference.
 * Returns null for English or if detection fails.
 */
export async function detectSourceLanguage(domain: string): Promise<string | null> {
  // Check cache first
  if (languageDetectionCache.has(domain)) {
    return languageDetectionCache.get(domain) ?? null;
  }

  debugLog(`[SR-Eval] Detecting language for ${domain}`, { domain });

  try {
    // Fetch homepage with timeout (increased from 5s to 10s for slower international sites)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`https://${domain}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FactHarbor/1.0; +https://factharbor.com)",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      debugLog(`[SR-Eval] Failed to fetch ${domain}: ${response.status}`, { domain, status: response.status });
      languageDetectionCache.set(domain, null);
      languageDetectionStatus.set(domain, "failed");
      return null;
    }

    const html = await response.text();

    // Check for redirect pages (common pattern: .com redirects to .com.br for Brazilian sites)
    const isRedirectPage = /<title[^>]*>Redirecting/i.test(html) ||
      (html.length < 2000 && /<script/i.test(html) && !/<article|<main|<p[^>]*>/i.test(html));

    if (isRedirectPage && domain.endsWith('.com') && !domain.includes('.com.')) {
      // Try alternate TLDs for common patterns
      const alternateDomains = [
        domain + '.br',  // .com → .com.br (Brazil)
        domain.replace(/\.com$/, '.com.ar'),  // Argentina
        domain.replace(/\.com$/, '.com.mx'),  // Mexico
      ];

      for (const altDomain of alternateDomains) {
        debugLog(`[SR-Eval] Redirect page detected, trying alternate TLD: ${altDomain}`, { domain, altDomain });
        try {
          const altController = new AbortController();
          const altTimeout = setTimeout(() => altController.abort(), 8000);
          const altResponse = await fetch(`https://${altDomain}`, {
            signal: altController.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; FactHarbor/1.0; +https://factharbor.com)",
              "Accept": "text/html",
              "Accept-Language": "en-US,en;q=0.9",
            },
          });
          clearTimeout(altTimeout);

          if (altResponse.ok) {
            const altHtml = await altResponse.text();
            // Check if alternate site has actual content (not another redirect)
            if (altHtml.length > 5000 || /<article|<main/i.test(altHtml)) {
              const altLangMatch = altHtml.match(/<html[^>]*?\s+lang=["']([^"']+)["']/i);
              if (altLangMatch) {
                const altLangCode = altLangMatch[1].split("-")[0];
                const altNormalized = normalizeLanguageName(altLangCode);
                if (altNormalized && altNormalized !== "English" && SUPPORTED_LANGUAGES.has(altNormalized)) {
                  debugLog(`[SR-Eval] Detected language via alternate TLD ${altDomain}: ${altNormalized}`, { domain, altDomain, altNormalized });
                  languageDetectionCache.set(domain, altNormalized);
                  languageDetectionStatus.set(domain, "ok");
                  return altNormalized;
                }
              }
            }
          }
        } catch {
          // Continue to next alternate
        }
      }
    }

    // Strategy 1: Check <html lang="..."> attribute
    // Use non-greedy match and allow optional whitespace before lang=
    const htmlLangMatch = html.match(/<html[^>]*?\s+lang=["']([^"']+)["']/i)
      || html.match(/<html\s+lang=["']([^"']+)["']/i);
    if (htmlLangMatch) {
      const langCode = htmlLangMatch[1].split("-")[0]; // "de-DE" -> "de"
      const normalized = normalizeLanguageName(langCode);
      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via html lang: ${normalized}`, { domain, langCode, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Strategy 2: Check <meta> content-language
    const metaLangMatch = html.match(/<meta[^>]*http-equiv=["']content-language["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*http-equiv=["']content-language["']/i);
    if (metaLangMatch) {
      const langCode = metaLangMatch[1].split("-")[0];
      const normalized = normalizeLanguageName(langCode);
      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via meta tag: ${normalized}`, { domain, langCode, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Strategy 3: Check og:locale meta tag (try both attribute orders)
    const ogLocaleMatch = html.match(/<meta[^>]*property=["']og:locale["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:locale["']/i);
    if (ogLocaleMatch) {
      const langCode = ogLocaleMatch[1].split("_")[0]; // "de_DE" -> "de"
      const normalized = normalizeLanguageName(langCode);
      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via og:locale: ${normalized}`, { domain, langCode, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Strategy 4: Use LLM to detect from content sample
    // Extract visible text (strip tags, take first ~500 chars)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);

    if (textContent.length > 100) {
      const { text } = await withTimeout(
        "SR language detection",
        SR_TRANSLATION_TIMEOUT_MS,
        () =>
          generateText({
            model: anthropic(ANTHROPIC_MODELS.budget.modelId),
            prompt: `What is the primary publication language of this webpage content?
Return ONLY the language name in English (e.g., "German", "French", "Russian", "English").
If uncertain, return "English".

Content sample:
${textContent}`,
            temperature: 0,
            maxOutputTokens: 50,
          }),
      );

      const detectedLang = text.trim();
      const normalized = normalizeLanguageName(detectedLang);

      if (normalized && normalized !== "English" && SUPPORTED_LANGUAGES.has(normalized)) {
        debugLog(`[SR-Eval] Detected language via LLM: ${normalized}`, { domain, detectedLang, normalized });
        languageDetectionCache.set(domain, normalized);
        languageDetectionStatus.set(domain, "ok");
        return normalized;
      }
    }

    // Default: English or unknown
    debugLog(`[SR-Eval] No non-English language detected for ${domain}`, { domain });
    languageDetectionCache.set(domain, null);
    languageDetectionStatus.set(domain, "ok");
    return null;

  } catch (err) {
    const errorMessage = String(err);
    const isTimeout = (err as { name?: string })?.name === "AbortError";
    debugLog(`[SR-Eval] Language detection failed for ${domain}`, { domain, error: errorMessage });
    languageDetectionCache.set(domain, null);
    languageDetectionStatus.set(domain, isTimeout ? "timeout" : "failed");
    return null;
  }
}

/**
 * Translation cache to avoid repeated LLM calls for the same language.
 */
const translationCache = new Map<string, Record<string, string>>();

/**
 * Key search terms that need translation for fact-checker searches.
 */
const SEARCH_TERMS_TO_TRANSLATE = [
  // Core fact-checking terms
  "fact check",
  "reliability",
  "misinformation",
  "disinformation",
  "propaganda",
  "fake news",
  "debunked",
  "false claims",
  "media bias",
  "credibility",
  // State/foreign influence
  "state propaganda",
  "foreign propaganda",
  "state media",
  "state-backed",
  "government propaganda",
    "government-backed",
    "state-sponsored",
    "influence operation",
    "information operation",
    "influence campaign",
    "coordinated inauthentic behavior",
    "conspiracy",
    "conspiracy theory",
    "hoax",
    "falsehood",
    "deceptive",
    "manipulation",
    "propaganda network",
    "disinformation network",
    "fringe",
    "extremist",
    "radical",
    "hate",
    "hate speech",
  // Bias/slant terms (symmetric - no political direction preference)
  "partisan",
  "left-wing",
  "far-left",
  "right-wing",
  "far-right",
  "controversial",
  "criticism",
  "unreliable",
  // Quality terms
  "journalistic standards",
  "inaccurate",
  "sensationalist",
  // Organization identity / accountability terms
  "news outlet",
  "news organization",
  "media outlet",
  "media company",
  "newspaper",
  "publisher",
  "ownership",
  "owner",
  "editor-in-chief",
  "editorial board",
  "editorial policy",
  "press council",
  "ombudsman",
  "code of ethics",
  "corrections policy",
  // Press council / ethics violation terms
  "ethics violation",
  "reprimand",
  "sanction",
  "condemned",
  "censured",
  "discrimination",
  "retraction",
  // Science/expert consensus terms
  "anti-science",
  "science denial",
  "denialism",
  // Institutional independence terms
  "independence",
  "politicization",
  "political pressure",
  "scientific integrity",
];

/**
 * Get translated search terms for a language, using LLM with caching.
 */
async function getTranslatedSearchTerms(
  language: string
): Promise<Record<string, string>> {
  // Check cache first
  const cached = translationCache.get(language);
  if (cached) return cached;

  debugLog(`[SR-Eval] Translating search terms to ${language}`, { language });

  try {
    const prompt = `Translate these English fact-checking search terms to ${language}.
Return ONLY a JSON object with English keys and ${language} translations as values.
Use the most common/natural terms that fact-checkers and media critics would use in ${language}.

Terms to translate:
${SEARCH_TERMS_TO_TRANSLATE.map((t) => `- "${t}"`).join("\n")}

Output format (JSON only, no markdown):
{"fact check": "...", "reliability": "...", ...}`;

    const { text } = await withTimeout(
      "SR translation",
      SR_TRANSLATION_TIMEOUT_MS,
      () =>
        generateText({
          model: anthropic(ANTHROPIC_MODELS.budget.modelId),
          prompt,
          temperature: 0,
          maxOutputTokens: 800,
        }),
    );

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[SR-Eval] Failed to parse translation response for ${language}`);
      return {};
    }

    const translations = JSON.parse(jsonMatch[0]) as Record<string, string>;

    // Cache the result
    translationCache.set(language, translations);

    debugLog(`[SR-Eval] Translated ${Object.keys(translations).length} terms to ${language}`, {
      language,
      translations,
    });

    return translations;
  } catch (err) {
    console.warn(`[SR-Eval] Translation failed for ${language}:`, err);
    return {};
  }
}

// ============================================================================
// ADAPTIVE EVIDENCE PACK BUILDING
// ============================================================================

/**
 * Build evidence pack with adaptive negative-signal queries.
 *
 * Strategy:
 * 1. Run initial queries (reliability, bias, standards)
 * 2. If results are sparse or lack strong signals, add negative-signal queries
 * 3. No domain/TLD hardcoding - applies equally to all domains
 */
export async function buildEvidencePack(domain: string, config: SrEvalConfig): Promise<EvidencePack> {
  const { enabled, providersUsed } = isSearchEnabledForSrEval(config);
  if (!enabled) return { enabled: false, providersUsed, queries: [], items: [] };

  const brand = deriveBrandToken(domain);
  const brandVariants = generateBrandVariants(brand);
  const brandPrefix = isUsableBrandToken(brand) ? `${brand} ` : "";
  const domainToken = `"${domain}"`;

  // Detect source language for multi-language queries
  const sourceLanguage = await detectSourceLanguage(domain);
  let translatedTerms: Record<string, string> = {};

  if (sourceLanguage) {
    debugLog(`[SR-Eval] Detected language for ${domain}: ${sourceLanguage}`, { domain, sourceLanguage });
    translatedTerms = await getTranslatedSearchTerms(sourceLanguage);
  }

  // Helper to get translated term or fallback to English
  const t = (term: string): string => translatedTerms[term] || term;

  // Phase 1: Reliability assessment queries - focused on ABOUT the source
  // Use "rating" and "assessment" to find fact-checker evaluations, not articles FROM the source
  const standardQueries = [
    `${domainToken} reliability rating assessment`,
    `${domainToken} media bias rating fact checker`,
    `"${brand}" credibility assessment fact check`,
  ];

  // Phase 1b: Standard queries in source language (if non-English)
  const standardQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        `${domainToken} ${t("reliability")} ${t("credibility")}`,
        `"${brand}" ${t("fact check")} ${t("media bias")}`,
      ]
    : [];

  // Phase 1c: Neutral/identity queries (to help entity detection)
  const neutralSignalQueries = isUsableBrandToken(brand) ? [
    `"${brand}" ${t("editorial standards")} OR ${t("corrections policy")}`,
    `"${brand}" ${t("editorial policy")} OR ${t("code of ethics")}`,
    `"${brand}" ${t("owner")} OR ${t("ownership")} OR ${t("publisher")}`,
    `"${brand}" ${t("news outlet")} OR ${t("news organization")} OR ${t("media company")}`,
    `"${brand}" ${t("newspaper")} OR ${t("media outlet")}`,
  ] : [];

  // Phase 2: Fact-checker site-specific queries
  // Directly search known fact-checker domains for assessments
  // Uses global fact-checker sites from config
  const globalSites = getGlobalFactCheckerSites();
  const factCheckerQueries: string[] = [];

  // Build queries in batches of 3 sites (to avoid overly long queries)
  for (let i = 0; i < globalSites.length; i += 3) {
    const batch = globalSites.slice(i, i + 3);
    const siteQuery = batch.map(s => `site:${s}`).join(" OR ");
    factCheckerQueries.push(`"${brand}" ${siteQuery}`);
  }

  // Phase 2b: Regional fact-checker queries (language-specific)
  // Comprehensive coverage for all supported languages
  const regionalFactCheckerQueries: string[] = getRegionalFactCheckerQueries(brand, sourceLanguage);

  // Phase 3: Press council / regulatory complaints queries
  // Critical for finding documented ethical/journalistic failures from official bodies
  const pressCouncilQueries = [
    `"${brand}" press council OR press complaints OR media regulator`,
    `"${brand}" ethics violation OR code violation OR journalistic standards`,
    `"${brand}" reprimand OR sanction OR condemned OR censured`,
    `"${brand}" discrimination complaint OR ethics complaint`,
    `"${brand}" retraction OR correction demanded`,
  ];

  // Phase 3b: Press council queries in source language
  const pressCouncilQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        `"${brand}" ${t("press council")} OR ${t("ethics violation")}`,
        `"${brand}" ${t("reprimand")} OR ${t("sanction")} OR ${t("condemned")}`,
        `"${brand}" ${t("discrimination")} OR ${t("retraction")}`,
      ]
    : [];

  // Phase 4: Merged negative signals — English
  // Combines state/foreign propaganda tracking + negative-signal queries.
  // Duplicates across the former Phase 4 and Phase 5 have been removed;
  // every query below is unique. Generic terms only per AGENTS.md.
  const negativeSignalQueries = [
    // State/foreign propaganda tracking
    `"${brand}" state propaganda OR foreign propaganda OR government propaganda`,
    `"${brand}" site:euvsdisinfo.eu OR site:disinfo.eu`,
    `"${brand}" "disinformation" "state media" OR "state-backed"`,
    `"${brand}" "propaganda outlet" OR "government-controlled media"`,
    `"${brand}" "state narrative" OR "government narrative"`,
    `"${brand}" "echo chamber" OR "amplifies" OR "amplifying"`,
    // Influence operations & coordinated inauthenticity (merged — was in both phases)
    `"${brand}" "influence operation" OR "information operation" OR "influence campaign"`,
    `"${brand}" "coordinated inauthentic behavior" OR "state-sponsored" OR astroturf`,
    // Conspiracy / disinformation networks / fringe (merged — was in both phases)
    `"${brand}" conspiracy OR "conspiracy theory" OR hoax`,
    `"${brand}" "disinformation network" OR "propaganda network"`,
    `"${brand}" fringe OR extremist OR radical OR "hate speech"`,
    // General negative signals
    `${domainToken} propaganda accusations disinformation`,
    `"${brand}" false claims debunked misinformation`,
    `"${brand}" fact check failed OR misleading`,
    `"${brand}" bias criticism controversial`,
    `"${brand}" partisan left-wing OR far-left OR right-wing OR far-right`,
    `"${brand}" unreliable OR inaccurate OR sensationalist`,
    // Wikipedia often has documented controversies
    `"${brand}" site:wikipedia.org controversy OR criticism`,
  ];

  // Phase 4b: Science/expert consensus denial queries (separate — distinct topic)
  const scienceDenialQueries = [
    `"${brand}" anti-science OR science denial OR pseudo-science`,
    `"${brand}" denialism OR rejects scientific consensus`,
    `"${brand}" promotes debunked claims OR spreads misinformation`,
  ];

  // Phase 4c: Merged negative signals in source language (if non-English)
  // Combines former state-propaganda translated + negative-signal translated.
  // Duplicates removed; every query is unique.
  const negativeSignalQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        // State/foreign propaganda (unique to former Phase 4c)
        `"${brand}" ${t("state propaganda")} OR ${t("foreign propaganda")}`,
        `"${brand}" ${t("state media")} ${t("disinformation")}`,
        `"${brand}" ${t("state-backed")} OR ${t("government propaganda")}`,
        // Influence operations & coordinated inauthenticity (merged — was in both)
        `"${brand}" ${t("influence operation")} OR ${t("information operation")} OR ${t("influence campaign")}`,
        `"${brand}" ${t("coordinated inauthentic behavior")} OR ${t("state-sponsored")}`,
        // Conspiracy / disinformation networks / fringe (merged — was in both)
        `"${brand}" ${t("conspiracy")} OR ${t("conspiracy theory")} OR ${t("hoax")}`,
        `"${brand}" ${t("disinformation network")} OR ${t("propaganda network")}`,
        `"${brand}" ${t("fringe")} OR ${t("extremist")} OR ${t("radical")}`,
        // General negative signals (unique to former Phase 5b)
        `${domainToken} ${t("propaganda")} ${t("disinformation")}`,
        `"${brand}" ${t("fake news")} ${t("debunked")} ${t("false claims")}`,
        `"${brand}" ${t("partisan")} ${t("controversial")}`,
        `"${brand}" ${t("criticism")} ${t("unreliable")}`,
      ]
    : [];

  // Institutional independence queries (HIGH PRIORITY - run early)
  // Critical for detecting recent politicization or compromised independence
  // Especially important for government/official sources
  const institutionalIndependenceQueries = [
    `"${brand}" independence politicization political pressure`,
    `"${brand}" scientific integrity compromised OR undermined`,
    `"${brand}" political interference OR political influence`,
    `"${brand}" staff exodus OR workforce cuts OR mass resignation`,
    `"${brand}" credibility crisis OR trust crisis`,
    `"${brand}" leadership change controversy OR new leadership concerns`,
  ];

  // Institutional independence queries (translated)
  const institutionalIndependenceQueriesTranslated: string[] = sourceLanguage && Object.keys(translatedTerms).length > 0
    ? [
        `"${brand}" ${t("independence")} ${t("politicization")}`,
        `"${brand}" ${t("political pressure")} ${t("scientific integrity")}`,
      ]
    : [];

  // Entity-focused queries (Organization/Brand only) - lower priority
  const entityQueries = isUsableBrandToken(brand) ? [
    `"${brand}" news outlet reliability assessment`,
    `"${brand}" media organization bias rating`,
    `"${brand}" ownership publisher editor-in-chief`,
  ] : [];

  const maxResultsPerQuery = Math.max(
    1,
    Math.min(config.evalMaxResultsPerQuery, 10)
  );
  const maxEvidenceItems = Math.max(
    1,
    Math.min(config.evalMaxEvidenceItems, 40)
  );
  const dateRestrict =
    (config.evalDateRestrict ?? config.searchConfig.dateRestrict) ?? undefined;

  const seen = new Set<string>();
  const rawItems: Array<{ r: WebSearchResult; query: string; provider: string }> = [];
  const allQueries: string[] = [];

  // Helper to run a query and collect results.
  // Structural pre-filters only: self-domain exclusion, source-mention check, dedup.
  // Relevance assessment (is this ABOUT reliability?) is delegated to the LLM
  // evidence quality assessment call downstream.
  async function runQuery(
    q: string,
    maxResultsOverride?: number,
  ): Promise<number> {
    allQueries.push(q);
    let added = 0;
    try {
      const resp = await searchWebWithProvider({
        query: q,
        maxResults: maxResultsOverride ?? maxResultsPerQuery,
        dateRestrict,
        domainWhitelist: config.searchConfig.domainWhitelist,
        domainBlacklist: config.searchConfig.domainBlacklist,
        timeoutMs: config.searchConfig.timeoutMs,
        config: config.searchConfig,
      });

      const provider = resp.providersUsed.join("+") || "unknown";
      for (const r of resp.results) {
        if (!r.url) continue;
        if (seen.has(r.url)) continue;
        if (isResultFromSourceDomain(r, domain)) continue;
        if (!resultMentionsSource(r, domain, brandVariants)) continue;
        seen.add(r.url);
        rawItems.push({ r, query: q, provider });
        added++;
        if (rawItems.length >= maxEvidenceItems) break;
      }
    } catch (err) {
      console.warn(`[SR-Eval] Search failed for query "${q}":`, err);
    }
    return added;
  }

  // Helper to run a batch of queries sequentially within a phase, respecting budget
  async function runPhase(
    queries: string[],
    budget: number,
    opts?: { maxResultsOverride?: number }
  ): Promise<void> {
    for (const q of queries) {
      if (rawItems.length >= budget) break;
      await runQuery(q, opts?.maxResultsOverride);
    }
  }

  // Phase budgets - preserve priority ordering from original sequential flow
  const phase1Budget = Math.floor(maxEvidenceItems * 0.5); // 50% for fact-checkers
  const phase2Budget = Math.floor(maxEvidenceItems * 0.75); // 75% cumulative
  const widerOpts = { maxResultsOverride: Math.min(maxResultsPerQuery + 2, 10) };

  // ── PHASE 1 (sequential): Fact-checkers FIRST ─────────────────────
  // Highest priority: fact-checker site-specific queries fill budget first.
  // Sequential to ensure fact-checker evidence gets priority slots.
  debugLog(`[SR-Eval] Phase 1: fact-checker queries for ${domain}`, { brand });
  await runPhase([...factCheckerQueries, ...regionalFactCheckerQueries], phase1Budget);

  // ── PHASE 2 (sequential): Standard reliability queries ─────────────
  debugLog(`[SR-Eval] Phase 2: standard reliability queries for ${domain} (${rawItems.length}/${maxEvidenceItems} items)`);
  await runPhase([...standardQueries, ...standardQueriesTranslated], phase2Budget);

  // ── WAVE 3 (parallel): Merged negative signals + deep signals ──────
  // Negative signals now include former propaganda queries (duplicates removed).
  // All run in parallel — independent and fill remaining budget.
  if (rawItems.length < maxEvidenceItems) {
    debugLog(`[SR-Eval] Wave 3: negative signals + deep signal queries for ${domain} (${rawItems.length}/${maxEvidenceItems} items)`);
    await Promise.all([
      // Merged negative signals (English + translated) — covers propaganda + negative signals
      runPhase(
        [...negativeSignalQueries, ...negativeSignalQueriesTranslated],
        maxEvidenceItems,
        widerOpts
      ),
      // Press council + ethics violations
      runPhase([...pressCouncilQueries, ...pressCouncilQueriesTranslated], maxEvidenceItems),
      // Institutional independence (critical for government sources)
      runPhase(
        [...institutionalIndependenceQueries, ...institutionalIndependenceQueriesTranslated],
        maxEvidenceItems,
        widerOpts
      ),
    ]);
  }

  // ── WAVE 4 (parallel, if budget remains): Science denial + Identity + Entity
  if (rawItems.length < maxEvidenceItems) {
    debugLog(`[SR-Eval] Wave 4: science denial + identity + entity for ${domain} (${rawItems.length}/${maxEvidenceItems} items)`);
    await Promise.all([
      // Science denial (separate topic, kept distinct)
      runPhase(scienceDenialQueries, maxEvidenceItems, widerOpts),
      // Neutral/identity queries (entity detection)
      runPhase(neutralSignalQueries, maxEvidenceItems),
      // Entity-focused queries (lowest priority)
      runPhase(entityQueries, maxEvidenceItems),
    ]);
  }

  const items: EvidencePackItem[] = rawItems.slice(0, maxEvidenceItems).map((it, idx) => ({
    id: `E${idx + 1}`,
    url: it.r.url,
    title: it.r.title,
    snippet: it.r.snippet ?? null,
    query: it.query,
    provider: it.provider,
  }));

  return { enabled: true, providersUsed, queries: allQueries, items };
}
