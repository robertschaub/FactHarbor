# Review: Codex Pre-Switch Hardening (84aad35)

**Reviewed:** 2026-02-21
**Commit:** `84aad35` — `fix(calibration): pre-switch hardening and telemetry validator`
**Reviewer:** Lead Developer (Claude Code / Opus)

---

## Verdict: Good to go — no blockers, 1 real bug for follow-up

---

## Findings

### Bug — SR error count flattened to 1 in calibration metrics

**Severity:** Medium
**Location:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` line 1779

The `source_reliability_error` warning emits `errorCount` in details but **not `occurrences`**. The calibration metrics code (`metrics.ts:356-362`) falls back to `1` when `details.occurrences` is missing. So an SR prefetch with e.g. 15 errors across 8 domains counts as **1** degradation event in calibration failure-mode metrics.

**Fix:** Add `occurrences: srPrefetch.errorCount` to the details object:

```typescript
// claimboundary-pipeline.ts ~line 1779
details: {
  stage: "research_sr",
  errorCount: srPrefetch.errorCount,
  errorByType: srPrefetch.errorByType,
  failedDomains: srPrefetch.failedDomains.slice(0, 20),
  noConsensusCount: srPrefetch.noConsensusCount,
  occurrences: srPrefetch.errorCount,  // <-- ADD THIS
},
```

**Impact on running test:** Does not affect skew metrics. Only undercounts SR errors in `failureModes.byStage["research_sr"]` and `byProvider` aggregation. Can be fixed after this run completes.

---

### Type Hygiene — `runMode` has dead values

**Severity:** Low
**Location:** `apps/web/src/lib/calibration/types.ts` line 275

```typescript
runMode: "quick" | "full" | "targeted" | "single" | "ab-comparison" | "regression";
```

`"single"` is now dead — the runner always sets `options.mode` (`"quick" | "full" | "targeted"`). The old value existed only because of the bug Codex just fixed. `"ab-comparison"` and `"regression"` are aspirational but nothing produces them.

**Suggested fix:** Remove dead values or add a comment marking them as reserved for future use.

---

### Type Hygiene — `provider` and `configuredProvider` always identical

**Severity:** Low
**Location:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` lines 1277-1278

```typescript
provider: model.provider,
configuredProvider: model.provider,
```

Both resolve to `model.provider`. The distinction (who emitted vs what was configured) is the right idea for cross-provider attribution, but in this code path both refer to the same model. If the intent is "configured = what the debate profile requested" vs "actual = what executed," then `configuredProvider` should pull from the debate profile config, not the model object.

Not affecting metrics — `extractProvider` picks the first truthy key and stops.

---

### Improvement — Validator should check debateProfile

**Severity:** Low (but high value for cross-provider A/B)
**Location:** `apps/web/scripts/validate-calibration-telemetry.ts`

For the cross-provider A/B, the single most important thing to verify post-run is that `configSnapshot.pipeline.debateProfile` says `"cross-provider"` and not `"baseline"`. A one-line check would catch a misconfigured run immediately.

---

### Observation — Validator duplicates types

**Severity:** Low
**Location:** `apps/web/scripts/validate-calibration-telemetry.ts` lines 6-22

The script defines its own `CalibrationWarning`, `SideResult`, etc. rather than importing from `calibration/types.ts`. Pragmatic for a standalone script, but the types will drift. Since it's invoked via `tsx` (which resolves path aliases), it could import from the real types.

---

## Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | SR error count flattened to 1 | Medium (bug) | Fix after current run completes |
| 2 | `runMode` dead type values | Low | Clean up when touching types.ts |
| 3 | `provider` = `configuredProvider` always | Low | Clarify intent when touching pipeline |
| 4 | Validator missing debateProfile check | Low | Add before next A/B run |
| 5 | Validator type duplication | Low | Refactor when convenient |

---

## Cross-References

- Commit reviewed: `84aad35`
- Prior commit (telemetry fixes): `704063e`
- Baseline manifest: `Docs/STATUS/Calibration_Baseline_v1.md`
- Validator script: `apps/web/scripts/validate-calibration-telemetry.ts`
