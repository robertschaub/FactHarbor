# Code Review: B-6 / B-7 / B-8 / B-5b / i18n Fixes

**Date:** 2026-02-22
**Reviewer:** Code Reviewer (Claude Code, Opus 4.6)
**Scope:** 9 commits `054c177..62e7e37` — B-sequence features + Codex review fixes + i18n hardening + stopwords removal
**Verdict:** **GO** — No blocking findings. Clean, well-structured feature work with good test coverage.

---

## Summary

| Severity | Count | Details |
|----------|-------|---------|
| CRITICAL | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 1 | B8-M1: rubric LLM call uses default tier routing |
| LOW | 3 | B7-L1: parseMisleadingness returns undefined on bad enum; B8-L1: hasLimitations threshold magic number; I18N-L1: isVague `n/a` pattern is English-residual |
| INFO | 3 | Design quality notes (positive) |

**Files reviewed (13):**
- `apps/web/src/lib/analyzer/types.ts` — B-6, B-7, B-8 type additions
- `apps/web/src/lib/config-schemas.ts` — modelOpus, claimAnnotationMode, explanationQualityMode, opus in debateModelTiers
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — B-6 annotation logging/stripping, B-7 stripping, B-8 checkExplanationStructure + evaluateExplanationRubric, B-5b opus routing, i18n isVague fix
- `apps/web/src/lib/analyzer/verdict-stage.ts` — B-7 parseMisleadingness, opus tier types
- `apps/web/prompts/claimboundary.prompt.md` — B-6 verifiability, B-7 misleadingness, B-8 EXPLANATION_QUALITY_RUBRIC
- `apps/web/configs/pipeline.default.json` — new defaults
- `apps/web/src/lib/calibration/runner.ts` — B-5b modelOpus in resolveLLMConfig/resolveModelName
- `apps/web/src/lib/analyzer/constants/stopwords.ts` — DELETED (113 lines)
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — B-6, B-7, B-8, i18n tests
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` — B-7 misleadingness tests
- `apps/web/test/unit/lib/config-schemas.test.ts` — B-5b opus, annotation modes, quality modes
- `apps/web/test/unit/lib/calibration-runner.test.ts` — B-5b opus tier resolution

**Tests:** 958/958 passing. **Build:** Clean.

---

## Feature-by-Feature Review

### B-6: Verifiability Annotation

**Implementation:** Clean. `verifiability?: "high" | "medium" | "low" | "none"` added to `AtomicClaim` type. Prompt instructs LLM to assess verifiability independently of claim category. Gated by `claimAnnotationMode` UCM config.

**Correctness:**
- Gate 1 logging correctly counts distribution when mode includes verifiability
- Stripping logic correct: when mode is `"off"`, `delete claim.verifiability` is applied to all kept claims (M1 fix from prior review — verified applied)
- Prompt places verifiability as separate dimension from claim extraction, avoiding contamination of core analysis

**AGENTS.md compliance:** Verifiability assessment is LLM-powered (prompt-driven) — correct. No deterministic heuristics for semantic classification.

**Test coverage:** Adequate — backward compat test verifies no field when mode is off.

### B-7: Misleadingness Flag

**Implementation:** Clean. `misleadingness?: "not_misleading" | "potentially_misleading" | "highly_misleading"` and `misleadingnessReason?: string` on `CBClaimVerdict`. Decoupled from `truthPercentage` — a claim can be true but misleading (e.g., cherry-picked statistic). Good design decision.

**Correctness:**
- `parseMisleadingness()` in verdict-stage.ts safely validates enum values
- Conditional spread `...(misleadingness ? { misleadingness } : {})` correctly avoids polluting verdicts when LLM returns no annotation
- Stripping logic at pipeline level: strips when `claimAnnotationMode !== "verifiability_and_misleadingness"` — correct two-tier gating
- `misleadingnessReason` only populated when misleadingness is non-trivial (not `"not_misleading"`) — good, avoids noise

**AGENTS.md compliance:** Misleadingness assessment is LLM-powered via VERDICT_RECONCILIATION prompt — correct.

### B-8: Explanation Quality Check

**Implementation:** Two-tier design — Tier 1 (deterministic structural checks) + Tier 2 (LLM rubric). Gated by `explanationQualityMode: "off" | "structural" | "rubric"`.

**Tier 1 — `checkExplanationStructure()`:**
- Uses regex but for **structural patterns** (numbers, Unicode uppercase, percentages, fractions), not semantic analysis — **AGENTS.md compliant** (this is structural plumbing, not analytical decision-making)
- Unicode-aware patterns (`\p{Lu}`) correctly handle non-Latin scripts
- `hasLimitations: narrative.limitations.length > 5` is a reasonable structural check (non-empty beyond trivial)

**Tier 2 — `evaluateExplanationRubric()`:**
- LLM-powered via haiku tier — cost-efficient for advisory-only quality scoring
- 5 dimensions (clarity, completeness, neutrality, evidenceSupport, appropriateHedging) scored 1-5
- `parseScore()` clamps to [1,5] with fallback to 3 — safe
- `overallScore` computed as mean rounded to 1 decimal
- try/catch wraps rubric call — degrades to structural-only on failure (M2 fix from prior review — verified applied)

**AGENTS.md compliance:** Tier 1 is structural plumbing (format/presence checks). Tier 2 is LLM intelligence. Correct separation.

### B-5b: Opus Tier Support

**Implementation:** Clean config-driven approach.

**Config layer:**
- `modelOpus` field in PipelineConfig with explicit model ID
- `"opus"` added to debateModelTiers enum alongside haiku/sonnet
- Defaults: `modelOpus: "claude-opus-4-6"` in DEFAULT_PIPELINE_CONFIG

**Pipeline routing:**
- `createProductionLLMCall()`: when `tier === "opus"`, temporarily overrides `modelVerdict` with `modelOpus` so standard `getModelForTask()` path resolves correctly
- `isPremium = tier === "sonnet" || tier === "opus"` — correctly routes opus through the "verdict" task key

**Calibration runner:**
- `resolveModelName()` handles opus: `tier === "opus" → modelOpus ?? modelVerdict` — correct fallback
- Non-Anthropic opus maps to provider-specific premium model (e.g., OpenAI → `gpt-4.1`)

**Test coverage:** 5 tests covering Anthropic opus, fallback to modelVerdict, non-Anthropic opus, and role isolation.

### fix(review): Codex Findings (efd12c2)

**Implementation:** Addresses M1 (verifiability stripping), M2 (rubric try/catch), M3 (hasVerdictCategory regex). All three fixes verified present in current code.

### i18n Fixes (f71dff7, e506773, 62e7e37)

**Implementation:** Systematic replacement of English-dependent patterns with language-neutral structural checks.

**Key changes:**
- `isVague()` in `assessScopeQuality`: replaced English words (`unknown`, `unspecified`, `none`, `other`) with structural markers (`n/a`, `—`, `-`, `?`, `...`, `***`)
- `hasVerdictCategory` regex: Unicode `\p{Lu}` patterns instead of English-only uppercase
- `hasConfidenceStatement`: percentages and fractions instead of keyword matching

**AGENTS.md compliance:** Excellent. Moves from English-only to language-neutral structural detection. Aligns with Multilingual Robustness mandate.

### Stopwords Removal

**`constants/stopwords.ts` DELETED:** 113-line file containing `ENGLISH_STOPWORDS` set. Was dead code (never imported after earlier refactoring). English-only constant violated AGENTS.md Generic by Design and Multilingual Robustness mandates. Correct deletion.

---

## Findings

### B8-M1: Rubric LLM call uses default createProductionLLMCall tier routing (MEDIUM)

**Location:** `claimboundary-pipeline.ts:298`
**Issue:** `evaluateExplanationRubric()` receives an `llmCall` created via `createProductionLLMCall(initialPipelineConfig, state.warnings)` with no explicit tier/provider override. Inside `evaluateExplanationRubric`, it passes `{ tier: "haiku" }` — which is correct and cost-efficient. However, the `createProductionLLMCall` at the call site uses default config, meaning it inherits whatever provider is configured globally. If a user has set a non-default provider (e.g., OpenAI) at the pipeline level, the rubric call would go through that provider's haiku-equivalent rather than Anthropic's Haiku.

**Risk:** Not a bug — the provider routing is intentional and consistent with how other haiku-tier calls work. But worth noting that the rubric call cost depends on the provider configured for the pipeline, not hardcoded to Anthropic.

**Recommendation:** Document in UCM config description that `explanationQualityMode: "rubric"` incurs one additional LLM call per analysis at the haiku tier of the configured provider.

### B7-L1: parseMisleadingness silently drops invalid values (LOW)

**Location:** `verdict-stage.ts:907-910`
**Issue:** If the LLM returns an unexpected misleadingness value (e.g., `"misleading"` instead of `"potentially_misleading"`), `parseMisleadingness` returns `undefined` and the field is silently omitted. This is defensively safe but provides no observability.

**Recommendation:** Consider logging a warning when a non-null, non-valid value is received, to aid prompt tuning. Low priority — the defensive fallback is correct behavior.

### B8-L1: hasLimitations threshold is a magic number (LOW)

**Location:** `claimboundary-pipeline.ts:4362`
**Issue:** `hasLimitations: narrative.limitations.length > 5` — the threshold `5` is hardcoded. This is a structural check (string length), not an analytical decision, so it's AGENTS.md compliant. But the magic number could benefit from a named constant or brief comment explaining why 5 characters.

**Recommendation:** Minor — add a comment like `// >5 chars = non-trivial content (excludes "N/A", "None", etc.)`. Not blocking.

### I18N-L1: isVague still matches "n/a" — English residual (LOW)

**Location:** `claimboundary-pipeline.ts` (isVague regex)
**Issue:** The pattern `/^(n\/?a|—|-|\?|\.{1,3}|\*+)$/i` still matches `n/a` and `n\/a`, which are English-specific abbreviations for "not applicable." Other structural markers (`—`, `-`, `?`, `...`, `***`) are truly language-neutral.

**Risk:** Very low — `n/a` is widely used across languages in data contexts and is more of a structural marker than an English word. Pragmatically acceptable.

**Recommendation:** Accept as-is. The benefit of matching `n/a` in scope metadata outweighs the minor i18n purity concern.

---

## Positive Observations (INFO)

**INFO-1: Clean feature gating pattern.** All three B-6/B-7/B-8 features use the same pattern: UCM-configurable mode enum → conditional processing → stripping when off. This is a reusable, consistent pattern that will scale well for future features.

**INFO-2: Good separation of concerns in B-7.** Misleadingness is correctly decoupled from truthPercentage. A claim can be factually accurate but misleading (cherry-picked, out-of-context). This is a sophisticated analytical distinction that aligns with fact-checking best practices.

**INFO-3: B-8 two-tier design is architecturally sound.** Tier 1 (structural) provides instant, free validation. Tier 2 (LLM) provides quality-of-explanation assessment. The graceful degradation from Tier 2 → Tier 1 on failure ensures the feature never blocks analysis. Cost-efficient with haiku tier for the rubric call.

---

## AGENTS.md Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No hardcoded keywords | PASS | All analytical decisions LLM-powered; structural checks use Unicode patterns |
| LLM Intelligence mandate | PASS | B-6 verifiability, B-7 misleadingness, B-8 rubric all LLM-powered |
| Multilingual robustness | PASS | i18n fixes replace English patterns; Unicode-aware regex |
| String usage boundary | PASS | No language-dependent strings outside prompts |
| Configuration placement | PASS | All feature flags in UCM (claimAnnotationMode, explanationQualityMode, modelOpus) |
| Pipeline integrity | PASS | No stages skipped; gating is additive (annotations supplement, don't replace core analysis) |
| Input neutrality | N/A | No changes to input processing or claim extraction logic |

---

## Recommendation

**GO — No blocking findings.** Well-structured feature implementation with consistent patterns, good test coverage (958 tests passing), clean build, and AGENTS.md compliance across all mandates. The 1 MEDIUM and 3 LOW findings are all advisory improvements, none requiring immediate action.
