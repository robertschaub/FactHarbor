# Orchestrated Report Quality Improvements Plan

**Date**: 2026-01-29  
**Scope**: Orchestrated pipeline only (`apps/web/src/lib/analyzer/orchestrated.ts`)  
**Status**: Ready to execute (starting with Batch 2 Testing Checkpoint)  

---

## 0. Context (why this plan exists)

We have two parallel streams of work that must remain aligned:

1) **Report-quality improvements** (Orchestrated): contexts, tangential handling, directionality, contested-vs-doubted correctness.  
2) **Evidence terminology + quality enforcement** (EvidenceItem, probativeValue, deterministic evidence filter, sourceType).

Recent work has materially strengthened the foundation:
- `EvidenceItem` exists (legacy `ExtractedFact` remains as deprecated alias).
- Two-layer evidence quality enforcement exists (prompt + deterministic filter).
- `EvidenceScope.sourceType` exists (9 categories).
- A comprehensive test suite exists for the deterministic evidence filter and backward compatibility.

However, the immediate blocker is **verification**: Batch 1 low-risk changes were implemented, but the Batch 2 Testing Checkpoint must be executed and documented before we iterate further.

---

## 1. PRIORITY 0 — Batch 2 Testing Checkpoint (blocking)

### 1.1 Goal

Run a small, canonical regression set and compare against a prior baseline to validate that recent changes improved real outputs (and did not reintroduce earlier issues).

**Decision rule (from reviewer)**:
- If **>30% improvement** on the checkpoint criteria, consider skipping Batch 3 (or narrowing it).

### 1.2 Canonical test cases (5 “base cases”; includes 1 paired variant)

Create a canonical set that covers the historically problematic dimensions:

- **Case A (Input neutrality pair)**: same meaning as question vs statement  
  - A1: question form  
  - A2: statement form  
  - Acceptance: verdict divergence ≤ 4–5% and context count does not change materially.

- **Case B (Comparative / boundary-sensitive)**: comparison claim with boundary-driven context splitting.  
  - Acceptance: contexts split is stable; no tangential contexts; directionality consistent.

- **Case C (Non-English input)**: verify multilingual stability and avoid spurious context creation.  
  - Acceptance: contexts meaningful; centrality not over-assigned; verdict not inflated by noise.

- **Case D (URL/PDF input)**: ensure extraction → research → verdict pipeline stays coherent and not under-evidenced.  
  - Acceptance: adequate evidence count; no silent failures; report sections match content.

- **Case E (Counter-evidence / directionality stress)**: input where counter-evidence is likely and inversion correction matters.  
  - Acceptance: counter-evidence is labeled/handled correctly; aggregate direction matches claim.

**Note**: Case A counts as one “base case” but produces **two jobs**.

### 1.3 How to run (reproducible)

Use existing scripts (no new harness required):

1) Ensure services are running:
- Web: `http://localhost:3000/api/health`
- API: `http://localhost:5000/health`

2) Ensure a baseline regression directory exists:
- Location: `test-output/regressions/<baseline-id>/`
- Must contain `*.job.json` files (case definitions).  
- For delta reporting, should also contain `*.result.json` from a previous run.

3) Run inverse-scope symmetry regression (fast health check):
- Script: `scripts/inverse-scope-regression.ps1`
- Verifies scope symmetry for a primary inverse comparative pair.

4) Run regression runner:
- Script: `scripts/run-regression.ps1 -BaselineDir <baseline-dir>`
- Outputs new run to `test-output/regressions/<timestamp>/` including:
  - `*.job.json`, `*.result.json`
  - `analysis-report.md`
  - debug log snapshots (before/after)
  - swagger snapshot

### 1.4 Checkpoint metrics to record (minimal but decisive)

For each case, capture:
- **Verdict**: article truth% and confidence
- **Context count** + whether contexts are clearly bounded and non-tangential
- **Central claims**: count and whether central claims have supporting/counter evidence IDs
- **Directionality**: no inverted scoring (especially in comparative/counter-claim cases)
- **“Contested” usage**: only when evidence-backed; avoid baseless contradiction labeled as contested

### 1.5 Output artifacts (where results live)

- Regression outputs: `test-output/regressions/<timestamp>/analysis-report.md` (script-produced)
- If needed, add a short human summary alongside it:
  - `test-output/regressions/<timestamp>/checkpoint-summary.md`

### 1.6 Batch 2 checkpoint results (2026-01-29)

This section records the concrete outputs from executing the checkpoint scripts (before any further code changes).

#### Inverse-context symmetry regression (script name: `inverse-scope-regression.ps1`)

- **Run**: `scripts/inverse-scope-regression.ps1 -ApiBase http://localhost:5000`
- **Output dir**: `test-output/inverse-regressions/20260129-113313/`
- **Result**: **FAILED** (exit code 1)
- **Failure condition**: context symmetry check failed (expected equal **context decomposition** for inverse pair; current output field is `meta.scopeCount`)
  - `efficiency_h2_gt_ev` `scopeCount` = 3, truth% = 29 (jobId `cd482bc08d4940d1aee4d17ac45e5164`)
  - `efficiency_ev_gt_h2` `scopeCount` = 5, truth% = 74 (jobId `0b749bc6f0934356b4a325e6b48fd5ea`)
- **Additional inverse pair (did not fail symmetry)**:
  - `safety_flying_gt_driving` `scopeCount` = 2, truth% = 87 (jobId `52d742aba5964da2a2a4b12767af489a`)
  - `safety_driving_gt_flying` `scopeCount` = 2, truth% = 23 (jobId `46942df63de444d59c560e2a35edfb15`)

#### Canonical regression runner (5-case bundle)

- **Run**: `scripts/run-regression.ps1 -ApiBase http://localhost:5000 -BaselineDir test-output/regressions/20260113-184715`
- **Output dir**: `test-output/regressions/20260129-113953/`
- **Result**: Script execution **SUCCEEDED** (all 5 jobs succeeded), but **checkpoint quality gates are NOT met**
- **Key deltas vs baseline** (from `analysis-report.md`):
  - Input neutrality pair: divergence worsened from **25 → 41** points (target: <5%)
    - Question form: truth% **51 → 70** (+19)
    - Statement form: truth% **76 → 29** (-47)
    - Context/scope detection also diverged materially:
      - Question form: `contextCount=2`, `scopeCount=2`
      - Statement form: `contextCount=5`, `scopeCount=5`
  - Comparative/boundary-sensitive case: truth% **19 → 22** (+3)
  - URL/PDF case: truth% **72 → 72** (0)
  - Counter-evidence / directionality stress case: truth% **75 → 45** (-30)

#### Re-run after scope stability fixes (2026-01-29)

This subsection records the *latest* checkpoint outputs after implementing scope flag normalization + deterministic scope dedup improvements.

##### Inverse-context symmetry regression (post-fix)

- **Run**: `scripts/inverse-scope-regression.ps1 -ApiBase http://localhost:5000`
- **Output dir**: `test-output/inverse-regressions/20260129-133249/`
- **Result**: **PASSED** (exit code 0)
- **Observed symmetry**:
  - `efficiency_h2_gt_ev` `scopeCount` = 2 (jobId `30b0568d10ca4b459439b2f49431c552`)
  - `efficiency_ev_gt_h2` `scopeCount` = 2 (jobId `e6204f8e3f644a1d84538d29307edb98`)
  - `safety_flying_gt_driving` `scopeCount` = 2 (jobId `10020b0287ab409592ea9253cc8bfb2d`)
  - `safety_driving_gt_flying` `scopeCount` = 2 (jobId `162e69528f8143f69e60df15ad0f57c4`)

##### Canonical regression runner (post-fix)

- **Run**: `scripts/run-regression.ps1 -ApiBase http://localhost:5000 -BaselineDir test-output/regressions/20260113-184715`
- **Output dir**: `test-output/regressions/20260129-133718/`
- **Result**: Script execution **SUCCEEDED** (all 5 jobs succeeded)
- **Input neutrality (Bolsonaro)**:
  - Divergence improved from **41 → 8** points (target: <5%)
  - Question form: truth% **75** (jobId `ed13ed7d54a5458bb7ac93050055d7ff`)
  - Statement form: truth% **67** (jobId `50db08b54af64ca595493c4bf7c248ae`)
  - Context structure is now stable across question/statement:
    - Question form: `contextCount=2`, `scopeCount=2`
    - Statement form: `contextCount=2`, `scopeCount=2`
    - Both forms produced the *same* two contexts (same IDs), indicating dedup + flag normalization are working.

#### Implication

Batch 2 is currently **red**. Before proceeding to the next implementation batch (e.g., CalcConfig wiring), we need to restore:
- **Context stability** across input-neutral and inverse pairs (question ≈ statement; A ≈ ¬A symmetry on scope decomposition where intended).
- **Directionality stability** on counter-evidence stress inputs (avoid large truth% swings vs baseline).

---

## 2. Next improvements (after Batch 2 is green)

### 2.1 Wire admin CalcConfig into runtime evidence filtering (Orchestrated)

**Problem**: CalcConfig UI exposes evidence filter knobs, but orchestrated runtime still uses `DEFAULT_FILTER_CONFIG` directly.

**Change** (Orchestrated only):
- Load calculation config via `loadCalcConfig(profileKey, jobId)` for each job.
- Use `calcConfig.evidenceFilter` as overrides for `filterByProbativeValue(...)` (keep categoryRules in code initially).

**Safety**:
- Keep `FH_PROBATIVE_FILTER_ENABLED` as a kill switch.
- Preserve deterministic filter defaults when config fields are missing.

### 2.2 Align CalcConfig schema validation + defaults (UCM)

**Problem**: the new CalcConfig fields must be validated and have a single default source of truth.

**Change**:
- Extend `apps/web/src/lib/config-schemas.ts` `CalcConfigSchema` + `DEFAULT_CALC_CONFIG` to include:
  - `probativeValueWeights?`
  - `sourceTypeCalibration?`
  - `evidenceFilter?`

---

## 3. Acceptance criteria for the next batch (post-checkpoint)

- Changing `calcConfig.evidenceFilter` in `/admin/config?type=calculation` produces observable changes in `[Evidence Filter]` logs and kept/filtered counts.
- Calc config usage is recorded per job (`/api/fh/jobs/:id/configs` shows calculation config hash).
- Existing unit tests remain green, especially:
  - `apps/web/test/unit/lib/analyzer/evidence-filter.test.ts`
  - `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts`

