/**
 * Evidence Normalization Module
 *
 * Handles normalization of evidence IDs, classification enums, and raw LLM output.
 * Ensures consistent data format across the pipeline.
 *
 * @module analyzer/evidence-normalization
 */

import type { FallbackTracker } from "./classification-fallbacks";

/**
 * Raw evidence item shape from LLM extraction
 */
export type RawEvidenceItem = {
  statement?: string;
  category?: string;
  specificity?: "high" | "medium" | "low";
  sourceExcerpt?: string;
  contextId?: string;
  isContestedClaim?: boolean;
  claimSource?: string;
  claimDirection?: "supports" | "contradicts" | "neutral";
  sourceAuthority?: "primary" | "secondary" | "opinion" | "contested";
  evidenceBasis?: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific";
  probativeValue?: "high" | "medium" | "low";
  evidenceScope?: any;
};

/**
 * Evidence Normalizer class
 *
 * Provides methods for:
 * - ID normalization (legacy F-prefix → E-prefix migration)
 * - Classification enum validation and fallbacks
 * - Raw LLM output normalization
 */
export class EvidenceNormalizer {
  constructor(private fallbackTracker: FallbackTracker) {}

  /**
   * Normalize evidence ID: migrate legacy F-prefix to E-prefix
   * @param id - Evidence ID to normalize
   * @param source - Source location for logging
   */
  normalizeId(id: string, source: string): string {
    if (!id || typeof id !== "string") return "";
    const normalized = id.replace(/(^|-)F(\d+)/g, "$1E$2");
    if (normalized !== id) {
      console.warn(`[${source}] Legacy F-prefix evidence ID "${id}" detected; use "${normalized}"`);
    }
    return normalized;
  }

  /**
   * Normalize a list of evidence IDs, filtering out empty results
   * @param ids - Array of evidence IDs
   * @param source - Source location for logging
   */
  normalizeIdList(ids: string[], source: string): string[] {
    return ids
      .map((id) => this.normalizeId(String(id ?? ""), source))
      .filter((id) => id.length > 0);
  }

  /**
   * Normalize raw evidence items from LLM extraction
   * Ensures all required fields have safe defaults
   * @param raw - Raw LLM output
   * @param source - Source location for logging
   */
  normalizeItems(raw: any, source: string): RawEvidenceItem[] {
    const rawItems = Array.isArray(raw?.evidenceItems) ? raw.evidenceItems : [];

    if (!Array.isArray(rawItems)) return [];

    const normalized = rawItems.map((item: any) => ({
      statement: item.statement ?? "",
      category: item.category ?? "evidence",
      specificity: item.specificity ?? "medium",
      sourceExcerpt: item.sourceExcerpt ?? "",
      contextId: item.contextId ?? "",
      isContestedClaim: item.isContestedClaim ?? false,
      claimSource: item.claimSource ?? "",
      claimDirection: item.claimDirection ?? "neutral",
      sourceAuthority: item.sourceAuthority,
      evidenceBasis: item.evidenceBasis,
      probativeValue: item.probativeValue,
      evidenceScope: item.evidenceScope,
    }));

    return normalized;
  }

  /**
   * Normalize evidence classification enums
   * Validates sourceAuthority and evidenceBasis, applies safe defaults if invalid
   * Records fallbacks for telemetry
   *
   * @param evidence - Array of evidence items to normalize
   * @param locationPrefix - Prefix for logging location (e.g., "Evidence", "Claim")
   */
  normalizeClassifications<T extends {
    statement?: string;
    sourceAuthority?: string;
    evidenceBasis?: string;
  }>(
    evidence: T[],
    locationPrefix: string = "Evidence"
  ): T[] {
    return evidence.map((ev, index) => {
      const validSourceAuth = ["primary", "secondary", "opinion", "contested"];
      const validEvidenceBasis = ["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"];

      let sourceAuthority = ev.sourceAuthority;
      let evidenceBasis = ev.evidenceBasis;
      const text = ev.statement || "";

      // Normalize sourceAuthority
      if (!sourceAuthority || !validSourceAuth.includes(sourceAuthority)) {
        const reason = !sourceAuthority ? 'missing' : 'invalid';
        sourceAuthority = "secondary"; // Safe default

        this.fallbackTracker.recordFallback({
          field: 'sourceAuthority',
          location: `${locationPrefix} #${index + 1}`,
          text: text.substring(0, 100),
          defaultUsed: sourceAuthority,
          reason
        });

        console.warn(`[Fallback] sourceAuthority: ${locationPrefix} #${index + 1} - using default "secondary" (reason: ${reason})`);
      }

      // Normalize evidenceBasis
      if (!evidenceBasis || !validEvidenceBasis.includes(evidenceBasis)) {
        const reason = !evidenceBasis ? 'missing' : 'invalid';
        evidenceBasis = "anecdotal"; // Safe default

        this.fallbackTracker.recordFallback({
          field: 'evidenceBasis',
          location: `${locationPrefix} #${index + 1}`,
          text: text.substring(0, 100),
          defaultUsed: evidenceBasis,
          reason
        });

        console.warn(`[Fallback] evidenceBasis: ${locationPrefix} #${index + 1} - using default "anecdotal" (reason: ${reason})`);
      }

      return {
        ...ev,
        sourceAuthority: sourceAuthority as "primary" | "secondary" | "opinion" | "contested",
        evidenceBasis: evidenceBasis as "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific"
      };
    });
  }
}
