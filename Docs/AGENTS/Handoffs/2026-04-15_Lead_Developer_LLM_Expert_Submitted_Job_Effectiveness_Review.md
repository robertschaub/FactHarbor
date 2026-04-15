## Task
Review the user's already-submitted jobs for five exact inputs and determine whether the recent prompt fixes and the new narrow Stage 1 pruning change were effective, and whether they should be kept or modified.

## Scope
- Investigated existing jobs only. No new user-content jobs were submitted in this slice.
- Inputs reviewed:
  - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
  - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
  - `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
  - `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
  - `Plastic recycling is pointless`

## What I checked
- Job metadata via `/api/fh/jobs` and `/api/fh/jobs/:id`
- Per-job prompt hashes via `/api/fh/jobs/:id/prompts?pipeline=claimboundary`
- Stage 1 understanding payloads:
  - `atomicClaims`
  - `gate1Reasoning`
  - `gate1Stats`
  - `contractValidationSummary`
- Final claim verdict splits where relevant

## Findings
### 1. The prompt fixes are effective and should be kept
- Treaty jobs on old prompt hash `5f77ae085dee6b85f835fe87bd375f5e796c07b7728a8ff1eb25dd6155782966`:
  - `8e983f08f2794f20990b76d3d003fc2e` (`rechtskräftig ...`) ended `UNVERIFIED 50`
  - Stage 1 had `preservesContract=false`, `rePromptRequired=true`
- Treaty jobs on new prompt hash `f17e326e48536f4acc71de296ee5e22d3aa883cb3d07d5829f2bfa2486883bc9`:
  - `85843ef4f98144f2afa7a088b9371dd9` (`rechtskräftig ...`) ended `MOSTLY-TRUE 75`
  - `0a533220d8a24bc2ae6335c96a013352` (`... bevor Volk und Parlament ...`) ended `TRUE 92`
  - Both preserved the intended thesis anchor in `contractValidationSummary.truthConditionAnchor`
- Conclusion: the `CLAIM_CONTRACT_REPAIR`, salience, binding, validator, and anti-inference prompt changes fixed a real failure class and should not be rolled back.

### 2. There is still a separate Stage 1 acceptance problem
- `85843ef4f98144f2afa7a088b9371dd9` shows the remaining bug clearly:
  - `AC_01` is the clean anchor carrier and the validator preserves only `AC_01`
  - `AC_02` and `AC_03` are marked `passedFidelity=false`
  - Yet `gate1Stats.filteredCount = 0` and both claims survive into the accepted set
  - Their downstream truth scores were `95` and `97`, while `AC_01` was only `55`, lifting the aggregate result
- `0a533220d8a24bc2ae6335c96a013352` shows the milder variant:
  - `AC_03` failed fidelity
  - It still survived despite `validPreservedIds=AC_01,AC_02`
- Conclusion: the new narrow pruning logic in `claim-extraction-stage.ts` is the right follow-up and should be kept. It targets exactly the failure pattern observed in real jobs.

### 3. The new Stage 1 pruning patch is not yet proven by live job data
- The current live job history does not yet contain a qualifying run on the patched Stage 1 code.
- I restarted the local stack successfully, but did not submit a new user-content job in this slice.
- Therefore:
  - the pruning patch is well-supported by unit/integration tests and by the observed job pathology
  - but it is still awaiting one live treaty run on the current build

### 4. The asylum jobs do not argue against the prompt fixes
- Old prompt:
  - `95d5c3ee235845228f04777e42ecd158` => `UNVERIFIED 52`
- New prompt:
  - `9e8033b9b1ed4990b355f34437d97abc` => `MOSTLY-TRUE 72`
  - `eb7de9adfef6476ca66b68a50faa8178` => `LEANING-FALSE 30`
- Across all three:
  - Stage 1 extracted the same single clean claim
  - Gate 1 fidelity passed
  - Contract preservation passed
- Conclusion: verdict volatility here is downstream research/verdict variance, not evidence that the prompt fixes hurt extraction.

### 5. Bolsonaro and plastic are controls, not evidence against the changes
- Bolsonaro exact-input jobs:
  - `0f4ae17e04ee4e7bb0017dcd222c0626` => `MIXED 49`
  - `3dab7adc2d514c2fae2e2a5003adc97e` => `LEANING-TRUE 60`
  - `8b7b09c54c31425b9160db060ba65055` => `MIXED 54`
- Plastic exact-input jobs:
  - `37ad5e56b89a41d9bb4cb247de3e1377` => `LEANING-FALSE 35`
  - `1f7fc358fb0c42c19de9e62ca8c53ba4` => `MIXED 49`
- All of those jobs still used old prompt hash `5f77ae08...`
- Their Stage 1 sets were contract-approved and all claims passed Gate 1 fidelity
- Conclusion: those jobs do not test the new prompt slice, and they also would not trigger the new pruning rule

## Consolidated verdict
- Keep the prompt fixes in `apps/web/prompts/claimboundary.prompt.md`
- Keep the new narrow pruning change in `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- Do not modify either based on Bolsonaro/plastic/asylum runs
- The only remaining evidence gap is one live current-build run on either of the two treaty inputs to confirm the pruning behavior end to end

## Warnings
- There is still no qualifying live job on the current patched Stage 1 code path. Do not overstate that piece as already proven in production-like runtime.
- Several files in the worktree were already dirty/untracked before or alongside this slice. I did not revert unrelated user changes.

## Learnings
- Prompt-hash comparison across exact-input job pairs is the cleanest way to separate prompt effects from ordinary verdict variance.
- The fidelity telemetry was already strong enough to justify a narrow acceptance-path fix without changing the Gate 1 validator itself.
