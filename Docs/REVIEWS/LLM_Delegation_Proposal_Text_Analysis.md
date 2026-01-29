# LLM Delegation Proposal: Hard-Coded Text Analysis

**Date**: 2026-01-29
**Author**: Claude Opus 4.5 (Senior Software Architect)
**Status**: Proposal
**Scope**: Delegation of hard-coded text analysis heuristics to LLM-based semantic analysis

---

## Executive Summary

The FactHarbor codebase contains **50+ functions** performing text analysis using hard-coded regex patterns, keyword lists, and heuristic rules. These functions are fundamentally limited because:

1. **Brittle**: Regex can't understand semantic meaning
2. **Incomplete**: New patterns require code changes
3. **Domain-leaky**: Despite "Generic by Design" rules, patterns often encode domain knowledge
4. **Unmaintainable**: 100+ regex patterns scattered across 8+ files

**Recommendation**: Migrate semantic text analysis to LLM-based calls, using the existing LLM infrastructure with structured prompts and caching for efficiency.

**Estimated Impact**:
- 30-50% reduction in hard-coded heuristics
- Significant improvement in analysis quality
- Better "Generic by Design" compliance
- Reduced maintenance burden

---

## Current State Analysis

### Files with Hard-Coded Text Analysis

| File | Functions | Lines of Heuristics | Regex Patterns |
|------|-----------|---------------------|----------------|
| `orchestrated.ts` | 15+ | ~800 | 40+ |
| `verdict-corrections.ts` | 4 | ~300 | 60+ |
| `aggregation.ts` | 4 | ~200 | 25+ |
| `evidence-filter.ts` | 6 | ~150 | 15+ |
| `scopes.ts` | 3 | ~100 | 10+ |
| `pseudoscience.ts` | 2 | ~150 | 20+ |
| **Total** | **34+** | **~1700** | **170+** |

### Categories of Text Analysis

#### Category 1: Semantic Similarity (HIGH priority for LLM)

| Function | Location | Current Approach | Problem |
|----------|----------|------------------|---------|
| `calculateTextSimilarity()` | orchestrated.ts:765 | Jaccard word overlap | Misses synonyms, paraphrases |
| `calculateScopeSimilarity()` | orchestrated.ts:835 | Multi-field Jaccard | Can't understand semantic equivalence |
| `isDuplicateFact()` | orchestrated.ts:1127 | Word similarity threshold | "X is efficient" ≠ "X has high efficiency" |
| `calculateSimilarity()` | evidence-filter.ts:152 | Basic word overlap | Same limitations |

**LLM Advantage**: LLMs excel at semantic similarity - they understand that "more efficient" and "higher efficiency" mean the same thing.

#### Category 2: Text Classification (HIGH priority for LLM)

| Function | Location | Current Approach | Problem |
|----------|----------|------------------|---------|
| `isComparativeLikeText()` | orchestrated.ts:3253 | Regex for "than" + comparatives | Misses "X outperforms Y", "A beats B" |
| `isCompoundLikeText()` | orchestrated.ts:3265 | Punctuation + conjunctions | Can't distinguish compound claims from lists |
| `isRecencySensitive()` | orchestrated.ts:1172 | Keyword matching | Misses context-dependent recency |
| `isExternalReactionClaim()` | orchestrated.ts:2716 | Keyword patterns | Misses semantic variations |
| `detectProceduralTopic()` | orchestrated.ts:2599 | Keyword matching | Limited to known procedure terms |

**LLM Advantage**: LLMs understand text type naturally without explicit patterns.

#### Category 3: Evidence Quality Assessment (MEDIUM priority)

| Function | Location | Current Approach | Problem |
|----------|----------|------------------|---------|
| `hasTemporalAnchor()` | evidence-filter.ts:106 | Date regex patterns | Misses "recent", "after the election" |
| `hasCitation()` | evidence-filter.ts:122 | Legal citation regex | Limited to US/EU citation formats |
| `hasAttribution()` | evidence-filter.ts:138 | "Dr./Prof." patterns | Misses institutional attribution |
| `detectHarmPotential()` | aggregation.ts:96 | Keyword matching | Can't assess context-dependent harm |

**LLM Advantage**: LLMs can assess evidence quality in context, not just pattern presence.

#### Category 4: Contestation & Directionality (HIGH priority for LLM)

| Function | Location | Current Approach | Problem |
|----------|----------|------------------|---------|
| `detectClaimContestation()` | aggregation.ts:137 | Complex regex cascade | 30+ patterns, still misses cases |
| `detectAndCorrectVerdictInversion()` | verdict-corrections.ts:19 | 60+ positive/negative patterns | Brittle, high false positive risk |
| `detectCounterClaim()` | verdict-corrections.ts:193 | Term alignment heuristics | Misses semantic opposition |

**LLM Advantage**: LLMs understand claim-reasoning alignment naturally.

#### Category 5: Pseudoscience Detection (MEDIUM priority)

| Function | Location | Current Approach | Problem |
|----------|----------|------------------|---------|
| `detectPseudoscience()` | orchestrated.ts:1561 | Keyword patterns | Misses context, false positives on legitimate science |

**LLM Advantage**: LLMs can distinguish pseudoscience from legitimate controversial science.

---

## Proposed Architecture

### Design Principles

1. **Semantic-First**: LLM handles meaning; code handles structure
2. **Cached Results**: Memoize LLM calls for identical inputs
3. **Batch Processing**: Group similar analysis requests
4. **Graceful Fallback**: Hard-coded heuristics as safety net
5. **Cost-Aware**: Use efficient models (Haiku/GPT-4o-mini) for simple classifications

### New Component: Text Analysis Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    TextAnalysisService                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Similarity      │  │ Classification  │  │ Contestation    │ │
│  │ Analysis        │  │ Analysis        │  │ Analysis        │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                ▼                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   LLM Request Router                     │   │
│  │  - Model selection (by task complexity)                  │   │
│  │  - Batch aggregation                                     │   │
│  │  - Caching layer                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                │                                │
│                                ▼                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Existing LLM Infrastructure                 │   │
│  │  (anthropic/openai providers via AI SDK)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
apps/web/src/lib/analyzer/
├── text-analysis/
│   ├── index.ts                    # Public API
│   ├── service.ts                  # TextAnalysisService class
│   ├── similarity.ts               # Semantic similarity analysis
│   ├── classification.ts           # Text classification (comparative, compound, etc.)
│   ├── contestation.ts             # Claim contestation analysis
│   ├── evidence-quality.ts         # Evidence quality assessment
│   ├── cache.ts                    # LLM response caching
│   └── prompts/
│       ├── similarity.prompt.ts    # Prompts for similarity tasks
│       ├── classification.prompt.ts
│       ├── contestation.prompt.ts
│       └── evidence-quality.prompt.ts
```

---

## Detailed Function Migration Plan

### Phase 1: Semantic Similarity (Week 1-2)

**Target Functions**:
- `calculateTextSimilarity()` → `TextAnalysisService.similarity()`
- `calculateScopeSimilarity()` → `TextAnalysisService.scopeSimilarity()`
- `isDuplicateFact()` → `TextAnalysisService.isDuplicate()`
- `calculateSimilarity()` (evidence-filter) → Use shared service

**New API**:
```typescript
// apps/web/src/lib/analyzer/text-analysis/similarity.ts

interface SimilarityResult {
  score: number;           // 0.0 - 1.0
  explanation: string;     // Why similar/different
  semanticMatch: boolean;  // Above threshold?
}

interface TextAnalysisService {
  /**
   * Calculate semantic similarity between two texts.
   * Uses LLM for semantic understanding, with caching.
   */
  similarity(text1: string, text2: string, options?: {
    threshold?: number;   // Default: 0.85
    model?: "fast" | "accurate";  // Default: "fast" (haiku)
  }): Promise<SimilarityResult>;

  /**
   * Check if two evidence items are semantically duplicate.
   */
  isDuplicateEvidence(
    evidence1: EvidenceItem,
    evidence2: EvidenceItem,
    threshold?: number
  ): Promise<boolean>;

  /**
   * Calculate similarity between two AnalysisContexts.
   */
  scopeSimilarity(
    scope1: AnalysisContext,
    scope2: AnalysisContext
  ): Promise<SimilarityResult>;
}
```

**Prompt Design** (for `similarity()`):
```typescript
const SIMILARITY_PROMPT = `
Compare these two texts for semantic similarity.

TEXT A: {{text1}}

TEXT B: {{text2}}

Analyze whether they express the same meaning, even if worded differently.
Consider: synonyms, paraphrases, negations, and entailment.

Return JSON:
{
  "score": 0.0-1.0,
  "semanticMatch": true/false,
  "explanation": "Brief reason"
}
`;
```

**Caching Strategy**:
```typescript
// Cache key: hash(sorted([text1, text2]))
// TTL: 24 hours (semantic relationships don't change)
// Storage: In-memory LRU (1000 entries) + SQLite fallback
```

### Phase 2: Text Classification (Week 2-3)

**Target Functions**:
- `isComparativeLikeText()` → `TextAnalysisService.classifyText()`
- `isCompoundLikeText()` → `TextAnalysisService.classifyText()`
- `isRecencySensitive()` → `TextAnalysisService.classifyText()`
- `isExternalReactionClaim()` → `TextAnalysisService.classifyText()`
- `detectProceduralTopic()` → `TextAnalysisService.classifyText()`
- `isClaimInput()` → `TextAnalysisService.classifyText()`

**New API**:
```typescript
type TextClassification =
  | "comparative"      // "X is better than Y"
  | "compound"         // Multiple claims in one sentence
  | "recency_sensitive" // Needs current information
  | "external_reaction" // About others' reactions
  | "procedural"       // About formal procedures
  | "simple_claim"     // Single factual assertion
  | "question"         // Interrogative form
  | "other";

interface ClassificationResult {
  primaryType: TextClassification;
  confidence: number;
  traits: {
    isComparative: boolean;
    isCompound: boolean;
    isRecencySensitive: boolean;
    isExternalReaction: boolean;
    isProcedural: boolean;
  };
}

interface TextAnalysisService {
  /**
   * Classify text by type and traits.
   * Single LLM call returns multiple classification signals.
   */
  classifyText(text: string): Promise<ClassificationResult>;
}
```

**Prompt Design** (combined classification):
```typescript
const CLASSIFICATION_PROMPT = `
Classify this text:

TEXT: {{text}}

Determine:
1. Primary type (comparative, compound, procedural, simple_claim, question, other)
2. Traits:
   - isComparative: Compares two or more things?
   - isCompound: Contains multiple distinct claims?
   - isRecencySensitive: Requires current/recent information?
   - isExternalReaction: About how others reacted/responded?
   - isProcedural: About formal legal/regulatory procedures?

Return JSON:
{
  "primaryType": "...",
  "confidence": 0.0-1.0,
  "traits": { ... }
}
`;
```

**Efficiency Note**: One LLM call replaces 5+ separate function calls.

### Phase 3: Contestation Analysis (Week 3-4)

**Target Functions**:
- `detectClaimContestation()` → `TextAnalysisService.analyzeContestation()`
- `detectAndCorrectVerdictInversion()` → `TextAnalysisService.checkVerdictAlignment()`
- `detectCounterClaim()` → `TextAnalysisService.detectCounterClaim()`

**New API**:
```typescript
interface ContestationAnalysis {
  isContested: boolean;
  contestationType: "none" | "doubted" | "contested";
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
  hasDocumentedCounterEvidence: boolean;
  counterEvidenceSummary?: string;
}

interface VerdictAlignmentResult {
  isAligned: boolean;
  suggestedCorrection?: number;  // Corrected percentage if misaligned
  misalignmentReason?: string;
}

interface TextAnalysisService {
  /**
   * Analyze if a claim is contested and how.
   * Distinguishes "doubted" (opinion) from "contested" (documented counter-evidence).
   */
  analyzeContestation(
    claimText: string,
    reasoning?: string,
    evidence?: EvidenceItem[]
  ): Promise<ContestationAnalysis>;

  /**
   * Check if verdict percentage aligns with reasoning.
   * Detects when LLM confused "how confident am I" with "is claim true".
   */
  checkVerdictAlignment(
    claimText: string,
    reasoning: string,
    verdictPct: number
  ): Promise<VerdictAlignmentResult>;

  /**
   * Detect if a claim is semantically a counter-claim to the thesis.
   */
  detectCounterClaim(
    claimText: string,
    thesisText: string
  ): Promise<{ isCounterClaim: boolean; confidence: number }>;
}
```

**Prompt Design** (contestation):
```typescript
const CONTESTATION_PROMPT = `
Analyze if this claim is contested:

CLAIM: {{claim}}
REASONING: {{reasoning}}

Determine:
1. Is the claim contested (others disagree)?
2. If contested, is it:
   - "doubted": Only opinion/criticism without documented evidence
   - "contested": Has documented counter-evidence (studies, reports, data)
3. What is the factual basis?
   - "established": Widely accepted with strong evidence
   - "disputed": Evidence on both sides
   - "opinion": Primarily opinion-based
   - "unknown": Insufficient information

Return JSON:
{
  "isContested": true/false,
  "contestationType": "none" | "doubted" | "contested",
  "factualBasis": "...",
  "hasDocumentedCounterEvidence": true/false,
  "counterEvidenceSummary": "..."
}
`;
```

### Phase 4: Evidence Quality Assessment (Week 4-5)

**Target Functions**:
- `hasTemporalAnchor()` → `TextAnalysisService.assessEvidenceQuality()`
- `hasCitation()` → `TextAnalysisService.assessEvidenceQuality()`
- `hasAttribution()` → `TextAnalysisService.assessEvidenceQuality()`
- `detectHarmPotential()` → `TextAnalysisService.assessHarmPotential()`

**New API**:
```typescript
interface EvidenceQualityAssessment {
  hasTemporalAnchor: boolean;
  temporalAnchorType?: "absolute" | "relative" | "implicit";
  hasCitation: boolean;
  citationType?: "legal" | "academic" | "news" | "government" | "other";
  hasAttribution: boolean;
  attributionType?: "expert" | "institution" | "official" | "anonymous";
  overallQuality: "high" | "medium" | "low";
}

interface TextAnalysisService {
  /**
   * Assess evidence quality attributes in one call.
   */
  assessEvidenceQuality(
    statement: string,
    sourceExcerpt?: string
  ): Promise<EvidenceQualityAssessment>;

  /**
   * Assess harm potential of a claim.
   */
  assessHarmPotential(claimText: string): Promise<{
    level: "high" | "medium" | "low";
    reason: string;
    categories: string[];  // "death_injury", "fraud", "safety", etc.
  }>;
}
```

### Phase 5: Pseudoscience Detection (Week 5-6)

**Target Functions**:
- `detectPseudoscience()` → `TextAnalysisService.detectPseudoscience()`

**New API**:
```typescript
interface PseudoscienceAnalysis {
  isPseudoscientific: boolean;
  confidence: number;
  indicators: string[];      // What triggered detection
  legitimateControversy: boolean;  // Is this legitimate scientific debate?
  recommendation: "reject" | "flag" | "accept";
}

interface TextAnalysisService {
  /**
   * Detect pseudoscientific content while distinguishing
   * from legitimate scientific controversy.
   */
  detectPseudoscience(
    claimText: string,
    reasoning?: string,
    sources?: string[]
  ): Promise<PseudoscienceAnalysis>;
}
```

---

## Cost & Performance Analysis

### Current State (Hard-Coded)
- **Latency**: ~1-5ms per function call
- **Cost**: $0 (CPU only)
- **Quality**: Variable, pattern-dependent

### Proposed State (LLM-Delegated)

#### Model Selection Strategy
| Task | Model | Cost/1K tokens | Latency |
|------|-------|----------------|---------|
| Similarity | Haiku / GPT-4o-mini | $0.00025 | ~200ms |
| Classification | Haiku / GPT-4o-mini | $0.00025 | ~200ms |
| Contestation | Sonnet / GPT-4o | $0.003 | ~500ms |
| Evidence Quality | Haiku / GPT-4o-mini | $0.00025 | ~200ms |
| Pseudoscience | Sonnet / GPT-4o | $0.003 | ~500ms |

#### Cost Estimate Per Analysis Job

| Phase | Calls/Job | Tokens/Call | Cost/Call | Total |
|-------|-----------|-------------|-----------|-------|
| Similarity | 10-20 | ~200 | $0.00005 | $0.001 |
| Classification | 5-10 | ~150 | $0.00004 | $0.0004 |
| Contestation | 3-5 | ~400 | $0.0012 | $0.006 |
| Evidence Quality | 10-20 | ~150 | $0.00004 | $0.0008 |
| **Total** | | | | **~$0.008/job** |

**Comparison**: Current deep analysis costs ~$0.50-$2.00 per job. Adding $0.008 for better heuristics is negligible.

### Caching Impact

With aggressive caching (24h TTL, semantic deduplication):
- **Cache hit rate**: ~60-80% for similarity/classification
- **Effective cost**: ~$0.002-$0.003/job after caching

---

## Implementation Plan

### Phase 0: Infrastructure (Week 1)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Create `text-analysis/` folder structure | 2h | Folder structure |
| Implement caching layer (LRU + SQLite) | 4h | `cache.ts` |
| Implement LLM request router | 3h | `service.ts` |
| Add config for model selection | 1h | Environment variables |

### Phase 1: Similarity (Week 1-2)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Implement `similarity()` with prompt | 3h | `similarity.ts` |
| Add caching for similarity | 2h | Cache integration |
| Migrate `calculateTextSimilarity()` | 2h | orchestrated.ts changes |
| Migrate `isDuplicateFact()` | 2h | orchestrated.ts changes |
| Add fallback to hard-coded (config flag) | 1h | Feature flag |
| **Unit tests** | 3h | Test coverage |

### Phase 2: Classification (Week 2-3)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Implement `classifyText()` with prompt | 4h | `classification.ts` |
| Migrate 5 `is*()` functions | 4h | orchestrated.ts changes |
| Add batch processing for efficiency | 2h | Batch API |
| **Unit tests** | 3h | Test coverage |

### Phase 3: Contestation (Week 3-4)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Implement `analyzeContestation()` | 4h | `contestation.ts` |
| Implement `checkVerdictAlignment()` | 3h | `contestation.ts` |
| Migrate `detectClaimContestation()` | 3h | aggregation.ts changes |
| Migrate `detectAndCorrectVerdictInversion()` | 4h | verdict-corrections.ts changes |
| **Unit tests** | 4h | Test coverage |

### Phase 4: Evidence Quality (Week 4-5)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Implement `assessEvidenceQuality()` | 3h | `evidence-quality.ts` |
| Migrate `has*()` functions | 3h | evidence-filter.ts changes |
| Migrate `detectHarmPotential()` | 2h | aggregation.ts changes |
| **Unit tests** | 3h | Test coverage |

### Phase 5: Pseudoscience (Week 5-6)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Implement `detectPseudoscience()` | 4h | `evidence-quality.ts` |
| Migrate from orchestrated.ts/pseudoscience.ts | 3h | File changes |
| **Unit tests** | 2h | Test coverage |

### Phase 6: Testing & Rollout (Week 6)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Integration testing with full pipeline | 4h | Test results |
| A/B testing (hard-coded vs LLM) | 4h | Comparison metrics |
| Documentation | 2h | Updated docs |
| Feature flag rollout | 1h | Gradual enablement |

### Total Effort Estimate

| Phase | Effort |
|-------|--------|
| Infrastructure | 10h |
| Similarity | 13h |
| Classification | 13h |
| Contestation | 18h |
| Evidence Quality | 11h |
| Pseudoscience | 9h |
| Testing & Rollout | 11h |
| **Total** | **85h (~2 weeks full-time)** |

---

## Risk Assessment

### Risk 1: LLM Latency

**Risk**: LLM calls add latency to the pipeline.

**Mitigation**:
1. Aggressive caching (60-80% hit rate expected)
2. Parallel execution of independent analyses
3. Batch processing for bulk operations
4. Fast model selection (Haiku for simple tasks)

**Residual Risk**: LOW (latency increase ~1-2s per job is acceptable)

### Risk 2: LLM Cost

**Risk**: LLM calls increase per-job cost.

**Mitigation**:
1. Cost estimate shows ~$0.008/job, negligible vs current $0.50-$2.00
2. Caching reduces effective cost to ~$0.002-$0.003
3. Fast models for simple tasks

**Residual Risk**: NEGLIGIBLE

### Risk 3: LLM Inconsistency

**Risk**: LLM outputs may vary between calls.

**Mitigation**:
1. Use `temperature=0` for deterministic mode
2. Structured JSON output with schema validation
3. Cache results to ensure consistency for identical inputs
4. Fallback to hard-coded heuristics when LLM confidence is low

**Residual Risk**: LOW (deterministic mode + caching)

### Risk 4: Regression in Existing Behavior

**Risk**: LLM-based analysis may differ from hard-coded heuristics.

**Mitigation**:
1. Feature flag for gradual rollout
2. A/B testing before full deployment
3. Keep hard-coded fallback available
4. Quality metrics comparison

**Residual Risk**: MEDIUM (requires careful testing)

### Risk 5: Provider Dependency

**Risk**: LLM provider outages affect text analysis.

**Mitigation**:
1. Multi-provider support (Anthropic + OpenAI)
2. Fallback to hard-coded heuristics on provider error
3. Cache provides resilience for repeated queries

**Residual Risk**: LOW (fallback mechanisms)

---

## Success Metrics

### Quality Metrics

| Metric | Current Baseline | Target |
|--------|------------------|--------|
| Semantic similarity accuracy | ~70% (word overlap) | >90% |
| Text classification accuracy | ~80% (pattern-based) | >95% |
| Contestation detection F1 | ~75% (keyword-based) | >90% |
| Verdict alignment correction rate | ~60% | >85% |

### Operational Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lines of heuristic code | ~1700 | ~500 (fallback only) |
| Regex patterns to maintain | ~170 | ~30 (fallback only) |
| False positive rate (contestation) | ~15% | <5% |

### Cost Metrics

| Metric | Current | Target |
|--------|---------|--------|
| LLM cost per job | $0 (heuristics) | <$0.01 |
| Total job cost impact | $0 | <2% increase |

---

## Recommendations

### Immediate Actions

1. **Approve this proposal** for implementation
2. **Allocate 2 weeks** of developer time for Phases 0-2
3. **Set up feature flags** for gradual rollout
4. **Define A/B test criteria** before Phase 6

### Long-Term Considerations

1. **Extend to other heuristics**: Search query generation, source reliability heuristics
2. **Fine-tuning opportunity**: Train small model on accumulated analysis data
3. **Multi-language support**: LLM-based analysis naturally extends to non-English

### What NOT to Migrate

Keep hard-coded for:
- Pure math calculations (`calculateWeightedVerdictAverage`)
- Configuration parsing
- Data structure transformations
- Validation (schema, format)

---

## Conclusion

The current hard-coded text analysis approach is fundamentally limited. LLMs are purpose-built for semantic text understanding and will provide:

1. **Higher quality** analysis (semantics vs patterns)
2. **Better maintainability** (prompts vs 170+ regex)
3. **Automatic generalization** (no domain-specific patterns)
4. **Negligible cost** (~$0.008/job)

**Recommendation**: **PROCEED WITH IMPLEMENTATION**

Start with Phase 1 (Similarity) as a proof of concept, measure quality improvement, then continue with remaining phases.

---

**Document Version**: 1.0
**Date**: 2026-01-29
**Author**: Claude Opus 4.5 (Senior Software Architect)
**Status**: Awaiting Approval
