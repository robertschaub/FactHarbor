# 2026-05-28 Lead Architect + LLM Expert - Bolsonaro Statement Regression Attribution

## Task

Investigate the suspected regression for the exact input:

`The legal proceedings and the verdicts against Jair Bolsonaro regarding the attempted coup d'état complied with Brazilian law and international standards`

Captain asked to compare local/current and deployed `2f7a2805c44c3a72f9102c94f54aee30bd114ba9`, and to submit up to five jobs from a branch/worktree at `406393c9c53a7e78cfd2c351875e01ab0f965220` into the current local database.

## Execution State

- Current main at investigation start: `2ac6cd029ce7b3e87fd50c98928b4067d5fbe1cf` plus dirty non-report-generation/UI/docs/dependency state.
- Deployed production comparator: `2f7a2805c44c3a72f9102c94f54aee30bd114ba9`.
- Temporary worktree used: `C:\DEV\FactHarbor-406393c9`.
- `localhost:3000` was restored to current main after the runs.
- Five exact-input jobs were submitted into `apps/api/factharbor.db` with `ExecutedWebGitCommitHash=406393c9c53a7e78cfd2c351875e01ab0f965220`.

## Comparator Reports

Deployed `2f7a` exact-input public reports:

- `2668c3c5d8a940dba38cda7e51c9adbc`: `LEANING-TRUE`, 63/59, prompt `5a77affe...`, two claims, both `LEANING-TRUE`.
- `8a17a5cf80334bad933cfab22b1b8342`: `LEANING-TRUE`, 69/62, prompt `5a77affe...`, two claims, one `MOSTLY-TRUE` and one `LEANING-TRUE`.

Current/local exact-input reports before the 406 run:

- `3871ad3bc634403fb70f5a4414a5df15`: `UNVERIFIED`, 50/0, `report_damaged`, current main dirty suffix.
- `1b4934dde4424e968b753053632a894e`: `UNVERIFIED`, 57/41, current main dirty suffix.

## 406 Jobs Submitted

Baseline 406 runner jobs:

- `722854e0081c4add91eb844e3cfe8a86`: `LEANING-TRUE`, 60/48, prompt `79a85162...`; two subject-split claims; verdicts `AC_01 LEANING-TRUE 63/55`, `AC_02 UNVERIFIED 57/48`.
- `36bb0745cf0c46bbb8e2bc0c1f1aa217`: `UNVERIFIED`, 50/0, prompt null due early abort; `report_damaged`; three of four cross-product branches extracted, missing `verdicts + international standards`.
- `a652b4fa379644619103ecd94d7b79c3`: `LEANING-TRUE`, 60/40, prompt `79a85162...`; two subject-split claims; verdicts `AC_01 LEANING-TRUE 62/55`, `AC_02 UNVERIFIED 58/35`.

Additional 406 jobs after attempting to set `GOOGLE_CSE_MIN_INTERVAL_MS=0`:

- `94d839c731b04179b0b95b76c7253e66`: `MIXED`, 56/45, prompt `79a85162...`; two subject-split claims; verdicts `AC_01 LEANING-TRUE 58/55`, `AC_02 UNVERIFIED 55/45`.
- `4d4676cabfb645b7a26378802081de7e`: `UNVERIFIED`, 50/0, prompt null due early abort; `report_damaged`; same missing `verdicts + international standards` branch.

Important caveat: the "throttle disabled" attempt was not a valid off-control because `406393c9` implements `const GOOGLE_CSE_MIN_INTERVAL_MS = Number(process.env.GOOGLE_CSE_MIN_INTERVAL_MS) || 700`, so an env value of `0` falls back to `700`. This does not change the root conclusion because the hard failures abort in Stage 1 before Stage 2 research.

## Root Mechanism

The regression is reproduced by `406393c9`, but the evidence does not isolate a specific post-`2f7a` code commit as the cause.

The hard failure mechanism is Stage 1 claim contract/decomposition instability:

- Damaged 406/current jobs extract three cross-product branches:
  - proceedings + Brazilian law
  - verdicts + Brazilian law
  - proceedings + international standards
- They omit:
  - verdicts + international standards
- The contract validator then requires all four branches and terminates the report as `report_damaged`.

The deployed `2f7a` reports did not fail this way. They accepted two-claim decompositions:

- either subject split: proceedings with both frameworks, verdicts with both frameworks;
- or framework split: proceedings+verdicts under Brazilian law, proceedings+verdicts under international standards.

This means the practical regression is not merely "truth score lower"; it is a Stage 1 instability where valid two-claim decompositions and invalid partial four-branch decompositions alternate on the same input.

## Commit Attribution

Exonerated for the hard `report_damaged` path:

- Post-406 commits: the failure reproduces at `406393c9`, so later current-main commits are not required for the hard regression.
- `406393c9` search throttle: hard failures occur before research; the invalid throttle-off control still produced the same Stage 1 pattern, and the mechanism does not fit search throttling.
- `d2d06f83` / `6164ef8e` claim auto-selection as hard-failure cause: damaged jobs have `claimSelection=null`; the pipeline exits before Stage 1.5 selection. The Stage 1 prompt sections are identical between deployed prompt `5a77affe...` and current/406 prompt `79a85162...`; only `CLAIM_SELECTION_RECOMMENDATION` was added.
- `d29a1621`, `b9edb48f`, metrics/observability commits: no plausible functional link to Stage 1 extraction semantics; diff is telemetry/provider-error logging.

Weak candidate only for non-damaged report shape:

- `d2d06f83` can affect later report flow by introducing auto-selection, but in these exact-input non-damaged runs the selector selected both extracted candidates, so it did not cause the missing-branch failure and does not explain the hard abort.

Most accurate attribution:

> Regression present by `406393c9`; no specific post-`2f7a` commit proven as the root cause. The proven mechanism is latent/unstable Stage 1 contract-validator decomposition behavior on coordinated subject/framework claims.

## Recommendation

Do not deploy current main if this exact Bolsonaro statement quality is a release gate. The current/406 stack has a material same-input failure rate: two of five 406 jobs `report_damaged`, and the three completed jobs are lower quality than deployed `2f7a`.

Next fix should target Stage 1 contract validation semantics:

- Accept either complete subject split or complete framework split as contract-preserving for coordinated subject/framework claims.
- Reject partial cross-product decompositions only when one decomposition axis is chosen and a branch is omitted.
- Avoid teaching the prompt with Bolsonaro-specific terms; describe the abstract mechanism as coordinated subjects plus coordinated evaluation frameworks.
- Add a focused mocked/unit fixture for the decomposition contract before any live reruns.

Do not spend further jobs on post-406 bisection until the Stage 1 decomposition contract is clarified; the current evidence says the hard failure is already present by 406 and is upstream of research/verdict changes.

## Reviewer Check

An independent reviewer agent challenged the attribution and agreed with the core conclusion, with the caveat that the attempted `GOOGLE_CSE_MIN_INTERVAL_MS=0` control did not actually disable the throttle due to the `|| 700` fallback. The reviewer also agreed that `d2d06f83` / `6164ef8e` cannot explain the hard Stage 1 damaged path, and that the primary mechanism is Stage 1 contract-validator/decomposition instability rather than Stage 2/4 evidence variance.

## Eight-Job Follow-Up

Captain then granted eight more jobs to locate culprit commits, including the option to run specific main commits. The follow-up used clean historical worktrees and search-cache controls rather than changing the main workspace.

### Clean `2f7a` With Current Search Cache

Two clean local runs at `2f7a2805c44c3a72f9102c94f54aee30bd114ba9` were executed with the current local search cache:

- `9dc416717b33455fb23d2ae67682821e`: `UNVERIFIED`, 50/0, `report_damaged`, prompt null due early abort; three claims and missing the `verdicts + international standards` branch.
- `d0ffe6f3b9b74520829960a8617106d9`: `UNVERIFIED`, 50/0, `report_damaged`, prompt null due early abort; same three-claim missing-branch pattern.

Conclusion: the current/local search-cache state can make even clean `2f7a` fail. The initial simple attribution "post-`2f7a` code caused all failures" is therefore incomplete.

### Clean `2f7a` With Fresh Empty Cache

Two clean local runs at `2f7a` were then executed with a fresh temporary empty search cache:

- `6f9dc825ef2644a1a5b6ef1e40836d30`: `LEANING-TRUE`, 64/58, prompt `5a77affe...`, two claims. The split was framework-based: Brazilian-law compliance and international-standards compliance.
- `217a6c78d10b441887bef14a8950da7a`: `LEANING-TRUE`, 66/55, prompt `5a77affe...`, two claims. The split was subject-based: proceedings compliance and verdicts compliance.

Conclusion: with fresh cache state, clean local `2f7a` reproduces the deployed-good shape. This confirms the deployed `2f7a` comparator remains meaningful, while also proving cache/preliminary-evidence state is a material variable.

### `406393c9` With Fresh Empty Cache

Two runs at `406393c9c53a7e78cfd2c351875e01ab0f965220` were executed with a fresh temporary empty search cache:

- `6a935079d93f4bfda1a39cb5eda558a3`: `UNVERIFIED`, 50/0, `report_damaged`, prompt null; three claims and `contract_validation_retry_triggered`.
- `8ef59352148942caa1ffb4a4a8f9ff75`: `UNVERIFIED`, 50/0, `report_damaged`, prompt null; three claims and `contract_validation_retry_triggered`, missing the `verdicts + international standards` branch.

Conclusion: fresh cache alone does not save `406393c9`. A code/config/runtime difference between `2f7a` and `406393c9` is required to explain the worse failure rate.

### `406393c9` With Populated Good `2f7a` Cache

Two runs at `406393c9` reused the populated search cache created by the good fresh-cache `2f7a` runs:

- `8e96b3552c824fe6bae73ded96949af1`: `LEANING-TRUE`, 59/33, prompt `79a85162...`, two claims, but both claim verdicts were weak/`UNVERIFIED` and warnings included contract retry plus verdict-grounding/direction repair.
- `63d1d35cc3294cd594daf95ac8a69703`: `UNVERIFIED`, 50/0, `report_damaged`, prompt null; three claims missing the `verdicts + international standards` branch.

Conclusion: good `2f7a` cache state is not sufficient under `406393c9`. The follow-up narrows the culprit to an interaction between Stage 1 decomposition instability and the `2f7a..406393c9` runtime/code/config path, with current search-cache state acting as an amplifier.

## Revised Culprit Assessment

The best supported conclusion after all thirteen submitted 406/2f7a-local jobs is:

- There are two interacting variables, not one single clean culprit: current/local search-cache state can make even clean `2f7a` fail, and the `2f7a..406393c9` path makes `406393c9` fail or degrade even with fresh/good cache.
- Post-`406393c9` commits are not required for the hard regression.
- Claim auto-selection (`d2d06f83`, `6164ef8e`) is not the hard-failure root because damaged jobs exit before Stage 1.5 and have `claimSelection=null`. The added selector prompt section is loaded separately and is not rendered into Stage 1 extraction/validation sections.
- The `406393c9` Google-CSE throttle is not the hard root because `406393c9` still fails with fresh cache and with the good `2f7a` cache.
- Evidence-ID and observability commits are not plausible hard Stage 1 roots, though evidence-ID changes can still affect later weak-verdict/grounding behavior in non-damaged reports.
- `b692ae17 fix(llm): disable Anthropic prompt caching on main` is a deliberately desired cost-control change, cherry-picked from the earlier prompt-caching-off decision. It should not be reversed as a fix. At most, it can be used diagnostically as a runtime-envelope boundary because the rendered Stage 1 prompt sections and claim-extraction semantics are otherwise effectively unchanged, while that commit changes the Anthropic call options for Stage 1 LLM behavior.

Captain correction: Anthropic prompt caching should remain off because measured costs exceeded benefits. Therefore any `b692ae17` A/B is diagnostic only. If disabling caching exposed different model behavior, the proper fix is still to make Stage 1 decomposition/contract handling robust under the caching-off runtime, not to re-enable caching.

### Prompt-Caching Validity Caveat

Captain asked whether prompt caching was on during some tests. Yes:

- Deployed `2f7a` reports and local clean `2f7a` reruns used code where `getPromptCachingOptions(...)` returned Anthropic `cacheControl: { type: "ephemeral" }` for Anthropic calls.
- `406393c9` runs and current-main runs used code where `getPromptCachingOptions(...)` returns `undefined`, so Anthropic prompt caching is off.
- Local metrics for the eight follow-up jobs showed `cacheReadInputTokens=0` and `cacheCreationInputTokens=0` for all jobs, including the `2f7a` runs, but the `2f7a` request envelope still included the cache-control flag.

Implication: the local `2f7a` reruns and deployed `2f7a` reports remain useful as historical/deployed comparators, but they are not clean validation evidence for the intended current runtime where Anthropic prompt caching is off. Do not use "good `2f7a` with caching-on request envelope" as proof that the off-caching current deployment is safe.

## Revised Recommendation

Do not deploy current main while this exact Bolsonaro statement is a release gate. The current stack has both hard-damaged reports and weak completed reports for the same input.

If more live-job budget is available, spend it on targeted culprit isolation rather than broad reruns:

1. Prefer spending the next jobs on a forward Stage 1 contract-stability fix, not on re-enabling prompt caching.
2. If attribution still needs tightening before coding, run two jobs at `b692ae17^` and two jobs at `b692ae17` with the same good `2f7a` search cache. Treat the result as diagnostic evidence about when the runtime envelope exposed the instability, not as a rollback recommendation.
3. If both sides are unstable, stop treating `b692ae17` as a useful boundary and keep the fix path on Stage 1 decomposition-contract stability.

The forward fix should still be generic Stage 1 decomposition-contract stability: coordinated subjects plus coordinated evaluation frameworks must accept complete subject-splits or complete framework-splits, and only reject partial cross-product decompositions when a branch is omitted.

## Twelve-Job Cache-Off Commit Grid

Captain then clarified that Anthropic prompt caching must always remain off, including in UCM defaults, and asked for an intelligent up-to-12-job strategy on `master`/main commit states that first classifies risky changes and then circles the likely culprit area.

### Strategy

The controlled strategy treated `b692ae17` as the first clean cache-off master commit and made all pre-`b692` runs execute with prompt caching forcibly disabled by applying the `b692ae17` cache-off patch without committing it. This made the old commits usable for the current required runtime without re-enabling Anthropic cache-control. All runs used the same populated "good 2f7a" search cache from the earlier fresh-cache `2f7a` successful run, and prompts were reseeded from the historical worktree before each group while restoring current cache-off pipeline defaults afterward.

Risk ordering from source review:

- `d2d06f83 feat(analyzer): enable automatic claim selection`: high surface but not a direct hard-failure candidate because damaged jobs exit before Stage 1.5 selection.
- `6164ef8e fix(web): harden claim auto-selection contract`: same surface, more likely stabilizer than culprit.
- `b692ae17 fix(llm): disable Anthropic prompt caching on main`: required policy boundary, diagnostic only, not a rollback candidate.
- `a446b7cc feat(analyzer): switch evidence IDs to short sequential per-analysis scheme`: plausible later verdict/grounding quality contributor, not Stage 1 hard-root.
- `406393c9 feat(search): throttle Google-CSE`: plausible acquisition/cache amplifier, not Stage 1 hard-root.
- `d29a1621`, `b9edb48f`, `0fee6ef8`: observability/metrics/provider diagnostics, low hard-root risk, bracketed by neighboring runs.

### Jobs Submitted

All 12 jobs were submitted into the current local `apps/api/factharbor.db` using the exact Captain input and annotations beginning `Bolsonaro culprit search`.

| Group | Commit state | Jobs | Result |
|---|---|---|---|
| `2f7a-off` | `2f7a2805...+dirty` with cache-off patch | `ff3a77f4cb334ff8aba241ada1012b7b`, `53b9908b442b41569cce8e86cec11f7d` | 2/2 `UNVERIFIED` 50/0, three-claim missing-branch abort |
| `d2d06-off` | `d2d06f83...+dirty` with cache-off patch | `07513885408c46108d51a2e429d2353f`, `c8cb1f84326d4e28bcc541da1b85f4fa` | 2/2 `UNVERIFIED` 50/0, same missing-branch abort |
| `6164-off` | `6164ef8e...+dirty` with cache-off patch | `0da9f90361124b5599394c678c6876b8`, `117bae4eb021442b93de1002e2c7200e` | 1 `LEANING-TRUE` 58/38, 1 `UNVERIFIED` 50/0 |
| `b692-clean` | clean `b692ae17...` | `aa4fdee763bb4642a022b41ca972c5bc`, `534038b3843143dbb0c1271d6ec01d23` | 1 `LEANING-TRUE` 66/50, 1 `UNVERIFIED` 50/0 |
| `a446-clean` | clean `a446b7cc...` | `35acf17e86874014a16e7c6f3a49db4f`, `1d9966e69da24183abfe7d7a49cbede5` | 1 `MIXED` 57/55, 1 `UNVERIFIED` 50/0 |
| `406-clean` | clean `406393c9...` | `67491a874f0f44db99b54aa4ea5ef0bd`, `9bd5a3096786472e8e515d65d7ede789` | 2/2 `UNVERIFIED` 50/0, same missing-branch abort |

### Attribution After The 12-Job Grid

The hard `report_damaged` regression is not caused by a post-`2f7a` source commit in isolation. It reproduces at `2f7a` as soon as the required cache-off request envelope is applied. That means the deployed `2f7a` public reports remain valid historical comparators, but they are not clean validation evidence for the now-required cache-off runtime.

The concrete hard-failure signature is identical across the failing groups: Stage 1 extracts three of the four coordinated subject/framework branches and omits the branch equivalent to `verdicts + international standards`; contract validation then aborts the report before research/verdict stages can recover.

Most accurate culprit framing:

- Primary root: latent Stage 1 decomposition/contract fragility that predates `2f7a`, exposed under the required Anthropic prompt-cache-off runtime.
- Non-culprit: `b692ae17` must not be reverted or worked around by re-enabling prompt caching; it is policy-correct.
- Exonerated for hard abort: claim auto-selection (`d2d06f83`, `6164ef8e`) because the hard failures exit before selection; search throttle (`406393c9`) because the same hard failure already exists earlier.
- Secondary quality candidates: `a446b7cc` may contribute to completed-report quality drift (`MIXED` completed report after evidence-ID remap), and `406393c9` may amplify hard-failure probability, but neither is the primary Stage 1 root.

### Recommendation After The 12-Job Grid

Do not deploy current main if this exact Bolsonaro statement is release-gating. The right next action is a forward Stage 1 contract-stability fix, not rollback and not prompt-cache reactivation.

The fix should be generic: for coordinated subject plus coordinated evaluation-framework inputs, accept complete subject splits or complete framework splits; reject only partial cross-product decompositions that drop a branch. Implement this with LLM/prompt/contract intelligence and mocked fixtures first, avoiding Bolsonaro-specific wording or deterministic semantic keyword logic. After the fix, spend live jobs on current main only; historical bisecting has reached diminishing returns for the hard root.

Current main runtime was restored after the worktree runs, and active local UCM `pipeline/default` still has `anthropicPromptCachingEnabled = false`.

## Reviewed Forward-Fix Plan

Captain asked for a plan and an independent review before implementing. Two reviewer agents evaluated the plan and disagreed on the mechanism choice:

- Reviewer A recommended prompt/contract-only first because the existing Stage 1 machinery already has Pass 2, contract validation, one retry, and final revalidation. This is the narrowest change and avoids adding another generative stage.
- Reviewer B supported a new completion-repair path, but only with structured LLM gating. They flagged two blockers in the initial plan: current contract-validation output has no structured omitted-proposition field, so parsing summaries would violate the no-deterministic-semantic-logic rule; and a repaired four-claim set could still be centrality-capped back down before final acceptance unless that path is explicitly protected and tested.

### Reconciled Plan

1. **Hold deployment and keep prompt caching off.** Do not rollback and do not re-enable Anthropic prompt caching. Historical bisection is now low yield unless a forward fix fails.

2. **Add the failing shape as mocked Stage 1 fixtures before changing behavior.** Use abstract coordinated wording, not Bolsonaro-specific terms. Fixtures must cover:
   - complete subject-axis split accepted;
   - complete framework-axis split accepted;
   - partial cross-product split rejected;
   - retry success path accepted and not marked `report_damaged`;
   - retry failure path still aborts as damaged.

3. **First attempt: narrow prompt/contract clarification, with explicit Captain approval before landing.** Clarify the abstract contract in Stage 1 prompt text:
   - complete decomposition along one coherent axis is valid;
   - either subject-axis or framework-axis can be complete;
   - partial cross-product decomposition is invalid and should retry into one complete axis, not necessarily a full cross-product.
   This is the lowest-blast-radius attempt and uses the existing LLM validation/retry mechanism.

4. **Validation gate for the first attempt.** Run focused mocked tests, prompt contract/static tests where useful, safe `npm test`, and web build. Then commit, reseed/restart, verify `anthropicPromptCachingEnabled=false`, and spend a small live smoke on current main only. Recommended first smoke: three Bolsonaro EN exact runs. If any `report_damaged` occurs, classify the prompt-only attempt as `keep`, `quarantine`, or `revert` before broadening.

5. **Second attempt only if prompt-only fails: structured LLM completion repair.** Add a new bounded repair mechanism after failed contract retry and before `report_damaged`, but only with structured LLM gating. Do not infer eligibility from prose. Acceptable designs:
   - add a structured `coverageOmission`/`decompositionCoverage` object to contract validation output; or
   - make a new repair prompt output `repairEligible`, `failureKind`, `omittedPropositions`, and `atomicClaims`.
   The repair may add only omitted thesis-direct branches identified by the LLM, must preserve existing claim IDs where possible, must assign new IDs structurally, and must be mandatory-revalidated by the existing `validateClaimContract` path.

6. **Protect repaired complete claim sets from structural truncation.** If a repaired set validates as contract-preserving, ensure all thesis-direct repaired claims survive centrality/Gate 1 selection before final revalidation. This must be structural, not semantic: preserve the LLM-approved contract carriers rather than keyword-matching branch text.

7. **UCM and observability for the repair path.** If the second attempt is needed, add calculation UCM defaults/schema fields such as `claimContractValidation.completionRepairEnabled` and a bounded attempt/addition limit. Register any new info warning in `types.ts` and `warning-display.ts`, or explicitly reuse an existing registered info warning.

8. **Final live validation after the selected fix.** Commit first, restart/reseed, verify cache-off UCM and any new repair flag. Use only Captain-approved inputs. Recommended validation:
   - three Bolsonaro EN exact runs;
   - one to two approved Bolsonaro PT runs;
   - one to two unrelated approved inputs to watch for over-decomposition or new `report_damaged` paths.

### Recommendation

Start with the prompt/contract-only attempt because it is the least invasive mechanism and one reviewer specifically recommended it. Predefine the stop condition: one new cache-off `report_damaged` Bolsonaro EN run after that attempt is enough to stop, classify the attempt, and move to the structured completion-repair plan. The completion-repair path is a credible fallback, but it should not be the first implementation because it adds a new generative stage, UCM surface, warning surface, centrality interaction, and broader test burden.

## Prompt-Only First Attempt Implemented

Captain approved proceeding with the reviewed plan. Implemented the low-blast-radius first attempt only; no new repair stage, UCM flag, warning type, or deterministic semantic logic was added.

Files changed for this attempt:

- `apps/web/prompts/claimboundary.prompt.md`
  - `CLAIM_EXTRACTION_PASS2`: added an abstract coherent-axis rule for inputs where one predicate applies to coordinated subjects/acts/outcomes and coordinated criteria/standards/frameworks/dimensions.
  - `CLAIM_CONTRACT_VALIDATION`: added an abstract complete-axis coverage rule. It states that complete subject-axis and complete criteria-axis decompositions can both preserve contract; a full cross-product is not required; a partial cross-product that omits an in-scope pairing must fail and retry toward one complete axis or every in-scope pair.
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
  - Added mocked Stage 1 fixtures for complete subject-axis acceptance, complete criteria-axis acceptance, partial cross-product recovery on retry, and partial cross-product remaining damaged when retry still fails.
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
  - Added prompt-contract assertions so future edits keep the complete-axis / partial-cross-product doctrine in both Pass 2 extraction and contract validation sections.

Verification passed:

- `npx vitest run test/unit/lib/analyzer/claim-contract-validation.test.ts` — 62 passed.
- `npx vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts --testNamePattern "complete subject-axis|complete criteria-axis|incomplete cross-product|partial cross-product"` — 4 passed.
- `npx vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 372 passed, 1 skipped.
- `npm test` — safe suite passed.
- `npm -w apps/web run build` — passed; postbuild reseeded `claimboundary` prompt from file.
- `git diff --check` — passed before docs update.

Postbuild local UCM state:

- Active prompt `claimboundary` hash prefix: `2fa664904cbe`.
- Active pipeline/default still has `anthropicPromptCachingEnabled = false`.

Live jobs were not submitted in this implementation pass. Per live-job discipline, submit live smoke only after the selected changes are committed and the runtime is restarted/reseeded from that commit. Recommended smoke remains three cache-off Bolsonaro EN exact runs first. If any return `report_damaged`, classify this prompt-only attempt before implementing the structured completion-repair fallback.

## Prompt-Only Smoke Submitted After Commit

Captain then asked to commit and submit. The prompt/cache-off fix was committed as `f1130e4017672e9a0b879d83733aa67738b83d56` (`fix(analyzer): stabilize cache-off coordinated claim extraction`). The web runtime was restarted before submission and `/api/version` reported `f1130e4017672e9a0b879d83733aa67738b83d56+f8974685`; the dirty suffix is from unrelated docs/UI/package worktree changes, not the committed analyzer/runtime files. Active prompt hash for successful full runs was `2fa664904cbe761365a9b220060647441fbc18bfa4299d56244faf6a17d11661`; Anthropic prompt caching remained off in UCM/defaults.

Submitted three exact Bolsonaro EN statement smoke jobs into the current local API database:

- `3e1ac230e42c426f909ffb959fdb44c9` — `UNVERIFIED`, 50%, confidence 24. Extracted a complete two-claim framework-axis split, but the domestic-law claim hit `verdict_integrity_failure`; overall report is not release-quality.
- `42f3f32b3b4f4d3e86c6353856987242` — `UNVERIFIED`, 50%, confidence 0. `report_damaged:error`; extraction still produced an incomplete three-claim cross-product missing the verdicts + international-standards branch after retry. This is a hard validation failure for the prompt-only attempt.
- `ba5afc4446a349feb287701d61fa5516` — `LEANING-FALSE`, 41.9%, confidence 39. Extracted a complete two-claim framework-axis split and completed research/verdict, but it is weak and carries `query_budget_exhausted:warning` plus verdict direction/grounding info warnings.

### Failed-Attempt Classification

Classification: **keep, but insufficient**.

Keep the prompt/contract clarification because it is generic, matches the reviewed contract semantics, passed focused mocked tests and safe suites, and two live runs did use complete framework-axis splits. However, the prompt-only attempt is not an adequate fix: one of three committed cache-off smoke runs still reached `report_damaged`, and another completed with a verdict-integrity failure. Do not deploy current main on this evidence if the exact Bolsonaro statement remains release-gating.

Next recommended action is the already-reviewed second attempt: add a bounded structured LLM completion-repair path after failed contract retry and before `report_damaged`, using structured repair eligibility/output, mandatory revalidation through `validateClaimContract`, and protection against structural truncation of LLM-approved contract carriers. Do not parse validator prose, do not add deterministic semantic repair rules, and do not re-enable Anthropic prompt caching.

## Prompt-Only Experiment Removed

Captain then directed that if the prompt-only attempt does not solve anything, the change should be reset/reverted. Applied a surgical revert rather than reverting the whole prior commit, because the prior commit also contained the required Anthropic prompt-caching lock-off changes.

New commit: `e7deeb8b` (`revert(analyzer): remove ineffective coordinated-axis prompt experiment`).

Removed:

- the `CLAIM_EXTRACTION_PASS2` coherent-axis prompt bullet;
- the `CLAIM_CONTRACT_VALIDATION` complete-axis prompt bullet;
- the prompt-contract assertion for that doctrine;
- the four mocked Stage 1 fixtures added only for the prompt-only attempt.

Preserved:

- `anthropicPromptCachingEnabled: false` in UCM defaults/schema;
- `getPromptCachingOptions()` returning `undefined`;
- cache-off tests and mocks.

Verification after surgical revert:

- `npx vitest run test/unit/lib/analyzer/claim-contract-validation.test.ts` — 61 passed.
- `npx vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 368 passed, 1 skipped.
- `npm test` — passed.
- `npm -w apps/web run build` — passed; postbuild refreshed `claimboundary` prompt hash prefix to `79a85162b1d8`.
- Active pipeline/default still has `anthropicPromptCachingEnabled = 0`.

Current recommendation remains: do not deploy based on the failed prompt-only smoke. Move to the structured LLM completion-repair fallback if the Bolsonaro exact statement remains release-gating.

## Structured Repair Plan Review

Captain asked to call a review on the next proposed fix. Two independent reviewers assessed the structured completion-repair plan.

Reviewer 1: **changes requested**. Main concern: the plan must not add an unreconciled second repair mechanism beside the existing `runContractRepair` / `CLAIM_CONTRACT_REPAIR` path. Any new completion repair must be coordinated with the existing anchor repair path, have UCM controls and warning observability, avoid validator-unavailable fail-open behavior, and protect the whole revalidated contract-preserving claim set through centrality/Gate 1.

Reviewer 2: **approve with mandatory constraints**. Main concern: do not broaden the existing `CLAIM_CONTRACT_REPAIR` prompt directly, because it is intentionally narrow, anchor-verbatim, and currently instructs not to add new claims. Omitted-proposition repair needs its own structured schema/prompt/function, but it must sit in the same contract-repair phase rather than becoming an uncontrolled parallel path. Carrier protection is the critical implementation risk.

Reconciled plan:

1. Do not implement the original plan unchanged.
2. Build a single Stage 1 contract-repair coordinator with two mutually exclusive subpaths:
   - existing anchor repair for verbatim truth-condition anchor preservation;
   - new completion repair for omitted thesis-direct propositions.
3. The completion repair subpath must use structured LLM output only. Either extend contract validation with structured omission fields or have the repair LLM independently compare the original input and current claim set. Do not parse validator `summary` or `reasoning`.
4. Completion repair may add only bounded omitted thesis-direct claims, must preserve existing claim IDs where possible, must structurally assign new IDs, and must be revalidated by `validateClaimContract`.
5. If validator output is unavailable, do not run completion repair unless a structured validator retry succeeds; otherwise keep the current damaged-report path.
6. After successful revalidation, protect the whole revalidated contract-preserving carrier claim set from centrality/Gate 1 truncation, not just `truthConditionAnchor.validPreservedIds`.
7. Add UCM defaults/schema fields for enablement, max attempts, max added claims, and trigger modes. Register/admin-scope info warnings for attempted/accepted/rejected/validation-failed repair outcomes; failed repair leading to abort remains `report_damaged:error`.
8. Required validation before live jobs: mocked omitted-branch repair, invalid repair rejection, validator-unavailable no-fail-open, Gate 1 cannot drop repaired carriers, preservation/refactor of existing anchor-repair tests, focused contract/pipeline tests, safe `npm test`, build/reseed. Then commit before three exact Bolsonaro EN smoke jobs.

Decision: **changes requested on the initial proposal, proceed only with the reconciled coordinator design**. Deployment remains blocked until Stage 1 passes 3/3 exact Bolsonaro EN smoke jobs without `report_damaged`, and verdict-integrity issues are separately assessed.
