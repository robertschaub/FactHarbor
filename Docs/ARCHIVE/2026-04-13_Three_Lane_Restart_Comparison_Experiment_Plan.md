---
title: Three-Lane Restart Comparison Experiment Plan
date: 2026-04-13
authors: Lead Architect (Codex GPT-5) + Captain steering
status: Draft for review
scope: Controlled local comparison of current HEAD vs pre-decline proxy vs legacy baseline hypothesis
---

# Three-Lane Restart Comparison Experiment Plan

## 0. Purpose

This experiment is meant to answer one concrete strategic question:

**Should FactHarbor continue improving the current `HEAD` line, or is there enough evidence to justify opening a restart track from a pre-decline code state?**

This is **not** a rollback plan. It is a controlled comparison plan.

It also answers a secondary historical question:

**Was the older `quality_window_start` belief (`9cdc8889`) actually a stronger baseline than the later pre-decline March 8 pipeline state?**

## 1. Decision questions

### 1.1 Primary decision

For each canary family, does the pre-decline snapshot proxy materially and repeatably outperform current `HEAD`, and if so is there a single restart track worth opening?

### 1.2 Secondary historical decision

Does the legacy `quality_window_start` lane (`9cdc8889`) outperform the March 8 pre-decline proxy strongly enough to keep using it as a historical reference point?

## 2. Lane definitions

Use three lanes, but do **not** treat them as co-equal decision lanes.

### Lane A — `lane_current_head`

- Code state: current `HEAD`
- Execution requirement: dedicated clean HEAD worktree only
- Purpose: current forward-fix line

### Lane B — `lane_quality_before_decline`

- Code state: git label `quality_before_decline`
- Commit: `d3ad26ca6b4f9c2c826af774053ccb07e71fda53`
- Purpose: latest snapshot proxy for the pre-decline pipeline state inherited from the last pipeline-touching commit (`8554529d`)

### Lane C — `lane_legacy_window_start`

- Code state: `9cdc8889004e9dc0d50ad4ac75b18facc2f01f68`
- Existing worktree: `C:\DEV\FH-quality_window_start`
- Purpose: legacy baseline hypothesis lane only
- Priority: secondary historical question, not primary restart-decision lane

## 3. Historical interpretation rules

- `lane_quality_before_decline` is the main restart-comparison lane.
- `lane_legacy_window_start` is **not** treated as a proven best baseline. It is included only to test the earlier hypothesis from older docs.
- If `lane_quality_before_decline` beats `HEAD`, that supports a restart track.
- If `lane_legacy_window_start` loses to `lane_quality_before_decline`, it should stop being used as the preferred historical anchor.
- If the restart decision is already clear after comparing `HEAD` and `quality_before_decline`, the legacy lane does not need equal follow-on budget.

## 4. Canaries

Use exactly these five canaries:

1. `R2a`
   - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

2. `R2b`
   - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`

3. `Swiss Asylum`
   - `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

4. `Bolsonaro EN`
   - `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

5. `Plastic EN`
   - `Plastic recycling is pointless`

### Why this set

- `R2a` tests the truth-condition modifier problem directly.
- `R2b` isolates whether the modifier is the destabilizing factor or whether the broader chronology family is unstable.
- `Swiss Asylum` is a Swiss factual numeric guardrail.
- `Bolsonaro EN` is a historically important legal/process hard family.
- `Plastic EN` is a broad evaluative hard family.

### 4.1 Deliberate omission

PT Bolsonaro is intentionally excluded from this plan because the Captain selected this exact five-canary set for a bounded first-pass comparison. If the first-pass result is historically ambiguous, PT Bolsonaro is the highest-value follow-up canary to add.

## 5. Worktree and database isolation

Each lane must run in its own isolated environment.

### 5.1 Worktrees

- `lane_current_head`: dedicated clean HEAD worktree (mandatory)
- `lane_quality_before_decline`: dedicated worktree at `quality_before_decline`
- `lane_legacy_window_start`: reuse `C:\DEV\FH-quality_window_start`

### 5.2 Databases

Do **not** share the current live databases across lanes.

Each lane gets its own:

- API/result database (`factharbor.db`)
- config database (`config.db`)
- source reliability cache database

Use the same starting config by copying the current config DB into each lane-specific config DB before running.

### 5.3 Lane launcher bindings

File names alone are not sufficient. Each lane must be launched with explicit per-lane bindings.

#### API DB binding

- API reads SQLite path from `ConnectionStrings__FhDbSqlite`
- Use absolute paths, example:
  - `ConnectionStrings__FhDbSqlite=Data Source=C:\DEV\FactHarbor\data\factharbor_head.db`

#### Config DB binding

- Web/config storage reads `FH_CONFIG_DB_PATH`
- Use absolute paths, example:
  - `FH_CONFIG_DB_PATH=C:\DEV\FactHarbor\data\config_head.db`

#### SR cache binding

- SR cache reads `FH_SR_CACHE_PATH`
- Use absolute paths, example:
  - `FH_SR_CACHE_PATH=C:\DEV\FactHarbor\data\source-reliability_head.db`

### 5.4 Suggested per-lane file names

#### Lane A — HEAD

- `factharbor_head.db`
- `config_head.db`
- `source-reliability_head.db`

#### Lane B — quality_before_decline

- `factharbor_qbd.db`
- `config_qbd.db`
- `source-reliability_qbd.db`

#### Lane C — quality_window_start

- `factharbor_qws.db`
- `config_qws.db`
- `source-reliability_qws.db`

### 5.5 Suggested ports

| Lane | Web | API |
|---|---:|---:|
| `lane_current_head` | 3000 | 5000 |
| `lane_quality_before_decline` | 3001 | 5001 |
| `lane_legacy_window_start` | 3002 | 5002 |

## 6. Preconditions

Before running any jobs:

1. Verify each lane is on the intended commit.
2. Verify each lane has a clean working tree.
3. Verify each lane points at isolated DB files.
4. Verify each lane starts from the same copied config DB state.
5. Restart services cleanly per lane after DB/env setup.

For `C:\DEV\FH-quality_window_start`, verify:

```powershell
cd C:\DEV\FH-quality_window_start
git rev-parse HEAD
git show --no-patch --oneline HEAD
git status --short
```

Expected:

- `HEAD` = `9cdc8889`
- clean worktree

## 7. Execution stages

### Stage A1 — primary restart screen

Run the minimum restart-decision set first on the two primary lanes only:

- `R2a`
- `R2b`

Lanes:

- `lane_current_head`
- `lane_quality_before_decline`

Run each canary **2 times**.

Total Stage A1 jobs:

- `2 lanes × 2 canaries × 2 runs = 8 jobs`

### Stage A2 — Swiss expansion + historical lane

Only if Stage A1 is inconclusive, or if the Captain still wants the historical question answered immediately, expand to:

Run only the Swiss/German high-signal set first:

- `R2a`
- `R2b`
- `Swiss Asylum`

Run each canary **2 times** on all **3 lanes**.

Total Stage A2 jobs:

- `3 lanes × 3 canaries × 2 runs = 18 jobs`

### Stage B — broader guardrails

Only if restart comparison remains decision-relevant after Stage A, run:

- `Bolsonaro EN`
- `Plastic EN`

Run each canary **2 times** on the best **2 lanes only**.

Total Stage B jobs:

- `2 lanes × 2 canaries × 2 runs = 8 jobs`

### Total if all stages run

- Stage A1 only: `8 jobs`
- Stage A2: `18 jobs`
- Stage B after full Stage A: `8 jobs`
- Maximum total: `26 jobs`

## 8. Stop/go rule after Stage A

Stage A exists to avoid wasting budget on weak lanes.

### Eliminate a lane immediately if:

- both `R2a` runs produce `UNVERIFIED`
- or both `R2a` runs produce `report_damaged`
- or both `R2a` runs lose the modifier in the final accepted claims

### Stage A ranking rule

Rank lanes in this order:

1. `R2a` clean count
2. `R2b` acceptable count
3. `Swiss Asylum` acceptable count

### Continue a lane into Stage B only if:

- it is one of the top 2 ranked lanes
- and it is not eliminated by the `R2a` rule above

### Inconclusive stop condition

If the top 2 lanes remain split by family after Stage A and no lane has a clear `R2a` advantage, stop and report `Inconclusive` rather than adding more runs to manufacture a winner.

## 9. Recording requirements

For every run, record:

- lane
- commit SHA
- canary ID
- run number
- job ID
- verdict label
- confidence
- `UNVERIFIED` yes/no
- `report_damaged` yes/no
- contamination/provider notes
- short human judgment: `acceptable / borderline / unacceptable`
- search-provider state / quota anomalies
- lane execution order

For `R2a` and `R2b`, additionally record:

- modifier preserved in final accepted claims: yes/no
- Gate 1 / reprompt fired: yes/no
- final contract status
- failure mode if not clean

## 10. Interpretation rules

### 10.1 `R2a` is the primary decision canary

This is the highest-weight canary in the whole plan.

If a lane cannot produce acceptable `R2a` behavior, it should not become the preferred restart base.

### 10.2 `R2b` interpretation

- `R2a` fails, `R2b` succeeds:
  - modifier-preservation/coherence problem
- `R2a` fails, `R2b` fails:
  - broader Stage 1 / proposition-handling problem
- both succeed:
  - Swiss chronology family likely stabilized

### 10.3 Guardrail interpretation

The restart comparison is not valid if a lane improves `R2a` by materially worsening:

- `Swiss Asylum`
- `Bolsonaro EN`
- `Plastic EN`

### 10.4 Run-order control

To reduce time/provider drift:

- interleave lanes by canary where feasible, or
- randomize lane order per canary and mirror the same order across repetitions

Do not run one entire lane first and another entire lane hours later without recording that as a confound.

## 11. Win conditions

### 11.1 Restart-track justification

`lane_quality_before_decline` justifies a restart track only if:

1. it beats `lane_current_head` on `R2a` repeatedly
2. it is not worse on `R2b` and `Swiss Asylum`
3. it survives Stage B without clear regression on `Bolsonaro EN` or `Plastic EN`
4. the advantage is not explained by provider contamination or environment drift

### 11.2 Legacy baseline retention

`lane_legacy_window_start` should remain a serious historical reference only if it materially beats both:

- `lane_current_head`
- `lane_quality_before_decline`

If it does not, it should no longer be treated as the preferred baseline.

## 12. Decision outputs

At the end of the experiment, produce:

1. a **per-family ranking**
2. a **restart decision**

Then allow only one of these consolidated conclusions:

1. **Keep HEAD**
   - current line is at least as good overall

2. **Open restart track from `quality_before_decline`**
   - March 8 pre-decline lane is materially and repeatably better

3. **Legacy baseline disproven**
   - `quality_window_start` is no longer the preferred historical anchor

4. **Inconclusive**
   - rerun only contaminated or disputed cases

## 13. Recommended default interpretation

Expected most likely outcome:

- `lane_quality_before_decline` is the most useful comparison lane
- `lane_legacy_window_start` remains informative but not the preferred forward base
- `R2a` and `R2b` provide the clearest diagnostic signal

## 14. Out of scope

This experiment does **not**:

- approve a rollback
- approve a deployment
- declare `9cdc8889` historically best
- prove Claude Code caused FactHarbor’s decline

It only establishes whether a pre-decline code-state proxy currently beats `HEAD` strongly enough to justify a restart track, and whether the legacy `quality_window_start` hypothesis still deserves historical weight.
