# Consolidated Report Quality Execution Plan

**Status:** Partially Executed — AGENTS.md enforcement done + corrected (2026-02-12)
**Created:** 2026-02-11
**Updated:** 2026-02-12
**Scope:** All incomplete work affecting report quality, consolidated from 6 source documents
**Priority logic:** AGENTS.md compliance first, then quality fixes, then validate

---

## Sources Consolidated

| Document | Key Takeaway |
|----------|-------------|
| `Reporting_Improvement_Exchange.md` | 30 sessions, 45+ fixes. Session 28 clean baseline: 0/5 claims pass all 3 gates. Session 30 fixed context detection (hybrid mode). **Re-validation not yet run.** |
| `Generic Evidence Quality Enhancement Plan.md` | 7 code fixes + CalcConfig wiring done. Closure gates still failing (context hit rate primary blocker). |
| `Efficient_LLM_Intelligence_Migration_Plan.md` | Approved with adjustments. 19 pre-existing violations inventoried. New violating code reverted. `inferContextTypeLabel` P0 is DONE. |
| `Normalization_Issues_and_Plan.md` | Superseded — normalization is now LLM-first (no heuristic transforms in pipeline). `splitByConfigurableHeuristics` is dead code. |
| `LLM_Prompt_Improvement_Plan.md` | Phase A: 4/6 done (A1, A2, A3, A6); A4 already in inline prompts; A5 deferred (prompt wording change). Phase B: B1 done (grounding check). |
| `Backlog.md` | Relevant items: A/B testing, edge case tests, context refinement guardrails, central-claim coverage, parallel verdicts. |

---

## Current Baseline (Session 28 Clean Validation)

| Gate | Target | Result | Status |
|------|--------|--------|--------|
| Score variance | ≤15pts legal, ≤10pts factual | 3/5 passing | Partial |
| Confidence delta | ≤15pp | 4/5 passing | Near |
| Context hit rate | ≥80% | 0/5 passing | **Primary blocker** |
| Pipeline failure | <1% | Passing | OK |

Session 30 applied hybrid context detection + prompt conflict fix. **Impact unknown until re-validation.**

---

## AGENTS.md Enforcement — Executed 2026-02-11, Corrected 2026-02-12

**Priority override:** User directed AGENTS.md compliance first, then quality fixes, then validate.

### Changes Made (GOOD — kept)

| Phase | What | Files | Status |
|-------|------|-------|--------|
| 1 | Deduplicated `canonicalizeContexts`/`canonicalizeContextsWithRemap` | `analysis-contexts.ts` | DONE ✅ |
| 2 | Added `typeLabel` to LLM output schema (UNDERSTAND, SUPPLEMENTAL_CONTEXTS, context detection) | `orchestrated-understand.ts`, `orchestrated.prompt.md`, `orchestrated-compact.prompt.md`, `types.ts`, `analysis-contexts.ts` | DONE ✅ |
| 2 | Rewrote `inferContextTypeLabel` — removed ALL regex (incl. Brazil-specific "tse"/"stf") | `config.ts` | DONE ✅ |
| 2 | Replaced generic name detection regex with typeLabel-based check | `analysis-contexts.ts` | DONE ✅ |
| 2 | Removed 2/3 redundant `extractCoreEntities` calls | `analysis-contexts.ts` | DONE ✅ |
| 3 | Removed hardcoded status anchor keywords ("sentenced", "convicted", etc.) | `analysis-contexts.ts` | DONE ✅ |
| 3 | Replaced outcome keyword pre-filter with generic numeric pattern check | `orchestrated.ts` | DONE ✅ |
| 5 | Added MIGRATION annotations to 5 pre-existing `calculateTextSimilarity` call sites | `orchestrated.ts` | DONE ✅ |

### Corrections Applied (2026-02-12 — violating new code REVERTED)

Earlier sessions had created NEW deterministic text-analysis code that violated AGENTS.md "MUST NOT be created." This was initially given `// MIGRATION` annotations, but the user correctly insisted the code be removed entirely.

| File | What was REVERTED | Why |
|------|-------------------|-----|
| `normalization-heuristics.ts` | `MODIFIER_CONTEXT_WORDS` (30 words), `isValidSplitPoint()`, loop+guard logic | New deterministic NLP — violates "MUST NOT be created" |
| `grounding-check.ts` | `STEM_SUFFIXES` (17 suffixes), `stemTerm()`, 10 added analytical stopwords, stemming in `extractKeyTerms`, stemmed matching in `checkVerdictGrounding` | New deterministic NLP — suffix-stripping stemmer |
| `analysis-contexts.ts` | `ENTITY_STOPWORDS` set in `extractCoreEntities` | New hardcoded English auxiliary verb filter |

### Already Done (discovered during investigation)

| Item | Evidence |
|------|---------|
| A1: Negative prompting in verdict | `verdict-base.ts:170-174` |
| A2: Anti-fabrication in EXTRACT | `extract-evidence-base.ts:21-26` |
| A3: allowModelKnowledge in UNDERSTAND | `orchestrated-understand.ts:14-50` |
| A4: Confidence bands in inline prompts | `orchestrated.ts:8739-8743, 9938-9942` |
| A6: FINAL VALIDATION checklist | `verdict-base.ts:251-254` |
| B1: Grounding check | `grounding-check.ts` integrated at `orchestrated.ts:13461` |
| Hybrid context detection | `pipeline.default.json: "hybrid"` |
| CalcConfig wiring | 13 sections, 68 fields |

### Deferred

| Item | Why |
|------|-----|
| A5: allowModelKnowledge wording consolidation | Prompt wording change requires human approval per AGENTS.md Analysis Prompt Rules |
| `calculateTextSimilarity` replacement (14+ sites) | Requires LLM migration service foundation (T3.3) |
| `extractKeyTerms` / STOP_WORDS replacement | Pre-existing code flagged for migration; current version is simpler after revert |
| `isHighImpactOutcome` keyword replacement | Safety filter for low-trackRecord sources, needs careful LLM replacement |
| evidence-filter.ts pattern functions | Pre-existing, need LLM migration service |
| verdict-corrections.ts heuristics | Pre-existing, need LLM migration service |

### Verification

- Tests: 540/540 pass (25 test files)
- Build: clean ✅
- Commit: PENDING

---

## Execution Tiers

### Tier 1 — Validate & Stabilize (Do First)

#### T1.1: Re-run 25-run validation matrix
- **Why:** Session 30 switched context detection from gutted heuristic to hybrid mode. AGENTS.md enforcement added typeLabel. Without re-validation, we don't know where we stand.
- **Effort:** ~2h (automated matrix, log analysis)
- **Risk:** None
- **Status:** NOT DONE

#### T1.2: Context hit rate triage (conditional)
- **When:** Only if T1.1 shows context hit rate still <80% after hybrid mode
- **Status:** NOT DONE (blocked by T1.1)

#### T1.3: Commit uncommitted changes
- **Why:** Working tree contains AGENTS.md enforcement changes + normalization simplification + revert of violating code. All tested (540 tests pass, build clean). Work at risk of loss.
- **Effort:** 15 min (review diff, commit)
- **Status:** NOT DONE — awaiting user request to commit

---

### Tier 2 — Zero/Low-Cost Quality Improvements

#### T2.1: LLM prompt improvements — Phase A (zero-cost edits)
- **Status:** 4/6 DONE (A1, A2, A3, A6). A4 already present. A5 deferred (requires approval).
- **Remaining:** Only A5 (allowModelKnowledge wording consolidation)

#### T2.2: ~~Normalization Issue 4 fix (adjective suffix guard)~~
- **Status:** NO LONGER APPLICABLE
- **Why:** The normalization heuristic guards (`isValidSplitPoint`, `MODIFIER_CONTEXT_WORDS`) were themselves AGENTS.md violations and have been reverted. Furthermore, `splitByConfigurableHeuristics` is dead code — not called from anywhere. The pipeline now uses LLM-first normalization (raw input → LLM). This item can be closed.

#### T2.3: Post-verdict grounding check (Phase B1)
- **Status:** DONE — `grounding-check.ts` is implemented and integrated at `orchestrated.ts:13461`
- **Note:** After revert, grounding check uses simple substring matching (no stemming). This is less sophisticated but rule-compliant. Future improvement should use LLM-based term extraction.

---

### Tier 3 — Structural Improvements (Medium Effort, High Long-Term Impact)

#### T3.1: ~~Replace `inferContextTypeLabel` (P0 AGENTS.md violation)~~
- **Status:** DONE ✅ (Phase 2 of AGENTS.md enforcement)
- **What was done:** Removed ALL regex patterns (including Brazil-specific "tse"/"stf"). Now reads LLM-provided `typeLabel` field with fallback to `p.type`.

#### T3.2: Grounding ratio → confidence adjustment (Phase B2)
- **Status:** NOT DONE
- **Still relevant:** Adding grounding_ratio as 5th confidence calibration layer

#### T3.3: LLM Migration service foundation (Phase 1)
- **Status:** NOT DONE
- **Still relevant:** Required to replace the 19 pre-existing deterministic text-analysis violations
- **Scope expanded:** Now needs to cover evidence-filter.ts, verdict-corrections.ts, and orchestrated.ts similarity functions

#### T3.4: 50-run validation suite
- **Status:** NOT DONE
- **Still relevant**

---

### Tier 4 — Deferred Quality Items (Lower Priority or Contingent)

| ID | Item | Why Deferred | Status |
|----|------|-------------|--------|
| T4.1 | Replace `calculateTextSimilarity`, `extractCoreEntities`, `isRecencySensitive` (Migration P1s) | Requires T3.3 service foundation | NOT DONE |
| T4.2 | Replace `extractKeyTerms`/STOP_WORDS in grounding-check (Migration P2s) | Requires T3.3 + pre-existing code, not urgent | NOT DONE |
| T4.3 | Edge case test coverage (15+ tests) | Quality infrastructure, not direct quality fix | NOT DONE |
| T4.4 | LLM Text Analysis A/B Testing (promptfoo) | Requires stable baseline first (T1.1) | NOT DONE |
| T4.5 | Central-claim evidence coverage pass | Medium effort, bounded benefit per claim | NOT DONE |
| T4.6 | Parallel verdict generation | Performance only, not quality | NOT DONE |
| T4.7 | Evidence-driven context refinement guardrails | Instrumentation + guardrails, lower immediate impact | NOT DONE |
| T4.8 | ~~Normalization Phase 4 (evaluate LLM-only normalization)~~ | **CLOSED** — LLM-only normalization is now the actual approach | DONE (by default) |
| T4.9 | ~~Normalization dedup (Issue 6)~~ | **CLOSED** — canonicalization deduped (Phase 1); `splitByConfigurableHeuristics` is dead code | DONE |
| T4.10 | CalcConfig Admin UI verification | UX verification, not quality impact | NOT DONE |
| T4.11 | Replace evidence-filter.ts pattern functions (`countVaguePhrases`, `hasAttribution`, etc.) | Requires T3.3 service foundation | NOT DONE — NEW |
| T4.12 | Replace verdict-corrections.ts heuristics (`extractComparativeFrame`, `detectCounterClaim`) | Requires T3.3 service foundation | NOT DONE — NEW |
| T4.13 | Replace orchestrated.ts search relevance heuristics (`tokenizeForMatch`, `checkSearchResultRelevance`) | Requires T3.3 service foundation | NOT DONE — NEW |

---

## Risk Register

| Risk | Impact | Mitigation | Tier |
|------|--------|-----------|------|
| **Context hit rate still fails after hybrid mode + typeLabel** | Blocks all closure gates | T1.2 deep-dive ready; can tune `contextDetectionMinConfidence`, seed format, frame signal thresholds | T1 |
| **typeLabel omitted by LLM** | Context type falls back to `p.type` or "General" | Fallback chain is solid; `typeLabel` is optional field | T3 |
| **Grounding check less accurate without stemming** | May miss inflected form matches (efficient/efficiency) | Acceptable short-term; LLM-based term extraction is the proper fix (T4.2) | T4 |
| **Pre-existing violations accumulate technical debt** | 19 functions still make deterministic semantic decisions | Tracked in Migration Plan; will be addressed via T3.3 service foundation | T3-T4 |
| **Migration service (T3.3) adds latency** | Slower analysis | Batching + caching design built-in; budget tier for simple decisions | T3 |
| **Enhancement Plan Fixes 1-7 break during migration** | Quality regression on solved problems | Regression test gate; test anchoring, multi-context, recency before each phase | T3 |

---

## Dependency Graph

```
T1.1 (Validate) ──→ T1.2 (if needed) ──→ T3.4 (50-run suite)
      │
      ├──→ T2.1 (A5 prompt edit — needs approval)
      └──→ T3.2 (Grounding ratio calibration)

T1.3 (Commit) ──→ T3.3 (Migration service) ──→ T4.1, T4.2, T4.11, T4.12, T4.13

T3.2 (Grounding ratio) ← depends on grounding check (DONE)
T4.4 (A/B testing) ← depends on T1.1 (stable baseline)
```

---

## Recommended Execution Sequence

| Order | Item | Est. Effort | Status |
|-------|------|-------------|--------|
| 1 | **T1.3** Commit all changes (enforcement + corrections) | 15min | READY — tests pass, build clean |
| 2 | **T1.1** Re-run validation matrix | 2h | NOT DONE |
| 3 | **T1.2** Context triage (if needed) | 2-4h | Blocked by T1.1 |
| 4 | **T3.2** Grounding ratio calibration | 2-3h | NOT DONE |
| 5 | **T3.4** 50-run validation suite | 3-4h | NOT DONE |
| 6 | **T3.3** Migration service foundation | 6-8h | NOT DONE |
| 7+ | **T4.x** Remaining migration items | 10-15h | NOT DONE |

**Total estimated effort for remaining Tiers 1-3:** ~15-22h

---

## Closure Criteria

This consolidated plan is complete when:

1. **All 4 closure gates pass** (score variance, confidence delta, context hit rate, pipeline failure) on the 50-run validation suite
2. **Phase A prompt improvements** (A1-A6) are implemented and build-verified — **5/6 DONE**
3. **`inferContextTypeLabel`** hardcoded patterns are replaced with LLM classification — **DONE ✅**
4. ~~Normalization Issue 4 is fixed~~ — **CLOSED** (normalization is LLM-first, heuristic is dead code)
5. **Grounding check** validates verdict-evidence alignment — **DONE ✅** (basic; ratio-to-confidence pending)
6. **All uncommitted quality changes** are committed — **PENDING**
7. **Enhancement Plan** can be marked complete (all remaining items resolved)
8. **Exchange document** closure criteria met (score variance + confidence + context hit + pipeline gates)

---

## Document Cross-References

| This Plan Item | Source Document | Section/Item |
|----------------|----------------|-------------|
| T1.1 | Exchange | Session 30 "Recommended Next Steps" #1 |
| T1.2 | Exchange | Session 29 "Context Detection Analysis" |
| T1.3 | Migration Plan | Review 2 checklist: "Uncommitted normalization changes committed" |
| T2.1 | LLM Prompt Improvement Plan | Phase A (A5 remaining) |
| T2.3 | LLM Prompt Improvement Plan | Phase B1 — DONE |
| T3.1 | Migration Plan | Phase 1 priority — DONE |
| T3.2 | LLM Prompt Improvement Plan | Phase B2 |
| T3.3 | Migration Plan | Phase 1: Service Foundation |
| T3.4 | Enhancement Plan | Review Checklist: "50-run validation suite" |
