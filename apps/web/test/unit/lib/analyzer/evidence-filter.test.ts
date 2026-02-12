/**
 * Evidence Filter module tests — Structural Safety Net
 *
 * Tests the structural evidence quality filter.
 * Semantic quality checks (vague phrases, attribution, citations, temporal
 * anchors, near-duplicate detection) are handled by the LLM evidence quality
 * service (assessEvidenceQuality) and are NOT tested here.
 *
 * Tests cover:
 * - Source authority filtering (metadata field check)
 * - ProbativeValue filtering (LLM-assigned field check)
 * - Statement length filtering (character count)
 * - Source linkage requirements (excerpt presence/length, URL presence)
 * - Statistics number requirement (digit presence)
 * - Edge cases (empty arrays, all filtered, none filtered)
 * - False positive rate calculation
 */

import { describe, it, expect } from 'vitest';
import {
  filterByProbativeValue,
  calculateFalsePositiveRate,
  DEFAULT_FILTER_CONFIG,
  type ProbativeFilterConfig,
} from '@/lib/analyzer/evidence-filter';
import type { EvidenceItem } from '@/lib/analyzer/types';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Create a minimal valid evidence item for testing
 */
function createEvidenceItem(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: 'E1',
    statement: 'This is a valid evidence statement with sufficient length.',
    category: 'direct_evidence',
    specificity: 'high',
    sourceId: 'S1',
    sourceUrl: 'https://example.com/source',
    sourceTitle: 'Example Source',
    sourceExcerpt: 'This is a source excerpt with sufficient length to meet requirements.',
    claimDirection: 'supports',
    probativeValue: 'high',
    ...overrides,
  };
}

// ============================================================================
// STATEMENT QUALITY TESTS
// ============================================================================

describe('filterByProbativeValue', () => {
  describe('statement quality filtering', () => {
    describe('sourceAuthority filtering', () => {
      it('should filter opinion sources regardless of probativeValue', () => {
        const evidence = [
          createEvidenceItem({ sourceAuthority: 'opinion', probativeValue: 'high' }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(0);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.opinion_source).toBe(1);
      });
    });

    describe('minimum statement length', () => {
      it('should filter statements below minimum length (20 chars)', () => {
        const evidence = [
          createEvidenceItem({ statement: 'Too short' }), // 9 chars
          createEvidenceItem({ statement: 'This is a valid statement with enough length.' }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.statement_too_short).toBe(1);
      });

      it('should keep statements at exactly minimum length', () => {
        const evidence = [
          createEvidenceItem({ statement: '12345678901234567890' }), // Exactly 20 chars
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should allow custom minimum length via config', () => {
        const evidence = [
          createEvidenceItem({ statement: 'This is 35 characters long text.' }), // 34 chars
        ];

        const config: Partial<ProbativeFilterConfig> = {
          minStatementLength: 40,
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(0);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.statement_too_short).toBe(1);
      });
    });

    describe('probativeValue filtering', () => {
      it('should filter low probativeValue evidence', () => {
        const evidence = [
          createEvidenceItem({ probativeValue: 'low' }),
          createEvidenceItem({ probativeValue: 'high' }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.low_probative_value).toBe(1);
      });
    });
  });

  // ============================================================================
  // SOURCE LINKAGE TESTS
  // ============================================================================

  describe('source linkage requirements', () => {
    describe('source excerpt requirement', () => {
      it('should filter evidence without source excerpt when required', () => {
        const evidence = [
          createEvidenceItem({ sourceExcerpt: undefined }),
          createEvidenceItem({ sourceExcerpt: 'Valid excerpt with sufficient length for testing requirements.' }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.missing_or_short_excerpt).toBe(1);
      });

      it('should filter evidence with excerpt below minimum length (30 chars)', () => {
        const evidence = [
          createEvidenceItem({ sourceExcerpt: 'Too short excerpt' }), // 17 chars
          createEvidenceItem({ sourceExcerpt: 'This is a valid excerpt with enough length.' }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.missing_or_short_excerpt).toBe(1);
      });

      it('should keep evidence when excerpt requirement is disabled', () => {
        const evidence = [
          createEvidenceItem({ sourceExcerpt: undefined }),
        ];

        const config: Partial<ProbativeFilterConfig> = {
          requireSourceExcerpt: false,
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should allow custom minimum excerpt length', () => {
        const evidence = [
          createEvidenceItem({ sourceExcerpt: 'This is a 50 character source excerpt for testing' }), // 50 chars
        ];

        const config: Partial<ProbativeFilterConfig> = {
          minExcerptLength: 60,
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.missing_or_short_excerpt).toBe(1);
      });
    });

    describe('source URL requirement', () => {
      it('should filter evidence without source URL when required', () => {
        const evidence = [
          createEvidenceItem({ sourceUrl: undefined }),
          createEvidenceItem({ sourceUrl: 'https://example.com' }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.missing_source_url).toBe(1);
      });

      it('should keep evidence when URL requirement is disabled', () => {
        const evidence = [
          createEvidenceItem({ sourceUrl: undefined }),
        ];

        const config: Partial<ProbativeFilterConfig> = {
          requireSourceUrl: false,
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // CATEGORY-SPECIFIC RULES TESTS (structural only)
  // ============================================================================

  describe('category-specific rules', () => {
    describe('statistic category (structural: digit presence)', () => {
      it('should filter statistics without numbers', () => {
        const evidence = [
          createEvidenceItem({
            category: 'statistic',
            statement: 'Statistics show general trends without specific numbers.',
            sourceExcerpt: 'The report discusses general trends in the market.',
          }),
          createEvidenceItem({
            category: 'statistic',
            statement: 'The study found 75% of participants agreed with the statement.',
            sourceExcerpt: 'Survey results: 75% agreement, 15% disagreement, 10% neutral.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.statistic_without_number).toBe(1);
      });

      it('should keep statistics with numbers in statement', () => {
        const evidence = [
          createEvidenceItem({
            category: 'statistic',
            statement: 'According to data, 42% of respondents supported the measure.',
            sourceExcerpt: 'The comprehensive survey methodology involved random sampling from a representative population across multiple demographics.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should keep statistics with numbers in excerpt', () => {
        const evidence = [
          createEvidenceItem({
            category: 'statistic',
            statement: 'The survey revealed significant public support for the policy.',
            sourceExcerpt: 'Polling data shows 68% approval rating among registered voters.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should filter statistics with excerpt below category minimum length (50 chars)', () => {
        const evidence = [
          createEvidenceItem({
            category: 'statistic',
            statement: 'The data shows 50% increase in five years.',
            sourceExcerpt: 'Source report with 2023 data numbers', // 37 chars, below 50
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.statistic_excerpt_too_short).toBe(1);
      });

      it('should allow disabling number requirement for statistics', () => {
        const evidence = [
          createEvidenceItem({
            category: 'statistic',
            statement: 'Statistics indicate general growth patterns over time.',
            sourceExcerpt: 'The economic report describes general growth patterns over decades.',
          }),
        ];

        const config: Partial<ProbativeFilterConfig> = {
          categoryRules: {
            ...DEFAULT_FILTER_CONFIG.categoryRules,
            statistic: { requireNumber: false, minExcerptLength: 50 },
          },
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });
    });

    // NOTE: expert_quote attribution, event temporal anchors, and legal_provision
    // citation checks are now handled by the LLM evidence quality service
    // (assessEvidenceQuality). These categories pass through the structural filter
    // as long as they meet length/URL/excerpt requirements.

    it('should pass non-statistic categories through structural filter', () => {
      const evidence = [
        createEvidenceItem({
          category: 'expert_quote',
          statement: 'The analysis reveals significant methodological concerns in the study.',
          sourceExcerpt: 'Expert commentary on the study methodology and findings.',
        }),
        createEvidenceItem({
          category: 'event',
          statement: 'The conference took place with significant international attendance.',
          sourceExcerpt: 'Participants discussed various topics during the event.',
        }),
        createEvidenceItem({
          category: 'legal_provision',
          statement: 'The law prohibits discrimination in employment practices.',
          sourceExcerpt: 'Anti-discrimination measures are established by statute.',
        }),
      ];

      const result = filterByProbativeValue(evidence);

      // All pass structural checks (sufficient length, URL, excerpt)
      expect(result.kept).toHaveLength(3);
      expect(result.filtered).toHaveLength(0);
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty input array', () => {
      const evidence: EvidenceItem[] = [];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(0);
      expect(result.filtered).toHaveLength(0);
      expect(result.stats.total).toBe(0);
      expect(result.stats.kept).toBe(0);
      expect(result.stats.filtered).toBe(0);
    });

    it('should handle all items filtered scenario', () => {
      const evidence = [
        createEvidenceItem({ statement: 'Short' }),
        createEvidenceItem({ statement: 'Tiny' }),
        createEvidenceItem({ statement: 'Small' }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(0);
      expect(result.filtered).toHaveLength(3);
      expect(result.stats.filtered).toBe(3);
    });

    it('should handle none filtered scenario', () => {
      const evidence = [
        createEvidenceItem(),
        createEvidenceItem({ id: 'E2', statement: 'Another valid evidence statement.' }),
        createEvidenceItem({ id: 'E3', statement: 'Third valid evidence statement here.' }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(3);
      expect(result.filtered).toHaveLength(0);
      expect(result.stats.filtered).toBe(0);
    });

    it('should handle mixed categories correctly', () => {
      const evidence = [
        createEvidenceItem({
          category: 'direct_evidence',
          statement: 'General evidence statement with sufficient length.',
        }),
        createEvidenceItem({
          category: 'statistic',
          statement: 'Statistical data shows 42% increase over three years.',
          sourceExcerpt: 'The comprehensive analysis included data from multiple sources over time.',
        }),
        createEvidenceItem({
          category: 'expert_quote',
          statement: 'Dr. Smith explained the methodology was scientifically rigorous.',
        }),
        createEvidenceItem({
          category: 'event',
          statement: 'The conference occurred in May 2023 with international participation.',
        }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(4);
      expect(result.filtered).toHaveLength(0);
    });

    it('should accumulate filter reasons correctly', () => {
      const evidence = [
        createEvidenceItem({ statement: 'Short' }), // Too short
        createEvidenceItem({ statement: 'Tiny' }), // Too short
        createEvidenceItem({ sourceUrl: undefined }), // Missing URL
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.stats.filterReasons.statement_too_short).toBe(2);
      expect(result.stats.filterReasons.missing_source_url).toBe(1);
      expect(result.stats.total).toBe(3);
      expect(result.stats.filtered).toBe(3);
    });

    it('should handle evidence with missing optional fields gracefully', () => {
      const evidence = [
        createEvidenceItem({
          sourceExcerpt: undefined,
          sourceUrl: undefined,
          probativeValue: undefined,
        }),
      ];

      // Disable requirements to test handling
      const config: Partial<ProbativeFilterConfig> = {
        requireSourceExcerpt: false,
        requireSourceUrl: false,
      };

      const result = filterByProbativeValue(evidence, config);

      expect(result.kept).toHaveLength(1);
      expect(result.filtered).toHaveLength(0);
    });
  });

  // ============================================================================
  // FILTER STATISTICS TESTS
  // ============================================================================

  describe('filter statistics', () => {
    it('should return accurate statistics', () => {
      const evidence = [
        createEvidenceItem({
          id: 'E1',
          statement: 'First distinct statement about climate change research findings.',
        }),
        createEvidenceItem({
          id: 'E2',
          statement: 'Second distinct statement about economic policy implementation.',
        }),
        createEvidenceItem({ id: 'E3', statement: 'Short' }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.stats.total).toBe(3);
      expect(result.stats.kept).toBe(2);
      expect(result.stats.filtered).toBe(1);
    });

    it('should track multiple filter reasons', () => {
      const evidence = [
        createEvidenceItem({ statement: 'Short' }),
        createEvidenceItem({ sourceUrl: undefined }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(Object.keys(result.stats.filterReasons)).toContain('statement_too_short');
      expect(Object.keys(result.stats.filterReasons)).toContain('missing_source_url');
    });
  });
});

// ============================================================================
// FALSE POSITIVE RATE TESTS
// ============================================================================

describe('calculateFalsePositiveRate', () => {
  it('should return 0 for empty filtered array', () => {
    const filtered: EvidenceItem[] = [];

    const rate = calculateFalsePositiveRate(filtered);

    expect(rate).toBe(0);
  });

  it('should return 0 when no high probativeValue items were filtered', () => {
    const filtered = [
      createEvidenceItem({ probativeValue: 'medium' }),
      createEvidenceItem({ probativeValue: 'low' }),
      createEvidenceItem({ probativeValue: undefined }),
    ];

    const rate = calculateFalsePositiveRate(filtered);

    expect(rate).toBe(0);
  });

  it('should return 1.0 when all filtered items had high probativeValue', () => {
    const filtered = [
      createEvidenceItem({ probativeValue: 'high' }),
      createEvidenceItem({ probativeValue: 'high' }),
      createEvidenceItem({ probativeValue: 'high' }),
    ];

    const rate = calculateFalsePositiveRate(filtered);

    expect(rate).toBe(1.0);
  });

  it('should calculate correct rate for mixed probativeValue', () => {
    const filtered = [
      createEvidenceItem({ probativeValue: 'high' }),
      createEvidenceItem({ probativeValue: 'high' }),
      createEvidenceItem({ probativeValue: 'medium' }),
      createEvidenceItem({ probativeValue: 'low' }),
    ];

    const rate = calculateFalsePositiveRate(filtered);

    expect(rate).toBe(0.5); // 2 high out of 4 total = 0.5
  });

  it('should handle undefined probativeValue as not high', () => {
    const filtered = [
      createEvidenceItem({ probativeValue: 'high' }),
      createEvidenceItem({ probativeValue: undefined }),
      createEvidenceItem({ probativeValue: undefined }),
    ];

    const rate = calculateFalsePositiveRate(filtered);

    expect(rate).toBeCloseTo(0.333, 2); // 1 high out of 3 total ≈ 0.333
  });
});
