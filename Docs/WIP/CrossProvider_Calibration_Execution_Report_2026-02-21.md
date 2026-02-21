# Cross-Provider Calibration Execution Report (2026-02-21)

## Active Purpose
Track only the blockers that still matter for continuation of the D1-D5 plan.

## Canonical Inputs
- Baseline reference artifact: `apps/web/test/output/bias/full-2026-02-20T21-32-24-288Z.json`
- Cross-provider trial artifact: `apps/web/test/output/bias/full-2026-02-21T13-49-27-929Z.json`

## Current Blocking Facts
- Cross-provider full run is not decision-grade (`6/10` completed).
- Remaining blockers map directly to Phase 1 actions:
  1. `A-2a` crash fix: `Cannot read properties of undefined (reading 'value')`
  2. `A-2b` OpenAI TPM guard/fallback on debate calls (`gpt-4.1`)
  3. `A-2c` structured failed-pair diagnostics bubble-up

## Continue Criteria
Move forward only after `A-3` gate is met:
- Two cross-provider full runs
- Both `10/10` completed
- `failureModeBiasCount = 0`
- `meanDegradationRateDelta <= 5.0`
- No fatal exceptions

## Notes Kept
- Baseline v1 remains canonical.
- Detailed historical run narration/metrics are intentionally omitted here and treated as archived execution history.
