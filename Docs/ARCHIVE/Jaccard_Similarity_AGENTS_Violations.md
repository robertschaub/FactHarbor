# Jaccard Similarity AGENTS.md Violations Report

**Date**: 2026-02-12
**Updated**: 2026-02-12 (Phase 1 Complete)
**Severity**: HIGH (down from CRITICAL)
**Status**: Active violations remaining — Phase 1 (assessTextSimilarityBatch) COMPLETE

---

## Summary

Multiple uses of Jaccard similarity (`intersection.size / union.size` on word sets) violate **AGENTS.md § LLM Intelligence Migration**:

> **REPLACE existing / NEVER CREATE new** (deterministic logic making analytical decisions about text):
> - Text similarity heuristics that influence analytical outcomes

These violations were introduced pre-AGENTS.md and have not yet been migrated. The most critical violation is in the **frame signal text-distinctness check** (orchestrated.ts:1741-1783), which we just "improved" by tightening thresholds — but the entire approach must be replaced with LLM intelligence.

---

## Progress Update (2026-02-12)

**✅ Phase 1 COMPLETE**: `assessTextSimilarityBatch` Jaccard fallback removed and replaced with LLM-only implementation with retry logic. See [Phase 1 Implementation Plan](../ARCHIVE/Phase1_Implementation_Plan.md) for details.

**Implementation Details**:
- Retry loop with exponential backoff (3 attempts, 100/200/400ms)
- Schema validation with detailed logging
- Missing-score fail-safe (no synthetic similarity injection)
- All 14 tests passing

**Impact**: Frame signal text-distinctness check now uses LLM exclusively (no Jaccard fallback).

---

## Violations by Severity

### ~~CRITICAL~~ ✅ RESOLVED: Frame Signal Text-Distinctness Check

**Status**: **RESOLVED** (2026-02-12) — Phase 1 implementation replaced Jaccard fallback with LLM-only similarity assessment

**File**: `apps/web/src/lib/analyzer/orchestrated.ts` (line numbers outdated, need update)
**Function**: Frame signal logic in `refineContextsFromEvidence`
**Decision**: Whether multiple AnalysisContexts represent genuinely distinct analytical frames or dimension splits

**Previous violation**: Used Jaccard similarity as fallback when LLM unavailable

**Current implementation**: Uses `assessTextSimilarityBatch` with LLM-only contract (no deterministic fallback). If LLM fails after retries, scores are left unset and caller defaults apply (conservative, fail-safe behavior).

**Remaining work**: None for this violation

---

### HIGH: Claim Clustering for Duplicate Detection

**File**: `apps/web/src/lib/analyzer/orchestrated.ts:3486-3506`
**Function**: `clusterClaimsByImportance` (verdict aggregation preprocessing)
**Decision**: Which ClaimVerdicts are duplicates (groups them, redistributes weights)

**Code**:
```typescript
const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

const clusterThreshold = CLAIM_CLUSTERING_CONFIG.jaccardSimilarityThreshold;  // 0.6
const clusters: ClaimVerdict[][] = [];
for (const verdict of verdicts) {
  const tokens = tokenize(verdict.claimText);
  for (const cluster of clusters) {
    const clusterTokens = tokenize(cluster[0].claimText);
    if (jaccardSimilarity(tokens, clusterTokens) >= clusterThreshold) {
      cluster.push(verdict);  // ANALYTICAL DECISION: this is a duplicate
      break;
    }
  }
}
```

**Impact**: Changes verdict weighting in final aggregation. Primary claim gets weight 1.0, duplicates split `duplicateWeightShare` (default 0.5). This affects the final confidence score.

**Why it's a violation**: Decides whether "Solar efficiency improved" and "Solar panels became more efficient" are semantically duplicate claims based on word overlap. This is semantic interpretation requiring understanding, not just structural matching.

---

### MEDIUM: Context Similarity for Deduplication

**File**: `apps/web/src/lib/analyzer/orchestrated.ts:2105-2110`
**Function**: `calculateContextSimilarity`
**Decision**: Similarity score used in context deduplication logic

**Code**:
```typescript
function calculateContextSimilarity(a: any, b: any): number {
  const nameA = String(a?.name || "");
  const nameB = String(b?.name || "");
  const nameSim = jaccardSimilarity(nameA, nameB);
  const subjectSim = a?.subject && b?.subject
    ? jaccardSimilarity(String(a.subject), String(b.subject)) : 0;
  const assessedSim = (a as any)?.assessedStatement && (b as any)?.assessedStatement
    ? jaccardSimilarity(String((a as any).assessedStatement), String((b as any).assessedStatement)) : 0;
  return nameSim * 0.4 + subjectSim * 0.2 + assessedSim * 0.4;
}
```

**Impact**: Used in `deduplicateContexts` (orchestrated.ts:2333-2450) to decide which contexts to merge.

**Why it's a violation**: Semantic similarity judgment (context A and context B represent the same analytical frame) based on word overlap + weighted average.

---

### MEDIUM: Evidence Deduplication Fallback

**File**: `apps/web/src/lib/analyzer/evidence-deduplication.ts:110, 163-170`
**Function**: `EvidenceDeduplicator.isDuplicate` (fallback when LLM unavailable)
**Decision**: Whether two EvidenceItems are duplicates

**Code**:
```typescript
if (!this.assessTextSimilarityBatch) {
  for (const existing of existingItems) {
    if (jaccardSimilarity(newItem.statement, existing.statement) >= similarityThreshold) {
      return true;  // ANALYTICAL DECISION: duplicate
    }
  }
}
```

**Impact**: Filters evidence items during extraction. Duplicates are discarded.

**Why it's a violation**: Decides whether "Solar efficiency improved 25%" and "Solar panels reached 25% efficiency" are duplicates based on word overlap. This is semantic equivalence judgment.

**Mitigation**: This is a *fallback* when LLM is unavailable. The primary path uses LLM-powered similarity via `assessTextSimilarityBatch`. Still violates the rule ("NEVER CREATE new deterministic logic"), but lower risk because it only runs during LLM failures.

---

### MEDIUM: Context Detection Structural Fallback

**File**: `apps/web/src/lib/analyzer/analysis-contexts.ts:317-328`
**Function**: Structural similarity fallback in context canonicalization
**Decision**: Text similarity score (purpose unclear from excerpt)

**Code**:
```typescript
// Structural fallback: Jaccard similarity
const normalize = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
const map = new Map<string, number>();
for (const pair of pairs) {
  const words1 = new Set(normalize(pair.textA));
  const words2 = new Set(normalize(pair.textB));
  if (words1.size === 0 || words2.size === 0) { map.set(pair.id, 0); continue; }
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  map.set(pair.id, union.size === 0 ? 0 : intersection.size / union.size);
}
```

**Impact**: Unknown — need to trace where this map is consumed. Comment says "structural fallback".

**Why it might be a violation**: Labeled "fallback" suggests it makes decisions when primary path unavailable.

---

### LOW: Telemetry Evidence Coverage Check

**Files**: `apps/web/src/lib/analyzer/orchestrated.ts:13350, 13363`
**Function**: Telemetry calculation for evidence coverage metrics
**Decision**: Which claims have "matching" evidence for telemetry purposes

**Impact**: Telemetry only — doesn't affect analysis output or verdict.

**Why it's technically a violation**: Still interprets semantic similarity to decide if evidence "matches" a claim.

**Risk**: Low — telemetry doesn't affect user-facing results.

---

## Remediation Plan

### Phase 1: Replace Frame Signal Text-Distinctness (CRITICAL)

**Target**: orchestrated.ts:1741-1783
**Approach**: LLM call asking: "Do these context pairs represent genuinely distinct analytical frames?"

**Prompt structure**:
```
Context A: {name: "Solar Energy Efficiency", assessedStatement: "..."}
Context B: {name: "Solar Energy Cost", assessedStatement: "..."}

Do these represent genuinely distinct analytical frames requiring separate analysis,
or are they dimension splits of the same topic that should be merged?

Return: { distinct: boolean, reasoning: string }
```

**Efficiency**: Batch all context pairs (typically 1-3 pairs) in a single LLM call. Use Haiku tier (lightweight judgment).

**Config**: Add `frameSignal.useLLMDistinctnessCheck: boolean` (default true). Fallback to current heuristic only if disabled or LLM fails.

---

### Phase 2: Replace Claim Clustering (HIGH)

**Target**: orchestrated.ts:3486-3506
**Approach**: LLM batch call for semantic duplicate detection

**Prompt structure**:
```
Identify which of these claim verdicts are semantic duplicates:

1. "Solar efficiency improved significantly"
2. "Solar panels became more efficient"
3. "Wind turbines produced more energy"

Return: { clusters: [[1,2], [3]], reasoning: string }
```

**Efficiency**: Single LLM call for all verdicts (typically 5-10). Use Haiku tier.

---

### Phase 3: Replace Context Similarity (MEDIUM)

**Target**: orchestrated.ts:2105-2110
**Approach**: LLM similarity score 0-1 for context pairs

Already partially implemented in analysis-contexts.ts (`assessTextSimilarityBatch`). Ensure `calculateContextSimilarity` uses LLM path, not Jaccard fallback.

---

### Phase 4: Improve Evidence Dedup Fallback (MEDIUM)

**Target**: evidence-deduplication.ts:110
**Status**: Primary path already uses LLM (`assessTextSimilarityBatch`). Jaccard is fallback only.

**Options**:
1. **Keep fallback** — violations are acceptable in error-handling paths
2. **Fail loudly** — throw error instead of falling back to Jaccard
3. **Cache + retry** — store LLM similarity results, retry LLM on next run

**Recommendation**: Keep fallback for now (option 1). Prioritize fixing the CRITICAL and HIGH violations first.

---

### Phase 5: Audit analysis-contexts.ts Fallback (MEDIUM)

**Target**: analysis-contexts.ts:317-328
**Action**: Trace where the similarity map is consumed. If it makes analytical decisions, replace with LLM. If it's truly structural (e.g., caching keys), document and keep.

---

## Implementation Priority

1. **Phase 1 (Frame Signal)** — CRITICAL, directly affects Session 32 quality issues
2. **Phase 2 (Claim Clustering)** — HIGH, affects final verdict weights
3. **Phase 3 (Context Similarity)** — MEDIUM, check if LLM path already exists
4. **Phase 5 (analysis-contexts audit)** — MEDIUM, need to understand usage first
5. **Phase 4 (Evidence Dedup fallback)** — LOW priority (error path only)

---

## Cost & Efficiency Analysis

### Current state (deterministic Jaccard)
- **Cost**: Zero (pure string manipulation)
- **Quality**: Poor semantic understanding, causes false positives/negatives

### After LLM migration
- **Cost per analysis**:
  - Frame signal: ~1 Haiku call (1-3 context pairs, <500 tokens)
  - Claim clustering: ~1 Haiku call (5-10 claims, <1000 tokens)
  - Context similarity: Already LLM-powered in primary path
- **Total added cost**: ~$0.0001 - $0.0003 per analysis (Haiku tier)
- **Quality**: Correct semantic understanding, eliminates false splits

**Cost is negligible compared to existing LLM usage** (understand, extract, verdict steps already use 10+ LLM calls per analysis).

---

## Session 32 Context

The "fix" we applied in Session 32 (tightening Jaccard thresholds from 0.5/0.6 → 0.35/0.45) **reduces symptoms but doesn't fix the root cause**. We're still using deterministic text analysis to make analytical decisions.

The proper fix is Phase 1 (LLM-powered frame signal check). The threshold tightening can stay as a fallback for when LLM is unavailable.

---

## Files Summary

| File | Violations | Severity |
|------|------------|----------|
| `orchestrated.ts` | Lines 1741-1783 (frame signal), 3486-3506 (claim clustering), 2105-2110 (context similarity), 13350/13363 (telemetry) | CRITICAL, HIGH, MEDIUM, LOW |
| `evidence-deduplication.ts` | Line 110 (fallback only) | MEDIUM |
| `analysis-contexts.ts` | Lines 317-328 (need to audit usage) | MEDIUM? |

---

## Next Steps for Lead Developer

1. **Acknowledge**: Confirm you want Phase 1 (Frame Signal LLM replacement) implemented first
2. **Design review**: Should the LLM call go in `refineContextsFromEvidence` or be extracted to a helper function?
3. **Config decision**: Add `frameSignal.useLLMDistinctnessCheck` flag, or make it the default with no fallback?
4. **Implementation**: Create the LLM prompt, integrate into frame signal logic, test on Session 32 validation matrix

Would you like me to implement Phase 1 now, or do you want to review/modify the plan first?

---

## Reviewer Comments (Senior Developer + LLM Expert) - 2026-02-12

### Overall assessment

The report is directionally strong and correctly identifies that deterministic semantic logic still exists.  
However, several sections are now technically outdated versus current code, and a few recommendations conflict with the current AGENTS migration directive.

### Findings to fix in this document before implementation

1. **Frame-signal section is outdated (CRITICAL correction)**
- Current code does **not** directly call `calculateTextSimilarity` in frame-signal checks.
- It now uses batched `assessTextSimilarityBatch(...)` in `orchestrated.ts` (around `1609-1634`), with LLM as primary path.
- Remaining violation is the **Jaccard fallback inside `assessTextSimilarityBatch`** (around `2045-2056`), not the frame loop itself.

2. **Line references are stale in multiple sections (HIGH correction)**
- Example: frame-signal references (`1741-1783`) are no longer accurate for current file state.
- Update all references to current line ranges before implementation planning.

3. **Context similarity section mixes old/new state (HIGH correction)**
- `calculateContextSimilarity` has been removed as primary path; `assessContextSimilarity(...)` is now LLM-first.
- Current violation is again fallback behavior (weighted Jaccard in `assessContextSimilarity` catch path), not primary scoring logic.

4. **analysis-contexts "impact unknown" is incorrect (HIGH correction)**
- The fallback similarity map in `analysis-contexts.ts` is consumed by `mergeAndDeduplicateContexts(...)`.
- It does influence AnalysisContext dedup decisions; impact is known and should be labeled as active analytical impact.

5. **Recommendation to "keep fallback for now" conflicts with current AGENTS directive (HIGH policy correction)**
- Current directive: deterministic semantic decision paths should be replaced, not retained as operational fallbacks.
- Proposed text should be changed from "keep fallback" to "use non-semantic fail-safe behavior + retry/circuit-breaker."

6. **Missing non-Jaccard deterministic semantic path relevant to same policy (MEDIUM scope correction)**
- `generateInverseClaimQuery(...)` in `orchestrated.ts` is regex/rule-based semantic inversion and affects search routing.
- Even though this report is Jaccard-focused, add a scope note to avoid accidental blind spots during migration.

7. **Efficiency section needs concrete controls (MEDIUM completeness correction)**
- Add explicit requirements for cache key design, batch size/caps, and schema-validated structured output.
- Current text has cost estimates but lacks enforceable engineering controls.

### Suggested edits to this report

- Reframe violation classification as:
  - Primary LLM path: mostly migrated in several areas.
  - Active violation surface: deterministic semantic fallback paths and remaining deterministic semantic generators.
- Update remediation language to:
  - remove deterministic semantic fallbacks from active decision paths,
  - replace with LLM retry + neutral fail-safe behavior,
  - add caching/tiering constraints as implementation gates.
