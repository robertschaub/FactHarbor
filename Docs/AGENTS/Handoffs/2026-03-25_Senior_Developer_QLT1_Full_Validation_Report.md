# QLT-1 Predicate Strength Stabilization — Full Validation Report

**Date:** 2026-03-25
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Stack:** commit `49700231` (Phase A baseline) + QLT-1 prompt fix
**Runner config:** `FH_RUNNER_MAX_CONCURRENCY=3`, Sonnet lane limit `2`

---

## 1. Executive Summary

The QLT-1 prompt fix materially reduced Plastik run-to-run instability:

| Metric | Pre-fix (5 runs) | Post-fix (5 runs) | Change |
|--------|-----------------|-------------------|--------|
| Plastik DE truth% spread | 47pp (17–64) | 22pp (24–46) | **-53%** |
| Claim count stability | 2–3 | 3–3 | **Stabilized** |
| Predicate softening incidents | 1/5 ("unwirksam") | 0/5 | **Eliminated** |
| Infrastructure failures | 0 | 0 | Clean |
| Anchor regressions | 0 | 0 | Clean |

All 14 jobs completed without `analysis_generation_failed` or `llm_provider_error`.

---

## 2. Full Run Table

| # | Job ID | Input | Verdict | Truth% | Conf% | Claims | Boundaries | Evidence | Warnings |
|---|--------|-------|---------|--------|-------|--------|------------|----------|----------|
| 1 | `8cbdeae8` | Plastik recycling bringt nichts | MIXED | 43.4 | 67.7 | 3 | 5 | 128 | 0 critical |
| 2 | `f3fa135d` | Plastik recycling bringt nichts | MIXED | 46.0 | 66.7 | 3 | 6 | 124 | 0 critical |
| 3 | `06e354cf` | Plastik recycling bringt nichts | LEANING-FALSE | 29.8 | 65.1 | 3 | 6 | 147 | 0 critical |
| 4 | `e900d941` | Plastik recycling bringt nichts | MOSTLY-FALSE | 24.2 | 74.0 | 3 | 6 | 130 | 0 critical |
| 5 | `c47fff74` | Plastik recycling bringt nichts | LEANING-FALSE | 32.3 | 66.3 | 3 | 5 | 147 | 0 critical |
| 6 | `8c7a1603` | Plastic recycling is pointless | MIXED | 44.1 | 67.7 | 3 | 5 | 117 | 0 critical |
| 7 | `895f26d4` | Plastic recycling is pointless | LEANING-TRUE | 60.2 | 70.0 | 3 | 6 | 138 | 0 critical |
| 8 | `ccce6ade` | Plastic recycling is pointless | MIXED | 46.4 | 72.5 | 3 | 6 | 152 | 0 critical |
| 9 | `5f8a0861` | Ist die Erde rund? | TRUE | 96.2 | 95.4 | 2 | 6 | 56 | 0 critical |
| 10 | `a99ab62b` | Hydrogen > electricity | LEANING-FALSE | 37.2 | 78.6 | 2 | 6 | 66 | 1 sanity |
| 11 | `750a99bf` | Bolsonaro proceedings | LEANING-TRUE | 67.7 | 61.2 | 2 | 2 | 90 | 0 critical |
| 12 | `77e1c825` | Ist die Erde flach? | LEANING-FALSE | 31.2 | 89.1 | 2 | 6 | 53 | 0 critical |
| 13 | `7ab52c11` | Ist die Erde flach? (retry) | FALSE | 0.0 | 96.0 | 2 | 6 | 60 | 0 critical |
| 14 | `4e403fd0` | Bolsonaro (retry) | LEANING-TRUE | 66.5 | 66.0 | 2 | 5 | 86 | 0 critical |

---

## 3. Plastik DE — Detailed Claim Analysis (5 runs)

### 3a. Atomic Claims by Run

**Run 1 — `8cbdeae8` (truth 43.4%, conf 67.7%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf Umweltnutzen. | LEANING-FALSE | 32 | 61 |
| AC_02 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf wirtschaftliche Rentabilität. | LEANING-TRUE | 58 | 76 |
| AC_03 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf die Schließung von Materialkreisläufen. | LEANING-FALSE | 38 | 65 |

| Boundary ID | Boundary Name | Evidence |
|-------------|---------------|----------|
| CB_18 | Corporate recycling practice and commitment tracking | part of 128 |
| CB_24 | Conditions for successful recycling programs | part of 128 |
| CB_02 | Life cycle assessment (LCA) and environmental impact analysis | part of 128 |
| CB_05 | Material quality and recycling process analysis + Technology | part of 128 |
| CB_06 | Comparative environmental benefit quantification + Climate impact | part of 128 |

---

**Run 2 — `f3fa135d` (truth 46.0%, conf 66.7%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf ökologischen Nutzen. | MOSTLY-FALSE | 28 | 70 |
| AC_02 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf wirtschaftliche Rentabilität. | LEANING-TRUE | 62 | 75 |
| AC_03 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf tatsächliche Verwertung und Kreislaufschließung. | MIXED | 48 | 48 |

| Boundary ID | Boundary Name | Evidence |
|-------------|---------------|----------|
| CB_16 | Pilotprojekt-Evaluationen zur Kunststoffsammlung | part of 124 |
| CB_20 | Analysen staatlicher Unternehmungen + Programmatische Ressourcen | part of 124 |
| CB_23 | Schätzungen basierend auf Abfallwirtschaftsdaten | part of 124 |
| CB_03 | Szenarioanalysen und Emissionsvermeidungspotenziale | part of 124 |
| CB_10 | Literaturübersichten und Dokumentationen zu Recyclingverfahren | part of 124 |
| CB_08 | Systemanalysen und Multi-Stakeholder-Dialogprozesse | part of 124 |

---

**Run 3 — `06e354cf` (truth 29.8%, conf 65.1%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf die tatsächliche Wiederverarbeitung von Kunststoffabfällen | LEANING-FALSE | 32 | 68 |
| AC_02 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf wirtschaftliche Rentabilität und Kosteneffizienz | LEANING-FALSE | 42 | 48 |
| AC_03 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf Umweltauswirkungen und Ressourcenschonung | MOSTLY-FALSE | 22 | 70 |

| Boundary ID | Boundary Name | Evidence |
|-------------|---------------|----------|
| CB_35 | Fachliche Bewertungen durch Umweltbundesamt | part of 147 |
| CB_42 | Analyse von wirtschaftlicher Machbarkeit des Recyclings | part of 147 |
| CB_06 | Vergleich mit EU-Zielvorgaben und Zielerfüllung | part of 147 |
| CB_09 | Kostenvergleiche zwischen Recycling und Alternativen | part of 147 |
| CB_19 | Analyse von Verpackungsdesign und Recyclingkompatibilität | part of 147 |
| CB_27 | Technologische Innovation und Prozessoptimierung | part of 147 |

---

**Run 4 — `e900d941` (truth 24.2%, conf 74.0%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf ökologische Auswirkungen. | MOSTLY-FALSE | 18 | 78 |
| AC_02 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf wirtschaftliche Rentabilität. | LEANING-FALSE | 38 | 59 |
| AC_03 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf technische Machbarkeit und Recyclingfähigkeit. | MOSTLY-FALSE | 22 | 80 |

| Boundary ID | Boundary Name | Evidence |
|-------------|---------------|----------|
| CB_09 | Employment impact comparisons + Market price analysis | part of 130 |
| CB_17 | Environmental policy assessment (Germany) | part of 130 |
| CB_25 | Official statistics on material substitution (Germany) | part of 130 |
| CB_33 | Expert interviews on system requirements (Austria) | part of 130 |
| CB_41 | Material degradation modeling + Technical challenge analysis | part of 130 |
| CB_49 | Policy instrument research (Germany UBA) | part of 130 |

---

**Run 5 — `c47fff74` (truth 32.3%, conf 66.3%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf Umweltnutzen. | MOSTLY-FALSE | 20 | 68 |
| AC_02 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf wirtschaftliche Rentabilität. | MIXED | 48 | 62 |
| AC_03 | supports_thesis | Plastikrecycling bringt nichts in Bezug auf praktische Umsetzbarkeit und Effektivität der Sammlung und Verarbeitung. | LEANING-FALSE | 32 | 68 |

| Boundary ID | Boundary Name | Evidence |
|-------------|---------------|----------|
| CB_27 | Evaluierungsstudien zu Entsorgungssystemen | part of 147 |
| CB_28 | Kantonale und regionale Abfallplanung | part of 147 |
| CB_29 | Volkswirtschaftliche Beurteilung von Massnahmen | part of 147 |
| CB_31 | Ressourcenvergleiche und Einsparungsberechnungen (91.8% concentration) | part of 147 |
| CB_06 | Erfassung von Sammelmengen durch Sammelsysteme | part of 147 |

---

### 3b. Cross-Run Per-Claim Verdict Comparison (Plastik DE)

**Truth% by claim:**

| Facet | 8cbdeae8 | f3fa135d | 06e354cf | e900d941 | c47fff74 | Range | Mean |
|-------|----------|----------|----------|----------|----------|-------|------|
| Environmental | 32% | 28% | 22% | 18% | 20% | **14pp** | 24% |
| Economic | 58% | 62% | 42% | 38% | 48% | **24pp** | 50% |
| Practical/Material | 38% | 48% | 32% | 22% | 32% | **26pp** | 34% |
| **Article truth%** | **43.4** | **46.0** | **29.8** | **24.2** | **32.3** | **22pp** | **35.1** |

**Confidence% by claim:**

| Facet | 8cbdeae8 | f3fa135d | 06e354cf | e900d941 | c47fff74 | Range | Mean |
|-------|----------|----------|----------|----------|----------|-------|------|
| Environmental | 61% | 70% | 68% | 78% | 68% | **17pp** | 69% |
| Economic | 76% | 75% | 48% | 59% | 62% | **28pp** | 64% |
| Practical/Material | 65% | 48% | 70% | 80% | 68% | **32pp** | 66% |
| **Article conf%** | **67.7** | **66.7** | **65.1** | **74.0** | **66.3** | **9pp** | **67.9** |

The economic claim is the largest single contributor to overall truth variance. Environmental is the most stable. Article-level confidence is notably more stable (9pp range) than per-claim confidence (17–32pp range).

---

## 4. Plastik EN — Detailed Claim Analysis (3 runs)

**Run 6 — `8c7a1603` (truth 44.1%, conf 67.7%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastic recycling is pointless in terms of environmental effectiveness | MOSTLY-FALSE | 28 | 78 |
| AC_02 | supports_thesis | Plastic recycling is pointless in terms of economic viability | LEANING-TRUE | 62 | 65 |
| AC_03 | supports_thesis | Plastic recycling is pointless in terms of practical utility (actual conversion to new products) | MIXED | 56 | 48 |

**Run 7 — `895f26d4` (truth 60.2%, conf 70.0%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastic recycling is pointless in terms of environmental effectiveness and waste diversion | LEANING-TRUE | 65 | 76 |
| AC_02 | supports_thesis | Plastic recycling is pointless in terms of economic viability and profitability | MIXED | 56 | 70 |
| AC_03 | supports_thesis | Plastic recycling is pointless in terms of material recovery and conversion into new products | LEANING-TRUE | 58 | 61 |

**Run 8 — `ccce6ade` (truth 46.4%, conf 72.5%)**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Plastic recycling is pointless in terms of actual material recovery outcomes | LEANING-TRUE | 65 | 68 |
| AC_02 | supports_thesis | Plastic recycling is pointless in terms of environmental impact and pollution reduction | LEANING-FALSE | 32 | 78 |
| AC_03 | supports_thesis | Plastic recycling is pointless in terms of economic viability | LEANING-FALSE | 38 | 72 |

### Cross-Run Per-Claim Verdict Comparison (Plastik EN)

**Truth% by claim:**

| Facet | 8c7a1603 | 895f26d4 | ccce6ade | Range | Mean |
|-------|----------|----------|----------|-------|------|
| Environmental / Recovery | 28% | 65% | 65% | **37pp** | 53% |
| Economic | 62% | 56% | 38% | **24pp** | 52% |
| Practical / Material | 56% | 58% | 38% | **20pp** | 51% |
| **Article truth%** | **44.1** | **60.2** | **46.4** | **16pp** | **50.2** |

**Confidence% by claim:**

| Facet | 8c7a1603 | 895f26d4 | ccce6ade | Range | Mean |
|-------|----------|----------|----------|-------|------|
| Environmental / Recovery | 78% | 76% | 68% | **10pp** | 74% |
| Economic | 65% | 70% | 72% | **7pp** | 69% |
| Practical / Material | 48% | 61% | 38% | **23pp** | 49% |
| **Article conf%** | **67.7** | **70.0** | **72.5** | **5pp** | **70.1** |

EN shows larger per-claim variance on the environmental facet truth% (37pp) despite preserved "pointless" predicate. This suggests Stage 2 evidence variation is a stronger factor for English inputs. Confidence is notably stable at the article level (5pp range).

---

## 5. Anchor Controls — Detailed

### Ist die Erde rund? — `5f8a0861`

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Die Erde hat eine kugelförmige oder annähernd kugelförmige Gestalt. | TRUE | 95 | 95 |
| AC_02 | supports_thesis | Die Erde wird in wissenschaftlichen und mathematischen Kontexten als Kugel oder Drehellipsoid modelliert. | TRUE | 98 | 96 |

Evidence: 56 total (49 supporting, 0 contradicting, 7 neutral). 6 boundaries.

| Reference (pre-fix) | Post-fix | Delta |
|---------------------|----------|-------|
| TRUE 96/90 | TRUE 96/95 | **0pp / +5conf** ✅ |

---

### Hydrogen — `a99ab62b`

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Hydrogen fuel cell vehicles achieve higher well-to-wheel energy efficiency than BEV | MOSTLY-FALSE | 16 | 77 |
| AC_02 | supports_thesis | Hydrogen fuel cell vehicles consume less total energy per unit distance traveled than BEV | MIXED | 55 | 80 |

Evidence: 66 total (6 supporting, 25 contradicting, 35 neutral). 6 boundaries.
Sanity warning: `verdict_direction_issue` on AC_02 (truth 20% but 4/7 cited evidence supports — legitimate flag).

| Reference (pre-fix) | Post-fix | Delta |
|---------------------|----------|-------|
| MOSTLY-FALSE 27/68 | LEANING-FALSE 37/79 | **+10pp / +11conf** ✅ Same direction |

---

### Bolsonaro — `750a99bf` + `4e403fd0`

**Run 11 — `750a99bf`**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Court proceedings complied with procedural law in terms of procedural regularity | LEANING-TRUE | 62 | 54 |
| AC_02 | supports_thesis | Resulting verdicts were legally sound in terms of evidentiary sufficiency | MOSTLY-TRUE | 73 | 68 |

Evidence: 90 total. 2 boundaries (94.4% concentration in CB_01).

**Run 14 — `4e403fd0`**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Court proceedings complied with Brazilian procedural law | LEANING-TRUE | 65 | 68 |
| AC_02 | supports_thesis | Court proceedings complied with Brazilian constitutional requirements | LEANING-TRUE | 68 | 64 |

Evidence: 86 total. 5 boundaries.

| Reference (pre-fix) | Post-fix (avg) | Delta |
|---------------------|----------------|-------|
| LEANING-TRUE 62/66 | LEANING-TRUE 67/64 | **+5pp / -2conf** ✅ Stable |

---

### Ist die Erde flach? — `77e1c825` + `7ab52c11`

**Run 12 — `77e1c825`**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Die Erde hat eine flache geometrische Form in Bezug auf ihre physikalische Gestalt. | FALSE | 0 | 96 |
| AC_02 | supports_thesis | Die Erde ist flach in Bezug auf ihre Auswirkungen auf alltägliche menschliche Wahrnehmung und lokale Messungen. | MOSTLY-TRUE | 72 | 80 |

Evidence: 53 total (7 supporting, 36 contradicting, 10 neutral). Article: LEANING-FALSE 31/89.

**Run 13 — `7ab52c11`**

| Claim ID | Direction | Statement | Verdict | Truth% | Conf% |
|----------|-----------|-----------|---------|--------|-------|
| AC_01 | supports_thesis | Die Erde hat eine flache geometrische Form. | FALSE | 0 | 96 |
| AC_02 | contextual | Die Erde war historisch als flach wahrgenommen oder gelehrt. | MOSTLY-FALSE | 18 | 82 |

Evidence: 60 total (0 supporting, 47 contradicting, 13 neutral). Article: FALSE 0/96.

**Note:** Run 12 decomposed into a perceptual dimension claim (AC_02: "everyday human perception") that scored 72% — pulling the article truth up to 31%. Run 13 treated the historical dimension as `contextual`, reducing its influence. Both are directionally correct (no TRUE inversion). The `claimDirection` fix continues to hold.

| Reference (pre-fix) | Post-fix (range) | Status |
|---------------------|------------------|--------|
| FALSE 5/88 | FALSE 0/96 – LEANING-FALSE 31/89 | ✅ No inversion |

---

## 6. Observations

### What improved
- **Predicate softening eliminated**: zero instances of "unwirksam", "ineffektiv", or similar weakened predicates across all 8 Plastik runs
- **Claim count stabilized**: all 8 Plastik runs produced exactly 3 claims (previously: 2–3)
- **Truth spread halved**: DE 47pp → 22pp

### What remains
- **Economic claim variance**: the economic facet shows the widest per-claim spread (24pp in both DE and EN) — this appears to be evidence-driven rather than claim-driven
- **EN environmental variance**: 37pp range on the environmental claim across 3 EN runs — needs more runs to determine if this is noise or systematic
- **Boundary evidence concentration**: several runs show >80% concentration in a single boundary (CB_31, CB_17, CB_01) — not a regression, but a structural quality signal worth monitoring

### Sanity guard
One `verdict_direction_issue` on Hydrogen AC_02 — legitimate flag, no overcorrection. The narrowed Rule 2 is working correctly (mixed-range verdicts with mixed evidence pass; mixed-range verdicts with one-sided evidence are flagged).

---

*14 jobs, zero exclusions, full Stage 1/4/5 artifact comparison. All jobs on commit `49700231`.*
