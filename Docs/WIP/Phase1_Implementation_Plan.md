# Phase 1: Remove Jaccard Fallback from assessTextSimilarityBatch

**Date**: 2026-02-12
**Implementer**: Sonnet 4.5
**Estimated effort**: 2-3 hours

---

## Design Decisions

### 1. Fail-Safe Strategy: **Missing Score + Caller Defaults**

When all retries are exhausted for a chunk, do **not** inject synthetic similarity values.
Leave failed pair IDs unset in the returned map and let each call site apply its existing local default (`?? 1`, `?? 0`, `|| 0`, etc.).

**Impact analysis per call site**:

| Call Site | Threshold/Default | Behavior with missing score | Conservative? |
|-----------|-----------|-------------------|---------------|
| Frame signal (`orchestrated.ts`) | Similarity fallback is `?? 1` | Missing score resolves to high similarity → no forced split | ✅ YES (avoids false splits) |
| Evidence dedup (`evidence-deduplication.ts`) | Similarity fallback is `?? 0` | Missing score resolves to low similarity → not duplicate | ✅ YES (avoids false dedup) |
| Claim/evidence relevance paths | Often `?? 0` / `|| 0` then `> threshold` | Missing score resolves to non-match | ✅ YES (avoids false positives) |
| Thesis relevance upgrade (`similarity >= 0.5`) | `|| 0` fallback | Missing score does not upgrade tangential to direct | ✅ YES (conservative) |

**Conclusion**: Missing-score fail-safe is safer than injecting `0.5` because call sites already encode conservative local defaults.

---

### 2. Retry Parameters

- **Max retries**: 3 attempts
- **Exponential backoff**: 100ms, 200ms, 400ms
- **Jitter**: ±25ms randomized jitter per backoff interval
- **Batch size**: 25 pairs (existing, unchanged)
- **Timeout**: Add per-attempt timeout guard (e.g., 8-10s) to avoid hanging chunk retries

---

### 3. Schema Validation

**Valid response**:
```json
[0.85, 0.12, 0.67, ...]
```

**Validation rules**:
1. Parse as JSON array
2. Array length === chunk length
3. Each element is number 0-1 (clamp if numeric)
4. Non-numeric element => treat as missing score for that pair ID (do not inject synthetic value)

**On schema failure**:
- Retry (if attempts remain)
- Leave chunk pair IDs unset (if all retries exhausted)

---

### 4. Circuit Breaker (Future Enhancement)

Not implementing in Phase 1 — would require state tracking across analyses. Add in Phase 2 if needed.

---

## Implementation

### File: `apps/web/src/lib/analyzer/orchestrated.ts`

**Lines to modify**: 1999-2059

**Current code**:
```typescript
async function assessTextSimilarityBatch(
  pairs: Array<{ id: string; textA: string; textB: string }>,
): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map();

  const modelInfo = getModelForTask("extract_evidence");
  try {
    const chunkSize = 25;
    const resultMap = new Map<string, number>();

    for (let offset = 0; offset < pairs.length; offset += chunkSize) {
      const chunk = pairs.slice(offset, offset + chunkSize);
      // ... LLM call ...

      if (Array.isArray(scores) && scores.length === chunk.length) {
        // Valid response
        for (let i = 0; i < chunk.length; i++) {
          const score = typeof scores[i] === "number" ? Math.max(0, Math.min(1, scores[i])) : 0;
          resultMap.set(chunk[i].id, score);
        }
      } else {
        // VIOLATION: Jaccard fallback
        for (const pair of chunk) {
          resultMap.set(pair.id, jaccardSimilarity(pair.textA, pair.textB));
        }
      }
    }
    return resultMap;
  } catch {
    // VIOLATION: Jaccard fallback for all pairs
  }

  const map = new Map<string, number>();
  for (const pair of pairs) {
    map.set(pair.id, jaccardSimilarity(pair.textA, pair.textB));
  }
  return map;
}
```

**New code**:
```typescript
async function assessTextSimilarityBatch(
  pairs: Array<{ id: string; textA: string; textB: string }>,
  maxRetries: number = 3,
): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map();

  const modelInfo = getModelForTask("extract_evidence");
  const chunkSize = 25;
  const resultMap = new Map<string, number>();

  // Helper: exponential backoff sleep
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let offset = 0; offset < pairs.length; offset += chunkSize) {
    const chunk = pairs.slice(offset, offset + chunkSize);
    let chunkSuccess = false;

    // Retry loop for this chunk
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const pairTexts = chunk
          .map((p, i) => `[${i}] A: "${p.textA.slice(0, 200)}" | B: "${p.textB.slice(0, 200)}"`)
          .join("\n");

        const result = await generateText({
          model: modelInfo.model,
          messages: [{
            role: "user",
            content: `Rate the semantic similarity of each text pair below on a scale from 0.0 (completely different topics/meanings) to 1.0 (same topic and meaning, possibly paraphrased).

Consider meaning and topic, not just word overlap. Two texts about the same topic using different words should score high. Two texts with shared common words but different topics should score low.

Pairs:
${pairTexts}

Return ONLY a JSON array of numbers (0.0 to 1.0), one per pair. No explanation.
Example: [0.85, 0.12, 0.67]`,
          }],
          temperature: 0,
        });

        let text = result.text.trim();
        text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
        const scores = JSON.parse(text);

        // Schema validation
        if (Array.isArray(scores) && scores.length === chunk.length) {
          // Valid response
          for (let i = 0; i < chunk.length; i++) {
            if (typeof scores[i] === "number") {
              const score = Math.max(0, Math.min(1, scores[i]));
              resultMap.set(chunk[i].id, score);
            } else {
              // Non-numeric element: leave this pair unset; caller default applies
              console.warn(`[assessTextSimilarityBatch] Non-numeric score at index ${i}; leaving unset`);
            }
          }
          chunkSuccess = true;
          break; // Success — exit retry loop for this chunk
        } else {
          // Invalid schema
          console.warn(`[assessTextSimilarityBatch] Invalid schema (attempt ${attempt}/${maxRetries}): expected array[${chunk.length}], got ${typeof scores}`);
          if (attempt < maxRetries) {
            await sleep(100 * Math.pow(2, attempt - 1)); // 100ms, 200ms, 400ms
            continue; // Retry
          }
        }
      } catch (err) {
        // LLM call failed
        console.warn(`[assessTextSimilarityBatch] LLM error (attempt ${attempt}/${maxRetries}):`, err);
        if (attempt < maxRetries) {
          await sleep(100 * Math.pow(2, attempt - 1)); // 100ms, 200ms, 400ms
          continue; // Retry
        }
      }
    }

    // All retries exhausted for this chunk — leave chunk pair IDs unset
    if (!chunkSuccess) {
      console.error(`[assessTextSimilarityBatch] All retries exhausted for chunk (offset ${offset}). Leaving scores unset; caller defaults will apply.`);
    }
  }

  return resultMap;
}
```

**Key changes**:
1. ❌ **Removed**: All `jaccardSimilarity` calls (lines 2045, 2056)
2. ✅ **Added**: Retry loop with exponential backoff
3. ✅ **Added**: Schema validation with detailed logging
4. ✅ **Added**: Missing-score fail-safe (no synthetic similarity injection)
5. ✅ **Added**: `maxRetries` parameter (default 3, configurable for tests)

---

## Test Cases

### File: `apps/web/test/unit/lib/analyzer/assess-text-similarity-batch.test.ts` (NEW)

**Coverage**:
1. **Happy path**: LLM returns valid array, scores extracted correctly
2. **Invalid schema — retry succeeds**: First attempt returns wrong length, second succeeds
3. **Invalid schema — all retries fail**: Returns map with failed chunk IDs unset
4. **LLM exception — retry succeeds**: First attempt throws, second succeeds
5. **LLM exception — all retries fail**: Returns map with failed chunk IDs unset
6. **Partial batch failure**: 2 chunks, first succeeds, second fails → first has scores, second remains unset
7. **Empty input**: Returns empty map
8. **Non-number in array**: Pair ID left unset (others in chunk still processed)
9. **Out-of-range numbers**: Clamps to 0-1

---

## Verification Steps

1. ✅ **TypeScript compilation**: `npx tsc --noEmit`
2. ✅ **New test file**: `npx vitest run test/unit/lib/analyzer/assess-text-similarity-batch.test.ts`
3. ✅ **Full test suite**: `npx vitest run` (all 850+ tests pass)
4. ✅ **Frame signal spot-check**: Run 1 orchestrated analysis, verify frame signal uses LLM (check logs for "assessTextSimilarityBatch")
5. ⚠️ **Session 32 validation matrix** (optional, expensive): Re-run 5×5 matrix to verify no regression in context hit rate or score variance

---

## Implementation Checklist

- [x] Update `assessTextSimilarityBatch` in orchestrated.ts (lines 1999-2059) — Done 2026-02-12
- [x] Add `sleep` helper (`_similaritySleep` at module scope) — Done 2026-02-12
- [x] Remove `jaccardSimilarity` import if no longer used elsewhere in orchestrated.ts — KEPT: still used by 5 other call sites (assessContextSimilarity, dedupeWeightedAverageTruth, telemetry)
- [x] Create test file `assess-text-similarity-batch.test.ts` — Done 2026-02-12
- [x] Write all 9 test cases — Done: 10 core tests (9 planned + maxRetries=1)
- [x] Add callsite-behavior tests for missing-score fail-safe at sensitive thresholds (`>=0.5` and `>0.4`) — Done: 4 call-site tests
- [x] Run TypeScript check — Clean (`npx tsc --noEmit`)
- [x] Run new tests — 14/14 passing
- [x] Run full test suite — 869/872 pass (3 pre-existing integration failures)
- [ ] Spot-check frame signal behavior (manual verification) — Deferred to next live run
- [x] Update v2 violations report status — Done 2026-02-12

---

## Approval Gates

**Lead Developer sign-off required before implementation**:
1. ✅ Approve missing-score fail-safe semantics (no injected 0.5)
2. ✅ Approve retry parameters (3 attempts, 100/200/400ms backoff + jitter + per-attempt timeout guard)
3. ✅ Approve schema validation approach
4. ✅ Approve test coverage

**Ready to implement**: IMPLEMENTED (2026-02-12)

---

## AGENTS Compliance Gate (Mandatory)

Phase 1 addresses only one violation surface (`assessTextSimilarityBatch` fallback behavior).
Per `AGENTS.md` LLM Intelligence Migration directive, **full compliance is NOT achieved after Phase 1 alone**.

### Compliance Status after Phase 1

- `Phase 1 complete` != `AGENTS compliant`
- Mark overall migration status as: `PARTIAL (non-compliant until remaining semantic deterministic paths are removed)`

### Remaining Deterministic Semantic Decision Paths (Must Replace)

| File | Function / Area | Why non-compliant | Priority |
|------|------------------|-------------------|----------|
| `apps/web/src/lib/analyzer/orchestrated.ts` | `generateInverseClaimQuery` | Regex/rule-based semantic inversion affecting research routing | P0 |
| `apps/web/src/lib/analyzer/orchestrated.ts` | `assessContextSimilarity` fallback | Weighted Jaccard semantic decision fallback | P0 |
| `apps/web/src/lib/analyzer/evidence-deduplication.ts` | `isDuplicate` fallback + `jaccardSimilarity` | Duplicate semantic decision in fallback path | P0 |
| `apps/web/src/lib/analyzer/analysis-contexts.ts` | `assessContextNameSimilarityBatch` fallback | Jaccard-based context dedup decision fallback | P0 |
| `apps/web/src/lib/analyzer/orchestrated.ts` | `dedupeWeightedAverageTruth` clustering Jaccard | Semantic duplicate grouping affects verdict weighting | P1 |
| `apps/web/src/lib/analyzer/orchestrated.ts` | regex fallback for inversion/counter-claim | Deterministic semantic interpretation in verdict path | P1 |
| `apps/web/src/lib/analyzer/orchestrated.ts` | heuristic supplemental claim construction paths | Deterministic semantic decomposition in understand path | P1 |

### Gate Criteria (Pass/Fail)

To declare AGENTS compliance, all must pass:

- [ ] No active deterministic semantic decision path in analysis flow (understand/research/verdict)
- [ ] No regex/keyword/heuristic fallback used to interpret text meaning
- [ ] LLM-first + efficient controls in place (batching, cache, tiering, token bounds)
- [ ] All replacements verified by tests and targeted regression scenarios
- [ ] Documentation updated to reflect final compliant architecture

If any item is unchecked: overall status is **FAIL (non-compliant)**.
