/**
 * Schema Backward Compatibility Test Suite
 *
 * Tests that schema changes maintain backward compatibility with:
 * - Stored job results (ExtractedFact → EvidenceItem migration)
 * - Stored CalcConfig profiles (new optional fields)
 *
 * @module analyzer/schema-backward-compatibility.test
 */

import { describe, expect, it } from "vitest";
import type { EvidenceItem, ExtractedFact } from "@/lib/analyzer/types";

// ============================================================================
// EVIDENCEITEM → EXTRACTEDFACT MIGRATION TESTS
// ============================================================================

describe("Schema Backward Compatibility", () => {
  describe("ExtractedFact → EvidenceItem migration", () => {
    it("EvidenceItem accepts all ExtractedFact fields", () => {
      // Simulate old job JSON with ExtractedFact fields
      const legacyEvidence: ExtractedFact = {
        id: "S1-F1",
        fact: "Test statement from legacy job",
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com/source",
        sourceTitle: "Example Source",
        sourceExcerpt: "This is an excerpt from the source document.",
        claimDirection: "supports",
      };

      // Should be assignable to EvidenceItem (type compatibility check)
      const evidence: EvidenceItem = legacyEvidence;

      expect(evidence.id).toBe("S1-F1");
      expect(evidence.fact).toBe("Test statement from legacy job");
      expect(evidence.category).toBe("evidence");
      expect(evidence.claimDirection).toBe("supports");
    });

    it("ExtractedFact type alias still works", () => {
      // Test that deprecated alias compiles and functions correctly
      const fact: ExtractedFact = {
        id: "F1",
        fact: "Using deprecated alias",
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Test",
        sourceExcerpt: "Test excerpt",
      };

      // Should be usable as EvidenceItem
      const processEvidence = (e: EvidenceItem) => e.fact;
      expect(processEvidence(fact)).toBe("Using deprecated alias");
    });

    it("Missing new fields have safe defaults", () => {
      // Old job JSON without new Phase 2 fields (probativeValue, sourceType)
      const legacyEvidence: EvidenceItem = {
        id: "S1-F1",
        fact: "Statement without new fields",
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Source",
        sourceExcerpt: "Excerpt",
        // probativeValue: missing (should be optional)
        // evidenceScope: missing (should be optional)
      };

      // Should not throw, new fields are optional
      expect(legacyEvidence.probativeValue).toBeUndefined();
      expect(legacyEvidence.evidenceScope).toBeUndefined();

      // Code should handle missing fields with fallback defaults
      const probativeValue = legacyEvidence.probativeValue ?? "medium";
      expect(probativeValue).toBe("medium");
    });

    it("EvidenceItem with new fields works correctly", () => {
      // New job JSON with Phase 2 fields
      const modernEvidence: EvidenceItem = {
        id: "S1-F1",
        fact: "Statement with new fields",
        category: "direct_evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Source",
        sourceExcerpt: "Excerpt",
        claimDirection: "supports",
        probativeValue: "high",
        evidenceScope: {
          name: "Global",
          sourceType: "peer_reviewed_study",
        },
      };

      expect(modernEvidence.probativeValue).toBe("high");
      expect(modernEvidence.evidenceScope?.sourceType).toBe("peer_reviewed_study");
    });

    it("statement field can coexist with legacy fact field", () => {
      // During Phase 2.1 gradual migration, both fields may exist
      const transitionalEvidence: EvidenceItem = {
        id: "S1-F1",
        fact: "Legacy field", // Still present for compatibility
        statement: "New preferred field", // New field added
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Source",
        sourceExcerpt: "Excerpt",
      };

      // Both fields accessible
      expect(transitionalEvidence.fact).toBe("Legacy field");
      expect(transitionalEvidence.statement).toBe("New preferred field");
    });
  });

  // ============================================================================
  // CALCCONFIG SCHEMA EVOLUTION TESTS
  // ============================================================================

  describe("CalcConfig schema evolution", () => {
    it("Old CalcConfig without new fields loads correctly", () => {
      // Simulate stored profile from before Phase 2
      const legacyConfig = {
        verdictBands: {
          true: [86, 100],
          mostlyTrue: [72, 85],
          leaningTrue: [58, 71],
          mixed: [43, 57],
          leaningFalse: [29, 42],
          mostlyFalse: [15, 28],
          false: [0, 14],
        },
        aggregation: {
          centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
          harmPotentialMultiplier: 1.5,
          contestationWeights: { established: 0.3, disputed: 0.5, opinion: 1.0 },
        },
        sourceReliability: {
          confidenceThreshold: 0.8,
          consensusThreshold: 0.2,
          defaultScore: 0.5,
        },
        qualityGates: {
          gate1OpinionThreshold: 0.7,
          gate1SpecificityThreshold: 0.3,
          gate1MinContentWords: 3,
          gate4MinSourcesHigh: 3,
          gate4MinSourcesMedium: 2,
          gate4QualityThresholdHigh: 0.7,
          gate4QualityThresholdMedium: 0.5,
          gate4AgreementThresholdHigh: 0.7,
          gate4AgreementThresholdMedium: 0.5,
        },
        contestationPenalties: { established: -12, disputed: -8 },
        deduplication: {
          evidenceScopeThreshold: 0.85,
          claimSimilarityThreshold: 0.85,
          contextMergeThreshold: 0.7,
        },
        mixedConfidenceThreshold: 60,
        // probativeValueWeights: MISSING
        // sourceTypeCalibration: MISSING
        // evidenceFilter: MISSING
      };

      // Should parse without error
      expect(legacyConfig.mixedConfidenceThreshold).toBe(60);
      expect(legacyConfig).not.toHaveProperty("probativeValueWeights");
      expect(legacyConfig).not.toHaveProperty("sourceTypeCalibration");
      expect(legacyConfig).not.toHaveProperty("evidenceFilter");

      // Code should handle missing fields with defaults
      const probativeValueWeights = (legacyConfig as any).probativeValueWeights ?? {
        high: 1.0,
        medium: 0.8,
        low: 0.5,
      };
      expect(probativeValueWeights.high).toBe(1.0);
    });

    it("Partial new fields merge with defaults", () => {
      // Stored profile with only some new fields populated
      const partialConfig = {
        mixedConfidenceThreshold: 60,
        probativeValueWeights: {
          high: 1.2, // Custom value
          medium: 0.9, // Custom value
          low: 0.5, // Default kept
        },
        // sourceTypeCalibration: MISSING (use defaults)
        // evidenceFilter: MISSING (use defaults)
      };

      // Merge with defaults
      const DEFAULT_SOURCE_TYPE_CALIBRATION = {
        peer_reviewed_study: 1.0,
        fact_check_report: 1.05,
        government_report: 1.0,
        legal_document: 1.0,
        news_primary: 1.0,
        news_secondary: 0.95,
        expert_statement: 0.9,
        organization_report: 0.95,
        other: 0.8,
      };

      const DEFAULT_EVIDENCE_FILTER = {
        minStatementLength: 20,
        maxVaguePhraseCount: 2,
        requireSourceExcerpt: true,
        minExcerptLength: 30,
        requireSourceUrl: true,
        deduplicationThreshold: 0.85,
      };

      const effectiveConfig = {
        ...partialConfig,
        sourceTypeCalibration:
          (partialConfig as any).sourceTypeCalibration ?? DEFAULT_SOURCE_TYPE_CALIBRATION,
        evidenceFilter: (partialConfig as any).evidenceFilter ?? DEFAULT_EVIDENCE_FILTER,
      };

      // Custom values preserved
      expect(effectiveConfig.probativeValueWeights.high).toBe(1.2);
      expect(effectiveConfig.probativeValueWeights.medium).toBe(0.9);

      // Defaults filled in
      expect(effectiveConfig.sourceTypeCalibration.peer_reviewed_study).toBe(1.0);
      expect(effectiveConfig.evidenceFilter.minStatementLength).toBe(20);
    });

    it("New CalcConfig with all fields works correctly", () => {
      // Modern profile with all Phase 2 fields
      const modernConfig = {
        mixedConfidenceThreshold: 60,
        probativeValueWeights: {
          high: 1.0,
          medium: 0.8,
          low: 0.5,
        },
        sourceTypeCalibration: {
          peer_reviewed_study: 1.0,
          fact_check_report: 1.05,
          government_report: 1.0,
          legal_document: 1.0,
          news_primary: 1.0,
          news_secondary: 0.95,
          expert_statement: 0.9,
          organization_report: 0.95,
          other: 0.8,
        },
        evidenceFilter: {
          minStatementLength: 20,
          maxVaguePhraseCount: 2,
          requireSourceExcerpt: true,
          minExcerptLength: 30,
          requireSourceUrl: true,
          deduplicationThreshold: 0.85,
        },
      };

      // All fields accessible
      expect(modernConfig.probativeValueWeights.high).toBe(1.0);
      expect(modernConfig.sourceTypeCalibration.fact_check_report).toBe(1.05);
      expect(modernConfig.evidenceFilter.minStatementLength).toBe(20);
    });

    it("CalcConfig partial updates preserve existing fields", () => {
      // Simulate user updating only one new field via admin UI
      const existingConfig = {
        mixedConfidenceThreshold: 60,
        probativeValueWeights: {
          high: 1.0,
          medium: 0.8,
          low: 0.5,
        },
      };

      // User updates sourceTypeCalibration
      const updatedConfig = {
        ...existingConfig,
        sourceTypeCalibration: {
          peer_reviewed_study: 1.0,
          fact_check_report: 1.1, // Changed from default 1.05
          government_report: 1.0,
          legal_document: 1.0,
          news_primary: 1.0,
          news_secondary: 0.95,
          expert_statement: 0.9,
          organization_report: 0.95,
          other: 0.8,
        },
      };

      // Existing fields preserved
      expect(updatedConfig.mixedConfidenceThreshold).toBe(60);
      expect(updatedConfig.probativeValueWeights.high).toBe(1.0);

      // New field added
      expect(updatedConfig.sourceTypeCalibration.fact_check_report).toBe(1.1);
    });
  });

  // ============================================================================
  // JSON PARSING COMPATIBILITY TESTS
  // ============================================================================

  describe("JSON parsing compatibility", () => {
    it("JSON.parse handles legacy job results", () => {
      // Simulate legacy job JSON from database
      const legacyJobJson = JSON.stringify({
        schemaVersion: "2.6.33",
        facts: [
          {
            id: "S1-F1",
            fact: "Legacy statement",
            category: "evidence",
            specificity: "high",
            sourceId: "S1",
            sourceUrl: "https://example.com",
          },
        ],
      });

      // Should parse without error
      const parsed = JSON.parse(legacyJobJson);
      expect(parsed.facts).toHaveLength(1);
      expect(parsed.facts[0].fact).toBe("Legacy statement");
      expect(parsed.facts[0].probativeValue).toBeUndefined(); // Optional field
    });

    it("JSON.parse handles modern job results", () => {
      // Simulate modern job JSON with Phase 2 fields
      const modernJobJson = JSON.stringify({
        schemaVersion: "2.6.41",
        facts: [
          {
            id: "S1-F1",
            fact: "Modern statement",
            category: "direct_evidence",
            specificity: "high",
            sourceId: "S1",
            sourceUrl: "https://example.com",
            probativeValue: "high",
            evidenceScope: {
              name: "Global",
              sourceType: "peer_reviewed_study",
            },
          },
        ],
      });

      // Should parse correctly
      const parsed = JSON.parse(modernJobJson);
      expect(parsed.facts[0].probativeValue).toBe("high");
      expect(parsed.facts[0].evidenceScope.sourceType).toBe("peer_reviewed_study");
    });

    it("JSON.stringify preserves all fields", () => {
      // Ensure no fields are dropped during serialization
      const evidence: EvidenceItem = {
        id: "S1-F1",
        fact: "Test",
        category: "evidence",
        specificity: "high",
        sourceId: "S1",
        sourceUrl: "https://example.com",
        sourceTitle: "Title",
        sourceExcerpt: "Excerpt",
        probativeValue: "high",
        evidenceScope: {
          name: "Scope",
          sourceType: "news_primary",
        },
      };

      const serialized = JSON.stringify(evidence);
      const deserialized = JSON.parse(serialized);

      // All fields preserved
      expect(deserialized.probativeValue).toBe("high");
      expect(deserialized.evidenceScope.sourceType).toBe("news_primary");
    });
  });
});
