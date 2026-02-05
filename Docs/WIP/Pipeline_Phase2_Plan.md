# Pipeline Improvement Phase 2 - Advanced Orchestration

**Status:** PLANNING - AWAITING PHASE 1 STABILIZATION
**Created:** 2026-02-05
**Target Start:** 2 weeks after Phase 1 production deployment
**Priority:** Medium
**Depends On:** Phase 1 complete + stable
**Quick Wins Completed:** P2 Configurable Thresholds (2026-02-05)

---

## Executive Summary

Phase 2 builds on Phase 1's quality-first foundation to add advanced orchestration capabilities. Focus areas are context-parallel research, adaptive budget allocation, and improved evidence deduplication.

**Goals:**
1. Parallelize research across multiple AnalysisContexts (30-50% speedup for multi-context claims)
2. Dynamically allocate budget based on claim complexity and gap patterns
3. Replace O(n²) evidence deduplication with O(1) hash-based approach
4. Improve counter-query quality with LLM generation
5. Complete audit trail for research decisions

**Prerequisites:**
- Phase 1 stable in production for 2 weeks
- A/B test metrics meet Phase 1 success criteria
- `researchMetrics` telemetry data collected and analyzed
- No critical bugs or rollback events

---

## Table of Contents

1. [Phase 1 Learnings](#1-phase-1-learnings)
2. [Phase 2 Implementation](#2-phase-2-implementation)
3. [Technical Specifications](#3-technical-specifications)
4. [Success Criteria](#4-success-criteria)
5. [Configuration](#5-configuration)
6. [Implementation Order](#6-implementation-order)
7. [Risk Assessment](#7-risk-assessment)

---

## 1. Phase 1 Learnings

### 1.1 Metrics to Analyze Before Phase 2

Before starting Phase 2, analyze Phase 1 telemetry to validate assumptions:

| Metric | Question | Data Source |
|--------|----------|-------------|
| Multi-context frequency | How often do analyses have >1 AnalysisContext? | `researchMetrics.evidenceByContext` |
| Gap patterns | Which gap types are most common? | `researchMetrics.evidenceGaps` |
| Budget utilization | How much allocated budget is actually used? | `ExtractionTelemetry.tokensUsed/Reserved` |
| Throttling frequency | How often does backoff trigger? | `ExtractionTelemetry.throttlingEvents` |
| Counter-evidence success | Does pattern-based inversion find counter-evidence? | `claimDirection` distribution |

### 1.2 Phase 1 Code Review Findings (Applied)

These fixes from Phase 1 inform Phase 2 design:

| Finding | Phase 1 Fix | Phase 2 Implication |
|---------|-------------|---------------------|
| Similarity threshold 0.3 too permissive | Raised to 0.4 | Make configurable in Phase 2 |
| Concurrency limit hardcoded | Added `parallelExtractionLimit` to config | Extend pattern to context-parallelism |
| Temporal confidence 0.5 low | Raised to 0.6 | Consider adaptive thresholds |

### 1.3 Principal Architect Residual Observations

Items deferred to Phase 2 from the Phase 1 review:

1. **LLM-Generated Counter-Queries** - Pattern-based `generateInverseClaimQuery()` is limited; LLM can produce more nuanced counter-queries
2. **Configurable Evidence Similarity** - Domain-specific tuning for `CLAIM_EVIDENCE_SIMILARITY_THRESHOLD`
3. **Telemetry-Driven Optimization** - Use `researchMetrics` to identify bottlenecks

---

## 2. Phase 2 Implementation

**Duration:** 3-4 weeks
**Focus:** Advanced orchestration and efficiency

### 2.1 Priority P0: Context-Parallel Research

**Problem:** Multi-context claims process contexts sequentially, wasting time when contexts are independent.

**Solution:** Parallelize research across AnalysisContexts with isolated state.

```typescript
interface ContextResearchState {
  contextId: string;
  evidenceItems: EvidenceItem[];
  processedUrls: Set<string>;
  budgetAllocation: number;
  budgetUsed: number;
}

async function researchContextsParallel(
  understanding: ClaimUnderstanding,
  globalState: ResearchState,
  config: PipelineConfig
): Promise<void> {
  const contexts = understanding.analysisContexts;

  if (contexts.length <= 1) {
    // Single context: use existing sequential flow
    return researchSequential(understanding, globalState, config);
  }

  // Allocate budget per context (weighted by claim count)
  const contextStates = contexts.map(ctx => ({
    contextId: ctx.id,
    evidenceItems: [],
    processedUrls: new Set<string>(),
    budgetAllocation: calculateContextBudget(ctx, understanding, globalState.budgetTracker),
    budgetUsed: 0
  }));

  // Research contexts in parallel with isolated state
  const results = await Promise.allSettled(
    contextStates.map(ctxState =>
      researchSingleContext(ctxState, understanding, config)
    )
  );

  // Merge results into global state
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      const ctxResult = (results[i] as PromiseFulfilledResult<ContextResearchState>).value;
      globalState.evidenceItems.push(...ctxResult.evidenceItems);
      ctxResult.processedUrls.forEach(url => globalState.processedUrls.add(url));
    } else {
      // Log failure, context will have gaps
      console.error(`[Research] Context ${contextStates[i].contextId} failed:`,
        (results[i] as PromiseRejectedResult).reason);
    }
  }
}

function calculateContextBudget(
  context: AnalysisContext,
  understanding: ClaimUnderstanding,
  tracker: BudgetTracker
): number {
  // Weight by number of HIGH centrality claims in this context
  const contextClaims = understanding.subClaims.filter(c => c.contextId === context.id);
  const highCentrality = contextClaims.filter(c => c.centrality === "high").length;
  const totalHighCentrality = understanding.subClaims.filter(c => c.centrality === "high").length;

  const weight = totalHighCentrality > 0
    ? (highCentrality + 1) / (totalHighCentrality + understanding.analysisContexts.length)
    : 1 / understanding.analysisContexts.length;

  return Math.floor(tracker.remaining * weight);
}
```

**Deliverables:**
- [ ] `ContextResearchState` interface
- [ ] `researchContextsParallel()` function
- [ ] `calculateContextBudget()` weighted allocation
- [ ] State merge logic with deduplication
- [ ] Telemetry: per-context timing and success rate

**Effort:** 12 hours

---

### 2.2 Priority P0: LLM-Generated Counter-Queries

**Problem:** Pattern-based `generateInverseClaimQuery()` produces simplistic inversions that miss nuanced counter-evidence.

**Solution:** Piggyback counter-query generation on Phase 1 understanding call.

```typescript
// Schema addition to SubClaim
interface SubClaim {
  // ... existing fields
  counterQueries?: string[];  // LLM-generated queries to find counter-evidence
}

// Understand prompt addition
const COUNTER_QUERY_PROMPT = `
## COUNTER-QUERY GENERATION

For each HIGH centrality subClaim, generate 1-2 search queries that would find counter-evidence:
- counterQueries: Array of search strings to find evidence OPPOSING this claim
- Focus on finding: rebuttals, criticisms, contradicting studies, alternative explanations

Example:
- Claim: "Vaccine X is 95% effective"
- counterQueries: ["vaccine X efficacy concerns", "vaccine X effectiveness disputed study"]

Example:
- Claim: "Company Y committed fraud"
- counterQueries: ["Company Y fraud allegations dismissed", "Company Y cleared of wrongdoing"]

Only generate counterQueries for HIGH centrality claims. MEDIUM/LOW can omit this field.
`;

// Updated ensureCounterEvidence to prefer LLM-derived queries
async function ensureCounterEvidence(
  state: ResearchState,
  understanding: ClaimUnderstanding
): Promise<void> {
  const highCentralityClaims = understanding.subClaims.filter(
    c => c.centrality === "high"
  );

  for (const claim of highCentralityClaims) {
    const evidence = state.evidenceItems.filter(e => isEvidenceForClaim(e, claim));
    const hasContradicting = evidence.some(e => e.claimDirection === "contradicts");

    if (!hasContradicting) {
      // Prefer LLM-derived counter queries, fallback to pattern-based
      const counterQueries = claim.counterQueries?.length
        ? claim.counterQueries
        : [generateInverseClaimQuery(claim.text)];

      await executeResearchIteration(state, counterQueries, {
        targetClaimId: claim.id,
        searchType: "counter_evidence",
        querySource: claim.counterQueries?.length ? "llm" : "pattern"
      });
    }
  }
}
```

**Deliverables:**
- [ ] `counterQueries` field added to SubClaim schema
- [ ] Understand prompt updated with counter-query generation
- [ ] `ensureCounterEvidence()` updated to prefer LLM queries
- [ ] Telemetry: LLM vs pattern query success rate comparison
- [ ] Fallback to pattern-based when LLM queries empty

**Effort:** 6 hours

---

### 2.3 Priority P1: Adaptive Budget Allocation

**Problem:** Fixed budget allocation doesn't account for claim complexity or gap patterns.

**Solution:** Dynamic budget reallocation based on real-time gap analysis.

```typescript
interface AdaptiveBudgetConfig {
  initialAllocationStrategy: "equal" | "centrality_weighted" | "complexity_weighted";
  reallocationThreshold: number;  // Trigger reallocation when context uses this % of budget
  maxReallocationRatio: number;   // Max % of remaining budget to reallocate
}

interface BudgetTracker {
  // ... existing fields
  contextAllocations: Map<string, number>;
  contextUsage: Map<string, number>;
  reallocationHistory: BudgetReallocation[];
}

interface BudgetReallocation {
  timestamp: number;
  fromContextId: string;
  toContextId: string;
  amount: number;
  reason: "gap_severity" | "early_completion" | "throttling";
}

function maybeReallocateBudget(
  tracker: BudgetTracker,
  gaps: EvidenceGap[],
  config: AdaptiveBudgetConfig
): void {
  // Find contexts with critical gaps and remaining budget capacity
  const contextGaps = new Map<string, EvidenceGap[]>();
  for (const gap of gaps) {
    const existing = contextGaps.get(gap.contextId) || [];
    contextGaps.set(gap.contextId, [...existing, gap]);
  }

  // Find contexts that finished early (used < threshold of allocation)
  const underutilized: string[] = [];
  const needsMore: string[] = [];

  for (const [contextId, allocation] of tracker.contextAllocations) {
    const usage = tracker.contextUsage.get(contextId) || 0;
    const usageRatio = usage / allocation;
    const contextGapList = contextGaps.get(contextId) || [];
    const hasCriticalGaps = contextGapList.some(g => g.severity === "critical" || g.severity === "high");

    if (usageRatio < config.reallocationThreshold && !hasCriticalGaps) {
      underutilized.push(contextId);
    } else if (hasCriticalGaps && usageRatio > 0.8) {
      needsMore.push(contextId);
    }
  }

  // Reallocate from underutilized to contexts with critical gaps
  for (const fromCtx of underutilized) {
    if (needsMore.length === 0) break;

    const fromAllocation = tracker.contextAllocations.get(fromCtx) || 0;
    const fromUsage = tracker.contextUsage.get(fromCtx) || 0;
    const available = fromAllocation - fromUsage;
    const toReallocate = Math.min(available, tracker.remaining * config.maxReallocationRatio);

    if (toReallocate > 0) {
      const toCtx = needsMore.shift()!;
      tracker.contextAllocations.set(fromCtx, fromAllocation - toReallocate);
      tracker.contextAllocations.set(toCtx, (tracker.contextAllocations.get(toCtx) || 0) + toReallocate);
      tracker.reallocationHistory.push({
        timestamp: Date.now(),
        fromContextId: fromCtx,
        toContextId: toCtx,
        amount: toReallocate,
        reason: "gap_severity"
      });
    }
  }
}
```

**Deliverables:**
- [ ] `AdaptiveBudgetConfig` interface
- [ ] `BudgetReallocation` tracking
- [ ] `maybeReallocateBudget()` function
- [ ] Integration with research loop (check after each iteration)
- [ ] Telemetry: reallocation frequency and impact on coverage

**Effort:** 6 hours

---

### 2.4 Priority P1: Hash-Based Evidence Deduplication

**Problem:** Current evidence deduplication is O(n²) string comparison.

**Solution:** Use semantic hashing for O(1) lookup.

```typescript
import { createHash } from "crypto";

interface EvidenceHashIndex {
  statementHashes: Set<string>;
  excerptHashes: Set<string>;
  combinedHashes: Map<string, string>;  // hash → evidenceId
}

function hashEvidence(evidence: EvidenceItem): string {
  // Normalize and hash key fields
  const normalized = [
    evidence.statement.toLowerCase().trim(),
    evidence.sourceExcerpt?.toLowerCase().trim() || "",
    evidence.contextId || ""
  ].join("|");

  return createHash("sha256").update(normalized).digest("hex").substring(0, 16);
}

function isDuplicateEvidence(
  evidence: EvidenceItem,
  index: EvidenceHashIndex,
  similarityThreshold: number = 0.4
): { isDuplicate: boolean; duplicateOf?: string } {
  const hash = hashEvidence(evidence);

  // Exact hash match
  if (index.combinedHashes.has(hash)) {
    return { isDuplicate: true, duplicateOf: index.combinedHashes.get(hash) };
  }

  // Check statement hash alone (catches rephrased duplicates)
  const statementHash = createHash("sha256")
    .update(evidence.statement.toLowerCase().trim())
    .digest("hex")
    .substring(0, 16);

  if (index.statementHashes.has(statementHash)) {
    return { isDuplicate: true };
  }

  return { isDuplicate: false };
}

function addToEvidenceIndex(evidence: EvidenceItem, index: EvidenceHashIndex): void {
  const hash = hashEvidence(evidence);
  const statementHash = createHash("sha256")
    .update(evidence.statement.toLowerCase().trim())
    .digest("hex")
    .substring(0, 16);

  index.combinedHashes.set(hash, evidence.id);
  index.statementHashes.add(statementHash);
  if (evidence.sourceExcerpt) {
    const excerptHash = createHash("sha256")
      .update(evidence.sourceExcerpt.toLowerCase().trim())
      .digest("hex")
      .substring(0, 16);
    index.excerptHashes.add(excerptHash);
  }
}

// Integration with extraction
function deduplicateEvidenceItems(
  newItems: EvidenceItem[],
  existingIndex: EvidenceHashIndex
): EvidenceItem[] {
  const unique: EvidenceItem[] = [];

  for (const item of newItems) {
    const { isDuplicate, duplicateOf } = isDuplicateEvidence(item, existingIndex);
    if (!isDuplicate) {
      unique.push(item);
      addToEvidenceIndex(item, existingIndex);
    } else {
      console.log(`[Evidence] Skipping duplicate: "${item.statement.substring(0, 50)}..." (duplicate of ${duplicateOf || "similar item"})`);
    }
  }

  return unique;
}
```

**Deliverables:**
- [ ] `EvidenceHashIndex` interface
- [ ] `hashEvidence()` function
- [ ] `isDuplicateEvidence()` O(1) lookup
- [ ] `deduplicateEvidenceItems()` integration
- [ ] Telemetry: dedup hit rate and performance improvement

**Effort:** 3 hours

---

### 2.5 Priority P1: Research Decision Logging

**Problem:** No audit trail for why specific research decisions were made.

**Solution:** Structured logging of all research decisions.

```typescript
interface ResearchDecision {
  timestamp: number;
  decisionType: "query_selection" | "source_skip" | "evidence_accept" | "evidence_reject" |
                "gap_action" | "budget_allocation" | "iteration_stop";
  contextId?: string;

  // Decision-specific fields
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reasoning: string;
}

interface ResearchDecisionLog {
  analysisId: string;
  decisions: ResearchDecision[];
}

// Example decision logging
function logQuerySelectionDecision(
  log: ResearchDecisionLog,
  contextId: string,
  availableQueries: string[],
  selectedQueries: string[],
  reasoning: string
): void {
  log.decisions.push({
    timestamp: Date.now(),
    decisionType: "query_selection",
    contextId,
    input: { availableQueries, queryCount: availableQueries.length },
    output: { selectedQueries, selectedCount: selectedQueries.length },
    reasoning
  });
}

function logGapActionDecision(
  log: ResearchDecisionLog,
  gap: EvidenceGap,
  action: "research" | "skip" | "escalate",
  reasoning: string
): void {
  log.decisions.push({
    timestamp: Date.now(),
    decisionType: "gap_action",
    contextId: gap.contextId,
    input: { gapType: gap.gapType, severity: gap.severity, claimId: gap.claimId },
    output: { action, queriesGenerated: action === "research" ? gap.suggestedQueries.length : 0 },
    reasoning
  });
}

function logIterationStopDecision(
  log: ResearchDecisionLog,
  reason: "budget_exhausted" | "max_iterations" | "no_novel_evidence" | "all_gaps_addressed",
  metrics: { iteration: number; evidenceCount: number; budgetRemaining: number }
): void {
  log.decisions.push({
    timestamp: Date.now(),
    decisionType: "iteration_stop",
    input: metrics,
    output: { stopped: true },
    reasoning: reason
  });
}
```

**Deliverables:**
- [ ] `ResearchDecision` and `ResearchDecisionLog` interfaces
- [ ] Decision logging functions for each decision type
- [ ] Integration points in research loop
- [ ] Optional inclusion in output (`includeDecisionLog` config flag)
- [ ] Log analysis utilities for debugging

**Effort:** 4 hours

---

### 2.6 Priority P2: Configurable Evidence Similarity Threshold ✅ COMPLETE

**Status:** ✅ Implemented as Phase 2 "quick win" (2026-02-05)

**Problem:** `CLAIM_EVIDENCE_SIMILARITY_THRESHOLD = 0.4` is global; some domains need stricter/looser matching.

**Solution:** Make threshold configurable per-analysis or per-domain.

```typescript
interface PipelineConfig {
  // ... existing fields

  // P2: Configurable thresholds
  evidenceSimilarityThreshold?: number;  // Default: 0.4, range: 0.2-0.8
  temporalConfidenceThreshold?: number;  // Default: 0.6, range: 0.3-0.9
}

// Domain-specific presets (optional future extension)
const DOMAIN_PRESETS: Record<string, Partial<PipelineConfig>> = {
  "scientific": {
    evidenceSimilarityThreshold: 0.5,  // Stricter for scientific claims
    temporalConfidenceThreshold: 0.7
  },
  "legal": {
    evidenceSimilarityThreshold: 0.45,
    temporalConfidenceThreshold: 0.6
  },
  "news": {
    evidenceSimilarityThreshold: 0.35,  // More lenient for news
    temporalConfidenceThreshold: 0.5
  }
};
```

**Deliverables:**
- [x] Add `evidenceSimilarityThreshold` to PipelineConfig (config-schemas.ts)
- [x] Add `temporalConfidenceThreshold` to PipelineConfig (config-schemas.ts)
- [x] Update all usages of hardcoded constants (orchestrated.ts)
- [x] Validation: range checks on config values (Zod schema: 0.2-0.8, 0.3-0.9)
- [x] UCM default config updated (pipeline.default.json)
- [ ] (Optional) Domain preset system - Deferred to future iteration

**Effort:** 2 hours (actual: ~1 hour)

---

## 3. Technical Specifications

### 3.1 State Isolation for Context-Parallel Research

```typescript
// Each context gets isolated state to prevent cross-contamination
interface IsolatedContextState {
  contextId: string;

  // Isolated collections
  evidenceItems: EvidenceItem[];
  processedUrls: Set<string>;
  searchQueries: SearchQuery[];

  // Isolated budget
  budgetTracker: BudgetTracker;

  // Isolated telemetry
  telemetry: ExtractionTelemetry[];
  decisions: ResearchDecision[];
}

// Global state only tracks cross-cutting concerns
interface GlobalResearchState {
  // Shared across contexts (read-only during parallel phase)
  understanding: ClaimUnderstanding;
  globalProcessedUrls: Set<string>;  // For dedup hints, not enforcement

  // Aggregated after parallel phase
  allEvidence: EvidenceItem[];
  allTelemetry: ExtractionTelemetry[];
  allDecisions: ResearchDecision[];
}
```

### 3.2 Merge Strategy for Parallel Results

```typescript
function mergeContextResults(
  global: GlobalResearchState,
  contextStates: IsolatedContextState[]
): void {
  // Evidence: deduplicate across contexts
  const evidenceIndex: EvidenceHashIndex = {
    statementHashes: new Set(),
    excerptHashes: new Set(),
    combinedHashes: new Map()
  };

  for (const ctxState of contextStates) {
    const unique = deduplicateEvidenceItems(ctxState.evidenceItems, evidenceIndex);
    global.allEvidence.push(...unique);
  }

  // URLs: union of all processed URLs
  for (const ctxState of contextStates) {
    ctxState.processedUrls.forEach(url => global.globalProcessedUrls.add(url));
  }

  // Telemetry: concatenate with context labels
  for (const ctxState of contextStates) {
    global.allTelemetry.push(...ctxState.telemetry.map(t => ({
      ...t,
      contextId: ctxState.contextId
    })));
  }

  // Decisions: concatenate chronologically
  const allDecisions = contextStates.flatMap(s => s.decisions);
  allDecisions.sort((a, b) => a.timestamp - b.timestamp);
  global.allDecisions.push(...allDecisions);
}
```

### 3.3 Counter-Query Quality Metrics

```typescript
interface CounterQueryMetrics {
  totalHighCentralityClaims: number;
  claimsWithLLMCounterQueries: number;
  claimsWithPatternCounterQueries: number;

  llmQuerySuccessRate: number;     // % that found counter-evidence
  patternQuerySuccessRate: number; // % that found counter-evidence

  avgLLMQueriesPerClaim: number;
  avgPatternQueriesPerClaim: number;
}

function calculateCounterQueryMetrics(
  understanding: ClaimUnderstanding,
  state: ResearchState,
  decisions: ResearchDecision[]
): CounterQueryMetrics {
  const highCentrality = understanding.subClaims.filter(c => c.centrality === "high");

  let llmSuccess = 0, patternSuccess = 0;
  let llmTotal = 0, patternTotal = 0;

  for (const claim of highCentrality) {
    const counterDecisions = decisions.filter(d =>
      d.decisionType === "query_selection" &&
      d.input.targetClaimId === claim.id &&
      d.input.searchType === "counter_evidence"
    );

    for (const decision of counterDecisions) {
      const source = decision.input.querySource as string;
      const foundCounter = state.evidenceItems.some(e =>
        isEvidenceForClaim(e, claim) && e.claimDirection === "contradicts"
      );

      if (source === "llm") {
        llmTotal++;
        if (foundCounter) llmSuccess++;
      } else {
        patternTotal++;
        if (foundCounter) patternSuccess++;
      }
    }
  }

  return {
    totalHighCentralityClaims: highCentrality.length,
    claimsWithLLMCounterQueries: llmTotal,
    claimsWithPatternCounterQueries: patternTotal,
    llmQuerySuccessRate: llmTotal > 0 ? llmSuccess / llmTotal : 0,
    patternQuerySuccessRate: patternTotal > 0 ? patternSuccess / patternTotal : 0,
    avgLLMQueriesPerClaim: 0, // Calculate from decisions
    avgPatternQueriesPerClaim: 0
  };
}
```

---

## 4. Success Criteria

### 4.1 Performance Gates

| Metric | Target | Measurement |
|--------|--------|-------------|
| Multi-context analysis speedup | 30-50% | Timer comparison vs sequential |
| Evidence dedup performance | O(1) lookup | Benchmark comparison |
| Budget utilization | ≥90% | `tokensUsed / tokensAllocated` |

### 4.2 Quality Gates

| Metric | Target | Measurement |
|--------|--------|-------------|
| LLM counter-query success rate | >60% | `CounterQueryMetrics` |
| Counter-evidence coverage (HIGH) | ≥75% | Improvement from Phase 1's 70% |
| Cross-context evidence dedup | <3% duplicates | Hash collision rate |

### 4.3 Operational Gates

| Metric | Target | Measurement |
|--------|--------|-------------|
| Decision log completeness | 100% | All decision types logged |
| Parallel research failure rate | <5% | `Promise.allSettled` rejection rate |
| Budget reallocation frequency | <20% of analyses | Telemetry |

---

## 5. Configuration

### 5.1 New PipelineConfig Fields

```typescript
interface PipelineConfig {
  // ... existing Phase 1 fields

  // P0: Context-parallel research
  enableContextParallelism?: boolean;     // Default: true
  maxParallelContexts?: number;           // Default: 4
  contextBudgetStrategy?: "equal" | "centrality_weighted";  // Default: "centrality_weighted"

  // P0: LLM counter-queries
  enableLLMCounterQueries?: boolean;      // Default: true
  maxCounterQueriesPerClaim?: number;     // Default: 2

  // P1: Adaptive budget
  enableAdaptiveBudget?: boolean;         // Default: true
  budgetReallocationThreshold?: number;   // Default: 0.6
  maxBudgetReallocationRatio?: number;    // Default: 0.3

  // P1: Decision logging
  includeDecisionLog?: boolean;           // Default: false (verbose)
  decisionLogLevel?: "minimal" | "standard" | "verbose";  // Default: "standard"

  // P2: Configurable thresholds ✅ IMPLEMENTED (2026-02-05)
  evidenceSimilarityThreshold?: number;   // Default: 0.4, range: 0.2-0.8
  temporalConfidenceThreshold?: number;   // Default: 0.6, range: 0.3-0.9
}
```

### 5.2 Environment Variables

```bash
# Context parallelism
ENABLE_CONTEXT_PARALLELISM=true
MAX_PARALLEL_CONTEXTS=4

# LLM counter-queries
ENABLE_LLM_COUNTER_QUERIES=true

# Adaptive budget
ENABLE_ADAPTIVE_BUDGET=true

# Decision logging
INCLUDE_DECISION_LOG=false
DECISION_LOG_LEVEL=standard
```

---

## 6. Implementation Order

### Week 1: Foundation

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Analyze Phase 1 telemetry | Metrics report, validated assumptions |
| 2 | Hash-based evidence dedup (P1) | `EvidenceHashIndex`, dedup functions |
| 3-4 | Context-parallel research (P0) | `researchContextsParallel()`, state isolation |
| 5 | Integration testing | Parallel research working in test env |

### Week 2: Quality Improvements

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | LLM counter-queries (P0) | Schema update, prompt addition, integration |
| 3 | Research decision logging (P1) | `ResearchDecisionLog`, logging functions |
| ~~4~~ | ~~Configurable thresholds (P2)~~ | ✅ **DONE** (quick win, 2026-02-05) |
| 5 | Integration testing | All P0-P2 features working together |

### Week 3: Adaptive Budget & Polish

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Adaptive budget allocation (P1) | `maybeReallocateBudget()`, tracking |
| 3 | Telemetry & metrics | `CounterQueryMetrics`, decision log analysis |
| 4 | Documentation | Updated architecture docs, config guide |
| 5 | Code review | PR ready for review |

### Week 4: Validation & Rollout

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | A/B testing setup | Feature flags, 10% traffic split |
| 3-4 | Monitoring & adjustment | Threshold tuning based on A/B results |
| 5 | Rollout or rollback decision | Go/no-go based on success criteria |

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Context isolation leaks | Medium | High | Defensive copying, immutable state patterns |
| LLM counter-query hallucination | Medium | Medium | Validate query format, fallback to pattern |
| Budget reallocation thrashing | Low | Medium | Min reallocation interval, max reallocations |
| Hash collision (false dedup) | Low | High | Use longer hash (16 chars), add secondary check |

### 7.2 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parallel research increases costs | Medium | Medium | Budget caps per context, telemetry alerts |
| Decision log bloat | High | Low | Log level config, optional inclusion |
| A/B test contamination | Low | High | Strict user bucketing, no mid-session changes |

### 7.3 Rollback Plan

```bash
# Disable all Phase 2 features
ENABLE_CONTEXT_PARALLELISM=false
ENABLE_LLM_COUNTER_QUERIES=false
ENABLE_ADAPTIVE_BUDGET=false
INCLUDE_DECISION_LOG=false

# Or full code rollback
git revert <phase-2-commit-range>
```

---

## 8. Dependencies

### 8.1 Phase 1 Prerequisites

- [ ] Phase 1 deployed to production
- [ ] 2-week stabilization period complete
- [ ] A/B test metrics meet success criteria:
  - [ ] Evidence coverage (HIGH) ≥ 85%
  - [ ] Counter-evidence rate ≥ 70%
  - [ ] Extraction latency -40%
  - [ ] URL re-fetch rate < 5%
- [ ] No critical bugs or rollback events
- [ ] `researchMetrics` telemetry data collected

### 8.2 External Dependencies

- [ ] LLM provider API stability (for parallel requests)
- [ ] Search provider rate limits documented
- [ ] Budget tracking system verified accurate

---

## 9. Code References

| Component | File | Phase 1 Lines |
|-----------|------|---------------|
| Research orchestration | `orchestrated.ts` | 5700-6000 |
| Evidence extraction | `orchestrated.ts` | 6454-6700 |
| Budget tracking | `orchestrated.ts` | 10800+ |
| Gap analysis | `orchestrated.ts` | (Phase 1 addition) |
| Evidence dedup | `evidence-filter.ts` | 1-290 |

---

## 10. Approval Workflow

### 10.1 Before Implementation

- [ ] Phase 1 stabilization confirmed (Lead Dev sign-off)
- [ ] Telemetry analysis complete (Data review)
- [ ] Phase 2 plan reviewed (Principal Architect)
- [ ] Resource allocation confirmed (Project Manager)

### 10.2 Implementation Checkpoints

- [ ] Week 1 checkpoint: Parallel research working in test
- [ ] Week 2 checkpoint: All features integrated
- [ ] Week 3 checkpoint: Code review complete
- [ ] Week 4 checkpoint: A/B test results analyzed

### 10.3 Go-Live Approval

- [ ] All success criteria met in A/B test
- [ ] No regression in Phase 1 metrics
- [ ] Rollback plan tested
- [ ] On-call team briefed

---

**Document Status:** 📋 PLANNING - AWAITING PHASE 1 STABILIZATION
**Next Review:** After Phase 1 2-week stabilization period
**Owner:** Lead Developer
**Approver:** Principal Software Architect
