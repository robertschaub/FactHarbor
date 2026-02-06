/**
 * Evidence Filter module tests - v2.8 (Phase 1.5 Layer 2)
 *
 * Tests the deterministic evidence quality filter including:
 * - Statement quality filtering (length, vague phrases)
 * - Source linkage requirements (excerpt, URL)
 * - Category-specific rules (statistic, expert_quote, event, legal_provision)
 * - Deduplication (similarity-based)
 * - False positive rate calculation
 * - Edge cases (empty arrays, all filtered, none filtered)
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

    describe('vague phrase detection', () => {
      it('should filter statements with excessive vague phrases (>2)', () => {
        const evidence = [
          createEvidenceItem({
            statement: 'Some say that many people believe it is said that this is true.',
          }), // Contains 3 vague phrases
          createEvidenceItem({
            statement: 'According to a study, the results show clear evidence.',
          }), // No vague phrases
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.excessive_vague_phrases).toBe(1);
      });

      it('should keep statements with acceptable vague phrase count (≤2)', () => {
        const evidence = [
          createEvidenceItem({
            statement: 'Some experts argue that the policy was effective based on data.',
          }), // 1 vague phrase
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should detect "some say" pattern', () => {
        const evidence = [
          createEvidenceItem({
            statement: 'Some say this is true. Many people believe it. It is said that opinions vary on this matter.',
          }), // 3 different vague phrase patterns
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.excessive_vague_phrases).toBe(1);
      });

      it('should detect "many people/experts" pattern', () => {
        const evidence = [
          createEvidenceItem({
            statement: 'Many people claim X. It is believed Y. The debate continues on this topic.',
          }), // 3 different vague phrase patterns
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.filtered).toHaveLength(1);
      });

      it('should detect passive voice vague patterns', () => {
        const evidence = [
          createEvidenceItem({
            statement: 'It is said that something happened. Allegedly it occurred. Opinions vary on what really took place.',
          }), // 3 different vague phrase patterns
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.filtered).toHaveLength(1);
      });

      it('should allow custom maximum vague phrase count', () => {
        const evidence = [
          createEvidenceItem({
            statement: 'Some say that many people believe this is true.',
          }), // 2 vague phrases
        ];

        const config: Partial<ProbativeFilterConfig> = {
          maxVaguePhraseCount: 1,
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.excessive_vague_phrases).toBe(1);
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
  // CATEGORY-SPECIFIC RULES TESTS
  // ============================================================================

  describe('category-specific rules', () => {
    describe('statistic category', () => {
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

    describe('expert_quote category', () => {
      it('should filter expert quotes without attribution', () => {
        const evidence = [
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'This policy is fundamentally flawed and will not achieve its goals.',
            sourceExcerpt: 'Critics have raised concerns about the effectiveness of the approach.',
          }),
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'Dr. Johnson stated that the methodology was rigorous and scientifically sound.',
            sourceExcerpt: 'Professor Smith commented on the study design and execution.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.expert_quote_without_attribution).toBe(1);
      });

      it('should keep expert quotes with clear attribution in statement', () => {
        const evidence = [
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'Prof. Martinez explained that the research supports the hypothesis.',
            sourceExcerpt: 'The interview covered multiple aspects of the study.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should keep expert quotes with attribution in excerpt', () => {
        const evidence = [
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'The evidence strongly suggests a causal relationship.',
            sourceExcerpt: 'Dr. Williams said the evidence strongly suggests a causal relationship.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should detect various attribution patterns', () => {
        const evidence = [
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'According to Anderson, the theory holds in most cases.',
          }),
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'Johnson Smith argued that the approach was innovative.',
          }),
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'Ms. Davis claimed the results were statistically significant.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(3);
        expect(result.filtered).toHaveLength(0);
      });

      it('should allow disabling attribution requirement', () => {
        const evidence = [
          createEvidenceItem({
            category: 'expert_quote',
            statement: 'The analysis reveals significant methodological concerns.',
            sourceExcerpt: 'The expert commentary discusses methodological issues.',
          }),
        ];

        const config: Partial<ProbativeFilterConfig> = {
          categoryRules: {
            ...DEFAULT_FILTER_CONFIG.categoryRules,
            expert_quote: { requireAttribution: false },
          },
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });
    });

    describe('event category', () => {
      it('should filter events without temporal anchors', () => {
        const evidence = [
          createEvidenceItem({
            category: 'event',
            statement: 'The conference took place with significant international attendance.',
            sourceExcerpt: 'Participants discussed various topics during the event.',
          }),
          createEvidenceItem({
            category: 'event',
            statement: 'The summit occurred in December 2023 with leaders from 15 nations.',
            sourceExcerpt: 'The December meeting addressed climate and trade issues.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.event_without_temporal_anchor).toBe(1);
      });

      it('should keep events with year in statement', () => {
        const evidence = [
          createEvidenceItem({
            category: 'event',
            statement: 'The earthquake struck the region in 2020 causing widespread damage.',
            sourceExcerpt: 'Disaster response teams were deployed to affected areas.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should keep events with month names', () => {
        const evidence = [
          createEvidenceItem({
            category: 'event',
            statement: 'The legislation was passed in March after extensive debate.',
            sourceExcerpt: 'The parliamentary session concluded with the vote.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should keep events with date patterns', () => {
        const evidence = [
          createEvidenceItem({
            category: 'event',
            statement: 'The agreement was signed on 05/12/2022 at the headquarters.',
          }),
          createEvidenceItem({
            category: 'event',
            statement: 'The incident happened last year during the festival.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(2);
        expect(result.filtered).toHaveLength(0);
      });

      it('should allow disabling temporal anchor requirement', () => {
        const evidence = [
          createEvidenceItem({
            category: 'event',
            statement: 'The meeting concluded with unanimous support for the resolution.',
            sourceExcerpt: 'Delegates expressed satisfaction with the outcome.',
          }),
        ];

        const config: Partial<ProbativeFilterConfig> = {
          categoryRules: {
            ...DEFAULT_FILTER_CONFIG.categoryRules,
            event: { requireTemporalAnchor: false },
          },
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });
    });

    describe('legal_provision category', () => {
      it('should filter legal provisions without citations', () => {
        const evidence = [
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'The law prohibits discrimination in employment practices.',
            sourceExcerpt: 'Anti-discrimination measures are established by statute.',
          }),
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'Article 7 establishes the framework for environmental protection.',
            sourceExcerpt: 'The environmental protection statute includes specific provisions.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(1);
        expect(result.stats.filterReasons.legal_provision_without_citation).toBe(1);
      });

      it('should keep legal provisions with section citations', () => {
        const evidence = [
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'Section 12 defines the penalties for non-compliance.',
            sourceExcerpt: 'The statute outlines enforcement mechanisms.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should keep legal provisions with case citations', () => {
        const evidence = [
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'In Smith v. Jones, the court held that the regulation was constitutional.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });

      it('should keep legal provisions with statute references', () => {
        const evidence = [
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'Under 42 USC § 1983, citizens may sue state officials for rights violations.',
          }),
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'The regulation pursuant to § 501 governs tax-exempt status.',
          }),
        ];

        const result = filterByProbativeValue(evidence);

        expect(result.kept).toHaveLength(2);
        expect(result.filtered).toHaveLength(0);
      });

      it('should allow disabling citation requirement', () => {
        const evidence = [
          createEvidenceItem({
            category: 'legal_provision',
            statement: 'The statute requires annual reporting of financial activities.',
            sourceExcerpt: 'Reporting requirements are defined in the legislation.',
          }),
        ];

        const config: Partial<ProbativeFilterConfig> = {
          categoryRules: {
            ...DEFAULT_FILTER_CONFIG.categoryRules,
            legal_provision: { requireCitation: false },
          },
        };

        const result = filterByProbativeValue(evidence, config);

        expect(result.kept).toHaveLength(1);
        expect(result.filtered).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // DEDUPLICATION TESTS
  // ============================================================================

  describe('deduplication', () => {
    it('should remove exact duplicates', () => {
      const evidence = [
        createEvidenceItem({
          id: 'E1',
          statement: 'The study found that 75% of participants agreed with the statement.',
        }),
        createEvidenceItem({
          id: 'E2',
          statement: 'The study found that 75% of participants agreed with the statement.',
        }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(1);
      expect(result.filtered).toHaveLength(1);
      expect(result.stats.filterReasons.duplicate_or_near_duplicate).toBe(1);
    });

    it('should remove near-duplicates above similarity threshold (0.85)', () => {
      const evidence = [
        createEvidenceItem({
          id: 'E1',
          statement: 'The comprehensive research study found that approximately seventy-five percent of surveyed participants agreed with the statement provided.',
        }),
        createEvidenceItem({
          id: 'E2',
          statement: 'The comprehensive research study found that approximately seventy-five percent of surveyed participants agreed with statement provided.',
        }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(1);
      expect(result.filtered).toHaveLength(1);
      expect(result.stats.filterReasons.duplicate_or_near_duplicate).toBe(1);
    });

    it('should keep distinct evidence below similarity threshold', () => {
      const evidence = [
        createEvidenceItem({
          id: 'E1',
          statement: 'The study examined urban transportation patterns in European cities.',
        }),
        createEvidenceItem({
          id: 'E2',
          statement: 'Research analyzed renewable energy adoption in Asian countries.',
        }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.kept).toHaveLength(2);
      expect(result.filtered).toHaveLength(0);
    });

    it('should allow custom deduplication threshold', () => {
      const evidence = [
        createEvidenceItem({
          id: 'E1',
          statement: 'The study found significant correlation between education and income levels.',
        }),
        createEvidenceItem({
          id: 'E2',
          statement: 'Research discovered strong correlation between education and income levels.',
        }),
      ];

      // With default threshold (0.85), these might be considered duplicates
      const resultDefault = filterByProbativeValue(evidence);

      // With stricter threshold (0.95), they should be kept as distinct
      const config: Partial<ProbativeFilterConfig> = {
        deduplicationThreshold: 0.95,
      };
      const resultStrict = filterByProbativeValue(evidence, config);

      // Verify stricter threshold keeps more items
      expect(resultStrict.kept.length).toBeGreaterThanOrEqual(resultDefault.kept.length);
    });

    it('should deduplicate only among kept items, not filtered items', () => {
      const evidence = [
        createEvidenceItem({
          id: 'E1',
          statement: 'First valid statement about renewable energy adoption in urban areas.',
        }),
        createEvidenceItem({
          id: 'E2',
          statement: 'Second valid statement about healthcare policy changes in rural regions.',
        }),
        createEvidenceItem({
          id: 'E3',
          statement: 'Short', // Will be filtered for length
        }),
        createEvidenceItem({
          id: 'E4',
          statement: 'Also', // Will be filtered for length
        }),
      ];

      const result = filterByProbativeValue(evidence);

      // E1 and E2 kept (distinct), E3 and E4 filtered (too short)
      expect(result.kept).toHaveLength(2);
      expect(result.filtered).toHaveLength(2);
      expect(result.stats.filterReasons.statement_too_short).toBe(2);
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
        createEvidenceItem({
          statement: 'Some say many people believe it is said opinions vary.',
        }), // Vague phrases
      ];

      const result = filterByProbativeValue(evidence);

      expect(result.stats.filterReasons.statement_too_short).toBe(2);
      expect(result.stats.filterReasons.missing_source_url).toBe(1);
      expect(result.stats.filterReasons.excessive_vague_phrases).toBe(1);
      expect(result.stats.total).toBe(4);
      expect(result.stats.filtered).toBe(4);
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
        createEvidenceItem({
          statement: 'Some say many believe it is argued opinions vary the debate continues.',
        }),
      ];

      const result = filterByProbativeValue(evidence);

      expect(Object.keys(result.stats.filterReasons)).toContain('statement_too_short');
      expect(Object.keys(result.stats.filterReasons)).toContain('missing_source_url');
      expect(Object.keys(result.stats.filterReasons)).toContain('excessive_vague_phrases');
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
