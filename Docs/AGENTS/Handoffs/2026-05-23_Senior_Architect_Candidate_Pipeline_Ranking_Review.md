# 2026-05-23 - Senior Architect - Candidate Pipeline Ranking Review

## Task

Independent re-investigation of CodexAgent's candidate pipeline ranking (`Docs/WIP/2026-05-23_Candidate_Pipeline_Ranking_Review_For_Claude.md`). Captain requested this because CodexAgent "was a bit too fast." The mandate: do not fully rely on CodexAgent's findings; verify independently.

## Grounding

- Read `Docs/AGENTS/Captain_Quality_Expectations.md`.
- Read `Docs/AGENTS/benchmark-expectations.json`.
- Read `Docs/AGENTS/report-quality-expectations.json`.
- Read `Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`.
- Read `Docs/AGENTS/Handoffs/2026-05-23_Senior_Developer_Candidate_Pipeline_Ranking.md`.
- Read `Docs/WIP/2026-05-23_Candidate_Pipeline_Ranking_Review_For_Claude.md` (full).
- Applied Senior Architect role.

## Executive Summary

CodexAgent's ranking is invalid. The composite scores for the three legacy candidates (92.9, 90.6, 89.3) are derived from range-matched historical reports that were never executed on the candidate SHAs. When verified against exact `executedWebGitCommitHash` data, all three legacy candidates have zero or near-zero verifiable benchmark coverage. Only current_v1 has verified exact-SHA quality evidence (7 live jobs). The extraction recommendation (deployed_22.4 first) survives on architectural grounds, but the quality-rank justification behind it does not.

---

## Phase 1: What CodexAgent Got Right

### Verified Correct

1. **All 7 SHAs resolve in git.** Confirmed via `git cat-file -t` on each SHA.

2. **Linear ancestry chain confirmed.** `quality_window_start` → `Alpha` → `quality_window_end` → `quality_before_decline` → `best_reports_19.4` → `deployed_22.4` → `current_v1`. Verified via `git merge-base --is-ancestor` on each consecutive pair.

3. **Tags confirmed.** All 6 tagged candidates have the expected tags. `current_v1` (`95312f5`) has no tag.

4. **Pipeline diff deltas.** All 4 claimed line deltas verified exactly:
   - `quality_before_decline`: `claimboundary-pipeline.ts` +1385/-4921 ✓
   - `deployed_22.4`: `claimboundary-pipeline.ts` +720/-145 ✓
   - `best_reports_19.4`: `claimboundary-pipeline.ts` +721/-145 ✓
   - `evidence-filter.ts` byte-identical across all 6 legacy candidates (same blob hash) ✓

5. **Omission found:** `claimboundary-v2.prompt.md` (+875 lines in deployed_22.4 diff) exists across all diffs but was not mentioned by CodexAgent. This is a non-trivial extraction surface not accounted for.

6. **Scoring formula.** The truth_fit / confidence_fit formula and composite weights match the task specification. When applied to verified data (current_v1 live jobs), the formula produces correct results.

7. **Extractability classes.** Medium/Medium/High for deployed_22.4/best_reports_19.4/quality_before_decline are defensible from the diff evidence. The structural reasoning is sound.

8. **current_v1 live job results.** All 7 succeeded jobs match the reported verdicts, truth percentages, confidence scores, and boundary counts exactly when verified against the local API.

---

## Phase 2: Critical Data Integrity Failures

### 2.1 Range Matching Contaminates All Legacy Scores

CodexAgent's collection method:

> "Exact match when `executedWebGitCommitHash` matched candidate SHA. Otherwise range match when execution commit fell between candidate and next candidate in the linear candidate order."

This "range match" attributed reports from arbitrary intermediate commits to candidate commits. The method assumes that any commit between two candidates produces equivalent-quality reports — an assumption with no basis. Pipeline behavior can change with any single commit.

**Verified API state:** Every job in the current database has `executedWebGitCommitHash = null`. No job can be attributed to any specific candidate SHA via this field. CodexAgent's cited representative job IDs exist and have verdicts, but none carry git commit provenance — the field CodexAgent's method claimed to match on is universally empty. The range-matching likely operated on creation timestamps or a heuristic proxy rather than actual SHA matching.

| Candidate | CodexAgent claimed | Actual SHA-attributable | Reason |
|---|---:|---:|---|
| quality_before_decline (`d3ad26c`) | 172 reports, 8/8 families | 0 | `executedWebGitCommitHash` null on all jobs |
| deployed_22.4 (`2f7a280`) | 456 reports, 8/8 families | 0 | `executedWebGitCommitHash` null on all jobs |
| best_reports_19.4 (`8f3ca9d`) | 81 reports, 8/8 families | 0 | `executedWebGitCommitHash` null on all jobs |

### 2.2 Representative Job IDs Lack Commit Provenance

CodexAgent listed 8 "representative scored job IDs" per legacy candidate. Verification against the current API:

**All cited jobs have `executedWebGitCommitHash = null`.** There is no field on any job in the database that records which git commit's pipeline was actually used to produce the result. The jobs exist and have verdicts, but they cannot be linked to any candidate SHA.

Specific examples checked:
- quality_before_decline jobs `ed2233a1`, `2c1ea4ae`, `a3ef4daf`: all have verdicts (LEANING-TRUE, MOSTLY-FALSE, LEANING-TRUE) but `executedWebGitCommitHash = null`.
- deployed_22.4 jobs `9bde7fdb`, `ce265797`, `d29fd298`, `8c30d51d`: all have verdicts (LEANING-TRUE, LEANING-FALSE, LEANING-TRUE, LEANING-TRUE) but `executedWebGitCommitHash = null`.
- Note: `ce265797` is the latestVerifiedJobId for asylum-wwii-de in benchmark-expectations.json, confirming it exists, but its commit provenance is not recorded in the current database.

Without commit provenance, CodexAgent's method of attributing these jobs to specific candidates is unfounded.

### 2.3 Archive Exact-SHA Jobs Are Missing From Database

`Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md` documents 3 legitimate exact-SHA worktree jobs for deployed_22.4:
- `5b0df483` (bundesrat-rechtskraftig)
- `1246198d` (bundesrat-simple)
- `119b8c34` (asylum-235000-de)

All three return 404 from the current API. They are not in the database. This means even the best-documented legacy candidate has zero accessible exact-SHA quality evidence.

### 2.4 Plastic-en Ambiguity

Job `d1728abc82e64a53af784a4fe9b4e837` shows STATUS: SUCCEEDED in the API but has no verdict, truth percentage, confidence, or result data. Like all other jobs, its `executedWebGitCommitHash` is null. CodexAgent correctly marked it as interrupted at 58%, but the API status is misleading. current_v1 has 7/8 covered, not 8/8.

---

## Phase 3: Independent Scoring of Verified Data

Only current_v1 has verified exact-SHA quality evidence. The 7 live jobs are scored below using the task-specified formula.

### Per-Family Scores

Formula: `truth_fit = max(0, 1 - |value - midpoint| / (half_range + 8)) * 100`

| Family | Verdict | T% | C% | Bounds | Label ✓ | Truth fit | Conf fit | Bound ✓ | Composite |
|---|---|---:|---:|---:|---|---:|---:|---|---:|
| bundesrat-rechtskraftig | MOSTLY-FALSE | 22 | 80 | 6 | ✗ (expect MIXED/LT/LF) | 0.0 | 56.5 | ✓ | 32.0 |
| bundesrat-simple | TRUE | 98 | 93 | 6 | ✓ | 64.5 | 55.6 | ✓ | 76.0 |
| asylum-235000-de | FALSE | 10 | 72 | 5 | ✗ (expect LT/MT) | 0.0 | 26.1 | ✓ | 22.8 |
| asylum-wwii-de | MOSTLY-FALSE | 18 | 68 | 5 | ✓ | 40.0 | 73.2 | ✓ | 74.0 |
| bolsonaro-en | LEANING-TRUE | 60 | 30 | 6 | ✓ | 46.5 | 0.0 | ✓ | 54.0 |
| bolsonaro-pt | LEANING-TRUE | 62 | 53 | 1 | ✓ | 55.8 | 69.6 | ✗ (min 3) | 62.6 |
| hydrogen-en | FALSE | 6 | 83 | 6 | ✓ | 50.0 | 55.6 | ✓ | 71.7 |
| plastic-en | — | — | — | — | — | — | — | — | N/A |

### Passing vs Failing (all criteria in band)

**Passing (3/7):** bundesrat-simple, asylum-wwii-de, hydrogen-en

**Failing (4/7):**
- bundesrat-rechtskraftig: wrong verdict label + truth 25pp below band
- asylum-235000-de: wrong verdict direction (FALSE vs expected true-side) + truth 48pp below band
- bolsonaro-en: correct label but confidence 15pp below band minimum
- bolsonaro-pt: correct label and bands but only 1 boundary vs minimum 3

### current_v1 Composite

Mean of 7 scored families: (32.0 + 76.0 + 22.8 + 74.0 + 54.0 + 62.6 + 71.7) / 7 = **56.2**

This independently confirms CodexAgent's current_v1 score of 56.1 (difference is floating-point rounding). The current_v1 scoring is the one part of CodexAgent's work that is reproducibly correct, because it is the only candidate with exact-SHA evidence.

---

## Phase 4: Revised Ranking

### What Can Be Ranked

Only one candidate has verified quality evidence: **current_v1** at 56.2 composite, 3/7 passing, 7/8 covered.

The three legacy candidates with claimed quality (quality_before_decline, deployed_22.4, best_reports_19.4) have **zero accessible exact-SHA benchmark evidence**. They cannot be scored, ranked, or compared.

The three early candidates (Alpha, quality_window_end, quality_window_start) have zero evidence, consistent with CodexAgent's finding. They remain unverifiable.

### Revised Ranking Table

| Rank | Candidate | SHA | Families | Passing | Composite | Evidence basis |
|---:|---|---|---:|---:|---:|---|
| 1 | current_v1 | `95312f5` | 7/8 | 3/7 | 56.2 | 7 exact-SHA live jobs |
| — | deployed_22.4 | `2f7a280` | 0/8 | — | — | No commit provenance on any DB job* |
| — | best_reports_19.4 | `8f3ca9d` | 0/8 | — | — | No commit provenance on any DB job |
| — | quality_before_decline | `d3ad26c` | 0/8 | — | — | No commit provenance on any DB job |
| — | quality_window_end | `1b27465` | 0/8 | — | — | No evidence |
| — | Alpha | `1a3d528` | 0/8 | — | — | No evidence |
| — | quality_window_start | `9cdc888` | 0/8 | — | — | No evidence |

*`executedWebGitCommitHash` is null on every job in the current database. deployed_22.4 additionally has 3 documented exact-SHA worktree jobs in the archive (`Docs/ARCHIVE/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`), but those job IDs return 404 from the current API.

---

## Phase 5: Does the Extraction Recommendation Survive?

### The Quality Justification Does Not Survive

CodexAgent's recommendation was: extract deployed_22.4 first (90.6 composite), quality_before_decline second (92.9 composite). Since both composites are derived from jobs with no commit provenance, the quality-rank justification is invalid.

Additionally, even if the data were valid: the 2.3pp gap between quality_before_decline (92.9) and deployed_22.4 (90.6) is smaller than the 8pp noise tolerance declared by the scoring methodology itself. The top-3 spread of 3.6pp (92.9 to 89.3) is also within noise. The ranking order among the top 3 was never meaningfully decidable, even before accounting for the data integrity failure.

### The Architectural Justification Partially Survives

The recommendation to extract deployed_22.4 first can still be defended on purely architectural grounds:

1. **Lowest extraction risk.** deployed_22.4 has the smallest pipeline diff delta (+720/-145 in claimboundary-pipeline.ts) and Medium extraction class. Its split-stage structure is closest to current V1.

2. **Historical reputation.** deployed_22.4 was the production-deployed version. The archive investigation (2026-05-05) concluded that "no single safe best commit across all families exists after deployed_22.4," implying it was considered a quality high-water mark — even though the exact evidence supporting that is now inaccessible.

3. **Extraction proves the pattern.** Regardless of which legacy candidate is "best," the first extraction needs to prove that side-by-side legacy pipelines can work. The lowest-risk candidate is the right choice for that.

### What Cannot Be Defended

- Claiming quality_before_decline is the "best quality" candidate — zero evidence.
- Ranking quality_before_decline above deployed_22.4 — no data to compare.
- The debate outcome — both advocate and challenger positions relied on contaminated composites.

---

## Phase 6: Blockers and Required Next Steps

### Blocker: AddClaimSelectionDraftIsHidden Migration Failure

CodexAgent attempted an isolated exact-commit worktree rerun for current_v1 at `C:\DEV\FH-current_v1-95312`. The fresh API database failed migration at `AddClaimSelectionDraftIsHidden` due to a missing `ClaimSelectionDrafts` table. This same blocker will affect any exact-SHA worktree rerun for legacy candidates.

Until this migration dependency is resolved, no exact-SHA worktree reruns can produce valid results. This is the single highest-priority technical blocker for producing a valid ranking.

### Required Steps for a Valid Ranking

1. **Fix the migration dependency.** The `AddClaimSelectionDraftIsHidden` migration requires `ClaimSelectionDrafts` to exist. Either add the missing prerequisite migration to legacy checkouts or provide a migration bypass for the worktree rerun scenario.

2. **Run exact-SHA worktree reruns for at least the top 3 candidates.** Each candidate needs a minimum of 8 jobs (one per benchmark family) executed from an isolated worktree server at the exact candidate SHA. This requires 24 live jobs across 3 candidates.

3. **Verify the archive worktree job results.** The 3 documented deployed_22.4 worktree jobs (5b0df483, 1246198d, 119b8c34) are missing from the current database. Determine whether this is a database migration artifact, a deliberate purge, or data loss. If the results exist in archive/backup form, they can partially satisfy deployed_22.4 coverage.

4. **Re-score with exact evidence only.** Once exact-SHA jobs exist, apply the scoring formula to produce defensible composites. Only then can the candidates be ranked.

---

## Comparison: CodexAgent vs Senior Architect

| Dimension | CodexAgent | Senior Architect |
|---|---|---|
| Ref/ancestry verification | ✓ Correct | ✓ Confirmed |
| Pipeline diff deltas | ✓ Correct | ✓ Confirmed, +1 omission (v2.prompt.md) |
| Extractability classes | ✓ Defensible | ✓ Confirmed |
| current_v1 scoring | ✓ Correct (56.1) | ✓ Confirmed (56.2, rounding) |
| Legacy candidate coverage | ✗ 8/8 claimed (no commit provenance) | 0/8 — all `executedWebGitCommitHash` null |
| Legacy composite scores | ✗ 92.9/90.6/89.3 (unfounded) | Not computable — no attributable data |
| Ranking validity | ✗ Invalid | Only current_v1 can be ranked |
| Extraction recommendation | Partially survives on architecture | Survives on architecture, not quality |

---

## Recommendations

### Immediate

1. **Do not act on CodexAgent's quality ranking.** The composites for legacy candidates are artifacts of range matching, not evidence of quality.

2. **Resolve the migration blocker** before attempting any legacy worktree reruns.

3. **Investigate the missing archive jobs** (5b0df483, 1246198d, 119b8c34) — if they can be recovered, deployed_22.4 gains partial coverage without spending live jobs.

### If Captain Wants to Proceed Without Full Reruns

The extraction of deployed_22.4 as a first candidate remains defensible on architectural grounds alone (lowest diff delta, closest to current structure, production-proven). Proceed with deployed_22.4 extraction spike, and validate quality empirically during extraction by running benchmark families against the extracted pipeline.

This approach reframes the problem: instead of "rank first, extract second," it becomes "extract the architecturally safest candidate and measure quality in-situ." This is pragmatically stronger because:
- It sidesteps the worktree migration blocker for ranking purposes.
- It produces real quality evidence as a byproduct of extraction work.
- It validates both extractability and quality in one step.

### If Captain Requires a Full Valid Ranking First

Fix the migration blocker, budget 24+ live jobs, run exact-SHA worktree reruns for all 3 legacy candidates, and re-score. This is the methodologically correct path but costs more time and jobs.

## Warnings

- Historical legacy reports are mostly commit-range matched rather than exact-SHA reruns; this caveat was noted by CodexAgent but underweighted in the scoring.
- Public deployed jobs are incomplete because hidden/deleted deployed jobs remain unreachable through the public API.
- The archive exact-SHA worktree jobs are missing from the current database, creating a gap between documented evidence and accessible evidence.
- current_v1's 56.2 composite reflects genuine quality issues (2 families with wrong verdict direction, 1 with critically low confidence, 1 with insufficient boundaries).

## Live Jobs

Used 0/16 authorized live jobs. All verification was done against existing API data and git history.
