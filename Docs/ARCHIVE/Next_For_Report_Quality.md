### 1. Validate B-sequence features with real runs (highest impact)

All 5 B-sequence improvements are implemented but **none have been tested with real data** . The single highest-impact action is to run 2-3 analyses with the new UCM features enabled:

* `queryStrategyMode` = `pro_con`
* `claimAnnotationMode` = `verifiability_and_misleadingness`
* `explanationQualityMode` = `rubric`

This would reveal whether pro/con queries actually improve evidence diversity, whether verifiability/misleadingness annotations add value, and whether the rubric scores flag real quality issues. Cost: ~$3-5 for 2-3 runs. This is **the missing feedback loop** — everything else was built blind.

### 2. A-3 cross-provider gate re-run (unblocks D2 B-sequence)

Blocked on Anthropic credits. The code fixes (A-2a/b/c) are done. Two successful 10/10 cross-provider runs would:

* Unblock B-1 (runtime role tracing), B-3 (knowledge-diversity-lite), B-2 (A/B conclusion)
* Give decision-grade data on whether cross-provider improves or hurts quality

This is the critical path for the Debate Continuation Plan. Nothing in that plan can progress without it.

### 3. Claim Fidelity Phase 3+4 (direct quality fix, partially free)

Phase 3 (evidence payload compression) is **already applied but not committed** . Phase 4 is validation with real LLM calls (~$2-3). Claim fidelity is a P0 quality issue — Stage 1 over-anchoring to evidence causes claim drift that propagates through all downstream stages. Finishing this would directly improve report accuracy.

### 4. Fix the 10 search test failures (~1h, free)

Known issue #3 in Current_Status — `search-cache.test.ts` and `search-brave.test.ts`. Known root causes, known fixes (`dbPromise = null`, duck-typing). Quick win that cleans up the test suite from 1001 to 1011 passing.

### 5. Metrics integration (15-30 min, free)

The metrics infrastructure is **built but not connected** to `analyzer.ts`. Wiring it in would give observability into LLM call counts, latency, and cost per analysis — essential for understanding where quality effort should focus next.

---

### What I'd recommend as the sequence:

**If Anthropic credits are available:** 1 → 3 → 2 (validate B-sequence → finish fidelity → unblock D2)

The Quality Opportunity Map's 7 dimensions shows Q3 (verdict accuracy) and Q5 (explanation quality) as the biggest unmeasured gaps. Item 1 directly addresses both — you'd see real rubric scores and real verdict outputs to evaluate.
