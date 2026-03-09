/**
 * SR Credibility Search — Query template substitution utility.
 *
 * Used by the SR evaluation route to build the initial credibility search query
 * from the UCM-configurable template (`srCredibilitySearchQueryTemplate`).
 *
 * @module sr-credibility-search
 */

/**
 * Default credibility search query template.
 * Uses `{domain}` as a placeholder for the source domain.
 */
export const DEFAULT_CREDIBILITY_SEARCH_TEMPLATE =
  "{domain} credibility reliability bias fact-check";

/**
 * Build a credibility search query by substituting `{domain}` in the template.
 *
 * @param template - UCM-configurable template string containing `{domain}` placeholder
 * @param domain - The source domain to substitute (e.g., "example.com")
 * @returns The fully resolved search query string
 *
 * @example
 * buildCredibilitySearchQuery("{domain} credibility reliability", "reuters.com")
 * // => "reuters.com credibility reliability"
 */
export function buildCredibilitySearchQuery(
  template: string,
  domain: string,
): string {
  if (!template || !template.trim()) {
    return `${domain} credibility reliability bias fact-check`;
  }
  // Replace all occurrences of {domain} (case-insensitive for robustness)
  return template.replace(/\{domain\}/gi, domain);
}
