### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Bolsonaro Foreign Assessment Leak Diagnosis And Applicability Prompt Fix

**Task:** Investigate why job `b48440718d3e4f428de5fbef8c2a45b3` was again influenced by baseless U.S. "assessments," identify how the old contamination fix worked, and determine why it no longer protected this run.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`

**Done:**
- Proved the bad job was not using a stale prompt rollout. `resultJson.meta.promptContentHash` for job `b48440718d3e4f428de5fbef8c2a45b3` was `52097397...`, which matched the active `claimboundary` prompt hash in `config_active` before this fix.
- Traced the leak path to seeded preliminary evidence, not the Stage 2 relevance cap. Seeded items are created in `apps/web/src/lib/analyzer/research-orchestrator.ts:931` and marked `isSeeded: true` at `:1009`, so they bypass the search-result relevance capping path and rely on the later applicability pass.
- Confirmed the post-extraction applicability filter is still present and only removes items classified `foreign_reaction` in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:711-722` via `assessEvidenceApplicability(...)` from `apps/web/src/lib/analyzer/research-extraction-stage.ts:411`.
- Verified the user-reported contamination is real: `EV_021` and `EV_022` are seeded `state.gov` evidence items, both marked `applicability: contextual`, and both are cited as contradicting evidence for `AC_01` and `AC_02` in the bad job.
- Tightened `APPLICABILITY_ASSESSMENT` so foreign government assessments/monitoring reports remain `foreign_reaction` even when framed as human-rights, due-process, democracy, or fair-trial analysis. Added the contrastive preservation rule that neutral external reporting on the target proceeding remains `contextual` unless the substance is the foreign government's own assessment. Prompt lines added at `apps/web/prompts/claimboundary.prompt.md:1919-1921`.
- Added a prompt-contract lock in `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts:540` so future prompt edits must preserve this fair-trial-assessment distinction.
- Reseeded prompts with `npm -w apps/web run reseed:prompts`, updating active `claimboundary` hash from `52097397...` to `3cacb809...`.
- Verified focused tests passed:
  - `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/research-extraction-stage.test.ts`
  - Result: `2` files passed, `103` tests passed.
- Submitted a fresh approved-input rerun for verification:
  - Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
  - New job: `d763f9507de4430681a471447b12d0fe`
  - Status at handoff time: `RUNNING`

**Key decisions:**
- Treated this as a prompt-compliance gap on the seeded-evidence applicability path, not a rollback of the old Stage 2 contamination fixes. The code still contains the old relevance/applicability architecture; the failing seam was that seeded foreign-government assessment evidence survived as `contextual`.
- Fixed the prompt path instead of adding deterministic domain logic. That stays aligned with the repo rule that analytical text interpretation must remain LLM-driven and not become regex/keyword/domain hardcoding.
- Added a contract test instead of a mocked classification unit test because the issue was missing prompt specificity, not broken TypeScript control flow.

**Open items:**
- Fresh verification run `d763f9507de4430681a471447b12d0fe` was still `RUNNING` when this handoff was written.
- No commit has been created for this prompt/test change yet.

**Warnings:**
- This fix narrows the current leak path, but it does not guarantee perfect model compliance. If the rerun still admits `state.gov` or foreign congressional/government assessment evidence as `contextual`, the next step is stronger contrastive applicability examples or a deeper prompt-diagnosis replay using the stored runtime prompt/output artifacts.
- The March history contains an ambiguity: one archived handoff treated a U.S. State Department Brazil human-rights report as legitimate contextual material, while the contamination-fix plan and current prompt policy treat such foreign government assessments as `foreign_reaction`. That ambiguity likely helped this seam survive without a targeted prompt contract earlier.

**For next agent:**
- First check job `d763f9507de4430681a471447b12d0fe`. If it succeeds, compare its `resultJson.meta.promptContentHash` against `3cacb809...` and inspect whether any evidence from `https://www.state.gov/reports/2024-country-reports-on-human-rights-practices/brazil` survives and is cited in `claimVerdicts`.
- If the rerun is still contaminated, inspect the exact applicability output for those evidence items before changing code again. The key question is whether the strengthened prompt still gets ignored, or whether a different foreign-government source family is now the dominant leak.

**Learnings:**
- When foreign-jurisdiction contamination reappears, do not start with Stage 2 search relevance only. Check whether the offending evidence is seeded. Seeded preliminary evidence enters at `research-orchestrator.ts:931` and depends on the applicability classifier as the last guardrail.
- Compare the bad job's `promptContentHash` against `config_active` before assuming prompt rollout drift. In this case there was no drift; the live bad job was using the then-active prompt blob.
