# Report Quality Opportunity Map

**Date:** 2026-02-22
**Role:** Lead Architect
**Trigger:** Captain question — "Is the bias baseline really a usable baseline and does it make sense to have such a strong focus on it right now?"

---

## 1) Honest Assessment of the Bias Baseline

The bias calibration harness (C10, 10 mirrored pairs, 3 languages) measures **one dimension**: do politically mirrored claims get symmetric truth percentages?

**What it tells us:**
- The pipeline doesn't politically refuse or degrade (C18 = 0/10). Valuable. Clean signal.
- Evidence pool asymmetry dominates (8/10 pairs). This is an evidence quality problem, not a model bias problem.
- French works, English doesn't. This points to the English-language web evidence landscape, not the pipeline.

**What it doesn't tell us:**
- Whether ANY of the truth percentages are **correct**
- Whether the pipeline finds the **right** evidence (completeness)
- Whether the explanations are **useful** to a reader
- Whether the verdicts are **stable** across runs (repeatability)
- Whether the pipeline handles **evaluative vs factual** claims appropriately
- Whether sources are **diverse enough** for robust analysis

**Verdict:** The harness is useful as a regression guard (C18 hard gate, skew diagnostic). But it is not a report quality baseline. It measures consistency, not correctness. The D1-D5 plan treats bias remediation as the primary quality track — it should be ONE track among several.

---

## 2) What "Report Quality" Actually Means

Seven dimensions, mapped against what we currently measure:

| # | Dimension | Currently measured? | Mechanism | Gap |
|---|-----------|-------------------|-----------|-----|
| Q1 | **Evidence completeness** | Partially | `low_evidence_count` warning, `claimSufficiencyThreshold` | No benchmark for "did we find what exists?" |
| Q2 | **Evidence diversity** | Partially | `sourceType` field, `evidence_pool_imbalance` detection | Detection only, no correction, no diversity score |
| Q3 | **Verdict accuracy** | **No** | — | No ground-truth comparison. We don't know if truth% is correct. |
| Q4 | **Verdict stability** | Partially | Self-consistency spread (3 runs, temperature) | C9: temperature variation may miss reasoning bias (AFaCTA shows path-based is better) |
| Q5 | **Explanation quality** | **No** | `verdictNarrative` generated but not evaluated | No human eval, no structural quality check |
| Q6 | **Cross-lingual robustness** | Partially | French/English/German comparison in calibration | Only via bias harness; no dedicated language quality test |
| Q7 | **Appropriate hedging** | Partially | `highHarmMinConfidence` floor, `UNVERIFIED` classification | No thin-evidence gate, no misleadingness detection |

**The D1-D5 plan addresses:** Q2 partially (D5 partitioning + contrarian retrieval), Q7 partially (D5 evidence sufficiency gate). It does not address Q1, Q3, Q4, Q5, Q6.

---

## 3) What the Knowledge Base Already Tells Us

The Executive Summary has 15 prioritized action items. Cross-referencing with D1-D5:

| Exec Summary # | Item | In D1-D5? | In any plan? |
|----------------|------|-----------|-------------|
| 1 | Evidence sufficiency gate | Yes (D5 #1) | Approved |
| 2 | Pro/Con query separation | **No** | Not scheduled |
| 3 | Strong challenger model (Opus) | **No** | Not scheduled |
| 4 | Contrarian search pass | Yes (D5 #3) | Approved |
| 5 | Search strategy > debate architecture | **No** | Not scheduled |
| 6 | Claim verifiability field | **No** | Not scheduled |
| 7 | Multi-advocate parallel verdicts (MORE) | **No** | Not scheduled |
| 8 | Evidence partitioning by source type | Yes (D5 #2) | Approved |
| 9 | Path-based consistency (3 paths) | **No** | Backlog (C9) |
| 10 | Debate-informed re-search | **No** | Not scheduled |
| 11 | Misleadingness flag | **No** | Not scheduled |
| 12 | Mediator question step | **No** | Backlog (C-1 area) |
| 13 | Iterative debate with adaptive stopping | **No** | Backlog (C-1) |
| 14 | User-facing explanation layer | **No** | Not scheduled |
| 15 | Balanced overviews for evaluative claims | **No** | Not scheduled |

**3 of 15 items are scheduled. 6 quick wins exist (#1, #2, #3, #6, #11, #14) — only #1 is in the plan.**

The Global Landscape doc identifies evidence retrieval as the #1 gap (ED2D, Tool-MAD). The Research Ecosystem identifies "search strategy matters more than debate architecture" (L-B, L-I). The Truth Seeking doc confirms: 27.6pp skew reflects reality's epistemic asymmetry — treating it as a bug to fix is a framing error.

---

## 4) Proposal: Quality-First Priority Reorder

### Keep from D1-D5 (no change)

Phase 1 (A-1 through A-3) is correct — cross-provider stabilization is a prerequisite for everything. **No change.**

### Reframe Phase 2 (B-sequence)

Currently: B-1 (runtime tracing) → B-3 (knowledge-diversity-lite) → B-2 (A/B memo).

**Proposed expansion:** Fold 5 quick wins into the B-sequence that are orthogonal to B-1/B-3 and can be implemented in parallel. These are LOW effort items from the Executive Summary that improve report quality across multiple dimensions, not just bias:

| New # | Item | Exec # | Effort | Quality dimension | Parallel with |
|-------|------|--------|--------|------------------|--------------|
| B-4 | Pro/Con query separation | #2 | Low | Q1 evidence completeness, Q2 diversity | B-1 |
| B-5 | Strong challenger profile (Opus for challenger) | #3 | Low (config) | Q3 accuracy, Q4 stability | B-1 |
| B-6 | Claim verifiability field in verdict prompt | #6 | Low | Q7 hedging | B-3 |
| B-7 | Misleadingness flag in verdict output | #11 | Low | Q7 hedging | B-3 |
| B-8 | Explanation quality check (LLM self-eval of narrative) | #14 | Low | Q5 explanation quality | B-2 |

**Why these 5:**
- All are LOW effort (config change, prompt addition, or 1 Haiku call)
- None conflict with B-1/B-3/B-2
- Each addresses a quality dimension the D1-D5 plan ignores
- All are measurable in the B-3 A/B run if added before it

**Why NOT the others:**
- #5 (search strategy) is Medium effort and needs design work
- #7 (multi-advocate parallel) restructures the debate → too large for B-sequence
- #9 (path-based consistency) replaces self-consistency mechanism → needs C9 benchmark first
- #10 (debate-informed re-search) needs new search-debate integration → Medium effort, separate track
- #15 (balanced overviews) needs prompt design for evaluative claims → separate design work

### New B-sequence (proposed)

```
Phase 2: QUALITY-FIRST (after A-3 gate)

  B-1   Runtime role tracing                    Lead Dev         (unchanged)
  B-4   Pro/Con query separation                Lead Dev         parallel with B-1
  B-5   Strong challenger profile (Opus)        LLM Expert       parallel with B-1

  B-3   Knowledge-diversity-lite + A/B          LLM Expert + LD  (unchanged)
  B-6   Claim verifiability field               LLM Expert       parallel with B-3
  B-7   Misleadingness flag                     LLM Expert       parallel with B-3

  B-8   Explanation quality self-eval           LLM Expert       parallel with B-2
  B-2   A/B conclusion memo (expanded scope)    Architect        last (unchanged)
```

The A/B conclusion memo (B-2) now covers a broader scope: not just bias skew deltas, but evidence completeness, explanation quality, and appropriate hedging across all B-items.

---

## 5) The Missing Big Item: Verdict Accuracy Benchmark

None of the above addresses Q3 (verdict accuracy). This is the elephant in the room.

**Problem:** We measure whether mirrored claims get the same truth%. We don't measure whether the truth% is **correct** for known-outcome claims.

**Proposal (separate track, not in B-sequence):**

Curate a **Verdict Accuracy Test Set** — 20-30 claims with independently verified outcomes:
- 10 clearly true claims (fact-checked, peer-reviewed) → expected truth% >80
- 10 clearly false claims (debunked, retracted) → expected truth% <20
- 5-10 contested/nuanced claims → expected MIXED or UNVERIFIED + wide range

Sources: Climate Feedback (rated claims), PolitiFact (rated statements), Snopes (rated stories), AFP Fact Check, Full Fact. Select claims where the ground truth is unambiguous and cross-verified.

**Metric:** `verdictAccuracyRate` = % of claims where pipeline verdict category matches ground truth category (TRUE/MOSTLY-TRUE, FALSE/MOSTLY-FALSE, MIXED for contested).

**Effort:** Medium — curation is 1-2 days, running pipeline is automated.

**Why this matters more than bias calibration:** A pipeline that gets bias-symmetric wrong answers is worse than one that gets correct answers with measurable asymmetry. The Truth Seeking doc makes this explicit: "The harness measures symmetric treatment, not correctness of position."

---

## 6) What Happens to D1-D5 Work Already Done

Nothing is wasted. The reframe is:

| D1-D5 item | Status | In new frame |
|------------|--------|-------------|
| A-1 through A-3 | In progress | Unchanged — prerequisite |
| B-1 | Approved | Unchanged |
| B-3 (#1 sufficiency, #2 partitioning, #3 contrarian) | Approved | Unchanged — now complemented by B-4 through B-8 |
| B-2 | Approved | Expanded scope — covers all quality dimensions |
| D3 (Debate V2 backlog) | Approved | Unchanged — still correct |
| D4 (Promotion gates) | Approved | Unchanged |

The bias calibration harness remains a regression guard (C18 hard gate). It just stops being the primary quality measurement tool.

---

## 7) Summary for Captain

### Answer to the question

**Is the bias baseline usable?** Yes — as a C18 regression guard and evidence-quality diagnostic. Not as a report quality baseline.

**Does the current focus make sense?** Partially. Phase 1 (stabilization) is correct. But Phase 2 is too narrow — it treats "reduce political skew" as the primary quality goal when the real quality gaps are evidence completeness, verdict accuracy, explanation quality, and appropriate hedging.

### What I'm proposing

1. **Keep D1-D5 Phase 1 unchanged** (A-1 through A-3)
2. **Expand Phase 2 with 5 quick wins** (B-4 through B-8) that cost almost nothing and cover quality dimensions the current plan ignores
3. **Expand B-2 memo scope** to cover all quality dimensions, not just bias skew
4. **Start a Verdict Accuracy Test Set** as a separate track — the single most important quality measurement we don't have
5. **Stop treating bias calibration as the primary quality metric** — reframe it as one diagnostic among several

### Cost of the expansion

B-4 through B-8 are all LOW effort items (config change, prompt addition, 1 Haiku call). They can be implemented in parallel with B-1 and B-3 by the same owners. The verdict accuracy test set is a separate Medium-effort track that doesn't block anything.

### Risk of NOT doing this

We optimize for bias symmetry while producing reports that may be factually wrong, poorly explained, or missing key evidence. The French-pairs finding (2.0pp skew) shows the pipeline CAN produce balanced results — but we have no idea if those balanced results are CORRECT.

---

## Cross-References

- Executive Summary priorities: `Docs/Knowledge/EXECUTIVE_SUMMARY.md`
- Global landscape (#1 gap = evidence retrieval): `Docs/Knowledge/Global_FactChecking_Landscape_2026.md`
- Epistemic asymmetry (skew is reality, not bug): `Docs/Knowledge/Truth_Seeking.md`
- Research ecosystem (15 learnings): `Docs/Knowledge/Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md`
- Climinator code gap (debate.py empty): `Docs/Knowledge/Climinator_Lessons_for_FactHarbor.md` §3
- D1-D5 Decision Log: `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
- Pipeline quality inventory: 32 warning types, 2 gates, 4-layer confidence calibration in `apps/web/src/lib/analyzer/`
