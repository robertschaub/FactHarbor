---
### 2026-02-20 | LLM Expert (Senior Developer execution) | Claude Code (Opus 4.6) | Debate Profile Presets — Follow-up Fixes
**Task:** Implement follow-up fixes for Debate Profile Presets: intent-stable profile semantics, runtime fallback warning emission, diversity check correctness, type tightening.

**Files touched:**
- `apps/web/src/lib/config-schemas.ts` — `DEBATE_PROFILES`: all 4 profiles now define explicit provider intent (5 roles each). `baseline`/`tier-split` set all roles to `"anthropic"`. `cross-provider` sets `challenger: "openai"`, rest `"anthropic"`. `max-diversity` sets `challenger: "openai"`, `selfConsistency: "google"`, rest `"anthropic"`. Added JSDoc. Types `LLMProviderType`, `DebateProviderOverrides` unchanged (added in prior session).
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — 5 changes:
  1. **`checkDebateTierDiversity`**: Rewritten to accept `VerdictStageConfig` (resolved, not raw `PipelineConfig`). Provider diversity logic now uses `"__inherit_global__"` sentinel for undefined providers — `undefined` means "inherit global", any named provider is a distinct identity. Two `undefined` values are treated as equal (both inherit global). An explicit `"anthropic"` is considered different from `undefined` even if global happens to be anthropic — because profiles express intent.
  2. **`createProductionLLMCall`**: New optional `warnings?: AnalysisWarning[]` parameter. Runtime fallback now `push()`es a `debate_provider_fallback` warning into the collector (in addition to existing `console.warn`). Warning includes `promptKey`, `configuredProvider`, and `fallbackProvider` in `details`.
  3. **`generateVerdicts`**: New optional `warnings?: AnalysisWarning[]` parameter threaded through to `createProductionLLMCall`.
  4. **Pipeline call site** (~line 250): Now passes `state.warnings` as the `warnings` parameter to `generateVerdicts`, completing the flow from runtime fallback → `state.warnings` → `resultJson.analysisWarnings`.
  5. **`PROVIDER_API_KEY_ENV`**: Typed `Record<LLMProviderType, string[]>` (was `Record<string, string[]>` in prior session — already done).
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — Updated and added tests:
  - **`buildVerdictStageConfig`**: 7 profile tests updated to assert explicit provider values (e.g., `"anthropic"` not `undefined`). Added profile-independence-from-global test (`{ debateProfile: "baseline", llmProvider: "openai" }` → providers still resolve to `"anthropic"`).
  - **`checkDebateTierDiversity`**: Rewritten to 12 tests covering: all-same-tier-no-providers warns, mixed tiers ok, explicit provider diversity ok, inherit-global vs explicit diversity ok, all-same-explicit-provider warns, all 4 resolved profiles tested end-to-end via `buildVerdictStageConfig`.
  - **`createProductionLLMCall`**: Added 2 tests: runtime fallback emits `debate_provider_fallback` into warnings collector with correct fields; valid credentials produce no warning.
  - **`checkDebateProviderCredentials`**: Added profile-resolved credential test (max-diversity flags openai+google when missing env vars).

**Key decisions:**
1. **Intent-stable profiles**: Profiles define ALL 5 providers explicitly so semantics are independent of global `llmProvider`. Choosing `baseline` with `llmProvider: "openai"` still routes all debate roles to `anthropic` — the profile is the source of truth for debate provider intent. Explicit `debateModelProviders` fields still override profile defaults (3-level precedence preserved).
2. **`"__inherit_global__"` sentinel**: In `checkDebateTierDiversity`, roles without an explicit provider resolve to a sentinel string (not the actual global provider name). This means `{ challenger: "openai" }` with others undefined = diversity (sentinel vs "openai"), and `{ advocate: "anthropic", challenger: "anthropic", ... }` with all 4 set = no diversity. This correctly handles profile-resolved configs where all providers are explicit.
3. **Runtime warning emission via collector pattern**: Rather than making `createProductionLLMCall` return a richer type (would break `LLMCallFn` contract), the factory accepts an optional `AnalysisWarning[]` array by closure. The main pipeline passes `state.warnings` which is the same array that flows to `resultJson.analysisWarnings`. Pre-flight `checkDebateProviderCredentials` remains as defense-in-depth (catches issues before LLM calls begin).
4. **`generateVerdicts` signature change**: Added optional `warnings?: AnalysisWarning[]` as 7th parameter. Backward compatible — all existing callers (tests, mocks) omit it. Only the main pipeline passes it.

**Open items:**
- **Baseline profile triggers `all_same_debate_tier` warning** — by design. It's the "no diversity" configuration. Consider whether this should be suppressed for the `baseline` profile specifically (currently not — the warning is informational).
- **Profile-resolved providers trigger pre-flight credential warnings** — `max-diversity` will flag `openai` and `google` roles when those API keys are missing. This is correct behavior but will produce warnings in single-provider environments. The runtime fallback handles it gracefully.

**Warnings:**
- `generateVerdicts` now loads configs independently (inside the function) AND receives `state.warnings` from the caller. If `generateVerdicts` is ever called from outside the main pipeline without passing `warnings`, runtime fallback events will silently be console-only. Currently only one call site exists (main pipeline, line 250).
- `checkDebateTierDiversity` cannot detect "explicit anthropic when global is also anthropic" as non-diverse — it treats any explicit provider as structurally different from "inherit global". This is correct for profile-resolved configs (where the profile *chose* anthropic) but could give a false negative for manually configured `{ debateModelProviders: { challenger: "anthropic" } }` when global is also anthropic. This edge case is acceptable because the explicit override still routes through a different code path (`providerOverride` parameter in `getModelForTask`).

**For next agent:**
- All debate profile presets are UCM-configurable via `debateProfile` field. Set `"debateProfile": "cross-provider"` in UCM Pipeline Config for cross-provider debate. Requires `OPENAI_API_KEY` env var.
- Run calibration harness to compare bias metrics across profiles: `npm -w apps/web run test:calibration`
- The `createProductionLLMCall(pipelineConfig, warnings)` signature is the integration point for runtime fallback warnings. Any future factory callers should pass a warnings array if they want fallback events surfaced.

**Verification:** 918 tests passing (8 net new from 910 baseline), build clean.

**Learnings:** Appended to Role_Learnings.md? Yes — see entry below.
