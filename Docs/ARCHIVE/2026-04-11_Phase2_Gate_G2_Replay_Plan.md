---
title: Phase 2 Gate G2 — Replay Plan (Revision 4)
date: 2026-04-11
parent: Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md
depends_on:
  - Docs/WIP/2026-04-11_Phase2_Replay_Input_Set.md
  - Docs/WIP/2026-04-11_Phase2_Per_Input_Expectations.md
status: Final draft — awaiting user green-light
revision: 4 (per-input acceptance criteria, Q-ST5 dropped per user, Q-V1 absorbed, 8 LLM Expert fixes applied, Captain Deputy recommendations applied)
---

# Phase 2 Gate G2 — Replay Plan (Rev 4)

Final draft. Rev 4 supersedes Rev 3 after user direction on 2026-04-11:

1. **Drop Q-ST5 (cross-linguistic) from priority** — cross-lang will be addressed later via a different architectural approach (always analyze in input-language + English). Not a Phase 2 concern.
2. **Replace generic "input-specific" criteria with documented per-input acceptance criteria** — extracted from [`2026-04-11_Phase2_Per_Input_Expectations.md`](2026-04-11_Phase2_Per_Input_Expectations.md).
3. **Apply all 8 LLM Expert required fixes from Rev 3 review** — stop rule rewording, measurement additions, preflight checks, prior rewording, Q-V1 absorption.
4. **Apply Captain Deputy recommendations** — single yes/no decision surface, reviewer questions removed from Captain-facing section.

## Priority criteria (restructured)

The criteria set is now two-tier: a tiny global layer (for system-level and stability concerns that apply to every input) plus a larger per-input layer (for concrete expectations documented for specific inputs).

### Global layer (applies to all 4 inputs)

| ID | Layer | Name | Measurement |
|---|---|---|---|
| **G1** | System integrity | **Q-HF5 — Stage 1 contract integrity** — pipeline must NOT silently ship reports where `preservesContract: false` | Binary per run; count occurrences per commit |
| **G2** | Stability | **Q-ST1 — Truth spread across same-input runs** — ≤15pp good, ≤20pp acceptable | Stdev and min-max range per input per commit |

Dropped from Rev 3:
- **~~Q-ST5~~ cross-linguistic neutrality**: user directive, handled differently later via dual-language analysis. Still **captured as data** for Phase 3 reference (R3 vs R3b mean delta) but not a priority pass/fail signal.
- **~~Q-S1.1 / Q-S1.3 / Q-S1.5~~ generic Stage-1 signals**: replaced by concrete per-input criteria below.
- **~~Q-V1 verdict direction plausibility~~**: absorbed into per-input verdict-range criteria (R2.1, R3.1, R3b.1, R4.1). A per-input verdict-range check IS a Q-V1 test, but input-specific.

### Per-input acceptance criteria

Extracted from [`2026-04-11_Phase2_Per_Input_Expectations.md`](2026-04-11_Phase2_Per_Input_Expectations.md), which cites the source docs verbatim.

#### R1 — *Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz*

| ID | Criterion | Violation |
|---|---|---|
| **R1.1** | Verdict label = **TRUE or MOSTLY-TRUE**, truthPercentage **≥75%** (target TRUE ≥85%) | Verdict in MIXED band or FALSE-side |
| **R1.2** | At least one `supportingEvidenceIds` entry references `https://www.sem.admin.ch/dam/sem/de/data/publiservice/statistik/asylstatistik/2025/stat-jahr-2025-kommentar.pdf` | SEM URL absent from supporting evidence, or present only in `contradictingEvidenceIds`, or only in narrative without evidence-item citation |
| **R1.3** | Numeric threshold **"235 000"** appears verbatim in primary atomic claim's `statement` | Number rounded, dropped, or approximated |
| **R1.4** | Temporal qualifier **"zurzeit"** (or semantically equivalent) preserved in primary atomic claim | Claim generalised to historical or non-temporal form |

Documentation strength: **USER-PROVIDED** (2026-04-11) — acceptance criteria supplied directly by user, no prior investigation baseline.

#### R2 — *Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben*

| ID | Criterion | Violation |
|---|---|---|
| **R2.1** | Verdict in **11–31 range** (LEANING-FALSE / MOSTLY-FALSE), fused modifier | Verdict ≥50 with modifier not fused |
| **R2.2** | `rechtskräftig` appears **verbatim inside the primary direct claim text** | Modifier absent OR only in tangential/contextual side claim |
| **R2.3** | `preservesContract === true` in contract validator output | `preservesContract === false` AND report ships |
| **R2.4** | No atomic claim contains *verfassungsrechtlich*, *constitutional order*, *democratic legitimacy*, or other legality-inference not in input | Any such injected normative claim |

Documentation strength: **HIGH** (4 job artifacts, 3 failure modes catalogued, quantified targets).

#### R3 — *Plastic recycling is pointless*

| ID | Criterion | Violation |
|---|---|---|
| **R3.1** | Verdict in **40–60% range** (MIXED to LEANING-TRUE) | Verdict <30 or >75 on evaluative topic |
| **R3.2** | **≥3 atomic claims** covering distinct dimensions (ecological / economic / pollution) | 1-claim collapse |
| **R3.3** | **No single boundary holds >70% of evidence** | Share ≥0.70 |
| **R3.4** | **Each claim has `researchedEvidenceCount > 0`** (not seeded-only) | `41 seeded / 0 researched`-style degenerate sufficiency |

Documentation strength: **MEDIUM-LOW** (cross-lang relationship documented, single-variant verdict target weak).

#### R3b — *Plastik recycling bringt nichts*

| ID | Criterion | Violation |
|---|---|---|
| **R3b.1** | Verdict in **30–50% range** (MIXED / LEANING-FALSE), target mean ~38 | Verdict >60 (matches known-wrong deployed outlier) |
| **R3b.2** | Same 3-claim structure (ecological / economic / pollution) | 1-claim collapse |
| **R3b.3** | No single boundary holds >70% of evidence | Share ≥0.70 |
| **R3b.4** | Each claim has `researchedEvidenceCount > 0` | Degenerate seeded-only sufficiency |

Documentation strength: **MEDIUM** (family statistics well-documented: mean 38.8, median 37.0, 80% ≤50% correct direction).

#### R4 — *Were the various Bolsonaro trials and convictions fair and based on the rule of law?*

| ID | Criterion | Violation |
|---|---|---|
| **R4.1** | Verdict in **68–80% range** (MOSTLY-TRUE) | Outside 60–85% |
| **R4.2** | **≥2 atomic claims** distinguishing STF (coup, 2024/25) from TSE (electoral, 2023) | 1 collapsed claim |
| **R4.3** | **≥3 boundaries** with Brazilian institution names (STF, TSE, PGR, Federal Police, or specific court/case refs) | <3 or all generic |
| **R4.4** | **Zero boundaries** named *U.S.*, *State Dept*, *Executive order*, *Political commentary*, *Government press releases* | Any such boundary |
| **R4.5** | **Zero `verdictAdjusted=true`** from U.S. political opinion challenges | Any such adjustment |
| **R4.6** | **27-year sentence** mentioned in narrative or evidence | Absent |
| **R4.7** | **Confidence ≥65%** | <65% |

Documentation strength: **HIGH** (2026-03-12 Scorecard B1–B7, 13-run scored dataset).

### Priority criteria total

- 2 global criteria + (4 + 4 + 4 + 4 + 7) per-input criteria = **25 pass/fail checks** across the replay (R1 added 2026-04-11 per user direction)
- Each check is **input-specific and directly measurable** from a single run's `resultJson`

## Decisions carried forward from earlier gates

- **Inputs (5)**: R1 (added 2026-04-11 per user direction with documented criteria), R2, R3, R3b, R4. R5–R9 deferred to Phase 2B.
- **R2 phrasing**: `unterschreibt` (matches 4 historical baseline jobs)
- **`tmp_jobs*.json` excluded** as baseline source
- **Matrix improvement**: explicitly deferred to a separate post-replay workstream
- **Wave 1A safeguard**: deferred until after replay (apples-to-apples with historical R2 baseline)
- **Q-ST5 cross-lang**: dropped from priority (user directive, handled later via dual-language analysis)

## Shape B — 3 commits

| ID | Commit | Date | Isolates |
|---|---|---|---|
| **C0** | *new HEAD after commit sequence below* | — | Current state: Commit A1 applied, Commit B reverted, Wave 1A (A2) stashed |
| **C1** | `82d8080d` | 2026-04-09 17:01 | Last code-touching commit before Apr 9 evening prompt-downgrade. **C0 vs C1 = Apr 9–10 wave** (comparator downgrade + Option G + contract-preservation hardening) |
| **C3** | `442a5450` | 2026-04-07 13:34 | UPQ-1 Phase B, end of pre-Apr-8 state. **C0 vs C3 = post-UPQ-1-Phase-B wave** (entire Apr 7 afternoon → Apr 10 run) |

*(C1 and C3 preserve the original identifiers from Rev 3. C0 is what the new HEAD will be after the commit/revert sequence below.)*

## Input × run count (Shape B)

| # | Input | Runs/commit |
|---|---|---|
| **R1** | Asylum 235 000 (DE) | **2** |
| R2 | Bundesrat rechtskräftig (`unterschreibt`) | **5** |
| R3 | Plastic recycling is pointless | 3 |
| R3b | Plastik recycling bringt nichts | 3 |
| R4 | Bolsonaro various | 2 |
| | **Per commit** | **15** |
| | **Across 3 commits** | **45** |

Cost envelope: **$17–33** (weighted average ~$0.45/job; R1 added 2026-04-11 per user direction — +6 jobs, +$2–3).

## Commit sequence (before replay)

Unchanged from Rev 3 except for the added preflight checks per LLM Expert.

### Preflight checks (done 2026-04-11, recorded here as verification)

```bash
# Check 1: A2 files must not import types being removed in A1
grep -n "DominanceAssessment\|dominance_adjusted\|unresolved_claim_narrative_adjustment" \
  apps/web/src/lib/analyzer/claim-extraction-stage.ts \
  apps/web/prompts/claimboundary.prompt.md \
  apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts \
  apps/web/test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts
```

**Result** (2026-04-11): **empty output** — no hits. A1/A2 type overlap risk confirmed not present. Safe to proceed.

### Commit A1 (land now, architecturally safe)

Dead-code removal + documentation only. No behavioral impact on replay path.

- `apps/web/configs/calculation.default.json` — remove dead `articleVerdictOverride` block
- `apps/web/src/lib/config-schemas.ts` — remove matching schema
- `apps/web/src/lib/analyzer/types.ts` — remove deprecated `DominanceAssessment` types and deprecated path enum variants
- `apps/web/prompts/README.md` — docs refresh
- `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Role_Learnings.md` — session log updates

### Commit A2 (deferred — stashed until after replay)

Wave 1A safeguard + `thesisRelevance` anchor gating + tests. Stashed in working tree during Phase 2.

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts` (Wave 1A safeguard)
- `apps/web/prompts/claimboundary.prompt.md` (`thesisRelevance`-gated anchor carrier check)
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`

Post-replay Phase 4 work: commit A2 with the LLM Expert's recommended `contract_validation_unavailable` warning-type distinction.

### Commit B (land now, immediately revert)

Matrix UI refactor. Committed so it's reversible, then reverted immediately to restore verdict coloring.

- `apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/test/unit/app/jobs/[id]/components/CoverageMatrix.test.tsx`

### Execution order with preflight verification

```bash
# 1. Stash A2 files (verify stash exists afterwards)
git stash push -m "A2-wave1a-safeguard-deferred" -- \
  apps/web/src/lib/analyzer/claim-extraction-stage.ts \
  apps/web/prompts/claimboundary.prompt.md \
  apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts \
  apps/web/test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts
git stash list | grep "A2-wave1a-safeguard-deferred"   # PREFLIGHT: must print the stash entry; abort if empty

# 2. Stage and commit A1
git add \
  apps/web/configs/calculation.default.json \
  apps/web/src/lib/config-schemas.ts \
  apps/web/src/lib/analyzer/types.ts \
  apps/web/prompts/README.md \
  Docs/AGENTS/Agent_Outputs.md \
  Docs/AGENTS/Role_Learnings.md
# PREFLIGHT: verify no A2 files snuck into staging area
git diff --cached --name-only | grep -E "claim-extraction-stage|claimboundary.prompt.md|claim-contract-validation|prompt-frontmatter-drift" && echo "ABORT: A2 file in A1 staging" && exit 1
git commit   # "chore(cleanup): remove dead articleVerdictOverride + deprecated dominance types (A1)"

# 3. Stage and commit B
git add \
  apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx \
  apps/web/src/app/jobs/[id]/page.tsx \
  apps/web/test/unit/app/jobs/[id]/components/CoverageMatrix.test.tsx
git commit   # "refactor(ui): coverage matrix count-only semantics (PR 2 Rev B Track 2)"

# 4. Immediately revert B to restore verdict coloring
git revert HEAD --no-edit   # creates a new commit reverting the previous one

# 5. Final verification
git status           # should show only the 4 stashed A2 files and existing untracked files
git stash list       # should still show A2 stash
git log --oneline -5 # A1, B, revert-B on top

# 6. New HEAD is C0. Replay can begin.
```

Post-replay: `git stash pop` to restore A2 files for Phase 4 commit-with-warning-type work.

## Execution protocol for replays

Worktree-based **but all jobs land in the main `apps/api/factharbor.db`** per user directive 2026-04-11, so the user can browse the replay jobs in the main web UI afterwards. Worktree API instances are pointed at the main DB path via `FH_DB_PATH` env var override (see step 3 below). C0 also runs in a worktree on post-commit HEAD, not in the main working tree (avoids contamination from the A2 stash).

### Per-commit cycle

```bash
# Precondition: only ONE API server running at a time (main-tree API must be stopped before any worktree API starts).

# For each target in { <new-HEAD-sha>, 82d8080d, 442a5450 }:

# 1. Worktree setup
git worktree add .tmp/qr-<shortsha> <SHA>
cd .tmp/qr-<shortsha>

# 2. Install deps (only if package-lock differs from main)
[ -f package-lock.json ] && diff -q package-lock.json c:/DEV/FactHarbor/package-lock.json || npm install --frozen-lockfile

# 3. Start services, API db pointed at main-tree factharbor.db
cd apps/api
FH_DB_PATH="c:/DEV/FactHarbor/apps/api/factharbor.db" dotnet run &   # port 5000
cd ../web
npm run dev &                                                          # port 3000

# 4. Quota probe BEFORE batch submission
# Submit a single canary job (short input, cheap). If it fails with 429/529/
# quota-exceeded, pause the replay and report to user.
curl -X POST http://localhost:5000/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"inputType":"text","inputValue":"The sky is blue","pipelineVariant":"claimboundary","inviteCode":"SELF-TEST"}'
# Wait for completion; check resultJson for llm_provider_error / quota warnings.

# 5. Batch submission per input (R2 → 5 runs, R3 → 3, R3b → 3, R4 → 2 = 13 jobs per commit)
# Submit in sequence, poll each to completion, capture output. Between each
# input's runs, check the last result's analysisWarnings for quota-related errors.
# If ANY quota/rate-limit/overload error appears at ANY point, PAUSE immediately
# and report to user before any further submission.

# 6. Capture outputs to test-output/quality-restoration/<shortsha>/
# Includes jobId (which remains in the main db for later UI browsing)

# 7. Stop services
kill %1 %2   # api + web background jobs

# 8. Teardown worktree
cd c:/DEV/FactHarbor
git worktree remove .tmp/qr-<shortsha>
```

**Database target (per user directive 2026-04-11)**:
- All replay jobs are persisted in `c:/DEV/FactHarbor/apps/api/factharbor.db` (the main repo db).
- The user can browse them at `http://localhost:3000/jobs` after the replay completes (by restarting the main-tree API+web).
- `jobId` values are captured in replay output JSON files so each commit's runs are identifiable in the job list.
- **Implication**: only one API server runs at a time to avoid SQLite lock contention. Main-tree API must be stopped before a worktree API starts.
- **Schema compatibility**: the worktree code for historical commits (`82d8080d`, `442a5450`) is ~4 days old and ~1 week old respectively. No breaking EF migrations have landed since then, so the older code can safely read/write the current db schema (EF maps only known columns). If a schema incompatibility is detected on startup, pause and report.

**Quota check protocol (per user directive 2026-04-11)**:
Before each commit's 13-job batch, run the quota probe (step 4 above). On any of these signals, PAUSE and report to user before submitting any further jobs:
- HTTP 429 (rate limit)
- HTTP 529 (Anthropic overloaded)
- `analysisWarnings[]` contains `llm_provider_error`, `quota_exceeded`, or equivalent
- Any job finishes with status `FAILED` and error text mentioning quota/rate/overload
- Rate of `llm_provider_error` > 10% across the probe + first 3 runs

Between inputs within a batch, the last completed job's warnings are inspected. Quota issue anywhere = pause the whole replay.

### Measurements captured per run

| # | Measurement | Source | Purpose |
|---|---|---|---|
| M1 | `verdictLabel`, `truthPercentage`, `confidence` | `resultJson` | Core verdict |
| M2 | Full `resultJson` + `reportMarkdown` | response body | Phase 3 analysis input |
| M3 | `analysisWarnings[]` by type + severity | `resultJson` | System-level failures / evidence scarcity signals |
| M4 | **Option G cap-trigger count** (was it clamped by `maxDeviationFromBaseline`?) | `adjudicationPath.guardsApplied.deviationCapped` | Sanity rail vs semantic limiter test |
| M5 | **Wave 1A termination count** (should be exactly 0 — A2 is stashed) | `analysisWarnings[]` contains `contract_validation_unavailable`-equivalent? | Unexpected path detection |
| M6 | **`anchorOverrideRetry` trigger count** | Stage 1 telemetry in `resultJson` | Retry-pressure signal |
| M7 | **`atomicClaims[].statement` text + `atomicClaims.length`** | `resultJson.understanding.atomicClaims` | **Tri-modal regime detection on R2** (fused vs reified vs never-attempted) |
| M8 | **Cited evidence supporting/opposing split per boundary** | `boundaryFindings[].supportingEvidenceIds` + `contradictingEvidenceIds` | Q-V1-adjacent signal + distinguishes cap-short-circuit from cap-sanity-rail |
| M9 | `thesisRelevance` field presence per claim | `atomicClaims[].thesisRelevance` | Detect whether filter is running against populated field or defaulting |
| M10 | `contractValidationSummary.preservesContract` value | `resultJson.understanding.contractValidationSummary` | **Core R2.3 / Q-HF5 measurement** |
| M11 | `gitCommitHash` from job record | job metadata | Diagnostic if present |
| M12 | `createdUtc` timestamp | job metadata | Run sequencing |

M7 and M8 added in Rev 4 per LLM Expert Rev 3 review (required items #3-4).

### Stop rule (Rev 4)

**Pause the replay** if any of these conditions fire on any commit-to-commit delta:

1. **Per-family mean regression ≥15pp** on any single family's verdict (4 runs or more needed to call this).
2. **Any nonzero Wave 1A termination** across any commit. Baseline is 0 (A2 stashed); any occurrence indicates unexpected path.
3. **Cap-trigger rate ≥50% across the full 13-job commit batch** (not per-family — LLM Expert correction).
4. **Uniform 10–15pp regression across ≥3 of 4 families in the same commit-pair** — catches the wide-but-shallow regression pattern that per-family thresholds miss.

On pause: targeted bisect (1–2 commits, ~26 jobs, ~$10–20), then resume.

### Post-first-commit R2 variance check

After the first commit's 5 R2 runs complete, compute R2 stdev. If stdev >25pp, pause before running the next commit and add 3 more R2 runs to baseline the underlying distribution.

## Phase 2B — conditional expansion

Phase 2B requires explicit user approval at the pause point. Automatic triggers (either of):

1. **Stop rule fires** (any of 4 conditions above) AND targeted bisect does not resolve the ambiguity
2. **Uniform shallow regression** (third trigger condition) fires → add C2 `008918dc` as bisect point
3. **Q-V1 cannot be concluded** from Shape B results AND user wants a cleaner answer → add R7/R8 inverse pair (+12 jobs, +$5)
4. **Coverage expansion requested** by user → add any subset of {R1, R5, R6, R9}

**Phase 2B maximum total**: Shape B (39) + up to 2 additional commits (26) + R7/R8 pair (12) + coverage inputs (up to 20) = up to **97 jobs ≈ $35–75**.

## Strong priors (NOT decisions)

These are hypotheses from diff-level reading, documented here for Phase 3/4 input. They are not Phase 2 decisions. The replay data may confirm or refute them.

1. **Option G (`d5ded98f`) is architecturally aligned** with the "no deterministic verdict manipulation" constraint. Its LLM-led direction-conflict adjudication replaces the deterministic `dominance` weight multiplier. *Prior*: keep. *Replay may show*: net regression on C0 vs C1 that would revise this prior.

2. **`getDeterministicDirectionIssues` lines 1680–1693 + `isVerdictDirectionPlausible` Rules 1–3 + `directionMixedEvidenceFloor` + self-consistency rescue boost from `db7cdcf8`** violate Q-AH1. All use hemisphere arithmetic or tolerance bands to decide verdict direction. *Prior*: refactor target for Phase 4, full scope per LLM Expert Rev 2 review. *Replay may show*: these rules are load-bearing for stability.

3. **The `d1677dd3` prompt rules** (shared-predicate fidelity, action-threshold fidelity, decision-state verb fidelity) are real fixes for real failure modes. *Prior*: keep. *Replay may show*: they compete with existing rules.

4. **The Apr 1 rollback wave** (`ad62334f`, `a1c5caf5`, `11019788`) **was intended to clean up** the Mar 29–31 regressions; we believe it succeeded, but this is not verified by replay data. *Prior*: Mar 31 → Apr 7 work is net neutral or positive. *Replay may show*: something in the Apr 3–5 grounding-validator overhaul hurts quality.

None of these priors are being acted on until Phase 3 data is in.

## Named scope limitations for Phase 3

Rev 4 is honest about what Shape B cannot conclude:

- **Q-V1 (verdict direction plausibility)**: Shape B can confirm direction-plausibility **failures** via per-input verdict-range checks, but cannot confirm **restoration** without the R7/R8 inverse pair (Phase 2B).
- **Q-ST6 (Stage 1 classification stability)**: not measured in Shape B (SRG R9 dropped). Phase 3 conclusions must not extrapolate to SRG-family classification oscillation.
- **Multilingual robustness beyond DE/EN**: not measured (no FR, no PT, no slavic).
- **Cross-linguistic neutrality Q-ST5**: captured as data (R3 vs R3b mean delta) but NOT a priority pass/fail signal per user directive.

## What G2 approval commits you to

- **Budget**: $15–30 for Shape B; up to $75 total if Phase 2B fully activates (still under original Rev 2 forecast of $85)
- **Time**: ~1.5–2 hours wall clock for Shape B; up to +2 hours if Phase 2B activates
- **Does NOT commit** to any revert, refactor, or merge. Those are Gates G4/G5 decisions based on Phase 3 data.

## Captain green-light decision (single yes/no + optional toggles)

Per Captain Deputy recommendation, the decision surface is consolidated:

> **Green-light Rev 4 as written?** YES / NO / revise

**Optional toggles** (choose freely; any/all):
- **Toggle A**: Add R7+R8 inverse pair (+12 jobs, +$5) — strengthens Q-V1 measurement. *Default: off* (handled via Phase 2B if needed).
- **Toggle B**: Approve Phase 2B pre-authorization up to $75 total without re-asking — replay auto-expands on stop-rule trigger. *Default: off* (stop rule pauses and asks).
- **Toggle C**: Review A1 file contents line-by-line before commit. *Default: off* (A1 is dead-code removal, low risk).

---

**End of Rev 4. Awaiting green-light to execute.**
