# Generic Report Quality Signals Scorecard

**Date:** 2026-03-24
**Status:** Active reference
**Purpose:** Provide a reusable, topic-neutral scorecard for evaluating FactHarbor report quality across controls, regression investigations, and repeated-run comparisons.

---

## 1. How To Use This

Use this scorecard together with:

- actual job artifacts (`resultJson`, warnings, coverage matrix, claim lists)
- repeated-run comparisons for identical inputs
- reference-good jobs for the same or similar input family

This scorecard is **not** a replacement for topic judgment. It is a reusable framework for deciding whether a report is structurally sound, analytically plausible, and stable enough to trust.

---

## 2. Hard-Failure Signals

If one of these fails, the report is not "good" regardless of topic.

| ID | Signal | Good | Bad |
|----|--------|------|-----|
| HF-1 | Runtime integrity | No `analysis_generation_failed`, no `llm_provider_error`, no failed status | Runtime/provider failure affected the report |
| HF-2 | No fallback masquerade | Runtime failures are surfaced as such, not disguised as ordinary low-evidence outcomes | Fallback `UNVERIFIED` appears as if it were a normal analytical result |
| HF-3 | Directional correctness on clear controls | Clear controls are not inverted | Obvious controls land in the wrong direction |
| HF-4 | Evidence transparency | Final verdict cites supporting/opposing evidence | Verdict appears without evidence support |

---

## 3. Stage-1 Claim Quality Signals

These are the most important upstream signals when instability is suspected.

| ID | Signal | Good | Bad |
|----|--------|------|-----|
| S1-1 | Claim count stability | Repeated runs produce similar claim counts | Same input swings materially in claim count |
| S1-2 | Facet stability | Repeated runs choose similar core facets/aspects | Different runs decompose the thesis into different aspects |
| S1-3 | Predicate-strength preservation | Strong user predicates remain strong | Strong predicates are softened into weaker claims |
| S1-4 | `claimDirection` correctness | Direction is relative to the user's thesis | Direction is interpreted relative to reality/consensus |
| S1-5 | Specificity and non-duplication | Claims are concrete, non-overlapping, and useful | Claims are vague, duplicative, or overly broad |

---

## 4. Evidence and Boundary Quality Signals

These signals indicate whether the research output is structurally trustworthy.

| ID | Signal | Good | Bad |
|----|--------|------|-----|
| EV-1 | Claim coverage | Important atomic claims have mapped evidence | Major claims have little or no mapped evidence |
| EV-2 | Boundary coverage plausibility | Boundaries with evidence also show meaningful claim coverage in the matrix | Boundary appears populated but matrix row is effectively empty |
| EV-3 | Boundary coherence | Boundary names/facets make sense and match evidence | Boundaries look arbitrary, fragmented, or misleading |
| EV-4 | Relevance / contamination control | Evidence is on-topic and jurisdictionally relevant | Off-topic or foreign-context contamination is visible |
| EV-5 | Source diversity | Multiple plausible source types contribute when the topic warrants it | Report relies on a narrow or implausible source mix |

---

## 5. Verdict Quality Signals

These signals assess whether the final judgment fits the evidence.

| ID | Signal | Good | Bad |
|----|--------|------|-----|
| V-1 | Verdict direction plausibility | Verdict direction matches the evidence balance | Verdict direction contradicts the evidence mix |
| V-2 | Confidence plausibility | Confidence matches evidence quality and stability | Confidence is too high for weak/mixed evidence or too low for strong evidence |
| V-3 | Mixed-case restraint | Mixed/uncertain cases do not become overconfident | Ambiguous cases get overstated certainty |
| V-4 | Strong-case decisiveness | Strongly evidenced cases are allowed to land strongly | Strong cases are artificially flattened or timid |
| V-5 | Sanity-check behavior | Sanity checks fire rarely and only on real inconsistencies | Sanity checks overcorrect or create new distortions |

---

## 6. Stability Signals

These are the main generic regression signals across repeated runs.

| ID | Signal | Good | Bad |
|----|--------|------|-----|
| ST-1 | Truth spread | Small spread across repeated identical runs | Large truth spread on identical input |
| ST-2 | Confidence spread | Confidence remains in a plausible band | Confidence swings wildly without obvious reason |
| ST-3 | Claim-set similarity | Repeated runs produce similar claims | Claim wording, count, or direction drift materially |
| ST-4 | Evidence-mix similarity | Evidence mix differs modestly but remains directionally consistent | Evidence mix diverges enough to flip or distort outcomes |

**Working rule of thumb:**

- controls should show very small spread
- complex mixed inputs may tolerate moderate spread
- large spread on identical reruns is a real quality smell

---

## 7. Presentation and Trust Signals

These do not define the analytical core, but they strongly affect usability and trust.

| ID | Signal | Good | Bad |
|----|--------|------|-----|
| PT-1 | Warning honesty | Warnings reflect real impact and are not misleading | Runtime failures are presented like ordinary evidence scarcity |
| PT-2 | UI consistency | Jobs list and detail page tell a coherent story | Verdict/progress/status are visibly inconsistent |
| PT-3 | Report substance | Report is substantial enough to inspect and audit | Output is shallow, thin, or lacks explanatory value |

---

## 8. Compact Review Rubric

For fast review, score these eight dimensions:

1. Runtime clean
2. Claim extraction faithful
3. Predicate strength preserved
4. Evidence mapped correctly
5. Boundary coverage plausible
6. Verdict direction plausible
7. Confidence plausible
8. Repeat-run stability acceptable

If one of the first two fails badly, do not treat the report as good even if later stages look polished.

---

## 9. Current Reference-Good Anchors (2026-03-24)

These are current useful comparison anchors, not eternal gold standards.

| Input family | Job id | Why it matters |
|-------------|--------|----------------|
| Plastik DE | `c5fb0cb5e5ab48d4b85a235ac0fb4c8d` | Captain judged verdict/confidence, atomic claims, and boundary coverage as good |
| Hydrogen | `ee0890afc7a84a4db108895808e4ea36` | Good non-trivial technical/policy report with plausible verdict and mapping |
| Round Earth | `b5f4c878075e46019b5982ae95ebee51` | Good clean control run |
| Bolsonaro | `2b4cd8d75b69414598c2a99a34a60b6f` | Reasonable complex legal/political comparator |

Use these anchors to compare weaker runs in the same family:

- claim count
- chosen facets
- predicate strength
- evidence coverage
- verdict/confidence plausibility

---

## 10. Practical Review Use

When assessing a repeated-input family:

1. eliminate infrastructure-failure runs
2. identify the best run
3. compare weaker runs against the best run using the signals above
4. decide whether the main problem is:
   - Stage 1 claim formation
   - Stage 2 evidence acquisition/allocation
   - Stage 4/5 verdict and aggregation
   - or presentation/runtime only

This scorecard is meant to improve decision quality around:

- keep / modify / revert judgments
- next-investigation prioritization
- validation-gate closure decisions
