### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro Target-Object Applicability Guard Fix

**Task:** Fix commit `39c2d222173f5093b87d4321f42cd492c99a1224` so the prompt follows the repo’s generic-by-design rules, and remove the remaining Stage 4 path that lets contextual evidence keep the fair-trial atomic claims `UNVERIFIED`.

**Files touched:**
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`

**Done:**
- Confirmed the clean-commit runtime failure on job `921c7f23f02c4113a0d9c39f10eb21c3` was no longer primarily a Stage 2 scope-classification failure. The remaining concrete leak was Stage 4 citation handling: AC_02 and AC_03 still used evidence already labeled `applicability: "contextual"` inside `contradictingEvidenceIds`, and AC_02 also used contextual items inside `supportingEvidenceIds`.
- Sanitized the `39c2d222` prompt additions so they no longer reuse benchmark-shaped nouns such as `"the proceedings"`, `"the case"`, or `"the verdict"` as steering language. The affected Stage 1/2/4 prompt rules now talk about the **directly evaluated target**, **target path**, and **overlap-only background material** instead of Bolsonaro-shaped surface vocabulary.
- Added a Stage 4 structural guard in `verdict-stage.ts`:
  - `VerdictPromptEvidenceItem` now forwards `applicability` into `VERDICT_ADVOCATE` / `VERDICT_CHALLENGER`.
  - Direction-validation and direction-repair evidence pools now include `applicability`.
  - `isVerdictDirectionPlausible(...)` now fails not only on polarity mismatches, but also when directional citation arrays contain explicitly non-direct evidence (`contextual` / `foreign_reaction`).
  - `getDeterministicDirectionIssues(...)` now emits concrete issues for non-direct directional citations.
  - `normalizeVerdictCitationDirections(...)` now strips explicitly non-direct evidence IDs from `supportingEvidenceIds` / `contradictingEvidenceIds` before repair / re-validation.
- Hardened the Stage 4 prompt contracts generically:
  - `VERDICT_ADVOCATE` now treats `applicability` as binding for directional citation arrays.
  - `VERDICT_CHALLENGER` now treats non-direct directional citations as a structural weakness.
  - `VERDICT_DIRECTION_VALIDATION` now flags non-direct directional citations as direction issues.
  - `VERDICT_DIRECTION_REPAIR` now requires repaired directional arrays to retain only `direct` evidence IDs.
- Updated prompt-contract tests and verdict-stage tests to lock the new generic target-object wording and the direct-only directional-citation rule.
- Verified:
  - `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
  - `npx tsc -p apps/web/tsconfig.json --noEmit`
  - `npm -w apps/web run build`

**Key decisions:**
- Fixed forward instead of rewriting history. The job should record the new committed revision, not a retroactive edit to `39c2d222`.
- Kept the code-side guard structural. The new logic does not reinterpret raw text; it only enforces consistency across already-produced LLM labels (`claimDirection` + `applicability`).
- Preserved grounded external documentation as potentially probative. The fix blocks non-direct directional usage, not all external or foreign material.

**Open items:**
- Commit this fix set before any fresh live rerun.
- Restart the local services because `verdict-stage.ts` changed runtime code.
- Submit a fresh rerun for the approved English Bolsonaro input and confirm the new job uses the committed hash.
- Verify that AC_02 / AC_03 no longer cite contextual evidence directionally and that the report escapes the remaining `UNVERIFIED` atomic-claim state.

**Warnings:**
- This change does not guarantee a stronger truth verdict. If the remaining direct evidence still leaves the claim genuinely unresolved, `UNVERIFIED` can still be correct. The goal is to remove off-scope directional leakage, not to force a preferred answer.
- `next build` reseeded prompts automatically during verification, but that does not reload the running dev services. A service restart is still required before the live rerun so the new `verdict-stage.ts` logic is active.

**For next agent:**
- Before submitting any rerun, confirm:
  - the fix commit hash,
  - `/api/fh/version` reports that same hash after restart,
  - the active prompt hash matches the post-build / reseeded prompt blob.
- On the fresh rerun, inspect:
  - `meta.executedWebGitCommitHash`
  - `meta.promptContentHash`
  - AC_02 / AC_03 `supportingEvidenceIds` / `contradictingEvidenceIds`
  - cited evidence `applicability`
- If the rerun still leaves a claim `UNVERIFIED`, compare the remaining directional citations against job `921c7f23f02c4113a0d9c39f10eb21c3`. If contextual citations are gone, treat the residue as a genuine evidentiary disagreement rather than another scope/citation-structure leak.

**Learnings:**
- Applicability filtering in Stage 2 is not enough if Stage 4 later discards the `applicability` label before verdict generation and validation. Directional citation arrays need an explicit structural guard.
- A prompt fix can be “generic-looking” while still being benchmark-shaped if its steering vocabulary came from the triggering analysis. The safer pattern is to restate the mechanism in terms of the directly evaluated target and overlap-only background material.
