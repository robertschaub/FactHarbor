# Review: Report Quality Opportunity Map — Lead Developer (R3 Delta Review)

**Reviewer:** Lead Developer (Codex)
**Date:** 2026-02-22
**Documents reviewed:**
- `Docs/WIP/Report_Quality_Opportunity_Map_2026-02-22.md`
- `Docs/WIP/Review_QualityMap_R1_LLMExpert_2026-02-22.md`
- `Docs/WIP/Review_QualityMap_R2_LeadDev_2026-02-22.md`
- `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
- `Docs/WIP/Plan_Pause_Status_2026-02-22.md`

**Code verified against:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (4099 lines)
- `apps/web/src/lib/analyzer/verdict-stage.ts` (1114 lines)
- `apps/web/src/lib/analyzer/types.ts` (1001 lines)
- `apps/web/src/lib/config-schemas.ts` (1911 lines)

**Verdict:** APPROVE-WITH-ADJUSTMENTS (R3)

---

## What I Disagree With or What Was Missed

### 1) R2 file/line accuracy — mostly correct, but two material corrections

| Item | R2 claim | R3 verification | Impact |
|---|---|---|---|
| B-7 location in `claimboundary-pipeline.ts` | `~174-290 (aggregation)` | Incorrect. Aggregation is at `aggregateAssessment()` around `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:3661`. Lines `174-290` are orchestration/result assembly, not aggregation logic. | Medium: wrong edit target increases merge/conflict risk and review ambiguity. |
| B-5b file list completeness | 5 files listed | Incomplete for runtime/report consistency. `apps/web/src/lib/calibration/runner.ts` also needs update because `resolveModelName()` currently treats anything not `sonnet` as budget-path (`tier === "sonnet"` check). If `opus` is added, calibration report model resolution will be wrong unless updated. | Medium: report transparency drift and A/B misinterpretation risk. |

Everything else in R2 line-range targeting is broadly accurate (notably `Pass2AtomicClaimSchema` around `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:394`, `generateResearchQueries()` around `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:2088`, `buildVerdictStageConfig()` around `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:3264`, and `debateModelTiers` enum around `apps/web/src/lib/config-schemas.ts:422`).

---

### 2) Hidden integration risks missed by both R1 and R2

1. **Schema versioning risk (high):**
   - New output fields (verifiability/misleadingness/explanation quality) change result shape.
   - Current schema marker still uses `3.0.0-cb` in result JSON (`apps/web/src/lib/analyzer/claimboundary-pipeline.ts:292`).
   - If fields are added without schema bump/backward guards, report tooling and downstream readers can silently diverge.

2. **Prompt/UCM synchronization risk (high):**
   - B-4/B-5a/B-6/B-7/B-8 all touch prompt sections.
   - If prompt updates are not reseeded/versioned in lockstep, runs may claim config parity while actually using stale prompt blobs.
   - This directly undermines calibration comparability and B-2 conclusions.

3. **Boolean-flag invalid-state risk (medium):**
   - Six independent booleans create invalid/untested combinations (e.g., rubric enabled while explanation check disabled).
   - This increases QA matrix size and incident probability.

4. **Policy-compliance risk for B-8 structural checks (medium):**
   - AGENTS mandates no deterministic semantic text decisions.
   - Structural checks are fine only if truly structural (counts/presence/IDs). Any semantic “quality” scoring logic must remain LLM-based.

5. **Evidence annotation propagation risk (medium):**
   - Adding new fields at Stage 1/4 is not sufficient unless propagation is validated through: result JSON, report renderer, calibration extractor, and any dashboard summaries.
   - This is where “implemented but invisible” failures happen.

---

### 3) Implementation order — I recommend a reorder

R2 order: `B-5a -> B-6 -> B-7 -> B-4 -> B-5b -> B-8`

**R3 recommended order:**
1. `M0` (new): micro-modularization seams in `claimboundary-pipeline.ts` at the exact insertion hotspots (no behavior change).
2. `B-5a` challenger prompt refinement (low risk, immediate value).
3. `B-4` pro/con query separation + budget framework (feeds B-3 and should be measured early).
4. `B-6` verifiability annotation (Stage 1, flag-only for v1).
5. `B-7` misleadingness annotation (explicitly decoupled from truth%).
6. `B-8` explanation quality mode (diagnostic only initially).
7. `B-5b` opus-tier support last (highest cost/risk, should follow tracing + early quality deltas).

**Why this reorder:**
- `B-4` is upstream evidence-shaping and should land before downstream annotation features.
- `B-5b` has the highest cost-risk and should not front-run lower-risk quality gains.
- Micro-modularization first avoids making full modularization a blocker while still reducing edit risk in a 4099-line hotspot.

---

### 4) UCM flags — 6 booleans are too many; use modes

I do **not** recommend six independent boolean flags.

**Recommended control surface:**
1. `queryStrategyMode`: `legacy | pro_con`
2. `perClaimQueryBudget`: number
3. `claimAnnotationMode`: `off | verifiability | verifiability_and_misleadingness`
4. `explanationQualityMode`: `off | structural | rubric`

Then keep numeric thresholds/weights in `CalcConfig` where needed.

This reduces invalid combinations, shrinks test matrix, and keeps admin UX clearer.

---

### 5) Sequential merge on `main` (Amendment 6) — yes, but with strict guardrails

I agree with sequential merge on `main` for this team model (solo dev + AI agents), **with mandatory controls**:
- One active writer on `claimboundary-pipeline.ts` at a time.
- One feature per short-lived branch/PR; no stacked multi-feature branches.
- Pre-merge gate for each slice: `npm test` + `npm -w apps/web run build`.
- Explicit “prompt reseed + config hash note” in each PR touching prompts.

Without these controls, sequential merge alone is not enough.

---

### 6) Effort estimate (20-26h) — optimistic by ~30%

I do not agree with 20-26h as execution-ready total.

**Likely range:** **28-36h**

Reason: R2 underestimates non-coding overhead:
- schema/version compatibility work,
- prompt reseed/verification,
- regression matrix expansion for mode flags,
- conflict handling in hotspot files,
- A/B interpretation prep and report consistency checks.

---

## Additional Amendments (R3)

### Amendment 8 — Micro-modularization pre-step (M0)
Before B-items, extract no-behavior-change seams for:
- research query strategy,
- verdict config resolution,
- quality annotation assembly.

This is not full refactor; it is edit-risk reduction.

### Amendment 9 — Schema discipline requirement
Any new output fields from B-6/B-7/B-8 must include:
- schema version bump strategy,
- backward compatibility behavior,
- report/telemetry renderer verification on legacy artifacts.

### Amendment 10 — Prompt/UCM parity check
For any B-item touching prompts: require explicit parity check that runtime prompt source and intended prompt revision match before claiming A/B comparability.

---

## Bottom Line

- R2 is directionally strong and mostly code-accurate.
- The main misses are: one wrong line target (B-7), one incomplete file list (B-5b), and lack of explicit controls for schema/version and prompt/UCM parity.
- With R3 amendments and reordered execution, implementation risk drops materially while preserving speed.
