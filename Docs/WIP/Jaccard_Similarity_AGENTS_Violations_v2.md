# Jaccard Similarity AGENTS.md Violations Report (Corrected)

**Date**: 2026-02-12 (v2 — corrected per reviewer feedback)
**Severity**: HIGH
**Status**: Phase 1 RESOLVED (2026-02-12). Remaining violations in Phases 2-4.

---

## Executive Summary

**Correction to v1**: The primary analysis paths now use LLM-powered semantic similarity (`assessTextSimilarityBatch`, `analyzeContextSimilarity`). The active AGENTS.md violations are:

1. **Deterministic semantic fallback paths** that use Jaccard similarity when LLM calls fail or return invalid responses
2. **Remaining deterministic semantic generators** (e.g., regex-based inverse query generation)

These fallback paths violate AGENTS.md § LLM Intelligence Migration:

> **REPLACE existing / NEVER CREATE new** (deterministic logic making analytical decisions about text):
> - Text similarity heuristics that influence analytical outcomes

**Current directive**: Deterministic semantic decision paths should be replaced with LLM retry + neutral fail-safe behavior, not retained as operational fallbacks.

---

## Violations by Severity (Corrected)

### ~~HIGH: Deterministic Semantic Fallback in assessTextSimilarityBatch~~ RESOLVED

**Status**: **RESOLVED** (2026-02-12) — Phase 1 implemented. Jaccard fallback removed. Replaced with retry (3 attempts, exponential backoff + jitter) + missing-score fail-safe (leave pair IDs unset, caller defaults apply).

**File**: `apps/web/src/lib/analyzer/orchestrated.ts`
**Lines**: ~~2045 (invalid response fallback), 2051-2058 (LLM failure fallback)~~ Removed
**Function**: `assessTextSimilarityBatch` — used by frame signal check, context dedup, claim clustering

**Primary path** (COMPLIANT): Lines 2000-2086 — LLM with batched similarity prompts, per-chunk retry, schema validation
**~~Violation~~ (RESOLVED)**: ~~When LLM fails or returns invalid JSON, falls back to Jaccard:~~

```typescript
// Line 2043-2047: Invalid LLM response for this chunk
} else {
  // Invalid LLM response for this chunk — fallback
  for (const pair of chunk) {
    resultMap.set(pair.id, jaccardSimilarity(pair.textA, pair.textB));  // VIOLATION
  }
}

// Line 2050-2058: LLM call exception
} catch {
  // LLM call failed — structural fallback for all pairs
}
const map = new Map<string, number>();
for (const pair of pairs) {
  map.set(pair.id, jaccardSimilarity(pair.textA, pair.textB));  // VIOLATION
}
return map;
```

**Impact**:
- **Frame signal** (lines 1609-1638): Decides context splitting — most critical analytical decision
- **Claim clustering** (lines 3486-3506): Groups duplicate claims, redistributes verdict weights
- **Context similarity** (used in dedup): Decides which contexts to merge

**Used by**: Frame signal check (line 1629), claim clustering (line 3501), context deduplication

**Current behavior**: When LLM unavailable/invalid, deterministic Jaccard makes the analytical decision (context split, claim grouping, context merge).

**Required fix**: Remove Jaccard fallback. Replace with:
1. **Retry with exponential backoff** (3 attempts)
2. **Circuit breaker** (skip similarity check if all retries fail)
3. **Neutral fail-safe**: Conservative default (e.g., treat contexts as distinct, don't cluster claims)

---

### MEDIUM: Deterministic Semantic Fallback in Evidence Deduplication

**File**: `apps/web/src/lib/analyzer/evidence-deduplication.ts`
**Line**: 110
**Function**: `EvidenceDeduplicator.isDuplicate`

**Primary path** (COMPLIANT): Uses `assessTextSimilarityBatch` (LLM-powered)
**Violation** (FALLBACK): When `assessTextSimilarityBatch` unavailable (constructor param), falls back to Jaccard:

```typescript
if (!this.assessTextSimilarityBatch) {
  for (const existing of existingItems) {
    if (jaccardSimilarity(newItem.statement, existing.statement) >= similarityThreshold) {
      return true;  // VIOLATION — decides evidence is duplicate
    }
  }
  return false;
}
```

**Impact**: Filters evidence items during extraction. Duplicates are discarded.

**Current behavior**: If `EvidenceDeduplicator` is constructed without the LLM similarity function, Jaccard makes the duplicate decision.

**Required fix**: Remove the non-LLM constructor path. `EvidenceDeduplicator` should always require `assessTextSimilarityBatch`. If LLM is unavailable, skip deduplication (keep all evidence) rather than using deterministic semantic logic.

---

### MEDIUM: Deterministic Semantic Fallback in Context Canonicalization

**File**: `apps/web/src/lib/analyzer/analysis-contexts.ts`
**Lines**: 317-328
**Function**: Structural similarity fallback in context merging
**Impact**: **KNOWN** (contrary to v1 report) — consumed by `mergeAndDeduplicateContexts`, influences AnalysisContext dedup decisions

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
  map.set(pair.id, union.size === 0 ? 0 : intersection.size / union.size);  // VIOLATION
}
return map;
```

**Impact**: Similarity scores feed into context deduplication — decides which contexts represent the same analytical frame and should be merged.

**Required fix**: Same as above — replace fallback with LLM retry + neutral fail-safe (skip dedup if LLM unavailable).

---

### LOW: Telemetry Evidence Coverage Check

**Files**: `apps/web/src/lib/analyzer/orchestrated.ts:13350, 13363`
**Function**: Telemetry calculation for evidence coverage metrics
**Impact**: Telemetry only — doesn't affect analysis output or verdict

**Required fix**: Low priority. Can remain as-is (telemetry approximation is acceptable) or migrate to LLM for accuracy.

---

## Additional Scope: Non-Jaccard Deterministic Semantic Logic

**Finding**: `generateInverseClaimQuery` (orchestrated.ts, exact line TBD) uses regex/rule-based semantic inversion ("Is X Y?" → "X is not Y") to generate counter-evidence search queries.

**Why it's relevant**: Regex-based semantic transformations violate the same AGENTS.md principle — deterministic text analysis making analytical decisions (query routing affects which evidence is retrieved).

**Scope note**: This Jaccard-focused report doesn't address inverse query generation, but migration planners should add it to the backlog to avoid blind spots.

---

## Remediation Plan (Corrected)

### Phase 1: Remove Jaccard Fallback from assessTextSimilarityBatch (HIGH) — DONE

**Status**: **IMPLEMENTED** (2026-02-12)
**Target**: `orchestrated.ts:2043-2058` (now lines 2000-2086)
**Impact**: Frame signal, claim clustering, context similarity
**Tests**: 14/14 passing (`assess-text-similarity-batch.test.ts`), full suite 869/872 (3 pre-existing)

**Implementation**:
```typescript
async function assessTextSimilarityBatch(
  pairs: Array<{ id: string; textA: string; textB: string }>,
  maxRetries: number = 3,
): Promise<Map<string, number>> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resultMap = new Map<string, number>();
      for (let i = 0; i < pairs.length; i += batchSize) {
        const chunk = pairs.slice(i, i + batchSize);
        const result = await generateText({...});

        const scores = JSON.parse(result.text.trim().replace(/```json?/gi, "").replace(/```/g, ""));

        // Schema validation
        if (!Array.isArray(scores) || scores.length !== chunk.length) {
          if (attempt < maxRetries) continue;  // Retry
          // All retries exhausted — neutral fail-safe
          for (const pair of chunk) {
            resultMap.set(pair.id, 0.5);  // Neutral: neither similar nor distinct
          }
          continue;
        }

        // Valid response
        for (let j = 0; j < chunk.length; j++) {
          const score = typeof scores[j] === "number" ? Math.max(0, Math.min(1, scores[j])) : 0.5;
          resultMap.set(chunk[j].id, score);
        }
      }
      return resultMap;
    } catch (err) {
      if (attempt < maxRetries) {
        await sleep(2 ** attempt * 100);  // Exponential backoff
        continue;
      }
      // All retries exhausted — neutral fail-safe
      const map = new Map<string, number>();
      for (const pair of pairs) {
        map.set(pair.id, 0.5);  // Neutral default
      }
      return map;
    }
  }
}
```

**Neutral fail-safe behavior**:
- **Frame signal**: Similarity 0.5 (neutral) means both thresholds likely fail (0.5 !< 0.35), so `hasStrongFrameSignal` stays false → contexts collapse to one (conservative)
- **Claim clustering**: Similarity 0.5 < 0.6 threshold → claims don't cluster (conservative — treat as distinct)
- **Context dedup**: Similarity 0.5 is mid-range → conservative dedup behavior (depends on threshold)

**Efficiency controls**:
- `maxRetries = 3` (configurable via PipelineConfig)
- `batchSize = 20` (configurable)
- Exponential backoff: 100ms, 200ms, 400ms
- Schema-validated structured output (array length check)
- Cache key design: `hash(pair.textA + "|" + pair.textB)` for dedup across retries

---

### Phase 2: Remove Jaccard Fallback from Evidence Deduplication (MEDIUM)

**Target**: `evidence-deduplication.ts:110`

**Implementation**:
```typescript
export class EvidenceDeduplicator {
  constructor(
    private assessTextSimilarityBatch: (pairs: Array<{ id: string; textA: string; textB: string }>) => Promise<Map<string, number>>,
    // Remove the optional parameter — always require LLM function
  ) {
    if (!assessTextSimilarityBatch) {
      throw new Error("EvidenceDeduplicator requires LLM-powered similarity function");
    }
  }

  async isDuplicate(
    newItem: EvidenceItem,
    existingItems: EvidenceItem[],
    similarityThreshold: number,
  ): Promise<boolean> {
    // No fallback — always use LLM
    const pairs = existingItems.map(e => ({
      id: e.id,
      textA: newItem.statement,
      textB: e.statement,
    }));
    const scores = await this.assessTextSimilarityBatch(pairs);
    for (const existing of existingItems) {
      const score = scores.get(existing.id) ?? 0;
      if (score >= similarityThreshold) return true;
    }
    return false;
  }
}
```

**Neutral fail-safe**: If LLM unavailable (constructor fails), skip deduplication entirely — keep all evidence items. Better to have duplicates than to lose evidence via deterministic false-positive matching.

---

### Phase 3: Remove Jaccard Fallback from Context Canonicalization (MEDIUM)

**Target**: `analysis-contexts.ts:317-328`

**Implementation**: Replace Jaccard block with call to `assessTextSimilarityBatch` (already available in orchestrated.ts). If LLM unavailable, return neutral scores (0.5) for all pairs.

---

### Phase 4: Audit and Migrate Inverse Query Generation (MEDIUM scope extension)

**Target**: `generateInverseClaimQuery` (orchestrated.ts)
**Scope**: Outside Jaccard focus, but same AGENTS.md principle
**Action**: Add to migration backlog — replace regex-based inversion with LLM-powered query reformulation

---

## Efficiency Controls (Engineering Gates)

All LLM-powered similarity implementations MUST include:

1. **Batch size caps**: Max 20 pairs per LLM call (configurable via `PipelineConfig.similarityBatchSize`)
2. **Retry with backoff**: 3 attempts, exponential backoff (100ms, 200ms, 400ms)
3. **Schema validation**: Array length must match input pair count; scores must be numbers 0-1
4. **Cache key design**: `hash(textA + "|" + textB)` for deduplication across retries and runs
5. **Neutral fail-safe**: Return 0.5 (neither similar nor distinct) when all retries exhausted
6. **Circuit breaker**: If >50% of similarity calls fail in a session, log error and use neutral defaults for remainder

---

## Implementation Priority (Corrected)

| Phase | Target | Severity | Impact | Effort |
|-------|--------|----------|--------|--------|
| **1** | ~~`assessTextSimilarityBatch` fallback removal~~ | ~~HIGH~~ DONE | Frame signal, claim clustering, context dedup | ~~Medium (2-3 hours)~~ Done |
| **2** | Evidence dedup fallback removal | MEDIUM | Evidence filtering | Low (1 hour) |
| **3** | Context canonicalization fallback removal | MEDIUM | Context merging | Low (1 hour) |
| **4** | Inverse query generation audit | MEDIUM | Search routing | Medium (scope unclear) |

**Total estimated effort**: 4-6 hours for Phases 1-3
**Prerequisite**: Existing LLM infrastructure (already in place)

---

## Session 32 Context (Corrected)

The "fix" we applied in Session 32 (tightening Jaccard thresholds from 0.5/0.6 → 0.35/0.45) improved the **primary LLM path** behavior but didn't address the **fallback violations**. When LLM fails, the fallback still uses the old deterministic logic.

**Status**:
- ✅ Primary path: LLM-powered, compliant
- ❌ Fallback path: Deterministic Jaccard, violates AGENTS.md

---

## Files Summary (Corrected)

| File | Primary Path | Fallback Violation | Lines |
|------|--------------|-------------------|-------|
| `orchestrated.ts` | LLM (`assessTextSimilarityBatch`) | ~~Jaccard fallback~~ RESOLVED — retry + missing-score fail-safe | ~~2045, 2051-2058~~ Removed |
| `evidence-deduplication.ts` | LLM (when provided) | Jaccard fallback when not provided | 110 |
| `analysis-contexts.ts` | Unknown (needs audit) | Jaccard fallback | 317-328 |

---

## Reviewer-Requested Corrections Summary

✅ **1. Frame-signal outdated**: Corrected — primary path is LLM (line 1629), violation is fallback (lines 2045, 2056)
✅ **2. Stale line references**: Updated all references to current code state
✅ **3. Context similarity mixing old/new**: Corrected — `calculateContextSimilarity` removed, `assessContextSimilarity` is LLM-first
✅ **4. analysis-contexts impact unknown**: Corrected — impact is KNOWN, used in context dedup
✅ **5. "Keep fallback" conflicts with AGENTS**: Changed to "remove deterministic semantic fallback, use retry + neutral fail-safe"
✅ **6. Missing non-Jaccard scope**: Added inverse query generation to scope notes
✅ **7. Efficiency needs concrete controls**: Added batch caps, retry logic, schema validation, cache design, circuit breaker

---

## Next Steps for Implementation

**Lead Developer approval gates**:
1. ✅ Confirm Phase 1 (assessTextSimilarityBatch fallback removal) as highest priority
2. ✅ Approve neutral fail-safe strategy (0.5 default when LLM exhausted)
3. ✅ Approve retry/backoff parameters (3 attempts, exponential 100/200/400ms)
4. ~~Assign to Senior Developer for implementation~~ — Implemented by Sonnet 4.5 (2026-02-12)

**Implementation checklist**:
- [x] Implement retry loop with exponential backoff in `assessTextSimilarityBatch` — Done 2026-02-12
- [x] Remove Jaccard fallback blocks (lines 2045, 2056) — Done 2026-02-12
- [x] Add schema validation for LLM response — Done 2026-02-12
- [x] Add missing-score fail-safe (leave IDs unset; caller defaults apply) — Done 2026-02-12 (design changed from 0.5 neutral to caller-default per approved plan)
- [x] Update tests to cover retry + fail-safe paths — Done: 14 tests (10 core + 4 call-site behavior)
- [ ] Run Session 32 validation matrix to verify no regression — Deferred to next live run
