# Consolidated Report Quality Execution Plan

**Status:** 🔧 PARTIALLY EXECUTED — AGENTS.md enforcement done; validation & migration pending
**Created:** 2026-02-11 | **Updated:** 2026-02-13 (trimmed)
**Scope:** All incomplete work affecting report quality, consolidated from 6 source documents

---

## Completed Work (Summary)

- **AGENTS.md Enforcement** (2026-02-11, corrected 2026-02-12): 8 changes across `analysis-contexts.ts`, `orchestrated-understand.ts`, `orchestrated.prompt.md`, `orchestrated-compact.prompt.md`, `types.ts`, `config.ts`, `orchestrated.ts`. All regex/hardcoded patterns removed. 3 newly-created violations reverted (`normalization-heuristics.ts`, `grounding-check.ts`, `analysis-contexts.ts`).
- **LLM Prompt Improvements Phase A**: 5/6 done (A1-A4, A6). A5 deferred (requires prompt wording approval).
- **Grounding Check (B1)**: Done — LLM-powered `adjudicateGroundingBatch` with degraded fallback.
- **`inferContextTypeLabel` (T3.1)**: Done — LLM-provided `typeLabel` with fallback to `p.type`.
- **Normalization Issues**: Closed — LLM-first normalization is the approach; `splitByConfigurableHeuristics` is dead code.
- Tests: 540/540 pass. Build: clean.

---

## Remaining Execution Tiers

### Tier 1 — Validate & Stabilize

| ID | Item | Effort | Status |
|----|------|--------|--------|
| T1.1 | Re-run 25-run validation matrix (post Session 30 hybrid + typeLabel) | ~2h | NOT DONE |
| T1.2 | Context hit rate triage (if T1.1 shows <80%) | 2-4h | Blocked by T1.1 |

### Tier 2 — Zero/Low-Cost Improvements

| ID | Item | Status |
|----|------|--------|
| T2.1 | A5: allowModelKnowledge wording consolidation | Deferred (needs approval) |

### Tier 3 — Structural Improvements

| ID | Item | Effort | Status |
|----|------|--------|--------|
| T3.2 | Grounding ratio → confidence adjustment (5th calibration layer) | 2-3h | NOT DONE |
| T3.3 | LLM Migration service foundation (Phase 1) — required for T4.x | 6-8h | NOT DONE |
| T3.4 | 50-run validation suite | 3-4h | NOT DONE |

### Tier 4 — Deferred (Require T3.3)

| ID | Item |
|----|------|
| T4.1 | Replace `calculateTextSimilarity`, `extractCoreEntities`, `isRecencySensitive` (Migration P1s) |
| T4.3 | Edge case test coverage (15+ tests) |
| T4.4 | LLM Text Analysis A/B Testing (promptfoo) |
| T4.5 | Central-claim evidence coverage pass |
| T4.6 | Parallel verdict generation |
| T4.7 | Evidence-driven context refinement guardrails |
| T4.10 | CalcConfig Admin UI verification |
| T4.11 | Replace evidence-filter.ts pattern functions |
| T4.12 | Replace verdict-corrections.ts heuristics |
| T4.13 | Replace orchestrated.ts search relevance heuristics |

---

## Dependency Graph

```
T1.1 (Validate) ──→ T1.2 (if needed) ──→ T3.4 (50-run suite)
      │
      ├──→ T2.1 (A5 prompt edit — needs approval)
      └──→ T3.2 (Grounding ratio calibration)

T3.3 (Migration service) ──→ T4.1, T4.11, T4.12, T4.13
T4.4 (A/B testing) ← depends on T1.1 (stable baseline)
```

**Total estimated effort for remaining Tiers 1-3:** ~15-22h

---

## Closure Criteria

1. All 4 closure gates pass (score variance, confidence delta, context hit rate, pipeline failure) on 50-run validation suite
2. Phase A prompt improvements (A1-A6) implemented — **5/6 DONE**
3. `inferContextTypeLabel` replaced — **DONE**
4. Grounding check validates verdict-evidence alignment — **DONE** (ratio-to-confidence pending)
5. Enhancement Plan can be marked complete
