# Report Quality Scorecard Review — 2026-03-24

**Reviewer:** Lead Architect (Claude Opus 4.6)
**Framework:** [Generic Report Quality Signals Scorecard](2026-03-24_Generic_Report_Quality_Signals_Scorecard.md)
**Scope:** Post-VAL-1 assessment of current report quality across all input families with committed reference-good anchors
**Status:** HISTORICAL / PRE-QLT-1 baseline review
**Stack:** Commit `960b09c3` + all fixes through VAL-1 Round 3 closure. WS-1–WS-4 refactoring complete. Stage-1 `claimDirection` fix (`1e7e2c57`), boundary-coverage fix (`31aea55d`), claim-contract validator (Mar 20/21), verdict-direction repair (`retry_once_then_safe_downgrade`), weighted sanity check (`39a9ae6b`), UCM alignment (`960b09c3`). SR weighting disabled by default.

**Historical note:** This review predates the full 2026-03-25 QLT-1 validation batch. In particular, its “controls” and facet-stability conclusions should not be treated as the latest canonical view once the post-QLT-1 validation handoff is available.

---

## 1. Executive Summary

The current stack produces **directionally correct, structurally sound reports** on control inputs and most non-trivial topics. Key fixes since the March refactoring wave are confirmed working:

- **Flat-earth inversion** fixed (`claimDirection` prompt, `1e7e2c57`)
- **Stage-4 reliability** restored (provider guard, `75416ce8`)
- **Coverage matrix** populated (multi-claim mapping fix, `31aea55d`)
- **Predicate preservation** partially improved (claim-contract validator, Mar 20/21)
- **Verdict direction** repair active (`retry_once_then_safe_downgrade`)
- **SR weighting** disabled by default — no longer compressing TP

**However, Plastik-family inputs remain materially unstable** (47pp spread on 5 identical runs, confirmed Stage 1 origin — see [Plastik Decomposition Comparison](../AGENTS/Handoffs/2026-03-24_Senior_Developer_Plastik_Decomposition_Comparison.md)). The claim-contract validator improved predicate preservation for some runs but did not fully stabilize decomposition. This is the system's most significant quality gap. It does not affect controls or most other input families.

**Overall judgment: Acceptable but unstable on broad evaluative inputs.** Controls are good. Technical/factual topics are good. Complex political-legal inputs are acceptable with moderate variance. Broad rhetorical claims ("Plastik recycling bringt nichts", "Muslims are more violent than Christians") remain degraded by Stage-1 decomposition instability.

---

## 2. Scope and Exclusions

### In scope
| Family | Anchor job | Recent runs assessed |
|--------|-----------|---------------------|
| Plastik DE | `c5fb0cb5` (TP=17, Captain-judged good) | 5x comparison (a662, a79a, 86f2, c5fb, bf3a) + VAL-1 runs |
| Hydrogen | `ee0890af` (TP=27, good technical report) | VAL-1 Round 2+3 |
| Round Earth | `b5f4c878` (TP=96, clean control) | VAL-1 Round 2+3 |
| Bolsonaro | `2b4cd8d7` (TP=62, reasonable complex) | VAL-1 Round 2+3 + regression investigation |

### Excluded
| Job | Reason |
|-----|--------|
| `f8c73f0d` (Flat Earth TRUE 100%) | Pre-fix `claimDirection` inversion — infrastructure/prompt bug, not quality |
| `de2208c3`, `e2523b0d` (Flat Earth MIXED) | Pre-fix runs |
| `56ab80b1` (Plastik UNVERIFIED conf 0) | Uncertain-excluded — likely infrastructure |
| All `analysis_generation_failed` jobs | Runtime failure, not quality-evaluable |
| All `llm_provider_error` jobs | Provider overload, not quality-evaluable |

---

## 3. Scorecard-Based Findings

### 3.1 Hard-Failure Signals

| ID | Signal | Status | Evidence |
|----|--------|--------|----------|
| HF-1 | Runtime integrity | **PASS** | VAL-1 Round 3: zero `analysis_generation_failed`, zero `llm_provider_error` across 7 jobs |
| HF-2 | No fallback masquerade | **PASS** | `analysis_generation_failed` is now surfaced distinctly from `insufficient_evidence` (Stage-4 guard fix `75416ce8`) |
| HF-3 | Directional correctness on controls | **PASS** | Flat Earth: FALSE 5% conf 88. Round Earth: TRUE 96% conf 90. Hydrogen: MOSTLY-FALSE 27% conf 68. |
| HF-4 | Evidence transparency | **PASS** | All 4 anchor jobs have populated `supportingEvidenceIds` and `contradictingEvidenceIds` |

### 3.2 Stage-1 Claim Quality Signals

| ID | Signal | Status | Evidence |
|----|--------|--------|----------|
| S1-1 | Claim count stability | **PASS** (controls), **FAIL** (Plastik) | Controls: stable 2-3 claims. Plastik: 2 vs 3 across identical runs. |
| S1-2 | Facet stability | **PASS** (controls), **FAIL** (Plastik) | 5x Plastik comparison: no two runs chose the same facets (economic/ecological/practical/scalability/resource all varied) |
| S1-3 | Predicate-strength preservation | **FAIL** (Plastik) | Run 5 softened "bringt nichts" → "unwirksam", causing 32pp outlier. Directly measured. |
| S1-4 | `claimDirection` correctness | **PASS** | All post-fix runs: `supports_thesis` / `contradicts_thesis` correctly anchored to user thesis, not consensus |
| S1-5 | Specificity and non-duplication | **PASS** | Claims are concrete and non-overlapping across all families |

### 3.3 Evidence and Boundary Quality Signals

| ID | Signal | Status | Evidence |
|----|--------|--------|----------|
| EV-1 | Claim coverage | **PASS** | Anchor jobs: all claims have mapped evidence (post `31aea55d` fix) |
| EV-2 | Boundary coverage plausibility | **PASS** | Phase A pruning eliminated empty boundaries; coverage matrix now populated |
| EV-3 | Boundary coherence | **PASS** | Anchor boundary names are topic-appropriate and non-arbitrary |
| EV-4 | Relevance / contamination control | **PASS** | Phase A contamination fixes verified; zero foreign-jurisdiction boundaries in anchor jobs |
| EV-5 | Source diversity | **PASS** | Anchor jobs show multiple source types (news, academic, institutional, expert analysis) |

### 3.4 Verdict Quality Signals

| ID | Signal | Status | Evidence |
|----|--------|--------|----------|
| V-1 | Verdict direction plausibility | **PASS** | All anchors: directionally plausible. Hydrogen MOSTLY-FALSE, Plastik range plausible for mixed topic, Bolsonaro LEANING-TRUE to MIXED plausible for complex legal |
| V-2 | Confidence plausibility | **PASS** (improved) | Hydrogen conf improved from 24 → 68 after mixed-confidence default fix. Bolsonaro conf 57-66 reasonable for complex input. |
| V-3 | Mixed-case restraint | **PASS** | Bolsonaro MIXED 44% conf 57 — appropriately restrained for a genuinely contested topic |
| V-4 | Strong-case decisiveness | **PASS** | Round Earth TRUE 96% conf 90 — not artificially flattened. Flat Earth FALSE 5% conf 88. |
| V-5 | Sanity-check behavior | **PASS** | One legitimate `verdict_direction_issue` on Plastik (AC_02: 71% with 9/9 supports/contradicts). No overcorrection. |

### 3.5 Stability Signals

| ID | Signal | Status | Evidence |
|----|--------|--------|----------|
| ST-1 | Truth spread | **PASS** (controls), **FAIL** (Plastik) | Controls: 1-5pp spread. Plastik: 47pp spread (17-64%). Bolsonaro: 25pp spread (44-69%, acceptable for complex). |
| ST-2 | Confidence spread | **PASS** | Confidence remains in plausible bands across families |
| ST-3 | Claim-set similarity | **PASS** (controls), **FAIL** (Plastik) | 5x Plastik: claim count, facets, and strength all vary |
| ST-4 | Evidence-mix similarity | **PASS** (controls), **MARGINAL** (Plastik) | Evidence mix follows claim decomposition — when claims differ, evidence naturally differs |

### 3.6 Presentation and Trust Signals

| ID | Signal | Status | Evidence |
|----|--------|--------|----------|
| PT-1 | Warning honesty | **PASS** | `analysis_generation_failed` now surfaced distinctly; runtime failures not disguised as low-evidence |
| PT-2 | UI consistency | **MARGINAL** | VAL-2 open: jobs list can show verdict while stale progress events still arrive |
| PT-3 | Report substance | **PASS** | Anchor jobs: 40-180 evidence items, 4-6 boundaries, substantial narratives |

---

## 4. Best-Run and Anchor Comparison

### Plastik DE

| Metric | Anchor `c5fb0cb5` (TP=17) | Best other `bf3fa8eb` (TP=64) | Worst `86f227fb` (TP=21) |
|--------|---------------------------|-------------------------------|--------------------------|
| Claim count | 3 | 3 | **2** |
| Predicate strength | "bringt nichts" (strong) | **"unwirksam"** (soft) | "bringt nichts" (strong) |
| Direction | Correct | Correct | Correct |
| Confidence | 76 | 72 | 80 |
| Evidence items | 141 | *5x comparison batch* | *5x comparison batch* |
| Matrix coverage | 9/15 (60%) | — | — |
| Boundaries | 5 (CB_35: 122 items mega-cluster) | — | — |
| Dominant issue | — | **Stage 1** (predicate softening) | Stage 1 (claim count) |

**The anchor itself has the strongest predicate preservation.** The 47pp spread is entirely explained by Stage-1 variation.

### Hydrogen

| Metric | Anchor `ee0890af` (TP=27) | Prior run `b4e92e4a` (TP=20) |
|--------|---------------------------|------------------------------|
| Direction | MOSTLY-FALSE (correct) | MOSTLY-FALSE (correct) |
| Confidence | 67 | 24 (low — pre-mixed-conf fix) |
| Evidence items | 91 | — |
| Matrix coverage | 6/15 (40%) | — |
| Claims | 3 (well-to-wheel, FC conversion, operational) | — |
| Boundaries | 5 (CB_07: 76 items mega-cluster) | — |
| Dominant issue | — | Confidence too low (now fixed) |

### Round Earth

| Metric | Anchor `b5f4c878` (TP=96) | Prior `615a333a` (TP=91) |
|--------|---------------------------|--------------------------|
| Direction | TRUE (correct) | TRUE (correct) |
| Confidence | 90 | 86 |
| Evidence items | 61 (50 supporting, 0 contradicting) | — |
| Matrix coverage | 10/12 (83% — best of all anchors) | — |
| Claims | 2 (spherical shape, ellipsoidal deviation) | — |
| Spread | 5pp (91-96) | — |
| Dominant issue | None — stable and correct | — |

### Bolsonaro

| Metric | Anchor `2b4cd8d7` (TP=62) | VAL-1 R3 `b5cddca2` (TP=44) |
|--------|---------------------------|------------------------------|
| Direction | LEANING-TRUE | MIXED |
| Confidence | 65 | 57 |
| Evidence items | 77 (41 supporting, 18 contradicting) | — |
| Matrix coverage | 5/8 (63%) | — |
| Claims | 2 (procedural compliance AC_01=45%, fairness AC_03=72%) | — |
| Boundaries | 4 (CB_01: 55 items primary, CB_05: 17 expert analysis) | — |
| Spread | 25pp (44-69 across 4 recent runs) | — |
| Dominant issue | — | Run-to-run variance on genuinely complex input |

---

## 5. Root-Cause Judgment

| Family | Quality Level | Dominant Issue Layer | Explanation |
|--------|--------------|---------------------|-------------|
| **Round Earth** | **Good** | None | Clean control, stable, correct |
| **Flat Earth** | **Good** (post-fix) | None (was Stage 1 `claimDirection`) | Fixed by `1e7e2c57` |
| **Hydrogen** | **Good** | None (was Stage 4/5 confidence) | Fixed by mixed-confidence default `e6a20153` |
| **Bolsonaro** | **Acceptable but unstable** | Mixed (Stage 1 + genuine topic complexity) | 25pp spread on 4 runs. Acceptable for a genuinely contested political-legal topic. Not a system bug. |
| **Plastik DE** | **Degraded** | **Stage 1** | 47pp spread, confirmed by 5x controlled comparison. Predicate strength softening + facet instability + claim count variation. All upstream. |
| **Plastik EN** | **Degraded** | **Stage 1** (inferred) | Similar spread pattern to DE variant. English 5x comparison not yet run but pattern is consistent. |
| **Muslims** | **Degraded** | **Stage 1** (inferred) | 46pp spread (15-61%) across 13 runs. LEANING-TRUE outlier (TP=61, `9fa561ad`) contradicts majority MOSTLY-FALSE direction. Similar Stage-1 decomposition variance pattern to Plastik. |
| **Iran** | **Good but drifting** | Search/evidence (temporal) | Stable direction (LEANING-TRUE to TRUE). Temporal drift from 87-92% (Mar 5-8) to 65-78% (Mar 14-19) correlates with Mar 12 config changes. Not a current regression — documented. |

---

## 6. Recommended Next Action

**Smallest justified next action: Further predicate-strength hardening at the Stage 1 prompt level.**

The claim-contract validator (Mar 20/21) improved predicate preservation, but the 5x Plastik comparison (Mar 24) still shows 47pp spread with "bringt nichts" → "unwirksam" softening in 1 of 5 runs. This means the validator catches some drift but not all. The next step is:

- **QLT-1**: Prompt-level predicate strength preservation — explicit guidance in Pass 2 extraction that broad evaluative claims must preserve the original predicate strength ("bringt nichts" ≠ "unwirksam"). This is the empirically measured 32pp outlier axis.
- Prompt-only change, directly addresses the measured dominant instability axis
- Already recommended by the [Plastik Decomposition Comparison](../AGENTS/Handoffs/2026-03-24_Senior_Developer_Plastik_Decomposition_Comparison.md)

**Do not attempt:**
- Stage 2/4/5 fixes for Plastik instability (instability is upstream — confirmed)
- Self-consistency tuning (would not address Stage 1 variation)
- SR weighting re-enablement (SR evaluation not yet calibrated — Wikipedia scoring 38-42% proves this)

**Separate from this review:**
- **VAL-2** (progress/verdict sync race) — presentation issue, not quality. High urgency in backlog.
- **P1-A/P1-B optimization** — unblocked by VAL-1 closure but requires Captain decision
- **OBS-1** (request-safe metrics collector) — observability, not quality

---

## 7. Open Uncertainties

| Item | Uncertainty | How to Resolve |
|------|------------|----------------|
| English Plastik variant | Does EN show the same Stage 1 pattern? | Run 5x English comparison (not yet done) |
| Bolsonaro 25pp spread | Is this acceptable for a complex input or a quality gap? | Captain judgment — no objective threshold for genuinely mixed topics |
| Facet stability after strength fix | Will fixing predicate strength also stabilize facet choice? | Measure after QLT-1 prompt fix lands |
| Claim-contract validator effectiveness | The validator catches some predicate drift but not all (1 of 5 runs still softened). Is the validator's retry+fail-open behavior sufficient, or does the Pass 2 prompt itself need to be strengthened? | Investigate validator pass/fail stats across the 5x comparison runs |
| SR weighting future | `evidenceWeightingEnabled` is off by default. When re-enabled, will it re-introduce TP compression? Wikipedia scoring 38-42% proves SR evaluation is miscalibrated. | Do not re-enable until SR evaluation prompts are improved (SR-1) |
| Iran temporal drift | 87-92% → 65-78% over Mar 5-19. Correlates with Mar 12 config changes but no single change attributed. | Investigate if search result changes or SR config contributed. Low urgency — direction still correct. |

---

## Compact Rubric Summary

| Dimension | Rating |
|-----------|--------|
| 1. Runtime clean | **PASS** |
| 2. Claim extraction faithful | **PASS** (controls), **FAIL** (Plastik predicate) |
| 3. Predicate strength preserved | **FAIL** (Plastik 32pp gap from softening) |
| 4. Evidence mapped correctly | **PASS** |
| 5. Boundary coverage plausible | **PASS** |
| 6. Verdict direction plausible | **PASS** |
| 7. Confidence plausible | **PASS** |
| 8. Repeat-run stability acceptable | **PASS** (controls), **FAIL** (Plastik) |
