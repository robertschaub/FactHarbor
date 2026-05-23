# Candidate Pipeline Ranking Review For Claude

Date: 2026-05-23  
Prepared by: Senior Developer / Codex  
Status: Investigation complete; ready for Claude review or extraction planning  

## Original Request Snapshot

Captain asked Senior Developer to determine which of seven candidate commits produced the best analysis reports, ranked by quality against Captain expectations, and to assess pipeline extractability for the top two. The top two candidates are intended to be extracted and integrated into the current FactHarbor codebase as separate independent pipelines running alongside current V1.

Captain explicitly instructed:

- Start from `Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`, which concluded that no single safe best commit across all families exists after `deployed_22.4`.
- Verify every candidate ref resolves in git.
- Use only the eight Captain-approved exact inputs from `Captain_Quality_Expectations.md`.
- Ground scoring in:
  - `Docs/AGENTS/Captain_Quality_Expectations.md`
  - `Docs/AGENTS/benchmark-expectations.json`
  - `Docs/AGENTS/report-quality-expectations.json`
  - `Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`
- Collect reports from local DB and deployed API, matching by `executedWebGitCommitHash` exact SHA or commit range.
- Use up to 16 live jobs to fill gaps, with non-HEAD candidates run only from isolated worktree servers.
- Score each candidate x family by:
  - 25% label pass
  - 30% truth-band fit
  - 30% confidence-band fit
  - 15% minimum boundary-count pass
- Flag candidates with fewer than 3/8 families as Narrow coverage and do not rank them above broader candidates with composite >=70%.
- Run a debate on whether the top two are best for report quality and integration.
- Deliver ranking, per-candidate narrative, conclusion, extractability assessment, recommended integration approach, and job budget tracker.

Candidate list:

| Label | SHA | Tag |
|---|---|---|
| current_v1 | `95312f5e0970f8879e296bbae8bf98aab9ec9489` | no |
| deployed_22.4 | `2f7a2805c44c3a72f9102c94f54aee30bd114ba9` | yes |
| best_reports_19.4 | `8f3ca9dd55471881d69bf4c0b7f1c97c5790109b` | yes |
| quality_before_decline | `d3ad26ca6b4f9c2c826af774053ccb07e71fda53` | yes |
| Alpha | `1a3d5281f55a7f8cbbf30fb69745ba79b6651dd9` | yes |
| quality_window_end | `1b2746558af2f373da46e820be9ed5d94d41bf42` | yes |
| quality_window_start | `9cdc8889004e9dc0d50ad4ac75b18facc2f01f68` | yes |

## Grounding Files Read

- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`
- `Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`
- `Docs/AGENTS/Roles/Senior_Developer.md`
- `.claude/skills/report-review/SKILL.md`
- `.claude/skills/pipeline/SKILL.md`
- `.claude/skills/reasoning-budget/SKILL.md`
- `.claude/skills/debate/SKILL.md`
- `Docs/AGENTS/Policies/Handoff_Protocol.md`

Permanent completion handoff also exists at:

- `Docs/AGENTS/Handoffs/2026-05-23_Senior_Developer_Candidate_Pipeline_Ranking.md`

## Ref Verification

All seven refs resolved in git.

Observed linear ancestry:

`quality_window_start` -> `Alpha` -> `quality_window_end` -> `quality_before_decline` -> `best_reports_19.4` -> `deployed_22.4` -> `current_v1`

Tags observed:

- `deployed_22.4`
- `best_reports_19.4`
- `quality_before_decline`
- `Alpha`
- `Calibration_Baseline,quality_window_end`
- `quality_window_start`

`current_v1` had no tag.

## Collection Summary

### Local DB Collector

Local exact-approved succeeded rows were collected from `apps/api/factharbor.db` before reboot.

Coverage found:

| Candidate | Reports | Families |
|---|---:|---:|
| quality_window_start | 0 | 0/8 |
| Alpha | 0 | 0/8 |
| quality_window_end | 0 | 0/8 |
| quality_before_decline | 172 | 8/8 |
| best_reports_19.4 | 81 | 8/8 |
| deployed_22.4 | 456 | 8/8 |
| current_v1 | 1 local exact report, excluded from V1 score because it was `claimboundary-v2` | 0 valid V1 before live jobs |

Commit association rules:

- Exact match when `executedWebGitCommitHash` matched candidate SHA.
- Otherwise range match when execution commit fell between candidate and next candidate in the linear candidate order.

### Deployed API Collector

Visible public deployed API reports were sparse. Hidden/deleted jobs are a known limitation.

Visible matched examples:

- `quality_before_decline`: `1fc7776c`, `841d6de3`, `a48a6210`, `2e3cb0da`
- `best_reports_19.4`: `63e2ecee`, `3469b325`, `26432b9b`, `6a60b3eb`
- `deployed_22.4`: exact SHA public job `85812d61` for bolsonaro-en

Several prior documented deployed job IDs were hidden or 404 through the public API.

### Pipeline Diff Collector

Extractability summary:

- `deployed_22.4`: Medium. Split-stage structure close to current; legacy prompt/config/model namespaces needed; result schema broadly compatible.
- `best_reports_19.4`: Medium. Larger Stage 1/verdict divergence than deployed_22.4, but still broadly compatible.
- `quality_before_decline`: High. Monolithic-to-split transition, older config/model assumptions, larger adapter surface.
- `Alpha`, `quality_window_end`, `quality_window_start`: High. Older direct model/UCM/result-contract risk and no report evidence.

Notable line deltas against HEAD:

| Candidate | Key deltas |
|---|---|
| quality_before_decline | `claimboundary-pipeline.ts` +1385/-4921; `claimboundary.prompt.md` +1918/-69; many split-stage analyzer files added since candidate |
| deployed_22.4 | `claimboundary-pipeline.ts` +720/-145; `claimboundary.prompt.md` +689/-49; stage files mostly same structure |
| best_reports_19.4 | `claimboundary-pipeline.ts` +721/-145; `claimboundary.prompt.md` +893/-64; Stage 1/verdict larger divergence than deployed_22.4 |

`evidence-filter.ts` was byte-identical across the six legacy candidates.

## Scoring Method

Used `Docs/AGENTS/benchmark-expectations.json` as mechanical authority.

Truth/confidence fit used linear closeness to band midpoint with the JSON noise tolerance of 8 percentage points:

`fit = max(0, 1 - abs(value - midpoint) / (((max - min) / 2) + 8)) * 100`

Per-family score:

`25% label_pass + 30% truth_fit + 30% confidence_fit + 15% boundary_pass`

Composite:

Mean of covered family scores. Candidates with fewer than 3 families are not rankable above broad candidates >=70%.

## Final Ranking

| Rank | Candidate | SHA short | Families covered | Families passing | Mean truth fit | Mean conf fit | Composite quality | Caveat |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | quality_before_decline | `d3ad26c` | 8/8 | 8/8 | 85.8% | 90.4% | 92.9% | Best quality; High extraction cost; mostly range-matched historical reports |
| 2 | deployed_22.4 | `2f7a280` | 8/8 | 8/8 | 82.8% | 85.8% | 90.6% | Medium extraction; strongest quality/feasibility balance |
| 3 | best_reports_19.4 | `8f3ca9d` | 8/8 | 8/8 | 78.1% | 86.4% | 89.3% | Medium extraction; fallback if QBD extraction is too costly |
| 4 | current_v1 | `95312f5` | 7/8 | 3/8 | 36.7% | 48.1% | 56.1% | Live rerun weak; plastic interrupted by reboot |
| 5 | quality_window_end | `1b27465` | 0/8 | 0/8 | n/a | n/a | n/a | Unverifiable |
| 6 | Alpha | `1a3d528` | 0/8 | 0/8 | n/a | n/a | n/a | Unverifiable |
| 7 | quality_window_start | `9cdc888` | 0/8 | 0/8 | n/a | n/a | n/a | Unverifiable |

## Representative Scored Job IDs

### quality_before_decline

- asylum-235000-de: `ed2233a18ce543f6b954e090ef49bd77`
- asylum-wwii-de: `2c1ea4ae05a240828d83a835d7a4feee`
- bolsonaro-en: `a3ef4dafeefd4b55825f1cdd95a1e28e`
- bolsonaro-pt: `e4f18174041040a789ae28dd4fa62658`
- bundesrat-rechtskraftig: `c9657f31586c492c8ab130cf5b8dc98d`
- bundesrat-simple: `5c742051b13a40e987848ea4a2a1a91d`
- hydrogen-en: `a2e57bbb5d9d44e28884407ab2b91c32`
- plastic-en: `2e7814f21f1d48c5ba6d312f916d8903`

### deployed_22.4

- asylum-235000-de: `9bde7fdbb0cf454896169e6844e9fb1b`
- asylum-wwii-de: `ce265797d3fc4540a45aaeac99510e4a`
- bolsonaro-en: `d29fd2980dd045348923af0ab3483ca1`
- bolsonaro-pt: `8c30d51da1c34e06a170f6a82974426f`
- bundesrat-rechtskraftig: `9dcd127b22814ee981e37d8f6bfff14b`
- bundesrat-simple: `80c4d53f107b4a149751acc9a7c6c013`
- hydrogen-en: `6c23a1bdc21442e59e6ffecb1af5c080`
- plastic-en: `f5e4f506d2584097b4deed18804da013`

### best_reports_19.4

- asylum-235000-de: `13b8f97b60c844f189cd8fe248aa2f09`
- asylum-wwii-de: `081e45aa22ce471e87c5bed0e03bb438`
- bolsonaro-en: `29442c183e1c4c7abfbc3949d5a81269`
- bolsonaro-pt: `975b66232f33445784b59f77038fb3a7`
- bundesrat-rechtskraftig: `9fc8ba60910540b3a1560cef02c4acf9`
- bundesrat-simple: `a53573047fe64778a76e53cb578900c7`
- hydrogen-en: `3a346b77139c42d6928f0d87531c3d16`
- plastic-en: `850da2e6fd2c4d81ba72d94393939d58`

## current_v1 Live Jobs

Used 8 of 16 authorized live jobs. These jobs were submitted before reboot on ports 3000/5000 with `pipelineVariant=claimboundary`. Their execution metadata reported `95312f5e0970f8879e296bbae8bf98aab9ec9489+915ed167`; suffix was a dirty worktree hash from unrelated docs/WIP state, while analyzer/prompt/config paths were clean before submission.

| # | Family | Input | Job ID | Result | Status |
|---:|---|---|---|---|---|
| 1 | bundesrat-rechtskraftig | `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | `8044523517e04d91905386b11de37bbc` | `MOSTLY-FALSE` 22/80, 6 boundaries | SUCCEEDED |
| 2 | bundesrat-simple | `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | `0ba0b00f29c4492da31182d530b7cc78` | `TRUE` 98/93, 6 boundaries | SUCCEEDED |
| 3 | asylum-235000-de | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | `000e6fa010a8457d84f5ddc8459df139` | `FALSE` 10/72, 5 boundaries | SUCCEEDED |
| 4 | asylum-wwii-de | `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` | `8d0b15db98844cdfb96aefa4c0149247` | `MOSTLY-FALSE` 18/68, 5 boundaries | SUCCEEDED |
| 5 | bolsonaro-en | `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | `d6e98a9f5c554df98b365a00c1998286` | `LEANING-TRUE` 60/30, 6 boundaries | SUCCEEDED |
| 6 | bolsonaro-pt | `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas` | `15fda1d8613548b4a363c8f11a331dee` | `LEANING-TRUE` 62/53, 1 boundary | SUCCEEDED |
| 7 | hydrogen-en | `Using hydrogen for cars is more efficient than using electricity` | `44f013b90e4e44fa98603b0ec4130203` | `FALSE` 6/83, 6 boundaries | SUCCEEDED |
| 8 | plastic-en | `Plastic recycling is pointless` | `d1728abc82e64a53af784a4fe9b4e837` | interrupted at 58%, no verdict | INTERRUPTED |

Total live jobs used: 8/16.

Remaining gaps:

- current_v1 plastic terminal result missing due reboot.
- no exact-SHA fresh reruns for legacy candidates.
- no report data for `Alpha`, `quality_window_end`, `quality_window_start`.

## Reboot Recovery Notes

System reboot occurred while current_v1 plastic job was running. After restart:

- API was down initially.
- Starting API for status recovery marked the still-running plastic job as `INTERRUPTED`.
- Main checkout had advanced beyond original current_v1 SHA after reboot; no additional scoring job was run on advanced HEAD.
- An isolated worktree at `C:\DEV\FH-current_v1-95312` was created for an exact rerun attempt, prompt/config reseeded, and then removed.
- No rerun job was submitted because old API fresh-DB migration failed at `AddClaimSelectionDraftIsHidden` due missing `ClaimSelectionDrafts`.
- This migration/setup failure is an extractability/runtime signal, not report-quality evidence.

## Debate Result

Required debate proposition:

> Candidates X and Y are the best two for report quality AND integration as independent pipelines alongside the current V1 pipeline.

Debate evidence:

- `quality_before_decline`: 92.9 composite, 8/8 covered, 8/8 passing, High extraction.
- `deployed_22.4`: 90.6 composite, 8/8 covered, 8/8 passing, Medium extraction.
- `best_reports_19.4`: 89.3 composite, 8/8 covered, 8/8 passing, Medium extraction.
- `current_v1`: 56.1 composite, 7/8 covered, 3/8 passing, zero extraction but weak quality.

Advocate position:

- Select `quality_before_decline` and `deployed_22.4`.
- QBD quality lead is real and quality is primary.
- High extraction cost is acceptable if isolated behind frozen adapter/config/prompt namespaces.

Challenger position:

- Select `deployed_22.4` and `best_reports_19.4`.
- QBD only leads `best_reports_19.4` by 3.6pp but has High instead of Medium extraction cost.
- QBD historical evidence is mostly range/dirty, making the extra extraction risk less attractive.

Reconciler decision:

- Select `quality_before_decline` and `deployed_22.4`.
- Do not demote QBD solely for High extractability because Captain asked for quality-ranked candidates and extractability is a risk constraint, not a replacement score.
- Keep `best_reports_19.4` as contingency if QBD extraction spike proves too costly.

## Final Recommendation

Extract:

1. `deployed_22.4` first.
   - Best quality/feasibility balance.
   - Medium extraction effort.
   - Good first proof that side-by-side legacy pipelines can run in current app.

2. `quality_before_decline` second.
   - Best report quality overall.
   - High extraction effort.
   - Requires early extraction spike and strong isolation.

Fallback:

- Use `best_reports_19.4` if QBD spike shows a full type/runtime fork is required or if integration cost exceeds acceptable scope.

Do not select:

- `current_v1` as top two: score is too weak despite zero extraction cost.
- `Alpha`, `quality_window_end`, `quality_window_start`: no report evidence.

## Recommended Integration Approach

Add separate pipeline variants rather than merging legacy internals into current V1:

- `legacy-deployed-22-4`
- `legacy-quality-before-decline`

For `deployed_22.4`:

- Prefer same-process integration behind a pipeline selector.
- Freeze prompt, config, and model-task namespaces.
- Add result adapter for missing newer fields.

For `quality_before_decline`:

- Start with an extraction spike.
- Use stricter adapter boundaries.
- Consider process isolation during spike.
- Do not attempt to refactor its internals into current split-stage pipeline.

Shared dependency risks to resolve first:

- Prompt/config namespace collisions.
- Model-task key drift.
- Search/fetch/SR behavior drift.
- Result JSON compatibility for current API/UI.

## Claude Agent Start Instructions

Recommended next Claude task:

> As Senior Developer, implement an extraction spike for `deployed_22.4` as a separate legacy pipeline variant. Use `/debt-guard` before editing. Keep the first spike narrow: route/selector registration, frozen prompt/config namespace, and a minimal adapter that can run one Captain-approved exact input without changing current V1 behavior. Do not touch `quality_before_decline` until the lower-risk deployed_22.4 extraction path is proven.

Alternative if Captain wants maximum-value target first:

> As Senior Developer, run a bounded extraction feasibility spike for `quality_before_decline`. Goal is not full integration; determine whether it can be adapted to current `AnalysisResult`/API contracts without a full type/runtime fork. Stop and report if the spike requires broad monolithic pipeline resurrection.

Important constraints for Claude:

- Use `/debt-guard` before any bugfix or risk-mitigation edit.
- Do not submit live jobs until code is committed and runtime is refreshed.
- Use only Captain-approved exact inputs.
- Do not add deterministic text-analysis logic.
- Keep legacy pipelines isolated; do not merge legacy logic into current V1.
- Do not rely on current HEAD reports for current_v1 scoring unless execution metadata matches the intended commit.

## Validation Performed

- `npm run index` passed after adding the handoff.
- `git diff --check` passed.
- Temporary exact-commit worktree was removed.
- Debate subagents were closed.

## Open Caveats

- Deployed public API visibility is incomplete due hidden/deleted reports.
- Legacy candidate quality evidence is mostly historical range-matched rather than clean exact-SHA reruns.
- One current_v1 live job was interrupted by reboot.
- Main checkout advanced after reboot due external/user work; no additional ranking job was run on that advanced HEAD.
