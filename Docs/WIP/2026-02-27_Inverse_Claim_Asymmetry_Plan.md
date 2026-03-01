# Inverse Claim Asymmetry Plan (2026-02-27, updated 2026-03-01 sync)

## Problem

Two mirrored German claims run minutes apart produced materially asymmetric outputs:

- Job `c64ccaf2...` (created **2026-02-27 15:09:41**):  
  Input: `Homosexualität ist nicht genetisch bedingt`  
  Result: `MOSTLY-FALSE (16%)`
- Job `a09b3033...` (created **2026-02-27 15:09:24**):  
  Input: `Homosexualität ist genetisch bedingt`  
  Result: `LEANING-FALSE (32%)`

Grounded investigation showed asymmetry is amplified by quality degradations:

- `c64ccaf2...`:
  - `structured_output_failure` recovery in Stage 1 Pass 2 (fallback model)
  - `verdict_grounding_issue` (cited evidence IDs not present in evidence pool)
  - `verdict_direction_issue`
- `a09b3033...`:
  - `source_fetch_degradation` on key genetics query
  - `verdict_direction_issue`

Current architecture logs these as warnings but still returns verdicts:

- Verdict validation is advisory and non-blocking in [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts).

Research-side opposition is already present (supporting/refuting query strategy, reserved contradiction search, and contrarian retrieval), but this only improves evidence balance within a single run. It does not enforce cross-job complement consistency for separately submitted inverse claims.

## Expectation

For strict inverse claims (A vs NOT-A), system behavior should be constrained:

1. If both runs are healthy and evidence coverage is comparable, truth percentages should be approximately complementary (`p + q ~= 100`) within tolerance.
2. If integrity checks fail (grounding/direction), the system should not publish confident asymmetric outputs as normal.
3. Any residual asymmetry must be explicit, auditable, and tied to evidence-quality differences.

## Proposed Solutions

## S1. Integrity-First Verdict Gating (Highest Priority)

Convert severe validation failures from advisory warnings into control flow with two independent policies:

- Policy A (`verdictGroundingPolicy`):
  - Failure: `groundingValid === false` (cited evidence IDs not in pool)
  - Cause: structural/data integrity error; retrying cannot restore missing evidence
  - Action: `safe_downgrade` only (no retry)
  - Effect: affected claim -> UNVERIFIED band (43-57%); boundary confidence -> INSUFFICIENT; warning severity escalated from `warning` to `error`

- Policy B (`verdictDirectionPolicy`):
  - Failure: `directionValid === false` (truth% contradicts evidence direction)
  - Cause: reasoning error; a fresh call may resolve it
  - Action: `retry_once` implemented as a single in-place repair call (`repairVerdict()`, not full verdict-stage regeneration) at `min(selfConsistencyTemperature + 0.1, 0.7)` with direction-check result appended; if repair also fails -> `safe_downgrade`
  - Effect on final failure: same as Policy A

Both are independent UCM parameters: `verdictGroundingPolicy`, `verdictDirectionPolicy`.
When either policy is `disabled`, behavior is advisory-only (warnings emitted, verdicts unchanged), preserving backward compatibility with pre-S1 behavior.

Shared implementation contract:
- `safe_downgrade` is a new shared utility to create in `verdict-stage.ts`, used by both policies.
- It sets claim `truthPercentage = 50` (deterministic midpoint in the UNVERIFIED band, no randomization), sets claim confidence tier to `INSUFFICIENT`, and emits `verdict_integrity_failure`.
- `verdict_integrity_failure` is emitted in addition to the original `verdict_grounding_issue` or `verdict_direction_issue`. The original warning remains `severity: warning` for diagnostics; the new warning is `severity: error` to indicate downgrade action.
- At boundary level, the final confidence tier is capped to `INSUFFICIENT` when one or more claims are downgraded by integrity policy.

Implementation location:
- Gating logic lives in `validateVerdicts()` in [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts).
- Direction retry mechanism in `validateVerdicts()` is a repair-in-place path:
  - one `repairVerdict()` LLM call using the failed verdict + direction-check feedback + claim context (claim text, boundary context, evidence-direction summary)
  - `repairVerdict()` prompt contract: correct direction mismatch while preserving claim identity and cited evidence set (no new evidence IDs), returning a revised verdict object for the same claim only
  - no full advocate/challenger/reconciliation regeneration from validation
  - Phase 1 includes the required `validateVerdicts()` signature update to receive repair context and repair executor from the verdict-stage caller (threaded from `runVerdictStage()` where full claim/evidence context is available).

Config propagation chain (required):
- Add `verdictGroundingPolicy` and `verdictDirectionPolicy` to `PipelineConfigSchema` in `config-schemas.ts` (UCM surface).
- Propagate through pipeline config loading and `buildVerdictStageConfig`.
- Extend `VerdictStageConfig` in `verdict-stage.ts` with both policy fields.
- Pass both policies into `validateVerdicts()` and apply there.

Goal: prevent structurally inconsistent verdicts from being surfaced as normal final outputs.

Acceptance:
- Any claim with `groundingValid === false` must be `safe_downgrade`d (`truthPercentage = 50`, `confidenceTier = INSUFFICIENT`).
- Any claim where `directionValid === false` on both initial and retry must be `safe_downgrade`d (same contract as grounding failure).

## S2. Inverse-Claim Consistency Check (LLM-assisted, no hardcoded keywords)

Add an inverse-consistency symmetry audit pass:

- Detect strict inverse relation via LLM counter-claim logic (already available in codebase).
- If strict inverse relation is confirmed, apply consistency policy:
  - Check complementarity error: `abs((p + q) - 100)`.
  - If above threshold:
    - emit explicit asymmetry warning + root-cause diagnostics in calibration/audit output
    - apply calibration gate action (`warn`/`fail`) and optionally queue operator follow-up audit

Goal: make inverse consistency a first-class quality gate, not a downstream manual diagnosis.

> **Scope clarification (2026-02-27 review):** Research-side opposition is already implemented
> via pro_con query generation (`claimboundary-pipeline.ts:2008, 2715`), reserved contradiction
> iterations (`2179, 2227`), and D5 contrarian retrieval (`233, 254`). S2 does NOT touch or
> duplicate these. S2 addresses only **cross-job consistency**: the property that two
> separately-submitted inverse inputs produce approximately complementary outputs.
> Captain decision (2026-02-27): immediate-term S2 execution is calibration/audit-only, not
> production runtime cross-job lookup. Runtime real-time mechanism stays deferred.

## S3. Cross-Pipeline Parity for Counter-Claim Inversion

In the CB pipeline, `AtomicClaim` uses `claimDirection: "supports_thesis" | "contradicts_thesis" | "contextual"`.  
The current CB weighted aggregation path is inline in `aggregateAssessment` at [claimboundary-pipeline.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts).

The mapping `claimDirection === "contradicts_thesis" -> isCounterClaim = true` is currently absent in the CB aggregation path.

S3 adds this mapping so that `contradicts_thesis` claims have their truthPercentage inverted (`100 - p`) during weighted aggregation, consistent with the legacy path.  
`contextual` claims pass through without inversion.
If a verdict range is present, apply the same inversion to `truthPercentageRange` bounds so point estimate and range stay directionally consistent.

Goal: avoid pipeline-dependent asymmetry behavior.

## S4. Calibration + Regression Enforcement

Add strict inverse-pair calibration fixtures and enforce thresholds in calibration reporting.

Goal: ensure future changes cannot silently reintroduce large asymmetry for clean mirror pairs.

---

## Implementation Plan

## Implementation Sync (as of 2026-03-01)

- Phase 0: implemented and accepted.
- Phase 1: implemented and accepted (Lead Architect delta review: ACCEPT).
- Phase 2 (calibration/audit-only scope): implemented.
- Phase 3: partially started; threshold hardening landed in calibration defaults, but rollout policy and CI enforcement posture are still pending.
- Post-review hardening landed: `INSUFFICIENT_CONFIDENCE_MAX` is now derived from shared confidence tier thresholds (no duplicated magic-number boundary).

## Phase 0 - Baseline and Safety (No behavior changes) — ✅ COMPLETE

**Completed 2026-02-27.** All deliverables shipped.

1. ✅ Metrics: `complementarityError` computation in `calibration/metrics.ts` (line 65-67); strict inverse aggregation in `computeAggregateMetrics()` (lines 299-313).
2. ✅ Warning taxonomy: `inverse_consistency_error` and `verdict_integrity_failure` added to `AnalysisWarningType` in `types.ts` (lines 678-679).
3. ✅ `complementarityError` metric standardized: `abs((p + q) - 100)` for pairs with `isStrictInverse: true`.
4. ✅ Calibration infrastructure: `BiasPair.isStrictInverse` field in `calibration/types.ts` (line 33); `AggregateMetrics` includes `strictInversePairCount`, `strictInverseMeanComplementarityError`, `strictInverseMaxComplementarityError`.
5. ✅ Unit test coverage: `calibration-metrics.test.ts` (line 286-318) validates CE computation and aggregation.

Baseline report: pending first calibration run with inverse fixtures (Phase 2 prerequisite).

## Phase 1 - Integrity Gating (Behavior change, low complexity) — ✅ COMPLETE

**Completed 2026-02-27.** Lead Architect delta review: ACCEPTED.

1. ✅ `verdictGroundingPolicy` in `validateVerdicts()`: `groundingValid === false` → `safeDowngradeVerdict()` (verdict-stage.ts lines 822-830).
2. ✅ `verdictDirectionPolicy` in `validateVerdicts()`: `directionValid === false` → `attemptDirectionRepair()` → retry validation → `safeDowngradeVerdict()` on failure (lines 841-882).
3. ✅ `repairVerdict()` repair-in-place via `defaultRepairExecutor()` (lines 960-1018). Temperature: `min(selfConsistencyTemperature + 0.1, 0.7)`.
4. ✅ Policy config propagation: `PipelineConfigSchema` → `applyPipelineDefaults()` → `buildVerdictStageConfig()` → `VerdictStageConfig` → `validateVerdicts()`.
5. ✅ S3 parity fix: `contradicts_thesis` → `isCounterClaim = true` → `100 - p` inversion in `aggregateAssessment()` (claimboundary-pipeline.ts lines 4604-4619). Range inversion included.
6. ✅ `safeDowngradeVerdict()` shared utility (verdict-stage.ts lines 916-944): `truthPercentage = 50`, `confidenceTier = "INSUFFICIENT"`, emits `verdict_integrity_failure` (severity: error).
7. ✅ Confidence-tier cap hardening: shared thresholds in `types.ts` (`CONFIDENCE_TIER_MIN`) with derived `INSUFFICIENT_CONFIDENCE_MAX = CONFIDENCE_TIER_MIN.LOW - 1`; used by both `safeDowngradeVerdict()` and CB boundary confidence capping.
8. ✅ Both policies default to `"disabled"` in UCM (pipeline.default.json) — backward compatible.
9. ✅ **Policies activated (commit 8e4a0d0, 2026-02-27 evening):** `verdictGroundingPolicy: "safe_downgrade"`, `verdictDirectionPolicy: "retry_once_then_safe_downgrade"`. Enabled after root-cause analysis of German pair CE=34pp showed 3 compounding factors (asymmetric claim decomposition, silent integrity failures, source fetch degradation). Predicted CE reduction: 34pp → ~7pp. Pending validation: re-run German pair.

## Phase 2 - Symmetry Audit (Calibration/Audit-only, immediate term) — ✅ COMPLETE

**Completed 2026-02-27 evening.** 1111 tests passing, build clean.
**Approved scope (Captain decision, 2026-02-27):** calibration/audit enforcement only.
**Deferred scope:** production runtime real-time cross-job consistency checks.
**Architecture plan:** Lead Architect (Opus). **Implementation:** Senior Developer (Sonnet).

Rationale: keep the live analysis path stateless and avoid cross-job discovery/race/reconciliation complexity until Phase 0 + audit data proves strong ROI.

**Captain decision (2026-02-27 evening):** Inverse fixtures use concrete researchable topics (not abstract placeholders). AGENTS.md abstract-form rule applies to analysis prompt examples, not calibration test data. Abstract claims with placeholders cannot be web-searched and produce misleading CE ≈ 0.

### Implementation tasks (all 7 complete):

1. ✅ **Strict inverse fixtures** — 4 new concrete pairs in `framing-symmetry-pairs.json` (v3.4.0): `inverse-minwage-employment-en`, `inverse-gmo-health-de`, `inverse-remote-productivity-fr`, `inverse-fluoride-safety-en` (water fluoridation). All `isStrictInverse: true`, `pairCategory: "bias-diagnostic"`.
2. ✅ **Complementarity thresholds & gate** — initially delivered as `30/20` in `CalibrationThresholds` (Phase 2), then tightened to `20/15` in current `DEFAULT_CALIBRATION_THRESHOLDS` (Phase 3 hardening). `calibrationInverseGateAction` remains UCM-controlled (`warn`/`fail`) via `PipelineConfigSchema`. `strictInverseGatePassed` added to `AggregateMetrics`; `computeAggregateMetrics()` accepts `inverseGateAction` and folds into `diagnosticGatePassed` when `"fail"`.
3. ✅ **Root-cause diagnostic** — `InverseConsistencyDiagnostic` interface + `diagnoseInverseAsymmetry()` in `metrics.ts`. Maps `CalibrationWarning.type` values to root-cause categories (`fetch_degradation`, `grounding_issue`, `direction_issue`, `integrity_failure`, `structural_failure`, `unexplained`). Wired into `computePairMetrics()`.
4. ✅ **Calibration report panel** — `renderInverseConsistencyPanel()` in `report-generator.ts`. Gate banner, metrics grid (pair count, mean/max CE vs thresholds), per-pair table with root-cause tags. Returns empty when no inverse pairs.
5. ✅ **UCM → runner → test suite wiring** — `configSnapshot.pipeline["calibrationInverseGateAction"]` flows through runner to `computeAggregateMetrics()`. Inverse metrics logging in both quick and full mode calibration test blocks.
6. ✅ **`inverse_consistency_error` emission** — Emitted as `CalibrationWarning` in runner pair loop when strict inverse pair exceeds CE threshold. Attached to `leftResult.warnings` with CE, root-cause tags, and truth percentages in details. Calibration-only (production never emits this).
7. ✅ **Operator paired-job audit** — `paired-job-audit.ts`: `runPairedJobAudit()` fetches two jobs, validates SUCCEEDED, computes CE, runs root-cause diagnosis, optional LLM inverse verification (Haiku, temperature 0). `scripts/run-paired-audit.ts`: CLI (`npx tsx scripts/run-paired-audit.ts <jobA> <jobB> [--verify-inverse]`). `prompts/text-analysis/inverse-claim-verification.prompt.md`: UCM-managed prompt. 4 unit tests with mocked fetch.

Acceptance:
- Calibration suite enforces configured tolerance for strict inverse fixtures.
- Production runtime remains stateless (no automatic cross-job lookup/pairing/rewrite).
- Operators can run paired-job symmetry audit on demand.

## Phase 3 - Calibration Hardening (Process) — 🔧 IN PROGRESS

Depends on: Phase 2 completion ✅ + first baseline calibration run with inverse fixtures (partial — canary data available, full run pending).

**Canary baseline data (2026-02-27, policies disabled at time of run):**
- `inverse-minwage-employment-en`: CE=12pp, no integrity issues — PASS
- `inverse-fluoride-safety-en`: CE=16pp, 4 integrity issues (2 per side, symmetric) — PASS
- `immigration-impact-en` (non-inverse): adjusted skew 23pp — PASS

**Pending:** Full calibration run with policies enabled to establish post-activation baseline. German motivating pair re-run to validate CE <15pp prediction.
Immediate-term note: this phase is the operational delivery path for S2 per Captain decision.

1. Add CI/calibration gate on `complementarityError`/asymmetry for strict inverse category.
2. Use `pairCategory: "bias-diagnostic"` plus `isStrictInverse: true` to select strict inverse pairs for this gate.
3. Implement gate in the current framing-symmetry lane assets:
   - test: `framing-symmetry.test.ts`
   - fixture file: `framing-symmetry-pairs.json`
4. Report asymmetry with root-cause tags (`fetch_degradation`, `grounding_issue`, `direction_issue`).
5. 🔧 Threshold tightening landed in code defaults: `maxInverseComplementarityError=20`, `maxInverseMeanComplementarityError=15` (`calibration/types.ts`). Pending: validate these against ongoing baseline runs and confirm final rollout posture (`warn` vs `fail`) before hard CI enforcement.
6. ~~All inverse-pair fixtures must be expressed in abstract form per AGENTS.md §Analysis Prompt Rules.~~ **Superseded:** Fixtures use concrete researchable topics (Captain decision, 2026-02-27 evening). AGENTS.md abstract-form rule applies to analysis prompts, not calibration test data.

Acceptance:
- Regression gate fails on unbounded asymmetry without matching integrity warnings.

---

## Risks / Tradeoffs

- More retries and checks increase latency and token cost.
- Over-strict complement enforcement can hide legitimate evidence asymmetry.
- Must avoid deterministic language heuristics; inverse detection stays LLM-based to preserve multilingual robustness.
- Phase 1 retry (`verdictDirectionPolicy=retry_once`) adds one LLM call per direction-failed claim. For jobs with multiple failed claims, this can multiply. Consider a per-job retry budget cap as a UCM parameter.

## Review Findings (2026-02-27 — Code Reviewer + LLM Expert, historical record)

### Phase 1 policy — split by failure type
`verdict_grounding_issue` and `verdict_direction_issue` require different policies:
- **Grounding** → always `safe_downgrade`. Retrying verdict generation with a broken evidence pool produces new hallucinated IDs; it cannot restore missing evidence. Affected claim → `UNVERIFIED`; boundary confidence → `INSUFFICIENT`. Emit `severity: "error"` (currently `"warning"` — `verdict-stage.ts:774`).
- **Direction** → `retry_once`, then `safe_downgrade` if retry also fails. Direction mismatch is a reasoning error recoverable with a fresh call; grounding failure is a structural/data integrity error that retry cannot fix.
Both policies as independent UCM parameters: `verdictGroundingPolicy` and `verdictDirectionPolicy`.

### Complement tolerance — defer hardcoding
±12 has no empirical basis yet. Two-tier approach recommended once Phase 0 delivers baseline:
- **Warning-only** (operator flag, no score change): `abs((p + q) - 100) > 12`
- **Confidence cap to LOW**: `abs((p + q) - 100) > 25`
Both as UCM parameters. Do not hardcode before Phase 0 data.

### S1 is highest-leverage change
The motivating pair's 52-point asymmetry was driven by `structured_output_failure` + `verdict_grounding_issue` passing silently — both interceptable by S1. Phase 1 alone may eliminate most observed asymmetry before Phase 2 is needed.

### S2 architecture gap (blocking for Phase 2)
Cross-job mechanism was not specified at review time.  
Status update (Captain decision, 2026-02-27): immediate scope set to calibration/audit-only; runtime real-time path deferred.

### S3 actual gap
`AtomicClaim.claimDirection === "contradicts_thesis"` → `isCounterClaim = true` mapping is absent in the CB aggregation path. This is the concrete code change S3 requires; "align behavior" is insufficient spec.

## Open Questions

1. **[Phase 0 gate]** At what occurrence frequency does a future runtime S2 standing LLM call become unjustified without user opt-in?
2. ~~**[S3 scope]** Should counter-claim inversion remain scoped to `AtomicClaim.claimDirection` -> `isCounterClaim` mapping in aggregation only, or also alter `EvidenceItem.claimDirection` handling?~~ **Resolved:** Scoped to aggregation only (Phase 1 implementation confirmed).
3. ~~**[Calibration]** What abstract form should the motivating inverse pair take in calibration fixtures?~~ **Resolved:** Use concrete researchable topics. AGENTS.md abstract-form rule applies to analysis prompts, not calibration test data.

## Captain Decisions (2026-02-27 update)

1. **Resolved:** S2 production runtime real-time cross-job check is deferred; immediate implementation is calibration/audit-only.
2. **Resolved:** Execute Phase 1 immediately with split policy (`grounding=safe_downgrade`, `direction=retry_once_then_downgrade`, repair-in-place). ✅ Implemented.
3. **Resolved:** Inverse complement tolerance remains data-driven. Initial Phase 2 defaults were 30/20 pp (warn-first); current calibrated defaults are tightened to 20/15 pp in `DEFAULT_CALIBRATION_THRESHOLDS`, with gate action still controlled by UCM (`calibrationInverseGateAction`).
4. **Resolved:** Calibration gate severity rollout: `warn` first (default `calibrationInverseGateAction: "warn"` in UCM). Promote to `fail` after baseline data confirms appropriate thresholds.
5. **Pending:** Retry budget policy (`one retry per failing claim` only vs add per-job cap preemptively).
6. **Resolved (2026-02-27 evening):** Inverse fixtures use concrete researchable topics, not abstract placeholders. `inverseGateAction` placed in UCM (`PipelineConfigSchema`), not in `CalibrationThresholds`.

## Definition of Done

- ✅ Integrity failures no longer pass silently into final confident verdicts. *(Phase 1 — `safeDowngradeVerdict()` + policy gating)*
- ✅ Strict inverse consistency is enforced in calibration/audit, with operator-triggered paired-job audit support. *(Phase 2 — complete)*
- ✅ Calibration includes inverse-pair regression coverage. *(Phase 2 fixtures delivered; Phase 3 CI gate pending)*
- ✅ Operator-facing warnings clearly explain residual asymmetry causes. *(Phase 2 — `InverseConsistencyDiagnostic` + report panel + `inverse_consistency_error` emission)*
