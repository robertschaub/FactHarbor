# Consolidated Job Quality Investigation: f1a372bf to HEAD

**Date:** 2026-04-07 (consolidated 2026-04-08)
**Sources:** Primary investigation (Senior Developer, Claude Code Opus 4.6) + adversarial cross-review (Lead Architect, GPT-5) + Captain corrections
**Baseline:** `f1a372bf7d9e69cfe220953cbfc5e5aa8193d651` (docs-only commit; current deployed label)
**HEAD:** `442a5450fa3e5e99af0d894fc557ca2608ae6048` (Phase B)

---

## Executive Summary

### Scope

- **Strict post-baseline range:** 21 local jobs on 3 runtime builds + 9 deployed jobs on current live build
- **Pre-baseline context:** 18 additional local jobs and 65 additional deployed jobs inform historical variance but are not direct post-baseline causal evidence
- **Runtime-affecting commits:** `62e97e0d` (Phase A-1), `b130d00c` (telemetry), `442a5450` (Phase B)
- `f1a372bf` itself is docs-only — it is the deployed label, not a runtime change

### Top findings

1. **Bundesrat treaty family is the strongest proven blocker** — three distinct failure modes on the same input, same deployed build, producing a 70pp verdict spread (MF 16 to TRUE 86). This is proposition anchoring failure, not Stage 3 or retrieval variance.

2. **Phase B (`442a5450`) is validated** — fixes the seeded-evidence sufficiency interaction. Bolsonaro EN hit MOSTLY-TRUE 74/68 (best local result). All claims now receive ≥1 researched iteration.

3. **Boundary concentration is a real amplifier but not the primary root cause** — it affects Plastik and Bolsonaro when evidence volume is high, but the Bundesrat failures demonstrate that proposition handling is more central.

4. **Plastik DE is high-variance in both environments** — deployed `2cf4682c` (LT 62) is factually worse than local runs (LF/MF 28-53). This is not a clean deployed truth anchor.

5. **Phase A-1 (`62e97e0d`) shows no proven effect** — Swiss UNVERIFIED collapses were fetch scarcity. A-1 remains provisional.

---

## The Bundesrat Treaty Family: Three Failure Modes

This is the highest-severity finding. All jobs are on deployed `f1a372bf`, same or near-identical input.

### Failure Mode 1: Stage 1 Keyword Omission (`094e88fc`)

**Input:** "Der Bundesrat unterschreibt den EU-Vertrag **rechtskräftig** bevor Volk und Parlament darüber entschieden haben"

Stage 1 extracted 2 chronological claims but **dropped "rechtskräftig" entirely**. Both atomic claims are trivially true (the Bundesrat did sign before Parliament decided). The core assertion — that the signing was legally binding — goes unverified.

**Verdict:** TRUE 86/79 — factually misleading because the defining word was never checked.

### Failure Mode 2: Stage 5 Aggregation Underweighting (`0afb2d88`)

**Same input.** Stage 1 correctly extracted 3 claims including AC_03 ("rechtskräftig und bindend" → LEANING-FALSE 30/68). But trivially-true AC_01 (82) + AC_02 (85) outweigh AC_03 in the aggregation. The headline acknowledges "die Darstellung der rechtlichen Bindungswirkung ist irreführend" but `adjustedTruthPercentage: 70` does not reflect it.

**Verdict:** LEANING-TRUE 70/82 — the core assertion is false but buried under prerequisite claims.

### Failure Mode 3: Stage 1 Interpretation Injection (`b843fe70`)

**Input:** "Der Bundesrat hat den EU-Vertrag unterschrieben bevor Volk und Parlament darüber entschieden haben" (no "rechtskräftig")

Stage 1 invented AC_03: "Die Unterzeichnung verstößt gegen die verfassungsrechtliche Ordnung" — a constitutional violation claim not present in the input. This is the pipeline's own inference, not an extracted assertion. It then found this false, dragging the verdict down.

**Verdict:** MOSTLY-FALSE 16/68 — too low because the chronological facts are true.

### The spread

| Job | Failure mode | Layer | Verdict |
|---|---|---|---|
| `094e88fc` | Keyword omission | Stage 1 | TRUE 86 |
| `0afb2d88` | Correct extraction, aggregation underweighting | Stage 5 | LT 70 |
| `b843fe70` | Interpretation injection | Stage 1 | MF 16 |
| `50e2e167` | No "rechtskräftig" dimension, chronology only | Stage 1 | TRUE 89 |

**70pp spread on the same build.** Only `0afb2d88` decomposed correctly, but even that failed at aggregation.

### Root diagnosis: proposition anchoring failure

The system sometimes drops, invents, or misweights the proposition that actually determines a claim's truth value. This manifests at two layers:
- **Stage 1:** predicate preservation failure + interpretation injection
- **Stage 5:** core-assertion underweighting when trivially-true sub-claims dominate

---

## Phase B Validation

### Confirmed working

| Check | Result |
|---|---|
| Plastik AC_01 (was 41 seeded / 0 researched) | Now 33 seeded / 1 iter / **33 items admitted** |
| Bolsonaro EN | MOSTLY-TRUE 74/68 — best local result, matches deployed |
| All claims ≥1 researched iteration | **Yes** across all 4 families |
| Zero-yield forced iterations | **None** — all forced iterations were productive |

### Concentration amplification

Phase B increases evidence volume, which amplifies Stage 3 concentration on vulnerable families:
- Plastik: 87→135 items, 1 boundary (share=1.00)
- Bolsonaro: 92→105 items, max share 0.82

This is a pre-existing Stage 3 problem amplified by more evidence, not caused by Phase B.

---

## Same-Input Comparison Matrix

### Plastik DE

| Environment | Build | Job | Verdict | Truth | Evidence | Max share |
|---|---|---|---|---|---|---|
| Deployed | `f1a372bf` | `2cf4682c` | LT | 62 | 78 | 0.47 |
| Deployed | `b7783872` | `80bbcc3d` | LF | 41 | 90 | 0.46 |
| Deployed | `521040e9` | `9a12f07e` | M | 51 | 90 | 0.90 |
| Local | `442a5450` | `041c63ab` | MF | 28 | 135 | 1.00 |
| Local | `b130d00c` | `c731c5b2` | LF | 41 | 87 | 0.68 |
| Local | `62e97e0d` | `705b6c17` | LF | 39 | 97 | 0.81 |

**Deployed `2cf4682c` (LT 62) is factually worse than local runs.** OECD and EEA treat "Plastik recycling bringt nichts" as closer to false/mixed than leaning-true. Deployed history itself varies from LF 29 to LT 62 — it is not a stable anchor.

### Bolsonaro EN

| Environment | Build | Job | Verdict | Truth | AC_02 items |
|---|---|---|---|---|---|
| Deployed | `b7783872` | `eb02cd2e` | MT | 73 | ~21 |
| Local | `442a5450` | `8f07c9de` | **MT** | **74** | 20 |
| Local | `b130d00c` | `ee5df495` | LT | 70 | 17 |

**Local Phase B now matches deployed.** This is the strongest Phase B success signal.

### Swiss FC DE

| Environment | Build | Job | Verdict | Truth | Conf | Evidence |
|---|---|---|---|---|---|---|
| Deployed | `f1a372bf` | `8ec68105` | LT | 60 | 52 | 38 |
| Local | `442a5450` | `00865fd1` | LT | 63 | 76 | 26 |
| Local | `62e97e0d` | `f36dd064` | UV | 50 | 0 | 5 |

Swiss is thin-evidence and volatile. The A-1 UNVERIFIED was fetch scarcity. Phase B gives the highest confidence (76%).

---

## Issue Catalog (Consolidated Ranking)

| Rank | Issue | Scope | Severity | Primary evidence |
|---|---|---|---|---|
| 1 | **Proposition anchoring failure** (Bundesrat family) | Shared | **Blocker** | 70pp spread, 3 failure modes, same build |
| 2 | **Stage 1 predicate preservation / anti-inference** | Shared | High | `094e88fc` omission, `b843fe70` injection |
| 3 | **Stage 5 core-assertion underweighting** | Deployed-proven | High | `0afb2d88` — correct decomposition, wrong aggregate |
| 4 | **Cross-environment evidence composition variance** | Shared | High | Plastik 34pp gap, Bundesrat 80pp gap |
| 5 | **Stage 3 boundary concentration amplification** | Shared (local-extreme on Phase B) | Medium-High | Plastik 1.00, Bolsonaro 0.82 |
| 6 | **Seeded-evidence sufficiency interaction** (pre-Phase B) | Fixed by Phase B | Medium | Plastik AC_01 41 seeded / 0 researched |
| 7 | **Swiss evidence scarcity / fetch volatility** | Shared | Medium-Low | 5-38 items, UNVERIFIED collapses |
| 8 | **Grounding / challenge warning noise** | Shared | Medium-Low | ~65% of all jobs, info-severity |

---

## Commit-to-Issue Attribution

| Commit | Intended change | Judgment | Confidence | Key evidence |
|---|---|---|---|---|
| `62e97e0d` | Phase A-1: evidence summary in query gen | No proven effect | Not attributable | Swiss collapses = scarcity; other families within variance |
| `b130d00c` | Phase A-2: telemetry | No runtime change | Supported | Ledger appears, no quality delta |
| `442a5450` | Phase B: per-claim researched-iteration floor | **Fixes sufficiency gap** | Likely causation | Plastik AC_01 33 items from forced iteration; Bolsonaro MT 74 |
| `442a5450` | Amplifies concentration | Likely causation | Supported | Plastik 1.00, Bolsonaro 0.82 on Phase B |
| `f1a372bf` deployed | Contains Stage 1 proposition failures | Supported | 3 deployed Bundesrat jobs demonstrate all 3 modes |

---

## Recommended Next Fixes (Priority Order)

1. **Stage 1 predicate preservation + anti-inference** — prevent keyword omission ("rechtskräftig" dropped) and interpretation injection ("verfassungsrechtliche Ordnung" invented). Prompt fix in CLAIM_EXTRACTION_PASS2.

2. **Stage 4 explicit-proposition truth anchoring** — constrain Stage 4 from penalizing claims for omitted nuance unless that nuance is part of the extracted AtomicClaim. The system should not mark a true extracted claim false because the overall sentence "feels misleading."

3. **Stage 5 core-assertion weighting** — when one claim contains the predicate that determines truth, trivially-true prerequisite claims must not bury it. Strengthen VERDICT_NARRATIVE adjudication.

4. **Phase C: Stage 3 boundary concentration stabilization** — targeted, not as the master explanation.

5. **Keep Phase B. Do not revert.**

6. **Run dedicated Bundesrat same-build repeat canary** — this is the clearest blocker-class instability.

---

## Source Documents

| Document | Role |
|---|---|
| `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md` | Primary investigation (Claude) |
| `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md` | Adversarial cross-review (GPT) |
| `Docs/WIP/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md` | Phase B canary data |
| `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md` | Phase A-2 canary data |
| `Docs/WIP/2026-04-06_UPQ1_Consolidated_Architecture_Review.md` | UPQ-1 architecture review |
| `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md` | UPQ-1 original proposal |

---

## Corrections Applied

| Original claim | Correction | Source |
|---|---|---|
| "39 local + 74 deployed from baseline" | Strict post-baseline: 21 local + 9 deployed | Cross-review |
| "Plastik = environmental variance, not code" | Deployed `2cf4682c` (LT 62) is factually worse than local runs — not a neutral delta | Cross-review |
| "Stage 3 is the dominant bottleneck" | Important amplifier, but proposition anchoring is more central | Cross-review |
| "Hidden jobs need separate tracking" | No — all deployed jobs are equal in development | Captain |
| "Bundesrat failures are mainly one phenomenon" | Three distinct sub-failures at two layers | Cross-review + investigation |
