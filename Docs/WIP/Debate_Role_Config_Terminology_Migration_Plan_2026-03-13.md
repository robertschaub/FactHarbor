# Debate Role Config Terminology Migration Plan

**Status:** APPROVED
**Created:** 2026-03-13
**Last Updated:** 2026-03-13
**Author Role:** Senior Developer

---

## TL;DR

The current debate-role config is technically functional but conceptually misleading:

- `debateModelTiers`
- values `haiku | sonnet | opus`
- separate `debateModelProviders`

This is confusing because `haiku/sonnet/opus` are Anthropic product-family names, while FactHarbor uses them as provider-agnostic capability classes across Anthropic, OpenAI, Google, and Mistral.

The fix should be done **end-to-end**, not just in the Admin UI:

- new canonical seed/UCM/runtime shape:
  - `debateRoles.<role>.provider`
  - `debateRoles.<role>.strength`
- adjacent single-field capability config brought into the same vocabulary:
  - `tigerScoreStrength`
- new canonical values:
  - `budget | standard | premium`
- old fields remain **read-compatible only** during migration:
  - `debateModelTiers`
  - `debateModelProviders`
  - `haiku | sonnet | opus`

This avoids a half-migration where UI, seed files, and runtime use different mental models.

---

## Reviewer Quick Start

If you are reviewing this plan, read in this order:

1. `TL;DR`
2. `Why This Matters`
3. `Target Design`
4. `Architecture Decision`
5. `Migration Strategy`
6. `Review Questions`

Primary review outcome:

- Yes. FactHarbor should adopt `debateRoles.<role>.provider + strength` as the single canonical runtime/config model, rename `tigerScoreTier` to `tigerScoreStrength`, and demote `debateModelTiers` / `debateModelProviders` to legacy read-compat only.

---

## Reviewer Checklist

- Confirm the new canonical shape is clearer than the current split `tiers + providers` shape.
- Confirm `budget | standard | premium` is the right provider-neutral vocabulary.
- Confirm the migration should be end-to-end, not UI-only.
- Confirm backward compatibility is sufficient for stored configs and history.
- Confirm preserving current effective defaults is the right rollout posture.
- Confirm file scope covers all real runtime consumers.
- Confirm `tigerScoreTier` is correctly included in-scope as `tigerScoreStrength`.

---

## Why This Matters

Today, a config like this is valid:

```json
{
  "debateModelProviders": { "challenger": "openai" },
  "debateModelTiers": { "challenger": "sonnet" }
}
```

But this is cognitively wrong for humans reading it:

- `provider=openai`
- `tier=sonnet`

The code means:

- use OpenAI as the vendor
- at the "standard/strong" internal capability level

The config looks like:

- "use an OpenAI Sonnet model"

which does not exist and invites misunderstanding, wrong reviewer conclusions, and accidental misconfiguration.

---

## Goal

Make debate-role config:

1. generic by terminology
2. role-centric in structure
3. explicit in seed files
4. canonical in runtime
5. backward-compatible for existing stored configs

---

## Non-Goals

- Do **not** change actual model routing behavior in this migration.
- Do **not** change default debate strategy beyond preserving current intended defaults.
- Do **not** make `filter` or `organize` first-class role configs in this pass.

This plan is specifically about the **provider-neutral model capability vocabulary** and the role-centric debate routing shape. Non-debate model fields (`modelUnderstand`, `modelExtractEvidence`, `modelVerdict`, `modelOpus`) remain free-text model IDs per Non-Goals; they are updated only as needed for compatibility with the shared resolver/type migration.

---

## Current State

### Current Canonical-Enough Surfaces

- [`apps/web/configs/pipeline.default.json`](../../apps/web/configs/pipeline.default.json)
- [`apps/web/src/lib/config-schemas.ts`](../../apps/web/src/lib/config-schemas.ts)
- [`apps/web/src/lib/analyzer/verdict-stage.ts`](../../apps/web/src/lib/analyzer/verdict-stage.ts)
- [`apps/web/src/lib/analyzer/claimboundary-pipeline.ts`](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
- [`apps/web/src/lib/calibration/runner.ts`](../../apps/web/src/lib/calibration/runner.ts)

### Current Debate Defaults

Current effective defaults are:

- `advocate`: provider `anthropic`, tier `sonnet`
- `selfConsistency`: provider `anthropic`, tier `sonnet`
- `challenger`: provider `openai`, tier `sonnet`
- `reconciler`: provider `anthropic`, tier `sonnet`
- `validation`: provider `anthropic`, tier `haiku`

### Current Problems

1. **Misleading terminology**
   - `haiku/sonnet/opus` are provider-branded names used as generic capability classes

2. **Split config shape**
   - provider and capability are stored in separate maps
   - humans think per-role, not per-dimension

3. **Seed/runtime/UI mismatch risk**
   - even when values are correct, the model is harder to reason about than necessary

4. **Half-fix risk**
   - clarifying only the UI still leaves old runtime names in place

5. **Adjacent terminology inconsistency**
   - `tigerScoreTier` uses the same provider-branded capability vocabulary and should not remain on the old naming model if the rest of the pipeline migrates

---

## Target Design

### New Canonical Shape

```json
{
  "debateRoles": {
    "advocate": { "provider": "anthropic", "strength": "standard" },
    "selfConsistency": { "provider": "anthropic", "strength": "standard" },
    "challenger": { "provider": "openai", "strength": "standard" },
    "reconciler": { "provider": "anthropic", "strength": "standard" },
    "validation": { "provider": "anthropic", "strength": "budget" }
  }
}
```

### Canonical Vocabulary

Providers:

- `anthropic`
- `openai`
- `google`
- `mistral`

Strengths:

- `budget`
- `standard`
- `premium`

### Mapping

Legacy values map as follows:

- `haiku -> budget`
- `sonnet -> standard`
- `opus -> premium`

This mapping must be one-way into the canonical runtime model.

---

## Architecture Decision

### Decision

`debateRoles` becomes the **single canonical runtime shape**.

`tigerScoreStrength` becomes the canonical single-field capability selector for TIGERScore.

Legacy fields are accepted only as input compatibility:

- `debateModelTiers`
- `debateModelProviders`
- `tigerScoreTier`

They are normalized during schema parsing into:

- `debateRoles.<role>.provider`
- `debateRoles.<role>.strength`
- `tigerScoreStrength`

Downstream runtime code should consume only `debateRoles`.

### Why

This avoids:

- two competing mental models
- UI/runtime terminology drift
- future errors where one path reads old fields and another reads new fields
- a permanent inconsistency where debate routing uses provider-neutral terminology but TIGERScore keeps provider-branded capability names

---

## Migration Strategy

### Phase 1: Schema, Seed, and Resolver Canonicalization

Update [`config-schemas.ts`](../../apps/web/src/lib/config-schemas.ts):

- add `debateRoles` schema
- define canonical defaults there
- rename `tigerScoreTier` to `tigerScoreStrength`
- keep legacy input fields temporarily for parsing compatibility
- normalize legacy fields into `debateRoles`
- normalize legacy `tigerScoreTier` into `tigerScoreStrength`
- stop treating legacy fields as canonical output
- implement the legacy→canonical merge in the existing canonicalization block in `config-schemas.ts`
- precedence rule: when both legacy and canonical fields are present, the new canonical fields win

Update [`apps/web/src/lib/analyzer/model-resolver.ts`](../../apps/web/src/lib/analyzer/model-resolver.ts):

- move `ModelTier -> ModelStrength` into this phase
- migrate provider lookup tables to `budget | standard | premium` keys
- update resolver signatures/helpers in the same phase so Phase 2 does not start from a broken shared type

Update [`pipeline.default.json`](../../apps/web/configs/pipeline.default.json):

- remove canonical dependence on `debateModelTiers`
- remove canonical dependence on `debateModelProviders`
- replace `tigerScoreTier` with `tigerScoreStrength`
- seed with `debateRoles`

This phase is load-bearing:

- old stored configs must parse successfully into canonical `debateRoles`
- old stored configs must parse `tigerScoreTier` into `tigerScoreStrength`
- runtime conversion must not begin until this normalization layer is solid
- the shared resolver type must already compile under the new vocabulary before Phase 2 runtime consumers switch over

### Phase 2: Runtime Conversion

Update runtime consumers and write-paths to read/write only `debateRoles`:

- [`verdict-stage.ts`](../../apps/web/src/lib/analyzer/verdict-stage.ts)
- [`claimboundary-pipeline.ts`](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
- [`calibration/runner.ts`](../../apps/web/src/lib/calibration/runner.ts)
- [`apps/web/src/app/admin/config/page.tsx`](../../apps/web/src/app/admin/config/page.tsx)
- any helper types/functions that currently expose `tier`

Important:

- [`verdict-stage.ts`](../../apps/web/src/lib/analyzer/verdict-stage.ts) contains embedded fallback defaults for debate-role routing and must stop being an independent source of truth for legacy `debateModelTiers` vocabulary.
- The Admin UI write-path must migrate in the same implementation phase as runtime consumers. Leaving it on legacy write fields would preserve the old terminology in newly saved configs even if runtime read compatibility masks the issue.
- [`claimboundary-pipeline.ts`](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts) contains `checkDebateTierDiversity()` and related diversity logic that must be rewritten to evaluate `debateRoles.<role>.provider + strength` rather than split tier/provider maps.
- When configs are saved through the Admin UI, legacy fields must be stripped from the final persisted object so UCM storage converges to the canonical schema.

Delivery guidance:

- Phase 1 and Phase 2 should ship in the **same PR / same deployment unit**
- do not deploy runtime consumers that expect `debateRoles` before canonicalization/normalization is in place

Expected runtime shape after migration:

```ts
debateRoles: {
  advocate: { provider: "anthropic", strength: "standard" },
  selfConsistency: { provider: "anthropic", strength: "standard" },
  challenger: { provider: "openai", strength: "standard" },
  reconciler: { provider: "anthropic", strength: "standard" },
  validation: { provider: "anthropic", strength: "budget" },
}
```

### Phase 3: Test Migration

Update tests that currently reference:

- `debateModelTiers`
- `debateModelProviders`
- `haiku/sonnet/opus` as role-routing config

New tests should verify:

1. new canonical seed shape is present
2. runtime consumes canonical shape
3. old configs still parse correctly
4. old values normalize correctly
5. `challenger=openai` default survives
6. provider diversity checks still behave correctly

### Phase 4: Admin/UI and Docs

Admin/config surfaces should show only the new terminology:

- `Provider`
- `Strength`

Docs should be updated to stop presenting:

- `openai + sonnet`

as if that were a literal vendor-native model pairing.

---

## Backward Compatibility Rules

### Must Continue To Work

Existing stored configs using:

```json
{
  "debateModelProviders": { "challenger": "openai" },
  "debateModelTiers": { "challenger": "sonnet" }
}
```

must continue to load.

Existing configs using:

```json
{
  "tigerScoreTier": "sonnet"
}
```

must also continue to load.

### Canonicalization Behavior

During parsing:

- read legacy fields if present
- map to canonical `debateRoles`
- map legacy `tigerScoreTier` to canonical `tigerScoreStrength`
- prefer explicit new canonical fields if both old and new are present

Implementation note:

- this normalization should happen in the existing `config-schemas.ts` canonicalization path
- do not distribute the merge logic across multiple runtime call sites

### Write Policy

Going forward:

- seed files use only `debateRoles`
- seed files use only `tigerScoreStrength`
- UI/API writes should emit canonical `debateRoles`
- UI/API writes should emit canonical `tigerScoreStrength`
- legacy fields should be stripped on save immediately
- legacy fields remain read-only compatibility, not write targets

---

## Proposed Defaults

Canonical defaults should preserve current intended debate routing:

```json
{
  "debateRoles": {
    "advocate": { "provider": "anthropic", "strength": "standard" },
    "selfConsistency": { "provider": "anthropic", "strength": "standard" },
    "challenger": { "provider": "openai", "strength": "standard" },
    "reconciler": { "provider": "anthropic", "strength": "standard" },
    "validation": { "provider": "anthropic", "strength": "budget" }
  }
}
```

This preserves:

- cross-provider challenger separation
- current quality/cost posture

Canonical adjacent TIGERScore default should be:

```json
{
  "tigerScoreStrength": "standard"
}
```

---

## File Scope

### Primary

- [`apps/web/src/lib/config-schemas.ts`](../../apps/web/src/lib/config-schemas.ts)
- [`apps/web/configs/pipeline.default.json`](../../apps/web/configs/pipeline.default.json)
- [`apps/web/src/lib/analyzer/verdict-stage.ts`](../../apps/web/src/lib/analyzer/verdict-stage.ts)
- [`apps/web/src/lib/analyzer/claimboundary-pipeline.ts`](../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
- [`apps/web/src/lib/calibration/runner.ts`](../../apps/web/src/lib/calibration/runner.ts)
- [`apps/web/src/lib/analyzer/model-resolver.ts`](../../apps/web/src/lib/analyzer/model-resolver.ts)

### Test Coverage

- [`apps/web/test/unit/lib/config-schemas.test.ts`](../../apps/web/test/unit/lib/config-schemas.test.ts)
- [`apps/web/test/unit/lib/config-drift.test.ts`](../../apps/web/test/unit/lib/config-drift.test.ts)
- [`apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`](../../apps/web/test/unit/lib/analyzer/verdict-stage.test.ts)
- [`apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`](../../apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts)
- [`apps/web/test/unit/lib/calibration-runner.test.ts`](../../apps/web/test/unit/lib/calibration-runner.test.ts)

### Secondary

- relevant docs in `Docs/USER_GUIDES/` and `Docs/Knowledge/`

---

## Risks

### Medium Risk

1. **Schema drift during transition**
   - mitigated by drift tests and explicit canonicalization tests

2. **Runtime consumer mismatch**
   - some paths may still expect `debateModelTiers` / `debateModelProviders`

3. **Hidden calibration/report code assumptions**
   - calibration runner already reconstructs debate-role maps and must be migrated carefully

4. **Partial TIGERScore rename**
   - leaving `tigerScoreTier` on old terminology would preserve conceptual inconsistency in the same config file

5. **ModelStrength cascade underestimation**
   - renaming the shared resolver type touches more than debate routing; if treated as a local change, call sites and shared helpers can be missed

6. **Phase ordering risk**
   - if runtime consumers switch before schema canonicalization is fully in place, stored configs without `debateRoles` will break or behave inconsistently

### Low Risk

1. **Behavior drift**
   - if mapping remains exact, behavior should stay unchanged

2. **Old config history readability**
   - legacy config snapshots remain valid and parseable

---

## Verification Plan

Required:

1. config drift tests pass
2. schema tests verify old → new normalization
3. verdict-stage tests verify all debate roles still route correctly
4. claimboundary pipeline tests verify role defaults and provider diversity checks
5. calibration runner tests verify resolved provider/model selection remains unchanged
6. `tigerScoreTier` legacy input normalizes to `tigerScoreStrength`
7. diversity warning logic still behaves correctly against unified `debateRoles`
8. non-debate capability consumers still resolve correctly after the shared type rename
6. full safe `npm test`
7. build check after unrelated current build blocker is resolved

Behavioral spot-checks:

- default challenger still resolves to OpenAI
- default validation remains lower-cost than main debate roles
- provider diversity warning logic still recognizes current defaults correctly
- TIGERScore still resolves to the same concrete model family after the `tigerScoreStrength` rename

---

## Resolved Review Decisions

| Decision | Outcome |
|----------|---------|
| `tigerScoreTier` scope | In scope — rename to `tigerScoreStrength` |
| Strip legacy fields on save | Immediately |
| Stored-config rewrite script | Not needed |
| Non-debate model fields | Compatibility-only; remain free-text model IDs |
| `model-resolver.ts` timing | Phase 1 alongside schema/canonicalization |

Open future question:

- Should `filter` / `organize` eventually become first-class role configs, or remain stage-level settings permanently?

---

## Review Log

| Reviewer | Date | Verdict | Notes |
|----------|------|---------|-------|
| Reviewer 1 | 2026-03-13 | APPROVE with amendments | Add `model-resolver.ts` to Phase 3 + primary scope; migrate `verdict-stage.ts` embedded fallback defaults as a source of truth; move Admin UI write-path from secondary/late cleanup into main runtime migration phase. |
| Lead Architect | 2026-03-13 | APPROVE with amendments | Include `tigerScoreTier -> tigerScoreStrength`; rename `ModelTier -> ModelStrength` and move resolver tables to provider-neutral keys; enforce strip-on-save for legacy fields; migrate diversity-check logic to unified `debateRoles`. |
| Reviewer 2 | 2026-03-13 | APPROVE with amendments | Make the `ModelTier` cascade explicit and atomic; keep `tigerScoreTier` in scope; do not split schema normalization and runtime conversion across separate deployments; decide explicitly whether non-debate model fields join the vocabulary migration. |
| Captain Deputy (Claude Sonnet 4.6) | 2026-03-13 | APPROVED — all questions resolved | Decisions: (1) `tigerScoreTier → tigerScoreStrength` IN SCOPE (same vocabulary, trivial to include). (2) Strip legacy fields on save immediately — no one-phase retention. (3) No stored-config rewrite script — parse-time compat sufficient. (4) filter/organize: out of scope. (5) Non-debate model fields (modelUnderstand, modelExtractEvidence, modelVerdict): compatibility-only, excluded per Non-Goals. Phase ordering: `ModelTier → ModelStrength` rename in `model-resolver.ts` moves to Phase 1 alongside schema to prevent TypeScript errors in Phase 2. Normalization mechanism: add legacy→canonical merge in existing `superRefine()` block; new canonical wins when both old and new fields are present. |

---

## Recommendation

Approve an **end-to-end terminology migration**, not another partial fix.

The correct sequence is:

1. canonical schema + seed + resolver redesign
2. runtime consumer migration in the same PR
3. test migration
4. docs/UI cleanup

This is the smallest path that actually removes the confusion rather than merely explaining it.
