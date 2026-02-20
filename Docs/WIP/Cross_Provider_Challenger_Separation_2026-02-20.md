# Cross-Provider Challenger Separation — Implementation Plan

**Date:** 2026-02-20  
**Status:** 🧭 Proposal — Ready for implementation review  
**Owner Role:** Lead Architect  
**Origin:** `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md` (Action #4 follow-up)

---

## Goal

Enable structurally independent debate by allowing `VERDICT_CHALLENGER` to run on a different LLM provider than `VERDICT_ADVOCATE` (example: advocate on Anthropic Sonnet, challenger on OpenAI GPT-4.1/4o family).

Current state already supports per-role **tier** (`haiku`/`sonnet`) but not per-role **provider**.

---

## Why This Matters

- Addresses C1/C16 risk: same-model debate can become performative adversarialism.
- Aligns FactHarbor with Climinator-style structural independence.
- Preserves existing architecture: no prompt redesign required, only routing/config enhancement.

---

## Current Architecture (as implemented)

- Role-tier config exists in `PipelineConfig.debateModelTiers`.
- `runVerdictStage()` calls an injected `LLMCallFn` from `verdict-stage.ts`.
- `createProductionLLMCall()` in `claimboundary-pipeline.ts` maps tier to task and uses `getModelForTask(...)`.
- Provider is currently resolved globally from `pipelineConfig.llmProvider`.

Implication: all debate roles still share one provider, even if tiers differ.

---

## Proposed Design

### 1. UCM Config Contract (Pipeline)

Add optional per-role provider overrides:

```ts
debateModelProviders?: {
  advocate?: "anthropic" | "openai" | "google" | "mistral";
  selfConsistency?: "anthropic" | "openai" | "google" | "mistral";
  challenger?: "anthropic" | "openai" | "google" | "mistral";
  reconciler?: "anthropic" | "openai" | "google" | "mistral";
  validation?: "anthropic" | "openai" | "google" | "mistral";
}
```

Defaults remain `undefined` (inherit global `llmProvider`), preserving behavior.

### 2. Verdict-stage LLM Call Contract

Extend `LLMCallFn` options (backward compatible):

```ts
{
  tier?: "sonnet" | "haiku";
  temperature?: number;
  providerOverride?: "anthropic" | "openai" | "google" | "mistral";
  modelOverride?: string;
}
```

### 3. Per-role Routing

Pass provider overrides at role call sites:
- `VERDICT_ADVOCATE` uses `debateModelProviders.advocate`
- `VERDICT_CHALLENGER` uses `debateModelProviders.challenger`
- etc.

### 4. Production Model Resolution

In `createProductionLLMCall()`:
- Resolve model with `getModelForTask(taskKey, options?.providerOverride, pipelineConfig)`.
- Derive provider-specific SDK options from **resolved** provider (not global).
- Record metrics with actual model/provider used.

### 5. Safety + Fallback

- If a role override points to a provider missing API credentials:
  - log warning
  - fallback to global provider (fail-open to preserve job completion)
- Add explicit warning type for role-provider fallback to aid operations.

---

## Implementation Phases

## Phase 1 — Config and Types
- Update `PipelineConfigSchema` and defaults.
- Extend `VerdictStageConfig`.
- Extend `LLMCallFn` options type.

## Phase 2 — Routing and Runtime
- Wire provider overrides through `buildVerdictStageConfig()`.
- Update verdict role call sites in `verdict-stage.ts`.
- Update `createProductionLLMCall()` provider/model selection and metrics attribution.

## Phase 3 — Tests
- `verdict-stage.test.ts`: role options include provider override.
- `claimboundary-pipeline.test.ts`: production call uses per-role provider override.
- fallback tests for invalid/missing provider credentials.

## Phase 4 — Rollout
- Start with `challenger` override only.
- Keep all other roles inheriting global provider.
- Validate with calibration harness A/B run.

---

## Acceptance Criteria

1. A job can run advocate on provider A and challenger on provider B in one verdict stage.
2. Existing configs (no provider overrides) produce unchanged behavior.
3. Metrics reflect actual provider/model per role call.
4. Missing credentials for overridden provider produce warning + deterministic fallback.
5. Safe test suite and web build pass.

---

## Risks

- Mixed-provider JSON behavior differences (tool mode, output style).
- Cost/latency variance between providers.
- Operational complexity (credentials and quotas per provider).

Mitigation:
- Keep schema parsing centralized.
- Add role-level fallback warnings.
- Roll out challenger-only first.

---

## Review Questions

1. Should fallback on missing provider credentials be fail-open (fallback) or fail-closed (error)?
2. Do we allow `modelOverride` at role level in v1, or provider-only first?
3. Should validation role remain single-provider by policy for stability?
4. Do we need a UCM guardrail to block unsupported provider mixes in deterministic mode?

---

## Suggested First Config to Test

```json
{
  "llmProvider": "anthropic",
  "debateModelTiers": {
    "advocate": "sonnet",
    "challenger": "sonnet",
    "reconciler": "sonnet",
    "selfConsistency": "sonnet",
    "validation": "haiku"
  },
  "debateModelProviders": {
    "challenger": "openai"
  }
}
```

