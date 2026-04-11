---
title: Phase 2 — Per-Input Documented Expectations
date: 2026-04-11
parent: Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md
source: Explore agent extraction across 14 prior quality investigation docs
status: Source material for Rev 4 per-input pass/fail criteria
---

# Per-Input Documented Expectations

Extracted verbatim from prior quality investigations. Basis for replacing the generic "Stage 1 signals" P4/P5/P6 priority criteria with concrete **per-input acceptance criteria**, per the user's 2026-04-11 direction.

---

## R2 — *Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben*

**Documentation strength: HIGH** — 4 explicit job artifacts, 3 distinct failure modes, quantified targets.

### Expected verdict

| Condition | Truth % | Source |
|---|---|---|
| **Correct — modifier fused into primary claim** | **11–31** (LEANING-FALSE / MOSTLY-FALSE) | 2026-04-08 Complete Assessment §2.4; 2026-04-10 LLM Expert Addendum |
| Incorrect — modifier dropped or reified | 68–90 (LEANING-TRUE / TRUE) | same |
| Empirical observed spread | **79pp** (11 vs 90) | 2026-04-08 §2.4 |

### Expected claim structure

- **`rechtskräftig` must appear inside the primary direct atomic claim as adverb/adjective, NOT reified as a separate legal-effect claim** (2026-04-10 LLM Expert Addendum §recommended validation)
- Current fusion rate: ~25%. Target: ≥90%. (2026-04-10 LLM Expert Addendum)
- 2026-04-08 Proposition Anchoring Fix Plan §Fix 1: *"When the input combines chronology or state with a finality, binding, or effect modifier, the primary direct claim must contain both inside one proposition, and the modifier must not be externalized."*

### Known failure modes (three distinct)

1. **Keyword omission** — modifier never appears in any claim. Job `094e88fc` → TRUE 86. Worst outcome.
2. **Modifier reification + Gate 1 strip** — AC_03 extracted as side claim, Gate 1 kills it, contract validator flags `preservesContract: false`, pipeline ships anyway. Jobs `9dab`, `05be66ca`, `11a8f75c` → LEANING-FALSE 32 to LEANING-TRUE 65.
3. **Normative claim injection** — pipeline invents unstated claims about constitutional order. Job `b843fe70` → MF 16. 2026-04-08 Fix 1 anti-inference rule: *"Do NOT extract claims about legality, constitutionality, democratic legitimacy, procedural validity, or normative compliance unless the input TEXT ITSELF explicitly makes that assertion."*

### Per-input acceptance criteria for R2

- **R2.1** — Verdict falls in **11–31 range** (LEANING-FALSE / MOSTLY-FALSE). Violation: verdict ≥50 with modifier not fused.
- **R2.2** — `rechtskräftig` appears **verbatim inside the primary direct claim text**. Violation: modifier absent OR modifier only in a tangential/contextual side claim.
- **R2.3** — `preservesContract === true` in contract validator output. Violation: `preservesContract === false` AND report ships.
- **R2.4** — No atomic claim contains the words *verfassungsrechtlich*, *democratic legitimacy*, *constitutional order*, or any legality-inference not present in the input.

---

## R3 — *Plastic recycling is pointless*

**Documentation strength: MEDIUM-LOW** — aggregate family expectations documented, per-input verdict target not explicitly stated.

### Expected verdict

| Measurement | Observed | Source |
|---|---|---|
| English-variant mean (14 jobs) | ~56% (MOSTLY-TRUE side) | 2026-04-08 Complete Assessment §2.2 |
| EN vs DE cross-lang spread | 58pp (EN higher than DE) | 2026-04-08 §Issue 1 |
| Deployed outlier (known-wrong) | `2cf4682c` LT 62 → *"factually worse"* per OECD/EEA/EPA | 2026-04-08 §2.1 |

**No single target verdict is documented for the EN variant alone**, only the cross-language relationship.

### Expected claim structure

Three atomic claims per 2026-04-05 Bolsonaro-Plastik Investigation:
- AC_01 — ecological benefit
- AC_02 — economic viability
- AC_03 — pollution reduction

Each must be independently researched.

### Known failure modes

- **Per-claim sufficiency bypass**: *"Plastik AC_01: 41 seeded / 0 researched — sufficiency gate tripped before Stage 2 even ran"* (2026-04-08 §Issue 4)
- **Boundary concentration**: *"Plastik Phase B: 1 boundary holds 135 items, share = 1.00"* (2026-04-08 §2.4)
- **English-source criticism bias**: *"English-language searches return more recycling-criticism sources (US/UK media, Greenpeace US)"* (2026-04-08 §Issue 1 root cause)

### Per-input acceptance criteria for R3

- **R3.1** — Verdict in **40–60% range** (MIXED to LEANING-TRUE band). Violation: extreme verdicts <30 or >75 on this evaluative topic.
- **R3.2** — **≥3 atomic claims** covering distinct dimensions of recycling (ecological / economic / pollution). Violation: 1-claim collapse.
- **R3.3** — **No single boundary holds >70% of evidence**. Violation: share ≥0.70 anywhere.
- **R3.4** — **Each claim has `researchedEvidenceCount > 0`**, not seeded-only sufficiency. Violation: `41 seeded / 0 researched`-style degenerate sufficiency.

---

## R3b — *Plastik recycling bringt nichts*

**Documentation strength: MEDIUM** — family statistics well-documented (105 local runs), language-specific ecology characterized.

### Expected verdict

| Measurement | Value | Source |
|---|---|---|
| **Mean truth %** (105 local runs) | **38.8** | 2026-04-08 §2.1 |
| Median truth % | 37.0 | same |
| Range | 15–74 (59pp) | same |
| **Runs in correct direction** (≤50%) | **80%** (84/105) | same |
| **External reality** (OECD, EEA, EPA) | *"closer to FALSE/MIXED. Recycling has measurable benefits but is insufficient alone."* | 2026-04-08 §Issue 6 |

**The DE variant has a documented quantitative target**: mean 38.8, median 37.0, 80% correct direction — *accepted under EVD-1 amber band* as an unstable but directionally-correct family.

### Known failure modes

Same ecology as R3 but mirrored:
- **German-source recycling-support bias**: *"German/French searches return more recycling-support sources (EU/DACH institutional reports, Umweltbundesamt)"* — German evidence is structurally more favorable to recycling, so the DE variant's lower truth% reflects evidence base, not just the claim's negation.

### Per-input acceptance criteria for R3b

- **R3b.1** — Verdict in **30–50% range** (MIXED / LEANING-FALSE). Target mean ~38. Violation: verdict >60 (matches known-wrong deployed outlier pattern).
- **R3b.2** — **Same 3-claim structure as R3** (ecological / economic / pollution). Violation: 1-claim collapse.
- **R3b.3** — **No single boundary holds >70% of evidence** (same as R3.3).
- **R3b.4** — **Each claim has `researchedEvidenceCount > 0`** (same as R3.4).

---

## R4 — *Were the various Bolsonaro trials and convictions fair and based on the rule of law?*

**Documentation strength: HIGH** — 13-run scored scorecard with explicit B1–B7 criteria, cross-referenced by multiple 2026-04 investigations.

### Expected verdict

| Measurement | Value | Source |
|---|---|---|
| **Target truth %** | **68–80% (MOSTLY-TRUE)** | 2026-03-12 Scorecard B4 |
| Expert consensus | *"trials were mostly legally sound with some procedural concerns"* | 2026-03-12 Scorecard B4 rationale |
| Best historical run | `5a2aceff` (Mar 8 PT deployed) — TP=72%, Conf=77%, score 90% | 2026-03-12 Scorecard §7.4 |
| Local best | Phase B `MT 74/68` matching deployed `MT 73/70` | 2026-04-08 §Bolsonaro EN |
| **Required confidence** | **≥65%** | 2026-03-12 Scorecard B6 |

### Expected claim structure

- **≥2 atomic claims distinguishing STF trial (coup, 2024/25) from TSE trial (electoral, 2023)** — per B1
- Best observed (job `0b79`): AC_01 = STF coup, AC_03 = TSE electoral
- Collapsed 1-claim runs fail B1

### Expected boundaries

- **≥3 boundaries named with actual Brazilian institutions** — STF, TSE, PGR, Federal Police — per B3
- Best example: *"Electoral Court 2023"*, *"STF criminal 2025"*, *"STF constitutional 2024"* (job `2a86`)
- Deployed best: *"Julgamento TSE"*, *"Julgamento STF - AP 2668"* (court-specific with case number)
- **Zero boundaries named *"U.S."*, *"State Dept"*, *"Political commentary"*, *"Executive order"*, *"Government press releases"*** — per B7

### Must mention in narrative or evidence

- **27-year sentence** — per B5, key factual element of the case

### Known failure modes

- **Trump/U.S. contamination**: 7 of 13 scorecard runs had at least one foreign-contaminated boundary. 2 of 13 had `verdictAdjusted=true` from U.S. political challenges.
- **STF/TSE collapse vs. foreign-contamination trade-off**: *"Runs with good multi-event decomposition (B1) tend to attract foreign political evidence into boundaries (B7 fail). Runs with clean boundaries (B7 pass) tend to collapse everything into 1 claim (B1 fail)."* — 2026-03-12 Scorecard §failure analysis
- **Retrieval depth variance**: local 3-iter (80 evidence, 34 sources) vs deployed 6-iter (97 evidence, ~55 sources) — local runs tend to underperform deployed on this family.

### Per-input acceptance criteria for R4

- **R4.1** — Verdict in **68–80% range** (MOSTLY-TRUE). Violation: outside 60–85%.
- **R4.2** — **≥2 atomic claims** with distinct subject STF vs TSE (or equivalent distinction between coup trial and electoral trial). Violation: 1 collapsed claim.
- **R4.3** — **≥3 boundaries named with Brazilian institutions** (STF, TSE, PGR, Federal Police, or specific Brazilian court/case references). Violation: <3 or all generic.
- **R4.4** — **Zero boundaries named with U.S./diplomatic terms**. Violation: any boundary containing *U.S.*, *State Dept*, *Executive order*, *Political commentary*, *Government press releases*.
- **R4.5** — **Zero `verdictAdjusted=true` events from U.S. political opinion challenges**. Violation: any such adjustment.
- **R4.6** — **27-year sentence mentioned** in narrative or evidence somewhere. Violation: absent.
- **R4.7** — **Confidence ≥65%**. Violation: confidence <65%.

---

## Documentation gap summary

| Input | Per-input verdict target | Per-input claim structure | Per-input failure modes | Confidence |
|---|---|---|---|---|
| **R2** | ✅ 11–31 correct / 68–90 wrong | ✅ rechtskräftig fused | ✅ 3 distinct modes catalogued | **HIGH** |
| **R3** | ⚠️ Only cross-lang relationship | ⚠️ 3-claim family expected | ⚠️ Language bias only | **MEDIUM-LOW** |
| **R3b** | ✅ mean 38.8 / median 37 / 80% ≤50% | ✅ 3-claim family | ⚠️ Same as R3 | **MEDIUM** |
| **R4** | ✅ 68–80% | ✅ ≥2 claims (STF/TSE) | ✅ B1–B7 catalogued | **HIGH** |

R3 is the weakest-documented input for per-input expectations. The R3 criteria above (R3.1–R3.4) are best-effort syntheses from cross-language evidence and structural expectations, not from a single authoritative source.
