# Report Quality Worktree Comparison Runbook

**Date:** 2026-03-12  
**Prepared by:** Lead Developer | Codex (GPT-5)  
**Audience:** Senior Developer executing expensive comparison runs  
**Purpose:** Reproduce the same article/claim inputs across selected historical checkpoints to identify where report quality degraded.

---

## 1. Critical Context

### 1.1 Do NOT use the `Alpha` tag as a quality baseline

`git rev-parse Alpha` resolves to commit `1a3d5281`, whose commit message is `Docs`.

That tag is not a meaningful code checkpoint for report-quality comparison. It is effectively a documentation marker, not a known analytical baseline.

If the Captain says “Alpha label”, treat that as “the Alpha-era code range”, not literally the `Alpha` git tag.

### 1.2 Known useful checkpoints

Use these local tags instead:

| Tag | Commit | Why it matters |
|-----|--------|----------------|
| `quality_window_start` | `9cdc8889` | Start of the user’s remembered “best quality” window |
| `quality_window_end` | `1b274655` | End-of-window marker. Docs-only commit, useful as a boundary marker rather than a full code checkpoint |
| `quality_post_window_first_code` | `704063ef` | First code-changing commit after the remembered good window |
| `quality_deployed_proxy` | `523ee2aa` | Best known proxy for deployed Mar 8 PT Bolsonaro 90% run |
| `quality_fix0` | `7ed71a05` | Phase A / Fix 0 only |
| `quality_fix1` | `172bba3d` | Phase B / Fix 1 |
| `quality_head` | current `HEAD` | Current state under investigation |
| `quality_sr_weighting_onset` | `9550eb26` | Optional extra checkpoint to isolate `applyEvidenceWeighting` |

Recommended main comparison set:

1. `quality_window_start`
2. `quality_post_window_first_code`
3. `quality_deployed_proxy`
4. `quality_head`

Special case:

- `quality_window_end` is docs-only. Do not treat it as a full execution checkpoint unless you need a boundary confirmation run.

---

## 2. Goal

Run the same claim/article inputs on the selected checkpoints, then compare:

- truth percentage
- confidence
- verdict label
- boundary count and names
- foreign-jurisdiction contamination
- source reliability side-effects

The main question is:

**At which checkpoint did quality regress, and was the regression caused by pipeline behavior, config drift, SR weighting, or search/evidence differences?**

---

## 3. Required Inputs

Use the exact claims from the approved baseline documents:

- PT Bolsonaro:
  - `Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process?`
- EN Bolsonaro:
  - `Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?`
- DE Kinder Migration:
  - `Immer mehr Kinder im Kanton Zürich sind von Migration betroffen`

If the user wants “same articles” rather than only claims, use the exact same article URLs/text inputs across all checkpoints as well. Do not paraphrase between runs.

Primary recommended claim set:

1. PT Bolsonaro
2. EN Bolsonaro
3. DE Kinder Migration

If budget is tight, prioritize:

1. PT Bolsonaro
2. EN Bolsonaro

### 3.1 How many inputs by tag

Recommended run count by tag:

| Tag | Inputs to run | Why |
|-----|---------------|-----|
| `quality_window_start` | 3 | Full benchmark of the remembered good window |
| `quality_post_window_first_code` | 3 | Detect whether degradation begins immediately after the window |
| `quality_deployed_proxy` | 3 | Compare against known high-performing deployed-era proxy |
| `quality_head` | 3 | Current state |
| `quality_window_end` | 0 or 1 | Docs-only marker. Run only EN Bolsonaro if a boundary confirmation is needed |
| `quality_fix0` | 1 | Optional diagnostic: EN Bolsonaro only |
| `quality_fix1` | 1 | Optional diagnostic: EN Bolsonaro only |
| `quality_sr_weighting_onset` | 1 or 2 | Optional diagnostic if SR weighting effect needs isolation |

Default recommendation:

- First pass: PT Bolsonaro + EN Bolsonaro on the 4 main tags
- Second pass: add DE Kinder Migration on the same 4 tags
- Skip full execution on `quality_window_end`

---

## 4. Known Confounds

These must be recorded in the final report:

### 4.1 Config drift

`quality_deployed_proxy` differs materially from current defaults. Before interpreting any checkpoint delta, run:

```powershell
git diff quality_deployed_proxy..quality_head -- apps/web/configs/
git diff quality_window_start..quality_head -- apps/web/configs/
```

Relevant prior finding: `Docs/WIP/Baseline_Test_Results_Phase1_2026-03-12.md` §8 already documents material config differences.

### 4.2 SR weighting confound

Commit `9550eb26` turned on `applyEvidenceWeighting`. Recent validation notes say this may pull TP/confidence toward 50 and confound quality comparisons.

Do not attribute TP/confidence movement purely to contamination fixes without checking whether SR weighting is active at that checkpoint.

### 4.3 Search-result drift

Search results changed since March 8, 2026. This is unavoidable. We are comparing code/config behavior under current web conditions, not replaying historical search results.

### 4.4 `Alpha` tag confusion

Again: do not build a worktree from `Alpha` unless the Captain explicitly wants a docs-era snapshot for some separate reason.

---

## 5. Worktree Setup

Create isolated worktrees so each checkpoint can run independently.

Suggested folder names:

```powershell
git worktree add ..\\FH-quality_window_start quality_window_start
git worktree add ..\\FH-quality_post_window_first_code quality_post_window_first_code
git worktree add ..\\FH-quality_deployed_proxy quality_deployed_proxy
git worktree add ..\\FH-quality_fix0 quality_fix0
git worktree add ..\\FH-quality_fix1 quality_fix1
```

For current `HEAD`, use the main workspace.

For each worktree:

```powershell
cd ..\\FH-<commit>\\apps\\web
npm install
```

Use unique ports per checkpoint to avoid collisions.

Suggested mapping:

| Checkpoint | Web | API |
|-----------|-----|-----|
| `quality_window_start` | 3001 | 5001 |
| `quality_post_window_first_code` | 3002 | 5002 |
| `quality_deployed_proxy` | 3003 | 5003 |
| `quality_fix0` | 3004 | 5004 |
| `quality_fix1` | 3005 | 5005 |
| `HEAD` | 3000 | 5000 |

If env files are needed, copy them carefully and adjust only ports / DB paths. Do not overwrite secrets.

---

## 6. Per-Checkpoint Preparation

Before running claims on a checkpoint:

1. Confirm the commit:

```powershell
git rev-parse HEAD
git show --no-patch --oneline HEAD
```

2. Record whether SR weighting is active:

```powershell
rg -n "applyEvidenceWeighting|feat\\(sr\\): wire applyEvidenceWeighting" apps/web/src/lib/analyzer/claimboundary-pipeline.ts
```

3. Record relevant config defaults:

```powershell
Get-Content apps/web/configs/pipeline.default.json
Get-Content apps/web/configs/search.default.json
Get-Content apps/web/configs/sr.default.json
```

4. Clear the SR DB used by that checkpoint.

Prefer the env-backed path if configured. The live SR cache code uses `FH_SR_CACHE_PATH` and the table name is `source_reliability`.

5. Start the checkpoint services.

---

## 7. Exact Data To Capture

For each run, capture:

- commit hash
- claim input
- language
- job ID
- truth percentage
- confidence
- verdict label
- number of claim boundaries
- boundary names
- whether any boundaries are foreign-jurisdiction focused
- count of U.S. government / foreign-government-action evidence items
- count of contextual foreign-observer items
- whether sanctions / executive orders / congressional statements appeared

Also extract SR cache rows after the phase:

```sql
SELECT domain, score, confidence, source_type, evaluated_at
FROM source_reliability
ORDER BY evaluated_at DESC;
```

Do not use `sr_cache`; that table name is wrong for this repo.

---

## 8. Recommended Execution Order

### Option A: Minimal high-signal path

1. `quality_window_start` — PT Bolsonaro, EN Bolsonaro
2. `quality_post_window_first_code` — PT Bolsonaro, EN Bolsonaro
3. `quality_deployed_proxy` — PT Bolsonaro, EN Bolsonaro
4. `quality_head` — PT Bolsonaro, EN Bolsonaro

Use this if cost/time must stay tight.

### Option B: Better comparison set

For each of:

- `quality_window_start`
- `quality_post_window_first_code`
- `quality_deployed_proxy`
- `quality_head`

Run:

1. PT Bolsonaro
2. EN Bolsonaro
3. DE Kinder Migration

This gives the best picture of:

- Bolsonaro-specific degradation
- language effect
- whether German/Swiss quality stayed stable while Bolsonaro degraded

### Option C: Focused diagnostic add-ons

Only if needed after the main comparison:

- `quality_fix0` — EN Bolsonaro only
- `quality_fix1` — EN Bolsonaro only
- `quality_window_end` — EN Bolsonaro only, boundary check only
- `quality_sr_weighting_onset` — EN or PT Bolsonaro only, to isolate SR weighting impact

---

## 9. Interpretation Rules

Use these heuristics when writing up results:

- If `quality_window_start` clearly outperforms `quality_post_window_first_code` on the same inputs, degradation likely begins immediately after the remembered good window.
- If `quality_deployed_proxy` performs closer to `quality_window_start` than to `quality_head`, the deployed-era peak reflects materially better code/config behavior than current HEAD.
- If `quality_fix0` improves structure but not verdict quality, Fix 0 is structural-only and insufficient on its own.
- If `quality_fix1` reduces contamination only slightly while leaving sanctions/EOs in place, Fix 1 is too weak or the model/compliance seam is wrong.
- If degradation aligns with `quality_sr_weighting_onset`, SR weighting is a likely contributor and must be separated from jurisdiction contamination effects.

Success criteria for the jurisdiction investigation should focus on:

- `0` foreign-government-action-only boundaries
- sanctions / EO / congressional-action items filtered out
- contextual observer material may remain
- truth percentage and confidence should not collapse relative to the pre-fix baseline

Do **not** use “0 U.S. items total” as the primary success metric.

---

## 10. Deliverable Format

Append findings to a dedicated result doc, for example:

`Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-12.md`

Minimum structure:

1. checkpoints tested
2. exact claims run
3. per-run result table
4. contamination table
5. SR table summary
6. config/confound notes
7. degradation window conclusion
8. recommended next fix

Also append a short entry to `Docs/AGENTS/Agent_Outputs.md`.

---

## 11. Recommended Agent Prompt

Use this with another agent:

```text
As Senior Developer, execute Docs/AGENTS/Handoffs/2026-03-12_Senior_Developer_Report_Quality_Worktree_Comparison_Runbook.md.

Task:
- run the same claims across the specified quality-window checkpoints and current HEAD
- capture verdict, confidence, boundary structure, contamination, and SR cache outputs
- identify where report quality degraded

Constraints:
- do not use the `Alpha` tag as a code baseline; follow the runbook’s checkpoint list
- record config drift and SR weighting as confounds
- do not change code unless a runbook step explicitly requires env/port setup
- write results to a new WIP result document and append a summary to Agent_Outputs.md

If a checkpoint fails to build or run, document the failure and continue with the remaining checkpoints.
```

---

## 12. Recommendation

This execution is a good fit for another `Senior Developer` agent.

Reason:

- it is expensive and time-consuming
- it is mostly disciplined execution, logging, and comparison
- keeping the current reviewer free is useful because the results will likely need interpretation against the active jurisdiction-fix investigation
