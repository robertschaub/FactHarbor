# Phase 1 Immediate Execution Spec (A-1 / A-2 / A-3 Gate)

**Date:** 2026-02-21
**Role:** Lead Architect
**Scope lock:** Phase 1 only (`A-1`, `A-2a`, `A-2b`, `A-2c`).
**Out of scope:** All `B-*` and `C-*` items until `A-3` gate passes.

## 1) Amendments Applied (Decision Log)

- R-1 applied: D5 thresholds declared UCM-configurable defaults.
- R-2 applied: D4 Gate 1 now requires `meanDegradationRateDelta <= 5.0` in addition to `failureModeBiasCount=0`.

Reference: `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`

## 2) Phase 1 Implementation Plan

## A-1 Report semantics clarity (low-hanging)

### Goal
Remove ambiguity between global provider and per-role provider usage in calibration HTML.

### Primary files
- `apps/web/src/lib/calibration/report-generator.ts`

### Changes
1. Rename badge label:
   - `Provider` -> `Global Provider`
2. Add computed badge:
   - `Role Provider Mode: single|mixed`
   - `single` if all debate role providers are identical
   - `mixed` otherwise
3. Add explanatory note below debate role table:
   - resolved config at run start vs runtime fallback/degradation trace distinction

### Pattern to follow
- Use current `renderLLMAndSearchConfig()` structure and existing badge style.
- Keep fallback renderer behavior for old JSON artifacts unchanged.

### Done when
- Cross-provider report no longer suggests all roles are Anthropic just because global provider is Anthropic.

## A-2a Crash fix (`undefined.value`)

### Goal
Fix runtime crash seen on `nuclear-energy-fr` in cross-provider full run.

### Evidence
- `full-2026-02-21T13-49-27-929Z.json` failed pair error: `Cannot read properties of undefined (reading 'value')`.

### Likely investigation files
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`

### Required approach
1. Reproduce with targeted path (not full expensive rerun by default).
2. Capture stack at failure source.
3. Patch root cause with defensive null-safe handling in owning module.
4. Add regression test for exact failing code path.

### Architectural note
- If root cause cannot be reliably isolated without diagnostics, implement A-2c first in same branch, then complete A-2a.

## A-2b OpenAI TPM guard + fallback

### Goal
Prevent fatal OpenAI TPM failures in debate role calls (`gpt-4.1`).

### Primary files
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (`createProductionLLMCall`)
- `apps/web/src/lib/analyzer/llm.ts` (if model override routing support is needed)
- `apps/web/src/lib/analyzer/types.ts` (warning type/details if new structured warning added)
- `apps/web/src/lib/config-schemas.ts` + UCM plumbing if guard thresholds become configurable now

### Required behavior
1. Before OpenAI debate call (`provider=openai`, tier=sonnet path), estimate request size.
2. If estimated request risks TPM breach, fallback model for that call:
   - `gpt-4.1` -> `gpt-4.1-mini`
3. Emit structured warning with details:
   - promptKey / stage
   - configured model
   - fallback model
   - provider
   - reason `tpm_guard`
4. Continue fail-open (no hard abort due guard itself).

### Pattern to follow
- Mirror existing structured warning pattern (`debate_provider_fallback`, `structured_output_failure` details).
- Keep fallback explicit in telemetry and pair result diagnostics.

### Architectural decision required before coding
- **Parameter placement:** guard thresholds affect analysis behavior -> should be UCM-configurable (default values approved by Architect/Captain).

## A-2c Failure diagnostics bubble-up

### Goal
Make failed pair outputs actionable (not message-only).

### Primary files
- `apps/web/src/lib/calibration/types.ts`
- `apps/web/src/lib/calibration/runner.ts`
- `apps/web/src/lib/calibration/report-generator.ts` (optional short render block for failed pair diagnostics)

### Required schema extension
Extend failed pair result payload with structured diagnostics, e.g.:
- errorClass
- message
- stackTruncated
- stage
- promptKey
- provider
- model
- side (if known)

### Pattern to follow
- Keep backward compatibility: existing `error` string remains.
- New diagnostics field optional; safe for old artifacts.

## 3) Architectural Concerns (pre-code)

1. **Root-cause visibility gap**
- Current failed pair structure drops stack/stage/provider context.
- Risk: repeated patching without precise fault localization.
- Mitigation: prioritize A-2c instrumentation early in A-2 sequence.

2. **TPM guard false positives/negatives**
- TPM is org-level and time-windowed; local estimate is approximate.
- Risk: unnecessary fallback or missed spikes.
- Mitigation: conservative threshold + structured telemetry + tune via UCM.

3. **Model override path coherence**
- `createProductionLLMCall` options include `modelOverride`, but current call path primarily routes by tier/provider.
- Risk: adding fallback without coherent override semantics.
- Mitigation: either wire `modelOverride` end-to-end explicitly or implement deterministic task-key fallback with transparent warnings/tests.

4. **Scope creep into B-1**
- Runtime role tracing is B-1 and must not be pulled into Phase 1.
- Mitigation: A-2 telemetry only for failures/guard events; no full runtime-role table yet.

## 4) Test and Verification Plan (Phase 1)

Required before handoff completion:
1. `npm test` (safe suite)
2. `npm -w apps/web run build`

Do not run calibration/expensive tests unless required for A-2a targeted repro.

Recommended unit test targets:
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
  - TPM guard fallback behavior
  - warning emission payload
- `apps/web/test/unit/lib/calibration-metrics.test.ts` or new calibration runner unit
  - failed pair diagnostics shape/backcompat
- `apps/web/test/calibration/political-bias.test.ts`
  - only if needed for targeted non-expensive structural assertions (avoid full expensive execution)

## 5) Lead Dev Delegation Brief (copy/paste)

As Lead Developer, implement Phase 1 only from `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`:

1. A-1 report semantics in `apps/web/src/lib/calibration/report-generator.ts`
   - `Provider` -> `Global Provider`
   - add `Role Provider Mode` badge (`single|mixed`)
   - add resolved-vs-runtime note

2. A-2a crash fix for `undefined.value` on `nuclear-energy-fr`
   - identify root cause with stack
   - patch owning module (`claimboundary-pipeline.ts` / `llm.ts` / related)
   - add regression test

3. A-2b OpenAI TPM guard in debate call path
   - prevent fatal `gpt-4.1` TPM failures via guarded fallback to `gpt-4.1-mini`
   - emit structured warning with stage/provider/model details
   - keep fail-open behavior

4. A-2c failed pair diagnostics bubble-up
   - extend calibration failed pair schema with structured diagnostics
   - preserve existing `error` field for compatibility

Constraints:
- Do not start B-* items.
- Verify with `npm test` and `npm -w apps/web run build`.
- Do not run expensive calibration tests unless required for A-2a targeted repro.

Deliverables:
- code changes + tests
- short implementation summary with file list
- explicit note whether A-3 is now ready to run
