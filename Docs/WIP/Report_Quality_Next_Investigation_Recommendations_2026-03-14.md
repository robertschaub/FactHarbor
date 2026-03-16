# Report Quality Next Investigation Recommendations

**Status:** APPROVED
**Created:** 2026-03-14
**Author Role:** Code Reviewer
**Baseline checkpoint:** `quality_window_start` (`9cdc8889`)
**Primary evidence:**
- [`Report_Quality_Restoration_Plan_2026-03-14.md`]( /c:/DEV/FactHarbor/Docs/WIP/Report_Quality_Restoration_Plan_2026-03-14.md )
- [`scripts/phase1_live_tracking.md`]( /c:/DEV/FactHarbor/scripts/phase1_live_tracking.md )
- [`scripts/phase1_results.json`]( /c:/DEV/FactHarbor/scripts/phase1_results.json )
- [`Report_Quality_Worktree_Comparison_Results_2026-03-13.md`]( /c:/DEV/FactHarbor/Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md )

---

## TL;DR

Phase 1 did **not** show a meaningful quality gain from disabling:

- SR evidence weighting
- jurisdiction relevance cap
- applicability filter
- conservative verdict settings

The strongest next investigation targets are now:

1. **Search-stack drift**
2. **Prompt quality**, especially non-English claim extraction and query generation
3. **LLM non-determinism control**, starting with a small temperature experiment

I do **not** recommend making self-consistency more aggressive as the next default change.

---

## Reviewer Quick Start

Read in this order:

1. `TL;DR`
2. `What Phase 1 Actually Proved`
3. `Recommended Investigation Order`
4. `Recommendations On Prompt Quality / Temperature / Self-Consistency`
5. `Open Review Questions`

Primary review question:

- Is the proposed next-step order the best way to improve report quality without overreacting to Phase 1 variance?

---

## Reviewer Checklist

- Confirm Phase 1 clears S1-S3 as primary suspects.
- Confirm search-stack drift is now the top remaining technical suspect.
- Confirm prompt quality should be investigated before stronger self-consistency settings.
- Confirm a small temperature experiment is appropriate, but only after search/prompt checks.
- Confirm the older restoration plan should not be used as-is for execution until stale sections are reconciled.

---

## What Phase 1 Actually Proved

From [`scripts/phase1_live_tracking.md`]( /c:/DEV/FactHarbor/scripts/phase1_live_tracking.md ) and [`scripts/phase1_results.json`]( /c:/DEV/FactHarbor/scripts/phase1_results.json ):

- Disabled-profile average score: `219.0`
- Control-profile average score: `207.8`
- Delta: `+11.2`
- Observed run-to-run swing: up to roughly `105` score points on the same benchmark family

Interpretation:

1. The Phase 1 suspects were **not** the main driver of the current quality gap.
2. The filtering/cap mechanisms appear to improve signal quality even when they reduce evidence volume.
3. The experiment also showed that **variance is now large enough that low-signal tuning can easily look causal when it is not**.

So the next step should not be “tune more knobs at random.”

It should be to investigate the largest remaining structural causes first.

---

## Findings

### 1. Search-stack drift is now the strongest remaining suspect

This is the highest-priority next investigation because:

- the historical comparison already pointed to search/provider drift as a major quality candidate
- Phase 1 did not close the gap through verdict/filter toggles
- evidence-pool quality is upstream of almost every later stage

Most likely search-side causes:

- provider mix drift
- retrieval diversity changes
- AUTO behavior drift
- changed result quality from current providers vs historical window

### 2. Prompt quality is worth investigating, but in a narrow scope

This is the strongest of the “content quality” suspects, but it should be scoped to:

- Stage 1 claim extraction / decomposition
- Stage 1 Pass 2 behavior
- Stage 2 query generation
- multilingual behavior, especially German and Portuguese

Why:

- non-English claim decomposition quality is already flagged in the updated restoration materials
- prompt drift can affect both evidence yield and later verdict quality without any code bug
- this is more plausible than verdict-prompt drift as the next root cause

### 3. Lowering temperature is reasonable only as a small controlled follow-up

Temperature tuning is worth testing because:

- Phase 1 showed high variance
- some variance may be coming from decomposition and self-consistency randomness

But this should be:

- **small**
- **controlled**
- **role-specific**

Best first candidate:

- `selfConsistencyTemperature` from `0.4` to `0.3`, or possibly `0.2`

I do **not** recommend broad temperature reductions across the whole pipeline as the next move.

### 4. More aggressive self-consistency is not the right next default move

I would not increase self-consistency intensity or frequency as the next mainline quality fix.

Reason:

- if the evidence pool is degraded, stronger self-consistency mostly gives more expensive agreement on weak input
- if decomposition is unstable, more self-consistency can amplify cost before fixing the actual source problem
- current evidence points more toward upstream quality than downstream debate weakness

Self-consistency is better treated as:

- a diagnostic lever
- a conditional fallback for high-spread cases
- or a later optimization after search/prompt issues are better understood

---

## Recommendations On Prompt Quality / Temperature / Self-Consistency

### Prompt quality

**Recommendation:** Yes, investigate next, but only after or alongside search-stack drift.

Priority prompt areas:

1. claim extraction / decomposition prompts
2. Pass 2 enrichment prompts
3. query-generation prompts

Do **not** start with verdict prompts.

### Lowering temperature

**Recommendation:** Yes, but only as a small A/B after search/prompt review.

Preferred first test:

- `selfConsistencyTemperature = 0.3`

Possible second test:

- `selfConsistencyTemperature = 0.2`

Do not broad-brush lower all temperatures without evidence.

### Using self-consistency more aggressively

**Recommendation:** Not yet.

Only consider this after:

1. search-stack drift is tested
2. prompt quality has been reviewed
3. a small temperature experiment has been run

If tested later, treat it as:

- a conditional high-variance mitigation
- not an immediate default-quality restoration strategy

---

## Recommended Investigation Order

### Phase A: Search-stack drift

Investigate:

- provider lineup differences
- AUTO behavior differences
- retrieval/result quality changes vs `quality_window_start`

Why first:

- highest remaining structural suspect
- upstream of evidence yield and verdict quality

### Phase B: Prompt quality review

Focus on:

- claim extraction
- claim enrichment / Pass 2
- query generation
- multilingual behavior

Why second:

- likely contributor to decomposition and evidence-pool differences
- more targeted than global prompt retuning

### Phase C: Small temperature experiment

Test:

- `selfConsistencyTemperature 0.4 -> 0.3`
- optionally `0.4 -> 0.2`

Why third:

- lower-risk variance control
- but lower causal priority than search and prompt quality

### Phase D: Conditional self-consistency experiment

Only if A-C still leave a gap:

- consider stronger self-consistency for high-spread cases
- do not promote directly to default without evidence

---

## Execution Guardrails

For the next round of experiments:

1. use same-session control runs
2. use repeated runs per condition
3. record provider availability and fallback behavior
4. keep contamination and geography fixes enabled unless the experiment explicitly targets them
5. do not use the older restoration plan as the execution source of truth without reconciling its stale sections

---

## Open Review Questions

1. Should search-stack drift be tested first in a worktree, or directly on `main` via temporary UCM/search-profile changes?
2. Should prompt-quality review be done before any new runtime experiment, or in parallel with search investigation?
3. For the first temperature test, should we use:
   - `0.3`
   - or run both `0.3` and `0.2` in one small matrix?

---

## Recommended Review Outcome

Recommended approval:

- approve search-stack drift as the next primary investigation
- approve a narrow prompt-quality review focused on extraction and query generation
- approve a small self-consistency temperature experiment only after that
- do **not** prioritize more aggressive self-consistency as the next default restoration move

## Lead Architect Review (2026-03-14)

**Status:** APPROVED

### Architectural Assessment
The proposed priorities reflect a mature and correct architectural interpretation of Phase 1. The previous phase demonstrated that attempting to fix quality by tuning downstream verdict filters or weights is futile when the underlying signal (evidence pool and decomposition) is highly variable or degraded. 

Sequencing upstream structural components (search drift, prompt quality) *before* downstream non-determinism controls (temperature, self-consistency) correctly avoids premature tuning and overfitting to variance. 

I strongly agree that self-consistency should remain a diagnostic lever or conditional fallback for now. Forcing higher self-consistency on a degraded evidence pool merely produces expensive agreement on poor data.

### Findings by Severity

- **HIGH - Execution Environment Distinction:** Regarding Open Question 1, the execution environment must match the drift type. If testing provider mix or retrieval diversity, use `main` with UCM/search-profile configurations. If testing `AUTO` behavior drift (such as the accumulation logic changes from early March), this requires a worktree/branch to revert and test the code changes cleanly.
- **MEDIUM - Prompt Investigation Guardrails:** While investigating prompt quality (Phase B), the `AGENTS.md` mandates on genericity and input neutrality must remain absolute. Improvements to claim extraction or query generation must not introduce hardcoded keywords, language-specific heuristics, or test-case overfitting.

### Answers to Open Review Questions

1. **Search-stack drift testing:** Direct on `main` via UCM for provider mix/diversity changes. Use a worktree *only* for reverting or testing code-level `AUTO` behavior changes (e.g., the recent stop-on-first-success accumulation change).
2. **Prompt-quality sequencing:** Perform in parallel with the search investigation. They are largely orthogonal (prompts govern decomposition/queries; search governs evidence retrieval) and can be executed by different agents to save time.
3. **Temperature test:** Start with `0.3` only. Do not matrix `0.3` and `0.2`. Dropping temperature too drastically may impair the model's reasoning capabilities during reconciliation. Establish the delta at `0.3` first.

**Decision:** APPROVED. Proceed with Phase A and Phase B in parallel, maintaining the execution guardrails as written.

