# UPQ-1 Phase A-1 Canary Measurement

**Build under test:** `62e97e0d` (Phase A-1: claim-local `existingEvidenceSummary` in `GENERATE_QUERIES`)
**Change under test:** claim-local `existingEvidenceSummary` in `GENERATE_QUERIES`
**Baseline build:** `f9b9099d` (post-tension-fix, pre-Phase-A-1)
**Date:** 2026-04-06

---

## Summary Table

| Family | Baseline job | New job | Verdict change | Claim-local evidence balance | Boundary shape | Overall read |
|---|---|---|---|---|---|---|
| Bolsonaro EN | `f6ea1496` | `e24093da` | LT 63/68 → LT 71/60 | AC_02 worsened (17→6) | 0.46→0.56 max share | mixed |
| Plastik DE | `207131a4` | `705b6c17` | M 53/52 → LF 39/69 | AC_02 improved (10→23) | 0.30→0.81 mega-boundary | mixed |
| Swiss vs Germany | `5aa28697` | `f36dd064` | MT 76/65 → UV 50/0 | Severe evidence scarcity (12→5) | Flat but too thin | worse (scarcity) |
| misinformation tools | `86d1d0af` | `b3199cde` | M 52/70 → M 48/58 | AC_03 improved (+12C), AC_02 halved | 0.36→0.51 | mixed |

---

## 1. Bolsonaro EN

### Baseline
- Job: `f6ea1496bb4e4f85bc2b66b8cc2fa637`
- Verdict: `LEANING-TRUE 63 / 68`
- Evidence / sources / iterations: `69 / ? / 4`
- Boundaries: `4` → `32 / 24 / 8 / 5`
- Max-boundary share: `0.46`
- Warnings: 5 total (no grounding/direction)

### New run
- Job: `e24093dac3694a06947b38235edeb19c`
- Verdict: `LEANING-TRUE 71 / 60`
- Evidence / sources / iterations: `68 / ? / 6`
- Boundaries: `6` → `38 / 23 / 2 / 2 / 2 / 1`
- Max-boundary share: `0.56`
- Warnings: 13 total
  - `direction_rescue_plausible`

### Per-claim evidence balance

| Claim | Baseline total | Baseline S/C/N | New total | New S/C/N | Read |
|---|---|---|---|---|---|
| AC_01 | 25 | 14S/1C/10N | 46 | 22S/4C/20N | More evidence, better contra coverage |
| AC_02 | 17 | 5S/5C/7N | 6 | 1S/2C/3N | **Sharply worse** — lost 11 items |
| AC_03 | 12 | 0S/1C/11N | 14 | 2S/4C/8N | Slightly better, more contra |

### Reading
- Evidence-balance change: **Mixed.** AC_01 gained significantly (+21 items, better direction spread). AC_02 collapsed from 17→6 items — the worst claim-level regression in this batch. AC_03 marginally improved.
- Query-coverage implication: The evidence summary may have steered queries toward AC_01 (already well-covered) because AC_01's coverage was highly visible in the summary. AC_02's scarcity may not have been actionable because the summary showed few covered dimensions for AC_02, but the LLM may have interpreted that as "nothing useful to search for" rather than "gap to fill."
- Boundary-shape implication: 0.56 max share is worse than baseline 0.46. Two mega-ish boundaries (38+23) dominate.
- Net judgment: `mixed` — truth improved (+8pp) but AC_02 starvation worsened, and boundary concentration increased.

---

## 2. Plastik DE

### Baseline
- Job: `207131a4f56946ffb0e5307c38f9720d`
- Verdict: `MIXED 53 / 52`
- Evidence / sources / iterations: `99 / ? / 2`
- Boundaries: `6` → `30 / 20 / 15 / 15 / 13 / 6`
- Max-boundary share: `0.30`
- Warnings: 8 total (no grounding/direction)

### New run
- Job: `705b6c17b12d43eba7da51028d157132`
- Verdict: `LEANING-FALSE 39 / 69`
- Evidence / sources / iterations: `97 / ? / 1`
- Boundaries: `5` → `79 / 10 / 3 / 3 / 2`
- Max-boundary share: `0.81`
- Warnings: 7 total
  - `verdict_grounding_issue` ×2
  - `direction_rescue_plausible`

### Per-claim evidence balance

| Claim | Baseline total | Baseline S/C/N | New total | New S/C/N | Read |
|---|---|---|---|---|---|
| AC_01 | 50 | 17S/19C/14N | 42 | 18S/14C/10N | Similar counts, slight narrowing |
| AC_02 | 10 | 5S/3C/2N | 23 | 2S/11C/10N | **Improved** — gained 13 items, much better contra |
| AC_03 | 38 | 23S/4C/11N | 33 | 16S/8C/9N | Similar, slightly less skewed |

### Reading
- Evidence-balance change: **AC_02 materially improved** (10→23 items, gained the contra evidence it previously lacked). AC_01 and AC_03 are comparable.
- Query-coverage implication: The evidence summary appears to have helped AC_02 on Plastik — the gap-identification framing may have steered queries toward the economic dimension which was sparse.
- Boundary-shape implication: **Severe regression.** 0.81 max-boundary share vs baseline 0.30. One mega-boundary absorbed 79 of 97 items. This is the worst boundary concentration in this batch and is unrelated to the evidence summary change — likely a Stage 3 clustering variance issue.
- Net judgment: `mixed` — AC_02 evidence balance improved (the target signal), but mega-boundary regression and new grounding warnings complicate the reading. Only 1 main iteration vs baseline's 2.

---

## 3. Swiss vs Germany

### Baseline
- Job: `5aa2869797d643bc8e7557fa860c0149`
- Verdict: `MOSTLY-TRUE 76 / 65`
- Evidence / sources / iterations: `12 / ? / 4`
- Boundaries: `5` → `3 / 3 / 2 / 2 / 2`
- Max-boundary share: `0.25`
- Warnings: 6 total

### New run
- Job: `f36dd064d7eb49699d1cd294766cdcea`
- Verdict: `UNVERIFIED 50 / 0`
- Evidence / sources / iterations: `5 / ? / 2`
- Boundaries: `4` → `2 / 1 / 1 / 1`
- Max-boundary share: `0.40`
- Warnings: 7 total

### Per-claim evidence balance

| Claim | Baseline total | Baseline S/C/N | New total | New S/C/N | Read |
|---|---|---|---|---|---|
| AC_01 | 4 | 2S/0C/2N | 1 | 0S/0C/1N | Collapsed |
| AC_02 | 6 | 0S/0C/6N | 2 | 1S/0C/1N | Collapsed |
| AC_03 | (n/a) | (n/a) | (n/a) | (n/a) | Insufficient in both |

### Reading
- Evidence-balance change: **Severe evidence scarcity.** Only 5 items total vs baseline 12. This is a fetch/search reliability issue, not an evidence-summary effect. The family was already thin at baseline (12 items).
- Query-coverage implication: Cannot assess — the evidence pool is too thin for the summary to have had any meaningful effect.
- Boundary-shape implication: N/A — too few items for meaningful boundaries.
- Net judgment: `worse` — but likely not caused by Phase A-1. Swiss is a known thin-evidence family. This run hit worse search/fetch conditions. The UNVERIFIED result is a D5 gate correctly firing on insufficient evidence.

---

## 4. Misinformation Tools

### Baseline
- Job: `86d1d0af67064d51bcece58697c0c72c`
- Verdict: `MIXED 52 / 70`
- Evidence / sources / iterations: `53 / ? / 1`
- Boundaries: `5` → `19 / 18 / 12 / 3 / 1`
- Max-boundary share: `0.36`
- Warnings: 15 total
  - `verdict_grounding_issue` ×2

### New run
- Job: `b3199cde0d4a400998c662d6934d638f`
- Verdict: `MIXED 48 / 58`
- Evidence / sources / iterations: `73 / ? / 1`
- Boundaries: `6` → `37 / 11 / 10 / 8 / 6 / 1`
- Max-boundary share: `0.51`
- Warnings: 12 total
  - `verdict_grounding_issue`

### Per-claim evidence balance

| Claim | Baseline total | Baseline S/C/N | New total | New S/C/N | Read |
|---|---|---|---|---|---|
| AC_01 | 16 | 8S/5C/3N | 23 | 8S/4C/11N | More evidence, more neutral |
| AC_02 | 20 | 8S/5C/7N | 10 | 3S/6C/1N | **Halved** — lost 10 items |
| AC_03 | 22 | 15S/1C/6N | 28 | 9S/13C/6N | **Much better contra** (+12C) |

### Reading
- Evidence-balance change: **Mixed.** AC_03 gained substantial contra coverage (1C→13C). AC_01 grew but shifted neutral. AC_02 halved (20→10) — same pattern as Bolsonaro AC_02.
- Query-coverage implication: AC_03's contra improvement is consistent with the gap-identification prompt working. AC_02's collapse may indicate the summary is steering queries away from already-thin claims.
- Boundary-shape implication: 0.36→0.51 max share, moderate regression.
- Net judgment: `mixed` — AC_03 improved substantially, AC_02 regressed.

---

## Cross-Canary Judgment

### What improved
- **Plastik AC_02 evidence balance materially improved** (10→23 items, 3C→11C). The economic-viability claim gained substantially more evidence.
- **Misinfo AC_03 contra coverage improved dramatically** (1C→13C). Previously almost entirely support-sided, now has substantial opposing evidence.
- **Bolsonaro truth improved** (63→71) and now matches the deployed comparator range. Ran 6 iterations (up from 4).

### What did not improve
- **Bolsonaro AC_02 collapsed** (17→6 items). International procedural law claim became thinner.
- **Misinfo AC_02 halved** (20→10 items). Same pattern — a mid-tier claim losing items.
- **Plastik boundary concentration regressed catastrophically** (0.30→0.81). Stage 3 clustering issue, not caused by the evidence summary.
- **Swiss collapsed to UNVERIFIED** from evidence scarcity (12→5 items). Not attributable to Phase A-1.

### What is unclear
- Whether the AC_02 collapses (Bolsonaro 17→6, Misinfo 20→10) are caused by Phase A-1 anchoring bias or ordinary run-to-run variance.
- Whether the AC improvements (Plastik AC_02, Misinfo AC_03) are causally from the evidence summary or coincidence.

### Pattern observed
A suggestive pattern across families: **claims that were already the most balanced (AC_02 on Bolsonaro and Misinfo) lost items, while claims that were most imbalanced gained corrective evidence.** This could indicate:
- The evidence summary is working on the **direction gap** signal (correctly steering toward under-represented directions)
- But also causing **reallocation** — iterations targeting the most-imbalanced claim come at the cost of the previously-balanced claim

This reallocation effect was not anticipated. The evidence summary doesn't directly control which claim gets targeted each iteration (that's `findLeastResearchedClaim`), but the generated queries for the targeted claim may have shifted.

### Main decision
- Phase A-1 judgment: **`no_clear_help`**

### Why
- 2 of 4 canaries show clear per-claim improvements on specific claims (Plastik AC_02, Misinfo AC_03)
- But 2 of 4 canaries also show per-claim regressions on other claims (Bolsonaro AC_02, Misinfo AC_02)
- Swiss is a scarcity artifact, not attributable
- Boundary concentration regressed on Plastik (unrelated to Phase A-1 but confounds the reading)
- The net signal is direction-rebalancing working on some claims while possibly hurting others — genuinely mixed
- A single-run comparison cannot distinguish Phase A-1 effects from normal variance

### Next step
- **Proceed to Phase A-2 telemetry.** The per-iteration claim-level ledger would directly answer whether the evidence summary is causing iteration-level reallocation between claims or whether this is normal variance. Without that data, the attribution question cannot be resolved.
- Do NOT revert Phase A-1 yet — the direction-rebalancing signal on Plastik AC_02 and Misinfo AC_03 is the strongest positive evidence of the change working. The AC_02 collapses need per-iteration data to diagnose.
