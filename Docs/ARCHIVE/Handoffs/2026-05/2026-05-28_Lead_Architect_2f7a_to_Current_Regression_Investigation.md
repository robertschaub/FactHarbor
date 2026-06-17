# 2026-05-28 Lead Architect + LLM Expert: 2f7a to Current Regression Investigation

## Scope

Investigated whether report-generation quality regressed between deployed commit `2f7a2805c44c3a72f9102c94f54aee30bd114ba9` and the current `main` generation-equivalent group.

Captain note honored:
- Jobs executed on commits around current `main` that only changed non-report-generation behavior were treated as current-equivalent.
- Jobs executed around `2f7a2805c44c3a72f9102c94f54aee30bd114ba9` were grouped only when the nearby commit did not affect report generation.
- Public deployed reports on `app.factharbor.ch` were used as deployed comparators where available.

No code, prompt, or config changes were made during this investigation.

Captain follow-up calibration: after reviewing `https://app.factharbor.ch/jobs/57aca91df4d94f028a30e3694ecf5e7e` and `http://localhost:3000/jobs/f9df75a888bd4b3c9392bcc80adb73b1`, Captain stated that the local current report is clearly better and meets expectations well. Therefore the Iran short-question direction flip must be treated as an improvement over a weak deployed comparator, not as a regression.

## Baselines Used

### Deployed baseline

Production `/api/fh/version` reports API SHA:

`2f7a2805c44c3a72f9102c94f54aee30bd114ba9`

Public production job corpus:
- 107 public visible reports fetched from `https://app.factharbor.ch/api/fh/jobs`.
- 21 public reports had `resultJson.meta.executedWebGitCommitHash` exactly equal to `2f7a2805c44c3a72f9102c94f54aee30bd114ba9`.
- Public list hides commit hash; detail endpoint exposes it in `resultJson.meta.executedWebGitCommitHash`.
- Hidden production jobs were not available from public endpoints and were not used.

Exact public `2f7a` examples used:
- `57aca91df4d94f028a30e3694ecf5e7e`, `34c6ec65ec2442c69752d59ac0d10d93`: `Was Iran actually making nukes?`
- `25018c768eb74400b08bd68a92c3714b`: `Plastic recycling is pointless`
- `92b7f24d72c64d96a21ae8ddab344db0`, `85812d61a3984fa6bb945d4096eaa039`: approved Bolsonaro EN question
- `7e2eb661f311456882941fe11a4d21fd`: approved Bolsonaro PT question
- `96282803637a46c28efe10f32b2cb47d`: asylum WWII comparator
- `8eea53df5eaa4bbd9b88a4fa8f2115bd`: cancer-biopsy spread
- `a7e19876bc4141e7a4f8bf8f38972891`: Eiffel Tower control
- `a59e4a6e1e184c22ad8055e34a52beeb`, `e2f5862b22be40cbbd627f120821471b`: Iran WMD Wikipedia URL

### Current generation-equivalent group

Current local report-generation-equivalent group treated together:
- `3e94e53e19500c0f71f2a29d6b27c3d2dc81c401`
- `fdb47ebc922caab0e2d621c05be315275636b64f` plus dirty suffixes from local runs
- `2ac6cd029ce7b3e87fd50c98928b4067d5fbe1cf` plus dirty suffixes from local runs

Reason: commits after `73b612a4` in this local lineage are test/docs/admin/runner-visibility oriented for report-quality purposes; they do not materially change report generation. Dirty suffixes in the examined current jobs came from local docs/test/admin changes rather than intended analyzer-prompt changes.

Relevant report-affecting commits between `2f7a` and current:
- `d2d06f83` / `6164ef8e`: automatic claim selection and selector prompt section.
- `a446b7cc`: sequential per-analysis evidence IDs.
- `406393c9`: Google-CSE throttling.
- `82a1aa17`: exclude zero-citation `INSUFFICIENT` claims from article aggregation.
- `551e714b`: bound narrative confidence downgrade.
- `2d1c3253` / `73b612a4`: safe-downgrade / grounding-policy verdict behavior.
- Metrics/observability commits changed reporting and diagnostics but are not primary semantic candidates.

## Headline Finding

After Captain calibration, no clear report-generation regression is proven from the public exact-`2f7a` comparator set.

The largest same-input movement is the short Iran nuclear-weapons question:

`Was Iran actually making nukes?`

Exact deployed `2f7a`:
- `57aca91df4d94f028a30e3694ecf5e7e`: `LEANING-FALSE`, 38 truth / 78 confidence, 83 evidence, 22 sources, 1 claim.
- `34c6ec65ec2442c69752d59ac0d10d93`: `MOSTLY-FALSE`, 28 truth / 75 confidence, 90 evidence, 23 sources, 1 claim.

Current:
- `f9df75a888bd4b3c9392bcc80adb73b1`: `MOSTLY-TRUE`, 73 truth / 74 confidence, 70 evidence, 42 sources, 2 claims.

This is not ordinary run-to-run drift. It is a verdict-direction flip on the exact same input family. However, Captain judged the current local true-side report to be clearly better and expectation-aligned, so this flip is now classified as deployed-baseline weakness plus current improvement, not a regression.

## Iran Report Calibration

The current run decomposed the short question into two thesis-direct claims:

- `AC_01`: Iran was actually making nuclear weapons in terms of active weapons-specific manufacturing activities, including component fabrication, weaponization experiments, or assembly-directed work.
- `AC_02`: Iran was actually making nuclear weapons in terms of a formally organized, state-directed weapons production program, as opposed to dispersed or deniable research activities.

The deployed `2f7a` runs kept one simpler claim:
- `Iran was actually making nuclear weapons` / `Iran was actually making nuclear weapons -- that is, engaged in active weapons manufacturing rather than merely claiming a peaceful program.`

The current report also recorded a Stage 1 contract retry:

`contract_validation_retry_triggered`: Stage 1 pass 2 retry, 4 failing claims. Anchor retry reason included anchor-provenance failure on `"actually making nukes"` and normative injection in one discarded claim.

Interpretation:
- The system detected claim-extraction instability on this exact anchor.
- After retry, it accepted a two-claim decomposition that Captain considers better for this input than the deployed one-claim false-side framing.
- Automatic claim selection then selected both candidates because both were judged high-centrality and complementary.

Implication:
- Do not use the deployed false-side Iran short-question report as a gold comparator.
- The current Stage 1 + Stage 1.5 behavior on this input should be treated as a positive comparator unless later Captain feedback narrows the desired interpretation.
- Source acquisition is not the main differentiator: both deployed and current reports had substantial evidence volume; the quality difference is proposition framing and how evidence is made dispositive.

Recommended handling:
- No fix is recommended for this Iran case based on Captain feedback.
- Keep the current report as an expectation-aligned comparator for similar short, colloquial nuclear-weapons-program questions.
- If future prompt/code changes touch proposition framing, preserve the useful current behavior without adding topic-specific wording.

## Other Families Checked

### Plastic recycling

Exact deployed `2f7a` public report:
- `25018c768eb74400b08bd68a92c3714b`: `MOSTLY-FALSE`, 24/78, 89 evidence, 32 sources, 2 claims.

Current-equivalent:
- `ffd9a744030f4d46b28046f8daf63efc`: `LEANING-TRUE`, 67/67, 81 evidence, 42 sources.
- `044f0c966d1d494da2754c7381592e46`: `MIXED`, 49/65, 72 evidence, 37 sources.

Conclusion: no regression against the exact deployed `2f7a` public baseline; if anything, approved English plastic improved versus the deployed public report. Variance remains.

### Bolsonaro EN approved question

Exact deployed `2f7a` public reports:
- `92b7f24d72c64d96a21ae8ddab344db0`: `MIXED`, 54/48.
- `85812d61a3984fa6bb945d4096eaa039`: `LEANING-TRUE`, 68/62.

Current-equivalent:
- `cd8303513c084ab5a095f1a69f64950e`: `MIXED`, 51/47.
- Earlier current-equivalent run `076e...` from the handoff summary: `MIXED`, 52/50.

Conclusion: stable on the lower deployed side, not a clear regression.

### Bolsonaro PT approved question

Exact deployed `2f7a` public report:
- `7e2eb661f311456882941fe11a4d21fd`: `LEANING-TRUE`, 66/63.

Current-equivalent:
- `d3cc4155049c43bc9d205d4fc58564c7`: `LEANING-TRUE`, 64/62.

Conclusion: no regression.

### Asylum WWII comparator

Exact deployed `2f7a` public report:
- `96282803637a46c28efe10f32b2cb47d`: `LEANING-FALSE`, 41/61.

Current-equivalent:
- `7bc8ad95d4404483bd3255f02ac85217`: `LEANING-FALSE`, 30/40.

Conclusion: same direction, lower truth and confidence. Mild quality degradation, not a direction regression. Worth watching if this family matters for release.

### Asylum 235k exact

No exact public deployed `2f7a` report was found for:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Current-equivalent runs:
- `aac59a7de0d646659cfe67fa4df644e0`: `LEANING-TRUE`, 68/61.
- `d5db7c6e994f43a4b5d09ad11de23f45`: `MOSTLY-TRUE`, 78/72.

Conclusion: current output looks healthy and used direct Swiss administrative aggregate evidence, but no exact deployed public comparator was available.

### Cancer biopsy spread

Exact deployed `2f7a` public report:
- `8eea53df5eaa4bbd9b88a4fa8f2115bd`: `FALSE`, 10/75.

Current-equivalent:
- `90cdcee6d72f40c6ac87b41de3365686`: `MOSTLY-FALSE`, 15/80.

Conclusion: no substantive regression.

### Eiffel Tower control

Exact deployed `2f7a` public report:
- `a7e19876bc4141e7a4f8bf8f38972891`: `TRUE`, 100/97.

Current-equivalent:
- `98da561f0a1544fdb540f0b53126d743`: `TRUE`, 99/82.

Conclusion: no direction regression; confidence lower but still strong and trivial-control behavior remains correct.

### Iran WMD Wikipedia URL

Exact deployed `2f7a` public reports:
- `a59e4a6e1e184c22ad8055e34a52beeb`: `MOSTLY-TRUE`, 84/75.
- `e2f5862b22be40cbbd627f120821471b`: `MOSTLY-TRUE`, 72/62.

Current-equivalent:
- `f9edf7c90ce7405fb0521c0202d9294e`: `MOSTLY-TRUE`, 84/72.

Conclusion: no regression. Together with the current short-question result, this suggests current Iran-source acquisition and proposition handling are not broadly degraded.

## Bundesrat Note

Current approved input:

`Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

Current job:
- `67c44f5c88474a1ab98202735ef746a6`: `LEANING-TRUE`, 66/41.
- Both claim verdicts were low-confidence `UNVERIFIED`.
- The `rechtskräftig` anchor survived extraction.
- No `report_damaged`.

No exact public deployed `2f7a` report for this input was found. Older deployed/current-stack-adjacent reports exist but were on report-affecting commits and should not be treated as the exact `2f7a` group.

Conclusion: keep Bundesrat as a watch item, but do not classify it as a proven regression since `2f7a` from available exact public deployed reports.

## Warnings

- Production comparison used public visible reports only. Hidden production reports may contain additional exact `2f7a` comparators not accessible from the public endpoints used here.
- The local worktree is dirty with unrelated docs/UI/dependency changes. The comparison therefore relies on executed job commit hashes, not on the present working tree.
- Current dirty suffixes on executed jobs mean exact source identity is not a clean SHA-only comparison. The suffixes observed for the relevant jobs correspond to local uncommitted state, but the report-generation-equivalent grouping is still justified by the committed analyzer/prompt/config lineage.
- Do not treat deployed `2f7a` as a universal gold standard. It has its own weak reports, notably the exact deployed plastic report and, per Captain calibration, the false-side Iran short-question report.

## Learnings

- `app.factharbor.ch/api/fh/jobs` list responses omit the executed commit hash, but job detail responses expose it under `resultJson.meta.executedWebGitCommitHash`.
- Same-input direction flips are not automatically regressions; Captain expectation and report quality must decide whether the comparator or the current report is better.
- Stage 1 warnings are materially useful for quality triage: the current Iran run self-reported an anchor-provenance retry before producing an expectation-aligned report.

## Recommended Continuation

1. Do not pursue the Iran short-question flip as a regression.
2. Use the current `f9df75a888bd4b3c9392bcc80adb73b1` report as a positive quality comparator for this family.
3. Continue looking for regressions in other families using Captain expectations rather than treating deployed `2f7a` labels as authoritative.
4. If a live comparison run is needed, use Captain-approved inputs only. `Was Iran actually making nukes?` is not currently in the Captain-defined input list from `AGENTS.md`; get explicit Captain approval before running it again.
5. No broad rollback is supported by the available evidence.
