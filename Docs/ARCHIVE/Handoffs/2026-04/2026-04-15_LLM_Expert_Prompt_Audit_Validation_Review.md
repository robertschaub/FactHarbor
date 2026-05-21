### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Prompt Audit Validation Review
**Task:** Validate the 2026-04-14 prompt-audit summary against the current prompt files, runtime code, and focused tests, with special attention to the four stated Phase 7b blockers and the highlighted non-blockers.
**Files touched:** Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Audit_Validation_Review.md; Docs/AGENTS/Agent_Outputs.md
**Key decisions:** The four stated blockers are real in the current codebase. ISSUE-01 is confirmed by a live prompt/runtime mismatch: the validator prompt still grants anchor-carrier status on literal substring presence while runtime post-filters cited IDs to thesis-direct claims only. ISSUE-14 is confirmed and is operationally reachable because both binding appendices are loaded whenever salience mode is binding, regardless of salience success. ISSUE-15 is confirmed: the binding validator appendix constrains the chosen anchor list but never explicitly suspends the base prompt's fresh anchor-discovery behavior. ISSUE-02 is a real definition drift between salience's sibling-test framing and the validator's truth-condition-bearing framing, but per the working baseline it should remain deferred until after the next E2 batch because it touches CLAIM_SALIENCE_COMMITMENT. ISSUE-06 also remains valid: fact-check/refusal framing still lives as inline TypeScript user-message text instead of UCM-managed prompt content.
**Open items:** Implement prompt-only fixes for ISSUE-01, ISSUE-14, and ISSUE-15 in the binding appendices and contract validator after approval. Defer ISSUE-02, ISSUE-03, ISSUE-06, and ISSUE-12 until the E2 working baseline freeze lifts or a narrower exception is granted. Add focused tests for binding-mode plus salience-success-false behavior and for prompt externalization of fact-check framing.
**Warnings:** Binding appendix loading is currently keyed only on mode === "binding" in runtime, not on success === true. Existing tests cover audit mode and binding-success cases, but I found no focused test for the failed-salience binding path. The inline fact-check framing is exercised by tests, which means moving it into prompt files will require test updates alongside prompt reseeding.
**For next agent:** Start with apps/web/prompts/claimboundary.prompt.md rule 11 and both binding appendices, then confirm behavior against apps/web/src/lib/analyzer/claim-extraction-stage.ts evaluateClaimContractValidation(...) and the appendix-loading branches. The most actionable references are: prompt rule 11 literal-substring guard at line 454; pass-2 binding appendix at lines 378-386; contract-validation binding appendix at lines 548-553; inline FACT_CHECK_CONTEXT and retry guidance at claim-extraction-stage.ts lines 1933, 1972, 2039, 2128-2129; binding appendix loading at lines 1865-1907 and 2494-2558; current test coverage at claimboundary-pipeline.test.ts lines 1066-1133 and 8685-8690 plus claim-contract-validation.test.ts lines 857-870.
**Learnings:** no

## Evidence Basis

### Recent documentation reviewed

- [Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md](../../WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md)
- [Docs/WIP/2026-04-14_Phase7_E2_Measurement.md](../../WIP/2026-04-14_Phase7_E2_Measurement.md)
- [Docs/ARCHIVE/2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md](../../ARCHIVE/2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md)
- [Docs/Investigations/2026-04-10_Claim_Contract_Run_Review.md](../../Investigations/2026-04-10_Claim_Contract_Run_Review.md)

### Current-build jobs checked directly

Current repository HEAD at review time: `97fb7141857cacd92491161ba92badf1146756ca`.

Direct local job evidence came from `apps/api/factharbor.db`, filtered on `ExecutedWebGitCommitHash LIKE '97fb7141%'`.

Observed current-build sample size:

- 9 local rows matched the current HEAD prefix
- 8 had terminal status at inspection time
- 1 was still `RUNNING`

Representative current-build jobs used below:

| Job | Input family | Outcome | High-signal observation |
|---|---|---|---|
| `d08d573be40641ba848025767b17d84f` | anchored Bundesrat | `UNVERIFIED`, `50`, `0` | salience succeeded, but final contract failed and job emitted `report_damaged` |
| `9d39491315e844889c96b1d80bd04b85` | anchored Bundesrat | `MIXED`, `45`, `78` | same current-build family can also preserve the contract cleanly |
| `433c093ed3324431b6fb6332c78e6cc3` | chronology-only Bundesrat control | `MOSTLY-TRUE`, `72`, `75` | control path is healthier than the anchored path |
| `9dc205aa6b5142b380bcd27ad51ca4f4` | asylum `235 000` | `TRUE`, `88`, `68` | supports the docs claim that this family is on a different axis than anchor preservation |
| `0f4ae17e04ee4e7bb0017dcd222c0626` | Bolsonaro | `MIXED`, `49`, `50` | still structurally variable on current build |
| `37ad5e56b89a41d9bb4cb247de3e1377` | Plastic | `LEANING-FALSE`, `35`, `75` | broad evaluative inputs remain variable, but not necessarily for the same reason as the Bundesrat canary |

## 1. Pains, Issues, And Needs

### 1.1 What the recent docs already say

The recent Phase 7 baseline documents already converge on four operational realities:

1. Phase 5/6 fixed important failure classes but did not close the aggregate R2 problem.
2. Current `main` still has mixed salience-preservation behavior and should be treated as unresolved, not stabilized.
3. The current E2 packet is directionally supportive but not a locally reproduced committed-build closeout.
4. The next responsible move is bounded Shape B work behind a feature flag, not overclaiming from the current measurement surface.

That framing is still correct after direct inspection of current-build jobs.

### 1.2 What current-build jobs add

| Pain / issue | Recent documentation signal | Current-build job evidence | Resulting need |
|---|---|---|---|
| Mixed salience-preservation behavior still exists on current HEAD | The Phase 7 baseline says `main` is unresolved and still shows mixed behavior on the intended corpus. | On the same HEAD prefix, the anchored Bundesrat input produced both a preserved-contract run (`9d3949...`) and a degraded `report_damaged` run (`d08d57...`). | Do not describe current HEAD as stable. Fix the binding-mode contract seams before any stronger success claim. |
| Current E2 evidence is still not decision-grade closeout | The E2 note explicitly says it is architecturally supportive but not a review-honest reproduced closeout. | Local DB inspection found only 9 current-build rows on the current HEAD prefix, not a reproduced 35-run closeout packet. | Keep language review-honest: supportive, not closed out. |
| The anchored canary is weaker than the paired chronology control | The working baseline still treats `R2a` as the primary canary and `R2b` as the paired control. | Current-build control job `433c09...` preserved contract and stayed `MOSTLY-TRUE`, while anchored job `d08d57...` degraded to `UNVERIFIED`. | Focus fixes on thesis-direct anchor preservation and binding semantics, not on broad pipeline reset. |
| Not every current quality problem is the same problem | The baseline separates Bundesrat, asylum, Bolsonaro, and Plastic into different root-cause families. | Current-build asylum job `9dc205...` is healthy, while Bolsonaro (`0f4ae1...`) and Plastic (`37ad5e...`) remain variable in different ways. | Keep the prompt/spec fixes narrow. Do not collapse all instability into one anchor-centric explanation. |
| Current prompt governance is still split across prompt files and inline code | The recent review and role learnings both warn against prompt-critical behavior living outside the prompt system. | Current runtime still appends `FACT_CHECK_CONTEXT` and retry framing from inline TypeScript user-message strings. | Plan prompt-governance cleanup, but keep it out of the pre-E2 freeze slice unless explicitly approved. |

### 1.3 Immediate needs

- Preserve review honesty: current evidence supports bounded implementation, not broad closure claims.
- Fix the live binding-mode contract seams that current-build jobs still expose on the anchored canary.
- Keep the Phase 7 slice narrow enough that the next measurement remains interpretable.
- Separate prompt/runtime correctness work from broader family-quality work.

## 2. Root Causes

### 2.1 Root causes that are live now

| Root cause | Why it matters | Evidence |
|---|---|---|
| Validator prompt and runtime still disagree on anchor-carrier eligibility | The prompt still treats literal substring presence as enough, while runtime accepts only thesis-direct preserved IDs. This creates false-pass prompt behavior that runtime later rejects. | Validated directly in prompt/runtime review; still live in current code. |
| Binding appendices are injected whenever `mode === "binding"`, but prompt text only defines the `success: true` and empty-anchor cases | This makes `success: false` an operationally reachable but underspecified path. | Runtime loads both appendices on binding mode alone; current tests cover binding-success and audit, not binding-failure. |
| Binding appendix does not explicitly suspend base anchor discovery | The model can be asked to both honor the precommitted anchor list and still rediscover its own anchor inventory. | Live prompt text still constrains against the provided anchors without explicitly overriding the base discovery behavior. |
| Salience and validator use similar but not fully aligned anchor concepts | Salience uses the sibling-test / distinguishing-aspect frame; contract validation uses a truth-condition-bearing thesis-direct frame. The difference is subtle but real. | Live prompt text still reflects both formulations. |
| Fact-check/refusal framing still lives inline in TypeScript instead of the prompt system | Reviewability, versioning, and system/user-message boundary discipline are weaker than they should be. | Live runtime still uses inline `FACT_CHECK_CONTEXT` and retry guidance strings. |
| Measurement and implementation claims can still drift apart | The repo has current-build signal and useful docs, but not a locally reproduced current-build closeout packet. | Recent E2 note says so explicitly; local DB sample confirms current-build rows exist but do not constitute the promised batch. |

### 2.2 Root-cause interpretation from current-build jobs

The current-build anchored Bundesrat sample is the clearest live signal.

- In `9d3949...`, salience succeeded, binding mode was active, and the final claim set preserved the contract in one direct claim.
- In `d08d57...`, salience also succeeded and binding mode was active, but the final accepted set expanded into three claims, only one of which preserved the anchored proposition. The persisted summary then correctly marked `contract_violated`, and the job ended with `report_damaged`.

This means the current live problem is **not** that the salience stage cannot find the anchor. The more important live root cause is:

> the system can identify the salient anchor, but the binding/extraction/validation contract is still weak enough that downstream claim shaping can break the anchored proposition anyway.

That is exactly why the remaining Phase 7 blockers are prompt/spec alignment blockers, not evidence that the salience-first idea itself is already disproven.

## 3. Root Fixes And Specification

### 3.1 Root fixes for the current bounded slice

| Priority | Root fix | Specification |
|---|---|---|
| P0 | Align validator prompt rule 11 with runtime directness filtering | In `CLAIM_CONTRACT_VALIDATION`, literal substring presence must not override the thesis-direct requirement. A claim only qualifies as an anchor carrier when it is thesis-direct. |
| P0 | Define binding-mode failure semantics explicitly | In both binding appendices, specify what the model must do when `mode = binding` but `success = false`: treat upstream salience as unavailable/failed, do not treat anchors as authoritative, and do not invent a fake successful precommitment. |
| P0 | Make the precommitted anchor list authoritative in binding mode | In `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`, explicitly suspend fresh anchor discovery from the base prompt and instruct the model to audit only against the provided inventory. |
| P1 | Add focused test coverage for the failure path that is currently live but untested | Add prompt/runtime tests for binding mode with `success = false` in both Pass 2 and contract validation. |
| P1 | Keep audit and binding semantics visibly distinct | The repo should continue to treat audit-only E2 and binding Shape B as separate modes in docs, config, persisted data, and reviews. |

### 3.2 Deferred fixes that remain valid but should stay outside the pre-E2 freeze slice

| Deferred item | Why defer |
|---|---|
| Harmonize `CLAIM_SALIENCE_COMMITMENT` with the validator's truth-condition framing | It touches the frozen salience prompt directly. The issue is real, but the current baseline says do not touch this prompt before the next E2 batch closes. |
| Move `FACT_CHECK_CONTEXT` and soft-refusal retry framing into `claimboundary.prompt.md` | This is the right governance direction, but it touches broader pass-2 prompt plumbing and associated tests. |
| Rework the larger PASS2 precedence hierarchy (`ISSUE-03`, `ISSUE-12`) | High value, but broader than the narrowly bounded blocker slice. |

### 3.3 Specification constraints to carry forward

- Do not touch `CLAIM_SALIENCE_COMMITMENT` or the main `CLAIM_EXTRACTION_PASS2` body before the next E2 measurement closeout unless the freeze is explicitly lifted.
- Keep the first fix slice prompt-only where possible: validator and binding appendices, not broad extraction rewording.
- Treat current-build success as evidence of plausibility, not proof of stability.
- Preserve mode separation: audit-only E2 and binding Shape B must remain explicitly distinguishable.

## 4. Implementation And Verification Plan

### 4.1 Implementation plan

1. Update `CLAIM_CONTRACT_VALIDATION` so thesis-direct precedence is explicit and the literal-substring rule can no longer contradict runtime behavior.
2. Update `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` with an explicit `success = false` branch.
3. Update `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` with both:
	 - an explicit `success = false` branch
	 - an explicit instruction that binding-mode audit uses the provided anchor list only and does not rediscover anchors
4. Leave `CLAIM_SALIENCE_COMMITMENT`, the main `CLAIM_EXTRACTION_PASS2` body, and inline fact-check framing unchanged in this slice.

### 4.2 Verification plan

#### Prompt/runtime verification

- Add or update focused tests in:
	- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
	- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- Required new cases:
	- binding Pass 2 with `success = false`
	- binding contract validation with `success = false`
	- prompt-contract assertion that thesis-direct precedence is explicit in the validator prompt
	- prompt-contract assertion that binding-mode validator text forbids fresh anchor discovery

#### Build / prompt plumbing verification

- Re-seed prompts after editing `apps/web/prompts/claimboundary.prompt.md`.
- Run safe verification only:
	- focused Vitest coverage for the touched Stage 1 tests
	- `npm -w apps/web run build`

#### Current-build behavior checks

After the prompt-only patch lands, re-check a minimal targeted set rather than a broad expensive batch:

1. Anchored Bundesrat canary (`R2a`): expect no `report_damaged` path caused by the known binding/validator mismatch.
2. Chronology-only Bundesrat control (`R2b`): expect no invented normative/legal escalation.
3. One current non-anchor family control (asylum or Plastic) to confirm the slice did not widen into unrelated behavior drift.

### 4.3 Success criteria for this note's findings

This slice should be considered successful when all of the following are true:

- The prompt text and runtime directness rule describe the same acceptance condition.
- Binding mode has explicit semantics for `success = false` instead of falling into prompt ambiguity.
- Binding-mode validator instructions no longer compete with base prompt anchor discovery.
- Focused tests cover the newly specified paths.
- The repo can still honestly say that current-build evidence is supportive but not a reproduced statistical closeout.
