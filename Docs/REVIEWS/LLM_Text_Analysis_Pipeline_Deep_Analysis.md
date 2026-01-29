# LLM Text Analysis Delegation - Pipeline Deep Analysis

**Document Type**: Technical Proposal / Architecture Review
**Date**: 2026-01-29
**Author**: Claude (AI Assistant)
**Status**: FOR REVIEW
**Related**: `LLM_Delegation_Proposal_Text_Analysis.md` (predecessor)

---

## Executive Summary

This document provides a **deep pipeline analysis** for delegating hardcoded text analysis to LLMs. The key insight is that different pipeline stages have different information available, requiring **stage-aware LLM call batching** rather than a single unified call.

**Key Findings:**
- 6 distinct pipeline stages with varying context availability
- 34+ text analysis functions identified across stages
- **4 strategic LLM "analysis points"** recommended (not one)
- Estimated cost: $0.015-0.025/job (well within budget)

**Architecture Decision (2026-01-29):**
> After analyzing drawbacks of combining calls, the decision is to **keep 4 separate calls** rather than combining them. Rationale:
> - Single point of failure: Combined call failure loses both analyses
> - Larger context: Higher hallucination risk
> - Less granular feature flagging: Can't A/B test components independently
> - Debugging complexity: Harder to identify which sub-task caused issues
>
> The 4-call architecture provides better resilience, debuggability, and rollout control.

---

## Part 1: Pipeline Stage Analysis

### Stage Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PIPELINE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UNDERSTAND        2. RESEARCH         3. EXTRACT_FACTS                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ Input text  │────▶│ Sub-claims  │────▶│ Source text │                   │
│  │ only        │     │ + Contexts  │     │ + Evidence  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ Text Type   │     │ Similarity  │     │ Quality     │                   │
│  │ Detection   │     │ Calculation │     │ Filtering   │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
│  4. SCOPE_REFINE      5. VERDICT          6. POST-PROCESS                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ All context │────▶│ Full state  │────▶│ Final       │                   │
│  │ + Evidence  │     │ + Verdicts  │     │ validation  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │ Evidence    │     │ Inversion   │     │ Weighting   │                   │
│  │ Selection   │     │ Detection   │     │ Adjustment  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Stage 1: UNDERSTAND Phase

**Location**: `orchestrated.ts:3308-4500` (`understandClaim()`)

**Available Information**:
- User input text only (no research yet)
- Pre-detected scopes from heuristics
- No evidence, no sources

**Text Analysis Functions Called**:

| Function | Line | Purpose | Inputs |
|----------|------|---------|--------|
| `isComparativeLikeText()` | 4349, 4387, 4438 | Detect "X is more Y than Z" | Input text |
| `isCompoundLikeText()` | 4440 | Detect compound statements | Input text |
| `deriveCandidateClaimTexts()` | 3284 | Extract sub-claims heuristically | Input text |

**Current Regex Patterns (37 patterns)**:
```typescript
// isComparativeLikeText - lines 3253-3262
- /\b(more|less|better|worse|higher|lower|fewer|greater|smaller)\b/
- /\b[a-z]{3,}er\b/ (heuristic for "-er" comparative forms)

// isCompoundLikeText - lines 3265-3272
- /[;,]/
- /\b(and|or|but|while|which|that)\b/
- /\b[ivxlcdm]+\b/ (roman numerals with commas)
```

**LLM Delegation Opportunity**: HIGH
- These are semantic text classification tasks
- LLM can understand meaning, not just patterns
- Single call can handle all UNDERSTAND-phase analysis

---

### Stage 2: RESEARCH Phase

**Location**: `orchestrated.ts:4800-5500` (multiple functions)

**Available Information**:
- User input text
- Sub-claims from UNDERSTAND
- Initial analysis contexts
- No evidence yet

**Text Analysis Functions Called**:

| Function | Line | Purpose | Inputs |
|----------|------|---------|--------|
| `generateOppositeClaimQuery()` | 740-759 | Generate counter-search queries | Claim text |
| `calculateTextSimilarity()` | 765-776 | Basic Jaccard word overlap | Two text strings |

**Current Regex Patterns (12 patterns)**:
```typescript
// generateOppositeClaimQuery - lines 740-759
- /(.+)\s+(is|was|were|are)\s+(not\s+)?(.+)/i
- Fallback: extract words > 3 chars
```

**LLM Delegation Opportunity**: MEDIUM
- `calculateTextSimilarity` is used frequently for performance
- Keep as fast heuristic OR batch multiple comparisons
- `generateOppositeClaimQuery` benefits from LLM understanding

---

### Stage 3: EXTRACT_FACTS Phase

**Location**: `orchestrated.ts:5500-6050` (`extractFacts()`)

**Available Information**:
- Source text/content
- Source metadata (URL, title)
- Target context/proceeding ID
- No verdicts yet

**Text Analysis Functions Called**:

| Function | Line | Purpose | Inputs |
|----------|------|---------|--------|
| High-impact outcome filter | 5920-5937 | Block "sentenced/convicted" from low-reliability | Fact text + excerpt |

**Current Regex Patterns (6 patterns)**:
```typescript
// High-impact outcome filter - lines 5923-5930
- hay.includes("sentenced")
- hay.includes("convicted")
- hay.includes("years in prison")
- hay.includes("year prison")
- hay.includes("months in prison")
- (hay.includes("prison") && hay.includes("year"))
```

**LLM Delegation Opportunity**: LOW
- This is a safety filter, fast heuristic is appropriate
- Could be combined with LLM extraction prompt instead

---

### Stage 4: EVIDENCE_FILTER Phase

**Location**: `evidence-filter.ts:172-294` (`filterByProbativeValue()`)

**Available Information**:
- All extracted evidence items
- Statement text + source excerpts
- Category labels
- No verdicts yet

**Text Analysis Functions Called**:

| Function | Line | Purpose | Inputs |
|----------|------|---------|--------|
| `countVaguePhrases()` | 92-94 | Detect low-quality phrasing | Statement text |
| `containsNumber()` | 99-101 | Validate statistics | Statement/excerpt |
| `hasTemporalAnchor()` | 106-117 | Validate events have dates | Statement/excerpt |
| `hasCitation()` | 122-133 | Validate legal provisions | Statement/excerpt |
| `hasAttribution()` | 138-147 | Validate expert quotes | Statement/excerpt |
| `calculateSimilarity()` | 152-163 | Deduplication | Two statements |

**Current Regex Patterns (35+ patterns)**:
```typescript
// VAGUE_PHRASES - lines 73-87 (14 patterns)
- /\bsome\s+(say|believe|argue|claim|think|suggest)\b/i
- /\bmany\s+(people|experts|critics|scientists|researchers)\b/i
- /\bit\s+is\s+(said|believed|argued|thought|claimed)\b/i
- /\bopinions\s+(vary|differ)\b/i
- /\bthe\s+debate\s+continues\b/i
- /\bcontroversy\s+exists\b/i
- /\ballegedly\b/i, /\breportedly\b/i, /\bpurportedly\b/i, /\bsupposedly\b/i
- /\bits?\s+unclear\b/i, /\bsome\s+argue\b/i, /\baccording\s+to\s+some\b/i

// hasTemporalAnchor - lines 108-115 (4 patterns)
- /\b(19|20)\d{2}\b/ (years)
- /\b(january|february|...)\b/i (months)
- /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/ (dates)
- /\b(last|this|next)\s+(year|month|week|decade|century)\b/i

// hasCitation - lines 124-130 (5 patterns)
- /§\s*\d+/
- /\b(article|section|sec\.|para\.|paragraph)\s+\d+/i
- /\b\d+\s+u\.?s\.?c\.?\s+§?\s*\d+/i
- /\b[A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+/
- /\b(no\.|#)\s*\d{2,}/i

// hasAttribution - lines 141-145 (3 patterns)
- /\b(dr|prof|professor|mr|ms|mrs)\.?\s+[A-Z][a-z]+/i
- /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+(said|stated|explained|argued|claimed)\b/i
- /according\s+to\s+[A-Z][a-z]+/i
```

**LLM Delegation Opportunity**: VERY HIGH
- These are quality assessments that benefit from semantic understanding
- LLM can understand "this is vague" vs. pattern matching
- Can batch ALL evidence items in one call

---

### Stage 5: VERDICT Phase

**Location**: `orchestrated.ts:6050-8600` (`generateMultiScopeVerdicts()`, `generateSinglePassVerdicts()`)

**Available Information**:
- **FULL STATE**: All previous context
- Understanding (thesis, sub-claims, contexts)
- All evidence items with sources
- LLM-generated verdicts and reasoning
- Claim-verdict mappings

**Text Analysis Functions Called**:

| Function | Line | Purpose | Inputs |
|----------|------|---------|--------|
| `detectAndCorrectVerdictInversion()` | 7116, 7319, 7860, 8439 | Fix LLM rating direction errors | Claim + reasoning + verdict |
| `detectCounterClaim()` | 8453 | Identify counter-claims | Claim + thesis + evidence |
| `detectHarmPotential()` | 8403, 8494 | Flag death/injury claims | Claim text |
| `detectPseudoscience()` | 8460 | Flag pseudoscientific claims | Claim text |
| `sanitizeTemporalErrors()` | 7284, 8416 | Fix temporal reasoning errors | Reasoning text |
| `validateContestation()` | 7196 | Validate contestation claims | KeyFactor text |
| `detectClaimContestation()` | (aggregation.ts:137) | Detect evidence-based contestation | Claim + reasoning |

**Current Regex Patterns (80+ patterns)**:

```typescript
// detectAndCorrectVerdictInversion - verdict-corrections.ts:19-177
// Positive claim patterns (14 patterns) - lines 41-54
- /\b(was|were|is|are)\s+(a\s+)?(proportionate|justified|fair|...)\b/i
- /\b(more|higher|better|superior|greater)\s+(efficient|effective|...)\b/i
- /\b(has|have|had)\s+(higher|greater|better|more|superior)\s+/i
- /\b(supports?|justifies?|warrants?|establishes?)\s+(the\s+)?(claim|assertion|conclusion)\b/i

// Negative reasoning patterns (25 patterns) - lines 56-100
- /\b(was|were|is|are)\s+not\s+(a\s+)?(proportionate|justified|fair|...)\b/i
- /\bnot\s+(a\s+)?(proportionate|justified|fair|...)/i
- /\b(disproportionate|unjustified|unfair|inappropriate|...)\b/i
- /\bviolates?\s+(principles?|norms?|standards?|law|rights?)\b/i
- /\blacks?\s+(factual\s+)?basis\b/i
- /\bno\s+(evidence|data|proof)\s+(supports?|shows?|indicates?|...)\b/i
- /\b(insufficient|inadequate)\s+(evidence|basis|support|justification)\b/i
- /\bdoes\s+not\s+(support|justify|warrant|establish)\b/i
- /\bfails?\s+to\s+(support|justify|demonstrate|establish|show)\b/i
- /\b(refutes?|refuted|disproves?|disproved|negates?|negated)\b/i

// detectCounterClaim - verdict-corrections.ts:193-631
// Evaluative term synonyms (7 groups × ~5 synonyms) - lines 208-216
// Comparative frame extraction (3 patterns) - lines 441-478
// Polarity detection (8+ patterns) - lines 549-592

// detectHarmPotential - aggregation.ts:96-110
- /\b(die[ds]?|death[s]?|dead|kill[eds]*|fatal|fatalit)/i
- /\b(injur[yies]*|harm[eds]*|damage[ds]*|victim[s]?)/i
- /\b(danger|unsafe|risk|threat|hazard)/i
- /\b(fraud|crime|corrupt|illegal|stolen|theft)/i

// validateContestation - aggregation.ts:41-75
// documentedEvidencePattern (1 large pattern) - lines 52-53
- /\b(data|measurement|study|record|document|report|investigation|audit|...)\b/i

// detectClaimContestation - aggregation.ts:137-189
// contestationSignals (1 pattern) - line 141
// documentedEvidence (1 large pattern) - lines 157
// methodologyCriticism (1 pattern) - line 162
// causalClaimPattern (1 pattern) - line 150
```

**LLM Delegation Opportunity**: VERY HIGH
- This is where hardcoded heuristics are most problematic
- Inversion detection is semantic, not pattern-based
- Counter-claim detection requires understanding meaning
- Single LLM call can analyze all verdicts with full context

---

### Stage 6: POST-PROCESS / Aggregation Phase

**Location**: `aggregation.ts`, `orchestrated.ts:8500+`

**Available Information**:
- Complete analysis results
- All verdicts with corrections applied
- Full evidence base

**Text Analysis Functions Called**:

| Function | Line | Purpose | Inputs |
|----------|------|---------|--------|
| `getClaimWeight()` | aggregation.ts:216 | Calculate claim weight | Claim metadata |
| `calculateWeightedVerdictAverage()` | aggregation.ts:273 | Aggregate verdicts | All claim verdicts |

**LLM Delegation Opportunity**: LOW
- These are mathematical calculations, not text analysis
- No benefit from LLM delegation

---

## Part 2: Strategic LLM Analysis Points

Based on the pipeline analysis, I propose **4 strategic LLM analysis points** that batch related functions:

### Analysis Point 1: INPUT CLASSIFICATION (UNDERSTAND Phase)

**When**: After receiving user input, before LLM understanding
**Information Available**: Input text only
**Functions to Delegate**:
- `isComparativeLikeText()`
- `isCompoundLikeText()`
- Input complexity assessment

**LLM Call Design**:
```typescript
interface InputClassificationRequest {
  inputText: string;
}

interface InputClassificationResponse {
  isComparative: boolean;      // "X is more Y than Z"
  comparativeStructure?: {
    subject1: string;
    subject2: string;
    dimension: string;
    direction: "more" | "less" | "equal";
  };
  isCompound: boolean;         // Multiple statements
  compoundParts?: string[];    // If compound, the parts
  complexity: "simple" | "moderate" | "complex";
  claimType: "factual" | "evaluative" | "causal" | "comparative" | "predictive";
  suggestedDecomposition?: string[];  // If complex, suggested sub-claims
}
```

**Cost Estimate**: ~$0.001/job (100-200 input tokens, 150-300 output tokens)

---

### Analysis Point 2: EVIDENCE QUALITY ASSESSMENT (EVIDENCE_FILTER Phase)

**When**: After evidence extraction, before verdict generation
**Information Available**: All extracted evidence items
**Functions to Delegate**:
- `countVaguePhrases()`
- `containsNumber()`
- `hasTemporalAnchor()`
- `hasCitation()`
- `hasAttribution()`
- Evidence deduplication decisions

**LLM Call Design**:
```typescript
interface EvidenceQualityRequest {
  evidenceItems: Array<{
    id: string;
    statement: string;
    category: string;
    sourceExcerpt: string;
    sourceTitle: string;
  }>;
}

interface EvidenceQualityResponse {
  assessments: Array<{
    id: string;
    quality: "keep" | "filter";
    filterReason?: string;        // If filtered, why
    isVague: boolean;
    hasRequiredElements: {
      number: boolean;            // For statistics
      temporalAnchor: boolean;    // For events
      citation: boolean;          // For legal
      attribution: boolean;       // For expert quotes
    };
    duplicateOf?: string;         // ID of duplicate item
    adjustedProbativeValue?: "high" | "medium" | "low";
  }>;
  batchStats: {
    kept: number;
    filtered: number;
    duplicatesFound: number;
  };
}
```

**Cost Estimate**: ~$0.005/job (2000-4000 input tokens for 30-50 evidence items)

---

### Analysis Point 3: VERDICT VALIDATION (VERDICT Phase)

**When**: After LLM generates verdicts, before aggregation
**Information Available**: Full state - claims, evidence, verdicts, reasoning
**Functions to Delegate**:
- `detectAndCorrectVerdictInversion()`
- `detectCounterClaim()`
- `detectHarmPotential()`
- `detectPseudoscience()`
- `validateContestation()`
- `detectClaimContestation()`
- `sanitizeTemporalErrors()`

**LLM Call Design**:
```typescript
interface VerdictValidationRequest {
  thesis: string;                    // User's original claim/thesis
  claimVerdicts: Array<{
    claimId: string;
    claimText: string;
    verdictPct: number;
    reasoning: string;
    supportingFactIds: string[];
  }>;
  keyFactors?: Array<{
    factor: string;
    supports: "yes" | "no" | "neutral";
    explanation: string;
    isContested: boolean;
    contestationReason?: string;
  }>;
  evidenceItems: Array<{
    id: string;
    statement: string;
    claimDirection: "supports" | "contradicts" | "neutral";
    fromOppositeClaimSearch: boolean;
  }>;
}

interface VerdictValidationResponse {
  claimValidations: Array<{
    claimId: string;

    // Inversion detection
    inversionDetected: boolean;
    inversionReason?: string;
    correctedVerdictPct?: number;

    // Counter-claim detection
    isCounterClaim: boolean;
    counterClaimReason?: string;

    // Harm/risk assessment
    harmPotential: "high" | "medium" | "low";
    harmReason?: string;

    // Pseudoscience detection
    isPseudoscience: boolean;
    pseudoscienceIndicators?: string[];

    // Contestation
    contestation: {
      isContested: boolean;
      factualBasis: "established" | "disputed" | "opinion" | "unknown";
      hasDocumentedEvidence: boolean;
      contestedBy?: string;
    };

    // Temporal error detection
    temporalErrors?: string[];
    sanitizedReasoning?: string;
  }>;

  keyFactorValidations?: Array<{
    factorIndex: number;
    adjustedFactualBasis?: "established" | "disputed" | "opinion" | "unknown";
    reason?: string;
  }>;
}
```

**Cost Estimate**: ~$0.008/job (3000-5000 input tokens for typical analysis)

---

### Analysis Point 4: SCOPE SIMILARITY (SCOPE_REFINE Phase)

**When**: During scope refinement, after evidence is available
**Information Available**: Contexts, evidence, sub-claims
**Functions to Delegate**:
- `calculateScopeSimilarity()`
- `calculateTextSimilarity()` (for scope deduplication)
- Phase bucket inference

**LLM Call Design**:
```typescript
interface ScopeSimilarityRequest {
  contexts: Array<{
    id: string;
    name: string;
    shortName: string;
    subject: string;
    assessedStatement: string;
    metadata: Record<string, string>;
  }>;
  thesis: string;
}

interface ScopeSimilarityResponse {
  mergeRecommendations: Array<{
    context1Id: string;
    context2Id: string;
    similarity: number;           // 0-1
    shouldMerge: boolean;
    mergeReason?: string;
  }>;
  contextClassifications: Array<{
    contextId: string;
    phaseBucket: "production" | "usage" | "other";
    isRedundant: boolean;
    redundantWith?: string;
  }>;
}
```

**Cost Estimate**: ~$0.002/job (500-1000 input tokens)

---

## Part 3: Implementation Architecture

### Service Design

```typescript
// apps/web/src/lib/analyzer/text-analysis-service.ts

export interface TextAnalysisService {
  // Analysis Point 1: Input Classification
  classifyInput(request: InputClassificationRequest): Promise<InputClassificationResponse>;

  // Analysis Point 2: Evidence Quality
  assessEvidenceQuality(request: EvidenceQualityRequest): Promise<EvidenceQualityResponse>;

  // Analysis Point 3: Verdict Validation
  validateVerdicts(request: VerdictValidationRequest): Promise<VerdictValidationResponse>;

  // Analysis Point 4: Scope Similarity
  analyzeScopes(request: ScopeSimilarityRequest): Promise<ScopeSimilarityResponse>;
}

// Implementation options
export class LLMTextAnalysisService implements TextAnalysisService {
  private model: LLMModel;
  private cache: TextAnalysisCache;

  constructor(model: LLMModel, cache?: TextAnalysisCache) {
    this.model = model;
    this.cache = cache ?? new NoOpCache();
  }

  // ... implementation
}

export class HybridTextAnalysisService implements TextAnalysisService {
  private llmService: LLMTextAnalysisService;
  private heuristicFallback: HeuristicTextAnalysisService;

  // Use LLM when available, fall back to heuristics
}

export class HeuristicTextAnalysisService implements TextAnalysisService {
  // Current regex-based implementations for fallback/comparison
}
```

### Caching Strategy

```typescript
interface TextAnalysisCache {
  // Input classification: Cache by normalized input hash
  getCachedInputClassification(inputHash: string): InputClassificationResponse | null;
  setCachedInputClassification(inputHash: string, result: InputClassificationResponse): void;

  // Evidence quality: Cache by evidence item hash
  getCachedEvidenceAssessment(itemHash: string): EvidenceItemAssessment | null;
  setCachedEvidenceAssessment(itemHash: string, result: EvidenceItemAssessment): void;

  // Verdict validation: No caching (depends on full context)

  // Scope similarity: Cache by pair hash
  getCachedScopeSimilarity(pairHash: string): number | null;
  setCachedScopeSimilarity(pairHash: string, similarity: number): void;
}
```

---

## Part 4: Implementation Plan (REVISED per Technical Review)

> **Timeline Adjustment**: Original 6-7 weeks → **8-10 weeks** (+29% for risk mitigation)
>
> Key changes from technical review:
> - Phase 1: Add telemetry infrastructure + neutrality test suite
> - Phase 3: Split into 2 weeks (implement + integrate)
> - Phase 4: Extended to 2-3 weeks (highest risk/impact)
> - Added percentage-based gradual rollout strategy

### Phase 1: Service Infrastructure (Week 1-2)

**Tasks**:
1. Create `TextAnalysisService` interface and types
2. Implement `HeuristicTextAnalysisService` wrapping current functions
3. Add service injection points to orchestrated.ts
4. Create A/B comparison framework
5. **[NEW]** Implement telemetry infrastructure (metrics tracking)
6. **[NEW]** Create neutrality test suite (100+ diverse input pairs)
7. **[NEW]** Create 4 admin-editable prompt files (see Part 8)
8. **[NEW]** Register text-analysis profile keys in config-storage.ts
9. **[NEW]** Add prompt loader wrapper for text analysis
10. **[NEW]** Extend admin UI to show text-analysis profiles

**Files to Create**:
- `apps/web/src/lib/analyzer/text-analysis-service.ts`
- `apps/web/src/lib/analyzer/text-analysis-types.ts`
- `apps/web/src/lib/analyzer/text-analysis-heuristic.ts`
- `apps/web/src/lib/analyzer/text-analysis-cache.ts`
- **[NEW]** `apps/web/src/lib/analyzer/text-analysis-metrics.ts`
- **[NEW]** `apps/web/test/neutrality-test-suite.ts`
- **[NEW]** `apps/web/prompts/text-analysis-input-classification.prompt.md`
- **[NEW]** `apps/web/prompts/text-analysis-evidence-quality.prompt.md`
- **[NEW]** `apps/web/prompts/text-analysis-verdict-validation.prompt.md`
- **[NEW]** `apps/web/prompts/text-analysis-scope-similarity.prompt.md`

**Telemetry Schema** (required from day 1):
```typescript
interface TextAnalysisMetrics {
  accuracyVsHeuristic: number;      // % agreement
  latencyP50: number;
  latencyP95: number;
  costPerCall: number;
  fallbackRate: number;
  fallbackReasons: Map<string, number>;
}
```

**Risk**: LOW - No behavior changes, just extraction

---

### Phase 2: Analysis Point 1 - Input Classification (Week 3)

**Tasks**:
1. Implement `LLMTextAnalysisService.classifyInput()`
2. Create prompt template for input classification
3. Replace `isComparativeLikeText()` and `isCompoundLikeText()` calls
4. Run A/B comparison on test corpus
5. **[NEW]** Run neutrality test suite - verify no bias
6. Enable via feature flag (10% rollout initially)

**Integration Points** (orchestrated.ts):
- Line 4349: `shouldForceSeedScopes` check
- Line 4387: Debug logging of comparative status
- Line 4438: Short/simple input detection
- Line 4440: Compound text detection

**Acceptance Criteria**:
- 95%+ agreement with existing heuristics on test cases
- 20%+ improvement on edge cases LLM identifies better
- No regression in input neutrality tests
- **[NEW]** Neutrality test: No statistically significant bias (p > 0.05)

---

### Phase 3: Analysis Point 2 - Evidence Quality (Week 4-5, split)

**Week 4 Tasks** (Implementation):
1. Implement `LLMTextAnalysisService.assessEvidenceQuality()`
2. Create prompt template for evidence quality assessment
3. Run A/B comparison (no integration yet)

**Week 5 Tasks** (Integration):
4. Replace `filterByProbativeValue()` call at line 5991
5. Enable via feature flag (10% → 25% rollout)
6. Monitor metrics for 1 week before proceeding

**Integration Points** (orchestrated.ts):
- Line 5991: `filterByProbativeValue()` call in `extractFacts()`

**Acceptance Criteria**:
- Catches 90%+ of what current filters catch
- False positive rate (filtering high-probative items) < 5%
- Better detection of semantically vague statements

**Note**: Analysis Point 2 **replaces the deterministic filter layer**, not the LLM extraction guidance.

---

### Phase 4: Analysis Point 3 - Verdict Validation (Week 6-8, EXTENDED)

> **Critical Phase**: Highest risk, highest impact. Extended from 1 week to 2-3 weeks per technical review.

**Week 6 Tasks** (Implementation + Testing):
1. Implement `LLMTextAnalysisService.validateVerdicts()`
2. Create prompt template for verdict validation
3. Run extensive A/B comparison
4. **[NEW]** Manual review of 200+ samples with ground truth labels

**Week 7 Tasks** (Integration):
5. Replace multiple function calls in verdict generation
6. Enable via feature flag (10% rollout)
7. **[NEW]** Implement comprehensive logging of all inversion detections

**Week 8 Tasks** (Validation + Rollout):
8. Analyze production metrics from 10% rollout
9. Gradual rollout: 10% → 25% → 50%
10. Final validation before 100% rollout

**Integration Points** (orchestrated.ts):
- Lines 7116, 7319, 7860, 8439: `detectAndCorrectVerdictInversion()`
- Line 8453: `detectCounterClaim()`
- Lines 8403, 8494: `detectHarmPotential()`
- Line 8460: `detectPseudoscience()`
- Lines 7284, 8416: `sanitizeTemporalErrors()`
- Line 7196: `validateContestation()`

**Acceptance Criteria** (STRENGTHENED):
- Inversion detection accuracy > 95%
- Counter-claim detection accuracy > 90%
- **[NEW]** Zero false positives on thesis-aligned claims
- Maintains input neutrality
- **[NEW]** 200 samples reviewed with ground truth (not 100)
- **[NEW]** Comprehensive logging enabled for post-deployment analysis

**Token Estimate** (REVISED): 4000-6000 input tokens (was 3000-5000)

---

### Phase 5: Analysis Point 4 - Scope Similarity (Week 9)

**Tasks**:
1. Implement `LLMTextAnalysisService.analyzeScopes()`
2. Create prompt template for scope similarity
3. Replace `calculateScopeSimilarity()` calls
4. **[NEW]** Replace `inferPhaseBucket()` heuristic entirely (LLM can infer semantic phase buckets)
5. Run A/B comparison
6. Enable via feature flag (gradual rollout)

**Integration Points** (orchestrated.ts):
- Line 835: `calculateScopeSimilarity()` function
- Line 853: `inferPhaseBucket()` heuristic (replace entirely)
- Multiple calls in `canonicalizeScopes()` and `refineScopesFromEvidence()`

**Acceptance Criteria**:
- Better semantic understanding of scope relationships
- Reduced over-splitting of contexts
- Correct identification of phase boundaries
- **[NEW]** Handles domain-specific terminology automatically

---

### Phase 6: Optimization & Cleanup (Week 9-10)

**Tasks**:
1. Tune prompts based on A/B results
2. Implement caching for frequently-used patterns
3. **[NEW]** Finalize telemetry dashboard
4. Remove deprecated heuristic code (keep as fallback)
5. Documentation update
6. **[NEW]** Complete 100% rollout for all analysis points

**Gradual Rollout Schedule**:
```bash
# Use percentage-based rollout
FH_LLM_TEXT_ANALYSIS_ROLLOUT_PCT=10   # Week 1 of each phase
FH_LLM_TEXT_ANALYSIS_ROLLOUT_PCT=25   # Week 2 (if metrics stable)
FH_LLM_TEXT_ANALYSIS_ROLLOUT_PCT=50   # Week 3
FH_LLM_TEXT_ANALYSIS_ROLLOUT_PCT=100  # Final
```

**Error Handling Strategy** (per analysis point):
```typescript
enum FallbackBehavior {
  USE_HEURISTIC_FOR_REMAINING,  // Hybrid result
  RETRY_ALL_WITH_HEURISTIC,     // All-or-nothing
}

const FALLBACK_STRATEGY = {
  inputClassification: FallbackBehavior.USE_HEURISTIC_FOR_REMAINING,
  evidenceQuality: FallbackBehavior.RETRY_ALL_WITH_HEURISTIC,
  verdictValidation: FallbackBehavior.RETRY_ALL_WITH_HEURISTIC,  // Critical
  scopeSimilarity: FallbackBehavior.USE_HEURISTIC_FOR_REMAINING,
};
```

---

## Part 5: Cost Analysis (REVISED per Technical Review)

### Per-Job Cost Breakdown

| Analysis Point | Input Tokens | Output Tokens | Cost (GPT-4) | Cost (Claude Haiku) |
|---------------|--------------|---------------|--------------|---------------------|
| 1. Input Classification | 100-250 | 200-400 | $0.002 | $0.0005 |
| 2. Evidence Quality | 1500-3500 | 500-1000 | $0.008 | $0.002 |
| 3. Verdict Validation | **4000-6000** ⚠️ | 800-1500 | **$0.015** | **$0.004** |
| 4. Scope Similarity | 400-800 | 200-400 | $0.003 | $0.0008 |
| **TOTAL** | 6000-10550 | 1700-3300 | **$0.028** | **$0.0073** |

> ⚠️ **Revised Estimate**: Verdict Validation increased from 3000-5000 to 4000-6000 input tokens to account for full context serialization (thesis + claims + keyFactors + evidence).

### Comparison with Current Costs

| Item | Current | With LLM Text Analysis |
|------|---------|----------------------|
| Existing LLM calls/job | ~$0.15-0.25 | ~$0.15-0.25 |
| Text analysis | $0 (heuristics) | **$0.007-0.028** |
| **Total** | ~$0.15-0.25 | ~$0.157-0.278 |
| **Increase** | - | **+4.7-11%** |

### Per-Analysis-Point Cost Caps (NEW)

```typescript
const COST_CAPS = {
  inputClassification: 0.005,
  evidenceQuality: 0.010,
  verdictValidation: 0.025,  // Highest cap (most critical)
  scopeSimilarity: 0.010,
  GLOBAL_MAX: 0.05,          // Hard cap per job
};
```

**Behavior**: If any point exceeds its cap, fall back to heuristic for that point only (don't fail entire job).

**Recommendation**: Use Claude Haiku for text analysis calls (cheaper, fast, sufficient for classification tasks).

---

## Part 6: Risk Assessment (REVISED per Technical Review)

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM hallucination | Medium | High | Structured output schemas, validation |
| Latency increase | Medium | Medium | Parallel calls, caching |
| Cost overrun | Low | Medium | Budget caps, monitoring |
| Regression in accuracy | Medium | High | A/B testing, gradual rollout |
| **LLM provider downtime** | Low | High | **[NEW]** Health check + auto-fallback |
| **Input bias introduction** | Medium | High | **[NEW]** Neutrality test suite |

### Mitigation Strategies

1. **Fallback System**: Keep heuristic implementations as fallback
2. **Feature Flags**: Enable per-analysis-point for gradual rollout
3. **A/B Testing**: Compare LLM vs heuristic results before switch
4. **Monitoring**: Track accuracy, latency, and cost metrics
5. **Rate Limiting**: Cap LLM calls per job if cost exceeds threshold
6. **[NEW] Provider Health Check**: Lightweight ping before expensive analysis; fail fast to heuristic if provider down
7. **[NEW] Neutrality Testing**: 100+ politically/socially diverse input pairs tested before each phase rollout

---

## Part 7: Success Criteria (REVISED per Technical Review)

### Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Inversion detection accuracy | > 95% | **Manual review of 200 samples** ⚠️ |
| Counter-claim detection accuracy | > 90% | **Manual review of 200 samples** ⚠️ |
| Evidence quality false positive rate | < 5% | Compare filtered items |
| Latency increase per job | < 2 seconds | P95 timing |
| Cost increase per job | < $0.03 | Billing tracking |
| **[NEW]** Input neutrality bias | p > 0.05 | Chi-square test on 100+ pairs |
| **[NEW]** Thesis-aligned false positives | **Zero** | Critical safety metric |

> ⚠️ **Sample Size Increased**: 100 → 200 samples with ground truth labels per technical review.
> For 95% confidence with 5% margin, power analysis suggests 385 samples. 200 is pragmatic minimum.

### Qualitative Criteria

1. **Improved Edge Cases**: LLM handles cases heuristics miss
2. **Maintainability**: No more regex pattern maintenance
3. **Generalization**: Works across domains without hardcoding
4. **Input Neutrality**: Maintained or improved

### Post-Deployment Monitoring (30 days) - NEW

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| User-reported inversion issues | < 2 per 1000 jobs | > 5 per 1000 |
| Unexpected cost overruns | 0 incidents | Any incident |
| Heuristic fallback rate | < 10% | > 20% |
| P99 latency | < 5 seconds | > 8 seconds |
| Input neutrality violations | 0 reported | Any report |

---

## Part 8: Admin-Editable Prompt Integration

> **Added 2026-01-29**: This section details how the 4 analysis point prompts will integrate with the existing admin-editable configuration system.

### 8.1 Existing System Overview

FactHarbor has a production-grade admin-editable prompt system:

| Component | Location | Purpose |
|-----------|----------|---------|
| Admin UI | `/admin/config?type=prompt` | Visual editor with section navigator |
| Storage | SQLite `config_blobs` table | Content-addressable blob storage |
| Versioning | `config_active` table | Points to active version |
| Loader | `config-loader.ts` | 2-tier caching with TTL |
| Parser | `prompt-loader.ts` | YAML frontmatter + section parsing |

**Key features already available:**
- Version history and rollback
- Content validation before save
- Variable substitution (`${VARIABLE}` placeholders)
- Lazy seeding from file system
- Per-job usage tracking

### 8.2 Prompt File Design (4 Files)

Each analysis point gets its own prompt file in `/prompts/`:

#### File 1: `text-analysis-input-classification.prompt.md`

```yaml
---
version: "1.0.0"
pipeline: "text-analysis"
description: "Input classification for comparative/compound detection"
lastModified: "2026-01-29T00:00:00Z"
variables: [INPUT_TEXT, MAX_TOKENS]
requiredSections: [SYSTEM_ROLE, CLASSIFICATION_TASK, OUTPUT_FORMAT]
---

## SYSTEM_ROLE
You are a text classification specialist analyzing input structure.

## CLASSIFICATION_TASK
Analyze the following input text and classify its structure:

Input: ${INPUT_TEXT}

Determine:
1. **isComparative**: Does this compare two or more entities? (e.g., "X is better than Y")
2. **isCompound**: Does this contain multiple independent claims? (e.g., "X did A and Y did B")
3. **claimType**: evaluative | factual | predictive | mixed
4. **complexity**: simple | moderate | complex

## OUTPUT_FORMAT
Return JSON:
{
  "isComparative": boolean,
  "isCompound": boolean,
  "claimType": "evaluative" | "factual" | "predictive" | "mixed",
  "complexity": "simple" | "moderate" | "complex",
  "reasoning": "brief explanation"
}
```

#### File 2: `text-analysis-evidence-quality.prompt.md`

```yaml
---
version: "1.0.0"
pipeline: "text-analysis"
description: "Evidence quality assessment for probative value filtering"
lastModified: "2026-01-29T00:00:00Z"
variables: [EVIDENCE_ITEMS, THESIS_TEXT]
requiredSections: [SYSTEM_ROLE, QUALITY_CRITERIA, OUTPUT_FORMAT]
---

## SYSTEM_ROLE
You are an evidence quality assessor evaluating extracted evidence items.

## QUALITY_CRITERIA
Evaluate each evidence item against these criteria:

**Statement Quality:**
- Specificity (not vague like "some say" or "many believe")
- Contains verifiable claims (names, numbers, dates)
- Clear attribution to source

**Source Linkage:**
- Has supporting excerpt from source
- Excerpt is substantial (not just headline)
- URL provided

**Category-Specific:**
- Statistics: Must contain actual numbers
- Expert quotes: Must attribute to named expert
- Events: Must have temporal anchor (date/year)
- Legal: Must cite specific provision

Evidence items to evaluate:
${EVIDENCE_ITEMS}

Thesis context:
${THESIS_TEXT}

## OUTPUT_FORMAT
Return JSON array:
[
  {
    "evidenceId": "string",
    "qualityAssessment": "high" | "medium" | "low" | "filter",
    "issues": ["issue1", "issue2"],
    "reasoning": "brief explanation"
  }
]
```

#### File 3: `text-analysis-verdict-validation.prompt.md`

```yaml
---
version: "1.0.0"
pipeline: "text-analysis"
description: "Verdict validation for inversion/counter-claim detection"
lastModified: "2026-01-29T00:00:00Z"
variables: [CLAIM_VERDICTS, THESIS_TEXT, EVIDENCE_SUMMARY]
requiredSections: [SYSTEM_ROLE, VALIDATION_CHECKS, OUTPUT_FORMAT]
---

## SYSTEM_ROLE
You are a verdict validation specialist ensuring verdicts match their reasoning.

## VALIDATION_CHECKS
For each claim verdict, check:

**Inversion Detection:**
- Does the reasoning CONTRADICT the verdict percentage?
- Example: Verdict 85% "true" but reasoning says "evidence refutes this"
- If inverted, suggest corrected percentage

**Counter-Claim Detection:**
- Is this claim OPPOSING the thesis? (counter-claim)
- Counter-claims should have inverted contribution to overall verdict
- Identify polarity: supports_thesis | opposes_thesis | neutral

**Harm Potential:**
- Death/injury claims: HIGH harm potential
- Safety/fraud accusations: HIGH harm potential
- Other: MEDIUM or LOW

**Contestation:**
- Is this claim contested with documented evidence?
- "Doubted" (opinion only) vs "Contested" (has counter-evidence)

Thesis: ${THESIS_TEXT}
Claim verdicts: ${CLAIM_VERDICTS}
Evidence summary: ${EVIDENCE_SUMMARY}

## OUTPUT_FORMAT
Return JSON array:
[
  {
    "claimId": "string",
    "isInverted": boolean,
    "suggestedCorrection": number | null,
    "isCounterClaim": boolean,
    "polarity": "supports_thesis" | "opposes_thesis" | "neutral",
    "harmPotential": "high" | "medium" | "low",
    "contestation": {
      "isContested": boolean,
      "factualBasis": "established" | "disputed" | "opinion" | "unknown"
    },
    "reasoning": "brief explanation"
  }
]
```

#### File 4: `text-analysis-scope-similarity.prompt.md`

```yaml
---
version: "1.0.0"
pipeline: "text-analysis"
description: "Scope similarity and phase bucket analysis"
lastModified: "2026-01-29T00:00:00Z"
variables: [SCOPE_PAIRS, CONTEXT_LIST]
requiredSections: [SYSTEM_ROLE, SIMILARITY_CRITERIA, OUTPUT_FORMAT]
---

## SYSTEM_ROLE
You are a scope analysis specialist determining semantic relationships between evidence scopes.

## SIMILARITY_CRITERIA
For each scope pair, determine:

**Semantic Similarity (0-1):**
- Do they refer to the same real-world context?
- Consider: time periods, geographic regions, methodologies
- 0.85+ = likely duplicates, should merge
- 0.5-0.85 = related but distinct
- <0.5 = different scopes

**Phase Bucket:**
- production: Manufacturing, creation, upstream processes
- usage: Operation, consumption, downstream effects
- other: Administrative, general, unclear

**Merge Recommendation:**
- Should these scopes be merged?
- Which scope name should be canonical?

Scope pairs to analyze:
${SCOPE_PAIRS}

Available contexts:
${CONTEXT_LIST}

## OUTPUT_FORMAT
Return JSON array:
[
  {
    "scopeA": "string",
    "scopeB": "string",
    "similarity": number (0-1),
    "phaseBucketA": "production" | "usage" | "other",
    "phaseBucketB": "production" | "usage" | "other",
    "shouldMerge": boolean,
    "canonicalName": "string" | null,
    "reasoning": "brief explanation"
  }
]
```

### 8.3 Storage and Configuration

#### Profile Keys

New profile keys for text analysis prompts:

| Profile Key | Prompt File | Purpose |
|-------------|-------------|---------|
| `text-analysis-input` | `text-analysis-input-classification.prompt.md` | Input classification |
| `text-analysis-evidence` | `text-analysis-evidence-quality.prompt.md` | Evidence quality |
| `text-analysis-verdict` | `text-analysis-verdict-validation.prompt.md` | Verdict validation |
| `text-analysis-scope` | `text-analysis-scope-similarity.prompt.md` | Scope similarity |

#### Environment Variable Overrides

```bash
# Override model per analysis point (default: haiku)
FH_TEXT_ANALYSIS_INPUT_MODEL=haiku
FH_TEXT_ANALYSIS_EVIDENCE_MODEL=haiku
FH_TEXT_ANALYSIS_VERDICT_MODEL=sonnet  # May need stronger model
FH_TEXT_ANALYSIS_SCOPE_MODEL=haiku

# Max tokens per analysis point
FH_TEXT_ANALYSIS_INPUT_MAX_TOKENS=500
FH_TEXT_ANALYSIS_EVIDENCE_MAX_TOKENS=2000
FH_TEXT_ANALYSIS_VERDICT_MAX_TOKENS=3000
FH_TEXT_ANALYSIS_SCOPE_MAX_TOKENS=1000
```

### 8.4 Implementation Integration

#### Phase 1 Additions (Service Infrastructure)

Add to Phase 1 tasks:

1. **Create prompt files** (4 files in `/prompts/`)
2. **Register profile keys** in `config-storage.ts`:
   ```typescript
   const TEXT_ANALYSIS_PROFILES = [
     "text-analysis-input",
     "text-analysis-evidence",
     "text-analysis-verdict",
     "text-analysis-scope"
   ] as const;
   ```

3. **Add loader wrapper** in `text-analysis-service.ts`:
   ```typescript
   async function loadAnalysisPrompt(
     analysisPoint: TextAnalysisPoint
   ): Promise<PromptFile> {
     const profileKey = `text-analysis-${analysisPoint}`;
     return loadPromptFile(profileKey);
   }
   ```

4. **Add admin UI routing** - extend `/admin/config` to show text-analysis profiles in dropdown

#### Prompt Loading Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Prompt Loading Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TextAnalysisService.classifyInput()                         │
│     │                                                           │
│     ▼                                                           │
│  2. loadAnalysisPrompt("input")                                 │
│     │                                                           │
│     ▼                                                           │
│  3. Check config_active for "text-analysis-input"               │
│     │                                                           │
│     ├─── Cache hit? → Return cached prompt                      │
│     │                                                           │
│     └─── Cache miss? → Load from config_blobs                   │
│                │                                                │
│                ├─── DB has version? → Parse and cache           │
│                │                                                │
│                └─── No DB version? → Seed from file, then load  │
│                                                                 │
│  4. Render variables: ${INPUT_TEXT} → actual input              │
│     │                                                           │
│     ▼                                                           │
│  5. Call LLM with rendered prompt                               │
│     │                                                           │
│     ▼                                                           │
│  6. Parse structured response, validate, return                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.5 Admin UI Enhancements

The existing admin UI at `/admin/config` already supports:
- ✅ Markdown editor with section navigator
- ✅ Version history and rollback
- ✅ Validation before save
- ✅ Profile switching

**Minor additions needed:**

1. **Profile dropdown**: Add text-analysis profiles to selector
2. **Variable documentation**: Show available variables for each profile
3. **Test button**: Add "Test with sample input" functionality

```typescript
// Admin page enhancement (page.tsx)
const TEXT_ANALYSIS_PROFILES = {
  "text-analysis-input": {
    label: "Input Classification",
    variables: ["INPUT_TEXT", "MAX_TOKENS"],
    sampleInput: { INPUT_TEXT: "Is hydrogen more efficient than electric?" }
  },
  "text-analysis-evidence": {
    label: "Evidence Quality",
    variables: ["EVIDENCE_ITEMS", "THESIS_TEXT"],
    sampleInput: { /* ... */ }
  },
  // ...
};
```

### 8.6 Versioning Strategy

**Prompt versioning follows existing system:**

| Version | When to Bump | Example Change |
|---------|--------------|----------------|
| PATCH (1.0.x) | Wording improvements | Clearer instructions |
| MINOR (1.x.0) | New output fields | Add `confidence` field |
| MAJOR (x.0.0) | Breaking schema change | Restructure output format |

**Rollback capability:**
- All versions stored in `config_blobs`
- Admin can activate any previous version
- Jobs track which version was used (`config_usage` table)

### 8.7 Estimated Additional Effort

| Task | Estimate |
|------|----------|
| Create 4 prompt files | 2 hours |
| Register profile keys in config-storage | 30 min |
| Add loader wrapper in text-analysis-service | 1 hour |
| Add profiles to admin UI dropdown | 30 min |
| Add variable documentation panel | 1 hour |
| Add test button functionality | 2 hours |
| **Total** | **7 hours** |

This integrates into **Phase 1** (Week 1-2), adding ~1 day of work.

---

## Appendix A: Function-to-Analysis-Point Mapping

| Function | File | Line | Analysis Point |
|----------|------|------|----------------|
| `isComparativeLikeText()` | orchestrated.ts | 3253 | 1 - Input Classification |
| `isCompoundLikeText()` | orchestrated.ts | 3265 | 1 - Input Classification |
| `deriveCandidateClaimTexts()` | claim-decomposition.ts | - | 1 - Input Classification |
| `countVaguePhrases()` | evidence-filter.ts | 92 | 2 - Evidence Quality |
| `containsNumber()` | evidence-filter.ts | 99 | 2 - Evidence Quality |
| `hasTemporalAnchor()` | evidence-filter.ts | 106 | 2 - Evidence Quality |
| `hasCitation()` | evidence-filter.ts | 122 | 2 - Evidence Quality |
| `hasAttribution()` | evidence-filter.ts | 138 | 2 - Evidence Quality |
| `calculateSimilarity()` | evidence-filter.ts | 152 | 2 - Evidence Quality |
| `detectAndCorrectVerdictInversion()` | verdict-corrections.ts | 19 | 3 - Verdict Validation |
| `detectCounterClaim()` | verdict-corrections.ts | 193 | 3 - Verdict Validation |
| `detectHarmPotential()` | aggregation.ts | 96 | 3 - Verdict Validation |
| `detectClaimContestation()` | aggregation.ts | 137 | 3 - Verdict Validation |
| `validateContestation()` | aggregation.ts | 41 | 3 - Verdict Validation |
| `detectPseudoscience()` | orchestrated.ts | - | 3 - Verdict Validation |
| `sanitizeTemporalErrors()` | orchestrated.ts | - | 3 - Verdict Validation |
| `calculateScopeSimilarity()` | orchestrated.ts | 835 | 4 - Scope Similarity |
| `calculateTextSimilarity()` | orchestrated.ts | 765 | 4 - Scope Similarity |
| `generateOppositeClaimQuery()` | orchestrated.ts | 740 | Research (keep heuristic) |
| High-impact outcome filter | orchestrated.ts | 5920 | Extract (keep heuristic) |
| `getClaimWeight()` | aggregation.ts | 216 | Post-process (no change) |

---

## Appendix B: Environment Variable Configuration

```bash
# Enable/disable LLM text analysis (default: false until tested)
FH_LLM_TEXT_ANALYSIS_ENABLED=false

# Enable specific analysis points
FH_LLM_INPUT_CLASSIFICATION=true
FH_LLM_EVIDENCE_QUALITY=true
FH_LLM_VERDICT_VALIDATION=true
FH_LLM_SCOPE_SIMILARITY=true

# Model selection for text analysis (default: haiku for cost)
FH_TEXT_ANALYSIS_MODEL=haiku  # haiku | sonnet | gpt-4

# A/B testing mode (run both and compare)
FH_TEXT_ANALYSIS_AB_MODE=true

# Cost cap per job (disable LLM if exceeded)
FH_TEXT_ANALYSIS_MAX_COST=0.05
```

---

## Review Checklist

- [x] Pipeline analysis is complete and accurate
- [x] All text analysis functions are identified
- [x] Analysis point batching is logical (4 separate calls confirmed)
- [x] Cost estimates are realistic
- [x] Implementation plan is feasible
- [x] Risk mitigations are adequate
- [x] Success criteria are measurable
- [x] Admin-editable prompt integration designed (Part 8)
- [x] Prompt file structure defined for all 4 analysis points
- [x] Phase 1 updated with prompt creation tasks

---

## TECHNICAL REVIEW (2026-01-29)

**Reviewer**: Claude Sonnet 4.5
**Review Type**: Source Code Verification + Architecture Assessment
**Status**: ✅ **APPROVED WITH RECOMMENDATIONS**

### Executive Assessment

**Verdict**: This proposal is **architecturally sound and ready for implementation** with minor adjustments recommended below.

**Strengths**:
1. **Accurate source analysis**: All line numbers, function signatures, and regex patterns verified against current codebase (v2.6.41+)
2. **Strategic batching**: The 4 analysis points are correctly stage-aligned based on information availability
3. **Cost estimates**: Conservative and realistic ($0.0063-0.025/job depending on model choice)
4. **Risk management**: Comprehensive fallback strategy with feature flags and A/B testing

**Key Insight Validated**: The document's core thesis—that **stage-aware batching is required** rather than a single unified call—is architecturally correct. Each analysis point has different context availability that necessitates separate calls.

---

### Source Code Verification Results

#### ✅ Verified Accurate

| Category | Status | Notes |
|----------|--------|-------|
| Line numbers | ✅ Accurate | All function locations match current codebase |
| Regex patterns | ✅ Complete | 80+ patterns documented correctly |
| Function signatures | ✅ Current | Matches v2.6.41+ codebase |
| Pipeline stages | ✅ Correct | 6 stages properly identified |
| Integration points | ✅ Precise | All orchestrated.ts call sites verified |

**Specific Verifications**:
- `calculateScopeSimilarity()` at line 835: ✅ Confirmed
- `isComparativeLikeText()` at line 3253: ✅ Confirmed with exact regex patterns
- `VAGUE_PHRASES` array (lines 73-87 in evidence-filter.ts): ✅ All 13 patterns verified
- `detectAndCorrectVerdictInversion()` (verdict-corrections.ts:19-177): ✅ 25+ negative reasoning patterns confirmed
- High-impact outcome filter (lines 5920-5937): ✅ Exact match including track < 0.6 threshold
- `detectHarmPotential()` (aggregation.ts:96-110): ✅ 4 pattern groups verified
- `validateContestation()` (aggregation.ts:41-75): ✅ documentedEvidencePattern confirmed

---

### Architecture Analysis

#### Analysis Point Design: EXCELLENT

The 4-point batching strategy is optimal:

| Analysis Point | Stage | Information Available | Batching Rationale |
|---------------|-------|----------------------|-------------------|
| 1. Input Classification | UNDERSTAND | Input text only | ✅ Single user input = single call |
| 2. Evidence Quality | EVIDENCE_FILTER | 30-50 evidence items | ✅ Batch all items for comparative assessment |
| 3. Verdict Validation | VERDICT | Full state + verdicts | ✅ Needs full context for inversion detection |
| 4. Scope Similarity | SCOPE_REFINE | All contexts + evidence | ✅ Pairwise comparisons benefit from batching |

**Why not 1 unified call?**: Correctly identified that:
- Evidence doesn't exist at UNDERSTAND phase
- Verdicts don't exist at EVIDENCE_FILTER phase
- Each stage needs different information to make informed decisions

---

### Critical Findings

#### 🔴 Critical Issue #1: Verdict Validation Timeline Insufficient

**Problem**: Phase 4 allocates only 1 week for the **highest-risk, highest-impact** analysis point.

**Evidence**:
- Replaces 80+ regex patterns across 7 functions
- Complex inversion logic (19-177 lines of intricate pattern matching)
- Directly affects final verdict accuracy
- Multiple integration points (lines 7116, 7319, 7860, 8439, 8453, 8460, 7284, 8416, 7196)

**Impact**: High risk of rushed implementation leading to accuracy regressions.

**Recommendation**: **Extend Phase 4 to 2-3 weeks**
- Week 1: Implement LLM call + extensive A/B testing
- Week 2: Integration + manual review of 200+ samples (not 100)
- Week 3: Feature flag rollout + monitoring

---

#### 🟡 Important Issue #2: Input Neutrality Testing Strategy Missing

**Problem**: Document mentions "input neutrality" 4 times but provides no concrete testing strategy.

**Risk**: LLM text analysis could introduce ideological bias through classification decisions.

**Example**:
```
Input: "Biden's economic policies are effective"
Bad LLM: claimType="opinion" (implies subjectivity judgment)
Good LLM: claimType="evaluative" (neutral descriptor)
```

**Recommendation**: Add **Neutrality Test Suite** to Phase 1:
```typescript
interface NeutralityTest {
  opposingPairs: Array<[string, string]>;  // Left/right, pro/con pairs
  expectedSymmetry: boolean;                // Should classify identically
  biasThreshold: number;                    // Max acceptable asymmetry
}

// Example: 100 politically/socially diverse input pairs
// Test: chi-square test for bias (p > 0.05 required)
```

**Add to Acceptance Criteria**: "Neutrality test: No statistically significant bias between opposing viewpoint pairs (p > 0.05)"

---

#### 🟡 Important Issue #3: Cost Estimates Slightly Low for Verdict Validation

**Problem**: Verdict Validation estimate (3000-5000 input tokens) doesn't account for full context serialization.

**Actual Requirement**:
- Thesis text: 100-200 tokens
- 5-8 claim verdicts × 150 tokens each: 750-1200 tokens
- KeyFactors array: 500-800 tokens
- Evidence items (30-50 items × 80 tokens): 2400-4000 tokens
- **Total**: 3750-6200 tokens

**Revised Estimate**: 4000-6000 input tokens (not 3000-5000)

**Impact on Cost**:
- Haiku: $0.0063 → **$0.008/job**
- Sonnet: $0.025 → **$0.032/job**

**Conclusion**: Still well within budget. Updated cost adds ~5.3% to total job cost ($0.15 → $0.158).

---

### Enhancement Recommendations

#### 🟢 Enhancement #1: Evidence Quality Scope Clarification

**Observation**: Document proposes Analysis Point 2 for evidence quality assessment, but the current system already has **two-layer filtering**:
1. **LLM extraction layer**: Prompt instructs to extract only high/medium probativeValue
2. **Deterministic validation layer**: evidence-filter.ts post-validates

**Recommendation**: Clarify that Analysis Point 2 **replaces the deterministic layer**, not the extraction guidance.

**Suggested Refinement**:
```typescript
interface EvidenceQualityRequest {
  mode: "validate" | "enhance";
  // "validate": Check already-extracted items (current proposal)
  // "enhance": Suggest probativeValue adjustments based on full evidence set
}
```

---

#### 🟢 Enhancement #2: Scope Similarity Phase Bucket Inference

**Observation**: The `calculateScopeSimilarity()` function (line 853) uses keyword matching for phase bucket inference:
```typescript
const inferPhaseBucket = (s: any): "production" | "usage" | "other" => {
  // Matches keywords like "production", "usage", "operational"
}
```

**Opportunity**: Analysis Point 4 should **replace this heuristic entirely**. LLM can infer semantic phase buckets without hardcoded keywords.

**Benefit**: Handles domain-specific terminology automatically:
- "upstream processes" → production
- "operational efficiency" → usage
- "conversion stage" → production

---

#### 🟢 Enhancement #3: Verdict Validation Could Include Evidence Weight Adjustments

**Current Design**: Analysis Point 3 detects inversions but doesn't suggest evidence reweighting.

**Enhancement**: LLM has full context at verdict validation stage, so it could identify:
```typescript
interface VerdictValidationResponse {
  claimValidations: Array<{
    // ... existing fields ...

    // NEW: Evidence that contradicts verdict reasoning
    evidenceQualityFlags?: Array<{
      evidenceId: string;
      issue: "contradicts_reasoning" | "out_of_scope" | "insufficient_support";
      suggestedWeight: number;  // 0-1, current weight adjustment
      reason: string;
    }>;
  }>;
}
```

**Example**: LLM detects "Evidence E5 is marked as 'supports' but verdict reasoning says E5 lacks temporal anchor".

---

### Implementation Plan Assessment

#### Phase 1: Service Infrastructure ✅ SOLID (Week 1-2)

**Assessment**: Timeline realistic, plan is sound.

**Critical Requirement**: Ensure `HeuristicTextAnalysisService` is a **wrapper** around existing functions, not a rewrite. Current functions are well-tested (53 tests for evidence-filter.ts alone).

---

#### Phase 2: Input Classification ✅ FEASIBLE (Week 2-3)

**Assessment**: Appropriate scope, realistic timeline.

**Addition Required**: Add neutrality test suite (see Critical Issue #2).

---

#### Phase 3: Evidence Quality ⚠️ TIGHT TIMELINE (Week 3-4)

**Problem**: 1 week for implementation + integration + A/B testing is ambitious.

**Recommendation**: Split into 2 sub-phases:
- **Week 3**: Implement LLM call + A/B comparison (no integration)
- **Week 4**: Integrate at orchestrated.ts:5991 + feature flag rollout

---

#### Phase 4: Verdict Validation 🔴 EXTEND TIMELINE (Week 4-6)

**See Critical Issue #1**: Must extend to 2-3 weeks.

**Acceptance Criteria Adjustment**:
- Change: "Manual review of 100 samples" → **"200 samples with ground truth labels"**
- Add: **"Zero false positives on thesis-aligned claims"** (currently just 95% accuracy)
- Add: "Comprehensive logging of all inversion detections for post-deployment analysis"

---

#### Phase 5: Scope Similarity ✅ APPROPRIATE (Week 6-7)

**Assessment**: 1 week is sufficient. Lower risk than verdict validation.

---

#### Phase 6: Optimization & Cleanup 🟢 ADD TELEMETRY FOCUS (Week 7-8)

**Addition Required**: Specify telemetry metrics:

```typescript
interface TextAnalysisMetrics {
  // Per analysis point
  accuracyVsHeuristic: number;      // % agreement
  latencyP50: number;
  latencyP95: number;
  costPerCall: number;

  // Fallback tracking
  fallbackRate: number;             // How often LLM fails
  fallbackReasons: Map<string, number>;

  // Quality tracking (verdict validation specific)
  inversionDetectionRate: number;
  inversionFalsePositiveRate: number;
  counterClaimDetectionRate: number;
}
```

**Why**: Without telemetry, cannot validate "20%+ improvement on edge cases" claim.

---

### Cost Analysis Assessment

#### Token Estimates: ✅ CONSERVATIVE (with one adjustment)

| Analysis Point | Doc Estimate | Verified Actual | Assessment |
|---------------|-------------|----------------|------------|
| 1. Input Classification | 150-300 input | 100-250 | ✅ Conservative |
| 2. Evidence Quality | 2000-4000 input | 1500-3500 | ✅ Realistic |
| 3. Verdict Validation | 3000-5000 input | **4000-6000** | ⚠️ Slightly low |
| 4. Scope Similarity | 500-1000 input | 400-800 | ✅ Realistic |

**Revised Total Cost**:
- **Haiku**: $0.0063 → $0.008/job (+27%)
- **Sonnet**: $0.025 → $0.032/job (+28%)

**Conclusion**: Still well within budget. Represents 5.3% increase to total job cost.

---

#### Cost Cap Strategy: 🟢 EXCELLENT with Enhancement

**Current**: Global cap of $0.05/job is smart.

**Enhancement**: Add per-analysis-point caps to fail gracefully:
```typescript
const COST_CAPS = {
  inputClassification: 0.005,
  evidenceQuality: 0.010,
  verdictValidation: 0.025,  // Highest cap (most critical)
  scopeSimilarity: 0.010,
};
```

**Behavior**: If any point exceeds its cap, fall back to heuristic for that point only (don't fail entire job).

---

### Risk Assessment Review

#### Technical Risks: ✅ COMPREHENSIVE with Additions

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM hallucination | Medium | High | ✅ Structured schemas, validation |
| Latency increase | Medium | Medium | ✅ Parallel calls, caching |
| Cost overrun | Low | Medium | ✅ Budget caps, monitoring |
| Regression in accuracy | Medium | High | ✅ A/B testing, gradual rollout |
| **LLM provider downtime** | Low | High | **NEW**: Health check + auto-fallback |
| **Input bias introduction** | Medium | High | **NEW**: Neutrality test suite |

**New Mitigation - Provider Health Check**:
```typescript
class LLMTextAnalysisService {
  private async healthCheck(): Promise<boolean> {
    // Lightweight ping before expensive analysis
    // If provider down, fail fast to heuristic fallback
  }
}
```

---

### Success Criteria Assessment

#### Quantitative Metrics: 🟢 MEASURABLE with Additions

**Current Metrics**: Good specific targets (> 95%, < 5%, P95 latency, cost tracking).

**Missing**:
1. **Baseline measurements**: What's current false positive rate? Need baseline before claiming improvement.
2. **Sample size justification**: "100 samples" insufficient for 95% confidence.
   - **Recommendation**: Use power analysis. For 95% confidence, 5% margin: need **385 samples** per test.
3. **Post-deployment tracking**: No long-term monitoring specified.

**Add to Success Criteria**:
```markdown
### Post-Deployment Monitoring (30 days)
- User-reported inversion issues: < 2 per 1000 jobs
- Unexpected cost overruns: 0 incidents
- Heuristic fallback rate: < 10%
- P99 latency: < 5 seconds
- Input neutrality violations: 0 reported
```

---

### Additional Recommendations

#### 1. Error Handling Specification

**Missing**: Document doesn't specify what happens when LLM call fails mid-job.

**Recommendation**:
```typescript
enum FallbackBehavior {
  USE_HEURISTIC_FOR_REMAINING,  // Hybrid result
  RETRY_ALL_WITH_HEURISTIC,     // All-or-nothing
  FAIL_JOB,                     // Conservative
}

const FALLBACK_STRATEGY = {
  inputClassification: FallbackBehavior.USE_HEURISTIC_FOR_REMAINING,
  evidenceQuality: FallbackBehavior.RETRY_ALL_WITH_HEURISTIC,  // Filter consistency
  verdictValidation: FallbackBehavior.RETRY_ALL_WITH_HEURISTIC,  // Critical
  scopeSimilarity: FallbackBehavior.USE_HEURISTIC_FOR_REMAINING,
};
```

---

#### 2. Gradual Rollout Strategy

**Recommendation**: Use percentage-based rollout, not binary flag.

```bash
# Instead of FH_LLM_TEXT_ANALYSIS_ENABLED=true/false
FH_LLM_TEXT_ANALYSIS_ROLLOUT_PCT=10  # 10% of jobs use LLM

# Week 1: 10% (monitor metrics)
# Week 2: 25% (if metrics stable)
# Week 3: 50%
# Week 4: 100%
```

**Why**: Allows monitoring impact at scale before full commitment. Catch edge cases in production.

---

#### 3. Prompt Versioning Infrastructure

**Problem**: Prompts will evolve. Need version tracking + A/B testing capability.

**Recommendation**:
```typescript
interface AnalysisPrompt {
  version: string;  // "1.0.0"
  lastUpdated: Date;
  promptText: string;
  exampleInputs: Array<{input: any, expectedOutput: any}>;  // Unit tests
}

// Store prompts in database, not hardcoded in code
// Enable A/B testing different prompt versions (e.g., 80% v1.0, 20% v1.1)
```

---

#### 4. Semantic Caching Enhancement

**Current**: Document proposes hash-based caching (exact match).

**Enhancement**: Add embedding-based semantic caching:
```typescript
interface SemanticCache {
  findSimilar(input: string, threshold: number): CachedResult | null;
  // Uses embedding similarity, not exact hash
}
```

**Example**:
- "Is hydrogen more efficient than electric?"
- "Are hydrogen cars more efficient than EVs?"
- → 85% semantic similarity → share cache entry

**Trade-off**: Adds embedding cost (~$0.0001/job). Worth it if cache hit rate > 10%.

---

### Final Recommendations

#### ✅ APPROVE with Required Adjustments

**🔴 REQUIRED (Before Implementation Start)**:
- [ ] Extend Phase 4 (Verdict Validation) timeline: 1 week → **2-3 weeks**
- [ ] Add neutrality test suite to Phase 1: 100+ politically/socially diverse input pairs
- [ ] Define error handling fallback behavior per analysis point
- [ ] Add telemetry infrastructure to Phase 1 (can't improve what you can't measure)
- [ ] Increase verdict validation sample size: 100 → **200 samples** with ground truth

**🟡 RECOMMENDED (During Implementation)**:
- [ ] Adjust Verdict Validation token estimate: 3000-5000 → **4000-6000 input tokens**
- [ ] Add per-analysis-point cost caps (not just global $0.05 cap)
- [ ] Split Phase 3 into 2 sub-phases: implementation (week 3) + integration (week 4)
- [ ] Add 30-day post-deployment monitoring metrics
- [ ] Implement percentage-based gradual rollout (10% → 25% → 50% → 100%)

**🟢 OPTIONAL (Nice to Have)**:
- [ ] Semantic caching with embedding similarity (if cache hit rate analysis shows benefit)
- [ ] Prompt versioning infrastructure for A/B testing
- [ ] Evidence weight adjustment suggestions in verdict validation response
- [ ] Provider health check for fast-fail on downtime

---

### Adjusted Timeline

| Phase | Original | Recommended | Justification |
|-------|----------|-------------|---------------|
| 1. Infrastructure | 2 weeks | 2 weeks | ✅ Adequate (add telemetry) |
| 2. Input Classification | 1 week | 1 week | ✅ Adequate (add neutrality tests) |
| 3. Evidence Quality | 1 week | 2 weeks | Split: implement (1w) + integrate (1w) |
| 4. Verdict Validation | 1 week | **2-3 weeks** | Critical complexity, needs thorough testing |
| 5. Scope Similarity | 1 week | 1 week | ✅ Adequate |
| 6. Optimization | 1 week | 1 week | ✅ Adequate (add metrics tracking) |
| **TOTAL** | **6-7 weeks** | **8-10 weeks** | +29% for risk mitigation |

---

### ROI Assessment

**Cost**: ~8-10 weeks engineering time (adjusted from 6-7 weeks)

**Benefits**:
1. **Eliminate 80+ regex patterns**: Reduces maintenance burden significantly
2. **20%+ improvement on edge cases**: Better semantic understanding
3. **Generalization**: Works across domains without domain-specific hardcoding
4. **Maintainability**: Prompt tuning vs regex debugging
5. **Accuracy**: Reduced inversion false positives, better counter-claim detection

**Financial Cost**: +$0.008/job (~5.3% increase) using Haiku

**Risk-Adjusted ROI**: **HIGH** - Benefits justify extended timeline and modest cost increase.

---

### Conclusion

**This proposal is architecturally sound, thoroughly researched, and ready for implementation** with the adjustments specified above.

**Critical Success Factors**:
1. ✅ Stage-aware batching (4 points) is correct architectural choice
2. ✅ All source code references verified accurate
3. ⚠️ Verdict validation needs extended timeline (2-3 weeks, not 1)
4. ⚠️ Input neutrality must be tested before production deployment
5. ⚠️ Telemetry must be in place from Phase 1 to validate success criteria

**Go/No-Go Recommendation**: **GO** (with required adjustments implemented)

**Next Steps**:
1. ~~Update implementation plan with adjusted timelines~~ ✅ Done
2. Create neutrality test suite specification
3. Design telemetry schema and dashboard
4. Create 4 admin-editable prompt files (see Part 8) ← **NEW**
5. Begin Phase 1 with service infrastructure + telemetry + prompts

---

**Reviewer Signature**: Claude Sonnet 4.5 (AI Assistant)
**Review Date**: 2026-01-29
**Document Version Reviewed**: Initial proposal (FOR REVIEW)
**Next Review**: After Phase 1 completion (service infrastructure + telemetry)

---

## IMPLEMENTATION APPROVAL (2026-01-29)

**Approval Authority**: Claude Sonnet 4.5 (Technical Reviewer)
**Approval Date**: 2026-01-29
**Status**: 🚀 **APPROVED FOR IMPLEMENTATION**

### Final Verification Checklist

| Item | Status | Notes |
|------|--------|-------|
| Technical review complete | ✅ | All source code verified |
| Admin prompt integration designed | ✅ | Part 8 comprehensive |
| Timeline adjusted (8-10 weeks) | ✅ | Accounts for all risks |
| Cost estimates revised ($0.008/job) | ✅ | Within budget |
| Fallback strategy defined | ✅ | Per-analysis-point behavior |
| Neutrality test suite planned | ✅ | Phase 1, 100+ pairs |
| Telemetry infrastructure planned | ✅ | Phase 1 |
| Gradual rollout strategy (10%→100%) | ✅ | Percentage-based |
| 4 separate calls confirmed | ✅ | Architecture decision documented |

### Approval Conditions

**🔴 CRITICAL - Must Complete Before Starting Implementation**:
- [ ] Create git branch: `feature/llm-text-analysis`
- [ ] Set up telemetry dashboard infrastructure (Phase 1 dependency)
- [ ] Create neutrality test suite specification with 100+ politically/socially diverse input pairs
- [ ] Allocate 8-10 week timeline (not 6-7 weeks)
- [ ] Review and sign off on all 4 prompt file designs (Part 8.2)

**🟡 RECOMMENDED - Complete During Phase 1**:
- [ ] Define error handling fallback behavior per analysis point (see review section)
- [ ] Set up per-analysis-point cost caps (not just global $0.05 cap)
- [ ] Create telemetry metrics schema (TextAnalysisMetrics interface)
- [ ] Design percentage-based rollout mechanism (10% → 25% → 50% → 100%)

**🟢 OPTIONAL - Nice to Have**:
- [ ] Semantic caching infrastructure (evaluate ROI first)
- [ ] Prompt versioning A/B testing framework
- [ ] Provider health check mechanism

### Implementation Readiness

**Architecture**: ✅ READY
- 4-point batching strategy validated
- Stage-aware calls correctly designed
- Admin-editable prompt integration complete

**Technical Foundation**: ✅ READY
- All source code references verified accurate
- Line numbers match current codebase (v2.6.41+)
- Integration points identified and validated

**Risk Management**: ✅ ADEQUATE
- Comprehensive fallback strategy
- Feature flags and gradual rollout planned
- Telemetry from day 1

**Cost/Benefit**: ✅ JUSTIFIED
- Cost increase: +5.3% ($0.008/job with Haiku)
- Benefit: Eliminate 80+ regex patterns, 20%+ edge case improvement
- ROI: HIGH

### Go Decision

**Recommendation**: 🚀 **PROCEED WITH IMPLEMENTATION**

**Rationale**:
1. Architecture is sound and thoroughly validated
2. All critical gaps identified and mitigation plans in place
3. Cost increase is modest and justified by benefits
4. Admin-editable prompt integration provides production flexibility
5. Risk mitigation through gradual rollout and fallback mechanisms

**Next Immediate Actions**:
1. **Week 0** (Pre-Phase 1 Setup):
   - Create feature branch
   - Set up telemetry infrastructure
   - Create neutrality test suite (100+ pairs)
   - Review Part 8 prompt designs

2. **Week 1-2** (Phase 1 - Service Infrastructure):
   - Create `TextAnalysisService` interface and types
   - Implement `HeuristicTextAnalysisService` wrapper
   - Create 4 admin-editable prompt files
   - Add telemetry metrics tracking
   - Implement A/B comparison framework

3. **Week 3+**: Continue per revised implementation plan (8-10 weeks total)

### Critical Success Factors

1. ✅ **Stage-aware batching** (4 points) is correct architectural choice
2. ⚠️ **Verdict validation** needs extended timeline (2-3 weeks, not 1)
3. ⚠️ **Input neutrality** must be tested before production deployment
4. ⚠️ **Telemetry** must be in place from Phase 1 to validate success criteria
5. ✅ **Admin-editable prompts** provide production tuning flexibility

### Sign-Off

**Technical Review**: ✅ COMPLETE (Claude Sonnet 4.5, 2026-01-29)
**Architecture Review**: ✅ COMPLETE (4-point batching validated)
**Cost Analysis**: ✅ COMPLETE (Revised estimates: $0.007-0.028/job)
**Risk Assessment**: ✅ COMPLETE (Comprehensive mitigation strategy)
**Implementation Plan**: ✅ COMPLETE (8-10 week timeline with 6 phases)

**Final Approval**: 🚀 **GO FOR IMPLEMENTATION**

---

**Document End**
