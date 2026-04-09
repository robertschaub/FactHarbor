# Review Request: Option G — Direction-Conflict LLM Adjudication

**Date:** 2026-04-09
**From:** Lead Architect + LLM Expert (Claude Opus 4.6)
**To:** Lead Architect (GPT / Codex) — independent review
**Status:** Captain-approved design, pre-implementation review

---

## Context

The Rev A dominant-claim plan (`Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md`) introduced deterministic multiplier math for article-level truth — an LLM detects dominance, then code applies configured multipliers to recompute the article verdict. This violates the LLM Intelligence mandate in AGENTS.md.

A redesign was performed. Two options were developed (full details in `Docs/WIP/2026-04-09_LLM_Led_Article_Adjudication_Redesign.md`):

- **Option B:** LLM adjudication for all multi-claim inputs.
- **Option G:** LLM adjudication only when direct claims disagree in direction; baseline weighted average retained for same-direction inputs.

**Option G was approved by the Captain.**

## The Design in One Paragraph

When all direct claims agree in direction (all true-leaning or all false-leaning), the existing deterministic weighted average is the final article truth — no LLM call, no change from current behavior. When direct claims disagree in direction, a new `ARTICLE_ADJUDICATION` LLM step (Sonnet 4.5, ~$0.013/call, ~2s) produces the article truth, with a UCM-configurable deviation cap (default 25pp) from the baseline as a structural guard. `VERDICT_NARRATIVE` becomes explanatory-only for all paths — `adjustedTruthPercentage` is removed. The current `CLAIM_DOMINANCE_ASSESSMENT` step and its deterministic multiplier path are replaced entirely.

## Required Reading

1. **Full design document:** `Docs/WIP/2026-04-09_LLM_Led_Article_Adjudication_Redesign.md` — section 5 (Option G) is the approved design. Sections 2-4 (Option B) are context. Section 6 is the comparison.
2. **Current aggregation code:** `apps/web/src/lib/analyzer/aggregation-stage.ts` — lines 215-435 (complete-assessment predicate, dominance path, narrative branching, final truth determination).
3. **Current dominance prompt:** `apps/web/prompts/claimboundary.prompt.md` — section `CLAIM_DOMINANCE_ASSESSMENT` (lines 1510-1575) and `VERDICT_NARRATIVE` adjudication rules (lines 1479-1506).
4. **Types:** `apps/web/src/lib/analyzer/types.ts` — `DominanceAssessment`, `AdjudicationPath` interfaces.
5. **Rev A plan (superseded):** `Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md`

## Review Questions

Please assess the following. A short, direct answer per question is preferred over lengthy analysis.

### 1. Direction conflict predicate — is it structural or semantic?

The gate rule is: check `claimDirection` (from Stage 1) and `truthPercentage` (from Stage 4) on each direct claim verdict. If some are true-leaning and some are false-leaning, fire the LLM. Otherwise, use the baseline.

**Q:** Does this predicate qualify as "structural plumbing" under the LLM Intelligence mandate, or is it a deterministic semantic heuristic that should itself be LLM-led?

### 2. Deviation cap — is 25pp the right default?

The Swiss target needs a ~30pp correction (baseline ~65, correct ~35). With a 25pp cap, the LLM can push to 40 — close but not fully correct. Widening to 30pp would allow the full correction but reduces the safety margin.

**Q:** Should the default be 25, 30, or something else? Should there be a separate cap for unresolved-claim jobs (the design currently says no)?

### 3. Narrative truth override removal — safe for unresolved-claim jobs?

Currently, `VERDICT_NARRATIVE` can adjust `adjustedTruthPercentage` for unresolved-claim jobs (some direct claims are INSUFFICIENT). Option G removes this for all paths — the narrative becomes explanatory-only everywhere.

For same-direction unresolved-claim jobs, the baseline weighted average may be distorted because zero-confidence claims have zero weight. The LLM adjudication does NOT fire for these (same direction), so the baseline is the final answer.

**Q:** Is there a concrete case where a same-direction unresolved-claim job produces a misleading baseline that the narrative was correctly compensating for? If so, should the direction-conflict gate also fire for unresolved-claim jobs regardless of direction?

### 4. Folding dominance into adjudication — one step or two?

The design folds `CLAIM_DOMINANCE_ASSESSMENT` into `ARTICLE_ADJUDICATION` to avoid a separate LLM call whose only consumer was deterministic multiplier math. But the combined prompt must now both assess dominance and produce a calibrated truth percentage.

**Q:** Is the single-step fold sound, or should dominance assessment remain a separate LLM step that feeds into a second LLM adjudication step (two LLM calls, but both LLM-led)?

### 5. Any architectural concerns not covered?

**Q:** Are there failure modes, edge cases, or architectural risks in Option G that the design document does not address?

## Review Expectations

- This is a design review, not an implementation review. No code changes to review.
- Disagreements with any design decision should be stated with rationale.
- If the reviewer concludes "Option G is unsound, use Option B instead," that is a valid review outcome — but the rationale should address why the direction-conflict gate is problematic.
- The review should be written as a standard completion entry in `Agent_Outputs.md` or a handoff file in `Handoffs/` if significant.
