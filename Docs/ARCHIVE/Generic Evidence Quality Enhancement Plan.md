# Generic Evidence Quality Enhancement Plan

**Status:** 🔧 IN PROGRESS — Phase 1 COMPLETE, Phase 2 stabilizing, Phase 3 partial. Closure gates NOT MET.
**Created:** 2026-02-05 | **Updated:** 2026-02-13 (trimmed)
**Priority:** HIGH (context-target and variance gates still failing)

---

## Issues Addressed

1. ✅ **Opinion vs evidence confusion** — RESOLVED (Phase 1: deterministic filtering, 91% → 0% opinion contamination)
2. ⏳ **LLMs don't know the present** — Phase 3 PARTIAL (verdict prompt refined; full validation pending)
3. ⏳ **Report stability/context recall** — ACTIVE (fixes applied, validation pending)
4. ✅ **Verdict accuracy suppression** (39% vs expected ~73%) — FIXED (3 root causes: anchoring, contested weights, prompt bias)

---

## Completed Work (Sessions 1-15)

### Code Fixes (7 root causes + 8 config additions)

| Fix | Root Cause | Status |
|-----|-----------|--------|
| 1 | Frame signal gate missing institution/court | ✅ |
| 2 | Aggressive dedup override ignoring institutional distinctness | ✅ |
| 3 | Criticism queries using `.find()` (single context only) | ✅ |
| 4 | Auto LLM relevance gated on empty results | ✅ |
| 5 | No context-claims anchoring (framing bias) | ✅ |
| 6 | Contested factor over-weighting (double-penalty) | ✅ |
| 7 | Verdict prompt bias against procedural claims | ✅ |

### Solutions Implemented

| # | Solution | Phase | Status |
|---|----------|-------|--------|
| 1 | Contextual relevance pre-filter (heuristic + LLM `auto` mode) | Phase 2 | ✅ |
| 2 | Enhanced opinion vs evidence distinction (decision tree in extract prompt) | Phase 1 | ✅ |
| 3 | Probative value validation (deterministic `filterByProbativeValue()` always runs) | Phase 1 | ✅ |
| 4 | LLM knowledge gap handling (knowledge cutoff awareness + recency validation) | Phase 3 | ✅ Code, ⏳ Validation |
| 5 | Context-aware criticism search (`buildContextAwareCriticismQueries()`) | Phase 2 | ✅ |

### Stability Fixes (Sessions 11-15)

- Near-duplicate override guard (threshold 0.75→0.85 + subject distinctness)
- Strengthened frame signal check (text-based distinctness path)
- Graduated 3-step adaptive fallback (was binary)
- Fallback evidence cap (40% of total per context)
- Confidence floor (minimum 10, eliminates confidence=0 outliers)
- Name distinctness guard for near-duplicate override
- Low-source penalty (≤2 sources → -15 confidence)
- Source-count alignment (penalty now matches displayed source metric)
- LLM `requiresSeparateAnalysis` trusted as frame signal
- Configurable anchor recovery threshold (0.8→0.6)

### UCM/CalcConfig

- **PipelineConfig**: 8 new tunables (anchoring, dedup, fallback, search resilience, confidence floor, low-source)
- **CalcConfig**: 6 new sections, 68 total fields across 13 sections — all wired to runtime code
- All defaults match original behavior except intentional threshold changes

---

## Latest Validation (Session 14 — 25-run orchestrated matrix)

| Claim family | Score variance | Target | Pass | Confidence delta | Target | Pass | Context hit rate | Pass |
|---|---:|---:|:---:|---:|---:|:---:|---:|:---:|
| Legal procedural fairness | 5 | ≤15 | ✅ | 0 | ≤15 | ✅ | 0% (expected 2) | ❌ |
| Scientific efficacy/safety | 9 | ≤10 | ✅ | 8 | ≤15 | ✅ | 0% (expected 1) | ❌ |
| Institutional trust claim | 50 | ≤15 | ❌ | 11 | ≤15 | ✅ | 80% (expected 1) | ✅ |
| Corporate compliance claim | 7 | ≤15 | ✅ | 10 | ≤15 | ✅ | 80% (expected 1-2) | ✅ |
| Technology comparison claim | 25 | ≤10 | ❌ | 69 | ≤15 | ❌ | 0% (expected 1) | ❌ |

Pipeline reliability: 25/25 SUCCEEDED. Confidence=0 outliers: 0/25 (was 5/25 in Session 12).

---

## Still Open / Remaining Work

1. **Context-target stability** — Bolsonaro under-detection (1 context, expected 2) and scientific/technology over-splitting
2. **High variance** — Government-trust (50pts) and technology-comparison (25pts) families exceed targets
3. **Source-count/warning alignment** — Low-source warning semantics inconsistent with displayed source metrics on some runs
4. **CalcConfig Admin UI verification** — Confirm all 6 new sections appear in Admin UI and changes take effect
5. **50-run validation suite** — 5 claims × 5 runs × 2 pipelines against closure criteria (blocking plan closure)
6. **Phase 3 integration testing** — Time-sensitive claims with knowledge cutoff awareness

---

## Closure Criteria

| Metric | Target | Latest |
|--------|--------|--------|
| Per-claim score variance (5 runs) | ≤15 pts legal, ≤10 pts factual | 3/5 passing |
| Per-claim confidence delta (5 runs) | ≤15 pp | 4/5 passing |
| Multi-context detection | ≥80% where applicable | 2/5 passing |
| Pipeline failure rate | <1% | ✅ 0/25 |
| Opinion contamination rate | 0% | ✅ 0% |

**Plan complete when** all 4 gates pass on 50-run validation suite.

---

## Success Metrics

| Metric | Baseline | Target | Current | Status |
|--------|----------|--------|---------|--------|
| Opinion evidence with high/medium probativeValue | 91% | 0% | 0% | ✅ |
| Opinion evidence after filtering | Present | 0% | 0 | ✅ |
| Irrelevant search results fetched | ~40% | <10% | Improving | ⏳ |
| Time-sensitive claims flagged | 0% | 100% | Prompt refined | ⏳ |
| Evidence contamination rate | Present | 0% | 0% | ✅ |

---

## Key Files Modified

`orchestrated.ts`, `aggregation.ts`, `quality-gates.ts`, `truth-scale.ts`, `source-reliability.ts`, `verdict-corrections.ts`, `evidence-filter.ts`, `verdict-base.ts`, `extract-evidence-base.ts`, `llm.ts`, `model-tiering.ts`, `config-schemas.ts`, `pipeline.default.json`, `aggregation.test.ts`, `v2.8-verification.test.ts`

**Verification Report:** [Evidence_Quality_Verification_Report.md](../ARCHIVE/WIP/Evidence_Quality_Verification_Report.md)

---

## Related Documents

- [Consolidated_Report_Quality_Execution_Plan.md](Consolidated_Report_Quality_Execution_Plan.md) — Execution tracker for this + other quality work
- [Efficient_LLM_Intelligence_Migration_Plan.md](Efficient_LLM_Intelligence_Migration_Plan.md) — 19 deterministic violations to migrate
- [Pipeline_Phase2_Plan.md](Pipeline_Phase2_Plan.md) — Context-parallel research, adaptive budgets
