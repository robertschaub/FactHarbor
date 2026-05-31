# Captain Quality Criteria — `Pipeline_V2` vs `main` Reconciliation Diff

- **Date:** 2026-05-31
- **Author role:** Senior Architect
- **Type:** Reconciliation analysis. **SUPERSEDED by the Decision Record below** — the Captain ruled to adopt `Pipeline_V2` in all cases; the four scope files were replaced with their V2 versions in main's working tree (uncommitted).
- **Scope:** `Docs/AGENTS/Captain_Quality_Expectations.md`, `Docs/AGENTS/benchmark-expectations.json`, `Docs/AGENTS/report-quality-expectations.json`, `Docs/ARCHIVE/2026-04-11_Canonical_Quality_Criteria.md`.

---

## 0. Decision Record (2026-05-31)

**Captain ruling:** *"In all cases V2 is the right one."* All four scope files were overwritten on `main`'s working tree with their `Pipeline_V2` versions (`git checkout Pipeline_V2 -- <file>`), uncommitted, pending review.

Adopted as-is:
- bundesrat-simple → **TRUE/MOSTLY-TRUE 85–100**; asylum-235000-de → **LEANING-TRUE/MOSTLY-TRUE 58–75** (MIXED removed); bolsonaro-en/pt → **LEANING-TRUE/MOSTLY-TRUE 58–85** (MIXED removed); asylum-wwii-de → **MOSTLY-FALSE/LEANING-FALSE 18–42** (first band; now scoreable).
- Structural additions (usage guide, comparator tables, MIXED-restraint generic rule, reading-order refs).

**Explicit override of §5 recommendation — plastic-en:** adopted V2's **false-side** band (`FALSE/MOSTLY-FALSE/LEANING-FALSE/MIXED`, 10–42), which **reverts main's newer 2026-05-26 true-side correction** (V2's decision is dated 2026-05-11). This was flagged to the Captain and adopted under the blanket "V2 in all cases" ruling. *Consequence: the plastic family verdict direction flips true→false; any historical-report scoring must use the false-side band from here.*

**Still open (not changed by this ruling):** the stale `Docs/WIP/…` → `Docs/ARCHIVE/…` link to the Canonical doc persists in the adopted V2 Captain MD + `report-quality-expectations.json` `_sourceDocs` (the file lives in ARCHIVE on main). Separate clearly-correct fix; not yet applied.

---

## 1. Provenance facts (so recency arguments are grounded)

- Branches diverged at merge-base `2f7a2805` (2026-04-22). `main` is **+108** commits (tip 2026-05-31); `Pipeline_V2` is **+1070** commits (tip **2026-05-24**). They are **divergent forks**, not ancestor/descendant.
- `Captain_Quality_Expectations.md`: main **"Last updated 2026-04-16"** vs V2 **"Last updated 2026-05-12"**.
- `report-quality-expectations.json`: main `_lastUpdated 2026-04-16` vs V2 `2026-05-11`. **No Q-code structural change** on V2 — only a `_sourceDocs` note recording the 2026-05-09 correction + 2026-05-11 plastic LEANING-FALSE acceptance. *The Q-code catalogue is identical across branches.*
- `Canonical_Quality_Criteria.md`: trivial 1-line link fix only (a source path WIP→ARCHIVE). No criteria change.
- **Caveat that frames everything:** per project memory, **`Pipeline_V2` was dropped.** Its criteria are the most-developed *articulation*, but they belong to an abandoned line. Treat them as *candidate Captain decisions to re-ratify*, not as automatically-live policy.

**Net:** all substantive divergence is in **two files** — the Captain MD and `benchmark-expectations.json`. The Q-code catalogue and Canonical doc are effectively identical.

---

## 2. The headline

V2 carries a **2026-05-09 Captain correction** with one consistent theme: **push families to a decisive true-side and stop accepting `MIXED` as a hedge** — *except plastic, which V2 pushed false-side.*

- For **bundesrat-simple, asylum-235000-de, bolsonaro-en, bolsonaro-pt, asylum-wwii-de**, V2's bands are **newer (05-09) than main's (04-16)** and reflect deliberate Captain reasoning. → **candidates to adopt** (Captain re-ratifies).
- For **plastic-en**, the branches **directly contradict on direction**, and here **main is the newer decision (05-26 true-side) vs V2 (05-11 false-side)**. → **hard conflict; main currently wins on recency + documented evidence rationale** (see §5).
- For **bundesrat-rechtskraftig, hydrogen-en**, bands are **unchanged**; V2 only adds status/comparator notes. → low-risk doc enrichment.

---

## 3. Per-family band reconciliation (authoritative source: `benchmark-expectations.json`)

| Family | `main` band (date) | `Pipeline_V2` band (date) | Newer | Recommendation |
|---|---|---|---|---|
| **bundesrat-rechtskraftig** | MIXED/LT/LF · 35–60 · 55–85 (04-16) | **unchanged** band; status → CONFIRMED-ON-CURRENT-STACK (05-12) | V2 (status only) | **Adopt status/comparator note.** No band change. Low risk. |
| **bundesrat-simple** | MIXED/LT/LF · 35–60 · 55–85 (04-16, "probably-solved", inferred) | **TRUE/MOSTLY-TRUE · 85–100 · 75–95** (05-12) | V2 | **Captain re-ratify, then adopt.** Big move (neutral→high-true) backed by exact canary `1de78d0a` (TRUE 97/93) + comparators `a6b0e0fc`/`a53573…`. Note the canary carried a `budget_exceeded` / 23.7-min timing warning. |
| **asylum-235000-de** | LEANING-TRUE/**MIXED** · 55–75 · 40–70 (04-16) | **LEANING-TRUE/MOSTLY-TRUE · 58–75** · 40–70 (05-12) | V2 | **Adopt** (removes MIXED; true-side). Backed by `bb2133a1` (MOSTLY-TRUE 78/68, direct SEM aggregate). Watch: one prior rerun flipped false-side. |
| **asylum-wwii-de** | **null bands** · UNVERIFIED-ON-CURRENT-STACK (04-16) | **MOSTLY-FALSE/LEANING-FALSE · 18–42 · 50–75 · min 2** (05-12) | V2 | **Adopt** — V2 supplies the **first real band** for a family that is *unscoreable on main*. Backed by exact pair `9e1f0f00` (MF 25/73) + `ce265797` (LF 30/63). High value. |
| **bolsonaro-en** | LEANING-TRUE/**MIXED** · 55–75 · 45–65 (04-16) | **LEANING-TRUE/MOSTLY-TRUE · 58–85 · 45–75** (05-12) | V2 | **Captain re-ratify, then adopt.** Removes MIXED, raises ceiling. Accepted canary `aedb3a05` (LT 64/43) — confidence below band kept as watch debt. |
| **bolsonaro-pt** | LEANING-TRUE/**MIXED** · 50–75 · 40–65 (04-16) | **LEANING-TRUE/MOSTLY-TRUE · 58–85 · 45–75** (05-12) | V2 | **Adopt** (mirror of EN). Adds a useful ACS guardrail: the *"sentenças … foram justas"* clause must survive claim selection. |
| **hydrogen-en** | FALSE/MOSTLY-FALSE · 5–25 · 65–85 (04-16) | **unchanged** band; adds canary `1f838f8b` (FALSE 8/78) | V2 (note only) | **Adopt comparator note.** No band change. |
| **plastic-en** ⚠️ | **MIXED/LEANING-TRUE/MOSTLY-TRUE · 40–75 · 55–85** (**05-26**, true-side) | **FALSE/MOSTLY-FALSE/LEANING-FALSE/MIXED · 10–42 · 55–80** (**05-11**, false-side) | **main** | **CONFLICT — see §5. Default: keep main (newer + evidence rationale). Captain must explicitly rule.** |

`highPriorityReruns` on main (the 2026-04-16 concurrent-collapse reruns) is superseded on V2 by per-family "accepted current canary" entries — adopt alongside the band updates.

---

## 4. Structural / non-band additions on V2 (pure doc value — recommend adopt)

These are not bands; they're articulation improvements with no `main` equivalent:

1. **"How Agents Should Use This File"** section + per-section use/don't-use table + agent checklist. **Adopt** — directly useful for `/report-review` and any agent judging report quality.
2. **"Bolsonaro Comparator Reports"** + **"Best Usable Exact / Family Comparator Reports"** tables — per-family best local/deployed job IDs with explicit "exemplar, not new band / not current-pass proof" guardrails. **Adopt** — high value for regression diagnosis and for the best-commit study (ready-made gold comparators).
3. **New generic expectation:** *"For factually true-side families with legitimate caveats, express the caveats in confidence, boundaries, and reasoning; do not downgrade to MIXED unless evidence-backed contradiction actually defeats the claim."* **Adopt** — this is the principle behind the 05-09 true-side correction; it generalizes cleanly and is topic-neutral.
4. **Reading-order / background additions:** two xWiki Bolsonaro spec pages cited as the origin of the true-side expectation (legal basis ~85%, procedural fairness ~70%). **Adopt as references.**

---

## 5. The plastic conflict — explicit resolution needed

This is the only **direction** contradiction, and it is genuine — not a stale-vs-fresh artifact:

| | `main` | `Pipeline_V2` |
|---|---|---|
| Decision date | **2026-05-26** (newer) | 2026-05-11 |
| Direction | **True-side** (MIXED/LEANING-TRUE/MOSTLY-TRUE, 40–75) | **False-side** (…/LEANING-FALSE/MIXED, 10–42) |
| Stated rationale | English evidence: ~9% global recycling rate, ~51% of "recycled" plastic landfilled/incinerated, mechanical recycling not economically profitable → "pointless" leans **true**. Aligns to Phase 2 R3.1. "Same drift pattern as the bolsonaro-en correction." | Accepts `LEANING-FALSE` as good (canary `939563ec`, LF 37/62); frames plastic as a **control lane**, "not a reliable family for asserting total report-quality stability." |

**Why this matters beyond the band:** both branches **agree** Bolsonaro is true-side, but they **split** on plastic. So this is a real analytical disagreement about whether *"plastic recycling is pointless"* leans true or false — not a clerical drift.

**Recommendation (Captain to confirm):** **Keep `main`'s true-side plastic band.** It is the *more recent* Captain decision (05-26 > 05-11), it carries an explicit documented evidence rationale, and V2 itself only ever treated plastic as a "control lane." Do **not** import V2's false-side plastic band. If the Captain disagrees, this needs a deliberate re-decision recorded with date + rationale, because it inverts the verdict direction.

---

## 6. Stale-link note (present on BOTH branches)

`Captain_Quality_Expectations.md` "Background Sources" and `report-quality-expectations.json` `_sourceDocs` still point to `Docs/WIP/2026-04-11_Canonical_Quality_Criteria.md` and `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and_Plan.md`, but those files were archived to `Docs/ARCHIVE/…` (R100 rename, content identical — **not superseded by a different doc**). V2 fixed *one* such link inside the Canonical doc but not these two. Worth fixing on `main` independently of this reconciliation.

---

## 7. Implication for the best-commit study

The study's "definition of best" must score against **one** band set. The choice is now consequential:

- Adopting V2's **true-side** bands for bolsonaro/asylum and the **new asylum-wwii band** *widens* the scoreable set (asylum-wwii becomes scoreable) and *raises the bar* (MIXED no longer passes bolsonaro/asylum).
- The **plastic** band flips the sign of that family's score depending on which branch wins — so plastic must be resolved (§5) before plastic is used as a discriminating family, or excluded until then.

Recommended: run the study against **main's bands + the §3/§4 V2 adoptions the Captain ratifies**, with **plastic resolved per §5** (default: main true-side).

---

## 8. Decisions for the Captain

1. **Re-ratify the 2026-05-09 true-side correction?** (Removes MIXED for bolsonaro-en/pt + asylum-235000; pushes bundesrat-simple to 85–100.) — *V2 origin; newer than main; needs explicit re-ratification because V2 was dropped.*
2. **Adopt the asylum-wwii first band** (MOSTLY-FALSE/LEANING-FALSE 18–42)? — *gives an otherwise-unscoreable family a band.*
3. **Plastic (§5):** keep main true-side [recommended], or switch to V2 false-side? — *the one direction conflict.*
4. **Adopt the structural additions** (usage guide, comparator tables, the new MIXED-restraint generic rule)? — *low risk, high value.*
5. **Who applies it:** once decided, fold the ratified items into `main`'s `Captain_Quality_Expectations.md` + `benchmark-expectations.json` (this doc does not do that).
