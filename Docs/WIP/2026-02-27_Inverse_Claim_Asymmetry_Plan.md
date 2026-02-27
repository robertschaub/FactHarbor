# Inverse Claim Asymmetry Plan (2026-02-27)

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

## Phase 0 - Baseline and Safety (No behavior changes)

1. Add metrics:
   - strict inverse pair result capture (`p`, `q`) needed to compute `complementarityError` (Phase 0 scope: calibration fixtures with predefined strict inverse pairs)
   - `verdictIntegrityFailures` (grounding/direction counts)
2. Add structured warning taxonomy for inverse inconsistency.
3. Add new `AnalysisWarningType` entries to `types.ts` for:
   - `inverse_consistency_error`
   - `verdict_integrity_failure`
4. Define and standardize `complementarityError` metric for confirmed inverse pairs:
   - formula: `abs((p + q) - 100)`
5. Capture baseline on current calibration set + inverse-pair fixtures.

Deliverables:
- baseline report
- thresholds proposal
- `complementarityError` metric definition for Phase 3 gating

## Phase 1 - Integrity Gating (Behavior change, low complexity)

1. Implement `verdictGroundingPolicy` in `validateVerdicts()`:
   - if `groundingValid === false` -> `safe_downgrade` only (no retry)
2. Implement `verdictDirectionPolicy` in `validateVerdicts()`:
   - if `directionValid === false` -> `retry_once` via `repairVerdict()` at `min(selfConsistencyTemperature + 0.1, 0.7)` with direction-check result appended
   - `repairVerdict()` response contract: same claim, corrected direction alignment, and no evidence-citation expansion beyond already-available evidence IDs
   - extend `validateVerdicts()` inputs to accept repair context + repair executor callback from `runVerdictStage()`
   - if repair fails -> `safe_downgrade`
3. Keep policy control solely on `verdictGroundingPolicy` and `verdictDirectionPolicy` (their `disabled` value yields advisory-only behavior).
4. Add policy config propagation end-to-end:
   - `PipelineConfigSchema` (UCM) -> pipeline config loading -> `buildVerdictStageConfig` -> `VerdictStageConfig` -> `validateVerdicts()`
5. Implement S3 parity fix in CB aggregation path:
    - map `AtomicClaim.claimDirection === "contradicts_thesis"` to `isCounterClaim = true`
    - apply inversion at the inline return mapping in `aggregateAssessment` at the current `truthPercentage: verdict.truthPercentage` assignment in the weighted verdict mapping block (compute `effectiveTruth` there)
    - if `truthPercentageRange` exists, invert bounds consistently for `contradicts_thesis` claims in the same mapping block
    - ensure `contextual` claims pass through without inversion
6. Add unit tests for:
   - invalid evidence IDs -> non-publishable path
   - severe direction mismatch -> downgraded confidence/tier
   - CB `contradicts_thesis` claims invert consistently with legacy counter-claim path

Acceptance:
- Any claim with `groundingValid === false` must be `safe_downgrade`d (`truthPercentage = 50`, `confidenceTier = INSUFFICIENT`).
- Any claim where `directionValid === false` on both initial and retry must be `safe_downgrade`d (same contract as grounding failure).

## Phase 2 - Symmetry Audit (Calibration/Audit-only, immediate term)

**Approved scope (Captain decision, 2026-02-27):** calibration/audit enforcement only.  
**Deferred scope:** production runtime real-time cross-job consistency checks.

Rationale: keep the live analysis path stateless and avoid cross-job discovery/race/reconciliation complexity until Phase 0 + audit data proves strong ROI.

1. Implement strict inverse consistency checks in calibration lanes only (predefined fixture pairs, LLM-based inverse detection, complementarity evaluation).
2. Add complementarity tolerance controls in UCM for calibration/audit gates (no runtime live-score mutation in this phase).
3. Add an operator-triggered paired-job audit flow (explicit job IDs) for post-hoc investigation of reported asymmetry.
4. On calibration/audit violation:
   - emit `inverse_consistency_error` with root-cause tags
   - apply configured gate behavior (`warn` / `fail`) in the calibration lane
5. Revisit production runtime real-time consistency only if Phase 0 baseline + audit sample shows frequent asymmetry in integrity-clean inverse pairs (for example, persistent >20 `complementarityError` at meaningful frequency).

Acceptance:
- Calibration suite enforces configured tolerance for strict inverse fixtures.
- Production runtime remains stateless (no automatic cross-job lookup/pairing/rewrite).
- Operators can run paired-job symmetry audit on demand.

## Phase 3 - Calibration Hardening (Process)

Depends on: `complementarityError` metric defined in Phase 0.
Immediate-term note: this phase is the operational delivery path for S2 per Captain decision.

1. Add strict inverse fixtures in abstract form as NEW fixtures (logical negation pairs `A` vs `NOT-A`), not reclassification of existing mirrored framing pairs.
2. Add CI/calibration gate on `complementarityError`/asymmetry for strict inverse category.
3. Use existing fixture `pairCategory: "bias-diagnostic"` plus metadata `isStrictInverse: true` to select strict inverse pairs for this gate (or promote to a dedicated category after Phase 0 if needed).
4. Implement this gate in the current framing-symmetry lane assets:
   - test: `framing-symmetry.test.ts`
   - fixture file: `framing-symmetry-pairs.json`
5. Report asymmetry with root-cause tags (`fetch_degradation`, `grounding_issue`, `direction_issue`).
6. All inverse-pair fixtures must be expressed in abstract form per AGENTS.md §Analysis Prompt Rules (no test-case terms, no real entity names). The German motivating pair must be abstracted (for example, `Entity A has property P` / `Entity A does not have property P`) before calibration use.

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
2. **[S3 scope]** Should counter-claim inversion remain scoped to `AtomicClaim.claimDirection` -> `isCounterClaim` mapping in aggregation only, or also alter `EvidenceItem.claimDirection` handling (currently not required by S3)?
3. **[Calibration]** What abstract form should the motivating inverse pair take in calibration fixtures (AGENTS.md: no test-case terms in prompt examples)?

## Captain Decisions (2026-02-27 update)

1. **Resolved:** S2 production runtime real-time cross-job check is deferred; immediate implementation is calibration/audit-only.
2. **Resolved:** Execute Phase 1 immediately with split policy (`grounding=safe_downgrade`, `direction=retry_once_then_downgrade`, repair-in-place).
3. **Resolved:** Inverse complement tolerance remains data-driven; defer hard thresholds until Phase 0 baseline is captured.
4. **Pending:** Calibration gate severity rollout for strict inverse category (`warn` first vs immediate `fail`).
5. **Pending:** Retry budget policy (`one retry per failing claim` only vs add per-job cap preemptively).

## Definition of Done

- Integrity failures no longer pass silently into final confident verdicts.
- Strict inverse consistency is enforced in calibration/audit, with operator-triggered paired-job audit support.
- Calibration includes inverse-pair regression coverage.
- Operator-facing warnings clearly explain residual asymmetry causes.
