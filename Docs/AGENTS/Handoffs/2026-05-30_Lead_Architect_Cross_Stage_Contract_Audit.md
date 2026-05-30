---
### 2026-05-30 | Lead Architect | Claude Code (Opus 4.8 1M) | Cross-Stage Contract Audit (Hydrogen / EN Bolsonaro / PT Bolsonaro)

**Task:** Per Captain's mandate ("just 'fixing' something without knowing the root cause? … maybe the root cause is also the cause for other issues?"), run a read-only cross-stage contract audit of the three jobs and decide whether they share a single root/fix or are separate. No code/prompt edits, no live jobs. Predecessor handoff: `2026-05-30_Lead_Architect_Cross_Stage_Root_Cause_Debate_Handoff.md`.

**Files touched:** This handoff only (diagnostic; no source/prompt/config changes).

**Evidence base (all primary):** local job traces `job_184f…`, `job_4ba5…`, `job_a8b3…` (all `executedWebGitCommitHash=8061954e`, schema `3.2.0-cb`); `claim-extraction-stage.ts`; `research-orchestrator.ts`; `verdict-stage.ts`; `claimboundary.prompt.md`; `benchmark-expectations.json`; git history; Claude debate R1/R2 + Gemini review (treated as input to verify, per Captain).

---

## BOTTOM LINE — one pattern, not one fix

The Captain's instinct is **half right and decision-useful**: the three failures **rhyme** — each is an instance of the same architectural shape, *an upstream acceptance criterion disagreeing with a stricter downstream/parallel rejection criterion, resolved by deterministic glue code*. That pattern is real and recurs.

But they do **NOT** share one root cause or one fix:

| Case | What it actually is | Stage | Verdict correctness | Fix surface |
|------|--------------------|-------|--------------------|-------------|
| **Hydrogen** | **Flaky Stage-1 contract abort** (live test: 4/5 pass at the *same source* — NOT a stable regression) | Stage 1 contract gate | passes ~80%, in-band `FALSE`/`MOSTLY-FALSE` when it does | **Harden the gate** (drop/repair offending proxy claim vs terminal `report_damaged`) — not a revert/bisect/rule-edit (§1, §6.1) |
| **EN Bolsonaro** | **Standing cross-stage contract debt** | Stage 2 ⊥ Stage 4 | **Correct** (UNVERIFIED is right) | Align Stage-2 sufficiency with Stage-4 publishability (deferred; see §2) |
| **PT Bolsonaro** | **Healthy** | Stage 4 | **Correct** (LEANING-TRUE, 7 direct citations) | **None** — monitor (see §3) |

So: **the pattern is shared; the fixes are two-plus-one-no-op.** The single genuinely shared deliverable is an architectural **principle** (§4), not a patch. **Correction after the live variance test:** the **Hydrogen failure is *flaky*, not a deterministic regression** (4/5 fresh runs pass at the same source) — so its remedy is **not** a revert/bisect but **hardening the Stage-1 gate's terminal-abort response**; the anti-stacking lesson still stands as the §4 principle.

---

## §1 — Hydrogen (`184f0bba…`): a FLAKY Stage-1 contract abort (live-confirmed), not a deterministic regression. Debate's fix is misdirected.

> **⇒ Bottom line (see RESOLVED block at end of §1):** the live variance test settled this — 4/5 fresh runs at the same source pass with in-band verdicts. The "regression in a churned window" framing below is the *investigative arc that led to the test*; it is **superseded** by the empirical RESOLVED finding. The fix is gate-hardening, not a revert/bisect/rule-edit.

**Investigated as a regression (provenance, the Captain's bar):**
- Benchmark `hydrogen-en`: `qualityStatus: SOLVED`, `latestVerifiedJobId: db144edd…`, `latestObserved: FALSE 12/82`, note *"TTW/WTW conflation fixed. Report now correctly exposes distinct full-pathway and tank-to-wheel claims/boundaries."* → **at last-good, the WTW/TTW decomposition was the *solution* and passed contract validation.**
- `latestVerifiedJobId` recorded by commit `9d443900` on **2026-04-16** → last-good ≈ 04-16. Current = `8061954e` (05-30). **The same decomposition went accepted → `report_damaged`. This is a regression, window 04-16 → 05-30.**

**Mechanism (proven from trace + code):**
- Extraction Pass-2 produced AC_01 (WTW), AC_02 (TTW), AC_03 (energy density) — consistent with the *extraction* prompt's own guidance (`claimboundary.prompt.md:257`, `:93`: decompose comparative efficiency into dimension claims, "vary only the dimension qualifier").
- Contract validation: `truthConditionAnchor.preservedInClaimIds=[AC_01,AC_02]` (anchor `"more efficient than"` literally present → **Rule 11 "Verbatim-presence guard (MANDATORY)"**, prompt `:534`, *requires* listing them), while the LLM `summary` judged the dimension qualifiers "**material proxy drift**" (Rule 3, prompt `:503`). The deterministic self-consistency check (`claim-extraction-stage.ts:3361-3393`) treats `{preserved ∩ drifted}` as **self-contradiction** → `anchorOverrideRetry`. `stage1_contract_completion` recovery then **also failed** → `report_damaged`, 0 evidence, 0 boundaries.

**Provenance narrows the culprit — and what is / isn't exonerated (scoped precisely):**
- **Exonerated (unchanged at or before last-good):** the **proxy-drift rules the debate proposed editing** — Rule 2/Rule 3 (lines 497-516) unchanged since `4f7d3850` (03-20); and **Rule 11 verbatim-presence guard** (533-534) unchanged since `9a79bc91` (04-15, pre-window). **So editing Rule 3 (Claude R1/R2 + Gemini's recommended fix) cannot be the regression fix — it targets rules identical to when Hydrogen was `SOLVED`.** This is the clearest sign the prior Hydrogen analysis was off-target.
- **Also exonerated by deeper read-only diffing (Captain-approved (a) narrowing, 2026-05-30):**
  - *Self-consistency check* (`selfContradicted` / `contradictedPreservedIds` / the `proxyDriftSeverity==="material"` trigger) — introduced together at `b5b6ce4e` (04-12), **before** last-good was recorded; present-and-not-firing when Hydrogen passed → not the regression.
  - *Comparison-side validation changes* `25e87e8d` / `2fe4f8eb` (04-20) and `8e87c3e9` (05-30) — they target comparison-**side** bundling (isolating one compared entity vs the other) and process/outcome cohesion, **not dimension decomposition** (same comparison, different measurement frame), which is Hydrogen's structure. They don't explain flagging AC_01/AC_02.
  - *`report_damaged`-on-contract-failure termination* — predates last-good (`f5cf31ee` 04-13); not newly introduced.
  - *`0d97a7a6` completion-recovery* (05-29) — **added a recovery path** (`runContractCompletion`, gated on `preservesContract===false || rePromptRequired`) that runs *when* validation fails; it can only **reduce** `report_damaged`, never cause it. Exonerated.
  - *`a1fa8530`* (04-20) extraction guards — **satisfied** by AC_01/AC_02 (entities stay broad; only the measurement-frame dimension varies), so they do not reject those claims.
- **What this localizes the regression to:** the **contract-validation *acceptance judgment itself* flipped `preservesContract` true→false for the same input** (accepted at last-good `SOLVED FALSE 12/82`; rejected now), with the validator summary judging the WTW/TTW dimension qualifiers "material proxy drift" — on an **unchanged rule basis**. Three causes remain, and **static analysis cannot distinguish them:**
  1. **Extraction now emits different / proxy-ier claims** the validator sees (suspects `f1130e40` / `e7deeb8b` 05-28 coordinated-extraction; `311a0a2c` 04-16) — e.g. AC_03 "energy density" is a genuine non-frame proxy that may tip the "set as a whole" judgment.
  2. **LLM judgment variance** — "is this dimension qualifier neutral (Rule 2) or a proxy (Rule 3)?" is genuinely borderline for WTW/TTW; with alpha temperature + no result caching, it can flip run-to-run. `SOLVED FALSE 12/82` was a **single** run (`db144edd`), never proven deterministic.
  3. **A contract-validation model change** in the window shifting the judgment.
- **Consequence for the next step (changed):** a commit-bisect on `report_damaged` only works if the failure is *deterministic*. If it is variance (cause 2), a bisect chases noise. **So the variance test must come first** (§6.1) — and the debate's "edit Rule 3" fix is now triply wrong: the rules are unchanged, the check/termination are exonerated, and the failure may not even be deterministic.

- **RESOLVED — live variance test (2026-05-30, Captain-approved (a); live runs at HEAD `e04f26ef` = `8061954e` analyzer):** Re-ran the Hydrogen input **4× fresh**. **All 4 passed Stage-1 contract validation (`preservesContract: true`) and produced in-band verdicts** — `FALSE 8/79`, `FALSE 14/71`, `FALSE 9/75`, `MOSTLY-FALSE 15/65` (benchmark band: FALSE/MOSTLY-FALSE, truth 5-25, conf 65-85). With the original `184f0bba` (`report_damaged`), that is **4 pass / 1 fail at the *same source* → the failure is FLAKY, not a stable regression.** This **empirically confirms cause #2 (LLM judgment variance)** and kills causes #1/#3 as the primary story. The same preliminary-fetch 403s appear in passing runs too, so they are not the determinant.
  - *Secondary signal (n=1 failure — hypothesis, not proven):* the failing run emitted **3 claims incl. the "energy density" proxy (AC_03)**; the 4 passing runs emitted **≤2 claims (WTW/TTW only)**. So the abort likely triggers when extraction *also* emits the non-measurement-frame energy-density proxy and the validator flags the whole set. Extraction-decomposition variance + the validator's borderline neutral-vs-proxy call together gate the outcome.
  - **Fix surface:** NOT a rule edit, NOT a revert, NOT a bisect. The defect is that an *occasional/borderline* contract judgment triggers a **terminal `report_damaged`** when a valid report is possible ~80% of the time. **A dedicated fix proposal was designed and reviewed** — see `Docs/WIP/2026-05-30_Stage1_Contract_Gate_Hardening_Proposal.md`. **The "prune the offending claim" fix (Option A) was REJECTED by 3 reviewers + advisor** (doesn't fire on the actual failure — *both* thesis-direct carriers AC_01/AC_02 are flagged, AC_03 is tangential; circular re-validation; and it can publish a half-the-input verdict on multi-conjunct inputs). The **fix locus is unresolved** between L1 (extraction-shape variance — favored by the 5/5 claim-count↔outcome separation), L2 (validator flips on a fixed set → resample), and L3 (the `selfContradicted` code check false-positives on prompt-mandated `{preserved∩drifted}`). A cheap **discriminator** (a few more Hydrogen runs + a fixed-set re-validation) must run before committing a fix. This is still the **§4 pattern** (brittle deterministic glue on a borderline LLM judgment).

**Unresolvable from current data (must hedge):** the persisted trace does **not** include the raw LLM booleans (`inputAssessment.preservesOriginalClaimContract`, per-claim `proxyDriftSeverity`/`recommendedAction`) — only the computed `summary`/`rePromptRequired`. So I **cannot** isolate whether the LLM's own `preservesOriginalClaimContract:false` or the deterministic self-consistency check is the load-bearing trigger. Both point the same way (claims judged drifted), but the fix surface (extraction prompt vs validation prompt vs the check vs completion-recovery termination) depends on which, and that requires a diff/bisect (or a re-run with full trace capture).

**Recommended narrow slice (no fix until proven):** diff/bisect `{0d97a7a6, f1130e40, e7deeb8b}` against last-good on the Hydrogen input to pin the regressing commit. The outcome likely indicates a **revert/repair** (the Captain's "consider reverting failed changes"), *not* a new prompt patch.

---

## §2 — EN Bolsonaro (`4ba5e6e5…`): standing Stage-2 ⊥ Stage-4 contract debt. Verdict is correct.

**Proven from code:**
- `evaluateEvidenceSufficiency` (`research-orchestrator.ts:1910-1955`) counts `claimDirection ∈ {supports,contradicts}` and item/diversity counts — **never reads `applicability`.**
- Stage 4 `summarizeBucketWeightedEvidenceDirection` (`verdict-stage.ts:2092,2107`) and `normalizeVerdictCitationDirections` (`:2191`) count **only `applicability === "direct"`** and strip the rest.
- → The two stages use **different acceptance criteria.** Stage 2 can advance a claim on directional-but-`contextual` evidence that Stage 4 then strips to zero.

**Proven from trace:** AC_02 ran the **full 5 main iterations** (`mainIterationsUsed:5`, 44 items), the LLM reasoned over real supporting + contradicting evidence (IACHR, ADPF 572, Fux dissent, WJP index…), but final `supportingEvidenceIds:[]`/`contradictingEvidenceIds:[]` — all stripped as non-`direct` ("no item … directly evaluates the Bolsonaro proceedings against ICCPR Article 14") → `verdict_integrity_failure` → safe-downgrade UNVERIFIED 50/24.

**Consequences:** (a) the **verdict is correct** — no source directly assesses AP 2668 vs international fair-trial standards; (b) wasted Stage-4 debate cost; (c) **a warning-severity issue**: `verdict_integrity_failure` frames an *evidence gap* (analytical reality) as a *system integrity failure*. Per AGENTS.md §"Report Quality & Event Communication", evidence scarcity must be `insufficient_*`/analytical-reality, never an integrity "failure". (Confirm user-visibility via `warning-display.ts` before acting.)

**Settles the open Claude-vs-Gemini disagreement (P3):** **Reject Gemini's Stage-2 re-research gate (Option A).** Its premise — the loop "stops before proving direct evidence is unavailable" — is **false here**: the loop ran all 5 iterations and the direct evidence does not exist; re-research burns budget + adds new prompt semantics for the *same* UNVERIFIED. Claude's "defer/do-nothing" understates it (real contract debt + severity mislabel). **Correct fix = align Stage-2 sufficiency with Stage-4 publishability** (require ≥1 `applicability==="direct"` directional item; else label `insufficient_direct_evidence` *before* the Stage-4 debate). Note: I did not confirm AC_02 was *marked* "sufficient" vs. ended on per-claim budget — the actionable finding ("the criteria differ; align them") holds either way.

---

## §3 — PT Bolsonaro (`a8b3…`): healthy. `ac3b33da` working as designed.

AC_02 published `LEANING-TRUE 65` with **7 genuine direct citations** (`EV_108/109` support; `EV_054-057/107` contradict) after normalization stripped contextual items and the **structural** `isVerdictDirectionPlausible` (`verdict-stage.ts:2042-2068`) passed on the survivors. The `direction_rescue_plausible` event is correctly `severity: info` (admin-only) — consistent with AGENTS.md (internal diagnostic). **No fix.** Note the asymmetry vs §2: PT's rescue is correctly `info`, while EN's gap is labeled `*_failure`.

---

## §4 — The shared, actionable item: a single publishability contract (principle, not patch)

The recurring shape: **stage N accepts on a looser criterion (structural presence / directional count / one LLM field) than stage N+1 (or a parallel gate) requires (`applicability==="direct"` / evaluative-meaning / semantic validity), and deterministic glue resolves the gap** — sometimes catastrophically (Hydrogen abort), sometimes conservatively (EN downgrade), sometimes correctly (PT). This is the AGENTS.md anti-pattern (deterministic logic making analytical decisions + misaligned cross-stage contracts), applied inconsistently.

**Principle to adopt:** *Publishability is one contract. Every stage's acceptance criterion must be aligned with the strictest downstream requirement, and no deterministic gate may encode a semantic mutual-exclusivity the prompt does not guarantee* (e.g., `preservedInClaimIds` ⟂ `proxyDriftSeverity` are orthogonal by Rule 11 + Rule 3 — the self-consistency check must not assume otherwise). Applying it yields the §1 + §2 fixes and predicts where the *next* drift will appear; PT already complies.

**Why this explains the "stacking":** every prior fix tuned **one gate** — the ~12 `verdict-stage.ts` citation/direction/rescue commits hardened the *Stage-4* gate (now correct), and Stage-1 saw deterministic checks added/removed repeatedly (F4, honestQuotes, the current self-consistency check). None addressed the **cross-stage** contract, so new instances kept surfacing at other stages. (The Hydrogen failure specifically turned out **flaky**, not a churn-caused regression — see §1 RESOLVED — but its terminal-abort-on-a-borderline-judgment is the *same* brittle-glue pattern.)

---

## §5 — Keep / Quarantine / Revert (Captain asked to "consider reverting failed changes")

- **`ac3b33da` (Stage-4 citation publication contract): KEEP.** Proven working — PT publishes 7 direct citations; EN correctly refuses. Do not revert.
- **Hydrogen: NO revert / NO bisect.** The live variance test (4/5 pass at the same source) proved the `report_damaged` is a **flaky Stage-1 contract abort**, not a regression from any commit — there is no "failed change" to revert here. Fix = **harden the gate's terminal-abort response** (drop/repair the offending proxy claim instead of aborting); see §1 RESOLVED + §6.1.
- **The ~12 Stage-4 verdict-stage commits: KEEP.** Legitimate incremental hardening of a gate that now works — *not* failed stacking. The real omission was the un-addressed Stage-2↔Stage-4 contract (§2).
- **Gemini's Stage-2 re-research gate (Option A): REJECT** (§2).

---

## §6 — Recommended next steps (ordered; all gated on Captain approval for any edit)

1. **[DONE 2026-05-30] Variance test — confirmed flaky, NOT a stable regression.** 4× fresh Hydrogen runs at HEAD all passed (in-band `FALSE`/`MOSTLY-FALSE`); 4 pass / 1 fail at the same source. **⇒ No bisect, no revert, no rule/prompt edit.**
2. **[DONE 2026-05-30] Gate-hardening fix designed + reviewed.** See `Docs/WIP/2026-05-30_Stage1_Contract_Gate_Hardening_Proposal.md`. **Option A (prune-and-revalidate) REJECTED** by 3 reviewers + advisor (doesn't fire on the actual failure; circular re-validation; can publish a half-the-input verdict). **Fix locus unresolved** — L1 extraction-shape variance (favored by 5/5 claim-count↔outcome), L2 validator-flip (→ resample), L3 `selfContradicted` code-check false-positive — needing different fixes.
3. **[NEXT — needs Captain approval] Run the discriminator** (proposal §4): ~5-6 more Hydrogen jobs tabulating `(claimCount, preservesContract, selfContradicted, verdict)` + a fixed-set re-validation harness logging raw `preservesOriginalClaimContract`/per-claim flags. Then commit the **locus-matched** fix with the §6-guards. *Verifier:* Hydrogen `report_damaged` rate ≈0 post-fix; PT + `rechtskräftig` inputs unchanged; genuine whole-set drift still aborts.
2. **(Deferred, design-only) EN Stage-2 sufficiency alignment** — make sufficiency require ≥1 `direct` directional item; relabel the gap `insufficient_direct_evidence` pre-Stage-4. *Verifier:* EN AC_02 → same UNVERIFIED, new label, Stage-4 debate skipped; PT unchanged. Don't bundle with #1.
3. **Benchmark hygiene (config-only)** — re-validate `hydrogen-en` after #1; revisit `bolsonaro-en` band (`SOLVED-VISIBLE-CONTAMINATION` may have been set on contaminated evidence; current UNVERIFIED may be correct-post-cleanup, not a regression).
4. **Adopt the §4 principle** as a review check so future gate patches can't reintroduce cross-stage drift.

**Warnings:**
- **Hydrogen is flaky, not a regression (live-confirmed 4/5 pass).** Do **not** revert any commit, run a bisect, or edit Rule 2/3/11 — all mis-target a stochastic failure. The fix is gate-hardening (terminal abort → drop/repair offending proxy claim).
- Do **not** edit Rule 2/Rule 3 or Rule 11 — they predate last-good and the case passes ~80% on the current rules; the debate's "edit Rule 3" fix is misdirected.
- Raw contract booleans aren't persisted; if measuring the variance *rate* precisely (vs the qualitative "flaky") matters, run more samples — n=5 here gives ~1/5 fail, not a tight estimate.
- Keep `ac3b33da`. No prompt edits without Captain approval. No live jobs before commit+refresh. Stop after one failed validation and classify.

**Open items:** Hydrogen contract-gate hardening (design + approval); precise variance rate (n=5 so far); EN "sufficient vs budget-exhausted" (unconfirmed); `verdict_integrity_failure` user-visibility (check `warning-display.ts`).

**For next agent:** The pattern is shared, the fixes are not. **Hydrogen is flaky (live-confirmed), not a regression** — harden the Stage-1 contract gate's terminal-abort response (§1 RESOLVED, §6.1); do NOT revert/bisect/edit-rules. Treat §2 (EN) as standing debt with a known bounded fix; §3 (PT) needs nothing.

**Learnings:** Appended to `Role_Learnings.md`? **Yes** — "Attribute regressions by diffing the regression window, not static reads" + the live-test corollary: *a single observed `report_damaged` on a SOLVED benchmark was actually flaky (4/5 re-runs pass); confirm determinism with a few re-runs before attributing a 'regression' to any commit.*
