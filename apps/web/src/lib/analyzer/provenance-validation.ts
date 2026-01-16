/**
 * FactHarbor Analyzer - Provenance Validation (PR 5: Phase 0 Ground Realism)
 *
 * Enforces the "Ground Realism" gate: Facts used for verdicts must come from
 * fetched sources (real URLs/documents) with proper provenance metadata.
 *
 * Non-negotiable rule: Do NOT treat LLM-synthesized text as evidence.
 *
 * @module analyzer/provenance-validation
 */

import type { ExtractedFact, FetchedSource } from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Minimum length for a valid sourceExcerpt (must be substantive, not empty/trivial)
 */
const MIN_SOURCE_EXCERPT_LENGTH = 20;

/**
 * Patterns that indicate synthetic/LLM-generated content (not real source excerpts)
 * Note: "According to X" where X is a specific source is valid, but "According to the analysis" is synthetic
 */
const SYNTHETIC_CONTENT_PATTERNS = [
  /^Based on (the|my|our) (information|analysis|available data)/i,
  /^According to (the|my|our) (analysis|findings)/i,
  /^The source (indicates|shows|suggests)/i,
  /^This suggests that/i,
  /^It appears that/i,
  /^I (found|discovered|learned) that/i,
  /^Here('s| is) what (I|we) found/i,
  /^The (information|data) shows/i,
];

/**
 * URL patterns that are NOT valid sources (internal/synthetic)
 */
const INVALID_URL_PATTERNS = [
  /^(about|chrome|data|javascript):/i,
  /^#/,
  /^$/,
  /localhost/i,
  /127\.0\.0\.1/i,
  /\.internal$/i,
];

// ============================================================================
// PROVENANCE VALIDATION
// ============================================================================

export interface ProvenanceValidationResult {
  /** Whether the fact has valid provenance */
  isValid: boolean;
  /** Reason for rejection if invalid */
  failureReason?: string;
  /** Severity of the issue (error = cannot use, warning = can use but flagged) */
  severity: "error" | "warning" | "ok";
}

/**
 * Validate that a fact has proper provenance (real source URL + excerpt).
 *
 * Pass criteria:
 * - sourceUrl must be present and point to a real, fetchable URL
 * - sourceExcerpt must be present and substantive (not just LLM synthesis)
 * - sourceExcerpt must not match synthetic content patterns
 *
 * This function enforces the "Ground Realism" gate from the handover document.
 */
export function validateFactProvenance(fact: ExtractedFact): ProvenanceValidationResult {
  // 1. Check sourceUrl is present
  if (!fact.sourceUrl || typeof fact.sourceUrl !== "string") {
    return {
      isValid: false,
      failureReason: "Missing sourceUrl",
      severity: "error",
    };
  }

  const url = fact.sourceUrl.trim();

  // 2. Check sourceUrl is not empty
  if (url.length === 0) {
    return {
      isValid: false,
      failureReason: "Missing sourceUrl",
      severity: "error",
    };
  }

  // 3. Check sourceUrl looks like a real URL (before pattern checks)
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      return {
        isValid: false,
        failureReason: `Non-HTTP(S) URL: ${url}`,
        severity: "error",
      };
    }
  } catch (e) {
    return {
      isValid: false,
      failureReason: `Malformed URL: ${url}`,
      severity: "error",
    };
  }

  // 4. Check sourceUrl is not a synthetic/internal URL (after URL parsing)
  for (const pattern of INVALID_URL_PATTERNS) {
    if (pattern.test(url)) {
      return {
        isValid: false,
        failureReason: `Invalid URL pattern: ${url}`,
        severity: "error",
      };
    }
  }

  // 5. Check sourceExcerpt is present
  if (!fact.sourceExcerpt || typeof fact.sourceExcerpt !== "string") {
    return {
      isValid: false,
      failureReason: "Missing sourceExcerpt",
      severity: "error",
    };
  }

  const excerpt = fact.sourceExcerpt.trim();

  // 6. Check sourceExcerpt is substantive
  if (excerpt.length < MIN_SOURCE_EXCERPT_LENGTH) {
    return {
      isValid: false,
      failureReason: `sourceExcerpt too short (${excerpt.length} chars, need >=${MIN_SOURCE_EXCERPT_LENGTH})`,
      severity: "error",
    };
  }

  // 7. Check sourceExcerpt is not synthetic LLM text
  for (const pattern of SYNTHETIC_CONTENT_PATTERNS) {
    if (pattern.test(excerpt)) {
      return {
        isValid: false,
        failureReason: "sourceExcerpt appears to be LLM-generated synthesis, not a real source quote",
        severity: "error",
      };
    }
  }

  // All checks passed
  return {
    isValid: true,
    severity: "ok",
  };
}

/**
 * Filter facts to only include those with valid provenance.
 *
 * This is the enforcement point for the "Ground Realism" gate:
 * facts without real sources cannot enter the verdict pipeline.
 */
export function filterFactsByProvenance(
  facts: ExtractedFact[]
): {
  validFacts: ExtractedFact[];
  invalidFacts: Array<ExtractedFact & { provenanceValidation: ProvenanceValidationResult }>;
  stats: { total: number; valid: number; invalid: number };
} {
  const validFacts: ExtractedFact[] = [];
  const invalidFacts: Array<ExtractedFact & { provenanceValidation: ProvenanceValidationResult }> = [];

  for (const fact of facts) {
    const validation = validateFactProvenance(fact);

    if (validation.isValid) {
      validFacts.push(fact);
    } else {
      invalidFacts.push({
        ...fact,
        provenanceValidation: validation,
      });
      console.warn(
        `[Provenance] Rejected fact ${fact.id}: ${validation.failureReason}`,
        {
          factPreview: fact.fact.substring(0, 80),
          sourceUrl: fact.sourceUrl,
          excerptLength: fact.sourceExcerpt?.length || 0,
        }
      );
    }
  }

  const stats = {
    total: facts.length,
    valid: validFacts.length,
    invalid: invalidFacts.length,
  };

  console.log(
    `[Provenance] Validation: ${stats.valid}/${stats.total} facts have valid provenance, ${stats.invalid} rejected`
  );

  return { validFacts, invalidFacts, stats };
}

// ============================================================================
// SOURCE PROVENANCE VALIDATION
// ============================================================================

export interface SourceProvenanceResult {
  /** Whether the source has valid provenance metadata */
  hasProvenance: boolean;
  /** Whether grounding metadata was present */
  hasGroundingMetadata: boolean;
  /** Reason if provenance is missing/invalid */
  failureReason?: string;
}

/**
 * Validate that a fetched source has proper provenance.
 *
 * For grounded search sources, verify that grounding metadata was actually present.
 * If grounding metadata is missing, the source should be flagged for fallback
 * to external search.
 */
export function validateSourceProvenance(source: FetchedSource): SourceProvenanceResult {
  // Check if this is a grounded search source
  const isGroundedSearch = source.category === "grounded_search";

  // For grounded search, verify URL is present and real
  if (isGroundedSearch) {
    if (!source.url || source.url.trim().length === 0) {
      return {
        hasProvenance: false,
        hasGroundingMetadata: false,
        failureReason: "Grounded search source missing URL (no grounding metadata)",
      };
    }

    // Check if URL looks synthetic
    for (const pattern of INVALID_URL_PATTERNS) {
      if (pattern.test(source.url)) {
        return {
          hasProvenance: false,
          hasGroundingMetadata: false,
          failureReason: `Grounded search source has invalid URL: ${source.url}`,
        };
      }
    }

    // Check if fullText is just LLM synthesis (not actual source content)
    if (source.fullText && source.fullText.length > 0) {
      for (const pattern of SYNTHETIC_CONTENT_PATTERNS) {
        if (pattern.test(source.fullText)) {
          return {
            hasProvenance: false,
            hasGroundingMetadata: false,
            failureReason: "Grounded search source fullText appears to be LLM synthesis",
          };
        }
      }
    }

    // Grounded search source passed validation
    return {
      hasProvenance: true,
      hasGroundingMetadata: true,
    };
  }

  // For non-grounded sources, just verify URL is present
  if (!source.url || source.url.trim().length === 0) {
    return {
      hasProvenance: false,
      hasGroundingMetadata: false,
      failureReason: "Source missing URL",
    };
  }

  return {
    hasProvenance: true,
    hasGroundingMetadata: false, // Not a grounded search source
  };
}

/**
 * Check if grounded search sources have real provenance metadata.
 *
 * Returns true if all grounded search sources have valid URLs and content.
 * If any grounded source lacks provenance, returns false (should fallback to external search).
 */
export function validateGroundedSearchProvenance(sources: FetchedSource[]): {
  isValid: boolean;
  groundedSources: number;
  validGroundedSources: number;
  invalidGroundedSources: number;
  shouldFallbackToExternalSearch: boolean;
} {
  const groundedSources = sources.filter((s) => s.category === "grounded_search");
  const validGroundedSources: FetchedSource[] = [];
  const invalidGroundedSources: FetchedSource[] = [];

  for (const source of groundedSources) {
    const validation = validateSourceProvenance(source);
    if (validation.hasProvenance && validation.hasGroundingMetadata) {
      validGroundedSources.push(source);
    } else {
      invalidGroundedSources.push(source);
      console.warn(
        `[Provenance] Invalid grounded source ${source.id}: ${validation.failureReason}`
      );
    }
  }

  const isValid = invalidGroundedSources.length === 0 && groundedSources.length > 0;
  const shouldFallbackToExternalSearch = groundedSources.length > 0 && !isValid;

  if (shouldFallbackToExternalSearch) {
    console.warn(
      `[Provenance] Grounded search sources lack valid provenance (${invalidGroundedSources.length}/${groundedSources.length} invalid). Fallback to external search required.`
    );
  }

  return {
    isValid,
    groundedSources: groundedSources.length,
    validGroundedSources: validGroundedSources.length,
    invalidGroundedSources: invalidGroundedSources.length,
    shouldFallbackToExternalSearch,
  };
}
