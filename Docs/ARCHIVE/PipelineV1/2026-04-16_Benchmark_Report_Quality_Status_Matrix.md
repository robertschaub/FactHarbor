# Benchmark Report Quality Status Matrix

**Date:** 2026-04-16
**Role:** LLM Expert (GitHub Copilot, GPT-5.4)
**Scope:** Current expected report quality for the benchmark families the Captain asked about, based on the current local codebase, recent live reruns, recent handoffs, and the safe verification suite.
**Status:** Snapshot after the April 16 fix wave, including the Bundesrat Stage 1 repair work, the asylum refinement fixes, the Bolsonaro foreign-assessment containment fixes, the hydrogen boundary split, and the earlier Plastik Stage 4 parse recovery.

---

## 1. Executive Summary

This matrix is not a claim about perfect stability. It answers a narrower question:

**Given the issues we already investigated, which main issue now looks solved, partly solved, or still open for each benchmark family?**

### High-level judgment

- **Main issue appears solved or mostly solved:**
  - Bundesrat treaty family
  - Hydrogen efficiency family
  - Bolsonaro foreign-government contamination family
  - Plastik Stage 4 parse-failure family
- **Main issue improved but not fully closed:**
  - Swiss asylum-count family
  - Plastik overall family quality beyond the old Stage 4 crash
  - Bolsonaro overall report confidence / residual evidence-pool contamination
- **Still not directly verified enough:**
  - The exact WWII-comparison asylum variant
  - The Portuguese Bolsonaro variant on the final strongest foreign-assessment backstop

### Current cross-family view

The repo is in a much better place than before the recent fix wave:

- The **safe suite is green** on the current tree: `83` test files passed, `1688` tests passed, `1` skipped.
- The recent April 16 live jobs that mattered most all **complete successfully** instead of dying in the old failure modes.
- The biggest remaining weakness is now **report quality consistency**, not catastrophic pipeline breakage.

---

## 2. Evidence Base

This assessment is grounded in:

- Recent landed commits through `f0467421` (`fix(prompt): harden foreign assessment containment`)
- Current safe verification on the local tree (`npm test` green)
- Recent live jobs and reruns, especially:
  - `b92201bb47454f7498a1919c4a82c567` — Bundesrat `rechtskräftig` variant
  - `bc82574223574bb087f47276e0496907` — asylum `235 000` family
  - `2f8cab5595cc42f0b94615b524a51c84` — regressed asylum comparison run
  - `d763f9507de4430681a471447b12d0fe` — intermediate Bolsonaro applicability-fix rerun
  - `ec9840ff97994392a7ea9784beb5d79a` — final stronger Bolsonaro backstop rerun
  - `a2e57bbb5d9d44e28884407ab2b91c32` — hydrogen live verification
  - `a97ec59eeb5e43c69ae8d7583eecfcb3` — Plastik live verification after Stage 4 repair
- Recent handoffs, especially:
  - `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Analyzer_Review_Followup_And_Safe_Suite_Green.md`
  - `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage1_Repair_Anchor_Selection_And_Live_Bundesrat_Rerun.md`
  - `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Hydrogen_Boundary_And_Asylum_Refinement_Followup.md`
  - `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Asylum_Refinement_Regression_Fix.md`
  - `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Leak_Diagnosis_And_Applicability_Prompt_Fix.md`
  - `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Backstop_Verification.md`
  - `Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_stage_4_advocate_parse_failure_from_une.md`

---

## 3. Release-Style Matrix

| Input / family | Main prior issue | Main prior issue solved? | Expected report quality now | Latest concrete evidence |
|---|---|---|---|---|
| `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | Stage 1 contract/anchor failure causing `UNVERIFIED 50/0` and bad claim shape | **Yes, for the main blocker** | **Usable; still worth watching for semantic precision** | Live rerun `b92201bb47454f7498a1919c4a82c567` now `SUCCEEDED | MIXED | 48 | 72`; safe suite green; Stage 1 no longer dies before research |
| `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | Same Swiss treaty family, minus the fragile `rechtskräftig` anchor | **Probably yes** | **Usable** | No fresh direct live rerun on the current tree, but the harder `rechtskräftig` variant now completes successfully on the current fix set |
| `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | Missing or unstable retrieval of the decisive official SEM aggregate total; regression to `UNVERIFIED 57/40` after refinement path changes | **Partly** | **Better than before, but still softer than desired** | Good current run `bc82574223574bb087f47276e0496907` is `LEANING-TRUE | 62 | 55`; bad comparison run `2f8cab5595cc42f0b94615b524a51c84` was `UNVERIFIED | 57 | 40` |
| `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` | No direct current-stack validation of this exact variant; adds a historical-comparison dimension beyond the base asylum count family | **No / not yet proven** | **Low-confidence expectation only** | No direct live rerun or benchmark-history evidence for this exact wording in the reviewed docs; only the base asylum-count family has recent live verification |
| `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | Foreign-government contamination: U.S. government / `state.gov` material cited into final verdict arrays as if it were substantive fair-trial evidence | **Yes, for the visible contamination problem** | **Moderate quality; no longer visibly damaged by U.S. government citations** | Intermediate fix run `d763f9507de4430681a471447b12d0fe` still ended `MIXED | 50.5 | 54`; final stronger backstop run `ec9840ff97994392a7ea9784beb5d79a` ended `LEANING-TRUE | 64.2 | 50` and reduced cited `state.gov` ids from `7` to `0` |
| `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas` | Same Bolsonaro contamination family, but in Portuguese | **Probably, but not directly proven on the final strongest backstop** | **Likely improved, but still inferential** | The April 16 fixes are language-agnostic and the English twin now behaves better, but the reviewed docs do not contain a fresh direct PT rerun on the final `af6ebf88...` prompt hash |
| `Using hydrogen for cars is more efficient than using electricity` | TTW/WTW conflation and failure to keep measurement-window boundaries structurally visible | **Yes** | **Good** | Live job `a2e57bbb5d9d44e28884407ab2b91c32` is `SUCCEEDED | FALSE | 13.4 | 75` and the report now shows distinct full-pathway and tank-to-wheel claims/boundaries |
| `Plastic recycling is pointless` | Stage 4 advocate parse/runtime failure on malformed verdict JSON; broader family still has evidence/aggregation variance | **Yes for the old hard failure; only partly for overall family quality** | **Usable, but still variance-prone** | Live rerun `a97ec59eeb5e43c69ae8d7583eecfcb3` is `SUCCEEDED | MOSTLY-FALSE | 21 | 71`; the old exact parse-failure family is fixed, but historical evidence-variance concerns remain |

---

## 4. Per-Family Notes

### 4.1 Bundesrat family

The biggest win here is that the current stack no longer collapses into the old Stage 1 failure mode. The hard failure was not “slightly wrong weighting”; it was “the job structurally failed before research and verdicting.” That is now gone.

What still keeps this family out of the “fully closed” bucket is semantic polish on the `rechtskräftig` version. The main blocker is fixed. The remaining risk is that the final claim shape may still be slightly less faithful than ideal in some runs, even though the pipeline now completes and produces a plausible result.

### 4.2 Asylum `235 000` family

This family has improved, but the core weakness is not fully gone. The report can now recover to a sane verdict range on the current tree, and the specific refinement-trigger regression that produced `UNVERIFIED 57/40` looks addressed. But the strongest form of the desired behavior is still missing: a consistent, clean retrieval of one direct official aggregate total from the primary Swiss source family.

So the family is no longer “broken”, but it is still weaker than hydrogen or the repaired Bolsonaro family.

### 4.3 Bolsonaro family

This family had two different states on April 16:

- The intermediate applicability-only fix improved the path but did **not** fully stop visible contamination.
- The later, stronger backstop did.

That matters. The current expectation should be based on `ec9840ff...`, not on the earlier intermediate rerun. The visible U.S. government contamination problem in the English family now looks fixed. The remaining risk is smaller and more technical: uncited residual `state.gov`-domain items still surviving in the evidence pool.

That means the family should now produce better reports than before, but confidence remains only moderate and I would still treat it as a hard family.

### 4.4 Hydrogen family

This is one of the strongest current “yes, the main issue is solved” cases. The prior problem was structural conflation of different efficiency frames. The current live report exposes those frames properly.

Unless new evidence shows a different regression, this family now looks like cleanup territory rather than active firefighting.

### 4.5 Plastic family

The old explicit bug is fixed: the Stage 4 advocate parse-failure family no longer forces the report into fallback `UNVERIFIED` states. That is a real and important improvement.

However, this family is still useful as a broader stress test for evidence variance and claim-aggregation sensitivity. So the right judgment is not “still broken”; it is “no longer hard-failing, but still not the best family to use as proof of total report-quality stability.”

---

## 5. What I Would Count As Still Not Solved

These are the issues that still look materially open:

1. **Direct-primary-source aggregate retrieval for the Swiss asylum-count family**
   - The family is improved, but the strongest evidence shape is still inconsistent.

2. **The exact WWII-comparison asylum variant**
   - There is still no direct current-stack verification evidence for this exact wording.

3. **Residual uncited foreign-government residue in the Bolsonaro family**
   - The visible citation problem is fixed, but a small evidence-pool residue remains.

4. **Plastic-family upstream evidence / aggregation variance**
   - The hard parse failure is fixed, but broader family stability remains only partly solved.

5. **Direct proof for the Portuguese Bolsonaro variant on the final strongest backstop**
   - I expect the fix to transfer, but the strongest evidence is still indirect.

---

## 6. Highest-Value Reruns To Close Remaining Uncertainty

If only a few reruns should be spent, these are the highest-value ones:

1. **Exact WWII-comparison asylum variant**
   - Input: `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
   - Why: this is the weakest-evidence family in the current matrix. It is not directly covered by the recent asylum reruns and adds a historical-comparison dimension.

2. **Portuguese Bolsonaro variant on the current strongest backstop**
   - Input: `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
   - Why: converts the current “likely fixed by transfer from EN” judgment into direct proof.

3. **Fresh current-stack rerun of the base asylum-count family with explicit source inspection**
   - Input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
   - Why: confirms whether the family now consistently surfaces one clean official aggregate total rather than only a stronger but still imperfect component-based evidence mix.

### Lower-priority reruns

- Another hydrogen rerun would mainly be confirmation, not closure of an active uncertainty.
- Another Plastik rerun is useful for long-run variance tracking, but not the highest-value rerun if the goal is to close the biggest remaining open questions.
- Another Bundesrat rerun is useful only if the goal is to polish semantic fidelity, not to prove that the main hard failure is fixed.

---

## 7. Practical Recommendation

If the question is whether the current stack is ready for better reports than before on the benchmark set, the answer is **yes**.

If the question is whether the benchmark set is now fully closed and stable enough that no family deserves extra scrutiny, the answer is **no**.

The current stack looks materially better on the exact failure classes that drove the recent fix work:

- Swiss treaty Stage 1 failure: improved
- Asylum refinement regression: improved
- Bolsonaro U.S. assessment contamination: improved
- Hydrogen TTW/WTW conflation: improved
- Plastik Stage 4 parse failure: improved

The remaining work is now mostly in the category of **quality hardening and consistency**, not “the pipeline is still falling over in the old way.”
