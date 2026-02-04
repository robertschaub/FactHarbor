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

import type { EvidenceItem, FetchedSource } from "./types";
import { getEvidencePatterns } from "./lexicon-utils";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 */
let _patterns = getEvidencePatterns();

/**
 * Reset provenance patterns to defaults.
 */
export function setProvenanceLexicon(): void {
  _patterns = getEvidencePatterns();
}

/**
 * Get current patterns (for testing)
 */
export function getProvenancePatternsConfig() {
  return _patterns;
}

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
export function validateEvidenceProvenance(evidenceItem: EvidenceItem): ProvenanceValidationResult {
  // 1. Check sourceUrl is present
  if (!evidenceItem.sourceUrl || typeof evidenceItem.sourceUrl !== "string") {
    return {
      isValid: false,
      failureReason: "Missing sourceUrl",
      severity: "error",
    };
  }

  const url = evidenceItem.sourceUrl.trim();

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
  for (const pattern of _patterns.provenanceInvalidUrlPatterns) {
    if (pattern.test(url)) {
      return {
        isValid: false,
        failureReason: `Invalid URL pattern: ${url}`,
        severity: "error",
      };
    }
  }

  // 5. Check sourceExcerpt is present
  if (!evidenceItem.sourceExcerpt || typeof evidenceItem.sourceExcerpt !== "string") {
    return {
      isValid: false,
      failureReason: "Missing sourceExcerpt",
      severity: "error",
    };
  }

  const excerpt = evidenceItem.sourceExcerpt.trim();

  // 6. Check sourceExcerpt is substantive
  if (excerpt.length < _patterns.provenanceMinSourceExcerptLength) {
    return {
      isValid: false,
      failureReason: `sourceExcerpt too short (${excerpt.length} chars, need >=${_patterns.provenanceMinSourceExcerptLength})`,
      severity: "error",
    };
  }

  // 7. Check sourceExcerpt is not synthetic LLM text
  for (const pattern of _patterns.provenanceSyntheticContentPatterns) {
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
export function filterEvidenceByProvenance(
  evidenceItems: EvidenceItem[]
): {
  validEvidenceItems: EvidenceItem[];
  invalidEvidenceItems: Array<EvidenceItem & { provenanceValidation: ProvenanceValidationResult }>;
  stats: { total: number; valid: number; invalid: number };
} {
  const validEvidenceItems: EvidenceItem[] = [];
  const invalidEvidenceItems: Array<EvidenceItem & { provenanceValidation: ProvenanceValidationResult }> = [];

  for (const evidenceItem of evidenceItems) {
    const validation = validateEvidenceProvenance(evidenceItem);

    if (validation.isValid) {
      validEvidenceItems.push(evidenceItem);
    } else {
      invalidEvidenceItems.push({
        ...evidenceItem,
        provenanceValidation: validation,
      });
      console.warn(
        `[Provenance] Rejected evidence item ${evidenceItem.id}: ${validation.failureReason}`,
        {
          evidencePreview: evidenceItem.statement.substring(0, 80),
          sourceUrl: evidenceItem.sourceUrl,
          excerptLength: evidenceItem.sourceExcerpt?.length || 0,
        }
      );
    }
  }

  const stats = {
    total: evidenceItems.length,
    valid: validEvidenceItems.length,
    invalid: invalidEvidenceItems.length,
  };

  console.log(
    `[Provenance] Validation: ${stats.valid}/${stats.total} evidence items have valid provenance, ${stats.invalid} rejected`
  );

  return { validEvidenceItems, invalidEvidenceItems, stats };
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
    for (const pattern of _patterns.provenanceInvalidUrlPatterns) {
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
      for (const pattern of _patterns.provenanceSyntheticContentPatterns) {
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
