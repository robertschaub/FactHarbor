---
### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Implementation Refresh Review
**Task:** Refresh from the latest April 10 handoffs plus current source/prompt state after the completed implementation wave, then provide a findings-first review.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Implementation_Refresh_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the major Wave-1 safeguard is genuinely shipped: Stage 1 no longer silently fail-opens when contract validation returns `false` or becomes unavailable, and the pipeline now terminates early with `report_damaged`. Also confirmed the current tree still has three material unresolved issues: (1) the contract validator still cannot reliably enforce “a direct claim must preserve the anchor”, (2) the new provenance gate intentionally allows semantically unrelated quote evidence to count as anchor preservation, and (3) the coverage matrix remains semantically misleading in both live UI and export.
**Open items:** Need Captain decision on whether the validator should receive `thesisRelevance` / directness context, and whether the current trust-the-LLM provenance gap is acceptable. Still need removal/simplification work for dead config (`articleVerdictOverride`), deprecated dominance residue, and deterministic semantic rescue logic.
**Warnings:** The current implementation is materially safer than the earlier state, but it is not a full closure of the Swiss `rechtskräftig` problem. It prevents many bad runs from shipping, yet it can still approve the wrong claim shape. The matrix/report-honesty issue also remains user-visible and largely unfixed.
**For next agent:** Start from this handoff plus `2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md` and `2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md`. Highest-value next actions are: add contract-validator directness context, close or consciously accept the provenance-gap risk, add a pipeline-level damaged-report regression test, and fix matrix semantics before more report-quality patches.
**Learnings:** No

## Findings

1. **[HIGH] The contract validator still cannot enforce its own “direct claim preserves the anchor” rule.**
   The prompt requires a **direct atomic claim** to preserve the modifier in `CLAIM_CONTRACT_VALIDATION`, but the validator payload only includes `claimId`, `statement`, and `category` in `apps/web/src/lib/analyzer/claim-extraction-stage.ts`. It does not pass `thesisRelevance`, so the LLM cannot distinguish a thesis-direct fused claim from a tangential legal-effect side claim.

2. **[HIGH] The new provenance gate intentionally allows semantically unrelated quote evidence to count as anchor preservation.**
   `evaluateClaimContractValidation()` now checks only that quoted text is a real substring of a cited claim and that the LLM is self-consistent. The unit suite explicitly locks in the acceptance of an unrelated quote span for the anchor case. This removes the old coordinated-anchor false negatives, but creates a real false-positive preservation risk.

3. **[HIGH] The matrix/report-honesty problem is still live.**
   The visible number in each live matrix cell is still an evidence count, while the background color still comes from a boundary-local verdict. Row headers and row totals are still colored from `dominantVerdict()` rather than from a real boundary verdict, and the HTML export still uses count-only coloring instead of the live verdict-colored scheme.

4. **[MEDIUM] The critical damaged-report safeguard still lacks a pipeline-level regression test.**
   The current tests cover helper logic and summary refresh behavior, but the early-termination branch that returns a damaged report is not directly exercised end-to-end.

5. **[MEDIUM] Dead/transitional surface remains larger than it should be.**
   `articleVerdictOverride` is still present in authoritative schema/defaults without a runtime consumer. Deprecated dominance-era fields and dead `AdjudicationPath.path` literals still widen the live type contract.

6. **[MEDIUM] Two deterministic semantic verdict-movers remain in hot paths.**
   Stage 5 still falls back to substring-based anchor weighting in `aggregation-stage.ts`, and Stage 4 still uses arithmetic verdict-direction rescue in `verdict-stage.ts`. Both remain meaningful analysis logic, not just plumbing.

7. **[MEDIUM] Prompt metadata/docs are drifting from runtime again.**
   `claimboundary.prompt.md` frontmatter still lists `EXPLANATION_RUBRIC`, while runtime calls `EXPLANATION_QUALITY_RUBRIC`. The prompt loader only warns on missing required sections, and the current prompt contract tests do not validate frontmatter consistency.

## Verification

- `npm -w apps/web exec vitest run test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `npm -w apps/web run build`

Both passed on the current tree.
