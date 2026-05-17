# Report Expectations vs. Post-`best_reports_19.4` / Post-`deployed_22.4` Results

**Date:** 2026-05-05
**Author:** Codex, Senior Developer
**Scope:** Local API database reports in `apps/api/factharbor.db`, exact Captain-defined benchmark inputs plus the Captain-approved SVP PDF control and documented auxiliary report-review inputs, extended back to Git tag `best_reports_19.4`. The earlier post-`deployed_22.4` slice is retained as a sub-window.

## Executive Result

The current promoted commit `1514c632e427f857339827c04132f659d487e3a8` is **not globally best across report quality**, but it is also **not the cause of the Lane 2/3 selected-claim coverage class**. Extending the investigation back to `best_reports_19.4` does **not** produce a safe global rollback commit. It adds one broad but dirty-runtime comparator (`ace3c114+1dab4976`) and confirms that `best_reports_19.4` itself was a narrow dirty-state anchor, not a reproducible all-family baseline.

Current runs on `1514c632` show:

- `asylum-235000-de`: pass against documented expectations.
- `hydrogen-en`: pass against documented expectations.
- `svp-pdf-260324`: pass for ACS/admission/coverage control; latest run no longer repeats the zero-final-evidence selected-claim issue.
- `bolsonaro-en`: clear fail against documented expectations. The failure is not ACS starvation; it is primarily Stage 1 atomicity plus Stage 2 applicability/direction, with Stage 4 as a secondary contributor.

There is **no single safe "best commit" across all families** after `deployed_22.4`. The strongest aggregate scorer with at least three formal benchmark families is `959b7280bc000ce85660b9c56c69959457deed30`, but it only covers 3 formal families, predates later ACS/admission work, and its mechanically good Bolsonaro EN run still merges proceedings and verdicts into 2 AtomicClaims. The broadest post-tag comparator is `945de23604450311199f983a0416f6e54c4cfa53`, covering 6 formal families, but it has weak asylum, Bolsonaro EN, and plastic scores. The correct conclusion is still per-family: use the best commit/job per family as diagnostic comparator, not as a wholesale rollback target.

## Expectation Correction Addendum: 2026-05-09

This WIP contains historical rows written before Captain corrected the expectation sources. Canonical state now lives in `Docs/AGENTS/Captain_Quality_Expectations.md` and `Docs/AGENTS/benchmark-expectations.json`. Do not use older rows in this document to conclude that `MIXED` is acceptable for Bolsonaro or asylum-current-total, or that a high-`TRUE` `bundesrat-simple` report is a failure.

Current corrected expectations:

- `bundesrat-simple`: `TRUE` / `MOSTLY-TRUE`, truth 85-100, confidence 75-95. Preferred exact local comparators: `a6b0e0fc14984926a678a462456bc110` and `a53573047fe64778a76e53cb578900c7`.
- `bolsonaro-en` / `bolsonaro-pt`: `LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-85, confidence 45-75. `MIXED` is not acceptable unless new target-specific evidence overturns the Captain expectation.
- `asylum-235000-de`: `LEANING-TRUE` / `MOSTLY-TRUE`, truth 58-75, confidence 40-70. Caveats belong in source reasoning and confidence, not a neutral verdict direction.

## Full-Stack `2f7a2805` Baseline Addendum: 2026-05-07

After the B-prime hybrid prompt rollback failed, a clean detached worktree was started from `2f7a2805c44c3a72f9102c94f54aee30bd114ba9` on isolated ports `3100` / `5100`, with its own SQLite API DB and UCM DB. This was a diagnostic baseline only; it was not merged, promoted, or used to modify `main`.

One isolated schema bootstrap fix was needed for the old API DB: add nullable/boolean-compatible `Jobs.IsHidden` with default `0`, because the `2f7a2805` EF model already expects the column but its migration sequence did not create it in a fresh DB. This did not change analysis code or prompts.

Three Captain-defined inputs were run through the full old stack:

| Family | Baseline job | Runtime | Result | Structure / evidence | Comparison signal |
|---|---:|---|---|---|---|
| `plastic-en` | `5b0df483d0c743e7a8fe72bf2c319f45` | clean `2f7a2805` | `MOSTLY-FALSE` 27/64 | 3 AtomicClaims; 3 claim verdicts; 97 evidence items; 35 sources; 18 search queries | Passes the expected false-side band and is clearly better than recent local `main` job `1595fc6f` on `ee90c04f`, which returned `LEANING-TRUE` 65/72. |
| `asylum-235000-de` | `1246198d311c46f596f0d4fc0c3184e1` | clean `2f7a2805` | `MOSTLY-TRUE` 74/61 | 1 AtomicClaim; 1 claim verdict; 21 evidence items; 21 sources; 8 search queries | Passes the expected positive-side band and is clearly better than recent local `main` job `5d0ac4b`, which returned `UNVERIFIED` 50/12 on `ee90c04f`. |
| `bolsonaro-en` | `119b8c344b6d4e708503e39346a8a49e` | clean `2f7a2805` | `LEANING-TRUE` 62/55 | 3 AtomicClaims: Brazilian law, proceedings fair-trial standards, verdicts fair-trial standards; claim verdicts `70/70`, `58/52`, `52/45`; 116 evidence items; 42 sources; 28 search queries | Passes the documented positive-side band and is better than recent local `main` jobs from `04dbc99f` through `f72fc08c`, which remained `UNVERIFIED` / `LEANING-FALSE`. |

Important runtime caveat: the old stack is substantially slower and noisier. Plastic took about 24 minutes and Bolsonaro about 27 minutes, with many source-fetch and source-reliability warnings. The old stack should therefore not be treated as an operationally safe rollback target without separate runtime review.

Revised conclusion from this addendum:

- The B-prime result proves that simply restoring old prompt text into current code is not sufficient.
- The full-stack `2f7a2805` result proves that the quality regression is real and likely comes from code/prompt interaction accumulated after `2f7a2805`, not from prompts alone.
- `2f7a2805` is now a high-value diagnostic baseline for `plastic-en`, `asylum-235000-de`, and `bolsonaro-en`.
- A wholesale rollback still needs caution because current main contains later ACS/admission correctness work and because the old runtime has major latency/noise issues.
- The next investigation should diff full-stack behavior between `2f7a2805` and current `main` around Stage 2 acquisition/applicability and Stage 4 evidence-direction use, while separately deciding whether any newer ACS/admission substrate must be re-applied on top of a simplified pipeline.

## Focused Bisection Addendum: 2026-05-08

Purpose: isolate the first regression point for the exact Captain-defined input `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`, after current `main` produced `UNVERIFIED` / false-side reports while `2f7a2805` and `1514c632` produced good reports.

Setup: runs used the isolated worktree `C:\DEV\FactHarbor-bisect-probe` on ports `3200` / `5200`, with fresh per-commit API/config databases. The canonical checkout remained `main`. The probe required local-only fresh-DB bootstrap workarounds for historical API migrations (`ClaimSelectionDrafts` table precreate and `Jobs.IsHidden` column add). These were database setup fixes only, not source changes.

| Commit | Job | Input | Result | Evidence signal | Interpretation |
|---|---|---|---|---|---|
| `1514c632` | `c29d8b41` | asylum-235000-de | `MOSTLY-TRUE` 84/72 | Direct path, exact input preserved. | Good post-Lane-2/3 baseline. Asylum regression is later than `1514c632`. |
| `1514c632` | `f2c56122` | plastic-en | `FAILED` at 60% | API stale watchdog marked terminal before the analyzer finished verdict generation. | Operationally inconclusive; do not use as quality evidence. Confirms old broad runs can still trip stale-watchdog behavior. |
| `ba266a69` | `d1b2b845` | asylum-235000-de | `MOSTLY-TRUE` 75/72 | 30 final evidence, 13 support / 3 contradict / 14 neutral. | Stage 1 multi-claim atomicity slice still passes this input. |
| `a62e60b6` | `4182ad7e` | asylum-235000-de | `LEANING-FALSE` 35/40 | 18 final evidence, 0 support / 2 contradict / 16 neutral. The two contradictions are 2023 standing-population route values; SEM March 2026 tables and SEM calculation guidance are kept neutral. | First isolated bad point. The direction-basis structural contract over-neutralizes support-side numeric/current-stock evidence and lets stale/route-mismatched contradiction dominate. |
| `a62e60b6` | `f5bdbe55` | asylum-235000-de | `UNVERIFIED` 50/35 | 10 final evidence, 1 support / 5 contradict / 4 neutral. Query set again emphasizes `N/F/S`, SEM factsheet/statistics differences, and `unter 235000` routes. | Repeat confirms `a62e60b6` is bad for this family, though the exact failure mode varies by LLM/search variance. |

Current conclusion: the first confirmed Asylum regression point is `a62e60b6` (`fix(stage2): enforce claim-local direction basis`). The mechanism is not ACS admission, Stage 1 atomicity, or Stage 4 alone.

Important reviewer correction: the first bad run did **not** show runtime self-consistency normalization firing (`Direction-basis normalizations: 0`). The failure is therefore not "the normalizer rewrote support to neutral." The more precise mechanism is that the new applicability prompt/schema contract made claim-local direction depend on the new `directionBasis` field, but the LLM did not reliably classify current official aggregate-route evidence as directional. In parallel, the Stage 1 expected-evidence profile and Stage 2 queries drifted toward a narrower `N/F/S` / 2023 comparator route and explicit `unter 235000` contradiction searches. The bad result is an interaction between direction-basis enforcement, expected-evidence profile variance, and source retrieval, not a pure one-line code-normalizer bug.

The direction-basis schema remains risky because missing basis defaults to `ambiguous`, and `claimDirectionByClaimId` is optional. That means future runs can silently leave potentially directional evidence neutral unless the LLM emits the new fields correctly. Tests added by `a62e60b6` cover collateral-context neutralization, but they do not cover the asylum-like invariant: current official stock/component evidence must remain directional, and stale/alternate-route comparator records must not dominate a current-count claim unless the profile explicitly makes that route/timeframe dispositive.

Decision implication: do not keep piling more prompt/code layers on top of the direction-basis lane before simplifying it. The next evidence-backed options are:

1. Quarantine `a62e60b6` and descendants that depend on its `directionBasis` contract, then re-run the three control canaries on a simplification branch.
2. If keeping the mechanism, narrow it to metadata or explicit LLM self-consistency only: do not let defaulted/missing `directionBasis = ambiguous` mutate or prevent existing directional evidence, and require tests/provenance that numeric/current-stock side evidence remains directional before any broader rollout.
3. Keep Lane 2/3 admission/coverage and Stage 1 atomicity work separate; this bisection did not implicate them.

## Direction-Basis Simplification Attempt Addendum: 2026-05-08 Evening

After reviewer debate, Option A from `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md` was implemented on `main` in `324efeb1` (`fix(stage2): reduce direction basis authority`). The intended behavior was to stop missing/defaulted `directionBasis` values from carrying authority, prevent basis-only evidence splitting, and soften the Stage 4 direction-basis binding without fully removing explicit LLM self-consistency normalization.

Later focused amendments attempted to address remaining Stage 2 starvation and Stage 4 citation-direction behavior:

| Commit | Purpose | Validation result |
|---|---|---|
| `f3e9c443` | Keep neutral-only passes researching. | Not implicated as a direct regression, but did not recover quality alone. |
| `d61f7294` | Enforce directional sufficiency. | Not enough to recover Bolsonaro EN. |
| `f7ca0208` | Skip duplicate claim queries. | Plausible budget fix; not enough to recover quality. |
| `fbf47ea2` | Block non-directional citation adjudication in Stage 4. | Narrowly correct, but live Bolsonaro still failed. Keep under review because it preserves some direction-basis authority. |
| `48995373` | Require targeted admitted evidence for sufficiency. | **Reverted** by `49ab262d` after a live Asylum regression. |

Live validation after these changes:

| Commit | Job | Family | Result | Key signal |
|---|---|---|---|---|
| `fbf47ea2` | `2f1bf6271cc641d599d2815d9e6b5092` | `bolsonaro-en` | `LEANING-FALSE` 37/32 | Stage 4 no longer promoted explicit non-directional neutral evidence, but Stage 2 still supplied contradiction-heavy pools. |
| `48995373` | `26679e42118e4a27a68b06c7aa2b8208` | `bolsonaro-en` | `UNVERIFIED` 46/40 | Targeted admitted coverage improved; verdict quality did not. |
| `48995373` | `133bcd7c7e4140a5b4b89db0b60f0c6d` | `asylum-235000-de` | `UNVERIFIED` 50/24 | Unsafe control failure: SEM evidence stating `235,057` persons was marked as contradiction despite the justification noting it satisfies `>235,000`. |
| `49ab262d` | `fa0b0b48ed454c298de9c2c693caf662` | `asylum-235000-de` | `MOSTLY-FALSE` 25/72 | Current main after revert can still fail this control, driven by source/direction variance. |
| `49ab262d` | `afb038bc91884639a57d5b737e5199ce` | `asylum-235000-de` | `MOSTLY-TRUE` 82/72 | Repeat on the same commit can pass, showing high live variance rather than a stable recovery. |
| `49ab262d` | `af77168bd72e4b0db20cbd5aae483adf` | `bolsonaro-en` | `MOSTLY-FALSE` 27/44 | Stable fail with correct 3-AtomicClaim split, but 0 supports and many contradictions for the fair-trial proceedings/verdict claims. |

Current conclusion: the incremental direction-basis repair path has reached the stop rule. The system is still worse than the clean `2f7a2805` diagnostic baseline on `bolsonaro-en`, and `asylum-235000-de` is unstable. The next step should be a simplification/review lane, not another guard or prompt patch:

1. Keep `2f7a2805` as a diagnostic comparator, not an immediate wholesale rollback.
2. Preserve the later ACS/admission and Stage 1 atomicity fixes unless a dependency review implicates them.
3. Reassess whether `directionBasis` should remain diagnostic metadata only; remove or quarantine behavioral locks before adding new evidence-direction machinery.
4. Compare current `APPLICABILITY_ASSESSMENT`, `EXTRACT_EVIDENCE`, and `VERDICT_ADVOCATE` sections against `2f7a2805` and propose a smaller, reviewed prompt surface.
5. Spend the remaining live-job budget only after this simplification plan is reviewed and implemented.

## Superseding Live Investigation Addendum: 2026-05-05 Evening

This addendum supersedes the earlier "current latest" Bolsonaro rows where the newer jobs below are more recent. It does **not** change the broad conclusion: current `main` is a good ACS/admission baseline, but not a stable report-quality baseline for Bolsonaro.

Live jobs submitted from clean `main` at `1514c632e427f857339827c04132f659d487e3a8`:

| # | Family | Job | Status | Result | Prepared / selected | Key observation |
|---:|---|---|---|---|---|---|
| 1 | `bolsonaro-en` | `9ba14bc267a041ddb68d7db5e5caf031` | `SUCCEEDED` | `LEANING-TRUE` 61/40 | 2 prepared, 2 selected | Verdict direction recovered relative to `1ae07d6f`, but confidence is below the expected 45-65 band and Stage 1 still bundles proceedings + verdicts into one AtomicClaim. Both claim-level verdicts were `UNVERIFIED`. |
| 2 | `bolsonaro-pt` | draft `440b29639f344361934ac45a3f01442e` -> job `5a11109215c54e95a0d5d1269d160ca3` | `FAILED` | none | 3 prepared, 2 selected | Stage 1 correctly split procedural-law, constitutional-requirement, and sentence-justice claims. ACS selected the two objective compliance claims and excluded the sentence-justice claim as opinion/low-yield. The run failed later because the API stale-job watchdog marked it failed after no progress update for 15 minutes while the analyzer continued into verdict stages. |

Budget accounting: 2 of 12 jobs used; 10 remaining. No more jobs should be submitted while this WIP document is dirty unless it is stashed or committed first, because live-job hashes must stay clean.

### New Evidence From `bolsonaro-en` Job `9ba14bc2`

The run repeated the structural Stage 1 failure but did **not** repeat the same Stage 2 direct-contradiction flood as `1ae07d6f`:

- Prepared claims:
  - `AC_01`: "The legal proceedings against Jair Bolsonaro complied with Brazilian law."
  - `AC_02`: "The legal proceedings and verdicts against Jair Bolsonaro met international standards for a fair trial."
- Distinct events: 3.
- Selection admission cap: 2, because only 2 candidate claims existed.
- Selected-claim coverage: `zeroTargetedSelectedClaimCount = 0`.
- `AC_02`: 8 provider searches, 2 total iterations, 18 final evidence items.
- `AC_01`: 4 provider searches, 1 total iteration, 33 final evidence items.
- Evidence direction summary after applicability: 8 direct supports, 10 direct neutral, 0 direct contradictions, plus contextual material.
- Claim verdicts: both `UNVERIFIED` (`AC_01` 63/48, `AC_02` 58/35).

Interpretation: the Stage 1 atomicity gap is stable across current English reruns. The Stage 2 directness/direction failure is intermittent: it was severe in `1ae07d6f` and `c9507a15`, but not in `9ba14bc2`. This argues against a single prompt-only verdict fix. The two live English results differ in evidence direction but share the same upstream bundled `AC_02`.

### New Evidence From `bolsonaro-pt` Draft / Failed Job

The Portuguese preparation path is a useful counterexample:

- Prepared claims:
  - `AC_01`: procedural-law compliance.
  - `AC_02`: constitutional-requirement compliance.
  - `AC_03`: sentence justice/fairness.
- ACS ranked all three but recommended/selected `AC_01` and `AC_02`.
- ACS rationale excluded `AC_03` because "justice of sentences" is normative/evaluative and low-verifiability under v1.
- This matches the project rule that ACS is a post-Gate-1 recommendation layer. It does **not** imply Stage 1 should avoid extracting `AC_03`; it did extract it correctly.

The failed final job is a separate runner/stage-latency finding:

- Stage 2 admitted 105 evidence items.
- Applicability produced 75 direct, 29 contextual, 1 foreign-reaction items, with 31 claim-mapping extensions and 26 directional companion clones.
- Stage 3 normalized 103 scopes to 103 scopes, then spent more than 15 minutes in/around clustering/verdict transition.
- The API marked the job failed as stale: "Stale job (no progress update for 15 minutes)".
- The analyzer continued afterwards and emitted ignored status updates (`Verdict debate: self-consistency check`, `challenger`, `reconciler`, `validation`, `Verdict generation complete`, `Aggregating final assessment`, `verdict narrative`) because the job was already terminal `FAILED`.

This is a distinct operational bug: long LLM clustering / verdict calls need heartbeat-safe progress updates or timeout/fallback boundaries. It should not be classified as a Bolsonaro quality verdict.

### Debate Result After Prompt Audit

The prompt-audit / architecture debate converged on a layered root-cause model:

1. **Stage 1 structural correctness:** current English extraction can approve one bundled claim inside a multi-claim set. The existing single-claim atomicity validator only runs when `claims.length === 1`, and prompt Rule 22 is strongest for one-claim collapse. A bundled claim can therefore pass if the set has more than one claim.
2. **Stage 1 target-path scoping:** current English runs can include broader or collateral distinct events; Portuguese preparation stayed closer to the explicit input branches.
3. **Stage 2 applicability/direction drift:** in some runs, protester/partisan opinions, collateral institutional controversies, or overlapping-actor material become `direct|contradicts`. Stage 4 then follows those labels. This is a verdict-swing cause, but not the first structural defect.
4. **Stage 3/runner latency:** the Portuguese job exposed a stale-job watchdog failure while analysis continued. This is a runtime reliability lane, not a prompt-quality lane.
5. **ACS/admission coverage:** still healthy for these jobs. There is no evidence that Lane 2/3 caused the current Bolsonaro failures.

Rejected as immediate fixes:

- Physical prompt split from `2026-04-20_Prompt_Split_Plan.md`: reject for now. Runtime already loads one section per call with `loadAndRenderSection`; physical split changes UCM/admin/provenance mechanics but does not change the model input for the failing calls.
- Stage 4-only prompt repair: reject as primary. Stage 4 is downstream of prepared claim shape and directness labels.
- Deterministic keyword/source/entity filters: reject by AGENTS.md; any semantic repair must be LLM-powered and generic.

### Improved Plan After Live Addendum

Recommended implementation lanes, in order, once Captain approves behavior changes:

1. **Stage 1 multi-claim atomicity / coverage audit.**
   - Add a generic LLM-powered audit in the Stage 1 contract-validation path for multi-claim sets, not just `claims.length === 1`.
   - It should detect bundled independently-verifiable sub-propositions inside any accepted claim and omitted/fused input-authored proposition units across the whole accepted set.
   - Feed failures into the existing Pass 2 retry/repair path with topic-neutral corrective guidance.
   - Validate with `bolsonaro-en`, `bolsonaro-pt`, `bundesrat-rechtskraftig`, `bundesrat-simple`, and at least one solved control (`hydrogen-en` or `plastic-en`).

2. **Stage 2 target-identity / applicability repair.**
   - Add an LLM-powered target-identity bridge check for high-impact directional evidence, especially when evidence is `direct|contradicts`.
   - Topic-neutral principle: same actor/system/institution or prior/parallel/collateral proceeding is contextual unless the evidence item itself documents the evaluated target path or explicitly links the same mechanism to that target.
   - Start with observability and/or recheck of high-impact direct contradictions rather than a deterministic filter.

3. **Stage 3 / runner heartbeat and timeout hardening.**
   - `boundary-clustering-stage.ts` calls `generateText` for clustering without a visible timeout/fallback guard around long model latency.
   - Runner stale detection can mark a job failed while the analyzer continues and emits ignored updates.
   - Add heartbeat-safe progress around long Stage 3/4 calls and a bounded timeout/fallback policy before spending more large PT/SVP jobs.

4. **Prompt governance support, not physical split.**
   - Keep Option E targeted reads.
   - Add section-level manifests/tests only if needed for auditability: section hashes, caller/stage map, schema drift checks.
   - Defer physical split until there is a real maintainability or UCM/admin requirement.

Next validation after fixes should not spend all remaining budget at once. Start with 3-4 serial jobs: `bolsonaro-en`, `bolsonaro-pt`, `plastic-en`, and optionally `bundesrat-simple`; then decide whether SVP or additional repeats are still informative.

## Deep Investigation Round: 2026-05-05

Four independent read-only investigations were run before changing code or prompts:

- Documentation historian / report-quality analyst: scanned the relevant WIP, archive, handoff, and expectation `.md` files back through the April restoration work.
- Prompt auditor: performed a static `/prompt-audit`-style review of `claimboundary.prompt.md`, `source-reliability.prompt.md`, `input-policy-gate.prompt.md`, and `inverse-claim-verification.prompt.md`.
- Data / validation analyst: inspected local DB history and proposed a current-main validation wave.
- Architecture analyst: evaluated whether the prompt split proposal from `2026-04-20_Prompt_Split_Plan.md` should be revived.

Consolidated outcome:

- Preserve the per-family comparator strategy. There is still no clean global rollback target.
- Do not blame Lane 2/3 ACS admission/coverage for current bad reports. Current bad Bolsonaro EN has healthy selected-claim search coverage.
- Do not physically split `claimboundary.prompt.md` as a quality fix. Runtime keeps one UCM prompt blob as the profile authority and renders one section per LLM call; the quality problems are section content, schema drift, and cross-stage doctrine drift.
- Add section-level tooling as a later support lane: section manifest, section hashes/sizes, caller/stage map, and shared parser/test helpers. Defer section-aware admin diff/export until after report-quality fixes because it touches UCM/admin surfaces.
- Use current `main` / `1514c632` for validation. Older commits already have enough comparator data; the missing evidence is repeatable current-stack behavior on exact Captain inputs.

### Prompt Audit Summary

| Prompt | Audit result | Main risk | Current decision |
|---|---|---|---|
| `claimboundary.prompt.md` | 1/9 pass-like | Ambiguous Stage 1 decomposition precedence, evidence extraction schema drift, query-route overload, boundary merge pressure | Do not broad-edit. Use surgical section-level fixes only after live/current artifact confirmation. |
| `source-reliability.prompt.md` | 4/9 pass-like | Hard caps, named/geopolitical assessor examples, source-weighting bias | Separate prompt-hygiene lane; do not mix into Bolsonaro/ACS validation. |
| `input-policy-gate.prompt.md` | 6/9 pass-like | Moderate hygiene/staleness concerns | No immediate quality-blocking action. |
| `inverse-claim-verification.prompt.md` | 8/9 pass-like | Minor generic hygiene concern | No immediate action. |

High-value prompt audit findings:

1. **Stage 1 atomicity ambiguity:** the prompt tells extraction to split independently verifiable coordinated propositions, but contract validation mainly fails the case where the whole returned set has only one thesis-direct claim. It does not reliably fail one bundled claim inside a multi-claim set.
2. **Evidence extraction schema drift:** `EXTRACT_EVIDENCE` describes categories such as `statistical_data` and `expert_testimony`, while the runtime `EvidenceItem.category` enum uses `statistic`, `expert_quote`, `evidence`, etc. The code normalizes strings, but this hides prompt/runtime drift and increases noisy extraction.
3. **Query-route overload:** `GENERATE_QUERIES` has a 2-4 query budget while several prompt paths require current-side, comparator-side, ecosystem, challenge, and source-native routes. This likely contributes to source-yield variance on SVP and official-aggregate inputs.
4. **Target-object evidence drift:** despite existing prompt text, current Bolsonaro evidence extraction still treats protester/partisan opinion and overlapping but collateral institutional controversies as directional contradictions for the target proceeding.

### Current Bolsonaro EN Artifact Finding

The current bad exact job `1ae07d6f` on `1514c632` did **not** fail because ACS selected too many claims or Stage 2 skipped selected claims:

- Submission path: `acs-automatic-draft`.
- Prepared/selected claims: 2.
- Selected claim coverage: `zeroTargetedSelectedClaimCount = 0`.
- `AC_01`: 4 provider searches, 62 final evidence items.
- `AC_02`: 8 provider searches, 52 final evidence items.

The failure starts earlier:

- Salience correctly identified `the proceedings and the verdicts` as a distinct scope anchor.
- Stage 1 nevertheless accepted `AC_02`: "The proceedings and verdicts in the legal case against Jair Bolsonaro met international standards for a fair trial."
- Contract validation approved this as preserving the contract because both explicit proposition units were "covered" by one claim.
- The single-claim atomicity validator did not apply because the returned claim set had 2 claims, not 1.

Best exact structural comparator `91bf6083` on `b5421841` split the same benchmark into 3 prepared and 3 selected claims:

- `AC_01`: Brazilian-law compliance.
- `AC_02`: proceedings met international fair-trial standards.
- `AC_03`: verdicts met international fair-trial standards.

This is the strongest current root-cause candidate, but it is **not** a claim that "3 AtomicClaims alone fixes Bolsonaro." Other comparators separate the dimensions differently:

- `cea25d45` on `a5d2bfe8` prepared 3 claims but selected 2 and still produced `LEANING-TRUE` 63/51.
- `c9507a15` on `f896c889` prepared/selected 3 claims but ended `UNVERIFIED` 52/40.
- `5b32f169` on `df4fbada` returned `LEANING-FALSE` 31/40 without the current Lane 2/3 provenance fields.

Therefore the safer attribution is: Stage 1 contract/audit gap plus Stage 2 evidence direction/applicability drift, with prompt-hash/runtime behavior as a major suspect and Stage 4 as a possible amplifier.

Root-cause matrix:

| Candidate root cause | Likelihood | Evidence |
|---|---:|---|
| Stage 1 misses per-claim atomicity inside a multi-claim set | High | Current `AC_02` bundles proceedings + verdicts; comparator separates them; validator rules only strongly cover one-claim bundles. |
| Stage 2 target-object applicability/direction drift | High | Current `AC_02` has 40 contradicting vs 6 supporting final evidence items, including protester/partisan opinion and collateral Moraes/STF controversies treated as direct contradiction. |
| Stage 4 verdict amplification | Medium | Stage 4 follows a skewed evidence pool and turns it into `MOSTLY-FALSE` / `LEANING-FALSE`; but the first observable skew is Stage 1/2. |
| Lane 2/3 ACS admission/coverage | Very low | Selected claims were admitted and searched; zero selected-claim starvation is 0. |

### Stage Attribution Matrix For New Bolsonaro Runs

Each new `bolsonaro-en` run must be classified using this matrix before deciding what to fix:

| Observed condition | Attribution | Follow-up |
|---|---|---|
| Prepared claims still bundle proceedings + verdicts, or contract validation approves a bundled multi-claim set | Stage 1 atomicity / contract validation | Investigate a multi-claim per-claim atomicity audit or contract validation rule. Do not treat this as ACS. |
| Prepared claims are 3 but selected/final claims drop below 3 because `selectionAdmissionCap` or selection logic excludes one | ACS/admission | Check budget-aware cap and recommendation rationale before Stage 1 or Stage 4 changes. |
| Prepared/selected/final claims are healthy, but off-target protester opinion, partisan criticism, collateral Moraes/STF inquiries, or unrelated institutional controversies remain directional | Stage 2 applicability/direction | Inspect `EXTRACT_EVIDENCE`, applicability assessment, and source/admission directness. |
| Evidence pool is direct and reasonably balanced, but verdict/citations still flip or confidence collapses | Stage 4 / aggregation | Inspect verdict prompts, citation-direction adjudication, and aggregation weighting. |
| Selected claims have `zeroTargetedSelectedClaimCount > 0` or no provider searches | Lane 2/3 regression | Reopen selected-claim admission/coverage lane. |

Capture for every new job:

- prepared, selected, and final claim statements
- `selectionAdmissionCap`, ranked/recommended/selected/deferred IDs
- selected-claim research coverage and zero-targeted count
- per-claim support/contradict/neutral counts, source types, and probative values
- examples of the top directional contradiction/support items, with directness/applicability notes
- prompt hash, config hash, executed commit, dirty suffix, and submission path
- cache/search/fetch provenance where available; label repeat runs as warm-cache unless cache state is reset and documented

### Improved Information Collection Plan

For every current or comparator job used from here onward, collect a row with:

- exact input byte-match vs. benchmark family
- job ID, source (`local-db`, `public-app`, or documented hidden report)
- public JSON inspectability
- created UTC, created commit, executed commit, dirty suffix
- prompt hash and config hash
- submission path and whether ACS admission was active
- prepared claim count, selected claim count, final claim-verdict count
- selected-claim search attempts and zero-targeted count
- verdict label, truth, confidence, boundary count
- stage attribution: Stage 1 atomicity/contract, Stage 2 retrieval/admission/applicability, Stage 3 boundary concentration, Stage 4 reasoning/citation, Stage 5/report surface

Keep two expectation layers separate:

- **Formal bands:** `Docs/AGENTS/benchmark-expectations.json`.
- **Qualitative expectations:** clean official SEM aggregate, absence of state.gov residue, source-native citation quality, evidence diversity, no opinion-as-contestation, and no bundled atomic claims.

Add a staleness register when this document is next reworked:

| Old claim | Source doc | Current evidence | Disposition |
|---|---|---|---|
| "Bolsonaro solved" | April 16 expectations | visible U.S.-citation contamination improved, but current exact EN fails direction and atomicity | Preserve only as "visible contamination improved"; mark report quality open. |
| "`bundesrat-simple` probably solved" | April 16 expectations | latest exact job `TRUE` 96/91 vs older expected 35-60 | Resolved by 2026-05-09 Captain correction: high-`TRUE` is now expected for the literal chronology wording. |
| "Prompt split is needed" | April 20 split plan | runtime already loads sections; current risk is section content/governance | Do not physically split now; add section-level tooling. |

### Revised Validation Plan

Do **not** spend the full 12-job budget immediately. Run a gated mini-wave first on clean `main` at `1514c632`, after restart/reseed or a verified fresh runtime. Use exact `inputValue` from `Docs/AGENTS/benchmark-expectations.json`; do not copy from terminal previews. Do not run older commits until current-main repeatability is known.

Mini-wave:

| # | Input family/control | Purpose | Pass / decision signal |
|---:|---|---|---|
| 1 | `bolsonaro-en` | Critical current regression repeat | Stage attribution matrix decides whether the current failure is stable and which lane owns it. |
| 2 | `bundesrat-simple` | Expectation-corrected exact input | Repeated high-`TRUE` is now the desired shape; use `a6b0...` / `a535...` as preferred comparators. |
| 3 | `plastic-en` | Solved-family / Stage 4 variance control | `FALSE`/`MOSTLY-FALSE`/`MIXED`, truth 10-35, confidence 55-80, >=2 boundaries. |

Optional fourth mini-wave job if the runtime is clean and the first three are still pending/healthy:

| # | Input family/control | Purpose | Pass / decision signal |
|---:|---|---|---|
| 4 | `svp-pdf-260324` | Broad-input ACS/admission/acquisition control | Selected claims must be capped and searched. Treat `UNVERIFIED` selected claims or `budget_exceeded` as residual acquisition/budget findings, not a clean pass. |

Expansion wave, only after the mini-wave is classified:

| # | Input family | Purpose | Pass / decision signal |
|---:|---|---|---|
| 5 | `bundesrat-rechtskraftig` | Anchor-preservation control | Not `UNVERIFIED`; expected label set; truth 35-60 plus noise; >=2 boundaries. |
| 6 | `asylum-wwii-de` | Artifact collection / first current-stack band evidence | No formal pass band; do not update expectations without Captain review. Inspect separation of current count vs WWII comparison and source routes. |
| 7 | `bolsonaro-pt` | Multilingual transfer control | `LEANING-TRUE`/`MOSTLY-TRUE`, truth 58-85, confidence 45-75, >=3 boundaries. |
| 8 | `asylum-235000-de` | Source-quality watch | Formal pass plus source inspection for one clean official SEM aggregate or equivalent source-native umbrella total. |
| 9 | `hydrogen-en` | Solved-family sentinel | `FALSE`/`MOSTLY-FALSE`, truth 5-25, confidence 65-85, distinct efficiency-frame boundaries. |
| 10 | `bolsonaro-en` repeat | Variance check | Apply Stage attribution matrix. |
| 11 | `bundesrat-simple` repeat | Variance check | Confirm high-true chronology with the procedural caveat preserved; do not treat high truth as overclaim by itself. |
| 12 | `bolsonaro-en` repeat | Critical repeat | If repeated failures classify to the same lane, start that lane before spending more validation jobs. |

Operational rule for this wave: the worktree must be clean or docs must be stashed before service restart/submission so the jobs record `1514c632`, not `1514c632+<doc-dirty>`. Current docs-only dirt is enough to add a dirty suffix, and untracked files make the build dirty without their contents being included in the suffix.

## Sources And Method

Expectation sources:

- `Docs/AGENTS/benchmark-expectations.json` — mechanical authority for expected verdict labels, truth/confidence bands, minimum boundary count.
- `Docs/AGENTS/Captain_Quality_Expectations.md` — narrative intent and open issues.

Code/history anchors:

- Tag `best_reports_19.4` = `8f3ca9dd55471881d69bf4c0b7f1c97c5790109b`
- Tag date = `2026-04-19 09:30:31 +0200`
- Tag `deployed_22.4` = `2f7a2805c44c3a72f9102c94f54aee30bd114ba9`
- Tag date = `2026-04-22 09:52:13 +0200`
- DB cutoff used = `2026-04-22 07:52:13` UTC-equivalent. The API DB stores `CreatedUtc` as text with a space separator, so using a literal `T` in the cutoff under-counts five same-day post-tag jobs.

Data source:

- Read-only SQLite query of `apps/api/factharbor.db`, exact `InputValue` matches only.
- 281 exact-input local records matched the benchmark/control set after the cutoff: 271 `SUCCEEDED`, 5 `FAILED`, 5 `CANCELLED`.
- Extended read-only SQLite query from `best_reports_19.4` used UTF-8 exact matching. The extended benchmark/control set contains 364 local records: 352 `SUCCEEDED`, 7 `FAILED`, 5 `CANCELLED`. Including the documented CH/DE fact-checking auxiliary adds 14 more successful rows, for 378 total: 366 `SUCCEEDED`, 7 `FAILED`, 5 `CANCELLED`.
- Public deployed evidence was inspected only through unauthenticated `https://app.factharbor.ch/api/fh/jobs` and `https://app.factharbor.ch/api/fh/jobs/<jobId>` reads. Hidden/deleted/non-public reports are kept as documented evidence only; a successful `/jobs/<id>` shell page is not treated as inspectable unless the backing JSON endpoint is readable.

Scoring note:

- The `score` used below is a local diagnostic score, not a product metric.
- Formal benchmark score starts at 100 and subtracts for wrong verdict label, truth outside band, confidence outside band, and missing boundary count.
- Inputs without formal bands (`asylum-wwii-de`, SVP PDF) are not included in formal aggregate rankings. SVP is scored only for ACS/admission/coverage health.
- Commit hashes are normalized by stripping dirty/runtime suffixes after `+`, e.g. `959b7280...+264aace0` is aggregated under `959b7280...`.

## Current Latest Reports

| Family / control | Expected | Latest job | Date UTC | Commit | Latest result | Structure / coverage | Assessment |
|---|---|---|---|---|---|---|---|
| `asylum-235000-de` | `LEANING-TRUE` or `MOSTLY-TRUE`, truth 58-75, conf 40-70, >=1 boundary | `3ba25fe7` | 2026-05-04 21:18 | `1514c632` | `LEANING-TRUE` 62/68 | 6 boundaries, 1 AtomicClaim, 1 selected/cap 1, 8 searches, 36 final evidence, zero selected-claim starvation | **Pass.** In band and structurally healthy. Stronger 2026-05-03 result `f475b0ab` was `MOSTLY-TRUE` 80/78, which is within the corrected label set and slightly above the truth/confidence band. |
| `bolsonaro-en` | `LEANING-TRUE` or `MOSTLY-TRUE`, truth 58-85, conf 45-75, >=3 boundaries | `1ae07d6f` | 2026-05-04 21:20 | `1514c632` | `LEANING-FALSE` 32/59 | 6 boundaries, 2 prepared claims, 2 selected/cap 2, AC_01 4 searches/62 final evidence, AC_02 8 searches/52 final evidence, zero selected-claim starvation | **Fail.** Wrong verdict direction and truth band. AC_02 merges proceedings and verdicts; expected split is 3 AtomicClaims. Evidence is searched and abundant, so this is not Lane 2/3 starvation. |
| `hydrogen-en` | `FALSE` or `MOSTLY-FALSE`, truth 5-25, conf 65-85, >=2 boundaries | `16b0d093` | 2026-05-04 21:24 | `1514c632` | `FALSE` 7/80 | 6 boundaries, 1 AtomicClaim, 1 selected/cap 1, 8 searches, 62 final evidence, zero selected-claim starvation | **Pass.** Verdict exactly matches expectation. Boundary set preserves tank-to-wheel and well-to-wheel distinctions even though Stage 1 produced one AtomicClaim. |
| `svp-pdf-260324` | No formal benchmark band. ACS control: many prepared claims allowed; admitted selected claims must be capped and searched. | `07405ec5` | 2026-05-05 06:34 | `1514c632` | `LEANING-TRUE` 66/45 | 26+ prepared in family; latest selected `AC_16, AC_13, AC_18`, 3 selected/cap 3, zero selected-claim starvation; coverage: 5/5/5 searches, final evidence 12/3/9, all sufficient | **ACS pass.** Latest run is better than `f77eaea0` because no selected claim has zero final evidence. Still no formal truth/confidence expectation for the whole PDF. |

## Latest Reports For All Formal Benchmark Families

| Family | Latest job | Date UTC | Commit | Result | Expected band | Score | Assessment |
|---|---:|---|---|---|---|---:|---|
| `bundesrat-rechtskraftig` | `6cbb1afd` | 2026-04-28 22:50 | `82bed8c9` | `LEANING-TRUE` 61/73 | labels `MIXED`/`LEANING-TRUE`/`LEANING-FALSE`, truth 35-60, conf 55-85 | 98.2 | Pass within noise. Truth is 1pp above max, below 8pp tolerance. |
| `bundesrat-simple` | `80c4d53f` | 2026-04-24 08:31 | `078be27b` | `TRUE` 96/91 | labels `TRUE`/`MOSTLY-TRUE`, truth 85-100, conf 75-95 | 100 | Pass under the 2026-05-09 Captain correction. Preferred comparators remain `a6b0...` / `a535...` because Captain explicitly selected them as better reports. |
| `asylum-235000-de` | `3ba25fe7` | 2026-05-04 21:18 | `1514c632` | `LEANING-TRUE` 62/68 | `LEANING-TRUE`/`MOSTLY-TRUE`, truth 58-75, conf 40-70 | 100 | Pass. Current run is also the formal-band best post-tag. |
| `asylum-wwii-de` | `5772cbb8` | 2026-04-28 22:52 | `82bed8c9` | `LEANING-FALSE` 42/50 | No formal band yet | n/a | Cannot formally judge. Needs Captain-defined band after isolated current-stack review. |
| `bolsonaro-en` | `1ae07d6f` | 2026-05-04 21:20 | `1514c632` | `LEANING-FALSE` 32/59 | `LEANING-TRUE`/`MOSTLY-TRUE`, truth 58-85, conf 45-75 | 20 | Fail. Latest run is materially worse than expectation and worse than best post-tag comparator. |
| `bolsonaro-pt` | `353fe741` | 2026-05-01 15:16 | `92eef011` | `LEANING-TRUE` 60/57 | `LEANING-TRUE`/`MOSTLY-TRUE`, truth 58-85, conf 45-75 | 100 | Pass. Latest and best post-tag exact run. |
| `hydrogen-en` | `16b0d093` | 2026-05-04 21:24 | `1514c632` | `FALSE` 7/80 | `FALSE`/`MOSTLY-FALSE`, truth 5-25, conf 65-85 | 100 | Pass. Latest and best post-tag exact run. |
| `plastic-en` | `e543bb5e` | 2026-05-01 13:38 | `e45b1515` | `MOSTLY-FALSE` 28/72 | `MOSTLY-FALSE`/`FALSE`/`MIXED`, truth 10-35, conf 55-80 | 100 | Pass. Latest and best post-tag exact run. |

## Best Post-`deployed_22.4` Report Per Family

| Family / control | Best job | Date UTC | Commit | Result | Why best |
|---|---:|---|---|---|---|
| `bundesrat-rechtskraftig` | `bb040bdd` | 2026-04-28 11:52 | `945de23604450311199f983a0416f6e54c4cfa53` | `LEANING-TRUE` 60/82 | Hits label, truth upper edge, confidence band, boundary requirement. |
| `bundesrat-simple` | `80c4d53f` | 2026-04-24 08:31 | `078be27bed6f5a005d8184c06c2412e0dd20c395` | `TRUE` 96/91 | Passes the corrected high-true expectation, but Captain later preferred `a6b0...` / `a535...` as cleaner report-shape comparators. |
| `asylum-235000-de` | `3ba25fe7` | 2026-05-04 21:18 | `1514c632e427f857339827c04132f659d487e3a8` | `LEANING-TRUE` 62/68 | Best formal-band result. Note: `f475b0ab` on `f896c889` was semantically strong at `MOSTLY-TRUE` 80/78 but outside the formal expected label/truth band. |
| `asylum-wwii-de` | n/a | n/a | n/a | n/a | No formal band; do not choose a "best" by score. Latest exact run is `5772cbb8` (`LEANING-FALSE` 42/50) on `82bed8c9`. |
| `bolsonaro-en` | `91bf6083` | 2026-05-01 03:57 | `b5421841ea7f608ddb30906a0de785f365231b12` | `LEANING-TRUE` 63/52 | Best post-tag formal + structural match. Prepared and selected 3 claims: Brazilian law, proceedings fair-trial, verdicts fair-trial. Current `1514c632` regressed to 2 claims and `LEANING-FALSE`. |
| `bolsonaro-pt` | `353fe741` | 2026-05-01 15:16 | `92eef0112b44352ca9d16301c8d7409902c5fd4a` | `LEANING-TRUE` 60/57 | Best and latest post-tag exact run. |
| `hydrogen-en` | `16b0d093` | 2026-05-04 21:24 | `1514c632e427f857339827c04132f659d487e3a8` | `FALSE` 7/80 | Best and latest post-tag exact run. |
| `plastic-en` | `e543bb5e` | 2026-05-01 13:38 | `e45b1515d99ae7a10132ed70b0c37c298278bf85` | `MOSTLY-FALSE` 28/72 | Best and latest post-tag exact run. |
| `svp-pdf-260324` | `07405ec5` | 2026-05-05 06:34 | `1514c632e427f857339827c04132f659d487e3a8` | `LEANING-TRUE` 66/45 | Best ACS/admission/coverage control: 3 selected/cap 3, all selected searched, all selected have final evidence. |

## Commit Ranking Since `deployed_22.4`

Formal benchmark families only; `asylum-wwii-de` and SVP are excluded from this aggregate because they do not have formal bands.

### Highest Mean Score With At Least 3 Formal Families

| Rank | Commit | Commit date | Subject | Formal families covered | Mean score | Notes |
|---:|---|---|---|---:|---:|---|
| 1 | `959b7280bc000ce85660b9c56c69959457deed30` | 2026-04-24 12:25 +0200 | `Fix verdict citation integrity guard` | 3 | 92.2 | Best mean score: Bolsonaro EN 100, hydrogen 100, plastic 76.6. Not broad enough to call globally safe; does not cover current ACS Lane 2/3 work. Its best Bolsonaro EN run was mechanically in band but still had only 2 AtomicClaims, so it is weaker than `91bf6083` as a Bolsonaro quality comparator. |
| 2 | `1377969b6fe08d62eca293db5362cffb8dd5550d` | 2026-04-27 10:08 +0200 | `fix(prompt): treat challenge invalid ids as grounding context` | 3 | 76.6 | Passes Bundesrat/hydrogen but weak asylum. |
| 3 | `1514c632e427f857339827c04132f659d487e3a8` | 2026-05-04 22:56 +0200 | `docs: record lane2 lane3 promotion result` | 3 | 73.3 | Current main. Asylum and hydrogen pass; Bolsonaro EN fails hard. |
| 4 | `945de23604450311199f983a0416f6e54c4cfa53` | 2026-04-28 13:33 +0200 | `Plan prompt hygiene follow-up` | 6 | 66.1 | Broadest useful comparator, but not highest quality. Good on Bundesrat/PT/hydrogen; weak on asylum/Bolsonaro EN/plastic. |

### Broadest Coverage

| Rank | Commit | Formal families covered | Mean score | Pass-like family scores (>=85) | Assessment |
|---:|---|---:|---:|---:|---|
| 1 | `945de23604450311199f983a0416f6e54c4cfa53` | 6 | 66.1 | 3 | Best coverage, not best quality. Useful as broad diagnostic reference only. |
| 2 | `078be27bed6f5a005d8184c06c2412e0dd20c395` | 5 | 62.4 | 2 | Broad but fails Bundesrat-simple and asylum. |
| 3 | `959b7280bc000ce85660b9c56c69959457deed30` | 3 | 92.2 | 2 | Best mean among >=3, but narrow and not atomically clean for Bolsonaro EN. |
| 4 | `1514c632e427f857339827c04132f659d487e3a8` | 3 | 73.3 | 2 | Current main; suitable ACS baseline but not Bolsonaro quality baseline. |

## Detailed Findings

## Second-Role Review And Debate Result

After the initial Senior Developer pass, a separate LLM Expert agent independently repeated the comparison using the same expectation sources, the same local DB, and the same `deployed_22.4` tag boundary. The debate outcome is:

- **Confirmed:** the main conclusion is stable. `1514c632` is an ACS/Lane 2/3 baseline, not a global quality-best commit.
- **Confirmed:** current Bolsonaro EN is a true quality regression, not selected-claim starvation. It has healthy searches/evidence but wrong atomic shape and wrong verdict direction.
- **Confirmed:** SVP has no formal report-level truth/confidence expectation in the docs; it should remain an ACS/admission control unless Captain defines a benchmark band.
- **Corrected:** the exact post-tag DB count is 281 records, not 276, when the cutoff is expressed in the API DB's stored timestamp format. The five additional rows do not change the current/latest or best-family conclusions.
- **Corrected:** dirty commit suffixes must be normalized before commit aggregation.
- **Added caveat:** `959b7280` remains the best narrow aggregate scorer, but its mechanically good Bolsonaro EN run has only 2 AtomicClaims. Therefore `91bf6083` on `b5421841` is the better Bolsonaro quality comparator because it preserves the expected 3 prepared and 3 selected/final claim decomposition.

Consolidated decision: keep the per-family diagnostic-comparator approach. Do not use `959b7280`, `945de236`, or `1514c632` as a wholesale rollback or quality-restoration target.

### 1. Current `1514c632` Is Good For ACS, Not For Bolsonaro Quality

For all current `1514c632` exact jobs inspected:

- `zeroTargetedSelectedClaimCount = 0`.
- Selected claims were within `selectionAdmissionCap`.
- Selected claims received provider search attempts.

This confirms the Lane 2/3 rollout is doing what it was designed to do: prevent over-admission and zero-search selected-claim starvation. The current Bolsonaro failure therefore should **not** be used as a reason to roll back Lane 2/3.

### 2. Bolsonaro EN Current Regression Is Real

Current job `1ae07d6f` on `1514c632`:

- Expected: `LEANING-TRUE` or `MOSTLY-TRUE`, truth 58-85, confidence 45-75, minimum 3 boundaries.
- Actual: `LEANING-FALSE` 32/59.
- Prepared claims:
  - `AC_01`: "The legal proceedings against Jair Bolsonaro complied with Brazilian law."
  - `AC_02`: "The proceedings and verdicts in the legal case against Jair Bolsonaro met international standards for a fair trial."
- Problem: `AC_02` merges proceedings and verdicts. Captain's expectation is three atomic claims: Brazilian-law compliance, proceedings/fair-trial standards, verdicts/fair-trial standards.
- Coverage is healthy: AC_01 had 4 provider searches / 62 final evidence; AC_02 had 8 provider searches / 52 final evidence.

Best post-tag comparator `91bf6083` on `b5421841`:

- Result: `LEANING-TRUE` 63/52.
- Prepared and selected 3 claims, separating Brazilian-law compliance, proceedings fair-trial standards, and verdicts fair-trial standards.
- Coverage healthy, with 84 final evidence items and zero `state.gov` evidence/citation residue in local inspection.

Interpretation: root cause is most likely Stage 1 atomicity plus Stage 2 evidence applicability/direction. Stage 4 follows the skewed evidence pool and may amplify the verdict, but it is not the first cause shown by the current data.

### 3. SVP Latest Run Is Better Than Yesterday's Run

Yesterday's SVP run `f77eaea0` on `1514c632`:

- Selected `AC_19, AC_22, AC_12`.
- All selected searched, but `AC_19` had 6 searches and 0 final evidence, ending `UNVERIFIED`.

Today's latest SVP run `07405ec5` on `1514c632`:

- Selected `AC_16, AC_13, AC_18`.
- All selected searched.
- Final evidence counts: 12, 3, 9.
- All selected claims sufficient.

Interpretation: Lane 3 admission/coverage is stable; acquisition yield remains input/claim dependent. The latest run is the better ACS control result.

### 4. Asylum 235000 Current Run Is A Formal Pass, But The Source-Quality Watch Remains

Current `3ba25fe7` on `1514c632`:

- `LEANING-TRUE` 62/68.
- 1 selected claim, 8 searches, 36 final evidence.
- In formal band and structurally healthy.

This should be treated as a pass. However, the original narrative expectation is stricter than the formal score: the report should consistently surface one clean official SEM aggregate total, not rely on stitched component totals. This document did not perform source-by-source semantic review, so that watch item remains open.

### 5. Hydrogen Current Run Is Clean

Current `16b0d093` on `1514c632`:

- `FALSE` 7/80.
- 6 boundaries.
- Boundary names explicitly include tank-to-wheel, well-to-wheel, well-to-tank, thermodynamic/exergy, storage, and lifecycle distinctions.

This is a clean pass against the documented expectation even though Stage 1 produced one AtomicClaim.

## Extension Back To `best_reports_19.4`

### What `best_reports_19.4` Actually Covers

`best_reports_19.4` is commit `8f3ca9dd55471881d69bf4c0b7f1c97c5790109b` (`fix(analyzer): gate preliminary sources with LLM relevance`). The local DB contains five jobs associated with that clean commit prefix, but the key four report-review jobs ran on `8f3ca9dd+8d56a484`, a dirty tracked-file fingerprint:

| Job | Date UTC | Input class | Result | Runtime hash | Use in this investigation |
|---|---|---|---|---|---|
| `a98ec095` | 2026-04-19 07:52 | CH/DE fact-checking auxiliary | `MOSTLY-TRUE` 73/55 | `8f3ca9dd+8d56a484` | Strong comparator for the old CH/DE-specific issue. |
| `01dfef57` | 2026-04-19 09:26 | Swiss-only fact-checking auxiliary | `LEANING-FALSE` 31/40 | `8f3ca9dd+8d56a484` | Narrow auxiliary; not a benchmark family. |
| `429932cb` | 2026-04-19 09:29 | `bolsonaro-pt` | `MIXED` 54/49 | `8f3ca9dd+8d56a484` | Historical loose-band point only. Under the 2026-05-09 Captain correction, this is not an acceptable PT comparator. |
| `02dc8880` | 2026-04-19 09:41 | CH/DE fact-checking auxiliary | `MOSTLY-TRUE` 72/55 | `8f3ca9dd+8d56a484` | Strongest old CH/DE comparator; supports partial prompt-drift diagnosis, not full rollback. |
| `c1a566f3` | 2026-04-19 10:27 | Swiss-only fact-checking auxiliary | `TRUE` 94/65 | created on `8f3ca9dd+0a116e65`, executed on `9caad992+ff5b6bab` | Mixed provenance; not a clean `8f3ca9dd` data point. |

Conclusion: `best_reports_19.4` is useful as a **specific CH/DE comparator** and as one PT Bolsonaro in-band point. It is not a clean whole-stack quality baseline. The exact dirty fingerprint is not reconstructable from git alone unless that tracked diff was preserved elsewhere.

### Best Local Comparators Since `best_reports_19.4`

| Family / control | Best local comparator since 2026-04-19 | Commit/provenance | Result | Structure / reason |
|---|---:|---|---|---|
| `bundesrat-rechtskraftig` | `bb040bdd` | `945de236` | `LEANING-TRUE` 60/82 | Best formal fit; 6 boundaries, 2 claims. Current latest `6cbb1afd` remains pass-like at 61/73. |
| `bundesrat-simple` | `a6b0e0fc14984926a678a462456bc110` / `a53573047fe64778a76e53cb578900c7` | `eaacd9ce+39837e3a` / `ace3c114+1dab4976`; latest `80c4d53f` / `078be27b` | `TRUE` 97/89; `TRUE` 96/88; latest `TRUE` 96/91 | Captain-corrected high-true expectation. These are now good literal-chronology comparators, with `a6b0...` / `a535...` preferred for report shape. |
| `asylum-235000-de` | `3ba25fe7` | `1514c632` | `LEANING-TRUE` 62/68 | Current best formal fit; ACS coverage healthy. Older `ace3c114+1dab4976` / `b491d9e3` was `MOSTLY-TRUE` 83/70, semantically encouraging but outside formal band. |
| `asylum-wwii-de` | no formal best | latest `5772cbb8` / `82bed8c9` | `LEANING-FALSE` 42/50 | No formal expected band. Public deployed comparators are `MOSTLY-FALSE` 28/40 and 22/77; expectation still needs Captain-approved definition. |
| `bolsonaro-en` | `91bf6083` | `b5421841` | `LEANING-TRUE` 63/52 | Best exact benchmark comparator because Stage 1 prepared 3 claims and admission selected all 3: Brazilian law, proceedings fair-trial standards, verdicts fair-trial standards. Current `1ae07d6f` regressed to 2 prepared claims and `LEANING-FALSE` 32/59. |
| `bolsonaro-pt` | `353fe741` | `92eef011` | `LEANING-TRUE` 60/57 | Best and latest exact PT run; prepared 3 claims, selected 2. Public deployed `3469b325` on `ace3c114` is also good at 62/55 with 3 claim verdicts. |
| `hydrogen-en` | `16b0d093` | `1514c632` | `FALSE` 7/80 | Current best; all key efficiency-frame boundaries visible. |
| `plastic-en` | `e543bb5e` | `e45b1515` | `MOSTLY-FALSE` 28/72 | Best and latest exact run; old parse-failure class remains fixed, but variance watch remains. |
| `svp-pdf-260324` | `07405ec5` | `1514c632` | `LEANING-TRUE` 66/45 | Best ACS/admission control: 3 selected/cap 3, 5/5/5 searches, final evidence 12/3/9. |
| CH/DE fact-checking auxiliary | `a98ec095` / `02dc8880` | `8f3ca9dd+8d56a484` | `MOSTLY-TRUE` 73/55 and 72/55 | Not a Captain benchmark family, but important because earlier investigation found later prompt drift from this state. Latest local exact auxiliary `19b38326` is `LEANING-FALSE` 35/40, so this auxiliary remains unresolved if still desired. |

### Commit Ranking From The Extended Window

Formal benchmark families only; `asylum-wwii-de`, SVP, and auxiliary CH/DE fact-checking are excluded from the numeric aggregate. Commit hashes are normalized for grouping, but dirty suffixes are still material to reproducibility.

| Commit/provenance | Formal families covered | Family-best mean | Important caveat |
|---|---:|---:|---|
| `ace3c114+1dab4976` | 7 | 75.5 | Broadest post-19.4 local comparator, but dirty runtime. It has useful broad evidence, not a clean rollback target. Its `bundesrat-simple` result (`TRUE` 96/88) now matches the corrected expectation, but several other families remain moderate/dirty. |
| `959b7280` | 3 | 91.7 | Best clean narrow aggregate among >=3 formal families, but only covers Bolsonaro EN, hydrogen, plastic. Its Bolsonaro exact run had only 2 claim verdicts, so it is weaker than `91bf6083` as an atomicity comparator. |
| `1514c632` | 3 | 76.7 | Current main; excellent ACS/Lane 2/3 baseline, passes asylum and hydrogen, fails Bolsonaro EN. |
| `945de236` | 5-6 depending on exact aggregation | ~61-67 | Broad diagnostic comparator; good Bundesrat/hydrogen/PT, weak asylum/Bolsonaro EN/plastic. |
| `8f3ca9dd+8d56a484` | 1 formal family plus auxiliaries | n/a as global baseline | Strong CH/DE auxiliary and PT Bolsonaro point only. The tag name overstates its cross-family support. |

Revised decision: **there is still no single best commit hash across all reports**. The best broad local comparator is dirty and not safely reconstructable. The best clean comparator is narrow. The current main is a good ACS correctness baseline but not a report-quality baseline for Bolsonaro. Use per-family comparators.

## Deployed `app.factharbor.ch` Evidence

The deployed public API was queried read-only, without admin key. The relevant public jobs found for Captain benchmark inputs and explicitly referenced comparators are:

| Deployed job | Public detail inspectable? | Input relation | Result | Runtime commit / prompt | Quality use |
|---|---|---|---|---|---|
| `eb02cd2e535a4556a2bc3c29868412a0` | yes: `https://app.factharbor.ch/api/fh/jobs/eb02cd2e535a4556a2bc3c29868412a0` | Bolsonaro EN **variant** with "regarding attempted coup d'état" and "subsequent verdict" | `MOSTLY-TRUE` 73/70 | `b7783872`, prompt `55da2824...` | Strong deployed comparator. It has 3 claim verdicts and aligns with Captain's expected positive-side judgment, but it is not byte-exactly the current benchmark input. |
| `cfd508bc3c944a4b8b015d1c5d11783e` | yes | Same Bolsonaro EN variant | `LEANING-TRUE` 71/66 | `521040e9`, prompt `342b5ef5...` | Earlier deployed positive-side comparator with 3 claim verdicts. |
| `3469b325...` | yes through public search/detail | `bolsonaro-pt` exact | `LEANING-TRUE` 62/55 | `ace3c114`, prompt `5a77affe...` | Good deployed exact PT comparator, 3 claim verdicts. |
| `26432b9b...` | yes | `bundesrat-rechtskraftig` exact | `LEANING-FALSE` 38/80 | `ace3c114`, prompt `5a77affe...` | In formal truth direction/range, but only 1 claim verdict; useful but not perfect anchor-preservation evidence. |
| `6a60b3eb...` | yes | `asylum-235000-de` exact | `MOSTLY-TRUE` 72/70 | `ace3c114`, prompt `5a77affe...` | Good public deployed comparator; close to formal band and source-review candidate. |
| `63e2ecee...` | yes | `asylum-wwii-de` exact | `MOSTLY-FALSE` 28/40 | `ace3c114`, prompt `5a77affe...` | Confirms the variant trends false-side on deployed, but no formal expectation exists. |
| `8ec68105...` / `0fb38858...` | yes | CH/DE fact-checking auxiliary | `LEANING-TRUE` 60/52 and 71/71 | `f1a372bf` and `b7783872` | Confirms auxiliary had good deployed behavior before local prompt-drift investigations. |
| `e95bd017e955433d897fab04342f45e1` | no; backing API returns 404 | user-provided hosted URL in earlier review | n/a | n/a | Must remain "not inspectable"; the public Next.js shell alone is not evidence. |
| `094e88fc`, `0afb2d88`, `b843fe70` | not public-re-fetched here; documented hidden deployed addendum | Bundesrat family | `TRUE` 86, `LEANING-TRUE` 70, `MOSTLY-FALSE` 16 | documented on `f1a372bf` | Accepted as documented internal evidence only. They prove predicate omission, aggregation underweighting, and interpretation injection if the hidden-job record is accepted. |

No public exact deployed job was found for the current exact `bolsonaro-en` benchmark wording through `/api/fh/jobs?q=...`; the strong deployed EN comparators use the older "regarding attempted coup d'état" wording.

## Earlier Investigation Dimensions Reapplied To Newer Reports

| Dimension from earlier investigations | Earlier finding | Newer/local-current evidence | Current assessment |
|---|---|---|---|
| Stage 1 anchor preservation / anti-inference | Bundesrat hidden deployed jobs showed omission of `rechtskräftig`, interpretation injection, and core-assertion underweighting. | `bundesrat-rechtskraftig` latest local `6cbb1afd` is pass-like. `bundesrat-simple` latest `80c4d53f` is `TRUE` 96/91 and now aligns with the corrected high-true chronology expectation. | Hard `rechtskräftig` blocker improved; `bundesrat-simple` is no longer evidence of a formal expectation failure. |
| Stage 1 atomicity on compound legal/fair-trial inputs | Older strong Bolsonaro reports had 3 claim verdicts or 3 prepared claims. | Current exact `1ae07d6f` has 2 prepared/selected claims and merges proceedings+verdicts. `91bf6083` prepared and selected 3 claims; deployed `eb02cd2e` had 3 claim verdicts on variant wording. | Current EN exact regression is confirmed; first fix lane should target generic compound-assertion atomicity before verdict tuning. |
| Stage 2 evidence/source health | Asylum family should reach one clean official SEM aggregate total; CH/DE fact-checking should avoid off-target institutional proxy pages. | Current asylum exact `3ba25fe7` is formally good and well searched, but this pass did not independently prove the one-source SEM aggregate ideal. CH/DE auxiliary latest local `19b38326` remains bad relative to `a98ec095`/`02dc8880`. | Asylum is pass but needs source-quality audit; CH/DE auxiliary remains a prompt/source-health lane if Captain keeps it in scope. |
| Boundary / matrix health | Early April reviews warned about boundary concentration and matrix honesty. | Hydrogen current `16b0d093` has the clearest healthy boundary split. Bolsonaro current has 6 boundaries but bad claim shape and verdict direction; boundary count alone does not prove quality. | Reapplied check confirms boundary count is necessary but insufficient; atomic claim shape and evidence direction are higher signal for current Bolsonaro. |
| Stage 4 verdict/confidence | Bolsonaro had foreign-government contamination fixed by `ec9840ff`; later verdict repair work around Apr 29 had mixed results. | The legacy "regarding attempted coup" wording was consistently positive until Apr 10, went mixed by Apr 19, and became `MOSTLY-FALSE`/`UNVERIFIED`/`LEANING-FALSE` on Apr 29 around `ee1ef6ce`, `952b0847`, `d9adf214`, `afceee1a`. Current exact benchmark still fails on `1514c632`. | Captain's subjective Apr 27/29 regression impression is supported for the legacy Bolsonaro variant. The exact current benchmark has both atomicity and verdict/direction failures. |
| ACS selected-claim coverage | Recent Lane 2/3 issue: selected claims must be admitted within budget and receive provider search attempts. | Current `1514c632` jobs inspected have `zeroTargetedSelectedClaimCount = 0`; SVP latest `07405ec5` has 3 selected/cap 3 and all selected searched. | Lane 2/3 should stay. It fixed a real scheduler/admission class and is not the cause of current bad verdicts. |

## Recommended Next Steps

1. **Do not roll back Lane 2/3.** Current failures do not implicate selected-claim admission or zero-search starvation.
2. **Open a Bolsonaro EN quality lane.** Use current exact fail `1ae07d6f`, exact best comparator `91bf6083`, and deployed variant comparators `eb02cd2e` / `cfd508bc` as the paired evidence. Focus first on generic Stage 1 atomicity for compound legal/proceedings/verdict assessment and Stage 2 applicability/direction. Do not use Bolsonaro-specific terms in prompts or code.
3. **Treat the Apr 29 legacy-Bolsonaro degradation as a real regression window.** The older "regarding attempted coup" wording was consistently positive through Apr 10 and degraded around Apr 19/Apr 29. Use it as supporting evidence for the Bolsonaro lane, while keeping byte-exact benchmark comparisons separate.
4. **Do not full-revert to `best_reports_19.4` or `ace3c114+1dab4976`.** `best_reports_19.4` is too narrow and dirty; `ace3c114+1dab4976` is broader but still dirty and fails important families. Preserve them as comparators only.
5. **Use `959b7280` only as a narrow clean historical comparator, not a rollback target.** It is the best mean scorer among >=3 formal families, but lacks broad coverage and is weaker than `91bf6083` for Bolsonaro atomicity.
6. **Use `945de236` as broad diagnostic comparator only.** It covers most formal families after the tag, but quality is mixed.
7. **Add or update formal expectations for `asylum-wwii-de` and any CH/DE fact-checking auxiliary only after Captain-approved review.** `bundesrat-simple` has now been corrected to the high-true chronology band in the canonical expectation files.
8. **Keep SVP as ACS/admission control unless Captain defines a report-level truth/confidence expectation.**
