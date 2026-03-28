# FLOOD-1 Validation Batch 1 — Post-Implementation Results

**Date:** 2026-03-28
**Role:** Senior Developer
**Status:** PARTIAL — per-source cap not confirmed active
**Commit:** `20f11239` (FLOOD-1), warning registration fix pending commit

---

## 1. Validation Run Summary

7 jobs submitted covering 5 input families + 2 meaningful duplicates (Bolsonaro x2, Plastik DE x2) for variance measurement.

| # | Job ID | Family | TP | Conf | Verdict | Evidence | URLs | Domains | Max/URL | Max/Domain | URLs>5 |
|---|--------|--------|---:|-----:|---------|-------:|-----:|--------:|--------:|-----------:|-------:|
| 1 | `5bcbd026` | Bolsonaro | 70.7 | 69.9 | LEANING-TRUE | 95 | 30 | 23 | 8 | 16 | 3 |
| 2 | `d60b1a17` | Bolsonaro | 55.9 | 60.4 | MIXED | 65 | 19 | 17 | 8 | 8 | 3 |
| 3 | `99cbdbea` | Plastik DE | 32.4 | 71.4 | LEANING-FALSE | 80 | 27 | 24 | 5 | 8 | 0 |
| 4 | `a2995ca3` | Hydrogen | 13.2 | 78.7 | FALSE | 53 | 24 | 22 | 5 | 5 | 0 |
| 5 | `f516728c` | Plastik EN | 56.8 | 70.9 | MIXED | 116 | 38 | 28 | 8 | 15 | 2 |
| 6 | `787b4125` | Homeopathy | 79.4 | 83.1 | MOSTLY-TRUE | 53 | 21 | 9 | 8 | 13 | 2 |
| 7 | `185ac706` | Plastik DE | 34.7 | 57.5 | LEANING-FALSE | 63 | 24 | 18 | 6 | 15 | 1 |

---

## 2. Per-Claim Breakdown

### Bolsonaro (runs 1 & 2)

| Run | AC_01 TP | AC_01 Conf | AC_02 TP | AC_02 Conf |
|-----|----------|------------|----------|------------|
| `5bcbd026` | 75 | 78 | 65 | 59 |
| `d60b1a17` | 42 | 52 | 65 | 66 |
| **Spread** | **33pp** | **26pp** | **0pp** | **7pp** |

- Run 1 hit LEANING-TRUE (the expected modal verdict) with AC_01=75 — a strong result.
- Run 2 hit MIXED with AC_01=42 — still exhibiting the flooding signature pattern on AC_01.
- AC_02 is stable across both runs (65/65).

### Plastik DE (runs 3 & 7)

| Run | AC_01 TP | AC_02 TP | AC_03 TP | Overall |
|-----|----------|----------|----------|---------|
| `99cbdbea` | 15 | 52 | 38 | 32.4 |
| `185ac706` | 28 | 42 | 40 | 34.7 |
| **Spread** | **13pp** | **10pp** | **2pp** | **2.3pp** |

Overall spread: 2.3pp (green under EVD-1). Individual claims well within expected variance.

### Controls (no regressions)

| Family | TP | Conf | Expected Range | Status |
|--------|---:|-----:|----------------|--------|
| Hydrogen | 13.2 | 78.7 | FALSE 10-37 | GREEN |
| Plastik EN | 56.8 | 70.9 | MIXED 44-60 | GREEN |
| Homeopathy | 79.4 | 83.1 | 61-76 typical | SLIGHTLY HIGH |

- Hydrogen: clean FALSE, consistent with historical range.
- Plastik EN: MIXED 56.8 — within the 44-60 expected range.
- Homeopathy: MOSTLY-TRUE 79.4 — on the high side (historical: 27-76), but within one-run variance.

---

## 3. Per-Source Cap Assessment

**CRITICAL FINDING: Per-source cap (Fix 2) did NOT fire for any of the 7 jobs.**

Evidence:
- Zero `per_source_evidence_cap` warnings in any job
- 5 of 7 jobs have URLs with >5 items (max 8)
- Hydrogen and Plastik DE run 3 happen to have max 5 per URL (natural, not enforced)

**Root cause hypothesis:** Next.js dev server served a cached compiled bundle from before the FLOOD-1 commit (`20f11239`). The `.next/dev/` cache was not invalidated when the commit was applied. A debug job (`900806e0`) was submitted with the correct compiled code (confirmed by inspecting `.next/dev/server/app/api/internal/run-job/route.js`) but is still queued behind a backlog of auto-resumed jobs.

**Action needed:** Wait for the debug job to complete, or restart the dev server to force a clean recompile.

---

## 4. Source Portfolio (Fix 1) Assessment

Fix 1 adds `sourcePortfolioByClaim` to the verdict prompts. Since the compiled bundle may have been stale (same issue as Fix 2), the portfolio data may not have been included in these runs.

Without the cap preventing over-representation, the portfolio metadata alone is unlikely to fully mitigate flooding — the LLM still sees 8-16 items from verbose sources.

---

## 5. Comparison with Historical Data

### Bolsonaro

| Run | When | TP | Verdict | AC_01 TP | AC_01 Conf | Notes |
|-----|------|---:|---------|----------|------------|-------|
| **efc5e66f** | Pre-FLOOD | 56 | MIXED | 38 | 52 | **FLOODING VICTIM** (civilizationworks 11 items) |
| **1abb0ea5** | Pre-FLOOD | 54 | MIXED | 48 | 58 | |
| **750a99bf** | Pre-FLOOD | 67.7 | LEANING-TRUE | — | — | QLT-1 report |
| **4e403fd0** | Pre-FLOOD | 66.5 | LEANING-TRUE | — | — | QLT-1 report |
| **5bcbd026** | Post-FLOOD | 70.7 | LEANING-TRUE | 75 | 78 | **Best AC_01 in batch** |
| **d60b1a17** | Post-FLOOD | 55.9 | MIXED | 42 | 52 | Still shows AC_01 dip |

Run 1 is the best Bolsonaro AC_01 result we've seen (75/78). But run 2 still shows the characteristic AC_01 dip. The 33pp AC_01 spread between runs confirms evidence-driven variance remains — which is expected, since the cap wasn't active.

### Plastik DE

| Run | When | TP | Conf | Notes |
|-----|------|---:|-----:|-------|
| Pre-FLOOD range | | 24-46 | 65-74 | QLT-1 report (5 runs) |
| **99cbdbea** | Post-FLOOD | 32.4 | 71.4 | Within range |
| **185ac706** | Post-FLOOD | 34.7 | 57.5 | Within range, lower conf |

No regression. 2.3pp overall spread (green).

### Hydrogen

| Run | When | TP | Conf |
|-----|------|---:|-----:|
| **a99ab62b** | Pre-FLOOD | 37.2 | 78.6 |
| **a2995ca3** | Post-FLOOD | 13.2 | 78.7 |

TP dropped from 37 to 13 — more decisive FALSE. Confidence identical. No regression.

### Homeopathy

| Run | When | TP | Conf |
|-----|------|---:|-----:|
| **efe1102f** | Pre-FLOOD | 60.8 | 74.2 |
| **b5f29c58** | Pre-FLOOD | 75.8 | 24.0 |
| **de699b14** | Pre-FLOOD | 26.6 | 71.1 |
| **787b4125** | Post-FLOOD | 79.4 | 83.1 |

High TP and confidence — good result. Historical range is wide (27-76), so 79.4 is at the high end but within variance.

---

## 6. Conclusions

1. **No regressions detected** across any control family.
2. **Bolsonaro shows improvement in 1 of 2 runs** (70.7 LEANING-TRUE vs typical ~55-67 range).
3. **Per-source cap (Fix 2) was NOT active** — zero warnings, URLs still have 8 items. Likely a stale Next.js cache issue.
4. **Source portfolio (Fix 1) activation is uncertain** — same cache issue.
5. **A fresh validation batch is needed** after confirming the dev server is serving the FLOOD-1 code. The debug job `900806e0` will be the canary.

---

## 7. Next Steps

1. **Wait for debug job `900806e0` to complete** — check for `per_source_evidence_cap` warnings.
2. **If no cap warnings:** restart dev server (clean `.next` cache) and re-run Bolsonaro + one control.
3. **If cap warnings present:** proceed with full 4-run validation per investigation §12.
4. **Register the `per_source_evidence_cap` warning type** in `types.ts` and `warning-display.ts` (done in working tree, not yet committed).
