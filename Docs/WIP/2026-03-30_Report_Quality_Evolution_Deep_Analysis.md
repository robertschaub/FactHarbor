# Report Quality Evolution — Deep Analysis (March 25–30, 2026)

**Date:** 2026-03-30
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Scope:** 100 jobs across 12 input families, 8 code/prompt change waves

---

## 1. Executive Summary

Quality improved materially on structural defects (claim decomposition, citation carriage, matrix alignment, verdict uniqueness) but **cross-linguistic neutrality and run-to-run variance remain significant** on broad evaluative inputs. The system now honestly reports coverage gaps (UNVERIFIED claims visible in matrix, article confidence adjusted by LLM). One critical new finding: **Plastik recycling shows a 58pp cross-language spread** (DE 33% vs EN 72% vs FR 13%) — the largest neutrality gap observed since the stabilization wave.

---

## 2. Timeline of Changes

| Date | Commit | Change | Primary Impact |
|------|--------|--------|---------------|
| Mar 25 | `49700231` | QLT-1: Predicate strength preservation | Plastik DE 47pp→22pp |
| Mar 25 | `317319fb` | QLT-3: Facet consistency for comparatives | Muslims 27pp→21pp |
| Mar 25 | `f86811fe` | VAL-2: Verdict badge terminal gate | UX trust |
| Mar 25 | `6e402208` | OBS-1: AsyncLocalStorage metrics | Observability |
| Mar 26 | `5942eba5` | W15: Domain-aware fetch batching | Fetch reliability |
| Mar 26 | `756dded0` | P1-B: Preliminary search parallelism | Latency |
| Mar 27 | various | FLOOD-1 + seeded evidence remap | Source flooding mitigation |
| Mar 29 | `e1f2c551` | Citation carriage fix | Reconciliation integrity |
| Mar 29 | `fff7a508` | Stage-1 claim decomposition fix | 8640/cd4501 over-fragmentation |
| Mar 29 | `e1f2c551` | 2705/e407 all-insufficient root fix | Assessable-claims path |
| Mar 30 | `03387283` | Report matrix + LLM article adjudication | Honest UNVERIFIED reporting |

---

## 3. Input Families and Quality Classification

### 3a. Established Families (tracked since QLT-1)

| Family | Class | Input | Language |
|--------|-------|-------|----------|
| Flat Earth | A | Ist die Erde flach? | DE |
| Round Earth | A | Ist die Erde rund? / Die Erde ist rund | DE |
| Hydrogen | B | Using hydrogen for cars is more efficient... | EN |
| Plastik DE | C | Plastik recycling bringt nichts | DE |
| Plastik EN | C | Plastic recycling is pointless | EN |
| Muslims | D | Muslims are more violent than Christians. | EN |
| Bolsonaro | E | Court proceedings... procedural law... fair | EN |

### 3b. New Families (introduced Mar 28–30)

| Family | Class | Input | Language | Jobs |
|--------|-------|-------|----------|------|
| Plastik FR | C | Le recyclage du plastique ne sert a rien | FR | 6 |
| Plastik EN v2 | C | Plastic Recycling is pointless (caps) | EN | 6 |
| Bolsonaro PT | E | O processo judicial contra Jair Bolsonaro... | PT | 5 |
| SRG SSR | C/D | Die SRG SSR... Fact-Checking... | DE | 12 |
| SRF | C/D | Das SRF betreibt Fact-Checking... | DE | 3 |
| Hydrogen inverted | B | Using electricity for cars is more efficient... | EN | 1 |
| Hydrogen short | B | Hydrogen is more efficient for cars... | EN | 4 |
| Oberentfelden | — | Die Gemeinde Oberentfelden... Wasserqualitat | DE | 3 |
| Wind-still.ch | — | URL input | DE | 3 |
| Homeopathy | C | Homeopathy does not work for animals | EN | 3 |
| Homeopathy v2 | C | Homeopathy is effective for treating diseases | EN | 2 |
| Sky is blue | A | The Sky is blue | EN | 1 |
| Climate | D | Can we trust climate research? | EN | 1 |

---

## 4. Quality Evolution by Family

### 4a. Plastik Recycling — CROSS-LINGUISTIC NEUTRALITY CONCERN

This is the most important quality finding in this analysis.

| Language | Jobs | Truth% Range | Mean | Spread | Direction |
|----------|------|-------------|------|--------|-----------|
| **DE** ("bringt nichts") | 12 | 25–60% | 37% | 35pp | Mostly FALSE-side |
| **EN** ("is pointless") | 14 | 40–72% | 56% | 32pp | Mostly TRUE-side |
| **FR** ("ne sert a rien") | 6 | 13–51% | 31% | 38pp | Mostly FALSE-side |

**Cross-language spread at a given point in time (commit `9459347711a8`):**
- DE: 33% / EN: 72% / FR: 13% — **58pp max spread**

The English version consistently scores higher (TRUE-side: "recycling IS pointless") while German and French score lower (FALSE-side: "recycling is NOT pointless"). This is the same semantic claim in different languages producing directionally opposite verdicts.

**Root cause assessment:** Not a Stage-1 problem. All three languages produce similar claim decompositions (environmental, economic, practical). The difference is in Stage 2 evidence: English-language web sources return more evidence supporting the "pointless" narrative (US/UK recycling criticism), while German/French sources return more evidence supporting recycling (EU/DACH recycling infrastructure).

**EVD-1 classification:** Class C, individual languages are AMBER (30-38pp within-language spread). The cross-language spread is not covered by EVD-1 — it's a separate neutrality concern.

### 4b. Hydrogen Efficiency

| Variant | Jobs | Truth% Range | Mean | Direction |
|---------|------|-------------|------|-----------|
| EN standard | 8 | 8–58% | 22% | Mostly FALSE |
| EN short | 4 | 13–26% | 20% | Consistently FALSE |
| EN inverted | 1 | 78% | 78% | TRUE (correct inversion) |

**Outlier:** Job `a0c5e51e` scored 58% (LEANING-TRUE) — AC_03 ("hydrogen has higher energy density") scored 92% TRUE. This claim is factually correct but tangential to efficiency. It inflated the article score.

**Improvement over time:** Post-QLT-1 runs (8-27%) are more consistent than the single pre-QLT-1 run (37%). The inverted claim (`6b2f8611`, electricity > hydrogen) correctly scored MOSTLY-TRUE 78%.

### 4c. Bolsonaro Court Proceedings

| Variant | Jobs | Truth% Range | Mean | Direction |
|---------|------|-------------|------|-----------|
| EN "legally sound" | 6 | 55–69% | 64% | LEANING-TRUE |
| EN "fair" | 6 | 55–74% | 65% | LEANING-TRUE |
| PT | 5 | 63–78% | 70% | LEANING-TRUE / MOSTLY-TRUE |
| EN "verdicts fair" only | 3 | 62–74% | 67% | LEANING-TRUE |

**Stability:** Bolsonaro is the most stable family. Direction never flips. Spread within variant is 12-19pp. Cross-variant is slightly wider but consistent direction.

**Post-adjudication effect:** Jobs on commit `033872836a81` (with LLM adjudication) show slightly lower confidence when some claims are UNVERIFIED — correct behavior.

### 4d. SRG SSR / SRF Fact-Checking (New Family)

| Variant | Jobs | Truth% Range | Mean | UNVERIFIED Claims |
|---------|------|-------------|------|-------------------|
| SRG SSR full compound | 8 | 43–76% | 60% | 4/8 jobs have ≥1 |
| SRF simple | 3 | 35–75% | 59% | 2/3 jobs |
| SRG Werkzeuge/Methoden | 4 | 15–60% | 42% | 2/4 jobs |

**Key issues:**
- **33pp within-variant spread** (SRG SSR compound: 43–76%) — highest for any single input
- **Classification instability:** Same input classified as `ambiguous_single_claim` or `single_atomic_claim` across runs
- **Insufficient evidence:** "effizient und wirksam" claims frequently fail D5 (≤1 source type)
- **Post-adjudication:** Jobs with UNVERIFIED claims now show lowered confidence (40-50% vs 65-73%) — the adjudication is working

### 4e. Flat Earth / Round Earth / Sky is Blue (Controls)

| Control | Jobs | Truth% Range | Direction | Status |
|---------|------|-------------|-----------|--------|
| Flat Earth | 5 | 0–2% | Always FALSE | GREEN |
| Round Earth | 3 | 75–94% | Always TRUE | GREEN |
| Sky is blue | 1 | 94% | TRUE | GREEN |

Clean controls. No regressions across any commit.

### 4f. Oberentfelden Water Quality (Fabricated Local Claim)

All 3 jobs: UNVERIFIED 50%/conf 0. Correctly identifies no online evidence exists. All claims insufficient. The system appropriately gives a non-answer.

### 4g. Wind-still.ch URL Input

| Job | Commit | Truth% | Conf | Issues |
|-----|--------|--------|------|--------|
| `0791c9a1` | `f1e5cc96` | 50 | 0 | `analysis_generation_failed` — all verdicts failed |
| `45029b84` | `94593477` | 34 | 24 | `verdict_integrity_failure` on AC_04 |
| `a2b7e76c` | `03387283` | 33 | 48 | `insufficient_evidence` + `claim_contract_retry_still_failing` |

**Progress:** The earliest run had complete verdict generation failure. Later runs produce partial results. The URL content extraction is working but the topic is complex (Swiss wind energy criticism website) and evidence is sparse.

### 4h. Homeopathy

| Variant | Jobs | Truth% Range | Mean | Direction |
|---------|------|-------------|------|-----------|
| "does not work for animals" | 3 | 68–80% | 74% | MOSTLY-TRUE / LEANING-TRUE |
| "is effective for diseases" | 2 | 16–26% | 21% | MOSTLY-FALSE |

**Correct inversion:** "does not work" → TRUE-side; "is effective" → FALSE-side. Consistent and directionally correct.

---

## 5. Structural Quality Improvements (Mar 29–30)

### 5a. Citation Carriage Fix (e1f2c551)

**Before:** Reconciliation output did not carry `supportingEvidenceIds`/`contradictingEvidenceIds`. Stale advocate arrays corrupted downstream grounding and direction validation. 25/400 jobs (6.25%) hit `verdict_integrity_failure`.

**After:** Reconciliation returns citation arrays. Three-state parsing (absent→fallback, empty→intentional, valid→use). `verdict_integrity_failure` rate should drop materially. Only 1 new job (`45029b84`, wind-still.ch) shows integrity failure — from the older commit.

### 5b. Claim Decomposition Fix (fff7a508)

**Before:** SRG SSR "effizient und wirksam" input produced 3-4 claims, with "effizient" and "wirksam" as separate claims that both starved at D5.

**After:** Contract validation catches evidence-inseparable splits and triggers retry with merge guidance. 8640/cd4501 family: 4→2 claims, UNVERIFIED eliminated.

### 5c. All-Insufficient Root Fix + LLM Article Adjudication (03387283)

**Before:** UNVERIFIED claims hidden from matrix. Article confidence ignored them (weight=0). 2705-family matrix showed 1 column for 3-claim input.

**After:** Report matrix shows ALL claims. LLM adjudication lowers confidence when coverage is incomplete. Validation job `f80b6b41`: confidence dropped from ~65 to 40, matrix shows 3 claims.

---

## 6. Quality Trend Summary

### What improved
- Claim decomposition: no more conjunct-level splitting on validated families
- Citation carriage: reconciled verdicts now carry correct evidence arrays
- Matrix honesty: UNVERIFIED claims visible with distinct treatment
- Article honesty: LLM adjudication acknowledges incomplete coverage
- Infrastructure: zero `analysis_generation_failed` on recent commits

### What stayed the same
- Plastik within-language variance (22-38pp) — inherent to broad evaluative topics
- Per-claim environmental variance (37-47pp) — evidence-driven
- Bolsonaro direction stability (always LEANING-TRUE / MOSTLY-TRUE)

### What degraded or was newly identified
- **Plastik cross-linguistic neutrality: 58pp spread** (DE 33% vs EN 72% vs FR 13%) — the single largest quality gap. Not new (likely existed before), but now measured and documented.
- **SRG SSR classification instability:** 33pp within-input spread, classification oscillates
- **Hydrogen tangential claim outlier:** 1/8 runs inflated by tangential energy-density claim (58% vs mean 22%)

---

## 7. EVD-1 Assessment (Updated)

| Family | Class | Latest Spread | Band | New Issues |
|--------|-------|-------------|------|-----------|
| Flat Earth | A | 0-2pp | GREEN | None |
| Round Earth | A | 6-7pp | AMBER | Stable |
| Hydrogen | B | 12pp (same lang) | GREEN | 1 tangential-claim outlier |
| Plastik DE | C | 22-35pp | GREEN/AMBER | Within-language stable |
| Plastik EN | C | 32pp | AMBER | Higher than DE |
| **Plastik cross-lang** | **—** | **58pp** | **NOT COVERED by EVD-1** | **CRITICAL** |
| Muslims | D | 16-21pp | GREEN | Stable post-QLT-3 |
| Bolsonaro | E | 6-19pp | GREEN | Stable |
| SRG SSR | C/D | 33pp | AMBER/RED | Classification instability |
| Homeopathy | C | 12pp | GREEN | Correct inversion |

### EVD-1 Gap: Cross-linguistic neutrality

EVD-1 defines thresholds for within-language, same-input runs. It does NOT address cross-linguistic neutrality (same semantic claim in different languages). The 58pp Plastik spread is the largest quality gap but falls outside the current policy framework.

**Recommendation:** EVD-1 needs a cross-linguistic threshold. Suggested: same claim in different languages should produce verdicts within 25pp of each other (Class C) or the same verdict direction. This is a policy decision for the Captain.

---

## 8. Recommendations

1. **Cross-linguistic neutrality:** Add EVD-1 cross-language thresholds. The 58pp Plastik spread is decision-grade evidence that the system treats semantically identical claims differently based on language. This is likely driven by Stage 2 evidence language bias, not Stage 1.

2. **SRG SSR stabilization:** Classification oscillation (ambiguous vs single_atomic) drives the 33pp spread. This family would benefit from the approved Flat-Earth false-ambiguity fix (prompt-level classification tightening).

3. **Hydrogen tangential claim:** The `a0c5e51e` outlier (58% vs mean 22%) was caused by a factually-correct-but-tangential claim about energy density. Contract validation should catch "technically correct but not what the user asked about" claims.

4. **Monitor Homeopathy confidence:** The `b5f29c58` job showed a confidence anomaly (75.8/24) from a direction-integrity downgrade. Post-citation-carriage fix, this should be remeasured.

---

*Based on 100 jobs across 12 input families, 8 code/prompt change waves, March 25–30 2026. All data from local API inspection.*
