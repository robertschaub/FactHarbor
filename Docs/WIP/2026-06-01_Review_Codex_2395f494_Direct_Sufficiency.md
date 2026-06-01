# Independent Review — Codex `2395f494` "Align research sufficiency with direct citation publishability"

**Reviewer:** Lead Architect (Claude) · **Date:** 2026-06-01 · **Method:** 3 independent grounded reviewers (correctness / regression / bolsonaro-attribution+§99) + my own primary-source reconciliation. Read-only; no jobs.

## Verdict: **REFINE before building on it** — sound in principle, did NOT cause the bolsonaro failure, but has one severe-under-load regression, a mixed-job imprecision, and thin validation.

## What's good (correctness — confirmed)
The core principle is correctly + consistently implemented: stop silently defaulting unclassified/failed applicability to `"direct"`; make D5 sufficiency (`isPublishableDirectionalEvidence`) and Stage-4 citation (`isDirectForCitation`) agree that *assessed-but-unclassified* = non-direct. **AGENTS-compliant** (classification stays LLM-driven; the new code is deterministic policy on the LLM's label + boolean, no semantic adjudication). On the happy path (classifier ran, per-item), D5 and Stage-4 are consistent; the schema change `.catch("direct")`→`.optional().catch(undefined)` correctly stops the code inventing a "direct" label.

## The bolsonaro result is NOT a regression from this change (airtight)
`40aa29ed` (UNVERIFIED 44/43) is the **pre-existing §99 problem**, not caused by `2395f494`:
- The change can only **demote** items (direct→non-direct), never promote — structurally incapable of *adding* contradiction weight to AC_03.
- The 4 AC_03 contradicting items (Bolsonaro's lawyers' own appeal allegations — EV_031/033/038/039) were already explicit `applicability:"direct"` → identical under old & new logic. Direction repair pulled AC_03 50→25 (`MOSTLY-FALSE`).
- The diff touches **no** verdict-direction logic (grep of the diff: no `truthPercentage`/advocate/reconciler/label assignment).
- **One job attributes nothing:** same-input bolsonaro re-runs swing UNVERIFIED 44 / MIXED 45–55 / LEANING-TRUE 59–71; **three jobs on the *same commit* `074fa27` produced LT-65, LT-71, and UNVERIFIED-50/24** (21-pt swing + label flip on identical code — the Jaccard 0.10–0.29 drift regime). Confidence stayed 43 (a sufficiency-gate regression would have moved confidence; it didn't). The cited comparator `aedb3a05` is not in the DB (the 64→44 drop is unverified).

## Severe finding (REFINE #1): degraded-path fail-open → fail-closed inversion, job-wide, NOT geo-gated
On **total** applicability-classifier failure — LLM error (`research-extraction-stage.ts:636`) or prompt-section missing (`:525`) — every item is returned `applicabilityAssessed:true` with no `applicability`. Through `isDirectForCitation` (`verdict-stage.ts:1933-1938`) that is **non-direct for ALL items**. Verified consumption: `getHardCitationIntegrityIssues` → `hasStructuralCitationIntegrity` (`:1923-1924`) is a **hard** gate → structural-integrity failure → UNVERIFIED/downgrade. This Stage-4 path is **not** gated on `relevantGeographies` (unlike D5), so it hits geo AND non-geo claims. **Pre-change this was fail-open** (no `applicability` → treated as citation-eligible). So a transient classifier failure (the documented 467 Fix3 timeouts on a concurrent-load day) now collapses the **whole job** to UNVERIFIED. Bites under load/degradation — invisible on a single clean run.
- **Mitigation:** when `evidence_applicability_assessment_degraded` fires, do NOT require direct applicability and fall back to legacy "missing = direct" — the directness contract should bite only when classification actually **succeeded**, not when infra failed.

## Moderate finding (REFINE #2): global gate vs per-claim sufficiency
`directApplicabilityRequiredForD5` is computed **job-wide** from merged `relevantGeographies` (`claimboundary-pipeline.ts:1183-1186`), but sufficiency is evaluated **per-claim**. In a mixed job (a geo claim + a non-geo plastic/hydrogen claim), the geo claim flips `requireDirect` ON for the non-geo claim too → possible spurious `insufficient_direct_evidence`. **Mitigation:** gate per-claim (`getClaimRelevantGeographies(claim)` inside the loop) or pass `relevantClaimIds` into the applicability prompt.

## Validation is inadequate (REFINE #3)
Focused tests + full `npm test` + build pass, but: **1 live job** (a band fail), 5/6 geo families untested live, and the two newest branches (inline `insufficient_direct_evidence` discrimination; the total-failure degraded path) have **no pipeline test**. Minimum before more is built on it:
1. A test forcing `assessEvidenceApplicability` failure (both exits) asserting the job does **not** mass-UNVERIFIED. (Highest value — guards the §1 inversion.)
2. 6 geo families × ≥3 **isolated/sequential** runs (concurrency triggers the Fix3-timeout → the inversion → confound).
3. ≥1 non-geo control (hydrogen/plastic) to confirm non-geo verdicts didn't regress.

## The real bolsonaro blocker (separate from this change): §99
The applicability axis (`direct`/`contextual`/`foreign_reaction`) answers "topically on-point for the jurisdiction," NOT §99's "independent-probative vs self-serving partisan allegation." A convicted party's own appeal alleging unfairness is topically **direct** to a fairness claim but must NOT count as probative contradiction (`Captain_Quality_Expectations.md:99`). The existing `baseless_challenge_*` mechanism polices the *challenge* layer (CP_* with no valid evidence), so directly-cited real `EvidenceItem`s bypass it. Fix = a **new lever** (evidence stance/source-independence axis, or a verdict-direction rule), not `2395f494`.

## Bottom line
Good direction (closes a real default-to-direct hole), correct on the happy path, and **exonerated** on the bolsonaro result. But ship-gate it on: the degraded-path fallback (#1), per-claim gating (#2), and the isolated multi-family validation (#3). The bolsonaro verdict-fairness failure is a **separate §99 workstream**.
