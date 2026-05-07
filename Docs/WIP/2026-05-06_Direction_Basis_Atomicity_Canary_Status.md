# Direction Basis + Atomicity Canary Status (2026-05-06)

## Current branch state

- Branch: `main`
- Latest local commit: `506e3178 fix(stage2): require neutral standards discovery query`
- Effective analysis changes under test: through `9c5e43b0 fix(stage2): distinguish recorded positions from direct records`, acquisition-trace observability in `f9406499` and `04dbc99f`, plus the narrow query-generation prompt contract in `506e3178`.
- Local `main` is ahead of `origin/main`.
- No push performed in this slice.
- Jobs budget consumed in the first slice: 11 of 12.
- Additional Captain budget allocated after trace plan review: 10 jobs.
- Additional jobs consumed so far: 5 (`e3eca1d3...`, `56671233...`, `265eaa34...`, `fb41d4b6...`, `b2d065f4...`). Remaining additional budget: 5.

## Implemented commits

| Commit | Purpose | Current disposition |
|---|---|---|
| `a62e60b6` | Adds `directionBasis` / `directnessJustification` contract and structural self-consistency normalization for claim-local evidence direction. | Keep. Tests/build pass. The telemetry is useful and the normalization is structurally correct, but this alone did not solve Bolsonaro EN. |
| `33d347ca` | Tightens multi-claim atomicity audit so input-authored process/result bundles can trigger high-confidence repair. | Keep. It changed Bolsonaro EN preparation from 2 claims to 3 claims, matching the expected claim split. |
| `f683a605` | Prevents the atomicity audit from treating extractor-generated submetrics, broad standards, or requirement classes as input-authored split bases. | Keep. It fixed Stage 1 preparation failures for Bolsonaro PT and Plastic. |
| `9c5e43b0` | Tightens Stage 2 direction-basis taxonomy: records of allegations, objections, criticism, or non-controlling positions should not be `direct_record`. | Keep for now, but needs further validation. It improved Plastic from `LEANING-TRUE` to `MIXED`, but Bolsonaro EN still failed. |
| `e905b9cc` | Attempted to balance rule-governed target-path support and standards-challenge routes in Stage 1 profiles, Stage 2 queries, and Stage 2 directness justification. | Reverted by `62f7dc16`. The focused tests/build passed, but the Bolsonaro EN live canary regressed from `LEANING-FALSE` 38 / 43 to `UNVERIFIED` 48 / 36 and emitted `query_budget_exhausted`. |
| `f9406499` | Adds bounded acquisition source/evidence transition telemetry to result JSON (`analysisObservability.acquisitionTrace`) for preliminary search, Stage 2 search, fetch, raw extraction, probative filtering, per-source cap, and admission transitions. | Keep. Non-behavioral diagnostic change. Targeted analyzer test and build passed; full `npm test` had one runner-concurrency timeout that passed in isolation. |
| `04dbc99f` | Preserves prepared Stage 1 acquisition trace through draft-backed runs so automatic/interactive reports include preliminary-search trace. | Keep. Non-behavioral diagnostic change. Build and targeted tests passed. |
| `506e3178` | Adds one approved `GENERATE_QUERIES` bullet requiring at least one broad target-specific standards/compliance discovery query for rule-governed standard claims, while forbidding all queries from becoming defect/criticism/dissent/docket/artifact-only routes. | Keep for now. It is a narrow prompt-only edit, explicitly approved by Captain. Prompt contract tests, `npm test`, build, restart/reseed, and three live canaries completed. It improved PT and one EN evidence profile but does not solve EN by itself. |

## Verification commands

- `npm test` after `a62e60b6`: passed.
- `npm -w apps/web run build` after each committed change: passed.
- Focused prompt/stage tests after `33d347ca`, `f683a605`, `9c5e43b0`: passed.
- Focused prompt contract tests, full `npm test`, build, and `git diff --check` passed for the attempted `e905b9cc` patch before live validation.
- After failed live validation, `e905b9cc` was classified as `revert` under debt-guard and reverted in `62f7dc16`; focused prompt contract tests and `npm -w apps/web run build` passed after the revert.
- `git diff --check`: passed before commits.
- Services restarted and health checked before live canaries after committed prompt/config changes.
- For `506e3178`: `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `git diff --check`, `npm -w apps/web run build`, and `npm test` passed. Build reseeded prompt hash `d86e319922c18ee849ed4578d2dc55a6661d370733f3fcb60fb811e052f865b1`.

## Live canaries

| Label | Draft | Job | Commit | Result | Prepared / selected | Assessment |
|---|---|---|---|---|---|---|
| Bolsonaro EN diagnostic | `d569a9b52...` | `dad71208...` | `a62e60b6` | Cancelled | 2 / 2 | Failed Stage 1 expectation. Audit saw medium findings only, so AC_02 still bundled proceedings and verdicts. Cancelled as invalid diagnostic. |
| Bolsonaro EN after process/result fix | `61abd4ba...` | `cdcc9bcd...` | `33d347ca` | `MIXED` 43 / 48 | 3 / 3 | Stage 1 fixed. Stage 2/4 still not positive-side. AC_02 `LEANING-FALSE`; AC_03 `UNVERIFIED`. |
| Bolsonaro PT first control | `76f41e50...` | none | `33d347ca` | Stage 1 failed | 3 / 0 | Atomicity repair over-split generated/broad requirement dimensions and then failed contract preservation. Fixed by `f683a605`. |
| Hydrogen control | `d4b6752c...` | `9cd04065...` | `33d347ca` | `FALSE` 8 / 80 | 2 / 1 | Good negative control. Direct contradiction preservation works for this input. |
| Plastic first control | `d3d4c3f...` | none | `33d347ca` | Stage 1 failed | 3 / 0 | Same over-splitting failure class as PT. Fixed by `f683a605`. |
| Asylum 235000 DE | `a3984522...` | `9d96f92e...` | `f683a605` | `LEANING-FALSE` 30 / 72 | 1 / 1 | Bad relative to expectation. Separate numeric/source-route quality issue remains. |
| Bolsonaro PT rerun | `e2208a8f...` | `b7a1c85d...` | `f683a605` | `LEANING-TRUE` 69 / 67 | 3 / 2 | Stage 1 fixed and verdict direction acceptable. Open: ACS selected 2 of 3, omitting the sentence-justice claim. |
| Plastic rerun | `28f2df18...` | `7e688876...` | `f683a605` | `LEANING-TRUE` 60 / 72 | 3 / 3 | Bad negative control. The system still leans toward "plastic recycling is pointless." |
| Bolsonaro EN after direction taxonomy fix | `cc6d2b2d...` | `7050df80...` | `9c5e43b0` | `LEANING-FALSE` 38 / 43 | 3 / 3 | Bad. Direction-basis taxonomy neutralized more collateral material, but the remaining evidence pool lacked enough operative support and still produced a false-side low-confidence result. |
| Plastic after direction taxonomy fix | `4d87b0f0...` | `7b0d4c56...` | `9c5e43b0` | `MIXED` 48 / 70 | 3 / 3 | Improved from `LEANING-TRUE`, but still not the expected false-side verdict. |
| Bolsonaro EN after route-balancing attempt | `d319911c...` | `45b31c81...` | `e905b9cc` | `UNVERIFIED` 48 / 36 | 3 / 3 | Failed validation. The patch increased broad official/case-docket route pressure but did not recover enough target-specific support. It worsened the verdict and exhausted query budget, so it was reverted. |
| Bolsonaro EN trace without prepared Stage 1 trace | `c676f787...` | `e3eca1d3...` | `f9406499` | `LEANING-FALSE` 40 / 40 | 3 / 3 | Diagnostic only. Confirmed Stage 2 trace works but exposed that prepared Stage 1 trace was not persisted in draft-backed jobs. |
| Bolsonaro EN full acquisition trace | `a42c4d84...` | `56671233...` | `04dbc99f` | `LEANING-FALSE` 34 / 24 | 3 / 3 | Diagnostic result. Confirms support-source loss happens primarily before final evidence: Time.com, Al Jazeera, and Poder360 never entered sourceTrace; HRW appeared only as relevance-rejected Stage 2 results; OAS contradiction material was fetched/extracted/admitted. |
| Bolsonaro EN after neutral standards discovery query | `1acf8bcc...` | `265eaa34...` | `506e3178` | `UNVERIFIED` 55 / 40 | 3 / 3 | Improved one run from false-side to support-only claim verdicts. Queries now included standards/compliance routes (`ICCPR Article 14`, tribunal independence/impartiality, UN HRC). AC_01/02/03 had 7/5/7 supports and 0 cited contradictions, but confidence stayed low due source concentration and lack of independent direct international assessment. |
| Bolsonaro PT control after neutral standards discovery query | `a673586b...` | `fb41d4b6...` | `506e3178` | `MOSTLY-TRUE` 73 / 63 | 3 prepared / 2 selected | Good multilingual control. The prompt edit did not regress PT. Residual: ACS still omits AC_03 (`As sentencas... foram justas`) as `opinion_or_subjective`, which is a separate selection/evaluative-claim lane. |
| Bolsonaro EN replicate after neutral standards discovery query | `6f0d7ac5...` | `b2d065f4...` | `506e3178` | `LEANING-FALSE` 38 / 51 | 3 / 3 | Bad replicate. Queries included the new route class but acquisition/applicability again admitted contradiction-heavy evidence for AC_02/AC_03. Time.com and Al Jazeera remained absent; HRW stayed relevance-rejected; PBS/Poder360 appeared but did not stabilize support. Confirms the narrow query edit is insufficient. |

## Evidence from completed reports

### Bolsonaro EN

Expected:
- 3 AtomicClaims:
  1. Brazilian-law compliance.
  2. Proceedings met international fair-trial standards.
  3. Verdicts met international fair-trial standards.
- Positive-side overall verdict, comparable to earlier good jobs.

Observed:
- `33d347ca` produced the correct 3-claim split, but final result was `MIXED` 43 / 48.
- `9c5e43b0` also produced the correct 3-claim split, but final result worsened to `LEANING-FALSE` 38 / 43.
- `zeroTargetedSelectedClaimCount` remained `0`, so selected-claim acquisition starvation is not the issue.
- The direction-basis distribution improved structurally: many allegations/positions moved to neutral. However, AC_02 and AC_03 still lacked enough target-specific operative support, and AC_02 retained 4 `contradicts / operative_finding` items.
- The reverted `e905b9cc` route-balancing attempt kept the correct 3-claim split but worsened the final result to `UNVERIFIED` 48 / 36 with `query_budget_exhausted`. AC_02 still had too little useful support, AC_03 had zero admitted evidence despite final evidence, and AC_01 accumulated additional operative contradictions.

Current root-cause assessment:
- Stage 1 atomicity is now fixed for this input.
- Stage 2 direction-basis normalization is useful but insufficient.
- A broad prompt-route nudge is not the right next fix. The live failure suggests the next work should first explain why earlier good jobs retrieved or preserved target-specific support sources that current jobs miss, before adding another prompt rule.
- The next likely root cause is acquisition/directness quality: after collateral material is neutralized, the pipeline does not retrieve or preserve enough target-specific legal/fair-trial support evidence for AC_02 and AC_03.
- Stage 4 should remain held until Stage 2 produces a healthier support/contradiction pool.

Offline comparator check after `62f7dc16`:
- Comparator `91bf6083` (`b5421841`, `LEANING-TRUE` 63 / 52) had a much healthier support pool, not merely a different final aggregation:
  - AC_01: 17 supports / 0 contradictions.
  - AC_02: 11 supports / 0 contradictions.
  - AC_03: 9 supports / 0 contradictions.
- The comparator acquired or preserved support-heavy source families that current runs mostly miss or underuse: Time.com, Human Rights Watch, Al Jazeera, PBS, Poder360, Lawfare, and OAS safeguards material.
- Current `7050df80` (`9c5e43b0`, `LEANING-FALSE` 38 / 43) had no Time.com, no Al Jazeera, no Poder360, and only one neutral HRW evidence item. It relied more heavily on Wikipedia, IACHR freedom-expression material, BBC, and preprint/collateral controversy material.
- Failed route-balancing job `45b31c81` (`e905b9cc`) made this worse: Time.com, HRW, Al Jazeera, PBS, Poder360, and OAS were absent from final evidence; Wikipedia, preprint, and one Brasil de Fato article dominated.
- Query-level difference:
  - Comparator queries included broader source-discovery routes such as `IACHR Brazil STF Bolsonaro trial proceedings 2025 fair trial assessment`, `International Commission of Jurists Brazil STF Bolsonaro trial independence judiciary`, and `STF Bolsonaro trial defence rights evidence access closing arguments September 2025`.
  - Current queries skewed toward official case, procedural irregularity, Moraes/impartiality, IACHR/UN monitoring, dissent, and appellate-review routes.
  - The reverted route-balancing attempt pushed even more toward official docket/acordao and challenge routes, exhausting query budget without recovering the support sources.
- Revised hypothesis: the remaining Bolsonaro EN failure is probably a Stage 2 source-route / acquisition / evidence-preservation problem plus residual directness calibration, not a missing generic prompt sentence. Next work should trace where these comparator support sources disappear: query generation, provider ranking, fetch, extraction, applicability, evidence filtering, or final capping.

Trace findings from `56671233...` (`04dbc99f`):
- `analysisObservability.acquisitionTrace` was complete (`sourceTrace=163`, `evidenceTrace=198`, `truncated=false`).
- Missing comparator support families:
  - `time.com`: absent from sourceTrace entirely.
  - `aljazeera.com`: absent from sourceTrace entirely.
  - `poder360.com.br`: absent from sourceTrace entirely.
  - `hrw.org`: appeared in Stage 2 results 3 times but had `relevanceAccepted=false`, so it was never fetched.
- Preserved/used families:
  - `pbs.org`: appeared in preliminary search, fetched, extracted 7 evidence items, final pool had 10 seeded PBS items (4 support / 6 neutral).
  - `lawfaremedia.org`: appeared in preliminary search, fetched, extracted 5 neutral items, final pool had 5 neutral items.
  - `oas.org`: appeared in Stage 2, 9 results / 4 relevant / 4 fetched / 13 extracted; final pool had 5 OAS contradictions with `directionBasis=operative_finding`.
- Current Stage 2 query shape remained skewed toward official/procedural/violation routes:
  - `STF Bolsonaro trial procedural compliance Brazilian constitutional law`
  - `Justice Moraes investigative judicial role impartiality violation international law`
  - `Bolsonaro 27-year sentence proportionality international norms coup conviction criticism`
- Comparator `91bf6083` used broader support-discovery routes:
  - `STF Bolsonaro trial ICCPR Article 14 fair trial standards compliance`
  - `STF Bolsonaro trial defence rights evidence access closing arguments September 2025`
  - `IACHR Brazil STF Bolsonaro trial proceedings 2025 fair trial assessment`
  - `International Commission of Jurists Brazil STF Bolsonaro trial independence judiciary`
- Lowest-confidence area in current evidence: the system does retrieve some PBS/Lawfare support/context from preliminary search, but the missing Time/Al Jazeera/Poder360/HRW families are primarily absent at query/provider/relevance stages, not final Stage 4 citation selection.

Post-`506e3178` canary findings:
- The approved query bullet is active in EN canaries. Both EN runs generated at least one broad standards/compliance route, e.g. `Bolsonaro trial ICCPR Article 14 fair trial standards compliance`, `Bolsonaro STF proceedings tribunal independence impartiality assessment`, `UN Human Rights Committee Brazil Bolsonaro trial fair trial standards assessment`, and `Amnesty International Human Rights Watch Brazil Bolsonaro trial fair trial assessment`.
- EN run `265eaa34...` shows the best post-edit evidence balance so far: every selected claim received search attempts, final claim verdicts cited support and zero contradiction, and final evidence came from PBS, STF, NPR, OAS, SCIRP, and other sources. The final verdict still remained `UNVERIFIED` because AC_02 lacked independent direct international assessment of the specific proceedings and because support was concentrated in court/self-record and secondary reports.
- EN replicate `b2d065f4...` shows the fix is not stable: final verdict returned to `LEANING-FALSE`, with AC_02 at `LEANING-FALSE` 35 / 52 and AC_03 at `LEANING-FALSE` 32 / 50. Time.com and Al Jazeera were still absent from sourceTrace, HRW appeared only as relevance-rejected results, and some PBS evidence became contradiction-bearing.
- PT control `fb41d4b6...` passed: `MOSTLY-TRUE` 73 / 63, AC_01/AC_02 had 40/43 supports and zero contradictions, and source acquisition recovered large support pools from STF, BBC, Migalhas, Agencia Brasil, Poder360, MPF, and other Portuguese-language sources.
- Revised conclusion: `506e3178` is a low-risk, useful query-route floor but not a complete fix. The remaining EN failure is not due to zero selected-claim acquisition, not Stage 1 atomicity, and not simply absent standards-query routes. It is a combined English source acquisition / relevance / applicability preservation problem, with possible residual over-admission of collateral contradiction-bearing sources.

Reviewer convergence after `506e3178`:
- Two independent reviewers recommended **keeping** `506e3178`: it is narrow, active in the canaries, does not regress PT, and helps one EN run, but it is insufficient.
- Both reviewers rejected the next broad-query route, broad relevance-threshold, domain whitelist, source-provider redesign, and Stage 4 verdict-repair paths for the immediate slice.
- Both reviewers identified the smallest next fix surface as `APPLICABILITY_ASSESSMENT` / claim-local direction-basis calibration: unresolved concerns, overlapping-actor controversies, dissent, and adjacent institutional investigations can still become `direct_record` or `operative_finding` contradictions when they lack a concrete target-path bridge to the evaluated proceeding or verdict.
- Reviewer nuance: do not treat HRW/Amnesty/ICJ rejection as proven wrong from these canaries. Several rejected hits were genuinely off-target older or broad pages. The proven defect is the promotion of adjacent/collateral concern material into directional contradiction and the instability of target-specific support preservation in EN.
- Prompt edits remain Captain-approved only. The next proposed change should be a small, generic strengthening of directness/direction-basis self-consistency, not another route-balancing edit.

### Plastic

Expected:
- False-side result: "Plastic recycling is pointless" should be contradicted by evidence that recycling has at least some practical/environmental/economic value.

Observed:
- `f683a605`: `LEANING-TRUE` 60 / 72.
- `9c5e43b0`: `MIXED` 48 / 70.
- `9c5e43b0` improved the evidence direction balance, especially for AC_02, but AC_01 and AC_03 still had many `supports / direct_record` items for claims framed as "pointless in terms of practical effectiveness" and "pointless in terms of environmental impact."

Current root-cause assessment:
- The issue is not zero-search starvation.
- The likely issue is claim framing and adjudication of broad evaluative predicates: low recycling rates and practical limitations are being treated as support for "pointless", while evidence of partial benefit is not weighted enough to refute the absolute predicate.
- This is a separate Stage 1/Stage 4 quality lane, not the Bolsonaro Stage 2 collateral-material lane.

### Asylum 235000 DE

Expected:
- Earlier expectation was that the claim should not be false-side merely because of category/stock-route confusion.

Observed:
- `f683a605`: `LEANING-FALSE` 30 / 72.
- `zeroTargetedSelectedClaimCount` was `0`.

Current root-cause assessment:
- Separate numeric/source-route quality issue. Do not use this as evidence for or against the Bolsonaro direction-basis lane.

## Recommendations

1. Keep the four effective local commits through `9c5e43b0` for now. The first three clearly fix observed Stage 1 / structural contract issues. The fourth improves Plastic and moves the taxonomy in the correct architectural direction, but it needs more work.
2. Keep the revert `62f7dc16`. Do not reapply `e905b9cc` or stack another broad prompt-route rule on top of it without new source-level evidence.
3. Keep acquisition-trace observability (`f9406499`, `04dbc99f`) as diagnostic substrate unless reviewers find a simpler trace path. It is additive and does not change analysis decisions.
4. Stop live jobs for this lane until reviewers inspect the post-`506e3178` traces. The live evidence now has two EN failures plus one PT pass under the same prompt hash, which is enough to choose the next hypothesis without spending more budget.
5. Candidate next fix surface is not Stage 4 and not another broad query prompt rewrite. The next likely surfaces are:
   - source acquisition/provider diversity for English rule-governed proceedings claims;
   - relevance acceptance for HRW/Amnesty/ICJ-like international legal/human-rights sources when they are target-specific enough;
   - applicability/directness handling for records that are relevant as safeguards/context but are currently converted into contradiction-bearing items;
   - source preservation/capping when preliminary support sources are present but not retained as useful direct support.
6. Before editing again, get reviewer agreement on whether `506e3178` should remain as the narrow route floor and what the next smallest evidence-backed change should be.
7. Proposed next prompt-only slice, pending Captain approval:
   - Amend `APPLICABILITY_ASSESSMENT` so for rule-governed standard claims, `operative_finding` or `direct_record` requires a concrete bridge to the same evaluated proceeding, decision, verdict, safeguard, remedy, or standards outcome.
   - If the evidence only records a potential conflict, institutional concern, non-controlling dissent, criticism, allegation, or adjacent controversy involving overlapping actors/institutions, the prompt should require `concern_or_position` or `collateral_context` and `claimDirection: "neutral"`.
   - Add focused prompt-contract coverage with generic placeholders only.
8. If Captain approves the prompt slice: commit first, restart/reseed, run two EN canaries and one PT control only. Stop immediately if EN still admits collateral direct contradictions for AC_02/AC_03.
9. Keep Stage 4 repair held. Current failures can still be explained by poor evidence pools and broad-predicate framing.
10. Treat Plastic, Asylum, and PT AC_03 selection as separate quality lanes. They should not block the Bolsonaro direction-basis work, but they prove the current branch is not broadly release-ready.

## 2026-05-07 post-`a9e3804` EN canary

Implemented prompt commit:
- `a9e3804b` — `fix(stage2): require target bridge for standards direction`.
- Prompt hash after restart/reseed: `92d1e56b04b19dfb5925c309fedac7628133f4284606b3781c9531154163b8d3`.
- Verification before live run: targeted verdict prompt-contract test, `git diff --check`, `npm -w apps/web run build`, and full `npm test` passed.

Live canary:
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Job: `70c73fad84784a40b07945ae5c40f208`.
- Result: `UNVERIFIED` 50 / 24.
- Claim split remained correct: 3 selected claims for Brazilian law compliance, proceeding fair-trial standards, and verdict fair-trial standards.
- Final claim-local direction pools improved relative to bad replicate `b2d065f4...`:
  - `AC_01`: 5 supports / 1 contradicts / 41 neutral.
  - `AC_02`: 3 supports / 0 contradicts / 28 neutral.
  - `AC_03`: 3 supports / 0 contradicts / 18 neutral.

Reviewer convergence:
- Keep `a9e3804`; do not revert. It reduced the Stage 2 contradiction-promotion failure and reverting would likely reopen the `b2d065f4...` failure mode.
- Do not spend more live jobs before the next fix. Remaining budget after `70c73fad...`: 4 jobs.
- Current primary residual failure is downstream Stage 4 use of neutral/contextual evidence as directional contradiction:
  - Final claim citations are support-only or empty, but reasoning and some `boundaryFindings` still argue against the claims.
  - `verdict_direction_issue`, `verdict_grounding_issue`, and `verdict_integrity_failure` warnings are mostly symptoms of the integrity guard stripping invalid directional citations after Stage 4 already reasoned with them.
  - Stage 3 boundary clustering is not the primary location; the contradictory `boundaryFindings` are Stage 4 verdict outputs.
- Source acquisition remains a secondary weakness, but `70c73fad...` had enough evidence volume and targeted research that the immediate defect is not zero-acquisition or selected-claim starvation.

Code-only substrate after review:
- Added Stage 2 direction metadata to Stage 4 evidence payloads:
  - `directionBasis`
  - `directnessJustification`
- Added the same metadata to direction-validation and neutral-citation adjudication payloads.
- Filtered neutral-citation adjudication candidates so evidence with explicitly non-directional bases (`concern_or_position`, `collateral_context`, `procedural_fact`, `ambiguous`) cannot be re-promoted to directional support or contradiction by the post-hoc citation adjudicator.
- Affected file: `apps/web/src/lib/analyzer/verdict-stage.ts`.
- Focused tests added in `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`.
- Targeted verifier passed: `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-stage.test.ts`.

Pending Captain approval:
- A prompt amendment is still required before live validation: Stage 4 must be told that Stage 2 `claimDirection`, `directionBasis`, and `directnessJustification` are binding for directional citation arrays and `boundaryFindings`; neutral concern/context can limit confidence or explain caveats, but must not become contradiction.
- Do not run EN/PT canaries until that prompt amendment is approved, committed, restarted/reseeded, and tested.

## 2026-05-07 post-`536d8a77` EN canary and taxonomy review

Live canary after Stage 4 direction-metadata binding:
- Commit under test: `536d8a77` — `fix(stage4): bind neutral direction metadata in advocate prompt`.
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Job: `b7af2ade5e374293a7784d1f2314ad67`.
- Result: `UNVERIFIED` 44 / 35.
- Claim split remained correct: 3 selected claims.
- Stage 4 invalid-citation class was fixed for this job: `verdict_direction_issue` / `verdict_integrity_failure` were no longer the primary defect.
- Residual claim-local Stage 2 pools still contained explicit contradictions:
  - `AC_01`: 3 supports / 3 contradicts / 35 neutral.
  - `AC_02`: 2 supports / 4 contradicts / 16 neutral.
  - `AC_03`: 3 supports / 0 contradicts / 12 neutral.

Reviewer conclusion:
- The remaining defect is Stage 2 direction-basis calibration, not Stage 4.
- The current coarse bases (`operative_finding`, `direct_record`) still let the LLM promote allegation/concern material to directional contradiction.
- Comparator `91bf6083...` used a richer basis taxonomy and classified similar OAS/IACHR material as allegation/concern/context rather than directional contradiction.
- The approved fix is to expand the basis taxonomy while keeping the existing structural normalization rule: non-directional basis plus `supports` / `contradicts` is coerced to `neutral`.
- This remains AGENTS-compliant because code only enforces self-consistency among LLM-emitted structured fields. It does not inspect evidence text, source titles, URLs, or source content.

Implemented but not yet live-validated at this checkpoint:
- `types.ts`
  - Replaced the 6-value coarse `DirectionBasis` union with `DIRECTION_BASIS_VALUES`.
  - Directional bases:
    - `direct_substantive_finding`
    - `direct_metric_value`
    - `direct_source_native_comparison_side`
    - `direct_safeguard_record`
    - `operative_standards_outcome`
  - Non-directional bases:
    - `question_only`
    - `allegation_only`
    - `concern_only`
    - `procedural_fact_only`
    - `non_controlling_position_only`
    - `collateral_context`
    - `source_existence_only`
    - `ambiguous_or_insufficient`
- `research-extraction-stage.ts`
  - Zod schema now uses `DIRECTION_BASIS_VALUES`.
  - Unknown / missing values fall back to `ambiguous_or_insufficient`.
  - Existing normalization remains before companion cloning.
- `claimboundary.prompt.md`
  - `APPLICABILITY_ASSESSMENT` now names the expanded taxonomy.
  - Rule-governed standard claims require a concrete bridge to the same evaluated proceeding, decision, verdict, safeguard, remedy, or standards outcome before a directional basis is allowed.
  - `VERDICT_ADVOCATE` neutral-metadata binding now references the expanded non-directional basis list.
- Focused tests updated for the new taxonomy and prompt contracts.

Verification before commit:
- `npm -w apps/web run test -- test/unit/lib/analyzer/research-extraction-stage.test.ts` passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts` passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-stage.test.ts` passed after updating one stale fixture to the new directional basis.
- `git diff --check` passed.
- `npm -w apps/web run build` passed.
- Full `npm test` hit two runner-integration timeouts:
  - `test/unit/lib/drain-runner-pause.integration.test.ts`
  - `test/unit/lib/runner-concurrency-split.integration.test.ts`
- Both timeout files passed when rerun in isolation, so the full-suite result is classified as transient runner-test flakiness rather than a patch failure.

Next gate:
- Commit first, then restart/reseed before live validation.
- Run one Bolsonaro EN canary first. Remaining live-job budget before that canary: 3.
- If EN still admits collateral direct contradictions for `AC_02` / `AC_03`, stop and spend no more jobs on this lane.
- If EN materially improves without collateral contradictions, use remaining budget only on a PT control and one direct-contradiction control.

## 2026-05-07 post-`e1ea613e` EN canary

Implemented prompt/code commit:
- `e1ea613e` — `fix(stage2): expand direction basis taxonomy`.
- Branch: local `main`.
- Runtime: restarted/reseeded before submission.
- Live-job budget before canary: 3.

Live canary:
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Draft: `20d61d6edf024b7396147e40114defed`.
- Job: `a275ca6e329b4444bdd812b2cd075dab`.
- Result: `UNVERIFIED` 55 / 40.
- Exported result: `test-output/bolsonaro-en-a275-result.json`.
- Claim split remained correct:
  - `AC_01`: The legal proceedings against Jair Bolsonaro complied with Brazilian law.
  - `AC_02`: The proceedings against Jair Bolsonaro met international standards for a fair trial.
  - `AC_03`: The verdicts against Jair Bolsonaro met international standards for a fair trial.

Stage 2 direction-basis outcome:
- The targeted collateral-contradiction class is fixed in this canary.
- Final claim-local pools:
  - `AC_01`: 11 supports / 0 contradicts / 38 neutral.
  - `AC_02`: 1 support / 0 contradicts / 30 neutral.
  - `AC_03`: 4 supports / 0 contradicts / 14 neutral.
- Previously problematic OAS/IACHR-style material now appears as `allegation_only`, `concern_only`, `question_only`, `procedural_fact_only`, `non_controlling_position_only`, or `collateral_context` with neutral direction, rather than as explicit contradiction.
- Example residual note: `EV_1778149500609` still has `supports + direct_safeguard_record`, but its `applicability` is `contextual`; the citation integrity guard correctly drops it from directional citation arrays.

Final verdict outcome:
- The report is still not at the expected positive-side result.
- `AC_01` is now `LEANING-TRUE` 68 / 50.
- `AC_02` remains `UNVERIFIED` 48 / 38, with no directional citation arrays.
- `AC_03` remains `UNVERIFIED` 48 / 35, despite four supporting citations.
- Overall report remains `UNVERIFIED` 55 / 40.

Comparator delta against `91bf6083...`:
- Comparator `91bf6083...` was `LEANING-TRUE` 63 / 52 with all three claims positive-side:
  - `AC_01`: 70 / 62, 17 cited supports / 0 contradictions.
  - `AC_02`: 58 / 52, 11 supports / 0 contradictions.
  - `AC_03`: 58 / 52, 9 supports / 0 contradictions.
- Current `a275...` has the same correct 3-claim structure and zero contradictions, but it lacks enough direct support for `AC_02` and has weaker support for `AC_03`.
- Missing / weaker successful comparator source routes include sources such as Time.com, Al Jazeera, PBS, NPR, and stronger target-specific use of HRW / Lawfare / public-trial records.

Current root-cause assessment:
- `e1ea613e` should be kept. It fixes the reviewed Stage 2 collateral-contradiction failure without introducing deterministic text logic.
- The remaining Bolsonaro EN failure is no longer primarily Stage 2 contradiction misclassification.
- The next likely root causes are:
  - source acquisition / query routing still undersamples positive target-specific fair-trial source routes for `AC_02` and `AC_03`;
  - Stage 2 directness/applicability is conservative for target-safeguard material that can support fair-trial-standard claims;
  - Stage 4 may be over-requiring a direct assessment by an international body instead of allowing a reasoned verdict from target-specific safeguard records mapped to ACHR / ICCPR standards.
- `verdict_direction_issue` warnings are now limited to citation-integrity cleanup of invalid contextual directional citations; this is no longer the main negative-skew failure.
- A remaining `verdict_grounding_issue` on `AC_02` shows Stage 4 reasoning still discusses neutral challenge-context items even when directional citation arrays are empty. This should be treated as a separate Stage 4/challenge-context discipline issue, not a reason to revert `e1ea613e`.

Decision after this canary:
- Stop spending jobs for now. Remaining live-job budget: 2.
- Do not run PT / Plastic controls yet because the primary EN canary still misses the expected result, and the next fix surface needs review before more live validation.
- Recommended next review packet: compare `a275...` against `91bf6083...` at source-route, applicability, and verdict-standard levels; decide whether the next smallest fix should target query/source acquisition, Stage 2 directness/applicability for safeguard records, or Stage 4 standards-evidence weighting.
