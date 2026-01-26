/**
 * Baseline Test Cases for FactHarbor Quality Analysis
 * 
 * These test cases establish a performance baseline for measuring
 * improvements in verdict accuracy, schema compliance, and cost optimization.
 * 
 * Part of Phase 2: Establish Baseline
 * 
 * @version 1.0.0
 * @date 2026-01-19
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TestCase {
  id: string;
  category: TestCategory;
  input: string;
  inputType: 'text' | 'url';
  expectedVerdict?: VerdictExpectation;
  expectedClaims?: ClaimExpectation[];
  expectedScopes?: number;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export type TestCategory =
  | 'simple-factual'
  | 'multi-scope'
  | 'comparative'
  | 'attribution-separation'
  | 'temporal'
  | 'pseudoscience'
  | 'methodology';

export interface VerdictExpectation {
  range: { min: number; max: number }; // Truth percentage 0-100
  label?: 'TRUE' | 'MOSTLY-TRUE' | 'LEANING-TRUE' | 'MIXED' | 'UNVERIFIED' | 'LEANING-FALSE' | 'MOSTLY-FALSE' | 'FALSE';
}

export interface ClaimExpectation {
  textContains: string;
  role?: 'attribution' | 'source' | 'timing' | 'core';
  centrality?: 'high' | 'medium' | 'low';
}

// ============================================================================
// TEST CASES
// ============================================================================

export const BASELINE_TEST_CASES: TestCase[] = [
  // -------------------------------------------------------------------------
  // Category 1: Simple Factual Claims (5 cases)
  // -------------------------------------------------------------------------
  {
    id: 'simple-01',
    category: 'simple-factual',
    input: 'The Earth orbits the Sun',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 85, max: 100 },
      label: 'TRUE',
    },
    expectedClaims: [
      {
        textContains: 'Earth orbits',
        role: 'core',
        centrality: 'high',
      },
    ],
    description: 'Basic astronomical fact - should be TRUE with high confidence',
    difficulty: 'easy',
    tags: ['astronomy', 'basic-science', 'well-established'],
  },
  {
    id: 'simple-02',
    category: 'simple-factual',
    input: 'Water boils at 100 degrees Celsius at sea level',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 85, max: 100 },
      label: 'TRUE',
    },
    description: 'Basic physics fact with context qualifier',
    difficulty: 'easy',
    tags: ['physics', 'basic-science', 'well-established'],
  },
  {
    id: 'simple-03',
    category: 'simple-factual',
    input: 'Paris is the capital of France',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 85, max: 100 },
      label: 'TRUE',
    },
    description: 'Basic geography fact',
    difficulty: 'easy',
    tags: ['geography', 'well-established'],
  },
  {
    id: 'simple-04',
    category: 'simple-factual',
    input: 'The Moon is made of cheese',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 0, max: 14 },
      label: 'FALSE',
    },
    description: 'Obviously false claim - should be FALSE with high confidence',
    difficulty: 'easy',
    tags: ['astronomy', 'obviously-false'],
  },
  {
    id: 'simple-05',
    category: 'simple-factual',
    input: 'Photosynthesis converts sunlight into chemical energy',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 85, max: 100 },
      label: 'TRUE',
    },
    description: 'Basic biology fact',
    difficulty: 'easy',
    tags: ['biology', 'basic-science', 'well-established'],
  },

  // -------------------------------------------------------------------------
  // Category 2: Multi-Scope Analysis (5 cases)
  // -------------------------------------------------------------------------
  {
    id: 'multi-scope-01',
    category: 'multi-scope',
    input: 'Well-to-wheel analysis shows hydrogen vehicles are 40% efficient, while tank-to-wheel shows 60% efficiency',
    inputType: 'text',
    expectedScopes: 2,
    description: 'Two distinct methodological scopes (WTW vs TTW)',
    difficulty: 'medium',
    tags: ['methodology', 'energy', 'comparative'],
  },
  {
    id: 'multi-scope-02',
    category: 'multi-scope',
    input: 'EU regulations require 95g CO2/km by 2025, while US EPA standards allow 140g CO2/mi',
    inputType: 'text',
    expectedScopes: 2,
    description: 'Two distinct regulatory scopes (EU vs US)',
    difficulty: 'medium',
    tags: ['regulation', 'geographic', 'comparative'],
  },
  {
    id: 'multi-scope-03',
    category: 'multi-scope',
    input: 'Clinical trials showed 90% efficacy in adults but only 70% in children',
    inputType: 'text',
    expectedScopes: 2,
    description: 'Two distinct population scopes',
    difficulty: 'medium',
    tags: ['medical', 'population-specific'],
  },
  {
    id: 'multi-scope-04',
    category: 'multi-scope',
    input: 'The 2020 study found positive results, but the 2023 replication failed to confirm',
    inputType: 'text',
    expectedScopes: 2,
    description: 'Two distinct temporal scopes',
    difficulty: 'medium',
    tags: ['temporal', 'scientific-replication'],
  },
  {
    id: 'multi-scope-05',
    category: 'multi-scope',
    input: 'Under GAAP accounting, the profit was $10M, but under IFRS it was $8M',
    inputType: 'text',
    expectedScopes: 2,
    description: 'Two distinct accounting methodology scopes',
    difficulty: 'medium',
    tags: ['methodology', 'accounting', 'standards'],
  },

  // -------------------------------------------------------------------------
  // Category 3: Comparative Claims (5 cases)
  // -------------------------------------------------------------------------
  {
    id: 'comparative-01',
    category: 'comparative',
    input: 'Electric cars are more efficient than gasoline cars',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 72, max: 100 },
      label: 'TRUE', // or MOSTLY-TRUE depending on methodology
    },
    description: 'Comparative efficiency claim - rating direction critical',
    difficulty: 'medium',
    tags: ['comparative', 'energy', 'rating-direction'],
  },
  {
    id: 'comparative-02',
    category: 'comparative',
    input: 'Solar power is cheaper than coal power',
    inputType: 'text',
    description: 'Cost comparison - context matters (location, timeframe)',
    difficulty: 'medium',
    tags: ['comparative', 'energy', 'economics'],
  },
  {
    id: 'comparative-03',
    category: 'comparative',
    input: 'Country A has better healthcare outcomes than Country B',
    inputType: 'text',
    description: 'Comparative outcomes - requires metrics and evidence',
    difficulty: 'hard',
    tags: ['comparative', 'healthcare', 'requires-metrics'],
  },
  {
    id: 'comparative-04',
    category: 'comparative',
    input: 'Wind energy produces more jobs per megawatt than natural gas',
    inputType: 'text',
    description: 'Comparative economic claim with specific metric',
    difficulty: 'medium',
    tags: ['comparative', 'economics', 'energy'],
  },
  {
    id: 'comparative-05',
    category: 'comparative',
    input: 'Recycling aluminum saves more energy than recycling plastic',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 72, max: 100 },
    },
    description: 'Comparative environmental claim',
    difficulty: 'medium',
    tags: ['comparative', 'environment', 'recycling'],
  },

  // -------------------------------------------------------------------------
  // Category 4: Attribution Separation (5 cases)
  // -------------------------------------------------------------------------
  {
    id: 'attribution-01',
    category: 'attribution-separation',
    input: 'Dr. Smith claims the vaccine is unsafe',
    inputType: 'text',
    expectedClaims: [
      {
        textContains: 'Dr. Smith',
        role: 'attribution',
        centrality: 'low',
      },
      {
        textContains: 'vaccine is unsafe',
        role: 'core',
        centrality: 'high',
      },
    ],
    description: 'Attribution claim should be separated from content claim',
    difficulty: 'medium',
    tags: ['attribution', 'medical', 'separation-required'],
  },
  {
    id: 'attribution-02',
    category: 'attribution-separation',
    input: 'According to the WHO report, COVID-19 originated naturally',
    inputType: 'text',
    expectedClaims: [
      {
        textContains: 'WHO report',
        role: 'source',
        centrality: 'low',
      },
      {
        textContains: 'originated naturally',
        role: 'core',
        centrality: 'high',
      },
    ],
    description: 'Source attribution should be separated',
    difficulty: 'medium',
    tags: ['attribution', 'medical', 'source-separation'],
  },
  {
    id: 'attribution-03',
    category: 'attribution-separation',
    input: 'On January 15, 2024, the court ruled that the defendant was guilty',
    inputType: 'text',
    expectedClaims: [
      {
        textContains: 'January 15, 2024',
        role: 'timing',
        centrality: 'low',
      },
      {
        textContains: 'ruled',
        role: 'attribution',
        centrality: 'low',
      },
      {
        textContains: 'defendant was guilty',
        role: 'core',
        centrality: 'high',
      },
    ],
    description: 'Timing and attribution should be separated from ruling',
    difficulty: 'medium',
    tags: ['attribution', 'legal', 'timing-separation'],
  },
  {
    id: 'attribution-04',
    category: 'attribution-separation',
    input: 'The study published in Nature found a significant correlation',
    inputType: 'text',
    expectedClaims: [
      {
        textContains: 'published in Nature',
        role: 'source',
        centrality: 'low',
      },
      {
        textContains: 'significant correlation',
        role: 'core',
        centrality: 'high',
      },
    ],
    description: 'Publication venue should be separated from finding',
    difficulty: 'medium',
    tags: ['attribution', 'scientific', 'source-separation'],
  },
  {
    id: 'attribution-05',
    category: 'attribution-separation',
    input: 'Professor Johnson argues that climate change is accelerating',
    inputType: 'text',
    expectedClaims: [
      {
        textContains: 'Professor Johnson',
        role: 'attribution',
        centrality: 'low',
      },
      {
        textContains: 'climate change is accelerating',
        role: 'core',
        centrality: 'high',
      },
    ],
    description: 'Expert attribution should be separated',
    difficulty: 'easy',
    tags: ['attribution', 'climate', 'expert-opinion'],
  },

  // -------------------------------------------------------------------------
  // Category 5: Temporal/Recent Claims (5 cases)
  // -------------------------------------------------------------------------
  {
    id: 'temporal-01',
    category: 'temporal',
    input: 'The unemployment rate is at a 50-year low',
    inputType: 'text',
    description: 'Recent temporal claim - requires current data',
    difficulty: 'hard',
    tags: ['temporal', 'economics', 'recent-data-required'],
  },
  {
    id: 'temporal-02',
    category: 'temporal',
    input: 'Last month\'s inflation rate was 2.5%',
    inputType: 'text',
    description: 'Specific recent timeframe - requires current data',
    difficulty: 'hard',
    tags: ['temporal', 'economics', 'specific-timeframe'],
  },
  {
    id: 'temporal-03',
    category: 'temporal',
    input: 'The current president was elected in 2020',
    inputType: 'text',
    description: 'Temporal context affects verification',
    difficulty: 'medium',
    tags: ['temporal', 'political', 'context-dependent'],
  },
  {
    id: 'temporal-04',
    category: 'temporal',
    input: 'This year\'s wildfire season is worse than last year\'s',
    inputType: 'text',
    description: 'Year-over-year comparison requires recent data',
    difficulty: 'hard',
    tags: ['temporal', 'climate', 'comparative'],
  },
  {
    id: 'temporal-05',
    category: 'temporal',
    input: 'The latest WHO guidelines recommend boosters every 6 months',
    inputType: 'text',
    description: 'Recent guidance - may change over time',
    difficulty: 'hard',
    tags: ['temporal', 'medical', 'guidelines'],
  },

  // -------------------------------------------------------------------------
  // Category 6: Pseudoscience Detection (3 cases)
  // -------------------------------------------------------------------------
  {
    id: 'pseudo-01',
    category: 'pseudoscience',
    input: 'Homeopathic water memory cures diseases',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 0, max: 28 },
      label: 'FALSE', // or MOSTLY-FALSE
    },
    description: 'Pseudoscience claim - should be detected and rated FALSE',
    difficulty: 'medium',
    tags: ['pseudoscience', 'medical', 'debunked'],
  },
  {
    id: 'pseudo-02',
    category: 'pseudoscience',
    input: 'Vaccines cause autism',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 0, max: 28 },
      label: 'FALSE',
    },
    description: 'Debunked pseudoscience claim',
    difficulty: 'medium',
    tags: ['pseudoscience', 'medical', 'debunked'],
  },
  {
    id: 'pseudo-03',
    category: 'pseudoscience',
    input: 'Crystals can heal cancer through quantum energy',
    inputType: 'text',
    expectedVerdict: {
      range: { min: 0, max: 14 },
      label: 'FALSE',
    },
    description: 'Pseudoscience with sciencey-sounding terms',
    difficulty: 'easy',
    tags: ['pseudoscience', 'medical', 'quantum-woo'],
  },

  // -------------------------------------------------------------------------
  // Category 7: Methodology Scopes (2 cases)
  // -------------------------------------------------------------------------
  {
    id: 'methodology-01',
    category: 'methodology',
    input: 'Life-cycle assessment shows electric cars reduce emissions by 40%',
    inputType: 'text',
    description: 'Methodology-specific claim requiring scope detection',
    difficulty: 'medium',
    tags: ['methodology', 'LCA', 'environment'],
  },
  {
    id: 'methodology-02',
    category: 'methodology',
    input: 'Meta-analysis of 50 studies confirms the drug\'s effectiveness',
    inputType: 'text',
    description: 'Research methodology claim',
    difficulty: 'medium',
    tags: ['methodology', 'medical', 'meta-analysis'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get test cases by category
 */
export function getTestCasesByCategory(category: TestCategory): TestCase[] {
  return BASELINE_TEST_CASES.filter((tc) => tc.category === category);
}

/**
 * Get test cases by difficulty
 */
export function getTestCasesByDifficulty(difficulty: TestCase['difficulty']): TestCase[] {
  return BASELINE_TEST_CASES.filter((tc) => tc.difficulty === difficulty);
}

/**
 * Get test cases by tag
 */
export function getTestCasesByTag(tag: string): TestCase[] {
  return BASELINE_TEST_CASES.filter((tc) => tc.tags.includes(tag));
}

/**
 * Get test case by ID
 */
export function getTestCaseById(id: string): TestCase | undefined {
  return BASELINE_TEST_CASES.find((tc) => tc.id === id);
}

/**
 * Get summary statistics about test cases
 */
export function getTestSuiteStats() {
  const byCategory = BASELINE_TEST_CASES.reduce((acc, tc) => {
    acc[tc.category] = (acc[tc.category] || 0) + 1;
    return acc;
  }, {} as Record<TestCategory, number>);

  const byDifficulty = BASELINE_TEST_CASES.reduce((acc, tc) => {
    acc[tc.difficulty] = (acc[tc.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: BASELINE_TEST_CASES.length,
    byCategory,
    byDifficulty,
    categories: Object.keys(byCategory).length,
  };
}
