---
### 2026-05-28 | Senior Developer | Codex (GPT-5) | Zero Directional Citation Guard Review

**Task:** Prepare a handover for the zero-directional-citation verdict validation issue after proposing a fix and calling independent review.

**Files touched:**
- `Docs/AGENTS/Handoffs/2026-05-28_Senior_Developer_Zero_Directional_Citation_Guard_Review.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Current state:**
- No zero-citation guard implementation has been applied yet in this handoff task.
- The prior daily bug scan did apply a separate CI fix in `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`: the `vi.mock("ai")` test mock now exports `APICallError.isInstance`.
- Current worktree was already dirty before this handoff with unrelated files: `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/drain-runner-pause.integration.test.ts`, and existing `Docs/AGENTS/Agent_Outputs.md` changes. Do not assume those are part of the zero-citation work.

**Problem summary:**
- Project rule: `AGENTS.md` Pipeline Integrity requires evidence transparency: every verdict must cite supporting or opposing evidence items.
- Captain quality expectation: `Docs/AGENTS/Captain_Quality_Expectations.md` says every published verdict cites at least one supporting or contradicting evidence item.
- Current code path: `apps/web/src/lib/analyzer/verdict-stage.ts` `isVerdictDirectionPlausible(...)` rejects misbucketed, non-direct, and one-sided directional citations, but returns `true` when both `supportingEvidenceIds` and `contradictingEvidenceIds` are empty because no rejection condition fires.
- Current test path: `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` currently includes a test named `returns true when evidence IDs are empty`, confirming the weakened behavior.

**Independent review outcome:**
- Two read-only explorer reviews were called.
- Both reviewers agreed the structural guard is correct for ordinary published verdicts.
- Both reviewers warned that changing only `isVerdictDirectionPlausible(...)` is insufficient because `validateVerdicts(...)` can bypass structural plausibility when the LLM direction validator returns valid.
- Second reviewer found an additional repair risk: with empty citation arrays, claim-local evidence selection can fall back to the full evidence pool, and the repair path may backfill unrelated or cross-claim citations. For normal zero-citation verdicts, safe downgrade is safer than broad-pool repair unless claim-local mapping is known valid.

**Key decisions:**
- Fix should be structural only: inspect citation arrays and explicit verdict status fields, not text meaning.
- Do not infer fallback allowance from `truthPercentage === 50`, `verdict === "UNVERIFIED"`, or low confidence alone.
- Allow zero directional citations only for explicit fallback/insufficient states.
- Treat normal publishable zero-citation verdicts as an integrity/direction failure and route them to safe downgrade unless a repair can use clearly claim-local direct evidence.
- Prompt changes are deferred unless Captain explicitly approves editing `apps/web/prompts/claimboundary.prompt.md`.

**Recommended implementation:**
1. Add helpers near the direction checks in `apps/web/src/lib/analyzer/verdict-stage.ts`:
   - `hasZeroDirectionalCitations(verdict)`
   - `isExplicitZeroCitationFallback(verdict)`
2. Suggested fallback allowlist:
   - `verdictReason === "insufficient_evidence"`
   - `verdictReason === "report_damaged"`
   - `verdictReason === "analysis_generation_failed"`
   - `verdictReason === "verdict_integrity_failure"`
   - Require structural insufficient/fallback shape, for example `confidenceTier === "INSUFFICIENT"` and no directional citations. Do not allow ordinary `UNVERIFIED` alone.
3. In `getDeterministicDirectionIssues(...)`, add an issue when both directional citation arrays are empty and `isExplicitZeroCitationFallback(...)` is false.
4. In `isVerdictDirectionPlausible(...)`, return `false` for the same non-fallback zero-citation condition.
5. In `validateVerdicts(...)`, make structural plausibility mandatory at all candidate acceptance gates:
   - Initial current verdict after LLM direction validation.
   - Post-normalization branch currently built around `normalizedDirection.valid !== false || isVerdictDirectionPlausible(...)`.
   - Post-repair branch currently built around `retryDirection.valid !== false || isVerdictDirectionPlausible(...)`.
   Replace those OR-style acceptance checks with logic that never accepts a structurally implausible candidate just because the LLM validator returned valid.
6. Avoid broad evidence-pool citation backfill for this specific failure. If the original verdict has zero citations and there is no clearly claim-local direct evidence set, prefer safe downgrade over attempting repair from the full pool.

**Required tests:**
- Update `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`:
  - Ordinary zero-citation verdict is not plausible.
  - Explicit `insufficient_evidence` zero-citation fallback remains plausible/allowed.
  - Explicit `verdict_integrity_failure` zero-citation fallback remains plausible/allowed.
  - Stale `INSUFFICIENT` without explicit fallback reason is rejected.
  - `validateVerdicts(...)` rejects or downgrades a normal zero-citation verdict even when grounding and direction LLM validators return valid.
  - Post-normalization/post-repair zero-citation candidates cannot be accepted solely because the LLM says direction-valid.
  - Successful repair remains possible when claim-local direct evidence can populate at least one citation.

**Verification to run:**
- `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`
- `git diff --check`
- If prompt changes are approved and made: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- Consider `npm -w apps/web run build` if the implementation changes exported types or shared helper signatures.

**Open items:**
- Implement the guard and tests.
- Decide whether prompt wording should be restored. Prompt edits require explicit human approval under repository rules.
- Decide whether `report_damaged` and `analysis_generation_failed` should be included in the zero-citation allowlist inside `verdict-stage.ts` or handled only outside Stage 4 paths. Current reviewers noted those fallback shapes exist in pipeline utilities / pipeline flows.

**Warnings:**
- Do not use deterministic text analysis or keyword semantics. This fix must stay structural.
- Do not use `verdict === "UNVERIFIED"` as the allow condition; that would allow ordinary no-citation midpoint verdicts to bypass the guard.
- `runStructuralConsistencyCheck(...)` is not enough because it logs warnings but does not block the pipeline.
- Repair from an empty-citation verdict can accidentally use broad evidence if claim-local mapping is unavailable. Guard that path deliberately.
- Worktree may contain unrelated runner/test changes; do not revert them.

**For next agent:**
- Start in `apps/web/src/lib/analyzer/verdict-stage.ts` around `validateVerdicts(...)`, `isVerdictDirectionPlausible(...)`, and `getDeterministicDirectionIssues(...)`.
- Read `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` around the existing empty-ID plausibility test and validation/repair tests.
- Implement structural-only zero-citation rejection with explicit fallback allowlist and mandatory structural plausibility at all acceptance gates.

**Learnings:** No Role_Learnings.md update made. Candidate learning if this bug is fixed: LLM direction-validator success must not override deterministic structural citation invariants.
