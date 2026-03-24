# Model Auto-Resolution: Eliminate Hardcoded Model Version Strings

**Status:** Planned
**Priority:** High (prevents stale model errors, reduces maintenance)
**Date:** 2026-02-23

## Problem

Model version strings (e.g., `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`) are scattered across ~15 source files. When Anthropic/OpenAI release new models, these go stale — causing API errors (as seen with `claude-3-5-haiku-20241022` on 2026-02-23).

## Principle

**No model version strings in code or UCM.** Model selection uses tier aliases that auto-resolve to the latest version.

## Design

### UCM Pipeline Config (what the admin sees)

```json
{
  "llmProvider": "anthropic",
  "llmTiering": true,
  "modelTiers": {
    "budget": "haiku",
    "standard": "sonnet",
    "premium": "sonnet",
    "opus": "opus"
  }
}
```

No version numbers. Admin says "use haiku for budget tasks" — code resolves to latest.

### Resolution Layer (new: `model-resolver.ts`)

Single function that maps `(provider, tierAlias)` → concrete model ID for the AI SDK:

| Provider | Alias | Resolves to |
|----------|-------|-------------|
| anthropic | haiku | `claude-haiku-4-5-latest` |
| anthropic | sonnet | `claude-sonnet-4-5-latest` |
| anthropic | opus | `claude-opus-4-latest` |
| openai | mini | `gpt-4.1-mini` |
| openai | standard | `gpt-4.1` |
| google | flash | `gemini-2.5-flash` |
| google | pro | `gemini-2.5-pro` |

Anthropic supports `-latest` aliases natively. For providers without aliases, the resolver maintains a version map (still one file, not scattered).

### Consumers (what changes)

| File | Current | After |
|------|---------|-------|
| `model-tiering.ts` | Hardcoded `modelId` strings per tier | Calls `resolveModel(provider, alias)` |
| `evaluate-source/route.ts` | `anthropic("claude-haiku-4-5-20251001")` | `anthropic(resolveModel("anthropic", "budget"))` reading tier from UCM |
| `test-config/route.ts` | `anthropic(ANTHROPIC_MODELS.budget.modelId)` | `anthropic(resolveModel("anthropic", "budget"))` |
| `claimboundary-pipeline.ts` | Reads `modelUnderstand` etc. from UCM | UCM stores aliases; pipeline calls resolver |
| `config-schemas.ts` | Validates specific model ID strings | Validates tier aliases instead |
| `metrics.ts` | Pricing lookup by model ID | Pricing by alias or resolved model |

### Migration

1. Create `model-resolver.ts` with `resolveModel(provider, alias)` function
2. Update UCM pipeline config schema: `modelUnderstand` etc. accept aliases ("haiku", "sonnet") not version IDs
3. Update all consumers to call resolver instead of hardcoding
4. Run reseed to update existing UCM configs to aliases
5. Delete hardcoded model ID strings from `model-tiering.ts` constants

### Risk

- Anthropic `-latest` aliases may not always resolve to the same model across runs (if Anthropic releases a new version mid-run). For calibration runs that need reproducibility, the resolver should **log the resolved model ID** at run start (B-1 trace already does this).
- Need to verify `-latest` aliases work with AI SDK `@ai-sdk/anthropic`.

## Scope

~4-6h implementation. Touches ~10 files but each change is mechanical (replace string → resolver call).

## Supersedes

Backlog item "UCM model defaults for non-Anthropic providers" (Deferred to v1.1) — this plan is broader and covers all providers.
