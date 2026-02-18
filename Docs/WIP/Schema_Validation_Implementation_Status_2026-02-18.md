# Schema Validation: Implementation Status

**Date**: 2026-02-18
**Status**: 🔧 Emergency Fixes Implemented — Remaining Work Open
**Target**: Reduce Pass 2 validation failures from ~5-10% to <1%

---

## Problem Statement

**Pass 2 claim extraction** (`claimboundary-pipeline.ts`, `runPass2()`) fails ~5-10% of the time when the LLM outputs structured JSON that doesn't match the `Pass2AtomicClaimSchema`.

**Example failure** (2026-02-18):
```
Input: "2+2=4"
Error: Stage 1 Pass 2 failed after 3 attempts. Last error: No object generated: response did not match schema.
Job ID: d65e30b44303464faee84cd6bcadb043
```

**Root cause**: Schema complexity — 14 required fields, 7 strict enums, 1 nested object with 3 mandatory arrays. A single enum capitalization error, missing field, or type mismatch fails the entire extraction.

---

## Analysis Documents

| Document | Role | Focus |
|----------|------|-------|
| [LLM_Schema_Validation_Failures_Analysis.md](./LLM_Schema_Validation_Failures_Analysis.md) | Initial Analysis | Root cause identification, failure mode catalog |
| [LLM_Expert_Review_Schema_Validation.md](./LLM_Expert_Review_Schema_Validation.md) | LLM Expert | 9 prioritized recommendations, implementation timeline |
| [Lead_Architect_Schema_Assessment_2026-02-18.md](./Lead_Architect_Schema_Assessment_2026-02-18.md) | Lead Architect | Architectural decisions, Gate 1 non-functional finding |
| [Schema_Validation_Fix_Multi_Agent_Plan.md](./Schema_Validation_Fix_Multi_Agent_Plan.md) | Multi-Agent Plan | 4-phase implementation plan coordinating 5 agent roles |

---

## What Was Implemented

### 1. Schema Hardening with `.catch()` Defaults

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` lines 381-403

All 12 non-essential fields in `Pass2AtomicClaimSchema` now use `.catch(default)` to provide sensible fallback values when the LLM outputs invalid data. Only `id` and `statement` remain strictly required.

**How it works with the AI SDK**:
- `parseCatchDef` in `@ai-sdk/provider-utils` unwraps `ZodCatch` → JSON schema sent to the LLM still shows correct enum values
- At validation time, `ZodCatch` catches any error and returns the default → no more "No object generated" errors
- Defense-in-depth: `.catch()` handles AI SDK validation; normalization handles our `.parse()` validation

**Default values**:

| Field | Default | Rationale |
|-------|---------|-----------|
| `category` | `"factual"` | Conservative — treats claim as verifiable |
| `centrality` | `"low"` | Conservative — won't inflate claim importance |
| `harmPotential` | `"low"` | Safe — doesn't trigger special handling |
| `isCentral` | `false` | Conservative |
| `claimDirection` | `"contextual"` | Neutral — doesn't bias verdict direction |
| `keyEntities` | `[]` | Empty — no entities assumed |
| `checkWorthiness` | `"medium"` | Neutral midpoint |
| `specificityScore` | `0.5` | Neutral midpoint (field is dead code — see Open Items) |
| `groundingQuality` | `"moderate"` | Neutral midpoint |
| `expectedEvidenceProfile` | `{methodologies:[], expectedMetrics:[], expectedSourceTypes:[]}` | Empty arrays |

---

### 2. Case-Insensitive Enum Normalization

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` lines 848-903 (`normalizePass2Output()`)

Pre-processes raw LLM output **before** Zod validation. Handles known failure modes:

| Failure Mode | Example | Fix |
|-------------|---------|-----|
| Enum capitalization | `"Factual"` → `"factual"` | Lowercases all enum string fields |
| claimDirection variants | `"supports"` → `"supports_thesis"` | Pattern matching with fallback |
| Neutral/unrelated | `"neutral"` → `"contextual"` | Maps to valid enum value |
| specificityScore as string | `"0.8"` → `0.8` | `parseFloat()` with NaN guard |
| keyEntities null | `null` → `[]` | Array coercion |
| Missing nested arrays | `expectedEvidenceProfile.methodologies: null` → `[]` | Per-field array guard |

---

### 3. Detailed Zod Error Logging

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` lines 987-991

When validation fails, the catch block now logs **field-level diagnostics** instead of opaque error messages:

```
[Stage1 Pass2] Attempt 1/3 — Zod validation failed:
  atomicClaims.0.category: Invalid enum value. Expected 'factual' | 'evaluative' | 'procedural', received 'Factual' (code: invalid_enum_value)
  atomicClaims.0.specificityScore: Expected number, received string (code: invalid_type)
```

This enables data-driven prioritization of further fixes.

---

### 4. Retry Logic (Pre-existing)

**Commit**: `c999f8a` (prior to this analysis)

- 3 attempts with exponential backoff (1s, 2s delays)
- Temperature increases +0.05 per attempt (0.15 → 0.20 → 0.25)
- Serves as last-resort fallback after `.catch()` and normalization

---

## What's Still Open

### High Priority

| # | Item | Why | Effort |
|---|------|-----|--------|
| 1 | **Remove `specificityScore`** from schema | Dead code — Gate 1 hardcodes it to `0`, LLM outputs random values | 1h |
| 2 | **Clean up dead config** (`gate1SpecificityThreshold`, `gate1OpinionThreshold`) | Config exists for features that were never completed | 30m |
| 3 | **Fix prompt-schema mismatch**: prompt says "drop low centrality claims" but `.catch()` defaults to `"low"` | Contradictory instructions confuse the LLM; default value undermines prompt intent | 30m |

### Medium Priority

| # | Item | Why | Effort |
|---|------|-----|--------|
| 4 | **Rebuild Gate 1** — replace hardcoded scores with real LLM-powered validation | Gate 1 currently does nothing useful (hardcoded pass-through) | 1-2 days |
| 5 | **Production failure rate measurement** | No telemetry dashboard exists; we can't measure if fixes actually helped | 1 day |
| 6 | **Split Pass 2 into Pass 2A + 2B** (extract → enrich) | Simpler schemas per call = lower failure rate per call | 1-2 days |

### Low Priority (Strategic)

| # | Item | Why | Effort |
|---|------|-----|--------|
| 7 | **A/B test Haiku vs Sonnet** for Pass 2 | Sonnet may reduce failures enough to justify higher cost | 1 day |
| 8 | **Semantic enum validation** via embeddings | Language-agnostic, typo-tolerant classification | 2-3 days |
| 9 | **Simplify enum values** (`"supports_thesis"` → `"supporting"`) | Natural language values are easier for LLMs | 1h + prompt update |

---

## Risk Notes

1. **`.catch()` masks failures silently** — Claims may have default metadata values that don't reflect the LLM's actual analysis. Downstream stages won't know whether a value came from the LLM or from a default.

2. **`centrality: "low"` default contradicts prompt** — The prompt says "drop low centrality claims" but when the LLM fails to output centrality, `.catch("low")` assigns it. The `filterByCentrality()` function will then drop these claims. This is arguably correct behavior (unclear centrality → conservative = drop), but it's an unintentional side effect.

3. **No measurement baseline** — We don't have telemetry to measure the actual failure rate before/after these fixes. The 5-10% estimate comes from industry benchmarks, not production data.

---

## Files Modified

| File | Changes |
|------|---------|
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Schema `.catch()` defaults (L386-403), `normalizePass2Output()` (L848-903), Zod error logging (L987-991) |

---

## Related Work (Same Session, 2026-02-18)

These changes were implemented alongside other improvements in the same session:

- **Search provider multi-provider fallback** (Google CSE, Brave, SerpAPI) with circuit breaker
- **SystemHealthBanner** improvements — removed duplicate error messages
- **AboutBox** — displays active search/LLM providers with fallback hierarchy
- **Job detail page** — LLM provider badge and aggregate search providers in Sources panel
- **ClaimBoundary pipeline metadata** — added `llmProvider`, `llmModel`, `searchProvider`, `searchProviders` to result.meta

---

**Next Step**: Captain to decide which open items to prioritize. Recommend starting with #1-3 (high priority, low effort, same session).
