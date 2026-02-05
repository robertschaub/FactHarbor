# Pipeline Improvement Implementation Specification

**Status:** APPROVED - READY FOR IMPLEMENTATION
**Created:** 2026-02-05
**Approved:** 2026-02-05 (Principal Software Architect)
**Priority:** High
**Target Start:** After v3.1 terminology cleanup complete

---

## Executive Summary

This specification defines improvements to FactHarbor's orchestrated analysis pipeline with a **quality-first, then efficiency** approach.

**Goals:**
1. Improve evidence coverage for high-centrality claims (75% → 90%)
2. Ensure counter-evidence for balanced verdicts (50% → 80%)
3. Reduce analysis latency through parallelization (40-60%)
4. Eliminate redundant URL fetches (<5% re-fetch rate)

**Key Changes:**
- Gap-driven research continuation (not just logging)
- Mandatory counter-evidence search for HIGH centrality claims
- Bounded parallel evidence extraction
- URL deduplication across iterations
- Enhanced recency detection with schema changes

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Identified Issues](#2-identified-issues)
3. [Phase 1 Implementation](#3-phase-1-implementation)
4. [Technical Specifications](#4-technical-specifications)
5. [Success Criteria](#5-success-criteria)
6. [Phase 2+ Roadmap](#6-phase-2-roadmap)
7. [Configuration](#7-configuration)
8. [Code References](#8-code-references)

---

## 1. Current Architecture

### 1.1 Pipeline Flow

```
INPUT
  ↓
[PHASE 1: UNDERSTANDING] - 1 LLM call
  └─ understandClaim() → ClaimUnderstanding
     ├─ analysisContexts[]
     ├─ subClaims[] (centrality, harmPotential)
     ├─ keyFactors[]
     └─ researchQueries[]
  ↓
[PHASE 2-4: RESEARCH LOOP] - N iterations, SEQUENTIAL
  FOR EACH iteration:
    ├─ decideNextResearch() → queries[]
    ├─ FOR EACH query: searchWebWithProvider() ← SEQUENTIAL
    ├─ FOR EACH result URL: fetchSource() ← SEQUENTIAL
    └─ FOR EACH source: extractEvidence() ← SEQUENTIAL ⚠️ BOTTLENECK
  ↓
[PHASE 5: VERDICT] - 1-N LLM calls (per context)
  └─ generateVerdicts() → ClaimVerdict[]
  ↓
OUTPUT: ArticleAnalysis
```

### 1.2 Data Flow

```typescript
// Phase 1 → Phase 2-4
ClaimUnderstanding {
  analysisContexts: AnalysisContext[]
  subClaims: SubClaim[]
  keyFactors: KeyFactor[]
  researchQueries: string[]
  temporalContext?: TemporalContext  // NEW
}

// Phase 2-4 internal state
ResearchState {
  evidenceItems: EvidenceItem[]
  sources: FetchedSource[]
  searchQueries: SearchQuery[]
  budgetTracker: BudgetTracker
  processedUrls: Set<string>  // NEW
  evidenceGaps: EvidenceGap[]  // NEW
}

// Phase 2-4 → Phase 5
EvidenceItem {
  statement: string
  sourceId: string
  contextId?: string
  claimDirection: "supports" | "contradicts" | "neutral"
  probativeValue: "high" | "medium" | "low"
  sourceAuthority?: string
  evidenceBasis?: string
}
```

---

## 2. Identified Issues

| Issue | Impact | Current | Target |
|-------|--------|---------|--------|
| Sequential evidence extraction | HIGH | 6-20s | 2-4s |
| No gap-driven research | HIGH | Logs only | Acts on gaps |
| Low counter-evidence rate | HIGH | 50% | 80% |
| No URL deduplication | MEDIUM | 15-30% re-fetch | <5% |
| Limited recency detection | MEDIUM | Pattern-only | Hybrid |
| Evidence dedup O(n²) | LOW | O(n²) | O(1) |

---

## 3. Phase 1 Implementation

**Duration:** 2 weeks
**Focus:** Quality improvements with efficiency gains

### 3.1 Priority P0: Gap-Driven Research Continuation

**Problem:** Evidence gap analysis logs gaps but doesn't act on them.

**Solution:** Research continuation when critical gaps exist.

```typescript
interface EvidenceGap {
  claimId: string;
  claimText: string;
  contextId: string;
  gapType: "no_evidence" | "no_counter_evidence" | "low_quality" | "outdated";
  severity: "critical" | "high" | "medium" | "low";
  suggestedQueries: string[];
  attemptedQueries: string[];
}

async function continueResearchForGaps(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  maxGapIterations: number = 2
): Promise<void> {
  const maxGapQueriesTotal = 8;
  let gapQueriesIssued = 0;
  for (let i = 0; i < maxGapIterations; i++) {
    const gaps = analyzeEvidenceGaps(state, understanding);
    const criticalGaps = gaps.filter(g =>
      g.severity === "critical" || g.severity === "high"
    );

    if (criticalGaps.length === 0) break;

    // Generate and execute targeted queries
    const queries = criticalGaps.flatMap(g => g.suggestedQueries);
    const remainingBudget = Math.max(0, maxGapQueriesTotal - gapQueriesIssued);
    const boundedQueries = queries.slice(0, remainingBudget);
    if (boundedQueries.length === 0) break;
    gapQueriesIssued += boundedQueries.length;
    // Stop early if prior iteration produced no novel evidence
    if (state.lastIterationNovelEvidenceCount === 0) break;
    await executeResearchIteration(state, boundedQueries);
  }
}
```

**Deliverables:**
- [x] `analyzeEvidenceGaps()` function
- [x] `continueResearchForGaps()` integration
- [x] `MAX_GAP_ITERATIONS = 2` limit

### 3.2 Priority P0: Mandatory Counter-Evidence for HIGH Claims

**Problem:** 50% of claims lack counter-evidence, leading to biased verdicts.

**Solution:** Enforce counter-evidence search for HIGH centrality claims.

```typescript
async function ensureCounterEvidence(
  state: ResearchState,
  understanding: ClaimUnderstanding
): Promise<void> {
  const highCentralityClaims = understanding.subClaims.filter(
    c => c.centrality === "high"
  );

  for (const claim of highCentralityClaims) {
    const evidence = state.evidenceItems.filter(e =>
      isEvidenceForClaim(e, claim)
    );

    const hasContradicting = evidence.some(
      e => e.claimDirection === "contradicts"
    );

    if (!hasContradicting) {
      // Prefer LLM-derived counter queries from Phase 1 understanding if available
      const counterQueries = claim.counterQueries?.length
        ? claim.counterQueries
        : [generateInverseClaimQuery(claim.text)];
      await executeResearchIteration(state, counterQueries, {
        targetClaimId: claim.id,
        searchType: "counter_evidence"
      });
    }
  }
}
```

**Deliverables:**
- [x] `generateInverseClaimQuery()` function (pre-existing)
- [x] `ensureCounterEvidence()` integration (via gap analysis)
- [x] Stricter relevance filtering for counter-evidence results

### 3.3 Priority P0.5: Parallel Evidence Extraction

**Problem:** Sequential extraction is the dominant bottleneck (6-20s).

**Solution:** Bounded parallelism with operational safety.

```typescript
const PARALLEL_LIMIT = 3;

async function extractEvidenceParallel(
  sources: FetchedSource[],
  options: ExtractOptions,
  budgetTracker: BudgetTracker
): Promise<EvidenceItem[]> {
  const results: EvidenceItem[] = [];
  let currentLimit = PARALLEL_LIMIT;

  for (let i = 0; i < sources.length; i += currentLimit) {
    // Reserve budget before dispatching
    const batch = sources.slice(i, i + currentLimit);
    const reservedTokens = batch.length * options.maxOutputTokens;

    if (!budgetTracker.canReserve(reservedTokens)) {
      currentLimit = Math.max(1, Math.floor(currentLimit / 2));
      continue;
    }

    budgetTracker.reserve(reservedTokens);

    // Use allSettled for fault tolerance
    const batchResults = await Promise.allSettled(
      batch.map(source => extractEvidence(source, options))
    );

    // Handle results and failures
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(...result.value);
      } else {
        // Log failure, reduce concurrency on throttling
        if (isThrottlingError(result.reason)) {
          currentLimit = Math.max(1, currentLimit - 1);
        }
      }
    }

    // Commit actual usage and refund unused reservation
    const tokensUsed = batchResults
      .filter(r => r.status === "fulfilled")
      .reduce((sum, r: any) => sum + (r.value?.tokenUsage ?? 0), 0);
    budgetTracker.commit(tokensUsed);
    budgetTracker.refund(Math.max(0, reservedTokens - tokensUsed));
  }

  return results;
}
```

**Mitigations (from §11.1):**
- Use `Promise.allSettled()` not `Promise.all()`
- Conservative budget reservation before dispatch
- Dynamic concurrency reduction on 429/503 errors
- Per-provider rate limit awareness

**Deliverables:**
- [x] `extractEvidenceParallel()` with bounded concurrency
- [x] Budget reservation system
- [x] Throttling backoff mechanism
- [x] Telemetry: batch durations, failures, throttling events

### 3.4 Priority P0.5: URL Deduplication Across Iterations

**Problem:** Same URLs fetched multiple times across iterations (15-30%).

**Solution:** Track processed URLs in research state.

```typescript
interface SearchState {
  processedUrls: Set<string>;
  urlToSourceId: Map<string, string>;
}

function deduplicateSearchResults(
  results: WebSearchResult[],
  searchState: SearchState
): WebSearchResult[] {
  return results.filter(r => {
    const normalized = normalizeUrl(r.url);
    if (searchState.processedUrls.has(normalized)) {
      console.log(`[Search] Skipping already-processed URL: ${r.url}`);
      return false;
    }
    searchState.processedUrls.add(normalized);
    return true;
  });
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  // Remove tracking params, normalize www, lowercase
  parsed.searchParams.delete('utm_source');
  parsed.searchParams.delete('utm_medium');
  parsed.searchParams.delete('utm_campaign');
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  return parsed.toString().toLowerCase();
}
```

**Deliverables:**
- [x] `SearchState.processedUrls` tracking
- [x] `deduplicateSearchResults()` function
- [x] URL normalization logic

### 3.5 Priority P1: Enhanced Recency Detection

**Problem:** Pattern-based detection misses implicit temporal intent.

**Solution:** Hybrid approach piggybacking on Phase 1 LLM call.

```typescript
// NEW schema addition (optional field for backward compat)
interface TemporalContext {
  isRecencySensitive: boolean;
  granularity: "week" | "month" | "year" | "none";
  confidence: number;
  reason: string;
}

interface ClaimUnderstanding {
  // ... existing fields
  temporalContext?: TemporalContext;  // NEW
}
```

**Understand prompt addition:**
```
## TEMPORAL CONTEXT ASSESSMENT

Assess whether this claim requires recent information:
- temporalContext.isRecencySensitive: true if current/recent data needed
- temporalContext.granularity: "week" | "month" | "year" | "none"
- temporalContext.confidence: 0-1
- temporalContext.reason: brief explanation

Examples:
- "current inflation rate" → week/month, high confidence
- "historical event in 1990" → none, high confidence
- "recent policy changes" → month, medium confidence

If temporalContext is missing, default to non-recency ("none").
```

**Deliverables:**
- [x] `TemporalContext` schema addition
- [x] Understand prompt update
- [x] Per-query date filter logic

### 3.6 Priority P1: Evidence Gap Reporting in Output

**Problem:** No visibility into research completeness.

**Solution:** Include gap analysis in output JSON.

```typescript
interface ArticleAnalysis {
  // ... existing fields

  researchMetrics?: {
    totalIterations: number;
    evidenceCount: number;
    evidenceByContext: Record<string, number>;
    coverageMetrics: {
      highCentralityCoverage: number;  // 0-1
      counterEvidenceRate: number;      // 0-1
    };
    evidenceGaps: EvidenceGap[];
    processedUrlCount: number;
    deduplicatedUrlCount: number;
    novelEvidenceLastIteration?: number;
  };
}
```

**Deliverables:**
- [x] `researchMetrics` in output schema
- [x] Gap analysis computation
- [x] Coverage metrics calculation

### 3.7 Phase 1 Acceptance Criteria (Per-Deliverable)

- **Gap-driven research:**
  - No more than `maxGapQueriesTotal` gap-driven queries per analysis.
  - Stop condition triggers when no novel evidence is found in the prior iteration.
  - Evidence coverage for HIGH centrality claims improves by ≥10% vs baseline.

- **Counter-evidence enforcement:**
  - For HIGH centrality claims, either a contradicting evidence item is found or a "not found" log entry is recorded.
  - Counter-evidence items pass relevance filtering (no drop in relevance score distribution).

- **Parallel extraction:**
  - p50 extraction latency reduced by ≥40% vs baseline.
  - Failure rate does not exceed baseline by more than +2%.

- **URL deduplication:**
  - URL re-fetch rate < 5% on sampled runs.

- **Recency enhancements:**
  - `temporalContext` present for ≥90% of analyses (when enabled).
  - Missing `temporalContext` defaults to non-recency without errors.

- **Research metrics output:**
  - `researchMetrics` present when `includeResearchMetrics = true` and validates against schema.

---

## 4. Technical Specifications

### 4.1 Evidence Gap Analysis

```typescript
function analyzeEvidenceGaps(
  state: ResearchState,
  understanding: ClaimUnderstanding
): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  for (const claim of understanding.subClaims) {
    const evidence = state.evidenceItems.filter(e =>
      isEvidenceForClaim(e, claim)
    );

    // No evidence at all
    if (evidence.length === 0) {
      gaps.push({
        claimId: claim.id,
        claimText: claim.text,
        contextId: claim.contextId || "",
        gapType: "no_evidence",
        severity: claim.centrality === "high" ? "critical" : "medium",
        suggestedQueries: generateClaimQueries(claim),
        attemptedQueries: getQueriesForClaim(state, claim),
      });
      continue;
    }

    // No counter-evidence (bias risk)
    const hasCounterEvidence = evidence.some(e => e.claimDirection === "contradicts");
    if (!hasCounterEvidence && claim.centrality !== "low") {
      gaps.push({
        claimId: claim.id,
        claimText: claim.text,
        contextId: claim.contextId || "",
        gapType: "no_counter_evidence",
        severity: claim.centrality === "high" ? "high" : "medium",
        suggestedQueries: [generateInverseClaimQuery(claim.text)],
        attemptedQueries: [],
      });
    }

    // Low quality evidence only
    const highQuality = evidence.filter(e => e.probativeValue === "high");
    if (highQuality.length === 0 && claim.centrality === "high") {
      gaps.push({
        claimId: claim.id,
        claimText: claim.text,
        contextId: claim.contextId || "",
        gapType: "low_quality",
        severity: "high",
        suggestedQueries: [`${claim.text} official source`, `${claim.text} study`],
        attemptedQueries: getQueriesForClaim(state, claim),
      });
    }
  }

  return gaps;
}
```

### 4.2 Inverse Query Generation

```typescript
function generateInverseClaimQuery(claimText: string): string {
  // Pattern-based inversion
  const inversions: [RegExp, string][] = [
    [/\bis\s+true\b/i, "is false"],
    [/\bis\s+false\b/i, "is true"],
    [/\bdid\b/i, "did not"],
    [/\bwas\b/i, "was not"],
    [/\bhas\b/i, "has not"],
    [/\bwill\b/i, "will not"],
    [/\beffective\b/i, "ineffective"],
    [/\bsafe\b/i, "unsafe dangers risks"],
    [/\bbeneficial\b/i, "harmful negative"],
    [/\bsuccess\b/i, "failure failed"],
  ];

  let inverted = claimText;
  for (const [pattern, replacement] of inversions) {
    if (pattern.test(inverted)) {
      inverted = inverted.replace(pattern, replacement);
      break;
    }
  }

  // Add counter-evidence keywords
  return `${inverted} criticism controversy dispute`;
}
```

### 4.3 Telemetry Schema

```typescript
interface ExtractionTelemetry {
  batchId: string;
  sourceCount: number;
  concurrencyLevel: number;

  // Timing
  startTime: number;
  endTime: number;
  durationMs: number;

  // Results
  successCount: number;
  failureCount: number;
  evidenceItemsExtracted: number;

  // Errors
  throttlingEvents: number;
  otherErrors: string[];

  // Budget
  tokensReserved: number;
  tokensUsed: number;
}
```

---

## 5. Success Criteria

### 5.1 Quality Gates

| Metric | Target | Measurement |
|--------|--------|-------------|
| Evidence coverage (HIGH centrality) | ≥ 85% | Gap analysis |
| Counter-evidence rate (HIGH centrality) | ≥ 70% | claimDirection distribution |
| Evidence gaps reported in output | 100% | Schema validation |

### 5.2 Performance Gates

| Metric | Target | Measurement |
|--------|--------|-------------|
| Evidence extraction latency | -40% | Timer comparison |
| URL re-fetch rate | < 5% | processedUrls hit rate |

### 5.3 Cost Gates

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total LLM cost per analysis | ≤ +10% | Token tracking |

---

## 6. Phase 2+ Roadmap

### Phase 2: Advanced Orchestration (3-4 weeks)

| Item | Effort | Depends On |
|------|--------|------------|
| Context-parallel research | 12h | Stable budget allocation |
| Adaptive budget allocation | 6h | Phase 1 telemetry |
| Hash-based evidence dedup | 3h | - |
| Research decision logging | 4h | - |

### Phase 3: Streaming & Visualization (2-3 weeks)

| Item | Effort | Depends On |
|------|--------|------------|
| Streaming progress updates | 8h | Phase 2 |
| Preliminary verdict streaming | 6h | Phase 2 |
| Multi-strategy search | 6h | Baseline metrics |
| Source freshness scoring | 4h | Source age measurement |

---

## 7. Configuration

### 7.1 New PipelineConfig Fields

```typescript
interface PipelineConfig {
  // ... existing fields

  // P0: Gap-driven research
  enableGapDrivenResearch?: boolean;     // Default: true
  maxGapIterations?: number;             // Default: 2

  // P0: Counter-evidence
  enforceCounterEvidence?: boolean;      // Default: true
  counterEvidenceMinCentrality?: "high" | "medium" | "low";  // Default: "high"

  // P0.5: Parallelization
  parallelExtractionLimit?: number;      // Default: 3
  enableThrottlingBackoff?: boolean;     // Default: true

  // P1: Recency
  recencyDetectionMode?: "pattern" | "hybrid";  // Default: "hybrid"

  // P1: Reporting
  includeResearchMetrics?: boolean;      // Default: true
}
```

### 7.2 Environment Variables

```bash
# Parallelization (optional override)
PARALLEL_EXTRACTION_LIMIT=3

# Feature flags for gradual rollout
ENABLE_GAP_DRIVEN_RESEARCH=true
ENABLE_COUNTER_EVIDENCE_ENFORCEMENT=true
```

---

## 8. Code References

| Component | File | Lines |
|-----------|------|-------|
| Orchestrated pipeline | `orchestrated.ts` | 1-10,800+ |
| Evidence extraction | `orchestrated.ts` | 6454-6700 |
| Research decision | `orchestrated.ts` | 5700-6000 |
| Recency detection | `orchestrated.ts` | 1740-1776 |
| Search orchestration | `orchestrated.ts` | 10599-10750 |
| Evidence filter | `evidence-filter.ts` | 1-290 |

---

## 9. Lead Dev Go/No-Go Prompt (Copy/Paste)

**Subject:** Go/No-Go: Phase 1 Pipeline Improvements (Quality + Efficiency)

**Request:** Please review and respond with **GO / NO-GO** for Phase 1 implementation.

**Scope (Phase 1):**
- URL deduplication across iterations
- Bounded parallel evidence extraction (with budget reservation + throttling backoff)
- Gap-driven research continuation (guardrails + stop on no novel evidence)
- Mandatory counter-evidence for HIGH centrality claims (prefer LLM-derived counter queries)
- Hybrid recency detection (TemporalContext in understanding + per-query filters)
- Research metrics output (coverage + gap reporting)

**Acceptance Criteria:**
- p50 extraction latency reduced ≥40% vs baseline
- Failure rate increase ≤ +2% vs baseline
- URL re-fetch rate < 5%
- HIGH-centrality coverage improves ≥10% vs baseline
- Counter-evidence present or “not found” logged for HIGH centrality claims
- `researchMetrics` emitted when enabled and validates against schema

**Safety Guardrails:**
- max gap-driven queries per analysis (`maxGapQueriesTotal`)
- stop gap iteration if no novel evidence in prior iteration
- per-provider throttling backoff & concurrency reduction on 429/503

**Rollout Plan:**
- Feature flags for each change
- A/B test 10% traffic for 48–72 hours
- Roll back if failure rate or cost gate exceeds thresholds

Please reply with **GO** or **NO-GO** and any required changes.

## Implementation Order

1. **Baseline Measurement** (Day 1)
   - Capture current metrics: coverage, counter-evidence rate, latency, re-fetch rate

2. **P0.5: URL Deduplication** (Day 2)
   - Add `SearchState.processedUrls`
   - Implement `deduplicateSearchResults()`

3. **P0.5: Parallel Extraction** (Days 3-4)
   - Implement `extractEvidenceParallel()`
   - Add budget reservation
   - Add throttling backoff
   - Add telemetry

4. **P0: Gap-Driven Research** (Days 5-7)
   - Implement `analyzeEvidenceGaps()`
   - Implement `continueResearchForGaps()`
   - Add `MAX_GAP_ITERATIONS` limit

5. **P0: Counter-Evidence Enforcement** (Days 8-9)
   - Implement `generateInverseClaimQuery()`
   - Implement `ensureCounterEvidence()`
   - Add relevance filtering

6. **P1: Recency Enhancement** (Days 10-11)
   - Add `TemporalContext` schema
   - Update understand prompt
   - Implement per-query date filtering

7. **P1: Gap Reporting** (Day 12)
   - Add `researchMetrics` to output
   - Implement coverage metrics

8. **Validation & A/B Testing** (Days 13-14)
   - Compare metrics against baseline
   - A/B test with 10% traffic
   - Adjust thresholds as needed

---

**Document Status:** ✅ PHASE 1 COMPLETE
**Sign-off:** Principal Software Architect (2026-02-05)
**Implementation Completed:** 2026-02-05
