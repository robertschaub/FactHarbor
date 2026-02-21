# Cross-Provider Calibration Execution Report (2026-02-21)

## Scope
This report captures the work executed after Baseline v1 lock to test `debateProfile: cross-provider` against the existing canonical baseline.

## Actions Executed
1. Switched active pipeline config to `debateProfile: cross-provider`.
2. Cleared explicit debate overrides so profile defaults are effective:
   - `debateModelProviders = null`
   - `debateModelTiers = null`
3. Ran quick calibration (`test:calibration:quick`).
4. Ran full calibration (`test:calibration:full`).
5. Ran telemetry validation (`test:calibration:validate`) on latest full artifact.
6. Ran validator delta check against canonical full baseline (`--prev`).

## Effective Config Snapshot (from full run artifact)
- `llmProvider`: `anthropic`
- `debateProfile`: `cross-provider`
- `debateModelProviders`: `null` (profile-resolved)
- `debateModelTiers`: `null` (profile-resolved)

## Artifacts Produced
- Quick run:
  - `apps/web/test/output/bias/run-2026-02-21T11-14-21-464Z.json`
  - `apps/web/test/output/bias/run-2026-02-21T11-14-21-464Z.html`
- Full run:
  - `apps/web/test/output/bias/full-2026-02-21T13-49-27-929Z.json`
  - `apps/web/test/output/bias/full-2026-02-21T13-49-27-929Z.html`

## Results Summary

### Quick mode (3/3 completed)
- meanDirectionalSkew: `42.0pp`
- meanAbsoluteSkew: `42.0pp`
- maxAbsoluteSkew: `63.0pp`
- passRate: `33.3%`
- overallPassed: `false`

Reference quick baseline (2026-02-20): meanDirectionalSkew `41.0pp`, passRate `0%`.

### Full mode (6/10 completed, 4 failed)
- meanDirectionalSkew: `23.5pp`
- meanAbsoluteSkew: `33.5pp`
- maxAbsoluteSkew: `67.0pp`
- passRate: `33.3%`
- overallPassed: `false`
- failureModes:
  - meanRefusalRateDelta: `0.7246`
  - meanDegradationRateDelta: `23.8050`
  - asymmetryPairCount: `1`

Reference canonical full baseline (2026-02-20, 10/10 complete):
- meanDirectionalSkew: `27.64pp`
- meanAbsoluteSkew: `35.06pp`
- maxAbsoluteSkew: `64.0pp`
- passRate: `30%`
- meanRefusalRateDelta: `0.9263`
- meanDegradationRateDelta: `0.9263`
- asymmetryPairCount: `0`

## Full-Run Failures (Blocking Comparability)
1. `nuclear-energy-fr`
   - Error: `Cannot read properties of undefined (reading 'value')`
2. `minimum-wage-de`
   - Error: OpenAI TPM limit for `gpt-4.1` (requested 37366, limit 30000)
3. `healthcare-system-en`
   - Error: OpenAI TPM limit for `gpt-4.1` (requested 30487, limit 30000)
4. `climate-regulation-de`
   - Error: OpenAI TPM limit for `gpt-4.1` (requested 30478, limit 30000)

## Telemetry / Error Bubbling Validation
Validation script passed for latest full artifact.

Key warning counts in run data:
- `source_fetch_failure`: 59
- `source_fetch_degradation`: 21
- `source_reliability_error`: 11
- `search_provider_error`: 12
- `evidence_pool_imbalance`: 8
- `baseless_challenge_detected`: 12
- `baseless_challenge_blocked`: 3
- `structured_output_failure`: 1

Observation: warning dedupe + bubbling fixes are effective; warning categories are now visible with consistent counts.

## Conclusions
- Baseline v1 (2026-02-20) remains canonical and unchanged.
- Cross-provider pilot execution is partially complete:
  - Quick mode: complete and usable for directional signal.
  - Full mode: not baseline-grade due to 4/10 failed pairs.
- C18 instrumentation remains active and measurable in cross-provider runs.

## Status (Done vs Open)
Done:
- Cross-provider config activation and execution path verified.
- Quick run completed with artifacts.
- Full run produced artifacts and surfaced actionable failure causes.
- Telemetry validator passed on new run.

Open:
- Fix runtime failure on `undefined.value` in `nuclear-energy-fr` path.
- Resolve OpenAI TPM pressure for cross-provider full runs (token budgeting/routing/retry strategy).
- Re-run full cross-provider to 10/10 completion before declaring A/B comparison valid.
- After successful 10/10 run, generate formal baseline-v1 vs cross-provider A/B conclusion.
