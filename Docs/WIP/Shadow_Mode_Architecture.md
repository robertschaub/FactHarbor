# Shadow Mode: Self-Learning Prompt Optimization System

**Status:** Design Ready (Revised 2026-02-02)
**Date:** 2026-02-02
**Owner:** FactHarbor Engineering
**Related:** `lexicon-to-llm-migration.md`

---

## Executive Summary

Shadow Mode is a **self-learning system** that analyzes how LLMs understand and respond to prompts, then proposes prompt improvements based on empirical evidence of what works better or worse.

**Purpose:** Optimize LLM classification prompts through continuous learning and feedback.

**Key Principle:** Learn from LLM behavior patterns to improve prompt effectiveness over time.

**NOT:** Comparing LLM to pattern-based logic (pattern-based is a bad reference)

---

## Core Concept

### What Shadow Mode Does

1. **Observes LLM Behavior**
   - Tracks how LLM classifies across thousands of cases
   - Identifies consistent vs inconsistent classifications
   - Detects edge cases where LLM struggles
   - Maps prompt elements to outcome quality

2. **Learns Patterns**
   - Which prompt phrasings lead to better consistency
   - Which examples reduce misclassification
   - Which decision trees improve edge case handling
   - Which constraints prevent over/under-classification

3. **Proposes Improvements**
   - Suggests new examples for prompts
   - Recommends rephrasing unclear guidance
   - Identifies missing decision tree branches
   - Proposes stronger constraints

4. **Validates Changes**
   - A/B tests prompt variations
   - Measures improvement in consistency and quality
   - Provides evidence-based recommendations

---

## Requirements

### Functional Requirements

**FR1: LLM Behavior Tracking**
- Log all LLM classifications with full context
- Track classification distribution (how often each category used)
- Detect classification inconsistency (similar inputs → different outputs)
- Flag low-confidence classifications (if LLM provides confidence)

**FR2: Outcome Quality Assessment**
- Human feedback on classification quality (good/bad/ambiguous)
- Detect systematic misclassifications
- Identify edge cases requiring new guidance
- Measure verdict quality correlation with classifications

**FR3: Prompt Element Analysis**
- Map prompt sections to classification behavior
- Identify which examples are most effective
- Track which constraints are violated vs followed
- Analyze decision tree branch usage

**FR4: Improvement Proposals**
- Suggest new examples based on observed weaknesses
- Recommend rephrasing for unclear sections
- Propose new decision tree branches for edge cases
- Generate constraint additions to prevent errors

**FR5: A/B Testing Framework**
- Run prompt variants on same article set
- Measure consistency, quality, edge case handling
- Statistical significance testing
- Evidence-based recommendation (keep variant A or B)

### Non-Functional Requirements

**NFR1: Minimal Performance Impact**
- Logging async and non-blocking
- Analysis runs offline (not during production analysis)
- A/B testing uses separate test corpus

**NFR2: Privacy & Security**
- No PII in logs
- Article content hashed (IDs only)
- Human feedback anonymized

**NFR3: Actionable Output**
- Concrete prompt change recommendations
- Evidence for each recommendation
- Prioritized by impact

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                Analysis Pipeline                        │
│                 (LLM Classifications)                   │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│          Shadow Mode Behavior Logger                    │
│  • Classification + context                             │
│  • Prompt version hash                                  │
│  • Article characteristics                              │
│  • Outcome quality (if available)                       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│       Offline Analysis Engine                           │
│  ┌─────────────────────────────────────────────┐       │
│  │  1. Consistency Analyzer                    │       │
│  │     • Detects classification variance        │       │
│  │     • Flags unstable classifications         │       │
│  └─────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────┐       │
│  │  2. Edge Case Detector                      │       │
│  │     • Finds patterns in misclassifications   │       │
│  │     • Identifies missing prompt guidance     │       │
│  └─────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────┐       │
│  │  3. Prompt Element Mapper                   │       │
│  │     • Correlates prompt sections to behavior │       │
│  │     • Identifies ineffective examples        │       │
│  └─────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────┐       │
│  │  4. Improvement Generator                   │       │
│  │     • Proposes new examples                  │       │
│  │     • Suggests rephrasing                    │       │
│  │     • Recommends new constraints             │       │
│  └─────────────────────────────────────────────┘       │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│          A/B Testing Framework                          │
│  • Test prompt variant A vs B                           │
│  • Measure consistency, quality, edge cases             │
│  • Statistical significance                             │
│  • Recommendation: keep A or B                          │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│       Human Review Dashboard                            │
│  • View proposed improvements                           │
│  • See evidence and test results                        │
│  • Approve/reject/modify proposals                      │
│  • Apply approved changes to prompts                    │
└─────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Shadow Mode Behavior Logger

**Responsibility:** Capture LLM classification behavior with full context

**Data Structure:**
```typescript
interface ClassificationLog {
  // Identity
  logId: string;
  timestamp: Date;
  articleId: string;
  claimId?: string;
  evidenceId?: string;

  // Classification
  classificationType: "factualBasis" | "harmPotential" | "sourceAuthority" | "evidenceBasis";
  classificationValue: string;  // e.g., "established", "high", etc.

  // Context
  textSnippet: string;  // First 200 chars (for human review)
  textHash: string;     // Full text hash (for finding similar cases)

  // Prompt tracking
  promptVersionHash: string;  // Hash of prompt used
  promptSection: string;      // Which part of prompt applies (e.g., "factualBasis-examples")

  // LLM response metadata
  llmConfidence?: number;     // If LLM provides confidence
  llmExplanation?: string;    // If LLM explains reasoning
  llmRefusal: boolean;        // Did LLM refuse to classify?
  llmParseError: boolean;     // Did JSON parse fail?

  // Outcome quality (added later)
  humanFeedback?: "correct" | "incorrect" | "ambiguous" | "edge-case";
  humanCorrection?: string;   // What it should have been
  verdictQuality?: number;    // Final verdict quality score (0-100)

  // Article characteristics (for pattern detection)
  articleCharacteristics: {
    length: number;
    language: string;
    sourceTypes: string[];    // Types of sources present
    claimCount: number;
  };
}
```

**Storage:** SQLite table with indexes on:
- `timestamp` (time-series analysis)
- `classificationType` (filter by type)
- `classificationValue` (distribution analysis)
- `promptVersionHash` (compare prompt versions)
- `textHash` (find similar cases)
- `humanFeedback` (quality analysis)

---

### 2. Consistency Analyzer

**Responsibility:** Detect classification variance and instability

**Analysis Types:**

**A. Similar Text, Different Classifications**
```sql
-- Find cases where similar text got different classifications
SELECT
  textHash,
  COUNT(DISTINCT classificationValue) as variance,
  GROUP_CONCAT(DISTINCT classificationValue) as values,
  COUNT(*) as occurrences
FROM classification_logs
WHERE classificationType = 'factualBasis'
  AND promptVersionHash = :current_version
GROUP BY textHash
HAVING variance > 1
ORDER BY occurrences DESC
LIMIT 20;
```

**Output:** "These similar texts got inconsistent classifications - prompt may be ambiguous"

**B. Classification Distribution Drift**
```typescript
interface DistributionDrift {
  classificationType: string;
  weeklyDistribution: {
    week: string;
    distributions: Record<string, number>; // e.g., {"established": 0.3, "opinion": 0.5, ...}
  }[];
  drift: {
    category: string;
    change: number; // percentage point change
    direction: "increasing" | "decreasing";
  }[];
}
```

**Output:** "factualBasis 'established' decreased from 30% to 15% over last 2 weeks - investigate prompt changes"

**C. Low Confidence Clusters**
```typescript
// If LLM provides confidence scores
interface LowConfidenceCluster {
  classificationType: string;
  averageConfidence: number;
  examples: {
    text: string;
    classification: string;
    confidence: number;
    reason: string; // Why LLM is uncertain
  }[];
}
```

**Output:** "LLM consistently uncertain about 'medium' harmPotential (avg 62% confidence) - guidance may be unclear"

---

### 3. Edge Case Detector

**Responsibility:** Find patterns in misclassifications and gaps in prompt guidance

**Detection Strategies:**

**A. Human-Flagged Edge Cases**
```sql
SELECT
  classificationType,
  classificationValue,
  humanFeedback,
  textSnippet,
  COUNT(*) as frequency
FROM classification_logs
WHERE humanFeedback IN ('incorrect', 'edge-case')
  AND promptVersionHash = :current_version
GROUP BY classificationType, classificationValue, textSnippet
ORDER BY frequency DESC
LIMIT 50;
```

**Output:** List of most common edge cases with examples

**B. Verdict Quality Correlation**
```sql
-- Find classifications that correlate with low verdict quality
SELECT
  classificationType,
  classificationValue,
  AVG(verdictQuality) as avg_quality,
  COUNT(*) as sample_size
FROM classification_logs cl
JOIN article_verdicts av ON cl.articleId = av.articleId
WHERE verdictQuality IS NOT NULL
GROUP BY classificationType, classificationValue
HAVING sample_size > 20  -- statistical significance
ORDER BY avg_quality ASC;
```

**Output:** "When factualBasis='disputed', verdict quality is 15pts lower (avg 62 vs 77) - may be over-used"

**C. Text Pattern Analysis**
```typescript
// Analyze text patterns in misclassifications
interface MisclassificationPattern {
  patternType: "starts_with" | "contains" | "ends_with" | "matches_regex";
  pattern: string;
  classificationType: string;
  incorrectValue: string;    // What LLM chose
  shouldBe: string;          // What human says it should be
  frequency: number;
  examples: string[];
}
```

**Example Output:**
```
Pattern: Text starting with "Executive Order"
Current: 90% classified as "documented"
Should be: "opinion" (political statement)
Frequency: 18 cases
→ Suggest adding explicit example to prompt
```

---

### 4. Prompt Element Mapper

**Responsibility:** Correlate prompt sections to classification behavior

**Mapping Strategy:**

**A. Example Effectiveness**
```typescript
interface ExampleEffectiveness {
  promptSection: string;  // e.g., "factualBasis-examples"
  example: string;        // Specific example text
  effectiveness: {
    similar_cases_found: number;      // How many logs match this example pattern
    classification_accuracy: number;  // % correct when similar to this example
    edge_cases_prevented: number;     // Cases where this example likely helped
  };
  recommendation: "keep" | "improve" | "remove" | "replace";
  suggestedReplacement?: string;
}
```

**Output:** "Example 'Study found 45% error rate → established' is effective (92% accuracy on similar cases) - KEEP"

**B. Constraint Violation Analysis**
```typescript
interface ConstraintViolation {
  constraint: string;           // e.g., "Do NOT use 'established' without specific data"
  violationCount: number;       // How many cases violated this
  examples: {
    text: string;
    classification: string;
    why_violation: string;
  }[];
  impact: "high" | "medium" | "low";  // Based on outcome quality
  recommendation: "strengthen" | "rephrase" | "add_example";
}
```

**Output:** "Constraint 'Do NOT classify political statements as documented' violated in 23 cases - STRENGTHEN with explicit example"

**C. Decision Tree Branch Usage**
```typescript
interface DecisionTreeAnalysis {
  decisionTree: string;         // e.g., "factualBasis decision flow"
  branches: {
    branchCondition: string;    // e.g., "Does it cite specific numbers?"
    usageFrequency: number;     // % of cases where this branch applies
    accuracy: number;           // % correct when following this branch
    missingBranch?: {
      newCondition: string;     // Suggested new branch
      examples: string[];
      frequency: number;
    };
  }[];
}
```

**Output:** "Missing branch: 'Is it a government claim about facts?' - observed in 31 cases, currently misclassified as 'documented'"

---

### 5. Improvement Generator

**Responsibility:** Propose concrete prompt improvements based on analysis

**Improvement Types:**

**A. New Example Suggestions**
```typescript
interface ExampleSuggestion {
  promptSection: string;
  currentExamples: string[];
  suggestedExample: {
    text: string;
    expectedClassification: string;
    reason: string;              // Why this example helps
    evidenceFrom: string[];      // Log IDs showing this pattern
    estimatedImpact: number;     // % of edge cases this would prevent
  };
  priority: "high" | "medium" | "low";
}
```

**Example Output:**
```
Prompt Section: factualBasis examples
Suggested New Example:
  ✅ "Executive Order states program is persecution" → opinion

Reason: 18 similar cases currently misclassified as "documented"
Evidence: [log#1234, log#1456, ...]
Impact: Would prevent ~15% of current factualBasis errors
Priority: HIGH
```

**B. Rephrasing Recommendations**
```typescript
interface RephrasingSuggestion {
  promptSection: string;
  currentPhrasing: string;
  suggestedPhrasing: string;
  reason: string;
  evidenceFrom: {
    misunderstandings: number;  // Cases where LLM misunderstood
    lowConfidence: number;      // Cases where LLM was uncertain
  };
  estimatedImprovement: number; // % improvement in consistency
}
```

**Example Output:**
```
Current: "Political criticism without data → opinion (full weight kept)"
Suggested: "Political statements claiming facts are opinions, NOT evidence.
            Even if official (Executive Order, government statement),
            a claim about reality needs independent verification to be 'documented'."

Reason: Current phrasing led to 23 cases misclassifying government statements
Improvement: Estimated 25% reduction in this error type
```

**C. New Constraint Proposals**
```typescript
interface ConstraintProposal {
  promptSection: string;
  proposedConstraint: string;
  violationPattern: {
    description: string;
    frequency: number;
    examples: string[];
  };
  expectedBenefit: string;
}
```

**Example Output:**
```
Proposed Constraint:
  "CRITICAL: A source claiming X is true is NOT evidence that X is true.
   Official statements, press releases, and political declarations are opinions
   about facts, not proof of facts."

Addresses: Government claims misclassified as "documented"
Frequency: 31 cases in last 2 weeks
Benefit: Prevents ~12% of factualBasis false positives
```

**D. Decision Tree Extensions**
```typescript
interface DecisionTreeExtension {
  decisionTree: string;
  proposedBranch: {
    insertAfter: string;        // Which existing branch
    condition: string;          // New branch condition
    outcome: string;            // Classification if true
    examplesMatchingPattern: number;
  };
}
```

**Example Output:**
```
Decision Tree: factualBasis flow
Insert After: "1. Does it cite specific numbers/measurements?"
New Branch:
  "1a. Is the source a political actor claiming facts?
       (government, politician, party, official statement)
       → opinion (NOT documented, even if specific)"

Matches: 28 current edge cases
```

---

### 6. A/B Testing Framework

**Responsibility:** Test prompt variants and measure improvement

**Testing Protocol:**

**A. Variant Generation**
```typescript
interface PromptVariant {
  variantId: string;
  basePromptHash: string;
  changes: {
    section: string;
    changeType: "add_example" | "rephrase" | "add_constraint" | "extend_tree";
    before: string;
    after: string;
  }[];
  hypothesis: string;  // What this variant should improve
}
```

**B. Test Corpus Selection**
```typescript
interface TestCorpus {
  articles: string[];         // Article IDs
  selectionCriteria: {
    includeEdgeCases: boolean;
    includeCurrentMisclassifications: boolean;
    representativeDistribution: boolean;
    sampleSize: number;       // Minimum 50 for statistical significance
  };
}
```

**C. Test Execution**
```typescript
async function runABTest(
  variantA: PromptVariant,  // Current prompt
  variantB: PromptVariant,  // Proposed improvement
  corpus: TestCorpus
): Promise<ABTestResult> {
  const resultsA: ClassificationLog[] = [];
  const resultsB: ClassificationLog[] = [];

  for (const articleId of corpus.articles) {
    // Run same article with both prompts
    resultsA.push(await analyzeWithPrompt(articleId, variantA));
    resultsB.push(await analyzeWithPrompt(articleId, variantB));
  }

  return compareResults(resultsA, resultsB);
}
```

**D. Results Analysis**
```typescript
interface ABTestResult {
  variantA: {
    name: string;
    consistency: number;     // % similar inputs → same output
    edgeCaseAccuracy: number; // % known edge cases correct
    distributionStability: number; // Classification distribution variance
  };

  variantB: {
    name: string;
    consistency: number;
    edgeCaseAccuracy: number;
    distributionStability: number;
  };

  statisticalSignificance: {
    pValue: number;
    significant: boolean;    // p < 0.05
    confidenceInterval: number;
  };

  recommendation: "keep A" | "adopt B" | "inconclusive" | "test longer";
  reasoning: string;
}
```

**Example Output:**
```
A/B Test Results (n=75 articles)

Variant A (Current):
  - Consistency: 78%
  - Edge Case Accuracy: 65%
  - Distribution Stability: 0.82

Variant B (+ Executive Order example):
  - Consistency: 84% (+6pp)
  - Edge Case Accuracy: 81% (+16pp)
  - Distribution Stability: 0.86

Statistical Significance: p=0.003 (✅ significant)

Recommendation: ADOPT B
Reasoning: Significant improvement in edge case handling with no regression in consistency
```

---

## Implementation Plan

### Phase 1: Core Logging (3-4 hours)

1. Add `ClassificationLog` schema to database
2. Implement async behavior logger
3. Wire logging into classification points
4. Add prompt version hash tracking

### Phase 2: Basic Analysis (4-6 hours)

1. Implement Consistency Analyzer
   - Similar text variance detection
   - Distribution drift tracking
2. Implement Edge Case Detector
   - Human feedback aggregation
   - Verdict quality correlation

### Phase 3: Prompt Analysis (6-8 hours)

1. Implement Prompt Element Mapper
   - Example effectiveness tracking
   - Constraint violation detection
2. Implement Improvement Generator
   - Example suggestions
   - Rephrasing recommendations

### Phase 4: A/B Testing (4-6 hours)

1. Build test corpus selection
2. Implement A/B test runner
3. Statistical significance calculation
4. Results dashboard

### Phase 5: Human Review UI (6-8 hours)

1. Dashboard for viewing proposals
2. Evidence display (logs, stats)
3. Approval workflow
4. Prompt application mechanism

**Total: 23-32 hours + ongoing learning period**

---

## Success Criteria

### Quantitative

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Consistency Improvement** | +15% over 4 weeks | Compare variance in similar cases |
| **Edge Case Reduction** | -50% human corrections | Track human feedback frequency |
| **Prompt Iterations** | 2-3 improvements/month | Approved A/B tests |
| **Statistical Confidence** | p < 0.05 for all changes | A/B test results |

### Qualitative

1. **Actionable Proposals**: All suggestions include clear evidence and examples
2. **Team Adoption**: Engineering team uses system for all prompt changes
3. **Learning Velocity**: System identifies new edge cases within 1 week
4. **Prompt Stability**: Fewer emergency prompt fixes needed

---

## Example Learning Cycle

**Week 1: Observation**
- System logs 500 classifications
- Detects 23 cases of "Executive Order" misclassified as "documented"
- Clusters these as edge case pattern

**Week 2: Analysis**
- Prompt Element Mapper identifies missing example
- Improvement Generator proposes new example:
  ✅ "Executive Order declares X" → opinion (political claim, not evidence)

**Week 3: Testing**
- A/B test on 75 articles
- Variant B (with new example): 81% edge case accuracy vs 65% baseline
- p=0.003 (statistically significant)

**Week 4: Deployment**
- Team approves change
- New example added to factualBasis prompt
- System continues monitoring for new patterns

**Result:** Self-improving prompts based on real LLM behavior

---

## Key Differences from Traditional Approaches

| Traditional | Shadow Mode Self-Learning |
|------------|---------------------------|
| Compare to pattern logic | Analyze LLM behavior directly |
| Binary right/wrong | Identify consistency and patterns |
| Static prompt | Evolving prompt based on evidence |
| Manual prompt tuning | Data-driven suggestions |
| Subjective improvements | Statistical validation (A/B tests) |

---

*Architecture designed by Claude Code (Sonnet 4.5) on 2026-02-02*
*Revised to focus on self-learning and prompt optimization*
*Status: Design Ready → Ready for Implementation*
