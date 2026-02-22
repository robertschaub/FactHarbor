# Code Review: Pre-A-3 Phase-1 Focused Review

**Date:** 2026-02-21
**Reviewer:** Code Reviewer (Claude Code)
**Scope:** Commits `2c5ffa4` (feat: phase1 immediate A-1/A-2 execution) + `edb6a50` (docs: agent output handoff entry)
**Files reviewed:** `claimboundary-pipeline.ts`, `runner.ts` (calibration), `report-generator.ts` (calibration), `types.ts` (calibration), `config-schemas.ts`, `claimboundary-pipeline.test.ts`, `calibration-runner-failures.test.ts`
**Context:** Pre-gate review for A-3 (cross-provider full calibration run: 10 pairs × 2 sides). Phase-1 covers A-1 (structured error telemetry) + A-2b (TPM guard). A-2a (credential fallback) committed separately.

---

## Finding Summary

| ID | Severity | File | Description |
|----|----------|------|-------------|
| PA3-M1 | MEDIUM | `claimboundary-pipeline.ts` | `approxTokenCount` estimates variables only, excludes system prompt |
| PA3-M2 | MEDIUM | `claimboundary-pipeline.ts` | `isOpenAiTpmError()` — "request too large" condition is broader than needed |
| PA3-L1 | LOW | `claimboundary-pipeline.ts` | Mini-path TPM failures not retried (design limit — intentional, acceptable) |
| PA3-L2 | LOW | `report-generator.ts` | `roleProviderMode="mixed"` does not identify which specific roles differ |

**CRITICAL:** 0 | **HIGH:** 0 | **MEDIUM:** 2 | **LOW:** 2

---

## Findings

### PA3-M1 — Token Estimate Excludes System Prompt (MEDIUM)
**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `approxTokenCount()` + pre-call guard

**Description:**
The pre-call TPM guard estimates input tokens using:
```typescript
const estimatedInputTokens = approxTokenCount(JSON.stringify(variables));
// where approxTokenCount = Math.ceil(text.length / 4)
```
This estimates only the `variables` object (user message + evidence payload). The full prompt sent to the API also includes the loaded system prompt from `loadSection(promptKey)` — typically 500–2000 tokens depending on the prompt. The total token count the API sees is therefore `variables_tokens + system_prompt_tokens`.

**Impact:** In edge cases where variables alone are just under the 24000 threshold (e.g., 23800 tokens estimated) but the system prompt pushes the real total over, the pre-call guard does not fire. The post-call retry guard still provides a safety net in this case.

**Severity rationale:** Medium — the threshold is set conservatively (24000 tokens ≈ 96000 chars in variables) and the post-call retry is a backstop. No correctness failure; only a coverage gap in the pre-call path.

**Recommendation:** Acceptable for A-3. Post-A-3, consider passing the assembled prompt text to `approxTokenCount` rather than the raw variables JSON.

---

### PA3-M2 — `isOpenAiTpmError()` "request too large" Condition Too Broad (MEDIUM)
**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `isOpenAiTpmError()`

**Code:**
```typescript
function isOpenAiTpmError(error: unknown): boolean {
  const lower = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    lower.includes("tokens per min") ||
    lower.includes("tpm") ||
    lower.includes("request too large")  // ← this one
  );
}
```
The first two conditions (`"tokens per min"`, `"tpm"`) are highly specific to OpenAI's TPM rate limit error messages. The third condition, `"request too large"`, is broader and could match:
- Proxy or gateway error messages ("request too large for forwarding")
- Future OpenAI error format changes
- Non-TPM errors that happen to use this phrase

OpenAI's current context-length-exceeded message format (`"This model's maximum context length is X tokens..."`) does NOT contain "request too large", so there is no current false-positive. This is a fragility concern for future API changes, not a current bug.

The TPM error that triggered this feature already contains `"tokens per min"`, so `"request too large"` alone is not necessary for the known failure mode.

**Severity rationale:** Medium — no current false-positives. Risk is a misfired retry on a non-retryable error in future if OpenAI or a proxy changes error message formats.

**Recommendation:** Acceptable for A-3. Post-A-3 (B-sequence), remove the `lower.includes("request too large")` clause. The two-condition form is sufficient and safer.

---

### PA3-L1 — Mini-Path TPM Failures Not Retried (LOW / Design Limit)
**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — post-call retry guard

**Code:**
```typescript
if (
  attemptModel.provider === "openai" &&
  attemptModel.modelName === "gpt-4.1" &&   // ← not "gpt-4.1-mini"
  isOpenAiTpmError(error)
) {
  // retry with mini
}
```
After the pre-call guard switches to mini (setting `attemptModel.modelName = "gpt-4.1-mini"`), if the mini call then fails with any error (including TPM), the post-call guard's `modelName === "gpt-4.1"` check fails and the error propagates without a further retry.

**Impact:** If a mini-model call hits TPM (uncommon at 24k token threshold), it propagates as a structured `Stage4LLMCallError` rather than being retried. For A-3 this means the pair will be recorded as failed with full diagnostics.

**Severity rationale:** Low — by design. Double-fallback adds complexity and mini rarely hits TPM at the threshold set. Structured diagnostics will surface this in A-3 results if it occurs.

---

### PA3-L2 — `roleProviderMode` Label Does Not Identify Which Roles Differ (LOW)
**File:** `apps/web/src/lib/calibration/report-generator.ts`

**Code:**
```typescript
const roleProviderMode = new Set(roleProviders).size > 1 ? "mixed" : "single";
```
The "Role Provider Mode" badge shows `"mixed"` when any role uses a different provider than the others. It does not indicate WHICH roles are on which provider. For a cross-provider run (e.g., anthropic base + openai challenger), the report shows `"mixed"` but the per-role table in the same section already shows each role's provider explicitly.

**Impact:** Informational only. The per-role table directly below provides the needed specificity.

**Severity rationale:** Low — the adjacent table makes up for the badge's coarseness. No functional issue.

---

## Verified-Correct Items (Notable)

### PA3-V1 — `resolveOpenAiFallbackModel()` Correctly Returns Mini ✓
**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` + `apps/web/src/lib/analyzer/llm.ts`

Initially flagged as a potential concern: `resolveOpenAiFallbackModel()` sets `llmTiering: true` in the fallback config. Concern was that tiering might route to the default OpenAI sonnet model (gpt-4.1) rather than the configured mini fallback.

**Verified correct via `llm.ts` analysis:**
1. `modelOverrideForTask("verdict", fallbackConfig)` returns `fallbackConfig.modelVerdict = "gpt-4.1-mini"`.
2. `detectProviderFromModelName("gpt-4.1-mini")` → `"openai"` (contains `"gpt"`).
3. Provider check: inferred `"openai"` === effective provider `"openai"` → override accepted.
4. `modelName = "gpt-4.1-mini"` → correct. `buildModelInfo("openai", "gpt-4.1-mini")` returned.

The `llmTiering: true` setting is safe here: in tiered mode, `getModelForTask` first checks `modelVerdict` from config, and only falls back to `defaultModelNameForTask()` if no override is present. Since `modelVerdict: "gpt-4.1-mini"` is explicitly set and the inferred provider matches, the override is used.

### PA3-V2 — Retry-Once Scope Is Correctly Bounded ✓
**File:** `apps/web/src/lib/calibration/runner.ts`

The value-read crash retry in `runSide()`:
- Only retries on `attempt === 0` (never on attempt 1) → no infinite loop
- Only retries for the specific `"Cannot read properties of undefined" && "reading 'value'"` message
- Any error on attempt 1 throws immediately via `throw annotateSideOnError(err, side)`
- Test `calibration-runner-failures.test.ts` correctly exercises the 3-call flow (1 fail + 2 success)

Scope is tightly bounded. No risk of unbounded retry.

### PA3-V3 — Structured Error Bubble-Up Is Complete ✓
**File:** `claimboundary-pipeline.ts` (toError + Stage4LLMCallError) + `runner.ts` (buildPairFailureDiagnostics + annotateSideOnError)

End-to-end flow:
1. `toError()` creates `Stage4LLMCallError` with `details: { stage, promptKey, provider, model, tier, reason }` and `.cause` chain.
2. `annotateSideOnError()` adds `details.side` to the error before re-throwing from `runSide()`.
3. `buildPairFailureDiagnostics()` reads `e.details` and surfaces all structured fields into `PairFailureDiagnostics`.
4. `FailedPairResult.diagnostics` is stored in the calibration result and rendered in the report card.

Test `calibration-runner-failures.test.ts` "bubbles structured error metadata" confirms the full chain for `Stage4LLMCallError` with `side` annotation.

### PA3-V4 — Report Semantics: "Global Provider" vs "Role Provider Mode" ✓
**File:** `apps/web/src/lib/calibration/report-generator.ts`

The rename from `"Provider:"` to `"Global Provider:"` plus the new `"Role Provider Mode: mixed/single"` badge is semantically accurate:
- "Global Provider" = base config provider (the `resolved.provider` field from config snapshot)
- "Role Provider Mode" = whether cross-provider routing is active (any role on a different provider)
- Raw config fallback correctly shows `"Role Provider Mode: unknown"` when `resolvedLLM` is absent

This is the correct factual representation for A-3 report reading.

---

## Test Coverage Assessment

**`claimboundary-pipeline.test.ts` additions:**
- Pre-call guard test: verifies single call to mini + `guardPhase: "tpm_guard_precheck"` warning ✓
- Post-call retry test: verifies two calls (gpt-4.1 → gpt-4.1-mini) + `guardPhase: "tpm_guard_retry"` warning ✓
- Unrecovered failure test: verifies `Stage4LLMCallError` name + structured `details` fields ✓
- Mock fix: `getModelForTask` now returns `{ model, modelName, provider }` — required by new TPM guard logic; existing tests unaffected (all pass through anthropic path, no TPM guard)

**`calibration-runner-failures.test.ts` (new):**
- Test 1: `Stage4LLMCallError` from pipeline bubbles into `PairFailureDiagnostics` with `side` field ✓
- Test 2: retry-once on value-read crash produces `status: "completed"` (3 calls: 1 crash + 2 success) ✓

**Gap:** No test covers the path where the pre-call guard fires AND the mini call subsequently fails. The error propagation on that path relies on the general `toError()` path, which is tested separately. Acceptable for A-3 — not a blocker.

---

## Go / No-Go Recommendation

### **GO** for A-3 ✓

**Rationale:**
- No CRITICAL or HIGH findings.
- Both MEDIUM findings (PA3-M1, PA3-M2) are approximation/fragility concerns — not correctness failures. The post-call retry backstop covers PA3-M1's gap. PA3-M2 has no current false-positive.
- The key structural risk (PA3-V1: fallback model resolution) was verified correct via source analysis — `resolveOpenAiFallbackModel()` correctly returns `gpt-4.1-mini`.
- Structured error telemetry (A-1) is end-to-end verified. A-3 failures will produce actionable `PairFailureDiagnostics` with `stage`, `promptKey`, `provider`, `model`, `side` fields.
- TPM guard (A-2b) correctly handles the two Phase-1 scenarios: pre-call threshold breach and post-call TPM retry.
- All tests added for Phase-1 pass the stated behavior. The core logic is exercised.

### Minimal Patch Plan (Post-A-3 / B-sequence, not blockers)

**Patch 1 — Narrow `isOpenAiTpmError` (PA3-M2):**
```typescript
// Remove "request too large" — covered by the two specific conditions
function isOpenAiTpmError(error: unknown): boolean {
  const lower = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return lower.includes("tokens per min") || lower.includes("tpm");
}
```
Effort: 2 min. Schedule: B-sequence or at first opportunity.

**Patch 2 — Full prompt token estimate for pre-call guard (PA3-M1):**
Load and include the system prompt character count in `approxTokenCount`. Requires passing prompt content into the estimation step. Effort: 15–30 min. Schedule: B-sequence, after A-3 data confirms whether the gap matters.

No patches are required before A-3.

---

## Commit `edb6a50` (docs only)

**File:** `Docs/AGENTS/Agent_Outputs.md` — handoff entry for Phase-1 execution.

No code changes. Entry is accurate and correctly references the Phase-1 work. No findings.

---

*Review complete. Proceed to A-3.*
