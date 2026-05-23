# 2026-05-23 - Senior Developer - Candidate Pipeline Ranking

## Task

Rank seven candidate commits by analysis-report quality against Captain expectations and assess extractability of the top candidates for side-by-side legacy pipeline integration.

## Grounding

- Read `Docs/AGENTS/Captain_Quality_Expectations.md`.
- Read `Docs/AGENTS/benchmark-expectations.json`.
- Read `Docs/AGENTS/report-quality-expectations.json`.
- Read `Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`.
- Applied Senior Developer role, report-review/pipeline/reasoning-budget/debate workflow guidance, and Exchange Protocol.

## Result

Final ranking by covered-family composite quality:

1. `quality_before_decline` (`d3ad26c`) - 8/8 covered, 8/8 passing, 92.9 composite.
2. `deployed_22.4` (`2f7a280`) - 8/8 covered, 8/8 passing, 90.6 composite.
3. `best_reports_19.4` (`8f3ca9d`) - 8/8 covered, 8/8 passing, 89.3 composite.
4. `current_v1` (`95312f5`) - 7/8 covered, 3/8 passing, 56.1 composite.
5. `Alpha`, `quality_window_end`, and `quality_window_start` - no matched report data; unverifiable.

Debate outcome: select `quality_before_decline` and `deployed_22.4`. `best_reports_19.4` remains the fallback if `quality_before_decline` fails an early extraction spike.

## Live Jobs

Used 8/16 authorized live jobs. All were current_v1 `claimboundary` jobs submitted before reboot on ports 3000/5000 and executed with metadata `95312f5e0970f8879e296bbae8bf98aab9ec9489+915ed167`.

- `8044523517e04d91905386b11de37bbc` - bundesrat-rechtskraftig - `MOSTLY-FALSE` 22/80, 6 boundaries, succeeded.
- `0ba0b00f29c4492da31182d530b7cc78` - bundesrat-simple - `TRUE` 98/93, 6 boundaries, succeeded.
- `000e6fa010a8457d84f5ddc8459df139` - asylum-235000-de - `FALSE` 10/72, 5 boundaries, succeeded.
- `8d0b15db98844cdfb96aefa4c0149247` - asylum-wwii-de - `MOSTLY-FALSE` 18/68, 5 boundaries, succeeded.
- `d6e98a9f5c554df98b365a00c1998286` - bolsonaro-en - `LEANING-TRUE` 60/30, 6 boundaries, succeeded.
- `15fda1d8613548b4a363c8f11a331dee` - bolsonaro-pt - `LEANING-TRUE` 62/53, 1 boundary, succeeded.
- `44f013b90e4e44fa98603b0ec4130203` - hydrogen-en - `FALSE` 6/83, 6 boundaries, succeeded.
- `d1728abc82e64a53af784a4fe9b4e837` - plastic-en - interrupted by reboot at 58%, no verdict.

Attempted isolated exact-commit current_v1 rerun setup in `C:\DEV\FH-current_v1-95312`; no job was submitted because the fresh API DB failed migration at `AddClaimSelectionDraftIsHidden` due missing `ClaimSelectionDrafts`. The temporary worktree was removed.

## Extractability

- `deployed_22.4`: Medium. Split-stage structure is close to current; prompt/config/model/result namespaces need freezing; result schema remains broadly current-API compatible.
- `quality_before_decline`: High. Highest quality but much older monolithic-to-split shape, older config/model assumptions, and larger adapter/fork surface.
- `best_reports_19.4`: Medium fallback with lower quality than both selected candidates.

## Warnings

- Historical legacy reports are mostly commit-range matched rather than exact-SHA reruns; this caveat applies broadly across the serious legacy candidates.
- Public deployed jobs are incomplete because hidden/deleted deployed jobs remain unreachable through the public API.
- The main checkout advanced past the original `95312f5` current_v1 SHA after reboot; no additional current_v1 analysis was run on the advanced HEAD for this ranking.

## Learnings

- For extraction selection, use quality rank as the primary axis and extractability as a risk/implementation constraint, not as a replacement score.
- `quality_before_decline` needs an early extraction spike before broad implementation; if the spike shows a full type/runtime fork is required, switch to `best_reports_19.4` as contingency.
