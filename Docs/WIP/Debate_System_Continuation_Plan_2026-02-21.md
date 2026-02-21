# Debate System Continuation Plan (Executable, Post-Baseline, 2026-02-21)

## 1) Investigation Result (Model display in HTML)

### Confirmed
- HTML report values are consistent with each report JSON `configSnapshot.resolvedLLM`.
- Cross-provider artifacts correctly show challenger as `openai / gpt-4.1`.

### Real issue (semantics, not raw mismatch)
- `Provider` badge currently shows global provider (`anthropic`) and can be misread as "all roles used Anthropic".
- Debate role table shows resolved config intent at run start, not guaranteed runtime effective model per call.
- Runtime per-role usage is not yet surfaced in report output.

## 2) Delivery Buckets

### Strategy guardrail (applies to all buckets)
- We do **both**:
  - keep model/provider diversity as a controlled guardrail
  - add low-cost knowledge diversity where it targets measured bias sources
- We do **not** increase complexity/cost by default:
  - no always-on extra search/LLM calls
  - trigger-based activation only
  - explicit budget caps (queries, tokens, time)

## a) Immediate Implementation (now, including low-hanging fruit)

Goal: make current runs trustworthy and reproducible before any architecture redesign decision.
Constraint: cross-provider work in this phase is **stabilization only**, not expansion.

### A-1 Low-hanging UI/report fixes (same day)
1. Rename badge `Provider` -> `Global Provider`.
2. Add badge `Role Provider Mode` with values:
   - `single` when all debate roles share one provider
   - `mixed` when role providers differ
3. Add fixed note below role table:
   - "Role table shows resolved configuration at run start; runtime fallback/degradation appears in warnings/runtime usage."

Done when:
- Cross-provider HTML clearly communicates mixed provider usage without ambiguity.

### A-2 Run-blocker fixes (priority-0)
1. Fix `nuclear-energy-fr` crash (`Cannot read properties of undefined (reading 'value')`) with failing test.
2. Add OpenAI TPM guard in verdict/debate path:
   - pre-call estimate
   - automatic fallback policy for role calls under pressure (`gpt-4.1` -> `gpt-4.1-mini`)
3. Capture full failure diagnostics into pair result:
   - error class
   - message
   - stack (bounded/truncated)
   - stage
   - provider/model if known

Done when:
- Cross-provider full run no longer fails on crash.
- No fatal TPM errors in final pair results.

### A-3 Re-run gate (must pass before interpretation)
1. Run cross-provider full mode twice.
2. Require:
   - 10/10 completed in both runs
   - `failureModeBiasCount` remains 0/10
   - no fatal runtime exception

Done when:
- We have two decision-grade cross-provider full artifacts.

## b) Soon (next sprint)

Goal: move from config transparency to runtime transparency + objective A/B conclusions, while introducing low-cost knowledge-diversity controls.

### B-1 Runtime role tracing
1. Instrument verdict-stage calls with per-call fields:
   - debate role
   - prompt key
   - effective provider
   - effective model
   - fallback/degradation flags
2. Emit aggregated `meta.runtimeRoleModels` into result JSON.
3. Add `Runtime Role Usage` table in HTML and mismatch indicator vs resolved config.

Done when:
- Report can answer "what actually ran" per debate role, not only "what was configured".

### B-2 Structured A/B package
1. A/B baseline vs cross-provider on same fixture version and config hashes.
2. Publish one conclusion sheet with:
   - completion quality
   - skew deltas
   - C18 deltas
   - warning class deltas

Done when:
- Cross-provider decision is based on complete comparable runs.

### B-3 C13 operational step
1. Implement **knowledge-diversity lite** (minimum-viable, low-cost):
   - evidence sufficiency gate (prevent thin-evidence % outputs)
   - source-type evidence partitioning by role (no extra infra)
   - contrarian retrieval pass on trigger only (not always-on)
2. Add strict cost guardrails:
   - max extra queries per claim
   - max added LLM calls per claim
   - timeout ceiling and fail-open to current path
3. Re-run calibration A/B:
   - baseline vs cross-provider (stabilized)
   - with vs without knowledge-diversity-lite controls

Done when:
- We can quantify C13 correction effect without unacceptable cost/runtime increase.

## c) Backlog (after stabilization + first A/B conclusions)

Goal: evaluate whether a topology reset beats incremental debate tuning.

### C-1 Debate V2 topology (feature-flagged)
1. Dual independent advocates (support and contradiction built symmetrically).
2. Cross-examination round with evidence-ID constraints.
3. Judge/reconciler scoring rubric (support strength, contradiction strength, unresolved uncertainty).
4. Keep evidence-weighted contestation policy as hard rule.

Success gate:
- A/B vs current topology with measurable gains and no C18 regressions.

Note:
- Debate V2 remains backlog until immediate stability and soon-phase observability/knowledge-diversity-lite gates are met.

### C-2 Config UX simplification
1. Single per-role setting object: `{ provider, model, tier }`.
2. Keep profile presets as optional templates, but ensure explicit runtime-resolved export.

Success gate:
- Admin can configure role routing without split-field confusion.

### C-3 Fault-injection regression suite
1. Synthetic broken-url/doc fixture set.
2. Assertion suite for bubbling and classification of failures.

Success gate:
- Error observability remains stable across releases.

## 3) Execution Order (strict)

1. A-1 low-hanging report clarity
2. A-2 crash + TPM + failure diagnostics
3. A-3 two complete cross-provider full runs
4. B-1 runtime role tracing
5. B-3 knowledge-diversity-lite controls with cost caps
6. B-2 A/B conclusion package
7. C-* backlog architecture and UX changes

## 4) Decision Policy

- Until A-3 is complete, cross-provider results are diagnostic only.
- No default profile/pipeline promotion before:
  - complete runs
  - runtime-role transparency
  - knowledge-diversity-lite A/B result with cost guardrails satisfied
  - A/B conclusion package

## 5) Owners and Artifacts

- Lead Dev:
  - A-1, A-2 implementation
  - A-3 run execution
- LLM Expert:
  - B-3 correction strategy and measurement interpretation
  - C-1 debate V2 prompt/protocol design
- Architect:
  - B-2 decision memo
  - promotion/no-promotion recommendation

Required outputs:
- Updated reports in `apps/web/test/output/bias/`
- One run summary in `Docs/WIP/`
- Status sync in `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`
