# Senior Developer Handoff - Stage 4 Citation/Grounding Execution Plan

**Date:** 2026-06-17
**Role:** Senior Developer
**Agent:** Codex (GPT-5)
**Output tier:** Significant

## Task

Prepare the next clean-main implementation step with a reviewed plan and external
model assistance before touching code.

## Files Touched

- `Docs/WIP/2026-06-17_Stage4_Citation_Grounding_Execution_Plan.md`
- `Docs/WIP/2026-06-17_Clean_Main_Next_Cleanup_Plan.md`
- `Docs/WIP/README.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-06-17_Senior_Developer_Stage4_Citation_Grounding_Plan.md`

## Key Decisions

- Keep Stage 4 citation/grounding integrity as the first code target.
- Treat the Bolsonaro PT `AC_01` warning shape as a working hypothesis, not
  proof, because the fresh live evidence is N=1.
- Do not spend extra live jobs only to reproduce the warning shape unless the
  Captain approves the cost.
- Capture the grounding validator payload in a focused unit fixture before
  committing to behavioral assertions.
- Preserve invalid/sibling evidence diagnostics; the fix must not pass by
  allowing bad IDs to bypass citation integrity.
- Keep status/backlog cleanup non-blocking for the first Stage 4 unit fixture.

## External Review

Reviewed with:

- Claude via `scripts/agents/invoke-claude.cjs`
- Gemini via `scripts/agents/invoke-gemini.cjs`

Review changes incorporated:

- downgraded root classification from proof to working hypothesis
- reordered the first implementation slice to capture payload first
- clarified this is not an F2 surgical-repair fixture
- added negative coverage for the no-valid-local-evidence case
- made the fallback for structurally valid but unsupported verdicts explicit
- kept prompt changes behind Captain approval

## Open Items

1. Before code edits, write the required `DEBT-GUARD` block.
2. Start with `Docs/WIP/2026-06-17_Stage4_Citation_Grounding_Execution_Plan.md`.
3. Add the Stage 4 payload-capture fixture in
   `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`.
4. Only after the fixture identifies the code-carried structure, amend
   `apps/web/src/lib/analyzer/verdict-stage.ts`.
5. Run focused tests, then `npm test`.
6. Commit before live smoke validation and refresh runtime first.
7. Rerun only the same three Captain-defined smoke inputs unless Captain
   approves more.

## Warnings

- Do not edit `apps/web/prompts/` without Captain approval.
- Do not add deterministic semantic text-analysis logic.
- Do not infer a code fix from the N=1 live job if the structural payload cannot
  be captured in test.
- If filtering sibling IDs leaves no valid local direct evidence, the correct
  fallback is normal insufficient-evidence/publishability handling, not a hidden
  pass and not a `verdict_integrity_failure` crash.

## Learnings

No durable role learning added. The reusable content is in the WIP plan and this
handoff.
