# QLT-1 Predicate Strength Stabilization — Validation Report

**Date:** 2026-03-25
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)

---

## 1. Executive Summary

The QLT-1 prompt fix **materially reduced Plastik run-to-run instability** by eliminating predicate softening at Stage 1.

- **Plastik DE spread**: 47pp → **22pp** (53% reduction)
- **Claim count**: now stable at 3 across all 5 runs (previously 2–3)
- **Predicate preservation**: all claims now use "bringt nichts" — the "unwirksam" softening pattern is eliminated
- **Anchor controls**: all directionally correct, no regressions

---

## 2. Method

- Prompt fix: added "Predicate strength preservation (CRITICAL)" rule to PASS2 in `claimboundary.prompt.md`
- 12 validation jobs on a clean restarted stack:
  - 5× `Plastik recycling bringt nichts` (DE)
  - 3× `Plastic recycling is pointless` (EN)
  - 4 anchor controls (Erde rund, Hydrogen, Bolsonaro, Erde flach)
- Compared against pre-fix reference runs from the Plastik decomposition comparison

---

## 3. Plastik DE Results (5 runs)

| Run | Job ID | Truth% | Conf | Claims | Predicate |
|-----|--------|--------|------|--------|-----------|
| 1 | 8cbdeae8 | 43.4 | 67.7 | 3 | "bringt nichts" ✓ |
| 2 | f3fa135d | 46.0 | 66.7 | 3 | "bringt nichts" ✓ |
| 3 | 06e354cf | 29.8 | 65.1 | 3 | "bringt nichts" ✓ |
| 4 | e900d941 | 24.2 | 74.0 | 3 | "bringt nichts" ✓ |
| 5 | c47fff74 | 32.3 | 66.3 | 3 | "bringt nichts" ✓ |

**Spread: 22pp** (24.2–46.0). Median: 32.3.

### Comparison with pre-fix (5 runs from decomposition investigation)

| Metric | Pre-fix | Post-fix | Change |
|--------|---------|----------|--------|
| Truth% range | 17–64 (47pp) | 24–46 (22pp) | **-53% spread** |
| Claim count | 2–3 | 3–3 | **Stabilized** |
| Predicate softening | 1 of 5 runs ("unwirksam") | 0 of 5 | **Eliminated** |
| Outlier (>55%) | 64% | None | **Removed** |

---

## 4. Plastik EN Results (3 runs)

| Run | Job ID | Truth% | Conf | Predicate |
|-----|--------|--------|------|-----------|
| 1 | 8c7a1603 | 44.1 | 67.7 | "is pointless" ✓ |
| 2 | 895f26d4 | 60.2 | 70.0 | "is pointless" ✓ |
| 3 | ccce6ade | 46.4 | 72.5 | "is pointless" ✓ |

**Spread: 16pp** (44.1–60.2). All preserve "pointless". Run 2 is higher but not due to softening — the claim wording is correct. EN shows less instability than DE.

---

## 5. Anchor Controls

| Input | Job ID | Verdict | Truth% | Conf | Status |
|-------|--------|---------|--------|------|--------|
| Ist die Erde rund? | 5f8a0861 | TRUE | 96 | 95 | ✅ Correct (ref: 96/90) |
| Hydrogen | a99ab62b | LEANING-FALSE | 37 | 78 | ✅ Correct (ref: 27/68) |
| Bolsonaro | 750a99bf | LEANING-TRUE | 67 | 61 | ✅ Correct (ref: 62/66) |
| Ist die Erde flach? | 77e1c825 | LEANING-FALSE | 31 | 89 | ✅ Correct, no inversion |

No regressions on any anchor.

---

## 6. Residual Instability

The 22pp DE spread (down from 47pp) is a material improvement but not zero. Remaining sources of variance:

1. **Decomposition facet variation**: the chosen dimensions still vary (Umweltnutzen vs ökologischer Nutzen vs ökologische Auswirkungen). This is acceptable — different synonym choices for similar concepts.
2. **Stage 2 evidence variation**: web search results change across runs (different sources, different evidence mixes). This is inherent to live web retrieval.
3. **Stage 4 LLM stochasticity**: verdict temperature introduces sampling noise.

The predicate-strength fix targeted the largest single source of variance (32pp outlier from softening) and successfully eliminated it. The remaining 22pp is distributed across multiple smaller sources — no single dominant cause.

---

## 7. Conclusion

**QLT-1 is validated.** The prompt fix achieves the stated goal:
- Predicate strength is preserved across all runs
- Claim count is stabilized
- Truth spread is materially reduced
- No regressions on control anchors

The fix should be committed and deployed.
